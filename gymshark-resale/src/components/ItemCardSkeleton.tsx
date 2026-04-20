export function ItemCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="aspect-square w-full animate-pulse bg-stone-100" />
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-3/5 animate-pulse rounded bg-stone-200" />
          <div className="h-3 w-12 animate-pulse rounded bg-stone-200" />
        </div>
        <div className="h-2.5 w-4/5 animate-pulse rounded bg-stone-100" />
      </div>
    </div>
  );
}
