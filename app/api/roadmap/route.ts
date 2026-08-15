import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Roadmap from "@/models/Roadmap";
import CareerRecommendation from "@/models/CareerRecommendation";
import UserProfile from "@/models/UserProfile";
import Course from "@/models/Course";
import { generateStructuredJson } from "@/lib/llm";
import { enforceLlmBudget } from "@/lib/llmGuard";
import { getRecommendedYouTubeVideos, YouTubeVideoRec } from "@/lib/youtubeHelper";

interface LlmSubtopic {
  title: string;
}

interface LlmResource {
  title: string;
  url?: string;
  type?: "video" | "article" | "course" | "tool" | "practice";
  free?: boolean;
}

interface LlmTopic {
  id: string;
  title: string;
  description: string;
  type: "required" | "recommended" | "optional" | "project" | "career";
  whyItMatters: string;
  nonTechTip: string;
  timeEstimate: string;
  subtopics: LlmSubtopic[] | string[];
  resources: LlmResource[];
  youtubeVideos?: YouTubeVideoRec[];
  deliverable: string;
  prerequisites: string[];
}

interface LlmStage {
  name: "beginner" | "intermediate" | "advanced";
  title: string;
  description: string;
  topics: LlmTopic[];
}

interface LlmRoadmapResponse {
  overview: string;
  totalEstimatedWeeks: string;
  targetRole: string;
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

    // Reuse cached roadmap for this path if valid
    let roadmap = refresh
      ? null
      : await Roadmap.findOne({ userId, careerPath });

    if (refresh) {
      console.log(`[Roadmap] Refresh requested — deleting cached roadmap for "${careerPath}"`);
      await Roadmap.deleteMany({ userId, careerPath });
      await Course.deleteMany({ userId, careerPath });
    } else if (roadmap) {
      // Validate cached roadmap: must have topics AND youtubeVideos populated
      const stages = roadmap.stages || [];
      const hasValidTopics = stages.some(
        (s: any) => s.topics && s.topics.length > 0 && s.topics.some((t: any) => t.youtubeVideos && t.youtubeVideos.length > 0)
      );
      if (hasValidTopics) {
        console.log(`[Roadmap] Returning valid cached roadmap for "${careerPath}" with ${stages.length} stages`);
        return NextResponse.json(roadmap.toJSON());
      }
      // Stale or legacy roadmap — delete and regenerate
      console.log(`[Roadmap] Stale cached roadmap for "${careerPath}" — deleting and regenerating`);
      await Roadmap.deleteMany({ userId, careerPath });
    }

    const limited = enforceLlmBudget(userId, "roadmap", 5);
    if (limited) return limited;

    // Fetch UserProfile
    const userProfile = await UserProfile.findOne({ userId });
    const skillsList = userProfile?.skills
      ? userProfile.skills.map((s: { name: string; level: string }) => `${s.name} (${s.level})`).join(", ")
      : "None listed";

    const systemPrompt = `You are a career curriculum expert. Output ONLY a valid JSON object, no markdown, no explanation.

Generate a career roadmap with exactly 3 stages and exactly 4 topics per stage (12 topics total).

Stage names MUST be exactly these strings: "beginner", "intermediate", "advanced"
Topic type MUST be one of: "required", "recommended", "optional", "project", "career"

Return this exact JSON structure (fill every field with real content, keep strings under 120 chars):
{
  "overview": "string",
  "totalEstimatedWeeks": "string",
  "targetRole": "string",
  "stages": [
    {
      "name": "beginner",
      "title": "string",
      "description": "string",
      "topics": [
        {
          "id": "b1",
          "title": "string",
          "description": "string",
          "type": "required",
          "whyItMatters": "string",
          "nonTechTip": "string",
          "timeEstimate": "string",
          "prerequisites": [],
          "subtopics": ["string", "string", "string"],
          "resources": [{"title": "string", "type": "article", "free": true, "url": ""}],
          "deliverable": "string"
        }
      ]
    },
    {
      "name": "intermediate",
      "title": "string",
      "description": "string",
      "topics": [
        {"id": "i1", "title": "string", "description": "string", "type": "required", "whyItMatters": "string", "nonTechTip": "string", "timeEstimate": "string", "prerequisites": [], "subtopics": ["string", "string"], "resources": [{"title": "string", "type": "article", "free": true, "url": ""}], "deliverable": "string"}
      ]
    },
    {
      "name": "advanced",
      "title": "string",
      "description": "string",
      "topics": [
        {"id": "a1", "title": "string", "description": "string", "type": "project", "whyItMatters": "string", "nonTechTip": "string", "timeEstimate": "string", "prerequisites": [], "subtopics": ["string", "string"], "resources": [{"title": "string", "type": "article", "free": true, "url": ""}], "deliverable": "string"}
      ]
    }
  ]
}`;

