"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Menu, 
  X, 
  ExternalLink,
  Bot,
  LayoutDashboard, 
  Users, 
  PhoneCall, 
  HelpCircle, 
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leads", href: "/dashboard/leads", icon: Users },
  { name: "Call Logs", href: "/dashboard/calls", icon: PhoneCall },
  { name: "Knowledge Base", href: "/dashboard/faqs", icon: HelpCircle },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get current page title
  const getPageTitle = () => {
    switch (pathname) {
      case "/dashboard":
        return "Overview";
      case "/dashboard/leads":
        return "Leads";
      case "/dashboard/calls":
        return "Call Logs";
      case "/dashboard/faqs":
        return "Knowledge Base";
      case "/dashboard/settings":
        return "Settings";
      default:
        return "Dashboard";
    }
  };

  return (
    <>
      <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 flex items-center justify-between sticky top-0 z-20 font-sans">
        <div className="flex items-center gap-3">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-full hover:bg-[var(--color-surface-alt)] md:hidden text-[var(--color-text-secondary)] transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb Title */}
          <h1 className="font-bold text-[var(--color-text-primary)] text-base md:text-lg tracking-tight font-sans">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right side stats/actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:inline-flex items-center gap-1.5 bg-[#f0fdf4] border border-[#dcfce7] text-[#166534] text-xs font-bold px-3 py-1 rounded-full select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Agent Active
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 border border-[var(--color-border-strong)] text-[var(--color-text-primary)] font-semibold rounded-full px-4 py-1.5 hover:border-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-all text-xs font-sans"
          >
            <span>View Site</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu */}
      <div
        className={cn(
          "fixed top-0 bottom-0 left-0 w-72 bg-[var(--color-surface)] border-r border-[var(--color-border)] z-40 md:hidden flex flex-col transition-transform duration-300 ease-in-out font-sans",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 px-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-[var(--color-text-primary)]">
              <Bot className="w-4 h-4" />
            </div>
            <span className="font-bold text-[var(--color-text-primary)] text-base tracking-tight">
              Saral AI
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-full hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all duration-150 select-none",
                  isActive
                    ? "bg-[var(--color-accent)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)]"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]">
          <div className="flex items-center gap-3 p-2 bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-border)]">
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent-light)] border border-[var(--color-border)] flex items-center justify-center text-amber-800 font-bold text-xs">
              SK
            </div>
            <div>
              <span className="font-bold text-xs text-[var(--color-text-primary)] block">
                City Physiotherapy Clinic
              </span>
              <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                AI Agent Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
