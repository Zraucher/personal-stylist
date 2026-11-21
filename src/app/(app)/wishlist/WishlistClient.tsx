"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addWish, deleteWish, setCandidateState, setWatch, setWishStatus, sourcingHaul, upcomingStatus } from "./actions";
import { priceDrop } from "@/lib/retail/price";
import AskFriendsButton from "@/components/AskFriendsButton";

export type WishView = { id: string; title: string; preferences: string | null; budget: string | null; colors: string[]; status: "open" | "found" | "dropped"; lastSearched: string | null };
export type CandidateView = {
  id: string;
  wishId: string;
  url: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  price: number | null;
  paletteStatus: string | null;
  paletteReason: string | null;
  state: string;
  colors: Array<{ name: string; hex?: string }>;
  watch: boolean;
  firstPrice: number | null;
};
type Need = { id: string; label: string; season: string | null; status: string };

const IN_PALETTE = new Set(["good", "ok"]);

export default function WishlistClient({ wishes, candidates, needs, prefill }: { wishes: WishView[]; candidates: CandidateView[]; needs: Need[]; prefill: { title: string; preferences: string } | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [prefs, setPrefs] = useState(prefill?.preferences ?? "");
  const [budget, setBudget] = useState("");
  const [colors, setColors] = useState("");
  const [cands, setCands] = useState<CandidateView[]>(candidates);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Watched prices refresh quietly when the page opens (the server skips any checked in the last 12 hours).
  useEffect(() => {
    if (!candidates.some((c) => c.watch)) return;
    let live = true;
    fetch("/api/wishlist/prices", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { updated?: Array<{ id: string; price: number | null }> } | null) => {
        if (!live || !b?.updated?.length) return;
        setCands((xs) => xs.map((x) => {
          const u = b.updated!.find((y) => y.id === x.id);
          return u ? { ...x, price: u.price ?? x.price } : x;
        }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [candidates]);

  const toggleWatch = async (c: CandidateView) => {
    const r = await setWatch(c.id, !c.watch);
    if (!r.ok) return setError(r.error);
    setCands((xs) => xs.map((x) => (x.id === c.id ? { ...x, watch: !c.watch, state: !c.watch ? "saved" : x.state, firstPrice: x.firstPrice ?? x.price } : x)));
  };

  const add = async () => {
    setError(null);
    const r = await addWish({ title, preferences: prefs, budget, colors: colors.split(",").map((c) => c.trim()).filter(Boolean) });
    if (!r.ok) return setError(r.error);
    setTitle("");
    setPrefs("");
    setBudget("");
    setColors("");
    router.refresh();
  };

  const find = async (w: WishView) => {
    setBusy(w.id);
    setError(null);
    setNotes((n) => ({ ...n, [w.id]: "Searching stores and reading product photos. This takes up to a minute." }));
    try {
      const res = await fetch("/api/wishlist/source", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wishlistId: w.id }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || "The search failed.");
      const fresh: CandidateView[] = (body.candidates ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        wishId: w.id,
        url: c.url as string,
        name: (c.name as string | null) ?? null,
        brand: (c.brand as string | null) ?? null,
        imageUrl: (c.image_url as string | null) ?? null,
        price: c.price != null ? Number(c.price) : null,
        paletteStatus: (c.palette_status as string | null) ?? null,
        paletteReason: (c.palette_reason as string | null) ?? null,
        state: (c.state as string) ?? "new",
        colors: Array.isArray(c.colors) ? (c.colors as CandidateView["colors"]) : [],
        watch: !!c.watch,
        firstPrice: c.first_price != null ? Number(c.first_price) : null,
      }));
      setCands((xs) => [...fresh, ...xs.filter((x) => !fresh.some((f) => f.id === x.id))]);
      const inPal = fresh.filter((f) => IN_PALETTE.has(f.paletteStatus ?? "")).length;
      setNotes((n) => ({ ...n, [w.id]: body.note ?? `${fresh.length} products read, ${inPal} in your palette. Searched with: ${(body.queries ?? []).join(" · ")}` }));
    } catch (e) {
      setNotes((n) => ({ ...n, [w.id]: e instanceof Error ? e.message : "The search failed." }));
    } finally {
      setBusy(null);
    }
  };

  const review = async (c: CandidateView) => {
    setBusy(c.id);
    const h = await sourcingHaul(c.wishId);
    if (!h.ok || !h.id) {
      setBusy(null);
      return setError(h.ok ? "Could not open a haul" : h.error);
    }
    await fetch("/api/haul/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ haulId: h.id, url: c.url }) });
    router.push(`/hauls/${h.id}`);
  };

  const candState = async (c: CandidateView, state: "saved" | "dismissed") => {
    const r = await setCandidateState(c.id, state);
    if (!r.ok) return setError(r.error);
    setCands((xs) => (state === "dismissed" ? xs.filter((x) => x.id !== c.id) : xs.map((x) => (x.id === c.id ? { ...x, state } : x))));
  };

  const input = "min-w-0 rounded-lg border border-stone-300 px-3 py-2 text-base";

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-medium text-stone-500">Add a wish</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What (e.g. tooled leather belt)" className={input} maxLength={80} />
          <input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Colors, comma separated (optional)" className={input} />
          <input value={prefs} onChange={(e) => setPrefs(e.target.value)} placeholder="Details that matter" className={input + " sm:col-span-2"} maxLength={400} />
          <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budget (optional)" className={input} maxLength={40} />
          <button type="button" onClick={add} disabled={!title.trim()} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            Add to wishlist
          </button>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </section>

      {wishes.length === 0 && <p className="text-sm text-stone-500">Nothing on the wishlist yet.</p>}

      {wishes.map((w) => {
        const mine = cands.filter((c) => c.wishId === w.id);
        const visible = showAll[w.id] ? mine : mine.filter((c) => IN_PALETTE.has(c.paletteStatus ?? "") || c.state === "saved");
        return (
          <section key={w.id} className={"space-y-3 rounded-xl border bg-white p-4 " + (w.status === "open" ? "border-stone-200" : "border-stone-200 opacity-70")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium capitalize">{w.title}</h3>
                {w.preferences && <p className="text-sm text-stone-600">{w.preferences}</p>}
                <p className="text-xs text-stone-500">
                  {[w.budget && `Budget: ${w.budget}`, w.colors.length ? `Colors: ${w.colors.join(", ")}` : null, w.lastSearched && `Last searched ${new Date(w.lastSearched).toLocaleDateString()}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <button type="button" onClick={() => find(w)} disabled={busy === w.id} className="rounded-lg bg-stone-900 px-3 py-1.5 text-white disabled:opacity-60">
                  {busy === w.id ? "Searching…" : "Find options"}
                </button>
                <select
                  value={w.status}
                  onChange={async (e) => {
                    const r = await setWishStatus(w.id, e.target.value as WishView["status"]);
                    if (!r.ok) setError(r.error);
                    else router.refresh();
                  }}
                  className="rounded-lg border border-stone-300 px-2 py-1.5"
                  aria-label="Status"
                >
                  <option value="open">Open</option>
                  <option value="found">Found</option>
                  <option value="dropped">Dropped</option>
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    const r = await deleteWish(w.id);
                    if (!r.ok) setError(r.error);
                    else router.refresh();
                  }}
                  className="px-1 text-stone-400 hover:text-red-700"
                  aria-label={`Delete ${w.title}`}
                >
                  ×
                </button>
              </div>
            </div>
            {notes[w.id] && <p className="text-xs text-stone-500">{notes[w.id]}</p>}
            {visible.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {visible.map((c) => (
                  <div key={c.id} className="overflow-hidden rounded-lg border border-stone-200">
                    <a href={c.url} target="_blank" rel="noreferrer" className="block aspect-square bg-stone-100">
                      {c.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.imageUrl} alt={c.name ?? ""} className="h-full w-full object-contain" referrerPolicy="no-referrer" loading="lazy" />
                      )}
                    </a>
                    <div className="space-y-1 p-2 text-xs">
                      <p className="line-clamp-2 font-medium">{c.name ?? c.url}</p>
                      <p className="text-stone-500">{[c.brand, c.price != null ? `$${c.price.toFixed(2)}` : null].filter(Boolean).join(" · ")}</p>
                      {(() => {
                        const drop = c.watch ? priceDrop(c.firstPrice, c.price) : null;
                        return drop ? (
                          <p className="font-medium text-emerald-800">
                            Down ${drop.amount.toFixed(2)} ({drop.percent}%) since you started watching
                          </p>
                        ) : c.watch ? (
                          <p className="text-stone-500">Watching the price</p>
                        ) : null;
                      })()}
                      <p className={IN_PALETTE.has(c.paletteStatus ?? "") ? "text-emerald-800" : "text-amber-800"}>{c.paletteReason}</p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        <button type="button" onClick={() => review(c)} disabled={busy === c.id} className="rounded-full bg-stone-900 px-2 py-0.5 text-white disabled:opacity-60">
                          {busy === c.id ? "Reviewing…" : "Full review"}
                        </button>
                        {c.state !== "saved" && (
                          <button type="button" onClick={() => candState(c, "saved")} className="rounded-full border border-stone-300 px-2 py-0.5">
                            Save
                          </button>
                        )}
                        {c.price != null && (
                          <button type="button" onClick={() => toggleWatch(c)} className={"rounded-full border px-2 py-0.5 " + (c.watch ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300")}>
                            {c.watch ? "Watching" : "Watch price"}
                          </button>
                        )}
                        <button type="button" onClick={() => candState(c, "dismissed")} className="rounded-full border border-stone-300 px-2 py-0.5">
                          Dismiss
                        </button>
                        <AskFriendsButton target={{ kind: "find", candidateId: c.id }} compact />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {mine.length > visible.length && (
              <button type="button" onClick={() => setShowAll((s) => ({ ...s, [w.id]: !s[w.id] }))} className="text-xs text-stone-500 underline">
                {showAll[w.id] ? "Show only in-palette" : `Show ${mine.length - visible.length} outside your palette`}
              </button>
            )}
          </section>
        );
      })}

      {needs.length > 0 && (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-medium text-stone-500">Coming up</h2>
          <ul className="mt-2 divide-y divide-stone-100 text-sm">
            {needs.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {n.label}
                  {n.season && <span className="ml-2 text-stone-500">{n.season}</span>}
                </span>
                <select
                  defaultValue={n.status}
                  onChange={async (e) => {
                    const r = await upcomingStatus(n.id, e.target.value as "open" | "styled" | "done");
                    if (!r.ok) setError(r.error);
                  }}
                  className="rounded-lg border border-stone-300 px-2 py-1"
                  aria-label="Status"
                >
                  <option value="open">Open</option>
                  <option value="styled">Styled</option>
                  <option value="done">Done</option>
                </select>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
