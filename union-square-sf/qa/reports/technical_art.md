# QA-C Technical Art report — 2026-09-01

Reviewer: QA-C (technical artist, independent). Scope: materials, lighting, texture repetition, LOD/streaming, geometry artifacts, performance.
Evidence: `qa/shots/qac_day/` (34 vps), `qa/shots/qac_night/` (34), `qa/shots/qac_sunset/` (vp01/05/31), `qa/shots/qac_close/` (25 diagnostic cams, day), `qa/shots/qac_close_night/` (4), contact sheets in `qa/shots/qac_sheets/`, perf JSON in `qa/perf/day.json` + `qa/perf/night.json`. All captures 1920×1080, DPR 1, `?qa=1&freeze=1&life=1`, taken 22:40–23:10; several scene files (Streets/StreetGrid/World/Plaza/FacadeBuilder/Library/Config) changed on disk after capture, so re-verify the street findings against the new code.
Camera notation: `x,y(eye),z,heading,pitch,fov` for `--cam=`.

## Score: 5/10 (category: technical art — materials 5, lighting 6, geometry integrity 4, performance 5)

The scene reads as a coherent stylised twin at street level in sunset and night, and the façade engine's ashlar/reveal/module system is genuinely good. It is pulled down by a handful of systemic artifacts (duplicate intersection boxes, markings sinking into roads, floating rooftop boxes, coplanar duplicate walls), a washed-out day grade, blockout-quality roofs/monument, and a shadow pass that costs half the frame.

## Blocking issues (must fix)

1. [severity: high] vp13 (Powell & Geary, `-68.7,-0.5,37.7,245`), vp20, day and night — jagged, triangulated red/asphalt patches across the west half of the Powell & Geary roadway. Root cause (code): Powell is specified as three collinear `StreetSpec`s (`World.makeStreetSpecs`: widths 8.2 / 12.9 / 13.0 at the same `c`), so `StreetGrid.intersections()` returns TWO crossings at Powell & Geary (half-widths 4.1 and 6.45) and two at Powell & Post (6.45 / 6.5). `Streets.buildStreet` sorts crossings by `t` and advances `cur` past the first one, so Geary's/Post's road strip, red `transit_red` lane and lane dashes overrun ~2.35 m into the wider Powell box; two coplanar asphalt surfaces with different triangulations plus a 4 mm red lane z-fight. Secondary effects: the narrower box's corner-sidewalk squares (`a.sidewalk = 6.4`) intrude 2.35 m into the 12.9 m Powell roadway north of Geary as raised 15 cm slabs with curb faces (check `-77,-1.4,43,351,-20` and `-69,-1.4,43,351,-20`), and crosswalk bars/stop bars are generated twice at different x phases. Fix: dedupe crossings per (x,z) keeping the max width per axis in `intersections()`, and in `buildStreet` use the max `other.width` among crossings at the same `t`; or make Powell one spec with per-segment width overrides.

2. [severity: high] `crosswalk_stockton` (`66,0.3,-45,351,-25,60`), also visible on vp12's crosswalk edge and vp17 — continental crosswalk bars and stop bars have triangular notches bitten out of them. Cause: markings are draped on the bilinear terrain with their own 3 m vertex grid while the road/intersection strips are planar per triangle across the full 13 m width (`strip()` has 2 vertices across), so on sloped/curved terrain the 6 mm offset + `polygonOffset -2` is not enough and the marking dips under the road along the road triangles' diagonals. Fix (preferred): bake markings into the asphalt as a decal layer (second UV set + marking atlas in the road material) — zero z-fighting and −2 draw calls; or subdivide road strips across their width every 3 m so both surfaces sample the same bilinear terrain, and sample marking heights from the road mesh rather than `terrain.heightAt`.

