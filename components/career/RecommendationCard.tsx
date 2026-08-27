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
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-soft transition-all ${
        isSelected
          ? "border-primary/50 ring-1 ring-primary/25"
          : "border-border hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
      }`}
    >
      {isSelected && (
        <div className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-xl bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          SELECTED
        </div>
      )}

      <div className="mb-4 flex items-start justify-between gap-4 pr-20">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-[22px]">model_training</span>
          </div>
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
              {rec.careerPath}
            </h3>
            <p className="mt-1 text-[13px] font-medium text-muted-foreground">
              Match score
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-display text-2xl font-bold tabular-nums text-primary">
            {rec.matchScore}%
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">
            Match
          </span>
        </div>
      </div>

      <div className="mb-6 flex-1 rounded-xl border border-border bg-muted/40 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{rec.reasoning}</p>
      </div>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="progress-bar-fill h-full w-full rounded-full bg-primary" style={{ transform: `scaleX(${rec.matchScore / 100})` }} />
      </div>

      <button
        onClick={() => onSelect(rec._id)}
        disabled={isSelected || isSelecting}
        className={`inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
          isSelected
            ? "cursor-default border border-border bg-muted text-muted-foreground"
            : isSelecting
            ? "cursor-wait bg-muted text-foreground"
            : "bg-primary text-primary-foreground shadow-soft hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
        }`}
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
