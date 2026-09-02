# QA-C + QA-D second-pass report (technical art + environment art) — 2026-09-01

Reviewer: combined QA-C (technical artist) / QA-D (environment artist), independent second pass over `qa/reports/technical_art.md` (5/10) and `qa/reports/environment_art.md` (5/10) after the fix cycle listed in `qa/discrepancies.md`. No project files modified other than this report, the `qa/shots/tev2_*` captures and the re-run `qa/perf/day.json` / `night.json`.

Evidence (all 1920×1080, DPR 1, `?qa=1&freeze=1&life=1&ui=0`):
`qa/shots/tev2_day/` (34 vps), `qa/shots/tev2_night/` (34), `qa/shots/tev2_close/` (28 diagnostic cams, day), `qa/shots/tev2_night_close/` (11), `qa/shots/tev2_cells/` (39 QA-D grid + walk-by cams, day), `qa/shots/tev2_night_cells/` (16), `qa/shots/tev2_sunset/Ca.png`, labelled 2×2 contact sheets in `qa/shots/tev2_sheets/` (d01–d13 technical, c01–c08 cells, n01–n07 night, s01 sunset, crops.png). Camera notation `x,y(eye),z,heading,pitch,fov` for `--cam=`. The QA-D cell cameras are exactly those of the v1 table (`environment_art.md`).
Note: a first attempt at the close-cam batch crashed Playwright after 6 cams (Node "Error", no page error); the remaining 22 were re-captured in a second run. The sunset vps (vp01/vp05/vp31) were not captured because `capture.mjs` ignores ids when a `--cam=` is present; only sunset `Ca` exists.

## Score: 6.5/10 (materials 6, lighting 7, geometry integrity 6, performance 6, street-level density 6)

Up from 5/10 on both previous reports. The systemic street artifacts (duplicate intersection boxes, sunken/notched markings, sidewalk slabs in the Powell roadway) are gone, the day grade is usable, night is now a coherent state with consistent lit windows, lamp pools and lit hero shopfronts, and the Westin base finally reads as a hotel. What still holds the scene at "good stylised twin" rather than "AAA": blockout roofs in every elevated view, glossy-tile granite and an untextured monument, rooftop boxes that still float over some buildings, and a new, very visible artifact — the parent building's massing window texture (lit at night) showing through the authored storefront glass of Macy's and the Westin.

## 1. Previous findings — status

### QA-C technical art (v1 numbering)

