"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import PageLoader from "@/components/layout/PageLoader";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, CheckCircle2 } from "lucide-react";

interface ActiveCourse {
  title: string;
  platform: string;
  progress: number;
  estCompletion: string;
}

interface FutureGoals {
  shortTerm: string[];
  longTerm: string[];
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile data state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentCourse, setCurrentCourse] = useState("");
  const [activeCurriculum, setActiveCurriculum] = useState<ActiveCourse[]>([]);
  const [futureGoals, setFutureGoals] = useState<FutureGoals>({ shortTerm: [], longTerm: [] });

  // Add course form state
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCoursePlatform, setNewCoursePlatform] = useState("");
  const [newCourseEstCompletion, setNewCourseEstCompletion] = useState("");
  const [newCourseProgress, setNewCourseProgress] = useState(0);

  // Add goal state
  const [newGoalText, setNewGoalText] = useState("");
  const [newGoalType, setNewGoalType] = useState<"shortTerm" | "longTerm">("shortTerm");

  // Fetch profile data on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        
        setName(data.name || "");
        setEmail(data.email || "");
        setCurrentCourse(data.currentCourse || "");
        setActiveCurriculum(data.activeCurriculum || []);
        setFutureGoals(data.futureGoals || { shortTerm: [], longTerm: [] });
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load profile details");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Commit changes to database
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          currentCourse,
          activeCurriculum,
          futureGoals,
        }),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      const data = await res.json();

      // Trigger session update for username change
      if (session?.user) {
        await updateSession({
          ...session,
          user: {
            ...session.user,
            name: name,
          },
        });
      }

      toast.success("Profile saved successfully");
    } catch (err: any) {
      console.error(err);
      toast.error("Error committing changes to database");
    } finally {
      setSaving(false);
    }
  };

  // Add course handler
  const handleAddCourse = () => {
    if (!newCourseTitle.trim() || !newCoursePlatform.trim() || !newCourseEstCompletion.trim()) {
      toast.error("Please fill in all course details");
      return;
    }

    const newCourse: ActiveCourse = {
      title: newCourseTitle.trim(),
      platform: newCoursePlatform.trim(),
      progress: Math.min(Math.max(newCourseProgress, 0), 100),
      estCompletion: newCourseEstCompletion.trim()
    };

    setActiveCurriculum([...activeCurriculum, newCourse]);
    
    // Reset inputs
    setNewCourseTitle("");
    setNewCoursePlatform("");
    setNewCourseEstCompletion("");
    setNewCourseProgress(0);
    setShowAddCourse(false);
    toast.success("Course added to active curriculum");
  };

  // Delete course handler
  const handleDeleteCourse = (index: number) => {
    const updated = activeCurriculum.filter((_, idx) => idx !== index);
    setActiveCurriculum(updated);
    toast.success("Course removed");
  };

  // Update course progress slider
  const handleProgressChange = (index: number, val: number) => {
    const updated = [...activeCurriculum];
    updated[index].progress = val;
    setActiveCurriculum(updated);
  };

  // Add strategic milestone goal
  const handleAddGoal = () => {
    if (!newGoalText.trim()) return;

    const updatedGoals = { ...futureGoals };
    if (newGoalType === "shortTerm") {
      updatedGoals.shortTerm = [...updatedGoals.shortTerm, newGoalText.trim()];
    } else {
      updatedGoals.longTerm = [...updatedGoals.longTerm, newGoalText.trim()];
    }

    setFutureGoals(updatedGoals);
    setNewGoalText("");
    toast.success("Milestone goal added");
  };

  // Remove goal
  const handleDeleteGoal = (type: "shortTerm" | "longTerm", index: number) => {
    const updatedGoals = { ...futureGoals };
    if (type === "shortTerm") {
      updatedGoals.shortTerm = updatedGoals.shortTerm.filter((_, idx) => idx !== index);
    } else {
      updatedGoals.longTerm = updatedGoals.longTerm.filter((_, idx) => idx !== index);
    }
    setFutureGoals(updatedGoals);
    toast.success("Goal removed");
  };

  if (loading) {
    return <PageLoader label="Loading profile" />;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[22px]">person</span>
            </span>
            Executive Profile
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your personal data, track active learning, and define your trajectory.
          </p>
        </div>
        <div>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:opacity-50 sm:w-auto"
          >
            {saving ? "Saving Changes..." : "Commit Changes"}
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Identity Metrics Card */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-6 text-[13px] font-medium text-muted-foreground">
              Identity Metrics
            </h3>
            
            <div className="mb-6 flex flex-col items-center">
              <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-accent text-3xl font-bold text-accent-foreground ring-2 ring-primary/30">
                {name.charAt(0).toUpperCase() || "U"}
              </div>
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
                STUDENT TRAJECTORY
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-muted-foreground">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-muted-foreground">Professional Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="h-10 w-full cursor-not-allowed rounded-lg border border-input bg-muted px-3 text-sm font-medium text-muted-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-muted-foreground">Current Course / Role</label>
                <input
                  type="text"
                  value={currentCourse}
                  onChange={(e) => setCurrentCourse(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science"
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Courses & Goals Column */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Active Curriculum Section */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-[13px] font-medium text-muted-foreground">
                Active Curriculum
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-primary">
                  {activeCurriculum.length} In Progress
                </span>
                <button
                  onClick={() => setShowAddCourse(!showAddCourse)}
                  aria-label={showAddCourse ? "Hide add course form" : "Add active course"}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Inline Add Course form */}
            {showAddCourse && (
              <div className="animate-scale-in mb-6 space-y-4 rounded-xl border border-border bg-muted/40 p-4">
                <h4 className="text-[13px] font-medium text-muted-foreground">Add Active Course</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-muted-foreground">Course Title</label>
                    <input
                      type="text"
                      value={newCourseTitle}
                      onChange={(e) => setNewCourseTitle(e.target.value)}
                      placeholder="e.g. Distributed Systems"
                      className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-muted-foreground">Platform / Institution</label>
                    <input
                      type="text"
                      value={newCoursePlatform}
                      onChange={(e) => setNewCoursePlatform(e.target.value)}
                      placeholder="e.g. Stanford Online"
                      className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-muted-foreground">Est. Completion</label>
                    <input
                      type="text"
                      value={newCourseEstCompletion}
                      onChange={(e) => setNewCourseEstCompletion(e.target.value)}
                      placeholder="e.g. Q3 2026"
                      className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-muted-foreground">Starting Progress ({newCourseProgress}%)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newCourseProgress}
                      onChange={(e) => setNewCourseProgress(parseInt(e.target.value))}
                      className="mt-2 w-full accent-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowAddCourse(false)}
                    className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCourse}
                    className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
                  >
                    Add Course
                  </button>
                </div>
              </div>
            )}

            {/* Courses List */}
            {activeCurriculum.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No active courses added yet. Click the + icon to add one.
              </div>
            ) : (
              <div className="space-y-4">
                {activeCurriculum.map((course, index) => (
                  <div key={index} className="group rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:border-primary/30">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-bold tracking-tight text-foreground">{course.title}</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {course.platform} &bull; Est. Completion: {course.estCompletion}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary">
                          {course.progress}%
                        </span>
                        <button
                          onClick={() => handleDeleteCourse(index)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete course"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress Tracker</span>
                        <span>Drag slider to update</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={course.progress}
                          onChange={(e) => handleProgressChange(index, parseInt(e.target.value))}
                          className="h-1.5 flex-1 cursor-pointer accent-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Strategic Milestones Section */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-[13px] font-medium text-muted-foreground">
                Strategic Milestones
              </h3>
              <div className="flex items-center gap-3">
                <select
                  value={newGoalType}
                  onChange={(e: any) => setNewGoalType(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-card px-2 text-sm font-medium text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                >
                  <option value="shortTerm">Short-Term (1-2 Yrs)</option>
                  <option value="longTerm">Long-Term (5+ Yrs)</option>
                </select>
              </div>
            </div>

            {/* Add Goal Input */}
            <div className="mb-6 flex gap-2">
              <input
                type="text"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddGoal();
                }}
                placeholder={`Add a future ${newGoalType === "shortTerm" ? "short-term" : "long-term"} goal directive...`}
                className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
              />
              <button
                onClick={handleAddGoal}
                aria-label="Add goal"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Goals Columns */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              
              {/* Short Term Goal Box */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-muted-foreground">flag</span>
                  <h4 className="text-[13px] font-medium text-muted-foreground">
                    Short-Term (1-2 Yrs)
                  </h4>
                </div>
                {futureGoals.shortTerm.length === 0 ? (
                  <p className="py-2 text-xs italic text-muted-foreground">No short-term milestones defined.</p>
                ) : (
                  <ul className="space-y-2">
                    {futureGoals.shortTerm.map((goal, idx) => (
                      <li key={idx} className="group/item flex items-start justify-between gap-2 text-[13px] text-foreground">
                        <div className="flex items-start gap-2 pt-0.5">
                          <span className="text-muted-foreground">&bull;</span>
                          <span>{goal}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteGoal("shortTerm", idx)}
                          className="shrink-0 rounded-md p-0.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover/item:opacity-100"
                          aria-label="Delete goal"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Long Term Goal Box */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-muted-foreground">rocket_launch</span>
                  <h4 className="text-[13px] font-medium text-muted-foreground">
                    Long-Term (5+ Yrs)
                  </h4>
                </div>
                {futureGoals.longTerm.length === 0 ? (
                  <p className="py-2 text-xs italic text-muted-foreground">No long-term milestones defined.</p>
                ) : (
                  <ul className="space-y-2">
                    {futureGoals.longTerm.map((goal, idx) => (
                      <li key={idx} className="group/item flex items-start justify-between gap-2 text-[13px] text-foreground">
                        <div className="flex items-start gap-2 pt-0.5">
                          <span className="text-muted-foreground">&bull;</span>
                          <span>{goal}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteGoal("longTerm", idx)}
                          className="shrink-0 rounded-md p-0.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover/item:opacity-100"
                          aria-label="Delete goal"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
