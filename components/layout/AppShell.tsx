"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { name: "Career Discovery", href: "/career", icon: "explore" },
  { name: "Learning Roadmap", href: "/roadmap", icon: "map" },
  { name: "Course Recommendations", href: "/courses", icon: "school" },
  { name: "AI Study Hub", href: "/ai-hub", icon: "auto_awesome" },
  { name: "Resume Builder", href: "/resume", icon: "description" },
  { name: "Resume Score", href: "/resume/ats", icon: "military_tech" },
  { name: "Jobs & Internships", href: "/jobs", icon: "work" },
  { name: "Projects & Hackathons", href: "/projects", icon: "hub" },
  { name: "Study With Me", href: "/study", icon: "group" },
  { name: "Tech News", href: "/news", icon: "newspaper" },
];

const bottomItems = [{ name: "Profile", href: "/profile", icon: "person" }];

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isDark = theme === "dark";

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar — always visible */}
      <header className="fixed top-0 inset-x-0 z-50 flex h-14 md:h-16 items-center justify-between gap-4 px-4 md:px-6 bg-background border-b-2 border-black">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="shrink-0 flex items-center justify-center h-10 w-10 border-2 border-black bg-card hover:bg-primary transition-colors"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="hidden sm:flex w-8 h-8 bg-primary border-2 border-black items-center justify-center text-primary-foreground font-display font-extrabold text-sm select-none shrink-0">
              C
            </div>
            <div className="min-w-0">
              <h1 className="text-sm md:text-base font-display font-extrabold text-primary tracking-tight leading-none uppercase truncate">
                Career Pilot
              </h1>
              <p className="hidden sm:block text-[9px] text-muted-foreground uppercase tracking-[0.15em] font-label font-bold mt-1">
                Bold Growth
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex items-center justify-center h-10 w-10 border-2 border-black bg-card hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              <div className="relative w-5 h-5">
                <Sun
                  className={cn(
                    "absolute inset-0 w-5 h-5 transition-all duration-300",
                    isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                  )}
                />
                <Moon
                  className={cn(
                    "absolute inset-0 w-5 h-5 transition-all duration-300",
                    isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
                  )}
                />
              </div>
            </button>
          )}
          {session?.user?.name && (
            <div className="hidden sm:flex h-10 w-10 border-2 border-black bg-primary items-center justify-center font-display font-bold text-sm text-primary-foreground">
              {session.user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </header>

      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200",
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />

      {/* Hamburger drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-[70] flex h-full w-[min(20rem,88vw)] flex-col bg-sidebar border-r-4 border-black py-6 transition-transform duration-300 ease-out",
          menuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!menuOpen}
      >
        <div className="px-5 mb-6 pb-5 border-b-2 border-black flex items-start justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
            <div className="w-10 h-10 bg-primary border-2 border-black neo-shadow flex items-center justify-center text-primary-foreground font-display font-extrabold text-lg select-none shrink-0">
              C
            </div>
            <div>
              <h2 className="text-base font-display font-extrabold text-primary tracking-tight leading-none uppercase">
                Career Pilot
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-label font-bold mt-1.5">
                Bold Growth
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="shrink-0 flex items-center justify-center h-9 w-9 border-2 border-black bg-card hover:bg-primary transition-colors"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 px-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-2",
                  isActive
                    ? "bg-primary text-primary-foreground border-black"
                    : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:border-black/40"
                )}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "13px",
                  letterSpacing: "0.04em",
                }}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-[20px]",
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                  style={
                    isActive
                      ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
                      : undefined
                  }
                >
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-2 flex flex-col gap-0.5 pt-4 border-t-2 border-black mx-3">
          {bottomItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-2",
                  isActive
                    ? "bg-primary text-primary-foreground border-black"
                    : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "13px",
                  letterSpacing: "0.04em",
                }}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 px-4 py-3 border-2 border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground text-sm w-full text-left cursor-pointer transition-colors"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "13px",
              letterSpacing: "0.04em",
            }}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content — full width */}
      <main className="pt-14 md:pt-16 min-h-screen overflow-y-auto">
        <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-5 md:py-7">
          {children}
        </div>
      </main>
    </div>
  );
}
