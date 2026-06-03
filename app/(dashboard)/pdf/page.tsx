import { FileText, Sparkles } from "lucide-react";

export default function PdfPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl max-w-lg mx-auto py-16 space-y-6 bg-card">
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        <FileText className="h-8 w-8 animate-pulse" />
      </div>
      <div className="space-y-2">
        <h3 className="font-heading text-xl font-bold">AI PDF Assistant</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Upload course syllabi, notes, or textbooks to extract structured summaries, flashcards, and quizzes.
        </p>
      </div>
      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold">
        <Sparkles className="h-3.5 w-3.5" /> Coming in Phase 3!
      </span>
    </div>
  );
}
