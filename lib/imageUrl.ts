/**
 * Helpers for external images that often break (hotlink 403s, empty URLs, http).
 */

const BROKEN_HOST_PATTERNS = [
  /remotive\.com\/job\/\d+\/logo/i,
];

export function isUsableImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return false;
  if (BROKEN_HOST_PATTERNS.some((re) => re.test(trimmed))) return false;
  try {
    const parsed = new URL(trimmed, "https://placeholder.local");
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Force https when possible; drop known-broken logo endpoints. */
export function normalizeImageUrl(url?: string | null): string | undefined {
  if (!isUsableImageUrl(url)) return undefined;
  const trimmed = url!.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice(7)}`;
  return trimmed;
}

/** Deterministic initials avatar (no external request). */
export function companyAvatarDataUrl(name: string, size = 128): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "?";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="100%" height="100%" fill="#0b1117"/>
  <rect x="1" y="1" width="${size - 2}" height="${size - 2}" fill="none" stroke="#1f2a30" stroke-width="2"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#23a0a7" font-family="Space Grotesk, system-ui, sans-serif" font-size="${Math.round(size * 0.36)}" font-weight="700">${initials}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function resolveCompanyLogo(url: string | undefined | null, company: string): string {
  return normalizeImageUrl(url) || companyAvatarDataUrl(company || "Job");
}