| # | v1 finding | Status | Evidence (v2) | Notes / remaining fix |
|---|---|---|---|---|
| 1 | Duplicate Powell & Geary / Post crossings: jagged asphalt patches, red-lane z-fight, sidewalk slabs in the roadway | **FIXED** | `tev2_day/vp13.png`, `vp20.png`, `tev2_close/powell_intrude_w.png` (`-77,-1.4,43,351,-20`), `powell_intrude_e.png`, `powell_graze.png`; sheet `d01`, `d02` | Single clean asphalt surface, straight red-lane edges, one set of crosswalk/stop bars. |
| 2 | Crosswalk/stop bars notched on slopes | **FIXED** | `tev2_close/crosswalk_stockton.png` (`66,0.3,-45,351,-25,60`), `asphalt_post.png`; sheet `d01`, `d02` | Overlay texture at 7.8 cm/px is crisp at 2–20 m; the nearest bar edge softens slightly at <1.5 m (acceptable). Overlay is one 8192² RGBA canvas (≈256 MB + mips on the GPU) — see perf. |
| 3 | Rooftop boxes floating in mid-air | **IMPROVED / OPEN** | Gone over Westin/Macy's (`tev2_cells/Wa.png`, `Sa.png`, `tev2_close/aerial_mid.png`). Still floating: `tev2_day/vp06.png` (box in the sky above the red tower, top-centre), `vp10.png` (two boxes above the skyline, centre-left and right), `vp32.png` (top-centre), `vp14.png` (top-centre); crop in `tev2_sheets/crops.png` | `Props.ts:146` now tests `pointInPolygon(footprint)` but still places at `info.topY`; for multi-part outlines the rendered roof at (x,z) is lower than the outline's max height. Use the part height at (x,z) (or raycast down onto the roof mesh) and inset the footprint 2 m so boxes stop sitting on the parapet edge silhouetted against the sky. |
| 4 | Macy's coplanar double window grid | **OPEN** | `tev2_day/vp24.png` right edge (yellow-framed windows over the white wall), sheet `d04`; matches `discrepancies.md` OPEN item | Same fix as v1 (mark outline edge `detail:false` above `mass.baseY` or inset the mass 0.3 m). |
| 5 | Shadow box misses elevated views | **FIXED** | `tev2_day/vp27.png`, `vp01.png`, `vp26.png`, `tev2_close/aerial_mid.png`; sheet `d05`, `crops.png` | `TimeOfDay.update()` follows the view target and widens to 320 m; shadows now land on the plaza from the Hyatt/Macy's roof. Softness on aerials remains (320 m / 2048 = 31 cm texel). `App.ts:28` still sets the deprecated `PCFSoftShadowMap` (console warning every load; three falls back to PCF). |
| 6 | Day grade washed out | **IMPROVED** | `tev2_day/vp03.png`, `vp05.png`, `vp12.png`, `tev2_cells/C1.png`; sheet `d07` | Exposure 0.6, rayleigh 3.0: sky is blue at the zenith, pavements mid-light grey, shadows readable. Horizon band is still near-white (turbidity 1.8 + fog 0xb9cbe0); granite still reads pale blue. |
| 7 | Night: blown-white massing windows vs dim engine windows; dark heroes; no monument light; no lamp halos | **IMPROVED** | `tev2_night/vp05.png`, `vp26.png`, `vp13.png`, `vp16.png`, `tev2_night_cells/W1.png`, `PW2.png`, `Ca.png`; sheets `n01`–`n05` | Window emissives now match (warm cream), Westin/Nintendo/Pandora/Victoria's Secret shopfronts lit, lamp pools on every sidewalk, monument column uplit. Still open: Macy's Geary front dark (`tev2_night/vp04.png`, `vp23.png`), Post luxury row dark (`tev2_night_cells/N2.png`), Maiden Lane dark (`E1.png`), monument uplight blown to pure white (`vp21.png`, `tev2_night_close/monument_close.png`; `Plaza.ts:20` intensity 900), no lamp halos, zenith pure black. |
| 8 | Roofs untextured blockout | **OPEN** | `tev2_close/roof_close.png` (`-10,32,75,171,-40,60` — entire frame flat grey), `aerial_mid.png`, `tev2_cells/Sa.png`, `NWa.png`, `SEa.png`, `tev2_night_close/aerial_mid.png` | Parapet lips now exist on façade-engine roofs; membrane/gravel/clutter still missing. Macy's roof (60 % of `aerial_mid`) is a single flat slab. |
| 9 | `granite_grey` glossy blue tiles | **OPEN** | `tev2_close/plaza_skirt_east.png` (`64,0.3,20,261,0,60`), `plaza_wall_south.png`, `tev2_day/vp34.png`; sheet `d08` | Unchanged: pillowed 1×0.5 m blocks, blue sky reflection. |
| 10 | Terrace pavers: bathroom-tile bevels, 2.4 m repeat | **IMPROVED** | `tev2_close/plaza_pavers.png` (`-20,2.5,-25,351,-35,60`); sheet `d09` | Bevels gone (flat, matte), random dark tiles less regular. Still 0.6 m squares, not the 0.6×0.9 running bond of the central deck. |
| 11 | Sidewalk stain repetition; terrain uses the sidewalk material | **OPEN** | `tev2_close/sidewalk_post.png` (`-30,2.86,-43.3,81,-30,60`), `plaza_bands.png`, `tev2_night_close/geary_east_props.png`; sheet `d09` | Same elliptical blobs every 3 m, also on the plaza central deck. |
| 12 | Monument / Apple hero primitives untextured | **OPEN** | `tev2_day/vp34.png`, `tev2_close/monument_close.png` (`-6,1.6,8,30,15,55`), `apple_interior.png` (`44,0.3,-66,81,0,65` — rainbow-gradient wall screen, flat grey back wall); sheets `d08`, `d11` | Pedestal is still flat 0x9a9691 with a brown plaque quad; proportions were corrected (discrepancies) but not the material. |
| 13 | Interiors over-exposed / moiré | **OPEN** | `tev2_close/apple_terrazzo.png` (`44,0.3,-66,351,-30,60` — floor washes to white), `nintendo_interior.png` (`-86,-1,36,275,0,65` — wavy wood grain); sheet `d11` | Nintendo ceiling no longer clips. |
| 14 | Shadow pass ≈ half the frame | **IMPROVED** | perf tables below | Caster diet (`FacadeBuilder.ts:298` `noShadow` for win_/stringcourse/parapet/balustrade/rustication; meters, banners, signals, streets) + per-cell frustum-culled pools: day triangles −20…−36 %. |
| 15 | Saks blank white slab | **IMPROVED / OPEN** | `tev2_cells/P1.png` (`-55,2,-47,51,3`), `NW2.png`, `tev2_day/vp28.png`, `tev2_cells/Na.png` (parapet letters) | A "Saks" plate, one vitrine and a glass band on the upper floors exist; ground level is still a blank white wall with one dark pane, no curved corner, no papered/closed vitrines. |
| 16–24 | minor | 16 tree pool overflow **OPEN** (console warning `InstancedModel capacity exceeded tree_street_small_bark` still printed every load); 17 vehicle headlights **OPEN** (tail lights only, `tev2_night/vp15.png`); 19 skirt/slab coplanarity **not re-tested**; 20 pink-red transit lane **OPEN** (`tev2_close/asphalt_post.png`); 21 massing tile behind lightwells **OPEN**; 22 cameras inside geometry: `vp29` now looks straight into Macy's ashlar wall and `vp31` is 80 % Westin roof slab (`tev2_day/vp29.png`, `vp31.png`; sheet `d05`) — flag for QA-A; 23 `glass_tint` canopy still an opaque dark slab from below (`tev2_day/vp09.png`) **OPEN**; 24 signage **still good**. |

