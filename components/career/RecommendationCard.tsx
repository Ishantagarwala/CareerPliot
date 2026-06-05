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
          ? "bg-[#1A1A1A] border-2 border-white"
          : "bg-[#1A1A1A] border border-[#262626] hover:border-[#404040]"
      }`}
    >
      {isSelected && (
        <div
          className="absolute top-0 right-0 bg-white text-[#0A0A0A] px-3 py-1 text-[11px] font-bold flex items-center gap-1"
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
        >
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          SELECTED
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start gap-4 pr-20 mb-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 border border-[#262626] bg-[#131313] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px] text-white">model_training</span>
          </div>
          <div>
            <h3
              className="font-bold text-lg text-white group-hover:underline decoration-1 underline-offset-4"
              style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
            >
              {rec.careerPath}
            </h3>
            <p
              className="text-[11px] text-[#8e9192] uppercase tracking-[0.1em] mt-1"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              AI Match Compatibility
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            {rec.matchScore}%
          </span>
          <span
            className="text-[10px] text-[#8e9192] uppercase tracking-[0.15em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Match
          </span>
        </div>
      </div>

      {/* Reasoning */}
      <div className="p-4 bg-[#131313] border border-[#262626] mb-6 flex-1">
        <p className="text-sm text-[#c4c7c8] leading-relaxed">{rec.reasoning}</p>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-[#262626] overflow-hidden mb-4">
        <div className="h-full bg-white progress-bar-fill" style={{ width: `${rec.matchScore}%` }} />
      </div>

      {/* Action */}
      <button
        onClick={() => onSelect(rec._id)}
        disabled={isSelected || isSelecting}
        className={`w-full py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
          isSelected
            ? "bg-[#131313] border border-[#262626] text-[#8e9192] cursor-default"
            : isSelecting
            ? "bg-[#262626] text-white cursor-wait"
            : "bg-white text-[#0A0A0A] hover:bg-[#e2e2e2] cursor-pointer"
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
