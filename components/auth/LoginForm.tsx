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

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address format" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
          <div className="text-sm text-center text-[#8e9192]">
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