### QA-D environment art (v1 numbering)

| # | v1 finding | Status | Evidence (v2) | Notes |
|---|---|---|---|---|
| 1 | Macy's = three unrelated generic buildings, leaked texture behind glass, no letters, empty roof | **IMPROVED / OPEN** | `tev2_cells/S1.png` (`-25,1.7,44,150,5`), `tev2_day/vp23.png`, `vp04.png`, `tev2_close/limestone_macy.png` (`-20,-1.9,58,171,10,60`), `tev2_cells/C2.png` (rooftop "macy's" readable from the plaza), `Sa.png` | Authored: dark curtain-wall grid over a limestone band, star + small "macy's" on the glass, rooftop logotype. Still: the massing window tile of the outline wall is visible behind the ground-floor glass (day: white grid; night: lit office grid — `tev2_night_close/limestone_macy.png`), glass reads as a dark office building, letters far too small, roof is a slab (`roof_close.png`), unlit at night. |
| 2 | Westin Powell base blank | **FIXED** | `tev2_cells/W1.png` (`-64,1.4,20,290,6`), `PW2.png` (`-64,1.4,0,321,3`), `tev2_day/vp14.png`, `tev2_night_cells/W1.png`, `PW2.png` | Marquee, three red flags, Bourbon Steak / Victoria's Secret / Pandora awnings, yellow-framed lit vitrines, taxi at the kerb, bins. Sidewalk is still ~10 m of plain concrete (`W2.png`) and the massing tile shows behind the vitrine glass (`tev2_close/sandstone_westin.png`, `tev2_night_close/sandstone_westin.png`). |
| 3 | Neiman Marcus glass cube, no rotunda, face intrudes into the sidewalk | **IMPROVED / OPEN** | `tev2_cells/SE1.png` (`62,-3.1,47,126,6`), `SE2.png` (`82.5,-4.7,95,351,4` — camera still touching the wall), `tev2_day/vp24.png`, `tev2_night_cells/SE1.png` | Rose-taupe granite tiles + script signs + lit glass prism at night; rotunda/dome still absent (approximation acknowledged in discrepancies), Stockton face still ~1.5 m into the sidewalk zone. |
| 4 | Maiden Lane bare alley | **IMPROVED** | `tev2_cells/E1.png` (`100,-2.3,0.7,81,3`), `tev2_day/vp25.png`, `tev2_night_cells/E1.png` | Café tables/chairs, planters, Gucci sign, a brick building. Still asphalt (no setts), no gates/bollards at Stockton, no string lights (dead at night), no V.C. Morris arch, boutique glass over flat grey. |
| 5 | Plaza corner stair masses = flat grey wedges | **OPEN** | `tev2_cells/Ca.png` (`42,60,42,306,-45`), `Ea.png`, `tev2_sunset/Ca.png` | Unchanged. |
| 6 | Night dead street | **IMPROVED** | `tev2_night_cells/Ca.png`, `C2.png`, `S2.png`, `tev2_night/vp26.png` | See QA-C #7. Post luxury row (`N2.png`) and Geary (`S2.png`) shopfronts still dark. |
| 7 | Saks | see QA-C #15 | | |
| 8 | Stockton west side dark ribbed wall; Hyatt Stockton elevation | **IMPROVED / OPEN** | `tev2_cells/NE1.png` (`82.5,0.1,-60,261,6`), `NE2.png` (`75,2.2,-95,171,3`) | Apple's wall now has panel seams + logo (fixed). North of it the Hyatt frontage is still a dark-glass grid with a glass base, not beige precast with a porte-cochère. |
| 9 | Sidewalk prop density | **IMPROVED** | `tev2_cells/NW1.png`, `SW2.png`, `G1.png`, `ST2.png`, `tev2_close/powell_graze.png` | Hydrants, signal cabinets, bins, tree grates, meters, banners now on most blocks; a shelter-like object on Stockton (`ST2.png`). Still 0–2 pedestrians per 40 m outside the plaza; no newsracks/A-frames. |
| 10 | Roofs | **OPEN** | see QA-C #8 | Parapets on engine roofs; water tanks/fire escapes only outside the core. |
| 11 | Storefront interiors flat grey | **IMPROVED / OPEN** | `tev2_cells/SW1.png` (`-70,-2.6,95,351,3`), `S2.png`, `ST2.png` | Census tenants now labelled and many bays have a `shop_lit` backing; generic bays are still black-mullion glass over a flat plane, "For Lease" hoarding exists. |
| 12 | Tiffany blue-glass slab | **IMPROVED** | `tev2_cells/N2.png` (`35,1.5,-47,261,4`), `Na.png` | The Post row now reads as stone with arched windows; still dark at night. |
| 13 | Transit stops | **OPEN / partial** | `tev2_cells/ST2.png`, `G1.png` | One shelter-like object seen on Stockton; no Muni stop flags, no 38R on Geary (tour bus only). |
| 14–22 | minor | 14 red-lane wobble **FIXED** (overlay, `tev2_cells/G3.png` not re-viewed, `PW2.png`/`ST2.png` show straight edges); 15 foliage cards **OPEN** (`N1.png`, `SW2.png` — 30 cm oval leaves and straight lines through canopies); 16 floating units **see QA-C #3**; 17 Powell promenade **OPEN** (plain concrete, `SW1.png`); 18 ped heads **OPEN** (`NE1.png`); 19 plaza retaining walls **OPEN**; 20 identical trees **OPEN** (`SE1.png`); 21 kerb-side parked vehicles **IMPROVED** (taxi at Westin, van on Geary); 22 Sears sign **not re-checked**. |

