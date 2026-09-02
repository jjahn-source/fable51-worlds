# South side of Geary Street — per-building spec (GEO AGENT E)

Scope: south side of Geary from Grant Ave (E) to Mason St (W), highest detail on the Stockton–Powell
block facing the square; brief entries for the two theatres just west of Mason and for the north
side between Stockton and Grant. Data: `src/data/recon/south_geary.json`. Photos: `refs/south_geary/`
(`SOURCES.md`). Researched 2026-09-01 from `gis.json` (OSM footprints), `storefronts.json`, the
neighbouring agents' JSON and a small number of web pages.

Local frame (gis.json): x east, z south, plaza centre (0,0). Geary centreline z = 52, south building
line z = 63, Powell x = −73, Stockton x = +74, Grant x = +211, Mason x = −220. Geary is one-way WEST
with a red bus lane on the plaza (north) curb; the south curb has a taxi zone in front of Macy's.
Odd Geary numbers = south side; numbers rise westward (Grant ≈ 100, Stockton ≈ 200, Powell ≈ 300,
Mason ≈ 400).

OSM caveat: way 149335991 "I. Magnin & Co. Building" (8 fl / 43 m) is at Geary & **Grant** (the
1905-era store site), not the white-marble building at Stockton, which OSM merges into the Macy's
way 32863633. The east-side agent cited that way for the Stockton building; use this file instead.

---------------------------------------------------------------------------------------------
## 1. Stockton → Powell block (faces the plaza) — 126 m of frontage

| Segment (E→W) | Width | Fl / m | Fabric | Ground floor 2026 |
|---|---|---|---|---|
| **233 Geary — ex-I. Magnin "White Marble Palace"** (1905 shell, 1946-48 Vermont-marble refacing attr. T. Pflueger; sold 2019 to Sand Hill; Handel Architects renovation) | 43 m (Stockton ≈ 40 m) | 8 / 43 (4 residential floors + 2 penthouses planned 2020 — built status UNRESOLVED) | white marble, 7 × 7 grid of ≈2.2 m square punched windows, blank parapet | **Louis Vuitton** corner (≈25 m Geary + ≈20 m Stockton, open 2026-07) · **Loro Piana** west of it (≈15 m, open 2026) · Stockton bays UNRESOLVED |
| **Macy's Geary building, 235-281 Geary** (1998, Patri Burlage Merker; replaced 1967 + 1976 fronts) | 59 m | 6 visible / 34 m parapet; set-back roof levels to ≈45 m | glass curtain wall in silver-grey mullions, grey stone end piers, convex 5-storey glass bow | **Macy's main entrance** in the bow (4 door pairs, canopy, taxi stand) · display windows E · 4-5 carved-out retail bays W (Dyson, Swarovski probable; others for lease Dec 2024) |
| **285-295 Geary / 246 Powell corner** (1907, 7 fl, cream terra cotta, fire escape, rooftop billboard) | 24 m (Powell 24 m) | 7 / 27 | ornamented cream masonry, bracketed cornice | Dyson 285 · Swarovski ≈291-299 · CK Contemporary on Powell — see `west_powell.json` |

### Macy's Geary façade — composition (west end at x = −39, east party wall at x = +20)

