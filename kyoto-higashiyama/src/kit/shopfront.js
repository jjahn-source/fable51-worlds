import * as THREE from 'three';
import { PAL, CERAMIC } from '../core/palette.js';
import { TINT, flat } from '../core/toon.js';
import { rngKit, clamp, lerp, trs, bake } from '../core/util.js';
import {
  makeMachiya, snapKen, KEN, CLEAR_HALF, CLEAR_BAY, SHADE, texMesh,
} from './machiya.js';
import { interiorTex, menuBoard, priceStrip, cached } from '../core/textures.js';

/* ==================================================================== *
 * The street-level retail unit.
 *
 * A shopfront here is a machiya with its 見世 (mise) bay opened to the
 * street.  It is NOT a sign on a box: the building volume stops short of the
 * frontage line, piers and a header frame a real hole, a threshold stone sits
 * in front of it, and the last 0.9 m is filled with goods.  `makeMachiya`
 * builds the shell -- 真壁 frame, 通り庇, 格子, roof -- and hands this file a
 * dressing hook, so a shop and the house next door share a construction and
 * differ only in what is displayed and how the mouth is closed.  That is why
 * a shopping street reads as a street.
 *
 * Everything here bakes into the SAME merged mesh as its building.
 *
 * ------------------------------------------------- WHY NO LABELS
 *
 * A kind must be legible from the paving by **what is displayed and how the
 * frontage is fronted**, not by reading its sign.  So:
 *
 *   ceramics    a 雛壇 -- a stepped rank of tea bowls under a dark cloth
 *   yatsuhashi  a sample tray on a stand and a wall of price strips
 *   pickles     a chilled tasting counter at the street edge, glass-topped
 *               (NOT open cedar barrels -- STREET.md flags that as an absence
 *               on these three streets; the barrel belongs indoors)
 *   matcha      a 縁台 bench under 緋毛氈 with a red 野点傘 over it
 *   fans        a wall rack of opened fans, the loudest colour on the street
 *   sake        a 杉玉 cedar ball over the door and a 酒屋格子 you could roll
 *               a barrel against
 *   tofu        a 麩屋格子 with a boarded lower panel and water tubs
 *   incense     long shallow glass-topped drawers, and nothing else
 *
 * ------------------------------------------------- ORDINANCE CLAMPS
 *
 * Kyoto's 屋外広告物条例 art-directs this district already, and these are
 * enforced here rather than left to taste (STREET.md 6.1):
 *
 *   total sign area per elevation  <= 3.0 m^2
 *   projecting sign                <= 3.0 m^2, projection <= 1.0 m,
 *                                     clearance >= 2.5 m
 *   standing sign / A-board        <= 2.0 m tall
 *   rooftop signage                FORBIDDEN
 *   type                           mincho or brush, never gothic
 *
 * ==================================================================== *
 * PROP KINDS REQUESTED  (ctx.prop -- placeholder-safe; an unimplemented kind
 * is collected and ignored).  Dimensions are what this file assumes at
 * `scale: 1`; `y` is always the ground the prop stands on.
 *
 *   'crate'        木箱 -- 0.40 x 0.30 x 0.25 slatted produce crate.
 *                  variant 0 empty, 1 with goods, 2 upturned.
 *   'basket'       竹籠 -- round bamboo basket, 0.34 dia x 0.22.
 *   'barrel'       樽 -- cedar barrel with bamboo hoops, 0.50 dia x 0.60.
 *                  variant 0 sake 酒樽 (straw-wrapped 菰樽 at variant 1),
 *                  2 pickle 漬物樽 with a stone on the lid.
 *   'sack'         叺 -- hemp sack, 0.35 x 0.50, slumped.  Rice, beans, coffee.
 *   'bucket'       手桶 -- wooden pail with a handle, 0.30 dia x 0.28.
 *   'broom'        竹箒 -- 1.5 m, leaning against a wall at ~12 deg.
 *   'stool'        床几 stool -- 0.32 x 0.32 x 0.42 plain timber.
 *   'parasol'      野点傘 -- red paper parasol, 1.8 m dia, on a 2.1 m pole,
 *                  tilted ~8 deg.  `rot` aims the tilt.
 *   'umbrellaStand' 傘立て -- 0.35 dia x 0.50, with a few umbrellas.
 *   'bicycle'      ママチャリ -- 1.75 m, leaning, basket on the front.
 *   'sugidama'     杉玉 -- the cedar ball hung over a sake shop's door,
 *                  0.40 dia; `y` is the hanging point.  variant 0 fresh
 *                  green, 1 aged brown.
 *   'sampleTray'   試食皿 -- 0.35 x 0.25 tray on a 0.90 m stand.
 *   'uekibachi'    植木鉢 -- bare pot, 0.28 dia.  (`ctx.tree({kind:'potted'})`
 *                  for the planted version.)
 *   'chochin'      提灯 -- 9号長型, 0.24 dia x 0.57.  `y` = hanging point.
 * ==================================================================== */

const O = SHADE;

/* ------------------------------------------------------------------ *
 * Strings.  Every one of these is from STREET.md 2.1-2.3 and is correctly
 * written for its trade.  Type is mincho or brush; gothic reads as a
 * convenience store, which is the exact distinction the ordinance exists to
 * preserve.
 * ------------------------------------------------------------------ */

const CLOTH = {
  indigo: { cloth: PAL.norenIndigo, textColor: PAL.norenCream },
  navy: { cloth: PAL.norenNavy, textColor: PAL.norenCream },
  cream: { cloth: PAL.norenCream, textColor: PAL.black },
  brown: { cloth: PAL.norenBrown, textColor: PAL.norenCream },
  crimson: { cloth: PAL.norenRed, textColor: PAL.norenCream },
  green: { cloth: PAL.norenGreen, textColor: PAL.norenCream },
  purple: { cloth: PAL.norenPurple, textColor: PAL.norenCream },
};
const CEDAR = { board: PAL.timberPale, textColor: PAL.black };
const LACQUER = { board: 0x2a2228, textColor: PAL.gold };

/* ------------------------------------------------------------------ *
 * The trades.  `front` decides how the mouth is closed:
 *
 *   'open'    no glazing at all -- the street walks in.  Food and souvenir.
 *   'glazed'  a sliding glazed lattice screen across the recess.  Craft.
 *   'counter' a takeaway window at 1.1 m in an otherwise closed frontage.
 *   'closed'  lattice all the way across; the dressing is outside only.
 *             Restaurants and anything discreet.
 * ------------------------------------------------------------------ */

