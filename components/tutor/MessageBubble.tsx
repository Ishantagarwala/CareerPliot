"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
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
    <div className="my-4 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-md">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 text-xs font-semibold text-zinc-400">
        <span className="flex items-center gap-1.5 capitalize">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          {language || "code"}
        </span>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1 hover:text-zinc-200 transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {/* Code Area */}
      <pre className="p-4 overflow-x-auto text-xs text-zinc-100 font-mono leading-relaxed bg-zinc-950">
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

  const formatInlineText = (text: string) => {
    // Regex to split by inline code, bold, or italic
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className={`px-1.5 py-0.5 rounded font-mono text-[12px] border mx-0.5 ${
              isUser
                ? "bg-white/20 border-white/10 text-white"
                : "bg-muted border-border text-foreground"
            }`}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong
            key={index}
            className={`font-bold ${isUser ? "text-white" : "text-foreground"}`}
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em
            key={index}
            className={`italic ${isUser ? "text-white/95" : "text-foreground"}`}
          >
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  const formatContent = (text: string) => {
    // Split by code blocks (```lang ... ```)
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

      // Normal text with newlines
      const lines = part.split("\n");
      const elements: React.ReactNode[] = [];

      lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();

        // 1. Headers (supports # to ######)
        const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const headerText = headerMatch[2];
          const Tag = `h${level}` as any;
          
          let sizeClass = "text-sm font-bold mt-3 mb-1.5";
          if (level === 1) sizeClass = "text-xl font-bold mt-6 mb-4";
          else if (level === 2) sizeClass = "text-lg font-bold mt-5 mb-3.5";
          else if (level === 3) sizeClass = "text-base font-bold mt-4 mb-2";
          else if (level === 4) sizeClass = "text-sm font-bold mt-3.5 mb-1.5";
          else if (level === 5) sizeClass = "text-xs font-bold mt-3 mb-1";
          else if (level === 6) sizeClass = "text-xs font-bold mt-2.5 mb-1 text-muted-foreground";

          elements.push(
            <Tag
              key={lineIdx}
              className={`font-heading ${sizeClass} ${
                isUser ? "text-white" : level === 2 ? "text-primary" : "text-foreground"
              }`}
            >
              {formatInlineText(headerText)}
            </Tag>
          );
          return;
        }

        // 2. Horizontal Rule
        if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
          elements.push(
            <hr
              key={lineIdx}
              className={`my-4 border-t ${
                isUser ? "border-white/20" : "border-border"
              }`}
            />
          );
          return;
        }

        // 3. Blockquotes
        if (trimmed.startsWith("> ")) {
          elements.push(
            <blockquote
              key={lineIdx}
              className={`pl-4 border-l-2 my-2 italic ${
                isUser ? "border-white/30 text-white/95" : "border-primary/50 text-muted-foreground"
              }`}
            >
              {formatInlineText(trimmed.substring(2))}
            </blockquote>
          );
          return;
        }

        // 4. Unordered List Item
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          elements.push(
            <li
              key={lineIdx}
              className={`text-sm list-disc ml-5 mb-1.5 leading-relaxed ${
                isUser ? "text-white/90" : "text-muted-foreground"
              }`}
            >
              {formatInlineText(trimmed.substring(2))}
            </li>
          );
          return;
        }

        // 5. Ordered List Item
        const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (orderedMatch) {
          const num = orderedMatch[1];
          const itemText = orderedMatch[2];
          elements.push(
            <li
              key={lineIdx}
              className={`text-sm list-decimal ml-5 mb-1.5 leading-relaxed ${
                isUser ? "text-white/90" : "text-muted-foreground"
              }`}
              style={{ listStyleType: "decimal" }}
            >
              {formatInlineText(itemText)}
            </li>
          );
          return;
        }

        // 6. Empty Line
        if (trimmed === "") {
          elements.push(<div key={lineIdx} className="h-2" />);
          return;
        }

        // 7. Plain Paragraph
        elements.push(
          <p
            key={lineIdx}
            className={`text-sm leading-relaxed mb-2.5 ${
              isUser ? "text-white" : "text-muted-foreground"
            }`}
          >
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
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-4 group`}>
      <div className={`flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
          isUser 
            ? "bg-primary border-primary/20 text-primary-foreground" 
            : "bg-muted border-border text-muted-foreground"
        }`}>
          {isUser ? <User className="h-4.5 w-4.5" /> : <span className="text-xs font-heading font-extrabold text-primary">AI</span>}
        </div>

        {/* Bubble */}
        <div className="flex flex-col space-y-1">
          <div
            className={`relative p-4 rounded-2xl shadow-sm border transition-all ${
              isUser
                ? "bg-primary border-primary/20 text-primary-foreground rounded-tr-none"
                : "bg-card border-border text-card-foreground rounded-tl-none"
            }`}
          >
            <div className="break-words select-text">
              {formatContent(message.content)}
            </div>
            
            {/* Quick Actions (only visible on bubble hover) */}
            <div className={`absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-background/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-border rounded-lg p-0.5 shadow-sm`}>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyMessage}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          
          {/* Timestamp */}
          {timeString && (
            <span className={`text-[9px] text-muted-foreground font-semibold px-1 ${isUser ? "text-right" : "text-left"}`}>
              {timeString}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
