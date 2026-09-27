import { corsJson, corsPreflight } from '@/lib/cors';

import dbConnect from '@/lib/db';
import User from '@/models/User';
import {
  consumeRefreshToken,
  linkRotation,
  recordRefreshToken,
} from '@/lib/mobileRefreshStore';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  newTokenId,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@/lib/mobileTokens';

/**
 * Rotate a refresh token.
 *
 * Rotation is one-time and reuse is DETECTED: presenting a token that was
 * already rotated is treated as theft and revokes every session for that user.
 * A stolen refresh token is therefore useful only until the real client next
 * refreshes, and the theft is not silent.
 *
 * Fail-closed throughout — an unknown, expired or malformed token is a 401 with
 * no new tokens issued.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { refreshToken?: unknown } | null;
  const presented = typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : '';

  if (!presented) {
    return corsJson(req, { message: 'A refresh token is required.' }, { status: 400 });
  }

  // Signature and expiry first: no database work for a token that is not ours.
  const claims = await verifyRefreshToken(presented);
  if (!claims) {
    return corsJson(req, { message: 'Session expired. Sign in again.' }, { status: 401 });
  }

  let consumed;
  try {
    consumed = await consumeRefreshToken({ token: presented, tokenId: claims.jti });
  } catch (error) {
    console.error('[mobile/refresh] store failure:', error);
    return corsJson(req, { message: 'Could not refresh. Try again.' }, { status: 500 });
  }

  if (!consumed.ok) {
    if (consumed.reason === 'reuse') {
      // Loud on purpose: this is the theft signal.
      console.warn(
        `[mobile/refresh] refresh-token reuse detected for user ${consumed.userId}; ` +
          'all sessions revoked.',
      );
      return corsJson(req, 
        { message: 'Session ended for security reasons. Sign in again.', reason: 'reuse' },
        { status: 401 },
      );
    }
    return corsJson(req, { message: 'Session expired. Sign in again.' }, { status: 401 });
  }

  const userId = consumed.userId;

  try {
    await dbConnect();
    const user = await User.findById(userId);
    if (!user) {
      return corsJson(req, { message: 'Session expired. Sign in again.' }, { status: 401 });
    }

    const nextTokenId = newTokenId();
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({
        sub: userId,
        email: user.email,
        name: user.name ?? undefined,
      }),
      signRefreshToken({ sub: userId, jti: nextTokenId }),
    ]);

    await recordRefreshToken({ userId, tokenId: nextTokenId, token: refreshToken });
    // Traces the chain, so a compromised family can be reconstructed.
    await linkRotation(claims.jti, nextTokenId);

    return corsJson(req, {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });
  } catch (error) {
    console.error('[mobile/refresh] could not issue tokens:', error);
    return corsJson(req, { message: 'Could not refresh. Try again.' }, { status: 500 });
  }
}

/** CORS preflight. */
export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
