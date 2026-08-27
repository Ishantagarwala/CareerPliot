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

export default function Navbar({ showLinks = true }: { showLinks?: boolean }) {
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

  const renderItems = (sections: typeof navSections) =>
    sections.map((section) => (
      <div key={section.id} className="space-y-1">
        {section.label ? (
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
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
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 font-semibold text-foreground"
                  : "font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[20px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    ));

  return (
    <>
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md transition-colors duration-300 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BrandLogo size="sm" />
          <h1 className="text-[15px] font-bold tracking-tight text-foreground">
            Career Pilot
          </h1>
        </Link>

        <div className="flex items-center gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Toggle theme"
            >
              <div className="relative flex h-5 w-5 items-center justify-center overflow-hidden">
                <Sun
                  className={cn(
                    "absolute h-5 w-5 transition-all duration-300",
                    isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                  )}
                />
                <Moon
                  className={cn(
                    "absolute h-5 w-5 transition-all duration-300",
                    isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
                  )}
                />
              </div>
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <span className="material-symbols-outlined text-[24px]">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          )}
          {!isAuthenticated && (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </header>

      {mobileMenuOpen && isAuthenticated && (
        <div className="fixed inset-x-0 top-16 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-sidebar animate-fade-in-down md:hidden">
          <nav className="space-y-4 px-4 py-4">
            {renderItems(navSections)}

            <div className="space-y-1 border-t border-border pt-3">
              {bottomNavItems.map((item) => {
                const isActive = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 font-semibold text-foreground"
                        : "font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "material-symbols-outlined text-[20px]",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-1 flex items-center justify-between border-t border-border px-3 pt-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                  {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-foreground">{session?.user?.name}</p>
                  <p className="text-[11px] text-muted-foreground">{session?.user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Sign out"
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
