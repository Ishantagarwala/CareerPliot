/**
 * Turning extracted PDF pages into the text the app stores.
 *
 * Kept separate from the parsing call so the shaping rules can be tested
 * without a PDF, and so the page boundaries a parser reports survive into the
 * stored text — the chat's retrieval reads them to cite a passage's page.
 */

/** Pages are joined with this marker; `documentContext` reads it back. */
export function pageMarker(page: number, total: number): string {
  return `-- ${page} of ${total} --`;
}

/**
 * Lines that appear on most pages are the document's running header or footer,
 * not content.
 *
 * A university handout repeats "Programme: … / Course Name: … / Class: …" on
 * all 42 of its pages — 14% of the extracted text, spent on every passage that
 * reaches the model, and carrying a page number of its own that competes with
 * the one the app cites.
 *
 * The threshold is deliberately high. A line has to repeat on most pages to
 * qualify, so a genuinely repeated sentence inside the body is safe; only
 * boilerplate that is identical every time is removed.
 */
const REPEAT_THRESHOLD = 0.6;
const MIN_LINE_CHARS = 4;
const MAX_LINE_CHARS = 120;

export function repeatedLines(pages: string[]): Set<string> {
  if (pages.length < 3) return new Set();

  const counts = new Map<string, number>();
  for (const page of pages) {
    // A line counts once per page, even if it somehow appears twice on it.
    const seen = new Set<string>();
    for (const rawLine of page.split("\n")) {
      const line = rawLine.trim();
      if (line.length < MIN_LINE_CHARS || line.length > MAX_LINE_CHARS) continue;
      if (seen.has(line)) continue;
      seen.add(line);
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }

  const threshold = pages.length * REPEAT_THRESHOLD;
  const repeated = new Set<string>();
  for (const [line, count] of counts) {
    if (count >= threshold) repeated.add(line);
  }
  return repeated;
}

export interface StoredPageText {
  page: number;
  text: string;
}

/**
 * Removes the running header/footer from each page.
 *
 * Only the edges of a page are considered — a repeated line in the middle is
 * part of the flow and is left alone.
 */
export function stripRepeatedLines(pages: string[]): string[] {
  const repeated = repeatedLines(pages);
  if (!repeated.size) return pages;

  return pages.map((page) => {
    const lines = page.split("\n");
    let start = 0;
    let end = lines.length;

    while (start < end && (!lines[start].trim() || repeated.has(lines[start].trim()))) start++;
    while (end > start && (!lines[end - 1].trim() || repeated.has(lines[end - 1].trim()))) end--;

    return lines.slice(start, end).join("\n");
  });
}

/**
 * Assembles stored text from parsed pages, one marker per page.
 *
 * A `-- N of M --` marker is written *after* each page, which is the order
 * `documentContext` expects when it reads pages back.
 */
export function assembleStoredText(pages: StoredPageText[], reportedTotal?: number): string {
  const total = Math.max(reportedTotal ?? 0, pages.length);
  const cleaned = stripRepeatedLines(pages.map((entry) => entry.text));

  return pages
    .map((entry, index) => `${cleaned[index]}\n${pageMarker(entry.page, total)}\n`)
    .join("\n");
}
