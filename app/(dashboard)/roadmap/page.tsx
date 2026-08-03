"use client";

import { useEffect, useState } from "react";
import PageLoader from "@/components/layout/PageLoader";
import RoadmapViewer from "@/components/roadmap/RoadmapViewer";
import EmptyState from "@/components/ui/EmptyState";
import { toast } from "sonner";

interface Milestone {
  _id?: string;
  title: string;
  completed: boolean;
  completedAt?: Date | string;
}

interface RoadmapStage {
  name: "beginner" | "intermediate" | "advanced";
  milestones: Milestone[];
}

interface Roadmap {
  _id: string;
  careerPath: string;
  stages: RoadmapStage[];
  currentStage: "beginner" | "intermediate" | "advanced";
}

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const fetchRoadmap = async () => {
    try {
      const res = await fetch("/api/roadmap");
      if (!res.ok) {
        setErrorStatus(res.status);
        if (res.status !== 404) {
          throw new Error("Failed to load learning roadmap");
        }
        return;
      }
      const data = await res.json();
      setRoadmap(data);
      setErrorStatus(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch roadmap details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const handleMilestoneToggle = async (milestoneId: string, completed: boolean) => {
    try {
      const res = await fetch("/api/roadmap/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, completed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update milestone progress");

      setRoadmap(data.roadmap);

      if (completed) {
        toast.success("Milestone marked completed!");
      } else {
        toast.info("Milestone unchecked.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Could not update milestone progress.");
    }
  };

  if (loading) {
    return <PageLoader label="Building your roadmap" />;
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6 animate-fade-in-up">
        <h1
          className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          <span className="material-symbols-outlined text-[28px]">map</span>
          Roadmap
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Your step-by-step plan from beginner to advanced for your chosen career path.
        </p>
      </div>

      <div className="relative">
        {errorStatus === 404 ? (
          <EmptyState
            icon="explore"
            title="Pick a career path first"
            description="Complete Career Discovery and select a path — then we’ll build your personalized roadmap."
            primaryHref="/career"
            primaryLabel="Start Career Discovery"
            className="max-w-lg mx-auto"
          />
        ) : roadmap ? (
          <RoadmapViewer roadmap={roadmap} onMilestoneToggle={handleMilestoneToggle} />
        ) : (
          <EmptyState
            icon="error"
            title="Couldn’t load roadmap"
            description="Something went wrong. Try again in a moment."
            onPrimaryClick={() => {
              setLoading(true);
              fetchRoadmap();
            }}
            primaryLabel="Try again"
            className="max-w-lg mx-auto"
          />
        )}
      </div>
    </div>
  );
}
