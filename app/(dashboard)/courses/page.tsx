"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  externalId?: string;
}

interface CoursesMeta {
  careerPath?: string;
  source?: string;
  youtubeEnabled?: boolean;
  youtubeCount?: number;
  liveYouTubeCount?: number;
  topicCount?: number;
  topicOrder?: string[];
}

/** Prefer the skill headline before ":" / em-dash for section titles. */
function milestoneHeadline(topic?: string): string {
  if (!topic) return "More recommendations";
  const head = topic.split(/[:—–]/)[0]?.trim();
  if (head && head.length >= 8) return head;
  return topic.length > 90 ? `${topic.slice(0, 87)}…` : topic;
}

function groupCoursesByMilestone(
  courses: Course[],
  topicOrder?: string[]
): Array<{ topic: string; headline: string; level?: string; courses: Course[] }> {
  const map = new Map<string, Course[]>();

  for (const course of courses) {
    const topic = course.sourceTopic?.trim() || "More recommendations";
    if (!map.has(topic)) map.set(topic, []);
    map.get(topic)!.push(course);
  }

  const orderedTopics =
    topicOrder && topicOrder.length > 0
      ? [
          ...topicOrder.filter((t) => map.has(t)),
          ...[...map.keys()].filter((t) => !topicOrder.includes(t)),
        ]
      : [...map.keys()];

  return orderedTopics.map((topic) => {
    const list = map.get(topic) || [];
    return {
      topic,
      headline: milestoneHeadline(topic),
      level: list[0]?.skillLevel,
      courses: list,
    };
  });
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [meta, setMeta] = useState<CoursesMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const [level, setLevel] = useState("all");
  // Free-first: YouTube + free options are what most learners want.
  const [budget, setBudget] = useState("free");

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

  const grouped = useMemo(
    () => groupCoursesByMilestone(courses, meta?.topicOrder),
    [courses, meta?.topicOrder]
  );

  const renderSkeletons = () => (
    <div className="space-y-8">
      {[1, 2].map((section) => (
        <div key={section} className="space-y-4">
          <div className="h-5 w-64 bg-card" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-card border border-border p-5 space-y-4 animate-fade-in-up"
                style={{ animationDelay: `${(section * 2 + i) * 60}ms` }}
              >
                <div className="flex justify-between items-center">
                  <div className="h-5 w-20 bg-[#262626]" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-[#262626]" />
                    <div className="h-5 w-12 bg-[#262626]" />
                  </div>
                </div>
                <div className="h-12 w-full bg-[#262626]" />
                <div className="h-4 w-32 bg-[#262626]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading && courses.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="border-b border-border pb-6">
          <div className="h-8 w-64 bg-card mb-2" />
          <div className="h-4 w-96 bg-card" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="bg-card border border-border p-5 space-y-4">
              <div className="h-6 w-24 bg-[#262626] mb-4" />
              <div className="space-y-3">
                <div className="h-4 w-12 bg-[#262626]" />
                <div className="h-9 w-full bg-[#262626]" />
              </div>
            </div>
          </div>
          <div className="md:col-span-3">{renderSkeletons()}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6 animate-fade-in-up flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[28px]">school</span>
            Course Recommendations
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Free-first picks for your next roadmap milestones
            {meta?.youtubeEnabled ? " — YouTube full courses + Coursera" : " via Coursera"}.
            {meta?.careerPath ? (
              <> Path: <span className="text-muted-foreground">{meta.careerPath}</span>.</>
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
          <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-border max-w-lg mx-auto py-16 px-8 space-y-6 bg-card/40 animate-fade-in-up">
            <div className="h-16 w-16 border border-border flex items-center justify-center text-foreground">
              <span className="material-symbols-outlined text-[32px]">
                {errorCode === "NO_ROADMAP" ? "map" : "explore"}
              </span>
            </div>
            <div className="space-y-2">
              <h3
                className="font-bold text-xl text-foreground"
                style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
              >
                {errorCode === "NO_ROADMAP" ? "Roadmap Required" : "No Career Path Selected"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {errorCode === "NO_ROADMAP"
                  ? "Generate your learning roadmap first — we pull live courses from those milestones."
                  : "Complete Career Discovery and select a path before we can recommend courses."}
              </p>
            </div>
            <Link
              href={errorCode === "NO_ROADMAP" ? "/roadmap" : "/career"}
              className="inline-flex items-center px-6 py-2.5 bg-primary text-primary-foreground border-2 border-black font-bold hover:opacity-90 transition-colors text-xs group"
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
{budget === "free" && (
                <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                  Showing free options first. Switch to{" "}
                  <button
                    type="button"
                    onClick={() => setBudget("all")}
                    className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    All Prices
                  </button>{" "}
                  for paid Coursera courses too.
                </p>
              )}
            </div>

            <div className="md:col-span-3">
              {loading || refreshing ? (
                renderSkeletons()
              ) : courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-border py-16 space-y-4 bg-card/40 animate-fade-in-up">
                  <div className="h-12 w-12 border border-border flex items-center justify-center text-muted-foreground">
                    <span className="material-symbols-outlined text-[24px]">library_books</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-foreground">No matching courses</h4>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1 mx-auto">
                      {budget === "free"
                        ? "No free courses for these filters. Try All Prices, or refresh live results."
                        : "No courses match your filters. Broaden criteria or refresh live results."}
                    </p>
                  </div>
                  {budget === "free" && (
                    <button
                      type="button"
                      onClick={() => setBudget("all")}
                      className="inline-flex items-center px-4 py-2 border border-border text-xs text-foreground hover:border-foreground transition-colors"
                      style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
                    >
                      Show all prices
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-10">
                  {grouped.map((group, gIdx) => (
                    <section key={group.topic} className="space-y-4 animate-fade-in-up" style={{ animationDelay: `${gIdx * 60}ms` }}>
                      <div className="border-b border-border pb-3">
                        <p
                          className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] mb-1"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          Step {gIdx + 1} of {grouped.length}
                          {group.level ? ` · ${group.level}` : ""}
                        </p>
                        <h2
                          className="text-lg font-bold text-foreground leading-snug"
                          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                        >
                          {group.headline}
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {group.courses.map((course, idx) => (
                          <div
                            key={course._id}
                            className="animate-fade-in-up"
                            style={{ animationDelay: `${gIdx * 60 + idx * 40}ms` }}
                          >
                            <CourseCard course={course} hideMilestone />
                          </div>
                        ))}
                      </div>
                    </section>
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
