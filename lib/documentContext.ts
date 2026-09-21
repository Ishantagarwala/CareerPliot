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
  /**
   * Real page numbers when the extractor recorded them, so an excerpt can be
   * cited as "page 24" instead of an estimate that is off by one.
   */
  startPage?: number;
  endPage?: number;
}

/**
 * The marker pdf-parse writes between pages by default: `-- 3 of 40 --`.
 *
 * It is the only record of where a page ended, so it is read for page numbers
 * and then removed — it carries no meaning for retrieval and would otherwise
 * appear inside every excerpt.
 */
const PAGE_MARKER = /^\s*--\s*(\d+)\s+of\s+(\d+)\s*--\s*$/;

interface SourcePage {
  number?: number;
  text: string;
  /** Cumulative characters before this page, for estimating page numbers. */
  offset: number;
}

/** Splits extracted text into pages, keeping the page numbers when present. */
function splitIntoPages(content: string): { pages: SourcePage[]; pageCount: number } {
  const lines = content.split("\n");
  const pages: SourcePage[] = [];
  let current: string[] = [];

  /*
   * The extractor writes each page's marker *after* that page, so the text
   * collected before a marker belongs to the marker's own page — not the next
   * one. Attributing it forward put every excerpt one page early, which is how
   * a fact on page 40 came back cited as "page 39 of 40".
   */
  /*
   * Whether page numbers exist at all is decided up front. Defaulting the
   * counter to 1 tagged every passage of a marker-less document as "page 1",
   * which then read as an exact page instead of the estimate it was.
   */
  const hasPageMarkers = content.split("\n").some((line) => PAGE_MARKER.test(line));

  let collectedPage = 0;
  let currentPage = 1;
  let offset = 0;
  let pageCount = 0;

  const flush = () => {
    const text = current.join("\n").trim();
    if (text) {
      pages.push({
        number: hasPageMarkers ? currentPage : undefined,
        text,
        offset,
      });
      offset += text.length;
      collectedPage = Math.max(collectedPage, currentPage);
    }
    current = [];
  };

  for (const line of lines) {
    const marker = line.match(PAGE_MARKER);
    if (!marker) {
      current.push(line);
      continue;
    }
    // The marker closes the page whose text precedes it, so the text just
    // collected *is* that page; the counter then moves past it.
    flush();
    currentPage = Number(marker[1]) + 1;
    pageCount = Math.max(pageCount, Number(marker[2]), Number(marker[1]));
  }
  flush();

  return {
    pages: pages.filter((page) => page.text),
    pageCount: hasPageMarkers
      ? Math.max(1, pageCount, collectedPage)
      : Math.max(1, Math.round(content.length / 1_800)),
  };
}


