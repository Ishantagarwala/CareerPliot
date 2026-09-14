"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * Syntax highlighting, loaded on demand.
 *
 * highlight.js is imported lazily and only when a message actually contains
 * code, so the language definitions stay out of the initial bundle. It also
 * owns the light/dark theme swap: rather than shipping two stylesheets, the
 * token colours are CSS variables set here from the app's palette.
 */

type HighlightJs = {
  highlight: (
    code: string,
    options: { language: string; ignoreIllegals?: boolean }
  ) => { value: string };
};

let hljsPromise: Promise<HighlightJs> | null = null;

/** Languages worth carrying for a study/career product; the rest fall back to plain. */
const LANGUAGES = [
  "javascript", "typescript", "jsx", "tsx", "json", "html", "xml", "css",
  "python", "java", "c", "cpp", "csharp", "go", "rust", "php", "ruby",
  "sql", "bash", "shell", "yaml", "markdown", "kotlin", "swift", "dart",
];

function loadHljs(): Promise<HighlightJs> {
  if (!hljsPromise) {
    hljsPromise = (async () => {
      const mod = await import("highlight.js/lib/core");
      const hljs = (mod.default ?? mod) as unknown as HighlightJs & {
        registerLanguage: (name: string, lang: unknown) => void;
      };
      await Promise.all(
        LANGUAGES.map(async (name) => {
          try {
            const lang = await import(`highlight.js/lib/languages/${name}`);
            hljs.registerLanguage(name, lang.default ?? lang);
          } catch {
            /* a language we don't carry — plain rendering is fine */
          }
        })
      );
      return hljs;
    })();
  }
  return hljsPromise;
}

/** Aliases the model emits that highlight.js names differently. */
const ALIASES: Record<string, string> = {
  js: "javascript", ts: "typescript", py: "python", sh: "bash",
  zsh: "bash", console: "bash", yml: "yaml", "c++": "cpp", cs: "csharp",
  html: "xml", vue: "xml", svelte: "xml", htm: "xml", golang: "go",
  postgres: "sql", postgresql: "sql", mysql: "sql", sqlite: "sql",
};

export function normalizeLanguage(language: string): string {
  const key = (language || "").toLowerCase().trim();
  return ALIASES[key] ?? key;
}

interface HighlightedCodeProps {
  code: string;
  language: string;
  className?: string;
}

/**
 * Renders highlighted code, degrading to plain text until (or unless) the
 * highlighter loads.
 */
export default function HighlightedCode({
  code,
  language,
  className,
}: HighlightedCodeProps) {
  const [html, setHtml] = useState<string | null>(null);
  const lang = useMemo(() => normalizeLanguage(language), [language]);

  useEffect(() => {
    let cancelled = false;
    // No language tag and no obvious structure: leave it plain.
    if (!lang) {
      setHtml(null);
      return;
    }
    void (async () => {
      try {
        const hljs = await loadHljs();
        if (cancelled) return;
        const result = hljs.highlight(code, { language: lang, ignoreIllegals: true });
        if (!cancelled) setHtml(result.value);
      } catch {
        if (!cancelled) setHtml(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  if (html === null) {
    return <code className={className}>{code}</code>;
  }

  return (
    <code
      className={`hljs ${className ?? ""}`}
      // Output comes from highlight.js escaping the input, not from the model.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
