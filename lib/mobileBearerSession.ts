import { headers } from 'next/headers';
import type { Session } from 'next-auth';

import { ACCESS_TOKEN_TTL_SECONDS, extractBearer, verifyAccessToken } from '@/lib/mobileTokens';

/**
 * Resolve a request's session from a mobile bearer token.
 *
 * WHY THIS EXISTS
 *
 * `POST /api/auth/mobile/token` mints access tokens, but nothing outside
 * `/api/auth/mobile/*` accepted them: the 35 routes that authenticate do so with
 * `await auth()`, which reads the Auth.js session COOKIE. A native client has no
 * cookie (Auth.js defaults to `SameSite=Lax`, and a native app is a cross-site
 * origin), so the app could sign in successfully and then be told `Unauthorized`
 * by every data route. Token issuance was implemented; token CONSUMPTION was not.
 *
 * `lib/auth.ts` calls this as a fallback inside its `auth` export, so all 35
 * routes gain bearer support without touching any of them.
 *
 * NOT A REPLACEMENT FOR THE COOKIE PATH — it is an additional way to satisfy it,
 * tried only when an `Authorization` header is actually present. A request with
 * no bearer behaves exactly as before, so the web app pays nothing for this.
 *
 * Deliberately no database round trip: the token carries `sub`, which is the
 * only field the call sites read (`session.user.id`). A user deleted mid-token
 * keeps working for at most the 15-minute access-token lifetime, and their
 * queries then return empty because every route filters by that user id. Adding
 * a lookup here would put a query on every authenticated request to shave a
 * 15-minute window.
 */

export async function bearerSession(): Promise<Session | null> {
  let header: string | null = null;

  try {
    header = (await headers()).get('authorization');
  } catch {
    // `headers()` is unavailable in a context that has no request (a build-time
    // render, for instance). Degrade to the cookie path rather than throwing —
    // this function must never be the reason a request fails.
    return null;
  }

  const token = extractBearer(header);
  if (!token) return null;

  const claims = await verifyAccessToken(token);
  if (!claims) return null;

  return {
    user: {
      id: claims.sub,
      name: claims.name ?? null,
      email: claims.email ?? null,
    },
    // The session is as long-lived as the access token that backs it. A short
    // window is the point: this credential cannot be revoked before it expires,
    // which is why the access TTL is 15 minutes and the refresh token is the
    // revocable half.
    expires: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString(),
  };
}
