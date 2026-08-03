"use client";

import { useEffect, useRef } from "react";

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

export function isHCaptchaEnabled(): boolean {
  return Boolean(SITE_KEY);
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
    } else if (tries > 40) {
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
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) return;
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

      widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: "dark",
        size: "normal",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
      });
      renderedRef.current = true;
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

  if (!SITE_KEY) return null;

  return <div ref={containerRef} className={className} />;
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
