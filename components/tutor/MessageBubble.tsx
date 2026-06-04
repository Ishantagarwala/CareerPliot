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
      return lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        const formatBold = (str: string) => {
          const boldParts = str.split(/\*\*(.*?)\*\*/g);
          return boldParts.map((bPart, bIdx) => {
            if (bIdx % 2 === 1) {
              return (
                <strong
                  key={bIdx}
                  className={`font-bold ${isUser ? "text-white" : "text-foreground"}`}
                >
                  {bPart}
                </strong>
              );
            }
            return bPart;
          });
        };

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <li
              key={lineIdx}
              className={`text-sm list-disc ml-5 mb-1.5 leading-relaxed ${
                isUser ? "text-white/90" : "text-muted-foreground"
              }`}
            >
              {formatBold(trimmed.substring(2))}
            </li>
          );
        }

        if (trimmed === "") {
          return <div key={lineIdx} className="h-2" />;
        }

        return (
          <p
            key={lineIdx}
            className={`text-sm leading-relaxed mb-2.5 ${
              isUser ? "text-white" : "text-muted-foreground"
            }`}
          >
            {formatBold(line)}
          </p>
        );
      });
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
