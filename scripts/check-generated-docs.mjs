// Regression harness for documents the assistant generates itself.
//
//   fileSpec (model JSON) → blocks → .pdf and .docx
//
// The PDF is checked with a real reader (pdftotext / pdfinfo), not just an
// eyeball: a hand-written PDF can carry a valid header and still be unopenable
// when an xref offset or a /Length is wrong.
//
// Run: npm run check:docs
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { parseHTML } from "linkedom";
import { compileLibModules } from "./lib/compile-for-node.mjs";

const TMP = ".tmp/doc-check";

compileLibModules({ tmp: TMP, outDir: "build" });

const { parseGeneratedFile, sanitizeDocFilename, formatBytes } = await import(
  `../${TMP}/build/generated/fileSpec.js`
);
const { buildPdfBlob, measureText } = await import(`../${TMP}/build/generated/exportPdf.js`);
const { buildDocxBlob } = await import(`../${TMP}/build/export/exportDocx.js`);
const { buildBlocksFromElement } = await import(`../${TMP}/build/export/markdownBlocks.js`);

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
globalThis.XMLSerializer = class {
  serializeToString(node) {
    return String(node.outerHTML ?? node.toString());
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

// ─── The block the model emits ───────────────────────────────────────────────
console.log("Model output → file spec");
const FILE_BLOCK = JSON.stringify({
  filename: "../../etc/passwd",
  format: "PDF",
  title: "JavaScript Interview Preparation",
  markdown: [
    "# JavaScript Interview Preparation",
    "",
    "A focused **revision plan** for a first frontend interview, built around what",
    "interviewers actually ask. See the [MDN reference](https://developer.mozilla.org/).",
    "",
    "## Core topics",
    "",
    "1. Closures and scope",
    "2. The event loop",
    "   - macrotasks vs microtasks",
    "3. `this` binding",
    "",
    "> Practise explaining each answer out loud before writing code.",
    "",
    "| Topic | Typical question | Weight |",
    "| --- | --- | --- |",
    "| Closures | Counter with private state | High |",
    "| Event loop | Predict the log order | High |",
    "",
    "```js",
    "const counter = () => {",
    "  let count = 0;",
    "  return () => ++count;",
    "};",
    "```",
    "",
    "Unicode check: 5 < 6, ünïcode, “smart quotes”, an em dash — and an emoji 🚀.",
    "",
    "---",
    "",
    "Final note: keep answers under two minutes.",
  ].join("\n"),
});

const spec = parseGeneratedFile(FILE_BLOCK);
check("file block parsed", Boolean(spec));
check("path traversal stripped from filename", !spec.filename.includes("/") && !spec.filename.includes(".."), spec?.filename);
check("format normalised to lower case", spec.format === "pdf");
check("title taken from the block", spec.title === "JavaScript Interview Preparation");

check("rejects malformed JSON", parseGeneratedFile("{not json") === null);
check("rejects a block with no document body", parseGeneratedFile('{"filename":"x","format":"pdf"}') === null);
check("accepts `content` as the body alias", parseGeneratedFile('{"content":"# Hi"}')?.markdown === "# Hi");
check("defaults an unknown format to pdf", parseGeneratedFile('{"markdown":"# Hi","format":"xlsx"}')?.format === "pdf");
check("titles from the first heading when absent", parseGeneratedFile('{"markdown":"# Real Title\\n\\nBody"}')?.title === "Real Title");
check("sanitises a filename with no usable characters", sanitizeDocFilename("///") === "careerpilot-document");
check("strips a supplied extension", sanitizeDocFilename("notes.pdf") === "notes");
check("formats byte sizes", formatBytes(900) === "900 B" && formatBytes(2048) === "2 KB" && formatBytes(3 * 1024 * 1024) === "3.0 MB");

// ─── Markdown → blocks, through the app's own renderer DOM ───────────────────
console.log("\nFile spec → blocks (offscreen render)");
const { document, window } = parseHTML(`<html><body></body></html>`);
globalThis.document = document;
globalThis.window = window;
// Canvas stub for the rasteriser; the generated documents here contain no
// diagrams, but the extractor feature-detects canvas before it looks at one.
const nativeCreate = document.createElement.bind(document);
document.createElement = (tag, ...rest) => {
  const el = nativeCreate(tag, ...rest);
  if (String(tag).toLowerCase() === "canvas") {
    el.getContext = () => ({ fillRect() {}, drawImage() {}, set fillStyle(_v) {} });
    el.toDataURL = () => "data:image/png;base64,iVBORw0KGgo=";
  }
  return el;
};

// ReactMarkdown markup is reproduced here the way the real renderer emits it,
// so the block extractor is exercised against production-shaped DOM.
const reactMarkdownShaped = `
<div class="break-words select-text">
  <h1>JavaScript Interview Preparation</h1>
  <p>A focused <strong>revision plan</strong> for a first frontend interview, built around what
     interviewers actually ask. See the <a href="https://developer.mozilla.org/">MDN reference</a>.</p>
  <h2>Core topics</h2>
  <ol>
    <li>Closures and scope</li>
    <li>The event loop<ul><li>macrotasks vs microtasks</li></ul></li>
    <li><code>this</code> binding</li>
  </ol>
  <blockquote><p>Practise explaining each answer out loud before writing code.</p></blockquote>
  <div class="my-4 overflow-x-auto"><table>
    <thead><tr><th>Topic</th><th>Typical question</th><th>Weight</th></tr></thead>
    <tbody>
      <tr><td>Closures</td><td>Counter with private state</td><td>High</td></tr>
      <tr><td>Event loop</td><td>Predict the log order</td><td>High</td></tr>
    </tbody>
  </table></div>
  <div class="my-4 overflow-hidden border"><div class="flex justify-between"><span>js</span><button type="button">Copy</button></div>
    <pre><code><span class="hljs-keyword">const</span> counter = () =&gt; {
  <span class="hljs-keyword">let</span> count = 0;
  <span class="hljs-keyword">return</span> () =&gt; ++count;
};</code></pre>
  </div>
  <p>Unicode check: 5 &lt; 6, ünïcode, “smart quotes”, an em dash — and an emoji 🚀.</p>
  <hr>
  <p>Final note: keep answers under two minutes.</p>
</div>`;

const host = document.createElement("div");
host.innerHTML = reactMarkdownShaped;
document.body.appendChild(host);
const blocks = await buildBlocksFromElement(host);
console.log(`  blocks: ${blocks.map((b) => b.kind).join(", ")}`);
check("headings captured", blocks.filter((b) => b.kind === "heading").length === 2);
check("ordered list captured", blocks.some((b) => b.kind === "list" && b.ordered));
check("table captured", blocks.some((b) => b.kind === "table" && b.rows.length === 3));
check("code captured", blocks.some((b) => b.kind === "code" && b.text.includes("counter")));
check("toolbar dropped", !JSON.stringify(blocks).includes("Copy"));

// ─── PDF ─────────────────────────────────────────────────────────────────────
console.log("\nBlocks → .pdf");
mkdirSync(".tmp/export-out", { recursive: true });
const pdfBlob = buildPdfBlob({
  title: spec.title,
  meta: "Generated by CareerPilot AI Study Hub",
  blocks,
});
const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
writeFileSync(".tmp/export-out/generated.pdf", pdfBytes);

const header = new TextDecoder().decode(pdfBytes.subarray(0, 8));
check("PDF header present", header.startsWith("%PDF-1.4"), header);
check("PDF ends with EOF marker", new TextDecoder().decode(pdfBytes.subarray(-6)).includes("%%EOF"));
check("mime type set", pdfBlob.type === "application/pdf");

// xref offsets are the part a hand-written PDF most easily gets wrong.
const pdfText = new TextDecoder("latin1").decode(pdfBytes);
const xrefStart = Number(pdfText.match(/startxref\s+(\d+)/)?.[1]);
check("startxref resolves to the xref table", pdfText.startsWith("xref", xrefStart), `at ${xrefStart}`);
const declaredCount = Number(pdfText.match(/\/Size (\d+)/)?.[1]);
const offsets = [...pdfText.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
check("every xref entry points at its object", offsets.every((offset) => /^\d+ 0 obj/.test(pdfText.slice(offset, offset + 12))), `${offsets.length} entries`);
check("object count matches /Size", offsets.length + 1 === declaredCount, `${offsets.length + 1} vs ${declaredCount}`);
check("catalog is object 1", /^1 0 obj\s*<< \/Type \/Catalog/m.test(pdfText), pdfText.slice(0, 60).replace(/\n/g, "|"));
const streamLengths = [...pdfText.matchAll(/\/Length (\d+) >>\nstream\n/g)].map((m) => Number(m[1]));
check("declared stream lengths are not zero", streamLengths.length > 0 && streamLengths.every((n) => n > 0), streamLengths.join(","));
check("text measured (font metrics work)", measureText("Hello", "regular", 10) > 0 && measureText("Hello", "bold", 10) > measureText("Hello", "regular", 10));

// A real reader is the only check that matters for "does it open".
let pdfTextOut = "";
let pdfInfo = "";
try {
  pdfInfo = execFileSync("pdfinfo", [".tmp/export-out/generated.pdf"], { encoding: "utf8" });
  pdfTextOut = execFileSync("pdftotext", ["-layout", ".tmp/export-out/generated.pdf", "-"], { encoding: "utf8" });
} catch (error) {
  check("pdftotext/pdfinfo available", false, String(error).slice(0, 120));
}
if (pdfInfo) {
  const pages = Number(pdfInfo.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0);
  check("reader reports at least one page", pages >= 1, `${pages}`);
  check("reader sees the document title", /Title:\s+JavaScript Interview Preparation/.test(pdfInfo));
}
if (pdfTextOut) {
  const flat = pdfTextOut.replace(/\s+/g, " ");
  check("body prose extracted", flat.includes("A focused revision plan for a first frontend interview"));
  check("heading extracted", flat.includes("Core topics"));
  check("list items extracted in order", flat.indexOf("Closures and scope") < flat.indexOf("macrotasks vs microtasks"));
  check("table content extracted", flat.includes("Counter with private state") && flat.includes("Predict the log order"));
  check("code extracted verbatim", flat.includes("const counter = () => {") && flat.includes("return () => ++count;"));
  check("blockquote extracted", flat.includes("Practise explaining each answer out loud"));
  check("accents survive as real characters", flat.includes("ünïcode"), "double-encoded as Ã¼ when the encoder emits UTF-8");
  check("smart punctuation survives", flat.includes("“smart quotes”") && flat.includes("—"));
  check("no mojibake in the extracted text", !/Ã|Â/.test(flat));
  check("unsupported emoji omitted, sentence intact", flat.includes("and an emoji") && !flat.includes("🚀"));
  check("footer page label present", /\b1\s*\/\s*1\b/.test(flat));
  check("no stray PDF operators in the text", !/\bTj\b|\bTm\b|\bBT\b/.test(flat));
}

// Long documents must paginate rather than run off the page.
const longBlocks = Array.from({ length: 90 }, (_, index) => ({
  kind: "paragraph",
  runs: [{ kind: "text", text: `Paragraph ${index + 1}. ${"Padding sentence for pagination. ".repeat(3)}` }],
}));
const longPdf = new Uint8Array(await buildPdfBlob({ title: "Long", blocks: longBlocks }).arrayBuffer());
writeFileSync(".tmp/export-out/generated-long.pdf", longPdf);
try {
  const longInfo = execFileSync("pdfinfo", [".tmp/export-out/generated-long.pdf"], { encoding: "utf8" });
  const pages = Number(longInfo.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0);
  check("long document paginates", pages >= 2, `${pages} pages`);
  const longText = execFileSync("pdftotext", [".tmp/export-out/generated-long.pdf", "-"], { encoding: "utf8" });
  check("last paragraph survives pagination", longText.includes("Paragraph 90"));
} catch (error) {
  check("long PDF is readable", false, String(error).slice(0, 120));
}

// ─── DOCX from the same blocks ───────────────────────────────────────────────
console.log("\nBlocks → .docx");
const docxBlob = buildDocxBlob({ title: spec.title, meta: "Generated by CareerPilot", blocks });
const docxBytes = new Uint8Array(await docxBlob.arrayBuffer());
writeFileSync(".tmp/export-out/generated.docx", docxBytes);
check("looks like a ZIP", docxBytes[0] === 0x50 && docxBytes[1] === 0x4b);
try {
  const listing = execFileSync("unzip", ["-l", ".tmp/export-out/generated.docx"], { encoding: "utf8" });
  check("contains the required OOXML parts", ["word/document.xml", "word/styles.xml", "[Content_Types].xml"].every((part) => listing.includes(part)));
  check("unzip reports no CRC errors", !/bad CRC|error/i.test(listing));
  const docXml = execFileSync("unzip", ["-p", ".tmp/export-out/generated.docx", "word/document.xml"], { encoding: "utf8" });
  check("docx carries the body text", docXml.includes("Closures and scope") && docXml.includes("counter"));
} catch (error) {
  check("docx readable with unzip", false, String(error).slice(0, 120));
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
console.log("Wrote .tmp/export-out/generated.pdf, generated-long.pdf and generated.docx");
process.exit(failures === 0 ? 0 : 1);
