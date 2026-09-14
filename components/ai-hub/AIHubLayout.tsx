"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  ArrowUpRight,
  FileText,
  FolderOpen,
  GraduationCap,
  CalendarClock,
  Compass,
  Lightbulb,
  Map,
  ListChecks,
  ListTodo,
  MessagesSquare,
  NotebookPen,
  PenLine,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  applyAccent,
} from "@/components/layout/AccentColor";
import BrandLogo from "@/components/layout/BrandLogo";
import DocumentLibrary from "./DocumentLibrary";
import UnifiedChat from "./UnifiedChat";
import ModelPicker from "./ModelPicker";
import {
  getDocumentId,
  type HubDocument,
  type HubThread,
} from "./types";

const HUB_DEFAULT_ACCENT = "#6757e8";

/** How many study materials can ground one answer at a time. */
const MAX_GROUNDED_DOCUMENTS = 3;


/**
 * Rail destinations that live outside the hub.
 *
 * These render as plain anchors, NOT `next/link`, and that is deliberate: the
 * hub is a `fixed inset-0` overlay. A client-side navigation keeps
 * AIHubLayout mounted (it is the same layout segment), so the destination
 * renders *behind* the still-visible overlay and the rail appears dead. A
 * real page load unmounts the hub and reveals the destination.
 *
 * Every href here must be a real page. `/study`, `/pdf` and `/tutor` are
 * redirect stubs back to `/ai-hub`, so linking to them makes the rail entry
 * look broken — it just bounces the user back to where they started.
 */
const HUB_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/career", label: "Career", icon: Compass },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/resume", label: "Resume", icon: FileText },
] as const;

/** Starter workflows shown in the empty state, adapted per chosen use case. */
const WORKFLOWS = {
  career: [
    {
      icon: NotebookPen,
      title: "Summarize study materials",
      hint: "Turn uploads into exam-ready notes",
      prompt: "Summarize my study materials into exam-ready notes.",
    },
    {
      icon: ListChecks,
      title: "Generate a practice quiz",
      hint: "Test yourself on the material",
      prompt: "Generate a short practice quiz from my study materials.",
    },
    {
      icon: MessagesSquare,
      title: "Mock interview answer",
      hint: "Practice with structured feedback",
      prompt: "Ask me a common job interview question and give structured feedback on my answer.",
    },
    {
      icon: CalendarClock,
      title: "Plan a study session",
      hint: "Turn notes into a focused plan",
      prompt: "Plan a focused study session based on my materials.",
    },
  ],
  everyday: [
    {
      icon: Search,
      title: "Ask anything",
      hint: "Get fast answers grounded in your materials",
      prompt: "Explain this simply and point me to where it matters in my notes.",
    },
    {
      icon: PenLine,
      title: "Draft and revise",
      hint: "Sharpen cover letters, emails, and summaries",
      prompt: "Draft a short cover letter for a job I have in mind.",
    },
    {
      icon: Lightbulb,
      title: "Explain a concept",
      hint: "Break hard ideas into plain language",
      prompt: "Explain the hardest concept in my field like I am new to it.",
    },
    {
      icon: ListTodo,
      title: "Plan next steps",
      hint: "Turn a goal into concrete actions",
      prompt: "Turn my goal into a concrete, dated action plan.",
    },
  ],
};

const WELCOME_STORAGE_KEY = "cp-aihub-welcomed";

/**
 * Dismisses a popover on outside pointerdown or Escape. Used instead of a
 * full-viewport backdrop so popovers cannot shadow each other's triggers.
 */
function useDismissable(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return ref;
}

/**
 * Minimal dialog keyboard contract: Escape closes, and focus moves into the
 * dialog on open so the buttons are reachable without tabbing through the
 * page behind it.
 */
function useDialogKeyboard(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const target = node.querySelector<HTMLElement>(
      "button:not([disabled]), [href], input, textarea, select"
    );
    target?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return ref;
}

