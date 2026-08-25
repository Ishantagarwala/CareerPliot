import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import ChatHistory from "@/models/ChatHistory";
import CareerRecommendation from "@/models/CareerRecommendation";
import Document from "@/models/Document";
import UserProgress from "@/models/UserProgress";
import { buildAiHubSystemPrompt, buildDocumentContext } from "@/lib/aiHub";
import { resolveLlmEndpoint } from "@/lib/llm";
import { enforceLlmBudget } from "@/lib/llmGuard";
import {
  isOwnedUploadFilename,
  rateLimit,
  resolveLegacyUploadPath,
  resolveUploadPath,
  sniffFileType,
} from "@/lib/security";
import { readFile } from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export const maxDuration = 120;

const MAX_MESSAGE_CHARS = 12_000;
const MAX_CONTEXT_DOCUMENTS = 3;
const MAX_ATTACHMENTS = 3;
const MAX_MODEL_SELECTION_CHARS = 200;
const MODEL_SELECTION_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/;

interface SafeAttachment {
  type: "pdf" | "image";
  filename: string;
  fileUrl: string;
  docId?: string;
}

function normalizeDocumentIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const candidate of value) {
    if (
      typeof candidate === "string" &&
      mongoose.isValidObjectId(candidate)
    ) {
      unique.add(candidate);
    }
    if (unique.size >= MAX_CONTEXT_DOCUMENTS) break;
  }
  return Array.from(unique);
}

function normalizeAttachments(value: unknown, userId: string): SafeAttachment[] {
  if (!Array.isArray(value)) return [];

  const attachments: SafeAttachment[] = [];
  for (const candidate of value.slice(0, MAX_ATTACHMENTS)) {
    if (!candidate || typeof candidate !== "object") continue;
    const raw = candidate as Record<string, unknown>;
    if (raw.type !== "pdf" && raw.type !== "image") continue;
    if (typeof raw.filename !== "string" || typeof raw.fileUrl !== "string") {
      continue;
    }

    const filename = path.basename(raw.fileUrl);
    if (
      !raw.fileUrl.startsWith("/api/uploads/") ||
      !filename ||
      !isOwnedUploadFilename(filename, userId)
    ) {
      continue;
    }

    const attachment: SafeAttachment = {
      type: raw.type,
      filename: raw.filename.trim().slice(0, 200) || filename,
      fileUrl: `/api/uploads/${filename}`,
    };
    if (
      raw.type === "pdf" &&
      typeof raw.docId === "string" &&
      mongoose.isValidObjectId(raw.docId)
    ) {
      attachment.docId = raw.docId;
    }
    attachments.push(attachment);
  }
  return attachments;
}

