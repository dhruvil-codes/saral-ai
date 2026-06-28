import React from "react";

export function SaralLogoMark({
  size = 32,
  fill,
  className = "",
}: {
  size?: number;
  fill?: string;
  className?: string;
}) {
  const pathFill = fill || "currentColor";
  return (
    <svg
      width={size}
      height={Math.round(size * (53 / 59))}
      viewBox="0 0 59 53"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M18.986 0C8.5 0 0 8.5 0 18.986s8.5 18.986 18.986 18.987q1.068-.001 1.977-.107V.127A15 15 0 0 0 18.986 0"
        fill={pathFill}
      />
      <path
        d="M36.374 15.84c-8.638 0-15.64-7.002-15.64-15.64V.188h17.319v15.54q-.77.111-1.679.112"
        fill={pathFill}
      />
      <path
        d="M39.634 53C50.12 53 58.62 44.5 58.62 34.014s-8.5-18.987-18.986-18.987q-1.067.001-1.977.107v37.739a15 15 0 0 0 1.977.127"
        fill={pathFill}
      />
      <path
        d="M22.246 37.184c8.637 0 15.64 7.002 15.64 15.64H20.568v-15.53a12 12 0 0 1 1.68-.11"
        fill={pathFill}
      />
    </svg>
  );
}

export const Logo = ({
  markSize = 32,
  textSize = "text-2xl",
  textColor = "text-foreground",
  markColor,
  className = "",
}: {
  markSize?: number;
  textSize?: string;
  textColor?: string;
  markColor?: string;
  className?: string;
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <SaralLogoMark size={markSize} fill={markColor} />
      <span
        className={`font-semibold tracking-tight ${textSize} ${textColor}`}
        style={{
          fontFamily:
            'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
        }}
      >
        Saral AI
      </span>
    </div>
  );
};

export default Logo;
