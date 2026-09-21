// Measures how often a question reaches the passage that answers it.
//
// This exists to answer one question with evidence: does semantic retrieval
// (embeddings) earn its cost over the lexical ranking already in place?
//
// The corpus is synthetic but shaped like the documents this app receives:
// study notes worded in their own vocabulary, across several fields. Half the
// questions are phrased in the document's own words; half are paraphrases a
// student would actually type. The paraphrase half is where a lexical ranker
// is expected to struggle, so it is reported separately.
//
// Run: npm run measure:retrieval
import { compileLibModules } from "./lib/compile-for-node.mjs";

compileLibModules({
  tmp: ".tmp/retrieval-measure",
  outDir: "build",
  include: ["../../lib/documentContext.ts"],
});

const { buildDocumentContext } = await import(
  "../.tmp/retrieval-measure/build/documentContext.js"
);

// ─── A corpus of study notes, with real competition for the budget ───────────
const PASSAGES_PER_DOC = 60;
const PLANTED_PER_DOC = 8;

/** Filler passages, each with its own vocabulary so they are plausible noise. */
function fillerPassage(seed) {
  const nouns = ["buffer", "cursor", "handle", "segment", "frame", "bucket", "shard", "lease",
                 "token", "quota", "ledger", "packet", "slot", "chunk", "region", "vector"];
  const verbs = ["allocates", "reserves", "reclaims", "schedules", "reorders", "throttles",
                 "coalesces", "evicts", "batches", "streams"];
  const noun = nouns[seed % nouns.length];
  const verb = verbs[seed % verbs.length];
  const other = nouns[(seed * 7 + 3) % nouns.length];
  return `The ${noun} ${verb} the ${other} according to the configured policy, and the result is recorded for the next cycle. Nothing here changes observable behaviour.`;
}

// Each planted fact is written in its own vocabulary and labelled for the key.
const plantedFacts = [
  ["index", "An index is a sorted structure that lets the engine jump to matching rows instead of touching every one."],
  ["scan", "When no suitable index exists the planner reads every row; cost grows linearly with the relation's cardinality."],
  ["wal", "The write-ahead log records changes before they reach the data files, so a crash can be replayed rather than losing work."],
  ["deadlock", "Two transactions touching the same rows in opposite order can wait on each other forever; the engine aborts one to break the cycle."],
  ["batching", "Grouping many small writes into fewer larger ones reduces the per-operation overhead paid by the storage layer."],
  ["covering", "A covering index answers a query from the index alone, so the table is never consulted."],
  ["pool", "Connections are expensive to establish; a pool reuses a small set of them across many requests."],
  ["statistics", "Stale statistics mislead the planner into choosing a poor strategy, even when the right index exists."],
  ["rendering", "The critical rendering path is the sequence of steps between receiving bytes and painting pixels."],
  ["reflow", "Layout is recalculated whenever geometry changes; touching the wrong property forces the browser to redo it for the whole tree."],
  ["parallel", "Assets fetched in parallel finish sooner than the same bytes fetched one after another."],
  ["blocking", "Long synchronous work occupies the only thread, so input events and timers wait until it yields."],
  ["images", "Images dominate page weight; serving them at the size they are displayed avoids transferring wasted pixels."],
  ["cache", "A cache turns a network round trip into a local read, which is why repeat visits feel instant."],
  ["profiling", "Measuring before optimising avoids spending effort on code that was never the constraint."],
  ["lazy", "Deferring work until it is needed keeps the initial payload small and the first paint early."],
  ["hygiene", "Hand hygiene before and after every patient contact is the single most effective way to stop transmission."],
  ["identity", "Confirm identity using two independent identifiers before administering anything."],
  ["deterioration", "Escalate a deteriorating patient immediately rather than waiting for the next scheduled review."],
  ["documentation", "Documentation written at the time of care is more reliable than recollection hours later."],
  ["pressure", "Pressure areas need redistributing on a schedule; immobility is what causes breakdown."],
  ["fluid", "Fluid balance charts reveal trends that a single measurement cannot show."],
  ["consent", "Consent must be informed and voluntary, and a patient may withdraw it at any point."],
  ["family", "Family concerns are clinical information and belong in the record."],
  ["spacing-design", "A scale of spacing values keeps rhythm consistent and removes per-screen guesswork."],
  ["contrast", "Contrast between text and its background determines whether the text can be read at all."],
  ["component", "A component should own its appearance so a change lands in one place rather than every screen."],
  ["focus", "Focus order should follow reading order so keyboard users are not sent around the page."],
  ["disabled", "Disabled controls hide the reason they are unavailable; explaining the requirement is kinder."],
  ["error", "Error messages belong next to the field that caused them, not in a summary elsewhere."],
  ["type", "Type set too small for its context is a failure regardless of how well it is drawn."],
  ["motion", "Motion should clarify a change of state, never decorate one."],
  ["compounding", "Compounding means returns earn returns, so time in the market matters more than the amount added."],
  ["diversification", "Diversification spreads risk because unrelated holdings rarely fall together."],
  ["emergency", "An emergency fund covering several months of expenses prevents borrowing when income stops."],
  ["fees", "Fees compound against you exactly as returns compound for you."],
  ["insurance", "Insurance transfers a catastrophic loss to a pool in exchange for a predictable payment."],
  ["debt", "Debt at a higher rate than the expected return should be cleared before investing."],
  ["tax", "Tax-advantaged accounts change the arithmetic of where an investment is held."],
  ["budget", "A budget is a plan for money already earned, not a restriction invented afterwards."],
  ["recall", "Retrieving an answer from memory strengthens it more than reading the answer again."],
  ["spacing", "Spacing sessions apart beats the same total hours crammed together."],
  ["interleaving", "Interleaving related topics forces the brain to choose a method, which is what exams require."],
  ["explaining", "Explaining a concept aloud exposes the gaps that silent reading conceals."],
  ["sleep", "Sleep consolidates what was learned that day; cutting it costs more than the extra hour buys."],
  ["examples", "Working examples first, then solving independently, prevents floundering without feedback."],
  ["mistakes", "A mistake reviewed immediately is remembered; the same mistake unnoticed repeats."],
  ["notes", "Notes rewritten in your own words are worth more than a transcript of the lecture."],
];

