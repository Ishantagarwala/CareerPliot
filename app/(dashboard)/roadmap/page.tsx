"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RoadmapViewer from "@/components/roadmap/RoadmapViewer";
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
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="border-b border-[#262626] pb-6">
          <div className="h-8 w-48 bg-[#1A1A1A] mb-2" />
          <div className="h-4 w-80 bg-[#1A1A1A]" />
        </div>

        {/* Loading spinner */}
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="h-10 w-10 border-2 border-[#262626] border-t-white animate-spin" style={{ borderRadius: 0 }} />
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-white">Loading your learning roadmap...</p>
            <p className="text-xs text-[#8e9192]">This may take a moment if your roadmap is being generated for the first time.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-[#262626] pb-6 animate-fade-in-up">
        <h1
          className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          <span className="material-symbols-outlined text-[28px]">map</span>
          Learning Roadmap
        </h1>
        <p className="text-sm text-[#8e9192] mt-2">
          Your personalized, step-by-step path to master skills required for your selected career.
        </p>
      </div>

      {/* Content */}
      <div className="relative">
        {errorStatus === 404 ? (
          <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-[#262626] max-w-lg mx-auto py-16 px-8 space-y-6 bg-[#131313] animate-fade-in-up">
            <div className="h-16 w-16 border border-[#262626] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[32px]">explore</span>
            </div>
            <div className="space-y-2">
              <h3
                className="font-bold text-xl text-white"
                style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
              >
                No Career Path Selected
              </h3>
              <p className="text-sm text-[#8e9192] max-w-sm">
                Before we can build your personalized roadmap, you need to complete the Career Discovery assessment and pick a path.
              </p>
            </div>
            <Link
              href="/career"
              className="inline-flex items-center px-6 py-2.5 bg-white text-[#0A0A0A] font-bold hover:bg-[#e2e2e2] transition-colors text-xs group"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
            >
              Start Career Assessment
              <span className="material-symbols-outlined text-[16px] ml-1.5 group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>
        ) : roadmap ? (
          <RoadmapViewer roadmap={roadmap} onMilestoneToggle={handleMilestoneToggle} />
        ) : (
          <div className="text-center py-10">
            <p className="text-[#8e9192]">Something went wrong loading the roadmap. Please try again later.</p>
          </div>
        )}
      </div>
    </div>
  );
}
