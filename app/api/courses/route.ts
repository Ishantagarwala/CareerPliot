import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Course from "@/models/Course";
import CareerRecommendation from "@/models/CareerRecommendation";
import { generateStructuredJson } from "@/lib/llm";

interface LlmCourse {
  title: string;
  platform: string;
  url: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  isFree: boolean;
  rating: number;
}

interface LlmCourseResponse {
  courses: LlmCourse[];
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse query params
    const { searchParams } = new URL(req.url);
    const levelFilter = searchParams.get("level"); // 'beginner' | 'intermediate' | 'advanced'
    const budgetFilter = searchParams.get("budget"); // 'free' | 'paid' | 'all'

    await dbConnect();

    // Find selected career path
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

    // Check if courses already exist for this careerPath in our catalog
    let courses = await Course.find({ careerPath });

    // If no courses exist in catalog, generate 6 high-quality courses via LLM
    if (courses.length === 0) {
      const systemPrompt = `You are an education consultant cataloging professional courses. Recommend 6 real, highly rated courses available online (on platforms like Coursera, Udemy, edX, LinkedIn Learning, or YouTube) that help a student learn skills for the specified career.
Make sure to provide exactly 2 beginner, 2 intermediate, and 2 advanced courses. Ensure some courses are free and some are paid.
Return your response ONLY as a JSON object matching this structure:
{
  "courses": [
    {
      "title": "Accurate Course Title",
      "platform": "Platform Name",
      "url": "https://www.coursera.org/search?query=...", // Use a realistic search or direct course URL
      "skillLevel": "beginner", // Must be exactly: beginner, intermediate, or advanced
      "isFree": true, // true or false
      "rating": 4.8 // Decimal score between 4.0 and 5.0
    }
  ]
}`;

      const userPrompt = `Career Path: ${careerPath}`;

      const llmResult = await generateStructuredJson<LlmCourseResponse>(systemPrompt, userPrompt);

      if (llmResult && llmResult.courses && Array.isArray(llmResult.courses)) {
        const coursesToSave = llmResult.courses.map((c) => ({
          title: c.title,
          platform: c.platform,
          url: c.url,
          careerPath,
          skillLevel: c.skillLevel,
          isFree: c.isFree,
          rating: c.rating,
        }));

        courses = await Course.insertMany(coursesToSave);
      }
    }

    // Apply filters on the retrieved list in MongoDB
    const query: any = { careerPath };
    
    if (levelFilter && levelFilter !== "all") {
      query.skillLevel = levelFilter;
    }
    
    if (budgetFilter === "free") {
      query.isFree = true;
    } else if (budgetFilter === "paid") {
      query.isFree = false;
    }

    const filteredCourses = await Course.find(query).sort({ rating: -1 });

    return NextResponse.json(filteredCourses);
  } catch (error: any) {
    console.error("Courses route error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
