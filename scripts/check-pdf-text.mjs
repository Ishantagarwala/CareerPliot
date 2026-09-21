// Checks the shaping of extracted PDF pages: repeated running headers and
// footers are removed, page markers survive, and real content is left alone.
//
// The case that prompted this: a 42-page university handout repeated a five-line
// header on every page — 14.5% of the extracted text, paid on every passage that
// reached the model, and carrying a page number of its own that competed with
// the one the app cites in an answer.
//
// Run: npm run check:pdftext
import { compileLibModules } from "./lib/compile-for-node.mjs";

compileLibModules({
  tmp: ".tmp/pdftext-check",
  outDir: "build",
  include: ["../../lib/pdfText.ts"],
});

const { assembleStoredText, repeatedLines, stripRepeatedLines, pageMarker } = await import(
  "../.tmp/pdftext-check/build/pdfText.js"
);

let failures = 0;
const check = (name, condition, detail = "") => {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

// ─── A document shaped like the real one ─────────────────────────────────────
const HEADER = [
  "Programme: Bachelor of Computer Applications",
  "Course Name : Data Structure and Algorithm (BCA30104)",
  "Class: BCA SEM : III",
  "Academic Session: 2026-27",
  "Dept. of Computational Sciences",
];

const FOOTER = "Brainware University, Kolkata";

const pages = Array.from({ length: 42 }, (_, index) => {
  const page = index + 1;
  // The footer carries a page number, as real footers do — but off by one, the
  // way this document's did, so a leftover copy would contradict the app's own.
  return [
    ...HEADER,
    `${FOOTER} ${page + 1}`,
    "",
    `Chapter content for page ${page}. ${"Body sentence. ".repeat(30)}`,
    page === 37 ? "Insert at the Middle: allocate memory, then traverse." : "",
    "",
  ].join("\n");
});

console.log("Detecting boilerplate");
{
  const repeated = repeatedLines(pages);
  check("every header line is detected", HEADER.every((line) => repeated.has(line)), [...repeated].slice(0, 3).join(" | "));
  check("the footer prefix is not assumed — only exact lines qualify", ![...repeated].some((line) => line.includes("Kolkata 30")));
}

console.log("\nStripping it");
{
  const cleaned = stripRepeatedLines(pages);
  const removed = pages.join("").length - cleaned.join("").length;
  const share = ((removed / pages.join("").length) * 100).toFixed(1);
  console.log(`  removed ${removed} chars (${share}%)`);
  check("no header line survives", !cleaned.some((page) => HEADER.some((line) => page.includes(line))));
  check("body text is untouched", cleaned[36].includes("Insert at the Middle: allocate memory"));
  check("every page keeps its own content", cleaned.every((page, i) => page.includes(`Chapter content for page ${i + 1}`)));
}

console.log("\nA page whose body repeats a line is safe");
{
  const bodyLine = "This sentence appears in the body of the document many times.";
  // Only 2 of 10 pages contain it, so it is content, not boilerplate.
  const doc = Array.from({ length: 10 }, (_, i) => `Page ${i + 1} intro.\n${i < 2 ? `${bodyLine}\n` : ""}Unique body for page ${i + 1}.`);
  const cleaned = stripRepeatedLines(doc);
  check("a repeated body line is kept", cleaned[0].includes(bodyLine) && cleaned[1].includes(bodyLine));
}

console.log("\nShort documents are left alone");
{
  const two = ["Only page one.", "Only page two."];
  check("nothing is stripped from a two-page document", stripRepeatedLines(two).join("") === two.join(""));
}

console.log("\nAssembling the stored text");
{
  const stored = assembleStoredText(
    pages.map((text, index) => ({ page: index + 1, text })),
    pages.length
  );
  const markers = stored.match(/-- \d+ of \d+ --/g) ?? [];
  check("one marker per page", markers.length === pages.length, `${markers.length} markers for ${pages.length} pages`);
  check("markers are numbered and ordered", markers[0] === "-- 1 of 42 --" && markers[41] === "-- 42 of 42 --");
  check("markers follow their page's content", stored.indexOf("Chapter content for page 37") < stored.indexOf("-- 37 of 42 --"));
  check("boilerplate is gone from the stored text", !stored.includes(HEADER[0]));
  check("content survived", stored.includes("Insert at the Middle"));
}

console.log("\nA parser that reports fewer pages than it returns");
{
  // Trusting only the reported total would number the markers wrongly.
  const stored = assembleStoredText([{ page: 1, text: "a" }, { page: 2, text: "b" }, { page: 3, text: "c" }], 2);
  check("the marker total is at least the pages present", stored.includes("-- 3 of 3 --"), stored.match(/-- \d+ of \d+ --/g)?.join(","));
}

console.log("\nMarker format");
{
  check("marker reads naturally", pageMarker(3, 42) === "-- 3 of 42 --");
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
