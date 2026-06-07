import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Document from "@/models/Document";
import UserProgress from "@/models/UserProgress";
import { generateStructuredJson } from "@/lib/llm";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PDFParse } from "pdf-parse";

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

    const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
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
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      let pdfText = "";
      try {
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        await parser.destroy();
        pdfText = result.text;
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

    // 2. Process Image file
    if (file.type.startsWith("image/")) {
      return NextResponse.json({
        type: "image",
        filename: file.name,
        fileUrl,
      });
    }

    return NextResponse.json({ message: "Unsupported file type" }, { status: 400 });
  } catch (error: any) {
    console.error("AI Hub upload error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
