// Pure: which pieces of an outfit go into try-on, how the model is told about them, and where the result is cached.
import { createHash } from "node:crypto";
import { slotOf } from "../outfit/mockup.ts";
import { originalOf } from "../closet/cutout.ts";

export type TryOnPiece = { id: string; image_path: string | null; category: string | null; subcategory: string | null };
export type TryOnStep = { path: string; slot: string };

// The original photo, not our cut-out: the model reads the garment better with its real background and full frame (tested 2026-11-23).
const garment = (path: string) => originalOf(path) ?? path;

// Nano Banana takes 14 images; one is the body photo.
const MAX_PIECES = 13;
const LABEL: Record<string, string> = { dress: "dress", top: "top", bottom: "bottoms", outer: "jacket or outer layer, worn over the top", shoes: "shoes", bag: "bag, carried", extra: "accessory" };

/** Every piece with a photo goes in one call: one per slot, a dress replaces top and bottom, extras (belts, hats, jewelry) all go. */
export function tryOnSteps(pieces: TryOnPiece[]): TryOnStep[] {
  const withPhoto = pieces.filter((p) => p.image_path);
  const hasDress = withPhoto.some((p) => slotOf(p) === "dress");
  const seen = new Set<string>();
  const steps: TryOnStep[] = [];
  for (const p of withPhoto) {
    const slot = slotOf(p);
    if (hasDress && (slot === "top" || slot === "bottom")) continue;
    if (slot !== "extra" && seen.has(slot)) continue;
    seen.add(slot);
    steps.push({ path: garment(p.image_path!), slot });
  }
  return steps.slice(0, MAX_PIECES);
}

/** The instruction for the image model; image 1 is the person, then the pieces in order. */
export const tryOnPrompt = (steps: TryOnStep[]) =>
  [
    "Virtual try-on. Image 1 is the person. Keep their face, hair, skin tone, body shape, pose, background and lighting exactly the same.",
    "Dress them in these pieces, replacing what they wear now:",
    ...steps.map((s, i) => `Image ${i + 2}: the ${LABEL[s.slot] ?? "piece"}.`),
    "Match each piece's exact color, pattern, fabric and details. Realistic fit, drape and folds, as if photographed wearing them. Add no other clothing, text or logos.",
  ].join(" ");

/** Same body photo and same pieces: same picture, so a repeat costs nothing. */
export const tryOnPath = (userId: string, bodyPath: string, steps: TryOnStep[]) =>
  `${userId}/tryon/${createHash("sha256").update([bodyPath, ...steps.map((s) => `${s.slot}:${s.path}`)].join("|")).digest("hex").slice(0, 32)}.png`;

export const DAILY_TRYONS = 10;
