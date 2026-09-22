"use client";

import { useEffect, useRef, useState } from "react";
import { Brain, Check, ChevronDown } from "lucide-react";
import {
  EFFORT_CHOICES,
  effortLabel,
  type ReasoningEffort,
} from "@/lib/reasoningEffort";

interface ReasoningEffortPickerProps {
  effort: ReasoningEffort;
  setEffort: (effort: ReasoningEffort) => void;
  /**
   * Models that do not reason ignore the setting, so the control says so rather
   * than pretending to have an effect.
   */
  disabled?: boolean;
}

/**
 * How hard the model should think before answering.
 *
 * Sits beside the model picker because the two are chosen together: the same
 * question can want `none` on a fast model and `max` on a deep one. Dismissal
 * matches the model picker — a document-level pointerdown rather than a
 * backdrop, so two open menus cannot shadow each other.
 */
export default function ReasoningEffortPicker({
  effort,
  setEffort,
  disabled = false,
}: ReasoningEffortPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const active = EFFORT_CHOICES.find((choice) => choice.value === effort);

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium tracking-[-0.01em] text-hub-text transition-colors hover:bg-hub-soft disabled:cursor-default disabled:opacity-50"
        title={disabled ? "Thinking effort applies to reasoning models" : "How hard the model should think"}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Brain size={14} strokeWidth={1.9} className="shrink-0 text-hub-muted" aria-hidden />
        <span className="max-w-[92px] truncate">{effortLabel(effort)}</span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={`shrink-0 text-hub-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Thinking effort"
          className="absolute top-full left-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-hub-line bg-hub-surface shadow-[var(--shadow-pop)]"
        >
          <p className="border-b border-hub-line px-3 py-2 text-[11px] font-medium tracking-wide text-hub-muted uppercase">
            Thinking effort
          </p>
          <div className="p-1">
            {EFFORT_CHOICES.map((choice) => {
              const isActive = choice.value === effort;
              return (
                <button
                  key={choice.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    setEffort(choice.value);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-start justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors ${
                    isActive
                      ? "bg-hub-soft text-hub-text"
                      : "text-hub-muted hover:bg-hub-soft/70 hover:text-hub-text"
                  }`}
                >
                  <span className="min-w-0">
                    <span className={`block text-[12.5px] ${isActive ? "font-medium" : ""}`}>
                      {choice.label}
                    </span>
                    <span className="block text-[11px] text-hub-muted">{choice.hint}</span>
                  </span>
                  {isActive && (
                    <Check size={13} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
          <p className="border-t border-hub-line px-3 py-2 text-[11px] leading-relaxed text-hub-muted">
            {active?.value === "none"
              ? "The model answers immediately. Fastest, least thorough."
              : "Higher effort takes longer and costs more tokens."}
          </p>
        </div>
      )}
    </div>
  );
}
