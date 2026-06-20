import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
