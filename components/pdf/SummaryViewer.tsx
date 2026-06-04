"use client";

import React, { useState } from "react";
import { Copy, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

  // Helper to parse basic markdown elements to HTML
  const formatSummary = (text: string) => {
    const lines = text.split("\n");
    let inList = false;
    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Bold formatter
      const formatBold = (str: string) => {
        const parts = str.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-bold text-foreground">{part}</strong> : part));
      };

      if (trimmed.startsWith("### ")) {
        if (inList) {
          inList = false;
        }
        elements.push(
          <h4 key={index} className="font-heading text-base font-bold mt-5 mb-2 text-foreground flex items-center gap-1.5 border-b border-border/50 pb-1">
            {formatBold(trimmed.substring(4))}
          </h4>
        );
      } else if (trimmed.startsWith("## ")) {
        if (inList) {
          inList = false;
        }
        elements.push(
          <h3 key={index} className="font-heading text-lg font-bold mt-6 mb-3 text-primary flex items-center gap-2">
            {formatBold(trimmed.substring(3))}
          </h3>
        );
      } else if (trimmed.startsWith("# ")) {
        if (inList) {
          inList = false;
        }
        elements.push(
          <h2 key={index} className="font-heading text-xl font-bold mt-8 mb-4 text-foreground">
            {formatBold(trimmed.substring(2))}
          </h2>
        );
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const itemText = trimmed.substring(2);
        elements.push(
          <li key={index} className="text-sm text-muted-foreground ml-4 pl-1 list-disc mb-1.5 leading-relaxed">
            {formatBold(itemText)}
          </li>
        );
      } else if (trimmed === "") {
        // Just empty space
      } else {
        if (inList) {
          inList = false;
        }
        elements.push(
          <p key={index} className="text-sm text-muted-foreground leading-relaxed mb-3">
            {formatBold(trimmed)}
          </p>
        );
      }
    });

    return <div className="space-y-1">{elements}</div>;
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/50">
        <div>
          <CardTitle className="font-heading text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Study Summary
          </CardTitle>
          <CardDescription className="truncate max-w-[280px] sm:max-w-md mt-1">
            Generated from {filename}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-9 font-semibold flex items-center gap-1.5"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {formatSummary(summary)}
        </div>
      </CardContent>
    </Card>
  );
}
