// Regression check for the recorder MIME normalisation.
//
// THE BUG, as reported from a real session:
//
//   400 Invalid file type: audio/webm;codecs=opus.
//       Only ['audio/mpeg', ..., 'audio/webm', ...] are allowed.
//
// `MediaRecorder.mimeType` reports the negotiated type INCLUDING codec
// parameters — Chrome returns `audio/webm;codecs=opus`. Forwarding that string
// verbatim made the provider reject the upload, so transcription failed for
// every Chrome recording: a total outage of voice input, caused by adding a
// codec parameter that the container type did not previously carry.
//
// The container is what the provider validates, and the codec is already
// evident from the byte stream, so dropping the parameter loses nothing.
//
// Run: npm run check:voice
import assert from "node:assert/strict";

/*
 * The provider's accepted set, copied from its own rejection message. Kept here
 * as the authoritative list so a normalised value can be checked against it
 * rather than merely eyeballed.
 */
const ACCEPTED = [
  "audio/mpeg", "audio/mp3", "audio/mpeg3", "audio/x-mpeg-3", "audio/x-mp3",
  "audio/wav", "audio/x-wav", "audio/wave", "audio/pcm_s16le", "audio/l16",
  "audio/raw", "application/octet-stream", "audio/aac", "audio/x-aac",
  "audio/aiff", "audio/x-aiff", "audio/ogg", "audio/opus", "audio/flac",
  "audio/x-flac", "audio/mp4", "audio/x-m4a", "audio/amr", "audio/x-ms-wma",
  "audio/webm", "video/webm",
];

/** Must mirror normalizeRecorderMimeType in components/voice/useVoice.ts. */
function normalizeRecorderMimeType(mimeType) {
  const raw = (mimeType || "").trim().toLowerCase();
  if (!raw) return "audio/webm";
  const bare = raw.split(";")[0].trim();
  const asAudio = bare === "video/webm" ? "audio/webm" : bare;
  if (ACCEPTED.includes(asAudio)) return asAudio;
  if (asAudio.includes("webm")) return "audio/webm";
  if (asAudio.includes("ogg")) return asAudio.includes("opus") ? "audio/opus" : "audio/ogg";
  if (asAudio.includes("mp4") || asAudio.includes("m4a") || asAudio.includes("aac")) return "audio/mp4";
  if (asAudio.includes("wav") || asAudio.includes("wave")) return "audio/wav";
  if (asAudio.includes("mpeg") || asAudio.includes("mp3")) return "audio/mpeg";
  if (asAudio.includes("flac")) return "audio/flac";
  if (asAudio.includes("aiff")) return "audio/aiff";
  if (asAudio.includes("amr")) return "audio/amr";
  return "application/octet-stream";
}

let passed = 0;
const failures = [];
function test(label, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${label}`);
  } catch (err) {
    failures.push(label);
    console.log(`  FAIL  ${label}`);
    console.log(`        ${err.message}`);
  }
}

console.log("\nrecorder MIME normalisation\n");

test("the reported failure is fixed: codecs=opus is stripped", () => {
  assert.equal(normalizeRecorderMimeType("audio/webm;codecs=opus"), "audio/webm");
});

test("no normalised value can contain a codec parameter", () => {
  // The general form of the bug: a `;` anywhere means the provider will refuse.
  const inputs = [
    "audio/webm;codecs=opus",
    "audio/webm;codecs=pcm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/ogg;codecs=opus",
    "audio/webm; codecs=opus",
    "audio/wav;rate=48000",
    "video/webm;codecs=vp8,opus",
  ];
  for (const input of inputs) {
    const out = normalizeRecorderMimeType(input);
    assert.ok(!out.includes(";"), `${input} -> ${out} still carries a parameter`);
  }
});

test("every normalised value is on the provider's allowed list", () => {
  // The only assertion that actually guarantees acceptance.
  const inputs = [
    "audio/webm;codecs=opus", "audio/webm", "audio/webm;codecs=pcm",
    "video/webm", "video/webm;codecs=vp8,opus",
    "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/x-m4a", "audio/aac",
    "audio/ogg;codecs=opus", "audio/ogg", "audio/opus",
    "audio/wav", "audio/wave", "audio/x-wav", "audio/mpeg", "audio/mp3",
    "audio/flac", "audio/aiff", "audio/amr",
    "", undefined, "AUDIO/WEBM;CODECS=OPUS", "  audio/webm ; codecs=opus  ",
    "application/x-totally-unknown",
  ];
  for (const input of inputs) {
    const out = normalizeRecorderMimeType(input);
    assert.ok(ACCEPTED.includes(out), `${JSON.stringify(input)} -> ${out} is NOT accepted`);
  }
});

test("the common Chrome case is exactly audio/webm", () => {
  assert.equal(normalizeRecorderMimeType("audio/webm;codecs=opus"), "audio/webm");
  assert.equal(normalizeRecorderMimeType("audio/webm;codecs=pcm"), "audio/webm");
});

test("Safari's AAC-in-MP4 maps to an accepted type", () => {
  // Safari cannot record webm; labelling its output .webm mislabelled the file.
  assert.equal(normalizeRecorderMimeType("audio/mp4"), "audio/mp4");
  assert.equal(normalizeRecorderMimeType("audio/mp4;codecs=mp4a.40.2"), "audio/mp4");
  assert.equal(normalizeRecorderMimeType("audio/x-m4a"), "audio/x-m4a");
});

test("video/webm is not sent as a video type", () => {
  // Video container types are audio-only payloads here; video/webm is on the
  // list but audio/webm states what it actually is.
  assert.equal(normalizeRecorderMimeType("video/webm"), "audio/webm");
});

test("case and whitespace are handled", () => {
  assert.equal(normalizeRecorderMimeType("AUDIO/WEBM;CODECS=OPUS"), "audio/webm");
  assert.equal(normalizeRecorderMimeType("  audio/webm ; codecs=opus  "), "audio/webm");
});

test("an unknown type falls back to application/octet-stream, not a guess", () => {
  // Claiming a container we cannot confirm would be rejected for the wrong
  // reason; this value is on the list precisely for unknown payloads.
  assert.equal(normalizeRecorderMimeType("application/x-totally-unknown"), "application/octet-stream");
  assert.equal(normalizeRecorderMimeType(undefined), "audio/webm");
});

console.log("");
if (failures.length > 0) {
  console.error(`mime check failed: ${failures.length} of ${passed + failures.length}\n`);
  process.exit(1);
}
console.log(`mime check passed (${passed} assertions)\n`);
