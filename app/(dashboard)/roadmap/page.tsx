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
        
        {/* Roadmap stages timeline skeleton */}
        <div className="space-y-12 relative before:absolute before:inset-y-0 before:left-4 sm:before:left-6 before:w-0.5 before:bg-muted/80">
          {[1, 2].map((stageIdx) => (
            <div key={stageIdx} className="relative pl-10 sm:pl-16 space-y-6">
              {/* Timeline marker */}
              <div className="absolute left-1.5 sm:left-3.5 top-0 h-6 w-6 rounded-full border-4 border-background bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              
              {/* Stage Header */}
              <div className="space-y-2">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-64" />
              </div>
              
              {/* Milestones list */}
              <div className="grid grid-cols-1 gap-4">
                {[1, 2].map((milestoneIdx) => (
                  <div key={milestoneIdx} className="border border-border bg-card rounded-2xl p-5 flex items-start gap-4">
                    <Skeleton className="h-6 w-6 rounded-md shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-full" />
                    </div>
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
