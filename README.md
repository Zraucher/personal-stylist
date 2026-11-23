# Personal Stylist

Private, invite-only stylist app. Next.js 16 on Vercel, Supabase for data, auth and images, Claude for judgment.

Plan: `C:\Users\zack\Downloads\Style-App-Personal-Build-Plan-2026-11-08.md` (ten build sessions). Sessions 1 to 10 are built.

## State as of 2026-11-11

- **Production:** https://www.myvalette.com (domain is `myvalette`, one l). The apex redirects to www. The old domain `myvallette.com` (apex, www, app., dev.) 308-redirects to https://www.myvalette.com.
- **Supabase:** project **Valette App** (`dqnreeflkhrbsfuvkzjx`, us-east-1). Migrations 0001 to 0011 are applied. Migrations are applied through the Supabase connector, not a CLI.
- **Vercel:** team `valette` (`team_qjPh7HC46TP4L3YnzhiDcXXM`), project `prj_VEGr6clooeo28BUSYJ0TYCwekf2n`. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (fallback only; the login page uses the request host) and `ANTHROPIC_API_KEY`. Vercel Authentication is off; the app's invite gate does the gatekeeping.
- **Seeds** apply on first sign-in (`apply_seed`, called from the `on_auth_user_created` trigger). Zack's payload is keyed to `zack@gpsteam.com` (signed in, 23 seeded closet items, no photos yet). Val's is keyed to `valerieraucher@gmail.com` (not yet signed in).
- `.env.local` holds the Supabase URL and anon key. No service-role key is needed: the login page checks invites through the `is_invited()` database function.

## Sign-in (6 to 8 digit email code)

Sign-in is a code, not a link. Corporate email scanners open links and burn the one-time token (`otp_expired`), and the link and the code are the same token. So both Supabase email templates, **Magic link or OTP** and **Confirm sign up** (first-time users get this one), must contain only `{{ .Token }}` and no `{{ .ConfirmationURL }}`.

- The login page asks for the email, checks the invite list, then shows a code box on the same page. Type the code there. The code box only appears right after the email is submitted, and requesting a new code invalidates the old one.
- `requestMagicLink` and `verifyCode` live in `src/app/login/actions.ts`. `verifyCode` calls `verifyOtp({ email, token, type: "email" })`.
- Supabase Auth Site URL is `https://www.myvalette.com`; redirect URLs include its `/auth/callback` (still used for the PKCE link flow, which is no longer the primary path).
- Email goes out through custom SMTP via AgentMail (`smtp.agentmail.to:465`, sender `hello@myvalette.com`, a verified AgentMail domain; DNS records live in Vercel DNS, DMARC p=reject). The SMTP password is an AgentMail API key, entered in the Supabase dashboard only. The AgentMail free plan allows one custom domain.
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

## Session 6: Today

- `/today` is the landing page. Pick an occasion, the hours you will be outside and whether indoor air is cold; get three outfits with a one-line reason each.
- Weather is Open-Meteo (no key). The profile's city is geocoded once and saved as `latitude`, `longitude`, `timezone` (migration 0009). Each day is cached in `day_profiles`.
- `src/lib/today/candidates.ts` (pure, tested) filters the closet by status, season, warmth and dress level, builds outfits from templates, runs the composition check, ranks by composition, affinity and recency, and keeps at most two candidates per top. Missing pieces are named instead of forcing a bad pick.
- `src/lib/today/recommend.ts` asks Claude (`claude-sonnet-5-5`) to pick three and write the lines; without the key it takes the top three. Picks are saved as `outfits` (source `generated`) and one `recommendations` row.
- Feedback: Wore it (last worn, affinity up), Skip, Not me (affinity down, optional note), Exactly me / Felt like a costume (new benchmarks). Swap a piece opens the builder prefilled.

## Session 7: palette card and Ask

- `/profile/palette` shows swatches; `/api/palette-card` renders a 1080x1350 PNG with `next/og`. Share uses the Web Share API, else downloads.
- `/ask` takes free text. Claude turns it into constraints (day, hours, stated temperature, occasion, exclusions, named pieces); a regex fallback works without the key. Exclusions match the garment's head noun, so "no dress" keeps dress shirts.

## Session 8: haul review

