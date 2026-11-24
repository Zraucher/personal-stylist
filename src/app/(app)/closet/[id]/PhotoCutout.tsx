"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { CUTOUT } from "@/lib/closet/cutout";
import { NO_BACKGROUND, makeCutout } from "@/lib/closet/make-cutout";
import { Button, Notice } from "@/components/ui";
import { applyCutout, restorePhoto } from "../actions";

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
