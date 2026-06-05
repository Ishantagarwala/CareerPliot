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
      name: "Beginner Stage",
      completed: stageProgress?.beginner?.completed || 0,
      total: stageProgress?.beginner?.total || 0,
      description: "Foundational learning, basic scripting, tools setup",
    },
    {
      key: "intermediate",
      name: "Intermediate Stage",
      completed: stageProgress?.intermediate?.completed || 0,
      total: stageProgress?.intermediate?.total || 0,
      description: "Frameworks, databases, medium projects, algorithms",
    },
    {
      key: "advanced",
      name: "Advanced Stage",
      completed: stageProgress?.advanced?.completed || 0,
      total: stageProgress?.advanced?.total || 0,
      description: "System design, deployment, portfolio curation, job prep",
    },
  ];

  return (
    <div className="bg-[#1A1A1A] border border-[#262626] p-6 h-full">
      <div className="mb-6">
        <h3
          className="text-base font-bold text-white flex items-center gap-2"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          <span className="material-symbols-outlined text-[20px] text-white">emoji_events</span>
          Roadmap Stage Metrics
        </h3>
        <p className="text-xs text-[#8e9192] mt-1">
          {careerPath
            ? `Milestone completion for: ${careerPath}`
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
                className="space-y-2 animate-fade-in-up"
                style={{ animationDelay: `${idx * 120}ms` }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-white block">{stage.name}</span>
                    <span className="text-[10px] text-[#636565] font-medium block">{stage.description}</span>
                  </div>
                  <div className="text-right">
                    <span
                      className="text-xs text-white font-bold block"
                      style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
                    >
                      {stage.completed} / {stage.total}
                    </span>
                    <span className="text-[10px] text-[#8e9192] font-medium block mt-0.5">
                      {percent}% Done
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-[#262626] overflow-hidden">
                  <div
                    className="h-full bg-white progress-bar-fill"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 space-y-3">
          <span className="material-symbols-outlined text-[40px] text-[#636565]">explore</span>
          <p className="text-sm text-[#8e9192] max-w-xs mx-auto">
            Please select a career path and initialize your roadmap to view milestones progress.
          </p>
        </div>
      )}
    </div>
  );
}
