import assert from 'node:assert/strict';
import { test } from 'node:test';

/**
 * Play Integrity verdict policy.
 *
 * `assessVerdict` is the function that decides whether an Android client is
 * allowed to sign in, so every branch of it is a security decision. It is pure
 * (no network), which is exactly why it was extracted from the verification
 * call — the policy is testable without touching Google.
 *
 * Run with:  npm run check:play-integrity
 */

process.env.PLAY_INTEGRITY_PACKAGE_NAME = 'cc.careerpilot.app';

const { assessVerdict } = await import('../playIntegrity.ts');

type Verdict = Parameters<typeof assessVerdict>[0];

/**
 * A verdict that should pass, so each test can vary exactly one field.
 *
 * Annotated rather than inferred: without it TS narrows each field to the
 * literal in this fixture, and the tests that deliberately set an INVALID value
 * fail to compile — which is how this was caught.
 */
function goodVerdict(): Verdict {
  return {
    tokenPayloadExternal: {
      requestDetails: {
        requestPackageName: 'cc.careerpilot.app',
        timestampMillis: String(Date.now()),
      },
      appIntegrity: {
        appRecognitionVerdict: 'PLAY_RECOGNIZED',
        packageName: 'cc.careerpilot.app',
        versionCode: '1',
      },
      deviceIntegrity: {
        deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY'],
      },
    },
  };
}

test('a well-formed verdict passes', () => {
  assert.equal(assessVerdict(goodVerdict()).ok, true);
});

test('a verdict that also meets strong integrity passes', () => {
  const v = goodVerdict();
  v.tokenPayloadExternal.deviceIntegrity.deviceRecognitionVerdict = [
    'MEETS_BASIC_INTEGRITY',
    'MEETS_DEVICE_INTEGRITY',
    'MEETS_STRONG_INTEGRITY',
  ];
  assert.equal(assessVerdict(v).ok, true);
});

test('an empty payload is refused', () => {
  assert.equal(assessVerdict(null).ok, false);
  assert.equal(assessVerdict({}).ok, false);
  assert.equal(assessVerdict({ tokenPayloadExternal: {} }).ok, false);
});

test('an unrecognised app version is refused', () => {
  // UNRECOGNIZED_VERSION means a re-signed or repackaged APK — the exact thing
  // attestation exists to catch.
  const v = goodVerdict();
  v.tokenPayloadExternal.appIntegrity.appRecognitionVerdict = 'UNRECOGNIZED_VERSION';
  const result = assessVerdict(v);
  assert.equal(result.ok, false);
  assert.match(result.reason ?? '', /not recognised/i);
});

test('an unevaluated app is refused', () => {
  const v = goodVerdict();
  v.tokenPayloadExternal.appIntegrity.appRecognitionVerdict = 'UNEVALUATED';
  assert.equal(assessVerdict(v).ok, false);
});

test('a token minted for a different package is refused', () => {
  // Otherwise an attacker could obtain a valid verdict for their own app and
  // present it here.
  const v = goodVerdict();
  v.tokenPayloadExternal.appIntegrity.packageName = 'com.attacker.clone';
  assert.equal(assessVerdict(v).ok, false);
});

test('request details naming a different package are refused', () => {
  const v = goodVerdict();
  v.tokenPayloadExternal.requestDetails.requestPackageName = 'com.attacker.clone';
  assert.equal(assessVerdict(v).ok, false);
});

test('missing request details are refused', () => {
  const v = goodVerdict();
  // @ts-expect-error deliberately removing a required field
  delete v.tokenPayloadExternal.requestDetails;
  assert.equal(assessVerdict(v).ok, false);
});

test('a device failing integrity is refused', () => {
  const v = goodVerdict();
  v.tokenPayloadExternal.deviceIntegrity.deviceRecognitionVerdict = ['MEETS_BASIC_INTEGRITY'];
  const result = assessVerdict(v);
  assert.equal(result.ok, false);
  assert.match(result.reason ?? '', /device/i);
});

test('an empty device verdict is refused', () => {
  const v = goodVerdict();
  v.tokenPayloadExternal.deviceIntegrity.deviceRecognitionVerdict = [];
  assert.equal(assessVerdict(v).ok, false);
});

test('a missing device verdict is refused', () => {
  const v = goodVerdict();
  // @ts-expect-error deliberately removing a required field
  delete v.tokenPayloadExternal.deviceIntegrity;
  assert.equal(assessVerdict(v).ok, false);
});

test('missing app integrity data is refused', () => {
  const v = goodVerdict();
  // @ts-expect-error deliberately removing a required field
  delete v.tokenPayloadExternal.appIntegrity;
  assert.equal(assessVerdict(v).ok, false);
});

test('every refusal carries a reason the user can act on', () => {
  const refusals = [
    assessVerdict(null),
    assessVerdict({ tokenPayloadExternal: {} }),
  ];
  for (const r of refusals) {
    assert.equal(r.ok, false);
    assert.ok(r.reason && r.reason.length > 0, 'a refusal must explain itself');
  }
});
