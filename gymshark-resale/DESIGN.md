# Aktivbruk designsystem: «Vaskelapp»

Utgangspunktet er vaskelappen som sitter inni hvert treningsplagg. Den er liten og presis. Tall og ord står i rette linjer, uten pynt. Siden skal kjennes likedan: minimalistisk, flat og ærlig, med én tydelig stemme.

## 1. Prinsipper

1. Bildet og prisen bærer siden. Varekortene har ingen ramme, skygge eller runde hjørner.
2. Én hovedhandling per skjerm er oliven. Alt annet er blekk, strek eller tekst.
3. Hårstreker skiller innhold. De rammer det ikke inn. Ingen kort inni kort.
4. Venstrestilt og redaksjonelt. Bare knapper i ark og korte tall midtstilles.
5. Egne ikoner med rette ender og skrådde hjørner. Ingen emoji og ingen tegn som ikon.

## 2. Typografi

Én familie: **Archivo** (Google Fonts, variabel akse for bredde 62–125 og vekt 100–900). Smal bredde gir overskrifter og priser karakter. Full bredde gir rolig brødtekst. Æ, ø og å er tegnet med samme omsorg som resten.

| Rolle | Bredde | Vekt | Mobil | Desktop | Linjeavstand |
|---|---|---|---|---|---|
| Display (forside, sidetitler) | 72 % | 720 | 40–48 px | 64–92 px | 0,92–1,0 |
| Overskrift 2 | 80 % | 680 | 24–26 px | 32 px | 1,08 |
| Overskrift 3 | 100 % | 620 | 17 px | 17 px | 1,3 |
| Brødtekst | 100 % | 400 | 16 px | 16–17 px | 1,55 |
| UI-tekst og knapper | 100 % | 500–600 | 15 px | 15 px | 1,35 |
| Metadata | 100 % | 400 | 13 px | 13 px | 1,4 |
| Mikro | 100 % | 400 | 12 px | 12 px | 1,35 |
| Pris | 82 % | 650 | 15 / 34 px | 15 / 44 px | 1,0–1,3 |

- Alle priser og tall bruker `font-variant-numeric: tabular-nums lining-nums`.
- Ingen store bokstaver med sperring over overskrifter. Merkenavn står i vanlig skrift med vekt 650.
- Brødtekst får maks 62 tegn per linje.
- Minste tekst på mobil er 12 px, og den brukes bare til tidsstempler og hjelpetekst.

Hvorfor Archivo: jeg testet fire løsninger på forsiden og varekortet (Schibsted Grotesk, Archivo smal pluss normal, Familjen Grotesk, og Funnel Display pluss Funnel Sans). Schibsted fikk avisklang. Familjen ble urolig i små størrelser. Funnel så ut som et SaaS-produkt. Archivo i smal bredde minner om startnumre og resultatlister, og det passer et marked for folk som trener. Samtidig er brødteksten nøytral.

## 3. Farger

| Token | Hex | Bruk | Kontrast |
|---|---|---|---|
| `paper` | #F3F2EC | Bakgrunn, varm offwhite med olivenstikk | |
| `raised` | #FBFAF6 | Ark, dialoger, felt | |
| `sunk` | #E6E4DA | Bildeflater, skjelett | |
| `line` | #D6D3C7 | Hårstreker | |
| `line-2` | #CFCBBE | Kant på felt og sekundærknapper | |
| `ink` | #1C1E18 | Tekst, valgt tilstand, blekk-knapp | 15,0 : 1 |
| `ink-2` | #4A4840 | Brødtekst | 8,2 : 1 |
| `ink-3` | #6B675C | Metadata (aldri på `sunk`) | 5,0 : 1 |
| `olive` | #4B5A28 | Hovedhandling, merkepunkt, aktiv-strek | 6,7 : 1 |
| `olive-press` | #3B4720 | Oliven ved trykk | |
| `dark` | #23291A | Ikke i bruk nå. Reservert for en eventuell mørk bunntekst. | |
| `clay` | #9A3F24 | Feil, tvist, slett | 6,0 : 1 |
| `ochre` | #7A5A12 | Frister og advarsler | 5,7 : 1 |

