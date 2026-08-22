"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { DEMO_ACCOUNT_EMAIL, isDemoLoginEnabled } from "@/lib/captcha";

const DEMO_PASSWORD = "demo1234";

function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

async function ensureDemoUser() {
  await dbConnect();
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  await User.findOneAndUpdate(
    { email: DEMO_ACCOUNT_EMAIL },
    {
      $set: {
        name: "Demo Student",
        email: DEMO_ACCOUNT_EMAIL,
        password,
        provider: "credentials",
      },
    },
    { upsert: true }
  );
}

export async function demoSignInAction(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  try {
    // Demo login bypasses captcha + IP-reputation checks, so it only exists
    // when explicitly enabled (DEMO_MODE=true). Never in default prod config.
    if (!isDemoLoginEnabled()) {
      return { ok: false, message: "Demo login is disabled on this server." };
    }

    await ensureDemoUser();
    await signIn("credentials", {
      email: DEMO_ACCOUNT_EMAIL,
      password: DEMO_PASSWORD,
      captchaToken: "",
      loginTicket: "",
      redirect: false,
    });
    return { ok: true };
  } catch (err) {
    if (isNextRedirect(err)) {
      return { ok: true };
    }
    if (err instanceof AuthError) {
      return { ok: false, message: "Demo sign-in failed. Please try again." };
    }
    console.error("demoSignInAction", err);
    return { ok: false, message: "Demo sign-in failed. Please try again." };
  }
}
