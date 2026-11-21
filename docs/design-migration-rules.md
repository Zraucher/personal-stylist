# Rules for the design migration agents

Repo: C:\Users\zack\Claude Projects\Valette. Read `docs/DESIGN.md` first (the spec) and the kit in `src/components/ui/` (import from "@/components/ui"). Tokens are in `src/app/globals.css` (bg-ground, bg-card, bg-raised, bg-inset, ring-line, ring-line-strong, text-ink, text-on-accent, shadow-active, shadow-sheet, rounded-control/thumb/card/sheet, ease-soft, `tap` utility, `.tick-draw`).

## Do
- Restyle ONLY the files in your set. Other agents are editing the other files at the same time.
- Replace hand-typed buttons, chips, cards, page headers, fields, empty states and thumbnails with kit components (or `buttonClass(...)` for elements that cannot be a Button, e.g. `<summary>` or a `<label>`).
- Every app page starts with `<PageHeader>` (use `back` instead of "← X" links; `actions` for header buttons).
- One `variant="primary"` (green) button per screen: the screen's main action. Former `bg-stone-900` action buttons become `primary` if they are the main action, else `secondary`.
- Selected toggles: `ChipButton selected` (Night), never green. Wrap toggle sets in `ChipGroup label="..."`.
- Garment images: `<Thumb src alt item size>`. Never text-only or dot placeholders. Retailer images: `product`.
- Cards: `<Card>`; at most one `variant="active"` per screen (the chosen/current item). Grouped lists: `ListCard` + `ListRow`.
- Empty states: `<EmptyState>` (no dashed borders). Inline messages/errors: `<Notice>`.
- Replace `window.confirm(...)` with `<ConfirmButton title=... onConfirm=...>`.
- Accessibility sweep in your files: `text-stone-400` → `text-stone-500` for text; text on `bg-amber-*` fills → `text-ink`; `bg-emerald-700 text-white` → `text-on-accent`; remove `outline-none`; label every input (`Field` or `aria-label`/sr-only); `aria-pressed` on toggles; `role="status" aria-live="polite"` on async result/saving text, `role="alert"` on errors; `aria-hidden` on decorative glyphs; small icon buttons get `tap`.
- Inputs: use `Input/Select/Textarea` or `fieldClass` (16px text). Checkboxes: `Checkbox` or `accent-emerald-700 size-[18px]`.
- Where a verdict or "wore it" lands (a state change), show `<CheckTick />` inside the chip so the tick draws once.
- Keep all copy, data, props, server actions, form `name`s, `action=`, handlers and behaviour exactly as they are. This is a visual and accessibility pass only.
- Must look right in light AND dark mode and at 375 px wide. Remember `bg-white`/`text-white` invert in dark mode; prefer `bg-card` and `text-on-accent`.

## Don't
- Don't edit files outside your set, `globals.css`, or `src/components/ui/*`. If the kit lacks something you need, write it inline in your file and mention it in your report.
- Don't add dependencies, don't run `git`, don't start dev servers, don't run `next build`.
- Don't change routes, data fetching or business logic.

## Finish
Run `npx tsc --noEmit` and `npx eslint <your files>`; fix errors in YOUR files only (ignore errors in other files: another agent may be mid-edit). Report: files changed, notable decisions, anything you couldn't do.