### New findings (v2)

- [severity: high] **Massing window tile visible behind authored storefront glass** — `tev2_close/limestone_macy.png` (`-20,-1.9,58,171,10,60`), `sandstone_westin.png` (`-81.5,2.2,-10,261,10,60`), and at night `tev2_night_close/limestone_macy.png` / `sandstone_westin.png` where the tile's emissive windows glow inside the shop. Cause: the outline's massing wall (or its `facadeMaterial` tile) remains behind the façade-engine storefront bays; the `shop_lit` backing panel (`FacadeBuilder.ts:150/224/231`) is either absent for these bays or sits behind the massing wall. Fix: for detailed buildings hide the massing wall segment behind every storefront bay (or draw the `shop_lit` backing 0.4 m behind the glass with `depthWrite` and full opacity), and assert in `finalize()` that no massing panel lies within 1 m behind a storefront panel.
- [severity: major] **Markings overlay memory** — `RoadMarkings.ts:8` builds an 8192² RGBA canvas (67 M px ≈ 256 MB VRAM + 85 MB mips, plus a 268 MB JS canvas at build time) for ±320 m. Fix: 4096² (15.6 cm/px is still sharper than the old geometry) or keep 8192 but as a single-channel mask (R8 / `LuminanceFormat`) with the colour chosen in the shader by an id; or tile per 130 m cell and only allocate cells that contain streets.
- [severity: major] **Aerial draw calls went up** — 3485 calls (`aerial`, day) vs 2762 in v1 and 2646 at Powell & Geary vs 2321: per-cell pools multiply InstancedMesh count (pools × cells × 2 passes); aerials that see every cell now issue more calls than the old city-wide pools. Fix: keep per-cell pools for culling but merge far cells (>150 m) into one LOD pool per module, or skip trims/windows in the shadow pass beyond 120 m and drop `stringcourse`/`parapet` modules entirely beyond 250 m.
- [severity: minor] `App.ts:28` sets `THREE.PCFSoftShadowMap` (deprecated in r185, warning on every load) — set `PCFShadowMap` explicitly.
- [severity: minor] Monument uplight (`Plaza.ts:20`, intensity 900 × t) clips the column to pure white with a hard edge (`tev2_night/vp21.png`, `vp03.png`); the pedestal beneath stays black. Lower to ~250, warm it to 0xffd6a0, add two low floods on the pedestal faces.

