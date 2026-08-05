import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateStructuredJson } from "@/lib/llm";
import { enforceLlmBudget } from "@/lib/llmGuard";
import { getClientIp, rateLimit } from "@/lib/security";

interface NicheCatalog {
  interests: string[];
  subjects: string[];
  skills: string[];
  jobQuery: string;
  newsKeywords: string[];
}

/**
 * Phase 3: generate assessment chips + search hints for a free-text niche career.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    if (!rateLimit(`niche-catalog:ip:${ip}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json(
        { message: "Too many niche catalog requests from this network." },
        { status: 429 }
      );
    }

    const limited = enforceLlmBudget(session.user.id, "niche-catalog", 8);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const niche = String(body.niche || "").trim();
    if (niche.length < 3) {
      return NextResponse.json(
        { message: "Describe your niche career in at least 3 characters." },
        { status: 400 }
      );
    }

    const systemPrompt = `You help students explore niche careers outside common tracks.
Given a niche career description, return ONLY JSON:
{
  "interests": ["8 short interest chips relevant to this niche"],
  "subjects": ["8 academic or vocational subjects for this niche"],
  "skills": ["8 starter skills for this niche"],
  "jobQuery": "a short job-search query string for India/entry-level roles",
  "newsKeywords": ["5-8 keywords useful for filtering career news"]
}
Keep labels concise (2-5 words). Do not invent software/tech chips unless the niche is tech.`;

    const userPrompt = `Niche career: ${niche}\n\nGenerate the catalog JSON.`;

    const catalog = await generateStructuredJson<NicheCatalog>(systemPrompt, userPrompt);

    return NextResponse.json({
      niche,
      interests: Array.isArray(catalog?.interests) ? catalog.interests.slice(0, 12) : [],
      subjects: Array.isArray(catalog?.subjects) ? catalog.subjects.slice(0, 12) : [],
      skills: Array.isArray(catalog?.skills) ? catalog.skills.slice(0, 12) : [],
      jobQuery: typeof catalog?.jobQuery === "string" ? catalog.jobQuery : niche,
      newsKeywords: Array.isArray(catalog?.newsKeywords) ? catalog.newsKeywords.slice(0, 10) : [],
    });
  } catch (error: any) {
    console.error("Niche catalog error:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to generate niche catalog" },
      { status: 500 }
    );
  }
}
