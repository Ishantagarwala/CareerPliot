"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import DocumentLibrary from "./DocumentLibrary";
import UnifiedChat from "./UnifiedChat";

interface HubDocument {
  _id: string;
  id?: string;
  filename: string;
  summary?: string;
  createdAt?: string;
}

export default function AIHubLayout() {
  const [documents, setDocuments] = useState<HubDocument[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [draftPrompt, setDraftPrompt] = useState("");

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-hub/documents");
      if (!res.ok) {
        throw new Error("Failed to load documents");
      }
      const data = await res.json();
      setDocuments(data);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to load documents");
    } finally {
      setLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUploadSuccess = (document: any) => {
    const id = document.id || document._id;
    const formattedDocument = {
      _id: id,
      filename: document.filename,
      summary: document.summary,
      createdAt: new Date().toISOString(),
    };

    setDocuments((prev) => [formattedDocument, ...prev]);
    setSelectedDocumentIds([id]);
  };

  const handleToggleDocument = (id: string) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id].slice(-3)
    );
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#262626] pb-6 animate-fade-in-up">
        <h1
          className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
          AI Study Hub
        </h1>
        <p className="text-sm text-[#8e9192] mt-2">
          Chat with your AI tutor, upload PDFs, and ask questions with your study material as context.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <DocumentLibrary
          documents={documents}
          selectedDocumentIds={selectedDocumentIds}
          loading={loadingDocuments}
          onToggleDocument={handleToggleDocument}
          onQuickPrompt={setDraftPrompt}
        />
        <UnifiedChat
          selectedDocumentIds={selectedDocumentIds}
          onUploadSuccess={handleUploadSuccess}
          draftPrompt={draftPrompt}
          onDraftPromptConsumed={() => setDraftPrompt("")}
        />
      </div>
    </div>
  );
}
