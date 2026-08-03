import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobListing from "@/models/JobListing";
import UserProfile from "@/models/UserProfile";
import CareerRecommendation from "@/models/CareerRecommendation";
import { escapeRegExp } from "@/lib/security";
import { buildJobQuery, fetchLiveJobs } from "@/lib/jobProviders";
import { resolveCompanyLogo } from "@/lib/imageUrl";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const profile = await UserProfile.findOne({ userId: session.user.id }).lean();
    const selectedCareer = await CareerRecommendation.findOne({
      userId: session.user.id,
      selected: true,
    }).lean();

    const careerPath =
      selectedCareer?.careerPath ||
      profile?.interests?.[0] ||
      null;

    const userSkills: string[] =
      profile?.skills?.map((s: any) => String(s.name || "").toLowerCase()).filter(Boolean) || [];

    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const search = url.searchParams.get("search");
    const location = url.searchParams.get("location") || undefined;

    const queryText = buildJobQuery({
      search,
      careerPath,
      skills: userSkills,
    });

    // Optional local seed listings (Mongo) — kept as a fallback supplement.
    const mongoQuery: Record<string, unknown> = {};
    if (type && type !== "all") mongoQuery.type = type;
    if (search) {
      const safeSearch = escapeRegExp(search);
      mongoQuery.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { company: { $regex: safeSearch, $options: "i" } },
        { skills: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const localListings = await JobListing.find(mongoQuery)
      .sort({ postedDate: -1 })
      .limit(20)
      .lean();

    const localMapped = localListings.map((job: any) => ({
      ...job,
      _id: String(job._id),
      source: "Career Pilot",
      companyLogo: resolveCompanyLogo(job.companyLogo, job.company || "Company"),
      skills: Array.isArray(job.skills) ? job.skills : [],
      requirements: Array.isArray(job.requirements) ? job.requirements : [],
    }));

    const { jobs: liveJobs, sources, enabled } = await fetchLiveJobs({
      query: queryText,
      type: type && type !== "all" ? type : null,
      location,
      limitPerSource: 12,
    });

    const liveNormalized = liveJobs.map((job) => ({
      ...job,
      companyLogo: resolveCompanyLogo(job.companyLogo, job.company),
    }));

    const combined = [...liveNormalized, ...localMapped];

    const scored = combined.map((job: any) => {
      const jobSkills = Array.isArray(job.skills) ? job.skills : [];
      if (jobSkills.length === 0) {
        // Soft boost when title overlaps career path / query terms.
        const hay = `${job.title || ""} ${job.description || ""}`.toLowerCase();
        const tokens = queryText.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
        const hits = tokens.filter((t) => hay.includes(t)).length;
        const soft = Math.min(92, 62 + hits * 6);
        return { ...job, matchScore: soft, matchedSkills: [] as string[] };
      }

      const matched = jobSkills.filter((s: string) =>
        userSkills.includes(String(s).toLowerCase())
      );
      const score = Math.round(55 + (matched.length / Math.max(jobSkills.length, 1)) * 45);
      return {
        ...job,
        matchScore: score,
        matchedSkills: matched,
      };
    });

    // Prefer career-path relevance, then match score.
    const careerRegex = careerPath ? new RegExp(escapeRegExp(careerPath), "i") : null;
    scored.sort((a: any, b: any) => {
      if (careerRegex) {
        const aHit =
          careerRegex.test(a.title || "") ||
          (Array.isArray(a.skills) && a.skills.some((s: string) => careerRegex.test(s)));
        const bHit =
          careerRegex.test(b.title || "") ||
          (Array.isArray(b.skills) && b.skills.some((s: string) => careerRegex.test(s)));
        if (aHit && !bHit) return -1;
        if (!aHit && bHit) return 1;
      }
      return (b.matchScore || 0) - (a.matchScore || 0);
    });

    return NextResponse.json({
      jobs: scored,
      meta: {
        query: queryText,
        careerPath,
        count: scored.length,
        sources,
        enabledProviders: enabled,
        note:
          !process.env.RAPIDAPI_KEY?.trim()
            ? "Add RAPIDAPI_KEY for JSearch (LinkedIn/Indeed/Glassdoor). LinkedIn has no public jobs API."
            : undefined,
      },
    });
  } catch (error: any) {
    console.error("Jobs API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
