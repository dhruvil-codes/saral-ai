"use client";

import React from "react";
import { motion } from "framer-motion";

export default function Problem() {
  const painPoints = [
    {
      title: "Ad Waste",
      description: "Running meta ads but missing the calls they generate",
      icon: (
        <svg className="w-12 h-12 text-secondary" fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="24" cy="24" r="20" />
          <path d="M16 28 L24 20 L32 28" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24 20 L24 32" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      title: "In-Moment Friction",
      description: "Busy with actual work when customers call",
      icon: (
        <svg className="w-12 h-12 text-secondary" fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="8" y="8" width="32" height="32" rx="4" />
          <path d="M16 16 H32 M16 24 H28 M16 32 H24" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: "Capacity Limits",
      description: "No staff to manage incoming queries 24/7",
      icon: (
        <svg className="w-12 h-12 text-secondary" fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="24" cy="24" r="18" strokeDasharray="4 4" />
          <path d="M24 12 V24 L32 28" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  return (
    <section id="problem" className="relative bg-surface-alt py-section border-b border-outline">
      <div className="mx-auto max-w-[1160px] px-4 lg:px-margin">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-start mb-12"
        >
          {/* Eyebrow */}
          <div className="caption text-on-surface-variant flex items-center gap-2 select-none mb-4">
            <span className="text-primary text-[10px]">●</span> The Problem
          </div>
          
          {/* Headline */}
          <h2 className="display-md text-on-surface mb-lg">
            {"You're losing customers between rings"}
          </h2>
          
          {/* Subheadline (body-lg, paired with display-md) */}
          <p className="body-lg text-on-surface-variant max-w-[65ch]">
            Every missed call is a customer who goes to your competitor. Small businesses in India lose up to 40% of their inbound inquiries simply because they cannot answer in time.
          </p>
        </motion.div>

        {/* 3 Pain Point Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-gutter"
        >
          {painPoints.map((item, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.2 }}
              className="bg-surface border border-outline rounded-xl p-8 flex flex-col justify-between shadow-[0_2px_8px_rgba(26,26,26,0.06)]"
            >
              <div>
                <div className="mb-6 flex justify-start">{item.icon}</div>
                <h3 className="display-sm text-[20px] text-on-surface mb-2 font-display">
                  {item.title}
                </h3>
                <p className="body-md text-on-surface-variant">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

