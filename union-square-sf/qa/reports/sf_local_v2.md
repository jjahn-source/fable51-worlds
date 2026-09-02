# QA-B (SF local / geo reviewer) report v2 — 2026-09-01 (second pass)

## Score: 6/10 (category: recognisability of Union Square with the UI hidden) — up from 4/10

**Headline.** The west side now works: stand at the plaza centre, turn to Powell, and the three-wing Westin St. Francis with its rusticated arcade base, cornices, marquee, flags and red Victoria's Secret awnings, plus Nintendo on the corner, the open-sided cable car and the red Muni lanes, says "Union Square" without a caption. The NE quadrant (Apple, Grand Hyatt, Muni shelter, trolley wire on Post) still works. The south and east sides have moved from "white boxes" to "right colour, wrong detail": Macy's has a logotype (small, translucent, unlit at night), Neiman Marcus is tan with a glass corner, Maiden Lane has bollards and signs. The north-west (Saks + Beacon Grand) is still a blank white box, and there are two new local tells that did not exist last time: the brick paving on Powell was applied to the *wrong block* (Post→Sutter is brick, O'Farrell→Geary is still red — the exact opposite of the recon), and long cornice/string-course bars float in the sky over the Post/Powell block, visible from the plaza centre. Night is now a real night (uplit column, lit hotel windows, lit shopfronts, lamp pools) rather than a black-out.

Evidence set (all absolute paths under `/Users/christinehu/Downloads/fable51-bench/3d/`), all captured with `&ui=0`:
- Reference viewpoints (16): `qa/shots/qab2/vp{01,03,04,05,06,07,08,09,10,13,14,16,17,20,23,24}.png` (log `qa/shots/qab2_vp.log`)
- Extra reference viewpoints: `qa/shots/qab2_extra/vp{21,25,28}.png`
- Orientation cameras (day): `qa/shots/qab2_orient/{c_n,c_e,c_s,c_w,pow_of,pow_sut,post_grant,geary_mason,stk_sut}.png`
- Corner / diagnostic cameras (day): `qa/shots/qab2_extra/{diag_n,nw_n,nw_w,se_e,se_n,pow_geary_s}.png`
- Night: `qa/shots/qab2_night/{n_c_n,n_c_e,n_c_s,n_c_w,n_pow_geary,n_pow_post,n_pow_of}.png`

Cameras (x,y,z,heading,pitch,fov; same as v1): centre `c_n 0,2.9,10,351,4,65` · `c_e -10,2.9,0,81,4,65` · `c_s 0,2.9,-10,171,4,65` · `c_w 10,2.9,0,261,4,65`; `diag_n 0,2.9,10,351,20,50`; NW corner `-55,3.27,-38,{351|261},…`; SE corner `55,-2.62,38,{81|351},…`; Powell@O'Farrell N `pow_of -68,-4.98,150,351,3,60`; Powell@Sutter S `pow_sut -68,9.08,-150,171,3,60`; Powell just S of Geary looking S `pow_geary_s -68,-1.1,60,171,3,60`; Post@Grant W `205,-4.67,-52,261,3,60`; Geary@Mason E `-210,2.48,52,81,3,60`; Stockton@Sutter S `70,4.81,-150,171,3,60`; night Powell@Geary N `-68,-1.1,60,351,3,60`, Powell@Post S `-68,3.9,-60,171,3,60`.

Tooling notes: `?ui=0` hides the top bar and help strip, but the viewpoint caption toast (all `vpNN` shots) and the storefront hover tooltip ("Pop Mart · toys-games · E · info", etc.) are still drawn in every capture. Also `tools/qa/capture.mjs` silently ignores viewpoint ids when any `--cam=` is passed (the `list` picks cams first), so vp28/25/21 had to be captured in a separate run.

---

## Orientation test — verdict per side (v1 → v2)

| Side | v1 | v2 | What now gives it away | What is still missing / wrong | Evidence |
|---|---|---|---|---|---|
| **North (Post: Saks / Tiffany / 340 Post / Apple)** | PARTIAL | **PARTIAL** (NE yes, NW no) | Apple glass box + "Today at Apple", Grand Hyatt slab, red-wave Muni shelter at Post/Powell, Zara "opening 2026" hoarding, trolley wire strung along Post (a genuine SF tell), "SAKS FIFTH AVENUE" parapet letters exist but are only legible from the roof camera | Saks is still a blank white wall with one storefront and a 2 cm "Saks" script (vp28, `nw_n`); 340 Post / Tiffany are white boxes with red rectangles on them; Beacon Grand has no Gothic crown; **floating cornice bars** cross the sky over this block (`c_n` y≈300/330 px, `diag_n`, `nw_n`, vp28, vp10) | `c_n`, `diag_n`, `nw_n`, vp01, vp03, vp10, vp28 |
| **East (Stockton: Neiman Marcus / Maiden Lane / Hyatt)** | FAIL | **PARTIAL** | Neiman Marcus now rose-taupe with a 4-storey glass corner and "Neiman Marcus" script on both faces; Maiden Lane mouth with black bollards, Gucci / Tory Burch / Moncler / Isaia signs, green umbrella at the east kiosk; Stockton has the red SB lane *and* trolley wires; Hyatt tower on axis | Neiman cladding is flat (no harlequin diamonds), the "rotunda" is a square prism with nothing inside (no City of Paris dome); no station headhouse / elevator at Stockton & Geary; no Maiden Lane gates or string lights | `c_e`, `se_e`, `se_n`, vp24, vp25 |
| **South (Geary: Macy's / I. Magnin)** | FAIL | **PARTIAL (weak)** | "★macy's" logotype at the top of the curtain wall, readable from Geary @ Mason and from the north terrace; "LORO PIANA" sign on the marble block; Cheesecake Factory plaques exist as small dark squares; red 38 lane on the plaza curb; hedged south edge + grand stair | Logotype is translucent and small (reads as a decal behind glass), no canopy sign, unlit at night (`n_c_s` shows a dark wall); curved central bay still flat; **the I. Magnin block (233 Geary) is now the worst wall on the square** — a white box with random dark squares over a second window grid and a yellow-framed glass insert (`c_e` right, vp24 right, vp07 right); no garage ramps on the N curb | `c_s`, vp04, vp23, vp09, vp24, `geary_mason`, `n_c_s` |
| **West (Powell: Westin St. Francis)** | PARTIAL | **PASS** | Three 12-storey wings in an E-plan with light courts, 2-storey rusticated arcade base with arched windows, cornices, columned entrance with marquee and three flags, red VS awnings, Pandora, Nintendo SAN FRANCISCO on the Geary corner; cable car with open rear section, cream roof, maroon body, roof board and number; red lanes; corner palms; the 1972 tower mass rises behind | Stone reads grey-green/slate rather than warm brown Colusa sandstone; cornices are dark grey, not verdigris copper; the window grid is a fine square grid instead of tall vertical windows with bay projections; no cable-car stop sign / boarding island at Post; 1972 tower reads white-with-blue-squares rather than tan | `c_w`, `nw_w`, vp05, vp13, vp14, vp16, vp20, `n_c_w`, `n_pow_post` |

Street approaches (one block out):
- **Powell @ O'Farrell looking N** (`pow_of`, `n_pow_of`) and **Powell just S of Geary looking S** (`pow_geary_s`): the O'Farrell→Geary block is **still painted red with tracks**. Recon (`docs/recon/streets.md` line 13/43/86): brick pavers + charcoal track strip, no red paint, Market→Geary. The Pop Mart / 200-block Powell storefronts and the new fire escapes on the west side are good.
- **Powell @ Sutter looking S** (`pow_sut`): the Post→Sutter block is now a **pink/brick surface** with tracks, and the red lanes only start beyond Post. Recon line 14: Post→Sutter has red centre lanes. So the brick material landed on the block north of Post instead of south of Geary (z-sign error). Beacon Grand is still a beige grid tower without its crown; Starbucks / Golden Gate Tap Room / red hotel banners (blank) and fire escapes present.
- **Post @ Grant looking W** (`post_grant`): trolley wires + span poles now present and converge correctly; fire escapes and cornices on the older blocks; Westin still does not read as the closing mass; vehicles are 1980s boxes.
- **Geary @ Mason looking E** (`geary_mason`): the rooftop "★macy's" is visible at the end of the block — a real local cue; red-brick building at left, Ficus street trees; boxy yellow cab.
- **Stockton @ Sutter looking S** (`stk_sut`): SB red lane on the west curb + trolley wires overhead — correct; Grand Hyatt still reads as a mid-rise from here; no heart banners.

---

## Previous top-15 illusion-breakers — status

| # | v1 item | Status | Evidence |
|---|---|---|---|
| 1 | Westin St. Francis is a glass-grid apartment block | **FIXED (massing/base/entrance) / IMPROVED (material)** — E-plan wings, arcade base, cornices, marquee, flags, VS awnings all there; stone colour too grey-green, cornice not copper, windows too small and square | vp05, vp14, vp16, `c_w`, `nw_w` |
| 2 | Macy's / I. Magnin no identity | **IMPROVED (Macy's) / OPEN (I. Magnin)** — logotype + plaques + Loro Piana sign exist; logotype small/translucent/unlit; curved bay flat; 233 Geary block has a doubled random window grid + yellow insert | vp23, vp04, vp09, `geary_mason`, `n_c_s`, vp24 (right), `c_e` (right) |
| 3 | Neiman Marcus missing harlequin + rotunda | **IMPROVED** — tan/rose walls, glass corner prism, script signs; no diamonds, no dome, prism is square | vp24, `se_e` |
| 4 | Saks is a white box; Beacon Grand crownless | **OPEN** — still a blank white wall with a tiny script; parapet letters only legible from the roof; no crown | vp28, `nw_n`, vp01, vp10 |
| 5 | Red paint on the Powell promenade block | **OPEN — and a new regression**: brick applied to Post→Sutter (should be red), O'Farrell→Geary still red (should be brick) | `pow_of`, `pow_geary_s`, `n_pow_of`, `pow_sut` |
| 6 | Dewey Monument a smooth pipe on a plain box | **IMPROVED** — proportions fixed, bronze panels on the pedestal, capital + verdigris Victory with trident; shaft still smooth, capital a block, panel a flat brown rectangle (black at night) | `c_*`, vp06, vp21, `n_c_*` |
| 7 | Night is dead | **IMPROVED (largely fixed)** — monument uplit, hotel/office windows lit, Apple/Nintendo/Pandora/Pop Mart shopfronts lit, lamp pools on the terraces and Powell; still missing: lit "macy's", Westin facade floodlight, cable-car headlamp | `n_c_n/e/s/w`, `n_pow_geary`, `n_pow_post`, `n_pow_of` |
| 8 | Cable car reads as an enclosed trolley | **IMPROVED** — open rear section with benches, cream roof, maroon body, roof board, number; still no "CAR STOP" plates or Post boarding island | `nw_w`, vp14, vp16, `n_pow_post` |
| 9 | Wrong vehicle era / fleet | **OPEN** — boxy sedans and boxy yellow cab everywhere; no 38 Geary bus, no trolleybus on Stockton | vp14, `pow_sut`, `post_grant`, `geary_mason` |
| 10 | No trolley wire on Post / Sutter / Stockton | **FIXED** — wires + span poles on Post and Stockton, correct height (8 m near the plaza, rising with the hill) | `post_grant`, `stk_sut`, `se_e`, vp25, vp01 |
| 11 | Older blocks are cornice-less boxes | **IMPROVED** — fire escapes, cornices, string courses, arched bases on the Powell/Post/Sutter blocks; still no bay windows or vertical hotel blade signs; string-course extrusion bug (see new item) | `pow_of`, `pow_sut`, `post_grant`, `nw_w` |
| 12 | Plaza paving a plain grey grid | **IMPROVED (marginal)** — light/dark banding across the terraces now visible from above; at eye level it is still a lavender-grey grid, not pink granite | vp01, vp25, `c_*` |
| 13 | SE headhouse / elevator + Geary garage ramps absent | **OPEN** — nothing at Stockton & Geary but a grey ticket-machine box; no ramps visible from vp17 | `se_e`, vp17, vp24 |
| 14 | Maiden Lane gates / bollards / string lights | **IMPROVED** — black bollards at the mouth, café furniture, green umbrella; no gates, no lanterns | `se_n`, vp25 |
| 15 | Missing banners / street blades / CAR STOP / Muni flags | **OPEN** — red banners still blank (vp28, `pow_sut`), no blades, no CAR STOP; Muni shelter at Geary/Powell present | vp28, `pow_sut`, `nw_n` |

New since v1:
- **Floating horizontal bars over the Post/Powell block** — two to five long grey mouldings hang in the sky beside/above Saks and continue in front of the buildings behind (`c_n` at y≈300 and 330 px between x≈265–830; `diag_n` y≈540/610; `nw_n` top edge, five stacked; vp28 top; vp10 across the Saks/Tiffany block). The scene has `arch/stringcourse_1m` groups keyed per building — these look like string courses extruded over a building-part's outline/bounding box rather than its visible facade. Visible from the plaza centre, so it is a first-minute tell.
- vp09 now sits under the north stage canopy: the frame is dominated by a dark slab roof and a chrome column (the stage is a solid slab on posts, not the real open steel trellis). vp08 shows the same slab at the top-left.
- vp16/vp19/vp24 camera placements are fixed (vp16 is now in the Powell median with the Westin at right and the NW heart visible; vp24 is on the SE corner sidewalk).

---

## Score justification (6/10)

A local dropped at the plaza centre with no UI now gets three of four sides: west is unmistakably the Westin/Powell cable-car side, north-east is Apple/Hyatt with real trolley wire, and the plaza itself (column with Victory, corner palms, hearts, red pylons, kiosks, banded terraces, café umbrellas) is Union Square at day and night. South and east are the right colours and carry the right names if you squint (macy's, Neiman Marcus, Loro Piana, Gucci), but neither the curved Macy's bay, the Neiman harlequin/rotunda, nor the I. Magnin marble piers exist, and the I. Magnin box has visibly broken windows. The north-west is still a blank white Saks with floating cornice bars in the sky in front of a crownless Beacon Grand. Walking one block out, the fire escapes and wires now feel like downtown SF, but the Powell paving is inverted (brick north of Post, red south of Geary), which a local who rides the cable car notices immediately. That combination — plaza and west side convincing, south/east approximate, NW and Powell paving wrong — is a 6: recognisable, not yet convincing.

---

## Top 10 remaining items (priority order)

1. **[high] Powell paving on the wrong block** — `pow_sut` (`-68,9.08,-150,171,3,60`), `pow_of` (`-68,-4.98,150,351,3,60`), `pow_geary_s` (`-68,-1.1,60,171,3,60`), `n_pow_of`. Rendered: brick/pink track roadway on Post→Sutter (z≈-52…-162), red lanes on O'Farrell→Geary (z≈52…162). Recon `docs/recon/streets.md` lines 13–14, 43, 86: brick Market→Geary, red Geary→Sutter. Fix: flip the sign of the z-range used for the brick material (apply to z > 52, i.e. south of Geary) and restore red + "MUNI ONLY" on Post→Sutter.
2. **[high] Saks Fifth Avenue (384 Post) still a blank white box; Beacon Grand crownless** — vp28 (`37.78826,-122.40832, h30 p15`), `nw_n` (`-55,3.27,-38,351,8,65`), vp01, vp10. Reference vp28: beige stone, rounded corner bays with continuous horizontal bands, 5–6 storeys, "SAKS FIFTH AVENUE" parapet letters readable from across Powell, Beacon Grand Gothic crown behind. Fix: author a facade set (beige limestone albedo, rounded corner geometry, banded storeys, parapet letters ≥1.2 m), and add the Beacon Grand crown set-back + finials.
3. **[high] Floating string-course / cornice bars over the Post–Powell block** — `c_n` (`0,2.9,10,351,4,65`, y≈300/330 px), `diag_n` (`0,2.9,10,351,20,50`), `nw_n`, vp28, vp10. Bars extend across the sky beyond the facades they belong to. Fix: in the facade engine, clip `arch/stringcourse_*` / cornice runs to the visible facade segment (or the building:part outline that is actually rendered) rather than the outline bbox; add a QA eval that flags decoration meshes whose bbox exceeds their building footprint.
4. **[high] I. Magnin marble block (233 Geary) has a doubled window grid + yellow insert** — vp24 (`37.787646,-122.406793, h128 p10`) right third, `c_e` (`-10,2.9,0,81,4,65`) right, `c_s` left, vp07 right. Reference vp08/vp09: white marble with tall fluted vertical piers, black-glass slot windows, Louis Vuitton / Loro Piana bays at street level. Fix: resolve the authored-mass vs. outline overlap on the Stockton edge (discrepancies.md geometry OPEN item), then give the block a fluted-pier marble facade; remove the random dark squares.
5. **[med] Macy's signage not legible / not lit; curved bay flat** — vp23 (`37.787569,-122.407594, h171 p6 f40`), vp04, `c_s`, `n_c_s`. The "★macy's" logotype is translucent and ~1 m high at the top of the glass; no canopy sign; the Cheesecake Factory plaques are illegible dark squares; nothing glows at night. Fix: opaque red emissive letters ≈2.5 m on the parapet band + a canopy "macy's" at the Geary entrance, night emissive; curve the centre bay (5-bay wall, centre bay convex); make the plaques a readable "The Cheesecake Factory" panel.
6. **[med] Neiman Marcus: flat rose walls, square glass prism, no dome** — vp24, `se_e` (`55,-2.62,38,81,4,65`). Reference vp24: brown/tan harlequin diamonds on both elevations, cylindrical 4-storey glass rotunda with the stained-glass City of Paris dome lit inside. Fix: two-tone diamond texture (≈1.2 m diamonds), cylindrical rotunda mesh with an interior emissive dome disc.
7. **[med] Westin material: grey-green stone, dark cornices, fine window grid; 1972 tower white** — vp05 (`37.78792,-122.40775, h261 p12`), `nw_w` (`-55,3.27,-38,261,4,65`), `c_w`. Reference vp05/vp14: warm brown Colusa sandstone, verdigris copper cornices, tall vertical windows in projecting bays, tan tower. Fix: shift albedo to warm brown-grey, copper-green cornice material, 2:1 window aspect in bays, tan tower albedo.
8. **[med] Vehicle fleet still 1980s boxes; no Muni bus / trolleybus** — vp14, `pow_sut`, `post_grant`, `geary_mason`, vp23. Fix: hybrid-shaped taxi/sedan set, 38 Geary articulated bus (red/grey livery) on Geary WB, 30/45 trolleybus on Stockton SB under the new wires.
9. **[med] Monument still crude up close; stage is a solid slab and vp09 sits under it** — `c_n/e/s/w`, vp21 (`h20 p30 f30`), `n_c_*`, vp09, vp08. Shaft smooth (no fluting / granite grain), capital a square block on a drum, bronze panel a flat rectangle that goes black at night; stage canopy a dark slab on chrome posts vs. the real open trellis. Fix: fluted/granite shaft material, Corinthian capital mesh, embossed inscription panels with a small uplight each, open steel-frame stage; move vp09 out from under the canopy (north terrace, not the stage deck).
10. **[low] Corner furniture and signage a local expects** — SE station headhouse + elevator at Stockton & Geary (`se_e`), Geary garage ramps (vp17), Maiden Lane gates + string lights (vp25), heart-logo banners instead of blank red (vp28, `pow_sut`), "CAR STOP" plates + Post boarding island (vp16, `nw_w`), street-name blades; plus `ui=0` should also suppress the caption toast and storefront tooltip for QA captures.

---

## Blocking issues (must fix)
1. [severity: high] `pow_sut` / `pow_of` / `pow_geary_s` — Powell brick paving inverted (brick on Post→Sutter, red on O'Farrell→Geary) — recon streets.md §2 — item 1.
2. [severity: high] vp28 / `nw_n` — Saks still a blank white box, Beacon Grand crownless — reference vp28 — item 2.
3. [severity: high] `c_n` / `diag_n` / `nw_n` — floating cornice bars in the sky over the Post/Powell block — item 3.
4. [severity: high] vp24 / `c_e` — I. Magnin block doubled random window grid + yellow insert — reference vp08/vp09 — item 4.

## Major
5. Macy's sign legibility / night emissive / curved bay (item 5); Neiman harlequin + rotunda (6); Westin material (7); vehicle fleet (8); monument detail + stage slab + vp09 placement (9).

## Minor / polish
6. SE headhouse, garage ramps, Maiden Lane gates/lights, banners, CAR STOP, street blades (item 10); plaza paving still lavender-grey at eye level (vp25, `c_*`); Grand Hyatt reads as a mid-rise from Stockton @ Sutter (`stk_sut`); `capture.mjs` drops viewpoint ids when `--cam` is present; `ui=0` leaves the caption toast + storefront tooltip.

## What is right (keep)
1. Westin St. Francis massing, arcade base, marquee, flags, VS/Pandora awnings, Nintendo corner — `c_w`, vp05, vp13, vp14, vp16, vp20, `n_pow_post`.
2. Night lighting: uplit column, lit hotel/office windows, lit shopfronts, terrace lamp pools, Powell lamps — `n_c_*`, `n_pow_geary`, `n_pow_post`.
3. Trolley wires + span poles on Post and Stockton at plausible height — `post_grant`, `stk_sut`, `se_e`, vp01.
4. Cable car with open rear section, roof board, number — `nw_w`, vp16.
5. Fire escapes, cornices and arched bases on the Powell/Post/Sutter blocks — `pow_of`, `pow_sut`, `post_grant`.
6. Pedestrians now wait/cross with the signals; people sit on terrace walls; café seating in use — `c_n`, vp10, vp25, `n_c_e`.
7. Corrected viewpoints (vp16 in the median with the Westin at right; vp24 on the SE sidewalk; vp23/vp04 on the raised south edge) — `qa/shots/qab2/`.
8. Maiden Lane bollards, Gucci / Tory Burch / Moncler / Isaia signs, green umbrella at the east kiosk — `se_n`, vp25.
9. "★macy's" visible as the terminal view down Geary from Mason — `geary_mason`.
10. Everything from v1's keep list still holds: plaza plan and furniture, four hearts, Apple, Powell red lanes north of Geary, Geary/Stockton lanes and one-way directions, SF-specific storefront registry, Muni shelter, litter bins / hydrants / ladder crosswalks, street life.
