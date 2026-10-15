"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  aggregateSpeechResults,
  chunkForSpeech,
  normalizeForSpeech,
} from "@/lib/voice/transcript";

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

/**
 * Maps a recording MIME type to a file extension.
 *
 * The upload used to be labelled `audio.webm` unconditionally, but Safari
 * cannot record webm — it produces AAC in an MP4 container. Sending that as
 * `.webm` risked the provider rejecting a mislabelled file, or misreading it.
 */
export function mediaBlobExtension(mimeType: string): string {
  const type = (mimeType || "").toLowerCase();
  if (type.includes("webm")) return "webm";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("mp4") || type.includes("aac") || type.includes("m4a")) return "m4a";
  if (type.includes("wav")) return "wav";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  return "webm";
}

/**
 * The MIME types the ASR provider accepts, taken from its own rejection
 * message. Used to guarantee we never send something it will refuse.
 */
export const ASR_ACCEPTED_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/aac",
  "audio/aiff",
  "audio/ogg",
  "audio/opus",
  "audio/flac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/amr",
  "audio/webm",
] as const;

/**
 * Converts a `MediaRecorder` MIME type into one the ASR provider accepts.
 *
 * WHY THIS EXISTS — a real regression.
 *
 * `MediaRecorder.mimeType` comes back as `audio/webm;codecs=opus`, because that
 * is what the recorder actually negotiated. Forwarding that verbatim made the
 * provider reject every Chrome recording:
 *
 *   400 Invalid file type: audio/webm;codecs=opus.
 *       Only ['audio/mpeg', ..., 'audio/webm', ...] are allowed.
 *
 * The codec PARAMETER is the problem, not the container: `audio/webm` is on the
 * allowed list but `audio/webm;codecs=opus` is a different string and is not.
 * The fix is to drop the parameter — the codec is already carried by the byte
 * stream, so the bare container type loses no information the provider needs.
 *
 * `audio/mp4;codecs=...` and `video/webm` are normalised too: the first for the
 * same reason, the second because a video container type is not on the list and
 * the payload is audio-only regardless.
 */
export function normalizeRecorderMimeType(mimeType: string | undefined): string {
  const raw = (mimeType || "").trim().toLowerCase();
  if (!raw) return "audio/webm";

  // Drop any `;codecs=...` / `; rate=...` parameters.
  const bare = raw.split(";")[0].trim();

  /*
   * Normalise a video container to its audio equivalent BEFORE the allowlist
   * check. `video/webm` is technically accepted by the provider, but the
   * payload is audio-only and calling it video misstates what is being sent.
   */
  const asAudio = bare === "video/webm" ? "audio/webm" : bare;

  if ((ASR_ACCEPTED_MIME_TYPES as readonly string[]).includes(asAudio)) return asAudio;

  // Not directly accepted — map the container onto an allowed equivalent.
  if (asAudio.includes("webm")) return "audio/webm";
  if (asAudio.includes("ogg")) return asAudio.includes("opus") ? "audio/opus" : "audio/ogg";
  if (asAudio.includes("mp4") || asAudio.includes("m4a") || asAudio.includes("aac")) {
    return "audio/mp4";
  }
  if (asAudio.includes("wav") || asAudio.includes("wave")) return "audio/wav";
  if (asAudio.includes("mpeg") || asAudio.includes("mp3")) return "audio/mpeg";
  if (asAudio.includes("flac")) return "audio/flac";
  if (asAudio.includes("aiff")) return "audio/aiff";
  if (asAudio.includes("amr")) return "audio/amr";

  /*
   * Unknown container. `application/octet-stream` is on the provider's list for
   * exactly this case, and is honest — better than claiming a type we cannot
   * confirm and being rejected for it.
   */
  return "application/octet-stream";
}

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

/**
 * Turns a getUserMedia rejection into copy that names the actual cause.
 *
 * The old code reported "Microphone access is not supported by this browser"
 * for every failure — including a missing device, a device held by another app,
 * and an insecure origin. Three different problems, three different fixes, all
 * described as "unsupported".
 */
export function describeMicError(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone blocked. Allow mic access in your browser's address bar.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No microphone found. Connect one and try again.";
    case "NotReadableError":
      return "Another app is using your microphone. Close it and try again.";
    default:
      break;
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Voice needs a secure connection (https://).";
  }
  const message = (err as { message?: string } | null)?.message;
  return message || "Microphone access failed.";
}

