"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { addBrand, deleteBrand, saveAccount, saveColor, saveMeasurements, saveStyle } from "./actions";
import { Button, Card as UICard, Chip, EmptyState, Field, Input, Notice, SectionTitle, Select, Swatch, Textarea, type ChipTone } from "@/components/ui";

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

/** Only one profile card edits at a time; the others' Edit buttons wait. */
const EditingContext = createContext<{ editing: string | null; setEditing: (k: string | null) => void }>({ editing: null, setEditing: () => {} });

export function ProfileEditing({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState<string | null>(null);
  return <EditingContext.Provider value={{ editing, setEditing }}>{children}</EditingContext.Provider>;
}

function Card({
  id,
  title,
  editing,
  locked,
  saved,
  onEdit,
  onCancel,
  onSave,
  pending,
  error,
  view,
  children,
}: {
  id?: string;
  title: string;
  editing: boolean;
  /** Another card is being edited. */
  locked: boolean;
  saved: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
  error: string | null;
  view: ReactNode;
  children: ReactNode;
}) {
  const editRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const was = useRef(editing);
  // Focus follows the mode: into the first field on Edit, back to Edit on Save or Cancel.
  useEffect(() => {
    if (editing && !was.current) formRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    if (!editing && was.current) editRef.current?.focus();
    was.current = editing;
  }, [editing]);

  return (
    <UICard as="section" id={id} className="scroll-mt-20 space-y-3">
      <SectionTitle
        action={
          !editing && (
            <Button ref={editRef} type="button" variant="quiet" size="sm" onClick={onEdit} disabled={locked} aria-label={`Edit ${title}`} title={locked ? "Finish the card you're editing first" : undefined}>
              Edit
            </Button>
          )
        }
      >
        {title}
      </SectionTitle>
      {editing ? (
        <div ref={formRef} className="space-y-4">
          {children}
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={pending} aria-busy={pending || undefined}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="quiet" size="sm" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div>{view}</div>
      )}
      <p role="status" className="text-sm font-medium text-stone-700 empty:hidden">
        {saved && !editing ? "✓ Saved" : ""}
      </p>
    </UICard>
  );
}

function useEditor<T>(key: string, initial: T, save: (v: T) => Promise<{ ok: true } | { ok: false; error: string }>) {
  const router = useRouter();
  const ctx = useContext(EditingContext);
  const editing = ctx.editing === key;
  const [v, setV] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  return {
    editing,
    locked: ctx.editing !== null && !editing,
    saved,
    v,
    setV,
    error,
    pending,
    edit: () => {
      setV(initial);
      setError(null);
      setSaved(false);
      ctx.setEditing(key);
    },
    cancel: () => ctx.setEditing(null),
    save: () =>
      startTransition(async () => {
        setError(null);
        const r = await save(v);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setSaved(true);
        ctx.setEditing(null);
        router.refresh();
      }),
  };
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-stone-500">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? <Empty />}</dd>
    </>
  );
}
function Empty() {
  return (
    <span className="text-stone-500">
      <span aria-hidden="true">—</span>
      <span className="sr-only">Not set</span>
    </span>
  );
}
const Dl = ({ children }: { children: ReactNode }) => <dl className="grid grid-cols-[8.5rem_1fr] gap-x-3 gap-y-1.5 text-sm leading-relaxed">{children}</dl>;
const list = (xs: string[]) => (xs.length ? xs.join(", ") : null);

function TagInput({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim().replace(/,$/, "");
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="rounded-control border border-stone-400/70 bg-inset p-1.5 transition-colors duration-200 ease-soft focus-within:border-stone-900">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-card py-0.5 pl-3 pr-0.5 text-sm ring-1 ring-line">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="tap inline-grid size-7 place-items-center rounded-full text-base leading-none text-stone-500 transition-colors duration-200 ease-soft hover:bg-stone-900/[0.06] hover:text-stone-900" aria-label={`Remove ${t}`}>
              <span aria-hidden="true">×</span>
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
          aria-label={label}
          className="min-h-9 min-w-[8rem] flex-1 rounded-[10px] bg-transparent px-2 py-1 text-base placeholder:text-stone-500"
        />
      </div>
    </div>
  );
}

