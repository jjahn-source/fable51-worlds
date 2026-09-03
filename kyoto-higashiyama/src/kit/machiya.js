import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT, celTex } from '../core/toon.js';
import { rngKit, clamp, lerp, trs, beam, prism, bake } from '../core/util.js';
import { gableRoof, shedRoof, rafters } from './roof.js';
import {
  latticeTex, sudareTex, norenTex, verticalSign, woodenSign, cached,
} from '../core/textures.js';

/* ==================================================================== *
 * 京町家 -- the Kyoto townhouse.
 *
 * One generator, the building types the Sannenzaka (昭和51年京都市告示第69号)
 * and Gion Shinbashi (第70号) preservation plans enumerate, plus the Gion
 * design standards (city.kyoto.lg.jp/tokei/page/0000281263.html).  Every
 * dimension is measured or derived in docs/recon/ARCH.md sections 1-3.
 *
 * ------------------------------------------------------------ THE READ
 *
 * A Kyoto street is a **dark timber grid on a pale field under a silver-grey
 * roof**, and a machiya facade is that sentence in one building:
 *
 *   - a LOW eave -- 4.80 m on a Sannenzaka 厨子二階, 6.25 m on a Gion 総二階 --
 *     held out over the street, with 垂木 and 野地板 showing under it because
 *     the plans forbid a closed soffit;
 *   - a 通り庇 below it at 2.6-2.9 m, REQUIRED by the Gion standards and at
 *     the SAME height as its neighbours' -- 「隣り合う庇は同高で統一感がある」;
 *   - between them either a plastered 厨子二階 pierced by 虫籠窓 (Sannenzaka),
 *     or a full 総二階 whose veranda is CANTILEVERED past the wall line with a
 *     格子手摺 balustrade and 簾 hung year-round (Gion);
 *   - and at street level a 真壁 frame of 4寸 posts, 格子 between them, a
 *     boarded 腰 wainscot below, and one bay open for the 大戸.
 *
 * The ridge always runs PARALLEL to the street (平入 hira-iri).  That is a
 * legal constraint in both districts and it is the single geometric fact that
 * makes a row of these read as Kyoto rather than as "Japan".
 *
 * ------------------------------------------------------ THE TWO MODULES
 *
 * Kyoto works **clear-dimension-first** (内法制, ARCH 1.4): the fixed quantity
 * is the 6.3-shaku = 1.90909 m CLEAR span between column faces, and the
 * familiar 6.5-shaku ken is what you get when you add one column width across
 * a two-bay room.  ARCH's own generator rule follows from that and is what
 * this file implements:
 *
 *     post centres and street frontage  ->  KEN       = 1.96970
 *     openings, joinery, tatami         ->  CLEAR_BAY = 1.90909
 *                                           CLEAR_HALF= 0.95455
 *
 * So the 虫籠窓 is CLEAR_HALF wide, the 大戸's leaves are CLEAR_HALF each, the
 * sudare are set out on the clear module -- and the posts are on the ken.
 * Pass `module: 'uchinori'` to space the posts at clear + one column
 * (2.03030 m) instead, which is the strict reading of the rule for a frame
 * with a post in every bay.
 *
 * ------------------------------------------------------------ THE FRAME
 *
 *     local +x  along the frontage, 0 at the centre of the street elevation
 *     local +z  INTO the plot, away from the street
 *     local -z  the street.  `ry = 0` puts local -z on world -z, i.e. north.
 *     local  y  0 at the seat -- the LOWEST ground under the footprint
 *
 * `(x, z)` is the centre of the **frontage line**, not of the footprint: a
 * street builder walks the corridor, steps off by the frontage half-width and
 * calls this.  Footprint centre, facade point and entry point all come back.
 *
 * roof.js builds its 庇 and its rafters running +z, so those get a pi flip on
 * the way in; the gable is symmetric and only needs a translate.
 *
 * ------------------------------------------------------------ THE SLOPE
 *
 * Sannenzaka drops 0.14 m a step.  A row of these is seated on its LOWEST
 * corner and the 延石 granite sill and the plinth under it make up the
 * difference -- exactly what a real machiya does.  Never a hard-coded y.
 *
 * ---------------------------------------------------------- THE TWO REDS
 *
 * 弁柄 (`PAL.bengara`) is roughly HALF the chroma of shrine vermilion
 * (`PAL.vermilion`).  Ochaya timber is bengara; nothing in Gion is vermilion.
 * And the bengara-tinted *earth plaster wall* is a legal privilege granted to
 * three teahouses of which one survives (一力亭) -- so `plasterTone:
 * PAL.bengara` is never a default, only an explicit caller decision.
 *
 * ------------------------------------------------------------ PROP KINDS
 *
 * Asked of the central batcher (`ctx.prop`); unimplemented kinds are collected
 * and ignored, so these calls are placeholder-safe.
 *
 *   'chochin'    提灯.  9号長型, **0.24 m dia x 0.57 m body** at scale 1.
 *                `y` is the hanging point (top).  variant 0 = plain cream,
 *                1 = Gion red bearing the つなぎ団子 crest.
 *   'shoki'      鍾馗さん, the 0.25 m ceramic demon-queller that stands on the
 *                hisashi ridge above the door, facing the neighbour's roof.
 *   'uekibachi'  the row of potted plants every Kyoto frontage keeps on its
 *                犬走り.  (`ctx.tree({kind:'potted'})` covers the planted
 *                version; this is the bare pot.)
 * ==================================================================== */

/* ------------------------------------------------------------------ *
 * 1. The module.  ARCH.md 1.1-1.5, all [HIGH].
 * ------------------------------------------------------------------ */

export const SHAKU = 10 / 33;                 // 0.303030303 m exactly -- 1891 度量衡法
export const SUN = SHAKU / 10;
export const BU = SUN / 10;
export const KEN = 6.5 * SHAKU;               // 1.96969697 m  京間, post centres
export const HALF_KEN = KEN / 2;              // 0.98484848 m
export const CLEAR_BAY = 6.3 * SHAKU;         // 1.90909091 m  内法 clear span
export const CLEAR_HALF = 3.15 * SHAKU;       // 0.95454545 m
export const UCHINORI_H = 5.7 * SHAKU;        // 1.72727273 m  head of shoji / fusuma
export const COLUMN_4SUN = 4 * SUN;           // 0.12121212 m  the standard machiya post
export const COLUMN_35SUN = 3.5 * SUN;        // 0.10606061 m  lighter / rental machiya
export const UCHINORI_PITCH = CLEAR_BAY + COLUMN_4SUN;   // 2.03030 m, strict 内法制 c/c

/** Snap a frontage to a whole number of bays. */
export function snapKen(width, { min = 1, max = 7, pitch = KEN } = {}) {
  const n = clamp(Math.round(width / pitch), min, max);
  return { bays: n, width: n * pitch };
}

/* ------------------------------------------------------------------ *
 * 2. Vertical set-out.
 *
 * ARCH 2.2 for Sannenzaka; ARCH 3.6 for Gion, which supersedes it there --
 * the 通り庇 is mandatory in Gion and pushes the storey heights up.
 *
 * ★ THE RHYTHM RULE (ARCH 3.6): adjacent hisashi are at the SAME height and
 * the ridge line steps by at most +/-0.4 m.  These are NOT free parameters
 * and a district that randomises them destroys the street.
 * ------------------------------------------------------------------ */

const EAVE_H = { 1: 3.30, 1.5: 4.80, 2: 5.80 };
const HISASHI_H = { 1: 2.45, 1.5: 2.62, 2: 2.85 };
const UPPER_FLOOR_H = { 1: 0, 1.5: 3.05, 2: 3.20 };

/* ------------------------------------------------------------------ *
 * 3. 格子 -- the lattice.  ARCH 2.5 and 3.8.
 *
 * The 酒屋格子 spec is the one hard dimensional source: 立子 2.4寸 deep x
 * 1.4寸 wide at a 2.4寸 clear gap -- a 3.8寸 = 115.15 mm pitch -- held by
 * 2.7寸 x 3分 貫.  The batten is DEEPER THAN IT IS WIDE, which is the whole
 * optical trick: head on you see through it, oblique it closes to a wall.
 * Never model these square.
 *
 * At the other end of the range, 千本格子 -- the ochaya lattice -- is FOUR
 * TIMES FINER (見付 24 mm x 見込 36 mm at 45 mm centres).  That contrast is
 * the main thing separating a Gion frontage from a Sannenzaka shopfront, so
 * both extremes are here and the difference is not cosmetic.
 *
 * `kiriko` is the trade signature -- the top of every n-th batten cut short
 * to admit light.  4 = 織屋, 3 = 糸屋/紐屋, 2 = 呉服屋, 0 = none.
 * ------------------------------------------------------------------ */

const KOSHI = {
  // 酒屋格子 -- coarse, heavy, bengara, strong enough to roll a barrel against
  sakaya: { face: 1.4 * SUN, deep: 2.4 * SUN, pitch: 3.8 * SUN, kiriko: 0, doubleSill: false, tone: 'bengara' },
  // 米屋格子 -- structurally identical, left bare, doubled bottom 貫 for rice bales
  komeya: { face: 1.4 * SUN, deep: 2.4 * SUN, pitch: 3.8 * SUN, kiriko: 0, doubleSill: true, tone: 'bare' },
  // 糸屋格子 -- fine, 28 battens to the ken, every 3rd cut short
  itoya: { face: 0.95 * SUN, deep: 1.8 * SUN, pitch: KEN / 28, kiriko: 3, doubleSill: false, tone: 'dark' },
  // 呉服屋格子 -- the same, every 2nd cut
  gofukuya: { face: 0.95 * SUN, deep: 1.8 * SUN, pitch: KEN / 28, kiriko: 2, doubleSill: false, tone: 'dark' },
  // 仕舞屋格子 -- the plain non-commercial default
  fine: { face: 0.70 * SUN, deep: 1.5 * SUN, pitch: KEN / 40, kiriko: 0, doubleSill: false, tone: 'dark' },
  // 千本格子 -- the ochaya lattice.  ARCH 3.8: 見付 24 x 見込 36 at 45 c/c
  senbon: { face: 0.024, deep: 0.036, pitch: 0.045, kiriko: 0, doubleSill: false, tone: 'dark' },
  // 丸竹組格子 -- the round-bamboo lattice the 数寄屋風 type requires
  takekoshi: { face: 0.042, deep: 0.042, pitch: 0.090, kiriko: 0, doubleSill: false, tone: 'take' },
};

