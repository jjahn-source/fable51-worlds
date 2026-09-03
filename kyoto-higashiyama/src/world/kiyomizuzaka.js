import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT, celTex, cel } from '../core/toon.js';
import { rngKit, clamp, lerp, bake, trs } from '../core/util.js';
import { make, hex, mixHex, MINCHO, vertical, verticalFit, centered, brushVertical, woodGrain } from '../core/textures.js';
import { makeMachiya, KEN } from '../kit/machiya.js';
import { makeShopfront } from '../kit/shopfront.js';
import { makeTempleWall } from '../kit/temple.js';
import { layoutPlots, alongStreet, atStreet } from './plots.js';

/* ==================================================================== *
 * 清水道 · 清水坂 · 茶わん坂 -- the pilgrimage approach.
 *
 * Three streets that end at the same gate and could not be less alike.
 * The job here is to make the loudest frontage in the world still legible to
 * walk through.
 *
 * ---------------------------------------------------------- THE STREETS
 *
 * **清水道** (`kiyomizuzakaLower`).  373 m from 東大路 at 51.7 m to the fork
 * at 81.1 m: a 7.88 % ramp, asphalt, 9.4 m face to face.  Still a *road* --
 * the city buses stop at the bottom and that is where most of the crowd on
 * the whole route is made.  It has **poles and overhead wires** (STREET 3.2:
 * 清水道／茶わん坂 is target route #6 of Kyoto's 無電柱化 plan and has not been
 * done), and it has to feel ordinary, because everything after it does not.
 *
 * **清水坂** (`kiyomizuzaka`).  254 m of corridor from the fork to the 仁王門
 * at 104.5 m, 7.69 %, paving stones, 7.6 m face to face, pedestrian.  Solid
 * open shopfront both sides -- the densest retail in the world -- laid out
 * from the walk-order census in STREET 1.1 and the trade weights in 6.1.
 *
 * **茶わん坂** (`chawanzaka`).  The potters' street, deliberately the
 * anti-清水坂: same destination, no crowd, no souvenirs.  Kilns, workshops,
 * saggar stacks, pallets of clay, a roller shutter, a sign painted straight
 * onto the plaster.
 *
 * ------------------------------------------------------- THE SLOPE, MEASURED
 *
 * Every plot is on a 7-8 % ramp with a cross-fall on top of it.  The kit
 * seats a building on the LOWEST ground under its footprint and levels the
 * 延石 above the highest, so a row steps up the hill on a growing stone base.
 * That was measured before anything was built: on 清水坂 the sill lands
 * 0.23-0.60 m above the pavement at the facade the whole way up, which is a
 * threshold.  On 茶わん坂 above t = 0.60 the same sum comes out at 1.2-3.3 m,
 * which is a *retaining wall* and not a shopfront -- so there are no shops up
 * there and the street gets the wall instead.
 *
 * ------------------------------------------------------------ THE SIGNAGE
 *
 * Dense projecting signage is the identity of 清水坂 and it is also the
 * fastest way to spend two hundred draw calls: a `verticalSign()` per shop is
 * a texture, a material and a mesh per shop.  So the whole district's type --
 * 袖看板, 扁額, price racks, 幟, A-boards, the granite 道標, the painted wall
 * signs -- is packed into **one shared atlas** and merged into a single mesh,
 * and the 暖簾 go into a second cut-out atlas as one quad each so their hems
 * can be lifted from one updater.
 *
 * Every string is real, from STREET.md 2.1-2.4, and set in **mincho**.  Where
 * the census lists a modern chain the *building* is built faithfully and the
 * mark is replaced by a generic plate -- STREET 7.2.
 * ==================================================================== */

export const id = 'kiyomizuzaka';

const BAKER = 'kiyomizuzaka';

/* Everything east of here belongs to the temple precinct: the 仁王門 stands at
 * (373.4, 347.1) and another builder owns the ground it stands on.  The last
 * sixty metres of frontage steps down toward it and then stops. */
const PRECINCT_X = 362;

/* ------------------------------------------------------------------ *
 * 1.  Colour
 *
 * STREET 4.2: clamp every man-made saturation and let a small licensed set
 * carry the chromatic load.  The documented outlier on this street is the
 * **vivid orange** of 本家西尾八ッ橋 清水坂店 -- 「鮮やかなオレンジ色の外観」.
 * ------------------------------------------------------------------ */

const CLOTH = {
  indigo:    { cloth: PAL.norenIndigo, ink: PAL.norenCream },
  navy:      { cloth: PAL.norenNavy,   ink: PAL.norenCream },
  cream:     { cloth: 0xe8dec6,        ink: PAL.black },
  brown:     { cloth: PAL.norenBrown,  ink: PAL.norenCream },
  persimmon: { cloth: 0xc46a32,        ink: PAL.norenCream },
  crimson:   { cloth: 0x9e3b32,        ink: PAL.norenCream },
  green:     { cloth: PAL.norenGreen,  ink: PAL.norenCream },
  purple:    { cloth: PAL.norenPurple, ink: PAL.norenCream },
  black:     { cloth: 0x2a2630,        ink: PAL.gold },
};

/** The awning colours STREET 4.3 gives for 清水坂 and for nowhere else. */
const AWNING = [0x8c6b4a, 0x3f5340, 0x5e2e30];

/** 弁柄 belongs in Gion; shop timber here is sumi-blackened or left bare. */
const TIMBER = [PAL.timber, PAL.timber, PAL.timberDark, PAL.timberMid];
const PLASTER = [PAL.plaster, PAL.plasterWarm, PAL.plasterOchre, PAL.plasterGrey];

const ORANGE = 0xd2762a;
const ORANGE_DEEP = 0xa8541b;

/** 清水焼 glazes -- what this street is actually made of. */
const GLAZE = [
  PAL.ceramicWhite, PAL.ceramicWhite, 0xdfe6e4, PAL.ceramicBlue,
  0x35507a, PAL.ceramicGreen, 0x8fae9c, PAL.ceramicRed, 0xe8ddc4, 0xc9a24e,
];

const O = {
  timber: { bands: 3, tint: TINT.warm },
  timberDeep: { bands: 2, tint: TINT.warm },
  warmDeep: { bands: 3, tint: TINT.warmDeep },
  plaster: { bands: 'soft3', tint: TINT.cool },
  stone: { bands: 3, tint: TINT.cool },
  dark: { bands: 'deep', tint: TINT.cool },
  metal: { bands: 3, tint: TINT.cool },
  cloth: { bands: 3, tint: TINT.cool },
  glaze: { bands: 'soft3', tint: TINT.cool },
};

/* ------------------------------------------------------------------ *
 * 2.  The atlas.
 *
 * A shelf packer with overflow pages, memoised on the string: the forty shops
 * carrying 「京銘菓」 share one patch of canvas, and the whole district's type
 * comes out as one or two draw calls instead of three hundred.
 * ------------------------------------------------------------------ */

function atlasSet(W, H, { pad = 6 } = {}) {
  const pages = [];
  const cache = new Map();
  const newPage = () => {
    const p = { x: 0, y: 0, rowH: 0, items: [], parts: [] };
    pages.push(p);
    return p;
  };
  newPage();

  function alloc(w, h) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const p = pages[pages.length - 1];
      let { x, y, rowH } = p;
      if (x + w + pad > W) { x = 0; y += rowH; rowH = 0; }
      if (y + h + pad <= H) {
        p.x = x + w + pad;
        p.y = y;
        p.rowH = Math.max(rowH, h + pad);
        /* Half a texel in from every edge: the atlas is mipped, and a quad
         * that samples its own boundary picks up its neighbour at range. */
        return {
          page: p, w, h, ox: x, oy: y,
          u0: (x + 0.5) / W, u1: (x + w - 0.5) / W,
          v0: 1 - (y + h - 0.5) / H, v1: 1 - (y + 0.5) / H,
        };
      }
      newPage();
    }
    return null;
  }

  return {
    pages,
    cell(key, w, h, draw) {
      if (key && cache.has(key)) return cache.get(key);
      const r = alloc(w, h);
      if (!r) return null;
      r.page.items.push({ r, draw });
      if (key) cache.set(key, r);
      return r;
    },
    push(r, geometry, matrix) {
      if (!r) { geometry.dispose(); return -1; }
      const i = r.page.parts.length;
      r.page.parts.push({ geometry, matrix });
      return i;
    },
    texture(page, opts) {
      return make(W, H, (c) => {
        for (const it of page.items) {
          c.save();
          c.translate(it.r.ox, it.r.oy);
          c.beginPath();
          c.rect(0, 0, it.r.w, it.r.h);
          c.clip();
          it.draw(c, it.r.w, it.r.h);
          c.restore();
        }
      }, opts);
    },
  };
}

/** A quad carrying one atlas cell.  Faces +z; callers turn it. */
function cellQuad(w, h, r) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, lerp(r.u0, r.u1, uv.getX(i)), lerp(r.v0, r.v1, uv.getY(i)));
  }
  uv.needsUpdate = true;
  return g;
}

/* ------------------------------------------------------------------ *
 * 3.  The painters.
 *
 * STREET 2.0: vertical text stacks upright and the glyphs are never rotated,
 * and the face is 明朝.  Gothic here reads as a convenience store, which is
 * the exact distinction Kyoto's ordinance exists to preserve.
 * ------------------------------------------------------------------ */

function kanbanPainter(text, { board = PAL.timberPale, ink = PAL.black, sub = null } = {}) {
  return (c, W, H) => {
    woodGrain(c, W, H, board, mixHex(board, 0x000000, 0.45) | 0, { vertical: true, lines: 14 });
    c.strokeStyle = hex(mixHex(board, 0x000000, 0.38));
    c.lineWidth = 3;
    c.strokeRect(3, 3, W - 6, H - 6);
    const n = [...text].length || 1;
    const colX = sub ? W * 0.62 : W * 0.5;
    const size = Math.min(W * (sub ? 0.52 : 0.74), (H * 0.86) / n);
    brushVertical(c, text, colX, H * 0.09 + size * 0.6, size * 1.08, size, hex(ink));
    if (sub) {
      const ss = size * 0.44;
      vertical(c, sub, W * 0.24, H * 0.17, ss * 1.14, ss, hex(mixHex(ink, board, 0.28)));
    }
  };
}

function plaquePainter(text, { board = 0x2e2620, ink = PAL.gold, frame = null } = {}) {
  return (c, W, H) => {
    c.fillStyle = hex(frame || mixHex(board, 0x000000, 0.35));
    c.fillRect(0, 0, W, H);
    woodGrain(c, W * 0.94, H * 0.80, board, mixHex(board, 0x000000, 0.5) | 0, { lines: 8 });
    c.save();
    c.translate(W * 0.03, H * 0.10);
    c.restore();
    c.strokeStyle = hex(mixHex(board, 0xffffff, 0.10));
    c.lineWidth = 2.5;
    c.strokeRect(W * 0.03, H * 0.10, W * 0.94, H * 0.80);
    const chars = [...text];
    const size = Math.min(H * 0.54, (W * 0.84) / chars.length * 1.02);
    c.font = `bold ${size}px ${MINCHO}`;
    c.fillStyle = hex(ink);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const step = (W * 0.86) / chars.length;
    let x = W * 0.5 - (step * (chars.length - 1)) / 2;
    for (const ch of chars) { c.fillText(ch, x, H * 0.52); x += step; }
  };
}

/**
 * 短冊掛け -- the rack of price strips at the shop mouth.  STREET 3.7 puts
 * 8-20 of them on hooks in a timber frame; 2.3 gives the strings, and they
 * are real 2024-26 Kyoto prices.  One panel, because a wall of price strips
 * is only ever read as a *texture of type*.
 */
