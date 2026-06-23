"use client";

import React from "react";
import { motion } from "framer-motion";
import { PhoneCallIllustration, VoiceActiveIllustration, WhatsAppIllustration } from "./LineArt";

export default function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Incoming Call",
      desc: "Customer calls your business number directly.",
      illustration: <PhoneCallIllustration className="w-24 h-24 text-on-surface" />,
    },
    {
      num: "02",
      title: "AI Conversation",
      desc: "Saral AI answers instantly in Hindi, Hinglish, or English, handling all queries and qualifying the lead.",
      illustration: <VoiceActiveIllustration className="w-24 h-24 text-on-surface" />,
    },
    {
      num: "03",
      title: "WhatsApp Alert",
      desc: "You receive a structured WhatsApp summary with the customer's intent, details, and context.",
      illustration: <WhatsAppIllustration className="w-24 h-24 text-on-surface" />,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
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
    <section id="how-it-works" className="relative bg-neutral py-section">
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
            <span className="text-primary text-[10px]">●</span> How it works
          </div>
          
          {/* Headline */}
          <h2 className="display-md text-on-surface mb-lg">
            Three simple steps to zero missed leads
          </h2>
          
          {/* Subheadline (body-lg) */}
          <p className="body-lg text-on-surface-variant max-w-[65ch]">
            No complex dashboards or integration maps required. Saral AI hooks into your existing business flows effortlessly.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-gutter relative"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-start p-6 bg-surface border border-outline rounded-xl relative shadow-[0_2px_8px_rgba(26,26,26,0.06)]"
            >
              {/* Step number badge */}
              <div className="absolute top-4 right-4 display-sm text-primary text-[28px] font-extrabold select-none opacity-40">
                {step.num}
              </div>

              {/* Icon/Illustration Container */}
              <div className="mb-6 bg-neutral rounded-md p-4 flex items-center justify-center border border-outline">
                {step.illustration}
              </div>

              {/* Title */}
              <h3 className="display-sm text-[22px] text-on-surface mb-2 font-display">
                {step.title}
              </h3>

              {/* Description */}
              <p className="body-md text-on-surface-variant max-w-[30ch]">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

