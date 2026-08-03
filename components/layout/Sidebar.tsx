"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import BrandLogo from "@/components/layout/BrandLogo";
import { AccentColorPicker } from "@/components/layout/AccentColor";
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
        "flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium nav-link-monolith group transition-all duration-300",
        isActive
          ? "bg-primary/15 text-foreground border-r-4 border-primary"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
      )}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "13px",
        letterSpacing: "0.04em",
      }}
    >
      <span
        className={cn(
          "material-symbols-outlined text-[20px] transition-colors duration-300",
          isActive
            ? "text-primary"
            : "text-muted-foreground group-hover:text-foreground"
        )}
        style={
          isActive
            ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
            : undefined
        }
      >
        {item.icon}
      </span>
      <span>{item.name}</span>
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

  return (
    <aside
      className={cn(
        "flex flex-col h-screen w-64 fixed left-0 top-0 bg-sidebar border-r-2 border-black/60 py-8 z-40 transition-colors duration-300",
        className
      )}
    >
      <div className="px-6 mb-6 pb-6 border-b-2 border-black/80 flex items-center justify-between gap-2">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <BrandLogo size="md" className="neo-shadow rounded-lg" />
          <div className="truncate">
            <h1 className="text-base font-display font-extrabold text-primary tracking-tight leading-none uppercase truncate">
              Career Pilot
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-label font-bold mt-1.5 truncate">
              Bold Growth
            </p>
          </div>
        </Link>

        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="p-1 hover:bg-sidebar-accent/50 rounded transition-colors text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center shrink-0"
            title="Collapse Sidebar"
            aria-label="Collapse sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">menu_open</span>
          </button>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-4 px-2 overflow-y-auto pb-2">
        {navSections.map((section) => (
          <div key={section.id} className="flex flex-col gap-0.5">
            {section.label ? (
              <p
                className="px-4 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {section.label}
              </p>
            ) : null}
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto px-2 flex flex-col gap-1 pt-4 border-t border-sidebar-border mx-4">
        {mounted && (
          <div className="flex items-center gap-2 px-2 mb-1">
            <AccentColorPicker className="h-9 w-9" />
            <span
              className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Accent
            </span>
          </div>
        )}

        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex items-center gap-3 px-4 py-3 rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground nav-link-monolith group text-sm w-full text-left cursor-pointer transition-all duration-300"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "13px",
              letterSpacing: "0.04em",
            }}
            aria-label="Toggle Theme"
          >
            <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden shrink-0">
              <Sun
                className={cn(
                  "absolute w-5 h-5 transition-all duration-500 transform text-muted-foreground group-hover:text-foreground",
                  isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                )}
              />
              <Moon
                className={cn(
                  "absolute w-5 h-5 transition-all duration-500 transform text-muted-foreground group-hover:text-foreground",
                  isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
                )}
              />
            </div>
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>
        )}

        {bottomNavItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {session?.user?.name && (
          <div className="px-4 py-2 text-[10px] text-muted-foreground truncate">
            {session.user.name}
          </div>
        )}

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-4 py-3 rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground nav-link-monolith group text-sm w-full text-left cursor-pointer transition-all duration-300"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            letterSpacing: "0.04em",
          }}
        >
          <span className="material-symbols-outlined text-[20px] text-muted-foreground group-hover:text-foreground transition-colors duration-300">
            logout
          </span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
