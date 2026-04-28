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
  contact: string | null;
  brand: string | null;
  seller_id: string | null;
  is_sold: boolean;
  sold_to_buyer_id: string | null;
  shipping: string | null;
  created_at: string;
  updated_at: string;
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

export type Review = {
  id: string;
  item_id: string;
  reviewer_id: string;
  seller_id: string;
  is_positive: boolean | null;
  rating: number | null;
  comment: string | null;
  created_at: string;
};

export type SavedSearch = {
  id: string;
  user_id: string;
  label: string;
  filters: Record<string, string>;
  last_seen_at: string;
  created_at: string;
};

export type Offer = {
  id: string;
  item_id: string;
  buyer_id: string;
  amount: number;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

export type Profile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
};

export function summarizeReviews(reviews: Review[]) {
  const total = reviews.length;
  const positive = reviews.filter((r) => r.is_positive).length;
  const pct = total === 0 ? 0 : Math.round((positive / total) * 100);
  return { total, positive, negative: total - positive, pct };
}

export function averageRating(reviews: Review[]): { avg: number; total: number } | null {
  const rated = reviews.filter((r) => r.rating !== null && r.rating !== undefined);
  if (rated.length === 0) return null;
  const avg = rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length;
  return { avg: Math.round(avg * 10) / 10, total: rated.length };
}

export function profileDisplayName(
  profile: Profile | null | undefined,
  sellerId: string | null | undefined,
): string {
  const name = profile?.display_name?.trim();
  if (name) return name;
  const short = (sellerId ?? "").slice(0, 6);
  return short ? `Selger #${short}` : "Selger";
}

export function profileInitials(
  profile: Profile | null | undefined,
  sellerId: string | null | undefined,
): string {
  const name = profile?.display_name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return (sellerId ?? "??").slice(0, 2).toUpperCase();
}

export const BUCKET = "item-images";
export const AVATAR_BUCKET = "item-images";

export const MAX_IMAGES = 10;

