import path from "path";

/** Maximum accepted upload size in bytes (10 MB). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Escape a string so it can be safely embedded inside a RegExp without enabling
 * ReDoS or unintended pattern matching.
 */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resolve a client-supplied upload reference (e.g. "/uploads/abc.png") to an
 * absolute path inside public/uploads, rejecting anything that escapes that
 * directory (path traversal). Returns null when the reference is invalid.
 */
export function resolveUploadPath(fileUrl: unknown): string | null {
  if (typeof fileUrl !== "string" || !fileUrl.startsWith("/uploads/")) {
    return null;
  }
  const uploadsDir = path.resolve(path.join(process.cwd(), "public", "uploads"));
  const resolved = path.resolve(path.join(process.cwd(), "public", fileUrl));
  if (resolved !== uploadsDir && !resolved.startsWith(uploadsDir + path.sep)) {
    return null;
  }
  return resolved;
}

/** Sanitize an uploaded filename to a safe basename (no separators, no traversal). */
export function sanitizeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "file";
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
