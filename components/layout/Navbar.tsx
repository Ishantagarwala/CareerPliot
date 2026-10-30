"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/layout/BrandLogo";
import { navSections, bottomNavItems, isNavActive } from "@/components/layout/navConfig";

export default function Navbar({
  showLinks = true,
  onMenuClick,
}: {
  showLinks?: boolean;
  onMenuClick?: () => void;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthenticated = status === "authenticated";
  const isDark = theme === "dark";
  void showLinks;

  const handleMenuClick = () => {
    if (onMenuClick) {
      onMenuClick();
    } else {
      setMobileMenuOpen(!mobileMenuOpen);
    }
  };

  return (
    <>
      <header className="lg:hidden flex justify-between items-center w-full px-4 h-16 bg-background/95 backdrop-blur-md border-b-2 border-black dark:border-[#383d45] sticky top-0 z-50 transition-colors duration-300">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BrandLogo size="sm" className="neo-shadow rounded-lg" />
          <div>
            <h1
              className="text-base font-display font-black text-foreground tracking-tight uppercase leading-none"
            >
              Career Pilot
            </h1>
            <p className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              Workspace
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground border border-black/20 dark:border-[#383d45] rounded-lg p-2 cursor-pointer transition-colors"
              aria-label="Toggle Theme"
            >
              <div className="relative w-4 h-4 flex items-center justify-center overflow-hidden">
                <Sun
                  className={cn(
                    "absolute w-4 h-4 transition-all duration-500 transform text-amber-500",
                    isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                  )}
                />
                <Moon
                  className={cn(
                    "absolute w-4 h-4 transition-all duration-500 transform text-cyan-400",
                    isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
                  )}
                />
              </div>
            </button>
          )}

          {isAuthenticated && (
            <button
              type="button"
              onClick={handleMenuClick}
              className="border-2 border-black dark:border-[#383d45] bg-card text-foreground rounded-lg p-1.5 shadow-[2px_2px_0_0_#000] hover:bg-primary hover:text-black transition-all cursor-pointer flex items-center justify-center"
              aria-label="Toggle Navigation"
            >
              <span className="material-symbols-outlined text-[22px]">
                {mobileMenuOpen && !onMenuClick ? "close" : "menu"}
              </span>
            </button>
          )}
          {!isAuthenticated && (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-foreground border border-border hover:border-ring transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", letterSpacing: "0.05em" }}
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", letterSpacing: "0.05em" }}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      {mobileMenuOpen && isAuthenticated && (
        <div className="lg:hidden fixed inset-x-0 top-16 z-40 bg-sidebar border-b border-sidebar-border animate-fade-in-down max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="px-4 py-4 space-y-4">
            {navSections.map((section) => (
              <div key={section.id} className="space-y-1">
                {section.label ? (
                  <p
                    className="px-4 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {section.label}
                  </p>
                ) : null}
                {section.items.map((item) => {
                  const isActive = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded text-sm transition-colors ${
                        isActive
                          ? "bg-sidebar-accent text-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                      }`}
                      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
                    >
                      <span className={`material-symbols-outlined text-[20px] ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            ))}

            <div className="space-y-1 border-t border-border pt-3">
              {bottomNavItems.map((item) => {
                const isActive = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded text-sm transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
                  >
                    <span className={`material-symbols-outlined text-[20px] ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-border mt-1 pt-3 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-foreground text-xs font-bold">
                  {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">{session?.user?.name}</p>
                  <p className="text-[10px] text-muted-foreground">{session?.user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="text-muted-foreground hover:text-foreground transition-colors p-2"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