const SHOP = {
  wagashi: {
    ja: '和菓子', front: 'glazed', lattice: 'itoya', interior: 'shop',
    noren: { text: '御菓子司', ...CLOTH.cream, panels: 5 },
    kanban: { text: '京菓匠', ...LACQUER },
    display: 'case', menu: ['わらび餅　９２０円', 'みたらし団子　６００円', '白玉ぜんざい　９３０円', 'いちご大福　４００円'],
    strip: [['生麩饅頭', '４２０円'], ['みたらし', '１５０円'], ['わらび餅', '９２０円']],
    goods: [PAL.sweetPink, PAL.sweetGreen, PAL.wagashi, PAL.paperWarm], props: ['sampleTray'],
  },
  matcha: {
    ja: '甘味処', front: 'open', lattice: 'itoya', interior: 'tea',
    noren: { text: '甘味処', ...CLOTH.crimson, panels: 3 },
    kanban: { text: '茶寮', ...LACQUER },
    display: 'teahouse',
    menu: ['抹茶（おうす）　８５０円', '抹茶パフェ　１，２００円', 'わらび餅　９２０円', 'ほうじ茶　７５０円', 'かき氷　９８０円'],
    strip: [['抹茶ソフト', '５００円'], ['冷やしあめ', '３００円'], ['ぜんざい', '７００円']],
    goods: [PAL.matcha, PAL.matchaDeep], props: ['parasol', 'stool'],
  },
  ceramics: {
    ja: '清水焼', front: 'glazed', lattice: 'fine', interior: 'ceramic',
    noren: { text: '器', ...CLOTH.cream, panels: 3 },
    kanban: { text: '清水焼窯元', ...CEDAR },
    display: 'hinadan', menu: null,
    strip: [['ぐい呑', '１，８００円'], ['抹茶碗', '６，６００円'], ['小皿', '９８０円']],
    goods: CERAMIC, props: ['crate'],
  },
  incense: {
    ja: '香', front: 'glazed', lattice: 'fine', interior: 'shop',
    noren: { text: '御香', ...CLOTH.brown, panels: 3 },
    kanban: { text: '香老舗', ...LACQUER },
    display: 'drawers', menu: null,
    strip: [['線香', '１，１００円'], ['匂袋', '８８０円']],
    goods: [0x6b4a38, 0x8a6647, PAL.paperWarm], props: [],
  },
  fans: {
    ja: '京扇子', front: 'glazed', lattice: 'fine', interior: 'shop',
    noren: { text: '扇', ...CLOTH.indigo, panels: 3 },
    kanban: { text: '京扇堂', ...LACQUER },
    display: 'fanrack', menu: null,
    strip: [['京扇子', '４，４００円'], ['夏扇', '２，２００円']],
    goods: [0xc4443a, 0x35507a, 0xc9a24e, 0x6e5482, 0xf7f4ee, 0x3f6152], props: [],
  },
  komono: {
    ja: '和小物', front: 'open', lattice: 'itoya', interior: 'shop',
    noren: { text: '染', ...CLOTH.indigo, panels: 3 },
    kanban: { text: '手ぬぐい', ...CEDAR },
    display: 'cloth', menu: null,
    strip: [['手ぬぐい', '１，３２０円'], ['がま口', '１，６５０円']],
    goods: [0xb47a8c, 0x6e7ea8, 0x8a9c6e, 0xc4a878, 0x9c6e84, 0x5c6e7c], props: ['basket'],
  },
  crafts: {
    ja: '工芸', front: 'glazed', lattice: 'komeya', interior: 'shop',
    noren: { text: '和', ...CLOTH.indigo, panels: 3 },
    kanban: { text: '竹細工', ...CEDAR },
    display: 'shelves', menu: null,
    strip: [['京こま', '１，１００円'], ['竹籠', '４，８００円']],
    goods: [PAL.bambooCulm, PAL.timberPale, PAL.timberWarm, PAL.paperWarm], props: ['basket', 'crate'],
  },
  souvenir: {
    ja: '土産', front: 'open', lattice: 'sakaya', interior: 'shop',
    noren: { text: '御土産', ...CLOTH.cream, panels: 5 },
    kanban: { text: '京銘菓', ...CEDAR },
    display: 'shelves',
    menu: ['生八ツ橋　１０個入　５００円', '京ばあむ　１４００円', '八ツ橋　試食できます'],
    strip: [['生八ツ橋', '５００円'], ['京ばあむ', '１４００円'], ['ちりめん', '８８０円']],
    goods: [PAL.paperWarm, PAL.sweetPink, PAL.sweetGreen, PAL.wagashi, PAL.red], props: ['crate', 'basket'],
  },
  restaurant: {
    ja: '京料理', front: 'closed', lattice: 'itoya', interior: 'shop',
    noren: { text: '御料理', ...CLOTH.indigo, panels: 5 },
    kanban: { text: '懐石料理', ...LACQUER },
    display: 'samplecase',
    menu: ['京懐石　５５００円より', '昼の膳　３３００円', '御弁当　２２００円'],
    strip: null, goods: [PAL.paperWarm, PAL.tatami], props: ['uekibachi', 'bucket'], lanterns: 2,
  },
  soba: {
    ja: '蕎麦', front: 'counter', lattice: 'itoya', interior: 'shop',
    noren: { text: '手打蕎麦', ...CLOTH.indigo, panels: 3 },
    kanban: { text: '名代', ...CEDAR },
    display: 'samplecase',
    menu: ['にしんそば　１１００円', 'ざるそば　８００円', 'きつねうどん　１０００円', '天ざるそば　１３００円'],
    strip: null, goods: [PAL.paperWarm], props: ['uekibachi'], lanterns: 1,
  },
  tofu: {
    ja: '湯どうふ', front: 'counter', lattice: 'komeya', interior: 'shop',
    noren: { text: '湯どうふ', ...CLOTH.indigo, panels: 3 },
    kanban: { text: '京料理', ...LACQUER },
    display: 'tubs',
    menu: ['ゆどうふコース　３０００円', '湯葉料理　３６３０円', '生ゆば　６００円'],
    strip: [['生ゆば', '６００円'], ['ゆば刺', '８８０円']],
    goods: [PAL.white, PAL.paper], props: ['bucket', 'stool'], wetTrade: true,
  },
  coffee: {
    ja: '珈琲', front: 'glazed', lattice: 'fine', interior: 'shop',
    noren: { text: '喫茶', ...CLOTH.brown, panels: 3 },
    kanban: { text: '珈琲', ...CEDAR },
    display: 'counter',
    menu: ['珈琲　６００円', '抹茶ラテ　７００円', 'ほうじ茶ラテ　７００円', '京ばあむセット　１２００円'],
    strip: [['珈琲', '６００円'], ['ケーキ', '６５０円']],
    goods: [0x4a3a33, 0x6b5040, PAL.white], props: ['sack', 'stool'],
  },
  pickles: {
    ja: '京漬物', front: 'open', lattice: 'komeya', interior: 'shop',
    noren: { text: '京漬物', ...CLOTH.brown, panels: 3 },
    kanban: { text: 'つけもの', ...CEDAR },
    display: 'chilled',
    menu: ['千枚漬　１，０８０円', 'しば漬　６４８円', '味わい漬　８６４円'],
    strip: [['千枚漬', '１０８０円'], ['すぐき', '１２００円'], ['しば漬', '６４８円']],
    goods: [0xb4cc8c, 0x9c6e84, 0xc4a878, 0xe4dcc8], props: ['crate'],
  },
  yatsuhashi: {
    ja: '八ツ橋', front: 'open', lattice: 'sakaya', interior: 'shop',
    noren: { text: '八ツ橋', ...CLOTH.cream, panels: 5 },
    kanban: { text: '元祖', ...CEDAR },
    display: 'trays',
    menu: ['生八ッ橋　１８５g　２５０円', 'あん生八ッ橋　４個　２５０円', 'ニッキ　１０個　６８０円', '焼き八ッ橋　１２枚　２５０円'],
    strip: [['生八ッ橋', '２５０円'], ['ニッキ', '６８０円'], ['試食', 'し放題']],
    goods: [PAL.sweetPink, PAL.sweetGreen, 0xd8cdb4, 0xb0a48c, 0x9c6e84], props: ['sampleTray', 'crate'],
  },
  sake: {
    ja: '酒', front: 'glazed', lattice: 'sakaya', interior: 'shop',
    noren: { text: '酒', ...CLOTH.indigo, panels: 3 },
    kanban: { text: '銘酒', ...CEDAR },
    display: 'bottles',
    menu: null,
    strip: [['純米', '２２００円'], ['大吟醸', '４４００円']],
    goods: [0x2f4438, 0x4a5c6e, PAL.glassDark, PAL.white], props: ['barrel', 'crate'], sugidama: true,
  },
};
/** Aliases, so a district can say what it means. */
const ALIAS = {
  tea: 'matcha', teahouse: 'matcha', sweets: 'wagashi', kashi: 'wagashi',
  pottery: 'ceramics', kiyomizuyaki: 'ceramics', ko: 'incense', sensu: 'fans',
  textiles: 'komono', kimono: 'komono', craft: 'crafts', omiyage: 'souvenir',
  kaiseki: 'restaurant', ryotei: 'restaurant', noodles: 'soba', udon: 'soba',
  yuba: 'tofu', cafe: 'coffee', tsukemono: 'pickles',
};

