import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobListing from "@/models/JobListing";
import UserProfile from "@/models/UserProfile";
import { escapeRegExp } from "@/lib/security";

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
      const safeSearch = escapeRegExp(search);
      query.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { company: { $regex: safeSearch, $options: "i" } },
        { skills: { $regex: safeSearch, $options: "i" } }
      ];
    }

    let localListings = await JobListing.find(query).sort({ postedDate: -1 }).lean();

    // Fetch live job postings from Arbeitnow & Remotive APIs in parallel
    let liveListings: any[] = [];
    
    const fetchArbeitnow = async () => {
      try {
        let arbeitnowUrl = "https://www.arbeitnow.com/api/job-board-api";
        if (search) {
          arbeitnowUrl += `?search=${encodeURIComponent(search)}`;
        }
        const response = await fetch(arbeitnowUrl, { next: { revalidate: 60 } });
        if (response.ok) {
          const json = await response.json();
          if (json && Array.isArray(json.data)) {
            return json.data.slice(0, 10).map((item: any) => {
              const cleanDesc = item.description 
                ? item.description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s\s+/g, " ").trim()
                : "";

              const isIntern = item.title.toLowerCase().includes("intern") || 
                               item.title.toLowerCase().includes("werkstudent") || 
                               item.title.toLowerCase().includes("student");
              
              let jobTypeEnum = "full-time";
              if (isIntern) {
                jobTypeEnum = "internship";
              } else if (Array.isArray(item.job_types) && item.job_types.length > 0) {
                const mainType = item.job_types[0].toLowerCase();
                if (mainType.includes("part")) jobTypeEnum = "part-time";
                else if (mainType.includes("contract")) jobTypeEnum = "contract";
                else if (mainType.includes("intern")) jobTypeEnum = "internship";
              }

              return {
                _id: `arbeitnow-${item.slug}`,
                title: item.title || "Software Engineer",
                company: item.company_name || "Tech Company",
                type: jobTypeEnum,
                location: item.location || "Remote",
                remote: !!item.remote,
                description: cleanDesc.length > 180 ? cleanDesc.substring(0, 180) + "..." : cleanDesc,
                requirements: [],
                skills: Array.isArray(item.tags) ? item.tags : ["Technology"],
                applyUrl: item.url || "https://www.arbeitnow.com",
              };
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch live listings from Arbeitnow:", err);
      }
      return [];
    };

    const fetchRemotive = async () => {
      try {
        let remotiveUrl = "https://remotive.com/api/remote-jobs";
        if (search) {
          remotiveUrl += `?search=${encodeURIComponent(search)}`;
        }
        const response = await fetch(remotiveUrl, { next: { revalidate: 60 } });
        if (response.ok) {
          const json = await response.json();
          if (json && Array.isArray(json.jobs)) {
            return json.jobs.slice(0, 10).map((item: any) => {
              const cleanDesc = item.description 
                ? item.description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s\s+/g, " ").trim()
                : "";

              const isIntern = item.title.toLowerCase().includes("intern") || 
                               item.title.toLowerCase().includes("werkstudent") || 
                               item.title.toLowerCase().includes("student") ||
                               (item.job_type && item.job_type.toLowerCase().includes("intern"));
              
              let jobTypeEnum = "full-time";
              if (isIntern) {
                jobTypeEnum = "internship";
              } else if (item.job_type) {
                const jt = item.job_type.toLowerCase();
                if (jt.includes("part")) jobTypeEnum = "part-time";
                else if (jt.includes("contract")) jobTypeEnum = "contract";
                else if (jt.includes("intern")) jobTypeEnum = "internship";
              }

              return {
                _id: `remotive-${item.id}`,
                title: item.title || "Software Engineer",
                company: item.company_name || "Tech Company",
                type: jobTypeEnum,
                location: item.candidate_required_location || "Remote",
                remote: true,
                description: cleanDesc.length > 180 ? cleanDesc.substring(0, 180) + "..." : cleanDesc,
                requirements: [],
                skills: Array.isArray(item.tags) ? item.tags : ["Technology"],
                applyUrl: item.url || "https://remotive.com",
              };
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch live listings from Remotive:", err);
      }
      return [];
    };

    try {
      const [arbeitnowResults, remotiveResults] = await Promise.allSettled([
        fetchArbeitnow(),
        fetchRemotive()
      ]);
      
      const aJobs = arbeitnowResults.status === "fulfilled" ? arbeitnowResults.value : [];
      const rJobs = remotiveResults.status === "fulfilled" ? remotiveResults.value : [];
      
      liveListings = [...aJobs, ...rJobs];
    } catch (err) {
      console.error("Failed to perform parallel fetches for jobs:", err);
    }

    const combinedListings = [...localListings, ...liveListings];

    // Apply job type filters if set
    let filteredListings = combinedListings;
    if (type) {
      filteredListings = combinedListings.filter((job) => job.type === type);
    }

    // Fetch user profile skills
    const userSkills = profile?.skills?.map((s: any) => s.name.toLowerCase()) || [];

    // Inject Match Score based on profile skills
    const listingsWithScores = filteredListings.map((job: any) => {
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

    // Custom sorting: If careerPath exists, bubble matching career path jobs to the top
    let sortedListings = listingsWithScores;
    if (careerPath) {
      const regex = new RegExp(careerPath, "i");
      sortedListings = listingsWithScores.sort((a: any, b: any) => {
        const aMatches = a.title?.match(regex) || a.skills?.some((p: string) => regex.test(p));
        const bMatches = b.title?.match(regex) || b.skills?.some((p: string) => regex.test(p));
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return 0;
      });
    }

    return NextResponse.json(sortedListings);
  } catch (error: any) {
    console.error("Jobs API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
