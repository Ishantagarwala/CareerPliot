"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Compass,
  Award,
  BookOpen,
  FileText,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Career Discovery", href: "/career", icon: Compass },
    { name: "Learning Roadmap", href: "/roadmap", icon: Award },
    { name: "Course Recommendations", href: "/courses", icon: BookOpen },
    { name: "AI PDF Assistant", href: "/pdf", icon: FileText },
    { name: "AI Tutor", href: "/tutor", icon: MessageSquare },
  ];

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-card text-card-foreground transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Sidebar Header */}
      <div className={cn("flex h-16 items-center justify-between px-4 border-b border-border", collapsed && "justify-center")}>
        {!collapsed && (
          <span className="font-heading text-lg font-bold tracking-tight text-primary">
            Main Menu
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-muted-foreground hover:bg-muted"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar Nav Links */}
      <nav className="flex-1 space-y-1 p-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110", isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground")} />
              
              {!collapsed && (
                <span className="truncate">{item.name}</span>
              )}

              {/* Tooltip on hover when collapsed */}
              {collapsed && (
                <div className="absolute left-16 z-50 rounded-md bg-popover text-popover-foreground px-2 py-1.5 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap shadow-md border border-border pointer-events-none">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className={cn("p-4 border-t border-border text-center text-xs text-muted-foreground", collapsed && "hidden")}>
        Career Pilot © 2026
      </div>
    </aside>
  );
}
