"use client";

import { useState } from "react";
import YouTubeShelf from "./YouTubeShelf";
import { YouTubeVideoRec } from "@/lib/youtubeHelper";
import {
  X,
  CheckCircle2,
  Circle,
  ExternalLink,
  Clock,
  Briefcase,
  Lightbulb,
  FileCode2,
  Sparkles,
  BookOpen,
  PlayCircle,
  Wrench,
  GraduationCap
} from "lucide-react";

export interface TopicSubtopic {
  id?: string;
  title: string;
  completed: boolean;
  completedAt?: Date | string;
}

export interface TopicResource {
  title: string;
  url?: string;
  type?: "video" | "article" | "course" | "tool" | "practice";
  free?: boolean;
}

export interface TopicNode {
  id: string;
  title: string;
  description: string;
  type?: "required" | "recommended" | "optional" | "project" | "career";
  whyItMatters?: string;
  nonTechTip?: string;
  timeEstimate?: string;
  subtopics?: TopicSubtopic[];
  resources?: TopicResource[];
  youtubeVideos?: YouTubeVideoRec[];
  deliverable?: string;
  prerequisites?: string[];
  completed: boolean;
  completedAt?: Date | string;
  stageName?: string;
}

interface TopicDetailModalProps {
  topic: TopicNode | null;
  onClose: () => void;
  onToggleTopic: (topicId: string, completed: boolean) => Promise<void>;
  onToggleSubtopic: (topicId: string, subtopicId: string, completed: boolean) => Promise<void>;
}

export default function TopicDetailModal({
  topic,
  onClose,
  onToggleTopic,
  onToggleSubtopic,
}: TopicDetailModalProps) {
  const [updating, setUpdating] = useState(false);

  if (!topic) return null;

  const handleTopicToggle = async () => {
    setUpdating(true);
    try {
      await onToggleTopic(topic.id, !topic.completed);
    } finally {
      setUpdating(false);
    }
  };

  const handleSubtopicToggle = async (sub: TopicSubtopic) => {
    if (!sub.id) return;
    setUpdating(true);
    try {
      await onToggleSubtopic(topic.id, sub.id, !sub.completed);
    } finally {
      setUpdating(false);
    }
  };

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case "project":
        return { label: "PORTFOLIO PROJECT", bg: "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-300" };
      case "career":
        return { label: "CAREER MILESTONE", bg: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300" };
      case "recommended":
        return { label: "RECOMMENDED", bg: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-300" };
      case "optional":
        return { label: "OPTIONAL", bg: "bg-secondary border-border text-muted-foreground" };
      default:
        return { label: "MUST LEARN (REQUIRED)", bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300" };
    }
  };

  const getResourceIcon = (type?: string) => {
    switch (type) {
      case "video":
        return <PlayCircle className="w-4 h-4 text-red-500" />;
      case "course":
        return <GraduationCap className="w-4 h-4 text-blue-500" />;
      case "tool":
        return <Wrench className="w-4 h-4 text-amber-500" />;
      case "practice":
        return <FileCode2 className="w-4 h-4 text-emerald-500" />;
      default:
        return <BookOpen className="w-4 h-4 text-sky-500" />;
    }
  };

  const badge = getTypeBadge(topic.type);
  const completedSubtopics = (topic.subtopics || []).filter((s) => s.completed).length;
  const totalSubtopics = (topic.subtopics || []).length;
  const subPercent = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border text-card-foreground shadow-2xl overflow-hidden flex flex-col rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-border bg-muted/40 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 border text-[10px] font-semibold uppercase tracking-wider ${badge.bg}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {badge.label}
              </span>
              {topic.timeEstimate && (
                <span
                  className="px-2 py-0.5 border border-border bg-background text-muted-foreground text-[10px] flex items-center gap-1"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {topic.timeEstimate}
                </span>
              )}
            </div>

            <h2
              className="text-2xl font-bold text-foreground tracking-tight leading-snug"
              style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
            >
              {topic.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors rounded-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-foreground text-sm">
          {/* Main Description */}
          <div className="space-y-2 bg-secondary/40 p-4 border border-border">
            <h3 className="text-xs uppercase font-semibold text-muted-foreground tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Overview
            </h3>
            <p className="leading-relaxed text-foreground">{topic.description}</p>
          </div>

          {/* Why it matters & Non-tech tip grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topic.whyItMatters && (
              <div className="p-4 border border-blue-500/20 bg-blue-500/5 space-y-1">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wider">
                  <Briefcase className="w-4 h-4" />
                  Why It Matters
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{topic.whyItMatters}</p>
              </div>
            )}

            {topic.nonTechTip && (
              <div className="p-4 border border-amber-500/20 bg-amber-500/5 space-y-1">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4" />
                  Non-Tech Beginner Tip
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{topic.nonTechTip}</p>
              </div>
            )}
          </div>

          {/* YouTube Learning Shelf */}
          {topic.youtubeVideos && topic.youtubeVideos.length > 0 && (
            <YouTubeShelf videos={topic.youtubeVideos} skillTitle={topic.title} />
          )}

          {/* Subtopics Checklist */}
          {topic.subtopics && topic.subtopics.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                  Skill Checklist ({completedSubtopics}/{totalSubtopics})
                </h3>
                <span className="text-xs text-muted-foreground font-mono">{subPercent}%</span>
              </div>

              <div className="space-y-2 border border-border bg-secondary/20 p-2">
                {topic.subtopics.map((sub, idx) => (
                  <button
                    key={sub.id || idx}
                    disabled={updating}
                    onClick={() => handleSubtopicToggle(sub)}
                    className={`w-full flex items-start gap-3 p-3 text-left border transition-all ${
                      sub.completed
                        ? "border-emerald-500/30 bg-emerald-500/10 text-muted-foreground"
                        : "border-border bg-card text-foreground hover:border-primary"
                    }`}
                  >
                    {sub.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <span className={`text-xs font-medium leading-normal ${sub.completed ? "line-through text-muted-foreground" : ""}`}>
                      {sub.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Curated Resources */}
          {topic.resources && topic.resources.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Curated Documentation & Articles
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {topic.resources.map((res, idx) => (
                  <a
                    key={idx}
                    href={res.url || "#"}
                    target={res.url ? "_blank" : "_self"}
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 border border-border bg-card hover:bg-secondary transition-colors group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {getResourceIcon(res.type)}
                      <span className="text-xs font-medium text-foreground truncate group-hover:text-primary">
                        {res.title}
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-70 group-hover:opacity-100 shrink-0 ml-2" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Deliverable Outcome */}
          {topic.deliverable && (
            <div className="p-4 border border-purple-500/20 bg-purple-500/5 space-y-1">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-xs uppercase tracking-wider">
                <FileCode2 className="w-4 h-4" />
                Key Portfolio Deliverable
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{topic.deliverable}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/40 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border text-muted-foreground text-xs hover:bg-secondary hover:text-foreground transition-colors"
          >
            Close Details
          </button>

          <button
            disabled={updating}
            onClick={handleTopicToggle}
            className={`px-5 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
              topic.completed
                ? "border border-border bg-secondary text-foreground hover:bg-muted"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {topic.completed ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Mark Topic as Incomplete
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Mark Topic Complete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

