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
  if (tier === "Excellent") return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  if (tier === "Strong") return "text-primary border-primary/30 bg-primary/10";
  if (tier === "Average") return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  return "text-rose-400 border-rose-500/30 bg-rose-500/10";
}

function scoreBarColor(ratio: number) {
  if (ratio >= 0.75) return "bg-emerald-500";
  if (ratio >= 0.5) return "bg-amber-500";
  return "bg-rose-500";
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
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-[#262626] pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[28px] text-primary">military_tech</span>
            Engineering Resume Score
          </h1>
          <p className="text-sm text-[#8e9192] mt-2 max-w-2xl">
            Scored with your domain career rubric — community impact, projects, experience,
            and skills that matter for your field.
            and demonstrated skills. What you built matters more than keyword stuffing.
          </p>
        </div>
        <div className="text-[11px] font-label text-[#8e9192] border border-[#262626] px-3 py-2 space-y-0.5">
          <p>OSS 35 · Projects 30 · Prod 25 · Skills 10</p>
          <p>Bonus / deductions ±20 · Total /120</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-[#1A1A1A] border border-[#262626] p-6 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#8e9192]">description</span>
              Resume Source
            </h2>

            <div className="flex border-b border-[#262626] gap-2">
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
                    "pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all duration-200",
                    activeInputTab === id
                      ? "border-primary text-white"
                      : "border-transparent text-[#8e9192] hover:text-white"
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeInputTab === "existing" && (
              <div className="space-y-2">
                <label className="text-xs text-[#8e9192] uppercase tracking-wider font-semibold block">
                  Select Active Resume
                </label>
                {loadingResumes ? (
                  <p className="text-xs text-[#8e9192] italic">Loading resumes...</p>
                ) : resumes.length === 0 ? (
                  <div className="border border-[#262626] p-4 text-center text-xs text-[#8e9192]">
                    No resumes found. Build one in the builder or upload a PDF.
                  </div>
                ) : (
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-sm text-white px-4 py-3 rounded focus:outline-none focus:border-primary"
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
                <label className="text-xs text-[#8e9192] uppercase tracking-wider font-semibold block">
                  Upload Resume PDF
                </label>
                <div className="border-2 border-dashed border-[#262626] hover:border-[#404040] transition-colors p-8 rounded text-center relative cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <span className="material-symbols-outlined text-[36px] text-[#8e9192] mb-2">upload_file</span>
                  <p className="text-xs text-white font-semibold">
                    {resumeFile ? resumeFile.name : "Drag & drop resume PDF or click to browse"}
                  </p>
                  <p className="text-[10px] text-[#8e9192] mt-1">Accepts PDF files up to 10MB</p>
                </div>
              </div>
            )}

            {activeInputTab === "text" && (
              <div className="space-y-2">
                <label className="text-xs text-[#8e9192] uppercase tracking-wider font-semibold block">
                  Paste Resume Text
                </label>
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste the full content of your resume here..."
                  className="w-full h-64 bg-[#0A0A0A] border border-[#262626] text-sm text-white p-3 rounded focus:outline-none focus:border-primary resize-none placeholder-[#636565]"
                />
              </div>
            )}
          </div>

          <div className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">info</span>
              How scoring works
            </h3>
            <ul className="text-xs text-[#8e9192] space-y-2 leading-relaxed">
              <li>• Open source & personal projects carry ~65% of the base score</li>
              <li>• Production experience rewards ownership and shipped impact</li>
              <li>• Skills lists alone score poorly — show tech used in real work</li>
              <li>• Bonus for portfolios, GSoC, blogs; deductions for tutorial-only projects</li>
            </ul>
            <p className="text-[11px] text-[#636565]">
              Job matching still lives in the Resume Builder → Match JD panel.
            </p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full bg-primary hover:opacity-90 text-primary-foreground border-2 border-black font-bold py-4 text-center flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-[4px_4px_0_0_#000]"
            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
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
            <div className="bg-[#1A1A1A] border border-[#262626] p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[400px]">
              <span className="material-symbols-outlined text-[48px] text-primary animate-pulse">military_tech</span>
              <h3 className="text-lg font-bold text-white">Evaluating career signal</h3>
              <p className="text-xs text-[#8e9192] max-w-sm">
                Weighing open-source work, project depth, production ownership, and demonstrated skills…
              </p>
            </div>
          )}

          {!analyzing && !result && (
            <div className="bg-[#1A1A1A] border border-[#262626] p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[400px]">
              <span className="material-symbols-outlined text-[48px] text-[#636565]">emoji_events</span>
              <h3 className="text-lg font-bold text-[#8e9192]">Ready to score</h3>
              <p className="text-xs text-[#636565] max-w-sm">
                Select a resume source and run analysis to see your domain career score.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#1A1A1A] border border-[#262626] p-6 flex items-center justify-between gap-6">
                <div className="space-y-2 flex-1 min-w-0">
                  <span
                    className="text-xs font-bold uppercase tracking-wider text-[#8e9192] block"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Overall Score
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold text-white">Engineering Resume Index</h3>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-1 border",
                        tierColor(result.tier)
                      )}
                    >
                      {result.tier}
                    </span>
                  </div>
                  <p className="text-xs text-[#8e9192]">{result.summary}</p>
                </div>
                <div className="w-24 h-24 rounded-full border-4 border-primary/40 flex items-center justify-center flex-shrink-0 bg-[#0A0A0A]">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-white">{result.score}</span>
                    <span className="text-[10px] text-[#8e9192] block">/120</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {RUBRIC.map((item) => {
                  const value = result[item.key];
                  const ratio = value / item.max;
                  return (
                    <div key={item.key} className="bg-[#1A1A1A] border border-[#262626] p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-primary text-[18px]">{item.icon}</span>
                          <span
                            className="text-[10px] text-[#8e9192] tracking-wider uppercase font-semibold truncate"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {item.label}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-white whitespace-nowrap">
                          {value}/{item.max}
                        </span>
                      </div>
                      <div className="h-2 bg-[#0A0A0A] border border-[#262626]">
                        <div
                          className={cn("h-full transition-all", scoreBarColor(ratio))}
                          style={{ width: `${Math.min(100, ratio * 100)}%` }}
                        />
                      </div>
                      {(result.evidence?.[item.key] || []).length > 0 && (
                        <ul className="space-y-1">
                          {result.evidence[item.key].slice(0, 2).map((line, i) => (
                            <li key={i} className="text-[11px] text-[#8e9192] flex gap-1.5">
                              <span className="text-primary shrink-0">•</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#1A1A1A] border border-emerald-500/20 p-5 space-y-3">
                  <h3
                    className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Bonus (+{result.bonus})
                  </h3>
                  {result.bonusItems.length === 0 ? (
                    <p className="text-xs text-[#636565] italic">No bonus signals found</p>
                  ) : (
                    <ul className="space-y-2">
                      {result.bonusItems.map((item, i) => (
                        <li key={i} className="text-xs text-[#c4c7c8] flex gap-2">
                          <span className="text-emerald-400 shrink-0">+</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="bg-[#1A1A1A] border border-rose-500/20 p-5 space-y-3">
                  <h3
                    className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <span className="material-symbols-outlined text-sm">remove_circle</span>
                    Deductions (−{result.deductions})
                  </h3>
                  {result.deductionItems.length === 0 ? (
                    <p className="text-xs text-[#636565] italic">No deductions applied</p>
                  ) : (
                    <ul className="space-y-2">
                      {result.deductionItems.map((item, i) => (
                        <li key={i} className="text-xs text-[#c4c7c8] flex gap-2">
                          <span className="text-rose-400 shrink-0">−</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {(result.strengths.length > 0 || result.suggestions.length > 0) && (
                <div className="bg-[#1A1A1A] border border-[#262626] p-6 space-y-5">
                  {result.strengths.length > 0 && (
                    <div className="space-y-2">
                      <h3
                        className="text-sm font-bold text-white uppercase tracking-wider"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        Strengths
                      </h3>
                      <ul className="space-y-2">
                        {result.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-[#c4c7c8] flex gap-2">
                            <span className="material-symbols-outlined text-primary text-sm shrink-0">check</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <h3
                        className="text-sm font-bold text-white uppercase tracking-wider"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        How to improve
                      </h3>
                      <ul className="space-y-2">
                        {result.suggestions.map((s, i) => (
                          <li key={i} className="text-xs text-[#c4c7c8] flex gap-2">
                            <span className="material-symbols-outlined text-cyan text-sm shrink-0">bolt</span>
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
