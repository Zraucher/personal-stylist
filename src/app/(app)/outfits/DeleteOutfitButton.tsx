"use client";

import { useTransition } from "react";
import { ConfirmButton } from "@/components/ui";
import { deleteOutfit } from "./actions";

export default function DeleteOutfitButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <ConfirmButton
      title="Delete this outfit?"
      body="The pieces stay in your closet. This can't be undone."
      variant="danger"
      size="sm"
      disabled={pending}
      onConfirm={() => start(async () => void (await deleteOutfit(id)))}
    >
      <span aria-live="polite">{pending ? "Deleting…" : "Delete"}</span>
    </ConfirmButton>
  );
}
