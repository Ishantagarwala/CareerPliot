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
    "inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-2.5 hover:bg-primary/90 transition-all text-xs shadow-sm";
  const secondaryClass =
    "inline-flex items-center justify-center rounded-lg border border-border bg-background text-foreground font-semibold px-4 py-2 hover:bg-muted transition-all text-xs";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center border border-border bg-card p-12 space-y-5 shadow-sm max-w-xl mx-auto animate-fade-in-up",
        className
      )}
    >
      <div className="h-14 w-14 border border-border flex items-center justify-center text-foreground bg-card">
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>
      <div className="space-y-2 max-w-md">
        <h3
          className="font-bold text-lg text-foreground"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {(primaryLabel || secondaryLabel || children) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {primaryLabel && primaryHref && (
            <Link
              href={primaryHref}
              className={primaryClass}
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
            >
              {primaryLabel}
              <span className="material-symbols-outlined text-[16px] ml-1.5 group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </Link>
          )}
          {primaryLabel && onPrimaryClick && !primaryHref && (
            <button
              type="button"
              onClick={onPrimaryClick}
              className={primaryClass}
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
            >
              {primaryLabel}
            </button>
          )}
          {secondaryLabel && secondaryHref && (
            <Link
              href={secondaryHref}
              className={secondaryClass}
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
            >
              {secondaryLabel}
            </Link>
          )}
          {secondaryLabel && onSecondaryClick && !secondaryHref && (
            <button
              type="button"
              onClick={onSecondaryClick}
              className={secondaryClass}
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
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
