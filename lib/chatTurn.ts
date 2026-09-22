/**
 * Shaping a chat turn before it is written to the database.
 *
 * A reasoning model streams its whole chain of thought, and a long answer can
 * produce tens of thousands of characters of it — one real turn produced 61,436.
 * The schema caps the field at 20,000, so the save threw a validation error and
 * the assistant's reply was lost with it: the student saw the error instead of
 * their answer, and the turn was missing on reload.
 *
 * The trace is a disclosure, not the answer. Keeping its beginning is enough to
 * show that the model reasoned and what it considered; the tail is trimmed at
 * write time so a long thought cannot cost the reply that follows it.
 */

/** Below the schema's own cap, so a stored turn can never fail validation. */
export const REASONING_STORE_LIMIT = 12_000;
const TRUNCATION_NOTICE = "\n\n[thinking truncated]";

export interface AssistantTurnInput {
  content: string;
  reasoning?: string;
}

export interface AssistantTurn {
  content: string;
  reasoning?: string;
}

/** Trims a reasoning trace to what is worth storing and showing. */
export function capReasoning(reasoning: string | undefined): string | undefined {
  if (!reasoning) return undefined;
  const trimmed = reasoning.trimEnd();
  if (!trimmed) return undefined;
  if (trimmed.length <= REASONING_STORE_LIMIT) return trimmed;

  return `${trimmed.slice(0, REASONING_STORE_LIMIT - TRUNCATION_NOTICE.length)}${TRUNCATION_NOTICE}`;
}

/**
 * The fields of an assistant turn that are written to storage.
 *
 * The reply itself is passed through untouched: it is what the student asked
 * for, and trimming it would change the answer rather than a disclosure.
 */
export function shapeAssistantTurn({ content, reasoning }: AssistantTurnInput): AssistantTurn {
  return { content, reasoning: capReasoning(reasoning) };
}
