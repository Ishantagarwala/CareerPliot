/**
 * Document context for chat.
 *
 * The previous implementation kept the first 12,000 characters of a document
 * and dropped the rest, which meant a model only ever saw roughly the first
 * four pages of a long PDF — it looked like the PDF had only been half parsed.
 * Extraction was never the problem: the whole document was stored.
 *
 * Instead of a prefix, the document is split into passages and the passages
 * that answer the question are selected, within the same budget. A question
 * about something on page 40 now reaches the model, and every excerpt says
 * which part of the document it came from so the answer can cite it.
 *
 * This ranks lexically, with no extra model call and no embedding service: it
 * is deterministic, costs nothing, and is easy to reason about when an answer
 * is wrong.
 */

export interface ContextDocument {
  filename: string;
  summary?: string;
  contentText?: string;
}

export interface ContextOptions {
  /** The student's message. Drives which passages are selected. */
  question?: string;
  /** Total characters of document text allowed in the prompt. */
  budgetChars?: number;
}

/**
 * Roughly 8k tokens of document text. The model handles far more, but a large
 * prompt costs latency on every turn of a conversation, and retrieval means the
 * budget buys relevant passages instead of the opening pages.
 */
export const DEFAULT_CONTEXT_BUDGET = 32_000;

/** Passages smaller than this are merged forward, so snippets stay useful. */
const TARGET_PASSAGE_CHARS = 1_200;
const MAX_PASSAGES_PER_DOCUMENT = 24;

/** Words that carry no signal when matching a question to a passage. */
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "than", "that", "this", "these", "those",
  "is", "are", "was", "were", "be", "been", "being", "am", "do", "does", "did", "doing",
  "have", "has", "had", "having", "can", "could", "should", "would", "will", "shall", "may",
  "might", "must", "of", "in", "on", "at", "to", "for", "with", "about", "from", "by", "as",
  "into", "over", "after", "before", "between", "under", "above", "it", "its", "i", "me", "my",
  "we", "our", "you", "your", "he", "she", "they", "them", "their", "what", "which", "who",
  "whom", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most",
  "other", "some", "such", "no", "not", "only", "own", "same", "so", "too", "very", "just",
  "also", "there", "here", "please", "tell", "give", "make", "made", "using", "use", "used",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((token) => token.replace(/^[.]+|[.]+$/g, ""))
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

export interface Passage {
  /** 1-based index of this passage within its document. */
  index: number;
  text: string;
  tokens: Set<string>;
}

/**
 * Splits extracted text into passages on paragraph boundaries.
 *
 * Paragraphs are the natural unit here: they are what a PDF's text extraction
 * preserves, and they keep a selected passage readable on its own.
 */
export function splitIntoPassages(content: string): Passage[] {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);

  const passages: Passage[] = [];
  let buffer = "";

  const flush = () => {
    const text = buffer.trim();
    if (text) {
      passages.push({ index: passages.length + 1, text, tokens: new Set(tokenize(text)) });
    }
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    // A single paragraph longer than the target is split by sentence so one
    // dense page cannot crowd out everything else.
    if (paragraph.length > TARGET_PASSAGE_CHARS * 2) {
      flush();
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if (buffer.length + sentence.length > TARGET_PASSAGE_CHARS) flush();
        buffer += `${sentence} `;
      }
      flush();
      continue;
    }

    if (buffer.length + paragraph.length > TARGET_PASSAGE_CHARS) flush();
    buffer += `${paragraph}\n\n`;
  }
  flush();

  return passages;
}

/** Roughly where a passage sits in the document, as a percentage. */
function positionOf(passage: Passage, total: number): number {
  return total <= 1 ? 0 : (passage.index - 1) / (total - 1);
}

/** Passages spread across the whole document, for a question with no keywords. */
function evenSample(passages: Passage[], count: number): Passage[] {
  if (passages.length <= count) return passages;
  const picked: Passage[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(passages[Math.round((i * (passages.length - 1)) / (count - 1))]);
  }
  return picked;
}

/**
 * Selects passages to answer `question`.
 *
 * Scoring is term overlap weighted by rarity: a word appearing in only a few
 * passages says much more about relevance than one appearing everywhere. Ties
 * break toward the start of the document, which is where an overview usually
 * lives.
 */
