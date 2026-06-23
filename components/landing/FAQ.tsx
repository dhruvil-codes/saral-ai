"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "What languages does Saral AI support?",
      answer:
        "Saral AI is built natively for Indian businesses and supports Hindi, English, and Hinglish (mixing both Hindi and English naturally). It switches between them mid-conversation based on how your customer responds.",
    },
    {
      question: "How does the WhatsApp summary work?",
      answer:
        "Within seconds of a call ending, our system processes the recording, extracts the core customer intent, contact details, and any agreed next actions. We format this into a neat summary card and send it to your pre-configured WhatsApp number immediately.",
    },
    {
      question: "Do I need any technical setup?",
      answer:
        "No. You do not need any coding or system administration. We set up call forwarding from your current business number or supply a brand new local number for you to advertise. The setup is ready in under 24 hours.",
    },
    {
      question: "What happens if the AI can't answer a question?",
      answer:
        "If a customer asks something highly specific or requests human assistance, Saral AI politely informs them that it will verify the detail, notes down their query, marks the call as 'Urgent Callback Needed' in your WhatsApp summary, and lets you take over.",
    },
    {
      question: "Is there a free trial?",
      answer:
        "Yes! Early access users receive 50 free phone calls to verify system speed, transcription accuracy, and the quality of WhatsApp notifications before choosing a plan.",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative bg-surface-alt py-section">
      <div className="mx-auto max-w-[1160px] px-4 lg:px-margin">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-start mb-12"
        >
          {/* Eyebrow */}
          <div className="caption text-on-surface-variant flex items-center gap-2 select-none mb-4">
            <span className="text-primary text-[10px]">●</span> FAQ
          </div>
          
          {/* Headline */}
          <h2 className="display-md text-on-surface mb-lg">
            Frequently asked questions
          </h2>
          
          {/* Subheadline (body-lg) */}
          <p className="body-lg text-on-surface-variant max-w-[65ch]">
            Everything you need to know about setting up and running Saral AI for your business.
          </p>
        </motion.div>

        {/* Accordion Rows */}
        <div className="w-full border-b border-outline">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="border-t border-outline py-5">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between text-left focus:outline-none group select-none py-1"
                  aria-expanded={isOpen}
                >
                  {/* Question */}
                  <span className="body-md font-medium text-on-surface group-hover:text-on-surface-variant transition-colors duration-150">
                    {faq.question}
                  </span>
                  
                  {/* Plus/Minus Indicator */}
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-4 flex h-6 w-6 items-center justify-center text-[22px] font-bold text-on-surface-variant select-none"
                  >
                    +
                  </motion.span>
                </button>

                {/* Animated Answer Body */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="pt-4 body-md text-on-surface-variant leading-relaxed max-w-[80ch]">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

