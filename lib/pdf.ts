import { PDFParse } from "pdf-parse";
import { createRequire } from "module";
import { pathToFileURL } from "url";

/**
 * Point pdf.js at an absolute worker path once per process.
 *
 * In Node, pdf.js loads its worker via a bundler-opaque `await import("./pdf.worker.mjs")`
 * with a *relative* default workerSrc. That relative import cannot be traced by Next and
 * fails to resolve inside the Vercel lambda, crashing the function before any work happens.
 * Resolving the real file path (which is traced via next.config outputFileTracingIncludes)
 * and setting it as an absolute file:// URL fixes both local and serverless execution.
 */
let workerConfigured = false;
function ensureWorker(): void {
  if (workerConfigured) return;
  try {
    const require = createRequire(import.meta.url);
    const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    PDFParse.setWorker(pathToFileURL(workerPath).href);
  } catch (error: any) {
    // Non-fatal: fall back to pdf.js's default resolution (works locally).
    console.warn("[pdf-parse] Could not pin worker path:", error?.message || error);
  }
  workerConfigured = true;
}

/**
 * Extracts text from a PDF buffer.
 *
 * Primary path: local extraction via pdf-parse v2 (pure TS, bundles its own pdfjs +
 * worker, works in Node and Vercel serverless). This is free and requires no API key.
 *
 * Optional fallback: PDF.co HTTP API, used only when local extraction returns no text
 * AND a real PDF_CO_API_KEY is configured (e.g. scanned/image-only PDFs that need OCR).
 */
export async function extractTextFromPdf(buffer: Buffer, filename: string): Promise<string> {
  // 1. Local extraction with pdf-parse v2
  let localText = "";
  try {
    ensureWorker();
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      localText = result.text || "";
    } finally {
      await parser.destroy();
    }

    if (localText.trim()) {
      console.log(`[pdf-parse] Local text extraction successful for ${filename}`);
      return localText;
    }

    console.warn(`[pdf-parse] Local extraction returned empty text for ${filename}`);
  } catch (error: any) {
    console.warn(`[pdf-parse] Local extraction failed for ${filename}:`, error?.message || error);
  }

  // 2. Optional PDF.co fallback (only when a real API key is configured)
  const apiKey = process.env.PDF_CO_API_KEY || "";
  if (!apiKey || apiKey.includes("your_pdf_co_api_key")) {
    throw new Error(
      "Could not extract any text from the PDF locally, and no PDF.co fallback is configured. " +
        "The document may be scanned/image-only and require OCR."
    );
  }

  console.log(`[PDF.co] Falling back to remote extraction for ${filename}`);

  // 2a. Get presigned URL
  const presignedUrlRes = await fetch(
    `https://api.pdf.co/v1/file/upload/get-presigned-url?name=${encodeURIComponent(filename)}`,
    { method: "GET", headers: { "x-api-key": apiKey } }
  );
  if (!presignedUrlRes.ok) {
    throw new Error(`PDF.co: failed to get presigned URL: ${presignedUrlRes.statusText}`);
  }
  const {
    presignedUrl,
    url,
    error: presignedError,
    message: presignedMessage,
  } = await presignedUrlRes.json();
  if (presignedError) {
    throw new Error(`PDF.co presigned URL error: ${presignedMessage}`);
  }

  // 2b. Upload the file
  const uploadRes = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: new Uint8Array(buffer),
  });
  if (!uploadRes.ok) {
    throw new Error(`PDF.co: failed to upload file: ${uploadRes.statusText}`);
  }

  // 2c. Convert PDF to text
  const convertRes = await fetch("https://api.pdf.co/v1/pdf/convert/to/text", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ url, inline: true, async: false }),
  });
  if (!convertRes.ok) {
    throw new Error(`PDF.co: failed to convert PDF to text: ${convertRes.statusText}`);
  }
  const convertResult = await convertRes.json();
  if (convertResult.error) {
    throw new Error(`PDF.co conversion error: ${convertResult.message}`);
  }
  if (convertResult.body && convertResult.body.trim()) {
    console.log(`[PDF.co] Remote text extraction successful for ${filename}`);
    return convertResult.body;
  }

  throw new Error("Both local pdf-parse and PDF.co failed to extract any text from the PDF.");
}
