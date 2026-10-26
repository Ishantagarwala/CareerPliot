"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  animationDelay?: number;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  animationDelay = 0,
}: StatsCardProps) {
  return (
    <div
      className="bg-card border-2 border-black dark:border-[#383d45] rounded-xl p-4 sm:p-5 neo-shadow hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#000] dark:hover:shadow-[5px_5px_0_0_#000] transition-all animate-fade-in-up group flex flex-col justify-between"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
            {title}
          </p>
          <h3 className="text-2xl sm:text-3xl font-display font-black text-foreground tracking-tight">
            {value}
          </h3>
          {description && (
            <p className="text-xs font-mono font-medium text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>

        <div className="w-10 h-10 rounded-xl border-2 border-black bg-primary text-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000] group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-all">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
