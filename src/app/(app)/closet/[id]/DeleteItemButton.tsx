"use client";

import { useTransition } from "react";
import { deleteItem } from "../actions";

export default function DeleteItemButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this item and its photo? If it just left your closet, set the status to Gone instead.")) return;
        startTransition(() => deleteItem(id));
      }}
      className="text-red-700 hover:underline disabled:opacity-60"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
