import path from "path";

/** Maximum accepted upload size in bytes (10 MB). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Private upload directory (outside public/ so files are not world-readable). */
export const UPLOADS_DIR = path.resolve(path.join(process.cwd(), "storage", "uploads"));

/**
 * Escape a string so it can be safely embedded inside a RegExp without enabling
 * ReDoS or unintended pattern matching.
 */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a client-facing upload URL served by the auth-gated download route. */
export function toUploadFileUrl(filename: string): string {
  return `/api/uploads/${filename}`;
}

/**
 * Resolve a client-supplied upload reference to an absolute path inside
 * storage/uploads (or legacy public/uploads), rejecting path traversal.
 * Accepts `/api/uploads/...` and legacy `/uploads/...`.
 */
export function resolveUploadPath(fileUrl: unknown): string | null {
  if (typeof fileUrl !== "string") return null;

  let relative: string | null = null;
  if (fileUrl.startsWith("/api/uploads/")) {
    relative = fileUrl.slice("/api/uploads/".length);
  } else if (fileUrl.startsWith("/uploads/")) {
    relative = fileUrl.slice("/uploads/".length);
  } else {
    return null;
  }

  const filename = path.basename(relative);
  if (!filename || filename !== relative || filename.includes("..")) {
    return null;
  }

  const privatePath = path.resolve(path.join(UPLOADS_DIR, filename));
  if (privatePath !== UPLOADS_DIR && !privatePath.startsWith(UPLOADS_DIR + path.sep)) {
    return null;
  }

  // Prefer private storage; fall back to legacy public/uploads for old files.
  return privatePath;
}

/** Legacy path under public/uploads for files written before private storage. */
export function resolveLegacyUploadPath(fileUrl: unknown): string | null {
  if (typeof fileUrl !== "string" || !fileUrl.startsWith("/uploads/")) {
    return null;
  }
  const filename = path.basename(fileUrl);
  if (!filename || filename.includes("..")) return null;
  const uploadsDir = path.resolve(path.join(process.cwd(), "public", "uploads"));
  const resolved = path.resolve(path.join(uploadsDir, filename));
  if (resolved !== uploadsDir && !resolved.startsWith(uploadsDir + path.sep)) {
    return null;
  }
  return resolved;
}

/** Sanitize an uploaded filename to a safe basename (no separators, no traversal). */
export function sanitizeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "file";
}

/** Prefix uploads with userId so download route can enforce ownership. */
export function buildOwnedUploadFilename(userId: string, originalName: string): string {
  const safeUserId = sanitizeFilename(userId);
  return `${safeUserId}-${Date.now()}-${sanitizeFilename(originalName)}`;
}

/** True when the upload filename is owned by this user (userId- prefix). */
export function isOwnedUploadFilename(filename: string, userId: string): boolean {
  const safeUserId = sanitizeFilename(userId);
  return filename.startsWith(`${safeUserId}-`);
}

export type SniffedType = "pdf" | "png" | "jpeg" | "gif" | "webp";

/**
 * Identify a file's true type from its magic bytes. Returns null for anything
 * not in the allowlist (which notably excludes SVG/HTML — common stored-XSS
 * vectors when files are served from a public directory).
 */
export function sniffFileType(buf: Buffer): SniffedType | null {
  if (buf.length >= 4 && buf.toString("latin1", 0, 4) === "%PDF") return "pdf";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) {
    return "png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 4 && buf.toString("latin1", 0, 4) === "GIF8") return "gif";
  if (
    buf.length >= 12 &&
    buf.toString("latin1", 0, 4) === "RIFF" &&
    buf.toString("latin1", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

/**
 * Best-effort in-memory fixed-window rate limiter (per server instance).
 * Returns true when the call is allowed, false when the limit is exceeded.
 *
 * Note: serverless deployments run multiple ephemeral instances, so this is a
 * mitigation, not a hard guarantee. For strict limits back it with a shared
 * store (e.g. Upstash Redis).
 */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) {
    return false;
  }
  bucket.count++;
  return true;
}

/** Best-effort client IP from common proxy headers. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
