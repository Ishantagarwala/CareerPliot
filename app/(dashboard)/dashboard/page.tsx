"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Compass,
  Award,
  BookOpen,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  CheckCircle2,
  FileText,
  MessageSquare,
  Flame,
  Target,
  Loader2,
} from "lucide-react";
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
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium">Assembling your progress statistics...</p>
      </div>
    );
  }

  // Circular gauge calculations
  const readiness = progressData?.readinessScore || 0;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readiness / 100) * circumference;

  return (
    <div className="space-y-8">
      {/* Welcome Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5 gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-7 w-7 text-primary" />
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, <span className="font-bold text-foreground">{session?.user?.name || "Student"}</span>! Here is your personalized learning progress.
          </p>
        </div>
      </div>

      {/* Profile Overview and Readiness Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-2">
          {selectedPath ? (
            <Card className="border-border bg-card shadow-sm h-full relative overflow-hidden flex flex-col justify-between">
              <div className="absolute inset-y-0 right-0 w-1/3 bg-radial from-primary/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-3">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2 self-start">
                  <Sparkles className="h-3 w-3" /> Selected Career Path
                </div>
                <CardTitle className="font-heading text-2xl font-bold">
                  {selectedPath.careerPath}
                </CardTitle>
                <CardDescription className="font-semibold text-xs text-primary mt-1.5">
                  Compatibility Score: {selectedPath.matchScore}% Match
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedPath.reasoning}
                </p>
              </CardContent>
              
              <CardFooter className="pt-4 border-t border-border/50 bg-zinc-50/50 dark:bg-zinc-950/20 flex gap-4">
                <Link href="/roadmap" className={buttonVariants({ size: "sm", className: "font-semibold" })}>
                  View Roadmap
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
                <Link href="/career" className={buttonVariants({ size: "sm", variant: "outline" })}>
                  Change Path
                </Link>
              </CardFooter>
            </Card>
          ) : (
            <Card className="border-dashed border-2 border-border bg-card/50 text-center py-12 px-6 h-full flex flex-col items-center justify-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Compass className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading font-bold text-lg">No Active Career Path Selected</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Complete the Career Discovery questionnaire to unlock personalized learning paths, courses, and AI study tools.
                </p>
              </div>
              <Link href="/career" className={buttonVariants({ variant: "default", className: "font-semibold" })}>
                Get Started
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Card>
          )}
        </div>

        {/* Readiness Circular Score Gauge */}
        <div className="lg:col-span-1">
          <Card className="border-border bg-card shadow-sm h-full flex flex-col items-center justify-center p-6 text-center">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-heading text-base font-bold flex items-center justify-center gap-1.5">
                <Target className="h-5 w-5 text-primary" /> Overall Readiness
              </CardTitle>
              <CardDescription>Composite score toward job-readiness</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-0 space-y-4">
              {/* Radial Progress Gauge */}
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90">
                  {/* Background track circle */}
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    className="stroke-muted"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {/* Indicator circle */}
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    className="stroke-primary transition-all duration-1000 ease-out"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight">{readiness}%</span>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Ready</span>
                </div>
              </div>
              
              <div className="text-[10px] text-muted-foreground leading-relaxed max-w-[200px] font-medium">
                Calculated based on milestones ({progressData?.roadmap?.completedMilestones || 0} done), course completions, document analysis, and tutor chats.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Cards Section */}
      {selectedPath && progressData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Roadmap Progress"
            value={`${progressData.roadmap.completedMilestones} / ${progressData.roadmap.totalMilestones}`}
            icon={CheckCircle2}
            iconColor="text-blue-500"
            bgColor="bg-blue-500/10"
            description={`${progressData.roadmap.milestoneCompletionRate.toFixed(0)}% milestones completed`}
          />
          <StatsCard
            title="Courses Finished"
            value={progressData.metrics.coursesCompleted}
            icon={BookOpen}
            iconColor="text-emerald-500"
            bgColor="bg-emerald-500/10"
            description="Self-reported completed courses"
          />
          <StatsCard
            title="Notes Analyzed"
            value={progressData.metrics.pdfsAnalyzed}
            icon={FileText}
            iconColor="text-purple-500"
            bgColor="bg-purple-500/10"
            description="PDF materials studied with AI"
          />
          <StatsCard
            title="Tutor Sessions"
            value={progressData.metrics.tutorSessions}
            icon={MessageSquare}
            iconColor="text-pink-500"
            bgColor="bg-pink-500/10"
            description="Interactive tutor conversations"
          />
        </div>
      )}

      {/* Charts and Habits Trackers */}
      {selectedPath && progressData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
