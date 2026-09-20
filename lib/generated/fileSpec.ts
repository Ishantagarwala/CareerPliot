/**
 * The `file` block: how the assistant hands the student an actual document.
 *
 * Same contract as the existing `mermaid` and `chart` fences — the model emits
 * a fenced block, the interface turns it into something better than code. Here
 * the block carries a whole document, which is then rendered and offered as a
 * real .pdf / .docx / .md download.
 *
 * The opening fence is `~~~file` rather than ``` ```file ```, and the prompt
 * requires tildes. A generated document routinely contains its own ``` fences;
 * nesting those inside a backtick fence ends the outer block early, which cut
 * real documents off mid-JSON. Tildes cannot collide with them. Backtick form
 * is still accepted, because a model may fall back to it anyway.
 *
 * Expected shape:
 *   ~~~file
 *   {
 *     "filename": "javascript-interview-guide",
 *     "format": "pdf" | "docx" | "md",
 *     "title": "optional display title",
 *     "markdown": "# Heading\n\nBody…"
 *   }
 *   ~~~
 */

export type FileFormat = "pdf" | "docx" | "md";

export interface GeneratedFileSpec {
  /** Display name without an extension; sanitized for use on disk. */
  filename: string;
  format: FileFormat;
  title: string;
  /** The document body, in Markdown — the one format every renderer shares. */
  markdown: string;
}

/**
 * A runaway document would otherwise be assembled in the browser tab. Well
 * above a real study guide, well below anything that locks up a phone.
 */
export const MAX_GENERATED_DOC_CHARS = 200_000;
export const MAX_FILES_PER_REPLY = 3;

const MAX_FILENAME_CHARS = 70;

const FORMAT_ALIASES: Record<string, FileFormat> = {
  pdf: "pdf",
  docx: "docx",
  doc: "docx",
  word: "docx",
  md: "md",
  markdown: "md",
  txt: "md",
  text: "md",
};

/** Strips anything that would be a path, a hidden file, or unreadable. */
export function sanitizeDocFilename(raw: string, fallback = "careerpilot-document"): string {
  const cleaned = String(raw || "")
    .replace(/\.[a-z0-9]{1,5}$/i, "") // the extension is decided by `format`
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/^[.\s]+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_FILENAME_CHARS)
    .trim();
  return cleaned || fallback;
}

/** First heading, or first non-empty line — used when `title` is missing. */
function titleFromMarkdown(markdown: string): string {
  const heading = markdown.match(/^\s{0,3}#{1,3}\s+(.+)$/m)?.[1];
  if (heading) return heading.replace(/[*_`]/g, "").trim().slice(0, 120);
  const line = markdown.split("\n").find((l) => l.trim());
  return (line || "").trim().slice(0, 120);
}

/**
 * Returns the first complete JSON object in `raw`, ignoring anything after it.
 *
 * Models habitually append the closing fence on the same line as the JSON
 * (`…}````), which makes `JSON.parse` throw on the trailing backticks even
 * though the object itself is whole. Scanning for the matching brace — while
 * respecting strings and escapes — recovers the document instead of dropping
 * the student back to a wall of raw JSON.
 */
function firstJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i++) {
    const char = raw[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      if (inString) escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }

  return null;
}

/**
 * Parses a `file` block. Returns `null` when the payload is not a usable
 * document, in which case the caller falls back to showing the block as code —
 * the same degradation the chart block uses.
 */
export function parseGeneratedFile(raw: string): GeneratedFileSpec | null {
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const candidate = firstJsonObject(trimmed);
    if (!candidate) return null;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const obj = parsed as Record<string, unknown>;

  /*
   * The body field is the one thing that cannot be guessed, and models reach
   * for a few names for it. `content` was the most common miss.
   */
  const markdown = [obj.markdown, obj.content, obj.body, obj.text].find(
    (value) => typeof value === "string" && value.trim().length > 0
  ) as string | undefined;
  if (!markdown) return null;
  if (markdown.length > MAX_GENERATED_DOC_CHARS) return null;

  const format = FORMAT_ALIASES[String(obj.format ?? "").toLowerCase().trim()] ?? "pdf";
  const title = (typeof obj.title === "string" && obj.title.trim()) || titleFromMarkdown(markdown);
  const filename = sanitizeDocFilename(
    typeof obj.filename === "string" ? obj.filename : title
  );

  return { filename, format, title: title || filename, markdown };
}

export function fileExtension(format: FileFormat): string {
  return format;
}

/** Rough size of the produced document, for the card's "about 12 KB" hint. */
export function estimateDocBytes(spec: GeneratedFileSpec): number {
  // Prose compresses; a PDF's object overhead and a docx's XML both land in the
  // same order of magnitude, so one estimate serves all three formats.
  return Math.round((spec.markdown.length + 3_000) * 0.75);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
