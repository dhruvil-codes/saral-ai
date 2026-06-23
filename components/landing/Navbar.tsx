"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`sticky top-0 z-100 w-full h-[60px] border-b border-outline transition-all duration-300 ${
        scrolled
          ? "bg-neutral/92 backdrop-blur-md"
          : "bg-neutral"
      }`}
    >
      <div className="mx-auto max-w-[1160px] h-full px-4 lg:px-margin flex items-center justify-between">
        {/* Logo left */}
        <a href="#" className="font-display text-[24px] font-extrabold text-on-surface select-none">
          Saral AI
        </a>

        {/* Links center */}
        <div className="hidden md:flex items-center gap-6">
          <a
            href="#how-it-works"
            className="label-md text-on-surface-variant hover:text-on-surface transition-colors duration-150"
          >
            How it works
          </a>
          <a
            href="#pricing"
            className="label-md text-on-surface-variant hover:text-on-surface transition-colors duration-150"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="label-md text-on-surface-variant hover:text-on-surface transition-colors duration-150"
          >
            FAQ
          </a>
        </div>

        {/* Primary CTA right */}
        <div>
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            href="#cta-band"
            className={`inline-flex items-center justify-center rounded-full active:scale-[0.97] transition-all duration-200 label-md px-6 py-2.5 min-h-[44px] ${
              scrolled
                ? "bg-primary hover:bg-primary-dark text-on-primary"
                : "bg-transparent border-[1.5px] border-on-surface text-on-surface hover:bg-on-surface/[0.06]"
            }`}
          >
            Get Early Access
          </motion.a>
        </div>
      </div>
    </motion.nav>
  );
}

