"use client";

import { useState } from "react";
import { 
  Building, 
  MessageSquare, 
  Bot, 
  Save, 
  Check, 
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState("Sharma Hair Salon");
  const [whatsappNumber, setWhatsappNumber] = useState("+91 98102 34567");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are 'Saral', a friendly AI voice receptionist for Sharma Hair Salon located in Sector 62, Noida. Speak in Hindi, Hinglish, or English depending on how the customer speaks. Always call people politely with 'Ji' or 'Sir/Ma'am'. Your goal is to qualify the customer's requirement (haircut, coloring, bridal, or spa), note down their preferred day/time (we are open daily 9:30 AM - 8:30 PM), ask for their name, and tell them you are sending the booking link on WhatsApp."
  );
  
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [agentLanguage, setAgentLanguage] = useState("Hinglish");
  const [agentVoice, setAgentVoice] = useState("Pooja (Female)");
  const [toastMessage, setToastMessage] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Trigger toast
    setToastMessage("Settings updated successfully!");
    setTimeout(() => setToastMessage(""), 3000);
  };

  return (
    <div className="space-y-8 font-sans relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--color-text-primary)] text-white text-xs font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Agent Settings
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Configure your Voice AI receptionist behaviors, notification summaries, and profile credentials.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 max-w-3xl">
        
        {/* Section 1: Business Profile */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--color-border)]">
            <Building className="w-5 h-5 text-[var(--color-accent)]" />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Business Profile
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[var(--color-text-secondary)] uppercase">Business Name</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] font-sans"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[var(--color-text-secondary)] uppercase">WhatsApp Number (Alert Receiver)</label>
              <input
                type="text"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] font-sans"
              />
            </div>
          </div>
        </div>

        {/* Section 2: WhatsApp Summary Alerts */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-[var(--color-accent)]" />
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                WhatsApp Lead Summaries
              </h3>
            </div>
            
            <button
              type="button"
              onClick={() => setWhatsappAlerts(!whatsappAlerts)}
              className="text-[var(--color-text-secondary)] cursor-pointer"
            >
              {whatsappAlerts ? (
                <ToggleRight className="w-9 h-9 text-[var(--color-accent)]" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-[var(--color-text-muted)]" />
              )}
            </button>
          </div>

          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            When enabled, Saral AI will automatically send a formatted lead card and summary via WhatsApp to your number instantly after the call terminates.
          </p>

          {whatsappAlerts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[var(--color-text-secondary)] uppercase">Summary Language</label>
                <select
                  value={agentLanguage}
                  onChange={(e) => setAgentLanguage(e.target.value)}
                  className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] font-sans"
                >
                  <option value="Hinglish">Hinglish (mix of Hindi + English)</option>
                  <option value="English">Pure English</option>
                  <option value="Hindi">Pure Hindi</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[var(--color-text-secondary)] uppercase">Alert Frequency</label>
                <div className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] font-semibold select-none">
                  Instant (On Every Call)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: AI Voice Assistant Prompt instructions */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--color-border)]">
            <Bot className="w-5 h-5 text-[var(--color-accent)]" />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              AI receptionist Context & Prompt
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="font-bold text-[var(--color-text-secondary)] uppercase">System Prompt Instructions</label>
                <span className="text-[10px] text-[var(--color-text-muted)] font-semibold">Trained Model: Gemini 1.5 Flash Voice</span>
              </div>
              <textarea
                required
                rows={7}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] resize-none font-sans leading-relaxed"
              />
              <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                Describe the AI's identity, key conversational guidelines, timings, specific products/services, and information it must collect from customers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[var(--color-text-secondary)] uppercase">Voice Accent Selection</label>
                <select
                  value={agentVoice}
                  onChange={(e) => setAgentVoice(e.target.value)}
                  className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] font-sans"
                >
                  <option value="Pooja (Female)">Pooja (Female) - Warm & Professional</option>
                  <option value="Aarav (Male)">Aarav (Male) - Confident & Clear</option>
                  <option value="Ananya (Female)">Ananya (Female) - Polite Indian Accent</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[var(--color-text-secondary)] uppercase">Interruption Level</label>
                <select
                  className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] font-sans"
                  defaultValue="Medium"
                >
                  <option value="Low">Low (AI waits for silence)</option>
                  <option value="Medium">Medium (Balanced interaction)</option>
                  <option value="High">High (AI responds dynamically)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Save button (Pill-shaped CTA, yellow bg, dark text, exactly one per viewport) */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-primary)] font-bold px-8 py-3 rounded-full shadow-[0_2px_8px_rgba(245,166,35,0.25)] transition-all transform hover:-translate-y-0.5 active:scale-98 text-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>

      </form>
    </div>
  );
}
