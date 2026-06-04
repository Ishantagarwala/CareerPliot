import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Document from "@/models/Document";
import UserProgress from "@/models/UserProgress";
import { generateStructuredJson } from "@/lib/llm";
import { PDFParse } from "pdf-parse";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

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

    // 1. Extract text from PDF using PDFParse class
    let pdfText = "";
    let parser: any = null;
    try {
      parser = new PDFParse({ data: new Uint8Array(buffer) });
      const parsedPdf = await parser.getText();
      pdfText = parsedPdf.text || "";
    } catch (parseError: any) {
      console.error("PDF Parsing Error:", parseError);
      return NextResponse.json(
        { message: "Failed to parse PDF document. Ensure the file is not corrupted." },
        { status: 422 }
      );
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch (destroyError) {
          console.error("Error destroying PDFParse worker:", destroyError);
        }
      }
    }

    if (!pdfText.trim()) {
      return NextResponse.json(
        { message: "The PDF appears to be empty or contains no extractable text." },
        { status: 422 }
      );
    }

    // Truncate to limit token usage (16,000 characters is about 2.5k-3k words)
    const maxChars = 16000;
    const textToAnalyze = pdfText.length > maxChars 
      ? pdfText.substring(0, maxChars) + "\n\n[Content truncated for length limits...]"
      : pdfText;

    // 2. Save file locally inside public/uploads
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    
    const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    await writeFile(filePath, buffer);
    const fileUrl = `/uploads/${uniqueFilename}`;

    // 3. Connect to Database
    await dbConnect();

    // 4. Generate structured summary and Q&A from LLM
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

    const userPrompt = `Document Filename: ${file.name}
Extracted Text:
${textToAnalyze}`;

    const llmResponse = await generateStructuredJson<LlmResponse>(systemPrompt, userPrompt);

    if (!llmResponse || !llmResponse.summary || !Array.isArray(llmResponse.questions)) {
      throw new Error("Invalid output format from LLM");
    }

    // Ensure questions match our IQuestion schema
    const formattedQuestions = llmResponse.questions.map((q) => ({
      question: q.question,
      options: q.type === "mcq" ? q.options || [] : [],
      answer: q.answer,
      type: q.type,
    }));

    // 5. Save document in MongoDB
    const newDoc = new Document({
      userId,
      filename: file.name,
      fileUrl,
      summary: llmResponse.summary,
      questions: formattedQuestions,
    });

    await newDoc.save();

    // 6. Update user progress (increment pdfsAnalyzed, update lastActive)
    await UserProgress.findOneAndUpdate(
      { userId },
      { 
        $inc: { pdfsAnalyzed: 1 }, 
        $set: { lastActive: new Date() } 
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: "File uploaded and analyzed successfully",
      document: {
        id: newDoc._id,
        filename: newDoc.filename,
        fileUrl: newDoc.fileUrl,
        summary: newDoc.summary,
        questions: newDoc.questions,
      },
    });
  } catch (error: any) {
    console.error("PDF upload error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const documents = await Document.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .select("filename fileUrl createdAt summary");

    return NextResponse.json(documents);
  } catch (error: any) {
    console.error("PDF GET error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
