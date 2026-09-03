import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { rngKit, trs } from '../core/util.js';
import { SHADE } from '../kit/machiya.js';
import { makeShopfront, pickTrade } from '../kit/shopfront.js';
import { layoutPlots, atStreet } from './plots.js';
import {
  planTerrace, layFacing, zakaFront, lanternRun, makeNudger, toWorldOf,
  assignShops, dressPavement, sideLane, streetDressing, addInteractables,
} from './ninenzaka.js';

/* ==================================================================== *
 * 産寧坂 / 三年坂 -- Sannenzaka.
 *
 * The second half of the same frontage, and the steeper half.  The street kit
 * -- the terrace, `zakaFront`, the displays, the cedar hydrant boxes, the lane
 * mouths -- is imported from `ninenzaka.js` rather than copied: the two slopes
 * are one continuous run of 重伝建 townscape with one vocabulary, and the only
 * things that differ are the grade, the width and what is being sold.
 *
 * ------------------------------------------------------------ THE STREET
 *
 * 202 m of arc from the Ninenzaka junction at (142.0, 61.9, 69.7) up to the
 * Kiyomizu-zaka fork at (142.3, 260.4, 81.4).  5.43 % overall, **7.4 m face to
 * face** -- a metre and a bit wider than Ninenzaka, which is why the frontage
 * has to work harder -- and a flight of **46 steps over 32 m** at t = 0.80-0.98.
 * That flight alone is +25 %, treads of 0.70 m against risers of 0.14 m, and it
 * is already in the height field: `streets.js` draws the nosings, the terrain
 * quantises the height, and anything modelled on top of it would float.
 *
 * The consequence for the frontage is the thing worth getting right.  Across a
 * four-ken shopfront on that flight the ground falls 1.5 m, so every building
 * up there seats on its low corner and grows a metre and a half of plinth --
 * which is the stepped line of stone bases in every photograph ever taken of
 * this street, and it costs nothing but seating the buildings honestly.
 *
 * ---------------------------------------------------------- THE FRONTAGE
 *
 * STREET.md 1.6, in walk order up from Ninenzaka.  The trade weights are the
 * kit's `sannenzaka` mix -- more ceramics and komono than Ninenzaka, less
 * coffee -- and the documented individuals are:
 *
 *   瓢箪屋              at the corner where the steps begin: 1,100 handmade
 *                       gourds, the 千成瓢箪 hung on RED CORDS in the window
 *   七味家本舗          on the 清水坂 corner since 1655, pyramids of spice in
 *                       an open front under a big carved signboard
 *   おちゃのこさいさい  ~1,800 dried chillies at the entrance, woven baskets
 *   産寧坂まるん        a wall of glass candy jars, partway up the steps
 *   松韻堂              tiered stands of 清水焼 out on the frontage
 *   本家西尾八ッ橋      a low-eaved OPEN-type machiya: the sweets go straight
 *                       onto the stone with no glass between
 *   梅園                two-storey timber, noren and lattice, and a case of
 *                       食品サンプル replicas outside the door
 *   奥丹清水            a deep site behind a gate, stream-fed garden
 *   明保野亭            a 数寄屋 entrance set back behind a low bamboo gate
 *   興正寺霊山本廟      a temple precinct, and the one non-retail frontage
 *
 * **No pickle barrels**, **no poles** (第5期, 2004-08), and six vending
 * machines, which is what OSM counts and which the ordinance colours rather
 * than forbids.
 * ==================================================================== */

export const id = 'sannenzaka';

const O = SHADE;
const T_DEEP = O.timberDeep;
const T_PALE = O.plaster;
const T_STONE = O.stone;
const T_TILE = O.tile;

function boxGeo(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(Math.max(2e-3, w), Math.max(2e-3, h), Math.max(2e-3, d));
  g.translate(x, y, z);
  return g;
}

/* ------------------------------------------------------------------ *
 * 興正寺霊山本廟 -- the one frontage on the slope that sells nothing.
 *
 * A 築地塀 on a stone base with its tile cap, broken by a roofed gate, and the
 * precinct behind it standing above the street.  Non-retail is 5 % of this
 * street's frontage in STREET.md's own weights, and it is worth spending on:
 * two hundred metres of unbroken shopfront is a corridor, and this is the one
 * place the eye is allowed to rest.
 * ------------------------------------------------------------------ */
