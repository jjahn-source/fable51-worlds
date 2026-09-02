# East Stockton Street recon (O'Farrell → Sutter) — Agent C

Researched 2026-09-01. Primary deliverable: `src/data/recon/east_stockton.json`. Photos: `refs/east_stockton/` (15 Commons files, see `SOURCES.md`).
Local frame used below: origin 37.788000, -122.406800; x = m east, y = m north (from `osm_raw.json`).

## Geometry of the corridor (OSM-derived, high confidence)
| Feature | Local (x,y) | WGS84 |
|---|---|---|
| Stockton ∩ O'Farrell (centrelines) | (34,-151) | 37.786644, -122.406414 |
| Stockton ∩ Geary | (18,-47) | 37.787578, -122.406595 |
| Maiden Lane mouth (axis) | (18,6) | 37.788054, -122.406595 |
| Stockton ∩ Post | (1,56) | 37.788503, -122.406789 |
| Stockton ∩ Sutter | (-16,160) | 37.789437, -122.406982 |

Stockton bears ~9° W of N; blocks are ~104 m centreline-to-centreline; Stockton ROW ≈ 21 m (east building line ≈ 10.5 m from centreline). Odd Stockton numbers are on the WEST side (Grand Hyatt 345, Mystic/Palihotel 417); even numbers on the EAST side (100, 150, 200, 216, 218, 234, 240, 250, 340, 390).

