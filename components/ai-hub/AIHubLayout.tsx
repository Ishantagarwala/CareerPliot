"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ACCENT_STORAGE_KEY,
  applyAccent,
  DEFAULT_ACCENT,
} from "@/components/layout/AccentColor";
import BrandLogo from "@/components/layout/BrandLogo";
import DocumentLibrary from "./DocumentLibrary";
import UnifiedChat from "./UnifiedChat";

interface HubDocument {
  _id: string;
  id?: string;
  filename: string;
  summary?: string;
  createdAt?: string;
}

const THEME_ACCENTS = [
  { id: "lime", name: "Lime Green", primary: "#baf600", foreground: "#151f00" },
  { id: "blue", name: "Electric Blue", primary: "#0043eb", foreground: "#ffffff" },
  { id: "pink", name: "Vibrant Pink", primary: "#ec4899", foreground: "#ffffff" },
  { id: "orange", name: "Vibrant Orange", primary: "#f97316", foreground: "#ffffff" },
  { id: "cyan", name: "Teal/Cyan", primary: "#00f0ff", foreground: "#151f00" },
  { id: "mono", name: "Monochrome", primary: "#e1e5cf", foreground: "#111508" },
];

function resolveAccentHex(id: string, isDark: boolean): string {
  if (id === "mono") return isDark ? "#e1e5cf" : "#151f00";
  if (id === "cyan" && !isDark) return "#008ba3";
  const match = THEME_ACCENTS.find((a) => a.id === id);
  return match?.primary || DEFAULT_ACCENT;
}

