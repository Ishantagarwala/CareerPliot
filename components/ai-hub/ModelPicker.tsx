"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";

function getDisplayName(id: string): string {
  if (id === "primary") return "Auto";
  const slash = id.indexOf("/");
  const provider = slash === -1 ? "" : id.slice(0, slash);
  const mainName = slash === -1 ? id : id.slice(slash + 1);
  const pretty = mainName
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Include provider so similarly named models stay distinguishable
  return provider ? `${pretty} · ${provider}` : pretty;
}

interface ModelPickerProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  availableModels: string[];
  defaultModel?: string | null;
}

/**
 * Model selector. In the header it reads as a small bordered chip with the
 * gradient mark; inside the composer it drops the border entirely so the
 * action row stays quiet.
 *
 * Dismissal uses a document-level pointerdown listener rather than a
 * fixed-inset backdrop: an overlay would have to out-rank the header's
 * stacking context, and two pickers' backdrops would shadow each other.
 */
export default function ModelPicker({
  selectedModel,
  setSelectedModel,
  availableModels,
  defaultModel,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Deduplicate defensively by base model name
  const modelsList = (() => {
    const source =
      Array.isArray(availableModels) && availableModels.length > 0
        ? availableModels
        : ["primary"];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of source) {
      const base = id.includes("/") ? id.split("/").slice(1).join("/").toLowerCase() : id.toLowerCase();
      if (seen.has(base)) continue;
      seen.add(base);
      out.push(id);
    }
    return out;
  })();

  const label =
    selectedModel === "primary" || selectedModel === defaultModel
      ? "Auto"
      : getDisplayName(selectedModel);

  /** Close on outside pointerdown and on Escape. */
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

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium tracking-[-0.01em] text-hub-text transition-colors hover:bg-hub-soft"
        title="Choose a model"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <SlidersHorizontal
          size={14}
          strokeWidth={1.9}
          className="shrink-0 text-hub-muted"
          aria-hidden
        />
        <span className="max-w-[110px] truncate sm:max-w-[190px]">
          {label}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={`shrink-0 text-hub-muted transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Model"
          className="absolute top-full left-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-hub-line bg-hub-surface shadow-[var(--shadow-pop)]"
        >
          <p className="border-b border-hub-line px-3 py-2 text-[11px] font-medium tracking-wide text-hub-muted uppercase">
            Model
          </p>
          <div className="max-h-72 overflow-y-auto p-1">
            {modelsList.map((id) => {
              const active = selectedModel === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setSelectedModel(id);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                    active
                      ? "bg-hub-soft font-medium text-hub-text"
                      : "text-hub-muted hover:bg-hub-soft/70 hover:text-hub-text"
                  }`}
                >
                  <span className="truncate">
                    {id === "primary" ? "Auto" : getDisplayName(id)}
                  </span>
                  {active && (
                    <Check
                      size={13}
                      className="shrink-0 text-[var(--primary)]"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
