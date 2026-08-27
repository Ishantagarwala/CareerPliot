"use client";

import React from "react";

interface StreakTrackerProps {
  streakDays: number;
  lastActive: string | Date;
}

export default function StreakTracker({ streakDays, lastActive }: StreakTrackerProps) {
  const getLast7Days = () => {
    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);

      const lastActiveDate = new Date(lastActive);
      const isToday = d.toDateString() === today.toDateString();
      const isActive = streakDays > 0 && (
        d.toDateString() === lastActiveDate.toDateString() ||
        (isToday && new Date().toDateString() === lastActiveDate.toDateString()) ||
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
    if (streak === 1) return "First step complete! Come back tomorrow to keep it alive.";
    if (streak < 3) return "Momentum is building — consistency beats intensity.";
    if (streak < 7) return "Strong habit forming. This is how skills compound.";
    return "Legendary consistency. Keep the chain going!";
  };

  return (
    <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-6">
        <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
          <span className="material-symbols-outlined text-[20px] text-amber">
            local_fire_department
          </span>
          Study streak
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">Daily activity, tracked</p>
      </div>

      {/* Streak display */}
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-border bg-background p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <span className="material-symbols-outlined text-[26px]">local_fire_department</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {streakDays}
            </span>
            <span className="text-[13px] font-medium text-muted-foreground">
              day{streakDays !== 1 ? "s" : ""} streak
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {getMotivationalQuote(streakDays)}
          </p>
        </div>
      </div>

      {/* 7-day grid */}
      <div className="space-y-3">
        <span className="text-[13px] font-medium text-muted-foreground">
          Last 7 days
        </span>
        <div className="grid grid-cols-7 gap-2">
          {weeklyDays.map((day, idx) => (
            <div
              key={idx}
              className={`flex animate-fade-in-up flex-col items-center rounded-xl border p-2 text-center transition-colors ${
                day.isActive
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : day.isToday
                    ? "border-border bg-muted text-foreground"
                    : "border-border text-muted-foreground"
              }`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-wide">
                {day.name}
              </span>
              <span className="mt-1 block text-sm font-bold tabular-nums">{day.date}</span>
              <span
                className={`mt-1.5 h-1.5 w-1.5 rounded-full ${
                  day.isActive ? "bg-primary" : "bg-border"
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
