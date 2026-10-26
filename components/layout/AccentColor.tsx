"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

export const ACCENT_STORAGE_KEY = "cp-accent";
export const DEFAULT_ACCENT = "#baf700"; // Signature Neo-Brutalist Green (R: 186, G: 247, B: 0)

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

/**
 * Returns `[h, s, l]` for a `#rrggbb` string. Invalid input yields null so
 * callers can fall back instead of emitting `NaN` into a CSS variable.
 */
function hexToHsl(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return null;
  const r = Number.parseInt(h.slice(0, 2), 16) / 255;
  const g = Number.parseInt(h.slice(2, 4), 16) / 255;
  const b = Number.parseInt(h.slice(4, 6), 16) / 255;
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, l * 100];

  const s = delta / (1 - Math.abs(2 * l - 1));
  let hue: number;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;

  return [hue, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const huePrime = (((h % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const [r1, g1, b1] =
    huePrime < 1
      ? [chroma, x, 0]
      : huePrime < 2
        ? [x, chroma, 0]
        : huePrime < 3
          ? [0, chroma, x]
          : huePrime < 4
            ? [0, x, chroma]
            : huePrime < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const m = light - chroma / 2;
  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

/**
 * Hue-shifted companion for gradients and glows.
 */
function deriveCompanion(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const [h, s, l] = hsl;
  return hslToHex(h - 11, Math.min(100, s * 1.05), Math.min(82, l + 5));
}

const ACCENT_COMPANIONS: Record<string, string> = {
  "#baf700": "#5eead4", // lime -> mint
  "#baf600": "#5eead4",
};

/** Resolves the secondary accent used by hub gradients and glows. */
export function companionAccent(hex: string): string {
  return ACCENT_COMPANIONS[hex.toLowerCase()] || deriveCompanion(hex);
}

export function applyAccent(hex: string = DEFAULT_ACCENT) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const targetHex = DEFAULT_ACCENT;
  const fg = contrastForeground(targetHex);
  root.style.setProperty("--primary", targetHex);
  root.style.setProperty("--primary-foreground", fg);
  root.style.setProperty("--lime", targetHex);
  root.style.setProperty("--lime-dim", dimHex(targetHex));
  root.style.setProperty("--sidebar-primary", targetHex);
  root.style.setProperty("--sidebar-primary-foreground", fg);
  root.style.setProperty("--chart-1", targetHex);
  root.style.setProperty("--ring", dimHex(targetHex, 0.35));
  root.style.setProperty("--hub-accent", targetHex);
  root.style.setProperty("--hub-accent-2", companionAccent(targetHex));
}

/** Enforces the fixed signature green accent across the entire app. */
export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      localStorage.removeItem(ACCENT_STORAGE_KEY);
      applyAccent(DEFAULT_ACCENT);
    } catch {
      /* ignore */
    }
  }, []);

  return <>{children}</>;
}

/** Accent color is permanently fixed to R: 186, G: 247, B: 0 (#baf700). Picker is disabled. */
export function AccentColorPicker(_props?: { className?: string }) {
  return null;
}
