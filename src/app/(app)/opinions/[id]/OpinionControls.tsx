"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { closeOpinion, deleteOpinion } from "../actions";

export default function OpinionControls({ id, url, open }: { id: string; url: string; open: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Does this work on me?", url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      /* dismissed */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {open && (
        <button type="button" onClick={share} className="rounded-full bg-emerald-700 px-4 py-1.5 font-semibold text-white">
          {copied ? "Link copied" : "Share again"}
        </button>
      )}
      <a href={url} className="rounded-full border-[1.5px] border-stone-900 px-4 py-1.5 font-semibold">See what friends see</a>
      {open && (
        <button type="button" disabled={pending} onClick={() => start(async () => void (await closeOpinion(id), router.refresh()))} className="text-stone-600 underline">
          Close voting
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this ask and its votes? The link stops working.")) return;
          start(async () => {
            await deleteOpinion(id);
            router.push("/opinions");
          });
        }}
        className="text-red-700 underline"
      >
        Delete
      </button>
    </div>
  );
}
