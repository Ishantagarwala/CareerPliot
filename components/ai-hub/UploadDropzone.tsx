"use client";

import PdfUploader from "@/components/pdf/PdfUploader";
import type { HubDocument } from "./types";

interface UploadDropzoneProps {
  onUploadSuccess: (document: HubDocument) => void;
}

export default function UploadDropzone({ onUploadSuccess }: UploadDropzoneProps) {
  return <PdfUploader onUploadSuccess={onUploadSuccess} />;
}
