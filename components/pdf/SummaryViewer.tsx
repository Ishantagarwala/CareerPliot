"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import MarkdownContent from "@/components/markdown/MarkdownContent";

interface SummaryViewerProps {
  summary: string;
  filename: string;
}

export default function SummaryViewer({ summary, filename }: SummaryViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success("Summary copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
            <span className="material-symbols-outlined text-[18px]">description</span>
            Study Summary
          </h3>
          <p className="mt-1 max-w-[280px] truncate text-[11px] text-muted-foreground sm:max-w-md">
            Generated from {filename}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="p-6">
        <MarkdownContent content={summary} variant="summary" />
      </div>
    </div>
  );
}
