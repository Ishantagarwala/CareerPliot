import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Roadmap, { IRoadmapStage } from "@/models/Roadmap";
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

const validTypes = ["required", "recommended", "optional", "project", "career"] as const;
const validResourceTypes = ["video", "article", "course", "tool", "practice"] as const;
const validStageNames = ["beginner", "intermediate", "advanced"] as const;

const safeHttpUrl = (raw: string) => {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
};

// Transform LLM response into database schema with strict sanitization.
function sanitizeRoadmap(llmResult: LlmRoadmapResponse, careerPath: string) {
  return llmResult.stages.map((stage, stageIdx) => {
    const rawName = String(stage.name || "").toLowerCase();
    const stageName = (validStageNames as readonly string[]).includes(rawName)
      ? (rawName as (typeof validStageNames)[number])
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
      const type = (validTypes as readonly string[]).includes(rawType)
        ? (rawType as (typeof validTypes)[number])
        : "required";
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
        resources: (Array.isArray(t.resources) ? t.resources : []).map((r: { title?: string; url?: string; type?: string; free?: boolean }) => {
          const rawResType = String(r?.type || "article").toLowerCase();
          return {
            title: String(r?.title || "Documentation Guide"),
            url: r?.url ? safeHttpUrl(String(r.url)) : "",
            type: (validResourceTypes as readonly string[]).includes(rawResType)
              ? (rawResType as (typeof validResourceTypes)[number])
              : "article",
            free: r?.free !== false,
          };
        }),
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
}

// A usable roadmap has all 3 stages with 4 real topics each — never generic filler.
function isCompleteRoadmap(stages: ReturnType<typeof sanitizeRoadmap>): boolean {
  return (
    stages.length === 3 &&
    stages.every((s) => s.topics.length === 4) &&
    stages.every((s) => s.topics.every((t) => !/^Skill Node \d+$/.test(t.title) && t.title.length > 3))
  );
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

    // Reuse cached roadmap. Never delete until a new generation succeeds —
    // otherwise an LLM failure wipes user progress.
    let roadmap = refresh
      ? null
      : await Roadmap.findOne({ userId, careerPath });

    if (roadmap && !refresh) {
      const stages = (roadmap.stages || []) as IRoadmapStage[];
      const hasTopics = stages.some(
        (s: IRoadmapStage) => Array.isArray(s.topics) && s.topics.length > 0
      );

      if (hasTopics) {
        let backfilled = false;
        for (const stage of stages) {
          for (const topic of stage.topics || []) {
            const existing = topic.youtubeVideos || [];
            if (existing.length < 3) {
              topic.youtubeVideos = getRecommendedYouTubeVideos(topic.title, existing);
              backfilled = true;
            }
          }
        }
        if (backfilled) {
          await roadmap.save();
        }
        return NextResponse.json(roadmap.toJSON());
      }
      // Legacy milestone-only cache: generate the new topic graph below, then replace.
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

Hard rules:
- The Career Path field is the single source of truth. Every topic must belong to that profession.
- Do NOT invent hybrid careers (never turn a non-software path into coding, DevOps, or "tech + X").
- Student skills may only adjust starting difficulty. Ignore listed skills that are outside the career path.
- Use real in-domain topic titles (tools, certifications, coursework, methods, or technologies actually used in that field).
- Be concise so the response fits in one output: descriptions under 40 words, 2-3 subtopics, 2 resources per topic.

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

    const userPrompt = `Career Path (authoritative): ${careerPath}
Student Background: ${skillsList}
Goal: ${userProfile?.goals || "Get hired as an entry-level professional"}

Generate 4 specific, in-domain topic nodes per stage for "${careerPath}". Titles should name real skills, methods, or tools used in that career — not generic filler and not unrelated tech. Be concise: each description under 40 words, 2-3 subtopics, 2 resources.`;

    console.log(`[Roadmap] Generating roadmap for "${careerPath}" via LLM...`);

    // Generate with a retry: if the LLM is cut off or drifts off-path, the first
    // attempt is never saved as a broken roadmap.
    const retryPrompt = `Career Path (authoritative): ${careerPath}
Student Background: ${skillsList}
Goal: ${userProfile?.goals || "Get hired as an entry-level professional"}

Your previous response was incomplete or off-topic. Retry and COMPLETE the full JSON: exactly 3 stages (beginner, intermediate, advanced) with exactly 4 in-domain topics each (12 total). Be more concise so the response fits: descriptions under 30 words, 2 subtopics, 2 resources. Every topic must be a real skill, tool, certification, or method used by ${careerPath}s — nothing generic, nothing from unrelated fields.`;

    let llmResult: LlmRoadmapResponse | null = null;
    let roadmapStages: ReturnType<typeof sanitizeRoadmap> = [];

    for (let attempt = 1; attempt <= 2; attempt++) {
      const prompt = attempt === 1 ? userPrompt : retryPrompt;
      llmResult = await generateStructuredJson<LlmRoadmapResponse>(systemPrompt, prompt);

      if (!llmResult || !llmResult.stages || !Array.isArray(llmResult.stages)) {
        console.warn(`[Roadmap] Attempt ${attempt} invalid output format — retrying...`);
        continue;
      }

      roadmapStages = sanitizeRoadmap(llmResult, careerPath);

      console.log(`[Roadmap] Attempt ${attempt}: ${roadmapStages.length} stages, topics: [${roadmapStages.map((s) => s.topics.length).join(", ")}]`);

      if (isCompleteRoadmap(roadmapStages)) break;
      console.warn(`[Roadmap] Attempt ${attempt} incomplete — regenerating...`);
    }

    if (!isCompleteRoadmap(roadmapStages)) {
      throw new Error(
        `Roadmap generation was cut off before completing all 12 topics for "${careerPath}". Please try again.`
      );
    }

    const payload = {
      userId,
      careerPath,
      overview: String(llmResult?.overview || `Complete granular pathway to become a successful ${careerPath}.`),
      totalEstimatedWeeks: String(llmResult?.totalEstimatedWeeks || "16-24 weeks"),
      targetRole: String(llmResult?.targetRole || `Entry-level ${careerPath}`),
      stages: roadmapStages,
      currentStage: "beginner" as const,
    };

    // Replace only after a successful generation so LLM failures keep the old roadmap.
    if (refresh) {
      await Course.deleteMany({ userId, careerPath });
    }
    await Roadmap.deleteMany({ userId, careerPath });
    try {
      roadmap = await Roadmap.create(payload);
    } catch (createErr: unknown) {
      const code = (createErr as { code?: number })?.code;
      if (code === 11000) {
        const existing = await Roadmap.findOne({ userId, careerPath });
        if (existing) return NextResponse.json(existing.toJSON());
      }
      throw createErr;
    }

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
