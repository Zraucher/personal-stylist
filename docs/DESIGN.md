# Valette design system: Second Look, v2

The single source of truth for how Valette looks and behaves. Every screen and every future change follows this file. The brand guide artifact ("Valette Brand Books", Book B) mirrors it.

Built from four audits on 2026-11-21: impeccable (hierarchy, type, states), high-end visual design (what reads as premium), redesign-existing-projects (consistency and a shared kit), and an accessibility review (WCAG 2.2 AA).

## 1. Principles

1. **One green thing per screen.** Go Green means "works on you" and the single main action. Nothing else is green: not selection, not focus, not decoration.
2. **Flat on linen, one lift.** Cards are hairline-framed surfaces. Only the active card on a screen (the chosen look, today's plan) gets the soft shadow.
3. **Warm, never gadgety.** Pill buttons, 20 px cards, editorial titles, real garment shapes. No gradients, no glass panels on content, no bouncy motion.
4. **Same pattern, same component.** Buttons, chips, cards, fields, headers, empty states and thumbnails come from `src/components/ui/`. Never hand-type a variant.
5. **Readable for everyone.** Text 4.5:1, controls 3:1, visible focus, labelled inputs, announced results, 44 px touch targets on phones. Light and dark mode both pass.

## 2. Tokens (`src/app/globals.css`)

Tailwind's scales stay remapped to the brand (stone = Linen→Night, emerald = Go Green, amber = Marigold, red = Clay). Dark mode inverts stone automatically. New tokens:

| Token | Light | Dark | Use |
|---|---|---|---|
| `ground` | #FBF7F2 | #1D1B2B | page background |
| `card` | #FFFFFF | #252338 | standard surface |
| `raised` | #FFFFFF | #2D2A42 | the one active card |
| `inset` | #F5EEE6 | #1A1827 | photo wells, inputs, segmented tracks |
| `line` | Night 8% | Linen 8% | card hairlines (`ring-1 ring-line`) |
| `line-strong` | Night 16% | Linen 16% | dividers that must show |
| `ink` | #1D1B2B | #1D1B2B | text on Marigold, Blush or Sky fills; never inverts |
| `on-accent` | #FFFFFF | #1D1B2B | text on Go Green and Clay fills |
| `stone-400` | #8A8094 | #736D8C | control borders only (3:1); never body text |
| `shadow-active` | 0 1 2 / 4% + 0 6 20 / 8% Night | inset highlight + 0 8 24 black 35% | the active card |
| `shadow-sheet` | 0 16 40 Night 14% | inset highlight + 0 16 40 black 50% | dialogs |
| `radius-control` 14 px, `radius-thumb` 12 px, `radius-card` 20 px, `radius-sheet` 28 px | | | |
| `ease-soft` | cubic-bezier(.32,.72,0,1) | | all transitions |

Rules: muted text is `text-stone-500` minimum (`text-stone-400` is not a text colour). On Blush or Sky panels use `text-stone-600` or darker. Text on Marigold is always `text-ink`.

## 3. Type

| Role | Classes |
|---|---|
| Page title | `font-display text-[28px] sm:text-[32px] font-extrabold leading-[1.05] tracking-[-0.03em]` (lowercase allowed) |
| Page subtitle | `text-[15px] text-stone-500` |
| Section title | `font-display text-xl font-bold leading-tight` |
| Card title | `font-display text-lg font-bold leading-snug` |
| Body | `text-base leading-relaxed`; secondary `text-sm text-stone-600` |
| Meta | `text-xs text-stone-500 tabular-nums` (never below 12 px) |
| Eyebrow | `text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500` |
| Stat number | `font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums` |

Verdict chips stay lowercase with symbol + word: `✓ works on you`, `◐ almost`, `✕ not for you`. Buttons use sentence case ("Wore it", "Swap a piece").

## 4. Layout

- Main column: `mx-auto max-w-3xl px-4 pt-6 sm:pt-10`, bottom padding clears the tab bar and the home indicator.
- Page stack `space-y-6`; between cards in a list `space-y-3`; card padding `p-4 sm:p-5`; card content `space-y-3`; action rows `flex flex-wrap items-center gap-2`.
- Item grids `grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4`.

## 5. Components (`src/components/ui/`)

| Component | What it is |
|---|---|
| `Button` / `ButtonLink` | Pill. `primary` (Go Green, one per screen), `secondary` (Night outline), `quiet` (text with soft hover), `danger` (Clay text). Sizes `sm` (h-9) and `md` (h-11). Press: `active:scale-[0.98]`. `type` is required on `Button`. |
| `Chip` | Static label. Tones: neutral, outline, works, almost, not, info, warm, overlay. |
| `ChipButton` | Toggle. Selected = Night fill (never green). Sets `aria-pressed`. |
| `Card` | `surface` (hairline), `active` (raised + shadow), `warm` (blush), `inset`. `as` any element, including `form`. |
| `PageHeader` | Eyebrow, title, subtitle, back link (chevron), actions slot. Every app page starts with it. |
| `Field`, `Input`, `Select`, `Textarea` | 44 px, `rounded-control`, `bg-inset`, 16 px text (no iOS zoom), `border-stone-400`. Every input has a label (visible or `sr-only`). |
| `EmptyState` | Warm blush panel, lowercase display line, one sentence, one action. No dashed borders. |
| `Thumb` | Every garment image. 4:5 frame, `rounded-thumb`, `bg-inset`, hairline overlay. Own photos `object-cover`; retailer photos `object-contain` with padding. No photo = the garment silhouette (`ItemPlaceholder`), never text or dots. |
| `Notice` | Inline message: `info` (sky), `warn` (marigold), `error` (clay, `role="alert"`), `success` (`role="status"`). |
| `ConfirmButton` | Replaces `confirm()`: a branded `<dialog>` with focus trap and Esc. |
| `StatTile`, `ListRow` | Insights numbers (left-aligned) and grouped rows with chevrons. |
| `CheckTick` | The signature: the check disc draws its tick in 300 ms when a verdict or "wore it" lands. Respects reduced motion. |

## 6. Shell

- Header: sticky, `bg-ground/80` with blur, top safe area, 56 px tall, hairline shadow instead of a border. Sign out lives on Profile on phones.
- Bottom tab bar: blur, home-indicator padding, 2 px rounded line icons (sun, calendar, hanger, bubble, bag, person), active tab = soft Night pill behind the icon plus a bold label.
- Closet sub-menu: a segmented control on an inset track, quieter than the main nav.
- Skip link to `#main`; header nav labelled "Primary", tab bar "Main".

## 7. States

- Loading: skeleton blocks (`bg-stone-200/70 motion-safe:animate-pulse`) shaped like the content; route-level `loading.tsx`. Pending buttons change their label and set `aria-busy`.
- Error: `Notice tone="error"` saying what to do next. Route-level `error.tsx` with a retry button.
- Success: inline `✓ Saved` with `role="status"` where the action happened.
- Async results (votes, plans, saves) live in `aria-live="polite"` regions.

## 8. Motion

Only: button press, chip colour change (150–200 ms), the active card's shadow, and the check tick. All use `ease-soft`. `prefers-reduced-motion` turns them off.

## 9. Accessibility checklist (every change)

Focus ring is a 2 px Night outline with 2 px offset (global). Inputs are labelled. Toggles use `aria-pressed`; chip groups use `role="group"` with a label. Targets ≥ 44 px on touch (`tap` utility). Colour is never the only signal. Decorative glyphs are `aria-hidden`. Check light and dark mode, and 375 px width.
