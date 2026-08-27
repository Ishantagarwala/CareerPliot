"use client";

import { useState } from "react";
import RoadmapNodeGraph from "./RoadmapNodeGraph";
import TopicDetailModal, { TopicNode } from "./TopicDetailModal";
import {
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Clock,
  LayoutGrid,
  ListTree,
  TrendingUp,
  Target,
} from "lucide-react";

interface Milestone {
  _id?: string;
  title: string;
  completed: boolean;
  completedAt?: Date | string;
}

interface RoadmapStage {
  name: "beginner" | "intermediate" | "advanced";
  title?: string;
  description?: string;
  milestones: Milestone[];
  topics?: TopicNode[];
}

interface Roadmap {
  _id: string;
  careerPath: string;
  overview?: string;
  totalEstimatedWeeks?: string;
  targetRole?: string;
  stages: RoadmapStage[];
  currentStage: "beginner" | "intermediate" | "advanced";
}

interface RoadmapViewerProps {
  roadmap: Roadmap;
  onMilestoneToggle: (id: string, completed: boolean) => Promise<void>;
  onTopicToggle?: (topicId: string, completed: boolean) => Promise<void>;
  onSubtopicToggle?: (topicId: string, subtopicId: string, completed: boolean) => Promise<void>;
  onRefreshRoadmap?: () => Promise<void>;
  refreshing?: boolean;
}

