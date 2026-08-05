import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Create Free Account",
  description:
    "Join Career Pilot free — get AI career discovery, personalized learning roadmaps, course recommendations, and 24/7 tutoring.",
  path: "/register",
});

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background py-12 px-4">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up overflow-visible">
        <RegisterForm />
      </div>
    </div>
  );
}
