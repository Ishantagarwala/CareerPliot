import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const sarvamApiKey = process.env.SARVAM_AI_API_KEY?.trim();
    if (!sarvamApiKey) {
      return NextResponse.json({ message: "Sarvam AI API key is not configured on the server." }, { status: 500 });
    }

    const clientFormData = await req.formData();
    const audioFile = clientFormData.get("file") as File;
    const languageCode = clientFormData.get("language_code") as string || "en-IN";

    if (!audioFile) {
      return NextResponse.json({ message: "No audio file provided." }, { status: 400 });
    }

    // Forward the file directly to Sarvam.ai API
    const sarvamFormData = new FormData();
    sarvamFormData.append("file", audioFile);
    sarvamFormData.append("model", "saaras:v3");
    sarvamFormData.append("language_code", languageCode);

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": sarvamApiKey,
      },
      body: sarvamFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sarvam ASR API Error:", errorText);
      return NextResponse.json({ message: `Sarvam API error: ${response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      text: data.transcript || data.text || "",
      language: languageCode,
    });
  } catch (error: any) {
    console.error("Voice Transcribe Route Error:", error);
    return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
}
