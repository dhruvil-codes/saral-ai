"use client";

import { Megaphone, Clock, UserX } from "lucide-react";
import {
  Container,
  Reveal,
  Section,
  SectionHeading,
  SurfaceCard,
} from "./primitives";

const pains = [
  {
    title: "Ad spend leaks at the first ring",
    description:
      "Ads create intent. When nobody answers, that patient books with someone else.",
    icon: Megaphone,
  },
  {
    title: "Front desk is already full",
    description:
      "Chair time and walk-ins collide. Inbound calls land at the worst moment.",
    icon: Clock,
  },
  {
    title: "Staff cannot cover every hour",
    description:
      "Peak hours and weekends need coverage you cannot hire overnight.",
    icon: UserX,
  },
];

export default function ProblemSection() {
  return (
    <Section id="problem">
      <Container>
        <SectionHeading
          title={
            <>
              You are losing patients{" "}
              <span className="italic text-[var(--color-sky-deep)]">
                between rings
              </span>
            </>
          }
          description="Every missed call is a patient who never reaches your chair. Saral answers so your team can stay with the person in the room."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {pains.map((pain, i) => {
            const Icon = pain.icon;
            return (
              <Reveal key={pain.title} delay={i * 0.08}>
                <SurfaceCard className="p-6 md:p-7 h-full flex flex-col">
                  <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-[var(--color-sky-soft)] text-[var(--color-sky-deep)] border border-[var(--color-border-strong)]">
                    <Icon className="size-5" strokeWidth={1.5} />
                  </div>
                  <h3
                    className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] mb-2"
                    style={{
                      fontFamily:
                        'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
                    }}
                  >
                    {pain.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {pain.description}
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
