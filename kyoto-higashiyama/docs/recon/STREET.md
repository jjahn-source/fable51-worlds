# STREET — Higashiyama streetscape census

Agent D deliverable. Shop census, ready-to-render signage strings, prop
inventory, colour direction and motion/sound inventory for the Gion →
Kiyomizu-dera walking route.

**How to read this document.** Everything here is intended to be consumed by
procedural generators — there are no texture files in this project, so every
sign is drawn at runtime from a string + a direction + two colours. Wherever a
Japanese string appears in a `code span` it is meant to be rendered verbatim.
Dimensions are metres unless stated.

**Confidence marking.** Each claim is tagged inline:

- **[V]** verified against a primary or strong secondary source during recon.
- **[T]** *typical* — not a specific verified business/object, but a
  correctly-formed, category-accurate instance safe to place procedurally.
- **[?]** uncertain; flagged in §7 and should be checked before it drives a
  hero shot.

Nothing in this document should be treated as a licence to reproduce a
trademark. Where a real brand is unavoidable for silhouette accuracy (the
Ninenzaka machiya coffee house, the convenience stores on Higashioji) the entry
says so and gives a generic stand-in. See §7.2.

---

## 0. Route geometry and street character

The walk, in order, with the character each street must read as:

| # | Street | Length (approx) | Grade | Character |
|---|--------|-----------------|-------|-----------|
| 1 | 四条通 / 祇園 (Shijo-dori, Gion) | — | flat | wide, commercial, trams-era frontages, the Yasaka west gate closing the vista |
| 2 | 花見小路通 (Hanamikoji-dori) | ~500 m S of Shijo | flat | ochaya district; dark timber, no shopfront glazing, near-blank facades, red lanterns |
| 3 | 八坂神社 (Yasaka Shrine) | — | slight rise | vermilion gate, granite, ~280 donor lanterns on the dance stage |
| 4 | ねねの道 (Nene-no-michi) | ~250 m | gentle | wide stone-paved promenade, temple walls one side, shops the other, rickshaws |
| 5 | 石塀小路 (Ishibe-koji) | ~150 m | flat, dog-legged | narrow private alley, stone paving + stone-and-plaster walls, almost no signage |
| 6 | 二寧坂 / 二年坂 (Ninenzaka) | ~200 m | stepped | the postcard street; 八坂の塔 in the vista behind you |
| 7 | 産寧坂 / 三年坂 (Sannenzaka) | ~100 m | steep stepped | the tightest, most crowded, most photographed |
| 8 | 清水坂 (Kiyomizu-zaka) | ~500 m | steady climb | the loudest, most touristic; solid souvenir frontage both sides |
| 9 | 清水寺 (Kiyomizu-dera) | — | terrace | vermilion, unpainted cypress, the veranda |

Side streets that matter: **下河原通 (Shimogawara-dori)** running N–S past
Kodai-ji's foot, and **八坂通 (Yasaka-dori)** — the street that frames 八坂の塔
(Yasaka Pagoda / 法観寺), which is the single most reproduced view in the
district.

The whole of items 4–9 plus the pagoda sit inside the **産寧坂重要伝統的建造物群
保存地区** (Sannenzaka Important Preservation District for Groups of Traditional
Buildings), selected **1976-09-04**, area **8.2 ha**, classified as a
**門前町** (temple-gate town). About **65 %** of the buildings inside it are
classed as traditional structures: Edo–Meiji **むしこ造り** machiya (low
half-storey with plastered lattice *mushiko* windows), Meiji true two-storey
machiya, and Taisho-era "deformed" machiya. **[V]** Gion's counterpart district
is **祇園新橋**, selected the same year.

Practical consequence for the generator: **almost every building on the route is
one of three machiya massings**, and the variation the eye actually reads comes
from the *signage and clutter*, not the architecture. Budget accordingly — §2
and §3 are where the money is.
## 1. Shop census

### 1.0 How to use this census, and a hard warning about facades

Text sources for this district reliably tell you **what a shop sells, whether it
hands out samples, and whether it serves tea**. They almost never tell you
**noren colour, awning colour or sign type**. So this census is honest about the
split:

- **[V]** — the business exists, at that address, in that trade.
- **facade documented** — the frontage description is itself sourced.
- **facade [T]** — the frontage is a category-accurate reconstruction. Use it;
  just don't claim it is a portrait of that specific shop.

The shops whose **frontages are genuinely documented** — and therefore the ones
worth modelling as recognisable individuals — are flagged inline in §§1.5–1.8
with the frontage detail spelled out.

### 1.1 Street order — the most useful thing in this document

Rather than an alphabetical list, here is the **actual sequence of frontages**,
which is what a procedural street generator needs. Walking **down 清水坂 from the
仁王門**:

```
もみぢや〔御殿八ッ橋おぼこ〕→ 湯葉チーズ本舗〔梅山堂第二〕→ 京みやげ西秀 →
西利 清水店 → 朝日堂 → 本家西尾八ッ橋 清水店 → 桜士堂 →
聖護院八ッ橋＋京漬物 大安 → 梅山堂 第三 → 清水京あみ → 山本商店 → 清雅堂 →
あさひ坂口 → 川勝總本家 → 京都北山 → SNOOPY Chocolat → 森陶器館 →
上川商店 → 真福寺大日堂 → 天亀 → 吉田宗蔵 →
本家西尾八ッ橋 清水坂店（2F ぎをん為治郎）→ 寺子屋本舗 →
元祖八ッ橋 西尾為忠商店 → 清水順正おかべ家 → 京ばあむ 清水店 → 栄山堂 →
来迎院 →【左に産寧坂の下り口／右に箸屋・瓢箪屋】→ 五条坂合流
```

Walking **down 産寧坂 from the 清水坂 corner**:

```
石段 → 瓢箪屋（corner）→ おちゃのこさいさい・明保野亭 → きよさんぽ／轟川跡 →
興正寺霊山本廟・松韻堂 → 三年庵 → 丹羽 → Je T'aime Cafe → 京白川 →
井筒八ッ橋本舗（青龍苑）／向かいに西利 → 角桑 → よーじや（青龍苑の門）→
本家西尾八ッ橋 産寧坂店 → くろちく → 松栄堂 → 有喜屋 →
清水三年坂美術館 → 抹茶館 → 梅園 → 忘我亭 → 喜楽庵岡本 → 杉養蜂園 →
こんにゃくしゃぼん → まかそ屋 → おうすの里 → 奥丹 → 嘉祥窯 → 二年坂の石段
```

Two things fall out of this that no amount of general research would give you:

1. **七味家本舗 sits exactly on the corner where 清水坂 and 産寧坂 meet** — it has
   held that corner since **1655**, originally as 河内屋 selling からし湯 (a hot
   chilli drink) to Kiyomizu pilgrims, renamed **七味家 in 1816**. It is the
   single best "you are here" landmark on the route: put it on the corner and the
   junction reads correctly. **[V]**
2. **瓢箪屋 holds the other corner**, at the top of the Sannenzaka steps, selling
   gourds — tied to the local superstition that falling on Sannenzaka brings
   three years' bad luck unless you buy a gourd. **[V]**

### 1.2 Structural corrections worth knowing before you build

- **二年坂 has no yatsuhashi shop at all.** The nearest is 井筒 on 産寧坂, ~114 m
  away. Do not scatter yatsuhashi frontages up Ninenzaka — that trade clusters on
  **清水坂 and 産寧坂**. Ninenzaka's food is sweets, dango, warabimochi, coffee
  and small crafts. **[V]**
- **本家西尾八ッ橋 has three separate shops** on this route (清水店, 清水坂店,
  産寧坂店), not one. Chains repeating along the same street is genuinely
  characteristic here — 梅山堂 has **three** frontages on 清水坂 and 岩月堂 has
  **three**. A generator that forbids duplicate shop names will get the street
  wrong. **[V]**
- **Decorative pickle barrels are not actually out on the pavement** on these
  three streets. Pickle shops here (西利, 土井志ば漬本舗 via 岩月堂北店, 大安,
  川勝總本家) front with **refrigerated glass cases and tasting counters**, not
  open cedar barrels. The barrel is a real Kyoto tsukemono prop but belongs
  **inside**, or on other streets — treat an outdoor barrel as **[T]** dressing,
  not documented fact. **[V — flagged by recon as an absence]**
- **Free sample trays are real and are a defining behaviour of this street.**
  Confirmed at 本家西尾八ッ橋 (all three, 「試食し放題」, with tea poured into a
  湯呑 at the entrance), 元祖八ッ橋 西尾為忠商店 (the most generous — samples of
  your exact order handed over while you wait), and 岩月堂 清水店 / 南店
  (「店頭でお気軽にご試食いただけます」). **[V]**

### 1.3 Do NOT model these — confirmed closed or not present here

洛匠 (closed 2020) · 藤菜美 二年坂店 · おうすの里 二年坂店 · 打田漬物 (no
Kiyomizu branch) · スヌーピー茶屋 (no branch — the 清水坂 shop is **SNOOPY
Chocolat**) · 京とうふ藤野 · 京あめ クロッシェ · 白竹堂 · 宮脇賣扇庵 · 一保堂 ·
中村藤吉 · 順正 (that is 南禅寺, not Kiyomizu) · any yatsuhashi shop on 二年坂.
**[V]**

### 1.4 Date-sensitive — check your reference imagery against these

| Shop | Change |
|---|---|
| 川勝總本家 清水店 | Rebuilt, reopened **2025-12-10**. Photos before Dec 2025 show a demolished site. |
| よーじや 清水産寧坂店 | **Relocated 2026-04-01** to front 産寧坂 directly — the 青龍苑 elevation changed this year. |
| SNOOPY Chocolat 清水坂店 | Renovated, reopened **Sept 2026**. |
| 元祖八ッ橋 西尾為忠商店 | **Rebuilt March 2021** — new clean timber in the old style. |
| おたべ 清水坂店 | Reopened **2025-05-22** as a 直営店 (stale "closed" listings exist). |
| 高台寺 拝観料 | Raised **2026-04-01** to 800/400 from 600/250. |
| 地主神社 | Closed since **2022-08-19**, reopening undetermined. |
### 1.5 Census — 清水坂 (Kiyomizu-zaka)

Format: `日本語名` | Romanisation | category | shopfront | confidence.

| Japanese (as on the sign) | Romanisation | Category | Shopfront | Conf. |
|---|---|---|---|---|
| `七味家本舗` | Shichimiya Honpo | spices | **The corner landmark.** Machiya on the 清水坂 / 産寧坂 junction; pyramid product displays in an open shopfront, ceramic spice pots, white-on-indigo noren, large carved horizontal wooden 看板, deep tiled eaves, dashi tasting cups inside. Founded 1655 as 河内屋 selling からし湯; renamed 七味家 1816 | [V] |
| `もみぢや` | Momijiya | souvenir | First shop below the 仁王門; broad folk-craft frontage, pottery and fans, yatsuhashi counter inside | [V] |
| `御殿八ッ橋おぼこ／きよみず川かみ 門前店` | Goten Yatsuhashi Oboko | yatsuhashi | Shop-in-shop counter inside もみぢや — reads as a secondary signboard or noren panel, not its own frontage | [V] |
| `梅山堂 第一営業所` | Baizando No.1 | souvenir | Large souvenir hall at the top facing the 山門; yatsuhashi, pickles, Uji tea, character goods; group dining ~400 across B1 and 2F | [V] |
| `湯葉チーズ本舗 清水店（梅山堂 第二）` | Yuba Cheese Honpo | street food | **The loudest frontage on the street** — open fried-skewer stall deep-frying all day, のぼり banners reading `ゆばチーズ`, Chinese signage `豆腐衣奶酪`, routine 10-deep queue | [V] |
| `梅山堂 第三営業所` | Baizando No.3 | sweets | Bright wide interior, 50+ Kyoto sweet lines, group dining ~330 over 2F/3F | [V] |
| `京みやげ西秀` | Kyo-miyage Nishihide | souvenir | facade [T]: open two-storey timber frontage, goods tiered onto the street, hanging noren, painted fascia | [V/T] |
| `京つけもの西利 清水店` | Nishiri Kiyomizu-ten | pickles | Narrow frontage near the gate, goods mirrored left and right so it works when crowded; tasting counter with toothpick dishes and free green tea at the front | [V] |
| `朝日堂` | Asahido | ceramics | Est. 1870, flagship at the temple gate; ceramics, lacquer, ironware, kiriko on tiered display. facade otherwise [T]: two-storey machiya, dark timber, vertical wooden 看板 | [V/T] |
| `朝日陶庵` | Asahi Toan | ceramics | Ceramics, lacquer, textiles, bamboo, incense, prints; 音羽茶寮 attached | [T] |
| `音羽茶寮` | Otowa Saryo | restaurant | Tea-and-meals room inside the あさひ坂 complex, terrace views | [T] |
| `茶寮 器楽` | Saryo Kiraku | cafe | Restaurant and café within あさひ坂 | [T] |
| `利き酒処336` | Kikizakedokoro 336 | other | Local sake and craft-beer tasting bar within あさひ坂 | [T] |
| `アートサロンくら` | Art Salon Kura | crafts | Gallery in a converted **蔵** — white plaster kura walls, small entrance, rotating exhibitions | [V] |
| `本家西尾八ッ橋 清水店` | Honke Nishio Kiyomizu-ten | yatsuhashi | 清水1-277. Dual おやつ処／お土産処; street-front snack counter with hot ごま餅 in winter, kakigori and soft serve in summer; frontage tagline `京で一番古い八ッ橋屋さん`; generous sample trays, tea in a 湯呑 at the door | [V] |
| `桜士堂` | Oushidou | textiles | 100+ years; 西陣織 and 友禅 accessories; 2F restaurant 「さくら」 | [T] |
| `岩月堂清水店` | Iwatsukido Kiyomizu-ten | yatsuhashi | 清水2-218, signed `聖護院八ツ橋 岩月堂`; small traditional shopfront, sample trays at the front | [V] |
| `岩月堂 北店（土井志ば漬本舗）` | Iwatsukido Kita / Doi Shibazuke | pickles | Open-front shop, red/purple shiso branding, free tasting central, しそバニラソフト display panel at the street edge; north bay of a paired two-bay frontage | [V] |
| `岩月堂 南店` | Iwatsukido Minami | sweets | South bay of the same frontage; 豆政・夷川五色豆, 聖護院八ッ橋, 雲龍; `店頭でお気軽にご試食いただけます` sample trays | [V] |
| `清水 京あみ` | Kiyomizu Kyoami | sweets | Two-storey; ground floor a glass showcase of choux buns plus till, **baked at the front so steam and cinnamon are part of the frontage**; 2F self-roast coffee café | [V] |
| `山本商店` | Yamamoto Shoten | souvenir | facade [T]: open timber shopfront, goods on tiered street-facing shelving, cloth awning | [V/T] |
| `谷口清雅堂` | Taniguchi Seigado | ceramics | 京陶器・清水焼 specialist. facade [T]: open front, bowls and plates on stepped wooden stands, vertical 看板 | [V/T] |
| `川勝總本家 清水寺参道店` | Kawakatsu Sohonke | pickles | 清水1-260. **Rebuilt, reopened 2025-12-10** — pre-Dec-2025 photos show a demolished structure. Wide open retail floor, さわやかレモン胡瓜 on sticks in a chilled counter at the street edge, tasting with tea | [V] |
| `京都北山` | Kyoto Kitayama | sweets | facade [T]: modern confectionery insert, glass frontage, boxed-product wall | [V/T] |
| `SNOOPY Chocolat 京都・清水坂店` | Snoopy Chocolat | sweets | 清水2-252. Dark-timber machiya shell with **restrained branding — noren and wooden signage rather than character livery**; takeaway window for gelato and chocolate drinks. Renovated, reopened Sept 2026 | [V] |
| `森陶器館 本店` | Mori Toki-kan | ceramics | 清水2-254. Own kiln; 手びねり／絵付け workshops for 1–600 people; **original lampshades** are the visual signature | [V] |
| `森陶器館 南店` | Mori Toki-kan Minami | souvenir | Pickles, Kyoto sweets, fried snacks, seasonal lines | [T] |
| `上川商店` | Kamikawa Shoten | souvenir | facade [T]: open timber frontage, goods stacked to the street, hanging noren | [V/T] |
| `真福寺大日堂` | Shinpukuji Dainichido | temple | Small roadside temple hall set into the shop row | [T] |
| `天亀` | Tenki | crafts | 友禅小物, あぶらとり紙, 模造刀 and genuine 居合刀. **Signboard carved in seal script (篆書)** by the late 森岡東春山 — the notable 看板 on the street | [V] |
| `吉田宗蔵` | Yoshida Sozo | souvenir | facade [T]: two-storey machiya, open shopfront, painted fascia | [V/T] |
| `本家西尾八ッ橋 清水坂店` | Honke Nishio Kiyomizuzaka-ten | yatsuhashi | 清水2-240-2. **Vivid orange painted shopfront** (「鮮やかなオレンジ色の外観」) — a genuine, documented exception to the muted palette; wide bright open frontage, two storeys, street crepe and soft-serve counter, long interior run of counters, extensive free sampling with tea | [V] |
| `ぎをん為治郎 清水坂店（旧 八ッ橋茶屋）` | Giwon Tamejiro | matcha-cafe | 2F above the orange shop; **36 seats in white unpainted 白木 + orange**, casual not traditional. Both old and new names still appear in listings and possibly on signage — model two boards. Coffee in 鳥獣戯画 cups | [V] |
| `寺子屋本舗 清水坂店` | Terakoya Honpo | sweets | facade [T]: open front with grilling counter and skewered senbei displayed to the street, indigo noren | [V/T] |
| `元祖八ッ橋 西尾為忠商店 清水店` | Ganso Yatsuhashi Nishio Tamechu | yatsuhashi | 清水232. **Rebuilt March 2021** — new clean timber in old style. **Anko yatsuhashi folded by hand to order at a counter in full view of the street**, steamed in せいろ; the yatsuhashi are **square (四角い), not triangular** — a real prop distinction. Benches outside; most generous sampling on the street, tea handed out at the entrance | [V] |
| `清水順正おかべ家` | Kiyomizu Junsei Okabeya | tofu-yuba | Banquet-scale yudofu and yuba house. facade [T]: wide machiya frontage, indigo noren, lanterns, menu boards and food samples at the entrance | [V/T] |
| `京ばあむ 清水店` | Kyo Baum Kiyomizu-ten | sweets | 清水2-229. **White-based (白を基調とした) modern shopfront**, noticeably brighter and cleaner than its neighbours; large boxed-product wall, street-side takeaway window for 食べ歩き and soft serve, photo panels outside, frequent short queue | [V] |
| `坂の駅 栄山堂` | Saka-no-eki Eizando | cafe | 15 soft-serve flavours, onigiri, burgers; 1F café, 2F ramen | [V] |
| `来迎院` | Raigo-in | temple | Small temple on the approach | [T] |
| `箸屋` | Hashiya | crafts | Chopstick shop at the 産寧坂 turn-off. facade [T]: narrow open front, chopsticks fanned in tiered racks facing the street | [V/T] |
| `おたべ清水坂店` | Otabe Kiyomizuzaka-ten | yatsuhashi | 清水2-211. Reopened as a 直営店 2025-05-22. facade [T]: modern brand-store frontage, glass, product wall | [V/T] |
| `伊藤久右衛門 清水本店` | Itohkyuemon | matcha-cafe | Uji tea house in the 清水2-208〜211 cluster. facade [T]: dark timber frontage, green-and-gold brand noren, parfait photo boards | [V/T] |
| `三十六峰 清水店` | Sanjurokuho | souvenir | Stocks おたべ among other lines | [T] |
| `なかじん` | Nakajin | souvenir | 清水2-211-2. facade [T]: open souvenir frontage | [V/T] |
| `大継渓山堂` | Otsugi Keizando | souvenir | 清水2-238 | [V/T] |
| `中条昇山` | Nakajo Shozan | souvenir | 清水268 | [V/T] |
| `河原栄山` | Kawahara Eizan | souvenir | 清水1-271; carries 聖護院八ッ橋 | [V/T] |
| `華扇` | Kasen | fans | Fan specialist immediately before the temple, **1,000+ types** — open frontage with fans opened and racked in tiers | [V] |
| `錦古堂` | Nishikikodo | fans | 京扇子 and small goods. facade [T]: open front, fans on wall racks, hanging noren | [V/T] |
| `錦扇` | Nishikisen | fans | 「色とりどりの京扇子が並ぶ華やかな店内」 — bright open frontage, decorative and practical fans massed as **a wall of colour** | [V] |
| `木村桜士堂` | Kimura Oushidou | crafts | 京人形, 土人形, こけし. facade [T]: glass cases of dolls facing the street, two-storey machiya | [V/T] |
| `清水坂すぎやま` | Kiyomizuzaka Sugiyama | crafts | 清水1-276; 京の豆人形 and 和雑貨 — tiny figurines in tiered display trays | [V] |
| `源久秀 久世商店` | Genkyuhide Kuze Shoten | crafts | 京刃物 — household and professional knives and scissors in display cases | [V] |
| `山口屋` | Yamaguchiya | other | 念珠, 仏像, 仏具, 線香 — **incense scent drifts from the shop into the street** | [V] |
| `飾 清水` | Kazari Shimizu | crafts | 清水1-276; 和柄 hair ornaments and earrings; 2F wa-café | [V] |
| `梅花堂` | Baikado | souvenir | Souvenirs, vintage and imported goods, light dining | [T] |
| `局屋立春` | Tsuboneya Risshun | sweets | 京菓子 specialist, handmade; also a 茶わん坂 west branch | [T] |
| `GOKAGO` | Gokago | tea-house | 日本茶専門店 and tea stand; Kyoto teas and 茶器, hand-whisked matcha latte — modern tea-stand counter | [V] |
| `清水人形高橋` | Kiyomizu Ningyo Takahashi | ceramics | 土人形 studio, family members each working in their own style; unglazed clay figurines displayed at the front | [V] |
| `HISAYA CAFE` | Hisaya Cafe | cafe | 清水2-255; organic roasted-chestnut brand café — expect Mont Blanc imagery and a chestnut-roasting counter | [V/T] |
| `天 ten` | Ten | cafe | Wa-café with attached ceramics and 和雑貨 gallery | [V] |
| `マールブランシュ 清水坂店` | Malebranche | sweets | facade [T]: clean modern insert, dark green brand palette, glass product wall | [V/T] |
| `Caramely 清水坂店` | Caramely | sweets | Melting-texture modern yatsuhashi. facade [T]: small bright modern counter | [V/T] |
| `すみっコぐらし堂 清水坂店` | Sumikkogurashi-do | souvenir | facade [T]: machiya shell with restrained character signage per preservation rules | [V/T] |
| `どんぐり共和国 清水店` | Donguri Kyowakoku | souvenir | facade [T]: timber frontage, low-key signage | [V/T] |
| `杉養蜂園 清水坂店` | Sugi Yohoen | sweets | Honey and honey soft serve. **[?]** also logged on 産寧坂 — may be one shop, street unresolved | [?] |
| `安田陶器店` | Yasuda Toki-ten | ceramics | Small kiln shop. facade [T]: open front, pottery on stepped stands | [V/T] |
| `布遊舎 清水店` | Fuyusha | textiles | Textile goods. facade [T]: open front, fabrics hung at the entrance | [V/T] |
| `経書堂` | Kyokakudo | temple | Small temple hall with sacred stones, set into the shop row | [V] |
| `ディッパーダン 清水寺FC店` | Dipper Dan | sweets | Crepe chain. facade [T]: small walk-up window, backlit menu photo panel | [V/T] |

