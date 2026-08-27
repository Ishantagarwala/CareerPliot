"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  BookOpen,
  FileText,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import PageLoader from "@/components/layout/PageLoader";
import StatsCard from "@/components/dashboard/StatsCard";
import ProgressChart from "@/components/dashboard/ProgressChart";
import StreakTracker from "@/components/dashboard/StreakTracker";
import { toast } from "sonner";

interface CareerRecommendation {
  _id: string;
  careerPath: string;
  matchScore: number;
  reasoning: string;
  selected: boolean;
}

interface ProgressData {
  metrics: {
    coursesCompleted: number;
    pdfsAnalyzed: number;
    tutorSessions: number;
    streakDays: number;
    lastActive: string;
  };
  roadmap: {
    careerPath: string | null;
    totalMilestones: number;
    completedMilestones: number;
    milestoneCompletionRate: number;
    stageProgress: {
      beginner: { completed: number; total: number };
      intermediate: { completed: number; total: number };
      advanced: { completed: number; total: number };
    };
  };
}

const START_STEPS = [
  {
    step: 1,
    title: "Career Discovery",
    description: "Find a path that fits your skills and goals.",
    href: "/career",
    icon: "explore",
  },
  {
    step: 2,
    title: "Learning Roadmap",
    description: "Get a beginner → advanced plan for that path.",
    href: "/roadmap",
    icon: "map",
  },
  {
    step: 3,
    title: "Courses",
    description: "Pick free YouTube and Coursera courses for each milestone.",
    href: "/courses",
    icon: "school",
  },
  {
    step: 4,
    title: "AI Study Hub",
    description: "Upload notes or chat with AI while you learn.",
    href: "/ai-hub",
    icon: "auto_awesome",
  },
] as const;

export default function DashboardHome() {
  const { data: session } = useSession();
  const [selectedPath, setSelectedPath] = useState<CareerRecommendation | null>(null);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [recRes, progRes] = await Promise.all([
        fetch("/api/career/recommendations"),
        fetch("/api/progress"),
      ]);

      if (recRes.ok) {
        const recommendations = await recRes.json();
        const selected = recommendations.find((rec: CareerRecommendation) => rec.selected);
        setSelectedPath(selected || null);
      }

      if (progRes.ok) {
        const progData = await progRes.json();
        setProgressData(progData);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <PageLoader label="Loading dashboard" />;
  }

  const hasRoadmap =
    Boolean(progressData?.roadmap?.careerPath) &&
    (progressData?.roadmap?.totalMilestones || 0) > 0;
  const nextStep = !hasRoadmap
    ? { label: "Build your roadmap", href: "/roadmap" }
    : (progressData?.metrics.coursesCompleted || 0) === 0
      ? { label: "Browse free courses", href: "/courses" }
      : null;

  const firstName = session?.user?.name?.split(" ")[0] || "Student";

  return (
    <div className="space-y-7">
      <div
>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[1.75rem]">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {hasRoadmap
            ? "Here's where your plan stands today."
            : "Let's turn career confusion into a plan — four steps."}
        </p>
      </div>

      {selectedPath ? (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(480px 200px at 92% -20%, var(--glow), transparent 65%)",
            }}
          />
          <div className="relative p-6 md:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Selected career path
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                {selectedPath.careerPath}
              </h2>
              <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                {selectedPath.matchScore}% match
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {selectedPath.reasoning}
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5 border-t border-border pt-5">
              <Link
                href="/roadmap"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
              >
                View roadmap
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/career"
                className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Change path
              </Link>
              {nextStep && (
                <Link
                  href={nextStep.href}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/35 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  Next: {nextStep.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in-up rounded-2xl border border-dashed border-border bg-card/50 p-6 md:p-8">
          <div className="mb-6">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Build your career plan
            </h3>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Follow these steps in order — each one unlocks the next.
            </p>
          </div>

          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {START_STEPS.map((item) => (
              <li key={item.step}>
                <Link
                  href={item.href}
                  className="group flex h-full items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {item.step}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-muted-foreground transition-colors group-hover:text-primary">
                        {item.icon}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ol>

          <div className="mt-6 border-t border-border pt-5">
            <Link
              href="/career"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
            >
              Start with Career Discovery
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {selectedPath && progressData && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Roadmap Progress"
            value={`${progressData.roadmap.completedMilestones} / ${progressData.roadmap.totalMilestones}`}
            icon={CheckCircle2}
            description={`${progressData.roadmap.milestoneCompletionRate.toFixed(0)}% milestones completed`}
            animationDelay={0}
          />
          <StatsCard
            title="Courses Finished"
            value={progressData.metrics.coursesCompleted}
            icon={BookOpen}
            description="Self-reported completed courses"
            animationDelay={80}
          />
          <StatsCard
            title="Notes Analyzed"
            value={progressData.metrics.pdfsAnalyzed}
            icon={FileText}
            description="PDF materials studied with AI"
            animationDelay={160}
          />
          <StatsCard
            title="Tutor Sessions"
            value={progressData.metrics.tutorSessions}
            icon={MessageSquare}
            description="Interactive tutor conversations"
            animationDelay={240}
          />
        </div>
      )}

      {selectedPath && progressData && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ProgressChart
            stageProgress={progressData.roadmap.stageProgress}
            careerPath={progressData.roadmap.careerPath}
          />
          <StreakTracker
            streakDays={progressData.metrics.streakDays}
            lastActive={progressData.metrics.lastActive}
          />
        </div>
      )}
    </div>
  );
}
