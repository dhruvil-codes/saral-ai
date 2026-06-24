# Portal — Design System

## Reference Website: https://useportal.net/

## 1. Brand Personality

Portal is a freelance toolkit (proposals → payments). The visual language is **clean, professional, slightly warm** — not a cold SaaS blue. It leans into lifestyle/craft photography, generous whitespace, and soft neutrals with a single orange/amber accent. The tone is confident and direct, no hype.

---

## 2. Color Tokens

```css
/* --- Core Palette --- */
--color-bg: #f5f5f0; /* warm off-white — page background */
--color-surface: #ffffff; /* cards, modals, nav */
--color-surface-alt: #f0f0ea; /* subtle section tint */

/* --- Text --- */
--color-text-primary: #1a1a1a; /* headings, body */
--color-text-secondary: #555555; /* subtext, captions */
--color-text-muted: #888888; /* meta, placeholders */

/* --- Accent (primary CTA + icon fills) --- */
--color-accent: #f5a623; /* amber/orange */
--color-accent-hover: #e09510;
--color-accent-light: #fef3dc; /* tinted backgrounds behind icons */

/* --- Feature icon circles --- */
--color-icon-blue: #3b82f6;
--color-icon-green: #22c55e;
--color-icon-purple: #a855f7;
--color-icon-orange: #f97316;

/* --- Border & Dividers --- */
--color-border: #e5e5e0;
--color-border-strong: #cccccc;

/* --- Dark section (footer CTA) --- */
--color-dark-bg: #0f0f0f;
--color-dark-text: #ffffff;
```

---

## 3. Typography

### Typefaces

| Role                | Family                                    | Source       |
| ------------------- | ----------------------------------------- | ------------ |
| Display / Headlines | **ITC Garamond Book Narrow**               | Local Font (`/fonts/ITC Garamond Book Narrow Regular.otf`) |
| Body / UI           | **Inter**                                 | Google Fonts |
| Mono (code/labels)  | **JetBrains Mono**                        | Google Fonts |

```html
<!-- Local Font configuration in Next.js layout / stylesheet -->
<!-- public/fonts/ITC Garamond Book Narrow Regular.otf -->
```

### Type Scale

```css
/* --- Display --- */
--text-display-xl: clamp(2.75rem, 6vw, 4.5rem); /* hero H1 */
--text-display-lg: clamp(2rem, 4vw, 3rem); /* section H2 */
--text-display-md: clamp(1.5rem, 3vw, 2.25rem); /* sub-section H3 */

/* --- Body --- */
--text-body-lg: 1.125rem; /* lead paragraph */
--text-body-md: 1rem; /* default body */
--text-body-sm: 0.875rem; /* captions, meta */
--text-body-xs: 0.75rem; /* labels, badges */

/* --- Line Heights --- */
--lh-display: 1.1;
--lh-body: 1.65;
--lh-ui: 1.4;

/* --- Letter Spacing --- */
--ls-tight: -0.02em; /* large headings */
--ls-normal: 0;
--ls-wide: 0.05em; /* all-caps labels */
```

### Type Styles (semantic classes)

```css
.t-hero {
  font-family: "ITC Garamond Book Narrow", serif;
  font-size: var(--text-display-xl);
  font-weight: 700;
  line-height: var(--lh-display);
  letter-spacing: var(--ls-tight);
  color: var(--color-text-primary);
}

.t-section-heading {
  font-family: "ITC Garamond Book Narrow", serif;
  font-size: var(--text-display-lg);
  font-weight: 700;
  line-height: var(--lh-display);
  letter-spacing: var(--ls-tight);
}

.t-subheading {
  font-family: "Inter", sans-serif;
  font-size: var(--text-display-md);
  font-weight: 600;
  line-height: 1.3;
}


.t-body-lead {
  font-family: "Inter", sans-serif;
  font-size: var(--text-body-lg);
  font-weight: 400;
  line-height: var(--lh-body);
  color: var(--color-text-secondary);
}

.t-body {
  font-family: "Inter", sans-serif;
  font-size: var(--text-body-md);
  line-height: var(--lh-body);
  color: var(--color-text-secondary);
}

.t-label {
  font-family: "Inter", sans-serif;
  font-size: var(--text-body-xs);
  font-weight: 600;
  letter-spacing: var(--ls-wide);
  text-transform: uppercase;
}

.t-nav {
  font-family: "Inter", sans-serif;
  font-size: var(--text-body-sm);
  font-weight: 500;
}
```

