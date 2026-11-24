# Virtual try-on: plan and provider choice

Goal: on an outfit (Today, Outfits) or a shopping-list find, tap "See it on me" and get one picture of
you wearing it, made from a Profile photo plus the pieces' photos.

## What we already have
- A full-body photo slot on Profile (`ProfilePhotos`, private `closet` bucket).
- Garment photos for closet pieces and store photos for finds, now often with the background taken out.
- The outfit picture (flat lay / ghost model) as a free fallback when try-on is off or fails.

## Providers (prices checked 2026-11-23)

| Provider | Price per picture | Garments per call | Notes |
|-|-|-|-|
| FASHN v1.6 (direct API, or on fal) | ~$0.075 on fal; direct is 1 credit per image | 1 (top, bottom or one-piece) | Fashion-only company; keeps prints and logos sharp. Strongest fit for a stylist app. |
| Kling Kolors v1.5 (on fal) | $0.07 | 1 | Holds pose and skin tone well; weaker on fine print. |
| Google Vertex AI Virtual Try-On | $0.06 | 1 | Very good renders; needs a Google Cloud project and service account. |
| fal image-apps-v2 try-on | $0.04 | 1 | Cheapest; up to 4K; less fashion-specific. |
| Gemini image editing (general model) | roughly $0.04 (check) | several in one prompt | Can dress a whole outfit in one call, but can change the face or body; needs guard prompts. |
| IDM-VTON / open models | — | — | Non-commercial licence: not usable. |

A full outfit (top + bottom + outerwear) on a one-garment model means 2 to 3 calls chained: about
$0.15 to $0.25 per outfit on FASHN or Kling. Shoes and bags are not covered by any of them.

## Recommendation
FASHN through fal: best garment fidelity, one SDK (`@fal-ai/client`) that also gives us Kling and
the $0.04 model to compare without new contracts. Vertex if you'd rather keep it on Google.

## Build (after you pick)
1. `FAL_KEY` (or the provider's key) in Vercel; you add it.
2. Server action `tryOn(outfitId)`: signs short-lived URLs for the body photo and garments, chains
   top → bottom → outerwear, stores the result as `tryon/<user>/<outfit>.jpg` in the private bucket.
3. "See it on me" next to the outfit picture; hidden until a full-body photo exists.
4. Limits: 10 try-ons per person per day, cache by outfit + photo so a repeat costs nothing.
5. Privacy page: say body photos go to the provider only to make the picture, and what their
   retention is (read their terms before launch).

## Decisions for you
- Provider (FASHN via fal recommended).
- Daily cap and who pays (free for invites, or a limit).
