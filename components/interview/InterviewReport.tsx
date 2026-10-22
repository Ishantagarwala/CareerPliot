"use client";

import { useState } from "react";
import { ArrowLeft, Check, Copy, RefreshCw, ShieldAlert, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import {
  DIFFICULTY_LABELS,
  TYPE_LABELS,
  scoreBarClass,
  scoreTone,
  type InterviewSession,
} from "./types";

interface InterviewReportProps {
  session: InterviewSession;
  onRestart: () => void;
  onExit: () => void;
}

const labelStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: "0.06em",
} as const;

function buildReportText(session: InterviewSession): string {
  const card = session.scorecard;
  if (!card) return "";
  const lines = [
    `# Mock interview — ${session.role}`,
    "",
    `Type: ${TYPE_LABELS[session.interviewType]} · Level: ${DIFFICULTY_LABELS[session.difficulty]}`,
    `Score: ${card.overallScore}/100 (${card.verdict})`,
    "",
    card.summary,
    "",
    "## Dimensions",
    ...card.dimensions.map((dimension) => `- ${dimension.name}: ${dimension.score}/100 — ${dimension.note}`),
    "",
    "## Strengths",
    ...card.strengths.map((item) => `- ${item}`),
    "",
    "## Improvements",
    ...card.improvements.map((item) => `- ${item}`),
    "",
    "## Practise next",
    ...card.practice.map((item) => `- ${item}`),
  ];
  return lines.join("\n");
}

function BulletSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <section className="border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-[11px] font-bold uppercase text-muted-foreground" style={labelStyle}>
          {title}
        </h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="text-sm text-foreground leading-relaxed flex gap-2">
            <span className="text-muted-foreground shrink-0">—</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function InterviewReport({ session, onRestart, onExit }: InterviewReportProps) {
  const [copied, setCopied] = useState(false);
  const card = session.scorecard;

  if (!card) {
    return (
      <div className="border-2 border-dashed border-border bg-card/40 p-8 text-center space-y-4">
        <p className="text-sm text-foreground font-bold">This interview has not been scored yet.</p>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 px-4 py-2 border border-border text-xs font-bold uppercase hover:border-foreground transition-colors"
          style={labelStyle}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to setup
        </button>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildReportText(session));
      setCopied(true);
      toast.success("Report copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the report.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1" style={labelStyle}>
            Interview report
          </p>
          <h2
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            {session.role}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1" style={labelStyle}>
            {TYPE_LABELS[session.interviewType]} · {DIFFICULTY_LABELS[session.difficulty]}
            {session.company ? ` · ${session.company}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors text-[10px] uppercase font-bold"
            style={labelStyle}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground border-2 border-black text-[10px] uppercase font-bold shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
            style={labelStyle}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Practise again
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
        <div className="bg-card border border-border p-6 text-center space-y-2">
          <p className="text-[10px] uppercase font-bold text-muted-foreground" style={labelStyle}>
            Overall
          </p>
          <div className={`text-6xl font-bold tabular-nums leading-none ${scoreTone(card.overallScore)}`}>
            {card.overallScore}
            <span className="text-lg text-muted-foreground font-normal">/100</span>
          </div>
          <p className="text-sm font-bold uppercase tracking-wider" style={labelStyle}>
            {card.verdict}
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-foreground leading-relaxed">{card.summary}</p>

          <div className="space-y-3">
            {card.dimensions.map((dimension) => (
              <div key={dimension.name} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[11px] uppercase font-bold text-muted-foreground" style={labelStyle}>
                    {dimension.name}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-foreground">
                    {dimension.score}
                  </span>
                </div>
                <div
                  className="h-2 w-full bg-muted overflow-hidden"
                  role="progressbar"
                  aria-label={dimension.name}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={dimension.score}
                >
                  <div
                    className={`h-full transition-all duration-700 ${scoreBarClass(dimension.score)}`}
                    style={{ width: `${Math.max(2, dimension.score)}%` }}
                  />
                </div>
                {dimension.note && (
                  <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                    {dimension.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BulletSection
          title="What worked"
          icon={<Sparkles className="h-3.5 w-3.5 text-muted-foreground" />}
          items={card.strengths}
        />
        <BulletSection
          title="Fix before the real one"
          icon={<ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />}
          items={card.improvements}
        />
        <BulletSection
          title="Practise next"
          icon={<Target className="h-3.5 w-3.5 text-muted-foreground" />}
          items={card.practice}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground border-2 border-black text-xs font-bold uppercase shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
          style={labelStyle}
        >
          <RefreshCw className="h-4 w-4" />
          Run it again
        </button>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-foreground text-xs font-bold uppercase hover:border-foreground transition-colors"
          style={labelStyle}
        >
          <ArrowLeft className="h-4 w-4" />
          All interviews
        </button>
      </div>
    </div>
  );
}
