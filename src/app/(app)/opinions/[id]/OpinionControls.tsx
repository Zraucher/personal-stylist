"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { closeOpinion, deleteOpinion } from "../actions";
import { Button, ConfirmButton, buttonClass } from "@/components/ui";

export default function OpinionControls({ id, url, open }: { id: string; url: string; open: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  // "Link copied" is a moment, not a state: the label goes back after two seconds.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

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
    <div className="flex flex-wrap items-center gap-2">
      {open && (
        <Button type="button" variant="primary" size="sm" onClick={share}>
          {copied ? "Link copied" : "Share again"}
        </Button>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
      <a href={url} className={buttonClass("secondary", "sm")}>
        See what friends see
      </a>
      {open && (
        <ConfirmButton
          variant="quiet"
          confirmTone="neutral"
          disabled={pending}
          title="Close voting?"
          body="Friends won't be able to vote any more, and voting can't be reopened."
          confirmLabel="Close voting"
          cancelLabel="Keep it open"
          onConfirm={() => start(async () => void (await closeOpinion(id), router.refresh()))}
        >
          Close voting
        </ConfirmButton>
      )}
      <ConfirmButton
        disabled={pending}
        title="Delete this ask and its votes?"
        body="The link stops working."
        onConfirm={() =>
          start(async () => {
            await deleteOpinion(id);
            router.push("/opinions");
          })
        }
      >
        Delete
      </ConfirmButton>
    </div>
  );
}
