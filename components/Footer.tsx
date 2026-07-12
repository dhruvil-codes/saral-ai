"use client";

import { SaralLogoMark } from "@/assets/logo/logo";
import { LandingCTA } from "@/components/landing/primitives";

const platformLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Product", href: "#product" },
  { label: "Use cases", href: "#use-cases" },
];

const companyLinks = [
  { label: "FAQ", href: "#faq" },
  { label: "Integrations", href: "#integrations" },
  { label: "Early access", href: "/login" },
];

export default function Footer() {
  return (
    <footer className="pt-8 md:pt-12 px-4 md:px-8 pb-0">
      <div className="bg-white/90 backdrop-blur-sm w-full max-w-[1120px] mx-auto rounded-t-[28px] border border-b-0 border-white overflow-hidden shadow-[0_0_0_1px_rgba(186,220,245,0.35),0_0_0_6px_rgba(186,220,245,0.2)]">
        <div className="px-6 sm:px-10 lg:px-12 pt-10 lg:pt-12 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
            <div className="md:col-span-5 space-y-5">
              <a href="/" className="inline-flex items-center gap-2.5 group">
                <SaralLogoMark size={32} />
                <span
                  className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]"
                  style={{
                    fontFamily:
                      'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
                  }}
                >
                  Saral AI
                </span>
              </a>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] max-w-sm">
                Multilingual voice intake for Indian clinics. Every call answered,
                every lead on WhatsApp.
              </p>
              <LandingCTA href="/login" className="!py-3 !px-6 !text-sm">
                Get Early Access
              </LandingCTA>
            </div>

            <div className="md:col-span-3 md:col-start-7">
              <h3
                className="text-base font-bold text-[var(--color-text-primary)] mb-4"
                style={{
                  fontFamily:
                    'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
                }}
              >
                Platform
              </h3>
              <ul className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                {platformLinks.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-3">
              <h3
                className="text-base font-bold text-[var(--color-text-primary)] mb-4"
                style={{
                  fontFamily:
                    'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
                }}
              >
                Company
              </h3>
              <ul className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                {companyLinks.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-5 border-t border-[var(--color-border-strong)] flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-sm text-[var(--color-text-muted)]">
              © 2026 Saral AI. All rights reserved.
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Voice AI for Indian clinics
            </p>
          </div>
        </div>

        <div className="relative px-4 overflow-hidden select-none" aria-hidden>
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl h-24 bg-[rgba(186,220,245,0.35)] rounded-full blur-[60px] pointer-events-none" />
          <p
            className="text-center font-bold leading-[0.75] text-transparent text-[clamp(2.5rem,12vw,10rem)] [-webkit-text-stroke:1px_#c5dff0] relative z-0 tracking-tight"
            style={{
              fontFamily:
                'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
            }}
          >
            SARAL
          </p>
        </div>
      </div>
    </footer>
  );
}
