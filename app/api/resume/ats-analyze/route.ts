import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import { generateStructuredJson } from "@/lib/llm";
import {
  buildHackerRankAnalysisPrompts,
  normalizeHackerRankAnalysis,
  resumeToPlainText,
  type HackerRankAnalysis,
} from "@/lib/resume";
import { extractTextFromPdf } from "@/lib/pdf";
import { MAX_UPLOAD_BYTES, sniffFileType } from "@/lib/security";

export const dynamic = "force-dynamic";
// PDF parsing + LLM analysis can exceed the default 10s function limit.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let resumeText = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
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

        if (buffer.byteLength > MAX_UPLOAD_BYTES) {
          return NextResponse.json(
            { message: "File too large. Maximum size is 10 MB." },
            { status: 413 }
          );
        }

        if (sniffFileType(buffer) !== "pdf") {
          return NextResponse.json(
            { message: "Only PDF resumes are accepted." },
            { status: 415 }
          );
        }

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
      const body = await req.json().catch(() => ({}));
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
      return NextResponse.json(
        { message: "Resume content is empty. Please select a resume, upload a PDF, or paste text." },
        { status: 400 }
      );
    }

    const truncatedResume = resumeText.substring(0, 15000);
    const { systemPrompt, userPrompt } = buildHackerRankAnalysisPrompts(truncatedResume);
    const raw = await generateStructuredJson<HackerRankAnalysis>(systemPrompt, userPrompt, true);
    const result = normalizeHackerRankAnalysis(raw);

    return NextResponse.json(result);
  } catch (error) {
    console.error("HackerRank resume analysis error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
