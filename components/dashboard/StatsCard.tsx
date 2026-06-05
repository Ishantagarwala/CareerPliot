"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  bgColor?: string;
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
      className="bg-[#1A1A1A] border border-[#262626] p-6 hover:border-[#404040] transition-all animate-fade-in-up group"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <p
            className="text-[11px] text-[#8e9192] uppercase tracking-[0.1em] font-medium"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {title}
          </p>
          <h3
            className="text-3xl font-bold text-white tracking-tight"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            {value}
          </h3>
          {description && (
            <p className="text-[10px] text-[#636565] font-medium">{description}</p>
          )}
        </div>

        <div className="h-12 w-12 border border-[#262626] bg-[#131313] flex items-center justify-center group-hover:border-[#404040] transition-colors">
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}
