import { Skeleton } from "@/components/ui/skeleton";

export default function SwmsLoading() {
  return (
    <div className="p-4 lg:p-8 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-11 w-32" />
      </div>
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-lg" />
      ))}
    </div>
  );
}
