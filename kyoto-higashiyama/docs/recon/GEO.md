# GEO.md — Southern Higashiyama Walking Route: Authoritative Spatial Survey

**Agent B — Kyoto Geographer.** Everything downstream (terrain, streets, building placement) is built from these numbers.

- **Geometry**: OpenStreetMap via Overpass API (overpass-api.de), snapshot 2026-09-03T01:0x UTC, ODbL
- **Elevation**: GSI (Geospatial Information Authority of Japan) getelevation API, 1 m airborne-LiDAR DEM (1m レーザ). Bare-earth ground surface.
- **Cross-check**: ja.wikipedia.org articles 法観寺, 清水寺, 八坂神社
- **Generated**: 2026-09-03T01:23:40Z
- **Machine-readable twin**: `src/data/geo.json`

Method: landmark positions come from OpenStreetMap geometry (footprint centroids for buildings, node/way
endpoints for junctions) pulled live from the Overpass API. Every elevation is an independent query against
the GSI 1 m airborne-LiDAR **bare-earth DEM** — not an estimate, not interpolated from contours. Street
face-to-face widths were measured by ray-casting perpendicular from each street centreline to the nearest
OSM building polygon on each side, sampled every 8 m, reported as the median. Where two sources disagreed I
say so and give the reason for the choice.

---

## 0. Three corrections to the brief — read these first

| # | Brief said | Reality | Evidence |
|---|---|---|---|
| 1 | Anchor pagoda at **34.99806, 135.78056** | **34.9985564, 135.7792488** | The brief's point is **186 m ESE** of the pagoda — it sits essentially on the Ninenzaka/Sannenzaka junction. OSM footprint centroid and the ja.wikipedia infobox (34.99855, 135.77924) agree with each other to **0.9 m**. |
| 2 | Gion is **45–50 m** ASL | **~39 m** ASL | GSI 1 m LiDAR: 39.0 m at Shijo×Hanamikoji, 39.0–39.2 m along Shirakawa/Shinbashi. About 8 m lower than assumed. |
| 3 | Kiyomizu-dera stage at **240–250 m** ASL *(brief suspected this was wrong)* | **~115.5 m** ASL | **Your suspicion was correct.** The whole temple lies between 96 m (Otowa falls) and 122 m (Jishu Shrine). 240–250 m is roughly the Higashiyama **ridge behind** the temple, not the temple. |

A fourth, smaller one: Kyoto Tower is **2.47 km** from the stage, not ~3.5 km. The WSW bearing was right.

---

## 1. Anchor and coordinate frame

**World origin (0, 0, 0)** = Yasaka Pagoda (Hokan-ji five-storey pagoda) / 法観寺 五重塔（八坂の塔）

| | |
|---|---|
| Latitude | **34.9985564** N |
| Longitude | **135.7792488** E |
| Ground elevation at base | **61.3 m** ASL |
| Pagoda height | **46 m** (ja.wikipedia 「高さ46メートル」, OSM `height=46`) |
| Top of finial | **107.3 m** ASL |
| Base footprint | **13.23 × 13.02 m**, walls on bearings 87.9° / 178.0° (near-cardinal, rotated ~2° CCW) |
| Provenance | OSM way 371717416 footprint centroid; ja.wikipedia gives 34.99855/135.77924 (0.9 m apart). CONFIRMED HIGH. |

### Axes (Three.js right-handed, y-up)

```
  +X  =  EAST          (metres)
  +Y  =  UP            (metres; use elevation ASL directly, or subtract 61.3 for pagoda-relative)
  +Z  =  SOUTH         (metres)   <-- NORTH IS NEGATIVE Z
```

### Metres per degree at this latitude (φ = 34.9985564°)

```
  m_per_deg_lat = 111132.954 - 559.822*cos(2φ) + 1.175*cos(4φ)   =  110940.557 m/deg
  m_per_deg_lon = 111412.84*cos(φ) - 93.5*cos(3φ) + 0.118*cos(5φ) =  91289.741 m/deg
```

The brief's ~110,940 m/deg for latitude is **right** (110940.557 m/deg).
The brief's cos(35°)×111,320 = **91,188.2** m/deg for longitude is **101.5 m/deg (0.11%) too small** — it
uses a spherical earth. Use the rigorous WGS84 value **91289.741 m/deg**. Over the 1 km east–west span of
this scene the difference is about 1.1 m, which matters for building alignment.

### Conversion

```js
const LAT0 = 34.9985564, LON0 = 135.7792488;
const M_LAT = 110940.557, M_LON = 91289.741;
const x = (lon - LON0) * M_LON;   // +X east
const z = (LAT0 - lat) * M_LAT;   // +Z south  (note the reversed subtraction)
```

### Worked example — Yasaka Shrine West Romon

```
  lat = 35.003741      lon = 135.777526
  Δlon = 135.777526 - 135.7792488 = -0.0017228
  Δlat = 35.003741 - 34.9985564 = 0.0051846

  x = (135.777526 - 135.7792488) × 91289.741  = -0.0017228 × 91289.741 = -157.3 m
  z = (34.9985564 - 35.003741) × 110940.557   = -0.0051846 × 110940.557 = -575.2 m

  => the West Romon is 157.3 m WEST and 575.2 m NORTH of the pagoda.
     Straight-line distance 596.3 m. Sanity check against a map: correct.
```

---

## 2. Landmark table

`x` = metres east of the pagoda, `z` = metres **south** (negative = north). Elevation is GSI bare-earth ground, metres ASL.

