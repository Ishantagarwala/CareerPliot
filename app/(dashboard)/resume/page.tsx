"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ResumePage() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchResumes() {
      try {
        const res = await fetch("/api/resume");
        if (!res.ok) {
          throw new Error("Failed to load resumes");
        }
        setResumes(await res.json());
      } catch (error: any) {
        toast.error(error.message || "Failed to load resumes");
      } finally {
        setLoading(false);
      }
    }

    fetchResumes();
  }, []);

  const createResume = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "My Career Pilot Resume" }),
      });

      if (!res.ok) {
        throw new Error("Failed to create resume");
      }

      const resume = await res.json();
      router.push(`/resume/builder/${resume._id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create resume");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-[#262626] pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1
            className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[28px]">description</span>
            Resume Builder
          </h1>
          <p className="text-sm text-[#8e9192] mt-2">
            Build an ATS-friendly resume, analyze it with AI, and match it against job descriptions.
          </p>
        </div>
        <button
          onClick={createResume}
          disabled={creating}
          className="bg-white text-[#0A0A0A] px-5 py-3 text-xs font-bold hover:bg-[#e2e2e2] disabled:opacity-40"
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
        >
          {creating ? "Creating..." : "Create Resume"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[#8e9192]">Loading resumes...</p>
      ) : resumes.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#262626] p-8 text-center">
          <h2 className="text-xl font-bold text-white">No resumes yet</h2>
          <p className="text-sm text-[#8e9192] mt-2">Create your first resume to start improving your job readiness.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {resumes.map((resume) => (
            <Link
              key={resume._id}
              href={`/resume/builder/${resume._id}`}
              className="bg-[#1A1A1A] border border-[#262626] p-5 hover:border-[#404040] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-white">{resume.title}</h2>
                  <p className="text-xs text-[#8e9192] mt-1">
                    Updated {new Date(resume.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="material-symbols-outlined text-[#8e9192]">arrow_forward</span>
              </div>
              <div className="mt-5 border border-[#262626] p-3">
                <p className="text-[11px] text-[#636565] uppercase tracking-[0.12em]">ATS Score</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {resume.atsAnalysis?.score ?? "--"}
                  <span className="text-sm text-[#8e9192]">/100</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
