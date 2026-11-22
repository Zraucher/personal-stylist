"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

/** Submit for the new-haul form: shows progress and blocks a double tap from creating two hauls. */
export default function StartHaulButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending} aria-busy={pending || undefined}>
      {pending ? "Starting…" : "Start a haul review"}
    </Button>
  );
}
