"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import MessageBubble from "@/components/tutor/MessageBubble";
import UploadDropzone from "./UploadDropzone";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  sentAt?: Date | string;
}

interface UnifiedChatProps {
  selectedDocumentIds: string[];
  onUploadSuccess: (document: any) => void;
  draftPrompt: string;
  onDraftPromptConsumed: () => void;
}

export default function UnifiedChat({
  selectedDocumentIds,
  onUploadSuccess,
  draftPrompt,
  onDraftPromptConsumed,
}: UnifiedChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/tutor/history");
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load study hub history");
      } finally {
        setLoadingHistory(false);
      }
    }

    fetchHistory();
  }, []);

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
  }, [messages, loading, showUpload]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) {
      return;
    }

    const userMessageText = input;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessageText, sentAt: new Date().toISOString() },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai-hub/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessageText,
          documentIds: selectedDocumentIds,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to receive response from AI Study Hub");
      }

      const data = await res.json();
      setMessages(data.messages || [
        ...messages,
        { role: "assistant", content: data.reply, sentAt: new Date().toISOString() },
      ]);
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

      <form onSubmit={handleSend} className="border-t border-[#262626] p-4">
        <div className="flex items-end gap-2">
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
            disabled={loading || loadingHistory}
            rows={1}
            className="w-full bg-[#1A1A1A] border border-[#262626] text-white text-sm p-4 focus:border-white focus:outline-none resize-none placeholder:text-[#636565]"
            style={{ minHeight: "56px" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="h-14 w-14 bg-white text-[#0A0A0A] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">arrow_upward</span>
          </button>
        </div>
      </form>
    </section>
  );
}
