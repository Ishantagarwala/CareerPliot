import type { NextConfig } from "next";
import dns from "dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/tutor", destination: "/ai-hub", permanent: false },
      { source: "/pdf", destination: "/ai-hub", permanent: false },
      { source: "/study", destination: "/ai-hub", permanent: false },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["careerpilot.cc", "www.careerpilot.cc", "REDACTED-VPS-IP"],
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