Oliven er gjort litt mørkere enn den gamle #5a6b32 slik at hvit tekst og olivenstor tekst får god margin over AA. Oliven brukes til hovedhandlinger, aktiv-streken og bekreftelser, ikke til lenker. Blått, indigo, smaragd og rødt i statusmerker er borte, og tellere er blekkfirkanter.

## 4. Avstand

4/8-skala: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 96.

- Sidemarg: 16 px på mobil, 40 px fra 1024 px.
- Rutenett: 2 kolonner på mobil (14 px mellom kolonner og 32 px mellom rader), 3 fra 768 px, 4 fra 1024 px (16 px og 44 px). Merke og pris i to naboer skal aldri se ut som én linje.
- Maks bredde: 1280 px med 12 kolonner og 24 px mellomrom. Skjemaer og tråder står i 7 kolonner eller maks 760 px.
- Seksjoner har 48 px mellomrom på mobil og 72–96 px på desktop. Innholdet i en gruppe har 8–16 px.

## 5. Hjørner

| Token | Verdi | Brukes til |
|---|---|---|
| `r0` | 0 | Bilder, seksjoner, lister |
| `r1` | 2 px | Knapper, felt, brikker, merkelapper, tellere |
| `r2` | 8 px | Toppen av ark og dialoger |
| `r-chat` | 10 px med 2 px hjørne mot avsender | Chatbobler |
| `rund` | 50 % | Avatarer og radioknapper |

`rounded-full` og `rounded-2xl` brukes ikke. Runde former heter `rounded-circle` og brukes bare til avatarer og radioknapper.

## 5b. Forside og bunntekst

- Heroen er bare overskrift, ingress og knapper, i én farge og uten bilde. Ingen vare løftes over de andre, og «Nytt inne» kommer rett etter.
- Mobil: overskriften står i tre linjer («Brukte / treningsklær, / bedre priser.»), venstrestilt, med `font-size: clamp(40px, 12.5vw, 56px)`. Den kuttes aldri, heller ikke på 320 px.
- Desktop: samme prinsipp som mobil. Overskrift, ingress og knapper står under hverandre med én felles venstrekant, uten kolonner eller innrykk. Overskriften står i to linjer og følger vindushøyden, opptil 120 px (`clamp(56px, min(11.5vw, 12.5vh), 120px)`). Ingressen er maks 560 px bred, og knappene står rett under den med «Gratis å bruke» på samme linje.
- Første rad med varer skal alltid synes i første skjerm: målt er det 100–140 px av bildene på 375–390 px mobil og på en 1280 × 610 laptop, og mer på større skjermer.
- Bunnteksten er lys og lav både på mobil og desktop: papirbakgrunn, hårstrek over og 13–14 px tekst. Den mørke varianten ligger på lerretet til sammenligning.

## 6. Ikoner

- 24 × 24 rutenett med 18 px levende flate (3 px luft).
- Strek 1,5 px, rette ender (`stroke-linecap: square`) og spisse skjøter (`stroke-linejoin: miter`).
- Hjørner er skrådd 45 grader i stedet for avrundet. Hjertet, bjella, skjoldet og hengelåsen følger samme regel, og det er dette som skiller settet fra Lucide og Heroicons.
- Fylte varianter finnes bare for hjerte og stjerne.
- 16 px ved metadata, 18–20 px ved tekst og knapper, og 22 px i bunnmenyen. Ikonet sentreres optisk mot x-høyden.
- Farge arves fra teksten (`currentColor`). Ikoner står aldri i en farget sirkel.

## 7. Komponenter

**Knappehierarki.** Hver skjerm har maks én hovedhandling (fylt) og én sekundær (1,5 px blekkant). Alt annet er tekstlenker med understrek eller ikon med tekst uten ramme (Legg til, Del, Skriv til selger, Legg ut vare, Logg ut). «Se flere» heter det samme på forsiden og /varer. Den er en sekundærknapp (samme stil som «Gi bud») sentrert under griden. Mens den laster står det «Laster…», og knappen er deaktivert.

