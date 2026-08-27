"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { HackerRankAnalysis } from "@/lib/resume";
import { getDomainConfig } from "@/lib/careerDomains";

function rubricForDomain(domainId?: string | null) {
  const rubric = getDomainConfig(domainId).resumeRubric;
  return [
    { key: "openSource" as const, label: rubric.community.label, max: 35, icon: "diversity_3" },
    { key: "selfProjects" as const, label: rubric.portfolio.label, max: 30, icon: "terminal" },
    { key: "production" as const, label: rubric.experience.label, max: 25, icon: "rocket_launch" },
    { key: "technicalSkills" as const, label: rubric.skills.label, max: 10, icon: "code" },
  ];
}

function tierColor(tier: string) {
  if (tier === "Excellent") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
  if (tier === "Strong") return "border-primary/30 bg-primary/10 text-primary";
  if (tier === "Average") return "border-amber/30 bg-amber/10 text-amber";
  return "border-destructive/30 bg-destructive/10 text-destructive";
}

function scoreBarColor(ratio: number) {
  if (ratio >= 0.75) return "bg-emerald-500";
  if (ratio >= 0.5) return "bg-amber";
  return "bg-destructive";
}

export default function ResumeAtsPage() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [activeInputTab, setActiveInputTab] = useState<"existing" | "upload" | "text">("existing");

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<(HackerRankAnalysis & { careerDomain?: string }) | null>(null);
  const [careerDomain, setCareerDomain] = useState<string | null>(null);
  const RUBRIC = rubricForDomain(result?.careerDomain || careerDomain);
  const scorePct = result
    ? Math.min(100, Math.max(0, Math.round(((result.score ?? 0) / 120) * 100)))
    : 0;

  useEffect(() => {
    async function fetchResumes() {
      try {
        const [res, profileRes] = await Promise.all([
          fetch("/api/resume"),
          fetch("/api/career/assess"),
        ]);
        if (res.ok) {
          const data = await res.json();
          setResumes(data);
          if (data.length > 0) {
            setSelectedResumeId(data[0]._id);
          }
        }
        if (profileRes.ok) {
          const profile = await profileRes.json();
          if (profile?.careerDomain) setCareerDomain(profile.careerDomain);
        }
      } catch (error) {
        console.error("Failed to load user resumes:", error);
      } finally {
        setLoadingResumes(false);
      }
    }
    fetchResumes();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file only.");
        return;
      }
      setResumeFile(file);
    }
  };

  const handleAnalyze = async () => {
    if (activeInputTab === "text" && !resumeText.trim()) {
      toast.error("Please paste your resume text.");
      return;
    }
    if (activeInputTab === "upload" && !resumeFile) {
      toast.error("Please upload a PDF resume file.");
      return;
    }
    if (activeInputTab === "existing" && !selectedResumeId) {
      toast.error("Please select a resume from the dropdown.");
      return;
    }

    setAnalyzing(true);
    setResult(null);

    try {
      const formData = new FormData();

      if (activeInputTab === "existing") {
        formData.append("resumeId", selectedResumeId);
      } else if (activeInputTab === "upload" && resumeFile) {
        formData.append("file", resumeFile);
      } else {
        formData.append("resumeText", resumeText);
      }

      const res = await fetch("/api/resume/ats-analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Analysis failed");
      }

      const data = await res.json();
      setResult(data);
      toast.success("Domain resume analysis complete!");
    } catch (error: any) {
      toast.error(error.message || "An error occurred during analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight text-foreground">
            <span className="material-symbols-outlined text-[28px] text-primary">military_tech</span>
            Engineering Resume Score
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Scored with your domain career rubric — community impact, projects, experience,
            and skills that matter for your field.
            and demonstrated skills. What you built matters more than keyword stuffing.
          </p>
        </div>
        <div className="space-y-0.5 self-start rounded-xl border border-border bg-card px-3 py-2 text-[13px] font-medium text-muted-foreground shadow-soft">
          <p>OSS 35 · Projects 30 · Prod 25 · Skills 10</p>
          <p>Bonus / deductions ±20 · Total /120</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="flex items-center gap-2.5 text-base font-bold tracking-tight text-foreground">
              <span className="material-symbols-outlined text-[18px] text-muted-foreground">description</span>
              Resume Source
            </h2>

            <div className="flex gap-2 border-b border-border">
              {(
                [
                  ["existing", "Existing Resumes"],
                  ["upload", "Upload PDF"],
                  ["text", "Paste Text"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setActiveInputTab(id)}
                  className={cn(
                    "-mb-px border-b-2 px-1 pb-2.5 text-[13px] font-semibold transition-colors",
                    activeInputTab === id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeInputTab === "existing" && (
              <div className="space-y-2">
                <label className="block text-[13px] font-medium text-muted-foreground">
                  Select Active Resume
                </label>
                {loadingResumes ? (
                  <p className="text-[13px] italic text-muted-foreground">Loading resumes...</p>
                ) : resumes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-[13px] text-muted-foreground">
                    No resumes found. Build one in the builder or upload a PDF.
                  </div>
                ) : (
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                  >
                    {resumes.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.title} (Score: {r.atsAnalysis?.score ?? "--"}
                        {r.atsAnalysis?.score != null ? "/120" : ""})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {activeInputTab === "upload" && (
              <div className="space-y-4">
                <label className="block text-[13px] font-medium text-muted-foreground">
                  Upload Resume PDF
                </label>
                <div className="relative cursor-pointer rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-ring/50 hover:bg-muted/40">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <span className="material-symbols-outlined mb-2 text-[36px] text-muted-foreground">upload_file</span>
                  <p className="text-sm font-semibold text-foreground">
                    {resumeFile ? resumeFile.name : "Drag & drop resume PDF or click to browse"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Accepts PDF files up to 10MB</p>
                </div>
              </div>
            )}

            {activeInputTab === "text" && (
              <div className="space-y-2">
                <label className="block text-[13px] font-medium text-muted-foreground">
                  Paste Resume Text
                </label>
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste the full content of your resume here..."
                  className="h-64 w-full resize-none rounded-lg border border-input bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                />
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <span className="material-symbols-outlined text-primary text-[18px]">info</span>
              How scoring works
            </h3>
            <ul className="space-y-2 text-[13px] leading-relaxed text-muted-foreground">
              <li>• Open source & personal projects carry ~65% of the base score</li>
              <li>• Production experience rewards ownership and shipped impact</li>
              <li>• Skills lists alone score poorly — show tech used in real work</li>
              <li>• Bonus for portfolios, GSoC, blogs; deductions for tutorial-only projects</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Job matching still lives in the Resume Builder → Match JD panel.
            </p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:pointer-events-none disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                SCORING RESUME…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">military_tech</span>
                RUN HACKERRANK-STYLE ANALYSIS
              </>
            )}
          </button>
        </div>

        <div className="space-y-6">
          {analyzing && (
            <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
              <span className="material-symbols-outlined animate-pulse text-[48px] text-primary">military_tech</span>
              <h3 className="text-lg font-bold text-foreground">Evaluating career signal</h3>
              <p className="max-w-sm text-[13px] text-muted-foreground">
                Weighing open-source work, project depth, production ownership, and demonstrated skills…
              </p>
            </div>
          )}

          {!analyzing && !result && (
            <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
              <span className="material-symbols-outlined text-[48px] text-muted-foreground">emoji_events</span>
              <h3 className="text-lg font-bold text-foreground">Ready to score</h3>
              <p className="max-w-sm text-[13px] text-muted-foreground">
                Select a resume source and run analysis to see your domain career score.
              </p>
            </div>
          )}

          {result && (
            <div className="animate-fade-in space-y-6">
              <div className="flex items-center justify-between gap-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="min-w-0 flex-1 space-y-2">
                  <span className="block text-[13px] font-medium text-muted-foreground">
                    Overall Score
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold tracking-tight text-foreground">Engineering Resume Index</h3>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                        tierColor(result.tier)
                      )}
                    >
                      {result.tier}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground">{result.summary}</p>
                </div>
                <div
                  className="relative h-24 w-24 shrink-0 rounded-full"
                  style={{
                    background: `conic-gradient(var(--primary) ${scorePct}%, var(--muted) ${scorePct}%)`,
                  }}
                >
                  <div className="absolute inset-1.5 flex flex-col items-center justify-center rounded-full bg-card">
                    <span className="text-2xl font-bold tabular-nums text-foreground">{result.score}</span>
                    <span className="text-[10px] text-muted-foreground">/120</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {RUBRIC.map((item) => {
                  const value = result[item.key];
                  const ratio = value / item.max;
                  return (
                    <div key={item.key} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[18px]">{item.icon}</span>
                          <span className="truncate text-[13px] font-medium text-muted-foreground">
                            {item.label}
                          </span>
                        </div>
                        <span className="whitespace-nowrap text-sm font-bold tabular-nums text-foreground">
                          {value}/{item.max}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full transition-all", scoreBarColor(ratio))}
                          style={{ width: `${Math.min(100, ratio * 100)}%` }}
                        />
                      </div>
                      {(result.evidence?.[item.key] || []).length > 0 && (
                        <ul className="space-y-1">
                          {result.evidence[item.key].slice(0, 2).map((line, i) => (
                            <li key={i} className="flex gap-1.5 text-[11px] text-muted-foreground">
                              <span className="shrink-0 text-primary">•</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 shadow-soft">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Bonus (+{result.bonus})
                  </h3>
                  {result.bonusItems.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">No bonus signals found</p>
                  ) : (
                    <ul className="space-y-2">
                      {result.bonusItems.map((item, i) => (
                        <li key={i} className="flex gap-2 text-[13px] text-muted-foreground">
                          <span className="shrink-0 font-semibold text-emerald-600">+</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-5 shadow-soft">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-destructive">
                    <span className="material-symbols-outlined text-sm">remove_circle</span>
                    Deductions (−{result.deductions})
                  </h3>
                  {result.deductionItems.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">No deductions applied</p>
                  ) : (
                    <ul className="space-y-2">
                      {result.deductionItems.map((item, i) => (
                        <li key={i} className="flex gap-2 text-[13px] text-muted-foreground">
                          <span className="shrink-0 font-semibold text-destructive">−</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {(result.strengths.length > 0 || result.suggestions.length > 0) && (
                <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft">
                  {result.strengths.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-foreground">
                        Strengths
                      </h3>
                      <ul className="space-y-2">
                        {result.strengths.map((s, i) => (
                          <li key={i} className="flex gap-2 text-[13px] text-muted-foreground">
                            <span className="material-symbols-outlined shrink-0 text-sm text-primary">check</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-foreground">
                        How to improve
                      </h3>
                      <ul className="space-y-2">
                        {result.suggestions.map((s, i) => (
                          <li key={i} className="flex gap-2 text-[13px] text-muted-foreground">
                            <span className="material-symbols-outlined shrink-0 text-sm text-primary">bolt</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
