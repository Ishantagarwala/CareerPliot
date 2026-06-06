"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address format" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoStep, setDemoStep] = useState("");

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setDemoStep("Creating demo account...");
    try {
      // 1. Try to register demo user. If user already exists, it will throw a 400, which we can ignore.
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Demo Student",
          email: "demo@careerpilot.com",
          password: "demo1234",
        }),
      });

      setDemoStep("Signing in...");
      // 2. Perform sign in
      const res = await signIn("credentials", {
        email: "demo@careerpilot.com",
        password: "demo1234",
        redirect: false,
      });

      if (res?.error) {
        toast.error("Failed to sign in as demo user. Please try again.");
        setDemoLoading(false);
        setDemoStep("");
        return;
      }

      setDemoStep("Seeding demo data...");
      toast.success("Successfully logged in! Seeding demo data...");

      // 3. Redirect to seed endpoint
      window.location.href = "/api/seed";
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred during demo setup.");
      setDemoLoading(false);
      setDemoStep("");
    }
  };

  useEffect(() => {
    if (searchParams && searchParams.get("demo") === "true") {
      router.replace("/login");
      handleDemoLogin();
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (res?.error) {
        toast.error("Invalid credentials, please check your email and password.");
      } else {
        toast.success("Successfully logged in!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (demoLoading) {
    return (
      <div className="w-full max-w-md bg-[#1A1A1A] border border-[#262626] p-8 text-center space-y-6 animate-fade-in-up">
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="relative flex items-center justify-center">
            {/* Pulsing animated outer ring */}
            <span className="absolute inline-flex h-16 w-16 rounded-full bg-indigo-500/10 animate-ping" />
            <div className="h-16 w-16 border-t-2 border-indigo-500 rounded-full animate-spin flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-400 text-2xl animate-pulse">bolt</span>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
              Initializing Demo Session
            </h3>
            <p className="text-sm text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {demoStep}
            </p>
          </div>
        </div>
        <div className="text-xs text-[#636565] border-t border-[#262626] pt-4">
          This will take a moment to configure your custom AI roadmaps.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-[#1A1A1A] border border-[#262626] overflow-hidden">
      <div className="p-6 border-b border-[#262626] text-center space-y-2">
        <h1
          className="text-2xl font-bold text-white tracking-tight"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          Sign In
        </h1>
        <p className="text-sm text-[#8e9192]">
          Enter your email and password to log into your account
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-[11px] text-[#8e9192] uppercase tracking-[0.1em] font-medium block"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              {...register("email")}
              className={`w-full border bg-[#131313] px-3 py-2 text-sm text-white placeholder:text-[#636565] focus:border-white focus:ring-0 focus:outline-none transition-colors ${
                errors.email ? "border-[#ffb4ab]" : "border-[#262626]"
              }`}
            />
            {errors.email && (
              <p className="text-xs text-[#ffb4ab] mt-1">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-[11px] text-[#8e9192] uppercase tracking-[0.1em] font-medium block"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              className={`w-full border bg-[#131313] px-3 py-2 text-sm text-white placeholder:text-[#636565] focus:border-white focus:ring-0 focus:outline-none transition-colors ${
                errors.password ? "border-[#ffb4ab]" : "border-[#262626]"
              }`}
            />
            {errors.password && (
              <p className="text-xs text-[#ffb4ab] mt-1">{errors.password.message}</p>
            )}
          </div>
        </div>
        <div className="p-6 pt-0 space-y-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-white text-[#0A0A0A] font-bold text-xs hover:bg-[#e2e2e2] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                Log In
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </>
            )}
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#262626]"></div>
            <span className="flex-shrink mx-4 text-[10px] text-[#636565] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>or</span>
            <div className="flex-grow border-t border-[#262626]"></div>
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full py-2.5 border border-indigo-500/30 text-indigo-400 font-bold text-xs hover:bg-indigo-500/10 hover:border-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2"
            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
          >
            Try Demo Login
            <span className="material-symbols-outlined text-[16px]">bolt</span>
          </button>

          <div className="text-sm text-center text-[#8e9192] pt-2">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-white font-medium hover:underline">
              Sign Up
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