---

## 4. Spacing Scale

Based on a 4px base unit.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
--space-32: 128px;

/* Section vertical rhythm */
--section-padding-y: clamp(64px, 10vw, 120px);
```

---

## 5. Layout & Grid

```css
/* Container */
--container-max: 1120px;
--container-gutter: clamp(16px, 5vw, 48px);

.container {
  width: 100%;
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-gutter);
}

/* Grid systems used on the page */
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-8);
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-8);
}
.grid-feature {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-16);
  align-items: center;
}

/* Feature rows alternate image left / image right */
.grid-feature:nth-child(even) {
  direction: rtl;
}
.grid-feature:nth-child(even) > * {
  direction: ltr;
}

@media (max-width: 768px) {
  .grid-2,
  .grid-3,
  .grid-feature {
    grid-template-columns: 1fr;
  }
}
```

---

## 6. Border Radius

```css
--radius-sm: 4px; /* tags, badges */
--radius-md: 8px; /* inputs, small cards */
--radius-lg: 12px; /* cards */
--radius-xl: 20px; /* large panels, feature boxes */
--radius-2xl: 28px; /* hero browser mockup */
--radius-full: 9999px; /* pills, icon circles */
```

---

## 7. Shadows & Elevation

```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.05);
--shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06);
--shadow-xl: 0 24px 64px rgba(0, 0, 0, 0.12); /* hero browser mockup */

/* Floating card used in feature sections */
--shadow-card: 0 8px 32px rgba(0, 0, 0, 0.09), 0 2px 8px rgba(0, 0, 0, 0.05);
```

---

## 8. Components

### 8.1 Navigation

```
┌────────────────────────────────────────────────────────┐
│  [Logo]              Product   Blog   Contact   [CTA]  │
└────────────────────────────────────────────────────────┘
```

```css
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(245, 245, 240, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-4) 0;
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-8);
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-family: "Inter", sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-text-primary);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  list-style: none;
}

.nav-links a {
  font-size: var(--text-body-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 0.15s;
}

.nav-links a:hover {
  color: var(--color-text-primary);
}
```

---

### 8.2 Buttons

```css
/* Base */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: "Inter", sans-serif;
  font-size: var(--text-body-sm);
  font-weight: 600;
  border-radius: var(--radius-full);
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition:
    background 0.15s,
    transform 0.1s,
    box-shadow 0.15s;
  white-space: nowrap;
}

.btn:active {
  transform: scale(0.98);
}

/* Primary — amber fill */
.btn-primary {
  background: var(--color-accent);
  color: #fff;
  padding: var(--space-3) var(--space-6);
  box-shadow: 0 2px 8px rgba(245, 166, 35, 0.35);
}

.btn-primary:hover {
  background: var(--color-accent-hover);
  box-shadow: 0 4px 16px rgba(245, 166, 35, 0.4);
}

/* Secondary — outline */
.btn-secondary {
  background: transparent;
  color: var(--color-text-primary);
  border: 1.5px solid var(--color-border-strong);
  padding: var(--space-3) var(--space-6);
}

.btn-secondary:hover {
  border-color: var(--color-text-primary);
  background: var(--color-surface);
}

/* Ghost / text link */
.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  padding: var(--space-2) var(--space-4);
}

.btn-ghost:hover {
  color: var(--color-text-primary);
}

/* Sizes */
.btn-sm {
  font-size: var(--text-body-xs);
  padding: var(--space-2) var(--space-4);
}
.btn-lg {
  font-size: var(--text-body-md);
  padding: var(--space-4) var(--space-8);
}
```

---

### 8.3 Hero Section

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│          Your beautiful freelance toolkit.           │  ← .t-hero, centered
│       From sending proposals to getting paid.        │
│                                                      │
│     [short descriptor paragraph, .t-body-lead]       │
│                                                      │
│              [ Get started — btn-primary ]           │
│                                                      │
│   ┌─────────────────────────────────────────────┐   │
│   │   [Browser chrome mockup / product screenshot]│   │
│   └─────────────────────────────────────────────┘   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

```css
.hero {
  text-align: center;
  padding-top: var(--space-24);
  padding-bottom: 0;
}

