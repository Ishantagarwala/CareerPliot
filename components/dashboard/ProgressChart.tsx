"use client";

import React from "react";
import { Award, CheckCircle2 } from "lucide-react";

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
      name: "01 · Beginner Stage",
      completed: stageProgress?.beginner?.completed || 0,
      total: stageProgress?.beginner?.total || 0,
      description: "Foundational concepts, core tools, and early practice",
      color: "bg-primary",
    },
    {
      key: "intermediate",
      name: "02 · Intermediate Stage",
      completed: stageProgress?.intermediate?.completed || 0,
      total: stageProgress?.intermediate?.total || 0,
      description: "Applied projects, deeper skills, and domain fluency",
      color: "bg-secondary",
    },
    {
      key: "advanced",
      name: "03 · Advanced Stage",
      completed: stageProgress?.advanced?.completed || 0,
      total: stageProgress?.advanced?.total || 0,
      description: "Portfolio work, advanced practice, and job prep",
      color: "bg-coral",
    },
  ];

  return (
    <div className="bg-card border-2 border-black dark:border-[#383d45] rounded-xl p-5 neo-shadow h-full flex flex-col justify-between">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-display font-black text-foreground uppercase tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg border-2 border-black bg-primary text-black flex items-center justify-center text-sm shadow-[2px_2px_0_0_#000]">
              🏆
            </span>
            <span>Roadmap Stage Metrics</span>
          </h3>
          <span className="px-2 py-0.5 bg-background border border-black dark:border-[#383d45] rounded font-mono text-[10px] font-bold text-muted-foreground uppercase">
            Live Track
          </span>
        </div>
        <p className="text-xs font-mono text-muted-foreground mt-2">
          {careerPath
            ? `Milestone completion for: ${careerPath}`
            : "No active career path selected."}
        </p>
      </div>

      {careerPath ? (
        <div className="space-y-5">
          {stages.map((stage, idx) => {
            const percent = getPercentage(stage.completed, stage.total);
            return (
              <div
                key={stage.key}
                className="space-y-2 p-3.5 bg-background border-2 border-black dark:border-[#383d45] rounded-xl animate-fade-in-up"
                style={{ animationDelay: `${idx * 120}ms` }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-xs font-display font-black text-foreground uppercase block">{stage.name}</span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">{stage.description}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-black text-foreground block">
                      {stage.completed} / {stage.total}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-muted-foreground block mt-0.5">
                      {percent}% Done
                    </span>
                  </div>
                </div>

                <div className="h-3 w-full bg-muted border-2 border-black dark:border-[#383d45] rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 space-y-3 bg-background border-2 border-dashed border-black/30 dark:border-white/20 rounded-xl p-6">
          <span className="material-symbols-outlined text-[36px] text-muted-foreground">explore</span>
          <p className="text-sm font-mono text-muted-foreground max-w-xs mx-auto">
            Please select a career path and initialize your roadmap to view milestone progress.
          </p>
        </div>
      )}
    </div>
  );
}