export function splitIntoPassages(content: string): { passages: Passage[]; pageCount: number } {
  const { pages, pageCount } = splitIntoPages(content);
  const passages: Passage[] = [];
  let buffer = "";
  let bufferStart: number | undefined;
  let bufferEnd: number | undefined;

  const flush = () => {
    const text = buffer.trim();
    if (text) {
      passages.push({
        index: passages.length + 1,
        text,
        tokens: new Set(tokenize(text)),
        startPage: bufferStart,
        endPage: bufferEnd,
      });
    }
    buffer = "";
    bufferStart = undefined;
    bufferEnd = undefined;
  };

  const add = (chunk: string, page?: number) => {
    if (bufferStart === undefined) bufferStart = page;
    if (page !== undefined) bufferEnd = page;
    buffer += chunk;
  };

  for (const page of pages) {
    /*
     * Never span two pages: a passage that starts on one page and ends on the
     * next cannot be cited honestly, and "page 17-18" is a worse answer than
     * the page the excerpt mainly comes from.
     */
    if (buffer && bufferEnd !== undefined && page.number !== undefined && page.number !== bufferEnd) {
      flush();
    }

    const paragraphs = page.text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.replace(/[ \t]+/g, " ").trim())
      .filter(Boolean);

    for (const paragraph of paragraphs) {
      // A single paragraph longer than the target is split by sentence so one
      // dense page cannot crowd out everything else.
      if (paragraph.length > TARGET_PASSAGE_CHARS * 2) {
        flush();
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (buffer.length + sentence.length > TARGET_PASSAGE_CHARS) flush();
          add(`${sentence} `, page.number);
        }
        flush();
        continue;
      }

      if (buffer.length + paragraph.length > TARGET_PASSAGE_CHARS) flush();
      add(`${paragraph}\n\n`, page.number);
    }
  }
  flush();

  return { passages, pageCount };
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

  /*
   * A passage's own repetition must not inflate it: a page that says "topic 3"
   * forty times is not forty times more relevant than the page that names it
   * once. Presence is what counts, weighted by how rare the term is across the
   * document, so a term in every passage contributes almost nothing.
   */
  const scored = passages.map((passage) => {
    let score = 0;
    for (const token of questionTokens) {
      if (!passage.tokens.has(token)) continue;
      score += 1 / (documentFrequency.get(token) ?? 1);
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

  /*
   * The start of a document is where its scope, contents and definitions live,
   * and a question naming something there can still lose to later passages that
   * happen to repeat the word more often. A small reserved share keeps the
   * opening reachable without giving up the budget that makes retrieval useful.
   */
  const earliestReserve = Math.min(3, Math.max(1, Math.floor(limit * 0.15)));
  const earliest = passages.slice(0, Math.max(earliestReserve, 1));

  const reserved = new Set(earliest.map((passage) => passage.index));
  const ranked = [
    ...relevant,
    // An early passage that scored nothing still competes, at the back.
    ...earliest
      .filter((passage) => !relevant.some((entry) => entry.passage.index === passage.index))
      .map((passage) => ({ passage, score: 0 })),
  ];

  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      positionOf(a.passage, passages.length) - positionOf(b.passage, passages.length)
  );

  const chosen: Passage[] = [];
  for (const entry of ranked) {
    if (chosen.length >= limit) break;
    if (reserved.has(entry.passage.index) || entry.score > 0) chosen.push(entry.passage);
  }

  return { selected: chosen, matched: true };
}

const AVG_CHARS_PER_PAGE = 1_800;

/**
 * Where an excerpt sits in its document.
 *
 * When the extractor recorded page numbers, they are used directly. Otherwise
 * the passage's position is converted to an estimate and marked as one, which
 * is what a PDF.co-extracted or plain-text upload allows for. The choice is
 * made per document — a document either has page markers or it does not.
 */
function describePages(
  passage: Passage,
  passages: Passage[],
  pageCount: number,
  exactPages: boolean
): string {
  if (exactPages && passage.startPage !== undefined) {
    const start = passage.startPage;
    const end = passage.endPage ?? start;
    const range = start === end ? `${start}` : `${start}–${end}`;
    return `page ${range} of ${pageCount}`;
  }

  const charsBefore = passages
    .slice(0, passage.index - 1)
    .reduce((total, entry) => total + entry.text.length, 0);
  const page = Math.max(1, Math.round(charsBefore / AVG_CHARS_PER_PAGE) + 1);
  return `≈ page ${page} of ${pageCount}`;
}

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
    const { passages, pageCount } = splitIntoPassages(doc.content);
    const exactPages = passages.some((passage) => passage.startPage !== undefined);
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

    const opening = passages[0];
    const limit = Math.min(MAX_PASSAGES_PER_DOCUMENT, Math.max(4, Math.ceil(perDocumentShare / TARGET_PASSAGE_CHARS)));

    const { selected, matched } = selectPassages(passages, question, limit);
    const chosen = [opening, ...selected.filter((passage) => passage.index !== opening.index)];

    const excerpts: string[] = [];
    let used = 0;
    for (const passage of chosen) {
      if (used + passage.text.length > perDocumentShare && excerpts.length > 0) break;
      excerpts.push(
        `[part ${passage.index} of ${passages.length}, ${describePages(passage, passages, pageCount, exactPages)}]\n${passage.text}`
      );
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
