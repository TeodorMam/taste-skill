import Link from "next/link";
import { type Item, formatPrice, itemImages } from "@/lib/supabase";

function shippingIcon(s: string | null) {
  if (!s || s === "Kun henting") return null;
  return "📦";
}

export function ItemCard({ item }: { item: Item }) {
  const images = itemImages(item);
  const cover = images[0] ?? null;
  return (
    <Link
      href={`/item/${item.id}`}
      className="group block overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-stone-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={item.title}
            className={`h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] ${
              item.is_sold ? "opacity-60 grayscale" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
            Ingen bilde
          </div>
        )}
        {item.brand && (
          <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#5a6b32] backdrop-blur">
            {item.brand}
          </div>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="3" width="14" height="14" rx="2" />
              <path d="M7 7h14v14H7" />
            </svg>
            {images.length}
          </div>
        )}
        {item.is_sold && (
          <div className="absolute right-2 top-2 rounded-full bg-stone-900 px-2 py-0.5 text-xs font-medium text-stone-50">
            Solgt
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
          <p className="shrink-0 text-sm font-semibold">{formatPrice(item.price)}</p>
        </div>
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs text-stone-500">
            Str. {item.size} · {item.condition} · {item.location}
          </p>
          {shippingIcon(item.shipping) && (
            <span className="shrink-0 text-xs" title={item.shipping ?? ""}>
              {shippingIcon(item.shipping)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
