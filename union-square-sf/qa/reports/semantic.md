# Semantic QA report — 2026-09-01

Reviewer: semantic QA agent ("is the correct business in the correct location?").
Ground truth: `src/data/recon/storefronts.json` (122 entries: 88 named, 34 UNRESOLVED) + `docs/recon/{west_powell,north_post,east_stockton,south_geary,nintendo}.md`.
Runtime: `window.__twin.storefronts()` → 119 entries (117 `facade` + 2 `hero`), 78 distinct names; status mix open 96 / vacant 14 / coming-soon 4 / closed 3 / unverified 2.
Shots: `qa/shots/semantic/*.png` (≈110 frames; camera ids quoted below as `name` = `x,y,z,heading,pitch,fov`).

## Score: 6/10 (category: semantic correctness of tenants, sides, order, status)

Geometry/parity is clean: every one of the 119 registry entries sits on the side of the street its house number implies (odd Powell = west, even Stockton = east, even Post = north, odd Geary = south; the 12 apparent "mismatches" are all corner buildings' second frontages — Nike on Stockton, Saks on Powell, Shoe Palace on Powell, Neiman on Geary, Walgreens/Starbucks on Sutter, Pop Mart on O'Farrell, Gucci/RealReal on Maiden Lane, 399 Geary on Mason). No invented brands were found — every registry name traces to the census or a sector doc. Block order along all eight street edges I walked matches the census, with one swap (Chanel / ex-Banana Republic). What pulls the score down is not wrong businesses but missing ones on the two most-looked-at façades: the Westin's Powell frontage renders as a blank wall (four authored real tenants + the hotel portico are dropped), and Macy's has no legible sign facing the square.

## Blocking issues (must fix)

1. [severity: high] `pw2` (-60,0.35,20,261,2,60), `pw3` (-60,1.4,0,…), `pw4` (-60,2.5,-20,…), `pwc2` (-70,1.5,0,261,5,55), `wst1` (-72,1.9,-10,261,8,60) — **The Westin St. Francis ground floor between Nintendo (z≈27) and the Post corner (z≈-41) is a blank rusticated wall**: no Victoria's Secret, no Pandora, no hotel entrance portico/canopies/flags, no Bourbon Steak, no awnings. The registry has zero entries at x≈-83 between z=34.5 (Nintendo) and z=-68 (Zara). Reference: census `powell-w-335-hotel/-vs/-bourbon`, `powell-w-345` (all open), west_powell.md §1 elevation (Nintendo | unresolved | ENTRANCE | VICTORIA'S SECRET | PANDORA). Evidence that this is a build failure, not a research gap: `src/data/facades/west_powell.json` (way/332378158) authors Bourbon Steak (edges 5/6), `door_hotel_marquee_6.0` for the Westin (edge 3), Victoria's Secret (5 bays), Pandora (edge 2) and a "For Lease" bay (edge 1, 34–40 m) — none reach `storefronts()` and none are rendered. Fix: the Westin outline used at runtime (2-storey base at the property line, per the entry's notes) does not have the same edge indices as the E-plan part (way/1091967971) the tenants were authored against; remap the tenant list to the base outline's Powell edge (Nintendo hero 0–14 m, unresolved bays 14–34 m, marquee ≈34–46 m, Victoria's Secret ≈46–64 m, Pandora ≈76–84 m from Geary) and confirm they appear in the registry with `source:"facade"`.

2. [severity: high] `mc2` (-9,-0.8,20,171,8,60), `mc4` (-9,-0.8,20,171,22,60), `mc3` (-25,-0.5,30,171,10,55), `gs3` (-20,-0.85,40,171,2,60) — **Macy's Union Square cannot be identified from the plaza.** The 1998 Geary building is a flat glass curtain wall with a blank parapet; the only "★macy's" marks are a ≈1.5 m sticker at 2nd-floor level on the west wing (x≈-25) and a tiny one at the base of the centre bay — both invisible from mid-plaza. Reference: south_geary.md — 12 × 2.5 m white "macy's" channel letters with red star on the curved parapet over the 5-storey convex bow, second "macy's" on the 12 × 3 m entrance canopy, taxi stand. The correct brand asset already exists in the scene (legible red ★macy's on the Stockton/O'Farrell corner, `macysStk` 76,-6,132,261,4,60). Fix: add the parapet sign (~12 m wide) centred on the bow at x≈-8, y≈32 m, plus the canopy over the four door pairs; a convex bow is a fidelity nicety, the sign is the semantic fix.