export function useVoice(options: UseVoiceOptions = {}) {
  const { silenceMs = 1600, onUtteranceEnd } = options;

  const [status, setStatus] = useState<VoiceState>("idle");
  // Named `setTranscriptState` so the exported `setTranscript` can be the
  // write-through version that keeps transcriptRef in step.
  const [transcript, setTranscriptState] = useState("");
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
  const onUtteranceEndRef = useRef<((text: string) => void) | undefined | null>(
    onUtteranceEnd
  );
  const silenceMsRef = useRef(silenceMs);
  const statusRef = useRef<VoiceState>(status);
  const pendingUtteranceRef = useRef(false);
  /** Skip utterance submit on intentional abort. */
  const suppressEndRef = useRef(false);
  /** Chrome Web Speech often fails with "network" — prefer Sarvam after that. */
  const skipNativeRecognitionRef = useRef(false);
  const selectedLanguageRef = useRef(selectedLanguage);
  const audioUnlockedRef = useRef(false);
  /**
   * True once the hook has unmounted. Every post-`await` continuation checks
   * this before touching state or firing a callback, otherwise a slow ASR or
   * TTS response lands after navigation and can append a chat message to a
   * screen the user has already left.
   */
  const deadRef = useRef(false);
  /** Bumped by every stop/cancel; a stale continuation compares and bails. */
  const turnIdRef = useRef(0);
  /** In-flight fetches, so cancel can actually abort them. */
  const transcribeAbortRef = useRef<AbortController | null>(null);
  const speakAbortRef = useRef<AbortController | null>(null);
  /** Guards against a second capture starting while one is live. */
  const captureActiveRef = useRef(false);
  /** Hard stop for a user who never speaks, so the mic cannot stay open. */
  const maxUtteranceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * True while a conversation session is open (i.e. the caller will auto-resume
   * after a reply). Only then is it right to restart after `no-speech`; in
   * push-to-talk mode a silent pause should return control to the user.
   */
  const voiceSessionActiveRef = useRef(false);
  /** Bounds the `no-speech` auto-retry so it cannot loop forever. */
  const noSpeechRetriesRef = useRef(0);
  /**
   * Fires if the native recogniser never confirms it started.
   *
   * Without it, an engine that starts and then stays silent leaves the UI on
   * "Tap mic to speak" indefinitely with no error — the microphone button
   * appears to do nothing.
   */
  const nativeWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onUtteranceEndRef.current = onUtteranceEnd;
  }, [onUtteranceEnd]);

  useEffect(() => {
    silenceMsRef.current = silenceMs;
  }, [silenceMs]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  /*
   * NOTE: there is deliberately no `transcriptRef.current = transcript` effect.
   *
   * `transcriptRef` is the source of truth and `setTranscriptValue` keeps the
   * state in step. Mirroring state INTO the ref is what caused the
   * transcript-duplication bug: the speech handler appended to the ref while
   * the ref was being overwritten from the display value, which had already
   * absorbed the previous (cumulative) interim result.
   */

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  /** Single writer for the transcript, so the ref and state cannot diverge. */
  const setTranscriptValue = useCallback((text: string) => {
    transcriptRef.current = text;
    setTranscriptState(text);
  }, []);

  const clearMaxUtteranceTimer = useCallback(() => {
    if (maxUtteranceTimerRef.current) {
      clearTimeout(maxUtteranceTimerRef.current);
      maxUtteranceTimerRef.current = null;
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
    /*
     * Invalidate the current turn FIRST, so an `await` that is already in
     * flight cannot resume and start playing after this returns. Without it,
     * "End session" during "Processing…" still produced speech, because
     * stopSpeech could only pause an <audio> element that did not exist yet.
     */
    turnIdRef.current += 1;
    speakAbortRef.current?.abort();
    speakAbortRef.current = null;

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

  /**
   * Releases the microphone and marks capture inactive.
   *
   * Every exit path goes through here so the single-flight guard is always
   * cleared, and so no stream is left live.
   */
  const releaseCapture = useCallback(() => {
    captureActiveRef.current = false;
    clearMaxUtteranceTimer();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  }, [clearMaxUtteranceTimer]);

  useEffect(() => {
    /*
     * Reset on MOUNT, not just set on unmount.
     *
     * `deadRef` is set true by the cleanup below, and React 18+ StrictMode runs
     * mount → cleanup → mount in development. Nothing set it back, so after the
     * simulated unmount the hook believed it was dead for the rest of its life:
     * `startMediaRecorder` released every stream it acquired and returned early,
     * and "tap to record" did nothing at all, with no error shown.
     *
     * Clearing it here makes the flag mean what it says — "this instance has
     * been torn down" — instead of "this instance was ever cleaned up".
     */
    deadRef.current = false;

    return () => {
      deadRef.current = true;
      turnIdRef.current += 1;
      if (nativeWatchdogRef.current) {
        clearTimeout(nativeWatchdogRef.current);
        nativeWatchdogRef.current = null;
      }
      clearSilenceTimer();
      clearMaxUtteranceTimer();
      clearVad();
      transcribeAbortRef.current?.abort();
      speakAbortRef.current?.abort();
      // The browser-TTS fallback is not an <audio> element, so pausing the
      // element above does not silence it — it must be cancelled explicitly.
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (activeAudioRef.current) activeAudioRef.current.pause();
      if (recognitionRef.current) {
        suppressEndRef.current = true;
        try {
          recognitionRef.current.abort();
        } catch {
          /* ignore */
        }
        recognitionRef.current = null;
      }
      // Stop the recorder before the tracks, and swallow its onstop so it
      // cannot transcribe and submit after the component is gone.
      suppressEndRef.current = true;
      if (mediaRecorderRef.current?.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      captureActiveRef.current = false;
      // Never let a late transcript reach a screen that has been left.
      onUtteranceEndRef.current = null;
    };
  }, [clearSilenceTimer, clearMaxUtteranceTimer, clearVad]);

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
    if (!cleaned || !onUtteranceEndRef.current || deadRef.current) return;
    setTranscriptValue("");
    onUtteranceEndRef.current(cleaned);
  }, [setTranscriptValue]);

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
      // Too short to be speech. Say so rather than going quiet, which used to
      // look like the app had simply ignored the attempt.
      setStatus("idle");
      toast.message("That was too short — hold on and speak.");
      return;
    }

    const turnId = turnIdRef.current;
    setStatus("processing");

    transcribeAbortRef.current?.abort();
    const controller = new AbortController();
    transcribeAbortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const formData = new FormData();
      /*
       * Carry the recorder's real container: Safari cannot record webm, so
       * labelling AAC/MP4 as audio.webm sent Sarvam a mislabelled file.
       *
       * The MIME type is normalised (codec parameters stripped) because
       * `MediaRecorder.mimeType` reports e.g. `audio/webm;codecs=opus`, and the
       * provider rejects that exact string even though `audio/webm` is on its
       * allowed list — which broke transcription for every Chrome recording.
       */
      const uploadType = normalizeRecorderMimeType(audioBlob.type);
      const uploadBlob =
        audioBlob.type === uploadType
          ? audioBlob
          : new Blob([audioBlob], { type: uploadType });
      const ext = mediaBlobExtension(uploadType);
      formData.append("file", uploadBlob, `audio.${ext}`);
      formData.append("language_code", selectedLanguageRef.current.code);

      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Speech transcription failed.");
      }

      const data = await res.json();
      const text = (data.text || "").trim();

      // A cancel or navigation during the request must not resurrect ui state.
      if (deadRef.current || turnId !== turnIdRef.current) return;

      /*
       * Leave the recognised text in the box. It used to be set and then
       * immediately cleared by emitUtterance, so the cloud-ASR path never
       * showed what it had heard — in the one textarea labelled "Editable".
       */
      setTranscriptValue(text);
      setStatus("idle");

      if (text) {
        emitUtterance(text);
      } else {
        toast.message("Didn't catch that — try speaking again.");
      }
    } catch (err: any) {
      if (deadRef.current || turnId !== turnIdRef.current) return;
      // An abort is a cancel or a timeout, not a failure to report as one.
      if (err?.name === "AbortError") {
        setStatus("idle");
        toast.message("That took too long — try again.");
        return;
      }
      console.error("Transcribe Error:", err);
      setError(err.message || "Could not recognize speech.");
      setStatus("error");
      toast.error(err.message || "Could not recognize speech.");
    } finally {
      clearTimeout(timeout);
      if (transcribeAbortRef.current === controller) transcribeAbortRef.current = null;
    }
  };

  const startMediaRecorder = async () => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      // The old copy said "not supported by this browser" for what is really a
      // transport problem, which sends people to the wrong fix.
      throw new Error("Voice needs a secure connection (https://).");
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support microphone capture.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    /*
     * The stream arrived, but the user may have cancelled — or navigated away —
     * while the permission prompt was open. Releasing it here is what stops an
     * abandoned getUserMedia from leaving the microphone live.
     */
    if (deadRef.current || !captureActiveRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    mediaStreamRef.current = stream;
    audioChunksRef.current = [];

    // Ask what the browser can actually record. Safari rejects audio/webm, and
    // assuming it produced a mislabelled upload to Sarvam.
    const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    const supported =
      typeof MediaRecorder.isTypeSupported === "function"
        ? preferred.find((t) => MediaRecorder.isTypeSupported(t))
        : undefined;

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = supported
        ? new MediaRecorder(stream, { mimeType: supported })
        : new MediaRecorder(stream);
    } catch {
      mediaRecorder = new MediaRecorder(stream);
    }

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onerror = () => {
      // A recorder error used to leave status at "listening" with a dead mic.
      releaseCapture();
      clearVad();
      setStatus("error");
      setError("Recording failed. Check your microphone.");
      toast.error("Recording failed. Check your microphone.");
    };

    mediaRecorder.onstop = async () => {
      clearVad();
      clearMaxUtteranceTimer();
      // Use the recorder's OWN container rather than an assumption.
      const type = mediaRecorder.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type });

      /*
       * Release exactly the stream this recorder was given. The old code read
       * `mediaStreamRef.current`, which a second getUserMedia could have
       * replaced — so it stopped the wrong stream and left this one open.
       */
      stream.getTracks().forEach((track) => track.stop());
      if (mediaStreamRef.current === stream) mediaStreamRef.current = null;
      if (mediaRecorderRef.current === mediaRecorder) mediaRecorderRef.current = null;
      captureActiveRef.current = false;

      if (suppressEndRef.current || deadRef.current) {
        suppressEndRef.current = false;
        setStatus("idle");
        return;
      }
      await handleTranscribe(audioBlob);
    };

    // A device unplugged mid-recording must not leave the UI claiming to listen.
    stream.getAudioTracks().forEach((track) => {
      track.addEventListener("ended", () => {
        if (!captureActiveRef.current) return;
        releaseCapture();
        clearVad();
        setStatus("idle");
      });
    });

    mediaRecorder.start(250);
    setStatus("listening");

    /*
     * Hard ceiling, independent of the VAD.
     *
     * The VAD only counts silence AFTER it has heard speech, so a user who
     * never speaks left the recorder running indefinitely with the mic open.
     */
    clearMaxUtteranceTimer();
    maxUtteranceTimerRef.current = setTimeout(() => {
      if (!captureActiveRef.current) return;
      suppressEndRef.current = true;
      if (mediaRecorderRef.current?.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          releaseCapture();
        }
      }
      suppressEndRef.current = false;
      releaseCapture();
      clearVad();
      setStatus("idle");
      toast.message("Stopped after 30 seconds — tap the mic to try again.");
    }, 30000);

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
        // Measure elapsed time, not interval ticks: setInterval drifts, so
        // tick-counting made the effective pause longer than configured.
        let silentSince: number | null = null;

        vadIntervalRef.current = setInterval(() => {
          if (statusRef.current !== "listening") return;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          const now = Date.now();

          if (rms > 0.04) {
            heardSpeech = true;
            silentSince = null;
          } else if (heardSpeech) {
            if (silentSince === null) silentSince = now;
            if (now - silentSince >= silenceMsRef.current) {
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
    /*
     * SINGLE-FLIGHT GUARD.
     *
     * Without this, a second call while capture was already live started a
     * second recognizer (both writing the same transcript) and, on the
     * MediaRecorder path, a second getUserMedia — so the first MediaStream was
     * never stopped and the microphone stayed open. Barge-in triggered exactly
     * that, because it starts recording and then the awaiting turn's
     * hands-free resume starts it again.
     */
    if (captureActiveRef.current) {
      return;
    }
    captureActiveRef.current = true;

    stopSpeech();
    clearSilenceTimer();
    clearVad();
    setError(null);
    setTranscriptValue("");
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

        /*
         * WATCHDOG — the native engine can start and then do nothing at all.
         *
         * Observed in a real browser: `recognition.start()` returns without
         * throwing, and then NO event fires — not `start`, not `error`, not
         * `end` — for at least 14 seconds. `getUserMedia` is never reached
         * either, so the MediaRecorder fallback never triggers, and the UI sits
         * on "Tap mic to speak" forever. Tapping record simply does nothing.
         *
         * This is the failure mode users actually hit, and the old code had no
         * defence against it because it only reacted to events. If the engine
         * has not confirmed that it started within this window, stop waiting and
         * switch to the recorder we know works.
         */
        let nativeStarted = false;
        const nativeWatchdog = setTimeout(() => {
          if (nativeStarted || deadRef.current) return;
          console.warn("Speech recognition did not start; switching to the recorder.");
          skipNativeRecognitionRef.current = true;
          try {
            recognition.abort();
          } catch {
            /* ignore */
          }
          recognitionRef.current = null;
          /*
           * NOTE: `captureActiveRef` is deliberately NOT cleared here.
           * `startMediaRecorder` re-checks it AFTER awaiting getUserMedia, so
           * clearing it would make the fallback stop the very stream it just
           * acquired and return silently — the button would do nothing, which
           * is the bug this watchdog exists to fix.
           */
          void startMediaRecorder().catch((e: any) => {
            captureActiveRef.current = false;
            setError(describeMicError(e));
            setStatus("error");
          });
        }, 2500);
        // Cleared once the engine confirms it is live, and on every exit path.
        nativeWatchdogRef.current = nativeWatchdog;

        recognition.onstart = () => {
          nativeStarted = true;
          if (nativeWatchdogRef.current) {
            clearTimeout(nativeWatchdogRef.current);
            nativeWatchdogRef.current = null;
          }
          setStatus("listening");
        };

        recognition.onresult = (event: any) => {
          if (deadRef.current) return;
          /*
           * Rebuilt from the event, never appended. `event.results[i][0]
           * .transcript` is already cumulative for a live index, so appending
           * it to a transcript that contained the previous interim produced
           * "hello hello world hello world" — and that reached the LLM.
           */
          const { full } = aggregateSpeechResults(event);
          if (!full) return;
          setTranscriptValue(full);
          scheduleSilenceCheck();
        };

        recognition.onerror = (err: any) => {
          if (err.error === "aborted") {
            captureActiveRef.current = false;
            setStatus("idle");
            return;
          }
          if (err.error === "no-speech") {
            /*
             * A single silent pause used to end the hands-free loop with no
             * explanation, leaving the user to re-tap the mic and guess why.
             * Restart in place while the session is still open.
             */
            captureActiveRef.current = false;
            if (
              onUtteranceEndRef.current &&
              !deadRef.current &&
              voiceSessionActiveRef.current
            ) {
              const attempt = noSpeechRetriesRef.current + 1;
              noSpeechRetriesRef.current = attempt;
              if (attempt <= 3) {
                setStatus("idle");
                setTimeout(() => {
                  if (!deadRef.current && voiceSessionActiveRef.current) {
                    void startRecording();
                  }
                }, 400);
                return;
              }
              noSpeechRetriesRef.current = 0;
              toast.message("I can't hear anything — tap the mic when you're ready.");
            }
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
            /*
             * `captureActiveRef` stays set: the recogniser is finished, but the
             * fallback still needs the guard held across its own async
             * getUserMedia. See the note in the watchdog above.
             */
            if (err.error === "not-allowed") {
              captureActiveRef.current = false;
              toast.error(
                "Microphone blocked. Allow mic access in your browser's address bar."
              );
              setStatus("error");
              return;
            }
            toast.message("Switching to cloud speech recognition…");
            void startMediaRecorder().catch((e: any) => {
              captureActiveRef.current = false;
              setError(e.message || "Microphone failed.");
              setStatus("error");
              toast.error(e.message || "Microphone failed.");
            });
            return;
          }

          captureActiveRef.current = false;
          setError(
            err.error === "audio-capture"
              ? "No microphone found. Connect one and try again."
              : "Speech recognition failed."
          );
          setStatus("error");
        };

        recognition.onend = () => {
          recognitionRef.current = null;
          clearSilenceTimer();
          captureActiveRef.current = false;

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
      // Clear the guard or the single-flight check would refuse every later
      // attempt, leaving voice permanently dead after one failure.
      captureActiveRef.current = false;
      console.error("Microphone Error:", err);
      setError(describeMicError(err));
      setStatus("error");
      toast.error(describeMicError(err));
    }
  };

  const stopListeningOnly = () => {
    // Invalidate any continuation that is mid-await, so a transcribe that is
    // already in flight cannot come back and submit after this returns.
    turnIdRef.current += 1;
    if (nativeWatchdogRef.current) {
      clearTimeout(nativeWatchdogRef.current);
      nativeWatchdogRef.current = null;
    }
    transcribeAbortRef.current?.abort();
    transcribeAbortRef.current = null;
    clearSilenceTimer();
    clearMaxUtteranceTimer();
    clearVad();
    pendingUtteranceRef.current = false;
    suppressEndRef.current = true;
    captureActiveRef.current = false;

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

  /**
   * Opens or closes the conversation session.
   *
   * The hands-free loop is otherwise implied by whether an `onUtteranceEnd`
   * callback happens to be present, which is invisible to callers and made the
   * HUD's `mode` labels unreliable. This makes the intent explicit: while the
   * session is open, a silent pause restarts listening instead of ending it.
   */
  const setSessionActive = useCallback((active: boolean) => {
    voiceSessionActiveRef.current = active;
    if (!active) noSpeechRetriesRef.current = 0;
  }, []);

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

  /**
   * Synthesises and plays a reply.
   *
   * Changed from the original in four ways, each fixing a failure:
   *
   * 1. **Speakable text.** The reply used to be sent raw, so fenced code, link
   *    URLs and `**` markers were read aloud. Normalisation now happens here
   *    rather than in one consumer, so every screen speaks the same way.
   * 2. **Chunking.** bulbul:v3 caps a request at 2 500 characters; the route
   *    allows exactly that, and this splits anything longer on sentence
   *    boundaries instead of letting it fail and fall through to the robotic
   *    browser voice reading raw markdown.
   * 3. **Abortable.** The fetch is bound to an AbortController that
   *    `stopSpeech()` aborts, and a turn token is re-checked after every
   *    `await`. Cancelling during "Processing…" used to still speak.
   * 4. **Silent.** The old `onpause -> resolve()` made this resolve early on
   *    barge-in, which let the caller's hands-free resume start a second
   *    capture. The promise now settles when playback genuinely ends or is
   *    cancelled, and the caller checks whether it should still resume.
   */
  const speakText = async (text: string): Promise<void> => {
    stopSpeech();
    clearSilenceTimer();

    const speakable = normalizeForSpeech(text);
    if (!speakable) return;

    const turnId = turnIdRef.current;
    const alive = () => !deadRef.current && turnId === turnIdRef.current;

    setStatus("processing");

    const playBase64 = (base64: string) =>
      new Promise<void>((resolve, reject) => {
        const audio = new Audio(`data:audio/wav;base64,${base64}`);
        activeAudioRef.current = audio;
        setStatus("speaking");
        audio.onended = () => {
          if (activeAudioRef.current === audio) activeAudioRef.current = null;
          resolve();
        };
        // A pause is a cancel, not a completion. Resolving here is what let a
        // cancelled turn look finished and resume listening.
        audio.onpause = () => {
          if (activeAudioRef.current === audio) activeAudioRef.current = null;
          resolve();
        };
        audio.onerror = () => {
          reject(new Error("Audio playback failed."));
        };
        audio.play().catch(reject);
      });

    const chunks = chunkForSpeech(speakable, 2500);

    try {
      await unlockAudio();
      if (!alive()) return;

      for (const chunk of chunks) {
        // Re-checked per chunk, so a cancel mid-reply stops the rest.
        if (!alive()) return;

        speakAbortRef.current?.abort();
        const controller = new AbortController();
        speakAbortRef.current = controller;
        const timeout = setTimeout(() => controller.abort(), 20000);

        try {
          const res = await fetch("/api/voice/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: chunk,
              languageCode: selectedLanguageRef.current.code,
              speaker: selectedLanguageRef.current.speaker,
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || "TTS synthesis failed.");
          }

          const data = await res.json();
          if (!data.audio) {
            throw new Error("No synthesized audio received from server.");
          }

          if (!alive()) return;
          clearTimeout(timeout);
          await playBase64(data.audio);
        } finally {
          clearTimeout(timeout);
          if (speakAbortRef.current === controller) speakAbortRef.current = null;
        }
      }

      if (alive()) setStatus("idle");
    } catch (err: any) {
      // A cancel is not a failure, and must not fall through to browser TTS —
      // that is how the assistant kept talking after the session was closed.
      if (!alive() || err?.name === "AbortError") {
        if (alive()) setStatus("idle");
        return;
      }

      console.warn("Sarvam TTS failed, falling back to browser:", err);
      try {
        if (!alive()) return;
        setStatus("speaking");
        await speakWithBrowserTts(speakable, selectedLanguageRef.current.code);
        if (alive()) setStatus("idle");
      } catch (fallbackErr: any) {
        if (!alive()) return;
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
    /** Write-through: keeps transcriptRef in step with the displayed value. */
    setTranscript: setTranscriptValue,
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
    /** Opens/closes the hands-free conversation session. See setSessionActive. */
    setSessionActive,
  };
}
