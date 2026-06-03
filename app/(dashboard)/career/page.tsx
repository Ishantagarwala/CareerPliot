"use client";

import { useEffect, useState } from "react";
import AssessmentForm from "@/components/career/AssessmentForm";
import RecommendationCard from "@/components/career/RecommendationCard";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Compass } from "lucide-react";
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
      
      // Update local state to show selected path
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
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium">Loading your career profile...</p>
      </div>
    );
  }

  const hasRecommendations = recommendations.length > 0;

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Compass className="h-7 w-7 text-primary" />
            Career Discovery
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {hasRecommendations
              ? "Select an AI-recommended career path to generate your learning roadmap."
              : "Discover your ideal professional paths by filling out our AI assessment."}
          </p>
        </div>
        {hasRecommendations && (
          <Button variant="outline" size="sm" onClick={handleRetake} className="self-start">
            <RefreshCw className="mr-2 h-4 w-4" /> Retake Assessment
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="relative">
        {hasRecommendations ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec._id}
                rec={rec}
                onSelect={handleSelect}
                selectingId={selectingId}
              />
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
