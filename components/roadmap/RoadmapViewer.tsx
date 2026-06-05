"use client";

import { useState } from "react";
import MilestoneCard from "./MilestoneCard";

interface Milestone {
  _id?: string;
  title: string;
  completed: boolean;
  completedAt?: Date | string;
}

interface RoadmapStage {
  name: "beginner" | "intermediate" | "advanced";
  milestones: Milestone[];
}

interface Roadmap {
  _id: string;
  careerPath: string;
  stages: RoadmapStage[];
  currentStage: "beginner" | "intermediate" | "advanced";
}

interface RoadmapViewerProps {
  roadmap: Roadmap;
  onMilestoneToggle: (id: string, completed: boolean) => Promise<void>;
}

export default function RoadmapViewer({ roadmap, onMilestoneToggle }: RoadmapViewerProps) {
  // Calculate progress stats
  const allMilestones = roadmap.stages.reduce<Milestone[]>(
    (acc, stage) => [...acc, ...stage.milestones],
    []
  );
  const totalCount = allMilestones.length;
  const completedCount = allMilestones.filter((m) => m.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getStageLabel = (name: string, idx: number) => {
    return `STAGE ${String(idx + 1).padStart(2, "0")}`;
  };

  const getStageTitle = (name: string) => {
    switch (name) {
      case "beginner":
        return "Foundations & Core Logic";
      case "intermediate":
        return "Architecture & Scaling";
      case "advanced":
        return "Advanced Systems & DevOps";
      default:
        return name;
    }
  };

  const getStageStatus = (stage: RoadmapStage) => {
    const allCompleted = stage.milestones.every((m) => m.completed);
    const someCompleted = stage.milestones.some((m) => m.completed);
    const isCurrent = roadmap.currentStage === stage.name;

    if (allCompleted) return "completed";
    if (isCurrent || someCompleted) return "in-progress";
    return "locked";
  };

  const getStagePercent = (stage: RoadmapStage) => {
    const total = stage.milestones.length;
    if (total === 0) return 0;
    const completed = stage.milestones.filter((m) => m.completed).length;
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header with Display Typography */}
      <div className="mb-12 animate-fade-in-up">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 border border-[#262626] bg-[#1A1A1A] text-[#c4c7c8] mb-6"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.08em" }}
        >
          <span className="w-2 h-2 rounded-full bg-white" />
          ACTIVE PATH
        </div>
        <h2
          className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          {roadmap.careerPath}
        </h2>

        {/* Overall Progress Bar */}
        <div className="mt-6 max-w-md">
          <div className="flex justify-between items-end mb-2">
            <span
              className="text-[11px] text-[#8e9192] uppercase tracking-[0.1em]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Overall Progress
            </span>
            <span
              className="text-[11px] text-white"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {progressPercent}%
            </span>
          </div>
          <div className="h-2 w-full bg-[#1A1A1A] overflow-hidden border border-[#262626]">
            <div className="h-full bg-white progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="relative">
        <div className="timeline-track" />

        {roadmap.stages.map((stage, idx) => {
          const status = getStageStatus(stage);
          const percent = getStagePercent(stage);

          return (
            <div
              key={stage.name}
              className={`relative pl-16 md:pl-20 py-8 animate-fade-in-up ${
                status === "locked" ? "opacity-50" : ""
              }`}
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              {/* Timeline Node */}
              {status === "completed" ? (
                <div className="absolute left-[16px] md:left-[32px] top-10 w-4 h-4 rounded-full bg-white border-4 border-[#0A0A0A] z-10" />
              ) : status === "in-progress" ? (
                <div className="absolute left-[12px] md:left-[28px] top-10 w-6 h-6 rounded-full bg-[#0A0A0A] border-2 border-white z-10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white animate-node-pulse" />
                </div>
              ) : (
                <div className="absolute left-[16px] md:left-[32px] top-10 w-4 h-4 rounded-full bg-[#0A0A0A] border-2 border-[#404040] z-10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#404040]" />
                </div>
              )}

              {/* Stage Card */}
              <div
                className={`p-6 md:p-8 relative overflow-hidden ${
                  status === "in-progress"
                    ? "bg-[#1A1A1A] border border-white shadow-[0_0_15px_rgba(255,255,255,0.03)]"
                    : status === "completed"
                    ? "bg-[#1A1A1A] border border-[#262626] hover:border-[#404040] transition-colors"
                    : "bg-transparent border border-[#262626]"
                }`}
              >
                {/* Active indicator line */}
                {status === "in-progress" && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white" />
                )}

                {/* Stage Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#262626] pb-6 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-[11px] uppercase tracking-[0.15em] ${
                          status === "in-progress" ? "text-white" : "text-[#8e9192]"
                        }`}
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {getStageLabel(stage.name, idx)}
                      </span>

                      {/* Status Chip */}
                      {status === "completed" && (
                        <span
                          className="px-2 py-0.5 border border-[#262626] bg-[#201f1f] text-[#c4c7c8] text-[11px] flex items-center gap-1"
                          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
                        >
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Completed
                        </span>
                      )}
                      {status === "in-progress" && (
                        <span
                          className="px-2 py-0.5 border border-white bg-white text-[#0A0A0A] text-[11px] font-bold flex items-center gap-1"
                          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
                        >
                          <span className="material-symbols-outlined text-[14px]">sync</span>
                          In Progress
                        </span>
                      )}
                      {status === "locked" && (
                        <span
                          className="px-2 py-0.5 border border-[#404040] text-[#8e9192] text-[11px] flex items-center gap-1"
                          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
                        >
                          <span className="material-symbols-outlined text-[14px]">lock</span>
                          Locked
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-2xl font-bold ${
                        status === "locked" ? "text-[#8e9192]" : "text-white"
                      }`}
                      style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                    >
                      {getStageTitle(stage.name)}
                    </h3>
                  </div>

                  {/* Large Percentage */}
                  <div className="text-right">
                    <span
                      className={`text-4xl font-bold ${
                        status === "in-progress" ? "text-white" : status === "completed" ? "text-[#262626]" : "text-[#262626]"
                      }`}
                      style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                    >
                      {percent}%
                    </span>
                  </div>
                </div>

                {/* Milestones */}
                <div className="space-y-3">
                  {stage.milestones.map((milestone) => (
                    <MilestoneCard
                      key={milestone._id}
                      milestone={milestone}
                      onToggle={onMilestoneToggle}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
