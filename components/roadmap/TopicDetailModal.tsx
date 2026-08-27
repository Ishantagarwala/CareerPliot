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
        className="relative flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card text-card-foreground shadow-pop sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-muted/40 p-4 sm:p-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="monolith-chip shrink-0 bg-primary/10 text-primary">
                {badge.label}
              </span>
              {topic.timeEstimate && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="max-w-[12rem] truncate">{topic.timeEstimate}</span>
                </span>
              )}
            </div>

            <h2
              id="topic-modal-title"
              className="font-display text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl"
            >
              {topic.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close topic details"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 text-sm text-foreground sm:p-6">
          <div className="space-y-2 rounded-xl border border-border bg-background p-4">
            <h3 className="text-[13px] font-medium text-muted-foreground">
              Overview
            </h3>
            <p className="leading-relaxed text-foreground">{topic.description}</p>
          </div>

          {(topic.whyItMatters || topic.nonTechTip) && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {topic.whyItMatters && (
                <div className="space-y-1.5 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                    <Briefcase className="h-4 w-4 shrink-0 text-primary" />
                    Why it matters
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{topic.whyItMatters}</p>
                </div>
              )}

              {topic.nonTechTip && (
                <div className="space-y-1.5 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                    <Lightbulb className="h-4 w-4 shrink-0 text-amber" />
                    Beginner tip
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{topic.nonTechTip}</p>
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
                <h3 className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">Checklist ({completedSubtopics}/{totalSubtopics})</span>
                </h3>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">{subPercent}%</span>
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-background p-2">
                {topic.subtopics.map((sub, idx) => (
                  <button
                    key={sub.id || idx}
                    type="button"
                    disabled={updating}
                    onClick={() => handleSubtopicToggle(sub)}
                    className={`flex w-full min-h-11 items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      sub.completed
                        ? "border-border bg-muted/50 text-muted-foreground"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    {sub.completed ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <span className={`text-sm font-medium leading-normal ${sub.completed ? "text-muted-foreground line-through decoration-border" : ""}`}>
                      {sub.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {topic.resources && topic.resources.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[13px] font-medium text-muted-foreground">
                Resources
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {topic.resources.map((res, idx) => (
                  <a
                    key={idx}
                    href={res.url || "#"}
                    target={res.url ? "_blank" : "_self"}
                    rel="noreferrer"
                    className="group flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {getResourceIcon(res.type)}
                      <span className="truncate text-xs font-medium text-foreground">
                        {res.title}
                      </span>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {topic.deliverable && (
            <div className="space-y-1.5 rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                <FileCode2 className="h-4 w-4 shrink-0 text-primary" />
                Portfolio deliverable
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{topic.deliverable}</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse items-stretch justify-between gap-2 border-t border-border bg-muted/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Close
          </button>

          <button
            type="button"
            disabled={updating}
            onClick={handleTopicToggle}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold shadow-soft transition-colors disabled:opacity-50 ${
              topic.completed
                ? "border border-border bg-card text-foreground hover:bg-muted"
                : "bg-primary text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
            }`}
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
