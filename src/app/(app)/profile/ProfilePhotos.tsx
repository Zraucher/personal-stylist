"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/closet/compress";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { PHOTO_GROUPS } from "@/lib/profile/photo-slots";
import { removePhotoSlot, savePhotoSlot } from "./actions";
import { Card, Chip, ConfirmButton, Notice, SectionTitle } from "@/components/ui";

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
    <Card as="section" className="space-y-3">
      <SectionTitle>Photos of you</SectionTitle>
      <p className="text-sm leading-relaxed text-stone-600">
        Add photos from different angles and crops. We will use them later for outfit mock-ups. Plain background and fitted clothes
        work best. They are private to your account, nothing is analyzed yet, and you can remove any photo here at any time.
      </p>
      <p className="text-xs text-stone-500">Tap a tile to choose a photo, drop a file on it, or select it and paste with Ctrl+V.</p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          if (pickFor.current) void upload(pickFor.current, e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="space-y-5 pt-1">
        {PHOTO_GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="mb-2 text-sm font-semibold">{g.title}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {g.slots.map((s) => {
                const url = src(s.id);
                const isActive = active === s.id;
                return (
                  <div key={s.id} className="space-y-1.5">
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
                        "relative aspect-[3/4] overflow-hidden rounded-thumb bg-inset transition-shadow duration-200 ease-soft " +
                        (over === s.id ? "ring-2 ring-stone-900" : isActive ? "ring-[1.5px] ring-stone-900" : "ring-1 ring-inset ring-line")
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
                        aria-busy={busy === s.id || undefined}
                        aria-label={url ? `Replace ${g.title} ${s.label} photo` : `Add ${g.title} ${s.label} photo`}
                        title={s.hint}
                        className="block h-full w-full rounded-thumb"
                      >
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt={`${g.title} ${s.label}`} className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full flex-col items-center justify-center gap-1.5 px-2 text-center text-xs font-medium text-stone-500">
                            {busy !== s.id && (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                            )}
                            {busy === s.id ? "Uploading…" : "Add photo"}
                          </span>
                        )}
                        {busy === s.id && url && (
                          <span className="absolute inset-x-0 bottom-2 flex justify-center">
                            <Chip tone="overlay">Uploading…</Chip>
                          </span>
                        )}
                      </button>
                      {url && busy !== s.id && (
                        <ConfirmButton
                          title="Remove this photo?"
                          body="It is deleted from storage."
                          confirmLabel="Remove"
                          onConfirm={() => void remove(s.id)}
                          variant="quiet"
                          className="absolute right-1.5 top-1.5 size-8 bg-ink/75! px-0! text-base! text-[#fbf7f2]! backdrop-blur-sm hover:bg-ink/90!"
                        >
                          <span aria-hidden="true">×</span>
                          <span className="sr-only">Remove {s.label}</span>
                        </ConfirmButton>
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
      {error && <Notice tone="error">{error}</Notice>}
    </Card>
  );
}
