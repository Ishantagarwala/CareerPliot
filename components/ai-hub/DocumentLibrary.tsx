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
  return (
    <aside className="bg-[#1A1A1A] border border-[#262626] h-full min-h-[420px] flex flex-col">
      <div className="p-4 border-b border-[#262626]">
        <p
          className="text-[11px] text-[#8e9192] uppercase tracking-[0.15em]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Document Context
        </p>
        <h2
          className="text-lg font-bold text-white mt-1"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          Study Materials
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          [1, 2, 3].map((item) => (
            <div key={item} className="h-20 border border-[#262626] bg-[#131313] animate-pulse" />
          ))
        ) : documents.length === 0 ? (
          <div className="border border-dashed border-[#262626] p-5 text-center">
            <p className="text-sm text-[#c4c7c8]">No PDFs yet.</p>
            <p className="text-xs text-[#636565] mt-1">Upload one from the chat panel to ask document-aware questions.</p>
          </div>
        ) : (
          documents.map((doc) => {
            const id = doc._id || doc.id || "";
            const selected = selectedDocumentIds.includes(id);

            return (
              <button
                key={id}
                onClick={() => onToggleDocument(id)}
                className={`w-full text-left border p-3 transition-colors ${
                  selected
                    ? "border-white/40 bg-white/10"
                    : "border-[#262626] bg-[#131313] hover:border-[#404040]"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`material-symbols-outlined text-[18px] ${selected ? "text-white" : "text-[#8e9192]"}`}>
                    description
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{doc.filename}</p>
                    <p className="text-[11px] text-[#636565] mt-1 line-clamp-2">
                      {doc.summary || "Summary available after analysis."}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-[#262626] p-3 space-y-2">
        <p
          className="text-[10px] text-[#636565] uppercase tracking-[0.12em]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Quick Actions
        </p>
        {[
          "Summarize the selected document in exam-ready notes.",
          "Generate a short quiz from the selected document.",
          "Explain the hardest concepts from the selected document.",
        ].map((prompt) => (
          <button
            key={prompt}
            onClick={() => onQuickPrompt(prompt)}
            disabled={selectedDocumentIds.length === 0}
            className="w-full text-left text-xs text-[#c4c7c8] border border-[#262626] px-3 py-2 hover:text-white hover:border-[#404040] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {prompt}
          </button>
        ))}
      </div>
    </aside>
  );
}
