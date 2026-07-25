import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import {
  buildHackerRankAnalysisPrompts,
  normalizeHackerRankAnalysis,
  resumeToPlainText,
  type HackerRankAnalysis,
} from "@/lib/resume";
import { generateStructuredJson } from "@/lib/llm";

interface RouteContext {
  params: Promise<{ id: string }>;
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

    const { systemPrompt, userPrompt } = buildHackerRankAnalysisPrompts(resumeText);
    const raw = await generateStructuredJson<HackerRankAnalysis>(systemPrompt, userPrompt);
    const analysis = normalizeHackerRankAnalysis(raw);

    resume.atsAnalysis = {
      score: analysis.score,
      openSource: analysis.openSource,
      selfProjects: analysis.selfProjects,
      production: analysis.production,
      technicalSkills: analysis.technicalSkills,
      bonus: analysis.bonus,
      deductions: analysis.deductions,
      tier: analysis.tier,
      evidence: analysis.evidence,
      bonusItems: analysis.bonusItems,
      deductionItems: analysis.deductionItems,
      summary: analysis.summary,
      strengths: analysis.strengths,
      suggestions: analysis.suggestions,
      analyzedAt: new Date(),
    };

    await resume.save();

    return NextResponse.json(resume.atsAnalysis);
  } catch (error: any) {
    console.error("Resume HackerRank analysis error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