function templeFrontage(ctx, p, B, rng) {
  const bk = ctx.baker(B);
  const y = p.yLow;
  const W = trs(p.x, y, p.z, 0, p.ry, 0);
  const w = p.width, gate = 2.2;
  const rise = Math.max(0.25, p.terraceTop - p.yLow);

  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -w / 2 : gate / 2;
    const x1 = s < 0 ? -gate / 2 : w / 2;
    if (x1 - x0 < 0.3) continue;
    const cx = (x0 + x1) / 2;
    bk.add(boxGeo(x1 - x0, rise + 0.5, 0.42, cx, (rise - 0.5) / 2 + 0.25, 0.20), W, PAL.stoneWall, T_STONE);
    bk.add(boxGeo(x1 - x0, 1.55, 0.30, cx, rise + 0.78, 0.20), W, PAL.plaster, T_PALE);
    // 定規筋 -- the horizontal white lines a 築地塀 carries
    for (let k = 0; k < 3; k++) {
      bk.add(boxGeo(x1 - x0, 0.045, 0.34, cx, rise + 0.42 + k * 0.34, 0.20), W, PAL.plasterGrey, T_PALE);
    }
    bk.add(boxGeo(x1 - x0 + 0.12, 0.11, 0.52, cx, rise + 1.60, 0.20), W, PAL.tileRidge, T_TILE);
    const wc = toWorldOf(p, cx, -0.20);
    ctx.collideRot(wc.x, wc.z, x1 - x0, 0.55, p.ry, y + rise + 1.7);
  }
  // the gate: two posts, a lintel, a tiled roof over it
  for (const s of [-1, 1]) {
    bk.add(boxGeo(0.24, rise + 2.55, 0.24, s * gate / 2, (rise + 2.55) / 2, 0.20), W, PAL.timberDark, T_DEEP);
  }
  bk.add(boxGeo(gate + 0.5, 0.24, 0.28, 0, rise + 2.42, 0.20), W, PAL.timberDark, T_DEEP);
  bk.add(boxGeo(gate + 1.5, 0.12, 1.05, 0, rise + 2.70, 0.16), W, PAL.tileRoof, T_TILE);
  bk.add(boxGeo(gate + 1.6, 0.10, 0.11, 0, rise + 2.78, -0.32), W, PAL.tileRidge, T_TILE);
  // the ground inside, and a stone stair up through the gate
  const n = Math.max(1, Math.round(rise / 0.17));
  for (let k = 0; k < n; k++) {
    const h = rise * (k + 1) / n;
    bk.add(boxGeo(gate - 0.2, h + 0.14, 0.34, 0, h / 2 - 0.07, 0.02 - 0.34 * (n - k - 0.5)),
      W, PAL.stone, T_STONE);
  }
  for (let k = 0; k < 4; k++) {
    bk.add(boxGeo(w * 0.9, 0.10, 2.2, 0, rise + 0.02, 1.4 + k * 2.2), W,
      k % 2 ? PAL.gravel : PAL.gravelDark, T_PALE);
  }
  const t1 = toWorldOf(p, -w * 0.24, -3.4);
  ctx.tree({ kind: 'pine', x: t1.x, z: t1.z, y: ctx.groundAt(t1.x, t1.z),
    scale: rng.range(0.9, 1.2), seed: rng.int(0, 9999) });
  const t2 = toWorldOf(p, w * 0.30, -5.6);
  ctx.tree({ kind: 'maple', x: t2.x, z: t2.z, y: ctx.groundAt(t2.x, t2.z),
    scale: rng.range(0.8, 1.05), seed: rng.int(0, 9999) });
  const lz = toWorldOf(p, w * 0.34, -1.1);
  ctx.prop({ kind: 'pathMarker', x: lz.x, z: lz.z, y: ctx.groundAt(lz.x, lz.z),
    rot: p.ry, variant: 1, seed: 4 });
  return { hisashiY: y + rise + 2.7, sillY: y + rise, baseY: y, ry: p.ry, width: w };
}

/* ==================================================================== *
 * The frontage, in walk order UP from Ninenzaka.  STREET.md 1.6.
 * ==================================================================== */