## Major

3. [severity: medium] `gn2c` (130,-4.7,50,351,4,60) — **Chanel (156 Geary) and the ex-Banana Republic bay (150-152 Geary) are swapped.** Registry: For Lease/ex-BR x=128.8, Chanel x=135.3, i.e. Chanel east of the vacant bay and NOT adjacent to the Whittell Building. Geary numbers rise westward, so 156 must be the western parcel (next to 166 Whittell) and 150-152 the eastern one (next to 146 Britex/B&O). Evidence in `src/data/facades/south_geary.json`: ways 256917336 and 939466406 both carry no OSM address tag, so the names were assigned by list order. Fix: swap the two tenant assignments (Chanel → way 256917336, ex-BR → way 939466406).

4. [severity: medium] `p4w1` (-72,4.4,-70,261,4,60), `pn1` (-60,3.2,-40,351,2,60), `pw5` — **Zara (400 Post / 421 Powell) is rendered as a finished, open store with a grey "ZARA" fascia and glazed storefronts**, while the registry (correctly) says `coming-soon` and the census says "under construction, opening 2026". Fix: render coming-soon status as construction hoarding with a "Zara — opening 2026" graphic, consistent with how 340 Post is treated.

5. [severity: medium] `pn4` (0,2.1,-40,351,2,60), `nm1` (55,-2.8,40,126,4,65), `gse1c`, `br1`/`br2`, `pn11c` — several square-facing or flagship fascias are technically present but illegible at sidewalk distance: **Tiffany & Co.** (thin light-grey letters on white portal — the real sign is a parapet sign plus stainless letters over the granite portal), **Neiman Marcus** script (dark grey on mauve harlequin, also hidden by trees), **Breitling** (dark on dark, behind a signal), **Harry Winston** (dark on dark band). Fix: raise contrast/illumination and size; Tiffany needs the "TIFFANY & CO." parapet sign at 42 m and larger portal letters.

6. [severity: medium] Registry omissions with a known real tenant (besides item 1): **Salvatore Ferragamo 236 Post** (census medium; 228-240 Post rendered as blank fascias per north_post.json note), **Hermès 125 Grant / Maiden Lane corner** (census high), **Bulgari 206 Grant** (census high, boundary corner), **Corzetti 398 Geary** (census medium), **b. patisserie plaza kiosk** (census medium). Fix: add as fascia tenants; Hermès/Bulgari only if the Grant-corner parcels are in the model.

## Minor / polish

