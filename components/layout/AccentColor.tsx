"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

export const ACCENT_STORAGE_KEY = "cp-accent";
export const DEFAULT_ACCENT = "#baf600";

function contrastForeground(hex: string): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return "#151f00";
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#151f00" : "#ffffff";
}

function dimHex(hex: string, amount = 0.12): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return hex;
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const r = clamp(Number.parseInt(h.slice(0, 2), 16) * (1 - amount));
  const g = clamp(Number.parseInt(h.slice(2, 4), 16) * (1 - amount));
  const b = clamp(Number.parseInt(h.slice(4, 6), 16) * (1 - amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function applyAccent(hex: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const fg = contrastForeground(hex);
  root.style.setProperty("--primary", hex);
  root.style.setProperty("--primary-foreground", fg);
  root.style.setProperty("--lime", hex);
  root.style.setProperty("--lime-dim", dimHex(hex));
  root.style.setProperty("--sidebar-primary", hex);
  root.style.setProperty("--sidebar-primary-foreground", fg);
  root.style.setProperty("--chart-1", hex);
  root.style.setProperty("--ring", dimHex(hex, 0.35));
}

/** Applies saved accent on first paint (landing + dashboard). */
export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
      if (saved) applyAccent(saved);
    } catch {
      /* ignore */
    }
  }, []);

  return <>{children}</>;
}

/** Compact color picker for the dashboard top bar. */
export function AccentColorPicker({ className }: { className?: string }) {
  const id = useId();
  const [color, setColor] = useState(DEFAULT_ACCENT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
      if (saved) {
        setColor(saved);
        applyAccent(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onChange = (value: string) => {
    setColor(value);
    applyAccent(value);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  };

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-10 w-10 border-2 border-black bg-primary shrink-0",
          className
        )}
        aria-hidden
      />
    );
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        "relative flex h-10 w-10 cursor-pointer items-center justify-center border-2 border-black bg-card hover:bg-muted transition-colors shrink-0",
        className
      )}
      title="Accent color"
      aria-label="Pick accent color"
    >
      <span
        className="h-5 w-5 border-2 border-black"
        style={{ backgroundColor: color }}
      />
      <input
        id={id}
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}
