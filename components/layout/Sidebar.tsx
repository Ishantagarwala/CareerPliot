"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

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
];

const bottomItems = [
  { name: "Help", href: "#", icon: "help" },
];

export default function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen w-64 fixed left-0 top-0 bg-[#0e0e0e] border-r border-[#262626] py-8 z-40",
        className
      )}
    >
      {/* Brand Header */}
      <div className="px-6 mb-10">
        <Link href="/dashboard" className="block">
          <h1
            className="text-xl font-bold text-white tracking-tight"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            Career Pilot
          </h1>
          <p
            className="text-[11px] text-[#8e9192] mt-1 uppercase tracking-[0.15em] font-medium"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Executive Suite
          </p>
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
                "flex items-center gap-3 px-4 py-3 rounded text-sm font-medium nav-link-monolith group",
                isActive
                  ? "bg-[#2a2a2a] text-white border-r-2 border-white"
                  : "text-[#c4c7c8] hover:bg-[#201f1f] hover:text-white"
              )}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[20px] transition-colors",
                  isActive
                    ? "text-white"
                    : "text-[#8e9192] group-hover:text-white"
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
      <div className="mt-auto px-2 flex flex-col gap-1 pt-4 border-t border-[#262626] mx-4">
        {bottomItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 rounded text-[#c4c7c8] hover:bg-[#201f1f] hover:text-white nav-link-monolith group text-sm"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
          >
            <span className="material-symbols-outlined text-[20px] text-[#8e9192] group-hover:text-white transition-colors">
              {item.icon}
            </span>
            <span>{item.name}</span>
          </Link>
        ))}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-4 py-3 rounded text-[#c4c7c8] hover:bg-[#201f1f] hover:text-white nav-link-monolith group text-sm w-full text-left cursor-pointer"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.04em" }}
        >
          <span className="material-symbols-outlined text-[20px] text-[#8e9192] group-hover:text-white transition-colors">
            logout
          </span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
