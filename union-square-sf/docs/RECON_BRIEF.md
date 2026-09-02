# Union Square Digital Twin — Reconnaissance Brief (shared by all research agents)

## Goal
Reconstruct San Francisco Union Square (bounded by Geary St S, Powell St W, Post St N, Stockton St E)
plus the surrounding blocks, as a Three.js walkable digital twin. Research must be grounded in real,
current (2025–2026) sources. TODAY IS 2026-09-01.

## Conventions (MANDATORY)
- Coordinates: WGS84 decimal degrees, 6 decimals. (lat, lon). Example: 37.787994, -122.407437
- Units: meters. Heights = meters above street level unless noted. Storefront widths = meters.
- Every fact gets: `confidence: high|medium|low` and `source: <url or description>`.
- If uncertain, SAY SO. Never invent a business. Mark unknown storefronts as `UNRESOLVED`.
- Cite the year of each source (Street View imagery date, article date). Prefer 2024–2026 sources.
- SF street numbering: Post/Geary/Sutter/O'Farrell numbers increase WESTWARD from Market St
  (Stockton ≈ 300 block of Post, Powell ≈ 400 block). Powell/Stockton numbers increase NORTHWARD from Market.
- Use WebSearch + WebFetch only. Do NOT use the Chrome browser tools (they are reserved for the orchestrator).
- Free-licensed images (Wikimedia Commons, Flickr CC, official press kits) may be downloaded with curl into
  `refs/<agent-name>/` (keep < 25 files, each < 3MB, jpg/png). Record the license/source in a `SOURCES.md` there.
  Do NOT download Google Street View / Google Earth imagery.
- Deliverables go ONLY to the paths named in your task. Do not touch other files.
- Keep prose tight; JSON is the primary deliverable. Do not exceed your token budget.

## Known anchors (verify, do not assume)
- Dewey Monument: center of Union Square plaza, ~29.6 m tall column topped by Victory statue.
- Apple Union Square: 300 Post St (Post & Stockton, NE corner of square). Opened 2016. Foster + Partners.
- Nintendo SAN FRANCISCO: 331 Powell St (Powell & Geary), opened May 2025. In the Westin St. Francis building ground floor.
- Westin St. Francis: 335 Powell St, whole west side of the square between Geary and Post; 1904 main building + 1972 tower behind.
- Macy's Union Square: 170 O'Farrell St, south of Geary (Stockton–Powell block). NOTE: news in 2024–2025 about Macy's SF closure plans — verify status as of 2026.
- Neiman Marcus: 150 Stockton St (Stockton & Geary, SE).
- Saks Fifth Avenue: 384 Post St (Post & Powell, NW). Verify current status (Saks Global restructuring 2025).
- Tiffany & Co: 350 Post St.
- Powell St cable cars (Powell-Mason & Powell-Hyde) run along Powell past the square.
- Union Square garage entrances: on Geary and Post sides (verify).
