"use client";

import { useEffect, useRef, useState } from "react";
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
  GraduationCap,
} from "lucide-react";

export interface TopicSubtopic {
  _id?: string;
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
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!topic) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [topic]);

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
    const subId = sub.id || sub._id;
    if (!subId) return;
    setUpdating(true);
    try {
      await onToggleSubtopic(topic.id, subId, !sub.completed);
    } finally {
      setUpdating(false);
    }
  };

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case "project":
        return { label: "Portfolio project" };
      case "career":
        return { label: "Career milestone" };
      case "recommended":
        return { label: "Recommended" };
      case "optional":
        return { label: "Optional" };
      default:
        return { label: "Required" };
    }
  };

  const getResourceIcon = (type?: string) => {
    switch (type) {
      case "video":
        return <PlayCircle className="w-4 h-4 text-foreground shrink-0" />;
      case "course":
        return <GraduationCap className="w-4 h-4 text-foreground shrink-0" />;
      case "tool":
        return <Wrench className="w-4 h-4 text-foreground shrink-0" />;
      case "practice":
        return <FileCode2 className="w-4 h-4 text-foreground shrink-0" />;
      default:
        return <BookOpen className="w-4 h-4 text-foreground shrink-0" />;
    }
  };

  const badge = getTypeBadge(topic.type);
  const completedSubtopics = (topic.subtopics || []).filter((s) => s.completed).length;
  const totalSubtopics = (topic.subtopics || []).length;
  const subPercent = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4 bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="topic-modal-title"
        className="relative w-full sm:max-w-2xl max-h-[100dvh] sm:max-h-[90vh] bg-card border-t sm:border border-border text-card-foreground shadow-[6px_6px_0_0_#000] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-border bg-muted/40 flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="monolith-chip"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {badge.label}
              </span>
              {topic.timeEstimate && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[12rem]">{topic.timeEstimate}</span>
                </span>
              )}
            </div>

            <h2
              id="topic-modal-title"
              className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-snug"
              style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
            >
              {topic.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close topic details"
            className="h-10 w-10 shrink-0 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-6 flex-1 min-h-0 text-foreground text-sm">
          <div className="space-y-2 bg-background p-4 border border-border">
            <h3
              className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Overview
            </h3>
            <p className="leading-relaxed text-foreground">{topic.description}</p>
          </div>

          {(topic.whyItMatters || topic.nonTechTip) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topic.whyItMatters && (
                <div className="p-4 border border-border bg-card space-y-1.5">
                  <div
                    className="flex items-center gap-2 text-foreground font-semibold text-[11px] uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <Briefcase className="w-4 h-4 shrink-0" />
                    Why it matters
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{topic.whyItMatters}</p>
                </div>
              )}

              {topic.nonTechTip && (
                <div className="p-4 border border-border bg-card space-y-1.5">
                  <div
                    className="flex items-center gap-2 text-foreground font-semibold text-[11px] uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <Lightbulb className="w-4 h-4 shrink-0" />
                    Beginner tip
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{topic.nonTechTip}</p>
                </div>
              )}
            </div>
          )}

          {topic.youtubeVideos && topic.youtubeVideos.length > 0 && (
            <YouTubeShelf videos={topic.youtubeVideos} skillTitle={topic.title} />
          )}

          {topic.subtopics && topic.subtopics.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3
                  className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 min-w-0"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Checklist ({completedSubtopics}/{totalSubtopics})</span>
                </h3>
                <span className="text-xs text-muted-foreground font-mono shrink-0">{subPercent}%</span>
              </div>

              <div className="space-y-2 border border-border bg-background p-2">
                {topic.subtopics.map((sub, idx) => (
                  <button
                    key={sub.id || idx}
                    type="button"
                    disabled={updating}
                    onClick={() => handleSubtopicToggle(sub)}
                    className={`w-full flex items-start gap-3 p-3 min-h-11 text-left border transition-colors ${
                      sub.completed
                        ? "border-border bg-muted/50 text-muted-foreground"
                        : "border-border bg-card text-foreground hover:border-foreground"
                    }`}
                  >
                    {sub.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <span className={`text-sm font-medium leading-normal ${sub.completed ? "line-through text-muted-foreground" : ""}`}>
                      {sub.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {topic.resources && topic.resources.length > 0 && (
            <div className="space-y-3">
              <h3
                className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Resources
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {topic.resources.map((res, idx) => (
                  <a
                    key={idx}
                    href={res.url || "#"}
                    target={res.url ? "_blank" : "_self"}
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 min-w-0 p-3 min-h-11 border border-border bg-card hover:border-foreground transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getResourceIcon(res.type)}
                      <span className="text-xs font-medium text-foreground truncate">
                        {res.title}
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-foreground" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {topic.deliverable && (
            <div className="p-4 border border-border bg-background space-y-1.5">
              <div
                className="flex items-center gap-2 text-foreground font-semibold text-[11px] uppercase tracking-wider"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <FileCode2 className="w-4 h-4 shrink-0" />
                Portfolio deliverable
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{topic.deliverable}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-muted/40 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 px-4 py-2 border border-border text-muted-foreground text-xs hover:border-foreground hover:text-foreground transition-colors"
            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
          >
            Close
          </button>

          <button
            type="button"
            disabled={updating}
            onClick={handleTopicToggle}
            className={`min-h-10 px-5 py-2 text-xs font-bold border-2 border-black flex items-center justify-center gap-2 disabled:opacity-50 ${
              topic.completed
                ? "bg-background text-foreground"
                : "bg-primary text-primary-foreground shadow-[3px_3px_0_0_#000]"
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
          >
            {topic.completed ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Mark incomplete
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Mark complete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