const SAN_EAST = [
  /* 総本家ゆどうふ奥丹清水, founded 1635 -- a deep site behind a gate with a
   * stream-fed garden over it.  Not a shopfront: a gate. */
  { t: 0.05, kind: 'tofu', open: 'closed', floors: 2, court: true, hero: true,
    noren: { text: '湯どうふ', cloth: PAL.norenIndigo, textColor: PAL.norenCream, panels: 3 },
    sign: { text: '湯どうふ', board: 0x2a2228, textColor: PAL.gold, vertical: true, brush: false } },
  /* おうすの里: sells nothing online, so the in-store display IS the business --
   * open pots of umeboshi and a tasting dish at the front. */
  { t: 0.11, kind: 'pickles', name: 'おうすの里' },
  { t: 0.17, kind: 'souvenir' },
  { t: 0.23, hero: true, display: 'soap', openBays: 2, floors: 2,
    noren: { text: '石鹸', cloth: PAL.norenCream, textColor: PAL.black, panels: 3 },
    sign: { text: '京こんにゃく', board: PAL.timberPale, textColor: PAL.black, vertical: true, brush: true } },
  { t: 0.29, kind: 'wagashi' },
  { t: 0.35, hero: true, display: 'cloth', openBays: 2, floors: 2,
    noren: { text: '着物', cloth: PAL.norenPurple, textColor: PAL.norenCream, panels: 5 },
    sign: { text: '貸衣裳', board: PAL.timberPale, textColor: PAL.black, vertical: true, brush: true } },
  { t: 0.41, kind: 'crafts', name: '忘我亭' },
  /* 甘党茶屋 京梅園, est. 1927: 和風な店構え, two storeys of timber with noren
   * and lattice, and 食品サンプル replicas in a case outside the door. */
  { t: 0.47, kind: 'matcha', name: '梅園', floors: 2 },
  { t: 0.53, kind: 'matcha' },
  /* 清水三年坂美術館 -- a discreet modern museum frontage inserted into the row. */
  { t: 0.59, hero: true, open: 'closed', floors: 2, style: 'machiya',
    timber: PAL.timberDark, plaster: PAL.plaster, lattice: 'fine', noren: null,
    sign: { text: '美術館', board: 0x2a2228, textColor: PAL.gold, vertical: true, brush: false } },
  { t: 0.65, kind: 'soba', name: '有喜屋', floors: 2 },
  { t: 0.71, kind: 'incense', name: '松栄堂' },
  { t: 0.76, kind: 'crafts', name: 'くろちく' },
  /* 本家西尾八ッ橋 産寧坂店 -- 「通りから直接お菓子をご覧いただける、オープン
   * タイプのお店」: the sweets go straight onto the stone, no glass at all. */
  { t: 0.82, hero: true, display: 'trays', openBays: 2, floors: 1.5, proj: 0.80,
    noren: { text: '八ツ橋', cloth: PAL.norenCream, textColor: PAL.black, panels: 5 },
    sign: { text: '本家', board: PAL.timberPale, textColor: PAL.black, vertical: true, brush: true } },
  /* 産寧坂まるん, partway up the steps -- the wall of candy jars. */
  { t: 0.87, hero: true, display: 'candy', openBays: 2, floors: 2, proj: 0.52, noren: null,
    sign: { text: '京あめ', board: PAL.timberPale, textColor: PAL.black, vertical: true, brush: true } },
  /* おちゃのこさいさい 産寧坂本店 -- about 1,800 dried chillies at the door. */
  { t: 0.93, hero: true, display: 'chilli', openBays: 2, floors: 1.5, proj: 0.72,
    noren: { text: '七味唐がらし', cloth: PAL.norenIndigo, textColor: PAL.norenCream, panels: 5 },
    sign: { text: '唐がらし', board: PAL.timberPale, textColor: PAL.black, vertical: true, brush: true } },
  /* 七味家本舗 -- on this corner since 1655, and the "you are here" of the
   * whole route.  Open front, pyramids of spice, white-and-indigo noren, and a
   * big carved horizontal signboard over the opening. */
  { t: 0.985, hero: true, display: 'spice', openBays: 2, floors: 1.5, proj: 0.74,
    timber: PAL.timberDark, plaster: PAL.plasterOchre, roof: 'tileOld',
    noren: { text: '七味', cloth: PAL.norenIndigo, textColor: PAL.paper, panels: 5 },
    sign: { text: '七味家本舗', board: PAL.timberPale, textColor: PAL.black, vertical: true, brush: true },
    corner: true },
];

