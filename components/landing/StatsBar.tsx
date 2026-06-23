import React from "react";

export default function StatsBar() {
  const stats = [
    {
      metric: "Sub-2.5s",
      label: "Response time",
    },
    {
      metric: "Hindi + Hinglish + English",
      label: "Languages supported",
    },
    {
      metric: "Zero",
      label: "Missed leads",
    },
    {
      metric: "Works 24/7",
      label: "Inbound availability",
    },
  ];

  return (
    <section className="w-full bg-primary py-12 border-y border-outline select-none">
      <div className="mx-auto max-w-[1160px] px-4 lg:px-margin">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <div key={index} className="flex flex-col items-center justify-center">
              {/* Metric Number/Value */}
              <div className="font-display text-[24px] lg:text-[28px] font-extrabold text-on-primary leading-tight mb-2">
                {stat.metric}
              </div>
              {/* Metric Label */}
              <div className="caption text-on-primary opacity-80 tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
