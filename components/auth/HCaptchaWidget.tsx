"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

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
  const [error, setError] = useState<string | null>(null);
  const [renderKey, setRenderKey] = useState(0);
  const instanceId = useId();
  onTokenRef.current = onToken;

  const destroyWidget = useCallback(() => {
    if (widgetIdRef.current && window.hcaptcha) {
      try {
        window.hcaptcha.remove(widgetIdRef.current);
      } catch {
        /* ignore */
      }
      widgetIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!SITE_KEY || isLocalHost()) return;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.hcaptcha) return;
      destroyWidget();
      // Clear container so hCaptcha always mounts into a fresh node.
      containerRef.current.innerHTML = "";

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
              "hCaptcha error (often rate-limited). Wait a few minutes, then hit Retry."
            );
          },
        });
      } catch (err) {
        console.error("[hCaptcha] render failed:", err);
        setError("Could not load captcha. Tap Retry.");
      }
    };

    loadHCaptcha(renderWidget);

    return () => {
      cancelled = true;
      destroyWidget();
    };
  }, [destroyWidget, renderKey, instanceId]);

  const handleRetry = () => {
    onToken(null);
    setError(null);
    setRenderKey((k) => k + 1);
  };

  if (!SITE_KEY || isLocalHost()) return null;

  return (
    <div className={className}>
      <div ref={containerRef} className="min-h-[78px] overflow-visible" />
      {error && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-xs font-medium text-destructive">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="self-start text-xs font-bold underline text-foreground"
          >
            Retry captcha
          </button>
        </div>
      )}
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
