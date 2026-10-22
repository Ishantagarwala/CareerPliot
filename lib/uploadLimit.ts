/**
 * The largest file this *deployment* accepts from a browser.
 *
 * `MAX_UPLOAD_BYTES` in lib/security.ts is enforced by the route handler, but on
 * a split deployment the request reaches the frontend host's platform before it
 * ever reaches that handler. Vercel rejects request bodies above 4.5 MB with an
 * opaque 413, so a 10 MB PDF would fail with no useful message — and the user
 * would blame the app rather than the limit.
 *
 * Setting `NEXT_PUBLIC_UPLOAD_LIMIT_BYTES=4500000` on the frontend deployment
 * makes the UI refuse the file up front and say the real number. The VPS build
 * leaves it unset, so direct uploads there keep the full 10 MB.
 *
 * NEXT_PUBLIC_* is inlined at build time, which is why this is a constant
 * rather than a function read at call time.
 */
const DEFAULT_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;

export const CLIENT_UPLOAD_LIMIT_BYTES = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_UPLOAD_LIMIT_BYTES);
  return Number.isFinite(raw) && raw >= 1024 ? Math.round(raw) : DEFAULT_UPLOAD_LIMIT_BYTES;
})();

/** "10 MB", "4.3 MB" — one decimal below 10 MB so the real ceiling is visible. */
export function formatUploadLimit(bytes: number = CLIENT_UPLOAD_LIMIT_BYTES): string {
  const mb = bytes / (1024 * 1024);
  const rounded = mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10;
  return `${rounded} MB`;
}

/** True when a file is over the limit for this deployment. */
export function exceedsUploadLimit(file: { size: number }): boolean {
  return file.size > CLIENT_UPLOAD_LIMIT_BYTES;
}
