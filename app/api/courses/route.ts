import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Course from "@/models/Course";
import CareerRecommendation from "@/models/CareerRecommendation";
import Roadmap from "@/models/Roadmap";
import {
  extractRoadmapTopics,
  fetchCoursesForTopics,
  isLiveYouTubeExternalId,
  roadmapFingerprint,
} from "@/lib/courseProviders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const levelFilter = searchParams.get("level");
    const budgetFilter = searchParams.get("budget");
    const forceRefresh = searchParams.get("refresh") === "1" || searchParams.get("refresh") === "true";

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
    const roadmap = await Roadmap.findOne({ userId, careerPath });

    if (!roadmap || !Array.isArray(roadmap.stages) || roadmap.stages.length === 0) {
      return NextResponse.json(
        {
          message: "No roadmap found for your career path. Generate a roadmap first.",
          code: "NO_ROADMAP",
        },
        { status: 404 }
      );
    }

    const hash = `${roadmapFingerprint(careerPath, roadmap.stages)}:yt3`;

    let courses = await Course.find({
      userId,
      careerPath,
      roadmapHash: hash,
    });

    const youtubeEnabled = Boolean(process.env.YOUTUBE_API_KEY?.trim());
    // Live videos use externalId "youtube:<videoId>"; search deep-links use "youtube-search:...".
    const cachedHasLiveYouTube = courses.some((c) =>
      isLiveYouTubeExternalId(c.externalId)
    );
    // Re-fetch when the YouTube key is available but cache has no real video results yet.
    const needsRefresh =
      forceRefresh ||
      courses.length === 0 ||
      (youtubeEnabled && !cachedHasLiveYouTube);

    if (needsRefresh) {
      const topics = extractRoadmapTopics(roadmap.stages, careerPath);
      const live = await fetchCoursesForTopics(topics);

      if (live.length === 0) {
        return NextResponse.json(
          { message: "No courses found for your roadmap topics. Try refreshing later." },
          { status: 502 }
        );
      }

      // Replace cached recommendations for this user + roadmap version.
      await Course.deleteMany({ userId, careerPath });

      const docs = live.map((c) => ({
        title: c.title,
        platform: c.platform,
        url: c.url,
        careerPath,
        skillLevel: c.skillLevel,
        isFree: c.isFree,
        rating: c.rating,
        sourceTopic: c.sourceTopic,
        thumbnailUrl: c.thumbnailUrl,
        externalId: c.externalId,
        roadmapHash: hash,
        userId,
        fetchedAt: new Date(),
      }));

      courses = await Course.insertMany(docs);
    }

    const query: Record<string, unknown> = {
      userId,
      careerPath,
      roadmapHash: hash,
    };

    if (levelFilter && levelFilter !== "all") {
      query.skillLevel = levelFilter;
    }
    if (budgetFilter === "free") {
      query.isFree = true;
    } else if (budgetFilter === "paid") {
      query.isFree = false;
    }

    const topics = extractRoadmapTopics(roadmap.stages, careerPath);
    const topicOrder = topics.map((t) => t.milestoneTitle);
    const topicRank = new Map(topicOrder.map((title, i) => [title, i]));
    const levelRank: Record<string, number> = {
      beginner: 0,
      intermediate: 1,
      advanced: 2,
    };

    const filteredCourses = await Course.find(query);
    // Keep roadmap sequence: beginner → intermediate → advanced, milestone order,
    // then prefer live YouTube, then other free/video hits, then by rating.
    filteredCourses.sort((a, b) => {
      const aTopic = a.sourceTopic || "";
      const bTopic = b.sourceTopic || "";
      const aIdx = topicRank.has(aTopic)
        ? (topicRank.get(aTopic) as number)
        : 1000 + (levelRank[a.skillLevel] ?? 9);
      const bIdx = topicRank.has(bTopic)
        ? (topicRank.get(bTopic) as number)
        : 1000 + (levelRank[b.skillLevel] ?? 9);
      if (aIdx !== bIdx) return aIdx - bIdx;

      const aLive = isLiveYouTubeExternalId(a.externalId) ? 0 : 1;
      const bLive = isLiveYouTubeExternalId(b.externalId) ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;

      const aYt = a.platform === "YouTube" ? 0 : 1;
      const bYt = b.platform === "YouTube" ? 0 : 1;
      if (aYt !== bYt) return aYt - bYt;

      return (b.rating || 0) - (a.rating || 0);
    });

    const youtubeCount = filteredCourses.filter((c) => c.platform === "YouTube").length;
    const liveYouTubeCount = filteredCourses.filter((c) =>
      isLiveYouTubeExternalId(c.externalId)
    ).length;

    return NextResponse.json({
      courses: filteredCourses,
      meta: {
        careerPath,
        roadmapHash: hash,
        source: needsRefresh ? "live" : "cache",
        youtubeEnabled,
        youtubeCount,
        liveYouTubeCount,
        topicCount: topics.length,
        topicOrder,
      },
    });
  } catch (error: any) {
    console.error("Courses route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
