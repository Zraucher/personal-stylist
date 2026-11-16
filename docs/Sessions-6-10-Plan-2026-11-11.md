# Sessions 6 to 10: detailed plan

Written 2026-11-11. Extends section 10 of `Style-App-Personal-Build-Plan-2026-11-08.md`. Sessions 1 to 5 are built and live at https://www.myvallette.com.

## Before session 6

Three things are worth doing first. None is a build session.

1. **Real closet data.** Zack's closet has 23 seeded items and no photos, so every scorecard is provisional. Val has not signed in. Sessions 4 and 5 have not met their "done when" tests (Val agrees with 8 of 10 verdicts; the counterbalance rule fires on a real buttoned-up outfit). Photograph 15 to 20 pieces each and run `/closet/review`. Today (session 6) works from tags alone, but its picks are only as good as the closet.
2. **Val's sign-in.** Confirm AgentMail delivers the code to her Gmail. If it does not, set up a verified sender on `myvallette.com` before anything else, because every later "done when" needs both users.
3. **Auto-deploy.** Install Vercel's GitHub app on the `Zraucher` account so a push to `main` deploys. The connector upload recipe works but costs time every session, and five more sessions will each deploy several times.

## Shared groundwork (start of session 6)

Sessions 6 to 10 reuse the same three things, so pull them out once:

- `src/lib/ai/claude.ts`: one helper for structured Claude calls (zod schema in, typed object out). Today the tag and scorecard routes each carry their own copy.
- `src/lib/scorecard/run.ts`: the scorecard pipeline (rules, then vibe, then verdict) as a function that takes any item plus an image. Today it lives inside `/api/scorecard` and only accepts a closet item. Session 8 needs it for products that are not owned yet.
- `src/lib/closet/tag.ts`: the vision tagger as a function, for the same reason.

Models: keep `claude-opus-5-5` for scorecards and haul reviews, where the vibe judgment matters. Use `claude-sonnet-5-5` for Today and Ask. The tagger can move to `claude-haiku-5-5` if volume ever makes cost noticeable; not needed at ten users.

---

## Session 6: Today

**Goal.** Three outfits for today's weather and occasion, each with a one-line why, plus feedback.

**Flow.** `/today` becomes the landing page after sign-in. The user picks an occasion chip (office, casual, dinner out, event, active, travel), the hours they will be outside (morning, midday, evening), and an "indoors will be cold" toggle. The app returns three outfits.

**Build.**

| Piece | Detail |
|-------|--------|
| Weather | Open-Meteo hourly forecast (temperature, feels-like, rain chance, UV, wind), no key. Geocode `profiles.location` once with Open-Meteo's geocoder and store latitude, longitude and timezone on the profile. Cache the day in `day_profiles`. |
| Candidate assembly (code) | New pure module `src/lib/today/candidates.ts`. Filters the closet: available, in season, warmth right for the outside hours, formality inside the occasion's band, not a scorecard cut. Builds outfits from templates (top + bottom + shoes; dress + shoes; add a layer when indoors is cold or the day swings more than 20°F). Runs the existing `checkOutfit` on each and drops anything rated rework or incomplete. Ranks by composition, affinity and days since last worn, then keeps about 12 varied candidates. |
| Pick (model) | Sonnet 5.5 sees the 12 candidates as text, the day, the profile, principles and benchmarks, and returns three with a why line each. Structured output. |
| Storage | Three `outfits` rows (source `generated`), one `recommendations` row holding all candidates with their scores, so the why line can be audited later. |
| Feedback | Wore it (sets `chosen_outfit_id`, `last_worn`, raises affinity), Skip, Not me (optional note, lowers affinity), Swap a piece (opens the builder prefilled; records swapped out and swapped in). "This is exactly me" and "felt like a costume" copy the outfit into benchmarks. |
| Thin closet | If fewer than three valid outfits exist, say which piece is missing instead of forcing a bad pick. Log the missing piece; session 10 uses it. |
| Home screen | Web app manifest and icons so it installs on a phone. Small, and Today is the daily habit. |

**Migration 0007.** `profiles.latitude`, `longitude`, `timezone`; `recommendations.occasion`, `recommendations.kind` (today or ask), `recommendations.prompt`.

**Tests.** `scripts/test-today.mjs` on the candidate module: warmth bands, formality bands, cold-indoors layer, cuts excluded, recently worn ranked lower.

**Done when.** Both seed users use it for five weekdays.

**Risk.** Twenty-three generic items produce bland picks. This is the reason for the photo work above.

---

## Session 7: Palette card and Ask

**Goal.** A shareable palette image, and free-text requests for non-routine days.

**Palette card.**
- `/profile/palette` shows best colors and cautions as swatches, using the hex values the scorecard already resolves.
- `/api/palette-card` renders a 1080 by 1350 image with Next's built-in image generation. Share and download buttons. First name only, no photo.

**Ask.**
- `/ask` takes text such as "rooftop dinner Friday, it'll be 95 at sunset, no dress".
- Step 1 (model): turn the text into constraints: date and hours, stated temperature, occasion, formality, exclusions (no dress), must-include pieces.
- Step 2 (code): run the session 6 candidate engine with those constraints. Use the forecast if the date is within seven days; otherwise use the stated temperature or the season norm.
- Step 3 (model): pick up to three and write the why lines. If the closet cannot satisfy the request, say what is missing.
- Saved as a `recommendations` row with `kind = ask` and the original text, with the same feedback buttons as Today.

**Migration.** None beyond 0007.

