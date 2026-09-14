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

/** Thread titles are shown in a narrow rail, so keep them short. */
const MAX_TITLE_CHARS = 60;

/**
 * Cheap, deterministic fallback used when the title model fails or returns
 * something unusable — first few words of the question, which still reads far
 * better in the rail than a raw character slice.
 */
function fallbackThreadTitle(message: string): string {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New Chat";
  const words = cleaned.split(" ").slice(0, 8).join(" ");
  return words.length > MAX_TITLE_CHARS
    ? `${words.slice(0, MAX_TITLE_CHARS - 1).trimEnd()}…`
    : words;
}

/** Strips the wrapping and punctuation models like to add around a title. */
function normalizeThreadTitle(raw: string): string {
  let title = (raw || "").trim();
  title = title.replace(/^(?:title|chat title)\s*[:\-–]\s*/i, "");
  title = title.replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, "");
  title = title.replace(/[.;,]+$/g, "");
  title = title.replace(/\s+/g, " ").trim();
  if (title.length > MAX_TITLE_CHARS) {
    title = `${title.slice(0, MAX_TITLE_CHARS - 1).trimEnd()}…`;
  }
  return title;
}

/**
 * Asks the model for a short, human title for the thread — the way the
 * reference product names conversations ("Hello Explain me what is bfs").
 * Never throws: any failure falls back to the opening question so a title is
 * always produced.
 */
async function generateThreadTitle(
  modelSelection: string | undefined,
  userMessage: string,
  assistantReply: string
): Promise<string> {
  /*
   * Kept as a single system message with the transcript clearly delimited.
   * An earlier "User: ... / Assistant: ..." layout made the model echo the
   * user's own sentence back as the title.
   */
  const prompt = [
    "You name chat threads for a study assistant's sidebar.",
    "Reply with ONLY the title: 3-6 words, under 50 characters.",
    "Name the specific topic. No quotes, no ending punctuation, no emoji.",
    "",
    "Example 1",
    "Question: how do i prepare for a javascript interview as a fresher",
    "Title: Preparing for a JavaScript interview",
    "",
    "Example 2",
    "Question: explain me what is bfs and dfs",
    "Title: Understanding BFS and DFS",
    "",
    "Now name this conversation.",
    "Question: " + userMessage.slice(0, 1500),
    "Answer: " + assistantReply.slice(0, 1500),
    "Title:",
  ].join("\n");

  try {
    const { client, model } = resolveLlmEndpoint(modelSelection);
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      /*
       * Generous on purpose: the inline model is a *reasoning* model, and it
       * spends tokens thinking before emitting any content. A tight budget
       * (32) was exhausted by the reasoning alone, returning `content: null`
       * with finish_reason "length" — which silently fell back every time.
       */
      max_tokens: 512,
    });

    const choice = completion.choices[0];
    const rawContent = choice?.message?.content || "";
    /*
     * Belt and braces for reasoning models: if it still produced no content
     * (or hit the cap mid-thought), salvage a title from the reasoning trace
     * or the last non-empty line, which is usually the title itself.
     */
    const rawReasoning =
      (choice?.message as { reasoning?: string } | undefined)?.reasoning || "";
    const salvage = (text: string) => {
      const afterLabel = text.match(/title\s*[:\-–]\s*(.+)$/im);
      if (afterLabel) return afterLabel[1];
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      return lines.length ? lines[lines.length - 1] : "";
    };

    let title = normalizeThreadTitle(rawContent);
    if (!title && rawReasoning) title = normalizeThreadTitle(salvage(rawReasoning));

    /*
     * Reject a title that is just the question echoed back — reasoning models
     * do this when they run out of room, and it reads no better than the
     * fallback while looking like a real title.
     */
    const normalizedQuestion = userMessage.replace(/\s+/g, " ").trim().toLowerCase();
    if (title && title.toLowerCase() === normalizedQuestion) title = "";
    if (title.length < 3) title = "";

    if (!title) {
      console.warn(
        "Thread title fell back to the opening words (model returned no usable title).",
        { finishReason: choice?.finish_reason, hadContent: Boolean(rawContent) }
      );
      return fallbackThreadTitle(userMessage);
    }
    return title;
  } catch (error) {
    console.error("Thread title generation failed (non-fatal):", error);
    return fallbackThreadTitle(userMessage);
  }
}

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
      chat = new ChatHistory({
        userId,
        // Cheap provisional title so the rail has something immediately; it is
        // replaced by a model-written one once the first reply completes.
        threadTitle: fallbackThreadTitle(message),
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
      chat.threadTitle = fallbackThreadTitle(message);
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
        /**
         * Reasoning models on the router stream their chain of thought on
         * `delta.reasoning` alongside (or before) `delta.content`. We surface
         * it as its own SSE event so the hub can show a "Thought for a moment"
         * disclosure, and persist it with the turn.
         */
        let fullReasoning = "";
        try {
          controller.enqueue(
            sseEncode({
              type: "meta",
              threadId: threadIdStr,
              documentsUsed: docsUsed,
            })
          );

          for await (const chunk of stream) {
            const deltaObj = chunk.choices[0]?.delta as
              | { content?: string | null; reasoning?: string | null }
              | undefined;
            const reasoningDelta = deltaObj?.reasoning || "";
            if (reasoningDelta) {
              fullReasoning += reasoningDelta;
              controller.enqueue(
                sseEncode({
                  type: "reasoning",
                  content: reasoningDelta,
                })
              );
            }

            const delta = deltaObj?.content || "";
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
            reasoning: fullReasoning || undefined,
            documentIds: documentObjectIds,
            sentAt: new Date(),
          });
          await chat.save();

          /*
           * Name the thread from the completed FIRST exchange only: messages
           * is [user, assistant] on that turn. Re-running it every turn would
           * cost an extra model call each time and rename the thread under the
           * user. `titleSource` guards against clobbering a manual rename.
           */
          if (chat.titleSource !== "manual" && chat.messages.length === 2) {
            const generatedTitle = await generateThreadTitle(
              modelSelection,
              message,
              fullReply
            );
            chat.threadTitle = generatedTitle;
            chat.titleSource = "auto";
            await chat.save().catch((titleError: unknown) => {
              console.error(
                "Failed to persist thread title (non-fatal):",
                titleError
              );
            });
            controller.enqueue(
              sseEncode({ type: "title", title: generatedTitle })
            );
          }

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
              reasoning: fullReasoning,
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
