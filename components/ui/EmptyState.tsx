"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export default function EmptyState({
  icon = "inbox",
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  onPrimaryClick,
  onSecondaryClick,
  className,
  children,
}: EmptyStateProps) {
  const primaryClass =
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]";
  const secondaryClass =
    "inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted";

  return (
    <div
      className={cn(
        "mx-auto flex max-w-xl animate-fade-in-up flex-col items-center justify-center space-y-5 rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center sm:p-12",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>
      <div className="max-w-md space-y-2">
        <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {(primaryLabel || secondaryLabel || children) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {primaryLabel && primaryHref && (
            <Link href={primaryHref} className={`${primaryClass} group`}>
              {primaryLabel}
              <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </Link>
          )}
          {primaryLabel && onPrimaryClick && !primaryHref && (
            <button
              type="button"
              onClick={onPrimaryClick}
              className={primaryClass}
            >
              {primaryLabel}
            </button>
          )}
          {secondaryLabel && secondaryHref && (
            <Link href={secondaryHref} className={secondaryClass}>
              {secondaryLabel}
            </Link>
          )}
          {secondaryLabel && onSecondaryClick && !secondaryHref && (
            <button
              type="button"
              onClick={onSecondaryClick}
              className={secondaryClass}
            >
              {secondaryLabel}
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
