"use client";

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
    <div className="flex h-full flex-col overflow-hidden bg-sidebar">
      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          [1, 2, 3].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-lg border border-border bg-muted" />
          ))
        ) : documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-xs font-semibold text-foreground">No PDFs uploaded yet</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Upload study materials using the button in the header or drag-and-drop to parse documents.
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
                className={`w-full rounded-xl border p-3 transition-all ${
                  selected
                    ? "border-ring bg-primary/10 shadow-soft"
                    : "border-border bg-card hover:-translate-y-0.5 hover:border-ring/40 hover:shadow-lift"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => onToggleDocument(id)}
                    className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 text-left"
                    disabled={isDeleting}
                    aria-pressed={selected}
                    aria-label={`${selected ? "Deselect" : "Select"} ${doc.filename}`}
                  >
                    <span
                      className={`material-symbols-outlined mt-0.5 shrink-0 text-[16px] ${
                        selected ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      description
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{doc.filename}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                        {doc.summary || "Summary available after analysis."}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDocument(id, doc.filename);
                    }}
                    disabled={isDeleting}
                    className="shrink-0 cursor-pointer p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                    title="Delete PDF"
                    aria-label={`Delete ${doc.filename}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {isDeleting ? "progress_activity" : "delete"}
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-2.5 border-t border-sidebar-border bg-sidebar p-4">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
          <span className="text-[12px] text-primary material-symbols-outlined">bolt</span>
          Quick Prompts
        </div>
        {!hasSelection && (
          <p className="text-[11px] font-medium text-primary">
            Select a document above to unlock actions.
          </p>
        )}
        {[
          "Summarize the selected document in exam-ready notes.",
          "Generate a short quiz from the selected document.",
          "Explain the hardest concepts from the selected document.",
        ].map((prompt) => (
          <button
            key={prompt}
            onClick={() => onQuickPrompt(prompt)}
            disabled={!hasSelection}
            className={`w-full rounded-lg border px-3 py-2 text-left text-[11px] leading-normal transition-colors ${
              hasSelection
                ? "cursor-pointer border-border bg-card font-medium text-foreground hover:border-ring hover:bg-primary hover:text-primary-foreground"
                : "cursor-not-allowed border-border/60 bg-transparent text-muted-foreground/60"
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
