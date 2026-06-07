import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import { generateStructuredJson } from "@/lib/llm";
import { resumeToPlainText } from "@/lib/resume";
import { extractTextFromPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

interface AtsAnalysisResult {
  matchScore: number;
  keywordMatching: {
    score: number;
    matched: string[];
    missing: string[];
  };
  formatting: {
    score: number;
    feedback: string[];
  };
  readability: {
    score: number;
    feedback: string[];
  };
  impact: {
    score: number;
    feedback: string[];
  };
  recommendedEdits: string[];
  summary: string;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let resumeText = "";
    let jobDescription = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      jobDescription = (formData.get("jobDescription") as string) || "";
      const resumeId = formData.get("resumeId") as string;
      const rawText = formData.get("resumeText") as string;
      const file = formData.get("file") as File;

      if (resumeId) {
        await dbConnect();
        const resume = await Resume.findOne({ _id: resumeId, userId: session.user.id });
        if (resume) {
          resumeText = resumeToPlainText(resume.content);
        }
      } else if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        try {
          resumeText = await extractTextFromPdf(buffer, file.name);
        } catch (parseError: any) {
          return NextResponse.json(
            { message: `Failed to parse PDF resume: ${parseError.message || parseError}` },
            { status: 422 }
          );
        }
      } else if (rawText) {
        resumeText = rawText;
      }
    } else {
      // JSON request
      const body = await req.json().catch(() => ({}));
      jobDescription = body.jobDescription || "";
      const resumeId = body.resumeId;
      const rawText = body.resumeText;

      if (resumeId) {
        await dbConnect();
        const resume = await Resume.findOne({ _id: resumeId, userId: session.user.id });
        if (resume) {
          resumeText = resumeToPlainText(resume.content);
        }
      } else if (rawText) {
        resumeText = rawText;
      }
    }

    if (!resumeText.trim()) {
      return NextResponse.json({ message: "Resume content is empty. Please select a resume, upload a PDF, or paste text." }, { status: 400 });
    }

    if (!jobDescription.trim()) {
      return NextResponse.json({ message: "Job Description is required for ATS matching analysis." }, { status: 400 });
    }

    // Truncate inputs to prevent excessive token usage
    const truncatedResume = resumeText.substring(0, 15000);
    const truncatedJd = jobDescription.substring(0, 15000);

    const systemPrompt = `You are an expert Applicant Tracking System (ATS) optimization tool and recruiter.
Analyze the provided resume against the job description and output a highly detailed, professional analysis.
Return your response ONLY as a JSON object matching this exact structure:
{
  "matchScore": 0,
  "keywordMatching": {
    "score": 0,
    "matched": ["keyword"],
    "missing": ["keyword"]
  },
  "formatting": {
    "score": 0,
    "feedback": ["feedback point"]
  },
  "readability": {
    "score": 0,
    "feedback": ["feedback point"]
  },
  "impact": {
    "score": 0,
    "feedback": ["feedback point"]
  },
  "recommendedEdits": ["action item"],
  "summary": "overall summary of match alignment"
}

All scores must be integers between 0 and 100. Be honest, professional, and constructive in the feedback.`;

    const userPrompt = `RESUME:
${truncatedResume}

JOB DESCRIPTION:
${truncatedJd}

Compare the resume against the job description. Evaluate keyword density/coverage, format, readability, and outcome/impact metrics.`;

    const result = await generateStructuredJson<AtsAnalysisResult>(systemPrompt, userPrompt, true);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("ATS Analyzer API Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
