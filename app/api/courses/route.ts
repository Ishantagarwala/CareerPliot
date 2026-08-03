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

    const hash = `${roadmapFingerprint(careerPath, roadmap.stages)}:yt2`;

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

    const filteredCourses = await Course.find(query).sort({ rating: -1, skillLevel: 1 });
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
        topicCount: extractRoadmapTopics(roadmap.stages, careerPath).length,
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
