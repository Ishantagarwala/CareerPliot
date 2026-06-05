"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RoadmapViewer from "@/components/roadmap/RoadmapViewer";
import { buttonVariants } from "@/components/ui/button";
import { Award, Compass, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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

      // Update the roadmap in local state
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
    return (
      <div className="space-y-8">
        <div className="border-b border-border pb-5">
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Loading indicator with message */}
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-foreground">Loading your learning roadmap...</p>
            <p className="text-xs text-muted-foreground">This may take a moment if your roadmap is being generated for the first time.</p>
          </div>
        </div>
        
        {/* Roadmap stages timeline skeleton */}
        <div className="space-y-6">
          {[1, 2].map((stageIdx) => (
            <div key={stageIdx} className="border border-border bg-card rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((milestoneIdx) => (
                  <div key={milestoneIdx} className="border border-border rounded-xl p-4 flex items-start gap-4">
                    <Skeleton className="h-4 w-4 rounded-sm shrink-0 mt-0.5" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="border-b border-border pb-5">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Award className="h-7 w-7 text-primary" />
          Learning Roadmap
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your personalized, step-by-step path to master skills required for your selected career.
        </p>
      </div>

      {/* Main Content */}
      <div className="relative">
        {errorStatus === 404 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl max-w-lg mx-auto py-16 space-y-6 bg-card">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Compass className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="font-heading text-xl font-bold">No Career Path Selected</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Before we can build your personalized roadmap, you need to complete the Career Discovery assessment and pick a path.
              </p>
            </div>
            <Link href="/career" className={buttonVariants({ variant: "default", className: "font-semibold" })}>
              Start Career Assessment
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        ) : roadmap ? (
          <RoadmapViewer roadmap={roadmap} onMilestoneToggle={handleMilestoneToggle} />
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground">Something went wrong loading the roadmap. Please try again later.</p>
          </div>
        )}
      </div>
    </div>
  );
}
