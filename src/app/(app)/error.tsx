"use client";

import { useEffect } from "react";
import { Button, PageHeader } from "@/components/ui";

/** Route-level error state for the app: say what happened and offer a retry. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-6">
      <div role="alert">
        <PageHeader title="this page didn&apos;t load" subtitle="Try again, and if it keeps happening, reload the app." />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="primary" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
