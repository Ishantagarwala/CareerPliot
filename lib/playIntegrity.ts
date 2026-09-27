import { SignJWT, importPKCS8 } from 'jose';

/**
 * Play Integrity attestation.
 *
 * WHY THIS EXISTS
 *
 * Every sign-in path in this app runs `requireBotVerification`, and the server
 * hard-fails when it cannot verify. hCaptcha is a web widget that cannot run in
 * a native app, so without an alternative **no Android client can ever sign
 * in**. See design/API_CONTRACT.md §1.2.
 *
 * Play Integrity is strictly stronger than a captcha here: it attests that the
 * request came from a genuine, unmodified build of OUR app on a device that
 * passes Google's integrity checks. A captcha only shows a human is present.
 *
 * FAIL-CLOSED BY DESIGN
 *
 * If this is not configured, `verifyPlayIntegrity` returns a failure and mobile
 * sign-in is refused. It does NOT fall through to allowing the request. The
 * tempting shortcut — skip bot verification for mobile because a captcha cannot
 * run there — would hand anyone with a custom HTTP client a captcha bypass on a
 * public deployment.
 *
 * SETUP
 *
 * Configure in the server's .env.production (never committed):
 *   PLAY_INTEGRITY_SERVICE_ACCOUNT_EMAIL   from the Google Cloud service account
 *   PLAY_INTEGRITY_PRIVATE_KEY             its PEM private key (\n escaped)
 *   PLAY_INTEGRITY_CLOUD_PROJECT_NUMBER    the Cloud project number
 *   PLAY_INTEGRITY_PACKAGE_NAME            default cc.careerpilot.app
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/playintegrity';

export function isPlayIntegrityConfigured(): boolean {
  return Boolean(
    process.env.PLAY_INTEGRITY_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.PLAY_INTEGRITY_PRIVATE_KEY?.trim() &&
      process.env.PLAY_INTEGRITY_CLOUD_PROJECT_NUMBER?.trim(),
  );
}

function packageName(): string {
  return process.env.PLAY_INTEGRITY_PACKAGE_NAME?.trim() || 'cc.careerpilot.app';
}

export interface IntegrityVerdict {
  ok: boolean;
  /** safe to log; never includes the token or its contents verbatim */
  reason?: string;
}

/**
 * Verify a Play Integrity token.
 *
 * Returns `{ ok: false, reason }` for every failure — misconfiguration, network
 * failure, malformed token, or a genuine integrity failure. The caller must
 * treat all of them as a refusal.
 */
export async function verifyPlayIntegrity(token: unknown): Promise<IntegrityVerdict> {
  if (typeof token !== 'string' || !token.trim()) {
    return { ok: false, reason: 'Missing Play Integrity token.' };
  }

  if (!isPlayIntegrityConfigured()) {
    return {
      ok: false,
      reason:
        'Play Integrity is not configured on this server, so mobile sign-in is unavailable.',
    };
  }

  let accessToken: string;
  try {
    accessToken = await serviceAccountAccessToken();
  } catch (err) {
    // Log the cause but do not leak credential details to the client.
    console.error('[playIntegrity] could not obtain access token:', err);
    return { ok: false, reason: 'Integrity verification is unavailable. Try again.' };
  }

  const project = process.env.PLAY_INTEGRITY_CLOUD_PROJECT_NUMBER!.trim();
  const url = `https://playintegrity.googleapis.com/v1/projects/${project}/apps/${packageName()}:decodeIntegrityToken`;

  let payload: PlayIntegrityPayload | null = null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ integrityToken: token }),
    });

    const body = (await res.json().catch(() => null)) as PlayIntegrityPayload | null;

    if (!res.ok) {
      // Google returns 400 for a malformed/expired token. Never echo its body
      // to the client — it can contain request details.
      console.error('[playIntegrity] decode failed:', res.status, body);
      return { ok: false, reason: 'Could not verify this device.' };
    }

    payload = body;
  } catch (err) {
    console.error('[playIntegrity] decode request error:', err);
    return { ok: false, reason: 'Could not verify this device. Try again.' };
  }

  return assessVerdict(payload);
}

/**
 * Turn a decoded verdict into a decision.
 *
 * Exported so the policy is unit-testable without touching Google.
 */
export function assessVerdict(payload: PlayIntegrityPayload | null): IntegrityVerdict {
  const details = payload?.tokenPayloadExternal;
  if (!details) {
    return { ok: false, reason: 'Empty integrity verdict.' };
  }

  // 1. The token must be for OUR app, distributed by Play.
  const app = details.appIntegrity;
  if (!app) {
    return { ok: false, reason: 'No app integrity data.' };
  }
  if (app.packageName && app.packageName !== packageName()) {
    return { ok: false, reason: 'Integrity token was issued for a different app.' };
  }
  if (app.appRecognitionVerdict !== 'PLAY_RECOGNIZED') {
    // UNRECOGNIZED_VERSION means a re-signed or repackaged APK.
    return { ok: false, reason: 'This copy of the app is not recognised by Play.' };
  }

  // 2. The device must pass Google's integrity checks. MEETS_STRONG_INTEGRITY is
  //    preferable, but MEETS_DEVICE_INTEGRITY is the level Play itself treats as
  //    sufficient; requiring STRONG would lock out many legitimate devices.
  const deviceLabels = details.deviceIntegrity?.deviceRecognitionVerdict ?? [];
  if (!deviceLabels.includes('MEETS_DEVICE_INTEGRITY')) {
    return { ok: false, reason: 'This device did not pass integrity checks.' };
  }

  // 3. The request must have come from the app requesting it.
  const request = details.requestDetails;
  if (!request?.requestPackageName) {
    return { ok: false, reason: 'Integrity verdict is missing request details.' };
  }
  if (request.requestPackageName !== packageName()) {
    return { ok: false, reason: 'Integrity verdict does not match the requesting app.' };
  }

  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Google service-account auth                                                */
/* -------------------------------------------------------------------------- */

/**
 * Exchange a service-account JWT for an OAuth access token.
 *
 * Done by hand with `jose` rather than pulling in google-auth-library: it is
 * ~30 lines, removes a dependency from the production image, and `jose` is
 * already used for mobile tokens.
 */
async function serviceAccountAccessToken(): Promise<string> {
  const email = process.env.PLAY_INTEGRITY_SERVICE_ACCOUNT_EMAIL!.trim();
  // Secrets are stored with literal \n in env files; restore real newlines.
  const key = process.env.PLAY_INTEGRITY_PRIVATE_KEY!.replace(/\\n/g, '\n').trim();

  const privateKey = await importPKCS8(key, 'RS256');
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(email)
    .setSubject(email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Service-account token exchange failed (${res.status})`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('Service-account token response had no access_token');
  return data.access_token;
}

/* -------------------------------------------------------------------------- */
/* Verdict shape (the subset we act on)                                       */
/* -------------------------------------------------------------------------- */

export interface PlayIntegrityPayload {
  tokenPayloadExternal?: {
    requestDetails?: {
      requestPackageName?: string;
      timestampMillis?: string;
    };
    appIntegrity?: {
      appRecognitionVerdict?: 'PLAY_RECOGNIZED' | 'UNRECOGNIZED_VERSION' | 'UNEVALUATED';
      packageName?: string;
      versionCode?: string;
      certificateSha256Digest?: string[];
    };
    deviceIntegrity?: {
      deviceRecognitionVerdict?: string[];
    };
    accountDetails?: {
      appLicensingVerdict?: string;
    };
  };
}
