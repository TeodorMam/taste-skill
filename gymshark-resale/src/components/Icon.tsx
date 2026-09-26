// Aktivbruk's own icon set. 24 x 24 grid, 1.5 px stroke, square ends and
// mitred joins. Corners are cut at 45 degrees instead of rounded, which is
// what sets the set apart from Lucide and Heroicons. Colour follows the text
// (currentColor). Only the heart and the star have filled variants.
//
// Emoji and text characters are never used as icons; add a shape here
// instead.

import type { SVGProps } from "react";

const PATHS = {
  "pakke": <><path d="M3 5h18v4H3z"/><path d="M4.5 9v11h15V9"/><path d="M10 13h4"/></>,  // pakke / frakt
  "sendt": <><path d="M9 5h12v4H9z"/><path d="M10.5 9v10h9V9"/><path d="M2 9h4"/><path d="M3 13h4"/><path d="M5 17h2"/></>,  // sendt
  "levert": <><path d="M3 5h18v4H3z"/><path d="M4.5 9v11h15V9"/><path d="M9 14.5l2.2 2.2L15.5 12.5"/></>,  // levert
  "betaling": <><path d="M3 6h18v12H3z"/><path d="M3 10h18"/><path d="M6 14.5h4"/></>,  // betaling
  "laas": <><path d="M5 11h14v10H5z"/><path d="M8 11V7l2-2h4l2 2v4"/><path d="M12 15v2.5"/></>,  // lås
  "skjold": <><path d="M12 3l8 3v6l-3 5.5L12 21l-5-3.5L4 12V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/></>,  // kjøperbeskyttelse
  "moetes": <><circle cx="7.5" cy="7" r="2.5"/><circle cx="16.5" cy="7" r="2.5"/><path d="M3 20v-4l2-3h5l2 2 2-2h5l2 3v4"/></>,  // møt selger
  "utbetaling": <><path d="M12 3v10"/><path d="M8 9l4 4 4-4"/><path d="M3 14h4.5l1.5 2.5h6l1.5-2.5H21v6H3z"/></>,  // utbetaling
  "bud": <><path d="M9 3l7 7-3.5 3.5-7-7z"/><path d="M9.5 11.5L3 18"/><path d="M11 20.5h10"/><path d="M12 2l3 3"/><path d="M14.5 13.5l3 3"/></>,  // bud
  "hake": <><path d="M4.5 12.5l4.5 4.5 10.5-10.5"/></>,  // hake
  "kryss": <><path d="M6 6l12 12"/><path d="M18 6L6 18"/></>,  // kryss / lukk
  "pil-v": <><path d="M20 12H4.5"/><path d="M10 6l-6 6 6 6"/></>,  // pil venstre
  "pil-h": <><path d="M4 12h15.5"/><path d="M14 6l6 6-6 6"/></>,  // pil høyre
  "chevron-v": <><path d="M15 5l-7 7 7 7"/></>,  // vinkel venstre
  "chevron-h": <><path d="M9 5l7 7-7 7"/></>,  // vinkel høyre
  "chevron-n": <><path d="M5 9l7 7 7-7"/></>,  // vinkel ned
  "pluss": <><path d="M12 4v16"/><path d="M4 12h16"/></>,  // pluss
  "ekstern": <><path d="M13 4h7v7"/><path d="M20 4l-9 9"/><path d="M18 15v5H4V6h5"/></>,  // ekstern lenke
  "advarsel": <><path d="M12 3.5l9.5 17h-19z"/><path d="M12 10v5"/><path d="M12 17.2v1.3"/></>,  // advarsel
  "stjerne": <><path d="M12 3l2.6 5.8 6.4.6-4.8 4.2 1.4 6.3L12 16.6l-5.6 3.3 1.4-6.3L3 9.4l6.4-.6z"/></>,  // stjerne
  "hjerte": <><path d="M12 20.5l-8.5-8.5V7.5l3-3h3.5L12 6.5l2-2h3.5l3 3V12z"/></>,  // hjerte
  "chat": <><path d="M3 4.5h18v12.5h-10l-5 4v-4H3z"/></>,  // chat / innboks
  "bjelle": <><path d="M6 16.5V10l2-4 4-2 4 2 2 4v6.5l2 2H4z"/><path d="M10 21h4"/></>,  // varsler
  "kamera": <><path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13.5" r="3.5"/></>,  // kamera
  "bilder": <><path d="M7 7h14v14H7z"/><path d="M3 17V3h14"/></>,  // flere bilder
  "innboks-tom": <><path d="M3 13l3-8h12l3 8v7H3z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/></>,  // innboks tom
  "soek": <><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></>,  // søk
  "rediger": <><path d="M4 20v-4L16 4l4 4L8 20z"/><path d="M13 7l4 4"/></>,  // rediger
  "slett": <><path d="M3.5 6h17"/><path d="M9 6V3h6v3"/><path d="M5.5 6l1 15h11l1-15"/><path d="M10 10v7"/><path d="M14 10v7"/></>,  // slett
  "del": <><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M4 12v9h16v-9"/></>,  // del
  "lenke": <><path d="M10.5 8.5L14 5h3l2 2v3l-3.5 3.5"/><path d="M13.5 15.5L10 19H7l-2-2v-3l3.5-3.5"/><path d="M9.5 14.5l5-5"/></>,  // lenke
  "profil": <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2l3-4h10l3 4v2"/></>,  // profil
  "filter": <><path d="M3 7h10"/><path d="M17 7h4"/><path d="M3 17h4"/><path d="M11 17h10"/><path d="M13 5h4v4h-4z"/><path d="M7 15h4v4H7z"/></>,  // filter
  "sorter": <><path d="M7 4v16"/><path d="M3 16l4 4 4-4"/><path d="M17 20V4"/><path d="M13 8l4-4 4 4"/></>,  // sorter
  "etikett": <><path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1.5"/></>,  // mine annonser
  "tips": <><path d="M9 17v-2l-3-4V7l3-3h6l3 3v4l-3 4v2z"/><path d="M9.5 20.5h5"/><path d="M12 10v4"/></>,  // tips
  "feiring": <><path d="M3 21l5-13 8 8z"/><path d="M14 2.5v3"/><path d="M19.5 4.5l-2.5 2.5"/><path d="M21.5 10h-3"/><path d="M11 9l2 2"/></>,  // feiring
  "selg": <><path d="M3 3h18v18H3z"/><path d="M12 7.5v9"/><path d="M7.5 12h9"/></>,  // selg
} as const;

export type IconName = keyof typeof PATHS;

// Shapes that have a filled variant.
const FILLABLE: ReadonlySet<IconName> = new Set(["hjerte", "stjerne"]);

type Props = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: number;
  filled?: boolean;
  strokeWidth?: number;
};

export function Icon({ name, size = 20, filled = false, strokeWidth = 1.5, className, ...rest }: Props) {
  const fill = filled && FILLABLE.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap={fill ? "butt" : "square"}
      strokeLinejoin="miter"
      strokeMiterlimit={10}
      aria-hidden="true"
      focusable="false"
      className={className ? `shrink-0 ${className}` : "shrink-0"}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