### 1.6 Census — 産寧坂 / 三年坂 (Sannenzaka)

| Japanese (as on the sign) | Romanisation | Category | Shopfront | Conf. |
|---|---|---|---|---|
| `瓢箪屋` | Hyotan-ya | crafts | 清水3-317, Tenpo-era founding, 7th generation. **At the corner where the stone steps begin.** 1,100–1,500+ handmade gourds; signature **千成瓢箪 hung on red cords in the window**, gold-leaf versions, celebrity-signed large gourds at the rear. Ties to the superstition that a fall on Sannenzaka brings three years' bad luck unless you buy a gourd | [V] |
| `おちゃのこさいさい 産寧坂本店` | Ochanoko Saisai | spices | 清水3-316-4. **~1,800 dried chillies displayed at the entrance**; stone paving carried in from the street, woven baskets, copper accents, tasting samples and custom blending | [V] |
| `明保野亭` | Akebonotei | kaiseki | Near the top by 瓢箪屋. facade [T]: 数寄屋 entrance set back behind a low gate, lantern, indigo noren, menu case | [V/T] |
| `きよさんぽ` | Kiyosanpo | cafe | By the 轟川跡. facade [T]: small converted machiya, A-board on the paving | [V/T] |
| `松韻堂` | Shouindou | ceramics | 清水焼 hand-painted by female artists; **tiered display stands of bowls out front** | [V] |
| `興正寺霊山本廟` | Koshoji Ryozen Honbyo | temple | Temple precinct fronting the slope | [T] |
| `三年庵` | Sannen-an | restaurant | facade [T]: machiya restaurant, noren, lantern, menu board | [V/T] |
| `丹羽` | Niwa | souvenir | facade [T]: open timber shopfront on the slope | [V/T] |
| `Je T'aime Cafe` | Je T'aime Cafe | cafe | facade [T]: converted machiya café, A-board, window counter | [V/T] |
| `京白川` | Kyo Shirakawa | souvenir | facade [T]: open frontage with goods to the street | [V/T] |
| `井筒八ッ橋本舗 清水店（青龍苑）` | Izutsu Yatsuhashi | yatsuhashi | 清水3-334, est. 1805. Street-facing frontage of the 青龍苑 row, opposite 西利, just uphill of the よーじや gate; 京町家-style structure, 「京町家の雰囲気を残した趣のある店内」; mascot 夕子 on packaging and POP. **No street sample table documented** — counter service | [V] |
| `京つけもの西利 清水産寧坂店（青龍苑）` | Nishiri Sanneizaka | pickles | Set back through the Seiryuen gate in a 数寄屋／町家 pavilion **within the garden — not a street-facing shopfront**. [?] listed as a tenant but on 掲載保留 and absent from Nishiri's own store list | [?] |
| `おみやげ処 角桑` | Kadokuwa | souvenir | facade [T]: open souvenir frontage on the slope | [V/T] |
| `よーじや 清水産寧坂店` | Yojiya Sanneizaka-ten | cosmetics | **Relocated 2026-04-01** to front 産寧坂 directly (previously deep inside 青龍苑, whose gate carried the white lantern-style sign). The face mark appears on **both the wooden 看板 and the noren**; traditional Japanese design. *Trademark: model the form, substitute the mark (§7.2)* | [V] |
| `本家西尾八ッ橋 産寧坂店` | Honke Nishio Sanneizaka-ten | yatsuhashi | 清水3-333-4. **Low-eaved open-type machiya** — 「通りから直接お菓子をご覧いただける、オープンタイプのお店」: sweets displayed straight onto the stone paving with **no glass barrier**. Bright, clean 純和風 interior; extensive sampling with tea | [V] |
| `ぎをん為治郎［麺処］産寧坂店` | Giwon Tamejiro Menbokoro | soba | At the **back** of the same building, not upstairs | [V] |
| `くろちく 青龍苑店` | Kurochiku | crafts | Machiya premises within the complex; 和雑貨, ちりめん風呂敷, 網代バッグ, tabi; garden views | [V] |
| `松栄堂 産寧坂店` | Shoyeido Sanneizaka-ten | incense | ~300-year-old incense house; 町家風 interior within 青龍苑; store-exclusive ときの香 line | [V] |
| `有喜屋 清水吉晴庵` | Yukiya Kisseian | soba | Founded 1929, 3rd-generation master (Contemporary Master Craftsperson). Dining room preserves a **Taisho-era kura interior** with 長唄 playing | [V] |
| `デリス` | Delice | cafe | Tart and café with takeout, within 青龍苑. [?] older reviews list イノダコーヒ in this slot | [?] |
| `阪口庵` | Sakaguchi-an | tea-house | 茶道体験 within 青龍苑; one of the garden's tea structures | [V] |
| `清水三年坂美術館` | Kiyomizu Sannenzaka Museum | museum | 清水3-337-1; Bakumatsu/Meiji 金工・七宝・蒔絵・京薩摩, ~10,000 pieces. facade [T]: discreet modern museum frontage inserted into the machiya row | [V/T] |
| `MACCHA HOUSE 抹茶館 清水産寧坂店` | Maccha House | matcha-cafe | 清水3-337; Uji matcha from 森半. facade [T]: dark timber frontage with a modern logo panel, tiramisu photo board, queue rail | [V/T] |
| `甘党茶屋 京 梅園 清水店` | Kanto Chaya Kyo Umezono | tea-house | 産寧坂339-1, est. 1927. 和風な店構え — two-storey timber front with noren and lattice, **食品サンプル replicas in a case outside the door**, takeaway mitarashi counter; table and tatami seating. *This is the source of the verified 甘味処 price strips in §2.3* | [V] |
| `忘我亭 清水店` | Bogatei | crafts | 清水3-337; 和雑貨. facade [T]: small open machiya frontage with goods trays to the street | [V/T] |
| `喜楽庵岡本` | Kirakuan Okamoto | rental | Kimono rental. facade [T]: machiya with kimono displayed at the entrance, A-board | [V/T] |
| `杉養蜂園` | Sugi Yohoen | sweets | Honey and honey soft serve. [?] may be the same shop logged on 清水坂 | [?] |
| `京都蒟蒻しゃぼん` | Kyoto Konnyaku Shabon | other | Konnyaku-based natural soap. facade [T]: bright small frontage, soaps in glass jars on tiered shelving | [V/T] |
| `まかそ屋` | Makasoya | souvenir | facade [T]: open frontage on the slope | [V/T] |
| `おうすの里 産寧坂店` | Ousu no Sato | pickles | 清水3-342-1; umeboshi specialist, 低塩京仕込み. Sells nothing online, so **the in-store display is the business** — open jars/pots and tasting at the front. Immediate neighbour of 阿古屋茶屋 | [V] |
| `総本家ゆどうふ奥丹清水` | Sohonke Yudofu Okutan | tofu-yuba | 清水3-340, founded 1635, Kiyomizu premises 1950s in the inherited residence of soy-brewer 石橋家, major rebuild c.1913; Kyoto City heritage register 京4-029-72. **Deep site behind a gate, stream-fed garden, private rooms over it, underground tofu workshop, 600-year-old cedar framing**; 120 seats; closed Thursdays, cash only | [V] |
| `嘉祥窯 清水店` | Kashogama | ceramics | 清水3-343; 1F of the 阿古屋茶屋 building; four-generation Kyo-yaki kiln, tea ware, 陶芸体験. [?] its own page says 三年坂, Akoya says 二年坂 — corner site, verify orientation | [?] |
| `京・お漬物処やました` | Kyo Otsukemono Yamashita | pickles | 清水3-316; owner-grower shop. **Whole chilled cucumbers on sticks** as the signature — an ice tray or chilled display at the street edge | [V] |
| `産寧坂まるん` | Sanneizaka Marun | sweets | 清水3-317-1, partway up the steps. Small timber frontage but the street face is an **open wall of glass jars and tiny bottles of multicoloured candy on tiered wooden shelving** — a block of colour against dark timber. Hand-lettered signage, no illuminated sign | [V] |
| `伊藤軒／SOU・SOU 清水店` | Itoken / SOU・SOU | sweets | 清水3-315. Contemporary insert fronted with SOU・SOU's **SO-SU-U numeral textile graphic** — flat colour blocks and a modern logo sign, a strong visual outlier against the dark timber. No eat-in, so customers cluster on the steps | [V] |
| `雲ノ茶 KUMONOCHA 清水三年坂店` | Kumonocha | matcha-cafe | 清水3-317. "New Kyoto style" — bright modern interior, **round window onto the slope**, dry landscape garden inside, staff workspace visible | [V] |
| `たまごパーラー 京都産寧坂` | Tamago Parlor | sweets | Egg desserts, plain and matcha. facade [T]: small bright modern counter with a photo menu board | [V/T] |
| `リストランテ オブリーオ` | Ristorante Obulio | restaurant | Italian in a converted machiya | [V] |
| `京だんご 藤菜美 三年坂本店` | Fujinami Sannenzaka Honten | sweets | Founded 1979. Traditional wooden shopfront with **dango grilled to order in view of the street**, takeaway counter at the front, small tea room behind. [?] exact banchi unconfirmed | [V/?] |
| `松寿軒` | Shojuken | sweets | Est. 1932, low-volume 生菓子 and 最中. facade [T]: small quiet wagashi shopfront, short noren, glass case | [V/T] |
| `京 梅心庵` | Kyo Baishin-an | pickles | Umeboshi specialist. facade [T]: narrow front, umeboshi in glazed pots, tasting dish | [V/T] |

### 1.7 Census — 二寧坂 / 二年坂, plus 八坂通 and 一年坂

| Japanese (as on the sign) | Romanisation | Category | Shopfront | Conf. |
|---|---|---|---|---|
| `スターバックス コーヒー 京都二寧坂ヤサカ茶屋店` | (generic coffee house — see §7.2) | cafe | 桝屋町349, opened **2017-06-30** in a 100+ year Taisho machiya. **269.52 m² (81.53 坪), 51 seats.** The main building and 大塀 are **designated traditional buildings within the preservation district**, and this is **the only outer wall in the stretch still preserving its original appearance**. Two storeys, dark timber, upper-floor 格子 lattice over the paving; **entry through a hanging noren — the world's first Starbucks with one**; no illuminated fascia, only a small discreet plate and a lantern. Front 坪庭 with tile laid in a scale/wave pattern, middle courtyard, rear 枯山水; three tatami rooms inside (one a former bathhouse), 琉球畳, washi art, Nishijin textiles. **Model the building and the noren; substitute a generic `珈琲` plate for the mark** | [V] |
| `かさぎ屋` | Kasagiya | tea-house | 高台寺桝屋町349, est. 1914, beside the foot of the 16-step stone stair. Meiji two-storey machiya, **dark 長暖簾 over a wooden sliding door, swapped in summer for a white noren plus a `氷` flag**; free-standing wooden 立て札 reading `甘党の素通り出来ぬ二寧坂`; **no illuminated signage, no A-board**. Inside ~20 cramped seats, Takehisa Yumeji paintings, 千社札 stickers on the ceiling. Cash only, closed Tuesdays | [V] |
| `阿古屋茶屋` | Akoya Chaya | pickles | 清水3-343; 2F above 嘉祥窯. **Stone-stepped exterior facing 二年坂** with a view down the slope from the door; 純和風 exterior. **A name sign-up board (記名表) set out on the step from 10:00**, queue on the stone steps from ~09:45; 50 seats plus ~20 waiting seats; all tableware is in-house 清水焼 | [V] |
| `二年坂まるん` | Ninenzaka Marun | sweets | 八坂通二年坂西入. Same format as the Sanneizaka shop — open wall of glass candy jars on tiered wooden shelving, hand-lettered signage | [V] |
| `二年坂 釜座` | Ninenzaka Kamanza | restaurant | facade [T]: machiya frontage, noren, menu board on the paving | [V/T] |
| `香りの専門店 二井三` | Niimi | incense | Incense sticks and 匂い袋. facade [T]: narrow machiya front, incense boxes racked at the entrance, restrained wooden sign | [V/T] |
| `香十 二寧坂店` | Koju Ninenzaka-ten | incense | Opened April 2016 as a homecoming to the brand's birthplace. Described by the company as **a small single-noren shop** — deliberately understated frontage | [V] |
| `どんぐり共和国 二寧坂店` | Donguri Kyowakoku | souvenir | 桝屋町363-22-2. Deliberately un-modernised **old Japanese house (古い日本家屋の路面店)** on the cobbles — dark timber, tiled roof, low eaves; **life-size giant Totoro plush at the entrance** as the photo spot; landscaped back garden with further installations. *Trademark: substitute a generic plush silhouette* | [V] |
| `Peter Rabbit™ SHOP&BAKES 京都・二寧坂店` | Peter Rabbit Shop & Bakes | cafe | 桝屋町363-22, opened 2023-09-21. Deliberately **quaint traditional exterior conforming to preservation rules** — dark timber, restrained signage, **no bright branding on the street**; character figure just inside; ~700 SKUs; rear **courtyard eat-in garden**. *Trademark: substitute* | [V] |
| `ちりめん細工館 二寧坂店` | Chirimen Zaikukan | crafts | 桝屋町349-6. Two storeys, 「石畳の空間に和の趣」; 吊るし飾り, 手まり, modern chirimen goods | [V] |
| `つむぐ工房 二寧坂店` | Tsumugu Kobo | crafts | Workshop inside the Chirimen Zaikukan premises; 起き上がり小法師 making, 45–60 min | [V] |
| `代官山 Candy apple 清水二寧坂店` | Daikanyama Candy Apple | sweets | 桝屋町351-11-5, opened 2023-04-01, **directly opposite the Ninenzaka coffee house**. Small, bright and colour-saturated against the timber street — **the whole frontage is a lit display of glossy candy apples on sticks in rows**, pastel palette, modern logo signage; bench seating for 6–8, constant photo crowd | [V] |
| `富貴屋` | Fukiya | souvenir | facade [T]: open machiya frontage with goods to the street, hanging noren | [V/T] |
| `丹波黒 二寧坂店` | Tanbaguro | sweets | 桝屋町349-25; black-soybean confectionery. facade [T]: small dark-timber front, sample dish, wooden fascia | [V/T] |
| `御菓子 艸堂` | Okashi Sodo | sweets | facade [T]: small wagashi shopfront, short noren, glass case | [V/T] |
| `寺子屋本舗 二寧坂店` | Terakoya Honpo | sweets | facade [T]: open front with grilling counter and skewered senbei to the street, indigo noren | [V/T] |
| `局屋立春 二年坂店` | Tsuboneya Risshun | sweets | [?] appears in a 二年坂 walk list; branch existence unresolved | [?] |
| `京甘味 文の助茶屋 京都本店` | Bunnosuke-jaya | tea-house | 下河原通東入八坂上町373, founded 1909 by the rakugo-ka 二代目桂文之助. **Enters through a substantial temple-style gate (お寺みたいな門), not a street shopfront**; behind it a **garden courtyard with 縁台 benches, a large 行灯, plum and maple** carried from the original Kodai-ji sub-temple site; **red 提灯 with the shop name, hand-written wooden signs, hanging noren, red 番傘 parasols inside**; tatami 小上がり. Famous for 甘酒 and warabimochi | [V] |
| `% Arabica Kyoto Higashiyama` | % Arabica | cafe | 星野町87-5, flagship opened 2014. **Minimal white cube frontage, full-height glass, a single mark** — deliberately modern against the machiya, **on the 八坂の塔 view axis**. The single strongest modern/traditional juxtaposition on the route | [V] |
| `日東堂` | Nittodo | crafts | 八坂上町385-4. Renovated two-storey wooden machiya; 1F retail plus a coffee stand, 2F multipurpose space; Japanese daily-use goods and stationery | [V] |
| `陶あん 八坂店` | Toan Yasaka-ten | ceramics | 清水焼 branch on 八坂通. facade [T]: machiya front with pottery on stepped stands, vertical 看板 | [V/T] |
| `炙り団子 十文堂` | Aburi Dango Jumondo | sweets | 玉水町76 at 東大路×八坂通, at the **foot** of the Yasaka-no-To slope. Very small corner shop, highly visible from buses; **noren printed with a bell (鈴) illustration** for its 鈴なり団子; wooden frontage, compact, reliable queue. Closed Wed and Thu | [V] |
| `The Unir coffee senses` | Unir Coffee Senses | cafe | 桝屋町363-6 on 一念坂. **Kyoto City-designated traditional building, 100+ years old**; Coffee Senses Bar inside | [V] |
| `高台寺 一念坂 金網つじ` | Kanaamitsuji | crafts | 桝屋町362 on 一念坂. **京金網 handwoven wire craft** — tofu scoops, tea strainers, coffee drippers. Quiet setting, closed Wednesdays | [V] |
| `京だんご 藤菜美 高台寺店` | Fujinami Kodaiji-ten | sweets | 下河原町463-24, **on ねねの道**. Big plate-glass frontage, open kitchen behind glass, counter seats, small 坪庭 | [V] |

**Closed — do not model as trading:** `洛匠` (Rakusho, closed 2020-07-28; was known for 草わらびもち and a carp-pond garden) · `おうすの里 二年坂店` (permanently closed, former 桝屋町349-10) · `京だんご 藤菜美 二年坂店` (closed; the 三年坂本店 and 高台寺店 remain). **[V]**