const SAN_WEST = [
  /* 京だんご 藤菜美 三年坂本店 -- dango grilled to order in view of the street. */
  { t: 0.04, hero: true, display: 'grill', openBays: 1, floors: 2,
    noren: { text: 'だんご', cloth: PAL.norenRed, textColor: PAL.norenCream, panels: 5 },
    sign: { text: '京だんご', board: PAL.timberPale, textColor: PAL.black, vertical: true, brush: true } },
  { t: 0.10, kind: 'pickles' },
  { t: 0.16, kind: 'wagashi', name: '松寿軒' },
  { t: 0.22, kind: 'restaurant', floors: 2 },
  { t: 0.28, kind: 'wagashi' },
  /* 雲ノ茶 -- a round window onto the slope, and a dry garden inside it. */
  { t: 0.34, hero: true, roundWindow: true, open: 'closed', floors: 2,
    timber: PAL.timberDark, plaster: PAL.plaster, lattice: 'fine',
    noren: { text: '茶', cloth: PAL.norenGreen, textColor: PAL.norenCream, panels: 3 },
    sign: null },
  { t: 0.40, kind: 'souvenir', name: '京白川' },
  { t: 0.46, kind: 'yatsuhashi', name: '井筒', floors: 2 },
  /* よーじや: the mark is a face, and it is a trademark.  The form is a
   * traditional two-storey machiya with a plain noren -- STREET.md 7.2. */
  { t: 0.52, kind: 'komono', floors: 2, signboard: false },
  { t: 0.58, kind: 'souvenir', name: '角桑' },
  { t: 0.64, kind: 'restaurant', name: '三年庵', floors: 2 },
  { t: 0.70, kind: 'souvenir', name: '丹羽' },
  { t: 0.75, kind: 'coffee' },
  /* 松韻堂 -- 清水焼 hand-painted by women artists, with tiered display stands
   * documented as standing out front. */
  { t: 0.80, hero: true, display: 'ceramic', openBays: 2, floors: 1.5, proj: 0.74,
    noren: { text: '清水焼', cloth: PAL.norenCream, textColor: PAL.black, panels: 3 },
    sign: { text: '清水焼窯元', board: PAL.timberPale, textColor: PAL.black, vertical: true, brush: true } },
  { t: 0.855, temple: true },
  { t: 0.90, kind: 'coffee', name: 'きよさんぽ' },
  /* 明保野亭 -- a 数寄屋 entrance set back behind a low gate, with a lantern. */
  { t: 0.945, hero: true, open: 'closed', court: true, floors: 2, style: 'machiya',
    timber: PAL.timberDark, plaster: PAL.plasterOchre, lattice: 'senbon',
    noren: { text: '御料理', cloth: PAL.norenIndigo, textColor: PAL.norenCream, panels: 5 },
    sign: { text: '明保野亭', board: 0x2a2228, textColor: PAL.gold, vertical: true, brush: false } },
  /* 瓢箪屋, Tenpo-era, seventh generation, at the corner where the stone steps
   * begin: 1,100+ handmade gourds and the 千成瓢箪 hung on red cords. */
  { t: 0.98, hero: true, display: 'gourd', openBays: 2, floors: 2, proj: 0.60,
    timber: PAL.timberDark, roof: 'tileOld',
    noren: { text: '瓢', cloth: PAL.norenBrown, textColor: PAL.paperWarm, panels: 3 },
    sign: { text: '瓢箪屋', board: PAL.timberPale, textColor: PAL.black, vertical: true, brush: true } },
];

