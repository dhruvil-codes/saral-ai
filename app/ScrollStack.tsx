"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ScrollStackProps {
  children: React.ReactNode;
}

export default function ScrollStack({ children }: ScrollStackProps) {
  return (
    <div className="relative flex flex-col items-center w-full max-w-[760px] mx-auto px-4 pb-12">
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { index } as any);
        }
        return child;
      })}
    </div>
  );
}

interface ScrollStackItemProps {
  indicatorColor: "blue" | "orange" | "purple";
  title: string;
  description: string;
  icon?: React.ReactNode;
  index?: number;
}

export function ScrollStackItem({
  indicatorColor,
  title,
  description,
  icon,
  index = 0,
}: ScrollStackItemProps) {
  // To create a beautiful sticky stack where cards partially overlap:
  // We offset each card's sticky top position based on its index.
  // Starting at top-32 (128px) plus 20px per card so the headers stack cleanly.
  const topOffset = 128 + index * 20;

  const accentBorderClasses = {
    blue: "border-l-4 border-l-[var(--color-icon-blue)]",
    orange: "border-l-4 border-l-[var(--color-accent)]",
    purple: "border-l-4 border-l-[var(--color-icon-purple)]",
  };

  const iconBgClasses = {
    blue: "bg-[rgba(59,130,246,0.08)] text-[var(--color-icon-blue)]",
    orange: "bg-[var(--color-accent-light)] text-[var(--color-accent)]",
    purple: "bg-[rgba(168,85,247,0.08)] text-[var(--color-icon-purple)]",
  };

  return (
    <div
      className={cn(
        "w-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] rounded-[var(--radius-lg)] p-6 md:p-8 mb-6 sticky transition-all duration-300 hover:shadow-[var(--shadow-md)]",
        accentBorderClasses[indicatorColor]
      )}
      style={{
        top: `${topOffset}px`,
        zIndex: index + 10,
      }}
    >
      <div className="flex gap-4 md:gap-5 items-start">
        {icon && (
          <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0", iconBgClasses[indicatorColor])}>
            {icon}
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-sans text-base md:text-lg font-semibold text-[var(--color-text-primary)] mb-1">
            {title}
          </h3>
          <p className="font-sans text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
