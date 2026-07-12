"use client";

import { Phone, MessageSquareText, LayoutDashboard } from "lucide-react";
import {
  Container,
  Reveal,
  Section,
  SectionHeading,
  SurfaceCard,
} from "./primitives";

const steps = [
  {
    title: "Call arrives",
    body: "Saral answers in Hindi, Hinglish, or English within a couple of seconds. No hold music.",
    icon: Phone,
  },
  {
    title: "Qualify & capture",
    body: "Intent, urgency, preferred slot, and contact details are extracted live from the conversation.",
    icon: MessageSquareText,
  },
  {
    title: "Summary on WhatsApp",
    body: "You get a concise case card the moment the call ends. Follow up when free.",
    icon: LayoutDashboard,
  },
];

export default function HowItWorks() {
  return (
    <Section id="how-it-works">
      <Container>
        <SectionHeading
          title="From first ring to your pocket"
          description="Three steps. No new hardware. Works with the numbers your patients already dial."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={i * 0.09}>
                <SurfaceCard className="p-6 md:p-8 h-full text-center flex flex-col items-center">
                  <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-gradient-to-b from-white to-[var(--color-sky-soft)] border border-white shadow-[0_0_0_5px_rgba(186,220,245,0.35)]">
                    <Icon
                      className="size-6 text-[var(--color-sky-deep)]"
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="text-xs font-semibold tracking-wide text-[var(--color-sky-deep)] mb-2 uppercase">
                    Step {i + 1}
                  </span>
                  <h3
                    className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] mb-3"
                    style={{
                      fontFamily:
                        'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
                    }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] max-w-[28ch]">
                    {step.body}
                  </p>
                </SurfaceCard>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
