---
version: alpha
name: Saral AI
description: >
  A warm-canvas, high-energy Voice AI SaaS aesthetic inspired by SayBriefly.
  The design is built on a cream off-white base with a single electric-yellow
  primary accent that commands every CTA and interactive moment. Typography is
  expressive at display scale (Syne, geometric 800-weight) and clinical at body
  scale (Inter, 400-weight), creating a "brilliant but approachable" tension
  that suits an AI product where trust matters. Audio-wave motifs — SVG sine
  dividers, oscilloscope decorations — anchor the voice/audio brand identity.
  Elevation is deliberately flat: hierarchy is communicated through colour
  contrast and 1px borders, never deep shadows. Illustration is hand-drawn
  line-art, warm and human, reinforcing the "real talk, real people, no bots"
  brand promise.

colors:
  primary: "#F5D000"
  primary-dark: "#C9A800"
  on-primary: "#1A1A1A"
  secondary: "#E8622A"
  on-secondary: "#FFFFFF"
  tertiary: "#D4EAC8"
  on-tertiary: "#1A1A1A"
  neutral: "#FAFAF5"
  surface: "#FFFFFF"
  surface-alt: "#F0F0E8"
  on-surface: "#1A1A1A"
  on-surface-variant: "#3D3D3D"
  outline: "#E2E2D8"
  muted: "#8A8A8A"

typography:
  display-lg:
    fontFamily: Syne, sans-serif
    fontSize: 72px
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: -0.03em
  display-md:
    fontFamily: Syne, sans-serif
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Syne, sans-serif
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Inter, sans-serif
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.65
  body-md:
    fontFamily: Inter, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Inter, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  label-md:
    fontFamily: Inter, sans-serif
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter, sans-serif
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.3
  caption:
    fontFamily: Inter, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.04em

rounded:
  none: 0px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 80px
  5xl: 96px
  6xl: 128px
  gutter: 24px
  margin: 32px
  section: 96px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 12px 32px
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.on-primary}"
  button-primary-active:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 12px 32px
  button-secondary-hover:
    backgroundColor: "rgba(26,26,26,0.06)"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 8px 16px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: 32px
  card-feature:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: 32px
  card-highlight:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.xl}"
    padding: 32px
  card-cta:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    rounded: "{rounded.2xl}"
    padding: 64px 48px
  badge:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px 12px
  badge-outline:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px 12px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  input-focus:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
  nav:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface-variant}"
    height: 60px
    padding: 0px 32px

---

## Overview

Saral AI's visual identity is built on a single governing idea: **clarity as a competitive advantage**. Voice AI products operate in a trust deficit — users worry about bots replacing real communication, about recordings, about automation erasing the human moment. Every design decision is made to dismantle that anxiety.

The palette is radically constrained: one loud electric-yellow accent (`primary`), one warm off-white canvas (`neutral`), one ink-black typographic anchor (`on-surface`). This restraint is not austerity — it is confidence. The yellow is the loudest thing on the page. Every CTA, every badge, every highlight competes for exactly the same attention. There is no visual noise.

Syne headlines communicate "opinionated product." Their geometric irregularities at large sizes read as designed, not defaulted. Inter body text is invisible in the best way — the reader consumes information without noticing the font. This contrast between expressive display and invisible body is the typographic heartbeat of the system.

Illustration does the warmth work that photography cannot reliably do. Hand-drawn ink line-art characters — diverse, expressive, posed naturally — appear in the hero, CTA bands, and footer. They signal "humans built this, for humans." This is a critical signal for Voice AI where the product must feel like an ally, not a replacement.

Audio-wave motifs (SVG sine dividers between sections, oscilloscope decorations in the hero) reinforce the voice/audio brand without being literal. They are decorative, not explanatory.

The product is for ambitious people who are already overwhelmed. The design gets out of their way.

## Colors

The palette has fourteen tokens across seven semantic roles. Coding agents must not introduce colours outside this set without explicit instruction.

