// Flat placeholder with the card's exact proportions. No pulse: the page
// shows a progress bar instead.
export function ItemCardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden>
      <div className="aspect-[3/4] w-full bg-sunk" />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="h-3.5 w-1/2 bg-sunk" />
          <div className="h-3.5 w-12 bg-sunk" />
        </div>
        <div className="h-3 w-4/5 bg-sunk" />
        <div className="h-3 w-2/5 bg-sunk" />
      </div>
    </div>
  );
}