export default function AIHubLayout() {
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const [documents, setDocuments] = useState<HubDocument[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [draftPrompt, setDraftPrompt] = useState("");

  const [themeColor, setThemeColor] = useState<string>("lime");

  const [threads, setThreads] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [newChatNonce, setNewChatNonce] = useState(0);

  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [threadToDeleteId, setThreadToDeleteId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ id: string; filename: string } | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const isDark = resolvedTheme === "dark";

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

  const initialThreadSelected = useRef(false);

  const fetchThreads = useCallback(async (opts?: { autoSelect?: boolean }) => {
    try {
      const res = await fetch("/api/ai-hub/threads");
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
        // Only auto-select once on first load — never yank "New Thread" or an active stream.
        if (
          opts?.autoSelect &&
          !initialThreadSelected.current &&
          data.length > 0
        ) {
          initialThreadSelected.current = true;
          setActiveThreadId((curr) => curr ?? data[0]._id);
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
    void fetchThreads({ autoSelect: true });
  }, [fetchDocuments, fetchThreads]);

  useEffect(() => {
    try {
      const savedHex = localStorage.getItem(ACCENT_STORAGE_KEY);
      if (savedHex) {
        applyAccent(savedHex);
        const preset = THEME_ACCENTS.find(
          (a) => a.primary.toLowerCase() === savedHex.toLowerCase()
        );
        if (preset) setThemeColor(preset.id);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setIsLeftOpen(!mobile);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setActiveThreadId(null);
        setNewChatNonce((prev) => prev + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleAccentChange = (id: string) => {
    setThemeColor(id);
    const hex = resolveAccentHex(id, isDark);
    applyAccent(hex);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, hex);
    } catch {
      /* ignore */
    }
  };

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
    } catch {
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
    } catch {
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

  const confirmDeleteDocument = async () => {
    if (!docToDelete) return;
    const { id } = docToDelete;
    setDeletingDocId(id);
    try {
      const res = await fetch(`/api/ai-hub/documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete document");
      }
      setDocuments((prev) => prev.filter((d) => (d._id || d.id) !== id));
      setSelectedDocumentIds((prev) => prev.filter((docId) => docId !== id));
      toast.success("PDF deleted");
      setDocToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete PDF");
    } finally {
      setDeletingDocId(null);
    }
  };

  const startNewThread = () => {
    setActiveThreadId(null);
    setNewChatNonce((prev) => prev + 1);
    if (isMobile) setIsLeftOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-background text-foreground font-sans select-none overflow-hidden">
      <aside
        className={`flex flex-col bg-sidebar border-r border-border w-[240px] h-full shrink-0 transition-transform duration-300 z-50
          fixed lg:static inset-y-0 left-0
          ${isLeftOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-r-0 lg:overflow-hidden"}
        `}
      >
        <div className="p-4 flex items-center justify-between border-b border-border/40">
          <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity">
            <BrandLogo size="sm" className="rounded-md border-border transition-transform hover:scale-105 duration-200" />
            <div>
              <span className="font-heading font-extrabold text-foreground tracking-tight text-sm uppercase">
                Career Pilot
              </span>
              <span className="block text-[9px] text-muted-foreground font-label uppercase tracking-widest font-bold">
                AI STUDY HUB
              </span>
            </div>
          </Link>
          <button
            onClick={() => setIsLeftOpen(false)}
            className="lg:hidden p-1 text-muted-foreground hover:text-foreground"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="px-3 py-4">
          <button
            type="button"
            onClick={startNewThread}
            className="w-full flex items-center justify-between bg-primary hover:bg-primary/90 border-2 border-border rounded-lg px-4 py-2.5 text-xs font-extrabold text-primary-foreground transition-all cursor-pointer shadow-[3px_3px_0_0_rgba(0,0,0,0.15)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">add</span>
              New Thread
            </span>
            <span className="text-[10px] text-primary bg-primary-foreground/15 px-1.5 py-0.5 rounded font-bold font-mono">
              Ctrl I
            </span>
          </button>
        </div>

        <nav className="px-3 py-1 flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-card hover:text-foreground border border-transparent transition-all"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => setIsRightOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-card hover:text-foreground border border-transparent transition-all cursor-pointer ${
              isRightOpen ? "bg-card text-primary font-bold border-border" : ""
            }`}
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            <span className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px]">description</span>
              Study Materials
            </span>
            <span className="text-[10px] bg-primary/20 px-2 py-0.5 rounded-full text-primary border border-primary/20 font-bold">
              {documents.length}
            </span>
          </button>
        </nav>

        <div className="px-3 py-4 border-t border-border/40 mt-2">
          <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-label mb-2">
            <span className="material-symbols-outlined text-[14px]">palette</span>
            Accent Color
          </div>
          <div className="flex items-center gap-2 px-3 flex-wrap">
            {THEME_ACCENTS.map((accent) => {
              const active = themeColor === accent.id;
              let displayBg = accent.primary;
              if (accent.id === "mono") {
                displayBg = isDark ? "#ffffff" : "#151f00";
              }
              return (
                <button
                  key={accent.id}
                  type="button"
                  onClick={() => handleAccentChange(accent.id)}
                  title={accent.name}
                  className={`w-5 h-5 rounded-full border transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                    active
                      ? "border-foreground ring-2 ring-primary/40 scale-105"
                      : "border-border/60 hover:border-foreground"
                  }`}
                  style={{ backgroundColor: displayBg }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 border-t border-border/40 mt-3 custom-scrollbar">
          <div className="flex items-center gap-2 px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-label">
            <span className="material-symbols-outlined text-[14px]">history</span>
            History
          </div>
          <div className="space-y-1 mt-2">
            {loadingThreads ? (
              <div className="text-[11px] text-muted-foreground px-3 py-2 italic">Loading threads...</div>
            ) : threads.length === 0 ? (
              <div className="text-[11px] text-muted-foreground px-3 py-4 text-center italic">
                No recent sessions
              </div>
            ) : (
              threads.map((thread) => {
                const isActive = activeThreadId === thread._id;
                const isEditing = editingThreadId === thread._id;

                if (isEditing) {
                  return (
                    <div key={thread._id} className="px-2 py-1 bg-card rounded-lg border border-primary">
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
                        className="bg-transparent text-[11px] text-foreground w-full focus:outline-none"
                        autoFocus
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={thread._id}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-[11px] border border-transparent transition-all cursor-pointer ${
                      isActive
                        ? "bg-card text-primary font-bold border-border/30"
                        : "text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                    onClick={() => {
                      setActiveThreadId(thread._id);
                      if (isMobile) setIsLeftOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-[14px] shrink-0">chat_bubble</span>
                      <span className="truncate">{thread.threadTitle || "AI Chat"}</span>
                    </div>

                    <div
                      className={`flex items-center gap-0.5 transition-opacity shrink-0 ${
                        isActive
                          ? "opacity-100"
                          : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingThreadId(thread._id);
                          setEditingTitle(thread.threadTitle || "");
                        }}
                        className="hover:text-foreground text-muted-foreground p-1.5 -my-1 touch-manipulation"
                        aria-label={`Rename ${thread.threadTitle || "conversation"}`}
                        title="Rename"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setThreadToDeleteId(thread._id);
                        }}
                        className="hover:text-red-500 text-muted-foreground p-1.5 -my-1 touch-manipulation"
                        aria-label={`Delete ${thread.threadTitle || "conversation"}`}
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-3 border-t border-border/40 bg-sidebar flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 bg-primary text-primary-foreground border border-border flex items-center justify-center font-bold text-xs uppercase rounded-lg select-none shrink-0">
              {session?.user?.name ? session.user.name[0] : "U"}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-foreground truncate">
                {session?.user?.name || "User"}
              </p>
              <p className="text-[9px] text-muted-foreground truncate">
                {session?.user?.email || "Signed In"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </aside>

      {isLeftOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsLeftOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 h-full relative bg-background">
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
          isLeftSidebarOpen={isLeftOpen}
          isRightSidebarOpen={isRightOpen}
          newChatNonce={newChatNonce}
        />
      </main>

      {isRightOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsRightOpen(false)}
        />
      )}

      <aside
        className={`bg-sidebar border-l border-border flex flex-col h-full shrink-0 transition-all duration-300 z-40
          fixed lg:static inset-y-0 right-0
          ${isRightOpen ? "w-[280px] translate-x-0" : "w-0 translate-x-full lg:translate-x-0 lg:w-0 lg:border-l-0 lg:overflow-hidden"}
        `}
      >
        <div className="p-4 border-b border-border flex items-center justify-between bg-sidebar">
          <span className="text-xs font-bold text-foreground uppercase tracking-widest font-label">
            Study Materials
          </span>
          <button
            type="button"
            onClick={() => setIsRightOpen(false)}
            className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-hidden bg-sidebar">
          <DocumentLibrary
            documents={documents}
            selectedDocumentIds={selectedDocumentIds}
            loading={loadingDocuments}
            deletingId={deletingDocId}
            onToggleDocument={handleToggleDocument}
            onDeleteDocument={(id, filename) => setDocToDelete({ id, filename })}
            onQuickPrompt={(prompt) => {
              setDraftPrompt(prompt);
              setIsRightOpen(false);
            }}
          />
        </div>
      </aside>

      {threadToDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setThreadToDeleteId(null)}
          />
          <div className="relative w-full max-w-sm bg-card border-2 border-border p-6 rounded-xl animate-fade-in-up z-[101]">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono mb-2">
              Delete Conversation?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              This will permanently delete this conversation history. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setThreadToDeleteId(null)}
                className="px-4 py-2 text-xs font-bold text-muted-foreground border border-border rounded-lg hover:bg-sidebar transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (threadToDeleteId) {
                    handleDeleteThread(threadToDeleteId);
                    setThreadToDeleteId(null);
                  }
                }}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {docToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => !deletingDocId && setDocToDelete(null)}
          />
          <div className="relative w-full max-w-sm bg-card border-2 border-border p-6 rounded-xl animate-fade-in-up z-[101]">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono mb-2">
              Delete PDF?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              This will permanently remove{" "}
              <span className="text-foreground font-semibold">{docToDelete.filename}</span> from your
              study materials.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={!!deletingDocId}
                className="px-4 py-2 text-xs font-bold text-muted-foreground border border-border rounded-lg hover:bg-sidebar transition-colors disabled:opacity-40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDocument}
                disabled={!!deletingDocId}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 cursor-pointer"
              >
                {deletingDocId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
