import Link from "next/link";
import BrandLogo from "@/components/layout/BrandLogo";
import { ArrowUpRight, Globe, Sparkles } from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-card text-card-foreground border-t-3 border-black dark:border-[#383d45] transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 py-14 md:py-18 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-[1600px] mx-auto w-full">
        {/* Brand Column */}
        <div className="md:col-span-5 space-y-6">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" className="rounded-xl shadow-[3px_3px_0_0_#000]" />
            <div>
              <span className="font-display text-2xl md:text-3xl font-black text-foreground uppercase tracking-tight">
                CAREER<span className="text-secondary dark:text-primary">PILOT</span>
              </span>
              <p className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase">
                Autonomous Career Development Platform
              </p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
            Architected for ambitious students navigating modern tech careers. From AI-driven skill-gap diagnosis and live learning roadmaps to real-world projects and interview simulations.
          </p>

          {/* Socials / External links with tactile neo-brutalist buttons */}
          <div className="flex items-center gap-3 pt-2">
            <a
              href="https://careerpilot.cc"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 bg-background border-2 border-black dark:border-[#383d45] rounded-xl shadow-[3px_3px_0_0_#000] flex items-center justify-center text-foreground transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] hover:bg-primary hover:text-black"
              aria-label="Live Deployment"
              title="Live Deployment"
            >
              <Globe className="w-5 h-5" />
            </a>

            <a
              href="https://github.com/Ishantagarwala/CareerPliot"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 bg-background border-2 border-black dark:border-[#383d45] rounded-xl shadow-[3px_3px_0_0_#000] flex items-center justify-center text-foreground transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] hover:bg-secondary hover:text-white"
              aria-label="GitHub Repository"
              title="GitHub Repository"
            >
              <GithubIcon className="w-5 h-5" />
            </a>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-black dark:border-[#383d45] bg-background rounded-full text-xs font-mono font-bold shadow-[2px_2px_0_0_#000]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>
        </div>

        {/* Navigation Columns */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
          {/* Platform Columns */}
          <div className="space-y-4">
            <h5 className="font-mono text-xs font-extrabold uppercase tracking-widest text-primary bg-black dark:bg-[#272c1d] px-2.5 py-1 rounded border border-black inline-block">
              Engine
            </h5>
            <ul className="space-y-2.5 text-sm font-medium">
              {[
                { label: "Career Discovery", href: "/career" },
                { label: "Learning Roadmaps", href: "/roadmap" },
                { label: "Curated Courses", href: "/courses" },
                { label: "AI Study Hub", href: "/ai-hub" },
                { label: "Mock Interviews", href: "/interview" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground hover:translate-x-1 inline-flex items-center gap-1 transition-all"
                  >
                    <span>{item.label}</span>
                    <ArrowUpRight className="w-3 h-3 opacity-0 hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools & Resources */}
          <div className="space-y-4">
            <h5 className="font-mono text-xs font-extrabold uppercase tracking-widest text-secondary dark:text-cyan bg-black dark:bg-[#272c1d] px-2.5 py-1 rounded border border-black inline-block">
              Career Tools
            </h5>
            <ul className="space-y-2.5 text-sm font-medium">
              {[
                { label: "Resume Builder", href: "/resume" },
                { label: "ATS Resume Score", href: "/resume/ats" },
                { label: "Jobs & Internships", href: "/jobs" },
                { label: "Projects & Hackathons", href: "/projects" },
                { label: "Tech News Feed", href: "/news" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground hover:translate-x-1 inline-flex items-center gap-1 transition-all"
                  >
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Access */}
          <div className="space-y-4 col-span-2 sm:col-span-1">
            <h5 className="font-mono text-xs font-extrabold uppercase tracking-widest text-coral bg-black dark:bg-[#272c1d] px-2.5 py-1 rounded border border-black inline-block">
              Account
            </h5>
            <ul className="space-y-2.5 text-sm font-medium">
              {[
                { label: "Student Dashboard", href: "/dashboard" },
                { label: "Sign In", href: "/login" },
                { label: "Register Free", href: "/register" },
                { label: "Demo Access", href: "/login?demo=true" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground hover:translate-x-1 inline-flex items-center gap-1 transition-all"
                  >
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t-2 border-black dark:border-[#383d45] py-6 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-[1600px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono font-bold text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>© {new Date().getFullYear()} CareerPilot AI. Built for the next generation of engineers.</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-foreground">
            <Sparkles className="w-3.5 h-3.5 text-secondary dark:text-primary" />
            Designed with Modern Neo-Brutalism
          </span>
        </div>
      </div>
    </footer>
  );
}
