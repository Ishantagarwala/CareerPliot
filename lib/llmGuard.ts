import { NextResponse } from "next/server";
import { rateLimit, rateLimitPeek, rateLimitRetryAfterMs } from "@/lib/security";

const HOUR = 60 * 60 * 1000;

/**
 * Per-user AI budget. Caps total LLM calls across the app so multi-account
 * spam cannot burn unlimited provider credits from a single session.
 *
 * Two limits apply to every AI action:
 *   - a per-action allowance (`bucketLimit`), charged once per request
 *   - a shared hourly ceiling (`LLM_USER_HOURLY_LIMIT`, default 25), charged
 *     once per model call — an action that calls the model more than once
 *     declares that in `cost`, so the ceiling reflects real spend rather than
 *     request count
 *
 * Every limit scales with `AI_LIMIT_MULTIPLIER` (default 1), which is the one
 * knob to turn up when testing locally.
 */
export function aiLimitMultiplier(): number {
  const raw = Number(process.env.AI_LIMIT_MULTIPLIER);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

export function enforceLlmBudget(
  userId: string,
  bucket: string,
  bucketLimit: number,
  options: { windowMs?: number; cost?: number } = {}
): NextResponse | null {
  const { windowMs = HOUR, cost = 1 } = options;
  const multiplier = aiLimitMultiplier();
  const scaled = (limit: number) => Math.max(1, Math.round(limit * multiplier));

  const bucketKey = `llm:bucket:${bucket}:${userId}`;
  const globalKey = `llm:global:${userId}`;
  const bucketAllowance = scaled(bucketLimit);
  const globalLimit = scaled(Number(process.env.LLM_USER_HOURLY_LIMIT || 25));

  /*
   * Both messages say when the limit lifts. "Try again later" left the student
   * unable to tell a temporary cap from a broken feature.
   */
  const limited = (key: string, message: string) => {
    const retryMs = Math.max(1, rateLimitRetryAfterMs(key));
    return NextResponse.json(
      {
        message: `${message} Try again in about ${Math.max(1, Math.ceil(retryMs / 60_000))} minute(s).`,
      },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryMs / 1000)) } }
    );
  };

  if (!rateLimit(bucketKey, bucketAllowance, windowMs)) {
    return limited(bucketKey, `Too many AI requests for this action (${bucketAllowance} per hour).`);
  }

  /*
   * The hourly ceiling is charged per model call. An action that needs more
   * units than are left is refused *before* it spends any, so it can never
   * overrun the ceiling by half-finishing.
   */
  const remaining = globalLimit - (rateLimitPeek(globalKey) ?? 0);
  if (remaining < cost) {
    return limited(
      globalKey,
      `Hourly AI usage limit reached (${globalLimit} model calls).`
    );
  }
  for (let unit = 0; unit < cost; unit++) {
    if (!rateLimit(globalKey, globalLimit, windowMs)) {
      return limited(
        globalKey,
        `Hourly AI usage limit reached (${globalLimit} model calls).`
      );
    }
  }

  return null;
}
