"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          theme?: "dark" | "light" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
          size?: "normal" | "compact" | "flexible";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";

/** Invisible for real users; only challenges when Cloudflare suspects a bot */
const APPEARANCE =
  (process.env.NEXT_PUBLIC_TURNSTILE_APPEARANCE?.trim() as
    | "always"
    | "execute"
    | "interaction-only"
    | undefined) || "interaction-only";

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
  className?: string;
  appearance?: "always" | "execute" | "interaction-only";
}

export function isTurnstileEnabled(): boolean {
  return Boolean(SITE_KEY);
}

function loadTurnstile(onReady: () => void) {
  if (typeof window === "undefined") return;

  if (window.turnstile) {
    onReady();
    return;
  }

  const prev = window.onTurnstileLoad;
  window.onTurnstileLoad = () => {
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
      "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
    script.async = true;
    document.head.appendChild(script);
  }

  // Script may already be present (preloaded) without our onload — poll briefly.
  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    if (window.turnstile) {
      window.clearInterval(timer);
      onReady();
    } else if (tries > 40) {
      window.clearInterval(timer);
    }
  }, 100);
}

export default function TurnstileWidget({
  onToken,
  className,
  appearance = APPEARANCE,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const renderedRef = useRef(false);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      // Avoid double-render (React Strict Mode / poll + onload)
      if (renderedRef.current && widgetIdRef.current) return;

      try {
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      } catch {
        /* ignore */
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: "auto",
        appearance,
        size: "flexible",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
      });
      renderedRef.current = true;
    };

    loadTurnstile(renderWidget);

    return () => {
      cancelled = true;
      renderedRef.current = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, [appearance]);

  if (!SITE_KEY) return null;

  // Keep a mount point; interaction-only stays visually quiet unless CF challenges.
  return <div ref={containerRef} className={className} style={{ minHeight: 1 }} />;
}

export function resetTurnstile(): void {
  if (typeof window !== "undefined" && window.turnstile) {
    try {
      window.turnstile.reset();
    } catch {
      /* ignore */
    }
  }
}
