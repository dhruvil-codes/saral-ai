# design.md — Saral AI Visual Identity

## Positioning

Saral AI — Multilingual Voice Intake & Triage Agent for Indian Clinics.
Warm, editorial, trustworthy — not sterile SaaS, not clinical/cold. Should
feel like a thoughtful front-desk assistant, not a generic dashboard.

## Typography

- Headlines: **Fraunces** (serif) — used for page titles, section headers,
  hero copy. Gives editorial warmth, avoids generic tech-startup feel.
- Body: **Inter** (sans-serif) — all body text, labels, form fields, UI copy.
- Never mix a third typeface in. If a component needs a monospace font
  (e.g. displaying a phone number or SID), use system mono sparingly.

## Color Palette

- Base/background: `#f5f5f0` (cream) — primary canvas color, not pure white
- Accent: `#f5a623` (amber) — CTAs, active states, highlights, urgency
  indicators where appropriate (but NOT for medical urgency — see below)
- Text: dark neutral (near-black, not pure `#000`) for body copy on cream
- Avoid: bright blues/purples associated with generic SaaS dashboards —
  breaks the editorial warmth

## Urgency / Status Colors (case cards, dashboard)

- Urgent: warm red/orange — used sparingly, only for `urgency_level: urgent`
- Same-day: amber (matches accent) — consistent with brand accent
- Routine: neutral gray/green — calm, no urgency implied
- FAQ-only: muted gray — lowest visual weight
  Keep this palette distinct from the amber CTA accent where possible, so
  "urgent" doesn't visually blend into "call to action."

## Layout Principles

- Generous whitespace — editorial feel means room to breathe, not dense
  enterprise-dashboard layouts
- Rounded corners, soft shadows — warm, approachable, not sharp/clinical
- 3-view dashboard nav (call logs, case cards, FAQ/config) — keep the nav
  itself minimal, no nested menus or clutter

## Component Consistency

- Use shadcn/ui components as the base where already integrated — don't
  introduce a second component library
- Forms (clinic config): clear labels above fields, not placeholder-only
  labels (placeholders disappear on input, hurting usability)
- Buttons: amber accent for primary actions, neutral outline for secondary

## Tone in Copy

- Clinic-specific, never generic MSME language ("your business" →
  "your clinic"; "customers" → "patients")
- Bilingual-aware — Hindi/Marathi phrasing should feel natural where shown,
  not machine-translated

## What NOT to do

- No stock "AI robot" or generic tech iconography — this is a clinic tool,
  keep imagery warm/human where used at all
- No dense data-table-heavy dashboards — this is a hackathon demo, prioritize
  clarity over exhaustive feature display
- Don't introduce a new color outside this palette without a clear reason
