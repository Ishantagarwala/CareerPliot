"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import MessageBubble from "@/components/tutor/MessageBubble";
import UploadDropzone from "./UploadDropzone";
import { useVoice } from "@/components/voice/useVoice";
import VoiceHUD from "@/components/voice/VoiceHUD";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: {
    type: "pdf" | "image";
    filename: string;
    fileUrl: string;
    docId?: string;
  }[];
  sentAt?: Date | string;
}

type ModelSelection = "primary" | "opus" | "gemini";

interface UnifiedChatProps {
  activeThreadId: string | null;
  setActiveThreadId: (id: string | null) => void;
  onThreadCreated: () => void;
  selectedDocumentIds: string[];
  onUploadSuccess: (document: any) => void;
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

  // Voice Chat States
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [voiceHUDOpen, setVoiceHUDOpen] = useState(false);
  const voice = useVoice();

  const [isMobile, setIsMobile] = useState(false);

  const [selectedModel, setSelectedModel] = useState<string>("primary");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            const preferred = process.env.NEXT_PUBLIC_LLM_ROUTER_MODEL?.trim();
            const defaultModel =
              (typeof data.defaultModel === "string" && data.defaultModel) ||
              (preferred && data.models.includes(preferred) && preferred) ||
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
    if (!activeThreadId) {
      setMessages([]);
      setInput("");
      setLoadingHistory(false);
      return;
    }

    async function fetchHistory() {
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/ai-hub/threads/${activeThreadId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        } else {
          toast.error("Failed to load conversation history");
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load conversation history");
      } finally {
        setLoadingHistory(false);
      }
    }