### 1.8 Census — 花見小路通 / 祇園, ねねの道, 石塀小路, 下河原通

**Confidence is materially lower for this group than for the three slopes** — see
§7.3. Hanamikoji and Shijo rest on the Gion merchants' association's own
113-business directory with addresses; the ねねの道 / 下河原通 / 石塀小路 business
list was **not fully re-verified** and is marked accordingly.

| Japanese (as on the sign) | Romanisation | Category | Shopfront | Conf. |
|---|---|---|---|---|
| `一力亭` | Ichiriki-tei | ochaya | **The anchor of the district.** SE corner of 四条通 × 花見小路. Founded in the Genroku era (1688–1704) as 万屋／万亭; the name comes from splitting 萬 into 一 and 力. Walls in **紅殻 bengara iron-oxide red-ochre**, black timber, fine vertical 格子, plain white-charactered lanterns. Main building plus a two-storey seating wing facing Shijo (rebuilt in Meiji after the 1864 fire), a single-storey rear wing and three storehouses. Associated with Oishi Kuranosuke before the Ako incident | [V] |
| `祇園甲部歌舞練場` | Gion Kobu Kaburenjo | theatre | The 都をどり theatre; large tiled roof, walled forecourt, banners and lanterns during April | [V] |
| `弥栄会館` | Yasaka Kaikan | theatre | Distinctive large 1936 building at the south end of Hanamikoji | [V] |
| `ochaya / okiya (お茶屋・置屋), ~60+ premises` | — | ochaya | **The defining frontage type.** Two-storey machiya, near-black stained timber, fine 格子 across the whole ground floor, **no product, no window display, no menu**. Identified only by a **tiny nameplate (表札)** — a small wooden slat with a brush-written house name, or a narrow black lacquer plate with gold characters — plus a pair of red lanterns and, when open, a short noren. **犬矢来 along the base.** See §6.1 | [V for the type] |
| `中村楼` | Nakamuraro | kaiseki | At the Yasaka south gate; very old teahouse-restaurant | [V] |
| `二軒茶屋` | Nikenchaya | restaurant | Adjacent to Nakamuraro at the shrine approach | [V] |
| `鍵善良房` | Kagizen Yoshifusa | sweets | Shijo, Gion. Famous for **くずきり** served in a lacquer box; dark restrained frontage, gold-on-black signboard | [V] |
| `祇園徳屋` | Gion Tokuya | tea-house | Warabimochi specialist | [T] |
| `祇園小石` | Gion Koishi | sweets | Kyoto candy and parfaits | [T] |
| `ぎをん小森` | Giwon Komori | tea-house | Shirakawa; the source of the verified high-end 甘味 prices in §2.3 | [V] |
| `都路里` | Tsujiri | matcha-cafe | Matcha parfaits; also a 高台寺 branch on ねねの道 | [V] |
| `圓徳院` | Entoku-in | temple | 下河原町530. Kodai-ji sub-temple on ねねの道; admission 500円 | [V] |
| `高台寺掌美術館` | Kodai-ji Sho Museum | museum | Same address, **2F of 京・洛市「ねね」** | [V] |
| `京・洛市「ねね」` | Kyo-Rakuichi "Nene" | souvenir | The souvenir complex on ねねの道 beneath the museum. **[?] tenant list unverified** | [?] |
| `月眞院` | Gesshin-in | temple | Kodai-ji sub-temple, ねねの道 | [V] |
| `岡林院` | Korin-in | temple | Kodai-ji sub-temple, ねねの道 | [V] |
| `高台寺 おりおり` | Kodaiji Oriori | cafe | ねねの道 | [V] |
| `湖月茶屋` | Kogetsu Chaya | tea-house | ねねの道 | [V] |
| `石塀小路 夢庵` | Ishibekoji Muan | restaurant | 石塀小路 | [V] |
| `直心房さいき` | Jikishinbo Saiki | kaiseki | 石塀小路 area | [V] |
| `京料理 古都梅` | Kyo-ryori Kotobai | kaiseki | 下河原 area | [V] |
| `割烹ほたる` / `祇園佐の` / `松春` / `富久家` / `藤堂` / `はぎ` / `Wakana` | — | restaurant | Small restaurants and kappo, Gion / 下河原 | [V for existence] |
| `Hario Cafe` / `Madame Delluc` / `Jouvencelle` / `TSUKIMI` / `Kawataro` / `しぇりークラブ` | — | cafe/restaurant | Modern inserts in the ねねの道 / 下河原 area | [V for existence] |
| `ひさご` | Hisago | restaurant | Oyakodon, ねねの道 area | [V] |
| `下河原 阿月` | Shimogawara Azuki | sweets | **[?] reported closed May 2011 — unverified. Do not model as trading without checking** | [?] |

**Unverified — do not build on these without checking:** 東山八百伊, 羽柴, 乃あん,
波ぎ茶寮, 元奈古, 萬治郎, 和久傳, 京大和, 菊乃井本店, 無碍山房, 祇園にしかわ,
前田珈琲高台寺店, 豆ちゃ, 田舎亭, 龍吟, うえむら, ギャルリー和田. Several are
plausible and some are probably right, but they were not sourced. **[?]**
## 2. Signage vocabulary — ready-to-render strings

This is the highest-leverage section for the renderer. Every string below is
correctly written and appropriate to its context. Format:

> `string` — direction — colour — where it goes

Direction is **V** (vertical, read top-to-bottom, columns right-to-left) or
**H** (horizontal, left-to-right). Historic-shop signage in this district is
**overwhelmingly vertical**; horizontal is used for modern notices, price
strips, and anything bilingual.

### 2.0 Typographic rules the generator must obey

1. **Vertical text has no rotation of the glyphs.** Characters stack upright.
   Only long vowel marks (ー), brackets and the small kana rotate. If your
   renderer rotates a whole horizontal run 90°, it will look immediately wrong.
2. **Old shop signage reads right-to-left horizontally** on genuinely pre-war
   signboards and on lantern bands: `舗本家味七` for 七味家本舗. Use this
   sparingly — a couple of instances sell the age; more looks like an error.
3. **Numerals.** Traditional signage uses kanji numerals (`五百円`), modern price
   strips use Arabic (`800円`). Vertical price columns often use 〇一二三四五六
   七八九十. Mixed usage on the same street is correct.
4. **Kyoto-specific characters that carry huge flavour per glyph**: 京, 都, 茶,
   湯, 甘, 酒, 香, 扇, 焼, 漬, 味, 花, 祇, 坂, 寺, 神.
5. **The 屋 suffix** (`〜屋`) and **本舗 / 本店 / 老舗 / 総本家** suffixes mark a
   shop as old. **[V — standard usage]**

### 2.1 暖簾 (noren) — short texts

Noren are the primary "sign" of a traditional shop here. Typical panel: **1.2 m
wide × 0.9–1.4 m drop**, split into 3 or 5 vertical panels with ~2 cm gaps, hung
from a bar under the eave at ~1.75 m so you duck slightly. Short noren (半暖簾,
0.5 m drop) are used where the shop wants the interior visible.

**Colour convention (real, and worth honouring):** **[V]**
- **紺 / 藍 indigo** with white reserved text — drapers, sake, soba, general old trade
- **白 white / cream** with dark text — confectioners and pharmacies (from the colour of sugar)
- **茶 brown** — originally tobacconists; now pickle shops and ryotei
- **柿渋 persimmon-brown** — tea houses, craft shops
- **紅 / 臙脂 madder-crimson** — sweets, tea houses, celebratory

**Single-character noren** (the highest-value asset — one glyph, enormous read):

| String | Dir | Colour | Use |
|---|---|---|---|
| `茶` | V | white on indigo | tea shop, tea house |
| `酒` | V | white on indigo | sake seller, izakaya |
| `湯` | V | white on indigo | bathhouse (銭湯) — one on the route's fringe **[T]** |
| `甘` | V | white on crimson | 甘味処 sweets parlour |
| `京` | V | white on indigo / gold on black | anything Kyoto-branded |
| `香` | V | white on brown | incense shop |
| `扇` | V | white on indigo | fan shop |
| `焼` | V | dark on cream | pottery / grilled food |
| `漬` | V | white on brown | pickle shop |
| `麺` | V | white on indigo | noodles |
| `蕎` | V | white on indigo | soba |
| `豆` | V | dark on cream | tofu shop |
| `飴` | V | dark on cream | candy shop |
| `染` | V | white on indigo | dyer / textiles |
| `器` | V | dark on cream | ceramics |
| `和` | V | white on indigo | generic |
| `雅` | V | gold on black | high-end **[T]** |
| `福` | V | white on crimson | auspicious **[T]** |

**御-forms and polite noun noren:**

| String | Dir | Colour |
|---|---|---|
| `御茶處` | V | white on indigo |
| `御菓子司` | V | dark on cream |
| `御料理` | V | white on indigo |
| `御宿` | V | white on indigo |
| `御香` | V | white on brown |
| `御土産` | V | dark on cream |
| `御休處` | V | white on persimmon |
| `御好み` | V | white on indigo |
| `おいでやす` | H | dark on cream |
| `おこしやす` | H | dark on cream |
| `一服どうぞ` | V | dark on cream |
| `甘味処` | V | white on crimson |
| `喫茶` | V | white on indigo |
| `お食事処` | V | white on indigo |
| `手打蕎麦` | V | white on indigo |
| `京漬物` | V | white on brown |
| `京菓子` | V | dark on cream |
| `清水焼` | V | dark on cream |
| `京扇子` | V | white on indigo |
| `京こま` | V | dark on cream |
| `抹茶処` | V | white on deep green |
| `茶房` | V | dark on persimmon |
| `湯どうふ` | V | white on indigo |
| `ゆば` | V | dark on cream |
| `八ツ橋` | V | dark on cream |
| `七味唐がらし` | V | white on indigo |
| `京とうふ` | V | dark on cream |
| `くずきり` | V | dark on cream |
| `わらび餅` | V | dark on cream |
| `だんご` | V | white on crimson |
| `ぜんざい` | V | white on crimson |
| `かき氷` | V | dark blue on white |
| `氷` | V | red + blue on white — *the classic summer shaved-ice flag/noren; the character is drawn in red with blue waves, instantly readable* |

### 2.2 看板 — wooden signboards

Two families:

**(a) 袖看板 / 掛看板 — the vertical plank hung flat on the facade or projecting
from a post.** Typical **0.25–0.4 m wide × 1.2–2.0 m tall × 0.04 m thick**,
keyaki or cedar, either raw-oiled with **carved-and-inked** characters or
lacquered black with **gold-leaf** characters. Mounted at 2.2–3.0 m.

**(b) 立て看板 / 置き看板 — free-standing A-board or single leaning board** at
the shop edge, 0.5 × 0.9 m, chalk or painted.

Typical 3–6 character shop names for procedural placement (all correctly formed;
mark **[T]** unless listed in §1 as a real business):

`七味家本舗` · `本家西尾八ッ橋` · `井筒八ツ橋本舗` · `聖護院八ッ橋` · `土井志ば漬本舗` · `京つけもの西利` · `打田漬物` ·
`朝日堂` · `文の助茶屋` · `かさぎ屋` · `藤菜美` · `洛匠` · `阿古屋茶屋` ·
`奥丹清水` · `清水順正` · `鍵善良房` · `祇園小石` · `祇園徳屋` · `都路里` ·
`よーじや` · `一保堂茶舗` · `中村藤吉` · `松栄堂` · `宮脇賣扇庵` · `白竹堂` ·
`一力亭`

Generic but correct signboard strings **[T]**:

| String | Dir | Colour |
|---|---|---|
| `京菓匠` | V | gold on black |
| `御菓子司` | V | gold on black |
| `京料理` | V | gold on black |
| `懐石料理` | V | gold on black |
| `茶寮` | V | gold on black |
| `京の味` | V | black on cedar |
| `名代` | V | black on cedar |
| `元祖` | V | black on cedar |
| `老舗` | V | black on cedar |
| `創業慶応元年` | V | black on cedar |
| `京銘菓` | V | black on cedar |
| `京陶苑` | V | black on cedar |
| `清水焼窯元` | V | black on cedar |
| `陶器` | V | black on cedar |
| `京人形` | V | black on cedar |
| `京扇堂` | V | gold on black |
| `香老舗` | V | gold on black |
| `香木・線香` | V | black on cedar |
| `京念珠` | V | black on cedar |
| `西陣織` | V | black on cedar |
| `手ぬぐい` | V | black on cedar |
| `和小物` | V | black on cedar |
| `竹細工` | V | black on cedar |
| `和傘` | V | black on cedar |
| `京指物` | V | black on cedar |
| `旅館` | V | gold on black |
| `貸衣裳・着物レンタル` | H | dark on white |
| `本日営業中` | V | black on cedar |
| `準備中` | V | black on cedar |
| `貸切` | V | black on cedar |
| `完売御礼` | V | red on white |
| `二階へどうぞ` | V | black on cedar |
| `お履物のままどうぞ` | H | black on cedar |

### 2.3 Price strips and menu boards

The workhorse asset: a narrow paper or wooden strip, **0.09–0.12 m tall ×
0.4–0.6 m wide** for horizontal, or **0.09 m wide × 0.6 m tall** vertical,
usually **black brush on cream/white**, sometimes red for the price. Menus are
posted in racks of 6–20 at the shop mouth. Prices below are real observed Kyoto
prices in the ¥ range current for 2024–2026 unless marked.

**Tea house / 甘味処 — verified from a Kyoto amamidokoro menu [V]:**

| String | Dir | Note |
|---|---|---|
| `みたらし団子　６００円` | V | |
| `わらび餅　９２０円` | V | |
| `白玉ぜんざい　９３０円` | V | |
| `餅ぜんざい　９３０円` | V | |
| `冷やし志るこ　９００円` | V | |
| `白玉あんみつ黒みつ添え　９００円` | V | |
| `白玉みつ豆黒みつ添え　９００円` | V | |
| `みたらし団子ときなこ白玉　９００円` | V | |
| `みたらし団子と抹茶わらび餅　１０００円` | V | |
| `宇治冷やしぜんざい　１０７０円` | V | |
| `あべかわ　１１００円` | V | |
| `クリームあんみつ黒みつ添え　１１８０円` | V | |
| `冷やし抹茶クリーム小豆　１１８０円` | V | |
| `みたらし団子と小さいパフェ　１２５０円` | V | |
| `あわぜんざい　１３５０円` | V | |
| `宇治金時　１１３０円` | V | |
| `宇治金時白玉＋抹茶アイスクリーム　１６３０円` | V | |
| `かき氷　９８０円` | V | |
| `抹茶（おうす）　８５０円` | V | |
| `煎茶　７５０円` | V | |
| `ほうじ茶　７５０円` | V | |
| `グリーンティー　７５０円` | V | |
| `抹茶豆乳　８５０円` | V | |
| `よもぎ団子　６５０円` | H | takeaway |
| `みたらし団子（５本パック）　５８０円` | H | takeaway |

**Higher-end Gion tea house [V]:**

| String | Dir |
|---|---|
| `抹茶わらびもち　１４００円` | V |
| `わらびもちパフェ（黒蜜つき）　１７００円` | V |
| `わらび餅　１５００円` | V |
| `冷抹茶　１０００円` | V |

**Generic street-food / 食べ歩き strip — the ones actually shouted from
Kiyomizu-zaka [T, prices in the correct band]:**

| String | Dir |
|---|---|
| `抹茶パフェ　８００円` | V |
| `抹茶ソフトクリーム　５００円` | V |
| `ほうじ茶ソフト　５００円` | V |
| `みたらし団子　１本１５０円` | V |
| `だんご　３本５００円` | V |
| `生八ツ橋　１０個入　５００円` | V |
| `生八ツ橋　５箱１０００円` | H |
| `八ツ橋　試食できます` | H |
| `京ばあむ　１４００円` | V |
| `豆乳ドーナツ　３００円` | V |
| `いちご大福　４００円` | V |
| `コロッケ　２００円` | V |
| `湯葉コロッケ　３００円` | V |
| `だし巻き玉子　５００円` | V |
| `冷やしあめ　３００円` | V |
| `ラムネ　２００円` | V |
| `抹茶ラテ　６００円` | V |
| `ぜんざい　７００円` | V |
| `おだんご各種　１５０円より` | V |

**Soba / udon [V for the band, individual lines T]:**

| String | Dir |
|---|---|
| `にしんそば　１１００円` | V |
| `ざるそば　８００円` | V |
| `天ざるそば　１３００円` | V |
| `きつねうどん　１０００円` | V |
| `月見うどん　９００円` | V |
| `鍋焼きうどん　１４００円` | V |
| `そば定食　１５００円` | V |
| `おろしそば　１０００円` | V |

**Tofu / yuba — verified from the Kiyomizu tofu house [V]:**

| String | Dir |
|---|---|
| `ゆどうふ　昔とうふコース　４０００円` | V |
| `ゆどうふコース　３０００円` | V |
| `ゆどうふ（花）　３０００円` | V |
| `湯葉料理　３６３０円` | V |
| `京懐石　５５００円より` | V |
| `豆腐会席　昼　３３００円` | V |
| `生ゆば　６００円` | V |

**Yatsuhashi and souvenir-confectionery boxes — all verified real 2025–26 prices
from the makers' own price lists [V].** These are the strips and shelf-edge cards
that cover the walls of every 清水坂 / 産寧坂 confectioner.

| String | Dir | Maker |
|---|---|---|
| `生八ッ橋　１８５g　２５０円` | V | 本家西尾八ッ橋 |
| `生八ッ橋　３００g　５００円` | V | 本家西尾八ッ橋 |
| `あん生八ッ橋　４個　２５０円` | V | 本家西尾八ッ橋 |
| `ニッキ　１０個　６８０円` | V | 本家西尾八ッ橋 |
| `ニッキ抹茶　１６個　１，０４０円` | V | 本家西尾八ッ橋 |
| `焼き八ッ橋　１２枚　２５０円` | V | 本家西尾八ッ橋 |
| `焼き八ッ橋　６３枚　１，３００円` | V | 本家西尾八ッ橋 |
| `八ッ橋クレープ　４５０円` | V | 本家西尾八ッ橋 — street counter |
| `ソフトクリーム　３５０円` | V | 本家西尾八ッ橋 — street counter |
| `生八ッ橋　２８枚　３９９円` | V | 井筒八ッ橋本舗 |
| `八ッ橋短冊　３０枚　５４０円` | V | 井筒八ッ橋本舗 |
| `化粧箱　４８枚　１，０８０円` | V | 井筒八ッ橋本舗 |
| `夕子　ニッキ　１０個　６４８円` | V | 井筒八ッ橋本舗 |
| `夕霧　５個　１，４８５円` | V | 井筒八ッ橋本舗 |
| `蕎麦ぼうろ　８６４円` | V | 井筒八ッ橋本舗 |
| `八ッ橋　２４枚　５４０円` | V | 聖護院八ッ橋 |
| `八ッ橋　４８枚　１，２９６円` | V | 聖護院八ッ橋 |
| `生八ッ橋　７５６円` | V | 聖護院八ッ橋 |
| `聖　１０個　７５６円` | V | 聖護院八ッ橋 |
| `四種詰合せ　１，５１２円` | V | 聖護院八ッ橋 |
| `にっき・抹茶　８個　７５６円` | V | おたべ |
| `にっき・抹茶　１６個　１，３５０円` | V | おたべ |
| `こたべ　５個　４５０円` | V | おたべ |
| `黒のおたべ　８個　１，０８０円` | V | おたべ |
| `つぶ餡入　清水おぼこ　１０個　７８０円` | V | 御殿八ッ橋おぼこ |
| `栗生八ツ橋　７１０円` | V | 御殿八ッ橋おぼこ |
| `生八ツ橋（餡なし）３００g　４２枚　５００円` | V | 元祖 西尾為忠商店 |
| `つぶ・抹茶あん　１４個　８４０円` | V | 元祖 西尾為忠商店 |
| `うす焼き　１８０g　７５０円` | V | 元祖 西尾為忠商店 |
| `生八ツ橋セット（２種＋生地＋お茶）３００円` | V | 元祖 西尾為忠商店 |
| `試食し放題` | H | the sample-tray sign itself |
| `店頭でお気軽にご試食いただけます` | H | 岩月堂 |

**Tea-room and light-meal strips — verified from a real 清水坂 second-floor tea
room [V]:**