    const userPrompt = `Career Path: ${careerPath}
Student Background: ${skillsList}
Goal: ${userProfile?.goals || "Get hired as an entry-level professional"}

Generate 4 specific, technology-named topic nodes per stage for the career path "${careerPath}". Use real technology names (e.g. HTML5, Python, React, SQL, Git) as topic titles.`;

    console.log(`[Roadmap] Generating roadmap for "${careerPath}" via LLM...`);
    const llmResult = await generateStructuredJson<LlmRoadmapResponse>(systemPrompt, userPrompt);

    // Debug log the raw LLM result
    console.log(`[Roadmap] LLM result stages count: ${llmResult?.stages?.length}`);
    llmResult?.stages?.forEach((s, i) => {
      console.log(`[Roadmap]   Stage ${i} "${s.name}": ${s.topics?.length ?? 0} topics`);
    });

    if (!llmResult || !llmResult.stages || !Array.isArray(llmResult.stages)) {
      throw new Error("Invalid output format from LLM — no stages array");
    }

    const validTypes = ["required", "recommended", "optional", "project", "career"];
    const validStageNames = ["beginner", "intermediate", "advanced"];

    // Transform LLM response into database schema with strict sanitization
    const roadmapStages = llmResult.stages.map((stage, stageIdx) => {
      const stageName = validStageNames.includes(stage.name)
        ? stage.name
        : stageIdx === 0
        ? "beginner"
        : stageIdx === 1
        ? "intermediate"
        : "advanced";

      const rawTopics = Array.isArray(stage.topics) ? stage.topics : [];
      console.log(`[Roadmap] Processing stage "${stageName}" with ${rawTopics.length} raw topics`);

      const topics = rawTopics.map((t, idx) => {
        const topicId = String(t.id || `node-${stageName}-${idx + 1}`);
        const title = String(t.title || `Skill Node ${idx + 1}`);
        const description = String(t.description || `Master core concepts and practical skills for ${title}.`);
        const rawType = String(t.type || "").toLowerCase();
        const type = validTypes.includes(rawType) ? rawType : "required";
        const ytVideos = getRecommendedYouTubeVideos(title, t.youtubeVideos);

        return {
          id: topicId,
          title,
          description,
          type,
          whyItMatters: String(t.whyItMatters || `Essential competency for entry-level ${careerPath}.`),
          nonTechTip: String(t.nonTechTip || "Take it step-by-step and practice with hands-on exercises."),
          timeEstimate: String(t.timeEstimate || "1-2 weeks"),
          subtopics: (Array.isArray(t.subtopics) ? t.subtopics : []).map((sub: any, sIdx: number) => {
            const subTitle = typeof sub === "string" ? sub : (sub?.title ? String(sub.title) : `Subtopic ${sIdx + 1}`);
            return {
              id: `sub-${topicId}-${sIdx + 1}`,
              title: subTitle,
              completed: false,
            };
          }),
          resources: (Array.isArray(t.resources) ? t.resources : []).map((r: any) => ({
            title: String(r?.title || "Documentation Guide"),
            url: String(r?.url || ""),
            type: String(r?.type || "article"),
            free: r?.free !== false,
          })),
          youtubeVideos: ytVideos,
          deliverable: String(t.deliverable || `Build a practical ${title} mini-project`),
          prerequisites: Array.isArray(t.prerequisites) ? t.prerequisites.map(String) : [],
          completed: false,
        };
      });

      const milestones = topics.map((t) => ({ title: t.title, completed: false }));

      return {
        name: stageName,
        title: String(stage.title || `Stage ${stageIdx + 1}: ${stageName.charAt(0).toUpperCase() + stageName.slice(1)}`),
        description: String(stage.description || `Mastery stage for ${stageName}.`),
        milestones,
        topics,
      };
    });

    console.log(`[Roadmap] Saving roadmap with ${roadmapStages.length} stages, topics: [${roadmapStages.map(s => s.topics.length).join(", ")}]`);

    roadmap = await Roadmap.create({
      userId,
      careerPath,
      overview: String(llmResult.overview || `Complete granular pathway to become a successful ${careerPath}.`),
      totalEstimatedWeeks: String(llmResult.totalEstimatedWeeks || "16-24 weeks"),
      targetRole: String(llmResult.targetRole || `Entry-level ${careerPath}`),
      stages: roadmapStages,
      currentStage: "beginner",
    });

    const savedJson = roadmap.toJSON();
    console.log(`[Roadmap] Saved. Stages: ${savedJson.stages?.length}, Topics per stage: [${savedJson.stages?.map((s: any) => s.topics?.length ?? 0).join(", ")}]`);

    return NextResponse.json(savedJson);
  } catch (error: any) {
    console.error("[Roadmap] GET route error:", error?.message || error);
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
