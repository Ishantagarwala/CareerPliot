"use client";

import { useState } from "react";
import { TopicNode } from "./TopicDetailModal";
import {
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Lock,
  ChevronRight,
  Search,
  Play,
  ExternalLink,
  BookOpen,
  Zap,
  Target,
  Trophy,
  ArrowDown,
} from "lucide-react";

export interface RoadmapStageData {
  name: "beginner" | "intermediate" | "advanced";
  title?: string;
  description?: string;
  topics?: TopicNode[];
}

interface RoadmapNodeGraphProps {
  stages: RoadmapStageData[];
  currentStage: "beginner" | "intermediate" | "advanced";
  onSelectTopic: (topic: TopicNode) => void;
  onToggleTopic: (topicId: string, completed: boolean) => Promise<void>;
}

const STAGE_CONFIG = {
  beginner: {
    icon: Zap,
    color: "emerald",
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    glow: "shadow-emerald-500/10",
    dot: "bg-emerald-400",
    ring: "ring-emerald-500/30",
    number: "01",
    label: "Foundation",
  },
  intermediate: {
    icon: Target,
    color: "blue",
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
    border: "border-blue-500/30",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    glow: "shadow-blue-500/10",
    dot: "bg-blue-400",
    ring: "ring-blue-500/30",
    number: "02",
    label: "Core Skills",
  },
  advanced: {
    icon: Trophy,
    color: "purple",
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
    border: "border-purple-500/30",
    badge: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    glow: "shadow-purple-500/10",
    dot: "bg-purple-400",
    ring: "ring-purple-500/30",
    number: "03",
    label: "Mastery",
  },
};

const TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  required: { label: "Required", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  recommended: { label: "Recommended", cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  optional: { label: "Optional", cls: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20" },
  project: { label: "Project", cls: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  career: { label: "Career", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
};

function YTCard({ vid, idx }: { vid: any; idx: number }) {
  return (
    <a
      href={vid.url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="group/yt flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
    >
      <div className="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0 group-hover/yt:bg-red-500 group-hover/yt:border-red-500 transition-all">
        <Play className="w-3 h-3 text-red-400 fill-red-400 group-hover/yt:text-white group-hover/yt:fill-white ml-0.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-zinc-300 truncate group-hover/yt:text-white transition-colors">
          {vid.title}
        </p>
        <p className="text-[10px] text-zinc-500 truncate">{vid.channel}</p>
      </div>
      <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover/yt:opacity-100 shrink-0 transition-opacity" />
    </a>
  );
}

export default function RoadmapNodeGraph({
  stages,
  currentStage,
  onSelectTopic,
  onToggleTopic,
}: RoadmapNodeGraphProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills — html, python, react, sql..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/25 focus:bg-white/8 transition-all"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: "all", label: "All" },
            { id: "required", label: "Required" },
            { id: "project", label: "Projects" },
            { id: "completed", label: "Done ✓" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3.5 py-2 text-xs rounded-xl border font-medium transition-all ${
                filterType === f.id
                  ? "bg-white text-black border-white"
                  : "bg-white/5 text-zinc-400 border-white/10 hover:border-white/25 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stages */}
      <div className="space-y-6">
        {stages.map((stage, stageIdx) => {
          const cfg = STAGE_CONFIG[stage.name] || STAGE_CONFIG.beginner;
          const StageIcon = cfg.icon;
          const allTopics = stage.topics || [];
          const completedCount = allTopics.filter((t) => t.completed).length;
          const totalCount = allTopics.length;
          const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          const isActive = currentStage === stage.name;

          const filtered = allTopics.filter((t) => {
            const q = searchQuery.toLowerCase();
            const hit =
              !q ||
              t.title.toLowerCase().includes(q) ||
              (t.description || "").toLowerCase().includes(q) ||
              (t.subtopics || []).some((s) => s.title.toLowerCase().includes(q));
            if (!hit) return false;
            if (filterType === "required") return t.type === "required" || !t.type;
            if (filterType === "project") return t.type === "project";
            if (filterType === "completed") return t.completed;
            return true;
          });

          return (
            <div key={stage.name}>
              {/* Stage Container */}
              <div
                className={`relative rounded-2xl border overflow-hidden ${
                  isActive
                    ? `${cfg.border} shadow-xl ${cfg.glow}`
                    : "border-white/8"
                }`}
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                {/* Glow gradient at top when active */}
                {isActive && (
                  <div
                    className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-60`}
                    style={{ color: `var(--${cfg.color}-500, #10b981)` }}
                  />
                )}

                {/* Stage Header */}
                <div className={`relative p-6 border-b border-white/8 bg-gradient-to-b ${cfg.gradient}`}>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl border ${cfg.badge} flex items-center justify-center shrink-0`}>
                        <StageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                            Stage {cfg.number} · {cfg.label}
                          </span>
                          {isActive && (
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${cfg.badge} flex items-center gap-1`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
                              Active
                            </span>
                          )}
                          {!isActive && completedCount === totalCount && totalCount > 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                              ✓ Complete
                            </span>
                          )}
                          {!isActive && stageIdx > 0 && completedCount === 0 && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full border bg-white/5 text-zinc-500 border-white/10 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Upcoming
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-white leading-tight">
                          {stage.title || (
                            stage.name === "beginner" ? "Foundations & Core Concepts"
                            : stage.name === "intermediate" ? "Frameworks, Tools & Real Workflows"
                            : "Portfolio Projects & Career Launch"
                          )}
                        </h3>
                        <p className="text-sm text-zinc-500 mt-0.5">
                          {stage.description || (
                            stage.name === "beginner" ? "Start from zero. Build your vocabulary and foundational skills."
                            : stage.name === "intermediate" ? "Go hands-on with real tools, APIs, and industry workflows."
                            : "Ship real projects, build your portfolio, and ace interviews."
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Progress Ring */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-2xl font-black text-white tabular-nums">{pct}%</div>
                        <div className="text-[10px] text-zinc-600 font-mono">{completedCount}/{totalCount} done</div>
                      </div>
                      <div className="w-12 h-12 relative">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15" fill="none"
                            stroke={cfg.color === "emerald" ? "#10b981" : cfg.color === "blue" ? "#3b82f6" : "#a855f7"}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${pct * 0.942} 94.2`}
                            className="transition-all duration-700"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <CheckCircle2 className={`w-4 h-4 ${pct === 100 ? "text-emerald-400" : "text-zinc-700"}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Topic Nodes Grid */}
                <div className="p-6">
                  {filtered.length === 0 ? (
                    <div className="py-16 text-center">
                      <BookOpen className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                      <p className="text-sm text-zinc-600">
                        {allTopics.length === 0
                          ? "No nodes yet — click Regenerate AI Roadmap above to build your curriculum."
                          : "No nodes match your search or filter."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                      {filtered.map((topic, topicIdx) => {
                        const typeCfg = TYPE_CONFIG[topic.type || "required"] || TYPE_CONFIG.required;
                        const subDone = (topic.subtopics || []).filter((s) => s.completed).length;
                        const subTotal = (topic.subtopics || []).length;

                        return (
                          <div
                            key={topic.id || topicIdx}
                            onClick={() => onSelectTopic(topic)}
                            className={`group relative flex flex-col rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden hover:-translate-y-0.5 ${
                              topic.completed
                                ? "border-emerald-500/25 bg-emerald-500/5"
                                : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5"
                            }`}
                          >
                            {/* Completed strip */}
                            {topic.completed && (
                              <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                            )}

                            <div className="p-5 flex-1 flex flex-col gap-4">
                              {/* Top Row */}
                              <div className="flex items-start justify-between gap-3">
                                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${typeCfg.cls}`}>
                                  {typeCfg.label}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  {topic.timeEstimate && (
                                    <span className="flex items-center gap-1 text-[10px] text-zinc-600 font-mono">
                                      <Clock className="w-3 h-3" />
                                      {topic.timeEstimate}
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleTopic(topic.id, !topic.completed);
                                    }}
                                    className="transition-transform hover:scale-110 active:scale-95"
                                  >
                                    {topic.completed ? (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Title */}
                              <div>
                                <h4
                                  className={`text-base font-bold leading-snug transition-colors ${
                                    topic.completed
                                      ? "line-through text-zinc-600"
                                      : "text-white group-hover:text-white"
                                  }`}
                                >
                                  {topic.title}
                                </h4>
                                <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed line-clamp-2">
                                  {topic.description}
                                </p>
                              </div>

                              {/* YouTube Videos */}
                              {topic.youtubeVideos && topic.youtubeVideos.length > 0 && (
                                <div className="space-y-1 border-t border-white/6 pt-3">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Play className="w-3 h-3 text-red-400 fill-red-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/80">
                                      Top Videos
                                    </span>
                                  </div>
                                  {topic.youtubeVideos.slice(0, 3).map((vid, i) => (
                                    <YTCard key={i} vid={vid} idx={i} />
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-zinc-600">
                                <Sparkles className="w-3 h-3" />
                                <span className="text-[11px] font-mono">
                                  {subTotal > 0 ? `${subDone}/${subTotal} subtopics` : "Tap to explore"}
                                </span>
                              </div>
                              <span className="text-xs text-zinc-600 group-hover:text-zinc-300 flex items-center gap-0.5 transition-colors font-medium">
                                Details <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector */}
              {stageIdx < stages.length - 1 && (
                <div className="flex justify-center py-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-px h-6 bg-gradient-to-b from-white/10 to-transparent" />
                    <div className="w-8 h-8 rounded-full border border-white/10 bg-black flex items-center justify-center">
                      <ArrowDown className="w-3.5 h-3.5 text-zinc-500 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
