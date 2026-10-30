"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EmptyState from "@/components/ui/EmptyState";

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
    <div className="space-y-6">
      <div className="border-b-2 border-black dark:border-[#383d45] pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-foreground tracking-tight uppercase flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl border-2 border-black bg-primary text-black flex items-center justify-center shadow-[2px_2px_0_0_#000]">
              <span className="material-symbols-outlined text-[20px]">description</span>
            </span>
            <span>ATS Resume Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-2xl font-sans">
            Build an ATS-optimized resume, evaluate it with AI diagnostics, and match keywords to target job descriptions.
          </p>
        </div>
        <button
          onClick={createResume}
          disabled={creating}
          className="self-start md:self-auto rounded-xl border-2 border-black bg-primary text-black px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-40 transition-all cursor-pointer"
        >
          {creating ? "Creating..." : "Create Resume"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading resumes…</p>
      ) : resumes.length === 0 ? (
        <EmptyState
          icon="description"
          title="No resumes yet"
          description="Create your first resume to start improving how you show up for roles."
          onPrimaryClick={createResume}
          primaryLabel={creating ? "Creating…" : "Create Resume"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {resumes.map((resume) => (
            <div
              key={resume._id}
              className="rounded-xl border-2 border-black dark:border-[#383d45] bg-card p-5 neo-shadow hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#000] transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <Link href={`/resume/builder/${resume._id}`} className="min-w-0 flex-1 group">
                  <h2 className="font-mono font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {resume.title}
                  </h2>
                  <p className="text-[11px] font-mono text-muted-foreground mt-1">
                    Updated {new Date(resume.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setResumeToDelete({ _id: resume._id, title: resume.title })}
                    disabled={deletingId === resume._id}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg border border-transparent hover:border-destructive/40 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Delete resume"
                    aria-label={`Delete ${resume.title}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                  <Link
                    href={`/resume/builder/${resume._id}`}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg border border-transparent hover:border-black/20"
                    title="Open resume"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
              <Link
                href={`/resume/builder/${resume._id}`}
                className="mt-4 rounded-lg border-2 border-black dark:border-[#383d45] bg-muted/50 p-3 block hover:bg-muted transition-colors"
              >
                <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Score</p>
                <p className="text-2xl font-display font-black text-foreground mt-0.5">
                  {resume.atsAnalysis?.score ?? "--"}
                  <span className="text-xs font-mono font-bold text-muted-foreground">/120</span>
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
          <div className="relative w-full max-w-sm bg-card border border-border p-6 z-[101]">
            <h3 className="text-base font-bold text-foreground uppercase tracking-wider font-mono mb-3">
              Delete Resume?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              This will permanently delete{" "}
              <span className="text-foreground font-semibold">{resumeToDelete.title}</span>. This cannot be
              undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setResumeToDelete(null)}
                disabled={!!deletingId}
                className="px-4 py-2 text-xs font-bold text-muted-foreground border border-border hover:text-foreground disabled:opacity-40"
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
