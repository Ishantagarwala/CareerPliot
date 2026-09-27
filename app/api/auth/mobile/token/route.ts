import { corsJson, corsPreflight } from '@/lib/cors';

import { runCredentialGates } from '@/lib/authGates';
import { linkRotation, recordRefreshToken } from '@/lib/mobileRefreshStore';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  newTokenId,
  signAccessToken,
  signRefreshToken,
} from '@/lib/mobileTokens';

/**
 * Mobile sign-in — the device token exchange.
 *
 * Exchanges credentials for a short-lived access token plus a rotating refresh
 * token. This is the recommended alternative to `SameSite=None` cookies: it
 * leaves the web app's cookie posture untouched and gives per-device
 * revocation, which cookies cannot express.
 * See design/API_CONTRACT.md §1.1.
 *
 * The gate chain lives in lib/authGates.ts so it is literally the same code the
 * web sign-in runs — a duplicated chain would drift.
 */

export async function POST(req: Request) {
  let body: Record<string, unknown> | null = null;
  try {
    body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  } catch {
    return corsJson(req, { message: 'Invalid request body.' }, { status: 400 });
  }

  const gate = await runCredentialGates({
    email: body?.email,
    password: body?.password,
    request: req,
    audience: 'mobile',
    bot: {
      integrityToken: body?.integrityToken,
      captchaToken: body?.captchaToken,
      loginTicket: body?.loginTicket,
    },
  });

  if (!gate.ok) {
    // 400 for a malformed request, 401 for bad credentials, 429 for the rate
    // limit, 403 for a policy refusal. Collapsing them all into 403 made a
    // client-side bug look like a policy decision.
    const status =
      gate.reason === 'invalid_input'
        ? 400
        : gate.reason === 'invalid_credentials'
          ? 401
          : gate.reason === 'rate_limited'
            ? 429
            : 403;

    const headers: Record<string, string> = {};
    if (gate.retryAfterSeconds) headers['Retry-After'] = String(gate.retryAfterSeconds);

    return corsJson(req, 
      { message: gate.message, reason: gate.reason },
      { status, headers },
    );
  }

  const { user } = gate;
  const tokenId = newTokenId();

  try {
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, name: user.name }),
      signRefreshToken({ sub: user.id, jti: tokenId }),
    ]);

    await recordRefreshToken({
      userId: user.id,
      tokenId,
      token: refreshToken,
      deviceLabel: typeof body?.deviceLabel === 'string' ? body.deviceLabel : undefined,
    });

    return corsJson(req, {
      accessToken,
      refreshToken,
      // Client uses these to refresh proactively instead of waiting for a 401.
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
      user,
    });
  } catch (error) {
    console.error('[mobile/token] could not issue tokens:', error);
    return corsJson(req, { message: 'Sign-in failed. Try again.' }, { status: 500 });
  }
}

/** CORS preflight. */
export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
