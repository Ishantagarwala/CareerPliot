import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/layout/Footer";
import LandingNav from "@/components/layout/LandingNav";
import HeroProductPreview from "@/components/landing/HeroProductPreview";
import InteractiveShowcase from "@/components/landing/InteractiveShowcase";
import { isDemoLoginEnabled } from "@/lib/captcha";
import { buildHomeJsonLd } from "@/lib/seo";
import { getSiteUrl } from "@/lib/siteUrl";
import {
  ArrowRight,
  Compass,
  Map,
  BookOpen,
  FileText,
  MessageSquare,
  BarChart3,
  Sparkles,
  Zap,
  CheckCircle2,
  Code2,
  Layers,
  Award,
  Terminal,
  Cpu,
  BrainCircuit,
  Flame,
  ShieldCheck,
  Target,
  FileCheck,
  Briefcase,
  FolderGit2,
} from "lucide-react";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export const dynamic = "force-dynamic";

const shell = "w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-16";

// Problems students face
const problems = [
  {
    n: "01",
    title: "The Tutorial Hell Trap",
    desc: "Watching 80 hours of video courses without building a single non-trivial, deployable project that recruiters care about.",
    accent: "bg-coral/20 text-coral-foreground border-coral",
    tag: "STAGNATION",
  },
  {
    n: "02",
    title: "Invisible Skill Gaps",
    desc: "Sending 200 job applications blindly without realizing that missing 2 essential concepts gets your resume filtered out by ATS parsers.",
    accent: "bg-primary/20 text-foreground border-primary",
    tag: "BLIND SPOT",
  },
  {
    n: "03",
    title: "Unstructured Learning",
    desc: "Jumping between random YouTube playlists and Medium articles with zero clear roadmap of what to learn next.",
    accent: "bg-secondary/15 text-foreground border-secondary",
    tag: "CONFUSION",
  },
  {
    n: "04",
    title: "Interview Panic",
    desc: "First time ever speaking about system architecture, data structures, and project trade-offs is during the high-stakes final interview.",
    accent: "bg-amber-500/20 text-foreground border-amber-500",
    tag: "UNPREPARED",
  },
];

// Implemented features across the real repository
const features = [
  {
    title: "AI Career Discovery",
    desc: "Answer guided questions about your interests, technical strengths, and work style. Our LLM analyzes your profile to rank tailored career paths with concrete fit scores.",
    icon: Compass,
    href: "/career",
    badge: "ASSESSMENT",
    badgeColor: "bg-primary text-black",
    cardBg: "bg-card",
    stat: "Personalized Fit",
  },
  {
    title: "Stage-Wise Roadmaps",
    desc: "Break overwhelming career goals into structured milestones across Beginner, Intermediate, and Advanced tiers, complete with verifiable project deliverables.",
    icon: Map,
    href: "/roadmap",
    badge: "CURRICULUM",
    badgeColor: "bg-secondary text-white",
    cardBg: "bg-card",
    stat: "3 Progressive Stages",
  },
  {
    title: "AI Mock Interviews",
    desc: "Simulate high-pressure behavioral and technical interviews. Receive immediate, actionable feedback on response structure, architectural depth, and clarity.",
    icon: BrainCircuit,
    href: "/interview",
    badge: "PRACTICE",
    badgeColor: "bg-coral text-black",
    cardBg: "bg-card",
    stat: "Voice & Text",
  },
  {
    title: "ATS Resume Builder & Scoring",
    desc: "Build recruiter-ready resumes and benchmark existing PDFs against Applicant Tracking Systems to catch missing keywords and formatting flaws.",
    icon: FileCheck,
    href: "/resume",
    badge: "PLACEMENT",
    badgeColor: "bg-primary text-black",
    cardBg: "bg-card",
    stat: "Instant ATS Check",
  },
  {
    title: "Curated Course Hub",
    desc: "Skip endless searching. Access verified free YouTube, Coursera, and official documentation pathways mapped directly to your active roadmap milestones.",
    icon: BookOpen,
    href: "/courses",
    badge: "RESOURCES",
    badgeColor: "bg-muted text-foreground",
    cardBg: "bg-card",
    stat: "Zero Clickbait",
  },
  {
    title: "AI Study Hub & PDF Notes",
    desc: "Upload lecture slides, textbooks, or syllabus PDFs to instantly generate flashcards, summaries, and chat with an AI tutor that knows your course context.",
    icon: MessageSquare,
    href: "/ai-hub",
    badge: "STUDY ASSISTANT",
    badgeColor: "bg-secondary text-white",
    cardBg: "bg-card",
    stat: "24/7 Context Tutor",
  },
  {
    title: "Jobs & Internship Matcher",
    desc: "Explore live entry-level tech opportunities and internships filtered to match the exact skills and milestones you have completed on CareerPilot.",
    icon: Briefcase,
    href: "/jobs",
    badge: "OPPORTUNITIES",
    badgeColor: "bg-coral text-black",
    cardBg: "bg-card",
    stat: "Targeted Roles",
  },
  {
    title: "Projects & Hackathons",
    desc: "Find hackathons, open-source initiatives, and guided project specs designed to transform your theoretical knowledge into a verifiable portfolio.",
    icon: FolderGit2,
    href: "/projects",
    badge: "PORTFOLIO",
    badgeColor: "bg-primary text-black",
    cardBg: "bg-card",
    stat: "Real Proof of Work",
  },
];

