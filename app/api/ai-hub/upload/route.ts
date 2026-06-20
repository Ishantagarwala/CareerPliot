import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Document from "@/models/Document";
import UserProgress from "@/models/UserProgress";
import { generateStructuredJson } from "@/lib/llm";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { extractTextFromPdf } from "@/lib/pdf";
import { MAX_UPLOAD_BYTES, sanitizeFilename, sniffFileType } from "@/lib/security";

export const dynamic = "force-dynamic";

interface LlmQuestion {
  question: string;
  options?: string[];
  answer: string;
  type: "mcq" | "flashcard";
}

interface LlmResponse {
  summary: string;
  questions: LlmQuestion[];
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { message: "File too large. Maximum size is 10 MB." },
        { status: 413 }
      );
    }

    // Determine the true file type from magic bytes rather than trusting the
    // client-supplied file.type / extension (which can smuggle SVG/HTML and
    // other stored-XSS payloads into the public uploads directory).
    const sniffedType = sniffFileType(buffer);
    if (!sniffedType) {
      return NextResponse.json({ message: "Unsupported file type" }, { status: 415 });
    }

    const uniqueFilename = `${Date.now()}-${sanitizeFilename(file.name)}`;
    const fileUrl = `/uploads/${uniqueFilename}`;

    // Write file locally if in dev mode
    if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, uniqueFilename);
        await writeFile(filePath, buffer);
      } catch (writeError) {
        console.error("Local file write error (non-fatal):", writeError);
      }
    }

    await dbConnect();

    // 1. Process PDF file
    if (sniffedType === "pdf") {
      let pdfText = "";
      try {
        pdfText = await extractTextFromPdf(buffer, file.name);
      } catch (parseError: any) {
        console.error("PDF Parsing Error:", parseError);
        return NextResponse.json(
          { message: `Failed to parse PDF document: ${parseError.message || parseError}` },
          { status: 422 }
        );
      }

      if (!pdfText.trim()) {
        return NextResponse.json(
          { message: "The PDF appears to be empty or contains no extractable text." },
          { status: 422 }
        );
      }

      const maxChars = 16000;
      const textToAnalyze = pdfText.length > maxChars 
        ? pdfText.substring(0, maxChars) + "\n\n[Content truncated for length limits...]"
        : pdfText;

      const systemPrompt = `You are an expert AI learning assistant. Your task is to analyze the text extracted from a student's study document (syllabus, notes, textbook chapter) and generate:
1. A detailed, structured summary using Markdown (with clear headings, bullet points, and key takeaways).
2. Exactly 6 study questions:
   - 3 Multiple Choice Questions (type: "mcq"), each with a question, exactly 4 options, and the correct answer (which must match one of the options exactly).
   - 3 Flashcards (type: "flashcard"), each with a question/front-side and a brief, clear answer/back-side.

Return your response ONLY as a JSON object matching this schema:
{
  "summary": "Detailed markdown summary...",
  "questions": [
    {
      "question": "What is ...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "type": "mcq"
    },
    {
      "question": "Question/concept for front of flashcard?",
      "answer": "Brief, clear explanation/answer for back of flashcard",
      "type": "flashcard"
    }
  ]
}`;

      const userPrompt = `Document Filename: ${file.name}\nExtracted Text:\n${textToAnalyze}`;
      const llmResponse = await generateStructuredJson<LlmResponse>(systemPrompt, userPrompt, true);

      if (!llmResponse || !llmResponse.summary || !Array.isArray(llmResponse.questions)) {
        throw new Error("Invalid output format from LLM");
      }

      const formattedQuestions = llmResponse.questions.map((q) => ({
        question: q.question,
        options: q.type === "mcq" ? q.options || [] : [],
        answer: q.answer,
        type: q.type,
      }));

      const newDoc = new Document({
        userId,
        filename: file.name,
        fileUrl,
        contentText: textToAnalyze,
        summary: llmResponse.summary,
        questions: formattedQuestions,
      });

      await newDoc.save();

      await UserProgress.findOneAndUpdate(
        { userId },
        { 
          $inc: { pdfsAnalyzed: 1 }, 
          $set: { lastActive: new Date() } 
        },
        { upsert: true, new: true }
      );

      return NextResponse.json({
        type: "pdf",
        filename: file.name,
        fileUrl,
        docId: newDoc._id,
        summary: newDoc.summary,
      });
    }

    // 2. Process Image file (png/jpeg/gif/webp, validated by magic bytes above)
    return NextResponse.json({
      type: "image",
      filename: file.name,
      fileUrl,
    });
  } catch (error) {
    console.error("AI Hub upload error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