3. [severity: high] vp06 (top centre), vp07 (above the red tower), vp08, vp10, vp28 (top-left/right), `monument_close` (`-6,1.6,8,30,15,55`, top-left) — dark boxes hover in mid-air above buildings. Cause: `Props.build` "rooftop mechanical boxes" places `utility_box` instances for every building ≥400 m² / ≥12 m at `info.topY` in a disc of radius √area·0.25 around the OSM centroid. For E/L/U-plan footprints (Westin, Macy's) the disc falls outside the actual roof, and for façade-detailed buildings `spec.heightM`/masses differ from `info.topY`. Fix: `pointInPolygon(footprint)` test per box, place at the façade spec's roof height (or raycast down onto the roof mesh), skip buildings with `rooftop` props from the façade engine, and cap to buildings inside the detail radius.

4. [severity: high] vp24 full-res (`14.7,-2.8,73.8,128,10`) and, from outside, the upper floors of Macy's in vp01/vp26 — two window layouts on one wall plane: painted massing windows plus offset 3D openings on one face, overlapping 3D windows with modules protruding through the neighbouring plane on another. Cause: Macy's authored spec (`public/data/facades/south_geary.json`) has 7 `masses` at `baseY 10.9` whose polygon edges are collinear with the outline's edges; `FacadeBuilder.mass()` details every face of an elevated mass, so the outline wall and the mass wall are coplanar with different bay rhythms. Fix: in `mass()` detect mass edges within 0.2 m of and parallel to an outline edge and either mark the outline edge `detail:false` above `mass.baseY` or inset the mass by 0.3 m; assert no coplanar panel pairs in `finalize()` (cheap plane-hash check).

5. [severity: high] Shadow coverage — every elevated view (vp01, vp26, vp27, vp29, vp31, `aerial_mid` `0,120,180,351,-35`, tour stops 1 and 8) has no shadows on the plaza or most of the visible city. Cause: `TimeOfDay.update` centres a fixed ±110 m ortho shadow box on the camera position, not on what it looks at, so from Macy's roof or the Grand Hyatt the plaza is outside the box; at 2048² over 220 m the texel is 10.7 cm and, with `radius 1.5`, contact shadows are blurry blobs (vp31 sunset roof). Fix: centre the box on the ray/terrain hit of the view centre and scale the extent with camera height, or use three's CSM (3 cascades ≈ 40 / 120 / 400 m); use 4096 for `q=high` (currently only `ultra`). Also `PCFSoftShadowMap` is deprecated in r185 and silently falls back to PCF — set `PCFShadowMap` (or VSM) explicitly.

## Major

6. [severity: major] Day grade — all 34 day frames: the horizon is white/light grey (Sky turbidity 2.2 + fog 0xc4d3e3 + ACES at exposure 0.66 clips the horizon band), pavements read near-white (plaza pavers, sidewalks, Saks, Apple plaza in vp12/vp24), sky zenith is pale, shadows are weak (sun 1.7 vs hemi 0.38 + env 0.4). Reference photos show a saturated blue sky to the horizon and mid-grey granite. Fix: rayleigh 1.2–1.5, turbidity 3, mie 0.006, sun 2.3 with exposure 0.5, hemi 0.28, `environmentIntensity` 0.25; consider `AgXToneMapping` (keeps highlight hue). Sunset is already good (vp01/vp05 sunset) — use it as the reference for contrast.

7. [severity: major] Night — two lit-window systems that do not match: massing `facadeMaterial` emissive maps render as pure-white rectangles (vp03, vp05, vp09, vp24 night) while façade-engine `window_lit` bays are dim amber (0xffd9a0 × 1.4, ~35 % of bays), so towers with the engine look dead next to blown-out massing. Hero elements are unlit: Macy's Geary front is black (vp04/vp23 night), the Dewey Monument has no floodlight (vp21 night), the Westin base band is dark; street lamps are unbloomed white dots. Fix: tint massing emissive to 0xffd9a0 and clamp intensity to 1.2–1.6; add `shop_lit` backing/emissive to Macy's and Westin storefront bays; a SpotLight (or emissive up-light decal) on the monument; an instanced additive halo sprite (~0.6 m) per lamp head.

8. [severity: major] Roofs — vp26 and `aerial_mid` (Macy's roof ≈ 60 % of frame), vp31 (Westin roof), vp27: flat untextured `roof` (0x5c5a58) planes with no parapet lip, membrane or gravel; reads as blockout in exactly the views the brief calls "must be visible from above". Fix: 2 m tileable membrane/gravel map + normal, 0.6 m parapet extrude on massing roofs (façade buildings already get `parapet_1m`), keep rooftop props only where valid (see 3).

9. [severity: major] `granite_grey` reads as glossy blue glazed tiles — `plaza_skirt_east` (`64,0.3,20,261,0,60`), vp32, vp34, all plaza retaining walls, skirts, stairs and the Apple plaza planters. Cause: roughness 0.55 + env reflection of a blue sky, `ashlarN6` normal strength 2.0 giving pillowed 1 × 0.5 m blocks. Real Union Square walls are honed grey granite in large slabs. Fix: roughness 0.8, normal strength 0.6, 1.2 × 0.6 m slab pattern with faint speckle, `envMapIntensity` 0.25.

10. [severity: major] Plaza terrace pavers (`pavers`) — vp06, vp08, `plaza_pavers` (`-20,2.5,-25,351,-35,60`): 0.6 m squares with bathroom-tile bevels (`paversN` strength 3) and a 2.4 m-period random dark-tile pattern that repeats diagonally across the terrace. The brief's 0.6 × 0.9 running bond only exists on the central deck (`bandedPaving`), which in turn uses `Math.random()` (non-deterministic texture between runs) and has no normal map. Fix: one 0.6 × 0.9 running-bond paver painter on a 4.8 m tile with hashed (seeded) tone variation, normal strength 0.8, shared by both materials.

11. [severity: major] Sidewalk concrete — `sidewalk_post` (`-30,2.86,-43.3,81,-30,60`), vp15, vp33: the 14 elliptical stains per 3 m tile repeat as an obvious pattern of oil-spot blobs; score lines at 1.5 m are correct. The terrain mesh also uses this material, so 1.5 m score lines cover every lightwell, lot interior and aerial ground (graph-paper look in `aerial_far` and vp24). Fix: stains on a second, 12 m-period layer (or a hashed detail map), fewer and fainter; give the terrain a plain concrete/dirt material.

12. [severity: major] Hero primitives untextured — vp34, `monument_close`: Dewey Monument pedestal/plinth is flat 0x9a9691 with a brown plaque quad; vp21: Victory is a capsule + box; Apple interior back wall is flat 0x74777a and the wall screen is a blurry rainbow gradient (`apple_interior` `44,0.3,-66,81,0,65`). Fix: granite map + normal on the monument material, real capital/statue mesh (QA-B), proper wall material and real screen content.

13. [severity: major] Interiors over-exposed — `apple_terrazzo` (`44,0.3,-66,351,-30,60`): the terrazzo floor washes out to flat white (painter amp 4 + speckle 0.03 vanishes under the 0.7 emissive ceiling); Nintendo ceiling and back wall clip to white near `emissive_white` panels; Nintendo `wood_light` floor's sine-grain reads as wavy moiré (`nintendo_interior` `-86,-1,36,275,0,65`). Fix: terrazzo amp 10 with 30 mm chips and a 1.2 m slab grid, roughness 0.35; ceiling emissive 0.5 by day; plank offsets in the wood painter.

14. [severity: major] Performance: the sun shadow pass is ~65 % of draw calls and ~48 % of triangles (plaza centre: 1685 → 594 calls, 8.30 M → 4.26 M tris with `shadowMap.enabled=false`); night runs 1.5–1.8× faster purely because the sun is off. Details and fixes in the performance section.

## Minor / polish

15. Saks (Powell & Post, vp14 right edge, vp28) is a blank white slab with outlined storefront panes; at night it stays a bright grey box (hemi 0.7 on a white albedo). Needs a window layout and a darker night albedo.
16. Leaf cards (`post_tree` `-30,2.89,-55,351,20,60`, vp22, vp23): ellipse-blob leaves with hard alpha are acceptable stylisation; palm fronds are good. The `tree_street_small_bark` pool (cap 300) overflowed (console warning) so some tree grates have no tree — raise the cap or reduce spacing.
17. Vehicles: boxy with flat single-colour glass; no headlights at night (tail lights work, vp15 night). `lifeStats().vehicles` reports 0 while vehicles render — stats bug.
18. Pedestrians: mannequin rigs are clean and consistent; bald smooth heads read fine at 3 m+. 220 peds cost ~30 draws per pass; OK.
19. Plaza z=15 retaining wall (`Plaza.ts:38`) is a single-sided `wallQuad` whose normal points north (into the deck); the south face is only covered by the slab side + skirt. `skirt()` quads are exactly coplanar with the `ExtrudeGeometry` slab sides on every terrace edge (same material, no flicker seen in `plaza_wall_south`/`plaza_skirt_east`, but a latent z-fight) — offset the skirt 2 cm outward or omit skirt segments where a slab side exists.
20. Red `transit_red` (0x8a2a24) renders pink-red by day (vp12, vp13, vp27) — too saturated for SF's faded terracotta red; try 0x7a2f28 with roughness 0.95 and a faint asphalt speckle overlay.
21. Massing façade tiles at close range (vp13 left, `limestone_macy`): painted windows are small (winW 0.42 of a 4 m bay) and sill highlights are white; fine beyond 60 m. Non-street edges of detailed buildings still show the massing tile in lightwells (vp24).
22. Viewpoints vp02, vp18, vp19, vp29, vp30, vp33 place the camera inside geometry (grey/black frames). This is placement, not missing back-faces — the inward-facing reveal/backing quads are what renders. Flagged for QA-A/B.
23. `glass_tint` stage canopy (vp06/vp09) reads as an opaque dark slab from below (opacity 0.72, depthWrite off); lower opacity to 0.45 and add `side: DoubleSide` so the roof is visible through it.
24. Signage: fascia signs sit 6 cm proud of the wall with an edge material — no z-fighting seen (vp13, vp20, vp25). Good.

## What is right (keep)

- Façade engine: ashlar limestone/sandstone at ~0.5 m courses, 0.3 m reveals, instanced window/cornice/stringcourse modules, stepped storefront bases on slopes (`powell_slope_props` `-80,7.62,-120,171,-8,60` shows lamps, meters, awnings and bases all seated correctly on the Powell grade — no floating/sunken props found on Powell, Post or Geary).
- Asphalt (speckle + crack lines, 6 m tile) and crisp lane dashes; cable-car rails and slots render cleanly at grazing angles (`powell_graze` `-70,-2.77,75,351,-3,40`, day and night).
- Sunset preset (vp01/vp05/vp31 sunset): warm key, long shadows, blue-to-amber sky — the best-looking state of the scene.
- Night street lighting: additive lamp pools + 8 nearest point lights give readable sidewalks (vp11, vp12, vp15, vp16); Apple and Nintendo glass boxes glow correctly; cable car and signal lamps are lit.
- Nintendo storefront (glass_nintendo `-80.5,-0.34,36,261,5,55`): vinyl graphics, brass frames and interior visibility through `glass_clear` sort correctly; no transparency ordering issues found on Apple either.
- Instancing discipline: 209 InstancedMeshes, 7 draws for all streets, 1 for terrain, plaza furniture/hedges/flowers instanced; procedural textures keep the build asset-free.

## Materials scorecard (1–10)

| Family | Score | Notes |
|---|---|---|
| Asphalt + markings | 7 | good surface; markings notch on slopes (2), red lane too saturated (20) |
| Sidewalk concrete | 6 | correct 1.5 m scoring; stain repetition (11); also used as terrain |
| Plaza central-deck bands | 6 | 0.6 × 0.9 correct, no normal map, non-deterministic random |
| Plaza terrace pavers | 4 | 0.6 m squares, tile bevels, 2.4 m repeat (10) |
| Granite walls/stairs (`granite_grey`/`_dark`) | 4 | glossy blue tiles (9); dark base bands read flat mid-grey |
| Limestone / sandstone ashlar (façade engine) | 7 | plausible scale and reveals; joints slightly wide |
| Terracotta / plaster / brick walls | 6 | fine at 5 m+, not stress-tested closer |
| Massing façade tiles (mid/far LOD) | 5 | ok beyond 60 m; blown white at night (7) |
| Glass (clear / tint / dark) | 7 | clear excellent; tint canopy opaque (23); dark curtain flat navy |
| Metals (chrome, brass, alu, steel) | 6 | brushed maps fine; chrome pylon tops read well |
| Roofs | 2 | flat untextured planes (8) |
| Monument / hero stone | 3 | untextured primitives (12) |
| Terrazzo (Apple) | 4 | washes to white (13) |
| Wood (Nintendo floor, Apple tables) | 5 | table grain good; floor moiré |
| Vegetation (leaf cards, fronds, hedges, grass) | 6 | consistent stylisation; grass flat |
| Fabric (umbrellas, awnings) | 6 | reads correctly, no intersections with furniture |
| Vehicles | 5 | boxy, no night lights |
| Pedestrians | 6 | clean rigs, no material issues |
| Signage / logos | 7 | sharp, correctly offset, illuminated at night |

## Lighting scorecard

| Preset | Score | Notes |
|---|---|---|
| Day | 5 | white horizon, washed pavements, weak shadows, shadow box misses aerials (5, 6) |
| Sunset | 8 | warm, contrasty, believable; only the shadow softness and roof blobs detract |
| Night | 6 | good pools/interiors; inconsistent lit windows, dark hero storefronts, unlit monument, no lamp halos (7) |

## Performance

Environment: headless Chromium (ANGLE/Metal), 1920×1080, DPR 1, `q=high`, 220 pedestrians, `--seconds=3`. Numbers from `qa/perf/day.json` / `night.json` (fps avg / p95, frame ms, draw calls, triangles).

| Location | Day fps (p95) | ms | calls | tris | Night fps (p95) | ms | calls | tris |
|---|---|---|---|---|---|---|---|---|
| plaza centre | 44.8 (37.7) | 22.3 | 2158 | 10.10 M | 55.6 (32.7) | 18.0 | 810 | 5.16 M |
| Powell & Geary | 38.5 (31.9) | 26.0 | 2321 | 10.16 M | 46.6 (28.7) | 21.5 | 1054 | 5.21 M |
| Post & Stockton | 33.2 (27.9) | 30.1 | 2581 | 10.11 M | 41.8 (29.9) | 23.9 | 1300 | 5.17 M |
| Powell north | 32.9 (25.6) | 30.4 | 2610 | 10.13 M | 42.4 (30.4) | 23.6 | 1379 | 5.18 M |
| Geary east | 41.5 (28.8) | 24.1 | 1778 | 9.51 M | 72.5 (36.6) | 13.8 | 548 | 4.56 M |
| inside Nintendo | 41.0 (32.5) | 24.4 | 2044 | 9.68 M | 74.5 (64.1) | 13.4 | 738 | 4.74 M |
| inside Apple | 41.2 (35.2) | 24.3 | 1878 | 9.71 M | 68.5 (54.6) | 14.6 | 603 | 4.75 M |
| aerial | 26.9 (20.5) | 37.1 | 2762 | 10.16 M | 37.6 (28.3) | 26.6 | 1803 | 5.30 M |

GPU textures 149–192, geometries ~1.5–1.8 k, 78 programs (162 compiled during the eval sweep), JS heap 242 MB, pedestrian update 1.0–1.7 ms.
Triangle count is ~10 M regardless of camera because instanced pools are never frustum-culled (see below); the 10 M includes the shadow pass, so the "real" scene is ~4.3 M + ~1.8 M for life.

Draw-call attribution (eval, day, `life=0`, hide-group deltas; calls include the shadow pass):

| Group | plaza centre | Powell & Geary | aerial | tris (plaza) |
|---|---|---|---|---|
| base frame | 1685 | 1822 | 2292 | 8.30 M |
| shadows off | 594 | 798 | 1524 | 4.26 M |
| world/facades (merged walls + pools) | 719 | 759 | 918 | 4.66 M |
| ├ facade `pool|*` instanced modules | 144 | 142 | 148 | 4.33 M |
| hero (Apple + Nintendo) | 502 | 502 | 787 | 0.16 M |
| props | 143 | 144 | 137 | 2.13 M |
| world/buildings (massing) | 142 | 140 | 179 | 0.01 M |
| world/plaza | 123 | 221 | 215 | 0.05 M |
| vegetation | 47 | 47 | 47 | 1.20 M |
| world/streets / terrain | 7 / 1 | 7 / 1 | 7 / 1 | 0.06 M / 0.02 M |
| life (peds + traffic, `life=1` delta) | ~470 | — | — | ~1.8 M |

Largest instanced pools (count × tris): `stringcourse_1m` 7461 × 24, `win_punched_modern` 3464 × 56, `win_dh_stone_1.5` 3327 × (68+60), `win_dh_stone_1.2` 2957 × (56+60), `parapet_1m` 2248 × 28, `cornice_heavy_1m` 2194 × 108, `cornice_medium` 1529 × 80, parking meters 1499 × 112, `frame` (street prop, 768 tris) 565, `tree_street_small` 300 × 596, `tree_plane` 234 × 698. Every InstancedMesh has one city-wide bounding sphere, so `frustumCulled` never rejects anything; `World.stream()` only toggles merged wall meshes, not pools. Transparent materials in scene: `glass_clear` ×21 meshes, `glass_tint` ×12, leaf/frond ×17, vinyl ×5, 42 unnamed transparent MeshStandardMaterials (Apple water, labels). Shipped `*_lod1.glb` (tree_plane, palm_canary, tree_ficus, tree_street_small) are never loaded — there is no LOD code in `src/`.

Top 5 optimisations (no visual loss):

1. Shadow-pass diet (largest win, est. +25–35 % day fps): set `castShadow=false` on per-metre trims (stringcourse/parapet/cornice ≈ 12 k instances), window modules (the reveals already shadow), parking meters, tree grates, hedges/flowers, signage, and pedestrians beyond 40 m; cast only from walls, roofs, trees, lamps and large props. Set `PCFShadowMap` explicitly (the deprecated PCFSoft already falls back).
2. Make instancing cullable: bucket façade module pools and street prop pools per 130 m cell (the `cellKey` already exists) so each InstancedMesh has a local bounding sphere, and let `World.stream()` hide pools by distance; est. −40 % pool calls and roughly half the module triangles per pass at street level.
3. Merge the hero interiors: Apple + Nintendo spend ~500 calls (≈250 per pass) on 160 k tris. Merge static fixtures by material and instance the repeats (iPhones/stands/boxes/shelves/labels); est. −400 calls.
4. Collapse massing and plaza draws: massing is ~70 buckets (`style|bayW|floorH|cell`) × 2 passes for 10 k tris — bake the 10 style tiles into one atlas (or a 2D array texture) with a per-vertex scale attribute → 1–4 draws; the plaza is ~120 tiny meshes (skirt quads, stair blocks, pylon parts, monument tiers) → merge per material → ~10 draws.
5. Per-instance cost and texture budget: `tree_grate`/`streetlight_sf_double` 860 tris, hydrant 604, trashcan 564 — a grate is 12 tris + alpha; load the shipped `_lod1` GLBs via `THREE.LOD` or a distance-swap; drop the 1024² canvas maps (asphalt, sidewalk, pavers, stone: 366 material refs) to 512² and anisotropy 8 → 4 — indistinguishable at 1080p/DPR 1.

Secondary: `preserveDrawingBuffer` is only on in QA mode (fine); the 8 point lights force a lit-shader permutation for all standard materials at night — acceptable. Consider `q=med` default on DPR 2 laptops (min(dpr,1.5) already).

## Method

`node tools/qa/capture.mjs --out=qa/shots/qac_day`, `--time=night --out=qa/shots/qac_night`, `--time=sunset … vp01 vp05 vp31`; 25 diagnostic `--cam=` captures (materials at 1–3 m, Powell/Geary intersection, grazing rail view, slope props, plaza walls/skirts, two aerials) plus 4 at night; all 71 + 29 frames reviewed via 2×2 contact sheets with full-res follow-ups (vp24, aerial_far). `node tools/qa/perf.mjs --headed=0 --seconds=3` (day and night). Draw-call attribution via `tools/qa/eval.mjs` with a hide-group probe (`scratchpad/breakdown.js`), scene inventory (1778 meshes, 1115 shadow casters, 209 InstancedMeshes), plus offline checks of `gis.json` (no >40 m parts near the square; only the hidden station outline nests inside Macy's) and of `StreetGrid.intersections` on the Powell specs. No project files modified other than this report and the `qa/shots/qac_*` captures.
