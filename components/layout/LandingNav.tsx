"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  { label: "Discovery", href: "#discovery" },
  { label: "Modules", href: "#modules" },
  { label: "FAQs", href: "#faq" },
];

const shell = "w-full max-w-[1200px] mx-auto px-5 sm:px-8";

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <nav
        className={`sticky top-0 z-50 bg-background/85 backdrop-blur-md transition-shadow duration-300 ${
          scrolled ? "shadow-soft" : "border-b border-border/70"
        }`}
      >
        <div className={`flex justify-between items-center h-16 ${shell}`}>
          <Link
            href="/"
            className="flex items-center gap-2.5 font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
              <span className="material-symbols-outlined text-[20px]">flight_takeoff</span>
            </span>
            Career Pilot
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="hidden sm:inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
            >
              Get started
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted md:hidden"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-foreground/25 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-[70] flex h-full w-[min(19rem,86vw)] flex-col bg-card shadow-pop transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-5 border-b border-border">
          <span className="font-display text-base font-bold uppercase tracking-tight text-foreground">
            Menu
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1 px-3 pt-4">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-2 mt-auto p-4 pt-4 border-t border-border">
          <Link
            href="/login?demo=true"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-border px-4 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Demo login
          </Link>
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className="rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
          >
            Get started free
          </Link>
        </div>
      </aside>
    </>
  );
}