const DOCS = [
  { filename: "database-internals.md", keys: ["index", "scan", "wal", "deadlock", "batching", "covering", "pool", "statistics"] },
  { filename: "web-performance.md", keys: ["rendering", "reflow", "parallel", "blocking", "images", "cache", "profiling", "lazy"] },
  { filename: "clinical-placement.md", keys: ["hygiene", "identity", "deterioration", "documentation", "pressure", "fluid", "consent", "family"] },
  { filename: "design-systems.md", keys: ["spacing-design", "contrast", "component", "focus", "disabled", "error", "type", "motion"] },
  { filename: "finance-basics.md", keys: ["compounding", "diversification", "emergency", "fees", "insurance", "debt", "tax", "budget"] },
  { filename: "study-skills.md", keys: ["recall", "spacing", "interleaving", "explaining", "sleep", "examples", "mistakes", "notes"] },
];

const factByKey = new Map(plantedFacts);
const documents = DOCS.map((doc, docIndex) => {
  // Planted facts are spread evenly and offset per document, so their position
  // is not a signal a ranker could exploit.
  const positions = new Map();
  doc.keys.forEach((key, i) => {
    const slot = Math.round(((i + 0.5) * PASSAGES_PER_DOC) / PLANTED_PER_DOC) + docIndex * 3;
    positions.set(Math.min(slot, PASSAGES_PER_DOC - 1), { key, text: factByKey.get(key) });
  });

  const passageTexts = Array.from({ length: PASSAGES_PER_DOC }, (_, slot) => {
    const planted = positions.get(slot);
    const body = planted ? planted.text : fillerPassage(slot * 31 + docIndex * 7);
    return `${body}\n\nSupplementary note for part ${slot + 1}: ${fillerPassage(slot + 101)}\n-- ${slot + 1} of ${PASSAGES_PER_DOC} --`;
  });

  return {
    filename: doc.filename,
    content: passageTexts.join("\n"),
    // slot (1-based) → the sentence that answers the question, for scoring.
    planted: new Map(
      [...positions.entries()].map(([slot, value]) => [slot + 1, value.text])
    ),
  };
});

const documentByFile = new Map(documents.map((doc) => [doc.filename, doc]));

