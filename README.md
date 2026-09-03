# fable51-worlds

**Worlds via code.** Explorable, browser-native reconstructions of real places — researched, modelled, and quality-checked end to end by autonomous [Claude Fable 5.1](https://www.anthropic.com/claude/fable) agent swarms, then shipped as plain [Three.js](https://threejs.org) apps you can run with `npm run dev`.

No game engine. No proprietary 3D tiles. Every building, storefront, sign, tree and traffic light is generated from open data and public reference imagery by code that lives in this repo.

---

## Worlds

### 🌉 [Union Square, San Francisco](union-square-sf/)

<a href="union-square-sf/media/union-square-walkthrough.mp4"><img src="union-square-sf/media/preview.gif" width="100%" alt="Union Square walkthrough: aerial sweep, Dewey Monument, Nintendo SAN FRANCISCO, Apple Union Square"></a>

<sub>▶ [Watch the full 59-second walkthrough](union-square-sf/media/union-square-walkthrough.mp4) · 1920×1080 · aerial, plaza, Nintendo, lower level, Apple</sub>

The square and its surrounding blocks — Powell, Geary, Post and Stockton — on real terrain and a real street grid, with 129 identified storefronts, working traffic lights and cable cars, day/sunset/night, and two explorable interiors: **Apple Union Square** (300 Post St) and **Nintendo SAN FRANCISCO** (331 Powell St).

| | |
|---|---|
| **Run it** | `cd union-square-sf && npm install && npm run dev` |
| **Buildings** | 453 OSM footprints · 75 hand-authored façades · 129 named storefronts |
| **Life** | 220 pedestrians on a 1,398-node nav graph · 109 vehicles incl. Powell St cable cars |
| **Interiors** | Apple + Nintendo, 23 interactive objects |
| **Validation** | 34 camera-matched viewpoints vs. real photographs · 147 comparison sheets · 9 independent reviewer reports |

### ⛩️ [Higashiyama, Kyoto](kyoto-higashiyama/)

<a href="kyoto-higashiyama/media/kyoto-higashiyama-walkthrough.mp4"><img src="kyoto-higashiyama/media/preview.gif" width="100%" alt="Higashiyama walkthrough: the Yasaka Pagoda revealed at the end of Yasaka-dori"></a>

<sub>▶ [Watch the full 54-second walkthrough](kyoto-higashiyama/media/kyoto-higashiyama-walkthrough.mp4) · 1920×1080 · seven scenes — over the roofs, the Shirakawa, Yasaka Shrine, the weeping cherry, the Yasaka Pagoda, Sannenzaka, and Kiyomizu-dera at sunset</sub>

Kyoto's Southern Higashiyama walking route — **Gion → Hanamikoji → Yasaka Shrine → Nene-no-michi → the Yasaka Pagoda → Ninenzaka → Sannenzaka → Kiyomizu-zaka → Kiyomizu-dera** — 2.3 km of it, continuously walkable, climbing 76 m from the ochaya on Hanamikoji to the temple stage. Rendered **3D-to-2D as a hand-painted anime background**: cel materials with hue-shifted shadow bands, screen-space ink taken from a second difference of depth, and a split-tone grade. **No binary assets at all** — every sign, noren, lantern, roof tile and paving stone is drawn with Canvas2D at start-up.

| | |
|---|---|
| **Run it** | `cd kyoto-higashiyama && npm install && npm run dev` |
| **Or, with nothing installed** | `npm run viewer && open viewer/higashiyama.html` — one self-contained HTML file |
| **Buildings** | 266 buildings · 471 shopfronts · 19 hero landmarks across 15 districts |
| **Detail** | 1,938 trees (11 species) · 3,076 props (60 kinds) · 142 interactions |
| **Survey** | Every elevation an independent GSI 1 m LiDAR query; street widths ray-cast to OSM footprints every 8 m |
| **Validation** | 52 authored viewpoints · full-route player walkthrough · per-street passability sweep · zero page errors |

Six widely-repeated figures were overturned by the survey and the world is built on the measured ones — the Yasaka Pagoda is **38.79 m, not 46**, with a *convex* taper; the Kiyomizu stage deck is at **115.5 m ASL, not 240**; the stage is **21.8 × 9.6 m on 168 pillars of 0.64 m diameter**, not 18 × 10 m on 139 pillars of 2 m.

More worlds coming.

---

## How these are made

Each world follows the same pipeline, and every stage is in the repo so you can re-run it:

1. **Reconnaissance** — parallel research agents pull OpenStreetMap geometry, USGS elevation, transit and street specs, and a storefront census with per-fact sources and confidence levels.
2. **Offline asset generation** — Blender-as-a-library (`bpy`) scripts emit optimised GLB kits: façade modules, street furniture, vehicles, vegetation, retail fixtures, pedestrian body parts.
3. **Runtime** — a pure Three.js app assembles terrain, streets, façades, props, crowds and traffic from JSON specs.
4. **Camera-match QA** — Playwright drives the real app, screenshots fixed viewpoints, and diffs them against free-licensed photographs taken from the same spot; independent reviewer agents (architect, geographer, technical artist, interaction) file reports that drive the next fix cycle.

## License

Code and generated assets: [MIT](LICENSE). Geometry is derived from [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL) and USGS 3DEP (public domain). Reference photographs are not redistributed here — their provenance is recorded per sector in each world's `refs/*/SOURCES.md`. Brand names and logos identify the real businesses at their real locations and belong to their owners.
