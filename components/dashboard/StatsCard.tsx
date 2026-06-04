"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  description?: string;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor,
  bgColor,
  description,
}: StatsCardProps) {
  return (
    <Card className="border-border bg-card hover:shadow-md transition-all duration-300 group overflow-hidden relative">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-heading text-3xl font-extrabold text-foreground tracking-tight transition-transform duration-300 group-hover:translate-x-0.5">
              {value}
            </h3>
          </div>
          {description && (
            <p className="text-[10px] text-muted-foreground font-medium">{description}</p>
          )}
        </div>

        <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm ${bgColor} ${iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}
