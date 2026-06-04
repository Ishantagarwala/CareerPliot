"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, Compass } from "lucide-react";

interface StageDetail {
  completed: number;
  total: number;
}

interface ProgressChartProps {
  stageProgress: {
    beginner: StageDetail;
    intermediate: StageDetail;
    advanced: StageDetail;
  };
  careerPath: string | null;
}

export default function ProgressChart({ stageProgress, careerPath }: ProgressChartProps) {
  const getPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const stages = [
    {
      key: "beginner",
      name: "Beginner Stage",
      completed: stageProgress?.beginner?.completed || 0,
      total: stageProgress?.beginner?.total || 0,
      color: "bg-blue-500",
      textColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
      description: "Foundational learning, basic scripting, tools setup",
    },
    {
      key: "intermediate",
      name: "Intermediate Stage",
      completed: stageProgress?.intermediate?.completed || 0,
      total: stageProgress?.intermediate?.total || 0,
      color: "bg-purple-500",
      textColor: "text-purple-500",
      bgColor: "bg-purple-500/10",
      description: "Frameworks, databases, medium projects, algorithms",
    },
    {
      key: "advanced",
      name: "Advanced Stage",
      completed: stageProgress?.advanced?.completed || 0,
      total: stageProgress?.advanced?.total || 0,
      color: "bg-pink-500",
      textColor: "text-pink-500",
      bgColor: "bg-pink-500/10",
      description: "System design, deployment, portfolio curation, job preparation",
    },
  ];

  return (
    <Card className="border-border bg-card shadow-sm h-full">
      <CardHeader className="pb-4">
        <CardTitle className="font-heading text-lg font-bold flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" /> Roadmap Stage Metrics
        </CardTitle>
        <CardDescription>
          {careerPath 
            ? `Milestone completion for career: ${careerPath}` 
            : "No active career path selected."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {careerPath ? (
          stages.map((stage) => {
            const percent = getPercentage(stage.completed, stage.total);
            return (
              <div key={stage.key} className="space-y-2 group">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                      {stage.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium block">
                      {stage.description}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${stage.textColor} block`}>
                      {stage.completed} / {stage.total} Milestones
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5">
                      {percent}% Done
                    </span>
                  </div>
                </div>
                
                <div className="relative">
                  <Progress 
                    value={percent} 
                    className="h-2.5 bg-muted rounded-full overflow-hidden" 
                    indicatorClassName={stage.color}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 space-y-3">
            <Compass className="h-10 w-10 text-muted-foreground mx-auto animate-pulse" />
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Please select a career path and initialize your roadmap to view milestones progress.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
