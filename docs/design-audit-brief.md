# Design audit brief (shared by all audit agents)

## The product
Valette is a personal stylist web app (installable PWA) live at www.myvallette.com. Users check outfits against their coloring and closet. Main areas, each a route under `src/app/(app)/`:
- **Today** (`today/`): three outfit cards, verdict chips, "wore it / not me", planned-outfit card, nudges strip.
- **Plan** (`plan/`): 7-day planner cards; trips (`plan/trips/new`, `plan/trips/[id]`) with looks and a packing list.
- **Closet** (`closet/`, `closet/[id]`, `closet/insights`, `gaps/`, `outfits/`, `outfits/new`): item grid, item detail + scorecard + wear panel, insights, gaps, outfit builder. Shared sub-menu `ClosetSubnav.tsx`.
- **Ask** (`ask/`), **Shop** (`hauls/`, `wishlist/`), **Profile** (`profile/`, `profile/palette`), **Second opinions** (`opinions/`).
- Public pages: marketing home `src/app/page.tsx`, `/login`, `/privacy`, public vote page `src/app/o/[token]/`, `/offline`.
- Shell: `src/app/(app)/layout.tsx` (sticky header) and `src/app/(app)/NavTabs.tsx` (top links on desktop, 6-tab bottom bar on phones).
- Shared components: `src/components/Wordmark.tsx`, `src/components/AskFriendsButton.tsx`, `src/components/pwa/AppCard.tsx`, `src/components/landing/WaitlistForm.tsx`, `src/lib/closet/placeholder.tsx`, `src/lib/verdict.ts`.

## Stack and styling
Next.js 16 App Router, React 19, Tailwind v4. **Brand tokens live in `src/app/globals.css`**: Tailwind's stone/emerald/amber/red scales are remapped to the brand (stone = Linen→Night neutral, emerald = Go Green, amber = Marigold, red = Clay). Dark mode is automatic via `prefers-color-scheme` and inverts the stone scale, so `bg-white` becomes a dark surface and `text-stone-900` becomes light text. Fonts: Bricolage Grotesque (`font-display`, h1/h2) and Figtree (body) via next/font. Extra colors: `bg-blush`, `bg-sky-brand`. There is no component library: styles are inline Tailwind classes repeated across pages.

## Brand: "Second Look" (chosen direction)
The honest friend with great taste. Warm, direct, upbeat; "approachable luxury": editorial calm, never gadgety, never hype.
- Colors: Linen #FBF7F2 ground, Night #1D1B2B type, Go Green #2F7D5B (verdicts + main action only), Blush #F3D4CF warm panels, Marigold #F2C14E deals/highlights/"almost", Sky #CFE0F0 weather/info, Clay #9E432D "not for you".
- Type: Bricolage Grotesque ExtraBold for wordmark, display lines and verdicts (tight tracking); Figtree for everything else; sentence case; display lines may be lowercase.
- Interface: pill buttons, 20 px card corners, one soft shadow (0 6 20 rgba(29,27,43,.08)) on the active card only; flat on linen otherwise. Verdicts are lowercase chips with symbol + word: "✓ works on you", "◐ almost", "✕ not for you". The one signature animation: the check disc drawing its tick (~300 ms) when a verdict lands.
- Icons: 2 px rounded line icons on 24 px grid (the app currently uses almost no icons).

## Known inconsistencies to look for (examples, not a complete list)
- Page titles mix `text-xl font-semibold` (app pages) with `font-display` extrabold (newer pages).
- Buttons mix `rounded-lg` rectangles (older pages) with `rounded-full` pills (newer pages, brand-correct).
- Cards mix `rounded-xl` / `rounded-2xl`, borders and shadows inconsistently.
- Many repeated class strings with no shared primitives.

## Rules for the audit
- Read code only; do not edit files and do not start dev servers.
- Every recommendation must name files and give the concrete change (class names, tokens, component APIs).
- Keep the brand: refine and make consistent, do not rebrand. Must work in light and dark mode and at 375 px width.
- Do not touch business logic, data loading, server actions or API routes.
