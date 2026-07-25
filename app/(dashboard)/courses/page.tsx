"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import CourseCard from "@/components/courses/CourseCard";
import CourseFilters from "@/components/courses/CourseFilters";
import { toast } from "sonner";

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
}

interface CoursesMeta {
  careerPath?: string;
  source?: string;
  youtubeEnabled?: boolean;
  topicCount?: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [meta, setMeta] = useState<CoursesMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const [level, setLevel] = useState("all");
  const [budget, setBudget] = useState("all");

  const fetchCourses = useCallback(async (opts?: { refresh?: boolean }) => {
    const isRefresh = Boolean(opts?.refresh);
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = new URL("/api/courses", window.location.origin);
      url.searchParams.append("level", level);
      url.searchParams.append("budget", budget);
      if (isRefresh) url.searchParams.append("refresh", "1");

      const res = await fetch(url.toString());
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorStatus(res.status);
        setErrorCode(data?.code || null);
        if (res.status !== 404) {
          throw new Error(data?.message || "Failed to load courses");
        }
        setCourses([]);
        setMeta(null);
        return;
      }

      // Support both new { courses, meta } shape and legacy array responses.
      const list = Array.isArray(data) ? data : data.courses || [];
      setCourses(list);
      setMeta(Array.isArray(data) ? null : data.meta || null);
      setErrorStatus(null);
      setErrorCode(null);

      if (isRefresh) {
        toast.success("Courses refreshed from live providers");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load course recommendations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [level, budget]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="flex justify-between items-center">
            <div className="h-5 w-20 bg-[#262626]" />
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-[#262626]" />
              <div className="h-5 w-12 bg-[#262626]" />
            </div>
          </div>
          <div className="h-12 w-full bg-[#262626]" />
          <div className="h-4 w-32 bg-[#262626]" />
          <div className="flex gap-3 pt-3 border-t border-[#262626]">
            <div className="h-9 flex-1 bg-[#262626]" />
            <div className="h-9 w-9 bg-[#262626]" />
          </div>
        </div>
      ))}
    </div>
  );

  if (loading && courses.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="border-b border-[#262626] pb-6">
          <div className="h-8 w-64 bg-[#1A1A1A] mb-2" />
          <div className="h-4 w-96 bg-[#1A1A1A]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4">
              <div className="h-6 w-24 bg-[#262626] mb-4" />
              <div className="space-y-3">
                <div className="h-4 w-12 bg-[#262626]" />
                <div className="h-9 w-full bg-[#262626]" />
              </div>
            </div>
          </div>
          <div className="md:col-span-3">
            {renderSkeletons()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-[#262626] pb-6 animate-fade-in-up flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[28px]">school</span>
            Course Recommendations
          </h1>
          <p className="text-sm text-[#8e9192] mt-2 max-w-2xl">
            Live courses matched to your roadmap milestones via Coursera catalog
            {meta?.youtubeEnabled ? " + YouTube" : ""}.
            {meta?.careerPath ? (
              <> Path: <span className="text-[#c4c7c8]">{meta.careerPath}</span>.</>
            ) : null}
          </p>
        </div>
        {errorStatus !== 404 && (
          <button
            type="button"
            onClick={() => fetchCourses({ refresh: true })}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground border-2 border-black px-4 py-2 text-xs font-bold disabled:opacity-40 shadow-[3px_3px_0_0_#000]"
            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
          >
            <span className={`material-symbols-outlined text-[16px] ${refreshing ? "animate-spin" : ""}`}>
              sync
            </span>
            {refreshing ? "Refreshing…" : "Refresh live"}
          </button>
        )}
      </div>

      <div className="relative">
        {errorStatus === 404 ? (
          <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-[#262626] max-w-lg mx-auto py-16 px-8 space-y-6 bg-[#131313] animate-fade-in-up">
            <div className="h-16 w-16 border border-[#262626] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[32px]">
                {errorCode === "NO_ROADMAP" ? "map" : "explore"}
              </span>
            </div>
            <div className="space-y-2">
              <h3
                className="font-bold text-xl text-white"
                style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
              >
                {errorCode === "NO_ROADMAP" ? "Roadmap Required" : "No Career Path Selected"}
              </h3>
              <p className="text-sm text-[#8e9192] max-w-sm">
                {errorCode === "NO_ROADMAP"
                  ? "Generate your learning roadmap first — we pull live courses from those milestones."
                  : "Complete Career Discovery and select a path before we can recommend courses."}
              </p>
            </div>
            <Link
              href={errorCode === "NO_ROADMAP" ? "/roadmap" : "/career"}
              className="inline-flex items-center px-6 py-2.5 bg-white text-[#0A0A0A] font-bold hover:bg-[#e2e2e2] transition-colors text-xs group"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
            >
              {errorCode === "NO_ROADMAP" ? "Open Roadmap" : "Start Career Assessment"}
              <span className="material-symbols-outlined text-[16px] ml-1.5 group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1 space-y-4">
              <CourseFilters
                level={level}
                setLevel={setLevel}
                budget={budget}
                setBudget={setBudget}
              />
              {!meta?.youtubeEnabled && (
                <div className="bg-[#1A1A1A] border border-[#262626] p-4 text-[11px] text-[#8e9192] leading-relaxed">
                  Tip: add <code className="text-[#c4c7c8]">YOUTUBE_API_KEY</code> to{" "}
                  <code className="text-[#c4c7c8]">.env.local</code> for free long-form YouTube
                  courses alongside Coursera.
                </div>
              )}
            </div>

            <div className="md:col-span-3">
              {loading || refreshing ? (
                renderSkeletons()
              ) : courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-[#262626] py-16 space-y-4 bg-[#131313] animate-fade-in-up">
                  <div className="h-12 w-12 border border-[#262626] flex items-center justify-center text-[#8e9192]">
                    <span className="material-symbols-outlined text-[24px]">library_books</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-white">No Matching Courses Found</h4>
                    <p className="text-sm text-[#8e9192] max-w-xs mt-1">
                      No courses match your filters. Broaden criteria or refresh live results.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {courses.map((course, idx) => (
                    <div key={course._id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                      <CourseCard course={course} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
