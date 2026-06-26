"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────── */
export interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

/* ─────────────────────────────────────────────────────────
   FeatureCard — Aceternity-style card with cursor-tracking
   radial gradient reveal + animated border accent
───────────────────────────────────────────────────────── */
function FeatureCard({ feature }: { feature: Feature }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden rounded-[20px] border border-[var(--color-border)]",
        "bg-[var(--color-surface)] p-8 flex flex-col gap-5 cursor-default"
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.05)",
        y: -4,
      }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {/* Cursor-following radial spotlight */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(280px circle at ${mousePos.x}px ${mousePos.y}px, rgba(245,166,35,0.08) 0%, transparent 70%)`,
        }}
      />

      {/* Top border accent that glows amber on hover */}
      <motion.div
        className="absolute inset-x-0 top-0 h-px"
        animate={{
          background: isHovered
            ? "linear-gradient(90deg, transparent 0%, var(--color-accent) 50%, transparent 100%)"
            : "linear-gradient(90deg, transparent 0%, var(--color-border) 50%, transparent 100%)",
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Icon circle */}
      <div className="relative z-10 w-12 h-12 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)] flex-shrink-0">
        {feature.icon}
      </div>

      {/* Title */}
      <div className="relative z-10 flex flex-col gap-2">
        <h3
          className="text-[1.25rem] font-bold tracking-tight text-[var(--color-text-primary)] leading-snug"
          style={{
            fontFamily:
              "var(--font-garamond), 'ITC Garamond Book Narrow', Georgia, serif",
          }}
        >
          {feature.title}
        </h3>
        {/* Description */}
        <p
          className="text-sm leading-relaxed text-[var(--color-text-secondary)]"
          style={{
            fontFamily: "var(--font-geist-sans), Inter, ui-sans-serif, sans-serif",
          }}
        >
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   ProblemFeatures — 3-col responsive grid with stagger
───────────────────────────────────────────────────────── */
interface ProblemFeaturesProps {
  features: Feature[];
}

export default function ProblemFeatures({ features }: ProblemFeaturesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
      {features.map((feature, i) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
        >
          <FeatureCard feature={feature} />
        </motion.div>
      ))}
    </div>
  );
}
