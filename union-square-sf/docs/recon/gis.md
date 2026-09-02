# GIS reconnaissance — Union Square, San Francisco

Generated 2026-09-01 by `tools/geo/build_gis.mjs` + scratch doc generator. Authoritative files: `src/data/recon/gis.json` (local-frame dataset), `src/data/recon/elevation.json`, `src/data/recon/osm_raw.json` (raw Overpass dump), `src/geo/geo.ts` (frame + transforms).

## 1. What was fetched

- **OpenStreetMap via Overpass API** (`https://overpass-api.de/api/interpreter`, `out body geom`), data timestamp **2026-09-01T22:40:50Z**, bbox S 37.785 W -122.4115 N 37.791 E -122.4035. 2864 elements (1443 nodes, 1307 ways, 114 relations). Query: building, building:part, highway, area:highway, railway, route relations, shop, amenity, tourism, office, leisure, historic, natural, public_transport, man_made, emergency, barrier, craft, healthcare, advertising, memorial, landuse, place, entrance, addr:housenumber. License: ODbL.
- **Elevation: USGS EPQS (https://epqs.nationalmap.gov/v1/json), 3DEP 1 m bare-earth DEM, units metres (NAVD88); per-point fallback opentopodata ned10m where src is set.** 840 grid samples at 25 m spacing (28 × 30), 24 street intersections, 453 building centroids; 0 null, 0 fell back to ned10m. Range 8.1–72.5 m across the bbox. Fetched 2026-09-01.
- **DataSF**: not used — OSM already carried footprints, addresses and heights for the area; DataSF building-footprint/height layers would be the next source to reconcile the 33 height-less footprints (see §6).

### Counts (gis.json)

| buildings | inside bbox | building:parts | streets (highway ways, clipped) | tram/cable-car tracks | POIs | trees | lamps | signals | crossings | hydrants | benches | bollards |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 453 | 414 | 55 | 690 | 7 | 1166 | 50 | 9 | 37 | 172 | 24 | 37 | 4 |

Street kinds: footway 416, tertiary 66, service 57, steps 55, secondary 49, residential 16, pedestrian 15, platform 5, tertiary_link 4, corridor 3, busway 2, living_street 1, unclassified 1.

## 2. Coordinate frame (see `src/geo/geo.ts`)

- **Origin** = centroid of OSM way 616479962 (Dewey Monument, historic=monument): **37.787935, -122.40752**, ground elevation **23.94 m** (NAVD88, USGS 3DEP 1 m). The brief's fallback 37.787994, -122.407437 is ~6 m NE of this.
- **Frame**: metres; x = grid-east (along Geary/Post toward Stockton), y = up (0 at origin ground), z = grid-south (toward Geary). Right-handed Three.js frame. Footprints are closed rings, CCW seen from above.
- **Grid bearing** (deg clockwise from true north, axial fit of OSM roadway segments inside the bbox):

| street(s) | axis bearing | fitted length | segments |
|---|---|---|---|
| Powell St | 170.889° | 834 m | 33 |
| Stockton St | 169.792° | 578 m | 30 |
| Powell + Stockton | 170.460° | 1412 m | 63 |
| Geary St | 80.932° | 699 m | 25 |
| Post St | 80.860° | 764 m | 35 |
| Geary + Post | 80.894° | 1463 m | 60 |
| All four, N-S folded by -90° (**GRID_BEARING_DEG**) | 80.686° | 2875 m | 123 |

**GRID_BEARING_DEG = 80.686°** (bearing of local +x). Grid-north bearing = -9.314°, i.e. the downtown grid is rotated ~9.3° counter-clockwise from true north. Powell and Stockton disagree by ~1.1° (Stockton's short segments near Post/Geary are drawn at 169–170° while Powell/Mason are at ~171°); Geary and Post agree within 0.07°. The combined fit makes the square's four corner intersections axis-aligned to within 0.8 m.
- Projection constants at lat 37.788: 110992.476 m/° lat, 88084.677 m/° lon. Local bbox: x -398.68…404.49, z -392.45…378.78.

## 3. Elevations

| point | lat | lon | local x | local z | elev m (NAVD88) | y (rel. plaza centre) |
|---|---|---|---|---|---|---|
| **Plaza centre (Dewey Monument)** | 37.787935 | -122.40752 | 0 | 0 | **23.94** | 0 |
| **Powell & Geary** | 37.78737 | -122.408246 | -73.3 | 51.5 | **21.24** | -2.70 |
| **Powell & Post** | 37.788293 | -122.408434 | -73.0 | -52.2 | **26.09** | 2.15 |
| **Stockton & Post** | 37.788501 | -122.406794 | 73.3 | -51.6 | **22.49** | -1.45 |
| **Stockton & Geary** | 37.787578 | -122.406592 | 74.3 | 52.3 | **18.82** | -5.12 |
| Powell & Sutter | 37.789229 | -122.408616 | -72.0 | -157.4 | 31.48 | 7.54 |
| Stockton & Sutter | 37.789436 | -122.406982 | 73.7 | -156.7 | 27.43 | 3.49 |
| Powell & O'Farrell | 37.786434 | -122.408056 | -73.5 | 156.8 | 16.93 | -7.01 |
| Stockton & O'Farrell | 37.78664 | -122.40641 | 73.2 | 157.7 | 15.69 | -8.25 |
| Grant & Geary | 37.787768 | -122.405057 | 211.1 | 53.4 | 15.87 | -8.07 |
| Grant & Post | 37.788703 | -122.405247 | 211.4 | -51.7 | 17.36 | -6.58 |
| Mason & Geary | 37.787156 | -122.409889 | -219.9 | 51.5 | 24.95 | 1.01 |
| Mason & Post | 37.788084 | -122.410077 | -219.6 | -52.8 | 28.52 | 4.58 |
| Grant & Sutter | 37.789635 | -122.405435 | 211.8 | -156.5 | 19.13 | -4.81 |
| Grant & O'Farrell | 37.786836 | -122.404855 | 211.9 | 158.4 | 13.30 | -10.64 |
| Mason & Sutter | 37.78902 | -122.410267 | -219.3 | -158.0 | 38.70 | 14.76 |
| Mason & O'Farrell | 37.786221 | -122.4097 | -220.3 | 156.7 | 21.86 | -2.08 |
| Powell & Ellis | 37.7855 | -122.407868 | -74.0 | 261.7 | 12.66 | -11.28 |
| Stockton & Ellis | 37.785774 | -122.406246 | 71.9 | 254.8 | 12.59 | -11.35 |
| Grant & Maiden Lane | 37.788237 | -122.405152 | 211.3 | 0.7 | 16.57 | -7.37 |
| Stockton & Maiden Lane | 37.788041 | -122.406689 | 74.1 | 0.2 | 20.54 | -3.40 |
| Kearny & Post | 37.788901 | -122.403684 | 350.8 | -51.1 | 15.44 | -8.50 |
| Kearny & Sutter | 37.789833 | -122.403872 | 351.2 | -155.9 | 15.59 | -8.35 |
| Powell & Bush | 37.790162 | -122.408807 | -71.9 | -262.3 | 44.58 | 20.64 |
| Stockton & Bush | 37.790376 | -122.407124 | 78.3 | -261.7 | 37.10 | 13.16 |

**Sanity check.** Plaza centre is 23.9 m ASL — inside the expected 20–30 m band. Powell St climbs northward toward Nob Hill: Ellis 12.7 → O'Farrell 16.9 → Geary 21.2 → Post 26.1 → Sutter 31.5 → Bush 44.6 m. Stockton St: Ellis 12.6 → O'Farrell 15.7 → Geary 18.8 → Post 22.5 → Sutter 27.4 → Bush 37.1 m. Along Geary the ground falls from Powell (21.2) to Stockton (18.8) to Grant (15.9) m, i.e. the square tilts down toward the south-east. The plaza (23.9 m) sits above the Geary/Stockton corner (18.8 m) and below the Powell/Post corner (26.1 m): the plaza is a level deck on top of the Union Square Garage with stairs down to Geary/Stockton and roughly at grade on Powell/Post, consistent with the DEM.
Cross-check against opentopodata `ned10m` (10 m NED): Dewey Monument centroid 23.9 vs 23.8; Powell & Geary 21.2 vs 21.2; Powell & Post 26.1 vs 26.0; Stockton & Post 22.5 vs 22.4; Stockton & Geary 18.8 vs 18.8 — agreement within the expected 1 m-vs-10 m product difference. Note: open-elevation.com (SRTM 30 m) returned 35 m at the plaza — ~11 m too high — and was rejected.

## 4. Most important buildings (top 40 by footprint area inside the bbox)

Height = OSM `height` (m) where tagged, else `building:levels` × 3.6 m (marked *est*). Ground = DEM elevation at footprint centroid relative to plaza centre.

| # | OSM id | name | address | levels | height m | area m² | ground y | data quality |
|---|---|---|---|---|---|---|---|---|
| 1 | way/700791868 | Hilton San Francisco Union Square | 333 O'Farrell Street | — | — | 10434 | -3.4 | **no height/levels**; built 1964-05-25; Q3498798 |
| 2 | relation/6483285 | San Francisco Marriott Marquis | 780 Mission Street | — | 133 | 8918 | -12.7 | height tagged; multipolygon (1 hole); levels untagged; Q3471438 |
| 3 | way/32863633 | Macy's | 251-281 Geary Street | 8 | 45 | 8423 | -5.8 | height tagged; built 1910 |
| 4 | way/332378158 | The Westin St. Francis | 335 Powell Street | 13 | 60 | 7276 | 0.9 | height tagged; Q7988926 |
| 5 | way/184956226 | Union Square/Market Street Station | — | — | — | 6714 | -6.8 | **no height/levels**; no addr; Q21016288 |
| 6 | way/332238072 | Sutter Stockton Garage | 444 Stockton Street | 10 | 30 | 6624 | 2.7 | height tagged |
| 7 | way/149332498 | Four Seasons | 757 Market Street | — | 29 | 5100 | -11.2 | height tagged; levels untagged; Q5475490 |
| 8 | way/332521036 | Neiman Marcus | 150 Stockton Street | 5 | 28 | 3895 | -7.0 | height tagged; Q5123857 |
| 9 | way/333827281 | The White House Building | — | — | 32 | 3577 | -7.3 | height tagged; no addr; levels untagged; Q108044442 |
| 10 | way/33571523 | Mason O'Farrell Garage | 325 Mason Street | 9 | 25 | 3479 | -0.3 | height tagged |
| 11 | way/33617520 | Ellis O'Farrell Garage | — | — | 25 | 3176 | -11.2 | height tagged; no addr; levels untagged |
| 12 | relation/1547963 | Flood Building | 870 Market Street | 12 | 49 | 3167 | -11.7 | height tagged; multipolygon (1 hole); Q5460027 |
| 13 | relation/1547962 | Phelan Building | 760 Market Street | 11 | 42 | 2899 | -10.2 | height tagged; multipolygon (1 hole); Q17065905 |
| 14 | way/32863657 | — | — | — | 33 | 2840 | -8.2 | height tagged; unnamed; no addr; levels untagged |
| 15 | way/50832129 | Hotel Nikko San Francisco | 222 Mason Street | — | 90 | 2726 | -4.8 | height tagged; levels untagged; Q24886057 |
| 16 | way/256029754 | Pacific Building | — | 10 | 54 | 2617 | -11.8 | height tagged; no addr |
| 17 | way/149335988 | — | — | 5 | 28 | 2425 | -9.4 | height tagged; unnamed; no addr |
| 18 | way/32863589 | Saks Fifth Avenue | 384;398 Post Street | — | 27 | 2112 | 2.5 | height tagged; levels untagged |
| 19 | way/48995282 | The Olympic Club | 524 Post Street | 6 | 27 | 2058 | 10.1 | height tagged; Q2416259 |
| 20 | way/118106934 | Contemporary Jewish Museum | 736 Mission Street | — | 14 | 2048 | -12.5 | height tagged; levels untagged; Q5164991 |
| 21 | way/1186086081 | Four Fifty Sutter Building | 450 Sutter Street | 29 | 105 | 1969 | 9.4 | height tagged; Q4638113 |
| 22 | way/35024386 | — | 347;349;351;353;357;373 Geary Street | — | 26 | 1838 | -2.1 | height tagged; unnamed; levels untagged |
| 23 | way/35024381 | The Barnes San Francisco, Tapestry Collection by Hilton | 225 Powell Street | — | 30 | 1831 | -5.0 | height tagged; levels untagged |
| 24 | way/48995281 | Bohemian Club | 624 Taylor Street | — | 27 | 1782 | 10.6 | height tagged; levels untagged; Q1091018 |
| 25 | way/71504443 | Nextdoor | 400;420 Taylor Street | — | 18 | 1781 | 0.1 | height tagged; levels untagged; Q7021239 |
| 26 | way/35537021 | JW Marriott | 515 Mason Street | 21 | 73 | 1747 | 7.6 | height tagged; Q111393399 |
| 27 | way/71504442 | The Clift Royal Sonesta San Francisco | 495 Geary Street | — | 64 | 1704 | 2.4 | height tagged; levels untagged; Q5133119 |
| 28 | way/35176927 | — | — | — | 21 | 1606 | -10.5 | height tagged; unnamed; no addr; levels untagged |
| 29 | way/135620233 | Metropolitan Club | 640;650 Sutter Street | — | 23 | 1572 | 19.0 | height tagged; levels untagged |
| 30 | way/112928951 | — | 799 Market Street | — | 87 | 1556 | -11.5 | height tagged; unnamed; levels untagged |
| 31 | way/147689078 | The Elevated Shops Building | — | — | 24 | 1533 | -8.8 | height tagged; no addr; levels untagged |
| 32 | way/32863429 | Beacon Grand | 450 Powell Street | 22 | 62 | 1479 | 5.8 | height tagged; Q27628578 |
| 33 | way/260280326 | W&J Sloane Building | 222 Sutter Street | 8 | 42 | 1411 | -6.5 | height tagged |
| 34 | way/149332503 | — | — | — | 26 | 1393 | -10.9 | height tagged; unnamed; no addr; levels untagged |
| 35 | way/71504438 | Toni Rembe Theater | 415 Geary Street | — | 23 | 1387 | 1.3 | height tagged; levels untagged; Q463781 |
| 36 | way/172250614 | — | 150 Post Street | — | 32 | 1369 | -7.9 | height tagged; unnamed; levels untagged |
| 37 | way/147689076 | — | — | — | 30 | 1368 | -8.2 | height tagged; unnamed; no addr; levels untagged |
| 38 | way/35536720 | Fashion Institute of Design and Merchandising - San Francisco | — | — | 38 | 1349 | -8.6 | height tagged; no addr; levels untagged |
| 39 | way/79375219 | — | 400 Powell Street | — | 17 | 1333 | 3.4 | height tagged; unnamed; levels untagged |
| 40 | way/332374374 | Academy of Art University - Liberal Arts | 491 Post Street | — | 18 | 1297 | 3.0 | height tagged; levels untagged; built 1914 |

### Anchor buildings from the brief (as found in OSM)

| anchor | OSM match | address | levels | height m | centroid x,z | note |
|---|---|---|---|---|---|---|
| Westin St. Francis | way/332378158 — The Westin St. Francis | 335 Powell Street | 13 | 60 | -127.2, -1.4 | height tagged |
| Westin St. Francis | way/435582543 — The Westin St. Francis Tower (part) | 455 Post Street | 32 | 120 | -160.7, -3.6 | height tagged |
| Westin St. Francis | node/377908347 — Taxi Stand at The Westin St. Francis on Union Square [amenity=taxi] | 335 Powell Street | — | — | -79.8, 9.9 |  |
| Apple Union Square | way/332223480 — Apple Union Square | 300 Post Street | 2 | 15 | 44.3, -75.7 | height tagged |
| Apple Union Square | way/481885316 — Apple Mini Park [place=square] | — | — | — | 43.8, -97.0 |  |
| Macy's | way/32863633 — Macy's | 251-281 Geary Street | 8 | 45 | 12.7, 104.5 | height tagged |
| Macy's | node/4556399234 — Macy's San Francisco Visitor Information Desk [tourism=information] | — | — | — | -1.4, 131.5 |  |
| Macy's | node/9870749111 — Taxi Stand at Macy's Union Square (along Geary St Entrance) [amenity=taxi] | 251 Geary Street | — | — | -1.7, 58.8 |  |
| Neiman Marcus | way/332521036 — Neiman Marcus | 150 Stockton Street | 5 | 28 | 128.8, 84.5 | height tagged |
| Saks Fifth Avenue | way/32863589 — Saks Fifth Avenue | 384;398 Post Street | — | 27 | -38.7, -83.3 | height tagged |
| Tiffany & Co | way/35536963 — Tiffany & Company | 350;360 Post Street | — | 42 | -3.6, -81.8 | height tagged |
| Nintendo SF (331 Powell) | node/12850136757 — Nintendo SAN FRANCISCO [shop=video_games] | 331 Powell Street | — | — | -89.3, 35.8 |  |
| Union Square Garage | way/111586252 — Union Square Garage [amenity=parking] | — | — | — | 0.2, -0.1 |  |
| Dewey Monument | way/616479962 — Dewey Monument [historic=monument] | — | — | — | 0.0, 0.0 |  |
| Grand Hyatt | way/32863494 — Grand Hyatt San Francisco | 345 Stockton Street | 36 | 94 | 45.7, -126.3 | height tagged |
| Grand Hyatt | node/9870764245 — Taxi Stand at Grand Hyatt (along Sutter St in front of Starbucks) [amenity=taxi] | 395 Sutter Street | — | — | 89.1, -147.5 |  |
| Chancellor / Sir Francis Drake (Beacon Grand) | way/32863429 — Beacon Grand | 450 Powell Street | 22 | 62 | -46.4, -125.1 | height tagged |
| Chancellor / Sir Francis Drake (Beacon Grand) | way/79375215 — Chancellor Hotel | 433 Powell Street | — | 52 | -96.2, -97.4 | height tagged |
| Chancellor / Sir Francis Drake (Beacon Grand) | node/9870749112 — Taxi Stand at Beacon Grand [amenity=taxi] | 450 Powell Street | — | — | -65.0, -104.3 |  |

## 5. Buildings with MISSING height (no `height`, no `building:levels`)

34 of 453 footprints (33 inside the bbox). Renderer should fall back to a neighbourhood default (e.g. 4 levels ≈ 14 m for small retail parcels) and flag them.

| OSM id | name | address | building= | area m² | centroid x,z | inside bbox |
|---|---|---|---|---|---|---|
| way/700791868 | Hilton San Francisco Union Square | 333 O'Farrell Street | hotel | 10434 | -293.1, 208.3 | yes |
| way/160331904 | Powell Street Station | 899 Market Street | train_station | 8122 | -9.6, 343.9 | no |
| way/184956226 | Union Square/Market Street Station | — | train_station | 6714 | 63.1, 107.6 | yes |
| way/1261984860 | Post Taylor Garage | — | yes | 1233 | -329.6, -13.3 | yes |
| way/288500670 | — | — | yes | 909 | -187.5, -326.5 | yes |
| way/1261920374 | — | 490 Post Street | yes | 682 | -179.3, -93.0 | yes |
| way/151184977 | — | — | yes | 659 | -164.8, 113.5 | yes |
| way/585642018 | — | 333 Geary Street | yes | 590 | -118.8, 82.7 | yes |
| way/474354572 | — | 576;578;580;588 Sutter Street | yes | 411 | -189.0, -182.3 | yes |
| way/939492030 | — | — | yes | 397 | 315.4, 31.6 | yes |
| way/939466404 | — | 233 Post Street | yes | 346 | 162.4, -25.3 | yes |
| way/939466400 | V.C. Morris Gift Shop Building | 140 Maiden Lane | yes | 268 | 146.3, -14.1 | yes |
| way/939466399 | — | — | yes | 255 | 117.9, 14.4 | yes |
| way/149332499 | — | 721 Market Street | yes | 220 | 293.4, 167.4 | yes |
| way/939466402 | — | 250;252;260 Stockton Street | yes | 206 | 95.1, -28.9 | yes |
| way/939466403 | Graff | 237 Post Street | yes | 188 | 151.1, -32.8 | yes |
| way/939466401 | — | 275;299 Post Street | yes | 170 | 95.1, -38.3 | yes |
| way/939466408 | — | — | yes | 141 | 110.4, -73.2 | yes |
| way/256076601 | — | — | yes | 136 | 311.2, -280.5 | yes |
| way/1262342634 | — | — | yes | 129 | 159.5, -310.1 | yes |
| way/939466405 | — | 134 Maiden Lane | yes | 120 | 156.7, -14.4 | yes |
| way/616479967 | — | — | roof | 114 | -47.5, -10.4 | yes |
| way/939466397 | — | 216 Stockton Street | retail | 114 | 95.5, 22.1 | yes |
| way/937963044 | — | — | yes | 104 | -317.6, 7.6 | yes |
| way/147633859 | — | — | yes | 101 | 278.9, 13.0 | yes |
| way/1020483120 | — | — | yes | 99 | 306.3, -210.9 | yes |
| way/147689075 | — | 69 Maiden Lane | yes | 93 | 260.9, 14.7 | yes |
| way/616479964 | — | — | roof | 91 | 47.8, 11.3 | yes |
| way/616479965 | — | — | roof | 77 | 0.2, -21.5 | yes |
| way/939466398 | — | — | yes | 65 | 108.5, 15.4 | yes |
| way/616479966 | — | — | roof | 33 | -45.1, 12.3 | yes |
| way/1261913582 | — | — | roof | 33 | 14.8, -61.7 | yes |
| way/616479963 | — | — | roof | 26 | 45.6, -11.7 | yes |
| way/1262001121 | — | — | roof | 3 | -63.6, -242.1 | yes |

## 6. Known gaps and data-quality notes

- OSM `height` is tagged on 387/453 footprints and `building:levels` on only 84; heights are community-entered (many look like LiDAR-derived imports rounded to the metre) and are **unverified** — treat as medium confidence. 34 footprints have neither.
- 55 `building:part` ways (towers, setbacks — e.g. the Westin St. Francis 1972 tower, Grand Hyatt) are exported separately in `buildingParts`; render parts *instead of* the parent outline where they exist, otherwise the outline.
- Street furniture coverage in OSM is partial: only 9 street lamps and 50 trees are mapped in the bbox (reality: hundreds). 37 benches, 24 hydrants, 4 bollards, 37 traffic signals, 172 crossing nodes. Treat these as seeds, not a census.
- Storefront-level data (widths, frontage, signage) is not in OSM; the POI list in §7 is the seed for the storefront census and each entry needs Street-View-era verification. POI `level` tags are present on 157 POIs (many upper-floor businesses in the same building).
- Overpass returns full geometry of any way touching the bbox, so streets are clipped to bbox + 60 m; buildings are kept whole (`insideBbox` flags centroid inside the bbox). Kearny & Geary lies just outside the east edge.
- Elevation is bare-earth 1 m DEM sampled at points; street `elevProfile` values are bilinear interpolations from the 25 m grid (±0.3 m on slopes, may smear the plaza deck/stair edges). The plaza deck itself is a garage roof: use the plaza polygon at y ≈ 0 and the DEM only for the surrounding streets.
- Union Square Garage entrances found in OSM (amenity=parking_entrance within 150 m of the origin): node/364825950 at (-7.4, 25.7); node/386873574 at (7.3, 25.8); node/386885888 at (15.2, -26.0); node/1707762331 at (-14.2, -26.1) — two on the Geary side (z ≈ +26) and two on the Post side (z ≈ -26), confirming the brief; the ramps sit inside the plaza block perimeter.
- Route relations (Muni bus/trolleybus/tram/subway: 105) were fetched but only used to label tracks; bus stops are in POIs (`highway=bus_stop` nodes are stored under kind `public_transport=*` / tags).

## 7. Named POIs (shop / amenity / tourism / office / craft / healthcare) — storefront census seed

547 named entries (sorted by kind). `x,z` local metres; `lvl` = OSM level tag; area-centroid rows are buildings/areas tagged with the business.

| kind | name | address | lvl | x | z | OSM id | geom |
|---|---|---|---|---|---|---|---|
| amenity=arts_centre | Goethe Institut | — |  | 171.7 | -273.7 | node/1485978376 | pt |
| amenity=atm | Bank of America | — | 0 | -83.1 | -118.3 | node/388233184 | pt |
| amenity=atm | Chase | — |  | 322.9 | -144.3 | node/3408771316 | pt |
| amenity=atm | Wells Fargo | — |  | -47.7 | 250.8 | node/808930853 | pt |
| amenity=atm | Wells Fargo | — |  | 235.3 | 141.5 | node/4482170889 | pt |
| amenity=bank | Bank of America | 445 Powell Street |  | -98.1 | -121.4 | way/939467974 | area |
| amenity=bank | Chase | 700 Market Street | 0 | 336.9 | 68.7 | node/8707797871 | pt |
| amenity=bank | Citibank | — |  | 362.6 | -37.2 | node/392198178 | pt |
| amenity=bank | Wells Fargo | — |  | -3.1 | -169.0 | node/381953737 | pt |
| amenity=bank | Wells Fargo | 2 Grant Avenue | 0 | 230.1 | 140.3 | node/384346934 | pt |
| amenity=bar | Bar Fluxus | 18 Harlan Place |  | 265.7 | -217.0 | node/4839978312 | pt |
| amenity=bar | Bartlett Hall | 242 O'Farrell Street | 0 | -135.8 | 143.3 | node/4498256594 | pt |
| amenity=bar | Cityscape Lounge | 333 O'Farrell Street |  | -344.0 | 239.9 | node/9322450624 | pt |
| amenity=bar | Clock Bar | — |  | -107.7 | 4.5 | node/9322450623 | pt |
| amenity=bar | Elements Bar and Lounge | 165 O'Farrell Street | 3 | -15.0 | 182.3 | node/9328898384 | pt |
| amenity=bar | ENO Wine Bar | — |  | -107.9 | -15.6 | node/10000755452 | pt |
| amenity=bar | John Foley's Dueling Piano Bar | — |  | -130.4 | 167.3 | node/317081666 | pt |
| amenity=bar | Key Klub | 850 Bush Street |  | -295.0 | -275.9 | node/3931497663 | pt |
| amenity=bar | Level III | — |  | -237.1 | -68.0 | node/621818366 | pt |
| amenity=bar | Lost Cat | 587 Post Street |  | -331.9 | -41.5 | node/621818383 | pt |
| amenity=bar | Nightingale | 239 Kearny Street |  | 338.4 | -217.8 | node/9943927508 | pt |
| amenity=bar | Obscenity Bar & Lounge | 562 Sutter Street |  | -169.7 | -171.1 | node/4628492031 | pt |
| amenity=bar | OneUP Lounge | 345 Stockton Street |  | 44.3 | -142.9 | node/13168483731 | pt |
| amenity=bar | Pacific Cocktail Haven | 550 Sutter Street |  | -149.3 | -182.0 | node/4533347390 | pt |
| amenity=bar | Pagan Idol | 375 Bush Street |  | 387.2 | -247.9 | node/4143685674 | pt |
| amenity=bar | Press Club | 20 Yerba Buena Lane |  | 232.7 | 255.9 | node/1844915443 | pt |
| amenity=bar | Rickhouse | 246 Kearny Street |  | 367.8 | -227.8 | node/2941409392 | pt |
| amenity=bar | Silk Road Bar | 134 Ellis Street |  | -121.0 | 249.3 | node/13594408375 | pt |
| amenity=bar | Sool Bar and Lounge | 323 Grant Avenue |  | 199.5 | -201.9 | node/3408837756 | pt |
| amenity=bar | The European | — |  | -353.2 | 37.9 | node/9659740450 | pt |
| amenity=bar | The Summer Place | 801 Bush Street |  | -232.8 | -252.3 | node/2249505473 | pt |
| amenity=bar | The View Lounge | 55 4th Street | 39 | 232.3 | 321.7 | node/1612808193 | pt |
| amenity=bicycle_rental | Alcatraz Bikes & Tours | 569 Post Street | 0 | -319.9 | -35.8 | node/11053463105 | pt |
| amenity=bicycle_rental | Bay Wheels | — | 0 | 173.2 | 223.3 | node/2671868139 | pt |
| amenity=bicycle_rental | Bay Wheels | — |  | 207.2 | -174.3 | node/9863198160 | pt |
| amenity=bicycle_rental | Bay Wheels | — |  | 377.9 | -56.0 | way/1020405241 | area |
| amenity=bicycle_rental | Bay Wheels | — | 0 | -78.9 | -78.3 | way/1021751371 | area |
| amenity=bicycle_rental | Bay Wheels | — |  | -160.0 | 205.4 | way/1027630997 | area |
| amenity=bicycle_rental | Unlimited Biking | 427 Post Street |  | -120.1 | -39.5 | node/10560538420 | pt |
| amenity=cafe | Asha Tea House | 17 Kearny Street |  | 338.3 | 26.6 | node/4632000803 | pt |
| amenity=cafe | Beanstalk Cafe | 724 Bush Street |  | -114.9 | -274.3 | node/5468101421 | pt |
| amenity=cafe | Black Sugar | 320 O'Farrell Street |  | -264.1 | 141.9 | node/9194418334 | pt |
| amenity=cafe | Blue Bottle Coffee | 199 Sutter Street |  | 364.3 | -143.4 | node/1246390510 | pt |
| amenity=cafe | Blue Bottle Coffee | 705 Market Street |  | 318.6 | 136.0 | node/9897737049 | pt |
| amenity=cafe | Bluestone Lane | 562 Sutter Street |  | -179.4 | -170.9 | node/9339973638 | pt |
| amenity=cafe | Boudin | — | 0 | 17.7 | 143.8 | node/808930783 | pt |
| amenity=cafe | Cafe 22 | — | 0 | -244.0 | 111.8 | node/9553542990 | pt |
| amenity=cafe | Cafe Dolci | 740A Market Street | 0 | 249.8 | 133.1 | node/9301912409 | pt |
| amenity=cafe | Café Encore | 488 Post Street |  | -188.9 | -65.1 | node/6488820632 | pt |
| amenity=cafe | Cafe La Tazita | 470 Post Street |  | -171.8 | -65.1 | node/6488820630 | pt |
| amenity=cafe | Caffe Central | 133 O'Farrell Street |  | -10.6 | 171.5 | node/10016602471 | pt |
| amenity=cafe | Capital One 360 Café | 101 Post Street |  | 335.6 | -38.9 | node/2429468220 | pt |
| amenity=cafe | Feng Cha | 99 Mission Street | 0 | 280.4 | 359.5 | node/1282343098 | pt |
| amenity=cafe | Fresh Market | — |  | 145.1 | 70.6 | node/10000454690 | pt |
| amenity=cafe | Gong Cha | 272 O'Farrell Street |  | -177.9 | 144.0 | node/9427236840 | pt |
| amenity=cafe | Little Sweet | 75 O'Farrell Street |  | 112.3 | 169.2 | node/9462343653 | pt |
| amenity=cafe | Little Sweet | 224 Kearny Street |  | 364.6 | -193.4 | node/12101566691 | pt |
| amenity=cafe | Mellis Cafe | Ellis Street |  | -171.4 | 249.0 | node/808884914 | pt |
| amenity=cafe | Metropolitan Coffee | — |  | 299.0 | 96.8 | node/13785160902 | pt |
| amenity=cafe | Nave Cafe | 242 Powell Street | 0 | -58.2 | 99.7 | node/13799894601 | pt |
| amenity=cafe | Peet's Coffee | 773 Market Street | 0 | 181.7 | 248.2 | node/3397982293 | pt |
| amenity=cafe | Starbucks | 442 Geary Street |  | -292.5 | 39.0 | node/725100826 | pt |
| amenity=cafe | Starbucks | 201 Powell Street | 0 | -83.9 | 143.7 | node/808930741 | pt |
| amenity=cafe | Starbucks | 462 Powell Street |  | -60.8 | -143.3 | node/1486063055 | pt |
| amenity=cafe | Starbucks | 390 Stockton Street |  | 86.5 | -142.9 | node/3393420459 | pt |
| amenity=cafe | Starbucks | 170 O'Farrell Street | 3 | -15.0 | 66.2 | node/9518764060 | pt |
| amenity=cafe | Sutter Cafe | 330 Sutter Street |  | 157.9 | -191.6 | node/3409669041 | pt |
| amenity=cafe | Sutter Street Cafe | 450 Sutter Street |  | 4.2 | -178.1 | node/4259744392 | pt |
| amenity=cafe | Working Girls Cafe | — |  | 337.4 | -247.6 | node/4628353544 | pt |
| amenity=cafe | Yokee Milk Tea | 253 Kearny Street |  | 339.3 | -232.8 | node/4631999418 | pt |
| amenity=car_rental | Alamo | 340 O'Farrell Street |  | -300.7 | 143.3 | node/1901920438 | pt |
| amenity=car_rental | Alamo | 750 Bush Street |  | -147.5 | -282.5 | node/4373043589 | pt |
| amenity=car_rental | Avis | — |  | -231.7 | 205.6 | node/10137870917 | pt |
| amenity=car_rental | Budget | — |  | -231.8 | 211.8 | node/10137873817 | pt |
| amenity=car_rental | Dollar Car Rental | 364 O'Farrell Street |  | -307.7 | 143.2 | node/427896349 | pt |
| amenity=car_rental | Enterprise | — |  | -284.7 | 276.2 | node/4637773273 | pt |
| amenity=car_rental | Hertz | 325 Mason Street |  | -232.1 | 131.8 | node/5232704121 | pt |
| amenity=car_rental | National | 520 O'Farrell Street |  | -260.4 | 144.1 | node/427897275 | pt |
| amenity=car_rental | Thrifty | 350 O'Farrell Street |  | -297.0 | 143.4 | node/427897097 | pt |
| amenity=car_sharing | City Car Share | — |  | 111.5 | -226.9 | node/1409407331 | pt |
| amenity=car_sharing | Getaround | — |  | 110.7 | -220.2 | node/3393496209 | pt |
| amenity=car_sharing | Zipcar | — |  | 112.5 | -232.9 | node/3393496208 | pt |
| amenity=clinic | Passport Health Downtown San Francisco Travel Clinic | 47 Kearny Street |  | 317.7 | -8.1 | node/13131878136 | pt |
| amenity=college | Fashion Institute of Design and Merchandising - San Francisco | — |  | 43.2 | 186.0 | way/35536720 | area |
| amenity=coworking_space | Digital Garage | 715;717;719 Market Street |  | 313.3 | 170.9 | way/149332501 | area |
| amenity=dentist | Union Square Dental Group | 490 Post Street |  | -193.8 | -63.8 | node/10594658906 | pt |
| amenity=doctors | Miguel Delgado, MD | 450 Sutter Street |  | -1.1 | -184.3 | node/12816820350 | pt |
| amenity=doctors | My Doctor Medical Group | 450 Sutter Street |  | 6.8 | -177.6 | node/2362017423 | pt |
| amenity=fast_food | Al Pastor Papi | — | 0 | -122.5 | 143.6 | node/12939867830 | pt |
| amenity=fast_food | Burger King | 35 Powell Street | 0 | -107.1 | 307.4 | way/1136875252 | area |
| amenity=fast_food | Chipotle | 211 Sutter Street |  | 337.1 | -143.6 | node/2613888359 | pt |
| amenity=fast_food | Fanoos | — |  | -122.9 | -144.6 | node/3393428417 | pt |
| amenity=fast_food | Jack in the Box | 400 Geary Street |  | -233.4 | 38.4 | node/383509298 | pt |
| amenity=fast_food | Jamba | 170 O'Farrell Street | -1 | -17.4 | 83.5 | node/4556399233 | pt |
| amenity=fast_food | Jamba | 152 Kearny Street |  | 364.1 | -129.1 | node/4632000732 | pt |
| amenity=fast_food | Jasmin's | 809 Bush Street |  | -245.4 | -252.1 | node/1486009911 | pt |
| amenity=fast_food | McDonald's | 441 Sutter Street |  | 5.4 | -144.5 | node/4626983989 | pt |
| amenity=fast_food | Mr. Charlie's TMS | 432 Sutter Street |  | 23.9 | -168.8 | node/3393342116 | pt |
| amenity=fast_food | Oasis Grill | 711 Market Street |  | 305.6 | 145.6 | node/3397923104 | pt |
| amenity=fast_food | Oink & Oscar | 87 Mission Street |  | 268.2 | 344.5 | node/2336394868 | pt |
| amenity=fast_food | Poke Bowl | 33 Kearny Street |  | 338.1 | 17.8 | node/9546656576 | pt |
| amenity=fast_food | Rooster and Rice | 125 Kearny Street |  | 337.1 | -94.7 | node/4632000742 | pt |
| amenity=fast_food | SF Wraps | 255 Kearny Street |  | 339.6 | -237.1 | node/4632000807 | pt |
| amenity=fast_food | Subway | — | -1 | -17.2 | 76.7 | node/4556399235 | pt |
| amenity=fast_food | Subway | 425 Bush Street | 0 | 309.5 | -248.2 | node/4628353543 | pt |
| amenity=fast_food | Super Duper Burgers | 721 Market Street | 0 | 286.8 | 159.3 | node/3397910051 | pt |
| amenity=fast_food | Sushirrito | 226 Kearny Street |  | 364.6 | -196.9 | node/4632000739 | pt |
| amenity=fast_food | The Halal Guys | 336 O'Farrell Street |  | -283.2 | 141.5 | node/9194418333 | pt |
| amenity=fast_food | Union Square Pizza & Kitchen | — |  | -193.1 | 143.8 | node/808930732 | pt |
| amenity=fast_food | Wetzel's Pretzels | — | -1 | -4.3 | 76.9 | node/4556399231 | pt |
| amenity=fast_food | Wetzel's Pretzels | — |  | -29.0 | 141.7 | node/12316462727 | pt |
| amenity=food_court | International Food Court | — | -1 | 367.6 | -284.1 | node/4625128134 | pt |
| amenity=fountain | Ruth Asawa’s San Francisco Fountain | — |  | 55.6 | -97.2 | way/288512968 | area |
| amenity=ice_cream | Amorino | 338 Grant Avenue |  | 223.3 | -229.7 | node/7003532185 | pt |
| amenity=nightclub | Hawthorn | 46 Grant Avenue |  | 282.7 | 26.9 | way/147633860 | area |
| amenity=nightclub | Love + Propaganda | 85 Campton Place |  | 92.6 | -97.1 | node/1940798155 | pt |
| amenity=nightclub | Starlite Room | 450 Powell Street |  | -50.6 | -123.6 | node/298086258 | pt |
| amenity=parking | 450 Sutter parking | 450 Sutter Street |  | 14.8 | -168.3 | node/3393334553 | pt |
| amenity=parking | California Parking | — |  | -320.4 | -188.6 | way/197344279 | area |
| amenity=parking | City Park | 22 4th Street |  | 149.8 | 351.7 | node/317081440 | pt |
| amenity=parking | City Park | — |  | -152.0 | -283.1 | node/2923553295 | pt |
| amenity=parking | Ellis O'Farrell Garage | — |  | 2.6 | 213.6 | way/33617520 | area |
| amenity=parking | Four Seasons Valet Parking Entrance | — |  | 278.5 | 230.6 | node/3398000958 | pt |
| amenity=parking | Handlery Parking | — |  | -153.7 | 144.0 | node/2499499476 | pt |
| amenity=parking | Mason O'Farrell Garage | 325 Mason Street |  | -272.6 | 123.7 | way/33571523 | area |
| amenity=parking | Post Taylor Garage | — |  | -329.6 | -13.3 | way/1261984860 | area |
| amenity=parking | Sutter Stockton Garage | 444 Stockton Street |  | 125.5 | -210.7 | way/332238072 | area |
| amenity=parking | The White House Garage | 223 Sutter Street |  | 293.1 | -143.9 | node/3408808414 | pt |
| amenity=parking | Union Square Garage | — |  | 0.2 | -0.1 | way/111586252 | area |
| amenity=parking_entrance | ENTRANCE Parking (2nd Floor) | — |  | 84.4 | -192.2 | node/3406622908 | pt |
| amenity=parking_entrance | ENTRANCE Parking (3rd Floor) | — |  | 138.8 | -251.3 | node/3406598342 | pt |
| amenity=parking_entrance | EXIT Parking (2nd Floor) | — |  | 84.4 | -194.8 | node/3406620064 | pt |
| amenity=parking_entrance | EXIT Parking (4th Floor) | — |  | 84.4 | -198.5 | node/3406612596 | pt |
| amenity=parking_entrance | EXIT Parking 2nd floor) | — |  | 154.7 | -251.4 | node/3406598341 | pt |
| amenity=pharmacy | Four-Fifty Sutter Pharmacy | 450 Sutter Street | 7 | 16.7 | -171.6 | node/3393349632 | pt |
| amenity=pharmacy | Walgreens | 459 |  | -86.6 | -144.1 | node/381955914 | pt |
| amenity=place_of_worship | Glide Memorial United Methodist Church | — |  | -391.8 | 239.8 | node/358805518 | pt |
| amenity=place_of_worship | Notre Dame Des Victoires Church | 566 Bush Street |  | 136.8 | -293.0 | way/260183822 | area |
| amenity=place_of_worship | Saint Patrick Catholic Church | 756 Mission Street |  | 303.2 | 316.0 | way/32963425 | area |
| amenity=post_box | USPS | — |  | -95.8 | 57.0 | node/377871861 | pt |
| amenity=post_box | USPS | — |  | 189.1 | 164.0 | node/427898251 | pt |
| amenity=pub | Chelsea Place | — |  | 5.9 | -249.2 | node/1485992620 | pt |
| amenity=pub | Golden Gate Tap Room | 449 Powell Street | 2 | -85.0 | -125.8 | node/3637499305 | pt |
| amenity=pub | Irish Bank | 10 Mark Lane |  | 288.1 | -234.1 | node/2249504566 | pt |
| amenity=pub | Johnny Foley's Irish House | 243 O'Farrell Street |  | -137.5 | 168.4 | node/808930729 | pt |
| amenity=pub | Last Drop Tavern | 550 Powell Street |  | -61.0 | -234.6 | node/3393396123 | pt |
| amenity=pub | Murphy's | Kearny Street |  | 339.2 | -187.1 | node/2249505215 | pt |
| amenity=pub | Sam's Tavern | 374 Bush Street |  | 397.3 | -275.5 | node/11032970208 | pt |
| amenity=pub | Tunnel Top | 601 Bush Street |  | 61.3 | -249.3 | node/371025500 | pt |
| amenity=restaurant | ABSteak | 124 Ellis Street |  | -115.1 | 248.7 | node/1674110549 | pt |
| amenity=restaurant | Akiko's | 431 Bush Street |  | 294.4 | -249.2 | node/4143689799 | pt |
| amenity=restaurant | Akiko's Sushi Bar | 542 Mason Street |  | -207.4 | -121.8 | node/621818322 | pt |
| amenity=restaurant | Aliment | 786 Bush Street |  | -197.2 | -275.0 | node/9397923182 | pt |
| amenity=restaurant | Amber India | 25 Yerba Buena Lane | 0 | 211.5 | 261.2 | node/1629217172 | pt |
| amenity=restaurant | Anzu Restaurant | 222 Mason Street |  | -200.8 | 180.9 | node/768936339 | pt |
| amenity=restaurant | Bentotaro | 430 Geary Street |  | -263.0 | 38.4 | node/725096410 | pt |
| amenity=restaurant | Biscuits & Blues | 401 Mason Street |  | -231.6 | 31.7 | node/725100831 | pt |
| amenity=restaurant | Bombay Brasserie | — |  | 121.2 | -120.6 | node/13168486490 | pt |
| amenity=restaurant | Bota Tapas & Paella Bar | — |  | -333.4 | 35.7 | node/725100818 | pt |
| amenity=restaurant | Bouche | 603 Bush Street |  | 59.0 | -249.3 | node/1701772830 | pt |
| amenity=restaurant | Café de la Presse | 352 Grant Avenue | 0 | 224.3 | -249.6 | node/841414821 | pt |
| amenity=restaurant | Cafe Mason | 320 Mason Street |  | -204.0 | 115.9 | node/383502127 | pt |
| amenity=restaurant | Café Rito | — |  | -123.2 | 5.0 | node/10000755449 | pt |
| amenity=restaurant | Campton Bar & Bistro | — |  | 121.4 | -115.3 | node/13168486491 | pt |
| amenity=restaurant | Cesario's | 601 Sutter Street |  | -231.1 | -147.0 | node/621851563 | pt |
| amenity=restaurant | Corzetti | 398 Geary Street |  | -206.9 | 39.1 | node/12939867831 | pt |
| amenity=restaurant | David's Delicatessen & Diner | 474 Geary Street |  | -318.7 | 35.2 | node/725100821 | pt |
| amenity=restaurant | Del Popolo | 855 Bush Street |  | -303.6 | -240.9 | way/135620197 | area |
| amenity=restaurant | Delarosa | 37 Yerba Buena Lane |  | 226.8 | 292.8 | node/5085031722 | pt |
| amenity=restaurant | Dirty Habit | 12 4th Street |  | 106.5 | 321.7 | node/3442537168 | pt |
| amenity=restaurant | E&O Kitchen and Bar | 314 Sutter Street |  | 175.7 | -169.0 | node/1928504681 | pt |
| amenity=restaurant | El Mariachi SF | — |  | -244.0 | 209.9 | node/14124158135 | pt |
| amenity=restaurant | Hinodeya Ramen & Bar | 219 O'Farrell Street | 0 | -105.7 | 168.4 | node/808930715 | pt |
| amenity=restaurant | Ippudo (一風堂) | 18 Yerba Buena Lane |  | 223.9 | 245.7 | node/5752120935 | pt |
| amenity=restaurant | John's Grill Live Jazz | 63 Ellis Street |  | -12.4 | 275.9 | node/317081652 | pt |
| amenity=restaurant | Kin Khao | 55 Cyril Magnin Street |  | -204.5 | 293.1 | node/10648027954 | pt |
| amenity=restaurant | King Kee | 101 Cyril Magnin Street |  | -161.7 | 241.9 | node/808884908 | pt |
| amenity=restaurant | King of Thai Noodle | 184 O'Farrell Street | 0 | -41.5 | 144.8 | node/808930789 | pt |
| amenity=restaurant | KP49 Sandwiches | 49 Kearny Street |  | 337.8 | -20.0 | node/9546618838 | pt |
| amenity=restaurant | La Marsa | 454 Geary Street |  | -296.7 | 38.6 | node/9659739153 | pt |
| amenity=restaurant | Le Central | 453 Bush Street |  | 260.8 | -241.9 | way/332372778 | area |
| amenity=restaurant | Lori's Diner | 500 Sutter Street |  | -85.8 | -169.5 | node/1486061262 | pt |
| amenity=restaurant | Magnin Street Cafe & Bistro | 138 Cyril Magnin Street |  | -140.2 | 229.7 | node/808884854 | pt |
| amenity=restaurant | Maru Sushi | 529 Powell Street |  | -92.9 | -205.2 | way/332229903 | area |
| amenity=restaurant | Mastro's Steakhouse | 399 Geary Street | 1 | -199.9 | 65.2 | node/8758527004 | pt |
| amenity=restaurant | Miller & Lux Provisions | 225 Stockton Street |  | 50.2 | -9.5 | way/115921779 | area |
| amenity=restaurant | Million Thai | 385 Taylor Street |  | -379.3 | 194.2 | node/808930689 | pt |
| amenity=restaurant | Mixt | 240 Kearny Street |  | 367.2 | -213.5 | node/1223019575 | pt |
| amenity=restaurant | Mixt | 51 Yerba Buena Lane | 0 | 245.0 | 311.8 | node/6489341657 | pt |
| amenity=restaurant | Miyabiya Sushi and Grill | 115 Cyril Magnin Street |  | -164.0 | 222.6 | node/808884850 | pt |
| amenity=restaurant | Morton's The Steakhouse | — |  | -101.6 | -65.1 | node/5608474721 | pt |
| amenity=restaurant | Mr. Mahjong | — |  | 365.0 | -238.2 | node/4632000740 | pt |
| amenity=restaurant | New Delhi | 160 Ellis Street |  | -180.1 | 247.9 | node/808884842 | pt |
| amenity=restaurant | Nomu | 580 Bush Street | 0 | 111.4 | -280.1 | node/11643001882 | pt |
| amenity=restaurant | O' | 165 O'Farrell Street | 4;5 | -15.1 | 186.9 | node/9842795999 | pt |
| amenity=restaurant | Oma Sushi | 330 O'Farrell Street |  | -277.8 | 142.2 | node/9194418332 | pt |
| amenity=restaurant | Once Upon a Dosa | 35 Kearny Street |  | 338.5 | 6.9 | node/9546656577 | pt |
| amenity=restaurant | One65 Bistro & Grill | 165 O'Farrell Street | 1;2 | -14.6 | 176.7 | node/9842796000 | pt |
| amenity=restaurant | OneUP Restaurant | 345 Stockton Street |  | 45.2 | -109.3 | node/13168483730 | pt |
| amenity=restaurant | Pinecrest Diner | 401 Geary Street |  | -231.7 | 66.7 | node/383507544 | pt |
| amenity=restaurant | PLS on Post | 545 Post Street | 0 | -294.4 | -41.7 | node/13573915819 | pt |
| amenity=restaurant | Roxanne Cafe | 570 Powell Street | 0 | -60.2 | -248.5 | node/1486000122 | pt |
| amenity=restaurant | Sabra Grill | 419 Grant Avenue | 2 | 208.8 | -295.7 | node/4631727986 | pt |
| amenity=restaurant | Sam's Cable Car Lounge | — |  | -59.0 | 120.1 | node/8719392251 | pt |
| amenity=restaurant | Sam's Grill | 374 Bush Street |  | 390.6 | -275.6 | node/9786711956 | pt |
| amenity=restaurant | Scott's Chowder House | 334 Grant Avenue |  | 224.7 | -217.9 | node/1928508899 | pt |
| amenity=restaurant | Sears Fine Food | 439 Powell Street |  | -84.4 | -108.1 | node/4301580389 | pt |
| amenity=restaurant | Sons & Daughters | 708 Bush Street |  | -98.6 | -274.4 | node/9735934439 | pt |
| amenity=restaurant | SushiToni | 733 Bush Street |  | -127.6 | -250.3 | node/9349946416 | pt |
| amenity=restaurant | Tad's Steaks | 38 Ellis Street |  | 6.4 | 249.1 | node/9518786539 | pt |
| amenity=restaurant | Taqueria Mana | 439 Stockton Street |  | 63.5 | -234.5 | node/3393361804 | pt |
| amenity=restaurant | Taylor Street Coffee Shop | 375 Taylor Street |  | -379.6 | 190.6 | node/3190922045 | pt |
| amenity=restaurant | The Cheesecake Factory | 251 Geary Street | 7 | -6.2 | 70.8 | node/3394945428 | pt |
| amenity=restaurant | The Oak Room Restaurant | — |  | -108.4 | 17.3 | node/10000755451 | pt |
| amenity=restaurant | The Old Siam | 201 Mason Street |  | -233.3 | 272.3 | node/11704706860 | pt |
| amenity=restaurant | The Parthenon | — |  | -189.7 | -172.6 | node/6242778291 | pt |
| amenity=restaurant | The Rotunda | 150 Stockton Street |  | 98.8 | 78.7 | node/11717162358 | pt |
| amenity=restaurant | The Thonglor | 420 Geary Street | 0 | -256.3 | 38.9 | node/725096408 | pt |
| amenity=restaurant | The White Horse | — |  | -280.2 | -148.1 | node/621851558 | pt |
| amenity=restaurant | Ton Ton Japanese Ramen House | 422 Geary Street | 0 | -259.0 | 38.8 | node/9203654733 | pt |
| amenity=restaurant | Trisara | 211 Kearny Street |  | 339.7 | -181.9 | node/11085011205 | pt |
| amenity=restaurant | Tropisueño | 75 Yerba Buena Lane |  | 253.7 | 323.5 | node/1799521636 | pt |
| amenity=restaurant | Ula | 450 Post Street | 0 | -147.6 | -64.9 | node/10239425287 | pt |
| amenity=restaurant | Uncle Vito's Pizzeria | 700 Bush Street |  | -84.3 | -274.3 | node/3393400211 | pt |
| amenity=restaurant | Urban Tavern | — | 0 | -280.3 | 174.7 | node/808930679 | pt |
| amenity=restaurant | Zingari | — |  | -244.8 | -41.1 | node/621818396 | pt |
| amenity=school | Notre Dame Des Victoires Grammar School | — |  | 136.9 | -283.3 | node/358803743 | pt |
| amenity=school | Notre Dame Des Victoires School | — |  | 147.2 | -335.1 | way/942310706 | area |
| amenity=social_centre | Elks Lodge No. 3 | — |  | -160.8 | -76.4 | node/11725217797 | pt |
| amenity=taxi | Taxi Stand at Beacon Grand | 450 Powell Street |  | -65.0 | -104.3 | node/9870749112 | pt |
| amenity=taxi | Taxi Stand at Grand Hyatt (along Sutter St in front of Starbucks) | 395 Sutter Street |  | 89.1 | -147.5 | node/9870764245 | pt |
| amenity=taxi | Taxi Stand at Hilton Hotel Union Square | 333 O'Farrell Street |  | -327.0 | 164.4 | node/9870749108 | pt |
| amenity=taxi | Taxi Stand at Hotel Nikko | 222 Mason Street |  | -227.3 | 248.9 | node/9870749107 | pt |
| amenity=taxi | Taxi Stand at Hotel Triton | 342 Grant Avenue |  | 218.2 | -242.4 | node/9871101574 | pt |
| amenity=taxi | Taxi Stand at Macy's Union Square (along Geary St Entrance) | 251 Geary Street |  | -1.7 | 58.8 | node/9870749111 | pt |
| amenity=taxi | Taxi Stand at Marriott Marquis (along 4th St entrance) | 33 4th Street |  | 175.2 | 345.7 | node/9870806922 | pt |
| amenity=taxi | Taxi Stand at Marriott Union Square | 480 Sutter Street |  | -37.2 | -169.2 | node/9870749113 | pt |
| amenity=taxi | Taxi Stand at The Clift Royale Sonesta Hotel | 495 Geary Street |  | -354.4 | 58.3 | node/9870749109 | pt |
| amenity=taxi | Taxi Stand at The Westin St. Francis on Union Square | 335 Powell Street |  | -79.8 | 9.9 | node/377908347 | pt |
| amenity=theatre | August Hall | 420 Mason Street |  | -203.3 | 5.7 | node/725100718 | pt |
| amenity=theatre | Curran Theatre | 445 Geary Street |  | -288.2 | 82.6 | way/71504452 | area |
| amenity=theatre | Marine's Memorial Theater | — |  | -244.3 | -147.7 | node/621851565 | pt |
| amenity=theatre | San Francisco Playhouse | — | 2 | -152.1 | -67.7 | node/381948427 | pt |
| amenity=theatre | Shelton Theater | 533 Sutter Street |  | -119.4 | -130.0 | node/11725217803 | pt |
| amenity=theatre | The Alcove Theater | 414 Mason Street |  | -203.7 | 15.5 | node/1706520453 | pt |
| amenity=theatre | Toni Rembe Theater | 415 Geary Street |  | -255.8 | 83.6 | way/71504438 | area |
| amenity=theatre | Un-Scripted Theater Company® | 533 Sutter Street |  | -120.5 | -144.6 | node/3375873393 | pt |
| amenity=university | Academy of Art University | — |  | 318.2 | -274.8 | node/4628353540 | pt |
| amenity=university | Academy of Art University | — |  | 314.9 | -304.0 | way/1156811806 | area |
| craft=jeweller | Custom Design Jewelers II | 260 O'Farrell Street |  | -164.7 | 142.5 | node/10019932087 | pt |
| craft=photographer | Drew Wright | 414 Mason Street |  | -177.2 | 8.2 | node/4511428040 | pt |
| craft=shoemaker | Carmina | 54 Geary Street |  | 273.2 | 40.5 | node/4784488921 | pt |
| healthcare=clinic | LaserAway | 355 Sutter Street |  | 136.4 | -145.4 | node/9398423284 | pt |
| office=architect | KSH Architects | 349 Sutter Street |  | 145.3 | -145.6 | node/9398423285 | pt |
| office=association | World Affairs Council | — |  | 182.4 | -168.3 | node/4628496729 | pt |
| office=company | AT&T | 430 Bush Street |  | 282.1 | -295.3 | node/6371082979 | pt |
| office=company | Crunchyroll | — |  | 278.7 | -275.4 | node/10080940263 | pt |
| office=company | Framework Computer | — |  | -21.6 | -136.7 | node/11212753403 | pt |
| office=company | Nextdoor | 400;420 Taylor Street |  | -335.4 | 123.4 | way/71504443 | area |
| office=company | PandaDoc | — |  | 329.5 | -137.8 | node/6050506587 | pt |
| office=company | Solano Labs | — |  | 90.1 | -36.3 | node/4631727987 | pt |
| office=coworking | WeWork | — |  | 93.9 | 36.6 | node/11279873544 | pt |
| office=diplomatic | Consulate General of Peru | 870 Market Street |  | -26.7 | 280.9 | node/9456849306 | pt |
| office=diplomatic | Consulate General of the Philippines | 447 Sutter Street |  | -21.6 | -141.3 | node/7660999610 | pt |
| office=diplomatic | Consulate General of Ukraine | 530 Bush Street |  | 181.1 | -274.6 | node/3135704977 | pt |
| office=financial_advisor | Brighton Jones | 445 Bush Street | 6 | 277.1 | -231.6 | node/10750240727 | pt |
| office=graphic_design | Applied Information Group | 720 Market Street |  | 289.3 | 88.0 | node/11554599511 | pt |
| office=it | Epam | 222 Kearny Street |  | 382.0 | -191.9 | node/10271231054 | pt |
| office=yes | American Conservatory Theater - Administrative Offices | 415 Geary Street |  | -246.8 | 80.5 | node/368167410 | pt |
| office=yes | The Custom Made Theatre Co. | 414 Mason Street |  | -188.2 | 5.6 | node/4628492035 | pt |
| shop=alcohol | Chateau Montelena Tasting Room | — |  | -122.6 | -16.4 | node/10000755450 | pt |
| shop=alcohol | Cottage Market Liquors | 798 Bush Street |  | -204.8 | -274.5 | node/1486017176 | pt |
| shop=alcohol | Financial District Wine and Spirits | — | 0 | 363.9 | -273.5 | node/4625129274 | pt |
| shop=alcohol | Liquor and Deli Mini Mart | — |  | 62.6 | -213.8 | node/3393356655 | pt |
| shop=alcohol | Liquor Minimart | 251 Ellis Street |  | -269.9 | 273.5 | node/4631865244 | pt |
| shop=alcohol | O'Farrell Liquors | 405 O'Farrell Street |  | -379.8 | 167.6 | node/1699076112 | pt |
| shop=alcohol | Union Square Wine & Spirts | 522 Sutter Street |  | -110.0 | -170.0 | node/3393447848 | pt |
| shop=antiques | Peking Arts Antique | 535 Sutter Street | 0 | -128.6 | -146.3 | node/9536447501 | pt |
| shop=art | CK Contemporary | 246 Powell Street | 0 | -59.5 | 74.6 | node/9901000604 | pt |
| shop=art | Martin Lawrence Gallery | 366 Geary Street |  | -174.3 | 32.9 | way/332376863 | area |
| shop=art | Michael Fine Art and Antiques | — | 0 | 205.1 | -273.2 | node/3394899128 | pt |
| shop=art | Michael Fine Art and Antiques | — |  | 227.5 | -273.4 | node/3394900998 | pt |
| shop=art | Venezia Gallery | 433 Grant Avenue |  | 208.0 | -309.2 | node/6960882345 | pt |
| shop=bag | Rimowa | — | 0 | 226.4 | -92.2 | node/4631728486 | pt |
| shop=bakery | b patisserie | — |  | -49.4 | 10.1 | way/332500661 | area |
| shop=bakery | Boudin Sourdough | — | -1 | -11.6 | 90.8 | node/4556399232 | pt |
| shop=bakery | Posh Bagel | 270 Sutter Street |  | 251.0 | -168.6 | node/3408713872 | pt |
| shop=beauty | Alcheme | — |  | 175.6 | -172.8 | node/4628495506 | pt |
| shop=beauty | Atelier Emmanuel Salon and Day Spa | 415 Stockton Street | 4 | 61.4 | -191.6 | node/3393355309 | pt |
| shop=beauty | Bibbo | — |  | 145.0 | -172.5 | node/10656710026 | pt |
| shop=beauty | Bibbo Hair Salon and Spa | 336 Sutter Street |  | 178.4 | -170.9 | node/4628496726 | pt |
| shop=beauty | Blend Nails | 547 Sutter Street |  | -142.7 | -145.4 | node/9536447499 | pt |
| shop=beauty | Cinta Salon | 23 Grant Avenue | 1 | 197.2 | 118.3 | node/4637159454 | pt |
| shop=beauty | Elite Spa | — |  | 171.7 | -248.8 | node/3393496210 | pt |
| shop=beauty | Epi Center MedSpa | 450 Sutter Street |  | -1.0 | -186.3 | node/13703517246 | pt |
| shop=beauty | Harper Paige | — |  | 196.1 | -115.3 | node/4631727984 | pt |
| shop=beauty | OSO Salon | — |  | 23.8 | -272.9 | node/3394869136 | pt |
| shop=beauty | Smoke & Mirrors Salon | 256 Sutter Street | 2 | 262.9 | -169.2 | node/3408724048 | pt |
| shop=beauty | Sutter Nails | 539 Sutter Street |  | -136.5 | -146.0 | node/3393452323 | pt |
| shop=beauty | Tailored Salon | 266 Sutter Street | 2 | 248.6 | -169.3 | node/3408732351 | pt |
| shop=beauty | Wicked | 257 Grant Avenue | 1 | 199.8 | -138.9 | node/4631729490 | pt |
| shop=bed | Saatva | 128 Post Street |  | 298.4 | -65.3 | node/10103504376 | pt |
| shop=beverages | Boba Guys | 429 Stockton Street |  | 63.1 | -222.0 | node/3393358381 | pt |
| shop=bicycle | Golden Gate Rides | — |  | -10.3 | -169.1 | node/3393351143 | pt |
| shop=books | The Best Bookstore | 226 Powell Street | 0 | -59.5 | 114.3 | node/13621532285 | pt |
| shop=books | The Best Bookstore | 226 Powell Street | 0 | -59.2 | 111.6 | node/13630926283 | pt |
| shop=camera | Leica | 463 Bush Street |  | 247.8 | -248.4 | node/3394905895 | pt |
| shop=cannabis | STIIIZY Union Square | 180 O'Farrell Street |  | -38.2 | 144.6 | node/10000799702 | pt |
| shop=chocolate | Teuscher | 307 Sutter Street |  | 191.2 | -145.4 | node/4628492033 | pt |
| shop=clothes | Acne Studios | — |  | 309.7 | 39.9 | node/10981409304 | pt |
| shop=clothes | Alexander McQueen | 58 Geary Street |  | 266.2 | 40.7 | node/10000444892 | pt |
| shop=clothes | Angelic Pretty | 15 Kearny Street |  | 338.4 | 32.3 | node/9546656574 | pt |
| shop=clothes | Banana Republic | — |  | 134.7 | 41.1 | node/10560692305 | pt |
| shop=clothes | Barcelino | 498 Post Street |  | -204.3 | -65.1 | node/10239425286 | pt |
| shop=clothes | Barcelino per Donna | 476 Post Street |  | -180.5 | -65.0 | node/6488820634 | pt |
| shop=clothes | Bonobos | 55 Grant Avenue | 1 | 197.8 | 84.5 | node/10000916381 | pt |
| shop=clothes | Brunello Cucinelli | — | 0 | 223.8 | 22.9 | node/10000916383 | pt |
| shop=clothes | Burberry | — |  | 180.8 | 38.2 | node/10000778648 | pt |
| shop=clothes | CH Carolina Herrera | 45 Grant Avenue |  | 187.2 | 93.2 | way/256037007 | area |
| shop=clothes | Chanel | 156 Geary Street |  | 128.5 | 41.4 | node/10560692295 | pt |
| shop=clothes | Cop.Copine | 352 Sutter Street |  | 122.5 | -174.7 | node/4628495508 | pt |
| shop=clothes | Couture | 424 Sutter Street |  | 30.6 | -168.5 | node/3393345263 | pt |
| shop=clothes | Couture | — |  | 113.9 | -144.9 | node/4628495509 | pt |
| shop=clothes | Dior | — | 0 | 224.0 | -32.5 | node/4625204999 | pt |
| shop=clothes | Dolce & Gabbana | 100 Grant Avenue |  | 224.2 | 39.4 | node/10000916382 | pt |
| shop=clothes | Fendi | 195 Grant Avenue |  | 198.7 | -8.7 | node/9733363546 | pt |
| shop=clothes | Giorgio Armani | 166 Grant Avenue | 0 | 224.9 | -16.9 | node/10000795502 | pt |
| shop=clothes | Gucci | — | 0 | 86.9 | -8.1 | node/10560692296 | pt |
| shop=clothes | Hermès | 125 Grant Avenue | 0 | 198.1 | 16.6 | node/10000711908 | pt |
| shop=clothes | ISAIA | — |  | 146.7 | -6.5 | node/8702536752 | pt |
| shop=clothes | Joanie Char | 537 Sutter Street |  | -132.0 | -146.1 | node/9536447500 | pt |
| shop=clothes | Joe's Jeans | — |  | 199.2 | -113.4 | node/4631728485 | pt |
| shop=clothes | Kiton | 207 Grant Avenue |  | 199.3 | -97.0 | node/9590578302 | pt |
| shop=clothes | Levi's | 815 Market Street | 0 | 70.6 | 312.2 | node/2453721644 | pt |
| shop=clothes | Loro Piana | — | 0 | 30.2 | 66.3 | node/10580485075 | pt |
| shop=clothes | Louis Vuitton | — | 0 | 49.0 | 67.3 | node/4637357742 | pt |
| shop=clothes | Marlowe | 231 Grant Avenue | 0 | 199.2 | -107.5 | node/4631727985 | pt |
| shop=clothes | Max Mara | 231 Post Street |  | 165.2 | -40.3 | node/4625203722 | pt |
| shop=clothes | Max Mara | 175 Post Street |  | 249.7 | -38.2 | node/4625205165 | pt |
| shop=clothes | Men's Wearhouse | 785 Market Street | 0 | 157.6 | 249.7 | node/3397964607 | pt |
| shop=clothes | Moncler | — |  | 85.6 | 29.2 | node/10560692299 | pt |
| shop=clothes | Nike | 278 Post Street |  | 87.5 | -66.4 | node/2838844729 | pt |
| shop=clothes | Novella Bridal | 565 Sutter Street |  | -165.3 | -145.2 | node/9536447497 | pt |
| shop=clothes | Paul Smith | 50 Geary Street |  | 281.7 | 39.2 | node/10981409301 | pt |
| shop=clothes | Saint Laurent | 90 Grant Avenue | 0 | 224.0 | 75.8 | node/10000916376 | pt |
| shop=clothes | St. John | 245 Post Street |  | 142.2 | -40.5 | node/9733363553 | pt |
| shop=clothes | Theory | 55 Geary Street |  | 266.1 | 67.7 | node/10981409300 | pt |
| shop=clothes | Tory Burch | 222 Stockton Street |  | 86.9 | 9.7 | node/10560692298 | pt |
| shop=clothes | Uomo | 475 Sutter Street |  | -42.4 | -142.7 | node/9971503635 | pt |
| shop=clothes | Urban Outfitters | — |  | -60.1 | 279.7 | node/1393986256 | pt |
| shop=clothes | Valentino | 105 Grant Avenue | 0 | 197.8 | 35.8 | node/10000798790 | pt |
| shop=clothes | Vera Wang | — |  | 90.1 | 40.0 | node/9465252313 | pt |
| shop=clothes | Victoria's Secret | 335 Powell Street |  | -87.1 | -4.5 | node/3394966337 | pt |
| shop=clothes | VINCE. | 36 Geary Street |  | 291.2 | 39.2 | node/10981409302 | pt |
| shop=clothes | Wilkes Bashford | — |  | 118.0 | -145.5 | node/4628496728 | pt |
| shop=clothes | Zara | 250A Post Street |  | 124.1 | -64.9 | node/4625203723 | pt |
| shop=convenience | 7-Eleven | 527 Sutter Street |  | -117.2 | -144.5 | node/1486057725 | pt |
| shop=convenience | Al's Super Lotto | — | 0 | -254.5 | 109.8 | node/9553542985 | pt |
| shop=convenience | Bush Market | 820 Bush Street |  | -252.8 | -275.7 | node/1486016637 | pt |
| shop=convenience | Food Fair Market Liquors | 611 Bush Street |  | 51.0 | -248.4 | node/1485988190 | pt |
| shop=convenience | Fred's Food Mart | — |  | -208.3 | 143.3 | node/9427241921 | pt |
| shop=convenience | Grant Mini Market | 517 Bush Street |  | 176.2 | -248.9 | node/1485975789 | pt |
| shop=convenience | Mason Liquor & Deli | 530 Mason Street |  | -208.2 | -111.5 | node/621818319 | pt |
| shop=convenience | MMC Wine & Spirit | 615 Sutter Street |  | -249.6 | -148.1 | node/621851566 | pt |
| shop=copyshop | FedEx Office | 127 Kearny Street |  | 336.8 | -99.5 | node/4631999420 | pt |
| shop=copyshop | FedEx Office | 726 Market Street | 0 | 283.9 | 108.1 | node/9301912407 | pt |
| shop=copyshop | The UPS Store | — | 2 | -196.5 | 190.9 | node/4110684325 | pt |
| shop=cosmetics | Aveda | — |  | 337.0 | -275.4 | node/4625130231 | pt |
| shop=department_store | Macy's | 251-281 Geary Street |  | 12.7 | 104.5 | way/32863633 | area |
| shop=department_store | Neiman Marcus | 150 Stockton Street |  | 128.8 | 84.5 | way/332521036 | area |
| shop=department_store | Ross | 799 Market Street | 0 | 133.7 | 271.4 | node/389391020 | pt |
| shop=dry_cleaning | First Quality Cleaners & Alterations | 730 Bush Street |  | -121.0 | -274.1 | node/9427218477 | pt |
| shop=dry_cleaning | Pete's Cleaner | 437 Stockton Street |  | 63.5 | -230.7 | node/3393360627 | pt |
| shop=electronics | Apple Union Square | 300 Post Street |  | 44.3 | -75.7 | way/332223480 | area |
| shop=fabric | Britex Fabrics | 117 Post Street |  | 311.8 | -36.6 | node/10981742162 | pt |
| shop=fashion_accessories | Bottega Veneta | 124 Geary Street |  | 164.9 | 38.1 | node/10560692302 | pt |
| shop=fashion_accessories | Dita | — |  | 194.0 | 67.7 | node/10000799066 | pt |
| shop=fashion_accessories | Goyard | 118 Grant Avenue |  | 224.4 | 17.4 | node/10000789740 | pt |
| shop=fashion_accessories | Montblanc | 120 Grant Avenue |  | 225.1 | 8.2 | node/9894102618 | pt |
| shop=fashion_accessories | Van Cleef & Arpels | — |  | 152.4 | 40.9 | node/10560692303 | pt |
| shop=florist | BLOOMING ALLEY | 330 Sutter Street |  | 158.6 | -174.8 | node/3409657987 | pt |
| shop=florist | Love These Flowers | 542 Mason Street |  | -207.3 | -128.0 | node/9659789535 | pt |
| shop=florist | Ray Florets | 40 Grant Avenue |  | 224.4 | 102.1 | node/10000916380 | pt |
| shop=florist | Showcase Flowers | 325 Mason Street | 0 | -234.2 | 107.4 | node/4894787721 | pt |
| shop=furniture | Gumps | 250 Post Street |  | 136.4 | -65.4 | node/4625205159 | pt |
| shop=furniture | Samuel Scheuer | — |  | 131.1 | -175.0 | node/4628492032 | pt |
| shop=gift | Butterfly Gifts | 415 Grant Avenue |  | 208.7 | -289.3 | node/6960882347 | pt |
| shop=gift | Fashion House | 420 Grant Avenue |  | 224.4 | -302.0 | node/6960882343 | pt |
| shop=gift | Gump's Holiday Shop | 240 Post Street |  | 147.0 | -67.1 | node/4625205156 | pt |
| shop=gift | J&K International Trading Company | 425 Grant Avenue |  | 208.7 | -300.8 | node/6960882348 | pt |
| shop=gift | Pop Mart | — | 0 | -58.2 | 134.6 | node/13318568315 | pt |
| shop=gift | SF Souvenirs & Luggage | 245 Powell Street | 0 | -86.7 | 92.7 | node/12508303862 | pt |
| shop=gift | WM Glen & Son - Scottish Imports | 360 Sutter Street |  | 118.2 | -172.6 | node/5874251985 | pt |
| shop=hairdresser | J. Roland | — |  | 128.5 | -145.0 | node/11159300918 | pt |
| shop=hairdresser | Kabuki hair | 771 Bush Street |  | -172.0 | -251.9 | node/3507541005 | pt |
| shop=hairdresser | Nob Hill Hair | 906 Pine Street |  | -241.5 | -381.4 | way/292138577 | area |
| shop=hairdresser | Oma Hair Salon | 257 Kearny Street |  | 339.6 | -242.5 | node/4632000809 | pt |
| shop=hairdresser | Richard's Hair Design | 330 Sutter Street |  | 157.9 | -184.9 | node/3409658242 | pt |
| shop=hairdresser | Salon DNA | — | 2 | -148.0 | -145.3 | node/9978913205 | pt |
| shop=hairdresser | Viange | — |  | 198.3 | -117.3 | node/4631729589 | pt |
| shop=hairdresser | Your New Barber | 380 O'Farrell Street |  | -323.3 | 142.9 | node/11774203415 | pt |
| shop=hifi | Bang & Olufsen | — |  | 142.7 | 41.7 | node/10560692304 | pt |
| shop=jewelry | Brilliant Earth | 300 Grant Avenue | 3 | 248.0 | -201.1 | node/9578904111 | pt |
| shop=jewelry | Cartier | 199 Grant Avenue | 0 | 196.9 | -39.6 | node/4625205004 | pt |
| shop=jewelry | Graff | 237 Post Street |  | 151.1 | -32.8 | way/939466403 | area |
| shop=jewelry | Harry Winston | — | 0 | 191.5 | -64.8 | node/4625205162 | pt |
| shop=jewelry | Jewlery Collection | — |  | 9.8 | -168.7 | node/3393349245 | pt |
| shop=jewelry | Pandora | 345 Powell Street |  | -87.3 | -36.5 | node/10273742748 | pt |
| shop=jewelry | Shapur Mozaffarian | 155 Post Street |  | 270.6 | -37.1 | node/10981742163 | pt |
| shop=jewelry | Shreve & Co. | 150 Post Street |  | 266.4 | -64.1 | node/4625205007 | pt |
| shop=jewelry | Swarovski | — |  | -59.5 | 64.8 | node/9901000606 | pt |
| shop=jewelry | Tiffany & Company | 350;360 Post Street |  | -3.6 | -81.8 | way/35536963 | area |
| shop=jewelry | Zwillinger & Company | 210 Post Street |  | 195.8 | -74.4 | node/10094469048 | pt |
| shop=massage | Siam Orchid | 518 Taylor Street |  | -352.5 | 13.8 | node/9659739774 | pt |
| shop=massage | The Green Door Massage | — |  | 62.3 | -241.1 | node/3393364628 | pt |
| shop=massage | Unwind Bodywork & Massage | 870 Market Street |  | -23.3 | 323.9 | node/13881307785 | pt |
| shop=mobile_phone | Phone Stop | — |  | -87.9 | 169.9 | node/10019957432 | pt |
| shop=mobile_phone | T-Mobile | 701 Market Street | 0 | 330.6 | 127.3 | node/2338806865 | pt |
| shop=mobile_phone | Verizon | 768 Market Street | 0 | 155.8 | 202.5 | node/2624039710 | pt |
| shop=nutrition_supplements | GNC | 722 Market Street |  | 287.3 | 106.1 | node/9301912406 | pt |
| shop=optician | Herbert Hotel | 161 Powell Street |  | -84.8 | 177.5 | node/973620751 | pt |
| shop=optician | Oliver Peoples | 140 Grant Avenue | 0 | 224.2 | -7.6 | node/10000916362 | pt |
| shop=optician | Optometry | — |  | 165.5 | -273.7 | node/4628353542 | pt |
| shop=optician | Sunglass Hut | — |  | 87.5 | -26.1 | node/10560692297 | pt |
| shop=optician | We Care Optical | — | 0 | -262.6 | 110.9 | node/9553542986 | pt |
| shop=outdoor | Last Minute Gear | 563 Sutter Street |  | -158.0 | -144.8 | node/9536447498 | pt |
| shop=pastry | One65 Patisserie & Boutique | 165 O'Farrell Street | 0 | -14.7 | 172.4 | node/9842796001 | pt |
| shop=pawnbroker | Maxferd Jewelry and Company | 200 Sutter Street |  | 338.5 | -172.0 | node/4631802350 | pt |
| shop=perfumery | Diptyque' | 73 Geary Street |  | 246.4 | 68.1 | node/10981409298 | pt |
| shop=shoe_repair | Mak & Co. | 237 Kearny Street |  | 338.7 | -211.3 | node/9943927507 | pt |
| shop=shoe_repair | Shoe & Bag Repair | — |  | 63.3 | -242.1 | node/3393364627 | pt |
| shop=shoes | Allen Edmonds | 310 Sutter Street |  | 188.2 | -168.4 | node/3408867477 | pt |
| shop=shoes | Golden Goose | 30 Geary Street |  | 298.1 | 39.6 | node/10981409303 | pt |
| shop=shoes | John Fluevog | — |  | 149.7 | -125.8 | node/1831748682 | pt |
| shop=shoes | Journeys | — |  | -58.7 | 102.0 | node/9998816028 | pt |
| shop=shoes | Nobel Shoes | 330 Sutter Street |  | 165.1 | -171.1 | node/3408868359 | pt |
| shop=shoes | Salvatore Ferragamo | 236 Post Street |  | 157.9 | -66.3 | node/4625205005 | pt |
| shop=shoes | Shoe Palace | 333 Geary Street | 0 | -89.7 | 64.5 | node/725100771 | pt |
| shop=shoes | Skechers | 101 Powell Street | 0 | -86.3 | 243.7 | node/1674110551 | pt |
| shop=shoes | UGG | — |  | -87.1 | 118.2 | node/4628496727 | pt |
| shop=skate | Everyday Skate Shop | — |  | 331.2 | 41.2 | node/9968882279 | pt |
| shop=supermarket | Trader Joe's | 10 4th Street | -1 | 118.8 | 304.8 | node/4704557447 | pt |
| shop=tailor | HB Alterations | — | 1 | 323.5 | -172.9 | node/10538290179 | pt |
| shop=tailor | Noori Stitch | — | 2 | -85.9 | -110.9 | node/9827317049 | pt |
| shop=tattoo | Moth & Dagger Tattoo | 610 Bush Street | 0 | 50.8 | -272.1 | node/3393384948 | pt |
| shop=ticket | Toni Rembe Theater Box Office | 415 Geary Street |  | -247.5 | 64.2 | node/11450088076 | pt |
| shop=tobacco | Dean's Fine Cigars | — | 0 | 299.8 | 147.8 | node/9301912408 | pt |
| shop=tobacco | Vapor Smoke Shop | 435 Stockton Street |  | 63.3 | -227.5 | node/3393360121 | pt |
| shop=toys | Just for Fun | 45 Kearny Street |  | 338.2 | -5.4 | node/9546618837 | pt |
| shop=vacuum_cleaner | Dyson | 285 Geary Street |  | -47.0 | 65.2 | node/9901000605 | pt |
| shop=video_games | Nintendo SAN FRANCISCO | 331 Powell Street | 0 | -89.3 | 35.8 | node/12850136757 | pt |
| shop=watches | Breitling | — | 0 | 88.0 | -41.0 | node/4625205164 | pt |
| shop=watches | Omega | — |  | 180.6 | 67.4 | node/10000786537 | pt |
| shop=watches | Patek Philippe | 259 Post Street |  | 107.8 | -40.0 | node/9536565416 | pt |
| shop=watches | Rolex | 255 Post Street |  | 122.0 | -39.1 | node/4625203721 | pt |
| shop=watches | Seregin's Fine Timepieces | — | 0 | -239.7 | 107.4 | node/9553542989 | pt |
| shop=yes | Art & Craft Workshops | 209 Kearny Street |  | 339.4 | -178.6 | node/12101392210 | pt |
| shop=yes | Robert Paul | 224 Grant Avenue |  | 226.6 | -97.8 | node/4631729491 | pt |
| tourism=artwork | Butterflight | — |  | -50.3 | 33.3 | node/12940072477 | pt |
| tourism=artwork | Climate change is real | — |  | -202.5 | -1.3 | node/6959502925 | pt |
| tourism=artwork | Confluence | — |  | -204.8 | -42.3 | node/6488849506 | pt |
| tourism=artwork | Convergence: Commute Patterns | — |  | 36.4 | 34.1 | node/10802402429 | pt |
| tourism=artwork | Goddess of Victory | — |  | -0.0 | 0.1 | node/11699339397 | pt |
| tourism=artwork | Labyrinthine Heart | — |  | 52.3 | 31.8 | node/10982692520 | pt |
| tourism=artwork | Lightfold | — |  | 300.9 | 68.0 | node/3274030861 | pt |
| tourism=artwork | Skyward | — |  | -181.1 | -42.7 | node/6488849508 | pt |
| tourism=attraction | Dragon Gate | 401 Grant Avenue |  | 216.9 | -274.0 | node/65328703 | pt |
| tourism=gallery | Art Thou Gallery | — |  | -162.4 | 68.4 | node/13986477183 | pt |
| tourism=gallery | Caldwell Synder Gallery | 341 Sutter Street |  | 158.2 | -128.9 | way/172250597 | area |
| tourism=gallery | Chloe Gallery | — |  | -127.6 | -64.3 | node/10239425288 | pt |
| tourism=gallery | Fraenkel Gallery | 49 Geary Street |  | 276.8 | 66.7 | node/12863098201 | pt |
| tourism=gallery | Gallery 444 | 444 Post Street |  | -136.9 | -64.4 | node/4628571737 | pt |
| tourism=gallery | Gallery Paule Anglim | 14 Geary Street |  | 315.3 | 36.5 | node/2627794649 | pt |
| tourism=gallery | Gefen Gallery | — |  | 200.1 | -115.0 | node/9590578299 | pt |
| tourism=gallery | Montague Gallery | 445 Sutter Street |  | -10.3 | -143.9 | node/9339899671 | pt |
| tourism=gallery | Serge Sorokko Gallery | 365 Grant Avenue |  | 198.7 | -239.0 | node/9544205106 | pt |
| tourism=gallery | Sin Titulo | 418 Sutter Street |  | 37.7 | -168.2 | node/9339899670 | pt |
| tourism=gallery | Speciality Shops Art Gallery | 251 Post Street |  | 136.2 | -42.3 | node/4625205008 | pt |
| tourism=gallery | tiat | 151 Powell Street |  | -84.4 | 182.0 | node/13702829029 | pt |
| tourism=gallery | Wessling Contemporary | 39 Grant Avenue |  | 197.4 | 103.3 | node/1543815833 | pt |
| tourism=hostel | Backpackers Hostel Union Square | — |  | -316.2 | 12.7 | node/1205027802 | pt |
| tourism=hostel | Found | 140 Mason Street |  | -197.8 | 310.0 | way/225599508 | area |
| tourism=hostel | Hi Hostel Downtown | 312 Mason Street |  | -203.0 | 129.2 | node/1101748130 | pt |
| tourism=hostel | The Urban Hotel | — |  | 189.8 | -249.3 | node/11977464170 | pt |
| tourism=hotel | Axiom Hotel | — |  | -110.1 | 323.8 | way/256037015 | area |
| tourism=hotel | Beacon Grand | 450 Powell Street |  | -46.4 | -125.1 | way/32863429 | area |
| tourism=hotel | Beresford Hotel | 635 Sutter Street |  | -277.6 | -129.6 | way/48995277 | area |
| tourism=hotel | Chancellor Hotel | 433 Powell Street |  | -96.2 | -97.4 | way/79375215 | area |
| tourism=hotel | CitizenM Union Square | 72 Ellis Street |  | -34.2 | 235.2 | way/941560578 | area |
| tourism=hotel | Columbia Hotel | — |  | -388.0 | 177.5 | way/260126026 | area |
| tourism=hotel | Cornell Hotel de France | 715 Bush Street |  | -103.6 | -236.6 | way/256733818 | area |
| tourism=hotel | Executive Hotel Vintage Court | 650 Bush Street |  | -6.1 | -285.8 | way/260175869 | area |
| tourism=hotel | Four Seasons | 757 Market Street |  | 249.9 | 233.9 | way/149332498 | area |
| tourism=hotel | Galleria Park Hotel | 191 Sutter Street |  | 378.2 | -126.0 | way/132125160 | area |
| tourism=hotel | Golden Gate Hotel | 775 Bush Street |  | -177.7 | -241.0 | way/256733822 | area |
| tourism=hotel | Grand Hyatt San Francisco | 345 Stockton Street |  | 45.7 | -126.3 | way/32863494 | area |
| tourism=hotel | Handlery Union Square Hotel | 351 Geary Street | 0 | -149.6 | 63.4 | node/2499498547 | pt |
| tourism=hotel | Hilton | 333 O'Farrell Street |  | -293.1 | 208.3 | relation/9737061 | area |
| tourism=hotel | Hilton San Francisco Union Square | 333 O'Farrell Street |  | -293.1 | 208.3 | way/700791868 | area |
| tourism=hotel | Holiday Inn Express | 235 O'Farrell Street |  | -131.3 | 176.4 | node/11705906477 | pt |
| tourism=hotel | Hotel 32one | 321;323 Grant Avenue |  | 192.6 | -199.1 | way/135232161 | area |
| tourism=hotel | Hotel Abri | 127 Ellis Street |  | -122.9 | 288.3 | node/769361407 | pt |
| tourism=hotel | Hotel Astoria | — |  | 192.2 | -272.6 | node/4628353541 | pt |
| tourism=hotel | Hotel Cartwright | 524 Sutter Street |  | -119.0 | -188.8 | way/256733824 | area |
| tourism=hotel | Hotel Des Arts | 447 Bush Street |  | 278.0 | -232.4 | way/474341709 | area |
| tourism=hotel | Hotel Diva | 436;438;440;442 Geary Street |  | -282.2 | 20.1 | way/35024376 | area |
| tourism=hotel | Hotel Emblem San Francisco | 562 Sutter Street |  | -173.9 | -189.2 | way/256733832 | area |
| tourism=hotel | Hotel Fusion | — |  | -124.4 | 228.3 | way/147689070 | area |
| tourism=hotel | Hotel G | 386 Geary Street |  | -196.3 | 31.5 | way/332375981 | area |
| tourism=hotel | Hotel Ikon | 323;325;333 Sutter Street |  | 169.6 | -127.4 | way/172250618 | area |
| tourism=hotel | Hotel Nikko San Francisco | 222 Mason Street |  | -190.1 | 203.1 | way/50832129 | area |
| tourism=hotel | Hotel Spero | 401;403 Taylor Street |  | -395.2 | 136.5 | way/71504456 | area |
| tourism=hotel | Hotel Stratford | 236;240;242 Powell Street |  | -50.1 | 97.4 | way/35174694 | area |
| tourism=hotel | Hotel Triton | 342 Grant Avenue |  | 232.4 | -232.4 | way/135174116 | area |
| tourism=hotel | Hotel Union Square | — |  | -57.6 | 230.8 | node/924624361 | pt |
| tourism=hotel | Hotel Zelos San Francisco | 12 4th Street |  | 128.0 | 318.9 | node/3396652935 | pt |
| tourism=hotel | Hotel Zeppelin San Francisco | 545 Post Street |  | -281.3 | -22.5 | way/35024369 | area |
| tourism=hotel | Hyatt Regency San Francisco Downtown SOMA | 50 3rd Street |  | 359.7 | 213.5 | way/118480404 | area |
| tourism=hotel | JW Marriott | 515 Mason Street |  | -250.8 | -84.0 | way/35537021 | area |
| tourism=hotel | Kensington Park Hotel | 450;452;454;456;460 Post Street |  | -153.2 | -83.8 | way/79375211 | area |
| tourism=hotel | King George Hotel | 334 Mason Street |  | -186.2 | 100.9 | way/151184973 | area |
| tourism=hotel | Marines' Memorial Club & Hotel | — |  | -242.5 | -124.9 | way/48995278 | area |
| tourism=hotel | Mystic Hotel | 417 Stockton Street |  | 42.4 | -202.9 | way/256499440 | area |
| tourism=hotel | Orchard Garden Hotel | 466 Bush Street |  | 250.0 | -289.4 | way/260279404 | area |
| tourism=hotel | Orchard Hotel | 665 Bush Street |  | -33.6 | -241.5 | way/256499427 | area |
| tourism=hotel | Parc 55 San Francisco - a Hilton Hotel | 55 Cyril Magnin Street |  | -181.0 | 311.9 | way/288512967 | area |
| tourism=hotel | Petite Auberge | 863 Bush Street |  | -310.3 | -234.2 | way/135620225 | area |
| tourism=hotel | Post Hotel | 589 Post Street |  | -342.1 | -31.9 | way/1261984861 | area |
| tourism=hotel | San Francisco Marriott Marquis | 780 Mission Street |  | 221.5 | 330.2 | relation/6483285 | area |
| tourism=hotel | San Francisco Marriott Union Square | 480 Sutter Street |  | -41.6 | -178.7 | way/32946774 | area |
| tourism=hotel | St. Moritz Hotel | 180;184;188;190 O'Farrell Street |  | -45.0 | 135.1 | way/35174698 | area |
| tourism=hotel | Taj Campton Place Hotel | 340 Stockton Street |  | 101.4 | -121.2 | way/35536860 | area |
| tourism=hotel | The Barnes San Francisco, Tapestry Collection by Hilton | 225 Powell Street |  | -103.6 | 124.1 | way/35024381 | area |
| tourism=hotel | The Bartlett Hotel and Guesthouse | 238;240;242 O'Farrell Street |  | -132.8 | 126.2 | way/35024383 | area |
| tourism=hotel | The Clift Royal Sonesta San Francisco | 495 Geary Street |  | -336.1 | 82.0 | way/71504442 | area |
| tourism=hotel | The Donatello | 501 Post Street |  | -251.0 | -29.5 | way/35024370 | area |
| tourism=hotel | The Grant Hotel | 753 Bush Street |  | -145.8 | -233.0 | way/256733831 | area |
| tourism=hotel | The Handlery Union Square Hotel | — |  | -153.2 | 130.3 | way/151184978 | area |
| tourism=hotel | The Inn at Union Square San Francisco | 440 Post Street |  | -129.5 | -83.7 | way/929589610 | area |
| tourism=hotel | The Mosser | 54 4th Street |  | 152.2 | 369.0 | way/35174699 | area |
| tourism=hotel | The Touchstone Hotel | 480 Geary Street |  | -327.0 | 30.9 | way/71504459 | area |
| tourism=hotel | The Westin St. Francis | 335 Powell Street |  | -127.2 | -1.4 | way/332378158 | area |
| tourism=hotel | Union Square Plaza Hotel | 432 Geary Street |  | -261.8 | 31.1 | way/35024377 | area |
| tourism=hotel | Warwick San Francisco | 490;498 Geary Street |  | -348.6 | 30.9 | way/71504455 | area |
| tourism=hotel | White Swan Inn | 845 Bush Street |  | -293.1 | -237.4 | way/135620221 | area |
| tourism=hotel | WorldMark San Francisco | 590 Bush Street |  | 96.7 | -283.1 | way/260183842 | area |
| tourism=information | Macy's San Francisco Visitor Information Desk | — | -1 | -1.4 | 131.5 | node/4556399234 | pt |
