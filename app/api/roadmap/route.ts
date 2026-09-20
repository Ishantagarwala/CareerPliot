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

/**
 * One stage's worth of LLM output. The one-pass path returns three of these
 * under `stages`; the staged fallback returns one on its own.
 *
 * Generation is split per stage only when a whole-roadmap response is cut off:
 * a reasoning model spends most of its completion budget thinking, so a shorter
 * ask reliably fits where a longer one did not.
 */
interface LlmStageResponse {
  overview?: string;
  totalEstimatedWeeks?: string;
  targetRole?: string;
  title?: string;
  description?: string;
  topics?: LlmTopic[];
}

/** The whole-roadmap response: the shape the one-pass path asks for. */
interface LlmRoadmapResponse {
  overview?: string;
  totalEstimatedWeeks?: string;
  targetRole?: string;
  /** `name` identifies the stage in the one-pass response. */
  stages?: Array<LlmStageResponse & { name?: string }>;
}

const STAGE_ORDER = ["beginner", "intermediate", "advanced"] as const;
type StageName = (typeof STAGE_ORDER)[number];

/** Topics requested per stage, and the floor a stage must reach to be usable. */
const TOPICS_PER_STAGE = 4;
const MIN_TOPICS_PER_STAGE = 3;

/**
 * Completion ceiling for one generation request.
 *
 * Generous on purpose: a reasoning model spends most of its budget thinking,
 * and the previous 12000 ceiling was regularly consumed before the last stage
 * of a roadmap was written — producing truncated JSON, which the repair step
 * then "fixed" into empty or filler-filled stages. The provider accepts 32k,
 * and the model only pays for what it actually emits.
 */
const ROADMAP_MAX_TOKENS =
  Number(process.env.LLM_ROADMAP_MAX_TOKENS?.trim()) || 32_000;

/**
 * How long generation may take before a staged fallback stops asking for more
 * stages and saves what it has. Hosted platforms commonly cancel a request at
 * 60s; override with LLM_ROADMAP_TIME_BUDGET_MS.
 */
const STAGE_TIME_BUDGET_MS =
  Number(process.env.LLM_ROADMAP_TIME_BUDGET_MS?.trim()) || 90_000;

const validTypes = ["required", "recommended", "optional", "project", "career"] as const;
const validResourceTypes = ["video", "article", "course", "tool", "practice"] as const;

const safeHttpUrl = (raw: string) => {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
};

// Transform one LLM stage into the database schema with strict sanitization.
function sanitizeStage(
  stage: LlmStageResponse,
  stageName: StageName,
  stageIdx: number,
  careerPath: string
) {
  const rawTopics = Array.isArray(stage?.topics) ? stage.topics : [];
  console.log(`[Roadmap] Stage "${stageName}": ${rawTopics.length} raw topics`);

  const topics = rawTopics.slice(0, TOPICS_PER_STAGE).map((t, idx) => {
    const topicId = String(t?.id || `node-${stageName}-${idx + 1}`);
    const title = String(t?.title || "").trim() || `Skill Node ${idx + 1}`;
    const description = String(
      t?.description || `Master core concepts and practical skills for ${title}.`
    );
    const rawType = String(t?.type || "").toLowerCase();
    const type = (validTypes as readonly string[]).includes(rawType)
      ? (rawType as (typeof validTypes)[number])
      : "required";
    const ytVideos = getRecommendedYouTubeVideos(title, t?.youtubeVideos);

    return {
      id: topicId,
      title,
      description,
      type,
      whyItMatters: String(
        t?.whyItMatters || `Essential competency for entry-level ${careerPath}.`
      ),
      nonTechTip: String(
        t?.nonTechTip || "Take it step-by-step and practice with hands-on exercises."
      ),
      timeEstimate: String(t?.timeEstimate || "1-2 weeks"),
      subtopics: (Array.isArray(t?.subtopics) ? t.subtopics : []).map(
        (sub: LlmSubtopic | string, sIdx: number) => {
          const subTitle =
            typeof sub === "string"
              ? sub
              : sub?.title
              ? String(sub.title)
              : `Subtopic ${sIdx + 1}`;
          return {
            id: `sub-${topicId}-${sIdx + 1}`,
            title: subTitle,
            completed: false,
          };
        }
      ),
      resources: (Array.isArray(t?.resources) ? t.resources : []).map(
        (r: LlmResource) => {
          const rawResType = String(r?.type || "article").toLowerCase();
          return {
            title: String(r?.title || "Documentation Guide"),
            url: r?.url ? safeHttpUrl(String(r.url)) : "",
            type: (validResourceTypes as readonly string[]).includes(rawResType)
              ? (rawResType as (typeof validResourceTypes)[number])
              : "article",
            free: r?.free !== false,
          };
        }
      ),
      youtubeVideos: ytVideos,
      deliverable: String(t?.deliverable || `Build a practical ${title} mini-project`),
      prerequisites: Array.isArray(t?.prerequisites) ? t.prerequisites.map(String) : [],
      completed: false,
    };
  });

  const milestones = topics.map((t) => ({ title: t.title, completed: false }));

  return {
    name: stageName,
    title: String(
      stage?.title || `Stage ${stageIdx + 1}: ${stageName.charAt(0).toUpperCase() + stageName.slice(1)}`
    ),
    description: String(stage?.description || `Mastery stage for ${stageName}.`),
    milestones,
    topics,
  };
}