/** Formats a thread timestamp for the history rail's meta column. */
function threadStamp(thread: HubThread): string {
  const raw = thread.updatedAt || thread.createdAt;
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/**
 * Buckets threads into the reference's date groups. Input order is
 * preserved inside each bucket so the most recent thread stays on top.
 */
function groupThreadsByDate(
  threads: HubThread[]
): Array<{ label: string; items: HubThread[] }> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 24 * 60 * 60 * 1000;

  const buckets: Array<{ label: string; items: HubThread[] }> = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Previous 30 days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const thread of threads) {
    const raw = thread.updatedAt || thread.createdAt;
    const date = raw ? new Date(raw) : null;
    if (!date || Number.isNaN(date.getTime())) {
      buckets[4].items.push(thread);
      continue;
    }
    const startOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const diffDays = Math.round(
      (startOfToday.getTime() - startOfDay.getTime()) / dayMs
    );
    if (diffDays <= 0) buckets[0].items.push(thread);
    else if (diffDays === 1) buckets[1].items.push(thread);
    else if (diffDays <= 7) buckets[2].items.push(thread);
    else if (diffDays <= 30) buckets[3].items.push(thread);
    else buckets[4].items.push(thread);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}

export default function AIHubLayout() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<HubDocument[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [draftPrompt, setDraftPrompt] = useState("");

  const [accountOpen, setAccountOpen] = useState(false);

  const [selectedModel, setSelectedModel] = useState<string>("primary");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);

  const [threads, setThreads] = useState<HubThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [newChatNonce, setNewChatNonce] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);

  /**
   * Open by default on desktop (where the rail is a static column) and closed
   * on mobile (where it is an off-canvas drawer that would cover the chat).
   * The lazy initializer only runs on the client, and the server-rendered rail
   * markup is identical either way, so this cannot desync hydration.
   */
  const [isLeftOpen, setIsLeftOpen] = useState(
    () =>
      typeof window === "undefined" ||
      !window.matchMedia("(max-width: 1023px)").matches
  );
  const [isRightOpen, setIsRightOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [initializedWelcome, setInitializedWelcome] = useState(false);

  const [threadToDeleteId, setThreadToDeleteId] = useState<string | null>(null);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ id: string; filename: string } | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const [useCase, setUseCase] = useState<"career" | "everyday" | null>(null);

  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cancelRenameOnBlurRef = useRef(false);
  /** Mirrors activeThreadId so late SSE callbacks read the current id. */
  const activeThreadIdRef = useRef<string | null>(null);
  /** Set during hydration: true only when this is a first-time visitor. */
  const shouldWelcomeRef = useRef(false);

  const firstName = (session?.user?.name || "there").split(/\s+/)[0];

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
        // Only auto-select once on first load — never yank "New Chat" or an active stream.
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

  /**
   * The hub ships violet by default. The wider app defaults to lime, so we
   * adopt whatever accent the user has saved and hand the app accent back
   * when the hub unmounts.
   */
  useEffect(() => {
    let savedHex: string | null = null;
    try {
      savedHex = localStorage.getItem(ACCENT_STORAGE_KEY);
    } catch {
      /* ignore */
    }

    applyAccent(savedHex || HUB_DEFAULT_ACCENT);

    return () => {
      try {
        applyAccent(localStorage.getItem(ACCENT_STORAGE_KEY) || DEFAULT_ACCENT);
      } catch {
        applyAccent(DEFAULT_ACCENT);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchModels() {
      try {
        const res = await fetch("/api/ai-hub/models");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(data.models);
        }
        if (typeof data.defaultModel === "string" && data.defaultModel) {
          setDefaultModel(data.defaultModel);
          setSelectedModel(data.defaultModel);
        }
      } catch (err) {
        console.error("Failed to fetch router models:", err);
      }
    }
    fetchModels();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const savedUseCase = localStorage.getItem(WELCOME_STORAGE_KEY);
      if (savedUseCase === "career" || savedUseCase === "everyday") {
        setUseCase(savedUseCase);
      }
      // Only first-time visitors see the welcome dialog. Any stored value —
      // including the explicit "skipped" sentinel — counts as an answer.
      shouldWelcomeRef.current = savedUseCase === null;
      setInitializedWelcome(true);
    } catch {
      setInitializedWelcome(true);
    }
  }, []);

  // Reveal the first-run welcome once the accent has hydrated, so the
  // dialog never flashes in the wrong palette. Depends only on the
  // initialization flag — adding welcomeOpen here would re-arm the timer
  // forever.
  useEffect(() => {
    if (!initializedWelcome) return;
    if (!shouldWelcomeRef.current) return;
    const t = setTimeout(() => setWelcomeOpen(true), 250);
    return () => clearTimeout(t);
  }, [initializedWelcome]);

  /**
   * Tracks the `lg` breakpoint so the rail behaves as an off-canvas drawer
   * below 1024px and a static column above it.
   *
   * Uses matchMedia rather than a window resize listener: resize only fires
   * on an actual viewport change, so a pane that is already desktop-width at
   * mount (or a viewport overridden programmatically) would otherwise keep a
   * stale `isMobile: true`. That stale flag rendered the mobile backdrop over
   * a desktop layout, which swallowed every click in the rail.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(max-width: 1023px)");
    const sync = (matches: boolean) => {
      setIsMobile(matches);
    };
    sync(query.matches);
    const onChange = (event: MediaQueryListEvent) => sync(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Ctrl/Cmd+I starts a new chat. Escape for popovers is handled per-popover.
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

  const accountRef = useDismissable(accountOpen, () => setAccountOpen(false));


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
      toast.success("Chat renamed");
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
        throw new Error(data.message || "Failed to delete chat");
      }
      setThreads((prev) => prev.filter((thread) => thread._id !== id));
      if (activeThreadId === id) {
        setActiveThreadId(null);
      }
      setThreadToDeleteId(null);
      toast.success("Chat deleted");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete chat"
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
    // Select the new upload without discarding what was already grounded —
    // the same newest-3 cap the drawer uses.
    setSelectedDocumentIds((prev) =>
      prev.includes(id) ? prev : [...prev, id].slice(-MAX_GROUNDED_DOCUMENTS)
    );
  };

  const handleToggleDocument = (id: string) => {
    setSelectedDocumentIds((prev) => {
      if (prev.includes(id)) return prev.filter((docId) => docId !== id);
      if (prev.length >= MAX_GROUNDED_DOCUMENTS) {
        toast.message(
          `Grounding is capped at ${MAX_GROUNDED_DOCUMENTS} documents — dropping the oldest.`
        );
      }
      return [...prev, id].slice(-MAX_GROUNDED_DOCUMENTS);
    });
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

  /**
   * The server names a new thread once its first reply lands. Patch the rail
   * entry in place rather than refetching every thread.
   */
  const handleThreadTitled = useCallback((title: string) => {
    const threadId = activeThreadIdRef.current;
    if (!threadId) return;
    setThreads((prev) =>
      prev.map((thread) =>
        thread._id === threadId
          ? { ...thread, threadTitle: title, titleSource: "auto" as const }
          : thread
      )
    );
  }, []);

  const startNewThread = useCallback(() => {
    setActiveThreadId(null);
    setNewChatNonce((prev) => prev + 1);
    if (isMobile) setIsLeftOpen(false);
  }, [isMobile]);

  const chooseUseCase = (value: "career" | "everyday") => {
    setUseCase(value);
    try {
      localStorage.setItem(WELCOME_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setWelcomeOpen(false);
  };

  const skipWelcome = useCallback(() => {
    try {
      // A distinct sentinel: "skipped" must not be mistaken for a real
      // choice, or the dialog's answer would silently pin career workflows.
      localStorage.setItem(WELCOME_STORAGE_KEY, "skipped");
    } catch {
      /* ignore */
    }
    setWelcomeOpen(false);
  }, []);

  const closeDeleteThread = useCallback(() => setThreadToDeleteId(null), []);
  const closeDeleteDoc = useCallback(() => setDocToDelete(null), []);

  // Stable identities keep the dialog key handlers from re-binding each render.
  const welcomeDialogRef = useDialogKeyboard(skipWelcome);
  const deleteThreadRef = useDialogKeyboard(closeDeleteThread);
  const deleteDocRef = useDialogKeyboard(closeDeleteDoc);

  /** Draft prompts are consumed once; a stable setter avoids re-running the effect. */
  const clearDraftPrompt = useCallback(() => setDraftPrompt(""), []);

  const workflows = useCase === "everyday" ? WORKFLOWS.everyday : WORKFLOWS.career;

  const filteredThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((thread) =>
      (thread.threadTitle || "New Chat").toLowerCase().includes(query)
    );
  }, [threads, searchQuery]);

  const threadGroups = useMemo(
    () => groupThreadsByDate(filteredThreads),
    [filteredThreads]
  );

  const initials = session?.user?.name
    ? session.user.name.trim().charAt(0).toUpperCase()
    : "U";

  return (
    /*
     * The hub is a full-viewport workspace that deliberately escapes the
     * dashboard chrome (rail, navbar, page padding) from DashboardShell.
     * `fixed inset-0` + h-dvh keeps it pinned to the viewport; z-50 matches
     * the mobile navbar so the later-in-DOM hub paints above it.
     */
    <div className="aihub fixed inset-0 z-50 flex h-dvh w-full overflow-hidden bg-hub-bg font-sans text-hub-text">
      {/* ===================== LEFT RAIL ===================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-[252px] shrink-0 flex-col border-r border-hub-line bg-hub-bg transition-all duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          isLeftOpen
            ? "visible translate-x-0"
            : "invisible -translate-x-full lg:w-0 lg:overflow-hidden lg:border-r-0"
        }`}
        id="hub-rail"
        aria-label="Chat rail"
      >
        <div className="flex h-full flex-col px-5 pt-5 pb-4">
          {/* Brand row */}
          <div className="mb-5 flex items-center gap-2">
            <a
              href="/dashboard"
              className="flex min-w-0 items-center gap-2 no-underline"
            >
              <BrandLogo size="sm" className="size-6 shrink-0 rounded-md" />
              <span className="truncate text-[16px] font-semibold tracking-[-0.03em] text-hub-text">
                Career Pilot
              </span>
            </a>
            <span className="text-[13px] text-hub-muted/50 select-none" aria-hidden>
              /
            </span>
            <span className="inline-flex shrink-0 items-center rounded-md bg-hub-soft px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide text-hub-muted uppercase">
              Free
            </span>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-hub-muted">
              <Search size={14} strokeWidth={1.75} aria-hidden />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats"
              aria-label="Search chats"
              className="w-full rounded-md border border-hub-line bg-hub-surface py-[7px] pr-9 pl-8 text-[13px] text-hub-text transition-colors placeholder:text-hub-muted focus:border-hub-composer-hover focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-2.5 text-hub-muted transition-colors hover:text-hub-text"
                aria-label="Clear search"
              >
                <X size={13} aria-hidden />
              </button>
            )}
          </div>

          {/* Primary nav */}
          <nav className="mb-4 flex flex-col gap-0.5">
            {HUB_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left text-[13.5px] text-hub-muted no-underline transition-colors duration-150 hover:bg-hub-soft/70 hover:text-hub-text"
                >
                  <Icon size={15} strokeWidth={1.75} aria-hidden />
                  <span className="leading-none tracking-[-0.01em]">
                    {item.label}
                  </span>
                </a>
              );
            })}
            <button
              type="button"
              onClick={() => setIsRightOpen((v) => !v)}
              aria-pressed={isRightOpen}
              className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left text-[13.5px] transition-colors duration-150 ${
                isRightOpen
                  ? "bg-hub-soft text-hub-text"
                  : "text-hub-muted hover:bg-hub-soft/70 hover:text-hub-text"
              }`}
            >
              <FolderOpen size={15} strokeWidth={1.75} aria-hidden />
              <span className="flex-1 leading-none tracking-[-0.01em]">
                Materials
              </span>
              {documents.length > 0 && (
                <span className="text-[10px] text-hub-muted tabular-nums">
                  {documents.length}
                </span>
              )}
            </button>
          </nav>

          {/* History */}
          <div className="rail-scroll -mr-1 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div>
              <div className="mb-1.5 flex items-center justify-between px-2.5">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((v) => !v)}
                  className="flex cursor-pointer items-center gap-1 text-[11.5px] font-medium tracking-[-0.01em] text-hub-muted/90 transition-colors hover:text-hub-text"
                  aria-expanded={historyOpen}
                >
                  Chats
                </button>
                <button
                  type="button"
                  onClick={startNewThread}
                  className="cursor-pointer text-[11px] font-medium text-[var(--primary)] transition-opacity hover:opacity-80"
                >
                  New
                </button>
              </div>

              {historyOpen && (
                <div className="flex flex-col gap-0.5">
                  {loadingThreads ? (
                    <div className="space-y-1 py-1">
                      {[0, 1, 2].map((row) => (
                        <div
                          key={row}
                          className="h-7 animate-pulse rounded-md bg-hub-soft/60"
                        />
                      ))}
                    </div>
                  ) : threadGroups.length === 0 ? (
                    <p className="px-2.5 py-2 text-[12.5px] leading-relaxed text-hub-muted">
                      {searchQuery
                        ? "No chats match that search."
                        : "No chats yet — ask something to start your first one."}
                    </p>
                  ) : (
                    threadGroups.map((group) => (
                      <div key={group.label} className="mb-1.5 last:mb-0">
                        <p className="mt-2 mb-1 px-2.5 text-[11px] font-medium tracking-[-0.01em] text-hub-muted/90">
                          {group.label}
                        </p>
                        {group.items.map((thread) => {
                          const isActive = activeThreadId === thread._id;
                          const stamp = threadStamp(thread);

                          if (editingThreadId === thread._id) {
                            return (
                              <div
                                key={thread._id}
                                className="rounded-md bg-hub-surface px-2 py-1 ring-1 ring-[var(--primary)]/40"
                              >
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
                                  aria-label="Chat title"
                                  className="w-full bg-transparent text-[13px] text-hub-text focus:outline-none"
                                  autoFocus
                                />
                              </div>
                            );
                          }

                          return (
                            <div
                              key={thread._id}
                              className={`group relative flex w-full items-center gap-2 rounded-md px-2.5 py-[7px] text-left text-[13px] transition-colors ${
                                isActive
                                  ? "bg-hub-soft text-hub-text"
                                  : "text-hub-muted hover:bg-hub-soft/70 hover:text-hub-text"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveThreadId(thread._id);
                                  if (isMobile) setIsLeftOpen(false);
                                }}
                                className="min-w-0 flex-1 cursor-pointer truncate pr-14 text-left tracking-[-0.01em] sm:pr-0"
                                title={thread.threadTitle || "New Chat"}
                              >
                                {thread.threadTitle || "New Chat"}
                              </button>
                              {stamp && (
                                <span className="shrink-0 font-mono text-[10px] text-hub-muted group-hover:opacity-0 sm:group-hover:opacity-0">
                                  {stamp}
                                </span>
                              )}
                              {/* Always visible on touch (no hover there), revealed on hover at sm+. */}
                              <span className="absolute inset-y-0 right-1.5 flex items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingThreadId(thread._id);
                                    setEditingTitle(thread.threadTitle || "");
                                    cancelRenameOnBlurRef.current = false;
                                  }}
                                  className="cursor-pointer rounded p-1 text-hub-muted transition-colors hover:bg-hub-soft-hover hover:text-hub-text"
                                  aria-label={`Rename ${thread.threadTitle || "chat"}`}
                                  title="Rename"
                                >
                                  <Pencil size={12} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setThreadToDeleteId(thread._id);
                                  }}
                                  className="cursor-pointer rounded p-1 text-hub-muted transition-colors hover:bg-hub-soft-hover hover:text-hub-danger"
                                  aria-label={`Delete ${thread.threadTitle || "chat"}`}
                                  title="Delete"
                                >
                                  <Trash2 size={12} aria-hidden />
                                </button>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer: usage + account */}
          <div className="mt-auto shrink-0 space-y-2 border-t border-hub-line pt-3">
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-hub-soft/60"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-hub-soft-hover text-[10px] font-semibold text-hub-text">
                  {initials}
                </span>
                <span className="min-w-0 flex-1 overflow-hidden">
                  <span className="block truncate text-[12.5px] leading-tight font-medium tracking-[-0.01em] text-hub-text">
                    {session?.user?.name || "Signed in"}
                  </span>
                  <span className="block truncate text-[11px] leading-tight text-hub-muted">
                    {session?.user?.email || "Career Pilot account"}
                  </span>
                </span>
                <MoreHorizontal
                  size={14}
                  className="shrink-0 text-hub-muted"
                  aria-hidden
                />
              </button>

              {accountOpen && (
                <div
                  aria-label="Account"
                  className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-lg border border-hub-line bg-hub-surface p-1 shadow-[var(--shadow-pop)]"
                >
                  <a
                    href="/profile"
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[12.5px] text-hub-muted no-underline transition-colors hover:bg-hub-soft hover:text-hub-text"
                  >
                    <UserRound size={14} strokeWidth={1.75} aria-hidden />
                    Profile
                  </a>
                  <a
                    href="/dashboard"
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[12.5px] text-hub-muted no-underline transition-colors hover:bg-hub-soft hover:text-hub-text"
                  >
                    <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden />
                    Back to dashboard
                  </a>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12.5px] text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-danger"
                  >
                    <LogOut size={14} strokeWidth={1.75} aria-hidden />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {isLeftOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsLeftOpen(false)}
          aria-hidden
        />
      )}

      {/* ===================== MAIN ===================== */}
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-hub-bg">
        <div className="hub-veil" aria-hidden />

        {/*
          Stacking inside the hub: backdrop z-40 < rail z-50 < header z-[60].
          The header must outrank the rail or the open off-canvas drawer covers
          the hamburger and traps the user on mobile. On desktop the rail is
          `lg:static` with no z-index, so this only matters below lg.
        */}
        <header className="relative z-[60] flex shrink-0 items-center justify-between px-5 pt-5 pb-2 sm:px-7 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLeftOpen((v) => !v)}
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text"
              aria-expanded={isLeftOpen}
              aria-controls="hub-rail"
              aria-label={isLeftOpen ? "Collapse chat rail" : "Expand chat rail"}
              title={isLeftOpen ? "Collapse rail" : "Expand rail"}
            >
              <Menu size={16} aria-hidden className="lg:hidden" />
              {isLeftOpen ? (
                <PanelLeftClose
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden
                  className="hidden lg:block"
                />
              ) : (
                <PanelLeftOpen
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden
                  className="hidden lg:block"
                />
              )}
            </button>

            <ModelPicker
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              availableModels={availableModels}
              defaultModel={defaultModel}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            {/*
              Theme toggle. `mounted` gates the icon/label because the server
              cannot know the resolved theme — rendering the moon during SSR and
              the sun after hydration is a classic hydration text mismatch.
              Until mounted we render the button with a stable, theme-neutral
              label so layout and hit target never shift.
            */}
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-hub-line bg-hub-surface text-hub-muted transition-colors hover:bg-hub-raised hover:text-hub-text sm:size-9"
              aria-label={
                mounted
                  ? `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`
                  : "Toggle colour theme"
              }
              title={mounted ? "Toggle theme" : "Theme"}
            >
              {mounted && resolvedTheme === "dark" ? (
                <Sun size={15} strokeWidth={1.75} aria-hidden />
              ) : (
                <Moon size={15} strokeWidth={1.75} aria-hidden />
              )}
            </button>

            <button
              type="button"
              onClick={startNewThread}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-hub-strong px-3 py-2 text-[13px] font-medium tracking-[-0.01em] text-hub-surface transition-colors hover:bg-hub-strong-hover active:opacity-90 sm:px-3.5"
            >
              <Plus size={14} strokeWidth={2} aria-hidden />
              <span className="hidden sm:inline">New chat</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRightOpen((v) => !v)}
              aria-pressed={isRightOpen}
              className={`relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors sm:size-9 ${
                isRightOpen
                  ? "border-[var(--primary)]/40 bg-hub-soft text-hub-text"
                  : "border-hub-line bg-hub-surface text-hub-muted hover:bg-hub-raised hover:text-hub-text"
              }`}
              aria-label="Toggle study materials"
              title="Study materials"
            >
              <FileText size={14} strokeWidth={1.75} aria-hidden />
              {documents.length > 0 && (
                <span className="absolute -top-1 -right-1 grid min-w-[15px] place-items-center rounded-full bg-[var(--primary)] px-1 text-[9.5px] leading-[15px] font-semibold text-[var(--primary-foreground)]">
                  {documents.length}
                </span>
              )}
            </button>
          </div>
        </header>

        <UnifiedChat
          activeThreadId={activeThreadId}
          setActiveThreadId={setActiveThreadId}
          onThreadCreated={fetchThreads}
          onThreadTitled={handleThreadTitled}
          selectedDocumentIds={selectedDocumentIds}
          onUploadSuccess={handleUploadSuccess}
          draftPrompt={draftPrompt}
          onDraftPromptConsumed={clearDraftPrompt}
          newChatNonce={newChatNonce}
          firstName={firstName}
          workflows={workflows}
          selectedModel={selectedModel}
        />
      </main>

      {isRightOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsRightOpen(false)}
          aria-hidden
        />
      )}

      {/* ===================== RIGHT DRAWER (Study Materials) ===================== */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex h-full shrink-0 flex-col border-l border-hub-line bg-hub-surface transition-transform duration-200 ease-out lg:static lg:z-auto ${
          isRightOpen
            ? "visible w-[300px] translate-x-0"
            : "invisible w-[300px] translate-x-full lg:hidden"
        }`}
        aria-label="Study materials"
      >
        <div className="flex items-center justify-between border-b border-hub-line px-4 py-3.5">
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="text-hub-muted" aria-hidden />
            <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-hub-text">
              Study materials
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsRightOpen(false)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text"
            aria-label="Close study materials"
          >
            <X size={14} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
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

      {/* ===================== WELCOME MODAL ===================== */}
      {welcomeOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={skipWelcome}
          />
          <div
            ref={welcomeDialogRef}
            className="relative z-[101] w-full max-w-md rounded-lg border border-hub-line bg-hub-surface p-6 shadow-[var(--shadow-pop)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
          >
            <button
              type="button"
              onClick={skipWelcome}
              className="absolute top-3 right-3 flex size-8 cursor-pointer items-center justify-center rounded-lg text-hub-muted transition-colors hover:bg-hub-soft hover:text-hub-text"
              aria-label="Close"
            >
              <X size={15} aria-hidden />
            </button>

            <p className="mb-1 flex items-center gap-1.5 text-[12px] font-medium tracking-wide text-[var(--primary)] uppercase">
              <Sparkles size={12} aria-hidden />
              Welcome to Career Pilot
            </p>
            <h2
              id="welcome-title"
              className="mb-2 text-[22px] font-semibold tracking-[-0.02em] text-hub-text"
            >
              What will you use this for?
            </h2>
            <p className="mb-6 text-[13.5px] leading-relaxed text-hub-muted">
              We&apos;ll pin a few starter prompts to match. You can change this
              anytime.
            </p>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => chooseUseCase("career")}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-hub-line bg-hub-raised p-4 text-left transition-all hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]">
                  <GraduationCap size={18} aria-hidden />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-hub-text">
                    Career &amp; study
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-hub-muted">
                    Mock interviews, resumes, exam-ready notes — pins career and
                    study workflows.
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => chooseUseCase("everyday")}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-hub-line bg-hub-raised p-4 text-left transition-all hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-hub-soft text-hub-text">
                  <MessageSquare size={18} aria-hidden />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-hub-text">
                    Personal / general
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-hub-muted">
                    Daily assistant chat — start blank and explore workflows
                    anytime.
                  </span>
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={skipWelcome}
              className="mt-4 w-full cursor-pointer py-2 text-center text-[13px] text-hub-muted transition-colors hover:text-hub-text"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* ===================== DELETE CHAT MODAL ===================== */}
      {threadToDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => !deletingThreadId && setThreadToDeleteId(null)}
          />
          <div
            ref={deleteThreadRef}
            className="relative z-[101] w-full max-w-sm rounded-lg border border-hub-line bg-hub-surface p-6 shadow-[var(--shadow-pop)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-thread-title"
          >
            <h3
              id="delete-thread-title"
              className="text-[16px] font-semibold tracking-[-0.01em] text-hub-text"
            >
              Delete chat?
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-hub-muted">
              This permanently deletes the conversation history. This action
              cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setThreadToDeleteId(null)}
                disabled={Boolean(deletingThreadId)}
                className="cursor-pointer rounded-md border border-hub-line bg-hub-surface px-3.5 py-2 text-[13px] font-medium text-hub-text transition-colors hover:bg-hub-raised disabled:opacity-50"
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
                className="cursor-pointer rounded-md bg-hub-danger px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deletingThreadId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== DELETE DOCUMENT MODAL ===================== */}
      {docToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => !deletingDocId && setDocToDelete(null)}
          />
          <div
            ref={deleteDocRef}
            className="relative z-[101] w-full max-w-sm rounded-lg border border-hub-line bg-hub-surface p-6 shadow-[var(--shadow-pop)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-document-title"
          >
            <h3
              id="delete-document-title"
              className="text-[16px] font-semibold tracking-[-0.01em] text-hub-text"
            >
              Delete PDF?
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-hub-muted">
              This permanently removes{" "}
              <span className="font-medium text-hub-text">
                {docToDelete.filename}
              </span>{" "}
              from your study materials.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={!!deletingDocId}
                className="cursor-pointer rounded-md border border-hub-line bg-hub-surface px-3.5 py-2 text-[13px] font-medium text-hub-text transition-colors hover:bg-hub-raised disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDocument}
                disabled={!!deletingDocId}
                className="cursor-pointer rounded-md bg-hub-danger px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {deletingDocId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
