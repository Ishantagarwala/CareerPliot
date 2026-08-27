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
      className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
          <h3 className="text-[1.75rem] font-bold leading-none tracking-tight text-foreground">
            {value}
          </h3>
          {description && (
            <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
