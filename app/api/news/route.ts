import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import News from "@/models/News";
import UserProfile from "@/models/UserProfile";
import CareerRecommendation from "@/models/CareerRecommendation";
import { fetchAndCacheNews, isCacheStale } from "@/lib/newsFetcher";
import { escapeRegExp } from "@/lib/security";
import {
  articleMatchesDomain,
  articleMatchesNiche,
  domainNewsMatchers,
  getDomainConfig,
  inferCareerDomain,
  isCareerDomain,
  type CareerDomain,
} from "@/lib/careerDomains";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function resolveDomain(
  userId: string,
  domainParam: string | null
): Promise<{ domainId: CareerDomain; niche: string; careerPath: string }> {
  if (isCareerDomain(domainParam)) {
    const profile = await UserProfile.findOne({ userId }).select("careerNiche");
    const selected = await CareerRecommendation.findOne({ userId, selected: true }).select(
      "careerPath"
    );
    return {
      domainId: domainParam,
      niche: profile?.careerNiche || "",
      careerPath: selected?.careerPath || "",
    };
  }

  const [profile, selected] = await Promise.all([
    UserProfile.findOne({ userId }).select("careerDomain careerNiche interests subjects goals"),
    CareerRecommendation.findOne({ userId, selected: true }).select("careerPath"),
  ]);

  const inferred = inferCareerDomain({
    interests: profile?.interests,
    subjects: profile?.subjects,
    goals: profile?.goals,
    careerPath: selected?.careerPath,
  });

  if (profile && profile.careerDomain !== inferred) {
    await UserProfile.updateOne({ userId }, { careerDomain: inferred });
  }

  return {
    domainId: inferred,
    niche: profile?.careerNiche || "",
    careerPath: selected?.careerPath || "",
  };
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const tag = url.searchParams.get("tag");
    const q = url.searchParams.get("q");
    const refresh = url.searchParams.get("refresh");
    const domainParam = url.searchParams.get("domain");
    const allDomains = url.searchParams.get("all") === "1";

    await dbConnect();

    const { domainId, niche, careerPath } = await resolveDomain(
      session.user.id,
      domainParam
    );
    const domain = getDomainConfig(domainId);

    const stale = await isCacheStale(News);
    if (stale || refresh === "true") {
      console.log("[News API] Cache is stale or refresh requested — fetching fresh news...");
      try {
        await fetchAndCacheNews(News);
      } catch (fetchErr: any) {
        console.error("[News API] Fetch error (serving stale cache):", fetchErr.message);
      }
    }

    const query: Record<string, unknown> = {};

    if (tag) {
      query.tags = { $regex: new RegExp(`^${escapeRegExp(tag)}$`, "i") };
    }

    if (q) {
      const safeQ = escapeRegExp(q);
      query.$or = [
        { title: { $regex: safeQ, $options: "i" } },
        { summary: { $regex: safeQ, $options: "i" } },
        { content: { $regex: safeQ, $options: "i" } },
      ];
    }

    // Pull a wider pool, then keep only on-domain articles in app logic
    const pool = await News.find(query).sort({ publishedAt: -1 }).limit(120).lean();

    const trustedSources = new Set(
      domain.newsFeeds.map((f) => f.source.toLowerCase())
    );

    let filtered: typeof pool;

    if (allDomains) {
      filtered = pool;
    } else if (domainId === "design" || domainId === "education" || domainId === "science") {
      // Prefer configured feeds for these domains (shared crawl is noisy)
      filtered = pool.filter((item) =>
        trustedSources.has(String(item.source || "").toLowerCase())
      );
    } else if (domainId === "other") {
      filtered = pool.filter((item) => {
        const source = String(item.source || "").toLowerCase();
        if (trustedSources.has(source)) return true;
        return articleMatchesNiche(
          {
            title: item.title,
            summary: item.summary,
            tags: item.tags,
            source: item.source,
          },
          niche,
          careerPath
        );
      });
    } else if (domainId === "technology" || domainId === "engineering") {
      filtered = pool.filter((item) =>
        articleMatchesDomain(
          {
            title: item.title,
            summary: item.summary,
            tags: item.tags,
            source: item.source,
          },
          domainId
        )
      );
    } else {
      filtered = pool.filter((item) => {
        const source = String(item.source || "").toLowerCase();
        if (trustedSources.has(source)) return true;
        const text = `${item.title || ""} ${item.summary || ""}`.toLowerCase();
        return domainNewsMatchers(domainId).includeKeywords.some((kw) => {
          if (kw.trim().length < 4) return false;
          const escaped = kw.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          return new RegExp(`(?:^|[^a-z])${escaped}`, "i").test(text);
        });
      });
    }

    if (!allDomains && filtered.length === 0) {
      filtered = pool.filter((item) =>
        trustedSources.has(String(item.source || "").toLowerCase())
      );
    }

    const newsItems = filtered.slice(0, 50);

    return NextResponse.json({
      domain: domainId,
      domainLabel: domain.label,
      articles: newsItems,
    });
  } catch (error) {
    console.error("News GET route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
