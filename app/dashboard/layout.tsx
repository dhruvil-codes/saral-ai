import DashboardSidebar from "@/components/dashboard-sidebar";
import DashboardHeader from "@/components/dashboard-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] font-sans antialiased overflow-x-hidden">
      {/* Sticky Desktop Sidebar */}
      <div className="hidden md:block shrink-0">
        <DashboardSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <DashboardHeader />
        
        {/* Page Inner Content Container */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1160px] mx-auto px-4 md:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