export const SHOPFRONT_KINDS = Object.keys(SHOP);

/* ------------------------------------------------------------------ *
 * Display geometry.  All of it goes into the machiya's own Parts collector,
 * so a shop is still one merged mesh with its building.
 * ------------------------------------------------------------------ */

/** A short cylinder -- bowls, cups, tins, jars.  Six sides is enough. */
function disc(rt, rb, h, x, y, z, seg = 6) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y + h / 2, z);
  return g;
}

/**
 * 雛壇 -- the stepped display rank.  1.2 W x 0.6 D x 1.1 H, three or four
 * shelves under a dark cloth.  This is what a Kiyomizu-zaka pottery shop
 * actually puts on the pavement, and it is the whole read of the trade.
 */
function hinadan(P, { x0, x1, y, z, depth = 0.58, rise = 0.19, steps = 3, cloth = PAL.tatamiEdge }) {
  const w = x1 - x0, cx = (x0 + x1) / 2;
  const dz = depth / steps;
  for (let s = 0; s < steps; s++) {
    const sy = y + s * rise;
    // the tread, and the riser BELOW its front edge -- a riser written above
    // the tread it belongs to hides everything standing on the step in front
    P.box(cloth, O.timberDeep, w, 0.04, dz + 0.02, cx, sy - 0.02, z + dz * (s + 0.5));
    P.box(cloth, O.timberDeep, w, s === 0 ? 0.16 : rise, 0.035,
      cx, sy - 0.02 - (s === 0 ? 0.08 : rise / 2), z + dz * s - 0.015);
  }
  // the trestle it stands on
  for (const s of [-1, 1]) {
    for (const dzz of [0.08, depth - 0.08]) {
      P.box(PAL.timberMid, O.timber, 0.055, y - 0.18, 0.055,
        cx + s * (w / 2 - 0.07), (y - 0.18) / 2, z + dzz);
    }
  }
  return { dz, rise };
}

/** A row of small goods on a shelf. */
function goodsRow(P, R, { x0, x1, y, z, colors, n, form = 'bowl', scale = 1 }) {
  const w = x1 - x0;
  const p = w / n;
  for (let i = 0; i < n; i++) {
    const gx = x0 + p * (i + 0.5) + R.gauss() * p * 0.08;
    const c = colors[Math.floor(R.next() * colors.length) % colors.length];
    const s = scale * R.range(0.85, 1.12);
    if (form === 'bowl') {
      P.add(disc(0.052 * s, 0.030 * s, 0.048 * s, gx, y, z), c, O.plaster);
    } else if (form === 'plate') {
      P.add(disc(0.062 * s, 0.058 * s, 0.014 * s, gx, y, z), c, O.plaster);
    } else if (form === 'cup') {
      P.add(disc(0.030 * s, 0.024 * s, 0.055 * s, gx, y, z), c, O.plaster);
    } else if (form === 'box') {
      P.box(c, O.plaster, 0.115 * s, 0.055 * s, 0.085 * s, gx, y + 0.028 * s, z);
    } else if (form === 'flatbox') {
      const stack = 1 + Math.floor(R.next() * 3);
      for (let k = 0; k < stack; k++) {
        P.box(c, O.plaster, 0.150 * s, 0.038 * s, 0.110 * s, gx, y + 0.019 * s + k * 0.038 * s, z);
      }
    } else if (form === 'bottle') {
      P.add(disc(0.028 * s, 0.034 * s, 0.24 * s, gx, y, z), c, O.dark);
    } else if (form === 'tin') {
      P.add(disc(0.038 * s, 0.038 * s, 0.085 * s, gx, y, z), c, O.timber);
    } else if (form === 'sweet') {
      P.add(disc(0.030 * s, 0.030 * s, 0.022 * s, gx, y, z, 6), c, O.plaster);
    }
  }
}

/** A glazed counter case -- confectioner, pickle taster, food sample. */
function glassCase(ctx, f, { x0, x1, y, z, d = 0.55, h = 0.95, body = PAL.timberMid }) {
  const P = f.P, w = x1 - x0, cx = (x0 + x1) / 2;
  P.box(body, O.timber, w, h - 0.34, d, cx, (h - 0.34) / 2 + y, z + d / 2);
  P.box(PAL.timberDark, O.timberDeep, w + 0.03, 0.05, d + 0.03, cx, y + h - 0.33, z + d / 2);
  // the frame of the glazed top, built as four members with air between them
  for (const s of [-1, 1]) {
    P.box(PAL.metalDark, O.tile, 0.035, 0.30, d, cx + s * (w / 2 - 0.02), y + h - 0.16, z + d / 2);
  }
  P.box(PAL.metalDark, O.tile, w, 0.035, d, cx, y + h - 0.015, z + d / 2);
  // the glass itself: its own mesh, cool and not too transparent, no shadow
  const g = new THREE.PlaneGeometry(w - 0.06, 0.29);
  g.rotateY(Math.PI);
  g.translate(cx, y + h - 0.17, z - 0.005);
  const m = new THREE.Mesh(g, flat({
    color: PAL.glass, transparent: true, opacity: 0.30, depthWrite: false, cache: true,
  }));
  m.applyMatrix4(f.M);
  m.userData.noOutline = true;
  m.userData.noShadow = true;
  ctx.add(m);
  return { top: y + h - 0.34 };
}

