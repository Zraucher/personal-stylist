"use client";

import { useEffect, useRef, useState } from "react";
import { toCandidateView } from "../wishlist/view";
import type { CandidateView } from "../wishlist/WishlistClient";
import { Button, ButtonLink, Card, Chip, Field, Input, Notice, Skeleton, Thumb } from "@/components/ui";

type State = { status: "idle" } | { status: "saving" } | { status: "error"; message: string } | { status: "done"; item: CandidateView; already: boolean; read: boolean };

const FAILED = "Couldn't save that. Try again.";

export default function SaveClient({ link, noLink }: { link: string | null; noLink: boolean }) {
  const [state, setState] = useState<State>(
    link ? { status: "saving" } : noLink ? { status: "error", message: "We couldn't find a link in what was shared. Paste the product page's address." } : { status: "idle" }
  );
  const started = useRef<string | null>(null);
  const bookmark = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!link || started.current === link) return;
    started.current = link;
    fetch("/api/wishlist/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ link }) })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || FAILED);
        setState({ status: "done", item: toCandidateView(body.candidate), already: !!body.already, read: !!body.read });
        // A refresh shouldn't save it again.
        window.history.replaceState(null, "", "/save");
      })
      .catch((e) => setState({ status: "error", message: e instanceof Error ? e.message : FAILED }));
  }, [link]);

  // React won't render a javascript: link, so the browser button gets its address here.
  useEffect(() => {
    bookmark.current?.setAttribute("href", `javascript:location.href='${window.location.origin}/save?url='+encodeURIComponent(location.href)`);
  }, []);

  const done = state.status === "done" ? state : null;
  const item = done?.item;
  return (
    <div className="space-y-6">
      <div aria-live="polite" className="space-y-3 empty:hidden">
        {state.status === "saving" && (
          <Card className="flex items-center gap-4">
            <Skeleton className="h-24 w-20 shrink-0 rounded-thumb" />
            <p className="text-sm text-stone-600">Saving it and reading the page. It takes a few seconds.</p>
          </Card>
        )}
        {state.status === "error" && <Notice tone="error">{state.message}</Notice>}
        {done && item && (
          <Card variant="active" className="flex gap-4">
            <div className="w-24 shrink-0">
              <Thumb src={item.imageUrl} alt="" product />
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="text-xs font-semibold text-stone-500">{done.already ? "Already saved" : "Saved"}</p>
              <p className="line-clamp-2 font-display text-lg font-bold leading-snug">{item.name ?? item.url}</p>
              <p className="text-sm tabular-nums text-stone-600">{[item.brand, item.price != null ? `$${item.price.toFixed(2)}` : null].filter(Boolean).join(" · ")}</p>
              <div className="flex flex-wrap gap-1">
                {["good", "ok"].includes(item.paletteStatus ?? "") && <Chip tone="outline">✓ in palette</Chip>}
                {["caution", "fail"].includes(item.paletteStatus ?? "") && <Chip tone="outline">outside your palette</Chip>}
                {item.watch && <Chip tone="neutral">Watching the price</Chip>}
              </div>
              {!done.read && <p className="text-xs text-stone-500">We kept the link, but couldn&apos;t read the store&apos;s page for a photo or price.</p>}
              <div className="pt-1.5">
                <ButtonLink href="/wishlist#saved" variant="primary" size="sm">
                  See saved products
                </ButtonLink>
              </div>
            </div>
          </Card>
        )}
      </div>

      <form action="/save" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label={item ? "Save another" : "Product link"} className="min-w-0 flex-1">
          <Input name="url" placeholder="Paste a product link" inputMode="url" autoComplete="off" required />
        </Field>
        <Button type="submit" variant={item ? "secondary" : "primary"}>
          Save
        </Button>
      </form>

      <section className="space-y-3" aria-labelledby="anywhere-title">
        <h2 id="anywhere-title" className="font-display text-xl font-bold leading-tight">
          Save without opening valette
        </h2>
        <ul className="divide-y divide-line rounded-card bg-card px-4 text-sm leading-relaxed text-stone-700 ring-1 ring-line">
          <li className="space-y-1 py-3">
            <p className="font-semibold text-stone-900">Android</p>
            <p>Install valette from your browser&apos;s menu. Then on any product page tap Share and pick valette.</p>
          </li>
          <li className="space-y-1 py-3">
            <p className="font-semibold text-stone-900">iPhone</p>
            <p>
              In the Shortcuts app, make a shortcut that receives URLs from the Share Sheet. Add URL Encode, then Open URLs with <span className="break-all font-medium">myvalette.com/save?url=</span> followed by the encoded text. After that, tap Share and pick your shortcut.
            </p>
          </li>
          <li className="space-y-2 py-3">
            <p className="font-semibold text-stone-900">Computer</p>
            <p>Drag this button to your bookmarks bar. Click it on any product page.</p>
            <a ref={bookmark} onClick={(e) => e.preventDefault()} className="inline-flex h-9 cursor-grab items-center rounded-full px-4 text-sm font-semibold ring-1 ring-stone-900">
              Save to valette
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
