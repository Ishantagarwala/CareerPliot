"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Target,
  Code2,
  Flame,
  BrainCircuit,
  Zap,
} from "lucide-react";

export default function HeroProductPreview() {
  const [activeMetric, setActiveMetric] = useState<"readiness" | "skills" | "roadmap">("readiness");

  return (
    <div className="relative w-full max-w-[580px] mx-auto lg:max-w-none">
      {/* Decorative Neo-Brutalist Geometric Badges behind */}
      <div className="absolute -top-6 -right-6 hidden sm:flex items-center gap-1.5 bg-coral text-black font-mono font-black text-xs px-3 py-1.5 border-2 border-black rounded-lg shadow-[3px_3px_0_0_#000] rotate-3 z-30 select-none">
        <Sparkles className="w-3.5 h-3.5 fill-black" />
        <span>AUTONOMOUS AGENT</span>
      </div>

      <div className="absolute -bottom-5 -left-5 hidden sm:flex items-center gap-1.5 bg-secondary text-white font-mono font-black text-xs px-3 py-1.5 border-2 border-black rounded-lg shadow-[3px_3px_0_0_#000] -rotate-3 z-30 select-none">
        <Flame className="w-3.5 h-3.5 fill-current text-primary" />
        <span>7-DAY STREAK</span>
      </div>

      {/* Main Container Card */}
      <div className="relative z-10 bg-card border-3 border-black dark:border-[#383d45] rounded-2xl shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#000] overflow-hidden">
        {/* Card Header Chrome */}
        <div className="bg-background border-b-3 border-black dark:border-[#383d45] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full border border-black bg-[#ff5f56]" />
            <span className="w-3.5 h-3.5 rounded-full border border-black bg-[#ffbd2e]" />
            <span className="w-3.5 h-3.5 rounded-full border border-black bg-[#27c93f]" />
            <span className="ml-2 font-mono text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              STUDENT_HUD_LIVE.SYS
            </span>
          </div>

          <div className="flex items-center gap-1 bg-primary text-black px-2 py-0.5 border border-black rounded font-mono text-[10px] font-extrabold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
            <span>AI MATCH ACTIVE</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 space-y-5 bg-card">
          {/* Target Role & Compatibility Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-background border-2 border-black dark:border-[#383d45] rounded-xl shadow-[3px_3px_0_0_#000]">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-extrabold uppercase text-secondary dark:text-cyan tracking-wider">
                  TARGET CAREER GOAL
                </span>
                <span className="px-1.5 py-0.2 bg-primary text-black font-mono font-bold text-[9px] rounded border border-black">
                  TOP 1% FIT
                </span>
              </div>
              <h4 className="font-display text-lg sm:text-xl font-black text-foreground uppercase tracking-tight mt-0.5">
                Full-Stack AI Engineer
              </h4>
            </div>

            <div className="flex items-baseline gap-1 sm:text-right bg-card px-3 py-1.5 rounded-lg border-2 border-black dark:border-[#383d45]">
              <span className="font-display text-2xl font-black text-secondary dark:text-primary">94</span>
              <span className="font-mono text-xs font-bold text-muted-foreground">% Match</span>
            </div>
          </div>

          {/* Interactive Metric Switcher */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "readiness", label: "Job Readiness", val: "88%" },
              { id: "skills", label: "Skill Gap", val: "2 Missing" },
              { id: "roadmap", label: "Roadmap", val: "Stage 02" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMetric(tab.id as typeof activeMetric)}
                className={`p-2.5 rounded-lg border-2 border-black dark:border-[#383d45] font-mono text-left transition-all cursor-pointer ${
                  activeMetric === tab.id
                    ? "bg-primary text-black shadow-[3px_3px_0_0_#000] translate-x-0.5 translate-y-0.5 font-bold"
                    : "bg-background text-foreground hover:bg-muted font-medium"
                }`}
              >
                <div className="text-[10px] uppercase opacity-75">{tab.label}</div>
                <div className="font-display text-sm sm:text-base font-black mt-0.5">{tab.val}</div>
              </button>
            ))}
          </div>

          {/* Dynamic Content Panel */}
          {activeMetric === "readiness" && (
            <div className="p-4 bg-background border-2 border-black dark:border-[#383d45] rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs font-mono font-bold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Target className="w-4 h-4 text-secondary dark:text-primary" />
                  Readiness Diagnostic Score
                </span>
                <span className="text-secondary dark:text-primary font-black">88 / 100</span>
              </div>

              {/* Segmented Progress Bar */}
              <div className="w-full h-4 bg-muted border-2 border-black dark:border-[#383d45] rounded-full overflow-hidden flex p-0.5 gap-1">
                <div className="bg-primary h-full rounded-sm flex-[3]" />
                <div className="bg-primary h-full rounded-sm flex-[3]" />
                <div className="bg-secondary h-full rounded-sm flex-[2]" />
                <div className="bg-muted-foreground/30 h-full rounded-sm flex-[1]" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-muted-foreground">
                <div>✓ 14 Core Skills Mastered</div>
                <div>⚡ 3 Portfolio Projects Built</div>
              </div>
            </div>
          )}

          {activeMetric === "skills" && (
            <div className="p-4 bg-background border-2 border-black dark:border-[#383d45] rounded-xl space-y-2.5">
              <div className="font-mono text-xs font-bold text-foreground flex items-center justify-between">
                <span>Skill-Gap Analysis</span>
                <span className="text-coral font-bold text-[10px]">2 HIGH PRIORITY GAPS</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-1 bg-primary text-black border border-black rounded text-[11px] font-mono font-bold">
                  ✓ Next.js App Router
                </span>
                <span className="px-2 py-1 bg-primary text-black border border-black rounded text-[11px] font-mono font-bold">
                  ✓ TypeScript Strict
                </span>
                <span className="px-2 py-1 bg-primary text-black border border-black rounded text-[11px] font-mono font-bold">
                  ✓ Vector Embeddings
                </span>
                <span className="px-2 py-1 bg-coral/20 text-coral-foreground border-2 border-coral rounded text-[11px] font-mono font-bold animate-pulse">
                  ! System Design Patterns
                </span>
                <span className="px-2 py-1 bg-coral/20 text-coral-foreground border-2 border-coral rounded text-[11px] font-mono font-bold">
                  ! Docker & CI/CD
                </span>
              </div>
            </div>
          )}

          {activeMetric === "roadmap" && (
            <div className="p-4 bg-background border-2 border-black dark:border-[#383d45] rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs font-mono font-bold">
                <span className="text-foreground">Phase 02: Distributed Backend</span>
                <span className="text-secondary dark:text-primary">Step 4 of 6</span>
              </div>
              <div className="space-y-1.5 text-xs font-medium">
                <div className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="line-through opacity-70">REST vs gRPC Architectures</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <div className="w-4 h-4 rounded-full border-2 border-black bg-primary flex items-center justify-center text-[10px] shrink-0 font-mono">
                    4
                  </div>
                  <span>RAG Pipelines with Hybrid Search</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-4 h-4 rounded-full border border-black dark:border-[#383d45] bg-muted shrink-0" />
                  <span>Production Docker Deployment</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Trigger Card */}
          <div className="p-3.5 bg-card border-2 border-black dark:border-[#383d45] rounded-xl flex items-center justify-between gap-3 shadow-[3px_3px_0_0_#000]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border-2 border-black bg-primary text-black flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 fill-black" />
              </div>
              <div>
                <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase">Next Milestone</p>
                <p className="font-display text-xs sm:text-sm font-bold text-foreground">
                  Run 15-Min System Design Mock
                </p>
              </div>
            </div>

            <Link
              href="/interview"
              className="px-3 py-1.5 bg-black text-white dark:bg-primary dark:text-black font-mono text-xs font-bold rounded-lg border border-black hover:scale-105 active:scale-95 transition-transform flex items-center gap-1 shrink-0"
            >
              <span>Start</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
