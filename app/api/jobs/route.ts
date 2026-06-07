import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobListing from "@/models/JobListing";
import UserProfile from "@/models/UserProfile";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    // Check if user has an active career path to prioritize matches
    const profile = await UserProfile.findOne({ userId: session.user.id });
    const careerPath = profile?.interests?.[0]; // or matching career path logic

    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // internship, full-time, etc.
    const search = url.searchParams.get("search");

    const query: any = {};
    if (type) {
      query.type = type;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { skills: { $regex: search, $options: "i" } }
      ];
    }

    let listings = await JobListing.find(query).sort({ postedDate: -1 }).lean();

    // Custom sorting: If careerPath exists, bubble matching career path jobs to the top
    if (careerPath) {
      const regex = new RegExp(careerPath, "i");
      listings = listings.sort((a: any, b: any) => {
        const aMatches = a.careerPaths?.some((p: string) => regex.test(p));
        const bMatches = b.careerPaths?.some((p: string) => regex.test(p));
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return 0;
      });
    }

    // Fetch user profile skills
    const userSkills = profile?.skills?.map((s: any) => s.name.toLowerCase()) || [];

    // Inject Match Score based on profile skills
    const listingsWithScores = listings.map((job: any) => {
      const jobSkills = Array.isArray(job.skills) ? job.skills : [];
      if (jobSkills.length === 0) {
        return { ...job, matchScore: 75, matchedSkills: [] };
      }

      const matched = jobSkills.filter((s: string) => userSkills.includes(s.toLowerCase()));
      // Base score is 60%, scaling to 100% depending on skills match fraction
      const score = Math.round(60 + (matched.length / jobSkills.length) * 40);

      return {
        ...job,
        matchScore: score,
        matchedSkills: matched,
      };
    });

    return NextResponse.json(listingsWithScores);
  } catch (error: any) {
    console.error("Jobs API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
