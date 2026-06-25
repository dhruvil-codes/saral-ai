"use client";

import { 
  Phone, 
  Users, 
  Clock, 
  PhoneOff, 
  TrendingUp, 
  Play,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";

// 7 days call volume mock data
const chartData = [
  { day: "Thu", calls: 98 },
  { day: "Fri", calls: 110 },
  { day: "Sat", calls: 85 },
  { day: "Sun", calls: 45 },
  { day: "Mon", calls: 125 },
  { day: "Tue", calls: 132 },
  { day: "Wed", calls: 142 }, // Today
];

const recentCalls = [
  { number: "+91 98102 34567", status: "Lead Qualified", duration: "2m 14s", time: "10:42 AM" },
  { number: "+91 99534 87621", status: "Call Answered", duration: "1m 45s", time: "10:30 AM" },
  { number: "+91 98711 02938", status: "Call Answered", duration: "0m 52s", time: "10:15 AM" },
  { number: "+91 98122 88442", status: "Lead Qualified", duration: "3m 05s", time: "09:58 AM" },
  { number: "+91 99991 23456", status: "Call Answered", duration: "1m 20s", time: "09:40 AM" },
];

export default function OverviewPage() {
  const maxCalls = Math.max(...chartData.map((d) => d.calls));

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome & Top Action Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-sans tracking-tight text-[var(--color-text-primary)]">
            Namaste, Sharma Hair Salon!
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Here is your Voice AI status for today.
          </p>
        </div>

        {/* Primary CTA (Exactly one per viewport, pill-shaped, yellow bg, dark text) */}
        <button
          onClick={() => alert("Mock call feature: Directing a test call to your WhatsApp...")}
          className="inline-flex items-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-primary)] font-bold px-6 py-2.5 rounded-full shadow-[0_2px_8px_rgba(245,166,35,0.25)] transition-all transform hover:-translate-y-0.5 active:scale-98 text-sm cursor-pointer shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Trigger Test Call</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric Card 1: Calls Handled Today */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-xs text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
              Calls Handled Today
            </span>
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)]">
              <Phone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            {/* Display font (ITC Garamond Book Narrow) for numbers >= 24px */}
            <span className="font-display font-bold text-4xl text-[var(--color-text-primary)]">
              142
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-[#f0fdf4] px-2 py-0.5 rounded-full ml-2 inline-flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              +12%
            </span>
          </div>
        </div>

        {/* Metric Card 2: Leads Captured */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-xs text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
              Leads Captured
            </span>
            <div className="w-8 h-8 rounded-full bg-[#faf5ff] flex items-center justify-center text-[var(--color-icon-purple)]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-display font-bold text-4xl text-[var(--color-text-primary)]">
              38
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-[#f0fdf4] px-2 py-0.5 rounded-full ml-2 inline-flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              +8%
            </span>
          </div>
        </div>

        {/* Metric Card 3: Avg Response Time */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-xs text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
              Avg Response Time
            </span>
            <div className="w-8 h-8 rounded-full bg-[#eff6ff] flex items-center justify-center text-[var(--color-icon-blue)]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-display font-bold text-4xl text-[var(--color-text-primary)]">
              1.8s
            </span>
            <span className="text-[10px] text-[#92400e] font-bold bg-[var(--color-accent-light)] px-2 py-0.5 rounded-full ml-2 inline-flex items-center">
              Target &lt; 2.5s
            </span>
          </div>
        </div>

        {/* Metric Card 4: Missed Calls */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-xs text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
              Missed Calls
            </span>
            <div className="w-8 h-8 rounded-full bg-[#fff7ed] flex items-center justify-center text-[var(--color-icon-orange)]">
              <PhoneOff className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-display font-bold text-4xl text-[var(--color-text-primary)]">
              0
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-[#f0fdf4] px-2 py-0.5 rounded-full ml-2 inline-flex items-center">
              100% Answered
            </span>
          </div>
        </div>

      </div>

      {/* Main Grid: Bar Chart (7 columns) and Recent Calls (5 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Call Volume Chart Card */}
        <div className="lg:col-span-7 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] font-sans">
              Call Volume (Last 7 Days)
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Weekly summary: 737 total calls handled. Avg 105.3 calls/day.
            </p>
          </div>

          {/* Responsive SVG Bar Chart */}
          <div className="flex-1 min-h-[220px] flex items-end justify-between px-2 pt-4 relative">
            
            {/* Chart Grid Lines */}
            <div className="absolute inset-x-0 bottom-8 top-4 flex flex-col justify-between pointer-events-none">
              <div className="w-full border-t border-[var(--color-border)] opacity-60"></div>
              <div className="w-full border-t border-[var(--color-border)] opacity-60"></div>
              <div className="w-full border-t border-[var(--color-border)] opacity-60"></div>
              <div className="w-full border-t border-[var(--color-border)] opacity-60"></div>
            </div>

            {/* Custom Bar Columns */}
            {chartData.map((item, idx) => {
              const heightPercent = `${(item.calls / maxCalls) * 75}%`;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 group z-10">
                  <div className="relative w-full flex justify-center items-end" style={{ height: "160px" }}>
                    
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-8 bg-[var(--color-text-primary)] text-white text-[10px] px-2 py-0.5 rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none select-none">
                      {item.calls} calls
                    </div>

                    {/* Bar filled with Amber Accent color */}
                    <div 
                      className="w-8 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-t-[6px] transition-all duration-200"
                      style={{ height: heightPercent }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)] mt-2">
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Inbound Calls Card */}
        <div className="lg:col-span-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] font-sans">
                  Recent Calls
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  Latest activity handled by AI Agent
                </p>
              </div>
              <Link
                href="/dashboard/calls"
                className="text-xs font-bold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors inline-flex items-center gap-0.5"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Calls Table */}
            <div className="divide-y divide-[var(--color-border)]">
              {recentCalls.map((call, idx) => (
                <div key={idx} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-[var(--color-text-primary)] block">
                      {call.number}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5">
                      {call.time} · {call.duration}
                    </span>
                  </div>

                  <div>
                    {call.status === "Lead Qualified" ? (
                      <span className="inline-block bg-[var(--color-accent-light)] text-[#92400e] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Qualified
                      </span>
                    ) : (
                      <span className="inline-block bg-[#f0fdf4] text-[#166534] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Answered
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
