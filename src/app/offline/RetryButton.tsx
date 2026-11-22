"use client";

import { Button } from "@/components/ui";

/** Reload the page the person was trying to open; the service worker serves this page only while offline. */
export default function RetryButton() {
  return (
    <Button type="button" variant="primary" onClick={() => window.location.reload()}>
      Try again
    </Button>
  );
}