## 2. Performance

Environment: headless Chromium (ANGLE/Metal), 1920×1080, DPR 1, `q=high`, 220 pedestrians, `--seconds=3`. **Caveat:** during this run two other reviewers' headless Chromium instances were rendering concurrently (≈47 % CPU each, 80 chrome processes); fps/frame-ms are therefore depressed and not comparable with v1. Draw calls and triangles are deterministic per camera and are the reliable delta. For a fair fps reference the 23:12 `day.json` run (same geometry as now, quieter machine) is quoted in the third column.

### Day — `qa/perf/day.json`

| Location | v1 fps (p95) | v1 calls / tris | 23:12 run fps (p95) | **v2 fps (p95)** | **v2 ms** | **v2 calls** | **v2 tris** | Δ calls | Δ tris |
|---|---|---|---|---|---|---|---|---|---|
| plaza centre | 44.8 (37.7) | 2158 / 10.10 M | 78.2 (39.2) | 58.1 (50.3) | 17.2 | 2108 | 7.25 M | −2 % | −28 % |
| Powell & Geary | 38.5 (31.9) | 2321 / 10.16 M | 56.7 (39.5) | 32.3 (24.6) | 31.0 | 2646 | 7.91 M | +14 % | −22 % |
| Post & Stockton | 33.2 (27.9) | 2581 / 10.11 M | 58.4 (38.9) | 22.2 (15.1) | 45.0 | 2390 | 7.72 M | −7 % | −24 % |
| Powell north | 32.9 (25.6) | 2610 / 10.13 M | 58.1 (41.8) | 22.3 (16.0) | 44.8 | 2552 | 7.96 M | −2 % | −21 % |
| Geary east | 41.5 (28.8) | 1778 / 9.51 M | 78.8 (51.5) | 28.7 (16.3) | 34.8 | 1822 | 6.14 M | +2 % | −35 % |
| inside Nintendo | 41.0 (32.5) | 2044 / 9.68 M | 84.4 (66.2) | 34.2 (21.6) | 29.2 | 1932 | 6.92 M | −5 % | −29 % |
| inside Apple | 41.2 (35.2) | 1878 / 9.71 M | 89.1 (67.6) | 44.2 (38.2) | 22.6 | 1764 | 6.31 M | −6 % | −35 % |
| aerial | 26.9 (20.5) | 2762 / 10.16 M | 42.0 (35.3) | 21.2 (17.2) | 47.1 | 3485 | 8.51 M | +26 % | −16 % |

GPU textures 168–199, geometries 1.46–1.65 k, programs 81–82, heap 215 MB (v1 242 MB; 23:12 run 290 MB).

### Night — `qa/perf/night.json`

| Location | v1 fps (p95) | v1 calls / tris | **v2 fps (p95)** | **v2 ms** | **v2 calls** | **v2 tris** | Δ calls | Δ tris |
|---|---|---|---|---|---|---|---|---|
| plaza centre | 55.6 (32.7) | 810 / 5.16 M | 64.3 (35.7) | 15.6 | 965 | 4.18 M | +19 % | −19 % |
| Powell & Geary | 46.6 (28.7) | 1054 / 5.21 M | 48.5 (26.7) | 20.6 | 1377 | 4.83 M | +31 % | −7 % |
| Post & Stockton | 41.8 (29.9) | 1300 / 5.17 M | 50.7 (28.4) | 19.7 | 1222 | 4.70 M | −6 % | −9 % |
| Powell north | 42.4 (30.4) | 1379 / 5.18 M | 54.5 (36.6) | 18.3 | 1364 | 4.89 M | −1 % | −6 % |
| Geary east | 72.5 (36.6) | 548 / 4.56 M | 68.9 (35.8) | 14.5 | 659 | 3.07 M | +20 % | −33 % |
| inside Nintendo | 74.5 (64.1) | 738 / 4.74 M | 91.0 (48.1) | 11.0 | 652 | 3.85 M | −12 % | −19 % |
| inside Apple | 68.5 (54.6) | 603 / 4.75 M | 88.9 (50.0) | 11.3 | 646 | 3.27 M | +7 % | −31 % |
| aerial | 37.6 (28.3) | 1803 / 5.30 M | 35.5 (20.9) | 28.2 | 1948 | 5.37 M | +8 % | +1 % |

