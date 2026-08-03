"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import MarkdownContent from "@/components/markdown/MarkdownContent";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  attachments?: {
    type: "pdf" | "image";
    filename: string;
    fileUrl: string;
    docId?: string;
  }[];
  sentAt?: Date | string;
  streaming?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copiedText, setCopiedText] = useState(false);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedText(true);
      toast.success("Message copied!");
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      toast.error("Failed to copy message");
    }
  };

  const timeString = message.sentAt
    ? new Date(message.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-3 group`}>
      <div
        className={`flex items-start gap-2.5 min-w-0 ${
          isUser
            ? "flex-row-reverse max-w-[min(100%,56rem)]"
            : "flex-row w-full max-w-none"
        }`}
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 border-black ${
            isUser ? "bg-accent text-accent-foreground" : "bg-card text-foreground"
          }`}
        >
          {isUser ? (
            <span className="material-symbols-outlined text-[16px]">person</span>
          ) : (
            <span
              className="text-xs font-bold text-primary"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              AI
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col space-y-1">
          <div
            className={`relative w-full border-2 border-black p-4 pb-10 transition-all ${
              isUser ? "bg-accent text-accent-foreground" : "bg-card text-foreground"
            }`}
          >
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {message.attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 border border-[#262626] bg-[#0A0A0A] p-1.5 text-xs text-white"
                  >
                    {att.type === "image" ? (
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:opacity-85"
                      >
                        <img
                          src={att.fileUrl}
                          alt={att.filename}
                          className="h-16 max-w-[120px] border border-[#262626] object-contain"
                        />
                      </a>
                    ) : (
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-white hover:underline"
                      >
                        <span className="material-symbols-outlined text-[18px] text-red-500">
                          description
                        </span>
                        <span className="max-w-[150px] truncate font-mono text-[10px]">
                          {att.filename}
                        </span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Plain text while streaming avoids KaTeX/markdown flicker on incomplete fences */}
            {message.streaming && !isUser ? (
              <div className="break-words select-text whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
                <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-primary align-middle" />
              </div>
            ) : (
              <MarkdownContent
                content={message.content}
                variant={isUser ? "chat-user" : "chat-assistant"}
              />
            )}

            <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex h-6 w-6 items-center justify-center border border-[#262626] bg-[#0A0A0A]/80 text-[#8e9192] transition-colors hover:text-white"
              >
                {copiedText ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {timeString && (
            <span
              className={`px-1 text-[9px] text-[#636565] ${isUser ? "text-right" : "text-left"}`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {timeString}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
