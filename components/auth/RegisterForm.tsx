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
    { id: "name", label: "Full Name", type: "text", placeholder: "John Doe", error: errors.name },
    { id: "email", label: "Email", type: "email", placeholder: "you@gmail.com", error: errors.email },
    { id: "password", label: "Password", type: "password", placeholder: "••••••••", error: errors.password },
    { id: "confirmPassword", label: "Confirm Password", type: "password", placeholder: "••••••••", error: errors.confirmPassword },
  ] as const;

  return (
    <div className="w-full max-w-md bg-card border-3 border-black dark:border-[#383d45] rounded-2xl neo-shadow overflow-hidden">
      <div className="p-6 sm:p-8 border-b-2 border-black dark:border-[#383d45] text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-display font-black text-foreground uppercase tracking-tight">
          Create Account
        </h1>
        <p className="text-sm font-sans text-muted-foreground">
          Sign up to initialize your custom AI career roadmaps
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="relative">
        <div className="p-6 sm:p-8 space-y-4">
          {fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <label
                htmlFor={field.id}
                className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider block"
              >
                {field.label}
              </label>
              <input
                id={field.id}
                type={field.type}
                placeholder={field.placeholder}
                {...register(field.id)}
                className={`w-full border-2 bg-background px-4 py-3 rounded-xl text-sm font-sans text-foreground placeholder:text-muted-foreground focus:border-black focus:ring-2 focus:ring-primary focus:outline-none transition-all ${
                  field.error ? "border-destructive" : "border-black dark:border-[#383d45]"
                }`}
              />
              {field.error && (
                <p className="text-xs font-mono text-destructive font-bold mt-1">{field.error.message}</p>
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
                Registering...
              </>
            ) : captchaRequired && !captchaToken ? (
              <>Complete challenge to continue</>
            ) : (
              <>
                <span>Create Free Account</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
          <div className="text-xs font-mono font-bold text-center text-muted-foreground pt-3">
            Already have an account?{" "}
            <Link href="/login" className="text-secondary dark:text-primary underline font-black">
              Sign In
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
