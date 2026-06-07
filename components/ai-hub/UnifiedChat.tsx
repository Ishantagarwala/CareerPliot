"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import MessageBubble from "@/components/tutor/MessageBubble";
import UploadDropzone from "./UploadDropzone";

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

interface UnifiedChatProps {
  activeThreadId: string | null;
  setActiveThreadId: (id: string | null) => void;
  onThreadCreated: () => void;
  selectedDocumentIds: string[];
  onUploadSuccess: (document: any) => void;
  draftPrompt: string;
  onDraftPromptConsumed: () => void;
}

export default function UnifiedChat({
  activeThreadId,
  setActiveThreadId,
  onThreadCreated,
  selectedDocumentIds,
  onUploadSuccess,
  draftPrompt,
  onDraftPromptConsumed,
}: UnifiedChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // File attachments states
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with activeThreadId
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
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
  }, [activeThreadId]);

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

      // If it is a PDF, also register in main document library
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || loading) {
      return;
    }

    const userMessageText = input;
    const currentAttachments = [...attachments];

    setInput("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
    }

    // Optimistically update message bubble with attachment info
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessageText || (currentAttachments.length > 0 ? `[Attached ${currentAttachments[0].type}: ${currentAttachments[0].filename}]` : ""),
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
          message: userMessageText || (currentAttachments.length > 0 ? `Analyze the attached ${currentAttachments[0].type}` : "Analyze the attached file"),
          documentIds: selectedDocumentIds,
          threadId: activeThreadId,
          attachments: currentAttachments,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to receive response from AI Study Hub");
      }

      const data = await res.json();
      setMessages(data.messages);

      if (!activeThreadId && data.threadId) {
        setActiveThreadId(data.threadId);
        onThreadCreated();
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
      textareaRef.current.style.height = "56px";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <section className="flex flex-col h-[calc(100vh-220px)] min-h-[560px] bg-[#0A0A0A] border border-[#262626]">
      <div className="border-b border-[#262626] p-4 flex items-center justify-between gap-3">
        <div>
          <p
            className="text-[11px] text-[#8e9192] uppercase tracking-[0.15em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Unified Tutor + Notes
          </p>
          <h2 className="font-bold text-white">AI Study Hub Chat</h2>
        </div>
        <button
          onClick={() => setShowUpload((value) => !value)}
          className="inline-flex items-center gap-1.5 bg-white text-[#0A0A0A] px-3 py-2 text-xs font-bold hover:bg-[#e2e2e2]"
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
        >
          <span className="material-symbols-outlined text-[16px]">attach_file</span>
          {showUpload ? "Close Upload" : "Upload PDF"}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {showUpload && (
          <div className="max-w-2xl mx-auto">
            <UploadDropzone onUploadSuccess={handleUploadSuccess} />
          </div>
        )}

        {loadingHistory ? (
          <div className="flex h-full items-center justify-center text-sm text-[#8e9192]">
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto">
            <div className="h-16 w-16 border border-[#262626] bg-[#1A1A1A] flex items-center justify-center text-white mb-5">
              <span className="material-symbols-outlined text-[32px]">auto_awesome</span>
            </div>
            <h3 className="text-2xl font-bold text-white">Ask anything, with or without notes.</h3>
            <p className="text-sm text-[#8e9192] mt-3">
              Upload PDFs, select them as context, then ask for explanations, summaries, quizzes, or general tutor help.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages
              .filter((message) => message.role !== "system")
              .map((message, index) => (
                <MessageBubble key={index} message={message as any} />
              ))}
            {loading && (
              <div className="text-sm text-[#8e9192] px-2">AI is thinking...</div>
            )}
          </div>
        )}
      </div>

      {/* Attachments inline preview */}
      {(attachments.length > 0 || uploadingAttachment) && (
        <div className="px-4 py-2.5 border-t border-[#262626] flex flex-wrap gap-2.5 bg-[#0F0F0F]">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="relative flex items-center gap-2 bg-[#1A1A1A] border border-[#262626] p-2 pr-8 text-xs text-white"
            >
              {att.type === "image" ? (
                <div className="h-8 w-8 relative overflow-hidden bg-black border border-[#404040]">
                  <img src={att.fileUrl} alt={att.filename} className="h-full w-full object-cover" />
                </div>
              ) : (
                <span className="material-symbols-outlined text-red-500 text-[18px]">description</span>
              )}
              <span className="truncate max-w-[150px] font-mono text-[11px]" title={att.filename}>
                {att.filename}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="absolute top-1/2 -translate-y-1/2 right-2 text-[#8e9192] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ))}

          {uploadingAttachment && (
            <div className="flex items-center gap-2 bg-[#1A1A1A] border border-dashed border-[#404040] p-2 text-xs text-[#8e9192]">
              <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
              <span className="font-mono text-[11px]">Uploading file...</span>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSend} className="border-t border-[#262626] p-4">
        <div className="flex items-end gap-2">
          {/* File Input and Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,application/pdf"
            className="hidden"
          />
          <button
            type="button"
            disabled={loading || uploadingAttachment}
            onClick={handleFileSelectClick}
            className="h-14 w-14 border border-[#262626] bg-[#1A1A1A] hover:bg-[#262626] disabled:opacity-30 text-[#8e9192] hover:text-white flex items-center justify-center transition-colors"
            title="Attach file (image or PDF)"
          >
            <span className="material-symbols-outlined text-[20px]">attach_file</span>
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={
              selectedDocumentIds.length > 0
                ? "Ask about the selected document..."
                : "Ask the AI Study Hub..."
            }
            disabled={loading || loadingHistory || uploadingAttachment}
            rows={1}
            className="w-full bg-[#1A1A1A] border border-[#262626] text-white text-sm p-4 focus:border-white focus:outline-none resize-none placeholder:text-[#636565]"
            style={{ minHeight: "56px" }}
          />
          <button
            type="submit"
            disabled={(!input.trim() && attachments.length === 0) || loading || uploadingAttachment}
            className="h-14 w-14 bg-white text-[#0A0A0A] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">arrow_upward</span>
          </button>
        </div>
      </form>
    </section>
  );
}
