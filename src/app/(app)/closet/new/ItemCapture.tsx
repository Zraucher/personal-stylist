"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/closet/compress";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import ItemForm, { EMPTY_VALUES, applyTags, requestTags, type ItemFormValues } from "../ItemForm";

type Phase = "pick" | "uploading" | "tagging" | "form";

export default function ItemCapture() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState<ItemFormValues>(EMPTY_VALUES);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPhase("uploading");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Signed out. Reload and sign in again.");

      const { blob, type } = await compressImage(file);
      const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(CLOSET_BUCKET).upload(path, blob, { contentType: type, upsert: false });
      if (upErr) throw new Error(upErr.message);

      setImagePath(path);
      setPreviewUrl(URL.createObjectURL(blob));
      setPhase("tagging");

      const { tags, message } = await requestTags(path);
      setInitial(tags ? applyTags(EMPTY_VALUES, tags) : EMPTY_VALUES);
      setNote(message);
      setPhase("form");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setPhase("pick");
    }
  };

  if (phase === "form") {
    return <ItemForm initial={initial} imagePath={imagePath} imageUrl={previewUrl} tagNote={note} />;
  }

  const busy = phase !== "pick";

  return (
    <div className="space-y-4">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <input ref={libraryRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <p className="font-medium">Add a piece</p>
        <p className="mt-1 text-sm text-stone-600">
          Lay it flat or hang it against a plain wall in daylight. One garment per photo. The tagger reads color, construction and
          formality; you correct anything it gets wrong.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
            className="rounded-lg bg-stone-900 px-3 py-3 text-base font-medium text-white disabled:opacity-60"
          >
            {phase === "uploading" ? "Uploading…" : phase === "tagging" ? "Reading photo…" : "Take a photo"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => libraryRef.current?.click()}
            className="rounded-lg border border-stone-300 bg-white px-3 py-3 text-base font-medium text-stone-900 disabled:opacity-60"
          >
            Choose from library
          </button>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setImagePath(null);
            setPreviewUrl(null);
            setInitial(EMPTY_VALUES);
            setPhase("form");
          }}
          className="mt-3 text-sm text-stone-600 underline-offset-2 hover:underline disabled:opacity-60"
        >
          Enter without a photo
        </button>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      {phase === "tagging" && (
        <p className="text-center text-sm text-stone-500">Claude is looking at the photo. Ten seconds or so.</p>
      )}
    </div>
  );
}
