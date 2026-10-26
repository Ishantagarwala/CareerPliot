"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import PageLoader from "@/components/layout/PageLoader";
import InterviewSetup from "@/components/interview/InterviewSetup";
import InterviewRoom from "@/components/interview/InterviewRoom";
import InterviewReport from "@/components/interview/InterviewReport";
import type {
  InterviewSession,
  InterviewSummary,
  NewInterviewConfig,
} from "@/components/interview/types";

type View = "setup" | "room" | "report";

const labelStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: "0.06em",
} as const;

export default function InterviewPage() {
  const [history, setHistory] = useState<InterviewSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [defaultRole, setDefaultRole] = useState("");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [view, setView] = useState<View>("setup");
  const [starting, setStarting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [opening, setOpening] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/interview");
      if (!res.ok) throw new Error("Failed to load interviews");
      const data = await res.json();
      setHistory(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (error) {
      console.error(error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Prefill the role from the career path the student already chose.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/career/recommendations");
        if (!res.ok) return;
        const list = await res.json();
        if (cancelled || !Array.isArray(list)) return;
        const selected = list.find((item: { selected?: boolean }) => item.selected);
        if (selected?.careerPath) setDefaultRole(selected.careerPath);
      } catch {
        /* the field simply stays empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const start = async (config: NewInterviewConfig) => {
    setStarting(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not start the interview.");

      setSession(data as InterviewSession);
      setView("room");
      void loadHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the interview.");
    } finally {
      setStarting(false);
    }
  };

  const open = async (id: string) => {
    setOpening(true);
    try {
      const res = await fetch(`/api/interview/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not open that interview.");

      const opened = data as InterviewSession;
      setSession(opened);
      setView(opened.status === "completed" && opened.scorecard ? "report" : "room");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open that interview.");
    } finally {
      setOpening(false);
    }
  };

  const finish = async () => {
    if (!session) return;
    setScoring(true);
    try {
      const res = await fetch(`/api/interview/${session._id}/finish`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not score the interview.");

      setSession(data.session as InterviewSession);
      setView("report");
      void loadHistory();
      toast.success("Your report is ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not score the interview.");
    } finally {
      setScoring(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this interview and its report?")) return;
    try {
      const res = await fetch(`/api/interview/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete that interview.");
      setHistory((previous) => previous.filter((item) => item._id !== id));
      if (session?._id === id) {
        setSession(null);
        setView("setup");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete that interview.");
    }
  };

  const backToSetup = () => {
    setSession(null);
    setView("setup");
    void loadHistory();
  };

  return (
    <div className="space-y-6">
      <div className="border-b-2 border-black dark:border-[#383d45] pb-5">
        <h1 className="text-2xl sm:text-3xl font-display font-black text-foreground tracking-tight uppercase flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl border-2 border-black bg-primary text-black flex items-center justify-center text-lg shadow-[2px_2px_0_0_#000]">
            🎙️
          </span>
          <span>AI Mock Interview Simulator</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-2xl font-sans">
          A real interactive interview simulator: the AI interviewer reacts to your speech, asks structured follow-up questions, and scores your transcript on 5 critical competency dimensions.
        </p>
      </div>

      {opening ? (
        <PageLoader label="Opening interview" />
      ) : view === "room" && session ? (
        <InterviewRoom
          session={session}
          scoring={scoring}
          onUpdate={setSession}
          onFinish={() => void finish()}
          onExit={backToSetup}
        />
      ) : view === "report" && session ? (
        <InterviewReport session={session} onRestart={backToSetup} onExit={backToSetup} />
      ) : (
        <InterviewSetup
          defaultRole={defaultRole}
          starting={starting}
          history={history}
          historyLoading={historyLoading}
          onStart={(config) => void start(config)}
          onOpen={(id) => void open(id)}
          onDelete={(id) => void remove(id)}
        />
      )}

      <p className="text-[10px] text-muted-foreground uppercase font-bold pt-2" style={labelStyle}>
        Practice only — this is not a real employer and no report leaves your account.
      </p>
    </div>
  );
}
