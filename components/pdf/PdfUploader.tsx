"use client";

import React, { useState, useRef } from "react";
import { toast } from "sonner";

interface PdfUploaderProps {
  onUploadSuccess: (document: any) => void;
}

export default function PdfUploader({ onUploadSuccess }: PdfUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

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
    if (selectedFile.type !== "application/pdf") {
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

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(interval);
          return 85;
        }
        return prev + Math.floor(Math.random() * 10) + 2;
      });
    }, 400);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/pdf/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to process document");
      }

      setProgress(100);
      const data = await res.json();
      toast.success("Document analyzed successfully!");

      setTimeout(() => {
        onUploadSuccess(data.document);
        removeFile();
        setUploading(false);
      }, 500);
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || "Something went wrong during PDF processing.");
      toast.error(err.message || "Failed to analyze PDF");
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
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed transition-all min-h-[220px] ${
          !file && !uploading ? "cursor-pointer" : ""
        } ${
          dragActive
            ? "border-white bg-white/5"
            : "border-[#262626] hover:border-[#404040]"
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
            <div className="h-14 w-14 border border-[#262626] bg-[#131313] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm text-white">
                Drag and drop your study materials here, or{" "}
                <span className="text-white font-bold hover:underline">browse</span>
              </p>
              <p
                className="text-[11px] text-[#636565]"
                style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
              >
                PDF NOTES, SLIDES, OR CHAPTERS UP TO 10MB
              </p>
            </div>
          </div>
        )}

        {file && !uploading && (
          <div className="flex flex-col items-center w-full max-w-md p-4 bg-[#131313] border border-[#262626]">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 border border-[#262626] bg-[#0A0A0A] flex items-center justify-center text-white shrink-0">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p
                    className="text-[10px] text-[#636565]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="h-8 w-8 flex items-center justify-center text-[#8e9192] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <button
              onClick={handleUpload}
              className="w-full mt-5 py-2.5 bg-white text-[#0A0A0A] font-bold text-xs hover:bg-[#e2e2e2] transition-colors flex items-center justify-center gap-2"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              Analyze with AI
            </button>
          </div>
        )}

        {uploading && (
          <div className="w-full max-w-md flex flex-col items-center space-y-4 py-4">
            <div className="h-12 w-12 border border-[#262626] bg-[#131313] flex items-center justify-center text-white relative">
              <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
              <div className="absolute inset-0 border-2 border-[#262626] border-t-white animate-spin" />
            </div>

            <div className="w-full space-y-2 text-center">
              <p className="text-sm font-medium text-white">
                {progress < 85 ? "Reading & Extracting Text..." : "AI summarizing and generating quizzes..."}
              </p>
              <div className="h-1 w-full bg-[#262626] overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span
                className="text-[11px] text-[#8e9192]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {progress}% Complete
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 mt-3 p-3 bg-[#1A1A1A] border border-[#ffb4ab]/30 text-[#ffb4ab] text-xs font-medium">
          <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
