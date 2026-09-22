// Guards the size of a stored chat turn.
//
// The real failure: a reasoning model streamed 61,436 characters of chain of
// thought, the turn was written with all of it, and the schema's 20,000
// character cap rejected the save. The student saw "You can try sending the
// message again" instead of their answer, and the turn was missing on reload —
// the trace is a disclosure, but its size cost the reply.
//
// Run: npm run check:turn
import { readFileSync } from "node:fs";
import { compileLibModules } from "./lib/compile-for-node.mjs";

compileLibModules({
  tmp: ".tmp/turn-check",
  outDir: "build",
  include: ["../../lib/chatTurn.ts"],
});

const { capReasoning, shapeAssistantTurn, REASONING_STORE_LIMIT } = await import(
  "../.tmp/turn-check/build/chatTurn.js"
);

let failures = 0;
const check = (name, condition, detail = "") => {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

/** The cap the schema enforces, read from the model rather than copied. */
const schemaCap = (() => {
  const model = readFileSync("models/ChatHistory.ts", "utf8");
  return Number(model.match(/reasoning:\s*\{\s*type:\s*String,\s*maxlength:\s*(\d+)/)?.[1] ?? 0);
})();
check("the schema's reasoning cap was found", schemaCap > 0, `parsed ${schemaCap}`);

console.log("\nThe failure that was reported");
{
  const trace = "The student wants me to answer".padEnd(61_436, " reasoning continues");
  const turn = shapeAssistantTurn({ content: "Here is the answer.", reasoning: trace });

  check("the reply is stored unchanged", turn.content === "Here is the answer.");
  check(
    "the trace now fits the schema",
    (turn.reasoning?.length ?? 0) <= schemaCap,
    `${turn.reasoning?.length} chars vs a ${schemaCap} cap`
  );
  check("the stored trace is capped at the store limit", (turn.reasoning?.length ?? 0) <= REASONING_STORE_LIMIT);
  check("the beginning of the trace is kept", turn.reasoning?.startsWith("The student wants me to answer") === true);
  check("truncation is visible in the text", turn.reasoning?.endsWith("[thinking truncated]") === true);
}

console.log("\nOrdinary turns are untouched");
{
  check("a short trace passes through", capReasoning("Brief thought.") === "Brief thought.");
  check("no trace stays absent", capReasoning(undefined) === undefined);
  check("an empty trace is not stored", capReasoning("") === undefined);
  check("whitespace alone is not stored", capReasoning("   \n  ") === undefined);
  check("trailing whitespace is trimmed", capReasoning("thought.  \n") === "thought.");
}

console.log("\nThe boundary");
{
  const exact = "x".repeat(REASONING_STORE_LIMIT);
  check("a trace exactly at the limit is not marked truncated", capReasoning(exact)?.endsWith("[thinking truncated]") === false);

  const over = "x".repeat(REASONING_STORE_LIMIT + 1);
  const capped = capReasoning(over) ?? "";
  check("one character over is trimmed", capped.endsWith("[thinking truncated]"));
  check("and stays within the limit", capped.length <= REASONING_STORE_LIMIT, `${capped.length}`);
}

console.log("\nA long answer with a long trace");
{
  // A study guide is legitimately long; only the trace may be trimmed.
  const answer = "# Guide\n\n".padEnd(30_000, "Body paragraph. ");
  const turn = shapeAssistantTurn({ content: answer, reasoning: "y".repeat(80_000) });
  check("the answer is never trimmed", turn.content.length === answer.length);
  check("the trace is trimmed", (turn.reasoning?.length ?? 0) < 80_000);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
