# Design review, round 2 and 3: task list

Sources: round 1 (impeccable, design-critique, accessibility-review; applied in commit 8a2b37c), round 2 (`redesign-existing-projects`: perceived quality, anti-template) and round 3 (`design:ux-copy`: every user-facing word). This file is the single task list for the fix pass. Line numbers are approximate; find the code by its content.

## Decisions that apply everywhere

These settle conflicts between the reviews. Follow them over any single finding.

**Naming**
- The AI has no name. Say "we" ("We'll read the color…"). Never "the tagger", "the reviewer", "the planner", "Claude", "AI", API keys or vendors (Anthropic, Firecrawl, Scrapling, Vercel, Supabase) in UI text.
- Garments you own are **pieces** (never "items"). Things in stores are **products**.
- Verdicts are only **works on you / almost / not for you**; short forms **✓ works / ◐ almost / ✕ no**. Never show keep, cut, provisional, Strong/Workable/Rework, including headline prefixes.
- Rule checks use the shared `CHECK_MARK` in `src/lib/verdict.ts`: ✓ good, ○ okay, ◐ watch, ✕ no, – not checked. Scorecard, outfit composition and haul review all render glyph + word from it.
- Second opinions: the feature is **Second opinions**; one request is **a second opinion** (never "an ask"); responses are **votes**; the button stays **Ask a friend**.
- Wearing: the button is **Wore it**; the done chip is **wore it** (lowercase, past tense); counts are **Worn 3 times**.
- Changing outfits: **Swap a piece** opens the editor; **Try another** replaces the whole outfit (Today, Plan, Trips).
- Shop: the tab and area are **Shop**; one session is **a haul**; **review** is only the per-product check. The wishlist page stays **Wishlist**.
- **Delete** destroys a record (piece, outfit, haul, wish, trip, second opinion). **Remove** takes something off a list (a product from a haul, a color, a photo slot). Trigger and confirm dialog use the same word.