function stripRackPainter(entries, { board = PAL.paperWarm } = {}) {
  return (c, W, H) => {
    c.fillStyle = hex(mixHex(PAL.timberDark, 0x000000, 0.15));
    c.fillRect(0, 0, W, H);
    const cols = entries.length <= 6 ? 2 : 3;
    const rows = Math.ceil(entries.length / cols);
    const cw = W / cols, ch = H / rows;
    entries.forEach((e, i) => {
      const cx = (cols - 1 - (i % cols)) * cw;      // columns read right to left
      const cy = Math.floor(i / cols) * ch;
      c.fillStyle = hex(board);
      c.fillRect(cx + cw * 0.10, cy + ch * 0.07, cw * 0.80, ch * 0.86);
      c.strokeStyle = hex(mixHex(board, 0x000000, 0.30));
      c.lineWidth = 1.2;
      c.strokeRect(cx + cw * 0.10, cy + ch * 0.07, cw * 0.80, ch * 0.86);
      const [name, price] = Array.isArray(e) ? e : [e, null];
      const size = clamp((ch * 0.74) / Math.max(3, [...name].length) * 1.5, 6, cw * 0.30);
      vertical(c, name, cx + cw * 0.58, cy + ch * 0.15 + size * 0.5, size * 1.05, size, hex(PAL.black));
      if (price) {
        const ps = size * 0.74;
        vertical(c, price, cx + cw * 0.27, cy + ch * 0.20, ps * 1.05, ps, hex(PAL.redDeep));
      }
    });
  };
}

function bannerPainter(text, { cloth = PAL.banner, ink = PAL.bannerRed } = {}) {
  return (c, W, H) => {
    c.fillStyle = hex(cloth);
    c.fillRect(0, 0, W, H);
    c.fillStyle = hex(mixHex(cloth, 0x000000, 0.16));
    c.fillRect(0, 0, W * 0.09, H);
    const n = [...text].length || 1;
    const size = Math.min(W * 0.58, (H * 0.84) / n);
    brushVertical(c, text, W * 0.54, H * 0.09 + size * 0.6, size * 1.08, size, hex(ink));
  };
}

function aboardPainter(lines, { board = 0x33302c, ink = PAL.paper, accent = PAL.gold } = {}) {
  return (c, W, H) => {
    c.fillStyle = hex(board);
    c.fillRect(0, 0, W, H);
    c.strokeStyle = hex(PAL.timberPale);
    c.lineWidth = 5;
    c.strokeRect(4, 4, W - 8, H - 8);
    const lh = (H * 0.78) / lines.length;
    lines.forEach((ln, i) => {
      centered(c, ln, W / 2, H * 0.14 + lh * (i + 0.5), W * 0.80, lh * 0.60,
        hex(i === 0 ? accent : ink), { spacing: 1 });
    });
  };
}

/** 暖簾.  Transparent gaps between the panels, so the cut-out does the work. */
function norenPainter(text, { cloth = PAL.norenIndigo, ink = PAL.norenCream, panels = 3 } = {}) {
  return (c, W, H) => {
    c.clearRect(0, 0, W, H);
    /* The splits are the whole read of a noren: at four metres a 2 cm gap is
     * one pixel, so they are drawn at the width they *photograph* at rather
     * than the width they measure. */
    const gap = Math.max(3, W * 0.016);
    const pw = (W - gap * (panels - 1)) / panels;
    c.fillStyle = hex(cloth);
    for (let i = 0; i < panels; i++) c.fillRect(i * (pw + gap), H * 0.16, pw, H * 0.85);
    c.fillRect(0, 0, W, H * 0.17);
    c.fillStyle = hex(mixHex(cloth, 0x000000, 0.30));
    c.fillRect(0, 0, W, H * 0.075);          // the sleeve the pole runs through
    c.fillStyle = hex(mixHex(cloth, 0x000000, 0.14));
    c.fillRect(0, H * 0.965, W, H * 0.035);  // and the weighted hem
    if (!text) return;
    const chars = [...text];
    if (chars.length === 1) {
      centered(c, text, W * 0.5, H * 0.60, W * 0.40, H * 0.58, hex(ink));
    } else {
      const size = Math.min((W * 0.86) / chars.length, H * 0.30);
      brushVertical(c, text, W * 0.5, H * 0.36, size * 1.14, size, hex(ink));
    }
  };
}

/** 石標 -- the granite marker post, characters incised and inked. */
function markerPainter(text) {
  return (c, W, H) => {
    c.fillStyle = hex(0x8e8b84);
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 120; i++) {
      c.fillStyle = `rgba(0,0,0,${0.02 + (i % 5) * 0.008})`;
      c.fillRect((i * 97) % W, (i * 131) % H, 3, 3);
    }
    c.fillStyle = 'rgba(120,140,96,0.26)';        // lichen, on the north face only
    c.fillRect(0, H * 0.74, W * 0.36, H * 0.26);
    verticalFit(c, text, W * 0.5, H * 0.05, H * 0.95, W * 0.74, hex(0x241f1c));
  };
}

/** A trade sign painted straight onto the plaster -- 茶わん坂, not 清水坂. */
function wallSignPainter(text, { wall = PAL.plasterOchre, ink = 0x3a3a44 } = {}) {
  return (c, W, H) => {
    c.fillStyle = hex(wall);
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      c.fillStyle = `rgba(0,0,0,${0.012 + (i % 4) * 0.006})`;
      c.fillRect((i * 73) % W, (i * 149) % H, 5, 4);
    }
    const chars = [...text];
    const size = Math.min(W * 0.78, (H * 0.88) / chars.length);
    brushVertical(c, text, W * 0.5, H * 0.07 + size * 0.6, size * 1.06, size, hex(ink));
    c.fillStyle = 'rgba(217,196,162,0.20)';       // the paint is old
    for (let i = 0; i < 9; i++) c.fillRect(0, (i * 37) % H, W, 4);
  };
}

/* ------------------------------------------------------------------ *
 * 4.  Price strips.  STREET 2.3, verbatim.
 * ------------------------------------------------------------------ */

const STRIPS = {
  yatsu: [
    ['生八ッ橋', '２５０円'], ['あん生八ッ橋', '２５０円'], ['ニッキ', '６８０円'],
    ['焼き八ッ橋', '２５０円'], ['ニッキ抹茶', '１０４０円'], ['試食し放題', ''],
    ['八ッ橋クレープ', '４５０円'], ['ソフトクリーム', '３５０円'], ['夕子', '６４８円'],
  ],
  street: [
    ['抹茶ソフト', '５００円'], ['ほうじ茶ソフト', '５００円'], ['みたらし団子', '１５０円'],
    ['生八ツ橋', '５００円'], ['豆乳ドーナツ', '３００円'], ['いちご大福', '４００円'],
    ['冷やしあめ', '３００円'], ['ラムネ', '２００円'], ['抹茶ラテ', '６００円'],
  ],
  tea: [
    ['抹茶パフェ', '１２００円'], ['八ッ橋パフェ', '１０２０円'], ['お抹茶', '７００円'],
    ['ほうじ茶', '７５０円'], ['わらび餅', '９２０円'], ['宇治金時', '１１３０円'],
    ['かき氷', '９８０円'], ['ざる茶そば', '９５０円'], ['煎茶', '７５０円'],
  ],
  tofu: [
    ['ゆどうふコース', '３０００円'], ['ゆどうふ（花）', '３０００円'], ['湯葉料理', '３６３０円'],
    ['京懐石', '５５００円'], ['生ゆば', '６００円'], ['豆腐会席', '３３００円'],
  ],
  fried: [
    ['とろけるゆばチーズ', '３５０円'], ['たこねぎサクレ', '３５０円'],
    ['はじけるえびマヨ', '３００円'], ['宇治抹茶シェイク', '４５０円'],
  ],
  pickle: [
    ['京つけもの', ''], ['しば漬', '５４０円'], ['すぐき', '８６４円'],
    ['千枚漬', '１０８０円'], ['ご試食どうぞ', ''], ['レモン胡瓜', '３００円'],
  ],
  ceramic: [
    ['抹茶碗', '３８００円'], ['ぐい呑', '１６５０円'], ['小皿', '８８０円'],
    ['箸置', '５５０円'], ['湯呑', '２２００円'], ['花器', '８８００円'],
  ],
  soba: [
    ['にしんそば', '１１００円'], ['ざるそば', '８００円'], ['天ざるそば', '１３００円'],
    ['きつねうどん', '１０００円'], ['月見うどん', '９００円'], ['そば定食', '１５００円'],
  ],
};

/* ------------------------------------------------------------------ *
 * 5.  Categories.
 *
 * Each census category maps onto one of the shopfront kit's trades -- which
 * decides how the mouth is closed and what is displayed -- plus this
 * district's own noren, strips and clutter.
 * ------------------------------------------------------------------ */

const CAT = {
  spice:      { kind: 'souvenir', front: 'open', noren: '七味唐がらし', nc: 'indigo', kan: ['名代', '京の味'], strips: null, clutter: ['teaCanisters'] },
  yatsuhashi: { kind: 'yatsuhashi', noren: '八ツ橋', nc: 'cream', kan: ['元祖', '京銘菓', '本舗'], strips: 'yatsu', clutter: ['sampleTray', 'boxStack'] },
  ceramics:   { kind: 'ceramics', noren: '清水焼', nc: 'cream', kan: ['清水焼窯元', '陶器', '京陶苑'], strips: 'ceramic', clutter: ['ceramicStand'] },
  pickles:    { kind: 'pickles', noren: '京漬物', nc: 'brown', kan: ['京つけもの', '老舗'], strips: 'pickle', clutter: ['crate'] },
  fans:       { kind: 'fans', noren: '京扇子', nc: 'indigo', kan: ['京扇堂', '扇'], strips: null, clutter: ['fanRack'] },
  incense:    { kind: 'incense', noren: '御香', nc: 'brown', kan: ['香老舗', '京念珠'], strips: null, clutter: ['incenseBurner'] },
  knives:     { kind: 'crafts', front: 'glazed', noren: '和', nc: 'indigo', kan: ['京刃物', '名代'], strips: null, clutter: ['crate'] },
  dolls:      { kind: 'crafts', noren: '京こま', nc: 'cream', kan: ['京人形', '和小物'], strips: null, clutter: ['boxStack'] },
  sweets:     { kind: 'wagashi', noren: '京菓子', nc: 'cream', kan: ['御菓子司', '京菓匠', '京銘菓'], strips: 'street', clutter: ['sampleTray'] },
  streetfood: { kind: 'wagashi', front: 'open', noren: '', nc: 'crimson', kan: ['名代', '元祖'], strips: 'street', clutter: ['steamingBowl', 'stool'], banner: true },
  tea:        { kind: 'matcha', noren: '茶', nc: 'indigo', kan: ['茶寮', '御茶處'], strips: 'tea', clutter: ['teaCanisters'] },
  cafe:       { kind: 'coffee', noren: '喫茶', nc: 'persimmon', kan: ['茶房', '甘味処'], strips: 'tea', clutter: ['endai'] },
  souvenir:   { kind: 'souvenir', noren: '御土産', nc: 'cream', kan: ['京銘菓', '老舗', '京の味'], strips: 'street', clutter: ['boxStack', 'crate'] },
  textiles:   { kind: 'komono', noren: '染', nc: 'indigo', kan: ['西陣織', '手ぬぐい'], strips: null, clutter: ['hangingCloth'] },
  crafts:     { kind: 'crafts', noren: '和', nc: 'persimmon', kan: ['和小物', '竹細工', '京指物'], strips: null, clutter: ['umbrellaRack'] },
  restaurant: { kind: 'tofu', noren: '湯どうふ', nc: 'indigo', kan: ['京料理', '懐石料理'], strips: 'tofu', clutter: ['endai'] },
  soba:       { kind: 'soba', noren: '手打蕎麦', nc: 'indigo', kan: ['名代'], strips: 'soba', clutter: ['endai'] },
  soap:       { kind: 'komono', noren: '和', nc: 'green', kan: ['和小物'], strips: null, clutter: ['crate'] },
  potter:     { kind: 'ceramics', noren: '焼', nc: 'cream', kan: ['清水焼窯元', '窯元直売'], strips: 'ceramic', clutter: ['ceramicStand'] },
  workshop:   { kind: 'ceramics', front: 'closed', noren: null, nc: 'brown', kan: ['陶房', '窯元'], strips: null, clutter: ['crate', 'boxStack'] },
  house:      { kind: null, noren: null, nc: 'indigo', kan: null, strips: null, clutter: ['planterPot'] },
  temple:     { kind: null, noren: null, nc: 'indigo', kan: null, strips: null, clutter: [] },
};

/* ------------------------------------------------------------------ *
 * 6.  The census, in walking order.
 *
 * STREET 1.1 gives the actual sequence of frontages walking DOWN 清水坂 from
 * the 仁王門; these are the same shops laid out walking UP, which is the way
 * the route arrives.  Sides are dealt so the order still holds -- you pass
 * them the way you would, alternating across the street.
 * ------------------------------------------------------------------ */

