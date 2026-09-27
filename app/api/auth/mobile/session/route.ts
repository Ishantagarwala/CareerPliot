import { corsJson, corsPreflight } from '@/lib/cors';

import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyAccessToken } from '@/lib/mobileTokens';

/**
 * Verify an access token and describe its owner.
 *
 * The Android client calls this on cold start to decide whether a stored token
 * is still good. Without it the client would have to treat "I have a token" as
 * "I am signed in", which shows a signed-in shell for a token the server has
 * already rejected.
 *
 * Returns 401 rather than an error body for every failure — the client's only
 * correct response in all cases is to refresh or sign in again.
 */
export async function GET(req: Request) {
  const header = req.headers.get('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';

  if (!token) {
    return corsJson(req, { message: 'Not authorised.' }, { status: 401 });
  }

  const claims = await verifyAccessToken(token);
  if (!claims) {
    return corsJson(req, { message: 'Session expired.' }, { status: 401 });
  }

  try {
    await dbConnect();
    const user = await User.findById(claims.sub).select('name email');
    if (!user) {
      // Token is validly signed but its user is gone — treat as expired.
      return corsJson(req, { message: 'Session expired.' }, { status: 401 });
    }
    return corsJson(req, {
      user: { id: claims.sub, name: user.name ?? null, email: user.email },
    });
  } catch (error) {
    console.error('[mobile/session] lookup failed:', error);
    return corsJson(req, { message: 'Could not verify session.' }, { status: 500 });
  }
}

/** CORS preflight. */
export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
