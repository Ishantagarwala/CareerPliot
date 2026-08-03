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
}: VoiceHUDProps) {
  const [editingText, setEditingText] = useState("");
  const [mounted, setMounted] = useState(false);

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

  const statusLabel =
    status === "listening"
      ? "Recording — tap mic to stop"
      : status === "processing"
        ? "Processing…"
        : status === "speaking"
          ? "Playing question…"
          : status === "error"
            ? "Something went wrong — try again"
            : "Tap mic to answer";

  const micBusy = status === "processing" || status === "speaking";

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

      {/* Viewport-fit panel — portaled to body so parent overflow/transform cannot clip it */}
      <div className="relative z-[1001] flex w-full max-w-lg flex-col max-h-[min(92dvh,92vh)] sm:max-h-[min(85dvh,560px)] bg-card border-4 border-black shadow-[8px_8px_0_0_#000] animate-scale-in text-card-foreground rounded-t-2xl sm:rounded-none">
        {/* Header */}
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
              className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-foreground border-0 outline-none p-0 cursor-pointer focus:ring-0"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="bg-card text-foreground">
                  {l.nativeName === l.name ? l.name : `${l.nativeName} (${l.name})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            {status === "listening" ? (
              <button
                type="button"
                onClick={onStopRecord}
                className="relative h-14 w-14 shrink-0 bg-red-500 border-2 border-black text-white rounded-full flex items-center justify-center shadow-[3px_3px_0_0_#000] cursor-pointer"
              >
                <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-40" />
                <span className="material-symbols-outlined text-[26px] relative">mic</span>
              </button>
            ) : status === "processing" ? (
              <div className="h-14 w-14 shrink-0 border-2 border-black rounded-full flex items-center justify-center bg-background">
                <div className="animate-spin h-8 w-8 border-[3px] border-black border-t-primary rounded-full" />
              </div>
            ) : status === "speaking" ? (
              <div className="h-14 w-14 shrink-0 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0_0_#000]">
                <div className="flex items-end gap-0.5 h-6">
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
              </div>
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
              className="w-full bg-background border-2 border-black p-3 text-sm text-foreground placeholder:text-muted-foreground min-h-[80px] max-h-[140px] focus:outline-none resize-y leading-relaxed"
              placeholder="Speak or type your answer here…"
            />
          </div>
        </div>

        {/* Sticky footer — always on screen */}
        <div className="shrink-0 border-t-2 border-black bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onStartRecord}
              disabled={micBusy || status === "listening"}
              className="flex-1 py-3 bg-white border-2 border-black hover:bg-neutral-100 text-black font-mono text-xs font-bold tracking-wider shadow-[2px_2px_0_0_#000] hover:shadow-none disabled:opacity-40 cursor-pointer"
            >
              Re-record
            </button>
            <button
              type="button"
              onClick={() => onSubmit(editingText)}
              disabled={!editingText.trim() || micBusy}
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
  return createPortal(panel, document.body);
}
