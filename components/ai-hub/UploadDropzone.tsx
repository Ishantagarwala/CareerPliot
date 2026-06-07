"use client";

import PdfUploader from "@/components/pdf/PdfUploader";

interface UploadDropzoneProps {
  onUploadSuccess: (document: any) => void;
}

export default function UploadDropzone({ onUploadSuccess }: UploadDropzoneProps) {
  return <PdfUploader onUploadSuccess={onUploadSuccess} />;
}
