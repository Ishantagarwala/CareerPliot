import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Roadmap from "@/models/Roadmap";
import CareerRecommendation from "@/models/CareerRecommendation";
import UserProfile from "@/models/UserProfile";
import { generateStructuredJson } from "@/lib/llm";

interface LlmMilestone {
  title: string;
}

interface LlmStage {
  name: "beginner" | "intermediate" | "advanced";
  milestones: LlmMilestone[];
}

interface LlmRoadmapResponse {
  stages: LlmStage[];
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    await dbConnect();

    // 1. Check if roadmap already exists
    let roadmap = await Roadmap.findOne({ userId });
    if (roadmap) {
      return NextResponse.json(roadmap);
    }

    // 2. Find selected career path
    const selectedRecommendation = await CareerRecommendation.findOne({
      userId,
      selected: true,
    });

    if (!selectedRecommendation) {
      return NextResponse.json(
        { message: "No career path selected yet. Please select a career path first." },
        { status: 404 }
      );
    }

    // 3. Fetch UserProfile to customize roadmap milestones to student's background
    const userProfile = await UserProfile.findOne({ userId });
    const skillsList = userProfile?.skills
      ? userProfile.skills.map((s: { name: string; level: string }) => `${s.name} (${s.level})`).join(", ")
      : "None listed";
    
    // 4. Query LLM to generate stage-wise roadmap
    const systemPrompt = `You are a curriculum design expert. Create a detailed, sequential learning roadmap for a student transitioning into the specified career path.
The roadmap must be structured into exactly three stages: "beginner", "intermediate", and "advanced".
Each stage must contain exactly 3-4 structured milestones.
Make the milestones actionable, practical, and progressive. Take the student's current skills and interests into account to customize the roadmap.
Return your response ONLY as a JSON object matching this structure:
{
  "stages": [
    {
      "name": "beginner", // Must be exactly: beginner, intermediate, or advanced
      "milestones": [
        {
          "title": "Clear milestone action title"
        }
      ]
    }
  ]
}`;

    const userPrompt = `Career Path: ${selectedRecommendation.careerPath}
Student's Current Profile:
- Interests: ${userProfile?.interests?.join(", ") || "General"}
- Goals: ${userProfile?.goals || "Build a successful career"}
- Current Skills: ${skillsList}

Generate a personalized roadmap tailored for this student.`;

    const llmResult = await generateStructuredJson<LlmRoadmapResponse>(systemPrompt, userPrompt);

    if (!llmResult || !llmResult.stages || !Array.isArray(llmResult.stages)) {
      throw new Error("Invalid output format from LLM for learning roadmap");
    }

    // 5. Build and save new roadmap
    const roadmapStages = llmResult.stages.map((stage) => ({
      name: stage.name,
      milestones: stage.milestones.map((m) => ({
        title: m.title,
        completed: false,
      })),
    }));

    roadmap = await Roadmap.create({
      userId,
      careerPath: selectedRecommendation.careerPath,
      stages: roadmapStages,
      currentStage: "beginner",
    });

    return NextResponse.json(roadmap);
  } catch (error: any) {
    console.error("Roadmap GET route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
