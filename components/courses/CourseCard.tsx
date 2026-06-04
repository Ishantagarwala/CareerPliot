"use client";

import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Star, ExternalLink, GraduationCap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Course {
  _id: string;
  title: string;
  platform: string;
  url: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  isFree: boolean;
  rating?: number;
}

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  const [completed, setCompleted] = useState(() => {
    if (typeof window !== "undefined") {
      const key = `course_completed_${course._id}`;
      return localStorage.getItem(key) === "true";
    }
    return false;
  });
  const [loading, setLoading] = useState(false);

  const toggleCompleted = async () => {
    setLoading(true);
    try {
      const action = completed ? "uncomplete_course" : "complete_course";
      const res = await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        throw new Error("Failed to update course progress");
      }

      const nextState = !completed;
      setCompleted(nextState);
      
      const key = `course_completed_${course._id}`;
      if (nextState) {
        localStorage.setItem(key, "true");
        toast.success(`Completed "${course.title}"!`);
      } else {
        localStorage.removeItem(key);
        toast.info(`Marked "${course.title}" as incomplete`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update progress");
    } finally {
      setLoading(false);
    }
  };

  // Star rendering helper
  const renderStars = (rating: number = 5) => {
    const stars = [];
    const floor = Math.floor(rating);
    for (let i = 1; i <= 5; i++) {
      if (i <= floor) {
        stars.push(<Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />);
      } else {
        stars.push(<Star key={i} className="h-3.5 w-3.5 text-zinc-300 shrink-0" />);
      }
    }
    return stars;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "intermediate":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "advanced":
        return "bg-pink-500/10 text-pink-500 border-pink-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  return (
    <Card className={`flex flex-col border-border bg-card transition-all duration-300 relative overflow-hidden ${
      completed ? "border-emerald-500/30 shadow-sm bg-emerald-500/[0.01]" : "hover:shadow-md"
    }`}>
      {/* Sparkly corner background indicator for completed courses */}
      {completed && (
        <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/5 rotate-45 translate-x-8 -translate-y-8 pointer-events-none" />
      )}

      <CardHeader className="pb-3 flex-1">
        <div className="flex justify-between items-start gap-2 mb-3">
          <Badge variant="outline" className="font-semibold px-2 py-0.5 text-xs bg-muted">
            {course.platform}
          </Badge>
          <div className="flex gap-1">
            <Badge variant="outline" className={`capitalize font-semibold text-xs ${getLevelColor(course.skillLevel)}`}>
              {course.skillLevel}
            </Badge>
            <Badge className={`text-xs font-semibold ${course.isFree ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
              {course.isFree ? "Free" : "Paid"}
            </Badge>
          </div>
        </div>
        
        <CardTitle className="font-heading text-base font-bold text-foreground leading-snug line-clamp-2">
          {course.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-4">
        <div className="flex justify-between items-center">
          {course.rating && (
            <div className="flex items-center gap-1.5">
              <div className="flex">{renderStars(course.rating)}</div>
              <span className="text-xs font-bold text-foreground mt-0.5">{course.rating.toFixed(1)}</span>
            </div>
          )}
          {completed && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t border-border/50 bg-zinc-50/50 dark:bg-zinc-950/20 flex gap-2">
        <a 
          href={course.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} flex-1 justify-between font-semibold hover:bg-primary/5 hover:text-primary group`}
        >
          <span className="flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4" /> Go to Course
          </span>
          <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>

        <button
          disabled={loading}
          onClick={toggleCompleted}
          className={`h-9 w-9 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
            completed 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20" 
              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title={completed ? "Mark incomplete" : "Mark as completed"}
        >
          {loading ? (
            <span className="h-4 w-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          ) : (
            <CheckCircle2 className={`h-4.5 w-4.5 ${completed ? "fill-emerald-500/20" : ""}`} />
          )}
        </button>
      </CardFooter>
    </Card>
  );
}
