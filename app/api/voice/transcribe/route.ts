import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, rateLimit, requestBodyTooLarge } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!rateLimit(`voice-transcribe:${session.user.id}`, 40, 60 * 60 * 1000)) {
      return NextResponse.json(
        { message: "Too many transcription requests. Try again later." },
        { status: 429 }
      );
    }

    // Reject oversized bodies BEFORE reading them into memory.
    if (requestBodyTooLarge(req)) {
      return NextResponse.json({ message: "Audio file too large (max 10 MB)." }, { status: 413 });
    }

    const sarvamApiKey = process.env.SARVAM_AI_API_KEY?.trim();
    if (!sarvamApiKey) {
      return NextResponse.json({ message: "Sarvam AI API key is not configured on the server." }, { status: 500 });
    }

    const clientFormData = await req.formData();
    const audioFile = clientFormData.get("file") as File;
    const languageCode = ((clientFormData.get("language_code") as string) || "en-IN").trim();

    if (!audioFile) {
      return NextResponse.json({ message: "No audio file provided." }, { status: 400 });
    }

    if (audioFile.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ message: "Audio file too large (max 10 MB)." }, { status: 413 });
    }

    /*
     * Guard the language code before it reaches the provider.
     *
     * It comes straight off a client FormData field, and Sarvam rejects an
     * unknown code with a 400 that the old error handler flattened into the
     * word "Bad Request" — so a typo looked identical to a quota failure.
     * An empty transcript is also legitimate (silence, background noise), so
     * this must not be treated as an error downstream.
     */
    const SUPPORTED_LANGUAGES = ["en-IN", "hi-IN", "bn-IN", "ta-IN", "te-IN", "mr-IN", "gu-IN", "kn-IN", "ml-IN", "pa-IN", "od-IN"];
    if (!SUPPORTED_LANGUAGES.includes(languageCode)) {
      return NextResponse.json(
        { message: `Unsupported language "${languageCode}".`, languages: SUPPORTED_LANGUAGES },
        { status: 400 }
      );
    }

    const form = new FormData();
    form.append("file", audioFile);
    form.append("model", "saaras:v3");
    form.append("language_code", languageCode);

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": sarvamApiKey,
      },
      body: form,
    });

    if (!response.ok) {
      // Surface Sarvam's own message. Returning only `statusText` made every
      // failure indistinguishable.
      const raw = await response.text();
      console.error("Sarvam ASR API Error:", response.status, raw);

      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        detail = parsed?.error?.message || parsed?.message || raw;
      } catch {
        /* not JSON — use the raw body */
      }

      const status = response.status >= 400 && response.status < 600 ? response.status : 502;
      return NextResponse.json(
        { message: detail || `Transcription failed (${response.status}).` },
        { status }
      );
    }

    const data = await response.json();
    // An empty transcript is a valid outcome for silence — the client treats it
    // as "nothing heard" rather than an error.
    return NextResponse.json({
      text: data.transcript || data.text || "",
      language: data.language_code || languageCode,
    });
  } catch (error: any) {
    console.error("Voice Transcribe Route Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
