// @ts-ignore
import pdf from "pdf-parse";

// Polyfill global atob/btoa for Node environment to handle binary streams in pdf-parse
if (typeof global !== "undefined") {
  global.atob = (str: string) => Buffer.from(str, "base64").toString("binary");
  global.btoa = (str: string) => Buffer.from(str, "binary").toString("base64");
}

// Polyfill DOMMatrix for pdfjs-dist in serverless environments (text extraction only)
if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    static fromMatrix() { return new DOMMatrix(); }
    static fromFloat32Array() { return new DOMMatrix(); }
    static fromFloat64Array() { return new DOMMatrix(); }
    translate() { return this; }
    scale() { return this; }
    multiply() { return this; }
    inverse() { return this; }
    transformPoint(p: any) { return p; }
  };
}

/**
 * Extracts text from a PDF buffer using PDF.co API as default,
 * and falls back to local PDF.js (pdf-parse) text extraction.
 */
export async function extractTextFromPdf(buffer: Buffer, filename: string): Promise<string> {
  const apiKey = process.env.PDF_CO_API_KEY || "flashin17@gmail.com_ih1Co96JlXSwjSdLLO6gZS01RZc9JzhQKCTgdDv7dGYAkuKahVPWRgutyxdvc0HP";

  try {
    console.log(`[PDF.co] Attempting text extraction for ${filename}`);

    // 1. Get presigned URL
    const presignedUrlRes = await fetch(
      `https://api.pdf.co/v1/file/upload/get-presigned-url?name=${encodeURIComponent(filename)}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      }
    );

    if (!presignedUrlRes.ok) {
      throw new Error(`Failed to get presigned URL: ${presignedUrlRes.statusText}`);
    }

    const { presignedUrl, url, error: presignedError, message: presignedMessage } = await presignedUrlRes.json();
    if (presignedError) {
      throw new Error(`PDF.co presigned URL error: ${presignedMessage}`);
    }

    // 2. Upload the file (PUT request with the file buffer)
    const uploadRes = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/pdf",
      },
      body: new Uint8Array(buffer),
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload file to PDF.co: ${uploadRes.statusText}`);
    }

    // 3. Convert PDF to text
    const convertRes = await fetch("https://api.pdf.co/v1/pdf/convert/to/text", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        inline: true,
        async: false,
      }),
    });

    if (!convertRes.ok) {
      throw new Error(`Failed to convert PDF to text: ${convertRes.statusText}`);
    }

    const convertResult = await convertRes.json();
    if (convertResult.error) {
      throw new Error(`PDF.co conversion error: ${convertResult.message}`);
    }

    if (convertResult.body && convertResult.body.trim()) {
      console.log(`[PDF.co] Text extraction successful for ${filename}`);
      return convertResult.body;
    }

    throw new Error("PDF.co returned empty body");
  } catch (error: any) {
    console.warn(`[PDF.co] Extraction failed, falling back to local pdf.js:`, error.message || error);

    // Fallback using local pdf-parse
    const result = await pdf(buffer);

    if (!result.text || !result.text.trim()) {
      throw new Error("Both PDF.co and backup pdf.js failed to extract text (empty result).");
    }

    return result.text;
  }
}
