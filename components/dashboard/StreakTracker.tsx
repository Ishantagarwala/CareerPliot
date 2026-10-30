"use client";

import React from "react";
import { Flame, Calendar } from "lucide-react";

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
      const isActive =
        streakDays > 0 && d.toDateString() === lastActiveDate.toDateString();

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
    <div className="bg-card border-2 border-black dark:border-[#383d45] rounded-xl p-5 neo-shadow h-full flex flex-col justify-between">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-display font-black text-foreground uppercase tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg border-2 border-black bg-coral text-black flex items-center justify-center shadow-[2px_2px_0_0_#000]">
              <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
            </span>
            <span>Active Habit Tracker</span>
          </h3>
          <span className="px-2 py-0.5 bg-background border border-black dark:border-[#383d45] rounded font-mono text-[10px] font-bold text-muted-foreground uppercase">
            Consistency
          </span>
        </div>
        <p className="text-xs font-mono text-muted-foreground mt-2">Daily activity streak tracking</p>
      </div>

      {/* Streak Display Box */}
      <div className="flex items-center gap-4 p-4 border-2 border-black dark:border-[#383d45] bg-background rounded-xl mb-6 shadow-[3px_3px_0_0_#000] animate-fade-in-up">
        <div className="w-14 h-14 rounded-xl border-2 border-black bg-coral text-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
          <Flame className="w-7 h-7 fill-black" />
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-black text-foreground tracking-tight">
              {streakDays}
            </span>
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
              day{streakDays !== 1 ? "s" : ""} streak
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-sans font-medium">
            {getMotivationalQuote(streakDays)}
          </p>
        </div>
      </div>

      {/* 7-Day Grid */}
      <div className="space-y-3">
        <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-secondary dark:text-primary" />
          7-Day Activity Grid
        </span>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weeklyDays.map((day, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center p-1 sm:p-2 rounded-lg border-2 text-center transition-all animate-fade-in-up ${
                day.isActive
                  ? "bg-primary text-black border-black shadow-[1px_1px_0_0_#000] sm:shadow-[2px_2px_0_0_#000] font-black"
                  : day.isToday
                  ? "border-black dark:border-white bg-card text-foreground shadow-[1px_1px_0_0_#000] sm:shadow-[2px_2px_0_0_#000] font-bold"
                  : "border-black/20 dark:border-white/10 bg-background text-muted-foreground font-medium"
              }`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <span className="text-[8px] sm:text-[10px] font-mono uppercase tracking-wider block">
                {day.name}
              </span>
              <span className="text-xs sm:text-sm font-display font-black block mt-0.5 sm:mt-1">{day.date}</span>
              {day.isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-black mt-0.5 sm:mt-1" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
