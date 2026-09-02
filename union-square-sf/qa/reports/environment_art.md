# QA-D Environment Art report — 2026-09-01

Reviewer: QA-D (game environment artist, independent). Scope: visual density, street-level storytelling, composition, environmental believability. No project files modified.

## Score: 5/10 (category: environment art — density / believability)

The bones are right: the street network, red Muni lanes with cable-car rails, continental crosswalks, signal heads, lamp posts with banners, the plaza furniture set and the pedestrian/vehicle life all read as San Francisco from 30 m away. At 1.7 m the world is hollow: sidewalks outside the plaza are near-empty planes, most storefronts are blank glass over flat grey "interiors", the four hero façades that face the square (Westin, Macy's, Neiman Marcus, Saks) are generic window grids or white slabs, every roof in the core is an empty slab, and night is a dead street with no shop glow. The plaza itself is the only cell that would pass a AAA "walk around it" test.

## Method

Spatial checklist grid over the core (x -120…120, z -110…110) → 9 cells of ~80 × 73 m. Per cell: 2 street cameras at 1.7 m eye height + one 45° aerial (y = 60, pitch -45). Central column (N, C, S) also captured at night; plaza aerial + two street cams at sunset. Plus 12 walk-by stations along the four façades of the square (plaza-side sidewalk, 1.7 m, looking ~30° across the street), 6 of them reviewed in detail. 41 frames viewed. Cameras are given as `x,y,z,heading,pitch` (y absolute; ground = terrain, plaza deck ≈ 0).

Shots: `qa/shots/qa-d/day/*.png`, `qa/shots/qa-d/night/*.png`, `qa/shots/qa-d/sunset/*.png` (all reproducible with `node tools/qa/capture.mjs --out=… "--cam=<id>:x,y,z,h,p,65"`).

| id | camera (x,y,z,h,p) | id | camera |
|---|---|---|---|
| NW1 | -100,4.3,-60,81,2 | NW2 | -70,5.8,-95,171,2 |
| NWa | -45,60,-38,306,-45 | N1 | -30,3.1,-59.5,81,4 |
| N2 | 35,1.5,-47,261,4 | Na | 0,60,-23,351,-45 |
| NE1 | 82.5,0.1,-60,261,6 | NE2 | 75,2.2,-95,171,3 |
| NEa | 38,60,-31,36,-45 | W1 | -64,1.4,20,290,6 |
| W2 | -81.5,0,30,351,4 | Wa | -38,60,0,261,-45 |
| C1 | -20,1.6,25,36,4 | C2 | 25,1.6,-20,216,4 |
| Ca | 42,60,42,306,-45 (day/night/sunset) | E1 | 100,-2.3,0.7,81,3 |
| E2 | 82.5,-3,30,351,4 | Ea | 30,60,0,81,-45 |
| SW1 | -70,-2.6,95,351,3 | SW2 | -100,-0.5,57.5,81,4 |
| SWa | -38,60,115,216,-45 | S1 | -25,1.7,44,150,5 |
| S2 | 20,-2.7,57.5,261,4 | Sa | 0,60,23,171,-45 |
| SE1 | 62,-3.1,47,126,6 | SE2 | 82.5,-4.7,95,351,4 |
| SEa | 38,60,31,126,-45 | P1/P2/P3 | -55 / -5 / 45, 2, -47, 51, 3 (Post walk-by) |
| ST1/2/3 | 65, 0.2 / -1.3 / -2.9, -35 / 0 / 35, 141, 3 (Stockton walk-by) | G1/2/3 | 45 / 0 / -45, -2.8 / -2.1 / -1.1, 43, 231, 3 (Geary walk-by) |
| PW1/2/3 | -64, -0.45 / 1.4 / 3.1, 35 / 0 / -35, 321, 3 (Powell walk-by) | | |

Supporting data (in-app): 220 pedestrians (171 walk / 36 wait / 10 sit / 1 photo), 111 vehicles (4 buses, 4 cable cars, 5 bikes, 22 taxis, 12 delivery vans, 6 box trucks), 104 signal heads, 256 street lamps + 22 plaza lamps. Named-prop census (scene traverse; 278 unnamed instances not attributable): street trees 620 + 468 planes + 28 olive, palms 34, hedge 381, café chairs 114, bike racks 69, awnings 30, roof water tanks 30, flags 9, bollards 5, bins 5, hotel marquee doors 36; **0 newspaper racks, 0 hydrants, 0 transit shelters, 0 scaffolds, 0 vendor carts, 0 A-frames** by name; ~20 branded sign instances in the whole core (incl. one `sign:box:sears` — verify, there is no Sears downtown).

## 9-cell scorecard (1–10)

Cells: rows N (z -110…-37) / M (z -37…37) / S (z 37…110); columns W (x -120…-40) / C (x -40…40) / E (x 40…120).

| cell | area | terrain | building | façade | storefront | signage | road | sidewalk | furniture | vegetation | lighting | affordance | **avg** | obviously unfinished? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NW | Post & Powell NW, Saks, Powell north | 7 | 5 | 4 | 3 | 5 | 8 | 4 | 4 | 5 | 6 | 5 | **5.1** | YES — Saks upper floors are a windowless white slab (P1); Saks Powell side is blank glass over grey (NW2); empty sidewalks; flat roofs (NWa) |
| N | Post north row: Tiffany / 340 Post / Apple | 7 | 6 | 5 | 6 | 6 | 8 | 5 | 5 | 6 | 5 | 6 | **5.9** | partly — Tiffany (350 Post) reads as a generic blue-glass office tower (Na, N2); luxury row dark at night (night N2) |
| NE | Post & Stockton NE, Stockton north | 7 | 5 | 4 | 4 | 5 | 8 | 4 | 4 | 5 | 5 | 5 | **5.1** | YES — continuous dark ribbed windowless wall on Stockton's west side north of Apple (NE2; recon: Grand Hyatt is pale beige precast with a porte-cochère); empty sidewalks both sides |
| W | Westin St. Francis, Powell | 7 | 5 | 4 | 6 | 5 | 8 | 3 | 3 | 4 | 6 | 5 | **5.1** | YES — Westin base is a blank wall with tiny windows, no readable portico/marquee/flags from W1/PW2; 10 m-wide empty sidewalk (W2); empty roof (Wa) |
| C | Union Square plaza | 8 | 7 | 7 | 6 | 6 | 8 | 8 | 8 | 7 | 6 | 7 | **7.1** | corners only — the four corner stair/ramp masses are flat untextured grey wedges from any elevated view (Ca, Ea, sunset Ca); hedges are 1 m "cabbage" sprites up close (C1) |
| E | Stockton east side, Maiden Lane | 7 | 5 | 4 | 4 | 4 | 7 | 3 | 2 | 4 | 5 | 5 | **4.5** | YES — Maiden Lane is a bare asphalt alley: no gates, tables, planters, string lights, no V.C. Morris arch (E1, Ea); Stockton-side plaza steps untextured (Ea) |
| SW | Geary & Powell SW, Powell promenade | 7 | 6 | 5 | 4 | 5 | 8 | 4 | 5 | 5 | 6 | 5 | **5.5** | partly — promenade block has 21-ft sidewalks but plain concrete instead of brick pavers, no seating/planters/vendors (SW1); blank storefront interiors |
| S | Macy's, Geary | 7 | 4 | 3 | 3 | 4 | 8 | 5 | 5 | 6 | 4 | 5 | **4.9** | YES — Macy's Geary front is a blue-glass office grid with a leaked façade texture behind the ground-floor glass (S1); roof is an empty slab (Sa); no MACY'S letters; dark at night |
| SE | Neiman Marcus, Geary & Stockton SE | 7 | 4 | 3 | 3 | 4 | 8 | 4 | 3 | 5 | 5 | 5 | **4.6** | YES — Neiman is a glass box without its rotunda (SE1); blank back/side walls at eye level on Stockton south of Geary, building face intrudes into the sidewalk (SE2); empty roof slab (SEa); floating rooftop units in the sky (SE1) |

Column means: W 5.2 · C 5.8 · E 4.7. Row means: N 5.4 · M 5.6 · S 5.0. Only the plaza cell exceeds 6.

## Blocking issues (must fix)

1. [severity: high] **S1 (-25,1.7,44,150,5) + Sa + night S2** — Macy's, the whole south wall of the square, reads as three unrelated generic buildings (white slab with random dark squares / blue-glass office grid / beige box). Behind the ground-floor glass a small-window building texture is visible (a façade texture leaking through as the "interior"). No MACY'S letters, star is a 20 cm decal, roof is an empty slab (the real roof carries the Cheesecake Factory terrace that vp01/vp29 are shot from). Reference: docs/recon/south_geary.md, refs/south_geary. Fix: authored façade spec (white Vermont-marble piers, deep display vitrines with backdrops, canopy, MACY'S letters + star at the Geary/Stockton corner), a proper interior shell, roof terrace with umbrellas/planters/glass rail + mechanical cluster.
2. [severity: high] **W1 (-64,1.4,20,290,6), PW2 (-64,1.6,0,321,3), W2 (-81.5,0,30,351,4)** — the Westin's Powell frontage: base is a blank pale wall with a row of tiny windows, no portico/marquee/flags readable from the plaza edge, 36 `door_hotel_marquee` and 9 `flag` instances exist but do not read; the west sidewalk is a ~10 m empty concrete plane (spec: 4.0 m sidewalk + 2.7 m taxi zone). Fix: authored base (columned portico, marquee, flagpoles with 3 flags, brass doors), taxi rank with 3 cabs + 2 doormen + luggage cart, bollards/planters along the kerb, correct the sidewalk width.
3. [severity: high] **SE1 (62,-3.1,47,126,6), SE2 (82.5,-4.7,95,351,4), SEa** — Neiman Marcus is a blue curtain-wall cube; the City of Paris rotunda corner is absent; the Stockton side south of Geary presents blank grey panels at eye level and the building face sits ~1.5 m inside the sidewalk zone (camera at x 82.8 is touching a wall; sidewalk spec is x 80.7…84.4). Fix: authored spec (tan stone, corner rotunda glass drum, awnings, vitrines), fix footprint vs sidewalk, side vitrines on Stockton.
4. [severity: high] **E1 (100,-2.3,0.7,81,3), Ea** — Maiden Lane is an anonymous alley: asphalt, plain concrete sidewalks, blank glass both sides, no gates at Stockton, no café tables/umbrellas, no planters, no string lights, no V.C. Morris brick arch at 140. It is the one "secret" pedestrian street in the core and currently the least believable cell. Fix: gate posts + iron gates (open), setts/brick paving, 6–8 café tables with chairs and umbrellas, 6 planters, overhead string lights, bollards at the Stockton mouth, authored 140 Maiden Lane arch.
5. [severity: high] **Ca (42,60,42,306,-45), Ea, sunset Ca** — the plaza's four corner stair/ramp masses are flat untextured grey wedges from any elevated view (also the west-side steps seen from Wa). Fix: model actual granite step runs with risers, handrails and cheek walls; texture the ramp slabs to match plaza paving.

## Major

6. [severity: major] **Night (night N2 35,1.4,-47,261,4; night C2; night S2; night Ca)** — no storefront glow on Post's luxury row or on Geary, Macy's/Westin/Neiman façades not floodlit, Dewey monument not uplit, sky is pure black (no city glow), 5.1 M tris vs 10.1 M by day suggests half the scene drops out at night. Only Apple's glass box and one Post storefront glow. Fix: emissive vitrine planes for every `status: open` storefront, warm floods on the four hero façades, 4 monument uplights, low-intensity sky-glow gradient, lamp pools every ~25 m on sidewalks.
7. [severity: major] **NW2 (-70,5.8,-95,171,2), P1 (-55,2,-47,51,3)** — Saks Fifth Avenue: the Post side is a windowless white slab with only a small "Saks" plate; the Powell side is blank glass over flat grey. Recon: white precast 1981 HOK with a curved corner, closed May 2025. Fix: authored spec with window bands and the curved corner; because it is closed, use paper-covered vitrines + "closed" hoarding and a couple of security bollards, not empty glass.
8. [severity: major] **NE2 (75,2.2,-95,171,3), NE1** — Stockton's west side north of Post is a continuous dark vertical-ribbed windowless wall at street level. Apple's Stockton face is correctly a solid grey metal panel (recon confirms), but the Grand Hyatt beyond it should be pale beige precast with a porte-cochère on Stockton. Fix: authored Hyatt Stockton elevation (porte-cochère canopy, taxis, flags, planters); add panel seams + logo plate on Apple's wall so it reads as brushed steel, not corrugated shed.
9. [severity: major] **Sidewalk prop density, all cells except C** — named census: 0 newspaper racks, 0 hydrants, 0 Muni shelters, 5 bollards, 5 bins; sidewalks in NW1, NW2, NE2, W2, E1, E2, SW1, S2 show 0–1 props per 40 m. Fix: a kerb-zone prop pass per block (below, fixes 8–9).
10. [severity: major] **Roofs (NWa, Na, NEa, Wa, Sa, SEa)** — every roof inside the core is a flat slab with 0–4 HVAC cubes; 30 water tanks exist but sit mostly outside the core (SWa shows two, good). No parapets/coping, roof hatches, skylights, elevator penthouses, mechanical screens, satellite dishes, and no billboards on the Stockton/Geary roofs. Fix: roof-clutter kit per building class + specifically dressed roofs on Macy's, Westin, Neiman, Saks, Tiffany.
11. [severity: major] **Storefront interiors (NW1, NW2, SW1, S2, E1, ST2, G1)** — 96 of 119 storefronts are `open`, yet almost all are black-mullion glass over a flat grey plane. Fix: a vitrine kit (backdrop, 2–3 mannequins/shelves, downlights, blade sign) instanced per open storefront; hoarding/posters for the 14 vacant + 4 coming-soon.
12. [severity: major] **Post luxury row (N2 35,1.5,-47,261,4; Na)** — Tiffany (350/360 Post) is a 42 m blue-glass office slab; 340 Post and Apple are fine. Fix: authored Tiffany spec (stone, granite portal, Tiffany-blue awning strip) and Bulgari/Cartier-type vitrines with the existing sign planes.
13. [severity: major] **Transit stops** — no Muni shelters/stop flags anywhere: 38 Geary stop at Geary & Stockton NE, 8/30/45 stop on Stockton, 2 Clement on Post; no Muni bus in the core (4 `bus_tour` only). Fix: 3 Muni shelters, stop flags, one 38R articulated bus on Geary's red lane, one 30 on Stockton.

## Minor / polish

14. [minor] **Red transit-lane decal edges wobble** (G3 -45,-1.1,43,231,3; PW2; ST2; W1) — the red paint boundary is a jagged hand-drawn polygon where it meets crosswalks and lane ends. Fix: lane-aligned quads with square ends at the crosswalk stop line.
15. [minor] **Foliage cards** (N1 -30,3.1,-59.5,81,4; SW2; SE2; C1) — street trees show straight lines through the canopy and 30 cm oval leaves at close range; hedges are 1 m cabbage sprites. Fix: alpha-cutout leaf-cluster textures on smaller cards; boxwood texture on hedge volumes.
16. [minor] **Floating rooftop units** (P1 top-left; PW2 top-centre; SE1 above the skyline) — mechanical boxes hang in the sky with no roof beneath (LOD/culling mismatch with their parent building). Fix: parent the boxes to the building LOD, or clamp to sampled roof height.
17. [minor] **Powell promenade block** (SW1 -70,-2.6,95,351,3) — should be brick pavers with charcoal bands per recon, has plain concrete; no seating, planters, vendor carts, "DO NOT ENTER except Muni/taxi" signs. 
18. [minor] **Pedestrian model close-up** (NE1 82.5,0.1,-60,261,6) — heads are ~40-tri blobs with a flat hair cap; fine at 15 m, poor when they walk through the camera. Consider a LOD0 head with ears/neck and a hair card.
19. [minor] **Plaza retaining walls** (E2, G1, ST2) — flat tile texture; real walls are granite coursing with ivy/planting on top (hedges exist) and plaques. Add coursing normal map + a plaque/sign per corner.
20. [minor] **Identical young trees in a row** (SE1, Sa) — same tree asset at the same size every 8 m along Geary/Stockton. Add 3 size/rotation variants and skip 1 in 4.
21. [minor] **Vehicles at close range** (S1, P1, P3) — boxy low-poly with untextured lights; fine in aerials. Add kerb-side parked/loading vehicles (Post loading zone, Geary taxi zone at Macy's, Westin taxi zone) so streets don't look like every car is in motion.
22. [minor] `sign:box:sears` present in the core — verify; likely a placeholder that should be a real tenant.

## Ranked top-20 density / believability fixes

1. **Macy's Geary front** (S1 -25,1.7,44,150,5) — authored façade spec + vitrine interiors + MACY'S letters/star + roof terrace & mechanical; remove the leaked texture behind the glass.
2. **Westin Powell base** (PW2 -64,1.6,0,321,3) — portico, marquee, 3 flagpoles, brass doors; taxi rank (3 cabs, 2 doormen, luggage cart); 6 bollards + 4 planters; sidewalk to 4.0 m + 2.7 m taxi lane.
3. **Neiman Marcus corner** (SE1 62,-3.1,47,126,6) — rotunda drum, tan stone, awnings, corner vitrines; fix footprint vs sidewalk at SE2.
4. **Maiden Lane** (E1 100,-2.3,0.7,81,3) — gates, setts paving, 8 café tables + umbrellas, 6 planters, string lights, V.C. Morris arch.
5. **Plaza corner stairs** (Ca 42,60,42,306,-45) — real granite step runs + handrails on all four corners and the west/east mid-block steps.
6. **Night pass** (night C2 25,2.6,-20,216,4) — vitrine emissives, hero-façade floods, monument uplights, sky glow, lamp pools.
7. **Saks** (P1 -55,2,-47,51,3) — window bands + curved corner; closed-store hoarding and papered vitrines.
8. **Kerb-zone prop pass, Post south & north sidewalks** (N2 35,1.5,-47,261,4): per block add 3 newsracks, 2 hydrants, 4 utility cabinets, 6 bike racks (69 exist — bring them to the kerb), 4 Bigbelly/green cans, 2 A-frames, street-name signs on every corner pole.
9. **Kerb-zone prop pass, Geary & Stockton** (G1 45,-2.8,43,231,3): Muni shelter + stop flag at Geary & Stockton NE corner, 3 newsracks, hydrant, 2 cabinets; on Stockton (E2 82.5,-3,30,351,4) a second shelter for the 8/30/45 plus 4 planters at BAPE/Miller & Lux.
10. **Roof clutter kit** (Sa 0,60,23,171,-45; SEa) — parapets/coping on every core building, 6–10 units per large roof (chillers, exhaust stacks, hatch, elevator penthouse), 6 more water tanks inside the core, 2 billboards on the Stockton/Geary roofs east of the square.
11. **Grand Hyatt Stockton elevation** (NE2 75,2.2,-95,171,3) — beige precast, porte-cochère with canopy and 2 taxis, flags; Apple wall panel seams.
12. **Tiffany 350 Post** (Na 0,60,-23,351,-45) — authored spec; vitrines with lit displays.
13. **Vitrine kit for all `open` storefronts** (SW1 -70,-2.6,95,351,3) — backdrop + mannequins + downlights + blade signs; hoarding for vacant/coming-soon.
14. **Red-lane decal cleanup** (G3 -45,-1.1,43,231,3) — square lane ends at stop lines.
15. **Powell promenade** (SW1) — brick pavers, 4 benches, 6 planters, 2 vendor carts, restriction signs, a queue of 8 at the cable-car stop.
16. **Muni fleet** (Sa) — one 38R articulated on Geary's red lane, one 30 on Stockton, one 2 Clement on Post; F-line not needed here.
17. **Pedestrian placement bias** (W2 -81.5,0,30,351,4; NE2) — weight spawns to shopping frontages; add 2 queues (Nintendo, Apple), 3 seated groups on Macy's side, Westin doormen, a busker at the plaza SW steps.
18. **Foliage** (N1 -30,3.1,-59.5,81,4) — leaf-cluster alpha cards; hedge texture; palm frond alpha.
19. **Floating roof units** (P1 -55,2,-47,51,3 top-left) — parent to building LOD / clamp to roof height.
20. **Signage variety** (NW1 -100,4.3,-60,81,2) — projecting blade signs, awnings with tenant names for the 96 open storefronts, address numerals, parking-regulation and street-name signs; retire the Sears sign.

## What is right (keep)

- Plaza cell (C1 -20,1.6,25,36,4; C2; Ca): wood-slat benches, red granite light pylons with globe lamps, café chairs/tables under red umbrellas, flowerbeds around the Dewey base, lawns, hedge lines, palms, the NE kiosk, the heart sculpture at the NW corner, banners on lamp posts — this is the density target the streets should be brought up to.
- Street engineering: red Muni lanes on the correct kerbs (north kerb on Geary, west kerb on Stockton, centre pair on Powell), cable-car rails with slot, continental crosswalks, 104 signal heads with ped signals, taxis/vans/box trucks/cable cars in the right lanes, one-way flows correct.
- Kerb furniture that does exist reads authentically SF: fluted green cans, grey signal cabinets, single-head parking meters, cast tree grates.
- Authored hero pieces: Nintendo (331 Powell) with signage, red canopy and window graphics (G3); Apple's glass box with "Today at Apple" interior and the living green wall behind (P3, NEa); the Cheesecake Factory sign on Macy's roof corner (S1).
- Aerial storytelling that already works: water tanks and a zig-zag fire escape on the Geary/Powell block (SWa), the odd green mansard on the Elkan Gunst building.
- Sunset lighting composition (sunset Ca): warm long shadows across the plaza bands, the most photogenic frame in the set.
- Pedestrian variety: 220 agents with coats/dresses/hats/long hair, backpacks, handbags, phones, cameras, umbrellas, coffee cups, plus wait/sit/photo states — the asset variety is there, it is the placement that is thin.

Coverage note: 41 of 48 captured frames were reviewed (P2, ST1, ST3, G2, PW1, PW3 and night N1/C1/S1 captured but not viewed to stay near the ~120k budget); findings from adjacent frames cover those stations.
