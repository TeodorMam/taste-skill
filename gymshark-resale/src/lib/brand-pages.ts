// Listings come and go, so nothing on this site lasts long enough for Google
// to build any standing for a brand. These pages do: the URL stays whether or
// not anything is for sale, and the text below is what it says when the grid
// is empty.
//
// `brand` has to match items.brand exactly, since that is what the query
// filters on. Every value here is taken from BRANDS in lib/supabase.ts.
export type BrandPage = {
  slug: string;
  brand: string;
  intro: string;
};

export const BRAND_PAGES: BrandPage[] = [
  {
    slug: "gymshark",
    brand: "Gymshark",
    intro:
      "Gymshark er et britisk treningsmerke som særlig brukes til styrketrening. Sømløse serier som Vital, Apex og Onyx slippes i begrensede runder og blir utsolgt, så bruktmarkedet er ofte eneste vei til eldre farger og størrelser. Her ligger Gymshark-plaggene som er til salgs på Aktivbruk nå.",
  },
  {
    slug: "nike",
    brand: "Nike",
    intro:
      "Nike dekker det meste av trening, fra løping og fotball til styrke og hverdagsbruk. Fordi så mye er produsert, er brukt Nike både lett å finne og billig sammenlignet med nypris. Her ligger Nike-plaggene som er til salgs på Aktivbruk nå.",
  },
  {
    slug: "youngla",
    brand: "YoungLA",
    intro:
      "YoungLA er et amerikansk merke som er blitt populært blant yngre som driver med styrketrening, kjent for grafiske t-skjorter, joggebukser og shorts. Frakt og toll fra USA gjør nykjøp dyrt i Norge, så mye av det som er i omløp her er kjøpt brukt. Her ligger YoungLA-plaggene som er til salgs på Aktivbruk nå.",
  },
  {
    slug: "craft",
    brand: "Craft",
    intro:
      "Craft er et svensk merke med røtter i langrenn og løping, mest brukt til teknisk undertøy og treningstøy for kaldt vær. Plaggene er laget for å tåle mange vask, så brukte eksemplarer har ofte mye igjen. Her ligger Craft-plaggene som er til salgs på Aktivbruk nå.",
  },
  {
    slug: "dfyne",
    brand: "DFYNE",
    intro:
      "DFYNE er et britisk merke som lager tights, sett og overdeler til styrketrening. Kolleksjonene byttes ut raskt, og utgåtte farger dukker som regel bare opp brukt. Her ligger DFYNE-plaggene som er til salgs på Aktivbruk nå.",
  },
];

export function brandPageBySlug(slug: string): BrandPage | undefined {
  return BRAND_PAGES.find((b) => b.slug === slug);
}

export function brandPageFor(brand: string | null | undefined): BrandPage | undefined {
  if (!brand) return undefined;
  return BRAND_PAGES.find((b) => b.brand === brand);
}