7. `p2e1b` (-79,-1.5,75,81,4,60) — Swarovski appears on the **Powell** face of 246 Powell (x=-63.2, z=66) as well as on Geary. Census/south_geary.md place Swarovski at ≈291-299 Geary only; the Powell corner bay is CK Contemporary / unresolved. Mark ? — drop the Powell-face Swarovski unless Street View confirms the wrap.
8. `nt1`, `pw1` — Nintendo's Powell bays read as a separate one-storey box in front of the Westin base (module seam visible at z≈22 as a flat white side wall). Semantically correct; visually the hero module should be flush with the rusticated base.
9. Registry addresses that are labels, not real house numbers: "135 Stockton St" for Louis Vuitton (real address 233 Geary; LV's Stockton frontage has no separate number), "Powell St (UGG)". Harmless in-app, but they would mislead anyone exporting the registry.
10. Golden Gate Tap Room (449 Powell) is rendered as a ground-floor blade sign; census says the bar is upstairs (ground = unresolved). Bourbon Steak is authored as ground-floor bays on the Westin; nintendo.md puts it on the 2nd floor above the store.
11. Starbucks 462 Powell carries confidence `medium` in the registry; census `powell-e-462` is `unknown/low` (no 2024+ source). Downgrade to `unverified` like 390 Stockton.
12. `vca` (165,-5.4,50,351,8,60), `handlery` (-142,0.6,54,171,8,60), `artthou` (-165,1.3,54,171,6,60), `inn` (-129,4.7,-50,351,4,60) — Van Cleef & Arpels, Handlery Union Square Hotel, Art Thou Gallery and The Inn at Union Square exist in the registry but no sign is visible from the opposite kerb (blank fascia, or hidden by street trees). Add/raise fascias.
13. `pn5` (20,1.6,-40,351,2,60) — 340 Post hoarding is correct but anonymous; the real site carries Chanel/leasing graphics. Optional.
14. Ground-truth inconsistency (not a scene bug): `storefronts.json` `maiden-140` says Isaia is on the **south** side of Maiden Lane; east_stockton.md and the model put the V.C. Morris building on the **north** side (x=143, z=-2.6, `maiden2` 120,-2.9,0,81,4,60), which is correct (even numbers north). Fix the census row.
15. `stk100`/`stk120` — 100/120 Stockton (For Lease ×2, Convene) are registered but I could not frame them (cameras at x=62 fall inside Macy's west face); the Kith "coming soon" hoarding from the census would be a nice status upgrade.

## What is right (keep)

- Nintendo SAN FRANCISCO: x=-81.8, z=34.5 — west side of Powell, 7 m north of the Geary corner, wraps onto Geary (`ntg1b` -90,-0.9,56,351,4,60 / `ntg2b`). Red "Nintendo" fascia over both doors, character vinyls, red flat awnings, Mario statue visible inside; registry `hero`, open, high. ✓
- Apple Union Square: x=43.3, z=-60.8 — north of Post, west of Stockton, i.e. directly across Post from the square's NE corner (the NW corner of the Post/Stockton intersection, as north_post.md states); Nike (278 Post, swoosh on both faces) holds the true NE corner (`pn6`, `pn7`, `ap1`, `se1`). ✓
- Post north face W→E (`pn1`–`pn7`): ZARA (Argonaut) | Saks Fifth Avenue — papered white glazing, closed | Tiffany & Co. granite portal | 340 Post dark hoarding (vacant, ex-Williams-Sonoma) | Apple pavilion | Nike. Correct order, correct statuses.
- Geary south face W→E (`gs1`–`gs7`, `lv1`): Shoe Palace (SW corner, across Powell) | Swarovski | dyson | Macy's west pier (Cheesecake Factory plaque) | Macy's | Retail Shops For Lease ×2 | Macy's east pier (Cheesecake plaque) | LORO PIANA | LOUIS VUITTON at the Stockton corner | Neiman Marcus glass prism across Stockton. Matches south_geary.md exactly.
- Stockton east face S→N (`se1`–`se6`): Neiman Marcus (Geary corner, script sign) | Geary | blank ex-Bulgari corner (One Union Square, vacant) | Moncler | A Bathing Ape | Tory Burch | Maiden Lane | GUCCI | Sunglass Hut | Breitling corner | Post | Nike. Correct.
- Powell west 200 block S→N (`p2w1`–`p2w4`): Starbucks (201, siren) | UGG | THE BARNES / THE BARNES RESTAURANT + BAR | FOR LEASE 237 | SF SOUVENIRS & LUGGAGE | SHOE PALACE (Elkan Gunst corner). Correct.
- Powell east 200 block S→N (`p2e1b`–`p2e4b`): POP MART (O'Farrell corner) | SAM'S CABLE CAR LOUNGE | THE BEST BOOKSTORE | NOOWORKS | JOURNEYS | Hotel Stratford door | NAVE CAFE | CK CONTEMPORARY. Correct.
- Powell 400 block (`p4w1`–`p4w4`, `p4e1b`–`p4e3b`): west — ZARA | CHANCELLOR HOTEL canopy | Sears FINE FOOD | FOR LEASE (445, ex-BofA) | GOLDEN GATE TAP ROOM | Walgreens; east — Saks Fifth Avenue (papered, Powell frontage) | THE POST ROOM | BEACON GRAND HOTEL canopy | Starbucks wrapping the Sutter corner. Correct.
- Post 200 block (`pn9c`, `pn11c`, `ps2c`, `ps4c`): FOR LEASE 250A (ex-Zara) west of Gump's | Harry Winston at Grant; south side The RealReal | ROLEX | PATEK PHILIPPE, Cartier at the Grant corner. Correct.
- Geary north east block (`gn4`): BOTTEGA VENETA | BURBERRY | VALENTINO (Grant corner). Geary south: Omega. Correct.
- Post 400 block west (`pnw3`, `pnw2c`): BARCELINO | 490 POST | CAFÉ ENCORE | BARCELINO PER DONNA | CAFE LA TAZITA; KENSINGTON PARK HOTEL canopy. Correct.
- Geary west block (`gsw3`–`gsw6`, `act`): FOR LEASE 389, FOR LEASE 399 (ex-CVS), A.C.T. GEARY THEATER, CURRAN. Grand Hyatt and Taj Campton Place canopies on Stockton (`hyatt`, `sbux390`). Correct.
- Status honesty: every closed/vacant bay in the census that is in the model is rendered as For Lease/papered (Saks, 340 Post, 250A, 225 Post, 220 Post, 150-152 Geary, 324 Stockton, 100/120 Stockton, 445/237 Powell, 389/399 Geary, One Union Square corner), and the two Starbucks with no 2024+ source are flagged `unverified`.

## Table — high-visibility storefronts (facing or bounding the square)

Legend: ✓ verified (right tenant, right side, right position/order, legible) · ? uncertain (present but illegible/unverified or a plausible-but-unsourced detail) · ✗ incorrect/missing.

| # | Tenant (census) | Address | Registry (x,z / status) | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | Nintendo SAN FRANCISCO | 331 Powell (NW cnr Geary) | -81.8,34.5 open/high hero | ✓ | `nt1`,`ntg1b`,`ntg2b`,`pw1`: red fascia both faces, vinyls, awnings; W side of Powell at Geary corner |
| 2 | Westin St. Francis entrance | 335 Powell | **absent** | ✗ | `wst1`,`pw3`: blank base at z≈-10, no portico/canopies/flags; authored in west_powell.json |
| 3 | Victoria's Secret | 335 Powell | **absent** | ✗ | `pw2`,`pw4`: blank wall z≈20…-30 |
| 4 | Pandora | 345 Powell (cnr Post) | **absent** | ✗ | `pw5`,`pwc3`: blank corner |
| 5 | Bourbon Steak | 335 Powell | **absent** | ✗ | authored, not rendered (and real one is 2nd floor) |
| 6 | Saks Fifth Avenue (closed) | 384 Post / Powell | -47.9,-60.1 closed/high | ✓ | `pn1`,`pn2`,`p4e1b`: script fascia, papered white glazing on both faces |
| 7 | Tiffany & Co. | 350 Post | -2.2,-61 open/high | ? | `pn4`: portal + tan awnings in place, fascia barely legible, no parapet sign |
| 8 | 340 Post (vacant, ex-W-S) | 340 Post | 14.8,-60.9 vacant/high | ✓ | `pn5`: dark hoarding under arched 2nd floor |
| 9 | Apple Union Square | 300 Post | 43.3,-60.8 open/high hero | ✓ | `pn6`,`ap1`: glass pavilion N of Post, W of Stockton; "Today at Apple" wall |
| 10 | Nike San Francisco | 278 Post (NE cnr) | 88,-60.4 + Stockton face | ✓ | `pn7`,`se1`: swoosh on Post and Stockton faces |
| 11 | Breitling | 275 Post (SE cnr) | 89.1,-44.8 open/medium | ? | `br1`: "BREITL…" dark-on-dark; `ps1c` bay east of it blank |
| 12 | Sunglass Hut | 250-270 Stockton | 82.9,-26.5 | ✓ | `se2` fascia |
| 13 | Gucci | 240 Stockton (N of Maiden Ln) | 82.8,-11.7 | ✓ | `se2`,`se3`: GUCCI fascia, yellow frames, north of the lane |
| 14 | Tory Burch | 222 Stockton (S of Maiden Ln) | 82.1,10 | ✓ | `se3`: green awnings south of lane |
| 15 | BAPE | 216 Stockton | 82.1,22.1 | ✓ | `se4`: small bay, ape mark |
| 16 | Moncler | 212 Stockton | 82.1,29.7 | ✓ | `se4`,`se5` |
| 17 | ex-Bulgari corner (vacant) | 200 Stockton / 180 Geary | (none — blank fascia) | ✓ | `se5`,`gn1c`: unsigned white bays = vacant per census |
| 18 | Neiman Marcus | 150 Stockton (SE cnr Geary) | 80.4,68.8 + 88.2,61.2 | ✓/? | `nm1`,`gs7`,`gse1c`: glass prism at corner, script sign low contrast |
| 19 | Louis Vuitton | 233 Geary (SW cnr Stockton) | 41.3,60.9 + 65.4,75.8 | ✓ | `gs5`,`gs6`,`lv1`: LOUIS VUITTON fascia at corner |
| 20 | Loro Piana | Geary, W of LV | 27.8,60.9 | ✓ | `gs5`,`gs6`: west of LV |
| 21 | Macy's Union Square | 251 Geary | -8.9,60.8 open/high | ✗ (sign) | `mc2`,`mc4`: no parapet/canopy sign; entrance unreadable |
| 22 | Retail bays For Lease (Macy's) | 235-249 Geary | 5.8 / 10.1,60.8 vacant | ✓ | `gs4` |
| 23 | Cheesecake Factory plaques | Macy's piers | -35.7 / 16.3,60.8 | ✓ | `gs2`,`gs4` |
| 24 | Dyson | 285 Geary | -45,60.8 | ✓ | `gs1`,`gs2` |
| 25 | Swarovski | ≈291-299 Geary | -57.7,60.7 (+ Powell face) | ✓/? | `gs1` Geary ✓; Powell-face duplicate unsourced (`p2e1b`) |
| 26 | Shoe Palace | 301-323 Geary (SW cnr Powell) | -86.9,60.4 / -79.6,65.6 / -98.5,60.3 | ✓ | `sp1`,`nt1`,`p2w1`: SHOE PALACE on both faces |
| 27 | CK Contemporary | 246 Powell | -63.2,72.7 | ✓ | `p2e1b` |
| 28 | Zara (coming 2026) | 400 Post / 421 Powell | -88.9,-61.4 / -81.2,-71 coming-soon | ✗ (render) | `p4w1`,`pn1`: finished store with ZARA fascia instead of hoarding |
| 29 | Chancellor Hotel | 433 Powell | -81.4,-100 open/high | ✓ | `p4w2`: canopy sign |
| 30 | Beacon Grand / The Post Room | 450 Powell | -66.1,-124 / -111 | ✓ | `p4e2b`: canopy + fascia, Post Room south of hotel door |
| 31 | Grand Hyatt | 345 Stockton (W side) | 62,-123.4 | ✓ | `hyatt`: canopy, west side of Stockton |
| 32 | Harry Winston | 200 Post (Grant cnr) | 197.5,-59.6 | ? | `pn11c`: sign dark-on-dark |
| 33 | Cartier | 199 Grant / 201 Post | 196.2,-44.1 | ✓ | `ps4c` |
| 34 | Chanel | 156 Geary | 135.3,45.7 | ✗ (order) | `gn2c`: east of ex-BR bay; must be west, next to Whittell |
| 35 | Bang & Olufsen | 146 Geary | 142.1,45.9 | ✓ | position east of ex-BR bay matches; sign not framed |
| 36 | Bottega Veneta / Burberry / Valentino | 124 / 108-116 Geary / 105 Grant | 172.2 / 182.2 / 193.8,46 | ✓ | `gn4` |
| 37 | RealReal / Rolex / Patek | 253 / 255 / 259 Post | 133.4 / 128.9 / 121.3,-44.5 | ✓ | `ps2c`; RealReal also on Maiden Lane (`maiden2`) |
| 38 | Gump's / 250A For Lease | 250 / 250A Post | 133 / 121.7,-60 | ✓ | `pn9c` |
| 39 | Kensington Park Hotel | 450 Post | -153.1,-61.5 | ✓ | `pnw2c` |
| 40 | Sears Fine Food / GG Tap Room / Walgreens | 439 / 449 / 459 Powell | -81.4,-112 / -126 / -141 | ✓ | `p4w3`,`p4w4` |

## ✗ items (blocking / must fix)
1. Westin Powell frontage: Victoria's Secret, Pandora, Westin marquee/portico, Bourbon Steak (+ authored "For Lease" bay) missing from render and registry — items 2–5, fix in item 1 above.
2. Macy's Geary building: no legible "macy's" sign or entrance facing the square — item 21 / fix 2.
3. Chanel ↔ ex-Banana Republic parcels swapped on Geary north — item 34 / fix 3.
4. Zara rendered as an open store while status is coming-soon — item 28 / fix 4.

## Missing real tenants (census-named, not in registry)
In scope and visible from the square: Victoria's Secret (335 Powell), Pandora (345 Powell), The Westin St. Francis entrance (335 Powell), Bourbon Steak (335 Powell), b. patisserie plaza kiosk.
In scope, off-square: Salvatore Ferragamo (236 Post, medium), Corzetti (398 Geary), Hermès (125 Grant / Maiden Lane), Bulgari (206 Grant, boundary), Sherri McMullen (135 Maiden Ln, coming Oct 2026), Maison Margiela / Suitsupply / Spectacles of Union Square (Maiden Lane, house numbers unresolved in census).
Outside the strict boundary (informational): Dandelion Chocolate (167 Powell), STIIIZY (180 O'Farrell), King of Thai Noodle (184 O'Farrell).
Non-storefront census rows not expected in the registry: Union Square Garage entries, Central Subway headhouse, Westin Post/Geary frontage duplicates.

## Coverage
- Census: 122 rows → 88 named tenants, 34 UNRESOLVED. Registry: 119 entries (78 distinct names; 104 named bays + 15 For Lease/Vacant bays).
- Named census tenants represented in the registry: 67 / 88 (76 %); of the 21 missing, 5 are square-facing (all on the Westin), 8 are in-scope off-square, 3 are outside the boundary, 5 are non-storefront rows.
- Side/parity check: 119 / 119 registry entries on the correct side of their street (0 failures; 12 corner-frontage exceptions confirmed manually).
- Visual walk: all eight façade edges walked (Powell W/E 200+300+400 blocks, Post N/S 200+300+400 blocks, Stockton E 100–300 blocks + Grand Hyatt, Geary N/S 100–400 blocks + theatres, Maiden Lane). 61 registry names confirmed by a legible sign; 9 confirmed by presence/raycast label only (Handlery, Art Thou, Inn at Union Square, Van Cleef, Convene, 100/120 Stockton, Hotel Stratford, Isaia, Tory Burch lane face); 8 not framed (Dita, Mastro's, Cafe La Tazita group seen once, 220 Post partially, Campton Bar, Macy's O'Farrell, 399 Mason face, Curran marquee).
- Block order: correct on every walked edge except Geary north 150–156 (Chanel/ex-BR).
