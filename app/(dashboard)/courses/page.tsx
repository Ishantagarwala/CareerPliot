"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import CourseCard from "@/components/courses/CourseCard";
import CourseFilters from "@/components/courses/CourseFilters";
import { buttonVariants } from "@/components/ui/button";
import { BookOpen, Compass, ArrowRight, Library } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Course {
  _id: string;
  title: string;
  platform: string;
  url: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  isFree: boolean;
  rating?: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  // Filter states
  const [level, setLevel] = useState("all");
  const [budget, setBudget] = useState("all");

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/courses", window.location.origin);
      url.searchParams.append("level", level);
      url.searchParams.append("budget", budget);

      const res = await fetch(url.toString());
      if (!res.ok) {
        setErrorStatus(res.status);
        if (res.status !== 404) {
          throw new Error("Failed to load courses");
        }
        return;
      }
      const data = await res.json();
      setCourses(data);
      setErrorStatus(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load course recommendations");
    } finally {
      setLoading(false);
    }
  }, [level, budget]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border border-border bg-card rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-20" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-3 pt-3 border-t border-border/50">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      ))}
    </div>
  );

  if (loading && courses.length === 0) {
    return (
      <div className="space-y-8">
        <div className="border-b border-border pb-5">
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Filters skeleton */}
          <div className="md:col-span-1">
            <div className="border border-border rounded-2xl p-5 space-y-4 bg-card">
              <Skeleton className="h-6 w-24 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="space-y-3 pt-4">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          </div>
          {/* Courses grid skeleton */}
          <div className="md:col-span-3">
            {renderSkeletons()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="border-b border-border pb-5">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          Course Recommendations
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Explore courses selected specifically to support your milestones and career growth.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="relative">
        {errorStatus === 404 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl max-w-lg mx-auto py-16 space-y-6 bg-card">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Compass className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="font-heading text-xl font-bold">No Career Path Selected</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Before we can pull course recommendations, you need to complete the Career Discovery assessment and select a path.
              </p>
            </div>
            <Link href="/career" className={buttonVariants({ variant: "default", className: "font-semibold" })}>
              Start Career Assessment
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Left Column Filters */}
            <div className="md:col-span-1">
              <CourseFilters
                level={level}
                setLevel={setLevel}
                budget={budget}
                setBudget={setBudget}
              />
            </div>

            {/* Right Column Grid */}
            <div className="md:col-span-3">
              {loading ? (
                renderSkeletons()
              ) : courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl py-16 space-y-4 bg-card">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Library className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base">No Matching Courses Found</h4>
                    <p className="text-sm text-muted-foreground max-w-xs mt-1">
                      No courses match your active filter selections. Try broadening your criteria.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {courses.map((course) => (
                    <CourseCard key={course._id} course={course} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
