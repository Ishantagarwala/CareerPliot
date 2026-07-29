"use client";

import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";
import { Copy, Check, Terminal } from "lucide-react";
import { toast } from "sonner";
import "katex/dist/katex.min.css";

export type MarkdownVariant = "chat-assistant" | "chat-user" | "summary";

interface MarkdownContentProps {
  content: string;
  variant?: MarkdownVariant;
  className?: string;
}

function CodeBlock({
  code,
  language,
  variant,
}: {
  code: string;
  language: string;
  variant: MarkdownVariant;
}) {
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

  const isSummary = variant === "summary";

  return (
    <div
      className={`my-4 overflow-hidden border ${
        isSummary ? "border-[#262626] bg-[#0A0A0A]" : "border-[#262626] bg-[#0A0A0A]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[#262626] bg-[#131313] px-4 py-2">
        <span
          className="flex items-center gap-1.5 capitalize text-[#8e9192]"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.05em" }}
        >
          <Terminal className="h-3.5 w-3.5 text-white" />
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-1 text-[#8e9192] transition-colors hover:text-white"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.05em" }}
        >
          {copied ? <Check className="h-3 w-3 text-white" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="overflow-x-auto bg-[#0A0A0A] p-4 text-xs leading-relaxed text-[#c4c7c8]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function variantStyles(variant: MarkdownVariant) {
  const isUser = variant === "chat-user";
  const isSummary = variant === "summary";

  return {
    body: isUser ? "text-inherit" : isSummary ? "text-[#c4c7c8]" : "text-foreground",
    strong: isUser ? "font-bold text-inherit" : isSummary ? "font-bold text-white" : "font-bold text-foreground",
    muted: isUser ? "text-inherit opacity-80" : isSummary ? "text-[#8e9192]" : "text-muted-foreground",
    inlineCode: isUser
      ? "mx-0.5 border border-black bg-black/10 px-1.5 py-0.5 text-[12px] text-inherit"
      : isSummary
        ? "mx-0.5 border border-[#262626] bg-[#0A0A0A] px-1.5 py-0.5 text-[12px] text-white"
        : "mx-0.5 border border-black bg-background px-1.5 py-0.5 text-[12px] text-foreground",
    link: isUser
      ? "underline underline-offset-2 text-inherit"
      : isSummary
        ? "text-white underline underline-offset-2"
        : "text-primary underline underline-offset-2",
    hr: isUser ? "my-4 border-t border-black/30" : isSummary ? "my-4 border-t border-[#262626]" : "my-4 border-t border-border",
    blockquote: isUser
      ? "my-2 border-l-2 border-black/40 pl-4 italic text-inherit opacity-80"
      : isSummary
        ? "my-2 border-l-2 border-[#404040] pl-4 italic text-[#8e9192]"
        : "my-2 border-l-2 border-border pl-4 italic text-muted-foreground",
    tableWrap: "my-4 overflow-x-auto",
    table: isSummary
      ? "w-full border-collapse text-sm text-[#c4c7c8]"
      : "w-full border-collapse text-sm",
    th: isSummary
      ? "border border-[#262626] bg-[#131313] px-3 py-2 text-left font-bold text-white"
      : "border border-border bg-muted px-3 py-2 text-left font-bold",
    td: isSummary
      ? "border border-[#262626] px-3 py-2 align-top"
      : "border border-border px-3 py-2 align-top",
  };
}

function buildComponents(variant: MarkdownVariant): Components {
  const styles = variantStyles(variant);
  const isSummary = variant === "summary";

  return {
    h1: ({ children }) => (
      <h1
        className={`mb-4 mt-6 text-xl font-bold ${styles.body}`}
        style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        className={`mb-3.5 mt-5 text-lg font-bold ${styles.body}`}
        style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        className={`mb-2 mt-4 text-base font-bold ${styles.body}`}
        style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4
        className={`mb-2 mt-5 border-b pb-1 text-base font-bold ${isSummary ? "border-[#262626] text-white" : styles.body}`}
        style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
      >
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className={`mb-2.5 text-sm leading-relaxed ${styles.body}`}>{children}</p>
    ),
    strong: ({ children }) => <strong className={styles.strong}>{children}</strong>,
    em: ({ children }) => <em className={`italic ${styles.muted}`}>{children}</em>,
    ul: ({ children }) => (
      <ul className={`mb-3 ml-5 list-disc space-y-1.5 text-sm ${styles.body}`}>{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className={`mb-3 ml-5 list-decimal space-y-1.5 text-sm ${styles.body}`}>{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className={styles.blockquote}>{children}</blockquote>
    ),
    hr: () => <hr className={styles.hr} />,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>
        {children}
      </a>
    ),
    code: ({ className, children }) => {
      const match = /language-(\w+)/.exec(className || "");
      const code = String(children).replace(/\n$/, "");
      if (match || code.includes("\n")) {
        return <CodeBlock code={code.trim()} language={match?.[1] || ""} variant={variant} />;
      }
      return (
        <code className={styles.inlineCode} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {children}
        </code>
      );
    },
    pre: ({ children }) => <>{children}</>,
    table: ({ children }) => (
      <div className={styles.tableWrap}>
        <table className={styles.table}>{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead>{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr>{children}</tr>,
    th: ({ children }) => <th className={styles.th}>{children}</th>,
    td: ({ children }) => <td className={styles.td}>{children}</td>,
  };
}

export default function MarkdownContent({
  content,
  variant = "chat-assistant",
  className = "",
}: MarkdownContentProps) {
  const components = useMemo(() => buildComponents(variant), [variant]);

  return (
    <div className={`break-words select-text ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
