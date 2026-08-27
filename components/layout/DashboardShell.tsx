"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        className={cn(
          "border-r border-sidebar-border transition-transform duration-300 ease-in-out",
          "hidden md:flex",
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        )}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      <div className="fixed left-0 right-0 top-0 z-50 md:hidden">
        <Navbar showLinks={false} />
      </div>

      {isCollapsed && (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="fixed left-4 top-4 z-50 hidden h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lift transition-all hover:-translate-y-0.5 hover:shadow-pop md:flex"
          title="Open sidebar"
          aria-label="Open sidebar"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>
      )}

      <main
        className={cn(
          "min-h-screen flex-1 overflow-y-auto pt-16 transition-all duration-300 ease-in-out md:pt-0",
          isCollapsed ? "md:ml-0" : "md:ml-64"
        )}
      >
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
