# Persona test, 2026-11-15

Two test accounts (copies of Zack's and Val's seed data, no photos) used the app on localhost. Localhost has no Anthropic key, so the non-AI fallbacks were exercised; AI paths were judged from code and earlier live runs.

## Persona M: 35, Las Vegas, golf, casino nights, business plus performance casual

**Likes**
- Today reads the real Las Vegas forecast for only the hours he is outside.
- Gaps names a concrete purchase with a number ("khaki chinos unlocks 30 outfits").
- Wishlist "Find options" actually returns products and hides the ones outside his palette.
- Profile reads like him: brands, sizing notes, two style modes.

**Dislikes**
- Three Today picks were nearly identical: same polo, pants and hoodie, only the sneaker swapped.
- Each card repeats the same line twice ("Strong: balanced, in palette...") and has no short name.
- Ask for a Strip steakhouse dinner returned nothing, only a list of what is missing. A summer polo under a jacket is normal in Vegas; the engine refuses light tops on a 51°F evening.
- Gaps copy: "A khaki chinos", "A onyx joggers", and black and onyx joggers listed as two separate ideas.
- Closet: hoodies sit under "Other", two shirts look identical because the card hides the color, no way to search.
- On the phone the top nav scrolls sideways; Shop, Wishlist and Gaps are hard to find.

**Wishes**
- "Give me the closest thing" instead of nothing.
- A quicker way to say what he wore without five buttons.

## Persona F: 35, Las Vegas, wants polish without effort, small closet so far

**Likes**
- Basics checklist is fast and makes sense.
- Palette card idea.

**Dislikes**
- Today with 4 pieces and no shoes says "No outfit fits" and stops. The missing list is plain text with no link to fix it.
- Login says "We sent a sign-in code to ." with no email shown, so she was not sure it went to the right address.
- Five feedback buttons feel like homework; "Felt like a costume" is unclear at a glance.
- Wishlist titles like "Tier 1 Shoes" read like an internal note.

**Wishes**
- When the closet is thin, tell her what to add and take her there in one tap.
- Bottom tabs on the phone like every other app.

## Ranked tasks (built this round)

1. Login: show the email in "We sent a sign-in code to ...".
2. Today/Ask: when nothing passes the strict rules, relax them (warmth, dress level, shoes) and return the closest outfits, labelled "Closest match".
3. Layering: allow lighter core pieces when a layer is in the outfit.
4. Diversity: the three picks must differ by at least two pieces.
5. Cards: a short outfit name as the title; the headline only once.
6. Feedback: two primary buttons (Wore it, Not me) and the rest behind "More".
7. Thin closet: Today shows a "Fill the gaps" call to action linking to Basics and Add item; missing items link there too.
8. Gaps: correct grammar, one suggestion per piece type, linked from Closet.
9. Closet: hoodies and jackets grouped as Layers, color shown on each card, a search box.
10. Mobile bottom tab bar; wishlist titles cleaned of tier labels.

## Parked for later
- AI-written outfit names on the fallback path; colour photos for the 23 seeded items; price watch.

## Build prompt

> Valette (Next.js 16, Supabase, Claude). Implement the ten ranked tasks above on branch `persona-round-1`. Keep the candidate engine pure and tested: add node tests for the relaxed fallback, layering warmth and two-piece diversity in `scripts/test-today.mjs`, and for gap labels in `scripts/test-gaps.mjs`. No schema changes are expected. Plain, direct UI copy, no jargon. Run `npx tsc --noEmit`, eslint on changed files and all four test suites, then `next build`. Merge to main, deploy to production through the Vercel connector, and smoke-test the routes.
