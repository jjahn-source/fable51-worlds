# Reference viewpoints — Union Square digital twin

Source of truth: `src/data/recon/viewpoints.json` (34 entries: 28 with free-licensed photos in `refs/viewpoints/`, 6 defined without a photo). Photo licences are listed in `refs/viewpoints/SOURCES.md`. Camera values are estimates from reading each photo against the street grid (grid north = 351°, Geary/Post eastward = 81°); heights are eye height above the local ground (plaza level where the camera is on the plaza).

Coverage of the required list: 1 aerial-from-south (vp01, vp29, vp26 night), 2 elevated N/W (vp27 from NE; west variant vp31 has no photo), 3 plaza N (vp03), 4 plaza S (vp04/vp09; centre-axis vp34 no photo), 5 plaza W (vp05), 6 plaza E (vp06/vp07), 7 SW->NE (vp22, vp07), 8 NW->SE (vp08), 9 NE->SW (vp30 no photo), 10 SE->NW (vp10), 11 Apple frontal (vp11 no photo), 12 Apple plaza (vp12), 13 Nintendo (vp13, vp20), 14 Westin (vp05, vp14), 15 Powell N (vp15), 16 Powell S (vp16), 17 Geary E (vp17), 18 Post W (vp18), 19 Post & Stockton (vp28 is Post & Powell; vp19 Stockton N; vp32 no photo), 20 Powell & Geary (vp20), 21 Dewey (vp21 top, vp10 base), 22 Geary stairs (vp22 oblique; vp33 no photo), 23 Macy's (vp23, vp04), 24 Neiman (vp24), 25 Maiden Lane (vp25), 26 night (vp26, vp29 dusk). vp02 is misfiled (Stockton & Ellis, 2005) and should not be used for facades.

