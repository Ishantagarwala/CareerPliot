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
      <div className="bg-card border border-border p-5 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 border border-border bg-background text-muted-foreground text-[11px] font-medium"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}
            >
              <Sparkles className="w-3 h-3" />
              AI roadmap
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 border border-border bg-background text-foreground text-[11px]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {roadmap.targetRole || roadmap.careerPath}
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 border border-border bg-background text-muted-foreground text-[11px]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <Clock className="w-3 h-3" />
              {estimatedWeeks}
            </span>
          </div>

          {onRefreshRoadmap && (
            <button
              type="button"
              disabled={refreshing}
              onClick={onRefreshRoadmap}
              className="inline-flex items-center gap-2 min-h-10 px-4 py-2 border border-border bg-background text-foreground text-xs font-bold hover:border-foreground transition-colors disabled:opacity-40"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
            >
              <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Regenerating…" : "Regenerate"}
            </button>
          )}
        </div>

        <div className="min-w-0">
          <h2
            className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            {roadmap.careerPath}
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed mt-2">
            {roadmap.overview || `A structured plan from beginner to job-ready as a ${roadmap.careerPath}.`}
          </p>
        </div>

        <div className="pt-4 border-t border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0 flex-1">
            <div className="space-y-1.5 min-w-0 sm:min-w-[13rem] flex-1 max-w-xs">
              <div className="flex items-center justify-between gap-4 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span className="text-muted-foreground uppercase tracking-wider">Career readiness</span>
                <span className="text-foreground font-bold tabular-nums">{pct}%</span>
              </div>
              <div className="h-2 border border-border bg-background overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
                  <stat.icon className="w-4 h-4 text-foreground shrink-0" />
                  <div className="min-w-0">
                    <div
                      className="text-base font-bold text-foreground tabular-nums leading-none"
                      style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                    >
                      {stat.value}
                    </div>
                    <div
                      className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="inline-flex border border-border self-start">
            {[
              { id: "graph" as const, label: "Cards", icon: LayoutGrid },
              { id: "outline" as const, label: "List", icon: ListTree },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id)}
                className={`flex items-center gap-2 min-h-10 px-4 py-2 text-xs font-medium transition-colors ${
                  viewMode === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
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
              <section key={stage.name} className="bg-card border border-border overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      Stage 0{idx + 1}
                    </span>
                    <h3
                      className="text-lg font-bold text-foreground mt-0.5 truncate"
                      style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                    >
                      {stage.title || stage.name}
                    </h3>
                  </div>
                  <span
                    className="text-xl font-bold text-foreground tabular-nums shrink-0"
                    style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                  >
                    {stagePct}%
                  </span>
                </div>
                <div className="p-3 sm:p-5 space-y-2">
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
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-border bg-background hover:border-foreground cursor-pointer transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        {t.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-foreground shrink-0 mt-0.5 sm:mt-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-border shrink-0 mt-0.5 sm:mt-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">{t.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTopic(t.id, !t.completed);
                        }}
                        className="min-h-10 px-3 py-1.5 text-xs border border-border bg-card text-foreground hover:border-foreground transition-colors shrink-0 self-end sm:self-auto"
                        style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
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