## East side, south → north
| # | Building | Frontage on Stockton | Height / floors | Status 2026 |
|---|---|---|---|---|
| 1 | **100 Stockton** (ex-Macy's Men's / Liberty House 1974, Gensler re-skin, reopened 2023) | 40.6 m (O'Farrell 67.7 m) | 33 m / 7 + rooftop | Convene offices, Chotto Matte rooftop; 5 ground-floor bays vacant; **Kith** permits filed Jul 2026 |
| 2 | **Neiman Marcus, 150 Stockton** (Johnson/Burgee 1982) | 41.6 m (Geary 93.2 m) | 28 m / 5 | Open; land sold by Saks Global Jan 2026 with long-term lease |
| — | Geary St (ROW ~24 m) | | | |
| 3 | **One Union Square, 200–212 Stockton / 172–180 Geary** (1987) | 18.2 m (Geary 25.3 m) | 25 m / 7 | Moncler open; ex-Bulgari corner, Hublot, Lacoste vacant (Aug 2025) |
| 4 | **216 Stockton** | ~5–6 m (OSM; low conf.) | ~9 m / 2 (est.) | **BAPE** opened Jun 2026 (ex-Dior Men's) |
| 5 | **218–222 Stockton** (1908, Town & Country Club parcel) | 14.1 m | 18 m / 4 | UNRESOLVED ground floor |
| — | **Maiden Lane** mouth | ~9.5 m gap | white wrought-iron gates, closed to cars 11–17h | Entertainment Zone Thu–Sun 12–22h (Sept 2025) |
| 6 | **234–240 Stockton** (1908; 240 = 11-storey office) | 18.2 m | 40 m / 10–11 | Gucci at 240 (2011–; **not re-verified**), 234 UNRESOLVED |
| 7 | **250–260 Stockton** (Schroth Bldg) + **299 Post** corner | 10.2 m + 9 m | ~15 m / 4 (est.) | UNRESOLVED tenants ('JOHNSTON…' blade sign in 2020 photo) |
| — | Post St (ROW ~21 m) | | | |
| 8 | **NE corner Post & Stockton** (identity UNRESOLVED) | 37.3 m (Post 23 m) | 27 m / ~7 | UNRESOLVED |
| — | Campton Place alley (~8 m) | | | |
| 9 | **Taj Campton Place, 340 Stockton** (1909 hotel) | 23 m (L-shape 40 m along alley) | 33 m / 12 (claimed) | Hotel + Campton Bar & Bistro open |
| 10 | **SE corner Sutter & Stockton (~390 Stockton)** | 13 m (Sutter 27 m) | 34 m / ~9 | Starbucks corner (directory; unverified 2026) |

West side (framing only): **Macy's / I. Magnin** (233 Geary; white Vermont marble, 8 fl, 43 m; Stockton frontage 84 m Geary→O'Farrell; Louis Vuitton at the corner) — Macy's stays open, TMG Partners redevelopment partnership announced 4 Nov 2025, no closure date. **Apple Union Square** (300 Post; 38 m along Post, ~30 m deep, 15 m tall) and the plaza with **Ruth Asawa's San Francisco Fountain** (1970–73) — other agent. **Grand Hyatt** (345 Stockton; SOM 1972; 36 fl; 108 m per Wikipedia, 94 m per OSM; tower slab ~27 × 42 m, pale beige precast grid) rises directly north of Apple on the WEST side of Stockton — not an east-side building despite the task's NE-corner hypothesis.

## Neiman Marcus — per-building spec
- Footprint (OSM way 332521036): Stockton face from (28,-57) to (35,-98); Geary face from (28,-57) to (120,-42); 5 storeys, 28 m, 251,000 sq ft (incl. 2002 expansion into neighbouring properties).
- Cladding: two-tone diamond "harlequin" (dark rose-taupe ≈ #7E605C / light warm beige ≈ #A98D82), module ≈ 1.2 × 1.7 m; no base, no cornice; cladding wraps the parapet.
- Corner: 4-storey square-cornered structural-glass prism (~12 m each face, ~20 m tall) at Geary/Stockton enclosing the 1909 City of Paris rotunda and stained-glass dome; main entrance doors on both faces; "Neiman Marcus" script sign on the harlequin above (Geary face). The 1982 rounded glazing was squared in 2002.
- Stockton openings: 3 tall vertical bays (~2.5 m × ~9 m, horizontal mullion bands, display windows) about 15–27 m south of the corner; a row of 5 small square windows (~1 m) near 20 m height toward the south end; otherwise blank. Geary face: ~5 similar tall bays east of the prism and 2 small square windows high up.
- Neighbour: 100 Stockton to the south is taller (33 m) — visible party wall.

### ASCII elevation — Neiman Marcus, Stockton St (west) façade, seen from Union Square looking east
1 column ≈ 1 m, 1 row ≈ 2 m. North (Geary corner) at LEFT.
```
          |<------------------------ 41.6 m ------------------------>|
 28 m  N  +----------------------------------------------------------+  parapet (flat roof; mech. penthouse set back)   S
          |/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\|  harlequin band over the glass corner (~6 m)
 24 m     | Neiman Marcus (script, Geary face) /\/\/\/\/\/\/\/\/\/\/\/|
          +==========+/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/[] [] [] [] []|  5 small square windows (~1 m) at ~19–21 m
 20 m     | GLASS    |/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\|
          | CORNER   |/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\|  floors 3–5: blank two-tone diamonds
 16 m     | PRISM    |/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\|  (module ≈ 1.2 × 1.7 m)
          | ~12 m w  |/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\|
 12 m     | rotunda +|/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\|
          | dome     |/\/\/\/\/ ||  ||  || \/\/\/\/\/\/\/\/\/\/\/\/\/\|  3 tall bays ~2.5 m w × ~9 m h,
  8 m     | inside   |/\/\/\/\/ ||  ||  || \/\/\/\/\/\/\/\/\/\/\/\/\/\|  horizontal mullion bands every ~1.5 m
          |          |/\/\/\/\/ ||  ||  || \/\/\/\/\/\/\/\/\/\/\/\/\/\|
  4 m     |  doors   |/\/\/\/\/ ||  ||  || \/\/\/\/\/\/\/\/\/\/\/\/\/\|  display windows at base; secondary door (verify)
  0 m  ---+==========+---------++--++--++--------------------------+---  sidewalk ~4.5 m · Stockton St ROW ≈ 21 m
          ^ Geary St corner       ^ bays at ~15–27 m from corner        ^ party wall with 100 Stockton (33 m, taller)
```

## Other east-side specs (short)
- **100 Stockton**: 1974 concrete/travertine Brutalist skin stripped 2019–21; new façade of light stone/precast piers with large glazing (material unverified), 7 storeys + rooftop terrace; ground floor split into ~6 retail bays on Stockton/O'Farrell. Colour assumption #D9D2C5.
- **One Union Square**: white stone 2-storey storefront base, glass curtain wall above with white piers; 2 bays on Stockton, 3 on Geary. Colours #E8E4DC / glass #7FA0B0.
- **Maiden Lane**: ROW ~9–10 m at Stockton; white wrought-iron swing gates, bistro furniture, string lights; V.C. Morris/Isaia (140 Maiden Ln) 14 m wide tan Roman-brick blank wall with arched tunnel entry, ~9 m tall, 55 m east of Stockton on the north side.
- **234–240 Stockton**: brown brick tower with heavy projecting cornice (the tall dark building seen east of the square in the May 2025 photo); 2-storey retail base.
- **Taj Campton Place**: pale grey-beige stucco, 3 bays on the tower face, ornate bracketed cornice band at ~8th floor, decorated upper storeys; hotel entrance canopy + Campton Bar & Bistro.
- **Grand Hyatt (west side)**: pale beige precast grid (#D2C9B8), ~12 window columns on the long face, blank end walls, louvred crown; 3-storey podium along the Apple plaza; porte-cochère on Stockton.

## Unresolved (needs Street View / orchestrator check)
1. Identity, age and tenants of the NE Post & Stockton corner building (37 m Stockton frontage, 27 m) and of 250–260 Stockton / 299 Post (SE corner).
2. Gucci at 240 Stockton — 2025–26 status (search budget exhausted before verification); ground floor of 234 Stockton.
3. 218–222 Stockton ground floor; whether 216 Stockton is really only ~5 m wide.
4. 100 Stockton façade material/colour and bay layout; which bay Kith takes.
5. One Union Square vacancies after Aug 2025; Vera Wang status.
6. Grand Hyatt height (94 vs 108 m); Campton Place true floor count/frontage split.
7. Starbucks/CVS at Sutter & Stockton (2026), exact corner building address.

## Sources (key)
PCAD Neiman-Marcus (pcad.lib.washington.edu/building/982); Wikipedia City of Paris Dry Goods; The Real Deal 2026-01-06 (Neiman land sale); SFist 2025-11-04 (Macy's/TMG); Wikipedia Macy's Union Square; SF Standard 2026-07-28 (Kith/100 Stockton); Gensler 100 Stockton; SocketSite 120 Stockton tag; SF Standard 2025-08-04 (One Union Square); CommercialCafe One Union Square; SF Chronicle Bulgari flagship; RetailBoss/KQED/Complex/superfuture Aug 2026 (BAPE 216 Stockton); city-data Stockton St assessments; LoopNet/CompStak 234–240 Stockton; Taj Campton Place; Wikipedia Maiden Lane; SF Standard 2025-10-03 & The Real Deal 2025-10-06 (Maiden Lane); OEWD Maiden Lane EZ Management Plan (Sept 2025); SF Examiner Jan 2024 & Yelp Jul 2026 (Isaia); Wikipedia V.C. Morris Gift Shop; Wikipedia Grand Hyatt San Francisco; ruthasawa.com (San Francisco Fountain); unionsquareshop.com (Louis Vuitton 233 Geary, Starbucks Stockton & Sutter); OSM extract `src/data/recon/osm_raw.json`; Wikimedia Commons photos in `refs/east_stockton/SOURCES.md`.
