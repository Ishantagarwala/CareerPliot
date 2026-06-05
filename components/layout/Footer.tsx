export default function Footer() {
  return (
    <footer className="w-full border-t border-[#262626] bg-[#0A0A0A] py-8">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p
            className="text-sm font-bold text-white tracking-tight"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            Career Pilot
          </p>
          <p className="text-xs text-[#8e9192] mt-1">
            Empowering students with personalized AI learning roadmaps and career guidance.
          </p>
        </div>
        <div className="text-center sm:text-right">
          <p
            className="text-[11px] text-[#636565] uppercase tracking-[0.1em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            &copy; {new Date().getFullYear()} Team FinessBaba
          </p>
          <p
            className="text-[11px] text-[#636565] mt-1 uppercase tracking-[0.1em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Built for Brainware AI Hackathon 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
