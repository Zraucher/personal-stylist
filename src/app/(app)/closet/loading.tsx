import { GridSkeleton, Skeleton } from "@/components/ui";

export default function ClosetLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading your closet">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-4 w-44 rounded-full" />
      </div>
      <GridSkeleton />
    </div>
  );
}
