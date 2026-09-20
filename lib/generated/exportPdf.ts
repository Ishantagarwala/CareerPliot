import type { ExportBlock, Inline, TableCell } from "../export/markdownBlocks";

/**
 * Writes a real PDF, by hand, with no PDF library.
 *
 * A PDF is a text format: objects, one content stream per page, two base-14
 * fonts. Emitting it directly means the generated document is real text —
 * selectable, searchable, screen-reader friendly — instead of a page image, and
 * it costs the bundle nothing. The alternative (rasterising a rendered page)
 * would also need a browser print dialog, which is not something the assistant
 * can drive on the student's behalf.
 *
 * Layout is done here rather than by a library because the input is already
 * structured: `ExportBlock` is the same block model the .docx writer consumes,
 * so both formats stay in step.
 */

// ─── PDF primitives ──────────────────────────────────────────────────────────

/**
 * WinAnsi (cp1252) is what the base-14 fonts are declared with. Text outside it
 * — emoji above all — cannot be drawn without embedding a font, so those code
 * points are dropped rather than printed as mojibake.
 */
const WIN_ANSI_EXTRA: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

const ZERO_WIDTH = /[\u200b-\u200d\u2060\ufe0f\u00ad]/g;

/**
 * Maps text to WinAnsi code points.
 *
 * The array matters: non-ASCII has to come back out as *bytes*, not as UTF-8.
 * Returning a JavaScript string here and letting TextEncoder handle it later
 * encodes ü as two bytes, and a reader then renders "Ã¼" — text that looks fine
 * in the source and is wrong in the document.
 */
function encodableCodes(text: string): number[] {
  const codes: number[] = [];
  for (const char of text.replace(ZERO_WIDTH, "")) {
    const code = char.codePointAt(0) as number;

    // A PDF has no tab stops; expand to four spaces.
    if (code === 9) {
      codes.push(32, 32, 32, 32);
      continue;
    }
    if (code === 10 || code === 13) {
      codes.push(32);
      continue;
    }
    if (code >= 0x20 && code <= 0x7e) {
      codes.push(code);
      continue;
    }
    if (code >= 0xa0 && code <= 0xff) {
      codes.push(code); // WinAnsi matches Latin-1 in this range
      continue;
    }
    const mapped = WIN_ANSI_EXTRA[code];
    // Unsupported glyphs (emoji, CJK) are dropped so the sentence stays intact.
    if (mapped !== undefined) codes.push(mapped);
  }
  return codes;
}

/**
 * A PDF literal string with WinAnsi bytes, escaped.
 *
 * Anything outside 0x20-0x7e goes out as `\ooo` octal: those bytes are ≥ 0x80,
 * and writing them raw would land in the file as UTF-8 again.
 */
function pdfString(text: string): string {
  let out = "(";
  for (const code of encodableCodes(text)) {
    if (code === 0x28) out += "\\(";
    else if (code === 0x29) out += "\\)";
    else if (code === 0x5c) out += "\\\\";
    else if (code >= 0x20 && code <= 0x7e) out += String.fromCharCode(code);
    else out += `\\${code.toString(8).padStart(3, "0")}`;
  }
  return `${out})`;
}

/** Objects are addressed by byte offset, so the file is assembled byte-wise. */
function buildPdf(objects: string[], infoObject: number): Blob {
  const chunks: Uint8Array[] = [];
  const encoder = new TextEncoder();
  let offset = 0;

  const push = (text: string) => {
    const bytes = encoder.encode(text);
    chunks.push(bytes);
    offset += bytes.length;
  };

  push("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");

  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(offset);
    push(`${index + 1} 0 obj\n${body}\nendobj\n`);
  });

  const xrefStart = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const objectOffset of offsets) {
    xref += `${String(objectOffset).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoObject} 0 R >>\n` +
      `startxref\n${xrefStart}\n%%EOF\n`
  );

  return new Blob(chunks.map((c) => c.slice()), { type: "application/pdf" });
}

// ─── Font metrics (AFM widths for the base-14 fonts) ─────────────────────────

