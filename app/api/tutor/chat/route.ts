import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import ChatHistory from "@/models/ChatHistory";
import CareerRecommendation from "@/models/CareerRecommendation";
import UserProgress from "@/models/UserProgress";
import { getLlmClient, getLlmModel } from "@/lib/llm";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { message } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ message: "Message is required" }, { status: 400 });
    }

    await dbConnect();

    // 1. Fetch user's active career recommendation for personalization
    const selectedRecommendation = await CareerRecommendation.findOne({
      userId,
      selected: true,
    });
    
    const careerContext = selectedRecommendation 
      ? `The student's selected career path is "${selectedRecommendation.careerPath}". Adapt your explanations, examples, and recommendations to align with this path where relevant.`
      : "The student has not selected an active career path yet. Help them explore their options or answer their general learning/coding questions.";

    // 2. Fetch or create chat history
    let chat = await ChatHistory.findOne({ userId });
    if (!chat) {
      chat = new ChatHistory({ userId, messages: [] });
    }

    // 3. Append user message to history
    chat.messages.push({
      role: "user",
      content: message,
      sentAt: new Date(),
    });

    // Get last 15 messages for history context (excluding the one we just added)
    const historyLimit = 15;
    // We want the last N messages before the current one
    const recentHistory = chat.messages
      .slice(0, -1) // exclude current message
      .slice(-historyLimit); // take last N

    // 4. Construct System Prompt
    const systemPrompt = `You are a professional, encouraging, and highly knowledgeable AI Tutor for "Career Pilot".
Your role is to help students learn technical topics, debug code, and prepare for their career.
${careerContext}

Guidelines:
- Explain complex concepts simply using analogies, bullet points, and clean structures.
- For coding questions, provide clean, well-commented code blocks.
- Highlight common bugs or errors they might run into.
- Encourage self-correction by asking minor guidance questions if they are stuck on a problem.
- Keep responses engaging, structured, and easy to read using Markdown (bold text, numbered lists, bullet points, and code syntax highlighting).`;

    // 5. Call OpenAI Chat Completions
    const client = getLlmClient();
    const model = getLlmModel();

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...recentHistory.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || "I'm sorry, I encountered an issue generating a response. Please try again.";

    // 6. Save AI reply to history
    chat.messages.push({
      role: "assistant",
      content: reply,
      sentAt: new Date(),
    });

    await chat.save();

    // 7. Update progress (increment tutorSessions, update lastActive)
    await UserProgress.findOneAndUpdate(
      { userId },
      { 
        $inc: { tutorSessions: 1 }, 
        $set: { lastActive: new Date() } 
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      reply,
      messages: chat.messages,
    });
  } catch (error: any) {
    console.error("AI Tutor Chat route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
