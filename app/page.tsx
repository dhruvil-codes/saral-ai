"use client";

import ScrollObserver from "../components/ScrollObserver";
import Navbar from "../components/shadcn-space/blocks/navbar-01/navbar";
import BentoGrid from "../components/kokonutui/bento-grid";
import ScrollStack, { ScrollStackItem } from "./ScrollStack";
import {
  StepCallIllustration,
  StepAnswerIllustration,
  StepSummaryIllustration,
} from "../components/LineArt";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] antialiased select-none font-sans overflow-x-hidden">
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
              href="#get-started" 
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
            Trusted by salons, boutiques & brokers across India
          </p>
          
          {/* Browser Mockup Card */}
          <div className="w-full max-w-[900px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] shadow-[0_12px_24px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300">
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
      </section>

      {/* 3. Problem Section (bg: --color-surface-alt) */}
      <section id="problem" className="py-16 md:py-24 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] relative">
        <div className="max-w-[1160px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-[640px] mx-auto mb-16 reveal">
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

          <ScrollStack>
            <ScrollStackItem
              indicatorColor="blue"
              title="Ad Waste"
              description="Running meta ads but missing the calls they generate."
              icon={
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.546 1.16 3.694.933 5-.308a3.75 3.75 0 0 0 0-5.304c-1.306-1.307-3.454-1.534-5-.308L9 9.182m-3 6.364L18 9" />
                </svg>
              }
            />
            <ScrollStackItem
              indicatorColor="orange"
              title="In-Moment Friction"
              description="Busy with actual work when customers call."
              icon={
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              }
            />
            <ScrollStackItem
              indicatorColor="purple"
              title="Capacity Limits"
              description="No staff to manage incoming queries 24/7."
              icon={
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.97 5.97 0 0 0-.75-2.985m-.94-3.198a4.478 4.478 0 0 0-8.62 0m8.62 0a4.478 4.478 0 1 1-8.62 0m-4.14 8.24A9.094 9.094 0 0 1 2.26 18.24a3 3 0 0 1 4.686-2.724m-.94 3.197-.002.031c0 .225.012.447.037.666A11.944 11.944 0 0 0 12 21" />
                </svg>
              }
            />
          </ScrollStack>
        </div>
      </section>

      {/* 4. Stats Bar (bg: --color-bg) */}
      <section id="stats" className="py-16 md:py-24 bg-[var(--color-bg)]">
        <div className="max-w-[1160px] mx-auto px-4 md:px-8 reveal">
          <BentoGrid />
        </div>
      </section>

      {/* Wave Divider 3: Transitioning from Stats Bar (--color-bg) to How It Works (--color-surface-alt) */}
      <div className="w-full bg-[var(--color-bg)]">
        <svg className="w-full h-8 block" viewBox="0 0 1200 120" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,20 C400,100 800,0 1200,80 L1200,120 L0,120 Z" fill="var(--color-surface-alt)" />
        </svg>
      </div>

      {/* 5. How It Works Section (bg: --color-surface-alt, shares transition with Stats Bar) */}
      <section id="how-it-works" className="py-16 md:py-24 bg-[var(--color-surface-alt)] border-t border-[var(--color-border)]">
        <div className="max-w-[1160px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-[640px] mx-auto mb-16 reveal">
            <span className="t-label text-[var(--color-accent)] mb-3 block">
              How It Works
            </span>
            <h2 className="t-section-heading text-[var(--color-text-primary)] mb-4">
              Three simple steps to zero missed leads
            </h2>
            <p className="t-body-lead text-[var(--color-text-secondary)]">
              Set up your voice intelligence channel on autopilot and capture every inbound query instantly.
            </p>
          </div>

          {/* Steps Horizontal / Vertical Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 reveal-stagger relative">
            
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center gap-5 relative">
              <span className="font-display italic text-6xl md:text-7xl text-[var(--color-accent)] font-semibold select-none leading-none">
                1
              </span>
              <div className="p-4 bg-[var(--color-accent-light)] rounded-full text-[var(--color-accent)] flex items-center justify-center">
                <StepCallIllustration size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold font-sans text-[var(--color-text-primary)] mb-2">
                  Customer calls your number
                </h3>
                <p className="t-body text-sm text-[var(--color-text-secondary)] px-4 leading-relaxed">
                  They dial your business number. No confusing IVR paths, no holding queues — the call connects instantly.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center gap-5 relative">
              <span className="font-display italic text-6xl md:text-7xl text-[var(--color-accent)] font-semibold select-none leading-none">
                2
              </span>
              <div className="p-4 bg-[var(--color-accent-light)] rounded-full text-[var(--color-accent)] flex items-center justify-center">
                <StepAnswerIllustration size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold font-sans text-[var(--color-text-primary)] mb-2">
                  Saral AI answers
                </h3>
                <p className="t-body text-sm text-[var(--color-text-secondary)] px-4 leading-relaxed">
                  Our voice agent responds in Hindi, Hinglish, or English, answering queries and qualifying details.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center gap-5 relative">
              <span className="font-display italic text-6xl md:text-7xl text-[var(--color-accent)] font-semibold select-none leading-none">
                3
              </span>
              <div className="p-4 bg-[var(--color-accent-light)] rounded-full text-[var(--color-accent)] flex items-center justify-center">
                <StepSummaryIllustration size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold font-sans text-[var(--color-text-primary)] mb-2">
                  Get a WhatsApp summary
                </h3>
                <p className="t-body text-sm text-[var(--color-text-secondary)] px-4 leading-relaxed">
                  Receive structured lead details, urgency levels, and caller sentiment directly to your phone.
                </p>
              </div>
            </div>
            
          </div>

          {/* Centered CTA Trigger Block */}
          <div id="get-started" className="mt-20 text-center reveal">
            {/* Primary CTA (amber, pill-shaped, 1 per viewport) */}
            <button className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-primary)] font-semibold rounded-full px-8 py-4 shadow-[0_4px_16px_rgba(245,166,35,0.35)] transition-all transform hover:-translate-y-0.5 active:scale-98 text-base cursor-pointer">
              Get Started Free
            </button>
            <p className="text-xs text-[var(--color-text-muted)] mt-3">
              No credit card required. Launch your first voice campaign in 15 minutes.
            </p>
          </div>
        </div>
      </section>



      {/* 6. Footer (bg: --color-dark-bg) */}
      <footer className="bg-[var(--color-dark-bg)] text-[var(--color-dark-text)] py-16 md:py-20">
        <div className="max-w-[1160px] mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-zinc-800 pb-12">
            
            <div className="max-w-xs">
              <a href="#" className="font-display text-2xl font-bold tracking-tight text-white hover:opacity-90 transition-opacity block mb-3">
                Saral AI
              </a>
              <p className="text-sm text-zinc-400">
                Simple, automated voice intelligence designed for the next billion users and businesses across India.
              </p>
            </div>

            <div className="flex flex-wrap gap-12 md:gap-16">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Product</span>
                <a href="#problem" className="text-sm text-zinc-400 hover:text-white transition-colors">Why Saral AI</a>
                <a href="#stats" className="text-sm text-zinc-400 hover:text-white transition-colors">Impact stats</a>
                <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">How It Works</a>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Company</span>
                <a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">About Us</a>
                <a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">Contact Support</a>
                <a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">Privacy Policy</a>
              </div>
            </div>

          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 text-xs text-zinc-500">
            <span>© 2026 Saral AI. All rights reserved.</span>
            <span>Made with precision for Indian businesses.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
