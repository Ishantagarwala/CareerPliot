/**
 * hCaptcha verification for auth + bot protection.
 * Get keys at https://dashboard.hcaptcha.com
 */

import { createHmac, timingSafeEqual } from "crypto";

export const DEMO_ACCOUNT_EMAIL =
  process.env.DEMO_EMAIL?.trim().toLowerCase() || "demo@careerpilot.com";

export function isCaptchaConfigured(): boolean {
  return Boolean(
    process.env.HCAPTCHA_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim()
  );
}

/** Skip enforcement in local/dev — real hCaptcha cannot run on localhost. */
function shouldSkipCaptchaInDev(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const force = process.env.HCAPTCHA_FORCE_IN_DEV?.trim().toLowerCase();
  if (force === "1" || force === "true") return false;
  return true;
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
    process.env.HCAPTCHA_SECRET_KEY?.trim() ||
    "dev-insecure-secret"
  );
}

/** Short-lived ticket so post-register auto-login can skip a second captcha. */
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

export async function verifyCaptchaToken(
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
        "[captcha] hCaptcha keys missing in production — captcha not enforced"
      );
    }
    return { ok: true };
  }

  if (shouldSkipCaptchaInDev()) {
    return { ok: true };
  }

  if (typeof token !== "string" || !token.trim()) {
    return { ok: false, reason: "Please complete the bot verification challenge." };
  }

  try {
    const body = new URLSearchParams({
      secret: process.env.HCAPTCHA_SECRET_KEY!.trim(),
      response: token.trim(),
    });
    if (opts?.ip && opts.ip !== "unknown") {
      body.set("remoteip", opts.ip);
    }

    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = (await res.json()) as { success?: boolean };
    if (!data.success) {
      return {
        ok: false,
        reason: "Bot verification failed. Please try again.",
      };
    }
    return { ok: true };
  } catch (err) {
    console.error("[captcha] hCaptcha verify error:", err);
    return {
      ok: false,
      reason: "Bot verification service unavailable. Please try again.",
    };
  }
}

/**
 * Require a valid hCaptcha token OR a fresh login ticket (post-register).
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

  if (shouldSkipCaptchaInDev()) {
    return { ok: true };
  }

  if (email && verifyLoginTicket(opts.loginTicket, email)) {
    return { ok: true };
  }

  return verifyCaptchaToken(opts.captchaToken, { email, ip: opts.ip });
}