/** The painted interior, ON THE FACE of the cut-back volume. */
function interiorPanel(ctx, f, { x0, x1, y0, y1, z, kind }) {
  const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
  g.rotateY(Math.PI);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, z);
  return texMesh(ctx, g, interiorTex(kind), f.M,
    { bands: 'deep', tint: TINT.cool, color: 0xa89ca8, noOutline: true });
}

/**
 * 短冊掛け -- the menu rack.  A timber frame at the shop mouth carrying 8-20
 * brush-written strips.  One textured plane, because twenty separate slips
 * would be twenty draw calls for a thing you read once.
 */
function menuRack(ctx, f, { cx, y, z, w = 0.60, h = 1.10, items, title = null }) {
  const P = f.P;
  P.box(PAL.timberMid, O.timber, w + 0.07, 0.05, 0.045, cx, y + h + 0.02, z);
  P.box(PAL.timberMid, O.timber, w + 0.07, 0.05, 0.045, cx, y - 0.02, z);
  for (const s of [-1, 1]) P.box(PAL.timberMid, O.timber, 0.045, h, 0.045, cx + s * (w / 2 + 0.02), y + h / 2, z);
  const g = new THREE.PlaneGeometry(w, h);
  g.rotateY(Math.PI);
  g.translate(cx, y + h / 2, z - 0.032);
  const tex = cached('menuRack|' + (title || '') + '|' + items.join('/'),
    () => menuBoard(title, items.map((s) => [s, null]), { board: PAL.paperWarm, w: 320, h: 512 }));
  return texMesh(ctx, g, tex, f.M, { bands: 'soft3', tint: TINT.cool });
}

/** 立て看板 -- the A-board on the paving.  Ordinance cap: 2.0 m tall. */
function aBoard(ctx, f, { cx, z, items, title }) {
  const P = f.P;
  const h = 0.92, w = 0.56;
  const y = 0;
  for (const s of [-1, 1]) {
    P.box(PAL.timberMid, O.timber, 0.05, h, 0.05, cx + s * (w / 2), y + h / 2, z + 0.10);
  }
  P.box(PAL.timberMid, O.timber, w + 0.10, 0.05, 0.05, cx, y + h + 0.02, z + 0.10);
  const g = new THREE.PlaneGeometry(w, h - 0.08);
  g.rotateY(Math.PI);
  g.rotateX(-0.14);                       // it leans back on its own hinge
  g.translate(cx, y + h / 2, z + 0.06);
  const tex = cached('aBoard|' + (title || '') + '|' + items.join('/'),
    () => menuBoard(title, items.map((s) => [s, null]),
      { board: 0x3a3028, textColor: PAL.paper, accent: PAL.gold, w: 320, h: 448 }));
  return texMesh(ctx, g, tex, f.M, { bands: 3, tint: TINT.warm });
}

/* ==================================================================== *
 * makeShopfront
 * ==================================================================== */

export function makeShopfront(ctx, opt = {}) {
  const rawKind = opt.kind || 'souvenir';
  const kind = SHOP[rawKind] ? rawKind : (ALIAS[rawKind] || 'souvenir');
  const K = SHOP[kind];
  const seed = (opt.seed ?? 1) >>> 0 || 1;
  const R = rngKit(seed ^ 0x9e37);

  const snap = snapKen(opt.width ?? 3 * KEN, { min: 2, max: 6 });
  const nBays = snap.bays;

  /* Which bays open to the street.  The 通り庭 keeps its bay whatever the
   * trade, so the mouth is everything else -- capped at two bays, because a
   * three-bay opening has nothing left to carry the frame. */
  const front = opt.front || K.front;
  const openBays = opt.openBays ?? (() => {
    if (front === 'closed' || front === 'counter') return [];
    const entryLast = Math.cos(opt.ry ?? 0) - Math.sin(opt.ry ?? 0) > 0;
    const all = [];
    for (let i = 0; i < nBays; i++) all.push(i);
    const usable = all.filter((i) => i !== (entryLast ? nBays - 1 : 0));
    return usable.slice(entryLast ? Math.max(0, usable.length - 2) : 0,
      entryLast ? usable.length : Math.min(2, usable.length));
  })();

  const lanterns = opt.lanterns ?? K.lanterns ?? 0;
  const name = opt.name || null;

  const res = makeMachiya(ctx, {
    x: opt.x, z: opt.z, ry: opt.ry,
    width: snap.width,
    depth: opt.depth ?? Math.round(5 + R.next() * 4) * KEN,
    floors: opt.floors ?? 1.5,
    style: opt.style || 'shop',
    latticeKind: opt.latticeKind || K.lattice,
    timberTone: opt.timberTone, plasterTone: opt.plasterTone,
    roofPitch: opt.roofPitch, roofMaterial: opt.roofMaterial,
    inuyarai: opt.inuyarai, komayose: opt.komayose,
    degoshi: opt.degoshi ?? (K.wetTrade ? 0.455 : undefined),
    mushikomado: opt.mushikomado, sudare: opt.sudare,
    udatsu: opt.udatsu, sodekabe: opt.sodekabe,
    entryBay: opt.entryBay, seed, baker: opt.baker || 'shops', lod: opt.lod,
    openBays,
    noren: opt.noren === false ? null : (opt.noren || (R.chance(0.82) ? {
      text: K.noren.text, cloth: K.noren.cloth, textColor: K.noren.textColor, panels: K.noren.panels,
    } : null)),
    signboard: opt.signboard === false ? null : (opt.signboard || {
      text: name || K.kanban.text, board: K.kanban.board, textColor: K.kanban.textColor,
      vertical: true, brush: K.kanban.board !== LACQUER.board,
    }),
    lanterns,
    dress: (f) => dressShopfront(ctx, f, { K, kind, R, front, name, lod: !!opt.lod, opt }),
  });

  return { ...res, kind, name, front, openBays };
}

/* ------------------------------------------------------------------ *
 * The dressing pass.  Runs inside `makeMachiya` before the bake, so all of
 * this merges into the building's own mesh.
 * ------------------------------------------------------------------ */

