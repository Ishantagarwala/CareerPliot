import type { NextConfig } from "next";
import dns from "dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

const nextConfig: NextConfig = {
  async headers() {
    // Content-Security-Policy notes (keep in sync with frontend deps):
    // - script/style 'unsafe-inline': Next.js hydration + next-themes anti-FOUC
    //   inline scripts, React inline style attrs. Upgrading to nonce-based CSP
    //   requires forwarding a nonce through middleware — see Auth.js docs.
    // - fonts.googleapis/gstatic: Material Symbols (app/layout.tsx).
    // - hcaptcha origins (https://docs.hcaptcha.com/#content-security-policy-settings):
    //   widget script js.hcaptcha.com, challenge assets newassets.hcaptcha.com,
    //   api XHRs, badge images, challenge iframe. Missing these makes the
    //   login/register captcha silently never render.
    // - media-src data:: Sarvam TTS returns base64 WAV played via data: URL.
    // - img-src unsplash/lh3: news thumbnails and Google avatar images.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://hcaptcha.com https://*.hcaptcha.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://images.unsplash.com https://lh3.googleusercontent.com https://hcaptcha.com https://*.hcaptcha.com",
      "media-src 'self' data:",
      "connect-src 'self' https://api.hcaptcha.com https://hcaptcha.com https://*.hcaptcha.com",
      "frame-src https://hcaptcha.com https://*.hcaptcha.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // 6 months, no preload flag (don't submit until confident in HTTPS story)
          {
            key: "Strict-Transport-Security",
            value: "max-age=15552000",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Microphone intentionally NOT restricted — voice input feature.
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/tutor", destination: "/ai-hub", permanent: false },
      { source: "/pdf", destination: "/ai-hub", permanent: false },
      { source: "/study", destination: "/ai-hub", permanent: false },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["careerpilot.cc", "www.careerpilot.cc"],
    },
  },
  serverExternalPackages: ["pdfjs-dist", "pdf-parse"],
  outputFileTracingIncludes: {
    // pdf-parse v2 runs pdf.js. Two things load via bundler-opaque dynamic
    // requires that Next can't trace, so force them into the serverless trace:
    //  1. pdf.js's Node worker (legacy/build).
    //  2. @napi-rs/canvas — pdf.js `require()`s it at module load to polyfill
    //     globalThis.DOMMatrix. Without it the top-level `new DOMMatrix()` in
    //     pdf.mjs throws "DOMMatrix is not defined" and the module fails to load.
    //     Include the linux-x64-gnu native binary for the Vercel runtime.
    "/api/pdf/upload": ["./node_modules/{pdfjs-dist/legacy/build,@napi-rs/canvas,@napi-rs/canvas-linux-x64-gnu}/**"],
    "/api/ai-hub/upload": ["./node_modules/{pdfjs-dist/legacy/build,@napi-rs/canvas,@napi-rs/canvas-linux-x64-gnu}/**"],
    "/api/resume/ats-analyze": ["./node_modules/{pdfjs-dist/legacy/build,@napi-rs/canvas,@napi-rs/canvas-linux-x64-gnu}/**"],
  },
};

export default nextConfig;

// Only for local `next dev` with Cloudflare bindings — skip in Docker/CI production builds.
if (process.env.NODE_ENV !== "production") {
  void import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) => {
    initOpenNextCloudflareForDev();
  });
}

