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
  "2XU",
  "Adidas",
  "Alo Yoga",
  "Alphalete",
  "Arc'teryx",
  "ASICS",
  "ASRV",
  "Athleta",
  "AYBL",
  "Balance Athletica",
  "Bergans",
  "Better Bodies",
  "Beyond Yoga",
  "Björn Borg",
  "Bo+Tee",
  "Born Primitive",
  "Breathe Divinity",
  "Brooks",
  "Buffbunny",
  "Castore",
  "Champion",
  "Craft",
  "Devold",
  "DFYNE",
  "Doyoueven",
  "Echt",
  "Ekkovision",
  "Everlast",
  "Fabletics",
  "Fila",
  "Girlfriend Collective",
  "Gorilla Wear",
  "Gymshark",
  "H&M Move",
  "Helly Hansen",
  "Hoka",
  "Houdini",
  "Hummel",
  "ICANIWILL",
  "Icebreaker",
  "Jed North",
  "Kari Traa",
  "Lorna Jane",
  "LSKD",
  "Lululemon",
  "Mizuno",
  "New Balance",
  "Nike",
  "NOBULL",
  "Norrøna",
  "NVGTN",
  "Odlo",
  "On",
  "Oner Active",
  "Outdoor Voices",
  "Peak Performance",
  "POPFLEX",
  "Puma",
  "Pursue Fitness",
  "RAWGEAR",
  "Reebok",
  "RYDERWEAR",
  "Salomon",
  "Saucony",
  "Savage Barbell",
  "SKIMS",
  "Stoi",
  "Sweaty Betty",
  "Swix",
  "TALA",
  "Under Armour",
  "Vuori",
  "Women's Best",
  "YoungLA",
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
