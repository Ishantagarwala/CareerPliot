"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Mic, X, Languages, AlertCircle } from "lucide-react";
import { VoiceState, SupportedLanguage } from "./useVoice";

/*
 * Conversation-mode chrome comes in two skins:
 *
 *  - "tutor"  the original dark, mono, square tutor console (career/tutor)
 *  - "hub"    the AI Hub's language — light/dark hub tokens, Inter, rounded,
 *             hairline borders, Lucide icons — so voice matches the chat UI
 *
 * They differ only in classes and icon set, so the markup is shared and these
 * tables select the skin. Kept side by side to make the divergence obvious.
 */
const CONVERSATION_STYLES = {
  tutor: {
    panel:
      "relative z-[1001] flex w-full max-w-lg flex-col max-h-[min(92dvh,92vh)] sm:max-h-[min(85dvh,560px)] bg-[#0A0A0A] border border-[#262626] shadow-2xl animate-scale-in text-white rounded-t-2xl sm:rounded-lg overflow-hidden",
    header:
      "shrink-0 border-b border-[#262626] px-4 pt-4 pb-3 space-y-3 bg-[#0A0A0A]/95",
    dotIdle: "bg-primary",
    dotActive: "bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]",
    title:
      "text-xs uppercase tracking-[0.15em] font-bold truncate text-[#c4c7c8]",
    titleFont: "'JetBrains Mono', monospace",
    closeBtn:
      "h-9 w-9 shrink-0 border border-[#262626] bg-[#1A1A1A] hover:border-red-500/60 hover:text-red-400 text-[#8e9192] flex items-center justify-center cursor-pointer transition-colors",
    langRow: "flex items-center gap-2 bg-[#1A1A1A] border border-[#262626] px-3 py-2",
    langIcon: "shrink-0 text-cyan-400",
    select:
      "flex-1 min-w-0 bg-transparent text-sm font-medium text-white border-0 outline-none p-0 cursor-pointer focus:ring-0 disabled:opacity-50",
    option: "bg-[#1A1A1A] text-white",
    busyRing:
      "h-14 w-14 shrink-0 border border-cyan-500/40 rounded-full flex items-center justify-center bg-[#1A1A1A]",
    busySpinner: "animate-spin h-7 w-7 border-2 border-[#262626] border-t-cyan-400 rounded-full",
    speakBtn:
      "h-14 w-14 shrink-0 bg-[#1A1A1A] border border-cyan-500/50 rounded-full flex items-center justify-center cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.25)] disabled:cursor-default",
    waveBar: "w-1 bg-cyan-400 rounded-full animate-bounce",
    micBtn:
      "h-14 w-14 shrink-0 bg-[#1C1C22] border border-cyan-500/50 hover:border-cyan-400 text-cyan-400 rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50",
    statusText:
      "text-left text-xs font-bold uppercase tracking-wide text-[#8e9192] leading-snug",
    statusFont: "'JetBrains Mono', monospace",
    fieldLabel:
      "text-[10px] uppercase tracking-[0.15em] font-bold text-[#8e9192]",
    fieldLabelFont: "'JetBrains Mono', monospace",
    fieldHint: "text-[9px] uppercase text-[#636565]",
    fieldHintFont: "'JetBrains Mono', monospace",
    textarea:
      "w-full bg-[#1A1A1A] border border-[#262626] focus:border-cyan-500/50 p-3 text-sm text-white placeholder:text-[#636565] min-h-[80px] max-h-[140px] focus:outline-none focus:ring-0 resize-y leading-relaxed disabled:opacity-60 transition-colors",
    textareaPlaceholder: "Speak naturally — I'll reply when you pause…",
    footer:
      "shrink-0 border-t border-[#262626] bg-[#0A0A0A] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2",
    againBtn:
      "flex-1 py-3 bg-[#1A1A1A] border border-[#262626] hover:border-[#404040] text-[#c4c7c8] font-mono text-xs font-bold tracking-wider disabled:opacity-40 cursor-pointer transition-colors",
    againFont: "'JetBrains Mono', monospace",
    sendBtn:
      "flex-1 py-3 bg-primary text-primary-foreground border border-primary/80 hover:brightness-110 font-extrabold font-mono text-xs tracking-wider disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-[filter]",
    sendFont: "'JetBrains Mono', monospace",
    endBtn:
      "w-full py-2.5 bg-transparent border border-[#262626] hover:border-red-500/50 hover:text-red-400 text-[#636565] font-mono text-[11px] tracking-widest font-bold uppercase cursor-pointer transition-colors",
    endFont: "'JetBrains Mono', monospace",
  },
  hub: {
    panel:
      "relative z-[1001] flex w-full max-w-lg flex-col max-h-[min(92dvh,92vh)] sm:max-h-[min(85dvh,560px)] bg-hub-surface border border-hub-line shadow-[var(--shadow-pop)] animate-scale-in text-hub-text rounded-t-2xl sm:rounded-xl overflow-hidden",
    header: "shrink-0 border-b border-hub-line px-4 pt-4 pb-3 space-y-3",
    dotIdle: "bg-[var(--primary)]",
    dotActive: "bg-[var(--primary)] animate-pulse",
    title: "text-[13px] font-semibold tracking-[-0.01em] truncate text-hub-text",
    titleFont: undefined,
    closeBtn:
      "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text",
    langRow: "flex items-center gap-2 rounded-md border border-hub-line bg-hub-raised px-2.5 py-1.5",
    langIcon: "shrink-0 text-hub-muted",
    select:
      "flex-1 min-w-0 cursor-pointer border-0 bg-transparent p-0 text-[13px] font-medium text-hub-text outline-none focus:ring-0 disabled:opacity-50",
    option: "bg-hub-surface text-hub-text",
    busyRing:
      "size-12 shrink-0 rounded-full border border-hub-line bg-hub-raised flex items-center justify-center",
    busySpinner:
      "h-6 w-6 animate-spin rounded-full border-2 border-hub-line border-t-[var(--primary)]",
    speakBtn:
      "size-12 shrink-0 cursor-pointer rounded-full border border-hub-line bg-hub-raised flex items-center justify-center disabled:cursor-default",
    waveBar: "w-1 rounded-full bg-[var(--primary)] animate-bounce",
    micBtn:
      "size-12 shrink-0 cursor-pointer rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center transition-[filter] hover:brightness-110 disabled:opacity-50",
    statusText: "text-left text-[13px] leading-snug text-hub-muted",
    statusFont: undefined,
    fieldLabel: "text-[11px] font-medium tracking-wide text-hub-muted uppercase",
    fieldLabelFont: undefined,
    fieldHint: "text-[11px] text-hub-muted",
    fieldHintFont: undefined,
    textarea:
      "w-full min-h-[80px] max-h-[140px] resize-y rounded-md border border-hub-line bg-hub-raised p-3 text-[13.5px] leading-relaxed text-hub-text transition-colors placeholder:text-hub-muted focus:border-hub-composer-hover focus:outline-none focus:ring-0 disabled:opacity-60",
    textareaPlaceholder: "Speak naturally — I'll reply when you pause…",
    footer:
      "shrink-0 space-y-2 border-t border-hub-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
    againBtn:
      "flex-1 cursor-pointer rounded-md border border-hub-line bg-hub-surface py-2.5 text-[13px] font-medium text-hub-text transition-colors hover:bg-hub-raised disabled:opacity-40",
    againFont: undefined,
    sendBtn:
      "flex-1 cursor-pointer rounded-md bg-[var(--primary)] py-2.5 text-[13px] font-medium text-[var(--primary-foreground)] transition-[filter] hover:brightness-110 disabled:pointer-events-none disabled:opacity-40",
    sendFont: undefined,
    endBtn:
      "w-full cursor-pointer rounded-md border border-hub-line bg-transparent py-2 text-[12.5px] font-medium text-hub-muted transition-colors hover:border-[var(--hub-danger)]/50 hover:text-[var(--hub-danger)]",
    endFont: undefined,
  },
} as const;

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
  /**
   * Which product surface is hosting this. "hub" adopts the AI Hub's visual
   * language; "tutor" (default) keeps the original dark console so the tutor
   * and career pages are unaffected.
   */
  variant?: "tutor" | "hub";
  /** While assistant is thinking / calling the LLM. */
  thinking?: boolean;
  /** Interrupt TTS and start listening. */
  onBargeIn?: () => void;
}

