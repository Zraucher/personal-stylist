"use client";

import { useState } from "react";

export default function ShareCard() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [v] = useState(() => Date.now());
  const src = `/api/palette-card?v=${v}`;

  const share = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], "palette.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My palette" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "palette.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        setMsg("Saved palette.png.");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setMsg("Could not share the card. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-stone-500">Share image</h2>
        <button type="button" onClick={share} disabled={busy} className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-60">
          {busy ? "Preparing…" : "Share or save"}
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Palette card" className="mx-auto w-full max-w-xs rounded-lg border border-stone-200" />
      {msg && <p className="text-sm text-stone-600">{msg}</p>}
    </section>
  );
}
