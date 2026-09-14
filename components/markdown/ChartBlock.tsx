"use client";

import React, { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon } from "lucide-react";

/**
 * Renders a ```chart JSON block as a real chart.
 *
 * Recharts is imported lazily so it never lands in the initial bundle, and the
 * JSON contract (rather than a new markdown plugin) keeps this optional: if the
 * block is not valid chart data we render nothing and the caller falls back to
 * showing it as code.
 *
 * Expected shape:
 *   { "type": "bar" | "line" | "pie" | "area",
 *     "title": "optional",
 *     "data": [ { "label": "2024", "value": 12 }, ... ] }
 */

export interface ChartSpec {
  type: "bar" | "line" | "pie" | "area";
  title?: string;
  data: Array<{ label: string; value: number }>;
}

/** Parses a chart block, returning null when it isn't usable chart data. */
export function parseChartSpec(raw: string): ChartSpec | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const type = String(obj.type ?? "bar").toLowerCase();
  if (!["bar", "line", "pie", "area"].includes(type)) return null;
  if (!Array.isArray(obj.data)) return null;

  const data = obj.data
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const label = r.label ?? r.name ?? r.x;
      const value = r.value ?? r.y;
      const numeric =
        typeof value === "number" ? value : Number.parseFloat(String(value));
      if (label === undefined || !Number.isFinite(numeric)) return null;
      return { label: String(label).slice(0, 40), value: numeric };
    })
    .filter((r): r is { label: string; value: number } => r !== null)
    .slice(0, 24);

  if (data.length < 2) return null;
  return {
    type: type as ChartSpec["type"],
    title: typeof obj.title === "string" ? obj.title.slice(0, 120) : undefined,
    data,
  };
}

export default function ChartBlock({ spec }: { spec: ChartSpec }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [Charts, setCharts] = useState<React.ComponentType<{
    spec: ChartSpec;
    isDark: boolean;
    textColor: string;
    gridColor: string;
  }> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void import("./ChartRender").then((m) => {
      if (!cancelled) setCharts(() => m.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const Icon = useMemo(
    () =>
      spec.type === "pie" ? PieIcon : spec.type === "line" ? LineIcon : BarChart3,
    [spec.type]
  );

  const textColor = isDark ? "#9198a4" : "#6b7280";
  const gridColor = isDark ? "#262a32" : "#e6e8ee";

  return (
    <figure className="my-4 overflow-hidden rounded-lg border border-hub-line bg-hub-surface">
      <figcaption className="flex items-center gap-1.5 border-b border-hub-line px-3 py-2 text-[11px] font-medium tracking-wide text-hub-muted uppercase">
        <Icon size={12} aria-hidden />
        {spec.title || `${spec.type} chart`}
      </figcaption>
      <div className="px-2 py-4">
        {Charts ? (
          <Charts
            spec={spec}
            isDark={isDark}
            textColor={textColor}
            gridColor={gridColor}
          />
        ) : (
          <div className="flex h-[240px] items-center justify-center text-[12px] text-hub-muted">
            Rendering chart…
          </div>
        )}
      </div>
      {/* Accessible fallback: the numbers are the content, the chart is a view. */}
      <table className="sr-only">
        <caption>{spec.title || "Chart data"}</caption>
        <tbody>
          {spec.data.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
