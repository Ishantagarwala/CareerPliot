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
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[22px]">explore</span>
            </span>
            {hasRecommendations ? "Your career matches" : "Career Discovery"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {hasRecommendations
              ? "Pick the path that fits best — then we’ll build your learning roadmap and course list."
              : "Answer a short assessment and get career paths matched to your goals and skills."}
          </p>
        </div>
        {hasRecommendations && (
          <button
            onClick={handleRetake}
            className="inline-flex h-9 shrink-0 self-start items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Retake Assessment
          </button>
        )}
      </div>

      {hasRecommendations && selected && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <span className="text-[13px] font-medium text-muted-foreground">
            Next step
          </span>
          <p className="min-w-[12rem] flex-1 text-sm text-foreground">
            Path selected: <span className="font-bold">{selected.careerPath}</span>
          </p>
          <Link
            href="/roadmap"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
          >
            Open Roadmap
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      )}

      <div className="relative w-full">
        {hasRecommendations ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
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
          <div className="space-y-6">
            <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {DISCOVER_STEPS.map((item) => (
                <li
                  key={item.step}
                  className="flex gap-3 rounded-xl border border-border bg-card p-4 shadow-soft"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
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
