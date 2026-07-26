"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  { label: "Discovery", href: "#discovery" },
  { label: "Modules", href: "#modules" },
  { label: "FAQs", href: "#faq" },
  { label: "Get Started", href: "#cta" },
];

const shell = "w-full max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16";

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <nav className="bg-background border-b-4 border-black sticky top-0 z-50">
        <div className={`flex justify-between items-center h-16 md:h-[4.5rem] ${shell}`}>
          <Link
            href="/"
            className="font-display text-xl sm:text-2xl md:text-[1.75rem] font-extrabold uppercase tracking-tighter text-primary"
          >
            CAREER PILOT
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/register"
              className="hidden sm:inline-flex items-center justify-center bg-[#88aaee] text-black px-4 md:px-5 py-2 border-2 border-black shadow-[4px_4px_0_0_#000] rounded-[5px] font-label text-sm font-bold transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              Sign Up
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center justify-center h-10 w-10 border-2 border-black bg-card hover:bg-primary transition-colors"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-[70] flex h-full w-[min(20rem,88vw)] flex-col bg-background border-l-4 border-black p-6 transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-black">
          <span className="font-display text-lg font-extrabold uppercase text-primary">
            Menu
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center h-9 w-9 border-2 border-black bg-card hover:bg-primary transition-colors"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="font-label text-base font-bold px-4 py-3 border-2 border-black hover:bg-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-3 mt-auto pt-6 border-t-2 border-black">
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="font-label text-sm font-bold text-center px-4 py-3 border-2 border-black hover:bg-muted transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className="font-label text-sm font-bold text-center px-4 py-3 border-2 border-black bg-[#88aaee] shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
          >
            Sign Up
          </Link>
          <Link
            href="/login?demo=true"
            onClick={() => setOpen(false)}
            className="font-label text-sm font-bold text-center px-4 py-3 border-2 border-black bg-primary shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
          >
            Demo Login
          </Link>
        </div>
      </aside>
    </>
  );
}
