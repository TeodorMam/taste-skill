export const POSTEN_PACKAGES = [
  { id: "small",    label: "Norgespakke liten", maxWeight: "5 kg",  dimensions: "35 × 25 × 12 cm",   price: 76  },
  { id: "large_10", label: "Norgespakke stor",  maxWeight: "10 kg", dimensions: "120 × 60 × 60 cm",  price: 140 },
  { id: "large_25", label: "Norgespakke stor",  maxWeight: "25 kg", dimensions: "120 × 60 × 60 cm",  price: 251 },
  { id: "large_35", label: "Norgespakke stor",  maxWeight: "35 kg", dimensions: "120 × 60 × 60 cm",  price: 335 },
] as const;

export type PackageSizeId = typeof POSTEN_PACKAGES[number]["id"];

export function getPackageOption(id: string | null | undefined) {
  return POSTEN_PACKAGES.find((p) => p.id === id) ?? null;
}
