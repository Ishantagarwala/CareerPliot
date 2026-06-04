"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileText, X, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
    // Limit size to 10MB just for safety
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
        className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all duration-300 min-h-[220px] bg-card ${
          !file && !uploading ? "cursor-pointer" : ""
        } ${
          dragActive
            ? "border-primary bg-primary/5 scale-[0.99]"
            : "border-border hover:border-primary/50"
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
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform duration-300 hover:scale-110">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm text-foreground">
                Drag and drop your study materials here, or{" "}
                <span className="text-primary font-semibold hover:underline">
                  browse
                </span>
              </p>
              <p className="text-xs text-muted-foreground">PDF notes, slides, or chapters up to 10MB</p>
            </div>
          </div>
        )}

        {file && !uploading && (
          <div className="flex flex-col items-center w-full max-w-md p-4 bg-muted/50 rounded-xl border border-border">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeFile}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={handleUpload}
              className="w-full mt-5 font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="h-4 w-4" /> Analyze with AI
            </Button>
          </div>
        )}

        {uploading && (
          <div className="w-full max-w-md flex flex-col items-center space-y-4 py-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary relative">
              <Sparkles className="h-6 w-6 animate-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
            
            <div className="w-full space-y-1.5 text-center">
              <p className="text-sm font-semibold text-foreground">
                {progress < 85 ? "Reading & Extracting Text..." : "AI summarizing and generating quizzes..."}
              </p>
              <Progress value={progress} className="h-2 w-full bg-muted" />
              <span className="text-xs text-muted-foreground font-medium">{progress}% Complete</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 mt-3 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
