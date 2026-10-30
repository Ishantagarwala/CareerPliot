"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Map, Sparkles, Menu } from "lucide-react";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileDrawerOpen]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-background relative" data-app-shell>
      {/* Desktop Sidebar (Pinned statically at lg: 1024px and wider) */}
      <Sidebar
        className={cn(
          "hidden lg:flex transition-transform duration-300 ease-in-out",
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        )}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Mobile & Tablet Header (Visible below lg: 1024px) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40">
        <Navbar showLinks={false} onMenuClick={() => setMobileDrawerOpen(true)} />
      </div>

      {/* Mobile & Tablet Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-fade-in"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile & Tablet Slide-Over Drawer */}
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-[min(20rem,86vw)] transition-transform duration-300 ease-out",
          mobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar
          className="w-full h-full shadow-2xl"
          onClose={() => setMobileDrawerOpen(false)}
          onItemClick={() => setMobileDrawerOpen(false)}
        />
      </div>

      {/* Desktop Sidebar Expand Floating Button */}
      {isCollapsed && (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="hidden lg:flex fixed top-4 left-4 z-30 items-center justify-center w-10 h-10 bg-primary text-black border-2 border-black neo-shadow hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer rounded-lg"
          title="Open Sidebar"
          aria-label="Open sidebar"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
      )}

      {/* Main Content Viewport */}
      <main
        className={cn(
          "flex-1 pt-16 lg:pt-0 overflow-y-auto min-h-screen transition-all duration-300 ease-in-out",
          isCollapsed ? "lg:ml-0" : "lg:ml-72"
        )}
      >
        <div className="w-full max-w-[1800px] mx-auto px-3.5 sm:px-6 md:px-8 lg:px-10 py-5 sm:py-7 lg:py-9 pb-24 md:pb-10">
          {children}
        </div>
      </main>

      {/* Mobile Thumb-Friendly Quick Navigation Bar (phones < md) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t-2 border-black dark:border-[#383d45] px-2 py-1.5 flex items-center justify-around shadow-lg"
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-mono font-bold uppercase transition-all",
            pathname === "/dashboard"
              ? "text-primary font-black scale-105"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </Link>
        <Link
          href="/roadmap"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-mono font-bold uppercase transition-all",
            pathname.startsWith("/roadmap")
              ? "text-primary font-black scale-105"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Map className="w-4 h-4 mb-0.5" />
          <span>Roadmap</span>
        </Link>
        <Link
          href="/ai-hub"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-mono font-bold uppercase transition-all",
            pathname.startsWith("/ai-hub")
              ? "text-primary font-black scale-105"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="w-4 h-4 mb-0.5" />
          <span>AI Hub</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-mono font-bold uppercase text-muted-foreground hover:text-foreground transition-all cursor-pointer"
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
