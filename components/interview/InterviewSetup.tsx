"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Clock, Loader2, Play, Trash2 } from "lucide-react";
import {
  DIFFICULTY_LABELS,
  TYPE_HINTS,
  TYPE_LABELS,
  type InterviewDifficulty,
  type InterviewSummary,
  type InterviewType,
  type NewInterviewConfig,
} from "./types";

interface InterviewSetupProps {
  defaultRole: string;
  starting: boolean;
  history: InterviewSummary[];
  historyLoading: boolean;
  onStart: (config: NewInterviewConfig) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

const TYPES: InterviewType[] = ["mixed", "behavioral", "technical", "system-design", "hr"];
const DIFFICULTIES: InterviewDifficulty[] = ["entry", "mid", "senior"];
const QUESTION_COUNTS = [3, 6, 9];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const labelStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: "0.06em",
} as const;

export default function InterviewSetup({
  defaultRole,
  starting,
  history,
  historyLoading,
  onStart,
  onOpen,
  onDelete,
}: InterviewSetupProps) {
  const [role, setRole] = useState(defaultRole);
  const [company, setCompany] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("mixed");
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("entry");
  const [maxQuestions, setMaxQuestions] = useState(6);

  /*
   * The student's career path is fetched by the page after this component
   * mounts. Fill the field when it arrives, but never overwrite a role the
   * student has already typed.
   */
  useEffect(() => {
    if (!defaultRole) return;
    setRole((current) => (current.trim() ? current : defaultRole));
  }, [defaultRole]);

  const effectiveRole = role.trim() || defaultRole;

  const start = () => {
    if (!effectiveRole) return;
    onStart({
      role: effectiveRole,
      interviewType,
      difficulty,
      company: company.trim() || undefined,
      maxQuestions,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
      <section className="bg-card border-2 border-black dark:border-[#383d45] rounded-2xl p-6 sm:p-8 space-y-6 neo-shadow">
        <div>
          <h2 className="text-xl font-display font-black text-foreground uppercase tracking-tight">
            Set up your interview
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-sans">
            The interviewer adapts to your answers with contextual follow-ups. Everything stays secure inside your profile.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="interview-role" className="block text-[11px] uppercase font-mono font-bold text-muted-foreground">
            Role you are targeting
          </label>
          <input
            id="interview-role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="Full Stack Developer"
            maxLength={80}
            className="w-full rounded-xl border-2 border-black dark:border-[#383d45] bg-background px-3.5 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0_0_#000]"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="interview-company" className="block text-[11px] uppercase font-mono font-bold text-muted-foreground">
            Company <span className="text-muted-foreground/70 normal-case font-normal font-sans">(optional)</span>
          </label>
          <input
            id="interview-company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="e.g. Google, Microsoft, Zoho"
            maxLength={120}
            className="w-full rounded-xl border-2 border-black dark:border-[#383d45] bg-background px-3.5 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0_0_#000]"
          />
        </div>

        <div className="space-y-2">
          <span className="block text-[11px] uppercase font-mono font-bold text-muted-foreground">
            Interview type
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Interview type">
            {TYPES.map((type) => {
              const active = interviewType === type;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setInterviewType(type)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-mono font-bold uppercase transition-all shadow-[2px_2px_0_0_#000] cursor-pointer ${
                    active
                      ? "bg-primary text-black border-2 border-black"
                      : "border-2 border-black/30 dark:border-[#383d45] bg-card text-muted-foreground hover:text-foreground hover:border-black"
                  }`}
                >
                  {TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground pt-1 font-sans">{TYPE_HINTS[interviewType]}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <span className="block text-[11px] uppercase font-mono font-bold text-muted-foreground">
              Level
            </span>
            <div className="flex gap-2" role="group" aria-label="Difficulty">
              {DIFFICULTIES.map((level) => {
                const active = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDifficulty(level)}
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase transition-all shadow-[2px_2px_0_0_#000] cursor-pointer ${
                      active
                        ? "bg-secondary text-white border-2 border-black"
                        : "border-2 border-black/30 dark:border-[#383d45] bg-card text-muted-foreground hover:text-foreground hover:border-black"
                    }`}
                  >
                    {DIFFICULTY_LABELS[level]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-[11px] uppercase font-mono font-bold text-muted-foreground">
              Questions
            </span>
            <div className="flex gap-2" role="group" aria-label="Number of questions">
              {QUESTION_COUNTS.map((count) => {
                const active = maxQuestions === count;
                return (
                  <button
                    key={count}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMaxQuestions(count)}
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-mono font-bold transition-all shadow-[2px_2px_0_0_#000] cursor-pointer ${
                      active
                        ? "bg-secondary text-white border-2 border-black"
                        : "border-2 border-black/30 dark:border-[#383d45] bg-card text-muted-foreground hover:text-foreground hover:border-black"
                    }`}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={start}
          disabled={starting || !effectiveRole}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 bg-primary text-black border-2 border-black font-mono font-bold text-xs uppercase tracking-wider shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50 cursor-pointer"
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {starting ? "Starting…" : "Start interview"}
        </button>
      </section>

      <aside className="bg-card border-2 border-black dark:border-[#383d45] rounded-2xl p-5 sm:p-6 space-y-4 neo-shadow">
        <div className="flex items-center justify-between border-b-2 border-black dark:border-[#383d45] pb-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
            Past interviews
          </h3>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>

        {historyLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-xs text-muted-foreground leading-relaxed py-4 font-sans">
            No interviews yet. Your first session takes approximately 5 minutes.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {history.slice(0, 8).map((item) => (
              <li key={item._id} className="rounded-xl border-2 border-black dark:border-[#383d45] bg-background p-3.5 space-y-2 shadow-[2px_2px_0_0_#000]">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(item._id)}
                    className="text-left flex-1 min-w-0 group"
                  >
                    <span className="block text-sm font-bold text-foreground truncate group-hover:underline">
                      {item.role}
                    </span>
                    <span className="block text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5" style={labelStyle}>
                      {TYPE_LABELS[item.interviewType]} · {formatDate(item.createdAt)}
                    </span>
                  </button>
                  {item.scorecard ? (
                    <span className="shrink-0 text-sm font-bold tabular-nums">
                      {item.scorecard.overallScore}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[9px] uppercase font-bold text-muted-foreground border border-border px-1.5 py-0.5" style={labelStyle}>
                      Open
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onOpen(item._id)}
                    className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground transition-colors"
                    style={labelStyle}
                  >
                    {item.status === "completed" ? "View report" : "Continue"}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item._id)}
                    aria-label={`Delete interview for ${item.role}`}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
