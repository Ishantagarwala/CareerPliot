"use client";

/**
 * Preloads the Turnstile script so auth forms can verify quietly
 * (interaction-only) without a visible checkbox for most users.
 */
import { useEffect } from "react";
import { isTurnstileEnabled } from "@/components/auth/TurnstileWidget";

const SCRIPT_ID = "cf-turnstile-script";

export default function CloudflareBotGuard() {
  useEffect(() => {
    if (!isTurnstileEnabled()) return;
    if (document.getElementById(SCRIPT_ID)) return;
    if (typeof window !== "undefined" && window.turnstile) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    // Must include onload so widgets waiting on onTurnstileLoad still fire
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return null;
}
