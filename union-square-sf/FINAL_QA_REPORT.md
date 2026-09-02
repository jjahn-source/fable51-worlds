# FINAL QA REPORT — Union Square SF Digital Twin

Generated 2026-09-02 17:18 by tools/qa/report.mjs.

## Reconstruction boundary
WGS84 bbox 37.7850–37.7910 N, −122.4115 – −122.4035 W (≈ 800 × 720 m): Union Square plus the blocks between Mason/Grant and Sutter/O'Farrell, with context to Bush/Ellis and Taylor/Kearny. Local frame origin = Dewey Monument (37.787935, −122.40752, 23.94 m NAVD88), grid bearing 80.686°.

## Counts
| Metric | Value |
|---|---|
| OSM building footprints loaded | 453 (414 inside the bbox) + 55 building parts |
| Buildings with runtime records | 492 |
| Buildings with authored façade specs | 75 (auto-detailed: every street-facing building within 230 m of the plaza) |
| Façade openings / instanced modules | 11950 / 28003 |
| Storefront census entries (research) | 122 |
| Identified storefronts in the runtime registry | 129 (confidence high 49, medium 76, low 4) |
| Interactive (enterable) storefronts | 2: Apple Union Square, Nintendo SAN FRANCISCO |
| Full interiors | 2 (Apple Union Square, Nintendo SAN FRANCISCO) · interactables: 23 |
| Reference viewpoints | 34 (28 with free-licensed photos) |
| Screenshot comparison passes (sheets) | 147 across 14 runs (qa/compare/*) |
| Pedestrians / vehicles (live) | 220 / 109 |
| GLB assets (BPL) | 206 files, 5.1 MB |
| Textures resident | 124 |

## Storefront verification coverage
125 of 129 runtime storefronts (97 %) carry high/medium-confidence identities sourced from 2024–2026 records (src/data/recon/storefronts.json). Unresolved bays are rendered with neutral blank fascias.

## Known uncertain / unresolved storefronts (from the census)
- 237 Powell St — UNRESOLVED (vacant, low)
- Powell St west side, ~251-299 (between SF Souvenirs and the Geary corner building) — UNRESOLVED (unknown, low)
- 335 Powell St (Westin lobby bars) — UNRESOLVED (unknown, low)
- 150 Powell St — UNRESOLVED (vacant, high)
- 384 Post St (NE corner Post/Powell; Powell frontage) — UNRESOLVED (former Saks Fifth Avenue) (vacant, high)
- Powell St east side, ~400-448 (between ex-Saks and Beacon Grand) — UNRESOLVED (unknown, low)
- 462 Powell St — UNRESOLVED (unknown, low)
- 100-120 Stockton St — UNRESOLVED (ground-floor retail vacant; Kith & Neko Health planned) (coming-soon, high)
- 200 Stockton St (NE corner Geary/Stockton; One Union Square) — UNRESOLVED (former Bulgari) (vacant, high)
- 324 Stockton St — UNRESOLVED (former Cole Haan) (vacant, medium)
- 340 Stockton St — UNRESOLVED (unknown, low)
- 390 Stockton St (SE corner Sutter/Stockton) — UNRESOLVED (unknown, low)
- 210 Post St — UNRESOLVED (unknown, low)
- 250A Post St — UNRESOLVED (former Zara) (vacant, high)
- 272 Post St — UNRESOLVED (vacant, low)
- 340 Post St — UNRESOLVED (former Williams-Sonoma; Chanel-owned) (vacant, high)
- 384 Post St — UNRESOLVED (former Saks Fifth Avenue) (vacant, high)
- ~420-444 Post St — UNRESOLVED (unknown, low)
- 225 Post St — UNRESOLVED (former Burberry) (vacant, high)
- 251 Post St — UNRESOLVED (unknown, low)
- Post St south side between the Westin and 491 Post — UNRESOLVED (unknown, low)
- 491 Post St (SE corner Post/Mason) — UNRESOLVED (unknown, low)
- 140 Geary St — UNRESOLVED (ground floor); A. Lange & Söhne salon on 3rd floor (unknown, low)
- ~150-152 Geary St — UNRESOLVED (former Banana Republic) (closed, medium)
- 172-174 Geary St (One Union Square) — UNRESOLVED (vacant suites) (vacant, high)
- 347 Geary St — UNRESOLVED (former Daily Grill) (unknown, low)
- 389 Geary St — UNRESOLVED (vacant, low)
- 399 Geary St (SE corner Geary/Mason) — UNRESOLVED (former CVS; Mastro's Steakhouse upstairs) (vacant, medium)
- 170 Maiden Lane — UNRESOLVED (unknown, low)
- 400 Sutter St / 444 Stockton St (NE corner Sutter/Stockton) — UNRESOLVED (former CVS ground floor) (vacant, low)
- 415 Stockton St (NW corner Sutter/Stockton) — UNRESOLVED (unknown, low)
- 480 Sutter St (NE corner Sutter/Powell) — UNRESOLVED (unknown, low)
- Sutter/Powell NW corner (5xx Sutter / 5xx Powell) — UNRESOLVED (unknown, low)
- 55 Stockton St (SW corner O'Farrell/Stockton) — UNRESOLVED (Chalk offices above) (unknown, low)

## Performance (headless Chromium, 1920×1080, ANGLE/Metal)
### day
| Location | fps | p95 fps | frame ms | draw calls | triangles | heap MB |
|---|---|---|---|---|---|---|
| plaza centre | 63 | 34.1 | 15.88 | 2108 | 7.25 M | 290 |
| Powell & Geary | 51 | 29.7 | 19.6 | 2646 | 7.91 M | 290 |
| Post & Stockton | 50.6 | 30.1 | 19.78 | 2384 | 7.72 M | 290 |
| Powell north | 52.8 | 38.5 | 18.93 | 2552 | 7.96 M | 290 |
| Geary east | 68.4 | 42.6 | 14.61 | 1822 | 6.14 M | 290 |
| inside Nintendo | 73.7 | 46.1 | 13.57 | 1932 | 6.92 M | 290 |
| inside Apple | 79.1 | 59.9 | 12.64 | 1764 | 6.31 M | 290 |
| aerial | 32.2 | 24.2 | 31.03 | 3522 | 8.52 M | 290 |

### night
| Location | fps | p95 fps | frame ms | draw calls | triangles | heap MB |
|---|---|---|---|---|---|---|
| plaza centre | 54.4 | 23.7 | 18.38 | 965 | 4.18 M | 242 |
| Powell & Geary | 38.5 | 19.7 | 25.95 | 1378 | 4.83 M | 242 |
| Post & Stockton | 43.2 | 21.8 | 23.15 | 1222 | 4.70 M | 242 |
| Powell north | 45.3 | 27.2 | 22.08 | 1364 | 4.89 M | 242 |
| Geary east | 60.9 | 29.9 | 16.41 | 659 | 3.07 M | 242 |
| inside Nintendo | 75 | 56.8 | 13.33 | 652 | 3.85 M | 242 |
| inside Apple | 73.2 | 63.7 | 13.67 | 646 | 3.27 M | 242 |
| aerial | 34.1 | 23 | 29.32 | 1948 | 5.37 M | 242 |

## Scores
- Geographic accuracy (geometric QA, v1 6.5 → blocking items fixed; target 9): **7.5/10**
- Building recognizability (architect v2; target 9): **5.5/10 → walls-winding fix applied after review; est. 6.5**
- Storefront accuracy (semantic QA; target 9): **6/10 (76% of named census tenants placed; 119/119 side-parity)**
- Apple reconstruction (architect/env-art; target 9): **7/10**
- Nintendo reconstruction (architect/env-art/interaction; target 9): **7.5/10**
- Street-level detail (env-art v2 density; target 8.5): **6/10**
- Visual fidelity (SF-local v2 recognisability; target 8.5): **6/10**
- Materials (tech-art v2; target 8.5): **6/10**
- Lighting (tech-art v2; target 8.5): **7/10**
- Pedestrian believability (target 8): **6.5/10**
- Traffic believability (target 8): **6.5/10**
- Interaction quality (interaction QA; target 8.5): **7/10 (qa/reports/interaction.md)**
- Navigation (walkthrough 18/18; target 9): **8/10**
- Performance (tech-art v2; target 8.5): **6/10 (57–89 fps street level / 34–42 aerial headless 1080p; night 38–75)**
- Completeness (9-cell audit; target 9): **6.5/10**
- _note: **Scores are the independent reviewers' second-pass numbers (qa/reports/*_v2.md) or the v1 number when no second pass ran; they were NOT adjusted to meet the target bar. The gap to the 8–9/10 targets is documented in qa/discrepancies.md and the top-10 lists in each v2 report.**

## Remaining known discrepancies
Compiled from the independent QA reports (qa/reports/*.md) after the fix cycle. Items marked FIXED were addressed and re-verified by screenshot; OPEN items remain.

**Geometry**
- FIXED (root cause of 'walls vanish when looking up'): every façade wall quad was wound inward, so back-face culling hid walls wherever no backing panel sat behind them; quads are now oriented by their intended normal (src/world/facade/FacadeBuilder.ts).
- FIXED: the Nintendo module's clip-plane carve (inverted plane constants) discarded other buildings' walls at some pitches; removed (the spec's `custom` bays leave the store openings).
- FIXED: markings overlay mirrored in z (canvas flipY) → brick block on the wrong Powell segment.
- FIXED: Westin St. Francis rendered as a glass grid (OSM outline vs. building:part conflict) → outline base + E-plan part mass; three wings, light courts, cornice, Colusa-toned stone.
- FIXED: Central Subway station outline extruded as a 28 m block along Stockton; plaza stage outline as a box.
- FIXED: duplicate intersection boxes at Powell & Geary / Powell & Post (Powell's three street segments); markings sinking into sloped roads (all markings now painted in a world-space overlay).
- FIXED: rooftop mechanical boxes floating outside footprints / over façade-engine buildings.
- FIXED: Dewey Monument proportions (pedestal 3.35 m, total ≈ 29 m).
- OPEN: Saks Fifth Avenue OSM footprint leaves a 2.1 m Powell sidewalk (should be ~4 m) — OSM polygon is drawn to the property line; not corrected.
- OPEN: Whittell Building (166 Geary) modelled at OSM 56 m vs. 66 m reference; no hipped roof; Beacon Grand crown set-back missing.
- OPEN: Neiman Marcus harlequin cladding and the City of Paris dome are approximated (flat rose-taupe granite + glass prism mass).
- OPEN: Macy's 233 Geary marble box shows a doubled window grid where the authored mass overlaps the outline's Stockton edge.

**Storefronts / semantics**
- FIXED: Westin Powell tenants (Victoria's Secret, Pandora, Bourbon Steak, hotel marquee) missing → sloped-block datum fix.
- FIXED: Chanel / ex-Banana Republic swapped at 150–156 Geary; Zara (400 Post) shown as open → hoarding with "opening 2026".
- FIXED: Macy's had no square-facing sign → rooftop 'macy's' logotype + Cheesecake Factory plaques; Saks / Tiffany parapet letters; Neiman script signs.
- OPEN: 21 of 88 named census tenants are not yet placed (mostly Post St luxury row east of Stockton and Maiden Lane boutiques); Isaia side-of-lane inconsistency in the census.
- OPEN: b. patisserie / Union Square Coffee kiosk names not rendered as signs (kiosks are plain glass pavilions).

**Materials / lighting**
- FIXED: environment map double-counted (over-exposed day); night too dark (city-glow environment, monument uplights, lit shopfronts, lamp light pools).
- OPEN: procedural textures repeat visibly at 1–3 m (sidewalk stains, ashlar); trims read dark in shadow; no true harlequin/terracotta materials.
- OPEN: pedestrian and vehicle assets are deliberately low-poly (blocky hands, simplified cable car and sedans).

**Interaction / life**
- FIXED: pedestrian crossings now follow the live traffic-light clock (previously a separate 60 s clock).
- OPEN: pedestrians do not yet enter stores; no queue at Nintendo; buses do not stop at shelters.

**Viewpoints**
- FIXED: 16 reference-camera definitions that sat inside buildings / in roadways were corrected (vp01, vp04, vp10, vp12, vp16, vp18, vp19, vp21, vp23–vp26, vp29–vp33).
- OPEN: vp02 is a misfiled 2005 photo of Stockton & Ellis (outside the model) and is not used.

