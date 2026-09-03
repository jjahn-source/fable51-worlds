/* ------------------------------------------------------------------ *
 * The world's geographic contract.
 *
 * Everything spatial in the project is derived from this file: the terrain,
 * the street surfaces, the collision, where the buildings stand, where the
 * hero cameras point.  Nothing else may hold a coordinate that contradicts it.
 *
 * ---------------------------------------------------------------- FRAME
 *
 * Origin  : the Yasaka Pagoda (法観寺 五重塔), 34.9985564 N, 135.7792488 E,
 *           ground 61.3 m ASL.  Chosen because it is the one object visible
 *           from most of the route, so every sightline is measured from zero.
 * Axes    : +X = east, +Z = SOUTH, +Y = up (metres ASL, used directly).
 *           Three.js is right-handed and y-up, so **north is -Z**.  The check
 *           is that Yasaka Shrine has a negative z and Kiyomizu-dera a
 *           positive one.
 * Scale   : 1 deg latitude = 110 940.557 m; 1 deg longitude = 91 289.741 m.
 *
 *     x = (lon - 135.7792488) * 91289.741
 *     z = -(lat - 34.9985564) * 110940.557
 *
 * -------------------------------------------------------------- SOURCES
 *
 * Positions are OpenStreetMap footprint centroids and way nodes.  **Every
 * elevation is an independent point query against the GSI 1 m airborne-LiDAR
 * bare-earth DEM** -- about 200 of them -- rather than an interpolation, and
 * the face-to-face street widths were measured by casting perpendicular rays
 * from each centreline to the OSM building polygons every 8 m.  Cross-checked
 * against ja.wikipedia for 法観寺 / 清水寺 / 八坂神社.  Full audit and the
 * uncertainty register: docs/recon/GEO.md, machine-readable src/data/geo.json.
 *
 * ------------------------------------------------- FOUR THINGS TO KNOW
 *
 * 1. **Kiyomizu-dera is not on a mountain.**  The stage deck is at 115.5 m and
 *    the whole precinct spans 96 m (the Otowa waterfall) to 122 m (Jishu
 *    Shrine).  The 240-250 m figure that circulates is the *ridge behind* the
 *    temple.  Building the temple 120 m too high would put it above the
 *    Higashiyama skyline, which is exactly backwards: from the city it reads
 *    as tucked into the hill, not perched on it.
 *
 * 2. **The stage's 13 m is confirmed, and it is a real 13 m.**  A 95 m DEM
 *    transect gives 115.5 m of deck over 102.8 m of bare ground at the centre
 *    and 14.4 m at the outer corner.  (Incidentally that the DEM returns the
 *    ground *under* the deck at all is what proves it is a true bare-earth
 *    model and not a surface model.)
 *
 * 3. **The steps are shallow.**  Sannenzaka is 46 steps over 32.0 m of way and
 *    Ninenzaka is 17 over 15.9 m -- treads of about 0.70 m and 0.94 m against
 *    130-150 mm risers.  These are Kyoto *slope-stairs*, closer to a ramp with
 *    interruptions than to a staircase, and building them at a normal
 *    280 mm / 175 mm would make both streets twice as steep as they are.
 *
 * 4. **Yasaka Shrine's famous vermilion gate is not on its axis.**  Honden,
 *    Maiden, South Romon and the stone torii form a straight north-south
 *    ceremonial axis; the West Romon that everyone photographs is a *side*
 *    entrance 92 m west of the Maiden, facing down Shijo-dori.  Putting it on
 *    the axis is the single commonest error in reconstructions of the shrine.
 * ------------------------------------------------------------------ */

export const ORIGIN = {
  lat: 34.9985564, lon: 135.7792488, elev: 61.3,
  name: 'Hokan-ji five-storey pagoda (八坂の塔)',
};
export const M_PER_DEG_LAT = 110940.557;
export const M_PER_DEG_LON = 91289.741;

export function geoToLocal(lat, lon) {
  return {
    x: (lon - ORIGIN.lon) * M_PER_DEG_LON,
    z: -(lat - ORIGIN.lat) * M_PER_DEG_LAT,
  };
}

export function localToGeo(x, z) {
  return {
    lat: ORIGIN.lat - z / M_PER_DEG_LAT,
    lon: ORIGIN.lon + x / M_PER_DEG_LON,
  };
}

/* ------------------------------------------------------------------ *
 * Landmarks.  `y` is GSI bare-earth ground elevation, metres ASL.
 * ------------------------------------------------------------------ */

