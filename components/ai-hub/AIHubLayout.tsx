"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useTheme } from "next-themes";
import BrandLogo from "@/components/layout/BrandLogo";
import DocumentLibrary from "./DocumentLibrary";
import UnifiedChat from "./UnifiedChat";
import {
  getDocumentId,
  type HubDocument,
  type HubThread,
} from "./types";

export default function AIHubLayout() {
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const [documents, setDocuments] = useState<HubDocument[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [draftPrompt, setDraftPrompt] = useState("");

  const [threads, setThreads] = useState<HubThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [newChatNonce, setNewChatNonce] = useState(0);

  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [threadToDeleteId, setThreadToDeleteId] = useState<string | null>(null);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ id: string; filename: string } | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const cancelRenameOnBlurRef = useRef(false);

  const isDark = resolvedTheme === "dark";

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-hub/documents");
      if (!res.ok) {
        throw new Error("Failed to load documents");
      }
      const data = (await res.json()) as HubDocument[];
      setDocuments(
        Array.isArray(data)
          ? data.filter((document) => Boolean(getDocumentId(document)))
          : []
      );
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load documents"
      );
    } finally {
      setLoadingDocuments(false);
    }
  }, []);

  const initialThreadSelected = useRef(false);

  const fetchThreads = useCallback(async (opts?: { autoSelect?: boolean }) => {
    try {
      const res = await fetch("/api/ai-hub/threads");
      if (!res.ok) {
        throw new Error("Failed to load conversation history");
      }
      const data = (await res.json()) as HubThread[];
      if (Array.isArray(data)) {
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

  const handleRenameThread = async (id: string, newTitle: string) => {
    const title = newTitle.trim();
    if (!title) {
      setEditingThreadId(null);
      return;
    }
    try {
      const res = await fetch(`/api/ai-hub/threads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to rename conversation");
      }
      const updated = (await res.json()) as HubThread;
      setThreads((prev) =>
        prev.map((thread) =>
          thread._id === id
            ? { ...thread, threadTitle: updated.threadTitle }
            : thread
        )
      );
      toast.success("Conversation renamed");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to rename conversation"
      );
    } finally {
      setEditingThreadId(null);
    }
  };

  const handleDeleteThread = async (id: string) => {
    setDeletingThreadId(id);
    try {
      const res = await fetch(`/api/ai-hub/threads/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete conversation");
      }
      setThreads((prev) => prev.filter((thread) => thread._id !== id));
      if (activeThreadId === id) {
        setActiveThreadId(null);
      }
      setThreadToDeleteId(null);
      toast.success("Conversation deleted");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete conversation"
      );
    } finally {
      setDeletingThreadId(null);
    }
  };

  const handleUploadSuccess = (document: HubDocument) => {
    const id = getDocumentId(document);
    if (!id) {
      toast.error("Upload succeeded, but the document id was missing. Refreshing library.");
      void fetchDocuments();
      return;
    }
    const formattedDocument: HubDocument = {
      _id: id,
      filename: document.filename,
      fileUrl: document.fileUrl,
      summary: document.summary,
      createdAt: document.createdAt || new Date().toISOString(),
    };

    setDocuments((prev) => [
      formattedDocument,
      ...prev.filter((item) => getDocumentId(item) !== id),
    ]);
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
      setDocuments((prev) => prev.filter((document) => getDocumentId(document) !== id));
      setSelectedDocumentIds((prev) => prev.filter((docId) => docId !== id));
      toast.success("PDF deleted");
      setDocToDelete(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete PDF");
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
    <div className="fixed inset-0 z-50 flex select-none overflow-hidden bg-background font-sans text-foreground">
      <aside
        className={`flex h-full w-[240px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 z-50
          fixed lg:static inset-y-0 left-0
          ${isLeftOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-r-0 lg:overflow-hidden"}
        `}
      >
        <div className="flex items-center justify-between border-b border-border/40 p-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
            <BrandLogo size="sm" className="rounded-md border-border transition-transform duration-200 hover:scale-105" />
            <div>
              <span className="font-heading text-sm font-extrabold tracking-tight text-foreground uppercase">
                Career Pilot
              </span>
              <span className="block text-[13px] font-medium text-muted-foreground">
                AI STUDY HUB
              </span>
            </div>
          </Link>
          <button
            onClick={() => setIsLeftOpen(false)}
            className="p-1 text-muted-foreground hover:text-foreground lg:hidden"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="px-3 py-4">
          <button
            type="button"
            onClick={startNewThread}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">add</span>
              New Thread
            </span>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground/75">
              Ctrl I
            </span>
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-1 text-xs font-semibold text-muted-foreground">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:bg-card hover:text-foreground"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => setIsRightOpen((prev) => !prev)}
            className={`flex w-full cursor-pointer items-center justify-between rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:bg-card hover:text-foreground ${
              isRightOpen ? "border-border bg-card font-semibold text-primary" : ""
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px]">description</span>
              Study Materials
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {documents.length}
            </span>
          </button>
        </nav>

        <div className="custom-scrollbar mt-2 flex-1 overflow-y-auto border-t border-border/40 px-3 py-4">
          <div className="flex items-center gap-2 px-3 py-1 text-[13px] font-medium text-muted-foreground">
            <span className="material-symbols-outlined text-[14px]">history</span>
            History
          </div>
          <div className="mt-2 space-y-1">
            {loadingThreads ? (
              <div className="px-3 py-2 text-[11px] italic text-muted-foreground">Loading threads...</div>
            ) : threads.length === 0 ? (
              <div className="px-3 py-4 text-center text-[11px] italic text-muted-foreground">
                No recent sessions
              </div>
            ) : (
              threads.map((thread) => {
                const isActive = activeThreadId === thread._id;
                const isEditing = editingThreadId === thread._id;

                if (isEditing) {
                  return (
                    <div key={thread._id} className="rounded-lg border border-ring bg-card px-2 py-1">
                      <input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          } else if (e.key === "Escape") {
                            cancelRenameOnBlurRef.current = true;
                            setEditingThreadId(null);
                          }
                        }}
                        onBlur={() => {
                          if (cancelRenameOnBlurRef.current) {
                            cancelRenameOnBlurRef.current = false;
                            return;
                          }
                          void handleRenameThread(thread._id, editingTitle);
                        }}
                        maxLength={80}
                        className="w-full bg-transparent text-[11px] text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                        autoFocus
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={thread._id}
                    className={`group flex cursor-pointer items-center justify-between rounded-lg border border-transparent px-3 py-2 text-[11px] transition-colors ${
                      isActive
                        ? "border-border/60 bg-card font-semibold text-primary"
                        : "text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                    onClick={() => {
                      setActiveThreadId(thread._id);
                      if (isMobile) setIsLeftOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="shrink-0 material-symbols-outlined text-[14px]">chat_bubble</span>
                      <span className="truncate">{thread.threadTitle || "AI Chat"}</span>
                    </div>

                    <div
                      className={`flex shrink-0 items-center gap-0.5 transition-opacity ${
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
                          cancelRenameOnBlurRef.current = false;
                        }}
                        className="-my-1 p-1.5 text-muted-foreground hover:text-foreground touch-manipulation"
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
                        className="-my-1 p-1.5 text-muted-foreground hover:text-destructive touch-manipulation"
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

        <div className="flex items-center justify-between border-t border-border/40 bg-sidebar p-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              {session?.user?.name ? session.user.name[0] : "U"}
            </div>
            <div className="truncate">
              <p className="truncate text-xs font-semibold text-foreground">
                {session?.user?.name || "User"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {session?.user?.email || "Signed In"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            title="Sign Out"
            aria-label="Sign out"
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

      <main className="relative flex h-full min-w-0 flex-1 flex-col bg-background">
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
        className={`flex h-full shrink-0 flex-col border-l border-sidebar-border bg-sidebar transition-all duration-300 z-40
          fixed lg:static inset-y-0 right-0
          ${isRightOpen ? "w-[280px] translate-x-0" : "w-0 translate-x-full lg:translate-x-0 lg:w-0 lg:border-l-0 lg:overflow-hidden"}
        `}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border bg-sidebar p-4">
          <span className="text-sm font-semibold text-foreground">
            Study Materials
          </span>
          <button
            type="button"
            onClick={() => setIsRightOpen(false)}
            className="cursor-pointer p-1 text-muted-foreground hover:text-foreground"
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
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => !deletingThreadId && setThreadToDeleteId(null)}
          />
          <div
            className="animate-fade-in-up relative z-[101] w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-pop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-thread-title"
          >
            <h3 id="delete-thread-title" className="mb-2 text-sm font-semibold text-foreground">
              Delete Conversation?
            </h3>
            <p className="mb-6 text-xs leading-relaxed text-muted-foreground">
              This will permanently delete this conversation history. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setThreadToDeleteId(null)}
                disabled={Boolean(deletingThreadId)}
                className="cursor-pointer rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (threadToDeleteId) {
                    void handleDeleteThread(threadToDeleteId);
                  }
                }}
                disabled={Boolean(deletingThreadId)}
                className="cursor-pointer rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {deletingThreadId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {docToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => !deletingDocId && setDocToDelete(null)}
          />
          <div
            className="animate-fade-in-up relative z-[101] w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-pop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-document-title"
          >
            <h3 id="delete-document-title" className="mb-2 text-sm font-semibold text-foreground">
              Delete PDF?
            </h3>
            <p className="mb-6 text-xs leading-relaxed text-muted-foreground">
              This will permanently remove{" "}
              <span className="font-semibold text-foreground">{docToDelete.filename}</span> from your
              study materials.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={!!deletingDocId}
                className="cursor-pointer rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDocument}
                disabled={!!deletingDocId}
                className="cursor-pointer rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-40"
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
