"use client";

import { Loader2 } from "lucide-react";

interface CareerRecommendation {
  _id: string;
  careerPath: string;
  matchScore: number;
  reasoning: string;
  selected: boolean;
}

interface RecommendationCardProps {
  rec: CareerRecommendation;
  onSelect: (id: string) => Promise<void>;
  selectingId: string | null;
}

export default function RecommendationCard({ rec, onSelect, selectingId }: RecommendationCardProps) {
  const isSelected = rec.selected;
  const isSelecting = selectingId === rec._id;

  return (
    <div
      className={`relative overflow-hidden transition-all p-6 flex flex-col ${
        isSelected
          ? "bg-card border-2 border-foreground"
          : "bg-card border border-border hover:border-foreground/40"
      }`}
    >
      {isSelected && (
        <div
          className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-[11px] font-bold flex items-center gap-1 border-l border-b border-black"
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
        >
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          SELECTED
        </div>
      )}

      <div className="flex justify-between items-start gap-4 pr-20 mb-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 border border-border bg-background flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px] text-foreground">model_training</span>
          </div>
          <div>
            <h3
              className="font-bold text-lg text-foreground"
              style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
            >
              {rec.careerPath}
            </h3>
            <p
              className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] mt-1"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Match score
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            {rec.matchScore}%
          </span>
          <span
            className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Match
          </span>
        </div>
      </div>

      <div className="p-4 bg-background border border-border mb-6 flex-1">
        <p className="text-sm text-muted-foreground leading-relaxed">{rec.reasoning}</p>
      </div>

      <div className="h-1 w-full bg-border overflow-hidden mb-4">
        <div className="h-full bg-primary progress-bar-fill" style={{ width: `${rec.matchScore}%` }} />
      </div>

      <button
        onClick={() => onSelect(rec._id)}
        disabled={isSelected || isSelecting}
        className={`w-full py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
          isSelected
            ? "bg-background border border-border text-muted-foreground cursor-default"
            : isSelecting
            ? "bg-muted text-foreground cursor-wait"
            : "bg-primary text-primary-foreground border-2 border-black hover:opacity-90 cursor-pointer shadow-[3px_3px_0_0_#000]"
        }`}
        style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
      >
        {isSelecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Selecting...
          </>
        ) : isSelected ? (
          <>
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Current Career Path
          </>
        ) : (
          "Select This Career Path"
        )}
      </button>
    </div>
  );
}
