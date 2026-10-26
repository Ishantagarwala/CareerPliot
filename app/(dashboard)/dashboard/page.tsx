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
  Award,
  Layers,
  Sparkles,
  Flame,
  Target,
  Compass,
  Map,
  School,
  Bot,
  Zap,
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
  flashcards?: {
    due: number;
    total: number;
    reviewedToday: number;
  };
  interviews?: {
    completed: number;
    total: number;
    latestScore: number | null;
  };
}

const START_STEPS = [
  {
    step: 1,
    title: "Career Discovery",
    description: "Find a path that fits your skills and goals.",
    href: "/career",
    icon: Compass,
    accent: "bg-primary text-black",
  },
  {
    step: 2,
    title: "Learning Roadmap",
    description: "Get a beginner → advanced plan for that path.",
    href: "/roadmap",
    icon: Map,
    accent: "bg-secondary text-white",
  },
  {
    step: 3,
    title: "Curated Courses",
    description: "Pick free YouTube and Coursera courses for each milestone.",
    href: "/courses",
    icon: School,
    accent: "bg-coral text-black",
  },
  {
    step: 4,
    title: "AI Study Hub",
    description: "Upload notes or chat with AI while you learn.",
    href: "/ai-hub",
    icon: Bot,
    accent: "bg-primary text-black",
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
    return <PageLoader label="Loading student command center..." />;
  }

  const hasRoadmap =
    Boolean(progressData?.roadmap?.careerPath) &&
    (progressData?.roadmap?.totalMilestones || 0) > 0;
  const nextStep = !hasRoadmap
    ? { label: "Build your roadmap", href: "/roadmap" }
    : (progressData?.metrics.coursesCompleted || 0) === 0
      ? { label: "Browse free courses", href: "/courses" }
      : null;

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      {/* Neo-Brutalist Top Welcome Header */}
      <div className="bg-card border-2 border-black dark:border-[#383d45] rounded-2xl p-5 sm:p-6 neo-shadow flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-primary text-black font-mono text-[11px] font-black uppercase rounded-md border border-black shadow-[2px_2px_0_0_#000]">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
            <span>STUDENT WORKSPACE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-foreground tracking-tight uppercase">
            Welcome back, <span className="text-secondary dark:text-primary">{session?.user?.name || "Candidate"}</span>
          </h1>
          <p className="text-xs sm:text-sm font-sans text-muted-foreground max-w-xl">
            Track your ongoing milestones, maintain daily study streaks, and prepare for your target career role.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-black font-mono text-xs font-bold uppercase rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            <Map className="w-4 h-4" />
            <span>Active Roadmap</span>
          </Link>
          <Link
            href="/interview"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary text-white font-mono text-xs font-bold uppercase rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            <Zap className="w-4 h-4 fill-current text-primary" />
            <span>Mock Interview</span>
          </Link>
        </div>
      </div>

      {/* Selected Career Path Banner */}
      {selectedPath ? (
        <div className="bg-card border-3 border-black dark:border-[#383d45] rounded-2xl p-6 sm:p-8 neo-shadow relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b-2 border-black/10 dark:border-white/10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-black bg-primary text-black text-xs font-mono font-black rounded uppercase">
                <Target className="w-3.5 h-3.5" />
                <span>ACTIVE TARGET ROLE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-foreground uppercase tracking-tight">
                {selectedPath.careerPath}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl font-sans">
                {selectedPath.reasoning}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-background p-4 rounded-xl border-2 border-black dark:border-[#383d45] shadow-[3px_3px_0_0_#000] shrink-0">
              <div className="text-right">
                <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase block">Compatibility</span>
                <span className="text-3xl font-display font-black text-secondary dark:text-primary">
                  {selectedPath.matchScore}%
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl border-2 border-black bg-primary text-black flex items-center justify-center font-display font-black text-lg">
                ★
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/roadmap"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-black font-mono text-xs font-bold uppercase rounded-lg border-2 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] transition-all group"
            >
              <span>View Milestone Roadmap</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/career"
              className="inline-flex items-center px-4 py-2.5 border-2 border-black dark:border-[#383d45] bg-background text-foreground font-mono text-xs font-bold uppercase rounded-lg hover:bg-muted transition-colors shadow-[2px_2px_0_0_#000]"
            >
              Change Target Role
            </Link>
            {nextStep && (
              <Link
                href={nextStep.href}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-coral/20 text-coral-foreground border-2 border-coral font-mono text-xs font-bold uppercase rounded-lg shadow-[2px_2px_0_0_#000]"
              >
                <span>Recommended: {nextStep.label}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-card border-3 border-dashed border-black dark:border-[#383d45] rounded-2xl p-8 neo-shadow space-y-6">
          <div className="text-center sm:text-left">
            <div className="inline-block px-3 py-1 bg-primary text-black font-mono text-xs font-black uppercase rounded border border-black mb-2">
              ONBOARDING TRACK
            </div>
            <h3 className="font-display text-2xl font-black text-foreground uppercase">
              Build Your Custom AI Career Plan
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl font-sans">
              Follow these sequential steps to initialize your personalized curriculum, course recommendations, and diagnostic tools.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {START_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.step}
                  href={item.href}
                  className="bg-background border-2 border-black dark:border-[#383d45] rounded-xl p-5 shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`w-8 h-8 rounded-lg border-2 border-black font-mono font-black text-xs flex items-center justify-center shadow-[2px_2px_0_0_#000] ${item.accent}`}>
                        0{item.step}
                      </span>
                      <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <h4 className="font-display font-bold text-base text-foreground">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="pt-4 flex items-center gap-1 font-mono text-xs font-bold text-secondary dark:text-primary mt-2">
                    <span>Start Step</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Action Cards (Flashcards & Interview) */}
      {progressData &&
        ((progressData.flashcards?.total ?? 0) > 0 ||
          (progressData.interviews?.total ?? 0) > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/flashcards"
              className="group border-2 md:border-3 border-black dark:border-[#383d45] bg-card rounded-xl p-6 flex items-center justify-between gap-4 neo-shadow hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000] transition-all"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                  {(progressData.flashcards?.due ?? 0) > 0
                    ? `${progressData.flashcards?.due} CARDS DUE FOR REVIEW`
                    : "FLASHCARDS DECK"}
                </p>
                <p className="font-display font-black text-xl text-foreground">
                  {(progressData.flashcards?.due ?? 0) > 0
                    ? "Review Spaced Repetition"
                    : "Generate Deck from PDF"}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  {progressData.flashcards?.reviewedToday ?? 0} reviewed today · {progressData.flashcards?.total ?? 0} cards in deck
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl border-2 border-black bg-primary text-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000] group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-all">
                <Layers className="h-6 w-6" />
              </div>
            </Link>

            <Link
              href="/interview"
              className="group border-2 md:border-3 border-black dark:border-[#383d45] bg-card rounded-xl p-6 flex items-center justify-between gap-4 neo-shadow hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000] transition-all"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                  {progressData.interviews?.latestScore != null
                    ? `LATEST EVALUATION: ${progressData.interviews.latestScore}/100`
                    : "MOCK INTERVIEW SIMULATOR"}
                </p>
                <p className="font-display font-black text-xl text-foreground">
                  {progressData.interviews?.latestScore != null ? "Practice Next Round" : "Simulate Technical Interview"}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  {progressData.interviews?.completed ?? 0} sessions completed
                  {progressData.interviews?.total
                    ? ` · ${(progressData.interviews.total ?? 0) - (progressData.interviews.completed ?? 0)} pending`
                    : ""}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl border-2 border-black bg-coral text-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000] group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-all">
                <Award className="h-6 w-6" />
              </div>
            </Link>
          </div>
        )}

      {/* Metrics Row */}
      {selectedPath && progressData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Roadmap Milestones"
            value={`${progressData.roadmap.completedMilestones} / ${progressData.roadmap.totalMilestones}`}
            icon={CheckCircle2}
            description={`${progressData.roadmap.milestoneCompletionRate.toFixed(0)}% completion rate`}
            animationDelay={0}
          />
          <StatsCard
            title="Courses Finished"
            value={progressData.metrics.coursesCompleted}
            icon={BookOpen}
            description="Verified completed modules"
            animationDelay={80}
          />
          <StatsCard
            title="Notes Analyzed"
            value={progressData.metrics.pdfsAnalyzed}
            icon={FileText}
            description="PDF study materials processed"
            animationDelay={160}
          />
          <StatsCard
            title="Tutor Sessions"
            value={progressData.metrics.tutorSessions}
            icon={MessageSquare}
            description="Interactive AI learning chats"
            animationDelay={240}
          />
        </div>
      )}

      {/* Progress Chart & Streak Row */}
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