// ─── Questions: half in the document's words, half paraphrased ───────────────
// [question, document, the planted sentence that answers it]
const questions = [
  // Direct wording.
  ["What is a covering index?", "database-internals.md", "A covering index answers a query from the index alone"],
  ["Why use a connection pool?", "database-internals.md", "Connections are expensive to establish"],
  ["How does the write-ahead log help after a crash?", "database-internals.md", "The write-ahead log records changes"],
  ["What causes layout reflow?", "web-performance.md", "Layout is recalculated whenever geometry changes"],
  ["Why defer work until it is needed?", "web-performance.md", "Deferring work until it is needed"],
  ["When should a patient be escalated?", "clinical-placement.md", "Escalate a deteriorating patient immediately"],
  ["Why is documentation timing important?", "clinical-placement.md", "Documentation written at the time of care"],
  ["What does diversification do to risk?", "finance-basics.md", "Diversification spreads risk"],
  ["Why does an emergency fund matter?", "finance-basics.md", "An emergency fund covering several months"],
  ["What is interleaving?", "study-skills.md", "Interleaving related topics forces the brain"],
  ["Why rewrite notes in your own words?", "study-skills.md", "Notes rewritten in your own words"],
  ["What determines whether text can be read?", "design-systems.md", "Contrast between text and its background"],

  // Paraphrases: a student's wording, sharing little with the page.
  ["Why does my app get sluggish once we have lots of users?", "database-internals.md", "cost grows linearly with the relation's cardinality"],
  ["Two people editing the same record keep freezing each other — why?", "database-internals.md", "the engine aborts one to break the cycle"],
  ["Why does my site feel janky when I scroll on a cheap phone?", "web-performance.md", "input events and timers wait until it yields"],
  ["Why is a repeat visit so much faster than the first one?", "web-performance.md", "A cache turns a network round trip into a local read"],
  ["How do I stop bugs spreading between patients on the ward?", "clinical-placement.md", "most effective way to stop transmission"],
  ["A patient says they no longer want the procedure — what do I do?", "clinical-placement.md", "a patient may withdraw it at any point"],
  ["Why do small hidden charges matter so much over decades?", "finance-basics.md", "Fees compound against you"],
  ["Should I clear my loan before putting money in the market?", "finance-basics.md", "should be cleared before investing"],
  ["Why can't I remember anything despite re-reading the chapter?", "study-skills.md", "Retrieving an answer from memory strengthens it"],
  ["I study in one long session the night before — why does that fail?", "study-skills.md", "Spacing sessions apart beats the same total hours"],
  ["Why should I say my answer out loud?", "study-skills.md", "Explaining a concept aloud exposes the gaps"],
  ["Should the label sit right under the box it belongs to?", "design-systems.md", "Error messages belong next to the field"],
  ["Why can't a greyed-out button just say nothing?", "design-systems.md", "Disabled controls hide the reason"],
  ["Why should the tab key move in the order I read?", "design-systems.md", "Focus order should follow reading order"],
  ["What makes small amounts grow big over a long time?", "finance-basics.md", "Compounding means returns earn returns"],
  ["My chest drain notes are always written hours later — does it matter?", "clinical-placement.md", "more reliable than recollection hours later"],
  ["Why does adding another server not always help?", "database-internals.md", "Grouping many small writes into fewer larger ones"],
  ["The page jumps around while it loads — why?", "web-performance.md", "serving them at the size they are displayed"],
  ["How do I keep the first screen light?", "web-performance.md", "keeps the initial payload small"],
];

// ─── Scoring ─────────────────────────────────────────────────────────────────
const isParaphrase = (index) => index >= 12;

let directHits = 0;
let directTotal = 0;
let paraHits = 0;
let paraTotal = 0;
const misses = [];
let passagesConsidered = 0;
let passagesShown = 0;

/*
 * The budget is deliberately tighter than the document. With the default 32k a
 * ~21k document is passed whole and nothing is selected, which would measure the
 * whole-document shortcut instead of the ranking. 6k forces roughly five of
 * sixty passages to be chosen — the same pressure three documents share a 32k
 * budget under.
 */
const MEASURE_BUDGET = 6_000;

questions.forEach(([question, filename, answerSentence], index) => {
  const document = documentByFile.get(filename);
  const context = buildDocumentContext(
    [{ filename, contentText: document.content }],
    { question, budgetChars: MEASURE_BUDGET }
  );

  const found = context.includes(answerSentence);
  passagesConsidered += PASSAGES_PER_DOC;
  passagesShown += (context.match(/\[part \d+ of \d+/g) || []).length;

  if (isParaphrase(index)) {
    paraTotal++;
    if (found) paraHits++;
  } else {
    directTotal++;
    if (found) directHits++;
  }
  if (!found) misses.push([isParaphrase(index) ? "paraphrase" : "direct", question]);
});

const pct = (hit, total) => `${total ? Math.round((hit / total) * 100) : 0}% (${hit}/${total})`;
const selectionRate = ((passagesShown / passagesConsidered) * 100).toFixed(0);

console.log(`Documents: ${documents.length}, passages per document: ${PASSAGES_PER_DOC}`);
console.log(`Questions: ${questions.length}`);
console.log(`Selectivity: ${selectionRate}% of passages reached the prompt (real competition)\n`);
console.log(`  direct wording   ${pct(directHits, directTotal)}`);
console.log(`  paraphrased      ${pct(paraHits, paraTotal)}`);
console.log(`  overall          ${pct(directHits + paraHits, directTotal + paraTotal)}\n`);

if (misses.length) {
  console.log("Misses:");
  for (const [kind, question] of misses) console.log(`  [${kind}] ${question}`);
}
