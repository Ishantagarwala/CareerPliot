// pdf.js ships its worker as a bare .mjs with no type declarations. We import
// it only to expose globalThis.pdfjsWorker (see lib/pdf.ts), so an untyped
// module declaration is sufficient.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";
