"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/closet/compress";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { PHOTO_GROUPS } from "@/lib/profile/photo-slots";
import { removePhotoSlot, savePhotoSlot } from "./actions";

type Props = { urls: Record<string, string> };

export default function ProfilePhotos({ urls }: Props) {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const pickFor = useRef<string | null>(null);

  const upload = async (slot: string, file: File | undefined | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    setBusy(slot);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Signed out. Reload and sign in again.");
      const { blob, type } = await compressImage(file);
      const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/profile/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(CLOSET_BUCKET).upload(path, blob, { contentType: type, upsert: false });
      if (upErr) throw new Error(upErr.message);
      const r = await savePhotoSlot(slot, path);
      if (!r.ok) {
        await supabase.storage.from(CLOSET_BUCKET).remove([path]);
        throw new Error(r.error);
      }
      setLocal((s) => {
        if (s[slot]?.startsWith("blob:")) URL.revokeObjectURL(s[slot]);
        return { ...s, [slot]: URL.createObjectURL(blob) };
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (slot: string) => {
    if (!confirm("Remove this photo? It is deleted from storage.")) return;
    setBusy(slot);
    const r = await removePhotoSlot(slot);
    setBusy(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setLocal((s) => {
      const copy = { ...s };
      delete copy[slot];
      return copy;
    });
    router.refresh();
  };

  // Paste an image to put it in the highlighted slot.
  const uploadRef = useRef(upload);
  useEffect(() => {
    uploadRef.current = upload;
  });
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!active) return;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (!file) return;
      e.preventDefault();
      void uploadRef.current(active, file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [active]);

  const src = (slot: string) => local[slot] ?? urls[slot];

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-medium text-stone-500">Photos of you</h2>
      <p className="mt-1 text-sm text-stone-600">
        Add photos from different angles and crops. We will use them later for outfit mock-ups. Plain background and fitted clothes
        work best. They are private to your account, nothing is analyzed yet, and you can remove any photo here at any time.
      </p>
      <p className="mt-1 text-xs text-stone-400">Tap a tile to choose a photo, drop a file on it, or select it and paste with Ctrl+V.</p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (pickFor.current) void upload(pickFor.current, e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="mt-4 space-y-5">
        {PHOTO_GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="mb-2 text-sm font-medium">{g.title}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {g.slots.map((s) => {
                const url = src(s.id);
                const isActive = active === s.id;
                return (
                  <div key={s.id} className="space-y-1">
                    <div
                      onDragOver={(e) => {
                        if (Array.from(e.dataTransfer.types).includes("Files")) {
                          e.preventDefault();
                          setOver(s.id);
                        }
                      }}
                      onDragLeave={() => setOver((o) => (o === s.id ? null : o))}
                      onDrop={(e) => {
                        e.preventDefault();
                        setOver(null);
                        setActive(s.id);
                        void upload(s.id, e.dataTransfer.files[0]);
                      }}
                      className={
                        "relative aspect-[3/4] overflow-hidden rounded-lg border bg-stone-50 " +
                        (over === s.id ? "border-stone-900 ring-2 ring-stone-900 " : isActive ? "border-stone-900 " : "border-dashed border-stone-300 ")
                      }
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActive(s.id);
                          pickFor.current = s.id;
                          fileRef.current?.click();
                        }}
                        disabled={busy === s.id}
                        title={s.hint}
                        className="block h-full w-full"
                      >
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt={`${g.title} ${s.label}`} className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full items-center justify-center px-2 text-center text-xs text-stone-400">
                            {busy === s.id ? "Uploading…" : "Add photo"}
                          </span>
                        )}
                        {busy === s.id && url && (
                          <span className="absolute inset-x-0 bottom-0 bg-stone-900/70 py-1 text-center text-[11px] text-white">Uploading…</span>
                        )}
                      </button>
                      {url && busy !== s.id && (
                        <button
                          type="button"
                          onClick={() => remove(s.id)}
                          className="absolute right-1 top-1 rounded-full bg-stone-900/70 px-2 py-0.5 text-xs text-white hover:bg-stone-900"
                          aria-label={`Remove ${s.label}`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-stone-600">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
