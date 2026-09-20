// End-to-end check of the download path for an assistant-generated document:
//
//   Markdown (from a captured reply) → rendered DOM → blocks → .pdf + .docx
//
// The DOM here is produced by the same renderer the card uses (ReactMarkdown
// with the app's element mapping), so the extractor sees production-shaped
// markup: nested lists, tables, code blocks with a language label, and a
// mermaid diagram.
//
// Run: npm run check:markdown-docs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parseHTML } from "linkedom";
import { compileLibModules } from "./lib/compile-for-node.mjs";

compileLibModules({ tmp: ".tmp/md-check", outDir: "build" });

const { parseGeneratedFile } = await import("../.tmp/md-check/build/generated/fileSpec.js");
const { buildBlocksFromElement } = await import("../.tmp/md-check/build/export/markdownBlocks.js");
const { buildPdfBlob } = await import("../.tmp/md-check/build/generated/exportPdf.js");
const { buildDocxBlob } = await import("../.tmp/md-check/build/export/exportDocx.js");

const { document, window } = parseHTML("<html><body></body></html>");
globalThis.document = document;
globalThis.window = window;
globalThis.Node = globalThis.Node || { ELEMENT_NODE: 1, TEXT_NODE: 3 };

const nativeCreate = document.createElement.bind(document);
document.createElement = (tag, ...rest) => {
  const el = nativeCreate(tag, ...rest);
  if (String(tag).toLowerCase() === "canvas") {
    el.getContext = () => ({ fillRect() {}, drawImage() {}, set fillStyle(_v) {} });
    el.toDataURL = () => "data:image/png;base64,iVBORw0KGgo=";
  }
  return el;
};
globalThis.XMLSerializer = class {
  serializeToString(node) {
    return String(node.outerHTML ?? node.toString());
  }
};
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

// ─── The captured reply's own document ───────────────────────────────────────
const reply = readFileSync("scripts/fixtures/generated-file-reply.md", "utf8");
/*
 * The closing fence is not always on its own line: models tag it straight onto
 * the JSON (`…"}~~~`). Captured here as-is, because that is the input the
 * application parser has to survive.
 */
const fence = reply.match(/~~~file\s*([\s\S]*?)\s*~~~/);
check("fixture contains a file block", Boolean(fence));
const spec = parseGeneratedFile(fence[1]);
check("fixture document parses", Boolean(spec));

console.log(`  document: ${spec.filename}.${spec.format}, ${spec.markdown.length} chars`);

// ─── Render it the way the card does ─────────────────────────────────────────
const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const ReactMarkdown = (await import("react-markdown")).default;
const remarkGfm = (await import("remark-gfm")).default;

const J = React.createElement;

/**
 * The same element shape MarkdownContent emits — including the language label
 * the code block renders above its <pre>, which the extractor reads.
 */
const components = {
  h1: ({ children }) => J("h1", null, children),
  h2: ({ children }) => J("h2", null, children),
  h3: ({ children }) => J("h3", null, children),
  p: ({ children }) => J("p", null, children),
  a: ({ href, children }) => J("a", { href }, children),
  table: ({ children }) => J("div", { className: "my-4 overflow-x-auto" }, J("table", null, children)),
  code: ({ className, children }) => {
    const match = /language-(\w+)/.exec(className || "");
    const code = String(children).replace(/\n$/, "");
    /*
     * MarkdownContent hands a ```mermaid block to MermaidDiagram, which writes
     * an <svg> into a host div. Reproduced here because the extractor keys off
     * that shape to export a diagram as a picture.
     */
    if (match?.[1]?.toLowerCase() === "mermaid") {
      return J(
        "div",
        { className: "mermaid-host flex justify-center" },
        J("svg", {
          viewBox: "0 0 320 200",
          width: "320",
          height: "200",
          xmlns: "http://www.w3.org/2000/svg",
          dangerouslySetInnerHTML: {
            __html: '<rect width="320" height="200" fill="#fff"/><text x="12" y="30">flowchart</text>',
          },
        })
      );
    }
    // Only fenced blocks get the bordered wrapper; inline code stays inline.
    if (match || code.includes("\n")) {
      return J(
        "div",
        { className: "my-4 overflow-hidden border" },
        J("div", { className: "flex items-center justify-between" }, J("span", null, match?.[1] || "code")),
        J("pre", null, J("code", null, code))
      );
    }
    return J("code", null, children);
  },
  pre: ({ children }) => J(React.Fragment, null, children),
};

const host = document.createElement("div");
document.body.appendChild(host);
host.innerHTML = renderToStaticMarkup(
  J(ReactMarkdown, { remarkPlugins: [remarkGfm], components }, spec.markdown)
);
console.log(`  rendered DOM: ${host.querySelectorAll("*").length} nodes`);

const blocks = await buildBlocksFromElement(host);
const kinds = blocks.map((b) => b.kind);
console.log(`  blocks: ${kinds.join(", ")}`);

/*
 * Expectations are derived from the document's own Markdown, so the same
 * harness holds for a code-heavy study guide and a table-heavy revision plan.
 */
