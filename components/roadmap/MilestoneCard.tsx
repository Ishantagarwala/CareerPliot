"use client";

import { useState } from "react";
import { Loader2, Calendar } from "lucide-react";

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
      className={`flex items-start gap-4 rounded-xl border p-4 transition-all ${
        milestone.completed
          ? "border-emerald-500/30 bg-emerald-500/[0.02] dark:border-emerald-500/20"
          : "border-border bg-card hover:border-muted-foreground/30"
      }`}
    >
      <div className="flex h-5 items-center">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <input
            type="checkbox"
            checked={milestone.completed}
            onChange={(e) => handleCheckedChange(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
          />
        )}
      </div>

      <div className="flex-1 space-y-1">
        <p
          className={`text-sm font-medium leading-relaxed ${
            milestone.completed
              ? "text-muted-foreground line-through decoration-emerald-500/50"
              : "text-foreground"
          }`}
        >
          {milestone.title}
        </p>

        {milestone.completed && formattedDate && (
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold dark:text-emerald-500">
            <Calendar className="h-3 w-3" />
            Completed on {formattedDate}
          </div>
        )}
      </div>
    </div>
  );
}
