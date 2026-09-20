"use client";

import { useCallback, useRef, useState } from "react";
import { createHudProgress, type HudProgress } from "./hudProgress";

/**
 * React binding for the assessment's progress overlay.
 *
 * The sequencing itself lives in `hudProgress.ts` so it can be checked without
 * a DOM; this only holds the state and the instance across renders.
 */
export function useHudProgress() {
  const [hudStep, setHudStep] = useState(0);
  const [isSlow, setIsSlow] = useState(false);

  /*
   * Built once, in an effect rather than during render: the lint rules (rightly)
   * forbid touching a ref while rendering, and the instance is only ever used
   * from event handlers anyway.
   */
  const progressRef = useRef<HudProgress | null>(null);

  const getProgress = useCallback(() => {
    if (!progressRef.current) {
      progressRef.current = createHudProgress({ setStep: setHudStep, setSlow: setIsSlow });
    }
    return progressRef.current;
  }, []);

  const run = useCallback(() => getProgress().run(), [getProgress]);
  const finish = useCallback(() => getProgress().finish(), [getProgress]);

  return { hudStep, isSlow, run, finish };
}
