import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import { buildJdMatchPrompts, resumeToPlainText } from "@/lib/resume";
import { generateStructuredJson } from "@/lib/llm";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface JdMatch {
  matchScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendedEdits: string[];
  summary: string;
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { jobDescription } = await req.json();

    if (!jobDescription || !jobDescription.trim()) {
      return NextResponse.json({ message: "Job description is required" }, { status: 400 });
    }

    await dbConnect();
    const resume = await Resume.findOne({ _id: id, userId: session.user.id });

    if (!resume) {
      return NextResponse.json({ message: "Resume not found" }, { status: 404 });
    }

    const resumeText = resumeToPlainText(resume.content);
    const { systemPrompt, userPrompt } = buildJdMatchPrompts(resumeText, jobDescription);
    const match = await generateStructuredJson<JdMatch>(systemPrompt, userPrompt);

    return NextResponse.json(match);
  } catch (error: any) {
    console.error("Resume JD match error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
