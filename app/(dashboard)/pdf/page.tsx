"use client";

import React, { useEffect, useState } from "react";
import { FileText, Sparkles, Plus, Clock, Loader2, ArrowLeft } from "lucide-react";
import PdfUploader from "@/components/pdf/PdfUploader";
import SummaryViewer from "@/components/pdf/SummaryViewer";
import QuizViewer from "@/components/pdf/QuizViewer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface DocumentItem {
  _id: string;
  filename: string;
  fileUrl: string;
  createdAt: string;
  summary?: string;
  questions?: any[];
}

export default function PdfPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<"summary" | "quiz">("summary");
  const [showUploader, setShowUploader] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/pdf/upload");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
        if (data.length > 0) {
          // Keep uploader open by default, but have history ready
          setShowUploader(true);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load upload history");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleUploadSuccess = (newDoc: any) => {
    const formattedDoc: DocumentItem = {
      _id: newDoc.id,
      filename: newDoc.filename,
      fileUrl: newDoc.fileUrl,
      createdAt: new Date().toISOString(),
      summary: newDoc.summary,
      questions: newDoc.questions,
    };
    
    // Add to list and select it
    setDocuments((prev) => [formattedDoc, ...prev]);
    setActiveDoc(formattedDoc);
    setShowUploader(false);
    setActiveTab("summary");
  };

  const handleSelectDocument = async (doc: DocumentItem) => {
    setLoadingDetails(true);
    try {
      // Fetch full details if they aren't pre-loaded
      if (!doc.summary || !doc.questions) {
        const [summaryRes, questionsRes] = await Promise.all([
          fetch(`/api/pdf/summary/${doc._id}`),
          fetch(`/api/pdf/questions/${doc._id}`),
        ]);

        if (!summaryRes.ok || !questionsRes.ok) {
          throw new Error("Failed to load document details");
        }

        const summaryData = await summaryRes.json();
        const questionsData = await questionsRes.json();

        const fullDoc = {
          ...doc,
          summary: summaryData.summary,
          questions: questionsData.questions,
        };

        // Update local list
        setDocuments((prev) => prev.map((d) => (d._id === doc._id ? fullDoc : d)));
        setActiveDoc(fullDoc);
      } else {
        setActiveDoc(doc);
      }
      setShowUploader(false);
      setActiveTab("summary");
    } catch (err: any) {
      toast.error(err.message || "Failed to load document");
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-border pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary animate-pulse" />
            AI PDF & Notes Assistant
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Extract summarizations, generate conceptual MCQs, and create study flashcards from your documents.
          </p>
        </div>

        {activeDoc && !showUploader && (
          <Button
            onClick={() => setShowUploader(true)}
            size="sm"
            className="font-semibold flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Analyze New Document
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left column: History Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-border bg-card shadow-sm h-full max-h-[70vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <span className="font-heading text-sm font-bold flex items-center gap-1.5 text-foreground">
                <Clock className="h-4 w-4 text-primary" /> Recent Uploads
              </span>
              {!showUploader && (
                <button
                  onClick={() => setShowUploader(true)}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  New Upload
                </button>
              )}
            </div>
            
            <CardContent className="p-2 flex-1 overflow-y-auto space-y-1">
              {loadingHistory ? (
                <div className="space-y-2 p-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-2.5 p-2 items-center rounded-xl border border-border/50 bg-muted/10 animate-pulse">
                      <Skeleton className="h-5 w-5 rounded shrink-0" />
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
                </div>
              ) : (
                documents.map((doc) => {
                  const isActive = activeDoc?._id === doc._id && !showUploader;
                  return (
                    <button
                      key={doc._id}
                      onClick={() => handleSelectDocument(doc)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-2.5 group hover:bg-muted ${
                        isActive
                          ? "bg-primary/5 border border-primary/20 text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <FileText className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                          {doc.filename}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(doc.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Dynamic Content Area */}
        <div className="lg:col-span-3">
          {showUploader ? (
            /* Upload File Form */
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <h3 className="font-heading text-lg font-bold text-foreground">Upload Document</h3>
                <p className="text-sm text-muted-foreground">
                  Select a PDF notes file, textbook chapter, or course syllabus. Our AI will extract key text, summarize the content, and generate testing material.
                </p>
              </div>
              
              <PdfUploader onUploadSuccess={handleUploadSuccess} />

              {activeDoc && (
                <Button
                  variant="outline"
                  onClick={() => setShowUploader(false)}
                  className="font-semibold flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to &quot;{activeDoc.filename}&quot;
                </Button>
              )}
            </div>
          ) : loadingDetails ? (
            /* Loading State */
            <div className="flex h-[40vh] flex-col items-center justify-center gap-4 bg-card border border-border rounded-2xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-semibold">Retrieving document intelligence...</p>
            </div>
          ) : activeDoc ? (
            /* View Analyzed Document */
            <div className="space-y-6">
              {/* Document Info bar */}
              <div className="p-4 bg-card border border-border rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-foreground truncate max-w-[280px] sm:max-w-md">
                      {activeDoc.filename}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Sparkles className="h-3 w-3 text-amber-500" /> AI analysis complete
                    </p>
                  </div>
                </div>

                {/* Tabs selection */}
                <div className="flex bg-muted p-1 rounded-xl self-start sm:self-auto border border-border/50">
                  <button
                    onClick={() => setActiveTab("summary")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === "summary"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => setActiveTab("quiz")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === "quiz"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Practice & Quiz
                  </button>
                </div>
              </div>

              {/* Tab views */}
              <div className="transition-all duration-300">
                {activeTab === "summary" ? (
                  <SummaryViewer summary={activeDoc.summary || ""} filename={activeDoc.filename} />
                ) : (
                  <QuizViewer questions={activeDoc.questions || []} />
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
