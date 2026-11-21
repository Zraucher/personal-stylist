"use client";

import { useState, useTransition } from "react";
import { acceptSourcedPhoto, dismissSourcedPhoto } from "./actions";
import { Button, Card, Chip, Notice, Thumb } from "@/components/ui";

export type SourcedItem = {
  id: string;
  name: string | null;
  brand: string | null;
  colors: string;
  source_image_url: string;
  source_page_url: string | null;
};

type RowState = "idle" | "saving" | "done" | "dismissed" | "error";

export default function SourcedList({ items }: { items: SourcedItem[] }) {
  const [state, setState] = useState<Record<string, RowState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busyAll, startAll] = useTransition();

  const set = (id: string, s: RowState) => setState((prev) => ({ ...prev, [id]: s }));

  async function accept(id: string) {
    set(id, "saving");
    const r = await acceptSourcedPhoto(id);
    if (r.ok) set(id, "done");
    else {
      set(id, "error");
      setErrors((prev) => ({ ...prev, [id]: r.error }));
    }
  }

  async function dismiss(id: string) {
    set(id, "saving");
    const r = await dismissSourcedPhoto(id);
    set(id, r.ok ? "dismissed" : "error");
    if (!r.ok) setErrors((prev) => ({ ...prev, [id]: r.error }));
  }

  const open = items.filter((i) => !["done", "dismissed"].includes(state[i.id] ?? "idle"));

  return (
    <div className="space-y-4">
      {open.length > 1 && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={busyAll}
          aria-busy={busyAll || undefined}
          onClick={() =>
            startAll(async () => {
              // One at a time, so a slow retailer does not stall the rest.
              for (const i of open) await accept(i.id);
            })
          }
        >
          {busyAll ? "Saving…" : `Use all ${open.length} photos`}
        </Button>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {items.map((item) => {
          const s = state[item.id] ?? "idle";
          return (
            <Card key={item.id} pad="none" className="flex flex-col p-1.5">
              <Thumb
                src={item.source_image_url}
                alt={item.name ?? ""}
                product
                size="fill"
                className={s === "dismissed" ? "opacity-40" : undefined}
                badge={
                  s === "done" ? (
                    <Chip tone="overlay" className="absolute left-2 top-2">
                      Saved
                    </Chip>
                  ) : s === "dismissed" ? (
                    <Chip tone="overlay" className="absolute left-2 top-2">
                      Skipped
                    </Chip>
                  ) : undefined
                }
              />
              <div className="flex flex-1 flex-col gap-2 px-1.5 pb-1.5 pt-2.5">
                <div>
                  <p className="text-sm font-semibold leading-tight">{item.name}</p>
                  <p className="mt-0.5 text-xs text-stone-500">{[item.brand, item.colors].filter(Boolean).join(" · ")}</p>
                </div>
                <div role="status" aria-live="polite" className="contents">
                  {s === "done" ? (
                    <p className="text-sm font-medium text-stone-700">
                      <span aria-hidden="true">✓ </span>Saved
                    </p>
                  ) : s === "dismissed" ? (
                    <p className="text-sm text-stone-500">Skipped. Add your own photo later.</p>
                  ) : null}
                </div>
                {s !== "done" && s !== "dismissed" && (
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <Button type="button" size="sm" className="flex-1" disabled={s === "saving" || busyAll} aria-busy={s === "saving" || undefined} onClick={() => accept(item.id)}>
                      {s === "saving" ? "Saving…" : "Use photo"}
                    </Button>
                    <Button type="button" variant="quiet" size="sm" disabled={s === "saving" || busyAll} onClick={() => dismiss(item.id)}>
                      Not mine
                    </Button>
                  </div>
                )}
                {s === "error" && (
                  <Notice tone="error">
                    {errors[item.id]}
                  </Notice>
                )}
                {item.source_page_url && (
                  <a
                    href={item.source_page_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-6 items-center text-xs text-stone-500 underline underline-offset-2 hover:text-stone-900"
                  >
                    Source page<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
