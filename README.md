# Personal Stylist

Private, invite-only stylist app. Next.js 16 on Vercel, Supabase for data, auth and images, Claude for judgment.

Plan: `C:\Users\zack\Downloads\Style-App-Personal-Build-Plan-2026-11-08.md` (ten build sessions). Sessions 1 to 5 are built and live. Sessions 6 to 10 are not started.

## State as of 2026-11-11

- **Production:** https://www.myvallette.com (domain is `myvallette`, two l's). The apex redirects to www; `app.` and `dev.` aliases also point at production.
- **Supabase:** project **Valette App** (`dqnreeflkhrbsfuvkzjx`, us-east-1). Migrations 0001 to 0006 are applied (0006 adds `outfits.name` and `outfits.composition`). Migrations are applied through the Supabase connector, not a CLI.
- **Vercel:** team `valette` (`team_qjPh7HC46TP4L3YnzhiDcXXM`), project `prj_VEGr6clooeo28BUSYJ0TYCwekf2n`. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (fallback only; the login page uses the request host) and `ANTHROPIC_API_KEY`. Vercel Authentication is off; the app's invite gate does the gatekeeping.
- **Seeds** apply on first sign-in (`apply_seed`, called from the `on_auth_user_created` trigger). Zack's payload is keyed to `zack@gpsteam.com` (signed in, 23 seeded closet items, no photos yet). Val's is keyed to `valerieraucher@gmail.com` (not yet signed in).
- `.env.local` holds the Supabase URL and anon key. No service-role key is needed: the login page checks invites through the `is_invited()` database function.

## Sign-in (6 to 8 digit email code)

Sign-in is a code, not a link. Corporate email scanners open links and burn the one-time token (`otp_expired`), and the link and the code are the same token. So both Supabase email templates, **Magic link or OTP** and **Confirm sign up** (first-time users get this one), must contain only `{{ .Token }}` and no `{{ .ConfirmationURL }}`.

- The login page asks for the email, checks the invite list, then shows a code box on the same page. Type the code there. The code box only appears right after the email is submitted, and requesting a new code invalidates the old one.
- `requestMagicLink` and `verifyCode` live in `src/app/login/actions.ts`. `verifyCode` calls `verifyOtp({ email, token, type: "email" })`.
- Supabase Auth Site URL is `https://www.myvallette.com`; redirect URLs include its `/auth/callback` (still used for the PKCE link flow, which is no longer the primary path).
- Email goes out through custom SMTP via AgentMail (`smtp.agentmail.to:465`, sender `valette@agentmail.to`). The SMTP password is an AgentMail API key, entered in the Supabase dashboard only. Not yet verified: whether AgentMail delivers to external addresses such as Val's. A verified sender on `myvallette.com` would be better long term.
- Site URL, redirect URLs, SMTP and email templates are dashboard-only; the Supabase connector has no tool for them.

## Session 3: closet capture

- `/closet` grid grouped by category, signed URLs for private photos (1 hour TTL).
- `/closet/new` takes a photo (camera or library), resizes it in the browser to 1600px JPEG, uploads to the `closet` bucket under `<user id>/<uuid>.jpg`, then calls `/api/tag`.
- `/api/tag` downloads the image with the user's own session (RLS), sends it to Claude (`claude-opus-5-5`) with a strict zod schema, and returns name, category, subcategory, colors (hex + name), pattern, material, construction, formality, warmth, seasons, notes. Without `ANTHROPIC_API_KEY` the route returns 503 and the form falls back to manual entry.
- `/closet/[id]` is the same form in edit mode, plus "Re-run auto tags" and Remove (deletes the photo too).
- `/closet/basics` is a tick list of staples for women's and men's wardrobes (`src/lib/closet/basics.ts`). A tick inserts a `closet_items` row with `generic_id`; unticking deletes it unless a photo was attached, in which case it is marked `gone`.
- Vocabulary (categories, subcategories, construction tags, seasons, statuses) lives in `src/lib/closet/taxonomy.ts`. The tagger, the form and the scorecard all use it.

## Session 4: item scorecard

