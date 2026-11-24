// Browser only: canvas work for the closet cut-out. The pure pixel step is ./cutout.
import { cutout } from "./cutout";

const MAX_EDGE = 1200;
export const NO_BACKGROUND = "We couldn't find a plain background to take out. A photo on a bed, floor or plain wall works best.";

/** Runs in the browser: the photo never leaves the person's device except as the finished cut-out. */
export async function makeCutout(url: string): Promise<{ blob: Blob; ext: string }> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const full = document.createElement("canvas");
  full.width = w;
  full.height = h;
  const ctx = full.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const { removed, box } = cutout(data.data, w, h);
  if (!box || removed < 0.03 || removed > 0.97) throw new Error(NO_BACKGROUND);
  ctx.putImageData(data, 0, 0);

  // Crop to the garment with a little air, so it fills its spot in an outfit picture.
  const pad = Math.round(Math.max(box.w, box.h) * 0.04);
  const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
  const cw = Math.min(w, box.x + box.w + pad) - x, ch = Math.min(h, box.y + box.h + pad) - y;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")?.drawImage(full, x, y, cw, ch, 0, 0, cw, ch);
  const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/webp", 0.9));
  if (!blob) throw new Error("toBlob failed");
  // Safari can't encode WebP and hands back a PNG instead; both keep the transparency.
  return { blob, ext: blob.type === "image/webp" ? "webp" : "png" };
}
