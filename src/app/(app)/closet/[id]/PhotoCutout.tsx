"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { CUTOUT, cutout } from "@/lib/closet/cutout";
import { Button, Notice } from "@/components/ui";
import { applyCutout, restorePhoto } from "../actions";

const MAX_EDGE = 1200;
const NO_BACKGROUND = "We couldn't find a plain background to take out. A photo on a bed, floor or plain wall works best.";

/** Runs in the browser: the photo never leaves the person's device except as the finished cut-out. */
async function makeCutout(url: string): Promise<{ blob: Blob; ext: string }> {
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

export default function PhotoCutout({ id, path, url }: { id: string; path: string; url: string }) {
  const [state, setState] = useState<{ status: "idle" | "working" } | { status: "preview"; path: string; src: string }>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const isCutout = CUTOUT.test(path);

  const start = async () => {
    setError(null);
    setState({ status: "working" });
    try {
      const { blob, ext } = await makeCutout(url);
      const next = `${path}.cutout.${ext}`;
      const { error: upErr } = await createClient().storage.from(CLOSET_BUCKET).upload(next, blob, { contentType: blob.type, upsert: true });
      if (upErr) throw new Error("Couldn't save the cut-out. Check your connection and try again.");
      setState({ status: "preview", path: next, src: URL.createObjectURL(blob) });
    } catch (e) {
      setError(e instanceof Error && e.message === NO_BACKGROUND ? NO_BACKGROUND : "Couldn't take out the background. Try again.");
      setState({ status: "idle" });
    }
  };

  const save = (run: () => Promise<{ ok: true } | { error: string }>) =>
    startSaving(async () => {
      const res = await run();
      if ("error" in res) setError(res.error);
      else setState({ status: "idle" });
    });

  const discard = () => {
    if (state.status !== "preview") return;
    void createClient().storage.from(CLOSET_BUCKET).remove([state.path]);
    setState({ status: "idle" });
  };

  return (
    <div className="mt-2 space-y-2" aria-live="polite">
      {state.status === "preview" && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview */}
          <img src={state.src} alt="The piece with its background taken out" className="mx-auto aspect-[4/5] w-full rounded-card bg-[#f1ebe1] object-contain p-4 ring-1 ring-line" />
          <div className="flex justify-center gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => save(() => applyCutout(id, state.path))}>
              {saving ? "Saving…" : "Use this"}
            </Button>
            <Button type="button" size="sm" variant="quiet" disabled={saving} onClick={discard}>
              Keep the original
            </Button>
          </div>
        </div>
      )}
      {state.status !== "preview" && (
        <div className="flex justify-center">
          {isCutout ? (
            <Button type="button" size="sm" variant="quiet" disabled={saving} onClick={() => save(() => restorePhoto(id))}>
              {saving ? "Saving…" : "Put the background back"}
            </Button>
          ) : (
            <Button type="button" size="sm" variant="quiet" disabled={state.status === "working"} onClick={start}>
              {state.status === "working" ? "Taking out the background…" : "Remove the background"}
            </Button>
          )}
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
