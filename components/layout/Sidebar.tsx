"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import BrandLogo from "@/components/layout/BrandLogo";
import {
  navSections,
  bottomNavItems,
  isNavActive,
  type NavItem,
} from "@/components/layout/navConfig";

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

function NavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const isActive = isNavActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-150 border-2",
        isActive
          ? "bg-primary text-black border-black shadow-[3px_3px_0_0_#000] translate-x-0.5"
          : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground hover:border-black/20 dark:hover:border-[#383d45] hover:translate-x-0.5"
      )}
    >
      <span
        className={cn(
          "material-symbols-outlined text-[20px] transition-colors shrink-0",
          isActive
            ? "text-black"
            : "text-muted-foreground"
        )}
        style={
          isActive
            ? { fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }
            : undefined
        }
      >
        {item.icon}
      </span>
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

export default function Sidebar({ className, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";
  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CP";

  return (
    <aside
      className={cn(
        "flex flex-col h-screen w-72 fixed left-0 top-0 bg-sidebar border-r-2 border-black dark:border-[#383d45] py-6 z-40 transition-colors duration-300",
        className
      )}
    >
      <div className="px-5 mb-5 pb-5 border-b-2 border-black dark:border-[#383d45] flex items-center justify-between gap-2">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <BrandLogo size="md" className="neo-shadow rounded-lg shrink-0" />
          <div className="truncate">
            <h1 className="text-base font-display font-extrabold text-foreground tracking-tight leading-none uppercase truncate">
              Career Pilot
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-mono font-bold mt-1 truncate">
              AI Accelerator
            </p>
          </div>
        </Link>

        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="p-1.5 hover:bg-card border-2 border-transparent hover:border-black dark:hover:border-[#383d45] rounded-lg transition-colors text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center shrink-0"
            title="Collapse Sidebar"
            aria-label="Collapse sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">menu_open</span>
          </button>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-3 px-3 overflow-y-auto pb-2">
        {navSections.map((section) => (
          <div key={section.id} className="flex flex-col gap-1">
            {section.label ? (
              <p className="px-4 pt-2 pb-1 text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-foreground/70 dark:text-foreground/80">
                {section.label}
              </p>
            ) : null}
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto px-3 flex flex-col gap-1 pt-3 border-t-2 border-black dark:border-[#383d45]">
        {/* User profile card */}
        {session?.user && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-card border-2 border-black dark:border-[#383d45] shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#000] mb-2">
            <div className="size-7 rounded-lg bg-primary border-2 border-black text-black font-mono font-black text-xs flex items-center justify-center shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono font-bold text-foreground truncate">
                {session.user.name || "CareerPilot User"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {session.user.email || "Active Member"}
              </p>
            </div>
          </div>
        )}

        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-transparent hover:border-black/20 dark:hover:border-[#383d45] text-muted-foreground hover:bg-card hover:text-foreground text-xs font-mono font-bold uppercase tracking-wider w-full text-left cursor-pointer transition-all duration-150"
            aria-label="Toggle Theme"
          >
            <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden shrink-0">
              <Sun
                className={cn(
                  "absolute w-5 h-5 transition-all duration-500 transform text-muted-foreground",
                  isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100 text-amber-500"
                )}
              />
              <Moon
                className={cn(
                  "absolute w-5 h-5 transition-all duration-500 transform text-muted-foreground",
                  isDark ? "rotate-0 scale-100 opacity-100 text-cyan-400" : "-rotate-90 scale-0 opacity-0"
                )}
              />
            </div>
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>
        )}

        {bottomNavItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-transparent hover:border-black/20 dark:hover:border-[#383d45] text-muted-foreground hover:bg-card hover:text-destructive text-xs font-mono font-bold uppercase tracking-wider w-full text-left cursor-pointer transition-all duration-150"
        >
          <span className="material-symbols-outlined text-[20px] text-muted-foreground transition-colors shrink-0">
            logout
          </span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
