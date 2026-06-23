import React from "react";

// Illustration 1: Hero illustration showing a friendly operator/AI with sound waves
export function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Decorative background shape */}
      <path
        d="M50 150 C50 80, 150 50, 250 80 C320 100, 350 200, 320 280 C280 350, 150 350, 90 320 C60 300, 50 220, 50 150 Z"
        fill="var(--color-tertiary)"
        opacity="0.6"
      />
      
      {/* Hand-drawn character face outline */}
      <path
        d="M200 130 C150 130, 140 180, 140 210 C140 250, 160 280, 200 280 C240 280, 260 250, 260 210 C260 180, 250 130, 200 130 Z"
        stroke="var(--color-on-surface)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--color-surface)"
      />
      
      {/* Hair outline */}
      <path
        d="M138 200 C135 150, 160 120, 200 120 C240 120, 265 150, 262 200 C265 180, 255 140, 200 140 C145 140, 135 180, 138 200 Z"
        stroke="var(--color-on-surface)"
        strokeWidth="2.5"
        fill="var(--color-on-surface)"
      />

      {/* Eyes */}
      <circle cx="180" cy="200" r="3.5" fill="var(--color-on-surface)" />
      <circle cx="220" cy="200" r="3.5" fill="var(--color-on-surface)" />

      {/* Smiling Mouth */}
      <path
        d="M185 230 C190 240, 210 240, 215 230"
        stroke="var(--color-on-surface)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Cheeks (Blush) */}
      <circle cx="165" cy="215" r="6" fill="var(--color-secondary)" opacity="0.2" />
      <circle cx="235" cy="215" r="6" fill="var(--color-secondary)" opacity="0.2" />

      {/* Headset headband */}
      <path
        d="M165 140 C165 110, 235 110, 235 140"
        stroke="var(--color-on-surface)"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Headset ear-cups */}
      <rect
        x="133"
        y="190"
        width="10"
        height="24"
        rx="4"
        stroke="var(--color-on-surface)"
        strokeWidth="2.5"
        fill="var(--color-primary)"
      />
      <rect
        x="257"
        y="190"
        width="10"
        height="24"
        rx="4"
        stroke="var(--color-on-surface)"
        strokeWidth="2.5"
        fill="var(--color-primary)"
      />
      {/* Headset microphone */}
      <path
        d="M138 210 L160 230 M160 230 C165 235, 170 235, 172 230"
        stroke="var(--color-on-surface)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Sound waves (oscilloscope style) */}
      <path
        d="M290 190 Q305 180 320 200 T350 200"
        stroke="var(--color-on-surface)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M295 210 Q310 200 325 220 T355 220"
        stroke="var(--color-on-surface)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M290 230 Q305 220 320 240 T350 240"
        stroke="var(--color-on-surface)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Left-side floating phone icon */}
      <g transform="translate(60, 180) rotate(-15)">
        <rect
          width="40"
          height="70"
          rx="6"
          stroke="var(--color-on-surface)"
          strokeWidth="2.5"
          fill="var(--color-surface)"
        />
        <line
          x1="10"
          y1="10"
          x2="30"
          y2="10"
          stroke="var(--color-on-surface)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="20" cy="60" r="3" fill="var(--color-on-surface)" />
      </g>
    </svg>
  );
}

// Illustration 2: CTA Section Illustration showing connection & WhatsApp summary
export function CTAIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Decorative circle background */}
      <circle cx="160" cy="160" r="100" fill="var(--color-neutral)" opacity="0.2" />

      {/* Main WhatsApp chat bubble mockup */}
      <g transform="translate(50, 60)">
        <rect
          width="220"
          height="140"
          rx="16"
          stroke="var(--color-on-surface)"
          strokeWidth="2.5"
          fill="var(--color-surface)"
        />
        {/* Tail of speech bubble */}
        <path
          d="M20 140 L10 155 L35 140 Z"
          stroke="var(--color-on-surface)"
          strokeWidth="2.5"
          fill="var(--color-surface)"
        />
        
        {/* WhatsApp branding header */}
        <rect
          x="12"
          y="12"
          width="196"
          height="28"
          rx="6"
          fill="var(--color-tertiary)"
        />
        {/* Text indicators */}
        <circle cx="28" cy="26" r="6" fill="var(--color-on-surface)" />
        <rect x="42" y="22" width="80" height="8" rx="3" fill="var(--color-on-surface)" />
        
        {/* Chat contents */}
        <rect x="16" y="52" width="188" height="6" rx="3" fill="var(--color-outline)" />
        <rect x="16" y="68" width="150" height="6" rx="3" fill="var(--color-outline)" />
        <rect x="16" y="84" width="170" height="6" rx="3" fill="var(--color-outline)" />

        {/* Lead Badge inside bubble */}
        <rect
          x="16"
          y="102"
          width="90"
          height="20"
          rx="10"
          fill="var(--color-primary)"
        />
        <rect x="26" y="108" width="70" height="8" rx="4" fill="var(--color-on-surface)" />
      </g>

      {/* Ringing phone floating icon */}
      <g transform="translate(200, 160) rotate(15)">
        <rect
          width="50"
          height="90"
          rx="8"
          stroke="var(--color-on-surface)"
          strokeWidth="2.5"
          fill="var(--color-surface)"
        />
        <rect x="5" y="10" width="40" height="60" rx="4" fill="var(--color-neutral)" />
        <circle cx="25" cy="80" r="4" fill="var(--color-on-surface)" />
        {/* Call symbol */}
        <path
          d="M17 32 Q25 28 33 32 L30 42 Q25 38 20 42 Z"
          stroke="var(--color-on-surface)"
          strokeWidth="2"
          fill="var(--color-secondary)"
        />
      </g>
    </svg>
  );
}

// Illustration 3: Phone outline with simple ringing indicators
export function PhoneCallIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="35"
        y="15"
        width="50"
        height="90"
        rx="10"
        stroke="var(--color-on-surface)"
        strokeWidth="2"
        fill="var(--color-surface)"
      />
      <line
        x1="45"
        y1="25"
        x2="75"
        y2="25"
        stroke="var(--color-on-surface)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="60" cy="95" r="4" fill="var(--color-on-surface)" />
      
      {/* Ring lines */}
      <path
        d="M95 35 C105 45, 105 75, 95 85"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M25 35 C15 45, 15 75, 25 85"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Illustration 4: Voice AI active animation mockup
export function VoiceActiveIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="40" stroke="var(--color-on-surface)" strokeWidth="2" fill="var(--color-surface)" />
      
      {/* Simulated voice wave lines */}
      <line x1="40" y1="60" x2="40" y2="60" stroke="var(--color-on-surface)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="50" x2="50" y2="70" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="60" y1="40" x2="60" y2="80" stroke="var(--color-secondary)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="70" y1="48" x2="70" y2="72" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="80" y1="60" x2="80" y2="60" stroke="var(--color-on-surface)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// Illustration 5: WhatsApp confirmation
export function WhatsAppIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="20"
        y="30"
        width="80"
        height="60"
        rx="12"
        stroke="var(--color-on-surface)"
        strokeWidth="2"
        fill="var(--color-surface)"
      />
      <path
        d="M35 90 L25 100 L45 90 Z"
        stroke="var(--color-on-surface)"
        strokeWidth="2"
        fill="var(--color-surface)"
      />
      {/* Checkmark inside */}
      <circle cx="60" cy="60" r="16" fill="var(--color-tertiary)" />
      <path
        d="M53 60 L58 65 L67 54"
        stroke="var(--color-on-surface)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
