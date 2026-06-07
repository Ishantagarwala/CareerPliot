import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import ChatHistory from "@/models/ChatHistory";
import CareerRecommendation from "@/models/CareerRecommendation";
import Document from "@/models/Document";
import UserProgress from "@/models/UserProgress";
import { buildAiHubSystemPrompt, buildDocumentContext } from "@/lib/aiHub";
import { getLlmClient, getLlmModel } from "@/lib/llm";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { message, documentIds = [] } = await req.json();

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
      ? documentIds.filter((id) => typeof id === "string" && id.trim())
      : [];

    const documents = safeDocumentIds.length
      ? await Document.find({ _id: { $in: safeDocumentIds }, userId })
          .select("filename summary contentText")
          .limit(3)
      : [];

    let chat = await ChatHistory.findOne({ userId });
    if (!chat) {
      chat = new ChatHistory({ userId, messages: [] });
    }

    const historyLimit = 15;
    const recentHistory = chat.messages.slice(-historyLimit);
    const documentContext = buildDocumentContext(documents);
    const systemPrompt = buildAiHubSystemPrompt(careerContext, documentContext);

    chat.threadType = safeDocumentIds.length > 0 ? "document" : "general";
    chat.documentIds = safeDocumentIds;
    chat.messages.push({
      role: "user",
      content: message,
      documentIds: safeDocumentIds,
      sentAt: new Date(),
    });

    const client = getLlmClient();
    const model = getLlmModel();
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...recentHistory
        .filter((m: any) => m.role === "user" || m.role === "assistant")
        .map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      { role: "user", content: message },
    ];

    const completion = await client.chat.completions.create({
      model,
      messages,
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
