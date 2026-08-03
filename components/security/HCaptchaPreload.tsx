"use client";

/**
 * Preloads the hCaptcha script so auth forms render faster.
 */
import { useEffect } from "react";
import { isHCaptchaEnabled } from "@/components/auth/HCaptchaWidget";

const SCRIPT_ID = "hcaptcha-script";

export default function HCaptchaPreload() {
  useEffect(() => {
    if (!isHCaptchaEnabled()) return;
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