export default function RoadmapViewer({
  roadmap,
  onMilestoneToggle,
  onTopicToggle,
  onSubtopicToggle,
  onRefreshRoadmap,
  refreshing = false,
}: RoadmapViewerProps) {
  const [viewMode, setViewMode] = useState<"graph" | "outline">("graph");
  const [selectedTopic, setSelectedTopic] = useState<TopicNode | null>(null);

  const allTopics: TopicNode[] = [];
  roadmap.stages.forEach((stage) => {
    if (stage.topics && stage.topics.length > 0) {
      stage.topics.forEach((t) => allTopics.push({ ...t, stageName: stage.name }));
    } else {
      stage.milestones.forEach((m, idx) => {
        allTopics.push({
          id: m._id?.toString() || `legacy-${stage.name}-${idx}`,
          title: m.title,
          description: `Master key competency: ${m.title}`,
          completed: m.completed,
          completedAt: m.completedAt,
          type: "required",
          stageName: stage.name,
        });
      });
    }
  });

  const totalCount = allTopics.length;
  const completedCount = allTopics.filter((t) => t.completed).length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const computeWeeks = (): string => {
    let total = 0;
    allTopics.forEach((t) => {
      const est = (t.timeEstimate || "").toLowerCase();
      const wk = est.match(/(\d+(?:\.\d+)?)\s*(?:week|wk)/i);
      const hr = est.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr)/i);
      if (wk) total += parseFloat(wk[1]);
      else if (hr) total += parseFloat(hr[1]) / 10;
      else total += 1.5;
    });
    const lo = Math.max(1, Math.round(total * 0.8));
    const hi = Math.round(total * 1.4);
    return `${lo}–${hi} weeks`;
  };
  const estimatedWeeks = allTopics.length > 0 ? computeWeeks() : (roadmap.totalEstimatedWeeks || "12–20 weeks");

  const handleToggleTopic = async (topicId: string, completed: boolean) => {
    if (onTopicToggle) await onTopicToggle(topicId, completed);
    else await onMilestoneToggle(topicId, completed);
    if (selectedTopic && selectedTopic.id === topicId) {
      setSelectedTopic((prev) => (prev ? { ...prev, completed } : null));
    }
  };

  const handleToggleSubtopic = async (topicId: string, subtopicId: string, completed: boolean) => {
    if (onSubtopicToggle) await onSubtopicToggle(topicId, subtopicId, completed);
    if (selectedTopic && selectedTopic.id === topicId) {
      setSelectedTopic((prev) => {
        if (!prev || !prev.subtopics) return prev;
        const updatedSubs = prev.subtopics.map((s) =>
          s.id === subtopicId || s.title === subtopicId ? { ...s, completed } : s
        );
        return { ...prev, subtopics: updatedSubs, completed: updatedSubs.every((s) => s.completed) };
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              AI roadmap
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground">
              {roadmap.targetRole || roadmap.careerPath}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {estimatedWeeks}
            </span>
          </div>

          {onRefreshRoadmap && (
            <button
              type="button"
              disabled={refreshing}
              onClick={onRefreshRoadmap}
              className="inline-flex h-9 items-center gap-2 self-start rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Regenerating…" : "Regenerate"}
            </button>
          )}
        </div>

        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold tracking-tight leading-tight text-foreground sm:text-3xl">
            {roadmap.careerPath}
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed mt-2">
            {roadmap.overview || `A structured plan from beginner to job-ready as a ${roadmap.careerPath}.`}
          </p>
        </div>

        <div className="pt-4 border-t border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0 flex-1">
            <div className="space-y-1.5 min-w-0 sm:min-w-[13rem] flex-1 max-w-xs">
              <div className="flex items-center justify-between gap-4 text-[13px]">
                <span className="font-medium text-muted-foreground">Career readiness</span>
                <span className="font-bold tabular-nums text-foreground">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="progress-bar-fill h-full w-full rounded-full bg-primary transition-transform duration-500"
                  style={{ transform: `scaleX(${pct / 100})` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {completedCount} of {totalCount} topics complete
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[
                { icon: TrendingUp, label: "Topics", value: String(totalCount) },
                { icon: Target, label: "Stages", value: String(roadmap.stages.length) },
                { icon: CheckCircle2, label: "Done", value: String(completedCount) },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2 min-w-0">
                  <stat.icon className="w-4 h-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="font-display text-base font-bold leading-none tabular-nums text-foreground">
                      {stat.value}
                    </div>
                    <div className="mt-0.5 text-[13px] font-medium text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="inline-flex self-start gap-1 rounded-lg border border-border bg-muted/50 p-1">
            {[
              { id: "graph" as const, label: "Cards", icon: LayoutGrid },
              { id: "outline" as const, label: "List", icon: ListTree },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id)}
                className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[13px] font-medium shadow-soft transition-colors ${
                  viewMode === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {viewMode === "graph" ? (
        <RoadmapNodeGraph
          stages={roadmap.stages}
          currentStage={roadmap.currentStage}
          onSelectTopic={(topic) => setSelectedTopic(topic)}
          onToggleTopic={handleToggleTopic}
        />
      ) : (
        <div className="space-y-4">
          {roadmap.stages.map((stage, idx) => {
            const topics = stage.topics && stage.topics.length > 0
              ? stage.topics
              : stage.milestones.map((m, mIdx) => ({
                  id: m._id?.toString() || `legacy-${mIdx}`,
                  title: m.title,
                  description: `Core competency step for ${stage.name} stage.`,
                  completed: m.completed,
                  completedAt: m.completedAt,
                  type: "required" as const,
                }));

            const stageDone = topics.filter((t) => t.completed).length;
            const stagePct = topics.length > 0 ? Math.round((stageDone / topics.length) * 100) : 0;

            return (
              <section key={stage.name} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                <div className="flex items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
                  <div className="min-w-0">
                    <span className="text-[13px] font-medium text-muted-foreground">
                      Stage 0{idx + 1}
                    </span>
                    <h3 className="mt-0.5 truncate font-display text-lg font-bold text-foreground">
                      {stage.title || stage.name}
                    </h3>
                  </div>
                  <span className="shrink-0 font-display text-xl font-bold tabular-nums text-primary">
                    {stagePct}%
                  </span>
                </div>
                <div className="space-y-2 p-3 sm:p-5">
                  {topics.map((t) => (
                    <div
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedTopic(t)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedTopic(t);
                        }
                      }}
                      className="flex cursor-pointer flex-col justify-between gap-3 rounded-xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift sm:flex-row sm:items-center"
                    >
                      <div className="flex items-start gap-3 min-w-0 sm:items-center">
                        {t.completed ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary sm:mt-0" />
                        ) : (
                          <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-border sm:mt-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">{t.title}</div>
                          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.description}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTopic(t.id, !t.completed);
                        }}
                        className="inline-flex h-9 shrink-0 self-end items-center rounded-lg border border-border bg-card px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted sm:self-auto"
                      >
                        {t.completed ? "Undo" : "Mark done"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <TopicDetailModal
        topic={selectedTopic}
        onClose={() => setSelectedTopic(null)}
        onToggleTopic={handleToggleTopic}
        onToggleSubtopic={handleToggleSubtopic}
      />
    </div>
  );
}
