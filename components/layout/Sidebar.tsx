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
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "nav-link-monolith group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
        isActive
          ? "bg-primary/10 font-semibold text-foreground"
          : "font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "material-symbols-outlined text-[20px] transition-colors duration-150",
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </p>
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
        "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar py-5 transition-colors duration-300",
        className
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-2 border-b border-sidebar-border px-4 pb-5">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <BrandLogo size="sm" />
          <div className="min-w-0 truncate">
            <h1 className="truncate text-[15px] font-bold tracking-tight text-foreground">
              Career Pilot
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              Your career, mapped
            </p>
          </div>
        </Link>

        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">menu_open</span>
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-2">
        {navSections.map((section) => (
          <div key={section.id} className="flex flex-col gap-0.5">
            {section.label ? <SectionLabel>{section.label}</SectionLabel> : null}
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        ))}
      </nav>

      <div className="mx-4 mt-auto flex flex-col gap-1 border-t border-sidebar-border px-0 pt-3">
        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="nav-link-monolith group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Toggle theme"
          >
            <div className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden">
              <Sun
                className={cn(
                  "absolute h-5 w-5 transition-all duration-300",
                  isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                )}
              />
              <Moon
                className={cn(
                  "absolute h-5 w-5 transition-all duration-300",
                  isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
                )}
              />
            </div>
            <span>{isDark ? "Light mode" : "Dark mode"}</span>
          </button>
        )}

        {bottomNavItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-sidebar-border px-3 pt-3 pb-1">
          {session?.user?.name && (
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[13px] font-bold text-primary">
                {session.user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
                  {session.user.name}
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex shrink-0 cursor-pointer items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Sign out"
            title="Sign out"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
