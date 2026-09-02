# Geometric QA report — 2026-09-01

Reviewer: Geometric QA agent (independent). Scope: heights, footprints, street/sidewalk widths, setbacks, plaza levels and objects, intersection/transit geometry, track position, terrain.

Method: all 34 viewpoints captured (`qa/shots/geo`), comparison sheets built (`qa/compare/geo`, every sheet inspected incl. 50 % overlay), plus numeric probes via `tools/qa/eval.mjs` (building infos, `streetSpecs`, rail/slot/red geometry bounding boxes, `terrain.heightAt`, plaza mesh bounding boxes) and `tools/geo/edges.mjs`. Ground truth: `src/data/recon/{streets,plaza,elevation,west_powell,north_post,east_stockton,south_geary}.json`. Local frame: x east, z south, plaza deck (23.9 m NAVD88) = y 0.

## Score: 6.5/10 (category: geometry / massing)

The street grid, lane/track/red-lane layout, terrain and plaza-level structure are essentially correct. The score is pulled down by three massing errors on hero buildings (Macy's, Grand Hyatt, Saks footprint), an oversized monument base, and a red-painted Powell block south of Geary. 14 of 34 viewpoint definitions are themselves wrong (listed separately, not counted against the scene).

## Blocking issues (must fix)

1. [severity: high] vp27, vp09, vp08, vp29, vp34 — **Macy's is a single 45 m box over its whole 8,420 m² footprint (x −39..63, z 63..146)**; the roof terrace set-back is missing. Reference (`south_geary.json`, `east_stockton.json`): the Geary "Union Square" building parapet is 34 m (ground + 5 window rows) with set-back 7th/8th floors (Cheesecake Factory terrace); only the I. Magnin block at the Stockton corner is 43 m. Evidence: vp27 overlay shows a flat uniform roofline where the photo steps down west of the I. Magnin block; vp09/vp08 overlays put the scene parapet above the photo's "macy's" roofline; vp29's camera on the terrace (y≈26 at x −18, z 82) renders from inside the box. Fix: split the mass — I. Magnin block x≈18..63 at 43 m; Geary block x −39..18 at 34 m to the parapet with a penthouse set back ≈8 m from the Geary face rising to 45 m; keep the O'Farrell wing at 45 m.

2. [severity: high] vp06, vp11, vp12, vp21 — **Grand Hyatt is 94 m with no podium**. Scene: tower 31.4..59.9 × −146.8..−105.7, height 94 (OSM value). Reference (`east_stockton.json`): 108 m, 36 floors, tower width 27 m, podium 54 m along Stockton (i.e. z −146.7..≈−93). Probe: the band x 27..61, z −106..−88 contains no building at all (only Apple at ≥ −88 and the tower at ≤ −106), so Apple's rear plaza runs 18 m to the bare tower base instead of ending at the podium's living wall (vp12 reference). Evidence: vp06 overlay — scene tower top visible well below the photo's frame edge. Fix: height 108; add a 12–15 m podium x 31..60, z −106..−93 (leave the rear plaza z −93..−88), green wall on its south face.

3. [severity: high] vp28, vp16, vp15 — **Saks footprint intrudes 2.1 m into the Powell east sidewalk**. Scene west face at x −64.59 (`buildingAt(-64.3,-80)`), Powell east curb at −73.14 + 6.45 = −66.69 → only 2.1 m of sidewalk; reference 4.1 m (`streets.json`, Powell Geary–Post east sidewalk). Property-to-property across Powell is 19.2 m here vs the 20.96 m right-of-way (Westin's face on the west side is correctly at −83.7). Fix: clip/shift the Saks west edge to x ≥ −62.6 (keep the OSM chamfer at the Post corner).

## Major

4. [severity: medium] vp13, vp20 (foreground) — **Powell O'Farrell–Geary carries red "MUNI ONLY" centre lanes** (redGeos x −76.3..−69.9 and −73.0..−70.0, z 59..149.6). Reference (`streets.json` cableCar.trackLanePosition): "Market–Geary the tracks run in a brick-paved, vehicle-restricted roadway"; red lanes start north of Geary. Both 2025/26 photos show plain/brick paving south of Geary. Fix: for the Powell segment z > 58.5 remove the red geometry and use a brick/paver road material (width 8.2 m is already correct).

5. [severity: medium] vp34, vp10, vp09, vp21 — **Dewey Monument base oversized, total height 31.9 m**. Probe (mesh bboxes at origin): pedestal/plinth top at y 5.5, shaft 5.5→26.5 (21 m, Ø1.6 — correct), capital 26.5→28.5, statue to 31.9. Reference (`plaza.json`): total 29 ± 1 m; pedestal 3.35 × 3.35 × 2.4 m on 2–3 steps (5–6 m footprint) → shaft should start ≈3.2 m; circular planted bed Ø6–7 m with 0.3 m kerb. vp34 (camera 7 m north): pedestal reads ≈6 m wide and its cornice ≈3.8 m above deck. Fix: pedestal 3.35 m square × 2.4 m on a 5.5 m stepped plinth ≈0.8 m; shaft 21.5 m from y≈3.2; total 29 m; replace the square planter ring with the circular bed.

6. [severity: medium] vp06, vp08, vp17, vp22 — **Whittell Building, 166 Geary is 56 m; reference 66 m / 16 floors** (`south_geary.json`). It is the tall brown tower right of the monument in four references; 10 m short. Fix: height 66 (footprint x 110..126, z 23..43 is fine).

7. [severity: medium] vp24 — **Neiman Marcus reports 33 m; reference 28 m (5 floors)**. `buildingAt(100,80)` returns an unnamed 33 m building (same value as 100 Stockton behind it), and the vp24 overlay shows the scene parapet slightly above the photo's roofline. Fix: 28 m for way/332521036 (x 82..176, z 63..106); check the merge with the 100 Stockton block (33 m is correct there).

8. [severity: medium] vp03 (right of centre), vp01 — **solid box ≈8 × 5 m, ≈4 m tall on the north terrace near (10..25, −25..−40)** not in the reference; the reference north terrace has the open stage canopy (present, vp06) and a small garage elevator kiosk at (−4, −24). It is not in `buildings.infos`, so it is a prop. Fix: identify the prop and remove or shrink it to the 2 × 2 m elevator kiosk at (−4.4, −24).

## Minor / polish

9. [severity: low] vp14, vp16 — cable-car track centres at x −74.89 / −71.39 = ±1.75 m from the centreline (3.5 m c-c); reference ≈ ±1.5 m (3.1 m c-c). Fix: track offset 1.55 m.

10. [severity: low] vp18, vp05 — Westin Post face at z −42.6 vs the Post south property line at −41.4 (c −51.92 + 6.65 + 3.9): 1.2 m into the sidewalk (2.7 m left). Same class as #3 but smaller. Fix: clip to z ≥ −41.4.

11. [severity: low] `streetSpecs` — Post sidewalks symmetric 3.9 m (reference N 3.7 / S 4.1); Geary symmetric 3.95 (reference N 4.2 / S 3.7); Stockton centreline x 74.0 (brief 73.5). All ≤ 0.5 m; fix only if per-side sidewalk widths are supported.

12. [severity: low] terrain — south promenade (0, 20) at −1.83 vs reference 22.9 m NAVD88 = −1.0; SE corner (73.5, 52) −5.12 vs −4.8. Everything else within 0.3 m (see keep list). Fix: raise the south promenade band z 15..25 by ≈0.8 m.

13. [severity: low] vp15 — the Nob Hill rise is not visible in the telephoto: terrain itself is right (Sutter +7.8, Bush +20.9, Pine +34.9) but the far blocks are not streamed at this distance, so the street reads flat. Fix: increase `streamRadius` for telephoto viewpoints or add a low-LOD far layer.

14. [severity: low] vp28 — Beacon Grand rendered as a plain 75 m slab; height is within the reference range (62 OSM / 70–80 incl. roof) but the Gothic crown set-back is missing (top ≈10 m should step in). Fix: two-step crown on the top 10 m.

15. [severity: low] vp12 — Apple rear plaza is at sidewalk level with no raised terrace/steps from Stockton (reference: raised plaza with steps and the fountain in the stair). Fix: raise the plaza x 27..61, z −100..−88 by ≈1 m with a 3-riser stair on the Stockton side.

## Viewpoint definition errors (not scene errors)

Coordinates are local x, z from the viewpoint lat/lon (checked against the HUD `pos` in the captures). Suggested fixes keep heading unless noted.

- vp04 and vp23: camera at (−13.5, 47) = inside the Geary roadway; notes say "plaza's raised south edge". Use (−13, 39), eye 1.7 m above the promenade (y≈0.7).
- vp10: camera (15, 13) coincides with the SE light pylon at (14, 14) — the huge red column filling the right of frame is the pylon at 0 m. Use (20, 6).
- vp12: camera (78, −40) is opposite the plaza's NE corner, not Apple's rear plaza (z ≈ −92). Use (84, −93), y 10 above sidewalk, heading 275.
- vp16: camera (−53, −45) is on the plaza NW terrace; notes say "Powell roadway median at the Post crossing". Use (−73, −56).
- vp18: camera (61.5, −11) is inside the east café canopy (way/616479963) — glass wall fills the frame. Use (84, −46) on the east side of Stockton at the Post crosswalk.
- vp19: camera (30, 76) is inside Macy's. Use (75, 60) at the Geary crossing on the Stockton axis.
- vp21: from (−28.5, 22) at pitch 40°/fov 30° the Grand Hyatt cannot sit behind the statue (statue at 44° elevation, Hyatt top at ≈30°). The photo is a telephoto from the plaza's south edge on the Hyatt–monument line: use (−15, 42), heading 20, pitch 30, fov 30.
- vp25: camera (34, 9.3) is 8.6 m south of the Maiden Lane axis (z 0.7). Use (34, 0.7).
- vp26: camera (−54, 72), y≈25 is inside the Hotel Stratford/246 Powell block (27 m). Use Macy's roof (−25, 66), y 36, heading 330 (as vp01).
- vp29: camera (−18, 82), y≈26 is inside the Macy's box (also see #1). Add `absoluteY: 36` like vp01 so it still works after #1 is fixed (roof terrace at ≈30 local).
- vp30: camera (43, −6) is inside the east café canopy — renders as a blue void. Use (55, −34) at the NE corner plaza.
- vp31: camera (−103, 61, −13) sits 1.3 m above the Westin main roof behind its balustrade, so the plaza is hidden. Use the tower: (−160, y 100, 0), heading 81, pitch −25.
- vp32: camera (64.6, −2.7) is mid-block on the Stockton west sidewalk; notes say "SE corner of Post & Stockton". Use (84, −42).
- vp33: camera (−19, 75) is inside Macy's. Use (−5, 61) on the Geary south sidewalk.
- vp02: misfiled (Stockton & Ellis, 2005) — outside the modelled area; ignore.

## What is right (keep)

- Street widths and sidewalks (`streetSpecs`): Powell Geary–Post 12.9 / 4.05; Powell O'Farrell–Geary 8.2 / 6.4; Powell Post–Sutter 13 / 4; Stockton 13.4 / 3.75; Post 13.3; Geary 13.4; Sutter 13.8 / 3.4; Maiden Lane 5.5 / 2.5 — all match `streets.json` within 0.2 m.
- Transit lanes: Powell centre red pair (3.1 m each on the tracks, breaking at intersections), Stockton west-curb red (x 67.4–71.7), Geary north-curb red (z 45.2–48.6, x −212..−78 and −66..67), O'Farrell south curb. Rails and slots run continuously through the Geary and Post intersections.
- Terrain at the reference points: NW +2.0 (ref +1.9), NE −1.5 (−1.5), SE −5.1 (−4.8), SW −2.7 (−2.5), mid-Post +0.3, mid-Geary −3.9, mid-Powell −0.2, mid-Stockton −3.4, plaza centre −0.07, north terrace +0.65 (ref +0.9), NW entrance +1.3 (ref +1.6). Powell rises 4.7 m Geary→Post and keeps climbing to Sutter/Bush/Pine.
- Plaza structures at the researched footprints (±1 m): west café (b. Patisserie) x −53..−44, z 3..19; bike-rental kiosk −53..−48, −14..−6; east café 44..56, −18..−4 with arbor canopies; station headhouse at the SE corner (24..41, 29..38); light pylons at (±14, 14)/(±45, 14); palms at the four corner plazas; north stage canopy present.
- Building heights that match research: Westin 60 / tower 120; Saks 27; Tiffany 42; Williams-Sonoma 17; Apple 15; Elkan Gunst 33; Chancellor 52; 400 Post 17; Sears building 21.6; Bank of America 7.2; 449 Powell 19; Beacon Grand 75; One Union Square 25; 100 Stockton 33; Hotel Stratford 27; Macy's O'Farrell wing 45.
- Post frontage ordering and widths Saks 52 / Tiffany 22 / W-S 12 / Apple 34 m (research 51.2 / 22.4 / 11.8 / 34); Westin Powell frontage 84 m; Macy's Geary frontage 102 m to the Stockton corner; Neiman Geary/Stockton 93 × 42 m.
