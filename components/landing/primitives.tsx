"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/* Portal-inspired structure: airy sections, white soft-ring cards,
   continuous sky canvas. Brand accent stays amber for CTAs. */

export const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative py-16 md:py-24 text-[var(--color-text-primary)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1120px] px-4 md:px-8", className)}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  align = "center",
  className,
  titleClassName,
  descriptionClassName,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-[560px] mb-10 md:mb-14",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      <h2
        className={cn(
          "t-section-heading text-[var(--color-text-primary)] mb-3",
          titleClassName
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "text-base md:text-lg leading-relaxed text-[var(--color-text-secondary)]",
            descriptionClassName
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 20,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -32px 0px" }}
      transition={{ duration: 0.55, delay, ease: easeOutExpo }}
    >
      {children}
    </motion.div>
  );
}

/** Portal-style white card: soft multi-ring glow, generous radius */
export function SurfaceCard({
  className,
  children,
  hover = true,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] bg-white",
        "border border-white/80",
        "shadow-[0_0_0_1px_rgba(186,220,245,0.35),0_0_0_6px_rgba(186,220,245,0.22),0_8px_24px_rgba(100,150,190,0.06)]",
        hover &&
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(186,220,245,0.5),0_0_0_6px_rgba(186,220,245,0.32),0_12px_32px_rgba(100,150,190,0.1)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function LandingCTA({
  href = "/login",
  children = "Get Early Access",
  className,
  variant = "primary",
}: {
  href?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost-dark";
}) {
  const variants = {
    primary:
      "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-primary)] shadow-[0_2px_12px_rgba(245,166,35,0.3)]",
    secondary:
      "border border-[var(--color-border-strong)] bg-white/90 text-[var(--color-text-primary)] hover:bg-white shadow-[0_0_0_4px_rgba(186,220,245,0.25)]",
    "ghost-dark":
      "border border-white/30 bg-white/10 text-white hover:bg-white/15 backdrop-blur-sm",
  } as const;

  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-full px-7 py-3.5 text-base transition-all duration-300",
        "transform hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2",
        variants[variant],
        className
      )}
    >
      {children}
    </a>
  );
}
