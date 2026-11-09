# Personal Stylist

Private, invite-only stylist app. Next.js 16 on Vercel, Supabase for data, auth and images, Claude for judgment.

Plan: `C:\Users\zack\Downloads\Style-App-Personal-Build-Plan-2026-11-08.md` (ten build sessions). This repo is at the end of **session 1**: repo, schema, invite-gated magic-link login, empty closet.

## State as of 2026-11-08

- Supabase project **Valette App** (`dqnreeflkhrbsfuvkzjx`, us-east-1). Migrations 0001 to 0004 are applied. Universal principles, retailers, Zack's invite, and seed payloads for Val and Zack are loaded.
- `.env.local` holds the project URL and anon key. No service-role key is needed: the login page checks invites through the `is_invited()` database function.
- Seeds apply automatically on first sign-in (`apply_seed`, called from the `on_auth_user_created` trigger). Zack's payload is keyed to `zack@gpsteam.com`, Val's to `valerieraucher@gmail.com`. Both are invited. To invite someone else and seed them, insert an `invites` row and (optionally) a `seed_payloads` row keyed to their email before they sign in.

## One-time setup still to do

1. **Supabase auth URLs.** Dashboard → Authentication → URL Configuration: Site URL = `https://personal-stylist-valette.vercel.app`; Redirect URLs include `http://localhost:3000/auth/callback`, `https://personal-stylist-valette.vercel.app/auth/callback` and `https://personal-stylist-*-valette.vercel.app/auth/callback` (preview deploys). Email provider stays on; no password needed. The `enforce_invite` trigger blocks uninvited sign-ups at the database, so the "allow sign-ups" toggle can stay on.

2. **Vercel.** Done 2026-11-08. Project `personal-stylist` (`prj_VEGr6clooeo28BUSYJ0TYCwekf2n`) on team `valette` (`team_qjPh7HC46TP4L3YnzhiDcXXM`). Production: https://personal-stylist-valette.vercel.app. Vercel Authentication is turned off so invitees reach the app without a Vercel account; the app's own invite gate does the gatekeeping. Env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL` are set. The first deploy was uploaded straight from this folder (no git remote yet). To link the CLI later:

   ```bash
   vercel login
   ```

   ```bash
   vercel link --project personal-stylist --scope valette --yes
   ```

3. **Run locally.**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000, enter the invited email, click the link in the email, land on an empty closet.

## Deploy

```bash
vercel --prod
```

Or push to a linked GitHub repo once one exists; Vercel deploys on push. Until then, deploys are uploaded directly (`vercel --prod` after `vercel link`, or via the Vercel connector).

## Layout

```
supabase/migrations/0001_init.sql            schema, RLS, invite trigger, storage bucket
supabase/migrations/0002_seed_mechanism.sql  seed_payloads + apply_seed(), run on first sign-in
supabase/migrations/0003_seed_data.sql       universal principles, retailers, invites, Val + Zack payloads
supabase/migrations/0004_is_invited_rpc.sql  is_invited() so login needs only the anon key
src/proxy.ts                        session refresh + login gate on every request
src/lib/supabase/{client,server,admin,middleware}.ts
src/app/login                       magic-link request (checks invites first)
src/app/auth/callback               magic-link landing (PKCE and token-hash flows)
src/app/auth/signout
src/app/(app)/layout.tsx            signed-in shell with nav
src/app/(app)/closet                empty state (session 3 fills it)
src/app/(app)/profile               reads profile, color, measurements (session 2 seeds them)
```

## Invites

Nothing but the service role can read `public.invites`. The login page calls `is_invited(email)` (returns true/false only) before sending a link, and a `before insert` trigger on `auth.users` rejects any email not on the list. To invite a friend, insert a row. To revoke, delete the row and the user from Authentication → Users.
