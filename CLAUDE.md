# Valette

Personal stylist web app (Next.js 16 App Router, React 19, Tailwind v4, Supabase, Claude). Live at www.myvallette.com.

## Design rules (always)
- `docs/DESIGN.md` is the design system (Second Look, v2). Read it before any UI change. The "Valette Brand Book" artifact mirrors it.
- Build UI from the kit in `src/components/ui/` (Button, ButtonLink, Chip, ChipButton, ChipGroup, Card, ListCard, ListRow, StatTile, PageHeader, SectionTitle, Field, Input, Select, Textarea, Checkbox, EmptyState, Notice, Skeleton, Thumb, Swatch, ConfirmButton, CheckTick). Do not hand-type button, card, chip, field or thumbnail styles.
- Tokens live in `src/app/globals.css`. Use `bg-card`, `bg-raised`, `bg-inset`, `ring-line`, `text-ink` (on Marigold/Blush/Sky), `text-on-accent` (on Go Green/Clay), `rounded-card`, `shadow-active`, `ease-soft`, `tap`.
- One green (`primary`) action per screen; green otherwise only for "works on you". Selected states are a light tint with a Night outline (chips) or a white raised pill (segmented controls). One `active` card per screen.
- Every page starts with `PageHeader`. Garment images always go through `Thumb`. No `window.confirm`; use `ConfirmButton`.
- Accessibility: text ≥ `text-stone-500`; label every input; `aria-pressed` on toggles; `role="status"`/`role="alert"` for async results; 44 px touch targets; check light and dark mode at 375 px.

## Engineering notes
- Tests: `node --test scripts/test-*.mjs`.
- Deploys: GitHub (Zraucher/personal-stylist) is linked to the Vercel project. Pushing to `main` deploys production; other branches get preview URLs. Keep files LF.
