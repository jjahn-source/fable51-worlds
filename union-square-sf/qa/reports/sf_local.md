# QA-B (SF local / geo reviewer) report — 2026-09-01

## Score: 4/10 (category: recognisability of Union Square with the UI hidden)

**Headline.** The *plaza* reads as "Union Square" to a local (Dewey column on axis, corner palms, red-granite Colonnade light pylons, four corner hearts, red-umbrella café kiosks, north stage frame, Powell red lanes with a cable-car-ish vehicle, Nintendo on the Westin corner, Apple's glass box). But the *four sides* do not: the Westin St. Francis, Saks, 340 Post, Neiman Marcus, the I. Magnin marble block and Macy's Geary wall are all rendered as the same white/grey box with a square-window grid. Stand in the middle, spin around, and only the NE quadrant (Apple + Grand Hyatt tower) and the SW corner (Nintendo + Powell red lanes) tell you which way you face. The scene is "generic downtown plaza with a column", not "Union Square, San Francisco". Night is a further step down (unlit monument, unlit facades, unlit Powell).

Evidence set (all absolute paths under `/Users/christinehu/Downloads/fable51-bench/3d/`):
- 34 viewpoints: `qa/shots/qab/`, comparison sheets `qa/compare/qab/vpNN.png`
- Scripted walkthrough (18/18 checks pass, 220 peds / 112 vehicles): `qa/walkthrough/qab/`, log `qa/walkthrough/qab_run.log`
- Orientation tests (plaza centre + 4 corners × N/E/S/W, 5 street approaches): `qa/shots/qab_orient/`, contact sheets `qa/shots/qab_sheets/{centre,ne,nw,se,sw,approach1,approach2_powellnight}.png`
- Night: `qa/shots/qab_night/`, sheet `qa/shots/qab_sheets/night_centre.png`

Cameras used (x,y,z,heading,pitch,fov; y = walkable eye height from `__twin.pos()`):
centre c_n `0,2.9,10,351,4,65` · c_e `-10,2.9,0,81,4,65` · c_s `0,2.9,-10,171,4,65` · c_w `10,2.9,0,261,4,65`; NE corner `55,2.6,-38,*`; NW `-55,3.27,-38,*`; SE `55,-2.62,38,*`; SW `-55,-0.44,38,*` (each at 351/81/171/261); Powell@O'Farrell N `-68,-4.98,150,351,3,60`; Powell@Sutter S `-68,9.08,-150,171,3,60`; Post@Grant W `205,-4.67,-52,261,3,60`; Geary@Mason E `-210,2.48,52,81,3,60`; Stockton@Sutter S `70,4.81,-150,171,3,60`; night Powell@Geary N `-68,-1.1,60,351,3,60`, Powell@Post S `-68,3.9,-60,171,3,60`.

Caveat: `?qa=1` does **not** hide the HUD (top bar, viewpoint dropdown, bottom help strip, storefront tooltip are in every capture). I judged the 3D content only, but the walkthrough/captures can't currently produce a truly UI-free frame — worth a `ui=0` param for future QA.

---

## Orientation test — verdict per side

| Side | Verdict | What gives it away | What is missing / wrong | Evidence |
|---|---|---|---|---|
| **North (Post: Saks / Tiffany / 340 Post / Apple)** | PARTIAL — recognisable only from the NE quadrant | Apple's glass box with 12 m sliding doors, tree canopy visible inside, "Today at Apple" board; Grand Hyatt tower behind it; dark 450 Sutter tower on axis; red-roofed SF Muni shelter at NW corner; Zara at Post & Powell | Saks is a plain white 3-storey box with black storefront frames — no rounded corner bays, no parapet sign (vp28); Tiffany not identifiable; 340 Post beaux-arts is a white box; rooftop billboards absent; no trolley wire on Post | `c_n`, `ne_n`, `nw_n`, `nw_e`, vp03, vp28 |
| **East (Stockton: Neiman Marcus / Grand Hyatt / Maiden Lane)** | FAIL from the plaza; PARTIAL at the east steps | Maiden Lane mouth on axis with a red-brick Tory Burch building and a Gucci storefront; red SB transit lane on Stockton; Hyatt tower | Neiman Marcus has no brown/tan harlequin cladding, no glass rotunda, no script sign — it is a white box with scattered dark squares (vp24, `se_e`); no Maiden Lane gates/bollards/string lights; no subway headhouse/elevator visible at the SE corner; no trolleybus wires on Stockton | `c_e`, `ne_s`, `se_e`, vp24, vp25 |
| **South (Geary: Macy's / I. Magnin)** | FAIL | Red 38 Geary lane along the plaza curb; hedged south edge with steps; the glass curtain wall is at least dark and tall | No "macy's" sign anywhere (rooftop, canopy or corner); no Cheesecake Factory / Burger Bar signs on the stone piers; the curved central glass bay is a flat grid; the I. Magnin white marble block at Geary/Stockton (tall fluted piers, Louis Vuitton / Loro Piana below) is a white box with random windows; Geary grand stair not legible as *the* stair; no garage entry/exit ramps on the N curb | `c_s`, `se_s`, `sw_s`, vp09, vp23 |
| **West (Powell: Westin St. Francis)** | PARTIAL — via Powell, not via the hotel | Red Muni lanes, a cable-car-shaped vehicle, corner palms, red light pylons, Nintendo SAN FRANCISCO red sign on the Westin's SE corner, taxis, Zara opposite | The three 1904 Westin wings are a light grey/blue *glass* grid — no brown Colusa sandstone, no heavy copper cornices, no columned portico, no red awning, no domed Victoria's Secret awnings, no flags; the 1972 tower is not visible behind; no cable-car stop sign, no boarding island at Post, no slot rail visible | `c_w`, `nw_s`, `sw_n`, vp05, vp14, vp16 |

Street approaches (one block out):
- **Powell @ O'Farrell looking N** (`pow_of`): reads as a red-lane transit street with cable-car ahead — good — but this block (O'Farrell→Geary promenade) has *brick pavers and no red paint* in reality (streets.md §2). A local notices immediately. Pop Mart / Powell storefronts are correct businesses.
- **Powell @ Sutter looking S** (`pow_sut`): red lanes correct, Starbucks/Beacon Grand labelled — but the Beacon Grand (Sir Francis Drake) red-brick Gothic tower is the single most identifiable object on this block and it is a grey box. Not recognisable.
- **Post @ Grant looking W** (`post_grant`): one-way east traffic is on the correct side; Westin should close the vista (vp18 note) and does not read as such. Generic.
- **Geary @ Mason looking E** (`geary_mason`): red lane on the correct (north) curb, WB traffic correct, Ficus-like trees on the S side — plausible; A.C.T./Curran theatre marquees not visible.
- **Stockton @ Sutter looking S** (`stk_sut`): SB red transit lane correct; Grand Hyatt labelled but reads as a mid-rise; no trolley wire, no Union Square heart banners.

---

## Top-15 things that break the illusion (severity, camera, fix)

1. **[high] Westin St. Francis is a glass-grid apartment block** — vp05 (`-20.3,1.8,-1.6,261,12,60`), vp14, `c_w`, `nw_s`. Reference: three 12-storey brown sandstone wings with rusticated base, deep copper cornices, columned entrance portico with red awning, flags; 32-storey tan 1972 tower behind. Fix: author a proper facade set for 335 Powell (sandstone albedo, cornice extrusions, 2-storey rusticated base, portico + awning + flagpoles, domed VS awnings north of the entrance) and ensure the 1972 tower mass sits behind at ~100 m height.
2. **[high] Macy's / I. Magnin have no identity: no "macy's" sign, no marble block** — vp23 (`-11.3,-1.6,47.1,171,6,40`), vp09, `c_s`, `se_s`. Reference: 5-bay curtain wall with curved centre bay, "macy's" on roof and canopy, Cheesecake Factory sign on the piers; white marble I. Magnin with tall fluted piers at Geary/Stockton. Fix: add the rooftop + canopy signs, curved bay geometry, Cheesecake Factory sign; replace the SE-corner box with a white-marble facade with vertical fins and Louis Vuitton / Loro Piana ground-floor bays.
3. **[high] Neiman Marcus missing harlequin cladding and rotunda** — vp24, `se_e` (`55,-2.62,38,81,4,65`), `ne_s`. Reference: brown/tan diamond (harlequin) cladding on both elevations, 4-storey glass rotunda at the corner with the City of Paris stained-glass dome visible inside, "Neiman Marcus" script on Geary. Fix: harlequin texture on 150 Stockton, corner glass rotunda volume with a lit dome interior, script signage.
4. **[high] Saks Fifth Avenue is a white box** — vp28 (`-63.7,3.5,-47,30,15,75`), `nw_n`, vp03. Reference: beige stone with rounded corner bays and "SAKS FIFTH AVENUE" parapet sign; Beacon Grand Gothic crown directly behind. Fix: rounded corner bays, parapet sign, correct storey count; model the Beacon Grand crown.
5. **[high] Red transit paint on the Powell promenade block (O'Farrell→Geary)** — `pow_of` (`-68,-4.98,150,351,3,60`), walkthrough shot 01. Reference/recon: brick pavers + charcoal track strip, no red paint; red lanes only Geary→Sutter. Fix: swap the surface material south of Geary to brick and remove red.
6. **[high] Dewey Monument is a smooth grey pipe on a plain box** — `c_n/e/s/w` (`0,2.9,±10,…`), vp21, vp09. Reference: grey granite shaft with Corinthian capital, bronze Victory with wreath + trident, base with bronze inscription panels and Roosevelt/McKinley plaques. Fix: fluted/aged granite material, real capital mesh, inscription plates on all four faces; the base flower beds are fine.
7. **[med] Night is dead** — `n_c_*`, `n_pow_post` (`-68,3.9,-60,171,3,60`). Reference (vp26/vp29): Westin wings floodlit, Saks/Tiffany interiors lit, monument uplit, Powell storefronts and hotel marquees glowing, cable-car headlamps. Fix: emissive storefront glass at night, monument uplights, facade floodlights on Westin/Saks, warm street lamps on Powell (currently only the plaza globes glow).
8. **[med] Cable car reads as an enclosed trolley** — `nw_w` (`-55,3.27,-38,261,4,65`), vp14. Reference: open-sided Powell car, maroon/cream with blue "Powell & Mason"/"Powell & Hyde" roof boards and numbers, grip in the open section. Fix: open the sides, add the roof sign, livery and headlight; add cable-car stop signs (yellow "CAR STOP" plates) at Geary, Post, Sutter and the Post boarding island.
9. **[med] Wrong vehicle era / fleet** — vp23, `ne_n`, `se_w`, walkthrough 02. Boxy 1980s sedans and a boxy yellow cab; SF taxis are Prius/Camry hybrids; no 38 Geary articulated Muni bus, no 30/45 trolleybus on Stockton, no delivery vans/Ubers. Fix: swap the vehicle set (hybrid taxi, Muni bus with red/grey livery on Geary, trolleybus on Stockton).
10. **[med] No overhead trolley wire on Post, Sutter or Stockton** — `ne_n`, `nw_n`, `stk_sut`. A local's cheapest tell for SF downtown. Fix: catenary lines + span poles on Post/Sutter/Stockton (streets.md lists trolley wire on Post).
11. **[med] Surrounding older buildings are cornice-less boxes** — every street approach, esp. `pow_sut`, `post_grant`, `sw_s`. The 200-block Powell, 300-block Geary and Sutter blocks have bay windows, fire escapes, terracotta cornices and vertical hotel signs (Chancellor, Handlery, Stratford). Fix: parametric bay-window + fire-escape + cornice decorations by building age; vertical blade signs for the hotels.
12. **[med] Plaza paving is a plain grey grid** — `c_*`, `sw_n`. Reference: pink/grey granite with dark banding radiating from the monument and the stepped terraces. Fix: banded granite material with the correct band spacing (plaza.json).
13. **[med] SE-corner transit headhouse / elevator absent, Geary garage ramps absent** — `se_n` (`55,-2.62,38,351,4,65`), `se_w`, vp33. Reference: glass/steel Union Square–Market St station headhouse with elevator at Stockton & Geary; 2-lane garage entrance ramp (E) and exit (W) on Geary's north curb. Fix: model both; they are how locals orient at the SE corner.
14. **[low] Maiden Lane mouth lacks its white gates, bollards and string lights** — vp25 (`34.1,1.7,9.5,81,-3,55`). Fix: gate posts, bollards, catenary of paper lanterns; keep the red-brick building (good).
15. **[low] Signage that a local expects is missing or uncheckable** — no Union Square Alliance heart banners (the red banners are blank), no street-name blades at intersections, no "CAR STOP" plates, no 38 Geary bus stop flags/shelter on the Geary curb. Fix: banner texture with the heart logo, street blades on every signal pole, Muni flags.

Viewpoint placement anomalies (geo): vp16 (`-53.3,3.3,-45.3`) lands inside the Bike-Rental kiosk glass, vp19 (`29.4,-3.1,76.3`) inside a building south of Geary, vp24 (`14.7,-2.8,73.8`) in the Geary roadway rather than the SE corner. vp19/vp24 lon (-122.40705/-122.40722) is ~45 m west of the real Stockton & Geary crossing (~-122.4065); the local frame (Stockton x≈73.5) looks right, so the recon lat/lon for those two should be corrected.

---

## Top-10 things that work (keep)

1. **Plaza plan and furniture**: monument on axis, raised terraces with steps on all four sides, corner palms, red-granite Colonnade light pylons with globe clusters, black twin-globe lamp posts, hedged planters, monument flower beds — `c_*`, vp07, vp09.
2. **The four corner hearts** (NE maroon, SE red, SW red, plus another visible from the NW) — `ne_s`, `se_n`, `sw_n`.
3. **Apple Union Square**: glass box, giant sliding doors, tree canopy inside, "Today at Apple" board, interior with tables/Genius Grove — `ne_n`, walkthrough 12–15.
4. **Nintendo SAN FRANCISCO** at 331 Powell on the Westin's Geary corner: red sign, Mario window, walkable interior — vp13/vp20, `sw_w`.
5. **Powell St transit treatment north of Geary**: red centre lanes, tracks on axis, two-way traffic, taxis, palms on the plaza edge — `nw_w`, vp14.
6. **Geary / Stockton red lanes on the correct curbs and one-way directions** (38 on the plaza curb of Geary WB; SB transit lane on Stockton; Post one-way E) — `geary_mason`, `stk_sut`, `post_grant`.
7. **Storefront registry is genuinely SF** (119 entries): Zara at Post & Powell, Gump's, Tiffany 350 Post, Cartier 199 Grant, Gucci 240 Stockton, BAPE, Moncler, Tory Burch, Isaia on Maiden Lane, Sears Fine Food, Chancellor, Beacon Grand, A.C.T. Geary, Curran, Handlery, Chanel 156 Geary, Louis Vuitton 233 Geary, Pop Mart 200 Powell, "vacant (ex-Williams-Sonoma; Chanel fit-out)" at 340 Post — that vacancy note is exactly what a local would say in 2026.
8. **SF Muni shelter design** (red wave roof, glass back) at the Post/Powell corner — `nw_n`.
9. **Street furniture details**: green SF-style litter bins, white-body/blue-cap hydrants, U-rack bike racks, continental (ladder) crosswalks, black signal poles — `nw_w`, `se_e`, `ne_w`.
10. **Street-level life**: 220 pedestrians with walk/wait/photo/look/sit states, people sitting on the terrace walls, coffee cups, café seating in use; 112 vehicles moving in the right directions — walkthrough 16, `c_n`.

---

## Blocking issues (must fix)
1. [severity: high] vp05 / `c_w` — Westin St. Francis unrecognisable (glass grid, no sandstone, cornice, portico, awning, tower) — reference vp05/vp14 photos — see item 1.
2. [severity: high] vp23 / vp09 / `c_s` — Macy's has no signage and the I. Magnin marble block is a white box — reference vp23/vp09 — see item 2.
3. [severity: high] vp24 / `se_e` — Neiman Marcus has no harlequin cladding or rotunda — reference vp24 — see item 3.
4. [severity: high] vp28 / `nw_n` — Saks is a white box; Beacon Grand crown missing — reference vp28 — see item 4.
5. [severity: high] `pow_of` — red paint on the brick-paved Powell promenade block — reference streets.md §2 — see item 5.
6. [severity: high] `c_n/e/s/w` — Dewey Monument shaft/base too crude to read as *the* monument up close — reference vp21/vp10 — see item 6.

## Major
7. Night lighting (item 7); cable-car model and stop signs (8); vehicle fleet (9); trolley wire (10); box-like historic street walls (11); plaza granite bands (12); SE headhouse + Geary garage ramps (13).

## Minor / polish
8. Maiden Lane gates/lights (14); banners, street blades, Muni flags (15); umbrellas are all red (real mix includes green at the east kiosk); the north stage frame reads heavier/darker than the real steel trellis (vp03/vp09); HUD visible in QA captures (add a `ui=0` param); vp16/vp19/vp24 camera placement (see anomalies above).

## What is right (keep)
See "Top-10 things that work" above.