const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const HELVETICA_BOLD_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

type PdfFont = "regular" | "bold" | "italic" | "mono";

/**
 * Widths for the WinAnsi range above ASCII, from the Adobe AFM tables. Only the
 * code points that survive `encodableCodes` are addressable, so this covers the
 * whole reachable range rather than the handful a test happened to use.
 */
const LATIN1_WIDTHS: Record<"regular" | "bold", number[]> = {
  regular: [
  278, 333, 556, 556, 556, 556, 556, 556, 278, 737,
  370, 556, 584, 333, 737, 333, 400, 584, 333, 333,
  333, 556, 537, 278, 333, 333, 365, 556, 834, 834,
  834, 611, 667, 667, 667, 667, 667, 667, 1000, 722,
  667, 667, 667, 667, 278, 278, 278, 278, 722, 722,
  778, 778, 778, 778, 778, 584, 778, 722, 722, 722,
  722, 667, 667, 611, 556, 556, 556, 556, 556, 556,
  889, 500, 556, 556, 556, 556, 278, 278, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 584, 611, 556,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  ],
  bold: [
  278, 333, 556, 556, 556, 556, 556, 556, 278, 737,
  365, 556, 584, 333, 737, 333, 400, 584, 333, 333,
  333, 611, 556, 278, 333, 333, 365, 556, 834, 834,
  834, 611, 722, 722, 722, 722, 722, 722, 1000, 722,
  667, 667, 667, 667, 278, 278, 278, 278, 722, 722,
  778, 778, 778, 778, 778, 584, 778, 722, 722, 722,
  722, 667, 667, 611, 556, 556, 556, 556, 556, 556,
  889, 556, 556, 556, 556, 556, 278, 278, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 584, 611, 556,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  ],
};

/** cp1252 bytes in 0x80-0x9F map to glyphs the ASCII table cannot describe. */
const HIGH_WIN_ANSI_WIDTHS: Record<number, number> = {
  0x80: 556, 0x82: 222, 0x83: 556, 0x84: 333, 0x85: 1000, 0x86: 556, 0x87: 556,
  0x88: 333, 0x89: 1000, 0x8a: 667, 0x8b: 333, 0x8c: 1000, 0x8e: 611, 0x91: 222,
  0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350, 0x96: 556, 0x97: 1000, 0x98: 333,
  0x99: 1000, 0x9a: 556, 0x9b: 333, 0x9c: 944, 0x9e: 556, 0x9f: 667,
};


function charWidth(font: PdfFont, code: number): number {
  if (font === "mono") return 600;
  const bold = font === "bold";
  if (code >= 32 && code <= 126) {
    return (bold ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS)[code - 32];
  }
  if (code >= 0xa0 && code <= 0xff) {
    return LATIN1_WIDTHS[bold ? "bold" : "regular"][code - 0xa0];
  }
  return HIGH_WIN_ANSI_WIDTHS[code] ?? 556;
}

/** Width of `text` in points at `size`. */
export function measureText(text: string, font: PdfFont, size: number): number {
  let total = 0;
  // Measured on the same code points that get written, so wrapping matches
  // what the reader will actually lay out.
  for (const code of encodableCodes(text)) total += charWidth(font, code);
  return (total * size) / 1000;
}

// ─── Inline styling ──────────────────────────────────────────────────────────

interface StyledChunk {
  text: string;
  font: PdfFont;
  /** Inline code gets a light background box. */
  code?: boolean;
  /** Recorded by the wrapper so a wrapped continuation keeps its size. */
  size?: number;
}

/**
 * Flattens inline runs into chunks. A run that is both bold and italic renders
 * bold — the base-14 set has no bold-italic here, and bold reads closer than
 * either alternative.
 */