const NUKI_D = 2.7 * SUN;      // 81.8 mm -- the 貫 rail
const NUKI_T = 3 * BU;         // 9.1 mm

/* ------------------------------------------------------------------ *
 * 4. Shading presets.  KIT.md 3: a warm-red facade with a violet shadow goes
 *    purple, and plaster on a 3-band ramp goes grey.
 * ------------------------------------------------------------------ */

const O = {
  timber: { bands: 3, tint: TINT.warm },
  timberDeep: { bands: 2, tint: TINT.warm },
  bengara: { bands: 3, tint: TINT.warmDeep },
  plaster: { bands: 'soft3', tint: TINT.cool },
  stone: { bands: 3, tint: TINT.cool },
  tile: { bands: 3, tint: TINT.cool },
  dark: { bands: 'deep', tint: TINT.cool },
  bamboo: { bands: 3, tint: TINT.green },
};

/* ------------------------------------------------------------------ *
 * 5. Style palettes -- each a designated type in one of the two plans, so
 *    variety along a street is legitimate rather than invented noise.
 * ------------------------------------------------------------------ */

const STYLE = {
  // むしこ造り町家 -- Sannenzaka.  Edo to Meiji, 中2階, 漆喰, 虫籠窓.
  machiya: {
    floors: 1.5, timber: PAL.timber, plaster: PAL.plaster, lattice: 'itoya',
    mushikomado: true, komayose: false, inuyarai: false, degoshi: 0.455, sudare: false,
  },
  // 飾窓付店舗 -- the shop.  幕掛け on the hisashi, noren, one board sign.
  shop: {
    floors: 1.5, timber: PAL.timber, plaster: PAL.plaster, lattice: 'sakaya',
    mushikomado: true, komayose: false, inuyarai: false, degoshi: 0.455, sudare: false,
  },
  /* 本2階建町家茶屋様式 -- the ochaya.  ARCH 3.7, verbatim from the 重伝建
   * citation: 切妻造桟瓦葺, 平入二階建, 一階は千本格子, 二階は縁を出し簾を掛
   * ける.  ★ NO 虫籠窓 and NO 厨子二階 -- that is a common, very visible error.
   * 京壁, bengara timber, 駒寄せ, and no commercial signage at all: the
   * absence of signage is itself the strongest cue. */
  ochaya: {
    floors: 2, timber: PAL.bengara, plaster: PAL.plasterOchre, lattice: 'senbon',
    mushikomado: false, komayose: true, inuyarai: false, degoshi: 0.36, sudare: true,
    overhang: 0.45, eaveH: 6.25, hisashiH: 2.85, upperH: 3.30,
  },
  // 本2階建町家住居様式 -- the ordinary Gion house.  長押, 簾, 駒寄せ, no shop.
  residence: {
    floors: 2, timber: PAL.timber, plaster: PAL.plasterOchre, lattice: 'fine',
    mushikomado: false, komayose: true, inuyarai: false, degoshi: 0, sudare: true,
    overhang: 0.30, eaveH: 6.10, hisashiH: 2.85, upperH: 3.20,
  },
  // 数寄屋風 -- 聚楽壁, 丸竹組格子, and 犬矢来 rather than 駒寄せ
  sukiya: {
    floors: 1, timber: PAL.timberGrey, plaster: PAL.plasterOchre, lattice: 'takekoshi',
    mushikomado: false, komayose: false, inuyarai: true, degoshi: 0, sudare: false,
  },
};

/* ------------------------------------------------------------------ *
 * 6. Small geometry helpers.
 * ------------------------------------------------------------------ */

function bx(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(Math.max(2e-3, w), Math.max(2e-3, h), Math.max(2e-3, d));
  g.translate(x, y, z);
  return g;
}

/** A collector of `{ geometry, color, opts }`, which is what the baker eats. */
class Parts {
  constructor() { this.list = []; }
  add(geometry, color, opts = O.timber) { this.list.push({ geometry, color, opts }); return this; }
  box(color, opts, w, h, d, x = 0, y = 0, z = 0) { return this.add(bx(w, h, d, x, y, z), color, opts); }
  many(parts) { for (const p of parts) this.list.push(p); return this; }
}

const _flip = new THREE.Matrix4().makeRotationY(Math.PI);
/** roof.js builds hisashi and rafters running +z; here the street is -z. */
function flipZ(parts) {
  for (const p of parts) p.geometry.applyMatrix4(_flip);
  return parts;
}
function moveZ(parts, dz, dy = 0) {
  for (const p of parts) p.geometry.translate(0, dy, dz);
  return parts;
}

/**
 * A wall with rectangular holes in it, built as bands and piers.
 *
 * You cannot carve an opening out of a BoxGeometry -- KIT.md section 10 --
 * and a dark panel written *behind* a solid wall is simply inside the render.
 * Every window in this file goes through here.  `gaps` is a list of
 * `[x0, x1]` spans, all sharing the same `openY0..openY1`.
 */
function bandedWall(P, { x0, x1, yBot, yTop, openY0, openY1, gaps, z, thick, color, opts }) {
  const zc = z + thick / 2;
  if (yTop <= yBot + 1e-3) return;
  if (!gaps || !gaps.length) {
    P.box(color, opts, x1 - x0, yTop - yBot, thick, (x0 + x1) / 2, (yBot + yTop) / 2, zc);
    return;
  }
  const oy0 = clamp(openY0, yBot, yTop), oy1 = clamp(openY1, yBot, yTop);
  if (oy0 > yBot + 1e-3) P.box(color, opts, x1 - x0, oy0 - yBot, thick, (x0 + x1) / 2, (yBot + oy0) / 2, zc);
  if (yTop > oy1 + 1e-3) P.box(color, opts, x1 - x0, yTop - oy1, thick, (x0 + x1) / 2, (oy1 + yTop) / 2, zc);
  let cur = x0;
  for (const [a, b] of gaps) {
    if (a > cur + 1e-3) P.box(color, opts, a - cur, oy1 - oy0, thick, (cur + a) / 2, (oy0 + oy1) / 2, zc);
    cur = b;
  }
  if (x1 > cur + 1e-3) P.box(color, opts, x1 - cur, oy1 - oy0, thick, (cur + x1) / 2, (oy0 + oy1) / 2, zc);
}

/**
 * A circular arc between two points in the (z, y) plane, bulging toward -z.
 * Returns `[z, y, nz, ny]` -- the point and its outward normal.  The 犬矢来's
 * whole character is that the bamboo is *bent*.
 */
function arcProfile(az, ay, bz, by, R, n) {
  const mz = (az + bz) / 2, my = (ay + by) / 2;
  const dz = bz - az, dy = by - ay;
  const c = Math.hypot(dz, dy);
  const r = Math.max(R, c / 2 + 1e-4);
  const off = Math.sqrt(r * r - (c / 2) * (c / 2));
  let px = dy / c, py = -dz / c;
  if (px < 0) { px = -px; py = -py; }         // centre on +z => the arc bulges toward -z
  const cz = mz + px * off, cy = my + py * off;
  const a0 = Math.atan2(ay - cy, az - cz);
  let a1 = Math.atan2(by - cy, bz - cz);
  while (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
  while (a0 - a1 > Math.PI) a1 += Math.PI * 2;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = lerp(a0, a1, i / n);
    const cs = Math.cos(a), sn = Math.sin(a);
    pts.push([cz + cs * r, cy + sn * r, cs, sn]);
  }
  return pts;
}

/* ------------------------------------------------------------------ *
 * 7. 犬矢来 -- the bent-bamboo fender at the wall base.  ARCH 2.8, 3.9.
 *
 * Trade standard, three independent sources agreeing: **800 mm high, 300 mm
 * projection, arched, R ~= 900 mm**, split bamboo lashed with three
 * horizontal bindings.  It belongs on 大塀造 walled houses, restaurants and
 * the 数寄屋風 ochaya type -- NOT on every machiya, and NOT where the plan
 * calls for 駒寄せ instead.
 *
 * Built as one corrugated shell -- a vertex column per stave edge and per
 * stave crown -- rather than as ninety separate staves, because it has to
 * read as a continuous ribbed surface and not as a picket fence.
 *
 * DEVIATION, stated: the trade rib pitch is 33 mm (30.3 mm split bamboo plus
 * a 2-3 mm gap).  Modelled at 62 mm, because at the 4-20 m viewing distance
 * this object is ever seen from, a 33 mm rib is under three pixels, and the
 * finer pitch costs ~1,400 extra triangles per building for no visible gain.
 * The 800 x 300 envelope and the R900 arc are exact.
 * ------------------------------------------------------------------ */

