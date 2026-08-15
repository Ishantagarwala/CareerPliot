"use client";

import { useState } from "react";
import RoadmapNodeGraph from "./RoadmapNodeGraph";
import TopicDetailModal, { TopicNode } from "./TopicDetailModal";
import {
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Clock,
  Map,
  ListTree,
  TrendingUp,
  Target,
  Flame,
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

  // Compute realistic weeks from topic timeEstimates (e.g. "1 Week (5 hrs)" => 1)
  const computeWeeks = (): string => {
    let total = 0;
    allTopics.forEach((t) => {
      const est = (t.timeEstimate || "").toLowerCase();
      const wk = est.match(/(\d+(?:\.\d+)?)\s*(?:week|wk)/i);
      const hr = est.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr)/i);
      if (wk) total += parseFloat(wk[1]);
      else if (hr) total += parseFloat(hr[1]) / 10; // rough 10h/week
      else total += 1.5; // default 1.5 weeks per topic
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
      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(251,146,60,0.12) 0%, rgba(0,0,0,0) 70%), rgba(255,255,255,0.02)",
        }}
      >
        {/* Top glow line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        <div className="p-7 md:p-10 space-y-6">
          {/* Top Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[11px] font-semibold">
                <Sparkles className="w-3 h-3" />
                AI-Generated Career Roadmap
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-zinc-400 text-[11px] font-mono">
                <Flame className="w-3 h-3 text-orange-400" />
                {roadmap.targetRole || roadmap.careerPath}
              </span>
              {roadmap.totalEstimatedWeeks && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-zinc-400 text-[11px] font-mono">
                  <Clock className="w-3 h-3" />
                  {estimatedWeeks}
                </span>
              )}
            </div>

            {onRefreshRoadmap && (
              <button
                disabled={refreshing}
                onClick={onRefreshRoadmap}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-zinc-300 text-sm hover:border-white/25 hover:bg-white/8 hover:text-white transition-all disabled:opacity-40"
              >
                <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Regenerating…" : "Regenerate"}
              </button>
            )}
          </div>

          {/* Career Title */}
          <div>
            <h1
              className="text-4xl md:text-6xl font-black text-white leading-none tracking-tight mb-3"
              style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
            >
              {roadmap.careerPath}
            </h1>
            <p className="text-sm md:text-base text-zinc-500 max-w-2xl leading-relaxed">
              {roadmap.overview || `A structured, zero-to-hero curriculum to take you from complete beginner to job-ready as a ${roadmap.careerPath}.`}
            </p>
          </div>

          {/* Stats + Controls */}
          <div className="pt-5 border-t border-white/8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-6 text-xs font-mono">
                  <span className="text-zinc-600 uppercase tracking-wider">Career Readiness</span>
                  <span className="text-white font-bold">{pct}%</span>
                </div>
                <div className="w-52 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[10px] text-zinc-700 font-mono">{completedCount} of {totalCount} topics complete</div>
              </div>

              {/* Quick Stats */}
              <div className="hidden sm:flex items-center gap-4">
                {[
                  { icon: TrendingUp, label: "Nodes", value: String(totalCount), color: "text-blue-400" },
                  { icon: Target, label: "Stages", value: String(roadmap.stages.length), color: "text-purple-400" },
                  { icon: CheckCircle2, label: "Done", value: String(completedCount), color: "text-emerald-400" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-1.5">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <div>
                      <div className="text-base font-black text-white tabular-nums">{stat.value}</div>
                      <div className="text-[10px] text-zinc-600 font-mono">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/5">
              {[
                { id: "graph", label: "Node Graph", icon: Map },
                { id: "outline", label: "List View", icon: ListTree },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setViewMode(id as "graph" | "outline")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    viewMode === id
                      ? "bg-white text-black"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────── */}
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
              <div
                key={stage.name}
                className="rounded-2xl border border-white/8 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="p-5 border-b border-white/8 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Stage 0{idx + 1}</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{stage.title || stage.name}</h3>
                  </div>
                  <span className="text-xl font-black text-white tabular-nums font-mono">{stagePct}%</span>
                </div>
                <div className="p-5 space-y-2">
                  {topics.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTopic(t)}
                      className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/6 bg-white/3 hover:border-white/15 hover:bg-white/5 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {t.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-white/15 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{t.title}</div>
                          <div className="text-xs text-zinc-600 truncate">{t.description}</div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTopic(t.id, !t.completed);
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:border-white/25 hover:text-white transition-all shrink-0"
                      >
                        {t.completed ? "✓ Done" : "Mark done"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <TopicDetailModal
        topic={selectedTopic}
        onClose={() => setSelectedTopic(null)}
        onToggleTopic={handleToggleTopic}
        onToggleSubtopic={handleToggleSubtopic}
      />
    </div>
  );
}