**Knapper.** 48 px høye (36 px liten, 52 px stor), 2 px hjørne og tekst i vekt 600 som aldri brytes. Varianter:
- `olive`: skjermens ene hovedhandling (Kjøp nå, Betal nå, Send bud, Legg ut, Se N annonser, Godta, Alt OK).
- `ink`: navigasjon og nøytrale handlinger (Utforsk, Logg inn, Send).
- `line`: 1,5 px blekkant for sekundære handlinger (Legg ut vare, Gi bud, Se flere).
- Tekstknapp (`tbtn`): 44 px trykkflate, ingen ramme, understrek når den står alene.
- `clay`: destruktive handlinger (Meld problem, Slett konto).

**Felt.** 48 px høye med `raised` bakgrunn, 1 px kant og 2 px hjørne. Etiketten står alltid over feltet i 14 px og vekt 620. Plassholder har `ink-3`.

**Varekort.** Ingen beholder. Bilde i 3:4, og under det merke og pris på samme linje, så tittelen, så «Str. S | Som ny» med fraktikonet til høyre, og til slutt selger. Hjertet ligger i en 32 px lys firkant oppe til høyre, og antall bilder står i en blekklapp nede til høyre.

**Leveringsvalg.** Radioknapper i rader med hårstreker. Den valgte raden viser fraktdetaljene rett under.

**Brikker (chips).** 36 px høye med 2 px hjørne og 1 px kant. En valgt brikke har blekkfyll.

**Faner.** Tekst med en 2 px olivenstrek under den aktive. Samme regel som i menyene.

**Ark og dialoger.** Mobil bruker bunnark med dra-håndtak (filteret kan fortsatt sveipes ned). Desktop bruker sentrert dialog, 420 px bred, med 8 px hjørne. Bakteppet er blekk med 36 % dekning, uten uskarphet.

**Toast.** Blekkflate med ikon til venstre, 2 px hjørne og ingen skygge. Den står nederst til venstre på desktop og over bunnmenyen på mobil, og feil-toast bruker leire.

**Tomme tilstander.** Venstrestilt, med et dempet ikon, overskrift, én setning og én knapp. Ingen stiplet ramme og ingen emoji.

**Lasting.** Faste flater i `sunk` med nøyaktig samme mål som innholdet, pluss en 2 px progresjonsstrek under topplinjen. Ingen pulserende skjelett og ingen spinner i tekst.

**Systemkort i chat.** Venstrestilte rader med et 36 px ikon i tynn ramme, tittel, undertekst og tid. Hårstrek over og under.

## 8. Tilstander

Det er to regler, og de skal aldri blandes:
- **Hvor er jeg:** olivenstrek (2 px) og full tekstvekt. Gjelder menyer og faner.
- **Hva har jeg valgt:** blekkfyll med lys tekst, og en hake der det er plass. Gjelder brikker, leveringsvalg, pakkestørrelse, sortering og hurtigbud.

| Tilstand | Regel |
|---|---|
| Hover | Knapper blir 6 % mørkere. Lenker får understrek. Varekort gjør ingenting (ingen løft og ingen zoom). |
| Focus-visible | 2 px olivenkontur med 2 px avstand. Felt får blekkant og en 3 px olivenring med 25 % dekning. |
| Active | `olive-press`, eller blekk med 88 % dekning. Ingen skalering. |
| Valgt | Blekkfyll med `paper`-tekst. |
| Disabled | 45 % dekning og `cursor: not-allowed`. Teksten er den samme. |
| Feil | Leirekant på 1,5 px og feilmelding i leire under feltet. |

## 9. Bevegelse

- Varighet 150–250 ms. Ark og dialog 220 ms inn og 160 ms ut.
- Kurve `cubic-bezier(0.2, 0.8, 0.2, 1)`. Ingen sprett.
- Bare `transform` og `opacity` animeres.
- FAQ-pluss roterer 45 grader til kryss.
- Filterarket følger fingeren og lukkes ved 100 px drag, som i dag.
- `prefers-reduced-motion: reduce` gjør alle overganger umiddelbare og skjuler progresjonsstreken.
