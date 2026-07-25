import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Document from "@/models/Document";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function resolveLocalUploadPath(fileUrl: string): string | null {
  if (!fileUrl?.startsWith("/uploads/")) return null;
  const filename = path.basename(fileUrl);
  if (!filename || filename.includes("..")) return null;
  return path.join(process.cwd(), "public", "uploads", filename);
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const doc = await Document.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!doc) {
      return NextResponse.json({ message: "Document not found" }, { status: 404 });
    }

    // Best-effort local file cleanup (Vercel / ephemeral FS will ignore this).
    const localPath = resolveLocalUploadPath(doc.fileUrl);
    if (localPath && !process.env.VERCEL) {
      try {
        await unlink(localPath);
      } catch {
        // File may already be gone — DB delete still succeeded.
      }
    }

    return NextResponse.json({ message: "Document deleted", id });
  } catch (error: any) {
    console.error("AI Hub document DELETE error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
