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
      className={`flex items-start gap-4 rounded-xl border border-border p-4 transition-all ${
        milestone.completed
          ? "bg-muted/50"
          : "bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
      }`}
    >
      <div className="mt-0.5 flex h-5 items-center">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <input
            type="checkbox"
            checked={milestone.completed}
            onChange={(e) => handleCheckedChange(e.target.checked)}
            aria-label={milestone.title}
            className="h-4 w-4 cursor-pointer rounded border-border bg-transparent accent-primary focus:ring-0 focus:ring-ring/25"
          />
        )}
      </div>

      <div className="flex-1 space-y-1">
        <p
          className={`text-sm font-medium leading-relaxed ${
            milestone.completed
              ? "text-muted-foreground line-through decoration-border"
              : "text-foreground"
          }`}
        >
          {milestone.title}
        </p>

        {milestone.completed && formattedDate && (
          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Completed {formattedDate}
          </div>
        )}
      </div>
    </div>
  );
}
