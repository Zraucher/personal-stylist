import { OutfitCardSkeleton, Skeleton } from "@/components/ui";

// Today waits on the forecast and the closet: show the page's shape while it loads.
export default function TodayLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <span role="status" className="sr-only">
        Loading Today…
      </span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-4 w-64 rounded-full" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <OutfitCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
