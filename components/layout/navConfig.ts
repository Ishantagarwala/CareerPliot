export type NavItem = {
  name: string;
  href: string;
  icon: string;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

/** Grouped dashboard navigation — Discover → Learn → Apply. */
export const navSections: NavSection[] = [
  {
    id: "home",
    label: "",
    items: [{ name: "Dashboard", href: "/dashboard", icon: "dashboard" }],
  },
  {
    id: "discover",
    label: "Discover",
    items: [
      { name: "Career", href: "/career", icon: "explore" },
      { name: "News", href: "/news", icon: "newspaper" },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    items: [
      { name: "Roadmap", href: "/roadmap", icon: "map" },
      { name: "Courses", href: "/courses", icon: "school" },
      { name: "AI Hub", href: "/ai-hub", icon: "auto_awesome" },
    ],
  },
  {
    id: "apply",
    label: "Apply",
    items: [
      { name: "Resume", href: "/resume", icon: "description" },
      { name: "Resume Score", href: "/resume/ats", icon: "military_tech" },
      { name: "Jobs", href: "/jobs", icon: "work" },
      { name: "Projects", href: "/projects", icon: "hub" },
    ],
  },
];

export const bottomNavItems: NavItem[] = [
  { name: "Profile", href: "/profile", icon: "person" },
];

export const allNavItems: NavItem[] = [
  ...navSections.flatMap((s) => s.items),
  ...bottomNavItems,
];

export function isNavActive(pathname: string, href: string, items: NavItem[] = allNavItems) {
  const matches = pathname === href || pathname.startsWith(`${href}/`);
  if (!matches) return false;
  const longerMatch = items.some(
    (other) =>
      other.href !== href &&
      other.href.length > href.length &&
      (other.href === href || other.href.startsWith(`${href}/`)) &&
      (pathname === other.href || pathname.startsWith(`${other.href}/`))
  );
  return !longerMatch;
}
