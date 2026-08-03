"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface Milestone {
  _id?: string;
  title: string;
  completed: boolean;
  completedAt?: Date | string;
}

interface MilestoneCardProps {
  milestone: Milestone;
  onToggle: (id: string, completed: boolean) => Promise<void>;
}

export default function MilestoneCard({ milestone, onToggle }: MilestoneCardProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckedChange = async (checked: boolean) => {
    if (!milestone._id) return;
    setLoading(true);
    try {
      await onToggle(milestone._id, checked);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = milestone.completedAt
    ? new Date(milestone.completedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className={`flex items-start gap-4 border p-4 transition-all ${
        milestone.completed
          ? "border-border bg-[#131313]"
          : "border-border hover:border-border"
      }`}
    >
      <div className="flex h-5 items-center mt-0.5">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-foreground" />
        ) : (
          <input
            type="checkbox"
            checked={milestone.completed}
            onChange={(e) => handleCheckedChange(e.target.checked)}
            className="h-4 w-4 border-border bg-transparent text-foreground focus:ring-0 cursor-pointer accent-primary"
          />
        )}
      </div>

      <div className="flex-1 space-y-1">
        <p
          className={`text-sm font-medium leading-relaxed ${
            milestone.completed
              ? "text-muted-foreground line-through decoration-[#404040]"
              : "text-foreground"
          }`}
        >
          {milestone.title}
        </p>

        {milestone.completed && formattedDate && (
          <div
            className="flex items-center gap-1 text-[10px] text-[#636565]"
            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
          >
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Completed {formattedDate}
          </div>
        )}
      </div>
    </div>
  );
}
