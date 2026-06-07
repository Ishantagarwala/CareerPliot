"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AtsAnalysisResult {
  matchScore: number;
  keywordMatching: {
    score: number;
    matched: string[];
    missing: string[];
  };
  formatting: {
    score: number;
    feedback: string[];
  };
  readability: {
    score: number;
    feedback: string[];
  };
  impact: {
    score: number;
    feedback: string[];
  };
  recommendedEdits: string[];
  summary: string;
}

export default function ResumeAtsPage() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [activeInputTab, setActiveInputTab] = useState<"existing" | "upload" | "text">("existing");

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AtsAnalysisResult | null>(null);

  // Load existing resumes for selection
  useEffect(() => {
    async function fetchResumes() {
      try {
        const res = await fetch("/api/resume");
        if (res.ok) {
          const data = await res.json();
          setResumes(data);
          if (data.length > 0) {
            setSelectedResumeId(data[0]._id);
          }
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
    if (!jobDescription.trim()) {
      toast.error("Please enter the target Job Description.");
      return;
    }

    setAnalyzing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("jobDescription", jobDescription);

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
      toast.success("Resume ATS analysis complete!");
    } catch (error: any) {
      toast.error(error.message || "An error occurred during analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 border-emerald-500/20";
    if (score >= 60) return "text-amber-500 border-amber-500/20";
    return "text-rose-500 border-rose-500/20";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    if (score >= 60) return "bg-amber-500/10 border-amber-500/20 text-amber-400";
    return "bg-rose-500/10 border-rose-500/20 text-rose-400";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-[#262626] pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[28px] text-primary">rule</span>
            Resume ATS Analyzer
          </h1>
          <p className="text-sm text-[#8e9192] mt-2">
            Tailor your resume for specific job descriptions and rank highly in Applicant Tracking Systems.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Input Selection & JD */}
        <div className="space-y-6">
          <div className="bg-[#1A1A1A] border border-[#262626] p-6 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#8e9192]">description</span>
              1. Select Resume Source
            </h2>

            {/* Input Tabs */}
            <div className="flex border-b border-[#262626] gap-2">
              <button
                onClick={() => setActiveInputTab("existing")}
                className={cn(
                  "pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all duration-200",
                  activeInputTab === "existing"
                    ? "border-primary text-white"
                    : "border-transparent text-[#8e9192] hover:text-white"
                )}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Existing Resumes
              </button>
              <button
                onClick={() => setActiveInputTab("upload")}
                className={cn(
                  "pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all duration-200",
                  activeInputTab === "upload"
                    ? "border-primary text-white"
                    : "border-transparent text-[#8e9192] hover:text-white"
                )}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Upload PDF
              </button>
              <button
                onClick={() => setActiveInputTab("text")}
                className={cn(
                  "pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all duration-200",
                  activeInputTab === "text"
                    ? "border-primary text-white"
                    : "border-transparent text-[#8e9192] hover:text-white"
                )}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Paste Text
              </button>
            </div>

            {/* Input Fields */}
            {activeInputTab === "existing" && (
              <div className="space-y-2">
                <label className="text-xs text-[#8e9192] uppercase tracking-wider font-semibold block">Select Active Resume</label>
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
                        {r.title} (Score: {r.atsAnalysis?.score ?? "--"})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {activeInputTab === "upload" && (
              <div className="space-y-4">
                <label className="text-xs text-[#8e9192] uppercase tracking-wider font-semibold block">Upload Resume PDF</label>
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
                  <p className="text-[10px] text-[#8e9192] mt-1">Accepts PDF files up to 5MB</p>
                </div>
              </div>
            )}

            {activeInputTab === "text" && (
              <div className="space-y-2">
                <label className="text-xs text-[#8e9192] uppercase tracking-wider font-semibold block">Paste Resume Text</label>
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste the full content of your resume here..."
                  className="w-full h-48 bg-[#0A0A0A] border border-[#262626] text-sm text-white p-3 rounded focus:outline-none focus:border-primary resize-none placeholder-[#636565]"
                />
              </div>
            )}
          </div>

          <div className="bg-[#1A1A1A] border border-[#262626] p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#8e9192]">work_outline</span>
              2. Target Job Description
            </h2>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target Job Description/Requirements here..."
              className="w-full h-64 bg-[#0A0A0A] border border-[#262626] text-sm text-white p-3 rounded focus:outline-none focus:border-primary resize-none placeholder-[#636565]"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full bg-white hover:bg-[#e2e2e2] text-black font-bold py-4 text-center flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
          >
            {analyzing ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                ANALYZING MATCH COMPATIBILITY...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">analytics</span>
                RUN ATS COMPATIBILITY CHECK
              </>
            )}
          </button>
        </div>

        {/* Right Column: Results Visualization */}
        <div className="space-y-6">
          {analyzing && (
            <div className="bg-[#1A1A1A] border border-[#262626] p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[400px]">
              <span className="material-symbols-outlined text-[48px] text-primary animate-pulse">analytics</span>
              <h3 className="text-lg font-bold text-white">Evaluating Resume Alignment</h3>
              <p className="text-xs text-[#8e9192] max-w-sm">
                Parsing keywords, mapping formatting style, grading sentence impact, and scoring candidate matching metrics...
              </p>
            </div>
          )}

          {!analyzing && !result && (
            <div className="bg-[#1A1A1A] border border-[#262626] p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[400px]">
              <span className="material-symbols-outlined text-[48px] text-[#636565]">find_in_page</span>
              <h3 className="text-lg font-bold text-[#8e9192]">Ready for Analysis</h3>
              <p className="text-xs text-[#636565] max-w-sm">
                Provide your resume and a target job description on the left, then click analyze to view compatibility grades.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-fade-in">
              {/* Overall Score Dial */}
              <div className="bg-[#1A1A1A] border border-[#262626] p-6 flex items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8e9192] block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    ATS MATCH SCORE
                  </span>
                  <h3 className="text-xl font-bold text-white">Job Alignment Index</h3>
                  <p className="text-xs text-[#8e9192]">{result.summary}</p>
                </div>
                <div className={cn("w-24 h-24 rounded-full border-4 flex items-center justify-center flex-shrink-0 bg-[#0A0A0A]", getScoreColor(result.matchScore))}>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-white">{result.matchScore}</span>
                    <span className="text-[10px] text-[#8e9192] block">% Match</span>
                  </div>
                </div>
              </div>

              {/* Sub-Ratings Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "KEYWORDS", score: result.keywordMatching.score, icon: "tag" },
                  { label: "FORMATTING", score: result.formatting.score, icon: "format_align_left" },
                  { label: "READABILITY", score: result.readability.score, icon: "menu_book" },
                  { label: "IMPACT", score: result.impact.score, icon: "trending_up" },
                ].map((rating) => (
                  <div key={rating.label} className="bg-[#1A1A1A] border border-[#262626] p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#8e9192] tracking-wider uppercase font-semibold block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{rating.label}</span>
                      <span className="text-lg font-bold text-white mt-1 block">{rating.score}%</span>
                    </div>
                    <span className={cn("w-2 h-8 rounded", rating.score >= 80 ? "bg-emerald-500" : rating.score >= 60 ? "bg-amber-500" : "bg-rose-500")} />
                  </div>
                ))}
              </div>

              {/* Keywords List */}
              <div className="bg-[#1A1A1A] border border-[#262626] p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <span className="material-symbols-outlined text-xs">tag</span> Keywords Analysis
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Matched Keywords ({result.keywordMatching.matched.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywordMatching.matched.length === 0 ? (
                        <span className="text-xs text-[#636565] italic">No matched keywords found</span>
                      ) : (
                        result.keywordMatching.matched.map((kw) => (
                          <span key={kw} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-1 uppercase tracking-wider">
                            {kw}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      Missing Keywords ({result.keywordMatching.missing.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywordMatching.missing.length === 0 ? (
                        <span className="text-xs text-[#636565] italic">Excellent keyword coverage!</span>
                      ) : (
                        result.keywordMatching.missing.map((kw) => (
                          <span key={kw} className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-1 uppercase tracking-wider">
                            {kw}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended Action Items */}
              <div className="bg-[#1A1A1A] border border-[#262626] p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <span className="material-symbols-outlined text-xs">build</span> Recommended Edits
                </h3>
                <ul className="space-y-3">
                  {result.recommendedEdits.map((edit, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-[#8e9192]">
                      <span className="material-symbols-outlined text-primary text-sm flex-shrink-0 mt-0.5">offline_bolt</span>
                      <span>{edit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-[#1A1A1A] border border-[#262626] p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Detailed Category Feedback
                </h3>
                <div className="space-y-4 divide-y divide-[#262626]">
                  {/* Formatting */}
                  <div className="space-y-2 pt-2 first:pt-0">
                    <span className="text-xs font-semibold text-white flex items-center gap-2">
                      Formatting & Structure ({result.formatting.score}%)
                    </span>
                    <ul className="space-y-1">
                      {result.formatting.feedback.map((f, i) => (
                        <li key={i} className="text-xs text-[#8e9192] flex items-center gap-2">
                          <span className="w-1 h-1 bg-[#8e9192] rounded-full" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Readability */}
                  <div className="space-y-2 pt-4">
                    <span className="text-xs font-semibold text-white flex items-center gap-2">
                      Readability & Content Flow ({result.readability.score}%)
                    </span>
                    <ul className="space-y-1">
                      {result.readability.feedback.map((f, i) => (
                        <li key={i} className="text-xs text-[#8e9192] flex items-center gap-2">
                          <span className="w-1 h-1 bg-[#8e9192] rounded-full" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Impact */}
                  <div className="space-y-2 pt-4">
                    <span className="text-xs font-semibold text-white flex items-center gap-2">
                      Sentence Impact & Accomplishments ({result.impact.score}%)
                    </span>
                    <ul className="space-y-1">
                      {result.impact.feedback.map((f, i) => (
                        <li key={i} className="text-xs text-[#8e9192] flex items-center gap-2">
                          <span className="w-1 h-1 bg-[#8e9192] rounded-full" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
