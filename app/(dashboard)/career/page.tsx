"use client";

import { useEffect, useState } from "react";
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
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="border-b border-[#262626] pb-6">
          <div className="h-8 w-48 bg-[#1A1A1A] mb-2" />
          <div className="h-4 w-96 bg-[#1A1A1A]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#1A1A1A] border border-[#262626] p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex justify-between items-center">
                <div className="h-6 w-32 bg-[#262626]" />
                <div className="h-6 w-16 bg-[#262626]" />
              </div>
              <div className="h-20 w-full bg-[#262626]" />
              <div className="border-t border-[#262626] pt-4">
                <div className="h-9 w-full bg-[#262626]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasRecommendations = recommendations.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262626] pb-6 animate-fade-in-up">
        <div>
          <h1
            className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[28px]">explore</span>
            {hasRecommendations ? "Explore Trajectories" : "Career Discovery"}
          </h1>
          <p className="text-sm text-[#8e9192] mt-2 max-w-2xl">
            {hasRecommendations
              ? "Discover optimal career paths tailored to your skill matrix. Select a path to generate your personalized learning roadmap."
              : "Discover your ideal professional paths by filling out our AI assessment."}
          </p>
        </div>
        {hasRecommendations && (
          <button
            onClick={handleRetake}
            className="self-start inline-flex items-center px-4 py-2 border border-[#262626] text-[#c4c7c8] hover:border-white hover:text-white transition-colors text-xs"
            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">refresh</span>
            Retake Assessment
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="relative">
        {hasRecommendations ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="py-6">
            <AssessmentForm onSuccess={(recs) => setRecommendations(recs)} />
          </div>
        )}
      </div>
    </div>
  );
}
