"use client";

import {
  LandingCTA,
  Container,
  Reveal,
  SurfaceCard,
  Section,
} from "./primitives";

export default function FinalCTA() {
  return (
    <Section id="get-started" className="pb-8 md:pb-12">
      <Container>
        <Reveal>
          <SurfaceCard
            hover={false}
            className="relative overflow-hidden px-6 py-12 md:px-12 md:py-16 text-center bg-gradient-to-b from-white via-white to-[var(--color-sky-soft)]"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-80"
              aria-hidden
              style={{
                background:
                  "radial-gradient(ellipse 80% 70% at 50% 0%, rgba(186,220,245,0.45), transparent 65%)",
              }}
            />

            <div className="relative z-10">
              <p className="text-sm font-medium text-[var(--color-sky-deep)] mb-3">
                Early access for Indian clinics
              </p>
              <h2 className="t-section-heading text-[var(--color-text-primary)] max-w-[560px] mx-auto mb-4">
                Never miss another patient call
              </h2>
              <p className="text-base md:text-lg leading-relaxed text-[var(--color-text-secondary)] max-w-[440px] mx-auto mb-8">
                Put Saral on your line. Every ring answered, every lead on WhatsApp,
                your team free to care for the person in the chair.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <LandingCTA href="/login">Get Early Access</LandingCTA>
                <LandingCTA href="#how-it-works" variant="secondary">
                  See how it works
                </LandingCTA>
              </div>
            </div>
          </SurfaceCard>
        </Reveal>
      </Container>
    </Section>
  );
}
