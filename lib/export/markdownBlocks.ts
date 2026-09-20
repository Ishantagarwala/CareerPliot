/**
 * Turns a finished AI Hub reply into a real file the student can keep.
 *
 * Everything here runs in the browser against the reply's *rendered* DOM
 * rather than its Markdown source. That is deliberate: the rendered tree is
 * the only place where a mermaid diagram is a real SVG, a chart is real
 * numbers, and syntax-highlighted code has already been resolved — exporting
 * the Markdown would hand back fenced blocks the user never saw.
 *
 * The same block model drives both writers:
 *   - `buildExportHtml` → a self-contained page handed to the print dialog,
 *     where "Save as PDF" is a first-class browser feature (vector text,
 *     selectable, searchable) instead of a canvas screenshot.
 *   - `buildDocxBlob`   → a genuine OOXML `.docx` written by hand. Word will
 *     not open an HTML file renamed to `.docx`; it warns, then mangles it.
 */

// ─── Content model ───────────────────────────────────────────────────────────

export interface InlineText {
  kind: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
}

export interface InlineLink {
  kind: "link";
  href: string;
  runs: InlineText[];
}

export type Inline = InlineText | InlineLink;

export interface ListItem {
  runs: Inline[];
  level: number;
  /** Missing for plain bullets. */
  marker?: string;
}

export interface TableCell {
  /** Multi-line cell content, one entry per paragraph. */
  paragraphs: Inline[][];
  header?: boolean;
  colSpan?: number;
}

export interface EmbeddedImage {
  /** `data:image/png;base64,…`, empty when the raster is unavailable. */
  dataUrl: string;
  /** Serialised SVG, kept as a fallback when no raster could be produced. */
  svg?: string;
  widthPx: number;
  heightPx: number;
  caption?: string;
}

export interface ChartData {
  caption?: string;
  rows: Array<{ label: string; value: string }>;
}

export type ExportBlock =
  | { kind: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; runs: Inline[] }
  | { kind: "paragraph"; runs: Inline[] }
  | { kind: "list"; ordered: boolean; items: ListItem[] }
  | { kind: "code"; text: string; language?: string }
  | { kind: "quote"; runs: Inline[] }
  | { kind: "table"; rows: TableCell[][] }
  | { kind: "image"; image: EmbeddedImage }
  | { kind: "chart"; chart: ChartData }
  | { kind: "rule" };

export interface ExportDocument {
  title: string;
  meta?: string;
  blocks: ExportBlock[];
}

// ─── Small helpers ───────────────────────────────────────────────────────────

function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

function tagOf(el: Element): string {
  return el.tagName.toLowerCase();
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ");
}

function textOf(node: Element | null): string {
  return collapse(node?.textContent || "").trim();
}

/** Keep filenames readable and safe on every OS. */
export function sanitizeFilename(raw: string, fallback = "career-pilot-answer"): string {
  const cleaned = (raw || "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70);
  return cleaned || fallback;
}

// ─── DOM → blocks ────────────────────────────────────────────────────────────

function collectRuns(node: Node, inherited: Omit<InlineText, "kind" | "text">): Inline[] {
  const out: Inline[] = [];

  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || "";
      if (!text) return;
      out.push({ kind: "text", text, ...inherited });
      return;
    }
    if (!isElement(child)) return;

    const el = child;
    const tag = tagOf(el);

    if (tag === "br") {
      out.push({ kind: "text", text: "\n", ...inherited });
      return;
    }

    if (tag === "a") {
      const href = el.getAttribute("href") || "";
      const runs = collectRuns(el, inherited).filter(
        (run): run is InlineText => run.kind === "text"
      );
      // Anchors that only wrap an image carry no text; drop them rather than
      // emitting an empty link.
      if (runs.length === 0 || !href) {
        out.push(...runs);
        return;
      }
      out.push({ kind: "link", href, runs });
      return;
    }

    if (tag === "img") return; // handled as an image block

    const next = { ...inherited };
    if (tag === "strong" || tag === "b") next.bold = true;
    if (tag === "em" || tag === "i") next.italic = true;
    if (tag === "del" || tag === "s") next.strike = true;
    if (tag === "code" && el.closest("pre") === null) next.code = true;

    out.push(...collectRuns(el, next));
  });

  return out;
}

