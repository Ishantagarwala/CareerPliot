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
          "error-callback"?: () => void;
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

interface HCaptchaWidgetProps {
  onToken: (token: string | null) => void;
  className?: string;
}

function isLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export function hasHCaptchaSiteKey(): boolean {
  return Boolean(SITE_KEY);
}

/** Show/require captcha when site key is set and not on localhost. */
export function isHCaptchaEnabled(): boolean {
  return hasHCaptchaSiteKey() && !isLocalHost();
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
    if (!SITE_KEY || isLocalHost()) return;
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
            setError("Captcha failed to load. Refresh and try again.");
          },
        });
        renderedRef.current = true;
      } catch (err) {
        console.error("[hCaptcha] render failed:", err);
        setError("Could not load captcha. Refresh and try again.");
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

  if (!SITE_KEY || isLocalHost()) return null;

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
