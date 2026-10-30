"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Sun, Moon, ArrowRight, Sparkles, LayoutDashboard } from "lucide-react";
import BrandLogo from "@/components/layout/BrandLogo";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Interactive Demo", href: "#showcase" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Roadmaps", href: "#roadmap-showcase" },
  { label: "FAQ", href: "#faq" },
];

const shell = "w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-12 xl:px-16";

export default function LandingNav({
  showDemoLogin = false,
}: {
  /** Server-gated via DEMO_MODE — hidden when demo login is disabled. */
  showDemoLogin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isAuthenticated = status === "authenticated";
  const isDark = theme === "dark";

  return (
    <>
      <header className="bg-background/95 backdrop-blur-md border-b-2 md:border-b-[3px] border-black dark:border-[#383d45] sticky top-0 z-50 transition-colors">
        <div className={`flex justify-between items-center h-16 md:h-20 ${shell}`}>
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink min-w-0">
            <BrandLogo size="sm" className="sm:hidden rounded-lg shadow-[2px_2px_0_0_#000] shrink-0" />
            <BrandLogo size="md" className="hidden sm:inline-block rounded-lg shadow-[3px_3px_0_0_#000] shrink-0 group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-[1px_1px_0_0_#000] transition-all" />
            <div className="flex flex-col min-w-0">
              <span className="font-display text-lg sm:text-2xl font-black tracking-tight text-foreground uppercase leading-none truncate">
                Career<span className="text-secondary dark:text-primary">Pilot</span>
              </span>
              <span className="hidden xs:flex text-[9px] sm:text-[10px] font-mono font-bold tracking-wider uppercase text-muted-foreground mt-0.5 items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block shrink-0" />
                AI Career Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 bg-muted/60 dark:bg-card px-3 py-1.5 rounded-full border-2 border-black dark:border-[#383d45] shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#000]">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wide text-foreground/85 hover:text-black hover:bg-primary transition-all duration-150"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Theme Toggle */}
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-lg border-2 border-black dark:border-[#383d45] bg-card text-foreground shadow-[2px_2px_0_0_#000] sm:shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none flex items-center justify-center transition-all cursor-pointer"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-primary animate-pulse" />
                ) : (
                  <Moon className="w-4 h-4 text-foreground" />
                )}
              </button>
            )}

            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 bg-primary text-black px-2.5 sm:px-5 py-2 sm:py-2.5 border-2 border-black shadow-[2px_2px_0_0_#000] sm:shadow-[3px_3px_0_0_#000] rounded-lg font-mono text-xs sm:text-sm font-bold tracking-wide hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all shrink-0"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span className="hidden xs:inline">Dashboard</span>
              </Link>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {showDemoLogin && (
                  <Link
                    href="/login?demo=true"
                    className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-secondary text-white rounded-lg font-mono text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Demo</span>
                  </Link>
                )}
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center justify-center px-4 py-2 border-2 border-black dark:border-[#383d45] bg-card text-foreground rounded-lg font-mono text-xs sm:text-sm font-bold shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1 bg-primary text-black px-2.5 sm:px-5 py-2 sm:py-2.5 border-2 border-black shadow-[2px_2px_0_0_#000] sm:shadow-[4px_4px_0_0_#000] rounded-lg font-mono text-xs sm:text-sm font-bold uppercase tracking-wide hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all group shrink-0"
                >
                  <span className="hidden sm:inline">Build My Path</span>
                  <span className="sm:hidden">Join</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="lg:hidden flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 shrink-0 border-2 border-black dark:border-[#383d45] bg-card text-foreground shadow-[2px_2px_0_0_#000] sm:shadow-[3px_3px_0_0_#000] hover:bg-primary hover:text-black transition-all rounded-lg cursor-pointer"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined text-[20px] sm:text-[22px]">menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* Mobile Drawer */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-[70] flex h-full w-[min(22rem,88vw)] flex-col bg-background border-l-3 border-black dark:border-[#383d45] p-6 transition-transform duration-300 ease-out shadow-2xl",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between pb-4 border-b-2 border-black dark:border-[#383d45]">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" className="rounded-md shadow-[2px_2px_0_0_#000]" />
            <span className="font-display text-lg font-black uppercase text-foreground">
              Menu
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center h-9 w-9 border-2 border-black dark:border-[#383d45] bg-card text-foreground hover:bg-destructive hover:text-white transition-colors rounded-lg shadow-[2px_2px_0_0_#000]"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <nav className="flex flex-col gap-2.5 my-6 flex-1 overflow-y-auto">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="font-mono text-sm font-bold uppercase px-4 py-3 border-2 border-black dark:border-[#383d45] bg-card hover:bg-primary hover:text-black transition-colors rounded-lg shadow-[3px_3px_0_0_#000]"
            >
              {link.label}
            </a>
          ))}
          {isAuthenticated && (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="font-mono text-sm font-bold uppercase px-4 py-3 border-2 border-black bg-primary text-black rounded-lg shadow-[3px_3px_0_0_#000] flex items-center justify-between"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </nav>

        <div className="flex flex-col gap-3 pt-6 border-t-2 border-black dark:border-[#383d45]">
          {!isAuthenticated && (
            <>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="font-mono text-sm font-bold text-center px-4 py-3 border-2 border-black dark:border-[#383d45] bg-card hover:bg-muted transition-colors rounded-lg shadow-[3px_3px_0_0_#000]"
              >
                Log In
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="font-mono text-sm font-bold text-center px-4 py-3 border-2 border-black bg-primary text-black shadow-[4px_4px_0_0_#000] rounded-lg hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Create Free Account
              </Link>
              {showDemoLogin && (
                <Link
                  href="/login?demo=true"
                  onClick={() => setOpen(false)}
                  className="font-mono text-sm font-bold text-center px-4 py-3 border-2 border-black bg-secondary text-white shadow-[4px_4px_0_0_#000] rounded-lg hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Demo Login (Instant)</span>
                </Link>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