export const LANDMARK = {
  // --- Gion ---
  shijoHanamikoji:   { x: -381.8, z: -579.6, y: 39.0,  conf: 'HIGH' },
  hanamikojiNorth:   { x: -381.8, z: -585.8, y: 39.0,  conf: 'HIGH' },
  hanamikojiSouth:   { x: -421.2, z: -323.0, y: 39.0,  conf: 'HIGH' },
  kenninjiGate:      { x: -421.2, z: -316.0, y: 39.0,  conf: 'HIGH' },
  shinbashiShirakawa:{ x: -421.5, z: -795.4, y: 39.0,  conf: 'HIGH' },
  shinbashiBridge:   { x: -414.4, z: -798.2, y: 37.7,  conf: 'HIGH' },
  shinbashiWest:     { x: -581.3, z: -811.9, y: 39.2,  conf: 'HIGH' },
  shirakawaWest:     { x: -573.7, z: -754.9, y: 39.2,  conf: 'HIGH' },

  // --- Yasaka Shrine ---
  yasakaWestGate:    { x: -157.3, z: -575.2, y: 44.3,  conf: 'HIGH' },
  yasakaMaiden:      { x:  -64.9, z: -536.5, y: 49.7,  conf: 'HIGH' },
  yasakaHonden:      { x:  -60.1, z: -564.5, y: 49.5,  conf: 'HIGH' },
  yasakaSouthGate:   { x:  -65.3, z: -502.8, y: 50.8,  conf: 'HIGH' },
  yasakaStoneTorii:  { x:  -68.3, z: -467.3, y: 51.2,  conf: 'HIGH' },
  maruyamaPark:      { x:  138.3, z: -589.6, y: 56.7,  conf: 'HIGH' },
  maruyamaCherry:    { x:   96.0, z: -561.0, y: 58.3,  conf: 'MED'  },

  // --- the quiet transition ---
  neneNorth:         { x:   67.0, z: -368.2, y: 61.2,  conf: 'MED'  },
  neneSouth:         { x:   54.4, z:  -78.5, y: 59.5,  conf: 'MED'  },
  kodaijiGate:       { x:   60.5, z: -220.7, y: 57.6,  conf: 'HIGH' },
  kodaijiPrecinct:   { x:  192.2, z: -196.0, y: 66.0,  conf: 'MED'  },
  ishibekojiEast:    { x:   57.6, z: -152.8, y: 56.5,  conf: 'MED'  },
  ishibekojiWest:    { x:   22.4, z: -155.9, y: 56.0,  conf: 'MED'  },

  // --- the pagoda ---
  pagoda:            { x:    0.0, z:    0.0, y: 61.3,  conf: 'HIGH' },
  yasakadoriWest:    { x: -187.9, z:  -16.5, y: 50.6,  conf: 'HIGH' },
  yasakadoriEast:    { x:  -21.8, z:   13.4, y: 59.8,  conf: 'HIGH' },
  /** The intersection with Shimogawara-dori: the classic pagoda frame. */
  pagodaFrame:       { x:  -43.6, z:   -0.7, y: 57.8,  conf: 'HIGH' },
  koshindo:          { x:  -34.0, z:   26.0, y: 60.4,  conf: 'MED'  },

  // --- the climb ---
  ninenzakaNorth:    { x:  132.8, z:  -78.9, y: 63.3,  conf: 'HIGH' },
  ninenzakaSouth:    { x:  142.0, z:   61.9, y: 69.7,  conf: 'HIGH' },
  sannenzakaBottom:  { x:  142.0, z:   61.9, y: 69.7,  conf: 'HIGH' },
  sannenzakaSteps:   { x:  154.8, z:  231.0, y: 75.4,  conf: 'HIGH' },
  sannenzakaTop:     { x:  142.3, z:  260.4, y: 81.4,  conf: 'HIGH' },
  kiyomizuzakaFork:  { x:  134.9, z:  261.3, y: 81.1,  conf: 'HIGH' },
  kiyomizuzakaBottom:{ x: -204.9, z:  102.4, y: 51.7,  conf: 'HIGH' },
  kiyomizuzakaTop:   { x:  334.9, z:  337.6, y: 98.1,  conf: 'HIGH' },
  chawanzakaWest:    { x: -104.1, z:  367.9, y: 59.5,  conf: 'HIGH' },
  chawanzakaEast:    { x:  302.2, z:  392.7, y: 85.3,  conf: 'HIGH' },

  // --- Kiyomizu-dera ---
  niomon:            { x:  373.4, z:  347.1, y: 104.5, conf: 'HIGH' },
  saimon:            { x:  397.8, z:  378.6, y: 111.8, conf: 'HIGH' },
  sanjunoto:         { x:  418.9, z:  387.6, y: 112.2, conf: 'HIGH' },
  todorokimon:       { x:  475.7, z:  419.7, y: 114.9, conf: 'HIGH' },
  kiyomizuHondo:     { x:  519.9, z:  418.6, y: 115.5, conf: 'HIGH' },
  kiyomizuStage:     { x:  528.4, z:  431.6, y: 115.5, conf: 'HIGH' },
  /** The bare ground under the stage: this is the 12.7 m. */
  stageGround:       { x:  528.4, z:  431.6, y: 102.8, conf: 'HIGH' },
  okunoin:           { x:  577.4, z:  441.9, y: 116.3, conf: 'HIGH' },
  otowaFalls:        { x:  547.9, z:  458.8, y:  96.0, conf: 'HIGH' },
  koyasuPagoda:      { x:  521.2, z:  624.8, y: 116.6, conf: 'HIGH' },
  jishuShrine:       { x:  521.7, z:  375.4, y: 122.4, conf: 'HIGH' },

  // --- the arterial ---
  higashiojiShijo:   { x: -187.7, z: -576.1, y: 41.3,  conf: 'HIGH' },
  higashiojiYasaka:  { x: -187.9, z:  -16.5, y: 50.6,  conf: 'HIGH' },
  higashiojiKiyomizu:{ x: -197.8, z:  103.3, y: 51.7,  conf: 'HIGH' },
};

