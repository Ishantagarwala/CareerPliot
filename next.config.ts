import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "pdf-parse"],
  outputFileTracingIncludes: {
    // pdf-parse v2 runs pdf.js, whose Node worker is loaded via a bundler-opaque
    // dynamic import. Force the worker (and its sibling build files) into the
    // serverless trace so it resolves at runtime on Vercel.
    "/api/pdf/upload": ["./node_modules/pdfjs-dist/legacy/build/**"],
    "/api/ai-hub/upload": ["./node_modules/pdfjs-dist/legacy/build/**"],
    "/api/resume/ats-analyze": ["./node_modules/pdfjs-dist/legacy/build/**"],
  },
};

export default nextConfig;
