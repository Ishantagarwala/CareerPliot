"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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

export interface UseVoiceOptions {
  /** Auto-fire when the user stops speaking for this many ms. */
  silenceMs?: number;
  /** Called with final transcript after silence / stop / MediaRecorder STT. */
  onUtteranceEnd?: (text: string) => void;
}

/** Tiny silent wav — unlocks Audio() after async TTS fetch (autoplay policy). */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA==";

function speakWithBrowserTts(text: string, lang: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      reject(new Error("Browser speech synthesis unavailable."));
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.onend = () => resolve();
    utter.onerror = () => reject(new Error("Browser speech synthesis failed."));
    window.speechSynthesis.speak(utter);
  });
}

export function useVoice(options: UseVoiceOptions = {}) {
  const { silenceMs = 1600, onUtteranceEnd } = options;

  const [status, setStatus] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(SUPPORTED_LANGUAGES[0]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const transcriptRef = useRef("");
  const onUtteranceEndRef = useRef(onUtteranceEnd);
  const silenceMsRef = useRef(silenceMs);
  const statusRef = useRef<VoiceState>(status);
  const pendingUtteranceRef = useRef(false);
  /** Skip utterance submit on intentional abort. */
  const suppressEndRef = useRef(false);
  /** Chrome Web Speech often fails with "network" — prefer Sarvam after that. */
  const skipNativeRecognitionRef = useRef(false);
  const selectedLanguageRef = useRef(selectedLanguage);
  const audioUnlockedRef = useRef(false);

  useEffect(() => {
    onUtteranceEndRef.current = onUtteranceEnd;
  }, [onUtteranceEnd]);

  useEffect(() => {
    silenceMsRef.current = silenceMs;
  }, [silenceMs]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearVad = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
      if (statusRef.current === "speaking") {
        setStatus("idle");
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      clearVad();
      if (activeAudioRef.current) activeAudioRef.current.pause();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          /* ignore */
        }
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [clearSilenceTimer, clearVad]);

  /** Call from a click handler so later TTS play() is allowed. */
  const unlockAudio = useCallback(async () => {
    if (audioUnlockedRef.current) return;
    try {
      const a = new Audio(SILENT_WAV);
      await a.play();
      a.pause();
      audioUnlockedRef.current = true;
    } catch {
      /* still try later */
    }
  }, []);

  const emitUtterance = useCallback((text: string) => {
    const cleaned = text.trim();
    if (!cleaned || !onUtteranceEndRef.current) return;
    setTranscript("");
    transcriptRef.current = "";
    onUtteranceEndRef.current(cleaned);
  }, []);

  const scheduleSilenceCheck = useCallback(() => {
    clearSilenceTimer();
    if (!onUtteranceEndRef.current) return;

    silenceTimerRef.current = setTimeout(() => {
      const text = transcriptRef.current.trim();
      if (!text || statusRef.current !== "listening") return;

      pendingUtteranceRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* ignore */
        }
        recognitionRef.current = null;
      }
      clearSilenceTimer();
      setStatus("idle");
      pendingUtteranceRef.current = false;
      emitUtterance(text);
    }, silenceMsRef.current);
  }, [clearSilenceTimer, emitUtterance]);

  const handleTranscribe = async (audioBlob: Blob) => {
    if (audioBlob.size < 500) {
      setStatus("idle");
      return;
    }
    setStatus("processing");
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("language_code", selectedLanguageRef.current.code);

      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Speech transcription failed.");
      }

      const data = await res.json();
      const text = (data.text || "").trim();
      setTranscript(text);
      transcriptRef.current = text;
      setStatus("idle");

      if (text) {
        emitUtterance(text);
      } else {
        toast.message("Didn't catch that — try speaking again.");
      }
    } catch (err: any) {
      console.error("Transcribe Error:", err);
      setError(err.message || "Could not recognize speech.");
      setStatus("error");
      toast.error(err.message || "Could not recognize speech.");
    }
  };

  const startMediaRecorder = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access is not supported by this browser.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    audioChunksRef.current = [];

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    } catch {
      mediaRecorder = new MediaRecorder(stream);
    }

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      clearVad();
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;

      if (suppressEndRef.current) {
        suppressEndRef.current = false;
        setStatus("idle");
        return;
      }
      await handleTranscribe(audioBlob);
    };

    mediaRecorder.start(250);
    setStatus("listening");

    // Simple energy VAD → auto-stop after silence (conversation mode)
    if (onUtteranceEndRef.current) {
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        let heardSpeech = false;
        let silentFor = 0;

        vadIntervalRef.current = setInterval(() => {
          if (statusRef.current !== "listening") return;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          if (rms > 0.04) {
            heardSpeech = true;
            silentFor = 0;
          } else if (heardSpeech) {
            silentFor += 100;
            if (silentFor >= silenceMsRef.current) {
              clearVad();
              if (mediaRecorderRef.current?.state === "recording") {
                mediaRecorderRef.current.stop();
                setStatus("processing");
              }
            }
          }
        }, 100);
      } catch (err) {
        console.warn("VAD unavailable, tap mic to stop:", err);
      }
    }
  };

  const startRecording = async () => {
    stopSpeech();
    clearSilenceTimer();
    clearVad();
    setError(null);
    setTranscript("");
    transcriptRef.current = "";
    audioChunksRef.current = [];
    pendingUtteranceRef.current = false;
    suppressEndRef.current = false;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // Prefer Sarvam MediaRecorder when Web Speech previously failed (network)
    if (SpeechRecognition && !skipNativeRecognitionRef.current) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguageRef.current.code;

        recognition.onstart = () => setStatus("listening");

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            const next = `${transcriptRef.current} ${finalTranscript}`.replace(/\s+/g, " ").trim();
            transcriptRef.current = next;
            setTranscript(next);
            scheduleSilenceCheck();
          } else if (interimTranscript) {
            const display = `${transcriptRef.current} ${interimTranscript}`
              .replace(/\s+/g, " ")
              .trim();
            setTranscript(display);
            scheduleSilenceCheck();
          }
        };

        recognition.onerror = (err: any) => {
          if (err.error === "aborted") {
            setStatus("idle");
            return;
          }
          if (err.error === "no-speech") {
            setStatus("idle");
            return;
          }

          console.warn("Speech Recognition Event:", err.error || err);

          // Chrome often returns "network" when Google STT is unreachable —
          // fall back to Sarvam MediaRecorder instead of hard-failing.
          if (
            err.error === "network" ||
            err.error === "service-not-allowed" ||
            err.error === "not-allowed"
          ) {
            skipNativeRecognitionRef.current = true;
            recognitionRef.current = null;
            if (err.error === "not-allowed") {
              toast.error("Microphone access denied.");
              setStatus("error");
              return;
            }
            toast.message("Switching to cloud speech recognition…");
            void startMediaRecorder().catch((e: any) => {
              setError(e.message || "Microphone failed.");
              setStatus("error");
              toast.error(e.message || "Microphone failed.");
            });
            return;
          }

          setStatus("error");
        };

        recognition.onend = () => {
          recognitionRef.current = null;
          clearSilenceTimer();

          if (suppressEndRef.current) {
            suppressEndRef.current = false;
            setStatus("idle");
            return;
          }

          if (pendingUtteranceRef.current) return;

          const text = transcriptRef.current.trim();
          // Browser often ends recognition on pause before our timer fires
          if (text && onUtteranceEndRef.current && statusRef.current === "listening") {
            setStatus("idle");
            emitUtterance(text);
            return;
          }

          if (statusRef.current === "listening") {
            setStatus("idle");
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        console.warn("SpeechRecognition start failed, falling back to MediaRecorder", err);
        skipNativeRecognitionRef.current = true;
      }
    }

    try {
      await startMediaRecorder();
    } catch (err: any) {
      console.error("Microphone Error:", err);
      setError(err.message || "Failed to access microphone.");
      setStatus("error");
      toast.error(err.message || "Microphone access failed.");
    }
  };

  const stopListeningOnly = () => {
    clearSilenceTimer();
    clearVad();
    pendingUtteranceRef.current = false;
    suppressEndRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
      }
    } else {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (statusRef.current === "listening" || statusRef.current === "processing") {
      setStatus("idle");
    }
  };

  const stopRecording = () => {
    clearSilenceTimer();
    clearVad();

    if (recognitionRef.current) {
      const text = transcriptRef.current.trim();
      pendingUtteranceRef.current = !!text && !!onUtteranceEndRef.current;
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
      setStatus("idle");

      if (text && onUtteranceEndRef.current) {
        pendingUtteranceRef.current = false;
        emitUtterance(text);
      }
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setStatus("processing");
    }
  };

  const bargeIn = async () => {
    stopSpeech();
    await startRecording();
  };

  const speakText = async (text: string): Promise<void> => {
    stopSpeech();
    clearSilenceTimer();
    setStatus("processing");

    const playBase64 = (base64: string) =>
      new Promise<void>((resolve, reject) => {
        const audio = new Audio(`data:audio/wav;base64,${base64}`);
        activeAudioRef.current = audio;
        setStatus("speaking");
        audio.onended = () => {
          setStatus("idle");
          resolve();
        };
        audio.onerror = () => {
          setStatus("error");
          reject(new Error("Audio playback failed."));
        };
        audio.play().catch(reject);
      });

    try {
      await unlockAudio();

      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          languageCode: selectedLanguageRef.current.code,
          speaker: selectedLanguageRef.current.speaker,
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

      try {
        await playBase64(data.audio);
      } catch (playErr) {
        console.warn("Sarvam audio play failed, using browser TTS:", playErr);
        setStatus("speaking");
        await speakWithBrowserTts(text, selectedLanguageRef.current.code);
        setStatus("idle");
      }
    } catch (err: any) {
      console.warn("Sarvam TTS failed, falling back to browser:", err);
      try {
        setStatus("speaking");
        await speakWithBrowserTts(text, selectedLanguageRef.current.code);
        setStatus("idle");
      } catch (fallbackErr: any) {
        console.error("Speak Error:", fallbackErr);
        setError(fallbackErr.message || err.message || "Text-to-speech failed.");
        setStatus("error");
        throw fallbackErr;
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
    stopListeningOnly,
    bargeIn,
    unlockAudio,
  };
}
