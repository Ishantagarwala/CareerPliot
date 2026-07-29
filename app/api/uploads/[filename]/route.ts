import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFile, access } from "fs/promises";
import path from "path";
import {
  UPLOADS_DIR,
  isOwnedUploadFilename,
  resolveLegacyUploadPath,
  sniffFileType,
} from "@/lib/security";

interface RouteContext {
  params: Promise<{ filename: string }>;
}

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

/**
 * Auth-gated download for private uploads. Filenames are prefixed with userId
 * so ownership can be checked without a DB round-trip.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { filename: raw } = await params;
    const filename = path.basename(raw || "");
    if (!filename || filename !== raw || filename.includes("..")) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    if (!isOwnedUploadFilename(filename, session.user.id)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const privatePath = path.join(UPLOADS_DIR, filename);
    let buffer: Buffer | null = null;

    try {
      await access(privatePath);
      buffer = await readFile(privatePath);
    } catch {
      // Fall back to legacy public/uploads for older files.
      const legacy = resolveLegacyUploadPath(`/uploads/${filename}`);
      if (legacy) {
        try {
          buffer = await readFile(legacy);
        } catch {
          buffer = null;
        }
      }
    }

    if (!buffer) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const sniffed = sniffFileType(buffer);
    const contentType = sniffed ? CONTENT_TYPES[sniffed] : "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Upload download error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
