import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import UserProfile from "@/models/UserProfile";
import CareerRecommendation from "@/models/CareerRecommendation";
import { generateStructuredJson } from "@/lib/llm";

interface LlmRecommendation {
  careerPath: string;
  matchScore: number;
  reasoning: string;
}

interface LlmResponse {
  recommendations: LlmRecommendation[];
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { interests, goals, subjects, skills } = await req.json();

    if (!interests || !goals || !subjects || !skills) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    // 1. Save or update UserProfile
    await UserProfile.findOneAndUpdate(
      { userId },
      {
        interests,
        goals,
        subjects,
        skills,
        assessedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // 2. Format profile data for prompt
    const skillsString = skills
      .map((s: { name: string; level: string }) => `${s.name} (${s.level})`)
      .join(", ");

    const systemPrompt = `You are a professional student career counselor. Analyze the student's profile (interests, goals, academic subjects, and current skills) and recommend the top 3 best-fitting career paths.
If the student indicates a preference, interest, or background in Computer Science or Software Engineering (e.g., if they select "Computer Science" as a subject, or select Software/AI interests, or mention coding/programming in their goals), ensure the recommended career paths align with core Computer Science, Software Engineering, AI/ML development, Web/Mobile Development, and related fields rather than general data analysis or IT support.

Return your response ONLY as a JSON object matching this structure:
{
  "recommendations": [
    {
      "careerPath": "Exact Job Title or Career Area",
      "matchScore": 85, // Integer score from 0-100 indicating fit
      "reasoning": "Clear, encouraging reasoning (2-3 sentences) on why this path fits their interests, skills, and goals."
    }
  ]
}`;

    const userPrompt = `Student Profile:
- Interests: ${interests.join(", ")}
- Career Goals: ${goals}
- Favorite Subjects: ${subjects.join(", ")}
- Current Skills: ${skillsString}

Analyze this profile and generate 3 recommendations. Make sure they are realistic, practical, and highly relevant.`;

    // 3. Call LLM to generate recommendations
    const llmResult = await generateStructuredJson<LlmResponse>(systemPrompt, userPrompt);

    if (!llmResult || !llmResult.recommendations || !Array.isArray(llmResult.recommendations)) {
      throw new Error("Invalid output format from LLM");
    }

    // 4. Delete old recommendations
    await CareerRecommendation.deleteMany({ userId });

    // 5. Save new recommendations to Database
    const recommendationsToSave = llmResult.recommendations.map((rec) => ({
      userId,
      careerPath: rec.careerPath,
      matchScore: rec.matchScore,
      reasoning: rec.reasoning,
      selected: false,
    }));

    const savedRecommendations = await CareerRecommendation.insertMany(recommendationsToSave);

    return NextResponse.json({
      message: "Assessment completed successfully",
      recommendations: savedRecommendations,
    });
  } catch (error: any) {
    console.error("Assessment route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    await dbConnect();

    const profile = await UserProfile.findOne({ userId });
    return NextResponse.json(profile || null);
  } catch (error: any) {
    console.error("Assessment profile GET error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
