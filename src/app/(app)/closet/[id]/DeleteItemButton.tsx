"use client";

import { useTransition } from "react";
import { ConfirmButton } from "@/components/ui";
import { deleteItem } from "../actions";

export default function DeleteItemButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <ConfirmButton
      title="Delete this piece?"
      body="Its photo goes too. If it just left your closet, mark it Gone instead. This can't be undone."
      confirmLabel="Delete"
      disabled={pending}
      onConfirm={() => startTransition(() => deleteItem(id))}
    >
      <span aria-live="polite">{pending ? "Deleting…" : "Delete"}</span>
    </ConfirmButton>
  );
}
