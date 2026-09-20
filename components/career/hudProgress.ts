/**
 * The progress sequence behind the career assessment's "Generating…" overlay.
 *
 * Exported as a plain factory, separate from React, because the bug it fixes
 * was in the sequencing rather than in rendering: a fixed sequence of step
 * updates kept running after the request failed, so the overlay was hidden by
 * the error path and immediately re-shown by the stale sequence — parking it on
 * its last step with no error visible and a button that appeared dead.
 *
 * Every sequence carries an id and checks it before touching state. `finish`
 * bumps the id, so anything already in flight becomes a no-op.
 */

/** Steps a single assessment walks through, in order. */
export const HUD_STAGES = 5;
const STEP_INTERVAL_MS = 800;
const FINAL_PAUSE_MS = 1200;

/** After this long, the overlay says the wait is normal rather than stalled. */
export const SLOW_REQUEST_MS = 12_000;

export interface HudProgressOptions {
  setStep: (step: number) => void;
  setSlow: (slow: boolean) => void;
  /** Injectable so the check can drive it without real timers. */
  schedule?: (fn: () => void, ms: number) => void;
}

export interface HudProgress {
  /** Starts the overlay; resolves when the sequence ends or is superseded. */
  run: () => Promise<void>;
  /** Hides the overlay and cancels any in-flight sequence. */
  finish: () => void;
  /** Cancels without touching state — used when the component unmounts. */
  cancel: () => void;
}

export function createHudProgress({
  setStep,
  setSlow,
  schedule = (fn, ms) => {
    setTimeout(fn, ms);
  },
}: HudProgressOptions): HudProgress {
  let currentRun = 0;

  return {
    async run() {
      const runId = ++currentRun;
      const isCurrent = () => currentRun === runId;

      setStep(1);
      setSlow(false);
      schedule(() => {
        if (isCurrent()) setSlow(true);
      }, SLOW_REQUEST_MS);

      for (let step = 2; step <= HUD_STAGES; step++) {
        await new Promise<void>((resolve) => schedule(resolve, STEP_INTERVAL_MS));
        if (!isCurrent()) return;
        setStep(step);
      }

      await new Promise<void>((resolve) => schedule(resolve, FINAL_PAUSE_MS));
    },

    finish() {
      currentRun += 1;
      setStep(0);
      setSlow(false);
    },

    cancel() {
      currentRun += 1;
    },
  };
}
