"use client";

import { useState } from "react";
import { toast } from "sonner";

interface JDMatcherProps {
  resumeId: string;
}

export default function JDMatcher({ resumeId }: JDMatcherProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleMatch = async () => {
    if (!jobDescription.trim()) {
      toast.error("Paste a job description first");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/resume/${resumeId}/match-jd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "JD matching failed");
      }

      setResult(await res.json());
    } catch (error: any) {
      toast.error(error.message || "Failed to match job description");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div>
        <p className="text-[13px] font-medium text-muted-foreground">Job Match</p>
        <h3 className="font-bold tracking-tight text-foreground">Match Against JD</h3>
      </div>
      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="Paste job description here..."
        className="min-h-32 w-full resize-none rounded-lg border border-input bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
      />
      <button
        onClick={handleMatch}
        disabled={loading}
        className="inline-flex h-8 items-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:pointer-events-none disabled:opacity-50"
      >
        {loading ? "Matching..." : "Match JD"}
      </button>

      {result && (
        <div className="space-y-3 text-sm">
          <p className="font-bold text-foreground">Match Score: {result.matchScore}/100</p>
          <p className="text-muted-foreground">{result.summary}</p>
          <div>
            <p className="font-medium text-foreground">Missing Keywords</p>
            <p className="text-muted-foreground">{(result.missingKeywords || []).join(", ") || "None listed"}</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Recommended Edits</p>
            <ul className="ml-5 list-disc text-muted-foreground">
              {(result.recommendedEdits || []).map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
