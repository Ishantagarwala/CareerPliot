"use client";

interface HubDocument {
  _id: string;
  id?: string;
  filename: string;
  summary?: string;
  createdAt?: string;
}

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
    <div className="h-full flex flex-col overflow-hidden bg-sidebar">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          [1, 2, 3].map((item) => (
            <div key={item} className="h-16 border border-border bg-card/30 rounded-lg animate-pulse" />
          ))
        ) : documents.length === 0 ? (
          <div className="border-2 border-dashed border-border p-6 rounded-xl text-center bg-card/10">
            <p className="text-xs font-bold text-foreground">No PDFs uploaded yet</p>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
              Upload study materials using the button in the header or drag-and-drop to parse documents.
            </p>
          </div>
        ) : (
          documents.map((doc) => {
            const id = doc._id || doc.id || "";
            const selected = selectedDocumentIds.includes(id);
            const isDeleting = deletingId === id;

            return (
              <div
                key={id}
                className={`w-full border-2 rounded-xl p-3 transition-colors ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/30 hover:border-primary/50 hover:bg-card/50"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => onToggleDocument(id)}
                    className="flex items-start gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                    disabled={isDeleting}
                  >
                    <span
                      className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${
                        selected ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      description
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{doc.filename}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
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
                    className="shrink-0 p-1 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40 cursor-pointer"
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

      <div className="border-t border-border p-4 space-y-2.5 bg-background">
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-label">
          <span className="material-symbols-outlined text-[12px] text-primary">bolt</span>
          Quick Prompts
        </div>
        {!hasSelection && (
          <p className="text-[10px] text-primary font-bold">
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
            className={`w-full text-left text-[11px] border-2 rounded-lg px-3 py-2 transition-all leading-normal cursor-pointer ${
              hasSelection
                ? "text-foreground border-border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary font-bold shadow-[2px_2px_0_0_rgba(0,0,0,0.15)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                : "text-muted-foreground/50 border-border/40 bg-transparent cursor-not-allowed"
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
