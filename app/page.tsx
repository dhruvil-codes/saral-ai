"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ScrollObserver from "../components/ScrollObserver";
import {
  MissedCallsIllustration,
  CostIllustration,
  LanguageIllustration,
  StepDesignIllustration,
  StepConnectIllustration,
  StepLiveIllustration,
} from "../components/LineArt";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [inHero, setInHero] = useState(true);
  const navItems = ['Products', 'Services', 'Apps', 'Pricing', 'About'];

  useEffect(() => {
    const hero = document.getElementById("hero-section");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInHero(entry.isIntersecting);
      },
      {
        threshold: 0,
      }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] antialiased select-none font-sans overflow-x-hidden">
      {/* Client-side scroll observer & metrics count-up triggers */}
      <ScrollObserver />

      {/* 1. Navigation Header (Sticky, transition triggers on scroll) */}
      <motion.header 
        id="main-nav" 
        className="fixed top-0 z-50 py-4 w-full"
        initial={{ y: 0, opacity: 1 }}
        animate={{ 
          y: inHero ? 0 : -100, 
          opacity: inHero ? 1 : 0 
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{ pointerEvents: inHero ? "auto" : "none" }}
      >
        <div className="max-w-[1160px] mx-auto px-4 md:px-8 flex items-center justify-between relative">
          <a href="#" className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight !text-white hover:opacity-90 transition-opacity">
            <svg width="26" height="36" viewBox="0 0 26 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="!text-white">
              <path d="m7.25 10.86 6 3.366 6-3.367m-12 20.176v-6.721l-6-3.367m24 0-6 3.367v6.72M1.61 14.42l11.64 6.54 11.64-6.54M13.25 34V20.947m12 5.18v-10.36c0-.454-.124-.9-.358-1.293a2.63 2.63 0 0 0-.975-.947l-9.333-5.18a2.73 2.73 0 0 0-2.667 0l-9.333 5.18a2.63 2.63 0 0 0-.976.947 2.54 2.54 0 0 0-.358 1.293v10.36c0 .454.124.9.358 1.293s.57.72.976.947l9.333 5.18a2.73 2.73 0 0 0 2.667 0l9.333-5.18a2.63 2.63 0 0 0 .975-.947 2.53 2.53 0 0 0 .358-1.293" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Saral AI</span>
          </a>

          <div className="hidden md:flex items-center bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-full px-1 py-1 gap-2">
            {navItems.map((item) => (
              <a 
                key={item} 
                href="#" 
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  item === 'Products' 
                    ? 'bg-[var(--color-surface)] border border-[var(--color-border)] font-medium text-[var(--color-text-primary)]' 
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {item}
              </a>
            ))}
          </div>

          <button className="hidden md:flex items-center gap-2.5 bg-[var(--color-dark-bg)] text-[var(--color-dark-text)] hover:opacity-90 text-sm font-medium pl-5 pr-2 py-2 rounded-full cursor-pointer border-0 transition-all active:scale-98">
            Get started
            <span className="size-7 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M.6 4.602h10m-4-4 4 4-4 4" stroke="var(--color-text-primary)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>

          <button 
            onClick={() => setMenuOpen(!menuOpen)} 
            className="md:hidden flex flex-col gap-1.5 cursor-pointer bg-transparent border-0 p-1 z-50"
          >
            <span className={`block w-6 h-0.5 transition-transform duration-300 ${
              menuOpen 
                ? 'rotate-45 translate-y-2 bg-[var(--color-text-primary)]' 
                : 'bg-white'
            }`}></span>
            <span className={`block w-6 h-0.5 transition-opacity duration-300 ${
              menuOpen 
                ? 'opacity-0' 
                : 'bg-white'
            }`}></span>
            <span className={`block w-6 h-0.5 transition-transform duration-300 ${
              menuOpen 
                ? '-rotate-45 -translate-y-2 bg-[var(--color-text-primary)]' 
                : 'bg-white'
            }`}></span>
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 w-full bg-[var(--color-surface)] border-t border-[var(--color-border)] flex flex-col p-5 gap-1 md:hidden z-50 shadow-md">
              {navItems.map((item) => (
                <a 
                  key={item} 
                  href="#" 
                  className={`px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    item === 'Products' 
                      ? 'bg-[var(--color-surface-alt)] font-medium text-[var(--color-text-primary)]' 
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]'
                  }`}
                >
                  {item}
                </a>
              ))}
              <button className="flex items-center gap-2.5 bg-[var(--color-dark-bg)] text-[var(--color-dark-text)] text-sm font-medium pl-5 pr-2 py-2 rounded-full cursor-pointer border-0 mt-3 w-fit hover:opacity-90 transition-opacity">
                Get started
                <span className="size-7 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M.6 4.602h10m-4-4 4 4-4 4" stroke="var(--color-text-primary)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </button>
            </div>
          )}
        </div>
      </motion.header>

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

      {/* Wave Divider 1: Transitioning from Bg (--color-bg) to Problem (--color-surface) */}
      <div className="w-full bg-[var(--color-bg)]">
        <svg className="w-full h-8 block" viewBox="0 0 1200 120" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,0 C300,80 900,-40 1200,60 L1200,120 L0,120 Z" fill="var(--color-surface)" />
        </svg>
      </div>

      {/* 3. Problem Section (bg: --color-surface) */}
      <section id="problem" className="py-16 md:py-24 bg-[var(--color-surface)]">
        <div className="max-w-[1160px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-[640px] mx-auto mb-16 reveal">
            <span className="t-label text-[var(--color-accent)] mb-3 block">
              The Support Bottleneck
            </span>
            <h2 className="t-section-heading text-[var(--color-text-primary)] mb-4">
              Traditional Indian calling centers fail to scale
            </h2>
            <p className="t-body-lead text-[var(--color-text-secondary)]">
              Managing a multilingual support operation in India is an operational nightmare. Human BPOs suffer from high turnover, overheads, and language limits.
            </p>
          </div>

          {/* Cards Grid: 12-col layout, rounded.xl (24px) cards, flat shadows */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 reveal-stagger">
            
            {/* Card 1: Missed Calls */}
            <div className="bg-[var(--color-surface)] rounded-[24px] border border-[var(--color-border)] p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover-lift flex flex-col items-start gap-5">
              <div className="p-3 bg-[var(--color-accent-light)] rounded-full text-[var(--color-accent)]">
                <MissedCallsIllustration size={32} />
              </div>
              <h3 className="text-xl font-bold font-sans text-[var(--color-text-primary)]">
                40% Missed Inbound Calls
              </h3>
              <p className="t-body text-sm text-[var(--color-text-secondary)]">
                Indian businesses face massive spikes during peak hours and holidays. Unanswered calls mean direct loss of warm leads and frustrated customers.
              </p>
            </div>

            {/* Card 2: Ops Cost */}
            <div className="bg-[var(--color-surface)] rounded-[24px] border border-[var(--color-border)] p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover-lift flex flex-col items-start gap-5">
              <div className="p-3 bg-[var(--color-accent-light)] rounded-full text-[var(--color-accent)]">
                <CostIllustration size={32} />
              </div>
              <h3 className="text-xl font-bold font-sans text-[var(--color-text-primary)]">
                Exorbitant Scaling Costs
              </h3>
              <p className="t-body text-sm text-[var(--color-text-secondary)]">
                Hiring, training, and managing human agents is expensive. Scalability is slow and costly, especially when handling high-volume outbound campaigns.
              </p>
            </div>

            {/* Card 3: Language Barrier */}
            <div className="bg-[var(--color-surface)] rounded-[24px] border border-[var(--color-border)] p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover-lift flex flex-col items-start gap-5">
              <div className="p-3 bg-[var(--color-accent-light)] rounded-full text-[var(--color-accent)]">
                <LanguageIllustration size={32} />
              </div>
              <h3 className="text-xl font-bold font-sans text-[var(--color-text-primary)]">
                Dialect & Accent Barriers
              </h3>
              <p className="t-body text-sm text-[var(--color-text-secondary)]">
                Customers prefer speaking in local tongues, but BPOs can&apos;t cover all regional dialects economically. Rigid IVR menus confuse and alienate callers.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Wave Divider 2: Transitioning from Problem (--color-surface) to Stats & How It Works (--color-surface-alt) */}
      <div className="w-full bg-[var(--color-surface)]">
        <svg className="w-full h-8 block" viewBox="0 0 1200 120" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,60 C300,10 900,110 1200,30 L1200,120 L0,120 Z" fill="var(--color-surface-alt)" />
        </svg>
      </div>

      {/* 4. Stats Bar (bg: --color-surface-alt) */}
      <section id="stats" className="py-16 bg-[var(--color-surface-alt)]">
        <div className="max-w-[1160px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 reveal text-center">
            
            {/* Stat 1 */}
            <div className="flex flex-col items-center gap-2">
              <span 
                className="font-display text-5xl md:text-6xl font-bold text-[var(--color-text-primary)]" 
                data-target="98%"
              >
                0%
              </span>
              <span className="text-sm font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                Customer CSAT Rating
              </span>
              <span className="text-xs text-[var(--color-text-muted)] max-w-[200px]">
                Inbound support queries resolved on first contact
              </span>
            </div>

            {/* Stat 2 */}
            <div className="flex flex-col items-center gap-2 border-y md:border-y-0 md:border-x border-[var(--color-border)] py-8 md:py-0">
              <span 
                className="font-display text-5xl md:text-6xl font-bold text-[var(--color-text-primary)]" 
                data-target="24/7"
              >
                24/7
              </span>
              <span className="text-sm font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                Instant Availability
              </span>
              <span className="text-xs text-[var(--color-text-muted)] max-w-[200px]">
                No queues, zero wait time, and infinite concurrency
              </span>
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col items-center gap-2">
              <span 
                className="font-display text-5xl md:text-6xl font-bold text-[var(--color-text-primary)]" 
                data-target="5x"
              >
                1x
              </span>
              <span className="text-sm font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                Cost Reduction
              </span>
              <span className="text-xs text-[var(--color-text-muted)] max-w-[200px]">
                Highly efficient vs hiring traditional BPO seats
              </span>
            </div>
            
          </div>
        </div>
      </section>

      {/* 5. How It Works Section (bg: --color-surface-alt, shares transition with Stats Bar) */}
      <section id="how-it-works" className="py-16 md:py-24 bg-[var(--color-surface-alt)] border-t border-[var(--color-border)]">
        <div className="max-w-[1160px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-[640px] mx-auto mb-16 reveal">
            <span className="t-label text-[var(--color-accent)] mb-3 block">
              Simple Deployment
            </span>
            <h2 className="t-section-heading text-[var(--color-text-primary)] mb-4">
              Set up your voice channel in minutes
            </h2>
            <p className="t-body-lead text-[var(--color-text-secondary)]">
              No complex coding. Simply describe your business logic, link your phone line, and let Saral AI automate your calls on autopilot.
            </p>
          </div>

          {/* Steps Horizontal / Vertical Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 reveal-stagger relative">
            
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center gap-4 relative">
              <div className="p-4 bg-[var(--color-surface)] rounded-full text-[var(--color-text-primary)] border border-[var(--color-border)]">
                <StepDesignIllustration size={48} />
              </div>
              <div className="bg-[var(--color-accent)] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center -mt-8 z-10 border border-white">
                1
              </div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                Configure Persona & Tone
              </h3>
              <p className="t-body text-sm text-[var(--color-text-secondary)] px-4">
                Name your agent, define its script, choose its tone (formal/friendly), and select languages. Supports English, Hindi, Hinglish, and regional dialects.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center gap-4 relative">
              <div className="p-4 bg-[var(--color-surface)] rounded-full text-[var(--color-text-primary)] border border-[var(--color-border)]">
                <StepConnectIllustration size={48} />
              </div>
              <div className="bg-[var(--color-accent)] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center -mt-8 z-10 border border-white">
                2
              </div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                Connect API & Phone Lines
              </h3>
              <p className="t-body text-sm text-[var(--color-text-secondary)] px-4">
                Connect your existing SIP trunks, phone numbers, or CRM tables. Saral AI fetches customer details and records call logs automatically.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center gap-4 relative">
              <div className="p-4 bg-[var(--color-surface)] rounded-full text-[var(--color-text-primary)] border border-[var(--color-border)]">
                <StepLiveIllustration size={48} />
              </div>
              <div className="bg-[var(--color-accent)] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center -mt-8 z-10 border border-white">
                3
              </div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                Activate Autopilot Scale
              </h3>
              <p className="t-body text-sm text-[var(--color-text-secondary)] px-4">
                Launch your agent. It handles inbound support calls or starts outbound calling instantly, logging structured summaries and CSAT metrics.
              </p>
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

      {/* Wave Divider 3: Transitioning from Surface Alt (--color-surface-alt) to Dark Bg (--color-dark-bg) */}
      <div className="w-full bg-[var(--color-surface-alt)]">
        <svg className="w-full h-8 block" viewBox="0 0 1200 120" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,20 C400,100 800,0 1200,80 L1200,120 L0,120 Z" fill="var(--color-dark-bg)" />
        </svg>
      </div>

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