/* ------------------------------------------------------------------ *
 * The Yasaka Pagoda, measured.
 *
 * **38.79 m, not 46 m.**  The 46 m on Kyoto City's tourism pages is explicitly
 * 公称 -- a nominal figure -- and pagoda specialists say so.  The measured
 * value is from Hamashima Masashi's 1969 AIJ paper, worked from the Kyoto
 * Prefecture preservation drawings: 総高 128.00 尺, of which 塔身 88.00 尺 and
 * 相輪 40.00 尺.  Three internal checks close exactly.
 *
 * The storey widths matter more than the height.  Hokan-ji is one of only three
 * surviving five-storey pagodas with a **convex** taper -- type C 「中腹」, the
 * profile 『匠明』 calls correct, and the last one ever built that way.
 * Interpolating the widths linearly visibly wrecks the silhouette: the real
 * thing holds its width through the second and third storeys and then falls
 * away, which is why it reads as *swelling* rather than as a cone.
 *
 * And the roofs do not shrink with the body.  The plan of the eaves comes in by
 * only 13 % over five storeys while the body comes in by 30 %, so the upper
 * eaves overhang proportionally far more.  That divergence is most of what
 * makes a pagoda look like a pagoda.
 * ------------------------------------------------------------------ */
export const PAGODA = {
  height: 38.79,           // 総高 128.00 尺
  bodyHeight: 26.67,       // 塔身 88.00 尺
  sorinHeight: 12.12,      // 相輪 40.00 尺 -- nearly a third of the whole
  /** 初重 through 五重 body widths, metres.  Convex: NOT linear. */
  storeyWidths: [6.303, 5.918, 5.582, 4.982, 4.433],
  /** The eave (roof plan) spans shrink far less than the body does. */
  eaveSpan: [13.91, 13.35, 12.94, 12.46, 12.10],
  veranda: [false, false, false, false, true],   // 縁 on the top storey only
  built: 1440,
  patron: 'Ashikaga Yoshinori',
  /** Unpainted weathered timber with white plaster panels -- NOT vermilion. */
  finish: 'weathered timber + shikkui panels',
  conf: 'HIGH',
  source: 'Hamashima 1969 (AIJ), from Kyoto Pref. preservation drawings',
};

/** Kiyomizu-dera's measured figures.  See docs/recon/ARCH.md §6. */
export const KIYOMIZU = {
  /** The stage: 21.8 x 9.6 m, not the widely-repeated 18 x 10. */
  stage: [21.8, 9.6],
  stageDeckY: 115.5,
  stageGroundY: 102.8,
  /** 168 pillars in the whole kakezukuri, 78 of them under the stage. */
  pillars: 168,
  stagePillars: 78,
  /** 0.64 m diameter.  The "2 m" in circulation is 周囲 (circumference) misread. */
  pillarDia: 0.64,
  hondo: [36, 31],
  sanjunotoHeight: 30.2,
  niomonHeight: 14,
  conf: 'HIGH',
};

/* ------------------------------------------------------------------ *
 * Streets.
 *
 * `points` are `{x, z, y}` in world metres.  `half` is the paved half-width
 * you can walk on; `frontage` is the half-distance to the building faces.
 * The two differ by the gutter, the doorstep and the eave overhang, and the
 * district builders line their facades up on `frontage`.
 *
 * Every width here is measured, not guessed: `face_to_face_width_m` in
 * geo.json is the median of perpendicular rays cast to the OSM building
 * polygons every 8 m along the centreline.  Where the p10-p90 spread is wide
 * (Nene-no-michi's 6.2-24.2, because the Kodai-ji side is open) the value
 * used is the *closed* end of the range, since that is what the street feels
 * like to walk.
 *
 * `steps` marks a stretch the terrain quantises into treads.  The risers come
 * straight from the OSM step counts.
 * ------------------------------------------------------------------ */