function runsOf(el: Element): Inline[] {
  return trimRuns(
    collectRuns(el, {}).filter((run) => run.kind !== "text" || run.text.length > 0)
  );
}

/**
 * Drops the whitespace that block-level HTML leaves at the *edges* of a run
 * list.
 *
 * ReactMarkdown wraps its output in indented JSX, so a list item carries the
 * newline that surrounds a nested <ul> and a heading can start with a space.
 * Whitespace between two runs is left alone: that space is real text.
 */
function trimRuns(runs: Inline[]): Inline[] {
  const out: Inline[] = runs.map((run) =>
    run.kind === "text" ? { ...run } : { ...run, runs: run.runs.map((r) => ({ ...r })) }
  );

  const firstText = (run: Inline | undefined): { text: string } | undefined =>
    run?.kind === "text" ? run : run?.kind === "link" ? run.runs[0] : undefined;
  const lastText = (run: Inline | undefined): { text: string } | undefined =>
    run?.kind === "text"
      ? run
      : run?.kind === "link"
      ? run.runs[run.runs.length - 1]
      : undefined;

  const head = firstText(out[0]);
  if (head) head.text = head.text.replace(/^[^\S\n]+/, "").replace(/\n\s*/g, "");
  const tail = lastText(out[out.length - 1]);
  if (tail) tail.text = tail.text.replace(/[^\S\n]+$/, "").replace(/\s*\n$/g, "");

  if (out[0]?.kind === "text" && out[0].text === "") out.shift();
  const end = out[out.length - 1];
  if (end?.kind === "text" && end.text === "") out.pop();

  return out;
}

function isInlineOnlyImage(el: Element): EmbeddedImage | null {
  const img = tagOf(el) === "img" ? el : el.querySelector("img");
  if (!img) return null;
  if (tagOf(el) !== "img" && textOf(el)) return null;

  const src = img.getAttribute("src") || "";
  if (!src.startsWith("data:image/")) return null;

  const width = Number(img.getAttribute("width")) || 640;
  const height = Number(img.getAttribute("height")) || 360;
  return { dataUrl: src, widthPx: width, heightPx: height, caption: img.getAttribute("alt") || undefined };
}

function chartFromFigure(el: Element): ChartData | null {
  const captions = Array.from(el.querySelectorAll("figcaption"));
  const caption = captions.length ? textOf(captions[0]) : undefined;
  const table = el.querySelector("table");
  if (!table) return null;

  const rows: Array<{ label: string; value: string }> = [];
  table.querySelectorAll("tr").forEach((tr) => {
    const cells = Array.from(tr.querySelectorAll("th, td"));
    if (cells.length < 2) return;
    const label = textOf(cells[0]);
    const value = textOf(cells[1]);
    if (!label) return;
    rows.push({ label, value });
  });

  return rows.length ? { caption, rows } : null;
}

function listItems(
  list: Element,
  ordered: boolean,
  level: number,
  out: ListItem[] = []
): ListItem[] {
  /*
   * Walks the list in place instead of cloning each <li> and slicing out its
   * sub-lists first. Cloning detached the nested lists before they were
   * descended into, which silently flattened every level past the first to
   * "level 1" — nested outlines came out flat.
   */
  Array.from(list.children).forEach((child, index) => {
    if (tagOf(child) !== "li") return;

    const clone = child.cloneNode(true) as Element;
    const nested = Array.from(clone.querySelectorAll("ul, ol"));
    nested.forEach((nestedList) => nestedList.remove());

    const runs = runsOf(clone).filter(
      (run) => run.kind !== "text" || run.text.trim().length > 0
    );
    if (runs.length) {
      out.push({ runs, level, marker: ordered ? `${index + 1}.` : undefined });
    }

    // Depth comes from the walk, so a detached subtree cannot lose it.
    Array.from(child.children)
      .filter((descendant) => tagOf(descendant) === "ul" || tagOf(descendant) === "ol")
      .forEach((nestedList) => {
        listItems(nestedList, tagOf(nestedList) === "ol", level + 1, out);
      });
  });

  return out;
}

