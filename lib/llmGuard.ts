import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/security";

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

  if (!rateLimit(`llm:bucket:${bucket}:${userId}`, bucketLimit, windowMs)) {
    return NextResponse.json(
      { message: "Too many AI requests for this action. Try again later." },
      { status: 429 }
    );
  }

  if (!rateLimit(`llm:global:${userId}`, globalLimit, windowMs)) {
    return NextResponse.json(
      {
        message:
          "Hourly AI usage limit reached. Please wait before making more requests.",
      },
      { status: 429 }
    );
  }

  return null;
}
