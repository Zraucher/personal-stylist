"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveItem, setItemPhoto, type ItemInput } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/closet/compress";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { Button, Card, Chip, ChipButton, ChipGroup, Field, Input, Notice, Select, Thumb } from "@/components/ui";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONSTRUCTION,
  FORMALITY_LABELS,
  SEASONS,
  STATUSES,
  STATUS_LABELS,
  SUBCATEGORIES,
  WARMTH_LABELS,
  type Category,
  type ItemColor,
} from "@/lib/closet/taxonomy";

export type ItemFormValues = {
  name: string;
  category: Category;
  subcategory: string;
  colors: ItemColor[];
  pattern: string;
  material: string;
  construction: string[];
  formality: number | null;
  warmth: number | null;
  seasons: string[];
  brand: string;
  size: string;
  status: ItemInput["status"];
  tailoring_note: string;
};

export const EMPTY_VALUES: ItemFormValues = {
  name: "",
  category: "top",
  subcategory: "",
  colors: [],
  pattern: "",
  material: "",
  construction: [],
  formality: null,
  warmth: null,
  seasons: [],
  brand: "",
  size: "",
  status: "available",
  tailoring_note: "",
};

type TagResponse = {
  tags?: {
    name: string;
    category: Category;
    subcategory: string;
    colors: ItemColor[];
    pattern: string | null;
    material: string | null;
    construction: string[];
    formality: number;
    warmth: number;
    seasons: string[];
    notes: string;
  };
  error?: string;
};

/** Merge vision tags over current values. Never touches brand, size or status. */
export function applyTags(values: ItemFormValues, tags: NonNullable<TagResponse["tags"]>): ItemFormValues {
  return {
    ...values,
    name: tags.name || values.name,
    category: tags.category,
    subcategory: tags.subcategory ?? values.subcategory,
    colors: tags.colors.length ? tags.colors : values.colors,
    pattern: tags.pattern ?? "",
    material: tags.material ?? values.material,
    construction: tags.construction,
    formality: tags.formality,
    warmth: tags.warmth,
    seasons: tags.seasons,
  };
}

