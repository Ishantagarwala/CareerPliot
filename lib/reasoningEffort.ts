/**
 * How much a reasoning model is allowed to think before answering.
 *
 * The provider validates this field — an unrecognised value is rejected with a
 * 400 that lists the accepted set — so these are the provider's own levels, not
 * a convention invented here. Measured on the configured router with a
 * reasoning-heavy question: `none` produced no thinking trace at all in ~2s,
 * while `max` produced 690+ characters of it and took up to 9s.
 *
 * The value is the OpenAI-compatible `reasoning_effort` request field.
 */

export const REASONING_EFFORTS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export const DEFAULT_REASONING_EFFORT: ReasoningEffort = "medium";

const EFFORT_SET = new Set<string>(REASONING_EFFORTS);

/** True when `value` is one of the levels the provider accepts. */
export function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return typeof value === "string" && EFFORT_SET.has(value);
}

/** Narrows an untrusted value, falling back to the default. */
export function toReasoningEffort(value: unknown): ReasoningEffort {
  return isReasoningEffort(value) ? value : DEFAULT_REASONING_EFFORT;
}

export interface EffortChoice {
  value: ReasoningEffort;
  label: string;
  hint: string;
}

/** Ordered slowest-deepest last, which is how the picker lists them. */
export const EFFORT_CHOICES: EffortChoice[] = [
  { value: "none", label: "None", hint: "Answer directly, no thinking" },
  { value: "minimal", label: "Minimal", hint: "Barely any thinking" },
  { value: "low", label: "Low", hint: "Quick questions, fast replies" },
  { value: "medium", label: "Mid", hint: "Balanced — the default" },
  { value: "high", label: "High", hint: "Harder problems, slower" },
  { value: "xhigh", label: "Extra high", hint: "Deep work, noticeably slower" },
  { value: "max", label: "Max", hint: "Slowest, most thorough" },
];

export function effortLabel(effort: ReasoningEffort): string {
  return EFFORT_CHOICES.find((choice) => choice.value === effort)?.label ?? effort;
}
