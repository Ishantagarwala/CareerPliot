import Link from "next/link";
import BrandLogo from "@/components/layout/BrandLogo";

const columns = [
  {
    heading: "Platform",
    links: [
      { label: "Features", href: "/#modules" },
      { label: "Career Discovery", href: "/#discovery" },
      { label: "FAQs", href: "/#faq" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Register", href: "/register" },
      { label: "Demo login", href: "/login?demo=true" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-sidebar/60">
      <div className="grid grid-cols-1 gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] md:py-14 max-w-[1200px] mx-auto w-full">
        <div className="space-y-5">
          <div className="flex items-center gap-2.5 font-display text-xl font-bold uppercase tracking-tight text-foreground">
            <BrandLogo size="sm" className="rounded-lg" />
            Career Pilot
          </div>
          <p className="max-w-sm leading-relaxed text-muted-foreground">
            Personalized AI roadmaps, tutoring, and job tools that take students
            from confusion to a plan.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.heading} className="space-y-4">
            <h5 className="text-sm font-semibold text-foreground">{col.heading}</h5>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-5 py-5 sm:px-8 max-w-[1200px] mx-auto flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground md:flex-row">
        <div>© {new Date().getFullYear()} Career Wallah · careerpilot.cc</div>
        <div>Built for Brainware AI Hackathon 2026</div>
      </div>
    </footer>
  );
}
