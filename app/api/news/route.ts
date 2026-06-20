import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import News from "@/models/News";
import { fetchAndCacheNews, isCacheStale } from "@/lib/newsFetcher";
import { escapeRegExp } from "@/lib/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    await dbConnect();

    // Check if we need to refresh the cache
    const stale = await isCacheStale(News);
    if (stale || refresh === "true") {
      console.log("[News API] Cache is stale or refresh requested — fetching fresh news...");
      try {
        await fetchAndCacheNews(News);
      } catch (fetchErr: any) {
        console.error("[News API] Fetch error (serving stale cache):", fetchErr.message);
        // Continue — serve whatever we have in the DB
      }
    }

    const query: any = {};

    if (tag) {
      // Filter by tag case-insensitively (escaped to prevent ReDoS)
      query.tags = { $regex: new RegExp(`^${escapeRegExp(tag)}$`, "i") };
    }

    if (q) {
      // Simple keyword match in title, summary, or content (escaped)
      const safeQ = escapeRegExp(q);
      query.$or = [
        { title: { $regex: safeQ, $options: "i" } },
        { summary: { $regex: safeQ, $options: "i" } },
        { content: { $regex: safeQ, $options: "i" } }
      ];
    }

    const newsItems = await News.find(query)
      .sort({ publishedAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(newsItems);
  } catch (error) {
    console.error("News GET route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