const KZ_NORTH = [
  { n: '七味家本舗', c: 'spice', k: '七味家本舗', p: '七味唐辛子', noren: '七味唐がらし', nc: 'indigo', w: 4, x: 'shichimi' },
  { n: '来迎院', c: 'temple', k: '来迎院', w: 3 },
  { n: '京ばあむ', c: 'sweets', k: '京ばあむ', p: '清水店', nc: 'cream', w: 3, front: 'counter', x: 'white' },
  { n: '元祖八ッ橋', c: 'yatsuhashi', k: '元祖八ッ橋', p: '西尾為忠商店', noren: '八ツ橋', nc: 'cream', w: 4, x: 'fold' },
  { n: '本家西尾八ッ橋', c: 'yatsuhashi', k: '本家西尾八ッ橋', p: '清水坂店', noren: '八ツ橋', nc: 'cream', w: 5, floors: 2, x: 'orange' },
  { n: '天亀', c: 'crafts', k: '天亀', p: '友禅小物', noren: '和', nc: 'persimmon', w: 3, x: 'tenki' },
  { n: '上川商店', c: 'souvenir', k: '上川商店', noren: '御土産', nc: 'cream', w: 3 },
  { n: '森陶器館', c: 'ceramics', k: '森陶器館', p: '清水焼窯元', noren: '清水焼', nc: 'cream', w: 4, x: 'mori' },
  { n: 'ショコラ', c: 'sweets', k: '珈琲・チョコレート', p: '喫茶', nc: 'brown', w: 3 },
  { n: '川勝總本家', c: 'pickles', k: '川勝總本家', p: '京つけもの', noren: '京漬物', nc: 'brown', w: 4, x: 'chilled' },
  { n: '谷口清雅堂', c: 'ceramics', k: '谷口清雅堂', p: '京陶器', noren: '清水焼', nc: 'cream', w: 3, x: 'pottery' },
  { n: '清水京あみ', c: 'sweets', k: '清水京あみ', p: '焼きたて', nc: 'cream', w: 3, front: 'counter', x: 'bake' },
  { n: '聖護院八ッ橋', c: 'yatsuhashi', k: '聖護院八ッ橋', p: '岩月堂', noren: '八ツ橋', nc: 'cream', w: 3 },
  { n: '桜士堂', c: 'textiles', k: '桜士堂', p: '西陣織', noren: '染', nc: 'indigo', w: 3 },
  { n: '朝日堂', c: 'ceramics', k: '朝日堂', p: '清水焼', noren: '器', nc: 'cream', w: 5, floors: 2, x: 'asahi' },
  { n: '京みやげ西秀', c: 'souvenir', k: '京みやげ西秀', noren: '御土産', nc: 'cream', w: 3 },
  { n: 'もみぢや', c: 'souvenir', k: 'もみぢや', p: '御殿八ッ橋おぼこ', noren: '京', nc: 'indigo', w: 4 },
];

const KZ_SOUTH = [
  { n: '箸屋', c: 'crafts', k: '箸屋', p: '京指物', noren: '和', nc: 'persimmon', w: 2 },
  { n: '栄山堂', c: 'cafe', k: '栄山堂', p: '坂の駅', noren: '喫茶', nc: 'persimmon', w: 3, x: 'softserve' },
  { n: '清水順正', c: 'restaurant', k: '清水順正', p: 'おかべ家', noren: '湯どうふ', nc: 'indigo', w: 6, floors: 2 },
  { n: '寺子屋本舗', c: 'streetfood', k: '寺子屋本舗', p: '手焼せんべい', noren: '焼', nc: 'indigo', w: 3, x: 'grill' },
  { n: '吉田宗蔵', c: 'souvenir', k: '吉田宗蔵', noren: '御土産', nc: 'cream', w: 3 },
  { n: '真福寺大日堂', c: 'temple', k: '真福寺', p: '大日堂', w: 3 },
  { n: '山口屋', c: 'incense', k: '山口屋', p: '京念珠・仏具', noren: '御香', nc: 'brown', w: 3, x: 'incense' },
  { n: '京都北山', c: 'sweets', k: '京都北山', p: '京菓子', noren: '京菓子', nc: 'cream', w: 3 },
  { n: '朝日陶庵', c: 'ceramics', k: '朝日陶庵', p: '音羽茶寮', noren: '器', nc: 'cream', w: 4 },
  { n: 'アートサロンくら', c: 'crafts', k: 'アートサロンくら', p: '蔵', nc: 'cream', w: 3, front: 'closed', x: 'kura' },
  { n: '山本商店', c: 'souvenir', k: '山本商店', noren: '御土産', nc: 'cream', w: 3 },
  { n: '梅山堂', c: 'souvenir', k: '梅山堂', p: '京銘菓', noren: '京菓子', nc: 'crimson', w: 6, floors: 2 },
  { n: '大安', c: 'pickles', k: '大安', p: '京つけもの', noren: '漬', nc: 'brown', w: 3, x: 'chilled' },
  { n: '本家西尾八ッ橋', c: 'yatsuhashi', k: '本家西尾八ッ橋', p: '清水店', noren: '八ツ橋', nc: 'cream', w: 4, x: 'sample' },
  { n: '京つけもの西利', c: 'pickles', k: '京つけもの西利', p: '清水店', noren: '京漬物', nc: 'brown', w: 3 },
  { n: '湯葉チーズ本舗', c: 'streetfood', k: '湯葉チーズ本舗', p: 'ゆばチーズ', nc: 'crimson', w: 3, x: 'fried' },
  { n: '梅山堂', c: 'souvenir', k: '梅山堂', p: '第一営業所', noren: '御土産', nc: 'crimson', w: 6, floors: 2 },
];

/* The rest of the §1.5 census, filling between the named frontages so the
 * street is continuous without inventing trades that are not on it. */
const KZ_FILL = [
  { n: '華扇', c: 'fans', k: '華扇', p: '京扇子', noren: '扇', nc: 'indigo', x: 'fans' },
  { n: '錦扇', c: 'fans', k: '錦扇', p: '京扇子', noren: '京扇子', nc: 'indigo' },
  { n: '錦古堂', c: 'fans', k: '錦古堂', noren: '扇', nc: 'indigo' },
  { n: '木村桜士堂', c: 'dolls', k: '木村桜士堂', p: '京人形', noren: '京こま', nc: 'cream' },
  { n: '清水人形高橋', c: 'dolls', k: '清水人形', p: '土人形', noren: '和', nc: 'cream' },
  { n: 'すぎやま', c: 'crafts', k: 'すぎやま', p: '京の豆人形', noren: '和小物', nc: 'persimmon' },
  { n: '久世商店', c: 'knives', k: '久世商店', p: '京刃物', noren: '刃', nc: 'indigo' },
  { n: '飾 清水', c: 'crafts', k: '飾', p: '和小物', noren: '和', nc: 'purple' },
  { n: '梅花堂', c: 'souvenir', k: '梅花堂', noren: '御土産', nc: 'cream' },
  { n: '局屋立春', c: 'sweets', k: '局屋立春', p: '京菓子', noren: '御菓子司', nc: 'cream' },
  { n: 'GOKAGO', c: 'tea', k: '日本茶専門店', p: '茶器', noren: '茶', nc: 'green' },
  { n: '安田陶器店', c: 'ceramics', k: '安田陶器店', p: '陶器', noren: '焼', nc: 'cream' },
  { n: '布遊舎', c: 'textiles', k: '布遊舎', p: '手ぬぐい', noren: '染', nc: 'indigo' },
  { n: '経書堂', c: 'temple', k: '経書堂' },
  { n: 'こんにゃくしゃぼん', c: 'soap', k: 'こんにゃくしゃぼん', p: '洗顔石鹸', noren: '和', nc: 'green', x: 'soap' },
  { n: '杉養蜂園', c: 'sweets', k: '蜂蜜', p: 'はちみつソフト', noren: '甘', nc: 'crimson' },
  { n: '天', c: 'cafe', k: '天', p: '和カフェ', noren: '喫茶', nc: 'persimmon' },
  { n: '洋菓子', c: 'sweets', k: '洋菓子', p: '京銘菓', nc: 'green' },
  { n: 'なかじん', c: 'souvenir', k: 'なかじん', noren: '御土産', nc: 'cream' },
  { n: '三十六峰', c: 'souvenir', k: '三十六峰', p: '京みやげ', noren: '京', nc: 'indigo' },
  { n: '中条昇山', c: 'crafts', k: '中条昇山', p: '和小物', noren: '和', nc: 'persimmon' },
  { n: '河原栄山', c: 'souvenir', k: '河原栄山', p: '聖護院八ッ橋', noren: '京菓子', nc: 'cream' },
  { n: '大継渓山堂', c: 'souvenir', k: '大継渓山堂', noren: '御土産', nc: 'cream' },
  { n: '伊藤久右衛門', c: 'tea', k: '宇治茶', p: '抹茶パフェ', noren: '抹茶処', nc: 'green' },
  { n: 'クレープ', c: 'streetfood', k: 'クレープ', p: 'ソフトクリーム', nc: 'crimson' },
  { n: '和雑貨', c: 'crafts', k: '和雑貨', p: '京みやげ', noren: '和', nc: 'indigo' },
  { n: '珈琲', c: 'cafe', k: '珈琲', p: '和栗', noren: '喫茶', nc: 'brown' },
  { n: '生八ッ橋', c: 'yatsuhashi', k: '生八ッ橋', p: '試食できます', noren: '八ツ橋', nc: 'cream' },
];

/** 清水道 -- a road, with houses on it. */
const MICHI_FILL = [
  { n: '', c: 'house' }, { n: '', c: 'house' }, { n: '', c: 'house' },
  { n: '', c: 'house' }, { n: '', c: 'house' },
  { n: '喫茶', c: 'cafe', k: '喫茶', noren: '喫茶', nc: 'brown' },
  { n: '', c: 'house' }, { n: '', c: 'house' },
  { n: '手打蕎麦', c: 'soba', k: '手打蕎麦', p: '名代', noren: '蕎', nc: 'indigo' },
  { n: '', c: 'house' }, { n: '', c: 'house' },
  { n: '京つけもの', c: 'pickles', k: '京つけもの', noren: '漬', nc: 'brown' },
  { n: '', c: 'house' },
  { n: '京みやげ', c: 'souvenir', k: '京みやげ', noren: '御土産', nc: 'cream' },
  { n: '', c: 'house' }, { n: '', c: 'house' },
  { n: '旅館', c: 'house', k: '旅館' },
  { n: '', c: 'house' },
  { n: '御菓子司', c: 'sweets', k: '御菓子司', noren: '京菓子', nc: 'cream' },
  { n: '', c: 'house' }, { n: '', c: 'house' },
  { n: '和小物', c: 'crafts', k: '和小物', noren: '和', nc: 'persimmon' },
  { n: '', c: 'house' }, { n: '', c: 'house' },
];

/** 茶わん坂 -- the potters.  Workmanlike, and none of it sells souvenirs. */
const CHAWAN_FILL = [
  { n: '清水焼窯元', c: 'potter', k: '清水焼窯元', p: '窯元直売', noren: '焼', nc: 'cream', x: 'pottery' },
  { n: '陶房', c: 'workshop', k: '陶房', x: 'shutter' },
  { n: '京焼・清水焼', c: 'potter', k: '京焼・清水焼', p: '陶器', noren: '器', nc: 'cream' },
  { n: '', c: 'house' },
  { n: '陶芸教室', c: 'workshop', k: '陶芸教室', p: '手びねり・絵付け', x: 'wallsign' },
  { n: '窯元', c: 'workshop', k: '窯元', x: 'kiln' },
  { n: '陶器', c: 'potter', k: '陶器', noren: '焼', nc: 'cream' },
  { n: '', c: 'house' },
  { n: '清水焼', c: 'potter', k: '清水焼', p: '茶わん坂', noren: '清水焼', nc: 'cream', x: 'pottery' },
  { n: '陶房', c: 'workshop', k: '陶房', x: 'shutter' },
  { n: '', c: 'house' },
  { n: '京陶苑', c: 'potter', k: '京陶苑', p: '窯元', noren: '器', nc: 'cream' },
  { n: '局屋立春', c: 'sweets', k: '局屋立春', p: '京菓子', noren: '御菓子司', nc: 'cream' },
  { n: '', c: 'house' },
  { n: '陶器工房', c: 'workshop', k: '陶器工房', x: 'wallsign' },
  { n: '', c: 'house' },
  { n: '清水焼窯元', c: 'potter', k: '清水焼窯元', noren: '焼', nc: 'cream' },
  { n: '', c: 'house' },
];

