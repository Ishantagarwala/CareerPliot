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
    if (streak === 1) return "First step complete! Maintain your streak by studying again tomorrow.";
    if (streak < 3) return "You're building momentum! Consistency is the key to mastering skills.";
    if (streak < 7) return "Incredible dedication! You are developing a powerful learning habit.";
    return "Legendary consistency! You've unlocked the ultimate study routine. Keep going!";
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#262626] p-6 h-full">
      <div className="mb-6">
        <h3
          className="text-base font-bold text-white flex items-center gap-2"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          <span className="material-symbols-outlined text-[20px] text-white">local_fire_department</span>
          Active Habit Tracker
        </h3>
        <p className="text-xs text-[#8e9192] mt-1">Daily activity streak tracking</p>
      </div>

      {/* Streak Display */}
      <div className="flex items-center gap-4 p-4 border border-[#262626] bg-[#131313] mb-6 animate-fade-in-up">
        <div className="h-14 w-14 border border-[#262626] flex items-center justify-center text-white shrink-0">
          <span className="material-symbols-outlined text-[28px]">local_fire_department</span>
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-2xl font-bold text-white tracking-tight"
              style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
            >
              {streakDays}
            </span>
            <span
              className="text-[11px] text-[#8e9192] uppercase tracking-[0.1em]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              day{streakDays !== 1 ? "s" : ""} streak
            </span>
          </div>
          <p className="text-[10px] text-[#636565] mt-1 leading-relaxed font-medium">
            {getMotivationalQuote(streakDays)}
          </p>
        </div>
      </div>

      {/* 7-Day Grid */}
      <div className="space-y-3">
        <span
          className="text-[11px] text-[#8e9192] uppercase tracking-[0.1em] flex items-center gap-1.5"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span className="material-symbols-outlined text-[16px] text-white">calendar_month</span>
          7-Day Progress
        </span>
        <div className="grid grid-cols-7 gap-2">
          {weeklyDays.map((day, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center p-2 border text-center transition-all animate-fade-in-up ${
                day.isActive
                  ? "bg-white/5 border-white/30 text-white"
                  : day.isToday
                  ? "border-[#404040] bg-[#131313] text-white"
                  : "border-[#262626] bg-transparent text-[#636565]"
              }`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <span
                className="text-[9px] font-medium uppercase tracking-wider block"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {day.name}
              </span>
              <span className="text-sm font-bold block mt-1">{day.date}</span>
              {day.isActive && (
                <span className="h-1 w-1 rounded-full bg-white mt-1" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
