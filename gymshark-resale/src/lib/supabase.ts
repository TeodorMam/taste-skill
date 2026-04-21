export type Item = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  size: string;
  price: number;
  condition: string;
  category: string | null;
  location: string;
  contact: string;
  brand: string | null;
  seller_id: string | null;
  is_sold: boolean;
  shipping: string | null;
  created_at: string;
};

export const SHIPPING_OPTIONS = [
  { value: "Kan sendes", label: "📦 Kan sendes", hint: "Kjøper betaler frakt" },
  { value: "Kun henting", label: "🤝 Kun henting", hint: "Møtes lokalt" },
  { value: "Begge", label: "📦🤝 Begge", hint: "Fleksibel" },
] as const;

export type Message = {
  id: string;
  item_id: string;
  buyer_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export const BUCKET = "item-images";

export const MAX_IMAGES = 10;

export const BRANDS = [
  "2POOD",
  "2XU",
  "ADAPT",
  "Adidas",
  "Aim'n",
  "Akila",
  "Alala",
  "Alex Crane",
  "Alexander Wang Active",
  "Alo Yoga",
  "Alphalete",
  "Altra",
  "Anta",
  "Arc'teryx",
  "ASICS",
  "ASRV",
  "Athleta",
  "AYBL",
  "Backcountry",
  "Balance Athletica",
  "Bandit Running",
  "Bergans",
  "Better Bodies",
  "Beyond Yoga",
  "Björn Borg",
  "Black Diamond",
  "Blackstrap",
  "Bo+Tee",
  "Bombshell Sportswear",
  "Born Primitive",
  "Breathe Divinity",
  "Brooks",
  "Brunotti",
  "Buffbunny",
  "Cadenshae",
  "Carbon38",
  "Castore",
  "CEP",
  "Champion",
  "Chari & Co",
  "Ciele Athletics",
  "Columbia",
  "Contender",
  "Craft",
  "CRZ Yoga",
  "Danskin",
  "Decathlon",
  "Devold",
  "DFYNE",
  "District Vision",
  "Doyoueven",
  "Dynafit",
  "Echt",
  "Ekkovision",
  "Ellesse",
  "Energetics",
  "Erke",
  "Everlast",
  "Fabletics",
  "Falke",
  "Fila",
  "Fjällräven",
  "Free People Movement",
  "Fusion",
  "GapFit",
  "Gavelo",
  "Girlfriend Collective",
  "Gorilla Wear",
  "Gornation",
  "GOREWEAR",
  "Goruck",
  "Gramicci",
  "Gym King",
  "Gym Plus Coffee",
  "Gymreapers",
  "Gymshark",
  "H&M Move",
  "Haglöfs",
  "Halara",
  "Helly Hansen",
  "Hoka",
  "Houdini",
  "Hummel",
  "Hylete",
  "ICANIWILL",
  "Icebreaker",
  "Inov-8",
  "Iron Tanks",
  "Jaked",
  "Janji",
  "Jed North",
  "Joah Brown",
  "Johaug",
  "Jordan",
  "Julbo",
  "Kappa",
  "Kari Traa",
  "Kempa",
  "Kilpi",
  "Kjus",
  "Klim",
  "La Sportiva",
  "Lacoste Sport",
  "Le Coq Sportif",
  "Lilybod",
  "Live Fit Apparel",
  "Lole",
  "Lorna Jane",
  "LSKD",
  "Lululemon",
  "Maap",
  "Macpac",
  "Macron",
  "Mammut",
  "Manduka",
  "Marika",
  "Marmot",
  "Merrell",
  "Michi",
  "Millet",
  "Mizuno",
  "Moncler Grenoble",
  "Mons Royale",
  "Montane",
  "Mountain Hardwear",
  "Mountain Warehouse",
  "MP MyProtein",
  "Muscle Nation",
  "Nathan Sports",
  "New Balance",
  "Nike",
  "NOBULL",
  "Norrøna",
  "North Sails",
  "Nux Active",
  "NVGTN",
  "Odlo",
  "Oiselle",
  "On",
  "Oner Active",
  "Onzie",
  "Outdoor Research",
  "Outdoor Voices",
  "P.E Nation",
  "Patagonia",
  "Peak Performance",
  "Picture Organic",
  "POC",
  "POPFLEX",
  "Prana",
  "PrimaDonna Sport",
  "Puma",
  "Pursue Fitness",
  "Quiksilver",
  "Rab",
  "Rapha",
  "RAWGEAR",
  "Reebok",
  "Reflex Active",
  "Reigning Champ",
  "Rhone",
  "Rip Curl",
  "Roark",
  "Roxy",
  "RYDERWEAR",
  "Salewa",
  "Salomon",
  "Satisfy",
  "Saucony",
  "Savage Barbell",
  "Saysky",
  "Scott",
  "Silou",
  "SKIMS",
  "Smartwool",
  "Soar Running",
  "Speedo",
  "Stance",
  "Stio",
  "Stoi",
  "Strix",
  "Sugoi",
  "Sundried",
  "Superdry Sport",
  "Sweaty Betty",
  "Swix",
  "TALA",
  "Tasc Performance",
  "Ten Thousand",
  "Terez",
  "The North Face",
  "Tiger of Sweden Sport",
  "Title Nine",
  "Tracksmith",
  "Tridri",
  "Tufte Wear",
  "Ultimate Direction",
  "Umbro",
  "Under Armour",
  "USA Pro",
  "Vans",
  "Varley",
  "Veja",
  "Vuori",
  "Wacoal Sport",
  "Wilson",
  "Women's Best",
  "Wrangler ATG",
  "X-Bionic",
  "YoungLA",
  "Zella",
  "Zoot",
  "Other",
] as const;

export const CATEGORIES = [
  "Overdel",
  "Sports-BH",
  "Tights",
  "Shorts",
  "Joggebukse",
  "Jakke",
  "Sko",
  "Sokker",
  "Tilbehør",
  "Sett",
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

export function itemImages(item: Pick<Item, "image_url" | "image_urls">): string[] {
  if (Array.isArray(item.image_urls) && item.image_urls.length > 0) {
    return item.image_urls;
  }
  return item.image_url ? [item.image_url] : [];
}
