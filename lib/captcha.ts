/**
 * Cloudflare Turnstile verification for auth + bot protection.
 * Get keys at https://dash.cloudflare.com/ → Turnstile
 *
 * For full network-level Bot Fight Mode, also proxy the domain through
 * Cloudflare DNS (orange cloud) and enable Bot Fight Mode in the dashboard.
 */

import { createHmac, timingSafeEqual } from "crypto";

export const DEMO_ACCOUNT_EMAIL =
  process.env.DEMO_EMAIL?.trim().toLowerCase() || "demo@careerpilot.com";

export function isCaptchaConfigured(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
  );
}

export function isRegistrationDisabled(): boolean {
  const flag = process.env.DISABLE_REGISTRATION?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

/** Common disposable / throwaway email domains used in signup spam. */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "throwaway.email",
  "yopmail.com",
  "sharklasers.com",
  "trashmail.com",
  "getnada.com",
  "maildrop.cc",
  "discard.email",
  "fakeinbox.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return true;
  return DISPOSABLE_DOMAINS.has(domain);
}

function ticketSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.TURNSTILE_SECRET_KEY?.trim() ||
    "dev-insecure-secret"
  );
}

/** Short-lived ticket so post-register auto-login can skip a second Turnstile. */
export function createLoginTicket(email: string, ttlMs = 2 * 60 * 1000): string {
  const exp = Date.now() + ttlMs;
  const payload = `${email.toLowerCase().trim()}.${exp}`;
  const sig = createHmac("sha256", ticketSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyLoginTicket(ticket: unknown, email: string): boolean {
  if (typeof ticket !== "string" || !ticket) return false;
  const parts = ticket.split(".");
  if (parts.length !== 3) return false;
  const [ticketEmail, expStr, sig] = parts;
  if (ticketEmail !== email.toLowerCase().trim()) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  const payload = `${ticketEmail}.${expStr}`;
  const expected = createHmac("sha256", ticketSecret()).update(payload).digest("hex");
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function verifyTurnstileToken(
  token: unknown,
  opts?: { email?: string; ip?: string }
): Promise<{ ok: boolean; reason?: string }> {
  const email = opts?.email?.toLowerCase().trim();
  if (email && email === DEMO_ACCOUNT_EMAIL) {
    return { ok: true };
  }

  if (!isCaptchaConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[captcha] TURNSTILE keys missing in production — captcha not enforced"
      );
    }
    return { ok: true };
  }

  if (typeof token !== "string" || !token.trim()) {
    return { ok: false, reason: "Please complete the bot verification challenge." };
  }

  try {
    const body = new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY!.trim(),
      response: token.trim(),
    });
    if (opts?.ip && opts.ip !== "unknown") {
      body.set("remoteip", opts.ip);
    }

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }
    );

    const data = (await res.json()) as { success?: boolean };
    if (!data.success) {
      return {
        ok: false,
        reason: "Bot verification failed. Please try again.",
      };
    }
    return { ok: true };
  } catch (err) {
    console.error("[captcha] Turnstile verify error:", err);
    return {
      ok: false,
      reason: "Bot verification service unavailable. Please try again.",
    };
  }
}

/**
 * Require a valid Turnstile token OR a fresh login ticket (post-register).
 * Demo accounts always pass.
 */
export async function requireBotVerification(opts: {
  captchaToken?: unknown;
  loginTicket?: unknown;
  email?: string;
  ip?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const email = opts.email?.toLowerCase().trim();
  if (email && email === DEMO_ACCOUNT_EMAIL) {
    return { ok: true };
  }

  if (!isCaptchaConfigured()) {
    return { ok: true };
  }

  if (email && verifyLoginTicket(opts.loginTicket, email)) {
    return { ok: true };
  }

  return verifyTurnstileToken(opts.captchaToken, { email, ip: opts.ip });
}
