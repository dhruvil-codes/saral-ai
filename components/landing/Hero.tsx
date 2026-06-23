"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TextEffect } from "@/components/ui/text-effect";
import { AnimatedGroup } from "@/components/ui/animated-group";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring" as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export default function Hero() {
  return (
    <section className="relative bg-neutral pt-20 pb-section lg:pt-32 lg:pb-section overflow-hidden">
      <div className="mx-auto max-w-[1160px] px-4 lg:px-margin">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="flex flex-col items-center text-center"
        >
          {/* Announcement Badge */}
          <motion.div variants={transitionVariants.item} className="mb-8">
            <Link
              href="#cta-band"
              className="group mx-auto flex w-fit items-center gap-3 rounded-full border border-outline bg-surface p-1 pl-4 pr-1 shadow-sm transition-all duration-300 hover:bg-neutral"
            >
              <span className="flex items-center gap-1.5 caption text-on-surface-variant select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Voice AI for Indian Businesses
              </span>
              <div className="bg-neutral group-hover:bg-surface-alt size-6 overflow-hidden rounded-full duration-500 flex items-center justify-center">
                <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                  <span className="flex size-6 items-center justify-center">
                    <ArrowRight className="size-3 text-on-surface" />
                  </span>
                  <span className="flex size-6 items-center justify-center">
                    <ArrowRight className="size-3 text-on-surface" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={transitionVariants.item}
            className="mx-auto max-w-4xl text-balance display-lg text-on-surface tracking-tight mb-6"
          >
            Never Miss a Lead. <span className="underline decoration-primary decoration-[6px] underline-offset-4">Ever.</span>
          </motion.h1>

          {/* Subheadline (TextEffect) */}
          <TextEffect
            per="word"
            preset="fade-in-blur"
            speedSegment={0.3}
            delay={0.4}
            as="p"
            className="mx-auto max-w-2xl text-balance body-lg text-on-surface-variant mb-12"
          >
            Saral AI picks up every call in Hindi, Hinglish, or English — qualifies the lead and WhatsApps you a summary. Sub-2.5 second response. No missed customers.
          </TextEffect>

          {/* Call to Actions (AnimatedGroup) */}
          <AnimatedGroup
            variants={{
              container: {
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                    delayChildren: 0.6,
                  },
                },
              },
              ...transitionVariants,
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Link
              key="cta-primary"
              href="#cta-band"
              className="inline-flex items-center justify-center rounded-full bg-primary hover:bg-primary-dark active:scale-[0.97] transition-all duration-150 text-on-primary label-md px-8 py-3.5 text-center min-h-[44px] w-full sm:w-auto"
            >
              Get Early Access
            </Link>
            <Link
              key="cta-secondary"
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full bg-transparent border-[1.5px] border-on-surface hover:bg-on-surface/[0.06] transition-all duration-150 text-on-surface label-md px-8 py-3.5 text-center min-h-[44px] w-full sm:w-auto"
            >
              See how it works
            </Link>
          </AnimatedGroup>

          {/* Oscilloscope SVG Wave Decoration */}
          <motion.div
            variants={transitionVariants.item}
            className="w-full max-w-[320px] h-8 mt-12 text-primary"
            aria-hidden="true"
          >
            <svg className="w-full h-full" viewBox="0 0 300 30" fill="none">
              <path
                d="M0 15 Q30 5 60 15 T120 15 T180 15 T240 15 T300 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M0 15 Q30 25 60 15 T120 15 T180 15 T240 15 T300 15"
                stroke="var(--color-outline)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="4 4"
              />
            </svg>
          </motion.div>

          {/* Social Proof Line */}
          <motion.div
            variants={transitionVariants.item}
            className="caption text-muted flex items-center justify-center gap-2 select-none mt-8"
          >
            <span className="text-primary">●</span> Built for salons, boutiques, brokers & MSMEs
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