Night heap 228 MB, programs 51→? (not re-read), textures 133–198.

Reading: the caster diet and per-cell culling removed 2–3.6 M triangles per frame by day (the v1 "10 M regardless of camera" is gone; triangles now vary 6.1–8.5 M with the view) and, on a quiet machine, lifted street-level day fps from ~35–45 to ~57–89. Draw calls did not fall: the per-cell pools trade a few city-wide InstancedMeshes for many cell-local ones, so the aerial (+26 %) and night street cams (+19–31 %, also from `shop_lit` panels and uplights) issue more calls. Remaining budget hogs (v1 attribution still applies): shadow pass, hero interiors (~500 calls), massing buckets, and now the 8192² markings texture.

Performance score 6/10 (v1 5): triangles fixed, calls not; day fps on a quiet machine is now acceptable at street level, aerial still ~40 fps.

## 3. Scorecards

### 9-cell density scorecard (same cells/cameras as v1; 1–10)

| cell | v1 avg | terrain | building | façade | storefront | signage | road | sidewalk | furniture | vegetation | lighting | affordance | **v2 avg** | obviously unfinished? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NW | 5.1 | 7 | 6 | 5 | 4 | 6 | 8 | 5 | 5 | 6 | 6 | 5 | **5.7** | partly — Saks ground level still a blank white wall (`P1`, `NW2`, `vp28`); flat roofs (`NWa`) |
| N | 5.9 | 7 | 6 | 6 | 6 | 7 | 8 | 5 | 5 | 6 | 5 | 6 | **6.1** | no — but the row is dark at night (`night N2`) and the Post sidewalk holds 0–2 peds per 40 m |
| NE | 5.1 | 7 | 5 | 5 | 5 | 6 | 8 | 5 | 5 | 5 | 6 | 5 | **5.6** | partly — Hyatt Stockton frontage still a dark glass grid (`NE2`); Apple wall fixed (`NE1`) |
| W | 5.1 | 7 | 6 | 7 | 7 | 7 | 8 | 5 | 5 | 5 | 8 | 6 | **6.5** | no — Westin base now reads (`W1`, `PW2`); sidewalk still a 10 m empty plane (`W2`) |
| C | 7.1 | 8 | 7 | 7 | 6 | 7 | 8 | 8 | 8 | 7 | 7 | 7 | **7.3** | corners only — stair wedges (`Ca`, `Ea`), untextured pedestal (`vp34`) |
| E | 4.5 | 7 | 5 | 5 | 4 | 5 | 6 | 4 | 6 | 5 | 4 | 5 | **5.1** | partly — tables/planters arrived (`E1`, `vp25`); asphalt lane, no gates/lights, dark at night |
| SW | 5.5 | 7 | 6 | 6 | 4 | 6 | 8 | 5 | 5 | 6 | 6 | 5 | **5.8** | partly — vitrines still glass over grey (`SW1`); promenade plain concrete |
| S | 4.9 | 7 | 5 | 5 | 4 | 5 | 8 | 5 | 5 | 6 | 5 | 5 | **5.5** | partly — Macy's authored but reads as an office block with a texture leak behind the glass (`S1`, `limestone_macy`), roof slab (`Sa`, `roof_close`), dark at night |
| SE | 4.6 | 7 | 5 | 5 | 4 | 6 | 8 | 3 | 5 | 5 | 6 | 5 | **5.4** | partly — no rotunda (`SE1`), face still in the sidewalk (`SE2`), roof slab (`SEa`) |

Column means: W 6.0 · C 6.3 · E 5.4 (v1 5.2 / 5.8 / 4.7). Row means: N 5.8 · M 6.3 · S 5.6. Overall 5.9 (v1 5.3). Street-level density **6/10**.

### Materials scorecard (1–10)

