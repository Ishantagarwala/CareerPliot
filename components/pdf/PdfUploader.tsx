"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { HubDocument } from "@/components/ai-hub/types";

interface PdfUploaderProps {
  onUploadSuccess: (document: HubDocument) => void;
}

function parseUploadedDocument(value: unknown): HubDocument | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const rawId = candidate._id || candidate.id || candidate.docId;
  if (
    typeof rawId !== "string" ||
    !rawId ||
    typeof candidate.filename !== "string" ||
    !candidate.filename.trim()
  ) {
    return null;
  }

  return {
    _id: rawId,
    id: rawId,
    docId: rawId,
    filename: candidate.filename.trim(),
    fileUrl:
      typeof candidate.fileUrl === "string" ? candidate.fileUrl : undefined,
    summary:
      typeof candidate.summary === "string" ? candidate.summary : undefined,
    createdAt:
      typeof candidate.createdAt === "string"
        ? candidate.createdAt
        : undefined,
  };
}

export default function PdfUploader({ onUploadSuccess }: PdfUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearProgressInterval();
    },
    [clearProgressInterval]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (selectedFile: File) => {
    setError(null);
    const looksLikePdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");
    if (!looksLikePdf) {
      setError("Please upload a PDF document only.");
      toast.error("Invalid file format");
      return false;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10MB.");
      toast.error("File too large");
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    setProgress(0);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(15);
    clearProgressInterval();

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearProgressInterval();
          return 85;
        }
        return Math.min(85, prev + Math.floor(Math.random() * 10) + 2);
      });
    }, 400);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/pdf/upload", {
        method: "POST",
        body: formData,
      });

      clearProgressInterval();

      if (!res.ok) {
        let errorMessage = "Failed to process document";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } else {
            const errorText = await res.text();
            errorMessage = errorText.substring(0, 150) || errorMessage;
          }
        } catch (parseErr) {
          console.error("Error parsing error response:", parseErr);
        }
        throw new Error(errorMessage);
      }

      setProgress(100);
      const data = (await res.json()) as { document?: unknown };
      const uploadedDocument = parseUploadedDocument(data.document);
      if (!uploadedDocument) {
        throw new Error("Upload succeeded, but the document response was invalid.");
      }

      toast.success("PDF added to your study materials.");
      onUploadSuccess(uploadedDocument);
      removeFile();
      setUploading(false);
    } catch (err: unknown) {
      clearProgressInterval();
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while adding the PDF.";
      setError(message);
      toast.error(message);
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={!file && !uploading ? onButtonClick : undefined}
        onKeyDown={(event) => {
          if (
            !file &&
            !uploading &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            onButtonClick();
          }
        }}
        role={!file && !uploading ? "button" : undefined}
        tabIndex={!file && !uploading ? 0 : undefined}
        aria-label={!file && !uploading ? "Choose a PDF to upload" : undefined}
        className={`relative flex flex-col items-center justify-center p-8 border border-dashed rounded-2xl transition-all min-h-[220px] ${
          !file && !uploading ? "cursor-pointer" : ""
        } ${
          dragActive
            ? "border-ring bg-primary/10"
            : "border-border bg-muted/40 hover:border-ring/50 hover:bg-muted/70"
        } ${uploading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf"
          onChange={handleChange}
          disabled={uploading}
        />

        {!file && !uploading && (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm text-foreground">
                Drag and drop your study materials here, or{" "}
                <span className="text-primary font-bold hover:underline">browse</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                PDF NOTES, SLIDES, OR CHAPTERS UP TO 10 MB
              </p>
            </div>
          </div>
        )}

        {file && !uploading && (
          <div className="flex flex-col items-center w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-background cursor-pointer"
                aria-label={`Remove ${file.name}`}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleUpload}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">library_add</span>
              Add to Study Materials
            </button>
          </div>
        )}

        {uploading && (
          <div className="w-full max-w-md flex flex-col items-center space-y-4 py-4">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[24px]">document_scanner</span>
              <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
            </div>

            <div className="w-full space-y-2 text-center">
              <p className="text-sm font-medium text-foreground">
                {progress < 85
                  ? "Uploading and extracting text..."
                  : "Saving to your study materials..."}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground">
                {progress}% Complete
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          className="mt-3 flex items-start gap-2.5 rounded-lg border border-destructive/35 bg-destructive/10 p-3 text-xs font-medium text-destructive"
          role="alert"
        >
          <span className="material-symbols-outlined mt-0.5 text-[16px] shrink-0">error</span>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
