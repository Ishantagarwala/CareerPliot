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
          <div className="h-5 w-64 rounded-lg bg-muted" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="animate-fade-in-up space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft"
                style={{ animationDelay: `${(section * 2 + i) * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-20 rounded-lg bg-muted" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 rounded-full bg-muted" />
                    <div className="h-5 w-12 rounded-full bg-muted" />
                  </div>
                </div>
                <div className="h-12 w-full rounded-lg bg-muted" />
                <div className="h-4 w-32 rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading && courses.length === 0) {
    return (
      <div className="animate-fade-in-up space-y-8">
        <div className="border-b border-border pb-6">
          <div className="mb-2 h-8 w-64 rounded-lg bg-muted" />
          <div className="h-4 w-96 max-w-full rounded-lg bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="mb-4 h-6 w-24 rounded-lg bg-muted" />
              <div className="space-y-3">
                <div className="h-4 w-12 rounded-lg bg-muted" />
                <div className="h-9 w-full rounded-lg bg-muted" />
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
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="font-display flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[22px]">school</span>
            </span>
            Course Recommendations
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Free-first picks for your next roadmap milestones
            {meta?.youtubeEnabled ? " — YouTube full courses + Coursera" : " via Coursera"}.
            {meta?.careerPath ? (
              <> Path: <span className="font-medium text-foreground">{meta.careerPath}</span>.</>
            ) : null}
          </p>
        </div>
        {errorStatus !== 404 && (
          <button
            type="button"
            onClick={() => fetchCourses({ refresh: true })}
            disabled={refreshing || loading}
            className="inline-flex h-9 items-center gap-2 self-start rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:opacity-40"
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
          <div className="mx-auto flex max-w-lg animate-fade-in-up flex-col items-center justify-center space-y-6 rounded-2xl border border-dashed border-border bg-card/50 px-8 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[32px]">
                {errorCode === "NO_ROADMAP" ? "map" : "explore"}
              </span>
            </div>
            <div className="max-w-sm space-y-2">
              <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                {errorCode === "NO_ROADMAP" ? "Roadmap Required" : "No Career Path Selected"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {errorCode === "NO_ROADMAP"
                  ? "Generate your learning roadmap first — we pull live courses from those milestones."
                  : "Complete Career Discovery and select a path before we can recommend courses."}
              </p>
            </div>
            <Link
              href={errorCode === "NO_ROADMAP" ? "/roadmap" : "/career"}
              className="group inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
            >
              {errorCode === "NO_ROADMAP" ? "Open Roadmap" : "Start Career Assessment"}
              <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="space-y-4 md:col-span-1">
              <CourseFilters
                level={level}
                setLevel={setLevel}
                budget={budget}
                setBudget={setBudget}
              />
{budget === "free" && (
                <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
                  Showing free options first. Switch to{" "}
                  <button
                    type="button"
                    onClick={() => setBudget("all")}
                    className="underline underline-offset-2 transition-colors hover:text-foreground"
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
                <div className="flex animate-fade-in-up flex-col items-center justify-center space-y-4 rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[24px]">library_books</span>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold tracking-tight text-foreground">No matching courses</h4>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                      {budget === "free"
                        ? "No free courses for these filters. Try All Prices, or refresh live results."
                        : "No courses match your filters. Broaden criteria or refresh live results."}
                    </p>
                  </div>
                  {budget === "free" && (
                    <button
                      type="button"
                      onClick={() => setBudget("all")}
                      className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      Show all prices
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-10">
                  {grouped.map((group, gIdx) => (
                    <section key={group.topic} className="animate-fade-in-up space-y-4" style={{ animationDelay: `${gIdx * 60}ms` }}>
                      <div className="border-b border-border pb-3">
                        <p className="mb-1 text-[13px] font-medium text-muted-foreground">
                          Step {gIdx + 1} of {grouped.length}
                          {group.level ? ` · ${group.level}` : ""}
                        </p>
                        <h2 className="text-lg font-bold leading-snug tracking-tight text-foreground">
                          {group.headline}
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
