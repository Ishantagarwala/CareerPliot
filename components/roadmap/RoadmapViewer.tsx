"use client";

import { useState } from "react";
import MilestoneCard from "./MilestoneCard";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, CheckCircle2, Circle, TrendingUp } from "lucide-react";

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

interface RoadmapViewerProps {
  roadmap: Roadmap;
  onMilestoneToggle: (id: string, completed: boolean) => Promise<void>;
}

export default function RoadmapViewer({ roadmap, onMilestoneToggle }: RoadmapViewerProps) {
  const [activeTab, setActiveTab] = useState<string>(roadmap.currentStage);

  // Calculate progress stats
  const allMilestones = roadmap.stages.reduce<Milestone[]>(
    (acc, stage) => [...acc, ...stage.milestones],
    []
  );
  const totalCount = allMilestones.length;
  const completedCount = allMilestones.filter((m) => m.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getStageDisplay = (name: string) => {
    switch (name) {
      case "beginner":
        return "Beginner Phase";
      case "intermediate":
        return "Intermediate Phase";
      case "advanced":
        return "Advanced Phase";
      default:
        return name;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Target Career
          </span>
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
            <Award className="h-5 w-5 text-primary shrink-0" />
            {roadmap.careerPath}
          </h2>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Current Stage
          </span>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary shrink-0" />
            <span className="font-bold text-lg capitalize">{roadmap.currentStage}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Roadmap Progress</span>
            <span>
              {completedCount}/{totalCount} Completed
            </span>
          </div>
          <div className="pt-1.5">
            <Progress value={progressPercent} className="h-2" />
            <span className="text-[11px] font-semibold text-primary/80 mt-1 block">
              {progressPercent}% completed
            </span>
          </div>
        </div>
      </div>

      {/* Main Roadmap Tabs */}
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <TabsList className="bg-muted p-1 rounded-xl">
            {roadmap.stages.map((stage) => {
              const isCurrent = roadmap.currentStage === stage.name;
              const isCompleted = stage.milestones.every((m) => m.completed);
              return (
                <TabsTrigger
                  key={stage.name}
                  value={stage.name}
                  className="rounded-lg px-4 py-2 text-sm font-semibold capitalize data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  <span className="flex items-center gap-1.5">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : isCurrent ? (
                      <Circle className="h-4 w-4 text-primary animate-pulse" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    {stage.name}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {roadmap.stages.map((stage) => (
          <TabsContent key={stage.name} value={stage.name} className="focus:outline-none">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <h3 className="font-heading text-lg font-bold">
                  {getStageDisplay(stage.name)}
                </h3>
                <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
                  {stage.milestones.filter((m) => m.completed).length}/{stage.milestones.length}{" "}
                  Tasks Done
                </span>
              </div>

              <div className="space-y-4">
                {stage.milestones.map((milestone) => (
                  <MilestoneCard
                    key={milestone._id}
                    milestone={milestone}
                    onToggle={onMilestoneToggle}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
