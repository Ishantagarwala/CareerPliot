import Link from "next/link";
import Footer from "@/components/layout/Footer";
import LandingNav from "@/components/layout/LandingNav";
import BrandLogo from "@/components/layout/BrandLogo";

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
    a: "Our LLM analyzes your interests, skills, and goals against a massive database of career paths to find your best match.",
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

const shell = "w-full max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingNav />

      {/* Hero fills viewport above the marquee */}
      <section className="relative flex flex-col justify-center min-h-[calc(100svh-4.5rem-3.5rem)] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />
        <div
          className={`relative z-10 py-10 md:py-14 ${shell} grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center`}
        >
          <div className="lg:col-span-7">
            <div className="mb-5 md:mb-6 flex items-center gap-3 md:gap-4">
              <BrandLogo size="lg" className="h-14 w-14 md:h-16 md:w-16 border-4" />
              <p className="font-display text-[clamp(2.75rem,8vw,7.5rem)] font-extrabold uppercase leading-[0.9] tracking-tighter text-primary">
                Career Pilot
              </p>
            </div>
            <h1 className="font-display text-[clamp(1.75rem,4.2vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight text-foreground max-w-[22ch] mb-4 md:mb-5">
              Chart your path with{" "}
              <span className="text-primary">precision</span>
            </h1>
            <p className="text-base md:text-lg text-[color:var(--on-surface-variant)] max-w-xl mb-7 md:mb-8 leading-relaxed">
              Smart assessments, stage-by-stage roadmaps, courses, PDF study tools,
              and an AI tutor — one place to plan and build your career.
            </p>
            <div className="flex flex-wrap gap-3 md:gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-[#88aaee] text-black px-6 md:px-8 py-3 md:py-3.5 border-2 border-black shadow-[4px_4px_0_0_#000] rounded-[5px] font-display text-lg md:text-xl font-bold transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                Get Started Free
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <Link
                href="/login?demo=true"
                className="inline-flex items-center justify-center gap-2 bg-primary text-black px-6 md:px-8 py-3 md:py-3.5 border-2 border-black shadow-[4px_4px_0_0_#000] rounded-[5px] font-display text-lg md:text-xl font-bold transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                Demo Login
                <span className="material-symbols-outlined">bolt</span>
              </Link>
            </div>
          </div>

          {/* Typographic feature stack — fills the empty right side without a stock mockup */}
          <div className="lg:col-span-5 hidden lg:block">
            <ul className="border-4 border-black bg-card divide-y-4 divide-black shadow-[8px_8px_0_0_#000]">
              {[
                { n: "01", label: "Discover your match" },
                { n: "02", label: "Build a live roadmap" },
                { n: "03", label: "Learn with AI tools" },
                { n: "04", label: "Ship resumes & jobs" },
              ].map((step) => (
                <li
                  key={step.n}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-primary transition-colors group"
                >
                  <span className="font-display text-2xl font-extrabold text-primary group-hover:text-black tabular-nums">
                    {step.n}
                  </span>
                  <span className="font-display text-xl font-bold text-foreground group-hover:text-black">
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="bg-primary py-3.5 md:py-4 border-y-4 border-black overflow-hidden flex items-center shrink-0">
        <div className="flex whitespace-nowrap animate-marquee font-display text-base md:text-2xl font-bold text-black uppercase tracking-widest">
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

      <section id="discovery" className="bg-[#191d10] border-b-4 border-black">
        <div className={`py-12 md:py-16 ${shell}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            <div className="bg-[#dde1ff] text-[#001356] p-6 md:p-7 border-4 border-black neo-shadow transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
              <div className="flex justify-between items-start mb-4">
                <span className="font-display text-3xl md:text-4xl font-extrabold opacity-30">
                  01
                </span>
                <span className="material-symbols-outlined text-3xl">explore</span>
              </div>
              <h3 className="font-display text-xl md:text-2xl font-bold mb-2">
                Career Discovery
              </h3>
              <p className="opacity-80 leading-relaxed text-sm md:text-base">
                Submit interests & skills to extract prime AI career matches.
              </p>
            </div>
            <div className="bg-primary text-black p-6 md:p-7 border-4 border-black neo-shadow md:translate-y-3 transition-all hover:translate-x-0.5 hover:translate-y-[14px] hover:shadow-none">
              <div className="flex justify-between items-start mb-4">
                <span className="font-display text-3xl md:text-4xl font-extrabold opacity-30">
                  02
                </span>
                <span className="material-symbols-outlined text-3xl">map</span>
              </div>
              <h3 className="font-display text-xl md:text-2xl font-bold mb-2">
                Learning Roadmap
              </h3>
              <p className="opacity-80 leading-relaxed text-sm md:text-base">
                Follow structural milestones across Beginner, Intermediate & Advanced
                levels.
              </p>
              <div className="mt-4 bg-black/10 p-2 border-2 border-black">
                <div className="flex justify-between text-[10px] font-bold mb-1 font-label">
                  <span>PROGRESS</span>
                  <span>66%</span>
                </div>
                <div className="w-full bg-black/20 h-3 border border-black">
                  <div className="bg-black h-full" style={{ width: "66%" }} />
                </div>
              </div>
            </div>
            <div className="bg-[#e2e2e2] text-[#1a1c1c] p-6 md:p-7 border-4 border-black neo-shadow transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
              <div className="flex justify-between items-start mb-4">
                <span className="font-display text-3xl md:text-4xl font-extrabold opacity-30">
                  03
                </span>
                <span className="material-symbols-outlined text-3xl">psychology</span>
              </div>
              <h3 className="font-display text-xl md:text-2xl font-bold mb-2">
                Knowledge Boost
              </h3>
              <p className="opacity-80 leading-relaxed text-sm md:text-base">
                Upload syllabus, ask questions to our AI Tutor, and track courses.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="py-14 md:py-20">
        <div className={shell}>
          <div className="mb-10 md:mb-12 max-w-4xl">
            <h2 className="font-display text-[clamp(1.75rem,3.5vw,3.25rem)] font-extrabold mb-3 leading-tight">
              One unified platform,{" "}
              <span className="bg-cyan text-black px-2 border-2 border-black inline-block">
                six modules
              </span>
            </h2>
            <p className="text-base md:text-lg text-[color:var(--on-surface-variant)] max-w-2xl">
              Everything you need to discover your path and build your skills.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
            {modules.map((m) => (
              <div
                key={m.title}
                className="bg-card p-6 md:p-7 border-4 border-black neo-shadow flex flex-col items-start hover:bg-[#272c1d] transition-colors group"
              >
                <div
                  className={`w-12 h-12 md:w-14 md:h-14 ${m.iconBg} border-4 border-black flex items-center justify-center mb-5 group-hover:-translate-y-1 transition-transform`}
                >
                  <span className="material-symbols-outlined text-black text-2xl">
                    {m.icon}
                  </span>
                </div>
                <h3 className="font-display text-xl md:text-2xl font-bold mb-2 text-foreground group-hover:text-[#f4f6e8]">
                  {m.title}
                </h3>
                <p className="text-sm md:text-base text-[color:var(--on-surface-variant)] group-hover:text-[#c3caac] flex-grow leading-relaxed">
                  {m.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-14 md:py-20 border-t-4 border-black">
        <div className={shell}>
          <div className="mb-10 md:mb-12 max-w-3xl">
            <h2 className="font-display text-[clamp(1.75rem,3.5vw,3.25rem)] font-extrabold mb-3 uppercase tracking-tighter">
              FAQs
            </h2>
            <p className="text-base md:text-lg text-[color:var(--on-surface-variant)]">
              Everything you need to know about navigating your career with AI
              precision.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {faqs.map((item) => (
              <div
                key={item.n}
                className={`bg-[#191d10] p-6 md:p-7 border-4 border-black neo-shadow group transition-colors ${item.hover}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span
                    className={`font-display text-3xl font-extrabold ${item.nColor} group-hover:text-black`}
                  >
                    {item.n}
                  </span>
                  <h3 className="font-display text-lg md:text-xl font-bold text-[#f4f6e8] group-hover:text-black pt-1">
                    {item.q}
                  </h3>
                </div>
                <p className="text-sm md:text-base text-[#c3caac] group-hover:text-black/80 leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="py-14 md:py-20 bg-cyan border-y-4 border-black">
        <div className={`${shell} max-w-[1600px] text-center`}>
          <h2 className="font-display text-[clamp(1.75rem,3.5vw,3rem)] font-extrabold text-black mb-4">
            Ready to take control of your future?
          </h2>
          <p className="text-base md:text-lg text-black mb-8 opacity-80 max-w-xl mx-auto">
            Create an account today and experience AI-guided career mapping.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center bg-black text-[#ffffff] px-10 py-4 border-2 border-black shadow-[4px_4px_0_0_#000] rounded-[5px] font-display text-xl font-bold transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
          >
            Sign Up Now
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
