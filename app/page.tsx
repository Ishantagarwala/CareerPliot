import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AnimateOnScroll from "@/components/ui/AnimateOnScroll";

export default function Home() {
  const features = [
    {
      title: "AI Career Discovery",
      description: "Answer intuitive questions about your interests, skills, and goals. Our LLM analyzes your profile to suggest the best career matches.",
      icon: "explore",
    },
    {
      title: "Stage-Wise Roadmaps",
      description: "Get personalized, structured learning paths broken into Beginner, Intermediate, and Advanced milestones.",
      icon: "map",
    },
    {
      title: "Course Recommendations",
      description: "Access curated, free and paid courses matched to your exact roadmap goals. Save time searching platforms.",
      icon: "school",
    },
    {
      title: "AI PDF Note Assistant",
      description: "Upload academic syllabus, notes, or textbooks. Get structured summaries, instant flashcards, and quizzes.",
      icon: "picture_as_pdf",
    },
    {
      title: "24/7 AI Tutor Chat",
      description: "Chat with a specialized tutor that understands your roadmap context. Learn complex topics with instant feedback.",
      icon: "psychology",
    },
    {
      title: "Progress Dashboard",
      description: "Track milestones completed, courses taken, files analyzed, and keep your daily learning streak alive.",
      icon: "dashboard",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A]">
      {/* Desktop top bar for landing page */}
      <header className="flex justify-between items-center w-full px-6 md:px-12 h-16 bg-[#0A0A0A] border-b border-[#262626] sticky top-0 z-50">
        <Link href="/">
          <h1
            className="text-lg font-bold text-white tracking-tight"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            Career Pilot
          </h1>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login?demo=true"
            className="px-5 py-2 text-indigo-400 border border-indigo-500/30 hover:border-indigo-500 hover:text-white hover:bg-indigo-500/10 transition-colors"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", letterSpacing: "0.05em", fontWeight: 500 }}
          >
            Demo Login
          </Link>
          <Link
            href="/login"
            className="px-5 py-2 text-white border border-[#262626] hover:border-white transition-colors"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", letterSpacing: "0.05em", fontWeight: 500 }}
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 bg-white text-[#0A0A0A] font-bold hover:bg-[#e2e2e2] transition-colors"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", letterSpacing: "0.05em", fontWeight: 500 }}
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 md:py-40 bg-[#0A0A0A]">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)] pointer-events-none" />

        <div className="mx-auto max-w-[1280px] px-6 md:px-12 relative">
          <div className="max-w-3xl space-y-8">
            {/* Label */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1 border border-[#262626] bg-[#1A1A1A] text-[#c4c7c8] animate-fade-in-up"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 500 }}
            >
              <span className="w-2 h-2 rounded-full bg-white" />
              AI-POWERED CAREER PLANNING
            </div>

            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1] animate-fade-in-up delay-100"
              style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
            >
              Chart Your Perfect Career with Precision
            </h1>

            <p className="text-lg md:text-xl text-[#c4c7c8] leading-relaxed max-w-2xl animate-fade-in-up delay-200">
              Unlock a tailored experience designed for your aspirations. Complete smart assessments, receive stage-by-stage learning paths, access courses, study PDFs, and learn with an AI Tutor.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2 animate-fade-in-up delay-300">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-[#0A0A0A] font-bold hover:bg-[#e2e2e2] transition-colors group"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
              >
                Get Started Free
                <span className="material-symbols-outlined text-[18px] ml-2 group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-3 border border-white text-white hover:bg-[#1A1A1A] transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
              >
                Sign In
              </Link>
              <Link
                href="/login?demo=true"
                className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] flex items-center gap-2 group"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
              >
                Demo Login
                <span className="material-symbols-outlined text-[18px] group-hover:animate-pulse">
                  bolt
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Preview Cards Section */}
      <section className="py-16 bg-[#0A0A0A] border-t border-[#262626]">
        <div className="mx-auto max-w-[1280px] px-6 md:px-12">
          <AnimateOnScroll delay={100}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="bg-[#1A1A1A] border border-[#262626] p-8 hover:border-[#404040] transition-colors group">
                <div className="h-1 w-12 bg-white/20 mb-6" />
                <h3
                  className="font-bold text-lg text-white mb-3"
                  style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                >
                  1. Career Discovery
                </h3>
                <p className="text-sm text-[#c4c7c8] leading-relaxed mb-6">
                  Submit interests & skills to extract prime AI career matches.
                </p>
                <div className="flex items-center justify-between border-t border-[#262626] pt-4">
                  <span
                    className="text-xs text-white font-medium"
                    style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
                  >
                    96% Match Score
                  </span>
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#1A1A1A] border border-[#262626] p-8 hover:border-[#404040] transition-colors group">
                <div className="h-1 w-12 bg-white/20 mb-6" />
                <h3
                  className="font-bold text-lg text-white mb-3"
                  style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                >
                  2. Learning Roadmap
                </h3>
                <p className="text-sm text-[#c4c7c8] leading-relaxed mb-6">
                  Follow structural milestones across Beginner, Intermediate & Advanced levels.
                </p>
                <div className="mt-auto">
                  <div className="h-1 w-full bg-[#262626] overflow-hidden">
                    <div className="h-full bg-white w-2/3 progress-bar-fill" />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>PROGRESS</span>
                    <span className="text-[10px] text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>66%</span>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[#1A1A1A] border border-[#262626] p-8 hover:border-[#404040] transition-colors group">
                <div className="h-1 w-12 bg-white/20 mb-6" />
                <h3
                  className="font-bold text-lg text-white mb-3"
                  style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                >
                  3. Knowledge Boost
                </h3>
                <p className="text-sm text-[#c4c7c8] leading-relaxed mb-6">
                  Upload syllabus, ask questions to our AI Tutor, and track courses.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="monolith-chip" style={{ fontFamily: "'JetBrains Mono', monospace" }}>AI Chat</span>
                  <span className="monolith-chip" style={{ fontFamily: "'JetBrains Mono', monospace" }}>PDF Summary</span>
                  <span className="monolith-chip" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Quizzes</span>
                </div>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-24 bg-[#0A0A0A] border-t border-[#262626]">
        <div className="mx-auto max-w-[1280px] px-6 md:px-12">
          <AnimateOnScroll>
            <div className="mb-16 max-w-2xl">
              <h2
                className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4"
                style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
              >
                One Unified Platform, Six Core Modules
              </h2>
              <p className="text-lg text-[#c4c7c8]">
                Everything you need to successfully discover your path and build your skills.
              </p>
            </div>
          </AnimateOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <AnimateOnScroll key={idx} delay={idx * 80}>
                <div className="bg-[#1A1A1A] border border-[#262626] p-6 hover:border-[#404040] transition-all group h-full flex flex-col">
                  <div className="h-12 w-12 border border-[#262626] bg-[#131313] flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-white text-[22px]">
                      {feature.icon}
                    </span>
                  </div>
                  <h3
                    className="font-bold text-lg text-white mb-3 group-hover:underline decoration-1 underline-offset-4"
                    style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[#c4c7c8] leading-relaxed flex-1">
                    {feature.description}
                  </p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-[#0A0A0A] border-t border-[#262626]">
        <div className="mx-auto max-w-[1280px] px-6 md:px-12">
          <AnimateOnScroll>
            <div className="mb-16 max-w-2xl">
              <h2
                className="text-3xl font-bold text-white tracking-tight mb-4"
                style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
              >
                How It Works
              </h2>
              <p className="text-[#c4c7c8]">Get started in three simple steps.</p>
            </div>
          </AnimateOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl relative steps-connector">
            {[
              { num: "01", title: "Take Assessment", desc: "Enter your interests, academic background, goals, and rate your skills." },
              { num: "02", title: "Select Your Career Path", desc: "View matching scores and explanations, then select the perfect path." },
              { num: "03", title: "Learn & Track Progress", desc: "Follow your timeline, read materials, talk with the AI Tutor, and build credentials." },
            ].map((step, idx) => (
              <AnimateOnScroll key={idx} delay={idx * 150} variant="scale">
                <div className="flex flex-col items-center text-center space-y-5 relative">
                  <div className="h-16 w-16 bg-white flex items-center justify-center z-10">
                    <span
                      className="text-2xl font-bold text-[#0A0A0A]"
                      style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                    >
                      {step.num}
                    </span>
                  </div>
                  <h3
                    className="font-bold text-lg text-white"
                    style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#c4c7c8]">{step.desc}</p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 bg-[#131313] border-t border-[#262626] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.02)_0%,_transparent_60%)] pointer-events-none" />

        <AnimateOnScroll>
          <div className="mx-auto max-w-[1280px] px-6 md:px-12 text-center space-y-8 relative">
            <h2
              className="text-3xl md:text-5xl font-bold text-white tracking-tight"
              style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
            >
              Ready to Take Control of Your Future?
            </h2>
            <p className="text-lg text-[#8e9192] max-w-2xl mx-auto leading-relaxed">
              Create an account today and experience AI-guided career mapping.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-[#0A0A0A] font-bold hover:bg-[#e2e2e2] transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
              >
                Sign Up Now
              </Link>
            </div>
          </div>
        </AnimateOnScroll>
      </section>

      <Footer />
    </div>
  );
}
