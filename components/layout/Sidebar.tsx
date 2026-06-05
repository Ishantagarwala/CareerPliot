"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

interface SidebarProps {
  className?: string;
}

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { name: "Career Discovery", href: "/career", icon: "explore" },
  { name: "Learning Roadmap", href: "/roadmap", icon: "map" },
  { name: "Course Recommendations", href: "/courses", icon: "school" },
  { name: "AI PDF Assistant", href: "/pdf", icon: "picture_as_pdf" },
  { name: "AI Tutor", href: "/tutor", icon: "psychology" },
  { name: "Profile", href: "/profile", icon: "person" },
  { name: "Study With Me", href: "/study", icon: "group" },
  { name: "Tech News", href: "/news", icon: "newspaper" },
];

const bottomItems = [
  { name: "Help", href: "#", icon: "help" },
];

export default function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";

  return (
    <aside
      className={cn(
        "flex flex-col h-screen w-64 fixed left-0 top-0 bg-sidebar border-r border-sidebar-border py-8 z-40 transition-colors duration-300",
        className
      )}
    >
      {/* Brand Header */}
      <div className="px-6 mb-8 pb-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div
            className="w-10 h-10 bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg select-none shrink-0"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            C
          </div>
          <div>
            <h1
              className="text-base font-bold text-foreground tracking-tight leading-none"
              style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
            >
              Career Pilot
            </h1>
            <p
              className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium mt-1.5"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Executive Growth
            </p>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded text-sm font-medium nav-link-monolith group transition-all duration-300",
                isActive
                  ? "bg-sidebar-accent text-foreground border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              )}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[20px] transition-colors duration-300",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
                style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
              >
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto px-2 flex flex-col gap-1 pt-4 border-t border-sidebar-border mx-4">
        {mounted && (
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex items-center gap-3 px-4 py-3 rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground nav-link-monolith group text-sm w-full text-left cursor-pointer transition-all duration-300"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
            aria-label="Toggle Theme"
          >
            <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden shrink-0">
              <Sun
                className={cn(
                  "absolute w-5 h-5 transition-all duration-500 transform text-muted-foreground group-hover:text-foreground",
                  isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                )}
              />
              <Moon
                className={cn(
                  "absolute w-5 h-5 transition-all duration-500 transform text-muted-foreground group-hover:text-foreground",
                  isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
                )}
              />
            </div>
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>
        )}
        
        {bottomItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground nav-link-monolith group text-sm transition-all duration-300"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
          >
            <span className="material-symbols-outlined text-[20px] text-muted-foreground group-hover:text-foreground transition-colors duration-300">
              {item.icon}
            </span>
            <span>{item.name}</span>
          </Link>
        ))}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-4 py-3 rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground nav-link-monolith group text-sm w-full text-left cursor-pointer transition-all duration-300"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
        >
          <span className="material-symbols-outlined text-[20px] text-muted-foreground group-hover:text-foreground transition-colors duration-300">
            logout
          </span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

