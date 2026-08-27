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
}: {
  code: string;
  language: string;
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

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border bg-secondary text-secondary-foreground">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium capitalize text-secondary-foreground/70">
          <Terminal className="h-3.5 w-3.5 text-secondary-foreground" />
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-1 text-[11px] font-medium text-secondary-foreground/70 transition-colors hover:text-secondary-foreground"
        >
          {copied ? <Check className="h-3 w-3 text-secondary-foreground" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function variantStyles(variant: MarkdownVariant) {
  const isUser = variant === "chat-user";

  return {
    body: isUser ? "text-inherit" : "text-foreground",
    strong: isUser ? "font-bold text-inherit" : "font-bold text-foreground",
    muted: isUser ? "text-inherit opacity-80" : "text-muted-foreground",
    inlineCode: isUser
      ? "mx-0.5 rounded border border-border bg-black/10 px-1.5 py-0.5 text-[12px] text-inherit"
      : "mx-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[12px] text-foreground",
    link: isUser
      ? "underline underline-offset-2 text-inherit"
      : "text-primary underline underline-offset-2",
    hr: isUser ? "my-4 border-t border-accent-foreground/20" : "my-4 border-t border-border",
    blockquote: isUser
      ? "my-2 border-l-2 border-accent-foreground/30 pl-4 italic text-inherit opacity-80"
      : "my-2 border-l-2 border-border pl-4 italic text-muted-foreground",
    tableWrap: "my-4 overflow-x-auto",
    table: "w-full border-collapse text-sm",
    th: "border border-border bg-muted px-3 py-2 text-left font-bold text-foreground",
    td: "border border-border px-3 py-2 align-top",
  };
}

function buildComponents(variant: MarkdownVariant): Components {
  const styles = variantStyles(variant);

  return {
    h1: ({ children }) => (
      <h1 className={`mb-4 mt-6 text-xl font-bold ${styles.body}`}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className={`mb-3.5 mt-5 text-lg font-bold ${styles.body}`}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className={`mb-2 mt-4 text-base font-bold ${styles.body}`}>
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className={`mb-2 mt-5 border-b border-border pb-1 text-base font-bold ${styles.body}`}>
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
        return <CodeBlock code={code.trim()} language={match?.[1] || ""} />;
      }
      return (
        <code className={styles.inlineCode}>
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
