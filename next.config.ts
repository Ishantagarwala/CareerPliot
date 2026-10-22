import type { NextConfig } from "next";
import dns from "dns";
import { readdirSync } from "node:fs";
import path from "node:path";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

/**
 * ─── Split deployment: Vercel frontend + VPS API ────────────────────────────
 *
 * The app is one Next.js codebase, but it does not have to run in one place.
 * When `BACKEND_ORIGIN` is set (and we are actually on Vercel, or explicitly
 * opted in), every stateful API prefix is rewritten to the VPS:
 *
 *   browser → https://careerpilot.cc/api/flashcards
 *           → (Vercel rewrite) → https://api.careerpilot.cc/api/flashcards
 *
 * WHY REWRITES AND NOT A DIRECT API URL
 *
 * The browser must keep talking to ONE origin. A session cookie set on
 * careerpilot.cc is not sent to api.careerpilot.cc — it is a different host —
 * and a cross-site cookie for the API would be blocked by Safari and Chrome
 * anyway. Proxying keeps every request same-origin, so there is no CORS, no
 * preflight, and the existing Auth.js cookie keeps working. The VPS verifies
 * that cookie with the same `AUTH_SECRET`; nothing about auth changes.
 *
 * WHY /api/auth IS NOT PROXIED
 *
 * Sign-in must run where the browser thinks it is. Auth.js sets `__Secure-`
 * cookies scoped to the responding host and validates CSRF against it, so
 * `/api/auth/*` stays on Vercel. Everything else — disk writes, long AI
 * streams, PDF parsing — lives on the VPS.
 *
 * THE VPS MUST NOT SET `BACKEND_ORIGIN`
 *
 * If it did, the VPS would rewrite its own API back to itself and loop. The
 * `VERCEL === "1"` guard prevents that on the VPS, and `SPLIT_DEPLOY=1`
 * exists for non-Vercel frontends that want the same behaviour.
 */
const backendOrigin = process.env.BACKEND_ORIGIN?.trim().replace(/\/+$/, "") ?? "";
const splitDeployEnabled =
  backendOrigin.length > 0 &&
  (process.env.VERCEL === "1" || process.env.SPLIT_DEPLOY === "1");

/**
 * API surfaces that belong on the VPS. Auth is deliberately absent.
 *
 * Discovered from `app/api/` rather than hand-listed: a hand-written list rots
 * the moment someone adds a route, and the failure is silent — the new route
 * runs on Vercel, where uploads cannot be written to disk. The fallback keeps
 * the build working if the config is evaluated outside a project root.
 */
function backendApiPrefixes(): string[] {
  const fallback = [
    "ai-hub",
    "career",
    "courses",
    "flashcards",
    "interview",
    "jobs",
    "news",
    "pdf",
    "profile",
    "progress",
    "projects",
    "resume",
    "roadmap",
    "seed",
    "test-db",
    "tutor",
    "uploads",
    "voice",
  ];

  try {
    return readdirSync(path.join(process.cwd(), "app", "api"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "auth")
      .map((entry) => entry.name)
      .sort();
  } catch {
    return fallback;
  }
}

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
    // - script-src 'unsafe-eval' IN DEVELOPMENT ONLY: React's dev bundle uses
    //   eval() to reconstruct callstacks and power Fast Refresh. Without it the
    //   page still server-renders, but React never hydrates — every button,
    //   link and animation is dead. Never add this in production.
    const isDev = process.env.NODE_ENV !== "production";
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://hcaptcha.com https://*.hcaptcha.com`,
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
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].join("; ");

    const headersList: { key: string; value: string }[] = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Microphone intentionally NOT restricted — voice input feature.
      {
        key: "Permissions-Policy",
        value: "camera=(), geolocation=(), payment=()",
      },
    ];

    if (!isDev) {
      // 6 months, no preload flag (don't submit until confident in HTTPS story)
      headersList.push({
        key: "Strict-Transport-Security",
        value: "max-age=15552000",
      });
    }

    return [
      {
        source: "/:path*",
        headers: headersList,
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
  async rewrites() {
    if (!splitDeployEnabled) return [];

    /*
     * `beforeFiles` runs before filesystem routes, which is what makes this
     * work: the local route handler for `/api/flashcards` exists in this build
     * too, and must be bypassed rather than shadow the proxy. `/api/auth/*` has
     * no rule here, so those handlers keep serving sign-in.
     *
     * `:path*` matches zero or more segments, so `/api/courses` and
     * `/api/courses/anything` both match a single rule.
     */
    return {
      beforeFiles: backendApiPrefixes().map((prefix) => ({
        source: `/api/${prefix}/:path*`,
        destination: `${backendOrigin}/api/${prefix}/:path*`,
      })),
      afterFiles: [],
      fallback: [],
    };
  },
  /**
   * Next's dev server rejects any module/chunk request whose `Origin` is not
   * allowed (it answers a bare 403 "Unauthorized"). Only `localhost` is
   * allowed by default, so opening the dev site as 127.0.0.1 or over the LAN
   * makes every hydration chunk 403 — the page renders but React never boots,
   * leaving every button and link inert. List the origins we actually use.
   */
  allowedDevOrigins: [
    // Bare hostnames only — Next compares these against the Origin's hostname
    // with the port stripped, so "127.0.0.1:3000" would never match.
    "localhost",
    "127.0.0.1",
    "192.168.1.7",
    "careerpilot.cc",
    "www.careerpilot.cc",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: ["careerpilot.cc", "www.careerpilot.cc", "localhost:3000", "127.0.0.1:3000"],
    },
    /*
     * Low-memory build profile for small hosts.
     *
     * The VPS has 2.5 GB of RAM and no swap (the container host refuses
     * `swapon`), and a default Turbopack build is OOM-killed there. With
     * `NEXT_BUILD_LOW_MEMORY=1` and `next build --webpack`, the build runs one
     * worker with webpack's memory optimisations — slower, but it fits.
     * Off by default so normal deployments keep the fast path.
     */
    ...(process.env.NEXT_BUILD_LOW_MEMORY === "1"
      ? { cpus: 1, webpackMemoryOptimizations: true }
      : {}),
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