.hero-headline {
  max-width: 700px;
  margin-inline: auto;
}

.hero-body {
  max-width: 520px;
  margin-inline: auto;
  margin-top: var(--space-6);
  color: var(--color-text-secondary);
}

.hero-cta {
  margin-top: var(--space-8);
}

/* Browser mockup wrapper */
.hero-mockup {
  margin-top: var(--space-12);
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  /* subtle gradient fade at bottom */
  mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
}

.hero-mockup img {
  width: 100%;
  display: block;
}
```

**Background treatment (hero):** Full-width gradient image (landscape photo — dusk mountains/sky in purple/orange tones) sits behind the hero area, fading into the page background color. Implemented as:

```css
.hero-bg {
  position: absolute;
  inset: 0;
  background-image: url("/hero-bg.jpg");
  background-size: cover;
  background-position: center top;
  opacity: 0.18; /* very subtle */
  z-index: -1;
}
```

---

### 8.4 Feature Checklist (2-col icon list)

Used in the "Your projects deserve…" section.

```
  ✓ [Icon]  Feature one          ✓ [Icon]  Feature two
  ✓ [Icon]  Feature three        ✓ [Icon]  Feature four
```

```css
.feature-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4) var(--space-8);
  margin-top: var(--space-8);
}

.feature-list-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

/* Icon circle */
.feature-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
}

.feature-icon.blue {
  background: #eff6ff;
  color: var(--color-icon-blue);
}
.feature-icon.green {
  background: #f0fdf4;
  color: var(--color-icon-green);
}
.feature-icon.purple {
  background: #faf5ff;
  color: var(--color-icon-purple);
}
.feature-icon.orange {
  background: #fff7ed;
  color: var(--color-icon-orange);
}
```

---

### 8.5 Feature Row (alternating text + UI screenshot)

```
Text side                      │   Screenshot/mockup side
───────────────────────────────┼──────────────────────────
[Eyebrow label]                │   ┌──────────────────┐
Big section heading            │   │  Product UI shot  │
                               │   │  (floating card)  │
Body paragraph describing      │   └──────────────────┘
the feature in plain terms.    │
```

```css
.feature-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-16);
  align-items: center;
  padding: var(--space-20) 0;
  border-bottom: 1px solid var(--color-border);
}

/* Alternate layout every other row */
.feature-row:nth-child(even) .feature-row-visual {
  order: -1;
}

.feature-row-eyebrow {
  font-size: var(--text-body-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--ls-wide);
  color: var(--color-accent);
  margin-bottom: var(--space-3);
}

.feature-row-heading {
  font-family: "ITC Garamond Book Narrow", serif;
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: var(--ls-tight);
  margin-bottom: var(--space-5);
}

.feature-row-body {
  font-size: var(--text-body-md);
  line-height: var(--lh-body);
  color: var(--color-text-secondary);
}

/* Visual / mockup */
.feature-row-visual {
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.feature-row-visual img {
  width: 100%;
  display: block;
}
```

---

### 8.6 Icon Card (3-column feature grid)

Used in the "Stop chasing clients" section with coloured emoji-style icons.

```
┌─────────────────┐
│  🟠             │  ← colored circle icon, 40px
│  Card heading   │
│  Short body     │
│  text here.     │
└─────────────────┘
```

```css
.icon-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}

.icon-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.icon-card-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-bottom: var(--space-2);
}

.icon-card-title {
  font-family: "Inter", sans-serif;
  font-size: var(--text-body-md);
  font-weight: 600;
  color: var(--color-text-primary);
}

.icon-card-body {
  font-size: var(--text-body-sm);
  line-height: var(--lh-body);
  color: var(--color-text-secondary);
}
```

---

### 8.7 Steps / Process List

Used in "Go from proposal to getting paid. Here's how."

```
  ① Select project type        ← numbered badge (filled circle)
    One-line description.

  ② Send link to client
    ...
```

```css
.steps-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  margin-top: var(--space-8);
}

.step-item {
  display: flex;
  gap: var(--space-5);
  align-items: flex-start;
}

