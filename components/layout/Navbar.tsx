"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X, Compass, Award, BookOpen, FileText, MessageSquare, LayoutDashboard, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";

export default function Navbar({ showLinks = true }: { showLinks?: boolean }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthenticated = status === "authenticated";



  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Career Discovery", href: "/career", icon: Compass },
    { name: "Roadmaps", href: "/roadmap", icon: Award },
    { name: "Courses", href: "/courses", icon: BookOpen },
    { name: "PDF Notes", href: "/pdf", icon: FileText },
    { name: "AI Tutor", href: "/tutor", icon: MessageSquare },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight text-primary">
              <span className="flex items-center justify-center rounded-lg bg-primary p-1.5 text-primary-foreground">
                <Compass className="h-5 w-5" />
              </span>
              <span>Career Pilot</span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          {isAuthenticated && showLinks && (
            <div className="hidden md:flex md:space-x-4">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right Side Auth Buttons / Profile Dropdown */}
          <div className="hidden md:flex md:items-center md:gap-3">
            <ThemeToggle theme={theme} setTheme={setTheme} mounted={mounted} />
            {status === "loading" ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            ) : isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                  <Avatar className="h-9 w-9 border border-border transition-transform hover:scale-105">
                    <AvatarImage src={session.user?.image || ""} alt={session.user?.name || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {session.user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{session.user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="p-0">
                    <Link href="/dashboard" className="flex w-full items-center px-1.5 py-1 cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0">
                    <Link href="/career" className="flex w-full items-center px-1.5 py-1 cursor-pointer">
                      <Compass className="mr-2 h-4 w-4" />
                      Career Discovery
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className={buttonVariants({ variant: "ghost" })}>Log In</Link>
                <Link href="/register" className={buttonVariants({ variant: "default" })}>Sign Up</Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-background px-4 py-3 md:hidden">
          {isAuthenticated ? (
            <div className="space-y-1 pb-3">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium transition-colors ${
                      isActive
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
              <div className="border-t border-border mt-3 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {session.user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{session.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <ThemeToggle theme={theme} setTheme={setTheme} mounted={mounted} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive h-9 w-9 p-0 flex items-center justify-center"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-2 border-t border-border flex flex-col">
              <div className="flex items-center justify-between px-3 py-1 bg-muted/30 rounded-lg">
                <span className="text-xs font-semibold text-muted-foreground">Appearance</span>
                <ThemeToggle theme={theme} setTheme={setTheme} mounted={mounted} />
              </div>
              <Link href="/login" className={buttonVariants({ variant: "outline", className: "w-full text-center" })} onClick={() => setMobileMenuOpen(false)}>
                Log In
              </Link>
              <Link href="/register" className={buttonVariants({ variant: "default", className: "w-full text-center" })} onClick={() => setMobileMenuOpen(false)}>
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

function ThemeToggle({
  theme,
  setTheme,
  mounted,
}: {
  theme?: string;
  setTheme: (theme: string) => void;
  mounted: boolean;
}) {
  if (!mounted) {
    return <div className="h-9 w-9 rounded-lg bg-muted/20 animate-pulse" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground relative flex items-center justify-center rounded-lg cursor-pointer"
      title="Toggle Theme"
    >
      <Sun className="h-4.5 w-4.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4.5 w-4.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
