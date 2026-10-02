import { corsJson, corsPreflight } from '@/lib/cors';

import { revokeAllForUser, revokeOne } from '@/lib/mobileRefreshStore';
import { extractBearer, verifyAccessToken, verifyRefreshToken } from '@/lib/mobileTokens';

/**
 * Revoke one device, or every device.
 *
 * Authenticated with the ACCESS token for the common case (sign out on this
 * phone). Pass `{ all: true }` with a refresh token to sign out everywhere —
 * useful when a device is lost, and the only way to end a compromised session
 * whose access token is still valid.
 *
 * Always reports success even when there was nothing to revoke: telling an
 * unauthenticated caller whether a token id exists would leak information.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { refreshToken?: unknown; all?: unknown }
    | null;

  const bearer = extractBearer(req.headers.get('authorization'));

  const access = bearer ? await verifyAccessToken(bearer) : null;

  if (body?.all === true) {
    // Revoke-everywhere must be authorised by a refresh token, because the
    // access token may be the very one that leaked.
    const presented = typeof body.refreshToken === 'string' ? body.refreshToken.trim() : '';
    const claims = presented ? await verifyRefreshToken(presented) : null;
    if (!claims) {
      return corsJson(req, { message: 'Sign in again to do that.' }, { status: 401 });
    }
    const removed = await revokeAllForUser(claims.sub);
    return corsJson(req, { message: 'Signed out on all devices.', revoked: removed });
  }

  if (!access) {
    return corsJson(req, { message: 'Not authorised.' }, { status: 401 });
  }

  // Revoke the device that presented this refresh token, if it is this user's.
  const presented = typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : '';
  const claims = presented ? await verifyRefreshToken(presented) : null;
  if (claims && claims.sub === access.sub) {
    await revokeOne(access.sub, claims.jti);
  }

  return corsJson(req, { message: 'Signed out on this device.' });
}

/** CORS preflight. */
export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
