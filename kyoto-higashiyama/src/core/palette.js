/* ------------------------------------------------------------------ *
 * One place for every colour in Higashiyama.
 *
 * The set is narrow on purpose and it is built around one observation about
 * the real place: **a Kyoto street is a dark timber grid on a pale field,
 * under a silver-grey roof.**  Not a brown roof, not a black one.  いぶし瓦
 * (ibushi-gawara) is smoke-fired tile with a carbon skin, and in daylight it
 * reads as a cool silver-grey that is *lighter than the timber below it*.
 * Nearly every 3D Kyoto gets this backwards -- roofs go near-black, the
 * street turns into a canyon, and the whole thing reads as Edo-period drama
 * rather than as a bright spring afternoon.
 *
 * Relative luminance (0.2126R + 0.7152G + 0.0722B on the sRGB values) for the
 * four masses that make up most of any frame here:
 *
 *     plaster        0.845    the pale field -- 漆喰 walls, paper, shoji
 *     paving         0.664    granite sett, worn to warm grey
 *     tileRoof       0.472    いぶし瓦, the silver-grey
 *     timber         0.243    the posts, lattice and eaves that draw the grid
 *
 * That is a real ladder with a big step at the bottom, which is what lets the
 * ink pass and the timber do the drawing while everything else stays open.
 * The single most common failure mode when adding a colour here is putting it
 * between `tileRoof` and `timber`: that band is reserved, because it is where
 * the eye reads structure.
 * ------------------------------------------------------------------ */

