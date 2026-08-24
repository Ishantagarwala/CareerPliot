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

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background py-12 px-4">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up overflow-visible">
        <Suspense fallback={
          <div className="w-full max-w-md bg-card border border-border p-6 text-center text-muted-foreground">
            Loading form...
          </div>
        }>
          <LoginForm demoEnabled={isDemoLoginEnabled()} />
        </Suspense>
      </div>
    </div>
  );
}
