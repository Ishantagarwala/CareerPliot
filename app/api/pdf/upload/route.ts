import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Document from "@/models/Document";
import UserProgress from "@/models/UserProgress";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { extractTextFromPdf } from "@/lib/pdf";
import {
  MAX_UPLOAD_BYTES,
  UPLOADS_DIR,
  buildOwnedUploadFilename,
  rateLimit,
  sniffFileType,
  toUploadFileUrl,
} from "@/lib/security";

// Text extraction only — summary/quiz are generated later via chat. No LLM
// call here, so the function stays well under the limit.
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    if (!rateLimit(`pdf-upload:${userId}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ message: "Too many uploads. Try again later." }, { status: 429 });
    }

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

    // Validate true file type from magic bytes, not the client-supplied name/type.
    if (sniffFileType(buffer) !== "pdf") {
      return NextResponse.json(
        { message: "Only PDF files are accepted." },
        { status: 415 }
      );
    }

    // 1. Extract text from PDF using extractTextFromPdf (PDF.co with PDF.js fallback)
    let pdfText = "";
    try {
      pdfText = await extractTextFromPdf(buffer, file.name);
    } catch (parseError: unknown) {
      console.error("PDF Parsing Error:", parseError);
      return NextResponse.json(
        { message: "Failed to parse PDF document." },
        { status: 422 }
      );
    }

    if (!pdfText.trim()) {
      return NextResponse.json(
        { message: "The PDF appears to be empty or contains no extractable text." },
        { status: 422 }
      );
    }

    // 2. Save file to private storage (not under public/)
    const uniqueFilename = buildOwnedUploadFilename(userId, file.name);
    const fileUrl = toUploadFileUrl(uniqueFilename);

    if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
      try {
        await mkdir(UPLOADS_DIR, { recursive: true });
        await writeFile(path.join(UPLOADS_DIR, uniqueFilename), buffer);
      } catch (writeError) {
        console.error("Local file write error (non-fatal):", writeError);
      }
    }

    // 3. Connect to Database
    await dbConnect();

    // 4. Save document with extracted text. Summary and quiz are generated
    // on demand later via chat, so they start empty here.
    const newDoc = new Document({
      userId,
      filename: file.name,
      fileUrl,
      contentText: pdfText,
      questions: [],
    });

    await newDoc.save();

    // 5. Update user progress (increment pdfsAnalyzed, update lastActive)
    await UserProgress.findOneAndUpdate(
      { userId },
      {
        $inc: { pdfsAnalyzed: 1 },
        $set: { lastActive: new Date() }
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: "File uploaded successfully",
      document: {
        id: newDoc._id,
        filename: newDoc.filename,
        fileUrl: newDoc.fileUrl,
        summary: newDoc.summary,
        questions: newDoc.questions,
      },
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
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
  } catch (error) {
    console.error("PDF GET error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