// Process Stepper
const steps = [
  {
    n: "01",
    title: "Discover Your Path",
    desc: "Take the AI career discovery assessment to find high-growth roles aligned with your genuine interests and skills.",
    accent: "bg-primary text-black",
  },
  {
    n: "02",
    title: "Uncover Skill Gaps",
    desc: "Identify exactly what you know vs what the industry expects for your chosen target position.",
    accent: "bg-secondary text-white",
  },
  {
    n: "03",
    title: "Follow Structured Sprints",
    desc: "Learn milestone by milestone with curated, verified courses and 24/7 AI tutor guidance.",
    accent: "bg-coral text-black",
  },
  {
    n: "04",
    title: "Build Projects & Practice",
    desc: "Construct portfolio-grade code, test your knowledge with SRS flashcards, and run live mock interviews.",
    accent: "bg-primary text-black",
  },
  {
    n: "05",
    title: "Track Job Readiness",
    desc: "Benchmark your ATS resume, review your Readiness Score HUD, and apply with verifiable confidence.",
    accent: "bg-secondary text-white",
  },
];

// FAQs
const faqs = [
  {
    q: "How does the AI career matching work?",
    a: "Our multi-model LLM router analyzes your interests, completed coursework, problem-solving preferences, and technical skills against real market job profiles. It produces ranked paths with detailed match scores and transparent reasoning.",
  },
  {
    q: "Is CareerPilot really free for students?",
    a: "Yes. Core career discovery, learning roadmaps, course recommendations, ATS scoring, and AI tutoring are completely free. We built this platform to democratize structured career navigation for all ambitious students.",
  },
  {
    q: "Are the roadmaps static or personalized?",
    a: "Every roadmap is dynamically generated and structured into Beginner, Intermediate, and Advanced milestones. As you complete milestones and update your profile, your roadmap adapts to your velocity.",
  },
  {
    q: "How does the AI Mock Interview system work?",
    a: "Our interview engine simulates real technical and behavioral interviews. You can practice answering technical system design questions, receive immediate scores, and get critiques on architectural trade-offs.",
  },
  {
    q: "Can I upload my existing syllabus or notes?",
    a: "Yes! In the AI Study Hub, you can upload academic PDFs or textbooks. Our parser extracts the key concepts, generates spaced-repetition flashcards, and allows you to chat with a 24/7 AI tutor on that exact material.",
  },
];

