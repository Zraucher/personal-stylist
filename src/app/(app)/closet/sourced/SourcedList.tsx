"use client";

import { useState, useTransition } from "react";
import { acceptSourcedPhoto, dismissSourcedPhoto } from "./actions";

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
        <button
          type="button"
          disabled={busyAll}
          onClick={() =>
            startAll(async () => {
              // One at a time, so a slow retailer does not stall the rest.
              for (const i of open) await accept(i.id);
            })
          }
          className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busyAll ? "Saving…" : `Use all ${open.length} photos`}
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const s = state[item.id] ?? "idle";
          return (
            <div key={item.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <div className="aspect-square bg-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.source_image_url}
                  alt={item.name ?? ""}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className={"h-full w-full object-contain " + (s === "dismissed" ? "opacity-30" : "")}
                />
              </div>
              <div className="space-y-2 p-3">
                <div>
                  <p className="text-sm font-medium leading-tight">{item.name}</p>
                  <p className="text-xs text-stone-500">
                    {[item.brand, item.colors].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {s === "done" ? (
                  <p className="text-sm text-emerald-700">Saved</p>
                ) : s === "dismissed" ? (
                  <p className="text-sm text-stone-500">Skipped. Add your own photo later.</p>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={s === "saving" || busyAll}
                      onClick={() => accept(item.id)}
                      className="flex-1 rounded-lg bg-stone-900 px-2 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {s === "saving" ? "Saving…" : "Use photo"}
                    </button>
                    <button
                      type="button"
                      disabled={s === "saving" || busyAll}
                      onClick={() => dismiss(item.id)}
                      className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm disabled:opacity-60"
                    >
                      Not mine
                    </button>
                  </div>
                )}
                {s === "error" && <p className="text-xs text-red-700">{errors[item.id]}</p>}
                {item.source_page_url && (
                  <a href={item.source_page_url} target="_blank" rel="noreferrer" className="block text-xs text-stone-500 underline">
                    Source page
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
