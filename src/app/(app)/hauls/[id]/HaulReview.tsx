"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/closet/compress";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { deleteHaul, deleteHaulItem, setHaulItemStatus } from "../actions";
import { verdictLabel } from "@/lib/verdict";
import { Button, Card, Chip, ChipButton, ChipLink, ConfirmButton, EmptyState, Field, Notice, Swatch, Textarea, Thumb, buttonClass, type ChipTone } from "@/components/ui";

export type HaulItemView = {
  id: string;
  name: string;
  url: string | null;
  imageUrl: string | null;
  brand: string | null;
  price: number | null;
  currency: string | null;
  verdict: string | null;
  headline: string | null;
  scores: Record<string, { status: string; reason: string }> | null;
  colors: Array<{ name: string; hex?: string }>;
  stated: string | null;
  tailoring: string | null;
  status: string;
  closetId: string | null;
};

type Job = { key: string; label: string; state: "waiting" | "working" | "error"; error?: string };

const VERDICT_TONE: Record<string, ChipTone> = { keep: "works", provisional: "almost", cut: "not" };

// Each score carries a glyph and a word, so status never rests on dot colour alone.
const SCORE: Record<string, { glyph: string; word: string; dot: string }> = {
  good: { glyph: "✓", word: "good", dot: "bg-emerald-700" },
  ok: { glyph: "✓", word: "ok", dot: "bg-emerald-700" },
  caution: { glyph: "◐", word: "caution", dot: "bg-amber-500" },
  fail: { glyph: "✕", word: "miss", dot: "bg-red-700" },
  unknown: { glyph: "?", word: "unclear", dot: "bg-stone-400" },
};

