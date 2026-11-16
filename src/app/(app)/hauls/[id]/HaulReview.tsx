"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/closet/compress";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { deleteHaul, deleteHaulItem, setHaulItemStatus } from "../actions";

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

const BADGE: Record<string, string> = { keep: "bg-emerald-700 text-white", cut: "bg-red-700 text-white", provisional: "bg-stone-300 text-stone-800" };
const DOT: Record<string, string> = { good: "bg-emerald-600", ok: "bg-emerald-400", caution: "bg-amber-500", fail: "bg-red-600", unknown: "bg-stone-300" };

export default function HaulReview({ haulId, initial }: { haulId: string; initial: HaulItemView[] }) {
  const [items, setItems] = useState<HaulItemView[]>(initial);
  const [urls, setUrls] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    setItems((xs) => [...xs, toView(row, preview ?? (row.source_image_url as string | null) ?? null)]);
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
    const r = await deleteHaulItem(id);
    if (!r.ok) return setError(r.error ?? "Could not delete");
    setItems((xs) => xs.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-5">
      <section
        className="space-y-3 rounded-xl border border-stone-200 bg-white p-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          rows={3}
          placeholder="Paste product links, one per line"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-base outline-none focus:border-stone-900"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={addUrls} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white">
            Review links
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:border-stone-500">
            Upload screenshots
          </button>
          <span className="text-xs text-stone-500">or drop or paste screenshots here</span>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        {jobs.length > 0 && (
          <ul className="space-y-1 text-sm">
            {jobs.map((j) => (
              <li key={j.key} className={j.state === "error" ? "text-red-700" : "text-stone-600"}>
                {j.state === "working" ? "Reviewing" : j.state === "waiting" ? "Waiting" : "Failed"}: {j.label}
                {j.error ? ` (${j.error})` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      {items.length === 0 && jobs.length === 0 && (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">Nothing reviewed yet.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <article key={it.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="relative aspect-[4/3] bg-stone-100">
              {it.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.imageUrl} alt={it.name} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-stone-400">No photo</div>
              )}
              {it.verdict && <span className={"absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium " + (BADGE[it.verdict] ?? "")}>{it.verdict}</span>}
            </div>
            <div className="space-y-2 p-3">
              <div>
                <p className="font-medium leading-tight">{it.name}</p>
                <p className="text-xs text-stone-500">
                  {[it.brand, it.price != null ? `${it.currency ?? "$"} ${it.price.toFixed(2)}`.replace("USD ", "$") : null, it.stated ? `listed as ${it.stated}` : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              {it.headline && <p className="text-sm">{it.headline}</p>}
              {it.scores && (
                <ul className="space-y-1 text-xs text-stone-600">
                  {["palette", "fabric", "silhouette", "vibe"].map((k) =>
                    it.scores?.[k] ? (
                      <li key={k} className="flex gap-2">
                        <span className={"mt-1 h-2 w-2 shrink-0 rounded-full " + (DOT[it.scores[k].status] ?? DOT.unknown)} />
                        <span>
                          <b className="font-medium capitalize">{k}:</b> {it.scores[k].reason}
                        </span>
                      </li>
                    ) : null
                  )}
                </ul>
              )}
              {it.colors.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 text-xs text-stone-500">
                  Photo reads:
                  {it.colors.map((c, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="h-3 w-3 rounded-full border border-stone-300" style={{ background: c.hex ?? "transparent" }} />
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
              {it.tailoring && <p className="text-xs text-amber-800">Tailoring: {it.tailoring}</p>}
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                {it.status === "purchased" ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-900">
                    Bought{it.closetId && <> · <Link href={`/closet/${it.closetId}`} className="underline">in closet</Link></>}
                  </span>
                ) : (
                  <button type="button" onClick={() => mark(it.id, "purchased")} className="rounded-full border border-stone-300 px-2.5 py-1 hover:border-stone-500">
                    Bought it
                  </button>
                )}
                {it.status !== "returned" && it.status !== "purchased" && (
                  <button type="button" onClick={() => mark(it.id, "passed")} className={"rounded-full border px-2.5 py-1 " + (it.status === "passed" ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 hover:border-stone-500")}>
                    Passed
                  </button>
                )}
                {it.status === "purchased" && (
                  <button type="button" onClick={() => mark(it.id, "returned")} className="rounded-full border border-stone-300 px-2.5 py-1 hover:border-stone-500">
                    Returned
                  </button>
                )}
                {it.url && (
                  <a href={it.url} target="_blank" rel="noreferrer" className="rounded-full border border-stone-300 px-2.5 py-1 hover:border-stone-500">
                    Product page
                  </a>
                )}
                <button type="button" onClick={() => remove(it.id)} className="ml-auto text-stone-400 hover:text-red-700">
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="pt-2 text-right text-sm">
        {confirmDelete ? (
          <span className="inline-flex items-center gap-2">
            Delete this haul and its photos?
            <button type="button" onClick={() => deleteHaul(haulId)} className="rounded-lg bg-red-700 px-3 py-1 text-white">
              Delete
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="text-stone-500 underline">
              Keep
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="text-stone-500 hover:text-red-700">
            Delete haul
          </button>
        )}
      </div>
    </div>
  );
}
