# Selfie color reading: plan (2026-11-25)

Goal: in the Profile color quiz, a person can take or pick a selfie instead of answering four questions. Claude reads
skin depth, undertone, natural hair color and eye color from it, the quiz fills in, and the person checks the answers before
tapping Find my colors. Nothing about the photo is kept.

## Flow
1. Profile → Color → Edit → Find my colors box → **Use a selfie** (file input, `capture="user"`, so phones open the front camera).
2. The browser shrinks the photo with the existing `compressImage` (1024 px long edge, JPEG) and posts it as base64 to
   `POST /api/color-selfie`.
3. The route checks sign-in, that AI is set up, and the size, then calls `structured()` (Opus) with a schema whose enums are
   built from the quiz's own option lists in `src/lib/profile/season.ts`, so the two can't drift.
4. The answer fills the four selects. A note says "From your photo. Check these, then tap Find my colors", plus Claude's
   warning if the light is poor (warm indoor bulbs, filters, heavy makeup) or the hair looks dyed.
5. The person can change any answer. Saving works exactly as now: only the season and colors are stored.

## Decisions
- The photo is never uploaded to storage and never saved; it goes to Claude for this one request only. The privacy page
  already says Claude analyzes photos and receives only what each request needs, so its approved wording stays as is.
- Answers prefill the quiz rather than skip it: lighting changes how skin looks, so the person stays in charge.
- No face matching or identity work; the prompt asks only for color traits.
- Undertone "unsure" is allowed as an answer when the photo can't tell, so the quiz falls back on hair and eyes.

## Not in this round
- Live camera view with a framing guide; daily limits per person (one call costs cents, and only signed-in people can call it).