| String | Dir |
|---|---|
| `八ッ橋パフェ　１，０２０円` | V |
| `抹茶パフェ　１，２００円` | V |
| `特選抹茶パフェ　１，５００円` | V |
| `にしんそば　１，４００円` | V |
| `ざる茶そば　９５０円` | V |
| `京風ラーメン　１，２００円` | V |
| `お抹茶（あんなま付）　７００円` | V |
| `抹茶ラテ　７００円` | V |

**Street-stall strips, verified from a real 清水坂 fried-yuba stall [V, board
dated 2018 — treat the figures as slightly low for 2026]:**

| String | Dir |
|---|---|
| `とろけるゆばチーズ　３５０円` | V |
| `たこねぎサクレ　３５０円` | V |
| `はじけるえびマヨ　３００円` | V |
| `宇治抹茶シェイク　４５０円` | V |

**Group-menu boards at the big souvenir halls [V, 2026]:** `古都　１，６５０円` ·
`京の宴　１，９５０円` · `雨の月　２，２００円` · `京の雅　２，９００円` ·
`湯豆腐追加　＋７７０円` — these hang as large horizontal lacquered boards inside
the entrance of the coach-party halls at the top of 清水坂.

**Format notes for the renderer.** Real strips often use full-width digits and
a full-width space before the price, and frequently drop `円` in favour of a
trailing `-` (`８００-`). Tax notation appears as `税込` (tax included) or
`（税込）` appended. High-end places write prices in kanji: `五千五百円`. A
common vertical layout is item name in one column, price in a smaller column to
its left.
### 2.4 Street name signs — Kyoto's distinctive style

Kyoto marks streets three ways, and all three appear on this route:

**(a) 石標 / 道標 — the granite marker post.** A square-section granite pillar,
**0.15–0.2 m square × 1.2–1.8 m tall**, characters **incised and inked black or
left bare**, vertical, one face per legend. This is the form used at the head of
each of the famous slopes. Weathered grey `#8E8B84` with black lettering and
lichen.

| String | Dir | Colour |
|---|---|---|
| `二年坂` | V | incised black on granite |
| `二寧坂` | V | incised black on granite |
| `産寧坂` | V | incised black on granite |
| `三年坂` | V | incised black on granite |
| `清水坂` | V | incised black on granite |
| `八坂通` | V | incised black on granite |
| `ねねの道` | V | incised black on granite |
| `石塀小路` | V | incised black on granite |
| `下河原通` | V | incised black on granite |
| `花見小路通` | V | incised black on granite |
| `維新の道` | V | incised black on granite |
| `清水道` | V | incised black on granite |
| `茶わん坂` | V | incised black on granite |
| `重要伝統的建造物群保存地区` | V | incised black on granite |
| `史跡 産寧坂` | V | incised black on granite |

**(b) 通り名 plate — the municipal street-name plate.** Kyoto's characteristic
form is a small rectangular plate, roughly **0.6 m × 0.12 m**, mounted on a pole
or fixed flat to a building corner, showing the street name **horizontally in
kanji with romaji below**, dark blue or dark green ground with white text. On
crossings Kyoto uses paired plates naming both streets. **[V for form; exact
municipal colour spec [?]]**

| String | Dir | Colour |
|---|---|---|
| `花見小路通　Hanamikoji dori` | H | white on dark green |
| `八坂通　Yasaka dori` | H | white on dark green |
| `下河原通　Shimogawara dori` | H | white on dark green |
| `東大路通　Higashioji dori` | H | white on dark green |
| `四条通　Shijo dori` | H | white on dark green |

**(c) 木製案内板 — the brown wooden directional finger-post.** Used inside the
preservation district instead of standard blue-and-white road signage, precisely
because of the ordinance. Dark-stained timber post, cream or white lettering.

| String | Dir | Colour |
|---|---|---|
| `清水寺　→` | H | white on dark brown |
| `高台寺　→` | H | white on dark brown |
| `八坂神社　←` | H | white on dark brown |
| `法観寺（八坂の塔）　→` | H | white on dark brown |
| `八坂庚申堂　→` | H | white on dark brown |
| `圓徳院　→` | H | white on dark brown |
| `二年坂　↑` | H | white on dark brown |
| `産寧坂　↑` | H | white on dark brown |
| `京都市指定 歴史的風致形成建造物` | H | white on dark brown |

### 2.5 提灯 (paper lanterns)

Three distinct populations on this route; they are **not** interchangeable.

**(a) 祇園 ochaya lanterns — Hanamikoji.** Small red-orange lanterns hung in
pairs or rows under the eave of an ochaya or okiya, typically **0.22 m dia ×
0.30 m tall**, carrying the **house name** in black brush on the red ground,
sometimes above the district crest. **Gion Kobu's crest is the 五つ団子
(itsutsu-dango) — five flat circles in a ring** — which appears on lanterns,
roof tiles, noren and paper, and is the most identifiable Gion graphic after the
lanterns themselves. **[V]**

| String | Dir | Colour |
|---|---|---|
| `一力` | V | black on red |
| `一力亭` | V | black on red |
| `お茶屋` | V | black on red |
| `祇園甲部` | V | black on red |
| `甲部` | V | black on red |
| `都をどり` | V | black on red — the April dance; posters and lanterns go up citywide |
| `祇をん` | V | black on red — the archaic spelling, genuinely used in Gion |
| `京都花街` | V | black on red |

The **一力亭** itself, at the SE corner of Shijo × Hanamikoji, is the one
building on the route with a colour of its own: walls in **紅殻 bengara**
iron-oxide red-ochre, a deep dull brick-orange `#8E4B37`, with black timber,
fine vertical **格子** lattice and plain white-charactered lanterns. It anchors
the whole district. **[V]**

**(b) Shrine donor lanterns — 八坂神社 舞殿.** The dance stage at the centre of
Yasaka Shrine is hung on all four sides, in a **double tier all the way round
the eaves**, with paper lanterns donated by Gion ochaya, okiya and local ryotei.
The shrine's own words: 「花街のお茶屋や付近の料亭などから奉納された多くの提灯は、
夜間明かりが灯されると幻想的な雰囲気を醸し出します。」 **[V]** Count is reported at
**約260〜280個**; converted from incandescent to LED from 2009. Building: burnt
1866, rebuilt 1874, 重要文化財. **[V]**

Format: **cream / off-white paper cylinder, black bamboo-rib bands top and
bottom, donor name in black brush kanji written vertically down the centre**,
occasionally with a small 家紋 above it. Typical **0.30 m dia × 0.45 m tall**.

**Important detail:** the lanterns carry **donor names only** — 「奉納」 is how the
shrine *describes* them, not what is printed on the face. Do not letter every
lantern `奉納`. **[V]**

Separately, the grounds carry **約100灯 of 万灯籠** — standing metal/stone
lanterns, also donated, mostly by Gion-area businesses. These are a different
object from the paper 提灯; both are lit at night. **[V]**

*Generator recipe for donor names* **[T]** — ochaya and ryotei naming
conventions are `<stem>` + one of {`屋`, `亭`, `楼`, `庵`, `家`}: e.g. `井筒屋`,
`中村亭`, `美濃楼`, `松乃家`, `喜久屋`. Add `祇園甲部`, `祇園町南側`,
`祇園町北側`, `京都料理組合`, `氏子中`, `講中` as occasional whole-lantern
strings. **I could not verify a single real donor name from a citable source —
do not present invented names as real.**

**(c) The big gate lanterns.** At Yasaka's **西楼門** and **南楼門**, and at
Kiyomizu's **仁王門**, large lanterns of **0.8–1.2 m diameter** hang in the gate
bay: white or off-white paper, black characters, heavy black lacquered rings.

| String | Dir | Colour |
|---|---|---|
| `八坂神社` | V | black on white |
| `祇園社` | V | black on white — the pre-Meiji name; survives on a stone lantern in the grounds **[V]** |
| `清水寺` | V | black on white |
| `献灯` | V | black on white |
| `無病息災` | V | black on white |
| `疫病退散` | V | black on white — Yasaka's core identity **[V]** |

**[?]** I could not verify what, if anything, is lettered on the 西楼門 lanterns
specifically — check a photo before committing.

**八坂神社's crest (神紋)** is the **五瓜に唐花 (gokka ni karahana)** — a
five-lobed melon-section outline enclosing a stylised Chinese flower — used
alongside the **左三巴 (hidari-mitsudomoe)** three-comma swirl on roof tiles,
curtains, the offertory box and lanterns. White on vermilion, or gold on black.
**[V for crest identity; treat exact lobe geometry as [?] and work from a photo]**

Note that **南楼門 is the shrine's formal main gate** (表参道), 入母屋造, built
1879, with the **石鳥居** (1646, 明神鳥居 type) in front of it on 下河原通 — the
approach torii is **stone, not vermilion**. 西楼門, the famous one facing
Shijo, is 重要文化財, built 1497, and was moved 6 m east and 3 m north in 1913
when Shijo was widened. **[V]**

### 2.6 Temple and shrine plaques (扁額) and stone markers

Hung in the gate bay or over the hall door: a lacquered board typically
**1.2–2.4 m wide**, **gold characters on black lacquer** in a carved gilt frame,
or **carved into raw keyaki** and inked. Temple gate plaques are **horizontal and
read right-to-left**.

**Verified:** Kiyomizu's **仁王門** plaque reads **`清水寺`**, attributed to
藤原行成, gilt on a dark ground. The gate itself is 「正面約10メートル、側面約5メートル、
棟高約14メートル」, 重要文化財. **[V]**

**Verified:** 法観寺's own seals give its 山号 as **`霊応山`** (also written
`霊應山`), with **`五智如来`** as the central 墨書 and **`八坂塔`** on the seal.
**[V]**

**Verified:** Kiyomizu signs itself **`音羽山清水寺`** on its own notice boards.
**[V]**

| String | Dir | Colour | Where |
|---|---|---|---|
| `清水寺` | H (right-to-left) | gold on dark | 仁王門 **[V]** |
| `音羽山` | H | gold on black | Kiyomizu's 山号 **[V]** |
| `音羽山清水寺` | V | black brush on white | Kiyomizu notice boards **[V]** |
| `北法相宗大本山` | V | incised on granite | Kiyomizu entrance post |
| `八坂神社` | H | gold on dark / white on vermilion | Yasaka gates |
| `祇園社` | — | incised on stone | on a surviving stone lantern **[V]** |
| `霊応山` | H | gold on black | 法観寺 **[V]** |
| `法観寺` | H | gold on black | **[V]** |
| `五智如来` | V | black brush | 法観寺 goshuin and hall **[V]** |
| `八坂の塔` | V | black on cedar | local signage |
| `五重塔` | H | gold on black | the pagoda |
| `高台寺` | H | gold on black | Kodai-ji |
| `圓徳院` | H | gold on black | Entoku-in |
| `八坂庚申堂` | H | gold on black | Koshin-do |
| `大黒山　金剛寺` | H | gold on black | Koshin-do's formal name **[V]** |
| `日本最初` | V | black on cedar | Koshin-do pillar board **[V]** |
| `庚申信仰発祥の地` | V | black on cedar | Koshin-do pillar board **[V]** |
| `日本三庚申` | V | black on cedar | Koshin-do pillar board **[V]** |
| `八 坂 庚 申 堂` | V, spaced glyphs | black on cedar | Koshin-do pillar board — note the wide letter-spacing **[V]** |
| `地主神社` | H | gold on black | Jishu Jinja (closed — §7) |
| `安井金比羅宮` | H | gold on black | |
| `随求堂` | H | gold on black | Kiyomizu |
| `奥の院` | H | gold on black | Kiyomizu |
| `阿弥陀堂` | H | gold on black | Kiyomizu |
| `経堂` | H | gold on black | Kiyomizu |
| `鐘楼` | H | black on cedar | Kiyomizu |
| `轟門` | H | gold on black | Kiyomizu — **the ticket gate is here, not at 仁王門** **[V]** |
| `西門` | H | gold on black | Kiyomizu |
| `三重塔` | H | gold on black | Kiyomizu, ~30 m tall, rebuilt 1632 **[V]** |
| `成就院` | H | gold on black | Kiyomizu |
| `子安塔` | H | gold on black | Kiyomizu |
| `本堂` / `本殿` / `拝殿` / `舞殿` | H | gold on black | |
| `疫神社` / `美御前社` / `大国主社` / `悪王子社` / `刃物社` / `大神宮社` / `玉光稲荷社` / `北向蛭子社` / `冠者殿社` | H | gold on black | Yasaka sub-shrines, all **[V]** from the shrine's own goshuin list |

Kiyomizu's own numbered 境内案内 uses these names in this order — reuse them
verbatim on the site map board: `仁王門` `西門` `鐘楼` `三重塔` `随求堂` `経堂`
`本堂` `阿弥陀堂` `奥の院` `音羽の瀧` `成就院` `千体石仏群` `子安塔`
`大講堂（円通殿）寺務所`. **[V]**

**Note the character:** the temple writes **`音羽の瀧`** with the old form 瀧 on
its own map, not 音羽の滝. Use 瀧 on temple-authored signage and 滝 on tourist
signage. **[V]**

Free-standing **stone entrance markers** — granite slabs ~**0.3 × 0.3 × 2.0 m**,
deeply incised vertical characters:

| String | Dir | Colour |
|---|---|---|
| `世界文化遺産　清水寺` | V | incised, black-inked on granite |
| `北法相宗大本山　清水寺` | V | incised on granite |
| `官幣大社　八坂神社` | V | incised on granite — the pre-war rank, still on the old post |
| `国宝` / `重要文化財` / `史跡` | V | incised on granite |

### 2.7 Notices, admission, hours and prohibitions

#### Admission (拝観料 / 入山料)

Posted on a **cream board in a timber frame**, ~**0.9 × 0.6 m**. **Institutional
signage uses Arabic numerals with comma grouping**; small hand-lettered temple
stalls use vertical kanji numerals. Both appear on this route and the mix is
correct.

Real, current figures **[V]**:

| String | Dir | Site |
|---|---|---|
| `拝観料　大人 500円　小・中学生 200円` | H | 清水寺 (raised from 400/200 in April 2024). Ticket booth is at **轟門**, mid-grounds — **cash only** |
| `胎内めぐり　100円` | V | 清水寺 随求堂 |
| `拝観料　大人 800円　中高生 400円` | H | 高台寺 — **raised 2026-04-01** from 600/250; any reference photo older than that shows the old price |
| `団体(30名以上)　700円` | H | 高台寺 |
| `共通割引拝観券（高台寺・圓徳院）　1,200円` | H | 高台寺 / 圓徳院 |
| `拝観料　大人 500円　中高生 200円　団体（30人以上）400円` | H | 圓徳院 |
| `※お支払いは現金のみです` | H | 圓徳院 |
| `小学生以下は大人の保護者同伴で拝観料免除いたします` | H | 高台寺 |
| `中学生以上　400円` | H | 法観寺 / 八坂の塔 |
| `※小学生以下拝観不可` | H | 法観寺 — the internal stair is near-vertical **[V]** |
| `不定休` | V | 法観寺 — genuinely unpredictable closure |
| `料金　無料` | H | 八坂庚申堂, 八坂神社, 安井金比羅宮 |
| `拝観料の団体割引等はございません。` | H | 清水寺, verbatim **[V]** |
| `Admission  Adults ¥500  Junior high & under ¥200` | H | English line beneath |

#### Hours (拝観時間) — verbatim strings

Kiyomizu's own notice, **verbatim, note the fullwidth colons** **[V]**:

> `拝観時間：`
> `6：00開門～18：00閉門（7.8月は18：30閉門）`
> `春、夏、秋の夜間特別拝観期間中は21：00受付終了`
> `なお、お守り授与所、納経所（ご朱印）での授与は`
> `8：00頃からとなりますので、ご了承の上お参りください。`

That last clause is a lovely, very specific detail: **the gate opens at 06:00 but
the amulet and goshuin counters do not open until about 08:00**, so an
early-morning scene should have the temple open and the stalls shuttered.

Other verbatim hour strings **[V]**:

| String | Dir | Site |
|---|---|---|
| `拝観時間　9:00〜17:30（17:00受付終了）` | H | 高台寺 |
| `夜間特別拝観　17:00点灯〜22:00（21:30受付終了）` | H | 高台寺 |
| `午前10:00～午後5:00受付終了（午後5:30閉門）　所要時間30分` | H | 圓徳院 |
| `通年開閉時間　午前9時～午後5時` | H | 八坂庚申堂 — note the **kanji hour style**, matching its hand-lettered look |
| `開催時間・営業時間　10時～15時` | H | 法観寺 **[? — sources conflict, 9–16 also reported]** |
| `社務所受付　9:00～17:00` | H | 八坂神社 |
| `参拝時間　午前９時～午後５時` | H | 地主神社, its pre-closure hours |
| `夜間特別拝観　21:00受付終了` | H | 清水寺 seasonal |

Kiyomizu's seasonal table, for a multi-panel board **[V]**:

```
1.1 〜 3.26                     6:00  18:00
3.27 〜 4.5（春の夜間特別拝観）    6:00  21:30（21:00受付終了）
4.6 〜 6.30                     6:00  18:00
7.1 〜 8.13                     6:00  18:30
8.14 〜 8.16（千日詣り／夏の夜間特別拝観） 6:00  21:30（21:00受付終了）
8.17 〜 8.31                    6:00  18:30
9.1 〜 11.20                    6:00  18:00
11.21 〜 11.30（秋の夜間特別拝観）  6:00  21:30（21:00受付終了）
12.1 〜 12.31                   6:00  18:00
```

#### 地主神社 — closed

The shrine inside Kiyomizu's grounds is **shut and fenced**, and has been since
**2022-08-19**. Its own banner, verbatim **[V]**:

> `地主神社は建造物・境内整備工事のため、`
> `閉門しています。`
> `（工期未定・開門時期未定）`

Body text: 「当神社は建造物・境内整備工事のため、現在閉門いたしております。何卒ご理解
賜りますようお願い申し上げます。」 **Do not model an open, staffed Jishu Jinja with
the 恋占いの石 accessible** unless you are deliberately setting the scene before
2022. Its own description of the stones, verbatim: 「片方の石から目を閉じて歩き、
もう一方の石にたどりつくことができると、恋の願いがかなうと伝わる“願掛け”の石です。」
The two stones sit ~10 m apart in front of the 本殿. **[V]**

#### Kiyomizu's conduct board — verbatim, posted 令和6年6月

A real, physical, very visible board headed 「【重要なお知らせ】お参りの皆さまへ」.
Black on white, vertical-friendly bullets, signed with the temple's formal name.
**[V]**

```
仁王門前の広場、外周道路も含めて、お寺の境内となっております。
境内では節度ある行動をもってお静かにお参りいただきますよう、お願い申し上げます。
・境内は禁煙です。喫煙所はありません。
・ペットボトル、水筒など、フタの閉まる飲み物を除き、境内への飲食の持ち込み、
　食べ歩き、立ち食いなどでの飲食禁止。
・ゴミの持ち込み禁止、ゴミの各自持ち帰りのご協力をお願いします。
・補助犬（盲導犬・介助犬・聴導犬）を除く、いかなるペットを連れての入山も
　お断りしております。
・ドローンを使った撮影、一脚、三脚を使った撮影、ウエディング、コスプレ、
　モデルを使った撮影はできません。
・諸堂や樹木の植え込みなど立入禁止区域への立ち入りは、固くお断りします。
・境内での座り込み、長時間同じ場所での撮影など、他の参拝者のお参りや通行の
　妨げとなることはご遠慮ください。
　　　　　　　　　　　　　　　　　　　令和6年6月
　　　　　　　　　　　　　　　　　　　音羽山清水寺
```

#### 京都市 no-smoking signage — verbatim from the city's own artwork sheet

Under the 京都市路上喫煙等の禁止等に関する条例 (in force 2007-06-01; the zone name
was revised to 路上喫煙等対策強化区域 on 2023-03-01), **清水・祇園地域 is a
¥1,000-penalty zone** — i.e. the entire scene. Enforced by uniformed
**路上喫煙等監視指導員**. **[V]**

Sticker, horizontal and vertical variants both exist:

> `この区域で 路上喫煙すると 千円が科されます` `¥1,000`
> `Public NonSmoking Area`
> `Smoking in a Public NonSmoking Area will be fined`
> `京都市くらし安全推進課` (small)

Second sticker:

> `京都での 路上喫煙は やめましょう`
> `Stop Smoking on the Streets`

Circular road decal (路面シート), text arched around a red no-smoking roundel:

> `路上喫煙等対策強化区域` / `京都市` / `過料 ¥1,000` / `Public Nonsmoking Area`
> flanked vertically by `街道吸煙等對策強化區域` and `노상흡연 등 대책 강화 구역`

