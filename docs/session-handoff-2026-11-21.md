# Valette: session handoff (2026-11-21)

Paste or attach this at the start of a new session. It covers what was built, where things stand, and what's still open.

## The project

- Valette: personal stylist web app. Next.js 16 App Router, React 19, Tailwind v4, Supabase, Claude.
- Repo: `C:\Users\zack\Claude Projects\Valette`. GitHub: `Zraucher/personal-stylist` (private). Branch `main`.
- Live site: www.myvallette.com (also myvallette.com, app., dev.).
- Vercel: team `team_qjPh7HC46TP4L3YnzhiDcXXM`, project `prj_VEGr6clooeo28BUSYJ0TYCwekf2n` (name `vallette`).
- Supabase project: `dqnreeflkhrbsfuvkzjx`. Migrations go through 0017.
- Read first in any new session: `CLAUDE.md`, `docs/DESIGN.md`.

## What this session did

1. **Big feature build (merged and live):** second opinions (friends vote by link), plan ahead (week planner and trips with packing lists), closet insights, installable app (PWA) with push notifications and a daily cron job.
2. **Design system v2 ("Second Look"):**
   - Tokens in `src/app/globals.css`, a UI kit in `src/components/ui/`, and the spec in `docs/DESIGN.md`.
   - Every page moved onto the kit.
   - Brand guide artifact "Valette Brand Book": https://claude.ai/artifact/YT6EVKUUhxBnkdrz25LFu9. It covers Second Look only; Book A was removed. Chapter 10 is the design system.
3. **Three design review rounds across all 27 pages, all applied:**
   - Round 1: impeccable, design-critique and accessibility-review.
   - Round 2: redesign-existing-projects.
   - Round 3: design:ux-copy.
   - Combined task list: `docs/design-review-round2.md`. Fix prompt: `docs/design-fix-prompt.md`.
   - New kit pieces: `OutfitStrip`, `WeatherLine`, `VoteBar`, `Segmented`, `OutfitCardSkeleton`, `GridSkeleton`, `ChipLink`, and `CheckTick` with an `animate` prop. `src/lib/verdict.ts` gained `CHECK_MARK` and `cleanHeadline`.
   - Word rules are in `docs/DESIGN.md` §5b:
     - "pieces" for owned clothes, "products" for store items
     - "wore it"
     - "Second opinions"
     - "Swap a piece" opens the editor; "Try another" replaces the outfit
     - the AI is "we", with no vendor names
     - contractions, and no raw server errors
4. **Landing page redesign (live):**
   - `/` now shows the marketing page to everyone; signed-in visitors get "Open the app" instead of the waitlist.
   - The routing change is in `src/lib/supabase/middleware.ts`. The installed app still opens on `/today`.
   - 13 sections in `src/components/landing/`. Plan and prompt: `docs/landing-redesign.md`.
5. **Env vars added by Zack in Vercel (production):** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`. Production was redeployed after they were added. Push notifications are configured but not yet tested on a phone.

## Current state

- `main` has everything; production deploy `dpl_Awcj2c1szrJ2JknTcroQrtjTwEpQ` is READY and serves www.myvallette.com.
- Checks on the last code: `npx tsc --noEmit`, `npx eslint src`, `node --test scripts/test-*.mjs` (57 pass), `npx next build`. All passed.
- Merged branches still on GitHub: `design-elevation`, `design-fixes`, `landing-redesign`. Safe to delete.

## Open items

- **GitHub ↔ Vercel link.** Zack linked the repo in Vercel, but a push to `main` after that did not start a deploy, and the API returned "repository can't be found".
  - Check Vercel → vallette → Settings → Git. Also check that the Vercel GitHub app has access to `Zraucher/personal-stylist`.
  - Until a push to `main` creates a deploy, deploying means uploading files through the Vercel MCP: inline previews, then a SHA-ref production deploy. All files must be LF.
  - `CLAUDE.md` already says push-to-deploy, so verify the link first.
- **~30 throwaway preview deploys** in Vercel from the file uploads. Delete them from Deployments → filter Preview. The MCP has no delete action.
- **Test notifications on a phone:** add the site to the home screen, then Profile → The app → Turn on notifications. A test notification should arrive.
- **Legal review before public launch:**
  - The privacy page has no contact address. There's a `TODO(Zack)` in `src/app/privacy/page.tsx`. It also needs retention, age limit and GDPR/CCPA wording, plus disclosure of the voter cookie and hashed network address.
  - Landing page promises: "free during early access", "we'll tell you well ahead of any change", "one email when your invite is ready, nothing else", the photo-privacy lines, and "every skin tone, every gender, every budget".
- **Small known leftovers, low priority:**
  - Item detail pages have no page `<title>`.
  - On Builder's picked pills, two corner-radius classes compete (the `cx` helper doesn't merge classes).
  - The vote page (`/o/...`) errors locally because there's no `SUPABASE_SERVICE_ROLE_KEY` in the local env. Production is fine.

## Working rules carried over

- API keys and passwords: Zack enters them in dashboards himself. Never paste them in chat or type them into fields.
- Every page starts with `PageHeader`. One green action per screen. Selected states are Night. Garment images use `Thumb`. Use `ConfirmButton`, never `window.confirm`.
- Check light and dark mode at 375 px. Dev server: `.claude/launch.json` → `valette-dev` (port 3000).
- On this Windows machine, Python text-mode writes produce CRLF. Normalize to LF before deploying.
