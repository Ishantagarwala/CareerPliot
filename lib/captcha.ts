/**
 * hCaptcha for login/register.
 * Keys: NEXT_PUBLIC_HCAPTCHA_SITE_KEY + HCAPTCHA_SECRET_KEY
 * https://dashboard.hcaptcha.com
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

/**
 * Escape hatch for deployments that knowingly run without hCaptcha.
 *
 * Production used to fail OPEN when the keys were missing — a misconfigured
 * deployment silently lost all bot protection on login/register. It now
 * refuses sign-in instead, matching the mobile path's existing fail-closed
 * behaviour. Set CAPTCHA_OPTIONAL=true only on deployments where that
 * trade-off is acceptable.
 */
export function isCaptchaOptional(): boolean {
  return process.env.CAPTCHA_OPTIONAL?.trim().toLowerCase() === "true";
}

export function isRegistrationDisabled(): boolean {
  const flag = process.env.DISABLE_REGISTRATION?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

/**
 * Demo account (demo@careerpilot.com / demo1234) skips captcha and IP-reputation
 * checks. Enabled by default unless explicitly disabled via DEMO_MODE=false/0/no.
 */
export function isDemoLoginEnabled(): boolean {
  const flag = process.env.DEMO_MODE?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "no") {
    return false;
  }
  return true;
}

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
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.HCAPTCHA_SECRET_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      // Fail loudly rather than sign tickets with a publicly-known constant.
      throw new Error(
        "[captcha] No secret configured for login tickets — set AUTH_SECRET (or HCAPTCHA_SECRET_KEY)."
      );
    }
    // Dev-only escape hatch: hCaptcha/AUTH_SECRET are often unset outside prod,
    // and AUTH_SECRET is already enforced at startup in production.
    return "dev-insecure-secret";
  }
  return secret;
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

  // Local `next dev` — hCaptcha cannot run on localhost.
  if (process.env.NODE_ENV !== "production") {
    return { ok: true };
  }

  if (!isCaptchaConfigured()) {
    if (isCaptchaOptional()) {
      console.warn(
        "[captcha] hCaptcha keys missing — captcha not enforced (CAPTCHA_OPTIONAL=true)"
      );
      return { ok: true };
    }
    console.error(
      "[captcha] hCaptcha keys missing — refusing. Set the keys, or CAPTCHA_OPTIONAL=true to accept the risk."
    );
    return {
      ok: false,
      reason: "Captcha is not configured on this server. Try again later.",
    };
  }

  if (typeof token !== "string" || !token.trim()) {
    return { ok: false, reason: "Please complete the captcha." };
  }

  try {
    const body = new URLSearchParams({
      secret: process.env.HCAPTCHA_SECRET_KEY!.trim(),
      response: token.trim(),
      sitekey: process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!.trim(),
    });
    if (opts?.ip && opts.ip !== "unknown") {
      body.set("remoteip", opts.ip);
    }

    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    if (!data.success) {
      const codes = data["error-codes"]?.join(", ") || "unknown";
      console.error("[captcha] siteverify failed:", codes);
      if (codes.includes("sitekey-secret-mismatch") || codes.includes("invalid-input-secret")) {
        return {
          ok: false,
          reason:
            "Captcha keys are misconfigured. Use the site key + secret from the same hCaptcha site.",
        };
      }
      return { ok: false, reason: "Captcha failed. Please try again." };
    }
    return { ok: true };
  } catch (err) {
    console.error("[captcha] hCaptcha verify error:", err);
    return { ok: false, reason: "Captcha unavailable. Please try again." };
  }
}

/** Valid captcha token, login ticket, or demo account. */
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

  if (process.env.NODE_ENV !== "production") {
    return { ok: true };
  }

  if (!isCaptchaConfigured()) {
    if (isCaptchaOptional()) return { ok: true };
    return {
      ok: false,
      reason: "Captcha is not configured on this server, so sign-in is unavailable.",
    };
  }

  if (email && verifyLoginTicket(opts.loginTicket, email)) {
    return { ok: true };
  }

  return verifyCaptchaToken(opts.captchaToken, { email, ip: opts.ip });
}
