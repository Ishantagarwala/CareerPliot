"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { name: "Career Discovery", href: "/career", icon: "explore" },
  { name: "Learning Roadmap", href: "/roadmap", icon: "map" },
  { name: "Course Recommendations", href: "/courses", icon: "school" },
  { name: "AI PDF Assistant", href: "/pdf", icon: "picture_as_pdf" },
  { name: "AI Tutor", href: "/tutor", icon: "psychology" },
];

export default function Navbar({ showLinks = true }: { showLinks?: boolean }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthenticated = status === "authenticated";

  return (
    <>
      {/* Mobile Top Bar — hidden on desktop */}
      <header className="md:hidden flex justify-between items-center w-full px-4 h-16 bg-[#0A0A0A] border-b border-[#262626] sticky top-0 z-50">
        <Link href="/">
          <h1
            className="text-lg font-bold text-white tracking-tight"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            Career Pilot
          </h1>
        </Link>

        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-[#c4c7c8] hover:text-white transition-colors p-1"
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
                className="px-4 py-2 text-sm font-medium text-white border border-[#262626] hover:border-[#404040] transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", letterSpacing: "0.05em" }}
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium bg-white text-[#0A0A0A] hover:bg-[#e2e2e2] transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", letterSpacing: "0.05em" }}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && isAuthenticated && (
        <div className="md:hidden fixed inset-x-0 top-16 z-40 bg-[#0e0e0e] border-b border-[#262626] animate-fade-in-down">
          <nav className="px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded text-sm transition-colors ${
                    isActive
                      ? "bg-[#2a2a2a] text-white"
                      : "text-[#c4c7c8] hover:bg-[#201f1f] hover:text-white"
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive ? "text-white" : "text-[#8e9192]"}`}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* User info + sign out */}
            <div className="border-t border-[#262626] mt-3 pt-3 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-[#262626] flex items-center justify-center text-white text-xs font-bold">
                  {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-xs font-medium text-white">{session?.user?.name}</p>
                  <p className="text-[10px] text-[#8e9192]">{session?.user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="text-[#8e9192] hover:text-white transition-colors p-2"
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
