import { SignJWT, jwtVerify } from 'jose';

/**
 * Mobile device tokens.
 *
 * Why this exists rather than cookies: Auth.js is configured with no `cookies`
 * block, so it uses its defaults including `SameSite=Lax`. A native app is a
 * cross-site origin, so those cookies are never sent — login would appear to
 * succeed and every subsequent request would be anonymous.
 * See design/API_CONTRACT.md §1.1.
 *
 * DESIGN NOTES
 *
 * - Two token types, distinguished by an `aud` claim. An access token presented
 *   at the refresh endpoint, or vice versa, is rejected by `jwtVerify`'s
 *   audience check rather than by hand-rolled comparison.
 * - Refresh tokens are rotated on every use AND are one-time: the hash of a
 *   used token is deleted, so replaying a stolen refresh token fails after the
 *   legitimate client has used it.
 * - The signing secret is derived from AUTH_SECRET with a domain separator, so
 *   a mobile token can never be mistaken for an Auth.js session token even if
 *   both are signed with the same underlying secret.
 */

export const ACCESS_TOKEN_AUDIENCE = 'careerpilot:mobile:access';
export const REFRESH_TOKEN_AUDIENCE = 'careerpilot:mobile:refresh';
export const MOBILE_TOKEN_ISSUER = 'careerpilot';

/** Short enough that a leaked access token has a small window. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
/** Long enough to be usable, short enough to bound a stolen device. */
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 days

export interface AccessTokenClaims {
  sub: string;
  email?: string;
  name?: string;
}

export interface RefreshTokenClaims {
  sub: string;
  /** ties a refresh token to one device so revocation can be per-device */
  jti: string;
}

function secret(): Uint8Array {
  const base = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!base) {
    // Fail closed, matching lib/auth.config.ts: running without a secret would
    // silently accept tokens signed with an ephemeral key that rotates.
    throw new Error('AUTH_SECRET (or NEXTAUTH_SECRET) must be set to issue mobile tokens.');
  }
  // Domain separator: never sign mobile tokens with the raw session secret.
  return new TextEncoder().encode(`careerpilot-mobile-v1:${base}`);
}

export async function signAccessToken(claims: AccessTokenClaims): Promise<string> {
  return new SignJWT({ email: claims.email, name: claims.name })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuer(MOBILE_TOKEN_ISSUER)
    .setAudience(ACCESS_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret());
}

export async function signRefreshToken(claims: RefreshTokenClaims): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuer(MOBILE_TOKEN_ISSUER)
    .setAudience(REFRESH_TOKEN_AUDIENCE)
    .setJti(claims.jti)
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_SECONDS}s`)
    .sign(secret());
}

/**
 * Verify an access token.
 *
 * Returns null for every failure mode — expired, wrong audience, bad signature,
 * malformed. Deliberately does not distinguish between them to the caller: the
 * client's only correct response to all of them is to refresh or sign in again.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: MOBILE_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
    });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Verify a refresh token's signature and expiry.
 *
 * The caller MUST still check the token's hash against the database, which is
 * what makes revocation possible — a valid signature is not sufficient.
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: MOBILE_TOKEN_ISSUER,
      audience: REFRESH_TOKEN_AUDIENCE,
    });
    if (!payload.sub || !payload.jti) return null;
    return { sub: payload.sub, jti: payload.jti };
  } catch {
    return null;
  }
}

/**
 * Pull the token out of an `Authorization: Bearer …` header value.
 *
 * Pure, and shared rather than re-implemented per call site. The parse is two
 * lines, which is exactly why three hand-rolled copies had already appeared —
 * and the case-insensitive scheme check is the part a copy tends to get wrong.
 */
export function extractBearer(header: string | null | undefined): string {
  if (!header) return '';
  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return '';
  return trimmed.slice(7).trim();
}

/**
 * Random, opaque device/refresh identifier.
 *
 * `crypto.getRandomValues` rather than Math.random — this value is the lookup
 * key for revocation, and a predictable one could be guessed to revoke someone
 * else's device.
 */
export function newTokenId(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