function inuyaraiGeometry({ length, height = 0.80, project = 0.30, stave = 0.062, arcSegs = 3, bulge = 0.013 }) {
  const nS = Math.max(2, Math.round(length / stave));
  const prof = arcProfile(0, height, -project, 0, 0.90, arcSegs);
  const pos = [], idx = [];
  const cols = nS * 2 + 1;                    // edge, crown, edge, crown ... edge
  const x0 = -length / 2;
  const push = (x, z, y) => { pos.push(x, y, z); return pos.length / 3 - 1; };

  const front = [];
  for (let c = 0; c < cols; c++) {
    const x = x0 + (c / (cols - 1)) * length;
    const k = c % 2 === 1 ? bulge : 0;
    const row = [];
    for (let j = 0; j <= arcSegs; j++) {
      const [pz, py, nz, ny] = prof[j];
      row.push(push(x, pz + nz * k, py + ny * k));
    }
    front.push(row);
  }
  for (let c = 0; c < cols - 1; c++) {
    for (let j = 0; j < arcSegs; j++) {
      const a = front[c][j], b = front[c + 1][j], d = front[c][j + 1], e = front[c + 1][j + 1];
      idx.push(a, b, d, b, e, d);
    }
  }
  // a plain back skin so the shell is closed at the ends and along the top
  const bk = [];
  for (const x of [x0, x0 + length]) {
    const row = [];
    for (let j = 0; j <= arcSegs; j++) {
      const [pz, py, nz, ny] = prof[j];
      row.push(push(x, pz - nz * 0.028, py - ny * 0.028));
    }
    bk.push(row);
  }
  for (let j = 0; j < arcSegs; j++) {
    const a = bk[0][j], b = bk[1][j], d = bk[0][j + 1], e = bk[1][j + 1];
    idx.push(a, d, b, b, d, e);
  }
  const lc = cols - 1;
  for (let j = 0; j < arcSegs; j++) {
    idx.push(front[0][j], front[0][j + 1], bk[0][j], front[0][j + 1], bk[0][j + 1], bk[0][j]);
    idx.push(front[lc][j], bk[1][j], front[lc][j + 1], front[lc][j + 1], bk[1][j], bk[1][j + 1]);
  }
  idx.push(front[0][0], bk[0][0], front[lc][0], front[lc][0], bk[0][0], bk[1][0]);
  idx.push(front[0][arcSegs], front[lc][arcSegs], bk[0][arcSegs], front[lc][arcSegs], bk[1][arcSegs], bk[0][arcSegs]);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ *
 * 8. The lattice, as real battens.
 *
 * One BufferGeometry for a whole panel, three faces per batten (street face
 * and both returns) and no back face, because the back is against a dark
 * recess panel and is never seen.  Six triangles a batten instead of twelve,
 * which is what makes a 千本格子 at a 45 mm pitch affordable at all.
 * ------------------------------------------------------------------ */

function battenGeometry({ x0, x1, y0, y1, z, face, deep, pitch, kiriko = 0, kirikoDrop = 0.45 }) {
  const w = x1 - x0, h = y1 - y0;
  const n = Math.max(2, Math.round(w / pitch));
  const p = w / n;
  const fw = Math.min(face, p * 0.72);
  const pos = [], idx = [];
  const v = (x, y, zz) => { pos.push(x, y, zz); return pos.length / 3 - 1; };
  for (let i = 0; i < n; i++) {
    const cx = x0 + p * (i + 0.5);
    const bh = (kiriko && i % kiriko === 0) ? Math.max(0.28, h - kirikoDrop) : h;
    const yl = y0, yh = y0 + bh;
    const xl = cx - fw / 2, xr = cx + fw / 2, zf = z, zb = z + deep;
    // street face -- normal -z
    const a = v(xl, yl, zf), b = v(xr, yl, zf), c = v(xr, yh, zf), d = v(xl, yh, zf);
    idx.push(a, d, c, a, c, b);
    // the two returns, which is where the "see out, not in" effect comes from
    const e = v(xl, yl, zb), f = v(xl, yh, zb);
    idx.push(a, e, f, a, f, d);
    const g2 = v(xr, yl, zb), h2 = v(xr, yh, zb);
    idx.push(b, c, h2, b, h2, g2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function latticePanel(P, {
  x0, x1, y0, y1, z, kind = 'itoya', color = PAL.timber, opts = O.timberDeep,
  rails = 3, lod = false, recess = true,
}) {
  const K = KOSHI[kind] || KOSHI.itoya;
  const w = x1 - x0, h = y1 - y0;
  if (w <= 0.03 || h <= 0.03) return;

  /* The dark the battens stand in front of.  Without it a lattice reads as a
   * row of sticks glued to a pale wall, which is how this detail usually
   * goes wrong. */
  if (recess) P.box(PAL.timberDark, O.dark, w, h, 0.03, (x0 + x1) / 2, (y0 + y1) / 2, z + K.deep + 0.015);

  // 貫 -- the horizontal rails, behind the battens
  const rowY = [];
  for (let r = 0; r < rails; r++) rowY.push(lerp(y0 + 0.03, y1 - 0.03, rails === 1 ? 0.5 : r / (rails - 1)));
  if (K.doubleSill) rowY.push(y0 + 0.16);
  for (const yy of rowY) {
    P.box(color, opts, w, NUKI_T * 5, NUKI_D * 0.5, (x0 + x1) / 2, yy, z + K.deep * 0.8);
  }

  if (lod) return;                       // the caller lays a latticeTex plane over it
  P.add(battenGeometry({
    x0, x1, y0, y1, z, face: K.face, deep: K.deep, pitch: K.pitch, kiriko: K.kiriko,
  }), color, opts);
}

/* ------------------------------------------------------------------ *
 * 9. 虫籠窓.  ARCH 2.7.  ★ Sannenzaka only -- 虫籠窓 belong to the 厨子二階
 *    and must NOT appear on a Gion 総二階 ochaya (ARCH 3.8).
 *
 * A 4寸角 timber split into six, wound with rope and plastered solid, so the
 * visible bar is far fatter than its core: ~50 mm wide standing ~35 mm out of
 * the wall, roughly 50 % open.  CLEAR_HALF wide x 0.60 high, sill 0.65 above
 * the tsushi floor, one to a bay, odd bar counts.  The wall around it comes
 * from `bandedWall`, so the opening is a real hole.
 * ------------------------------------------------------------------ */

function mushikoBars(P, { cx, y0, w, h, wallZ, bars, plaster, era }) {
  const half = w / 2;
  P.box(PAL.timberDark, O.dark, w + 0.02, h + 0.02, 0.04, cx, y0 + h / 2, wallZ + 0.13);
  const rev = 0.05;
  P.box(plaster, O.plaster, w + rev * 2, rev, 0.13, cx, y0 + h + rev / 2, wallZ + 0.05);
  P.box(plaster, O.plaster, w + rev * 2, rev, 0.13, cx, y0 - rev / 2, wallZ + 0.05);
  for (const s of [-1, 1]) {
    P.box(plaster, O.plaster, rev, h + rev * 2, 0.13, cx + s * (half + rev / 2), y0 + h / 2, wallZ + 0.05);
  }
  if (era === 'lateEdo' || era === 'midEdo') {
    /* 横長楕円 (late Edo) and 木爪形 (mid Edo) both read as a curved plaster
     * brow over the opening. */
    const pts = [];
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const xx = (t - 0.5) * (w + rev * 2);
      const lobe = era === 'midEdo' ? 0.55 + 0.45 * Math.abs(Math.cos(t * Math.PI * 3)) : 1;
      pts.push([xx, Math.pow(Math.sin(t * Math.PI), 0.65) * 0.105 * lobe]);
    }
    pts.push([(w + rev * 2) / 2, -0.012], [-(w + rev * 2) / 2, -0.012]);
    const g = prism(pts, 0.13);
    g.translate(cx, y0 + h + rev, wallZ + 0.05);
    P.add(g, plaster, O.plaster);
  }
  const n = bars % 2 === 0 ? bars + 1 : bars;
  const pitch = w / n;
  for (let i = 0; i < n; i++) {
    P.box(plaster, O.plaster, Math.min(0.056, pitch * 0.52), h, 0.042,
      cx - half + pitch * (i + 0.5), y0 + h / 2, wallZ - 0.014);
  }
}

/* ------------------------------------------------------------------ *
 * 10. 駒寄せ -- ARCH 2.9.  A straight timber fence standing off the facade to
 *     claim the eave strip.  This, not the inuyarai, is the Gion default: the
 *     plans require 駒寄せ on the 住居 / 茶屋 / へい造り types and 犬矢来 only
 *     on 数寄屋風.  They are different objects (curved bamboo 800 mm vs
 *     straight timber), not two names for one.
 * ------------------------------------------------------------------ */

function komayoseRun(P, { x0, x1, y, h = 0.85, standoff = 0.38, color, opts }) {
  const w = x1 - x0;
  if (w < 0.5) return;
  const n = Math.max(2, Math.round(w / HALF_KEN));
  for (let i = 0; i <= n; i++) {
    P.box(color, opts, 0.09, h, 0.09, x0 + (i / n) * w, y + h / 2, -standoff);
  }
  for (const t of [0.42, 0.86]) {
    P.box(color, opts, w + 0.09, 0.055, 0.032, (x0 + x1) / 2, y + h * t, -standoff - 0.036);
  }
  P.box(color, opts, w + 0.16, 0.05, 0.115, (x0 + x1) / 2, y + h + 0.02, -standoff);
}

/* ------------------------------------------------------------------ *
 * 11. Textured meshes.  Signs, noren and sudare carry a map, so they cannot
 *     go through the baker (it strips uv).  They share a material through
 *     `celTex`, keyed on the texture, so forty of them are one program.
 * ------------------------------------------------------------------ */

const _swayReg = new WeakMap();

function texMesh(ctx, geo, tex, M, {
  transparent = false, alphaTest = 0, side = THREE.FrontSide, bands = 3,
  tint = TINT.cool, color = 0xffffff, noOutline = false, sway = 0,
} = {}) {
  const mat = celTex(tex, { transparent, alphaTest, side, bands, tint, color, flat: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.applyMatrix4(M);
  if (noOutline) mesh.userData.noOutline = true;
  if (transparent) mesh.userData.noShadow = true;
  ctx.add(mesh);
  if (sway) registerSway(ctx, mesh, sway);
  return mesh;
}

/**
 * Noren lift.  ONE updater per world, not one per building -- sixty
 * townhouses must not cost sixty closures.  A slow shallow skew, which is
 * what a curtain in still air does.  Nothing swings, nothing bounces.
 */
function registerSway(ctx, mesh, amount) {
  let reg = _swayReg.get(ctx);
  if (!reg) {
    reg = { items: [] };
    _swayReg.set(ctx, reg);
    ctx.update((dt, t) => {
      for (let i = 0; i < reg.items.length; i++) {
        const it = reg.items[i];
        it.mesh.rotation.z = it.base + Math.sin(t * 0.5 + it.phase) * it.amount;
      }
    });
  }
  /* Marked so the world's merge-by-material pass leaves it alone: a merged
   * mesh has one transform, and merging a swaying noren would swing every
   * noren in the district as one object. */
  mesh.userData.animated = true;
  reg.items.push({ mesh, base: mesh.rotation.z, phase: reg.items.length * 1.37, amount });
}

/* ==================================================================== *
 * makeMachiya
 * ==================================================================== */

export function makeMachiya(ctx, opt = {}) {
  const R = rngKit((opt.seed ?? 1) >>> 0 || 1);

  const style = STYLE[opt.style] ? opt.style : 'machiya';
  const S = STYLE[style];

  /* ------------------------------ module -------------------------------- */
  const pitchMod = opt.module === 'uchinori' ? UCHINORI_PITCH : KEN;
  const snap = snapKen(opt.width ?? 2 * pitchMod, { pitch: pitchMod });
  const nBays = snap.bays;
  const width = snap.width;
  const depth = Math.max(2.6, opt.depth ?? Math.round(6 + R.next() * 6) * KEN);
  const floors = opt.floors ?? S.floors;
  const lod = !!opt.lod;

  const timberTone = opt.timberTone ?? S.timber;
  const plasterTone = opt.plasterTone ?? S.plaster;
  const isBengara = timberTone === PAL.bengara || timberTone === PAL.bengaraDeep || timberTone === PAL.bengaraLit;
  const timberOpts = isBengara ? O.bengara : O.timber;
  const wainCol = isBengara ? PAL.bengaraDeep : PAL.timberDark;

  const latticeKind = KOSHI[opt.latticeKind] ? opt.latticeKind : S.lattice;
  const K = KOSHI[latticeKind];
  /* 丸竹 is a pale straw-tan, not a leaf green: a green lattice reads as
   * painted timber and pulls the whole facade out of the palette. */
  const latticeColor = K.tone === 'bengara' ? PAL.bengara
    : K.tone === 'bare' ? PAL.timberMid
      : K.tone === 'take' ? PAL.bambooCulmPale : timberTone;
  const latticeOpts = K.tone === 'bengara' ? O.bengara : K.tone === 'take' ? O.timber : O.timberDeep;

  const inuyarai = opt.inuyarai ?? S.inuyarai;
  const komayose = opt.komayose ?? (S.komayose && !inuyarai);
  const degoshiDepth = opt.degoshi === true ? 0.455 : opt.degoshi === false ? 0
    : (opt.degoshi ?? (R.chance(0.6) ? S.degoshi : 0));
  const wantMushiko = (opt.mushikomado ?? S.mushikomado) && floors === 1.5;
  const wantSudare = (opt.sudare ?? S.sudare) && floors >= 2;
  const overhang = floors === 2 ? (opt.overhang ?? S.overhang ?? 0.45) : 0;

  /* 4/10 is the ONLY pitch satisfying both the Gion ordinance (3.0-4.5/10)
   * and the tile makers' spec (4-6/10).  ARCH 3.6. */
  const roofPitch = opt.roofPitch ?? 0.40;
  const roofMaterial = opt.roofMaterial ?? (R.chance(0.18) ? 'tileOld' : 'tile');
  /* 軒の出: おおむね 0.9 m 以上 in the standard form, but 0.6 m 程度 where the
   * upper storey itself projects -- the two are alternatives, not additive. */
  const eaveOver = opt.eaveOverhang ?? (overhang > 0.02 ? 0.62 : 0.90);
  const sideEave = opt.sideEave ?? 0.05;                   // party wall: no lateral overhang
  const hisashiDepth = opt.hisashiDepth ?? 0.98;

  const x = opt.x ?? 0, z = opt.z ?? 0, ry = opt.ry ?? 0;
  const cosR = Math.cos(ry), sinR = Math.sin(ry);
  const toWorld = (lx, lz) => ({ x: x + lx * cosR + lz * sinR, z: z - lx * sinR + lz * cosR });

  /* ------------------------------- the seat ----------------------------- *
   * The 延石 is level with the STREET, not with the top of the hill behind
   * the house.  So the seat comes from the ground along the FRONTAGE only --
   * sampled at both ends and the middle, and at the 犬走り strip in front of
   * it -- and the plot's back end is simply cut into the slope, which is what
   * a machiya on Sannenzaka actually is.  Seating on the lowest of all four
   * corners instead puts a shop on a metre-and-a-half podium on any site with
   * a deep plot running uphill, and it looks exactly as wrong as it sounds. */
  let gMin = Infinity, gMax = -Infinity, gRear = Infinity;
  for (const lx of [-width / 2, 0, width / 2]) {
    for (const lz of [-0.45, 0, 0.6]) {
      const w = toWorld(lx, lz);
      const h = ctx.groundAt(w.x, w.z);
      if (h < gMin) gMin = h;
      if (h > gMax) gMax = h;
    }
    for (const lz of [depth * 0.5, depth]) {
      const w = toWorld(lx, lz);
      gRear = Math.min(gRear, ctx.groundAt(w.x, w.z));
    }
  }
  if (!isFinite(gMin)) { gMin = 0; gMax = 0; }
  if (!isFinite(gRear)) gRear = gMin;
  /* `opt.y` lets a plot layout hand us the seat it already computed (see
   * world/plots.js, which reports yLow/yHigh per plot).  Either way the sill
   * stone is LEVEL and sits above the highest ground under the footprint; the
   * plinth takes up the fall.  Never a hard-coded y. */
  const base = opt.y != null ? opt.y : gMin;
  const sillY = clamp((gMax - base) + 0.13, 0.13, 1.10);
  // the plinth has to reach whatever the ground does under the whole footprint
  const plinthBot = Math.min(-0.6, gRear - base - 0.5, gMin - base - 0.4);

  /* ------------------------------- set-out ------------------------------ */
  const koshiY = sillY + 0.50;               // 腰貫 -- head of the wainscot
  const kamoiY = sillY + UCHINORI_H;         // 内法 -- head of the INTERIOR openings
  const hisashiY = sillY + (opt.hisashiH ?? S.hisashiH ?? HISASHI_H[floors] ?? 2.62);
  const eaveY = sillY + (opt.eaveH ?? S.eaveH ?? EAVE_H[floors] ?? 4.80);
  const upperY = sillY + (opt.upperH ?? S.upperH ?? UPPER_FLOOR_H[floors] ?? 0);
  /* 差鴨居 -- the FACADE lintel, and a different line from the 内法.  The
   * 内法 (1.727 m) is the head of an interior shoji; the head of the street
   * lattice sits just under the 通り庇, which is why a machiya shopfront's
   * 格子 is a full two metres tall.  Setting the lattice head at the 内法
   * instead leaves a metre of blank plaster across the middle of the facade,
   * which is the single most damaging thing you can do to this elevation. */
  const lintelY = Math.max(kamoiY + 0.14, hisashiY - 0.34);

  /* The front roof block.  A machiya plot is 12-24 m deep; its street roof is
   * not.  The ridge sits a few ken back and the rest of the plot lives under
   * lower roofs behind it -- as one long gable the ridge would come out above
   * 9 m and the street would read as a barn.  ARCH 3.11 sets a Gion ochaya's
   * ridge at eave + frontage/2 x 0.40, which this reproduces by making the
   * roofed block track the frontage. */
  const frontBlock = clamp(
    opt.frontBlock ?? (floors === 2 ? width * 0.86 : 2.7 * KEN),
    1.6 * KEN, Math.min(depth, 4.2 * KEN)
  );
  const roofD = frontBlock;
  const roofCenterZ = roofD / 2 - overhang;
  const roofRise = ((roofD + eaveOver * 2) / 2) * roofPitch;
  const ridgeY = eaveY + roofRise;

  const P = new Parts();

  /* ------------------------------------------------------------------ *
   * 延石 -- the dressed granite sill the whole frame stands on, and the
   * plinth that takes up the fall of the street beneath it.
   * ------------------------------------------------------------------ */
  P.box(PAL.stoneWallDark, O.stone, width + 0.08, sillY - 0.11 - plinthBot, depth + 0.04,
    0, (plinthBot + sillY - 0.11) / 2, depth / 2 - 0.02);
  P.box(PAL.stone, O.stone, width + 0.15, 0.11, depth + 0.10,
    0, sillY - 0.055, depth / 2 - 0.05);

  /* ------------------------------------------------------------------ *
   * The mass.  It stops SHORT of the facade so the frame, the lattice and
   * the entrance have somewhere to be -- KIT.md section 10.
   * ------------------------------------------------------------------ */
  const bayW = width / nBays;
  const bayCx = (i) => -width / 2 + bayW * (i + 0.5);

  /* Which bay holds the 大戸?  The 通り庭 runs the full depth on the SOUTH or
   * EAST side of the plot -- a real, checkable constraint, so it is derived,
   * not randomised.  local +x maps to world (cos ry, -sin ry); south is +z
   * and east is +x, so the larger of (cos - sin) picks the toriniwa side. */
  const entryBay = opt.entryBay != null
    ? clamp(Math.round(opt.entryBay), 0, nBays - 1)
    : (cosR - sinR > 0 ? nBays - 1 : 0);
  const entryX = bayCx(entryBay);
  const entryHalf = Math.min(bayW / 2 - COLUMN_4SUN * 0.55, CLEAR_BAY / 2);
  const FRONT = 0.55;                        // facade zone the mass leaves free
  const ENTRY_REC = FRONT + 0.42;            // the entrance is recessed further still

  /* Bays whose mass is cut back further than the facade zone: the entrance,
   * plus any `openBays` a shopfront has asked for.  Consecutive ones merge
   * into one segment, which is how a two-bay shop mouth gets a single clear
   * opening rather than a post down the middle of it. */
  const openBays = new Set((opt.openBays || [])
    .map((i) => clamp(Math.round(i), 0, nBays - 1))
    .filter((i) => i !== entryBay));
  const deepBays = new Set([entryBay, ...openBays]);
  const segs = [];
  for (let i = 0; i < nBays; i++) {
    const isDeep = deepBays.has(i);
    const a = -width / 2 + bayW * i, b = a + bayW;
    const last = segs[segs.length - 1];
    if (last && last[3] === isDeep) last[1] = b;
    else segs.push([a, b, isDeep ? ENTRY_REC : FRONT, isDeep]);
  }

  const massH = eaveY - plinthBot;
  for (const [a, b, front] of segs) {
    P.box(plasterTone, O.plaster, b - a, massH, depth - front,
      (a + b) / 2, plinthBot + massH / 2, front + (depth - front) / 2);
  }
  /* What you see through the lattice: dark.  "See out, not in." */
  for (const [a, b, front, isDeep] of segs) {
    if (isDeep) continue;
    P.box(PAL.timberDark, O.dark, b - a - 0.03, lintelY - sillY, 0.05,
      (a + b) / 2, (sillY + lintelY) / 2, front - 0.03);
  }

  /* ------------------------------------------------------------------ *
   * 真壁 -- the exposed frame, which the Gion standards make mandatory.
   * Posts on the module, 4寸 square, sill stone to eave plate.  This is the
   * grid the whole street is drawn with.
   * ------------------------------------------------------------------ */
  const postD = COLUMN_4SUN;
  for (let i = 0; i <= nBays; i++) {
    P.box(timberTone, timberOpts, postD, eaveY - sillY, postD, -width / 2 + bayW * i, (sillY + eaveY) / 2, 0);
  }
  // 通し貫 -- the 腰貫 at the wainscot head and the 差鴨居 at the lattice head
  for (const yy of [koshiY, lintelY]) {
    P.box(timberTone, timberOpts, width, 0.125, postD * 0.80, 0, yy, -0.008);
  }
  // 軒桁 -- the eave plate the rafters sit on
  P.box(timberTone, timberOpts, width + sideEave * 2, 0.17, 0.15, 0, eaveY - 0.10, -0.02);
  /* 小壁 -- whatever plaster is left between the 差鴨居 and the 通り庇.  On a
   * correctly set-out facade that is a hand's width, and it lives in the
   * hisashi's shadow.  If it comes out taller than 0.25 m, the lintel is
   * wrong, not the wall. */
  if (hisashiY - 0.36 > lintelY + 0.06) {
    P.box(plasterTone, O.plaster, width - postD, hisashiY - 0.36 - lintelY, 0.09,
      0, (lintelY + hisashiY - 0.36) / 2, 0.015);
  }

  /* ------------------------------------------------------------------ *
   * 腰竪羽目板張り -- the vertical boarded wainscot, sill to 腰貫.
   * ------------------------------------------------------------------ */
  for (const [a, b, , isDeep] of segs) {
    if (isDeep || b - a < 0.06) continue;
    const wz = degoshiDepth > 0 ? -degoshiDepth : -0.02;
    P.box(wainCol, O.timberDeep, b - a - postD, koshiY - sillY - 0.03, 0.06,
      (a + b) / 2, (sillY + koshiY - 0.03) / 2, wz - 0.01);
    if (!lod) {
      const nb = Math.max(2, Math.round((b - a) / 0.24));
      for (let i = 1; i < nb; i++) {
        P.box(PAL.timberDark, O.timberDeep, 0.018, koshiY - sillY - 0.07, 0.022,
          a + ((b - a) / nb) * i, (sillY + koshiY - 0.03) / 2, wz - 0.045);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * 格子 / 出格子 -- the lattice, bay by bay.  ARCH 2.5, 2.6, 3.8.
   * ------------------------------------------------------------------ */
  const bays = [];
  for (let i = 0; i < nBays; i++) {
    const cx = bayCx(i);
    if (deepBays.has(i)) {
      bays.push({
        i, x: cx, kind: i === entryBay ? 'entry' : 'display', proj: 0, ...toWorld(cx, 0),
      });
      continue;
    }
    const x0 = cx - bayW / 2 + postD * 0.65, x1 = cx + bayW / 2 - postD * 0.65;
    const proj = degoshiDepth;

    if (proj > 0.01) {
      /* 出格子.  0.303 m (1尺) for the plain bolted-on kind, 0.455 m (1尺5寸)
       * for the later one whose head carries the hisashi's 腕木.  Built
       * OUTWARD: skirt, cheeks, head, lattice on the front face. */
      const fz = -proj;
      P.box(timberTone, timberOpts, x1 - x0 + 0.12, 0.075, proj + 0.06, cx, koshiY + 0.03, fz + proj / 2 - 0.02);
      for (const s of [-1, 1]) {
        P.box(timberTone, timberOpts, 0.055, lintelY - koshiY, proj,
          cx + s * (x1 - x0 + 0.055) / 2, (koshiY + lintelY) / 2, fz + proj / 2);
      }
      P.box(timberTone, timberOpts, x1 - x0 + 0.16, 0.115, proj + 0.10, cx, lintelY + 0.06, fz + proj / 2 - 0.035);
      latticePanel(P, {
        x0, x1, y0: koshiY + 0.07, y1: lintelY - 0.005, z: fz,
        kind: latticeKind, color: latticeColor, opts: latticeOpts, lod, rails: 4,
      });
      if (proj > 0.4) {
        for (const s of [-1, 1]) {
          P.add(beam(cx + s * (x1 - x0) * 0.30, lintelY + 0.12, fz + proj * 0.35,
            cx + s * (x1 - x0) * 0.30, hisashiY - 0.28, 0.03, 0.065, 0.085), timberTone, timberOpts);
        }
      }
      bays.push({ i, x: cx, kind: 'degoshi', proj, ...toWorld(cx, -proj) });
    } else {
      latticePanel(P, {
        x0, x1, y0: koshiY + 0.02, y1: lintelY - 0.02, z: -0.02,
        kind: latticeKind, color: latticeColor, opts: latticeOpts, lod, rails: 4,
      });
      bays.push({ i, x: cx, kind: 'lattice', proj: 0, ...toWorld(cx, 0) });
    }

    if (lod) {
      const g = new THREE.PlaneGeometry(x1 - x0, lintelY - koshiY - 0.06);
      g.rotateY(Math.PI);
      g.translate(cx, (koshiY + lintelY) / 2, (proj > 0.01 ? -proj : -0.02) - 0.014);
      texMesh(ctx, g, latticeTex(KOSHI[latticeKind] === KOSHI.sakaya ? 'sakaya'
        : latticeKind === 'takekoshi' ? 'komeya' : latticeKind === 'senbon' ? 'fine' : latticeKind),
        trs(x, base, z, 0, ry, 0),
        { transparent: true, alphaTest: 0.35, bands: 2, tint: TINT.warm, noOutline: true });
    }
  }

  /* ------------------------------------------------------------------ *
   * 大戸 -- the entrance.  The mass stopped 0.97 m back, so the reveal is a
   * real hole and the piers, header, threshold and the beaten-earth floor of
   * the 通り庭 fill it.  Two leaves of CLEAR_HALF, giving 1.9 m clear -- with
   * the walker's 0.34 m radius, a doorway you can actually walk through.
   * ------------------------------------------------------------------ */
  const entryFloorY = sillY - 0.13;          // 土間: beaten earth, AT GRADE
  {
    const doorH = 1.98;
    const rec = ENTRY_REC - FRONT;
    P.box(PAL.pavingDark, O.stone, bayW, 0.07, rec + 0.34,
      entryX, entryFloorY, FRONT - 0.17 + (rec + 0.34) / 2);
    P.box(PAL.stone, O.stone, bayW * 0.60, 0.15, 0.32, entryX, sillY - 0.10, -0.19);
    for (const s of [-1, 1]) {
      P.box(wainCol, O.timberDeep, 0.075, lintelY - entryFloorY, rec,
        entryX + s * (entryHalf + 0.01), (entryFloorY + lintelY) / 2, FRONT + rec / 2);
    }
    P.box(timberTone, timberOpts, bayW, 0.15, rec + 0.10, entryX, doorH + 0.075, FRONT + rec / 2 - 0.05);
    // 欄間 -- the transom grille between the door head and the 差鴨居
    const ranmaH = Math.max(0.05, lintelY - doorH - 0.15);
    P.box(PAL.timberDark, O.dark, bayW - postD, ranmaH, 0.06,
      entryX, (doorH + 0.15 + lintelY) / 2, ENTRY_REC - 0.05);
    if (!lod && ranmaH > 0.18) {
      P.add(battenGeometry({
        x0: entryX - entryHalf, x1: entryX + entryHalf,
        y0: doorH + 0.19, y1: lintelY - 0.04, z: -0.03,
        face: 0.028, deep: 0.03, pitch: 0.085,
      }), timberTone, timberOpts);
    }
    P.box(timberTone, timberOpts, bayW, 0.06, rec, entryX, lintelY + 0.03, FRONT + rec / 2);
    // one leaf standing, one slid back into its 戸袋, dark between them
    const leaf = Math.min(CLEAR_HALF, entryHalf * 0.98);
    P.box(wainCol, O.timberDeep, leaf, doorH - entryFloorY - 0.03, 0.05,
      entryX - entryHalf + leaf / 2, (entryFloorY + 0.03 + doorH) / 2, ENTRY_REC - 0.07);
    const back = Math.max(0.1, 2 * entryHalf - leaf - 0.08);
    P.box(PAL.timberDark, O.dark, back, doorH - entryFloorY - 0.03, 0.05,
      entryX + entryHalf - back / 2, (entryFloorY + 0.03 + doorH) / 2, ENTRY_REC - 0.02);
    if (!lod) {
      for (let i = 1; i < 4; i++) {
        P.box(PAL.timberDark, O.timberDeep, 0.022, doorH - entryFloorY - 0.08, 0.024,
          entryX - entryHalf + (leaf / 4) * i, (entryFloorY + doorH) / 2, ENTRY_REC - 0.105);
      }
      // the くぐり戸 wicket stile inside the big door
      P.box(PAL.timberDark, O.timberDeep, 0.03, 1.42, 0.026,
        entryX - entryHalf + leaf * 0.70, entryFloorY + 0.74, ENTRY_REC - 0.105);
    }
  }

  /* ------------------------------------------------------------------ *
   * Display bays -- the same real recess, left bare for `dress()` to fill.
   * The shell is: cut-back mass (already done), threshold step, recess
   * floor, side reveals, header, soffit and a dark back wall.  A shopfront
   * then puts its glazing, stands and goods INTO it.
   * ------------------------------------------------------------------ */
  const openSpans = [];
  {
    const rec = ENTRY_REC - FRONT;
    let run = null;
    for (let i = 0; i < nBays; i++) {
      if (openBays.has(i)) {
        const a = -width / 2 + bayW * i;
        if (run && Math.abs(run[1] - a) < 1e-3) run[1] = a + bayW;
        else openSpans.push(run = [a, a + bayW]);
      }
    }
    for (const [a, b] of openSpans) {
      const cx = (a + b) / 2, w0 = b - a;
      const headY = lintelY;
      P.box(PAL.pavingDark, O.stone, w0, 0.07, rec + 0.34, cx, sillY - 0.06, FRONT - 0.17 + (rec + 0.34) / 2);
      P.box(PAL.stone, O.stone, w0 - 0.10, 0.16, 0.30, cx, sillY - 0.09, -0.16);   // 沓脱石 threshold
      for (const s of [-1, 1]) {
        P.box(wainCol, O.timberDeep, 0.09, headY - sillY + 0.2, rec,
          cx + s * (w0 / 2 - postD * 0.6), (sillY + headY) / 2, FRONT + rec / 2);
      }
      P.box(timberTone, timberOpts, w0, 0.16, rec + 0.10, cx, headY + 0.08, FRONT + rec / 2 - 0.05);
      P.box(timberTone, timberOpts, w0, 0.06, rec, cx, headY, FRONT + rec / 2);      // soffit
      P.box(PAL.timberDark, O.dark, w0, 0.10, 0.06, cx, headY + 0.24, ENTRY_REC - 0.05);
    }
  }

  /* ------------------------------------------------------------------ *
   * 通り庇 -- REQUIRED over the ground floor by the Gion standards, and the
   * thing that gives a Kyoto street its horizontal banding.  Japanese tile,
   * 3寸, soffit showing 野地板, carrying the 幕掛け the noren hangs from.
   * ------------------------------------------------------------------ */
  const hisRise = hisashiDepth * 0.30;
  {
    const sh = shedRoof({
      w: Math.max(0.3, width + sideEave * 2 - 0.32), d: hisashiDepth - 0.16, pitch: 0.30,
      eave: 0.16, material: roofMaterial, mukuri: 0.03, y: hisashiY, ridgeCourses: 1,
    });
    P.many(flipZ(sh.parts));
    /* 一文字軒先瓦 -- the eave course terminating in a dead-straight line,
     * mandatory on the hisashi for the chaya types.  Modelled as one extruded
     * fascia, never as a row of discs: ARCH 2.4 calls this the highest-payoff
     * single detail on the whole facade. */
    P.box(PAL.tileRidge, O.tile, width + sideEave * 2, 0.098, 0.06,
      0, hisashiY - 0.052, -hisashiDepth + 0.03);
    // 野地板 -- the boarded soffit the plan requires
    P.add(beam(0, hisashiY + hisRise - 0.07, -0.02, 0, hisashiY - 0.035, -hisashiDepth + 0.09,
      width + sideEave * 2 - 0.05, 0.035), PAL.timberWarm, O.timber);
    // 腕木 and 出桁
    const nArm = Math.max(2, Math.round(width / HALF_KEN));
    for (let i = 0; i <= nArm; i++) {
      const ax = -width / 2 + (i / nArm) * width;
      P.add(beam(ax, hisashiY - 0.06, 0.04, ax, hisashiY - 0.21, -hisashiDepth + 0.18, 0.072, 0.115),
        timberTone, timberOpts);
    }
    P.box(timberTone, timberOpts, width + sideEave * 2, 0.13, 0.10, 0, hisashiY - 0.26, -hisashiDepth + 0.18);
    // 幕掛け / 幕板
    P.box(wainCol, O.timberDeep, width, 0.21, 0.035, 0, hisashiY - 0.36, -0.06);
  }

  /* ------------------------------------------------------------------ *
   * The upper storey.
   * ------------------------------------------------------------------ */
  const wallZ = -0.035;                      // plaster face, 25 mm behind the post face
  if (floors === 1.5) {
    /* 厨子二階 -- the plastered half storey.  Ceiling 1.730 m, measured at the
     * 重文 奈良屋杉本家住宅, so the window has to be small and low. */
    const era = opt.mushikoEra || R.pick(['meiji', 'meiji', 'lateEdo', 'taisho', 'midEdo']);
    const mw = era === 'taisho' ? 0.72 : CLEAR_HALF;
    const mh = era === 'taisho' ? 0.74 : 0.60;
    const my0 = upperY + 0.62;
    const gaps = [];
    if (wantMushiko) for (let i = 0; i < nBays; i++) gaps.push([bayCx(i) - mw / 2, bayCx(i) + mw / 2]);
    bandedWall(P, {
      x0: -width / 2 + postD * 0.4, x1: width / 2 - postD * 0.4,
      yBot: hisashiY + 0.06, yTop: eaveY - 0.16,
      openY0: my0, openY1: my0 + mh, gaps, z: wallZ, thick: 0.11,
      color: plasterTone, opts: O.plaster,
    });
    P.box(timberTone, timberOpts, width, 0.13, 0.15, 0, upperY - 0.055, -0.02);   // the floor beam
    if (wantMushiko) {
      for (let i = 0; i < nBays; i++) {
        mushikoBars(P, {
          cx: bayCx(i), y0: my0, w: mw, h: mh, wallZ,
          bars: lod ? 7 : (era === 'taisho' ? 9 : 11), plaster: plasterTone, era,
        });
      }
    }
  } else if (floors === 2) {
    /* 本2階建.「2階の縁側は、張出しとすること」-- the first-floor veranda MUST
     * be cantilevered past the wall line.  With a 格子手摺 balustrade and 簾
     * hung 年中, that overhang is the whole massing signature of an ochaya. */
    const fz = -overhang + wallZ;
    const winH = 1.58, winY = upperY + 0.06;
    const ranma = 0.40;                      // 欄間, the transom over the window
    const gaps = [];
    for (let i = 0; i < nBays; i++) {
      const w0 = Math.min(CLEAR_BAY, bayW - postD - 0.10);
      gaps.push([bayCx(i) - w0 / 2, bayCx(i) + w0 / 2]);
    }
    bandedWall(P, {
      x0: -width / 2, x1: width / 2, yBot: upperY - 0.02, yTop: eaveY - 0.16,
      openY0: winY, openY1: winY + winH + ranma, gaps, z: fz, thick: 0.12 + overhang,
      color: plasterTone, opts: O.plaster,
    });
    // the dark of the 座敷, on the FACE of the wall behind the opening
    for (const [a, b] of gaps) {
      P.box(PAL.timberDark, O.dark, b - a, winH + ranma, 0.05, (a + b) / 2, winY + (winH + ranma) / 2, fz + 0.10);
    }
    if (overhang > 0.02) {
      P.box(timberTone, timberOpts, width + sideEave, 0.17, overhang + 0.16, 0, upperY - 0.09, -overhang / 2 + 0.02);
      const nArm = Math.max(2, Math.round(width / HALF_KEN));
      for (let i = 0; i <= nArm; i++) {
        const ax = -width / 2 + (i / nArm) * width;
        P.add(beam(ax, upperY - 0.20, -overhang + 0.06, ax, upperY - 0.56, 0.05, 0.065, 0.10),
          timberTone, timberOpts);
      }
    }
    for (let i = 0; i <= nBays; i++) {
      P.box(timberTone, timberOpts, postD, eaveY - 0.16 - upperY, postD,
        -width / 2 + bayW * i, (upperY + eaveY - 0.16) / 2, fz - postD * 0.15);
    }
    // 長押 over the window head, and the 欄間 grille above it
    P.box(timberTone, timberOpts, width, 0.10, 0.10, 0, winY + winH + 0.02, fz - 0.06);
    if (!lod) {
      for (const [a, b] of gaps) {
        P.add(battenGeometry({
          x0: a, x1: b, y0: winY + winH + 0.09, y1: winY + winH + ranma - 0.03, z: fz - 0.02,
          face: 0.03, deep: 0.03, pitch: 0.10,
        }), timberTone, timberOpts);
        // the sliding lattice leaves of the 掃き出し窓
        const nm = Math.max(2, Math.round((b - a) / 0.46));
        for (let m = 1; m < nm; m++) {
          P.box(timberTone, timberOpts, 0.032, winH, 0.032, a + ((b - a) / nm) * m, winY + winH / 2, fz - 0.005);
        }
      }
    }
    /* 格子手摺 -- the lattice balustrade on the cantilevered edge.  A plain
     * baluster rail is a Western railing; this one is a fine timber grille. */
    const railH = winY + 0.78;
    const railZ = -overhang - 0.05;
    P.box(timberTone, timberOpts, width + sideEave, 0.07, 0.085, 0, railH, railZ);
    P.box(timberTone, timberOpts, width + sideEave, 0.05, 0.07, 0, winY + 0.12, railZ);
    if (!lod) {
      P.add(battenGeometry({
        x0: -width / 2, x1: width / 2, y0: winY + 0.14, y1: railH - 0.035, z: railZ - 0.018,
        face: 0.028, deep: 0.032, pitch: 0.088,
      }), timberTone, timberOpts);
    }
  } else {
    // single storey: a plain plaster frieze between the hisashi and the eave
    bandedWall(P, {
      x0: -width / 2 + postD * 0.4, x1: width / 2 - postD * 0.4,
      yBot: hisashiY + 0.06, yTop: eaveY - 0.16, gaps: null,
      z: wallZ, thick: 0.11, color: plasterTone, opts: O.plaster,
    });
  }

  /* ------------------------------------------------------------------ *
   * The roof.  切妻造桟瓦葺, ridge PARALLEL to the street.  むくり, never
   * 反り: a machiya roof bows CONVEX and a temple roof concave, and getting
   * that backwards is the commonest error in the genre.
   * ------------------------------------------------------------------ */
  {
    const g = gableRoof({
      w: Math.max(0.3, width + sideEave * 2 - eaveOver * 2), d: roofD,
      pitch: roofPitch, eave: eaveOver, material: roofMaterial,
      mukuri: opt.mukuri ?? 0.032, sori: 0, ridgeCourses: opt.ridgeCourses ?? 3,
      y: eaveY, ridgeAlongX: true, gableEnd: opt.gableEnd ?? true,
    });
    P.many(moveZ(g.parts, roofCenterZ));
    P.box(PAL.tileRidge, O.tile, width + sideEave * 2, 0.098, 0.06,
      0, eaveY - 0.052, -overhang - eaveOver + 0.04);
    if (!lod) {
      /* 垂木 -- the exposed rafters.  Both plans require the soffit to show
       * them and the roof boarding, and it is the difference between a roof
       * that is carried and a roof that is glued on. */
      const rd = eaveOver + overhang;
      const rf = rafters({
        w: width + sideEave * 2 - 0.06, depth: rd, y: eaveY - 0.02,
        spacing: 0.32, size: 0.072, color: PAL.timberWarm, pitch: -roofPitch, z: 0,
      });
      const fascia = rf.pop();                      // 茅負 -- re-seated at the rafter tips
      fascia.geometry.translate(0, -rd * 0.5 * roofPitch - 0.10, 0);
      rf.push(fascia);
      P.many(flipZ(rf));
      P.add(beam(0, eaveY - 0.075, -0.01, 0, eaveY - 0.075 - rd * roofPitch, -rd,
        width + sideEave * 2 - 0.06, 0.03), PAL.timberPale, O.timber);
    }
  }

  /* The blocks behind.  A deep plot carries several lower roof volumes rather
   * than one enormous ridge; these are cheap because they are only ever seen
   * from above or across a courtyard. */
  if (depth > frontBlock + 1.2) {
    const rear = depth - frontBlock;
    const nRear = Math.max(1, Math.ceil(rear / 9));
    const rd = rear / nRear;
    for (let i = 0; i < nRear; i++) {
      const z0 = frontBlock + rd * i;
      const ey = eaveY - 0.85 - i * 0.25;
      const rg = gableRoof({
        w: Math.max(0.3, width + sideEave * 2 - 1.0), d: rd, pitch: 0.36, eave: 0.5,
        material: roofMaterial, mukuri: 0, sori: 0, ridgeCourses: 2,
        y: ey, ridgeAlongX: true, gableEnd: false,
      });
      P.many(moveZ(rg.parts, z0 + rd / 2));
      P.box(plasterTone, O.plaster, width, Math.max(0.4, ey - plinthBot), rd,
        0, (plinthBot + ey) / 2, z0 + rd / 2);
      if (i === 0 && R.chance(0.55)) {
        /* 火袋 / 煙出し -- the smoke vent over the 走り end of the toriniwa.  A
         * genuinely Kyoto roof feature, and it breaks the rear silhouette. */
        const mx = entryX * 0.8;
        const my = ey + ((rd + 1.0) / 2) * 0.36;
        P.box(plasterTone, O.plaster, 1.10, 0.50, 1.00, mx, my + 0.25, z0 + rd * 0.42);
        P.many(moveZ(gableRoof({
          w: 0.86, d: 1.00, pitch: 0.40, eave: 0.24, material: roofMaterial,
          mukuri: 0, ridgeCourses: 1, y: my + 0.50, ridgeAlongX: true, gableEnd: true,
        }).parts, z0 + rd * 0.42));
      }
    }
  }

  /* 卯建 -- the party-line fire wall.  Rarer in Kyoto than in Mino, but
   * present.  Under a tenth of a row, and never twice running. */
  if (opt.udatsu) {
    for (const s of [-1, 1]) {
      const uh = ridgeY - eaveY + 0.6;
      P.box(plasterTone, O.plaster, 0.30, uh, roofD * 0.5,
        s * (width / 2 + 0.03), eaveY + uh / 2 - 0.15, roofCenterZ * 0.75);
      P.box(PAL.tileRidge, O.tile, 0.44, 0.11, roofD * 0.54,
        s * (width / 2 + 0.03), eaveY + uh - 0.09, roofCenterZ * 0.75);
    }
  }

  /* ------------------------------------------------------------------ *
   * The 犬走り strip and what stands on it.
   * ------------------------------------------------------------------ */
  let frontProj = Math.max(degoshiDepth, overhang);
  /* The fender runs between the openings, never across one: a door has to
   * open and a shop mouth has to be walked into. */
  const gapRuns = [];
  {
    let run = null;
    for (let i = 0; i < nBays; i++) {
      const a = -width / 2 + bayW * i;
      if (deepBays.has(i)) { run = null; continue; }
      if (run) run[1] = a + bayW;
      else gapRuns.push(run = [a, a + bayW]);
    }
    for (const r of gapRuns) {
      if (r[0] > -width / 2 + 1e-3) r[0] += 0.05;
      if (r[1] < width / 2 - 1e-3) r[1] -= 0.05;
    }
  }

  if (inuyarai) {
    // broken at the entrance, because the door has to open
    const soot = R.chance(0.5);
    for (const [a, b] of gapRuns) {
      if (b - a < 0.45) continue;
      const g = inuyaraiGeometry({
        length: b - a, height: 0.80, project: 0.30,
        stave: lod ? 0.13 : 0.062, arcSegs: lod ? 2 : 3,
      });
      g.translate((a + b) / 2, sillY - 0.16, -0.03 - degoshiDepth);
      // Gion's are near-black with soot and age; a fresh one is straw-yellow
      /* Fresh bamboo is pale straw; a weathered Gion one is near-black with
       * soot and oil, and the trade sources say so.  Model both, nothing in
       * between -- a mid-grey inuyarai reads as a plastic gutter. */
      P.add(g, soot ? PAL.timber : PAL.bambooCulmPale, soot ? O.timberDeep : O.timber);
      const prof = arcProfile(0, 0.80, -0.30, 0, 0.90, 3);
      for (const j of [0, 2, 3]) {
        P.box(PAL.timberDark, O.timberDeep, b - a, 0.030, 0.030,
          (a + b) / 2, sillY - 0.16 + prof[j][1], -0.03 - degoshiDepth + prof[j][0] - 0.016);
      }
    }
    frontProj = Math.max(frontProj, degoshiDepth + 0.33);
  }

  if (komayose) {
    const so = 0.38 + degoshiDepth;
    for (const [a, b] of gapRuns) {
      komayoseRun(P, {
        x0: a, x1: b, y: sillY - 0.12, standoff: so,
        color: isBengara ? PAL.bengaraDeep : PAL.timberDark, opts: timberOpts,
      });
    }
    frontProj = Math.max(frontProj, so + 0.10);
  }

  /* 袖壁 -- the short plastered return wall at the frontage edge, tile-capped. */
  if (opt.sodekabe ?? R.chance(0.16)) {
    const s = R.sign();
    const sp = 0.52;
    P.box(PAL.plasterDark, O.plaster, 0.14, hisashiY - sillY - 0.05, sp,
      s * (width / 2 - 0.05), (sillY + hisashiY - 0.05) / 2, -sp / 2);
    P.box(PAL.tileRidge, O.tile, 0.24, 0.09, sp + 0.10,
      s * (width / 2 - 0.05), hisashiY - 0.01, -sp / 2 - 0.03);
    frontProj = Math.max(frontProj, sp);
  }

  /* ------------------------------------------------------------------ *
   * Cloth, paper and type -- the only textured things on the building.
   * An ochaya gets NONE of it except the lanterns and a 0.12 x 0.30 m
   * nameplate: the absence of commercial signage is the strongest cue there
   * is, and the plans enforce it.
   * ------------------------------------------------------------------ */
  const M = trs(x, base, z, 0, ry, 0);

  if (opt.noren) {
    /* 暖簾.  Built as `panels` SEPARATE leaves with a real 25 mm gap between
     * them, each carrying its own slice of the map -- a single quad relying on
     * the texture's own 3-pixel splits loses them to the mip chain by about
     * four metres and the curtain reads as one solid painted board.  The gap
     * is also what lets it read as cloth when it lifts. */
    const spec = typeof opt.noren === 'string' ? { text: opt.noren } : opt.noren;
    const panels = clamp(spec.panels ?? 3, 1, 5);
    const top = hisashiY - 0.40;
    const nh = clamp(top - 1.62, 1.05, 1.50);
    const totalW = clamp(bayW - 0.12, 0.6, 2.4);
    const gapW = 0.025;
    const pw = (totalW - gapW * (panels - 1)) / panels;
    const gapU = 0.006;                                   // norenTex's own split
    const pu = (1 - gapU * (panels - 1)) / panels;
    const leaves = [];
    for (let i = 0; i < panels; i++) {
      const g = new THREE.PlaneGeometry(pw, nh);
      const uv = g.attributes.uv;
      const u0 = i * (pu + gapU);
      for (let v = 0; v < uv.count; v++) uv.setX(v, u0 + uv.getX(v) * pu);
      uv.needsUpdate = true;
      g.rotateY(Math.PI);
      /* Leaf order, and it is a real trap: the pi flip that turns the quad to
       * face the street also reverses local x against u, so the leaves have to
       * be laid out from +x down.  Written the obvious way, a three-character
       * noren renders its name backwards -- 御土産 becomes 産土御 -- and every
       * glyph is individually correct, which is what makes it hard to see. */
      leaves.push({
        geometry: g,
        matrix: trs(entryX + totalW / 2 - (i * (pw + gapW) + pw / 2), top - nh / 2, -0.12),
      });
    }
    const merged = bake(leaves);
    for (const l of leaves) l.geometry.dispose();
    if (merged) {
      const cloth = spec.cloth ?? PAL.norenIndigo;
      const tc = spec.textColor ?? PAL.norenCream;
      const tex = cached(`noren|${spec.text}|${cloth}|${tc}|${panels}|${spec.crest || ''}`,
        () => norenTex(spec.text || '', { cloth, panels, textColor: tc, crest: spec.crest ?? null }));
      texMesh(ctx, merged, tex, M,
        { transparent: true, alphaTest: 0.42, bands: 3, tint: TINT.cool, sway: 0.013 });
    }
  }

  if (opt.signboard) {
    const spec = typeof opt.signboard === 'string' ? { text: opt.signboard } : opt.signboard;
    const vert = spec.vertical ?? true;
    const sw = vert ? 0.30 : 0.90, shh = vert ? 1.02 : 0.30;
    const sx = clamp(entryX + (entryBay === 0 ? bayW * 0.74 : -bayW * 0.74), -width / 2 + 0.3, width / 2 - 0.3);
    const sy = clamp(lintelY - shh / 2 - 0.12, koshiY + shh / 2, hisashiY - 0.50);
    P.box(PAL.timberDark, O.timberDeep, sw + 0.06, shh + 0.06, 0.05, sx, sy, -0.075);
    const g = new THREE.PlaneGeometry(sw, shh);
    g.rotateY(Math.PI);
    g.translate(sx, sy, -0.105);
    const board = spec.board ?? PAL.timberPale;
    const tcol = spec.textColor ?? PAL.black;
    const brush = spec.brush ?? true;
    const tex = cached(`kanban|${vert}|${spec.text}|${board}|${tcol}|${brush}|${spec.sub || ''}`, () => (vert
      ? verticalSign(spec.text || '', { board, textColor: tcol, brush, sub: spec.sub ?? null })
      : woodenSign(spec.text || '', { board, textColor: tcol, brush })));
    texMesh(ctx, g, tex, M, { bands: 3, tint: TINT.warm });
  }

  if (opt.nameplate) {
    // 表札 -- 120 x 300 mm dark timber, incised, beside the door at ~1.6 m
    const g = new THREE.PlaneGeometry(0.12, 0.30);
    g.rotateY(Math.PI);
    g.translate(entryX + entryHalf + 0.14, sillY + 1.55, -0.075);
    texMesh(ctx, g, cached('hyousatsu|' + opt.nameplate, () => woodenSign(String(opt.nameplate), {
      board: 0x3a2f28, textColor: PAL.paper, vertical: true, w: 128, h: 320,
    })), M, { bands: 3, tint: TINT.warm });
  }

  if (wantSudare) {
    /* 簾 -- hung 年中 from a すだれ掛 built into the eave, one to a bay,
     * covering the top of the 掃き出し窓.  ARCH 3.10.  The gap under a sudare
     * is what makes an ochaya look occupied rather than shuttered. */
    const full = clamp(eaveY - 0.26 - (upperY + 0.92), 1.05, 2.20);
    const parts = [];
    for (let i = 0; i < nBays; i++) {
      const d = full * R.range(0.90, 1.0);       // 90-100 % drop, never fully down
      const g = new THREE.PlaneGeometry(Math.min(CLEAR_BAY, bayW - 0.10), d);
      g.rotateY(Math.PI);
      parts.push({ geometry: g, matrix: trs(bayCx(i), eaveY - 0.26 - d / 2, -overhang - 0.16) });
    }
    const merged = bake(parts);
    for (const p of parts) p.geometry.dispose();
    if (merged) {
      texMesh(ctx, merged, sudareTex(), M,
        { bands: 3, tint: TINT.warm, side: THREE.DoubleSide, sway: 0.006 });
    }
    P.box(timberTone, timberOpts, width + sideEave, 0.055, 0.055, 0, eaveY - 0.21, -overhang - 0.16);
  }

  /* 提灯 -- 9号長型, hung under the 通り庇 at 2.4-2.7 m.  Central prop
   * batcher: a district that news up its own lantern costs a draw call. */
  const lanterns = opt.lanterns ?? (style === 'ochaya' ? 2 : 0);
  for (let i = 0; i < lanterns; i++) {
    const lx = lanterns === 1 ? entryX : entryX + (i - (lanterns - 1) / 2) * (bayW * 0.55);
    const w = toWorld(lx, -hisashiDepth * 0.5);
    ctx.prop({
      kind: 'chochin', x: w.x, z: w.z, y: base + Math.min(hisashiY - 0.15, sillY + 2.70),
      rot: ry, scale: 1, variant: style === 'ochaya' ? 1 : 0,
    });
  }
  /* 鍾馗さん -- on the hisashi ridge above the door, facing the neighbour. */
  if (R.chance(0.20)) {
    const w = toWorld(entryX, -0.12);
    ctx.prop({
      kind: 'shoki', x: w.x, z: w.z, y: base + hisashiY + hisRise + 0.05,
      rot: ry + (R.chance(0.5) ? 1 : -1) * Math.PI * 0.5, scale: 1,
    });
  }

  /* ------------------------------------------------------------------ *
   * The facade dressing hook, for shopfront.js.  It runs before the bake so
   * a shopfront's display goes into the same merged mesh.
   * ------------------------------------------------------------------ */
  const frame = {
    P, R, width, depth, nBays, bayW, bayCx, entryBay, entryX, entryHalf,
    sillY, koshiY, kamoiY, lintelY, hisashiY, eaveY, upperY, entryFloorY,
    FRONT, ENTRY_REC, base, M, toWorld, timberTone, timberOpts, plasterTone,
    wainCol, hisashiDepth, hisRise, lod, postD, degoshiDepth, style, ry, x, z,
    SHADE: O, latticeKind, latticeColor, latticeOpts,
    openSpans, openBays, bays, gapRuns, sideEave,
  };
  if (typeof opt.dress === 'function') {
    const extra = opt.dress(frame);
    if (extra && extra.frontProj) frontProj = Math.max(frontProj, extra.frontProj);
  }

  /* ------------------------------------------------------------------ *
   * Hand the whole thing to the baker, once.
   * ------------------------------------------------------------------ */
  const b = ctx.baker(opt.baker || 'machiya');
  const tri0 = b.triangles;
  for (const p of P.list) {
    b.add(p.geometry, M, p.color, p.opts);
    p.geometry.dispose();
  }
  const triangles = b.triangles - tri0;

  /* ------------------------------------------------------------------ *
   * Collision.  ONE box for the volume and ONE for the frontage.  Collide
   * the volume, not the detail: nobody walks into a lattice batten.
   * ------------------------------------------------------------------ */
  const centre = toWorld(0, depth / 2);
  ctx.collideRot(centre.x, centre.z, width, depth, ry, base + ridgeY);
  if (frontProj > 0.10) {
    const f = toWorld(0, -frontProj / 2);
    ctx.collideRot(f.x, f.z, width, frontProj, ry, base + sillY + 0.90);
  }

  const facade = toWorld(0, 0);
  const entry = toWorld(entryX, -0.26);
  /* `ctx.stats.buildings` is the DISTRICT's to increment -- it knows what it
   * meant to place and we do not want to count a shopfront twice. */

  return {
    width, depth, bays: nBays, bayWidth: bayW, baySpans: bays,
    eaveY: base + eaveY, ridgeY: base + ridgeY, hisashiY: base + hisashiY,
    sillY: base + sillY, baseY: base,
    facadeZ: facade.z, facade, center: centre, entry, entryBay,
    style, floors, triangles, frontProj, ry, x, z,
  };
}

/* ------------------------------------------------------------------ *
 * A terrace.  Walk a line, snap each frontage to the ken, seat each unit on
 * its own ground, and never repeat a style twice running.
 *
 * ★ Heights are deliberately NOT randomised.  The Gion citation is explicit
 * -- 「隣り合う庇は同高で統一感がある」, adjacent hisashi at the same height --
 * and the ridge line steps by at most 0.4 m.  `ridgeJitter` defaults to zero
 * and is capped at the plan's tolerance.
 * ------------------------------------------------------------------ */
export function makeMachiyaRow(ctx, {
  x0, z0, x1, z1, ry, depth = 8 * KEN, seed = 1,
  styles = ['machiya', 'shop', 'residence'], bayChoices = [2, 2, 2, 2, 3, 3, 3, 4],
  ridgeJitter = 0, each = null, ...rest
} = {}) {
  const R = rngKit((seed >>> 0) || 1);
  const dx = x1 - x0, dz = z1 - z0;
  const run = Math.hypot(dx, dz);
  if (run < KEN) return [];
  const ux = dx / run, uz = dz / run;
  const jit = clamp(ridgeJitter, 0, 0.4);
  const out = [];
  let s = 0, prev = null;
  while (run - s > 1.4 * KEN) {
    const w = Math.min(R.pick(bayChoices) * KEN, run - s);
    const cx = x0 + ux * (s + w / 2), cz = z0 + uz * (s + w / 2);
    const style = R.pickNot(styles, prev);
    prev = style;
    const o = {
      x: cx, z: cz, ry, width: w, depth, style,
      seed: (seed * 7919 + out.length * 131 + 17) >>> 0,
      udatsu: R.chance(0.07),
      ...rest, ...(each ? each(out.length, style) : {}),
    };
    if (jit && o.eaveH == null) {
      const S = STYLE[o.style] || STYLE.machiya;
      o.eaveH = (S.eaveH ?? EAVE_H[o.floors ?? S.floors] ?? 4.80) + R.gauss() * jit;
    }
    out.push(makeMachiya(ctx, o));
    s += w;
  }
  return out;
}

export {
  KOSHI, STYLE, EAVE_H, HISASHI_H, O as SHADE,
  Parts, bandedWall, latticePanel, battenGeometry, texMesh, bx, inuyaraiGeometry,
};
