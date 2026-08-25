"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import MessageBubble, {
  type MessageBubbleMessage,
} from "@/components/tutor/MessageBubble";
import UploadDropzone from "./UploadDropzone";
import { useVoice } from "@/components/voice/useVoice";
import VoiceHUD from "@/components/voice/VoiceHUD";
import {
  getDocumentId,
  parseChatAttachment,
  type ChatAttachment,
  type HubDocument,
} from "./types";

interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ChatAttachment[];
  sentAt?: Date | string;
  streaming?: boolean;
  error?: string;
}

const MAX_ATTACHMENTS = 3;
const MAX_MESSAGE_CHARS = 12_000;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function newMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function isVisibleMessage(
  message: Message
): message is Message & MessageBubbleMessage {
  return message.role === "user" || message.role === "assistant";
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function mergeAttachments(
  current: ChatAttachment[],
  restored: ChatAttachment[]
): ChatAttachment[] {
  const merged: ChatAttachment[] = [];
  const seen = new Set<string>();

  for (const attachment of [...restored, ...current]) {
    if (seen.has(attachment.fileUrl)) continue;
    seen.add(attachment.fileUrl);
    merged.push(attachment);
    if (merged.length >= MAX_ATTACHMENTS) break;
  }

  return merged;
}

interface UnifiedChatProps {
  activeThreadId: string | null;
  setActiveThreadId: (id: string | null) => void;
  onThreadCreated: () => void | Promise<void>;
  selectedDocumentIds: string[];
  onUploadSuccess: (document: HubDocument) => void;
  draftPrompt: string;
  onDraftPromptConsumed: () => void;
  onToggleLeftSidebar?: () => void;
  onToggleRightSidebar?: () => void;
  isLeftSidebarOpen?: boolean;
  isRightSidebarOpen?: boolean;
  newChatNonce?: number;
}

function ModelPicker({
  selectedModel,
  setSelectedModel,
  showModelDropdown,
  setShowModelDropdown,
  availableModels,
  placement = "up",
}: {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  showModelDropdown: boolean;
  setShowModelDropdown: (show: boolean) => void;
  availableModels: string[];
  placement?: "up" | "down";
}) {
  const getDisplayName = (id: string) => {
    if (id === "primary") return "Default Model";
    if (id === "opus") return "Claude 4.6 Opus";
    if (id === "gemini") return "Gemini 3.5 Flash";

    const slash = id.indexOf("/");
    const provider = slash === -1 ? "" : id.slice(0, slash);
    const mainName = slash === -1 ? id : id.slice(slash + 1);
    const pretty = mainName
      .split(/[-_]/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Include provider so similarly named models stay distinguishable
    return provider ? `${pretty} · ${provider}` : pretty;
  };

  // Deduplicate defensively on the client too (by base model name)
  const modelsList = (() => {
    const source =
      availableModels.length > 0 ? availableModels : ["primary", "opus", "gemini"];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of source) {
      const base = id.includes("/") ? id.split("/").slice(1).join("/").toLowerCase() : id.toLowerCase();
      if (seen.has(base)) continue;
      seen.add(base);
      out.push(id);
    }
    return out;
  })();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowModelDropdown(!showModelDropdown)}
        className="bg-background hover:bg-card border border-border px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold text-foreground transition-all cursor-pointer"
      >
        <span className="material-symbols-outlined text-[13px] text-primary">psychology</span>
        {getDisplayName(selectedModel)}
      </button>

      {showModelDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowModelDropdown(false)} />
          <div
            className={`absolute z-50 min-w-[220px] bg-card border-2 border-border p-1 shadow-lg rounded-xl flex flex-col gap-0.5 max-h-[280px] overflow-y-auto ${
              placement === "up" ? "bottom-full mb-2" : "top-full mt-2"
            }`}
          >
            {modelsList.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSelectedModel(id);
                  setShowModelDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  selectedModel === id
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-foreground hover:bg-sidebar"
                }`}
              >
                {getDisplayName(id)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function UnifiedChat({
  activeThreadId,
  setActiveThreadId,
  onThreadCreated,
  selectedDocumentIds,
  onUploadSuccess,
  draftPrompt,
  onDraftPromptConsumed,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  isLeftSidebarOpen,
  isRightSidebarOpen,
  newChatNonce,
}: UnifiedChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const [voiceHUDOpen, setVoiceHUDOpen] = useState(false);
  const [voiceTurnBusy, setVoiceTurnBusy] = useState(false);
  const voiceBusyRef = useRef(false);
  const voiceHUDOpenRef = useRef(false);
  const handleVoiceTurnRef = useRef<(text: string) => Promise<void>>(
    async () => {}
  );
  const voice = useVoice({
    silenceMs: 1800,
    onUtteranceEnd: (text) => void handleVoiceTurnRef.current(text),
  });

  const [isMobile, setIsMobile] = useState(false);

  const [selectedModel, setSelectedModel] = useState<string>("primary");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isStreamingRef = useRef(false);
  const streamingThreadIdRef = useRef<string | null>(null);
  const streamOriginThreadRef = useRef<string | null>(null);
  const streamMsgIdRef = useRef<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const manualStopRef = useRef<AbortController | null>(null);
  const historyFetchGenRef = useRef(0);
  const stickToBottomRef = useRef(true);
  const activeThreadIdRef = useRef(activeThreadId);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    voiceHUDOpenRef.current = voiceHUDOpen;
  }, [voiceHUDOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsMobile(window.innerWidth < 1024);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/api/ai-hub/models");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.models) && data.models.length > 0) {
            setAvailableModels(data.models);
            const defaultModel =
              (typeof data.defaultModel === "string" && data.defaultModel) ||
              data.models[0];
            setSelectedModel(defaultModel);
          }
        }
      } catch (err) {
        console.error("Failed to fetch custom router models:", err);
      }
    }
    fetchModels();
  }, []);

  useEffect(() => {
    // Don't wipe the in-progress stream when New Thread is clicked mid-request —
    // abort first, then clear.
    if (!activeThreadId) {
      if (isStreamingRef.current) {
        streamAbortRef.current?.abort();
        isStreamingRef.current = false;
        streamingThreadIdRef.current = null;
        streamMsgIdRef.current = null;
        setLoading(false);
      }
      setMessages([]);
      setInput("");
      setLoadingHistory(false);
      return;
    }

    // Mid-stream thread id assignment must NOT refetch history (assistant isn't
    // persisted yet — refetch would wipe tokens / attach them to the wrong bubble).
    if (
      isStreamingRef.current &&
      streamingThreadIdRef.current === activeThreadId
    ) {
      return;
    }

    const gen = ++historyFetchGenRef.current;
    let cancelled = false;

    async function fetchHistory() {
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/ai-hub/threads/${activeThreadId}`);
        if (cancelled || gen !== historyFetchGenRef.current) return;
        if (res.ok) {
          const data = await res.json();
          const loaded: Message[] = (data.messages || []).map(
            (m: Message, i: number) => ({
              ...m,
              id:
                m.id ||
                `hist_${activeThreadId}_${i}_${String(m.sentAt || "")}_${m.role}`,
              streaming: false,
            })
          );
          setMessages(loaded);
        } else {
          toast.error("Failed to load conversation history");
        }
      } catch (error) {
        if (!cancelled && gen === historyFetchGenRef.current) {
          console.error(error);
          toast.error("Failed to load conversation history");
        }
      } finally {
        if (!cancelled && gen === historyFetchGenRef.current) {
          setLoadingHistory(false);
        }
      }
    }

    void fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [activeThreadId, newChatNonce]);

  // Abort stream if the user switches threads mid-reply
  useEffect(() => {
    if (!isStreamingRef.current) return;
    const owned = streamingThreadIdRef.current;
    const origin = streamOriginThreadRef.current;
    if (owned) {
      if (activeThreadId !== owned) streamAbortRef.current?.abort();
      return;
    }
    if (activeThreadId !== origin) {
      streamAbortRef.current?.abort();
    }
  }, [activeThreadId]);

  useEffect(() => {
    if (draftPrompt) {
      setInput(draftPrompt);
      textareaRef.current?.focus();
      onDraftPromptConsumed();
    }
  }, [draftPrompt, onDraftPromptConsumed]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  };

  useEffect(() => {
    if (!stickToBottomRef.current || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleFileSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (loading || uploadingAttachment) {
      e.currentTarget.value = "";
      return;
    }
    if (attachments.length >= MAX_ATTACHMENTS) {
      toast.error(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
      e.currentTarget.value = "";
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isImage =
      ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(
        file.type
      ) ||
      [".png", ".jpg", ".jpeg", ".gif", ".webp"].some((extension) =>
        lowerName.endsWith(extension)
      );
    const isPdf =
      file.type === "application/pdf" || lowerName.endsWith(".pdf");

    if (!isImage && !isPdf) {
      toast.error("Upload a PDF, PNG, JPEG, GIF, or WebP file.");
      e.currentTarget.value = "";
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("File is too large. Maximum size is 10 MB.");
      e.currentTarget.value = "";
      return;
    }

    setUploadingAttachment(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ai-hub/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to upload attachment");
      }

      const uploaded = parseChatAttachment(await res.json());
      if (!uploaded) {
        throw new Error("The upload response was incomplete. Please try again.");
      }

      if (uploaded.type === "pdf") {
        const docId = uploaded.docId;
        if (!docId) {
          throw new Error("The uploaded PDF is missing its document id.");
        }
        onUploadSuccess({
          _id: docId,
          id: docId,
          docId,
          filename: uploaded.filename,
          fileUrl: uploaded.fileUrl,
        });
      }

      setAttachments((prev) =>
        prev.length >= MAX_ATTACHMENTS ? prev : [...prev, uploaded]
      );
      toast.success(`${file.name} uploaded successfully.`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to upload attachment"
      );
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (
    e?: React.FormEvent,
    customText?: string,
    options?: { speakReply?: boolean }
  ) => {
    if (e) e.preventDefault();
    const userMessageText = (
      customText !== undefined ? customText : input
    ).trim();
    if ((!userMessageText && attachments.length === 0) || loading) {
      return;
    }
    if (userMessageText.length > MAX_MESSAGE_CHARS) {
      toast.error(
        `Messages can be at most ${MAX_MESSAGE_CHARS.toLocaleString()} characters.`
      );
      return;
    }

    const currentAttachments = [...attachments];
    const attachmentSummary =
      currentAttachments.length === 1
        ? `[Attached ${currentAttachments[0].type}: ${currentAttachments[0].filename}]`
        : `[Attached ${currentAttachments.length} files]`;
    const messageForApi =
      userMessageText ||
      (currentAttachments.length === 1
        ? `Analyze the attached ${currentAttachments[0].type}`
        : "Analyze the attached files");

    // Abort any in-flight stream before starting a new one
    streamAbortRef.current?.abort();
    const abort = new AbortController();
    streamAbortRef.current = abort;
    manualStopRef.current = null;

    setInput("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMsgId = newMessageId();
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        content: userMessageText || attachmentSummary,
        attachments: currentAttachments,
        sentAt: new Date().toISOString(),
      },
    ]);
    setLoading(true);
    isStreamingRef.current = true;
    streamMsgIdRef.current = null;
    const threadAtStart = activeThreadIdRef.current;
    streamOriginThreadRef.current = threadAtStart;
    streamingThreadIdRef.current = threadAtStart;
    stickToBottomRef.current = true;

    let requestAccepted = false;
    let assistantMessageId: string | null = null;
    let receivedDone = false;

    try {
      const res = await fetch("/api/ai-hub/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          message: messageForApi,
          documentIds: selectedDocumentIds,
          threadId: threadAtStart,
          attachments: currentAttachments,
          modelSelection: selectedModel,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to receive response from AI Study Hub");
      }
      requestAccepted = true;

      if (!res.body) {
        throw new Error("No response stream from AI Study Hub");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedThreadId: string | null = null;
      let fullReply = "";

      const appendToken = (token: string) => {
        fullReply += token;
        if (!assistantMessageId) {
          const id = newMessageId();
          assistantMessageId = id;
          streamMsgIdRef.current = id;
          setMessages((prev) => [
            ...prev,
            {
              id,
              role: "assistant",
              content: token,
              sentAt: new Date().toISOString(),
              streaming: true,
            },
          ]);
          return;
        }
        const id = assistantMessageId;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  content: m.content + token,
                  streaming: true,
                  error: undefined,
                }
              : m
          )
        );
      };

      const finalizeAssistant = (reply: string) => {
        fullReply = reply;
        const id = assistantMessageId;
        if (!id) {
          const newId = newMessageId();
          assistantMessageId = newId;
          streamMsgIdRef.current = newId;
          setMessages((prev) => [
            ...prev,
            {
              id: newId,
              role: "assistant",
              content: reply,
              sentAt: new Date().toISOString(),
              streaming: false,
            },
          ]);
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? { ...m, content: reply, streaming: false, error: undefined }
              : m
          )
        );
      };

      const bindThread = (threadId: string) => {
        streamedThreadId = threadId;
        streamingThreadIdRef.current = threadId;
        if (!activeThreadIdRef.current) {
          activeThreadIdRef.current = threadId;
          setActiveThreadId(threadId);
          void onThreadCreated();
        }
      };

      const processSseChunk = (chunk: string) => {
        const line = chunk
          .split("\n")
          .map((l) => l.trim())
          .find((l) => l.startsWith("data:"));
        if (!line) return;
        const raw = line.replace(/^data:\s?/, "");
        if (!raw || raw === "[DONE]") return;

        let event: {
          type?: string;
          content?: string;
          threadId?: string;
          message?: string;
          reply?: string;
        };
        try {
          event = JSON.parse(raw);
        } catch {
          return;
        }

        if (event.type === "meta" && event.threadId) {
          bindThread(event.threadId);
        } else if (event.type === "token" && event.content) {
          appendToken(event.content);
        } else if (event.type === "done") {
          receivedDone = true;
          if (event.threadId) bindThread(event.threadId);
          if (event.reply) {
            // Always trust the final reply for consistency with DB
            finalizeAssistant(event.reply);
          } else if (assistantMessageId) {
            const id = assistantMessageId;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === id ? { ...m, streaming: false } : m
              )
            );
          }
        } else if (event.type === "error") {
          throw new Error(event.message || "AI Study Hub stream error");
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";
        for (const chunk of chunks) processSseChunk(chunk);
      }

      // Flush decoder + leftover buffer (last token often lives here)
      buffer += decoder.decode();
      if (buffer.trim()) {
        for (const chunk of buffer.split("\n\n")) processSseChunk(chunk);
      }

      if (!receivedDone) {
        throw new Error(
          "The AI response ended unexpectedly before it was complete."
        );
      }

      if (assistantMessageId) {
        const id = assistantMessageId;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, streaming: false } : m
          )
        );
      }

      if (streamedThreadId && !activeThreadIdRef.current) {
        bindThread(streamedThreadId);
      }

      if (options?.speakReply && fullReply) {
        try {
          await voice.speakText(fullReply);
        } catch (speechError: unknown) {
          console.error("Failed to play voice reply:", speechError);
        }
        // Hands-free loop: keep listening while the voice HUD stays open.
        if (voiceHUDOpenRef.current) {
          try {
            await voice.startRecording();
          } catch (resumeError: unknown) {
            console.error("Failed to resume listening:", resumeError);
          }
        }
      }
    } catch (error: unknown) {
      const aborted = isAbortError(error);
      const manuallyStopped = manualStopRef.current === abort;
      const failureMessage = errorMessage(
        error,
        "AI Study Hub error. Please try again."
      );

      if (assistantMessageId) {
        const id = assistantMessageId;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === id
              ? {
                  ...message,
                  streaming: false,
                  error: aborted ? undefined : failureMessage,
                }
              : message
          )
        );
      }

      if (aborted) {
        if (manuallyStopped) {
          if (!requestAccepted) {
            setMessages((prev) =>
              prev.filter((message) => message.id !== userMsgId)
            );
            setInput((current) => current || userMessageText);
            setAttachments((current) =>
              mergeAttachments(current, currentAttachments)
            );
          }
          toast.message("Generation stopped.");
        }
      } else {
        console.error(error);
        if (!requestAccepted) {
          setMessages((prev) =>
            prev.filter((message) => message.id !== userMsgId)
          );
          setInput((current) => current || userMessageText);
          setAttachments((current) =>
            mergeAttachments(current, currentAttachments)
          );
        } else if (!assistantMessageId) {
          setMessages((prev) => [
            ...prev,
            {
              id: newMessageId(),
              role: "assistant",
              content: "I couldn't complete that response.",
              sentAt: new Date().toISOString(),
              error: failureMessage,
            },
          ]);
        }
        toast.error(failureMessage);
      }
    } finally {
      if (manualStopRef.current === abort) {
        manualStopRef.current = null;
      }
      if (streamAbortRef.current === abort) {
        isStreamingRef.current = false;
        streamingThreadIdRef.current = null;
        streamMsgIdRef.current = null;
        streamAbortRef.current = null;
        setLoading(false);
      }
    }
  };

  const handleStopGeneration = () => {
    const activeAbort = streamAbortRef.current;
    if (!activeAbort) return;

    manualStopRef.current = activeAbort;
    const activeMessageId = streamMsgIdRef.current;
    if (activeMessageId) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === activeMessageId
            ? { ...message, streaming: false }
            : message
        )
      );
    }
    activeAbort.abort();
  };

  const handleVoiceTurn = useCallback(
    async (text: string) => {
      const cleaned = text.trim();
      if (!cleaned || voiceBusyRef.current) return;

      voice.stopListeningOnly();
      voiceBusyRef.current = true;
      setVoiceTurnBusy(true);
      voice.setTranscript("");
      try {
        await handleSend(undefined, cleaned, { speakReply: true });
      } finally {
        voiceBusyRef.current = false;
        setVoiceTurnBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voice]
  );

  useEffect(() => {
    handleVoiceTurnRef.current = handleVoiceTurn;
  }, [handleVoiceTurn]);

  const startVoiceInput = () => {
    setVoiceHUDOpen(true);
    void voice.unlockAudio();
    void voice.startRecording();
  };

  const handleUploadSuccess = (document: HubDocument) => {
    const id = getDocumentId(document);
    if (!id) {
      toast.error("The uploaded document is missing its id. Please refresh.");
      return;
    }
    onUploadSuccess({ ...document, _id: id });
    setShowUpload(false);
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground">
      <header className="h-14 border-b border-border/40 px-4 flex items-center justify-between shrink-0 bg-background/85 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {(!isLeftSidebarOpen || isMobile) && onToggleLeftSidebar && (
            <button
              type="button"
              onClick={onToggleLeftSidebar}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-card transition-colors cursor-pointer"
              title="Toggle sidebar"
            >
              <span className="material-symbols-outlined text-[18px]">menu</span>
            </button>
          )}
          <span className="text-xs font-bold text-foreground font-label uppercase tracking-wider">
            {activeThreadId ? "Active Thread" : "New Thread"}
          </span>
          <span className="hidden sm:inline text-[11px] text-muted-foreground font-normal normal-case tracking-normal">
            Upload notes or chat with AI about your materials
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleRightSidebar && (
            <button
              type="button"
              onClick={onToggleRightSidebar}
              className={`p-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-card cursor-pointer ${
                isRightSidebarOpen ? "bg-card text-primary font-bold" : ""
              }`}
              title="Toggle Library"
            >
              <span className="material-symbols-outlined text-[18px]">library_books</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowUpload((value) => !value)}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-border hover:bg-primary/95 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">upload_file</span>
            Upload PDF
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar bg-background"
      >
        {loadingHistory ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground italic">
            <span className="animate-spin material-symbols-outlined mr-2">progress_activity</span>
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div className="min-h-full flex flex-col items-center justify-center px-4 sm:px-8 py-12 max-w-5xl mx-auto w-full">
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-foreground text-center mb-8 tracking-tight uppercase">
              What do you want to know?
            </h1>

            <div className="w-full bg-card border-2 border-border rounded-2xl flex flex-col p-3 shadow-[4px_4px_0_0_rgba(0,0,0,0.15)] focus-within:border-primary transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Ask the AI Study Hub..."
                aria-label="Message AI Study Hub"
                maxLength={MAX_MESSAGE_CHARS}
                rows={1}
                className="w-full bg-transparent border-0 outline-none text-foreground text-sm placeholder:text-muted-foreground resize-none focus:ring-0 px-2 pt-1 pb-1 min-h-[56px] focus:outline-none"
                style={{
                  backgroundColor: "transparent",
                  color: "inherit",
                  border: "none",
                  outline: "none",
                  boxShadow: "none",
                }}
              />

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 px-1 gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf,image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleFileSelectClick}
                    disabled={
                      loading ||
                      uploadingAttachment ||
                      attachments.length >= MAX_ATTACHMENTS
                    }
                    className="bg-background hover:bg-card border border-border px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold text-foreground transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Attach a PDF or image"
                  >
                    <span className="material-symbols-outlined text-[13px] text-primary">attach_file</span>
                    Attach
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startVoiceInput}
                    disabled={loading || uploadingAttachment}
                    className="h-8 w-8 bg-[#1C1C22] border border-cyan-500/50 hover:border-cyan-400 text-cyan-400 flex items-center justify-center rounded-full disabled:opacity-30 transition-colors shrink-0 cursor-pointer"
                    title="Speak instead"
                    aria-label="Start voice input"
                  >
                    <span className="material-symbols-outlined text-[16px]">mic</span>
                  </button>

                  <ModelPicker
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    showModelDropdown={showModelDropdown}
                    setShowModelDropdown={setShowModelDropdown}
                    availableModels={availableModels}
                    placement="up"
                  />

                  {loading ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="h-8 w-8 bg-foreground text-background flex items-center justify-center rounded-full border border-border transition-colors shrink-0 cursor-pointer"
                      aria-label="Stop generating"
                      title="Stop generating"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        stop
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={
                        (!input.trim() && attachments.length === 0) ||
                        uploadingAttachment
                      }
                      className="h-8 w-8 bg-primary hover:bg-primary/95 text-primary-foreground flex items-center justify-center rounded-full disabled:opacity-30 border border-border transition-colors shrink-0 cursor-pointer"
                      aria-label="Send message"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        arrow_upward
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-8">
              <button
                type="button"
                onClick={() => {
                  setInput("Summarize my study materials");
                  textareaRef.current?.focus();
                }}
                className="flex items-start gap-3 p-4 bg-card/45 border-2 border-border hover:border-primary hover:bg-card rounded-xl text-left transition-all cursor-pointer shadow-[3px_3px_0_0_rgba(0,0,0,0.05)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-foreground font-label">Search anything</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-normal">
                    Get fast answers grounded in your uploaded study materials.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInput("Create a customized project template");
                  textareaRef.current?.focus();
                }}
                className="flex items-start gap-3 p-4 bg-card/45 border-2 border-border hover:border-primary hover:bg-card rounded-xl text-left transition-all cursor-pointer shadow-[3px_3px_0_0_rgba(0,0,0,0.05)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">laptop_mac</span>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-foreground flex items-center gap-1.5 font-label">
                    Get work done
                    <span className="text-[9px] bg-primary/25 text-primary px-1 rounded-sm uppercase tracking-wider font-extrabold">
                      NEW
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-normal">
                    Hand off study tasks for quizzes, notes, and project outlines.
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full px-4 sm:px-8 lg:px-10 xl:px-12 py-6 space-y-6">
            {messages
              .filter(isVisibleMessage)
              .map((message, index) => (
                <MessageBubble
                  key={message.id || `msg_${index}`}
                  message={message}
                />
              ))}
            {loading &&
              !(
                messages.length > 0 &&
                messages[messages.length - 1]?.role === "assistant" &&
                Boolean(messages[messages.length - 1]?.content)
              ) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 italic">
                <span className="animate-spin material-symbols-outlined text-[14px]">progress_activity</span>
                AI is thinking...
              </div>
            )}
            {loading &&
              messages.length > 0 &&
              messages[messages.length - 1]?.role === "assistant" &&
              Boolean(messages[messages.length - 1]?.content) && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground px-2 font-mono tracking-wide">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                streaming
              </div>
            )}
          </div>
        )}
      </div>

      {(attachments.length > 0 || uploadingAttachment) && (
        <div className="bg-sidebar border-t border-border/40">
          <div className="w-full px-4 sm:px-8 lg:px-10 xl:px-12 py-2 flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div
                key={att.fileUrl}
                className="relative flex items-center gap-2 bg-card border border-border p-1.5 pr-8 rounded-lg text-xs text-foreground"
              >
                {att.type === "image" ? (
                  // Auth-gated upload URLs must be fetched by the browser with
                  // the user's session cookie, not through Next's image proxy.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.fileUrl}
                    alt={att.filename}
                    loading="lazy"
                    className="h-6 w-6 object-cover rounded border border-border"
                  />
                ) : (
                  <span className="material-symbols-outlined text-red-500 text-[16px]">description</span>
                )}
                <span className="truncate max-w-[120px] font-mono text-[10px]">{att.filename}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="absolute top-1/2 -translate-y-1/2 right-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={`Remove ${att.filename}`}
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            ))}
            {uploadingAttachment && (
              <div className="flex items-center gap-2 bg-card border border-dashed border-border p-1.5 rounded-lg text-xs text-muted-foreground">
                <span className="animate-spin material-symbols-outlined text-[14px]">progress_activity</span>
                <span className="font-mono text-[10px]">Uploading...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="p-4 sm:px-8 lg:px-10 xl:px-12 bg-background border-t border-border/40 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="w-full bg-card border-2 border-border rounded-2xl flex flex-col p-2 focus-within:border-primary transition-colors shadow-[3px_3px_0_0_rgba(0,0,0,0.1)]"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={
                selectedDocumentIds.length > 0
                  ? "Ask about the selected document..."
                  : "Ask follow-up..."
              }
              aria-label="Message AI Study Hub"
              maxLength={MAX_MESSAGE_CHARS}
              rows={1}
              className="w-full bg-transparent border-0 outline-none text-foreground text-sm placeholder:text-muted-foreground resize-none focus:ring-0 px-2 pt-1 pb-1 min-h-[38px] focus:outline-none"
              style={{
                backgroundColor: "transparent",
                color: "inherit",
                border: "none",
                outline: "none",
                boxShadow: "none",
              }}
            />
            <div className="flex items-center justify-between mt-1 px-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="application/pdf,image/png,image/jpeg,image/gif,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleFileSelectClick}
                  disabled={
                    loading ||
                    uploadingAttachment ||
                    attachments.length >= MAX_ATTACHMENTS
                  }
                  className="min-h-10 min-w-10 p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  title="Attach file"
                  aria-label="Attach a PDF or image"
                >
                  <span className="material-symbols-outlined text-[16px]">attach_file</span>
                </button>
                <ModelPicker
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                  showModelDropdown={showModelDropdown}
                  setShowModelDropdown={setShowModelDropdown}
                  availableModels={availableModels}
                  placement="up"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startVoiceInput}
                  disabled={loading || uploadingAttachment}
                  className="h-10 w-10 bg-[#1C1C22] border border-cyan-500/50 hover:border-cyan-400 text-cyan-400 flex items-center justify-center rounded-full disabled:opacity-30 transition-colors shrink-0 cursor-pointer"
                  title="Speak instead"
                  aria-label="Start voice input"
                >
                  <span className="material-symbols-outlined text-[14px]">mic</span>
                </button>
                {loading ? (
                  <button
                    type="button"
                    onClick={handleStopGeneration}
                    className="h-10 w-10 bg-foreground text-background flex items-center justify-center rounded-full border border-border transition-colors shrink-0 cursor-pointer"
                    aria-label="Stop generating"
                    title="Stop generating"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      stop
                    </span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={
                      (!input.trim() && attachments.length === 0) ||
                      uploadingAttachment
                    }
                    className="h-10 w-10 bg-primary hover:bg-primary/95 text-primary-foreground flex items-center justify-center rounded-full border border-border disabled:opacity-30 transition-colors shrink-0 cursor-pointer"
                    aria-label="Send message"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      arrow_upward
                    </span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowUpload(false)} />
          <div
            className="relative w-full max-w-xl bg-card border-2 border-border p-6 rounded-2xl animate-fade-in-up z-[101]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-pdf-title"
          >
            <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-5">
              <h3
                id="upload-pdf-title"
                className="text-sm font-bold text-foreground uppercase tracking-widest font-label"
              >
                Upload PDF Document
              </h3>
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="min-h-10 min-w-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close PDF upload"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <UploadDropzone onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>
      )}

      {voiceHUDOpen && (
        <VoiceHUD
          status={voice.status}
          thinking={(loading || voiceTurnBusy) && voice.status !== "speaking"}
          transcript={voice.transcript}
          onTranscriptChange={(t) => voice.setTranscript(t)}
          onStartRecord={voice.startRecording}
          onStopRecord={voice.stopRecording}
          onBargeIn={() => {
            void voice.bargeIn();
          }}
          onSubmit={(text) => {
            void handleVoiceTurnRef.current(text);
          }}
          onCancel={() => {
            voice.stopListeningOnly();
            voice.stopSpeech();
            setVoiceHUDOpen(false);
          }}
          languages={voice.languages}
          selectedLanguage={voice.selectedLanguage}
          onLanguageChange={(l) => voice.setSelectedLanguage(l)}
          mode="conversation"
        />
      )}
    </div>
  );
}
