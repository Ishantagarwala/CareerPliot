/** Production domain — used for sitemap / Open Graph when env is unset. */
export const PRODUCTION_SITE_URL = "https://careerpilot.cc";

/**
 * Absolute public site URL for SEO (sitemap, Open Graph, canonical).
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  // Prefer the custom domain over *.vercel.app preview hosts.
  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }
  return "http://localhost:3000";
}
