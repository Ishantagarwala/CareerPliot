import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import UserProfile from "@/models/UserProfile";
import CareerRecommendation from "@/models/CareerRecommendation";
import { generateStructuredJson } from "@/lib/llm";
import { enforceLlmBudget } from "@/lib/llmGuard";
import { getClientIp, rateLimit } from "@/lib/security";
import {
  getDomainConfig,
  inferCareerDomain,
  isCareerDomain,
  type CareerDomain,
} from "@/lib/careerDomains";

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
    const ip = getClientIp(req);

    if (!rateLimit(`career-assess:ip:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { message: "Too many assessment requests from this network." },
        { status: 429 }
      );
    }

    const limited = enforceLlmBudget(userId, "career-assess", 5);
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
Analyze the student's profile and recommend the top 3 best-fitting career paths.

Rules:
- Prefer careers inside ${domain.label}${nicheText ? ` / "${nicheText}"` : ""}, unless the profile clearly points elsewhere — then include at most one adjacent path with clear reasoning.
- Prefer concrete, recognizable career titles over vague labels.
- Never invent awkward hybrid titles that mash unrelated fields (e.g. "Health Educator DevOps").
- Diversify specialization or seniority across the three recommendations when staying in-domain.
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

Analyze this profile and generate 3 recommendations for the ${domain.label} domain${nicheText ? ` with niche "${nicheText}"` : ""} unless the profile strongly requires otherwise.`;

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

    return NextResponse.json(
      { message: "Internal Server Error" },
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
