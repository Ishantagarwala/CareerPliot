/**
 * Flashcard generation: prompt construction and response shaping.
 *
 * Like `lib/interview.ts`, this file is pure so the messy part — what a model
 * actually returns — can be tested without a database. The rules encoded here
 * come from the failure modes seen when asking a model for study cards:
 *
 * - it returns one card that asks three things at once, which is unlearnable
 * - it answers "what is X?" with "X is a concept in the document"
 * - it repeats the same card with different wording
 * - it invents facts that are not in the uploaded material
 * - it wraps the array in an object, or refuses JSON entirely
 *
 * Each of those is handled either in the prompt or in the normaliser below.
 */

export interface GeneratedCard {
  front: string;
  back: string;
  page?: number;
}

export const MIN_CARDS_PER_GENERATION = 4;
export const MAX_CARDS_PER_GENERATION = 24;
export const DEFAULT_CARDS_PER_GENERATION = 12;
export const MAX_CARDS_PER_DECK = 300;
export const MAX_FRONT_CHARS = 300;
export const MAX_BACK_CHARS = 800;
export const MAX_DECK_CHARS = 60;

export function clampCardCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_CARDS_PER_GENERATION;
  return Math.min(
    MAX_CARDS_PER_GENERATION,
    Math.max(MIN_CARDS_PER_GENERATION, Math.round(parsed))
  );
}

/**
 * A stable key for "is this the same card?".
 *
 * Case, punctuation and spacing are ignored, so "What is a closure?" and
 * "what is a closure" collide — which is what stops the second generation of a
 * document from adding a near-duplicate set.
 */
export function cardKey(front: string): string {
  return front
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** Deck label for a document: "Data Structures.pdf" → "Data Structures". */
export function deckNameForDocument(filename: string): string {
  const base = (filename || "Untitled").replace(/\.[a-z0-9]{1,8}$/i, "").trim();
  return (base || "Untitled").slice(0, MAX_DECK_CHARS);
}

export function buildFlashcardPrompts(input: {
  deck: string;
  context: string;
  count: number;
  role?: string;
}): { system: string; user: string } {
  const { deck, context, count, role } = input;

  const system = `You write study flashcards from a student's own course material.

Rules:
- One fact or idea per card. Never combine two questions into one card.
- The front is a short question or cue (under 25 words). The back is a direct answer in 1–3 sentences (under 60 words).
- Use ONLY the supplied material. If the material does not state something, do not add it from general knowledge.
- Do not write vague cards ("What is this chapter about?"). Every card must be answerable and specific.
- Prefer the concepts a student would be examined on: definitions, distinctions, causes, steps, formulas, and worked examples.
- Do not repeat a card in different words.
- Plain text only in both fields. Inline \`backticks\` are fine for code or symbols; no markdown fences or headings.
- If the material contains page markers or part labels, set "page" to the page number the card came from.

Return ONLY JSON:
{"cards": [{"front": "question", "back": "answer", "page": 3}]}`;

  const user = `Deck: ${deck}
${role ? `The student is preparing for: ${role}\n` : ""}
Write ${count} cards from this material.

<material>
${context}
</material>`;

  return { system, user };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cleanText(value: unknown, maxChars: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, maxChars);
}

function pickArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const record = asRecord(raw);
  if (!record) return [];
  for (const key of ["cards", "flashcards", "items", "data", "result"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

/**
 * Turns a model response into usable cards.
 *
 * `count` is a ceiling, not a target: if the model returns four good cards when
 * twelve were asked for, four is the honest result. Padding with filler would
 * make the deck worse, and the caller reports what was actually created.
 */
export function normalizeGeneratedCards(raw: unknown, count: number): GeneratedCard[] {
  const entries = pickArray(raw);
  const seen = new Set<string>();
  const cards: GeneratedCard[] = [];

  for (const entry of entries) {
    const record = asRecord(entry);
    if (!record) continue;

    const front = cleanText(
      record.front ?? record.question ?? record.term ?? record.prompt,
      MAX_FRONT_CHARS
    );
    const back = cleanText(
      record.back ?? record.answer ?? record.definition ?? record.explanation,
      MAX_BACK_CHARS
    );

    if (!front || !back) continue;

    // "What is X?" answered with "X" is not a card; it teaches nothing.
    const key = cardKey(front);
    if (!key || cardKey(back) === key) continue;
    if (seen.has(key)) continue;
    seen.add(key);

    const rawPage = record.page ?? record.pageNumber;
    const pageNumber = Number(rawPage);
    const page =
      Number.isFinite(pageNumber) && pageNumber > 0 ? Math.round(pageNumber) : undefined;

    cards.push(page ? { front, back, page } : { front, back });
    if (cards.length >= count) break;
  }

  return cards;
}