- `/hauls` lists saved hauls; `/hauls/[id]` takes product links (one per line) or screenshots (upload, drop or paste) and reviews them one at a time.
- Scraper chain (`src/lib/retail/scrape.ts`): Shopify `/products/<handle>.js` when it applies, then **Scrapling** (`SCRAPLING_URL`, optional `SCRAPLING_TOKEN`; the app POSTs `{url}` and accepts `{html}` JSON or raw HTML), then **Firecrawl** (`FIRECRAWL_API_KEY`, backup), then a plain fetch. JSON-LD Product data first, then Open Graph tags.
- The product image is saved under `<user>/hauls/`, tagged by Claude, compared with the listed color (a mismatch is flagged), and scored with the same pipeline as closet items (`src/lib/scorecard/run.ts`). Bought it copies the piece and photo into the closet. Migration 0010.

## Session 9: retailer playbook, wishlist, sourcing

- `src/lib/retail/strategies.ts` is the playbook: which stores are Shopify, which need a browser (L'Agence, Azazie, Nordstrom Rack), and the tip shown when a page fails.
- `/wishlist` adds, closes and deletes wishes and shows upcoming needs. Find options builds a few queries from color synonyms (`synonyms.ts`) and loved brands, searches (Firecrawl search with the key, else DuckDuckGo HTML), reads up to six product pages, reads each photo's color (`claude-haiku-5-5`) and shows the in-palette ones. Full review sends a result through the haul review. Migration 0011 (`wishlist_candidates`).

## Session 10: closet gaps

- `/gaps` counts the outfits the closet makes across five typical days, adds each missing basic (in its own color or the first two palette colors) and counts again. A suggestion shows only when it adds 3 or more outfits, with a link that adds it to the wishlist. Price watch is deferred (see the tracker).

## Saved products (the DogEar idea, built in)

- Save a product from any store and decide later. `/save?url=` (also `text=` and `title=`, which is what a phone's share sheet sends) saves the link; the Wishlist page has a paste box and shows them under **Saved products**.
- Ways in: the paste box, Android Share (the manifest's `share_target`), an iPhone Shortcut that opens `/save?url=`, and a bookmarks-bar button on `/save`.
- `POST /api/wishlist/save` cleans the link (`src/lib/retail/link.ts` drops tracking parameters), reads the page with the scraper chain, checks the palette and starts the price watch. A page that can't be read is still saved as a bare link.
- A saved product is a `wishlist_candidates` row with no wish (`wishlist_id` null, migration 0018), so price watch, the daily cron, Full review and Ask a friend all work on it unchanged.
- Not built: saving by forwarding an email, and returning to `/save` after a sign-in (a signed-out save lands on Today).

## Price alerts, "Should I buy it?" and the Chrome extension

- Migration 0019 adds `list_price`, `target_price`, `rating`, `review_count`, `advice`, `advised_at` to `wishlist_candidates`.
- Alerts: the daily cron pushes a line only when a watched price went down (`priceNews` in `src/lib/retail/price.ts`): hit the person's "Tell me at this price", on sale against the store's own list price, or a plain drop. Cards show "On sale" and "At your price" chips. No email alerts: the app has no mailer.
- `POST /api/wishlist/advise {id, reviews?}` (`src/lib/retail/advice.ts`) re-reads the page, gathers reviews (the page's own data, what the extension saw on screen, web search snippets when `FIRECRAWL_API_KEY` is set) and answers buy / wait / skip with a sizing call (size up, size down, true to size, mixed). Without the AI key it falls back to counting sizing remarks (`src/lib/retail/sizing.ts`). It never invents reviews; with none it says sizing is unknown.
- `extension/` is the Chrome extension (Manifest V3, no build step). The popup reads the open product page, saves it through `/api/wishlist/save` (its `page` data fills in when the store blocks our reader), then shows the advice. Right-click has "Save to valette". Rebuild the download after any change: `python scripts/zip-extension.py` writes `public/valette-extension.zip`. Not in the Chrome Web Store yet; people load it unpacked.
- Tests: `node --test scripts/test-shop.mjs`.

## Environment variables

| Name | Needed for | Status |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | everything | set |
| `ANTHROPIC_API_KEY` | tagging, scorecards, Today picks, Ask, haul review | set |
| `SCRAPLING_URL`, `SCRAPLING_TOKEN` | primary scraper for haul review and sourcing | to add |
| `FIRECRAWL_API_KEY` | backup scraper and better product search | to add |

## Tests

```bash
node --test scripts/test-rules.mjs scripts/test-composition.mjs scripts/test-today.mjs scripts/test-gaps.mjs scripts/test-link.mjs
```

Needs Node 22.18+. The rules, composition, candidate and gap modules are erasable TypeScript, so Node runs them directly (40 tests).

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