Reading from the **west (Powell) end** in metres: `0–6` stone pier (Cheesecake Factory + Burger Bar
plaques at 3rd/4th-floor height) · `6–25` glazed wing, 5 bays × 3.8 m, 5 window rows over the ground
floor · `25–38` convex glass bow, entrance doors centred at ≈31 m (x ≈ −8), canopy 12 m × 3 m at 4.5 m,
"macy's" on the fascia · `38–51` glazed wing, 3 bays × 4.4 m · `51–59` stone pier (same plaques) ·
then the marble I. Magnin wall. Floor bands: ground 6.5 m, five 5.2 m floors, parapet ≈34 m; planters
and three flagpoles on the roof above the bow; Cheesecake Factory terrace ("8th floor") set back.
Signs: (1) "macy's" white/silver channel letters ≈12 × 2.5 m on the curved parapet over the bow, red
star apostrophe lit at night; (2) small "macy's" on the canopy; (3) grey Cheesecake Factory/Burger
Bar plaques on both piers (Burger Bar's 2026 status unverified); seasonal wreaths in every bay and red
stars in the bow Nov–Jan. Colours: glass #A7B8C4, mullions #9EA3A8, stone #B8B5AE. No Macy's red
star signs on the Geary face itself — the large red "macy's" signs are on the 1929 building at
Stockton/O'Farrell (out of scope). Status 2026: OPEN; Feb-2024 closure plan dropped 4 Nov 2025 for a
Macy's + TMG Partners redevelopment partnership, no closure date (OSM check 2026-04-09).

```
GEARY STREET SOUTH SIDE, STOCKTON → POWELL (looking south from the plaza; Stockton at LEFT)
1 column ≈ 1 m, 1 row ≈ 4 m

 +45 m                                            ┌ roof levels / Cheesecake terrace ┐
 +43 m ┌────── I. MAGNIN 233 GEARY ────────┐      │ set back                         │
       │ ▪ ▪ ▪ ▪ ▪ ▪ ▪   (white marble)    │      │                                  │
       │ □ □ □ □ □ □ □                     │ +34 ═╪═══ macy's ★ (12 m sign) ════════╪═══════════╗ +27 ┌── 285-295 GEARY ──┐
       │ □ □ □ □ □ □ □                     │      │▓▓▓ │ ▒▒▒ ▒▒▒ ▒▒▒ │ ((((( bow ))))) │ ▒▒ ▒▒ ▒▒ ▒▒ ▒▒ │▓▓▓║      │ □ □ □ □ □  cream │
       │ □ □ □ □ □ □ □                     │      │ CF │ ▒▒▒ ▒▒▒ ▒▒▒ │ ((((( glass ))))) │ ▒▒ ▒▒ ▒▒ ▒▒ ▒▒ │ CF║      │ □ □ □ □ □  terra │
       │ □ □ □ □ □ □ □                     │      │▓▓▓ │ ▒▒▒ ▒▒▒ ▒▒▒ │ (((((  5   ))))) │ ▒▒ ▒▒ ▒▒ ▒▒ ▒▒ │▓▓▓║      │ □ □ □ □ □  cotta │
       │ □ □ □ □ □ □ □                     │      │ BB │ ▒▒▒ ▒▒▒ ▒▒▒ │ ((((( fl  ))))) │ ▒▒ ▒▒ ▒▒ ▒▒ ▒▒ │ BB║      │ □ □ □ □ □   fire │
       │ □ □ □ □ □ □ □                     │      │▓▓▓ │ ▒▒▒ ▒▒▒ ▒▒▒ │ ((((( atrium ))))) │ ▒▒ ▒▒ ▒▒ ▒▒ ▒▒ │▓▓▓║      │ □ □ □ □ □ escape │
       │ □ □ □ □ □ □ □                     │      │▓▓▓ │ ▒▒▒ ▒▒▒ ▒▒▒ │ (((((       ))))) │ ▒▒ ▒▒ ▒▒ ▒▒ ▒▒ │▓▓▓║      │ □ □ □ □ □        │
  +6 m ├───────────────────────────────────┤      ├────┴─────────────┴─ canopy macy's ─┴────────────────┴───╢      ├──────────────────┤
       │ LOUIS VUITTON (corner) │ LORO PIANA│      │ ▓▓ │ display  │ bay │ ▓ ENTRANCE ▓ │ bay│ bay│dyson│swar│ ▓▓║      │ shops │ shops    │
   0 m └────────────────────────┴───────────┘      └────┴──────────┴─────┴──────────────┴────┴────┴─────┴────┴───╜      └───────┴──────────┘
       ^ Stockton corner (x=+63)      x=+20 ^ party wall   8 m  13 m (3 bays)  13 m bow   19 m (5 bays)  6 m  ^ x=−39   24 m   ^ Powell (x=−63)
       |<──────── 43 m ─────────>|<──────────────────────── 59 m (1998 building) ─────────────────────────>|<──── 24 m ────>|
       |<──────────────────────────────────────────── 126 m ───────────────────────────────────────────────>|
```

---------------------------------------------------------------------------------------------
## 2. Powell → Mason block, south side (E→W) — ≈126 m

| # | Building | Width | Fl / m | Fabric | Ground floor 2026 |
|---|---|---|---|---|---|
| 301-323 | **Elkan Gunst Building** (1908, Lansburgh & Joseph; SW corner Powell) | 30 m (Powell 26) | 8 / 33 | cream-grey glazed terra cotta, rounded corner bay, 2-storey arched base, inscribed frieze, bracketed cornice, rooftop billboard | **Shoe Palace** flagship (Feb 2025), corner entrance — primary record in `west_powell.json` |
| 333 | ex-Theatre St. Francis / **Lefty O'Doul's** (closed Feb 2017; Handlery-owned) | 14 m | 2-3 / ≈10 (UNRESOLVED) | low converted-theatre volume | UNRESOLVED — OSM 2026-03 puts the Shoe Palace node here; LoopNet listing withdrawn |
| 347-373 | **Handlery Union Square Hotel** (1908 Hotel Stewart; Handlery 1948; 377 rooms) | 49 m | 8 / 26 | painted light-cream masonry, regular sash grid (detail unverified) | 347 Daily Grill "temporarily closed" · 351 hotel entrance + canopy (open) · ≈361-375 Art Thou Gallery (open 2026-07) · other bays UNRESOLVED |
| 377 | 2-storey infill | 8 m | 2 / 7 | stucco | UNRESOLVED |
| 381-389 | 3-storey infill | 8 m | 3 / 10 | stucco/brick | 389 vacant (ex-Sushi Boat); 381-383 UNRESOLVED |
| 399 | **SE corner Geary & Mason** (Mastro's Steakhouse upstairs, open 2025) | 19 m (Mason 32) | 3 / 10 | UNRESOLVED | ex-CVS corner **vacant** (OSM 2026-07-03) |

Behind: King George Hotel, 334 Mason (32 m) and the Bartlett Hotel, 238-242 O'Farrell (24 m) — not on Geary.

## 3. Beyond Mason (framing only, south side)

- 401-405 Geary, SW corner Mason: 6 fl / 22 m, **Pinecrest Diner** at the corner (open 2025-07).
- **Toni Rembe Theater (Geary Theater), 415 Geary** — 1910 Bliss & Faville, 42 m wide, 3-storey
  façade ≈23 m: rusticated terra-cotta base with a full-width black iron marquee; four giant fluted
  Corinthian columns framing three tall arched windows with polychrome (blue/gold) terra-cotta
  spandrels; tan-brick end panels; attic of small square windows in ornamented plaques. A.C.T.; NRHP 1975.
- **Curran Theatre, 445 Geary** — 1922 Alfred Henry Jacobs, 32 m wide, ≈21 m: cream terra cotta with
  tan-brick panels, three 2-storey arched windows with balconettes, three oculi, modillioned cornice,
  slate mansard with finials, black iron marquee, red neon vertical "CURRAN" blade at the east end.
  1,667 seats; owned by the SF Giants (2025), operated by ATG.

## 4. Stockton → Grant, south side (E of the square)

- **Neiman Marcus, 150 Stockton** — 94 m on Geary, 5 fl / 28 m, beige harlequin stone, glass corner
  prism with the City of Paris rotunda; open (land sold Jan 2026, 99-year leaseback). Primary record
  `east_stockton.json`.
- **101-111 Geary, SW corner Grant** — 24 m, 5 fl / 19 m; Dita and Omega (OSM 2026-07-03).

## 5. North side of Geary, Stockton → Grant (brief, E of the plaza)

| x range | Building | Fl / m | Ground floor 2026 |
|---|---|---|---|
| 84-110 | One Union Square, 172-180 Geary (1987) | 7 / 25 | Geary suites vacant (ex-Bulgari corner; C&W listing) |
| 110-126 | **Whittell Building, 166 Geary** (1907, Shea & Shea) | 16 / 66 (217 ft; OSM 56) | orange-brown brick, green trim, hipped white roof, 5 paired-window bays; ground tenant UNRESOLVED |
| 126-139 | 150-156 Geary (two low parcels) | 3 / 14 | **Chanel** 156 (staying, Mar 2026); ex-Banana Republic ≈150-152 closed |
| 139-146 | Britex Building, 146 Geary | 4 / 23 | **Bang & Olufsen** (opened Nov 2025) |
| 146-160 | 140 Geary office block | 11 / 42 | ground UNRESOLVED; A. Lange & Söhne salon 3rd floor |
| 160-201 | 100-136 Geary / 105 Grant corner block | 6 / 25 (+4-level corner piece) | Van Cleef & Arpels ≈130-136 · **Bottega Veneta** 124 · Burberry ≈108-116 · **Valentino** 105 Grant (corner) |

## 6. Uncertainties / to verify with Street View
1. Whether the 233 Geary rooftop residential addition (4 storeys, Handel Architects, 2020 application) was built — changes the corner's silhouette from 43 m to ≈57 m.
2. Tenants of the carved-out Macy's retail bays (2020) as of 2026; whether Dyson/Swarovski sit in the Macy's building or the 285-295 Geary corner building.
3. 333 Geary: current use and height.
4. Handlery façade material/colour and the bays at 353-373 Geary; Daily Grill reopening.
5. 399 Geary corner and 377/381-389 Geary: building identities, materials.
6. Burger Bar (Macy's 6th floor) status — plaques may have been removed.

## Sources
Wikipedia Macy's Union Square; WebSearch digest of SFGate 1998 "Renovated Macy's Makes Grand Entrance on Union Square" (Patri Burlage Merker; 235-281 Geary); SFist 2025-11-04 (Macy's/TMG); SF Examiner (Macy's ground-floor leasing); SF YIMBY 2020-12 (233 Geary renovation); Wikipedia I. Magnin; Loro Piana store locator; Louis Vuitton store locator; Wikipedia Geary Theater; Wikipedia Curran Theatre; cinematreasures.org/theaters/3303; skyscraperpage/emporis Whittell Building; sf.handlery.com history + dining pages; SFGate 2017 (Lefty O'Doul's); OSM extract `src/data/recon/osm_raw.json` (ways 32863633, 35024385, 35024386, 35174693, 585642018, 274592034-36, 332520725, 332521036, 35536855, 256917329, 474354570, 256917327; nodes cited per entry); `src/data/recon/storefronts.json`; `west_powell.json`; `east_stockton.json`; photos in `refs/south_geary/SOURCES.md`.