| Landmark | 日本語 | Lat | Lon | x (m) | z (m) | Elev (m) | Conf |
|---|---|---:|---:|---:|---:|---:|:--:|
| Shijo-dori x Hanamikoji intersection | 四条通×花見小路 | 35.003781 | 135.775067 | -381.8 | -579.6 | 39.0 | HIGH |
| Hanamikoji north end (at Shijo) | 花見小路 北端 | 35.003837 | 135.775067 | -381.8 | -585.8 | 39.0 | HIGH |
| Hanamikoji south end (Kenninji gate area) | 花見小路 南端(建仁寺) | 35.001468 | 135.774635 | -421.2 | -323.0 | 39.0 | HIGH |
| Shinbashi-dori x Shirakawa (willow corner) | 新橋通×白川 | 35.005726 | 135.774632 | -421.5 | -795.4 | 39.0 | HIGH |
| Shinbashi (bridge over Shirakawa) | 新橋 | 35.005751 | 135.774709 | -414.4 | -798.2 | 37.7 | HIGH |
| Yasaka Shrine West Romon | 八坂神社 西楼門 | 35.003741 | 135.777526 | -157.3 | -575.2 | 44.3 | HIGH |
| Yasaka Shrine Maiden (dance pavilion) | 八坂神社 舞殿 | 35.003392 | 135.778538 | -64.9 | -536.5 | 49.7 | HIGH |
| Yasaka Shrine Honden (main hall) | 八坂神社 本殿 | 35.003645 | 135.778590 | -60.1 | -564.5 | 49.5 | HIGH |
| Yasaka Shrine South Romon | 八坂神社 南楼門 | 35.003089 | 135.778534 | -65.3 | -502.8 | 50.8 | HIGH |
| Stone torii on Shimogawara-dori | 八坂神社 石鳥居 | 35.002769 | 135.778501 | -68.3 | -467.3 | 51.2 | HIGH |
| Maruyama Park centre | 円山公園 | 35.003871 | 135.780764 | 138.3 | -589.6 | 56.7 | HIGH |
| Maruyama weeping cherry (Gion shidarezakura) | 祇園枝垂桜 | 35.003613 | 135.780300 | 96.0 | -561.0 | 58.3 | MED |
| Nene-no-michi north end | ねねの道 北端 | 35.001875 | 135.779983 | 67.0 | -368.2 | 61.2 | MED |
| Nene-no-michi south end | ねねの道 南端 | 34.999264 | 135.779844 | 54.3 | -78.5 | 59.5 | MED |
| Kodai-ji entrance (foot of Daidokoro-zaka) | 高台寺 入口(台所坂下) | 35.000546 | 135.779912 | 60.5 | -220.7 | 57.6 | HIGH |
| Kodai-ji precinct centre | 高台寺 | 35.000323 | 135.781354 | 192.2 | -196.0 | — | MED |
| Ishibe-koji east entrance (from Nene-no-michi) | 石塀小路 東口 | 34.999934 | 135.779880 | 57.6 | -152.8 | 56.5 | MED |
| Ishibe-koji west entrance | 石塀小路 西口 | 34.999962 | 135.779494 | 22.4 | -155.9 | 56.0 | MED |
| Yasaka Pagoda / Hokan-ji five-storey pagoda  [WORLD ORIGIN] | 法観寺 五重塔(八坂の塔) | 34.998556 | 135.779249 | 0.0 | 0.0 | 61.3 | HIGH |
| Yasaka-dori west end (at Higashioji) | 八坂通 西端 | 34.998705 | 135.777190 | -187.9 | -16.5 | 50.6 | HIGH |
| Yasaka-dori east end (at pagoda) | 八坂通 東端 | 34.998546 | 135.779025 | -20.4 | 1.2 | 59.8 | HIGH |
| Ninenzaka north end | 二年坂 北端 | 34.999268 | 135.780704 | 132.8 | -78.9 | 63.3 | HIGH |
| Ninenzaka south end (= Sannenzaka north end) | 二年坂 南端 | 34.997998 | 135.780804 | 142.0 | 61.9 | 69.7 | HIGH |
| Sannenzaka bottom (north, at Ninenzaka) | 産寧坂 下(北) | 34.997998 | 135.780804 | 142.0 | 61.9 | 69.7 | HIGH |
| Sannenzaka stone steps - base (north foot) | 産寧坂 石段下 | 34.996474 | 135.780945 | 154.8 | 231.0 | 75.4 | HIGH |
| Sannenzaka top (head of stone steps, at Kiyomizu-zaka) | 産寧坂 上(南) | 34.996209 | 135.780808 | 142.3 | 260.4 | 81.4 | HIGH |
| Kiyomizu-zaka / Sannenzaka / Gojo-zaka fork | 清水坂 分岐 | 34.996201 | 135.780726 | 134.9 | 261.3 | 81.1 | HIGH |
| Kiyomizu-zaka bottom (Higashioji-dori end) | 清水道 東大路口 | 34.997633 | 135.777004 | -204.9 | 102.4 | 51.7 | HIGH |
| Kiyomizu-zaka top (temple forecourt) | 清水坂 上 | 34.995513 | 135.782917 | 334.9 | 337.6 | 98.1 | HIGH |
| Higashioji-dori x Shijo-dori (Gion crossing) | 東大路通×四条通 | 35.003749 | 135.777193 | -187.7 | -576.1 | 41.3 | HIGH |
| Kiyomizu-dera Niomon (Deva gate) | 清水寺 仁王門 | 34.995428 | 135.783339 | 373.4 | 347.1 | 104.5 | HIGH |
| Kiyomizu-dera Saimon (west gate) | 清水寺 西門 | 34.995144 | 135.783606 | 397.8 | 378.6 | 111.8 | HIGH |
| Kiyomizu-dera three-storey pagoda | 清水寺 三重塔 | 34.995063 | 135.783837 | 418.9 | 387.6 | 112.2 | HIGH |
| Kiyomizu-dera Todoroki-mon (middle gate) | 清水寺 轟門 | 34.994773 | 135.784460 | 475.7 | 419.7 | 114.9 | HIGH |
| Kiyomizu-dera Hondo (main hall) | 清水寺 本堂 | 34.994783 | 135.784944 | 519.9 | 418.6 | 115.5 | HIGH |
| Kiyomizu-dera stage (butai) | 清水寺 舞台 | 34.994666 | 135.785037 | 528.4 | 431.6 | 102.8 | HIGH |
| Kiyomizu-dera Okunoin | 清水寺 奥ノ院 | 34.994573 | 135.785574 | 577.4 | 441.9 | 116.3 | HIGH |
| Otowa-no-taki (Otowa waterfall) | 音羽の滝 | 34.994421 | 135.785251 | 547.9 | 458.8 | 96.0 | HIGH |
| Koyasu-no-to (Koyasu pagoda) | 子安塔 | 34.992925 | 135.784958 | 521.2 | 624.8 | 116.6 | HIGH |
| Jishu Shrine (above the Hondo) | 地主神社 | 34.995173 | 135.784964 | 521.7 | 375.4 | 122.4 | HIGH |
| Chawan-zaka west end (Higashioji side) | 茶わん坂 西端 | 34.995240 | 135.778109 | -104.1 | 367.9 | 59.5 | HIGH |
| Chawan-zaka east end | 茶わん坂 東端 | 34.995017 | 135.782559 | 302.2 | 392.7 | 85.3 | HIGH |

### Notes on individual landmarks

