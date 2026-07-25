import Link from "next/link";
import Footer from "@/components/layout/Footer";

const modules = [
  {
    title: "AI Career Discovery",
    description:
      "Answer intuitive questions about your interests, skills, and goals. Our LLM analyzes your profile to suggest the best career matches.",
    icon: "explore",
    iconBg: "bg-primary",
  },
  {
    title: "Stage-Wise Roadmaps",
    description:
      "Get personalized, structured learning paths broken into Beginner, Intermediate, and Advanced milestones.",
    icon: "map",
    iconBg: "bg-cyan",
  },
  {
    title: "Course Recommendations",
    description:
      "Access curated, free and paid courses matched to your exact roadmap goals. Save time searching platforms.",
    icon: "school",
    iconBg: "bg-white",
  },
  {
    title: "AI PDF Note Assistant",
    description:
      "Upload academic syllabus, notes, or textbooks. Get structured summaries, instant flashcards, and quizzes.",
    icon: "picture_as_pdf",
    iconBg: "bg-[#dde1ff]",
  },
  {
    title: "24/7 AI Tutor Chat",
    description:
      "Chat with a specialized tutor that understands your roadmap context. Learn complex topics with instant feedback.",
    icon: "psychology",
    iconBg: "bg-primary",
  },
  {
    title: "Progress Dashboard",
    description:
      "Track milestones completed, courses taken, files analyzed, and keep your daily learning streak alive.",
    icon: "dashboard",
    iconBg: "bg-cyan",
  },
];