| Family | v1 | v2 | Notes |
|---|---|---|---|
| Asphalt + markings | 7 | 8 | overlay markings crisp, no z-fight; red lane still pink-saturated |
| Sidewalk concrete | 6 | 6 | stains unchanged; also on plaza central deck and terrain |
| Plaza central-deck bands | 6 | 6 | unchanged |
| Plaza terrace pavers | 4 | 5 | bevels gone; still 0.6 m squares |
| Granite walls/stairs | 4 | 4 | unchanged glossy blue tiles |
| Limestone / sandstone ashlar (engine) | 7 | 7 | Westin sandstone + reveals good (`W1`); Zara/Post beige stone good |
| Terracotta / plaster / brick | 6 | 6 | brick building on Maiden Lane / Stockton reads well at 5 m+ |
| Massing façade tiles | 5 | 5 | now leaks behind storefront glass (new high) |
| Glass | 7 | 7 | Neiman/Apple/Nintendo glass good; `glass_tint` canopy still opaque |
| Metals | 6 | 6 | — |
| Roofs | 2 | 3 | parapet lips on engine roofs; still untextured slabs |
| Monument / hero stone | 3 | 3 | unchanged |
| Terrazzo (Apple) | 4 | 4 | unchanged |
| Wood | 5 | 5 | floor moiré unchanged |
| Vegetation | 6 | 6 | leaf cards unchanged; hedges slightly better |
| Fabric | 6 | 7 | awnings/marquee/flags on the Westin read well |
| Vehicles | 5 | 5 | still no headlights |
| Pedestrians | 6 | 6 | — |
| Signage / logos | 7 | 8 | Saks/Tiffany parapet letters, rooftop macy's, Neiman script, tenant plates |

Materials **6/10** (v1 5).

### Lighting scorecard

| Preset | v1 | v2 | Notes |
|---|---|---|---|
| Day | 5 | 6 | bluer sky, exposure 0.6, shadows follow the view; white horizon band, soft aerial shadows, granite still pale blue |
| Sunset | 8 | 8 | `tev2_sunset/Ca.png` — warm long shadows across the bands; unchanged and still the best state |
| Night | 6 | 7 | consistent windows, lamp pools, lit hero shopfronts, uplit monument; Macy's/luxury row/Maiden Lane dark, uplight blown, no halos, black zenith |

Lighting **7/10** (v1 6).

### Geometry integrity **6/10** (v1 4)

Fixed: duplicate crossings, marking notches, roadway slabs, shadow box, Powell prop seating still correct (`powell_slope_props.png`). Open: rooftop boxes over multi-part buildings (vp06/vp10/vp32/vp14), Macy's doubled grid (vp24), massing wall behind storefront glass (new), Neiman face in the sidewalk (SE2), corner stair wedges, opaque canopy, vp29/vp31 camera placement, tree pool overflow.

## 4. Top 10 remaining fixes (priority order)

1. **Hide the massing wall behind authored storefront bays** — `limestone_macy` (`-20,-1.9,58,171,10,60`), `sandstone_westin` (`-81.5,2.2,-10,261,10,60`), day and night. Opaque `shop_lit` backing 0.4 m behind the glass and cull the outline wall segment behind each storefront; add a `finalize()` assertion. Highest visual payoff per hour: it turns Macy's and the Westin from "office grid inside a shop" into shops.
2. **Rooftop boxes over multi-part buildings** — vp06 (`tev2_day/vp06.png` top-centre), vp10, vp32, vp14. Place at the rendered roof height at (x,z) (raycast or per-part height) on a 2 m-inset footprint; also inset the engine's rooftop kit so units are not on the parapet edge.
3. **Roof material + clutter** — `roof_close` (`-10,32,75,171,-40,60`), `aerial_mid` (`0,120,180,351,-35`), `Sa`, `SEa`, `NWa`. 2 m membrane/gravel tile + normal, 0.6 m parapet on massing roofs, hatch/penthouse/chillers per class, Macy's terrace (umbrellas, glass rail, mechanical cluster), 6 water tanks and 2 billboards inside the core.
4. **Macy's Geary front finish** — `S1` (`-25,1.7,44,150,5`), `vp23`, `vp24`: 2.5 m red "macy's" letters + star on the glass, lighter green-grey glass tint with beige piers, flood at night, fix the doubled grid at the Stockton edge.
5. **Night pass II** — `tev2_night/vp04.png`, `tev2_night_cells/N2.png`, `E1.png`, `vp21.png`: `shop_lit` on every `open` Post/Geary bay, floods on Macy's/Neiman/Saks, Maiden Lane string lights + lit boutiques, monument uplight 900→250 (warm) with pedestal floods, instanced additive halo sprite (~0.6 m) per lamp head, headlights on vehicles, faint warm zenith on the night dome.
6. **Granite + monument + corner stairs** — `plaza_skirt_east` (`64,0.3,20,261,0,60`), `vp34`, `Ca` (`42,60,42,306,-45`): roughness 0.8, normal 0.6, 1.2×0.6 m honed slabs, `envMapIntensity` 0.25; granite map + normal on the pedestal, real capital/statue; modelled step runs with risers/handrails/cheek walls on all four corners.
7. **Ground repetition** — `sidewalk_post` (`-30,2.86,-43.3,81,-30,60`), `plaza_bands`, `plaza_pavers`: stains on a 12 m hashed layer (fewer, fainter), plain concrete/dirt for the terrain mesh, one seeded 0.6×0.9 running-bond painter for both plaza materials, red lane 0x7a2f28 + asphalt speckle.
8. **Day grade residuals + shadow quality** — all day vps: turbidity 2.6 / fog 0xa9bfd8 to kill the white horizon band; `PCFShadowMap` explicit in `App.ts:28`; 4096 map for `q=high` or 3-cascade CSM so the 320 m aerial box is not a 31 cm texel; keep sunset as the contrast reference.
9. **Draw-call pass** — `aerial` 3485 calls, night street cams +20–30 %: merge far cells into one LOD pool per module (or hide trims beyond 150 m), skip module shadow casters beyond 120 m, merge Apple/Nintendo fixtures by material (~−400 calls), bake massing tiles into one atlas (~70 buckets → ≤4 draws); shrink the markings overlay to 4096² or a single-channel mask (−190 MB VRAM).
10. **Hero interiors and remaining façades** — `apple_interior` (`44,0.3,-66,81,0,65`): real screen content, wall material, terrazzo amp/slab grid; `nintendo_interior`: plank-offset wood; `glass_tint` canopy opacity 0.45 double-sided (vp09); Saks ground floor with papered vitrines + curved corner (`P1`, `NW2`); Hyatt Stockton beige precast + porte-cochère (`NE2`); Neiman footprint vs sidewalk (`SE2`); Maiden Lane gates/setts/arch (`E1`).

