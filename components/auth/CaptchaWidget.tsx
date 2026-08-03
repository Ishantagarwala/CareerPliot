"use client";

import { useEffect, useState } from "react";
import HCaptchaWidget, {
  isHCaptchaEnabled,
  resetHCaptcha,
} from "@/components/auth/HCaptchaWidget";

interface CaptchaWidgetProps {
  onToken: (token: string | null) => void;
  className?: string;
}

/** After mount — avoids SSR/localhost mismatch. */
export function useCaptchaRequired(): boolean {
  const [required, setRequired] = useState(false);
  useEffect(() => {
    setRequired(isHCaptchaEnabled());
  }, []);
  return required;
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
