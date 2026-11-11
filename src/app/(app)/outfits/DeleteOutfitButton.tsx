"use client";

import { useTransition } from "react";
import { deleteOutfit } from "./actions";

export default function DeleteOutfitButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this outfit? The pieces stay in your closet.")) start(async () => void (await deleteOutfit(id)));
      }}
      className="text-xs text-stone-500 hover:text-red-700 disabled:opacity-50"
    >
      {pending ? "Deleting" : "Delete"}
    </button>
  );
}