function dressShopfront(ctx, f, { K, kind, R, front, name, lod, opt }) {
  const P = f.P;
  const { sillY, lintelY, hisashiY, FRONT, ENTRY_REC, openSpans, bayW } = f;
  const headY = lintelY;                       // the 差鴨居, not the interior 内法
  const recZ = ENTRY_REC;                      // the back face of the recess
  let frontProj = 0;
  /* Sign area is capped at the ordinance limit and anything over it is simply
   * not built.  STREET.md 6.1: <= 3.0 m^2 per elevation, A-board <= 2.0 m
   * tall, nothing on a roof, nothing lit, nothing gothic. */
  let area = 0.30 * 1.02;                      // the 看板 makeMachiya already hung
  let hasRack = false;
  const canSign = (a) => (area + a <= 3.0 ? (area += a, true) : false);

  /* --------------------------- the mouth ----------------------------- */
  for (const [a, b] of openSpans) {
    const x0 = a + f.postD * 0.7, x1 = b - f.postD * 0.7;
    const cx = (x0 + x1) / 2;

    // the interior, on the face of the cut-back volume -- KIT.md section 10
    interiorPanel(ctx, f, {
      x0: x0 + 0.02, x1: x1 - 0.02, y0: sillY - 0.05, y1: headY - 0.05,
      z: recZ - 0.035, kind: K.interior,
    });
    // the recess floor, a shade darker than the street
    P.box(PAL.timberMid, O.timberDeep, x1 - x0, 0.05, recZ - FRONT + 0.30,
      cx, sillY + 0.02, FRONT - 0.15 + (recZ - FRONT + 0.30) / 2);

    if (front === 'glazed') {
      /* 引込みガラス格子戸 -- a sliding glazed lattice screen across the
       * recess.  Ordering, and it is the rule: reveal, interior on its face,
       * GLASS in front of that, mullions in front of the glass. */
      const gy0 = sillY + 0.42, gy1 = headY - 0.08;
      P.box(f.wainCol, O.timberDeep, x1 - x0, 0.42, 0.06, cx, sillY + 0.21, -0.02);   // 腰板
      const g = new THREE.PlaneGeometry(x1 - x0 - 0.06, gy1 - gy0);
      g.rotateY(Math.PI);
      const hg = new THREE.PlaneGeometry((x1 - x0) * 0.20, (gy1 - gy0) * 1.15);
      hg.rotateY(Math.PI);
      hg.rotateZ(0.28);
      const paneGeo = bake([
        { geometry: g, matrix: trs(cx, (gy0 + gy1) / 2, -0.05) },
        { geometry: hg, matrix: trs(cx - (x1 - x0) * 0.20, (gy0 + gy1) / 2, -0.075) },
      ]);
      g.dispose(); hg.dispose();
      if (paneGeo) {
        const pane = new THREE.Mesh(paneGeo, flat({
          color: PAL.glass, transparent: true, opacity: 0.26, depthWrite: false, cache: true,
        }));
        pane.applyMatrix4(f.M);
        pane.userData.noOutline = true;
        pane.userData.noShadow = true;
        ctx.add(pane);
      }
      // the lattice frame in front of the glass -- 4 leaves of a sliding screen
      const nl = Math.max(2, Math.round((x1 - x0) / CLEAR_HALF) * 2);
      for (let i = 0; i <= nl; i++) {
        P.box(f.timberTone, f.timberOpts, 0.04, gy1 - gy0, 0.05,
          x0 + ((x1 - x0) / nl) * i, (gy0 + gy1) / 2, -0.075);
      }
      for (const yy of [gy0, (gy0 + gy1) / 2, gy1]) {
        P.box(f.timberTone, f.timberOpts, x1 - x0, 0.045, 0.05, cx, yy, -0.075);
      }
      frontProj = Math.max(frontProj, 0.16);
    } else if (front === 'open') {
      // nothing across the mouth at all -- but the head gets its 幕板 return
      P.box(f.wainCol, O.timberDeep, x1 - x0, 0.16, 0.04, cx, headY - 0.10, -0.05);
    }
  }

  /* If the frontage is closed, cut a takeaway window into the lattice bay.
   * 0.9 x 0.9 at 1.1 m -- the 食べ歩き counter, a real and common element. */
  if (front === 'counter') {
    const b = f.bays.find((v) => v.kind === 'lattice' || v.kind === 'degoshi');
    if (b) {
      const cx = b.x, wz = -(b.proj || 0) - 0.03;
      P.box(PAL.timberDark, O.dark, 0.92, 0.90, 0.06, cx, 1.55, wz + 0.10);
      P.box(f.timberTone, f.timberOpts, 1.04, 0.10, 0.14, cx, 1.05, wz);         // the counter sill
      P.box(f.timberTone, f.timberOpts, 1.04, 0.09, 0.10, cx, 2.06, wz);
      for (const s of [-1, 1]) P.box(f.timberTone, f.timberOpts, 0.07, 0.92, 0.10, cx + s * 0.50, 1.55, wz);
      goodsRow(P, R, {
        x0: cx - 0.36, x1: cx + 0.36, y: 1.12, z: wz + 0.02,
        colors: K.goods, n: 4, form: kind === 'soba' ? 'bowl' : 'box', scale: 0.9,
      });
      frontProj = Math.max(frontProj, 0.20);
    }
  }

  /* ------------------------- the display ----------------------------- */
  const span = openSpans.length ? openSpans[0] : null;
  const mx0 = span ? span[0] + f.postD : -f.width / 2 + f.postD;
  const mx1 = span ? span[1] - f.postD : mx0 + Math.min(1.5, f.width * 0.4);
  /* Counters span the mouth; a 雛壇 or a shelf rank is a 1.2 m object and
   * looks like furniture rather than joinery when it is stretched to fill
   * a four-metre opening. */
  const wide = ['trays', 'chilled', 'case', 'counter', 'tubs'].includes(K.display);
  const dw = wide ? (mx1 - mx0) : Math.min(mx1 - mx0, 1.55);
  const dcx = wide ? (mx0 + mx1) / 2 : mx0 + dw / 2 + (mx1 - mx0 - dw) * 0.15;
  const dx0 = dcx - dw / 2, dx1 = dcx + dw / 2;
  const outZ = -0.34;                          // the clutter zone, 0-1.2 m out

  switch (K.display) {
    case 'hinadan': {
      /* 雛壇 -- 松韻堂 on Sannenzaka is documented as having them out front. */
      const st = hinadan(P, { x0: dx0, x1: dx1, y: 0.72, z: outZ, depth: 0.58, steps: 3 });
      for (let s = 0; s < 3; s++) {
        goodsRow(P, R, {
          x0: dx0 + 0.09, x1: dx1 - 0.09, y: 0.72 + s * st.rise,
          z: outZ + st.dz * (s + 0.5), colors: K.goods,
          n: Math.max(3, Math.round(dw / 0.19)), form: s === 2 ? 'plate' : (s ? 'bowl' : 'cup'),
        });
      }
      frontProj = Math.max(frontProj, 0.62);
      break;
    }
    case 'trays': {
      /* The yatsuhashi counter: a low bench of stacked flat boxes, and the
       * sample tray, which is a defining behaviour of this street. */
      P.box(PAL.timberMid, O.timber, dx1 - dx0, 0.82, 0.52, (dx0 + dx1) / 2, 0.41, outZ + 0.26);
      P.box(PAL.timberDark, O.timberDeep, dx1 - dx0 + 0.05, 0.05, 0.57, (dx0 + dx1) / 2, 0.845, outZ + 0.26);
      goodsRow(P, R, {
        x0: dx0 + 0.12, x1: dx1 - 0.12, y: 0.87, z: outZ + 0.20,
        colors: K.goods, n: Math.max(3, Math.round((dx1 - dx0) / 0.26)), form: 'flatbox',
      });
      goodsRow(P, R, {
        x0: dx0 + 0.16, x1: dx1 - 0.16, y: 0.87, z: outZ + 0.40,
        colors: K.goods, n: Math.max(3, Math.round((dx1 - dx0) / 0.30)), form: 'sweet', scale: 1.2,
      });
      frontProj = Math.max(frontProj, 0.62);
      break;
    }
    case 'chilled': {
      /* What a Kyoto pickle shop ACTUALLY fronts with: a refrigerated glass
       * case and a tasting counter -- not open cedar barrels. */
      const c = glassCase(ctx, f, { x0: dx0, x1: dx1, y: 0, z: outZ, d: 0.58, h: 1.00 });
      goodsRow(P, R, {
        x0: dx0 + 0.12, x1: dx1 - 0.12, y: c.top, z: outZ + 0.28,
        colors: K.goods, n: Math.max(3, Math.round((dx1 - dx0) / 0.22)), form: 'plate', scale: 1.1,
      });
      // the tasting dish and its toothpick cup
      P.add(disc(0.085, 0.075, 0.03, dx0 + 0.22, c.top + 0.02, outZ + 0.14), PAL.white, O.plaster);
      P.add(disc(0.028, 0.028, 0.06, dx0 + 0.40, c.top + 0.02, outZ + 0.14), PAL.timberPale, O.timber);
      frontProj = Math.max(frontProj, 0.64);
      break;
    }
    case 'case': {
      const c = glassCase(ctx, f, { x0: dx0, x1: dx1, y: 0, z: outZ + 0.06, d: 0.50, h: 0.95 });
      goodsRow(P, R, {
        x0: dx0 + 0.10, x1: dx1 - 0.10, y: c.top, z: outZ + 0.26,
        colors: K.goods, n: Math.max(4, Math.round((dx1 - dx0) / 0.16)), form: 'sweet',
      });
      frontProj = Math.max(frontProj, 0.60);
      break;
    }
    case 'teahouse': {
      /* 縁台 + 緋毛氈 -- the bench under scarlet felt, standardised to one
       * tatami footprint, with a red 野点傘 over it.  This IS the trade. */
      const bw = Math.min(dx1 - dx0, CLEAR_BAY);
      const bcx = (dx0 + dx1) / 2;
      for (const s of [-1, 1]) {
        P.box(PAL.timberMid, O.timber, 0.07, 0.40, 0.07, bcx + s * (bw / 2 - 0.09), 0.20, outZ + 0.12);
        P.box(PAL.timberMid, O.timber, 0.07, 0.40, 0.07, bcx + s * (bw / 2 - 0.09), 0.20, outZ + 0.40);
      }
      P.box(PAL.timberPale, O.timber, bw, 0.06, 0.46, bcx, 0.43, outZ + 0.26);
      P.box(PAL.red, { bands: 3, tint: TINT.warmDeep }, bw + 0.05, 0.035, 0.50, bcx, 0.475, outZ + 0.26);
      P.box(PAL.red, { bands: 3, tint: TINT.warmDeep }, bw + 0.05, 0.16, 0.035, bcx, 0.39, outZ + 0.01);
      // a 湯呑 and a tray left on it, because an empty bench reads as closed
      P.add(disc(0.036, 0.030, 0.06, bcx + bw * 0.28, 0.49, outZ + 0.22), PAL.ceramicWhite, O.plaster);
      P.box(PAL.timberDark, O.timberDeep, 0.19, 0.018, 0.13, bcx + bw * 0.28, 0.50, outZ + 0.36);
      const w = f.toWorld(bcx - bw * 0.55, outZ + 0.18);
      ctx.prop({ kind: 'parasol', x: w.x, z: w.z, y: f.base + 0, rot: f.ry + 0.3, scale: 1 });
      frontProj = Math.max(frontProj, 0.70);
      break;
    }
    case 'tubs': {
      /* 湯どうふ / ゆば -- a wet trade.  Shallow water tubs at the mouth, and
       * the 麩屋格子's boarded lower panel keeping the splash off the street. */
      for (let i = 0; i < 2; i++) {
        const tx = lerp(dx0 + 0.30, dx1 - 0.30, i / Math.max(1, 1));
        P.add(disc(0.27, 0.25, 0.30, tx, 0, outZ + 0.28), PAL.timberPale, O.timber);
        P.add(disc(0.24, 0.24, 0.02, tx, 0.26, outZ + 0.28), PAL.waterSky, { bands: 'soft3', tint: TINT.cool });
        P.add(disc(0.075, 0.075, 0.05, tx, 0.27, outZ + 0.28), PAL.white, O.plaster);
        const w = f.toWorld(tx + 0.36, outZ + 0.26);
        ctx.prop({ kind: 'bucket', x: w.x, z: w.z, y: f.base, rot: f.ry + R.range(-0.6, 0.6), scale: 1 });
      }
      frontProj = Math.max(frontProj, 0.60);
      break;
    }
    case 'drawers': {
      /* Incense: long shallow glass-topped drawers, and almost nothing else.
       * The restraint is the signal. */
      const c = glassCase(ctx, f, { x0: dx0, x1: dx1, y: 0, z: outZ + 0.14, d: 0.44, h: 0.92, body: PAL.timberDark });
      const n = Math.max(3, Math.round((dx1 - dx0) / 0.30));
      for (let i = 0; i < n; i++) {
        P.box(PAL.timberWarm, O.timber, (dx1 - dx0) / n - 0.03, 0.10, 0.02,
          dx0 + ((dx1 - dx0) / n) * (i + 0.5), 0.28 + (i % 2) * 0.16, outZ + 0.13);
      }
      goodsRow(P, R, {
        x0: dx0 + 0.14, x1: dx1 - 0.14, y: c.top, z: outZ + 0.32,
        colors: K.goods, n: 4, form: 'tin', scale: 0.9,
      });
      frontProj = Math.max(frontProj, 0.56);
      break;
    }
    case 'fanrack': {
      /* Opened fans in a fanned grid on the pier -- the loudest single block
       * of colour a Higashiyama frontage is allowed. */
      const rw = Math.min(dx1 - dx0, 1.30), rcx = (dx0 + dx1) / 2;
      P.box(PAL.timberDark, O.timberDeep, rw, 1.20, 0.05, rcx, 1.32, -0.04);
      const cols = Math.max(2, Math.round(rw / 0.34)), rows = 3;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const fx = rcx - rw / 2 + (rw / cols) * (c + 0.5);
          const fy = 0.86 + r * 0.36;
          const col = K.goods[(r * cols + c) % K.goods.length];
          // an open fan: a half-disc standing against the board
          const g = new THREE.CircleGeometry(0.145, 8, Math.PI * 0.18, Math.PI * 0.64);
          g.rotateY(Math.PI);
          g.translate(fx, fy, -0.075);
          P.add(g, col, { bands: 'soft3', tint: TINT.cool });
          P.box(PAL.timberDark, O.timberDeep, 0.018, 0.10, 0.02, fx, fy - 0.03, -0.085);
        }
      }
      frontProj = Math.max(frontProj, 0.14);
      break;
    }
    case 'cloth': {
      // a rail of 手ぬぐい hung in the mouth: narrow cloth strips, lightly split
      const n = Math.max(4, Math.round((dx1 - dx0) / 0.22));
      P.box(PAL.timberMid, O.timber, dx1 - dx0 + 0.10, 0.045, 0.045, (dx0 + dx1) / 2, 1.92, -0.06);
      for (let i = 0; i < n; i++) {
        const cx2 = dx0 + ((dx1 - dx0) / n) * (i + 0.5);
        const col = K.goods[Math.floor(R.next() * K.goods.length) % K.goods.length];
        P.box(col, { bands: 'soft3', tint: TINT.cool }, (dx1 - dx0) / n - 0.035, R.range(0.62, 0.86), 0.012,
          cx2, 1.92 - R.range(0.62, 0.86) / 2 - 0.03, -0.062);
      }
      // a low table of small goods below them
      P.box(PAL.timberMid, O.timber, dx1 - dx0, 0.70, 0.44, (dx0 + dx1) / 2, 0.35, outZ + 0.30);
      goodsRow(P, R, {
        x0: dx0 + 0.10, x1: dx1 - 0.10, y: 0.70, z: outZ + 0.30,
        colors: K.goods, n: Math.max(3, Math.round((dx1 - dx0) / 0.22)), form: 'box',
      });
      frontProj = Math.max(frontProj, 0.56);
      break;
    }
    case 'bottles': {
      // a rank of one-shō bottles on a low staging, and a 杉玉 over the door
      P.box(PAL.timberMid, O.timber, dx1 - dx0, 0.48, 0.42, (dx0 + dx1) / 2, 0.24, outZ + 0.30);
      goodsRow(P, R, {
        x0: dx0 + 0.10, x1: dx1 - 0.10, y: 0.48, z: outZ + 0.22,
        colors: K.goods, n: Math.max(4, Math.round((dx1 - dx0) / 0.14)), form: 'bottle',
      });
      if (K.sugidama) {
        const w = f.toWorld(f.entryX, -f.hisashiDepth * 0.45);
        ctx.prop({
          kind: 'sugidama', x: w.x, z: w.z, y: f.base + f.hisashiY - 0.20,
          rot: f.ry, scale: 1, variant: R.chance(0.5) ? 1 : 0,
        });
      }
      frontProj = Math.max(frontProj, 0.52);
      break;
    }
    case 'counter': {
      P.box(PAL.counter, O.timber, dx1 - dx0, 0.98, 0.46, (dx0 + dx1) / 2, 0.49, outZ + 0.28);
      P.box(PAL.timberDark, O.timberDeep, dx1 - dx0 + 0.05, 0.05, 0.52, (dx0 + dx1) / 2, 1.005, outZ + 0.28);
      goodsRow(P, R, {
        x0: dx0 + 0.14, x1: dx1 - 0.14, y: 1.03, z: outZ + 0.24,
        colors: K.goods, n: 3, form: 'tin',
      });
      frontProj = Math.max(frontProj, 0.56);
      break;
    }
    case 'samplecase': {
      // 食品サンプル in a lit case beside the door -- 梅園 has exactly this
      const cw = 0.62;
      const ccx = clamp(f.entryX + (f.entryBay === 0 ? bayW * 0.78 : -bayW * 0.78),
        -f.width / 2 + cw / 2 + 0.1, f.width / 2 - cw / 2 - 0.1);
      P.box(PAL.timberDark, O.timberDeep, cw, 0.86, 0.34, ccx, 1.32, -0.19);
      P.box(PAL.shopInteriorLit, { bands: 'soft3', tint: TINT.cool }, cw - 0.10, 0.70, 0.04, ccx, 1.34, -0.36);
      goodsRow(P, R, {
        x0: ccx - cw / 2 + 0.10, x1: ccx + cw / 2 - 0.10, y: 1.06, z: -0.28,
        colors: K.goods, n: 3, form: 'bowl', scale: 0.8,
      });
      P.box(PAL.timberMid, O.timber, 0.09, 0.90, 0.09, ccx, 0.45, -0.19);
      frontProj = Math.max(frontProj, 0.38);
      break;
    }
    default: {  // 'shelves'
      // open tiered shelving of boxed goods -- the souvenir/craft default
      const st = hinadan(P, { x0: dx0, x1: dx1, y: 0.70, z: outZ, depth: 0.52, steps: 3, cloth: PAL.timberMid });
      for (let s = 0; s < 3; s++) {
        goodsRow(P, R, {
          x0: dx0 + 0.09, x1: dx1 - 0.09, y: 0.70 + s * st.rise,
          z: outZ + st.dz * (s + 0.5), colors: K.goods,
          n: Math.max(3, Math.round(dw / 0.23)), form: s === 0 ? 'flatbox' : 'box',
        });
      }
      frontProj = Math.max(frontProj, 0.58);
      break;
    }
  }

  /* ------------------------ signage and paper ------------------------ */
  /* Type is mincho or brush.  Sign area is capped at the ordinance limit and
   * anything over it is simply not built. */
  if (K.strip && !lod && canSign(0.60 * 0.12)) {
    const sx = span ? (span[0] + span[1]) / 2 : f.entryX;
    const g = new THREE.PlaneGeometry(Math.min(0.62, bayW * 0.5), 0.13);
    g.rotateY(Math.PI);
    g.translate(sx, sillY + 0.98, outZ - 0.30);
    const tex = cached('strip|' + K.strip.map((e) => e.join(':')).join('/'),
      () => priceStrip(K.strip, { w: 512, h: 110 }));
    texMesh(ctx, g, tex, f.M, { bands: 'soft3', tint: TINT.cool });
  }
  if (K.menu && !lod && R.chance(0.62) && canSign(0.46 * 0.90)) {
    const mx = clamp(f.entryX + (f.entryBay === 0 ? bayW * 0.58 : -bayW * 0.58),
      -f.width / 2 + 0.40, f.width / 2 - 0.40);
    menuRack(ctx, f, { cx: mx, y: 0.86, z: -0.09, w: 0.46, h: 0.90, items: K.menu, title: null });
    hasRack = true;
  }
  if (K.menu && !lod && !hasRack && R.chance(0.5) && canSign(0.56 * 0.92)) {
    const ax = clamp(f.entryX + (f.entryBay === 0 ? -bayW * 0.62 : bayW * 0.62),
      -f.width / 2 + 0.4, f.width / 2 - 0.4);
    aBoard(ctx, f, { cx: ax, z: -0.72, items: K.menu.slice(0, 4), title: name || K.ja });
    frontProj = Math.max(frontProj, 0.55);
  }

  /* --------------------------- the clutter --------------------------- */
  /* The real streets are crowded to about 1.2 m out from the shop line.  A
   * machiya facade with nothing in front of it looks like a museum -- but the
   * props go to the central batcher, never into this file's geometry. */
  const slots = [];
  for (const [a, b] of (openSpans.length ? openSpans : [[-f.width / 2, f.width / 2]])) {
    slots.push(a - 0.16, b + 0.16);
  }
  slots.push(f.entryX + f.entryHalf + 0.30, f.entryX - f.entryHalf - 0.30);
  const kinds = (K.props || []).concat(R.chance(0.45) ? ['uekibachi'] : []);
  let si = 0;
  for (const k of kinds) {
    const lx = clamp(slots[si++ % slots.length] + R.gauss() * 0.12, -f.width / 2 + 0.2, f.width / 2 - 0.2);
    const lz = -R.range(0.34, 0.82);
    const w = f.toWorld(lx, lz);
    ctx.prop({ kind: k, x: w.x, z: w.z, y: ctx.groundAt(w.x, w.z), rot: f.ry + R.range(-0.5, 0.5), scale: 1, variant: R.int(0, 2) });
  }
  if (R.chance(0.35)) {
    const lx = clamp(f.width / 2 - 0.35, -f.width / 2, f.width / 2);
    const w = f.toWorld(lx, -0.52);
    ctx.tree({ kind: 'potted', x: w.x, z: w.z, y: ctx.groundAt(w.x, w.z), scale: R.range(0.85, 1.15), rot: f.ry, seed: (R.next() * 1e6) | 0 });
  }
  if (R.chance(0.18)) {
    const w = f.toWorld(R.range(-f.width / 2 + 0.6, f.width / 2 - 0.6), -0.62);
    ctx.prop({ kind: 'bicycle', x: w.x, z: w.z, y: ctx.groundAt(w.x, w.z), rot: f.ry + Math.PI / 2, scale: 1 });
  }

  /* The clutter zone is not a wall.  Collide only what is structural -- the
   * stands and the case -- and cap it, because two shops facing each other
   * across a 5.5 m street each cost their projection plus 0.34 m. */
  return { frontProj: Math.min(frontProj, 0.72) };
}