**Done when.** The palette card shares as an image, and the rooftop request returns something wearable from the real closet.

---

## Session 8: Haul review

**Goal.** Paste product URLs or upload screenshots; get a verified scorecard for each; never lose a haul again.

**Flow.** `/hauls/new`: paste URLs, one per line, or upload screenshots. Each row shows its own progress and result. `/hauls` lists saved hauls.

**Build.**

| Step | Detail |
|------|--------|
| Scrape | Firecrawl scrape per URL: product name, price, stated colorway, material, main image. Needs `FIRECRAWL_API_KEY` in the Vercel project (you enter it in the dashboard). |
| Keep the evidence | Download the product image into the private bucket under `<user id>/hauls/`. The verdict keeps the image it was scored from. HTTPS only, size capped. |
| Verify | Run the vision tagger on the image. Compare verified colors with the stated colorway and flag a mismatch ("Mauve French Paisley" that is bright pink). |
| Score | Run the shared scorecard pipeline. No image means provisional, as with closet items. |
| Save | `hauls` and `haul_items` already exist. Agree and Disagree feedback already supports `haul_item`. |
| Fallback | If a scrape fails or returns no image, the row asks for a screenshot instead. |
| Bought it | "Purchased" copies the haul item into the closet with its photo and tags. "Returned" keeps the record. |

One request per URL from the browser, so six URLs do not sit inside one long server call.

**Migration 0008.** `haul_items`: `price`, `category`, `subcategory`, `material`, `construction`, `pattern`, `scrape_status`, `closet_item_id`.

**Done when.** The lost outerwear audit is re-run end to end. This needs the six pieces re-collected: Val supplies the URLs or screenshots.

**Risk.** Some retailers block or render with JavaScript. Session 8 ships with the generic path and the screenshot fallback; the per-retailer fixes are session 9.

---

## Session 9: Retailer playbook, wishlist, sourcing

**Goal.** Retailer quirks become code, and the app can go find a wanted piece.

**Retailer playbook.** `src/lib/retail/strategies.ts`, keyed by domain, used by the session 8 scrape step:
- Revolve: direct scrape.
- L'Agence: pages render with JavaScript; wait for render, and fall back to a search by product name plus colorway.
- Azazie: image fallback.
- Nordstrom Rack: checked for L'Agence markdowns when a L'Agence piece is reviewed.
- Everything else: the generic path.

**Wishlist.** `/wishlist`: add, edit and close entries on the existing table (the belt entry is already seeded). Upcoming needs appear on the same page.

**Sourcing search.** From a wishlist entry:
1. Code builds queries from the category and preferences, the user's loved brands, and color synonyms for their best colors (rust OR terracotta OR ochre). The synonym table lives in code beside the color lexicon.
2. Firecrawl search, de-duplicated. The top results are scraped for an image.
3. Each result gets the fast palette rule check from its image. Only in-palette results are shown.
4. "Review" sends a result through the session 8 pipeline for the full scorecard.

Each run is capped (about 8 searches and 12 scrapes) and shows what it used, so Firecrawl credits stay predictable.

**Migration 0009.** `wishlist_candidates`: wishlist entry, URL, name, image, price, verified colors, palette result, state (new, saved, dismissed).

**Done when.** The belt search returns tooled leather options in palette.

---

## Session 10: Closet gaps and price watch

**Goal.** One quantified purchase suggestion per user.

**Closet gaps.**
- New pure module `src/lib/gaps/unlock.ts`. Count the valid outfits the closet makes today using the session 6 engine. For each hypothetical piece, add it and count again. The difference is what that piece unlocks.
- Hypothetical pieces come from three places: the basics list in the user's best neutrals, pieces Today and Ask reported missing, and saved wishlist candidates (real products).
- `/gaps` shows a suggestion only when it has a number: "A camel belt unlocks 8 outfits." Below a threshold, show nothing.
- "Find it" starts the session 9 sourcing search for that piece.
- Tests in `scripts/test-gaps.mjs`.

**Price watch (optional).** A daily Vercel cron re-scrapes saved wishlist candidates marked "watch", stores price history, and shows a badge when a price drops. Two costs to know about: it is the first feature that needs the service-role key (a cron job acts for every user), and it spends Firecrawl credits daily. Recommendation: build gaps first and add the watch only if one of you asks for it.

**Migration 0010 (only with price watch).** `price_history`, plus `watch` on `wishlist_candidates`.

**Done when.** Each seed user sees one quantified suggestion they agree is worth buying.

---

## New setup across these sessions

| When | What | Who |
|------|------|-----|
| Before 6 | Vercel GitHub app on `Zraucher` (auto-deploy) | Zack |
| 6 | Migration 0007 | Claude, through the Supabase connector |
| 8 | `FIRECRAWL_API_KEY` in Vercel env; migration 0008 | Zack enters the key; Claude runs the migration |
| 9 | Migration 0009 | Claude |
| 10 | Only with price watch: `CRON_SECRET`, service-role key, migration 0010 | Zack enters the keys |

## Decisions that are yours

| Decision | Recommendation |
|----------|----------------|
| Start session 6 now or photograph first | Photograph first, at least 15 pieces each. Today on a tag-only closet will feel generic and you will judge the feature unfairly. |
| Calendar integration in Today | Occasion chips only, as the original plan says. |
| Price watch | Skip unless asked for. |
| Outerwear audit inputs | Ask Val for the six URLs or screenshots before session 8. |

After session 10, add friends one at a time and fix what each one breaks.
