// Structural check on the career assessment flow.
//
// Two defects here were invisible to logic tests because they lived in the
// component's control flow:
//
//   1. A failed request reset the flow from a `finally`, discarding every
//      answer — the student was thrown back to the first screen and had to
//      redo the whole assessment. It read as the button being broken.
//   2. Step 3 (career goals) was the only step with no guard, so its
//      requirement surfaced on the last step as a bounce back instead of the
//      button doing something visible from there.
//
// Both are source-level properties, so they are asserted against the source.
//
// Run: npm run check:flow
import { readFileSync } from "node:fs";

const source = readFileSync("components/career/AssessmentForm.tsx", "utf8");

let failures = 0;
const check = (name, condition, detail = "") => {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

/**
 * Every `finally` block in the submit paths, as source text. Resetting the flow
 * from one of these is the bug: the request's outcome is not known there.
 */
const finallyBlocks = [...source.matchAll(/finally \{([\s\S]*?)\n\s*\}/g)].map((m) => m[1]);
console.log(`Found ${finallyBlocks.length} finally block(s)`);

check(
  "no finally block resets the assessment flow",
  finallyBlocks.every((block) => !/setMode\(/.test(block)),
  finallyBlocks
    .filter((block) => /setMode\(/.test(block))
    .map((block) => block.trim().replace(/\s+/g, " ").slice(0, 80))
    .join(" | ")
);
check(
  "no finally block clears the answers",
  finallyBlocks.every((block) => !/setVoiceAnswers\(|setSkills\(\[\]|setSelectedInterests\(\[\]/.test(block))
);

// Every step that collects a requirement must refuse to advance without it.
const stepGuards = [...source.matchAll(/if \(step === (\d) && ([^)]+)\)/g)].map((m) => ({
  step: m[1],
  condition: m[2],
}));
console.log(`  step guards: ${stepGuards.map((g) => g.step).join(", ")}`);

for (const step of ["1", "2", "3", "4"]) {
  check(
    `step ${step} refuses to advance when its requirement is missing`,
    stepGuards.some((guard) => guard.step === step),
    `guards found for steps: ${stepGuards.map((g) => g.step).join(",")}`
  );
}
check(
  "step 3 checks the goals text",
  stepGuards.some((guard) => guard.step === "3" && /goals/.test(guard.condition))
);

// Success is what leaves the flow, in both paths.
// Each success site through to the end of its enclosing block: the two submit
// paths differ in indentation, so the boundary is the next top-level close.
const successExits = [
  ...source.matchAll(
    /toast\.success\("Mission roadmap loaded successfully!"\)([\s\S]{0,300}?)(?=\n\s*\} catch|\n\s*\} finally)/g
  ),
];
check("both submit paths report success", successExits.length === 2, `${successExits.length} found`);
check(
  "a successful run leaves the flow in both paths",
  successExits.every((match) => /setMode\("choice"\)/.test(match[1])),
  "a path that succeeds but stays put would strand the student on the last step"
);
check(
  "a failed run returns to a screen the student can act on",
  (source.match(/toast\.error\(message\);[\s\S]{0,200}?setMode\("choice"\)/g) || []).length >= 1
);
check(
  "voice answers survive for a retry",
  /voiceAnswers\.length > 0 &&/.test(source) && /Retry voice analysis/.test(source)
);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
