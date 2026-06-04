"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 text-center">
      <div className="max-w-md w-full p-8 border border-border bg-card rounded-2xl shadow-xl space-y-6">
        <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mx-auto animate-bounce">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-black text-foreground">Something went wrong!</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            An unexpected error occurred. Please try resetting the view or returning back to the home page.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button onClick={() => reset()} className="font-semibold flex items-center justify-center gap-1.5">
            <RefreshCcw className="h-4 w-4" /> Reset View
          </Button>
          <Link href="/" className={buttonVariants({ variant: "outline", className: "font-semibold" })}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
