"use client";

import React from "react";
import { motion } from "framer-motion";
import { CTAIllustration } from "./LineArt";

export default function CTABand() {
  return (
    <section id="cta-band" className="w-full bg-secondary py-section text-on-secondary relative overflow-hidden">
      {/* Decorative absolute SVGs for line-art feel */}
      <div className="absolute left-4 top-10 opacity-10 select-none pointer-events-none hidden md:block">
        <svg className="w-48 h-48 text-on-secondary" fill="none" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
        </svg>
      </div>

      <div className="mx-auto max-w-[1160px] px-4 lg:px-margin">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Centered Left Content (720px max-width constraint for content) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="lg:col-span-7 flex flex-col items-start text-left max-w-[720px]"
          >
            {/* Headline */}
            <h2 className="display-md text-on-secondary mb-lg font-display">
              Your next customer is calling right now.
            </h2>
            
            {/* Subheadline (body-lg, 80% opacity) */}
            <p className="body-lg text-on-secondary/80 mb-8 max-w-[48ch]">
              Get early access today and stop losing leads to voicemail. 50 free calls included. No credit card required.
            </p>

            {/* One button-primary CTA */}
            <div>
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                href="https://t.me/bydhruvil"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-primary hover:bg-primary-dark active:scale-[0.97] transition-all duration-150 text-on-primary label-md px-8 py-3.5 min-h-[44px] shadow-sm"
              >
                Get Early Access
              </motion.a>
            </div>
          </motion.div>

          {/* Right Column: Hand-drawn WhatsApp illustration (hidden at mobile) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            className="hidden lg:flex lg:col-span-5 justify-center items-center"
          >
            <CTAIllustration className="w-full max-w-[320px] h-auto" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}