export default function Home() {
  const siteUrl = getSiteUrl();
  const faqItems = faqs.map(({ q, a }) => ({ q, a }));
  const jsonLd = buildHomeJsonLd(siteUrl, faqItems);
  const demoLoginEnabled = isDemoLoginEnabled();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors selection:bg-primary selection:text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Modern Neo-Brutalist Navigation */}
      <LandingNav showDemoLogin={demoLoginEnabled} />

      {/* =========================================================================
          HERO SECTION — The Attention-Grabbing Split Composition
          ========================================================================= */}
      <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 lg:pt-20 lg:pb-32 border-b-3 border-black dark:border-[#383d45]">
        {/* Subtle grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
          aria-hidden
        />

        <div className={`relative z-10 ${shell}`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 xl:gap-14 items-center">
            {/* Left Column: Editorial Headline & Value Messaging */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-card border-2 border-black dark:border-[#383d45] rounded-full shadow-[3px_3px_0_0_#000] text-xs font-mono font-black uppercase tracking-wider text-foreground">
                <span className="w-2 h-2 rounded-full bg-primary inline-block animate-pulse" />
                <span>YOUR CAREER, RE-ENGINEERED</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-2">
                <h1 className="font-display text-[clamp(2.5rem,6vw,5.5rem)] font-black text-foreground uppercase leading-[0.94] tracking-tight">
                  Stop Learning Randomly. <br />
                  <span className="neo-highlight text-black mt-2 inline-block">
                    Start Building
                  </span>{" "}
                  Your Career.
                </h1>
              </div>

              {/* Supporting Copy */}
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed font-sans">
                CareerPilot is your autonomous career co-pilot. We diagnose your skill gaps, generate structured roadmap sprints, conduct AI mock interviews, and verify your job readiness—all in one unified workflow.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
                <Link
                  href="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 bg-primary text-black font-display text-base sm:text-lg font-black uppercase tracking-wide rounded-xl border-3 border-black shadow-[4px_4px_0_0_#000] sm:shadow-[5px_5px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_#000] active:translate-x-1.5 active:translate-y-1.5 active:shadow-none transition-all group text-center"
                >
                  <span>Build My Career Path</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <a
                  href="#features"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-card text-foreground font-display text-base sm:text-lg font-bold uppercase tracking-wide rounded-xl border-3 border-black dark:border-[#383d45] shadow-[4px_4px_0_0_#000] sm:shadow-[5px_5px_0_0_#000] dark:shadow-[4px_4px_0_0_#000] sm:dark:shadow-[5px_5px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_#000] transition-all text-center"
                >
                  <span>Explore Modules</span>
                </a>

                {demoLoginEnabled && (
                  <Link
                    href="/login?demo=true"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-secondary text-white font-mono text-sm font-bold uppercase tracking-wide rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] sm:shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition-all text-center"
                  >
                    <Zap className="w-4 h-4 fill-white text-white" />
                    <span>Demo Mode</span>
                  </Link>
                )}
              </div>

              {/* Trust statement */}
              <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm font-mono font-bold text-muted-foreground border-t-2 border-black/10 dark:border-white/10 pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>100% Free For Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary dark:text-primary" />
                  <span>No Fluff, Real Projects</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-coral" />
                  <span>ATS-Optimized Outcomes</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Product Preview Card Composition */}
            <div className="lg:col-span-5 flex justify-center">
              <HeroProductPreview />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MARQUEE / TICKER — High-Energy Neo-Brutalist Statement
          ========================================================================= */}
      <div className="bg-primary text-black py-4 border-b-3 border-black overflow-hidden flex items-center select-none">
        <div className="flex whitespace-nowrap animate-marquee font-display text-base sm:text-xl font-black uppercase tracking-widest">
          <span className="mx-6 flex items-center gap-6">
            <span>AI Career Discovery</span> ✦ <span>Stage-Wise Roadmaps</span> ✦ <span>AI Mock Interviews</span> ✦ <span>ATS Resume Scoring</span> ✦ <span>24/7 AI Study Tutor</span> ✦ <span>Verified Free Courses</span> ✦ <span>Jobs & Internships</span> ✦
          </span>
          <span className="mx-6 flex items-center gap-6">
            <span>AI Career Discovery</span> ✦ <span>Stage-Wise Roadmaps</span> ✦ <span>AI Mock Interviews</span> ✦ <span>ATS Resume Scoring</span> ✦ <span>24/7 AI Study Tutor</span> ✦ <span>Verified Free Courses</span> ✦ <span>Jobs & Internships</span> ✦
          </span>
        </div>
      </div>

      {/* =========================================================================
          PROBLEM → SOLUTION SECTION — Editorial Style
          ========================================================================= */}
      <section className="py-20 md:py-28 bg-card border-b-3 border-black dark:border-[#383d45] transition-colors">
        <div className={shell}>
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-coral text-black font-mono text-xs font-bold uppercase rounded-md border-2 border-black shadow-[3px_3px_0_0_#000] mb-4">
              <span>The Reality Check</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-foreground uppercase tracking-tight leading-[1.05]">
              Why Most Tech Students Get Stuck in <span className="underline decoration-coral decoration-wavy decoration-4">Tutorial Hell</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mt-4 leading-relaxed font-sans">
              College curriculums lag behind modern industry demands by 3 to 5 years. Without clear guidance, students waste semesters collecting video completion badges instead of mastering marketable skills.
            </p>
          </div>

          {/* Problem Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
            {problems.map((p) => (
              <div
                key={p.n}
                className="bg-background border-3 border-black dark:border-[#383d45] rounded-2xl p-6 shadow-[5px_5px_0_0_#000] dark:shadow-[5px_5px_0_0_#000] hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#000] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-display text-3xl font-black text-muted-foreground/60 tabular-nums">
                      {p.n}
                    </span>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-black ${p.accent}`}>
                      {p.tag}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">
                    {p.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Solution Banner */}
          <div className="bg-primary border-3 border-black rounded-2xl p-8 sm:p-10 lg:p-12 shadow-[8px_8px_0_0_#000] text-black grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-block px-3 py-1 bg-black text-white font-mono text-xs font-black uppercase rounded">
                THE CAREERPILOT PARADIGM
              </div>
              <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-black uppercase leading-tight">
                From Confused Student to Career-Ready Candidate.
              </h3>
              <p className="text-black/85 text-base sm:text-lg leading-relaxed max-w-2xl font-medium">
                We replace isolated tutorials with a closed-loop execution system: smart discovery identifies your target role, milestone roadmaps build hands-on competency, resume scoring ensures ATS parseability, and AI interviews prepare you for high-stakes conversations.
              </p>
            </div>
            <div className="lg:col-span-4 flex justify-start lg:justify-end">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-4 bg-black text-white font-display text-base font-black uppercase rounded-xl border-2 border-black shadow-[4px_4px_0_0_#fff] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#fff] transition-all"
              >
                <span>Start Free Assessment</span>
                <ArrowRight className="w-5 h-5 text-primary" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FEATURES SECTION — Comprehensive Real Features Grid
          ========================================================================= */}
      <section id="features" className="py-20 md:py-28 bg-background border-b-3 border-black dark:border-[#383d45] transition-colors">
        <div className={shell}>
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-black font-mono text-xs font-bold uppercase rounded-md border-2 border-black shadow-[3px_3px_0_0_#000] mb-4">
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Full Platform Architecture</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-foreground uppercase tracking-tight leading-[1.05]">
              Everything You Need To Build A <span className="bg-secondary text-white dark:text-black dark:bg-cyan px-2 border-2 border-black inline-block shadow-[3px_3px_0_0_#000]">High-Income Career</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mt-4 leading-relaxed font-sans">
              No hypothetical marketing claims. Every single module below is fully implemented, connected to real AI models, and immediately accessible in your dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-card border-3 border-black dark:border-[#383d45] rounded-2xl p-6 shadow-[5px_5px_0_0_#000] dark:shadow-[5px_5px_0_0_#000] hover:-translate-y-1.5 hover:shadow-[7px_7px_0_0_#000] transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl border-2 border-black bg-primary text-black flex items-center justify-center shadow-[3px_3px_0_0_#000] group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-all">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`px-2 py-0.5 rounded border border-black text-[10px] font-mono font-bold uppercase ${f.badgeColor}`}>
                        {f.badge}
                      </span>
                    </div>

                    <h3 className="font-display text-xl font-bold text-foreground">
                      {f.title}
                    </h3>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {f.desc}
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t-2 border-black/10 dark:border-white/10 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      {f.stat}
                    </span>
                    <Link
                      href={f.href}
                      className="inline-flex items-center gap-1 font-mono text-xs font-black uppercase text-foreground group-hover:text-secondary dark:group-hover:text-primary transition-colors"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE PRODUCT SHOWCASE — Tabbed Simulation Component
          ========================================================================= */}
      <InteractiveShowcase />

      {/* =========================================================================
          HOW IT WORKS — Visual Process Diagram Flow
          ========================================================================= */}
      <section id="how-it-works" className="py-20 md:py-28 bg-card border-b-3 border-black dark:border-[#383d45] transition-colors">
        <div className={shell}>
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-black font-mono text-xs font-bold uppercase rounded-md border-2 border-black shadow-[3px_3px_0_0_#000] mb-4">
              <span>The Workflow</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-foreground uppercase tracking-tight leading-[1.05]">
              How CareerPilot Works In <span className="bg-coral text-black px-2 border-2 border-black inline-block shadow-[3px_3px_0_0_#000]">5 Clear Steps</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mt-4 leading-relaxed font-sans">
              From your first diagnostic assessment to landing offers, here is how CareerPilot accelerates your trajectory.
            </p>
          </div>

          {/* Stepper Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {steps.map((st, i) => (
              <div
                key={st.n}
                className="bg-background border-3 border-black dark:border-[#383d45] rounded-2xl p-6 shadow-[5px_5px_0_0_#000] dark:shadow-[5px_5px_0_0_#000] flex flex-col justify-between hover:-translate-y-1 transition-all"
              >
                <div className="space-y-4">
                  <div className={`w-10 h-10 rounded-xl border-2 border-black font-display text-lg font-black flex items-center justify-center shadow-[3px_3px_0_0_#000] ${st.accent}`}>
                    {st.n}
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {st.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          ROADMAP SHOWCASE — Concrete Curriculum Sample
          ========================================================================= */}
      <section id="roadmap-showcase" className="py-20 md:py-28 bg-background border-b-3 border-black dark:border-[#383d45] transition-colors">
        <div className={shell}>
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary text-white font-mono text-xs font-bold uppercase rounded-md border-2 border-black shadow-[3px_3px_0_0_#000] mb-4">
              <span>Standard Curriculum Sample</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-foreground uppercase tracking-tight leading-[1.05]">
              Real Milestones. Real Projects. <span className="bg-primary text-black px-2 border-2 border-black inline-block shadow-[3px_3px_0_0_#000]">Zero Generic Advice.</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mt-4 leading-relaxed font-sans">
              Take a look at how an AI Engineer track is structured inside CareerPilot. Each milestone includes exact technical competencies, free verified courses, and portfolio checkpoints.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stage 1 */}
            <div className="bg-card border-3 border-black dark:border-[#383d45] rounded-2xl p-6 sm:p-7 shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#000] space-y-5">
              <div className="flex items-center justify-between pb-4 border-b-2 border-black dark:border-[#383d45]">
                <div>
                  <span className="font-mono text-xs font-black uppercase text-secondary dark:text-cyan">
                    Stage 01
                  </span>
                  <h3 className="font-display text-2xl font-black text-foreground uppercase mt-0.5">
                    Foundations
                  </h3>
                </div>
                <span className="px-2.5 py-1 bg-primary text-black font-mono font-bold text-xs rounded border border-black">
                  Beginner
                </span>
              </div>
              <ul className="space-y-3 font-sans text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>TypeScript Strict Types & Asynchronous Patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Next.js 15 Server Components & Server Actions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Relational Schema Modeling in PostgreSQL</span>
                </li>
              </ul>
              <div className="pt-3 border-t-2 border-black/10 dark:border-white/10 text-xs font-mono">
                <span className="text-muted-foreground uppercase font-bold">Project Checkpoint:</span>
                <p className="font-medium text-foreground mt-1">Multi-tenant notes API with JWT authentication</p>
              </div>
            </div>

            {/* Stage 2 */}
            <div className="bg-card border-3 border-black dark:border-[#383d45] rounded-2xl p-6 sm:p-7 shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#000] space-y-5 border-primary">
              <div className="flex items-center justify-between pb-4 border-b-2 border-black dark:border-[#383d45]">
                <div>
                  <span className="font-mono text-xs font-black uppercase text-primary">
                    Stage 02
                  </span>
                  <h3 className="font-display text-2xl font-black text-foreground uppercase mt-0.5">
                    AI & Systems
                  </h3>
                </div>
                <span className="px-2.5 py-1 bg-secondary text-white font-mono font-bold text-xs rounded border border-black">
                  Intermediate
                </span>
              </div>
              <ul className="space-y-3 font-sans text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>LLM Integration (Groq, OpenRouter, OpenAI SDK)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>pgvector & Pinecone Hybrid RAG Architectures</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Redis Token Bucket Rate Limiting & Caching</span>
                </li>
              </ul>
              <div className="pt-3 border-t-2 border-black/10 dark:border-white/10 text-xs font-mono">
                <span className="text-muted-foreground uppercase font-bold">Project Checkpoint:</span>
                <p className="font-medium text-foreground mt-1">Autonomous resume extraction & matching engine</p>
              </div>
            </div>

            {/* Stage 3 */}
            <div className="bg-card border-3 border-black dark:border-[#383d45] rounded-2xl p-6 sm:p-7 shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#000] space-y-5">
              <div className="flex items-center justify-between pb-4 border-b-2 border-black dark:border-[#383d45]">
                <div>
                  <span className="font-mono text-xs font-black uppercase text-coral">
                    Stage 03
                  </span>
                  <h3 className="font-display text-2xl font-black text-foreground uppercase mt-0.5">
                    Production & Scale
                  </h3>
                </div>
                <span className="px-2.5 py-1 bg-coral text-black font-mono font-bold text-xs rounded border border-black">
                  Advanced
                </span>
              </div>
              <ul className="space-y-3 font-sans text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Docker Containerization & Reverse Proxy (Caddy/Nginx)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Observability, Structured Logging & Error Resiliency</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Technical Mock Interviews & Portfolio Delivery</span>
                </li>
              </ul>
              <div className="pt-3 border-t-2 border-black/10 dark:border-white/10 text-xs font-mono">
                <span className="text-muted-foreground uppercase font-bold">Project Checkpoint:</span>
                <p className="font-medium text-foreground mt-1">Production SaaS platform with automated CI/CD pipeline</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FAQS SECTION — Neo-Brutalist Accordion / Grid
          ========================================================================= */}
      <section id="faq" className="py-20 md:py-28 bg-card border-b-3 border-black dark:border-[#383d45] transition-colors">
        <div className={shell}>
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-black font-mono text-xs font-bold uppercase rounded-md border-2 border-black shadow-[3px_3px_0_0_#000] mb-4">
              <span>Clear Answers</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-foreground uppercase tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mt-4 font-sans">
              Everything you need to know about using CareerPilot for your career trajectory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl">
            {faqs.map((f, i) => (
              <div
                key={i}
                className="bg-background border-3 border-black dark:border-[#383d45] rounded-2xl p-6 shadow-[5px_5px_0_0_#000] dark:shadow-[5px_5px_0_0_#000] space-y-3"
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-primary text-black font-mono font-black text-xs flex items-center justify-center border border-black shrink-0 mt-0.5">
                    Q
                  </span>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {f.q}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-10">
                  {f.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          FINAL CTA SECTION — High-Impact Banner
          ========================================================================= */}
      <section className="py-20 md:py-32 bg-secondary text-white border-b-3 border-black transition-colors relative overflow-hidden">
        {/* Decorative corner tag */}
        <div className="absolute top-6 right-6 hidden md:block bg-primary text-black font-mono font-black text-xs px-4 py-2 border-2 border-black rounded-lg shadow-[4px_4px_0_0_#000] rotate-6">
          FREE FOR ALL STUDENTS
        </div>

        <div className={`${shell} text-center max-w-4xl relative z-10`}>
          <div className="inline-block px-3.5 py-1 bg-black text-white font-mono text-xs font-black uppercase rounded-md border-2 border-black shadow-[3px_3px_0_0_#000] mb-6">
            START YOUR JOURNEY
          </div>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-[1.1] text-white">
            Your Future Won&apos;t <br />
            <span className="bg-primary text-black px-3.5 py-0.5 border-2 border-black inline-block shadow-[4px_4px_0_0_#000] mt-3">
              Build Itself.
            </span>
          </h2>
          <p className="text-white text-base sm:text-xl max-w-2xl mx-auto mt-6 leading-relaxed font-sans font-medium opacity-90">
            Stop wandering through disjointed tutorials. Get your custom AI career roadmap, identify your skill gaps, and start building your future today.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black font-display text-lg font-black uppercase rounded-xl border-3 border-black shadow-[6px_6px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_#000] active:translate-x-1.5 active:translate-y-1.5 active:shadow-none transition-all"
            >
              <span>Build My Career Path</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-card text-foreground font-display text-lg font-black uppercase rounded-xl border-3 border-black shadow-[6px_6px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_#000] transition-all"
            >
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Modern Redesigned Footer */}
      <Footer />
    </div>
  );
}
