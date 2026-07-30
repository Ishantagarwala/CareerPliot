"use client";

import React, { useState, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import { toast } from "sonner";
import { useVoice } from "@/components/voice/useVoice";
import VoiceHUD from "@/components/voice/VoiceHUD";

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

  // Voice Chat States
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [voiceHUDOpen, setVoiceHUDOpen] = useState(false);
  const voice = useVoice();

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

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText !== undefined ? customText : input;
    if (!textToSend.trim() || loading) return;

    const userMessageText = textToSend;
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

      let replyText = "";
      if (data.messages) {
        setMessages(data.messages);
        const lastMsg = data.messages[data.messages.length - 1];
        if (lastMsg && lastMsg.role === "assistant") {
          replyText = lastMsg.content;
        }
      } else {
        const botMessage: Message = {
          role: "assistant",
          content: data.reply,
          sentAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, botMessage]);
        replyText = data.reply;
      }

      if (isVoiceChatActive && replyText) {
        voice.speakText(replyText);
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
          <div className="w-full space-y-1">
            {messages.map((msg, index) => (
              <MessageBubble key={index} message={msg} />
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex w-full justify-start mb-3 animate-fade-in-up">
                <div className="flex items-start gap-3.5 w-full max-w-lg">
                  <div className="h-8 w-8 bg-[#1A1A1A] border border-cyan-500/50 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.3)] animate-pulse">
                    <span className="material-symbols-outlined text-[18px] text-cyan-400">psychology</span>
                  </div>
                  <div className="bg-[#101012] border border-[#262626] p-4 flex items-center gap-3.5 rounded-[6px] shadow-lg">
                    {/* Glowing concentric rotating web spinner */}
                    <div className="relative h-6 w-6 animate-spin-slow">
                      <svg viewBox="0 0 40 40" className="w-full h-full text-cyan-500 fill-none stroke-current" strokeWidth="1.5">
                        <circle cx="20" cy="20" r="16" strokeDasharray="6,4" className="opacity-80" />
                        <circle cx="20" cy="20" r="10" strokeDasharray="4,3" className="opacity-60" />
                        <circle cx="20" cy="20" r="4" className="opacity-40" />
                        <path d="M20,0 L20,40 M0,20 L40,20 M6,6 L34,34 M6,34 L34,6" className="opacity-30" strokeWidth="0.5" />
                      </svg>
                      <div className="absolute inset-0 rounded-full border border-red-500/30 animate-ping opacity-60" />
                    </div>
                    <span className="text-xs text-[#8e9192] font-mono tracking-wide">
                      CareerPilot AI is analysing your career path...
                    </span>
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
                type="button"
                onClick={() => {
                  setIsVoiceChatActive(true);
                  setVoiceHUDOpen(true);
                  voice.startRecording();
                }}
                disabled={loading || loadingHistory}
                className="p-2 bg-[#1C1C22] border border-cyan-500/50 hover:border-cyan-400 text-cyan-400 transition-colors flex items-center justify-center h-10 w-10 disabled:opacity-30 disabled:cursor-not-allowed rounded-full cursor-pointer"
                title="Speak instead"
              >
                <span className="material-symbols-outlined text-[20px]">mic</span>
              </button>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 bg-white text-[#0A0A0A] hover:bg-[#e2e2e2] transition-colors flex items-center justify-center h-10 w-10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
              className="text-[10px] text-[#636565] hover:text-[#ffb4ab] transition-colors flex items-center gap-1 cursor-pointer"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
            >
              <span className="material-symbols-outlined text-[12px]">delete</span>
              Clear History
            </button>
          )}
        </div>
      </div>

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
