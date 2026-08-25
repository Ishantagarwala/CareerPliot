import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Document from "@/models/Document";
import { resolveLegacyUploadPath, resolveUploadPath } from "@/lib/security";
import mongoose from "mongoose";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: "Document not found" }, { status: 404 });
    }
    await dbConnect();

    const doc = await Document.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!doc) {
      return NextResponse.json({ message: "Document not found" }, { status: 404 });
    }

    // Best-effort local file cleanup (Vercel / ephemeral FS will ignore this).
    if (!process.env.VERCEL) {
      const candidates = [
        resolveUploadPath(doc.fileUrl),
        resolveLegacyUploadPath(doc.fileUrl),
        resolveLegacyUploadPath(`/uploads/${path.basename(String(doc.fileUrl || ""))}`),
      ].filter(Boolean) as string[];

      for (const localPath of candidates) {
        try {
          await unlink(localPath);
          break;
        } catch {
          // File may already be gone — DB delete still succeeded.
        }
      }
    }

    return NextResponse.json({ message: "Document deleted", id });
  } catch (error) {
    console.error("AI Hub document DELETE error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