export const BRANDS = [
  "2POOD","2XU","686","7Mesh","A7","Aclima","Adanola","Adidas","Adidas TERREX","Aim'n","Airblaster","ALÉ Cycling","Alo Yoga","Alphalete","Altra","Anaconda Sport","Anita Active","Anon","Anta","Aqua Sphere","Arc'teryx","Arena","Asics","ASRV","ASPYR","Assos","Astral","Athleta","Atomic","Attaquer","AYBL","Babolat","Backcountry","Bad Boy","Balance Athletica","Baleaf","Bandit Running","Bauer","Bauerfeind","Bear KompleX","Bench Sport","Bergans","Better Bodies","Beyond Yoga","Black Crows","Black Diamond","Black Sheep Cycling","Blackstrap","Blackyak","BlueSeventy","Bo+Tee","Body Engineers","Bombshell Sportswear","Boon Sport","Born Primitive","Born Tough","Brooks","Brute Force","Buff","Buffbunny","Bullpadel","Burton","Cadenshae","Café du Cycliste","Carbon38","Casall","Castelli","Castore","CCM","CEP","Champion","Chrome Industries","Ciele Athletics","Cleto Reyes","Cliff Keen","Columbia","Compressport","Concept2","Contender","Cor Surf","Cotopaxi","Craft","CrossFit Mayhem","CRZ Yoga","Daehlie","Dainese","Dakine","Danner","Decathlon","DeFeet","Descente","Deuter","Devold","DFYNE","dhb","Diadora","District Vision","Dolfin","Doyoueven","Drop of Mindfulness","Dunlop","Dynafit","Dynastar","Easton","Echt","Ecoalf","Ecoonail","Eddie Bauer","Edelrid","Eider","Eivy","Ekkovision","Eleiko","Elan Skis","Ellesse","Endura","Energetics","Engelbert Strauss","Engine Swim","Enve","Equiline","Erke","Errea","Eskadron","Etxeondo","Evolv","Fabletics","FairTex","Falke","Faction Skis","FILA","Fischer","Five Ten","Fjällräven","FootJoy","Form Athletica","Fox Racing","Free Fly","Free People Movement","Funkita","Funky Trunks","Fusion","G/Fore","Gaiam","Galvin Green","GapFit","Garmont","Gavelo","Giordana","Giro","Girlfriend Collective","Gobik","Goldwin","Gore Wear","Gorilla Wear","Gornation","Goruck","Gramicci","Gregory","Grivel","Gym King","Gym Plus Coffee","Gymreapers","Gymshark","H&M Move","Haglöfs","Halara","Hanwag","Hayabusa","HEAD","Hellie Active","Helly Hansen","HOKA","Houdini","Hummel","HUUB","Hylete","ICANIWILL","Icebreaker","Iffley Road","Inov-8","Inzer","Iron Tanks","Isadore","Jack Wolfskin","JAKO","Jaked","Janji","Janus","Jed North","J.Lindeberg","Joah Brown","Johaug","Joma","JOLYN","Jordan","Julbo","K-Swiss","Kabuki Strength","Kappa","Kari Traa","Karpos","Kask","Karhu","Keen","Kempa","Kilpi","Kingsland","Kjus","Klättermusen","Klim","Koral","Kuhl","La Sportiva","Lacoste Sport","Lake Cycling","Le Bent","Le Col","Le Coq Sportif","Leki","Lems","Li-Ning","Liforme","Liquido Active","Live Fit Apparel","Lole","Lorna Jane","Lowa","LSKD","Lululemon","Lundhags","Maap","Macpac","Macron","Madison","Mammut","Manduka","Manto","Marmot","Mavic","McDavid","Meindl","Merrell","Metolius","Michi","Millet","Mizuno","Mons Royale","Montane","Montbell","Mountain Equipment","Mountain Hardwear","Mountain Warehouse","MP MyProtein","Muscle Nation","Mystic","Nathan Sports","NEMO Equipment","New Balance","Newton Running","Nike","NN Running Team","NOBULL","Norda","Nordica","Norrøna","North Sails","NUX Active","NVGTN","Odlo","Oiselle","On","Oner Active","Onia","Onzie","Orage","Ortovox","Osprey","Ostroy","Outdoor Research","Outdoor Voices","P.E Nation","Pas Normal Studios","Patagonia","Pearl Izumi","Peak Performance","Petzl","Phenix","Picture Organic","Pikeur","Pinarello","POC","POPFLEX","Prana","Prince Tennis","PrimaDonna Sport","Pro Touch","Puma","Pursue Fitness","Q36.5","Rab","Rabbit","Rapha","RAWGEAR","Rawlings","RDX","Reebok","Reflex Active","Reusch","Rhone","Rival Boxing","Roa Hiking","Roar Active","Rogue Fitness","Roka","Rossignol","Rukka","Russell Athletic","RYDERWEAR","Saab Sport","Salewa","Salomon","Santini","Satisfy","Saucony","Savage Barbell","Saysky","SBD","Scarpa","Schöffel","Scott","Sea to Summit","Sergio Tacchini","Set Active","Shimano","Silca","Silvini","Sitka","Skinz","Skogstad","Skyrunning Apparel","Smartwool","Smith","Snow Peak","Soar Running","SOL Republic Sport","SoftStar","Specialized","Speedo","Spiritual Gangster","Splits59","Sportful","Spyder","Stance","Stio","Stoi","Stormberg","Strix","Sub Sports","Sugoi","Sundried","Sweaty Betty","Sweet Protection","Swix","TALA","Tasc Performance","Tatami","Technifibre","Ten Thousand","Tenaya","Tenson","Terez","The North Face","Thirty Two","Thorlo","Title Boxing","Title Nine","Topo Athletic","Topo Designs","Tracksmith","Trango","Trec Wear","Trek","Tridri","Trimtex","True Hockey","Tufte Wear","Twins Special","TYR","UA Project Rock","Ulvang","Ultimate Direction","Umbro","Under Armour","Universal Colours","USA Pro","Vaara","Varley","Vasque","Vaude","Velocio","Venum","Vervest","Vibram FiveFingers","Virus","Vivobarefoot","Volt Athletics","Vuori","Warrior Hockey","Westcomb","Wild Country","Wilier","Wilson","Women's Best","X-Bionic","Xero Shoes","Xtep","YONEX","Yokkao","YoungLA","Zella","Zoot","100% Cycling","2POOD Performance","Adidas Combat","Adidas Padel","Aether Apparel","Albion Cycling","Aktiv","Alphasweat","Anita Sports","Aspirelle","Athletic Brewing Apparel","Beal","BlackCrown Padel","Bonfire","Booster Fight Gear","Boreal","Brunotti","Buddha Fight Wear","Butora","Cadenshae Active","Cannondale Apparel","Carve Designs","Cervélo","Champion Reverse Weave","Cliff Keen Wrestling","Compressana","Cube Apparel","Dakine Cycling","Dare2b","DC Snowboard","DMM Climbing","Drop Shot Padel","Edelweiss","Elite Cycling","Endura MT500","Erima","ETC Cycling","Ferrini","Forclaz","Fox Head","Free Country Outdoor","Garmin Apparel","Garneau","Halti","Hanesbrands Sport","Helimot","Hylete Performance","Iguaneye","Inaria","Iron Bull Strength","Iron Roots","Janus Norway","Karbon","Kelvin Active","Kong Climbing","Lacrosse Footwear","Lafuma","Lake MTB","Leatt","Liiteguard","LMNT Apparel","Lotto Sport","Mad Rock","Mariner Outdoor","Maverik Lacrosse","Met Helmets","Millet Mountaineering","Mons Bike","Moots Cycles","Mountain Khakis","Movement Skis","Mt. Hardwear","Mountainsmith","Naish Surf","Niner Bikes","Norco Bicycles","Northwave","Nuxe Sport","Ocun","Onyx Equestrian","Orca Triathlon","Patrick Soccer","Path Projects","Pendulum Athletic","Pinnacle Climbing","PoC Sports","PowerBar Apparel","Profilometer Active","Pure Apparel","Q.Tools","Quokka Outdoor","Race Face","RAIDLIGHT","Reusch Goalkeeping","RidgeRest","Rip Curl Surf","Roark Running","Rocky Mountain Bicycles","Rondo Bikes","Royal Padel","Rudis Wrestling","Salming","Salsa Cycles","Santa Cruz Bicycles","Schwinn Apparel","Skins Compression","Solinco","Sombrio","Speedo Endurance","Stance Performance Socks","Stoneglow","Suples","Surly Bikes","Tatami Fightwear","Tendril Cycling","Tenson Active","Theragun Apparel","Tigora","Trekstor Sport","Triton Cycling","TUNDRA Sport","Twin Six Cycling","Tyrolia Skiing","Ucon Acrobatics Bag","Uvex Sport","VAUDE Mountain","Velocio Cycling","Vola","Volkl","WHOOP Apparel","Wright Sock","Yeti Cycles","Yogasmoga","Zone3","100% MX","3T Cycling","4FRNT Skis","93 Brand","Acerbis","Adidas by Stella McCartney","Adidas Football","Adidas Running","Adidas Swim","Air Jordan","Albion","Alfa Sko","Alka Yoga","Alpkit","And1","Animo Italia","Anthem Athletics","Apidura","Arbor Snowboards","Arctica","Argon 18","Asics Nimbus","Asics Tiger","Asmar Equestrian","Astral Footwear","Atama BJJ","Audimas","Auclair","AustriAlpin","Azzaro Sport","Bagheera Sport","Banshee Bikes","Barre3","Bataleon","Bear Grylls","Beko Equestrian","Bell Helmets","Berghaus","Bia Brazil","Bianchi","Big Agnes Apparel","BMC","Bonfire Snowboard","Boréal","Brodin Sport","Brooks Saddles","Buff Original","Bula","Burton AK","C2H4 Sport","Camp USA","Cannondale","Capita","Carrera Sport","Cavalleria Toscana","Cebe","CFM Sport","Chamatex","Champion Reverse","Charles Owen","Chillaz","Climbing Technology","Clif Bar Apparel","Cloudveil","Colmar","Colnago","Continental","Craghoppers","Crankbrothers","Crispi Boots","Cube Bikes","Cumulus Outdoor","Curry Brand","Dakine MTB","DeFender Cycling","Devon-Aire","Diamondback Bikes","Dolomite Boots","DPS Skis","DT Swiss","Eagle Creek","Eider Outdoor","Ellsworth Bikes","Enve Composites","Equipe Cycling","Errea Soccer","Evolv Climbing","ExOfficio","Factor Bikes","Fatti Quali Sportswear","Felt Bicycles","Ferrino","Fischer Skis","Five Ten MTB","Fjellpulken","Fox Head MTB","Fox Racing MTB","Fraktnord Sport","Free Country","Fritsch Sport","FRSON Cycling","Fuji Sports","Gamma Sports","Gerbing Heated","Giant Bikes","Gioventù Sport","GNU Snowboards","Goalkeeper Pro","Goode Rider","Goretex Apparel","Gravely Cycling","Greatness Wins","Gymshark Apex","Halo Headbands","Hatch Performance","Heroine Sport","Hestra Gloves","HibikiBJJ","Hilly","HKM Sports","Hoss Equestrian","HUUB Triathlon","Ibex Wool","Inaria Soccer","ION Bike","Iris Cycling","Isadore Apparel","JAKO Football","Jamis Bikes","Joola Pickleball","Jones Snowboards","K2 Snowboards","Kalenji","Karbon Skiwear","Karpos Mountain","Karrimor","Kerrits","Kingdom Skis","Kingz BJJ","Kiprun","Klein Bikes","Kombi","Komperdell","Kona Bikes","Lapierre","Le Bent Wool","Le Mieux","Liberty Skis","Lib Tech","LNDR","Look Cycle","Loop Pickleball","Macron Football","Madison Cycling","Magic Suit","Maloja","Marker","Marsblade","Mitre Football","Molten Sport","Mongoose Bikes","More Mile","Mountain Horse","Naish","Nidecker","Nike Football","Nike Pegasus Apparel","Nike Running","Nike Swim","Nike Tennis","Niyama Sol","Norco Bikes","Northwave Cycling","Onix Pickleball","Onnit Apparel","Open Cycle","Orbea","Origin BJJ","Ornot Cycling","Outwet","Páramo","Pearl Izumi Cycling","Penalty Football","Penguin Running","Performance Bicycle","ProKennex","Puma Football","Push Cycles","Q36.5 Aero","Reebok Crossfit","Ribble Cycles","Ride Snowboards","Ridley Bikes","Roa Running","Rocky Mountain Bikes","Roeckl Sports","Rome Snowboards","Romfh","Ronhill Running","Roost MTB","Rossignol Apparel","Salomon Snowboard","Sanabul","Santa Cruz Bikes","Schwalbe","Search and State","Selkirk Pickleball","Shock Doctor","Shoei Helmets","Shoyoroll","Sidi Cycling","Singing Rock","Six Zero Pickleball","Skechers Performance","Skida","Smith Cycling","Snap Climbing","SoftStar Run","Solomon Cycling","Sombrio MTB","SOS Sportswear","Spakct","Specialized Apparel","Spiuk","Stockli","Stolen Goat","Storck","Storm BJJ","STX Lacrosse","Sundog Eyewear","Surly","Time Sport Cycle","Topper Sport","Tredstep","Triumph Cycling","Trofeo Sport","Tucci Boots","TuffRider","Twin Six","Tyrolia","Uhlsport","VHTS BJJ","Volkl Skis","Volkl Tennis","War Tribe","Wear Felicity","Wilier Triestina","WIT Fitness","Yamamoto Triathlon","Yes Snowboards","Yingfa Swim","Yoga Democracy","Zealous Yoga","8848 Altitude","ABUS Cycling","Adidas Boxing","Adidas Volleyball","Aequilibrium Padel","Aha Yoga","Akko Sport","Alpina Sports","Aquaman Wetsuits","Arctic Cool","Arena Powerskin","Arsuxeo","Asics Tennis","Asics Volleyball","Aspire Apparel","B Vertigo","Babe Athletic","Babolat Padel","Balaclavas Buff","Balega Socks","Bell Bicycle","Beverly Sport","Bike Citizens","Bjorn Daehlie","Black Diamond Equipment","BlackCrown Padel Pro","Bombtrack","Brian's Hockey","Brooks England","B-Twin","Cairn Sport","Calia","Cambivo","Capezio Active","Castle Cycling","Cell Block 13","ChampSport","Cervotec","Chillaz Outdoor","ClimaCare","Climb On","Cliq Active","Combat Sports Intl","Compressana Compression","Continental Tires","Copper Fit","CRBN Pickleball","Crystal Sport","Cube Bike","Cygolite Apparel","Dakine Hike","Daklo Active","Dare Sportswear","Darn Tough","Daslo Equestrian","DeSoto Sport","Diatech Cycling","Diavolo Sport","Drymax Socks","Dunlop Sport","Eagle Creek Travel","Echelon Apparel","Ecoglide","Edelrid Climbing","Eider Skiwear","Elite Crampons","Engage Pickleball Pro","Energiapura","Ergon Bike","Etxeondo Cycling","Eumig Sport","Faulx Cycling","Feetures","Fenix Outdoor","Fila Tennis","First Light Athletic","Fizik Cycling","Florence Marine X","Forge Sportswear","Forsake Footwear","Fox MTB","GK Elite Sportswear","Gnara","Goldsheep","Gosture","Granite Gear","Gripit Sportswear","Hala Sport","Halti Outdoor","Head Padel","Helly Hansen Pro","Hera Sport","Hestra Mountain","Highlander Outdoor","Hockey Society","Hummel Football","HYNAUT Sport","Iceberg Boxing","Inov8 Trail","Ion Wakeboard","Irridium Sport","Jet Pilot","Jamaican Sun Active","Jordan Brand","Kali Protectives","Kali Sport","Karst Outdoor","Kelpsie Outdoor","Kerr Active","Kettlebell Kings Apparel","Killtec","Kinetik Sport","King Pro Boxing","Klean Athletic","Kohl's Active","Kona Soccer","Kuhl Active","Lacoste Padel","Last Climbing Shoes","Lazer Helmets","Liner Cycling","Liquido Yoga","Lone Rider Cycling","Look Cycle Apparel","Loop Tennis","Lurking Class Athletics","Maaji Active","Magnitude Cycling","Maier Sports","Maloja Apparel","Manfish Surf","Marathon Sports","Marker Goggles","Mavic Cycling Apparel","McKinley Outdoor","Mikasa Volleyball","Millet Mountain","Mizuno Tennis","Mizuno Volleyball","Molten Volleyball","Moosejaw Apparel","Movement Climbing","Mr Olympia Apparel","Muc-Off Apparel","Nathan Lite Sport","Nautilus Apparel","Nike Metcon","Nike Pegasus","Nike Pro","Nike Trail","Nineteen Wetsuits","Nox Padel","Nutcase Helmets","Oakley Cycling","Old World Cycling","Onnit Performance","Onsight Climbing","Origin Maine","Ortlieb","Outdoor Element","Outdoor Tech","Paddletek","Parlanti","Pearl iZUMi P.R.O","Penn Tennis","Pinarello Apparel","Pirma Soccer","ProXR","Race Ventura","Rapid Sport","Rapport Sport","Reading Active","Restrap Cycling","Rhizome Sport","Roeckl Cycling","Roka Sports","Roost Cycling","Sailfish Triathlon","Salomon Sky","Salming Football","Sanabul Combat","Samshield","Schockemöhle","Selle Italia","Sergio Tacchini Padel","Sherwood Hockey","Sherpa Adventure Gear","Sigma Apparel","Sims Snowboards","Sinful Sport","Solomons Apparel","Solomon Snowsport","Sour Solution Cycling","Spalding Apparel","Speedo Aquablade","Spyder Active","Stance Cycling","StarVie Padel","Stierna Equestrian","Sub Industries","Sudio Cycling","Sukoa Sports","Sun Surf","Suplest Cycling","Surly Apparel","Synapse Cycling","Tachikara","Tausi Cycling","Tendon Climbing","Tenmile Cycling","Therabody Apparel","Thirty Two Snowboard","Thirty Three Threads","Threadbare Active","Thrasher Sport","Tirme Cycling","Tirol Outdoor","Topo Designs Trail","Topo Run","Trailbutter","Trakke","Trek Trade","Triple Aught Design","Troy Lee Designs","True Linkswear","Tucano Urbano","Twenty One Sport","Uhlsport Goalkeeper","Vatic Pro","Vaude Trail","Vibora Padel","Volcom Snow","Volkl Snowboard","Vossen Active","Vortex Cycling","Vyper Sport","Waboba Sport","Watson Gloves","WeatherBeeta","Wilson Padel","Wilson Pickleball","Wright Active","XCEL Wetsuits","Y-3 Sport","Yamamoto Wetsuits","Yates Climbing","Yoga Six","Other",
] as const;