A-frame board, vertical: `この区域で路上喫煙をすると千円の過料が科されます` + `京都市`,
mounted next to a zone map.

**Colours, from the city's own artwork [V]:** a **warm beige / tan panel with a
dark brown border** — Kyoto's muted townscape palette — with **black body text
and the key words (`路上喫煙`, `千円`, `やめましょう`) in red**, a red-and-black
roundel, and red English fine print. This is a perfect miniature illustration of
§4.1: even the municipality's own safety signage is beige rather than white
because of the landscape rules.

#### The Gion private-road signs — verbatim

Installed **2019-10-25** by the **祇園町南側地区協議会** with 京都市 and
東山警察署, on the **private alleys off Hanamikoji** (Hanamikoji itself is a
public road). Physically a **高札-style board** — the traditional edict-board
shape, wooden, gabled cap, dark frame, cream/beige panel — with a **camera +
smartphone pictogram struck through by a diagonal red/pink bar**. Also deployed
as smaller **stickers** with the same artwork. **[V]**

Upper band:

> `私道での撮影禁止　No photography on private road　私家道路禁止拍照`

Lower band:

> `許可のない撮影は一万円申し受けます　Fine up to ¥10,000 without photo permit`

Note the Japanese uses the **kanji numeral 一万円** while the English uses
**¥10,000** — a nice authenticity detail. April 2024 added passage bans, first
at the two mouths of **小袖小路**: **[V]**

> `ここは私道です。通り抜けできません`
> `罰金1万円`

The multilingual message panel published 2023-12-05 by the same council and
posted in the area, headed 「祇園町南側地区からのメッセージ」, carries the
legally-grounded warnings. Verbatim key lines **[V]**:

```
ここは日常生活の場であり、テーマパークではありません。
歩いている芸妓さんや舞妓さんを止める、触る、つきまとう、無断撮影するといった
行為はしないでください。
⇒　芸妓さんや舞妓さんはマスコットキャラクターではありません。
★　進路に立ちふさがる行為、つきまといは、法律で30日未満の拘留又は
　　１万円未満の科料が、
★　手や服を引っ張る行為は、条例で６月以下の懲役又は50万円以下の罰金が
　　規定されています。
★　無断侵入は、法律で3年以下の懲役又は10万円以下の罰金が
★　ゴミを捨てないでください。★　条例で３万円以下の罰金が規定されています。
```

Signed: 祇園町南側地区住民 一同／祇園甲部お茶屋組合／祇園芸妓組合／建仁寺／
祇園町南側地区協議会.

**Two corrections worth carrying into the build.** First, **there is no Kyoto
City ordinance banning photography**; the ¥10,000 is a charge asserted by the
private landowners' council, publicised with the city and police but without
statutory force. Second, **there is no equivalent Sannenzaka / Ninenzaka
photography sign** — see §7.1.

#### Generic prohibition and utility notices

Mostly **enamelled steel or plastic plates, 0.2 × 0.3 m**, screwed to poles and
walls. **[T except where marked]**

| String | Dir | Colour | Notes |
|---|---|---|---|
| `火の用心` | V | black on cedar, or white on red | Fire-watch board; also on the night patrol's wooden clappers |
| `火気厳禁` | H | white on red | |
| `立入禁止` | H | red on white / white on red | often + `No Entry` |
| `私有地につき立入禁止` | V | black on white/wood, `立入禁止` in red | |
| `関係者以外立入禁止` | H | black on white | |
| `撮影禁止` | H | black + red diagonal on white | with camera pictogram |
| `写真撮影はご遠慮ください` | H | black on white | |
| `三脚使用禁止` | H | black on white | echoes Kiyomizu's board **[V]** |
| `ドローン飛行禁止` | H | black on white | echoes Kiyomizu's board **[V]** |
| `境内は禁煙です` | V | black on white | Kiyomizu, verbatim **[V]** |
| `食べ歩き・立ち食い禁止` | V | black on white | Kiyomizu, paraphrase of its verbatim line **[V]** |
| `ゴミは各自お持ち帰りください` | H | black on white | **[V]** |
| `お静かに` | V | black brush on wood | |
| `一方通行` | H | white on blue, with arrow | road sign 329 |
| `車両通行止` | H | red ring on white | |
| `自転車放置禁止` | H | white on blue | |
| `駐輪禁止` | H | white on blue | |
| `徐行` | H | white on blue | plus white road paint |
| `この先行き止まり` | H | black on yellow | |
| `通り抜けできません` | H | black on white | |
| `トイレ　Restroom` | H | white on dark brown | |
| `AED設置` | H | white on green | |
| `避難場所` | H | white on green | |
| `防火水槽` | H | white on red | fire cistern — numerous here, given the timber density |
| `消火栓` | H | white on red | |
| `消火器` | H | white on red | |
| `京都市消防局` | H | white on red | |

**Colour caveat that matters:** inside the preservation district, even municipal
and shop signage is colour-restricted. **Avoid pure white grounds and saturated
corporate reds**; use muted browns, beiges, blacks and dark greens with
wood-look framing. The city's own beige no-smoking sticker is the proof. **[V]**

### 2.8 御朱印 and お守り stall text

The 授与所 is a deep, open-fronted timber booth, counter at **0.95 m**, back wall
hung with amulets, a rack of price cards. Text is **black brush on cream card**,
vertical, with a red seal. At Kiyomizu the counters are named **お守り授与所** and
**納経所（ご朱印）** and open **around 08:00**, two hours after the gate. **[V]**

**八坂神社 — real, complete, from the shrine's own list. Arabic numerals.** **[V]**

| String | Dir |
|---|---|
| `御本社朱印（手書き）　500円` | V |
| `御本社朱印（用紙）　300円` | V |
| `青龍朱印　500円` | V |
| `御神縁朱印　500円` | V |
| `御朱印帳　紺色　3,000円` | V |
| `御朱印帳　蒔絵　3,800円` | V |
| `御朱印帳　白色・朱色・水色　各2,500円` | V |
| `御朱印帳　桜　1,500円` | V |
| `結守　1,200円` | V |
| `縁守　1,000円` | V |
| `良縁カード守　800円` | V |
| `交通木守　1,000円` | V |
| `交通錦守　1,000円` | V |
| `学業成就守　1,000円` | V |
| `合格守　1,000円` | V |
| `厄除開運守　1,000円` | V |
| `金運守　1,500円` | V |
| `商売繁昌祈祷木札　3,000円` | V |
| `蘇民将来守　1,000円` | V |
| `八角木守　1,500円` | V |
| `美守　1,000円` | V |
| `祇園守　1,000円` | V |
| `干支みくじ　500円` | V |
| `祇園祭絵馬　1,200円` | V |
| `ハート絵馬　1,000円` | V |
| `干支絵馬　1,000円` | V |
| `提灯（大）1,000円　提灯（小）500円` | V — souvenir mini-lanterns |

**清水寺 [V for the counters and the 300/500 split]:** goshuin **300円** written
into your book, **500円** on 曼荼羅用紙; 11 types (it is a 札所 of both
西国三十三所 and 洛陽三十三所観音霊場); books 1,650–8,500円. Three counters:
本堂横 / 阿弥陀堂（不動明王）/ 音羽の滝.

**法観寺 [V]:** one goshuin, **300円**, at the 拝観受付所, 10:00–15:00. 墨書 reads
right `霊応山` / centre `五智如来` / left `法観寺`; seals read
`聖徳太子御建立 日本最初之寶塔` / `霊應山 法観寺` / `京都 八坂塔 東山`.

**Generic counter strings [T]:** `御朱印` · `御朱印帳` · `納経所` · `授与所` ·
`社務所` · `お守り授与所` · `書き置きのみ` · `お守り` · `御守` · `絵馬` ·
`破魔矢` · `福鈴` · `御神酒` · `お焚き上げ` · `古札納所` · `願かけ` ·
`縁結び守` · `交通安全` · `学業成就` · `合格祈願` · `厄除` · `無病息災` ·
`商売繁盛` · `家内安全` · `安産祈願` · `美容守` · `疫病退散` — all V, gold on
coloured brocade for the amulets themselves, black on cream for the price cards.

**おみくじ** — the plain paper fortune is **200円** as a near-universal standard,
but **[?]** none of these sites publishes the figure; Yasaka publishes only
`干支みくじ　500円`.

### 2.9 八坂庚申堂 — its own posted text

The most quotable signage on the route, and all of it verified from the temple.
Prices are in **vertical kanji numerals**, matching its hand-lettered look.
**[V]**

```
くくり猿　一体　五百円
　　　赤　青　黄色
小型くくり猿　　五百円
五連くくり猿（五猿）　二千五百円
```

Other 授与品, same style: `御影 五百円` · `安産御守 五百円` · `厄除け御守 五百円` ·
`開運出世御守 五百円` · `融通御守 五百円` · `頭痛除け すり鉢 五百円（モグサ付）` ·
`三猿 八百円` · `指猿 三百円` · `土鈴 大 八百円・小 三百円` · `顔猿 千五百円` ·
`お供え　三千円以上` · `お供え　一万円以上`. **[V]**

The explanation board, verbatim **[V]**:

```
＝くくり猿は“心”をコントロールするアイテム！＝
お猿さんは庚申さん（本尊 青面金剛）のお使い（仲間）です。
このお猿さんは、くくり猿と呼ばれ、お猿さんが手足をくくられ動けない姿を
表しています。
願いを叶える秘訣は、欲を一つ我慢すること、欲を意欲に変えましょう
心が動いて困ったら、合掌して、庚申さんを念じて真言を唱えてください
おん　でいば　やきしゃ　ばんた　ばんた　かかかか　そわか
```

And the entrance plate, verbatim **[V]**:

```
庚申さんは、いい人が大好きです。だから、いい人にはご利益を与えます。
庚申さんは、悪い人が大嫌いです。だから、悪い人には罰を与えます。
庚申さんの願いは、みんながいい人になることです。
```

Access text the temple uses: 「八坂ノ塔のすぐ下　くくり猿が目印です」／「赤いくくり猿が
吊るされた塔ノ下商店街を登ればスグです。」 — note **塔ノ下商店街**, the little
shopping approach beneath the pagoda, is itself hung with red kukurizaru. **[V]**

### 2.10 手水舎 and 賽銭箱 text

**手水の作法 board.** A small vertical wooden board or laminated panel beside the
basin, headed `手水の作法` or `お清めの作法`, black on wood or white, usually with
four illustrations and an English translation. The four-step text, verbatim from
a Higashiyama shrine **[V]**:

```
1.ひしゃくを片手で持ち、水をすくいます。その水で左手→右手の順にすすいで
　手を清めます。
2.残した水を左手に受けて口にふくんで清めます。（ふくんだ水は溝に流します。）
　その手を清めます。
3.ひしゃくを垂直にたて、残した水をつたわせながら、ひしゃくを清めます。
4.ひしゃくをもとのところに置いてお清め完了です。
```

Yasaka has **two** temizuya, both 重要文化財: **南手水舎** (1887) and **西手水舎**
(1928). **[V]**

**賽銭箱.** Front face carries either the crest (Yasaka: 五瓜に唐花) or the
characters `奉納` / `賽銭箱`, carved and sometimes gilt. A small adjacent plate
reads `お賽銭` or `浄財`. **[T]**

**音羽の瀧 — and an important correction.** The temple's own text: 「こんこんと流れ
出る清水は古来『金色水』『延命水』と呼ばれ、清めの水として尊ばれてきました。3筋に分かれて
落ちる清水を柄杓に汲み、六根清浄、所願成就を祈願します。」 **[V]**

The popular "left = 学業成就, centre = 恋愛成就, right = 延命長寿" scheme is
**folk attribution, not the temple's position** — all three streams are for
六根清浄 and 所願成就, and on-site signage now says as much precisely to stop
queue-jockeying. So a sign at the falls should read `六根清浄` / `所願成就` /
`金色水` / `延命水`, **not** the three-benefit list. The etiquette line — drink
from one stream only, taking all three is 欲が深い — is real and worth a sign.
**[V]**

### 2.11 Infrastructure text

**Utility poles (電柱).** Where they survive (§3.2), each pole carries a stack of
small plates. Very high value per unit of work — three tiny plates and the
street reads as a real Japanese street.

| String | Dir | Colour | Object |
|---|---|---|---|
| `関西電力` | V | white on dark blue | oval/rect utility plate ~0.1 × 0.3 m at ~2.5 m |
| `関西電力送配電` | V | white on dark blue | the post-2020 successor name |
| `NTT西日本` | V | white on green | telecom plate |
| `電柱番号` + a code such as `東山幹　三三` | V | black on white | pole ID plate |
| `危険　高電圧` | V | black on yellow | |
| `登はん禁止` | V | white on red | "no climbing" |
| `広告掲出禁止` | V | black on white | |
| wrap-around ad band (`〜医院` / `〜駐車場` / `〜不動産`) | V | dark on white | Near-universal on Japanese poles, but **heavily restricted in this district** — use only outside the preservation area **[V]** |

**Manhole and drain covers.** Kyoto's standard sewer cover is a **御所車**
(imperial ox-carriage wheel) motif, in use since **1988**, cast with a non-slip
pattern. **0.6 m** diameter, cast iron, rust-brown to near-black; a few
colour-painted showcase covers exist. **[V]**

| String | Dir | Object |
|---|---|---|
| `京都市` | H | main sewer cover, ringing the 御所車 wheel |
| `おすい` / `汚水` | H | foul sewer |
| `うすい` / `雨水` | H | storm drain |
| `下水道` | H | |
| `京都市水道局` | H | water valve cover, ~0.25 m |
| `仕切弁` / `制水弁` | H | valve covers |
| `消火栓` | H | hydrant cover, yellow-painted |
| `関西電力` / `NTT` / `大阪ガス` | H | service lids |

**Vending machines** (placement rules in §3.3). Body text, all **H**:

| String | Colour |
|---|---|
| `あたたかい` | white on red band |
| `つめたい` | white on blue band |
| `ホット` | white on red |
| `つり銭` / `おつり` | black on grey |
| `つり銭切れ` | red on grey |
| `売切` | red on black |
| `準備中` | white on black |
| `返却レバー` | black on grey |
| `１２０円` / `１５０円` / `１６０円` / `１８０円` | white on black price flag |
| `緑茶` | dark green on white |
| `ほうじ茶` | brown on cream |
| `水` | blue on white |
| `コーヒー` | cream on brown |
| `24時間営業` | white on dark |
| `空き缶` | black on grey — the bin beside it |

Use generic product words; **do not reproduce beverage brand marks** (§7.2).

**Gas and electricity meters.** Boxed units on the side wall of every machiya,
**0.25 × 0.3 × 0.15 m**, grey or beige plastic with a clear window: `大阪ガス`
(H, blue on white) and `関西電力` (H, dark blue on white), plus a small `検針票`
paper tag tucked behind. Ubiquitous, almost never modelled, and a strong realism
cue.

**Post boxes.** Standard Japan Post `郵便` red pillar box (0.4 m dia × 1.35 m):
`郵便` · `〒` · `取集時刻` · `京都東山郵便局`, all H, white on vermilion. Kyoto
has installed muted street furniture in the preservation districts, and
**dark-brown post boxes exist in some Kyoto historic locations**, but I could not
confirm one at a specific point on this route — **[?]**; the red box is always
safe.
## 3. Prop census

Dimensions are real-world unless stated. "Density" is a rough count per 100 m of
frontage, for procedural scattering.

### 3.0 The legally binding building spec

Before the props: the 産寧坂 preservation plan (京都市告示第69号, **1976-07-01**)
is a *legal specification* for the buildings, and it is the cheapest possible
source of correct art direction. District is **~65 % traditional buildings** in
**six typologies**: むしこ造り町家 / 本2階建町家 / 変形町家 / 数寄屋風 /
和風邸宅 / 石塀小路町家. Mandated: **[V]**

- Roofs **切妻 or 入母屋, 日本瓦ぶき**; eaves show **垂木 and 野地板**; 庇 with 幕掛け
- Walls **しっくい / 京壁 / 聚楽壁 / 杉板張り / 杉皮張り**
- Columns **檜 (hinoki), 1等上小節材** grade
- **犬走り** (the strip at the wall base) finished in **洗出し砂利仕上げ** —
  washed-out gravel
- Woodwork finish: **べんがら塗り** (bengara red-ochre), **生地仕上げ** (bare) or
  **古色仕上げ** (aged)
- **Glass must be uncoloured**
- The **石塀小路町家** type is *required* to have **すだれ掛け** and to hang sudare

District area was **5.3 ha in 1976**, expanded to **~8.2 ha** when 石塀小路 was
added — **1995 per the city document, 1996 per Wikipedia; conflicting [?]**.

Also protected as environmental objects, verbatim:
「産寧坂並びに二年坂の石段及び石畳、樹木、樹林、庭園樹林、石標、石灯籠、石垣」.

### 3.1 Gion / Hanamikoji

The defining fact about Hanamikoji is that **ochaya do not advertise**. No
product in the window, no menu, often no visible name beyond a fingernail-sized
plate. The street is a wall of dark, beautifully finished, almost blank timber.
Every prop below is therefore load-bearing.

| Prop | Dimensions | Notes | Density |
|---|---|---|---|
| **犬矢来 (inuyarai)** | **H 800 mm, projection 300 mm**, quarter-ellipse, freestanding against the wall **[V]** | Arched split-bamboo skirting protecting plaster from splash, dogs and cats, and marking the property/road boundary. Bamboo grades genuinely used: **炭化煤竹** (carbonised soot bamboo), **図面竹**, **錆竹** (rust bamboo), **晒竹** (bleached). Fixed with **hand-forged iron nails that rust for patina**, or cheaper brass. Fresh bamboo pale green-gold, ageing to `#8A6E4B`. **[V]** ⚠️ Pole diameter, member pitch, curve radius and the シュロ縄 lashing colour are **[?]** — get these from a photo. Note it is **not mandated** by the preservation plan; **犬走り** is. | near-continuous |
| **格子 (koshi) lattice** | bays ~1.8 m; members ~0.03 × 0.05 m at ~0.06 m pitch **[T]** | Ground-floor screen, near-black stained. Profile varies by trade (糸屋格子, 酒屋格子) but one profile will do. | continuous |
| **虫籠窓 (mushiko-mado)** | ~0.9 × 0.5 m, plastered vertical bars **[T]** | Half-storey window on むしこ造り machiya; white/ochre plaster. | 1 per building |
| **すだれ / 簾** | ~1.7 × 1.0 m hanging; rolled to ~0.15 m dia **[T]** | Woven bamboo or reed bound with **麻糸 (hemp thread)**, framed with wide **青竹**. Real types: 座敷簾 / 外掛簾 / 茶席簾 / 御翠簾; grades 上等磨き葭, 青竹の竹ひご, 黄色染め. Mounted with くり穴, 花菱金具, 紐掛け, 蛭環, S金具. Colour `#B99A63` fading to grey. **[V for types/fixings]** | 2–4 per building |
| **Red ochaya lanterns** | see the size table in §3.4 | Pairs under the eave. Lit ~17:00. | 2 per ochaya |
| **表札 nameplates** | ~0.06 × 0.20 m **[T]** | Tiny, at ~1.4 m beside the door. A small brush-written wooden slat, or a narrow black lacquer plate with gold characters. | 1 per house |
| **Potted plants** | pots 0.25–0.4 m Ø | 南天, 万両, small maple, aspidistra, bamboo, ferns; dark glazed or terracotta on a stone or timber stand, in asymmetric groups of 2–5. | 3 per doorway |
| **沓脱石** | ~0.6 × 0.4 × 0.15 m | Stepping-stone at the threshold. | 1 per door |
| **打ち水 wet patch** | ~1.5 m irregular | Morning and evening; darkens the granite. In Higashiyama it is genuinely done **from the cedar-boxed citizen hydrants** (§3.8). **[V]** | frequent |
| **Bicycle** | mamachari, ~1.8 m | Leaned against the wall, basket, plastic cover. Resident's, not tourist's. | 2–4 |
| **Taxi** | see §3.9 | | 1–3 |
| **Delivery van** | kei-truck ~3.4 m, small refrigerated van ~4.4 m | Morning only. Bread crates, sake, laundry, ice. | 0–2 before 10:00 |
| **Private-road signs** | ~0.2 × 0.3 m plate + stickers | §2.7. **On the mouths of the side lanes only** — Hanamikoji itself is a public road. | 1 per lane mouth |
| **Copper street lamps** | — | Hanamikoji's lamps are **copper**, part of the 2001 streetscape scheme. **[V]** | ~20 m spacing |
| **手桶 + broom** | 0.3 m / 1.5 m | By the door. | 1 per few doors |
| **黒塀 black timber fence** | H 1.8–2.0 m | Vertical charred/stained boards with a small tile cap. | frequent |

