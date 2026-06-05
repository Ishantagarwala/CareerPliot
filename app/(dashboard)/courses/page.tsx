"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import CourseCard from "@/components/courses/CourseCard";
import CourseFilters from "@/components/courses/CourseFilters";
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

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

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
        <div key={i} className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="flex justify-between items-center">
            <div className="h-5 w-20 bg-[#262626]" />
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-[#262626]" />
              <div className="h-5 w-12 bg-[#262626]" />
            </div>
          </div>
          <div className="h-12 w-full bg-[#262626]" />
          <div className="h-4 w-32 bg-[#262626]" />
          <div className="flex gap-3 pt-3 border-t border-[#262626]">
            <div className="h-9 flex-1 bg-[#262626]" />
            <div className="h-9 w-9 bg-[#262626]" />
          </div>
        </div>
      ))}
    </div>
  );

  if (loading && courses.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="border-b border-[#262626] pb-6">
          <div className="h-8 w-64 bg-[#1A1A1A] mb-2" />
          <div className="h-4 w-96 bg-[#1A1A1A]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4">
              <div className="h-6 w-24 bg-[#262626] mb-4" />
              <div className="space-y-3">
                <div className="h-4 w-12 bg-[#262626]" />
                <div className="h-9 w-full bg-[#262626]" />
              </div>
            </div>
          </div>
          <div className="md:col-span-3">
            {renderSkeletons()}
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
          <span className="material-symbols-outlined text-[28px]">school</span>
          Course Recommendations
        </h1>
        <p className="text-sm text-[#8e9192] mt-2">
          Explore courses selected specifically to support your milestones and career growth.
        </p>
      </div>

      {/* Main Content */}
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
                Before we can pull course recommendations, you need to complete the Career Discovery assessment and select a path.
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
                <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-[#262626] py-16 space-y-4 bg-[#131313] animate-fade-in-up">
                  <div className="h-12 w-12 border border-[#262626] flex items-center justify-center text-[#8e9192]">
                    <span className="material-symbols-outlined text-[24px]">library_books</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-white">No Matching Courses Found</h4>
                    <p className="text-sm text-[#8e9192] max-w-xs mt-1">
                      No courses match your active filter selections. Try broadening your criteria.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {courses.map((course, idx) => (
                    <div key={course._id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                      <CourseCard course={course} />
                    </div>
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
