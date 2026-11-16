"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { addBrand, deleteBrand, saveAccount, saveColor, saveMeasurements, saveStyle } from "./actions";

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------
const input = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-900";

function Card({
  title,
  editing,
  onEdit,
  onCancel,
  onSave,
  pending,
  error,
  view,
  children,
}: {
  title: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
  error: string | null;
  view: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-500">{title}</h2>
        {!editing && (
          <button type="button" onClick={onEdit} className="text-sm text-stone-600 underline-offset-2 hover:underline">
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-3 space-y-3">
          {children}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-3 text-sm">
            <button type="button" onClick={onSave} disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-60">
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={onCancel} disabled={pending} className="text-stone-500 underline">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2">{view}</div>
      )}
    </section>
  );
}

function useEditor<T>(initial: T, save: (v: T) => Promise<{ ok: true } | { ok: false; error: string }>) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return {
    editing,
    v,
    setV,
    error,
    pending,
    edit: () => {
      setV(initial);
      setError(null);
      setEditing(true);
    },
    cancel: () => setEditing(false),
    save: () =>
      startTransition(async () => {
        setError(null);
        const r = await save(v);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setEditing(false);
        router.refresh();
      }),
  };
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-stone-500">{label}</dt>
      <dd>{children ?? <Empty />}</dd>
    </>
  );
}
function Empty() {
  return <span className="text-stone-400">—</span>;
}
const Dl = ({ children }: { children: ReactNode }) => <dl className="grid grid-cols-[9rem_1fr] gap-y-1 text-sm">{children}</dl>;
const list = (xs: string[]) => (xs.length ? xs.join(", ") : null);

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim().replace(/,$/, "");
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="mt-1 rounded-lg border border-stone-300 bg-white p-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-sm">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="text-stone-400 hover:text-stone-900" aria-label={`Remove ${t}`}>
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={add}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-base outline-none"
        />
      </div>
    </div>
  );
}

