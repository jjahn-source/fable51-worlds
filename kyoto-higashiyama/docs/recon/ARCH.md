# ARCH.md — Architectural Survey, Kyoto Higashiyama Reconstruction

**Agent C (Architectural Surveyor).** Every dimension in metres unless stated. Traditional units are
given alongside because the buildings were designed in them — round in shaku/sun, not in metres.

**Confidence flags used throughout**

| Flag | Meaning |
|---|---|
| `[HIGH]` | Statutory unit definition, cultural-property designation record, official city/temple document, measured survey, or exact arithmetic from one of those |
| `[MED]` | Wikipedia-JA, trade/craft body, reputable specialist site |
| `[LOW]` | Tourist site, blog, single secondary mention |
| `[DERIVED]` | Computed by me from a `[HIGH]`/`[MED]` figure — the arithmetic is stated so you can check it |
| `[UNKNOWN]` | Not found. A suggested value **and the reason** is given. Never silently invented. |


### Contents

1. [The ken module (尺・間)](#1-the-ken-module-尺間) — the number everything else is a multiple of
2. [Kyoto machiya (京町家)](#2-kyoto-machiya-京町家) — the street fabric
3. [Gion ochaya / Hanamikoji facades](#3-gion-ochaya--hanamikoji-facades)
4. [Yasaka Shrine (八坂神社)](#4-yasaka-shrine-八坂神社)
5. [Yasaka Pagoda / Hōkan-ji 五重塔](#5-yasaka-pagoda--hōkan-ji-五重塔-八坂の塔) — the hero object
6. [Kiyomizu-dera (清水寺)](#6-kiyomizu-dera-清水寺)
7. [Street furniture and stone](#7-street-furniture-and-stone)
8. [Scale sanity table](#8-scale-sanity-table) — QA
9. [Open questions — the complete UNKNOWN register](#9-open-questions--the-complete-unknown-register)

### The fifteen numbers to type in first

If you build nothing else correctly, build these. All are `[HIGH]` measured or statutory values.

```python
SHAKU        = 10/33          # 0.3030303 m exactly (1891 度量衡法)
KEN_KYOMA    = 6.5 * SHAKU    # 1.9697 m  -- Kyoto. NOT 1.818.
CLEAR_BAY    = 6.3 * SHAKU    # 1.9091 m  -- the uchinori (clear) module machiya actually use
TATAMI_KYOMA = (1.9091, 0.9545)

PAGODA_H          = 38.788    # m, MEASURED. NOT the 46 m on the tourism site.
PAGODA_BODY_H     = 26.667    # m
PAGODA_SORIN_L    = 12.121    # m  = 31.25 % of total
PAGODA_S          = [6.303, 5.918, 5.582, 4.982, 4.433]   # per-storey width, CONVEX taper
PAGODA_EAVE_OUT   = 3.803     # m, IDENTICAL on all five storeys

KIYOMIZU_STAGE    = (21.8, 9.6)   # m -- NOT 18 x 10
KIYOMIZU_STAGE_H  = 13.0          # m above the foot of the cliff
KIYOMIZU_HONDO    = (36.0, 31.0)  # m overall, ridge 18 m, roof 2050 m2

YASAKA_HONDEN_H   = 15.53     # m ridge; walls 27.8 x 23.8 m
YASAKA_TORII_H    = 9.5       # m, span 6.8 m
HANAMIKOJI_WIDTH  = 8.4       # m face to face -- NOT the 11 m planning line
```

### How to read this document

- **Traditional units are given alongside metres** because these buildings were designed in shaku and
  ken. When you need to round, round in the traditional unit, not the metric one.
- **Cultural-property records give BAY COUNTS, not lengths.** 「桁行九間」 means *nine bays*, not nine
  ken. Japanese Wikipedia says so explicitly: 「ここでいう「間」は長さの単位ではなく、柱間の数を指す」.
  Every ken→metre conversion in this document is flagged `[DERIVED]`.
- **Two different modules are in play.** Houses use the **ken** (§1). Temples and pagodas use
  **支割 / 枝割 (edawari)**, a module equal to one rafter pitch (§5.3). Do not mix them.
- **Where sources conflict, both figures are printed with a verdict.** The verdicts are in §5.2, §6.3,
  §6.4.2, §6.4.3, §6.4.8, §4.2, §4.4, §7.2, §7.3, §7.6, §3.5 and §3.6.
- **§9 lists every UNKNOWN in one register** so nobody silently re-invents a different value.

---

## 1. The ken module (尺・間)

### 1.1 Base units — exact

The shaku was fixed by the 1891 度量衡法 as an exact rational fraction of the metre. Use the exact
fraction in code; do not use 0.303.

```
SHAKU = 10/33            # m  = 0.3030303030...  (曲尺 kanejaku)  [HIGH]
SUN   = SHAKU/10         # m  = 0.0303030303...  = 30.3030 mm
BU    = SUN/10           # m  = 0.0030303030...  =  3.0303 mm
RIN   = BU/10            # m  = 0.0003030303...  =  0.3030 mm
JO    = 10*SHAKU         # m  = 3.0303030303...  (丈)
```

Other multiples, for site/street work: 1 町 (chō) = 60 ken = 109.0909 m, 1 里 (ri) = 36 chō =
3927.27 m. `[HIGH]` — ja.wikipedia.org/wiki/尺

The **鯨尺 (kujirajaku)**, 25/66 m = 378.788 mm, is the *textile* shaku. It is 1.25× the kanejaku and
is **never** used for buildings. If a source quotes a suspiciously large dimension, check whether it
is in kujirajaku. `[HIGH]`

### 1.2 The two kens — Kyoma vs Inaka-ma

```
KEN_KYOMA   = 6.5 * SHAKU  = 65/33   m = 1.9696970 m   (京間 / 本間 — Kyoto, Kansai)   [HIGH]
KEN_INAKAMA = 6.0 * SHAKU  = 60/33   m = 1.8181818 m   (田舎間 / 江戸間 — Kanto)       [HIGH]
```

Difference: **151.5 mm per ken**, i.e. **+8.33 %**. Over a 12-ken-deep machiya plot that is 1.82 m of
extra depth — visible at street scale, so get it right.

Two intermediate systems exist and are worth knowing only so you can reject them:
中京間 (Chūkyō-ma, Nagoya/Tōkai) ken = 6 shaku with a 6.0 × 3.0 shaku tatami; 団地間 (danchi-ma,
post-war RC flats) tatami ≈ 1700 × 850 mm. Neither belongs in Higashiyama. `[MED]`

### 1.3 Tatami — the real generator of the module

```
TATAMI_KYOMA   = 6.3 shaku x 3.15 shaku = 1.9090909 m x 0.9545455 m   (1909 x 955 mm)  [HIGH]
TATAMI_EDOMA   = 5.8 shaku x 2.9  shaku = 1.7575758 m x 0.8787879 m   (1758 x  879 mm)  [MED]
TATAMI_CHUKYO  = 6.0 shaku x 3.0  shaku = 1.8181818 m x 0.9090909 m                     [MED]
```

Kyoma tatami area = **1.8223 m²**. Aspect ratio is exactly **2:1** in every system.

Cross-check from a tatami manufacturer (DAIKEN), which quotes the trade sizes in mm — these agree
with the shaku figures to within rounding: `[HIGH]`
https://www.daiken.jp/buildingmaterials/tatami/columnipe/002/

| System | mm | m² | Region |
|---|---|---:|---|
| **京間 (本間)** | **1910 × 955** | 1.82 | Kansai, Shikoku, Chūgoku, Kyūshū |
| 六一間 | 1850 × 925 | 1.71 | Setouchi coast |
| 中京間 | 1820 × 910 | 1.66 | Aichi/Gifu, parts of Tōhoku/Hokuriku, Okinawa |
| 江戸間 | 1760 × 880 | 1.55 | Kantō, parts of Tōhoku, Hokkaidō |
| 団地間 | 1700 × 850 | 1.44 | post-war flats |

**Room-area sanity check:** a 6-jō room is **≈11 m² in Kyoma** but only **≈9.3 m² in Edoma** — an
18 % difference. `[HIGH]` same source. If a Kyoto interior comes out at 9.3 m² for 6 mats, the module
is wrong.

### 1.4 内法制 (uchinori-sei) — the rule that actually governs Kyoto machiya

This is the single most important thing in this section and it is routinely got wrong.

> 「柱間を柱の芯々ではなく、畳のサイズ（6.3尺×3.15尺）を基準にして、有効寸法で決める方法。…
>  今日まで京町家のモジュールも徹底して内法寸法を守る。内法柱間制とも言う。」
> — 京町家作事組 用語集, うちのりせい【内法制】 `[HIGH]` https://sakujigumi.com/sakujiwiki/uchinorisei

Kyoto works **clear-dimension-first** (畳割 / tatami-module), not centre-to-centre-first (柱割 /
pillar-module, which is the Edo/Kanto system). Consequences for geometry code:

- The **clear span between column faces** is the fixed quantity: **6.3 shaku = 1.90909 m** per bay,
  **3.15 shaku = 0.95455 m** per half-bay.
- Column centre-to-centre spacing is therefore **clear + one column width**, and it *varies* with the
  column size. The 京町家作事組 entry for 間半 (half-ken) says so explicitly: 「通り柱間と柱のサイズ
  によって寸法は変わり、一定ではない（1メートル弱）」— "it is not constant, just under 1 metre".
  `[HIGH]` https://sakujigumi.com/sakujiwiki/manaka
- **Where 6.5 shaku comes from:** across a room *n* ken wide, the clear is n × 6.3 shaku and you add
  exactly **one** column width (not one per bay), because interior columns land in the tatami joints.
  For a 2-ken room with a 4-sun (121.2 mm) column: (2 × 6.3) + 0.4 = **13.0 shaku = 2 × 6.5 shaku**.
  The nominal Kyoma ken of 6.5 shaku is that identity. `[DERIVED — arithmetic shown]`

**Practical rule for the generator:**

```
# structural grid (post centres) — use this for framing and for street frontage
KEN = 1.96970          # m, Kyoma nominal
HALF_KEN = 0.98485     # m

# room interiors — use this for tatami layout, openings, joinery
CLEAR_BAY  = 1.90909   # m  (6.3 shaku)
CLEAR_HALF = 0.95455   # m  (3.15 shaku)
COLUMN_4SUN = 0.12121  # m  (4寸角, the standard machiya post)
COLUMN_35SUN= 0.10606  # m  (3寸5分角, lighter / rental machiya)
COLUMN_3SUN = 0.09091  # m  (3寸角, minimum)
```

### 1.5 Vertical module — 内法高 (uchinori-daka)

The horizontal module has a vertical partner. The underside of the 鴨居 (kamoi, head rail) is the
datum for every sliding screen in the house, and in Kyoma it is standardised:

```
UCHINORI_H = 5.7 shaku = 1.7273 m   (~173 cm) — head height of shoji/fusuma, Kyoma standard  [MED]
```
Source: cel-corporation.co.jp/life-baton/article/124 — 「畳は3.15尺（約96センチ）×6.30尺（約192センチ）
の京間寸法が一般的であり、鴨居までの内法寸法も5.7尺（約173センチ）と決められている」 `[MED]`

Because the module is a *clear* module, doors, screens and tatami from one Kyoto machiya fit another
— which is exactly why the system survived. Sliding-screen leaf widths follow the same rule:
half-bay clear 0.95455 m for a 2-leaf opening, 0.47727 m per leaf on a 4-leaf 1-ken opening.
`[DERIVED]`

### 1.6 Everything downstream

Every plan dimension in sections 2, 3 and 4 below should be an integer multiple of **0.98485 m**
(half-ken) and preferably of **1.96970 m**. Common machiya bay counts: 1, 1.5, 2, 2.5, 3, 3.5 ken.

| ken | metres (Kyoma) | metres (Inaka-ma) |
|---:|---:|---:|
| 0.5 | 0.985 | 0.909 |
| 1 | 1.970 | 1.818 |
| 1.5 | 2.955 | 2.727 |
| 2 | 3.939 | 3.636 |
| 2.5 | 4.924 | 4.545 |
| 3 | 5.909 | 5.455 |
| 3.5 | 6.894 | 6.364 |
| 4 | 7.879 | 7.273 |
| 5 | 9.848 | 9.091 |
| 6 | 11.818 | 10.909 |
| 8 | 15.758 | 14.545 |
| 10 | 19.697 | 18.182 |
| 12 | 23.636 | 21.818 |

---

## 2. Kyoto machiya (京町家)

### 2.0 Regulatory ground truth for the Sannenzaka district

The Sannenzaka Important Preservation District plan (昭和51年7月1日京都市告示第69号) is a *legal*
document and is the highest-confidence source available for what a Higashiyama street facade must
contain. Full text: https://www.city.kyoto.lg.jp/tokei/page/0000281761.html `[HIGH]`

- District area **8.2 ha**; **≈65 %** of buildings are designated 伝統的建造物 (traditional). `[HIGH]`
- The plan enumerates **six** building types for the district, which is exactly the type-palette the
  generator should implement:
  1. **むしこ造り町家** (mushiko-zukuri machiya) — Edo→Meiji, 中2階 (tsushi-nikai)
  2. **本2階建町家** (hon-nikai-date) — Meiji, full two-storey
  3. **変形町家** (henkei machiya) — mainly Taishō, irimoya roof
  4. **数寄屋風** (sukiya-style) — single-storey teahouse-ish shopfront
  5. **和風邸宅** (wafū teitaku) — gated walled house
  6. **石塀小路町家** — Taishō rental houses on Ishibei-kōji, with stone walls and front gardens
- Mandated construction for the machiya types: 「木造真壁造りで中2階とし、平入り形式とする」 —
  timber **shinkabe** (exposed-post) frame, mid-storey, **hira-iri** (eaves-side entry, ridge parallel
  to street). This is a hard geometric constraint: **the ridge always runs parallel to the street.**
  `[HIGH]`
- Roof: 「切妻で日本瓦ぶきとし、屋根軒裏は、垂木及び野地板をみせる」 — **gable (kirizuma)**, Japanese
  tile, and the eave soffit must show **exposed rafters and roof boarding** (no closed soffit). `[HIGH]`
- Hisashi (1F penthouse roof): 日本瓦ぶき, soffit shows 野地板, and carries a **幕掛け (makukake)** —
  the horizontal member from which the shop curtain hangs. `[HIGH]`
- Walls: **しっくい (shikkui lime plaster) or plaster** for the mushiko types; **京壁 (Kyō-kabe,
  earth plaster)** for the hon-nikai types; **聚楽壁 (Jurakukabe)** for sukiya types. `[HIGH]`
- 1F composition: 出格子 or 平格子, 引込み格子戸, 腰竪羽目板張り (wainscot boarding), 戸袋. `[HIGH]`
- 2F composition (mushiko type): **むしこ窓** required. `[HIGH]`
- Timber: **檜 (hinoki)** posts, 1等上小節材 grade. Finish: **べんがら塗り (bengara)** or
  **生地仕上げ (bare timber)**. `[HIGH]`
- 犬走り (the strip of ground at the wall base): **洗出し砂利仕上げ** — exposed-aggregate gravel. `[HIGH]`
- 土塀 (earthen boundary wall) finished thickness **≥ 300 mm**. `[HIGH]`
- 石垣: **玉石乱積** (random rubble) using **cobbles of 100–200 mm grain size**. `[HIGH]`

### 2.1 Frontage (間口) and depth — the eel's bed

| Source | 間口 | 奥行 | Ratio | Flag |
|---|---|---|---|---|
| 『京町家』光村推古書院, via NDL CRD ref 1000110355 | **2–3 ken** | **≈4 ken** (early, pre-Edo-late) | ~1:1.5 | `[HIGH]` |
| 京町家作事組, 一列三室型 entry — *smallest viable machiya* | **1.5 ken** | **3.5 ken** | 1:2.3 | `[HIGH]` |
| Popular/consensus figure (multiple JA sites) | **≈2 ken ≈ 3.6 m** | **10–12 ken ≈ 18–22 m** | **1:5 – 1:6** | `[MED]` |

**CONFLICT — flagged.** The popular "間口2間＝約3.6m" quote converts the ken at **1.8 m
(inaka-ma)**, not at the Kyoma 1.97 m. Kyoto machiya are Kyoma buildings; 2 Kyoma ken is **3.94 m**.
Kyoto *land* was, however, often traded in a 6-shaku surveyors' ken, so both numbers circulate. My
recommendation: **build the frame in Kyoma (1.9697), and if you want the "3.6 m" look, use 2 ken
minus a party-wall allowance** rather than switching the module.

The tax story behind the narrow frontage is real and worth encoding as a distribution: town levies
and shogunal impositions were apportioned by **間口 (kenwari)** — literally "frontage-割" — so owners
bought street frontage in the smallest saleable unit and ran the plot back. `[HIGH]` NDL CRD 1000110355.
A widely repeated claim that plots stopped at 3 ken because a 4th ken doubled the tax is `[LOW]` —
treat it as folklore, but the *outcome* (a hard cluster at 2–3 ken) is well attested.

**Recommended generator distribution** `[DERIVED from the above]`

```
frontage_ken   = choice([1.5, 2, 2, 2.5, 2.5, 3, 3, 3.5], )   # mode at 2-3 ken
frontage_m     = frontage_ken * 1.96970                       # 2.95 / 3.94 / 4.92 / 5.91 / 6.89
depth_ken      = randint(6, 12)                               # 11.8 m .. 23.6 m
# aspect ratio 1:3 (shallow shop) to 1:8 (deep merchant house); target median ~1:5
```

For an **表屋造 (omoteya-zukuri)** — the big merchant type — the plot is split into a street-facing
one-room block (表屋) and a separate main block, joined across a ゲンカンニワ courtyard.
`[HIGH]` https://sakujigumi.com/sakujiwiki/omoteyazukuri. Use this for depths above ~10 ken.

### 2.2 Storey heights — tsushi-nikai vs sō-nikai

This is where Higashiyama gets its distinctive low, long, horizontal profile. **Do not build these
as normal two-storey houses.**

| Quantity | Value | Flag / source |
|---|---|---|
| 厨子二階 ceiling height, 重文 奈良屋杉本家住宅, measured at the mushikomado | **5尺7寸1分 = 1.730 m** | `[HIGH]` (measured, ICP house). Note the quoting site rounds this to "約171cm" — **2 cm discrepancy in the source**, flagged |
| 総二階 2F floor-to-floor, Taishō-late → Shōwa-early machiya | 「2ｍ半ばを越える」 → **> 2.5 m**, use **2.55–2.70 m** | `[HIGH]` 京町家作事組, そうにかい entry |
| 1F 内法 (head of shoji/fusuma) | **1.727 m** | `[MED]`, §1.5 |
| 1F ceiling (内法 + 欄間 ranma transom) | **2.20–2.45 m** | `[DERIVED]` — 内法 1.727 + ranma 0.45–0.70 |
| 1F floor-to-floor | **2.9–3.1 m** | `[DERIVED]` — 1F ceiling + tsushi floor structure ~0.45 m |
| Floor level above the street (床高) | **0.40–0.60 m** on the tatami side; **0.00 m** in the toriniwa, which is beaten earth at street level | `[DERIVED / MED]` — the toriniwa being *at grade* is the defining fact |

**Eave heights (軒高) — `[UNKNOWN]`, no measured survey found. Suggested values with reasoning:**

```
EAVE_H_TSUSHI  = 4.8 m    # suggest, because 1F f-to-f 3.0 + tsushi f-to-f 1.8 = 4.8
                          # tsushi f-to-f 1.8 = ceiling 1.73 (Sugimoto, measured) + floor build-up
EAVE_H_SONIKAI = 5.8 m    # suggest, because 1F f-to-f 3.1 + 2F f-to-f 2.7 = 5.8
RIDGE_ABOVE_EAVE = 0.5 * building_depth_of_one_roof_slope * pitch   # see 2.3
```
Reason for confidence in the *relationship* even without the survey: the Sakai machinami study
explicitly notes that a district's hisashi line "matches the tsushi-nikai eave height"
(「つし二階の町家の軒の高さに合わせたもの」) — i.e. the tsushi eave is the town-wide datum, so the
value must be tight, not scattered. `[MED]` city.sakai.lg.jp 4-machinami-benkyokai.

The historical *reason* the tsushi roof is low is fire, not sumptuary law: Kyoto townspeople sized
the eave from the street width so a fire could not leap the road. `[MED]` (widely repeated in JA
sources; no primary ordinance found — the "commoners were forbidden to look down on the daimyō"
story is `[LOW]` folklore, and the NDL reference service could find no numeric ordinance either:
NDL CRD ref 1000270298 explicitly returns **no** numeric height-restriction edict.)

**Upper bound, statutory, today:** Kyoto's 2007 新景観政策 height districts cap Higashiyama at
10 m or 12 m depending on the sub-zone. Nothing in the district should exceed **12 m** except the
designated monuments. `[MED]` — I could not fetch the specific zone map this session; **VERIFY the
exact zone for Sannenzaka/Gion before using 10 vs 12.**

### 2.3 Roof pitch, curvature and overhang

**Pitch.** Japanese pitch is expressed as rise per 10 sun of run (寸勾配).

| 寸勾配 | Ratio | Degrees | Note |
|---:|---|---:|---|
| 3寸 | 3/10 | 16°41′57″ | minimum seen; too shallow for tile in Kyoto rain |
| **4寸** | **4/10** | **21°48′05″** | **the machiya default** |
| **5寸** | **5/10** | **26°33′54″** | steeper machiya / temple sub-roofs |
| 6寸 | 6/10 | 30°57′49″ | |
| 7寸 | 7/10 | 34°59′31″ | |
| 8寸 | 8/10 | 38°39′35″ | |
| 10寸 | 10/10 | 45°00′00″ | |
`[HIGH]` conversion table — afgc.co.jp/knowledge/cate1/a36

Use **4寸 (21.8°) for the main gable roof** and **3寸–4寸 for the 1F hisashi** (the hisashi is always
shallower than the main roof — that is what gives the machiya its stepped silhouette).

**むくり (mukuri) — convex camber. This is the detail that separates a machiya roof from a temple
roof and almost every 3D reconstruction gets it backwards.**

> 「屋根に起りをつけるのは…流れの長さが大きい町家で、あまり勾配をきつくしないで水量が多い軒先の
>  勾配を大きく取る工夫である。」 — 京町家作事組, むくり entry `[HIGH]`
> https://sakujigumi.com/sakujiwiki/mukuri

- **Machiya roofs bow UPWARD in the middle (convex, 起り/mukuri).** The slope is gentler at the ridge
  and *steeper at the eave*, so a long rafter run can shed a large volume of water at the eave
  without an overall steep pitch.
- **Temple and shrine roofs bow DOWNWARD (concave, 反り/sori)** with an upturned corner.
- Camber magnitude: `[UNKNOWN]` — no measured figure found. **Suggest a mid-span rise of 1/60 to
  1/40 of the rafter run** (for a 5 m run, 80–125 mm), because that is the range at which mukuri is
  visible in photographs without reading as a fault. Model it as a quadratic on the rafter line, with
  the eave-end tangent at ~5寸 and the ridge-end tangent at ~3.5寸, mean 4寸.

**Eave overhang (軒の出).** Legally specified in the Higashiyama landscape districts:

| District | 軒の出 requirement | Flag |
|---|---|---|
| 祇園縄手・新門前 歴史的景観保全修景地区 | **≥ 0.60 m** on street-facing 1F and 2F walls | `[HIGH]` city.kyoto.lg.jp 景観 pages |
| 祇園町南 歴史的景観保全修景地区 | **≥ 0.60 m** | `[HIGH]` |
| 上京小川 歴史的景観保全修景地区 (comparator, not Higashiyama) | **≥ 0.90 m** | `[HIGH]` |

Recommended: **main roof eave 0.90 m, hisashi 0.75–0.90 m**, i.e. roughly **half a Kyoma ken
(0.985 m)** — which is how a carpenter would actually set it out. `[DERIVED]`

### 2.4 Roof tile

**Tile type.** Kyoto machiya use **桟瓦 (sangawara)** — the single-piece pan-and-cover tile invented
in the early Edo period, which spread to Kyoto townhouses after the **天明の大火 (1788)**.
`[HIGH]` https://sakujigumi.com/sakujiwiki/sangawarabuki

- Laid **right to left** in Kyoto (差し葺き) specifically so the vertical joint lines run true. `[HIGH]`
- Bedded on earth (**土葺き**) traditionally; **筋葺 (sujibuki)** places bedding earth only in the
  tile valleys. Modern re-roofs use battens and screws. `[HIGH]`
- Substrate is **トントン (土居葺き, thin shingle) or 杉皮 (cedar bark)**. `[HIGH]`

**Tile module — this is the number you need.** Japanese tiles are named by how many cover one 坪
(3.30579 m²).

| Tile | Overall | Working (葺き足 × 働き幅) | Tiles per 坪 | Flag |
|---|---|---|---:|---|
| **J形53A** (modern standard, "五三版") | 305 × 305 mm | **235 mm (length) × 265 mm (width)**, tol. ±4 mm | 53 | `[HIGH]` JIS A 5208 |
| **六四瓦 (rokushi-gawara)** — *the historic Kyoto machiya tile* | — | **≈214 × 241 mm** | **64** | tile-count `[HIGH]` 京町家作事組 ろくしがわら; the mm figures are `[DERIVED]` |

> 「屋根面一坪に64枚葺ける小振りの規格瓦。現代は五三版が一般的。六四はサイズが小さく薄くでき、
>  町家のスケール感に合う。」 `[HIGH]` https://sakujigumi.com/sakujiwiki/rokushigawara

**Derivation of the 六四 working size:** 3.30579 m² / 64 = 0.051653 m² per tile vs 3.30579/53 =
0.062373 m² for the 53A. Ratio 0.8281, linear scale √0.8281 = 0.9100. Apply to the measured 53A
working dimensions: 235 × 0.910 = **213.9 mm**, 265 × 0.910 = **241.2 mm**. `[DERIVED]`

**Use 六四 (214 × 241 mm) for Higashiyama, not 53A.** At a 12 m frontage that is 50 tile courses
across instead of 45 — the finer grain is exactly what "町家のスケール感" means, and it reads at
distance.

**一文字瓦 (ichimonji-gawara) — the eave tile.**

> 「軒先瓦のタレ（飾り板）の下端が一直線に揃う瓦を使った葺き方。合端を取りながら葺くので手間が
>  かかる。軒先の一直線が町家の外観に端正な印象を与える。」 `[HIGH]`
> https://sakujigumi.com/sakujiwiki/ichimonji

- Geometric meaning: the eave course terminates in a **dead-straight horizontal line**, not the
  scalloped/wavy line of an ordinary 万十軒瓦. Model the eave edge as a single extruded fascia
  profile, not as a row of discs. This is the highest-payoff single detail on the whole facade.
- Face (タレ) depth: **3寸 to 3寸5分 = 90.9–106.1 mm**. `[MED]` kyototuu.jp 京町家 page
  (「断面の厚さは三寸から三寸五分」).
- The Gion Shinbashi preservation plan makes 一文字軒先がわら **mandatory on the hisashi** for the
  chaya types. `[HIGH]` (see §3).

**Ridge (棟).** `[UNKNOWN]` — no measured machiya ridge height found. **Suggest 3–5 courses of
のし瓦 (noshi) capped by a 冠瓦, giving 0.30–0.45 m above the roof plane**, because a domestic
machiya ridge is deliberately modest (5+ courses reads as a temple or a rich merchant house, 2 as a
shed). Add **鬼瓦 (onigawara)** end-blocks ~0.35 m tall at the gable ends of the main ridge.

**鍾馗さん (Shōki-san).** A ~0.20–0.30 m ceramic figure of the demon-queller stands on the hisashi
roof above the door of many Kyoto machiya, facing the neighbour's roof. `[HIGH]` (it is a named entry
in the 京町家作事組 glossary). Height is `[UNKNOWN] — suggest 0.25 m` because it is hand-sized in
every photograph. Sprinkle at ~15–25 % of machiya; it is a strong Kyoto-specific signal.

**腰葺 (koshibuki).** Copper or board sheeting on the lower part of a roof with tile above, meeting
at an 一文字瓦. Used on gates, verandas and wet-room roofs — good variety for outbuildings. `[HIGH]`
https://sakujigumi.com/sakujiwiki/koshibuki

### 2.5 格子 (kōshi) — the lattice

**The one hard dimensional source found** is the 酒屋格子 spec, which by the same source is also the
构造 of 米屋格子:

> 「2.4寸×1.4寸の立子を、2.4寸間隔に立て、2.7寸×三分の貫で留めた粗格子に紅殻塗されたもの。」
> — DigiStyle京都 第7回 京町家のデザイン（その1）, 富永りょう (京都芸術デザイン専門学校),
> citing 『京の町家』淡交社 / 『格子の表構え』学芸出版社 `[MED, cited to two published books]`
> http://www.digistyle-kyoto.com/study/culture/machiya/machiya07.html

Converted:

```
SAKAYA_KOSHI:
  tateko (batten) section : 2.4 sun x 1.4 sun = 72.73 mm (deep, into the room) x 42.42 mm (face width)
  tateko clear gap        : 2.4 sun          = 72.73 mm
  tateko pitch (c/c)      : 2.4 + 1.4 = 3.8 sun = 115.15 mm     [DERIVED]
  nuki (horizontal rail)  : 2.7 sun x 3 bu   = 81.82 mm x 9.09 mm
  finish                  : 紅殻塗 (bengara)
  battens per Kyoma ken   : 1969.7 / 115.15 = 17.1 -> 17 battens per ken   [DERIVED]
```

Note the batten is **deeper than it is wide** (72.7 deep × 42.4 face) — this is the whole optical
trick of a machiya lattice: from straight on you see through it, from an oblique angle it closes to
a solid wall, giving the "see out, not in" effect. Model the batten as a rectangular prism with the
long axis normal to the facade. **Do not use square battens.**

**The trade variants.** These differ mainly in the 切子 (kiriko) — the upper part of selected battens
is *cut short* to open a light slot near the top, and the number of full battens between cut ones
encodes the trade.

| Type | Distinguishing rule | Flag |
|---|---|---|
| **糸屋格子** (thread/cord/kimono shops) | Battens cut short at top to admit light so colours can be judged. Cut pattern is the trade signature: **織屋 4本切子, 糸屋・紐屋 3本切子, 呉服屋 2本切子** — i.e. cut every 4th / 3rd / 2nd batten | `[MED]` DigiStyle, cited to books |
| **酒屋格子** (sake) | Coarse, heavy: section and spacing as the table above; **bengara-painted**; strong enough to take a rolled sake barrel against it | `[MED]` |
| **米屋格子** (rice) | *Structurally identical to 酒屋格子* but **left as bare timber (木地のまま)** and with a **doubled bottom 貫 (rail)** because rice bales are stacked against it | `[MED]` |
| **炭屋格子** (charcoal) | 板子格子 — much **narrower gaps** (板 boards rather than open slots) so charcoal dust does not blow out | `[MED]` |
| **麩屋格子** (fu / yuba / tofu / konnyaku — wet trades) | 出格子 with a **boarded lower panel (腰板張り)** to stop water splashing onto the street; oil-paper in the shoji behind | `[MED]` |
| **仕舞屋格子** (non-commercial house) | The plain default | `[MED]` |

**Generator rule:** pick a trade, then set `kiriko_every = {4: oriya, 3: itoya/himoya, 2: gofukuya,
0: none}`. Cut length `[UNKNOWN] — suggest cutting the top 0.45 m` of the affected battens, because
the slot must clear the shopkeeper's sightline over goods, i.e. sit above ~1.2 m.

**Overall lattice height** `[UNKNOWN] — suggest 1.73 m (the 内法 head height)` because the lattice
sits between the sill and the kamoi, and every other opening in the building is set out to that line.

### 2.6 出格子 (degōshi) — the projecting lattice bay

> 「町家の1階、オモテの柱通りより外に突きだした形式の格子をいう。格子のあるミセの部分をコシの間
>  ともいう。もともとの平格子に増築されたものが多い。軒の腕木の支持をするものはさらに時代を下る。」
> `[HIGH]` https://sakujigumi.com/sakujiwiki/degoushi

Two generations, which is useful for variety:
1. **Early degōshi** — a bay bolted onto an existing 平格子 (flat lattice), carrying nothing.
2. **Later degōshi** — additionally **supports the 腕木 (udegi, eave bracket arms)** of the hisashi.
   This one has visible bracket arms landing on its head.

**Projection depth: `[UNKNOWN]` — no measured figure found. Suggest 0.30–0.45 m (1尺 to 1尺5寸).**
Reasoning: (a) it must not exceed the 犬走り strip it stands over, or it blocks the public way;
(b) the Gion district rules require 駒寄せ/犬矢来 *outside* the degōshi within the same 犬走り;
(c) 1 shaku = 0.303 m and 1尺5寸 = 0.455 m are the two dimensions a carpenter would actually reach
for. Prefer **0.303 m** for the non-load-bearing type and **0.455 m** for the udegi-supporting type.

### 2.7 虫籠窓 (mushikomado)

The plastered lattice window in the tsushi-nikai front wall — the single most recognisable machiya
feature after the lattice.

**Construction** `[MED]`:
> 「四寸角の材を六割にしたものに、縄を巻き付けたものを縦格子とし、土を塗りこめてつくる。」

- Core bar: a **4寸角 (121.2 mm square)** timber **split into 6** → each core ≈ **121.2 mm deep ×
  20.2 mm wide**. `[DERIVED from the quoted craft description]`
- Each core is **wound with rope** to key the plaster, then **plastered solid (塗りごめ)** in
  しっくい/土. The *visible* bar is therefore much fatter than the timber core.
- Finished visible bar: `[UNKNOWN] — suggest 45–60 mm wide × projecting 30–50 mm` from the wall face,
  because rope + two plaster coats over a 20 mm core lands there and it matches the chunky,
  soft-edged look in photographs. **Bars must be modelled with rounded arrises, not sharp** — they
  are plaster, not joinery.
- Gap between bars: `[UNKNOWN] — suggest 60–75 mm`, i.e. roughly bar-width to 1.5× bar-width; the
  window reads as roughly 50 % open.

**Shape by period — implement as an era selector** `[MED]` kyototuu.jp:

| Period | Shape |
|---|---|
| mid-Edo | **木爪形 (kizume/mokkō-gata)** — lobed, cusped top edge |
| late Edo | **横長楕円 (horizontal oval)** |
| Meiji | **長方形 (plain rectangle)** |
| Taishō | **縦長長方形 (taller, upright rectangle)** |

**Size and position** `[UNKNOWN]` — no measured example found. **Suggested values with reasoning:**
```
mushikomado_w   = 0.95 m   # = half a Kyoma bay clear (3.15 shaku). Openings are set out on the
                           # module, and one window per half-bay is what the photographs show.
mushikomado_h   = 0.60 m   # tsushi ceiling is only 1.73 m (measured, Sugimoto-ke); the window must
                           # sit clear of the floor and clear of the wall plate, leaving ~0.6 m
mushikomado_sill = 0.65 m above tsushi floor       # eye height for someone kneeling, which is the
                                                   # documented use of the space
bar_count       = 9 to 13 (odd)                    # 0.95 m / (55 + 65) mm pitch = 7.9; with end
                                                   # margins, 9-13 reads correctly. Use odd counts.
```
Typically **1 window per half-bay, i.e. 2 windows on a 2-ken frontage, 3 on a 3-ken.** `[DERIVED]`

### 2.8 犬矢来 (inuyarai)

The bent-bamboo fender at the wall base. **Note carefully:** the preservation plans treat 犬矢来 and
駒寄せ as *different* elements with *different* district requirements — see §3.

**Purpose** (matters for placement): 「建物のオモテにある竹を曲げた覆い。犬（や人）の用便で建物が
傷むのを避ける。大塀作りや料理屋に見られる。軒下で立ち聞きを避けるとの説もある。」 `[HIGH]`
https://sakujigumi.com/sakujiwiki/inuyarai — so it belongs on **大塀造 walled houses and restaurants
/ ochaya**, not on every machiya.

| Quantity | Value | Flag |
|---|---|---|
| Height | **800 mm standard** ("the most beautiful silhouette"), adjustable **700–900 mm** | `[MED]` store.takenosuke.com/pages/inuyarai |
| Depth (projection from wall at the base) | **300 mm** | `[MED]` same source family |
| Profile | A single smooth convex curve, leaning out from the wall; the bamboo is **bent**, not straight | `[HIGH]` |
| Bamboo | `[UNKNOWN] — suggest 割竹 (split bamboo) 30–40 mm face width`, because standard 真竹 for fences is 40–60 mm dia. and split-in-half gives 20–30 mm; whole round bamboo versions also exist | |
| Spacing | `[UNKNOWN] — suggest butt-jointed, ~2–4 mm gap` (they read as a continuous ribbed surface, not a picket fence) | |
| Binding rails | `[UNKNOWN] — suggest 3` horizontal binders (top, mid, bottom) lashed with **black 棕櫚縄 (shuro rope)** | |
| Colour | Fresh: pale straw-yellow. **Weathered Gion inuyarai are near-black** from soot/oil/age — model both. | `[MED]` takesada-shoten.co.jp「京都の町家景観を守る黒い犬矢来」 |

**Geometry recipe:** sweep a set of ~30 mm-wide strips along a circular arc of **radius ≈ 0.75 m**
whose chord runs from the wall at +0.80 m down to a point 0.30 m out at grade. `[DERIVED]` — that arc
passes through both stated endpoints with a natural bamboo curvature.

### 2.9 駒寄せ (komayose)

> 「軒下を囲う柵。本来は馬や牛を繋ぐ仮設的な架構だが、京都の都心では、公の軒下空間の専用使用を
>  アピールするためのものとなった。」 `[HIGH]` https://sakujigumi.com/sakujiwiki/komayose

A **straight timber fence** (not curved, not bamboo) standing off the facade to claim the eave strip.
This is the Gion Shinbashi *default*, not the inuyarai. Dimensions `[UNKNOWN]` — **suggest posts
90 mm square at 0.90–1.00 m centres (i.e. on the half-ken), height 0.75–0.90 m, 2–3 horizontal rails
of 60 × 30 mm, standing 0.30–0.45 m off the wall face**, because it must match the inuyarai it
substitutes for and sit within the same 犬走り strip.

### 2.10 The facade's small wall elements

| Element | What it is | Dimension | Flag |
|---|---|---|---|
| **幕掛け / 幕板 (makukake)** | The horizontal member spanning under the hisashi 出桁, from which the shop curtain hangs; also called 水引框 | `[UNKNOWN] — suggest 180–240 mm deep × 30–40 mm thick`, spanning the full frontage at the hisashi soffit | def. `[HIGH]` sakujigumi/makukake |
| **袖壁 (sodekabe)** | Short return wall at the frontage edge, often plastered, sometimes tiled on top (袖卯建) | `[UNKNOWN] — suggest 0.45–0.90 m projection × full 1F height`, sized to a half-ken or a quarter-ken | |
| **卯建 (udatsu)** | Fire wall rising above the roof at the party line. Rarer in Kyoto than in Mino/Tokushima but present | `[UNKNOWN] — suggest 0.6–1.0 m above the roof plane, 0.3 m thick, tile-capped`; use on ≤10 % of buildings | named entry `[HIGH]` sakujigumi/udatsu |
| **大戸 (ōdo)** | The large sliding entrance door to the toriniwa, with a small くぐり戸 wicket in it | `[UNKNOWN] — suggest 1 bay wide (1.91 m clear) × 1.90–2.10 m high`, with a 0.60 × 1.40 m wicket | named entry `[HIGH]` |
| **バッタリ床机 (battari shōgi)** | Fold-down display bench under the eave, hinged up flat against the facade when not in use | `[UNKNOWN] — suggest 0.40 m deep × 0.45 m high × 1–2 ken long` | `[HIGH]` sakujigumi/battarishougi |
| **延石 / 葛石 (nobeishi)** | The dressed **granite (御影石)** sill stone the posts and earth wall sit on, at the facade and along the toriniwa; 2 or 3 faces dressed | Thickness in rich houses is large; in rental machiya **under 60 mm**. Set the post base **0.10–0.20 m above grade** on it. | `[HIGH]` sakujigumi/nobeishi |
| **ひとつ石** | An undressed field stone set directly under a post, below the nobeishi | — | `[HIGH]` |
| **犬走り** | The finished strip of ground between facade and street. Sannenzaka: **exposed-aggregate gravel (洗出し砂利)**. Gion Shinbashi: **川砂洗出し or floated mortar**. | `[UNKNOWN] width — suggest 0.45–0.75 m` (it must contain the inuyarai's 0.30 m plus the door swing) | material `[HIGH]`, both preservation plans |

### 2.11 通り庭 (tōriniwa) — the through passage

> 「町家の表から裏へと通された土間をいう。町家の南か東に配される。ミセニワ、ゲンカンニワ、ハシリ
>  （ニワ）の総称。」 `[HIGH]` https://sakujigumi.com/sakujiwiki/tooriniwa

- **It runs the full depth of the plot, unbroken, at street level, on beaten earth (土間).**
- **Orientation rule you can encode:** it is placed on the **south or east** side of the plot. `[HIGH]`
  This is a genuine, checkable constraint — do not randomise the side.
- Width: `[UNKNOWN]` no measured figure found. **Suggest 1 Kyoma bay clear = 1.909 m**, or
  **1.5 bays = 2.86 m** for a big merchant house, because the plan type is 一列三室型 — a single row
  of three rooms *parallel to* the toriniwa — so the toriniwa is one structural bay wide by definition.
  A 2-ken (3.94 m) frontage is then ~1.9 m toriniwa + ~2.0 m rooms, which is exactly why 2 ken is the
  minimum workable frontage.
- Over the ハシリ (kitchen end) is the **火袋 (hibukuro)**: a full-height open shaft through the roof
  with a **煙出し (smoke vent)** on top, used for smoke, fire-break and daylight. `[HIGH]` This is a
  visible roof feature — put a small raised monitor/vent box on the rear roof slope.
- Plan type: **一列三室型** (ミセ + ダイドコ + 座敷 in a row beside the toriniwa). Widens to a
  two-row type when frontage grows; deepens to four rooms and then to 表屋造. `[HIGH]`
  https://sakujigumi.com/sakujiwiki/ichiretsusanshitugata

### 2.12 Colour and finish

| Surface | Treatment | Notes | Flag |
|---|---|---|---|
| Plaster wall, mushiko type | **漆喰 (shikkui) lime plaster or プラスター** | off-white to warm cream. Weathers grey-buff and streaks below the mushikomado | `[HIGH]` Sannenzaka plan |
| Plaster wall, hon-nikai type | **京壁 (Kyō-kabe)** earth plaster | ochre-to-olive earth tones, sanded texture; distinctly *not* white | `[HIGH]` Sannenzaka plan |
| Plaster wall, sukiya type | **聚楽壁 (Jurakukabe)** | warm grey-brown, finest texture of the three | `[HIGH]` |
| Exposed timber, general | **べんがら塗り (bengara)** or **生地仕上げ (bare)** | see below | `[HIGH]` both plans |
| Exposed timber, Ishibei-kōji | **生地仕上げ or 古色仕上げ (kojiki — artificially aged)** | greyer, no red | `[HIGH]` Sannenzaka plan |
| Posts | **檜 (hinoki)**, grade 1等上小節 | pale, tight-grained; goes silver-grey unpainted | `[HIGH]` |

**弁柄 / 紅殻 (bengara) — get this right, it is the colour of Gion.**

> 「古くから用いられた赤色顔料で、16世紀頃にインドのベンガル地方から渡来したためベンガラと呼ばれる。
>  目的は木材の美装と保護であるが、美装に重きをおく。**あまり赤味を出さず**、素木の座敷や正式な
>  ゲンカン以外の全ての木部に塗られ、あまり肌のきれいではない松や節のある木のぼろ隠しの面がある。」
> `[HIGH]` https://sakujigumi.com/sakujiwiki/bengara

Two things a renderer must take from that: (1) **"あまり赤味を出さず" — it is NOT a bright red.**
It is an iron-oxide *ochre*, dark, brown-leaning, matte, and it sits *in* the timber grain rather
than covering it. (2) It goes on **everything except** the bare-timber formal rooms and the formal
entrance — so a bengara facade with a bare-timber genkan is correct, not an inconsistency.

**Published bengara colour values.** Several Japanese colour dictionaries do publish
弁柄色 / 紅殻色, and they cluster — but they disagree by about 1.5 Munsell value steps, so both
clusters are given: `[MED]`

| Source | Munsell | HEX | RGB |
|---|---|---|---|
| **i-iro.com** | **8R 3.5/7** | **`#8F2D12`** | 143, 45, 18 |
| colordic.org | — | `#8F2E14` | 143, 46, 20 |
| irocore.com | — | `#8F2E14` | — |
| astris.design | 8R 3.5/7 | `#8A4031` | 138, 64, 49 |
| color-site.com | — | `#892F1B` | 137, 47, 27 |
| color-sample.com | — | `#863E33` | 134, 62, 51 |
| **JSA 日本規格協会** | **8R 5/7** (lighter) | — | — |
| Wikipedia-JA ベンガラ, as JIS 代赭色 | **2.5YR 5/8.5** (lighter, more orange) | — | — |

**RECOMMENDED:**
```
BENGARA_BASE    = #8F2D12   # Munsell 8R 3.5/7 -- fresh stain, the body colour
BENGARA_WEATHER = #8A4031   # sun-faded / greyed south elevations
BENGARA_SOOT    = #5A2617   # under eaves and on the lower lattice
```
The **darker cluster (#8F2D12) matches Gion photography better** than the JSA/JIS lighter values.

**⚠ Kyoto City's landscape ordinance for these districts specifies NO Munsell colour range** — the
full text of the design standards contains no 色彩 / マンセル / 彩度 / 明度 clause. The colour is
governed by the "真壁造り + historical style" requirement, not by numbers. So you have latitude, but
stay in the iron-oxide family.

**Keep bengara and 朱 (shrine vermilion) clearly separated — they are the two reds in this project
and confusing them is the single most likely rendering error.** Yasaka's gate is 朱 ≈ `#EB6101`
(7.5R 5.5/14), roughly **twice the chroma** of bengara. A Gion facade painted at shrine chroma will
look instantly wrong.

---

## 3. Gion ochaya / Hanamikoji facades

### 3.1 The governing document

The Gion Shinbashi Important Preservation District plan (昭和51年7月1日京都市告示第70号,
https://www.city.kyoto.lg.jp/tokei/page/0000281763.html) is the legal definition of an ochaya facade.
`[HIGH]` It applies to Shinbashi rather than Hanamikoji itself, but Hanamikoji's south block is the
same building stock and the same 本2階建町家茶屋様式 type.

- District established as the **祇園内六町 teahouse quarter in 正徳2年 (1712)**. `[HIGH]`
- **≈75 buildings** in the district; **≈70 %** are designated traditional. `[HIGH]`
- It names **eight** facade types. The canonical ochaya is **本2階建町家茶屋様式**.

### 3.2 本2階建町家茶屋様式 — the ochaya, spec verbatim

Structure: 「木造真壁造りで、2階建とし、平入り形式とすること。**2階の縁側は、張出しとすること。**」
— exposed-post timber frame, two full storeys, ridge parallel to street, and the **2F veranda must be
cantilevered out beyond the wall line.** `[HIGH]` That overhanging first floor is the defining
massing move of an ochaya and it is a hard requirement, not a stylistic option.

| Element | Requirement | Flag |
|---|---|---|
| Main roof | 切妻 gable, Japanese tile, soffit shows **rafters + boarding**, and must carry a **すだれ掛 (sudare hanger)** | `[HIGH]` |
| Hisashi | Japanese tile with **一文字軒先がわら** (straight-line eave tile), soffit shows boarding | `[HIGH]` |
| Wall | **京壁 (Kyō-kabe earth plaster)** | `[HIGH]` |
| 1F | **出格子 or 平格子**, 引込みガラス格子戸 (sliding glazed lattice door), **腰竪羽目板 or 腰下見板張り** wainscot, **戸袋** | `[HIGH]` |
| 2F | **手すり付き掃き出し窓** (full-height window with a railing), **欄間** transom, **戸袋**, and **すだれ hung** | `[HIGH]` |
| 犬走り | **駒寄せ must be provided** | `[HIGH]` |
| Timber | 檜, and finished **べんがら塗り or 生地仕上げ** | `[HIGH]` |
| 犬走り finish | **川砂洗出し** (river-sand exposed aggregate) or floated mortar | `[HIGH]` |

**Variant types to mix in along the street** (each is a real designated type, so this gives you
legitimate variety rather than invented noise) `[HIGH]`:

| Type | Distinguishing feature |
|---|---|
| 本2階建町家**住居**様式 | Ordinary house: 2F has 肘掛け付きガラス窓 + 長押 + sudare **or** 出格子/平格子 窓 + 長押. **駒寄せ** required. |
| 本2階建町家**川端茶屋**様式 | The Shirakawa-canal-facing backs. Roof may be 切妻 **or 入母屋**. 1F **and** 2F both 手すり付き掃き出し窓 + 欄間 + 戸袋 + sudare. **A 目隠しへい (privacy screen wall) in front of the 1F.** |
| 本2階建町家**数寄屋風**様式 | 聚楽壁; 1F has 下地窓, **丸竹組格子 (round-bamboo lattice)**, 腰割竹皮張り or 腰杉皮張り. **犬矢来 required here — not 駒寄せ.** |
| 本2階建町家**へい造り**様式 | 1F reads as a **roofed boarded wall (屋根小壁付き羽目板へい)** with a hisashi'd glazed lattice door and a **つり出し格子窓 (hung-out lattice window)** + 飾り欄間. **駒寄せ.** |
| 本2階建町家**高へい造り**様式 | As above but with an added **目隠しへい above the hisashi** — the tallest, most closed facade on the street. |
| 本2階建町家**飾窓付店舗高**様式 | Shop: 町家風飾窓 + 腰高ガラス引違戸; 2F 出格子窓/平格子窓 + 長押. Hisashi carries a **幕掛け**. |
| 和風邸宅様式 | 入母屋 roof, 平屋 or 2 storeys, gated. |

### 3.3 The five signature elements, with numbers

1. **弁柄 (bengara) timber.** See §2.12. Dark iron-oxide brown-red, low saturation, matte, grain
   showing. `[HIGH]` for the material, `[UNKNOWN]` for RGB (suggestion given).

2. **駒寄せ (komayose)**, not 犬矢来, is the Gion Shinbashi default — the plan requires 駒寄せ on the
   住居/茶屋/へい造り types and **犬矢来 only on the 数寄屋風 type**. `[HIGH]` Most photographic
   "Gion inuyarai" are on restaurants and sukiya-style frontages, which is consistent. Dimensions in
   §2.8–2.9.

3. **簾 (sudare).** The plan makes sudare **mandatory** on the 2F of the chaya, 川端茶屋, 数寄屋風,
   へい造り, 高へい造り and 和風邸宅 types, and requires a **すだれ掛 (hanger rail) built into the
   eave** of the main roof. `[HIGH]` Dimensions `[UNKNOWN] — suggest`: reed blinds **0.90 m wide
   (half-bay) × 1.60–1.80 m drop**, hung in a continuous row across the 2F, reed diameter 3–4 mm,
   colour ranging pale straw (new) to deep tobacco brown (old). Hang them at ~85–95 % drop, not fully
   down — the gap under a sudare is what makes an ochaya look occupied. Some have a **hand-painted
   house crest or the ochaya name** on the bottom rail.

4. **The nameplate.** Small wooden or lacquered sign by the door carrying the house name. Dimensions
   `[UNKNOWN] — suggest 0.12 × 0.40 m` for the door plate; larger houses add a lacquered
   **招牌** board. Ochaya are famously discreet: **no shop windows, no menus, no illuminated signage.**
   The absence of commercial signage is itself the strongest visual cue and should be enforced.

5. **The red lanterns (提灯).** Hung in pairs or rows under the eave, bearing the **つなぎ団子
   (tsunagi-dango, "linked dumplings")** crest of the Gion Kōbu district plus the house name.
   **Size — use a real catalogue value, not a guess.** The standard 提灯 range gives
   **9号長型 = Φ0.24 × h0.57 m** and **堂島提灯 = Φ0.34 × h0.66 m** `[HIGH]` (manufacturer specs;
   full table in §4.4). **Use Φ0.24 × 0.57 m for ochaya door lanterns**, hung at **2.4–2.7 m** above
   the pavement, just under the 通り庇 at the ground-floor lintel line `[UNKNOWN — suggested mounting
   height]`. Colour: warm red-orange paper, glowing from a low-wattage lamp; unlit in daylight they
   read as dull vermilion-on-cream.

### 3.4 一力亭 (Ichiriki-tei) — Kyoto City official record `[HIGH]`

From 「京都を彩る建物や庭園」選定番号 第10−029号 / 認定番号 第197号,
kyoto-irodoru.city.kyoto.lg.jp/higashiyama/ichirikitei.html

**Position: 「四条通と花見小路の角」 — the SE corner of Shijō × Hanamikoji**, and 「祇園南側の
**大規模な御茶屋**」. It is the largest single frontage on the street.

**Site composition — SIX buildings. This is the massing you need:**

| Building | Storeys | Faces |
|---|---|---|
| **主屋 (main house)** | 2 | **花見小路** |
| **座敷棟 (reception wing)** | 2 | **四条通**, east of the main house |
| **奥座敷棟 (rear reception wing)** | **1 (平屋建)** | southern part of the site |
| **土蔵 × 3** | — | storehouses |

**Room sizes (official; metric `[DERIVED]` at Kyoma 1.822 m²/畳):**
- 座敷棟: a **15畳 zashiki with a 次の間 on EACH of the 1st and 2nd floors** → **27.3 m² each**
- 奥座敷棟: a **20畳「オクノオモ」** plus a 次の間 used as a stage — **the largest space in the
  building** → **36.4 m²**
- 主屋: mostly kitchen and back-of-house; the **台所 is 土間 + 吹抜け with a surviving クド (traditional
  cooking range)**; the 2F has small zashiki including 「新西」 overlooking Hanamikoji

**★ THE RED WALL — the definitive statement:**
> **「一部を除き，各棟ともベンガラを混ぜた赤い土壁が用いられている」** — bengara **MIXED INTO the red
> EARTHEN PLASTER (土壁)**, on all wings.
> **「赤壁が許された3軒のお茶屋のうち，唯一現存している」** — one of only **THREE teahouses ever
> permitted the red wall; the only survivor.**

**Two consequences for the render:** (1) model it as a **matte, slightly uneven earth-plaster surface,
NOT a gloss paint film** — the pigment is in the plaster body; (2) **it is a privilege colour, so no
other building on the street may carry it.** One red wall, and only one.

**Dates:** founded **元禄2 (1689)** as the ochaya 「万屋」; the name comes from splitting 「万」 into
一 + 力. The **座敷棟 was rebuilt in Meiji after the 元治元 (1864) great fire**; the whole complex was
restored **明治3 (1870)** after the Gion fire. **The entrance was originally on the Shijō side and was
moved to the Hanamikoji side in 大正元 (1912)** when the Shijō tram opened — which is why the 主屋 is
a Taishō rebuild. A 主庭 garden lies south of the 奥座敷棟 with 飛石, 伽藍石 and a 蹲.

**Overall footprint `[UNKNOWN]` — suggest Hanamikoji frontage ≈20–25 m, Shijō frontage ≈25–30 m**,
because it is described as 大規模, occupies the full corner, contains six buildings including a 36 m²
room plus three storehouses and a garden, and the measured frontage distribution on the street tops
out at **25.0 m** — almost certainly this building.

### 3.5 Hanamikoji — measured street geometry

| Item | Value | Flag |
|---|---|---|
| **都市計画道路 花見小路通 (Ⅱ・Ⅲ・1)**: 市域延長 **619 m**, 代表幅員 **11 m**, decided 昭22.03.31 (1947) | **11 m PLANNED** | **`[HIGH]`** 京都市 都市計画道路 table |
| **★ Actual built width, historic stone-paved section south of Shijō, building face to building face** | **median 8.4 m** (range 7.1–8.9 m over twelve 20 m slices) | **`[OSM measured]`** |
| Length of the stone-paved section | **266.7 m**, bearing **188.5°** (N–S, tilted 8.5° W of south) | `[OSM]` |
| Total street length (三条通 → 安井北門通) | **≈1 km** | `[MED]` ja.wikipedia |
| Surface | **御影石 (granite) 石畳**, tagged `surface=paving_stones` | `[MED-HIGH]` |
| Paving + undergrounding completed | **2001** vs **January 2002** — **CONFLICT.** Likely completed Dec 2001, opened Jan 2002. | `[MED]` |
| North of Shijō | 2 lanes, 40 km/h, conventional paving — **a different street, do not confuse** | `[OSM]` |
| South of Shijō | residential; one-way for motor vehicles Mo–Su 21:00–04:00 and Sa–Su 09:00–17:00 | `[OSM]` |

> **★ KEY POINT: the 11 m is a 1947 planning line that was NEVER EXECUTED on the historic southern
> stretch — which is exactly why it kept its character. USE 8.4 m face-to-face for the Hanamikoji you
> are reconstructing.** The 11 m applies only to the widened section north of Shijō.

**Carriageway vs total.** Kyoto City's rule for this district is 「1階壁面が道路境界からおおむね
**1.8メートル**以上離れていないこと」 — the ground-floor wall must sit **within ~1.8 m of the road
boundary**. So the legal roadway is between **4.8 m and 8.4 m**; with inuyarai projecting 0.3 m each
side, the **clear walkable width is ≈7.8 m**. **No kerbs, no separated footway** — a single surface
building face to building face. `[HIGH]` + `[DERIVED]`

**Building rhythm — measured from 73 buildings fronting the paved section** `[OSM measured]`:

| Statistic | Value |
|---|---|
| Frontage minimum | 3.4 m |
| p25 | 7.0 m |
| **median** | **7.9 m = 4.01 Kyoma ken = 26.1 尺** |
| p75 | 12.0 m |
| maximum | 25.0 m |
| mean | 9.5 m |
| **Buildings per 100 m, one side** | **12.7** |
| **Buildings per 100 m, both sides** | **25.3** |

**Caveat, stated honestly:** OSM polygons sometimes merge adjacent machiya into one footprint, so this
median is an **upper bound**; true per-house frontage is likely somewhat narrower. A median of exactly
**4 Kyoma ken** is nonetheless very plausible for *ochaya*, which are larger than ordinary machiya —
Kyoto City itself calls Ichiriki-tei a 「大規模な御茶屋」.

**Reconciling with §2.1:** ordinary 京町家 cluster at **2–3 ken (3.9–5.9 m)**; Gion **ochaya** are
bigger, at **4–6 ken (7.9–11.8 m)**. **Model a mix: ~5.4 m ordinary machiya and 7.9–12 m ochaya,
median ~7 m.** A documented worked machiya example is **間口 5 m × 奥行 11 m** `[MED]` JR West.

### 3.6 Kyoto City design standards for the Gion districts — the legal rules `[HIGH]`

From the **祇園町南歴史的景観保全修景地区** design standards,
city.kyoto.lg.jp/tokei/page/0000281263.html

**Districts covered:** Ⅰ 祇園町南側地区 **約6.6 ha** (⚠ **CONFLICT:** the district-plan page states
**6.1 ha**; both are Kyoto City — use 6.1–6.6 ha) · Ⅱ 宮川町地区 約2.1 ha · Ⅲ 八坂通地区 約1.5 ha.

**All three districts:**

| Rule | Value (verbatim) |
|---|---|
| **Building height** | 「建築物の高さは，**15メートル以下**とし，公共用空地から見える部分の高さは，**12メートル以下**とすること」 |
| **★ Roof pitch** | 「屋根勾配は，**3．0／10から4．5／10**の範囲内にあること」 → **16.70° – 24.23°** |
| Roof material | 「屋根材は，**日本瓦，銅板**又はこれらに準じる材料で葺くこと」 |
| Wall position | 「1階壁面が道路境界からおおむね**1．8メートル**以上離れていないこと」 |
| Fence / wall height | 「塀の高さは**1．8メートルから2．5メートル**の範囲内」 |
| Overall design | 「建築物の外観の形態及び意匠は，**真壁造り**を基調とし…」 → **exposed timber frame is MANDATORY** |
| Ground-floor openings | 「和風デザイン」で「**ガラス面を露出しないこと**」 → **no exposed glass at street level** |
| **Street eave** | 「**通り庇**（1階上部の軒庇）を設けること」 → **a tōri-bisashi over the ground floor is REQUIRED** |

**祇園町南側地区 specifically:**

| Rule | Value |
|---|---|
| 3rd-storey setback, **Hanamikoji frontage** | **おおむね 4 m** behind the 2nd-floor wall |
| 3rd-storey setback, other streets | **おおむね 3 m** |
| **軒の出, standard form** | **おおむね 0.9 m 以上** |
| 軒の出, 張り出し2階 (projecting upper storey) | **0.6 m 程度** |
| (宮川町 comparison: setbacks 2.7 / 1.8 m, eaves 0.6 / 0.4 m; 八坂通: eaves 0.9 m) | |

**⚠ ROOF-PITCH CONFLICT, and its resolution.** The tile makers specify a recommended
**推奨屋根勾配 4/10 以上、6/10 以下 (21.8°–31.0°)**, but the Gion ordinance mandates
**3.0/10 – 4.5/10 (16.7°–24.2°)**. The overlap is narrow: **4.0/10 – 4.5/10 = 21.8°–24.2°**.
**MODEL GION ROOFS AT 4/10 (21.8°) — it is the only pitch that satisfies both.** Finish:
**いぶし瓦 (smoked silver-grey)**, not glazed.

**★ THE RHYTHM RULE — do not randomise eaves heights.** The official Gion Shinbashi citation states
**「隣り合う庇は同高で統一感がある」 — adjacent eaves are at the SAME height.** Kyoto sources describe
walking the street and seeing 「勾配を同じくした平入りの大屋根が、隣とわずかに高さを変えながら、
重なり合うように」 — **same pitch, only SLIGHTLY varying height, overlapping.** Step ridge heights by
**±0.4 m** at most and hisashi heights by **±0.15 m**, and keep the 通り庇 line continuous.

**Storey heights — not specified in the ordinance, `[UNKNOWN]`. Suggested build**, reasoning from the
15 m cap, the mandatory tōri-bisashi, and the 厨子二階 / 総二階 distinction:

```
1F floor to the tori-bisashi line   2.7 - 3.0 m   # bisashi just above the ground-floor lintel
tsushi-nikai (low attic storey)    +1.8 - 2.2 m   # -> EAVE HEIGHT 5.0 - 5.5 m
so-nikai (full 2nd storey, ochaya) +2.7 - 3.0 m   # -> EAVE HEIGHT 6.0 - 6.5 m
ridge = eave + (half frontage x pitch)
     at 7.9 m frontage and 4/10:  3.95 x 0.4 = 1.58 m  ->  RIDGE 7.6 - 8.1 m
```
These bracket the general Japanese two-storey norms (軒 6–7 m, 最高 7–9 m; storey height 2.8–3.0 m;
ceiling 2.4–2.6 m `[MED]`) and stay well under the 12/15 m cap. **They supersede the rougher estimates
in §2.2 for Gion specifically.**

### 3.7 The official facade description — 祇園新橋, verbatim `[HIGH]`

Gion Shinbashi is the 重要伝統的建造物群保存地区 immediately north, and its official record is the
best-documented statement of the Gion ochaya facade in existence. It applies directly to Hanamikoji's
building type. online.bunka.go.jp/heritages/detail/158865

> **選定 1976-09-04 · 面積 1.4 ha · 種別 茶屋町**
> **「茶屋の建物は切妻造桟瓦葺、平入二階建てで元治２年（1865）大火直後の建築。一階は千本格子、
> 二階は縁を出し「すだれ」を掛ける。隣り合う庇は同高で統一感がある。」**

A fuller variant `[MED]`:
> **「お茶屋の造りは切り妻、瓦葺きの本二階建て、一階は千本出格子に駒寄せ、二階は座敷で表に張り出し縁や
> 格子手摺を付け年中すだれを掛けた町屋が並ぶ」**

**BUILD THE FACADE TO THIS, top to bottom:**
1. **切妻造 (gabled), 桟瓦葺 (pantile), 平入 (entry on the long eaves side).** Never irimoya, never
   gable-entry.
2. **本二階建て (full two storeys)** — **ochaya are 総二階, NOT 厨子二階.** Do not give them the low
   Sannenzaka attic storey.
3. **2F: a PROJECTING balcony (張り出し縁) with a 格子手摺 lattice balustrade, and 簾 (sudare) hung
   YEAR-ROUND** — 「年中すだれを掛けた」 is explicit. The 2F is a 座敷 (tatami reception room).
4. **1F: 千本出格子 (sembon-degoshi — fine-pitch PROJECTING lattice) + 駒寄せ (komayose).**
5. **通り庇 over the ground floor, at the SAME height as the neighbours'.**
6. **真壁造 exposed frame; NO exposed glass at street level.**

**⚠ CONFLICT — 駒寄せ vs 犬矢来.** Some Kyoto trade sources say they are the same object under two
names (「「犬矢来」とは…「駒寄（こまよせ）」とも呼ばれています」). **The preservation plans do NOT
treat them as synonyms:** the Gion Shinbashi plan requires **駒寄せ** on the 住居 / 茶屋 / へい造り
types and **犬矢来 only on the 数寄屋風** type — two different clauses for two different objects. The
street-furniture sources agree they differ physically (**curved bamboo 800 mm vs straight timber
1000–1500 mm** — see §7.8). **Treat them as distinct, and follow the preservation plan's assignment.**

### 3.8 千本格子 / 出格子 — the fine lattice

- **千本格子 (sembon-goshi)** is the **finest-pitch** variant, and it is the ochaya lattice.
  **出格子 (degoshi)** = the projecting form (also 台格子 / 釣格子); the flat form is 平格子.
- **Bar spacing: ≈28 mm** `[MED]` digistyle-kyoto. Compare the merchant 酒屋格子 at a **115 mm pitch**
  (§2.5) — the ochaya lattice is **four times finer**. This contrast is the main thing separating a
  Gion frontage from a Sannenzaka shopfront.
- **Member section `[UNKNOWN]` — suggest 見付 24 mm (8分) × 見込 36 mm at 45 mm centres (21 mm gaps)**,
  because 千本格子 by definition uses the narrowest common stock (the same 8分 grade the bamboo trade
  prices) and a ~2:1 solid-to-gap ratio at the fine end produces the documented
  **near-opaque-from-outside / transparent-from-inside** effect. Reconcile with the 28 mm figure by
  treating 28 mm as the **gap** on the very finest examples.
- **出格子 projection `[UNKNOWN]` — suggest 300–450 mm**, matching the inuyarai's 300 mm; the komayose
  sits directly beneath it and must protect it.
- **★ 虫籠窓 (mushikomado) belongs to 厨子二階 machiya, NOT to the 総二階 ochaya facade. OMIT it on
  Hanamikoji ochaya** — use the **格子手摺 balcony** instead. This is a common and very visible error.

### 3.9 犬矢来 — trade standard dimensions `[HIGH]`

| Item | Value |
|---|---|
| **Standard height** | **800 mm** — three independent trade sources agree |
| **Standard depth / projection** | **300 mm** |
| Basic stock size (alternative) | **H 600 × W 900 × D 300 mm** |
| **Bamboo strip width (割竹, split bamboo)** | **1寸 = 30.3 mm** or **8分 = 24.2 mm** — the two priced grades |
| Round bamboo (丸竹) diameters | 4分 ≈12 · 5分 ≈15 · 6分 ≈18 · 7分 ≈21 mm |
| Anything over 800 mm H or 300 mm D | custom-priced — so 800 × 300 really is the norm |
| Form | **アーチ状 (arched)**; craftsmen compete on the radius of the アール部分 |

**Modelling spec `[DERIVED]`:** strips of **30.3 mm** split bamboo laid side by side with a **2–3 mm
gap** (≈33 mm pitch → **≈27 strips per metre of run**), bent to a convex arc from the wall base out
and up to 800 mm, projecting 300 mm, lashed with **3 horizontal bindings**. **Curve radius
`[UNKNOWN]` — suggest R ≈ 900 mm**, which produces the standard 800 × 300 envelope as a circular arc.

### 3.10 Signage and the small stuff

| Item | Value | Flag |
|---|---|---|
| **提灯** | Red lanterns bearing the **つなぎ団子 (tsunagi-dango)** crest of Gion. **Φ0.24 × h0.57 m (9号長型)** at **2.4–2.7 m** above the pavement, under the 通り庇 | size `[HIGH]`, height `[UNKNOWN — suggested]` |
| **表札 / nameplate** | **`[UNKNOWN]` — suggest 120 × 300 mm** dark timber with incised text at ~1.6 m beside the entrance. **Ochaya are famously discreet and use NO shop signage** — the absence is the signal | |
| **駒形の高札** | The "no photography on private roads" notice boards installed on Hanamikoji's side lanes: **縦約60 cm × 横約50 cm** — a real, datable (2017) street-furniture detail | `[MED]` 産経 2017-11-08 |
| **簾 (sudare)** | **`[UNKNOWN]` — suggest 1.8 m wide × 1.2 m drop** per bay, sized to one Kyoma bay; hung **year-round** on the 2F balcony (the official record says so explicitly) | |

### 3.11 Generator recipe for a 100 m Hanamikoji block

```python
STREET_WIDTH_FACE_TO_FACE = 8.4     # m, MEASURED. Not the 11 m planning line.
WALL_SETBACK_MAX          = 1.8     # m, statutory
CLEAR_WALKABLE            = 7.8     # m, after 0.3 m inuyarai each side
NO_KERB = True                      # single surface, granite paving
NO_OVERHEAD_WIRES = True            # undergrounded 2001

for each plot:
    frontage = choice([5.4, 5.4, 7.0, 7.9, 7.9, 9.5, 12.0])   # machiya .. ochaya mix
    type     = weighted(chaya 0.40, jukyo 0.20, heizukuri 0.15,
                        sukiyafu 0.10, kazariMado 0.10, wafuTeitaku 0.05)
    two_storey            = True    # so-nikai; NO mushikomado, NO tsushi
    second_floor_overhang = 0.45    # m, mandatory cantilevered engawa
    hisashi_h = 2.85                # m, +/- 0.15 ONLY -- must line through with neighbours
    eave_h    = 6.25                # m, +/- 0.20
    ridge_h   = eave_h + frontage/2 * 0.40      # 4/10 pitch
    roof_pitch = 21.8               # deg -- the only value satisfying BOTH the
                                    # ordinance (16.7-24.2) and the tile spec (21.8-31.0)
    tile      = "ibushi sangawara, 265x235 mm working"
    koshi     = "senbon-degoshi, ~28 mm gaps, projecting 0.30-0.45 m"
    sudare on 2F if type in {chaya, kawabata, sukiyafu, heizukuri, wafuTeitaku}
    komayose unless type == sukiyafu, in which case inuyarai (800 x 300 mm, R900 arc)
    timber = BENGARA_BASE unless type == ishibeikoji, then aged grey
# EXACTLY ONE building on the whole street gets the red earthen wall: Ichiriki-tei,
# on the SE corner of Shijo. It is a legal privilege, not a style choice.
```

---

## 4. Yasaka Shrine (八坂神社)

### 4.0 THREE CORRECTIONS TO COMMON ASSUMPTIONS — read before modelling

| Common assumption | **Actual** | Flag / source |
|---|---|---|
| 西楼門 is **入母屋造, 檜皮葺** | **切妻造、本瓦葺** — gabled, formal tile. It *was* hiwadabuki at the 1497 rebuild; changed to tile in the 永禄 era (1558–70) | `[HIGH]` kunishitei 00005348 |
| The 翼廊 side wings were added **1913** | **翼廊 built 大正14 = 1925.** 1913 (大正2) is when the **gate itself was moved 6 m east and 3 m north** for the Shijō widening | `[HIGH]` kunishitei 00005345 + yasaka-jinja.or.jp |
| 本殿 is the **1654 rebuild by Iemitsu** | 1654 (承応3), but by the **4th shōgun Tokugawa IETSUNA (家綱)**, not Iemitsu | `[HIGH]` kunishitei 102/1791 |

Also: **the 石鳥居 is the formal main entrance (正門)**, and before Meiji the **南楼門** was the main
gate. The famous 西楼門 on Shijō has **never** been the main gate. `[MED]` — relevant if you are
staging approach shots or laying out the processional axis.

Almost the entire precinct was designated **重要文化財 on 2020-12-23**, with the **本殿 raised to 国宝**
on the same date. The 西楼門 and 石鳥居 were already ICP from **1911-04-17**. `[HIGH]`

### 4.1 西楼門 (Nishi-Rōmon, West Gate — ICP, 1497)

**Official record `[HIGH]`** kunishitei.bunka.go.jp/bsys/maindetails/102/00005348:
> **構造及び形式:「三間一戸楼門、切妻造、本瓦葺」** · 1棟 · 室町後期 · 明応6 (1497) · 重文 1911.04.17

Three-bay, one-door, two-storey gate; **gabled (kirizuma)** roof; **hongawara** round-and-flat tile.
The record gives **no 桁行/梁間 bay counts** for this gate — unusual, but confirmed in both
government databases.

| Item | Value | Flag |
|---|---|---|
| **桁行 (structural frontage)** | **7.9 m** | `[MED]` |
| **高さ (overall / ridge)** | **9.1 m** | `[MED]`; corroborated as 「約9 m」 by two more sources |
| Roof outline including eaves | **11.7 m (N–S) × 9.0 m (E–W)**, ridge axis 6.1° off N | `[OSM measured]` |
| **Implied eave overhang** | **(11.7 − 7.9)/2 = 1.9 m each side** | `[DERIVED]` |
| **梁間 (structural depth)** | **≈5.2 m** = 9.0 − 2 × 1.9 | `[DERIVED]`, consistent with 梁間二間 at ~2.6 m/bay |
| **Bay module** | 7.9 / 3 = **2.63 m per bay** = 8.7 尺 = 1.34 Kyoma ken | `[DERIVED]` |
| Eave heights (upper/lower) | **`[UNKNOWN]` — suggest lower eave 5.5 m, upper eave 7.4 m**, because a two-storey rōmon splits ~60/40 about the mid-cornice and 9.1 m less ~1.7 m of roof depth lands at 7.4 m | |

**翼廊 (side wings, 1925)** `[HIGH]` kunishitei 00005345 / 00005346:
> **構造及び形式:「桁行折曲がり延長五間、梁間一間、切妻造、本瓦葺」** — one each side.

**「折曲がり延長五間」 means the wing DOG-LEGS (turns a corner) and its developed length is 5 bays.**
This is the key massing fact — **the wings are not straight.** They run out from the gate and turn
back. `[DERIVED]` 5 bays × 2.63 m = **13.2 m developed length each**, depth 1 bay ≈ **2.6 m**.

**Colour — 朱塗 vermilion, with a critical caveat:**
- **No source anywhere gives a measured RGB, Munsell or paint spec for this gate. `[UNKNOWN]`**
- What *is* documented `[MED]` (Japan Color Science Association): the gate reads as **朱色 (shu,
  vermilion) on the timber**, with **緑青色 (rokushō, verdigris green) on the 格子 lattice.** The
  green-against-vermilion complementary pairing is explicitly called out.
  **⚠ DO NOT PAINT THE LATTICE RED.** This is the most commonly botched detail on this building.
- Suggested values (my inference from the sources calling it 朱/丹, not 弁柄):
  **shu-iro ≈ `#EB6101`, Munsell ≈ 7.5R 5.5/14**; weathered / as-repainted-2007 closer to `#C1440E`.
- Restoration: **2007-11-30** completed the first major overhaul in **94 years** — retiling plus a
  full repaint of the vermilion. `[MED]`

**The stone steps on Shijō-dōri (祇園石段下):**

| Item | Value | Flag |
|---|---|---|
| **Number of steps** | **≈20段**, described as a **broad** flight | `[MED]` Gion Shōtengai official, corroborated |
| **Rise / run** | **`[UNKNOWN]` — suggest rise 0.15 m, run 0.40 m**, because 20 × 0.15 = 3.0 m total rise matches the gate platform level, and Japanese shrine approach steps of this "broad and shallow" character run 0.36–0.45 m going. Total horizontal run ≈ 8.0 m. | |
| **Flight width** | **`[UNKNOWN]` — suggest ≈22 m**, matching the street corridor it faces | |
| Street context | **四条通 planned width = 22 m** (都市計画道路 3・3・178 and Ⅰ・Ⅲ・10). **東大路 = 21.82 m (= 72 尺)** | `[HIGH]` 京都市 road table |

The gate faces **west down a 22 m corridor** — that long axial view is the shot everyone photographs.

### 4.2 南楼門 (South Gate, ICP 2020, rebuilt 1879) and 石鳥居 (ICP, 1646)

**南楼門** `[HIGH]` online.bunka.go.jp/heritages/detail/550185:
> **「三間一戸楼門、入母屋造、東西廻廊附属、切妻造、銅板葺」** · 明治12 (1879) · 重文 2020.12.23

| Item | Value | Flag |
|---|---|---|
| 高さ | **≈14 m** | `[MED]` |
| 幅 | **≈9 m** | `[MED]` |
| Footprint incl. attached E–W corridors | **19.3 m (E–W) × 12.9 m** | `[OSM measured]` |
| Corridor length each side | **(19.3 − 9)/2 ≈ 5.2 m** | `[DERIVED]` |
| Bay module | 9 / 3 = **3.0 m per bay** | `[DERIVED]` |

**Roof material history — do NOT model this as hiwadabuki.** It was 檜皮葺 until **1981 (昭和56)**,
when it was re-clad in **銅板葺 (copper sheet)** — so today it carries a green-patinated or
brown-oxidised copper roof, not bark and not tile. Restored **Feb 2016 – 2017** with seismic
strengthening, re-roofing, and a full **丹塗 (red-lead) repaint**. `[MED]`
The gate burned in **1866 (慶応2)** and was rebuilt **1879** — a *Meiji* building in Edo dress, which
is exactly what the 2020 designation citation praises.

**石鳥居 (stone torii, on the 下河原通 / 南楼門 axis)** `[HIGH]` kunishitei 00005349:
> **構造及び形式:「石造明神鳥居」** · 1**基** · 江戸前期 · 正保3 (**1646**) · 重文 **1911-04-17**

| Item | Value | Flag |
|---|---|---|
| **高さ** | **9.5 m** | `[MED]` — three concurring sources |
| **高さ — CONFLICT** | **9.33 m (933 cm)** | `[MED]` kawai24.sakura.ne.jp, a stone-monument specialist site and arguably the more carefully measured. **Report both; use 9.5 m as the headline, 9.33 m as the tolerance floor.** |
| **柱間 (span between pillars)** | **6.8 m** | `[MED]` |
| Stone | **花崗岩 (granite)** | `[MED]` |
| **柱径 (pillar diameter)** | **`[UNKNOWN]` — suggest 0.70–0.78 m, use 0.75 m.** Three independent 木割 rules converge: height/14 = 0.68, height/12 = 0.79, span/9 = 0.76 | `[DERIVED]` |
| **笠木長さ (top lintel length)** | **`[UNKNOWN]` — suggest 9.5–10.2 m**, because a 明神 kasagi normally overruns the pillar span by 1.4–1.5× (6.8 × 1.4–1.5) | `[DERIVED]` |
| ⚠ Reject | An OSM way tags the torii as a **13.48 m** E–W line. **Do not use it** — the mapper appears to have spanned the full path width. | |

**⚠ ON THE "LARGEST STONE TORII IN JAPAN" CLAIM.** Popular sources say 「自然石の鳥居では日本最大級」
and 「江戸時代以前の石鳥居の中で一番大きい」. A specialist torii researcher who ranks them puts Yasaka
**4th by height**, and lists it among the **日本三大石鳥居** with 日光東照宮一の鳥居 and
鶴岡八幡宮一の鳥居. Both statements can be true (largest of its *pre-Edo form*, 4th *overall*).
**Say "one of the three great stone torii of Japan", not "the largest".** `[MED]`

**Construction detail — this is what makes it read correctly in 3D** `[MED]`:
- The **笠石 (top assembly) is split into FIVE stones (五分割)**, and the **笠木 and 島木 are visibly
  DIFFERENT COLOURS** — they came from different quarries. Model them with different albedo.
- **Each pillar is two stones joined (上下二石)** — there is a visible horizontal joint partway up
  each column.
- The **笠木 ends are cut at an ACUTE angle (鋭角)** — an early-Edo signature.
- The **笠木 curves sharply (反り増し) from about 1/3 of its length outward; the 島木 is nearly
  horizontal.** This distinguishes it from Sumiyoshi Taisha, where both members curve gently.
- History: collapsed in the **1662 (寛文2)** earthquake, re-erected **1666 (寛文6)**. The Gion Matsuri
  mikoshi pass through it.

### 4.3 本殿 (Honden — National Treasure 2020, 1654, 祇園造)

**The published National Treasure description string `[HIGH]`** kunishitei/heritage/detail/102/1791:
> **「桁行七間、梁間六間、入母屋造、正面向拝三間、両側面及び背面庇付、背面三間突出、檜皮葺」**
> 1棟 · 江戸前期 · 承応3 (1654) · 重文 1911-04-17 → **国宝 2020-12-23**

Parse for modelling: **7 × 6 bay core, irimoya, a 3-bay 向拝 (kōhai porch) on the front, 庇 (aisles)
on BOTH FLANKS AND THE REAR, and a 3-bay projection off the back.** The rear projection plus the
flanking aisles are the 孫庇 / 又庇 massing.

**The shrine's own published measured figures `[HIGH]`** yasaka-jinja.or.jp/about/architecture:

| Quantity | Value |
|---|---|
| **建面積 (wall-line footprint)** | **662.38 m²** |
| **軒面積 (eaves-line plan area)** | **1,049.50 m²** |
| **屋根面積 (developed roof surface)** | **1,320.00 m²** |
| **高さ** | **15.53 m** |

**Resolving the "約400坪" claim you will see everywhere:** 1,320 m² ÷ 3.3058 = **399.3 坪**. So
**"400 坪" is the ROOF SURFACE, not the floor area.** The floor area is 662.38 m² = **200.4 坪**.
**Do not model a 400-tsubo footprint.**

**Plan dimensions in metres — `[DERIVED]`, no source publishes them.** Solving 662.38 m² at the 7:6
bay ratio:

| Quantity | Value | Method |
|---|---|---|
| **桁行 (E–W, front)** | **27.80 m** | √(662.38 × 7/6) |
| **梁間 (N–S, depth)** | **23.83 m** | 27.80 × 6/7 |
| **Bay module** | **3.97 m per bay both ways** = 13.1 尺 = **2.02 Kyoma ken** | 27.80/7 and 23.83/6 |
| Eaves-line plan at 1,049.50 m² | **35.0 × 30.0 m** | same ratio |
| Eaves-line plan, measured | **33.8 × 27.7 m**, area 844 m² | `[OSM]` |
| **Eave overhang** | **≈3.0–3.6 m all round** | `[DERIVED]` |

**The bay module landing on exactly 2 Kyoma ken (3.939 m) is a strong self-consistency check** — the
7:6 assumption is almost certainly correct. Use **3.97 m** and the plan will be right.

**Roof geometry — `[DERIVED]` and genuinely useful:**
```
屋根面積 / 軒面積 = 1320.00 / 1049.50 = 1.258
=> area-weighted mean roof slope = arccos(1/1.258) = 37.3 degrees
```
That is a **steep hiwadabuki irimoya**, ~7.6/10 averaged over the curved surface — entirely consistent
with cypress-bark construction, which needs more pitch than tile. **Model the main planes at ~30–33°
flattening at the eaves and steepening to ~45° at the ridge, averaging 37°.**

- **15.53 m is the overall height and is almost certainly the RIDGE**, per Japanese convention.
- **Eave height `[UNKNOWN]` — suggest 6.5–7.0 m**, because 15.53 m less a 37°-pitched roof over a
  ~30 m span (half-depth 15 m) leaves ~8.5–9 m of roof rise.

**祇園造 — the one-roof massing.** `[MED-HIGH]`
> 「一般の神社では別棟とする本殿と拝殿を1つの入母屋屋根で覆い、さらにその周囲に又庇を伸ばし、
>  いくつもの小部屋を配した複雑な構造」

The honden and the haiden (礼堂) — normally **two separate buildings** — are **covered by a single
great irimoya roof**, with **又庇 (mata-bisashi, secondary aisle roofs)** extended around the
perimeter to create a ring of small rooms. **It is the largest shrine honden in Japan.** The 内陣 and
内々陣 each have a three-bay 御棚 at the front **with no known parallel in any other building** —
which is precisely what the 2020 National Treasure citation singles out.

**Geometry recipe:** one hipped-gable roof volume of 27.8 × 23.8 m ridge-parallel to the approach,
eaves extended ~3.2 m all round with a **secondary, shallower 又庇 roof skirt** below the main eaves
on both flanks and the rear; a **3-bay 向拝 porch** projecting on the front; a **3-bay block projecting
off the back**. Every roof surface in **檜皮葺** — see §6.4.7 for how hiwada must look.

**龍穴 (the dragon-hole legend).** Widely repeated: a bottomless pond under the honden connecting to
Shinsen-en. **Not found in any official record — treat as folklore only, do not model as fact.**
Separately and verifiably: the shrine's 御神水 ("力水") at 大神宮社 rises from **≈90 m underground**.
`[MED]`

### 4.4 舞殿 (Maiden, the lantern-hung dance stage — ICP 2020)

**Official record `[HIGH]`** kunishitei 00005337:
> **「桁行三間、梁間三間、入母屋造、銅板葺」** · 1棟 · 明治36 (**1903**) · 重文 2020-12-23

| Item | Value | Flag |
|---|---|---|
| Roof outline incl. eaves | **13.3 × 11.9 m**, axis 94.6° | `[OSM measured]` |
| **Derived platform** | **≈9.3 × 7.9 m**, i.e. **≈3.1 × 2.6 m per bay** (13.3 × 11.9 less ~2.0 m eave overhang) | `[DERIVED]` |
| Roof | **銅板葺 (copper sheet)** — re-clad **2015 (平成27)**. Green-patinated. **Not tile, not bark.** | `[HIGH]` |
| **高さ** | 「約14 m」 | **`[LOW]` — REJECT, see below** |
| **Suggested height** | **8.5–9.5 m to the ridge** | `[UNKNOWN — suggested]` |

**⚠ REJECT the "約14 m" height.** The identical figure (約14 m) is quoted for the 南楼門, and a
3×3-bay dance pavilion 13 m square being as tall as a two-storey gate is implausible. It is a copy
error. **Suggest 8.5–9.5 m**, because a 3-bay irimoya pavilion with a 13.3 m eaves span typically
runs **0.65–0.72 × its eaves width** in total height.

**⚠ Date conflict, resolved.** The shrine's visitor page says the maiden was rebuilt **1874 (明治7)**
after the 1866 fire; the cultural-property record says **1903 (明治36)**. Reconciliation: built 1874,
**floor and structure rebuilt 1902 (明治35)** — which is the fabric the 1903 designation refers to.
**Use 1903 for the fabric you are modelling.** `[MED]`

**THE LANTERNS — the count is genuinely unresolved. Here is everything that exists:**

| Claim | Value | Flag |
|---|---|---|
| **万灯籠 elsewhere in the precinct** | **≈100灯** | **`[HIGH]`** — the shrine's own page. **NOTE: these are lanterns dotted around the precinct, NOT the maiden's.** |
| 「境内には100基以上の提灯が奉納」 | 100+ | `[MED]` |
| On the maiden specifically | 「約280個」 / 「約260個」 | `[LOW]` — search aggregation, no primary page found |
| Visitor impression | 「数百はありそう」 (several hundred) | `[LOW]` |

**VERDICT: `[UNKNOWN]` — suggest ≈250 lanterns in 2 tiers. Derivation:** the eaves perimeter is
2 × (13.3 + 11.9) = **50.4 m**; donated 長型 lanterns of ~0.35 m diameter hang at roughly **0.40 m
centres** → **≈126 per tier**; photographs consistently show **two tiers** (an upper and a lower rail)
on all four sides → **≈250**. That falls inside the 260–280 band the low-confidence sources quote.
**Model 2 tiers × ~60–65 per long side, ~55 per short side.**

**Arrangement `[MED]`, verified:** hung **ぐるりと — continuously around all four sides, in upper and
lower rows**, lit every night. Each bears a **donor's name: Gion 花街 お茶屋 and 置屋, 料亭, companies,
and individual geiko.** Names visible in photographs include 富美代 (a Gion ochaya), 近善, 辻留, 八百三.
**White paper, black text, red hoops top and bottom.**

**Lantern size — no source measures the maiden's. `[UNKNOWN]` — suggest Φ0.34 × h0.66 m (堂島提灯)**
or Φ0.24 × h0.57 m (9号長型); they read as mid-size 長型 in photographs.

**Standard 提灯 catalogue sizes `[HIGH]` (manufacturer specs) — pick from this, don't invent:**

| Type | Φ × h (cm) | | Type | Φ × h (cm) |
|---|---|---|---|---|
| 9号長型 | **24 × 57** (60 with handle) | | 丸型 8号 | 22 × 30 |
| **堂島提灯** | **34 × 66** | | 丸型 9号 | 24 × 35 |
| 六永提灯 | 38 × 78 | | 丸型 10号 | 27 × 45 |
| 小看板 | 42 × 98 | | 丸型 14号 | 37 × 55 |
| 20号長型 | 60 × 115 | | 丸型 15号 | 44 × 58 |
| 25号長型 | 75 × 140 | | 丸型 17号 | 47 × 60 |
| 35号長型 | 110 × 170 | | 八寸丸 / 尺丸 / 尺二丸 | 24×28 / 30×35 / 35×42 |

### 4.5 The rest of the precinct — full ICP list with official strings

All `[HIGH]`, all from kunishitei.bunka.go.jp, all designated **2020-12-23** unless noted.
**Two records carry rare DIRECT METRIC dimensions — bolded.**

| Building | 構造及び形式 (verbatim) | Date | Footprint (roof line) |
|---|---|---|---|
| **本殿** | 桁行七間、梁間六間、入母屋造、正面向拝三間、両側面及び背面庇付、背面三間突出、檜皮葺 | 1654 · **国宝** | 33.8 × 27.7 m `[OSM]` |
| **西楼門** | 三間一戸楼門、切妻造、本瓦葺 | 1497 · 重文1911 | 11.7 × 9.0 m `[OSM]` |
| 西楼門翼廊 (北・南) | 桁行折曲がり延長五間、梁間一間、切妻造、本瓦葺 | 1925 | 13.2 m developed `[DERIVED]` |
| **南楼門** | 三間一戸楼門、入母屋造、東西廻廊附属、切妻造、銅板葺 | 1879 | 19.3 × 12.9 m `[OSM]` |
| **舞殿** | 桁行三間、梁間三間、入母屋造、銅板葺 | 1903 | 13.3 × 11.9 m `[OSM]` |
| **石鳥居** | 石造明神鳥居 (1**基**) | 1646 · 重文1911 | span 6.8 m, h 9.5 m |
| **絵馬堂** | 桁行七間、梁間二間、入母屋造、北面下屋付、桟瓦葺 | 延享元 = **1744** | **25.4 × 9.1 m** `[OSM]` |
| **神輿庫** | **桁行10.7 m、梁間7.3 m**、鉄筋コンクリート造、入母屋造、本瓦葺、正面庇付、桟瓦葺 | 昭和3 = 1928 | 17.2 × 12.1 m `[OSM]` |
| **南手水舎** | 桁行一間、梁間一間、**入母屋造**、桟瓦葺、**水盤付** | 明治20 = 1887 | **6.2 × 3.7 m** `[OSM]` |
| **西手水舎** | 桁行一間、梁間一間、**切妻造**、桟瓦葺、**水盤付** | 昭和3 = 1928 | **5.4 × 4.1 m** `[OSM]` |
| **神饌所** | **桁行6.1 m、梁間4.0 m**、入母屋造、東面及び北面下屋附属、銅板葺、西面渡廊下附属 | 明治26 = 1893 | — |
| **神馬舎** | 桁行三間、梁間三間、切妻造、**妻入**、背面下屋付、桟瓦葺 | 昭和3 = 1928 | — |
| **透塀** | 折曲り延長**二三間**、潜門一所付、檜皮葺 | 明治中期 | 23 bays developed |
| 又旅社本殿 | 正面一間、側面二間、背面三間、正面入母屋造、背面切妻造、銅板葺 | 寛政元 = 1789 | — |

Record URLs follow `https://kunishitei.bunka.go.jp/bsys/maindetails/102/000053XX` — 5336 神饌所 ·
5337 舞殿 · 5338 透塀 · 5339 神輿庫 · 5340 神馬舎 · 5341 絵馬堂 · 5342/5344 南手水舎 · 5343 西手水舎 ·
5345/5346 翼廊 · 5347 南楼門 · 5348 西楼門 · 5349 石鳥居. Honden: `/heritage/detail/102/1791`.

**Note the roof-material spread across the precinct — it is deliberately varied and worth honouring:**
**檜皮葺** (本殿, 透塀) · **本瓦葺** (西楼門, 翼廊, 神輿庫) · **銅板葺** (南楼門, 舞殿, 神饌所) ·
**桟瓦葺** (絵馬堂, 手水舎 ×2, 神馬舎). Four different roof materials in one precinct.

**手水舎 (temizuya)** — both are **one bay square**. Roof outlines 6.2 × 3.7 m (south) and
5.4 × 4.1 m (west); at ~1.3 m eave overhang the **structural bay is ≈2.5–3.5 m square** with four
posts. The **水盤 (basin) is explicitly part of the designation.** Height `[UNKNOWN] — suggest
4.0–4.5 m to the ridge`, because a single-bay tiled temizuya with a ~5.5 m eaves span runs ~0.75× its
span in height. Note the two differ: **south is 入母屋 (hip-gable), west is 切妻 (plain gable)** — do
not copy-paste one for the other.

**絵馬堂 (ema hall)** — **25.4 × 9.1 m** roof outline for a **七間 × 二間** hall = **3.63 m per bay**
on the long axis `[DERIVED]`. Built **1744**, **relocated to its present position in 1925** (the same
campaign as the 翼廊). **Open-sided**, with a lean-to (下屋) on the north.
- **絵馬 (votive tablet) size `[UNKNOWN]` — suggest small visitor ema 150 × 90 mm, large 奉納絵馬
  450 × 300 mm**, standard trade sizes. The hall houses **large painted votive panels**, not the
  pocket-sized visitor ema.
- **Ema rack `[UNKNOWN]` — suggest 1.8 m long × 1.5 m high × 0.6 m deep**, a standard two-sided
  絵馬掛け frame sized to one Kyoma bay.

**Stone lanterns** — the paired approach lanterns are **2.40 m tall** `[MED]`. Use the Kasuga
proportion table in §7.5 to build them: at H = 2.40 m the parts come out 地輪 119 / 竿 855 / 中台 238 /
火袋 404 / 笠 309 / 宝珠 475 mm. `[DERIVED]`
**万灯籠: ≈100 lanterns** donated mainly by Gion-district shops, lit at night. `[HIGH]`

### 4.6 Yasaka build-ready summary

| Object | Footprint | Height | Roof | Colour |
|---|---|---|---|---|
| 本殿 | **27.8 × 23.8 m** walls; **35.0 × 30.0 m** eaves | **15.53 m** ridge, ~6.8 m eave | 檜皮葺 irimoya, mean **37.3°** | unpainted timber, bark roof |
| 西楼門 | **7.9 × 5.2 m** walls; **9.0 × 11.7 m** eaves | **9.1 m** | **本瓦葺 切妻** | **朱 timber + 緑青 GREEN lattice** |
| 西楼門翼廊 ×2 | **13.2 m developed × 2.6 m**, dog-legged | — | 本瓦葺 切妻 | as gate |
| 南楼門 | **9 m** wide + 5.2 m corridors each side = 19.3 m | **≈14 m** | **銅板葺 入母屋** | 丹塗 red-lead |
| 舞殿 | **9.3 × 7.9 m** platform; **13.3 × 11.9 m** eaves | **8.5–9.5 m** (reject 14 m) | **銅板葺 入母屋** | timber; **≈250 white lanterns, 2 tiers** |
| 石鳥居 | span **6.8 m**, pillar φ **0.75 m** | **9.5 m** (or 9.33 m) | — | granite, **two-tone kasagi/shimagi** |
| 絵馬堂 | **25.4 × 9.1 m** | — | 桟瓦葺 入母屋 | open-sided |
| 神輿庫 | **10.7 × 7.3 m** | — | 本瓦葺 入母屋, RC | — |
| 南手水舎 | ~3.0 m sq bay; 6.2 × 3.7 m eaves | ~4.2 m | 桟瓦葺 **入母屋** | — |
| 西手水舎 | ~3.0 m sq bay; 5.4 × 4.1 m eaves | ~4.2 m | 桟瓦葺 **切妻** | — |

---

## 5. Yasaka Pagoda / Hōkan-ji 五重塔 (八坂の塔)

**This is the best-documented object in the whole project.** Its plan, taper, eaves, brackets, total
height, body height and finial length are all **measured survey values**, published in four
peer-reviewed papers by **浜島正士** (then of the 文化庁 建造物課) worked from the **京都府教育委員会
preservation drawings**, plus an analytical paper by **白井裕泰**. They cross-validate to three
decimal places. Use them literally.

| Paper | Gives | J-STAGE |
|---|---|---|
| 浜島 143 (1968) 塔の柱間寸法と支割について | per-storey bay widths, 支 module, 丸桁の出 | aijsaxx/143 |
| **浜島 155 (1969) 塔の高さと組上げ構造** | **総高 / 塔身高 / 相輪長 / 初重軒長** | aijsaxx/155 |
| 浜島 172·173 (1970) 塔の斗栱について | bracket step projection, member sizing | aijsaxx/172, /173 |
| 浜島 208 (1973) 塔の軒について | eave projections, 軒反り | aijsaxx/208 |
| 白井 408 (1990) 五重塔の逓減について | taper typology | aijax/408 |

### 5.1 Designation and date

`[HIGH]` kunishitei.bunka.go.jp/heritage/detail/102/1728
> **指定名称 法観寺五重塔（八坂塔）** · 1基 · 室町中期 · **年代 永享12年 (1440)** ·
> **構造形式「三間五重塔婆、本瓦葺」** · 重文指定 **1897年 (明治30) 12月28日**

**Your brief's 1440 / Ashikaga Yoshinori is CONFIRMED.** The 1897 designation makes it one of the
very first buildings protected in Japan, under the 古社寺保存法.

**History `[MED]` unless flagged:** traditional 592 founding (Shōtoku Taishi legend / 八坂氏 clan
temple, 四天王寺式伽藍) → **1179 or 1180** first fire (sources conflict: a Kiyomizu-dera/Yasaka clash
vs a lightning strike) → 1191/92 rebuilt under 源頼朝 → **1291** lost again → 1308/09 rebuilt under
後宇多天皇 → **1342** dedicated by **足利尊氏 as a 利生塔** → **1436** burned in the great Higashiyama
fire → **1440 (永享12) — THE PRESENT STRUCTURE, 足利義教** `[HIGH]` → survived the Ōnin War (the rest
of the 伽藍 did not) → 1618 repair under 板倉勝重, recorded as 「旧形を存す」 → 1663 further repair.

**Unique status:** it is **the only surviving 利生塔** of the 66 provincial pagodas the Ashikaga
raised alongside the 安国寺 network.

### 5.2 ★ TOTAL HEIGHT — THE CONFLICT, RESOLVED

浜島 1969, **表－1 五重塔の高さの比例（単位:尺）**, row 法観寺塔, read directly from the scan:

| Symbol | 尺 | **metres** | Meaning |
|---|---|---|---|
| S₁ | 20.80 | **6.303** | 初重総柱間 (first-storey plan width) |
| **H** | **128.00** | **38.788** | **総高 — datum to top of finial** |
| **H₀** | **88.00** | **26.667** | **塔身高 — datum to top of 5th roof / underside of 露盤** |
| **L** | **40.00** | **12.121** | **相輪長 (finial length)** |
| W₁ | 45.90 | **13.909** | 初重軒長 (eave tip to eave tip) |

Published ratios: H/S₁ **6.15** · H₀/S₁ 4.23 · **L/S₁ 1.91** · **H₀/H 0.687** · H₀/W₁ 1.92.
Datum is **基壇上端 (top of the stone podium)**; source is preservation drawing Ⅰ.

**Three independent internal checks, all exact:**
1. H₀ + L = 88.00 + 40.00 = 128.00 = H ✔
2. S₁ = 20.80 尺 — identical to the *柱間* paper (§5.3), a different publication ✔
3. **W₁:** from the *eaves* paper, 総柱間 20.80 + 2 × 総軒の出 12.55 = **45.90 尺**. The *height* paper
   prints 45.90. **Two different papers, two different measurands, exact agreement.** ✔

**Every circulating height figure, classified:**

| Figure | What it actually is | Verdict |
|---|---|---|
| **38.79 m** | **The MEASURED value** (Hamashima 1969, from the Kyoto Prefecture survey drawings). It is the source of the "38.8 m" in every ranking table that places Hōkan-ji **3rd** behind Tō-ji and Kōfuku-ji. | **✅ USE THIS** |
| 36.4 m | Specialist databases (kawai25, s_minaga). Superseded — probably a different datum or transcription drift. | reject |
| 40 m | 『新撰京都名所圖繪』竹村俊則 1958. **Plausibly correct as ground-to-tip** — Hamashima's 38.79 m starts at the podium *top*, so adding a ~1 m 基壇 lands here. | use only for ground-to-tip |
| **46 m** | **Kyoto City tourism, 京都市観光協会, 祇園商店街, Wikipedia-JA.** s_minaga labels this pair explicitly **「一辺６ｍ、高さ４６ｍ。（公称）」— NOMINAL.** It implies H/S₁ = 7.30, outside the range of *every* large wayō pagoda ever measured. | **❌ NOT A MEASUREMENT — your brief's 46 m is the nominal figure** |
| 49 m | 京都通百科事典, yoritomo-japan. Further inflation. | reject `[LOW]` |

**⚠ The 相輪 is unusually long: 12.121 m = 31.25 % of the total height.** Hamashima's own text singles
this out — 「L/S₁ をみると元興寺小塔がとくに大きく、**醍醐寺・法観寺両塔がこれにつづき**」. Hōkan-ji has
the 2nd/3rd largest finial-to-plan ratio of all 18 five-storey pagodas surveyed. **This is a defining
silhouette property: a short body carrying a very tall spire. If your render looks stubby, the sorin
is too short.**

### 5.3 ★ PER-STOREY PLAN — MEASURED `[HIGH]`

浜島 1968 表－1 / 白井 1990 表－2. Three bays per side; 総間 = 中の間 + 2 × 脇間.

| 重 | 総間 尺 | **総間 m** | 中の間 尺 / m | 脇間 尺 / m | 支数 (総=中+脇+脇) | 1支 尺 | 1支 mm |
|---|---|---|---|---|---|---|---|
| **初** | 20.80 | **6.303** | 7.40 / 2.242 | 6.70 / 2.030 | **31 = 11+10+10** | 0.671 | **203.3** |
| 二 | 19.53 | **5.918** | 6.97 / 2.112 | 6.28 / 1.903 | 28 = 10+9+9 | 0.698 | 211.5 |
| 三 | 18.42 | **5.582** | 6.58 / 1.994 | 5.92 / 1.794 | 28 = 10+9+9 | 0.657 | 199.1 |
| 四 | 16.44 | **4.982** | 6.00 / 1.818 | 5.22 / 1.582 | 25 = 9+8+8 | 0.666* | 201.8 |
| 五 | 14.63 | **4.433** | 5.33 / 1.615 | 4.65 / 1.409 | 22 = 8+7+7 | 0.665 | 201.5 |

\* The 四重 is one of only three pagodas nationally where the 中の間 and 脇間 use *different* 1支
values (0.666 / 0.652) — Hamashima's note 7.

- **Width ratios to 初重: 1.000 / 0.939 / 0.886 / 0.790 / 0.703**
- Taper steps: **1.27 / 1.11 / 1.98 / 1.81 尺** = 0.385 / 0.336 / 0.600 / 0.549 m
- **逓減率 = 0.703** (published in the 率 column)
- Note 二重 and 三重 share the same 支数 (28), which is *why* the 2→3 step is the smallest.

> **On the module:** temple carpentry does NOT use the ken. It uses **支割 (shiwari) / 枝割
> (edawari)** — a module 支 (eda) equal to **one rafter pitch**, and every plan dimension is a whole
> number of 支. For Hōkan-ji **1支 ≈ 203 mm**, and the first storey is exactly **31 支** wide.
> **Do not try to force the pagoda onto the 1.9697 m Kyoma ken.** It is a different system.

The tourist 「6.4 m 四方」/「方6メートル」 and the specialist 「一辺6.2 m」 are all roundings of
20.80 尺. **Use 6.303 m.**

### 5.4 ★ 逓減率 (teigenritsu) AND THE TAPER TYPE

**Definition:** 逓減率 = **(五重総柱間) ÷ (初重総柱間)**, measured column-centre to column-centre.
That is exactly the 率 column in Hamashima 1968. Distinct from **軒長さ逓減率** (the *eave*-span taper),
which is much closer to 1.0 — **0.865** for Hōkan-ji. **Do not confuse them.**

**Hōkan-ji 逓減率 = 0.703.** Your brief's "typically 0.6–0.7 for a Muromachi five-storey pagoda" is
correct and Hōkan-ji sits right at the top of that band.

**⚠ THE TAPER IS NOT LINEAR. This is the most important geometric fact in this section.**
白井 1990 表－3 classifies it as type **C「中腹」 — a CONVEX-outward silhouette**:
> 法観寺塔（1440）: **二重三重差 < 初重二重差 < 四重五重差 < 三重四重差**

Verified against the measured steps: **1.11 < 1.27 < 1.81 < 1.98** ✔

Only **three** surviving five-storey pagodas are type C — 海住山寺 (1214), 羽黒山 (1372) and
**法観寺 (1440)** — and there is **no Edo example at all.** `『匠明』` (1607) declares this the
*correct* taper: 「三墨チカイニ五中墨…是ハ悪ク候、万重塔ハ**中腹**ニ可用事肝要ニ候」.

> **Hōkan-ji is the last built example of the taper the master carpenters considered ideal. Type the
> five widths in literally. Do NOT linearly interpolate.**

**Full calibration corpus `[HIGH]` — 浜島 1968 / 白井 1990, all 尺:**

| Pagoda | Date | 初 | 二 | 三 | 四 | 五 | **逓減率** | 1支 | Type | 総高 m |
|---|---|---|---|---|---|---|---|---|---|---|
| 海竜王寺小塔 | 奈良前 | 2.55 | 2.21 | 1.84 | 1.47 | 1.14 | **0.447** | 0.116 | B | 4.01 |
| **法隆寺** | 奈良前 | 21.175 | 18.69 | 15.96 | 13.30 | 10.65 | **0.503** | 0.887 | B | 32.56 |
| 最勝院 | 1666 | 18.92 | 16.34 | 14.62 | 11.18 | 9.46 | **0.500** | 0.43 | A | 30.09 |
| 室生寺 | 奈良末 | 8.08 | 7.21 | 6.33 | 5.43 | 4.80 | **0.594** | 0.367 | A | 16.18 |
| **醍醐寺** | 952 | 21.89 | 19.45 | 17.295 | 15.11 | 13.51 | **0.617** | 0.995 | A | 38.17 |
| 厳島神社 | 1407 | 15.04 | 13.63 | 12.22 | 10.81 | 9.40 | **0.625** | 0.47 | B | 27.90 |
| 妙成寺 | 1618 | 16.00 | 14.5 | 13.0 | 11.5 | 10.00 | **0.625** | 0.50 | B | — |
| 日光東照宮 | 1788 | 16.00 | 14.5 | 13.0 | 11.5 | 10.00 | **0.625** | 0.50 | B | 33.74 |
| 元興寺小塔 | 奈良 | 3.21 | 2.925 | 2.64 | 2.34 | 2.07 | **0.645** | 0.097 | B | 5.55 |
| 寛永寺 | 1639 | 15.98 | 14.57 | 13.16 | 11.75 | 10.34 | **0.647** | 0.47 | B | 31.39 |
| 法華経寺 | 1622 | 16.095 | 14.79 | 13.485 | 12.18 | 10.875 | **0.676** | 0.435 | B | — |
| 本門寺 | 1607 | 15.89 | 14.75 | 13.45 | 12.16 | 10.80 | **0.680** | 0.432 | B | 28.42 |
| 瑠璃光寺 | 1442 | 16.82 | 14.82 | 13.91 | 12.19 | 11.455 | **0.681** | 0.526 | A | 30.00 |
| **仁和寺** | 1637 | 19.52 | 18.00 | 16.47 | 15.00 | 13.42 | **0.688** | 0.61 | B | 35.92 |
| **興福寺** | 1426 | 29.20 | 26.85 | 24.44 | 22.24 | 20.16 | **0.690** | 0.859 | A | 50.82 |
| 羽黒山 | 1372 | 16.55 | 15.37 | 14.16 | 12.92 | 11.62 | **0.702** | 0.552 | **C** | 28.20 |
| **法観寺** | **1440** | **20.80** | **19.53** | **18.42** | **16.44** | **14.63** | **0.703** | **0.671** | **C** | **38.79** |
| **東寺** | 1644 | 31.28 | 28.52 | 25.76 | 23.92 | 22.08 | **0.706** | 0.92 | A | 54.85 |
| 明王院 | 1348 | 14.40 | 13.37 | 12.34 | 11.31 | 10.28 | **0.714** | 0.514 | B | 28.47 |
| 海住山寺 | 1214 | 9.035 | 8.445 | 7.91 | 7.31 | 6.66 | **0.737** | 0.41 | **C** | 17.11 |

**Taper types:** **A 三墨チカイ = concave** · **B 五中墨 = straight** (equal decrements; overwhelmingly
the most common) · **C 中腹 = convex** (the 『匠明』 ideal; only 3 examples, none after 1440).

**Trend:** Nara 0.45–0.50 → Heian 0.59–0.62 → Kamakura/Nanbokuchō 0.70–0.74 → then a **plateau at
0.62–0.71**, because the 支割 system constrains each storey's drop to a whole number of 支.
Hamashima: 「中世以降になるとあまり差はなく、そこに時代上の変化は認められない」.

**⚠ The widely-repeated 「東寺 逓減率 = 0.75」 (serai.jp) is WRONG — measured is 0.706.**

### 5.5 ★ EAVES — MEASURED, AND IDENTICAL ON ALL FIVE STOREYS `[HIGH]`

浜島 1973 表－2(A): 「法観寺両塔では**各重同一の軒の出**としている」

| Quantity | 尺 | **m** |
|---|---|---|
| 地垂木の出 | 5.265 | **1.595** |
| 飛檐垂木の出 | 3.265 | **0.989** |
| 檐の出 R | 8.530 | **2.585** |
| **丸桁の出 G** (column centre → purlin centre) | **4.02 (= 6支)** | **1.218** |
| **総軒の出 E = G + R** | **12.55** | **3.803** |

**Eave-tip span per storey** (= 総間 + 2E, the straight run before corner sori):

| 重 | 尺 | **m** | 軒の出 ÷ half-width | rafters per side |
|---|---|---|---|---|
| 初 | **45.90** | **13.909** | 1.207 | ≈68 |
| 二 | 44.63 | **13.524** | 1.285 | ≈64 |
| 三 | 43.52 | **13.188** | 1.363 | ≈66 |
| 四 | 41.54 | **12.588** | 1.527 | ≈62 |
| 五 | 39.73 | **12.039** | 1.716 | ≈60 |

> **★ THE KEY SILHOUETTE FACT: the roof plan shrinks only 13 % (13.91 → 12.04 m) while the body
> shrinks 30 % (6.30 → 4.43 m).** Eave overhang = **0.603 × the first-storey width** on each side, and
> the total roof plan is **≈2.2 × the body width**. The pagoda is mostly roof. If your model's roofs
> look small relative to the body, this is the number you got wrong.

### 5.6 ★ BRACKETS (三手先) — MEASURED `[HIGH]`

浜島 1970 (173号): 「手先の出については…**法観寺塔では各重同一で、二重以外はほぼ2枝に相当する**」
「各材の寸法については…**法観寺塔では全重同じである**」

- **Projection per step = 2支 = 1.342 尺 = 407 mm**
- **三手先 total = 6支 = 4.02 尺 = 1.218 m** — **exactly the measured 丸桁の出** ✔ (closure between
  two separate papers)
- **ALL BRACKET MEMBERS ARE IDENTICAL ON ALL FIVE STOREYS.** Model one bracket set and instance it
  ~60 times. This is a huge modelling saving and it is documented, not assumed.
- 組物 = **三手先組物**; 軒 = **二軒繁垂木 (double-tier close-set rafters)**, **平行 (parallel, not
  fanned)**. `[MED]`
- The **六枝掛 (rokushigake)** rule is independently confirmed: one bracket step = 2 枝, 三手先 =
  6 枝, and a 三ツ斗 carries exactly 6 rafters.
- Medieval rule (浜島 1973): 「中世以降では**丸桁の出は6枝に限定されて0.4 S/2 前後に定まり**」.
  Hōkan-ji: 4.02 / 10.40 = **0.3865** ✔

### 5.7 VERTICAL SCHEME — H₀ and L measured, per-storey `[DERIVED]`

**Per-storey heights are NOT published for Hōkan-ji** — there is no digitised 修理工事報告書 and the
文化庁 解説文 is blank. The best available shape comes from **中山寺五重塔 (2016)**, a full
traditional-method build proportioned on 海住山寺 with 明王院 bracketing, whose measured storey
pitches are 3.577 / 3.410 / 3.161 / 3.050 / 2.825 m plus a 3.815 m top-roof zone — normalised
**1.000 / 0.953 / 0.884 / 0.853 / 0.790**, with storeys making up 80.8 % of the 塔身 and the top roof
zone 19.2 %.

Applied to Hōkan-ji's **published** 塔身 of 26.667 m:

| Zone | pitch (m) | 尺 | 台輪天端 elevation (m) |
|---|---|---|---|
| 初重 | **4.808** | 15.87 | 4.808 |
| 二重 | **4.584** | 15.13 | 9.392 |
| 三重 | **4.249** | 14.02 | 13.641 |
| 四重 | **4.100** | 13.53 | 17.741 |
| 五重 | **3.797** | 12.53 | 21.538 |
| 5th roof → underside of 露盤 | **5.128** | 16.92 | **26.667 = H₀** |
| **相輪** | **12.121** | 40.00 | **38.788 = H** |

**Sourced rules that constrain this** (白井 1990 §4-3, `[HIGH]`): **組物高 is CONSTANT at every
storey** — certain for Hōkan-ji, since all bracket members are the same size; **軸部高 diminishes
upward**, usually in equal decrements; **屋根高 diminishes.** 白井 criticises constant-軸部高 towers
(羽黒山, 瑠璃光寺, 最勝院, 東照宮) as looking 間延び ("stretched/slack").

**Corpus height laws `[HIGH]`** (浜島 1969 表－1): **L/H = 0.21–0.34, shrinking with date** ·
**L/S₁ ≈ 1.4–1.9, essentially time-invariant** — rule of thumb **相輪 ≈ 1.7 × 初重総間** ·
**H/S₁ rises with date (5.1 → 7.0)**.

### 5.8 ★ ROOF PITCH — and why pagoda roofs look the way they do `[HIGH]`

AIJ 70/591, from the kiwari (木割) corpus. **Pagoda roofs are SHALLOW at the visible eave and much
STEEPER on the hidden sheathing above.** This is the whole secret of the look.

| Member | 下重 | 上重 | degrees |
|---|---|---|---|
| **飛檐垂木 (the line you actually see at the tip)** | 1.7–1.8 寸 | 2.3 寸 | **9.6° → 13.0°** |
| **地垂木 (the inner rafter tier)** | 3 寸 | 4 寸 | **16.7° → 21.8°** |
| **野地 / 屋根引渡し (hidden sheathing)** | 4 寸 | 7.5 寸 | **21.8° → 36.9°** |

- The 飛檐垂木 pitch is set at **1/2 to 2/3 of the 地垂木 pitch**. **That break — not a smoothly
  curved surface — is what produces the upward flick at the eave.** Model the eave as two straight
  rafter tiers meeting at an angle, then curve only the very tip.
- 最上層 野地: **7.3 寸 (諸記集) / 7.7 寸 (匠明)** = 36.1° / 37.6°.
- 飛檐垂木 steepens **monotonically upward** (匠明's 十三重塔 series runs 3.6 寸 → 4.3 寸).
- Confirmed on a modern traditional build: 中山寺 2016 uses **3.7 寸 / 4 寸 / 6 寸**.
- Long-run trend: 「時代と共に相輪は短く、上重屋根引渡し勾配は急になる」.

### 5.9 反り (corner rise) — two rules that disagree; both reported

**Kiwari rule** (AIJ 61/489, `[HIGH]`) — 隅反り as a fraction of the first-storey total bay L:

| Text | Rule | → Hōkan-ji |
|---|---|---|
| 『匠明』「柱半分」 | **0.03 L** | **0.189 m** |
| 『柏木政等伝来目録』(1689) | **0.035 L** | **0.221 m** |
| 『諸記集』「腰柱ニ少休テ可用」 | **0.05 L** | **0.315 m** |

The per-storey 茅負反り is explicitly **口伝 (oral transmission)** — never written down.

**Observed rule** (浜島 1973, `[HIGH]`) — h as a fraction of eave length l: the commonest is **l/25**;
bands are l/20–25, l/25–35, l/35–50, and <l/50 (all Edo). → Hōkan-ji **0.46–0.56 m**.

**These differ by ~2×**, almost certainly because they measure different things (corner rise at the
column line vs accumulated 茅負 rise at the tip). **Hōkan-ji appears in neither list — `[UNKNOWN]`.
Suggest 0.25–0.55 m at the first storey, tuned against photographs.**
Per-member reference from a 1394 build: **木負 下反り 152 mm, 茅負 下反り 364 mm** — the 茅負 carries
**2.4× the 木負's sori**, so **the curve accumulates outward**. The 尾垂木 gets a 端増 of 1/3 its depth.

### 5.10 木割 — member sizing `[HIGH]` rules, `[DERIVED]` values

`『匠明』`, with a = 柱径: 大斗幅 = a · 大斗成 = 0.55–0.6 a · 大斗繰 = a/6 · **肘木厚 = a/3** ·
肘木成 = 0.4 a · **巻斗長さ = 2 rafters + 1 gap ≈ 1.5 枝** · 巻斗成 = 0.4 × 巻斗長 ·
地垂木厚 = 0.25 a · 地垂木成 = 0.3 a · **丸桁厚 = 1 rafter + 1 gap = 1 枝**.
`『建仁寺派家伝書』` is systematically **thicker-membered and steeper-pitched** — a different school.
Other rules: **柱径 = 2.4 × 1枝** · **垂木幅 ≈ 0.45 枝, 木間 ≈ 0.55 枝** · 大斗長さ ÷ 総柱間 =
1/18–1/22 · 垂木巾 ÷ 総柱間 = 1/60–1/70 · 肘木 成/厚 = 1.2.

**Applied to Hōkan-ji (1支 = 0.671 尺 = 203.3 mm):**

| Member | Value | Flag |
|---|---|---|
| **1支 (rafter pitch)** | **203 mm** | `[HIGH]` |
| 垂木幅 / 木間 | **90–105 / 105–115 mm** | `[DERIVED]` |
| **柱径, 初重側柱** | **≈480 mm** (cross-check: 中山寺 360 φ at a 4.2 m bay) | `[DERIVED]` |
| 大斗長さ | 287–350 mm | `[DERIVED]` |
| 巻斗長さ | ≈295 mm | `[DERIVED]` |
| **手先の出 per step** | **407 mm** | `[HIGH]` |
| **三手先 total** | **1.218 m** | `[HIGH]` |

### 5.11 相輪 (sorin finial) — length `[HIGH]`, breakdown `[DERIVED]`

**Total 40.00 尺 = 12.121 m = 31.25 % of total height** `[HIGH]`. Bronze/copper over an iron or
bronze **擦管** sheathing the top of the shinbashira.

Components bottom → top: **露盤 → 伏鉢 → 請花 → 九輪 (9 rings) → 水煙 (4 blades) → 竜車 → 宝珠**.

**Calibration for the fraction** (all `[HIGH]`): 醍醐寺 12.803/38.167 = **33.5 %** ·
興福寺 15.08/50.11 = **30.1 %** · 法隆寺 9.679/32.46 = **29.8 %** · 室生寺 **28.7 %** ·
中山寺 **27.0 %**. Hamashima's corpus rule: 塔身 66.5–78 %, i.e. **相輪 22–33.5 %**, shrinking with
date. **Hōkan-ji's 31.25 % is at the high end — deliberately archaising for a 1440 building.**

**Suggested internal split `[DERIVED]` — no per-component measurement exists for ANY Japanese pagoda:**

| Component | % of L | 尺 | **m** |
|---|---|---|---|
| 露盤 (roban, square base plate) | 5 | 2.00 | **0.606** |
| 伏鉢 (fukubachi, inverted bowl) | 7.5 | 3.00 | **0.909** |
| 請花 (ukebana, lotus cup) | 4.5 | 1.80 | **0.545** |
| **九輪 (kurin — NINE rings)** | **50** | **20.00** | **6.061** |
| 水煙 (suien — 4 flame blades) | 16 | 6.40 | **1.939** |
| 竜車 (ryūsha) | 6 | 2.40 | **0.727** |
| 宝珠 (hōju, jewel) | 11 | 4.40 | **1.333** |

**九輪 ring pitch ≈ 673 mm**; ring diameters taper monotonically, roughly **1.2 m → 0.8 m**.
**Ring thickness and exact spacing are UNKNOWN for every Japanese pagoda** — the one modeller who has
attempted it states the real rings all differ and simplified them into 3 groups of 3. Do the same.

**Anchors that DO exist:**
- **露盤 width ≈ 0.238 × 初重総間**, with height/width = 0.344 (『木砕之注文』1394, `[HIGH]`) →
  for Hōkan-ji **≈1.50 m square × 0.52 m high**. Use this; it is a real rule.
- **水煙 blades, 薬師寺東塔:** each **1.90–1.945 m high × 0.48–0.49 m at the base, 37–50 mm thick,
  ~100 kg**, gilt bronze openwork.
- **宝珠, 興福寺: 620 mm diameter** (measured).
- **Sorin weight, 中山寺: 1.84 t** = 0.9 % of the dead load.

### 5.12 心柱 (shinbashira) and 心礎 — the stone is `[HIGH]`

**心礎 (foundation stone)** — the ORIGINAL Hakuhō-period stone, still in use, beneath the 須弥壇,
**地下式 (below floor level)**:
- **松香石 (tuff), 2.7 × 2.1 m, 三段孔式 (three-tier socket)**
- 柱穴 **φ 1.02 m × 0.24 m deep** · 蓋受孔 φ 0.21 × 0.03 m · **舎利孔 φ 0.15 × 0.12 m deep, with its
  stone lid surviving — one of only 2 nationally**
- The 1978 excavation showed the podium reuses the founding **版築 (rammed earth)** —
  **the pagoda has not moved since the Hakuhō period.**

**心柱 — 礎石式: it REACHES THE GROUND and stands in the carved socket** (「心礎は凹柱座を彫り、
その凹柱座に心柱が建つ」). Hinoki. Grooved where it meets the 舎利孔 so the reliquary can be withdrawn.
- **Diameter `[UNKNOWN]` — suggest 0.75–0.95 m.** Two routes converge: the socket is 1.02 m and the
  present pillar is described as 「一回り小さい」 (a size smaller); and the empirical band
  心柱径 ≈ 0.018–0.028 × 総高 (東寺 >1.0 m at 54.8 m; 法隆寺 0.90 m at 32.5 m; 中山寺 0.50 m at
  27.2 m) gives **0.70–1.09 m** at 38.79 m.
- Taper **~1.3–2 % of length** upward (中山寺 measured 500 φ → 240 φ).

**Structural role — 中山寺 2016 FEM `[HIGH]`:** the shinbashira carries **15.7 kN = 0.8 %** of the
2,047 kN dead load; adding it to the model **reduces response and deformation overall.** It is
modelled as **mass only — a damper, not a column.** Sorin accelerations reach **1.65 G**. Historic
record: across major earthquakes, pagoda damage has been **tilting and partial only, never collapse,
and concentrated in the 相輪.** Five competing explanations circulate (長周期説・振り子説・ヤジロベイ説・
スネークダンス説・心柱閂説). Tokyo Skytree's 心柱制振 derives from this.

**心柱 typology across the corpus `[HIGH]`:** **礎石立ち** (法隆寺, 東寺, 醍醐寺, **法観寺**, 瑠璃光寺)
· **中間から立つ** (海住山寺 1214 — the first five-storey example of a shinbashira starting from the
first-storey beam; 明王院 1348) · **懸垂式 (suspended)** — **only 日光東照宮** (1650, rebuilt 1818),
hung on 4 chains from the 4th storey with its tenon floating ~10 cm above the 心礎.

### 5.13 Elevation composition and finish `[MED]`

- **石壇上に建ち、縁はめぐらさない** — stands on a stone platform, **NO ground-level veranda.**
- **初重: 中央間 板唐戸 (plank door), 脇間 連子窓 (renji lattice window).**
- **中備 = 間斗束 (kentozuka struts): all three bays on storeys 1–4; FIFTH STOREY CENTRE BAY ONLY.**
- **★ 縁 (veranda) and 高欄 (railing) on the FIFTH STOREY ONLY** — 「縁、高欄が五重目にしか付いて
  いない珍しい建築様式」. **This is the single most distinctive feature of the elevation. Storeys 1–4
  have no balcony at all.** Get this wrong and it reads as a generic pagoda.
- **鬼瓦 at the four corners of every roof**; **本瓦葺**; **純和様 (pure Japanese style)** throughout.
- **裳階 (mokoshi skirt roof): NONE.** Only 4 of 125 pre-Edo surviving pagodas have one, and only two
  five-storey examples (法隆寺, 海住山寺). **Hōkan-ji is not among them. Confirmed — do not add one.**
- **NO VERMILION.** Weathered bare timber, silvered-grey to warm brown.
- **Upper-storey wall infill: `[UNKNOWN]` whether 白漆喰 or plank.** No source specifies it, and the
  best elevation description lists only 板唐戸 / 連子窓 / 間斗束. **Suggest plank walling; verify
  photographically before committing.**

Interior: 金剛界五仏 (大日・釈迦・阿閦・宝生・弥陀) on the 須弥壇; 四天柱; 天部 painted on the doors.

### 5.14 Roof tile — 本瓦葺 `[MED-HIGH]`

Temple **本葺瓦** current standard sizes (tolerance ±4.0 mm):

| Tile | Size (mm) | Mass |
|---|---|---|
| **本平瓦** | 282 × 240 / **303 × 270** / 333 × 303 | 2.6 / 3.3 / 3.8 kg |
| **素丸瓦** | 働き長さ **212 mm (7寸)** or **242 mm (8寸)** | — |
| 印籠付紐丸 | 働き 212 mm | — |

**平瓦 working (exposed) length is not published `[DERIVED]`:** it must equal the 丸瓦 働き, so
**≈212 mm exposed with the 303 mm tile (head lap ≈91 mm)**; the 丸瓦 pitch across the roof = the
平瓦 working width ≈ **210–270 mm**. A modern one-piece imitation publishes 働き 237 × 273 mm at
16 枚/m², which brackets this.

**⚠ 53判 / 64判 are 桟瓦 designations (tiles per 坪) and are NOT temple tiles.** 本瓦葺 is explicitly
**outside JIS**. Do not reuse the machiya tile module of §2.4 on the pagoda — the two roofs must look
different, and they do: 本瓦 has a strong alternating flat-pan / round-cap rib every ~210–270 mm.

**Load: 265 kg/m² (2.60 kN/m²) — tiles are 54 % of a pagoda's entire dead load.**

### 5.15 Access and site `[MED]`

- **Climbable** — first storey interior plus the **2nd storey**. Wikipedia-JA calls it **「日本唯一」**:
  the only ICP five-storey pagoda you can enter and ascend. Old photographs show mesh at the top
  storey, so visitors once reached the 5th.
- 10:00–15:00, **irregular opening**, ¥400, no one below middle-school age (the internal stair is
  very steep).
- Sited on a terrace on the western foot of Higashiyama, between **八坂神社 (N)** and **清水寺 (S)**.
- **★ 八坂通 — the sloping lane that runs uphill and TERMINATES ON THE PAGODA, which closes the view.**
  That axial termination is the most photographed composition in Kyoto. **Get the lane's alignment
  and the pagoda's position on its axis right and the scene works; get it wrong and nothing else
  saves it.**
- The compound is tiny and hemmed in by houses: 「東山山腹・**民家の中の狭い境内地**に塔のみ屹立する」.
  A modest gate on 八坂通. **Do not give it a temple forecourt — it has none.**
- Other survivals in the compound: **太子堂** and **薬師堂** (both early Edo, rebuilt by donation from
  the gate-front residents), 庫裡, 稲荷明神, **木曾義仲塚**, 八坂墓.
- **Utilities: 八坂通 in the Sannenzaka district was undergrounded in FY2011** — see §7.9. **The
  pagoda view is pole-free and wire-free.**

### 5.16 Pagoda build recipe

```python
# UNITS
shaku = 0.303030          # m
EDA   = 0.671 * shaku     # = 203.3 mm, the rafter-pitch module. NOT the ken.

# TOTALS                                                    [MEASURED]
H  = 128.00 * shaku = 38.788   # total, from top of the stone podium
H0 =  88.00 * shaku = 26.667   # body: podium -> top of 5th roof / underside of roban
L  =  40.00 * shaku = 12.121   # sorin, 31.25 % of H

# PLAN, metres: total / centre bay / side bay              [MEASURED]
S = [6.303, 5.918, 5.582, 4.982, 4.433]
C = [2.242, 2.112, 1.994, 1.818, 1.615]
W = [2.030, 1.903, 1.794, 1.582, 1.409]
eda_counts = [(11,10), (10,9), (10,9), (9,8), (8,7)]   # (centre, side)
# TAPER TYPE C "chuufuku" -- CONVEX. Steps 1.27 / 1.11 / 1.98 / 1.81 shaku.
# DO NOT INTERPOLATE. Type the five widths in.

# EAVES -- IDENTICAL ON ALL FIVE STOREYS                   [MEASURED]
marugeta_out = 1.218    # column centre -> purlin centre (= 6 eda = 3 steps x 2 eda)
ji_daruki    = 1.595
hien_daruki  = 0.989
E            = 3.803    # total eave projection from the outer column centreline
eave_span    = [13.909, 13.524, 13.188, 12.588, 12.039]   # = S[i] + 2E

# VERTICAL (storey split DERIVED from the Nakayama-dera 2016 measured shape)
storey_pitch = [4.808, 4.584, 4.249, 4.100, 3.797]
top_roof_zone = 5.128                 # -> 26.667 = H0
# kumimono (bracket) height CONSTANT every storey; jikubu (shaft) height diminishes.

# DETAIL
brackets   = "mitesaki, 3 steps x 0.407 m; ALL MEMBERS IDENTICAL every storey (~60 sets)"
rafters    = "futanoki shigedaruki, PARALLEL not fanned, ~95 mm @ 203 mm pitch, ~68/side st.1"
pitch_hien = (9.6, 13.0)   # degrees, lower -> upper storey  (the line you see)
pitch_ji   = (16.7, 21.8)  # degrees
pitch_noji = (21.8, 36.9)  # degrees, HIDDEN sheathing
sori       = (0.25, 0.55)  # m corner rise at storey 1; rules disagree, match photos
columns    = "12 perimeter per storey, ~480 mm dia; 4 shitenbashira on storey 1"
shinbashira= "hinoki, 0.75-0.95 m base, GROUND-FOUNDED in the 1.02 m socket, ~1.5 % taper"
sorin_split= dict(roban=.05, fukubachi=.075, ukebana=.045, kurin=.50,
                  suien=.16, ryusha=.06, hoju=.11)          # x L = 12.121 m
kurin      = "9 rings, 673 mm pitch, dia tapering ~1.2 -> 0.8 m; model as 3 groups of 3"
roban      = "1.50 m square x 0.52 m high  (0.238 x S1, h/w 0.344)"
railing    = "veranda + koran on STOREY 5 ONLY. None on 1-4. No ground-level veranda."
infill     = "st.1: plank door centre bay + renji lattice side bays; kentozuka all 3 bays"
             "st.5: kentozuka CENTRE BAY ONLY"
roof       = "hongawara: hira-gawara 303x270 @ ~212 mm exposed, maru-gawara 212 mm working"
             "onigawara at the 4 corners of EVERY roof; 265 kg/m2"

# HARD NEGATIVES
NO_MOKOSHI = True      # confirmed: Hokan-ji has no skirt roof
NO_VERMILION = True    # weathered bare timber
NO_VERANDA_1_TO_4 = True
NO_FORECOURT = True    # the compound is tiny, hemmed in by houses
```

### 5.17 Remaining gaps on the pagoda

1. **Per-storey heights** — my table is the 中山寺 proportional shape mapped onto Hōkan-ji's published
   塔身. Only H₀ and L are measured.
2. **九輪 per-ring diameters and thicknesses** — unpublished for *any* Japanese pagoda.
3. **軒反り and roof pitch specific to Hōkan-ji** — the two corpus rules disagree by ~2×.
4. **本平瓦 working length** — manufacturers leave the field blank; mine is derived.
5. **Upper-storey wall infill** (plaster vs plank) — no textual source found.

All five would be closed by **濱島正士『日本仏塔集成』(中央公論美術出版, 2001)** and the 文化庁 保存図
originals that Hamashima's "図Ⅰ" source-code points to. **Neither is online** — they would need a
library visit. If this project ever justifies one, that book is the single highest-value acquisition.

---

## 6. Kiyomizu-dera (清水寺)

**Critical reading note.** In the cultural-property records, 桁行九間 / 梁間七間 means **nine bays by
seven bays — a COUNT of bays, not a length**. Japanese Wikipedia states this explicitly:
「ここでいう「間」は長さの単位ではなく、柱間の数を指す」. Every ken→metre figure below marked
`[DERIVED]` is a conversion, not a published measurement.

### 6.0 The cultural-property record set

All buildings share designation number 01638. Source for every 構造及び形式 string:
**国指定文化財等データベース**, `https://kunishitei.bunka.go.jp/heritage/detail/102/<id>` `[HIGH]`

| 棟名 | id | 構造及び形式等 (verbatim) | Date | Status |
|---|---|---|---|---|
| **本堂** | 1729 | 懸造、桁行九間、梁間七間、一重、寄棟造、東西北面もこし付、正面両翼廊及び庇付、西面翼廊付、檜皮葺、正面舞台付 | 寛永10 / **1633** | **国宝** |
| 仁王門 | 1730 | 三間一戸楼門、入母屋造、檜皮葺 | 室町後期 (c.1500) | 重文 |
| 馬駐 | 1731 | 桁行五間、梁間二間、一重、切妻造、本瓦葺 | 室町後期 | 重文 |
| 鐘楼 | 1732 | 桁行一間、梁間二間、一重、切妻造、本瓦葺 | 慶長12 / **1607** | 重文 |
| 西門 | 1733 | 三間一戸八脚門、切妻造、正面向拝一間、背面軒唐破風付、檜皮葺 | 寛永8 / **1631** | 重文 |
| 三重塔 | 1734 | 三間三重塔婆、本瓦葺 | 寛永9 / **1632** | 重文 |
| 経堂 | 1735 | 桁行五間、梁間四間、背面庇付、一重、入母屋造、本瓦葺 | 寛永頃 | 重文 |
| 田村堂 | 1736 | 桁行三間、梁間三間、一重、入母屋造、**檜皮葺** | 寛永頃 | 重文 |
| 朝倉堂 | 1737 | 桁行五間、梁間三間、一重、入母屋造、本瓦葺 | 寛永頃 | 重文 |
| 轟門 | 1738 | 三間一戸八脚門、切妻造、本瓦葺 | 寛永頃 | 重文 |
| 本坊北総門 | 1739 | 一間潜付薬医門、切妻造、本瓦葺 | 寛永頃 | 重文 |
| 鎮守堂（春日社） | 1740 | 一間社春日造、檜皮葺 | 寛永頃 | 重文 |
| 釈迦堂 | 1741 | 桁行三間、梁間三間、一重、寄棟造、背面一間通り庇付、檜皮葺 | 寛永8 / 1631 | 重文 |
| 阿弥陀堂 | 1742 | 桁行三間、梁間三間、一重、入母屋造、背面一間通り庇付、**桟瓦葺** | 寛永頃 | 重文 |
| **奥院** | 1743 | **懸造、桁行五間、梁間五間、一重、寄棟造、檜皮葺** | 寛永10 / 1633 | 重文 |
| 子安塔 | 1744 | **三間三重塔婆、檜皮葺** | 江戸前期 寛永頃 | 重文 |

**Roof-material conflicts — resolve in favour of the record:** 田村堂 is **檜皮葺** (Wikipedia says
tile — wrong); 阿弥陀堂 is **桟瓦葺**, i.e. flat pantile, not 本瓦 (the temple's own map page says
hiwada — wrong); **子安塔 is 檜皮葺, NOT 本瓦葺** — the most commonly mis-modelled fact about it.

Site data `[HIGH]` kiyomizudera.or.jp/history.php: precinct **≈130,000 m²**, **30+ halls and pagodas**,
founded **778**, rebuilt almost entirely in **1633** after the **1629** fire, WHS **1994**.
清水山 (音羽山) summit **242 m**; the precinct is terraced into the hillside on stone retaining walls.
The approach (清水坂) is **≈1.2 km** from 東大路通, and is the extension of **松原通**, the old Gojō.

### 6.1 仁王門 (Niōmon, ICP)

| Item | Value | Flag |
|---|---|---|
| Type | **三間一戸楼門, 入母屋造, 檜皮葺** — two-storey gate, 3 bays, single doorway | `[HIGH]` kunishitei 1730 |
| **正面 (width)** | **≈10 m** | `[HIGH]` kiyomizudera.or.jp/map.php |
| **側面 (depth)** | **≈5 m** | `[HIGH]` map.php |
| **棟高 (ridge)** | **≈14 m** | `[HIGH]` map.php |
| Bay module | 10 / 3 = **3.33 m** mean; a 楼門 has a wider centre bay — model **centre 3.9 m, flanks 3.05 m**; depth 5 / 2 = **2.50 m** per bay | `[DERIVED]` |
| **CONFLICT** | Tourist sites quote **奥行8.4 m**. Irreconcilable with a 2-bay gate of 10 m frontage; it probably includes the stone podium and steps. **Reject; use 5 m.** | `[LOW]` rejected |
| Colour | **朱塗 vermilion** — it is nicknamed **赤門 (the Red Gate)** | `[MED]` Wikipedia-JA |
| History | Burnt 1469 (Ōnin War), rebuilt **c.1500**; **the only major hall to escape the 1629 fire** (with 馬駐 and 鐘楼); dismantled and restored **2003** | `[HIGH]` 文化遺産オンライン 200659 |
| **仁王 (Niō) statues** | **像高 365 cm = 3.65 m** — among the largest in Kyoto | `[MED-HIGH]` |
| 狛犬 | A pair in front, **both with open mouths** (unusual — normally one open, one closed). They belong to 地主神社. | `[MED]` |

**Stone steps up from 清水坂: `[UNKNOWN]`** — no Japanese source publishes a count. **Suggest two
flights totalling 22–26 risers, rise 0.16 m, tread 0.36 m, clear stair width 9–10 m** (as wide as the
gate frontage, split around a central landing), because the gate platform sits ~3.5–4 m above the
street at the end of the approach and Kyoto podium stairs of this period run shallow.

### 6.2 西門 (Saimon, ICP 1631) and 鐘楼 (Shōrō, ICP 1607)

**西門** — 三間一戸**八脚門**, 切妻造, **正面向拝一間, 背面軒唐破風付**, 檜皮葺. `[HIGH]` kunishitei 1733

- Internally **floored (床板)** with a **格天井 coffered ceiling** — 「門というよりは神社の拝殿のように
  見え、特殊な用途をもった建物と推定」. `[MED]` Wikipedia-JA. Treat it as a hall-shaped gate.
- Colour: **全面朱塗**, and the bracketing / 蟇股 under the eaves are **極彩色 (full polychrome)**. `[MED]`
- Function: the **日想観 (nissōkan)** platform — the sunset-viewing point toward the Western Paradise.
- **Metric size `[UNKNOWN]` — suggest 8.5–9.0 m wide × 5.0–5.5 m deep, ridge ≈8 m**, because it is
  visibly narrower in frontage than the 10 m Niōmon yet reads as a wide low single-storey gate.
  (Strict Kyoma on 3×2 bays would give only 5.9 × 3.9 m — too small for the photographs; 八脚門 of
  this rank run 8–10 shaku bays.)
- **Date conflict:** record says **1631 (寛永8)**; Wikipedia and the temple map page say 1633.
  **Use 1631** (the record).

**鐘楼** — 桁行一間、梁間二間、切妻造、本瓦葺. `[HIGH]` kunishitei 1732

- A **6-pillar** belfry (the normal form is 4 pillars). Rebuilt on the present site **1607**; survived
  the 1629 fire.
- Plan `[DERIVED]`: 1 × 2 bays → Kyoma 1.97 × 3.94 m; more likely 8-shaku bays → **2.4 × 4.8 m**.
- Momoyama carving programme: **牡丹彫刻の懸魚** (peony gable pendant), **菊花彫刻の蟇股**
  (chrysanthemum frog-leg struts), **獏と象の木鼻** (tapir and elephant nose-brackets) at the four
  corner columns. `[HIGH]` map.php. Natural timber + tile body with polychrome detail — not a
  fully vermilion structure.
- Bell size `[UNKNOWN] — suggest 1.6 m tall × 0.9 m mouth diameter` for a belfry of this footprint.

### 6.3 三重塔 (Three-storey pagoda, ICP 1632)

**Type:** 三間三重塔婆、**本瓦葺**. Founded 847; present tower **1632**. `[HIGH]` kunishitei 1734

**HEIGHT — the conflict laid out in full:**

| Figure | Source | Flag |
|---|---|---|
| **約30 m** | **kiyomizudera.or.jp/map.php — the temple itself** | **`[HIGH]`** |
| **30.2 m** | shirokokuho.shakunage.net (pagoda survey site) | `[MED]` |
| **約31 m** | ja.wikipedia.org/wiki/清水寺 | `[MED]` |
| 約31 m | several tourist sites repeating Wikipedia | `[LOW]` |

**VERDICT: use 30.2 m** (plinth to top of finial), tolerance ±1 m. It is the only figure with a
decimal, and it agrees with the temple's own "約30 m". The 31 m figure originates in Wikipedia and
propagates downstream. Your brief's 30.1 m is a rounding of 30.2 m.

**"Tallest three-storey pagoda in Japan" — THE CLAIM IS OVERSTATED. Do not assert it.**
The temple's own wording is **「国内最大級の三重塔」 — "among the largest", not "the tallest"**
(map.php `[HIGH]`). Secondary sources escalate this to 日本最大. Wikipedia-JA's 三重塔 list gives
Kiyomizu no height and no ranking. **Defensible statement: one of the largest three-storey pagodas in
Japan, at roughly 30 m.** For calibration: 安楽寺八角三重塔 18.75 m, 興福寺三重塔 19 m,
一乗寺三重塔 ~21.8 m.

| Item | Value | Flag |
|---|---|---|
| 初重一辺 (first-storey side) | **≈6.0 m** (range 5.8–6.3). Derivation: for Japanese three-storey pagodas 総高 : 初重一辺 ≈ 4.8–5.3; 30.2 / 5.0 = 6.0. Three bays: **centre 2.15 m, flanks 1.93 m** (centre bay ~10 % wider) | `[DERIVED]` |
| 相輪 (finial) | **≈9.0 m** (range 8.5–9.5) = 0.28–0.33 × total. Components 露盤・伏鉢・請花・九輪(9 rings)・水煙・龍車・宝珠, bronze | `[DERIVED]` |
| 逓減率 (taper) | **≈0.88 per storey** → 初重 6.0 m, 2重 ≈5.3 m, 3重 ≈4.6 m. Reads visually as a *slow* taper (a "fat" pagoda), which is exactly why it is called 最大級 | `[DERIVED]` |
| Colour | **朱塗 vermilion**, exterior **極彩色 restored in the dismantling repair completed 1987 (昭和62)** | `[MED]` Wikipedia-JA |
| Interior | 大日如来 on the centre altar, 真言八祖 on the four walls, dragons on ceiling and columns, all 極彩色 | `[HIGH]` map.php |
| Roof | **本瓦葺** — strongly ribbed grey-black round-and-flat tile, with corner **風鐸 (bronze wind bells)** | `[HIGH]` |

**Visual contrast to exploit:** the vermilion, hard-ribbed, cold-grey-roofed pagoda stands ~150 m
from the un-painted, soft, warm-brown hiwadabuki Hondō. That pairing is the signature of the site.

### 6.4 本堂 (Hondō, National Treasure 1633) + 舞台 — THE KEY OBJECT

#### 6.4.1 The building

| Item | Value | Flag |
|---|---|---|
| Patron / date | 徳川家光, completed **寛永10 = 1633** | `[HIGH]` |
| **間口 (overall width, incl. 裳階 + 翼廊)** | **36 m** | `[MED]` Wikipedia-JA:「裳階、翼廊を含めた平面規模は間口36メートル、奥行31メートル」 |
| **奥行 (overall depth, incl. stage)** | **31 m** | `[MED]` same |
| **棟高 (ridge height)** | **≈18 m** | `[LOW-MED]` two independent restatements |
| **屋根面積 (roof area)** | **2,050 m² = 約620坪** | **`[HIGH]`** kiyomizudera.or.jp + Nippon Steel ROOF STYLE |
| Roof form | **寄棟造 (hipped) with 起り (mukuri — a convex swelling across the slope)** — the ICP commentary praises 「複雑な屋根を巧みに処理した…屋根面に起りをつける優雅な手法」 | `[HIGH]` kunishitei 1729 解説 |

**PLAN RECONCILIATION — this is the load-bearing geometry. Both equations close on the published
36 × 31 m, which is why I trust it.** `[DERIVED]`

```
core bay module      = 8 shaku = 2.42 m
mokoshi/hisashi bay  = 2.00 m  (6.6 shaku)
moya (身舎) 9 x 7    = 21.8 m (E-W) x 17.0 m (N-S)

WIDTH : 21.8 + 2.00 (E mokoshi) + 2.00 (W mokoshi) = 25.8
        + 2 x 5.1 (the two wings)                  = 36.0 m   OK
DEPTH : 17.0 + 2.00 (N mokoshi) + 2.00 (S hisashi) = 21.0
        + 10.0 (the stage)                         = 31.0 m   OK
```

**Interior division** `[MED]` Wikipedia-JA citing the temple: the 7-bay-deep moya splits rear-to-front
as **内々陣 3 bays / 内陣 1 bay / 外陣 3 bays**. The 内々陣 holds a **5-bay-wide 須弥壇**, with the
floor around it dropped one level to a stone-paved earth floor. The 外陣 has **no omitted columns —
free-standing columns at equal spacing**. Visitors reach only the 外陣. E/W/S the 外陣 is wrapped by a
1-bay corridor with **蔀戸 (hinged lattice shutters)** at the 外陣/corridor line. The 裳階 along the
正堂 contains **局 (tsubone, vigil cells)**.

#### 6.4.2 舞台 — the stage. **Your brief's 18 m × 10 m is WRONG; the stage is wider.**

| Figure | Value | Flag |
|---|---|---|
| **Area, official** | **≈200 m²** — 「166枚の桧板の舞台の床面積は約200平方メートル」 | **`[HIGH]`** kiyomizudera.or.jp/history.php |
| Area, official alt | **100畳 (約190 m²)** | `[HIGH]` kiyomizudera.or.jp/read/清水寺の舞台裏 |
| **Plan, reading A** | **≈22 m (E–W) × ≈9 m (N–S) = 198 m²** | `[MED]` japan-geographic.tv |
| Plan, reading B | 18.3 m × 10 m = 183 m² (the popular quote) | `[LOW-MED]` |
| **Height above ground** | **≈13 m** — 「崖下の礎石からは約13メートルの高さ」「4階建てのビルに相当」 | **`[HIGH]`** history.php |
| Height, alt | **≈12 m** | `[MED]` 日本経済新聞 2013-06-28 |

**VERDICT — two independent checks defeat the 18 m figure:**
1. 22 × 9 = **198 m²**, matching the temple's own ≈200 m² almost exactly. 18.3 × 10 = 183 m² does not.
2. Wikipedia states the stage sits **between** the two wings (「両翼廊の間に舞台を設ける」). From the
   plan reconciliation, 36 m − 2 × 5.1 m = **21.8 m** of clear width between them. ✔

```
STAGE = 21.8 m (E-W) x 9.6 m (N-S) = 209 m2 of deck, ~200 m2 of projecting stage
STAGE_DECK_ABOVE_GROUND = 13.0 m at the front row of pillars
```
The 12 m figure is measured from higher ground; the terrain under the stage is not level, so both are
true at different stations. Model the ground falling away so the front rank stands ~13 m and the rear
ranks are progressively shorter.

#### 6.4.3 懸造 (kakezukuri) — THE PILLAR-COUNT CONFLICT, RESOLVED

These are **four different populations, not four claims about one number.**

| Count | What it counts | Source | Flag |
|---:|---|---|---|
| **168** | **All pillars under the whole 本堂** | 日本経済新聞 2013-06-28 | `[MED-HIGH]` |
| **78** | **Pillars beneath the 舞台 specifically** — 「舞台の下にある78本の柱のうち9本を修理する」 | **日本経済新聞 2013-08-22, reported from inside the restoration scaffold** | **`[HIGH]`** |
| **18** | The **major zelkova columns** carrying the stage deck — 「舞台を支えているのは、床下に建てられた18本もの柱」 | kiyomizudera.or.jp/history.php | `[HIGH]` |
| **6** | The **front rank**: 16-sided in plan (平面十六角形), 12 m long | Wikipedia-JA citing the temple | `[MED-HIGH]` |
| ~~139~~ | Hedged in Wikipedia with 「139本**という**」, uncited, and inconsistent with both 168 and 78 | Wikipedia-JA | **`[MED]` — DO NOT BUILD TO THIS** |

**Your brief's 139 is the weakest number in the whole dossier. Build 168 total, of which 78 fall
under the stage footprint, 18 counted as "major", front rank of 6 sixteen-sided.**

#### 6.4.4 Pillar geometry

| Item | Value | Flag |
|---|---|---|
| Species | **欅 keyaki (zelkova)** throughout | `[HIGH]` |
| **Longest pillar** | **≈12 m** (the 6 front 16-sided columns) | `[HIGH]` history.php |
| Longest, alt | **max 14 m** | `[HIGH]` 日経 2013-08-22 |
| **Diameter** | **周囲約2 m → φ 0.637 m ≈ 2.1 尺** | **`[HIGH]`** history.php:「大きいもので長さ約12メートル、**周囲約2メートル**」 |
| Diameter, alt | **φ 0.60–0.80 m** | `[HIGH]` 日経 2013-08-22:「直径60～80センチで長さは最長14メートル」 |
| **⚠ BAD FIGURE — reject** | The temple's own essay says 「高さ10メートル、**直径2メートル**を超える」. That is **周囲 (circumference) misread as 直径 (diameter)** — the same site's history.php says 周囲約2 m. **Reject φ 2 m.** | rejected |
| **BUILD VALUE** | **φ 0.62–0.65 m typical (2 尺), up to 0.80 m for the largest; 12 m front rank, 14 m absolute max** | reconciled |
| Timber age | **樹齢300–400年** zelkova | `[HIGH]` |
| Column base | **束石 (stone pad)** — the pillars simply STAND on stone, unfixed | `[MED]` Wikipedia-JA 懸造 |
| Repair | **根継ぎ (root-splicing)**: the rotted base is cut away **300–900 mm** and a new length scarfed on. 9 of the 78 stage pillars were spliced in 2013 — **the first time since 1633** | `[HIGH]` |
| Replanting | Zelkova planted since **2000** at 3 sites (京北町, 花背, 舞鶴市); ~6,000 keyaki/hinoki, for the repair due in ~400 years | `[HIGH]` |

#### 6.4.5 貫 (nuki) tie-beam grid

Described qualitatively but **never dimensioned in any published source.**

- 「その縦横には何本もの貫が通されています」— **zelkova thick planks threaded through the columns in
  both directions**, forming a lattice. `[HIGH]` history.php
- 「その縦横にいくつもの貫と呼ばれる**欅の厚板**を通して接合」 `[HIGH]`
- Structural action: 「格子状に組まれた木材同士が支え合い、衝撃を分散する」; Wikipedia-JA 懸造:
  「束石の上に柱を立て、束柱相互を貫で縫う工法…床下が弾力性のあるラーメン状の架構となり、きわめて強固」
  — i.e. a **moment-frame cage sitting loose on stone pads**. `[HIGH]`
- **`[UNKNOWN]` — suggest 5 tiers of nuki on the tallest (front) bays at ~2.4 m vertical centres**
  from the 束石 up to the deck girders, because 13 m of height divides naturally into 5 storeys at the
  same 8-shaku (2.42 m) module as the plan grid, and photographs of the underside show 5–6 clearly
  readable horizontal bands.
- **`[UNKNOWN]` cross-section — suggest 240 mm deep × 90 mm thick (8寸 × 3寸)** zelkova plank,
  mortised through the columns and **locked with 楔 (hardwood wedges)** — the wedge detail is
  documented: 「わずかにできた隙間は楔で締めて固定されています」 `[HIGH]`

#### 6.4.6 THE NAIL QUESTION — the accurate statement

The temple says `[HIGH]` history.php:
> 「木材同士をたくみに接合するこの構造は『継ぎ手』と呼ばれ、**釘を1本も使用していません**。」

The grammatical subject is **the kakezukuri substructure**. Wikipedia-JA generalises it to the whole
building 「なお、釘はいっさい使われていない」 and cites a **coffee-table book** (新建築社『NHK 夢の
美術館 世界の名建築100選』2008, p.28) — the weakest citation in this dossier.

**Precise, defensible statement:**
- ✅ **TRUE of the 懸造 scaffold.** The 168 zelkova uprights and the nuki lacing them use no metal
  nails: mortise-and-tenon 継ぎ手 joinery, tightened with **hardwood 楔**, standing loose on 束石.
- ❌ **FALSE of the building as a whole.** The **檜皮葺 roof is nailed with 竹釘 (bamboo nails)** —
  on the order of **1.5–1.9 million of them**, driven at ~20 mm spacing. The stage deck boards are
  fixed down and re-laid every 20–30 years. Ordinary metal fittings (金具, 鎹) appear where a 1633
  Edo hall would have them.
- The reason the substructure *can* be nail-free is exactly the reason given for its durability:
  「点検・修理が容易に行え、**部材の取替えも可能**」 — every member can be pulled and swapped, which
  is how 根継ぎ works. `[MED]` Wikipedia-JA 懸造

#### 6.4.7 檜皮葺 (hiwadabuki) — the cypress-bark roof

| Item | Value | Flag |
|---|---|---|
| **Roof area** | **2,050 m² = 約620坪** | **`[HIGH]`** |
| Campaign | 平成の大修理, **9 buildings**, begun 2008. Hondō roof **Feb 2017 → Feb 2020**; stage re-decking finished **Dec 2020** | `[HIGH]` |
| Previous re-roofing | **1967 (昭和42)** — a **50-year** interval | `[HIGH]` |
| **檜皮 shingle length used at Kiyomizu** | **960 mm** — recovered from Edo documents and reinstated; longer/heavier than the modern standard | **`[HIGH]`** 日経 2019-08-23:「江戸時代には屋根に長さ96㎝の檜皮葺を使用していたことが分かり、今回この仕様で復することとした」 |
| Standard 檜皮 shingle (comparison) | **750 × 150 mm**, made by beating 2–3 bark layers into one shingle | `[MED]` Wikipedia-JA 檜皮葺 |
| **Shingle thickness** | **≈3 mm** each | `[MED]` |
| **葺足 (exposure per course)** | **12 mm** — each shingle shows only 12 mm; lateral overlap 6 mm each side | `[MED-HIGH]` |
| 竹釘 fixing | Bamboo nails after every **5 layers**, at **~20 mm** spacing | `[MED]` |
| Bamboo nails per 坪 | **2,400–3,000 / 坪 (3.3 m²)** | `[MED]` |
| **Total bamboo nails, Hondō roof** | 620 × 2,400–3,000 = **≈1.5–1.9 million** | `[DERIVED]` |
| **Finished field thickness** | **≈100 mm** | `[MED]` |
| **軒付 (eave build-up)** | 「軒先に檜皮を積み重ねて高さ数十cmの軒付をつくる」, then trimmed dead-straight with a 釿 (adze) | `[MED]` |
| **EAVE-EDGE THICKNESS — build value** | **≈250 mm (range 200–300 mm)**. Because: field is 100 mm, the 軒付 is "several tens of cm", and Kiyomizu used 960 mm shingles (30 % longer than standard) specifically to build a thicker, tougher eave. **Model the eave as a 250 mm-deep, razor-cut, slightly convex band — this is the single most characteristic silhouette cue of the building.** | `[DERIVED]` |
| Material sourced | **≈100 tonnes** of bark from western Japan; procurement begun **8–10 years** ahead | `[HIGH]` |
| **Number of bark bundles (丸)** | **`[UNKNOWN]` — not published. Suggest quoting the 100 t tonnage instead**, because Japanese re-roofing contracts are specified by weight and by 坪, never by bundle. | |
| Craftsmen | **10+ 檜皮葺職人, ~2 years** on the roof | `[HIGH]` |
| Bark source trees | 樹齢**70–80年**+, trunk **φ≥600 mm**; bark regrows in **8–10 years**; roof service life **30–35 years** | `[MED]` |
| UNESCO | 檜皮葺・杮葺 inscribed 2020 within「伝統建築工匠の技」 | `[HIGH]` |

**HOW HIWADABUKI MUST LOOK vs TILE — the render brief:**

| | 檜皮葺 (Hondō, Niōmon, Saimon, Okunoin, Koyasu-tō) | 本瓦葺 (三重塔, 経堂, 朝倉堂, 轟門, 鐘楼, 馬駐) |
|---|---|---|
| Colour | Warm **russet/cinnamon brown** when new → soft **grey-brown** with age | Cold **blue-grey to black** |
| Surface | **Matte, velvety, faintly fibrous. NO RIBS.** The only strong shadow line is the eave. | Hard rounded ribs (丸瓦) every ~0.30 m throwing strong parallel shadows |
| Section | **Thick and soft — 100 mm field, ~250 mm at the eave**, eave cut razor-clean and running as a taut, slightly upswept curve | Thin, with a scalloped or straight tile-edge |
| Slope | **起り (convex swelling)** across the slope: bulges gently up at mid-slope, then turns down and flares at the eave | Straight or slightly concave |
| Ridge | **NO 鬼瓦, NO 棟瓦.** A **箱棟** — a rectangular boxed ridge of bound bark, usually copper-capped, reading as a plain dark horizontal bar. Hip ridges (降棟) are soft bark rolls. `[UNKNOWN] — suggest 0.55 m high × 0.65 m wide` | 鬼瓦 end-blocks, stacked 熨斗瓦 ridge courses |
| Corners | Hips sweep; corners lift **more** than a tiled roof of the same span can | Less lift |

#### 6.4.8 舞台 deck boards

| Figure | Value | Flag |
|---|---|---|
| **166 planks** | 「「平成の大修理」で張り替えられた**166枚**の桧板の舞台の床面積は約200平方メートル」 | **`[HIGH]`** history.php, and Wikipedia-JA citing it |
| ~~約410 planks~~ | 「舞台床に敷き詰められた桧板はおよそ**410枚**」 | `[HIGH]`-hosted but **UNRELIABLE** — same essay (read/清水寺の舞台裏) also contains the demonstrably wrong "直径2 m" pillar figure |
| Material | **檜 hinoki** — hence the idiom 「桧舞台を踏む」 | `[HIGH]` |
| Thickness | **≈100 mm** | `[LOW]` |
| Replacement cycle | **25–30 years** (Wikipedia/temple); 20–30 (kyoto-note) | `[MED]` |

**VERDICT: 166.** It is the figure attached to a measured area and to the specific Heisei re-decking.
`[DERIVED]` 166 planks over ~200 m² = **1.20 m² per plank**. Build the deck as **0.30 m-wide (1 shaku),
~0.09–0.10 m-thick hinoki planks running N–S with a staggered mid-span joint**, ~166 pieces. The 410
figure would require 0.13 m-wide boards — far too narrow for a stage and inconsistent with photographs.

#### 6.4.9 翼廊 (wings) and 楽舎

- Two **翼廊, also called 楽舎 (gakusha, musicians' galleries)** project south at the **east and west
  ends** of the south face; the stage lies **between** them. `[MED]` Wikipedia-JA
- Roof form: **入母屋造・妻入 (gable end facing forward)** — deliberately breaking the long hip line
  of the main roof. `[HIGH]`
- A **third wing** projects west outside the west 裳階: the **車寄 (kurumayose, carriage porch)**. `[HIGH]`
- `[DERIVED]` **wing width ≈5.1 m each** (36 − 25.8, ÷2); **projection south ≈6–8 m**, bringing their
  gable ends roughly level with the stage edge.
- Function: the gakusha house musicians for 奉納芸能. The stage is 「特別な法会などの際に観音さまに
  芸能を奉納するための場所」 — a **votive performance platform**, not a viewing balcony. `[HIGH]`
- **Railings:** the stage balustrade is, in origin, a **Meiji addition** — jumping from the stage was
  banned by Kyoto Prefecture in **1872** and railings were added then. (Records 1694–1864 log **235
  jumps, 34 deaths, an 85.4 % survival rate**.) `[MED]` Wikipedia-JA citing『成就院日記』

### 6.5 奥の院 (Okunoin, ICP 1633)

| Item | Value | Flag |
|---|---|---|
| Record form | **懸造、桁行五間、梁間五間、一重、寄棟造、檜皮葺** | `[HIGH]` kunishitei 1743 |
| Plan | 5 × 5 bays. At the Hondō's 8-shaku module: 12.1 × 12.1 m; at Kyoma: 9.85 × 9.85 m. **Suggest 11.0 × 11.0 m** | `[DERIVED]` |
| Relative size | Core-bay count 25 vs the Hondō's 63 → **≈40 % of the Hondō core**; ~121 m² vs 1,116 m² overall → **≈11 %, roughly one-ninth** | `[DERIVED]` |
| Own stage | Yes — its own kakezukuri deck, much smaller and lower. **`[UNKNOWN]` — suggest ~11 m × 4 m at ~5–6 m above the rock**, because it is a shallow hisashi-depth deck sitting directly above the 4 m-tall Otowa falls | existence `[HIGH]`, size `[DERIVED]` |
| Position | Directly **above 音羽の滝**; **the classic viewpoint from which the whole Hondō and stage are seen** | `[HIGH]` |
| Restoration | **2011–2017**. The 極彩色 on the bracket sets was repainted from paint-survey evidence **except on the south face, which was left untouched** because its original paint survives well. **The building is deliberately two-tone — model it that way.** | **`[HIGH]`** kiyomizudera.or.jp/read/過去と現在が混在する修理 |
| Interior | Same programme as the Hondō but the 千手観音 is **seated**, not standing. Secret Buddha: 千手観音坐像 (ICP, Kamakura, 一木割矧造, **像高 63.9 cm**) | `[MED]` |

### 6.6 音羽の滝 (Otowa Waterfall)

| Item | Value | Flag |
|---|---|---|
| **Drop height** | **≈4 m** | `[MED]` |
| Streams | **3 streams, delivered through 3本の筧 (kakei — split-bamboo/timber flumes)**. It is **not** a natural sheet fall — model three discrete spouts. | `[HIGH]` Wikipedia-JA + map.php |
| Water names | 金色水 / 延命水 | `[HIGH]` |
| Ritual | Caught in a long-handled **柄杓 (hishaku)** from a rack; 六根清浄・所願成就 | `[HIGH]` |
| Deity | **不動明王** enshrined at the falls | `[MED]` |
| Position | At the foot of the cliff carrying **奥の院** — Okunoin is directly overhead | `[HIGH]` |
| **Stream spacing** | **`[UNKNOWN]` — suggest 1.3 m centre-to-centre (total spread ~2.6 m)**, because three people queue abreast with individually racked, UV-sterilised ladles, and rack pitch plus shoulder clearance lands at 1.2–1.4 m | |
| **Shelter** | A small **本瓦葺 roofed structure** with a front rail and the ladle-steriliser cabinet. **`[UNKNOWN]` — suggest 6 m wide × 3 m deep, eaves ~2.8 m**, sized to shelter three queues | |
| **Pool** | Dressed-stone catch basin, ~0.5 m deep. **`[UNKNOWN]` — suggest 4.0 × 1.5 m** | |

### 6.7 子安塔 (Koyasu-tō, ICP)

| Item | Value | Flag |
|---|---|---|
| Record form | **三間三重塔婆、檜皮葺** — **hiwadabuki, NOT tile.** The most commonly mis-modelled fact about this building. | **`[HIGH]`** kunishitei 1744 |
| **Height** | **15 m** — 「高さは15メートルで、仁王門近くにある三重塔の**約半分**である」 | `[MED]` Wikipedia-JA |
| 初重一辺 | **≈3.0 m**; 相輪 **≈4.5 m** | `[DERIVED]` (15 / 5) |
| **Date CONFLICT** | Record: **江戸前期 寛永頃 (1624–43)**. Wikipedia + temple map: **明応9年 = 1500 再建**. The record's attribution is the formal one and fits the post-1629 rebuild; 1500 is the temple's traditional date. **Report both.** | — |
| Colour | **朱塗 vermilion**, brightly restored in a modern repair — conspicuously redder than the weathered 三重塔 | `[MED]` |
| Location | Across the 錦雲渓 valley to the **south**, past 音羽の滝 and 泰産寺 — **the standard postcard vantage looking back at the Hondō.** | `[HIGH]` |
| **Relocation** | Originally stood **below the 仁王門 on the south side**; **moved to its present site in 1911 (明治44)** — Wikipedia 清水寺; the Wikipedia 三重塔 list says 1912. Minor conflict. | `[MED]` |
| Naming link | **産寧坂 (三年坂) is named as the pilgrimage road to the Koyasu-tō at its OLD location** — relevant if you are reasoning about why the street runs where it does | `[MED]` |

### 6.8 The remaining halls — all `[HIGH]` record forms, `[DERIVED]` metres

Two conversions are given because the Hondō demonstrably uses an 8-shaku (2.42 m) bay, larger than Kyoma.

| Building | Record form | @ Kyoma 1.97 m | @ 8尺 2.42 m | Notes |
|---|---|---|---|---|
| **経堂** | 桁行五間、梁間四間、背面庇付、入母屋造、**本瓦葺** | 9.85 × 7.88 m | 12.1 × 9.7 m | Beside the 三重塔. Dismantling repair **2000**. **鏡天井 with a 円龍 in ink by 岡村信基**. Doubles as the lecture hall. |
| **田村堂 (開山堂)** | 桁行三間、梁間三間、入母屋造、**檜皮葺** | 5.91 × 5.91 m | 7.27 × 7.27 m | Open 厨子 with 坂上田村麻呂・三善高子; 行叡・延鎮 to the left. Normally closed. |
| **朝倉堂** | 桁行五間、梁間三間、入母屋造、**本瓦葺** | 9.85 × 5.91 m | 12.1 × 7.27 m | The original 1510 building was **a miniature of the Hondō with its own kakezukuri stage**; the present one is on **flat ground — no kakezukuri**. Repair 2013. Holds 33 Saigoku Kannon copies. |
| **釈迦堂** | 桁行三間、梁間三間、寄棟造、背面一間通り庇付、**檜皮葺** | 5.91 × 5.91 m | 7.27 × 7.27 m | **Destroyed by a landslide in the July 1972 torrential rain; rebuilt 1975 from salvaged original members.** |
| **阿弥陀堂** | 桁行三間、梁間三間、入母屋造、背面一間通り庇付、**桟瓦葺** | 5.91 × 5.91 m | 7.27 × 7.27 m | Front 外陣 converted into the passage to Okunoin. Plaque 「日本最初常行念仏道場」. |
| **轟門** | 三間一戸八脚門、切妻造、**本瓦葺** | 5.91 × 3.94 m | 7.27 × 4.85 m | The ticket gate into the Hondō precinct. |
| **馬駐** | 桁行五間、梁間二間、切妻造、**本瓦葺** | 9.85 × 3.94 m | 12.1 × 4.85 m | North of the Niōmon. Survived the 1629 fire. **A nationally rare surviving horse-tethering shed** — an open shed with a rail. Repair 2010. |
| **本坊北総門** | 一間潜付薬医門、切妻造、本瓦葺 | ~3.6 m frontage | — | |
| **鎮守堂 (春日社)** | 一間社春日造、**檜皮葺** | ~1.8 m frontage | — | Tiny, vermilion, Kasuga type. |
| **随求堂** | **NOT an ICP — no record, dimensions `[UNKNOWN]`.** Moved 1718, rebuilt **1735**. On axis straight ahead from the Niōmon. Basement **胎内めぐり** pitch-dark circumambulation passage. Honzon 大随求菩薩坐像, wood, **像高 110 cm**, 1728, eight arms. **Suggest a 3×3-bay 入母屋 hall ~7 × 7 m** by analogy with 田村堂 and 阿弥陀堂. | — | — | |
| **大講堂** | Modern (**1984**), for the 1200th anniversary. 多宝閣 (a 4-storey atrium) + east and west wings. North of the Niōmon. | — | — | Modern — keep it out of the historic silhouette or model it plainly. |
| **地主神社** | 本殿・拝殿・総門 all **1633**, same campaign; a separate shrine inside the WHS listing | — | — | |

### 6.9 Kiyomizu build-ready summary of the contested numbers

| Quantity | **USE THIS** | Reject / note |
|---|---|---|
| Stage plan | **21.8 × 9.6 m ≈ 200 m²** | Reject the popular 18 × 10 m (=183 m²) |
| Stage height | **13.0 m** at the front, from the 礎石 | 12 m is measured from higher ground |
| Total pillars under the Hondō | **168** | **139 is uncited and hedged — do not use** |
| Pillars under the stage | **78** | — |
| "Major" stage columns | **18**; front **6 are 16-sided in plan** | — |
| Pillar diameter | **0.62–0.65 m (2尺), up to 0.80 m** | **Reject φ 2 m — that is 周囲 2 m misread** |
| Longest pillar | **12 m** front rank; **14 m** absolute max | — |
| Deck planks | **166** hinoki boards, 0.30 m wide, 0.09–0.10 m thick | 410 comes from an essay containing a known error |
| Hondō overall | **36 × 31 m**, ridge **18 m**, roof **2,050 m²** | — |
| Hondō bay module | core **2.42 m (8尺)**, mokoshi/hisashi **2.00 m** | derived, but it closes both the 36 and 31 m equations |
| 三重塔 height | **30.2 m** | 31 m is the Wikipedia outlier |
| "Tallest 3-storey pagoda" | **Say "one of the largest (国内最大級)"** | The temple never claims "tallest" |
| 仁王門 | **10 × 5 m, ridge 14 m**, vermilion; Niō **3.65 m** | Reject the 奥行 8.4 m tourist figure |
| Hiwada roof | field **100 mm**, eave **~250 mm**, shingles **960 mm** long, exposure **12 mm**, **1.5–1.9 M bamboo nails**, **箱棟** not a tile ridge | — |
| Nail-free claim | **True of the kakezukuri frame only** (継ぎ手 + 楔 on 束石); the roof carries 1.5 M+ bamboo nails | Wikipedia's blanket claim cites a picture book |

---

## 7. Street furniture and stone

### 7.0 District frame

| Item | Value | Flag |
|---|---|---|
| 産寧坂 重伝建地区 | **5.3 ha (1976) → 8.2 ha (1996, +石塀小路)**; designated **1976-09-04**; ~65 % traditional | `[HIGH]` |
| 祇園新橋 重伝建地区 | **1.4 ha**, ≈160 m (E–W) × 100 m (N–S); ~70 % traditional; **≈75 buildings** | `[HIGH]` |
| Legal minimum road width (建基法) | **4.0 m** | `[HIGH]` 京都市 路地手引 |
| 2項道路 | ≥1.8 m existing, setback **2.0 m** from centreline | `[HIGH]` |
| 3項道路 (relaxed, for historic lanes) | setback **1.35–2.0 m** → resulting width **2.7–4.0 m** | `[HIGH]` |
| 路地 (roji) definition | any historic road **< 4 m** | `[HIGH]` |
| 袋路 (dead-end) | length ≤70 m (≤35 m variant), entrance ≥0.6 m | `[HIGH]` |

**Alley width rule:** Higashiyama 路地 including Ishibei-kōji sit in the **1.8–4.0 m** band. **Model
2.4–2.7 m.** `[DERIVED]`

### 7.1 Paving (石畳)

**The provenance fact that drives the whole look:** Ninenzaka, Sannenzaka, Ishibei-kōji, Shinbashi-dōri
and Tetsugaku-no-michi are paved wholly or partly with **granite 敷石 salvaged from the Kyoto city
tram system (京都市電)**, which was wound down from ~1960 and abolished in **1978**. `[HIGH]`
city.kyoto.lg.jp/sogo/page/0000022084.html

> **Consequence for the model: the slabs are recycled, so sizes drift, edges are chipped and broken,
> and the courses do not line through. Randomise each slab ±10–20 mm and add corner damage.** A
> perfectly regular grid will look wrong.

| Item | Value | Flag |
|---|---|---|
| **Rectangular slab** | **330 × 600 mm** | `[MED]` |
| **Square slab** | **300 × 300 mm** | `[MED]` |
| Slabs per step tread | **15 pieces** | `[MED]` |
| Total slabs on the slope | **≈650 pieces** | `[MED]` |
| Material | **御影石 (granite)** | `[HIGH]` |
| **Slab thickness** | **`[UNKNOWN]` — suggest 60–80 mm**, because JIS paving-slab thickness classes are 30/60/80 mm, commercial 600×300 granite runs 30–50 mm, and a Kyoto stone yard states the salvaged tram plates are "a size larger than 600×300 and about twice the thickness" of modern plate | |
| Pattern | **Random / coursed-random ashlar** — mixed rectangles and squares in broken courses, NOT a regular running bond. The preservation plan's idiom for the district stonework is 乱積 (random). | `[MED]` |

**The shaku module is visible in the slab sizes:** 330 ≈ 1.1尺 (333 mm), 600 ≈ 2尺 (606 mm),
300 = 1尺 (303 mm). **Lay out on a 300 mm grid.** `[DERIVED]`

`[DERIVED]` **Stepped-section width:** 15 × 330 mm + 14 joints ≈ **5.0 m**; if laid 300-across, 4.5 m.
So the stepped part of Sannenzaka is **4.5–5.0 m** wide.

**JIS A 5371:2016 舗装用平板** (for any modern paving in the scene) `[HIGH]`

| 呼び | Plan (mm) | Thickness (mm) | Tolerance |
|---|---|---|---|
| 300 | 300 × 300 | 30 / 60 / 80 | plan ±3, thickness +2/−3 |
| 400 | 400 × 400 | 60 / 80 | same |
| 450 | 450 × 450 | 60 / 80 | same |
| 500 | 500 × 500 | 60 / 80 | same |

Slip resistance (wet BPN): ≥40 general, **≥60 at vehicle entries**.

**ピンコロ setts** `[MED]` — **90 × 90 × 90 mm** standard; 半ピン 90 × 45 × 90; 2丁掛 90 × 190 × 90;
平ピンコロ 90 × 90 × 45; 100角 100 × 100 × 40.
**But no source shows setts on Ninenzaka/Sannenzaka — the paving there is large flags. Use setts only
for edge bands or gutter aprons, if at all.**

**Joints and build-up** — 全国エクステリアコンクリート協会 舗装用平板施工仕様書 2019 `[HIGH]`

| Layer | Value |
|---|---|
| Slab thickness | 60 mm pedestrian / 80 mm vehicle entry |
| Bedding mortar | **30 mm**, cement:sand **1:3** |
| Bedding sand (alt.) | 30 ±5–10 mm, grain ≤4.75 mm |
| **Mortar joint width** | **3–10 mm** (3–5 mm wet mix, 5–10 mm stiff mix) |
| **Sand joint width** | **3–5 mm** |
| Upper base 上層路盤 | 100 mm (class I) / 150 mm (class II), C-30 or RC-30 crusher run |
| Total pavement thickness | **190 / 260 / 360 mm** by class |
| Expansion joints | every **5–8 m** both ways, **10–15 mm** wide |
| Random-ashlar (乱張り) joint | **≥6 mm**; over 15 mm use a 1:2 site mix | `[MED]` |

**Kerbs (縁石) — JIS A 5371** `[HIGH]`. 歩車道境界ブロック: A 150/170/200 mm (top/bottom/height),
B 180/205/250, C 180/210/300, all **600 mm long**, 45 / 69 / 84 kg. 地先境界ブロック:
A 120×120×120, B 150×150×120, C 150×150×150, 600 mm long. Curved units R = 0.5 / 0.7 / 1.0 m.

> **Higashiyama caveat: these preservation streets are largely KERBLESS single-surface — no raised
> footway. Model a flush granite edge band or a granite channel, not a concrete kerb.**

### 7.2 Drainage (側溝)

**JIS A 5372 鉄筋コンクリートU形側溝, full series** `[HIGH]` (all L = 600 mm)

| 呼び | Internal W × D | Wall | Base | External W | Mass |
|---|---|---|---|---|---|
| 150 | 150 × 150 | 30 | 35 | 210 | 24–25 kg |
| 180 | 180 × 180 | 35 | 40 | 250 | 34 kg |
| **240** | **240 × 240** | 45 | 50 | 330 | 53–55 kg |
| **300A** | **300 × 240** | 50 | 60 | 400 | 67–70 kg |
| **300B** | **300 × 300** | 50 | 60 | 400 | 78–79 kg |
| 300C | 300 × 360 | 50 | 60 | 400 | 89–92 kg |
| 300D | 300 × 450 | 50 | 65 | 400 | 100 kg |
| 360A | 360 × 300 | 50 | 65 | 460 | 90 kg |
| 360B | 360 × 360 | — | — | 460 | — |
| 450 | 450 × 450 | — | — | — | — |
| 600 | 600 × 600 | — | — | — | — |

Foundation: 敷モルタル 1:3 on 100 mm RC-40 crushed stone, extending 100 mm each side.

**⚠ CONFLICT:** some vendor pages state "U240 = internal 220 / external 240 mm". JIS and the
manufacturers' drawing tables both give **internal 240 × 240, external 330**. **Use the JIS figures.**

**L形側溝** (partial series, `[MED]`): L250A w350/a250/c100; L300 w500/a300/c85/e90/f65;
L350 w550/a350/c90/e95/f74. The full catalogue is a scanned image and could not be extracted.

**What is actually on the ground in Higashiyama** `[HIGH]` (京都市 工事記録, 神幸道 works
2018-10-25 → 2019-05-13, in front of Yasaka's south gate):
- Old **L型側溝 removed and replaced with new L型側溝**.
- **The road surface is FAUX STONE, not real stone:** open-graded asphalt + cement-milk penetration
  + shot blast + saw-cut "design cutter" pattern imitating stone paving. Model the newer approach
  roads accordingly — flatter, more regular, no real joints.
- Also received 「景観に配慮したデザインの道路照明灯」.

**Traditional stone gutter (石造側溝) — `[UNKNOWN]`, nothing published. Suggest a granite channel
250–300 mm wide × 120–150 mm deep**, formed as a flat-bottomed dish from 100 mm-thick granite,
because (a) the preservation plan mandates 花崗岩 for all visible stone elements, (b) the smallest
standard U-form is 150 mm and these narrow lanes carry only local runoff, and (c) photographs show a
shallow flush channel, not a covered box. **Open channel** on the preservation streets; grated/covered
only on the modern asphalt sections (神幸道, 東大路).

### 7.3 The steps on Sannenzaka — the best-documented item in this section

| Item | Value | Flag |
|---|---|---|
| **Number of steps** | **46 段** | `[MED]` — three independent sources agree |
| **Riser (蹴上), average** | **145 mm** | `[MED]` |
| **Riser, maximum** | **160 mm** | `[MED]` |
| Total rise of the stepped flight | **≈7 m** (46 × 145 = 6.67 m ✔) | `[MED]` |
| **Ninenzaka tread (踏面)** | **≈800 mm**; the bottom step was formerly ≈2000 mm (since removed) | `[MED]` |
| Ninenzaka step count | **17 段** | `[MED]` |
| **Whole slope length** | **380 m** | `[MED-HIGH]` 坂学会 |
| **Total fall (高低差)** | **28 m** | `[MED-HIGH]` |
| **Average gradient** | **4.2° = 7.4 %** | `[MED-HIGH]` |
| Plan form | L-shaped bend; the steps are at the **upper** end | `[MED-HIGH]` |
| Stepped section length | ≈100 m including landings; ≈50 m of "true" flight | `[MED]` |
| Step width | **4.5–5.0 m** | `[DERIVED]` (15 slabs across) |

`[DERIVED]` **Local step pitch:** riser 145 / going 800 → **10.3° (18 %)**. 46 × 0.8 m = 36.8 m of
actual stepping spread over ~50–100 m, i.e. **roughly half the length is landings. Model as short
flights of 3–6 risers separated by 1.5–4 m landings** — that rhythm is what produces the famous
stepped roofline above it.

**2R + T check:** 2(145) + 800 = **1090 mm**, far above the 600–650 mm indoor comfort rule. This is a
deliberately shallow monumental 参道 stair, not a building stair.

**建築基準法施行令第23条** `[HIGH]`: dwellings 蹴上 ≤230 mm, 踏面 ≥150 mm, width ≥750 mm; general
default 蹴上 ≤220, 踏面 ≥210, width ≥750. Handrail required above 1 m. **A centre handrail is required
if the flight is wider than 3 m — UNLESS 蹴上 ≤150 mm AND 踏面 ≥300 mm.** Sannenzaka's **145 / 800**
satisfies that exemption exactly, which is almost certainly deliberate and is why a 5 m-wide flight
has no centre rail. **Do not model a centre handrail.**

**⚠ CONFLICTING LENGTH FIGURES** — different definitions of extent: **380 m** (坂学会, the whole
清水坂→二年坂 run) · ~200 m · ~100 m ("the steep stone-paved slope") · ~50 m ("the stone steps
proper"). **Use 380 m total / ~50 m stepped.**

### 7.4 石垣 (stone retaining walls)

**What the preservation district actually mandates** `[HIGH]` 産寧坂保存計画:
- **石垣 = 玉石乱積** (uncoursed random cobble), cobble **grain size 100–200 mm**
- **石塀 = 切石布積** (coursed cut ashlar) with a **葛石 (granite coping course)** on top
- 切石 material: **石英斑岩 (quartz porphyry)**; 葛石 material: **花崗岩 (granite)**
- 石垣 may carry a **四つ目垣 or an iron 忍び返し** on top
- Protected environment objects include the 石段, 石畳, 石標, **石灯籠** and **石垣** themselves

> **This is the single most important stonework fact for the district: the town walls here are
> 100–200 mm random cobble, or coursed cut ashlar with a granite cap — NOT castle masonry.**

**間知石 (kenchi-ishi), the standard retaining block** `[MED-HIGH]`

| Grade | Face (H × W) | Depth (控え) | Units/m² | Laid finished face |
|---|---|---|---|---|
| **標準間知石** | **330 × 280 mm** | **≥350 mm** | 13 | 300 × 250 mm |
| **並尺間知石** | **330 × 330 mm** | **≥350 mm** | 11 | 300 × 300 mm |

General range: height 150–300, width 200–400, depth ≥300 mm; a four-sided truncated pyramid with a
roughly square face. Modern 間知ブロック equivalent: 450 × 300 mm face.

**Batter (勾配)** `[HIGH]` 斜面協会 / MLIT standard designs

| Notation | Ratio (V:H) | From horizontal | **Off vertical** |
|---|---|---|---|
| 1分 | 1 : 0.1 | 84.3° | 5.7° |
| **3分** | **1 : 0.3** | **73.3°** | **16.7°** |
| 4分 | 1 : 0.4 | 68.2° | 21.8° |
| **5分** | **1 : 0.5** | **63.4°** | **26.6°** |
| 6分 | 1 : 0.6 | 59.0° | 31.0° |
| 1割 | 1 : 1.0 | 45.0° | 45.0° |

MLIT standard designs use **1:0.3 – 1:0.6**; **3分 and 5分 are the commonest in practice.**
Definition boundary: 石積み = steeper than 1割; 石張り = 1割 or flatter.

**Castle walls by period** (use only for Kiyomizu's platform substructures, not the streets) `[HIGH]`
仙台市「石垣は語る」: period I 野面積 **≈48°**; period II 打込接 **≈60°**; period III 切込接 with
**反り**, **≈70°**, max height **17 m**. Period III blocks are cut with **depth ≈ 2 × face width**.
**扇の勾配 / 寺勾配** `[MED]`: the lower **half** of the height is a straight gentle batter and the
curve is applied over the **upper half**, approaching vertical at the top. 宮勾配 = straight, no curve.

**Build values for Higashiyama:**
```
town / garden retaining walls (Ishibei-koji, machiya plots):
    batter 1:0.3 .. 1:0.5   (73 deg .. 63 deg from horizontal)
    height 1.0 .. 2.5 m, coursed or uncoursed
temple precinct walls: same batter, up to 3-4 m
Kiyomizu platform substructure ONLY: 48 deg nozurazumi, or ogi-no-kobai curve
```

### 7.5 Stone lanterns (石灯籠)

**春日灯籠 (Kasuga-dōrō) — canonical proportions.** Quoted on a 10-shaku basis. `[MED]` 杉田石材

| Part (bottom → top) | 尺 (of 10.1) | **Fraction of total H** | 6尺 lantern (H = 2020 mm) |
|---|---|---:|---|
| 地輪 / 基礎 (base, **hexagonal**) | 0.5 | **0.0495** | **100 mm** |
| 竿 (shaft, **circular**, with 節 rings) | 3.6 | **0.3564** | **720 mm** |
| 中台 (mid platform, hexagonal) | 1.0 | **0.0990** | **200 mm** |
| 火袋 (firebox, hexagonal, with 火口) | 1.7 | **0.1683** | **340 mm** |
| 笠 (roof, hexagonal, 6 × 蕨手) | 1.3 | **0.1287** | **260 mm** |
| 宝珠 (jewel finial) | 2.0 | **0.1980** | **400 mm** |
| **Total** | 10.1 | 1.000 | **2020 mm** |

✅ **Cross-check passes:** the same source separately gives a 6-shaku lantern's 宝珠 as "21丸、高さ38 cm";
the proportion predicts 400 mm — within 5 %. The ratio set is internally consistent.

**⚠ Nominal ≠ actual height.** A "6尺" lantern is **2020 mm** tall, not 6 × 303 = 1818 mm, because the
uncarved 地輪 thickness is excluded from the nominal. **Always use the actual column.** `[MED]`

| Nominal | Nominal (尺 × 303) | **Actual total H** | 地輪 footprint |
|---|---|---|---|
| 5.5尺 | 1667 mm | **2000 mm** | 850 × 800 mm |
| **6尺** | 1818 mm | **2020 mm** | **800 × 800 mm** |
| 7尺 | 2121 mm | **≈2400 mm** | 700 × 700 mm |
| 10尺 | 3030 mm | **3450 mm** | 1050 × 1200 mm |

**The 火袋 rule:** the lantern's shaku designation = **10 × the firebox side length in 寸**. `[MED]`

| Nominal | 火袋 side | Hex across flats (×√3) | Hex across corners (×2) |
|---|---|---|---|
| 4尺 | 4寸 = 121 mm | 210 mm | 242 mm |
| **6尺** | **6寸 = 182 mm** | **315 mm** | **364 mm** |
| 8尺 | 8寸 = 242 mm | 419 mm | 485 mm |
| 10尺 | 10寸 = 303 mm | 525 mm | 606 mm |

**Form** `[MED]`: **竿 is CIRCULAR in section; 笠, 火袋, 中台 and 地輪 are all HEXAGONAL in plan**;
**蕨手 (curled scrolls) at the 6 roof corners**; a 火口 window in the firebox; deer and other reliefs
on the 火袋 and 中台. Weights, 6尺 (~700 kg total): 玉 20 · 笠 100 · 火袋 50 · 中台 60 · 竿 85 ·
地輪 200–450 kg.

`[UNKNOWN]` values with reasoning:
- **竿 shaft diameter — suggest 150 mm at 6尺** (≈0.48 × firebox across-flats, ≈0.074 × total H),
  because the shaft must sit within the 中台 footprint and reads as roughly half the firebox width.
  Scale linearly with total height.
- **笠 width across corners — suggest 600–650 mm at 6尺** (≈1.7 × firebox across-corners, ≈0.30 × H),
  because it must overhang enough for the 蕨手 to read yet stay inside the 800 mm base footprint.
- **節 rings on the 竿 — suggest 2 rings at ~1/3 and ~2/3 of shaft height**, plus a swelling near the
  top; that is the standard Kasuga articulation in photographs.

**雪見灯籠 (Yukimi) — sized by 笠 WIDTH, not height.** `[MED]`

| Nominal | 笠 width | Total height |
|---|---|---|
| 1尺 | **300 mm** | **390 mm** |
| 2尺 | 600 mm | ≈600 mm |
| 2.5尺 | **750 mm** | ≈750 mm |

Rule of thumb: **width ≈ height**. **3 or 4 legs (脚) replace the shaft**; low profile; four sub-types
(丸型/角型 × 現代/古代). Three-leg convention: **two legs face the front / 上座.** 2.5尺 (笠 750 mm)
is the largest two men can carry by hand.

**織部灯籠 (Oribe)** `[MED]`: **NO 基礎 / 基壇 — the 竿 is buried directly in the ground**, so overall
height is adjustable and deliberately shorter than a shrine lantern (it is a tea-garden 露地 object).
宝珠 with a 露盤 base plate · **笠 SQUARE with a raised convex curve (起り)** · 火袋 square ·
中台 square · **竿 rectangular in section with a rounded swelling at the top**. Also called
切支丹灯籠. Typical above-ground height **≈1200 mm** `[LOW]`.

**Spacing along an approach (参道)** — `[UNKNOWN]`, no authoritative figure. Data point: Kasuga Taisha
has **≈2,000** stone lanterns in its precincts and approach `[LOW]`. **Suggest 4.0–6.0 m
centre-to-centre in paired rows, set back 0.6–1.0 m from the path edge**, because a 6-shaku Kasuga has
an 800 mm base and photographs of lantern-lined approaches read as a gap of 5–7 base-widths.

**For Sannenzaka specifically:** 石灯籠 are named in the preservation plan as protected environment
objects, so they exist along the street — **but as scattered individual objects at shopfronts and
shrine entrances, NOT as a regular colonnade. Model them singly.** `[HIGH]`

### 7.6 玉垣 (tamagaki — inscribed shrine fence posts)

**Structure, bottom to top** `[MED]`: **地覆石** (ground sill rail) → **柱** square posts → **笠石**
(cap rail). Post heads are **tapered to a shouldered pyramid point**. Two post grades: **親柱**
(large, at ends and at intervals) and **子柱** (small, between). **Donor names and amounts are carved
on the 子柱 shafts** — that inscription texture is the whole visual point.

| Item | Value | Flag |
|---|---|---|
| Post section | named in 寸角: **五寸角 = 151.5 mm**, **六寸角 = 181.8 mm** | `[MED]` |
| Post height above ground | **≈900 mm** | `[LOW]` |
| Clear gap between posts (dense type) | **≈200 mm** | `[LOW]` |
| **Post spacing, documented real job** | **1000 mm centre-to-centre** (60 posts around a sacred tree, 旦椋神社, Kyoto) | `[MED]` |
| Small 玉垣 run | typically **≤1.5 m** | `[MED]` |
| Foundation | raise **≥600 mm** | `[MED]` |
| Historic buried post | ≈**7寸 = 212 mm** section (仁和寺萬霊塔) | `[MED]` |

**⚠ CONFLICT:** 200 mm clear gaps vs 1000 mm centres. **Both are real** — dense ornamental tamagaki
(post + 200 mm gap ≈ **350 mm pitch**) vs sparse boundary tamagaki (**1000 mm pitch**). Choose by
context: dense at a major shrine's inner precinct, sparse at a boundary.

**Recommended parametric default:** post **150 mm square × 900 mm above ground at 350 mm pitch** for a
dense inscribed shrine run; 地覆石 **200 W × 150 H mm**, 笠石 **250 W × 120 H mm** `[UNKNOWN —
proportioned to the post, no published table exists]`; 親柱 **180–210 mm square × 1200 mm**, every
8–12 子柱.

### 7.7 Walls

**築地塀 (tsuijibei) — roofed rammed-earth wall**

| Item | Value | Flag |
|---|---|---|
| **三十三間堂 太閤塀** (the best-measured example in Kyoto) | height **5.2 m**, length **92 m (二十九間)**; 木骨土造 with a **本瓦** roof; 軒平瓦 bear the 太閤桐 crest | `[HIGH]` sanjusangendo.jp |
| **Large 築地塀, general** | height **1丈3尺 ≈ 4.0 m** | `[MED]` |
| **Base thickness** | **6尺 = 1.8 m** | `[MED]` |
| **Top thickness** | **4尺 = 1.2 m** | `[MED]` |
| **→ batter per face** | (1800 − 1200)/2 ÷ 4000 = 0.075 → **4.3° off vertical** | `[DERIVED]` |
| Construction | **版築 (rammed earth in lifts)** — model horizontal lift lines on the face | `[MED]` |
| 願泉寺 foundation (archaeology) | length ≈61 m, **width 1.3 m**, height **0.6 m**; foundation stones 1.5 m long × 0.2 m thick | `[HIGH]` 貝塚市 |

**定規筋 / 筋塀 — the rank stripes.** `[MED]`

| Stripes | Meaning |
|---|---|
| **5 本** | **Highest rank** — 門跡寺院 (imperial-abbot temples) and imperial precincts |
| 4 本 | Next |
| 3 本 | Lowest of the graded set |

Five-stripe examples: **京都御所, 本願寺, 二条城, 東京護国寺.**
`[UNKNOWN]` stripe geometry — **suggest stripe width 100–150 mm at 250–350 mm vertical pitch, the band
occupying the upper third of the wall face** (for a 4 m wall, five stripes between ~2.6 m and ~3.6 m),
because in photographs the band sits clearly above eye level and below the eave, each stripe reading
at roughly half a roof-tile width.

**Colour:** base is **ochre / yellow-brown 土壁 (聚楽壁)** with **white 漆喰 stripes**; the Kyoto
Imperial Palace version is white plaster throughout with the stripes standing proud. The Sannenzaka
plan mandates **聚楽壁 for 土塀**. `[HIGH]`
**Roof cap overhang — `[UNKNOWN]`, suggest 250–350 mm each side** of the 1.2 m top, **本瓦 for temple
walls, 桟瓦 for town walls**, because 本瓦 is what the Taikō-bei uses and the plan mandates 日本瓦ぶき.

**板塀 (board fence).** The preservation plans regulate **style and material but give no dimensions**
`[HIGH]`. Sannenzaka permits 四つ目垣, 建仁寺垣 and Kyoto-style equivalents; Gion Shinbashi permits
**屋根小壁付和風板べい / 屋根欄間付和風板べい / 和風塗りへい**, timber **べんがら塗り or bare**.
`[UNKNOWN]` dimensions — **suggest height 1800 mm, 焼杉 boards 180–200 mm wide × 12–15 mm thick,
押縁 battens at 600 mm centres, posts at 1818 mm (1 間) centres**, because Japanese fences are set out
on shaku modules, 1 ken is the standard bay, and 焼杉 cladding is milled at 180–200 mm.

**石塀小路 (Ishibei-kōji) specifically**

| Item | Value | Flag |
|---|---|---|
| Location | 東山区下河原町, links **ねねの道 ↔ 下河原通** (E–W) | `[HIGH]` |
| Formed | late Meiji → Taishō, as speculative rental housing | `[HIGH]` |
| Added to the preservation district | **1996** (which took it to 8.2 ha) | `[HIGH]` |
| Paving | **recycled 京都市電 granite 敷石** | `[HIGH]` |
| Walls | **high stone walls both sides** — the name means "stone-wall alley" | `[MED]` |
| **Alley width** | **`[UNKNOWN]` — suggest 2.2–2.7 m**, because Kyoto's 路地 class is <4 m, the buildable minimum is 1.8 m, and the 3項道路 relaxation produces the 2.7–4.0 m band; a two-person-wide alley walled both sides reads at the lower end | |
| **Wall height** | **`[UNKNOWN]` — suggest 2.0–2.5 m**, because it reads as just above head height in every photograph | |
| **Block face** | **`[UNKNOWN]` — suggest 300 × 250 mm laid coursed**, because the plan mandates 切石布積 with a 葛石 cap and 300 × 250 is the standard laid-finished 間知石 face | |

The buildings here are the plan's **石塀小路町家住居様式**: 木造真壁 two full storeys, **石塀, 石垣 and
a front garden**, sometimes a projecting 下屋; 大屋根 切妻/入母屋 or a compound of both, 日本瓦, exposed
rafters and dressed boarding; **すだれ掛 with sudare hung**; walls 聚楽壁 or 杉板張り/杉皮張り; 1F
下地窓 + sliding doors; 2F 下地窓 + 掃き出し引違戸 with a railing or a projecting railing; timber
**生地仕上げ or 古色仕上げ (aged, greyed — NOT bengara)**; **glass must be uncoloured**. `[HIGH]`

**Modern wall code** (governs any rebuilt block wall) `[HIGH]` 建築基準法施行令 §62-8: height ≤2.2 m,
thickness ≥150 mm (≥100 mm if H ≤2.0 m), rebar ≥D9 at ≤800 mm both ways, **控壁 (buttress) every
≤3.4 m projecting ≥H/5**, foundation ≥350 mm high with ≥300 mm embedment.

### 7.8 Other street furniture

**駒寄せ vs 犬矢来 — keep them distinct; many sources conflate them.**

| | **犬矢来 (inuyarai)** | **駒寄せ (komayose)** |
|---|---|---|
| Form | **Curved** bamboo skirt (split or round bamboo, arched) | **Straight** wooden post-and-rail fence |
| **Height** | **800 mm** standard (700–900 mm) | **1000–1500 mm** |
| **Depth / projection** | **300 mm** | ≈300 mm |
| Rails | — | **3 horizontal 貫** typical in Kyoto |
| Flag | `[MED]` | `[MED]` |

Bamboo detail: round bamboo split lengthwise, or finished hexagonal so rain sheds. `[MED]`
`[UNKNOWN]` komayose post section and spacing — **suggest 60–75 mm square (2–2.5寸) posts at 900 mm
centres with three rails at ~300 mm vertical pitch**, because 900 mm is half a ken and three rails
over a 1000–1200 mm height gives the pitch visible in photographs.

**千本格子 bar spacing: ≈28 mm** `[MED]` digistyle-kyoto — this is the *fine* domestic lattice, an
order finer than the 酒屋格子 at 115 mm pitch in §2.5. Use 28 mm for 仕舞屋 / residential frontages
and the 115 mm coarse spec for merchant frontages.

**Street lighting**

| Item | Value | Flag |
|---|---|---|
| Higashiyama design lamps | Installed on **神幸道** (Yasaka south gate) 2018-10 → 2019-05, described as 「景観に配慮したデザインの道路照明灯」, funded by the **accommodation tax (宿泊税)** | `[HIGH]` |
| 防犯灯 spacing, general Japan | **25–50 m** | `[MED-HIGH]` |
| 防犯灯 mounting height | **4.5–5.0 m** | `[MED-HIGH]` |
| Reference illuminance plane | vertical, **1.5 m** above the surface (警察庁 guideline) | `[HIGH]` |
| **Preservation-district poles** | **`[UNKNOWN]` — suggest 4.0–4.5 m poles at 20–25 m spacing**, because the streets are only 4–6 m wide and the fixtures are explicitly pedestrian-scale designs, putting them at the low end of the standard band | |

**Fire equipment / 天水桶**

| Item | Value | Flag |
|---|---|---|
| 天水桶 | Traditional rainwater fire cistern, Edo-period urban firefighting water. **No dimensional standard exists** — they are bespoke bronze, ceramic or stone vessels | `[MED]` |
| Measured example | **Ø 1000 × H 1200 mm** (concrete barrel) | `[LOW]` |
| **Suggested** | **Ø 700–1000 × H 700–1200 mm**, placed at building corners — must be hand-fillable | `[UNKNOWN — suggested]` |
| Modern 防火水槽 | **≥40 m³**; seismic types 40/60/70/80/90/100 m³ | `[HIGH]` |
| Suction pit (消防水利) | **500 W × 1000 D × 300 deep mm**; suction opening ≥0.6 m square or Ø0.6 m | `[HIGH]` 東京消防庁 |

The Sannenzaka preservation plan explicitly requires **防火水そう and fire-detection equipment** to be
installed at necessary points in the district. `[HIGH]`

### 7.9 無電柱化 — which streets have no poles or wires

**This matters enormously to the render: get it wrong and the whole scene reads as the wrong decade.**
`[HIGH]` 京都市 政策推進プラン進捗状況

**COMPLETED — model with NO poles and NO overhead wires:**

| Street | Completed | Notes |
|---|---|---|
| **産寧坂 (incl. 一年坂・二年坂)** | **FY2010 (March)** | 430 m section |
| **八坂通 (産寧坂地区)** | **FY2011 (March)** | the street the pagoda terminates |
| **切通し (祇園新橋 district)** | FY2012 (Nov) | |
| **花見小路 (四条通 → 祇園甲部歌舞練場)** | earlier | ≈260 m, undergrounded + granite paving, ¥600 M `[MED]` |
| 神宮道 (祇園・岡崎) | FY2010 (Feb) | |

Cumulative city-wide: FY2010 **2.3 km** → FY2011 **4.06 km** → FY2012 **7.74 km** → FY2013 **9.15 km**;
by 2021, **35 routes / 9.62 km / >¥8 bn**.

**SUSPENDED 2021–2023 (fiscal crisis) — model these WITH poles and wires:**
**清水道 400 m**, **八坂通 460 m**, **新橋通 200 m**, 銀閣寺宇多野線 200 m, 三条通 960 m,
室町十径6号線 160 m.

**⚠ CONFLICT: 八坂通 appears as both completed (FY2011) and suspended (2021).** These are **different
sections of the same street** — the Sannenzaka-district stretch (the famous pagoda view) is done; a
further 460 m is not. **Model the pagoda view pole-free and the outer stretch with poles.**

**Paving policy** `[MED]` 京都新聞: since FY2018 Kyoto designates **specific** roads for 景観舗装
(stone paving) and declines requests for others. Newer works use **faux stone** (see §7.2). So: real
granite on the designated historic streets, imitation on the recently rebuilt approach roads.

### 7.10 Quick geometry cheat-sheet

```python
# PAVING (Sannenzaka / Ninenzaka / Ishibei-koji / Shinbashi)
SLAB_RECT        = (600, 330, 70)   # mm L,W,T   (T inferred)
SLAB_SQ          = (300, 300, 70)
JOINT_W          = 6                # mm; 3-10 mortar, >=6 for random ashlar
BEDDING_MORTAR_T = 30               # 1:3 cement:sand
BASE_COURSE_T    = 100              # C-30 crusher run
PATTERN          = "random_ashlar"  # mixed rect + square, broken courses
STONE_JITTER     = 15               # mm; salvaged tram stones vary

# SANNENZAKA SLOPE
SLOPE_LEN   = 380.0   # m total
SLOPE_FALL  =  28.0   # m
SLOPE_ANGLE =   4.2   # deg average
N_STEPS     =  46
RISER       = 0.145   # m  (max 0.160)
GOING       = 0.800   # m
STEPPED_LEN = 100.0   # m incl. landings (~50 m of true flight)
STEP_WIDTH  =   4.8   # m  (15 slabs across, derived)
FLIGHT_RULE = "3-6 risers, then a 1.5-4 m landing"
NO_CENTRE_HANDRAIL = True   # exempt: rise<=150 AND going>=300
NINENZAKA_STEPS = 17

# STONE WALLS
COBBLE_D     = (0.10, 0.20)   # m, tamaishi-ranzumi, per preservation plan
ASHLAR_FACE  = (0.30, 0.25)   # m, laid finished kenchi-ishi
ASHLAR_DEPTH = 0.35           # m
BATTER       = "1:0.3 .. 1:0.5"   # 73.3 deg .. 63.4 deg from horizontal
WALL_H       = (1.0, 2.5)     # m, town/garden
COPING       = "kazuraishi granite, 0.25 W x 0.15 H"

# KASUGA LANTERN, parametric on total height H
f = dict(jirin=0.0495, sao=0.3564, chudai=0.0990,
         hibukuro=0.1683, kasa=0.1287, hoju=0.1980)
# 6-shaku: H=2.020 m, base 0.80x0.80, hibukuro hex side 0.182
#          (flats 0.315, corners 0.364), sao dia ~0.150 (inferred),
#          kasa across-corners ~0.62 (inferred), 6 warabite
# HEXAGONAL: kasa, hibukuro, chudai, jirin.   CIRCULAR: sao.

# DRAINAGE
U_GUTTER      = (0.240, 0.240, 0.045, 0.600)  # int W, int D, wall, length; ext W 0.330
STONE_CHANNEL = (0.275, 0.135)                # inferred granite channel W x D

# STREET FURNITURE
INUYARAI      = (0.80, 0.30)     # H, projection   (CURVED bamboo)
KOMAYOSE      = (1.00, 0.30)     # H (1.0-1.5), projection; 3 rails (STRAIGHT timber)
KOSHI_FINE    = 0.028            # m, senbon-goshi bar spacing (residential)
KOSHI_COARSE  = 0.115            # m, sakaya-goshi pitch (merchant) -- see section 2.5
TAMAGAKI_POST = (0.15, 0.15, 0.90)
TAMAGAKI_PITCH= 0.35             # dense; 1.00 for sparse boundary type
TSUIJIBEI     = (4.00, 1.80, 1.20)  # H, base T, top T -> 4.3 deg batter
JOGISUJI_N    = 5                # rank stripes; 5 = highest
LAMP          = (4.25, 22.0)     # pole H, spacing (inferred)
```

---

## 8. Scale sanity table

The QA rule: put a **1.70 m capsule** next to every object before you accept it. Japanese adult male
mean stature is ~1.71 m, female ~1.58 m; use **1.70 m** as the reference figure and **1.55 m** for
the historical/kimono figure. `[MED]`

### 8.1 Human and everyday objects

| Object | Dimension | Flag / source |
|---|---|---|
| Reference person | **1.70 m** tall, 0.45 m shoulder width, 0.30 m depth | `[MED]` |
| Eye height (standing) | **1.58 m** | `[DERIVED]` = 0.93 × stature |
| Eye height (seated on tatami) | **0.90 m** | `[DERIVED]` — this is the height the whole machiya interior is designed around |
| **内法 (kamoi head height), Kyoma** | **1.727 m** (5.7 shaku) — *all* traditional sliding screens | `[MED]` §1.5 |
| Modern JIS interior door | **2.000 m** high × 0.780 m leaf | `[MED]` — general standard, **not verified this session** |
| 大戸 (machiya main door) | 1 bay clear **1.909 m** wide × ~1.95 m high, with a **0.60 × 1.40 m** wicket | `[UNKNOWN — suggested]`, §2.10 |
| **暖簾 (noren)** threshold length | **鯨尺3尺 = 1.136 m (≈113 cm)** separates 半暖簾 (shorter) from 長暖簾 (longer) | `[HIGH]` ja.wikipedia 暖簾 — note this is **kujirajaku**, the textile shaku (25/66 m), not the building shaku |
| Noren, shop, practical | **width = the door opening, 0.90–1.90 m**; drop **0.45 m (半)** or **1.20–1.50 m (長)**; **odd number of panels** (3 or 5) sewn at the top; hung so the bottom is at **1.55–1.70 m** — you duck or part it | panel-count `[HIGH]` same source; the rest `[UNKNOWN — suggested]` |
| 水引暖簾 (mizuhiki noren) | shortest drop but spans the **whole frontage** — a 0.30–0.45 m band under the hisashi | `[HIGH]` same source |
| **普通自転車 (standard bicycle), legal max** | **length ≤ 1.90 m, width ≤ 0.60 m** (道路交通法施行規則 9条の2の2) | `[HIGH]` |
| Bicycle, actual mamachari | 1.85 m long × 0.58 m bar width × **1.05 m** to saddle, **1.10 m** to bars | `[MED]` |
| Beverage vending machine | **W 1.20 × D 0.80 × H 1.83 m** (large); W 1.00 × D 0.70 × H 1.83 m (small) | `[MED]` — general trade standard, **NOT verified this session; VERIFY before use** |
| Kei truck (軽トラ), the vehicle that actually services these lanes | **3.40 × 1.48 × 1.78 m** (kei class legal max) | `[MED]` |
| Standard beer crate / sake barrel (菰樽) | barrel ~0.55 m dia × 0.60 m high | `[LOW]` |
| 提灯 (chōchin lantern), shop size | **0.28 m dia × 0.42 m** body | `[UNKNOWN — suggested]`, §3.3 |

### 8.2 Steps and stairs

| Case | Rise (蹴上げ) | Going (踏面) | Width | Flag |
|---|---|---|---|---|
| **建築基準法, dwellings — statutory limit** | **≤ 230 mm** | **≥ 150 mm** | **≥ 750 mm clear (内法)** | `[HIGH]` ja.wikipedia 階段, quoting 建築基準法 |
| Machiya 箱階段 (box stair in the toriniwa) — steep by design | **220–230 mm** | **150–180 mm** | 0.75 m | `[DERIVED]` — machiya stairs sit at the statutory limit; that is why they feel like ladders |
| Comfortable exterior stone step (temple approach, Sannenzaka) | **140–160 mm** | **330–400 mm** | — | `[UNKNOWN — suggested]`, because the classic outdoor rule 2R + G ≈ 630 mm gives G ≈ 330 mm at R = 150 mm, and shallow treads on a shopping street would trip crowds |
| Shrine/temple main flight (steeper, ceremonial) | **160–180 mm** | **300–330 mm** | — | `[UNKNOWN — suggested]` |

### 8.3 Streets and public space

| Quantity | Value | Flag |
|---|---|---|
| **道路構造令 minimum lane width** | **2.75 m**; 3.5 m on high-speed roads; **4.0 m** for a single-lane road | `[HIGH]` ja.wikipedia 道路構造令 |
| **道路構造令 sidewalk minimum** | **≥ 2.0 m**; 3.5 m where pedestrian volume is high | `[HIGH]` same |
| 建築基準法 42条 minimum legal road | **4.0 m** | `[MED]` |
| Kyoto minor grid street (小路) | **3–4 ken = 5.9–7.9 m** face to face | `[UNKNOWN — suggested]`, from the Heian grid module |
| **花見小路通** | ≈1 km long; suggested **5.5–6.5 m** face to face; stone-paved, no overhead wires since **2001** | length/paving `[HIGH]`; width `[UNKNOWN — suggested]` |
| **ロージ / 路地 (machiya alley)** | **0.9–2.7 m** (half-ken to 1.5 ken) — barely shoulder-width; this is the real texture of the back-of-plot fabric | `[UNKNOWN — suggested]` from the half-ken module |
| 犬走り (eave strip) | **0.45–0.75 m** | `[UNKNOWN — suggested]`, §2.10 |

### 8.4 A 1.70 m person against each landmark — the QA table

Put the reference capsule at the base of each object and check the multiple. If the ratio is wrong,
the object is wrong.

| Landmark | Key dimension | **× a 1.70 m person** | Flag |
|---|---|---:|---|
| **Hōkan-ji pagoda, total (podium → finial tip)** | **38.79 m** | **22.8 ×** | `[HIGH]` measured |
| Hōkan-ji, body only (podium → 5th roof) | 26.67 m | 15.7 × | `[HIGH]` |
| Hōkan-ji, sorin alone | 12.12 m | 7.1 × | `[HIGH]` |
| Hōkan-ji, 1st-storey plan width | 6.30 m | 3.7 × | `[HIGH]` |
| Hōkan-ji, 1st-storey eave-tip span | 13.91 m | 8.2 × | `[HIGH]` |
| **Kiyomizu Hondō, ridge** | **≈18 m** | **10.6 ×** | `[LOW-MED]` |
| **Kiyomizu stage deck above the ground** | **13.0 m** | **7.6 ×** | `[HIGH]` |
| Kiyomizu stage, width × depth | 21.8 × 9.6 m | 12.8 × 5.6 | `[DERIVED]` |
| Kiyomizu longest kakezukuri pillar | 12 m (max 14 m) | 7.1 × (8.2 ×) | `[HIGH]` |
| Kiyomizu pillar diameter | 0.62–0.65 m | 0.37 × | `[HIGH]` |
| **Kiyomizu 三重塔** | **30.2 m** | **17.8 ×** | `[MED]` |
| Kiyomizu 仁王門, ridge | 14 m | 8.2 × | `[HIGH]` |
| Kiyomizu 仁王 statues | 3.65 m | 2.1 × | `[MED-HIGH]` |
| Kiyomizu 子安塔 | 15 m | 8.8 × | `[MED]` |
| Kiyomizu 音羽の滝 drop | ≈4 m | 2.4 × | `[MED]` |
| **Yasaka 本殿, ridge** | **15.53 m** | **9.1 ×** | `[HIGH]` |
| Yasaka 西楼門, ridge | 9.1 m | 5.4 × | `[MED]` |
| Yasaka 南楼門, ridge | ≈14 m | 8.2 × | `[MED]` |
| **Yasaka 石鳥居, overall height** | **9.5 m** (or 9.33 m) | **5.6 ×** | `[MED]` |
| Yasaka 石鳥居, pillar span | 6.8 m | 4.0 × | `[MED]` |
| Yasaka 舞殿, ridge | 8.5–9.5 m suggested | 5.0–5.6 × | `[UNKNOWN — suggested]` |
| Yasaka approach stone lantern | 2.40 m | 1.4 × | `[MED]` |
| **Machiya, tsushi-nikai eave** | **≈4.8 m** suggested | **2.8 ×** | `[UNKNOWN — suggested]` |
| **Machiya, sō-nikai eave** | **≈5.8–6.5 m** | **3.4–3.8 ×** | `[UNKNOWN — suggested]` |
| Machiya frontage, 2 ken | 3.94 m | 2.3 × | `[HIGH]` module |
| Ochaya frontage, median | 7.9 m | 4.6 × | `[OSM measured]` |
| **Higashiyama statutory height cap** | **12 m visible / 15 m absolute** | **7.1 × / 8.8 ×** | `[HIGH]` |

**Torii clear height.** `[UNKNOWN]` for Yasaka's stone torii specifically. `[DERIVED]` — with an
overall height of 9.5 m, a pillar diameter of ~0.75 m and a 明神 assembly, the **underside of the 貫
sits at roughly 6.4–6.8 m** and the **clear opening between pillars is 6.8 m − 0.75 m = 6.05 m**.
Anything above ~4 m reads as "monumental" against a 1.7 m figure; this one is emphatically so.
For calibration, Japan's tallest torii: 熊野本宮大社 **33.9 m** (2000, steel) · 大神神社 **32.2 m**
(1986, steel) · 彌彦神社 **30.2 m** (1982, RC) · 平安神宮 **24.2 m**. `[MED]` ja.wikipedia 鳥居

### 8.5 The five numbers most likely to be wrong in a first pass

| # | Trap | Right answer |
|---|---|---|
| 1 | Using **46 m** for the Yasaka Pagoda (it is on the city tourism site) | **38.79 m** — 46 m is explicitly labelled 公称 (nominal) |
| 2 | Interpolating the pagoda's storey widths linearly | The taper is **type C, CONVEX**. Type the five measured widths in |
| 3 | Building the Kiyomizu stage at **18 × 10 m** | **21.8 × 9.6 m** — 18 m contradicts the temple's own 200 m² |
| 4 | Using the **1.818 m** ken for Kyoto machiya | **1.9697 m** Kyoma, and the *clear* module is **1.909 m** |
| 5 | Giving machiya roofs a concave (sori) curve | Machiya roofs are **convex (mukuri)**. Only temples and shrines get sori |

Runners-up: painting the Yasaka gate's lattice red (it is **verdigris green**); painting bengara at
shrine-vermilion chroma; putting a veranda on storeys 1–4 of the pagoda (**storey 5 only**); giving
Gion ochaya a 虫籠窓 (**they are 総二階 — no tsushi, no mushikomado**); and modelling 139 pillars under
the Kiyomizu stage (**168 total, 78 under the stage**).

---

## 9. Open questions — the complete UNKNOWN register

Every number below is **not published in any source reachable this session**. Each carries a
suggested value and the reasoning, in the section named. Listed here so nobody has to re-derive them
or, worse, quietly invent a different value.

| § | Unknown | Suggested | Basis |
|---|---|---|---|
| 2.2 | Machiya eave height, tsushi-nikai / sō-nikai | **4.8 m / 5.8 m** | 1F 3.0 + tsushi 1.8 (from the 1.73 m measured Sugimoto ceiling); 3.1 + 2.7 (sō-nikai >2.5 m documented) |
| 2.3 | Mukuri camber magnitude | **1/60–1/40 of the rafter run** | The range at which it reads in photographs without looking like a fault |
| 2.4 | Machiya ridge height above roof plane | **0.30–0.45 m**, 3–5 noshi courses | 5+ reads as a temple, 2 as a shed |
| 2.4 | 鍾馗さん figure height | **0.25 m** | Hand-sized in every photograph |
| 2.5 | 切子 cut length on 糸屋格子 | **top 0.45 m** | The light slot must clear the shopkeeper's sightline over goods (~1.2 m) |
| 2.5 | Overall lattice height | **1.73 m** | The 内法 head height; every other opening is set out to it |
| 2.6 | 出格子 projection | **0.303 m** plain, **0.455 m** load-bearing | 1尺 and 1尺5寸 are the two dimensions a carpenter reaches for; must not exceed the 犬走り |
| 2.7 | 虫籠窓 finished bar width / gap / opening / sill / count | **45–60 mm / 60–75 mm / 0.95 × 0.60 m / 0.65 m / 9–13 odd** | Rope + 2 plaster coats over a 20 mm core; half-bay module; 1.73 m tsushi ceiling |
| 2.8 | Inuyarai bamboo width, spacing, rail count, arc radius | **30 mm, butt-jointed, 3 rails, R 0.75–0.90 m** | Trade grades 8分/1寸; the arc must hit both 0.80 m and 0.30 m |
| 2.9 | Komayose post section and spacing | **60–90 mm sq at 0.90–1.00 m** | Half-ken bay; must sit in the same 犬走り |
| 2.10 | 幕板 / 袖壁 / 卯建 / 大戸 / ばったり床几 | see table | Sized to quarter-, half- and whole-ken modules |
| 2.11 | 通り庭 width | **1.909 m (1 clear bay)**, 2.86 m for a big house | The 一列三室型 plan makes it one structural bay by definition |
| 3.3 | Sudare size, nameplate, lantern mounting height | 1.8 × 1.2 m, 120 × 300 mm, 2.4–2.7 m | Kyoma bay; discretion; ground-floor lintel line |
| 3.4 | Ichiriki-tei overall footprint | **20–25 m (Hanamikoji) × 25–30 m (Shijō)** | Six buildings + garden on a full corner; measured max frontage 25.0 m |
| 3.8 | 千本格子 member section | **24 × 36 mm at 45 mm centres** | Narrowest common stock; ~2:1 solid:gap gives the documented one-way effect |
| 4.1 | 西楼門 upper/lower eave heights; Shijō stair rise/run/width | 5.5 / 7.4 m; 0.15 / 0.40 m / 22 m | 60:40 rōmon split; 20 steps × 0.15 = the 3 m platform rise; street corridor is 22 m |
| 4.2 | 石鳥居 pillar diameter, kasagi length | **0.75 m, 9.5–10.2 m** | Three 木割 rules converge; kasagi overruns the span 1.4–1.5× |
| 4.3 | 本殿 eave height (as distinct from the 15.53 m ridge) | **6.5–7.0 m** | 15.53 less a 37° roof over a 30 m span |
| 4.4 | 舞殿 height; lantern count and size | **8.5–9.5 m; ≈250 in 2 tiers; Φ0.34 × 0.66 m** | 0.65–0.72 × eaves width; 50.4 m perimeter ÷ 0.40 m centres × 2 tiers |
| 4.5 | 手水舎 height; ema and ema-rack sizes | 4.0–4.5 m; 150 × 90 / 450 × 300 mm; 1.8 × 1.5 × 0.6 m | 0.75 × eaves span; standard trade sizes; one Kyoma bay |
| 5.7 | Pagoda per-storey heights | **4.81 / 4.58 / 4.25 / 4.10 / 3.80 m + 5.13 m roof zone** | Nakayama-dera 2016 measured proportional shape scaled onto the published 26.667 m 塔身 |
| 5.9 | Pagoda 軒反り (corner rise) | **0.25–0.55 m at storey 1** | Two corpus rules disagree ~2× (0.19–0.32 m kiwari vs 0.46–0.56 m observed) |
| 5.11 | Sorin per-component split; 九輪 ring dimensions | see table; **9 rings at 673 mm pitch, φ1.2 → 0.8 m** | No per-component measurement exists for ANY Japanese pagoda |
| 5.12 | 心柱 diameter | **0.75–0.95 m** | The socket is 1.02 m and the pillar is 「一回り小さい」; corpus band 0.018–0.028 × H |
| 5.13 | Upper-storey wall infill, plaster vs plank | **plank — VERIFY PHOTOGRAPHICALLY** | No textual source; the elevation description lists only doors, renji and struts |
| 5.14 | 本平瓦 working length | **≈212 mm exposed** | Must equal the 丸瓦 working length |
| 6.1 | Niōmon stone stair | **22–26 risers, 0.16 / 0.36 m, 9–10 m wide** | Platform sits 3.5–4 m above the street; stair is as wide as the gate |
| 6.2 | 西門 and 鐘楼 metric sizes | 8.5–9.0 × 5.0–5.5 m; 2.4 × 4.8 m | Only bay counts are recorded; sized against the 10 m Niōmon |
| 6.3 | 三重塔 初重一辺, 相輪, taper | **6.0 m, 9.0 m, 0.88/storey** | 総高 : 初重 ≈ 4.8–5.3; sorin 0.28–0.33 × H; Edo three-storey norm |
| 6.4.5 | Kiyomizu 貫 grid: tiers, spacing, section | **5 tiers at ~2.4 m, 240 × 90 mm** | 13 m ÷ the 8-shaku plan module; 5–6 bands readable in photographs |
| 6.4.7 | 箱棟 dimensions; bark bundle count | 0.55 × 0.65 m; **quote the 100 t instead** | Usual proportion for the span; contracts are specified by weight and 坪, never by bundle |
| 6.5 | 奥の院 stage size | ~11 × 4 m at 5–6 m | Shallow hisashi-depth deck above a 4 m waterfall |
| 6.6 | 音羽の滝 stream spacing, shelter, basin | 1.3 m; 6 × 3 m; 4.0 × 1.5 m | Three ladle queues abreast |
| 6.8 | 随求堂 dimensions | ~7 × 7 m, 3×3 bays, irimoya | Not an ICP, so no record; by analogy with 田村堂 and 阿弥陀堂 |
| 7.1 | Paving slab thickness | **60–80 mm** | JIS classes 30/60/80; tram plates ~2× modern plate |
| 7.2 | Traditional stone gutter | **250–300 × 120–150 mm granite** | Plan mandates granite; smallest U-form is 150 mm |
| 7.5 | Kasuga 竿 diameter, 笠 width, 節 rings | 150 mm, 600–650 mm, 2 rings at ⅓ and ⅔ | Must fit the 中台; must overhang for the 蕨手 yet stay inside the base |
| 7.5 | Lantern spacing on an approach | 4–6 m c/c, 0.6–1.0 m setback | 800 mm base; gaps read as 5–7 base-widths |
| 7.6 | 玉垣 rail sections | 地覆石 200 × 150, 笠石 250 × 120 mm | Proportioned to the 150 mm post; no published table exists |
| 7.7 | 定規筋 stripe geometry; 築地塀 roof overhang | 100–150 mm at 250–350 mm pitch, upper third; 250–350 mm | Five stripes must fit between eave and wall midpoint |
| 7.7 | 板塀 dimensions; 石塀小路 width, wall height, block | H 1800, boards 180–200 × 12–15, posts @1818; 2.2–2.7 m, 2.0–2.5 m, 300 × 250 mm | Shaku modules; Kyoto 路地 class; standard laid 間知石 face |
| 7.8 | Preservation-district lamp height and spacing | **4.0–4.5 m at 20–25 m** | Narrow street, pedestrian-scale fixtures |
| 7.8 | 天水桶 size | Φ0.7–1.0 × H 0.7–1.2 m | One measured example; must be hand-fillable |
| 8.1 | Vending machine dimensions | **1.20 × 0.80 × 1.83 m — VERIFY** | Trade standard, not confirmed from a source this session |

### 9.1 Sources that would close most of the remaining gaps

1. **濱島正士『日本仏塔集成』中央公論美術出版, 2001** — would close every pagoda gap (§5.7, 5.9, 5.11).
   Not online. **The single highest-value acquisition for this project.**
2. **The 文化庁 保存図 originals** that Hamashima's "図Ⅰ" source-code points to.
3. **清水寺 修理工事報告書** for the 平成の大修理 — would close the 貫 grid and 箱棟 (§6.4.5, 6.4.7).
4. **『京の町家』淡交社** and **『格子の表構え』学芸出版社** — the two books the only dimensional
   lattice source cites. Would close §2.5, §2.6 and §3.8.
5. **京都市 京町家まちづくり調査** raw data — would close the machiya eave-height distribution (§2.2),
   which is currently the largest gap in the residential fabric.

### 9.2 Methodological notes

- **`[OSM measured]`** figures were obtained by querying Overpass directly, projecting WGS84 to local
  metres (lat₀ = 35.004 °N: 1° lat = 110,921 m, 1° lon = 91,239 m) and computing minimum-area oriented
  bounding boxes. **OSM building polygons in this area trace ROOF/EAVES outlines from aerial imagery,
  not wall lines** — verified against the Yasaka honden, where OSM gives 844 m² against the official
  建面積 662.38 m² and 軒面積 1,049.50 m². **Treat every OSM footprint as the eaves line and subtract
  the overhang to get walls.** Accuracy ≈ ±1 m.
- The WebSearch budget was exhausted partway through this survey. Every primary record
  (kunishitei.bunka.go.jp, kiyomizudera.or.jp, yasaka-jinja.or.jp, city.kyoto.lg.jp,
  sakujigumi.com, J-STAGE) was fetched and read directly, so the `[HIGH]` tier is unaffected; a
  handful of the `[UNKNOWN]` items in §9 could not be pushed further only because general search
  engines were unavailable.
