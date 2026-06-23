<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Agent Design Constraints

Before writing any UI code, read `DESIGN.md` in full.

Rules:

1. Color: Reference only named tokens from DESIGN.md (e.g., `colors.primary`, `colors.neutral`). No arbitrary hex values.
2. Typography: `display-*` tokens use Fraunces, all other tokens use Geist. Never use Fraunces below 24px.
3. Buttons: Always pill-shaped (`rounded.full`). Primary CTA: yellow bg, dark text. One per viewport.
4. Cards: `rounded.xl` (24px), `1px solid outline` border, `0 2px 8px` shadow max.
5. Spacing: Follow `spacing.*` tokens. Section padding is `spacing.section` (96px desktop, 64px mobile).
6. Elevation: Flat model only. Max shadow blur = 24px. No glassmorphism, no `backdrop-filter` except sticky nav.
7. Layout: 12-col grid, max-width 1160px, page padding 32px desktop / 16px mobile.
8. Wave dividers: Inline SVG only, max 3 per page, fill = incoming section background color.
9. Do not generate dark mode styles, custom icon sets, or animation keyframes — not specced in DESIGN.md.
10. When in doubt about any visual decision, default to the closest matching DESIGN.md token. Do not invent patterns.

DESIGN.md is the authoritative source for all design tokens, colors,
typography, and components. Skills enhance execution quality but never
override DESIGN.md rules.
