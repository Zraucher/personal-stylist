# Landing page redesign: plan and prompt

## Plan

**Goal.** Turn myvalette.com into a standard consumer-app landing page: a page that explains the product to someone who has never seen it and gets them on the waitlist. Right now it reads like a compressed version of the app.

**Routing (done before the prompt runs).** `/` no longer redirects signed-in users to `/today`. Everyone sees the landing page. Signed-in visitors get "Open the app" in place of "Sign in" and the waitlist. The installed app still opens on `/today` (`manifest.ts` start_url), and `/login` still sends signed-in users to `/today`.

**Page structure** (top to bottom, a familiar landing-page rhythm):
1. **Sticky nav**: wordmark, anchor links (How it works, Features, FAQ), then Sign in plus a primary "Get an invite" button. Signed in: a single "Open the app" button. On phones, links collapse and only the wordmark and one button show.
2. **Hero**: headline, one-sentence subhead, the waitlist form as the primary call to action, a secondary "See how it works" anchor, and a product visual: a phone frame showing a believable Today screen built from the real UI kit (OutfitStrip silhouettes, WeatherLine, a verdict chip, Wore it). One small reassurance line under the form ("Free during early access · Invite only").
3. **Proof strip**: three or four factual points in a row, such as "Works with the closet you already own", "Reads color from the photo, not the label", "Menswear, womenswear or both" and "Your photos stay private". No fake logos, press quotes, user counts or star ratings.
4. **Problem → promise**: a short two-column section naming the everyday problem (a full closet, nothing to wear, buying things that don't suit you) and Valette's answer.
5. **How it works**: three real steps (your colors → your closet → check before you go), each with a small UI fragment.
6. **Feature showcase**: alternating left/right rows, image on one side and copy on the other, for the five strongest features. Each row has a UI fragment built from kit components, an eyebrow, a heading, two sentences and one specific detail.
   - Today (three outfits for the weather)
   - Shop check (paste a link, get a verdict)
   - Closet gaps (the one piece that unlocks the most outfits)
   - Second opinions (friends vote, VoteBar)
   - Plan and trips (the week and a packing list)
7. **The verdict system**: works on you / almost / not for you, each with what it means.
8. **Stat band**: "23 pieces = 30 outfits", keeping the existing qualifier "From one real closet, across five typical days".
9. **Privacy reassurance**: a short block on what happens to photos, linking to /privacy.
10. **Pricing**: a single card, "Free during early access", listing what's included, with the waitlist CTA. No prices or plans that don't exist.
11. **FAQ**: keep the existing questions and the softened photo answer, in an accordion.
12. **Final CTA**: headline plus waitlist form on a blush band.
13. **Footer**: wordmark, short description, link columns (Product anchors, Privacy, Sign in), © 2026 valette.

**Design approach.** Stay inside the Second Look brand (docs/DESIGN.md): Bricolage Grotesque display and Figtree body, Linen/Night/Go Green/Blush/Marigold/Sky, one green action per view, pill buttons, 20 px cards. Use `high-end-visual-design` to raise the craft (spacing rhythm, type scale, section contrast, image framing). Use `impeccable` as a final critique pass before finishing. The landing page may use a wider type scale than the app (hero 56–80 px) and alternating section grounds (Linen, card white, Night, Blush), but no new fonts or colours.

**Guardrails.**
- No fabricated testimonials, reviews, logos, user numbers or press.
- No new promises beyond what's already on the page (free during early access, one invite email): this copy needs legal review before launch, so don't add more.
- Copy follows the word rules in DESIGN.md §5b.
- Light and dark mode. 375 px up to wide desktop. 44 px targets, labelled inputs, a visible focus ring, `prefers-reduced-motion`. Correct heading order: one h1, then h2 per section.
- Server component page. Only small client islands where needed (waitlist form, FAQ if it isn't `<details>`).
- Keep the metadata and Open Graph tags, updated if the copy changes.

## Prompt (executed as written)

You are redesigning the public landing page of Valette, a personal stylist web app (Next.js 16 App Router, React 19, Tailwind v4). Repo: C:\Users\zack\Claude Projects\Valette, branch `landing-redesign`. You may edit files.

1. Read `docs/landing-redesign.md` (this file: the plan above is your brief), `docs/DESIGN.md`, `CLAUDE.md`, `src/app/globals.css`, every file in `src/components/ui/`, the current `src/app/page.tsx`, `src/components/landing/WaitlistForm.tsx`, `src/components/Wordmark.tsx`, `src/lib/supabase/server.ts` and `src/lib/closet/placeholder.tsx`.
2. Invoke the `high-end-visual-design` skill and apply it within the Second Look brand. DESIGN.md wins where they conflict: no new fonts or colours, one green action per view.
3. Rebuild `src/app/page.tsx` to the plan's 13-section structure. Put sections in `src/components/landing/` as separate server components (for example `LandingNav.tsx`, `Hero.tsx`, `PhoneMock.tsx`, `FeatureRow.tsx`, `Pricing.tsx`, `Faq.tsx`, `LandingFooter.tsx`), so the page file reads as an outline. Build every UI fragment from the kit (`OutfitStrip` with `link={false}`, `Thumb` silhouettes, `WeatherLine`, `VoteBar`, `Chip`, `CheckTick`) so the landing page shows the real product. No screenshots or external images.
4. Signed-in state: in `page.tsx`, read the user with `createClient()` from `@/lib/supabase/server` (`supabase.auth.getUser()`). If signed in, the nav and every call to action become "Open the app" (`ButtonLink` to `/today`, primary), and the waitlist forms are not shown. Keep the page dynamic only as needed for this.
5. Keep `WaitlistForm` behaviour and its `source` values (`hero`, `footer`, plus `pricing` for the new pricing card). The form's server action, honeypot and `?ref=vote` handling stay unchanged.
6. Respect the guardrails in the plan: no fabricated proof, no new promises, the word rules, both themes, 375 px to desktop, accessibility, reduced motion.
7. When the build is done, invoke the `impeccable` skill for a critique pass on your result, and fix what it finds that's in scope.
8. Save files with LF line endings. Run `npx tsc --noEmit` and `npx eslint src/app/page.tsx src/components/landing`, and fix any errors. Do not run git, dev servers, `next build`, or deploy. Do not edit files outside `src/app/page.tsx` and `src/components/landing/` (new files there are fine).

Report (under 400 words): sections built, files, the design decisions that matter, anything skipped, and copy that needs legal review.
