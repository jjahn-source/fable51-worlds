# FINAL_QA_REPORT — 東山 / Higashiyama

Kyoto's Southern Higashiyama walking route, Gion to Kiyomizu-dera, in pure
Three.js. Every number below is read out of the running world by
`tools/qareport.mjs`, not typed by hand.

---

## 1. What was built

| | |
|---|---|
| districts | **15** |
| buildings | **266** |
| shopfronts | **471** |
| hero landmarks | **19** |
| trees | **1,938** across 11 kinds |
| props | **3,076** across 60 kinds |
| interactions | **142** (78 distinct prompts) |
| colliders | **12,539** |
| dusk light sources | 139 |
| hero camera views | **52** |
| screenshots retained | **194** (52 hero views + per-district iterations) |
| runtime source | 45 files, **34,762 lines** |
| reconnaissance | 4 documents, **8,112 lines** |
| binary assets | **0** |

Districts, in build order: `base` · `shirakawa` · `gion` · `hanamikoji` ·
`yasaka` · `maruyama` · `shimogawara` · `nene` · `pagodadistrict` ·
`ninenzaka` · `sannenzaka` · `kiyomizuzaka` · `kiyomizu` · `higashioji` ·
`hillside`.

Tree kinds placed: cedar 480 · maple 534 · pine 251 · potted 202 · shrub 166 ·
camellia 119 · sakura 78 · bamboo 72 · ginkgo 18 · willow 14 · shidare 4.

---

## 2. Performance

Measured over all 52 hero views at 1920 × 1080, headless ANGLE/Metal.

| | median | worst |
|---|---|---|
| draw calls | **284** | 796 (`shimogawara`) |
| triangles | **6.8 M** | 8.75 M (`sannenzaka-down`) |
| render time | **1.2 ms** | **2.8 ms** |

41 shader programs · 118 textures · 391 geometries. Production build
**1.31 MB / 397 kB gzipped**, builds in 1.3 s. World build takes ~13 s behind
the opening plate.

2.8 ms worst case is roughly 350 fps of render budget — comfortably inside the
brief's 60 fps target with the whole frame budget to spare. **The binding
constraint is draw calls, not milliseconds**, and the remaining 796 is a known,
diagnosed problem — see §5.

Two optimisations carry the world:

- **The baker** (`src/core/util.js`): colour goes into a vertex attribute and
  everything sharing a shading signature merges into one mesh. Without it a
  street of 60 machiya would be ~15,000 draw calls.
- **Merge-by-material** for the textured meshes the baker cannot take:
  **1,049 draw calls saved** across 67 merged meshes.

---

## 3. Walkability

`tools/walkthrough.mjs` drives the **player** — real movement code, real
collision — along a 136-waypoint route derived from the street centrelines.

- **The route is continuous.** The walker starts on Hanamikoji at 39.0 m and
  reaches the Kiyomizu-dera stage terrace at 115.5 m. No loading screen, no
  locked door, no gap.
- 11 waypoints of 136 report "blocked". **All eleven are the naive steering
  walking into a building it should go around** — the Maiden, the Honden, the
  three-storey pagoda, the Hondo. The walkthrough steers straight at the next
  waypoint; it does not path-find.
- 13 height discontinuities over 0.9 m. Twelve are single plinth steps of
  0.9–1.3 m. One is real — see §5.

`tools/passability.mjs` independently sweeps the full paved width of every
corridor, every 1.5 m, asking whether a 0.34 m disc can pass:

| corridor | blocked | verdict |
|---|---|---|
| `yasakaAxis` | 24 m | **correct** — the Maiden and Honden stand on the axis |
| `kiyomizuPrecinct` | 14 m | **correct** — the pagoda and Hondo stand on it |
| `shirakawaMinami` | 5 m | residual, at the wedge tip |
| `shinbashi` | 3 m | residual, at the wedge tip |
| `maruyamaLink`, `ishibekoji`, `okunoinPath`, `koyasuPath`, `yasakaWestApproach` | 2–6 m each | single obstructions, all bypassable on the footway |

The Gion wedge was the one real closure found: Shinbashi-dori and the canal
walk converge to a point, and frontage laid to 95 % of both streets met in the
middle and sealed them. Stopping both rows short took 36 m of blockage down to
8 m.

---

## 4. Geographic and architectural fidelity

Positions from OpenStreetMap; **every elevation an independent point query
against the GSI 1 m LiDAR bare-earth DEM**; street widths measured by
perpendicular ray-casting to OSM building polygons every 8 m.

The survey overturned six figures that circulate widely, and the world is built
on the measured ones:

| | commonly stated | built |
|---|---|---|
| Yasaka Pagoda height | 46 m | **38.79 m** (Hamashima 1969, AIJ) |
| pagoda taper | linear | **convex, type C 中腹** — 6.303 / 5.918 / 5.582 / 4.982 / 4.433 m |
| Kiyomizu stage deck | 240–250 m ASL | **115.5 m** |
| stage size | 18 × 10 m | **21.8 × 9.6 m** |
| stage pillars | 139 | **168** total, 78 under the stage |
| pillar diameter | ~2 m | **0.64 m** (the 2 m is 周囲 misread as 直径) |

Verified in the build: the terrain probe returns the surveyed elevation within
**0.14 m at the Hondo and 0 m at the stage**; Niomon and Saimon are 1.3–2.9 m
high, which is the terrain's IDW smoothing across a steep terrace.

Three further corrections were applied mid-build:

- Yasaka's **West Romon is 切妻造 本瓦葺** — gabled and tiled, not hip-and-gable
  — and its lattice is **verdigris green**, not red.
