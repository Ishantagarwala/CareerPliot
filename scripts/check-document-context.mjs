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

/** The `[part …]` label attached to the excerpt containing `marker`. */
function labelFor(context, marker) {
  const at = context.indexOf(marker);
  if (at === -1) return null;
  const labels = [...context.slice(0, at).matchAll(/\[part \d+ of \d+, [^\]]+\]/g)];
  return labels.length ? labels[labels.length - 1][0] : null;
}

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
    // Page markers are what the extractor writes between pages; the context
    // builder reads them so an excerpt can be cited by its real page.
    contentText: Array.from({ length: PAGES }, (_, index) => {
      const page = index + 1;
      const body = `This paragraph covers topic ${page} in ordinary prose. `.repeat(
        Math.round(CHARS_PER_PAGE / 55)
      );
      return `Section ${page}\n\n${body}\n\nUnique fact for this page: DELTA-${page}-ZULU\n-- ${page} of ${PAGES} --`;
    }).join("\n"),
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
    /\[part \d+ of \d+, (≈ )?page [\d–]+ of \d+\]/.test(context)
  );
  check(
    "the last page is cited as page 40, not an estimate",
    /page 40 of 40\]/.test(labelFor(context, "DELTA-40-ZULU") ?? ""),
    String(labelFor(context, "DELTA-40-ZULU"))
  );
  check(
    "the document's opening is always included",
    context.includes("DELTA-1-ZULU"),
    "the first page is where a document states its scope"
  );
  const oldPrefix = documents[0].contentText.slice(0, 12_000);
  check(
    "the old prefix approach would have missed it",
    !oldPrefix.includes("DELTA-40-ZULU"),
    "without retrieval this question was unanswerable"
  );
}

/*
 * Retrieval is only meaningful when the pages differ. The fixture above repeats
 * the same sentence on every page, so a question about "topic 17" is genuinely
 * indistinguishable from one about "topic 28" — that says nothing about the
 * code. This document gives each page a subject of its own.
 */
console.log("\nDistinct subjects, one per page");
{
  const subjects = [
    "indexing strategy", "connection pooling", "query planning", "write amplification",
    "replication lag", "sharding keys", "vacuum tuning", "deadlock detection",
    "memory arenas", "page cache eviction",
  ];
  const distinct = Array.from({ length: 40 }, (_, index) => {
    const page = index + 1;
    const subject = subjects[index % subjects.length];
    const filler = `This page covers routine material for section ${page}. `.repeat(40);
    return `Section ${page}\n\n${filler}\n\nThe governing concept here is ${subject} for page ${page}.\n-- ${page} of 40 --`;
  }).join("\n");

  // Pages are where the subject actually appears: the cycle repeats every 10.
  for (const [page, subject] of [[3, "query planning"], [17, "vacuum tuning"], [28, "deadlock detection"], [40, "page cache eviction"]]) {
    const context = buildDocumentContext(
      [{ filename: "distinct.pdf", contentText: distinct }],
      { question: `What does the document say about ${subject}?` }
    );
    /*
     * Anchored on the page's own sentence, not on the subject alone: an earlier
     * page may mention "tuning" in passing, and finding that one first is
     * correct behaviour rather than a wrong citation.
     */
    const sentence = `The governing concept here is ${subject} for page ${page}.`;
    const label = labelFor(context, sentence);
    check(`the passage about ${subject} is reachable`, Boolean(label), "not in the prompt");
    check(
      `${subject} is cited as page ${page}`,
      new RegExp(`page ${page} of 40\\]`).test(label ?? ""),
      String(label)
    );
  }
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
  const { passages } = splitIntoPassages(
    Array.from({ length: 50 }, (_, i) => `Paragraph ${i + 1}. `.repeat(20)).join("\n\n")
  );
  check("long text splits into many passages", passages.length > 5, `${passages.length} passages`);
  check("every passage carries its index", passages.every((p, i) => p.index === i + 1));

// Page numbers must come from the document, not from a character estimate.
{
  // Text without page markers still gets a usable, clearly-estimated label.
  const plain = buildDocumentContext(
    [{ filename: "plain.txt", contentText: "Paragraph about topic alpha. ".repeat(3_000) }],
    { question: "alpha" }
  );
  check("marker-less text is labelled as an estimate", /≈ page \d+ of \d+\]/.test(plain), plain.match(/\[part[^\]]*\]/)?.[0]);

  const withPages = splitIntoPassages(
    Array.from({ length: 6 }, (_, i) => `Body of page ${i + 1}. `.repeat(400) + `\n-- ${i + 1} of 6 --`).join("\n")
  );
  check("page markers are consumed, not left in the text", !withPages.passages.some((p) => /-- \d+ of \d+ --/.test(p.text)));
  check("passages record the page they came from", withPages.passages.every((p) => p.startPage >= 1));
  check("the page count comes from the document", withPages.pageCount === 6, String(withPages.pageCount));
  const labelled = buildDocumentContext(
    [{ filename: "paged.pdf", contentText: Array.from({ length: 6 }, (_, i) => `Body of page ${i + 1}. `.repeat(400) + `\n-- ${i + 1} of 6 --`).join("\n") }],
    { question: "page 6" }
  );
  check("a real page is labelled without the estimate marker", /page \d+ of 6\]/.test(labelled) && !/≈ page \d+ of 6\]/.test(labelled), labelled.match(/\[part[^\]]*\]/)?.[0]);
}

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
