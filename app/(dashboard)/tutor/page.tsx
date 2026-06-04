import ChatInterface from "@/components/tutor/ChatInterface";

export default function TutorPage() {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="border-b border-border pb-5">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          AI Study Partner & Tutor
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Chat with the AI tutor for detailed concept explanations, code reviews, and instant debugging.
        </p>
      </div>

      {/* Main Chat Interface */}
      <ChatInterface />
    </div>
  );
}
