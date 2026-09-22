"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import AihubReply from "./AihubReply";
import HubComposer from "./HubComposer";
import { useVoice } from "@/components/voice/useVoice";
import {
  DEFAULT_REASONING_EFFORT,
  type ReasoningEffort,
} from "@/lib/reasoningEffort";
import VoiceHUD from "@/components/voice/VoiceHUD";
import {
  MAX_ATTACHMENTS,
  MAX_MESSAGE_CHARS,
  parseChatAttachment,
  type ChatAttachment,
  type HubDocument,
} from "./types";

interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  /** Chain-of-thought from reasoning models; rendered as a disclosure. */
  reasoning?: string;
  attachments?: ChatAttachment[];
  sentAt?: Date | string;
  streaming?: boolean;
  error?: string;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function newMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function isVisibleMessage(
  message: Message
): message is Message {
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

/**
 * Time-based greeting ("Good morning / afternoon / evening"), including the
 * trailing comma so the markup can hold a single text node.
 *
 * This MUST NOT run during render: the server evaluates it in its own
 * timezone and the client in the visitor's, which produced a hydration text
 * mismatch. Callers compute it in an effect after mount instead.
 */
function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
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
  newChatNonce?: number;
  firstName?: string;
  workflows?: ReadonlyArray<{
    icon: LucideIcon;
    title: string;
    hint: string;
    prompt: string;
  }>;
  /** Sent to the router with each turn; chosen from the header picker. */
  selectedModel?: string;
  /** How hard the model should think; chosen from the header picker. */
  reasoningEffort?: ReasoningEffort;
  /** Fired when the server names a new thread, so the rail can update live. */
  onThreadTitled?: (title: string) => void;
}

