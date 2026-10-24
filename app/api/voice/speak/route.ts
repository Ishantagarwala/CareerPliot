import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/security";

/**
 * Sarvam's bulbul:v3 voice list.
 *
 * This is a hard allowlist on purpose. The route previously passed the caller's
 * speaker straight through with a `|| "meera"` fallback, and "meera" is not a
 * bulbul:v3 voice — so a request that omitted `speaker` got
 * `400 Speaker 'meera' is not recognized` from Sarvam. Pinning the set here
 * means a bad value fails fast with a message naming the valid options, instead
 * of surfacing the provider's error as an unexplained 400.
 */
const VOICES = [
  "aditya", "ritu", "ashutosh", "priya", "neha", "rahul", "pooja", "rohan",
  "simran", "kavya", "amit", "dev", "ishita", "shreya", "ratan", "varun",
  "manan", "sumit", "roopa", "kabir", "aayan", "shubh", "advait", "anand",
  "tanya", "tarun", "sunny", "mani", "gokul", "vijay", "shruti", "suhani",
  "mohit", "kavitha", "rehan", "soham", "rupali",
] as const;

const DEFAULT_VOICE = "ritu";

/** bulbul:v3 target languages the app offers. */
const LANGUAGES = ["en-IN", "hi-IN", "bn-IN"] as const;

/**
 * bulbul:v3's hard per-request limit.
 *
 * Verified against the live API: 2 940 characters returns
 * `400 Validation Error(s): - text: String should have at most 2500 characters`.
 * This was 5000, so replies between 2 500 and 5 000 characters passed the
 * route's own check, failed upstream, and then fell through to the client's
 * browser-speech fallback — which reads the raw markdown aloud, code fences and
 * all. Rejecting here with a clear message is better than that silent downgrade.
 *
 * FOLLOW-UP: chunk on sentence boundaries and synthesise each chunk, so long
 * replies can be spoken instead of refused.
 */
const MAX_TEXT = 2500;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!rateLimit(`voice-speak:${session.user.id}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json(
        { message: "Too many speech requests. Try again later." },
        { status: 429 }
      );
    }

    const sarvamApiKey = process.env.SARVAM_AI_API_KEY?.trim();
    if (!sarvamApiKey) {
      return NextResponse.json(
        { message: "Sarvam AI API key is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    const { text, languageCode, speaker } = body as {
      text?: unknown;
      languageCode?: unknown;
      speaker?: unknown;
    };

    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ message: "No text provided." }, { status: 400 });
    }
    if (text.length > MAX_TEXT) {
      return NextResponse.json(
        { message: `Text too long (max ${MAX_TEXT} characters).` },
        { status: 413 }
      );
    }

    const wantedVoice =
      typeof speaker === "string" && speaker.trim() ? speaker.trim().toLowerCase() : DEFAULT_VOICE;
    if (!(VOICES as readonly string[]).includes(wantedVoice)) {
      return NextResponse.json(
        {
          message: `Unknown voice "${wantedVoice}".`,
          voices: VOICES,
        },
        { status: 400 }
      );
    }

    const wantedLanguage =
      typeof languageCode === "string" && languageCode.trim() ? languageCode.trim() : "en-IN";
    if (!(LANGUAGES as readonly string[]).includes(wantedLanguage)) {
      return NextResponse.json(
        {
          message: `Unsupported language "${wantedLanguage}".`,
          languages: LANGUAGES,
        },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": sarvamApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.trim(),
        target_language_code: wantedLanguage,
        speaker: wantedVoice,
        model: "bulbul:v3",
      }),
    });

    if (!response.ok) {
      /*
       * Surface what Sarvam actually said. This used to return only
       * `response.statusText`, so every failure read "Bad Request" with no way
       * to tell a bad voice from a quota problem from a malformed payload —
       * which is exactly how a wrong default voice stayed hidden.
       */
      const raw = await response.text();
      console.error("Sarvam TTS API Error:", response.status, raw);

      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        detail = parsed?.error?.message || parsed?.message || raw;
      } catch {
        /* not JSON — use the raw body */
      }

      const status = response.status >= 400 && response.status < 600 ? response.status : 502;
      return NextResponse.json(
        { message: detail || `Speech synthesis failed (${response.status}).` },
        { status }
      );
    }

    const data = await response.json();
    const base64Audio: string = data?.audios?.[0] || data?.audio || "";

    if (!base64Audio) {
      console.error("Sarvam TTS returned no audio:", JSON.stringify(data).slice(0, 300));
      return NextResponse.json(
        { message: "Speech synthesis returned no audio." },
        { status: 502 }
      );
    }

    return NextResponse.json({ audio: base64Audio });
  } catch (error: any) {
    console.error("Voice Speak Route Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
