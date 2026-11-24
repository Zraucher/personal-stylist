// Pure: which pieces of an outfit go through try-on, in what order, and where the result is cached.
import { createHash } from "node:crypto";
import { slotOf } from "../outfit/mockup.ts";
import { originalOf } from "../closet/cutout.ts";

export type TryOnPiece = { id: string; image_path: string | null; category: string | null; subcategory: string | null };
export type TryOnStep = { path: string; category: "tops" | "bottoms" | "one-pieces" };

// The original photo, not our cut-out: FASHN reads the garment better with its real background and full frame (tested 2026-11-23).
const garment = (path: string) => originalOf(path) ?? path;

/** Dress or bottom first, then the top, then the jacket over it. Shoes, bags and extras aren't covered by the model. */
export function tryOnSteps(pieces: TryOnPiece[]): TryOnStep[] {
  const first = (slot: string) => pieces.find((p) => p.image_path && slotOf(p) === slot);
  const dress = first("dress");
  const steps: Array<TryOnStep | null> = dress
    ? [{ path: garment(dress.image_path!), category: "one-pieces" }]
    : [first("bottom"), first("top")].map((p, i) => (p ? { path: garment(p.image_path!), category: i === 0 ? "bottoms" : "tops" } : null));
  const outer = first("outer");
  steps.push(outer ? { path: garment(outer.image_path!), category: "tops" } : null);
  return steps.filter((s): s is TryOnStep => s !== null);
}

/** Same body photo and same pieces: same picture, so a repeat costs nothing. */
export const tryOnPath = (userId: string, bodyPath: string, steps: TryOnStep[]) =>
  `${userId}/tryon/${createHash("sha256").update([bodyPath, ...steps.map((s) => `${s.category}:${s.path}`)].join("|")).digest("hex").slice(0, 32)}.png`;

export const DAILY_TRYONS = 10;
