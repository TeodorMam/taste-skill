export type Item = {
  id: string;
  title: string;
  image_url: string | null;
  size: string;
  price: number;
  condition: string;
  location: string;
  contact: string;
  brand: string | null;
  seller_id: string | null;
  is_sold: boolean;
  created_at: string;
};

export type Message = {
  id: string;
  item_id: string;
  buyer_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export const BUCKET = "item-images";

export const BRANDS = [
  "Gymshark",
  "NVGTN",
  "Alphalete",
  "Nike",
  "Lululemon",
  "Adidas",
  "Under Armour",
  "Puma",
  "Reebok",
  "New Balance",
  "ASICS",
  "Hoka",
  "On",
  "Salomon",
  "Arc'teryx",
  "Vuori",
  "TALA",
  "YoungLA",
  "Castore",
  "RYDERWEAR",
  "Bo+Tee",
  "Oner Active",
  "SKIMS",
  "Fabletics",
  "Björn Borg",
  "H&M Move",
  "Kari Traa",
  "Stoi",
  "ICANIWILL",
  "Better Bodies",
  "Peak Performance",
  "Norrøna",
  "Helly Hansen",
  "Houdini",
  "Everlast",
  "Other",
] as const;

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export const CONDITIONS = [
  "Ny med merkelapp",
  "Som ny",
  "God",
  "Brukt",
] as const;

export const AREAS = [
  "Oslo",
  "Bergen",
  "Trondheim",
  "Stavanger",
  "Tromsø",
  "Kristiansand",
  "Drammen",
  "Bodø",
  "Annet",
] as const;

export const PRICE_BUCKETS = [
  { key: "u200", label: "Under 200 kr", min: 0, max: 200 },
  { key: "200-500", label: "200–500 kr", min: 200, max: 500 },
  { key: "500-1000", label: "500–1000 kr", min: 500, max: 1000 },
  { key: "o1000", label: "Over 1000 kr", min: 1000, max: Number.POSITIVE_INFINITY },
] as const;

export type PriceBucketKey = (typeof PRICE_BUCKETS)[number]["key"];

export function formatPrice(n: number): string {
  return `${new Intl.NumberFormat("no-NO").format(n)} kr`;
}
