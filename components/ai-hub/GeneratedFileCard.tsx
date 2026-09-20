"use client";

import React, { useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Download,
  FileCode2,
  FileText,
  FileType2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import MarkdownContent from "@/components/markdown/MarkdownContent";
import {
  estimateDocBytes,
  fileExtension,
  formatBytes,
  type FileFormat,
  type GeneratedFileSpec,
} from "@/lib/generated/fileSpec";

/**
 * A document the assistant produced, offered as a real download.
 *
 * The heavy part — rendering Markdown to PDF/DOCX — is imported on click, so a
 * reply that mentions a file costs nothing until the student actually takes it.
 * The same Markdown source feeds the preview and both writers, which is why the
 * preview is a fair picture of the download.
 */

const FORMAT_META: Record<FileFormat, { icon: React.ReactNode; label: string; hint: string }> = {
  pdf: {
    icon: <FileText size={14} aria-hidden />,
    label: "PDF",
    hint: "print or share",
  },
  docx: {
    icon: <FileType2 size={14} aria-hidden />,
    label: "Word",
    hint: "edit or submit",
  },
  md: {
    icon: <FileCode2 size={14} aria-hidden />,
    label: "Markdown",
    hint: "plain text",
  },
};

function safeFilename(filename: string, format: FileFormat): string {
  return `${filename || "careerpilot-document"}.${fileExtension(format)}`;
}

/**
 * Waits for the parts of a reply that render asynchronously.
 *
 * A mermaid diagram is drawn after its component mounts, and a chart is a
 * lazy-loaded component, so reading the DOM immediately after `flushSync`
 * captures a "Rendering diagram…" placeholder and exports a document with the
 * diagram missing. Polls briefly instead, and gives up rather than hanging: the
 * export is still correct without it.
 */
async function waitForOffscreenRender(host: HTMLElement, timeoutMs = 4000): Promise<void> {
  const pending = () =>
    Array.from(host.querySelectorAll(".mermaid-host")).some((node) => !node.querySelector("svg"));

  if (!host.querySelector(".mermaid-host") || !pending()) return;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!pending()) return;
  }
  console.warn("Generated document: a diagram was still rendering and will be omitted.");
}

interface GeneratedFileCardProps {
  spec: GeneratedFileSpec;
}

export default function GeneratedFileCard({ spec }: GeneratedFileCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState<FileFormat | null>(null);
  const [done, setDone] = useState<FileFormat | null>(null);

  const primary = FORMAT_META[spec.format];
  const size = useMemo(() => formatBytes(estimateDocBytes(spec)), [spec]);

  /**
   * Renders the Markdown into a detached node and reads the blocks off it.
   *
   * The extractor was written for the browser DOM, and a detached element is
   * still that DOM — so a generated document travels the exact same path as a
   * reply does, including mermaid diagrams and chart tables, with no second
   * Markdown parser to keep in step.
   */
  const buildBlocks = async () => {
    const { createRoot } = await import("react-dom/client");
    const { flushSync } = await import("react-dom");
    const { buildBlocksFromElement } = await import("@/lib/export/markdownBlocks");

    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.width = "740px";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);

    const root = createRoot(host);
    try {
      // Synchronous: the Markdown has to be in the DOM before it is read.
      flushSync(() => {
        root.render(<MarkdownContent content={spec.markdown} />);
      });

      await waitForOffscreenRender(host);
      return await buildBlocksFromElement(host);
    } finally {
      root.unmount();
      host.remove();
    }
  };

  const download = async (format: FileFormat) => {
    setBusy(format);
    try {
      const filename = safeFilename(spec.filename, format);

      if (format === "md") {
        const { downloadMarkdown } = await import("@/lib/export/replyExport");
        downloadMarkdown(spec.markdown, spec.filename);
      } else {
        const blocks = await buildBlocks();
        if (!blocks.length) throw new Error("The document came back empty");

        const { triggerFileDownload } = await import("@/lib/export/replyExport");
        if (format === "pdf") {
          const { buildPdfBlob } = await import("@/lib/generated/exportPdf");
          triggerFileDownload(
            buildPdfBlob({
              title: spec.title,
              meta: `${new Date().toLocaleDateString()} · CareerPilot AI Study Hub`,
              blocks,
            }),
            filename
          );
        } else {
          const { buildDocxBlob } = await import("@/lib/export/exportDocx");
          triggerFileDownload(
            buildDocxBlob({
              title: spec.title,
              meta: `${new Date().toLocaleDateString()} · CareerPilot AI Study Hub`,
              blocks,
            }),
            filename
          );
        }
      }

      setDone(format);
      setTimeout(() => setDone((current) => (current === format ? null : current)), 2500);
      toast.success(`Saved ${filename}`);
    } catch (error) {
      console.error("Generated file download failed:", error);
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Could not build that document"
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-hub-line bg-hub-surface">
      <div className="flex flex-wrap items-center gap-3 p-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-hub-soft text-[var(--primary)]">
          {primary.icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-hub-text" title={spec.title}>
            {spec.title}
          </p>
          <p className="mt-0.5 text-[11.5px] text-hub-muted">
            {spec.filename}.{fileExtension(spec.format)} · {size} · {primary.hint}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void download(spec.format)}
          disabled={busy !== null}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy === spec.format ? (
            <Loader2 size={13} className="animate-spin" aria-hidden />
          ) : done === spec.format ? (
            <Check size={13} aria-hidden />
          ) : (
            <Download size={13} aria-hidden />
          )}
          {busy === spec.format ? "Building…" : done === spec.format ? "Saved" : `Download ${primary.label}`}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-t border-hub-line px-2 py-1.5">
        <button
          type="button"
          onClick={() => setPreviewOpen((open) => !open)}
          aria-expanded={previewOpen}
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text"
        >
          <ChevronRight
            size={12}
            className={`transition-transform duration-150 ${previewOpen ? "rotate-90" : ""}`}
            aria-hidden
          />
          {previewOpen ? "Hide preview" : "Preview contents"}
        </button>

        <span className="mx-1 h-4 w-px bg-hub-line" aria-hidden />

        {/* The other formats stay one click away — the same document, re-created. */}
        {(Object.keys(FORMAT_META) as FileFormat[])
          .filter((format) => format !== spec.format)
          .map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => void download(format)}
              disabled={busy !== null}
              className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text disabled:opacity-50"
            >
              {busy === format ? (
                <Loader2 size={11} className="animate-spin" aria-hidden />
              ) : (
                FORMAT_META[format].icon
              )}
              Also as {FORMAT_META[format].label}
            </button>
          ))}
      </div>

      {previewOpen && (
        <div className="max-h-[420px] overflow-y-auto border-t border-hub-line bg-hub-raised px-4 py-3">
          <MarkdownContent content={spec.markdown} variant="summary" />
        </div>
      )}
    </div>
  );
}