type SanitizedStage = ReturnType<typeof sanitizeStage>;

/**
 * A stage is usable when it carries real, in-domain topics. The prompt asks for
 * four; three is accepted because a short stage is still a usable roadmap, and
 * demanding an exact count is what turned an almost-complete generation into a
 * failed one.
 */
function isUsableStage(stage: SanitizedStage): boolean {
  return (
    stage.topics.length >= MIN_TOPICS_PER_STAGE &&
    stage.topics.every(
      (t) => !/^Skill Node \d+$/.test(t.title) && t.title.trim().length > 3
    )
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
    const startedAt = Date.now();

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

    const goal = userProfile?.goals || "Get hired as an entry-level professional";
    const stageBrief: Record<StageName, string> = {
      beginner: "absolute first steps — fundamentals, vocabulary, and the core tools a newcomer must touch",
      intermediate: "working competence — applied practice, standard workflows, and the tools used on the job daily",
      advanced: "job-ready depth — specialisation, real deliverables, portfolio work, and interview-level skill",
    };

    /*
     * The two generation paths parse different shapes, so each gets its own
     * schema. They must not share one: a prompt describing a `stages` array
     * sent to the per-stage fallback produced a response with no `topics` key
     * at the top level, which read as "0 topics" and burned every retry on the
     * same mismatch.
     */
    const sharedRules = `Topic type MUST be one of: "required", "recommended", "optional", "project", "career"

Hard rules:
- The Career Path field is the single source of truth. Every topic must belong to that profession.
- Do NOT invent hybrid careers (never turn a non-software path into coding, DevOps, or "tech + X").
- Student skills may only adjust starting difficulty. Ignore listed skills that are outside the career path.
- Use real in-domain topic titles (tools, certifications, coursework, methods, or technologies actually used in that field).
- Keep it compact: description and whyItMatters under 20 words each, nonTechTip under 15 words, 2 subtopics, 1 resource per topic.`;

    const topicSchema = `{
      "id": "b1",
      "title": "string",
      "description": "string",
      "type": "required",
      "whyItMatters": "string",
      "nonTechTip": "string",
      "timeEstimate": "string",
      "prerequisites": [],
      "subtopics": ["string", "string"],
      "resources": [{"title": "string", "type": "article", "free": true, "url": ""}],
      "deliverable": "string"
    }`;

    /** System prompt for the one-pass path: one object holding all 3 stages. */
    const wholeRoadmapSystemPrompt = `You are a career curriculum expert. Output ONLY a valid JSON object, no markdown, no explanation.

You write career roadmaps as exactly 3 stages — "beginner", "intermediate", "advanced" — with exactly ${TOPICS_PER_STAGE} topics each. Write the whole object in this single response.

${sharedRules}

Return this exact JSON structure (fill every field with real content):
{
  "overview": "one sentence",
  "totalEstimatedWeeks": "string",
  "targetRole": "string",
  "stages": [
    { "name": "beginner", "title": "short stage title", "description": "one sentence", "topics": [${topicSchema}] },
    { "name": "intermediate", "title": "string", "description": "string", "topics": [ /* ${TOPICS_PER_STAGE} topics, same shape */ ] },
    { "name": "advanced", "title": "string", "description": "string", "topics": [ /* ${TOPICS_PER_STAGE} topics, same shape */ ] }
  ]
}`;

    /** System prompt for the fallback: one object holding a single stage. */
    const singleStageSystemPrompt = `You are a career curriculum expert. Output ONLY a valid JSON object, no markdown, no explanation.

You write ONE stage of a career roadmap. Its topics are at the TOP LEVEL of the object — there is no "stages" array in this response.

${sharedRules}

Return this exact JSON structure (fill every field with real content):
{
  "overview": "one sentence describing the whole path",
  "totalEstimatedWeeks": "string",
  "targetRole": "string",
  "title": "short title for this stage",
  "description": "one sentence describing this stage",
  "topics": [${topicSchema}, /* and the remaining topics, same shape */]
}`;

    /**
     * The primary path: the whole roadmap in one request.
     *
     * One request is also the fastest — the router serves a full 12-topic
     * document in about the time it takes to serve a single stage, because most
     * of the latency is the model thinking rather than the response length.
     * The risk it carries is truncation, which is handled by asking for a
     * compact document (see the prompt above), leaving a large token ceiling,
     * and falling back to per-stage generation when it still happens.
     */
    async function generateWholeRoadmap(): Promise<{
      stages: SanitizedStage[];
      raw: LlmRoadmapResponse;
    } | null> {
      const prompt = `Career Path (authoritative): ${careerPath}
Student Background: ${skillsList}
Goal: ${goal}

Write the complete 3-stage roadmap for "${careerPath}": beginner, then intermediate, then advanced, ${TOPICS_PER_STAGE} topic nodes each. Stage meanings:
- beginner: ${stageBrief.beginner}
- intermediate: ${stageBrief.intermediate}
- advanced: ${stageBrief.advanced}

Titles must name real skills, methods, tools, or certifications used in that career — no generic filler, nothing from unrelated fields. No topic may appear twice across the three stages.`;

      const raw = await generateStructuredJson<LlmRoadmapResponse>(
        wholeRoadmapSystemPrompt,
        prompt,
        false,
        ROADMAP_MAX_TOKENS
      );
      if (!raw || !Array.isArray(raw.stages)) return null;

      /*
       * Matched strictly by name. Positional fallback looks tempting but is
       * wrong here: if the model answered "advanced" first, taking it by
       * position would file an advanced stage under beginner and still pass
       * validation. An unmatched response is better treated as a miss, which
       * sends the request down the staged path.
       */
      const stages: SanitizedStage[] = [];
      for (let i = 0; i < STAGE_ORDER.length; i++) {
        const stageName = STAGE_ORDER[i];
        const match = raw.stages.find(
          (s) => String(s?.name || "").toLowerCase().trim() === stageName
        );
        if (!match) continue;
        stages.push(sanitizeStage(match, stageName, i, careerPath));
      }

      return { stages, raw };
    }

    /**
     * Re-asks for a single stage. `concise` is the last resort: an oversized
     * answer is almost always a length problem, not a competence one.
     */
    async function generateStage(
      stageName: StageName,
      stageIdx: number,
      coveredTitles: string[],
      concise: boolean
    ): Promise<LlmStageResponse> {
      const covered = coveredTitles.length
        ? coveredTitles.map((t) => `- ${t}`).join("\n")
        : "- (nothing yet — this is the first stage)";

      const brevity = concise
        ? "Be very brief: each description under 15 words, 2 subtopics, 1 resource."
        : "Be concise: each description under 20 words, 2 subtopics, 1 resource.";

      const prompt = `Career Path (authoritative): ${careerPath}
Student Background: ${skillsList}
Goal: ${goal}

Write the "${stageName}" stage of this roadmap.
This stage means: ${stageBrief[stageName]}.

Already covered in earlier stages (do not repeat):
${covered}

Generate exactly ${TOPICS_PER_STAGE} specific, in-domain topic nodes at the ${stageName} level for "${careerPath}". Titles must name real skills, methods, tools, or certifications used in that career — no generic filler, nothing from unrelated fields. ${brevity}`;

      const raw = await generateStructuredJson<LlmStageResponse>(
        singleStageSystemPrompt,
        prompt,
        false,
        ROADMAP_MAX_TOKENS
      );

      /*
       * Tolerate a provider that answers the stage question with the whole
       * roadmap shape anyway: unwrap the one stage instead of reporting zero
       * topics three times and giving up.
       */
      if (!Array.isArray(raw?.topics) && raw) {
        const wrapped = (raw as { stages?: LlmStageResponse[] }).stages;
        const first = Array.isArray(wrapped) ? wrapped[0] : undefined;
        if (first && Array.isArray(first.topics)) {
          console.warn(
            `[Roadmap] ${stageName}: response used the whole-roadmap shape; unwrapping its first stage.`
          );
          return first;
        }
      }

      return raw;
    }

    /**
     * Generates one stage, retrying until it is usable.
     *
     * A retry only makes sense when the stage might come back different. A
     * response that parsed but carries no topic list is a schema mismatch, not
     * bad luck, so it is reported once and the stage is abandoned — the earlier
     * version spent three full generations rediscovering the same mismatch.
     *
     * A stage that fails resolves to `null` rather than throwing: the stages
     * that did succeed are saved, because a partial roadmap the student can
     * start on beats an error screen — the old all-or-nothing generation turned
     * one bad stage into "roadmap generation is broken".
     */
    async function generateUsableStage(
      stageName: StageName,
      stageIdx: number,
      coveredTitles: string[]
    ): Promise<{ stage: SanitizedStage; raw: LlmStageResponse } | null> {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const concise = attempt === 3;
        try {
          const raw = await generateStage(stageName, stageIdx, coveredTitles, concise);
          if (!raw) {
            console.warn(`[Roadmap] ${stageName} attempt ${attempt}: empty output`);
            continue;
          }

          if (!Array.isArray(raw.topics)) {
            console.error(
              `[Roadmap] ${stageName}: response has no topics array (keys: ${Object.keys(raw).join(", ") || "none"}). Not retrying — this is a schema mismatch.`
            );
            return null;
          }

          const candidate = sanitizeStage(raw, stageName, stageIdx, careerPath);
          console.log(
            `[Roadmap] ${stageName} attempt ${attempt}: ${candidate.topics.length} topics`
          );

          if (isUsableStage(candidate)) return { stage: candidate, raw };

          console.warn(
            `[Roadmap] ${stageName} attempt ${attempt} unusable (${candidate.topics.length} topics) — retrying`
          );
        } catch (stageError) {
          console.error(
            `[Roadmap] ${stageName} attempt ${attempt} failed:`,
            (stageError as Error)?.message || stageError
          );
        }
      }

      console.error(`[Roadmap] Stage "${stageName}" could not be generated; skipping.`);
      return null;
    }

    // ── Primary path: the whole roadmap, one request ──────────────────────────
    console.log(`[Roadmap] Generating roadmap for "${careerPath}" in one pass...`);

    let roadmapStages: SanitizedStage[] = [];
    let meta: LlmRoadmapResponse | LlmStageResponse | null = null;

    try {
      const whole = await generateWholeRoadmap();
      if (whole) {
        const usable = whole.stages.filter(isUsableStage);
        console.log(
          `[Roadmap] One-pass result: ${usable.length}/${STAGE_ORDER.length} usable stages ` +
            `(topics: [${whole.stages.map((s) => s.topics.length).join(", ")}])`
        );
        // Only accept a complete document: a short one means the response was
        // cut off, which is exactly when the staged path is worth its latency.
        if (usable.length === STAGE_ORDER.length) {
          roadmapStages = whole.stages;
          meta = whole.raw;
        }
      }
    } catch (wholeError) {
      console.error(
        "[Roadmap] One-pass generation failed, falling back to per stage:",
        (wholeError as Error)?.message || wholeError
      );
    }

    // ── Fallback: stage by stage, keeping whatever succeeds ───────────────────
    if (roadmapStages.length < STAGE_ORDER.length) {
      console.warn(
        `[Roadmap] Falling back to per-stage generation for "${careerPath}"...`
      );

      /*
       * Beginner and intermediate are independent, so they run together.
       * Advanced waits for them and is told what they covered, which is what
       * keeps its topics from repeating theirs.
       */
      const [beginner, intermediate] = await Promise.all([
        generateUsableStage("beginner", 0, []),
        generateUsableStage("intermediate", 1, []),
      ]);

      const coveredTitles = [
        ...(beginner?.stage.topics ?? []),
        ...(intermediate?.stage.topics ?? []),
      ].map((t) => t.title);

      /*
       * A hosted deployment can cap how long a request may run. The first two
       * stages are already usable on their own, so once that cap is near we
       * save them instead of spending the remaining time on a third stage that
       * would be cancelled mid-flight anyway.
       */
      const advanced =
        Date.now() - startedAt > STAGE_TIME_BUDGET_MS
          ? (console.warn(
              `[Roadmap] ${Math.round(
                (Date.now() - startedAt) / 1000
              )}s elapsed — saving the stages generated so far.`
            ),
            null)
          : await generateUsableStage("advanced", 2, coveredTitles);

      const generated = [beginner, intermediate, advanced];
      roadmapStages = generated
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .map((entry) => entry.stage);
      meta = generated.find((entry) => entry)?.raw ?? null;
    }

    if (roadmapStages.length === 0) {
      throw new Error(
        `Could not generate a roadmap for "${careerPath}" right now. Please try again in a moment.`
      );
    }

    if (roadmapStages.length < STAGE_ORDER.length) {
      console.warn(
        `[Roadmap] Saving partial roadmap for "${careerPath}": ${roadmapStages.length}/${STAGE_ORDER.length} stages.`
      );
    }

    const payload = {
      userId,
      careerPath,
      overview: String(meta?.overview || `Complete granular pathway to become a successful ${careerPath}.`),
      totalEstimatedWeeks: String(meta?.totalEstimatedWeeks || "16-24 weeks"),
      targetRole: String(meta?.targetRole || `Entry-level ${careerPath}`),
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
