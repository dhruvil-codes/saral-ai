"use client";

import { useState } from "react";
import { 
  PhoneCall, 
  Clock, 
  Calendar, 
  MessageSquare, 
  Play, 
  Pause, 
  X, 
  Search,
  Languages,
  Smile,
  Volume2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock call logs data with Hinglish/English transcripts
const callLogs = [
  {
    id: "CALL-9821",
    number: "+91 98102 34567",
    date: "2026-06-25",
    time: "10:42 AM",
    duration: "2m 14s",
    durationSec: 134,
    status: "Lead Qualified",
    language: "Hinglish",
    sentiment: "Positive",
    intent: "Haircut & hair coloring appointment",
    transcript: [
      { speaker: "AI", text: "Hello! Sharma Hair Salon mein aapka swagat hai. Main Saral AI hoon. Aapki kya madad kar sakti hoon?" },
      { speaker: "Customer", text: "Haan ji, mujhe Saturday ko haircut aur hair color karvana tha. Koi slot khaali hai kya?" },
      { speaker: "AI", text: "Ji bilkul! Saturday ko subah 10 baje se 1 baje ke beech slots khaali hain. Aapko kaunsa time suit karega?" },
      { speaker: "Customer", text: "Mujhe 11:30 AM ka time de do. Priya ke naam se book kar dena." },
      { speaker: "AI", text: "Perfect! Priya ji, Saturday subah 11:30 AM ka haircut aur color slot book kar diya hai. Main details aapko WhatsApp par bhej rahi hoon." },
      { speaker: "Customer", text: "Theek hai, thank you so much." },
      { speaker: "AI", text: "Aapka swagat hai! Sharma Hair Salon aane ke liye dhanyawad. Have a nice day!" }
    ]
  },
  {
    id: "CALL-9820",
    number: "+91 99534 87621",
    date: "2026-06-25",
    time: "10:30 AM",
    duration: "1m 45s",
    durationSec: 105,
    status: "Answered",
    language: "English",
    sentiment: "Neutral",
    intent: "Bridal makeup package pricing & queries",
    transcript: [
      { speaker: "AI", text: "Hello! Welcome to Sharma Hair Salon. I am Saral, your AI assistant. How can I help you today?" },
      { speaker: "Customer", text: "Hi, I wanted to inquire about the pricing for bridal makeup packages for December." },
      { speaker: "AI", text: "Certainly! Our bridal makeup packages range from ₹15,000 for standard styling to ₹35,000 for luxury HD makeup. Would you like me to send you the brochure with full details on WhatsApp?" },
      { speaker: "Customer", text: "Yes, please send it to this number. My name is Rajesh Gupta." },
      { speaker: "AI", text: "Done, Rajesh ji! I have triggered the bridal makeup details brochure to your WhatsApp. Let me know if you would like to schedule a trial consultation." },
      { speaker: "Customer", text: "Okay, I will check it. Thanks." }
    ]
  },
  {
    id: "CALL-9819",
    number: "+91 98711 02938",
    date: "2026-06-25",
    time: "10:15 AM",
    duration: "0m 52s",
    durationSec: 52,
    status: "Answered",
    language: "Hindi",
    sentiment: "Neutral",
    intent: "Salon timings inquiry",
    transcript: [
      { speaker: "AI", text: "Namaste! Sharma Hair Salon mein aapka swagat hai. Kaise help karu aapki?" },
      { speaker: "Customer", text: "Hello, aapka salon aaj kitne baje khulta hai?" },
      { speaker: "AI", text: "Hum roz subah 9:30 AM se leke shaam 8:30 PM tak open rehte hain. Sunday ko bhi open rehte hain." },
      { speaker: "Customer", text: "Theek hai, main sham ko 6 baje ke aas paas aata hoon fir." },
      { speaker: "AI", text: "Bilkul swagat hai aapka! Kisi services ke liye appointment block karni ho toh bata dijiyega. Have a great day!" }
    ]
  },
  {
    id: "CALL-9818",
    number: "+91 98122 88442",
    date: "2026-06-25",
    time: "09:58 AM",
    duration: "3m 05s",
    durationSec: 185,
    status: "Lead Qualified",
    language: "Hinglish",
    sentiment: "Positive",
    intent: "Keratin treatment appointment slots",
    transcript: [
      { speaker: "AI", text: "Hello! Sharma Hair Salon mein aapka swagat hai. Kaise help karu aapki?" },
      { speaker: "Customer", text: "Hi, mujhe keratin treatment karvana tha. Uska cost aur slots bata sakte ho?" },
      { speaker: "AI", text: "Keratin treatment ka base pricing ₹3,999 se start hota hai, jo aapki hair length aur density par depend karta hai. Slots aaj shaam ko 4 PM aur 6 PM par khaali hain. Kya aapko inme se koi slot block karna hai?" },
      { speaker: "Customer", text: "Cost toh reasonable hai. Haan, please aaj shaam ko 4 PM ka slot book kar do." },
      { speaker: "AI", text: "Aapka 4 PM ka Keratin treatment slot Sneha ke naam se register kar diya hai. Pre-care tips aur booking details maine WhatsApp par send kar di hain. See you in the evening!" },
      { speaker: "Customer", text: "Perfect. Thank you." }
    ]
  },
  {
    id: "CALL-9817",
    number: "+91 99991 23456",
    date: "2026-06-23",
    time: "09:40 AM",
    duration: "1m 20s",
    durationSec: 80,
    status: "Answered",
    language: "English",
    sentiment: "Positive",
    intent: "Annual VIP salon membership details",
    transcript: [
      { speaker: "AI", text: "Hello! Welcome to Sharma Hair Salon. How can I assist you today?" },
      { speaker: "Customer", text: "Hi, I keep seeing your VIP membership posters. Can you tell me what the benefits are?" },
      { speaker: "AI", text: "Yes! Our VIP membership costs ₹5,000 annually. You get a flat 15% discount on all services, one free haircut on your birthday, and priority scheduling. Would you like me to register you for this?" },
      { speaker: "Customer", text: "Sounds interesting. Send me the details on WhatsApp, I'll take a look and buy." },
      { speaker: "AI", text: "Done! I've sent the payment link and details sheet. Thank you for calling!" }
    ]
  }
];

export default function CallLogsPage() {
  const [selectedCall, setSelectedCall] = useState<typeof callLogs[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Filter logs
  const filteredLogs = callLogs.filter(log => 
    log.number.includes(searchTerm) || 
    log.intent.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Lead Qualified":
        return (
          <span className="inline-block bg-[var(--color-accent-light)] text-[#92400e] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Qualified
          </span>
        );
      default:
        return (
          <span className="inline-block bg-[#f0fdf4] text-[#166534] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Answered
          </span>
        );
    }
  };

  // Mock Audio playback logic
  const handleAudioPlayToggle = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      const interval = setInterval(() => {
        setPlaybackProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsPlaying(false);
            return 0;
          }
          return prev + 2;
        });
      }, 300);
    }
  };

  return (
    <div className="space-y-8 font-sans relative">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Call History Logs
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Browse historical calls handled by the Voice AI. Click on any call to view details, dialogue transcripts, and audio playbacks.
        </p>
      </div>

      {/* Search Toolbar */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search logs by phone, call ID, or intent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-full pl-10 pr-4 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors font-sans"
          />
        </div>
      </div>

      {/* Calls Logs List */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] font-bold text-xs uppercase tracking-wider font-sans">
                <th className="px-6 py-4">Call ID</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Time & Date</th>
                <th className="px-6 py-4 text-center">Duration</th>
                <th className="px-6 py-4 text-center">Language</th>
                <th className="px-6 py-4 text-center">Outcome</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] text-sm text-[var(--color-text-primary)]">
              {filteredLogs.map((log) => (
                <tr 
                  key={log.id} 
                  onClick={() => {
                    setSelectedCall(log);
                    setPlaybackProgress(0);
                    setIsPlaying(false);
                  }}
                  className="hover:bg-[var(--color-surface-alt)]/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 font-mono text-xs text-[var(--color-text-muted)]">{log.id}</td>
                  <td className="px-6 py-4 font-bold">{log.number}</td>
                  <td className="px-6 py-4 text-xs text-[var(--color-text-secondary)]">
                    {log.date} · {log.time}
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-xs">{log.duration}</td>
                  <td className="px-6 py-4 text-center text-xs">
                    <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                      <Languages className="w-3 h-3 text-slate-400" />
                      {log.language}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">{getStatusBadge(log.status)}</td>
                  <td className="px-6 py-4 text-right font-bold text-[var(--color-accent)]">
                    View &rarr;
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sliding Side Sheet Panel (Drawer for detail view) */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity duration-300"
            onClick={() => setSelectedCall(null)}
          />

          {/* Sheet Drawer */}
          <div className="relative w-full max-w-lg md:max-w-xl bg-[var(--color-surface)] h-full shadow-2xl flex flex-col border-l border-[var(--color-border)] z-10 transition-transform duration-300">
            {/* Header */}
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase block">
                  Call Details · {selectedCall.id}
                </span>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mt-1 font-sans">
                  {selectedCall.number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="p-1.5 rounded-full hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Call Summary Cards Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--color-surface-alt)] p-4 rounded-[16px] border border-[var(--color-border)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold block">Date & Time</span>
                  <span className="text-xs font-bold text-[var(--color-text-primary)] mt-1 block">
                    {selectedCall.date} @ {selectedCall.time}
                  </span>
                </div>
                <div className="bg-[var(--color-surface-alt)] p-4 rounded-[16px] border border-[var(--color-border)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold block">Duration</span>
                  <span className="text-xs font-bold text-[var(--color-text-primary)] mt-1 block">
                    {selectedCall.duration}
                  </span>
                </div>
                <div className="bg-[var(--color-surface-alt)] p-4 rounded-[16px] border border-[var(--color-border)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold block">Language</span>
                  <span className="text-xs font-bold text-[var(--color-text-primary)] mt-1 block">
                    {selectedCall.language}
                  </span>
                </div>
                <div className="bg-[var(--color-surface-alt)] p-4 rounded-[16px] border border-[var(--color-border)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold block">Call Outcome</span>
                  <span className="text-xs font-bold text-[var(--color-text-primary)] mt-1 block">
                    {selectedCall.status}
                  </span>
                </div>
              </div>

              {/* Call Intent & Sentiment */}
              <div className="bg-[var(--color-accent-light)] p-4 rounded-[16px] border border-amber-200">
                <span className="text-[10px] text-amber-800 uppercase font-bold block">AI Qualified Intent</span>
                <span className="text-sm font-semibold text-amber-950 mt-1 block leading-normal">
                  &quot;{selectedCall.intent}&quot;
                </span>
                <div className="flex items-center gap-1.5 mt-3 text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                  <Smile className="w-3.5 h-3.5" />
                  <span>Customer Sentiment: {selectedCall.sentiment}</span>
                </div>
              </div>

              {/* MOCK AUDIO PLAYBACK UI */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-[var(--color-accent)]" />
                    <span>Call Recording Playback</span>
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                    {Math.floor((playbackProgress / 100) * selectedCall.durationSec)}s / {selectedCall.duration}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-[var(--color-surface-alt)] rounded-full overflow-hidden relative cursor-pointer">
                  <div 
                    className="h-full bg-[var(--color-accent)] transition-all duration-300"
                    style={{ width: `${playbackProgress}%` }}
                  />
                </div>

                {/* Controls (Pill shaped buttons & styling) */}
                <div className="flex justify-between items-center mt-1">
                  <button
                    onClick={handleAudioPlayToggle}
                    className="inline-flex items-center justify-center bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-primary)] w-8 h-8 rounded-full shadow-sm transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  </button>
                  
                  <span className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">
                    Audio Format: WAV (AI Transcribed)
                  </span>
                </div>
              </div>

              {/* TRANSCRIPT DIALOGUE */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" />
                  <span>Call Transcript (Hinglish/English)</span>
                </span>

                <div className="bg-[var(--color-surface-alt)] p-4 rounded-[20px] border border-[var(--color-border)] space-y-4 max-h-[360px] overflow-y-auto">
                  {selectedCall.transcript.map((bubble, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex flex-col gap-1 max-w-[85%] text-xs",
                        bubble.speaker === "AI" ? "mr-auto" : "ml-auto text-right"
                      )}
                    >
                      <span className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">
                        {bubble.speaker === "AI" ? "🤖 AI Agent" : "👤 Customer"}
                      </span>
                      <div 
                        className={cn(
                          "p-3 rounded-[16px] leading-relaxed",
                          bubble.speaker === "AI" 
                            ? "bg-white text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-tl-none" 
                            : "bg-[var(--color-accent-light)] text-amber-950 rounded-tr-none"
                        )}
                      >
                        {bubble.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
