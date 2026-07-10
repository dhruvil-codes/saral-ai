"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, PhoneCall, HelpCircle, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    name: "Call Logs",
    href: "/dashboard/calls",
    icon: PhoneCall,
  },
  {
    name: "Case Cards",
    href: "/dashboard/leads",
    icon: Users,
  },
  {
    name: "Clinic FAQ/Config",
    href: "/dashboard/faqs",
    icon: HelpCircle,
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col h-screen sticky top-0 font-sans">
      {/* Sidebar Header */}
      <div className="h-16 px-6 border-b border-[var(--color-border)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-[var(--color-text-primary)]">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-[var(--color-text-primary)] text-lg block tracking-tight">
            Saral AI
          </span>
          <span className="text-[10px] text-[var(--color-text-secondary)] font-semibold uppercase tracking-wider block -mt-1">
            AI Front Desk for Clinics
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all duration-150 select-none",
                isActive
                  ? "bg-[var(--color-accent)] text-[var(--color-text-primary)] shadow-[0_2px_8px_rgba(245,166,35,0.15)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)]"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile card at bottom */}
      <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]">
        <div className="flex items-center gap-3 p-2 bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-border)]">
          <div className="w-10 h-10 rounded-full bg-[var(--color-accent-light)] border border-[var(--color-border)] flex items-center justify-center text-amber-800 font-bold font-sans">
            SK
          </div>
          <div className="overflow-hidden">
            <span className="font-bold text-sm text-[var(--color-text-primary)] block truncate leading-none">
              City Physiotherapy Clinic
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-medium mt-1 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              AI Agent Active
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