.step-badge {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: #fff;
  font-size: var(--text-body-xs);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.step-content-title {
  font-size: var(--text-body-md);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.step-content-body {
  font-size: var(--text-body-sm);
  line-height: var(--lh-body);
  color: var(--color-text-secondary);
}
```

---

### 8.8 Pricing Card

```
┌─────────────────────────────────┐
│  Plan name          $XX/mo      │
│  ─────────────────────────────  │
│  ✓ Feature one                  │
│  ✓ Feature two                  │
│  ✓ Feature three                │
│                                 │
│        [ Get started ]          │
└─────────────────────────────────┘
```

```css
.pricing-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.pricing-card.featured {
  border-color: var(--color-accent);
  box-shadow:
    0 0 0 4px var(--color-accent-light),
    var(--shadow-md);
}

.pricing-plan-name {
  font-size: var(--text-body-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--ls-wide);
  color: var(--color-text-secondary);
}

.pricing-price {
  font-family: "ITC Garamond Book Narrow", serif;
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: var(--ls-tight);
  color: var(--color-text-primary);
}

.pricing-price span {
  font-family: "Inter", sans-serif;
  font-size: var(--text-body-sm);
  font-weight: 400;
  color: var(--color-text-muted);
}

.pricing-divider {
  border: none;
  border-top: 1px solid var(--color-border);
}

.pricing-features {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.pricing-features li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-body-sm);
  color: var(--color-text-secondary);
}

.pricing-features li::before {
  content: "✓";
  color: var(--color-icon-green);
  font-weight: 700;
  flex-shrink: 0;
}
```

---

### 8.9 Testimonial Card

```css
.testimonial-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.testimonial-quote {
  font-size: var(--text-body-md);
  line-height: var(--lh-body);
  color: var(--color-text-primary);
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.testimonial-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  object-fit: cover;
}

.testimonial-name {
  font-size: var(--text-body-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.testimonial-handle {
  font-size: var(--text-body-xs);
  color: var(--color-text-muted);
}
```

---

### 8.10 Badge / Tag

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-body-xs);
  font-weight: 600;
  padding: 2px var(--space-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.badge-accent {
  background: var(--color-accent-light);
  border-color: transparent;
  color: #92400e;
}

.badge-green {
  background: #f0fdf4;
  border-color: transparent;
  color: #166534;
}
```

---

### 8.11 Section Divider / Eyebrow

```css
/* Section eyebrow — small label above big headings */
.eyebrow {
  display: inline-block;
  font-size: var(--text-body-xs);
  font-weight: 600;
  letter-spacing: var(--ls-wide);
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}

/* Centered section intro block */
.section-intro {
  text-align: center;
  max-width: 600px;
  margin-inline: auto;
  margin-bottom: var(--space-16);
}
```

---

### 8.12 Footer

```
┌──────────────────────────────────────────────────────┐
│  [Logo]   [Nav links ...............]  [Social icons] │
│  ─────────────────────────────────────────────────── │
│  © 2024 Portal  ·  Privacy  ·  Terms                 │
└──────────────────────────────────────────────────────┘
```

```css
.footer {
  background: var(--color-dark-bg);
  color: var(--color-dark-text);
  padding: var(--space-16) 0 var(--space-8);
}

.footer-inner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: var(--space-12);
}

.footer-nav {
  display: flex;
  gap: var(--space-6);
  flex-wrap: wrap;
}

.footer-nav a {
  font-size: var(--text-body-sm);
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: color 0.15s;
}

.footer-nav a:hover {
  color: #fff;
}

.footer-bottom {
  margin-top: var(--space-12);
  padding-top: var(--space-6);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  font-size: var(--text-body-xs);
  color: rgba(255, 255, 255, 0.4);
}
```

---

### 8.13 CTA Banner (dark full-width)

Bottom of page: dark background, centered headline, single CTA.

```css
.cta-banner {
  background: var(--color-dark-bg);
  color: var(--color-dark-text);
  text-align: center;
  padding: var(--space-24) var(--space-8);
  border-radius: var(--radius-2xl);
  margin: var(--space-20) 0;
}

.cta-banner .t-section-heading {
  color: #fff;
}

.cta-banner .t-body-lead {
  color: rgba(255, 255, 255, 0.7);
  max-width: 480px;
  margin-inline: auto;
  margin-top: var(--space-4);
}

.cta-banner .btn-primary {
  margin-top: var(--space-8);
}
```

---

## 9. Motion & Animation

```css
/* Reduced motion override — always include */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Scroll-reveal base state */
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}

.reveal.visible {
  opacity: 1;
  transform: none;
}

/* Staggered children */
.reveal-stagger > * {
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}

.reveal-stagger.visible > *:nth-child(1) {
  transition-delay: 0ms;
  opacity: 1;
  transform: none;
}
.reveal-stagger.visible > *:nth-child(2) {
  transition-delay: 80ms;
  opacity: 1;
  transform: none;
}
.reveal-stagger.visible > *:nth-child(3) {
  transition-delay: 160ms;
  opacity: 1;
  transform: none;
}
.reveal-stagger.visible > *:nth-child(4) {
  transition-delay: 240ms;
  opacity: 1;
  transform: none;
}

/* Hover lift for cards */
.hover-lift {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
```

```js
// Intersection observer for .reveal elements
const observer = new IntersectionObserver(
  (entries) =>
    entries.forEach(
      (e) => e.isIntersecting && e.target.classList.add("visible"),
    ),
  { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
);

document
  .querySelectorAll(".reveal, .reveal-stagger")
  .forEach((el) => observer.observe(el));
```

---

## 10. Page Section Map

| #   | Section                   | Layout pattern                                      |
| --- | ------------------------- | --------------------------------------------------- |
| 1   | Nav                       | Sticky, backdrop-blur                               |
| 2   | Hero                      | Centered text + browser mockup below, dusk BG image |
| 3   | Feature intro             | Centered headline + 2×3 icon checklist              |
| 4   | Value prop copy block     | Centered headline, 2-col body                       |
| 5   | Feature rows ×4           | Alternating text-left / image-right                 |
| 6   | Pain → solution           | Centered headline + 3-col icon cards                |
| 7   | Showcase / portal gallery | Full-bleed horizontal card scroll                   |
| 8   | How it works              | Centered headline + numbered steps list             |
| 9   | Pricing                   | Centered headline + 2–3 col pricing cards           |
| 10  | Testimonials              | 2-col testimonial cards                             |
| 11  | CTA banner                | Dark full-width, centered                           |
| 12  | Footer                    | Dark bg, 3-col nav                                  |

---

## 11. CSS Custom Properties — Full Master Token File

```css
/* portal-tokens.css — import this first */
:root {
  /* Color */
  --color-bg: #f5f5f0;
  --color-surface: #ffffff;
  --color-surface-alt: #f0f0ea;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #555555;
  --color-text-muted: #888888;
  --color-accent: #f5a623;
  --color-accent-hover: #e09510;
  --color-accent-light: #fef3dc;
  --color-icon-blue: #3b82f6;
  --color-icon-green: #22c55e;
  --color-icon-purple: #a855f7;
  --color-icon-orange: #f97316;
  --color-border: #e5e5e0;
  --color-border-strong: #cccccc;
  --color-dark-bg: #0f0f0f;
  --color-dark-text: #ffffff;

  /* Type scale */
  --text-display-xl: clamp(2.75rem, 6vw, 4.5rem);
  --text-display-lg: clamp(2rem, 4vw, 3rem);
  --text-display-md: clamp(1.5rem, 3vw, 2.25rem);
  --text-body-lg: 1.125rem;
  --text-body-md: 1rem;
  --text-body-sm: 0.875rem;
  --text-body-xs: 0.75rem;

  /* Line heights */
  --lh-display: 1.1;
  --lh-body: 1.65;
  --lh-ui: 1.4;

  /* Letter spacing */
  --ls-tight: -0.02em;
  --ls-normal: 0;
  --ls-wide: 0.05em;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  --space-32: 128px;
  --section-padding-y: clamp(64px, 10vw, 120px);

  /* Layout */
  --container-max: 1120px;
  --container-gutter: clamp(16px, 5vw, 48px);

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 20px;
  --radius-2xl: 28px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-xl: 0 24px 64px rgba(0, 0, 0, 0.12);
  --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.09), 0 2px 8px rgba(0, 0, 0, 0.05);
}
```

---

_End of Portal design system · generated June 2026_