export const STREETS = {
  /* ---------------------------------- Gion --------------------------------- */

  /** 四条通 -- four lanes, wide footways, and the shrine gate closing the end. */
  shijo: {
    name: '四条通', label: 'Shijo-dori',
    surface: 'asphalt', half: 7.0, frontage: 13.4, grade: 'ramp', bearing: 92.9,
    points: [
      { x: -640.0, z: -589.0, y: 38.4 },
      { x: -520.0, z: -587.5, y: 38.7 },
      { x: -381.8, z: -585.8, y: 39.0 },
      { x: -300.0, z: -581.6, y: 39.9 },
      { x: -240.0, z: -578.4, y: 40.6 },
      { x: -187.7, z: -576.1, y: 41.3 },
      { x: -166.0, z: -575.6, y: 43.0 },
    ],
  },

  /** 花見小路通 -- the ochaya street.  Dead flat, and famous for it. */
  hanamikoji: {
    name: '花見小路通', label: 'Hanamikoji-dori',
    surface: 'sett', half: 2.9, frontage: 4.2, grade: 'ramp', bearing: 188.5,
    points: [
      { x: -381.8, z: -585.8, y: 39.0 },
      { x: -388.0, z: -540.0, y: 39.0 },
      { x: -395.0, z: -488.0, y: 39.0 },
      { x: -402.0, z: -436.0, y: 39.0 },
      { x: -410.0, z: -382.0, y: 39.0 },
      { x: -416.0, z: -348.0, y: 39.0 },
      { x: -421.2, z: -323.0, y: 39.0 },
    ],
  },

  /** 新橋通 -- stone-paved, one-way, the preservation district. */
  shinbashi: {
    name: '新橋通', label: 'Shinbashi-dori',
    surface: 'sett', half: 2.25, frontage: 3.2, grade: 'ramp', bearing: 95.9,
    points: [
      { x: -581.3, z: -811.9, y: 39.2 },
      { x: -540.0, z: -807.6, y: 39.15 },
      { x: -500.0, z: -803.5, y: 39.1 },
      { x: -460.0, z: -799.4, y: 39.05 },
      { x: -421.4, z: -795.4, y: 39.0 },
    ],
  },

  /** 白川南通 -- the canal walk.  Willows on the water side, open to the north. */
  shirakawaMinami: {
    name: '白川南通', label: 'Shirakawa-minami-dori',
    surface: 'sett', half: 2.25, frontage: 3.0, grade: 'ramp', bearing: 75.0,
    points: [
      { x: -573.7, z: -754.9, y: 39.2 },
      { x: -536.0, z: -764.9, y: 39.15 },
      { x: -498.0, z: -775.0, y: 39.1 },
      { x: -460.0, z: -785.2, y: 39.05 },
      { x: -421.4, z: -795.4, y: 39.0 },
    ],
  },

  /** 白川 -- the canal.  A cut, not a corridor; see terrain.js. */
  shirakawa: {
    name: '白川', label: 'the Shirakawa', kind: 'water',
    surface: 'water', half: 3.2, frontage: 3.2, grade: 'ramp',
    points: [
      { x: -586.0, z: -746.0, y: 37.5 },
      { x: -546.0, z: -757.0, y: 37.45 },
      { x: -506.0, z: -767.6, y: 37.4 },
      { x: -466.0, z: -778.4, y: 37.35 },
      { x: -426.0, z: -789.0, y: 37.3 },
      { x: -400.0, z: -796.0, y: 37.25 },
    ],
  },

  /** 東大路通 -- the arterial.  Buses, wires, and a real city street. */
  higashioji: {
    name: '東大路通', label: 'Higashioji-dori',
    surface: 'asphalt', half: 7.0, frontage: 10.0, grade: 'ramp', bearing: 180,
    points: [
      { x: -186.0, z: -720.0, y: 40.2 },
      { x: -187.7, z: -576.1, y: 41.3 },
      { x: -188.0, z: -440.0, y: 43.6 },
      { x: -188.0, z: -300.0, y: 46.0 },
      { x: -188.0, z: -160.0, y: 48.4 },
      { x: -187.9, z:  -16.5, y: 50.6 },
      { x: -192.0, z:   50.0, y: 51.2 },
      { x: -197.8, z:  103.3, y: 51.7 },
      { x: -204.0, z:  200.0, y: 53.4 },
      { x: -210.0, z:  320.0, y: 56.0 },
      { x: -214.0, z:  420.0, y: 58.4 },
    ],
  },

  /* ------------------------------ the shrine ------------------------------ */

  /** 下河原通 -- runs south from the shrine's stone torii to Yasaka-dori. */
  shimogawara: {
    name: '下河原通', label: 'Shimogawara-dori',
    surface: 'sett', half: 2.75, frontage: 4.0, grade: 'ramp', bearing: 176.9,
    points: [
      { x: -68.7, z: -462.5, y: 51.4 },
      { x: -66.0, z: -400.0, y: 52.4 },
      { x: -62.0, z: -330.0, y: 53.4 },
      { x: -57.0, z: -250.0, y: 54.6 },
      { x: -52.0, z: -170.0, y: 55.8 },
      { x: -48.0, z:  -90.0, y: 56.9 },
      { x: -43.6, z:   -0.7, y: 57.8 },
    ],
  },

  /**
   * The shrine's ceremonial axis: stone torii, South Romon, Maiden, Honden.
   * Straight, north-south, and the thing the West Romon is NOT on.
   */
  yasakaAxis: {
    name: '八坂神社参道', label: 'Yasaka shrine axis', kind: 'precinct',
    surface: 'gravel', half: 5.0, frontage: 9.0, grade: 'ramp',
    points: [
      { x: -68.3, z: -467.3, y: 51.2 },
      { x: -67.0, z: -486.0, y: 51.0 },
      { x: -65.3, z: -502.8, y: 50.8 },
      { x: -65.1, z: -520.0, y: 50.2 },
      { x: -64.9, z: -536.5, y: 49.7 },
      { x: -62.5, z: -552.0, y: 49.6 },
      { x: -60.1, z: -564.5, y: 49.5 },
    ],
  },

  /** The west approach: Shijo's east end, in under the vermilion gate. */
  yasakaWestApproach: {
    name: '西楼門参道', label: 'west gate approach', kind: 'precinct',
    surface: 'gravel', half: 5.5, frontage: 9.0, grade: 'ramp',
    points: [
      { x: -157.3, z: -575.2, y: 44.3 },
      { x: -140.0, z: -570.0, y: 45.6 },
      { x: -120.0, z: -562.0, y: 47.0 },
      { x: -100.0, z: -552.0, y: 48.4 },
      { x:  -82.0, z: -544.0, y: 49.3 },
      { x:  -64.9, z: -536.5, y: 49.7 },
    ],
  },

  /* ------------------------- the quiet transition ------------------------- */

  /** ねねの道 -- broad granite slab, low walls, hardly a shopfront on it. */
  nene: {
    name: 'ねねの道', label: 'Nene-no-michi',
    surface: 'slab', half: 3.25, frontage: 5.2, grade: 'ramp', bearing: 182.5,
    points: [
      { x: 67.0, z: -368.2, y: 61.2 },
      { x: 65.0, z: -320.0, y: 60.9 },
      { x: 62.5, z: -262.0, y: 60.4 },
      { x: 60.5, z: -220.7, y: 57.6 },
      { x: 58.5, z: -176.0, y: 58.6 },
      { x: 56.5, z: -128.0, y: 59.2 },
      { x: 54.4, z:  -78.5, y: 59.5 },
    ],
  },

  /** From Maruyama Park's south side down onto Nene-no-michi. */
  maruyamaLink: {
    name: '円山公園南口', label: 'Maruyama south exit',
    surface: 'slab', half: 2.8, frontage: 4.4, grade: 'ramp',
    points: [
      { x: 110.0, z: -560.0, y: 57.8 },
      { x:  98.0, z: -520.0, y: 58.6 },
      { x:  88.0, z: -474.0, y: 59.6 },
      { x:  78.0, z: -424.0, y: 60.5 },
      { x:  67.0, z: -368.2, y: 61.2 },
    ],
  },

  /**
   * 石塀小路 -- an L-shaped stone alley between Nene-no-michi and Shimogawara.
   *
   * OSM maps only a 35 m east-west stub of it; the real alley is 100-150 m and
   * turns twice.  The stub's two ends are surveyed (LOW confidence on the
   * rest) and the turns here are authored from photographs -- flagged in the
   * uncertainty register.  It is 2.8 m wide, which with the walker's 0.34 m
   * radius leaves 2.1 m of usable width: enough, but nothing may be placed
   * against those walls without checking.
   */
  ishibekoji: {
    name: '石塀小路', label: 'Ishibe-koji',
    surface: 'slab', half: 1.4, frontage: 1.75, grade: 'ramp', conf: 'LOW',
    points: [
      { x: 57.6, z: -152.8, y: 56.5 },
      { x: 44.0, z: -154.0, y: 56.3 },
      { x: 32.0, z: -155.2, y: 56.1 },
      { x: 22.4, z: -155.9, y: 56.0 },
      { x: 18.0, z: -168.0, y: 56.4 },
      { x: 16.0, z: -186.0, y: 57.0 },
      { x: 17.0, z: -204.0, y: 57.5 },
      { x: 26.0, z: -212.0, y: 57.6 },
      { x: 44.0, z: -216.0, y: 57.6 },
      { x: 58.0, z: -219.0, y: 57.6 },
    ],
  },

  /* ------------------------------ the pagoda ------------------------------ */

  /**
   * 八坂通 -- the pagoda street.  THE sightline.
   *
   * Bearing 100.3 deg, one lane, 6.3 m face to face, and it climbs 5.1 % as it
   * goes -- which is the detail that makes the photograph work: the street
   * rises *toward* the pagoda, so the tower is lifted further out of the
   * rooflines than its height alone would put it.  Modelled flat, the classic
   * view collapses.
   */
  yasakadori: {
    name: '八坂通', label: 'Yasaka-dori',
    surface: 'sett', half: 2.1, frontage: 3.15, grade: 'ramp', bearing: 100.3,
    points: [
      { x: -187.9, z: -16.5, y: 50.6 },
      { x: -160.0, z: -11.5, y: 51.7 },
      { x: -130.0, z:  -8.0, y: 52.2 },
      { x: -115.4, z:  -7.6, y: 52.4 },
      { x:  -88.7, z:  -4.6, y: 53.0 },
      { x:  -64.6, z:  -2.3, y: 55.2 },
      { x:  -43.6, z:  -0.7, y: 57.8 },
      { x:  -30.0, z:   6.0, y: 59.2 },
      { x:  -21.8, z:  13.4, y: 59.8 },
    ],
  },

  /** 八坂庚申堂 -- the little lane north to the Koshin-do. */
  koshindoLane: {
    name: '庚申堂道', label: 'Koshin-do lane',
    surface: 'sett', half: 1.5, frontage: 2.0, grade: 'ramp',
    points: [
      { x: -36.0, z:   2.0, y: 58.6 },
      { x: -35.0, z:  14.0, y: 59.6 },
      { x: -34.0, z:  26.0, y: 60.4 },
    ],
  },

  /**
   * The pagoda-to-Sannenzaka link.  OSM tags this 三年坂 as well; functionally
   * it is the stretch that carries you from the pagoda's foot east and uphill
   * to the head of Sannenzaka.
   */
  pagodaLink: {
    name: '八坂通東', label: 'pagoda to Sannenzaka',
    surface: 'slab', half: 2.5, frontage: 4.2, grade: 'ramp', bearing: 106.6,
    points: [
      { x: -21.8, z:  13.4, y: 59.8 },
      { x:   6.0, z:  20.0, y: 61.4 },
      { x:  36.0, z:  26.0, y: 62.2 },
      { x:  52.6, z:  28.4, y: 62.4 },
      { x:  80.0, z:  36.0, y: 64.6 },
      { x: 110.0, z:  48.0, y: 67.0 },
      { x: 142.0, z:  61.9, y: 69.7 },
    ],
  },

  /* ------------------------------- the climb ------------------------------ */

  /**
   * 二年坂 -- Ninenzaka.  Runs NORTH-SOUTH, from the Nene-no-michi end down at
   * z = -79 to the Sannenzaka junction at z = +62.  17 steps in one flight.
   */
  ninenzaka: {
    name: '二年坂', label: 'Ninenzaka',
    surface: 'slab', half: 2.0, frontage: 3.05, grade: 'ramp', bearing: 176.3,
    points: [
      { x: 132.8, z: -78.9, y: 63.3 },
      { x: 134.0, z: -56.0, y: 63.7 },
      { x: 135.4, z: -34.0, y: 64.2 },
      { x: 136.6, z: -14.0, y: 64.8 },
      { x: 137.6, z:   4.0, y: 66.2 },
      { x: 138.6, z:  20.0, y: 67.4 },
      { x: 139.8, z:  38.0, y: 68.4 },
      { x: 141.0, z:  52.0, y: 69.2 },
      { x: 142.0, z:  61.9, y: 69.7 },
    ],
    /* OSM: 17 steps over a 15.9 m way -- treads of 0.94 m, risers of 0.13 m.
     * Placed at the fraction of arc length where the flight actually is. */
    steps: [{ from: 0.60, to: 0.73, riser: 0.13 }],
  },

  /**
   * 産寧坂 -- Sannenzaka.  The steeper of the two, 5.4 % overall, with a flight
   * of 46 steps over 32 m near the top.  That flight alone is +25 %.
   */
  sannenzaka: {
    name: '産寧坂', label: 'Sannenzaka',
    surface: 'slab', half: 2.0, frontage: 3.7, grade: 'ramp', bearing: 180.3,
    points: [
      { x: 142.0, z:  61.9, y: 69.7 },
      { x: 144.5, z:  92.0, y: 70.6 },
      { x: 147.5, z: 124.0, y: 71.6 },
      { x: 150.5, z: 158.0, y: 72.7 },
      { x: 153.0, z: 196.0, y: 74.1 },
      { x: 154.8, z: 231.0, y: 75.4 },
      { x: 152.0, z: 242.0, y: 77.6 },
      { x: 147.0, z: 252.0, y: 79.8 },
      { x: 142.3, z: 260.4, y: 81.4 },
    ],
    /* OSM: 46 steps over 32.0 m -- treads of 0.70 m, risers of 0.14 m. */
    steps: [{ from: 0.80, to: 0.98, riser: 0.14 }],
  },

  /** 清水道 -- the lower Kiyomizu approach from Higashioji.  7.9 %, asphalt. */
  kiyomizuzakaLower: {
    name: '清水道', label: 'Kiyomizu-michi',
    surface: 'asphalt', half: 3.0, frontage: 4.7, grade: 'ramp', bearing: 115.5,
    points: [
      { x: -204.9, z: 102.4, y: 51.7 },
      { x: -160.0, z: 122.0, y: 53.6 },
      { x: -110.0, z: 145.0, y: 56.4 },
      { x:  -50.0, z: 173.0, y: 60.4 },
      { x:   10.0, z: 199.0, y: 65.0 },
      { x:   64.0, z: 222.0, y: 70.0 },
      { x:  104.0, z: 243.0, y: 75.6 },
      { x:  134.9, z: 261.3, y: 81.1 },
    ],
  },

  /** 清水坂 -- the upper, pedestrianised shop street.  7.7 %. */
  kiyomizuzaka: {
    name: '清水坂', label: 'Kiyomizu-zaka',
    surface: 'sett', half: 2.75, frontage: 3.8, grade: 'ramp', bearing: 111,
    points: [
      { x: 134.8, z: 261.3, y: 81.1 },
      { x: 168.0, z: 274.0, y: 83.7 },
      { x: 204.0, z: 288.0, y: 86.4 },
      { x: 242.0, z: 302.0, y: 89.4 },
      { x: 278.0, z: 315.0, y: 92.4 },
      { x: 310.0, z: 328.0, y: 95.4 },
      { x: 334.9, z: 337.6, y: 98.1 },
      { x: 356.0, z: 343.0, y: 101.4 },
      { x: 373.4, z: 347.1, y: 104.5 },
    ],
  },

  /** 茶わん坂 -- the potters' street.  Quieter, and it joins by steps. */
  chawanzaka: {
    name: '茶わん坂', label: 'Chawan-zaka',
    surface: 'asphalt', half: 2.5, frontage: 3.55, grade: 'ramp', bearing: 93.5,
    points: [
      { x: -104.1, z: 367.9, y: 59.5 },
      { x:  -40.0, z: 372.0, y: 63.0 },
      { x:   30.0, z: 377.0, y: 67.4 },
      { x:  100.0, z: 381.0, y: 72.4 },
      { x:  170.0, z: 385.0, y: 77.0 },
      { x:  240.0, z: 389.0, y: 81.4 },
      { x:  302.2, z: 392.7, y: 85.3 },
      { x:  340.0, z: 380.0, y: 92.0 },
      { x:  368.0, z: 364.0, y: 99.0 },
      { x:  380.0, z: 352.0, y: 104.0 },
    ],
    steps: [{ from: 0.84, to: 0.98, riser: 0.15 }],
  },

  /* ---------------------------- Kiyomizu-dera ---------------------------- */

  /**
   * The precinct approach.  Niomon -> Saimon -> three-storey pagoda ->
   * Todoroki-mon -> Hondo, climbing 104.5 m to 115.5 m over about 200 m.
   */
  kiyomizuPrecinct: {
    name: '清水寺境内', label: 'Kiyomizu precinct', kind: 'precinct',
    surface: 'slab', half: 5.0, frontage: 8.0, grade: 'ramp',
    points: [
      { x: 373.4, z: 347.1, y: 104.5 },
      { x: 386.0, z: 362.0, y: 108.4 },
      { x: 397.8, z: 378.6, y: 111.8 },
      { x: 418.9, z: 387.6, y: 112.2 },
      { x: 442.0, z: 398.0, y: 113.2 },
      { x: 475.7, z: 419.7, y: 114.9 },
      { x: 500.0, z: 419.0, y: 115.3 },
      { x: 519.9, z: 418.6, y: 115.5 },
    ],
  },

  /** Out to Okunoin, then down the steps to the Otowa waterfall. */
  okunoinPath: {
    name: '奥の院道', label: 'Okunoin path', kind: 'precinct',
    surface: 'slab', half: 2.4, frontage: 3.8, grade: 'ramp',
    /* Hugs the Hondo's east side before turning south.  The first version ran
     * straight out of the stage's centre toward Okunoin, which crosses the head
     * of the ravine -- so its paving ribbon flew over the void.  Flagged by the
     * temple builder, who could see it from under the stage. */
    points: [
      { x: 528.4, z: 419.0, y: 115.5 },
      { x: 546.0, z: 421.0, y: 115.8 },
      { x: 566.0, z: 428.0, y: 116.2 },
      { x: 577.4, z: 441.9, y: 116.3 },
      { x: 586.0, z: 452.0, y: 114.0 },
      { x: 580.0, z: 462.0, y: 108.0 },
      { x: 566.0, z: 466.0, y: 101.0 },
      { x: 547.9, z: 458.8, y: 96.0 },
    ],
    steps: [{ from: 0.52, to: 0.88, riser: 0.16 }],
  },

  /** On south to the Koyasu pagoda, across the valley. */
  koyasuPath: {
    name: '子安塔道', label: 'Koyasu path', kind: 'precinct',
    surface: 'slab', half: 1.9, frontage: 3.0, grade: 'ramp',
    points: [
      { x: 547.9, z: 458.8, y: 96.0 },
      { x: 546.0, z: 490.0, y: 98.0 },
      { x: 540.0, z: 528.0, y: 103.0 },
      { x: 530.0, z: 570.0, y: 109.0 },
      { x: 521.2, z: 624.8, y: 116.6 },
    ],
    steps: [{ from: 0.20, to: 0.90, riser: 0.16 }],
  },
};