- **Stone torii on Shimogawara-dori** — 13.5 m span, ~9.5 m tall (MED) *(source: OSM way 455316060; built 1646)*
- **Maruyama weeping cherry (Gion shidarezakura)** — Position from OSM only *(source: OSM node 4517278152 (natural=tree, named 枝垂桜))*
- **Nene-no-michi north end** — Junction with E-W link to Maruyama *(source: OSM way 30882780 north terminus)*
- **Nene-no-michi south end** — Meets Ninenzaka link + Yasaka-dori approach *(source: OSM way 30882780 south terminus)*
- **Kodai-ji precinct centre** — Elevation not sampled at centroid *(source: OSM way 759391880 centroid)*
- **Ishibe-koji east entrance (from Nene-no-michi)** — OSM maps only a 35 m stub of the alley *(source: OSM way 526198278 east end)*
- **Ishibe-koji west entrance** — Real alley is L-shaped and longer than OSM shows *(source: OSM way 526198278 west end)*
- **Yasaka Pagoda / Hokan-ji five-storey pagoda  [WORLD ORIGIN]** — 46 m tall, 13.23 x 13.02 m base, rebuilt 1440 *(source: OSM way 371717416 centroid; ja.wikipedia 34.99855/135.77924 (agree to 0.9 m))*
- **Kiyomizu-dera Hondo (main hall)** — DEM = terrace/platform level *(source: OSM way 102164590; ja.wikipedia 間口36m 奥行31m)*
- **Kiyomizu-dera stage (butai)** — Stage FLOOR is ~115.5 m; see stage section *(source: OSM way 340294693; GSI DEM = BARE GROUND under the stage)*

---

## 3. Elevation profile

Canonical walk: **Shijo×Hanamikoji → Shijo-dori east → Yasaka West Romon → Maiden → Maruyama Park →
Nene-no-michi → Ninenzaka → Sannenzaka → Kiyomizu-zaka → Kiyomizu-dera Hondo/stage.** Route polyline stitched
from OSM way geometry, resampled every 20 m, each sample an independent GSI DEM query.

| | |
|---|---|
| Total route length | **2308.7 m** (2.31 km) |
| Start elevation (Shijo×Hanamikoji) | **39.1 m** ASL |
| End elevation (stage deck) | **115.5 m** ASL |
| Net gain | **76.4 m** |
| Cumulative ascent | **101.0 m** |
| Cumulative descent | **24.6 m** |

**So: about 76 m of net climb, 101 m of total up.** The walk is not one continuous ascent — it undulates
through Gion and Maruyama, dips slightly along Nene-no-michi, then climbs hard in three distinct pushes.

### Where the steep parts are

| Chainage (m) | Grade | Where |
|---|---:|---|
| 1800–1840 | **+24 to +25%** | **Sannenzaka stone steps** — the steepest 40 m on the whole route |
| 1620–1640 | **+20%** | **Ninenzaka stepped flight** |
| 2100–2160 | **+13 to +24%** | **Niomon → Saimon → pagoda terrace** at Kiyomizu-dera |
| 900–920 | −15.5% | Descent off the Maruyama Park shoulder toward Nene-no-michi |

### Profile table (every 20 m)

