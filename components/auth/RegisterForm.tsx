"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const ALLOWED_EMAIL_RE =
  /^[^\s@]+@(gmail\.com|googlemail\.com|icloud\.com|me\.com|mac\.com|(yahoo|ymail|rocketmail|outlook|hotmail|live|msn)(\.[a-z]{2,})+)$/i;

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z
    .string()
    .email({ message: "Invalid email address format" })
    .refine((v) => ALLOWED_EMAIL_RE.test(v.trim()), {
      message: "Use a Gmail, iCloud, Yahoo, or Outlook/Hotmail email.",
    }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string(),
  website: z.string().optional(), // honeypot
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRequired = useCaptchaRequired();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      website: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    if (captchaRequired && !captchaToken) {
      toast.error("Please complete the bot verification challenge.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          captchaToken,
          website: values.website,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to register account.");
        resetCaptcha();
        setCaptchaToken(null);
        return;
      }

      toast.success("Account registered successfully! Logging you in...");

      const loginRes = await signIn("credentials", {
        email: values.email,
        password: values.password,
        loginTicket: typeof data.loginTicket === "string" ? data.loginTicket : "",
        captchaToken: captchaToken || "",
        redirect: false,
      });

      if (loginRes?.error) {
        toast.error("Auto-login failed. Please go to the login page.");
        router.push("/login");
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

  const fields = [
    { id: "name", label: "Full name", type: "text", placeholder: "Aarav Sharma", autoComplete: "name", error: errors.name },
    { id: "email", label: "Email", type: "email", placeholder: "you@gmail.com", autoComplete: "email", error: errors.email },
    { id: "password", label: "Password", type: "password", placeholder: "8+ characters", autoComplete: "new-password", error: errors.password },
    { id: "confirmPassword", label: "Confirm password", type: "password", placeholder: "Repeat it", autoComplete: "new-password", error: errors.confirmPassword },
  ] as const;

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-lift ">
      <div className="space-y-2 border-b border-border p-7 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Free forever. Your roadmap is under a minute away.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="relative">
        <div className="space-y-4 p-7">
          {fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <label
                htmlFor={field.id}
                className="block text-[13px] font-medium text-foreground"
              >
                {field.label}
              </label>
              <input
                id={field.id}
                type={field.type}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                {...register(field.id)}
                className={`h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 ${
                  field.error ? "border-destructive" : "border-input"
                }`}
              />
              {field.error && (
                <p className="mt-1 text-xs text-destructive">{field.error.message}</p>
              )}
            </div>
          ))}

          {/* Honeypot — hidden from users, filled by many bots */}
          <div className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register("website")}
            />
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
                Creating account...
              </>
            ) : captchaRequired && !captchaToken ? (
              <>Complete verification to continue</>
            ) : (
              <>
                Create account
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Use a Gmail, iCloud, Yahoo, or Outlook email. VPNs and datacenter
            IPs are blocked to keep accounts safe.
          </p>
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