export const CATEGORY_TREE = [
  {
    name: "Overdel",
    children: [
      "T-skjorte",
      "Singlet/Tank",
      "Langermet",
      "Hoodie",
      "Genser",
      "Sports-BH",
      "Crop top",
    ],
  },
  {
    name: "Underdel",
    children: [
      "Shorts",
      "Tights",
      "Leggings",
      "Joggebukse",
      "Treningsbukse",
      "3/4 tights",
    ],
  },
  {
    name: "Helkropp",
    children: ["Sett", "Bodysuit", "Drakt", "Unitard"],
  },
  {
    name: "Yttertøy",
    children: ["Jakke", "Vindjakke", "Regnjakke", "Vest", "Fleece", "Softshell"],
  },
  {
    name: "Sko",
    children: [
      "Løpesko",
      "Treningssko",
      "Crossfit-sko",
      "Tursko",
      "Fjellsko",
      "Klatresko",
      "Sykkelsko",
      "Fotballsko",
    ],
  },
  {
    name: "Tilbehør",
    children: [
      "Sokker",
      "Lue",
      "Pannebånd",
      "Hansker",
      "Bag/Sekk",
      "Belte",
      "Pulsbelte",
      "Vannflaske",
      "Briller",
    ],
  },
  {
    name: "Sport-spesifikt",
    children: [
      "Yoga",
      "Svømming",
      "Sykkel",
      "Klatring",
      "Ski",
      "Snowboard",
      "Løp",
      "Kampsport",
      "Tennis/Padel",
      "Golf",
      "Fotball",
      "Surfing",
    ],
  },
] as const;

export type CategoryParent = (typeof CATEGORY_TREE)[number]["name"];

export const CATEGORIES = CATEGORY_TREE.flatMap((g) => g.children) as readonly string[];

export const CATEGORY_PARENTS = CATEGORY_TREE.map((g) => g.name) as readonly CategoryParent[];

export function parentOfCategory(leaf: string | null | undefined): CategoryParent | null {
  if (!leaf) return null;
  for (const group of CATEGORY_TREE) {
    if ((group.children as readonly string[]).includes(leaf)) return group.name;
    if (group.name === leaf) return group.name;
  }
  return null;
}

export function categoryMatchesParent(
  itemCategory: string | null | undefined,
  parent: CategoryParent,
): boolean {
  if (!itemCategory) return false;
  if (itemCategory === parent) return true;
  const group = CATEGORY_TREE.find((g) => g.name === parent);
  if (!group) return false;
  return (group.children as readonly string[]).includes(itemCategory);
}

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
