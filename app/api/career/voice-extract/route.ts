import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateStructuredJson } from "@/lib/llm";
import { enforceLlmBudget } from "@/lib/llmGuard";

interface ExtractedProfile {
  interests: string[];
  goals: string;
  subjects: string[];
  skills: Array<{ name: string; level: "beginner" | "intermediate" | "advanced" }>;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const limited = enforceLlmBudget(session.user.id, "voice-extract", 10);
    if (limited) return limited;

    const { conversation } = await req.json();
    if (!conversation || !Array.isArray(conversation)) {
      return NextResponse.json({ message: "Missing conversation logs." }, { status: 400 });
    }

    const conversationText = conversation
      .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
      .join("\n\n");

    const systemPrompt = `You are an AI data extractor. Analyze the conversation transcripts of a career assessment interview and extract a structured JSON profile of the user.
Extract:
1. interests: Array of user's core interests/domains (e.g. ["Software Engineering", "UI/UX Design"]). Map them to standard domains where possible.
2. goals: A single cohesive description summarizing the user's career goals and aspirations (minimum 10 characters).
3. subjects: Array of academic or technical subjects they enjoy (e.g. ["Computer Science", "Mathematics"]).
4. skills: Array of objects, each with "name" (the skill) and "level" ("beginner", "intermediate", or "advanced"). Infer the level based on their description of experience or confidence.

Return your response ONLY as a JSON object matching this schema:
{
  "interests": ["string"],
  "goals": "string",
  "subjects": ["string"],
  "skills": [
    { "name": "string", "level": "beginner" | "intermediate" | "advanced" }
  ]
}`;

    const userPrompt = `Conversation Log:\n${conversationText}\n\nExtract and return the structured JSON object:`;

    const extracted = await generateStructuredJson<ExtractedProfile>(systemPrompt, userPrompt);

    return NextResponse.json(extracted);
  } catch (error: any) {
    console.error("Voice profile extraction error:", error);
    return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
}
