"use client";

import React from "react";
import { motion } from "framer-motion";

export default function Pricing() {
  const plans = [
    {
      title: "Pay Per Call",
      price: "₹15–20",
      period: "/call",
      description: "Best for low volume test runs or seasonal businesses.",
      features: [
        "No monthly retainer",
        "Full Hindi, English & Hinglish support",
        "WhatsApp summaries",
        "Standard sub-2.5s response time",
      ],
      isHighlighted: false,
    },
    {
      title: "Starter Plan",
      price: "₹499",
      period: "/month",
      description: "Perfect for boutiques, salons & growing MSMEs.",
      features: [
        "Includes 30 calls free",
        "₹10/call after the limit",
        "WhatsApp summaries",
        "Lead qualification built-in",
        "Priority agent line",
      ],
      isHighlighted: true,
    },
    {
      title: "Setup Partner",
      price: "₹999",
      period: "/month",
      description: "Dedicated voice flow, calendar integration, & deep customization.",
      features: [
        "₹2,500 one-time setup fee",
        "₹10/call (flat rate)",
        "Custom calendar integrations",
        "Dedicated phone number",
        "Premium support SLA",
      ],
      isHighlighted: false,
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
    hidden: { opacity: 0, y: 35 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  return (
    <section id="pricing" className="relative bg-neutral py-section border-b border-outline">
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
            <span className="text-primary text-[10px]">●</span> Pricing
          </div>
          
          {/* Headline */}
          <h2 className="display-md text-on-surface mb-lg">
            Simple, usage-based pricing
          </h2>
          
          {/* Subheadline (body-lg) */}
          <p className="body-lg text-on-surface-variant max-w-[65ch]">
            No hidden costs. Scale up or down dynamically depending on your customer inbound volume.
          </p>
        </motion.div>

        {/* Pricing Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-gutter items-stretch mb-8"
        >
          {plans.map((plan, index) => {
            if (plan.isHighlighted) {
              return (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="bg-tertiary text-on-tertiary rounded-xl p-8 flex flex-col justify-between shadow-[0_4px_12px_rgba(26,26,26,0.08)]"
                >
                  <div>
                    {/* Badge */}
                    <div className="inline-block bg-primary text-on-primary rounded-full px-3 py-1 caption mb-6 select-none font-bold">
                      Most Popular
                    </div>
                    
                    <h3 className="display-sm text-[24px] mb-2 font-display">
                      {plan.title}
                    </h3>
                    <div className="flex items-baseline mb-4">
                      <span className="font-display text-[40px] font-extrabold">{plan.price}</span>
                      <span className="body-md font-medium opacity-80">{plan.period}</span>
                    </div>
                    <p className="body-md mb-6 opacity-90">{plan.description}</p>
                    
                    <div className="border-t border-on-tertiary/10 my-6" />
                    
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2.5 body-md font-medium">
                          <span className="text-on-tertiary">✔</span>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href="#cta-band"
                    className="inline-flex items-center justify-center rounded-full bg-primary hover:bg-primary-dark active:scale-[0.97] transition-all duration-150 text-on-primary label-md py-3 text-center w-full min-h-[44px]"
                  >
                    Start Starter Trial
                  </a>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className="bg-surface border border-outline rounded-xl p-8 flex flex-col justify-between shadow-[0_2px_8px_rgba(26,26,26,0.06)]"
              >
                <div>
                  <h3 className="display-sm text-[24px] text-on-surface mb-2 font-display">
                    {plan.title}
                  </h3>
                  <div className="flex items-baseline mb-4">
                    <span className="font-display text-[40px] font-extrabold text-on-surface">{plan.price}</span>
                    <span className="body-md text-on-surface-variant font-medium">{plan.period}</span>
                  </div>
                  <p className="body-md text-on-surface-variant mb-6">{plan.description}</p>
                  
                  <div className="border-t border-outline my-6" />
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2.5 body-md text-on-surface-variant">
                        <span className="text-primary-dark">✔</span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href="#cta-band"
                  className="inline-flex items-center justify-center rounded-full border-[1.5px] border-on-surface hover:bg-on-surface/[0.06] active:scale-[0.97] transition-all duration-150 text-on-surface label-md py-3 text-center w-full min-h-[44px]"
                >
                  Select {plan.title}
                </a>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Note underneath */}
        <div className="w-full text-center">
          <p className="body-md font-medium text-on-surface-variant">
            🎁 <span className="underline decoration-primary decoration-2">Early access note:</span> Early access users get 50 free calls.
          </p>
        </div>
      </div>
    </section>
  );
}