**Case and style**
- In-app page titles match their tab in sentence case (Today, Plan, Closet, Shop, Profile). Empty-state titles, verdicts and public display lines are lowercase.
- Contractions everywhere (couldn't, we'll, you're). Short full sentences.
- No "not X but Y", no colon reveals, no em-dash asides.
- Every error says what happened and what to do next. Never show raw server, database or exception messages: map them to a plain line on the server or let the client fallback show.
- Signed-out errors: "You're signed out. Sign in again to save this."
- Not-found errors: "That {thing} isn't here anymore." plus where to go.
- Confirm dialogs for deletes say what goes with it and "This can't be undone."

**Shared components (already in the kit, use them)**
- `OutfitStrip` for every outfit (pieces first, same size everywhere): `size="lg"` on cards, `size="sm"` in compact rows.
- `WeatherLine` (big feels-like high, small meta) on Today, Plan and Trips.
- `VoteBar` for every vote tally (vote page, second opinion detail, landing mock).
- `Segmented` for view switches (Trips Looks / Packing list).
- `OutfitCardSkeleton` and `GridSkeleton` for loading states shaped like the content.
- `CheckTick` now defaults to `animate={false}`. Pass `animate` only when the person just acted in this session (tapped Wore it, voted, agreed). Server-loaded state shows the finished tick.
- `ChipLink` for nudge links.

**Brand guardrails (unchanged)**: Bricolage Grotesque + Figtree only, one green action per screen, Night for selection, one active card, Thumb for every garment, no new motion beyond DESIGN.md §8.

## Group A: public pages and shell

- **Landing `src/app/page.tsx`**
  - Phone mock: replace the three colour squares with garment silhouettes (`Thumb` with `item`) or an `OutfitStrip link={false}`.
  - "How it works": drop the three equal cards. Use a ruled list where each step is led by a large outlined numeral (`font-display text-6xl text-stone-300 tabular-nums`).
  - Verdict row: stacked full-width rows (`sm:grid-cols-[12rem_1fr]`, chip left, sentence right) instead of a third 3-column row.
  - The stat band label uses the eyebrow style. The hero headline gets `tracking-[-0.04em]`.
  - Copy, line 64: "We read the real color from the photo and tell you if it works before you buy."
  - Copy, line 220: "…so every suggestion is made for you."
  - Copy, line 75: "Second opinions".
  - Use `VoteBar` in any vote mock.
- **Landing, legal (soften without adding new promises, and flag in your report):**
  - FAQ "nothing else / at any time" → "We use them to give you advice. You can delete any photo in the app, and we'll delete your account if you ask."
  - Keep "free during early access" and the 23 pieces = 30 outfits claim as they are.
- **Vote page `o/[token]`**
  - Product second opinions: make the product the hero, a full-width `Thumb product` (`max-w-[280px] mx-auto`), with the price in `font-display text-2xl tabular-nums`.
  - Use `VoteBar`.
  - Closed state: `EmptyState compact` with "voting's closed".
  - When the owner has no name, never print "them" as a name: use "thanks, they'll see it." and "Your name, so they know who said it".
  - Put ". " between the tally summary and "Tap another…".
  - Pass `animate` to `CheckTick` only right after voting.
- **`src/lib/opinions/tally.ts`**
  - "1 vote: works on you" → "One friend says works on you".
  - "Mostly almost (2 of 3)" → "Most say almost (2 of 3)". Keep "Everyone says".
  - Make the tests still pass (`scripts/test-*.mjs`), updating expected strings if a test asserts them.
- **`o/[token]/actions.ts` (messages only, logic unchanged)**
  - "This link has expired." → "This link doesn't work anymore. Ask your friend for a new one."
  - "from this network" → "from this Wi-Fi".
- **Login**
  - The code input uses `font-display text-2xl tabular-nums tracking-[0.3em]`, placeholder "6-digit code".
  - Add the three verdict chips under the subtitle.
  - `login/actions.ts`: "We couldn't check your invite just now. Try again in a minute."
  - Replace the raw Supabase message with "We couldn't send your code. Wait a minute and try again."
- **Privacy / offline**
  - Use one public title scale (match login's `sign in` heading size).
  - Offline copy: "Pages you opened recently still work, like Today, Plan and Closet."
- **Shell**
  - `(app)/loading.tsx` uses `OutfitCardSkeleton`.
  - `error.tsx`: title "this page didn't load", one sentence, no repeated Notice.
- **Metadata:** `src/app/layout.tsx` and `manifest.ts` copy only if a review flagged it.

## Group B: Today, Plan, Trips, Ask, Second opinions, push copy

- **Today**
  - Cards lead with `OutfitStrip size="lg"` (pieces first), then the title and the why line. No captions under thumbs.
  - Use `WeatherLine` for the forecast.
  - Loading uses three `OutfitCardSkeleton`s.
  - EmptyState title: "{n} pieces so far". Body: "Outfits need at least a top, a bottom and shoes. Tick the basics you own. It takes a minute."
  - Chip "wearing it" → "wore it". The announcement becomes "Wore {name} today."
  - `CheckTick animate` only on tap. Draw a 22px tick beside the card title as well when the person taps Wore it, and the chosen card becomes the active card.
  - Copy, relaxed note: "Add one of the pieces below and the picks get closer."
  - Copy, no fit: "Nothing in your closet fits this yet. Add a piece below or change where you're going."
  - Copy, subtitle: "Three outfits from your closet, picked for the weather and where you're headed."
  - Copy, errors: "Couldn't pick outfits just now. Try again in a minute."
  - `PlannedToday`: "Week plan" → "This week". Use `OutfitStrip`.
  - `today/actions.ts`: plain messages ("Couldn't save that. Try again.", signed-out line, "That outfit isn't in your closet anymore."). Remove the raw database error.
  - `api/today/route.ts` and `api/ask/route.ts`: stop sending `e.message` as `detail`.
- **Plan**
  - `WeatherLine` per day.
  - Past and worn days collapse to a single compact row (day, outfit name, small `OutfitStrip size="sm"` or one thumb, "✓ wore it").
  - Each day card shows Wore it and Try another, with Swap a piece, Clear and Ask a friend under a More toggle.
  - Renames: Plan's "Edit" → "Swap a piece"; "Swap" → "Try another".
  - Confirm label "Clear" → "Clear day". The Replan confirm body: "Outfits planned for those days get replaced."
  - "You look offline." → "You seem to be offline. Try again when you're connected."
  - "The planner needs…" → "Plans need a few tops, bottoms and shoes." (also `api/plan/route.ts`). "the closet" → "your closet".
  - Map raw API error codes (`bad_request`, `unauthorized`) to plain lines.
  - Empty trips: "going somewhere?" with body "…we'll build…".
- **Trips**
  - `Segmented` with `tabs` replaces the hand-typed tablist.
  - Use `OutfitStrip` and `WeatherLine`.
  - "Delete trip" sits in a `border-t border-line pt-6` row. Its confirm body: "Its looks and packing list go too. This can't be undone." Confirm label: "Delete trip".
  - "Swap" → "Try another".
  - `trips/actions.ts` and `lib/plan/trip.ts`: plain not-found and signed-out messages.
- **Ask**
  - No answer yet: an `EmptyState` with one sample answer line (or the last asks if already loaded).
  - Examples become a `ListCard` of tappable quoted lines with no `aria-pressed`.
  - Subtitle: "For days that aren't routine. Say it the way you'd text a friend."
  - Error: "Couldn't find looks for that. Add a detail or two and try again."
- **Second opinions**
  - The list leads each row with a `Thumb size="xs"` of the first piece. Sign image paths in one batch with `signedImageUrls`; product second opinions use `image_url` with `product`.
  - The detail page puts the `OutfitStrip` first, then the votes, with `VoteBar`.
  - `OpinionControls`: keep Share again and See what friends see. Move Close voting and Delete to a quiet row below (`border-t border-line pt-3`).
  - Empty states: "nothing shared yet", "no votes yet".
  - Metadata: "Second opinion · valette". Delete confirm: "Delete this second opinion and its votes?" with body "The link stops working. This can't be undone."
  - `opinions/actions.ts`: "You've shared 30 looks today. Try again tomorrow." and "That second opinion isn't here anymore."
  - `AskFriendsButton`: "Sent." → "Shared."
- **Push copy**
  - `api/push/route.ts`: the test notification is "Notifications are on". Device limit: "Notifications are on for 10 devices. Turn them off on one you don't use."
  - Failure: "Couldn't turn on notifications. Check that this browser allows them, then try again."
  - Check `api/cron/daily/route.ts` and `lib/push/send.ts` texts against the voice.

## Group C: Closet, Outfits, Gaps

- **Closet list**
  - Drop the card frame around each tile (no `bg-card p-1.5 ring-1`). The Thumb is the surface, with the caption on the page (`pt-2`) and `group-hover:[&_img]:scale-[1.02] transition-transform duration-300 ease-soft`.
  - Verdicts become a 20px corner disc with the glyph and an sr-only label. The full chip stays on detail.
  - Category headings use `font-display text-lg font-bold` with the count in `text-sm text-stone-500 font-sans`. Apply the same to Builder and Basics.
  - Drop the repeated colour name next to its swatch.
  - Add `closet/loading.tsx` with `GridSkeleton`.
  - Copy: "Add a piece", "pieces", page metadata "Closet · valette".
- **Item detail**
  - Hero image `max-w-[360px]` on mobile. Desktop grid is `sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`.
  - The "Added…" + Delete card becomes a plain `flex justify-between text-sm` row.
  - `DeleteItemButton`: "Delete this piece?" with body "Its photo goes too. If it just left your closet, mark it Gone instead."
- **ItemForm / ItemCapture copy**
  - Use "we", "fill in the details yourself", "Read the photo again", "We check these against your dislikes."
  - "Photo reading is off right now. Fill in the details yourself." Remove the API-key text.
  - ItemCapture shows `Thumb src={previewUrl}` with an overlay `Chip` "Reading photo…" while tagging.
  - ItemCapture copy: "We'll read the color, construction and formality. You fix anything we get wrong."
- **ScorecardPanel**
  - Statuses come from `CHECK_MARK`.
  - "Reviews are off right now. Try again later." and "We're busy right now. Try again in a minute."
  - "…then a verdict." "Always works / Never works" replaces "Proven look / Known failure".
  - `CheckTick animate` only after the person acts.
- **`src/lib/scorecard/rules.ts`** (user-facing strings only; logic and return shapes unchanged; keep tests passing, updating expected strings if they assert them)
  - Drop "Keep:/Cut:/Provisional:" headline prefixes.
  - "No … on file" → "Add your best colors (fabrics, shapes) on Profile to check this."
  - "We couldn't match your best colors to real shades. Check the names on Profile."
  - "…isn't in your palette, but your palette is short, so take this lightly."
  - Apply the same prefix fix in `api/haul/review/route.ts` headlines (coordinate: that file belongs to Group D. Group C only edits `rules.ts`).
- **Review page:** "We'll learn from the ones you disagreed with."
- **Basics:** "Tick what you own. Each one goes in your closet, and we'll ask the brand and color so it's right."
- **Sourced:** title "Photos we found".
- **Insights**
  - Restore a `grid grid-cols-3 gap-3` of `StatTile`s (pieces, % worn in 90 days, wears this month) and cut the subtitle to its last sentence.
  - Copy "Wore it" / "Wore it today".
- **WearPanel:** done state "Worn today ✓" (keep the separate Undo). aria-label "Undo: wore it today". Count "Worn N times".
- **Actions files** (`closet/actions.ts`, `wear-actions.ts`, `scorecard-actions.ts`, `sourced/actions.ts`, `outfits/actions.ts`): plain signed-out, not-found and "That photo isn't from your account. Upload it again." messages. "Couldn't save this piece. Try again." replaces the raw database error.
- **Outfits list**
  - Flat-lay preview: `grid grid-cols-[2fr_1fr] gap-1.5`, the first piece `size="fill"`, the rest stacked, with a +N overlay past four. (Or `OutfitStrip size="lg"` if that reads better; pick one and keep it consistent.)
  - Metadata "Outfits · valette".
- **CompositionPanel / `lib/outfit/composition.ts`** (strings only, keep tests passing)
  - Overall chips "works / almost / not yet / needs pieces".
  - Drop the "Rework:" prefixes and the colon reveals.
  - Move the far-from-face note into the reason.
  - "Add formality and warmth to these pieces to check this."
  - "came back not for you… Swap in a piece that works on you."
  - Statuses from `CHECK_MARK`.
- **Builder**
  - Picked pills use `Thumb size="xs" className="rounded-[8px]"` instead of a raw circle img.
  - Category headings as above. Back label "Outfits".
  - `DeleteOutfitButton`: "Deleting…".
- **Gaps**
  - The #1 gap becomes `variant="active"` with a bigger Thumb (`w-28`).
  - Move the typical-days list from the subtitle into the footnote.
  - Copy "…or pieces are missing warmth and formality. Add those on each piece."
- **ClosetSubnav:** do not edit (shell owner). It stays as is.

## Group D: Shop, Wishlist, Profile, App card

- **Hauls list**
  - Lead each row with up to three overlapping `Thumb size="xs" product` (`-space-x-3`, `ring-2 ring-card`). Add `image_url` to the `haul_items` select.
  - Collapse the start form to the primary button, with Store and Purpose behind a `<details>` "Add details".
  - Copy "products"; button "Start a haul"; fallback title "Haul". Metadata "Shop · valette".
- **HaulReview**
  - Statuses from `CHECK_MARK`.
  - One skeleton product card per queued job instead of text lines.
  - Product image `w-28 sm:w-32`.
  - "Delete" → "Remove" on both the trigger and the dialog. "Failed:" → "Couldn't read:".
  - "Paste a full product link (starting with https://)."
- **`api/haul/review/route.ts`**
  - "Reviews are off right now. Try again later."
  - "Couldn't save this product. Try again." replaces the raw errors.
  - Drop the Keep/Cut/Provisional headline prefixes.
- **Wishlist**
  - Price drop becomes `<Chip tone="almost">↓ $X (N%)</Chip>`, never green text.
  - Palette fit becomes `<Chip tone="outline">✓ in palette</Chip>` (or an outline "outside your palette"), with the reason moved into the More disclosure.
  - The add form shows only "What" and the button, with the rest behind "Add details".
  - While searching, show a `grid-cols-2 sm:grid-cols-3` skeleton of three product cards.
  - Subtitle: "Pieces you want. Find options searches stores in your colors and from brands you love."
  - `wishlist/actions.ts`: haul name "Wishlist: {title}".
  - `api/wishlist/source/route.ts`: "We found stores but couldn't read their pages. Try a different color or brand."
  - Plain errors throughout. Metadata "Wishlist · valette".
- **Profile**
  - PageHeader `title={name || "Profile"}` with `eyebrow={season_label}`, plus a strip of up to six best-color swatches (`flex h-3 overflow-hidden rounded-full`) linking to `/profile/palette`.
  - The Color card view mode renders best and avoid colors as `Swatch` + name chips, the way the palette page does.
  - Photo slots use 4:5 frames (match Thumb). Empty slots show a faint figure outline instead of "+".
  - Sub-headings in ProfilePhotos and AppCard use `font-display text-base font-bold`.
  - "This can't be undone." replaces "It is deleted from storage."
  - Contractions everywhere. Metadata "Profile · valette".
- **Palette page**
  - Take the swatch grid out of its Card. Swatches `h-28 sm:h-36` in `grid-cols-2 sm:grid-cols-3`.
  - ShareCard image `max-w-[200px]` beside its button on wider screens.

## Not in scope (decide later)

- An image-load fade (DESIGN.md §8 limits motion; needs a rule change first).
- Legal items, flagged for review before public launch:
  - privacy page contact address, retention, age limit, GDPR/CCPA rights
  - the voter cookie and hashed network address disclosure
  - pricing and email promises on the landing page
  - "Every skin tone, every gender, every budget"