/* ------------------------------------------------------------------ *
 * The base hillside.
 *
 * Between the streets, the ground is the Higashiyama slope: the Kyoto basin
 * floor to the west at about 38 m, rising eastward to the wooded ridge behind
 * Kiyomizu-dera at 240-250 m.  The profile below is fitted to the GSI DEM
 * along the route, and the important part is what it does *past* the temple:
 * the ridge is what closes every eastward view and what the temple is tucked
 * into, and it is 120 m above the stage.
 * ------------------------------------------------------------------ */

export const HILL_PROFILE = [
  [-900, 37.0], [-700, 38.0], [-500, 38.8], [-380, 39.2],
  [-260, 41.0], [-190, 47.0], [-140, 52.0], [-80, 56.0],
  [0, 61.3], [70, 63.5], [140, 68.0], [210, 73.0],
  [300, 82.0], [380, 96.0], [460, 110.0], [530, 118.0],
  [600, 132.0], [700, 168.0], [820, 214.0], [960, 252.0],
  [1200, 292.0], [1500, 320.0],
];

/**
 * North-south correction, in metres of rise per metre of +z (south).
 * Small: the hill is a wall running north-south, so the route climbs *into*
 * it rather than along it.  Kiyomizu (z = +420) is genuinely a little higher
 * than Yasaka (z = -560) at the same x, and this is that.
 */
