"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { VoiceState, SupportedLanguage } from "./useVoice";

interface VoiceHUDProps {
  status: VoiceState;
  transcript: string;
  onTranscriptChange: (text: string) => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  languages: SupportedLanguage[];
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  suggestions?: string[];
  /** Continuous 1:1 assistant session (tutor). Default: single-turn interview. */
  mode?: "single" | "conversation";
  /** While assistant is thinking / calling the LLM. */
  thinking?: boolean;
  /** Interrupt TTS and start listening. */
  onBargeIn?: () => void;
}

export default function VoiceHUD({
  status,
  transcript,
  onTranscriptChange,
  onStartRecord,
  onStopRecord,
  onSubmit,
  onCancel,
  languages,
  selectedLanguage,
  onLanguageChange,
  suggestions,
  mode = "single",
  thinking = false,
  onBargeIn,
}: VoiceHUDProps) {
  const [editingText, setEditingText] = useState("");
  const [mounted, setMounted] = useState(false);
  const isConversation = mode === "conversation";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setEditingText(transcript);
  }, [transcript]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const statusLabel = thinking
    ? "Tutor is thinking…"
    : status === "listening"
      ? isConversation
        ? "Listening — pause to send, or tap mic"
        : "Recording — tap mic to stop"
      : status === "processing"
        ? "Processing…"
        : status === "speaking"
          ? isConversation
            ? "Tutor speaking — tap to interrupt"
            : "Playing question…"
          : status === "error"
            ? "Something went wrong — try again"
            : isConversation
              ? "Tap mic to speak"
              : "Tap mic to answer";

  const micBusy =
    thinking || status === "processing" || (status === "speaking" && !onBargeIn);
  const canSubmit =
    !!editingText.trim() && !thinking && status !== "processing" && status !== "speaking";

  // ── Conversation mode ──────────────────────────────────────────────
  if (isConversation) {
    const panel = (
      <div
        className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Voice assistant"
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

        <div className="animate-scale-in relative z-[1001] flex w-full max-w-lg flex-col max-h-[min(92dvh,92vh)] sm:max-h-[min(85dvh,560px)] overflow-hidden rounded-t-2xl border border-border bg-card text-card-foreground shadow-pop sm:rounded-2xl">
          <div className="shrink-0 space-y-3 border-b border-border bg-card/95 px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    status === "listening"
                      ? "bg-destructive animate-pulse"
                      : thinking || status === "speaking"
                        ? "bg-primary animate-pulse"
                        : "bg-primary"
                  }`}
                />
                <span className="truncate text-[13px] font-medium text-muted-foreground">
                  Voice assistant
                </span>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                title="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
              <span className="shrink-0 text-[18px] text-primary material-symbols-outlined">
                translate
              </span>
              <label htmlFor="voice-language-conv" className="sr-only">
                Language
              </label>
              <select
                id="voice-language-conv"
                value={selectedLanguage.code}
                onChange={(e) => {
                  const found = languages.find((l) => l.code === e.target.value);
                  if (found) onLanguageChange(found);
                }}
                disabled={thinking || status === "listening" || status === "speaking"}
                className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-sm font-medium text-foreground outline-none focus:ring-0 disabled:opacity-50"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code} className="bg-card text-foreground">
                    {l.nativeName === l.name ? l.name : `${l.nativeName} (${l.name})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
            <div className="flex items-center gap-3">
              {status === "listening" ? (
                <button
                  type="button"
                  onClick={onStopRecord}
                  className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border border-destructive/50 bg-destructive text-white transition-colors hover:bg-destructive/90"
                  title="Stop and send"
                >
                  <span className="absolute inset-0 animate-ping rounded-full border border-destructive opacity-30" />
                  <span className="material-symbols-outlined relative text-[26px]">mic</span>
                </button>
              ) : thinking || status === "processing" ? (
                <div className="glow-ai flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
                </div>
              ) : status === "speaking" ? (
                <button
                  type="button"
                  onClick={onBargeIn}
                  disabled={!onBargeIn}
                  className="glow-ai flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-muted shadow-soft disabled:cursor-default"
                  title={onBargeIn ? "Interrupt and speak" : undefined}
                >
                  <div className="pointer-events-none flex h-6 items-end gap-0.5">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="w-1 animate-voice-bar rounded-full bg-primary"
                        style={{
                          height: `${8 + (i % 3) * 6}px`,
                          animationDelay: `${i * 80}ms`,
                          animationDuration: "0.55s",
                        }}
                      />
                    ))}
                  </div>
                </button>
              ) : status === "error" ? (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive">
                  <span className="material-symbols-outlined text-[26px]">error</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onStartRecord}
                  disabled={micBusy}
                  className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors hover:bg-accent/80 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[26px]">mic</span>
                </button>
              )}
              <p className="text-left text-[13px] font-medium leading-snug text-muted-foreground">
                {statusLabel}
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-muted-foreground">
                  You said
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Editable
                </span>
              </div>
              <textarea
                value={editingText}
                onChange={(e) => {
                  setEditingText(e.target.value);
                  onTranscriptChange(e.target.value);
                }}
                disabled={thinking}
                className="max-h-[140px] min-h-[80px] w-full resize-y rounded-lg border border-input bg-card px-3 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-60 transition-colors"
                placeholder="Speak naturally — I'll reply when you pause…"
              />
            </div>
          </div>

          <div className="shrink-0 space-y-2 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onStartRecord}
                disabled={micBusy || status === "listening" || thinking}
                className="flex-1 cursor-pointer rounded-lg border border-border bg-card py-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                Speak again
              </button>
              <button
                type="button"
                onClick={() => onSubmit(editingText)}
                disabled={!canSubmit}
                className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-xs font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:pointer-events-none disabled:opacity-40"
              >
                Send now
              </button>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="w-full cursor-pointer rounded-lg py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              End session
            </button>
          </div>
        </div>
      </div>
    );

    if (!mounted) return null;
    return createPortal(panel, document.body);
  }

  // ── Single-turn interview mode (assessment) ────────────────────────
  const panel = (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Voice interview"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onCancel}
      />

      <div className="animate-scale-in relative z-[1001] flex w-full max-w-lg flex-col max-h-[min(92dvh,92vh)] sm:max-h-[min(85dvh,560px)] overflow-hidden rounded-t-2xl border border-border bg-card text-card-foreground shadow-pop sm:rounded-2xl">
        <div className="shrink-0 space-y-3 border-b border-border px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  status === "listening" ? "bg-destructive animate-pulse" : "bg-primary"
                }`}
              />
              <span className="truncate text-[13px] font-medium text-muted-foreground">
                Voice interview
              </span>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              title="Close"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
            <span className="shrink-0 text-[18px] text-primary material-symbols-outlined">
              translate
            </span>
            <label htmlFor="voice-language" className="sr-only">
              Language
            </label>
            <select
              id="voice-language"
              value={selectedLanguage.code}
              onChange={(e) => {
                const found = languages.find((l) => l.code === e.target.value);
                if (found) onLanguageChange(found);
              }}
              disabled={thinking || status === "listening" || status === "speaking"}
              className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-foreground outline-none focus:ring-0 disabled:opacity-50"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="bg-card text-foreground">
                  {l.nativeName === l.name ? l.name : `${l.nativeName} (${l.name})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
          <div className="flex items-center gap-3">
            {status === "listening" ? (
              <button
                type="button"
                onClick={onStopRecord}
                className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border border-destructive/50 bg-destructive text-white transition-colors hover:bg-destructive/90"
                title="Stop and send"
              >
                <span className="absolute inset-0 animate-ping rounded-full border border-destructive opacity-40" />
                <span className="material-symbols-outlined relative text-[26px]">mic</span>
              </button>
            ) : thinking || status === "processing" ? (
              <div className="glow-ai flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
            ) : status === "speaking" ? (
              <button
                type="button"
                onClick={onBargeIn}
                disabled={!onBargeIn}
                className="glow-ai flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-muted shadow-soft disabled:cursor-default"
                title={onBargeIn ? "Interrupt and speak" : undefined}
              >
                <div className="pointer-events-none flex h-6 items-end gap-0.5">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="w-1 animate-voice-bar rounded-full bg-primary"
                      style={{
                        height: `${8 + (i % 3) * 6}px`,
                        animationDelay: `${i * 80}ms`,
                        animationDuration: "0.55s",
                      }}
                    />
                  ))}
                </div>
              </button>
            ) : status === "error" ? (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive">
                <span className="material-symbols-outlined text-[26px]">error</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onStartRecord}
                disabled={micBusy}
                className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[26px]">mic</span>
              </button>
            )}
            <p className="text-left text-[13px] font-medium leading-snug text-muted-foreground">
              {statusLabel}
            </p>
          </div>

          {suggestions && suggestions.length > 0 && (
            <div className="space-y-1.5 text-left">
              <label className="text-[13px] font-medium text-muted-foreground">
                Suggested
              </label>
              <div className="max-h-[64px] overflow-y-auto rounded-lg border border-border bg-muted p-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      const currentText = editingText.trim();
                      const newText = currentText
                        ? currentText.endsWith(",") || currentText.endsWith(".")
                          ? `${currentText} ${suggestion}`
                          : `${currentText}, ${suggestion}`
                        : suggestion;
                      setEditingText(newText);
                      onTranscriptChange(newText);
                    }}
                    className="mr-1.5 mb-1.5 cursor-pointer rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground transition-colors last:mr-0 hover:bg-primary hover:text-primary-foreground"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-muted-foreground">
                Your answer
              </label>
              <span className="text-[11px] text-muted-foreground">
                Editable
              </span>
            </div>
            <textarea
              value={editingText}
              onChange={(e) => {
                setEditingText(e.target.value);
                onTranscriptChange(e.target.value);
              }}
              disabled={thinking}
              className="max-h-[140px] min-h-[80px] w-full resize-y rounded-lg border border-input bg-card px-3 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-60 transition-colors"
              placeholder="Speak or type your answer here…"
            />
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onStartRecord}
              disabled={micBusy || status === "listening" || thinking}
              className="flex-1 cursor-pointer rounded-lg border border-border bg-card py-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            >
              Re-record
            </button>
            <button
              type="button"
              onClick={() => onSubmit(editingText)}
              disabled={!canSubmit}
              className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-xs font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:pointer-events-none disabled:opacity-40"
            >
              Submit answer
            </button>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-full cursor-pointer rounded-lg py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(panel, document.body);
}