- **Primary (`#F5D000`):** Electric yellow — the single brand accent. Used exclusively for primary CTAs, badge fills, interactive highlights, and the section eyebrow dot. Never placed on a white background without the `on-primary` (#1A1A1A) text pairing — this yellow fails WCAG AA against white at this luminosity.
- **Primary-dark (`#C9A800`):** The hover and pressed state for primary buttons. Applied only via `:hover` and `:active` states on primary button components.
- **On-primary (`#1A1A1A`):** Dark ink text rendered on top of any primary yellow surface.
- **Secondary (`#E8622A`):** Warm orange — used exclusively for CTA band section backgrounds. Never used for buttons or text decoration. One CTA band per page maximum.
- **On-secondary (`#FFFFFF`):** White text and headlines rendered on secondary orange surfaces.
- **Tertiary (`#D4EAC8`):** Soft mint green — used exclusively for testimonial card backgrounds and feature highlight cards. Provides warmth without adding a new hue energy.
- **On-tertiary (`#1A1A1A`):** Dark ink text rendered on tertiary mint surfaces.
- **Neutral (`#FAFAF5`):** The global page background — warm off-white with a barely perceptible yellow undertone that harmonises with primary. All sections that are not `surface-alt`, `secondary`, or `tertiary` use this.
- **Surface (`#FFFFFF`):** Card and modal backgrounds. The 5-point lightness step above `neutral` creates lift without a shadow.
- **Surface-alt (`#F0F0E8`):** Alternate section band. Sections toggle: `neutral → surface-alt → neutral`. Never use `surface-alt` inside a card.
- **On-surface (`#1A1A1A`):** Near-black for all headlines and high-emphasis text on light backgrounds. Not pure black — the warmth prevents harshness on the cream canvas.
- **On-surface-variant (`#3D3D3D`):** Mid-dark for body copy, secondary labels, nav links. Greater than 7:1 contrast on `neutral`.
- **Outline (`#E2E2D8`):** 1px card borders, section dividers, accordion separators. Never use a shadow where a border communicates the same thing.
- **Muted (`#8A8A8A`):** Captions, placeholder text, icon fills. Never use for body copy.

## Typography

The type system uses two families: **Syne** for all display moments and **Inter** for all functional text. Syne must be loaded from Google Fonts (`wght@700;800`). Inter is available as a system font fallback on most platforms but should be loaded for weights 400, 500, and 600.

Display tokens use `clamp()` for fluid sizing. In CSS, the agent should implement `display-lg` as `clamp(2.5rem, 5vw, 4.5rem)` and `display-md` as `clamp(1.875rem, 3.5vw, 3rem)`. The pixel values in the token schema represent the desktop maximum.

The hierarchy from most to least emphatic: `display-lg → display-md → display-sm → body-lg → body-md → label-md → body-sm → label-sm → caption`.

- **display-lg:** Hero page headline only. One per page. Never repeated.
- **display-md:** Section headlines. One per visible section. Always paired with a sub-copy block using `body-lg`.
- **display-sm:** Card headlines, modal titles, feature labels above the fold.
- **body-lg:** Hero sub-copy directly below `display-lg`, and testimonial quote text.
- **body-md:** All paragraph text, FAQ answers, feature descriptions. Line-length constrained to 65ch maximum.
- **label-md:** All button labels, nav links, tab labels. Never all-caps.
- **body-sm:** Meta text, dates, secondary labels, attribution lines.
- **label-sm:** Form labels, tooltip text, annotation text.
- **caption:** Badge text, eyebrow labels above headlines, integration strip labels. Always uppercase via CSS `text-transform: uppercase`. Letter spacing 0.04em is required at this size.

**Section eyebrows** (the small label appearing above a section headline) use `caption` style with a `primary` yellow dot prefix: `● Feature Name`. This pattern must be consistent throughout.

Syne must never appear below 24px. At smaller sizes its optical irregularities become illegible. Use `label-md` (Inter 600) as the fallback for any label that would otherwise require Syne at small size.

## Layout

The layout engine is a **12-column fluid grid** with a maximum content width of 1160px, centred with `margin: auto`, and horizontal page padding of `spacing.margin` (32px) at desktop, `spacing.md` (16px) at mobile.

```
max-width:       1160px
columns:         12
gutter:          spacing.gutter (24px) desktop / spacing.sm (8px) mobile
page-padding-x:  spacing.margin (32px) ≥1024px / spacing.md (16px) <1024px
```

**Section rhythm** — Vertical section padding follows a consistent beat of `spacing.section` (96px) top and bottom at desktop. At mobile, reduce to `spacing.3xl` (64px). Inside each section, the headline-to-sub-copy gap is `spacing.lg` (24px). The sub-copy-to-CTA gap is `spacing.xl` (32px).

**Feature grids** — Two-column at desktop (≥1024px), one-column at mobile. Column gap `spacing.gutter` (24px). Never use three columns for feature cards — readability suffers on mid-range tablets.

**Integration strip** — A horizontal flex row of partner logos at 40–48px height, centred, with `spacing.lg` (24px) gap between items. Wrap in `overflow-x: auto; scrollbar-width: none` for mobile overflow.

**Wave dividers** — SVG sine path dividers 48–80px tall separate major sections. The fill is always the incoming section's background colour. Implement as `<div aria-hidden="true">` wrapping inline `<svg viewBox="0 0 1440 60" preserveAspectRatio="none">`. Never use `<img>`. Maximum three wave dividers per page.

**Content max-width exceptions** — CTA bands and testimonial sections are full-bleed (background colour edge-to-edge), with inner content constrained to 720px max-width, centred.

## Elevation & Depth

Saral AI uses a **flat elevation model** with three levels. Heavy shadows are never used.

| Level | Name | Context | Treatment |
|-------|------|---------|-----------|
| 0 | Flat | Section backgrounds, page canvas, nav | Background colour only. No border. No shadow. |
| 1 | Card | Feature cards, FAQ rows, integration logos | `border: 1px solid {colors.outline}` + `box-shadow: 0 2px 8px rgba(26,26,26,0.06)` |
| 2 | Float | Dropdown menus, tooltips, popovers | `box-shadow: 0 8px 24px rgba(26,26,26,0.12)`. No border required at this level. |

The maximum `box-shadow` blur radius in the system is **24px**. Any shadow with blur greater than 24px is a violation. No gradient overlays. No glass-morphism. No `backdrop-filter` except on the sticky nav (see Components).

If you are tempted to add a dramatic drop shadow, use a `1px outline border` instead.

## Shapes

The shape language is **rounded-friendly but not bubbly**. Pill shapes (`rounded.full`) are reserved for buttons and badges only — they signal "interactive" and must not appear on cards or containers. Cards and panels use `rounded.xl` (24px). Inputs and small chips use `rounded.md` (12px). Sharp corners (`rounded.none`) are used only for full-bleed wave dividers and images that extend to a card edge.

The system never mixes pill-shaped and sharp-cornered elements within the same component grouping. If a card contains a button, the button is pill-shaped and the card is `rounded.xl`. The contrast in radius reinforces the hierarchy between container and interactive element.

## Components

### Button — Primary

Pill-shaped (`rounded.full`), `primary` yellow background, `on-primary` dark text, `label-md` typography. Padding `12px 32px`. No shadow, no border. On hover: background transitions to `primary-dark` in 150ms ease. On active/press: `transform: scale(0.97)` for physical feedback. Minimum touch target 44×44px — the default padding achieves this. Never place a primary button on a `primary` yellow background — switch to `button-secondary` in that context.

### Button — Secondary

Identical geometry and padding to primary. `transparent` background, `1.5px solid {colors.on-surface}` border, `on-surface` text. On hover: background becomes `rgba(26,26,26,0.06)`. Used when two actions of near-equal weight appear side by side, or on `secondary` (orange) CTA band backgrounds.

### Button — Ghost

No border, no background. `on-surface-variant` text, `label-md` typography, `rounded.full`. Padding `8px 16px`. Used for tertiary actions, nav items that need a button affordance, and "learn more" inline links.

### Card

`surface` white background, `1px solid {colors.outline}` border, `rounded.xl` (24px), `32px` internal padding on all sides, `box-shadow: 0 2px 8px rgba(26,26,26,0.06)`. Content inside cards uses `display-sm` for the card headline, `body-md` for description, and optionally a `badge-outline` tag at the top. Feature variant cards add `border-left: 4px solid {colors.primary}` as a yellow left stripe — this is the only border decoration in the system.

### Card — Highlight

`tertiary` mint background, no border, no shadow, `rounded.xl`, `32px` padding. Used for feature pull-outs, testimonial-adjacent quotes, and product benefit callouts. Text uses `on-tertiary` (`#1A1A1A`).

### Card — CTA Band

Full-bleed `secondary` orange background, `rounded.2xl` (32px) when used as an island card or 0px when used as a full-width section. Inner content max-width 720px, centred. Headline in `display-md`, `on-secondary` white. Sub-copy in `body-lg`, `rgba(255,255,255,0.8)`. One `button-primary` CTA. Paired with a hand-drawn illustration to the right at desktop (hidden at mobile).

### Badge

Filled variant: `primary` yellow fill, `on-primary` dark text, `caption` typography (uppercase), `rounded.full`, `4px 12px` padding. Outline variant: `transparent` background, `1px solid {colors.outline}` border, `on-surface-variant` text. Badges appear above section headlines as eyebrows, on feature card tops as category labels, and in the nav for "New" or "Beta" markers. Maximum one badge per card.

### Navigation

`neutral` background, `1px solid {colors.outline}` bottom border, `60px` height, sticky at `z-index: 100`. Logo left-aligned. Nav links centred or right-aligned using `label-md` style in `on-surface-variant`. One `button-primary` in the top-right corner. On scroll past 60px: `background: rgba(250,250,245,0.92)` + `backdrop-filter: blur(8px)`. This is the **only place** `backdrop-filter` is used in the system.

### Input Field

`surface` white background, `1.5px solid {colors.outline}` border, `rounded.md` (12px), `12px 16px` padding, `body-md` text. Focus ring: `outline: 2px solid {colors.primary}` with `outline-offset: 2px`. Error state: border and outline change to `#D32F2F`. Placeholder text uses `muted` colour. Field label above the input uses `label-sm` at `on-surface-variant`.

### Accordion / FAQ

Full-width rows, no card wrapper — rows sit directly on the section background. `border-top: 1px solid {colors.outline}` separates each row. Trigger uses `body-md` at fontWeight 500, `on-surface` colour, with a `+` / `−` icon right-aligned. Content area uses `body-md` `on-surface-variant` with `16px` top padding. Height animates with `transition: height 200ms ease` — never toggle with `display: none`.

### Testimonial Card

`tertiary` mint background, `rounded.xl`, `40px 32px` padding. A decorative `"` quotation mark in `primary` yellow at `font-size: 5rem`, `aria-hidden="true"`, anchors the top-left. Quote text in `body-lg` italic, `on-tertiary`. Attribution line in `body-sm`, `muted`. No avatar — text-only layout only.

## Do's and Don'ts

**Do:**
- Use `primary` yellow only on interactive elements and eyebrow labels — nowhere else.
- Keep `display-lg` to one instance per page, always in the hero section.
- Alternate section backgrounds between `neutral` and `surface-alt` for visual rhythm.
- Use `rounded.full` exclusively for buttons and badges — no cards, no containers.
- Set body copy containers to `max-width: 65ch` for optimal line length.
- Pair every `display-md` section headline with `body-lg` sub-copy directly below it.
- Use the eyebrow pattern (`caption` + yellow dot + label) consistently before every section headline.
- Implement wave dividers as inline `<svg>` elements so the fill can be controlled with CSS variables.
- Ensure every interactive element meets a 44×44px minimum touch target.
- Keep illustration style consistent: 2px ink strokes, flat fills, no gradients or photorealism.

**Don't:**
- Never use `box-shadow` with blur greater than 24px anywhere in the system.
- Never place white text on `primary` yellow — contrast fails WCAG AA.
- Never use `backdrop-filter` except on the sticky nav after scroll.
- Never stack two `display-*` tokens without body copy between them.
- Never introduce a colour outside the 14-token palette without updating this file.
- Never use `Syne` below 24px — it becomes illegible.
- Never use more than one primary CTA button in a single viewport.
- Never use `tertiary` mint or `secondary` orange for general decoration — they are named component contexts only.
- Never use `display: none` to hide accordion content — animate height instead.
- Never use photography for product illustration — hand-drawn line-art only.
