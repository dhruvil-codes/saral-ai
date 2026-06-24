import React from "react";

interface LineArtProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

// Problem 1: Missed Calls (A phone ringing with missed call waves and a warning alert)
export function MissedCallsIllustration({ className = "", size = 48, ...props }: LineArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className}`}
      {...props}
    >
      {/* Hand-drawn style phone handset */}
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      {/* Alert / Missed symbol */}
      <circle cx="18" cy="6" r="3" stroke="var(--color-accent)" strokeWidth="1.5" />
      <line x1="18" y1="5" x2="18" y2="7" stroke="var(--color-accent)" strokeWidth="1.5" />
      <line x1="18" y1="8.5" x2="18.01" y2="8.5" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Missed rings */}
      <path d="M12 2a10.5 10.5 0 0 0-8 4" strokeDasharray="2 2" />
    </svg>
  );
}

// Problem 2: High Operations Cost (Hourglass with escaping money/coins and a steep curve)
export function CostIllustration({ className = "", size = 48, ...props }: LineArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className}`}
      {...props}
    >
      {/* Hourglass */}
      <path d="M5 2h14" />
      <path d="M5 22h14" />
      <path d="M19 2v4a7 7 0 0 1-2.68 5.4L12 15l-4.32-3.6A7 7 0 0 1 5 6V2" />
      <path d="M19 22v-4a7 7 0 0 0-2.68-5.4L12 9l-4.32 3.6A7 7 0 0 0 5 18v4" />
      {/* Falling currency symbol or coins */}
      <circle cx="12" cy="17" r="1.5" stroke="var(--color-accent)" />
      <line x1="12" y1="4" x2="12" y2="8" stroke="var(--color-accent)" strokeDasharray="1 2" />
      {/* Cost graph trend downwards inside the background */}
      <path d="M2 12h3l2-3 4 5 3-4 8 8" strokeOpacity="0.4" strokeDasharray="3 3" />
    </svg>
  );
}

// Problem 3: Language Barriers (Chat bubbles with Indian scripts: 'अ' and 'A' translating)
export function LanguageIllustration({ className = "", size = 48, ...props }: LineArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className}`}
      {...props}
    >
      {/* Primary chat bubble (Indian script 'अ' representation) */}
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      {/* Custom Hindi 'अ' line-art path inside the bubble */}
      <path
        d="M8 7h3.5 M8 9.5h3.5 M9.5 7v5 M8 12c1 0 1.8-.8 1.8-1.8 M12 8a2 2 0 0 0-2 2v2"
        stroke="var(--color-accent)"
        strokeWidth="1.2"
      />
      {/* Secondary overlapping chat bubble (English 'A') */}
      <path d="M15 18l-3 3v-3.5a5.5 5.5 0 0 1-5.5-5.5V11" strokeDasharray="3 3" />
      {/* English 'A' inside representation */}
      <path d="M15 8l2 4M19 8l-2 4M15.5 11h3" stroke="var(--color-text-secondary)" strokeWidth="1.2" />
    </svg>
  );
}

// Step 1: Design Agent (Voice agent visual settings, sound waves, sliders)
export function StepDesignIllustration({ className = "", size = 64, ...props }: LineArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className}`}
      {...props}
    >
      {/* Voice avatar head outline */}
      <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="1" />
      <circle cx="12" cy="9" r="3" stroke="var(--color-accent)" />
      <path d="M6 17c0-2 4-3 6-3s6 1 6 3" stroke="var(--color-accent)" />
      {/* Microphone / Sound waves */}
      <path d="M7 9v1a5 5 0 0 0 10 0V9" strokeOpacity="0.6" />
      <line x1="12" y1="15" x2="12" y2="18" strokeOpacity="0.6" />
      {/* Control sliders */}
      <line x1="5" y1="6" x2="8" y2="6" />
      <circle cx="8" cy="6" r="1" fill="currentColor" />
      <line x1="16" y1="18" x2="19" y2="18" />
      <circle cx="16" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

// Step 2: Connect Channels (Plug wires, APIs, connection lines, data pipeline)
export function StepConnectIllustration({ className = "", size = 64, ...props }: LineArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className}`}
      {...props}
    >
      {/* Core plug structure */}
      <rect x="2" y="7" width="6" height="10" rx="1" />
      <line x1="8" y1="10" x2="16" y2="10" stroke="var(--color-accent)" />
      <line x1="8" y1="14" x2="16" y2="14" stroke="var(--color-accent)" />
      <rect x="16" y="7" width="6" height="10" rx="1" />
      {/* Nodes and transmission paths */}
      <path d="M5 7V3h14v4" strokeDasharray="3 3" />
      <circle cx="12" cy="3" r="1.5" stroke="var(--color-accent)" />
      <path d="M5 17v4h14v-4" strokeDasharray="3 3" />
      <circle cx="12" cy="21" r="1.5" stroke="var(--color-accent)" />
    </svg>
  );
}

// Step 3: Go Live / Auto-Pilot (Phone tower beaming waves, calls resolved checkbox)
export function StepLiveIllustration({ className = "", size = 64, ...props }: LineArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className}`}
      {...props}
    >
      {/* Automated robot calling tower or transmission dish */}
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="var(--color-accent)" />
      <path d="M12 18V12" stroke="var(--color-accent)" />
      <path d="M8 22l4-4 4 4" />
      {/* Expanding voice signal waves */}
      <path d="M12 6a6 6 0 0 1 5.66 4" strokeDasharray="2 2" />
      <path d="M12 2a10 10 0 0 1 9.4 6.7" />
      <path d="M12 6a6 6 0 0 0-5.66 4" strokeDasharray="2 2" />
      <path d="M12 2a10 10 0 0 0-9.4 6.7" />
      {/* Big success checkmark badge overlay */}
      <circle cx="19" cy="18" r="4" fill="var(--color-surface)" stroke="var(--color-icon-green)" />
      <path d="M17.5 18l1 1 2-2" stroke="var(--color-icon-green)" strokeWidth="2" />
    </svg>
  );
}
