"use client";

import ScrollObserver from "../components/ScrollObserver";
import Navbar from "../components/shadcn-space/blocks/navbar-01/navbar";
import {
  StepCallIllustration,
  StepAnswerIllustration,
  StepSummaryIllustration,
} from "../components/LineArt";
import ProblemFeatures from "../components/ui/problem-features";
import { Megaphone, Clock, UserX } from "lucide-react";
import FeatureGrid from "../components/FeatureGrid";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <main className="landing-page min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] antialiased select-none font-sans overflow-x-hidden">
      {/* Client-side scroll observer & metrics count-up triggers */}
      <ScrollObserver />

      <Navbar />

      {/* 2. Hero Intro Section */}
      <section 
        id="hero-section"
        className="pt-32 md:pt-40 pb-0 text-center relative overflow-hidden bg-cover bg-center !text-white" 
        style={{ backgroundImage: 'url("/hero-bg.png")' }}
      >
        <div className="max-w-[1160px] mx-auto px-4 md:px-8 flex flex-col items-center relative z-10">
          
          {/* Eyebrow Badge */}
          <span className="inline-flex items-center gap-1.5 bg-[var(--color-accent-light)] border border-[var(--color-border)] text-[#92400e] text-xs font-semibold px-4 py-1 rounded-full mb-6 uppercase tracking-wider">
            Voice AI for Indian Businesses
          </span>
          
          {/* Headline H1 with slanted inline icon badges */}
          <h1 className="t-hero mb-6 max-w-[850px] mx-auto !text-white">
            Never Miss a{" "}
            <span className="inline-flex items-center justify-center bg-white border border-[var(--color-border)] rounded-lg px-2.5 py-1 mx-1.5 -rotate-3 transform shadow-sm align-middle select-none">
              <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </span>{" "}
            Lead.{" "}
            <span className="inline-flex items-center justify-center bg-white border border-[var(--color-border)] rounded-lg px-2.5 py-1 mx-1.5 rotate-3 transform shadow-sm align-middle select-none">
              <svg className="w-6 h-6 text-[var(--color-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v20M17 5v14M7 9v6M22 9v6M2 11v2" strokeLinecap="round" />
              </svg>
            </span>{" "}
            <span className="italic">Ever.</span>
          </h1>
          
          {/* Subtext */}
          <p className="t-body-lead max-w-[620px] mx-auto mb-8 !text-white/85">
            Saral AI picks up every call in Hindi, Hinglish, or English — qualifies the lead and WhatsApps you a summary. Sub-2.5 second response. No missed customers.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
            <a 
              href="/login" 
              className="inline-flex items-center justify-center bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-primary)] font-semibold rounded-full px-7 py-3.5 shadow-[0_2px_8px_rgba(245,166,35,0.25)] transition-all transform hover:-translate-y-0.5 active:scale-98 text-base cursor-pointer"
            >
              Get Early Access
            </a>
            <a 
              href="#how-it-works" 
              className="inline-flex items-center justify-center !border !border-white bg-transparent !text-white font-semibold rounded-full px-7 py-3.5 hover:bg-white/10 transition-all transform hover:-translate-y-0.5 active:scale-98 text-base cursor-pointer"
            >
              See how it works
            </a>
          </div>
          
          {/* Social Proof */}
          <p className="text-sm !text-white/65 font-medium mb-12">
            Trusted by physiotherapy and dental clinics across India
          </p>
          
          {/* Browser Mockup Card */}
          <div className="w-full max-w-[900px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] shadow-[0_12px_24px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300 relative z-30">
            {/* Browser Chrome Header */}
            <div className="bg-[var(--color-surface-alt)] px-4 py-3 border-b border-[var(--color-border)] flex items-center">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              </div>
              <div className="mx-auto bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] px-4 py-1.5 w-48 sm:w-64 text-center select-none font-mono">
                saral.ai/leads
              </div>
            </div>
            
            {/* Browser Content */}
            <div className="p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 min-h-[380px] relative overflow-hidden" style={{ background: 'linear-gradient(to bottom, rgba(168, 85, 247, 0.08) 0%, rgba(245, 166, 35, 0.08) 60%, var(--color-surface) 100%)' }}>
              {/* WhatsApp Notification Card */}
              <div className="w-full md:w-[460px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.04)] p-6 text-left relative z-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      {/* WhatsApp Phone Icon */}
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-semibold text-[var(--color-text-primary)] block text-sm">Lead Alert Summary</span>
                        <span className="text-[10px] text-[var(--color-text-secondary)] block">via WhatsApp • In Hinglish</span>
                      </div>
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">Just now</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-y-2 text-xs py-1">
                    <span className="text-[var(--color-text-secondary)] font-medium">Name:</span>
                    <span className="col-span-2 text-[var(--color-text-primary)] font-semibold">Priya</span>
                    
                    <span className="text-[var(--color-text-secondary)] font-medium">Interest:</span>
                    <span className="col-span-2 text-[var(--color-text-primary)] font-semibold">Haircut appointment</span>
                    
                    <span className="text-[var(--color-text-secondary)] font-medium">Urgency:</span>
                    <span className="col-span-2">
                      <span className="inline-block bg-[var(--color-accent-light)] text-[#92400e] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">High</span>
                    </span>
                  </div>
                  
                  <div className="bg-[var(--color-surface-alt)] p-3.5 rounded-[12px] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    <strong className="text-[var(--color-text-primary)] block mb-1 text-[11px]">AI Call Summary:</strong>
                    {"\"Customer called to book a haircut and coloring. Prefers Saturday morning between 10 AM and 1 PM. Urgent, booking link sent.\""}
                  </div>
                </div>
              </div>
              
              {/* Sunset Landscape Line-Art SVG */}
              <div className="w-full md:w-[320px] flex justify-center items-center select-none pointer-events-none">
                <svg viewBox="0 0 200 200" fill="none" className="w-48 h-48 text-[var(--color-accent)]" xmlns="http://www.w3.org/2000/svg">
                  {/* Starry dots */}
                  <circle cx="20" cy="40" r="1.5" fill="var(--color-accent)" opacity="0.6"/>
                  <circle cx="80" cy="25" r="1.5" fill="var(--color-icon-purple)" opacity="0.6"/>
                  <circle cx="160" cy="50" r="1.5" fill="var(--color-accent)" opacity="0.6"/>
                  <circle cx="140" cy="20" r="2" fill="var(--color-accent)" opacity="0.8"/>
                  {/* Mountains / Hills */}
                  <path d="M-10,160 C40,110 90,140 130,120 C170,100 210,130 230,110 L230,210 L-10,210 Z" fill="rgba(240, 240, 234, 0.4)" stroke="var(--color-border-strong)" strokeWidth="1.5"/>
                  <path d="M30,170 C80,140 120,160 160,135 C190,120 210,130 230,125 L230,210 L30,210 Z" fill="var(--color-surface)" stroke="var(--color-border-strong)" strokeWidth="1.5"/>
                  {/* Small Robot / Antenna */}
                  <g transform="translate(120, 95)">
                    {/* Antenna wire */}
                    <line x1="20" y1="10" x2="20" y2="25" stroke="var(--color-text-primary)" strokeWidth="1.5"/>
                    <circle cx="20" cy="10" r="3" fill="var(--color-accent)"/>
                    {/* Body */}
                    <rect x="10" y="25" width="20" height="20" rx="4" fill="var(--color-accent-light)" stroke="var(--color-text-primary)" strokeWidth="1.5"/>
                    {/* Eyes */}
                    <circle cx="16" cy="33" r="2" fill="var(--color-text-primary)"/>
                    <circle cx="24" cy="33" r="2" fill="var(--color-text-primary)"/>
                    {/* Legs */}
                    <line x1="14" y1="45" x2="12" y2="52" stroke="var(--color-text-primary)" strokeWidth="1.5"/>
                    <line x1="26" y1="45" x2="28" y2="52" stroke="var(--color-text-primary)" strokeWidth="1.5"/>
                  </g>
                </svg>
              </div>
            </div>
          </div>
          
        </div>

        {/* Soft gradient overlay blending hero sky image into problem section */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-[var(--color-surface-alt)]/70 to-[var(--color-surface-alt)] pointer-events-none z-0" />
      </section>

      {/* 3. Problem Section (bg: --color-surface-alt) */}
      <section id="problem" className="py-16 md:py-24 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] relative">
        <div className="max-w-[1160px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-[640px] mx-auto mb-16">
            <span className="t-label text-[var(--color-accent)] mb-3 block tracking-widest font-semibold">
              THE PROBLEM
            </span>
            <h2 className="t-section-heading text-[var(--color-text-primary)] mb-5">
              You&apos;re losing customers between rings
            </h2>
            <p className="t-body-lead text-[var(--color-text-secondary)]">
              Every missed call is a customer who goes to your competitor. Small businesses in India lose up to 40% of inbound inquiries simply because no one answered.
            </p>
          </div>

          {/* Aceternity-style interactive features section */}
          <ProblemFeatures
            features={[
              {
                title: "Ad Waste",
                description: "Running meta ads but missing the calls they generate.",
                icon: <Megaphone className="w-5.5 h-5.5" strokeWidth={1.5} />,
              },
              {
                title: "In-Moment Friction",
                description: "Busy with actual work when customers call.",
                icon: <Clock className="w-5.5 h-5.5" strokeWidth={1.5} />,
              },
              {
                title: "Capacity Limits",
                description: "No staff to manage incoming queries 24/7.",
                icon: <UserX className="w-5.5 h-5.5" strokeWidth={1.5} />,
              },
            ]}
          />
        </div>
      </section>

      {/* 4. Core Architecture Features Grid */}
      <FeatureGrid />

      {/* 6. Footer */}
      <Footer />
    </main>
  );
}
