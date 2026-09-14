"use client";

import React from "react";
import {
  ArrowUp,
  AudioLines,
  Mic,
  Paperclip,
  Square,
  X,
} from "lucide-react";
import { MAX_ATTACHMENTS, MAX_MESSAGE_CHARS, type ChatAttachment } from "./types";

interface HubComposerProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  /** Ref for the textarea so callers can focus it (e.g. draft prompts). */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelectClick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: ChatAttachment[];
  onRemoveAttachment: (index: number) => void;
  uploadingAttachment: boolean;
  loading: boolean;
  onStop: () => void;
  onStartVoice: () => void;
  placeholder: string;
  /** "hero" sits in the empty state, "docked" sits under a conversation. */
  variant?: "hero" | "docked";
}

/**
 * The hub's single composer, used in both the empty state and a live
 * conversation so there is exactly one input implementation to maintain.
 * Visual language: white card, 22px radius, soft ambient glow, gradient
 * send button.
 */
export default function HubComposer({
  input,
  onInputChange,
  onSubmit,
  textareaRef,
  fileInputRef,
  onFileSelectClick,
  onFileChange,
  attachments,
  onRemoveAttachment,
  uploadingAttachment,
  loading,
  onStop,
  onStartVoice,
  placeholder,
  variant = "hero",
}: HubComposerProps) {
  const isHero = variant === "hero";

  /** Grow the textarea with its content, up to the CSS max-height. */
  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    autoGrow(e.target);
  };

  const canSend = Boolean(input.trim()) || attachments.length > 0;

  return (
    <div className="relative w-full">
      {isHero && <div className="composer-ambient" aria-hidden />}

      <div
        className={`composer-shell relative z-10 border bg-hub-surface transition-[border-color,box-shadow] duration-200 ${
          isHero
            ? "border-hub-line shadow-[var(--shadow-composer)] focus-within:border-hub-composer-hover focus-within:shadow-[var(--shadow-composer-focus)]"
            : "border-hub-composer-line shadow-[var(--shadow-composer)] focus-within:border-hub-composer-hover focus-within:shadow-[var(--shadow-composer-focus)]"
        }`}
      >
        {/* Attachment chips */}
        {(attachments.length > 0 || uploadingAttachment) && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3 sm:px-5">
            {attachments.map((att, idx) => (
              <div
                key={att.fileUrl}
                className="flex items-center gap-1.5 rounded-md border border-hub-line bg-hub-raised py-1 pr-1.5 pl-1.5 text-[11.5px] text-hub-text"
              >
                {att.type === "image" ? (
                  // Auth-gated upload URLs must be fetched with the session
                  // cookie, not through Next's image proxy.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.fileUrl}
                    alt={att.filename}
                    loading="lazy"
                    className="size-5 rounded-sm object-cover"
                  />
                ) : (
                  <span className="grid size-5 place-items-center rounded-sm bg-hub-soft text-[9px] font-semibold text-hub-muted uppercase">
                    pdf
                  </span>
                )}
                <span className="max-w-[130px] truncate">{att.filename}</span>
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(idx)}
                  className="cursor-pointer rounded-sm p-0.5 text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text"
                  aria-label={`Remove ${att.filename}`}
                >
                  <X size={11} aria-hidden />
                </button>
              </div>
            ))}
            {uploadingAttachment && (
              <div className="flex items-center gap-1.5 rounded-md border border-dashed border-hub-line bg-hub-raised px-2 py-1 text-[11.5px] text-hub-muted">
                <span className="size-3 animate-spin rounded-full border-[1.5px] border-hub-line border-t-[var(--primary)]" />
                Uploading…
              </div>
            )}
          </div>
        )}

        {/* Input row — the spark leads the text, inside the field */}
        <div className="flex gap-3 px-4 pt-4 pb-1.5 sm:px-5 sm:pt-5">
          <span className="mt-[3px] shrink-0 text-[var(--primary)]" aria-hidden>
            <Sparkle />
          </span>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder={placeholder}
            aria-label="Message Career Pilot AI"
            maxLength={MAX_MESSAGE_CHARS}
            rows={1}
            className="composer-textarea min-h-[64px] w-full flex-1 border-0 bg-transparent p-0 text-[14.5px] leading-[1.55] tracking-[-0.015em] text-hub-text placeholder:text-hub-muted focus:ring-0 focus:outline-none"
          />
        </div>

        {/* Action row — attach on the left, voice + send on the right */}
        <div className="flex items-center justify-between gap-2 px-2.5 pt-1 pb-2.5 sm:px-3 sm:pb-3">
          <div className="flex min-w-0 items-center gap-0.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileChange}
              accept="application/pdf,image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
            />

            <button
              type="button"
              onClick={onFileSelectClick}
              disabled={
                loading || uploadingAttachment || attachments.length >= MAX_ATTACHMENTS
              }
              className="flex size-8 cursor-pointer items-center justify-center rounded-full text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Attach a PDF or image"
              title="Attach a PDF or image"
            >
              <Paperclip size={15} strokeWidth={1.75} aria-hidden />
            </button>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onStartVoice}
              disabled={loading || uploadingAttachment}
              className="flex size-8 cursor-pointer items-center justify-center rounded-full text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text disabled:opacity-30"
              title="Speak instead"
              aria-label="Start voice input"
            >
              <Mic size={15} strokeWidth={1.75} aria-hidden />
            </button>

            {loading ? (
              <button
                type="button"
                onClick={onStop}
                className="ml-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-hub-strong text-hub-surface transition-transform hover:scale-105 active:scale-95"
                aria-label="Stop generating"
                title="Stop generating"
              >
                <Square size={12} fill="currentColor" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSend || uploadingAttachment}
                className="ml-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-send)] transition-all hover:brightness-110 hover:shadow-[var(--shadow-send-hover)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                aria-label="Send message"
              >
                <ArrowUp size={16} strokeWidth={2.25} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>

      {isHero && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-hub-muted">
          <AudioLines size={12} aria-hidden />
          Enter to send · Shift + Enter for a new line
        </p>
      )}
    </div>
  );
}

/** The small four-point spark used as the assistant mark. */
function Sparkle() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
      <path d="M9 9l6 6" />
      <path d="M15 9l-6 6" />
    </svg>
  );
}
