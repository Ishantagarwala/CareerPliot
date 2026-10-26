import type { Metadata } from "next";
import { Suspense } from "react";
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

import Link from "next/link";
import BrandLogo from "@/components/layout/BrandLogo";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background py-12 px-4 transition-colors">
      <Link href="/" className="mb-8 flex items-center gap-2.5 group">
        <BrandLogo size="md" className="rounded-xl shadow-[3px_3px_0_0_#000] group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-all" />
        <span className="font-display text-2xl font-black text-foreground uppercase tracking-tight">
          Career<span className="text-secondary dark:text-primary">Pilot</span>
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-md animate-fade-in-up overflow-visible">
        <Suspense fallback={
          <div className="w-full max-w-md bg-card border-3 border-black rounded-2xl p-8 text-center font-mono text-xs font-bold text-muted-foreground neo-shadow">
            Loading student portal...
          </div>
        }>
          <LoginForm demoEnabled={isDemoLoginEnabled()} />
        </Suspense>
      </div>
    </div>
  );
}