const markdown = spec.markdown;
const headingMatches = [...markdown.matchAll(/^#{1,3}\s+(.+)$/gm)].map((m) => m[1].trim());
/*
 * Fenced code blocks — mermaid diagrams excluded, since those export as
 * pictures rather than as code.
 */
const fencedBlocks = [...markdown.matchAll(/^\s*```([a-z]*)\s*$/gm)].map((m) => m[1]);
const codeFences = Math.floor(fencedBlocks.filter((lang) => lang !== "mermaid").length / 2);
const proseBlocks = markdown
  .split(/\n{2,}/)
  .map((block) => block.trim())
  .filter(
    (block) =>
      block.length > 40 &&
      !block.startsWith("#") &&
      !block.startsWith("|") &&
      !block.startsWith("```") &&
      !block.startsWith("~~~") &&
      !block.startsWith("- ") &&
      !/^\d+\.\s/.test(block)
  );

check("headings extracted", kinds.filter((k) => k === "heading").length >= Math.min(3, headingMatches.length));
check(
  "paragraphs extracted",
  kinds.filter((k) => k === "paragraph").length >= Math.min(2, proseBlocks.length),
  `${proseBlocks.length} prose block(s) in the document`
);
check("lists extracted", kinds.filter((k) => k === "list").length >= 1);
check(
  "code blocks extracted with content",
  blocks.filter((b) => b.kind === "code").length >= Math.max(1, Math.floor(codeFences)),
  `${codeFences} fenced block(s) in the document`
);
if (/```mermaid/.test(markdown)) {
  check("the mermaid diagram became an image", kinds.includes("image"));
}
if (markdown.includes("| --- |")) {
  check("tables extracted", blocks.some((b) => b.kind === "table" && b.rows.length > 1));
}
check("no raw fence markers left in the text", !JSON.stringify(blocks).includes("```"));

// ─── Build both documents ────────────────────────────────────────────────────
mkdirSync(".tmp/export-out", { recursive: true });
const pdfBlob = buildPdfBlob({ title: spec.title, blocks });
const docxBlob = buildDocxBlob({ title: spec.title, blocks });
writeFileSync(".tmp/export-out/markdown-to.pdf", Buffer.from(await pdfBlob.arrayBuffer()));
writeFileSync(".tmp/export-out/markdown-to.docx", Buffer.from(await docxBlob.arrayBuffer()));
check("PDF built", pdfBlob.size > 2000, `${pdfBlob.size} bytes`);
check("DOCX built", docxBlob.size > 2000, `${docxBlob.size} bytes`);

// ─── A real reader validates the PDF ─────────────────────────────────────────
const pageCount = Number(
  execFileSync("pdfinfo", [".tmp/export-out/markdown-to.pdf"], { encoding: "utf8" }).match(/^Pages:\s+(\d+)/m)?.[1] ?? 0
);
const pdfText = execFileSync("pdftotext", ["-layout", ".tmp/export-out/markdown-to.pdf", "-"], { encoding: "utf8" });
const flat = pdfText.replace(/\s+/g, " ");

check("reader opens the PDF", pageCount >= 1, `${pageCount} pages`);
check(
  "document title is in the PDF",
  flat.includes(spec.title.replace(/[*_`]/g, "").split(/\s+/).slice(0, 3).join(" ").slice(0, 20))
);
check(
  "the document's own prose is in the PDF",
  proseBlocks.slice(0, 12).some((block) => flat.includes(block.split(/\s+/).slice(0, 5).join(" ").slice(0, 34)))
);
const missingHeadings = headingMatches.filter(
  (heading) => !flat.includes(heading.replace(/[*_`]/g, "").split(/\s+/).slice(0, 2).join(" ").slice(0, 16))
);
check("every section heading reached the PDF", missingHeadings.length === 0, missingHeadings.join(" | "));
check("multi-page document paginated", pageCount >= 2, `${pageCount} pages`);
check("no mojibake", !/Ã|Â/.test(flat));

// ─── And the DOCX ────────────────────────────────────────────────────────────
const docXml = execFileSync("unzip", ["-p", ".tmp/export-out/markdown-to.docx", "word/document.xml"], {
  encoding: "utf8",
});
/*
 * Headings can wrap across lines once extracted or rendered, so a short
 * distinctive prefix is compared rather than the whole string.
 */
const missingFromDocx = headingMatches.filter(
  (heading) => !docXml.includes(heading.replace(/[*_`]/g, "").split(/\s+/).slice(0, 3).join(" ").slice(0, 18))
);
check("docx carries the document headings", missingFromDocx.length === 0, missingFromDocx.join(" | "));

if (codeFences > 0) {
  const firstCodeLine = markdown.match(/```[a-z]*\n([^\n]+)/)?.[1]?.trim() ?? "";
  check(
    "docx carries the code",
    !firstCodeLine || docXml.includes(firstCodeLine.slice(0, 16)),
    firstCodeLine.slice(0, 40)
  );
}
check("docx declared the diagram as an image", /<w:drawing>/.test(docXml) || !kinds.includes("image"));

// Deeply nested lists only appear in some documents; assert the behaviour with
// one that has them rather than hoping the fixture does.
const nestedHost = document.createElement("div");
nestedHost.innerHTML = renderToStaticMarkup(
  J(ReactMarkdown, { remarkPlugins: [remarkGfm], components }, "- top level\n  - nested one\n    - nested two\n")
);
const nestedBlocks = await buildBlocksFromElement(nestedHost);
const nestedList = nestedBlocks.find((b) => b.kind === "list");
const levels = nestedList?.items.map((item) => item.level) ?? [];
check("nested list levels are captured", levels.join(",") === "0,1,2", `got [${levels.join(",")}]`);

const nestedPdf = buildPdfBlob({ title: "Nested", blocks: nestedBlocks });
writeFileSync(".tmp/export-out/nested.pdf", Buffer.from(await nestedPdf.arrayBuffer()));
const nestedText = execFileSync("pdftotext", [".tmp/export-out/nested.pdf", "-"], { encoding: "utf8" });
check(
  "PDF prints nested items in order",
  nestedText.indexOf("top level") < nestedText.indexOf("nested one") &&
    nestedText.indexOf("nested one") < nestedText.indexOf("nested two")
);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
console.log("Wrote .tmp/export-out/markdown-to.pdf and markdown-to.docx");
process.exit(failures === 0 ? 0 : 1);
