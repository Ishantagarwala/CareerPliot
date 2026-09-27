import assert from 'node:assert/strict';
import { test } from 'node:test';

/**
 * Mobile token tests.
 *
 * These cover the properties the refresh endpoint and every authenticated route
 * depend on. The single most important one is AUDIENCE SEPARATION: the refresh
 * endpoint must not accept an access token, and API routes must not accept a
 * refresh token. Without it, a stolen 15-minute access token could be traded for
 * a fresh 60-day one, which would make short access-token lifetimes pointless.
 *
 * Run with:  npm run check:mobile-tokens
 *
 * NOT covered here: refresh-token ROTATION and reuse detection. That logic needs
 * a database, and `lib/mobileRefreshStore.ts` imports through the `@/` path
 * alias, which Node's type stripping does not resolve. It is currently
 * unverified — see the note in design/API_CONTRACT.md.
 */

// Must be set before importing the module, which reads it lazily per call.
process.env.AUTH_SECRET = 'test-secret-'.padEnd(48, 'x');

const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  newTokenId,
} = await import('../mobileTokens.ts');

test('an access token round-trips with its claims intact', async () => {
  const token = await signAccessToken({ sub: 'user-1', email: 'a@b.com', name: 'Ada' });
  const claims = await verifyAccessToken(token);
  assert.equal(claims?.sub, 'user-1');
  assert.equal(claims?.email, 'a@b.com');
  assert.equal(claims?.name, 'Ada');
});

test('a refresh token round-trips with its jti', async () => {
  const token = await signRefreshToken({ sub: 'user-1', jti: 'device-abc' });
  const claims = await verifyRefreshToken(token);
  assert.equal(claims?.sub, 'user-1');
  assert.equal(claims?.jti, 'device-abc');
});

test('an ACCESS token is rejected by the refresh verifier', async () => {
  // The attack this prevents: trade a short-lived access token for a 60-day one.
  const access = await signAccessToken({ sub: 'user-1' });
  assert.equal(await verifyRefreshToken(access), null);
});

test('a REFRESH token is rejected by the access verifier', async () => {
  // The attack this prevents: use a long-lived refresh token as an API credential,
  // which would let a stolen refresh token read data for 60 days.
  const refresh = await signRefreshToken({ sub: 'user-1', jti: 'device-abc' });
  assert.equal(await verifyAccessToken(refresh), null);
});

test('a tampered payload fails signature verification', async () => {
  const token = await signAccessToken({ sub: 'user-1' });
  const [header, payload, signature] = token.split('.');

  // Re-encode the payload with a different subject, keeping the signature.
  const decoded = JSON.parse(Buffer.from(payload!, 'base64url').toString());
  decoded.sub = 'user-999';
  const forged = Buffer.from(JSON.stringify(decoded)).toString('base64url');
  const tampered = `${header}.${forged}.${signature}`;

  assert.equal(await verifyAccessToken(tampered), null);
});

test('a token signed with a different secret is rejected', async () => {
  const original = process.env.AUTH_SECRET;
  const token = await signAccessToken({ sub: 'user-1' });

  process.env.AUTH_SECRET = 'a-completely-different-secret-value-'.padEnd(48, 'y');
  assert.equal(await verifyAccessToken(token), null);

  process.env.AUTH_SECRET = original;
});

test('a malformed token is rejected rather than throwing', async () => {
  for (const bad of ['', 'not-a-jwt', 'a.b.c', 'a.b', '...']) {
    assert.equal(await verifyAccessToken(bad), null, `should reject ${JSON.stringify(bad)}`);
    assert.equal(await verifyRefreshToken(bad), null, `should reject ${JSON.stringify(bad)}`);
  }
});

test('an already-expired access token is rejected', async () => {
  // Sign directly with jose to control exp, rather than waiting 15 minutes.
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(`careerpilot-mobile-v1:${process.env.AUTH_SECRET}`);
  const expired = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-1')
    .setIssuer('careerpilot')
    .setAudience('careerpilot:mobile:access')
    .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(secret);

  assert.equal(await verifyAccessToken(expired), null);
});

test('a token with the wrong issuer is rejected', async () => {
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(`careerpilot-mobile-v1:${process.env.AUTH_SECRET}`);
  const foreign = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-1')
    .setIssuer('somebody-else')
    .setAudience('careerpilot:mobile:access')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret);

  assert.equal(await verifyAccessToken(foreign), null);
});

test('a token with no subject is rejected', async () => {
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(`careerpilot-mobile-v1:${process.env.AUTH_SECRET}`);
  const subjectless = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('careerpilot')
    .setAudience('careerpilot:mobile:access')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret);

  assert.equal(await verifyAccessToken(subjectless), null);
});

test('newTokenId produces distinct, adequately long ids', () => {
  const ids = new Set(Array.from({ length: 200 }, () => newTokenId()));
  // Collisions here would let one device revoke another's session.
  assert.equal(ids.size, 200);
  for (const id of ids) {
    assert.equal(id.length, 48, 'expect 24 bytes hex-encoded');
    assert.match(id, /^[0-9a-f]+$/);
  }
});

test('signing fails closed when no secret is configured', async () => {
  const original = process.env.AUTH_SECRET;
  const fallback = process.env.NEXTAUTH_SECRET;
  delete process.env.AUTH_SECRET;
  delete process.env.NEXTAUTH_SECRET;

  // Minting tokens with an ephemeral key would silently invalidate them on the
  // next restart, so this must throw rather than pick a default.
  await assert.rejects(() => signAccessToken({ sub: 'user-1' }));

  process.env.AUTH_SECRET = original;
  if (fallback !== undefined) process.env.NEXTAUTH_SECRET = fallback;
});
