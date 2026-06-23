import React from "react";

interface WaveDividerProps {
  fillColor: string; // CSS hex color or CSS variable e.g. "var(--color-surface-alt)"
  flipped?: boolean;
}

export default function WaveDivider({ fillColor, flipped = false }: WaveDividerProps) {
  return (
    <div 
      className={`w-full overflow-hidden leading-[0] select-none ${flipped ? "rotate-180" : ""}`} 
      aria-hidden="true"
    >
      <svg
        className="relative block w-full h-[60px]"
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        style={{ fill: fillColor }}
      >
        {/* Elegant inline SVG sine wave path */}
        <path d="M0,30 C360,65 720,-5 1080,30 C1260,45 1380,15 1440,30 L1440,60 L0,60 Z" />
      </svg>
    </div>
  );
}