**The Gion Kobu crest — correction.** It is the **つなぎ団子 (tsunagi-dango)**:
**eight** flat circles joined in a ring, with the character **甲** (for 甲部) at
the centre — the eight circles standing for the eight machi of the district. It
appears on lanterns, roof tiles, noren, paper and staff dress, in white on red
or black on white. Dated **嘉永4年 / 1851** by the Gion merchants' association's
own page; **ja.wikipedia dates the crest to 享保17年 / 1732**, tied to the
licensing of six machi instead. **The eight-dango-plus-甲 geometry is solid; the
date is contested [?]** — and the "eight circles = eight machi" logic only works
with the 1851 story. Two further sources credit the red-ground/white-dot design
to governor 北垣国道 (1881) or to 三代 清水六兵衛. Do not state a date as fact.

**巽橋** in Gion Shinbashi, for the adjoining set: **7.5 × 3.09 m**, steel plate
girder, with a **60 cm nail-free hinoki parapet**. **[V]**

### 3.2 Utility lines and poles — the definitive street-by-street answer

This is one of the biggest single visual decisions in the build, and it is now
settled from Kyoto City's own 無電柱化 planning documents. **[V]**

| Street | Overhead lines? | When undergrounded |
|---|---|---|
| **ねねの道** | **No** | 第3期, **1995–1998** |
| **花見小路通** | **No** | 第4期; completed **2001**, together with the stone paving |
| **産寧坂 / 二年坂 / 一年坂** | **No** | 第5期, **2004–2008** |
| **八坂通** | **Partial** — some done via **軒下配線** (eaves-routing rather than burial); a **460 m segment still outstanding** | partial |
| **清水坂** (officially 清水道／茶わん坂, 400 m) | **YES — still has poles** | target route #6 in the 2019 plan |
| **新橋通 (祇園新橋)** (200 m) | **YES — still has poles** | target route #20 |
| **白川南通** | Effectively pole-free — but by **裏配線**, rerouting the wires to the back street (新橋通), **not** by burial. *This is precisely why Shinbashi still has wires.* | — |
| **石塀小路 / 下河原通** | **[?] no project record found either way** | — |
| **東大路通** | **YES — full overhead**, poles, transformers, signals, bus stops | — |

So the correct picture is: **the postcard streets are clean, and 清水坂 — the
busiest, most touristed street on the route — is not.** That contrast is real,
and worth building rather than smoothing away.

Programme context **[V]**: started FY1986; **~61 km** of city roads
undergrounded by end FY2018 (~104.1 km including national highways) — about **2 %
of Kyoto's ~3,600 km network**. Cost **¥700–900 M per km**. The current plan
targets **34 routes, 15,380 m** over ~10 years. ⚠️ **FY2021–2023 the budget was
suspended for three years** during Kyoto's fiscal crisis, hitting six scenic
routes including 清水通, 八坂通 and 新橋通 — **whether that suspension has since
lifted, and the 2026 status of those routes, is [?]**.

**地上機器 (pad-mounted equipment)** — where the wires go instead. Kyoto City's
plan gives **2200 mm W × 1200 mm D × 900 mm H** above ground on a concrete pit
**~1430 mm deep**; a smaller single unit is **1200 × 500 × 900 mm**. **[V]** The
city does run an official **「地上機器の美装化」** cosmetic-treatment programme
(documented for the Pontocho project) — but **no primary document names a
colour**, so **do not assert こげ茶 [?]**. Screening behind a timber or bamboo
frame is a safe, accurate-in-spirit treatment.

**Poles where they remain [V]:** Kansai standard **11–16 m** (7–17 m nationally
in 1 m increments), base diameter **~30 cm**, about **1/6 of the length buried**,
**~30 m spacing**. Useful detail: **in Kansai Electric territory the *higher*
plate marks the owner** — the opposite convention to TEPCO/Chubu. 共架 marks a
shared attachment.

### 3.3 Vending machines — they are there, and they are beige

**Correction to the working assumption: there ARE vending machines on the famous
slopes.** OpenStreetMap ground-truth: **[V]**

| Location | Drink machines |
|---|---|
| 三年坂 (within 25 m) | **6** |
| 二年坂 | **3** (tagged 伊藤園, KIRIN, サントリー) |
| 石塀小路 | **0** |
| Wider Higashiyama bounding box | 53 |

What *is* controlled is the colour, and the figure is exact. The industry's
自主景観ガイドライン (established Jan 2006 by the four soft-drink vending bodies)
specifies, verbatim: **[V]**

> 基調となる色彩は…「修正マンセル表色系 **5Y7.5／1.5**」またはそれに相当する
> 「日本塗料工業会2009年E版塗料用標準色 **E25-75C**」を原則とします。

That is a **warm pale grey-beige — not brown**. Logos are limited to the
"necessary minimum for identification"; posters and stickers minimal. On top of
that, Kyoto's own 工作物 colour standard for **歴史遺産型美観地区** (the
Higashiyama category) sets: **[V]**

- **基調色**: hues **YR, Y, N** at low chroma and medium value, excluding
  low-value N — i.e. the palette of 木・漆喰・日本瓦・土塗壁
- **禁止色**: R and YR above chroma **6**; Y above **4**; GY/G/BG/B/PB/P/RP above
  **2**. Unpainted natural materials are exempt.

**Real machine dimensions** (Fuji Electric can/PET machines): **H 1830 × W
870–1185 × D 538–741 mm**, capacity 412–714 units. Common models: F20WP5F
(1830 × 870 × 669), F25WP5F (1830 × 1027 × 669), F36WP6F (1830 × 1185 × 741).
**[V]**

**Placement rule for the generator:** a small number of **beige, low-logo**
machines on 二年坂 and 三年坂 — 3 and 6 respectively is the observed truth —
**zero in 石塀小路**, and normal density and full colour on **東大路通**.
Recessing them into a doorway alcove is accurate and looks right.

⚠️ **[?]** The specific "brown Coca-Cola machine in Kyoto" claim is *unverified*;
so is the on-body text inventory in §2.11 (`あたたかい` / `つめたい` / `売切` /
`つり銭` / `返却レバー` etc. are conventional but uncited) and current prices
(¥160–190 for a 500 mL PET).

### 3.4 提灯 sizes — a full verified table

Chochin are sold by 号 with standard dimensions, so there is no need to guess.
Diameter × height in cm, paper (和紙) versions; vinyl runs slightly shorter.
**[V]**

**長型 (elongated, the shop/ochaya form):** 9号 Φ24 × 60 · 12号 Φ32 × 70 ·
15号 Φ43 × 87 · 17号 Φ47 × 99 · 20号 Φ60 × 115 · 25号 Φ75 × 140 · 30号 Φ90 × 155 ·
35号 Φ110 × 170 · 40号 Φ128 × 185

**丸型 (round, the shrine/festival form):** 6号 Φ17 × 30 · 9号 Φ24 × 38 ·
13号 Φ34 × 53 · 15号 Φ43 × 63 · 20号 Φ58–60 × 79–84 · 30号 Φ90 × 113 ·
40号 Φ128 × 165 · 50号 Φ150 × 180

Paper heights include the handle; vinyl heights are frame-to-frame.

**Practical picks:** ochaya eave lanterns → 長型 9–12号. Shrine donor lanterns on
the Yasaka 舞殿 → 丸型 13–15号. Big gate lanterns → 丸型 40–50号.

**のれん sizing:** the classing threshold is **鯨尺三尺 ≈ 113 cm** of drop —
longer is a **長暖簾**, shorter a **半暖簾**. Other real types worth having:
**水引暖簾** (short drop, full shopfront width), **縄暖簾** (rope), 珠暖簾,
管暖簾. **[V]** ⚠️ Standard widths and the 藍/紺/柿渋 colour conventions in §2.1
are traditional-usage knowledge, **not** separately sourced this session.

### 3.5 Temple and shrine furniture

| Prop | Dimensions | Notes |
|---|---|---|
| **賽銭箱** | 1.2–2.4 m wide × ~0.7 m deep × ~0.75 m tall; grille slats ~0.03 m with ~0.02 m gaps **[T]** | Heavy dark timber, iron corner straps, slatted top. Front face carries the crest (Yasaka: 五瓜に唐花) or `奉納` / `賽銭箱`; a small adjacent plate reads `お賽銭` or `浄財`. |
| **本坪鈴 + 鈴緒** | bell ~0.4 m Ø; rope ~0.1 m Ø × 3 m, red/white **[T]** | Above the offertory at the hall front. |
| **鰐口** | 0.4–0.6 m Ø flat bronze gong **[T]** | Temple equivalent, knotted rope. |
| **手水舎** | pavilion ~3 × 3 × 3.5 m; basin ~1.8 × 1.0 × 0.8 m **[T]** | Yasaka has **two**, both 重要文化財: **南手水舎 (1887)** and **西手水舎 (1928)** **[V]**. Bronze dragon spout; **柄杓** of unlacquered wood, handle ~0.4 m, on a bamboo rack. ⚠️ Ladles were widely removed 2020–22 and partially restored — **[?]**, pick one era and be consistent. The 作法 board text is in §2.10. |
| **石灯籠** | 1.5–2.5 m tall, base ~0.6 m Ø **[T]** | Grey granite, heavy lichen and moss in the joints, 3–6 m spacing on approaches; donor names incised on the base. |
| **万灯籠** | — | Yasaka carries **約100灯**, donated mostly by Gion-area businesses, lit at night. A *different object* from the paper 提灯. **[V]** |
| **釣灯籠** | ~0.35 m | Bronze/green-patina, under shrine-hall eaves. |
| **注連縄** | 2–6 m long, 0.15–0.5 m thick **[T]** | Twisted rice-straw with folded white **紙垂** at ~0.3 m intervals. Straw `#B8A272` fresh → `#7A6B4E` aged. |
| **狛犬** | 0.8–1.2 m on a ~1.0 m plinth **[T]** | Paired granite guardians, one 阿 (open) one 吽 (closed), weathered and lichened. |
| **仁王** | ~3.5 m **[T]** | In Kiyomizu's 仁王門, behind wire mesh; coins and paper pellets stuck to the mesh. |
| **絵馬 + racks** | plaque ~0.15 × 0.09 × 0.01 m; rack ~3 × 1.8 m **[T]** | Dense overlapping rows on an A-frame. Reads as a pale wooden shingle mass at distance, ink texture close up. **Clacks in wind.** Yasaka's real types and prices are in §2.8. **八坂庚申堂 has essentially no ema — the くくり猿 is its wish-vehicle. Do not put ema racks at Koshin-do.** **[V]** |
| **おみくじ cabinet + cylinder** | cabinet ~0.6 × 0.4 × 1.0 m; hexagonal tin ~0.15 × 0.35 m **[T]** | Shake the numbered stick out, take the paper from the matching drawer; drawers labelled `一`…`百`. |
| **おみくじ結び所** | frame ~4 × 1.2 m **[T]** | Where bad fortunes are tied off — an unmistakable **dense white ruffle** of knotted paper. Extremely cheap, instantly recognisable. |
| **常香炉** | bowl ~1.2 m Ø on a ~1.0 m stand **[T]** | Kiyomizu. Sand bed, lit incense bundles, continuous smoke column, people wafting smoke onto themselves. |
| **玉垣** | posts ~0.15 × 0.15 × 1.2 m at ~0.6 m centres **[T]** | Rows of inscribed granite donor posts. |
| **石鳥居** | Yasaka's, 1646, 明神鳥居 type, on 下河原通 **[V]** | **Stone, not vermilion.** |
| **梵鐘 + 鐘楼** | bell ~2 m; tower ~5 × 5 × 7 m **[T]** | Kiyomizu; the 撞木 beam hangs on ropes. |
| **舞殿** | ~10 × 10 m open pavilion **[T]** | Yasaka's centre; the ~260–280 lantern grid (§2.5b). Burnt 1866, rebuilt 1874, 重要文化財 **[V]**. |
| **石段** | riser 0.13–0.16 m, tread 0.35–0.45 m **[T]** | Worn and dished in the middle. |

### 3.6 八坂庚申堂 — the kukurizaru

Formally **大黒山 金剛寺 庚申堂**, Tendai, founded **天徳4年 / 960**; the **本堂
was rebuilt 延宝6年 / 1678**. One of Japan's three great Koshin-do. 東山区金園町390,
**9:00–17:00, free**. Just below the pagoda on 八坂通. **[V]**

From the temple itself: **[V]**

- **くくり猿 一体 五百円**; **小型 五百円**; **五連くくり猿（五猿）二千五百円**.
- The official page names only **赤・青・黄色**, but the ones actually hanging
  clearly include pink, orange, green, purple, light blue and white — **build
  from many colours, quote the three-colour price line as written**.
- Each is **handmade one at a time**, with an **ofuda of the honzon 青面金剛
  sealed inside the body**, then consecrated (開眼の秘法). It is officially a
  **御守, not a souvenir** — 「単なる土産物では無く、庚申尊の御分霊の入った『御守』です」.
  Returned ones are deconsecrated (撥遣) and ritually burned (お焚きあげ).
- Meaning: a monkey with its limbs bound = restraining the desiring mind.
  「願いを叶える秘訣は、欲を一つ我慢すること」.
- Visitors write **願い事 + 日付 + 氏名** on the cloth body in marker.
- They hang at the **賓頭盧堂 (Binzuru-do)**: 「様々な色をした『くくり猿』が
  たくさん吊るされている」. Also strung across the 本堂 eaves, the gate, the
  railings, and along the **塔ノ下商店街** approach beneath the pagoda, which is
  itself hung with red ones.
- Also present: **三猿** stone/ceramic figures, a **賓頭盧** figure, small
  vermilion-and-white structures, monkey-shaped ema, a small 手水鉢, hanging 提灯,
  and a dense crowd of rental-kimono visitors.

⚠️ **[?] Not verified:** ball diameter in cm (roughly 5–7 cm is the working
figure), the total number hanging, the full colour set, and the exact stringing
method — jalan notes that each cloth pattern and cord differs. Get these from a
photograph.

This is the **only place on the route where full chroma is correct** (§4.1).

### 3.7 Shop clutter

Where a procedural street wins or loses. A machiya facade with nothing in front
of it looks like a museum; the real streets are crowded to about **1.2 m out from
the shop line** with product and furniture.

| Prop | Dimensions | Where |
|---|---|---|
| **Tiered ceramics display (雛壇)** | ~1.2 m W × 0.6 m D × 1.1 m H, 3–4 stepped shelves **[T]** | 清水焼 shops on 清水坂 and 茶わん坂 — 松韻堂 on 産寧坂 is documented as having them out front **[V]**. Dark cloth over the steps, tea bowls, sake cups, small plates and chopstick rests each on a tiny stand or in a box lid, price cards on card holders. Blue-and-white 染付, celadon, crackle-white, red-and-gold 京焼. |
| **Yatsuhashi sample tray (試食皿)** | tray ~0.35 × 0.25 m on a ~0.9 m stand **[T]** | **Real and defining** — documented at 本家西尾八ッ橋 (all three shops, 「試食し放題」, tea poured into a 湯呑 at the entrance), 元祖 西尾為忠商店 (samples of your exact order handed over while you wait) and 岩月堂 清水店/南店 **[V]**. Trays hold pale pink, green, brown, white and purple triangles; a stack of cellophaned 5-packs beside. **Cluster these on 清水坂 and 産寧坂 — none on 二年坂.** |
| **Hand-folding counter** | counter ~2.0 × 0.7 m + a せいろ steamer stack **[V]** | 元祖 西尾為忠商店 folds anko yatsuhashi **to order, in view of the street**, and its yatsuhashi are **square, not triangular**. Steam, a stack of bamboo steamers, and a working pair of hands are all visible from the paving. |
| **Chilled tasting counter** | ~1.5 × 0.6 × 1.0 m **[V]** | What pickle shops here *actually* front with: refrigerated glass cases, tasting dishes with toothpicks, free green tea. 川勝總本家 puts **lemon-cucumbers on sticks in a chilled counter at the street edge**; やました does **whole chilled cucumbers on sticks**; 岩月堂北店 has a **しそバニラソフト display panel**. |
| **Pickle barrels (漬物樽)** | 0.5 m Ø × 0.6 m cedar barrel with bamboo hoops **[T]** | ⚠️ **Correction: decorative barrels are NOT out on the pavement on these three streets.** Every barrel reference traces to 錦市場 or Doi's Ohara brewery. Use them as **interior** dressing or on other streets — not as documented street furniture here. |
| **Candy-jar wall** | shelving ~2.0 m W × 1.8 m H **[V]** | まるん (both shops) front with an open wall of glass jars and small bottles of multicoloured candy on tiered wooden shelving — a block of pure colour against dark timber. |
| **Chilli display** | ~2 m of frontage **[V]** | おちゃのこさいさい shows **~1,800 dried chillies at the entrance**, with woven baskets and copper accents. |
| **Gourds on red cords** | gourds 0.1–0.4 m, hung in a window **[V]** | 瓢箪屋, at the top of the Sannenzaka steps: 1,100–1,500+ hanging 千成瓢箪, some gold-leafed. |
| **Grilling counter** | ~1.2 × 0.6 m with a charcoal bed **[V]** | 藤菜美 grills dango in view of the street; 十文堂 does aburi-dango; 寺子屋本舗 grills senbei. Smoke, tongs, a soy glaze pot, skewers stood in a jar. |
| **Choux/baking counter** | ~2 m **[V]** | 京あみ bakes at the front — **steam and cinnamon are part of the frontage**. |
| **食品サンプル case** | ~0.6 × 0.4 × 0.8 m, lit **[V]** | 梅園 has replicas in a case **outside the door**. |
| **記名表 sign-up board** | ~0.5 × 0.7 m on a stand **[V]** | 阿古屋茶屋 sets one out on the step from 10:00; the queue forms on the stone steps from ~09:45. A very characteristic and rarely-modelled Japanese prop. |
| **A-board / 立て看板** | ~0.55 × 0.9 m hinged **[T]** | Kept **within the shop's own frontage line** — the district's rules and etiquette are strict. Ordinance limit on standing signs is **2 m** (§4.1). |
| **立て札** | ~0.3 × 1.2 m post-mounted board **[V]** | かさぎ屋's reads `甘党の素通り出来ぬ二寧坂`. |
| **Menu rack (短冊掛け)** | ~0.6 × 1.2 m timber frame **[T]** | 8–20 of the §2.3 strips on hooks. |
| **縁台 / 床几 + 緋毛氈** | bench ~1.5 × 0.45 × 0.4 m; **緋毛氈 standardised to 畳大**, one tatami footprint **[V]** | Real teahouse frontage: 「店先では、縁台に緋毛氈や赤い布を掛け、赤い野点傘を差してある事も多い」. Benches in **杉 or 檜**. Machiya also have **ばったり床几** — the folding 見世棚 merchandise shelf that drops down from the facade. ⚠️ exact bench dimensions **[?]**. |
| **番傘 / 野点傘** | ~1.8 m Ø **[V]** | Red paper parasol beside the bench. 文の助茶屋 has them in its courtyard. |
| **Fan display** | wall rack ~1.2 × 1.5 m **[V]** | Opened fans in a fanned grid — 錦扇 is described as 「色とりどりの京扇子が並ぶ華やかな店内」. Reads brilliantly at distance. |
| **Incense frontage** | — | Long shallow glass-topped drawers, cones and coils on lacquer trays, a lit stick by the door with visible smoke. 山口屋's scent is documented as reaching the street. |
| **Umbrella stand / crates / buckets / brooms** | 0.35 Ø × 0.5 m / 0.4 × 0.3 × 0.25 m / 0.3 m / 1.5 m **[T]** | Standard clutter at the door edge and side entrance. |
| **Rental-kimono rack** | ~2.0 × 0.6 × 1.7 m **[T]** | Just inside the door; a genuine and very common modern business here. |
| **Takeaway window** | ~0.9 × 0.9 m opening at 1.1 m **[V]** | 京ばあむ, SNOOPY Chocolat, 藤菜美, Candy apple — the 食べ歩き counter is a distinct, common frontage element. |

### 3.8 Fire infrastructure — the best Kyoto-specific prop nobody models

