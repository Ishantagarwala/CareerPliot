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
  readinessScore: number;
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

  const readiness = progressData?.readinessScore || 0;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readiness / 100) * circumference;

  const hasRoadmap =
    Boolean(progressData?.roadmap?.careerPath) &&
    (progressData?.roadmap?.totalMilestones || 0) > 0;
  const nextStep = !hasRoadmap
    ? { label: "Build your roadmap", href: "/roadmap" }
    : (progressData?.metrics.coursesCompleted || 0) === 0
      ? { label: "Browse free courses", href: "/courses" }
      : null;

  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6 animate-fade-in-up">
        <h1
          className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          <span className="material-symbols-outlined text-[28px]">dashboard</span>
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Welcome back,{" "}
          <span className="font-bold text-foreground">{session?.user?.name || "Student"}</span>.
          Here is your personalized learning progress.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {selectedPath ? (
            <div className="bg-card border border-border p-8 h-full relative overflow-hidden animate-fade-in-up">
              <div className="relative">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 border border-border bg-background text-muted-foreground mb-4"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.08em" }}
                >
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  SELECTED CAREER PATH
                </div>

                <h2
                  className="text-2xl font-bold text-foreground mb-1"
                  style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                >
                  {selectedPath.careerPath}
                </h2>

                <p
                  className="text-xs text-foreground mb-4"
                  style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
                >
                  Compatibility Score: {selectedPath.matchScore}% Match
                </p>

                <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xl">
                  {selectedPath.reasoning}
                </p>

                <div className="border-t border-border pt-4 flex flex-wrap gap-3">
                  <Link
                    href="/roadmap"
                    className="inline-flex items-center px-5 py-2 bg-primary text-primary-foreground border-2 border-black font-bold hover:opacity-90 transition-colors text-xs group shadow-[3px_3px_0_0_#000]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
                  >
                    View Roadmap
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="/career"
                    className="inline-flex items-center px-5 py-2 border border-border text-foreground hover:border-foreground transition-colors text-xs"
                    style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
                  >
                    Change Path
                  </Link>
                  {nextStep && (
                    <Link
                      href={nextStep.href}
                      className="inline-flex items-center px-4 py-2 border border-primary/40 text-foreground text-xs hover:bg-primary/10 transition-colors"
                      style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
                    >
                      Next: {nextStep.label}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-border bg-card/40 p-8 h-full flex flex-col animate-fade-in-up">
              <div className="mb-6 text-center sm:text-left">
                <p
                  className="text-[10px] text-muted-foreground uppercase tracking-[0.14em] mb-2"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Get started · 4 steps
                </p>
                <h3
                  className="font-bold text-xl text-foreground"
                  style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                >
                  Build your career plan
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                  Follow these steps in order — each one unlocks the next.
                </p>
              </div>

              <ol className="space-y-3 flex-1">
                {START_STEPS.map((item) => (
                  <li key={item.step}>
                    <Link
                      href={item.href}
                      className="flex items-start gap-4 p-4 border border-border bg-card hover:border-foreground transition-colors group"
                    >
                      <span
                        className="h-8 w-8 shrink-0 flex items-center justify-center border-2 border-black bg-primary text-primary-foreground text-xs font-bold"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {item.step}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-muted-foreground group-hover:text-foreground">
                            {item.icon}
                          </span>
                          <span
                            className="font-bold text-sm text-foreground"
                            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                          >
                            {item.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </Link>
                  </li>
                ))}
              </ol>

              <div className="mt-6 pt-4 border-t border-border">
                <Link
                  href="/career"
                  className="inline-flex items-center px-6 py-2.5 bg-primary text-primary-foreground border-2 border-black font-bold hover:opacity-90 transition-colors text-xs group shadow-[3px_3px_0_0_#000]"
                  style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
                >
                  Start with Career Discovery
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-card border border-border p-6 h-full flex flex-col items-center justify-center text-center animate-fade-in-up">
            <div className="mb-4">
              <h3
                className="text-sm font-bold text-foreground flex items-center justify-center gap-1.5"
                style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
              >
                <span className="material-symbols-outlined text-[18px]">target</span>
                Job readiness
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Based on milestones, courses, and study activity
              </p>
            </div>

            <div className="relative h-32 w-32 flex items-center justify-center my-4">
              <svg className="h-full w-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  className="stroke-border"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  className="stroke-primary transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span
                  className="text-3xl font-bold text-foreground tracking-tight"
                  style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                >
                  {readiness}%
                </span>
                <span
                  className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Ready
                </span>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground leading-relaxed max-w-[200px] font-medium">
              {progressData?.roadmap?.completedMilestones || 0} milestones done ·{" "}
              {progressData?.metrics.coursesCompleted || 0} courses ·{" "}
              {progressData?.metrics.tutorSessions || 0} tutor chats
            </div>
          </div>
        </div>
      </div>

      {selectedPath && progressData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
