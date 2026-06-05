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

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address format" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to register account.");
        return;
      }

      toast.success("Account registered successfully! Logging you in...");

      const loginRes = await signIn("credentials", {
        email: values.email,
        password: values.password,
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
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { id: "name", label: "Full Name", type: "text", placeholder: "John Doe", error: errors.name },
    { id: "email", label: "Email", type: "email", placeholder: "name@example.com", error: errors.email },
    { id: "password", label: "Password", type: "password", placeholder: "••••••••", error: errors.password },
    { id: "confirmPassword", label: "Confirm Password", type: "password", placeholder: "••••••••", error: errors.confirmPassword },
  ] as const;

  return (
    <div className="w-full max-w-md bg-[#1A1A1A] border border-[#262626] overflow-hidden">
      <div className="p-6 border-b border-[#262626] text-center space-y-2">
        <h1
          className="text-2xl font-bold text-white tracking-tight"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          Create an Account
        </h1>
        <p className="text-sm text-[#8e9192]">
          Enter your details below to set up your Career Pilot profile
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-6 space-y-4">
          {fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <label
                htmlFor={field.id}
                className="text-[11px] text-[#8e9192] uppercase tracking-[0.1em] font-medium block"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {field.label}
              </label>
              <input
                id={field.id}
                type={field.type}
                placeholder={field.placeholder}
                {...register(field.id)}
                className={`w-full border bg-[#131313] px-3 py-2 text-sm text-white placeholder:text-[#636565] focus:border-white focus:ring-0 focus:outline-none transition-colors ${
                  field.error ? "border-[#ffb4ab]" : "border-[#262626]"
                }`}
              />
              {field.error && (
                <p className="text-xs text-[#ffb4ab] mt-1">{field.error.message}</p>
              )}
            </div>
          ))}
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
                Registering...
              </>
            ) : (
              <>
                Create Account
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </>
            )}
          </button>
          <div className="text-sm text-center text-[#8e9192]">
            Already have an account?{" "}
            <Link href="/login" className="text-white font-medium hover:underline">
              Log In
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
