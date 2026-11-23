"use client";

import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink, Card, Field, Input, Notice, Skeleton } from "@/components/ui";

type Item = { id: string; name: string | null; brand: string | null; price: number | null };
type State = { status: "idle" } | { status: "adding" } | { status: "error"; message: string } | { status: "done"; item: Item; already: boolean };

const FAILED = "Couldn't add it to your closet. Try again.";

/** "I bought this online": paste the store link and the piece lands in the closet with the store's photo. */
export default function LinkImport({ link = null }: { link?: string | null }) {
  const [state, setState] = useState<State>(link ? { status: "adding" } : { status: "idle" });
  const started = useRef<string | null>(null);

  const add = (url: string) => {
    setState({ status: "adding" });
    fetch("/api/closet/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ link: url }) })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || FAILED);
        setState({ status: "done", item: body.item, already: !!body.already });
        // A refresh shouldn't add it again.
        if (link) window.history.replaceState(null, "", window.location.pathname);
      })
      .catch((e) => setState({ status: "error", message: e instanceof Error ? e.message : FAILED }));
  };

  useEffect(() => {
    if (!link || started.current === link) return;
    started.current = link;
    add(link);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per shared link
  }, [link]);

  const done = state.status === "done" ? state : null;
  return (
    <section className="space-y-3" aria-labelledby="bought-title">
      <h2 id="bought-title" className="font-display text-xl font-bold leading-tight">
        Bought it online?
      </h2>
      <p className="text-sm text-stone-600">Paste the link to the product page. We add it to your closet with the store&apos;s photo and read its color and type.</p>
      <div aria-live="polite" className="space-y-3 empty:hidden">
        {state.status === "adding" && (
          <Card className="flex items-center gap-4">
            <Skeleton className="h-24 w-20 shrink-0 rounded-thumb" />
            <p className="text-sm text-stone-600">Adding it and reading the page. It takes a few seconds.</p>
          </Card>
        )}
        {state.status === "error" && <Notice tone="error">{state.message}</Notice>}
        {done && (
          <Card variant="active" className="space-y-1.5">
            <p className="text-xs font-semibold text-stone-500">{done.already ? "Already in your closet" : "Added to your closet"}</p>
            <p className="line-clamp-2 font-display text-lg font-bold leading-snug">{done.item.name ?? "New piece"}</p>
            <p className="text-sm tabular-nums text-stone-600">{[done.item.brand, done.item.price != null ? `$${Number(done.item.price).toFixed(2)}` : null].filter(Boolean).join(" · ")}</p>
            <div className="pt-1.5">
              <ButtonLink href={`/closet/${done.item.id}`} variant="primary" size="sm">
                Check the details
              </ButtonLink>
            </div>
          </Card>
        )}
      </div>
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const url = String(new FormData(e.currentTarget).get("url") ?? "").trim();
          if (url) add(url);
          e.currentTarget.reset();
        }}
      >
        <Field label={done ? "Add another" : "Product link"} className="min-w-0 flex-1">
          <Input name="url" placeholder="Paste a product link" inputMode="url" autoComplete="off" required />
        </Field>
        <Button type="submit" variant={done ? "secondary" : "primary"} disabled={state.status === "adding"}>
          Add to closet
        </Button>
      </form>
    </section>
  );
}
