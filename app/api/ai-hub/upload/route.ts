import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Document from "@/models/Document";
import UserProgress from "@/models/UserProgress";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prepareStoredDocumentText } from "@/lib/aiHub";
import { extractTextFromPdf } from "@/lib/pdf";
import {
  MAX_UPLOAD_BYTES,
  UPLOADS_DIR,
  buildOwnedUploadFilename,
  rateLimit,
  sniffFileType,
  toUploadFileUrl,
} from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    if (!rateLimit(`ai-upload:${userId}`, 15, 60 * 60 * 1000)) {
      return NextResponse.json({ message: "Too many uploads. Try again later." }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }
    const displayFilename = file.name.trim().slice(0, 200) || "upload";

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
    // other stored-XSS payloads into a public uploads directory).
    const sniffedType = sniffFileType(buffer);
    if (!sniffedType) {
      return NextResponse.json({ message: "Unsupported file type" }, { status: 415 });
    }

    const uniqueFilename = buildOwnedUploadFilename(
      userId,
      displayFilename,
      sniffedType
    );
    const fileUrl = toUploadFileUrl(uniqueFilename);

    // Process PDFs without a second LLM call. Chat uses the extracted text as
    // context and generates summaries/quizzes on demand.
    if (sniffedType === "pdf") {
      let pdfText = "";
      try {
        pdfText = await extractTextFromPdf(buffer, displayFilename);
      } catch (parseError) {
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

      if (!process.env.VERCEL) {
        await mkdir(UPLOADS_DIR, { recursive: true });
        await writeFile(path.join(UPLOADS_DIR, uniqueFilename), buffer);
      }

      await dbConnect();

      const newDoc = new Document({
        userId,
        filename: displayFilename,
        fileUrl,
        contentText: prepareStoredDocumentText(pdfText),
        questions: [],
      });

      await newDoc.save();

      await UserProgress.findOneAndUpdate(
        { userId },
        { 
          $inc: { pdfsAnalyzed: 1 }, 
          $set: { lastActive: new Date() } 
        },
        { upsert: true, new: true }
      ).catch((progressError) => {
        console.error(
          "Failed to update AI Hub PDF progress (non-fatal):",
          progressError
        );
      });

      const documentId = String(newDoc._id);

      return NextResponse.json({
        type: "pdf",
        filename: displayFilename,
        fileUrl,
        docId: documentId,
      });
    }

    // Images need their bytes later for the vision request.
    if (!process.env.VERCEL) {
      await mkdir(UPLOADS_DIR, { recursive: true });
      await writeFile(path.join(UPLOADS_DIR, uniqueFilename), buffer);
    }

    return NextResponse.json({
      type: "image",
      filename: displayFilename,
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
