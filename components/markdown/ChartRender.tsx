"use client";

import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSpec } from "./ChartBlock";

/** Accent ramp: the hub violet first, then distinguishable neighbours. */
const PALETTE = [
  "#6757e8", "#5367ff", "#0891b2", "#ec4899",
  "#f97316", "#0ea5e9", "#8b5cf6", "#14b8a6",
];

interface Props {
  spec: ChartSpec;
  isDark: boolean;
  textColor: string;
  gridColor: string;
}

/**
 * The Recharts implementation, in its own module so the library is only
 * fetched when a chart actually renders.
 */
export default function ChartRender({ spec, isDark, textColor, gridColor }: Props) {
  const axis = { fontSize: 11, fill: textColor };
  const tooltipStyle = {
    background: isDark ? "#16181d" : "#ffffff",
    border: `1px solid ${gridColor}`,
    borderRadius: 8,
    fontSize: 12,
    color: isDark ? "#ecedf1" : "#15171b",
  };

  const body = () => {
    switch (spec.type) {
      case "line":
        return (
          <LineChart data={spec.data} margin={{ top: 6, right: 14, bottom: 4, left: -14 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={axis} stroke={gridColor} />
            <YAxis tick={axis} stroke={gridColor} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={PALETTE[0]}
              strokeWidth={2}
              dot={{ r: 3, fill: PALETTE[0] }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={spec.data} margin={{ top: 6, right: 14, bottom: 4, left: -14 }}>
            <defs>
              <linearGradient id="cp-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PALETTE[0]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={PALETTE[0]} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={axis} stroke={gridColor} />
            <YAxis tick={axis} stroke={gridColor} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={PALETTE[0]}
              strokeWidth={2}
              fill="url(#cp-area)"
            />
          </AreaChart>
        );
      case "pie":
        return (
          <PieChart>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: textColor }} />
            <Pie
              data={spec.data}
              dataKey="value"
              nameKey="label"
              innerRadius="45%"
              outerRadius="72%"
              paddingAngle={2}
            >
              {spec.data.map((row, i) => (
                <Cell key={row.label} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      default:
        return (
          <BarChart data={spec.data} margin={{ top: 6, right: 14, bottom: 4, left: -14 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={axis} stroke={gridColor} />
            <YAxis tick={axis} stroke={gridColor} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: gridColor, opacity: 0.3 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {spec.data.map((row, i) => (
                <Cell key={row.label} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  };

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {body()}
      </ResponsiveContainer>
    </div>
  );
}
