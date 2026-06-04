export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card py-6 text-card-foreground relative">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Career Pilot
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Empowering students with personalized AI learning roadmaps and career guidance.
          </p>
        </div>
        <div className="text-center sm:text-right">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Team FinessBaba. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Built for Brainware AI Hackathon 2026.
          </p>
        </div>
      </div>
    </footer>
  );
}
