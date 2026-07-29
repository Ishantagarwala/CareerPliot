import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import ChatHistory from "@/models/ChatHistory";
import CareerRecommendation from "@/models/CareerRecommendation";
import Document from "@/models/Document";
import UserProgress from "@/models/UserProgress";
import { buildAiHubSystemPrompt, buildDocumentContext } from "@/lib/aiHub";
import { getLlmClient, getLlmModel } from "@/lib/llm";
import {
  isOwnedUploadFilename,
  rateLimit,
  resolveLegacyUploadPath,
  resolveUploadPath,
} from "@/lib/security";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    if (!rateLimit(`ai-chat:${userId}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json({ message: "Too many chat requests. Try again later." }, { status: 429 });
    }

    const { message, documentIds = [], threadId, attachments = [], modelSelection } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ message: "Message is required" }, { status: 400 });
    }

    await dbConnect();

    const selectedRecommendation = await CareerRecommendation.findOne({
      userId,
      selected: true,
    });

    const careerContext = selectedRecommendation
      ? `The student's selected career path is "${selectedRecommendation.careerPath}". Adapt explanations, examples, and recommendations to that path when relevant.`
      : "The student has not selected an active career path yet. Help them explore options or answer general learning questions.";

    const safeDocumentIds = Array.isArray(documentIds)
      ? documentIds.filter((id: unknown) => typeof id === "string" && id.trim())
      : [];

    const documents = safeDocumentIds.length
      ? await Document.find({ _id: { $in: safeDocumentIds }, userId })
          .select("filename summary contentText")
          .limit(3)
      : [];

    let chat;
    if (threadId) {
      chat = await ChatHistory.findOne({ _id: threadId, userId });
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
    // Keep untrusted PDF text out of the system prompt — attach it to the user turn.
    const systemPrompt = buildAiHubSystemPrompt(careerContext);
    const userTurnContent = documentContext
      ? `${documentContext}\n\n---\n\nUser question:\n${message}`
      : message;

    chat.messages.push({
      role: "user",
      content: message,
      documentIds: safeDocumentIds,
      attachments: attachments,
      sentAt: new Date(),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiMessages: any[] = [{ role: "system", content: systemPrompt }];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentHistory.forEach((msg: any) => {
      apiMessages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageAttachment = Array.isArray(attachments)
      ? attachments.find((att: any) => att.type === "image")
      : null;

    if (imageAttachment?.fileUrl) {
      try {
        const attachmentUrl = String(imageAttachment.fileUrl);
        const filename = path.basename(attachmentUrl);
        if (!isOwnedUploadFilename(filename, userId)) {
          throw new Error("Attachment ownership check failed");
        }

        let localPath = resolveUploadPath(attachmentUrl);
        if (!localPath || !fs.existsSync(localPath)) {
          localPath = resolveLegacyUploadPath(`/uploads/${filename}`);
        }
        if (!localPath || !fs.existsSync(localPath)) {
          throw new Error("Invalid attachment path");
        }
        const ext = path.extname(localPath).toLowerCase().replace(".", "");
        const mimeType = ext === "png" ? "image/png" : "image/jpeg";
        const base64Data = fs.readFileSync(localPath).toString("base64");
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

    const client = getLlmClient();
    const model = getLlmModel(false, modelSelection);

    const completion = await client.chat.completions.create({
      model,
      messages: apiMessages,
      temperature: 0.6,
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "I'm sorry, I encountered an issue generating a response. Please try again.";

    chat.messages.push({
      role: "assistant",
      content: reply,
      documentIds: safeDocumentIds,
      sentAt: new Date(),
    });

    if (chat.messages.length === 2 && chat.threadTitle === "AI Study Hub") {
      chat.threadTitle = message.length > 30 ? message.substring(0, 30) + "..." : message;
    }

    await chat.save();

    await UserProgress.findOneAndUpdate(
      { userId },
      {
        $inc: { tutorSessions: 1 },
        $set: { lastActive: new Date() },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      reply,
      threadId: chat._id,
      messages: chat.messages,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentsUsed: documents.map((doc: any) => ({
        id: doc._id,
        filename: doc.filename,
      })),
    });
  } catch (error) {
    console.error("AI Hub chat route error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
