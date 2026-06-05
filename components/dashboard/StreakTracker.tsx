"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Flame, Calendar } from "lucide-react";

interface StreakTrackerProps {
  streakDays: number;
  lastActive: string | Date;
}

export default function StreakTracker({ streakDays, lastActive }: StreakTrackerProps) {
  // Generate last 7 days names and check status
  const getLast7Days = () => {
    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    
    // We render Sunday to Saturday centering around today
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      
      const lastActiveDate = new Date(lastActive);
      
      // Check if this date has matching day-month-year with lastActive or today (if active)
      const isToday = d.toDateString() === today.toDateString();
      const isActive = streakDays > 0 && (
        d.toDateString() === lastActiveDate.toDateString() || 
        (isToday && new Date().toDateString() === lastActiveDate.toDateString()) ||
        // Simplification for the active history representation
        (i === 0)
      );

      days.push({
        name: dayNames[d.getDay()],
        date: d.getDate(),
        isToday,
        isActive,
      });
    }
    return days;
  };

  const weeklyDays = getLast7Days();

  const getMotivationalQuote = (streak: number) => {
    if (streak === 0) return "Start a learning session today to kickstart your streak!";
    if (streak === 1) return "First step complete! Maintain your streak by studying again tomorrow.";
    if (streak < 3) return "You're building momentum! Consistency is the key to mastering skills.";
    if (streak < 7) return "Incredible dedication! You are developing a powerful learning habit.";
    return "Legendary consistency! You've unlocked the ultimate study routine. Keep going!";
  };

  return (
    <Card className="border-border bg-card shadow-sm h-full overflow-hidden relative">
      {/* Visual background flame effect */}
      <div className="absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      
      <CardHeader className="pb-4">
        <CardTitle className="font-heading text-lg font-bold flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-500 animate-pulse" />
          Active Habit Tracker
        </CardTitle>
        <CardDescription>
          Daily activity streak tracking
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Streak Flame Badge */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 animate-fade-in-up">
          <div className="h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
            <Flame className="h-8 w-8 fill-amber-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-foreground tracking-tight">{streakDays}</span>
              <span className="text-xs font-semibold text-muted-foreground">day{streakDays !== 1 ? "s" : ""} streak</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed font-medium">
              {getMotivationalQuote(streakDays)}
            </p>
          </div>
        </div>

        {/* 7-Day Mini Tracker Grid */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary" /> 7-Day Progress
          </span>
          <div className="grid grid-cols-7 gap-2">
            {weeklyDays.map((day, idx) => (
              <div
                key={idx}
                className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all animate-fade-in-up ${
                  day.isActive
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                    : day.isToday
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border/50 bg-card text-muted-foreground"
                }`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider block">
                  {day.name}
                </span>
                <span className="text-sm font-extrabold block mt-1">
                  {day.date}
                </span>
                {day.isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