export const HILL_TILT = 0.010;

/* ------------------------------------------------------------------ *
 * Districts.
 *
 * A named region with a box, used for batching (one baker each), the place
 * name in the HUD, QA reporting, and deciding which builder owns a piece of
 * ground.  Boxes may overlap at the seams -- that is what makes the world
 * continuous rather than a set of rooms.  First match wins, so the small
 * specific ones come before the large general ones.
 * ------------------------------------------------------------------ */

export const DISTRICTS = [
  { id: 'shirakawa',   name: '祇園白川',    label: 'Gion Shirakawa',  x0: -620, x1: -380, z0: -840, z1: -730 },
  { id: 'gion',        name: '祇園',        label: 'Gion',            x0: -660, x1: -330, z0: -730, z1: -545 },
  { id: 'hanamikoji',  name: '花見小路',    label: 'Hanamikoji',      x0: -470, x1: -340, z0: -600, z1: -300 },
  { id: 'yasaka',      name: '八坂神社',    label: 'Yasaka Shrine',   x0: -175, x1:  -20, z0: -660, z1: -455 },
  { id: 'maruyama',    name: '円山公園',    label: 'Maruyama Park',   x0:  -18, x1:  220, z0: -660, z1: -440 },
  { id: 'shimogawara', name: '下河原',      label: 'Shimogawara',     x0: -110, x1:  -18, z0: -462, z1:  -20 },
  { id: 'nene',        name: 'ねねの道',    label: 'Nene-no-michi',   x0:   18, x1:  120, z0: -400, z1:  -60 },
  { id: 'ishibekoji',  name: '石塀小路',    label: 'Ishibe-koji',     x0:    4, x1:   72, z0: -226, z1: -140 },
  { id: 'kodaiji',     name: '高台寺',      label: 'Kodai-ji',        x0:   90, x1:  260, z0: -300, z1: -120 },
  { id: 'pagoda',      name: '八坂の塔',    label: 'Yasaka Pagoda',   x0: -200, x1:   70, z0:  -46, z1:   50 },
  { id: 'ninenzaka',   name: '二年坂',      label: 'Ninenzaka',       x0:  100, x1:  180, z0:  -95, z1:   70 },
  { id: 'sannenzaka',  name: '産寧坂',      label: 'Sannenzaka',      x0:  115, x1:  200, z0:   66, z1:  270 },
  { id: 'kiyomizuzaka',name: '清水坂',      label: 'Kiyomizu-zaka',   x0:  130, x1:  380, z0:  250, z1:  360 },
  { id: 'kiyomizumichi',name: '清水道',     label: 'Kiyomizu-michi',  x0: -230, x1:  140, z0:   90, z1:  275 },
  { id: 'chawanzaka',  name: '茶わん坂',    label: 'Chawan-zaka',     x0: -130, x1:  330, z0:  350, z1:  420 },
  { id: 'kiyomizu',    name: '清水寺',      label: 'Kiyomizu-dera',   x0:  360, x1:  620, z0:  330, z1:  500 },
  { id: 'koyasu',      name: '子安塔',      label: 'Koyasu pagoda',   x0:  480, x1:  600, z0:  480, z1:  660 },
  { id: 'higashioji',  name: '東大路',      label: 'Higashioji-dori', x0: -240, x1: -160, z0: -740, z1:  440 },
  { id: 'hillside',    name: '東山',        label: 'the Higashiyama slope', x0: 600, x1: 1200, z0: -800, z1: 700 },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
  }
  return null;
}

/** World bounds -- the player is clamped to these. */
export const BOUNDS = { x0: -680, x1: 700, z0: -860, z1: 700 };
