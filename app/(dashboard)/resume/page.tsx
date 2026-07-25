"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ResumePage() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resumeToDelete, setResumeToDelete] = useState<{ _id: string; title: string } | null>(null);
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

  const confirmDeleteResume = async () => {
    if (!resumeToDelete) return;
    const id = resumeToDelete._id;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/resume/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete resume");
      }
      setResumes((prev) => prev.filter((r) => r._id !== id));
      toast.success("Resume deleted");
      setResumeToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete resume");
    } finally {
      setDeletingId(null);
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
            <div
              key={resume._id}
              className="bg-[#1A1A1A] border border-[#262626] p-5 hover:border-[#404040] transition-colors flex flex-col"
            >
              <div className="flex items-start justify-between gap-3">
                <Link href={`/resume/builder/${resume._id}`} className="min-w-0 flex-1 group">
                  <h2 className="font-bold text-white group-hover:text-primary transition-colors truncate">
                    {resume.title}
                  </h2>
                  <p className="text-xs text-[#8e9192] mt-1">
                    Updated {new Date(resume.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setResumeToDelete({ _id: resume._id, title: resume.title })}
                    disabled={deletingId === resume._id}
                    className="p-1.5 text-[#8e9192] hover:text-rose-400 border border-transparent hover:border-rose-500/40 transition-colors disabled:opacity-40"
                    title="Delete resume"
                    aria-label={`Delete ${resume.title}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                  <Link
                    href={`/resume/builder/${resume._id}`}
                    className="p-1.5 text-[#8e9192] hover:text-white"
                    title="Open resume"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
              <Link href={`/resume/builder/${resume._id}`} className="mt-5 border border-[#262626] p-3 block hover:border-[#404040]">
                <p className="text-[11px] text-[#636565] uppercase tracking-[0.12em]">Eng Score</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {resume.atsAnalysis?.score ?? "--"}
                  <span className="text-sm text-[#8e9192]">/120</span>
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}

      {resumeToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !deletingId && setResumeToDelete(null)}
          />
          <div className="relative w-full max-w-sm bg-[#0A0A0A] border border-[#262626] p-6 z-[101]">
            <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono mb-3">
              Delete Resume?
            </h3>
            <p className="text-xs text-[#8e9192] leading-relaxed mb-6">
              This will permanently delete{" "}
              <span className="text-white font-semibold">{resumeToDelete.title}</span>. This cannot be
              undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setResumeToDelete(null)}
                disabled={!!deletingId}
                className="px-4 py-2 text-xs font-bold text-[#8e9192] border border-[#262626] hover:text-white disabled:opacity-40"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteResume}
                disabled={!!deletingId}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {deletingId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
