"use client";

import React, { useState, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, Trash2, Sparkles, MessageSquare, Loader2 } from "lucide-react";
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

  // Auto scroll to bottom
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
    
    // Add user message to local state immediately
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
      
      // Update with the full history returned, or append assistant message
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 h-[calc(100vh-200px)] min-h-[500px]">
      {/* Left panel: Tutor Info & Clear Actions */}
      <div className="md:col-span-1 flex flex-col justify-between h-full bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h2 className="font-heading text-lg font-bold text-foreground">AI Study Tutor</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your 24/7 learning assistant. Ask me questions about concepts, request code explanations, or paste errors to debug together.
            </p>
            <div className="p-3.5 bg-muted/50 border border-border/50 rounded-xl space-y-2 text-[10px] text-muted-foreground">
              <span className="font-bold text-foreground block mb-1">Try asking:</span>
              <p className="hover:text-primary cursor-pointer transition-colors" onClick={() => setInput("Explain the difference between SQL and NoSQL databases.")}>
                "Explain SQL vs NoSQL"
              </p>
              <p className="hover:text-primary cursor-pointer transition-colors" onClick={() => setInput("Explain closure in JavaScript with an example.")}>
                "What is a JS closure?"
              </p>
              <p className="hover:text-primary cursor-pointer transition-colors" onClick={() => setInput("Suggest a simple project to build for Python beginner stage.")}>
                "Project ideas for Python"
              </p>
            </div>
          </div>
        </div>

        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearHistory}
            className="w-full font-semibold border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center justify-center gap-1.5 mt-6"
          >
            <Trash2 className="h-4 w-4" /> Clear Conversation
          </Button>
        )}
      </div>

      {/* Right panel: Active Chat feed */}
      <div className="md:col-span-3 flex flex-col h-full bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-border/50 bg-zinc-50/50 dark:bg-zinc-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-foreground">Active Chat Session</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" /> Powered by GPT-4o-Mini
          </span>
        </div>

        {/* Message Feed */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/20"
        >
          {loadingHistory ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-bounce">
                <MessageSquare className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-bold text-foreground">Start a Conversation</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Say hi or ask any academic or programming question to begin learning with your AI Tutor.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <MessageBubble key={index} message={msg} />
            ))
          )}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex w-full justify-start mb-4">
              <div className="flex items-start gap-2.5 max-w-[75%] flex-row">
                <div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted border border-border text-muted-foreground shrink-0 shadow-sm">
                  <span className="text-xs font-heading font-extrabold text-primary">AI</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1 py-3 px-4">
                    <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 bg-primary/80 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <CardFooter className="p-4 border-t border-border/50 bg-zinc-50/50 dark:bg-zinc-950/20">
          <form onSubmit={handleSend} className="flex w-full gap-2.5">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question, request code examples, or debug a script..."
              disabled={loading || loadingHistory}
              className="flex-1 rounded-xl bg-card border-border shadow-none focus-visible:ring-primary font-medium text-sm h-11"
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-11 px-4.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0"
            >
              <Send className="h-4 w-4" /> Send
            </Button>
          </form>
        </CardFooter>
      </div>
    </div>
  );
}