export function selectPassages(
  passages: Passage[],
  question: string,
  limit: number
): { selected: Passage[]; matched: boolean } {
  const questionTokens = tokenize(question);
  if (!questionTokens.length) {
    return { selected: evenSample(passages, limit), matched: false };
  }

  const documentFrequency = new Map<string, number>();
  for (const passage of passages) {
    for (const token of passage.tokens) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const scored = passages.map((passage) => {
    let score = 0;
    for (const token of questionTokens) {
      if (!passage.tokens.has(token)) continue;
      const frequency = documentFrequency.get(token) ?? 1;
      // Rarer terms dominate; a term in every passage contributes almost nothing.
      score += 1 / frequency;
    }
    return { passage, score };
  });

  const relevant = scored.filter((entry) => entry.score > 0);
  if (!relevant.length) {
    return { selected: evenSample(passages, limit), matched: false };
  }

  relevant.sort(
    (a, b) => b.score - a.score || positionOf(a.passage, passages.length) - positionOf(b.passage, passages.length)
  );

  return { selected: relevant.slice(0, limit).map((entry) => entry.passage), matched: true };
}

function estimatePage(passage: Passage, passages: Passage[], charsPerPage: number): number {
  const charsBefore = passages
    .slice(0, passage.index - 1)
    .reduce((total, entry) => total + entry.text.length, 0);
  return Math.max(1, Math.round(charsBefore / charsPerPage) + 1);
}

const AVG_CHARS_PER_PAGE = 1_800;

/**
 * Builds the document section of the prompt.
 *
 * The opening of each document is always included, because the first paragraph
 * is what tells the reader (and the model) what the document is — then the
 * passages that match the question follow.
 */
export function buildDocumentContext(
  documents: ContextDocument[],
  options: ContextOptions = {}
): string {
  const { question = "", budgetChars = DEFAULT_CONTEXT_BUDGET } = options;

  const usable = documents
    .map((doc) => ({
      filename: doc.filename.replace(/[\r\n]+/g, " ").trim().slice(0, 200),
      content: (doc.contentText || doc.summary || "").trim(),
    }))
    .filter((doc) => doc.content);

  if (!usable.length) return "";

  const perDocumentShare = Math.max(2_000, Math.floor(budgetChars / usable.length));
  const sections: string[] = [];

  for (const doc of usable) {
    const passages = splitIntoPassages(doc.content);
    const heading = `Document: ${doc.filename}`;

    if (!passages.length) continue;

    /*
     * A short document fits whole — no selection to get wrong. This also covers
     * the common case of a one- or two-page upload.
     */
    if (doc.content.length <= perDocumentShare) {
      sections.push(`${heading}\n\n${doc.content}`);
      continue;
    }

    const pageCount = Math.max(1, Math.round(doc.content.length / AVG_CHARS_PER_PAGE));
    const opening = passages[0];
    const limit = Math.min(MAX_PASSAGES_PER_DOCUMENT, Math.max(4, Math.ceil(perDocumentShare / TARGET_PASSAGE_CHARS)));

    const { selected, matched } = selectPassages(passages, question, limit);
    const chosen = [opening, ...selected.filter((passage) => passage.index !== opening.index)];

    const excerpts: string[] = [];
    let used = 0;
    for (const passage of chosen) {
      if (used + passage.text.length > perDocumentShare && excerpts.length > 0) break;
      const page = estimatePage(passage, passages, AVG_CHARS_PER_PAGE);
      excerpts.push(`[part ${passage.index} of ${passages.length}, ≈ page ${page} of ${pageCount}]\n${passage.text}`);
      used += passage.text.length;
    }

    const coverage = matched
      ? `The passages below are the ones that match the question, selected from the whole document (${passages.length} parts, ≈ ${pageCount} pages). Do not assume anything outside them is absent — say which part you used.`
      : `No passage matched the question's wording, so these are spread across the whole document (${passages.length} parts, ≈ ${pageCount} pages) rather than only its start.`;

    sections.push(`${heading}\n${coverage}\n\n${excerpts.join("\n\n")}`);
  }

  if (!sections.length) return "";

  return `Use the following uploaded study document context when it is relevant. If the answer is not in the documents, say so and answer from general knowledge only when appropriate.\n\n${sections.join("\n\n---\n\n")}`;
}