Under the **「文化財とその周辺を守る防災水利整備事業」** (running since 2006),
across the 産寧坂 preservation district plus 高台寺南門通, 一念坂 and 二寧坂:
**[V]**

- **41 市民用消火栓** — *citizen* hydrants, at ground level, with **30 m hoses**
- **Their boxes are made of cedar**, verbatim: 「外観（BOX）：景観への配慮から杉を採用」
  — **this is the distinctive prop.** A cedar box on the street, roughly waist
  height, at intervals through the district.
- **19 消防隊用消火栓** (underground, for the brigade)
- **2 × 1,500 m³ earthquake-resistant 防火水槽**, one at **高台寺公園**, one **in
  清水寺境内**
- **2,060 m of 200 mm polyethylene main** feeding the district
- The citizen hydrants are **also used for 打ち水** and are described as 地域に
  根付いたもの. On **2024-01-02 a shop fire on 二年坂** was knocked down by
  residents using them before the brigade got water on it.

**放水銃** (water cannon for cultural properties) come in three housings —
**桃割型** (ground-level, manual or auto-oscillating), **地下式** (underground)
and **ポール型自動首振式**; form and colour must harmonise with the landscape and
underground siting is preferred where an above-ground unit would harm the view.
⚠️ **[?] No 放水銃 is mentioned in the Kyoto 産寧坂 document** — I could not
verify any at Sannenzaka specifically.

Also in the district (OSM census of the Higashiyama box): **31 hydrants** (18
wall-type, 6 underground, 3 pillar — 2 tagged green), **16 waste baskets**, **15
street lamps**, **3 post boxes**. **[V]**

### 3.9 Street surfaces — and the single best fact in this document

**The stone under your feet is reused Kyoto tram ballast.** Keihan, verbatim:
**[V]**

> 哲学の道（左京区）、**二年坂、産寧坂、石塀小路**（東山区）などの石畳は、
> **京都市電で敷石として使われていた御影石**を移設したものです

So: **御影石 (granite) setts relocated from the Kyoto city tram bed.** The tram
was abolished **1978-09-30**, so the relocation is post-1978. That means the
stones are **worn on one face from decades of tram traffic before they ever got
here** — irregular, rounded, mismatched in size, with old bedding marks. Model
them that way, not as a fresh quarried pavement.

OSM ground-truth: **[V]**

| Street | highway | surface | width |
|---|---|---|---|
| 三年坂 | **steps** | paving_stones | **4 m** |
| 二年坂 | **steps** | paving_stones | **4 m** |
| 清水坂 | pedestrian | paving_stones | — |
| 石塀小路 | footway | **sett** (small cobbles) | — |
| 花見小路 | residential | paving_stones | — |
| 西花見小路 | pedestrian | paving_stones | — |
| 花見小路通 | tertiary | paved | — |

**産寧坂 dimensions ⚠️ [?] single tourist source:** total length **380 m**,
stone-step section **~100 m containing 46 steps**, height difference **28 m**.
The 46-step count could not be corroborated — treat as indicative.

**花見小路:** ~**1 km**, Sanjo-dori to Yasui-Kitamon-dori. Stone paving and
undergrounding **completed 2001**; cost cited as ~¥600 M **[? blog source]**.
Reverted to temporary asphalt during water-main works around 2021, stone restored
afterwards — a nice detail if you want a works scene.

**ねねの道:** undergrounded 1995–98, **full-width 御影石 paving** **[V]**;
⚠️ paving date and stone spec not separately verified **[?]**.

### 3.10 人力車 (rickshaw)

えびす屋 operates a 京都東山店. Boarding points are **高台寺公園** and **平安神宮
應天門前**; from **10:00**, year-round; the routes run over **ねねの道** (the
「ねねの道さんぽ」 course), 八坂通 past the pagoda, the foot of 二寧坂, 下河原通
and around Gion. **[V]**

**Verified 2025/26 prices** (2 pax / 1 pax): **[V]**

| String | |
|---|---|
| `12分コース　5,000円 / 4,000円` | |
| `30分コース　10,000円 / 9,000円` | includes 「ねねの道さんぽ」 |
| `60分コース　20,000円 / 16,000円` | 祇園エリア満喫プラン |
| `90分コース　29,000円 / 23,500円` | |
| `120分コース　38,000円 / 31,000円` | |

Capacity **max 2 adults + 2 infants**, up to 2 small pets, one carry-on or
stroller. In rain a **幌 (hood) plus 雨避け** is fitted. Registered as a **軽車両**.

**Physical.** Black lacquered body; **overall ~235 cm long × 130 cm wide × 200 cm
tall**, **wheels ⌀ ~100 cm**; new units from 三清物産 list at **¥1,720,000**;
the largest maker is **升屋製作所** (Ito, Shizuoka). **[V, though see the
conflict below]** A separate spec for a one-person *rental/event* rickshaw (not
confirmed as Ebisuya's) gives **W 1000 × D 2200 × H 2100 mm with the hood up**,
seat inner **W 500 × D 350 mm**, step **480 × 400 × 320 mm**. The two sets
disagree on width; **[?] resolve from a photo against a known human height.**

**俥夫 dress, verified:** 「車夫の服装は、**腹掛けに股引き法被**というのが多い」 —
a **腹掛け** bib-apron, **股引き** fitted leggings, and a **法被** coat, with the
company name on the back. **[V]** ⚠️ **[?] Not verified:** the red 膝掛け blanket,
地下足袋, shaft length, lacquer finish and weight. These are the gaps I would flag
hardest before modelling.

### 3.11 Street furniture, traffic and taxis

**Post boxes.** Standard Japan Post sizes: **1号丸型 H 1350 × W 400 × D 400 mm,
朱色**; **13号 H 830 × W 810 × D 560 mm**; **14号 H 520 × W 350 × D 400 mm** (red
body, silver upper panel, black foot column). **[V]** Landscape-coloured boxes do
exist elsewhere (Kanazawa grey/dark green, Yokohama navy) and there is no legal
requirement that a box be red. ⚠️ **A brown Kyoto post box is UNVERIFIED [?]** —
the OSM post box on Kiyomizu-zaka carries no colour tag. **Use red.**

**Manhole covers.** Kyoto City's design is the **御所車** — the Heian ox-cart
wheel — with the **first-generation city seal** at the centre (the current
second-generation seal incorporates the goshoguruma pattern itself, making it too
fine to cast). Plain JIS-pattern covers also occur, as do mascot design covers.
**[V]** ⚠️ **[?] Diameter (600 mm JIS is general knowledge) and the cast text
(汚水 / 雨水 etc.) were not verified.**

**Curve mirrors.** Round **φ600 / φ800 / φ1000 mm**; rectangular **450 × 600** and
**600 × 800 mm**. Poles STK400 steel: **φ76.3 × 3.2 × 3600**, **φ76.3 × 3.2 ×
4000**, **φ89.1 × 3.2 × 4400**, **φ101.6 × 4.2 × 4800 mm**. Mirror lower edge
**2.5 m standard, reducible to ~1.8 m**. **[V]** ⚠️ **[?] Brown Kyoto poles
unverified.**

**Bollards.** Spacing **≥1.0 m** where pedestrians and wheelchairs pass;
**≤1.5 m** for vehicle blocking. Stone is among the standard materials. **[V]**
⚠️ **[?] Higashiyama-specific material, height and diameter unverified.**

**Traffic. [V]**

- **二年坂 and 三年坂 are tagged `highway=steps`** — physically no vehicle
  access at all. Deliveries are by hand and hand-cart.
- **清水坂 is `pedestrian`.**
- **花見小路 is NOT uniformly pedestrianised** — OSM tags 花見小路 `residential`,
  西花見小路 `pedestrian`, 花見小路通 `tertiary`. ⚠️ **[?] I could not verify a
  time-restricted 歩行者専用 regulation, and delivery-van hours are unverified.**
  The well-documented Gion restriction is **private-road** based, not a public
  pedestrian zone. The council's own framing, verbatim: 「別に観光客のことを考えて
  やるわけではないので、住民の人たちが困っていることを対処しようというのが一番」.

**Taxis. [V]**

- **ヤサカ (Yasaka):** ~**1,300 vehicles** across seven companies in Kyoto/Shiga.
  Livery is **maroon (えんじ) and white two-tone** for the Comfort and the JPN
  Taxi, and **black** for the Crown Sedan. The **三つ葉 clover mark appears on the
  andon (roof light) and on the body** — verbatim: 「行灯とボディにクローバーの
  マークを付ける（黒色車は行灯のマークのみ）」. **四つ葉タクシー: exactly four
  vehicles** in the fleet (~1 in 325); riders get a commemorative card and a small
  four-leaf sticker; cannot be reserved, street-hail only.
- **MK:** historically black premium sedans; the modern fleet is diverse,
  including white and silver EVs. Marks front and rear.
- ⚠️ **[?] "JPN Taxi 深藍 deep indigo" — not verified.** Use the maroon/white
  Yasaka livery as the Kyoto signature; substitute a generic clover-like mark
  rather than the exact company logo (§7.2).
- **Buses** run on 東大路通 only — Kyoto City Bus green-and-cream; the 清水道 and
  五条坂 stops are the major crowd sources at the bottom of the hill.

### 3.12 Vegetation

- **Planters** at doorways: 南天 nandina, 葉蘭 aspidistra, dwarf maple, bamboo,
  ferns, seasonal chrysanthemum, in dark glazed pots.
- **Moss** in every stone joint on the shaded side, at wall bases, and on the
  north face of every stone lantern. `#4E6B3C` to `#6B7A4A`, black in the deep
  joints. **Applying moss only to shaded/north faces is a cheap, large realism
  win.**
- **Small gardens** glimpsed through gates on 石塀小路 and behind 高台寺: raked
  gravel, a 蹲踞 basin, a maple, clipped azalea. Documented private gardens on
  the route include 奥丹's stream-fed garden, 文の助茶屋's courtyard,
  Peter Rabbit's rear courtyard, どんぐり共和国's back garden, and the coffee
  house's three courts (front 坪庭 with scale-pattern tile, middle court, rear
  枯山水).
- **Trees:** maple on ねねの道 and in the Kiyomizu valley, a landmark weeping
  cherry on 二年坂, pine in the shrine precincts, bamboo behind 高台寺.
- **Roof vegetation:** ferns and grass tufts in the tile valleys of older
  buildings; 鬼瓦 end tiles.
## 4. Colour direction

### 4.1 Kyoto's ordinance has already art-directed this district for you

This is the most important section in the document for the look of the build.
Under the **新景観政策**, in force from **September 2007**, plus the
**京都市屋外広告物条例**, the city is divided into **21 advertising areas** and
the following apply — with the historic Higashiyama districts under the
strictest tier. All figures below are from the city's own standards documents.
**[V]**

**City-wide, absolute bans:**

- **屋上屋外広告物 — rooftop signage is banned outright, everywhere in the city.**
  There is not one rooftop box sign on this route. The skyline above the eaves is
  *empty*: tile, sky, and (on 清水坂 and 新橋通 only) wires.
- **点滅式・可動式照明 — flashing and moving illumination banned outright**,
  except emergency, warning and traffic signals. No animated LED, no chasers, no
  scrolling text.
- The ordinance came **fully into force September 2014 (平成26年9月)** after a
  seven-year grace period.

**禁止色 (prohibited colours)** — applies in 第1種地域, 歴史遺産型第1種地域 and
歴史遺産型第2種地域. Verbatim:

> 色相が **Y 又は YR** である色 … **10** / 色相が **R, GY, G, BG, B, PB, P 又は
> RP** である色 … **8**

i.e. **chroma exceeding 10 for yellow and yellow-red hues, and exceeding 8 for
everything else, is banned.**

**規制対象色 (restricted-colour share)** in the same zones: thresholds are R
**>6**, YR **>6**, Y **>4**, others **>2**; such colours may cover **<20 %** of
the sign face (30 % in 第4/5種, 50 % in 第6/7種). Text and symbols in prohibited
colours: **<30 %**, and in 歴史遺産型 additionally **≤1 m² per elevation**.

Two exemptions that matter enormously for a Japanese street:

- **Uncoloured wood or stone is exempt** — 「着色されていない木又は石の色は…
  禁止色とはみなしません」. This is why the district is made of bare timber and
  granite: the material *is* the compliance strategy.
- **和風 noren harmonising with a traditional building is allowed.** Which is why
  fabric carries almost all the colour on these streets.

Discouraged: high-chroma complementary pairs (red+blue, red+green, red+yellow,
yellow+blue, yellow+green) and black with high-chroma yellow or red.

**歴史遺産型第1種地域 — dimensional limits** (i.e. the actual size of every sign
you place on 二年坂 / 産寧坂):

| Limit | Value |
|---|---|
| Total sign area per elevation | **≤3 m²** |
| Display ratio | **≤10/100** of the elevation |
| Projecting signs | ≤3 m² both faces, **projection ≤1 m**, road clearance **≥2.5 m** |
| Standing signs (A-boards etc.) | **≤2 m** tall |
| のぼり flags | **≤2 m** |
| 広告塔 | **≤3 m** |
| 幕 (banners) | **≤3 m** |
| Illumination | **white or one pale colour**, fixtures hidden from public space |
| Permitted types | 自家用/管理用 only, or guide signs ≤1 m². **No rooftop. No variable-display (digital) signage.** |
| Small-sign exemption | top **≤4 m** and total regulated area **≤0.5 m²** per elevation |

**歴史遺産型 districts** include **祇園町南, 祇園縄手・新門前, 先斗町**. **産寧坂
itself is governed by the stronger national 重要伝統的建造物群保存地区
designation** and its preservation plan (§3.0), which is a building code, not a
sign code.

**Zone family names**, useful if you want authentic signage on the boundary
streets: 美観地区 comes in 山ろく型, 山並み背景型, 岸辺型, 旧市街地型 and
**歴史遺産型**, plus 美観形成地区 (市街地型 / 沿道型).

**The visible result — chains forced to change.** ⚠️ **These are journalistic
sources; treat as descriptive, not documentary [?]** — except the 7-Eleven brown
compliance stores, which ja.wikipedia does document as existing 京都市内.

| Chain | Elsewhere | In Kyoto |
|---|---|---|
| McDonald's | red field, yellow M | **tan/beige ground**, keeping the yellow mark |
| 7-Eleven | orange/green/red | **brown and white** — documented 景観条例準拠店舗 |
| FamilyMart | green/blue stripes | **70–90 % white** |
| Lawson | blue band | white-based or black-based |
| Uniqlo | red box | **white border around the red logo** |
| Sukiya | orange | brown to ochre |
| Matsumoto Kiyoshi | yellow | grey |
| au | orange | white on muted |
| Times | yellow/blue | white/black |
| The Ninenzaka coffee house | green disc | **wood-grain muted signage**, a 暖簾 at the door, no illuminated fascia |

**KFC, Don Quijote and Yoshinoya: not verified.** ⚠️ **Enforcement statistics
(compliance rates, removal counts, fines) could not be verified [?]**; what is
verified is that FY2025 carried ≈**5,185 long-term outdoor-advertising permits**
and the city expanded enforcement staffing from FY2012.

**Vending machines** get the same treatment — see §3.3 for the exact Munsell
figure (**5Y 7.5/1.5**, equivalently 日本塗料工業会 **E25-75C**).

### 4.2 The practical rule for the renderer

**Clamp every man-made saturation on this route.** A workable rule is
**HSV S ≤ 0.35 for anything built after 1900**, with a small set of licensed
exceptions that then carry the entire chromatic load of the scene:

1. **朱色 / 丹 (vermilion)** — shrine and temple structures only: Yasaka's west
   and south gates, Kiyomizu's 仁王門 and 三重塔. ~`#C8462E`–`#B7472A`, chalky and
   weathered. Note the Yasaka approach torii on 下河原通 is **stone**.
2. **Lantern red** — Gion ochaya lanterns and shop chochin. Warmer and lighter
   than vermilion; ~`#D9483B` unlit, glowing to ~`#F0A070` at the paper when lit.
3. **紅殻 bengara** — the 一力亭 walls, ~`#8E4B37`, and the 「べんがら塗り」
   woodwork finish that the preservation plan explicitly permits.
4. **The kukurizaru at 八坂庚申堂** — a deliberate, tiny, fully-saturated confetti
   burst. **The only place on the route where full chroma is correct.**
5. **Fabric** — noren, 緋毛氈 bench cloths, 番傘 parasols, のぼり banners. The
   ordinance's own exemption for 和風 noren means these are legitimately the most
   colourful surfaces on the street.
6. **Documented outliers.** Three real shops deliberately break the palette and
   should be built as breaks: the **vivid orange** 本家西尾八ッ橋 清水坂店, the
   **candy-jar walls** at まるん, and **SOU・SOU's flat-colour numeral graphic**.
   Plus the **white cube** of the coffee flagship on the pagoda axis and the
   **white-based** 京ばあむ frontage — bright, but achromatic.

Everything else, including rental kimono (which are genuinely bright), is either
muted or is a *moving figure* rather than architecture.

### 4.3 Palette by street

**花見小路 / Gion at dusk.** The narrowest range on the route and the most
distinctive. Facades in **紅殻 bengara** `#6B3A2E`–`#7A4536` over near-black
stained posts `#241C18`; plaster in **聚楽 juraku** ochre-grey `#9C8A70`; roof
tile blue-black `#3A3E42`. Ground is grey granite sett `#7C7A75`, wet-darkening
to `#4E4C49`. The street is essentially **monochrome brown-to-black**, punctuated
by red lanterns, warm ~2400 K light leaking through すだれ and shoji as pale amber
`#E8C489`, the copper street lamps, and the white of a plastered wall. At dusk
the sky drops to `#2A3348` and the lantern reds are the only chroma in frame.
**Zero blue-white LED. Zero backlit plastic. Clean sky — no wires.**

**ねねの道 at midday.** Wider, brighter, greener. Kodai-ji's earthen wall on the
east is ochre `#B09A78` capped with grey tile; the west side is shop machiya.
Full-width **御影石 paving** reads pale warm grey `#8E8B84`. Substantial **moss**
`#4E6B3C` at wall bases, and **maple** — `#7FA84A` in summer, and in late
November a genuinely saturated `#C0392B`–`#E2542F` that is the one time of year
the street is chromatic. Rickshaws crossing add the black-and-red accent.

**二寧坂 at midday.** The signature. Two-storey machiya both sides, timber
`#5C4433`, plaster `#D6CBB4`, tile `#41454A`. This is a sweets-and-crafts street,
so the licensed colour lives in **fabric and product**: noren in indigo `#243B58`,
madder `#9E3B32`, persimmon `#C46A32`, cream `#E8DEC6`; the candy-jar wall; the
lit rows of candy apples opposite the coffee house. Overhead: sky, tile, **no
wires**. Behind you, the pagoda.

**産寧坂.** As Ninenzaka but tighter and steeper, so the frame fills with **stone
steps and crowd** — lower half granite, upper half eaves, very little sky. The
one street where the ceramics tiers and the chilli display and the gourds all
land within a hundred metres of each other.

**清水坂 at midday.** The loudest street: continuous open-fronted shops both
sides, so you see *into* interiors and the palette gets busy with product rather
than architecture — ceramics, fans, textiles, food samples, soft-serve panels,
the deep-fryer stall, the orange facade. **And it still has overhead wires and
poles** (§3.2), which is the honest difference between it and the postcard
streets. Awnings appear here in a way they do not on Ninenzaka: canvas `#8C6B4A`,
deep green `#3F5340`, maroon `#5E2E30`.

**清水寺 terrace.** Vermilion gates against **unpainted, silvered hinoki**
`#8A7F6E` on the 本堂 stage, dark cypress-bark roofs `#4A4038`, and the mass of
maple in the valley below.

### 4.4 Time of day

- **Early morning (06:00–08:00).** Kiyomizu's gate opens at **06:00** but its
  amulet and goshuin counters do not open until about **08:00** — so the temple
  is open and the stalls are shuttered. On the streets: shutters down, plain
  timber boards, **no noren out**. Sun low from the east over the hill means the
  *street is in shadow while the eaves catch light*. Wet stone from 打ち水.
- **Midday.** Flat, hot, crowded. Highest chroma from rental kimono. Queues at
  阿古屋茶屋 (from ~09:45), the candy-apple shop, 京ばあむ.
