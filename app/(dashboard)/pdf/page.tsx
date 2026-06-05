"use client";

import React, { useEffect, useState } from "react";
import PdfUploader from "@/components/pdf/PdfUploader";
import SummaryViewer from "@/components/pdf/SummaryViewer";
import QuizViewer from "@/components/pdf/QuizViewer";
import { toast } from "sonner";

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

    setDocuments((prev) => [formattedDoc, ...prev]);
    setActiveDoc(formattedDoc);
    setShowUploader(false);
    setActiveTab("summary");
  };

  const handleSelectDocument = async (doc: DocumentItem) => {
    setLoadingDetails(true);
    try {
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
      <div className="border-b border-[#262626] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1
            className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[28px]">picture_as_pdf</span>
            AI PDF & Notes Assistant
          </h1>
          <p className="text-sm text-[#8e9192] mt-2">
            Extract summarizations, generate conceptual MCQs, and create study flashcards from your documents.
          </p>
        </div>

        {activeDoc && !showUploader && (
          <button
            onClick={() => setShowUploader(true)}
            className="self-start inline-flex items-center px-4 py-2 bg-white text-[#0A0A0A] font-bold hover:bg-[#e2e2e2] transition-colors text-xs gap-1.5"
            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Analyze New Document
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left column: History Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#1A1A1A] border border-[#262626] h-full max-h-[70vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#262626] flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-white text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>
                <span className="material-symbols-outlined text-[16px]">history</span>
                RECENT UPLOADS
              </span>
              {!showUploader && (
                <button
                  onClick={() => setShowUploader(true)}
                  className="text-[10px] text-white hover:underline"
                  style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
                >
                  New Upload
                </button>
              )}
            </div>

            <div className="p-2 flex-1 overflow-y-auto space-y-1">
              {loadingHistory ? (
                <div className="space-y-2 p-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-2.5 p-2 items-center border border-[#262626]">
                      <div className="h-5 w-5 bg-[#262626] shrink-0" />
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="h-3 w-3/4 bg-[#262626]" />
                        <div className="h-2 w-1/2 bg-[#262626]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <p className="text-xs text-[#636565]">No documents uploaded yet.</p>
                </div>
              ) : (
                documents.map((doc) => {
                  const isActive = activeDoc?._id === doc._id && !showUploader;
                  return (
                    <button
                      key={doc._id}
                      onClick={() => handleSelectDocument(doc)}
                      className={`w-full text-left p-3 transition-all flex items-start gap-2.5 group hover:bg-[#262626] ${
                        isActive
                          ? "bg-[#262626] border border-white/20 text-white"
                          : "text-[#c4c7c8] hover:text-white border border-transparent"
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${isActive ? "text-white" : "text-[#8e9192] group-hover:text-white"}`}>
                        description
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${isActive ? "text-white" : "text-[#c4c7c8]"}`}>
                          {doc.filename}
                        </p>
                        <p
                          className="text-[10px] text-[#636565] mt-0.5"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
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
            </div>
          </div>
        </div>

        {/* Right column: Dynamic Content */}
        <div className="lg:col-span-3">
          {showUploader ? (
            <div className="space-y-6 max-w-2xl animate-fade-in-up">
              <div className="space-y-2">
                <h3
                  className="font-bold text-lg text-white"
                  style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                >
                  Upload Document
                </h3>
                <p className="text-sm text-[#8e9192]">
                  Select a PDF notes file, textbook chapter, or course syllabus. Our AI will extract key text, summarize the content, and generate testing material.
                </p>
              </div>

              <PdfUploader onUploadSuccess={handleUploadSuccess} />

              {activeDoc && (
                <button
                  onClick={() => setShowUploader(false)}
                  className="inline-flex items-center px-5 py-2 border border-[#262626] text-[#c4c7c8] hover:border-white hover:text-white transition-colors text-xs"
                  style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
                >
                  <span className="material-symbols-outlined text-[16px] mr-1.5">arrow_back</span>
                  Back to &quot;{activeDoc.filename}&quot;
                </button>
              )}
            </div>
          ) : loadingDetails ? (
            <div className="flex h-[40vh] flex-col items-center justify-center gap-4 bg-[#1A1A1A] border border-[#262626] animate-fade-in-up">
              <div className="h-8 w-8 border-2 border-[#262626] border-t-white animate-spin" />
              <p
                className="text-sm text-[#8e9192] font-medium"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Retrieving document intelligence...
              </p>
            </div>
          ) : activeDoc ? (
            <div className="space-y-6 animate-fade-in-up">
              {/* Document Info bar */}
              <div className="p-4 bg-[#1A1A1A] border border-[#262626] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 border border-[#262626] bg-[#131313] flex items-center justify-center text-white shrink-0">
                    <span className="material-symbols-outlined text-[20px]">description</span>
                  </div>
                  <div>
                    <h3
                      className="font-bold text-sm text-white truncate max-w-[280px] sm:max-w-md"
                      style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                    >
                      {activeDoc.filename}
                    </h3>
                    <p
                      className="text-[10px] text-[#8e9192] flex items-center gap-1 mt-0.5"
                      style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
                    >
                      <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                      AI ANALYSIS COMPLETE
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-[#131313] p-1 border border-[#262626] self-start sm:self-auto">
                  <button
                    onClick={() => setActiveTab("summary")}
                    className={`px-3 py-1.5 text-xs font-medium transition-all ${
                      activeTab === "summary"
                        ? "bg-white text-[#0A0A0A]"
                        : "text-[#8e9192] hover:text-white"
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => setActiveTab("quiz")}
                    className={`px-3 py-1.5 text-xs font-medium transition-all ${
                      activeTab === "quiz"
                        ? "bg-white text-[#0A0A0A]"
                        : "text-[#8e9192] hover:text-white"
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
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
