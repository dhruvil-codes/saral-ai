"use client";

import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  description: string;
  metric: React.ReactNode;
  className?: string;
}

export function StatCard({ title, description, metric, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-[#ffffff] rounded-[26px] p-6 md:p-7 flex flex-col justify-between min-h-[160px] md:min-h-[180px] shadow-[0px_0px_0px_5px_#f7f7f7] transition-transform duration-200 hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-sans text-xs font-semibold tracking-wider text-[#636363] uppercase">
          {title}
        </h3>
        <p className="font-sans text-xs md:text-sm text-[#636363] leading-relaxed">
          {description}
        </p>
      </div>
      <div className="mt-4 flex items-baseline">
        {metric}
      </div>
    </div>
  );
}

export default function BentoGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1: Response Time - Col span 2 */}
      <StatCard
        title="RESPONSE TIME"
        description="Near-instant multilingual voice answers"
        className="md:col-span-2"
        metric={
          <span
            className="font-display text-5xl md:text-6xl font-bold text-[var(--color-text-primary)]"
            data-target="2.5"
            data-start="0"
            data-prefix="Sub-"
            data-suffix="s"
            data-decimals="1"
          >
            Sub-0.0s
          </span>
        }
      />

      {/* Card 2: Languages - Col span 1 */}
      <StatCard
        title="Languages (HINDI, HINGLISH, ENGLISH)"
        description="Answering in customers' preferred dialects"
        className="md:col-span-1"
        metric={
          <span
            className="font-display text-5xl md:text-6xl font-bold text-[var(--color-text-primary)]"
            data-target="3"
            data-start="0"
          >
            0
          </span>
        }
      />

      {/* Card 3: Missed Leads - Col span 1 */}
      <StatCard
        title="MISSED LEADS"
        description="Every single inbound call answered instantly"
        className="md:col-span-1"
        metric={
          <span
            className="font-display text-5xl md:text-6xl font-bold text-[var(--color-text-primary)]"
            data-target="0"
            data-start="15"
            data-final-text="Zero"
          >
            15
          </span>
        }
      />

      {/* Card 4: Always On - Col span 2 */}
      <StatCard
        title="ALWAYS ON"
        description="No queues, zero wait time, infinite capacity"
        className="md:col-span-2"
        metric={
          <span
            className="font-display text-5xl md:text-6xl font-bold text-[var(--color-text-primary)]"
            data-target="24/7"
          >
            24/7
          </span>
        }
      />
    </div>
  );
}
