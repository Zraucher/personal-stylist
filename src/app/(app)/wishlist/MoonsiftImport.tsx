"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Checkbox, Field, Input, Notice, Skeleton, Thumb } from "@/components/ui";

type Collection = { id: string; name: string; cover: string | null; count: number | null; thumbs?: Array<{ imageUrl: string | null; name: string | null }> };
type Preview = { kind: "collection" | "profile"; username: string; collections: Collection[] };
type Result = { imported: number; skipped: number; failed: number; capped: boolean };

const FAILED = "Couldn't read that Moonsift link. Try again.";

async function post(body: object) {
  const res = await fetch("/api/wishlist/moonsift", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(res.status === 401 ? "You're signed out. Sign in again to import." : json.detail || FAILED);
  return json;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function summary(r: Result) {
  const parts = [`Imported ${plural(r.imported, "product")}.`];
  if (r.skipped) parts.push(`${plural(r.skipped, "was", "were")} already on your wishlist.`);
  if (r.failed) parts.push(`${plural(r.failed, "item")} had no usable store link.`);
  if (r.capped) parts.push("We stop at 500 per import; import again for the rest.");
  return parts.join(" ");
}

/** Paste a Moonsift link, preview it, import it into saved products. `link` starts the preview right away. */
export function MoonsiftImport({ link: initial, primary = false }: { link?: string | null; primary?: boolean }) {
  const router = useRouter();
  const [link, setLink] = useState(initial ?? "");
  const [busy, setBusy] = useState<"preview" | "import" | null>(initial ? "preview" : null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<Result | null>(null);
  const started = useRef(false);

  const load = async (value: string) => {
    setBusy("preview");
    setError(null);
    setResult(null);
    setPreview(null);
    try {
      const p: Preview = await post({ link: value });
      setPreview(p);
      setPicked(new Set(p.kind === "collection" ? p.collections.map((c) => c.id) : []));
    } catch (e) {
      setError(e instanceof Error ? e.message : FAILED);
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (!initial || started.current) return;
    started.current = true;
    load(initial);
  }, [initial]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (link.trim() && !busy) load(link.trim());
  };

  const chosen = preview?.collections.filter((c) => picked.has(c.id)) ?? [];
  const known = chosen.every((c) => c.count != null);
  const total = chosen.reduce((n, c) => n + (c.count ?? 0), 0);
  const label = known ? `Import ${plural(total, "item")}` : `Import ${plural(chosen.length, "collection")}`;

  const doImport = async () => {
    if (!preview || !chosen.length || busy) return;
    setBusy("import");
    setError(null);
    try {
      const r: Result = await post({ link: link.trim(), import: chosen.map((c) => c.id) });
      setResult(r);
      setPreview(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't import that. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const toggle = (id: string) => setPicked((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Moonsift collection or profile link" className="min-w-0 flex-1">
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="moonsift.com/collection/… or moonsift.com/@name" inputMode="url" autoComplete="off" required />
        </Field>
        <Button type="submit" variant="secondary" disabled={!!busy} aria-busy={busy === "preview" || undefined}>
          {busy === "preview" ? "Reading…" : "Preview"}
        </Button>
      </form>

      <div aria-live="polite" className="space-y-3 empty:hidden">
        {busy === "preview" && <Skeleton className="h-28 w-full rounded-card" />}
        {error && <Notice tone="error">{error}</Notice>}
        {result && <Notice tone="success">{summary(result)}</Notice>}
        {preview && preview.collections.length === 0 && <Notice tone="info">@{preview.username} has no public collections. Make one public in Moonsift, then paste the link again.</Notice>}
        {preview && preview.collections.length > 0 && (
          <Card className="space-y-3">
            {preview.kind === "collection" ? (
              <>
                <div>
                  <p className="font-display text-lg font-bold leading-snug">{preview.collections[0].name}</p>
                  <p className="text-xs tabular-nums text-stone-500">
                    {plural(preview.collections[0].count ?? 0, "item")} · @{preview.username}
                  </p>
                </div>
                <ul className="grid grid-cols-4 gap-2">
                  {(preview.collections[0].thumbs ?? []).map((t, i) => (
                    <li key={i}>
                      <Thumb src={t.imageUrl} alt={t.name ?? "Product"} product />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <fieldset className="space-y-2">
                <legend className="pb-1 text-sm text-stone-600">Public collections from @{preview.username}. Pick the ones to import.</legend>
                <ul className="divide-y divide-line">
                  {preview.collections.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 py-2">
                      <div className="w-12 shrink-0">
                        <Thumb src={c.cover} alt="" product />
                      </div>
                      <Checkbox
                        className="min-w-0 flex-1"
                        checked={picked.has(c.id)}
                        onChange={() => toggle(c.id)}
                        label={
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{c.name}</span>
                            {c.count != null && <span className="block text-xs tabular-nums text-stone-500">{plural(c.count, "item")}</span>}
                          </span>
                        }
                      />
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant={primary ? "primary" : "secondary"} onClick={doImport} disabled={!chosen.length || !!busy} aria-busy={busy === "import" || undefined}>
                {busy === "import" ? "Importing…" : label}
              </Button>
              <p className="text-xs text-stone-500">Already-saved products are skipped.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/** The wishlist's entry point: a secondary button that opens the import inline. */
export default function MoonsiftImportToggle() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <Button type="button" variant="secondary" aria-expanded={open} aria-controls="moonsift-import" onClick={() => setOpen((o) => !o)}>
        {open ? "Close Moonsift import" : "Import from Moonsift"}
      </Button>
      {open && (
        <div id="moonsift-import">
          <MoonsiftImport />
        </div>
      )}
    </div>
  );
}