| id | title | photo | year | camera (lat, lon, h m, hdg°, pitch°) | validates | conf |
|---|---|---|---|---|---|---|
| vp01 | Elevated view from Macy's roof terrace looking north over the plaza | yes | 2018 | 37.78718, -122.40762, 30, 355, -16 | Whole-plaza layout, Post St frontage ordering (Saks-Tiffany-W-S-Apple) and relative heights, Grand Hyatt placement, plaza paving pattern | high |
| vp02 | MISFILED: old Apple Store (1 Stockton) at Stockton & Ellis, elevated (2005) | yes | 2005 | 37.78545, -122.4064, 20, 225, -45 | Nothing in the core model; road-marking style only | low |
| vp03 | Plaza centre (SW of monument) looking north to Post St | yes | 2017 | 37.78778, -122.40768, 1.7, 8, 5 | North frontage massing and the stage canopy position; Saks vs Williams-Sonoma heights; 450 Sutter skyline | high |
| vp04 | Plaza south edge looking south at Macy's Geary facade (2020) | yes | 2020 | 37.7875, -122.40758, 1.7, 171, 5 | Macy's Geary facade proportions (glass bay count, pier widths), Geary stair/railing geometry, plaza-to-street level difference | high |
| vp05 | Plaza looking west at the Westin St. Francis Powell facade | yes | 2023 | 37.78792, -122.40775, 1.7, 261, 12 | Westin wing rhythm and tower setback, kiosk positions on the Powell edge, palm placement | high |
| vp06 | Plaza NW quadrant looking east-southeast (Grand Hyatt, Neiman Marcus, Macy's) | yes | 2025 | 37.78808, -122.40782, 1.7, 110, 12 | Relative placement of Grand Hyatt / Whittell / Neiman / Macy's around the SE; monument height vs surroundings; 2025 plaza furniture | medium |
| vp07 | Plaza west side looking east across the plaza (2017) | yes | 2017 | 37.78795, -122.408, 1.7, 100, 3 | East frontage massing (Stockton side), monument shaft proportions, west-side step geometry | medium |
| vp08 | Plaza NW quadrant looking south-east: monument, Macy's, Neiman Marcus (2022) | yes | 2022 | 37.78808, -122.4077, 1.7, 135, 8 | NW-corner diagonal composition; Macy's/Neiman/Whittell relative heights; plaza light-pylon style | high |
| vp09 | Plaza north side looking south-southeast to Macy's (2012) | yes | 2012 | 37.78815, -122.4076, 1.7, 155, 6 | South frontage from the plaza; monument base detailing; cafe furniture era | high |
| vp10 | Plaza SE quadrant looking north-west: monument base, Saks, Tiffany (holiday rink, 2019) | yes | 2019 | 37.78782, -122.40735, 1.7, 330, 20 | Monument base geometry/inscriptions; Saks corner and Drake crown alignment; NW corner from the SE | high |
| vp12 | Apple Union Square rear plaza and Ruth Asawa fountain from across Stockton (elevated, 2018) | yes | 2018 | 37.7884, -122.40672, 10, 275, -25 | Apple plaza footprint, stair/fountain position, green-wall height, Stockton curb line | high |
| vp13 | Nintendo SAN FRANCISCO frontal at Powell & Geary (opening day, 2025) | yes | 2025 | 37.7875, -122.40822, 1.7, 245, 8 | Nintendo storefront bay widths and signage, Westin corner treatment, Elkan Gunst corner geometry | high |
| vp14 | Westin St. Francis main entrance from Powell St with cable car (2025) | yes | 2025 | 37.78788, -122.40818, 1.7, 290, 8 | Westin entrance bay, awning rhythm, Powell St grade and track alignment | high |
| vp15 | Powell St looking north from Geary toward Nob Hill (telephoto, 2015) | yes | 2015 | 37.7875, -122.4082, 3.5, 351, -2 | Powell St gradient profile north of the square; building heights along Powell; cable-car lane markings | high |
| vp16 | Powell St looking south from Post toward Market (2020) | yes | 2020 | 37.78826, -122.4082, 1.7, 171, 0 | Powell St west/east frontage south of Post; bike-kiosk location; grade | high |
| vp17 | Geary St looking east-north-east from Powell across the plaza's SW corner (foggy, 2009) | yes | 2009 | 37.78735, -122.40842, 1.7, 65, 5 | Geary St east vista; SW-corner stair; Whittell placement | medium |
| vp18 | Post St looking west from Stockton toward the Westin (2010) | yes | 2010 | 37.78812, -122.40685, 1.7, 262, 6 | Post St section and vista to the Westin; NE-corner steps; Williams-Sonoma/Saks depths | high |
| vp19 | Stockton St looking north from Geary (2020) | yes | 2020 | 37.7873, -122.40705, 1.7, 351, 2 | Stockton St corridor heights and the tunnel portal; Grand Hyatt bulk | medium |
| vp20 | Powell & Geary intersection with Nintendo SF and cable car (2026) | yes | 2026 | 37.78755, -122.40822, 1.7, 240, 3 | Powell & Geary corner geometry, Nintendo/Westin ground floor as of 2026, cable-car stop location | high |
| vp21 | Dewey Monument capital and Victory statue against the Grand Hyatt (telephoto, 2022) | yes | 2022 | 37.7877, -122.4078, 1.7, 40, 40 | Statue pose/orientation, capital proportions, Grand Hyatt facade grid | high |
| vp22 | From Geary near Powell looking north-east across the plaza (2010) | yes | 2010 | 37.7873, -122.40815, 1.7, 55, 8 | Geary stairs from street level, SE-corner pavilion, diagonal from the SW | medium |
| vp23 | Macy's Geary facade frontal from the plaza's south edge (2010) | yes | 2010 | 37.7875, -122.40756, 1.7, 171, 6 | Macy's curtain-wall bay count, storey heights, pier width, entrance canopy | high |
| vp24 | Neiman Marcus rotunda corner at Stockton & Geary (2020) | yes | 2020 | 37.7873, -122.40722, 1.7, 128, 10 | Neiman Marcus corner geometry, cladding pattern, rotunda glazing height | high |
| vp25 | Maiden Lane from the plaza's east steps across Stockton (2022) | yes | 2022 | 37.7879, -122.40712, 1.7, 81, -3 | Maiden Lane width and corner buildings, Stockton steps, east-edge kiosk positions | high |
| vp26 | Night: Westin, Powell & Geary and plaza from Macy's roof looking north-west (2017) | yes | 2017 | 37.78722, -122.408, 28, 330, -18 | Night lighting: floodlit Westin, plaza lamps, lit signs; SW-corner kiosk; Powell/Geary intersection markings | high |
| vp27 | Aerial from the Grand Hyatt (36th floor) looking south-south-west over the plaza to Macy's (2004) | yes | 2004 | 37.78885, -122.40735, 110, 195, -42 | Plaza plan proportions from above, Macy's roof massing, Stockton/Geary corner radii | medium |
| vp28 | Powell & Post intersection: Saks corner, cable car, Sir Francis Drake tower (2025) | yes | 2025 | 37.78826, -122.40832, 1.7, 30, 15 | Saks corner curvature and height, Drake tower position, Post/Powell crosswalk geometry | high |
| vp29 | Dusk elevated view from Macy's roof looking north (2017) | yes | 2017 | 37.78718, -122.40758, 30, 353, -18 | Night/dusk lighting of the north frontage and Apple; garage entrance location on Geary | high |
| vp11 | Apple Union Square frontal from the plaza's north terrace (Post St) | none | - | 37.78808, -122.40712, 1.7, 351, 8 | Apple Post facade height/width and door module | medium |
| vp30 | NE corner (Stockton & Post) looking south-west into the plaza | none | - | 37.78805, -122.40705, 1.7, 220, 3 | Diagonal NE->SW composition; kiosk and step placement | medium |
| vp31 | Elevated view from the west (Westin tower) looking east over the plaza | none | - | 37.7879, -122.4087, 60, 81, -25 | East frontage roofscape and plaza plan from the west | low |
| vp32 | Post & Stockton intersection from the SE corner looking north-west (Apple corner) | none | - | 37.78805, -122.4068, 1.7, 320, 10 | Post & Stockton corner geometry and Apple's Stockton elevation | medium |
| vp33 | Geary grand stairs frontal from the Geary south sidewalk (Macy's entrance) | none | - | 37.78724, -122.4076, 1.7, 351, 5 | Geary stair width/rise, garage ramp position | medium |
| vp34 | Plaza centre (north of monument) looking south to Macy's | none | - | 37.788, -122.40752, 1.7, 171, 5 | Centre-south axis; Macy's full-width composition | medium |

## Notes for the modelling / validation pass

- Kiosks: cafe kiosk with green umbrellas at the SW corner (vp01, vp05, vp26), 'Bike Rentals & Tours' at the NW end of the Powell edge (vp05, vp16), cafe/pasticceria kiosk at the NE corner (vp07, vp25), TIX half-price-ticket pavilion at the SE corner (vp22, vp25).
- The stage canopy sits on the north (Post) edge, left of the monument axis when viewed from Macy's (vp01, vp03, vp29).
- Level changes: plaza is ~3 m above Geary (vp04, vp23), ~2.5 m above Stockton at Maiden Lane (vp25), roughly level with Powell at the NW corner (vp16).
- Whittell Building (166 Geary, brown brick, pyramidal roof) is the tallest landmark SE of the square and appears in vp06-09, vp17, vp22, vp25.
- Seasonal items seen in photos (ice rink vp10, Christmas tree/menorah vp27, art-fair easels vp03/vp07, opening-day barricades vp13) are not permanent.
- Saks Fifth Avenue windows are papered over in vp28 (2025); Nintendo occupies the Westin's Powell & Geary corner in vp13/vp20 (2025-26).
