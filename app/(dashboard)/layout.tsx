import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      {/* Desktop Sidebar — hidden on mobile */}
      <Sidebar className="hidden md:flex" />

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50">
        <Navbar showLinks={false} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 overflow-y-auto min-h-screen">
        <div className="w-full max-w-[1280px] mx-auto px-4 md:px-12 py-8 md:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
