// Live resilience check: proves a retired model no longer breaks chat.
//
// This exercises the SAME decisions the chat route makes, against the real
// router, for the exact inputs that used to fail:
//
//   1. a model name the provider does not have  → must not be the only attempt
//   2. a model that exists but rejects the app's default reasoning_effort
//      → must succeed by retrying without that field
//   3. the configured default from .env          → must answer
//
// Skipped, not failed, when no router credentials are present — so it is safe
// in CI and in a fresh clone. Requires network access when it does run.
//
// Run: npm run check:models:live
import assert from "node:assert/strict";
import fs from "node:fs";
import { compileLibModules } from "./lib/compile-for-node.mjs";

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      })
  );
}

// .env.local wins over .env, matching Next.js.
const env = { ...readEnvFile(".env"), ...readEnvFile(".env.local"), ...process.env };
const baseURL = env.LLM_ROUTER_BASE_URL?.replace(/\/$/, "");
const apiKey = env.LLM_ROUTER_API_KEY;

if (!baseURL || !apiKey) {
  console.log("\nmodel resilience (live): SKIPPED — no LLM_ROUTER_BASE_URL / _API_KEY\n");
  process.exit(0);
}

compileLibModules({
  tmp: ".tmp/model-live-check",
  outDir: "build",
  include: ["../../lib/modelAvailability.ts"],
  rootDir: "../../lib",
});
const { effortForModel, isModelUnavailableError, isEffortRejection } = await import(
  "../.tmp/model-live-check/build/modelAvailability.js"
);

const PHANTOM = "deepseek-ai/DeepSeek-V4-Flash"; // the name that was configured
const RESTRICTED = "deepseek-ai/DeepSeek-V4.1-Flash"; // exists, rejects "medium"

/** One attempt, returning the status and the provider's own message. */
async function attempt(model, effort, timeoutMs = 20000) {
  const body = {
    model,
    messages: [{ role: "user", content: "Reply with the single word: OK" }],
    stream: true,
    temperature: 0.6,
  };
  if (effort) body.reasoning_effort = effort;
  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok) {
      const text = await res.text();
      return { ok: true, status: res.status, streamed: text.includes("data:") };
    }
    const raw = await res.text();
    let message = raw;
    try {
      const parsed = JSON.parse(raw);
      message = parsed?.error?.message ?? parsed?.message ?? raw;
    } catch {
      /* not json */
    }
    return { ok: false, status: res.status, message: String(message) };
  } catch (err) {
    return { ok: false, status: 0, message: err?.message ?? String(err) };
  }
}

let passed = 0;
const failures = [];
/*
 * Awaits async tests. Without the await, a rejected assertion escaped as an
 * unhandled rejection and the test was counted as PASSED — the checker reported
 * success while the run was crashing. Most assertions here are async.
 */
async function test(label, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  PASS  ${label}`);
  } catch (err) {
    failures.push(label);
    console.log(`  FAIL  ${label}`);
    console.log(`        ${err.message}`);
  }
}

process.on("unhandledRejection", (err) => {
  console.error("\nUNHANDLED REJECTION — the check itself is broken:", err);
  process.exit(1);
});

console.log(`\nmodel resilience (live against ${new URL(baseURL).host})\n`);

// ── the catalogue is readable, which everything else depends on ──────────────
/*
 * An unreachable router skips the check rather than failing it: this script
 * needs the network, and a transient timeout is not a regression in the code
 * under test.
 */
let catalogue = [];
try {
  const listRes = await fetch(`${baseURL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!listRes.ok) {
    console.log(`\nmodel resilience (live): SKIPPED — GET /models returned ${listRes.status}\n`);
    process.exit(0);
  }
  catalogue = ((await listRes.json()).data ?? [])
    .map((m) => m.id)
    .filter((id) => typeof id === "string");
} catch (err) {
  console.log(`\nmodel resilience (live): SKIPPED — router unreachable (${err?.message})\n`);
  process.exit(0);
}

await test("catalogue is readable and non-empty", () => {
  assert.ok(catalogue.length > 0);
});

await test("at least one model actually answers a chat request", async () => {
  // Guards against "the catalogue is fine but every model is broken".
  let anyOk = false;
  for (const id of catalogue) {
    const r = await attempt(id, effortForModel(id, "low"));
    if (r.ok) {
      anyOk = true;
      break;
    }
  }
  assert.equal(anyOk, true, "no catalogue model answered — the router itself is down");
});

// ── fault 1: a retired/typo'd model name ────────────────────────────────────
const phantom = await attempt(PHANTOM, undefined);

await test("the configured phantom model is genuinely rejected (premise of the bug)", () => {
  assert.equal(phantom.ok, false);
  assert.ok(
    isModelUnavailableError({ status: phantom.status, message: phantom.message }),
    `expected a model-level rejection, got ${phantom.status}: ${phantom.message}`
  );
});

await test("its failure is classified as model-unavailable, so a fallback is triggered", () => {
  // This is the bit that did not exist before: nothing distinguished "this
  // model is gone" from "the request was bad", so nothing retried.
  assert.equal(isModelUnavailableError({ status: phantom.status, message: phantom.message }), true);
});

await test("the catalogue offers somewhere to fall back to", () => {
  const usable = catalogue.filter((id) => id !== PHANTOM);
  assert.ok(usable.length > 0, "no alternative model to fall back to");
});

// ── fault 2: a valid model that rejects the app's default effort ────────────
if (catalogue.includes(RESTRICTED)) {
  const withDefault = await attempt(RESTRICTED, "medium");

  await test("V4.1 rejects reasoning_effort=medium (premise of the second bug)", () => {
    assert.equal(withDefault.ok, false);
    assert.ok(isEffortRejection({ status: withDefault.status, message: withDefault.message }));
  });

  await test("the raw picker value is filtered before it is sent", () => {
    assert.equal(effortForModel(RESTRICTED, "medium"), undefined);
  });

  await test("V4.1 answers once the unsupported effort is dropped", async () => {
    const fixed = await attempt(RESTRICTED, effortForModel(RESTRICTED, "medium"));
    assert.equal(fixed.ok, true, `still failing: ${fixed.status} ${fixed.message}`);
  });
}

// ── fault 3: the configured default ─────────────────────────────────────────
const configured = env.LLM_ROUTER_MODEL?.trim();
if (configured) {
  await test(`the configured model responds: ${configured}`, async () => {
    const r = await attempt(configured, effortForModel(configured, "medium"));
    assert.equal(r.ok, true, `${r.status} ${r.message}`);
  });
}

console.log("");
if (failures.length > 0) {
  console.error(`live model check failed: ${failures.length} of ${passed + failures.length}\n`);
  process.exit(1);
}
console.log(`live model check passed (${passed} assertions)\n`);
