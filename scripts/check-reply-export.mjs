// Regression harness for the reply exporters.
//
//   rendered reply DOM → blocks → .docx (real OOXML) and print HTML
//
// The .docx checks are structural on purpose: Word and LibreOffice accept a
// surprising amount of malformed OOXML and then silently drop content, so a
// file that merely "opens" is not evidence. Every assertion here corresponds to
// a defect that was actually hit while building this feature.
//
// Run: node scripts/check-reply-export.mjs   (npm run check:export)
// It compiles lib/export to .tmp first, so it needs no browser and no network.
// The one dev-only dependency is `linkedom`, used to stand in for the browser
// DOM: npm i -D linkedom.
import { mkdirSync, writeFileSync } from "node:fs";
import { parseHTML } from "linkedom";
import { compileLibModules } from "./lib/compile-for-node.mjs";

const TMP = ".tmp/export-check";

compileLibModules({ tmp: TMP, outDir: "build" });

const { buildBlocksFromElement } = await import("../.tmp/export-check/build/export/markdownBlocks.js");
const { buildDocxBlob } = await import("../.tmp/export-check/build/export/exportDocx.js");
const { buildExportHtml } = await import("../.tmp/export-check/build/export/exportHtml.js");

// The exporters touch DOM APIs linkedom provides, plus three the browser has
// and it does not: Image, XMLSerializer and canvas. The stubs below reproduce
// browser behaviour so the tested path is the production path.
globalThis.Node = globalThis.Node || { ELEMENT_NODE: 1, TEXT_NODE: 3 };
globalThis.Image = class {
  set src(value) {
    this._src = value;
    queueMicrotask(() => this.onload?.());
  }
  get src() {
    return this._src;
  }
};

