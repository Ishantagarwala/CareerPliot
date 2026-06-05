import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navigation */}
      <Navbar showLinks={false} />

      {/* Main Workspace */}
      <div className="flex flex-1">
        {/* Left Sidebar - hidden on mobile, navbar menu handles it */}
        <Sidebar className="hidden md:flex" />

        {/* Right Main Content Panel */}
        <main className="flex-1 bg-zinc-50/50 dark:bg-zinc-950/20 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
