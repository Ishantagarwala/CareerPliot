"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import CaptchaWidget, {
  resetCaptcha,
  useCaptchaRequired,
} from "@/components/auth/CaptchaWidget";
import { demoSignInAction } from "@/app/(auth)/login/actions";

const loginSchema = z.object({
  email: z
    .string()
    .email({ message: "Invalid email address format" })
    .refine(
      (v) =>
        v.toLowerCase().trim() === "demo@careerpilot.com" ||
        /^[^\s@]+@(gmail\.com|googlemail\.com|icloud\.com|me\.com|mac\.com|(yahoo|ymail|rocketmail|outlook|hotmail|live|msn)(\.[a-z]{2,})+)$/i.test(
          v.trim()
        ),
      { message: "Use a Gmail, iCloud, Yahoo, or Outlook/Hotmail email." }
    ),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm({ demoEnabled = true }: { demoEnabled?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoStep, setDemoStep] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const demoStarted = useRef(false);
  const captchaRequired = useCaptchaRequired();

  const handleDemoLogin = async () => {
    if (demoLoading) return;
    setDemoLoading(true);
    setDemoStep("Signing in...");
    try {
      const demoAuth = await demoSignInAction();
      if (!demoAuth.ok) {
        throw new Error(demoAuth.message);
      }

      setDemoStep("Seeding demo data...");
      // Brief pause: let Next.js flush the session cookie before we call /api/seed,
      // which checks auth() server-side. Without this, the cookie may not be set yet.
      await new Promise((resolve) => setTimeout(resolve, 600));
      // Seed via POST so we stay in-app (GET /api/seed was dumping JSON in the browser).
      // Use a 30s timeout so the spinner never hangs indefinitely on a DB connection failure.
      const seedAbort = new AbortController();
      const seedTimeout = setTimeout(() => seedAbort.abort(), 30_000);
      let seedRes: Response;
      try {
        seedRes = await fetch("/api/seed", { method: "POST", signal: seedAbort.signal });
      } catch (fetchErr) {
        if ((fetchErr as Error).name === "AbortError") {
          throw new Error("Demo setup timed out. MongoDB may be unreachable — check your MONGODB_URI in .env.");
        }
        throw fetchErr;
      } finally {
        clearTimeout(seedTimeout);
      }
      if (!seedRes.ok && seedRes.status !== 200) {
        const body = await seedRes.json().catch(() => ({}));
        // Already seeded is fine — treat as success via status 200 above.
        if (seedRes.status !== 401) {
          console.warn("Seed warning:", body);
        } else {
          throw new Error(body.message || "Session not ready for seeding.");
        }
      }

      toast.success("Demo ready — welcome aboard!");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during demo setup.";
      toast.error(message);
      setDemoLoading(false);
      setDemoStep("");
      demoStarted.current = false;
    }
  };

  useEffect(() => {
    if (!demoEnabled || searchParams?.get("demo") !== "true" || demoStarted.current) return;
    demoStarted.current = true;
    // Drop the query param without remounting mid-login.
    router.replace("/login", { scroll: false });
    void handleDemoLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (captchaRequired && !captchaToken) {
      toast.error("Please complete the bot verification challenge.");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: values.email,
        password: values.password,
        captchaToken: captchaToken || "",
        loginTicket: "",
        redirect: false,
      });

      if (res?.error) {
        const code = (res as { code?: string }).code || "";
        if (code === "email_provider") {
          toast.error("Use a Gmail, iCloud, Yahoo, or Outlook/Hotmail email.");
        } else if (code === "network_blocked") {
          toast.error(
            "VPNs and datacenter IPs are blocked. Disconnect VPN and try again."
          );
        } else {
          toast.error("Invalid credentials or bot verification failed. Please try again.");
        }
        resetCaptcha();
        setCaptchaToken(null);
      } else {
        toast.success("Successfully logged in!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred. Please try again.");
      resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  if (demoLoading) {
    return (
      <div className="w-full max-w-md bg-card border-3 border-black dark:border-[#383d45] rounded-2xl neo-shadow p-8 text-center space-y-6 animate-fade-in-up">
        <div className="flex flex-col items-center justify-center space-y-5 py-6">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-20 w-20 rounded-2xl bg-secondary/20 animate-ping" />
            <div className="h-16 w-16 bg-secondary text-white border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000] flex items-center justify-center animate-bounce">
              <span className="material-symbols-outlined text-3xl text-primary">bolt</span>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-display font-black text-foreground uppercase tracking-tight">
              Initializing Demo Session
            </h3>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-black/20 dark:border-white/20 rounded-md font-mono text-xs font-bold text-secondary dark:text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{demoStep}</span>
            </div>
          </div>
        </div>
        <div className="text-xs font-mono font-bold text-muted-foreground border-t-2 border-black/10 dark:border-white/10 pt-4">
          Configuring student profile, roadmap progress, and mock tests...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-card border-3 border-black dark:border-[#383d45] rounded-2xl neo-shadow overflow-hidden">
      <div className="p-6 sm:p-8 border-b-2 border-black dark:border-[#383d45] text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-display font-black text-foreground uppercase tracking-tight">
          Welcome Back
        </h1>
        <p className="text-sm font-sans text-muted-foreground">
          Enter your credentials to access your student workspace
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-6 sm:p-8 space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider block"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="student@example.com"
              {...register("email")}
              className={`w-full border-2 bg-background px-4 py-3 rounded-xl text-sm font-sans text-foreground placeholder:text-muted-foreground focus:border-black focus:ring-2 focus:ring-primary focus:outline-none transition-all ${
                errors.email ? "border-destructive" : "border-black dark:border-[#383d45]"
              }`}
            />
            {errors.email && (
              <p className="text-xs font-mono text-destructive font-bold mt-1">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider block"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              className={`w-full border-2 bg-background px-4 py-3 rounded-xl text-sm font-sans text-foreground placeholder:text-muted-foreground focus:border-black focus:ring-2 focus:ring-primary focus:outline-none transition-all ${
                errors.password ? "border-destructive" : "border-black dark:border-[#383d45]"
              }`}
            />
            {errors.password && (
              <p className="text-xs font-mono text-destructive font-bold mt-1">{errors.password.message}</p>
            )}
          </div>
        </div>
        <div className="p-6 sm:p-8 pt-0 space-y-4">
          {captchaRequired && (
            <CaptchaWidget onToken={setCaptchaToken} className="flex justify-center" />
          )}
          <button
            type="submit"
            disabled={loading || (captchaRequired && !captchaToken)}
            className="w-full py-3.5 bg-primary text-black border-2 border-black font-mono font-black text-sm uppercase rounded-xl shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : captchaRequired && !captchaToken ? (
              <>Complete challenge to continue</>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>

          {demoEnabled && (
            <>
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t-2 border-black/10 dark:border-white/10"></div>
                <span className="flex-shrink mx-4 text-xs font-mono font-black text-muted-foreground uppercase tracking-wider">or explore first</span>
                <div className="flex-grow border-t-2 border-black/10 dark:border-white/10"></div>
              </div>

              <button
                type="button"
                onClick={handleDemoLogin}
                id="instant-demo-login-btn"
                className="w-full py-3.5 border-2 border-black bg-secondary hover:bg-secondary/90 text-white font-mono font-black text-xs uppercase tracking-wider rounded-xl shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg text-primary">bolt</span>
                <span>Instant Demo Login (1-Click Access)</span>
              </button>
            </>
          )}

          <div className="text-xs font-mono font-bold text-center text-muted-foreground pt-3">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-secondary dark:text-primary underline font-black">
              Register Free
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
