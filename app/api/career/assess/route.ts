import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";
import UserProfile from "@/models/UserProfile";
import CareerRecommendation from "@/models/CareerRecommendation";
import { generateStructuredJson } from "@/lib/llm";
import { enforceLlmBudget } from "@/lib/llmGuard";
import { getClientIp, rateLimit, rateLimitRetryAfterMs } from "@/lib/security";
import {
  getDomainConfig,
  inferCareerDomain,
  isCareerDomain,
  type CareerDomain,
} from "@/lib/careerDomains";
import {
  careerPathKey,
  GENERIC_CAREER_QUESTION,
  sanitizeRecommendations,
} from "@/lib/career/recommendations";

interface LlmResponse {
  recommendations?: unknown;
}

/** How many recommendations the prompt asks for, and the floor that is useful. */
const WANTED_RECOMMENDATIONS = 3;
const MIN_RECOMMENDATIONS = 2;

function minutesUntil(ms: number): string {
  return `${Math.max(1, Math.ceil(ms / 60_000))} minute(s)`;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const ip = getClientIp(req);

    if (!rateLimit(`career-assess:ip:${ip}`, 10, 60 * 60 * 1000)) {
      const retryMs = rateLimitRetryAfterMs(`career-assess:ip:${ip}`);
      return NextResponse.json(
        {
          message: `Too many assessments from this network. Try again in about ${minutesUntil(
            retryMs
          )}.`,
        },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryMs / 1000)) } }
      );
    }

    /*
     * Two model calls are declared: the assessment retries once when the first
     * response cannot be used, and the hourly ceiling counts what is actually
     * spent rather than how many times the button was pressed.
     */
    const limited = enforceLlmBudget(userId, "career-assess", 5, { cost: 2 });
    if (limited) return limited;

    const { interests, goals, subjects, skills, careerDomain: requestedDomain, careerNiche } =
      await req.json();

    if (!interests || !goals || !subjects || !skills) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const careerDomain: CareerDomain = isCareerDomain(requestedDomain)
      ? requestedDomain
      : inferCareerDomain({ interests, subjects, goals });
    const domain = getDomainConfig(careerDomain);
    const nicheText =
      typeof careerNiche === "string" && careerNiche.trim()
        ? careerNiche.trim().slice(0, 160)
        : "";

    await dbConnect();

    // 1. Save or update UserProfile
    await UserProfile.findOneAndUpdate(
      { userId },
      {
        careerDomain,
        careerNiche: nicheText,
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

    const systemPrompt = `You are a professional student career counselor specializing in the "${domain.label}" domain (${domain.description}).
${nicheText ? `The student described their niche as: "${nicheText}". Prefer careers aligned with that niche.` : ""}
Analyze the student's profile and recommend the top ${WANTED_RECOMMENDATIONS} best-fitting career paths.

Rules:
- Prefer careers inside ${domain.label}${nicheText ? ` / "${nicheText}"` : ""}, unless the profile clearly points elsewhere — then include at most one adjacent path with clear reasoning.
- Prefer concrete, recognizable career titles over vague labels.
- Never invent awkward hybrid titles that mash unrelated fields (e.g. "Health Educator DevOps").
- Diversify specialization or seniority across the three recommendations when staying in-domain.
- Every recommendation must be a real job title. Never return an error message, a placeholder, or an explanation as a careerPath.
- Be realistic for students: entry paths, education requirements, and growth potential.
- For niche/other domains, recommend real entry roles that exist in India or globally for students.

Return your response ONLY as a JSON object matching this structure:
{
  "recommendations": [
    {
      "careerPath": "Exact Job Title or Career Area",
      "matchScore": 85,
      "reasoning": "Clear, encouraging reasoning (2-3 sentences) on why this path fits their interests, skills, and goals."
    }
  ]
}`;

    const userPrompt = `Student Profile:
- Primary Domain: ${domain.label}
${nicheText ? `- Niche Focus: ${nicheText}` : ""}
- Interests: ${interests.join(", ")}
- Career Goals: ${goals}
- Favorite Subjects: ${subjects.join(", ")}
- Current Skills: ${skillsString}

Analyze this profile and generate ${WANTED_RECOMMENDATIONS} recommendations for the ${domain.label} domain${nicheText ? ` with niche "${nicheText}"` : ""} unless the profile strongly requires otherwise.`;

    /*
     * 3. Generate, then validate. The model output is checked *before* anything
     * is written, because the previous order deleted the student's existing
     * recommendations first and inserted afterwards: one malformed response
     * left them with no career path at all, which reads as "generation is
     * broken". A second attempt is made only when the first is unusable.
     */
    let recommendations = sanitizeRecommendations(
      (await generateStructuredJson<LlmResponse>(systemPrompt, userPrompt))?.recommendations
    );

    if (recommendations.length < MIN_RECOMMENDATIONS) {
      console.warn(
        `[Career] First attempt produced ${recommendations.length} usable recommendation(s); retrying.`
      );
      const retryPrompt = `${userPrompt}

Your previous answer was not usable. Return ONLY the JSON object, with ${WANTED_RECOMMENDATIONS} different real job titles in "careerPath" — no error text, no placeholders, no duplicates.`;
      recommendations = sanitizeRecommendations(
        (await generateStructuredJson<LlmResponse>(systemPrompt, retryPrompt))?.recommendations
      );
    }

    if (recommendations.length < MIN_RECOMMENDATIONS) {
      // Nothing was written, so the student keeps whatever they had.
      throw new Error(
        "The career assistant could not produce usable recommendations for that profile. Please try again with a little more detail about your interests and skills."
      );
    }

    /*
     * 4. Replace this student's recommendations without a destructive window.
     *
     * New rows are inserted first and only then are the old ones removed, so a
     * failure mid-way leaves the previous matches intact. The insert is
     * unordered: one bad row must not discard the others.
     */
    const previousSelection = await CareerRecommendation.findOne({ userId, selected: true });
    const previousKey = previousSelection
      ? careerPathKey(previousSelection.careerPath)
      : "";

    const inserted = await CareerRecommendation.insertMany(
      recommendations.map((rec) => ({
        userId,
        careerPath: rec.careerPath,
        matchScore: rec.matchScore,
        reasoning: rec.reasoning,
        // Re-taking the assessment re-words every entry, so the student's
        // chosen path is carried across by matching the career itself —
        // otherwise their roadmap silently loses the path it was built on.
        selected: Boolean(previousKey) && careerPathKey(rec.careerPath) === previousKey,
      })),
      { ordered: false }
    );

    if (!inserted.length) {
      throw new Error("Career recommendations could not be saved. Please try again.");
    }

    const keepIds = inserted.map((doc) => doc._id);
    await CareerRecommendation.deleteMany({
      userId,
      _id: { $nin: keepIds as mongoose.Types.ObjectId[] },
    });

    // Re-checked after the swap: only a recommendation that survived the new
    // set may be the selected one.
    const selectedSurvived = Boolean(previousKey) && inserted.some((doc) => doc.selected);
    if (previousKey && !selectedSurvived) {
      console.warn(
        `[Career] Re-assessment replaced the selected path "${previousSelection?.careerPath}"; the student will choose again.`
      );
    }

    return NextResponse.json({
      message: "Assessment completed successfully",
      recommendations: inserted,
      selectionPreserved: selectedSurvived,
    });
  } catch (error: any) {
    console.error("Assessment route error:", error);
    const status = error?.status as number | undefined;
    const providerMessage =
      error?.error?.message || error?.message || "Internal Server Error";
    const lower = String(providerMessage).toLowerCase();

    if (status === 403 || lower.includes("permission") || lower.includes("无权")) {
      return NextResponse.json(
        {
          message:
            "Your LLM router denied access to the configured model. Check LLM_ROUTER_MODEL / LLM_ROUTER_FALLBACK_MODEL access on your provider, or switch models in .env.local.",
        },
        { status: 502 }
      );
    }

    if (status === 401) {
      return NextResponse.json(
        {
          message:
            "LLM router rejected the API key. Check LLM_ROUTER_API_KEY in .env.local.",
        },
        { status: 502 }
      );
    }

    if (
      status === 429 ||
      lower.includes("insufficient") ||
      lower.includes("quota") ||
      lower.includes("balance")
    ) {
      return NextResponse.json(
        {
          message:
            "LLM router quota/rate limit issue. Wait a moment, top up credits, or switch to a cheaper model in .env.local.",
        },
        { status: status === 429 ? 429 : 502 }
      );
    }

    /*
     * Anything else is reported with its message. A bare "Internal Server
     * Error" left the student — and whoever they asked for help — with nothing
     * to act on.
     */
    return NextResponse.json(
      {
        message:
          error instanceof Error && error.message
            ? error.message
            : "Could not generate career recommendations. Please try again.",
        question: GENERIC_CAREER_QUESTION,
      },
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
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
