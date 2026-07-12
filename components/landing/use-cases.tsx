"use client";

import { Stethoscope, Smile, Bone, Sparkles } from "lucide-react";
import {
  Container,
  Reveal,
  Section,
  SectionHeading,
  SurfaceCard,
} from "./primitives";

const cases = [
  {
    title: "Physiotherapy",
    description:
      "Injury calls, package renewals, and home-visit requests answered while therapists stay on the floor.",
    icon: Bone,
  },
  {
    title: "Dental clinics",
    description:
      "Emergency toothache, whitening consults, and recalls handled in the language patients call in.",
    icon: Smile,
  },
  {
    title: "Specialty OPD",
    description:
      "ENT, derm, peds, and ortho keep a calm front line without a night receptionist.",
    icon: Stethoscope,
  },
  {
    title: "Aesthetic & wellness",
    description:
      "High-intent ad inquiries get a polished first response before the competitor does.",
    icon: Sparkles,
  },
];

export default function UseCases() {
  return (
    <Section id="use-cases">
      <Container>
        <SectionHeading
          title="Built for real clinic floors"
          description="Workflows and language that match how Indian clinics actually run."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          {cases.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.title} delay={i * 0.06}>
                <SurfaceCard className="p-6 md:p-7 h-full">
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-sky-soft)] text-[var(--color-sky-deep)] border border-[var(--color-border-strong)]">
                      <Icon className="size-5" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]"
                        style={{
                          fontFamily:
                            'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
                        }}
                      >
                        {c.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        {c.description}
                      </p>
                    </div>
                  </div>
                </SurfaceCard>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
