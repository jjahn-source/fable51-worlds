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
