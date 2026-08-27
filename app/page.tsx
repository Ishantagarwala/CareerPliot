import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/layout/Footer";
import LandingNav from "@/components/layout/LandingNav";
import { buildHomeJsonLd } from "@/lib/seo";
import { getSiteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

const modules = [
  {
    title: "AI Career Discovery",
    description:
      "Answer intuitive questions about your interests, skills, and goals. Our LLM analyzes your profile to suggest the best career matches.",
    icon: "explore",
  },
  {
    title: "Stage-Wise Roadmaps",
    description:
      "Get personalized, structured learning paths broken into Beginner, Intermediate, and Advanced milestones.",
    icon: "route",
  },
  {
    title: "Course Recommendations",
    description:
      "Access curated, free and paid courses matched to your exact roadmap goals. Save time searching platforms.",
    icon: "school",
  },
  {
    title: "AI Study Hub",
    description:
      "Upload academic PDFs, get structured summaries, generate questions, and chat with your documents.",
    icon: "picture_as_pdf",
  },
  {
    title: "24/7 AI Tutor",
    description:
      "Chat with a specialized tutor that understands your roadmap context. Learn complex topics with instant feedback.",
    icon: "psychology",
  },
  {
    title: "Resume & Job Tools",
    description:
      "Build printable resumes, score them against a hiring rubric, and track applications through every stage.",
    icon: "work",
  },
];

const faqs = [
  {
    q: "How does the AI match careers?",
    a: "Our LLM analyzes your interests, skills, and goals against a massive database of career paths to find your best match.",
  },
  {
    q: "Is the learning roadmap updated?",
    a: "Yes, roadmaps are dynamically generated and updated based on the latest industry standards and course availability.",
  },
  {
    q: "Is Career Pilot free to use?",
    a: "Yes. Create a free account to run career discovery, generate roadmaps, and try AI tutoring. Premium features may be added later.",
  },
  {
    q: "How do I get started?",
    a: "Simply sign up for a free account, complete your initial assessment, and your roadmap will be ready in seconds.",
  },
];

const shell = "w-full max-w-[1200px] mx-auto px-5 sm:px-8";

export default function Home() {
  const siteUrl = getSiteUrl();
  const faqItems = faqs.map(({ q, a }) => ({ q, a }));
  const jsonLd = buildHomeJsonLd(siteUrl, faqItems);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(900px 480px at 78% -10%, var(--glow), transparent 65%), radial-gradient(600px 380px at 8% 110%, oklch(0.72 0.14 70 / 0.1), transparent 60%)",
          }}
        />
        <div className={`relative z-10 pt-14 pb-16 md:pt-20 md:pb-24 ${shell}`}>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-6">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground shadow-soft">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  auto_awesome
                </span>
                AI career guidance, free for students
              </p>
              <h1 className="mb-5 max-w-[22ch] font-display text-[clamp(2.5rem,5.5vw,4.25rem)] font-bold leading-[1.02] tracking-tight text-foreground">
                Know exactly{" "}
                <span className="text-primary">where your career</span> is
                headed.
              </h1>
              <p className="mb-8 max-w-[52ch] text-base leading-relaxed text-muted-foreground md:text-lg">
                Career Pilot turns career anxiety into a plan — smart
                assessments, stage-by-stage roadmaps, an AI tutor that knows
                your goals, resume scoring, and live job tracking in one place.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-semibold text-primary-foreground shadow-lift transition-all hover:-translate-y-0.5 hover:bg-[color-mix(in_oklch,var(--primary),black_6%)] hover:shadow-pop"
                >
                  Get started free
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>
                <Link
                  href="/login?demo=true"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-base font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <span className="material-symbols-outlined text-[20px] text-primary">bolt</span>
                  Try the demo
                </Link>
              </div>
              <p className="mt-5 text-[13px] text-muted-foreground">
                No credit card. Your roadmap in under a minute.
              </p>
            </div>

            {/* Product illustration — built from the system itself */}
            <div className="lg:col-span-6">
              <div className="relative mx-auto max-w-[460px]">
                <div
                  className="pointer-events-none absolute -inset-8 rounded-[2.5rem] opacity-70"
                  aria-hidden
                  style={{
                    background:
                      "radial-gradient(420px 260px at 60% 30%, var(--glow), transparent 70%)",
                  }}
                />
                <div className="relative rounded-3xl border border-border bg-card p-5 shadow-pop">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-[20px]">route</span>
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Frontend Engineer</p>
                        <p className="text-xs text-muted-foreground">Your roadmap · 3 stages</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                      On track
                    </span>
                  </div>

                  <div className="space-y-2.5 py-4">
                    {[
                      { label: "HTML & CSS fundamentals", done: true },
                      { label: "JavaScript deep dive", done: true },
                      { label: "React + component architecture", done: false, current: true },
                      { label: "Testing & deployment", done: false },
                    ].map((step) => (
                      <div
                        key={step.label}
                        className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
                          step.current
                            ? "border-primary/40 bg-primary/[0.06] glow-ai"
                            : "border-border bg-background"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            step.done
                              ? "bg-primary text-primary-foreground"
                              : step.current
                                ? "border-2 border-primary"
                                : "border-2 border-border"
                          }`}
                        >
                          {step.done && (
                            <span className="material-symbols-outlined text-[12px]">check</span>
                          )}
                        </span>
                        <span
                          className={`text-[13px] font-medium ${
                            step.done ? "text-muted-foreground line-through decoration-border" : "text-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                        {step.current && (
                          <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-primary">
                            <span className="h-1.5 w-1.5 animate-cp-pulse rounded-full bg-primary" />
                            Now
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl bg-secondary p-4 text-secondary-foreground">
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined mt-0.5 text-[18px] text-amber">
                        auto_awesome
                      </span>
                      <p className="text-[13px] leading-relaxed">
                        You&apos;re 68% ready for junior frontend roles. Finish
                        the React milestone this week to hit 75%.
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                        <div className="progress-bar-fill h-full w-full rounded-full bg-amber" style={{ transform: "scaleX(0.68)" }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-amber">68%</span>
                    </div>
                  </div>
                </div>

                {/* Floating streak chip */}
                <div className="absolute -right-3 -top-4 hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-lift sm:block">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-amber">local_fire_department</span>
                    <div>
                      <p className="text-sm font-semibold leading-none text-foreground">12-day</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">study streak</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="shrink-0 overflow-hidden border-y border-border bg-secondary py-3.5">
        <div className="flex whitespace-nowrap animate-marquee text-sm font-semibold uppercase tracking-[0.14em] text-secondary-foreground md:text-base">
          <span className="mx-6">
            AI Career Discovery · Stage-Wise Roadmaps · Course Recommendations ·
            AI Study Hub · 24/7 AI Tutor · Progress Dashboard ·
          </span>
          <span className="mx-6" aria-hidden>
            AI Career Discovery · Stage-Wise Roadmaps · Course Recommendations ·
            AI Study Hub · 24/7 AI Tutor · Progress Dashboard ·
          </span>
        </div>
      </div>

      {/* Discovery — three steps */}
      <section id="discovery" className="scroll-mt-20">
        <div className={`py-16 md:py-24 ${shell}`}>
          <div className="mb-10 max-w-2xl md:mb-14">
            <h2 className="mb-3 font-display text-[clamp(1.6rem,3vw,2.5rem)] font-bold leading-tight tracking-tight">
              From confused to{" "}
              <span className="text-primary">committed</span> in three moves.
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              Most students don&apos;t lack ambition — they lack a sequence.
              Career Pilot builds it for you.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift md:p-7">
              <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[22px]">explore</span>
              </span>
              <h3 className="mb-2 text-lg font-semibold tracking-tight">Career Discovery</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Submit interests and skills to surface the career matches you
                actually fit — with reasons, not vibes.
              </p>
            </div>
            <div className="relative rounded-2xl border border-primary/25 bg-primary p-6 text-primary-foreground shadow-lift transition-all duration-300 hover:-translate-y-1 hover:shadow-pop md:p-7">
              <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                <span className="material-symbols-outlined text-[22px]">route</span>
              </span>
              <h3 className="mb-2 text-lg font-semibold tracking-tight">Learning Roadmap</h3>
              <p className="mb-5 text-sm leading-relaxed text-primary-foreground/85">
                Follow structural milestones across Beginner, Intermediate and
                Advanced levels — always knowing what&apos;s next.
              </p>
              <div className="rounded-xl bg-white/10 p-3">
                <div className="mb-1.5 flex justify-between text-[11px] font-semibold uppercase tracking-wide">
                  <span>Progress</span>
                  <span className="tabular-nums">66%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-black/20">
                  <div className="progress-bar-fill h-full w-full rounded-full bg-white" style={{ transform: "scaleX(0.66)" }} />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift md:p-7">
              <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <span className="material-symbols-outlined text-[22px]">psychology</span>
              </span>
              <h3 className="mb-2 text-lg font-semibold tracking-tight">Knowledge Boost</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Upload syllabus, interrogate documents, ask the AI tutor
                anything, and keep your streak alive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="scroll-mt-20 border-t border-border bg-sidebar/50">
        <div className={`py-16 md:py-24 ${shell}`}>
          <div className="mb-10 max-w-2xl md:mb-14">
            <h2 className="mb-3 font-display text-[clamp(1.6rem,3vw,2.5rem)] font-bold leading-tight tracking-tight">
              One platform,{" "}
              <span className="rounded-lg bg-primary px-2.5 py-0.5 text-primary-foreground">
                six modules
              </span>
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              Everything you need to discover your path and build your skills —
              without six subscriptions.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-5">
            {modules.map((m, idx) => {
              const featured = idx === 0;
              return (
                <div
                  key={m.title}
                  className={
                    featured
                      ? "group flex flex-col justify-between rounded-2xl border border-border bg-card p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift lg:col-span-2 lg:row-span-2 md:p-8"
                      : "group rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift md:p-7"
                  }
                >
                  <div>
                    <span className={`mb-5 flex items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground ${featured ? "h-14 w-14" : "h-11 w-11"}`}>
                      <span className={`material-symbols-outlined ${featured ? "text-[28px]" : "text-[22px]"}`}>{m.icon}</span>
                    </span>
                    <h3 className={`mb-2 font-semibold tracking-tight text-foreground ${featured ? "font-display text-2xl md:text-3xl" : "text-lg"}`}>
                      {m.title}
                    </h3>
                    <p className={`leading-relaxed text-muted-foreground ${featured ? "text-base max-w-[42ch]" : "text-sm"}`}>
                      {m.description}
                    </p>
                  </div>
                  {featured && (
                    <p className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      Start with discovery
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20">
        <div className={`py-16 md:py-24 ${shell}`}>
          <div className="mb-10 max-w-2xl md:mb-14">
            <h2 className="mb-3 font-display text-[clamp(1.6rem,3vw,2.5rem)] font-bold leading-tight tracking-tight">
              Questions, answered.
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              Everything you need to know about navigating your career with AI
              precision.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            {faqs.map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-colors hover:border-primary/40 md:p-7"
              >
                <h3 className="mb-3 flex items-start gap-2.5 text-base font-semibold tracking-tight text-foreground">
                  <span className="material-symbols-outlined mt-0.5 text-[18px] text-primary">help</span>
                  {item.q}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="relative scroll-mt-20 overflow-hidden border-t border-border bg-secondary">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(720px 340px at 50% 120%, var(--glow), transparent 70%)",
          }}
        />
        <div className={`relative py-16 text-center md:py-24 ${shell}`}>
          <h2 className="mx-auto mb-4 max-w-[24ch] font-display text-[clamp(1.7rem,3.2vw,2.75rem)] font-bold leading-tight tracking-tight text-secondary-foreground">
            Ready to take control of your future?
          </h2>
          <p className="mx-auto mb-8 max-w-md text-base leading-relaxed text-secondary-foreground/75">
            Create an account today and experience AI-guided career mapping.
          </p>
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lift transition-all hover:-translate-y-0.5 hover:shadow-pop"
          >
            Sign up now
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