- Four criteria per piece: palette, fabric, silhouette (rules, computed in `src/lib/scorecard/rules.ts`) and vibe (Claude, with the photo). The vibe check outranks the rules. Verdicts: keep, cut, provisional. No photo or an unclear photo is always provisional; nothing is finalized from text alone.
- Palette is a Lab color-distance check against the best and avoid lists, with lightness and saturation tests for entries like "true black", "stark white" and "bright or saturated tones". Fabric uses a matcher table for phrases like "itchy wool" and "stretch denim". Silhouette fires the dislikes list from construction tags. Dislikes the code cannot test (for example "overly preppy looks") are handed to the vibe prompt.
- `/api/scorecard` loads profile, principles (universal plus personal) and benchmarks, runs the rules, asks Claude only for the vibe rating, photo clarity and tailoring, then stores a row in `scorecards` (migration 0005). History is kept; the newest row is current.
- The item page shows the scorecard with Agree / Disagree (stored in `feedback` with `scorecard_id`) and "Proven look" / "Known failure", which copies the photo into `benchmarks` so it keeps working as a vibe example.
- `/closet/review` walks through unreviewed pieces with photos, auto-runs the scorecard, and tracks the plan goal: agree with 8 of 10.

## Session 5: outfit builder

- Pick pieces on `/outfits/new`; the composition check re-runs as you tap (`src/lib/outfit/composition.ts`, pure functions).
- Checks: complete, counterbalance (buttoned-up needs something loose or undone), contrast (fitted with relaxed, patterned with solid), palette harmony, your own fabric and shape rules, formality and warmth, scorecard cuts.
- Saved outfits live on `/outfits` with the check that was true when saved.

## Tests

```bash
node --test scripts/test-rules.mjs scripts/test-composition.mjs
```

Needs Node 22.18+. The rules and composition modules are erasable TypeScript, so Node runs them directly (28 tests).

## Deploying without the CLI

Vercel's GitHub app is not installed for the `Zraucher` account, so `Zraucher/personal-stylist` does not auto-deploy and a GitHub-source deploy fails. Deploys go through the Vercel connector in one `create_deployment` call (`project` = the project id above, `target: "production"`):

1. List the live deployment's files (`list_deployment_files`, param `id`). The `uid` is the sha1; source paths are project-relative (`next.config.ts`, `package.json`, `tsconfig.json`, `src/**`).
2. With a small node script, compute sha1 + size for every file from `git show <commit>:<path>`.
3. Send unchanged files as `{file, sha, size}` references. Send changed or new files inline (`encoding: utf-8`, JSON-escaped with `JSON.stringify`, or base64).
4. Wait about 30 to 45 seconds and confirm `get_deployment` shows `READY`.

Apply any new migration to Supabase **before** deploying code that needs it.

If the Vercel CLI gets installed later, `vercel --prod` after `vercel link --project personal-stylist --scope valette --yes` also works.

## Run locally

```bash
npm run dev
```

Open http://localhost:3000, enter an invited email, then type the code from the email.

## Layout

```
supabase/migrations/0001_init.sql               schema, RLS, invite trigger, storage bucket
supabase/migrations/0002_seed_mechanism.sql     seed_payloads + apply_seed(), run on first sign-in
supabase/migrations/0003_seed_data.sql          universal principles, retailers, invites, Val + Zack payloads
supabase/migrations/0004_is_invited_rpc.sql     is_invited() so login needs only the anon key
supabase/migrations/0005_*.sql                  scorecards
supabase/migrations/0006_outfit_composition.sql outfits.name, outfits.composition
src/proxy.ts                        session refresh + login gate on every request
src/lib/supabase/{client,server,admin,middleware}.ts
src/lib/closet                      taxonomy, basics checklist
src/lib/scorecard                   rules layer (palette, fabric, silhouette)
src/lib/outfit                      composition check, outfit loader
src/app/login                       invite check + emailed code sign-in
src/app/auth/callback               link landing (PKCE and token-hash flows)
src/app/auth/signout
src/app/(app)/layout.tsx            signed-in shell with nav
src/app/(app)/closet                grid, capture, editor, basics, review
src/app/(app)/outfits               saved outfits, builder
src/app/(app)/profile               profile, color, measurements
src/app/api/{tag,scorecard}         Claude calls
```

## Invites

Nothing but the service role can read `public.invites`. The login page calls `is_invited(email)` (returns true/false only) before sending a code, and a `before insert` trigger on `auth.users` rejects any email not on the list. To invite a friend, insert an `invites` row and optionally a `seed_payloads` row keyed to their email before they sign in. To revoke, delete the row and the user from Authentication → Users.
