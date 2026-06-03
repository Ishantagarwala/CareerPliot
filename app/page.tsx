import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  Compass,
  Award,
  BookOpen,
  FileText,
  MessageSquare,
  BarChart3,
  ArrowRight,
  Sparkles,
  CheckCircle,
} from "lucide-react";

export default function Home() {
  const features = [
    {
      title: "AI Career Discovery",
      description: "Answer intuitive questions about your interests, skills, and goals. Our LLM analyzes your profile to suggest the best matches.",
      icon: Compass,
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      title: "Stage-Wise Roadmaps",
      description: "Get personalized, structured learning paths broken into Beginner, Intermediate, and Advanced milestones.",
      icon: Award,
      color: "text-purple-500 bg-purple-500/10",
    },
    {
      title: "Course Recommendations",
      description: "Access curated, free and paid courses matched to your exact roadmap goals. Save time searching platforms.",
      icon: BookOpen,
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      title: "AI PDF Note Assistant",
      description: "Upload academic syllabus, notes, or textbooks. Get structured summaries, instant flashcards, and quizzes.",
      icon: FileText,
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      title: "24/7 AI Tutor Chat",
      description: "Chat with a specialized tutor that understands your roadmap context. Learn complex topics with instant feedback.",
      icon: MessageSquare,
      color: "text-pink-500 bg-pink-500/10",
    },
    {
      title: "Progress Dashboard",
      description: "Track milestones completed, courses taken, files analyzed, and keep your daily learning streak alive.",
      icon: BarChart3,
      color: "text-cyan-500 bg-cyan-500/10",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32 bg-radial from-violet-500/10 via-transparent to-transparent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary animate-pulse">
              <Sparkles className="h-3 w-3" />
              Revolutionizing Student Growth with AI
            </div>

            <h1 className="font-heading text-4xl sm:text-6xl font-black tracking-tight leading-tight">
              Chart Your Perfect Career with{" "}
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
                AI Precision
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Unlock a tailored experience designed for your aspirations. Complete smart assessments, receive stage-by-stage learning paths, access courses, study PDFs, and learn with an AI Tutor.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link href="/register" className={buttonVariants({ size: "lg", className: "h-12 px-6 font-semibold group" })}>
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline", className: "h-12 px-6 font-semibold" })}>
                Sign In
              </Link>
            </div>
          </div>

          {/* Interactive Card Preview Graphic */}
          <div className="mt-16 border border-border/80 rounded-2xl bg-card/60 backdrop-blur-xl shadow-2xl p-6 md:p-10 max-w-5xl mx-auto relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-purple-500/5 to-fuchsia-500/5 pointer-events-none" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              <div className="border border-border/50 bg-background/50 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="h-2 w-12 rounded bg-indigo-500/30 mb-4" />
                  <h3 className="font-heading font-bold text-lg mb-2">1. Career Discovery</h3>
                  <p className="text-sm text-muted-foreground">Submit interests & skills to extract prime AI career matches.</p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                  <span className="text-xs text-primary font-medium">96% Match Score</span>
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              <div className="border border-border/50 bg-background/50 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="h-2 w-12 rounded bg-purple-500/30 mb-4" />
                  <h3 className="font-heading font-bold text-lg mb-2">2. Learning Roadmap</h3>
                  <p className="text-sm text-muted-foreground">Follow structural milestones across Beginner, Intermediate & Advanced levels.</p>
                </div>
                <div className="mt-6">
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-2/3 rounded-full" />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                    <span>Progress</span>
                    <span>66%</span>
                  </div>
                </div>
              </div>

              <div className="border border-border/50 bg-background/50 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="h-2 w-12 rounded bg-fuchsia-500/30 mb-4" />
                  <h3 className="font-heading font-bold text-lg mb-2">3. Knowledge Boost</h3>
                  <p className="text-sm text-muted-foreground">Upload syllabus, ask questions to our AI Tutor, and track courses.</p>
                </div>
                <div className="mt-6 flex gap-2">
                  <span className="px-2 py-1 bg-secondary text-[10px] rounded font-medium">AI Chat</span>
                  <span className="px-2 py-1 bg-secondary text-[10px] rounded font-medium">PDF Summary</span>
                  <span className="px-2 py-1 bg-secondary text-[10px] rounded font-medium">Quizzes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-24 bg-zinc-50 dark:bg-zinc-950/20 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
              One Unified Platform, Six Core Modules
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to successfully discover your path and build your skills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="border border-border bg-card text-card-foreground rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group duration-300"
              >
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-6 ${feature.color}`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading font-bold text-xl mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works / Steps */}
      <section className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="font-heading text-3xl font-bold tracking-tight">How It Works</h2>
            <p className="text-muted-foreground">Get started in three simple steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center space-y-4 relative">
              <div className="h-16 w-16 rounded-full border-2 border-primary/20 bg-background flex items-center justify-center font-heading text-2xl font-black text-primary shadow-sm z-10">
                1
              </div>
              <h3 className="font-heading font-bold text-lg">Take Assessment</h3>
              <p className="text-sm text-muted-foreground">
                Enter your interests, academic background, goals, and rate your skills.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center space-y-4 relative">
              <div className="h-16 w-16 rounded-full border-2 border-primary/20 bg-background flex items-center justify-center font-heading text-2xl font-black text-primary shadow-sm z-10">
                2
              </div>
              <h3 className="font-heading font-bold text-lg">Select Your Career Path</h3>
              <p className="text-sm text-muted-foreground">
                View matching scores and explanations, then select the perfect path.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center space-y-4 relative">
              <div className="h-16 w-16 rounded-full border-2 border-primary/20 bg-background flex items-center justify-center font-heading text-2xl font-black text-primary shadow-sm z-10">
                3
              </div>
              <h3 className="font-heading font-bold text-lg">Learn & Track Progress</h3>
              <p className="text-sm text-muted-foreground">
                Follow your timeline, read materials, talk with the AI Tutor, and build credentials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-radial from-violet-600 via-transparent to-transparent opacity-50" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-8 relative">
          <h2 className="font-heading text-3xl sm:text-5xl font-black tracking-tight">
            Ready to Take Control of Your Future?
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed">
            Create an account today and experience AI-guided career mapping.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register" className={buttonVariants({ size: "lg", variant: "secondary", className: "h-12 px-6 font-semibold" })}>
              Sign Up Now
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
