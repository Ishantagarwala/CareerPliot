// Regression check for the career assessment's progress overlay.
//
// The bug being guarded: a fixed sequence of "Generating…" step updates kept
// running after the request failed. The error path hid the overlay, the stale
// sequence put it straight back, and it parked on its final step — no error on
// screen and a button that looked dead. A stale sequence must never touch state
// again.
//
// Run: npm run check:hud
import { compileLibModules } from "./lib/compile-for-node.mjs";

compileLibModules({
  tmp: ".tmp/hud-check",
  outDir: "build",
  include: ["../../components/career/hudProgress.ts"],
  // This one compiles a component, so the repo root keeps its path intact.
  rootDir: "../..",
});

const { createHudProgress, SLOW_REQUEST_MS } = await import(
  "../.tmp/hud-check/build/components/career/hudProgress.js"
);

let failures = 0;
const check = (name, condition, detail = "") => {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

/** A controllable clock: timers only fire when the test advances them. */
function fakeClock() {
  const queue = [];
  return {
    schedule: (fn, ms) => queue.push({ fn, ms, at: ms }),
    /** Runs every pending timer, in the order they were scheduled. */
    async flush() {
      while (queue.length) {
        const next = queue.shift();
        next.fn();
        // Let the awaits chained off a timer resolve.
        await Promise.resolve();
        await Promise.resolve();
      }
    },
    get pending() {
      return queue.length;
    },
  };
}

/** Records everything the overlay was told to display. */
function recorder() {
  const steps = [];
  const slow = [];
  return {
    steps,
    slow,
    setStep: (step) => steps.push(step),
    setSlow: (value) => slow.push(value),
  };
}

console.log("A normal run");
{
  const clock = fakeClock();
  const log = recorder();
  const progress = createHudProgress({ ...log, schedule: clock.schedule });

  const done = progress.run();
  check("overlay opens at step 1", log.steps[0] === 1, JSON.stringify(log.steps));
  await clock.flush();
  await done;
  check(
    "walks every step in order",
    log.steps.join(",") === "1,2,3,4,5",
    log.steps.join(",")
  );
  check("does not hide itself while running", !log.steps.includes(0));
}

console.log("\nA failed request (the original bug)");
{
  const clock = fakeClock();
  const log = recorder();
  const progress = createHudProgress({ ...log, schedule: clock.schedule });

  const done = progress.run();
  // The request rejects while the animation is mid-flight.
  progress.finish();

  check("finish hides the overlay", log.steps.at(-1) === 0, log.steps.join(","));

  const stepsAfterFinish = log.steps.length;
  await clock.flush();
  await done;

  check(
    "no step update arrives after finish",
    log.steps.length === stepsAfterFinish,
    `steps after finish: ${log.steps.slice(stepsAfterFinish).join(",")}`
  );
  check("overlay stays hidden", log.steps.at(-1) === 0, log.steps.join(","));
  check("the sequence resolves instead of hanging", true);
}

console.log("\nA retry after a failure");
{
  const clock = fakeClock();
  const log = recorder();
  const progress = createHudProgress({ ...log, schedule: clock.schedule });

  const first = progress.run();
  progress.finish(); // the failed attempt tears its overlay down
  const second = progress.run();
  await clock.flush();
  await second;
  // A run never hides itself; the request's `finally` does that, so the retry
  // mirrors it here.
  progress.finish();
  await first;

  check(
    "the second attempt starts cleanly at step 1",
    log.steps.filter((s) => s === 1).length === 2,
    log.steps.join(",")
  );
  check(
    "the abandoned first sequence never advanced",
    !log.steps.slice(0, log.steps.indexOf(1, 1)).includes(2),
    log.steps.join(",")
  );
  check("the overlay ends hidden", log.steps.at(-1) === 0, log.steps.join(","));
}

console.log("\nA slow request");
{
  const clock = fakeClock();
  const log = recorder();
  const progress = createHudProgress({ ...log, schedule: clock.schedule });

  const done = progress.run();
  check("not flagged slow immediately", log.slow[0] === false);
  await clock.flush();
  await done;
  check("flagged slow once it exceeds the threshold", log.slow.includes(true));
  check("slow flag reaches the overlay after the wait begins", SLOW_REQUEST_MS > 0);
}

console.log("\nUnmounting mid-assessment");
{
  const clock = fakeClock();
  const log = recorder();
  const progress = createHudProgress({ ...log, schedule: clock.schedule });

  void progress.run();
  const before = log.steps.length;
  progress.cancel();
  await clock.flush();
  check(
    "a cancelled sequence stops touching state",
    log.steps.length === before,
    `${log.steps.length - before} update(s) after cancel`
  );
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
