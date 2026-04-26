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

export type Review = {
  id: string;
  item_id: string;
  reviewer_id: string;
  seller_id: string;
  is_positive: boolean;
  comment: string | null;
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
  "2POOD","2XU","686","A7","ABC Mart","ACG","Acne Studios","ADAPT","Adidas","Adidas Originals","Adidas Y-3","Aerie Offline","Aimé Leon Dore","Aim'n","Airblaster","Akila","ALÉ Cycling","Alala","Alex Crane","Alexander Wang Active","Alo Yoga","Alphalete","Altra","Anaconda","Animo","Anon","Anta","Aqua Sphere","Arc'teryx","Arena","Ariat","ASICS","Asmar Equestrian","ASRV","ASPYR","Assos","Asolo","Astral","Athleta","Athletic Propulsion Labs","Atomic","Attaquer","Aurum","Awake NY","AYBL","Babolat","Backcountry","Bad Boy","Balance Athletica","Balenciaga Sport","Ballet Rosa","Bandier","Bandit Running","Banks Journal","Bauer","Beach Riot","Beachbody","BeachLife","Bear KompleX","Bergans","Beta Climbing","Better Bodies","Beyond Yoga","Billabong","Birrot","Björn Borg","Black Crows","Black Diamond","Black Sheep Cycling","Blackstrap","Blackyak","Bloch","Blueberry Pet Sport","Bo+Tee","Bode","Body Glove","Body Wrappers","Bombshell Sportswear","Bonobos Golf","Bontrager","Born Primitive","Brave Soul","Breathe Divinity","Brine","Brooks","Brooks Heritage","Brunette the Label","Brunotti","Brute","Buff","Buffbunny","Bulk Powders","Bullpadel","Burberry Sport","Burton","Cadenshae","Café du Cycliste","Capezio","Carbon38","Carhartt WIP","Casall","Castelli","Castore","CCM","Cellucor","CEP","Champion","Chari & Co","Charles Owen","Ciele Athletics","Cleto Reyes","Cliff Keen","Cole Buxton","Columbia","Contender","Converse","Cor Designed","Cotopaxi","Craft","CRZ Yoga","Cuater","Dada Sport","Dakine","Danskin","DC Shoes","Decathlon","Descente","Devereux","Devold","DFYNE","dhb","Diadora","Dickies Sport","Diesel Sport","Discount Dance","Dior Sport","District Vision","Doyoueven","Drôle de Monsieur","Dunlop","Dynafit","Easton","ECD Lacrosse","Echt","Edelrid","Eivy","Ekkovision","Eleiko","Ellesse","Elomi Sport","Endura","Energetics","Engine","Equiline","Erke","Errea","Eskadron","ETC Apparel","Eurotard","Evisu Sport","Evolv","Fabletics","Faction Skis","FairTex","Falke","FILA","Fior Da Liso","Fischer","Five Ten","Fjällräven","FootJoy","Form Nutrition","Fox Racing","Frank & Oak Sport","Free People Movement","Freed of London","Funkita","Funky Trunks","Fusion","G/Fore","Gaiam","Galvin Green","GANT Sport","GapFit","Garmont","Gavelo","Gaynor Minden","Ghost Nutrition","Girlfriend Collective","Giro","Gobik","Goldwin","Gorewear","Gorilla Wear","Gornation","Goruck","Gramicci","Greyson","Grishko","Gucci Sport","Gym King","Gym Plus Coffee","Gymreapers","Gymshark","H&M Move","Haglöfs","Halara","Hanes Sport","Hanwag","Harley-Davidson Sport","Hayabusa","Head","Hebe Sport","Helly Hansen","HOKA","Hollister Sport","Hookgrip","Houdini","Huel","Hummel","Hurley","Hybrid Athletics","Hylete","ICANIWILL","Iceberg Sport","Icebreaker","Iffley Road","Inov-8","Inzer","Iron Bull Strength","Iron Tanks","Isabel Marant Sport","JAKO","Jaked","Janji","Janus","Janus Norway","J.Lindeberg","Jed North","Joah Brown","Johaug","Joma","Jordan","JOLYN","Julbo","K-Swiss","Kappa","Kari Traa","Keen","Kelme","Kempa","Kilpi","Kingsland","Kith Sport","Kjus","Klattermusen","Klim","Koral","La Sportiva","Lacoste Sport","Le Coq Sportif","Le Col","Lems","Li-Ning","Lilybod","Linksoul","Liquid IV","Liquido Active","Live Fit Apparel","Live the Process","Lole","Looking for Wild","Lorna Jane","Lotto","Lowa","LSKD","Lululemon","Maap","Macpac","Macron","Madhappy Athletic","Madison Cycling","Magic Suit","Mammut","Manduka","Manto","Marika","Marmot","Marucci","Maverik","Meindl","Mercury","Merrell","Metolius","Michi","Millet","Mirella","Mirror","Mission Workshop","Mitre","Mizuno","Moncler Grenoble","Mons Royale","Montane","Montbell","Motionwear","Mountain Hardwear","Mountain Warehouse","MP MyProtein","MSGM Sport","Muscle Nation","NN Running","Nathan Sports","Nautilus","New Balance","NIIS","Nike","Nike ACG","Nike SB","Nike Sportswear","NOBULL","Norda","Norrøna","North Sails","Norse Projects","Nux Active","NVGTN","Odlo","Oiselle","O'Neill","On","Oner Active","Onia","Onitsuka Tiger","Onzie","OPA","Optimum Nutrition","ORTOVOX","Ostroy","Outdoor Research","Outdoor Voices","Outerknown","Ovation","P.E Nation","Palace Sport","Pas Normal Studios","Patagonia","Pearl Izumi","Peak Performance","Penn","Petzl","Phenix","Picture Organic","Pikeur","Pierre Robert","POC","POPFLEX","Prada Sport","Prana","Prince Tennis","PrimaDonna Sport","Pro-Keds","PSG Apparel","Puma","Pursue Fitness","Q36.5","Quest Nutrition","Quiksilver","Rab","Rabbit","Rapha","RAWGEAR","Rawlings","RDX","Real Madrid Apparel","Reebok","Reebok Classic","Reflex Active","Reigning Champ","Repetto","Rhone","Rip Curl","Rival Boxing","RoadRunner Sports","Roark","ROCA","ROAR Active","Rogue Fitness","Rossignol","Roxy","Russell Athletic","RVCA","RVCA Sport","RYDERWEAR","Salewa","Salomon","Sansha","Santini","Satisfy","Saturdays NYC","Saucony","Savage Barbell","Saysky","SBD","Scarpa","Schiek","Scott","Sea to Summit","Sergio Tacchini","Set Active","Silou","SKIMS","Skogstad","Smartwool","Smith","Snow Peak","Soar Running","SOG Sport","Solid & Striped","So iLL","Sondors","Sorel","Spalding","Specialized","Speedo","Spiritual Gangster","Splits59","Sportful","Spyder","Stance","Stio","Stoi","Stone Island Shadow","Stormberg","Strix","Stüssy","Sub Sports","Sugoi","Sundried","Superdry Sport","Supersweat","Supreme Sport","Sweaty Betty","Sweet Protection","Swix","TALA","Tasc Performance","Tatami","Tecnifibre","Ten Thousand","Tenaya","Tenson","Terez","The Ordinary Sport","The North Face","Thom Browne Sport","Tiger of Sweden Sport","Title Boxing","Title Nine","Topo Athletic","Top King","Torrid Active","Tracksmith","Trango","Trek","Tridri","Trimtex","True Hockey","Tufte Wear","Twins Special","TYR","Ulvang","Ultimate Direction","Umbro","Under Armour","Universal Colours","USA Pro","Vans","Vaara","Varley","Vasque","Vaude","Veja","Velocio","Venum","Vervest","Vibram FiveFingers","Vissla","Vital Apparel","Vivobarefoot","Volcom","Vuori","Wacoal Sport","Warrior","Wear Moi","Westcomb","We Wore What","Wild Country","Wilson","Women's Best","Wrangler ATG","X-Bionic","Xero Shoes","Xtep","Y-3","Yangping","Year of Ours","Yokkao","YONEX","YoungLA","Yumiko","Yvette Sports","Zamberlan","Zella","Zoot","ZPacks","7Mesh","Aclima","Adidas Combat","Adidas TERREX","Aerin Sport","Albion Cycling","Alex Athletics","Allbirds","Aloha Collection","Andar Wallets","Apolla Performance","Aquila","Arena Italia","Aritzia TNA","ASRV Sports","Astrid Wild","Atelier Cycling","Athletes Nutrition","Aviator Nation Sport","B-Edge","Babolat Pure","Backcountry Access","Baleaf Sports","BAM Bamboo Clothing","Bauerfeind","Bear Grylls Gear","BEND Active","Bench Sport","Beretta","BERG Activewear","Bestway Sport","Big Agnes","Biru","BlueSeventy","Boa","Body Engineers","Body Glove Surf","Bogner","Bombas","Boon Sport","Born Tough","Brava Fabrics","Bridgedale","Bullitt Gear","BURLEBO","Burton AK","C9 Champion","Cabela's","Camel Active Sport","Capelin Crew","Caribee","Cascada","Cep Compression","Cerus","Champion C9","Chrome Industries","Chubbies","Coalatree","Coldpruf","Compressport","Concept II","Condor Sport","Cor Surf","Cotton On Body","Counterpunch","Crystal Fit","Cuera","Cuera Sport","Curtis","Cushe","Cycling Bobbins","Daehlie","Daiwa","Dakine Mountain","Danner","Decoy","Deuter","DeFeet","Dharma Bums","DLAB Surf","Dolfin Swim","Drakes Pride","Dri-Duck","Drop of Mindfulness","Duer","DUER Performance","Duluth Trading","Dynastar","Eastpak Active","Eddie Bauer","Edinburgh Bicycle","EGO7","Eider","Elan","Eleven Cycling","Elles Sportswear","Eivy Outerwear","Elnio","ELS","Endurance","Enell","Enve","Equilibrium","ESPN Sport","Eton Active","Etxeondo","Evolv Climbing","Exped","Faherty Sport","Fanatics","Faraz Athletic","Fasten","Federbein","Fenwick","Fila Vintage","FilippaK Sport","Filson","Filum","Fingerscrossed","Finis","Finisterre","First Lite","Five Below Sport","Fjern","Flagpole Swim","Flora","FlySafe","Form Athletica","Forsake","Fortis","Fossil Sport","FOX Apparel","Free Country","Freed Up","French Connection Sport","Friluftsfantast","Frilufts","Frioner","Fugazee","FXR","Galaxy Athletics","Gameness","Garage Italia","Gentle Fawn Active","Geographical Norway","Ghost","Giordana","Globetrotter","Gold's Gym","Golftini","Goyard Sport","Granite Gear","Gregg Allman Sport","Gripstuff","Grizzly Gear","Grundens","H.Dressmann Sport","Hagger","Hanon","Harlow Sport","Harmont & Blaine","Helinox","Helli","HereWeGo","Hey Dude","Hi-Tec","Hibbett Sports","Hippytree","HKMX","Hoozy","Houshmand Sport","Howler Brothers","HUUB","Husqvarna Sport","Hyalite","Hydro Flask","Hyperice Apparel","Iamrunbox","Icebug","Icicle","Ido","If Sport","Indowears","Innerfit","Inov8","Iron Roots","Isadore","Itasca","J.Press Sport","Jack Wolfskin","Jamis","Jayhill","Jaxxon Active","Jefferson","Jersey Mike","Jet Cycling","Jock & Jill","Jock Apparel","Joola","Jordan Sport","JT","Julia Athletics","Junior Sport","K2","K-Edge","Kalenji","Kalk Move","KangaRoos","Karhu","Karpos","Kask","Kavu","Kettle Yoga","Kiisby","Kiipsta","Kilo Sport","Kineta","Klättermusen","KMD","Kuhl","Kult Sport","La Sapienza","Lafuma","Lake Cycling","Lalia","Lasse Kjus","Lazer","Le Bent","Lekker","Leki","Lemon Sport","Lib Tech","Liddel","Liforme","Liiteguard","Linde","Lindelement","Lite Year","Lithe Climbing","LiveOutThere","Lodi","Lole Sport","Long Distance","Lotto Sport","Lowa Boots","Lucas Active","Lucky Brand Sport","LumenSport","Lundhags","Lupine Active","M.J. Bale Sport","Madeup","Madness Athletics","Madison","Magma Active","Marathon Sports","Mares","Mary Jaynes","Massimo Dutti Sport","Massimo Sport","McDavid","Meridian Apparel","Merrithew","Microadventure","Midwest Athletic","Miguel Sport","Mikael Aksnes","Milestone","Million Athletic","Misamore","Mistral","Modern Pirate Sport","Mojo Sports","Mongoose","Monsoon","Mookie","Mountain Equipment","Mountain Khakis","Mountainsmith","Move","Movement","Mover","MSR","Muji Sport","Mustang","Myssyfarmi","Nash Active","NastyPig","Nathan","Nathan Lite","Native Eyewear","Native Shoes","Nature Backs","Nautilus Apparel","Nayla","Nemo Equipment","Newton Running","Nikko","Nimo","Nine West Sport","Ninja Sport","Niños","NN.07 Sport","NOMAD","Nordic Athletic","Nordic Frog","Nordica","Norfin","Northwave","Nudie Sport","Nuun","NXTLVL","O'Hara","Obey Sport","Octobers Very Own Sport","Ocun","Odyssey","Off-White Sport","OffPiste","Olang","Olympikus","Onnit","Optimum","Orca","ORC International","ORE Sport","Osprey","Ouray Sportswear","OVO Athletics","Oxbow","Pacas","Padel Pro","Palace Skateboards Sport","Patagonia Worn Wear","Pegasus Active","Peloton Apparel","Penfield","Penningtons Active","Performance Cycle","Phantom Athletics","Pieces Sport","Pinarello","Plenty","Polar","Polo Ralph Lauren Sport","Pottery Barn Active","Premium Sport","Pressio","Pretty Polly Sport","Primigi","Prince","Pro Action","Pro-Tec","Proofy","Pucca","Puro Sport","PWR Athletics","Pyer Moss Sport","Quokka","R+Co Sport","Race Face","RAIDLIGHT","Rains Sport","Ralph Lauren Polo Sport","Range Sport","Rapid Active","Recco","Red Original","Redfeather","REI Co-op","REI Adventures","Reigning Pro","Reima","Renaissance Active","Renew","Renewa","Reo Sport","Repper","Republic Cycling","Resol Sport","Restless Athletic","Rhone Apparel","Riffraff","Rime","Riot Society Sport","Riptide","Ritchey","Rivelo","Roa","Roa Hiking","Robens","Roeg","Rokas Active","Rokit","ROKA Sports","Rollerblade","Rolser Sport","Roots Sport","Rosa Faia Sport","Rossignol Apparel","Roundabout","Roxy Surf","Royal Robbins","RTIC","Rubie's","Rubin Sport","Ruffwear","Run Mantra","Run Things","Run Society","Runderwear","Runners Need","Running Bare","Russell Athletic Heritage","S'well Active","Sail Racing","Saint Bernard","Saint James","Saka","Salt Surf","Sandee","Saysky Pro","SCANDINAVIAN OUTDOOR","Schöffel","Sealskinz","Selfridges Sport","Sergio Rossi Sport","Seven Mile","Sherpa Adventure Gear","Shimano Apparel","Shred","Sierra Designs","Silca","Silvini","Simms Fishing","Sitka","SKINS Compression","Skratch Labs","Skuf Sport","Skyrunning","Slazenger","SoftSpoken","Solomon","Solar Yoga","Solomon Active","Soomom","SosenE","Soul Cycle","Soul Cycle Apparel","Sound Sport","SOUTHPOLE","Spartoo","Speed & Strength","Speedo Endurance","Spider Apparel","Spider Climbing","Spring Court Sport","Sprintex","Sprouts","Squat Wolf","Stafford Athletic","STAG Sports","STANCE Performance","Stanno","Steel Performance","Steelseries Sport","Stevens","Stitch Fix Active","Stoik","Stoik Skin","Strength Wraps","Stride Rite Sport","Style Edit","Sugoi Performance","Sundried Performance","Sunski","Suplay","Surly","SwagBox","Swiftwick","Tabio Sport","Tactical Sport","Taft","Tamashii","Tanuki","Tatonka","Team Bath","Tecnica","Teleios","Telluride","TEMPESTA","Tenba","Tenson Active","TerraTrike","Terry Bicycles","Tezenis Sport","The Black Sheep","The Service Course","Thermohair","Thorlo","Thorlos","Thousand Helmets","Thrasher Sport","Three Dots Active","Throne Cycles","Thuasne","Tilley","Toad&Co","Tognana","Tomahawk Sport","TommieCopper","Topo Designs","Tory Sport","TOUS Sport","Trail Runner Sport","Trakke","Tranquility Sport","Trec Wear","Treelite","TRICKY","Triple Aught Design","Trovata Sport","Trudge","TRV Active","TT Pro","Tulle Sport","Turtl","Tuxer","Twosome","Ultimate Performance","Umbro Pro","Underline","Unisul","UNITED CYCLE","Universal Works Sport","UPF Active","Upski","UrbanDad Sport","Vagn","Valley Sport","Vans Pro","Vasque Boots","Vasque Trail","Vaude Active","Velveteen Sport","Verallia","Vibe Sport","Vibram Sole","Victorinox Sport","Victory Sport","Vigor","Viking","Visby Sport","Vissla Surf","Vital Material","Vivobarefoot Performance","Voite Sport","Voite","Volt Athletics","Vorgee","Voyaij","Wahl Sport","Walden","Wander Bash","Wandering Mountain","Watchu","Wave Sport","Wear One's At","Wenger Sport","Westcomb Performance","Whiteley","Wholehearted Sport","Wilier","Wilson Sport","WingTsai","Wonder Bread Sport","Worn Free","Wright Sock","Wytter","XAR","Xersion","XTERRA","Yangping Sport","Yana K","Yeezy Athletic","Yeti Cycles","Yeti Outdoor","Yvette Active","Zaza Active","Zealwood","Zen Active","Zerogrand","Zevia Sport","Zignone","Ziva","ZooMer Pet Sport","Zoom Triathlon","Zumba","Other",
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