const faqs = [
  {
    n: "01",
    q: "How does the AI match careers?",
    a: "Our LLM analyzes your interests, skills, and goals against a massive database of career paths to find your 96% match.",
    nColor: "text-primary",
    hover: "hover:bg-primary",
  },
  {
    n: "02",
    q: "Is the learning roadmap updated?",
    a: "Yes, roadmaps are dynamically generated and updated based on the latest industry standards and course availability.",
    nColor: "text-cyan",
    hover: "hover:bg-cyan",
  },
  {
    n: "03",
    q: "What frameworks are supported?",
    a: "The platform is built for React and Next.js, ensuring a snappy and modern experience.",
    nColor: "text-[#dde1ff]",
    hover: "hover:bg-[#dde1ff]",
  },
  {
    n: "04",
    q: "How do I get started?",
    a: "Simply sign up for a free account, complete your initial assessment, and your roadmap will be ready in seconds.",
    nColor: "text-primary",
    hover: "hover:bg-primary",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <nav className="bg-background border-b-4 border-black sticky top-0 z-50">
        <div className="flex justify-between items-center h-20 px-4 md:px-16 max-w-[1280px] mx-auto w-full">
          <Link
            href="/"
            className="font-display text-2xl md:text-[32px] font-extrabold uppercase tracking-tighter text-primary"
          >
            CAREER PILOT
          </Link>
          <div className="hidden md:flex gap-8 items-center">
            <a
              href="#discovery"
              className="text-primary font-label text-sm font-bold border-b-4 border-primary translate-y-1"
            >
              Discovery
            </a>
            <a
              href="#modules"
              className="text-foreground/80 hover:text-primary transition-colors font-label text-sm font-bold"
            >
              Roadmap
            </a>
            <a
              href="#faq"
              className="text-foreground/80 hover:text-primary transition-colors font-label text-sm font-bold"
            >
              Tutors
            </a>
            <a
              href="#cta"
              className="text-foreground/80 hover:text-primary transition-colors font-label text-sm font-bold"
            >
              About
            </a>
          </div>
          <div className="flex gap-3 md:gap-4 items-center">
            <Link
              href="/login"
              className="hidden sm:block font-label text-sm font-bold text-foreground/80 hover:text-primary transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center bg-[#88aaee] text-black px-5 md:px-6 py-2 border-2 border-black shadow-[4px_4px_0_0_#000] rounded-[5px] font-label text-sm font-bold transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-16 md:pt-20 pb-24 md:pb-32 overflow-hidden px-4 md:px-16 max-w-[1280px] mx-auto w-full">
        <div className="absolute top-20 right-0 opacity-20 pointer-events-none hidden lg:block">
          <span
            className="material-symbols-outlined text-[300px] text-primary"
            style={{ fontVariationSettings: "'wght' 700" }}
          >
            auto_awesome
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          <div className="lg:col-span-7 animate-fade-in-up">
            <div className="inline-block bg-cyan text-black px-4 py-1 border-2 border-black neo-shadow mb-6 font-label text-sm font-bold -rotate-2">
              AI-POWERED CAREER PLANNING
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[72px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white mb-8">
              Chart Your Perfect Career with{" "}
              <span className="text-primary">Precision</span>
            </h1>
            <p className="text-lg text-[color:var(--on-surface-variant)] max-w-2xl mb-10 leading-relaxed">
              Unlock a tailored experience designed for your aspirations. Complete
              smart assessments, receive stage-by-stage learning paths, access
              courses, study PDFs, and learn with an AI Tutor.
            </p>
            <div className="flex flex-wrap gap-4 md:gap-6">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-[#88aaee] text-black px-8 py-4 border-2 border-black shadow-[4px_4px_0_0_#000] rounded-[5px] font-display text-xl md:text-2xl font-bold transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                Get Started Free
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <Link
                href="/login?demo=true"
                className="inline-flex items-center justify-center gap-2 bg-primary text-black px-8 py-4 border-2 border-black shadow-[4px_4px_0_0_#000] rounded-[5px] font-display text-xl md:text-2xl font-bold transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                Demo Login
                <span className="material-symbols-outlined">bolt</span>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 relative mt-12 lg:mt-0 animate-fade-in-up delay-200">
            <div className="relative bg-white border-4 border-black neo-shadow-lg p-6 rotate-2 z-20">
              <div className="flex justify-between items-center mb-4">
                <div className="bg-primary h-4 w-24 border-2 border-black" />
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500 border-2 border-black" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400 border-2 border-black" />
                  <div className="h-3 w-3 rounded-full bg-green-500 border-2 border-black" />
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="w-full h-64 md:h-80 object-cover border-4 border-black"
                alt="Student planning a career with AI-assisted tools"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBG5HwMkaocv0bhOXCp8zI-tF9SsOA-XpBGQcIzV8lls6fOsF2UOgnCh7DscvwjJ_RZslQP3CdDwiANwN7Xw7RnyP_jF37iXDuDiisUXGjZphdz7uJpslmPxf9jG95eXAgr5EEMSOf-KIjyE-BcYqG_TBYVHoEW_YcZtMHaZ3x24Ojl7sWOuuSZEuJI8J8HWqnogKg0Mu74mdEjTYIO4ljsfH3VNbEtW3VKIpVA88PV-eZ5Wuhakanv4w"
              />
              <div className="absolute -bottom-6 -right-6 bg-cyan text-black p-4 border-4 border-black neo-shadow font-label text-center">
                <div className="text-2xl font-bold">96%</div>
                <div className="text-[10px] uppercase font-bold">Match Score</div>
              </div>
            </div>
            <div className="absolute -top-10 -left-6 sticker text-primary -rotate-12 hidden sm:block">
              <span
                className="material-symbols-outlined text-7xl md:text-8xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-primary py-6 border-y-4 border-black overflow-hidden flex items-center">
        <div className="flex whitespace-nowrap animate-marquee font-display text-xl md:text-[32px] font-bold text-black uppercase tracking-widest">
          <span className="mx-8">
            AI Career Discovery * Stage-Wise Roadmaps * Course Recommendations *
            AI PDF Note Assistant * 24/7 AI Tutor Chat * Progress Dashboard *
          </span>
          <span className="mx-8">
            AI Career Discovery * Stage-Wise Roadmaps * Course Recommendations *
            AI PDF Note Assistant * 24/7 AI Tutor Chat * Progress Dashboard *
          </span>
        </div>
      </div>

      <section
        id="discovery"
        className="py-20 md:py-24 px-4 md:px-16 max-w-[1280px] mx-auto w-full bg-[#191d10]"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#dde1ff] text-[#001356] p-8 border-4 border-black neo-shadow transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
            <div className="flex justify-between items-start mb-6">
              <span className="font-display text-4xl md:text-5xl font-extrabold opacity-30">
                01
              </span>
              <span className="material-symbols-outlined text-4xl">explore</span>
            </div>
            <h3 className="font-display text-2xl md:text-[32px] font-bold mb-4">
              Career Discovery
            </h3>
            <p className="opacity-80 leading-relaxed">
              Submit interests & skills to extract prime AI career matches.
            </p>
          </div>
          <div className="bg-primary text-black p-8 border-4 border-black neo-shadow md:translate-y-4 transition-all hover:translate-x-0.5 hover:translate-y-[18px] hover:shadow-none">
            <div className="flex justify-between items-start mb-6">
              <span className="font-display text-4xl md:text-5xl font-extrabold opacity-30">
                02
              </span>
              <span className="material-symbols-outlined text-4xl">map</span>
            </div>
            <h3 className="font-display text-2xl md:text-[32px] font-bold mb-4">
              Learning Roadmap
            </h3>
            <p className="opacity-80 leading-relaxed">
              Follow structural milestones across Beginner, Intermediate & Advanced
              levels.
            </p>
            <div className="mt-6 bg-black/10 p-2 border-2 border-black">
              <div className="flex justify-between text-[10px] font-bold mb-1 font-label">
                <span>PROGRESS</span>
                <span>66%</span>
              </div>
              <div className="w-full bg-black/20 h-3 border border-black">
                <div className="bg-black h-full" style={{ width: "66%" }} />
              </div>
            </div>
          </div>
          <div className="bg-[#e2e2e2] text-[#1a1c1c] p-8 border-4 border-black neo-shadow transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
            <div className="flex justify-between items-start mb-6">
              <span className="font-display text-4xl md:text-5xl font-extrabold opacity-30">
                03
              </span>
              <span className="material-symbols-outlined text-4xl">psychology</span>
            </div>
            <h3 className="font-display text-2xl md:text-[32px] font-bold mb-4">
              Knowledge Boost
            </h3>
            <p className="opacity-80 leading-relaxed">
              Upload syllabus, ask questions to our AI Tutor, and track courses.
            </p>
          </div>
        </div>
      </section>

      <section
        id="modules"
        className="py-24 md:py-32 px-4 md:px-16 max-w-[1280px] mx-auto w-full"
      >
        <div className="text-center mb-16 md:mb-24 relative">
          <h2 className="font-display text-3xl md:text-5xl lg:text-[72px] font-extrabold mb-4 leading-tight">
            One Unified Platform,{" "}
            <span className="bg-cyan text-black px-3 md:px-4 border-4 border-black inline-block rotate-1">
              Six Core Modules
            </span>
          </h2>
          <p className="text-lg text-[color:var(--on-surface-variant)] max-w-3xl mx-auto">
            Everything you need to successfully discover your path and build your
            skills.
          </p>
          <div className="absolute -top-12 right-0 sticker hidden lg:block">
            <span className="material-symbols-outlined text-primary text-7xl">
              grading
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {modules.map((m) => (
            <div
              key={m.title}
              className="bg-card p-8 border-4 border-black neo-shadow flex flex-col items-start hover:bg-[#272c1d] transition-colors group"
            >
              <div
                className={`w-16 h-16 ${m.iconBg} border-4 border-black flex items-center justify-center mb-8 group-hover:-translate-y-2 transition-transform`}
              >
                <span className="material-symbols-outlined text-black text-3xl">
                  {m.icon}
                </span>
              </div>
              <h3 className="font-display text-2xl md:text-[32px] font-bold mb-4">
                {m.title}
              </h3>
              <p className="text-[color:var(--on-surface-variant)] flex-grow leading-relaxed">
                {m.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="faq"
        className="py-24 md:py-32 px-4 md:px-16 max-w-[1280px] mx-auto w-full"
      >
        <div className="text-center mb-16 md:mb-20">
          <h2 className="font-display text-3xl md:text-5xl lg:text-[72px] font-extrabold mb-4 uppercase tracking-tighter">
            FAQs
          </h2>
          <p className="text-lg text-[color:var(--on-surface-variant)] max-w-2xl mx-auto">
            Everything you need to know about navigating your career with AI
            precision.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {faqs.map((item) => (
            <div
              key={item.n}
              className={`bg-[#191d10] p-8 border-4 border-black neo-shadow group transition-colors ${item.hover}`}
            >
              <div className="flex items-start gap-4 mb-4">
                <span
                  className={`font-display text-4xl font-extrabold ${item.nColor} group-hover:text-black`}
                >
                  {item.n}
                </span>
                <h3 className="font-display text-xl md:text-2xl font-bold text-white group-hover:text-black">
                  {item.q}
                </h3>
              </div>
              <p className="text-[color:var(--on-surface-variant)] group-hover:text-black/80 leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="cta" className="py-24 md:py-32 bg-cyan border-y-4 border-black">
        <div className="px-4 md:px-16 max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-5xl font-extrabold text-black mb-8">
            Ready to Take Control of Your Future?
          </h2>
          <p className="text-lg text-black mb-12 opacity-80">
            Create an account today and experience AI-guided career mapping.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center bg-black text-white px-12 py-5 border-2 border-black shadow-[4px_4px_0_0_#000] rounded-[5px] font-display text-2xl font-bold transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
          >
            Sign Up Now
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