function chunksFrom(runs: Inline[], base: PdfFont = "regular", code = false): StyledChunk[] {
  const chunks: StyledChunk[] = [];

  const push = (text: string, font: PdfFont, isCode: boolean) => {
    if (!text) return;
    const last = chunks[chunks.length - 1];
    if (last && last.font === font && Boolean(last.code) === isCode) last.text += text;
    else chunks.push({ text, font, code: isCode || undefined });
  };

  for (const run of runs) {
    if (run.kind === "link") {
      // A link prints as its text; the URL itself is noise on paper.
      for (const chunk of chunksFrom(run.runs, base, code)) push(chunk.text, chunk.font, Boolean(chunk.code));
      continue;
    }
    const isCode = Boolean(run.code) || code;
    const font: PdfFont = isCode
      ? "mono"
      : run.bold
      ? "bold"
      : run.italic
      ? "italic"
      : base;
    push(run.text.replace(/\s*\n\s*/g, " "), font, isCode);
  }

  return chunks;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 56;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 64;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const HEADING_SIZE: Record<number, number> = { 1: 20, 2: 16, 3: 13.5, 4: 12, 5: 11.5, 6: 11.5 };
const BODY_SIZE = 10.5;
const BODY_LEADING = 15.5;
const MONO_SIZE = 9;
const MONO_LEADING = 12.5;
const CODE_PADDING = 7;

const INK = "0.09 0.09 0.11";
const MUTED = "0.42 0.44 0.48";
const RULE = "0.85 0.86 0.89";
const CODE_BG = "0.96 0.965 0.975";
const HEAD_BG = "0.955 0.96 0.97";

interface TextOp {
  kind: "text";
  x: number;
  y: number;
  /** Font size for runs that do not carry their own (headings, table cells). */
  size: number;
  chunks: StyledChunk[];
}

interface RectOp {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

interface LineOp {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

type Op = TextOp | RectOp | LineOp;

interface LayoutPage {
  ops: Op[];
}

/** Size a chunk is drawn at: mono always uses the code size, else the run's. */
function chunkSize(chunk: StyledChunk, fallback: number): number {
  return chunk.size ?? (chunk.font === "mono" ? MONO_SIZE : fallback);
}

/** Accumulates ops and handles page breaks. */
class Canvas {
  readonly pages: LayoutPage[] = [{ ops: [] }];
  y = 0;

  constructor() {
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  get current(): LayoutPage {
    return this.pages[this.pages.length - 1];
  }

  get bottom(): number {
    return MARGIN_BOTTOM;
  }

  newPage() {
    this.pages.push({ ops: [] });
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  /** Ensures `height` fits, moving to a new page when it does not. */
  ensure(height: number) {
    if (this.y - height < this.bottom) this.newPage();
  }

  text(x: number, baseline: number, chunks: StyledChunk[], size = BODY_SIZE) {
    this.current.ops.push({ kind: "text", x, y: baseline, size, chunks });
  }

  rect(x: number, y: number, width: number, height: number, fill: string) {
    this.current.ops.push({ kind: "rect", x, y, width, height, fill });
  }

  line(x1: number, y1: number, x2: number, y2: number, color: string) {
    this.current.ops.push({ kind: "line", x1, y1, x2, y2, color });
  }
}

/** Wraps styled chunks to `width`, preserving each chunk's font. */
function wrapChunks(chunks: StyledChunk[], width: number, size: number): StyledChunk[][] {
  const lines: StyledChunk[][] = [];
  let line: StyledChunk[] = [];
  let lineWidth = 0;

  const pushLine = () => {
    lines.push(line);
    line = [];
    lineWidth = 0;
  };

  for (const chunk of chunks) {
    const font = chunk.font;
    const chunkAt = (text: string): StyledChunk => ({
      text,
      font,
      code: chunk.code,
      size: chunk.font === "mono" ? MONO_SIZE : size,
    });

    // Split on spaces but keep them, so long prose wraps like prose.
    const words = chunk.text.split(/(\s+)/).filter((part) => part !== "");

    for (const word of words) {
      const wordWidth = measureText(word, font, chunk.font === "mono" ? MONO_SIZE : size);

      if (/^\s+$/.test(word)) {
        if (line.length === 0) continue; // never start a line with a space
        line.push(chunkAt(" "));
        lineWidth += measureText(" ", font, size);
        continue;
      }

      if (lineWidth + wordWidth > width && line.length > 0) {
        pushLine();
      }

      // A single word wider than the column (a long URL, a hash) is broken.
      if (wordWidth > width) {
        let piece = "";
        for (const char of word) {
          const next = piece + char;
          if (measureText(next, font, size) > width && piece) {
            line.push(chunkAt(piece));
            pushLine();
            piece = char;
          } else {
            piece = next;
          }
        }
        if (piece) {
          line.push(chunkAt(piece));
          lineWidth += measureText(piece, font, size);
        }
        continue;
      }

      line.push(chunkAt(word));
      lineWidth += wordWidth;
    }
  }

  if (line.length) pushLine();
  return lines.length ? lines : [[{ text: "", font: "regular", size }]];
}

function drawWrapped(
  canvas: Canvas,
  x: number,
  chunks: StyledChunk[],
  width: number,
  size: number,
  leading: number
) {
  for (const line of wrapChunks(chunks, width, size)) {
    canvas.ensure(leading);
    canvas.y -= leading;
    canvas.text(x, canvas.y, line, size);
  }
}

/** Short inline-code runs get a background box behind the text. */
function drawInlineCodeBoxes(canvas: Canvas, x: number, baseline: number, chunks: StyledChunk[], size: number) {
  let cursor = x;
  for (const chunk of chunks) {
    const chunkDrawSize = chunkSize(chunk, size);
    const width = measureText(chunk.text, chunk.font, chunkDrawSize);
    if (chunk.code) {
      canvas.rect(cursor - 1, baseline - chunkDrawSize * 0.24, width + 2, chunkDrawSize * 1.06, HEAD_BG);
    }
    cursor += width;
  }
}

function columnWidths(rows: TableCell[][]): number[] {
  const columns = Math.max(...rows.map((row) => row.length));
  const MIN_WIDTH = 46;

  const natural: number[] = new Array(columns).fill(0);
  for (const row of rows) {
    row.forEach((cell, index) => {
      if (index >= columns) return;
      const text = cell.paragraphs
        .map((paragraph) =>
          paragraph
            .map((run) => (run.kind === "text" ? run.text : run.runs.map((r) => r.text).join("")))
            .join("")
        )
        .join(" ");
      natural[index] = Math.max(natural[index], measureText(text, cell.header ? "bold" : "regular", 9.5));
    });
  }

  if (columns * MIN_WIDTH >= CONTENT_WIDTH) {
    return new Array(columns).fill(CONTENT_WIDTH / columns);
  }

  /*
   * Each column gets a share in proportion to what it holds, with a floor so a
   * narrow column ("Day") is not handed the same width as a wide one
   * ("Key Topics") — which wrapped its heading to "Da / y".
   */
  const needs = natural.map((width) => Math.max(width + 14, MIN_WIDTH));
  const totalNeed = needs.reduce((sum, width) => sum + width, 0);
  const extras = needs.map((width) => width - MIN_WIDTH);
  const totalExtra = extras.reduce((sum, extra) => sum + extra, 0) || 1;

  const widths =
    totalNeed > CONTENT_WIDTH
      ? extras.map((extra) => MIN_WIDTH + (extra * (CONTENT_WIDTH - columns * MIN_WIDTH)) / totalExtra)
      : needs.map((width) => (width * CONTENT_WIDTH) / totalNeed);

  // Distribute rounding so table borders meet exactly.
  const drift = CONTENT_WIDTH - widths.reduce((sum, width) => sum + width, 0);
  if (Math.abs(drift) > 0.01) widths[widths.length - 1] += drift;
  return widths;
}

function drawTable(canvas: Canvas, rows: TableCell[][]) {
  const widths = columnWidths(rows);
  const cellSize = 9.5;
  const cellLeading = 12.5;
  const cellPadding = 5;

  for (const row of rows) {
    // Wrap every cell first so the row's height is known before drawing.
    const wrapped = row.map((cell, index) => {
      const base: PdfFont = cell.header ? "bold" : "regular";
      const chunks = cell.paragraphs.flatMap((paragraph) => chunksFrom(paragraph, base));
      const lines = wrapChunks(chunks, widths[index] - cellPadding * 2, cellSize);
      return { cell, lines };
    });

    const rowHeight =
      Math.max(...wrapped.map((entry) => entry.lines.length)) * cellLeading + cellPadding * 2;

    if (canvas.y - rowHeight < canvas.bottom) canvas.newPage();

    const top = canvas.y;
    canvas.y -= rowHeight;

    wrapped.forEach((entry, index) => {
      const cellX = MARGIN_X + widths.slice(0, index).reduce((sum, w) => sum + w, 0);
      if (entry.cell.header) {
        canvas.rect(cellX, canvas.y, widths[index], rowHeight, HEAD_BG);
      }
      entry.lines.forEach((line, lineIndex) => {
        const baseline = top - cellPadding - cellSize - lineIndex * cellLeading;
        canvas.text(cellX + cellPadding, baseline, line, cellSize);
      });
      // Cell borders.
      canvas.line(cellX, top, cellX, canvas.y, RULE);
      canvas.line(cellX, canvas.y, cellX + widths[index], canvas.y, RULE);
    });

    canvas.line(MARGIN_X, top, MARGIN_X + CONTENT_WIDTH, top, RULE);
  }

  canvas.line(MARGIN_X, canvas.y, MARGIN_X + CONTENT_WIDTH, canvas.y, RULE);
}

function layout(blocks: ExportBlock[]): Canvas {
  const canvas = new Canvas();

  for (const block of blocks) {
    switch (block.kind) {
      case "heading": {
        const size = HEADING_SIZE[block.level] ?? BODY_SIZE;
        const leading = size * 1.28;
        const gapBefore = block.level <= 2 ? 16 : 12;
        canvas.ensure(leading + gapBefore);
        canvas.y -= gapBefore;
        drawWrapped(canvas, MARGIN_X, chunksFrom(block.runs, "bold"), CONTENT_WIDTH, size, leading);
        canvas.y -= 3;
        break;
      }

      case "paragraph": {
        canvas.ensure(BODY_LEADING);
        canvas.y -= 5;
        const chunks = chunksFrom(block.runs);
        for (const line of wrapChunks(chunks, CONTENT_WIDTH, BODY_SIZE)) {
          canvas.ensure(BODY_LEADING);
          canvas.y -= BODY_LEADING;
          drawInlineCodeBoxes(canvas, MARGIN_X, canvas.y, line, BODY_SIZE);
          canvas.text(MARGIN_X, canvas.y, line);
        }
        break;
      }

      case "list": {
        const counters = new Map<number, number>();
        for (const item of block.items) {
          const level = Math.min(item.level, 3);
          const indent = 16 + level * 16;
          const marker = block.ordered ? `${(counters.get(level) ?? 0) + 1}.` : "•";
          counters.set(level, (counters.get(level) ?? 0) + 1);
          for (const deeper of [...counters.keys()]) {
            if (deeper > level) counters.delete(deeper);
          }

          const chunks = chunksFrom(item.runs);
          const lines = wrapChunks(chunks, CONTENT_WIDTH - indent - 12, BODY_SIZE);
          lines.forEach((line, index) => {
            canvas.ensure(BODY_LEADING);
            canvas.y -= BODY_LEADING;
            if (index === 0) {
              canvas.text(MARGIN_X + indent, canvas.y, [{ text: marker, font: block.ordered ? "regular" : "bold" }]);
            }
            canvas.text(MARGIN_X + indent + 12, canvas.y, line);
          });
        }
        canvas.y -= 4;
        break;
      }

      case "code": {
        const lines = block.text.split("\n");
        const inner = CONTENT_WIDTH - CODE_PADDING * 2;
        const wrapped: StyledChunk[][] = [];
        for (const line of lines) {
          // Preserve indentation: code is broken by column, not re-flowed.
          for (const piece of wrapChunks([{ text: line || " ", font: "mono" }], inner, MONO_SIZE)) {
            wrapped.push(piece);
          }
        }

        canvas.y -= 8;
        if (block.language) {
          canvas.ensure(12);
          canvas.y -= 12;
          canvas.text(MARGIN_X, canvas.y, [{ text: block.language.toUpperCase(), font: "bold", size: 8 }]);
          canvas.y -= 2;
        }

        for (const line of wrapped) {
          // A page break mid-block reopens it with its own top padding.
          if (canvas.y - MONO_LEADING - CODE_PADDING < canvas.bottom) {
            canvas.newPage();
            canvas.y -= CODE_PADDING;
          }
          canvas.y -= MONO_LEADING;
          canvas.rect(MARGIN_X, canvas.y - 2.5, CONTENT_WIDTH, MONO_LEADING, CODE_BG);
          canvas.text(MARGIN_X + CODE_PADDING, canvas.y, line, MONO_SIZE);
        }
        canvas.y -= 8;
        break;
      }

      case "quote": {
        const chunks = chunksFrom(block.runs, "italic");
        for (const line of wrapChunks(chunks, CONTENT_WIDTH - 14, BODY_SIZE)) {
          canvas.ensure(BODY_LEADING);
          canvas.y -= BODY_LEADING;
          canvas.rect(MARGIN_X, canvas.y - 2, 2, BODY_LEADING, RULE);
          canvas.text(MARGIN_X + 14, canvas.y, line);
        }
        canvas.y -= 4;
        break;
      }

      case "table":
        canvas.y -= 8;
        drawTable(canvas, block.rows);
        canvas.y -= 8;
        break;

      case "chart": {
        // A chart's numbers are the content; a PDF prints them as a table.
        const head: TableCell[] = [
          { paragraphs: [[{ kind: "text", text: "Label" }]], header: true },
          { paragraphs: [[{ kind: "text", text: "Value" }]], header: true },
        ];
        const body: TableCell[][] = block.chart.rows.map((row) => [
          { paragraphs: [[{ kind: "text", text: row.label }]] },
          { paragraphs: [[{ kind: "text", text: row.value }]] },
        ]);
        if (block.chart.caption) {
          canvas.ensure(16);
          canvas.y -= 14;
          canvas.text(MARGIN_X, canvas.y, [{ text: block.chart.caption, font: "bold" }]);
        }
        canvas.y -= 6;
        drawTable(canvas, [head, ...body]);
        canvas.y -= 8;
        break;
      }

      case "image":
        // Diagrams are embedded in the .docx and inlined in Markdown; a PDF
        // without embedded fonts cannot draw them, so the caption stands in and
        // the reader is pointed at the other two formats.
        if (block.image.caption) {
          canvas.ensure(BODY_LEADING);
          canvas.y -= BODY_LEADING;
          canvas.text(MARGIN_X, canvas.y, [
            { text: `${block.image.caption} — open the Word or Markdown version for the diagram.`, font: "italic" },
          ]);
        }
        break;

      case "rule": {
        canvas.ensure(14);
        canvas.y -= 12;
        canvas.line(MARGIN_X, canvas.y, MARGIN_X + CONTENT_WIDTH, canvas.y, RULE);
        break;
      }
    }
  }

  return canvas;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

const FONT_RESOURCE: Record<PdfFont, { name: string; base: string }> = {
  regular: { name: "F1", base: "Helvetica" },
  bold: { name: "F2", base: "Helvetica-Bold" },
  italic: { name: "F3", base: "Helvetica-Oblique" },
  mono: { name: "F4", base: "Courier" },
};

function pageContent(page: LayoutPage, index: number, total: number, title: string): string {
  const parts: string[] = [];

  // Fills and strokes first, so text is never painted over a table cell.
  for (const op of page.ops) {
    if (op.kind === "rect") {
      parts.push(
        `q ${op.fill} rg ${op.x.toFixed(2)} ${op.y.toFixed(2)} ${op.width.toFixed(2)} ${op.height.toFixed(2)} re f Q`
      );
    } else if (op.kind === "line") {
      parts.push(
        `q ${op.color} RG 0.6 w ${op.x1.toFixed(2)} ${op.y1.toFixed(2)} m ${op.x2.toFixed(2)} ${op.y2.toFixed(2)} l S Q`
      );
    }
  }

  /*
   * Text is emitted after every fill and stroke on the page, and each run is
   * positioned absolutely: a relative Td chain would accumulate rounding error
   * and drift long table rows out of their columns.
   */
  const textSection: string[] = [];
  for (const op of page.ops) {
    if (op.kind !== "text" || !op.chunks.length) continue;
    let x = op.x;
    for (const chunk of op.chunks) {
      if (chunk.text === "") continue;
      const size = chunkSize(chunk, op.size);
      const font = FONT_RESOURCE[chunk.font];
      textSection.push(
        `BT /${font.name} ${size} Tf ${INK} rg 1 0 0 1 ${x.toFixed(2)} ${op.y.toFixed(2)} Tm ${pdfString(
          chunk.text
        )} Tj ET`
      );
      x += measureText(chunk.text, chunk.font, size);
    }
  }

  // Header rule and footer, drawn last so they sit on top of page content.
  const footerY = MARGIN_BOTTOM - 26;
  const footer = [
    `q ${RULE} RG 0.6 w ${MARGIN_X} ${footerY + 14} m ${PAGE_WIDTH - MARGIN_X} ${footerY + 14} l S Q`,
    `BT /F1 8 Tf ${MUTED} rg 1 0 0 1 ${MARGIN_X} ${footerY} Tm ${pdfString(title.slice(0, 80))} Tj ET`,
  ];
  const label = `${index} / ${total}`;
  footer.push(
    `BT /F1 8 Tf ${MUTED} rg 1 0 0 1 ${(PAGE_WIDTH - MARGIN_X - measureText(label, "regular", 8)).toFixed(
      2
    )} ${footerY} Tm ${pdfString(label)} Tj ET`
  );

  const shapes = parts.filter((p) => p.startsWith("q "));
  return [...shapes, ...textSection, ...footer].join("\n");
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface PdfBuildInput {
  title: string;
  meta?: string;
  blocks: ExportBlock[];
}

/**
 * Object numbering is fixed and declared once, because the page objects
 * reference each other and the trailer references the catalog:
 *
 *   1 catalog · 2 pages tree · 3-6 fonts · 7 info · 8+ one page + stream per page
 *
 * Slots are reserved up front and filled in afterwards; pushing in a different
 * order silently overwrites a page object with the info dictionary.
 */
const INFO_OBJECT = 7;
const FIRST_PAGE_OBJECT = 8;

export function buildPdfBlob({ title, meta, blocks }: PdfBuildInput): Blob {
  const canvas = layout(blocks);
  const total = canvas.pages.length;

  const objects: string[] = new Array(FIRST_PAGE_OBJECT - 1 + canvas.pages.length * 2);

  objects[0] = `<< /Type /Catalog /Pages 2 0 R >>`;

  const pageObjectNumbers = canvas.pages.map((_, index) => FIRST_PAGE_OBJECT + index * 2);

  objects[1] =
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`;

  Object.values(FONT_RESOURCE).forEach((font, index) => {
    objects[2 + index] = `<< /Type /Font /Subtype /Type1 /BaseFont /${font.base} /Encoding /WinAnsiEncoding >>`;
  });

  objects[INFO_OBJECT - 1] =
    `<< /Title ${pdfString(title)} /Producer (CareerPilot) /Creator (CareerPilot AI Study Hub)${
      meta ? ` /Subject ${pdfString(meta)}` : ""
    } >>`;

  canvas.pages.forEach((page, index) => {
    const content = pageContent(page, index + 1, total, title);
    const pageObject = pageObjectNumbers[index];
    objects[pageObject - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(
        2
      )}] /Resources << /Font << ${Object.values(FONT_RESOURCE)
        .map((font, fontIndex) => `/${font.name} ${3 + fontIndex} 0 R`)
        .join(" ")} >> >> /Contents ${pageObject + 1} 0 R >>`;
    objects[pageObject] = `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`;
  });

  return buildPdf(objects, INFO_OBJECT);
}
