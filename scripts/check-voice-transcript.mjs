// Regression check for the voice transcript and speech-chunking helpers.
//
// The bug being guarded: `useVoice` appended interim speech onto a transcript
// that already contained the previous interim, and `transcriptRef` was synced
// from that displayed value. Because Chrome's interim results are cumulative,
// saying "hello world" produced "hello hello world hello world" — and that is
// the string that was sent to the LLM on every voice turn.
//
// Run: npm run check:voice
import assert from "node:assert/strict";
import { compileLibModules } from "./lib/compile-for-node.mjs";

// Compile the helpers so this check exercises the real module, not a copy.
compileLibModules({
  tmp: ".tmp/voice-transcript-check",
  outDir: "build",
  include: ["../../lib/voice/**/*.ts"],
  rootDir: "../../lib",
});

const { aggregateSpeechResults, chunkForSpeech, normalizeForSpeech } = await import(
  "../.tmp/voice-transcript-check/build/voice/transcript.js"
);

let passed = 0;
const failures = [];

function test(label, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${label}`);
  } catch (err) {
    failures.push({ label, message: err.message });
    console.log(`  FAIL  ${label}`);
    console.log(`        ${err.message}`);
  }
}

/** Builds a SpeechRecognitionEvent-like object from a list of segments. */
function event(resultIndex, segments) {
  const results = segments.map((s) =>
    typeof s === "string"
      ? { isFinal: true, length: 1, 0: { transcript: s } }
      : { isFinal: false, length: 1, 0: { transcript: s.interim } }
  );
  return { resultIndex, results };
}

console.log("\ntranscript aggregation\n");

test("interim then final yields the sentence exactly once", () => {
  const { full } = aggregateSpeechResults(
    event(0, [{ interim: "hello world" }])
  );
  assert.equal(full, "hello world");
});

test("cumulative interim results do not duplicate", () => {
  // The exact sequence Chrome emits: interim grows in place at one index.
  const first = aggregateSpeechResults(event(0, [{ interim: "hello" }]));
  assert.equal(first.full, "hello");

  const second = aggregateSpeechResults(event(0, [{ interim: "hello world" }]));
  assert.equal(second.full, "hello world", `got ${JSON.stringify(second.full)}`);
  assert.ok(!second.full.includes("hello hello"), "interim must not be re-appended");
});

test("the reported failure case is gone", () => {
  // "hello" -> "hello world" (interim) -> "hello world" (final)
  const interim1 = aggregateSpeechResults(event(0, [{ interim: "hello" }]));
  const interim2 = aggregateSpeechResults(event(0, [{ interim: "hello world" }]));
  const final = aggregateSpeechResults(event(0, ["hello world"]));
  for (const r of [interim1, interim2, final]) {
    assert.ok(
      !r.full.includes("hello hello world hello world"),
      `corrupted transcript: ${JSON.stringify(r.full)}`
    );
  }
  assert.equal(final.full, "hello world");
});

test("finalised segments are kept and the live tail replaced", () => {
  const { full, finalText, interim, hasFinal } = aggregateSpeechResults(
    event(1, ["Explain normalization.", { interim: " then 3NF" }])
  );
  assert.equal(finalText, "Explain normalization.");
  assert.equal(interim, " then 3NF".trim());
  assert.equal(full, "Explain normalization. then 3NF");
  assert.equal(hasFinal, true);
});

test("two finalised sentences accumulate in order", () => {
  const { full } = aggregateSpeechResults(
    event(0, ["First sentence.", "Second sentence."])
  );
  assert.equal(full, "First sentence. Second sentence.");
});

test("whitespace and empty segments are handled", () => {
  assert.equal(aggregateSpeechResults(event(0, [])).full, "");
  assert.equal(aggregateSpeechResults(event(0, ["   "])).full, "");
  assert.equal(
    aggregateSpeechResults(event(0, ["  a   b  ", { interim: "  c  " }])).full,
    "a b c"
  );
});

console.log("\nspeech chunking\n");

test("short text is one chunk", () => {
  assert.deepEqual(chunkForSpeech("Short reply."), ["Short reply."]);
});

test("long text splits at sentence boundaries under the limit", () => {
  const sentence = "Normalization removes redundancy from a table. ";
  const chunks = chunkForSpeech(sentence.repeat(80), 2500);
  assert.ok(chunks.length > 1, "must split");
  for (const c of chunks) {
    assert.ok(c.length <= 2500, `chunk over the 2500 limit: ${c.length}`);
  }
  // Nothing may be lost in the split.
  const rejoined = chunks.join(" ").replace(/\s+/g, " ").trim();
  assert.equal(rejoined, sentence.repeat(80).replace(/\s+/g, " ").trim());
});

test("a single oversized sentence is broken on whitespace", () => {
  const chunks = chunkForSpeech("word ".repeat(2000).trim(), 2500);
  assert.ok(chunks.length > 1);
  for (const c of chunks) assert.ok(c.length <= 2500, `chunk ${c.length}`);
});

test("empty input yields no chunks", () => {
  assert.deepEqual(chunkForSpeech(""), []);
  assert.deepEqual(chunkForSpeech("   "), []);
});

console.log("\nmarkdown normalization for speech\n");

test("code fences are not read aloud", () => {
  const out = normalizeForSpeech("Here is code:\n\n```js\nconst a = 1;\n```\n\nDone.");
  assert.ok(!out.includes("const a = 1"), `code leaked: ${out}`);
  assert.ok(out.includes("Done."));
});

test("inline code keeps its text without backticks", () => {
  const out = normalizeForSpeech("Use `map` here.");
  assert.ok(out.includes("map"));
  assert.ok(!out.includes("`"));
});

test("link labels survive, URLs do not", () => {
  const out = normalizeForSpeech("See [the docs](https://example.com/x) for more.");
  assert.ok(out.includes("the docs"));
  assert.ok(!out.includes("https://"), `url leaked: ${out}`);
});

test("emphasis markers are stripped", () => {
  const out = normalizeForSpeech("The **whole** key is *important* and __also__ this.");
  assert.ok(!out.includes("*"), `asterisk leaked: ${out}`);
  assert.ok(!out.includes("__"), `underscore leaked: ${out}`);
  assert.ok(out.includes("whole") && out.includes("important"));
});

test("an asterisk in arithmetic is not treated as emphasis", () => {
  const out = normalizeForSpeech("Salary grows about 2 * 3 = 6 percent.");
  assert.ok(out.includes("2 * 3 = 6"), `maths mangled: ${out}`);
});

test("table rows do not leak pipe characters", () => {
  const out = normalizeForSpeech("| Form | Removes |\n| --- | --- |\n| 2NF | partial |");
  assert.ok(!out.includes("|"), `pipe leaked: ${out}`);
});

test("headings and bullets lose their markers", () => {
  const out = normalizeForSpeech("## Heading\n\n- first\n- second");
  assert.ok(!out.includes("#"));
  assert.ok(out.includes("Heading") && out.includes("first"));
});

test("normalization is capped", () => {
  assert.ok(normalizeForSpeech("word ".repeat(2000), 2500).length <= 2500);
});

console.log("");
if (failures.length > 0) {
  console.error(`voice transcript check failed: ${failures.length} of ${passed + failures.length}\n`);
  process.exit(1);
}
console.log(`voice transcript check passed (${passed} assertions)\n`);
