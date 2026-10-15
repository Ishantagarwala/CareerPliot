// Regression check for the voice routes.
//
// The bug being guarded: `/api/voice/speak` sent `speaker: speaker || "meera"`.
// "meera" is not a bulbul:v3 voice, so any request that omitted a speaker got
// `400 Speaker 'meera' is not recognized` from Sarvam — and because the route
// returned only `response.statusText`, the user saw the word "Bad Request" and
// nothing else. It stayed hidden because the web client always sends a voice
// from its own list; only requests that omitted one failed.
//
// The routes cannot be imported here (lib/auth pulls in NextAuth, mongoose and
// bcrypt), so this checks the source directly. That is the right level anyway:
// the defect was a policy violation — a voice the provider does not have — not
// a logic error, and static invariants catch those.
//
// Run: npm run check:voice
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const voiceDir = path.join(root, "app", "api", "voice");

/**
 * Reads a module with its comments stripped.
 *
 * Necessary, not cosmetic: these files explain the bug they fixed, so the
 * comments contain the very literals the checks look for. Scanning raw source
 * made `"meera"` match the explanatory note and reported a false failure.
 */
function readCode(file) {
  return fs
    .readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "") // /* block */
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1"); // // line (not http://)
}

const speakSrc = readCode(path.join(voiceDir, "speak", "route.ts"));
const transcribeSrc = readCode(path.join(voiceDir, "transcribe", "route.ts"));
const useVoiceSrc = readCode(path.join(root, "components", "voice", "useVoice.ts"));

let failures = 0;
function check(label, ok, detail) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    failures++;
    if (detail) console.log(`        ${detail}`);
  }
}

/** Pulls the quoted members out of a `const NAME = [ ... ] as const` array. */
function readStringArray(src, name) {
  const m = new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`).exec(src);
  if (!m) return null;
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

console.log("\nvoice routes\n");

/* ---------------------------------------------------------------- voices -- */

const voices = readStringArray(speakSrc, "VOICES");
check("speak route declares an explicit voice allowlist", Array.isArray(voices) && voices.length > 0);

/*
 * The single most important assertion: the reported failure must be gone.
 * Any surviving `|| "meera"` (or any other unvalidated fallback) is the bug.
 */
check(
  'no hardcoded "meera" fallback survives',
  !/\|\|\s*["']meera["']/.test(speakSrc),
  "the route must not fall back to a voice Sarvam does not have"
);

check(
  "the fallback voice is itself in the allowlist",
  (() => {
    const d = /const\s+DEFAULT_VOICE\s*=\s*"([^"]+)"/.exec(speakSrc);
    return !!d && !!voices && voices.includes(d[1]);
  })(),
  "DEFAULT_VOICE must be one of VOICES or every speakerless request fails again"
);

// Voices that have been removed from bulbul:v3 and must never reappear.
for (const dead of ["meera", "arjun", "ananya"]) {
  check(`"${dead}" is not offered as a voice`, !voices || !voices.includes(dead));
}

/* --------------------------------------------------------- error surfacing -- */

check(
  "speak surfaces the provider's message, not just statusText",
  !/message:\s*`Sarvam API error: \$\{response\.statusText\}`/.test(speakSrc),
  "statusText alone reads 'Bad Request' for every cause"
);
check(
  "transcribe surfaces the provider's message, not just statusText",
  !/message:\s*`Sarvam API error: \$\{response\.statusText\}`/.test(transcribeSrc),
  "statusText alone reads 'Bad Request' for every cause"
);
check(
  "speak treats empty audio as an error",
  /returned no audio/.test(speakSrc),
  "a 200 with no audio would otherwise be reported as success"
);

/* ------------------------------------------------------------- languages -- */

const speakLangs = readStringArray(speakSrc, "LANGUAGES");
check("speak declares supported languages", Array.isArray(speakLangs) && speakLangs.length > 0);
check(
  "transcribe validates the language code",
  /Unsupported language/.test(transcribeSrc),
  "an unvalidated code reaches Sarvam and comes back as an opaque 400"
);

/* ------------------------------------------- client and server agreement -- */

/*
 * The client owns the language → voice pairs and sends the voice on every
 * request, so a voice it offers that the server rejects is a broken language
 * option. This is the check that would have caught the original mismatch.
 */
const clientPairs = [...useVoiceSrc.matchAll(/code:\s*"([^"]+)"[^}]*?speaker:\s*"([^"]+)"/g)].map(
  (m) => ({ code: m[1], speaker: m[2] })
);

check("client declares at least one language/voice pair", clientPairs.length > 0);

for (const { code, speaker } of clientPairs) {
  check(
    `client voice "${speaker}" (${code}) is accepted by the server allowlist`,
    !!voices && voices.includes(speaker),
    `add "${speaker}" to VOICES in app/api/voice/speak/route.ts or change the client`
  );
  if (speakLangs) {
    check(
      `client language "${code}" is accepted by the server`,
      speakLangs.includes(code),
      `add "${code}" to LANGUAGES in app/api/voice/speak/route.ts`
    );
  }
}

/* ---------------------------------------------------------------- result -- */

console.log("");
if (failures > 0) {
  console.error(`voice check failed: ${failures} problem${failures === 1 ? "" : "s"}\n`);
  process.exit(1);
}
console.log("voice check passed\n");
