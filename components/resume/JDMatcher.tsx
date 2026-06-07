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
    <div className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4">
      <div>
        <p
          className="text-[11px] text-[#8e9192] uppercase tracking-[0.15em]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Job Match
        </p>
        <h3 className="font-bold text-white">Match Against JD</h3>
      </div>
      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="Paste job description here..."
        className="w-full min-h-32 bg-[#131313] border border-[#262626] p-3 text-sm text-white focus:outline-none focus:border-white"
      />
      <button
        onClick={handleMatch}
        disabled={loading}
        className="bg-white text-[#0A0A0A] px-3 py-2 text-xs font-bold disabled:opacity-40"
        style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
      >
        {loading ? "Matching..." : "Match JD"}
      </button>

      {result && (
        <div className="space-y-3 text-sm">
          <p className="text-white font-bold">Match Score: {result.matchScore}/100</p>
          <p className="text-[#c4c7c8]">{result.summary}</p>
          <div>
            <p className="text-white font-medium">Missing Keywords</p>
            <p className="text-[#8e9192]">{(result.missingKeywords || []).join(", ") || "None listed"}</p>
          </div>
          <div>
            <p className="text-white font-medium">Recommended Edits</p>
            <ul className="list-disc ml-5 text-[#c4c7c8]">
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
