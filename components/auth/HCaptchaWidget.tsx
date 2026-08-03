"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    hcaptcha?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          theme?: "dark" | "light";
          size?: "normal" | "compact" | "invisible";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (error?: string) => void;
          "chalexpired-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onHCaptchaLoad?: () => void;
  }
}

const SCRIPT_ID = "hcaptcha-script";
const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim() || "";

function flagTrue(value: string | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

interface HCaptchaWidgetProps {
  onToken: (token: string | null) => void;
  className?: string;
}

/** hCaptcha rejects localhost / 127.0.0.1 — do not require the widget there. */
export function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local")
  );
}

export function hasHCaptchaSiteKey(): boolean {
  return Boolean(SITE_KEY);
}

/** Captcha UI + client gate — only when explicitly enforced. */
export function isHCaptchaEnabled(): boolean {
  if (!flagTrue(process.env.NEXT_PUBLIC_HCAPTCHA_ENFORCE)) return false;
  return hasHCaptchaSiteKey() && !isLocalDevHost();
}

function loadHCaptcha(onReady: () => void) {
  if (typeof window === "undefined") return;

  if (window.hcaptcha) {
    onReady();
    return;
  }

  const prev = window.onHCaptchaLoad;
  window.onHCaptchaLoad = () => {
    try {
      prev?.();
    } catch {
      /* ignore */
    }
    onReady();
  };

  let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src =
      "https://js.hcaptcha.com/1/api.js?onload=onHCaptchaLoad&render=explicit";
    script.async = true;
    document.head.appendChild(script);
  }

  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    if (window.hcaptcha) {
      window.clearInterval(timer);
      onReady();
    } else if (tries > 50) {
      window.clearInterval(timer);
    }
  }, 100);
}

export default function HCaptchaWidget({
  onToken,
  className,
}: HCaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const renderedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!SITE_KEY || isLocalDevHost()) return;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.hcaptcha) return;
      if (renderedRef.current && widgetIdRef.current) return;

      try {
        if (widgetIdRef.current) {
          window.hcaptcha.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      } catch {
        /* ignore */
      }

      try {
        widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: "light",
          size: "normal",
          callback: (token) => {
            setError(null);
            onTokenRef.current(token);
          },
          "expired-callback": () => onTokenRef.current(null),
          "chalexpired-callback": () => onTokenRef.current(null),
          "error-callback": () => {
            onTokenRef.current(null);
            setError(
              "Verification failed (rate limit or network). Wait a few minutes, then refresh."
            );
          },
        });
        renderedRef.current = true;
      } catch (err) {
        console.error("[hCaptcha] render failed:", err);
        setError("Could not load verification. Refresh and try again.");
      }
    };

    loadHCaptcha(renderWidget);

    return () => {
      cancelled = true;
      renderedRef.current = false;
      if (widgetIdRef.current && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!SITE_KEY || isLocalDevHost()) return null;

  return (
    <div className={className}>
      <div ref={containerRef} className="min-h-[78px] overflow-visible" />
      {error && <p className="mt-2 text-xs text-[#ffb4ab]">{error}</p>}
    </div>
  );
}

export function resetHCaptcha(): void {
  if (typeof window !== "undefined" && window.hcaptcha) {
    try {
      window.hcaptcha.reset();
    } catch {
      /* ignore */
    }
  }
}
