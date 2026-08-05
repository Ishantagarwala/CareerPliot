import Link from "next/link";
import BrandLogo from "@/components/layout/BrandLogo";

export default function Footer() {
  return (
    <footer className="bg-background border-t-4 border-black">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 py-12 md:py-14 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-[1600px] mx-auto w-full">
        <div className="space-y-6">
          <div className="flex items-center gap-3 font-display text-2xl md:text-[32px] font-extrabold text-primary uppercase">
            <BrandLogo size="md" />
            CAREER PILOT
          </div>
          <p className="text-foreground/70 max-w-sm leading-relaxed">
            Empowering students with personalized AI learning roadmaps and career
            guidance. Unapologetically bold future planning.
          </p>
          <div className="flex gap-4">
            {[
              { icon: "language", href: "#" },
              { icon: "share", href: "#" },
              { icon: "forum", href: "#" },
            ].map((s) => (
              <a
                key={s.icon}
                href={s.href}
                className="w-10 h-10 bg-white border-2 border-black neo-shadow flex items-center justify-center hover:bg-cyan transition-colors"
                aria-label={s.icon}
              >
                <span className="material-symbols-outlined text-black text-[20px]">
                  {s.icon}
                </span>
              </a>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <h5 className="font-label text-sm font-bold text-primary">Platform</h5>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/#modules"
                  className="text-foreground/70 hover:text-cyan transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="text-foreground/70 hover:text-cyan transition-colors"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-foreground/70 hover:text-cyan transition-colors"
                >
                  Sign Up Free
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h5 className="font-label text-sm font-bold text-primary">Account</h5>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/login"
                  className="text-foreground/70 hover:text-cyan transition-colors"
                >
                  Log In
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-foreground/70 hover:text-cyan transition-colors"
                >
                  Register
                </Link>
              </li>
              <li>
                <Link
                  href="/#cta"
                  className="text-foreground/70 hover:text-cyan transition-colors"
                >
                  Get Started
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t-4 border-black py-5 md:py-6 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-label font-bold opacity-60">
        <div>
          © {new Date().getFullYear()} CAREER WALLAH. UNAPOLOGETICALLY BOLD FUTURE
          PLANNING.
        </div>
        <div>BUILT FOR BRAINWARE AI HACKATHON 2026</div>
      </div>
    </footer>
  );
}
