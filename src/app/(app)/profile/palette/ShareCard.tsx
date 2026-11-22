"use client";

import { useState } from "react";
import { Button, Card, SectionTitle } from "@/components/ui";

export default function ShareCard({ alt }: { alt: string }) {
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
      if (!(e instanceof DOMException && e.name === "AbortError")) setMsg("Couldn't share the card. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card as="section" className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="mx-auto w-full max-w-[200px] shrink-0 rounded-thumb ring-1 ring-line sm:mx-0" />
      <div className="min-w-0 flex-1 space-y-3">
        <SectionTitle>Share image</SectionTitle>
        <p className="text-sm text-stone-600">Send your palette to a friend, or save it to look at while you shop.</p>
        <Button type="button" variant="primary" size="sm" onClick={share} disabled={busy} aria-busy={busy || undefined}>
          {busy ? "Preparing…" : "Share or save"}
        </Button>
        <p role="status" aria-live="polite" className="text-sm text-stone-600 empty:hidden">
          {msg}
        </p>
      </div>
    </Card>
  );
}
