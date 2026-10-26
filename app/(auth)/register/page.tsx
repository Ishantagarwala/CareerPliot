import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Create Free Account",
  description:
    "Join Career Pilot free — get AI career discovery, personalized learning roadmaps, course recommendations, and 24/7 tutoring.",
  path: "/register",
  index: false,
});

import Link from "next/link";
import BrandLogo from "@/components/layout/BrandLogo";

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background py-12 px-4 transition-colors">
      <Link href="/" className="mb-8 flex items-center gap-2.5 group">
        <BrandLogo size="md" className="rounded-xl shadow-[3px_3px_0_0_#000] group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-all" />
        <span className="font-display text-2xl font-black text-foreground uppercase tracking-tight">
          Career<span className="text-secondary dark:text-primary">Pilot</span>
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-md animate-fade-in-up overflow-visible">
        <RegisterForm />
      </div>
    </div>
  );
}
