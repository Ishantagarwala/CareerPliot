import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import ProjectIdea from "@/models/ProjectIdea";
import Hackathon from "@/models/Hackathon";
import UserProfile from "@/models/UserProfile";
import { generateStructuredJson } from "@/lib/llm";

export const dynamic = "force-dynamic";

interface GeneratedProject {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  careerPaths: string[];
  technologies: string[];
  estimatedTime: string;
  features: string[];
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode"); // 'ideas' or 'hackathons'

    if (mode === "hackathons") {
      const hackathons = await Hackathon.find({}).sort({ startDate: 1 }).lean();
      return NextResponse.json(hackathons);
    }

    // Default to listing ideas
    const ideas = await ProjectIdea.find({
      $or: [
        { userId: session.user.id },
        { userId: { $exists: false } },
        { userId: null }
      ]
    }).sort({ createdAt: -1 }).lean();

    return NextResponse.json(ideas);
  } catch (error: any) {
    console.error("Projects GET API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Fetch user's career path
    const profile = await UserProfile.findOne({ userId: session.user.id });
    const careerPath = profile?.interests?.[0] || "Full-Stack Web Developer";

    const systemPrompt = `You are a practical career development advisor AI. Your task is to generate exactly 3 unique, relevant, and engaging project ideas tailored to a student's chosen career path.

Return your response ONLY as a JSON array matching this schema:
[
  {
    "title": "Project Title",
    "description": "A detailed description of the project and its learning value.",
    "difficulty": "beginner" | "intermediate" | "advanced",
    "careerPaths": ["Career Path Name"],
    "technologies": ["Tech 1", "Tech 2", "Tech 3"],
    "estimatedTime": "e.g., 2 weeks, 1 month",
    "features": ["Core feature 1", "Core feature 2", "Core feature 3"]
  }
]`;

    const userPrompt = `Career Path: ${careerPath}`;

    const rawResponse = await generateStructuredJson<GeneratedProject[]>(systemPrompt, userPrompt);

    if (!Array.isArray(rawResponse)) {
      throw new Error("LLM failed to return a JSON array");
    }

    const savedProjects = [];
    for (const project of rawResponse) {
      const newIdea = new ProjectIdea({
        ...project,
        isAIGenerated: true,
        userId: session.user.id,
      });
      await newIdea.save();
      savedProjects.push(newIdea);
    }

    return NextResponse.json(savedProjects);
  } catch (error: any) {
    console.error("Projects POST API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
