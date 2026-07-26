"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: {
    type: "pdf" | "image";
    filename: string;
    fileUrl: string;
    docId?: string;
  }[];
  sentAt?: Date | string;
}

interface MessageBubbleProps {
  message: Message;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div className="my-4 border border-[#262626] bg-[#0A0A0A] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#262626] bg-[#131313]">
        <span
          className="flex items-center gap-1.5 capitalize text-[#8e9192]"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.05em" }}
        >
          <Terminal className="h-3.5 w-3.5 text-white" />
          {language || "code"}
        </span>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1 text-[#8e9192] hover:text-white transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.05em" }}
        >
          {copied ? <Check className="h-3 w-3 text-white" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {/* Code Area */}
      <pre className="p-4 overflow-x-auto text-xs text-[#c4c7c8] leading-relaxed bg-[#0A0A0A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
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

  // Inherit bubble color for user (black on cyan); use light tokens for assistant.
  const bodyText = isUser ? "text-inherit" : "text-foreground";
  const strongText = isUser ? "text-inherit font-bold" : "font-bold text-foreground";
  const mutedText = isUser ? "text-inherit opacity-80" : "text-muted-foreground";

  const formatInlineText = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className={`px-1.5 py-0.5 text-[12px] border mx-0.5 border-black ${
              isUser ? "bg-black/10 text-inherit" : "bg-background text-foreground"
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className={strongText}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={index} className={`italic ${mutedText}`}>
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  const formatContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```")) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : "";
        const code = match ? match[2] : part.slice(3, -3);

        return (
          <CodeBlock key={index} code={code.trim()} language={language} />
        );
      }

      const lines = part.split("\n");
      const elements: React.ReactNode[] = [];

      lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();

        // Headers
        const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const headerText = headerMatch[2];

          let sizeClass = "text-sm font-bold mt-3 mb-1.5";
          if (level === 1) sizeClass = "text-xl font-bold mt-6 mb-4";
          else if (level === 2) sizeClass = "text-lg font-bold mt-5 mb-3.5";
          else if (level === 3) sizeClass = "text-base font-bold mt-4 mb-2";

          elements.push(
            <div
              key={lineIdx}
              className={`${sizeClass} ${bodyText}`}
              style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
            >
              {formatInlineText(headerText)}
            </div>
          );
          return;
        }

        // Horizontal Rule
        if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
          elements.push(
            <hr key={lineIdx} className={`my-4 border-t ${isUser ? "border-black/30" : "border-border"}`} />
          );
          return;
        }

        // Blockquotes
        if (trimmed.startsWith("> ")) {
          elements.push(
            <blockquote
              key={lineIdx}
              className={`pl-4 border-l-2 my-2 italic ${isUser ? "border-black/40" : "border-border"} ${mutedText}`}
            >
              {formatInlineText(trimmed.substring(2))}
            </blockquote>
          );
          return;
        }

        // Unordered list
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          elements.push(
            <li key={lineIdx} className={`text-sm list-disc ml-5 mb-1.5 leading-relaxed ${bodyText}`}>
              {formatInlineText(trimmed.substring(2))}
            </li>
          );
          return;
        }

        // Ordered list
        const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (orderedMatch) {
          elements.push(
            <li key={lineIdx} className={`text-sm list-decimal ml-5 mb-1.5 leading-relaxed ${bodyText}`} style={{ listStyleType: "decimal" }}>
              {formatInlineText(orderedMatch[2])}
            </li>
          );
          return;
        }

        // Empty
        if (trimmed === "") {
          elements.push(<div key={lineIdx} className="h-2" />);
          return;
        }

        // Paragraph
        elements.push(
          <p key={lineIdx} className={`text-sm leading-relaxed mb-2.5 ${bodyText}`}>
            {formatInlineText(line)}
          </p>
        );
      });

      return elements;
    });
  };

  const timeString = message.sentAt
    ? new Date(message.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-3 group`}>
      <div
        className={`flex items-start gap-2.5 min-w-0 ${
          isUser
            ? "flex-row-reverse max-w-[min(100%,42rem)]"
            : "flex-row w-full max-w-none"
        }`}
      >
        {/* Avatar */}
        <div className={`h-8 w-8 flex items-center justify-center shrink-0 border-2 border-black ${
          isUser
            ? "bg-accent text-accent-foreground"
            : "bg-card text-foreground"
        }`}>
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

        {/* Bubble */}
        <div className="flex flex-col space-y-1 min-w-0 flex-1">
          <div
            className={`relative p-4 border-2 border-black transition-all w-full ${
              isUser
                ? "bg-accent text-accent-foreground"
                : "bg-card text-foreground"
            }`}
          >
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {message.attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-[#0A0A0A] border border-[#262626] p-1.5 text-xs text-white"
                  >
                    {att.type === "image" ? (
                      <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="block hover:opacity-85">
                        <img
                          src={att.fileUrl}
                          alt={att.filename}
                          className="h-16 max-w-[120px] object-contain border border-[#262626]"
                        />
                      </a>
                    ) : (
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:underline text-white"
                      >
                        <span className="material-symbols-outlined text-red-500 text-[18px]">description</span>
                        <span className="truncate max-w-[150px] font-mono text-[10px]">{att.filename}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="break-words select-text">
              {formatContent(message.content)}
            </div>

            {/* Copy button (hover) */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopyMessage}
                className="h-6 w-6 flex items-center justify-center bg-[#0A0A0A]/80 border border-[#262626] text-[#8e9192] hover:text-white transition-colors"
              >
                {copiedText ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Timestamp */}
          {timeString && (
            <span
              className={`text-[9px] text-[#636565] px-1 ${isUser ? "text-right" : "text-left"}`}
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
