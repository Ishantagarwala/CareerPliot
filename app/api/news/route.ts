import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import News from "@/models/News";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tag = url.searchParams.get("tag");
    const q = url.searchParams.get("q");

    await dbConnect();

    const query: any = {};

    if (tag) {
      // Filter by tag case-insensitively
      query.tags = { $regex: new RegExp(`^${tag}$`, "i") };
    }

    if (q) {
      // Simple keyword match in title, summary, or content
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { summary: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } }
      ];
    }

    const newsItems = await News.find(query).sort({ publishedAt: -1 });

    return NextResponse.json(newsItems);
  } catch (error: any) {
    console.error("News GET route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
