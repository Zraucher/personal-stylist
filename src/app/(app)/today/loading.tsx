import { Card, OutfitCardSkeleton, Skeleton } from "@/components/ui";

/** A numbered section's index and title, as in TodayView. */
function SectionHead() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-6 rounded-full" />
      <Skeleton className="h-6 w-40 rounded-full" />
    </div>
  );
}

// Today waits on the forecast and the closet: show the page's shape while it loads.
export default function TodayLoading() {
  return (
    <div aria-busy="true" className="space-y-10 sm:space-y-12">
      <span role="status" className="sr-only">
        Loading Today…
      </span>
      <div className="space-y-2">
        <Skeleton className="h-3 w-40 rounded-full" />
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-4 w-64 max-w-full rounded-full" />
      </div>

      {/* Outfit of the day */}
      <OutfitCardSkeleton />

      <section className="space-y-3">
        <SectionHead />
        <Skeleton className="h-14 w-full rounded-control" />
      </section>

      <section className="space-y-3">
        <SectionHead />
        <Card className="space-y-4">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-control" />
            ))}
          </div>
          <Skeleton className="h-4 w-48 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHead />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-card" />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHead />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
      </section>
    </div>
  );
}
