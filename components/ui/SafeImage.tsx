"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { companyAvatarDataUrl, normalizeImageUrl } from "@/lib/imageUrl";

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  /** Used to build an initials fallback when src fails or is empty. */
  fallbackName?: string;
  referrerPolicy?: ImgHTMLAttributes<HTMLImageElement>["referrerPolicy"];
}

/**
 * Renders an external image with hotlink-safe defaults and an initials fallback
 * when the remote URL 403s / 404s (common with Remotive logos).
 */
export default function SafeImage({
  src,
  alt,
  className,
  fallbackName,
  referrerPolicy = "no-referrer",
}: SafeImageProps) {
  const normalized = normalizeImageUrl(src);
  const fallback = companyAvatarDataUrl(fallbackName || alt || "?");
  const [current, setCurrent] = useState(normalized || fallback);
  const [failed, setFailed] = useState(!normalized);

  useEffect(() => {
    const next = normalizeImageUrl(src);
    setCurrent(next || fallback);
    setFailed(!next);
  }, [src, fallback]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={failed ? fallback : current}
      alt={alt}
      className={className}
      referrerPolicy={referrerPolicy}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (!failed) {
          setFailed(true);
          setCurrent(fallback);
        }
      }}
    />
  );
}