export function build(ctx) {
  const rng = rngKit(31771);
  const B = 'sannenzaka';
  const c = ctx.getCorridor('sannenzaka');
  if (!c) return {};
  const nudge = makeNudger(ctx);
  const out = { buildings: [], plots: [], shops: 0 };
  const lanterns = [];

  /* ---------------------------------------------------------------- *
   * 1.  The plots.  Two gaps a side: the 轟川跡 lane on the east and the
   *     garden slot beside the temple on the west.
   * ---------------------------------------------------------------- */
  const SKIP = { '-1': [[0.300, 0.332], [0.680, 0.712]], '1': [[0.240, 0.272], [0.560, 0.592]] };
  const OPT = { '-1': { base: 0.32, taper: 11 }, '1': { base: 0.36, taper: 11 } };
  const sides = {};
  for (const side of [-1, 1]) {
    sides[side] = layoutPlots({
      street: 'sannenzaka', side, from: 0.02, to: 0.99,
      mix: 'shop', gap: 0.05, seed: 811 + side, skip: SKIP[String(side)],
    });
    for (const p of sides[side]) p.depth = rng.range(9.5, 16.5);
  }

  /* 2.  Made ground.  Every terrace on both sides before any building. */
  for (const side of [-1, 1]) {
    for (const p of sides[side]) planTerrace(ctx, c, p, p.depth, OPT[String(side)]);
  }
  for (const side of [-1, 1]) {
    layFacing(ctx, c, side, { from: 0.01, to: 0.995, baker: B, seed: 61 + side, opts: OPT[String(side)] });
  }

  /* ---------------------------------------------------------------- *
   * 3.  The frontage.
   * ---------------------------------------------------------------- */
  for (const side of [-1, 1]) {
    const plots = sides[side];
    const claimed = assignShops(plots, side < 0 ? SAN_EAST : SAN_WEST);
    out.plots.push(...plots);

    plots.forEach((p, i) => {
      const spec = claimed.get(i) || {};
      const seed = (99991 * (i + 5) + (side > 0 ? 613 : 89)) >>> 0;
      /* On the 46-step flight the terrace is only 0.32 m but the fall across a
       * four-ken frontage is a metre and a half, so the seat drops and the
       * plinth grows.  What decides the frontage type is where the FLOOR is. */
      const raised = (p.terraceTop - p.yLow) > 0.50;
      let b;

      if (spec.temple) {
        b = templeFrontage(ctx, p, B, rng);
        out.buildings.push(b);
        return;
      }

      if (spec.hero || raised) {
        b = zakaFront(ctx, p, {
          kind: spec.kind || (spec.hero ? null : pickTrade('sannenzaka', rng.next())),
          floors: spec.floors ?? (rng.chance(0.44) ? 2 : 1.5),
          timber: spec.timber ?? (rng.chance(0.11) ? PAL.bengaraDeep : rng.chance(0.24) ? PAL.timberMid : PAL.timber),
          plaster: spec.plaster ?? (rng.chance(0.42) ? PAL.plasterOchre : PAL.plasterWarm),
          ...spec,
        }, B, seed);
        if (spec.roundWindow) {
          // built after the shell, into the same baker, in the building's frame
          const bk = ctx.baker(B);
          const M = trs(p.x, b.baseY, p.z, 0, p.ry, 0);
          const r = 0.60, cy = (b.sillY - b.baseY) + 1.30;
          for (let k = 0; k < 16; k++) {
            const a0 = (k / 16) * Math.PI * 2, a1 = ((k + 1) / 16) * Math.PI * 2;
            const mx = (Math.cos(a0) + Math.cos(a1)) / 2 * r;
            const my = (Math.sin(a0) + Math.sin(a1)) / 2 * r;
            const len = Math.hypot(Math.cos(a1) - Math.cos(a0), Math.sin(a1) - Math.sin(a0)) * r;
            const g = new THREE.BoxGeometry(len * 1.14, 0.10, 0.14);
            g.applyMatrix4(new THREE.Matrix4().compose(
              new THREE.Vector3(mx, cy + my, -0.10),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0,
                Math.atan2(Math.sin(a1) - Math.sin(a0), Math.cos(a1) - Math.cos(a0)))),
              new THREE.Vector3(1, 1, 1)
            ));
            bk.add(g, M, PAL.timberDark, T_DEEP);
          }
          const disc = new THREE.CylinderGeometry(r - 0.06, r - 0.06, 0.04, 16);
          disc.rotateX(Math.PI / 2);
          disc.translate(0, cy, -0.02);
          bk.add(disc, M, PAL.shopInterior, O.dark);
        }
      } else {
        b = makeShopfront(ctx, {
          x: p.x, z: p.z, ry: p.ry, width: p.width, depth: p.depth,
          kind: spec.kind || pickTrade('sannenzaka', rng.next()),
          name: spec.name || null, seed, baker: B,
          floors: spec.floors ?? (rng.chance(0.44) ? 2 : 1.5),
          timberTone: rng.chance(0.11) ? PAL.bengaraDeep : rng.chance(0.24) ? PAL.timberMid : PAL.timber,
          plasterTone: rng.chance(0.42) ? PAL.plasterOchre : PAL.plasterWarm,
          roofMaterial: rng.chance(0.26) ? 'tileOld' : 'tile',
          signboard: spec.signboard === false ? false : undefined,
          sodekabe: rng.chance(0.18), udatsu: rng.chance(0.04),
        });
      }

      out.buildings.push(b);
      out.shops++;
      ctx.stats.shopfronts++;

      if (rng.chance(0.30)) {
        for (const k of [-1, 1]) {
          const w = toWorldOf(p, k * Math.min(0.80, p.width * 0.30), -0.55);
          lanterns.push({ x: w.x, z: w.z, y: b.hisashiY - 0.12, ry: p.ry });
          ctx.light({ x: w.x, y: b.hisashiY - 0.32, z: w.z, color: PAL.lanternLit,
            intensity: 0.30, distance: 6 });
        }
      }
      dressPavement(ctx, rng, p, b);
    });
  }

  /* ---------------------------------------------------------------- *
   * 4.  The lanes.  The east one at t = 0.316 is where the 轟川 ran before it
   *     was culverted -- きよさんぽ is described as being by the 轟川跡.
   * ---------------------------------------------------------------- */
  sideLane(ctx, c, -1, 0.316, B, rng, { tree: 'sakura', scale: 1.35 });
  sideLane(ctx, c, -1, 0.696, B, rng, { tree: 'maple', scale: 1.0 });
  sideLane(ctx, c, 1, 0.256, B, rng, { tree: 'sakura', scale: 1.30 });
  sideLane(ctx, c, 1, 0.576, B, rng, { tree: 'shidare', scale: 1.15 });
  {
    // 轟川跡 -- the stone that says where the river was
    const a = atStreet('sannenzaka', 0.322, { side: -1, offset: c.frontage - 1.0 });
    if (a) ctx.prop({ kind: 'pathMarker', x: a.x, z: a.z, y: ctx.groundAt(a.x, a.z),
      rot: a.across, variant: 0, seed: 12 });
  }

  /* 5.  The paving.  Six machines, five hydrant boxes. */
  streetDressing(ctx, c, B, {
    nudge,
    vending: [0.08, 0.21, 0.38, 0.55, 0.69, 0.79],
    hydrants: [0.07, 0.25, 0.44, 0.63, 0.86],
    sakura: [[0.02, 1, 1.0], [0.995, -1, 0.9]],
    manholes: [0.12, 0.33, 0.52, 0.72],
    cat: 0.62,
    seed: 7703,
  });

  /* ---------------------------------------------------------------- *
   * 6.  The junction with 清水坂.
   *
   * 七味家 holds the corner; the 石標 that tells you which way 清水寺 is stands
   * beside it, and a bench sits where the queue for the steps forms.
   * ---------------------------------------------------------------- */
  {
    const a = atStreet('sannenzaka', 0.995, { side: -1, offset: c.frontage - 1.3 });
    if (a) {
      ctx.prop({ kind: 'pathMarker', x: a.x, z: a.z, y: ctx.groundAt(a.x, a.z),
        rot: a.across, variant: 1, seed: 31 });
    }
    const bch = atStreet('sannenzaka', 0.905, { side: 1, offset: c.frontage - 1.0 });
    if (bch) {
      const y = ctx.groundAt(bch.x, bch.z);
      ctx.prop({ kind: 'endai', x: bch.x, z: bch.z, y, rot: bch.across, seed: 32 });
      nudge.at(ctx, { x: bch.x, y: y + 0.6, z: bch.z, w: 1.6, h: 1.0, d: 1.0,
        label: 'rest on the bench' });
    }
  }

  /* 7.  Interactables. */
  addInteractables(ctx, c, nudge, [
    { t: 0.98, side: 1, label: 'touch a gourd', y: 1.7, out: 1.0 },
    { t: 0.985, side: -1, label: 'smell the spice', y: 1.4, out: 1.0 },
    { t: 0.93, side: -1, label: 'smell the chillies', y: 1.5, out: 1.0 },
    { t: 0.87, side: -1, label: 'look at the candy jars', y: 1.6, out: 0.9 },
    { t: 0.82, side: -1, label: 'take a sample', y: 1.3 },
    { t: 0.80, side: 1, label: 'inspect the pottery', y: 1.3 },
    { t: 0.04, side: 1, label: 'watch the dango grill', y: 1.4 },
    { t: 0.47, side: -1, label: 'read the menu', y: 1.4 },
  ]);
  {
    const a = atStreet('sannenzaka', 0.44, { side: 1, offset: c.frontage - 0.5 });
    if (a) {
      const y = ctx.groundAt(a.x, a.z);
      ctx.prop({ kind: 'windChime', x: a.x, z: a.z, y, rot: a.across, seed: 41 });
      nudge.at(ctx, { x: a.x, y: y + 2.2, z: a.z, label: 'ring the wind chime' });
    }
  }

  lanternRun(ctx, lanterns, B);
  return out;
}
