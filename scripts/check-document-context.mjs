// Checks that a long PDF is actually reachable by the model.
//
// The bug: context was the first 12,000 characters of the document, so a
// question about page 40 could never be answered — it looked like the PDF had
// only been half parsed. Extraction was fine all along; the whole document was
// stored and then thrown away at prompt time.
//
// This builds a real multi-page PDF, extracts it through the application's own
// code, and asserts that facts from the end of the document reach the prompt.
//
// Run: npm run check:context
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { compileLibModules } from "./lib/compile-for-node.mjs";

compileLibModules({
  tmp: ".tmp/context-check",
  outDir: "build",
  include: ["../../lib/documentContext.ts"],
});

const { buildDocumentContext, splitIntoPassages, selectPassages, DEFAULT_CONTEXT_BUDGET } =
  await import("../.tmp/context-check/build/documentContext.js");

let failures = 0;
const check = (name, condition, detail = "") => {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

// ─── A real 40-page PDF, extracted by the application's own parser ───────────
console.log("Building a 40-page PDF and extracting it");
mkdirSync(".tmp/context-out", { recursive: true });

const pageFacts = Array.from({ length: 40 }, (_, index) => {
  const page = index + 1;
  return {
    page,
    // A unique, checkable fact per page, buried in ordinary prose.
    marker: `DELTA-${page}-ZULU`,
    body: `Section ${page}. This page discusses topic ${page} in detail. `.repeat(6),
  };
});

const python = `
import zlib, struct
pages = []
markers = ${JSON.stringify(pageFacts.map((p) => p.marker))}
for i, marker in enumerate(markers, start=1):
    body = (" ".join("Sentence %d about topic %d with enough words to fill a real page." % (n, i) for n in range(1, 31)))
    pages.append([f"Section {i}\\n\\n{body}\\n\\nUnique fact for this page: {marker}"])
flat = [p[0] for p in pages]
def build(texts):
    objs = []
    page_ids, content_ids, nid = [], [], 4
    for _ in texts:
        page_ids.append(nid); content_ids.append(nid + 1); nid += 2
    objs.append('<< /Type /Catalog /Pages 2 0 R >>')
    objs.append('<< /Type /Pages /Kids [%s] /Count %d >>' % (' '.join(f'{p} 0 R' for p in page_ids), len(texts)))
    objs.append('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
    for text, pid, cid in zip(texts, page_ids, content_ids):
        objs.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents {cid} 0 R >>')
        escaped = text.replace('\\\\', '\\\\\\\\').replace('(', '\\\\(').replace(')', '\\\\)')
        stream = 'BT /F1 11 Tf 40 750 Td 14 TL\\n' + '\\n'.join(f'({line}) Tj T*' for line in escaped.split('\\n')) + '\\nET'
        objs.append('<< /Length %d >>\\nstream\\n%s\\nendstream' % (len(stream), stream))
    out = bytearray(b'%PDF-1.4\\n'); offsets = []
    for i, body in enumerate(objs, start=1):
        offsets.append(len(out)); out += f'{i} 0 obj\\n{body}\\nendobj\\n'.encode('latin-1')
    xref = len(out)
    out += ('xref\\n0 %d\\n0000000000 65535 f \\n' % (len(objs) + 1)).encode()
    for off in offsets: out += f'{off:010d} 00000 n \\n'.encode()
    out += ('trailer\\n<< /Size %d /Root 1 0 R >>\\nstartxref\\n%d\\n%%%%EOF\\n' % (len(objs) + 1, xref)).encode()
    return bytes(out)
open('.tmp/context-out/long.pdf','wb').write(build(flat))
print('pages:', len(flat))
`;
execFileSync("python3", ["-c", python], { stdio: "inherit" });

const extract = `
import { readFileSync } from "node:fs";
import { PDFParse } from "pdf-parse";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";
globalThis.pdfjsWorker = pdfjsWorker;
const buffer = readFileSync(".tmp/context-out/long.pdf");
const parser = new PDFParse({ data: new Uint8Array(buffer) });
const result = await parser.getText();
await parser.destroy();
process.stdout.write(JSON.stringify({ text: result.text, pages: result.pages.length, total: result.total }));
`;
writeFileSync(".tmp/context-out/extract.mjs", extract);
const extracted = JSON.parse(
  execFileSync("node", [".tmp/context-out/extract.mjs"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
);
writeFileSync(".tmp/context-out/extracted.txt", extracted.text);

console.log(`  extracted ${extracted.text.length} chars from ${extracted.pages}/${extracted.total} pages`);
check("every page was extracted", extracted.pages === 40 && extracted.total === 40, `${extracted.pages} of ${extracted.total}`);
check(
  "the last page's text is available to the app",
  extracted.text.includes("DELTA-40-ZULU"),
  "extraction itself is not the limit"
);

/*
 * Context selection runs against a realistically sized document.
 *
 * A PDF built here cannot be both many pages and large: text past the bottom of
 * the MediaBox is silently not extracted, so a fixture that reaches 40 pages is
 * only a few thousand characters — smaller than the budget, and therefore never
 * exercising selection at all. The PDF above proves extraction; this proves the
 * prompt, with page-sized passages and the same marker on every page.
 */
const PAGES = 40;
const CHARS_PER_PAGE = 4_000;
const documents = [
  {
    filename: "long.pdf",
    contentText: Array.from({ length: PAGES }, (_, index) => {
      const page = index + 1;
      const body = `This paragraph covers topic ${page} in ordinary prose. `.repeat(
        Math.round(CHARS_PER_PAGE / 55)
      );
      return `Section ${page}\n\n${body}\n\nUnique fact for this page: DELTA-${page}-ZULU`;
    }).join("\n\n"),
  },
];
console.log(`  context fixture: ${documents[0].contentText.length} chars, ~${PAGES} pages`);

console.log("\nA question about something on the last page");
{
  const context = buildDocumentContext(documents, { question: "What does the document say about DELTA-40-ZULU?" });
  check("the answer's passage is in the prompt", context.includes("DELTA-40-ZULU"));
  check("context stays inside the budget", context.length <= DEFAULT_CONTEXT_BUDGET + 4_000, `${context.length} chars`);
  check(
    "excerpts are labelled with their position",
    /\[part \d+ of \d+, ≈ page \d+ of \d+\]/.test(context)
  );
  const oldPrefix = documents[0].contentText.slice(0, 12_000);
  check(
    "the old prefix approach would have missed it",
    !oldPrefix.includes("DELTA-40-ZULU"),
    "without retrieval this question was unanswerable"
  );
}

console.log("\nQuestions about pages spread through the document");
for (const page of [3, 17, 28, 39]) {
  const context = buildDocumentContext(documents, { question: `Explain topic ${page} in section ${page}` });
  check(`page ${page}'s passage is reachable`, context.includes(`DELTA-${page}-ZULU`));
}

console.log("\nAn overview question");
{
  const context = buildDocumentContext(documents, { question: "Summarise this document" });
  const parts = [...context.matchAll(/\[part (\d+) of (\d+)/g)].map((m) => Number(m[1]));
  check("an overview samples across the document", parts.length >= 4, `${parts.length} passages`);
  check(
    "and reaches past the opening pages",
    Math.max(...parts) > parts.length,
    `parts: ${parts.join(",")}`
  );
  check(
    "the model is told the sample is spread out",
    /spread across the whole document|match the question/i.test(context)
  );
}

console.log("\nShort documents are passed whole");
{
  const short = { filename: "notes.pdf", contentText: "A short note.\n\nWith two paragraphs." };
  const context = buildDocumentContext([short], { question: "anything" });
  check("no passages are dropped from a short document", context.includes("With two paragraphs."));
  check("no retrieval note is added for a whole document", !/\[part 1 of/.test(context));
}

console.log("\nPassage splitting and ranking");
{
  const passages = splitIntoPassages(Array.from({ length: 50 }, (_, i) => `Paragraph ${i + 1}. `.repeat(20)).join("\n\n"));
  check("long text splits into many passages", passages.length > 5, `${passages.length} passages`);
  check("every passage carries its index", passages.every((p, i) => p.index === i + 1));

  const { selected, matched } = selectPassages(passages, "Paragraph 42", 3);
  check("a specific question matches", matched);
  check("the best passage is chosen first", selected[0].text.includes("Paragraph 42"), selected[0].text.slice(0, 40));

  const { matched: noMatch } = selectPassages(passages, "quantum chromodynamics", 3);
  check("an unrelated question reports no match", !noMatch);
}

console.log("\nBudget handling");
{
  const context = buildDocumentContext(documents, { question: "DELTA-40-ZULU", budgetChars: 4_000 });
  check("a small budget is respected", context.length < 7_000, `${context.length} chars`);
  check("the answer survives the small budget", context.includes("DELTA-40-ZULU"));
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