function tableFrom(el: Element): ExportBlock | null {
  const table = tagOf(el) === "table" ? el : el.querySelector("table");
  if (!table) return null;

  const rows: TableCell[][] = [];
  table.querySelectorAll("tr").forEach((tr) => {
    const cells: TableCell[] = [];
    Array.from(tr.children).forEach((cell) => {
      const tag = tagOf(cell);
      if (tag !== "td" && tag !== "th") return;

      const paragraphs: Inline[][] = [];
      const blocks = Array.from(cell.children).filter((c) => tagOf(c) === "p");
      if (blocks.length) {
        blocks.forEach((p) => {
          const runs = runsOf(p);
          if (runs.length) paragraphs.push(runs);
        });
      }
      if (!paragraphs.length) {
        const runs = runsOf(cell);
        if (runs.length) paragraphs.push(runs);
      }
      if (!paragraphs.length) paragraphs.push([{ kind: "text", text: "" }]);

      cells.push({
        paragraphs,
        header: tag === "th",
        colSpan: Number(cell.getAttribute("colspan")) || undefined,
      });
    });
    if (cells.length) rows.push(cells);
  });

  return rows.length ? { kind: "table", rows } : null;
}

function codeBlockFrom(pre: Element): ExportBlock {
  const code = pre.querySelector("code") || pre;
  // highlight.js emits one span per token; textContent stitches them back.
  const text = (code.textContent || "").replace(/\n+$/, "");

  const wrapper = pre.closest("div");
  const label = wrapper
    ? collapse(wrapper.querySelector("span")?.textContent || "").trim()
    : "";
  const language = label && label.toLowerCase() !== "code" ? label : undefined;

  return { kind: "code", text, language };
}

