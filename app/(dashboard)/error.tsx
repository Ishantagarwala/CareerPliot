"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard page error:", error);
  }, [error]);

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="max-w-md w-full p-8 border border-border bg-card rounded-2xl shadow-sm space-y-6">
        <div className="h-14 w-14 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mx-auto">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="font-heading text-xl font-bold text-foreground">Dashboard Module Error</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            There was an error loading this dashboard screen. This could be due to a network interruption or temporary API issue.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button onClick={() => reset()} className="font-semibold flex items-center justify-center gap-1.5" size="sm">
            <RefreshCcw className="h-4 w-4" /> Try Again
          </Button>
          <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm", className: "font-semibold flex items-center gap-1" })}>
            <Home className="h-4 w-4" /> Dashboard Home
          </Link>
        </div>
      </div>
    </div>
  );
}
