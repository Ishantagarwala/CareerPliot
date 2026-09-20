/**
 * Validation for the career assessment's model output.
 *
 * The assessment route used to save whatever the model returned as long as
 * `recommendations` was an array. Everything that could go wrong inside that
 * array — a score sent as "85%", a duplicated path, a model that answered with
 * a system error, a three-sentence field truncated to nothing — reached the
 * database or the student's screen. This turns one loose check into a filter
 * that keeps only entries that are actually usable.
 */

export interface LlmRecommendation {
  careerPath?: unknown;
  matchScore?: unknown;
  reasoning?: unknown;
}

export interface SanitizedRecommendation {
  careerPath: string;
  matchScore: number;
  reasoning: string;
}

/** What the student is shown instead of a generic failure. */
export const GENERIC_CAREER_QUESTION =
  "Which career paths fit my interests, subjects, and goals?";

/**
 * A model that answers with an error, a placeholder, or a refusal produces a
 * "career path" that is not a career. Treating it as one wrote rows like
 * "Authentication failed" into the student's matches, and the roadmap then
 * tried to build a curriculum for it.
 */
const JUNK_PATH_PATTERNS: RegExp[] = [
  /^authentication\b/i,
  /\berror\b/i,
  /\bexception\b/i,
  /\bundefined\b/i,
  /\bnull\b/i,
  /\bn\/a\b/i,
  /^unknown\b/i,
  /\bapi key\b/i,
  /\brate limit\b/i,
  /\bquota\b/i,
  /^(assistant|system|user)$/i,
  /career path$/i,
  /^(please|sorry|cannot|can't|unable)\b/i,
  /^\{|^\}|^\s*$/,
];

const MAX_PATH_CHARS = 80;
const MAX_REASONING_CHARS = 600;
const MIN_REASONING_CHARS = 20;
const MAX_SCORE = 100;

/** Career titles are short and specific; anything else is not one. */
export function isUsableCareerPath(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const path = raw.replace(/\s+/g, " ").trim();
  if (!path || path.length > MAX_PATH_CHARS) return false;
  if (!/[a-z]{3}/i.test(path)) return false;
  return !JUNK_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

/** "85%", "85 / 100" and 8.5-on-a-10-scale all mean 85. */
export function normalizeMatchScore(raw: unknown): number {
  const numeric =
    typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeric)) return 75;

  const scaled = numeric > 0 && numeric <= 1 ? numeric * 100 : numeric;
  return Math.max(1, Math.min(MAX_SCORE, Math.round(scaled)));
}

/** The key used to spot two recommendations that are the same career. */
export function careerPathKey(path: string): string {
  return path
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    // Seniority words do not make a different career for a student's first path.
    .replace(/\b(junior|senior|entry level|entry|lead|principal|associate|assistant)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeReasoning(raw: unknown, careerPath: string): string {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (text.length < MIN_REASONING_CHARS) {
    return `Matches your interests and current skills, and is a realistic first step toward ${careerPath}.`;
  }
  return text.length > MAX_REASONING_CHARS
    ? `${text.slice(0, MAX_REASONING_CHARS - 1).trimEnd()}…`
    : text;
}

/**
 * Filters, normalises and de-duplicates model output.
 *
 * Returns fewer entries than asked for when the model produced unusable ones —
 * a shorter list of real careers beats a full list padded with junk.
 */
export function sanitizeRecommendations(raw: unknown): SanitizedRecommendation[] {
  if (!Array.isArray(raw)) return [];

  const out: SanitizedRecommendation[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as LlmRecommendation;
    if (!isUsableCareerPath(candidate.careerPath)) continue;

    const careerPath = String(candidate.careerPath).replace(/\s+/g, " ").trim();
    const key = careerPathKey(careerPath);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    out.push({
      careerPath: careerPath.slice(0, MAX_PATH_CHARS),
      matchScore: normalizeMatchScore(candidate.matchScore),
      reasoning: normalizeReasoning(candidate.reasoning, careerPath),
    });
  }

  // Highest match first, so the student's best fit is the first card they see.
  return out.sort((a, b) => b.matchScore - a.matchScore);
}