export default function UnifiedChat({
  activeThreadId,
  setActiveThreadId,
  onThreadCreated,
  selectedDocumentIds,
  onUploadSuccess,
  draftPrompt,
  onDraftPromptConsumed,
  newChatNonce,
  firstName,
  workflows,
  selectedModel = "primary",
  reasoningEffort = DEFAULT_REASONING_EFFORT,
  onThreadTitled,
}: UnifiedChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  /**
   * Abort any in-flight stream on unmount. Without this the SSE reader keeps
   * running after navigating away and its `bindThread` callback would call
   * parent state setters on an unmounted tree.
   */
  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
      streamAbortRef.current = null;
      isStreamingRef.current = false;
    };
  }, []);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    voiceHUDOpenRef.current = voiceHUDOpen;
  }, [voiceHUDOpen]);

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
          reasoningEffort,
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
      let fullReasoning = "";

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

      const appendReasoning = (delta: string) => {
        fullReasoning += delta;
        const id = assistantMessageId;
        if (!id) {
          // Reasoning can arrive before any content token, so the assistant
          // row has to exist before the first `token` event.
          const newId = newMessageId();
          assistantMessageId = newId;
          streamMsgIdRef.current = newId;
          setMessages((prev) => [
            ...prev,
            {
              id: newId,
              role: "assistant",
              content: "",
              reasoning: delta,
              sentAt: new Date().toISOString(),
              streaming: true,
            },
          ]);
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? { ...m, reasoning: (m.reasoning || "") + delta }
              : m
          )
        );
      };

      const finalizeAssistant = (reply: string, reasoning?: string) => {
        fullReply = reply;
        if (reasoning !== undefined) fullReasoning = reasoning;
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
              reasoning: fullReasoning || undefined,
              sentAt: new Date().toISOString(),
              streaming: false,
            },
          ]);
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  content: reply,
                  reasoning: fullReasoning || m.reasoning,
                  streaming: false,
                  error: undefined,
                }
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
          reasoning?: string;
          title?: string;
        };
        try {
          event = JSON.parse(raw);
        } catch {
          return;
        }

        if (event.type === "meta" && event.threadId) {
          bindThread(event.threadId);
        } else if (event.type === "reasoning" && event.content) {
          appendReasoning(event.content);
        } else if (event.type === "token" && event.content) {
          appendToken(event.content);
        } else if (event.type === "title" && event.title) {
          // Model-written thread name arrives after the reply is persisted.
          onThreadTitled?.(event.title);
        } else if (event.type === "done") {
          receivedDone = true;
          if (event.threadId) bindThread(event.threadId);
          if (event.reply) {
            // Always trust the final reply for consistency with DB
            finalizeAssistant(event.reply, event.reasoning);
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

  /**
   * Seeded with a time-independent greeting so server and client markup
   * agree, then corrected to the local time on mount.
   */
  const [greeting, setGreeting] = useState("Hello,");
  useEffect(() => {
    setGreeting(timeGreeting());
  }, []);
  const visibleMessages = messages.filter(isVisibleMessage);
  const lastMessage = visibleMessages[visibleMessages.length - 1];

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-hub-bg text-hub-text">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-hub-bg"
      >
        {loadingHistory ? (
          <div className="flex h-full items-center justify-center gap-2 text-[13px] text-hub-muted">
            <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-hub-line border-t-[var(--primary)]" />
            Loading conversation…
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="mx-auto flex min-h-full w-full max-w-[740px] flex-col items-center justify-center px-4 py-10 sm:px-6">
            <div className="mb-9 flex flex-col items-center text-center sm:mb-11">
              <div className="mb-7 flex justify-center">
                <div className="ai-orb" aria-hidden />
              </div>
              <p className="mb-2 text-[28px] leading-tight font-semibold tracking-[-0.03em] text-hub-text sm:text-[30px]">
                {greeting} {firstName}
              </p>
              <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.03em] text-hub-text sm:text-[30px] md:text-[32px]">
                How can we help you today?
              </h1>
            </div>

            <div className="w-full max-w-[720px]">
              <HubComposer
                input={input}
                onInputChange={setInput}
                onSubmit={() => void handleSend()}
                textareaRef={textareaRef}
                fileInputRef={fileInputRef}
                onFileSelectClick={handleFileSelectClick}
                onFileChange={handleFileChange}
                attachments={attachments}
                onRemoveAttachment={removeAttachment}
                uploadingAttachment={uploadingAttachment}
                loading={loading}
                onStop={handleStopGeneration}
                onStartVoice={startVoiceInput}
                placeholder={
                  selectedDocumentIds.length > 0
                    ? "Ask about the selected document…"
                    : "Ask a question, paste your notes, or describe what you need…"
                }
                variant="hero"
              />
            </div>

            {workflows && workflows.length > 0 && (
              <div className="mt-10 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {workflows.map((workflow) => {
                  const WorkflowIcon = workflow.icon;
                  return (
                  <button
                    key={workflow.title}
                    type="button"
                    onClick={() => {
                      setInput(workflow.prompt);
                      textareaRef.current?.focus();
                    }}
                    className="group flex cursor-pointer items-start gap-3 rounded-lg border border-hub-line bg-hub-surface/60 p-3.5 text-left transition-colors hover:border-hub-composer-hover hover:bg-hub-surface"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-hub-soft text-[var(--primary)] transition-colors group-hover:bg-[var(--primary)] group-hover:text-[var(--primary-foreground)]">
                      <WorkflowIcon size={16} strokeWidth={1.75} aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[13.5px] font-semibold tracking-[-0.01em] text-hub-text">
                        {workflow.title}
                      </h4>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-hub-muted">
                        {workflow.hint}
                      </p>
                    </div>
                  </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col items-center px-4 py-6 sm:px-6">
            <div className="w-full max-w-[740px] space-y-7">
              {visibleMessages.map((message, index) => (
                  <AihubReply
                    key={message.id || `msg_${index}`}
                    message={message}
                  />
                ))}

              {/*
                Pending indicator for the gap between sending and the first
                event. Once the assistant row exists and is streaming, that
                row owns the thinking state (its reasoning disclosure shows
                "Thinking" with dots), so rendering this too would double it.
              */}
              {loading && !(lastMessage?.role === "assistant" && lastMessage.streaming) && (
                <div className="flex items-center gap-2.5">
                  <span className="relative flex size-4 items-center justify-center" aria-hidden>
                    <span className="ai-thinking-glow" />
                    <span className="ai-pulse-soft">
                      <SparkMark />
                    </span>
                  </span>
                  <span className="ai-thinking-label text-[14px]">Thinking</span>
                  <span className="ai-thinking-dots" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Attachments now render inside the composer card — see HubComposer. */}

      {visibleMessages.length > 0 && (
        <div className="shrink-0 px-4 pt-2 pb-4 sm:px-8 lg:px-10 xl:px-12">
          <div className="mx-auto w-full max-w-[740px]">
            <HubComposer
              input={input}
              onInputChange={setInput}
              onSubmit={() => void handleSend()}
              textareaRef={textareaRef}
              fileInputRef={fileInputRef}
              onFileSelectClick={handleFileSelectClick}
              onFileChange={handleFileChange}
              attachments={attachments}
              onRemoveAttachment={removeAttachment}
              uploadingAttachment={uploadingAttachment}
              loading={loading}
              onStop={handleStopGeneration}
              onStartVoice={startVoiceInput}
              placeholder={
                selectedDocumentIds.length > 0
                  ? "Ask about the selected document…"
                  : "Ask a follow-up…"
              }
              variant="docked"
            />
          </div>
        </div>
      )}

      {voiceHUDOpen && (
        <VoiceHUD
          variant="hub"
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

/** The four-point spark that marks an assistant turn. */
function SparkMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="relative z-10 text-[var(--primary)]"
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
      <path d="M9 9l6 6" />
      <path d="M15 9l-6 6" />
    </svg>
  );
}
