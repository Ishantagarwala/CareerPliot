"use client";

import HCaptchaWidget, {
  isHCaptchaEnabled,
  resetHCaptcha,
} from "@/components/auth/HCaptchaWidget";

interface CaptchaWidgetProps {
  onToken: (token: string | null) => void;
  className?: string;
}

export function isCaptchaEnabled(): boolean {
  return isHCaptchaEnabled();
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
