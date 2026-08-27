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

export default function LoginForm({ demoEnabled = false }: { demoEnabled?: boolean }) {
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
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lift ">
        <div className="flex flex-col items-center justify-center space-y-5 py-8">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-primary/10" />
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/15 border-t-primary animate-cp-spin">
              <span className="material-symbols-outlined animate-cp-pulse text-2xl text-primary">bolt</span>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Initializing demo session
            </h3>
            <p className="text-sm text-muted-foreground">{demoStep}</p>
          </div>
        </div>
        <div className="border-t border-border pt-4 text-xs text-muted-foreground">
          This will take a moment to configure your custom AI roadmaps.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-lift ">
      <div className="space-y-2 border-b border-border p-7 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Log in to pick up where your roadmap left off.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4 p-7">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-[13px] font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@gmail.com"
              {...register("email")}
              className={`h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 ${
                errors.email ? "border-destructive" : "border-input"
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-[13px] font-medium text-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
              className={`h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 ${
                errors.password ? "border-destructive" : "border-input"
              }`}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-4 p-7 pt-0">
          {captchaRequired && (
            <CaptchaWidget onToken={setCaptchaToken} className="flex justify-center" />
          )}
          <button
            type="submit"
            disabled={loading || (captchaRequired && !captchaToken)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : captchaRequired && !captchaToken ? (
              <>Complete verification to continue</>
            ) : (
              <>
                Log in
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>

          {demoEnabled && (
            <>
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-border" />
                <span className="mx-4 flex-shrink text-[11px] uppercase tracking-wider text-muted-foreground">
                  or
                </span>
                <div className="flex-grow border-t border-border" />
              </div>

              <button
                type="button"
                onClick={handleDemoLogin}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/[0.06] text-sm font-semibold text-primary transition-colors hover:border-primary/60 hover:bg-primary/10"
              >
                Explore the demo
                <span className="material-symbols-outlined text-[18px]">bolt</span>
              </button>
            </>
          )}

          <div className="pt-2 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Sign up free
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
