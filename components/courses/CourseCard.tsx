"use client";

import React, { useState } from "react";
import { toast } from "sonner";

interface Course {
  _id: string;
  title: string;
  platform: string;
  url: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  isFree: boolean;
  rating?: number;
}

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  const [completed, setCompleted] = useState(() => {
    if (typeof window !== "undefined") {
      const key = `course_completed_${course._id}`;
      return localStorage.getItem(key) === "true";
    }
    return false;
  });
  const [loading, setLoading] = useState(false);

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
      className={`flex flex-col transition-all overflow-hidden ${
        completed
          ? "bg-[#1A1A1A] border-2 border-[#404040]"
          : "bg-[#1A1A1A] border border-[#262626] hover:border-[#404040]"
      }`}
    >
      {/* Header chips */}
      <div className="p-5 pb-0">
        <div className="flex justify-between items-start gap-2 mb-4">
          <span
            className="monolith-chip"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {course.platform}
          </span>
          <div className="flex gap-2">
            <span
              className="monolith-chip capitalize"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {course.skillLevel}
            </span>
            <span
              className={`monolith-chip ${
                course.isFree ? "border-white/20 text-white" : ""
              }`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {course.isFree ? "Free" : "Paid"}
            </span>
          </div>
        </div>

        <h3
          className="font-bold text-base text-white leading-snug line-clamp-2 mb-3"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          {course.title}
        </h3>
      </div>

      {/* Rating row */}
      <div className="px-5 pb-4">
        <div className="flex justify-between items-center">
          {course.rating && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span
                className="text-xs font-bold text-white"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {course.rating.toFixed(1)}
              </span>
            </div>
          )}
          {completed && (
            <span
              className="flex items-center gap-1 text-[10px] text-[#c4c7c8]"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
            >
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              COMPLETED
            </span>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-[#262626] px-5 py-3 flex gap-2 mt-auto">
        <a
          href={course.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-between px-4 py-2 border border-[#262626] text-white text-xs font-medium hover:border-white transition-colors group"
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">school</span>
            Start Course
          </span>
          <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
            open_in_new
          </span>
        </a>

        <button
          disabled={loading}
          onClick={toggleCompleted}
          className={`h-9 w-9 border flex items-center justify-center shrink-0 transition-colors ${
            completed
              ? "bg-white/5 border-white/30 text-white hover:bg-white/10"
              : "border-[#262626] text-[#8e9192] hover:text-white hover:border-[#404040]"
          }`}
          title={completed ? "Mark incomplete" : "Mark as completed"}
        >
          {loading ? (
            <span className="h-4 w-4 border-2 border-[#262626] border-t-white animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[18px]" style={completed ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              check_circle
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
