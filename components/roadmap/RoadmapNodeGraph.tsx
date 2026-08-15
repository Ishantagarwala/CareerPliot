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
  BookOpen,
  Zap,
  Target,
  Trophy,
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
    number: "01",
    label: "Foundation",
  },
  intermediate: {
    icon: Target,
    number: "02",
    label: "Core skills",
  },
  advanced: {
    icon: Trophy,
    number: "03",
    label: "Mastery",
  },
};

const TYPE_LABEL: Record<string, string> = {
  required: "Required",
  recommended: "Recommended",
  optional: "Optional",
  project: "Project",
  career: "Career",
};

export default function RoadmapNodeGraph({
  stages,
  currentStage,
  onSelectTopic,
  onToggleTopic,
}: RoadmapNodeGraphProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const chipBase =
    "min-h-10 px-3.5 py-2 text-xs border-2 font-medium transition-colors shrink-0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics…"
            className="w-full min-h-10 pl-10 pr-4 py-2.5 text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
          {[
            { id: "all", label: "All" },
            { id: "required", label: "Required" },
            { id: "project", label: "Projects" },
            { id: "completed", label: "Done" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              className={`${chipBase} ${
                filterType === f.id
                  ? "bg-primary text-primary-foreground border-black shadow-[3px_3px_0_0_#000]"
                  : "bg-card text-foreground border-border hover:border-foreground"
              }`}
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
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
              <section
                className={`bg-card overflow-hidden ${
                  isActive ? "border-2 border-black" : "border border-border"
                }`}
              >
                <div className="p-4 sm:p-6 border-b border-border bg-muted/40">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 border-2 border-black bg-primary text-primary-foreground flex items-center justify-center">
                        <StageIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            Stage {cfg.number} · {cfg.label}
                          </span>
                          {isActive && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold border border-border bg-background"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              Active
                            </span>
                          )}
                          {!isActive && completedCount === totalCount && totalCount > 0 && (
                            <span
                              className="px-2 py-0.5 text-[10px] font-bold border-2 border-black bg-primary text-primary-foreground"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              Complete
                            </span>
                          )}
                          {!isActive && stageIdx > 0 && completedCount === 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] border border-border text-muted-foreground"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              <Lock className="w-2.5 h-2.5" />
                              Upcoming
                            </span>
                          )}
                        </div>
                        <h3
                          className="text-lg font-bold text-foreground leading-tight"
                          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                        >
                          {stage.title || (
                            stage.name === "beginner" ? "Foundations & core concepts"
                            : stage.name === "intermediate" ? "Frameworks, tools & real workflows"
                            : "Portfolio projects & career launch"
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          {stage.description || (
                            stage.name === "beginner" ? "Start from zero. Build your vocabulary and foundational skills."
                            : stage.name === "intermediate" ? "Go hands-on with real tools, APIs, and industry workflows."
                            : "Ship real projects, build your portfolio, and ace interviews."
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-left sm:text-right">
                        <div
                          className="text-2xl font-bold text-foreground tabular-nums"
                          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                        >
                          {pct}%
                        </div>
                        <div
                          className="text-[10px] text-muted-foreground uppercase tracking-wider"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {completedCount}/{totalCount} done
                        </div>
                      </div>
                      <div className="w-10 h-10 relative" aria-hidden>
                        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="3" />
                          <circle
                            cx="18"
                            cy="18"
                            r="15"
                            fill="none"
                            stroke="var(--primary)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${pct * 0.942} 94.2`}
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  {filtered.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-border bg-background/50">
                      <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto px-4">
                        {allTopics.length === 0
                          ? "No topics yet — use Regenerate above to build this stage."
                          : "No topics match your search or filter."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filtered.map((topic, topicIdx) => {
                        const subDone = (topic.subtopics || []).filter((s) => s.completed).length;
                        const subTotal = (topic.subtopics || []).length;
                        const videos = topic.youtubeVideos || [];
                        const typeLabel = TYPE_LABEL[topic.type || "required"] || TYPE_LABEL.required;

                        return (
                          <div
                            key={topic.id || topicIdx}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectTopic(topic)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelectTopic(topic);
                              }
                            }}
                            className={`group flex flex-col min-w-0 cursor-pointer transition-colors ${
                              topic.completed
                                ? "border-2 border-foreground bg-card"
                                : "border border-border bg-card hover:border-foreground"
                            }`}
                          >
                            <div className="p-4 sm:p-5 flex-1 flex flex-col gap-3 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <span
                                  className="monolith-chip"
                                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                >
                                  {typeLabel}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  {topic.timeEstimate && (
                                    <span
                                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground max-w-[7.5rem] truncate"
                                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                    >
                                      <Clock className="w-3.5 h-3.5 shrink-0" />
                                      {topic.timeEstimate}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    aria-label={topic.completed ? "Mark incomplete" : "Mark complete"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleTopic(topic.id, !topic.completed);
                                    }}
                                    className="h-9 w-9 shrink-0 border border-border flex items-center justify-center hover:border-foreground"
                                  >
                                    {topic.completed ? (
                                      <CheckCircle2 className="w-5 h-5 text-foreground" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              <div className="min-w-0">
                                <h4
                                  className={`text-base font-bold leading-snug ${
                                    topic.completed ? "line-through text-muted-foreground" : "text-foreground"
                                  }`}
                                  style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                                >
                                  {topic.title}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                                  {topic.description}
                                </p>
                              </div>

                              {videos.length > 0 && (
                                <div className="border-t border-border pt-3 space-y-1 min-w-0">
                                  {videos.slice(0, 2).map((vid, i) => (
                                    <a
                                      key={i}
                                      href={vid.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-2 min-w-0 py-1 text-xs text-foreground hover:underline"
                                    >
                                      <Play className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{vid.title}</span>
                                    </a>
                                  ))}
                                  {videos.length > 2 && (
                                    <p className="text-[11px] text-muted-foreground pl-5">
                                      +{videos.length - 2} more in details
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="px-4 sm:px-5 py-3 border-t border-border flex items-center justify-between gap-2 min-w-0">
                              <span
                                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                              >
                                <Sparkles className="w-3 h-3 shrink-0" />
                                <span className="truncate">
                                  {subTotal > 0 ? `${subDone}/${subTotal} subtopics` : "Open details"}
                                </span>
                              </span>
                              <span className="text-xs text-foreground flex items-center gap-0.5 font-medium shrink-0 group-hover:translate-x-0.5 transition-transform">
                                Details <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>
          );
        })}
      </div>
    </div>
  );
}
