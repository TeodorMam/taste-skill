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
  "Vuori",
  "TALA",
  "YoungLA",
  "Castore",
  "Björn Borg",
  "H&M Move",
  "Everlast",
  "Fabletics",
  "Other",
] as const;