- **Dusk in Gion (17:30–19:00).** Lanterns on. The money shot.
- **Night.** Under the ordinance there is very little illumination — the district
  goes genuinely dark, lit by low eave lights, bollards and lanterns, plus the
  ~280 lit lanterns on the Yasaka dance stage and its ~100 万灯籠. **Do not light
  this like a modern Japanese shopping street.** Seasonal exception: Kodai-ji's
  夜間特別拝観 (17:00 lighting to 22:00) and Kiyomizu's three annual night
  openings to 21:30.
## 5. Motion and sound inventory

Grouped by how you would implement it: continuous ambience, looping local
emitters, and discrete events.

### 5.1 What moves

| Prop | Motion | Amplitude / period | Notes |
|---|---|---|---|
| **暖簾 (noren)** | soft cloth sway, bottom edge only | ±3–6 cm, ~1.5–3 s | The signature motion of the whole route. Panels are split, so they part and re-close as people pass. Hem is unweighted; top is fixed to a bar. |
| **提灯 (chochin)** | pendulum + slow yaw | ±2–4°, ~2.5 s | Hung from a cord; Gion's ochaya lanterns barely move (sheltered under eaves); shop lanterns on poles move more. |
| **のぼり / 幟 banners** | full-length ripple | large | Used at shrine approaches, not in the machiya streets. |
| **すだれ / 簾 (sudare)** | slat clatter, small | ±1–2 cm | Summer only; rolled and tied in winter. |
| **風鈴 (furin)** | clapper swing + paper 短冊 flutter | fast, small | Summer only (roughly Jun–Sep). Glass or iron; the paper strip below is what you actually see moving. |
| **Bamboo (竹)** | whole-culm bend + leaf shimmer | slow bend, fast leaf | In the small gardens off Ishibe-koji and behind Kodai-ji, and 犬矢来 do **not** move. |
| **Maple / cherry** | leaf shimmer; petal fall in April | — | Ninenzaka's weeping cherry is a landmark. |
| **手水舎 water** | continuous thin stream into stone basin | — | Note: many basins were dry-covered or converted after 2020; some have returned. **[?]** |
| **音羽の滝** | three parallel falling streams, ~4 m drop | — | Continuous; the loudest single sound at Kiyomizu. |
| **人力車 (rickshaw)** | rolling, big wheel, bobbing shafts | walking pace ~5 km/h | See §3.7. Operates on ねねの道, 二寧坂 foot, 八坂通, and around Hanamikoji. |
| **Bicycles** | residents and delivery, slow, weaving | — | Common on Hanamikoji and the flat streets; rare on the stepped ones. |
| **Delivery vans / light trucks** | early morning only | — | Kei-trucks and small refrigerated vans, typically before 10:00. |
| **Taxis** | Gion and the flat streets only | — | See §3.8. |
| **Crowd** | dense, slow, stop-start; pooling at photo spots | — | The single largest moving mass. Concentrates at the Sannenzaka steps, the pagoda view on 八坂通, and the Kiyomizu veranda. |
| **Shutters** | roll up at open / down at close | discrete | Strong day-cycle cue. |
| **Steam** | from 蒸し器 at dango and manju stalls | continuous wisp | Cheap, very readable, very Kyoto. |
| **Incense smoke** | 常香炉 at Kiyomizu | continuous column | Also from the incense shops' doorways. |
| **Cats** | on walls in Ishibe-koji | occasional | **[T]** |

### 5.2 What you hear

**Continuous bed, by street:**

- **花見小路** — the quietest commercial street on the route. Footsteps on
  granite, low conversation, a shamisen or a taiko drum-and-flute figure leaking
  faintly from an ochaya in the evening, taxi tyres on stone, the *clack* of
  geta. No music, no PA, no traffic roar. The silence is the point.
- **ねねの道** — footsteps, rickshaw wheels on stone (a distinctive hard rumble),
  the puller's amplified-by-lungs commentary, birds, wind in the maples.
- **二寧坂 / 産寧坂** — mid-density crowd murmur, shop staff calling
  `いらっしゃいませ`, camera shutters, suitcase wheels on stone steps (a very
  characteristic and slightly comic sound), children.
- **清水坂** — the loudest. Dense crowd, multilingual, shop callers, soft-serve
  machines, the low hum of refrigerated cases, coach engines at the top turnaround.
- **清水寺 境内** — crowd, water, the 錫杖 and coin sounds, and the periodic
  bell.

**Discrete events worth authoring:**

| Sound | Source | Cadence |
|---|---|---|
| **梵鐘 (temple bell)** | 清水寺 鐘楼 | Deep, long decay ~40 s. Struck at set times; 108 times on 大晦日. |
| **賽銭 (coin toss)** | 賽銭箱 at every shrine/temple | Constant clatter of coins on a slatted wooden grille — a very specific sound. |
| **本坪鈴 / 鰐口 (bell rope)** | shrine hall | Rattling brass shake, then a rope thump. |
| **柏手 (two claps)** | worshippers at Yasaka | Sharp, dry, in pairs. |
| **おみくじ** | hexagonal tin cylinder shaken, stick drops | Woody rattle then a click. |
| **手水 (ladle)** | 手水舎 | Water poured from a wooden 柄杓 over stone. |
| **絵馬 (ema)** | racks of hanging wooden plaques | A dry wooden *clack-clack* in wind — hundreds of plaques knocking. Distinctive and easy to miss. |
| **風鈴** | shop eaves, summer | Small high glass ping. |
| **打ち水** | shopkeepers throwing water on the stone, morning and evening | A splash, then the smell/steam. Very Kyoto, very cheap to animate. |
| **箒 (broom)** | shopkeepers sweeping the frontage at opening | Scratchy sweep on stone. |
| **Rickshaw greeting** | 俥夫 calling to passers-by | `こんにちは！人力車いかがですか` |
| **Shop greeting** | `おいでやす` / `おこしやす` (Kyoto forms) or standard `いらっしゃいませ` | The Kyoto forms are genuinely used in old shops and are a strong flavour cue. **[V for usage, T for any specific shop]** |
| **祇園囃子** | Gion Matsuri only, July | The *kon-chiki-chin* flute-and-gong figure. Out of scope for a normal day but iconic. |

**Explicitly absent** — do not add these, their absence is characteristic:
loudspeaker advertising, shop music spilling onto the street, pachinko, traffic
noise, motorbikes on the stepped streets, aircraft. Kyoto's historic district is
markedly quieter than any comparable Japanese tourist street.

### 5.3 Environment / weather cues worth having

- **Rain** transforms the district: the granite goes near-black and mirror-like,
  the crowd becomes a canopy of transparent umbrellas plus rented wagasa (oiled
  paper umbrellas, `#B94A3C` and `#2E4A3A`), noren get pulled in, and the shop
  interiors read much brighter against the dark street. Very high value per unit
  of work.
- **打ち水** wet patches on stone at 08:00 and 17:00 give the same benefit for
  free on a dry day.
- **Snow** (a few days a year) — Kiyomizu and the pagoda in snow is a canonical
  image.
## 6. Generator recipes

Practical assembly rules that fall out of the census above.

### 6.1 Shopfront assembly grammar

A frontage is: **bay width → shutter/opening → noren → signage stack → clutter
zone → threshold**.

```
bay width        3.6 m (small) | 5.4 m (typical) | 7.2 m (corner/large)
opening          full-width open front (souvenir/food, Kiyomizu-zaka)
               | glazed sliding doors with a lattice screen (craft/ceramics)
               | closed timber + tiny nameplate only (ochaya, Hanamikoji)
noren            60 % of shops, hung at 1.75 m, 3 or 5 panels, §2.1 palette
                 (absent before opening and after close — animate this)
signage stack    1 × vertical 看板 at 2.4 m on the pier            (85 %)
               + 1 × horizontal 扁額-style name plate over the opening (40 %)
               + 1 × projecting 袖看板                              (30 %)
               + 1 × A-board on the ground                          (55 %, food only)
               + n × price strips in a rack                         (food only, n = 8–20)
clutter zone     0.0–1.2 m out from the shop line, §3.7
threshold        one 0.15 m stone step + a 沓脱石
```

**Hard constraints from the ordinance (§4.1) — apply these as generator clamps:**

```
total sign area per elevation   <= 3.0 m^2
sign display ratio              <= 10% of the elevation
projecting sign                 <= 3.0 m^2, projection <= 1.0 m, clearance >= 2.5 m
standing sign / A-board         <= 2.0 m tall
nobori banner                   <= 2.0 m
illumination                    white or one pale colour, fixture hidden
rooftop sign                    FORBIDDEN
flashing / animated / digital   FORBIDDEN
sign chroma                     Y,YR <= 10 ; all other hues <= 8
                                (bare wood and bare stone are exempt)
```

Wire the last two as asserts. If a generated frontage violates any of them, it
is not a Higashiyama frontage.

**Frequency weights that make a street read correctly** (fraction of frontages):

| Street | Food/sweets | Craft/ceramics | Textiles/komono | Restaurant | Non-retail (ochaya, house, temple wall) |
|---|---|---|---|---|---|
| 清水坂 | 0.45 | 0.20 | 0.20 | 0.10 | 0.05 |
| 産寧坂 | 0.35 | 0.20 | 0.25 | 0.15 | 0.05 |
| 二寧坂 | 0.40 | 0.15 | 0.25 | 0.15 | 0.05 |
| ねねの道 | 0.25 | 0.15 | 0.15 | 0.15 | 0.30 |
| 下河原通 | 0.15 | 0.05 | 0.10 | 0.35 | 0.35 |
| 花見小路 | 0.05 | 0.02 | 0.03 | 0.30 | 0.60 |

That last row is the whole point of Hanamikoji — **60 % of its frontage sells
nothing you can see.**

### 6.2 String selection

Give each shop a `category` and draw its strings from the category's pools:

```
category      noren pool                  kanban pool                 strip pool
─────────────────────────────────────────────────────────────────────────────────
tea_house     茶 / 御茶處 / 甘 / 一服どうぞ  茶寮 / 京の味 / 名代        §2.3 amamidokoro
sweets        甘味処 / わらび餅 / だんご    御菓子司 / 京菓匠 / 京銘菓  §2.3 amamidokoro + street food
yatsuhashi    八ツ橋 / 京菓子              〜本舗 / 元祖 / 創業〜       生八ツ橋 / 試食できます
pickles       漬 / 京漬物                  〜本舗 / 京つけもの          (few; sells by weight)
ceramics      器 / 焼 / 清水焼             清水焼窯元 / 陶器 / 京陶苑    price cards on stands
incense       香 / 御香                    香老舗 / 香木・線香          —
fans          扇 / 京扇子                  京扇堂 / 〜堂                —
textiles      染 / 和小物                  西陣織 / 手ぬぐい            —
soba          蕎 / 麺 / 手打蕎麦           名代 / 〜庵                  §2.3 soba
tofu_yuba     豆 / 湯どうふ / ゆば          京料理 / 〜家                §2.3 tofu
kaiseki       御料理 / 京料理               懐石料理 / 京料理 (gold/black) 五千五百円 etc. in kanji
ochaya        (none, or a plain unlettered one)  tiny 表札 only          none
```

### 6.3 Cheap wins, ranked

1. **犬矢来 along Hanamikoji.** One curved bamboo skirt, instanced. Nothing else
   says Kyoto so fast.
2. **The Yasaka 舞殿 lantern grid** — ~280 instanced lanterns with per-instance
   text. One prop, one of the best images on the route.
3. **Noren everywhere, with a wind sway and an open/close state.**
4. **Moss on north faces only.**
5. **The kukurizaru cluster** — one small ball, thousands of instances, full
   chroma, in one small courtyard.
6. **おみくじ結び所** — a white paper ruffle on a wire frame.
7. **Wet stone.** A `打ち水` decal or a rain state; the granite value drop does
   more for the image than any geometry.
8. **Three small plates per utility pole** on the streets that still have poles.
9. **Ema racks** — a plane of pale shingles with a clack sound.
10. **Empty sky above the eaves.** Resisting the urge to add rooftop signage is
    itself the art direction.
## 7. Flags, corrections and open questions

### 7.1 Corrections to the brief

Five things in the brief turned out to be wrong or misdirected. Each matters for
the build.

1. **The ¥10,000 photography sign is in Gion, not on Ninenzaka.** The brief asks
   for "Ninenzaka's famous no-photography ordinance sign". The fine-bearing sign
   (`私道での撮影禁止` / `許可のない撮影は一万円申し受けます`) went up on the
   **private alleys off Hanamikoji** on **2019-10-25**, put there by the
   祇園町南側地区協議会 with the city and Higashiyama police; a second wave in
   April 2024 added `ここは私道です。通り抜けできません` at the two mouths of
   **小袖小路**. Ninenzaka / Sannenzaka carry only ordinary private-property and
   manner-request signage. Full wording for both in §2.7. **[V]**
2. **It is not an ordinance.** There is **no Kyoto City ordinance banning
   photography**. The ¥10,000 is a charge asserted by a private landowners'
   council. Render the sign; don't narrate it as law. What *is* ordinance-backed
   is the ¥1,000 street-smoking penalty (§2.7) and the citations on the council's
   multilingual message panel. **[V]**
3. **Hanamikoji and Ninenzaka were undergrounded — but 清水坂 was not.** The
   brief's premise held for four streets and failed for the busiest one.
   清水坂/清水道 and 祇園新橋 **still carry poles and overhead lines**, and the
   FY2021–23 budget suspension hit exactly those routes. §3.2. **[V]**
4. **There ARE vending machines on Ninenzaka and Sannenzaka** — 3 and 6
   respectively by OSM count. Kyoto restricts their *colour* (Munsell 5Y 7.5/1.5),
   not their presence. §3.3. **[V]**
5. **The pickle barrels are not on the street.** Tsukemono shops here front with
   refrigerated cases and tasting counters. Every 樽 reference traces to 錦市場 or
   a brewery. §3.7. **[V]**

Two smaller ones: **Yasaka's approach torii on 下河原通 is stone, not
vermilion**; and **the Gion Kobu crest is eight dango (つなぎ団子) with 甲 at the
centre**, not five.

### 7.2 Trademark and likeness

- The **Ninenzaka machiya coffee house** — a well-known international chain's
  2017 conversion of a 100-year-old Taisho townhouse, 269.52 m², 51 seats, three
  tatami rooms, and the world's first branch to hang a **暖簾** at the door — is
  a real and famous part of the street, and its **main building and 大塀 are
  designated traditional buildings within the preservation district**. **Model
  the building, the noren, the courtyards and the frontage; do not reproduce the
  chain's logo.** Substitute a small dark plate reading `珈琲` or `喫茶`. The
  silhouette and the noren are what people actually recognise.
- Same rule for: the character-goods shops on 二年坂 (substitute a generic plush
  silhouette), the blotting-paper shop's face mark, SOU・SOU's numeral graphic
  (use a generic flat-colour numeral field), the convenience-store fascias on
  東大路通, and any taxi company crest (use a generic clover-like mark). Build the
  **form and the colour discipline**; substitute the mark.
- Beverage brand names in §2.11 are listed for context only; use the generic
  substitutes given.

### 7.3 Confidence by section

| Section | Confidence |
|---|---|
| §2.7 admission, hours, notice boards | **High** — mostly verbatim from the temples' and the city's own pages |
| §2.8 Yasaka amulet/goshuin prices | **High** — the shrine's own complete list |
| §2.9 八坂庚申堂 | **High** — the temple's own text |
| §3.0 preservation-plan building spec | **High** — the legal告示 |
| §3.2 undergrounding | **High** — Kyoto City's own planning PDFs |
| §3.3 vending machines | **High** — industry standard + OSM ground-truth |
| §3.9 street surfaces | **High** — Keihan on the tram ballast; OSM tags |
| §4.1 ordinance numbers | **High** — the city's own standards documents |
| §1.5–1.7 shop **existence** on the three slopes | **High** — addresses, phone numbers, monzenkai directory |
| §1.5–1.7 shop **facades** | **Mixed** — see §1.0; ~20 documented, the rest reconstructed |
| §1.8 Hanamikoji / Shijo | **Good** — the Gion association's 113-business directory |
| §1.8 ねねの道 / 下河原通 / 石塀小路 businesses | **Low** — coordinates verified, the business list was not fully re-verified. Treat as a starting point |
| §2.1–2.3 noren / kanban / price strips | **Mixed** — prices largely verified from real menus; noren colour conventions are traditional-usage knowledge, not separately sourced |
| §5 sound and motion | **Inference from the physical inventory**, not a field recording |

### 7.4 Items marked [?] — verify before they drive a hero shot

| # | Item | Why | How to settle it |
|---|---|---|---|
| 1 | **Rickshaw dimensions** | Two sources disagree on width (235 × 130 × 200 cm vs W1000 × D2200 × H2100 mm); wheel Ø, blanket, 地下足袋 and shaft length unverified | Measure from a photo against a known human height |
| 2 | **Kukurizaru** diameter, count, full colour set, stringing | Only the price, form and meaning are sourced | Photograph |
| 3 | **地上機器 colour** | Kyoto runs a 美装化 programme but no document names a colour. **Do not assert こげ茶** | City/utility spec, or a photo |
| 4 | **Brown Kyoto post boxes and mirror poles** | Landscape-coloured street furniture exists elsewhere in Japan but was not confirmed here | Photo. Red post box is always safe |
| 5 | **Manhole diameter and cast text** | The 御所車 design and the first-generation seal are verified; 600 mm and 汚水/雨水 are not | Photo |
| 6 | **清水坂 / 下河原通 / 石塀小路 undergrounding** for 石塀小路 and 下河原通 | No project record either way. Also: whether the FY2021–23 suspension has lifted and the 2026 status of 清水通 / 八坂通 / 新橋通 | Kyoto City 無電柱化 progress report |
| 7 | **産寧坂 step count (46)** and 380 m / 28 m figures | Single tourist source | Survey data or a careful count from imagery |
| 8 | **Gion crest date** — 1851 vs 1732 | Two sources, two different licensing events. The eight-dango + 甲 geometry is solid | Gion Kobu's own history; do not state a date as fact |
| 9 | **八坂神社 crest geometry** (五瓜に唐花) and **舞殿 donor names** | Crest identity solid, geometry not; **no donor name could be sourced — do not invent and present as real** | High-res photo of the 舞殿 |
| 10 | **手水舎 ladles** — present or removed | Widely removed 2020–22, partially restored | Pick one era, be consistent |
| 11 | **法観寺 hours** | 10:00–15:00 (府観光連盟) vs 9:00–16:00 elsewhere; closure is genuinely 不定休 | Temple |
| 12 | **Plain おみくじ price** | 200円 is standard but none of these sites publishes it | On-site |
| 13 | **花見小路 traffic regulation hours** and delivery-van windows | Not verified; OSM shows it is *not* uniformly pedestrianised | Higashiyama ward traffic notice |
| 14 | **犬矢来 bamboo pitch, pole Ø, curve radius, rope colour** | Only H 800 / D 300 mm verified | Photo |
| 15 | **ねねの道 paving spec and date** | Undergrounding dated; paving not | City records |
| 16 | **Vending-machine on-body text and prices** | Conventional but uncited | Photo |
| 17 | **杉養蜂園** and **嘉祥窯** street assignment | Each appears on two streets in different sources; both are corner or near-corner sites | Map check |
| 18 | **ねねの道 / 下河原 businesses** (§1.8 unverified list) | Not sourced this session | Re-run that census |
| 19 | **地主神社 reopening**, **安井金比羅宮's website is down** | Closure since 2022-08-19 is verified; reopening is undetermined and the shrine refuses to give a date | Do not model an open Jishu Jinja |
| 20 | **Sign-ordinance enforcement statistics** | Permit counts found; compliance/removal/fine figures not | City |
| 21 | Street-lamp design and spacing, 駒札 sizes, 消火器格納箱 dimensions, 観光案内標識 typeface | Not researched to a conclusion | Photo survey |
| 22 | **Preservation district expansion year** — 1995 (city document) vs 1996 (Wikipedia) | Conflicting | City record |

### 7.5 A note on how much of this to build

The census names specific businesses because **specificity is what makes a street
read as a place rather than as a set**. But the value is not in any one shop being
correct — it is in the **distribution**: the run of yatsuhashi shops with sample
trays on 清水坂, the ceramics tiers, the chilled tasting counters, the noren
rhythm, the wires that stop at the top of the hill, and the single spice shop on
the corner where the two slopes meet. Get the distribution and the colour
discipline right and the street will read as Higashiyama even where individual
names are invented.

And if you build only three things from this document, build the **犬矢来 along
Hanamikoji**, the **~280-lantern grid on the Yasaka dance stage**, and the
**kukurizaru at 八坂庚申堂**. Those three carry the district.
