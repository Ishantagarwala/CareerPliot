import bcrypt from 'bcryptjs';

import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getClientIp, rateLimit } from '@/lib/security';
import { DEMO_ACCOUNT_EMAIL, isDemoLoginEnabled, requireBotVerification } from '@/lib/captcha';
import { isAllowedEmailProvider } from '@/lib/allowedEmail';
import { assertResidentialIp } from '@/lib/ipReputation';
import { isPlayIntegrityConfigured, verifyPlayIntegrity } from '@/lib/playIntegrity';

/**
 * The credential gate chain, in one place.
 *
 * Previously this logic lived only inside NextAuth's `authorize` callback in
 * lib/auth.ts. Adding a second entry point (the mobile token endpoint) meant
 * either duplicating it or extracting it — and a duplicated security chain WILL
 * drift, leaving whichever copy is less carefully maintained as the weak point.
 *
 * Order is deliberate and every step fails closed:
 *
 *   1. reject non-string credentials   — blocks NoSQL operator injection
 *   2. email domain allowlist
 *   3. residential-IP assertion        — blocks VPN/datacenter traffic
 *   4. rate limit per email
 *   5. bot verification                — captcha, or Play Integrity on mobile
 *   6. bcrypt compare
 *
 * Step 5 is the only one that differs between web and mobile, and it differs
 * only in HOW it is satisfied — never in whether it can be skipped.
 */

export interface BotCredentials {
  /** web: hCaptcha response token */
  captchaToken?: unknown;
  /** web: short-lived ticket issued after a successful captcha solve */
  loginTicket?: unknown;
  /** mobile: Play Integrity token from the Android SDK */
  integrityToken?: unknown;
}

export type GateFailure =
  | 'invalid_input'
  | 'email_provider'
  | 'network_blocked'
  | 'rate_limited'
  | 'bot_check'
  | 'invalid_credentials';

export interface GateSuccess {
  ok: true;
  user: { id: string; name?: string; email: string };
}

export interface GateError {
  ok: false;
  reason: GateFailure;
  /** safe to show the user; never leaks which check failed internally */
  message: string;
  /** seconds until the rate limit resets, when reason is 'rate_limited' */
  retryAfterSeconds?: number;
}

export type GateResult = GateSuccess | GateError;

const FAIL_MESSAGES: Record<GateFailure, string> = {
  invalid_input: 'Email and password are required.',
  email_provider: 'That email provider is not supported.',
  network_blocked: 'Sign-in is not available from this network. Turn off any VPN and try again.',
  rate_limited: 'Too many sign-in attempts. Try again shortly.',
  bot_check: 'Could not verify this device. Try again.',
  // Same message for unknown user and wrong password on purpose: distinguishing
  // them turns sign-in into an account-enumeration oracle.
  invalid_credentials: 'Email or password is incorrect.',
};

export interface RunGatesOptions {
  email: unknown;
  password: unknown;
  request: Request;
  /** 'web' uses the captcha path; 'mobile' additionally accepts Play Integrity */
  audience: 'web' | 'mobile';
  bot?: BotCredentials;
}

export async function runCredentialGates(options: RunGatesOptions): Promise<GateResult> {
  const { email: rawEmail, password, request, audience, bot = {} } = options;

  // 1. Non-string inputs. Without this an object like { $ne: null } reaches the
  //    Mongo query and matches any user.
  if (typeof rawEmail !== 'string' || typeof password !== 'string') {
    return fail('invalid_input');
  }

  const email = rawEmail.toLowerCase().trim();
  if (!email || !password) return fail('invalid_input');

  // 2. Email domain allowlist.
  if (!isAllowedEmailProvider(email)) {
    return fail('email_provider');
  }

  const ip = getClientIp(request);

  // 3. Residential IP. Demo accounts are exempt only when the deployment
  //    explicitly opted in.
  const isDemo = email === DEMO_ACCOUNT_EMAIL && isDemoLoginEnabled();
  if (email === DEMO_ACCOUNT_EMAIL && !isDemo) {
    return fail('invalid_credentials');
  }

  if (!isDemo) {
    const ipCheck = await assertResidentialIp({ ip, email });
    if (!ipCheck.ok) return fail('network_blocked');
  }

  // 4. Per-email rate limit.
  if (!isDemo && !rateLimit(`login:${email}`, 5, 60_000)) {
    return fail('rate_limited');
  }

  // 5. Bot verification — the only web/mobile difference.
  if (!isDemo) {
    const botResult =
      audience === 'mobile'
        ? await requireMobileBotVerification({ email, ip, ...bot })
        : await requireBotVerification({ email, ip, ...bot });
    if (!botResult.ok) {
      return {
        ok: false,
        reason: 'bot_check',
        message: botResult.reason ?? FAIL_MESSAGES.bot_check,
      };
    }
  }

  // 6. Password.
  await dbConnect();
  const user = await User.findOne({ email }).select('+password');
  if (!user?.password) return fail('invalid_credentials');

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) return fail('invalid_credentials');

  return {
    ok: true,
    user: {
      id: user._id.toString(),
      name: user.name ?? undefined,
      email: user.email,
    },
  };
}

function fail(reason: GateFailure, retryAfterSeconds?: number): GateError {
  return { ok: false, reason, message: FAIL_MESSAGES[reason], retryAfterSeconds };
}

/**
 * Bot verification for the mobile client.
 *
 * Accepts Play Integrity OR a captcha token (the latter so a webview-based or
 * interim client still works). It never accepts nothing: if neither verifier is
 * configured, this returns a refusal that says so.
 */
export async function requireMobileBotVerification(opts: {
  email?: string;
  ip?: string;
  captchaToken?: unknown;
  loginTicket?: unknown;
  integrityToken?: unknown;
}): Promise<{ ok: boolean; reason?: string }> {
  const hasIntegrityToken = opts.integrityToken !== undefined && opts.integrityToken !== null;

  // Development bypass, matching requireBotVerification's own behaviour. Without
  // it the mobile path is stricter than the web path, so the two cannot be
  // exercised side by side locally. Production is unaffected: this only fires
  // when NODE_ENV is not production.
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true };
  }

  if (!hasIntegrityToken && !isPlayIntegrityConfigured()) {
    // The common misconfiguration: the app cannot attest and the server cannot
    // check. Say so plainly rather than falling through to the captcha path,
    // whose message ("complete the captcha") is advice a native app can never
    // act on.
    return {
      ok: false,
      reason:
        'This app build cannot verify itself with this server, so sign-in is unavailable. ' +
        'Play Integrity must be configured on both.',
    };
  }

  if (hasIntegrityToken) {
    if (!isPlayIntegrityConfigured()) {
      return {
        ok: false,
        reason: 'This server cannot verify app builds yet, so sign-in is unavailable.',
      };
    }
    const verdict = await verifyPlayIntegrity(opts.integrityToken);
    if (verdict.ok) return { ok: true };
    return { ok: false, reason: verdict.reason };
  }

  // An integrity token is absent but the server CAN check them, so the client
  // is out of date rather than the server being misconfigured. Never silently
  // allow: the captcha path is unreachable from a native app anyway.
  return {
    ok: false,
    reason: 'Update CareerPilot to sign in: this app version cannot verify itself.',
  };
}

/** True when the mobile client has any viable way to pass bot verification. */
export function isMobileSignInPossible(): boolean {
  return isPlayIntegrityConfigured() || process.env.NODE_ENV !== 'production';
}
