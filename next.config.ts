import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "pdf-parse"],
  outputFileTracingIncludes: {
    "/api/pdf/upload": ["./node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs"],
    "/api/ai-hub/upload": ["./node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs"],
    "/api/resume/ats-analyze": ["./node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs"],
  },
};

export default nextConfig;
