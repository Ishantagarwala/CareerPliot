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
      <div className="space-y-8 animate-fade-in-up">
        {/* Skeleton */}
        <div className="border-b border-[#262626] pb-6">
          <div className="h-8 w-48 bg-[#1A1A1A] mb-2" />
          <div className="h-4 w-80 bg-[#1A1A1A]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#1A1A1A] border border-[#262626] h-48" />
          <div className="bg-[#1A1A1A] border border-[#262626] h-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#1A1A1A] border border-[#262626] h-28" />
          ))}
        </div>
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
      {/* Welcome Header */}
      <div className="border-b border-[#262626] pb-6 animate-fade-in-up">
        <h1
          className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          <span className="material-symbols-outlined text-[28px]">dashboard</span>
          Dashboard
        </h1>
        <p className="text-sm text-[#8e9192] mt-2">
          Welcome back, <span className="font-bold text-white">{session?.user?.name || "Student"}</span>. Here is your personalized learning progress.
        </p>
      </div>

      {/* Profile Overview and Readiness Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2">
          {selectedPath ? (
            <div className="bg-[#1A1A1A] border border-[#262626] p-8 h-full relative overflow-hidden animate-fade-in-up delay-100">
              <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(ellipse_at_right,_rgba(255,255,255,0.03)_0%,_transparent_60%)] pointer-events-none" />

              <div className="relative">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 border border-[#262626] bg-[#131313] text-[#c4c7c8] mb-4"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.08em" }}
                >
                  <span className="w-2 h-2 rounded-full bg-white" />
                  SELECTED CAREER PATH
                </div>

                <h2
                  className="text-2xl font-bold text-white mb-1"
                  style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                >
                  {selectedPath.careerPath}
                </h2>

                <p
                  className="text-xs text-white mb-4"
                  style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
                >
                  Compatibility Score: {selectedPath.matchScore}% Match
                </p>

                <p className="text-sm text-[#c4c7c8] leading-relaxed mb-6 max-w-xl">
                  {selectedPath.reasoning}
                </p>

                <div className="border-t border-[#262626] pt-4 flex gap-3">
                  <Link
                    href="/roadmap"
                    className="inline-flex items-center px-5 py-2 bg-white text-[#0A0A0A] font-bold hover:bg-[#e2e2e2] transition-colors text-xs group"
                    style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
                  >
                    View Roadmap
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="/career"
                    className="inline-flex items-center px-5 py-2 border border-white text-white hover:bg-[#1A1A1A] transition-colors text-xs"
                    style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
                  >
                    Change Path
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#262626] bg-[#131313] text-center py-16 px-8 h-full flex flex-col items-center justify-center gap-5 animate-fade-in-up delay-100">
              <div className="h-14 w-14 border border-[#262626] flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[28px]">explore</span>
              </div>
              <div className="space-y-2">
                <h3
                  className="font-bold text-lg text-white"
                  style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                >
                  No Active Career Path Selected
                </h3>
                <p className="text-sm text-[#8e9192] max-w-sm">
                  Complete the Career Discovery questionnaire to unlock personalized learning paths, courses, and AI study tools.
                </p>
              </div>
              <Link
                href="/career"
                className="inline-flex items-center px-6 py-2.5 bg-white text-[#0A0A0A] font-bold hover:bg-[#e2e2e2] transition-colors text-xs group"
                style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
              >
                Get Started
                <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>

        {/* Readiness Gauge */}
        <div className="lg:col-span-1">
          <div className="bg-[#1A1A1A] border border-[#262626] p-6 h-full flex flex-col items-center justify-center text-center animate-fade-in-up delay-200">
            <div className="mb-4">
              <h3
                className="text-sm font-bold text-white flex items-center justify-center gap-1.5"
                style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
              >
                <span className="material-symbols-outlined text-[18px]">target</span>
                Overall Readiness
              </h3>
              <p className="text-[10px] text-[#8e9192] mt-1">Composite score toward job-readiness</p>
            </div>

            {/* Radial Progress Gauge */}
            <div className="relative h-32 w-32 flex items-center justify-center my-4">
              <svg className="h-full w-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  className="stroke-[#262626]"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  className="stroke-white transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span
                  className="text-3xl font-bold text-white tracking-tight"
                  style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                >
                  {readiness}%
                </span>
                <span
                  className="text-[10px] text-[#8e9192] uppercase tracking-[0.15em] mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Ready
                </span>
              </div>
            </div>

            <div className="text-[10px] text-[#636565] leading-relaxed max-w-[200px] font-medium">
              Based on milestones ({progressData?.roadmap?.completedMilestones || 0} done), courses, document analysis, and tutor chats.
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Charts */}
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
