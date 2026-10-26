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
      className={`relative overflow-hidden rounded-2xl transition-all p-6 flex flex-col justify-between border-2 md:border-3 border-black dark:border-[#383d45] ${
        isSelected
          ? "bg-card shadow-[6px_6px_0_0_#000] ring-2 ring-primary"
          : "bg-card shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]"
      }`}
    >
      {isSelected && (
        <div className="absolute top-0 right-0 bg-primary text-black px-3.5 py-1 text-xs font-mono font-black flex items-center gap-1.5 border-l-2 border-b-2 border-black rounded-bl-xl shadow-xs">
          <span className="material-symbols-outlined text-[15px]">check_circle</span>
          SELECTED PATH
        </div>
      )}

      <div>
        <div className="flex justify-between items-start gap-4 pr-16 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl border-2 border-black bg-primary text-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
              <span className="material-symbols-outlined text-[24px]">model_training</span>
            </div>
            <div>
              <h3 className="font-display font-black text-xl text-foreground uppercase tracking-tight">
                {rec.careerPath}
              </h3>
              <p className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                Target Role
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span className="text-3xl font-display font-black text-secondary dark:text-primary leading-none">
              {rec.matchScore}%
            </span>
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mt-1">
              Match Fit
            </span>
          </div>
        </div>

        <div className="p-4 bg-background border-2 border-black dark:border-[#383d45] rounded-xl mb-5">
          <p className="text-sm font-sans text-muted-foreground leading-relaxed">{rec.reasoning}</p>
        </div>

        <div className="h-3 w-full bg-muted border-2 border-black dark:border-[#383d45] rounded-full overflow-hidden p-0.5 mb-5">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${rec.matchScore}%` }}
          />
        </div>
      </div>

      <button
        onClick={() => onSelect(rec._id)}
        disabled={isSelected || isSelecting}
        className={`w-full py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
          isSelected
            ? "bg-muted text-muted-foreground border-2 border-black/30 dark:border-white/20 cursor-default"
            : isSelecting
            ? "bg-muted text-foreground cursor-wait border-2 border-black"
            : "bg-primary text-black border-2 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
        }`}
      >
        {isSelecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Configuring Roadmap...
          </>
        ) : isSelected ? (
          <>
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Current Active Career Path
          </>
        ) : (
          "Select This Career Path"
        )}
      </button>
    </div>
  );
}
