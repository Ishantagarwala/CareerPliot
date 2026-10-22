"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Mic, Send, Square, Award } from "lucide-react";
import { toast } from "sonner";
import { useVoice } from "@/components/voice/useVoice";
import {
  DIFFICULTY_LABELS,
  TYPE_LABELS,
  type InterviewSession,
} from "./types";

interface InterviewRoomProps {
  session: InterviewSession;
  scoring: boolean;
  onUpdate: (session: InterviewSession) => void;
  onFinish: () => void;
  onExit: () => void;
}

const labelStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: "0.06em",
} as const;

export default function InterviewRoom({
  session,
  scoring,
  onUpdate,
  onFinish,
  onExit,
}: InterviewRoomProps) {
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const voice = useVoice({
    silenceMs: 1500,
    onUtteranceEnd: (text) => {
      setAnswer((previous) => (previous ? `${previous} ${text}` : text));
    },
  });

  const listening = voice.status === "listening";
  const transcribing = voice.status === "processing";

  const answered = session.turns.filter((turn) => turn.role === "candidate").length;
  const complete = answered >= session.maxQuestions;
  const questionNumber = Math.min(answered + 1, session.maxQuestions);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session.turns.length, pendingAnswer]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const send = async () => {
    const text = answer.trim();
    if (!text || sending || transcribing) return;

    setSending(true);
    setPendingAnswer(text);
    voice.stopListeningOnly();

    try {
      const res = await fetch(`/api/interview/${session._id}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: text }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Could not send that answer.");
      }

      setAnswer("");
      onUpdate(data.session as InterviewSession);
      if (data.complete) {
        toast.info("All questions answered — generate your feedback when you're ready.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send that answer.");
    } finally {
      setSending(false);
      setPendingAnswer(null);
      textareaRef.current?.focus();
    }
  };

  const toggleMic = async () => {
    if (listening) {
      voice.stopRecording();
      return;
    }
    await voice.startRecording();
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border p-4 sm:p-5 flex flex-wrap items-center gap-4 justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2
              className="text-lg font-bold text-foreground truncate"
              style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
            >
              {session.role}
            </h2>
            <span
              className="text-[9px] uppercase font-bold border border-border px-1.5 py-0.5 text-muted-foreground"
              style={labelStyle}
            >
              {TYPE_LABELS[session.interviewType]} · {DIFFICULTY_LABELS[session.difficulty]}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1" style={labelStyle}>
            {complete ? "All questions answered" : `Question ${questionNumber} of ${session.maxQuestions}`}
            {session.company ? ` · ${session.company}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors text-[10px] uppercase font-bold"
            style={labelStyle}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Leave
          </button>
          <button
            type="button"
            onClick={onFinish}
            disabled={scoring || answered === 0 || sending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground border-2 border-black text-[10px] uppercase font-bold shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_0_#000]"
            style={labelStyle}
          >
            {scoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />}
            {scoring ? "Scoring…" : "Get feedback"}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div
        className="h-1.5 w-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={session.maxQuestions}
        aria-valuenow={answered}
        aria-label="Interview progress"
      >
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(100, (answered / session.maxQuestions) * 100)}%` }}
        />
      </div>

      <div className="border border-border bg-card/30 p-4 sm:p-6 space-y-4 max-h-[58vh] overflow-y-auto">
        {session.turns.map((turn, index) => {
          const isInterviewer = turn.role === "interviewer";
          return (
            <div
              key={`${index}-${turn.createdAt ?? ""}`}
              className={`flex ${isInterviewer ? "justify-start" : "justify-end"}`}
            >
              <div className={`max-w-[85%] sm:max-w-[75%] space-y-1`}>
                <span
                  className={`block text-[9px] uppercase font-bold text-muted-foreground ${isInterviewer ? "" : "text-right"}`}
                  style={labelStyle}
                >
                  {isInterviewer ? "Interviewer" : "You"}
                </span>
                <div
                  className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    isInterviewer
                      ? "bg-background border border-border text-foreground"
                      : "bg-foreground text-background"
                  }`}
                >
                  {turn.content}
                </div>
              </div>
            </div>
          );
        })}

        {pendingAnswer && (
          <div className="flex justify-end">
            <div className="max-w-[85%] sm:max-w-[75%] space-y-1">
              <span
                className="block text-[9px] uppercase font-bold text-muted-foreground text-right"
                style={labelStyle}
              >
                You
              </span>
              <div className="px-4 py-3 text-sm leading-relaxed bg-foreground/70 text-background whitespace-pre-line">
                {pendingAnswer}
              </div>
            </div>
          </div>
        )}

        {sending && (
          <div className="flex items-center gap-2 text-muted-foreground pl-1" aria-live="polite">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce motion-reduce:animate-none [animation-delay:-.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce motion-reduce:animate-none [animation-delay:-.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce motion-reduce:animate-none" />
            </span>
            <span className="text-[10px] uppercase font-bold" style={labelStyle}>
              Interviewer is thinking
            </span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {complete ? (
        <div className="border-2 border-dashed border-border bg-card/40 p-6 text-center space-y-3">
          <p className="text-sm text-foreground font-bold">That&apos;s every question.</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Generate your report to see a score, the strengths worth keeping, and what to fix before the real one.
          </p>
          <button
            type="button"
            onClick={onFinish}
            disabled={scoring}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground border-2 border-black text-xs font-bold uppercase shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
            style={labelStyle}
          >
            {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
            {scoring ? "Scoring your answers…" : "Generate my feedback"}
          </button>
        </div>
      ) : (
        <div className="border border-border bg-card p-3 space-y-2">
          <label htmlFor="interview-answer" className="sr-only">
            Your answer
          </label>
          <textarea
            id="interview-answer"
            ref={textareaRef}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={3}
            maxLength={6000}
            disabled={sending}
            placeholder={listening ? "Listening… speak, then pause." : "Answer as you would out loud. Enter to send, Shift+Enter for a new line."}
            className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void toggleMic()}
                disabled={sending || transcribing}
                aria-pressed={listening}
                aria-label={listening ? "Stop recording" : "Answer by voice"}
                title={listening ? "Stop recording" : "Answer by voice"}
                className={`inline-flex items-center justify-center h-9 w-9 border transition-colors disabled:opacity-40 ${
                  listening
                    ? "bg-destructive/15 border-destructive text-destructive"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                }`}
              >
                {transcribing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : listening ? (
                  <Square className="h-3.5 w-3.5" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
              <span className="text-[10px] text-muted-foreground" style={labelStyle}>
                {voice.error
                  ? voice.error
                  : listening
                    ? "Recording — tap to stop"
                    : transcribing
                      ? "Transcribing…"
                      : "Speak your answer"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground tabular-nums hidden sm:inline" style={labelStyle}>
                {answer.length}/6000
              </span>
              <button
                type="button"
                onClick={() => void send()}
                disabled={!answer.trim() || sending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground border-2 border-black text-[10px] uppercase font-bold shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_0_#000]"
                style={labelStyle}
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
