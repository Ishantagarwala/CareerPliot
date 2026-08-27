import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import { pageMetadata } from "@/lib/seo";
import { isDemoLoginEnabled } from "@/lib/captcha";

// DEMO_MODE is a runtime-only VPS setting. Without forcing dynamic rendering,
// Next.js bakes demoEnabled=false into the statically generated login page
// because .env.production is intentionally excluded from the Docker build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Log In",
  description:
    "Sign in to Career Pilot to access your AI career roadmap, courses, jobs, resume tools, and AI tutor.",
  path: "/login",
  index: false,
});

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(640px 360px at 50% -8%, var(--glow), transparent 65%)",
        }}
      />

      <div className="relative z-10 mb-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display text-lg font-bold uppercase tracking-tight text-foreground"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
            <span className="material-symbols-outlined text-[20px]">flight_takeoff</span>
          </span>
          Career Pilot
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Suspense
          fallback={
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
              Loading form...
            </div>
          }
        >
          <LoginForm demoEnabled={isDemoLoginEnabled()} />
        </Suspense>
      </div>
    </div>
  );
}
