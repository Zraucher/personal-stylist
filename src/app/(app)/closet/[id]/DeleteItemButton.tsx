"use client";

import { useTransition } from "react";
import { ConfirmButton } from "@/components/ui";
import { deleteItem } from "../actions";

export default function DeleteItemButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <ConfirmButton
      title="Remove this item?"
      body="Remove this item and its photo? If it just left your closet, set the status to Gone instead."
      confirmLabel="Remove"
      disabled={pending}
      onConfirm={() => startTransition(() => deleteItem(id))}
    >
      <span aria-live="polite">{pending ? "Removing…" : "Remove"}</span>
    </ConfirmButton>
  );
}
