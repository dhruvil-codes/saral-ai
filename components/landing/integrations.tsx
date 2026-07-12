"use client";

import {
  Container,
  Reveal,
  Section,
  SectionHeading,
  SurfaceCard,
} from "./primitives";

const tools = [
  { name: "Twilio", blurb: "Global voice" },
  { name: "Exotel", blurb: "India telephony" },
  { name: "WhatsApp", blurb: "Owner alerts" },
  { name: "Redis", blurb: "Semantic cache" },
  { name: "Supabase", blurb: "Leads & FAQs" },
  { name: "Sarvam", blurb: "Speech stack" },
];

export default function Integrations() {
  return (
    <Section id="integrations" className="py-14 md:py-20">
      <Container>
        <SectionHeading
          className="mb-8 md:mb-10"
          title="Plugs into tools you already use"
          description="Telephony, messaging, and your knowledge base. No rip-and-replace."
        />

        <Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {tools.map((t) => (
              <SurfaceCard
                key={t.name}
                className="px-3 py-5 flex flex-col items-center justify-center text-center gap-1"
              >
                <span
                  className="text-base font-bold tracking-tight text-[var(--color-text-primary)]"
                  style={{
                    fontFamily:
                      'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
                  }}
                >
                  {t.name}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {t.blurb}
                </span>
              </SurfaceCard>
            ))}
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
