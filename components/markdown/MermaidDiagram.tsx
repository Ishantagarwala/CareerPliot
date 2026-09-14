"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Code2, Copy, Download, Maximize2, Minus, Plus, X } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

/**
 * Renders a ```mermaid fenced block as a real diagram.
 *
 * Mermaid is imported lazily and only from here, so its (very large) bundle is
 * never part of the initial page load — it downloads the first time a reply
 * actually contains a diagram. This module itself is loaded on demand by
 * MarkdownContent for the same reason.
 */

type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void;
  render: (
    id: string,
    text: string
  ) => Promise<{ svg: string; bindFunctions?: (el: Element) => void }>;
};

let mermaidPromise: Promise<MermaidApi> | null = null;

function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then(
      (mod) => ((mod as { default?: MermaidApi }).default ?? mod) as MermaidApi
    );
  }
  return mermaidPromise;
}

/** True once the definition looks complete, so we don't render half a stream. */
function looksComplete(code: string): boolean {
  const text = code.trim();
  if (text.length < 12) return false;
  // Mermaid has no end marker; a trailing line with no arrow/open bracket is a
  // reasonable "stopped mid-sentence" signal.
  return !/[->|{[(]\s*$/.test(text);
}

export default function MermaidDiagram({ code }: { code: string }) {
  const rawId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const { resolvedTheme } = useTheme();

  const definition = useMemo(() => code.trim(), [code]);
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!definition || !looksComplete(definition)) return;
      const host = containerRef.current;
      if (!host) return;

      try {
        const mermaid = await loadMermaid();
        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily:
            'var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif',
          themeVariables: {
            background: isDark ? "#16181d" : "#ffffff",
            primaryColor: isDark ? "#1e2128" : "#f4f2ff",
            primaryTextColor: isDark ? "#ecedf1" : "#15171b",
            primaryBorderColor: "#6757e8",
            lineColor: isDark ? "#6d7480" : "#858992",
            secondaryColor: isDark ? "#1e2128" : "#eceef2",
            tertiaryColor: isDark ? "#1a1d23" : "#fbfbfc",
            fontSize: "13px",
          },
        });

        // A fresh id per attempt: mermaid refuses to reuse a node it already
        // rendered into.
        const id = `mmd-${rawId.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()}`;
        const { svg, bindFunctions } = await mermaid.render(id, definition);
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = svg;
        bindFunctions?.(containerRef.current);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        // Common while streaming: an incomplete definition is a parse error.
        // Fall back to showing the source rather than a scary failure.
        setError(err instanceof Error ? err.message : "Could not render diagram");
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [definition, isDark, rawId]);

  /** The rendered SVG, or null if we never got one. */
  const currentSvg = () => containerRef.current?.querySelector("svg") ?? null;

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  /** Serialise the live SVG, inlining computed colours so it stands alone. */
  const handleExportSvg = () => {
    const svg = currentSvg();
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const { width, height } = svg.getBoundingClientRect();
    clone.setAttribute("width", String(Math.round(width)));
    clone.setAttribute("height", String(Math.round(height)));
    // Mermaid styles much of the diagram via CSS, which does not travel with
    // the file — bake the computed paint onto each node so the SVG is portable.
    const sourceNodes = svg.querySelectorAll("*");
    const cloneNodes = clone.querySelectorAll("*");
    sourceNodes.forEach((node, i) => {
      const target = cloneNodes[i] as SVGElement | undefined;
      if (!target) return;
      const cs = getComputedStyle(node);
      for (const prop of ["fill", "stroke", "stroke-width", "font-family", "font-size", "color", "opacity"]) {
        const value = cs.getPropertyValue(prop);
        if (value) target.style.setProperty(prop, value);
      }
    });
    download(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }),
      "diagram.svg"
    );
    toast.success("Diagram saved as SVG");
  };

  const handleExportPng = () => {
    const svg = currentSvg();
    if (!svg) return;
    const { width, height } = svg.getBoundingClientRect();
    const scale = 2; // crisp on retina and when pasted into slides
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    const sourceNodes = svg.querySelectorAll("*");
    const cloneNodes = clone.querySelectorAll("*");
    sourceNodes.forEach((node, i) => {
      const target = cloneNodes[i] as SVGElement | undefined;
      if (!target) return;
      const cs = getComputedStyle(node);
      for (const prop of ["fill", "stroke", "stroke-width", "font-family", "font-size", "color", "opacity"]) {
        const value = cs.getPropertyValue(prop);
        if (value) target.style.setProperty(prop, value);
      }
    });
    const svgUrl = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" })
    );
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = isDark ? "#16181d" : "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            download(blob, "diagram.png");
            toast.success("Diagram saved as PNG");
          }
        }, "image/png");
      }
      URL.revokeObjectURL(svgUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      toast.error("Could not export the diagram");
    };
    img.src = svgUrl;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(definition);
      setCopied(true);
      toast.success("Diagram source copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  // Parsing failed (usually a truncated stream): show the source, not an error
  // the student can do nothing about.
  if (error) {
    return (
      <div className="my-4 overflow-hidden rounded-lg border border-hub-line bg-hub-raised">
        <div className="flex items-center justify-between border-b border-hub-line px-3 py-2">
          <span className="text-[11px] font-medium tracking-wide text-hub-muted uppercase">
            Diagram
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex cursor-pointer items-center gap-1 text-[11px] text-hub-muted transition-colors hover:text-hub-text"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="overflow-x-auto px-3 py-3 font-mono text-[11.5px] leading-relaxed text-hub-muted">
          <code>{definition}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-hub-line bg-hub-surface">
      <div className="flex items-center justify-between border-b border-hub-line px-3 py-1.5">
        <span className="text-[11px] font-medium tracking-wide text-hub-muted uppercase">
          Diagram
        </span>
        <div className="flex items-center gap-0.5">
          {/* Zoom: only useful on diagrams too wide to read at a glance. */}
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            disabled={zoom <= 0.5}
            className="flex size-6 cursor-pointer items-center justify-center rounded text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text disabled:cursor-default disabled:opacity-30"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <Minus size={11} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="min-w-[34px] cursor-pointer rounded px-1 py-0.5 text-[10.5px] tabular-nums text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text"
            aria-label="Reset zoom"
            title="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
            disabled={zoom >= 3}
            className="flex size-6 cursor-pointer items-center justify-center rounded text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text disabled:cursor-default disabled:opacity-30"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <Plus size={11} />
          </button>

          <span className="mx-1 h-3.5 w-px bg-hub-line" aria-hidden />

          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex size-6 cursor-pointer items-center justify-center rounded text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text"
            aria-label="View diagram full screen"
            title="Full screen"
          >
            <Maximize2 size={11} />
          </button>
          <button
            type="button"
            onClick={() => setShowSource((v) => !v)}
            aria-pressed={showSource}
            className={`flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors hover:bg-hub-soft ${
              showSource ? "text-hub-text" : "text-hub-muted"
            }`}
            title="Show diagram source"
          >
            <Code2 size={11} />
            Source
          </button>
          <button
            type="button"
            onClick={handleExportPng}
            className="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text"
            title="Download as PNG"
          >
            <Download size={11} />
            PNG
          </button>
          <button
            type="button"
            onClick={handleExportSvg}
            className="hidden cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text sm:flex"
            title="Download as SVG"
          >
            <Download size={11} />
            SVG
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text"
            title="Copy diagram source"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="overflow-auto px-3 py-4" style={{ maxHeight: expanded ? undefined : 520 }}>
        {/* Mermaid writes its SVG here. */}
        <div
          ref={containerRef}
          className="mermaid-host flex justify-center [&_svg]:h-auto [&_svg]:max-w-full"
          style={{ zoom }}
        />
      </div>

      {showSource && (
        <pre className="overflow-x-auto border-t border-hub-line bg-hub-raised px-3 py-3 font-mono text-[11.5px] leading-relaxed text-hub-muted">
          <code>{definition}</code>
        </pre>
      )}

      {expanded && (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-hub-bg/95 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Diagram"
          onKeyDown={(e) => {
            if (e.key === "Escape") setExpanded(false);
          }}
        >
          <div className="flex items-center justify-between border-b border-hub-line px-4 py-3">
            <span className="text-[12px] font-medium text-hub-muted">Diagram</span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              autoFocus
              className="flex size-8 cursor-pointer items-center justify-center rounded-md text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text"
              aria-label="Close full screen diagram"
            >
              <X size={15} />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-6">
            {/*
              Re-render through mermaid into a second host rather than moving
              the live node — moving an SVG out of its container loses the
              sizing mermaid applied.
            */}
            <ExpandedDiagram definition={definition} isDark={isDark} zoom={zoom} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Second render target used by the full-screen view. */
function ExpandedDiagram({
  definition,
  isDark,
  zoom,
}: {
  definition: string;
  isDark: boolean;
  zoom: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mermaid = await loadMermaid();
        if (cancelled || !hostRef.current) return;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: {
            primaryColor: isDark ? "#1e2128" : "#f4f2ff",
            primaryTextColor: isDark ? "#ecedf1" : "#15171b",
            primaryBorderColor: "#6757e8",
            lineColor: isDark ? "#6d7480" : "#858992",
            background: isDark ? "#16181d" : "#ffffff",
          },
        });
        const id = `mmdx-${uid.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()}`;
        const { svg } = await mermaid.render(id, definition);
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = svg;
      } catch {
        /* the inline view already surfaced the source on failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [definition, isDark, uid]);

  return (
    <div
      ref={hostRef}
      className="[&_svg]:h-auto [&_svg]:max-w-full"
      style={{ zoom }}
    />
  );
}
