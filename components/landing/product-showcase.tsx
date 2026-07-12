"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Container,
  Reveal,
  Section,
  SectionHeading,
  SurfaceCard,
  easeOutExpo,
} from "./primitives";
import { cn } from "@/lib/utils";

const panels = [
  {
    id: "call",
    label: "Live call",
    title: "Natural voice intake",
    copy: "Patients speak the way they actually talk. Saral handles Hindi, Hinglish, and English without a rigid IVR tree.",
    preview: (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Inbound call</p>
            <p className="text-xs text-[var(--color-text-muted)]">Hinglish · 00:42</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2.5 py-1 border border-emerald-100">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        </div>
        <div className="space-y-2.5">
          <div className="rounded-2xl rounded-tl-md bg-[var(--color-sky-soft)] border border-[var(--color-border-strong)] px-4 py-3 text-sm text-[var(--color-text-secondary)] max-w-[92%]">
            Namaste, main Priya. Kal morning slot hai kya?
          </div>
          <div className="rounded-2xl rounded-tr-md bg-white border border-sky-100 px-4 py-3 text-sm text-[var(--color-text-primary)] max-w-[92%] ml-auto shadow-sm">
            Haan Priya ji. Kal 10 se 1 ke beech morning slots open hain.
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "triage",
    label: "Triage",
    title: "Structured case card",
    copy: "Every conversation becomes urgency, intent, and next action. Your team sees what matters without replaying the call.",
    preview: (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border-strong)] pb-3">
          <div>
            <p className="text-sm font-semibold">Lead · Priya</p>
            <p className="text-xs text-[var(--color-text-muted)]">Extracted just now</p>
          </div>
          <span className="inline-block bg-[var(--color-accent-light)] text-[#92400e] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            High
          </span>
        </div>
        <dl className="grid grid-cols-[100px_1fr] gap-y-2.5 text-sm">
          <dt className="text-[var(--color-text-muted)]">Interest</dt>
          <dd className="font-medium">Haircut + coloring</dd>
          <dt className="text-[var(--color-text-muted)]">Window</dt>
          <dd className="font-medium">Sat 10 AM – 1 PM</dd>
          <dt className="text-[var(--color-text-muted)]">Language</dt>
          <dd className="font-medium">Hinglish</dd>
        </dl>
        <div className="rounded-xl bg-[var(--color-sky-soft)] border border-[var(--color-border-strong)] p-3.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          <strong className="block text-[11px] text-[var(--color-text-primary)] mb-1">
            AI summary
          </strong>
          Customer wants haircut and coloring on Saturday morning. Booking link ready.
        </div>
      </div>
    ),
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    title: "Owner-ready alerts",
    copy: "A clean summary lands on WhatsApp so you can confirm or hand off without opening a laptop.",
    preview: (
      <div className="mx-auto max-w-[300px]">
        <div className="rounded-[24px] border border-[var(--color-border-strong)] bg-gradient-to-b from-sky-50 to-white p-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3 border border-sky-50">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent-hover)] flex items-center justify-center text-xs font-bold">
                S
              </div>
              <div>
                <p className="text-xs font-semibold">Saral AI</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">Lead Alert</p>
              </div>
              <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">Now</span>
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-text-primary)]">
              <strong>Priya</strong> called for haircut + coloring. Prefers Saturday 10–1. Urgency: High.
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function ProductShowcase() {
  const [active, setActive] = useState(panels[0].id);
  const reduce = useReducedMotion();
  const current = panels.find((p) => p.id === active) ?? panels[0];

  return (
    <Section id="product">
      <Container>
        <SectionHeading
          title="See the product in one journey"
          description="Follow a patient from the first word to the WhatsApp ping on your phone."
        />

        <Reveal>
          <SurfaceCard hover={false} className="p-5 sm:p-7 md:p-8">
            <Tabs value={active} onValueChange={setActive} className="w-full gap-6">
              <TabsList
                className={cn(
                  "h-auto w-full sm:w-fit flex-wrap justify-start gap-1 p-1.5 rounded-full",
                  "bg-[var(--color-sky-soft)] border border-[var(--color-border-strong)]"
                )}
              >
                {panels.map((p) => (
                  <TabsTrigger
                    key={p.id}
                    value={p.id}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium",
                      "data-active:bg-white data-active:text-[var(--color-text-primary)] data-active:shadow-sm",
                      "text-[var(--color-text-muted)]"
                    )}
                  >
                    {p.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                <div className="lg:col-span-5 space-y-3">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={current.id}
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.3, ease: easeOutExpo }}
                    >
                      <h3
                        className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]"
                        style={{
                          fontFamily:
                            'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
                        }}
                      >
                        {current.title}
                      </h3>
                      <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-secondary)] max-w-[40ch]">
                        {current.copy}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="lg:col-span-7">
                  <div
                    className={cn(
                      "relative rounded-[20px] border border-[var(--color-border-strong)] overflow-hidden",
                      "bg-gradient-to-b from-[var(--color-sky-soft)] via-white to-white",
                      "min-h-[300px] p-5 md:p-7"
                    )}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={current.id + "-preview"}
                        initial={reduce ? false : { opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reduce ? undefined : { opacity: 0 }}
                        transition={{ duration: 0.3, ease: easeOutExpo }}
                      >
                        {current.preview}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </Tabs>
          </SurfaceCard>
        </Reveal>
      </Container>
    </Section>
  );
}
