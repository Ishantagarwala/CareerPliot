import type { Metadata } from "next";
import Link from "next/link";
import RegisterForm from "@/components/auth/RegisterForm";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Create Free Account",
  description:
    "Join Career Pilot free — get AI career discovery, personalized learning roadmaps, course recommendations, and 24/7 tutoring.",
  path: "/register",
  index: false,
});

export default function RegisterPage() {
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
        <RegisterForm />
      </div>
    </div>
  );
}