    fetchHistory();
  }, [activeThreadId, newChatNonce]);

  useEffect(() => {
    if (draftPrompt) {
      setInput(draftPrompt);
      textareaRef.current?.focus();
      onDraftPromptConsumed();
    }
  }, [draftPrompt, onDraftPromptConsumed]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, showUpload, attachments, uploadingAttachment]);

  const handleFileSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

    if (!isImage && !isPdf) {
      toast.error("Unsupported file type. Please upload a PDF or an Image.");
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

      const uploaded = await res.json();

      if (uploaded.type === "pdf") {
        onUploadSuccess(uploaded);
      }

      setAttachments((prev) => [
        ...prev,
        {
          type: uploaded.type,
          filename: uploaded.filename,
          fileUrl: uploaded.fileUrl,
          docId: uploaded.docId,
        },
      ]);
      toast.success(`${file.name} uploaded successfully.`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload attachment");
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

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText !== undefined ? customText : input;
    if ((!textToSend.trim() && attachments.length === 0) || loading) {
      return;
    }

    const userMessageText = textToSend;
    const currentAttachments = [...attachments];

    setInput("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content:
          userMessageText ||
          (currentAttachments.length > 0
            ? `[Attached ${currentAttachments[0].type}: ${currentAttachments[0].filename}]`
            : ""),
        attachments: currentAttachments,
        sentAt: new Date().toISOString(),
      },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai-hub/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            userMessageText ||
            (currentAttachments.length > 0
              ? `Analyze the attached ${currentAttachments[0].type}`
              : "Analyze the attached file"),
          documentIds: selectedDocumentIds,
          threadId: activeThreadId,
          attachments: currentAttachments,
          modelSelection: selectedModel,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to receive response from AI Study Hub");
      }

      if (!res.body) {
        throw new Error("No response stream from AI Study Hub");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedThreadId: string | null = null;
      let fullReply = "";
      let assistantStarted = false;

      const appendToken = (token: string) => {
        fullReply += token;
        if (!assistantStarted) {
          assistantStarted = true;
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: token,
              sentAt: new Date().toISOString(),
            },
          ]);
          return;
        }
        setMessages((prev) => {
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === "assistant") {
              next[i] = { ...next[i], content: next[i].content + token };
              break;
            }
          }
          return next;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const line = chunk
            .split("\n")
            .map((l) => l.trim())
            .find((l) => l.startsWith("data:"));
          if (!line) continue;
          const raw = line.replace(/^data:\s?/, "");
          if (!raw || raw === "[DONE]") continue;

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
            continue;
          }

          if (event.type === "meta" && event.threadId) {
            streamedThreadId = event.threadId;
            if (!activeThreadId) {
              setActiveThreadId(event.threadId);
              onThreadCreated();
            }
          } else if (event.type === "token" && event.content) {
            appendToken(event.content);
          } else if (event.type === "done") {
            if (event.threadId) {
              streamedThreadId = event.threadId;
              if (!activeThreadId) {
                setActiveThreadId(event.threadId);
                onThreadCreated();
              }
            }
            if (event.reply && !fullReply) {
              fullReply = event.reply;
              setMessages((prev) => {
                const next = [...prev];
                if (!assistantStarted) {
                  assistantStarted = true;
                  next.push({
                    role: "assistant",
                    content: event.reply || "",
                    sentAt: new Date().toISOString(),
                  });
                  return next;
                }
                for (let i = next.length - 1; i >= 0; i--) {
                  if (next[i].role === "assistant") {
                    next[i] = { ...next[i], content: event.reply || "" };
                    break;
                  }
                }
                return next;
              });
            }
          } else if (event.type === "error") {
            throw new Error(event.message || "AI Study Hub stream error");
          }
        }
      }

      if (!fullReply.trim() && !assistantStarted) {
        // Keep thinking state only — no empty bubble
      }

      if (streamedThreadId && !activeThreadId) {
        setActiveThreadId(streamedThreadId);
        onThreadCreated();
      }

      if (isVoiceChatActive && fullReply) {
        voice.speakText(fullReply);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "AI Study Hub error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (document: any) => {
    onUploadSuccess(document);
    setShowUpload(false);
    toast.success("Document added to AI Study Hub");
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar bg-background">
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
                    handleSend();
                  }
                }}
                placeholder="Ask the AI Study Hub..."
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
                    accept="image/*,application/pdf"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleFileSelectClick}
                    className="bg-background hover:bg-card border border-border px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold text-foreground transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[13px] text-primary">attach_file</span>
                    Attach
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVoiceChatActive(true);
                      setVoiceHUDOpen(true);
                      voice.startRecording();
                    }}
                    disabled={loading || uploadingAttachment}
                    className="h-8 w-8 bg-[#1C1C22] border border-cyan-500/50 hover:border-cyan-400 text-cyan-400 flex items-center justify-center rounded-full disabled:opacity-30 transition-colors shrink-0 cursor-pointer"
                    title="Speak instead"
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

                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={(!input.trim() && attachments.length === 0) || loading || uploadingAttachment}
                    className="h-8 w-8 bg-primary hover:bg-primary/95 text-primary-foreground flex items-center justify-center rounded-full disabled:opacity-30 border border-border transition-colors shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                  </button>
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
              .filter((message) => message.role !== "system")
              .map((message, index) => (
                <MessageBubble key={index} message={message as any} />
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
                key={idx}
                className="relative flex items-center gap-2 bg-card border border-border p-1.5 pr-8 rounded-lg text-xs text-foreground"
              >
                {att.type === "image" ? (
                  <img
                    src={att.fileUrl}
                    alt={att.filename}
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
              handleSend();
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
                  handleSend();
                }
              }}
              placeholder={
                selectedDocumentIds.length > 0
                  ? "Ask about the selected document..."
                  : "Ask follow-up..."
              }
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
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleFileSelectClick}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded-full transition-colors cursor-pointer"
                  title="Attach file"
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
                  onClick={() => {
                    setIsVoiceChatActive(true);
                    setVoiceHUDOpen(true);
                    voice.startRecording();
                  }}
                  disabled={loading || uploadingAttachment}
                  className="h-7 w-7 bg-[#1C1C22] border border-cyan-500/50 hover:border-cyan-400 text-cyan-400 flex items-center justify-center rounded-full disabled:opacity-30 transition-colors shrink-0 cursor-pointer"
                  title="Speak instead"
                >
                  <span className="material-symbols-outlined text-[14px]">mic</span>
                </button>
                <button
                  type="submit"
                  disabled={(!input.trim() && attachments.length === 0) || loading || uploadingAttachment}
                  className="h-7 w-7 bg-primary hover:bg-primary/95 text-primary-foreground flex items-center justify-center rounded-full border border-border disabled:opacity-30 transition-colors shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowUpload(false)} />
          <div className="relative w-full max-w-xl bg-card border-2 border-border p-6 rounded-2xl animate-fade-in-up z-[101]">
            <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-5">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-widest font-label">
                Upload PDF Document
              </h3>
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
          transcript={voice.transcript}
          onTranscriptChange={(t) => voice.setTranscript(t)}
          onStartRecord={voice.startRecording}
          onStopRecord={voice.stopRecording}
          onSubmit={(text) => {
            setVoiceHUDOpen(false);
            handleSend(undefined, text);
          }}
          onCancel={() => {
            voice.stopSpeech();
            setVoiceHUDOpen(false);
            setIsVoiceChatActive(false);
          }}
          languages={voice.languages}
          selectedLanguage={voice.selectedLanguage}
          onLanguageChange={(l) => voice.setSelectedLanguage(l)}
        />
      )}
    </div>
  );
}
