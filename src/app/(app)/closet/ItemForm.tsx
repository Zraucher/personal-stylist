"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveItem, type ItemInput } from "./actions";
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

export default function ItemForm({ initial, itemId, imagePath, imageUrl, tagNote }: Props) {
  const router = useRouter();
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

  const subs = SUBCATEGORIES[v.category] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="h-36 w-36 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-stone-400">No photo</div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <label className="block text-sm">
            <span className="text-stone-500">Name</span>
            <input
              value={v.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Olive linen camp-collar shirt"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-900"
            />
          </label>
          {imagePath && (
            <button
              type="button"
              onClick={retag}
              disabled={retagging}
              className="text-sm text-stone-600 underline-offset-2 hover:underline disabled:opacity-60"
            >
              {retagging ? "Reading photo…" : "Re-run auto tags"}
            </button>
          )}
          {note && <p className="text-xs text-stone-500">{note}</p>}
        </div>
      </div>

      <Section title="What it is">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-stone-500">Category</span>
            <select
              value={v.category}
              onChange={(e) => set("category", e.target.value as Category)}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-stone-500">Type</span>
            <input
              list="subcategories"
              value={v.subcategory}
              onChange={(e) => set("subcategory", e.target.value)}
              placeholder={subs[0] ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base"
            />
            <datalist id="subcategories">
              {subs.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm">
            <span className="text-stone-500">Brand</span>
            <input value={v.brand} onChange={(e) => set("brand", e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base" />
          </label>
          <label className="block text-sm">
            <span className="text-stone-500">Size</span>
            <input value={v.size} onChange={(e) => set("size", e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base" />
          </label>
          <label className="block text-sm">
            <span className="text-stone-500">Material</span>
            <input value={v.material} onChange={(e) => set("material", e.target.value)} placeholder="silk, linen, performance knit" className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base" />
          </label>
          <label className="block text-sm">
            <span className="text-stone-500">Pattern</span>
            <input value={v.pattern} onChange={(e) => set("pattern", e.target.value)} placeholder="solid, stripe, gingham" className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base" />
          </label>
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
                className="h-9 w-9 cursor-pointer rounded border border-stone-300 bg-white p-0.5"
                aria-label="Swatch"
              />
              <input
                value={c.name}
                onChange={(e) => set("colors", v.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                placeholder="olive"
                className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-base"
              />
              <button type="button" onClick={() => set("colors", v.colors.filter((_, j) => j !== i))} className="px-2 text-stone-500 hover:text-stone-900" aria-label="Remove color">
                ×
              </button>
            </div>
          ))}
          {v.colors.length < 6 && (
            <button type="button" onClick={() => set("colors", [...v.colors, { name: "", hex: "#888888" }])} className="text-sm text-stone-600 underline-offset-2 hover:underline">
              + Add color
            </button>
          )}
        </div>
      </Section>

      <Section title="Construction" hint="Visible details. These are what your dislikes list checks against.">
        <div className="flex flex-wrap gap-2">
          {CONSTRUCTION.map((c) => (
            <Chip key={c} active={v.construction.includes(c)} onClick={() => toggleIn("construction", c)}>
              {c}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="When to wear it">
        <div className="space-y-3">
          <Scale label="Formality" value={v.formality} labels={FORMALITY_LABELS} onChange={(n) => set("formality", n)} />
          <Scale label="Warmth" value={v.warmth} labels={WARMTH_LABELS} onChange={(n) => set("warmth", n)} />
          <div>
            <span className="text-sm text-stone-500">Seasons</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {SEASONS.map((s) => (
                <Chip key={s} active={v.seasons.includes(s)} onClick={() => toggleIn("seasons", s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Status">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Chip key={s} active={v.status === s} onClick={() => set("status", s)}>
              {STATUS_LABELS[s]}
            </Chip>
          ))}
        </div>
        {v.status === "tailoring" && (
          <input
            value={v.tailoring_note}
            onChange={(e) => set("tailoring_note", e.target.value)}
            placeholder="What needs doing"
            className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base"
          />
        )}
      </Section>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="sticky bottom-0 -mx-4 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="w-full rounded-lg bg-stone-900 px-3 py-2.5 text-base font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : itemId ? "Save changes" : "Add to closet"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-medium text-stone-500">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-stone-400">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-sm transition " +
        (active ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500")
      }
    >
      {children}
    </button>
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
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-stone-500">{label}</span>
        <span className="text-xs text-stone-400">{value ? labels[value] : "Not set"}</span>
      </div>
      <div className="mt-1 grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={
              "rounded-lg border py-2 text-sm " +
              (value === n ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500")
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
