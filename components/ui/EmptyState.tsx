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
    "inline-flex items-center px-6 py-2.5 bg-primary text-primary-foreground border-2 border-black font-bold hover:opacity-90 transition-colors text-xs group shadow-[3px_3px_0_0_#000]";
  const secondaryClass =
    "inline-flex items-center px-4 py-2 border border-border text-foreground text-xs hover:border-foreground transition-colors";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center border-2 border-dashed border-border bg-card/40 py-16 px-8 space-y-5 animate-fade-in-up",
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