| Cum (m) | Elev (m) | Leg | | Cum (m) | Elev (m) | Leg |
|---:|---:|---|---|---:|---:|---|
| 0 | 39.1 | Shijo-dori (Hanamikoji -> Higashio | | 1180 | 61.2 | Nene-no-michi (N->S) |
| 20 | 39.1 | Shijo-dori (Hanamikoji -> Higashio | | 1200 | 60.3 | Nene-no-michi (N->S) |
| 40 | 39.2 | Shijo-dori (Hanamikoji -> Higashio | | 1220 | 59.7 | Nene-no-michi (N->S) |
| 60 | 39.4 | Shijo-dori (Hanamikoji -> Higashio | | 1240 | 59.1 | Nene-no-michi (N->S) |
| 80 | 39.6 | Shijo-dori (Hanamikoji -> Higashio | | 1260 | 58.1 | Nene-no-michi (N->S) |
| 100 | 39.8 | Shijo-dori (Hanamikoji -> Higashio | | 1280 | 57.3 | Nene-no-michi (N->S) |
| 120 | 40.0 | Shijo-dori (Hanamikoji -> Higashio | | 1300 | 56.8 | Nene-no-michi (N->S) |
| 140 | 40.3 | Shijo-dori (Hanamikoji -> Higashio | | 1320 | 56.6 | Nene-no-michi (N->S) |
| 160 | 40.7 | Shijo-dori (Hanamikoji -> Higashio | | 1340 | 56.5 | Nene-no-michi (N->S) |
| 180 | 41.1 | Shijo-dori (Hanamikoji -> Higashio | | 1360 | 56.6 | Nene-no-michi (N->S) |
| 200 | 41.4 | Higashioji crossing -> Yasaka West | | 1380 | 56.9 | Nene-no-michi (N->S) |
| 220 | 43.9 | Higashioji crossing -> Yasaka West | | 1400 | 57.7 | Nene-no-michi (N->S) |
| 240 | 44.7 | West Romon -> Maiden (precinct) | | 1420 | 59.5 | Nene south end -> Ninenzaka north  |
| 260 | 46.3 | West Romon -> Maiden (precinct) | | 1440 | 60.0 | Nene south end -> Ninenzaka north  |
| 280 | 48.8 | West Romon -> Maiden (precinct) | | 1460 | 61.0 | Nene south end -> Ninenzaka north  |
| 300 | 49.2 | West Romon -> Maiden (precinct) | | 1480 | 62.1 | Nene south end -> Ninenzaka north  |
| 320 | 49.5 | West Romon -> Maiden (precinct) | | 1500 | 63.3 | Ninenzaka |
| 340 | 49.5 | Maiden -> Maruyama Park weeping ch | | 1520 | 61.7 | Ninenzaka |
| 360 | 49.8 | Maiden -> Maruyama Park weeping ch | | 1540 | 61.9 | Ninenzaka |
| 380 | 50.9 | Maiden -> Maruyama Park weeping ch | | 1560 | 62.5 | Ninenzaka |
| 400 | 52.7 | Maiden -> Maruyama Park weeping ch | | 1580 | 62.9 | Ninenzaka |
| 420 | 53.6 | Maiden -> Maruyama Park weeping ch | | 1600 | 63.5 | Ninenzaka |
| 440 | 54.2 | Maiden -> Maruyama Park weeping ch | | 1620 | 65.7 | Ninenzaka |
| 460 | 54.5 | Maiden -> Maruyama Park weeping ch | | 1640 | 69.7 | Ninenzaka |
| 480 | 56.4 | Maiden -> Maruyama Park weeping ch | | 1660 | 71.2 | Sannenzaka |
| 500 | 57.6 | Maruyama Park -> park south exit | | 1680 | 72.8 | Sannenzaka |
| 520 | 57.7 | Maruyama Park -> park south exit | | 1700 | 73.1 | Sannenzaka |
| 540 | 59.2 | Maruyama Park -> park south exit | | 1720 | 72.9 | Sannenzaka |
| 560 | 60.4 | Maruyama Park -> park south exit | | 1740 | 72.5 | Sannenzaka |
| 580 | 62.0 | Park south -> Nene link (E-W) | | 1760 | 71.6 | Sannenzaka |
| 600 | 63.0 | Park south -> Nene link (E-W) | | 1780 | 70.5 | Sannenzaka |
| 620 | 63.4 | Park south -> Nene link (E-W) | | 1800 | 70.5 | Sannenzaka |
| 640 | 63.8 | Park south -> Nene link (E-W) | | 1820 | 75.4 | Sannenzaka |
| 660 | 64.3 | Park south -> Nene link (E-W) | | 1840 | 80.4 | Sannenzaka |
| 680 | 64.7 | Park south -> Nene link (E-W) | | 1860 | 81.7 | Kiyomizu-zaka (upper) |
| 700 | 65.9 | link west to Nene north end | | 1880 | 83.3 | Kiyomizu-zaka (upper) |
| 720 | 67.2 | link west to Nene north end | | 1900 | 84.9 | Kiyomizu-zaka (upper) |
| 740 | 69.1 | link west to Nene north end | | 1920 | 86.3 | Kiyomizu-zaka (upper) |
| 760 | 69.1 | link west to Nene north end | | 1940 | 87.5 | Kiyomizu-zaka (upper) |
| 780 | 70.6 | link west to Nene north end | | 1960 | 88.8 | Kiyomizu-zaka (upper) |
| 800 | 69.7 | link west to Nene north end | | 1980 | 90.9 | Kiyomizu-zaka (upper) |
| 820 | 69.8 | link west to Nene north end | | 2000 | 92.6 | Kiyomizu-zaka (upper) |
| 840 | 72.0 | link west to Nene north end | | 2020 | 94.4 | Kiyomizu-zaka (upper) |
| 860 | 72.4 | link west to Nene north end | | 2040 | 96.0 | Kiyomizu-zaka (upper) |
| 880 | 72.5 | link west to Nene north end | | 2060 | 97.3 | Kiyomizu-zaka (upper) |
| 900 | 74.9 | link west to Nene north end | | 2080 | 98.9 | Kiyomizu-zaka top -> Niomon |
| 920 | 71.8 | link west to Nene north end | | 2100 | 101.1 | Kiyomizu-zaka top -> Niomon |
| 940 | 72.2 | link west to Nene north end | | 2120 | 104.5 | Niomon -> Hondo/Butai |
| 960 | 71.9 | link west to Nene north end | | 2140 | 107.1 | Niomon -> Hondo/Butai |
| 980 | 71.1 | link west to Nene north end | | 2160 | 111.9 | Niomon -> Hondo/Butai |
| 1000 | 70.3 | link west to Nene north end | | 2180 | 112.2 | Niomon -> Hondo/Butai |
| 1020 | 69.2 | link west to Nene north end | | 2200 | 113.2 | Niomon -> Hondo/Butai |
| 1040 | 67.4 | link west to Nene north end | | 2220 | 113.9 | Niomon -> Hondo/Butai |
| 1060 | 65.4 | link west to Nene north end | | 2240 | 115.0 | Niomon -> Hondo/Butai |
| 1080 | 64.0 | link west to Nene north end | | 2260 | 114.9 | Niomon -> Hondo/Butai |
| 1100 | 62.8 | link west to Nene north end | | 2280 | 115.4 | Niomon -> Hondo/Butai |
| 1120 | 61.5 | link west to Nene north end | | 2300 | 115.4 | Niomon -> Hondo/Butai |
| 1140 | 60.9 | Nene-no-michi (N->S) | | 2309 | 115.5 | Niomon -> Hondo/Butai |
| 1160 | 60.6 | Nene-no-michi (N->S) | | | | |

> The final sample is the **stage deck at 115.5 m**. The DEM at that spot reads 102.8 m because it is a
> bare-earth model and correctly returns the ground *underneath* the stage. That 12.7 m gap is the whole point
> of the building — see §7.

### Stepped sections

| | Ninenzaka | Sannenzaka |
|---|---|---|
| Step count | **17** | **46** |
| Source | OSM `step_count=17` (way 30882783) | OSM `step_count=46` (way 179116810) |
| Flight length | 15.9 m | 32.0 m |
| Rise over flight | ~2.5 m | **6.0 m** (81.4 → 75.4 m) |
| Grade on the flight | ~15.7% | **18.8%** |
| Derived tread | ~0.94 m | **0.70 m** |
| Derived riser | ~0.15 m | **0.13 m** |

These are **shallow, long-tread stone steps** — the characteristic Kyoto *slope-stair*, closer to a ramp with
lips than to a staircase. Model them as 0.7–0.9 m treads with 130–150 mm risers, not as standard 300/170 stairs.
The step counts are hard data; the tread/riser split is arithmetic assuming uniform steps and no landings.

**The overall slope names are misleading**: Ninenzaka averages only +4.5% and Sannenzaka +5.4% over their
full lengths, because each is mostly a gentle paved incline with the steps concentrated in a single flight.

---

## 4. Street geometry

Bearing is the walking direction quoted in the name (degrees from north). Grade is positive uphill in that
direction. **Face-to-face** is measured to OSM building polygons; **carriageway** is estimated except where starred.

| Street | 日本語 | Len (m) | Brg° | Grade | Surface | Stepped | Carriageway (m) | Face-to-face (m) | Conf |
|---|---|---:|---:|---:|---|:--:|---:|---:|:--:|
| Shijo-dori (east end: Hanamikoji -> Higashioji) | 四条通 | 194.0 | 92.9 | +1.19% | asphalt | no | 14.0 | 26.9 | HIGH |
| Hanamikoji-dori (Shijo -> Kennin-ji) | 花見小路通 | 267.3 | 188.5 | +0.00% | granite sett / paving stones | no | 5.8 | 9.1 | HIGH |
| Shinbashi-dori (stone-paved, Shirakawa block) | 新橋通 | 160.4 | 95.9 | -0.12% | granite paving stones | no | 4.5 | 6.4 | HIGH |
| Shirakawa-Minami-dori (canal walk) | 白川南通 | 157.7 | 75.0 | -0.13% | paving stones | no | 4.5* | 23.0 | HIGH |
| Higashioji-dori (Shijo -> Yasaka-dori) | 東大路通 | 569.4 | 180.0 | +1.63% | asphalt | no | 14.0 | 20.0 | HIGH |
| Shimogawara-dori (stone torii -> Yasaka-dori) | 下河原通 | 466.3 | 176.9 | +1.37% | paving stones | no | 5.5 | 11.5 | HIGH |
| Nene-no-michi (north -> south) | ねねの道 | 290.6 | 182.5 | -0.58% | granite slab paving | no | 6.5 | 10.4 | MED |
| Ishibe-koji (mapped E-W leg) | 石塀小路 | 35.2 | 275.0 | -1.42% | granite sett | no | 2.8 | 5.3 | LOW |
| Yasaka-dori (the pagoda street) | 八坂通 | 180.4 | 100.3 | +5.10% | granite sett | no | 4.2 | 6.3 | HIGH |
| Ninenzaka | 二年坂 | 143.1 | 176.3 | +4.47% | stone paving + one stepped flight | **17 steps** | 4.0* | 6.1 | HIGH |
| Sannenzaka | 産寧坂/三年坂 | 215.6 | 180.3 | +5.43% | stone paving + one stepped flight | **46 steps** | 4.0* | 7.4 | HIGH |
| Kiyomizu-zaka (lower: Higashioji -> fork) | 清水道 | 373.0 | 115.5 | +7.88% | asphalt | no | 6.0 | 9.4 | HIGH |
| Kiyomizu-zaka (upper: fork -> temple) | 清水坂 | 221.0 | 111.0 | +7.69% | paving stones | no | 5.5 | 7.6 | HIGH |
| Chawan-zaka | 茶わん坂 | 406.1 | 93.5 | +6.35% | asphalt | no | 5.0 | 7.1 | HIGH |
| Pagoda -> Sannenzaka connector | (八坂通東延長) | 173.4 | 106.6 | +5.59% | stone paving | no | 5.0 | 12.4 | MED |

`*` = width from an OSM `width` tag (Shirakawa-Minami 4.5 m, Ninenzaka 4 m, Sannenzaka 4 m). Every other
carriageway figure is my estimate = face-to-face minus 1.5–3 m for eaves, doorsteps and frontage.

### Reading the widths

Face-to-face is **reliable** where machiya line both sides continuously — Hanamikoji 9.1 m, Yasaka-dori 6.3 m,
Ninenzaka 6.1 m, Sannenzaka 7.4 m, Kiyomizu-zaka 7.6 m. These are the numbers to build to.

Face-to-face **overstates** the enclosed corridor wherever one side is open ground with no mapped building:
Shirakawa-Minami-dori (23.0 m — the canal and its willows occupy the north side), Nene-no-michi (10.4 m —
Kodai-ji's wall and grounds on the east), Shimogawara-dori (11.5 m). Treat those as upper bounds.

### Surfaces

- **Asphalt**: Shijo-dori, Higashioji-dori, Kiyomizu-zaka (lower / 清水道), Chawan-zaka.
- **Granite sett** (small squared blocks): Yasaka-dori, Ishibe-koji.
- **Paving stones / stone slab**: Hanamikoji, Shinbashi-dori, Shirakawa-Minami, Shimogawara-dori, Nene-no-michi,
  Ninenzaka, Sannenzaka, Kiyomizu-zaka (upper).

The tonal break to build for is at **Higashioji-dori**: everything west of it is a modern asphalt city, everything
east of it is stone-paved historic-preservation fabric.

---

## 5. The pagoda sightline

**The street is Yasaka-dori (八坂通). You stand WEST of the pagoda and look EAST.**

This is the single most photographed view in Kyoto, and the geometry is unusually clean: Yasaka-dori runs
almost exactly **east–west (bearing 100.3°)** and dead-ends at the pagoda, so the tower sits framed at the end
of a 180 m one-lane corridor of two-storey machiya.

| Viewpoint | x (m) | z (m) | Ground (m) | Dist to base (m) | Camera bearing | Angle to top |
|---|---:|---:|---:|---:|---:|---:|
| Yasaka-dori at Higashioji (west end) | -187.9 | -16.5 | 50.6 | 188.3 | 95.0° | +16.3° |
| Yasaka-dori, 150 m west of pagoda | -115.4 | -7.6 | 52.4 | 115.4 | 93.8° | +24.8° |
| Yasaka-dori, 100 m west of pagoda | -88.7 | -4.6 | 53.0 | 88.6 | 93.0° | +30.7° |
| Yasaka-dori x Shimogawara-dori (classic frame) | -43.6 | -0.7 | 57.8 | 43.5 | 91.0° | +47.7° |
| Yasaka-dori, 60 m west of pagoda | -64.6 | -2.3 | 55.2 | 64.5 | 92.0° | +38.1° |
| Pagoda->Sannenzaka connector, looking back WNW | 52.6 | 28.4 | 62.4 | 59.7 | 298.5° | +35.9° |
| Nene-no-michi south end, looking SW | 54.3 | -78.5 | 59.5 | 95.6 | 214.6° | +25.8° |
| Ninenzaka north end, looking WSW | 132.8 | -78.9 | 63.3 | 154.4 | 239.2° | +15.4° |
| Sannenzaka/Ninenzaka junction, looking WNW | 142.0 | 61.9 | 69.7 | 154.7 | 293.7° | +13.1° |

### The canonical shot

**Stand at the Yasaka-dori × Shimogawara-dori crossing**: local **(-43.6, -0.7)**, ground 57.8 m ASL.
Camera bearing **91° (due east)**, distance to the pagoda base **44 m**, and you must tilt up
**48°** to hold the finial — a wide lens pointed steeply up, which is exactly why the classic photograph has
that dramatic converging-verticals look.

For the *postcard* framing — pagoda whole, street walls converging, roofline of the machiya just clearing the
lower roofs — back off to about **89–115 m** (local x ≈ -89 to -115), where the tilt drops to
**+31° to +25°**. That is where nearly every published photograph is actually taken from.

**What frames it:**

- **Left (north side)** — a continuous run of two-storey machiya with dark timber lattice (*kōshi*) fronts and
  tiled *hongawara* eaves, standing hard on the street line. Face-to-face is only **6.3 m**, so the buildings
  press in tight.
- **Right (south side)** — the same machiya wall, broken near the top of the street by the low earthen-and-tile
  boundary wall of Hōkan-ji itself.
- **Above** — nothing. The corridor is open sky; the pagoda is the only tall object in the frame.
- **Underfoot** — granite sett, one lane, one-way.

The street also **climbs toward the pagoda at +5.1%** (50.6 m at Higashioji to 59.8 m at the east end), which lifts
the pagoda's base above the viewer's eye and adds to the looming effect. Do not model Yasaka-dori as flat.

### Three other real sightlines

**Pagoda->Sannenzaka connector, looking back WNW** — local (52.6, 28.4), bearing **298°**, 60 m out, tilt +36°.

**Nene-no-michi south end, looking SW** — local (54.3, -78.5), bearing **215°**, 96 m out, tilt +26°.

**Ninenzaka north end, looking WSW** — local (132.8, -78.9), bearing **239°**, 154 m out, tilt +15°.

The connector view (bearing 298°, looking back WNW from 60 m) is the *second* most photographed angle: you get
the pagoda with the Kyoto basin falling away behind it. The Nene-no-michi view (bearing 215°, SW) catches the
pagoda over rooftops. From the Sannenzaka/Ninenzaka junction at 155 m the tilt is only +13°, and the pagoda
appears small between roofs rather than dominating.

---

## 6. Yasaka Shrine layout

Precinct is roughly rectangular, **160.1 m N–S × 194.2 m E–W**, centred near 35.003445, 135.778228.
The ground **rises west to east** across it, from 44.3 m at the West Romon to ~50 m at the Honden — about a 6 m
climb from the Shijo-dori gate to the heart of the precinct.

| Structure | 日本語 | x (m) | z (m) | Elev (m) | Footprint (m) | Faces |
|---|---|---:|---:|---:|---|---|
| West Romon | 西楼門 | -157.3 | -575.2 | 44.3 | 12.6 × 10.2 | 270° |
| Maiden (dance pavilion) | 舞殿 | -64.9 | -536.5 | 49.7 | 13.25 × 11.88 | long axis 94.6° |
| Honden (main hall) | 本殿 | -60.1 | -564.5 | 49.5 | 35.1 × 29.4 | 180° |
| South Romon | 南楼門 | -65.3 | -502.8 | 50.8 | 19.8 × 14.3 | 180° |
| Stone torii | 石鳥居 | -68.3 | -467.3 | 51.2 | span 13.5 | 180° |

### Relative positions

| From → To | East (m) | North (m) | Distance (m) | Bearing |
|---|---:|---:|---:|---:|
| west romon to maiden | +92.4 | -38.7 | 100.2 | 112.7° |
| maiden to honden | +4.8 | +28.0 | 28.4 | 9.7° |
| maiden to south romon | -0.4 | -33.7 | 33.7 | 180.7° |
| south romon to stone torii | -3.0 | -35.5 | 35.6 | 184.8° |

### The layout fact that matters

Honden - Maiden - South Romon - stone torii form a near-straight NORTH-SOUTH ceremonial axis (bearings within 5 deg of 180). The West Romon is OFF this axis, 92 m west and 39 m north of the Maiden, serving Shijo-dori. This is the key layout fact: the famous vermilion gate is a SIDE entrance, not the axial one.

---

## 7. Kiyomizu-dera layout

Niomon -> Saimon -> three-storey pagoda -> Todoroki-mon -> Hondo runs roughly WNW to ESE, climbing 104.5 m to 115.5 m over ~200 m.

| Structure | 日本語 | x (m) | z (m) | Elev (m) | Footprint (m) | Height (m) |
|---|---|---:|---:|---:|---|---:|
| Niomon (Deva gate) | 仁王門 | 373.4 | 347.1 | 104.5 | 11.76 × 7.9 | 14.0 |
| Saimon (west gate) | 西門 | 397.8 | 378.6 | 111.8 | 15.7 × 15.4 | — |
| Three-storey pagoda | 三重塔 | 418.9 | 387.6 | 112.2 | 13.2 × 12.9 | 31.0 |
| Todoroki-mon (middle gate) | 轟門 | 475.7 | 419.7 | 114.9 | 10.2 × 8.67 | — |
| Hondo (main hall) | 本堂 | 519.9 | 418.6 | 115.5 | 36.0 × 31.0 | — |
| Butai (the stage) | 舞台 | 528.4 | 431.6 | 115.5 | 15.7 × 10.2 | — |
| Okunoin | 奥ノ院 | 577.4 | 441.9 | 116.3 | 18.85 × 13.45 | — |
| Otowa-no-taki (waterfall) | 音羽の滝 | 547.9 | 458.8 | 96.0 | — | — |
| Koyasu-no-to (Koyasu pagoda) | 子安塔 | 521.2 | 624.8 | 116.6 | 5.66 × 5.77 | 15.0 |

### Relative positions

| From → To | East (m) | North (m) | Distance (m) | Bearing |
|---|---:|---:|---:|---:|
| niomon to sanjunoto | +45.5 | -40.5 | 60.9 | 131.7° |
| sanjunoto to hondo | +101.0 | -31.0 | 105.7 | 107.1° |
| hondo to butai | +8.5 | -13.0 | 15.5 | 146.8° |
| butai to okunoin | +49.0 | -10.3 | 50.1 | 101.9° |
| butai to otowa | +19.5 | -27.2 | 33.5 | 144.4° |
| butai to koyasu | -7.2 | -193.2 | 193.3 | 182.1° |
| okunoin to butai view | -49.0 | +10.3 | 50.1 | 281.9° |

### THE STAGE — height above the slope

| | |
|---|---|
| Deck elevation | **115.5 m** ASL (level with the Hondo terrace) |
| Bare ground under the stage centre | **102.8 m** ASL |
| **Height above ground at centre** | **12.7 m** |
| Height at the outer corner | **14.4 m** (ground has fallen to 101.1 m) |
| Commonly cited | 13 m |

**CONFIRMED. The 13 m figure is right. GSI 1 m LiDAR gives 115.5 m deck minus 102.8 m bare ground = 12.7 m at the stage centre, rising to ~14.4 m at the outer corner where the slope has fallen to 101.1 m.**

I verified this by running a 95 m DEM transect on bearing 200° through the Hondo. The terrace is dead flat at
115.4–115.7 m out to 10 m past the hall centre, then the hillside collapses: 105.8 m at +15 m, 102.7 m at +20 m,
98.5 m at +25 m, 92.9 m at +35 m, 84.3 m at +50 m. The stage is built out over precisely that break of slope.

### The keyaki pillar grid beneath

| | |
|---|---|
| Total pillars under Hondo + stage | **139** |
| Material | keyaki (Japanese zelkova, Zelkova serrata) |
| Front pillars carrying the projecting stage | **6** |
| Front pillar section | 16-sided (平面十六角形) — 16-sided |
| Front pillar length | **12.0 m** |
| Joinery | kake-zukuri (懸造) scaffold; mortise-and-tenon, no nails |

Sourced from ja.wikipedia 清水寺: 「ケヤキ材の長い柱（139本という）」 and 「もっとも手前（南）に位置し、
せり出した舞台を支える6本の柱は平面十六角形で、長さ12メートルに及ぶ」.

**Derived grid (build to this, but know what is assumed):**

- Stage is **15.7 m wide × 10.2 m deep** (OSM polygon), long axis on bearing **80.4°**, projecting toward **~170° (SSE)**.
- 6 sourced front pillars across 15.7 m = **5 bays at 3.14 m** centres.
- Assuming the same spacing in depth gives **6 across × 4 deep ≈ 24 pillars** under the stage proper.
- Pillar heights range **0.0 m** (at the terrace edge, where they vanish into the slope) to **14.4 m** (outer corner).
- **MED - the 6 front pillars and 12 m length are sourced; the 6-across x 4-deep grid and 3.14 m spacing are DERIVED by dividing the 15.7 m stage width by the 6 sourced front pillars (5 bays). Row count and depth spacing are assumed, not sourced.**

On area: the OSM polygon gives **160.1 m²**; the commonly cited figure is **190 m²**. OSM polygon is 15.7 x 10.2 m = 160 m2. The usual 190 m2 figure implies ~15.7 x 12.1 m, i.e. it includes the strip of decking that runs under the Hondo eaves. Use 15.7 m wide x 12 m deep if you want to match the cited area.

### Vertical structure of the precinct

The temple is **not** on a plateau — it is draped across a ravine head, and the vertical spread is only ~26 m:

```
   122.4 m   Jishu Shrine            (highest, directly behind/above the Hondo)
   116.6 m   Koyasu pagoda           (across the ravine, 193 m due south)
   116.3 m   Okunoin
   115.5 m   Hondo terrace + STAGE DECK
   114.9 m   Todoroki-mon
   112.2 m   Three-storey pagoda
   104.5 m   Niomon                  (11 m below the Hondo — you climb on entering)
   102.8 m   ground beneath the stage
    96.0 m   Otowa-no-taki           (ravine floor, 19.5 m below the terrace)
```

---

## 8. The overlook

Observer on the stage deck at **115.5 m** ASL, eye at **117.1 m**, local (528.4, 431.6).

Open arc runs roughly from bearing 180 deg (Koyasu pagoda, S) round through 250 deg (Kyoto Tower, WSW) to about 330 deg (NNW). The city basin lies W to WSW; the Higashiyama ridge closes the view behind (E).

| Target | Dist (km) | Bearing | Top elev (m) | Elev angle | Conf |
|---|---:|---:|---:|---:|:--:|
| Kyoto Tower (top) | 2.47 | 251.3° | 159.4 | +0.98° | MED |
| Kyoto Station | 2.63 | 246.7° | 27.6 | -1.95° | HIGH |
| To-ji five-storey pagoda (top) | 3.73 | 245.7° | 78.2 | -0.60° | MED |
| Kyoto Imperial Palace | 4.01 | 328.6° | 51.6 | -0.94° | HIGH |
| Arashiyama / Togetsukyo bridge | 9.99 | 281.9° | 32.4 | -0.49° | HIGH |
| Nishiyama ridge (due west sample) | 11.39 | 270.2° | 318.1 | +1.01° | MED |
| Mt Atago (NW skyline) | 15.77 | 299.2° | 867.2 | +2.72° | LOW |
| Higashiyama/Daimonji flank (N sample) | 3.74 | 23.4° | 209.5 | +1.41° | LOW |
| Koyasu-no-to pagoda (across the ravine) | 0.19 | 182.1° | 131.6 | +4.28° | HIGH |

### What you actually see

**The city basin is WEST to WSW**, bearings roughly 245°–285°. Because the stage is only ~88 m above the
Kyoto floor (115.5 m vs ~28 m at Kyoto Station), every city landmark sits within **±2° of the horizon** — this
is a *shallow* panorama, not an aerial view. Get the camera pitch near zero; tilting down looks wrong.

- **Kyoto Tower** — the one unmistakable landmark. **2.47 km at bearing 251° (WSW)**, its top at 159 m ASL, so
  it sits **+1.0° above** eye level: it pokes just above the horizon line. Not 3.5 km as assumed.
- **Kyoto Station** — 2.63 km, 247°, slightly below the horizon.
- **Tō-ji five-storey pagoda** — 3.73 km, 246°. At 78 m ASL it is essentially *on* the horizon (−0.6°) and in
  practice is lost in the urban haze.
- **Kyoto Imperial Palace** — 4.01 km at **329° (NNW)**, at the right-hand edge of the open arc.
- **Nishiyama** — the ridge closing the basin due **west** at ~11 km, crest around 310–320 m, standing about
  **+1°** above eye level. This is the far wall of the view.
- **Arashiyama** — 10 km at 282° (WNW), where the ridge dips toward the Hozu gap.
- **Behind you (east)** the Higashiyama ridge rises immediately and closes the view — there is no eastward vista.

**The nearest and most photographed element is not the city at all**: the **Koyasu pagoda**, 193 m almost due
**south (bearing 182°)** across the ravine at the same elevation, **+4.3°** above the eyeline. It reads as a small
vermilion tower floating in the treetops, and it is the depth cue that makes the ravine legible.

Looking **back** from the Okunoin toward the stage, the bearing is
**282° (WNW)** at only **50 m** — this is the classic three-quarter view of the stage on its
pillar scaffold with the city beyond, and it is the shot that sells the whole structure.

---

## 9. Uncertainty register

Blunt list of everything I could not verify, and what I assumed instead.

| # | Item | Status | Detail | Conf |
|---:|---|---|---|---|
| 1 | Anchor coordinate supplied in the brief (34.99806, 135.78056) | **REJECTED** | That point is 186 m ESE of the pagoda, on the Ninenzaka/Sannenzaka junction. Replaced with 34.9985564, 135.7792488 (OSM footprint centroid; ja.wikipedia infobox agrees to 0.9 m). | HIGH that the replacement is correct |
| 2 | Gion elevation guessed as 45-50 m ASL in the brief | **CORRECTED** | GSI 1 m LiDAR gives 39.0 m at Shijo x Hanamikoji and 39.0-39.2 m along Shirakawa/Shinbashi. Gion is ~39 m, about 8 m lower than assumed. | HIGH |
| 3 | Kiyomizu-dera stage at 240-250 m ASL (brief's suspicion that this is too high) | **CORRECTED - the suspicion was right** | The stage deck is ~115.5 m ASL, not 240-250 m. The whole temple sits between 96 m (Otowa falls) and 122 m (Jishu Shrine). The 240-250 m figure is roughly the elevation of the Higashiyama ridge BEHIND the temple, not the temple itself. | HIGH |
| 4 | Kyoto Tower distance from the stage, guessed at ~3.5 km WSW | **CORRECTED** | Actual 2.47 km at bearing 251.3 deg. WSW was right; the distance was ~40% too large. | HIGH on geometry; tower coordinate 34.987536/135.759339 is MED (not independently re-verified this session) |
| 5 | Stage deck area | **UNRESOLVED CONFLICT** | OSM polygon = 15.7 x 10.2 m = 160 m2. Commonly cited = 190 m2. Chose to report both; 190 m2 implies ~12 m depth, which likely includes decking under the Hondo eaves. Picked OSM for the geometry and flagged the cited area. | MED |
| 6 | Pillar grid beneath the stage | **PARTLY ASSUMED** | Sourced: 139 keyaki pillars total under Hondo+stage, 6 front pillars, 16-sided section, 12 m long (ja.wikipedia). ASSUMED: a 6-across x 4-deep grid at 3.14 m spacing under the stage proper (~24 pillars). Column spacing is derived from 15.7 m / 5 bays; the row count and depth spacing are my assumption and are NOT sourced. | LOW on the grid, HIGH on the 139/6/12 m figures |
| 7 | Ishibe-koji geometry | **INCOMPLETE** | OSM maps only a 35 m E-W stub (way 526198278). The real alley is L-shaped and roughly 100-150 m long with a dog-leg. Face-to-face width 5.3 m is from only 3 samples. Treat the alley's full plan as UNSURVEYED - it needs manual tracing from imagery. | LOW |
| 8 | Nene-no-michi extent and naming | **ASSUMED** | OSM has no way named ねねの道. I identified it as way 30882780 (290.6 m, N-S) because the OSM information node named ねねの道 (35.0005286, 135.7799500) sits on it. North/south end points are therefore MED, not HIGH. | MED |
| 9 | Nene-no-michi surface | **ASSUMED** | Untagged in OSM. Recorded as granite slab paving from general knowledge of the street. Not verified against a second source. | MED |
| 10 | Ninenzaka vs Sannenzaka boundary, and OSM way 710696944 | **AMBIGUOUS** | OSM tags way 710696944 (pagoda -> Sannenzaka head, 173 m, bearing 106.6 deg) as 三年坂, although it lies WEST of the Ninenzaka/Sannenzaka junction and functionally is the pagoda-to-Sannenzaka link. I kept OSM's split (Ninenzaka = the 143 m N-S lane; Sannenzaka = the 216 m lane south of the junction) and listed the connector separately. A different source may draw the boundary differently. | MED |
| 11 | Carriageway (paved) widths | **ESTIMATED** | Only three OSM width tags exist in the whole route: Shirakawa-Minami 4.5 m, Ninenzaka 4 m, Sannenzaka 4 m. Every other carriageway width in the street table is my estimate, generally face-to-face minus 1.5-3 m for eaves, steps and frontage. Treat all unstarred carriageway widths as MED at best. | MED to LOW |
| 12 | Face-to-face widths on open-sided streets | **BIASED HIGH** | Measured by ray-casting to OSM building polygons, capped at 20 m. Where one side is a garden, park, canal or temple wall with no mapped building (Shirakawa-Minami 23.0 m, Nene-no-michi 10.4 m, Shimogawara 11.5 m), the figure overstates the enclosed width. Streets with continuous machiya on both sides (Hanamikoji 9.1 m, Yasaka-dori 6.3 m, Ninenzaka 6.1 m, Sannenzaka 7.4 m) are reliable. | HIGH for enclosed streets, LOW for open-sided ones |
| 13 | Step riser and tread on Ninenzaka and Sannenzaka | **DERIVED** | Sannenzaka: 46 steps over a 32.0 m run and 6.0 m rise => 0.70 m tread, 0.13 m riser, 18.8% average grade on the flight. Ninenzaka: 17 steps over 15.9 m and ~2.5 m rise => 0.94 m tread, 0.15 m riser. Step COUNTS are from OSM tags (HIGH); the tread/riser split is arithmetic from way length and DEM endpoints and assumes uniform steps with no landings, which is unlikely to be exactly true. | HIGH on counts, MED on tread/riser |
| 14 | Stone torii height at Yasaka Shrine | **UNVERIFIED** | Span measured at 13.5 m from OSM. Height recorded as ~9.5 m estimate. ja.wikipedia gives the 1646 construction date but no dimensions. | LOW on height |
| 15 | Yasaka Shrine gate and Maiden heights | **UNVERIFIED** | Footprints are HIGH (OSM polygons) but no height is published in ja.wikipedia for the West Romon, South Romon, Maiden or Honden. No heights are asserted. | n/a - omitted rather than guessed |
| 16 | Niomon height at Kiyomizu-dera (14 m) | **SINGLE SOURCE** | From the OSM height tag only. ja.wikipedia gives no figure. Not cross-checked. | MED |
| 17 | Mt Atago and Daimonji elevations/bearings | **SAMPLE POINTS, NOT SUMMITS** | GSI returned 867.2 m for my Atago sample (true summit 924 m) and 209.5 m for my Daimonji sample (true summit 466 m). My coordinates are on the flanks. Bearings are indicative only; do not use these two rows for skyline placement without re-picking summit coordinates. | LOW |
| 18 | Maruyama Park weeping cherry position | **SINGLE SOURCE** | OSM node 4517278152, tagged natural=tree and named 枝垂桜. Assumed to be the famous Gion shidarezakura, but the tag does not say so explicitly and there is a second unnamed 枝垂桜 node 30 m away. | MED |
| 19 | Kodai-ji precinct centroid elevation | **NOT SAMPLED** | Left null in the landmark table. The Daidokoro-zaka approach was sampled instead (57.6 m at the foot, 68.7 m at the top of the 32 steps). | n/a |
| 20 | Absolute vertical datum | **NOTE** | All elevations are GSI orthometric heights above Tokyo Peil (the Japanese national height datum), not WGS84 ellipsoidal heights. Consistent internally; offset by roughly +37 m from the ellipsoid in this area if you ever mix in GPS altitudes. | HIGH |
| 21 | DEM under buildings | **NOTE** | The GSI 1 m product is a bare-earth DEM, which is why it correctly returned 102.8 m under the Kiyomizu stage rather than the deck. In dense machiya blocks the ground return can still be sparse, so values inside built-up areas may be interpolated. Street-centreline samples are reliable; samples inside building footprints are MED. | MED |

---

## 10. What to trust

**Build directly from these (HIGH):** the anchor coordinate and frame; every landmark lat/lon and derived x/z;
all elevations (GSI 1 m LiDAR, queried point by point); street lengths and bearings; the Sannenzaka/Ninenzaka
step counts; the pagoda's 46 m height and 13.2 m square base; the Kiyomizu stage's 12.7 m height above grade;
face-to-face widths on the enclosed machiya streets; every sightline and overlook bearing/distance.

**Check before committing (MED):** Nene-no-michi's extent and surface; carriageway widths; face-to-face on
open-sided streets; the Maruyama weeping cherry's position; the Niomon's 14 m height; stage deck area.

**Do not build from these without new survey (LOW):** Ishibe-koji's plan beyond the 35 m OSM stub; the pillar
grid's row count and depth spacing; the Yasaka stone torii's height; the Atago and Daimonji rows in the
overlook table (my sample points are on the flanks, not the summits).
