import { NextResponse } from "next/server";
import { rateLimit, rateLimitRetryAfterMs } from "@/lib/security";

const HOUR = 60 * 60 * 1000;

/**
 * Per-user AI budget. Caps total LLM calls across the app so multi-account
 * spam cannot burn unlimited provider credits from a single session.
 *
 * Override with LLM_USER_HOURLY_LIMIT (default 25).
 */
export function enforceLlmBudget(
  userId: string,
  bucket: string,
  bucketLimit: number,
  windowMs = HOUR
): NextResponse | null {
  const globalLimit = Number(process.env.LLM_USER_HOURLY_LIMIT || 25);
  const bucketKey = `llm:bucket:${bucket}:${userId}`;
  const globalKey = `llm:global:${userId}`;

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

  if (!rateLimit(bucketKey, bucketLimit, windowMs)) {
    return limited(bucketKey, "Too many AI requests for this action.");
  }

  if (!rateLimit(globalKey, globalLimit, windowMs)) {
    return limited(globalKey, "Hourly AI usage limit reached.");
  }

  return null;
}