- The West Romon is **off the ceremonial axis**, 92 m west of the Maiden.
- **Bengara** (#8F2D12, the Gion ochaya lacquer) is about **half the chroma of
  shrine vermilion** (#EB6101). The survey flags confusing the two as the
  likeliest colour error in a project like this; they are separate palette
  entries with separate shadow tints.

Kyoto slope-stairs are built at their measured geometry: Sannenzaka **46 steps
over 32 m**, Ninenzaka **17 over 15.9 m** — treads of 0.70 m and 0.94 m against
130–150 mm risers, quantised analytically from arc length so the stone the
player sees and the surface their feet are on are the same function.

---

## 5. Known defects

Listed honestly, worst first.

1. **The Okunoin → Hondo postcard sightline does not exist.** The single most
   photographed view of Kiyomizu-dera — the stage in profile across the head of
   the gorge — cannot be composed in the built precinct. A grid search over the
   whole Okunoin terrace found **no standing point at deck level with an
   unobstructed ray to the Hondo**: the Hondo's east wing is in the way. The
   surveyed positions are right; the *relationship* between them is not. That
   hero slot now shows the Hondo from the precinct approach, and the view is
   labelled for what it is rather than for what it was meant to be.

2. **Canopy blobs are still individually legible at close range.** The rule is
   right in the code — blob radius at most a quarter of the crown's, heavy
   overlap, elongation along the form's axis — and it was applied to blossom,
   shidare and willow. Cedar and pine still read as stacked masses at 10 m,
   though they resolve correctly at the 50–200 m they are actually seen from.

3. **796 draw calls in the worst view, and the cause is signage.** Every shop
   sign is a unique Canvas2D texture, therefore a unique material, therefore
   unmergeable — ~700 meshes. The fix is a **signage texture atlas**, exactly as
   `streetfurniture.js` already does for props (one 2048 × 1280 atlas, 36 cells,
   24 draw calls for 3,076 objects). Not attempted because it is a refactor of a
   kit module and performance is already 20× inside budget.

4. **The Okunoin deck oscillates.** A 3 m step where the deck platform meets the
   ravine; the walker mounts and falls off repeatedly. This is the one real
   height discontinuity of the 13.

5. **Residual 2–6 m obstructions** on five minor corridors (§3). All bypassable;
   none on the main route.

6. **Ishibe-koji's geometry is authored, not surveyed.** OSM maps only a 35 m
   stub of a ~100–150 m L-shaped alley. The two stub ends are surveyed; the
   turns are drawn from photographs, and flagged LOW confidence in `route.js`.

---

## 6. Bugs worth recording

Every one of these threw nothing and logged nothing. All were found by
rendering and looking.

| symptom | cause |
|---|---|
| a black line down both sides of every street, converging on the vanishing point | the height field's corridor/hillside blend had a **kink in its derivative** at weight = 1; a crease is curvature and the ink pass draws curvature |
| the street ran along a **5 m embankment** with a canyon each side | the base hillside was a profile in x with a linear correction in z, which cannot describe a route that climbs *into* a hill diagonally. Now derived from the surveyed streets by inverse-distance weighting |
| every paving stone the same tone; granite read as flat tan | the texture RNG was a hand-rolled LCG whose multiply exceeds 2^53, so `>>> 0` kept only rounding noise |
| the carriageway rendered as untextured ground | the 6 m terrain grid interpolates linearly between samples and **rode above the paving sampled from the same function** |
| an 8 m pole lying across every roof in the world | one rotation too many on the ridge-cap cylinder |
| every building's body over the roadway, camera inside a wall | facade yaw off by π — twice, in two different files |
| **a street you could not walk down at all** | `collideRot` approximated a rotated box by its AABB; a 13.8 × 0.45 m shopfront strip at 8° becomes 2.24 m deep. Now split into segments |
| all wooden signs grained in pure black | `mixHex()` returns a CSS string, so `mixHex(…) \| 0` is `NaN\|0` = 0 |
| draw calls fell and rendered triangles *rose* | merge-by-material was welding the per-district baker output world-wide, destroying frustum culling |
| QA frames of a half-built world, camera back at spawn | writing screenshots into `qa/` tripped Vite's watcher and **full-reloaded the page mid-capture** |
| a QA tool reporting "0 waypoints over 16 legs" | Vite serves `?t=`-suffixed modules after a hot update, so a dynamic import from the page resolves to a **second module instance** with its own empty state |

---

## 7. QA tooling

| tool | what it catches |
|---|---|
| `capture.mjs` | renders all 52 hero views; **flags any camera inside a collider or with under 3.2 m of clearance, and searches for a clear replacement at the same ground level** |
| `walkthrough.mjs` | drives the player along a route derived from the street data; names the blocking collider and recovers so one wall does not cascade |
| `passability.mjs` | sweeps every corridor's full width for a walkable lane — the only check that scales to 12,539 colliders |
| `perf.mjs` | draw calls and triangles first, milliseconds second |
| `check.mjs` | syntax-checks all sources; Vite's failure mode for a bad parse looks like a dead server |
| `qareport.mjs` | generates every number in this document |

---

## 8. Remaining uncertainties

Carried from the reconnaissance and unresolved:

- Ishibe-koji's alignment (LOW), the stage's pillar row spacing (derived, not
  sourced), carriageway widths outside the three OSM-tagged streets.
- The Hondo and stage OSM centroids disagree by ~8 m; the stage is anchored off
  the Hondo, since it is *defined* as the deck between its wings.
- `docs/recon/STREET.md` §1.8 (Nene-no-michi / Shimogawara / Ishibe-koji
  businesses) is self-flagged as its weakest section; unsourced names are
  quarantined and were not built.

Full per-figure sourcing and uncertainty registers: `docs/recon/GEO.md`,
`docs/recon/ARCH.md`, `docs/recon/STREET.md`.
