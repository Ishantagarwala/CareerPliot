"use client";

import { useEffect, useState } from "react";
import PageLoader from "@/components/layout/PageLoader";
import RoadmapViewer from "@/components/roadmap/RoadmapViewer";
import EmptyState from "@/components/ui/EmptyState";
import { toast } from "sonner";

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const fetchRoadmap = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const url = refresh ? "/api/roadmap?refresh=1" : "/api/roadmap";
      const res = await fetch(url);
      if (!res.ok) {
        setErrorStatus(res.status);
        const errData = await res.json().catch(() => ({}));
        if (refresh) {
          toast.error(errData.message || "Failed to regenerate roadmap");
        }
        return;
      }
      const data = await res.json();
      setRoadmap(data);
      setErrorStatus(null);
      if (refresh) {
        toast.success("Roadmap refreshed with latest AI node graph!");
      }
    } catch (err: any) {
      console.error("Roadmap fetch error:", err);
      setErrorStatus(500);
      toast.error(err?.message || "Failed to fetch roadmap details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const handleTopicToggle = async (topicId: string, completed: boolean) => {
    try {
      const res = await fetch("/api/roadmap/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, completed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update progress");

      setRoadmap(data.roadmap);
      if (completed) {
        toast.success("Learning node marked complete!");
      } else {
        toast.info("Learning node marked incomplete.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Could not update node progress.");
    }
  };

  const handleSubtopicToggle = async (topicId: string, subtopicId: string, completed: boolean) => {
    try {
      const res = await fetch("/api/roadmap/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, subtopicId, completed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update subtopic");

      setRoadmap(data.roadmap);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Could not update subtopic progress.");
    }
  };

  if (loading) {
    return <PageLoader label="Generating your Zero-to-Hero node roadmap..." />;
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6 animate-fade-in-up">
        <h1
          className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          <span className="material-symbols-outlined text-[28px]">map</span>
          Learning Roadmap
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          A beginner → advanced plan for your path. Tap a topic for videos, checklist, and resources.
        </p>
      </div>

      <div className="relative">
        {errorStatus === 404 ? (
          <EmptyState
            icon="explore"
            title="Pick a career path first"
            description="Complete Career Discovery and select a path — then we’ll build your personalized zero-to-hero roadmap."
            primaryHref="/career"
            primaryLabel="Start Career Discovery"
            className="max-w-lg mx-auto"
          />
        ) : roadmap ? (
          <RoadmapViewer
            roadmap={roadmap}
            onMilestoneToggle={handleTopicToggle}
            onTopicToggle={handleTopicToggle}
            onSubtopicToggle={handleSubtopicToggle}
            onRefreshRoadmap={() => fetchRoadmap(true)}
            refreshing={refreshing}
          />
        ) : (
          <EmptyState
            icon="error"
            title="Couldn’t load learning roadmap"
            description="We ran into an issue loading or building your interactive roadmap. Click below to regenerate a fresh AI node graph."
            onPrimaryClick={() => {
              setLoading(true);
              fetchRoadmap(true);
            }}
            primaryLabel="Regenerate AI Roadmap"
            className="max-w-lg mx-auto"
          />
        )}
      </div>
    </div>
  );
}

