"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import SafeImage from "@/components/ui/SafeImage";

interface Course {
  _id: string;
  title: string;
  platform: string;
  url: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  isFree: boolean;
  rating?: number;
  sourceTopic?: string;
  thumbnailUrl?: string;
  externalId?: string;
}

interface CourseCardProps {
  course: Course;
  /** When grouped under a milestone heading, hide the redundant blurb. */
  hideMilestone?: boolean;
}

function isSearchDeepLink(externalId?: string): boolean {
  return (
    typeof externalId === "string" &&
    (externalId.startsWith("youtube-search:") || externalId.startsWith("coursera-search:"))
  );
}

function isLiveYouTube(externalId?: string): boolean {
  return typeof externalId === "string" && /^youtube:[a-zA-Z0-9_-]+$/.test(externalId);
}

export default function CourseCard({ course, hideMilestone = false }: CourseCardProps) {
  const [completed, setCompleted] = useState(() => {
    if (typeof window !== "undefined") {
      const key = `course_completed_${course._id}`;
      return localStorage.getItem(key) === "true";
    }
    return false;
  });
  const [loading, setLoading] = useState(false);

  const searchLink = isSearchDeepLink(course.externalId);
  const liveYouTube = isLiveYouTube(course.externalId);
  const isYouTube = course.platform === "YouTube" || liveYouTube || course.externalId?.startsWith("youtube-search:");

  const platformLabel = searchLink
    ? isYouTube
      ? "YouTube Search"
      : `${course.platform} Search`
    : course.platform;

  const ctaLabel = searchLink
    ? isYouTube
      ? "Search YouTube"
      : `Search ${course.platform}`
    : liveYouTube
      ? "Watch free"
      : "Start Course";

  const ctaIcon = searchLink ? "search" : liveYouTube ? "play_circle" : "school";

  const toggleCompleted = async () => {
    setLoading(true);
    try {
      const action = completed ? "uncomplete_course" : "complete_course";
      const res = await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        throw new Error("Failed to update course progress");
      }

      const nextState = !completed;
      setCompleted(nextState);

      const key = `course_completed_${course._id}`;
      if (nextState) {
        localStorage.setItem(key, "true");
        toast.success(`Completed "${course.title}"!`);
      } else {
        localStorage.removeItem(key);
        toast.info(`Marked "${course.title}" as incomplete`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update progress");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-all ${
        completed
          ? "border-primary/40"
          : "border-border hover:-translate-y-0.5 hover:shadow-lift"
      }`}
    >
      <a href={course.url} target="_blank" rel="noopener noreferrer" className="block border-b border-border">
        <SafeImage
          src={course.thumbnailUrl}
          alt={course.title}
          fallbackName={course.platform || course.title}
          className="h-36 w-full bg-background object-cover"
        />
      </a>

      <div className="flex-1 p-5 pb-0">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {platformLabel}
            </span>
            {liveYouTube && (
              <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                Full course
              </span>
            )}
            {searchLink && (
              <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                Browse results
              </span>
            )}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
              {course.skillLevel}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                course.isFree
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {course.isFree ? "Free" : "Paid"}
            </span>
          </div>
        </div>

        <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug tracking-tight text-foreground">
          {course.title}
        </h3>

        {!hideMilestone && course.sourceTopic && (
          <p className="mb-3 line-clamp-2 text-[13px] text-muted-foreground">
            For: <span>{course.sourceTopic.split(/[:—–]/)[0]?.trim()}</span>
          </p>
        )}
        {searchLink && (
          <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
            {isYouTube
              ? "Opens YouTube search — pick a full course that fits your pace."
              : `Opens ${course.platform} search — pick a course that fits your pace.`}
          </p>
        )}
      </div>

      <div className="px-5 pb-4">
        <div className="flex items-center justify-between">
          {course.rating != null && !searchLink && (
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-amber" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span className="text-xs font-bold tabular-nums text-foreground">
                {Number(course.rating).toFixed(1)}
              </span>
            </div>
          )}
          {completed && (
            <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              COMPLETED
            </span>
          )}
        </div>
      </div>

      <div className="mt-auto flex gap-2 border-t border-border px-5 py-3">
        <a
          href={course.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex h-9 flex-1 items-center justify-between rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">{ctaIcon}</span>
            {ctaLabel}
          </span>
          <span className="material-symbols-outlined text-[14px] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            open_in_new
          </span>
        </a>

        {!searchLink && (
          <button
            disabled={loading}
            onClick={toggleCompleted}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
              completed
                ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title={completed ? "Mark incomplete" : "Mark as completed"}
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ring/30 border-t-primary" />
            ) : (
              <span className="material-symbols-outlined text-[18px]" style={completed ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                check_circle
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
