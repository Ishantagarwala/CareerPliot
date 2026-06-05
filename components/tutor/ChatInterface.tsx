"use client";

import React, { useState, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  sentAt?: Date | string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/tutor/history");
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load conversation history");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageText = input;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
    }

    const userMessage: Message = {
      role: "user",
      content: userMessageText,
      sentAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessageText }),
      });

      if (!res.ok) {
        throw new Error("Failed to receive response from tutor");
      }

      const data = await res.json();

      if (data.messages) {
        setMessages(data.messages);
      } else {
        const botMessage: Message = {
          role: "assistant",
          content: data.reply,
          sentAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Tutor API error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear your conversation history? This cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch("/api/tutor/history", {
        method: "DELETE",
      });

      if (res.ok) {
        setMessages([]);
        toast.success("Chat history cleared");
      } else {
        throw new Error("Could not clear history");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to clear history");
    }
  };

  const quickActions = [
    { category: "TECHNICAL", title: "Review Python Script", icon: "code", prompt: "Review this Python script and suggest improvements." },
    { category: "PREPARATION", title: "Mock Interview Prep", icon: "co_present", prompt: "Help me prepare for a technical interview. Ask me mock questions." },
    { category: "THEORY", title: "System Design Concepts", icon: "architecture", prompt: "Explain key system design concepts like load balancing and microservices." },
    { category: "STRATEGY", title: "Leadership Scenarios", icon: "leaderboard", prompt: "Suggest a simple project to build for Python beginner stage." },
  ];

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] relative">
      {/* Chat Canvas */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-12 py-8 pb-32 flex flex-col items-center"
      >
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="h-8 w-8 border-2 border-[#262626] border-t-white animate-spin" />
            <p className="text-xs text-[#8e9192]">Loading conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <>
            {/* Empty State / Greeting */}
            <div className="w-full max-w-3xl flex flex-col items-center text-center space-y-6 mb-12 animate-fade-in-up">
              <div className="w-16 h-16 border border-[#262626] bg-[#1A1A1A] flex items-center justify-center animate-border-pulse">
                <span className="material-symbols-outlined text-[32px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                  psychology
                </span>
              </div>
              <h2
                className="text-3xl md:text-5xl font-bold text-white tracking-tight"
                style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
              >
                How can I assist your learning today?
              </h2>
              <p className="text-lg text-[#c4c7c8] max-w-xl">
                I am your dedicated AI Tutor. Provide a topic, paste a problem, or select a quick action below to begin our session.
              </p>
            </div>

            {/* Quick Action Bento Grid */}
            <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(action.prompt);
                    textareaRef.current?.focus();
                  }}
                  className="group flex flex-col items-start p-6 bg-[#131313] border border-[#262626] hover:border-[#404040] hover:bg-[#1A1A1A] transition-colors text-left relative overflow-hidden h-32 animate-fade-in-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-[48px]">{action.icon}</span>
                  </div>
                  <span
                    className="text-[11px] text-[#8e9192] mb-2 uppercase tracking-[0.15em]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {action.category}
                  </span>
                  <h3
                    className="text-lg font-bold text-white"
                    style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                  >
                    {action.title}
                  </h3>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="w-full max-w-3xl space-y-4">
            {messages.map((msg, index) => (
              <MessageBubble key={index} message={msg} />
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex w-full justify-start mb-4">
                <div className="flex items-start gap-2.5 max-w-[75%]">
                  <div className="h-8 w-8 border border-[#262626] bg-[#1A1A1A] flex items-center justify-center shrink-0">
                    <span
                      className="text-xs font-bold text-white"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      AI
                    </span>
                  </div>
                  <div className="bg-[#1A1A1A] border border-[#262626] p-4 flex items-center gap-1.5 py-3 px-4">
                    <span className="h-2 w-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Bottom Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A]/90 backdrop-blur-md border-t border-[#262626] p-4 md:p-6 z-40">
        <div className="max-w-3xl mx-auto relative flex items-end gap-2">
          <form onSubmit={handleSend} className="flex-1 relative">
            <label className="sr-only" htmlFor="ai-input">Message AI Tutor</label>
            <textarea
              ref={textareaRef}
              id="ai-input"
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Message AI Tutor..."
              disabled={loading || loadingHistory}
              rows={1}
              className="w-full bg-[#1A1A1A] border border-[#262626] text-white text-sm p-4 pr-24 focus:border-white focus:ring-0 focus:outline-none resize-none overflow-hidden transition-colors placeholder:text-[#636565]"
              style={{ minHeight: "56px" }}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 bg-white text-[#0A0A0A] hover:bg-[#e2e2e2] transition-colors flex items-center justify-center h-10 w-10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  arrow_upward
                </span>
              </button>
            </div>
          </form>
        </div>
        <div className="max-w-3xl mx-auto mt-2 flex items-center justify-between">
          <span
            className="text-[10px] text-[#636565]"
            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
          >
            AI can make mistakes. Verify important information.
          </span>
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-[10px] text-[#636565] hover:text-[#ffb4ab] transition-colors flex items-center gap-1"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
            >
              <span className="material-symbols-outlined text-[12px]">delete</span>
              Clear History
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
