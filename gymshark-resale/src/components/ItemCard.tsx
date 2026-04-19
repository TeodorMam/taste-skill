import Link from "next/link";
import type { Item } from "@/lib/supabase";

export function ItemCard({ item }: { item: Item }) {
  return (
    <Link
      href={`/item/${item.id}`}
      className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-neutral-400"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
            No image
          </div>
        )}
        {item.is_sold && (
          <div className="absolute left-2 top-2 rounded-full bg-black px-2 py-0.5 text-xs font-medium text-white">
            Sold
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
          <p className="shrink-0 text-sm font-semibold">{item.price} kr</p>
        </div>
        <p className="text-xs text-neutral-500">
          Size {item.size} · {item.condition} · {item.location}
        </p>
      </div>
    </Link>
  );
}
