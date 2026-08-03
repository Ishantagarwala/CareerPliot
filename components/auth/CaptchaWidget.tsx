"use client";

import { useEffect, useState } from "react";
import HCaptchaWidget, {
  hasHCaptchaSiteKey,
  isHCaptchaEnabled,
  isLocalDevHost,
  resetHCaptcha,
} from "@/components/auth/HCaptchaWidget";

interface CaptchaWidgetProps {
  onToken: (token: string | null) => void;
  className?: string;
}

/**
 * Client-safe captcha gate. Returns false on localhost (hCaptcha cannot run there)
 * and until we know the hostname after mount (avoids SSR mismatch).
 */
export function useCaptchaRequired(): boolean {
  const [required, setRequired] = useState(false);

  useEffect(() => {
    setRequired(isHCaptchaEnabled());
  }, []);

  return required;
}

export function isCaptchaEnabled(): boolean {
  return hasHCaptchaSiteKey() && !isLocalDevHost();
}

export default function CaptchaWidget({
  onToken,
  className,
}: CaptchaWidgetProps) {
  if (!isHCaptchaEnabled()) return null;
  return <HCaptchaWidget onToken={onToken} className={className} />;
}

export function resetCaptcha(): void {
  resetHCaptcha();
}