export default function HaulReview({ haulId, initial }: { haulId: string; initial: HaulItemView[] }) {
  const [items, setItems] = useState<HaulItemView[]>(initial);
  const [urls, setUrls] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [over, setOver] = useState(false);
  const running = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const toView = (r: Record<string, unknown>, imageUrl: string | null): HaulItemView => ({
    id: r.id as string,
    name: (r.name as string) ?? "Product",
    url: (r.url as string | null) ?? null,
    imageUrl,
    brand: (r.brand as string | null) ?? null,
    price: r.price != null ? Number(r.price) : null,
    currency: (r.currency as string | null) ?? null,
    verdict: (r.verdict as string | null) ?? null,
    headline: (r.headline as string | null) ?? null,
    scores: (r.scores as HaulItemView["scores"]) ?? null,
    colors: Array.isArray(r.verified_colors) ? (r.verified_colors as HaulItemView["colors"]) : [],
    stated: (r.stated_colorway as string | null) ?? null,
    tailoring: (r.tailoring_needed as string | null) ?? null,
    status: (r.status as string) ?? "considering",
    closetId: (r.closet_item_id as string | null) ?? null,
  });

  const review = async (payload: Record<string, unknown>, preview: string | null) => {
    const res = await fetch("/api/haul/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ haulId, ...payload }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.item) throw new Error(body.detail || "The review failed.");
    const row = body.item as Record<string, unknown>;
    const view = toView(row, preview ?? (row.source_image_url as string | null) ?? null);
    setItems((xs) => [...xs, view]);
    setAnnounce(`Added ${view.name}${view.verdict ? `: ${verdictLabel(view.verdict)}` : ""}.`);
  };

  // One product at a time, so a slow store does not hold up the rest.
  const runQueue = async (queue: Array<{ key: string; label: string; run: () => Promise<void> }>) => {
    setJobs((j) => [...j, ...queue.map((q) => ({ key: q.key, label: q.label, state: "waiting" as const }))]);
    while (running.current) await new Promise((r) => setTimeout(r, 300));
    running.current = true;
    for (const q of queue) {
      setJobs((j) => j.map((x) => (x.key === q.key ? { ...x, state: "working" } : x)));
      try {
        await q.run();
        setJobs((j) => j.filter((x) => x.key !== q.key));
      } catch (e) {
        setJobs((j) => j.map((x) => (x.key === q.key ? { ...x, state: "error", error: e instanceof Error ? e.message : "Failed" } : x)));
      }
    }
    running.current = false;
  };

  const addUrls = () => {
    const list = urls
      .split(/\s+/)
      .map((s) => s.trim())
      .filter((s) => /^https:\/\//i.test(s));
    if (!list.length) {
      setError("Paste one or more https product links.");
      return;
    }
    setError(null);
    setUrls("");
    void runQueue(list.map((u, i) => ({ key: `${Date.now()}-${i}`, label: u.replace(/^https:\/\/(www\.)?/, "").slice(0, 60), run: () => review({ url: u }, null) })));
  };

  const addFiles = (files: FileList | File[] | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    void runQueue(
      list.map((f, i) => ({
        key: `${Date.now()}-f${i}`,
        label: f.name || "Screenshot",
        run: async () => {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("Signed out. Reload and sign in again.");
          const { blob, type } = await compressImage(f);
          const path = `${user.id}/hauls/${crypto.randomUUID()}.${type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg"}`;
          const { error: upErr } = await supabase.storage.from(CLOSET_BUCKET).upload(path, blob, { contentType: type });
          if (upErr) throw new Error(upErr.message);
          await review({ imagePath: path }, URL.createObjectURL(blob));
        },
      }))
    );
  };

  // Paste screenshots straight onto the page.
  const addFilesRef = useRef(addFiles);
  useEffect(() => {
    addFilesRef.current = addFiles;
  });
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      e.preventDefault();
      addFilesRef.current(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const mark = async (id: string, status: "purchased" | "returned" | "passed" | "considering") => {
    const r = await setHaulItemStatus(id, status);
    if (!r.ok) return setError(r.error);
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status, closetId: r.closetId ?? x.closetId } : x)));
  };
  const remove = async (id: string) => {
    const name = items.find((x) => x.id === id)?.name ?? "Product";
    const r = await deleteHaulItem(id);
    if (!r.ok) return setError(r.error ?? "Could not delete");
    setItems((xs) => xs.filter((x) => x.id !== id));
    setAnnounce(`Removed ${name}.`);
  };

  return (
    <div className="space-y-6">
      <section
        aria-label="Add products"
        className={"space-y-3 rounded-card bg-card p-4 transition-shadow duration-200 ease-soft sm:p-5 " + (over ? "ring-2 ring-stone-900" : "ring-1 ring-line")}
        onDragOver={(e) => {
          if (!Array.from(e.dataTransfer.types).includes("Files")) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <Field label="Product links" srOnly>
          <Textarea value={urls} onChange={(e) => setUrls(e.target.value)} rows={3} placeholder="Paste product links, one per line" />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="primary" onClick={addUrls}>
            Review links
          </Button>
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
            Upload screenshots
          </Button>
          <span className="text-xs text-stone-500">{over ? "Drop to review" : "or drop or paste screenshots here"}</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        {/* Always mounted so screen readers hear the first update and each finished product. */}
        <div role="status" aria-live="polite" className="space-y-1 text-sm empty:hidden">
          {jobs.length > 0 && (
            <ul className="space-y-1">
              {jobs.map((j) => (
                <li key={j.key} className={j.state === "error" ? "text-red-700" : "text-stone-600"}>
                  {j.state === "working" ? "Reviewing" : j.state === "waiting" ? "Waiting" : "Failed"}: {j.label}
                  {j.error ? ` (${j.error})` : ""}
                </li>
              ))}
            </ul>
          )}
          {announce && <p className="sr-only">{announce}</p>}
        </div>
      </section>

      {items.length === 0 && jobs.length === 0 && <EmptyState compact title="Nothing reviewed yet. Paste a product link or a screenshot above." />}

      {items.length > 0 && <h2 className="sr-only">Products in this haul</h2>}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <Card as="article" key={it.id} className="space-y-3">
            <div className="flex gap-3">
              <div className="w-24 shrink-0 sm:w-28">
                <Thumb src={it.imageUrl} alt={it.name} product />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {it.verdict && <Chip tone={VERDICT_TONE[it.verdict] ?? "neutral"}>{verdictLabel(it.verdict)}</Chip>}
                <div>
                  <h3 className="font-display text-lg font-bold leading-snug">{it.name}</h3>
                  <p className="text-xs tabular-nums text-stone-500">
                    {[it.brand, it.price != null ? (it.currency && it.currency !== "USD" ? `${it.currency} ${it.price.toFixed(2)}` : `$${it.price.toFixed(2)}`) : null, it.stated ? `listed as ${it.stated}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {it.headline && <p className="text-sm">{it.headline}</p>}
              </div>
            </div>
            {it.scores && (
              <ul className="space-y-1 text-xs text-stone-600">
                {["palette", "fabric", "silhouette", "vibe"].map((k) => {
                  const s = it.scores?.[k];
                  if (!s) return null;
                  const meta = SCORE[s.status] ?? SCORE.unknown;
                  return (
                    <li key={k} className="flex gap-2">
                      <span aria-hidden="true" className={"mt-1 size-2 shrink-0 rounded-full " + meta.dot} />
                      <span>
                        <b className="font-medium capitalize">{k}</b>{" "}
                        <span className="font-medium text-stone-700">
                          <span aria-hidden="true">{meta.glyph} </span>
                          {meta.word}
                        </span>
                        : {s.reason}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {it.colors.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
                Photo reads:
                {it.colors.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    <Swatch hex={c.hex} name={c.name} className="size-3" />
                    {c.name}
                  </span>
                ))}
              </div>
            )}
            {it.tailoring && <p className="text-xs text-amber-800">Tailoring: {it.tailoring}</p>}
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              {it.status === "purchased" && (
                <>
                  <Chip tone="neutral" size="md">
                    Bought
                  </Chip>
                  {it.closetId && (
                    <ChipLink href={`/closet/${it.closetId}`} tone="outline">
                      In closet
                    </ChipLink>
                  )}
                  <Button type="button" size="sm" onClick={() => mark(it.id, "returned")}>
                    Returned
                  </Button>
                </>
              )}
              {it.status === "returned" && (
                <>
                  <Chip tone="outline" size="md">
                    Returned
                  </Chip>
                  <Button type="button" variant="quiet" size="sm" onClick={() => mark(it.id, "considering")}>
                    Undo
                  </Button>
                </>
              )}
              {it.status !== "purchased" && it.status !== "returned" && (
                <>
                  <Button type="button" size="sm" onClick={() => mark(it.id, "purchased")}>
                    Bought it
                  </Button>
                  <ChipButton selected={it.status === "passed"} onClick={() => mark(it.id, it.status === "passed" ? "considering" : "passed")}>
                    Passed
                  </ChipButton>
                </>
              )}
              {it.url && (
                <a href={it.url} target="_blank" rel="noreferrer" className={buttonClass("quiet", "sm")}>
                  Product page<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
              <ConfirmButton title="Remove this product?" body="It comes off this haul, with its review." confirmLabel="Remove" onConfirm={() => void remove(it.id)} className="ml-auto">
                Delete<span className="sr-only"> {it.name}</span>
              </ConfirmButton>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <ConfirmButton title="Delete this haul and its photos?" confirmLabel="Delete" cancelLabel="Keep" onConfirm={() => void deleteHaul(haulId)}>
          Delete haul
        </ConfirmButton>
      </div>
    </div>
  );
}
