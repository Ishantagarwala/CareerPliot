"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageLoader from "@/components/layout/PageLoader";
import AssessmentForm from "@/components/career/AssessmentForm";
import RecommendationCard from "@/components/career/RecommendationCard";
import { toast } from "sonner";

interface CareerRecommendation {
  _id: string;
  careerPath: string;
  matchScore: number;
  reasoning: string;
  selected: boolean;
}

const DISCOVER_STEPS = [
  {
    step: 1,
    title: "Tell us about you",
    description: "Share goals, interests, and skills — type or talk.",
  },
  {
    step: 2,
    title: "Get path matches",
    description: "AI suggests careers ranked by how well they fit you.",
  },
  {
    step: 3,
    title: "Pick one path",
    description: "Selecting unlocks your roadmap, courses, and study tools.",
  },
] as const;

export default function CareerPage() {
  const [recommendations, setRecommendations] = useState<CareerRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch("/api/career/recommendations");
      if (!res.ok) throw new Error("Failed to load recommendations");
      const data = await res.json();
      setRecommendations(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch career recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleSelect = async (recommendationId: string) => {
    setSelectingId(recommendationId);
    try {
      const res = await fetch("/api/career/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to select path");

      toast.success("Career path updated — next: build your roadmap");
      setRecommendations((prev) =>
        prev.map((rec) => ({
          ...rec,
          selected: rec._id === recommendationId,
        }))
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Could not select career path.");
    } finally {
      setSelectingId(null);
    }
  };

  const handleRetake = () => {
    setRecommendations([]);
  };

  if (loading) {
    return <PageLoader label="Loading career matches" />;
  }

  const hasRecommendations = recommendations.length > 0;
  const selected = recommendations.find((r) => r.selected);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black dark:border-[#383d45] pb-5 animate-fade-in-up">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-foreground tracking-tight uppercase flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl border-2 border-black bg-primary text-black flex items-center justify-center text-lg shadow-[2px_2px_0_0_#000]">
              🧭
            </span>
            <span>{hasRecommendations ? "Your Career Matches" : "Career Discovery"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-3xl font-sans">
            {hasRecommendations
              ? "Pick the path that fits best — then we’ll build your learning roadmap and course list."
              : "Answer a short assessment and get career paths matched to your goals and skills."}
          </p>
        </div>
        {hasRecommendations && (
          <button
            onClick={handleRetake}
            className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black dark:border-[#383d45] bg-card text-foreground font-mono text-xs font-bold uppercase shadow-[2px_2px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Retake Assessment
          </button>
        )}
      </div>

      {hasRecommendations && selected && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border-2 border-black dark:border-[#383d45] bg-card neo-shadow animate-fade-in-up">
          <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground font-bold px-2 py-0.5 rounded border border-black bg-muted">
            Next step
          </span>
          <p className="text-sm font-sans text-foreground flex-1 min-w-[12rem]">
            Path selected: <span className="font-bold text-secondary dark:text-primary">{selected.careerPath}</span>
          </p>
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black border-2 border-black rounded-lg text-xs font-mono font-bold uppercase shadow-[2px_2px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
          >
            <span>Open Roadmap</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      )}

      <div className="relative w-full">
        {hasRecommendations ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {recommendations.map((rec, idx) => (
              <div key={rec._id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                <RecommendationCard
                  rec={rec}
                  onSelect={handleSelect}
                  selectingId={selectingId}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in-up">
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {DISCOVER_STEPS.map((item) => (
                <li
                  key={item.step}
                  className="flex gap-3 p-4 border border-border bg-card"
                >
                  <span
                    className="h-8 w-8 shrink-0 flex items-center justify-center border-2 border-black bg-primary text-primary-foreground text-xs font-bold"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {item.step}
                  </span>
                  <div>
                    <p
                      className="font-bold text-sm text-foreground"
                      style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                    >
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <AssessmentForm onSuccess={(recs) => setRecommendations(recs)} />
          </div>
        )}
      </div>
    </div>
  );
}
