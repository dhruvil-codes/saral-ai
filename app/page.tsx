import React from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import WaveDivider from "@/components/landing/WaveDivider";
import Problem from "@/components/landing/Problem";
import HowItWorks from "@/components/landing/HowItWorks";
import StatsBar from "@/components/landing/StatsBar";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTABand from "@/components/landing/CTABand";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Sticky Nav */}
      <Navbar />

      <main className="flex-1">
        {/* 2. Hero Section */}
        <Hero />

        {/* Wave Divider 1 (Hero -> Problem) */}
        <WaveDivider fillColor="var(--color-surface-alt)" />

        {/* 3. Problem Section */}
        <Problem />

        {/* 4. How It Works Section */}
        <HowItWorks />

        {/* Wave Divider 2 (How It Works -> Stats Bar) */}
        <WaveDivider fillColor="var(--color-primary)" />

        {/* 5. Stats Bar */}
        <StatsBar />

        {/* 6. Feature Cards */}
        <Features />

        {/* 7. Pricing Section */}
        <Pricing />

        {/* 8. FAQ Accordion */}
        <FAQ />

        {/* Wave Divider 3 (FAQ -> CTA Band) */}
        <WaveDivider fillColor="var(--color-secondary)" />

        {/* 9. CTA Band */}
        <CTABand />
      </main>

      {/* 10. Footer */}
      <Footer />
    </div>
  );
}

