"use client";

import { FileText, Trash2, Upload } from "lucide-react";
import { getDocumentId, type HubDocument } from "./types";

interface DocumentLibraryProps {
  documents: HubDocument[];
  selectedDocumentIds: string[];
  loading: boolean;
  deletingId?: string | null;
  onToggleDocument: (id: string) => void;
  onDeleteDocument: (id: string, filename: string) => void;
  onQuickPrompt: (prompt: string) => void;
}

const QUICK_PROMPTS = [
  "Summarize the selected document in exam-ready notes.",
  "Generate a short quiz from the selected document.",
  "Explain the hardest concepts from the selected document.",
];

/**
 * The study-material panel. Rows are selectable (the selection is what the
 * chat grounds its answers in), and the footer exposes canned prompts that
 * only make sense once something is selected.
 */
export default function DocumentLibrary({
  documents,
  selectedDocumentIds,
  loading,
  deletingId,
  onToggleDocument,
  onDeleteDocument,
  onQuickPrompt,
}: DocumentLibraryProps) {
  const hasSelection = selectedDocumentIds.length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-hub-surface">
      <div className="rail-scroll min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {loading ? (
          [1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-14 animate-pulse rounded-lg bg-hub-soft"
            />
          ))
        ) : documents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-hub-line p-5 text-center">
            <div className="mx-auto flex size-9 items-center justify-center rounded-md bg-hub-soft text-hub-muted">
              <Upload size={16} strokeWidth={1.75} aria-hidden />
            </div>
            <p className="mt-2.5 text-[13px] font-medium text-hub-text">
              No study materials yet
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-hub-muted">
              Attach a PDF in the composer and it will show up here.
            </p>
          </div>
        ) : (
          documents.map((doc) => {
            const id = getDocumentId(doc);
            if (!id) return null;

            const selected = selectedDocumentIds.includes(id);
            const isDeleting = deletingId === id;

            return (
              <div
                key={id}
                className={`group flex items-start gap-2 rounded-lg border p-2.5 transition-colors ${
                  selected
                    ? "border-[var(--primary)]/45 bg-[var(--primary)]/5"
                    : "border-transparent hover:bg-hub-raised"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleDocument(id)}
                  disabled={isDeleting}
                  aria-pressed={selected}
                  aria-label={`${selected ? "Deselect" : "Select"} ${doc.filename}`}
                  className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 text-left disabled:opacity-50"
                >
                  <span
                    className={`mt-px grid size-6 shrink-0 place-items-center rounded-sm ${
                      selected
                        ? "bg-[var(--primary)]/12 text-[var(--primary)]"
                        : "bg-hub-soft text-hub-muted"
                    }`}
                  >
                    <FileText size={12} strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-hub-text">
                      {doc.filename}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-relaxed text-hub-muted">
                      {doc.summary || "Summary available after analysis."}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteDocument(id, doc.filename)}
                  disabled={isDeleting}
                  className="shrink-0 cursor-pointer rounded p-1 text-hub-muted opacity-100 transition-all hover:bg-hub-soft hover:text-hub-danger disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  title="Delete PDF"
                  aria-label={`Delete ${doc.filename}`}
                >
                  <Trash2 size={12} aria-hidden />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-1.5 border-t border-hub-line p-3">
        <p className="px-1 text-[11px] font-medium tracking-wide text-hub-muted uppercase">
          Quick prompts
        </p>
        {!hasSelection && (
          <p className="px-1 text-[11.5px] leading-relaxed text-hub-muted">
            Select a document above to unlock these.
          </p>
        )}
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onQuickPrompt(prompt)}
            disabled={!hasSelection}
            className={`w-full rounded-md border px-2.5 py-2 text-left text-[12px] leading-relaxed transition-colors ${
              hasSelection
                ? "cursor-pointer border-hub-line bg-hub-raised text-hub-text hover:border-hub-composer-hover"
                : "cursor-not-allowed border-hub-line/50 bg-transparent text-hub-muted/90"
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
