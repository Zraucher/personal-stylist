"use client";

import { useState } from "react";
import ItemPlaceholder from "@/lib/closet/placeholder";
import { layout, type Box, type MockupMode } from "@/lib/outfit/mockup";
import { Button } from "./Button";
import { Segmented } from "./Segmented";
import { cx } from "./cx";
import type { StripItem } from "./Outfit";

const BG: Record<MockupMode, string> = { flatlay: "#f1ebe1", ghost: "#ffffff" };

const load = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/**
 * The same picture as a 1080x1350 PNG, for sharing or saving.
 * shortcut: photos whose host refuses cross-origin reads (some store images) and pieces with no photo are left out; a server-side render is the upgrade.
 */
async function renderPng(items: StripItem[], boxes: Array<Box | null>, mode: MockupMode): Promise<Blob | null> {
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = BG[mode];
  ctx.fillRect(0, 0, W, H);
  const imgs = await Promise.all(items.map((it) => (it.url ? load(it.url) : null)));
  const order = items.map((_, i) => i).filter((i) => boxes[i] && imgs[i]).sort((a, b) => boxes[a]!.z - boxes[b]!.z);
  ctx.globalCompositeOperation = "multiply";
  for (const i of order) {
    const b = boxes[i]!, img = imgs[i]!;
    const bw = (b.w / 100) * W, bh = (b.h / 100) * H;
    const s = Math.min(bw / img.naturalWidth, bh / img.naturalHeight); // object-contain
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    ctx.save();
    ctx.translate((b.x / 100) * W + bw / 2, (b.y / 100) * H + bh / 2);
    ctx.rotate((b.rotate * Math.PI) / 180);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }
  return new Promise((r) => canvas.toBlob(r, "image/png"));
}

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
);
const SaveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </svg>
);

/**
 * The whole look as one picture: a flat lay on a board, or a ghost model (pieces stacked as if worn).
 * shortcut: store photos on white blend into the canvas; a person's own photos keep their background. Cut-outs need a background-removal step.
 */
export function OutfitMockup({ items, className }: { items: StripItem[]; className?: string }) {
  const [mode, setMode] = useState<MockupMode>("flatlay");
  const boxes = layout(items, mode);
  const left = boxes.filter((b) => !b).length;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const out = async (how: "share" | "save") => {
    setBusy(true);
    setNote(null);
    try {
      const blob = await renderPng(items, boxes, mode);
      if (!blob) throw new Error("render");
      const file = new File([blob], "valette-outfit.png", { type: "image/png" });
      if (how === "share" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My outfit" }).catch((e: unknown) => {
          if (!(e instanceof DOMException && e.name === "AbortError")) throw e;
        });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
        if (how === "share") setNote("This browser can't share pictures, so we saved it instead.");
      }
    } catch {
      setNote("Couldn't make the picture. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cx("space-y-2", className)}>
      <Segmented
        label="Mockup"
        value={mode}
        onChange={setMode}
        options={[
          { value: "flatlay", label: "Flat lay" },
          { value: "ghost", label: "Ghost model" },
        ]}
      />
      <div
        role="img"
        aria-label={`${mode === "ghost" ? "Ghost model" : "Flat lay"} of ${items.map((i) => i.name).join(", ")}`}
        className={cx("relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-card ring-1 ring-line", mode === "ghost" ? "bg-[#ffffff]" : "bg-[#f1ebe1]")}
      >
        {items.map((it, i) => {
          const b = boxes[i];
          if (!b) return null;
          return (
            <div
              key={it.id + i}
              aria-hidden="true"
              className="absolute transition-all duration-300 ease-soft motion-reduce:transition-none"
              style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`, zIndex: b.z, transform: `rotate(${b.rotate}deg)` }}
            >
              {it.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.url}
                  alt=""
                  referrerPolicy={it.product ? "no-referrer" : undefined}
                  className="h-full w-full object-contain mix-blend-multiply"
                />
              ) : (
                // No photo: the silhouette alone, sized to its spot, without the thumbnail's background.
                <div className="h-full w-full [&>div]:bg-transparent [&_svg]:h-full [&_svg]:w-full">
                  <ItemPlaceholder category={it.category} subcategory={it.subcategory} colors={it.colors} label="" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-2">
        <Button type="button" size="sm" variant="quiet" disabled={busy} onClick={() => out("share")} aria-label="Share this picture" title="Share">
          <ShareIcon />
        </Button>
        <Button type="button" size="sm" variant="quiet" disabled={busy} onClick={() => out("save")} aria-label="Save this picture" title="Save image">
          <SaveIcon />
        </Button>
      </div>
      <p role="status" aria-live="polite" className="text-center text-xs text-stone-600 empty:hidden">
        {note}
      </p>
      {left > 0 && <p className="text-center text-xs text-stone-500">{left === 1 ? "One more piece" : `${left} more pieces`} didn&apos;t fit in the picture.</p>}
    </div>
  );
}

/** Collapsed by default: the strip stays the quick view, the picture opens on demand. */
export function OutfitPicture({ items, className }: { items: StripItem[]; className?: string }) {
  return (
    <details className={cx("group", className)}>
      <summary className="tap flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-stone-900 [&::-webkit-details-marker]:hidden">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 transition-transform duration-200 ease-soft group-open:rotate-90">
          <path d="m9 6 6 6-6 6" />
        </svg>
        See it as one picture
      </summary>
      <OutfitMockup items={items} className="pt-3" />
    </details>
  );
}
