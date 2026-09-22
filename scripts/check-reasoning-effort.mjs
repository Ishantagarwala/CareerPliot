// Guards the thinking-effort setting.
//
// The provider validates `reasoning_effort` and rejects anything outside its own
// set, so a level added here that the provider does not accept would fail the
// whole turn with a 400 rather than degrade. These checks keep the list, the
// display metadata and the database enum in step.
//
// Run: npm run check:effort
import { readFileSync } from "node:fs";
import { compileLibModules } from "./lib/compile-for-node.mjs";

compileLibModules({
  tmp: ".tmp/effort-check",
  outDir: "build",
  include: ["../../lib/reasoningEffort.ts"],
});

const {
  REASONING_EFFORTS,
  EFFORT_CHOICES,
  DEFAULT_REASONING_EFFORT,
  isReasoningEffort,
  toReasoningEffort,
  effortLabel,
} = await import("../.tmp/effort-check/build/reasoningEffort.js");

let failures = 0;
const check = (name, condition, detail = "") => {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

/*
 * The set the configured provider accepts, quoted from its own 400 response:
 *   expected: 'none', 'minimal', 'low', 'medium', 'high', 'xhigh' or 'max'
 * A level outside this list is a request the provider refuses.
 */
const PROVIDER_ACCEPTED = ["none", "minimal", "low", "medium", "high", "xhigh", "max"];

console.log("The level list");
check(
  "every level is one the provider accepts",
  REASONING_EFFORTS.every((level) => PROVIDER_ACCEPTED.includes(level)),
  REASONING_EFFORTS.filter((l) => !PROVIDER_ACCEPTED.includes(l)).join(", ")
);
check(
  "no accepted level is missing",
  PROVIDER_ACCEPTED.every((level) => REASONING_EFFORTS.includes(level)),
  PROVIDER_ACCEPTED.filter((l) => !REASONING_EFFORTS.includes(l)).join(", ")
);
check("the list has no duplicates", new Set(REASONING_EFFORTS).size === REASONING_EFFORTS.length);
check("the default is a real level", isReasoningEffort(DEFAULT_REASONING_EFFORT));

console.log("\nValidation");
for (const level of REASONING_EFFORTS) {
  check(`accepts "${level}"`, isReasoningEffort(level));
}
for (const value of ["banana", "extra_high", "very_high", "MAX", "", null, undefined, 42, {}, ["low"]]) {
  check(
    `rejects ${JSON.stringify(value) ?? String(value)}`,
    !isReasoningEffort(value),
    "an unvalidated value is a 400 from the provider"
  );
}
check("an unknown value falls back to the default", toReasoningEffort("banana") === DEFAULT_REASONING_EFFORT);
check("a valid value is kept", toReasoningEffort("max") === "max");

console.log("\nThe picker's labels");
check("every level has an entry", EFFORT_CHOICES.length === REASONING_EFFORTS.length);
check(
  "entries cover exactly the levels",
  EFFORT_CHOICES.every((choice) => REASONING_EFFORTS.includes(choice.value)) &&
    REASONING_EFFORTS.every((level) => EFFORT_CHOICES.some((choice) => choice.value === level))
);
check("every entry has a label and a hint", EFFORT_CHOICES.every((c) => c.label && c.hint));
check("no empty labels", EFFORT_CHOICES.every((c) => c.label.trim().length > 0));
check("labels are ordered least to most effort", EFFORT_CHOICES[0].value === "none" && EFFORT_CHOICES.at(-1).value === "max");
check("effortLabel resolves a level", effortLabel("xhigh") === "Extra high", effortLabel("xhigh"));
check("effortLabel falls back to the raw value", effortLabel("unknown-level") === "unknown-level");

console.log("\nThe database enum matches");
{
  const model = readFileSync("models/ChatHistory.ts", "utf8");
  const enumLine = model.match(/reasoningEffort:\s*\{[\s\S]*?enum:\s*\[([^\]]+)\]/)?.[1] ?? "";
  const stored = [...enumLine.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  check("the model lists the same levels", stored.join(",") === REASONING_EFFORTS.join(","), `model: [${stored.join(",")}]`);
  check("the model defaults to the same level", model.includes(`default: '${DEFAULT_REASONING_EFFORT}'`));
  check(
    "the route validates before sending",
    /isReasoningEffort\(body\.reasoningEffort\)/.test(readFileSync("app/api/ai-hub/chat/route.ts", "utf8"))
  );
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
