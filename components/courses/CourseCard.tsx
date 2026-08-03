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
      className={`flex flex-col transition-all overflow-hidden h-full ${
        completed
          ? "bg-card border-2 border-border"
          : "bg-card border border-border hover:border-border"
      }`}
    >
      <a href={course.url} target="_blank" rel="noopener noreferrer" className="block border-b border-border">
        <SafeImage
          src={course.thumbnailUrl}
          alt={course.title}
          fallbackName={course.platform || course.title}
          className="w-full h-36 object-cover bg-background"
        />
      </a>

      <div className="p-5 pb-0 flex-1">
        <div className="flex justify-between items-start gap-2 mb-4">
          <div className="flex flex-wrap gap-2">
            <span
              className="monolith-chip"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {platformLabel}
            </span>
            {liveYouTube && (
              <span
                className="monolith-chip border-white/20 text-foreground"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Full course
              </span>
            )}
            {searchLink && (
              <span
                className="monolith-chip text-muted-foreground"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Browse results
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <span
              className="monolith-chip capitalize"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {course.skillLevel}
            </span>
            <span
              className={`monolith-chip ${
                course.isFree ? "border-white/20 text-foreground" : ""
              }`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {course.isFree ? "Free" : "Paid"}
            </span>
          </div>
        </div>

        <h3
          className="font-bold text-base text-foreground leading-snug line-clamp-2 mb-2"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          {course.title}
        </h3>

        {!hideMilestone && course.sourceTopic && (
          <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">
            For: <span className="text-muted-foreground">{course.sourceTopic.split(/[:—–]/)[0]?.trim()}</span>
          </p>
        )}
        {searchLink && (
          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
            {isYouTube
              ? "Opens YouTube search — pick a full course that fits your pace."
              : `Opens ${course.platform} search — pick a course that fits your pace.`}
          </p>
        )}
      </div>

      <div className="px-5 pb-4">
        <div className="flex justify-between items-center">
          {course.rating != null && !searchLink && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-foreground" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span
                className="text-xs font-bold text-foreground"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {Number(course.rating).toFixed(1)}
              </span>
            </div>
          )}
          {completed && (
            <span
              className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
            >
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              COMPLETED
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-border px-5 py-3 flex gap-2 mt-auto">
        <a
          href={course.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-between px-4 py-2 border border-border text-foreground text-xs font-medium hover:border-foreground transition-colors group"
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">{ctaIcon}</span>
            {ctaLabel}
          </span>
          <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
            open_in_new
          </span>
        </a>

        {!searchLink && (
          <button
            disabled={loading}
            onClick={toggleCompleted}
            className={`h-9 w-9 border flex items-center justify-center shrink-0 transition-colors ${
              completed
                ? "bg-white/5 border-white/30 text-foreground hover:bg-white/10"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border"
            }`}
            title={completed ? "Mark incomplete" : "Mark as completed"}
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-border border-t-white animate-spin" />
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
