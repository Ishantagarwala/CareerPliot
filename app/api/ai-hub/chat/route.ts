import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import ChatHistory from "@/models/ChatHistory";
import CareerRecommendation from "@/models/CareerRecommendation";
import Document from "@/models/Document";
import UserProgress from "@/models/UserProgress";
import { buildAiHubSystemPrompt, buildDocumentContext } from "@/lib/aiHub";
import { getLlmClient, getLlmModel } from "@/lib/llm";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { message, documentIds = [], threadId, attachments = [] } = await req.json();

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

    // Gather PDF document contexts if any
    const safeDocumentIds = Array.isArray(documentIds)
      ? documentIds.filter((id) => typeof id === "string" && id.trim())
      : [];

    const documents = safeDocumentIds.length
      ? await Document.find({ _id: { $in: safeDocumentIds }, userId })
          .select("filename summary contentText")
          .limit(3)
      : [];

    // Find or create thread
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
        messages: []
      });
    }

    const historyLimit = 15;
    const recentHistory = chat.messages.slice(-historyLimit);
    const documentContext = buildDocumentContext(documents);
    const systemPrompt = buildAiHubSystemPrompt(careerContext, documentContext);

    // Build the user message for database
    const userMessage: any = {
      role: "user",
      content: message,
      documentIds: safeDocumentIds,
      attachments: attachments,
      sentAt: new Date(),
    };
    
    chat.messages.push(userMessage);

    // Build API messages payload
    const apiMessages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // Add recent history to context (simplify to text for history)
    recentHistory.forEach((msg: any) => {
      apiMessages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Handle current user message (could be text or multi-modal if image is attached)
    const imageAttachment = attachments.find((att: any) => att.type === "image");
    
    if (imageAttachment) {
      try {
        const localPath = path.join(process.cwd(), "public", imageAttachment.fileUrl);
        const ext = path.extname(localPath).toLowerCase().replace(".", "");
        const mimeType = ext === "png" ? "image/png" : "image/jpeg";
        const base64Data = fs.readFileSync(localPath).toString("base64");
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        apiMessages.push({
          role: "user",
          content: [
            { type: "text", text: message },
            {
              type: "image_url",
              image_url: {
                url: dataUrl
              }
            }
          ]
        });
      } catch (err: any) {
        console.error("Failed to load local image for vision API:", err);
        // Fallback to text prompt
        apiMessages.push({ role: "user", content: message });
      }
    } else {
      apiMessages.push({ role: "user", content: message });
    }

    const client = getLlmClient();
    const model = getLlmModel();

    const completion = await client.chat.completions.create({
      model,
      messages: apiMessages,
      temperature: 0.6,
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "I'm sorry, I encountered an issue generating a response. Please try again.";

    // Save assistant reply
    chat.messages.push({
      role: "assistant",
      content: reply,
      documentIds: safeDocumentIds,
      sentAt: new Date(),
    });

    // Update thread title if it was default
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
      documentsUsed: documents.map((doc: any) => ({
        id: doc._id,
        filename: doc.filename,
      })),
    });
  } catch (error: any) {
    console.error("AI Hub chat route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
