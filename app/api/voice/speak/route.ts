import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const sarvamApiKey = process.env.SARVAM_AI_API_KEY || process.env.SARVAM_API_KEY;
    if (!sarvamApiKey) {
      return NextResponse.json({ message: "Sarvam AI API key is not configured on the server." }, { status: 500 });
    }

    const { text, languageCode, speaker } = await req.json();

    if (!text) {
      return NextResponse.json({ message: "No text provided." }, { status: 400 });
    }

    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": sarvamApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        target_language_code: languageCode || "en-IN",
        speaker: speaker || "meera",
        model: "bulbul:v3",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sarvam TTS API Error:", errorText);
      return NextResponse.json({ message: `Sarvam API error: ${response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    const base64Audio = data.audios?.[0] || data.audio || "";

    return NextResponse.json({
      audio: base64Audio,
    });
  } catch (error: any) {
    console.error("Voice Speak Route Error:", error);
    return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
}
