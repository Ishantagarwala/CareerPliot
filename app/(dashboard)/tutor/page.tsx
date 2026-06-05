import ChatInterface from "@/components/tutor/ChatInterface";

export default function TutorPage() {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="border-b border-[#262626] pb-6 animate-fade-in-up">
        <h1
          className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          <span className="material-symbols-outlined text-[28px]">psychology</span>
          AI Study Partner & Tutor
        </h1>
        <p className="text-sm text-[#8e9192] mt-2">
          Chat with the AI tutor for detailed concept explanations, code reviews, and instant debugging.
        </p>
      </div>

      {/* Main Chat Interface */}
      <ChatInterface />
    </div>
  );
}
