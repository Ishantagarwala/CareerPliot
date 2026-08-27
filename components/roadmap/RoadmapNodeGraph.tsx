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
    "inline-flex h-9 shrink-0 items-center rounded-lg px-3.5 text-[13px] font-medium transition-colors";

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
            aria-label="Search topics"
            className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
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
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
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
                className={`overflow-hidden rounded-2xl border bg-card shadow-soft ${
                  isActive ? "border-primary/40 glow-ai" : "border-border"
                }`}
              >
                <div className="flex flex-col justify-between gap-4 border-b border-border bg-muted/40 p-4 sm:flex-row sm:items-start sm:p-6">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-12 sm:w-12">
                      <StageIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-muted-foreground">
                          Stage {cfg.number} · {cfg.label}
                        </span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            <span className="h-1.5 w-1.5 animate-cp-pulse rounded-full bg-primary" />
                            Active
                          </span>
                        )}
                        {!isActive && completedCount === totalCount && totalCount > 0 && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Complete
                          </span>
                        )}
                        {!isActive && stageIdx > 0 && completedCount === 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                            <Lock className="w-2.5 h-2.5" />
                            Upcoming
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-lg font-bold leading-tight text-foreground">
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

                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-left sm:text-right">
                        <div className="font-display text-2xl font-bold tabular-nums text-foreground">
                          {pct}%
                        </div>
                        <div className="text-[13px] font-medium text-muted-foreground">
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

                <div className="p-4 sm:p-6">
                  {filtered.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-border bg-background/50 py-12 text-center">
                      <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
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
                            className={`group flex min-w-0 cursor-pointer flex-col rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift ${
                              topic.completed
                                ? "border-primary/40 bg-primary/[0.04]"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
                              <div className="flex items-start justify-between gap-3">
                                <span className="monolith-chip shrink-0">
                                  {typeLabel}
                                </span>
                                <div className="flex shrink-0 items-center gap-2">
                                  {topic.timeEstimate && (
                                    <span className="inline-flex max-w-[7.5rem] items-center gap-1 truncate text-xs text-muted-foreground">
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
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted ${
                                      topic.completed ? "text-primary" : "text-muted-foreground"
                                    }`}
                                  >
                                    {topic.completed ? (
                                      <CheckCircle2 className="h-5 w-5" />
                                    ) : (
                                      <Circle className="group-hover:text-foreground h-5 w-5" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              <div className="min-w-0">
                                <h4
                                  className={`font-display text-base font-bold leading-snug ${
                                    topic.completed ? "text-muted-foreground line-through decoration-border" : "text-foreground"
                                  }`}
                                >
                                  {topic.title}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                                  {topic.description}
                                </p>
                              </div>

                              {videos.length > 0 && (
                                <div className="min-w-0 space-y-1 border-t border-border pt-3">
                                  {videos.slice(0, 2).map((vid, i) => (
                                    <a
                                      key={i}
                                      href={vid.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex min-w-0 items-center gap-2 py-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                                    >
                                      <Play className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{vid.title}</span>
                                    </a>
                                  ))}
                                  {videos.length > 2 && (
                                    <p className="pl-5 text-[11px] text-muted-foreground">
                                      +{videos.length - 2} more in details
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex min-w-0 items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5">
                              <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                                <Sparkles className="w-3 h-3 shrink-0 text-primary" />
                                <span className="truncate">
                                  {subTotal > 0 ? `${subDone}/${subTotal} subtopics` : "Open details"}
                                </span>
                              </span>
                              <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary">
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