## 5. What is right (keep)

- Street engineering is now artifact-free: one clean intersection surface at Powell & Geary / Post, crisp overlay markings and stop bars at every crossing (`crosswalk_stockton`, `pg`-area vps, `G1`, `Ea`), straight red-lane edges, rails clean at grazing angles (`powell_graze`), trolley wires overhead.
- Westin Powell base (`W1`, `PW2`, `vp14`, night `W1`): marquee, flags, awnings, lit vitrines, taxi rank — the reference for how the other three hero façades should land.
- Night (`vp26`, `Ca` night, `vp16`, `vp13`): uniform warm window emissives across engine and massing buildings, lamp pools on every sidewalk, lit Nintendo/Apple/Neiman glass, cable car and signal lamps, rooftop "macy's" readable from the plaza (`C2`).
- Day grade (`vp03`, `C1`): blue zenith, readable shadows that now follow elevated cameras (`vp27`, `vp01`).
- Rooftop parapets and rooftop kits on engine buildings; census tenant plates on generic bays; Zara "opening 2026" hoarding; Neiman/Saks/Tiffany signage; Maiden Lane tables and planters (`vp25`).
- Instancing/culling discipline: triangles now scale with the view (6.1–8.5 M by day vs a flat 10 M), heap down to 215–228 MB.
- Sunset (`tev2_sunset/Ca.png`) unchanged and still the most photogenic state.

## Method

`node tools/qa/capture.mjs --out=qa/shots/tev2_day "--extra=&ui=0"` (34 vps), same for `--time=night`; 28 `--cam=` diagnostic captures by day (the 25 v1 cams reconstructed from the v1 report coordinates plus `plaza_wall_south`, `roof_close`, `saks_close`; `pg_intersection` landed inside a building and was discarded) and 11 at night; the 39 QA-D grid/walk-by cams by day and 16 at night; sunset `Ca`. 30 labelled 2×2 contact sheets reviewed (`qa/shots/tev2_sheets/`), plus full-res crops of vp06/vp10/aerial_mid/vp27 (`crops.png`). `node tools/qa/perf.mjs --headed=0 --seconds=3` day and night (v1 JSON snapshotted before overwrite; note the GPU-contention caveat). Implementation claims verified in `src/systems/TimeOfDay.ts` (shadow follow/extent, night dome), `src/world/facade/FacadeBuilder.ts` (`noShadow`, `cellKey`, `shop_lit`), `src/assets/Assets.ts` (`frustumCulled`, bounding spheres), `src/world/Props.ts` (`pointInPolygon` rooftop test), `src/world/RoadMarkings.ts` (8192² overlay), `src/world/Plaza.ts` (uplights), `src/app/App.ts` (shadow type). Nothing fixed by the reviewer.
