import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Roadmap from "@/models/Roadmap";
import CareerRecommendation from "@/models/CareerRecommendation";
import UserProfile from "@/models/UserProfile";
import Course from "@/models/Course";
import { generateStructuredJson } from "@/lib/llm";
import { enforceLlmBudget } from "@/lib/llmGuard";

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

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const refresh =
      new URL(req.url).searchParams.get("refresh") === "1" ||
      new URL(req.url).searchParams.get("refresh") === "true";

    await dbConnect();

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

    const careerPath = selectedRecommendation.careerPath;

    // Reuse a cached roadmap for this career path — do not delete other paths'
    // roadmaps when switching, so switching back stays instant (no LLM).
    let roadmap = refresh
      ? null
      : await Roadmap.findOne({ userId, careerPath });
    if (refresh) {
      await Roadmap.deleteMany({ userId, careerPath });
      await Course.deleteMany({ userId, careerPath });
    }
    if (roadmap) {
      return NextResponse.json(roadmap.toJSON());
    }

    const limited = enforceLlmBudget(userId, "roadmap", 5);
    if (limited) return limited;

    // Fetch UserProfile to customize roadmap milestones to student's background
    const userProfile = await UserProfile.findOne({ userId });
    const skillsList = userProfile?.skills
      ? userProfile.skills.map((s: { name: string; level: string }) => `${s.name} (${s.level})`).join(", ")
      : "None listed";

    const systemPrompt = `You are a curriculum design expert. Create a detailed, sequential learning roadmap for ONE career path only.

Hard rules:
- The Career Path field is the single source of truth for domain. Every milestone must clearly belong to that profession.
- Do NOT invent hybrid careers (e.g. never turn "Health Educator" into coding, DevOps, web engineering, software product, or "tech + X" tracks).
- Student interests/subjects/skills may only adjust starting difficulty or which in-domain topics to emphasize. If a listed skill is outside the career path (e.g. coding skills for Health Educator), IGNORE it for milestone content.
- Prefer real entry paths for that field: coursework, certifications, supervised practice, portfolios, volunteering, exams — not unrelated tech projects.
- The roadmap must have exactly three stages: "beginner", "intermediate", and "advanced".
- Each stage must contain exactly 3-4 actionable milestones.

Return your response ONLY as a JSON object matching this structure:
{
  "stages": [
    {
      "name": "beginner",
      "milestones": [
        { "title": "Clear milestone action title" }
      ]
    }
  ]
}`;

    const userPrompt = `Career Path (authoritative): ${careerPath}

Student context (use only when relevant to "${careerPath}"):
- Interests: ${userProfile?.interests?.join(", ") || "General"}
- Goals: ${userProfile?.goals || "Build a successful career"}
- Current Skills: ${skillsList}

Generate a personalized in-domain roadmap for ${careerPath} only. Do not mix in unrelated fields.`;

    const llmResult = await generateStructuredJson<LlmRoadmapResponse>(systemPrompt, userPrompt);

    if (!llmResult || !llmResult.stages || !Array.isArray(llmResult.stages)) {
      throw new Error("Invalid output format from LLM for learning roadmap");
    }

    const roadmapStages = llmResult.stages.map((stage) => ({
      name: stage.name,
      milestones: stage.milestones.map((m) => ({
        title: m.title,
        completed: false,
      })),
    }));

    roadmap = await Roadmap.create({
      userId,
      careerPath,
      stages: roadmapStages,
      currentStage: "beginner",
    });

    return NextResponse.json(roadmap.toJSON());
  } catch (error: any) {
    console.error("Roadmap GET route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
