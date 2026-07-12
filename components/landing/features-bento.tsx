"use client";

import {
  Activity,
  Database,
  BookOpen,
  PhoneCall,
  MessageCircle,
  BarChart3,
} from "lucide-react";
import {
  Container,
  Reveal,
  Section,
  SectionHeading,
  SurfaceCard,
} from "./primitives";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Smart silence detection",
    description:
      "Local VAD drops dead air before it hits the cloud, protecting STT spend without clipping natural pauses.",
    icon: Activity,
    wide: true,
  },
  {
    title: "Semantic caching",
    description:
      "Repeat FAQs resolve from Redis in milliseconds. Zero LLM cost for common questions.",
    icon: Database,
  },
  {
    title: "Dynamic RAG",
    description:
      "Only the top clinic facts per turn keep latency under 2.5 seconds.",
    icon: BookOpen,
  },
  {
    title: "Indian telephony",
    description:
      "Twilio and Exotel webhooks for the numbers patients already dial.",
    icon: PhoneCall,
  },
  {
    title: "WhatsApp lead sync",
    description:
      "Post-call case cards land on your phone with urgency and next step.",
    icon: MessageCircle,
  },
  {
    title: "Live dashboard",
    description:
      "Volume, capture rate, and latency in one calm view for clinic owners.",
    icon: BarChart3,
    wide: true,
  },
];

export default function FeaturesBento() {
  return (
    <Section id="features">
      <Container>
        <SectionHeading
          title="Built for speed and margin"
          description="Enterprise voice patterns, tuned for Indian clinics. Fast answers, lower API cost, zero missed rings."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal
                key={f.title}
                delay={i * 0.05}
                className={cn(f.wide && "sm:col-span-2 lg:col-span-1")}
              >
                <SurfaceCard className="h-full p-6 md:p-7 flex flex-col">
                  <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-[var(--color-sky-soft)] text-[var(--color-sky-deep)] border border-[var(--color-border-strong)]">
                    <Icon className="size-5" strokeWidth={1.5} />
                  </div>
                  <h3
                    className="text-lg md:text-xl font-bold tracking-tight text-[var(--color-text-primary)]"
                    style={{
                      fontFamily:
                        'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
                    }}
                  >
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {f.description}
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