type Fabric = { name: string; strength: "soft" | "hard" };
function FabricInput({ value, onChange, placeholder }: { value: Fabric[]; onChange: (v: Fabric[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim().replace(/,$/, "");
    if (t && !value.some((f) => f.name === t)) onChange([...value, { name: t, strength: "soft" }]);
    setDraft("");
  };
  return (
    <div className="mt-1 rounded-lg border border-stone-300 bg-white p-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((f) => (
          <span key={f.name} className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-sm">
            {f.name}
            <button
              type="button"
              onClick={() => onChange(value.map((x) => (x.name === f.name ? { ...x, strength: x.strength === "soft" ? "hard" : "soft" } : x)))}
              className={"rounded px-1 text-[11px] " + (f.strength === "hard" ? "bg-stone-900 text-white" : "bg-white text-stone-500")}
              title="Tap to switch between soft (a preference) and hard (a rule)"
            >
              {f.strength}
            </button>
            <button type="button" onClick={() => onChange(value.filter((x) => x.name !== f.name))} className="text-stone-400 hover:text-stone-900" aria-label={`Remove ${f.name}`}>
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-base outline-none"
        />
      </div>
    </div>
  );
}

const fabricText = (fs: Fabric[]) => (fs.length ? fs.map((f) => (f.strength === "hard" ? `${f.name} (hard rule)` : f.name)).join(", ") : null);

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------
export type AccountData = { name: string; email: string; location: string; presentation: "womens" | "mens" | "both" };

export function AccountCard({ data }: { data: AccountData }) {
  const e = useEditor({ name: data.name, location: data.location, presentation: data.presentation }, (v) => saveAccount(v));
  return (
    <Card
      title="Account"
      editing={e.editing}
      onEdit={e.edit}
      onCancel={e.cancel}
      onSave={e.save}
      pending={e.pending}
      error={e.error}
      view={
        <Dl>
          <Row label="Name">{data.name || null}</Row>
          <Row label="Email">{data.email}</Row>
          <Row label="Location">{data.location || null}</Row>
          <Row label="Outfits for">{{ womens: "Women's", mens: "Men's", both: "Both" }[data.presentation]}</Row>
        </Dl>
      }
    >
      <label className="block text-sm">
        <span className="text-stone-500">Name</span>
        <input value={e.v.name} onChange={(ev) => e.setV({ ...e.v, name: ev.target.value })} className={input} />
      </label>
      <label className="block text-sm">
        <span className="text-stone-500">Location (city, used for weather)</span>
        <input value={e.v.location} onChange={(ev) => e.setV({ ...e.v, location: ev.target.value })} placeholder="Las Vegas, NV" className={input} />
      </label>
      <label className="block text-sm">
        <span className="text-stone-500">Outfits for</span>
        <select value={e.v.presentation} onChange={(ev) => e.setV({ ...e.v, presentation: ev.target.value as AccountData["presentation"] })} className={input}>
          <option value="mens">Men&apos;s</option>
          <option value="womens">Women&apos;s</option>
          <option value="both">Both</option>
        </select>
      </label>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------
export type MeasurementsData = {
  height_in: number | null;
  inseam_in: number | null;
  shoulders_in: number | null;
  chest_bust_in: number | null;
  waist_in: number | null;
  hips_in: number | null;
  neck_in: number | null;
  sleeve_in: number | null;
  rise_target_in: string;
  sizing_notes: string;
};
const M_FIELDS: Array<[keyof MeasurementsData, string]> = [
  ["height_in", "Height"],
  ["inseam_in", "Inseam"],
  ["shoulders_in", "Shoulders"],
  ["chest_bust_in", "Chest / bust"],
  ["waist_in", "Waist"],
  ["hips_in", "Hips"],
  ["neck_in", "Neck"],
  ["sleeve_in", "Sleeve"],
];

export function MeasurementsCard({ data }: { data: MeasurementsData }) {
  const e = useEditor<MeasurementsData>(data, (v) => saveMeasurements(v));
  return (
    <Card
      title="Measurements (inches)"
      editing={e.editing}
      onEdit={e.edit}
      onCancel={e.cancel}
      onSave={e.save}
      pending={e.pending}
      error={e.error}
      view={
        <Dl>
          {M_FIELDS.map(([k, label]) => (
            <Row key={k} label={label}>
              {data[k] != null ? `${data[k]} in` : null}
            </Row>
          ))}
          <Row label="Rise target">{data.rise_target_in || null}</Row>
          <Row label="Sizing notes">{data.sizing_notes || null}</Row>
        </Dl>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {M_FIELDS.map(([k, label]) => (
          <label key={k} className="block text-sm">
            <span className="text-stone-500">{label}</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.25"
              value={(e.v[k] as number | null) ?? ""}
              onChange={(ev) => e.setV({ ...e.v, [k]: ev.target.value === "" ? null : Number(ev.target.value) })}
              className={input}
            />
          </label>
        ))}
      </div>
      <label className="block text-sm">
        <span className="text-stone-500">Rise target</span>
        <input value={e.v.rise_target_in} onChange={(ev) => e.setV({ ...e.v, rise_target_in: ev.target.value })} placeholder="11 to 12 in" className={input} />
      </label>
      <label className="block text-sm">
        <span className="text-stone-500">Sizing notes</span>
        <textarea value={e.v.sizing_notes} onChange={(ev) => e.setV({ ...e.v, sizing_notes: ev.target.value })} rows={3} placeholder="Tees run M to XL by brand; tall in pants" className={input} />
      </label>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------
export type ColorData = {
  season_label: string;
  undertone: string;
  depth: string;
  contrast: string;
  best_colors: string[];
  avoid_colors: string[];
  notes: string;
};

export function ColorCard({ data }: { data: ColorData }) {
  const e = useEditor<ColorData>(data, (v) => saveColor(v));
  const field = (k: "season_label" | "undertone" | "depth" | "contrast", label: string, ph: string) => (
    <label className="block text-sm">
      <span className="text-stone-500">{label}</span>
      <input value={e.v[k]} onChange={(ev) => e.setV({ ...e.v, [k]: ev.target.value })} placeholder={ph} className={input} />
    </label>
  );
  return (
    <Card
      title="Color"
      editing={e.editing}
      onEdit={e.edit}
      onCancel={e.cancel}
      onSave={e.save}
      pending={e.pending}
      error={e.error}
      view={
        <Dl>
          <Row label="Season">{data.season_label || null}</Row>
          <Row label="Undertone">{data.undertone || null}</Row>
          <Row label="Depth">{data.depth || null}</Row>
          <Row label="Contrast">{data.contrast || null}</Row>
          <Row label="Best colors">{list(data.best_colors)}</Row>
          <Row label="Avoid">{list(data.avoid_colors)}</Row>
          <Row label="Notes">{data.notes || null}</Row>
        </Dl>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {field("season_label", "Season", "Soft Autumn")}
        {field("undertone", "Undertone", "warm, cool, neutral")}
        {field("depth", "Depth", "light, medium, deep")}
        {field("contrast", "Contrast", "low, medium, high")}
      </div>
      <div className="text-sm">
        <span className="text-stone-500">Best colors (the scorecard checks these)</span>
        <TagInput value={e.v.best_colors} onChange={(best_colors) => e.setV({ ...e.v, best_colors })} placeholder="Type a color, press Enter" />
      </div>
      <div className="text-sm">
        <span className="text-stone-500">Colors to avoid</span>
        <TagInput value={e.v.avoid_colors} onChange={(avoid_colors) => e.setV({ ...e.v, avoid_colors })} placeholder="Type a color, press Enter" />
      </div>
      <label className="block text-sm">
        <span className="text-stone-500">Notes</span>
        <textarea value={e.v.notes} onChange={(ev) => e.setV({ ...e.v, notes: ev.target.value })} rows={2} className={input} />
      </label>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Style
// ---------------------------------------------------------------------------
export type StyleData = {
  aesthetic_statement: string;
  loves: string[];
  dislikes: string[];
  silhouettes_preferred: string[];
  silhouettes_avoid: string[];
  fabrics_preferred: Fabric[];
  fabrics_avoid: Fabric[];
};

export function StyleCard({ data }: { data: StyleData }) {
  const e = useEditor<StyleData>(data, (v) => saveStyle(v));
  const tagField = (k: "loves" | "dislikes" | "silhouettes_preferred" | "silhouettes_avoid", label: string, ph: string) => (
    <div className="text-sm">
      <span className="text-stone-500">{label}</span>
      <TagInput value={e.v[k]} onChange={(val) => e.setV({ ...e.v, [k]: val })} placeholder={ph} />
    </div>
  );
  return (
    <Card
      title="Style"
      editing={e.editing}
      onEdit={e.edit}
      onCancel={e.cancel}
      onSave={e.save}
      pending={e.pending}
      error={e.error}
      view={
        <Dl>
          <Row label="Aesthetic">{data.aesthetic_statement || null}</Row>
          <Row label="Loves">{list(data.loves)}</Row>
          <Row label="Dislikes">{list(data.dislikes)}</Row>
          <Row label="Silhouettes">{list(data.silhouettes_preferred)}</Row>
          <Row label="Avoid shapes">{list(data.silhouettes_avoid)}</Row>
          <Row label="Fabrics you like">{fabricText(data.fabrics_preferred)}</Row>
          <Row label="Fabrics to avoid">{fabricText(data.fabrics_avoid)}</Row>
        </Dl>
      }
    >
      <label className="block text-sm">
        <span className="text-stone-500">Aesthetic, in a sentence or two</span>
        <textarea value={e.v.aesthetic_statement} onChange={(ev) => e.setV({ ...e.v, aesthetic_statement: ev.target.value })} rows={3} className={input} />
      </label>
      {tagField("loves", "Loves", "Type something you love, press Enter")}
      {tagField("dislikes", "Dislikes (the scorecard checks these against construction)", "Ruffles, stiff fabrics…")}
      {tagField("silhouettes_preferred", "Silhouettes you prefer", "Modern knit polo cut…")}
      {tagField("silhouettes_avoid", "Silhouettes to avoid", "Boxy, cropped…")}
      <div className="text-sm">
        <span className="text-stone-500">Fabrics you like (tap soft/hard to change)</span>
        <FabricInput value={e.v.fabrics_preferred} onChange={(fabrics_preferred) => e.setV({ ...e.v, fabrics_preferred })} placeholder="Stretch, performance knit…" />
      </div>
      <div className="text-sm">
        <span className="text-stone-500">Fabrics to avoid (hard = never, soft = rather not)</span>
        <FabricInput value={e.v.fabrics_avoid} onChange={(fabrics_avoid) => e.setV({ ...e.v, fabrics_avoid })} placeholder="Linen, itchy wool…" />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------
export type BrandRow = { id: string; name: string; status: "loved" | "mixed" | "avoid"; note: string | null };
const STATUS_STYLE: Record<BrandRow["status"], string> = {
  loved: "bg-emerald-100 text-emerald-900",
  mixed: "bg-amber-100 text-amber-900",
  avoid: "bg-red-100 text-red-900",
};

export function BrandsCard({ brands }: { brands: BrandRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<BrandRow["status"]>("loved");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () =>
    startTransition(async () => {
      setError(null);
      const r = await addBrand({ name, status, note });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setName("");
      setNote("");
      router.refresh();
    });
  const remove = (id: string) =>
    startTransition(async () => {
      const r = await deleteBrand(id);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-medium text-stone-500">Brands</h2>
      {brands.length === 0 ? (
        <p className="mt-2 text-sm text-stone-600">No brands yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-stone-100 text-sm">
          {brands.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-2">
              <span className={"rounded-full px-2 py-0.5 text-xs " + STATUS_STYLE[b.status]}>{b.status}</span>
              <span className="flex-1">
                {b.name}
                {b.note && <span className="ml-2 text-stone-500">{b.note}</span>}
              </span>
              <button type="button" onClick={() => remove(b.id)} disabled={pending} className="text-stone-400 hover:text-red-700" aria-label={`Remove ${b.name}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a brand" className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-base" />
        <select value={status} onChange={(e) => setStatus(e.target.value as BrandRow["status"])} className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-base">
          <option value="loved">loved</option>
          <option value="mixed">mixed</option>
          <option value="avoid">avoid</option>
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-40 rounded-lg border border-stone-300 bg-white px-3 py-2 text-base" />
        <button type="button" onClick={add} disabled={pending || !name.trim()} className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">
          Add
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
