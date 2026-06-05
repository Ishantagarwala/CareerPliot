"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

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

  const formatSummary = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    const formatBold = (str: string) => {
      const parts = str.split(/\*\*(.*?)\*\*/g);
      return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-bold text-white">{part}</strong> : part));
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("### ")) {
        elements.push(
          <h4
            key={index}
            className="text-base font-bold mt-5 mb-2 text-white flex items-center gap-1.5 border-b border-[#262626] pb-1"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            {formatBold(trimmed.substring(4))}
          </h4>
        );
      } else if (trimmed.startsWith("## ")) {
        elements.push(
          <h3
            key={index}
            className="text-lg font-bold mt-6 mb-3 text-white flex items-center gap-2"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            {formatBold(trimmed.substring(3))}
          </h3>
        );
      } else if (trimmed.startsWith("# ")) {
        elements.push(
          <h2
            key={index}
            className="text-xl font-bold mt-8 mb-4 text-white"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            {formatBold(trimmed.substring(2))}
          </h2>
        );
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        elements.push(
          <li key={index} className="text-sm text-[#c4c7c8] ml-4 pl-1 list-disc mb-1.5 leading-relaxed">
            {formatBold(trimmed.substring(2))}
          </li>
        );
      } else if (trimmed === "") {
        // skip
      } else {
        elements.push(
          <p key={index} className="text-sm text-[#c4c7c8] leading-relaxed mb-3">
            {formatBold(trimmed)}
          </p>
        );
      }
    });

    return <div className="space-y-1">{elements}</div>;
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#262626]">
      <div className="flex items-center justify-between p-4 border-b border-[#262626]">
        <div>
          <h3
            className="font-bold text-base text-white flex items-center gap-2"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            Study Summary
          </h3>
          <p
            className="truncate max-w-[280px] sm:max-w-md mt-1 text-[10px] text-[#636565]"
            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
          >
            Generated from {filename}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="h-9 px-3 border border-[#262626] text-[#c4c7c8] hover:border-white hover:text-white transition-colors text-xs flex items-center gap-1.5"
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="p-6">
        {formatSummary(summary)}
      </div>
    </div>
  );
}
