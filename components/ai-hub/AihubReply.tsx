"use client";

import React, { useState } from "react";
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import MarkdownContent from "@/components/markdown/MarkdownContent";
import type { ChatAttachment } from "./types";

interface AihubReplyProps {
  message: {
    role: "user" | "assistant" | "system";
    content: string;
    reasoning?: string;
    attachments?: ChatAttachment[];
    streaming?: boolean;
    error?: string;
  };
}

/**
 * Reference-style turn renderer:
 * - user rows: a soft tinted bubble, right-aligned
 * - assistant rows: plain flowing prose with a small accent mark, no box
 * - a blinking accent caret trails the assistant while it streams
 */
export default function AihubReply({ message }: AihubReplyProps) {
  if (message.role === "user") {
    return (
      <div className="flex w-full justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-1.5">
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentRow attachments={message.attachments} />
          )}
          <div className="rounded-2xl rounded-br-md bg-hub-soft px-3.5 py-2.5 text-[14.5px] leading-relaxed tracking-[-0.01em] whitespace-pre-wrap text-hub-text select-text">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-start gap-3">
      <span className="mt-[5px] flex size-4 shrink-0 items-center justify-center" aria-hidden>
        <AssistantMark />
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        {message.attachments && message.attachments.length > 0 && (
          <AttachmentRow attachments={message.attachments} />
        )}

        {/*
          Live thinking state for a turn that is still streaming. This row is
          the single owner of the indicator once it exists — see the matching
          guard in UnifiedChat.
        */}
        {message.streaming && !message.reasoning && !message.content && (
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-4 items-center justify-center" aria-hidden>
              <span className="ai-thinking-glow" />
              <AssistantMark />
            </span>
            <span className="ai-thinking-label text-[14px]">Thinking</span>
            <span className="ai-thinking-dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </div>
        )}

        {message.reasoning && (
          <ReasoningDisclosure
            reasoning={message.reasoning}
            answerStarted={Boolean(message.content)}
          />
        )}

        <div className="text-[15px] leading-[1.7] tracking-[-0.011em] break-words text-hub-text select-text">
          <MarkdownContent content={message.content} />
          {message.streaming && <span className="ai-reply-caret" aria-hidden />}
        </div>

        {/* Actions only once the reply has settled — nothing to copy mid-stream. */}
        {!message.streaming && message.content.trim() && (
          <ReplyActions content={message.content} />
        )}

        {message.error && (
          <div
            role="alert"
            className="rounded-lg border border-[var(--hub-danger)]/35 bg-[var(--hub-danger)]/10 px-3 py-2 text-[12.5px] text-[var(--hub-danger)]"
          >
            {message.error} You can try sending the message again.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Collapsible chain-of-thought, matching the reference's "Thought for a
 * moment" row. While the model is still reasoning it stays open, streams the
 * text, and shimmers; the moment answer tokens start it collapses to a single
 * muted line the reader can reopen.
 */
function ReasoningDisclosure({
  reasoning,
  answerStarted,
}: {
  reasoning: string;
  answerStarted: boolean;
}) {
  const [manuallyOpen, setManuallyOpen] = useState(false);
  const open = manuallyOpen || !answerStarted;

  return (
    <div className="text-[13px]">
      <button
        type="button"
        onClick={() => setManuallyOpen((v) => !v)}
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-1.5 text-hub-muted transition-colors hover:text-hub-text"
      >
        <ChevronRight
          size={13}
          strokeWidth={2}
          className={`shrink-0 transition-transform duration-150 ${
            open ? "rotate-90" : ""
          }`}
          aria-hidden
        />
        <span className={answerStarted ? undefined : "ai-thinking-label"}>
          {answerStarted ? "Thought for a moment" : "Thinking"}
        </span>
      </button>

      {open && (
        <div className="mt-1.5 ml-[5px] border-l border-hub-line pl-3 text-[13.5px] leading-[1.65] whitespace-pre-wrap text-hub-muted select-text">
          {reasoning}
          {!answerStarted && <span className="ai-reply-caret" aria-hidden />}
        </div>
      )}
    </div>
  );
}

/** Four-point spark in the accent color. */
function AssistantMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[var(--primary)]"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
      <path d="M9 9l6 6" />
      <path d="M15 9l-6 6" />
    </svg>
  );
}

function AttachmentRow({ attachments }: { attachments: ChatAttachment[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {attachments.map((att, idx) => (
        <div
          key={idx}
          className="flex items-center gap-1.5 rounded-md border border-hub-line bg-hub-raised py-1 pr-2 pl-1 text-[11.5px] text-hub-muted"
        >
          {att.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={att.fileUrl}
              alt={att.filename}
              loading="lazy"
              className="size-6 rounded-sm object-cover"
            />
          ) : (
            <span className="grid size-6 place-items-center rounded-sm bg-hub-soft text-hub-muted">
              <FileText size={12} aria-hidden />
            </span>
          )}
          <span className="max-w-[160px] truncate">{att.filename}</span>
          {att.type === "image" && (
            <ImageIcon size={11} className="shrink-0 opacity-60" aria-hidden />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Copy / download controls for a finished answer. "Download" saves the raw
 * Markdown, which stays useful outside the app (notes app, Obsidian, a repo).
 */
function ReplyActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Reply copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the reply");
    }
  };

  const handleDownload = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `career-pilot-answer-${stamp}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Saved as Markdown");
  };

  return (
    <div className="flex items-center gap-0.5 pt-0.5">
      <button
        type="button"
        onClick={handleCopy}
        className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text"
        aria-label="Copy this reply"
      >
        {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </button>
      <button
        type="button"
        onClick={handleDownload}
        className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text"
        aria-label="Download this reply as Markdown"
      >
        <Download size={12} aria-hidden />
        .md
      </button>
    </div>
  );
}
