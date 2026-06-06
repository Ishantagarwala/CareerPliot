import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0A0A0A] py-12 px-4">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <Suspense fallback={
          <div className="w-full max-w-md bg-[#1A1A1A] border border-[#262626] p-6 text-center text-[#8e9192]">
            Loading form...
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