function blocksFrom(root: Element): ExportBlock[] {
  const blocks: ExportBlock[] = [];

  const walk = (el: Element) => {
    const tag = tagOf(el);

    if (tag === "button" || tag === "script" || tag === "style" || tag === "noscript") {
      return;
    }

    // A mermaid figure (svg) or a chart figure (svg/canvas/table) — both are
    // preserved as a picture plus its underlying data.
    if (tag === "figure") {
      const rows = chartFromFigure(el);
      if (rows) {
        blocks.push({ kind: "chart", chart: rows });
        return;
      }
    }

    if (tag === "svg") {
      const svg = el as unknown as SVGSVGElement;
      const { width, height } = svgSize(svg);
      blocks.push({
        kind: "image",
        // Placeholder: `withRasterisedImages` replaces it with a PNG. An
        // un-rasterisable diagram still exports as its source text.
        image: { dataUrl: "", widthPx: width, heightPx: height, caption: "Diagram" },
      });
      return;
    }

    if (/^h[1-6]$/.test(tag)) {
      const runs = runsOf(el);
      if (runs.length) {
        blocks.push({
          kind: "heading",
          level: Number(tag.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6,
          runs,
        });
      }
      return;
    }

    if (tag === "p") {
      const image = isInlineOnlyImage(el);
      if (image) {
        blocks.push({ kind: "image", image });
        return;
      }
      const runs = runsOf(el);
      if (runs.length) blocks.push({ kind: "paragraph", runs });
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const items = listItems(el, tag === "ol", 0);
      if (items.length) blocks.push({ kind: "list", ordered: tag === "ol", items });
      return;
    }

    if (tag === "pre") {
      const block = codeBlockFrom(el);
      if (block.kind === "code" && block.text.trim()) blocks.push(block);
      return;
    }

    if (tag === "blockquote") {
      const runs = runsOf(el);
      if (runs.length) blocks.push({ kind: "quote", runs });
      return;
    }

    if (tag === "table") {
      const block = tableFrom(el);
      if (block) blocks.push(block);
      return;
    }

    if (tag === "hr") {
      blocks.push({ kind: "rule" });
      return;
    }

    if (tag === "img") {
      const image = isInlineOnlyImage(el);
      if (image) blocks.push({ kind: "image", image });
      return;
    }

    // Anything else (the markdown wrapper's div, a figure with a plain image)
    // is descended into so nested content is never dropped.
    Array.from(el.children).forEach(walk);
  };

  Array.from(root.children).forEach(walk);
  return blocks;
}

export function blocksFromElement(root: HTMLElement): ExportBlock[] {
  return blocksFrom(root);
}

// ─── Diagram rasterisation ───────────────────────────────────────────────────

/**
 * Resolves a diagram's pixel size.
 *
 * `getBoundingClientRect` is authoritative but returns zero whenever the SVG is
 * not laid out (a background tab, a print window that has not painted). Falling
 * through to the SVG's own width/height, then its viewBox, and finally a sane
 * default means a diagram is never silently dropped from an export.
 */
function svgSize(svg: SVGSVGElement): { width: number; height: number } {
  const rect = svg.getBoundingClientRect();
  let width = Math.round(rect.width);
  let height = Math.round(rect.height);

  const numeric = (value: string | null) => {
    const parsed = Number.parseFloat(String(value || "").replace(/px$/, ""));
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
  };

  if (!width || !height) width = width || numeric(svg.getAttribute("width"));
  if (!width || !height) height = height || numeric(svg.getAttribute("height"));

  const viewBox = (svg.getAttribute("viewBox") || "").split(/[\s,]+/).filter(Boolean).map(Number);
  if (viewBox.length === 4) {
    const [, , boxWidth, boxHeight] = viewBox;
    if (!width && boxWidth > 0) width = Math.round(boxWidth);
    if (!height && boxHeight > 0) height = Math.round(boxHeight);
  }

  return { width: width || 720, height: height || 420 };
}

function svgFromMermaid(svg: SVGSVGElement): { markup: string; width: number; height: number } | null {
  try {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll("button, .mermaid-controls, [data-export-skip]").forEach((n) => n.remove());

    const viewBox = svg.getAttribute("viewBox");
    const { width, height } = svgSize(svg);

    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    if (!viewBox) clone.setAttribute("viewBox", `0 0 ${width} ${height}`);

    return { markup: new XMLSerializer().serializeToString(clone), width, height };
  } catch (error) {
    console.error("Reply export: could not serialise the diagram SVG", error);
    return null;
  }
}

/** Width/height from a PNG data URL's IHDR — the raster's true pixel size. */
function pngSize(dataUrl: string): { width: number; height: number } | null {
  try {
    const base64 = dataUrl.split(",")[1] || "";
    const binary = atob(base64.slice(0, 64));
    if (binary.slice(0, 8) !== "\x89PNG\r\n\x1a\n") return null;
    const view = new DataView(new ArrayBuffer(8));
    for (let i = 0; i < 8; i++) view.setUint8(i, binary.charCodeAt(16 + i));
    const width = view.getUint32(0);
    const height = view.getUint32(4);
    return width > 0 && height > 0 ? { width, height } : null;
  } catch {
    return null;
  }
}

/**
 * Rasterises a diagram to PNG. An inline SVG containing `foreignObject` (which
 * is how mermaid draws wrapped labels) cannot be drawn into a canvas directly,
 * so it goes through an <img> first — the one path that renders it faithfully.
 */
async function rasteriseSvg(svg: SVGSVGElement, scale = 2): Promise<EmbeddedImage | null> {
  // Feature-detect rather than trusting the call: an environment without
  // canvas should fall back to the diagram's source, not throw mid-export.
  if (typeof XMLSerializer === "undefined" || typeof Image === "undefined") return null;
  if (!document.createElement("canvas").getContext("2d")) return null;

  const prepared = svgFromMermaid(svg);
  if (!prepared) return null;

  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(prepared.markup)}`;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(prepared.width * scale));
        canvas.height = Math.max(1, Math.round(prepared.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/png");
        /*
         * Use the raster's own pixel size rather than the placeholder's
         * estimate: the drawing extent in the .docx must match the picture, or
         * Word stretches it to the wrong aspect ratio.
         */
        const size = pngSize(dataUrl);
        resolve({
          dataUrl,
          widthPx: Math.round((size?.width || canvas.width) / scale),
          heightPx: Math.round((size?.height || canvas.height) / scale),
          caption: "Diagram",
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Replaces the diagram placeholders with rasterised pictures. When a diagram
 * cannot be drawn (no canvas in this environment, an SVG the browser refuses to
 * rasterise), the vector source is carried through instead — a diagram the
 * reader can still see and re-render beats a silently missing figure.
 */
async function withRasterisedImages(
  blocks: ExportBlock[],
  source: Map<number, SVGSVGElement>
): Promise<ExportBlock[]> {
  const out: ExportBlock[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.kind === "image" && !block.image.dataUrl) {
      const svg = source.get(i);
      if (!svg) continue;

      const prepared = svgFromMermaid(svg);
      const image = await rasteriseSvg(svg);
      if (image) {
        // Attach the vector too: the print path prefers it when it renders.
        out.push({ kind: "image", image: { ...image, svg: prepared?.markup } });
      } else if (prepared) {
        out.push({
          kind: "image",
          image: {
            dataUrl: "",
            svg: prepared.markup,
            widthPx: prepared.width,
            heightPx: prepared.height,
            caption: "Diagram",
          },
        });
      } else {
        // Not even serialisable: the caption is all that can be offered.
        out.push({ kind: "paragraph", runs: [{ kind: "text", text: "Diagram (not renderable)" }] });
      }
      continue;
    }
    out.push(block);
  }

  return out;
}

/**
 * Collects the diagram SVGs in the same document order `blocksFrom` walks, so
 * the nth image placeholder maps to the nth diagram.
 */
function collectDiagramSvgs(container: HTMLElement): SVGSVGElement[] {
  const svgs: SVGSVGElement[] = [];

  const walk = (el: Element) => {
    const tag = tagOf(el);
    if (tag === "button" || tag === "script" || tag === "style") return;
    if (tag === "figure" && chartFromFigure(el)) return; // charts are data, not diagrams
    if (tag === "svg") {
      svgs.push(el as unknown as SVGSVGElement);
      return;
    }
    Array.from(el.children).forEach(walk);
  };

  Array.from(container.children).forEach(walk);
  return svgs;
}

/**
 * The public entry point: rendered reply DOM → exportable blocks, with every
 * diagram already rasterised to PNG.
 */
export async function buildBlocksFromElement(container: HTMLElement): Promise<ExportBlock[]> {
  const blocks = blocksFrom(container);
  if (!blocks.some((b) => b.kind === "image" && !b.image.dataUrl)) return blocks;

  const svgs = collectDiagramSvgs(container);
  const byIndex = new Map<number, SVGSVGElement>();
  let next = 0;
  blocks.forEach((block, idx) => {
    if (block.kind === "image" && !block.image.dataUrl) {
      const svg = svgs[next++];
      if (svg) byIndex.set(idx, svg);
    }
  });

  return withRasterisedImages(blocks, byIndex);
}
