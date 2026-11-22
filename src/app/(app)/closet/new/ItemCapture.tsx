"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/closet/compress";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { Button, Card, Chip, Notice, Thumb } from "@/components/ui";
import ItemForm, { EMPTY_VALUES, applyTags, requestTags, type ItemFormValues } from "../ItemForm";

type Phase = "pick" | "uploading" | "tagging" | "form";

// A mouse or trackpad means no camera to open: show one "Choose a photo" button instead of two that do the same thing.
const FINE = "(pointer: fine)";
const subscribeFine = (cb: () => void) => {
  const m = window.matchMedia(FINE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

export default function ItemCapture() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState<ItemFormValues>(EMPTY_VALUES);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const finePointer = useSyncExternalStore(subscribeFine, () => window.matchMedia(FINE).matches, () => false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPhase("uploading");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You're signed out. Sign in again to save this.");

      const { blob, type } = await compressImage(file);
      const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(CLOSET_BUCKET).upload(path, blob, { contentType: type, upsert: false });
      if (upErr) throw new Error("Couldn't upload that photo. Check your connection and try again.");

      setImagePath(path);
      setPreviewUrl(URL.createObjectURL(blob));
      setPhase("tagging");

      const { tags, message } = await requestTags(path);
      setInitial(tags ? applyTags(EMPTY_VALUES, tags) : EMPTY_VALUES);
      setNote(message);
      setPhase("form");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't upload that photo. Try again.");
      setPhase("pick");
    }
  };

  if (phase === "form") {
    return <ItemForm initial={initial} imagePath={imagePath} imageUrl={previewUrl} tagNote={note} />;
  }

  const busy = phase !== "pick";
  const busyLabel = phase === "uploading" ? "Uploading…" : phase === "tagging" ? "Reading photo…" : null;

  return (
    <div className="space-y-4">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" tabIndex={-1} aria-hidden="true" onChange={(e) => handleFile(e.target.files?.[0])} />
      <input ref={libraryRef} type="file" accept="image/*" className="hidden" tabIndex={-1} aria-hidden="true" onChange={(e) => handleFile(e.target.files?.[0])} />

      <Card pad="lg" className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold leading-snug">Start with a photo</h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">
            Lay it flat or hang it against a plain wall in daylight. One piece per photo. We&rsquo;ll read the color, construction and
            formality. You fix anything we get wrong.
          </p>
        </div>
        {finePointer ? (
          <Button type="button" variant="primary" block disabled={busy} aria-busy={busy || undefined} onClick={() => libraryRef.current?.click()}>
            {busyLabel ?? "Choose a photo"}
          </Button>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="primary" block disabled={busy} aria-busy={busy || undefined} onClick={() => cameraRef.current?.click()}>
              {busyLabel ?? "Take a photo"}
            </Button>
            <Button type="button" variant="secondary" block disabled={busy} onClick={() => libraryRef.current?.click()}>
              Choose from library
            </Button>
          </div>
        )}
        <Button
          type="button"
          variant="quiet"
          size="sm"
          className="-ml-3.5"
          disabled={busy}
          onClick={() => {
            setImagePath(null);
            setPreviewUrl(null);
            setInitial(EMPTY_VALUES);
            setPhase("form");
          }}
        >
          Fill in the details yourself
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </Card>

      {phase === "tagging" && previewUrl && (
        <div className="mx-auto w-full max-w-[240px]">
          <Thumb
            src={previewUrl}
            alt="Your photo"
            size="fill"
            badge={
              <Chip tone="overlay" className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                Reading photo…
              </Chip>
            }
          />
          <p role="status" aria-live="polite" className="mt-2 text-center text-sm text-stone-500">
            We&rsquo;re reading the photo. Ten seconds or so.
          </p>
        </div>
      )}
    </div>
  );
}
