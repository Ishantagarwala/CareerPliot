"use client";

import { useEffect, useState } from "react";
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

      toast.success("Career path updated successfully!");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6 animate-fade-in-up">
        <div>
          <h1
            className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[28px]">explore</span>
            {hasRecommendations ? "Explore Trajectories" : "Career Discovery"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
            {hasRecommendations
              ? "Discover optimal career paths tailored to your skill matrix. Select a path to generate your personalized learning roadmap."
              : "Discover your ideal professional paths by filling out our AI assessment."}
          </p>
        </div>
        {hasRecommendations && (
          <button
            onClick={handleRetake}
            className="self-start inline-flex items-center px-4 py-2 border-2 border-border text-foreground hover:border-primary transition-colors text-xs"
            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">refresh</span>
            Retake Assessment
          </button>
        )}
      </div>

      {/* Main Content */}
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
          <AssessmentForm onSuccess={(recs) => setRecommendations(recs)} />
        )}
      </div>
    </div>
  );
}
