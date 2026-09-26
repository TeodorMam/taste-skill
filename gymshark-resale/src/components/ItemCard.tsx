import Link from "next/link";
import {
  type Item,
  type Profile,
  formatPrice,
  itemImages,
  profileDisplayName,
} from "@/lib/supabase";
import { browserSafeImage } from "@/lib/image";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Avatar } from "@/components/Avatar";

function shippingIcon(s: string | null) {
  if (!s || s === "Kun henting") return null;
  return "📦";
}

export function ItemCard({
  item,
  seller,
  hideSeller = false,
}: {
  item: Item;
  seller?: Profile | null;
  hideSeller?: boolean;
}) {
  const images = itemImages(item);
  const cover = images[0] ?? null;
  const showSeller = !hideSeller && !!item.seller_id;
  const sellerName = profileDisplayName(seller, item.seller_id);

  return (
    <Link
      href={`/vare/${item.id}`}
      className="group block overflow-hidden rounded-sm border border-line bg-raised transition hover:-translate-y-0.5 hover:border-ink"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-sunk">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={browserSafeImage(cover)}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] ${
              item.is_sold ? "opacity-60 grayscale" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-ink-3">
            Ingen bilde
          </div>
        )}
        <FavoriteButton itemId={item.id} currentPrice={item.price} sellerId={item.seller_id} itemTitle={item.title} />
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-sm bg-ink/65 px-2 py-0.5 text-[10px] font-medium text-raised">
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
          <div className="absolute bottom-2 left-2 rounded-sm bg-ink px-2 py-0.5 text-xs font-medium text-paper">
            Solgt
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        {item.brand && (
          <p className="line-clamp-1 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
            {item.brand}
          </p>
        )}
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-medium leading-snug">{item.title}</p>
          <p className="shrink-0 text-sm font-semibold">{formatPrice(item.price)}</p>
        </div>
        <div className="flex items-center justify-between gap-1">
          <p className="line-clamp-1 text-xs text-ink-3">
            Str. {item.size} · {item.condition}
          </p>
          {shippingIcon(item.shipping) && (
            <span className="shrink-0 text-xs" title={item.shipping ?? ""}>
              {shippingIcon(item.shipping)}
            </span>
          )}
        </div>
        {showSeller && (
          <div className="flex items-center gap-1.5 pt-1">
            <Avatar profile={seller} size="xs" />
            <span className="line-clamp-1 text-[11px] text-ink-3">
              {sellerName}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
