import { Skeleton } from "@/components/ui";

/** Route-level loading state for the app: a header-shaped bar and three card blocks. */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-48 rounded-control sm:h-9" />
        <Skeleton className="h-4 w-64 max-w-full rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}
