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
  onToggleDocument: (id: string) => void;
  onQuickPrompt: (prompt: string) => void;
}

export default function DocumentLibrary({
  documents,
  selectedDocumentIds,
  loading,
  onToggleDocument,
  onQuickPrompt,
}: DocumentLibraryProps) {
  const hasSelection = selectedDocumentIds.length > 0;

  return (
    <aside className="bg-card border-2 border-black h-full min-h-[420px] flex flex-col">
      <div className="p-4 border-b-2 border-black">
        <p
          className="text-[11px] text-muted-foreground uppercase tracking-[0.15em] font-label"
        >
          Document Context
        </p>
        <h2 className="text-lg font-bold text-foreground mt-1 font-display">
          Study Materials
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          [1, 2, 3].map((item) => (
            <div key={item} className="h-20 border-2 border-black/40 bg-muted animate-pulse" />
          ))
        ) : documents.length === 0 ? (
          <div className="border-2 border-dashed border-black/50 p-5 text-center">
            <p className="text-sm text-foreground">No PDFs yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Upload one from the chat panel to ask document-aware questions.</p>
          </div>
        ) : (
          documents.map((doc) => {
            const id = doc._id || doc.id || "";
            const selected = selectedDocumentIds.includes(id);

            return (
              <button
                key={id}
                onClick={() => onToggleDocument(id)}
                className={`w-full text-left border-2 p-3 transition-colors ${
                  selected
                    ? "border-primary bg-primary/15"
                    : "border-black/50 bg-background hover:border-primary/60"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`material-symbols-outlined text-[18px] ${selected ? "text-primary" : "text-muted-foreground"}`}>
                    description
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.filename}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                      {doc.summary || "Summary available after analysis."}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="border-t-2 border-black p-3 space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-label">
          Quick Actions
        </p>
        {!hasSelection && (
          <p className="text-[11px] text-primary/90 font-medium">
            Select a document above to unlock these.
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
            className={`w-full text-left text-xs border-2 px-3 py-2.5 font-medium transition-colors ${
              hasSelection
                ? "text-foreground border-black bg-background hover:bg-primary hover:text-primary-foreground"
                : "text-muted-foreground/70 border-black/40 bg-muted cursor-not-allowed"
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>
    </aside>
  );
}