/* ------------------------------------------------------------------ *
 * A parade of shops along a line, with the trade mix of a named street.
 * The weights are measured frontage fractions from STREET.md 6.1 -- they are
 * what makes 清水坂 read as food and 花見小路 read as nothing for sale.
 * ------------------------------------------------------------------ */

export const TRADE_MIX = {
  kiyomizuzaka: [
    ['yatsuhashi', 0.16], ['wagashi', 0.10], ['matcha', 0.10], ['pickles', 0.09],
    ['ceramics', 0.20], ['komono', 0.14], ['crafts', 0.06], ['souvenir', 0.05],
    ['restaurant', 0.06], ['tofu', 0.04],
  ],
  sannenzaka: [
    ['yatsuhashi', 0.10], ['wagashi', 0.12], ['matcha', 0.13], ['ceramics', 0.20],
    ['komono', 0.17], ['crafts', 0.08], ['fans', 0.04], ['incense', 0.04],
    ['restaurant', 0.08], ['coffee', 0.04],
  ],
  ninenzaka: [
    ['wagashi', 0.18], ['matcha', 0.16], ['coffee', 0.06], ['komono', 0.18],
    ['crafts', 0.09], ['ceramics', 0.12], ['fans', 0.03], ['restaurant', 0.10],
    ['tofu', 0.05], ['incense', 0.03],
  ],
  nene: [
    ['matcha', 0.14], ['wagashi', 0.11], ['komono', 0.15], ['crafts', 0.10],
    ['ceramics', 0.10], ['restaurant', 0.15], ['soba', 0.08], ['tofu', 0.07],
    ['sake', 0.05], ['incense', 0.05],
  ],
  shimogawara: [
    ['restaurant', 0.35], ['soba', 0.12], ['tofu', 0.12], ['matcha', 0.10],
    ['sake', 0.08], ['wagashi', 0.08], ['komono', 0.08], ['ceramics', 0.07],
  ],
};

