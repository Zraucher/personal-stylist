# Persona test, round 2, 2026-11-25

Method: read the code for every route under `src/app/(app)`, the API routes, login, auth callback and the landing page. Round 1 fixes (relaxed picks, layering, diversity, short names, two-button feedback, bottom tabs, gaps grammar, closet search) are in and were not re-tested. No live run, no paid AI calls.

## Persona M: 35, Las Vegas, golf, casino nights
- Occasions have no "night out"; casino nights had to be filed under "Dinner out", and Ask text like "casino night" or "lounge" fell through to Casual.
- Magic-link email landed on Closet while the code flow landed on Today.
- Fine now: Golf or active, Vegas forecast by city, indoor-cold toggle, search, Gaps.

## Persona F: 35, polish without effort, small closet
- No first-run guide. A new account lands on Today with a wide-open form and no hint to add a city, tick basics or find colors.
- With 0 to 2 pieces Today still shows the occasion form and a "Pick three outfits" button that cannot work.
- "Felt like a costume" is still unclear on the feedback row.
- Nothing in the app links to Help or a way to reach us.

## Ranked tasks
1. First-run "Get set up" card on Today: tick basics, add city, find colors; hides when done. (built)
2. Today with fewer than 3 pieces: hide the form, show only the basics call to action. (built)
3. "Night out" for casino nights: occasion label "Dinner or night out", Ask understands casino, night out, lounge. (built)
4. Magic link lands on Today, same as the code. (built)
5. Feedback label "Felt like a costume" becomes "Felt off". (built)
6. Help and contact link at the bottom of Profile. (built)
7. Remember last occasion and hours so Today is one tap. (not built, Parked)

## Parked
- Remember last occasion and hours on Today.
- Push-notification opt-in prompt during setup (needs permission UX design).
- Setup step for sizes and brands (needs Profile redesign).
- Privacy/legal page, landing promise copy, daily usage limits on try-on/selfie, waitlist invite flow: owned by another branch.
- AI-written outfit names on the fallback path, color photos for the seeded closet, live selfie camera guide: owned by another branch.