/* ------------------------------------------------------------------ *
 * 7.  Geometry helpers.
 * ------------------------------------------------------------------ */

const boxG = (w, h, d, x = 0, y = 0, z = 0) => {
  const g = new THREE.BoxGeometry(Math.max(2e-3, w), Math.max(2e-3, h), Math.max(2e-3, d));
  g.translate(x, y, z);
  return g;
};
const cylG = (rt, rb, h, seg, x = 0, y = 0, z = 0) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
};

/* ==================================================================== *
 * build
 * ==================================================================== */

export function build(ctx) {
  const rng = rngKit(77201);
  const bake0 = ctx.baker(BAKER);
  const out = { buildings: [], shops: [], plots: [] };

  const SIGN = atlasSet(2048, 2048);
  const CLOTHA = atlasSet(2048, 1024);
  const norens = [];

  const kanbanCell = (t, o = {}) => SIGN.cell('kan|' + t + '|' + (o.board ?? 0) + '|' + (o.sub ?? ''), 88, 352, kanbanPainter(t, o));
  const plaqueCell = (t, o = {}) => SIGN.cell('plq|' + t + '|' + (o.board ?? 0), 288, 84, plaquePainter(t, o));
  const stripCell = (k) => SIGN.cell('str|' + k, 176, 288, stripRackPainter(STRIPS[k] || STRIPS.street));
  const bannerCell = (t) => SIGN.cell('ban|' + t, 76, 300, bannerPainter(t));
  const aboardCell = (l) => SIGN.cell('abd|' + l.join('/'), 168, 264, aboardPainter(l));
  const markerCell = (t) => SIGN.cell('mrk|' + t, 76, 320, markerPainter(t));
  const wallCell = (t) => SIGN.cell('wal|' + t, 152, 320, wallSignPainter(t));
  const norenCell = (t, k) => CLOTHA.cell('nor|' + t + '|' + k, 256, 128,
    norenPainter(t, { ...CLOTH[k], panels: [...(t || '')].length > 3 ? 5 : 3 }));

  /** A quad in a building's local frame (x along the frontage, -z the street). */
  const facade = (r, w, h, lx, ly, lz, M, yaw = Math.PI) => {
    if (!r) return;
    const g = cellQuad(w, h, r);
    g.rotateY(yaw);
    g.translate(lx, ly, lz);
    SIGN.push(r, g, M);
  };
  /** A quad standing free in the world. */
  const freeSign = (r, w, h, x, y, z, yaw) => {
    if (!r) return;
    const g = cellQuad(w, h, r);
    SIGN.push(r, g, trs(x, y, z, 0, yaw, 0));
  };

  /* --------------------------- the motion mesh -------------------------- */
  /* Every moving interactable in the district in one vertex-coloured mesh,
   * animated by vertex range: eleven of them for one draw call. */
  const motion = {
    parts: [], verts: 0, items: [],
    add(geometry, color, matrix) {
      const g = geometry.clone();
      if (matrix) g.applyMatrix4(matrix);
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
      }
      if (!g.attributes.normal) g.computeVertexNormals();
      const c = new THREE.Color(color);
      const n = g.attributes.position.count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      this.parts.push({ geometry: g, matrix: null });
      this.verts += n;
      geometry.dispose();
    },
    item(kind, opts, fn) {
      const start = this.verts;
      fn();
      const rec = { kind, start, count: this.verts - start, energy: 0, phase: 0, ...opts };
      this.items.push(rec);
      return rec;
    },
  };

  const labels = [];
  const addInteract = (x, y, z, label, action, size = [1.1, 1.3, 1.1]) => {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    box.position.set(x, y, z);
    box.visible = false;
    box.name = 'kz-hit';
    box.userData.noMerge = true;
    ctx.add(box);
    ctx.interact({ hitbox: box, label, action });
    labels.push(label);
  };

  const heroes = {};

  /* ------------------------------------------------------------------ *
   * 8.  One frontage.
   *
   * The shopfront kit builds the unit -- the mouth, the display, the trade's
   * own furniture -- and everything it makes merges into this district's
   * baker.  What is added here is the layer the kit deliberately leaves to a
   * district: the census's real names, on real 看板, and the clutter on the
   * apron in front of them.
   * ------------------------------------------------------------------ */

  /**
   * A gable end that faces the street.
   *
   * Where a row breaks -- at a junction, a side lane, the end of a run -- the
   * building next to the break turns its flank to the camera, and because the
   * ground behind 清水坂 falls two and a half metres inside the depth of a
   * plot, that flank is a **plaster cliff**.  The real thing is not a cliff:
   * it is a stone retaining base, a plaster wall above it, a pent tile roof
   * running the depth of the plot, and a tile band at the eave.  Without this
   * the 産寧坂 junction is a blank wall filling a third of the frame, which is
   * exactly what the first render of it was.
   */
  function dressFlank(res, sx) {
    const M = trs(res.x, res.baseY, res.z, 0, res.ry, 0);
    const w = res.width, d = Math.min(res.depth, 13);
    const hz = d / 2;
    const sy = res.sillY - res.baseY;
    const hy = res.hisashiY - res.baseY;
    const ey = res.eaveY - res.baseY;
    const ex = sx * (w / 2);

    // how far the ground has fallen away by the back of the plot
    const cr = Math.cos(res.ry), sr = Math.sin(res.ry);
    const fx = res.x + (ex + sx * 0.2) * cr + d * sr;
    const fz = res.z - (ex + sx * 0.2) * sr + d * cr;
    const gLow = Math.min(ctx.groundAt(fx, fz), res.baseY);
    const bot = clamp(gLow - res.baseY - 0.5, -6.5, sy - 0.9);
    const top = sy - 0.06;

    // 石垣 -- the retaining base, coursed
    bake0.add(boxG(0.34, top - bot, d + 0.18, ex + sx * 0.16, (top + bot) / 2, hz), M, PAL.stoneWall, O.stone);
    for (let k = 0; bot + 0.46 * (k + 1) < top - 0.1; k++) {
      bake0.add(boxG(0.40, 0.045, d + 0.18, ex + sx * 0.16, bot + 0.46 * (k + 1), hz), M, PAL.stoneWallDark, O.stone);
    }
    // the pent roof that runs the depth of the flank
    const g = new THREE.BoxGeometry(0.98, 0.075, d + 0.10);
    g.rotateZ(-sx * 0.26);
    g.translate(ex + sx * 0.44, hy - 0.04, hz);
    bake0.add(g, M, PAL.tileRoof, O.tile);
    bake0.add(boxG(0.14, 0.10, d + 0.14, ex + sx * 0.90, hy - 0.26, hz), M, PAL.tileRidge, O.tile);
    bake0.add(boxG(0.10, 0.11, d + 0.10, ex + sx * 0.05, hy + 0.08, hz), M, PAL.timberDark, O.timberDeep);
    // a tile band at the eave, and one string course between
    bake0.add(boxG(0.13, 0.10, d + 0.12, ex + sx * 0.05, ey - 0.10, hz), M, PAL.tileRidge, O.tile);
    bake0.add(boxG(0.09, 0.07, d + 0.06, ex + sx * 0.03, (hy + ey) / 2, hz), M, PAL.timberDark, O.timberDeep);
    // 虫籠窓 -- two of them in the upper wall, so the flank has a scale on it
    for (let k = 0; k < 2; k++) {
      const zz = d * (0.30 + k * 0.34);
      bake0.add(boxG(0.10, 0.62, 0.98, ex + sx * 0.02, (hy + ey) / 2 + 0.30, zz), M, PAL.timberDark, O.dark);
      for (let j = 0; j < 5; j++) {
        bake0.add(boxG(0.13, 0.58, 0.075, ex + sx * 0.05, (hy + ey) / 2 + 0.30, zz - 0.40 + j * 0.20),
          M, res.plasterTone ?? PAL.plaster, O.plaster);
      }
    }
  }

  function buildFrontage({
    street, side, from, to, list, seed, gap = 0.02, depth = [8, 13],
    lod = false, skip = [], awnings = 0, twoStorey = 0.5, mix = 'shop', onEach = null,
  }) {
    const plots = layoutPlots({ street, side, from, to, mix, gap, seed, skip });
    out.plots.push(...plots);
    const R = rngKit(seed * 31 + 7);
    let prevPlaster = null;
    /* local +x runs with the street on the left frontage and against it on the
     * right, so which end of a building is exposed depends on the side. */
    const xUp = side < 0 ? -1 : 1;

    plots.forEach((p, i) => {
      if (p.x > PRECINCT_X) return;               // the precinct's ground
      const spec = list[i % list.length];
      const cat = CAT[spec.c] || CAT.souvenir;
      const sd = (seed * 7919 + i * 131 + 17) >>> 0;
      const width = spec.w ? spec.w * KEN : p.width;
      const dep = R.range(depth[0], depth[1]);

      let plaster = R.pickNot(PLASTER, prevPlaster);
      prevPlaster = plaster;
      if (spec.x === 'white') plaster = 0xf2efe8;
      if (spec.x === 'orange') plaster = ORANGE;
      if (spec.x === 'kura') plaster = PAL.plaster;

      const common = {
        x: p.x, z: p.z, ry: p.ry, width, depth: dep, seed: sd, baker: BAKER, lod,
        timberTone: spec.x === 'kura' ? PAL.timberGrey : R.pick(TIMBER),
        plasterTone: plaster,
        roofMaterial: R.chance(0.22) ? 'tileOld' : 'tile',
        sodekabe: R.chance(0.16),
        udatsu: R.chance(0.05),
      };

      let res;
      if (!cat.kind) {
        /* Non-retail.  STREET 6.1 puts it at 5 % of 清水坂's frontage, and it
         * is a small temple hall or a house set into the row -- never a blank
         * wall, which is the thing that makes a generated street look
         * generated. */
        res = makeMachiya(ctx, {
          ...common,
          style: spec.c === 'temple' ? 'machiya' : 'residence',
          floors: spec.c === 'temple' ? 1 : (R.chance(0.4) ? 2 : 1.5),
          y: p.yLow,
          latticeKind: 'fine',
        });
      } else {
        res = makeShopfront(ctx, {
          ...common,
          kind: cat.kind,
          front: spec.front || cat.front,
          /* 酒屋格子 is bengara-painted, and the kit gives it to the souvenir
           * and yatsuhashi trades -- which on this street would put a strong
           * red on a third of the frontage.  STREET 4.3 is explicit that
           * 清水坂 is timber and plaster and that bengara belongs to Gion, so
           * the coarse lattice is mostly left bare (米屋格子) here and the
           * painted one kept as an occasional accent. */
          latticeKind: R.chance(0.72) ? R.pick(['komeya', 'itoya', 'komeya', 'fine']) : undefined,
          floors: spec.floors ?? (R.chance(twoStorey) ? 2 : 1.5),
          name: spec.k || null,
          /* The kit's own noren and signboard are one texture, one material
           * and one mesh each; this district has ninety of them, so they are
           * suppressed here and rebuilt out of the shared atlas below with
           * the census's real strings on them. */
          noren: false, signboard: false,
        });
        ctx.stats.shopfronts++;
        out.shops.push(spec.n || cat.kind);
      }
      res.plasterTone = plaster;
      out.buildings.push(res);

      /* ---- the local frame, for everything hung on this building ------- */
      const M = trs(res.x, res.baseY, res.z, 0, res.ry, 0);
      const sillY = res.sillY - res.baseY;
      const hisashiY = res.hisashiY - res.baseY;
      const bayW = res.bayWidth;
      const entryX = -res.width / 2 + bayW * (res.entryBay + 0.5);
      const outer = res.entryBay === 0 ? 1 : -1;      // away from the 大戸

      /* 袖看板 -- projecting, <= 1.0 m out, >= 2.5 m clear.  Above the 通り庇,
       * which is the only place on a Kyoto shopfront where a metre of
       * projection is both legal and physical. */
      const kan = spec.k || (cat.kan ? R.pick(cat.kan) : null);
      if (kan) {
        const gold = R.chance(0.30);
        const r = kanbanCell(kan, {
          board: gold ? 0x2a2420 : PAL.timberPale,
          ink: gold ? PAL.gold : PAL.black,
          sub: spec.x === 'tenki' ? '篆書' : null,
        });
        if (r) {
          const sw = 0.30, sh = clamp(0.26 + [...kan].length * 0.24, 0.6, 1.45);
          const sx = outer * (res.width / 2 - 0.13);
          const sy = hisashiY + 0.52 + sh / 2;
          bake0.add(boxG(0.05, sh + 0.07, sw + 0.07, sx, sy, -0.44), M, PAL.timberDark, O.timberDeep);
          for (const s of [-1, 1]) {
            facade(r, sw, sh, sx + s * 0.033, sy, -0.44, M, s > 0 ? Math.PI / 2 : -Math.PI / 2);
          }
          bake0.add(boxG(0.05, 0.05, 0.50, sx, sy + sh / 2 + 0.05, -0.22), M, PAL.timberDark, O.timberDeep);
        }
        // and the flat plank on the pier, which almost every shop also has
        if (R.chance(0.66)) {
          const r2 = kanbanCell(kan, { board: gold ? PAL.timberPale : 0x2a2420, ink: gold ? PAL.black : PAL.gold });
          const px = -outer * (res.width / 2 - 0.24);
          const sh = clamp(0.24 + [...kan].length * 0.20, 0.5, 1.10);
          bake0.add(boxG(0.30, sh + 0.06, 0.05, px, hisashiY + 0.50 + sh / 2, -0.06), M, PAL.timberDark, O.timberDeep);
          facade(r2, 0.26, sh, px, hisashiY + 0.50 + sh / 2, -0.10, M);
        }
      }

      /* 扁額 -- the horizontal name board over the opening. */
      if (spec.p) {
        const r = plaqueCell(spec.p, spec.x === 'orange'
          ? { board: ORANGE_DEEP, ink: PAL.paper, frame: ORANGE }
          : spec.x === 'white' ? { board: 0xf2efe8, ink: PAL.black, frame: 0xd8d4cc } : {});
        facade(r, Math.min(res.width - 0.4, 1.9), 0.34, 0, hisashiY + 0.26, -0.10, M);
      }

      /* 短冊掛け -- eight to twenty price strips at the mouth.  Food trades. */
      if (cat.strips && R.chance(0.80)) {
        const px = clamp(entryX + outer * bayW * 0.62, -res.width / 2 + 0.36, res.width / 2 - 0.36);
        bake0.add(boxG(0.62, 1.08, 0.05, px, sillY + 1.34, -0.075), M, PAL.timberDark, O.timberDeep);
        facade(stripCell(cat.strips), 0.56, 1.00, px, sillY + 1.34, -0.105, M);
      }

      /* 暖簾 -- hung at 1.75 so you duck.  One quad each into the cut-out
       * atlas; the hem is lifted by the single updater at the end. */
      const nText = spec.noren !== undefined ? spec.noren : cat.noren;
      if (nText !== null && nText !== undefined && cat.kind) {
        const key = spec.nc || cat.nc || 'indigo';
        const r = norenCell(nText || '', key);
        if (r) {
          /* ARCH: hem at 1.5-1.7 so you duck slightly.  A 通り庇 at 2.62 m
           * leaves 0.7 m of drop, which is a 半暖簾 -- and a half noren is
           * correct here anyway: these shops want the interior visible. */
          const top = hisashiY - 0.28;
          const nh = clamp(top - 1.63, 0.52, 1.22);
          const w0 = Math.min(bayW * ([...(nText || '')].length > 3 ? 1.4 : 1.0), res.width - 0.24);
          const g = cellQuad(w0, nh, r);
          g.rotateY(Math.PI);
          g.translate(entryX, top - nh / 2, -0.15);
          const idx = CLOTHA.push(r, g, M);
          norens.push({
            page: r.page, idx,
            dx: -Math.sin(res.ry) * 0.030, dz: -Math.cos(res.ry) * 0.030, dy: -0.012,
            phase: R.range(0, 6.283), energy: 0,
          });
          bake0.add(cylG(0.026, 0.026, w0 + 0.10, 5, 0, 0, 0).rotateZ(Math.PI / 2)
            .translate(entryX, top + 0.03, -0.15), M, PAL.timberDark, O.timberDeep);
        }
      }

      /* 幕 -- the canvas awning.  STREET 4.3: these appear on 清水坂 in a way
       * they do not on Ninenzaka, and only in three colours. */
      if (awnings && R.chance(awnings) && cat.kind) {
        const col = R.pick(AWNING);
        const d = 1.0;
        const y = hisashiY + 0.14;
        const g = new THREE.BoxGeometry(res.width - 0.12, 0.05, d);
        g.rotateX(0.20);
        g.translate(0, y - 0.10, -0.94 - d / 2 + 0.30);
        bake0.add(g, M, col, O.cloth);
        bake0.add(boxG(res.width - 0.12, 0.22, 0.04, 0, y - 0.32, -0.94 - d + 0.32), M, col, O.cloth);
        for (const s of [-1, 1]) {
          bake0.add(cylG(0.026, 0.026, d + 0.2, 5, 0, 0, 0).rotateX(Math.PI / 2)
            .translate(s * (res.width / 2 - 0.14), y - 0.22, -0.94 - d / 2 + 0.32),
          M, PAL.metalDark, O.metal);
        }
      }

      /* The licensed outlier: 「鮮やかなオレンジ色の外観」.  Painted, not
       * timber -- a band under the eave and the piers below it. */
      if (spec.x === 'orange') {
        bake0.add(boxG(res.width + 0.06, 0.44, 0.06, 0, hisashiY - 0.62, -0.09), M, ORANGE, O.warmDeep);
        for (let k = 0; k <= res.bays; k++) {
          bake0.add(boxG(0.17, Math.max(0.3, hisashiY - sillY - 0.74), 0.055,
            -res.width / 2 + bayW * k, sillY + (hisashiY - sillY - 0.74) / 2, -0.078),
          M, ORANGE, O.warmDeep);
        }
      }

      /* 提灯 under the 通り庇 -- the prop batcher owns them. */
      if (R.chance(0.46) && cat.kind) {
        const lx = entryX + outer * bayW * 0.40;
        const w = {
          x: res.x + lx * Math.cos(res.ry) + (-0.55) * Math.sin(res.ry),
          z: res.z - lx * Math.sin(res.ry) + (-0.55) * Math.cos(res.ry),
        };
        ctx.prop({
          kind: 'ochayaLantern', x: w.x, z: w.z, y: res.hisashiY - 0.08,
          rot: res.ry, variant: R.chance(0.45) ? 'white' : undefined, seed: sd,
        });
      }

      /* ---- the apron: the 1.2 m of ground in front of the shop line ---- */
      const nx = p.street.nx, nz = p.street.nz;
      const tx = -nz * (side < 0 ? -1 : 1), tz = nx * (side < 0 ? -1 : 1);
      const yaw = p.ry + Math.PI;
      const at = (d, s = 0) => ({ x: p.x - nx * d + tx * s, z: p.z - nz * d + tz * s });
      const put = (kind, d, s, extra = {}) => {
        const w = at(d, s);
        ctx.prop({ kind, x: w.x, z: w.z, rot: yaw, seed: R.int(1, 1e9), ...extra });
        return w;
      };

      for (const k of cat.clutter) {
        if (k === 'ceramicStand') { put(k, 0.98, R.range(-0.6, 0.6), { variant: res.width > 6 ? 'wide' : undefined }); continue; }
        if (k === 'fanRack') { put(k, 0.80, R.range(-0.5, 0.5)); continue; }
        if (k === 'sampleTray') { put(k, 0.94, R.range(-0.7, 0.7)); continue; }
        if (k === 'endai') { put(k, 0.86, R.range(-0.7, 0.7), { variant: R.chance(0.4) ? 'short' : undefined }); continue; }
        if (k === 'incenseBurner') { put(k, 0.84, R.range(-0.5, 0.5)); continue; }
        if (k === 'hangingCloth') { put(k, 0.34, R.range(-0.6, 0.6), { variant: 'noren' }); continue; }
        if (R.chance(0.72)) put(k, R.range(0.72, 1.02), R.range(-0.9, 0.9));
      }
      if (R.chance(0.26)) put('bucket', 0.52, R.range(-1.3, 1.3));
      if (R.chance(0.18)) put('broom', 0.34, R.range(-1.3, 1.3));
      if (R.chance(0.20)) put('umbrellaStand', 0.48, R.range(-1.1, 1.1));
      if (R.chance(0.22)) put('crate', R.range(0.80, 1.05), R.range(-1.2, 1.2));
      if (R.chance(0.10)) put('catAsleep', 0.70, R.range(-1.0, 1.0));

      /* 立て看板 -- chalk on a hinged board, inside the shop's own frontage
       * line, which the district's etiquette is strict about. */
      if (cat.strips && R.chance(0.40)) {
        const w = at(1.10, R.range(-1.0, 1.0));
        const y = ctx.groundAt(w.x, w.z);
        const lines = spec.c === 'yatsuhashi' ? ['試食し放題', 'お茶どうぞ', '生八ッ橋']
          : spec.c === 'pickles' ? ['ご試食', 'どうぞ', '京つけもの']
            : spec.c === 'restaurant' ? ['本日営業中', 'ゆどうふ', '３０００円']
              : ['本日営業中', 'ソフトクリーム', '５００円'];
        const r = aboardCell(lines);
        for (const s of [-1, 1]) {
          const g = cellQuad(0.52, 0.86, r);
          g.rotateX(s * 0.19);
          SIGN.push(r, g, trs(w.x, y + 0.50, w.z, 0, yaw + (s > 0 ? 0 : Math.PI), 0));
        }
        bake0.add(boxG(0.58, 0.05, 0.30, 0, 0.025, 0), trs(w.x, y, w.z, 0, yaw, 0), PAL.timberDark, O.timberDeep);
      }

      /* 幟 -- the two banners outside the loudest frontage on the street. */
      if (cat.banner) {
        for (let k = 0; k < 2; k++) {
          const w = at(1.06, -0.85 + k * 1.7);
          const y = ctx.groundAt(w.x, w.z);
          const text = spec.x === 'fried' ? (k ? 'ゆばチーズ' : '揚げたて')
            : k ? '名物' : (spec.p || '京銘菓');
          const r = bannerCell(text);
          const Mb = trs(w.x, y, w.z, 0, yaw, 0);
          for (const s of [-1, 1]) {
            const g = cellQuad(0.42, 1.72, r);
            if (s < 0) g.rotateY(Math.PI);
            g.translate(0, 1.12, s * 0.03);
            SIGN.push(r, g, Mb);
          }
          bake0.add(cylG(0.026, 0.026, 2.16, 5, -0.23, 1.10, 0), Mb, PAL.metalDark, O.metal);
          bake0.add(cylG(0.020, 0.020, 0.50, 5, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, 1.96, 0),
            Mb, PAL.metalDark, O.metal);
        }
      }

      /* A break in the row -- a junction, a side lane, the end of the run --
       * turns a flank to the street.  Dress it, or it is a plaster cliff. */
      const prev = plots[i - 1], next = plots[i + 1];
      const openDown = !prev || (p.s - p.width / 2) - (prev.s + prev.width / 2) > 1.1;
      const openUp = !next || (next.s - next.width / 2) - (p.s + p.width / 2) > 1.1;
      if (openDown) dressFlank(res, -xUp);
      if (openUp) dressFlank(res, xUp);

      if (spec.x) heroes[spec.x] = heroes[spec.x] || { p, res, at, yaw, R };
      if (onEach) onEach(p, spec, res, { at, yaw, R, M, sillY, hisashiY });
    });
    return plots;
  }

  /* ================================================================== *
   * 9.  清水坂 -- the pilgrimage corridor.
   *
   * 産寧坂's top is (142.3, 260.4) and the north frontage line of 清水坂 runs
   * within a metre of it, so that stretch is the junction and is left open.
   * 七味家本舗 has held the corner on its east side since 1655 and is the best
   * "you are here" landmark on the route.
   * ================================================================== */

  buildFrontage({
    street: 'kiyomizuzaka', side: -1, from: 0.004, to: 0.93,
    list: interleave(KZ_NORTH, KZ_FILL, 0),
    seed: 811, gap: 0.015, depth: [9, 13], awnings: 0.22, twoStorey: 0.60,
    skip: [[0.010, 0.052]],
  });

  buildFrontage({
    street: 'kiyomizuzaka', side: 1, from: 0.004, to: 0.90,
    list: interleave(KZ_SOUTH, KZ_FILL, 3),
    seed: 907, gap: 0.015, depth: [9, 13], awnings: 0.26, twoStorey: 0.56,
  });

  /* ================================================================== *
   * 10.  清水道 -- the arrival.  A road, and it must feel like one.
   * ================================================================== */

  for (const side of [-1, 1]) {
    buildFrontage({
      street: 'kiyomizuzakaLower', side, from: 0.035, to: 0.965,
      list: rotate(MICHI_FILL, side < 0 ? 0 : 5),
      seed: side < 0 ? 1201 : 1303,
      mix: 'machiya', gap: 0.10, depth: [8, 14], lod: true, twoStorey: 0.34, awnings: 0.05,
      /* Side lanes off both sides and the bus bay at the bottom: a road this
       * wide is not a party wall the whole way up. */
      skip: side < 0
        ? [[0.00, 0.055], [0.30, 0.345], [0.62, 0.665], [0.86, 0.895]]
        : [[0.00, 0.075], [0.19, 0.235], [0.47, 0.515], [0.77, 0.815]],
    });
  }

  /* ================================================================== *
   * 11.  茶わん坂 -- the potters.
   * ================================================================== */

  for (const side of [-1, 1]) {
    buildFrontage({
      street: 'chawanzaka', side, from: 0.03, to: 0.60,
      list: rotate(CHAWAN_FILL, side < 0 ? 0 : 4),
      seed: side < 0 ? 1607 : 1709,
      mix: 'machiya', gap: 0.09, depth: [7, 11], lod: true, twoStorey: 0.20, awnings: 0.03,
      skip: side < 0 ? [[0.18, 0.215], [0.44, 0.475]] : [[0.30, 0.335]],
      onEach: (p, spec, res, f) => dressPotter(p, spec, res, f),
    });
  }

  /* ------------------------------------------------------------------ *
   * 11a.  What makes a potters' street a potters' street.
   *
   * Stacked 匣鉢 saggars, a chimney, pallets of clay under a tarpaulin, a
   * roller shutter, and a trade sign painted straight onto the plaster.  None
   * of it is for sale and none of it is for you.
   * ------------------------------------------------------------------ */
  function dressPotter(p, spec, res, f) {
    const R = f.R;
    const yaw = f.yaw;

    if (spec.x === 'wallsign' && spec.k) {
      const px = clamp(res.width / 2 - 0.5, 0.3, 3.0);
      facade(wallCell(spec.k), 0.60, 1.30, -px, f.sillY + 1.72, -0.09, f.M);
    }

    if (spec.x === 'shutter' || spec.x === 'kiln') {
      const w = f.at(0.16, 0);
      ctx.prop({ kind: 'shutterHalf', x: w.x, z: w.z, rot: yaw, variant: R.chance(0.5) ? 'open' : undefined, seed: 3 });
    }

    /* 匣鉢 -- the fireclay boxes the ware is fired in, stacked outside every
     * workshop because there is nowhere else to put them. */
    if (R.chance(0.55)) {
      const w = f.at(0.62, R.range(-1.3, 1.3));
      const y = ctx.groundAt(w.x, w.z);
      const M = trs(w.x, y, w.z, 0, yaw, 0);
      const cols = R.int(2, 3);
      for (let c = 0; c < cols; c++) {
        const n = R.int(3, 6);
        const cx = (c - (cols - 1) / 2) * 0.34;
        for (let k = 0; k < n; k++) {
          bake0.add(cylG(0.155, 0.16, 0.135, 9, cx + R.range(-0.02, 0.02), 0.07 + k * 0.135, R.range(-0.02, 0.02)),
            M, k % 2 ? 0xa89881 : 0x9c8b74, O.stone);
        }
      }
      ctx.collideRot(w.x, w.z, cols * 0.36, 0.40, yaw, y + 0.7);
    }

    if (R.chance(0.30)) {                     // pallets of clay, wrapped
      const w = f.at(0.64, R.range(-1.4, 1.4));
      const y = ctx.groundAt(w.x, w.z);
      const M = trs(w.x, y, w.z, 0, yaw, 0);
      bake0.add(boxG(1.05, 0.12, 0.80, 0, 0.06, 0), M, PAL.timberMid, O.timber);
      for (let k = 0; k < 4; k++) {
        bake0.add(boxG(0.46, 0.17, 0.34, (k % 2 ? 0.26 : -0.26), 0.20 + Math.floor(k / 2) * 0.18, 0),
          M, k % 2 ? 0x8f8880 : 0x99928a, O.stone);
      }
      bake0.add(boxG(1.12, 0.05, 0.88, 0, 0.58, 0), M, 0x4f5a52, O.cloth);
    }

    if (spec.x === 'kiln') {                  // the chimney, behind the shed
      const w = f.at(-4.4, 1.3);
      const y = ctx.groundAt(w.x, w.z);
      const M = trs(w.x, y, w.z, 0, yaw, 0);
      bake0.add(boxG(1.05, 0.55, 1.05, 0, 0.27, 0), M, 0x8a6a58, O.stone);
      bake0.add(cylG(0.30, 0.40, 7.4, 10, 0, 4.0, 0), M, 0x9c7b64, O.stone);
      bake0.add(cylG(0.34, 0.34, 0.20, 10, 0, 7.75, 0), M, 0x7a5c4a, O.stone);
      for (let k = 0; k < 3; k++) bake0.add(cylG(0.33, 0.33, 0.07, 10, 0, 1.6 + k * 2.1, 0), M, 0x7a5c4a, O.stone);
      ctx.collideRot(w.x, w.z, 1.1, 1.1, yaw, y + 7.9);
      heroes.kiln = { x: w.x, z: w.z, y, yaw };
    }
  }

  /* ================================================================== *
   * 12.  Above the shops on 茶わん坂: the road in a cutting.
   * ================================================================== */
  {
    const c = ctx.getCorridor('chawanzaka');
    if (c) {
      for (const side of [-1, 1]) {
        const pts = alongStreet({
          street: 'chawanzaka', side, from: 0.60, to: 0.80,
          spacing: 3.4, offset: c.frontage + 0.4, seed: 55 + side,
        });
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b2 = pts[i + 1];
          if (a.x > PRECINCT_X) continue;
          const cx = (a.x + b2.x) / 2, cz = (a.z + b2.z) / 2;
          const gy = Math.min(a.y, b2.y);
          const back = ctx.groundAt(cx + a.nx * 5, cz + a.nz * 5);
          const h = clamp(back - gy + 0.5, 0.8, 4.2);
          const len = Math.hypot(b2.x - a.x, b2.z - a.z) + 0.25;
          const M = trs(cx, gy, cz, 0, a.ry, 0);
          bake0.add(boxG(len, h, 0.62, 0, h / 2, 0.30), M, PAL.stoneWall, O.stone);
          bake0.add(boxG(len, 0.16, 0.80, 0, h + 0.06, 0.30), M, PAL.stoneWallDark, O.stone);
          for (let k = 0; k * 0.44 < h - 0.2; k++) {
            bake0.add(boxG(len, 0.04, 0.05, 0, 0.22 + k * 0.44, -0.01), M, PAL.stoneWallDark, O.stone);
          }
          ctx.collideRot(cx, cz, len, 0.7, a.ry, gy + h + 0.2);
          if (i % 4 === 1) {
            const tx = cx + a.nx * 3.6, tz = cz + a.nz * 3.6;
            ctx.tree({
              kind: rng.pick(['maple', 'camellia', 'pine', 'shrub']),
              x: tx, z: tz, y: ctx.groundAt(tx, tz),
              scale: rng.range(0.85, 1.3), rot: rng.range(0, 6.28), seed: rng.int(0, 9999),
            });
          }
        }
      }
      /* 築地塀 -- the temple's own boundary wall, where 茶わん坂 runs up under
       * the precinct's south flank. */
      const wp = [];
      for (const pt of alongStreet({
        street: 'chawanzaka', side: -1, from: 0.62, to: 0.79,
        spacing: 7.0, offset: c.frontage + 1.3, seed: 91,
      })) {
        if (pt.x < PRECINCT_X) wp.push({ x: pt.x, z: pt.z });
      }
      if (wp.length > 1) {
        makeTempleWall(ctx, { points: wp, baker: bake0, h: 2.1, thick: 0.55, step: 5.0 });
      }
    }
  }

  /* ================================================================== *
   * 13.  Poles and wires.
   *
   * STREET 3.2, from Kyoto City's own 無電柱化 planning documents: 清水道／
   * 茶わん坂 is target route #6 and has not been done, and 清水坂 still has
   * poles.  The postcard streets are clean and the busiest one is not; that
   * contrast is real and worth building rather than smoothing away.  The prop
   * batcher strings the wires from the poles' own attachment points and drops
   * any pole that lands inside a documented no-pole zone.
   * ================================================================== */

  for (const run of [
    { street: 'kiyomizuzakaLower', side: -1, from: 0.06, to: 0.97, spacing: 31, offset: 4.35 },
    { street: 'kiyomizuzakaLower', side: 1, from: 0.20, to: 0.90, spacing: 62, offset: 4.35 },
    { street: 'kiyomizuzaka', side: 1, from: 0.26, to: 0.85, spacing: 29, offset: 3.52 },
    { street: 'chawanzaka', side: -1, from: 0.05, to: 0.58, spacing: 33, offset: 3.32 },
  ]) {
    for (const pt of alongStreet({ ...run, jitter: 3.0, seed: 900 + Math.round(run.offset * 10 + run.spacing) })) {
      if (pt.x > PRECINCT_X) continue;
      ctx.prop({
        kind: 'utilityPole', x: pt.x, z: pt.z, rot: pt.ry,
        variant: rng.chance(0.18) ? 'timber' : undefined, seed: rng.int(1, 1e9),
      });
    }
  }

  /* ================================================================== *
   * 14.  Street furniture, traffic and the bus stop.
   * ================================================================== */
  {
    const S = 'kiyomizuzakaLower';
    for (const [t, side] of [[0.14, -1], [0.41, 1], [0.66, -1], [0.88, 1]]) {
      const a = atStreet(S, t, { side, offset: 4.25 });
      if (a) ctx.prop({ kind: 'vendingMachine', x: a.x, z: a.z, rot: a.across + Math.PI, seed: (41 + t * 977) | 0 });
    }
    for (const [t, side] of [[0.23, 1], [0.55, -1], [0.79, 1]]) {
      const a = atStreet(S, t, { side, offset: 4.3 });
      if (a) ctx.prop({ kind: 'trafficMirror', x: a.x, z: a.z, rot: a.across + Math.PI, seed: 9 });
    }
    const pb = atStreet(S, 0.33, { side: -1, offset: 4.2 });
    if (pb) ctx.prop({ kind: 'postBox', x: pb.x, z: pb.z, rot: pb.across + Math.PI, seed: 3 });
    for (const [t, side] of [[0.09, -1], [0.48, 1], [0.72, -1]]) {
      const a = atStreet(S, t, { side, offset: 4.15 });
      if (a) ctx.prop({ kind: 'extinguisherBox', x: a.x, z: a.z, rot: a.across + Math.PI, seed: 7 });
    }
    for (const [t, side, kind, spin] of [[0.11, 1, 'van', Math.PI], [0.52, -1, 'taxi', 0], [0.83, 1, 'van', 0]]) {
      const a = atStreet(S, t, { side, offset: 2.1 });
      if (a) ctx.prop({ kind, x: a.x, z: a.z, rot: a.along + spin, seed: 21 });
    }
    for (const [t, side] of [[0.27, -1], [0.61, 1], [0.93, -1]]) {
      const a = atStreet(S, t, { side, offset: 4.0 });
      if (a) ctx.prop({ kind: 'bicycleRack', x: a.x, z: a.z, rot: a.across + Math.PI, variant: 3, seed: 5 });
    }

    /* The bus stop at the bottom.  This is where most of the crowd on the
     * whole route is made, and it is why the lower street feels ordinary: it
     * is a place people *arrive*. */
    const bs = atStreet(S, 0.030, { side: 1, offset: 4.0 });
    if (bs) {
      const M = trs(bs.x, bs.y, bs.z, 0, bs.across + Math.PI, 0);
      for (const s of [-1, 1]) bake0.add(cylG(0.055, 0.06, 2.42, 7, s * 1.45, 1.21, -0.55), M, PAL.metalDark, O.metal);
      const roof = new THREE.BoxGeometry(3.30, 0.09, 1.40);
      roof.rotateX(0.06);
      roof.translate(0, 2.48, -0.30);
      bake0.add(roof, M, PAL.metalWarm, O.metal);
      bake0.add(boxG(3.10, 0.90, 0.07, 0, 0.95, -0.94), M, PAL.metalWarm, O.metal);
      bake0.add(boxG(2.90, 0.06, 0.36, 0, 0.46, -0.80), M, PAL.timberPale, O.timber);
      bake0.add(cylG(0.045, 0.05, 2.30, 7, -1.92, 1.15, -0.10), M, PAL.metalDark, O.metal);
      freeSign(markerCell('清水道'), 0.30, 0.80, bs.x, bs.y + 2.05, bs.z, bs.across + Math.PI);
      ctx.collideRot(bs.x, bs.z, 3.4, 0.60, bs.across, bs.y + 2.4);
      addInteract(bs.x - bs.nx * 0.5, bs.y + 1.3, bs.z - bs.nz * 0.5,
        'read the timetable', () => {}, [2.2, 1.4, 1.2]);
    }
  }

  /* 石標 -- the granite markers at the head of each slope.  STREET 2.4(a). */
  for (const [text, street, t, side, off] of [
    ['清水道', 'kiyomizuzakaLower', 0.045, -1, 4.0],
    ['清水坂', 'kiyomizuzaka', 0.010, 1, 3.5],
    ['茶わん坂', 'chawanzaka', 0.020, -1, 3.3],
    ['重要伝統的建造物群保存地区', 'kiyomizuzaka', 0.060, 1, 3.5],
  ]) {
    const a = atStreet(street, t, { side, offset: off });
    if (!a) continue;
    const M = trs(a.x, a.y, a.z, 0, a.across, 0);
    const H = [...text].length > 5 ? 1.78 : 1.45;
    bake0.add(boxG(0.30, 0.12, 0.30, 0, 0.06, 0), M, PAL.stoneDark, O.stone);
    bake0.add(boxG(0.19, H, 0.19, 0, 0.06 + H / 2, 0), M, 0x8e8b84, O.stone);
    const r = markerCell(text);
    for (const s of [0, Math.PI]) {
      const g = cellQuad(0.145, H * 0.90, r);
      g.translate(0, 0.10 + H / 2, s ? -0.098 : 0.098);
      if (s) g.rotateY(Math.PI);
      SIGN.push(r, g, M);
    }
    ctx.collideRot(a.x, a.z, 0.32, 0.32, a.across, a.y + H);
    addInteract(a.x, a.y + 1.2, a.z, 'read the marker stone', () => {}, [1.0, 1.6, 1.0]);
  }

  /* 木製案内板 -- the brown finger-posts the ordinance requires instead of
   * standard blue-and-white road signage inside the preservation district. */
  for (const [street, t, side, lines] of [
    ['kiyomizuzaka', 0.018, 1, ['清水寺　→', '産寧坂　↑', '八坂神社　←']],
    ['kiyomizuzakaLower', 0.94, -1, ['清水寺　→', '茶わん坂　→']],
    ['chawanzaka', 0.06, -1, ['清水寺　→', '五条坂　←']],
  ]) {
    const a = atStreet(street, t, { side, offset: side < 0 ? 3.9 : 3.4 });
    if (!a) continue;
    const M = trs(a.x, a.y, a.z, 0, a.across, 0);
    bake0.add(boxG(0.13, 2.55, 0.13, 0, 1.28, 0), M, 0x4a3a2c, O.timber);
    lines.forEach((ln, i) => {
      const r = SIGN.cell('fp|' + ln, 288, 76, plaquePainter(ln, { board: 0x4a3a2c, ink: PAL.paper, frame: 0x3a2c22 }));
      for (const s of [0, Math.PI]) {
        const g = cellQuad(0.86, 0.22, r);
        g.translate(0, 2.28 - i * 0.30, s ? -0.075 : 0.075);
        if (s) g.rotateY(Math.PI);
        SIGN.push(r, g, M);
      }
    });
    ctx.collideRot(a.x, a.z, 0.24, 0.24, 0, a.y + 2.6);
  }

  /* The last of the street furniture: two granite bollards where the paving
   * hands over to the temple's own apron. */
  for (const s of [-1, 1]) {
    const p = atStreet('kiyomizuzaka', 0.935, { side: s, offset: 3.2 });
    if (p && p.x < PRECINCT_X) ctx.prop({ kind: 'graniteBollard', x: p.x, z: p.z, rot: p.across, seed: 4 });
  }

  /* ================================================================== *
   * 14a.  The surface itself.
   *
   * A 7.6 m street you must not close is still a 7.6 m street you have to
   * give something to look at, and the answer is not clutter in the middle of
   * it -- it is the ground.  Kyoto's manhole is the 御所車, the Heian ox-cart
   * wheel; there is a drainage channel down each side of every street here;
   * and 打ち水 leaves the stone dark for an hour.  All of it lies IN the
   * street's plane (the prop batcher tilts `flat` kinds into the normal) and
   * none of it obstructs anything.
   * ================================================================== */
  for (const [street, from, to, spacing] of [
    ['kiyomizuzaka', 0.03, 0.93, 15],
    ['kiyomizuzakaLower', 0.04, 0.96, 17],
    ['chawanzaka', 0.03, 0.78, 16],
  ]) {
    let k = 0;
    for (const pt of alongStreet({ street, side: -1, from, to, spacing, jitter: 6, seed: 720, offset: 0 })) {
      if (pt.x > PRECINCT_X) continue;
      const kind = ['manhole', 'grating', 'manhole', 'surveyMark'][k % 4];
      ctx.prop({ kind, x: pt.x, z: pt.z, rot: pt.ry + rng.range(-0.4, 0.4), seed: rng.int(1, 1e9) });
      k++;
    }
    for (const side of [-1, 1]) {
      for (const pt of alongStreet({
        street, side, from, to, spacing: 7.5, jitter: 2.5, seed: 733 + side,
        offset: (street === 'kiyomizuzaka' ? 2.55 : street === 'chawanzaka' ? 2.30 : 2.80),
      })) {
        if (pt.x > PRECINCT_X) continue;
        if (rng.chance(0.62)) ctx.prop({ kind: 'drainCover', x: pt.x, z: pt.z, rot: pt.ry, seed: rng.int(1, 1e9) });
        else if (rng.chance(0.22)) ctx.prop({ kind: 'leafPile', x: pt.x, z: pt.z, rot: rng.range(0, 6.28), seed: rng.int(1, 1e9) });
      }
    }
  }

  /* A hand-cart and a parcel trolley on 清水坂: deliveries here are by hand,
   * because the street is `highway=pedestrian` and nothing else fits. */
  for (const [t, side, kind] of [[0.22, -1, 'handCart'], [0.58, 1, 'parcelTrolley'], [0.77, -1, 'handCart']]) {
    const a = atStreet('kiyomizuzaka', t, { side, offset: 2.9 });
    if (a) ctx.prop({ kind, x: a.x, z: a.z, rot: a.across + Math.PI, seed: 31 });
  }
  /* And the works scene on 清水道 -- a real and permanent feature of a Kyoto
   * street with a 200 mm main under it. */
  {
    const a = atStreet('kiyomizuzakaLower', 0.36, { side: 1, offset: 2.2 });
    if (a) {
      ctx.prop({ kind: 'barrier', x: a.x, z: a.z, rot: a.along, seed: 12 });
      for (let k = -1; k <= 1; k += 2) {
        const c = atStreet('kiyomizuzakaLower', 0.36 + k * 0.006, { side: 1, offset: 2.6 });
        if (c) ctx.prop({ kind: 'roadCone', x: c.x, z: c.z, rot: c.along, seed: 13 + k });
      }
    }
  }

  /* ================================================================== *
   * 15.  Vegetation.
   *
   * Almost none on 清水坂 -- the frontage is continuous and what green there
   * is belongs to the shops, in pots.  茶わん坂 and 清水道 have real gardens
   * behind them, and that is where the trees go.
   * ================================================================== */
  for (const [street, from, to, spacing, kinds, chance, off] of [
    ['kiyomizuzaka', 0.05, 0.88, 21, ['potted'], 0.30, 3.55],
    ['kiyomizuzakaLower', 0.08, 0.94, 13, ['maple', 'camellia', 'potted', 'shrub', 'pine'], 0.5, 6.8],
    ['chawanzaka', 0.05, 0.58, 15, ['camellia', 'maple', 'potted', 'shrub'], 0.5, 5.6],
  ]) {
    for (const side of [-1, 1]) {
      for (const pt of alongStreet({ street, side, from, to, spacing, jitter: 5, seed: 610 + side, offset: off })) {
        if (!rng.chance(chance) || pt.x > PRECINCT_X) continue;
        ctx.tree({
          kind: rng.pick(kinds), x: pt.x, z: pt.z, y: pt.y,
          scale: rng.range(0.8, 1.25), rot: rng.range(0, 6.28), seed: rng.int(0, 9999),
        });
      }
    }
  }

  /* ================================================================== *
   * 16.  Interactables.
   *
   * Twelve, and every one of them a small honest motion: a bowl turned over,
   * a lid lifted, a fan opened, a wheel given a push.  Nothing bounces and
   * nothing pulses -- KIT.md 7.
   * ================================================================== */

  function heroInteract(key, label, mk, d = 0.74) {
    const h = heroes[key];
    if (!h) return false;
    const w = h.at(d, 0);
    const y = ctx.groundAt(w.x, w.z);
    const rec = mk(w.x, y, w.z, h.yaw);
    addInteract(w.x, y + 1.05, w.z, label, () => { if (rec) rec.energy = 1; }, [1.2, 1.5, 1.2]);
    return true;
  }

  heroInteract('pottery', 'inspect the 清水焼', (x, y, z, yaw) => motion.item('turn', {
    px: x, py: y + 1.10, pz: z, axis: 'y', amp: Math.PI * 1.15,
  }, () => {
    const M = trs(x, y, z, 0, yaw, 0);
    motion.add(cylG(0.086, 0.048, 0.10, 12, 0, 1.15, 0), PAL.ceramicWhite, M);
    motion.add(cylG(0.050, 0.050, 0.012, 12, 0, 1.08, 0), PAL.ceramicBlue, M);
  }));

  heroInteract('fold', 'take a sample', (x, y, z, yaw) => motion.item('lift', {
    dy: 0.17, dz: 0.05, ry: yaw,
  }, () => {
    const M = trs(x, y, z, 0, yaw, 0);
    motion.add(boxG(0.44, 0.022, 0.32, 0, 1.04, 0), PAL.paper, M);
    motion.add(boxG(0.06, 0.05, 0.06, 0, 1.07, 0), PAL.timberMid, M);
  }));

  heroInteract('fans', 'open a fan', (x, y, z, yaw) => motion.item('turn', {
    px: x, py: y + 1.22, pz: z, axis: 'z', amp: -0.95,
  }, () => {
    const M = trs(x, y, z, 0, yaw, 0);
    const g = new THREE.CircleGeometry(0.24, 9, Math.PI * 0.16, Math.PI * 0.68);
    g.rotateZ(-0.6);
    g.translate(0, 1.22, 0.05);
    motion.add(g, PAL.gold, M);
    motion.add(boxG(0.02, 0.26, 0.015, 0.10, 1.08, 0.05), PAL.timberDark, M);
  }));

  heroInteract('incense', 'light a stick of incense', (x, y, z, yaw) => motion.item('lift', {
    dy: 0.14, dz: -0.06, ry: yaw,
  }, () => {
    const M = trs(x, y, z, 0, yaw, 0);
    motion.add(cylG(0.10, 0.10, 0.035, 12, 0, 1.00, 0), PAL.metalDark, M);
    motion.add(cylG(0.035, 0.06, 0.05, 10, 0, 1.03, 0), PAL.brass, M);
  }));

  heroInteract('softserve', 'take a soft serve', (x, y, z, yaw) => motion.item('lift', {
    dy: 0.24, ry: yaw,
  }, () => {
    const M = trs(x, y, z, 0, yaw, 0);
    motion.add(cylG(0.012, 0.048, 0.13, 9, 0, 1.03, 0), PAL.paperWarm, M);
    motion.add(cylG(0.010, 0.052, 0.14, 9, 0, 1.16, 0), PAL.matcha, M);
  }));

  heroInteract('chilled', 'taste a pickle', (x, y, z, yaw) => motion.item('lift', {
    dy: 0.20, dz: -0.10, ry: yaw,
  }, () => {
    const M = trs(x, y, z, 0, yaw, 0);
    motion.add(boxG(0.52, 0.025, 0.36, 0, 1.22, 0), PAL.glass, M);
    motion.add(boxG(0.10, 0.05, 0.05, 0, 1.25, -0.14), PAL.metal, M);
  }));

  /* 天亀's signboard is carved in 篆書 seal script by 森岡東春山 -- the notable
   * 看板 on this street, and the one worth stopping to read. */
  heroInteract('tenki', 'read the signboard', (x, y, z, yaw) => motion.item('swing', {
    px: x, py: y + 2.68, pz: z, amp: 0.05,
  }, () => {
    const M = trs(x, y, z, 0, yaw, 0);
    const r = kanbanCell('天亀', { board: 0x2a2420, ink: PAL.gold, sub: '篆書' });
    motion.add(boxG(0.34, 1.02, 0.045, 0, 2.10, 0), PAL.timberDark, M);
    if (r) {
      const g = cellQuad(0.27, 0.92, r);
      g.translate(0, 2.10, 0.027);
      SIGN.push(r, g, M);
    }
    motion.add(cylG(0.014, 0.014, 0.42, 5, 0, 2.82, 0), PAL.iron, M);
  }, 0.62));

  heroInteract('sample', 'try the 生八ッ橋', (x, y, z, yaw) => motion.item('lift', {
    dy: 0.13, ry: yaw,
  }, () => {
    const M = trs(x, y, z, 0, yaw, 0);
    motion.add(cylG(0.20, 0.20, 0.10, 12, 0, 1.03, 0), PAL.bambooCulmPale, M);
    motion.add(cylG(0.20, 0.20, 0.10, 12, 0, 1.14, 0), PAL.bambooCulm, M);
    motion.add(cylG(0.21, 0.21, 0.03, 12, 0, 1.21, 0), PAL.timberPale, M);
  }));

  heroInteract('grill', 'watch the senbei grill', (x, y, z, yaw) => motion.item('lift', {
    dy: 0.10, ry: yaw,
  }, () => {
    const M = trs(x, y, z, 0, yaw, 0);
    motion.add(boxG(0.60, 0.05, 0.34, 0, 0.96, 0), PAL.iron, M);
    for (let k = 0; k < 4; k++) {
      motion.add(boxG(0.10, 0.012, 0.10, -0.21 + k * 0.14, 0.99, 0), 0xc8a468, M);
    }
  }));

  /* the potter's wheel on 茶わん坂 */
  {
    const h = heroes.wallsign || heroes.shutter || heroes.kiln;
    if (h && h.at) {
      const w = h.at(0.78, 0.6);
      const y = ctx.groundAt(w.x, w.z);
      const rec = motion.item('spin', { px: w.x, py: y + 0.78, pz: w.z, rate: 2.4 }, () => {
        const M = trs(w.x, y, w.z, 0, h.yaw, 0);
        motion.add(cylG(0.30, 0.30, 0.045, 14, 0, 0.78, 0), PAL.stoneDark, M);
        motion.add(cylG(0.085, 0.11, 0.17, 10, 0.05, 0.88, 0.03), 0x9c8b74, M);
        motion.add(cylG(0.06, 0.09, 0.72, 8, 0, 0.38, 0), PAL.timberMid, M);
      });
      addInteract(w.x, y + 1.0, w.z, 'turn the potter\'s wheel', () => { rec.energy = 1; }, [1.2, 1.4, 1.2]);
    }
  }

  if (heroes.kiln) {
    const k = heroes.kiln;
    const rec = motion.item('swing', { px: k.x, py: k.y + 0.95, pz: k.z, amp: 0.5 }, () => {
      const M = trs(k.x, k.y, k.z, 0, k.yaw, 0);
      motion.add(boxG(0.60, 0.70, 0.05, 0.34, 0.62, -0.56), PAL.iron, M);
    });
    addInteract(k.x, k.y + 1.1, k.z, 'look into the kiln', () => { rec.energy = 1; }, [1.5, 1.7, 1.5]);
  }

  {   // the vending machine on 清水道 -- beige, low-logo, and genuinely there
    const a = atStreet('kiyomizuzakaLower', 0.41, { side: 1, offset: 4.25 });
    if (a) {
      const yaw = a.across + Math.PI;
      const rec = motion.item('lift', { dy: 0.10, ry: yaw }, () => {
        motion.add(cylG(0.033, 0.033, 0.12, 9, 0, 0.36, 0.40), PAL.red, trs(a.x, a.y, a.z, 0, yaw, 0));
      });
      addInteract(a.x + a.nx * -0.55, a.y + 1.0, a.z + a.nz * -0.55,
        'buy a hot tea', () => { rec.energy = 1; }, [1.4, 1.9, 1.3]);
    }
  }

  {   // and the noren, wherever you push through one
    const h = heroes.shichimi || heroes.orange || heroes.asahi;
    if (h) {
      const w = h.at(0.55, 0);
      const y = ctx.groundAt(w.x, w.z);
      addInteract(w.x, y + 1.55, w.z, 'duck under the noren', () => {
        for (const n of norens) {
          if (n.wx === undefined) continue;
          if (Math.hypot(n.wx - w.x, n.wz - w.z) < 12) n.energy = 1;
        }
      }, [1.6, 1.0, 1.0]);
    }
  }

  /* ================================================================== *
   * 17.  Flush the atlases.
   * ================================================================== */

  let signMeshes = 0;
  for (const page of SIGN.pages) {
    if (!page.parts.length) continue;
    const geo = bake(page.parts);
    page.parts.forEach((q) => q.geometry.dispose());
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, celTex(SIGN.texture(page, { mips: true, aniso: 8 }), {
      bands: 3, tint: TINT.warm, side: THREE.DoubleSide,
    }));
    mesh.name = 'kiyomizuzaka-signage';
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    ctx.add(mesh);
    signMeshes++;
  }

  const animGroups = [];
  for (const page of CLOTHA.pages) {
    if (!page.parts.length) continue;
    const count = page.parts.length;
    const geo = bake(page.parts);
    page.parts.forEach((q) => q.geometry.dispose());
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, celTex(CLOTHA.texture(page, { mips: true, aniso: 8 }), {
      bands: 3, tint: TINT.cool, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide,
    }));
    mesh.name = 'kiyomizuzaka-noren';
    mesh.userData.noShadow = true;
    mesh.userData.noMerge = true;      // animated by vertex range -- see below
    mesh.castShadow = false;
    ctx.add(mesh);
    const pos = mesh.geometry.attributes.position;
    const mine = norens.filter((n) => n.page === page && n.idx >= 0);
    if (pos.count !== count * 4) continue;         // not the layout we assumed
    for (const n of mine) { n.wx = pos.getX(n.idx * 4); n.wz = pos.getZ(n.idx * 4); }
    animGroups.push({ pos, base: pos.array.slice(), norens: mine });
  }

  /* The hem lift.  ONE updater for every noren in the district: a slow
   * shallow swing at the bottom edge of each quad, a little larger for a
   * moment after somebody has walked through one.  A curtain in still air. */
  if (animGroups.length) {
    ctx.update((dt, t) => {
      for (const g of animGroups) {
        const arr = g.pos.array, base = g.base;
        for (const n of g.norens) {
          if (n.energy > 0) n.energy = Math.max(0, n.energy - dt * 1.1);
          const s = Math.sin(t * 0.52 + n.phase) * (0.6 + 0.4 * Math.sin(t * 0.19 + n.phase * 1.7));
          const k = s * (1 + n.energy * 4.5);
          for (const v of [n.idx * 4 + 2, n.idx * 4 + 3]) {
            const i3 = v * 3;
            arr[i3] = base[i3] + n.dx * k;
            arr[i3 + 1] = base[i3 + 1] + n.dy * Math.abs(k);
            arr[i3 + 2] = base[i3 + 2] + n.dz * k;
          }
        }
        g.pos.needsUpdate = true;
      }
    });
  }

  if (motion.parts.length) {
    const geo = bake(motion.parts);
    motion.parts.forEach((q) => q.geometry.dispose());
    if (geo) {
      const mesh = new THREE.Mesh(geo, cel({
        vertexColors: true, color: 0xffffff, bands: 3, tint: TINT.warm, flat: true,
      }));
      mesh.name = 'kiyomizuzaka-motion';
      /* Its material is the cached vertex-colour cel material, which every
       * baker bucket also uses -- so without this the world-level merge would
       * fold it into a street's worth of geometry and the vertex ranges the
       * updater moves would point at somebody else's roof. */
      mesh.userData.noMerge = true;
      ctx.add(mesh);
      const pos = mesh.geometry.attributes.position;
      const base = pos.array.slice();
      const items = motion.items.filter((it) => it.count > 0);
      const _v = new THREE.Vector3();
      ctx.update((dt, t) => {
        let touched = false;
        for (const it of items) {
          const had = it.energy > 0;
          if (it.kind === 'spin') {
            it.energy = Math.max(0, it.energy - dt * 0.32);
            it.phase += it.energy * (it.rate || 2) * dt;
          } else if (it.energy > 0) {
            it.energy = Math.max(0, it.energy - dt * 0.5);
          }
          if (!had && it.energy <= 0) continue;
          touched = true;
          const ease = Math.sin(Math.min(1, it.energy) * Math.PI);
          for (let v = it.start; v < it.start + it.count; v++) {
            const i3 = v * 3;
            let x = base[i3], y = base[i3 + 1], z = base[i3 + 2];
            if (it.kind === 'turn' || it.kind === 'spin') {
              const a = it.kind === 'spin' ? it.phase : ease * (it.amp || 1);
              const c = Math.cos(a), s = Math.sin(a);
              _v.set(x - it.px, y - it.py, z - it.pz);
              if (it.axis === 'z') {
                const rx = _v.x * c - _v.y * s, ry2 = _v.x * s + _v.y * c;
                _v.x = rx; _v.y = ry2;
              } else {
                const rx = _v.x * c + _v.z * s, rz = -_v.x * s + _v.z * c;
                _v.x = rx; _v.z = rz;
              }
              x = it.px + _v.x; y = it.py + _v.y; z = it.pz + _v.z;
            } else if (it.kind === 'lift') {
              const cr = Math.cos(it.ry || 0), sr = Math.sin(it.ry || 0);
              const dz = (it.dz || 0) * ease;
              x += dz * sr; y += (it.dy || 0) * ease; z += dz * cr;
            } else if (it.kind === 'swing') {
              const a = ease * (it.amp || 0.05) * Math.sin(t * 5.0);
              const c = Math.cos(a), s = Math.sin(a);
              _v.set(x - it.px, y - it.py, z - it.pz);
              x = it.px + _v.x * c - _v.y * s;
              y = it.py + _v.x * s + _v.y * c;
              z = it.pz + _v.z;
            }
            pos.array[i3] = x; pos.array[i3 + 1] = y; pos.array[i3 + 2] = z;
          }
        }
        if (touched) pos.needsUpdate = true;
      });
    }
  }

  ctx.stats.landmarks += 1;      // 七味家本舗, the "you are here" corner

  return { ...out, signMeshes, norens: norens.length, interactables: labels };
}

/* ------------------------------------------------------------------ *
 * List helpers.
 *
 * `interleave` keeps the census's walking order intact while padding the gaps
 * with the rest of §1.5, so you pass 七味家 then 来迎院 then 京ばあむ in the
 * order the real street has them, with the unnamed frontages between.
 * ------------------------------------------------------------------ */
function interleave(named, fill, offset) {
  const list = [];
  let f = offset % fill.length;
  for (let i = 0; i < named.length; i++) {
    list.push(named[i]);
    const n = 1 + (i % 2);
    for (let k = 0; k < n; k++) { list.push(fill[f % fill.length]); f++; }
  }
  return list;
}

function rotate(arr, by) {
  const list = [];
  for (let i = 0; i < arr.length; i++) list.push(arr[(i + by) % arr.length]);
  return list;
}
