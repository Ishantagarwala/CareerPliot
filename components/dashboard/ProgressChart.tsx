"use client";

import React from "react";

interface StageDetail {
  completed: number;
  total: number;
}

interface ProgressChartProps {
  stageProgress: {
    beginner: StageDetail;
    intermediate: StageDetail;
    advanced: StageDetail;
  };
  careerPath: string | null;
}

export default function ProgressChart({ stageProgress, careerPath }: ProgressChartProps) {
  const getPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const stages = [
    {
      key: "beginner",
      name: "Beginner",
      completed: stageProgress?.beginner?.completed || 0,
      total: stageProgress?.beginner?.total || 0,
      description: "Foundations, core tools, early practice",
    },
    {
      key: "intermediate",
      name: "Intermediate",
      completed: stageProgress?.intermediate?.completed || 0,
      total: stageProgress?.intermediate?.total || 0,
      description: "Applied projects and domain fluency",
    },
    {
      key: "advanced",
      name: "Advanced",
      completed: stageProgress?.advanced?.completed || 0,
      total: stageProgress?.advanced?.total || 0,
      description: "Portfolio work and job prep",
    },
  ];

  return (
    <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-6">
        <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
          <span className="material-symbols-outlined text-[20px] text-primary">emoji_events</span>
          Roadmap stage metrics
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {careerPath
            ? `Milestone completion for ${careerPath}.`
            : "No active career path selected."}
        </p>
      </div>

      {careerPath ? (
        <div className="space-y-6">
          {stages.map((stage, idx) => {
            const percent = getPercentage(stage.completed, stage.total);
            return (
              <div
                key={stage.key}
                className="animate-fade-in-up space-y-2"
                style={{ animationDelay: `${idx * 120}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="block text-sm font-semibold text-foreground">
                      {stage.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {stage.description}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block text-sm font-bold tabular-nums text-foreground">
                      {stage.completed} / {stage.total}
                    </span>
                    <span className="block text-[11px] font-medium text-muted-foreground">
                      {percent}% done
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="progress-bar-fill h-full w-full rounded-full bg-primary"
                    style={{ transform: `scaleX(${percent / 100})` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3 py-8 text-center">
          <span className="material-symbols-outlined text-[40px] text-muted-foreground">
            explore
          </span>
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">
            Select a career path and generate your roadmap to see milestone
            progress here.
          </p>
        </div>
      )}
    </div>
  );
}
