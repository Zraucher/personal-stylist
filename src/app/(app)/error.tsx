"use client";

import { useEffect } from "react";
import { Button, Notice, PageHeader } from "@/components/ui";

/** Route-level error state for the app: say what happened and offer a retry. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-6">
      <PageHeader title="something went wrong" />
      <Notice tone="error">This page didn&apos;t load. Try again, and if it keeps happening, reload the app.</Notice>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="primary" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
