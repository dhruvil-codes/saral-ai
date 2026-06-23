import React from "react";

export default function Footer() {
  return (
    <footer className="w-full bg-neutral py-12 border-t border-outline select-none">
      <div className="mx-auto max-w-[1160px] px-4 lg:px-margin">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          
          {/* Logo & Tagline */}
          <div className="flex flex-col items-start">
            <span className="font-display text-[20px] font-extrabold text-on-surface mb-2">
              Saral AI
            </span>
            <p className="body-sm text-on-surface-variant max-w-[32ch]">
              Voice AI assistants for Indian businesses. Never miss a lead again.
            </p>
          </div>

          {/* Social Links & Attribution */}
          <div className="flex flex-col md:items-end gap-3">
            {/* Built by line */}
            <div className="body-sm text-on-surface-variant font-medium">
              Built by{" "}
              <a
                href="https://github.com/bydhruvil"
                className="underline decoration-primary decoration-2 hover:text-on-surface transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                @bydhruvil
              </a>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-6">
              <a
                href="https://twitter.com/bydhruvil"
                className="label-sm text-muted hover:text-on-surface transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Twitter / X
              </a>
              <a
                href="https://linkedin.com/in/bydhruvil"
                className="label-sm text-muted hover:text-on-surface transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