let failures = 0;
const check = (name, condition, detail = "") => {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

// ─── A reply DOM shaped like ReactMarkdown's output ──────────────────────────
const REPLY_HTML = `
<div class="break-words select-text">
  <h2>Big-O in practice</h2>
  <p>Use <strong>amortised</strong> analysis for <em>dynamic arrays</em>, and prefer
     <a href="https://example.com/big-o">a reference table</a> over memorising proofs.</p>
  <ul>
    <li>Constant time <code>O(1)</code></li>
    <li>Logarithmic time
      <ul><li>Binary search</li></ul>
    </li>
  </ul>
  <ol><li>Measure</li><li>Profile</li></ol>
  <blockquote>Premature optimisation is the root of all evil.</blockquote>
  <div class="my-4 overflow-hidden border">
    <div class="flex items-center justify-between">
      <span>python</span><button type="button">Copy</button>
    </div>
    <pre class="overflow-x-auto"><code><span class="hljs-keyword">def</span> <span class="hljs-title">binary_search</span>(items, target):
    lo, hi = 0, len(items) - 1
    while lo &lt;= hi:
        mid = (lo + hi) // 2</code></pre>
  </div>
  <div class="my-4 overflow-x-auto">
    <table>
      <thead><tr><th>Structure</th><th>Lookup</th></tr></thead>
      <tbody>
        <tr><td>Hash map</td><td>O(1)</td></tr>
        <tr><td>Sorted array</td><td>O(log n)</td></tr>
      </tbody>
    </table>
  </div>
  <figure class="my-4">
    <figcaption>Weekly study hours</figcaption>
    <div class="px-2 py-4"><svg viewBox="0 0 100 50" width="100" height="50"><rect width="100" height="50" fill="#eee"/></svg></div>
    <table class="sr-only"><caption>Weekly study hours</caption><tbody>
      <tr><th scope="row">Mon</th><td>2</td></tr>
      <tr><th scope="row">Tue</th><td>3.5</td></tr>
    </tbody></table>
  </figure>
  <div class="my-4 overflow-hidden rounded-lg border border-hub-line bg-hub-surface">
    <div class="flex items-center justify-between border-b border-hub-line px-3 py-2">
      <span class="text-[11px]">Flowchart</span>
      <div><button type="button">PNG</button><button type="button">Copy</button></div>
    </div>
    <div class="overflow-auto px-3 py-4">
      <div class="mermaid-host flex justify-center">
        <svg id="mermaid-1" viewBox="0 0 240 160" width="240" height="160" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="240" height="160" fill="#ffffff"/>
          <text x="12" y="30">Start</text>
        </svg>
      </div>
    </div>
  </div>
  <hr>
  <p>Unicode &amp; entities: 5 &lt; 6, ünïcode, emoji 🚀, and a stray <em>marker</em>.</p>
</div>`;

console.log("Reply DOM → blocks");
const { document, window } = parseHTML(`<html><body>${REPLY_HTML}</body></html>`);
globalThis.document = document;
globalThis.window = window;

// Canvas stub: returns a real 480x200 PNG so the .docx embeds a drawable image
// and the drawing extent can be checked against the raster's aspect ratio.
const SAMPLE_PNG_B64 =
  "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";
const originalCreateElement = document.createElement.bind(document);
document.createElement = (tag, ...rest) => {
  const el = originalCreateElement(tag, ...rest);
  if (String(tag).toLowerCase() === "canvas") {
    el.getContext = () => ({ fillRect() {}, drawImage() {}, set fillStyle(_v) {} });
    el.toDataURL = () => `data:image/png;base64,${SAMPLE_PNG_B64}`;
  }
  return el;
};
globalThis.XMLSerializer = class {
  serializeToString(node) {
    return String(node.outerHTML ?? node.toString());
  }
};

const root = document.querySelector("div.break-words");
const blocks = await buildBlocksFromElement(root);
const kinds = blocks.map((b) => b.kind);
console.log(`  blocks: ${kinds.join(", ")}`);

check("headings captured", kinds.filter((k) => k === "heading").length >= 1);
check("paragraphs captured", kinds.filter((k) => k === "paragraph").length >= 1);
check("lists captured", kinds.filter((k) => k === "list").length === 2);
check(
  "code captured with language",
  blocks.some((b) => b.kind === "code" && b.language === "python" && b.text.includes("binary_search"))
);
check("table captured", blocks.some((b) => b.kind === "table" && b.rows.length === 3));
check("chart captured as data, not svg", blocks.some((b) => b.kind === "chart" && b.chart.rows.length === 2));
check("rule captured", kinds.includes("rule"));

const listBlock = blocks.find((b) => b.kind === "list");
check(
  "nested list item keeps its level",
  listBlock?.items.some((i) => i.level === 1 && /Binary search/.test(JSON.stringify(i.runs)))
);
const paragraph = blocks.find((b) => b.kind === "paragraph");
check("inline link preserved", JSON.stringify(paragraph?.runs).includes("https://example.com/big-o"));
check("inline spacing preserved", paragraph?.runs.some((r) => r.kind === "text" && r.text === " analysis for "));
check("toolbar buttons dropped", !JSON.stringify(blocks).includes("Copy"));

const diagram = blocks.find((b) => b.kind === "image");
check("diagram rasterised", Boolean(diagram?.image.dataUrl.startsWith("data:image/png")));
check("diagram keeps its vector source", Boolean(diagram?.image.svg?.includes("<svg")));

// ─── DOCX ────────────────────────────────────────────────────────────────────
console.log("\nBlocks → .docx");
const doc = {
  title: "Big-O & Data Structures (2026-09-19)",
  meta: "19/09/2026, 18:00 · Generated by CareerPilot AI Study Hub",
  blocks,
};
const blob = buildDocxBlob(doc);
const bytes = new Uint8Array(await blob.arrayBuffer());
check("blob has the docx mime type", blob.type.includes("wordprocessingml"));
check("looks like a ZIP", bytes[0] === 0x50 && bytes[1] === 0x4b);

function readZip(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const files = new Map();
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("no end-of-central-directory record");
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);

  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("bad central directory entry");
    const method = view.getUint16(offset + 10, true);
    const crc = view.getUint32(offset + 16, true);
    const size = view.getUint32(offset + 24, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(buf.subarray(offset + 46, offset + 46 + nameLen));
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    files.set(name, { data: buf.subarray(dataStart, dataStart + size), method, crc });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const files = readZip(bytes);
for (const required of [
  "[Content_Types].xml",
  "_rels/.rels",
  "word/document.xml",
  "word/styles.xml",
  "word/_rels/document.xml.rels",
  "docProps/core.xml",
  "docProps/app.xml",
]) {
  check(`contains ${required}`, files.has(required));
}
check("all entries STOREd", [...files.values()].every((f) => f.method === 0));

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();
const crc32 = (b) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
check("every part's CRC matches", [...files.values()].every((f) => crc32(f.data) === f.crc));

const decoder = new TextDecoder();
const documentXml = decoder.decode(files.get("word/document.xml").data);
const relsXml = decoder.decode(files.get("word/_rels/document.xml.rels").data);
const stylesXml = decoder.decode(files.get("word/styles.xml").data);
const contentTypes = decoder.decode(files.get("[Content_Types].xml").data);

function xmlBalanced(xml, label) {
  const stack = [];
  const re = /<(\/?)([A-Za-z0-9:._-]+)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let match;
  while ((match = re.exec(xml))) {
    const [, closing, tag, , slash] = match;
    if (xml.slice(0, match.index).endsWith("<?")) continue;
    if (closing) {
      const open = stack.pop();
      if (open !== tag) return `${label}: </${tag}> closes <${open}>`;
    } else if (!slash) {
      stack.push(tag);
    }
  }
  return stack.length ? `${label}: unclosed ${stack.join(", ")}` : null;
}

for (const [name, xml] of [
  ["word/document.xml", documentXml],
  ["word/styles.xml", stylesXml],
  ["[Content_Types].xml", contentTypes],
  ["word/_rels/document.xml.rels", relsXml],
]) {
  const problem = xmlBalanced(xml, name);
  check(`${name} is well-formed`, problem === null, problem || "");
}

const relIds = new Set([...relsXml.matchAll(/Id="([^"]+)"/g)].map((m) => m[1]));
const usedRelIds = [...documentXml.matchAll(/r:(?:id|embed)="([^"]+)"/g)].map((m) => m[1]);
check("every referenced relationship is declared", usedRelIds.every((id) => relIds.has(id)),
  usedRelIds.filter((id) => !relIds.has(id)).join(", "));
check("hyperlink target is external", /Target="https:\/\/example\.com\/big-o" TargetMode="External"/.test(relsXml));

const media = [...files.keys()].filter((n) => n.startsWith("word/media/"));
check("embedded diagram part written", media.length === 1, media.join(","));
if (media.length) {
  const png = files.get(media[0]).data;
  check("media is a PNG", png[0] === 0x89 && png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47);
  check("media declared in [Content_Types]", /Extension="png"/.test(contentTypes));
}

/*
 * OOXML readers enforce some structure quietly: a drawing outside a run, or
 * paragraph properties after content, parses as XML and still opens — with the
 * picture missing. Parsed per paragraph, because a regex over the whole body
 * happily matches across paragraph boundaries.
 */
function topLevelChildren(xml, tag) {
  const open = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "g");
  const children = [];
  let match;
  while ((match = open.exec(xml))) {
    const start = match.index + match[0].length;
    const closeTag = `</${tag}>`;
    let depth = 1;
    let cursor = start;
    while (depth > 0) {
      const nextOpen = xml.indexOf(`<${tag}`, cursor);
      const nextClose = xml.indexOf(closeTag, cursor);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose && new RegExp(`^<${tag}(\\s|>)`).test(xml.slice(nextOpen, nextOpen + tag.length + 2))) {
        depth++;
        cursor = nextOpen + tag.length + 1;
      } else {
        depth--;
        if (depth === 0) {
          children.push(xml.slice(start, nextClose));
          open.lastIndex = nextClose + closeTag.length;
          break;
        }
        cursor = nextClose + closeTag.length;
      }
    }
  }
  return children;
}

const paragraphs = topLevelChildren(documentXml, "w:p");
const withDrawings = paragraphs.filter((p) => p.includes("<w:drawing>"));
check(
  "every drawing is wrapped in a run",
  withDrawings.length > 0 && withDrawings.every((p) => /<w:r>(?:(?!<\/w:r>).)*<w:drawing>/s.test(p)),
  `${withDrawings.length} paragraph(s) contain a drawing`
);
check(
  "paragraph properties precede runs",
  paragraphs.every((p) => {
    const pPr = p.indexOf("<w:pPr>");
    const content = p.search(/<w:(r|hyperlink|bookmarkStart|proofErr)[\s>]/);
    return pPr === -1 || content === -1 || pPr < content;
  })
);
check(
  "drawing extent matches the embedded raster",
  (() => {
    const extent = documentXml.match(/<wp:extent cx="(\d+)" cy="(\d+)"/);
    if (!extent || !media.length) return false;
    const png = files.get(media[0]).data;
    const width = (png[16] << 24) | (png[17] << 16) | (png[18] << 8) | png[19];
    const height = (png[20] << 24) | (png[21] << 16) | (png[22] << 8) | png[23];
    return Math.abs(Number(extent[1]) / Number(extent[2]) - width / height) < 0.02;
  })(),
  "the picture would be stretched to the wrong aspect ratio"
);

check("title escaped & present", documentXml.includes("Big-O &amp; Data Structures"));
check("code language label present", documentXml.includes("PYTHON"));
check("code text preserved", documentXml.includes("binary_search"));
check("table header shading applied", documentXml.includes('w:fill="F4F5F8"'));
check("TableGrid style defined", stylesXml.includes('w:styleId="TableGrid"'));
check("chart data exported as a table", documentXml.includes("Weekly study hours") && documentXml.includes("3.5"));
check("nested list item indented", /w:ind w:left="720"/.test(documentXml));
check("blockquote style used", documentXml.includes('w:pStyle w:val="Quote"'));
check("horizontal rule rendered as a border", documentXml.includes("<w:pBdr>"));
check("no raw control characters", !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(documentXml));
check("unescaped ampersand absent", !/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(documentXml));

// ─── Print HTML ──────────────────────────────────────────────────────────────
console.log("\nBlocks → print HTML");
const html = buildExportHtml(doc);
mkdirSync(".tmp/export-out", { recursive: true });
writeFileSync(".tmp/export-out/reply.html", html);
writeFileSync(".tmp/export-out/reply.docx", bytes);
check("html has a doctype", html.startsWith("<!doctype html>"));
check("html sets the PDF filename", html.includes("<title>Big-O &amp; Data Structures (2026-09-19)</title>"));
check("html inlines the diagram as vector", html.includes('<figure class="diagram"><svg'));
check("html keeps code readable", html.includes("binary_search") && html.includes('class="code"'));
check("html table rendered", html.includes("<th>Structure</th>"));
check("html chart data rendered", html.includes("Weekly study hours") && html.includes("3.5"));
check("html print stylesheet present", html.includes("@page") && html.includes("break-inside"));
check("html shows source links", html.includes('href="https://example.com/big-o"'));
check("html carries no scripts", !/<script/i.test(html));

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
console.log("Wrote .tmp/export-out/reply.docx and .tmp/export-out/reply.html");
process.exit(failures === 0 ? 0 : 1);
