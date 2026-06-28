"use client";

import React from "react";

export default function SaralFeatureCta() {
  return (
    <div className="bg-[#f7f7f7] py-8 md:py-12 px-4">
      <section className="bg-white w-full max-w-[1350px] mx-auto text-black pt-8 lg:pt-12 px-4 sm:px-8 md:px-16 lg:px-28 rounded-[30px] overflow-hidden shadow-[0px_0px_0px_5px_#f7f7f7]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-6 gap-8 md:gap-12">
          
          <div className="lg:col-span-3 space-y-6">
            {/* Logo Header */}
            <a href="/" className="block">
              <h2 className="text-2xl font-bold tracking-tight font-display" style={{ fontFamily: 'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif' }}>
                Saral AI
              </h2>
            </a>
            <p className="text-sm/6 text-neutral-600 max-w-96 font-sans">
              Saral AI provides zero-friction voice automation and instant WhatsApp lead capture to ensure Indian businesses never miss a customer again.
            </p>
          </div>

          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 lg:gap-20 items-start">
            {/* Platform Column */}
            <div>
              <h3 className="font-display font-bold text-base mb-4 text-neutral-900" style={{ fontFamily: 'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif' }}>
                Platform
              </h3>
              <ul className="space-y-3 text-sm text-neutral-600 font-sans">
                <li><a href="#" className="hover:text-black transition-colors">Voice Engine</a></li>
                <li><a href="#" className="hover:text-black transition-colors">Dashboard</a></li>
                <li><a href="#" className="hover:text-black transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-black transition-colors">Pricing</a></li>
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h3 className="font-display font-bold text-base mb-4 text-neutral-900" style={{ fontFamily: 'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif' }}>
                Resources
              </h3>
              <ul className="space-y-3 text-sm text-neutral-600 font-sans">
                <li><a href="#" className="hover:text-black transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-black transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-black transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-black transition-colors">Case Studies</a></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h3 className="font-display font-bold text-base mb-4 text-neutral-900" style={{ fontFamily: 'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif' }}>
                Company
              </h3>
              <ul className="space-y-3 text-sm text-neutral-600 font-sans">
                <li><a href="#" className="hover:text-black transition-colors">About Us</a></li>
                <li className="flex items-center gap-2">
                  <a href="#" className="hover:text-black transition-colors">Careers</a>
                  <span className="bg-[var(--color-accent-light)] text-[#92400e] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-[var(--color-accent)]/20">HIRING</span>
                </li>
                <li><a href="#" className="hover:text-black transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-black transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Massive Bottom Text */}
        <div className="relative mt-12 pt-12 flex justify-center items-end overflow-hidden h-[200px] md:h-[300px]">
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-3xl h-full max-h-64 bg-slate-100 rounded-full blur-[100px] pointer-events-none z-0"/>
          <h1 className="text-center font-extrabold leading-[0.8] text-transparent text-[clamp(4rem,18vw,20rem)] [-webkit-text-stroke:1px_#D4D4D4] relative z-10 translate-y-[20%] font-display select-none" style={{ fontFamily: 'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif' }}>
            SARAL AI
          </h1>
        </div>
      </section>
    </div>
  );
}
