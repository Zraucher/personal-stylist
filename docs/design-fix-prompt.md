# Fix prompt (round 2 and 3)

The prompt each fix agent received. `{GROUP}` is A, B, C or D, and `{FILES}` is that group's file list below.

---

You are applying a design fix pass to Valette, a personal stylist web app (Next.js 16 App Router, React 19, Tailwind v4, Supabase). Repo: C:\Users\zack\Claude Projects\Valette, branch `design-fixes`. You may edit files.

1. Read, in this order: `docs/DESIGN.md`, `CLAUDE.md`, `docs/design-review-round2.md` (the task list), `src/app/globals.css`, and every file in `src/components/ui/` (note the new `OutfitStrip`, `WeatherLine`, `VoteBar`, `Segmented`, `OutfitCardSkeleton`, `GridSkeleton`, `ChipLink`, and `CheckTick`'s `animate` prop), plus `CHECK_MARK` in `src/lib/verdict.ts`.
2. Apply **every task in "Group {GROUP}"** of the task list, following "Decisions that apply everywhere" over any individual task when they conflict. Where a task offers two options, pick one and keep it consistent across your pages.
3. Also apply the naming, case, error and confirm-dialog decisions to any other user-facing string in your files that the task list didn't spell out.

Rules:
- Edit only these files (new files in these folders are fine): {FILES}. Three other agents are editing the rest of the app at the same time. Do not edit `src/components/ui/*`, `globals.css`, `NavTabs.tsx`, `ClosetSubnav.tsx`, `src/lib/closet/placeholder.tsx`, `src/lib/verdict.ts`, or files owned by another group. If you need a kit change, build it inline in your file and say so in your report.
- Keep behaviour, routes, server-action signatures, form field names, database writes, auth and rate-limit logic unchanged. Changing user-facing strings returned by server actions and API routes is in scope. Adding a column to a `select` for display is fine. No migrations.
- If `scripts/test-*.mjs` assert a string you change, update the expected string in that test so `node --test scripts/test-rules.mjs scripts/test-composition.mjs scripts/test-today.mjs scripts/test-gaps.mjs scripts/test-price.mjs scripts/test-plan.mjs` passes.
- Light and dark mode, 375 px and desktop, 44 px touch targets, labelled inputs, visible focus. Text no lighter than stone-500.
- Save files with LF line endings.
- When done, run `npx tsc --noEmit`, `npx eslint <your changed files>` and the tests above. Fix failures in your files only. Do not run git, dev servers, `next build`, or deploy.

Report (under 400 words): files changed, tasks done, tasks skipped with the reason, anything that needs a decision, and any legal-review flags.

---

## File ownership

- **A**: `src/app/page.tsx`, `src/components/landing/*`, `src/app/login/*`, `src/app/o/[token]/*`, `src/lib/opinions/tally.ts`, `src/app/offline/*`, `src/app/privacy/*`, `src/app/layout.tsx`, `src/app/manifest.ts`, `src/app/(app)/layout.tsx`, `src/app/(app)/loading.tsx`, `src/app/(app)/error.tsx`
- **B**: `src/app/(app)/today/*`, `src/app/(app)/plan/**`, `src/app/(app)/ask/*`, `src/app/(app)/opinions/**`, `src/components/AskFriendsButton.tsx`, `src/app/api/today/*`, `src/app/api/ask/*`, `src/app/api/plan/*`, `src/app/api/push/*`, `src/app/api/cron/**`, `src/lib/push/*`, `src/lib/plan/*`, `src/lib/today/*` (strings only), `src/lib/opinions/server.ts` and `src/lib/opinions/public.ts` (strings only), test files for plan/today
- **C**: `src/app/(app)/closet/**`, `src/app/(app)/outfits/**`, `src/app/(app)/gaps/*`, `src/lib/scorecard/rules.ts`, `src/lib/outfit/composition.ts`, `src/lib/gaps/unlock.ts`, `src/lib/closet/basics.ts` (strings only), `src/app/api/scorecard/*`, `src/app/api/tag/*`, test files for rules/composition/gaps
- **D**: `src/app/(app)/hauls/**`, `src/app/(app)/wishlist/*`, `src/app/(app)/profile/**`, `src/components/pwa/*`, `src/app/api/haul/**`, `src/app/api/wishlist/**`, test file for price
