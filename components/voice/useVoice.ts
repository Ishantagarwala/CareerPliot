"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  speaker: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "en-IN", name: "English", nativeName: "English", speaker: "ritu" },
  { code: "hi-IN", name: "Hindi", nativeName: "हिन्दी", speaker: "shubh" },
  { code: "bn-IN", name: "Bengali", nativeName: "বাংলা", speaker: "ritu" },
];

export function useVoice() {
  const [status, setStatus] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(SUPPORTED_LANGUAGES[0]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Stop any active audio playbacks when unmounted
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    // If speaking, stop it
    stopSpeech();
    setError(null);
    setTranscript("");
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is not supported by this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: "audio/webm" };
      let mediaRecorder;

      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback mimeType if webm is not supported (e.g. Safari)
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        // Close audio track streams
        stream.getTracks().forEach((track) => track.stop());
        await handleTranscribe(audioBlob);
      };

      mediaRecorder.start();
      setStatus("listening");
    } catch (err: any) {
      console.error("Microphone Error:", err);
      setError(err.message || "Failed to access microphone.");
      setStatus("error");
      toast.error(err.message || "Microphone access failed.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setStatus("processing");
    }
  };

  const handleTranscribe = async (audioBlob: Blob) => {
    setStatus("processing");
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("language_code", selectedLanguage.code);

      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Speech transcription failed.");
      }

      const data = await res.json();
      setTranscript(data.text);
      setStatus("idle");
    } catch (err: any) {
      console.error("Transcribe Error:", err);
      setError(err.message || "Could not recognize speech.");
      setStatus("error");
    }
  };

  const speakText = async (text: string): Promise<void> => {
    stopSpeech();
    setStatus("processing");
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          languageCode: selectedLanguage.code,
          speaker: selectedLanguage.speaker,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "TTS synthesis failed.");
      }

      const data = await res.json();
      if (!data.audio) {
        throw new Error("No synthesized audio received from server.");
      }

      // Play base64 audio
      return new Promise((resolve, reject) => {
        const audioUrl = `data:audio/wav;base64,${data.audio}`;
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        setStatus("speaking");

        audio.onended = () => {
          setStatus("idle");
          resolve();
        };

        audio.onerror = (e) => {
          setStatus("error");
          reject(new Error("Audio playback failed."));
        };

        audio.play().catch((err) => {
          console.error("Audio play failed:", err);
          setStatus("error");
          reject(err);
        });
      });
    } catch (err: any) {
      console.error("Speak Error:", err);
      setError(err.message || "Text-to-speech synthesis failed.");
      setStatus("error");
    }
  };

  const stopSpeech = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
      if (status === "speaking") {
        setStatus("idle");
      }
    }
  };

  return {
    status,
    setStatus,
    transcript,
    setTranscript,
    error,
    setError,
    selectedLanguage,
    setSelectedLanguage,
    languages: SUPPORTED_LANGUAGES,
    startRecording,
    stopRecording,
    speakText,
    stopSpeech,
  };
}