export function pickTrade(mix, r) {
  const table = Array.isArray(mix) ? mix : (TRADE_MIX[mix] || TRADE_MIX.sannenzaka);
  let total = 0;
  for (const [, w] of table) total += w;
  let t = r * total;
  for (const [k, w] of table) { t -= w; if (t <= 0) return k; }
  return table[table.length - 1][0];
}

/**
 * Fill a run of frontage with shops.  `mix` is a street id from `TRADE_MIX`
 * or an explicit `[kind, weight]` table; `names` supplies real shop names in
 * order where a district has them (STREET.md 1.1 is a walk-order list).
 */
export function makeShopRow(ctx, {
  x0, z0, x1, z1, ry, mix = 'sannenzaka', names = null, seed = 1,
  bayChoices = [2, 2, 3, 3, 3, 4], depth, each = null, ...rest
} = {}) {
  const R = rngKit((seed >>> 0) || 1);
  const dx = x1 - x0, dz = z1 - z0;
  const run = Math.hypot(dx, dz);
  if (run < 2 * KEN) return [];
  const ux = dx / run, uz = dz / run;
  const out = [];
  let s = 0, prev = null;
  while (run - s > 1.9 * KEN) {
    const w = Math.min(R.pick(bayChoices) * KEN, run - s);
    let kind = pickTrade(mix, R.next());
    if (kind === prev && R.chance(0.75)) kind = pickTrade(mix, R.next());
    prev = kind;
    out.push(makeShopfront(ctx, {
      x: x0 + ux * (s + w / 2), z: z0 + uz * (s + w / 2), ry,
      width: w, kind, depth,
      name: names ? names[out.length % names.length] : null,
      seed: (seed * 6151 + out.length * 97 + 5) >>> 0,
      ...rest, ...(each ? each(out.length, kind) : {}),
    }));
    s += w;
  }
  return out;
}

export { SHOP };
