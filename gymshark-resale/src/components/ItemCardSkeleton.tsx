export function ItemCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-sm border border-line bg-raised">
      <div className="aspect-square w-full animate-pulse bg-sunk" />
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-3/5 animate-pulse rounded-sm bg-line" />
          <div className="h-3 w-12 animate-pulse rounded-sm bg-line" />
        </div>
        <div className="h-2.5 w-4/5 animate-pulse rounded-sm bg-sunk" />
      </div>
    </div>
  );
}
