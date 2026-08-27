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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="material-symbols-outlined">description</span>
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Resume
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build a clear resume, check it with AI, and match it to job descriptions.
            </p>
          </div>
        </div>
        <button
          onClick={createResume}
          disabled={creating}
          className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:pointer-events-none disabled:opacity-50 md:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resumes.map((resume) => (
            <div
              key={resume._id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <Link href={`/resume/builder/${resume._id}`} className="group min-w-0 flex-1">
                  <h2 className="truncate font-bold text-foreground transition-colors group-hover:text-primary">
                    {resume.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {new Date(resume.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setResumeToDelete({ _id: resume._id, title: resume.title })}
                    disabled={deletingId === resume._id}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
                    title="Delete resume"
                    aria-label={`Delete ${resume.title}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                  <Link
                    href={`/resume/builder/${resume._id}`}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Open resume"
                    aria-label={`Open ${resume.title}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
              <Link
                href={`/resume/builder/${resume._id}`}
                className="mt-5 block rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40"
              >
                <p className="text-[13px] font-medium text-muted-foreground">Score</p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                  {resume.atsAnalysis?.score ?? "--"}
                  <span className="text-sm font-medium text-muted-foreground">/120</span>
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}

      {resumeToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deletingId && setResumeToDelete(null)}
          />
          <div className="relative z-[101] w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lift">
            <h3 className="mb-1 text-base font-bold tracking-tight text-foreground">
              Delete Resume?
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">{resumeToDelete.title}</span>. This cannot be
              undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setResumeToDelete(null)}
                disabled={!!deletingId}
                className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteResume}
                disabled={!!deletingId}
                className="inline-flex h-9 items-center rounded-lg bg-destructive px-4 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--destructive),black_8%)] disabled:pointer-events-none disabled:opacity-40"
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
