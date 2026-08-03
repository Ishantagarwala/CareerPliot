"use client";

/**
 * Preloads the hCaptcha script on non-localhost hosts so auth forms render faster.
 */
import { useEffect } from "react";
import {
  hasHCaptchaSiteKey,
  isLocalDevHost,
} from "@/components/auth/HCaptchaWidget";

const SCRIPT_ID = "hcaptcha-script";

export default function HCaptchaPreload() {
  useEffect(() => {
    if (!hasHCaptchaSiteKey() || isLocalDevHost()) return;
    if (document.getElementById(SCRIPT_ID)) return;
    if (typeof window !== "undefined" && window.hcaptcha) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src =
      "https://js.hcaptcha.com/1/api.js?onload=onHCaptchaLoad&render=explicit";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return null;
}
