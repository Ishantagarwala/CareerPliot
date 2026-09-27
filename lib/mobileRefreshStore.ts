import crypto from 'crypto';
import dbConnect from '@/lib/db';
import MobileRefreshToken from '@/models/MobileRefreshToken';

/**
 * Refresh-token lifecycle: issue, rotate, revoke.
 *
 * Kept out of the route handlers so the security-critical part is one readable
 * unit rather than duplicated across token/refresh/revoke.
 *
 * The threat model this addresses: a refresh token has a 60-day life, so it is
 * the most valuable thing the app holds. Three properties matter.
 *
 *  1. Only a hash is stored, so a database dump yields no usable tokens.
 *  2. Rotation is one-time — using a token invalidates it. A stolen token is
 *     therefore useful only until the real client next refreshes.
 *  3. Reuse is DETECTED. Presenting an already-rotated token is evidence of
 *     theft, so every live token for that user is revoked and the attacker's
 *     session dies along with the real one. That is deliberately disruptive:
 *     the alternative is silently letting the thief keep access.
 */

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface IssuedRefresh {
  tokenId: string;
  tokenHash: string;
}

/** Record a freshly issued refresh token. */
export async function recordRefreshToken(opts: {
  userId: string;
  tokenId: string;
  token: string;
  deviceLabel?: string;
}): Promise<void> {
  await dbConnect();
  await MobileRefreshToken.create({
    userId: opts.userId,
    tokenId: opts.tokenId,
    tokenHash: hashToken(opts.token),
    deviceLabel: opts.deviceLabel?.slice(0, 120),
  });
}

export type RotationResult =
  | { ok: true; userId: string }
  /** the presented token is unknown, expired, or already revoked */
  | { ok: false; reason: 'unknown' }
  /** the presented token was already rotated — treated as theft */
  | { ok: false; reason: 'reuse'; userId: string };

/**
 * Consume a refresh token exactly once.
 *
 * `tokenId` is the JWT's `jti`; the hash is checked as well so a valid
 * signature over a token that was never issued cannot be replayed.
 */
export async function consumeRefreshToken(opts: {
  token: string;
  tokenId: string;
}): Promise<RotationResult> {
  await dbConnect();

  const row = await MobileRefreshToken.findOne({
    tokenHash: hashToken(opts.token),
    tokenId: opts.tokenId,
  });

  if (!row) return { ok: false, reason: 'unknown' };

  const userId = row.userId.toString();

  if (row.rotatedAt) {
    // Already used. Either the client retried a stale token, or someone
    // replayed a stolen one. Both warrant revoking the family.
    await revokeAllForUser(userId);
    return { ok: false, reason: 'reuse', userId };
  }

  row.rotatedAt = new Date();
  row.lastUsedAt = new Date();
  await row.save();

  return { ok: true, userId };
}

/** Link a rotated token to its replacement, so a chain can be traced. */
export async function linkRotation(oldTokenId: string, newTokenId: string): Promise<void> {
  await dbConnect();
  await MobileRefreshToken.updateOne({ tokenId: oldTokenId }, { $set: { replacedBy: newTokenId } });
}

/** Revoke every refresh token for a user — used on reuse detection. */
export async function revokeAllForUser(userId: string): Promise<number> {
  await dbConnect();
  const result = await MobileRefreshToken.deleteMany({ userId });
  return result.deletedCount ?? 0;
}

/** Revoke one device. Returns false when the token was not this user's. */
export async function revokeOne(userId: string, tokenId: string): Promise<boolean> {
  await dbConnect();
  const result = await MobileRefreshToken.deleteOne({ userId, tokenId });
  return (result.deletedCount ?? 0) > 0;
}

/** Number of live devices for a user, for a future device-management screen. */
export async function countLiveTokens(userId: string): Promise<number> {
  await dbConnect();
  return MobileRefreshToken.countDocuments({ userId, rotatedAt: { $exists: false } });
}
