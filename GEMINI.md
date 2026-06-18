# Design Rules

Always read `DESIGN.md` before generating any UI code, component, or layout.

- Use only the color tokens defined in `DESIGN.md`. Never hardcode hex values.
- Use Syne (700–800w) for all display text, Inter (400/500/600w) for all body and UI text.
- Follow the component specs exactly: pill shapes for buttons/badges only, `rounded.xl` for cards.
- Apply the flat elevation model: 1px borders over shadows, max `box-shadow` blur 24px.
- Use the 12-column grid, 1160px max-width, 96px section rhythm.
- Alternate section backgrounds: `neutral → surface-alt → neutral`.
- Wave dividers must be inline `<svg>`, never `<img>`.
- `backdrop-filter` is allowed only on the sticky nav after scroll.
- Never introduce a color outside the 14 DESIGN.md tokens.
- Never use photography — hand-drawn line-art illustration only.

DESIGN.md is the authoritative source for all design tokens, colors,
typography, and components. Skills enhance execution quality but never
override DESIGN.md rules.
