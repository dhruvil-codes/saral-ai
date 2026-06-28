import React from 'react';

export default function Footer() {
    return (
        <>
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap');
                    .saral-footer-text {
                        font-family: "Geist", sans-serif;
                    }
                `}
            </style>
            <div className='bg-[var(--color-surface-alt)] pt-20 px-4 saral-footer-text'>
                <footer className="bg-white w-full max-w-[1350px] mx-auto text-black pt-8 lg:pt-12 px-4 sm:px-8 md:px-16 lg:px-28 rounded-tl-3xl rounded-tr-3xl overflow-hidden">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-6 gap-8 md:gap-12">
                        
                        <div className="lg:col-span-3 space-y-6">
                            {/* Saral AI Logo SVG or Text */}
                            <a href="/" className="block">
                                <h2 className="text-2xl font-bold tracking-tight">Saral AI</h2>
                            </a>
                            <p className="text-sm/6 text-neutral-600 max-w-96">
                                Saral AI provides zero-friction voice automation and instant WhatsApp lead capture to ensure Indian businesses never miss a customer again.
                            </p>
                        </div>

                        <div className="lg:col-span-3 flex lg:justify-end items-start">
                            {/* Platform */}
                            <div>
                                <h3 className="font-medium text-sm mb-4">Platform</h3>
                                <ul className="space-y-3 text-sm text-neutral-800">
                                    <li><a href="#" className="hover:text-neutral-700">Voice Engine</a></li>
                                    <li><a href="#" className="hover:text-neutral-700">Dashboard</a></li>
                                    <li><a href="#" className="hover:text-neutral-700">Integrations</a></li>
                                    <li><a href="#" className="hover:text-neutral-700">Pricing</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto mt-12 pt-4 border-t border-neutral-300 flex justify-between items-center z-10 relative">
                        <p className="text-neutral-600 text-sm">© 2026 Saral AI</p>
                        <p className='text-sm text-neutral-600'>All rights reserved.</p>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-3xl h-full max-h-64 bg-slate-100 rounded-full blur-[100px] pointer-events-none"/>
                        <h1 className="text-center font-extrabold leading-[0.7] text-transparent text-[clamp(3rem,15vw,15rem)] [-webkit-text-stroke:1px_#D4D4D4] mt-6 relative z-0">
                            SARAL AI
                        </h1>
                    </div>
                </footer>
            </div>
        </>
    )
}
