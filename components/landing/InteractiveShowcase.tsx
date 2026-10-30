"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Map,
  Target,
  Mic,
  FileCheck2,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Bot,
  Play,
  Flame,
  Award,
  Zap,
} from "lucide-react";

export default function InteractiveShowcase() {
  const [activeTab, setActiveTab] = useState<"roadmap" | "skills" | "interview" | "resume">("roadmap");

  return (
    <section id="showcase" className="py-20 md:py-28 bg-background border-t-3 border-black dark:border-[#383d45] transition-colors relative overflow-hidden">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-16">
        {/* Section Header */}
        <div className="mb-12 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary text-white font-mono text-xs font-bold uppercase rounded-md border-2 border-black shadow-[3px_3px_0_0_#000] mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Simulator</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-foreground uppercase tracking-tight leading-[1.05]">
            Experience The Platform <span className="bg-primary text-black px-2 border-2 border-black inline-block shadow-[3px_3px_0_0_#000]">Before Signing Up</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg mt-4 leading-relaxed font-sans">
            CareerPilot operates as your personal career operating system. Toggle between the live modules below to test how our AI guides your progression.
          </p>
        </div>

        {/* Tab Controls Bar */}
        <div className="flex overflow-x-auto no-scrollbar sm:flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8 pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { id: "roadmap", label: "01 · Dynamic Roadmap", icon: Map, color: "hover:bg-primary" },
            { id: "skills", label: "02 · Skill-Gap HUD", icon: Target, color: "hover:bg-secondary hover:text-white" },
            { id: "interview", label: "03 · AI Mock Interview", icon: Mic, color: "hover:bg-coral hover:text-black" },
            { id: "resume", label: "04 · ATS Resume Scorer", icon: FileCheck2, color: "hover:bg-primary" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl border-2 border-black dark:border-[#383d45] font-mono text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  isActive
                    ? "bg-black text-white dark:bg-primary dark:text-black shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#000] translate-x-0.5 translate-y-0.5"
                    : `bg-card text-foreground shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 ${tab.color}`
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Showcase Display Card */}
        <div className="bg-card border-3 border-black dark:border-[#383d45] rounded-2xl shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#000] p-6 sm:p-8 lg:p-10 transition-all">
          {/* TAB 1: ROADMAP SIMULATOR */}
          {activeTab === "roadmap" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-block px-2.5 py-1 bg-primary text-black font-mono text-xs font-extrabold uppercase rounded border border-black">
                  Stage-by-Stage Curriculum
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-black text-foreground uppercase tracking-tight">
                  Tailored to your current level. No fluff.
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Every roadmap is generated dynamically from your career assessment. Rather than giving you a 50-hour video playlist, CareerPilot chunks learning into actionable milestone sprints with real-world verification.
                </p>
                <div className="pt-2">
                  <Link
                    href="/roadmap"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-secondary text-white font-mono text-xs sm:text-sm font-bold uppercase rounded-xl border-2 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition-all"
                  >
                    <span>Generate My Roadmap</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Interactive Roadmap Stage Preview */}
              <div className="lg:col-span-7 bg-background border-2 border-black dark:border-[#383d45] rounded-xl p-5 sm:p-6 shadow-[4px_4px_0_0_#000] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-[#383d45]">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-md bg-primary text-black font-mono font-black text-xs flex items-center justify-center border border-black">
                      02
                    </span>
                    <span className="font-display font-black text-base sm:text-lg text-foreground uppercase">
                      Stage 2: Core Engineering & Systems
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-muted rounded border border-black text-foreground">
                    67% Completed
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      title: "Milestone 1: Relational & Vector Data Modeling",
                      status: "completed",
                      desc: "Designed PostgreSQL schemas & integrated pgvector with HNSW index.",
                      tags: ["PostgreSQL", "Embeddings", "Schema Design"],
                    },
                    {
                      title: "Milestone 2: Hybrid RAG Search Architecture",
                      status: "in-progress",
                      desc: "Combining keyword BM25 retrieval with dense vector similarity.",
                      tags: ["LangChain", "OpenAI", "FastAPI"],
                    },
                    {
                      title: "Milestone 3: Production Docker & Cloud Containerization",
                      status: "upcoming",
                      desc: "Multi-stage Docker builds, health checks, and VPS reverse proxy configuration.",
                      tags: ["Docker", "Caddy", "CI/CD"],
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 sm:p-4 rounded-xl border-2 border-black dark:border-[#383d45] transition-all ${
                        item.status === "in-progress"
                          ? "bg-card shadow-[4px_4px_0_0_#000] translate-x-1"
                          : item.status === "completed"
                          ? "bg-muted/40 opacity-80"
                          : "bg-muted/20 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          {item.status === "completed" ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                          ) : item.status === "in-progress" ? (
                            <span className="w-5 h-5 rounded-full border-2 border-black bg-primary flex items-center justify-center shrink-0 mt-0.5">
                              <Zap className="w-3 h-3 text-black fill-black" />
                            </span>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-black bg-muted shrink-0 mt-0.5" />
                          )}
                          <div>
                            <h4 className="font-display font-bold text-sm sm:text-base text-foreground">
                              {item.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2.5 ml-7">
                        {item.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 bg-background border border-black rounded text-[10px] font-mono font-bold"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SKILL GAP & READINESS */}
          {activeTab === "skills" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-block px-2.5 py-1 bg-secondary text-white font-mono text-xs font-extrabold uppercase rounded border border-black">
                  Continuous Assessment
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-black text-foreground uppercase tracking-tight">
                  Stop applying blind. Know your real market readiness.
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Most candidates fail resume screens because of 1 or 2 missing core competencies that automated ATS filters flag immediately. CareerPilot pinpoints these gaps before you click submit.
                </p>
                <div className="pt-2">
                  <Link
                    href="/career"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-black font-mono text-xs sm:text-sm font-bold uppercase rounded-xl border-2 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition-all"
                  >
                    <span>Run Career Assessment</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Skills Visual Grid */}
              <div className="lg:col-span-7 bg-background border-2 border-black dark:border-[#383d45] rounded-xl p-5 sm:p-6 shadow-[4px_4px_0_0_#000] space-y-4">
                <div className="flex justify-between items-center pb-3 border-b-2 border-black dark:border-[#383d45]">
                  <span className="font-mono text-xs font-black uppercase text-foreground">
                    Target Role: Senior Full-Stack AI Engineer
                  </span>
                  <span className="px-2.5 py-1 bg-primary text-black font-mono font-bold text-xs rounded border border-black">
                    Score: 88/100
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    { skill: "TypeScript & Frontend Architecture", pct: 95, state: "Mastered", color: "bg-emerald-500" },
                    { skill: "Next.js App Router & Server Actions", pct: 90, state: "Mastered", color: "bg-emerald-500" },
                    { skill: "LLM Orchestration & Prompt Optimization", pct: 85, state: "Proficient", color: "bg-primary" },
                    { skill: "Vector Databases & Semantic Search", pct: 78, state: "Improving", color: "bg-secondary" },
                    { skill: "Distributed Systems & Scalability", pct: 54, state: "Priority Gap", color: "bg-coral" },
                  ].map((row, i) => (
                    <div key={i} className="p-3 bg-card border-2 border-black dark:border-[#383d45] rounded-lg">
                      <div className="flex justify-between items-center text-xs font-mono font-bold mb-1.5">
                        <span className="text-foreground">{row.skill}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground uppercase">{row.state}</span>
                          <span className="font-display font-bold text-foreground">{row.pct}%</span>
                        </span>
                      </div>
                      <div className="w-full h-3 bg-muted border border-black rounded-full overflow-hidden">
                        <div
                          className={`h-full ${row.color} border-r border-black`}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI MOCK INTERVIEW */}
          {activeTab === "interview" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-block px-2.5 py-1 bg-coral text-black font-mono text-xs font-extrabold uppercase rounded border border-black">
                  Real-Time Voice & Text Simulation
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-black text-foreground uppercase tracking-tight">
                  High-stakes practice with zero risk.
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Practice behavioral and technical interview questions powered by our LLM router. Receive immediate evaluation on answer clarity, structural depth, and missing technical nuances.
                </p>
                <div className="pt-2">
                  <Link
                    href="/interview"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-coral text-black font-mono text-xs sm:text-sm font-bold uppercase rounded-xl border-2 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition-all"
                  >
                    <span>Try Mock Interview</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Chat Simulation Preview */}
              <div className="lg:col-span-7 bg-background border-2 border-black dark:border-[#383d45] rounded-xl p-5 sm:p-6 shadow-[4px_4px_0_0_#000] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-[#383d45]">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-secondary dark:text-primary" />
                    <span className="font-mono text-xs font-bold text-foreground uppercase">
                      Technical Interviewer · System Design
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold rounded border border-emerald-500">
                    Active Session
                  </span>
                </div>

                <div className="space-y-3 font-sans text-xs sm:text-sm">
                  {/* AI Bubble */}
                  <div className="p-3.5 bg-card border-2 border-black dark:border-[#383d45] rounded-xl shadow-[3px_3px_0_0_#000] space-y-1">
                    <p className="font-mono text-[10px] font-extrabold uppercase text-secondary dark:text-primary">
                      AI Interviewer
                    </p>
                    <p className="text-foreground leading-relaxed">
                      &quot;How would you handle rate limiting in a distributed AI API to prevent abusive token consumption while maintaining low latency?&quot;
                    </p>
                  </div>

                  {/* Student Bubble */}
                  <div className="p-3.5 bg-primary/20 dark:bg-primary/10 border-2 border-black dark:border-[#383d45] rounded-xl ml-4 sm:ml-8 space-y-1">
                    <p className="font-mono text-[10px] font-extrabold uppercase text-foreground">
                      Candidate Response (Voice & Text)
                    </p>
                    <p className="text-foreground leading-relaxed">
                      &quot;I would implement a Redis Token Bucket algorithm at the gateway layer. Each user key holds a token count refreshed at a fixed rate, checking atomic Redis EVAL scripts before routing to LLM workers.&quot;
                    </p>
                  </div>

                  {/* Feedback Card */}
                  <div className="p-3 bg-card border-2 border-black dark:border-[#383d45] rounded-xl space-y-1.5 bg-amber-50 dark:bg-amber-950/20">
                    <div className="flex justify-between items-center text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
                      <span>Instant Evaluation: 9/10</span>
                      <span>Strong Architecture</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Great inclusion of atomic Redis Lua scripts. Consider mentioning circuit breakers (e.g. Envoy/Resilience4j) if Redis encounters network partitioning.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ATS RESUME SCORER */}
          {activeTab === "resume" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-block px-2.5 py-1 bg-primary text-black font-mono text-xs font-extrabold uppercase rounded border border-black">
                  Applicant Tracking Simulation
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-black text-foreground uppercase tracking-tight">
                  Format, keyword, and impact analysis in seconds.
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Upload your PDF resume or use our built-in builder. Our parsing engine evaluates your resume against target job descriptions, checking action verbs, quantifiable metrics, and ATS parseability.
                </p>
                <div className="pt-2">
                  <Link
                    href="/resume"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-black text-white dark:bg-primary dark:text-black font-mono text-xs sm:text-sm font-bold uppercase rounded-xl border-2 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition-all"
                  >
                    <span>Score My Resume</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Resume Scorecard Preview */}
              <div className="lg:col-span-7 bg-background border-2 border-black dark:border-[#383d45] rounded-xl p-5 sm:p-6 shadow-[4px_4px_0_0_#000] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-[#383d45]">
                  <div>
                    <h4 className="font-display font-bold text-foreground text-base">ATS Compatibility Report</h4>
                    <p className="text-xs text-muted-foreground font-mono">resume_final_v3.pdf</p>
                  </div>
                  <div className="flex items-center gap-2 bg-primary text-black px-3 py-1.5 rounded-lg border-2 border-black font-mono font-black text-sm">
                    <Award className="w-4 h-4" />
                    <span>92 / 100</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
                  <div className="p-2.5 bg-card border-2 border-black dark:border-[#383d45] rounded-lg">
                    <div className="text-[10px] text-muted-foreground uppercase">Format</div>
                    <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">100% Clean</div>
                  </div>
                  <div className="p-2.5 bg-card border-2 border-black dark:border-[#383d45] rounded-lg">
                    <div className="text-[10px] text-muted-foreground uppercase">Keywords</div>
                    <div className="font-bold text-sm text-secondary dark:text-primary mt-0.5">88% Match</div>
                  </div>
                  <div className="p-2.5 bg-card border-2 border-black dark:border-[#383d45] rounded-lg">
                    <div className="text-[10px] text-muted-foreground uppercase">Impact Metrics</div>
                    <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">9/10 Bullets</div>
                  </div>
                </div>

                <div className="p-3.5 bg-card border-2 border-black dark:border-[#383d45] rounded-lg space-y-2 text-xs">
                  <span className="font-mono font-bold text-foreground">Recommended Improvements:</span>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="text-coral font-bold">•</span>
                      <span>Add &quot;Distributed Caching (Redis)&quot; under Technical Skills section.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>Excellent use of quantified impact (e.g. &quot;reduced latency by 42%&quot;).</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
