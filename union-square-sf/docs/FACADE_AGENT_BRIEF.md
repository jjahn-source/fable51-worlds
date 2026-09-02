# Façade sector agent brief (shared)

Project root: /Users/christinehu/Downloads/fable51-bench/3d (Vite + TS + three r185). Dev server runs at http://localhost:5173 (do NOT start another; if down: `npx vite --port 5173 --strictPort &`).

## Read first
- src/world/facade/FacadeSpec.ts — the JSON schema you author.
- src/world/facade/FacadeBuilder.ts — how specs become geometry (ground band with storefront bays + fascia signs, upper floors with window modules per bay, reveals, stringcourses, cornice/parapet, rooftop props, `masses` for projecting pavilions/towers, `extras` for columns/balconies/fire escapes/flags).
- src/world/facade/AutoSpec.ts — the default applied to buildings without an authored spec (you are replacing these for your sector).
- public/assets/models/manifest_arch.json — module names + real sizes (windows, storefronts, doors, marquee, cornices, columns...).
- src/materials/Signage.ts / src/materials/Logos.ts — `tenant.brand` keys (makeLogoSign) — check Logos.ts for available brand keys (another agent may still be adding; use `brand` only for keys that exist, else text).
- Your sector recon: src/data/recon/<sector>.json + docs/recon/<sector>.md, and src/data/recon/storefronts.json (tenants, statuses, signage descriptions), refs/<sector>/*.jpg (VIEW several photos with the Read tool — they are your ground truth).

## Coordinates & tools
- Local metres: x east (toward Stockton), z south (toward Geary), y up; plaza centre (0,0), y=0 = 23.94 m NAVD88. Powell x≈-73, Stockton x≈73.5, Post z≈-52, Geary z≈52, Sutter z≈-157, O'Farrell z≈157, Grant x≈219, Mason x≈-220.
- `node tools/geo/edges.mjs "<name|address|osmId>"` or `--near=x,z` prints each footprint edge index, endpoints, length, facing direction and the street it faces. Edge `from/to` distances in specs are metres from endpoint `a` toward `b`.
- Ground level near a building: `node tools/qa/eval.mjs "window.__twin.world.terrain.heightAt(x,z)"`.
- After editing your spec file run `node tools/geo/sync_data.mjs` (validates JSON and copies to public/data), then capture: `node tools/qa/capture.mjs --out=qa/shots/<sector> "--cam=name:x,y,z,headingDeg,pitchDeg,fov" ...` (y = EYE height in absolute local metres = ground + 1.7; heading = compass degrees; the grid runs 9° west of north so "looking along Powell northward" = 351°, along Geary/Post eastward = 81°, west = 261°, south = 171°). View the PNGs with the Read tool and iterate. Also use the reference viewpoints: `node tools/qa/capture.mjs --out=qa/shots/<sector> vp05 vp14` (ids in src/data/recon/viewpoints.json) and `node tools/qa/compare.mjs --shots=qa/shots/<sector> --out=qa/compare/<sector> vp05 vp14` to get side-by-side + 50% overlay sheets against the real photos — this is the primary validation.

## Authoring rules
- One spec per OSM building (`osmId` from edges.mjs). Cover every building on your street edges within ~150 m of the square at LEVEL 2 (correct wall material/colour, floor count, window module + bay rhythm, base, cornice/parapet), and LEVEL 3 for the square-facing frontage (every ground-floor storefront bay with the real tenant and sign; entrances; awnings; hotel marquees; columns; flags).
- Storefront bays: give `from/to` in metres along the edge, `module` (`storefront_bay_3.0x4.5` generic glazing, `storefront_luxury_4.0x5.0` bronze/stone luxury, `storefront_arcade_arch_4.0x5.5` arched stone arcade, `storefront_door_double_2.0x2.8`/`storefront_door_recessed_3.0x4.5` entrances, `door_revolving_2.4`, `door_hotel_marquee_6.0`, `wall` solid, `custom` = leave empty for a hero module) and `tenant` {name, brand?, signType, awning?, illuminated?, category, status, confidence, address, enterable:false}. Use REAL current tenants from storefronts.json; for UNRESOLVED/vacant bays use `tenant` with name "For Lease" style neutral text ONLY if the recon says vacant; otherwise omit `tenant` (blank fascia). Never invent a brand.
- Use `masses` for volumes the OSM outline doesn't capture (Westin's three projecting pavilions, towers set back, the Neiman Marcus corner rotunda as an octagon, Macy's convex bow as a shallow polygon), `extras` for columns/pilasters/balconies/flags/fire escapes. `heightM` overrides wrong OSM heights (cite recon).
- Keep JSON valid (sync_data reports errors). Do not edit engine code; if a feature is missing, approximate with existing options and list it in your report.
- Only write src/data/facades/<sector>.json (and qa/shots/<sector>/*). Buildings on a corner belong to the sector of their address street; check the other sector files (they may still be empty) and skip osmIds already covered.