function sseEncode(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function providerErrorMessage(error: unknown): {
  status?: number;
  message: string;
} {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
      ? (error as { status: number }).status
      : undefined;

  const providerMessage =
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof (error as { error: unknown }).error === "object" &&
    (error as { error: { message?: string } }).error?.message
      ? String((error as { error: { message?: string } }).error.message)
      : error instanceof Error
        ? error.message
        : "Internal Server Error";

  if (status === 402 || status === 403) {
    const lower = providerMessage.toLowerCase();
    const isBalance =
      lower.includes("insufficient") ||
      lower.includes("balance") ||
      lower.includes("quota") ||
      lower.includes("credit");
    return {
      status: 502,
      message: isBalance
        ? "Your LLM router has insufficient balance. Top up credits or switch to a cheaper model in .env.local."
        : providerMessage || "LLM provider rejected the request.",
    };
  }

  if (status === 401) {
    return {
      status: 502,
      message:
        "LLM router rejected the API key. Check LLM_ROUTER_API_KEY in .env.local.",
    };
  }

  if (status === 429) {
    return {
      status: 429,
      message: "LLM router rate limit hit. Please wait a moment and try again.",
    };
  }

  return { status: 500, message: providerMessage };
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    if (!rateLimit(`ai-chat:${userId}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json(
        { message: "Too many chat requests. Try again later." },
        { status: 429 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json({ message: "Message is required" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json(
        { message: `Message is too long. Maximum length is ${MAX_MESSAGE_CHARS} characters.` },
        { status: 413 }
      );
    }

    const requestedThreadId =
      typeof body?.threadId === "string" && body.threadId.trim()
        ? body.threadId.trim()
        : null;
    if (requestedThreadId && !mongoose.isValidObjectId(requestedThreadId)) {
      return NextResponse.json({ message: "Invalid thread id" }, { status: 400 });
    }

    const normalizedAttachments = normalizeAttachments(body?.attachments, userId);
    const requestedDocumentIds = normalizeDocumentIds(body?.documentIds);
    const attachmentDocumentIds = normalizedAttachments.flatMap((attachment) =>
      attachment.type === "pdf" && attachment.docId
        ? [attachment.docId]
        : []
    );
    const safeDocumentIds = Array.from(
      new Set([
        // A PDF attached to this message must take priority over older
        // library selections when the three-document context cap is reached.
        ...attachmentDocumentIds,
        ...requestedDocumentIds,
      ])
    ).slice(0, MAX_CONTEXT_DOCUMENTS);
    let modelSelection: string | undefined;
    if (body?.modelSelection !== undefined) {
      if (typeof body.modelSelection !== "string") {
        return NextResponse.json(
          { message: "Invalid model selection" },
          { status: 400 }
        );
      }
      const candidate = body.modelSelection.trim();
      if (
        candidate.length > MAX_MODEL_SELECTION_CHARS ||
        (candidate && !MODEL_SELECTION_PATTERN.test(candidate))
      ) {
        return NextResponse.json(
          { message: "Invalid model selection" },
          { status: 400 }
        );
      }
      modelSelection = candidate || undefined;
    }

    await dbConnect();

    const [selectedRecommendation, unorderedDocuments] = await Promise.all([
      CareerRecommendation.findOne({
        userId,
        selected: true,
      }),
      safeDocumentIds.length
        ? Document.find({ _id: { $in: safeDocumentIds }, userId })
            .select("filename summary contentText")
            .lean()
        : [],
    ]);

    const careerContext = selectedRecommendation
      ? `The student's selected career path is "${selectedRecommendation.careerPath}". Adapt explanations, examples, and recommendations to that path when relevant.`
      : "The student has not selected an active career path yet. Help them explore options or answer general learning questions.";

    const documentsById = new Map(
      unorderedDocuments.map((document) => [String(document._id), document])
    );
    const documents = safeDocumentIds
      .map((id) => documentsById.get(id))
      .filter((document): document is NonNullable<typeof document> => Boolean(document));
    const ownedDocumentIds = new Set(documents.map((document) => String(document._id)));
    const invalidPdfAttachment = normalizedAttachments.some(
      (attachment) =>
        attachment.type === "pdf" &&
        (!attachment.docId || !ownedDocumentIds.has(attachment.docId))
    );
    if (invalidPdfAttachment) {
      return NextResponse.json(
        { message: "One or more PDF attachments are invalid or no longer available." },
        { status: 400 }
      );
    }
    const documentObjectIds = safeDocumentIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    const storedAttachments = normalizedAttachments.map((attachment) => ({
      ...attachment,
      docId: attachment.docId
        ? new mongoose.Types.ObjectId(attachment.docId)
        : undefined,
    }));

    let chat;
    if (requestedThreadId) {
      chat = await ChatHistory.findOne({ _id: requestedThreadId, userId });
      if (!chat) {
        return NextResponse.json({ message: "Thread not found" }, { status: 404 });
      }
    }

    if (!chat) {
      const title = message.length > 30 ? message.substring(0, 30) + "..." : message;
      chat = new ChatHistory({
        userId,
        threadTitle: title,
        threadType: safeDocumentIds.length > 0 ? "document" : "general",
        messages: [],
      });
    }

    const historyLimit = 15;
    const recentHistory = chat.messages.slice(-historyLimit);
    const documentContext = buildDocumentContext(documents);
    const systemPrompt = buildAiHubSystemPrompt(careerContext);
    const userTurnContent = documentContext
      ? `${documentContext}\n\n---\n\nUser question:\n${message}`
      : message;

    chat.messages.push({
      role: "user",
      content: message,
      documentIds: documentObjectIds,
      attachments: storedAttachments,
      sentAt: new Date(),
    });

    if (chat.messages.length === 1 && chat.threadTitle === "AI Study Hub") {
      chat.threadTitle =
        message.length > 30 ? message.substring(0, 30) + "..." : message;
    }

    const apiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    recentHistory.forEach((historyMessage) => {
      apiMessages.push({
        role: historyMessage.role,
        content: historyMessage.content,
      });
    });

    const imageAttachment = normalizedAttachments.find(
      (attachment) => attachment.type === "image"
    );

    if (imageAttachment?.fileUrl) {
      try {
        const attachmentUrl = String(imageAttachment.fileUrl);
        const filename = path.basename(attachmentUrl);
        if (!isOwnedUploadFilename(filename, userId)) {
          throw new Error("Attachment ownership check failed");
        }

        let localPath = resolveUploadPath(attachmentUrl);
        let imageBuffer: Buffer | null = null;
        if (localPath) {
          imageBuffer = await readFile(localPath).catch(() => null);
        }
        if (!imageBuffer) {
          localPath = resolveLegacyUploadPath(`/uploads/${filename}`);
          if (localPath) {
            imageBuffer = await readFile(localPath).catch(() => null);
          }
        }
        if (!imageBuffer) throw new Error("Invalid attachment path");

        const actualType = sniffFileType(imageBuffer);
        const mimeType =
          actualType === "png"
            ? "image/png"
            : actualType === "jpeg"
              ? "image/jpeg"
              : actualType === "gif"
                ? "image/gif"
                : actualType === "webp"
                  ? "image/webp"
                  : null;
        if (!mimeType) throw new Error("Attachment is not a supported image");

        const base64Data = imageBuffer.toString("base64");
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        apiMessages.push({
          role: "user",
          content: [
            { type: "text", text: userTurnContent },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        });
      } catch (err) {
        console.error("Failed to load local image for vision API:", err);
        apiMessages.push({ role: "user", content: userTurnContent });
      }
    } else {
      apiMessages.push({ role: "user", content: userTurnContent });
    }

    const limited = enforceLlmBudget(userId, "ai-hub-chat", 30);
    if (limited) return limited;

    const { client, model } = resolveLlmEndpoint(modelSelection);
    const threadIdStr = String(chat._id);

    const docsUsed = documents.map((doc) => ({
      id: doc._id,
      filename: doc.filename,
    }));

    const stream = await client.chat.completions.create({
      model,
      messages: apiMessages,
      temperature: 0.6,
      stream: true,
    });

    // Only persist the user turn after the provider accepted the request. This
    // prevents failed provider setup from leaving orphan user-only messages.
    await chat.save();

    const readable = new ReadableStream({
      async start(controller) {
        let fullReply = "";
        try {
          controller.enqueue(
            sseEncode({
              type: "meta",
              threadId: threadIdStr,
              documentsUsed: docsUsed,
            })
          );

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || "";
            if (!delta) continue;
            fullReply += delta;
            controller.enqueue(
              sseEncode({
                type: "token",
                content: delta,
              })
            );
          }

          if (!fullReply.trim()) {
            fullReply =
              "I'm sorry, I encountered an issue generating a response. Please try again.";
          }

          chat.messages.push({
            role: "assistant",
            content: fullReply,
            documentIds: documentObjectIds,
            sentAt: new Date(),
          });
          await chat.save();

          await UserProgress.findOneAndUpdate(
            { userId },
            {
              $inc: { tutorSessions: 1 },
              $set: { lastActive: new Date() },
            },
            { upsert: true, new: true }
          ).catch((progressError) => {
            console.error(
              "Failed to update AI Hub progress (non-fatal):",
              progressError
            );
          });

          controller.enqueue(
            sseEncode({
              type: "done",
              threadId: threadIdStr,
              reply: fullReply,
            })
          );
          controller.close();
        } catch (err) {
          console.error("AI Hub stream error:", err);
          const { message: errMsg } = providerErrorMessage(err);
          try {
            controller.enqueue(
              sseEncode({
                type: "error",
                message: errMsg,
              })
            );
          } catch {
            /* ignore */
          }
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: unknown) {
    console.error("AI Hub chat route error:", error);
    const { status, message } = providerErrorMessage(error);
    return NextResponse.json({ message }, { status: status || 500 });
  }
}
