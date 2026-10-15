// Regression check for resilient model selection.
//
// The failure being guarded, as it actually happened:
//
//   LLM_ROUTER_MODEL=deepseek-ai/DeepSeek-V4-Flash     ← provider has V4.1-Flash
//   → every chat request: 404 "Model not available."
//
// and, independently:
//
//   deepseek-ai/DeepSeek-V4.1-Flash + reasoning_effort="medium"
//   → 400 "DeepSeek V4.1 reasoning_effort must be low, high, xhigh, max"
//
// so the model the picker auto-selected was the one model that could not accept
// the app's own default. Two faults, each enough to break the Hub on its own,
// and neither had a fallback.
//
// The pure logic is checked here; the live end-to-end path is checked by
// `scripts/check-model-resilience-live.mjs`, which talks to the router.
//
// Run: npm run check:models
import assert from "node:assert/strict";
import { compileLibModules } from "./lib/compile-for-node.mjs";

compileLibModules({
  tmp: ".tmp/model-check",
  outDir: "build",
  include: ["../../lib/modelAvailability.ts"],
  rootDir: "../../lib",
});

const { effortForModel, isModelUnavailableError, isEffortRejection } = await import(
  "../.tmp/model-check/build/modelAvailability.js"
);

let passed = 0;
const failures = [];

function test(label, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${label}`);
  } catch (err) {
    failures.push(label);
    console.log(`  FAIL  ${label}`);
    console.log(`        ${err.message}`);
  }
}

console.log("\nper-model reasoning effort\n");

test("V4.1 rejects medium — the exact 400 that broke the default path", () => {
  assert.equal(effortForModel("deepseek-ai/DeepSeek-V4.1-Flash", "medium"), undefined);
});

test("V4.1 rejects minimal, which it also does not list", () => {
  assert.equal(effortForModel("deepseek-ai/DeepSeek-V4.1-Flash", "minimal"), undefined);
});

test("V4.1 keeps the levels it actually accepts", () => {
  for (const ok of ["low", "high", "xhigh", "max"]) {
    assert.equal(effortForModel("deepseek-ai/DeepSeek-V4.1-Flash", ok), ok);
  }
});

test("models with no special rule keep every level", () => {
  for (const ok of ["none", "minimal", "low", "medium", "high", "xhigh", "max"]) {
    assert.equal(effortForModel("zai-org/GLM-5.3-Flash", ok), ok);
  }
});

test("the rule is matched per model, not per router", () => {
  // Same router serves both; only one is restricted.
  assert.equal(effortForModel("deepseek-ai/DeepSeek-V4.1-Flash", "medium"), undefined);
  assert.equal(effortForModel("zai-org/GLM-5.3-Flash", "medium"), "medium");
});

test("an absent effort stays absent", () => {
  assert.equal(effortForModel("zai-org/GLM-5.3-Flash", undefined), undefined);
});

console.log("\nclassifying a failure\n");

test("a missing model is recognised from a 404", () => {
  assert.equal(isModelUnavailableError({ status: 404, message: "Model not available." }), true);
});

test("a missing model is recognised from a 400 that names it", () => {
  assert.equal(
    isModelUnavailableError({ status: 400, message: "The model does not exist." }),
    true
  );
});

test("an auth failure is NOT a missing model", () => {
  // Retrying a different model on a 401 would multiply the failure.
  assert.equal(isModelUnavailableError({ status: 401, message: "Invalid API key" }), false);
});

test("a rate limit is NOT a missing model", () => {
  assert.equal(isModelUnavailableError({ status: 429, message: "Too many requests" }), false);
});

test("an effort rejection is classified separately", () => {
  const err = {
    status: 400,
    message: "DeepSeek V4.1 reasoning_effort must be low, high, xhigh, max",
  };
  assert.equal(isEffortRejection(err), true);
  // It is not a model problem, so the same model should be retried.
  assert.equal(isModelUnavailableError(err), false);
});

test("a plain bad request is neither", () => {
  const err = { status: 400, message: "messages: field required" };
  assert.equal(isEffortRejection(err), false);
  assert.equal(isModelUnavailableError(err), false);
});

console.log("");
if (failures.length > 0) {
  console.error(`model check failed: ${failures.length} of ${passed + failures.length}\n`);
  process.exit(1);
}
console.log(`model check passed (${passed} assertions)\n`);
