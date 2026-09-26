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
import { Icon } from "@/components/Icon";
import { Sep } from "@/components/Sep";

function ships(s: string | null) {
  return !!s && s !== "Kun henting";
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

  // No container: the photo and the price carry the card. No hover lift or
  // zoom either, the pointer cursor is enough.
  return (
    <Link href={`/vare/${item.id}`} className="group flex min-w-0 flex-col gap-2.5">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-sunk">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={browserSafeImage(cover)}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover object-[50%_30%] ${item.is_sold ? "opacity-70" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-ink-3">
            Ingen bilde
          </div>
        )}
        <FavoriteButton itemId={item.id} currentPrice={item.price} sellerId={item.seller_id} itemTitle={item.title} />
        {images.length > 1 && (
          <div className="num absolute bottom-2 right-2 flex h-[22px] items-center gap-[5px] rounded-sm bg-ink px-[7px] text-xs font-semibold leading-none text-paper">
            <Icon name="bilder" size={12} />
            {images.length}
          </div>
        )}
        {item.is_sold && (
          <div className="absolute bottom-2 left-2 flex h-[22px] items-center rounded-sm bg-ink px-[7px] text-xs font-semibold leading-none text-paper">
            Solgt
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-[15px] font-[650] leading-[1.3]">{item.brand ?? item.title}</p>
          <p className="price shrink-0 text-[15px] leading-[1.3]">{formatPrice(item.price)}</p>
        </div>
        {item.brand && <p className="truncate text-sm leading-[1.35] text-ink-2">{item.title}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[13px] leading-[1.4] text-ink-3">
            Str. {item.size}
            <Sep />
            {item.condition}
          </p>
          {ships(item.shipping) && (
            <span className="shrink-0 text-ink-2" title={item.shipping ?? ""}>
              <Icon name="pakke" size={16} />
            </span>
          )}
        </div>
        {showSeller && (
          <div className="flex min-w-0 items-center gap-1.5 pt-1.5">
            <Avatar profile={seller} size="xs" />
            <span className="truncate text-xs text-ink-3">{sellerName}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