type Fabric = { name: string; strength: "soft" | "hard" };
function FabricInput({ label, value, onChange, placeholder }: { label: string; value: Fabric[]; onChange: (v: Fabric[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim().replace(/,$/, "");
    if (t && !value.some((f) => f.name === t)) onChange([...value, { name: t, strength: "soft" }]);
    setDraft("");
  };
  return (
    <div className="rounded-control border border-stone-400/70 bg-inset p-1.5 transition-colors duration-200 ease-soft focus-within:border-stone-900">
      <div className="flex flex-wrap gap-1.5">
        {value.map((f) => (
          <span key={f.name} className="inline-flex items-center gap-1 rounded-full bg-card py-0.5 pl-3 pr-0.5 text-sm ring-1 ring-line">
            {f.name}
            <button
              type="button"
              onClick={() => onChange(value.map((x) => (x.name === f.name ? { ...x, strength: x.strength === "soft" ? "hard" : "soft" } : x)))}
              aria-pressed={f.strength === "hard"}
              aria-label={`${f.name} as a hard rule`}
              className={
                "tap inline-flex items-center rounded-full px-2 text-xs font-semibold transition-colors duration-200 ease-soft " +
                (f.strength === "hard" ? "bg-stone-900 text-stone-50" : "bg-inset text-stone-600 ring-1 ring-inset ring-line-strong")
              }
              title="Tap to switch between soft (a preference) and hard (a rule)"
            >
              {f.strength}
            </button>
            <button type="button" onClick={() => onChange(value.filter((x) => x.name !== f.name))} className="tap inline-grid size-7 place-items-center rounded-full text-base leading-none text-stone-500 transition-colors duration-200 ease-soft hover:bg-stone-900/[0.06] hover:text-stone-900" aria-label={`Remove ${f.name}`}>
              <span aria-hidden="true">×</span>
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
          aria-label={label}
          className="min-h-9 min-w-[8rem] flex-1 rounded-[10px] bg-transparent px-2 py-1 text-base placeholder:text-stone-500"
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
  const e = useEditor("account", { name: data.name, location: data.location, presentation: data.presentation }, (v) => saveAccount(v));
  return (
    <Card
      title="Account"
      editing={e.editing}
      locked={e.locked}
      saved={e.saved}
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
      <Field label="Name">
        <Input value={e.v.name} onChange={(ev) => e.setV({ ...e.v, name: ev.target.value })} />
      </Field>
      <Field label="Location (city, used for weather)">
        <Input value={e.v.location} onChange={(ev) => e.setV({ ...e.v, location: ev.target.value })} placeholder="Las Vegas, NV" />
      </Field>
      <Field label="Outfits for">
        <Select value={e.v.presentation} onChange={(ev) => e.setV({ ...e.v, presentation: ev.target.value as AccountData["presentation"] })}>
          <option value="mens">Men&apos;s</option>
          <option value="womens">Women&apos;s</option>
          <option value="both">Both</option>
        </Select>
      </Field>
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
  const e = useEditor<MeasurementsData>("measurements", data, (v) => saveMeasurements(v));
  return (
    <Card
      title="Measurements (inches)"
      editing={e.editing}
      locked={e.locked}
      saved={e.saved}
      onEdit={e.edit}
      onCancel={e.cancel}
      onSave={e.save}
      pending={e.pending}
      error={e.error}
      view={
        M_FIELDS.every(([k]) => data[k] == null) && !data.rise_target_in && !data.sizing_notes ? (
          <EmptyState compact title="No measurements yet. Add them with Edit so fit checks know your size." />
        ) : (
        <Dl>
          {M_FIELDS.map(([k, label]) => (
            <Row key={k} label={label}>
              {data[k] != null ? `${data[k]} in` : null}
            </Row>
          ))}
          <Row label="Rise target">{data.rise_target_in || null}</Row>
          <Row label="Sizing notes">{data.sizing_notes || null}</Row>
        </Dl>
        )
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {M_FIELDS.map(([k, label]) => (
          <Field key={k} label={label}>
            <Input
              type="number"
              inputMode="decimal"
              step="0.25"
              value={(e.v[k] as number | null) ?? ""}
              onChange={(ev) => e.setV({ ...e.v, [k]: ev.target.value === "" ? null : Number(ev.target.value) })}
            />
          </Field>
        ))}
      </div>
      <Field label="Rise target">
        <Input value={e.v.rise_target_in} onChange={(ev) => e.setV({ ...e.v, rise_target_in: ev.target.value })} placeholder="11 to 12 in" />
      </Field>
      <Field label="Sizing notes">
        <Textarea value={e.v.sizing_notes} onChange={(ev) => e.setV({ ...e.v, sizing_notes: ev.target.value })} rows={3} placeholder="Tees run M to XL by brand; tall in pants" />
      </Field>
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

/** Colors as swatch chips, the way the palette page shows them. */
function ColorChips({ names, hexes }: { names: string[]; hexes: Record<string, string | null> }) {
  if (!names.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {names.map((c) => (
        <li key={c}>
          <Chip tone="outline">
            {hexes[c] && <Swatch hex={hexes[c]} className="size-3" />}
            {c}
          </Chip>
        </li>
      ))}
    </ul>
  );
}

export function ColorCard({ data, hexes = {} }: { data: ColorData; hexes?: Record<string, string | null> }) {
  const e = useEditor<ColorData>("color", data, (v) => saveColor(v));
  const field = (k: "season_label" | "undertone" | "depth" | "contrast", label: string, ph: string) => (
    <Field label={label}>
      <Input value={e.v[k]} onChange={(ev) => e.setV({ ...e.v, [k]: ev.target.value })} placeholder={ph} />
    </Field>
  );
  return (
    <Card
      id="color"
      title="Color"
      editing={e.editing}
      locked={e.locked}
      saved={e.saved}
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
          <Row label="Best colors">{data.best_colors.length ? <ColorChips names={data.best_colors} hexes={hexes} /> : null}</Row>
          <Row label="Avoid">{data.avoid_colors.length ? <ColorChips names={data.avoid_colors} hexes={hexes} /> : null}</Row>
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
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-stone-700" aria-hidden="true">Best colors (the scorecard checks these)</p>
        <TagInput label="Best colors (the scorecard checks these)" value={e.v.best_colors} onChange={(best_colors) => e.setV({ ...e.v, best_colors })} placeholder="Type a color, press Enter" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-stone-700" aria-hidden="true">Colors to avoid</p>
        <TagInput label="Colors to avoid" value={e.v.avoid_colors} onChange={(avoid_colors) => e.setV({ ...e.v, avoid_colors })} placeholder="Type a color, press Enter" />
      </div>
      <Field label="Notes">
        <Textarea value={e.v.notes} onChange={(ev) => e.setV({ ...e.v, notes: ev.target.value })} rows={2} />
      </Field>
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
  const e = useEditor<StyleData>("style", data, (v) => saveStyle(v));
  const tagField = (k: "loves" | "dislikes" | "silhouettes_preferred" | "silhouettes_avoid", label: string, ph: string) => (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-stone-700" aria-hidden="true">{label}</p>
      <TagInput label={label} value={e.v[k]} onChange={(val) => e.setV({ ...e.v, [k]: val })} placeholder={ph} />
    </div>
  );
  return (
    <Card
      title="Style"
      editing={e.editing}
      locked={e.locked}
      saved={e.saved}
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
      <Field label="Aesthetic, in a sentence or two">
        <Textarea value={e.v.aesthetic_statement} onChange={(ev) => e.setV({ ...e.v, aesthetic_statement: ev.target.value })} rows={3} />
      </Field>
      {tagField("loves", "Loves", "Type something you love, press Enter")}
      {tagField("dislikes", "Dislikes (the scorecard checks these against construction)", "Ruffles, stiff fabrics…")}
      {tagField("silhouettes_preferred", "Silhouettes you prefer", "Modern knit polo cut…")}
      {tagField("silhouettes_avoid", "Silhouettes to avoid", "Boxy, cropped…")}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-stone-700" aria-hidden="true">Fabrics you like (tap soft/hard to change)</p>
        <FabricInput label="Fabrics you like (tap soft/hard to change)" value={e.v.fabrics_preferred} onChange={(fabrics_preferred) => e.setV({ ...e.v, fabrics_preferred })} placeholder="Stretch, performance knit…" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-stone-700" aria-hidden="true">Fabrics to avoid (hard = never, soft = rather not)</p>
        <FabricInput label="Fabrics to avoid (hard = never, soft = rather not)" value={e.v.fabrics_avoid} onChange={(fabrics_avoid) => e.setV({ ...e.v, fabrics_avoid })} placeholder="Linen, itchy wool…" />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------
export type BrandRow = { id: string; name: string; status: "loved" | "mixed" | "avoid"; note: string | null };
// Soft tones, not verdict fills: green stays reserved for "works on you".
const STATUS_TONE: Record<BrandRow["status"], ChipTone> = {
  loved: "warm",
  mixed: "neutral",
  avoid: "outline",
};

export function BrandsCard({ brands }: { brands: BrandRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<BrandRow["status"]>("loved");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = (ev: FormEvent) => {
    ev.preventDefault();
    if (!name.trim()) return;
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
  };
  const remove = (id: string) =>
    startTransition(async () => {
      const r = await deleteBrand(id);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  return (
    <UICard as="section" className="space-y-3">
      <SectionTitle>Brands</SectionTitle>
      {brands.length === 0 ? (
        <p className="text-sm text-stone-600">No brands yet.</p>
      ) : (
        <ul className="divide-y divide-line text-sm">
          {brands.map((b) => (
            <li key={b.id} className="flex min-h-12 items-center gap-3 py-1.5">
              <Chip tone={STATUS_TONE[b.status]}>{b.status}</Chip>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{b.name}</span>
                {b.note && <span className="ml-2 text-stone-500">{b.note}</span>}
              </span>
              <button
                type="button"
                onClick={() => remove(b.id)}
                disabled={pending}
                className="tap inline-grid size-8 shrink-0 place-items-center rounded-full text-lg leading-none text-stone-500 transition-colors duration-200 ease-soft hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
                aria-label={`Remove ${b.name}`}
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} aria-label="Add a brand" className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
        <Field label="Brand" srOnly className="min-w-[10rem] flex-1">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a brand" />
        </Field>
        <Field label="Status" srOnly className="w-28">
          <Select value={status} onChange={(e) => setStatus(e.target.value as BrandRow["status"])}>
            <option value="loved">loved</option>
            <option value="mixed">mixed</option>
            <option value="avoid">avoid</option>
          </Select>
        </Field>
        <Field label="Note" srOnly className="min-w-[8rem] flex-1 sm:w-40 sm:flex-none">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending || !name.trim()}>
          Add
        </Button>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
    </UICard>
  );
}