/** Inline font declaration, or undefined for the hub skin (inherits Inter). */
function fontStyle(family?: string): React.CSSProperties | undefined {
  return family ? { fontFamily: family } : undefined;
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
  variant = "tutor",
  thinking = false,
  onBargeIn,
}: VoiceHUDProps) {
  const [editingText, setEditingText] = useState("");
  const [mounted, setMounted] = useState(false);
  /**
   * Portals normally target <body>, but the hub skin relies on the `--hub-*`
   * tokens, which are scoped to the `.aihub` subtree. Rendering into <body>
   * put this markup outside that scope, so every token resolved to nothing —
   * the panel came out transparent and picked up the app's font instead of
   * Inter. Portal into the hub root when we're on that surface.
   */
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const isConversation = mode === "conversation";
  const isHub = variant === "hub";
  const s = CONVERSATION_STYLES[isHub ? "hub" : "tutor"];

  useEffect(() => {
    setPortalHost(
      (isHub ? document.querySelector<HTMLElement>(".aihub") : null) ?? document.body
    );
    setMounted(true);
  }, [isHub]);

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
    ? isHub
      ? "Thinking…"
      : "Tutor is thinking…"
    : status === "listening"
      ? isConversation
        ? "Listening — pause to send, or tap mic"
        : "Recording — tap mic to stop"
      : status === "processing"
        ? "Processing…"
        : status === "speaking"
          ? isConversation
            ? isHub
              ? "Speaking — tap to interrupt"
              : "Tutor speaking — tap to interrupt"
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


  // ── Conversation mode: assistant session (skin per `variant`) ─────
  if (isConversation) {
    const panel = (
      <div
        className="fixed inset-0 z-[1000] flex items-end justify-center p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Voice assistant"
      >
        <div
          className={`absolute inset-0 backdrop-blur-[2px] ${
            isHub ? "bg-black/30" : "bg-black/75"
          }`}
          onClick={onCancel}
        />

        <div className={s.panel}>
          <div className={s.header}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="relative flex size-2.5 shrink-0 items-center justify-center">
                  <span
                    className={`size-2.5 rounded-full ${
                      status === "listening"
                        ? "animate-pulse bg-red-500"
                        : thinking || status === "speaking"
                          ? s.dotActive
                          : s.dotIdle
                    }`}
                  />
                </span>
                <span className={s.title} style={fontStyle(s.titleFont)}>
                  {isHub ? "Voice" : "Voice assistant"}
                </span>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className={s.closeBtn}
                title="Close"
                aria-label="Close voice assistant"
              >
                {isHub ? (
                  <X size={15} strokeWidth={1.75} aria-hidden />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">close</span>
                )}
              </button>
            </div>

            <div className={s.langRow}>
              {isHub ? (
                <Languages size={15} strokeWidth={1.75} className={s.langIcon} aria-hidden />
              ) : (
                <span className={`material-symbols-outlined text-[18px] ${s.langIcon}`}>
                  translate
                </span>
              )}
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
                className={s.select}
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code} className={s.option}>
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
                  className={`relative flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white ${
                    isHub ? "size-12" : "h-14 w-14 border border-red-400/50 shadow-[0_0_16px_rgba(239,68,68,0.35)]"
                  }`}
                  title="Stop and send"
                >
                  <span className="absolute inset-0 animate-ping rounded-full border border-red-400 opacity-30" />
                  {isHub ? (
                    <Mic size={20} strokeWidth={1.75} className="relative" aria-hidden />
                  ) : (
                    <span className="material-symbols-outlined relative text-[26px]">mic</span>
                  )}
                </button>
              ) : thinking || status === "processing" ? (
                <div className={s.busyRing}>
                  <div className={s.busySpinner} />
                </div>
              ) : status === "speaking" ? (
                <button
                  type="button"
                  onClick={onBargeIn}
                  disabled={!onBargeIn}
                  className={s.speakBtn}
                  title={onBargeIn ? "Interrupt and speak" : undefined}
                >
                  <div className="pointer-events-none flex h-6 items-end gap-0.5">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={s.waveBar}
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
                <div
                  className={`flex shrink-0 items-center justify-center rounded-full border border-[var(--hub-danger)]/40 text-[var(--hub-danger)] ${
                    isHub ? "size-12" : "h-14 w-14"
                  }`}
                >
                  {isHub ? (
                    <AlertCircle size={20} strokeWidth={1.75} aria-hidden />
                  ) : (
                    <span className="material-symbols-outlined text-[26px]">error</span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onStartRecord}
                  disabled={micBusy}
                  className={s.micBtn}
                  aria-label="Start recording"
                >
                  {isHub ? (
                    <Mic size={20} strokeWidth={1.75} aria-hidden />
                  ) : (
                    <span className="material-symbols-outlined text-[26px]">mic</span>
                  )}
                </button>
              )}
              <p className={s.statusText} style={fontStyle(s.statusFont)}>
                {statusLabel}
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label
                  className={s.fieldLabel}
                  style={fontStyle(s.fieldLabelFont)}
                >
                  You said
                </label>
                <span className={s.fieldHint} style={fontStyle(s.fieldHintFont)}>
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
                className={s.textarea}
                placeholder={s.textareaPlaceholder}
              />
            </div>
          </div>

          <div className={s.footer}>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onStartRecord}
                disabled={micBusy || status === "listening" || thinking}
                className={s.againBtn}
                style={fontStyle(s.againFont)}
              >
                Speak again
              </button>
              <button
                type="button"
                onClick={() => onSubmit(editingText)}
                disabled={!canSubmit}
                className={s.sendBtn}
                style={fontStyle(s.sendFont)}
              >
                {isHub ? "Send" : "Send now"}
              </button>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className={s.endBtn}
              style={fontStyle(s.endFont)}
            >
              {isHub ? "End voice session" : "End session"}
            </button>
          </div>
        </div>
      </div>
    );

    if (!mounted) return null;
    return createPortal(panel, portalHost ?? document.body);
  }


  // ── Single-turn interview mode (assessment): neo-brutalist ────────
  const panel = (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Voice interview"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-xs"
        onClick={onCancel}
      />

      <div className="relative z-[1001] flex w-full max-w-lg flex-col max-h-[min(92dvh,92vh)] sm:max-h-[min(85dvh,560px)] bg-card border-4 border-black shadow-[8px_8px_0_0_#000] animate-scale-in text-card-foreground rounded-t-2xl sm:rounded-none">
        <div className="shrink-0 border-b-2 border-black px-4 pt-4 pb-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full border border-black ${
                  status === "listening" ? "bg-red-500 animate-pulse" : "bg-green-500"
                }`}
              />
              <span className="font-mono text-xs uppercase tracking-widest font-extrabold truncate text-foreground">
                Voice interview
              </span>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="h-9 w-9 shrink-0 border-2 border-black bg-white hover:bg-red-500 hover:text-white flex items-center justify-center shadow-[2px_2px_0_0_#000] cursor-pointer text-black"
              title="Close"
            >
              <span className="material-symbols-outlined text-[18px] font-bold">close</span>
            </button>
          </div>

          <div className="flex items-center gap-2 bg-background border-2 border-black px-3 py-2">
            <span className="material-symbols-outlined text-[18px] shrink-0 text-foreground">
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
              className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-foreground border-0 outline-none p-0 cursor-pointer focus:ring-0 disabled:opacity-50"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="bg-card text-foreground">
                  {l.nativeName === l.name ? l.name : `${l.nativeName} (${l.name})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            {status === "listening" ? (
              <button
                type="button"
                onClick={onStopRecord}
                className="relative h-14 w-14 shrink-0 bg-red-500 border-2 border-black text-white rounded-full flex items-center justify-center shadow-[3px_3px_0_0_#000] cursor-pointer"
                title="Stop and send"
              >
                <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-40" />
                <span className="material-symbols-outlined text-[26px] relative">mic</span>
              </button>
            ) : thinking || status === "processing" ? (
              <div className="h-14 w-14 shrink-0 border-2 border-black rounded-full flex items-center justify-center bg-background">
                <div className="animate-spin h-8 w-8 border-[3px] border-black border-t-primary rounded-full" />
              </div>
            ) : status === "speaking" ? (
              <button
                type="button"
                onClick={onBargeIn}
                disabled={!onBargeIn}
                className="h-14 w-14 shrink-0 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0_0_#000] cursor-pointer disabled:cursor-default"
                title={onBargeIn ? "Interrupt and speak" : undefined}
              >
                <div className="flex items-end gap-0.5 h-6 pointer-events-none">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="w-1 bg-black rounded-full animate-bounce"
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
              <div className="h-14 w-14 shrink-0 bg-red-100 text-red-600 border-2 border-black rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">error</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onStartRecord}
                disabled={micBusy}
                className="h-14 w-14 shrink-0 bg-primary text-primary-foreground border-2 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[26px]">mic</span>
              </button>
            )}
            <p className="text-left text-xs font-mono font-bold uppercase tracking-wide text-foreground leading-snug">
              {statusLabel}
            </p>
          </div>

          {suggestions && suggestions.length > 0 && (
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono text-foreground uppercase tracking-widest font-extrabold">
                Suggested
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-[64px] overflow-y-auto p-2 border-2 border-black bg-background">
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
                    className="px-2 py-1 border border-black bg-white hover:bg-primary hover:text-primary-foreground font-mono text-[10px] font-bold shadow-[1px_1px_0_0_#000] cursor-pointer text-black"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono text-foreground uppercase tracking-widest font-extrabold">
                Your answer
              </label>
              <span className="text-[9px] font-mono text-muted-foreground uppercase">
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
              className="w-full bg-background border-2 border-black p-3 text-sm text-foreground placeholder:text-muted-foreground min-h-[80px] max-h-[140px] focus:outline-none resize-y leading-relaxed disabled:opacity-60"
              placeholder="Speak or type your answer here…"
            />
          </div>
        </div>

        <div className="shrink-0 border-t-2 border-black bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onStartRecord}
              disabled={micBusy || status === "listening" || thinking}
              className="flex-1 py-3 bg-white border-2 border-black hover:bg-neutral-100 text-black font-mono text-xs font-bold tracking-wider shadow-[2px_2px_0_0_#000] hover:shadow-none disabled:opacity-40 cursor-pointer"
            >
              Re-record
            </button>
            <button
              type="button"
              onClick={() => onSubmit(editingText)}
              disabled={!canSubmit}
              className="flex-1 py-3 bg-primary border-2 border-black text-primary-foreground font-extrabold font-mono text-xs tracking-wider shadow-[2px_2px_0_0_#000] hover:shadow-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              Submit answer
            </button>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 bg-white border-2 border-black hover:bg-red-500 hover:text-white text-black font-mono text-[11px] tracking-widest font-extrabold uppercase cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(panel, portalHost ?? document.body);
}
