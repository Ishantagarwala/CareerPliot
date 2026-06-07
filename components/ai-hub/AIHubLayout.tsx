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

  // Threads state
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Mobile sidebars toggles
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(false);

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

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-hub/threads");
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
        if (data.length > 0) {
          setActiveThreadId((curr) => curr || data[0]._id);
        }
      }
    } catch (error) {
      console.error("Failed to load threads:", error);
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchThreads();
  }, [fetchDocuments, fetchThreads]);

  const handleRenameThread = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`/api/ai-hub/threads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        const updated = await res.json();
        setThreads((prev) =>
          prev.map((t) => (t._id === id ? { ...t, threadTitle: updated.threadTitle } : t))
        );
        toast.success("Conversation renamed");
      }
    } catch (error) {
      toast.error("Failed to rename conversation");
    }
  };

  const handleDeleteThread = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-hub/threads/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setThreads((prev) => prev.filter((t) => t._id !== id));
        if (activeThreadId === id) {
          setActiveThreadId(null);
        }
        toast.success("Conversation deleted");
      }
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-6 relative">
        {/* Panel 1 Backdrop (Mobile) */}
        {isLeftOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setIsLeftOpen(false)}
          />
        )}

        {/* Panel 1: Chats Sidebar */}
        <section
          className={`flex flex-col bg-[#0A0A0A] border border-[#262626] p-4
            fixed inset-y-0 left-0 z-50 w-[260px] transition-transform duration-300 ease-in-out lg:static lg:z-0 lg:w-auto lg:h-[calc(100vh-220px)] lg:min-h-[560px]
            ${isLeftOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          {/* Close button for Sidebar on mobile */}
          <div className="flex justify-end lg:hidden mb-2">
            <button
              onClick={() => setIsLeftOpen(false)}
              className="p-1 text-white border border-[#262626] bg-[#1A1A1A] hover:bg-[#262626] flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="pb-3 border-b border-[#262626] mb-4">
            <p
              className="text-[11px] text-[#8e9192] uppercase tracking-[0.15em] mb-2"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Conversations
            </p>
            <button
              onClick={() => {
                setActiveThreadId(null);
                setIsLeftOpen(false);
              }}
              className="w-full flex items-center justify-between border border-dashed border-[#404040] hover:border-white p-3 text-xs font-bold text-[#8e9192] hover:text-white transition-all bg-[#0A0A0A] hover:bg-[#1A1A1A]"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
            >
              <span>NEW CHAT</span>
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {loadingThreads ? (
              <div className="text-xs text-[#8e9192] p-2 italic">Loading chats...</div>
            ) : threads.length === 0 ? (
              <div className="text-xs text-[#8e9192] p-2 italic">No conversations</div>
            ) : (
              threads.map((thread) => {
                const isActive = activeThreadId === thread._id;
                const isEditing = editingThreadId === thread._id;

                if (isEditing) {
                  return (
                    <div key={thread._id} className="p-1 border border-white">
                      <input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRenameThread(thread._id, editingTitle);
                            setEditingThreadId(null);
                          } else if (e.key === "Escape") {
                            setEditingThreadId(null);
                          }
                        }}
                        onBlur={() => {
                          handleRenameThread(thread._id, editingTitle);
                          setEditingThreadId(null);
                        }}
                        className="bg-[#131313] text-xs text-white px-2 py-1 w-full focus:outline-none"
                        autoFocus
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={thread._id}
                    className={`group flex items-center justify-between p-3 text-xs border transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#1A1A1A] border-white text-white font-bold"
                        : "bg-[#0A0A0A] border-[#262626] text-[#8e9192] hover:bg-[#131313] hover:text-white"
                    }`}
                    onClick={() => {
                      setActiveThreadId(thread._id);
                      setIsLeftOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-[15px]">chat_bubble</span>
                      <span className="truncate max-w-[120px]">{thread.threadTitle || "AI Chat"}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingThreadId(thread._id);
                          setEditingTitle(thread.threadTitle || "");
                        }}
                        className="hover:text-white text-[#8e9192] p-0.5"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this conversation?")) {
                            handleDeleteThread(thread._id);
                          }
                        }}
                        className="hover:text-red-500 text-[#8e9192] p-0.5"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Panel 2: Unified Chat */}
        <UnifiedChat
          activeThreadId={activeThreadId}
          setActiveThreadId={setActiveThreadId}
          onThreadCreated={fetchThreads}
          selectedDocumentIds={selectedDocumentIds}
          onUploadSuccess={handleUploadSuccess}
          draftPrompt={draftPrompt}
          onDraftPromptConsumed={() => setDraftPrompt("")}
          onToggleLeftSidebar={() => setIsLeftOpen((prev) => !prev)}
          onToggleRightSidebar={() => setIsRightOpen((prev) => !prev)}
        />

        {/* Panel 3 Backdrop (Mobile) */}
        {isRightOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setIsRightOpen(false)}
          />
        )}

        {/* Panel 3: Document Library */}
        <aside
          className={`fixed inset-y-0 right-0 z-50 w-[300px] bg-[#0A0A0A] border-l border-[#262626] p-4 transition-transform duration-300 ease-in-out lg:static lg:z-0 lg:w-auto lg:border-l-0 lg:p-0 lg:h-auto
            ${isRightOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
        >
          {/* Close button for Right Sidebar on mobile */}
          <div className="flex justify-end lg:hidden mb-2">
            <button
              onClick={() => setIsRightOpen(false)}
              className="p-1 text-white border border-[#262626] bg-[#1A1A1A] hover:bg-[#262626] flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <DocumentLibrary
            documents={documents}
            selectedDocumentIds={selectedDocumentIds}
            loading={loadingDocuments}
            onToggleDocument={handleToggleDocument}
            onQuickPrompt={(prompt) => {
              setDraftPrompt(prompt);
              setIsRightOpen(false);
            }}
          />
        </aside>
      </div>
    </div>
  );
}
