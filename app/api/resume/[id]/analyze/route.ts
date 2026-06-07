import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import { buildAtsAnalysisPrompts, resumeToPlainText } from "@/lib/resume";
import { generateStructuredJson } from "@/lib/llm";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface AtsAnalysis {
  score: number;
  keywordDensity: number;
  formatting: number;
  readability: number;
  impact: number;
  strengths: string[];
  suggestions: string[];
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    const resume = await Resume.findOne({ _id: id, userId: session.user.id });

    if (!resume) {
      return NextResponse.json({ message: "Resume not found" }, { status: 404 });
    }

    const resumeText = resumeToPlainText(resume.content);
    if (!resumeText.trim()) {
      return NextResponse.json({ message: "Resume content is empty" }, { status: 400 });
    }

    const { systemPrompt, userPrompt } = buildAtsAnalysisPrompts(resumeText);
    const analysis = await generateStructuredJson<AtsAnalysis>(systemPrompt, userPrompt);

    resume.atsAnalysis = {
      score: analysis.score,
      keywordDensity: analysis.keywordDensity,
      formatting: analysis.formatting,
      readability: analysis.readability,
      impact: analysis.impact,
      strengths: analysis.strengths || [],
      suggestions: analysis.suggestions || [],
      analyzedAt: new Date(),
    };

    await resume.save();

    return NextResponse.json(resume.atsAnalysis);
  } catch (error: any) {
    console.error("Resume ATS analysis error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
