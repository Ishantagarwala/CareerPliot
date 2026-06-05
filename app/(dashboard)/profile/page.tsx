"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="border-b border-[#262626] pb-6">
          <div className="h-8 w-48 bg-[#1A1A1A] mb-2 animate-pulse" />
          <div className="h-4 w-80 bg-[#1A1A1A] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-[#1A1A1A] border border-[#262626] h-96 animate-pulse" />
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#1A1A1A] border border-[#262626] h-48 animate-pulse" />
            <div className="bg-[#1A1A1A] border border-[#262626] h-48 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Page Header */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[28px]">person</span>
            Executive Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage your personal data, track active learning, and define your trajectory.
          </p>
        </div>
        <div>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50 transition-colors uppercase text-xs tracking-wider"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {saving ? "Saving Changes..." : "Commit Changes"}
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Identity Metrics Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border p-6 shadow-sm">
            <h3
              className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Identity Metrics
            </h3>
            
            <div className="flex flex-col items-center mb-6">
              <div className="h-24 w-24 rounded-full border-2 border-primary flex items-center justify-center bg-accent text-foreground text-3xl font-bold font-heading mb-3">
                {name.charAt(0).toUpperCase() || "U"}
              </div>
              <p
                className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                STUDENT TRAJECTORY
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border p-2.5 text-foreground text-sm font-medium focus:border-primary transition-colors focus:ring-0 rounded-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Professional Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-background border border-border p-2.5 text-muted-foreground text-sm font-medium cursor-not-allowed rounded-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Current Course / Role</label>
                <input
                  type="text"
                  value={currentCourse}
                  onChange={(e) => setCurrentCourse(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science"
                  className="w-full bg-background border border-border p-2.5 text-foreground text-sm font-medium focus:border-primary transition-colors focus:ring-0 rounded-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Courses & Goals Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Curriculum Section */}
          <div className="bg-card border border-border p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-border">
              <h3
                className="text-xs font-bold text-muted-foreground uppercase tracking-widest"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Active Curriculum
              </h3>
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-bold text-primary"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {activeCurriculum.length} In Progress
                </span>
                <button
                  onClick={() => setShowAddCourse(!showAddCourse)}
                  className="p-1 hover:text-primary transition-colors flex items-center justify-center text-muted-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Inline Add Course form */}
            {showAddCourse && (
              <div className="mb-6 p-4 border border-border bg-background/50 space-y-4 animate-scale-in">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Add Active Course</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Course Title</label>
                    <input
                      type="text"
                      value={newCourseTitle}
                      onChange={(e) => setNewCourseTitle(e.target.value)}
                      placeholder="e.g. Distributed Systems"
                      className="w-full bg-background border border-border p-2 text-foreground text-xs rounded-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Platform / Institution</label>
                    <input
                      type="text"
                      value={newCoursePlatform}
                      onChange={(e) => setNewCoursePlatform(e.target.value)}
                      placeholder="e.g. Stanford Online"
                      className="w-full bg-background border border-border p-2 text-foreground text-xs rounded-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Est. Completion</label>
                    <input
                      type="text"
                      value={newCourseEstCompletion}
                      onChange={(e) => setNewCourseEstCompletion(e.target.value)}
                      placeholder="e.g. Q3 2026"
                      className="w-full bg-background border border-border p-2 text-foreground text-xs rounded-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Starting Progress ({newCourseProgress}%)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newCourseProgress}
                      onChange={(e) => setNewCourseProgress(parseInt(e.target.value))}
                      className="w-full mt-2 accent-foreground"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setShowAddCourse(false)}
                    className="px-4 py-1.5 border border-border text-xs uppercase"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCourse}
                    className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold uppercase"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Add Course
                  </button>
                </div>
              </div>
            )}

            {/* Courses List */}
            {activeCurriculum.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border text-sm">
                No active courses added yet. Click the + icon to add one.
              </div>
            ) : (
              <div className="space-y-6">
                {activeCurriculum.map((course, index) => (
                  <div key={index} className="group border border-border/50 p-4 bg-background/20 hover:border-border transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-base font-bold text-foreground">{course.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {course.platform} &bull; Est. Completion: {course.estCompletion}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs font-bold border border-primary px-2.5 py-1 text-foreground"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {course.progress}%
                        </span>
                        <button
                          onClick={() => handleDeleteCourse(index)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          aria-label="Delete course"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 mt-4">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
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
                          className="flex-1 accent-foreground cursor-pointer h-1 bg-muted rounded-lg appearance-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Strategic Milestones Section */}
          <div className="bg-card border border-border p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-border">
              <h3
                className="text-xs font-bold text-muted-foreground uppercase tracking-widest"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Strategic Milestones
              </h3>
              <div className="flex items-center gap-3">
                <select
                  value={newGoalType}
                  onChange={(e: any) => setNewGoalType(e.target.value)}
                  className="bg-background border border-border text-xs px-2 py-1 focus:ring-0 text-foreground"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
                className="flex-1 bg-background border border-border p-2 text-foreground text-xs focus:border-primary transition-colors focus:ring-0 rounded-none"
              />
              <button
                onClick={handleAddGoal}
                className="bg-primary text-primary-foreground px-4 py-2 text-xs font-bold flex items-center justify-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Goals Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Short Term Goal Box */}
              <div className="border border-border p-4 bg-background/10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-muted-foreground text-sm">flag</span>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Short-Term (1-2 Yrs)
                  </h4>
                </div>
                {futureGoals.shortTerm.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No short-term milestones defined.</p>
                ) : (
                  <ul className="space-y-2">
                    {futureGoals.shortTerm.map((goal, idx) => (
                      <li key={idx} className="flex items-start justify-between gap-2 text-xs text-foreground group/item">
                        <div className="flex items-start gap-2 pt-0.5">
                          <span className="text-muted-foreground">&bull;</span>
                          <span>{goal}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteGoal("shortTerm", idx)}
                          className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 shrink-0"
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
              <div className="border border-border p-4 bg-background/10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-muted-foreground text-sm">rocket_launch</span>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Long-Term (5+ Yrs)
                  </h4>
                </div>
                {futureGoals.longTerm.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No long-term milestones defined.</p>
                ) : (
                  <ul className="space-y-2">
                    {futureGoals.longTerm.map((goal, idx) => (
                      <li key={idx} className="flex items-start justify-between gap-2 text-xs text-foreground group/item">
                        <div className="flex items-start gap-2 pt-0.5">
                          <span className="text-muted-foreground">&bull;</span>
                          <span>{goal}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteGoal("longTerm", idx)}
                          className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 shrink-0"
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
