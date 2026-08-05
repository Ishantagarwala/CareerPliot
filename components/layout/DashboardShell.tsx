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
          "hidden md:flex transition-transform duration-300 ease-in-out",
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        )}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      <div className="md:hidden fixed top-0 left-0 right-0 z-50">
        <Navbar showLinks={false} />
      </div>

      {isCollapsed && (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="hidden md:flex fixed top-4 left-4 z-50 items-center justify-center w-10 h-10 bg-primary text-primary-foreground border-2 border-black neo-shadow hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
          title="Open Sidebar"
          aria-label="Open sidebar"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
      )}

      <main
        className={cn(
          "flex-1 pt-16 md:pt-0 overflow-y-auto min-h-screen transition-all duration-300 ease-in-out",
          isCollapsed ? "md:ml-0" : "md:ml-64"
        )}
      >
        <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 py-6 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