export async function requestTags(path: string): Promise<{ tags?: NonNullable<TagResponse["tags"]>; message: string | null }> {
  const res = await fetch("/api/tag", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  const body = (await res.json().catch(() => ({}))) as TagResponse;
  if (res.ok && body.tags) return { tags: body.tags, message: body.tags.notes || null };
  switch (body.error) {
    case "tagging_unavailable":
      return { message: "Auto-tagging is off until an Anthropic API key is added. Fill the fields in by hand." };
    case "rate_limited":
      return { message: "The tagger is busy. Try again in a minute, or fill the fields in by hand." };
    case "could_not_tag":
      return { message: "Could not read this photo. Try a clearer shot, or fill the fields in by hand." };
    default:
      return { message: "Auto-tagging failed. Fill the fields in by hand." };
  }
}

type Props = {
  initial: ItemFormValues;
  itemId?: string;
  imagePath: string | null;
  imageUrl: string | null;
  tagNote?: string | null;
};

export default function ItemForm({ initial, itemId, imagePath: initialPath, imageUrl: initialUrl, tagNote }: Props) {
  const router = useRouter();
  const [imagePath, setImagePath] = useState<string | null>(initialPath);
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [v, setV] = useState<ItemFormValues>(initial);
  const [note, setNote] = useState<string | null>(tagNote ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [retagging, setRetagging] = useState(false);

  const set = <K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) => setV((s) => ({ ...s, [key]: value }));
  const toggleIn = (key: "construction" | "seasons", value: string) =>
    setV((s) => {
      const has = s[key].includes(value);
      return { ...s, [key]: has ? s[key].filter((x) => x !== value) : [...s[key], value] };
    });

  const submit = () => {
    setError(null);
    const payload: ItemInput = {
      name: v.name,
      category: v.category,
      subcategory: v.subcategory || null,
      colors: v.colors.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), hex: c.hex || undefined })),
      pattern: v.pattern || null,
      material: v.material || null,
      construction: v.construction,
      formality: v.formality,
      warmth: v.warmth,
      seasons: v.seasons as ItemInput["seasons"],
      brand: v.brand || null,
      size: v.size || null,
      status: v.status,
      tailoring_note: v.tailoring_note || null,
      image_path: imagePath,
    };
    startTransition(async () => {
      const result = await saveItem(payload, itemId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/closet/${result.id}`);
      router.refresh();
    });
  };

  const retag = async () => {
    if (!imagePath) return;
    setRetagging(true);
    const { tags, message } = await requestTags(imagePath);
    if (tags) setV((s) => applyTags(s, tags));
    setNote(message);
    setRetagging(false);
  };

  // Add or replace the photo from a file picker, a drop, or a paste.
  const attachPhoto = async (file: File | undefined | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    setUploading(true);
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
      if (itemId) {
        // Saved item: attach right away so the photo is not lost if the page is closed.
        const r = await setItemPhoto(itemId, path);
        if ("error" in r) {
          await supabase.storage.from(CLOSET_BUCKET).remove([path]);
          throw new Error(r.error);
        }
      }
      setImagePath(path);
      setImageUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setNote("Photo added. Re-run auto tags if you want the fields read from it.");
      if (itemId) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Paste an image anywhere on the page. Text pastes into fields are left alone.
  const attachRef = useRef(attachPhoto);
  useEffect(() => {
    attachRef.current = attachPhoto;
  });
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (!file) return;
      e.preventDefault();
      void attachRef.current(file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
  const dropProps = {
    onDragEnter: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      void attachPhoto(e.dataTransfer.files[0]);
    },
  };

  const subs = SUBCATEGORIES[v.category] ?? [];

  return (
    <div className={"relative space-y-4 " + (dragging ? "rounded-card ring-2 ring-stone-900 ring-offset-8 ring-offset-ground" : "")} {...dropProps}>
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center rounded-card bg-stone-900/10 pt-10">
          <Chip tone="overlay" size="md">
            Drop to {imagePath ? "replace the" : "add a"} photo
          </Chip>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void attachPhoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Card className="flex gap-4">
        <div className="w-28 shrink-0 space-y-1.5 sm:w-32">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Click, drop an image, or paste one"
            aria-label={imageUrl ? "Replace photo" : "Add photo"}
            aria-busy={uploading || undefined}
            className="block w-full rounded-thumb transition-transform duration-200 ease-soft active:scale-[0.98] disabled:opacity-70"
          >
            <Thumb
              src={imageUrl}
              alt=""
              item={{ category: v.category, subcategory: v.subcategory, colors: v.colors }}
              size="fill"
              badge={
                <Chip tone="overlay" className="absolute bottom-2 left-1/2 -translate-x-1/2">
                  {uploading ? "Uploading…" : imageUrl ? "Replace" : "Add photo"}
                </Chip>
              }
            />
          </button>
          {!imageUrl && <p className="text-center text-xs text-stone-500">Drop, paste or click to add</p>}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Field label="Name">
            <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Olive linen camp-collar shirt" />
          </Field>
          {imagePath && (
            <Button type="button" variant="quiet" size="sm" className="-ml-3.5" onClick={retag} disabled={retagging} aria-busy={retagging || undefined}>
              {retagging ? "Reading photo…" : "Re-run auto tags"}
            </Button>
          )}
          {note && (
            <p role="status" aria-live="polite" className="text-xs text-stone-500">
              {note}
            </p>
          )}
        </div>
      </Card>

      <Section title="What it is">
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
          <Field label="Category">
            <Select value={v.category} onChange={(e) => set("category", e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type">
            <Input list="subcategories" value={v.subcategory} onChange={(e) => set("subcategory", e.target.value)} placeholder={subs[0] ?? ""} />
            <datalist id="subcategories">
              {subs.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Brand">
            <Input value={v.brand} onChange={(e) => set("brand", e.target.value)} />
          </Field>
          <Field label="Size">
            <Input value={v.size} onChange={(e) => set("size", e.target.value)} />
          </Field>
          <Field label="Material">
            <Input value={v.material} onChange={(e) => set("material", e.target.value)} placeholder="silk, linen, performance knit" />
          </Field>
          <Field label="Pattern">
            <Input value={v.pattern} onChange={(e) => set("pattern", e.target.value)} placeholder="solid, stripe, gingham" />
          </Field>
        </div>
      </Section>

      <Section title="Colors" hint="Dominant color first. The swatch is what the scorecard uses; the name is for you.">
        <div className="space-y-2">
          {v.colors.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={c.hex ?? "#888888"}
                onChange={(e) => set("colors", v.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))}
                className="size-11 shrink-0 cursor-pointer rounded-control border border-stone-400/70 bg-inset p-1"
                aria-label={`Swatch for color ${i + 1}`}
              />
              <Input
                value={c.name}
                onChange={(e) => set("colors", v.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                placeholder="olive"
                aria-label={`Name of color ${i + 1}`}
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={() => set("colors", v.colors.filter((_, j) => j !== i))}
                className="tap inline-flex size-9 shrink-0 items-center justify-center rounded-full text-lg text-stone-500 transition-colors duration-200 ease-soft hover:bg-stone-900/[0.06] hover:text-stone-900"
                aria-label={`Remove color ${c.name || i + 1}`}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}
          {v.colors.length < 6 && (
            <Button type="button" variant="quiet" size="sm" className="-ml-3.5" onClick={() => set("colors", [...v.colors, { name: "", hex: "#888888" }])}>
              <span aria-hidden="true">+</span> Add color
            </Button>
          )}
        </div>
      </Section>

      <Section title="Construction" hint="Visible details. These are what your dislikes list checks against.">
        <ChipGroup label="Construction details">
          {CONSTRUCTION.map((c) => (
            <ChipButton key={c} selected={v.construction.includes(c)} onClick={() => toggleIn("construction", c)}>
              {c}
            </ChipButton>
          ))}
        </ChipGroup>
      </Section>

      <Section title="When to wear it">
        <div className="space-y-4">
          <Scale label="Formality" value={v.formality} labels={FORMALITY_LABELS} onChange={(n) => set("formality", n)} />
          <Scale label="Warmth" value={v.warmth} labels={WARMTH_LABELS} onChange={(n) => set("warmth", n)} />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-stone-700">Seasons</p>
            <ChipGroup label="Seasons">
              {SEASONS.map((s) => (
                <ChipButton key={s} selected={v.seasons.includes(s)} onClick={() => toggleIn("seasons", s)}>
                  {s}
                </ChipButton>
              ))}
            </ChipGroup>
          </div>
        </div>
      </Section>

      <Section title="Status">
        <ChipGroup label="Status">
          {STATUSES.map((s) => (
            <ChipButton key={s} selected={v.status === s} onClick={() => set("status", s)}>
              {STATUS_LABELS[s]}
            </ChipButton>
          ))}
        </ChipGroup>
        {v.status === "tailoring" && (
          <Field label="What needs doing" srOnly className="mt-3">
            <Input value={v.tailoring_note} onChange={(e) => set("tailoring_note", e.target.value)} placeholder="What needs doing" />
          </Field>
        )}
      </Section>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="sticky bottom-0 z-10 -mx-4 bg-ground/90 px-4 py-3 shadow-[0_-1px_0_var(--color-line)] backdrop-blur">
        <Button type="button" variant={itemId ? "secondary" : "primary"} block onClick={submit} disabled={pending} aria-busy={pending || undefined}>
          {pending ? "Saving…" : itemId ? "Save changes" : "Add to closet"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card as="section" className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold leading-snug">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
      </div>
      <div>{children}</div>
    </Card>
  );
}

function Scale({
  label,
  value,
  labels,
  onChange,
}: {
  label: string;
  value: number | null;
  labels: Record<number, string>;
  onChange: (n: number | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-stone-700">{label}</span>
        <span className="text-xs text-stone-500">{value ? labels[value] : "Not set"}</span>
      </div>
      <div role="group" aria-label={label} className="grid grid-cols-5 gap-1 rounded-control bg-inset p-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            aria-pressed={value === n}
            className={
              "tap min-h-9 rounded-[10px] text-sm font-medium tabular-nums transition-colors duration-200 ease-soft " +
              (value === n ? "bg-stone-900 text-stone-50" : "text-stone-700 hover:bg-card")
            }
            aria-label={labels[n]}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
