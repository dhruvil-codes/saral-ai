"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Container,
  Reveal,
  Section,
  SectionHeading,
  SurfaceCard,
} from "./primitives";

const faqs = [
  {
    q: "Does Saral work in Hindi and Hinglish?",
    a: "Yes. The voice agent is built for the way Indian patients actually speak, including mid-sentence language switches. English is fully supported too.",
  },
  {
    q: "How fast does it answer?",
    a: "Typical first response is under 2.5 seconds end-to-end. Local silence detection and semantic caching keep common questions even faster.",
  },
  {
    q: "What do I get after each call?",
    a: "A structured case card on WhatsApp and in your dashboard: name, intent, urgency, preferred time, language, and a short summary.",
  },
  {
    q: "Do I need new phone hardware?",
    a: "No. Saral connects through telephony providers like Twilio or Exotel to the numbers patients already dial.",
  },
  {
    q: "Can it answer clinic-specific questions?",
    a: "Yes. Load FAQs and policies into your knowledge base. Relevant facts are retrieved per turn so answers stay accurate without slowing the call.",
  },
  {
    q: "Is this only for large hospital chains?",
    a: "No. Saral is designed for single-location and multi-clinic practices that need every lead captured without a 24/7 front desk.",
  },
];

export default function FAQSection() {
  return (
    <Section id="faq">
      <Container>
        <SectionHeading
          title="Questions clinics ask first"
          description="Straight answers on language, latency, setup, and what lands on your phone."
        />

        <Reveal className="max-w-3xl mx-auto">
          <SurfaceCard hover={false} className="px-2 sm:px-4 py-1">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`item-${i}`}
                  className="border-[var(--color-border-strong)] px-3 sm:px-4"
                >
                  <AccordionTrigger
                    className="text-left text-[15px] sm:text-base font-semibold text-[var(--color-text-primary)] hover:no-underline py-5"
                    style={{
                      fontFamily:
                        'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
                    }}
                  >
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-[var(--color-text-secondary)] pb-5">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </SurfaceCard>
        </Reveal>
      </Container>
    </Section>
  );
}