export const PAL = {
  /* ------------------------------ sky & air ------------------------------ */
  skyTop: 0x8ab6e4,
  skyMid: 0xd0e4f6,
  skyHaze: 0xfae6e6,
  cloud: 0xfdfaf7,
  cloudShade: 0xe4e4f0,
  /* Kyoto sits in a basin and in April it is genuinely hazy; the fog colour is
   * the far end of every street and therefore one of the most-seen colours in
   * the project.  Warm, not blue: a blue haze reads as coastal. */
  fog: 0xe7ecf4,
  fogWarm: 0xf0ebeb,

  /* The ring of hills.  Four layers, and they have to separate by *value*
   * because they are all the same hue -- the basin is closed on three sides by
   * the same forest. */
  hillNear: 0x9fb39c,
  hillMid: 0xb3c0c2,
  hillFar: 0xc8d0dd,
  hillFarthest: 0xd9dee9,

  /* --------------------------------- light -------------------------------- */
  sun: 0xfff0d4,
  sunLow: 0xffd9a8,        // the late-afternoon key
  fill: 0xa6bcf2,          // cool bounce from the opposite quarter
  bounce: 0xd6c8e6,        // violet up-light, stops undersides going black
  hemiSky: 0xdaeaff,
  hemiGround: 0xb4a4c4,

  /* ---------------------------------- ink --------------------------------- */
  /* Violet-black, never neutral: a neutral ink line over a warm plaster wall
   * reads as a pencil sketch laid on top of a painting rather than as part of
   * it. */
  ink: 0x36304a,
  inkSoft: 0x484264,
  inkWarm: 0x4a3c46,       // for the ink on timber, which leans red

  /* -------------------------------- timber -------------------------------- */
  /* Six woods, and they are six because Higashiyama has at least six.  A shrine
   * gate, an ochaya facade, a temple's exposed structure, a lattice screen, a
   * new signboard and a weathered fence are not the same colour and a street
   * built from one brown reads as an asset pack. */
  timber: 0x4a3a33,          // the base: sumi-blackened facade timber
  timberDark: 0x35292a,      // deep members, the recess behind a 格子
  timberMid: 0x6b5040,       // structural posts in daylight
  timberWarm: 0x8a6647,      // eaves soffits, exposed rafters
  timberPale: 0xbd9c72,      // fresh cedar: signboards, decking, new fence
  timberGrey: 0x9a8d84,      // weathered, silvered fence and板塀
  /* 弁柄 (bengara), the red-ochre lacquer that is the single most identifiable
   * surface in Gion.  Measured at 8R 3.5/7, #8F2D12.  The single most important thing about it is
   * that it is **roughly half the chroma of shrine vermilion** -- see the note
   * by `vermilion` below.  Confusing the two reds is, per the architectural
   * survey, the likeliest rendering error in a project like this. */
  bengara: 0x8f2d12,
  bengaraDeep: 0x631d0c,
  bengaraLit: 0xa84a26,

  /* ------------------------------- plaster -------------------------------- */
  plaster: 0xf2ece0,         // 漆喰, the pale field
  plasterWarm: 0xeadfc8,
  plasterGrey: 0xdfdcd6,
  plasterOchre: 0xd9c4a2,    // 聚楽壁, the earthen wall
  plasterDark: 0xc0b09a,     // the same, in shade or aged
  mortar: 0xcdc6bb,

  /* --------------------------------- roof --------------------------------- */
  /* いぶし瓦.  See the header: this is a SILVER grey.  `tileRoof` is the field,
   * `tileEdge` is the lit crest of each course (a tiled roof is corrugated and
   * reads as stripes at any distance), `tileShade` is the shadowed valley, and
   * `tileRidge` is the heavy 棟 course, which is the darkest thing on a roof
   * and the line that draws it. */
  tileRoof: 0x707a86,
  tileEdge: 0x8b95a0,
  tileShade: 0x5b636f,
  tileRidge: 0x4c525f,
  tileWarm: 0x77736f,        // an older, browner roof, for variety in a row
  /* 檜皮葺 -- cypress-bark thatch, which is what Kiyomizu-dera's main hall and
   * the shrine roofs wear.  It is a completely different material from tile and
   * has to read that way: warm brown, matte, with a soft thick edge instead of
   * a corrugated one.  Half the reason the temple looks like a temple. */
  hiwada: 0x6b5344,
  hiwadaLit: 0x876953,
  hiwadaEdge: 0x9c7c60,      // the cut edge of the eave, which is pale
  /* 茅葺 thatch, and copper for finials and small roofs. */
  kaya: 0x9c8a68,
  copper: 0x6f9a8c,          // verdigris
  copperDark: 0x4e7269,

  /* ------------------------------- vermilion ------------------------------ */
  /* 朱 -- the shrine red, and the one saturated colour in the project allowed to
   * be a large area: only Yasaka Shrine and Kiyomizu-dera's gates get it.  In
   * shade it goes *browner*, not merely darker.  Measured at #EB6101, which is a decisively *orange* red and about
   * twice the chroma of bengara.  Held back a shade from the raw value for the
   * base tone, because at full saturation across a whole gate it is the only
   * thing anybody sees; the lit tone is the real one. */
  vermilion: 0xd2551a,
  vermilionLit: 0xeb6101,
  vermilionDeep: 0x9c3a0c,
  /* The green and white that always accompany it on a gate: 緑青 on the metal
   * fittings, white plaster panels between the beams. */
  gatePanel: 0xf0e8d8,
  /* 緑青 verdigris.  Yasaka's West Romon has a **green** lattice, not a red
   * one -- a detail almost every reconstruction of that gate gets wrong. */
  gateGreen: 0x4d7d64,
  gateGold: 0xc9a24e,

  /* --------------------------------- stone -------------------------------- */
  /* Kyoto's paving is granite and it is *warm* grey, not blue grey -- the setts
   * on Ninenzaka are laid in mixed tones and worn to a shine. */
  paving: 0xada49c,
  pavingLit: 0xc0b7ad,
  pavingDark: 0x8e867f,
  pavingWarm: 0xb5a692,
  sett: 0x9c948e,            // the small granite blocks between the slabs
  settDark: 0x7d766f,
  gravel: 0xc4bcae,          // 白川砂, the pale gravel of a shrine precinct
  gravelDark: 0xa8a094,
  stone: 0xb8b2ae,           // lanterns, steps, 玉垣
  stoneDark: 0x948e8a,
  stoneMoss: 0x8a9478,       // the green film on anything old and shaded
  stoneWall: 0x8f8880,       // 石垣 retaining wall
  stoneWallDark: 0x6e6862,
  concrete: 0xcfcbc6,
  concreteDark: 0xa5a09b,
  asphalt: 0x827e88,
  asphaltWorn: 0x8f8b94,

  /* -------------------------------- fabric -------------------------------- */
  norenIndigo: 0x2b3f5e,     // 藍, the default noren
  norenNavy: 0x1f2d44,
  norenCream: 0xefe4d0,
  norenRed: 0x9c3a30,
  norenBrown: 0x6b4a38,
  norenPurple: 0x584064,
  norenGreen: 0x3f6152,
  sudare: 0xc2a878,          // the split-bamboo blind
  sudareDark: 0x9c8558,
  banner: 0xf2e8d4,          // 幟, the vertical cloth banner
  bannerRed: 0xb03a2e,
  /* Paper: shoji, lanterns, and the omikuji tied to a rack -- the palest thing
   * in the world and it needs to stay that way in shade, so it gets the
   * high-key ramp rather than a lighter colour. */
  paper: 0xf7f1e4,
  paperWarm: 0xf4e6c8,
  paperLit: 0xffe9bc,        // lit from inside at dusk

  /* ------------------------------ vegetation ------------------------------ */
  /* Higashiyama's greens, and they are a ladder for the same reason the hills
   * are: a temple garden, a bamboo grove, a pine, a maple and a moss bed are
   * all green and all in the same frame. */
  leafPine: 0x4a6b52,        // 松, the darkest and bluest
  leafPineLit: 0x62855f,
  leafCedar: 0x3f6350,
  leafCedarLit: 0x5d8362,
  leafMaple: 0x7ba86a,       // 楓 in spring -- fresh, yellow-green
  leafMapleLit: 0x9cc47e,
  leafMapleAutumn: 0xd2593c,
  leafMapleAutumnLit: 0xe8804a,
  bamboo: 0x93ae66,
  bambooLit: 0xafc47e,
  bambooCulm: 0xa8b070,      // the stem, which is yellower than the leaf
  bambooCulmPale: 0xc4c48c,
  shrub: 0x6f9268,
  shrubLit: 0x8bab7c,
  moss: 0x7d9464,
  mossDeep: 0x5f7a4e,
  grass: 0x8aa878,
  trunk: 0x6b5a52,
  trunkPale: 0x8f7d70,
  trunkPine: 0x7a5f4a,       // pine bark is redder and plated

  /* ------------------------------- blossom -------------------------------- */
  /* 桜.  Four tones and a petal colour.  These get the high-key ramp (see
   * toon.js) so a blossom mass never goes muddy on its shadow side -- a dark
   * cherry tree is the single fastest way to make a spring scene look wrong. */
  blossom: 0xfbc8d6,
  blossomLight: 0xfff2f5,
  blossomWarm: 0xfcdde0,
  blossomDeep: 0xf0a6bd,
  blossomShade: 0xe8b8c8,
  petal: 0xfcd8e2,
  petalDeep: 0xf4bccc,
  /* 枝垂桜, the weeping cherry in Maruyama Park -- deeper and pinker than the
   * somei-yoshino along the streets, which are nearly white. */
  shidare: 0xf2a2bc,
  shidareLit: 0xffc4d4,

  /* --------------------------------- water -------------------------------- */
  water: 0x9cbdd0,
  waterDeep: 0x74a0b8,
  waterSky: 0xcde0ef,
  waterFoam: 0xf2f6f8,
  waterMoss: 0x8aa8a0,       // the Shirakawa's bed, which is green

  /* -------------------------------- accents ------------------------------- */
  /* Four saturated accents, reserved for focal objects.  Kyoto's 景観条例
   * (townscape ordinance) means the real street has *very* few of them -- signs
   * are legally restricted to muted tones -- so spending them carelessly is the
   * fastest way to stop looking like Kyoto. */
  red: 0xc4443a,
  redDeep: 0x8e2f28,
  gold: 0xc9a24e,
  goldDeep: 0x9c7a34,
  indigo: 0x35507a,
  indigoDeep: 0x243a5c,
  purple: 0x6e5482,
  black: 0x2e2a36,           // 墨, the sign black
  blackSoft: 0x413c4a,
  white: 0xf7f4ee,

  /* ------------------------------ metal / misc ---------------------------- */
  metal: 0xa8aab2,
  metalDark: 0x7c7e88,
  metalWarm: 0xb8ac9c,
  iron: 0x585460,            // the black-iron fittings on a gate
  brass: 0xb09456,
  glass: 0x9cb8c8,
  glassDark: 0x4e5c6e,
  glassLit: 0xd8d0b0,
  /* Modern infrastructure, which is genuinely present even here and is half of
   * what makes Kyoto read as a *city* rather than a theme park.  Deliberately
   * desaturated -- a bright vending machine on Ninenzaka would be a lie twice
   * over (the ordinance forbids it, and it would win every frame it was in). */
  vendBody: 0x8a7f74,        // the brown-wrapped machines the ordinance forces
  vendPanel: 0xd8d0c4,
  utilityPole: 0xb0aaa4,
  wire: 0x4a4652,
  acUnit: 0xc8c4be,
  meterBox: 0xb4b8b4,
  drain: 0x6e6a70,
  mirror: 0xd8a83c,          // the traffic mirror's orange frame
  mirrorFace: 0xc4d4de,

  /* -------------------------------- lantern ------------------------------- */
  lantern: 0xf2e2c4,
  lanternLit: 0xffd9a0,
  lanternRed: 0xc4443a,
  lanternFrame: 0x3a3038,
  lanternStone: 0xb2aca6,

  /* ---------------------------- shop / interior --------------------------- */
  shopInterior: 0x5c5148,    // the dark behind a shopfront's glass
  shopInteriorLit: 0x8a7a66,
  tatami: 0xc4bc86,
  tatamiEdge: 0x3f4a5c,
  counter: 0xa88a64,
  ceramicWhite: 0xeee8dc,    // 清水焼 -- the pottery on every Kiyomizu-zaka stall
  ceramicBlue: 0x4a6e94,
  ceramicGreen: 0x6a8a6e,
  ceramicRed: 0xb0503c,
  matcha: 0x8aa84a,
  matchaDeep: 0x6b8438,
  wagashi: 0xf0c8b4,
  sweetPink: 0xf2b0bc,
  sweetGreen: 0xb4cc8c,

  /* -------------------------------- vehicles ------------------------------ */
  taxiBlack: 0x2e2c34,
  taxiGreen: 0x2f5c4a,       // the MK / Yasaka taxi green
  vanWhite: 0xeceae4,
  bicycle: 0x4a5058,
  rickshaw: 0x2a2630,        // 人力車 -- black lacquer body
  rickshawRed: 0xa8362c,     // ...with a red seat blanket
};

/** Ceramic glaze colours for the pottery stalls -- 清水焼 runs to blues and creams. */
export const CERAMIC = [
  0xeee8dc, 0x4a6e94, 0x6a8a6e, 0xb0503c, 0xd8cdb4,
  0x3f5a72, 0x8a9c6e, 0xc4a878, 0xe4dcc8, 0x7a4a54,
];

/** Cloth tones for noren, banners and furoshiki. */
export const CLOTH = [
  0x2b3f5e, 0x1f2d44, 0xefe4d0, 0x9c3a30, 0x6b4a38,
  0x584064, 0x3f6152, 0x4a5c6e, 0xb0a48c, 0x2f4438,
];

/** Kimono / yukata tones, kept muted -- used for the sparse pedestrians. */
export const KIMONO = [
  0xb47a8c, 0x6e7ea8, 0x8a9c6e, 0xc4a878, 0x9c6e84,
  0x5c6e7c, 0xd0b48c, 0x7a5c6e, 0xa8b4c0, 0xc48c7a,
];
