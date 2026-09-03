import * as THREE from 'three';
import { PAL, CERAMIC } from '../core/palette.js';
import { TINT, celTex } from '../core/toon.js';
import { rngKit, clamp, lerp, bake, trs, lathe } from '../core/util.js';
import { lanternTex, verticalSign } from '../core/textures.js';
import { makeMachiya, KEN, SHADE } from '../kit/machiya.js';
import { makeShopfront, pickTrade, SHOP } from '../kit/shopfront.js';
import { layoutPlots, alongStreet, atStreet } from './plots.js';

/* ==================================================================== *
 * 二年坂 / 二寧坂 -- Ninenzaka.
 *
 * The first half of the densest frontage in the world, and the file that
 * carries the **street kit both slopes are built from**: 産寧坂 imports the
 * terrace, the hero frontages and the pavement dressing from here rather than
 * duplicating them, because the two are one continuous run of 重伝建 frontage
 * with one vocabulary and giving them two would be a lie.
 *
 * ------------------------------------------------------------ THE STREET
 *
 * NORTH-SOUTH, 141 m of arc from the Nene-no-michi end at (132.8, -78.9, 63.3)
 * up to the Sannenzaka junction at (142.0, 61.9, 69.7).  4.47 %, **6.1 m face
 * to face**, one flight of **17 steps** at t = 0.60-0.73 -- treads of 0.94 m
 * against risers of 0.13 m.  Those are Kyoto slope-stairs, they are already in
 * the height field, and modelling steps on top of them would put the stone
 * 0.13 m above the ground the walker is standing on.
 *
 * The paving is relocated 京都市電 tram ballast -- granite lifted from the tram
 * bed after 1978, pre-worn on one face, mismatched -- and `streets.js` lays it.
 *
 * ---------------------------------------------------------- THE FRONTAGE
 *
 * This is where the world's clutter starts, and the contrast with Hanamikoji is
 * the point of both streets: Gion sells nothing you can see and Ninenzaka sells
 * everything, out to about 1.2 m from the shop line.
 *
 * Continuous two-storey machiya, party-walled, stepping up the hill.  Every one
 * seats on its LOW corner and lets its 延石 and its plinth take up the fall,
 * which is what produces the stepped line of stone bases running up the slope.
 *
 * **No poles.**  Ninenzaka, Sannenzaka and Ichinenzaka were undergrounded in the
 * 第5期 programme, 2004-08.  **No pickle barrels** -- recon checked, and every
 * barrel reference traces to Nishiki or to a brewery; the tsukemono shops here
 * front with chilled cases.  **Vending machines yes**: OSM counts three on this
 * street, and Kyoto regulates their colour (修正マンセル 5Y 7.5/1.5, which is
 * `PAL.vendBody`) rather than their presence.
 *
 * ------------------------------------------------------------- THE WEST SIDE
 *
 * `streets.js` revets the west side from t = 0.16 to 0.62: a coursed granite
 * wall standing on the frontage line, 0.97 m to the top of its coping, because
 * the height field falls away behind the frontage there.  That wall exists
 * before this district runs, so the frontage is built **on** it -- the west side
 * is a terrace, its shops seated a metre up with their plinths continuing the
 * stone, a stone stoop climbing sideways to each door, and their goods on a
 * shelf at the terrace edge where you look up at them.  The east side is at
 * grade on a 0.3 m base with the goods out on the paving.
 *
 * That asymmetry is what a contour street does, and it is what stops 141 m of
 * two-storey timber reading as a corridor.
 *
 * Note the consequence for the kit: `shopfront.js` places its displays at fixed
 * heights above the building **seat**, which is correct at grade and a metre
 * underground on the terrace.  So the terraced side is built with `zakaFront`
 * below -- the same machiya shell, the same trade vocabulary out of `SHOP`, but
 * a display hung off `sillY` instead.
 *
 * ---------------------------------------------------------- WHAT IS ON IT
 *
 * `docs/recon/STREET.md` 1.7, in walk order.  The generic frontage comes from
 * `kit/shopfront.js` on the `ninenzaka` trade mix; the documented individuals
 * are built here, because the kit has no vocabulary for 1,100 gourds on red
 * cords or a wall of candy jars, and those are what people photograph.
 *
 * Where a real business is named, its FORM is built and its MARK is not.  The
 * machiya coffee house at 桝屋町349 is a designated traditional building whose
 * outer wall is the only one on this stretch still keeping its original
 * appearance, so the building, the 大塀, the hanging noren and the wave-tile
 * 坪庭 are all modelled, and the plate on it says 珈琲.  Same rule for the giant
 * plush at どんぐり共和国 -- a silhouette -- and for the rabbit, which the
 * preservation rules already keep off the street.
 * ==================================================================== */

export const id = 'ninenzaka';

const O = SHADE;
const T_WOOD = O.timber;
const T_DEEP = O.timberDeep;
const T_PALE = O.plaster;
const T_STONE = O.stone;
const T_DARK = O.dark;
const T_TILE = O.tile;
const T_GREEN = { bands: 3, tint: TINT.green };
const T_RED = { bands: 3, tint: TINT.warmDeep };
const T_GLASS = { bands: 'soft3', tint: TINT.cool, transparent: true, opacity: 0.32 };

/* ==================================================================== *
 * PART 1 -- the terrace.
 *
 * `streets.js` revets one side of each slope wherever the height field falls
 * away behind the frontage.  Its rule is reproduced here exactly -- the 2.6 m
 * panel pitch, the 0.85 m threshold, the 1.05 m minimum, the 0.17 m coping --
 * because the buildings have to stand on that wall to the centimetre or its
 * coping saws through their wainscot.  Outside the revetted stretch the terrace
 * tapers to a 0.3 m base and this district lays its own facing.
 * ==================================================================== */

/** Verbatim from `RETAIN` in streets.js.  Do not let this drift. */
export const RETAIN_RUNS = {
  ninenzaka: [{ side: 1, from: 0.16, to: 0.62 }],
  sannenzaka: [{ side: 1, from: 0.10, to: 0.78 }],
};
const WALL_STEP = 2.6;
const WALL_MIN = 0.85;

/** The top of the streets.js revetment above the frontage ground, or null. */
function revetRise(ctx, c, s, side) {
  for (const run of RETAIN_RUNS[c.id] || []) {
    if (run.side !== side) continue;
    const s0 = run.from * c.length, s1 = run.to * c.length;
    if (s < s0 || s > s1) continue;
    // the panel this point falls in, on the grid streets.js actually walks
    const k = Math.floor((s - s0) / WALL_STEP);
    const ps = clamp(s0 + k * WALL_STEP, s0, Math.max(s0, s1 - WALL_STEP));
    const a = c.pointAt(ps), b = c.pointAt(Math.min(c.length, ps + WALL_STEP));
    const anx = -a.tz * side, anz = a.tx * side;
    const bnx = -b.tz * side, bnz = b.tx * side;
    const F = c.frontage, BK = c.frontage + 2.2;
    const low = Math.min(
      ctx.groundAt(a.x + anx * F, a.z + anz * F),
      ctx.groundAt(b.x + bnx * F, b.z + bnz * F)
    );
    const high = (ctx.groundAt(a.x + anx * BK, a.z + anz * BK)
                + ctx.groundAt(b.x + bnx * BK, b.z + bnz * BK)) / 2;
    const rise = high - low;
    const h = rise < WALL_MIN ? 1.05 : Math.min(4.2, rise + 0.35);
    return (low - 0.25 + h + 0.17) - low;      // the courses, then the coping
  }
  return null;
}

/**
 * How far above the frontage ground this side stands at arc length `s`.
 *
 * Inside the revetment, just clear of its coping so the plinth swallows it.
 * Outside, `base`, with a taper either side so the eave line never steps by
 * more than the preservation plan's own tolerance from one plot to the next.
 */
export function terraceRise(ctx, c, s, side, { base = 0.30, taper = 10 } = {}) {
  const r = revetRise(ctx, c, s, side);
  if (r !== null) return clamp(r + 0.07, base, 1.60);
  let best = base;
  for (const run of RETAIN_RUNS[c.id] || []) {
    if (run.side !== side) continue;
    const s0 = run.from * c.length, s1 = run.to * c.length;
    const d = s < s0 ? s0 - s : s - s1;
    if (d < 0 || d > taper) continue;
    const edge = revetRise(ctx, c, s < s0 ? s0 + 0.05 : s1 - 0.05, side);
    if (edge === null) continue;
    best = Math.max(best, lerp(edge + 0.07, base, clamp(d / taper, 0, 1)));
  }
  return clamp(best, 0, 1.60);
}

/**
 * Register the made ground a plot stands on, and record its rise.
 *
 * This MUST run for every plot on both sides before ANY building is made: a
 * machiya samples `groundAt` right across its footprint and its neighbour's
 * terrace overlaps it.  The platform deliberately starts 0.55 m behind the
 * frontage line, so the seat is still taken from the street and the plinth
 * makes up the whole of the difference -- which is the point.
 */
export function planTerrace(ctx, c, plot, depth, opts) {
  const rise = terraceRise(ctx, c, plot.s, plot.side, opts);
  const { nx, nz, tx, tz } = plot.street;
  const hw = plot.width / 2 + 0.25;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const u of [-hw, hw]) {
    for (const v of [0.55, depth + 1.5]) {
      const x = plot.x + tx * u + nx * v, z = plot.z + tz * u + nz * v;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      z0 = Math.min(z0, z); z1 = Math.max(z1, z);
    }
  }
  plot.rise = rise;
  plot.terraceTop = plot.y + rise;
  ctx.platform({ x0, z0, x1, z1, top: plot.terraceTop, step: 0.2 });
  return rise;
}

/**
 * The coursed granite facing along a frontage line.
 *
 * A machiya's own plinth is a single box: at 0.3 m that reads as a kerb and at
 * 1.0 m it reads as poured concrete.  This lays the courses on its face --
 * 0.3 m bands, a batter of about 1 in 10, moss on the damp bottom course -- and
 * it is the line that carries the eye up the hill.  It finishes 0.02 m below
 * the plinth top, so a building always finishes its own base.
 */
export function layFacing(ctx, c, side, { from, to, baker, seed = 1, opts }) {
  const rng = rngKit(seed * 7717 + 13);
  const step = 2.35;
  const b = ctx.baker(baker);
  const s0 = from * c.length, s1 = to * c.length;
  for (let s = s0; s < s1 - step * 0.5; s += step) {
    const a = c.pointAt(s), e = c.pointAt(Math.min(c.length, s + step));
    const anx = -a.tz * side, anz = a.tx * side;
    const enx = -e.tz * side, enz = e.tx * side;
    const ax = a.x + anx * c.frontage, az = a.z + anz * c.frontage;
    const ex = e.x + enx * c.frontage, ez = e.z + enz * c.frontage;
    const gy = Math.min(ctx.groundAt(ax, az), ctx.groundAt(ex, ez));
    const h = Math.min(terraceRise(ctx, c, s, side, opts),
      terraceRise(ctx, c, s + step, side, opts)) - 0.02;
    if (h < 0.12) continue;
    const len = Math.hypot(ex - ax, ez - az);
    const ry = Math.atan2(a.tx, a.tz);
    const cx = (ax + ex) / 2, cz = (az + ez) / 2;
    const courses = Math.max(1, Math.round(h / 0.31));
    const ch = h / courses;
    for (let k = 0; k < courses; k++) {
      const inset = (k / courses) * h * 0.10;
      const g = new THREE.BoxGeometry(0.34, ch * 1.04, len * 1.02);
      g.applyMatrix4(new THREE.Matrix4().compose(
        new THREE.Vector3(cx + anx * (0.06 + inset), gy - 0.30 + ch * (k + 0.5), cz + anz * (0.06 + inset)),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
        new THREE.Vector3(1, 1, 1)
      ));
      b.add(g, null, k < 1 && rng.chance(0.34) ? PAL.stoneMoss
        : rng.chance(0.5) ? PAL.stoneWall : PAL.stoneWallDark, T_STONE);
    }
    if (h > 0.5) {
      // 側石 -- the dressed edge stone that finishes a tall base
      const cop = new THREE.BoxGeometry(0.40, 0.09, len * 1.02);
      cop.applyMatrix4(new THREE.Matrix4().compose(
        new THREE.Vector3(cx + anx * (0.06 + h * 0.10), gy - 0.30 + h - 0.045, cz + anz * (0.06 + h * 0.10)),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
        new THREE.Vector3(1, 1, 1)
      ));
      b.add(cop, null, PAL.stone, T_STONE);
    }
  }
}

/* ==================================================================== *
 * PART 2 -- displays.
 *
 * STREET.md 3.7: "where a procedural street wins or loses.  A machiya facade
 * with nothing in front of it looks like a museum."
 *
 * Everything here draws into the machiya's own Parts collector through the
 * `dress` hook, so a dressed frontage is still one merged mesh with its
 * building.  Local frame: +x along the frontage, y from the building seat,
 * **-z toward the street**.  `zFront` is the outermost plane of the goods,
 * `zBack` the back of the recess the kit has already cut; `y` is the shop
 * FLOOR, which on the terrace is a metre above the paving.
 * ==================================================================== */

function boxGeo(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(Math.max(2e-3, w), Math.max(2e-3, h), Math.max(2e-3, d));
  g.translate(x, y, z);
  return g;
}
function cylGeo(r, h, x, y, z, seg = 8) {
  const g = new THREE.CylinderGeometry(r, r, h, seg, 1);
  g.translate(x, y, z);
  return g;
}
function coneGeo(r, h, x, y, z, seg = 7) {
  const g = new THREE.ConeGeometry(r, h, seg, 1);
  g.translate(x, y + h / 2, z);
  return g;
}
function sphGeo(r, x, y, z, squash = 1) {
  const g = new THREE.SphereGeometry(r, 7, 5);
  g.scale(1, squash, 1);
  g.translate(x, y, z);
  return g;
}
function latheAt(P, prof, seg, colour, opts, x, y, z) {
  const g = lathe(prof, seg);
  g.translate(x, y, z);
  P.add(g, colour, opts);
}
/** Spread `n` items evenly across the opening. */
function across(o, n, fn) {
  const w = o.x1 - o.x0;
  for (let i = 0; i < n; i++) fn(o.x0 + ((i + 0.5) / n) * w, i);
}
/** `f` = 0 at the back of the recess, 1 at the outermost plane of the goods. */
function zAt(o, f) { return lerp(o.zBack, o.zFront, f); }
/** The dark of the shop behind the goods, and the shelf bands in it. */
function interiorBack(o) {
  const { P } = o;
  const cx = (o.x0 + o.x1) / 2, w = o.x1 - o.x0;
  P.box(PAL.shopInterior, T_DARK, w + 0.10, 2.05, 0.06, cx, o.y + 1.00, o.zBack + 0.03);
  for (let k = 0; k < 3; k++) {
    P.box(PAL.shopInteriorLit, T_DARK, w - 0.10, 0.03, 0.10, cx, o.y + 0.55 + k * 0.42, o.zBack - 0.02);
  }
}

/* ------------------------- the documented ones -------------------------- */

/** 二年坂まるん / 産寧坂まるん -- an open wall of glass candy jars on tiers. */
export function dispCandyJars(o) {
  const { P, rng } = o;
  const sweets = [0xf2b0bc, 0xb4cc8c, 0xffd9a0, 0x9cb8c8, 0xf0c8b4, 0xc4443a, 0xefe4d0, 0x8aa84a];
  const rows = 4;
  P.box(PAL.timberDark, T_DEEP, o.x1 - o.x0 + 0.10, 1.50, 0.06,
    (o.x0 + o.x1) / 2, o.y + 0.75, o.zBack + 0.03);
  for (let r = 0; r < rows; r++) {
    const y = o.y + 0.12 + r * 0.34;
    const f = lerp(0.92, 0.40, r / (rows - 1));
    const zc = zAt(o, f * 0.5);
    P.box(PAL.timberMid, T_WOOD, o.x1 - o.x0, 0.04, (o.zBack - o.zFront) * f,
      (o.x0 + o.x1) / 2, y, zc);
    across(o, Math.max(2, Math.floor((o.x1 - o.x0) / 0.165)), (x) => {
      const jr = rng.range(0.050, 0.070), jh = rng.range(0.15, 0.23);
      const jz = zc + rng.range(-0.025, 0.025);
      /* A saturated core inside pale glass.  This is the one place on the
       * street a full-chroma colour is allowed to sit, and it reads at 30 m. */
      P.add(cylGeo(jr * 0.84, jh * 0.72, x, y + 0.02 + jh * 0.36, jz), rng.pick(sweets),
        { bands: 'soft3', tint: TINT.cool });
      P.add(cylGeo(jr, jh, x, y + 0.02 + jh / 2, jz), PAL.glass, T_GLASS);
      P.add(cylGeo(jr * 0.52, 0.025, x, y + 0.035 + jh, jz), PAL.timberPale, T_WOOD);
    });
  }
}

/** おちゃのこさいさい -- about 1,800 dried chillies at the entrance. */
export function dispChillies(o) {
  const { P, rng } = o;
  const cx = (o.x0 + o.x1) / 2;
  interiorBack(o);
  P.box(PAL.copper, T_TILE, o.x1 - o.x0, 0.05, (o.zBack - o.zFront) * 0.8, cx, o.y + 0.72, zAt(o, 0.45));
  across(o, Math.max(2, Math.floor((o.x1 - o.x0) / 0.44)), (x, i) => {
    const y = o.y + (i % 2 ? 0.745 : 0.02);
    const r = rng.range(0.15, 0.20);
    latheAt(P, [[r * 0.7, 0], [r, 0.05], [r * 1.05, 0.15], [r * 0.99, 0.17]], 10,
      PAL.bambooCulm, T_GREEN, x, y, zAt(o, 0.45));
    P.add(sphGeo(r * 0.90, x, y + 0.15, zAt(o, 0.45), 0.40), PAL.red, T_RED);
  });
  // the strings of them hung right down the opening
  across(o, Math.max(4, Math.floor((o.x1 - o.x0) / 0.115)), (x) => {
    const top = o.y + rng.range(1.20, 1.55);
    const len = rng.range(0.28, 0.60);
    P.box(PAL.timberDark, T_DEEP, 0.008, len, 0.008, x, top - len / 2, zAt(o, 0.82));
    for (let k = 0; k < 5; k++) {
      P.add(coneGeo(0.017, 0.075, x + rng.range(-0.02, 0.02), top - len + 0.02 + k * 0.055, zAt(o, 0.82)),
        k % 3 === 0 ? PAL.redDeep : PAL.red, T_RED);
    }
  });
}

/** 瓢箪屋 -- 千成瓢箪 hung on RED CORDS in the window.  Eleven hundred of them. */
export function dispGourds(o) {
  const { P, rng } = o;
  interiorBack(o);
  across(o, Math.max(6, Math.floor((o.x1 - o.x0) / 0.155)), (x) => {
    for (let k = 0; k < 3; k++) {
      const top = o.y + 1.72 - k * 0.02;
      const cord = rng.range(0.14, 0.48) + k * 0.36;
      const z = zAt(o, 0.86 - k * 0.28);
      const s = 0.050 * rng.range(0.72, 1.30) * (k === 0 ? 1.15 : 1);
      // the cord is the thing that reads from across the street
      P.box(PAL.red, { bands: 2, tint: TINT.warmDeep }, 0.007, cord, 0.007, x, top - cord / 2, z);
      latheAt(P, [
        [0.001, 0], [s * 1.35, 0.02], [s * 1.50, 0.09], [s * 0.70, 0.155],
        [s * 0.95, 0.20], [s * 1.02, 0.245], [s * 0.42, 0.285], [s * 0.28, 0.30], [0.001, 0.305],
      ], 9, rng.chance(0.13) ? PAL.gold : rng.chance(0.4) ? PAL.timberPale : PAL.bambooCulmPale,
        T_WOOD, x, top - cord - 0.30, z);
    }
  });
  P.box(PAL.timberDark, T_DEEP, o.x1 - o.x0 + 0.12, 0.07, 0.07,
    (o.x0 + o.x1) / 2, o.y + 1.74, zAt(o, 0.55));
  // the big signed gourds on the shelf at the back
  P.box(PAL.timberMid, T_WOOD, o.x1 - o.x0, 0.04, 0.24, (o.x0 + o.x1) / 2, o.y + 0.90, zAt(o, 0.08));
  across(o, 3, (x) => {
    latheAt(P, [[0.001, 0], [0.10, 0.03], [0.115, 0.14], [0.055, 0.24],
      [0.075, 0.31], [0.080, 0.38], [0.030, 0.44], [0.001, 0.45]], 9,
      PAL.timberPale, T_WOOD, x, o.y + 0.92, zAt(o, 0.08));
  });
}

/** 七味家本舗 -- pyramids of spice in shallow dishes, in an open front. */
export function dispSpice(o) {
  const { P, rng } = o;
  const cx = (o.x0 + o.x1) / 2;
  interiorBack(o);
  P.box(PAL.counter, T_WOOD, o.x1 - o.x0, 0.07, (o.zBack - o.zFront) * 0.86, cx, o.y + 0.83, zAt(o, 0.48));
  P.box(PAL.timberDark, T_DEEP, o.x1 - o.x0, 0.80, 0.05, cx, o.y + 0.40, zAt(o, 0.88));
  const spice = [0xb0503c, 0xc4443a, 0x8aa84a, 0xc4a878, 0x9c7a34, 0x6b8438, 0x8f2d12];
  across(o, Math.max(3, Math.floor((o.x1 - o.x0) / 0.30)), (x, i) => {
    const z = zAt(o, 0.64 - (i % 2) * 0.26);
    const r = rng.range(0.088, 0.115);
    latheAt(P, [[r * 0.55, 0], [r, 0.012], [r * 1.05, 0.036], [r * 0.98, 0.042]], 10,
      PAL.ceramicWhite, T_PALE, x, o.y + 0.865, z);
    P.add(coneGeo(r * 0.86, rng.range(0.06, 0.095), x, o.y + 0.90, z), rng.pick(spice), T_RED);
  });
  P.box(PAL.timberMid, T_WOOD, o.x1 - o.x0, 0.04, 0.22, cx, o.y + 1.34, zAt(o, 0.10));
  across(o, Math.max(4, Math.floor((o.x1 - o.x0) / 0.20)), (x) => {
    P.add(cylGeo(0.048, 0.13, x, o.y + 1.42, zAt(o, 0.10)), PAL.brass, T_WOOD);
  });
  P.add(coneGeo(0.045, 0.13, o.x1 - 0.14, o.y + 0.90, zAt(o, 0.72)), PAL.paper, T_PALE);
}

/** 代官山 Candy apple -- rows of glossy apples on sticks; the one bright front. */
export function dispCandyApples(o) {
  const { P, rng } = o;
  const cx = (o.x0 + o.x1) / 2;
  P.box(PAL.white, T_PALE, o.x1 - o.x0, 1.05, 0.06, cx, o.y + 0.52, o.zBack + 0.03);
  const pastel = [0xf2b0bc, 0xffd9a0, 0xb4cc8c, 0x9cb8c8, 0xf0c8b4, 0xc4443a];
  for (let r = 0; r < 3; r++) {
    const y = o.y + 0.96 + r * 0.30;
    P.box(PAL.white, T_PALE, o.x1 - o.x0, 0.035, (o.zBack - o.zFront) * 0.55, cx, y, zAt(o, 0.55));
    across(o, Math.max(3, Math.floor((o.x1 - o.x0) / 0.145)), (x) => {
      P.box(PAL.timberPale, T_WOOD, 0.008, 0.13, 0.008, x, y + 0.075, zAt(o, 0.55));
      P.add(sphGeo(rng.range(0.048, 0.058), x, y + 0.175, zAt(o, 0.55), 0.94),
        rng.pick(pastel), { bands: 'soft3', tint: TINT.warm });
    });
  }
  P.box(PAL.white, T_PALE, o.x1 - o.x0 + 0.10, 0.11, 0.18, cx, o.y + 1.98, zAt(o, 0.72));
}

/** どんぐり共和国 -- the life-size plush at the door, as a SILHOUETTE.  No mark. */
export function dispPlush(o) {
  const { P } = o;
  const cx = (o.x0 + o.x1) / 2;
  const z = zAt(o, 0.55);
  interiorBack(o);
  latheAt(P, [
    [0.001, 0], [0.30, 0.06], [0.40, 0.26], [0.44, 0.56], [0.38, 0.86],
    [0.27, 1.04], [0.16, 1.12], [0.001, 1.15],
  ], 12, PAL.stoneDark, T_STONE, cx, o.y + 0.02, z);
  for (const s of [-1, 1]) {
    P.add(coneGeo(0.075, 0.17, cx + s * 0.13, o.y + 1.05, z), PAL.stoneDark, T_STONE);
  }
}

/** こんにゃくしゃぼん -- soaps in glass jars on tiered shelving, pale and bright. */
export function dispSoap(o) {
  const { P, rng } = o;
  const soap = [0xefe4d0, 0xb4cc8c, 0xf2b0bc, 0xd0e4f6, 0xffd9a0, 0xc4bc86];
  P.box(PAL.timberDark, T_DEEP, o.x1 - o.x0 + 0.08, 1.42, 0.05,
    (o.x0 + o.x1) / 2, o.y + 0.71, o.zBack + 0.03);
  for (let r = 0; r < 4; r++) {
    const y = o.y + 0.16 + r * 0.31;
    const f = lerp(0.90, 0.36, r / 3);
    P.box(PAL.timberPale, T_WOOD, o.x1 - o.x0, 0.035, (o.zBack - o.zFront) * f,
      (o.x0 + o.x1) / 2, y, zAt(o, f / 2));
    across(o, Math.max(2, Math.floor((o.x1 - o.x0) / 0.20)), (x) => {
      P.add(cylGeo(0.060, 0.15, x, y + 0.095, zAt(o, f * 0.5)), rng.pick(soap), T_PALE);
      P.add(cylGeo(0.064, 0.02, x, y + 0.180, zAt(o, f * 0.5)), PAL.timberPale, T_WOOD);
    });
  }
}

/** 京・お漬物処やました -- whole chilled cucumbers on sticks.  NOT a barrel. */
export function dispChilled(o) {
  const { P, rng } = o;
  const cx = (o.x0 + o.x1) / 2, w = o.x1 - o.x0;
  const dp = (o.zBack - o.zFront) * 0.84;
  interiorBack(o);
  P.box(PAL.metalWarm, T_TILE, w, 0.72, dp, cx, o.y + 0.36, zAt(o, 0.5));
  P.box(PAL.glassDark, T_DARK, w - 0.06, 0.34, dp * 0.94, cx, o.y + 0.92, zAt(o, 0.5));
  P.add(boxGeo(w - 0.03, 0.36, dp, cx, o.y + 0.92, zAt(o, 0.5)), PAL.glass, T_GLASS);
  P.box(PAL.metal, T_TILE, w, 0.06, dp + 0.06, cx, o.y + 1.13, zAt(o, 0.5));
  across(o, Math.max(3, Math.floor(w / 0.22)), (x) => {
    P.add(cylGeo(0.026, 0.20, x, o.y + 0.88, zAt(o, 0.60)),
      rng.chance(0.4) ? PAL.matchaDeep : PAL.matcha, T_GREEN);
    P.box(PAL.timberPale, T_WOOD, 0.008, 0.14, 0.008, x, o.y + 0.72, zAt(o, 0.60));
  });
  latheAt(P, [[0.07, 0], [0.085, 0.012], [0.09, 0.03], [0.086, 0.034]], 10,
    PAL.ceramicWhite, T_PALE, o.x0 + 0.14, o.y + 1.16, zAt(o, 0.70));
}

/** 寺子屋本舗 / 藤菜美 -- a charcoal grill worked in view of the street. */
export function dispGrill(o) {
  const { P, rng } = o;
  const cx = (o.x0 + o.x1) / 2;
  const dp = (o.zBack - o.zFront) * 0.9;
  interiorBack(o);
  P.box(PAL.counter, T_WOOD, o.x1 - o.x0, 0.07, dp, cx, o.y + 0.86, zAt(o, 0.5));
  P.box(PAL.timberDark, T_DEEP, o.x1 - o.x0, 0.82, 0.05, cx, o.y + 0.43, zAt(o, 0.90));
  const gw = Math.min(0.86, (o.x1 - o.x0) * 0.62);
  const gz = zAt(o, 0.46);
  P.box(PAL.iron, { bands: 2, tint: TINT.cool }, gw, 0.14, 0.34, cx, o.y + 0.965, gz);
  P.box(PAL.vermilionLit, { bands: 'soft3', tint: TINT.warmDeep }, gw - 0.08, 0.02, 0.26,
    cx, o.y + 1.030, gz);
  for (let i = 0; i < 9; i++) {
    const x = cx - gw / 2 + 0.05 + (i / 8) * (gw - 0.10);
    P.box(PAL.timberPale, T_WOOD, 0.012, 0.012, 0.34, x, o.y + 1.055, gz);
    for (let k = 0; k < 3; k++) {
      P.add(sphGeo(0.026, x, o.y + 1.062, gz - 0.09 + k * 0.09, 0.86),
        rng.chance(0.4) ? PAL.timberWarm : PAL.paperWarm, T_WOOD);
    }
  }
  latheAt(P, [[0.05, 0], [0.06, 0.02], [0.055, 0.09], [0.062, 0.10]], 9,
    PAL.timberDark, T_DEEP, o.x1 - 0.16, o.y + 0.895, zAt(o, 0.68));
}

/** 松韻堂 / 嘉祥窯 -- the 雛壇, tiered stands of 清水焼 out on the frontage. */
export function dispCeramics(o) {
  const { P, rng } = o;
  interiorBack(o);
  for (let r = 0; r < 3; r++) {
    const y = o.y + 0.30 + r * 0.29;
    const f = lerp(0.86, 0.30, r / 2);
    const zc = zAt(o, f / 2);
    P.box(PAL.timberDark, T_DEEP, o.x1 - o.x0, 0.045, (o.zBack - o.zFront) * f,
      (o.x0 + o.x1) / 2, y, zc);
    P.box(PAL.indigoDeep, T_DARK, o.x1 - o.x0, 0.25, 0.02, (o.x0 + o.x1) / 2, y - 0.14, zAt(o, f));
    across(o, Math.max(2, Math.floor((o.x1 - o.x0) / 0.235)), (x) => {
      const br = rng.range(0.048, 0.075);
      latheAt(P, rng.chance(0.3)
        ? [[br * 0.45, 0], [br * 0.5, 0.012], [br * 0.8, 0.03], [br * 0.86, 0.13], [br * 0.80, 0.145], [br * 0.76, 0.15]]
        : [[br * 0.40, 0], [br * 0.46, 0.010], [br * 0.78, 0.035], [br, 0.075], [br * 0.96, 0.082]],
        10, rng.pick(CERAMIC), T_PALE, x, y + 0.022, zc + rng.range(-0.02, 0.02));
      P.box(PAL.paper, T_PALE, 0.05, 0.032, 0.004, x, y + 0.048, zAt(o, f * 0.92));
    });
  }
}

/* ------------------------------ the generic ----------------------------- */

/** Tiered shelving of boxed goods -- the souvenir and craft default. */
export function dispShelves(o) {
  const { P, rng } = o;
  const colours = o.goods || [PAL.paperWarm, PAL.sweetPink, PAL.matcha, PAL.norenIndigo, PAL.timberPale];
  interiorBack(o);
  for (let r = 0; r < 3; r++) {
    const y = o.y + 0.18 + r * 0.32;
    const f = lerp(0.90, 0.36, r / 2);
    const zc = zAt(o, f / 2);
    P.box(PAL.timberMid, T_WOOD, o.x1 - o.x0, 0.04, (o.zBack - o.zFront) * f,
      (o.x0 + o.x1) / 2, y, zc);
    P.box(PAL.tatamiEdge, T_DEEP, o.x1 - o.x0, 0.14, 0.02, (o.x0 + o.x1) / 2, y - 0.09, zAt(o, f));
    across(o, Math.max(2, Math.floor((o.x1 - o.x0) / 0.24)), (x) => {
      if (rng.chance(0.55)) {
        const st = rng.int(1, 3);
        for (let k = 0; k < st; k++) {
          P.box(rng.pick(colours), T_PALE, 0.15, 0.038, 0.11, x, y + 0.021 + k * 0.038, zc);
        }
      } else {
        P.add(cylGeo(0.052, 0.12, x, y + 0.08, zc), rng.pick(colours), T_PALE);
      }
    });
  }
}

/** 試食皿 -- the sample tray on a stand, the tea kettle, the 五個入 stacks. */
export function dispTrays(o) {
  const { P, rng } = o;
  const cx = (o.x0 + o.x1) / 2;
  const tri = [PAL.sweetPink, PAL.sweetGreen, PAL.wagashi, PAL.paperWarm, PAL.purple];
  interiorBack(o);
  P.box(PAL.counter, T_WOOD, o.x1 - o.x0, 0.06, (o.zBack - o.zFront) * 0.86, cx, o.y + 0.86, zAt(o, 0.5));
  P.box(PAL.timberDark, T_DEEP, o.x1 - o.x0, 0.82, 0.05, cx, o.y + 0.43, zAt(o, 0.90));
  across(o, Math.max(2, Math.floor((o.x1 - o.x0) / 0.38)), (x, i) => {
    const z = zAt(o, 0.62 - (i % 2) * 0.26);
    P.box(PAL.black, T_DARK, 0.30, 0.018, 0.21, x, o.y + 0.90, z);
    for (let k = 0; k < 8; k++) {
      const g = new THREE.CylinderGeometry(0.042, 0.042, 0.011, 3, 1);
      g.rotateX(Math.PI / 2);
      g.translate(x - 0.10 + (k % 4) * 0.066, o.y + 0.915, z + (k < 4 ? -0.045 : 0.045));
      P.add(g, rng.pick(tri), { bands: 'soft3', tint: TINT.warm });
    }
  });
  latheAt(P, [[0.055, 0], [0.075, 0.03], [0.070, 0.10], [0.040, 0.12], [0.045, 0.135]], 10,
    PAL.iron, { bands: 2, tint: TINT.cool }, o.x1 - 0.17, o.y + 0.89, zAt(o, 0.20));
  for (let k = 0; k < 4; k++) {
    latheAt(P, [[0.018, 0], [0.030, 0.012], [0.032, 0.048]], 8, PAL.ceramicWhite, T_PALE,
      o.x0 + 0.12 + k * 0.075, o.y + 0.89, zAt(o, 0.16));
  }
}

/** A glazed counter case -- the confectioner and the food-sample frontage. */
export function dispCase(o) {
  const { P, rng } = o;
  const cx = (o.x0 + o.x1) / 2, w = o.x1 - o.x0;
  const dp = (o.zBack - o.zFront) * 0.8;
  const colours = o.goods || [PAL.wagashi, PAL.sweetPink, PAL.sweetGreen, PAL.paperWarm];
  interiorBack(o);
  P.box(PAL.timberMid, T_WOOD, w, 0.62, dp, cx, o.y + 0.31, zAt(o, 0.5));
  P.box(PAL.timberDark, T_DEEP, w + 0.03, 0.05, dp + 0.04, cx, o.y + 0.645, zAt(o, 0.5));
  P.box(PAL.metalDark, T_TILE, w, 0.035, dp, cx, o.y + 0.99, zAt(o, 0.5));
  for (const s of [-1, 1]) {
    P.box(PAL.metalDark, T_TILE, 0.035, 0.32, dp, cx + s * (w / 2 - 0.02), o.y + 0.83, zAt(o, 0.5));
  }
  P.add(boxGeo(w - 0.05, 0.32, dp, cx, o.y + 0.83, zAt(o, 0.5)), PAL.glass, T_GLASS);
  across(o, Math.max(3, Math.floor(w / 0.20)), (x) => {
    P.add(cylGeo(0.045, 0.05, x, o.y + 0.70, zAt(o, 0.5), 6), rng.pick(colours), T_PALE);
  });
}

/** A counter in the window -- cafes, tofu, anything with a person behind it. */
export function dispCounter(o) {
  const { P, rng } = o;
  const cx = (o.x0 + o.x1) / 2;
  interiorBack(o);
  P.box(PAL.counter, T_WOOD, o.x1 - o.x0, 0.06, (o.zBack - o.zFront) * 0.6, cx, o.y + 0.94, zAt(o, 0.36));
  P.box(PAL.timberDark, T_DEEP, o.x1 - o.x0, 0.90, 0.05, cx, o.y + 0.47, zAt(o, 0.60));
  across(o, Math.max(2, Math.floor((o.x1 - o.x0) / 0.55)), (x) => {
    latheAt(P, [[0.028, 0], [0.032, 0.012], [0.031, 0.055], [0.036, 0.062]], 9,
      PAL.ceramicWhite, T_PALE, x, o.y + 0.97, zAt(o, 0.36));
    if (rng.chance(0.5)) {
      P.box(PAL.timberDark, T_DEEP, 0.16, 0.012, 0.16, x + 0.15, o.y + 0.975, zAt(o, 0.36));
    }
  });
}

/** 香老舗 -- long shallow glass-topped drawers, and nothing else. */
export function dispDrawers(o) {
  const { P, rng } = o;
  const cx = (o.x0 + o.x1) / 2, w = o.x1 - o.x0;
  const dp = (o.zBack - o.zFront) * 0.86;
  interiorBack(o);
  P.box(PAL.timberDark, T_DEEP, w, 0.84, dp, cx, o.y + 0.42, zAt(o, 0.5));
  for (let r = 0; r < 3; r++) {
    P.box(PAL.timberMid, T_WOOD, w - 0.06, 0.20, 0.03, cx, o.y + 0.20 + r * 0.24, zAt(o, 0.94));
    P.box(PAL.brass, T_WOOD, 0.10, 0.02, 0.02, cx, o.y + 0.20 + r * 0.24, zAt(o, 1.0));
  }
  P.add(boxGeo(w - 0.05, 0.02, dp, cx, o.y + 0.86, zAt(o, 0.5)), PAL.glass, T_GLASS);
  across(o, Math.max(2, Math.floor(w / 0.32)), (x) => {
    P.box(PAL.black, T_DARK, 0.22, 0.014, 0.15, x, o.y + 0.876, zAt(o, 0.44));
    for (let k = 0; k < 4; k++) {
      P.add(coneGeo(0.016, 0.036, x - 0.07 + k * 0.046, o.y + 0.884, zAt(o, 0.44)),
        rng.chance(0.5) ? PAL.timberWarm : PAL.timberMid, T_WOOD);
    }
  });
}

/** 京扇子 -- a wall rack of opened fans, the loudest colour on the street. */
export function dispFans(o) {
  const { P, rng } = o;
  const w = o.x1 - o.x0;
  P.box(PAL.timberDark, T_DEEP, w + 0.06, 1.55, 0.05, (o.x0 + o.x1) / 2, o.y + 0.92, o.zBack + 0.03);
  const cols = Math.max(2, Math.floor(w / 0.34));
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < cols; i++) {
      const x = o.x0 + ((i + 0.5) / cols) * w;
      const y = o.y + 0.44 + r * 0.42;
      const g = new THREE.CircleGeometry(0.145, 8, Math.PI * 0.10, Math.PI * 0.80);
      g.rotateX(Math.PI);
      g.translate(x, y, o.zBack - 0.03);
      P.add(g, rng.chance(0.4) ? PAL.paperWarm
        : rng.pick([PAL.norenIndigo, PAL.norenRed, PAL.paper, PAL.matcha, PAL.gold]),
        { bands: 'soft3', tint: TINT.cool, side: THREE.DoubleSide });
      P.box(PAL.timberDark, T_DEEP, 0.014, 0.09, 0.012, x, y - 0.045, o.zBack - 0.04);
    }
  }
  P.box(PAL.timberMid, T_WOOD, w, 0.05, (o.zBack - o.zFront) * 0.6,
    (o.x0 + o.x1) / 2, o.y + 0.80, zAt(o, 0.35));
}

/** 手ぬぐい / ちりめん -- hanging cloth, the komono frontage. */
export function dispCloth(o) {
  const { P, rng } = o;
  const w = o.x1 - o.x0;
  const cloth = [0xb47a8c, 0x6e7ea8, 0x8a9c6e, 0xc4a878, 0x9c6e84, 0x5c6e7c, 0xd0b48c];
  interiorBack(o);
  P.box(PAL.timberDark, T_DEEP, w, 0.05, 0.05, (o.x0 + o.x1) / 2, o.y + 1.72, zAt(o, 0.62));
  across(o, Math.max(3, Math.floor(w / 0.22)), (x) => {
    const h = rng.range(0.62, 0.98);
    P.box(rng.pick(cloth), { bands: 'soft3', tint: TINT.cool },
      0.19, h, 0.02, x, o.y + 1.68 - h / 2, zAt(o, 0.62));
  });
  P.box(PAL.timberMid, T_WOOD, w, 0.05, (o.zBack - o.zFront) * 0.7,
    (o.x0 + o.x1) / 2, o.y + 0.78, zAt(o, 0.4));
  across(o, Math.max(2, Math.floor(w / 0.30)), (x) => {
    P.box(rng.pick(cloth), T_PALE, 0.20, 0.09, 0.15, x, o.y + 0.855, zAt(o, 0.4));
  });
}

export const DISPLAY = {
  candy: dispCandyJars, chilli: dispChillies, gourd: dispGourds, spice: dispSpice,
  apple: dispCandyApples, plush: dispPlush, soap: dispSoap, chilled: dispChilled,
  grill: dispGrill, ceramic: dispCeramics,
  shelves: dispShelves, trays: dispTrays, case: dispCase, counter: dispCounter,
  drawers: dispDrawers, fanrack: dispFans, cloth: dispCloth,
};

/** The kit's per-trade display key, mapped onto the ones drawn from `sillY`. */
const KIT_DISPLAY = {
  hinadan: 'ceramic', case: 'case', samplecase: 'case', trays: 'trays',
  chilled: 'chilled', counter: 'counter', drawers: 'drawers', fanrack: 'fanrack',
  cloth: 'cloth', shelves: 'shelves', teahouse: 'shelves', tubs: 'counter',
  bottles: 'shelves',
};

/* ==================================================================== *
 * PART 3 -- zakaFront.
 *
 * A machiya shell with an open mouth and a display hung off its FLOOR rather
 * than off its seat.  Used for every terraced frontage (where the kit's fixed
 * heights would bury the goods inside a metre of plinth) and for the documented
 * individuals on both sides.
 *
 * `makeMachiya` has already cut the recess for `openBays` -- KIT.md 10, the
 * mass stops short and piers, header, threshold and interior fill the last
 * metre -- so what this adds is the 見世棚 the shop pushes out under its own
 * 通り庇, the goods, and the stoop a terraced frontage needs to be enterable.
 * ==================================================================== */

export function zakaFront(ctx, p, spec, baker, seed) {
  const R = rngKit((seed >>> 0) || 1);
  const K = spec.kind ? SHOP[spec.kind] : null;
  const openN = spec.open === 'closed' ? 0 : (spec.openBays ?? 2);
  const display = spec.display || (K ? KIT_DISPLAY[K.display] : null) || 'shelves';
  const goods = spec.goods || (K ? K.goods : null);

  const noren = spec.noren !== undefined ? spec.noren
    : (K && R.chance(0.78)
      ? { text: K.noren.text, cloth: K.noren.cloth, textColor: K.noren.textColor, panels: K.noren.panels }
      : null);
  const sign = spec.sign !== undefined ? spec.sign
    : (K && R.chance(0.80)
      ? { text: spec.name || K.kanban.text, board: K.kanban.board,
          textColor: K.kanban.textColor, vertical: true, brush: K.kanban.board === PAL.timberPale }
      : null);

  return makeMachiya(ctx, {
    x: p.x, z: p.z, ry: p.ry, width: p.width, depth: p.depth,
    style: spec.style || 'shop',
    floors: spec.floors ?? 1.5,
    y: p.yLow, seed, baker,
    latticeKind: spec.lattice || (K ? K.lattice : 'itoya'),
    timberTone: spec.timber, plasterTone: spec.plaster,
    roofMaterial: spec.roof || (R.chance(0.28) ? 'tileOld' : 'tile'),
    degoshi: spec.degoshi ?? 0,
    sudare: false,
    sodekabe: spec.sodekabe ?? R.chance(0.16),
    udatsu: spec.udatsu ?? R.chance(0.05),
    noren, signboard: sign,
    openBays: openN ? bayList(p.width, openN, p.ry) : [],
    dress: (f) => {
      const raised = f.sillY > 0.62;
      const proj = spec.proj ?? (raised ? 0.44 : 0.66);
      let frontProj = 0.18;
      const spans = f.openSpans && f.openSpans.length ? f.openSpans : [];

      for (const [a, e] of spans) {
        const x0 = a + f.postD * 0.9, x1 = e - f.postD * 0.9;
        if (x1 - x0 < 0.5) continue;
        const deckY = f.sillY + 0.02;

        /* The shelf.  On the terrace it stands on a stone corbel, because a
         * plank nailed to a metre of granite reads as a plank nailed to a
         * cliff; at grade it is the 見世棚 with its boarded apron. */
        if (raised) {
          /* The stone stops UNDER the shelf and is narrower than it, so the
           * timber overhangs: a stone top flush with a timber top gives you
           * half a metre of grey ledge at eye level down the whole street. */
          const top = deckY - 0.10;
          f.P.box(PAL.stoneWall, T_STONE, x1 - x0 + 0.16, top + 0.34, proj - 0.06,
            (x0 + x1) / 2, (top - 0.34) / 2, -proj / 2 + 0.03);
          f.P.box(PAL.stone, T_STONE, x1 - x0 + 0.22, 0.08, proj + 0.02,
            (x0 + x1) / 2, top - 0.04, -proj / 2 + 0.02);
        } else {
          f.P.box(f.wainCol, T_DEEP, x1 - x0 + 0.10, Math.max(0.14, deckY - 0.10), 0.05,
            (x0 + x1) / 2, Math.max(0.14, deckY - 0.10) / 2, -proj + 0.03);
        }
        f.P.box(PAL.timberMid, T_WOOD, x1 - x0 + 0.14, 0.09, proj + 0.08,
          (x0 + x1) / 2, deckY - 0.045, -proj / 2);

        (DISPLAY[display] || dispShelves)({
          P: f.P, rng: R, goods,
          x0: x0 + 0.04, x1: x1 - 0.04, y: deckY,
          zFront: -proj, zBack: f.ENTRY_REC - 0.22,
        });
        frontProj = Math.max(frontProj, proj + 0.14);
      }

      if (spec.court) {
        gateCourt(f, R);
        frontProj = Math.max(frontProj, 0.95);
      }

      /* The stoop.  A metre of rise taken straight out would put five treads
       * across the whole pavement, so it climbs ACROSS the frontage instead --
       * which is what the raised shops on these slopes actually do. */
      if (f.sillY > 0.55) {
        stoop(f);
        frontProj = Math.max(frontProj, 0.62);
      }
      return { frontProj };
    },
  });
}

/** Stone treads climbing sideways to a raised door.  0.55 m of pavement, no more. */
function stoop(f) {
  const rise = f.sillY - 0.13;
  const n = clamp(Math.round(rise / 0.20), 2, 5);
  const w = f.entryHalf * 2 + 0.20;
  const dir = f.entryBay === 0 ? 1 : -1;         // climb toward the 通り庭
  for (let k = 0; k < n; k++) {
    const h = rise * (k + 1) / n;
    f.P.box(k === n - 1 ? PAL.stone : PAL.pavingWarm, T_STONE,
      w / n + 0.02, h + 0.16, 0.52,
      f.entryX - dir * (w / 2) + dir * (w / n) * (k + 0.5), h / 2 - 0.08, -0.30);
  }
}

/** 明保野亭 / 奥丹 -- a 数寄屋 entrance set back behind a bamboo 袖垣. */
function gateCourt(f, rng) {
  const P = f.P, w = f.width;
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.30);
    for (let i = 0; i < 7; i++) {
      P.add(cylGeo(0.024, 1.35, x + s * -0.02 * i, f.sillY + 0.66, -0.72 + (i - 3) * 0.055, 6),
        PAL.bambooCulm, T_GREEN);
    }
    P.box(PAL.timberDark, T_DEEP, 0.05, 0.05, 0.42, x, f.sillY + 1.34, -0.72);
  }
  latheAt(P, [[0.16, 0], [0.14, 0.10], [0.09, 0.30], [0.12, 0.36], [0.20, 0.42],
    [0.14, 0.50], [0.19, 0.56], [0.22, 0.74], [0.10, 0.80], [0.16, 0.86], [0.05, 0.96]],
    8, PAL.lanternStone, T_STONE, w * 0.28, f.sillY, -0.55);
  P.box(PAL.pavingDark, T_STONE, 0.64, 0.11, 0.44, 0, f.sillY + 0.03, -0.58);
  if (rng.chance(0.7)) P.box(PAL.pavingWarm, T_STONE, 0.46, 0.09, 0.34, -0.12, f.sillY + 0.02, -0.95);
}

/** Which bays a shop opens: the ones the 通り庭 does not want, up to `n`. */
function bayList(width, n, ry) {
  const bays = Math.max(1, Math.round(width / KEN));
  const entryLast = Math.cos(ry) - Math.sin(ry) > 0;
  const all = [];
  for (let i = 0; i < bays; i++) all.push(i);
  const usable = all.filter((i) => i !== (entryLast ? bays - 1 : 0));
  return entryLast ? usable.slice(Math.max(0, usable.length - n)) : usable.slice(0, n);
}

/* ==================================================================== *
 * PART 4 -- street furniture shared by both slopes.
 * ==================================================================== */

/** Map a plot-local (along, out) offset to world.  `out` is away from the street. */
export function toWorldOf(p, along, out) {
  const { tx, tz, nx, nz } = p.street;
  return { x: p.x + tx * along + nx * out, z: p.z + tz * along + nz * out };
}

/** Snap each authored frontage to the nearest plot not already spoken for. */
export function assignShops(plots, wanted) {
  const claimed = new Map();
  const used = new Set();
  for (const w of wanted) {
    let best = -1, bd = 1e9;
    for (let i = 0; i < plots.length; i++) {
      if (used.has(i)) continue;
      const d = Math.abs(plots[i].t - w.t);
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) { used.add(best); claimed.set(best, w); }
  }
  return claimed;
}

/**
 * 提灯, merged.
 *
 * One texture, one material, ONE mesh for every lantern on the street.  A
 * lantern per mesh is a draw call per lantern, and there are thirty of them.
 */
export function lanternRun(ctx, list, name, { text = '', paper = PAL.lanternRed } = {}) {
  if (!list.length) return null;
  const tex = lanternTex(text, { paper, textColor: PAL.paper, ribs: 9, band: PAL.lanternFrame });
  const parts = [];
  for (const l of list) {
    const g = new THREE.CylinderGeometry(0.118, 0.118, 0.57, 9, 1, true);
    g.translate(0, -0.30, 0);
    parts.push({ geometry: g, matrix: trs(l.x, l.y, l.z, 0, l.ry || 0, 0) });
  }
  const geo = bake(parts);
  parts.forEach((q) => q.geometry.dispose());
  if (!geo) return null;
  const m = new THREE.Mesh(geo, celTex(tex,
    { bands: 'soft', tint: TINT.warm, side: THREE.DoubleSide, flat: false }));
  m.name = name + '.chochin';
  m.userData.noOutline = true;
  ctx.add(m);
  return m;
}

/**
 * 市民用消火栓 -- the cedar hydrant box.
 *
 * The best Kyoto-specific prop nobody models.  Forty-one of them went through
 * the 産寧坂 preservation district under the 文化財防災水利 programme, and the
 * city's own spec says the box is **cedar**: 「外観（BOX）：景観への配慮から杉を
 * 採用」.  On 2024-01-02 residents put out a shop fire on this street with one
 * before the brigade got water on it.
 */
export function hydrantBox(ctx, baker, x, z, y, ry) {
  const b = ctx.baker(baker);
  const M = trs(x, y, z, 0, ry, 0);
  b.add(boxGeo(0.66, 0.06, 0.46, 0, 0.03, 0), M, PAL.stoneDark, T_STONE);
  b.add(boxGeo(0.62, 0.72, 0.42, 0, 0.40, 0), M, PAL.timberPale, T_WOOD);
  for (let i = 0; i < 4; i++) {
    b.add(boxGeo(0.60, 0.014, 0.012, 0, 0.14 + i * 0.17, -0.213), M, PAL.timberMid, T_WOOD);
  }
  b.add(boxGeo(0.66, 0.05, 0.46, 0, 0.775, 0), M, PAL.timberWarm, T_WOOD);
  b.add(boxGeo(0.72, 0.06, 0.52, 0, 0.815, -0.02), M, PAL.timberMid, T_WOOD);
  b.add(boxGeo(0.13, 0.05, 0.02, 0.18, 0.44, -0.216), M, PAL.iron, { bands: 2, tint: TINT.cool });
  ctx.collide(x - 0.36, z - 0.28, x + 0.36, z + 0.28, y + 0.84);
}

/**
 * 立て札 -- the free-standing board.  かさぎ屋's reads
 * 「甘党の素通り出来ぬ二寧坂」 and is the only signage that shop has.
 */
export function tateFuda(ctx, baker, x, y, z, ry, text) {
  const b = ctx.baker(baker);
  const M = trs(x, y, z, 0, ry, 0);
  b.add(boxGeo(0.09, 1.36, 0.09, 0, 0.68, 0), M, PAL.timberDark, T_DEEP);
  b.add(boxGeo(0.38, 0.06, 0.07, 0, 1.30, -0.05), M, PAL.timberDark, T_DEEP);
  b.add(boxGeo(0.34, 1.02, 0.05, 0, 0.72, -0.055), M, PAL.timberDark, T_DEEP);
  const g = new THREE.PlaneGeometry(0.29, 0.96);
  g.rotateY(Math.PI);
  g.translate(0, 0.72, -0.088);
  const m = new THREE.Mesh(g, celTex(verticalSign(text, {
    board: PAL.timberPale, textColor: PAL.black, brush: true,
  }), { bands: 3, tint: TINT.warm, flat: false }));
  m.applyMatrix4(M);
  ctx.add(m);
  ctx.collide(x - 0.25, z - 0.16, x + 0.25, z + 0.16, y + 1.4);
  return m;
}

/**
 * Interactables.
 *
 * A hitbox, a label, and an action that nudges one thing.  Nothing bounces and
 * nothing spins -- KIT.md 7 -- so the nudge is a single impulse that decays,
 * and one updater for the whole district drives every one of them.
 */
export function makeNudger(ctx) {
  const items = [];
  ctx.update((dt, t) => {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.v > 1e-4) { it.v *= Math.pow(0.14, dt); it.apply(it.v, t); }
      else if (it.v !== 0) { it.v = 0; it.apply(0, t); }
    }
  });
  return {
    /** Register something that can be nudged; returns the handle. */
    add(apply) { const it = { v: 0, apply }; items.push(it); return it; },
    /** Register the hitbox and the prompt. */
    at(ctxx, { x, y, z, w = 0.9, h = 0.9, d = 0.9, label, item = null, kick = 1 }) {
      const hit = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial());
      hit.position.set(x, y, z);
      hit.visible = false;
      ctxx.add(hit);
      ctxx.interact({ hitbox: hit, label, action: () => { if (item) item.v = kick; } });
      return hit;
    },
  };
}

/**
 * The 1.2 m of pavement a shop claims in front of its own line.
 *
 * Everything here goes to the central prop batcher.  A terraced frontage gets
 * much less: there is no pavement in front of it to claim, only the strip at
 * the foot of its wall, where the crates and the broom end up.
 */
export function dressPavement(ctx, rng, p, b) {
  const raised = (b.sillY - b.baseY) > 0.60;
  const put = (kind, along, out, extra = {}) => {
    const w = toWorldOf(p, along, -out);
    ctx.prop({ kind, x: w.x, z: w.z, y: ctx.groundAt(w.x, w.z), rot: p.ry,
      seed: rng.int(0, 99999), ...extra });
  };
  const half = p.width * 0.38;

  if (!raised) {
    if (rng.chance(0.38)) put('aBoard', rng.range(-half, half), rng.range(0.60, 0.95));
    if (rng.chance(0.28)) put('crate', rng.range(-half, half), rng.range(0.35, 0.6));
    if (rng.chance(0.20)) put('boxStack', rng.range(-half, half), rng.range(0.3, 0.5));
    if (rng.chance(0.15)) put('umbrellaStand', half, 0.45);
    if (rng.chance(0.12)) put('endai', 0, 0.80);
    if (rng.chance(0.10)) put('bicycle', rng.range(-1, 1), 0.58, { rot: p.ry + Math.PI / 2 });
    if (rng.chance(0.10)) put('stool', rng.range(-half, half), 0.64);
  } else {
    if (rng.chance(0.30)) put('crate', rng.range(-half, half), 0.22);
    if (rng.chance(0.18)) put('bucket', half, 0.18);
    if (rng.chance(0.14)) put('broom', -half, 0.18);
  }
  if (rng.chance(raised ? 0.24 : 0.44)) {
    const w = toWorldOf(p, rng.range(-half, half), -(raised ? 0.24 : 0.44));
    ctx.tree({ kind: 'potted', x: w.x, z: w.z, y: ctx.groundAt(w.x, w.z),
      scale: rng.range(0.75, 1.15), rot: rng.range(0, 6.28), seed: rng.int(0, 99999) });
  }
  if (rng.chance(0.08)) put('leafPile', rng.range(-1, 1), rng.range(0.3, 0.8));
}

/**
 * A lane mouth: stone flags, a wall each side, a glimpse of green and a board
 * fence at the back.  Two per side per street; one of the Ninenzaka pair is
 * 一念坂's, and the other is aimed to let the pagoda through.
 */
export function sideLane(ctx, c, side, t, B, rng, { tree = 'sakura', scale = 1.0 } = {}) {
  const a = atStreet(c.id, t, { side, offset: c.frontage });
  if (!a) return;
  const bk = ctx.baker(B);
  const { nx, nz, tx, tz } = a;
  const y = ctx.groundAt(a.x, a.z);
  const M = trs(a.x, y, a.z, 0, a.across, 0);

  for (let k = 0; k < 7; k++) {
    const yy = ctx.groundAt(a.x + nx * (0.6 + k), a.z + nz * (0.6 + k)) - y;
    bk.add(boxGeo(2.3, 0.10, 1.0, 0, yy + 0.02, 0.6 + k), M,
      k % 2 ? PAL.paving : PAL.pavingDark, T_STONE);
  }
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const yy = ctx.groundAt(a.x + nx * (0.9 + k * 1.8), a.z + nz * (0.9 + k * 1.8)) - y;
      bk.add(boxGeo(0.24, 0.44, 1.8, s * 1.28, yy + 0.22, 0.9 + k * 1.8), M, PAL.stoneWall, T_STONE);
      bk.add(boxGeo(0.20, 1.62, 1.8, s * 1.28, yy + 1.25, 0.9 + k * 1.8), M, PAL.plasterWarm, T_PALE);
      bk.add(boxGeo(0.34, 0.10, 1.84, s * 1.28, yy + 2.10, 0.9 + k * 1.8), M, PAL.tileRidge, T_TILE);
    }
    const wx = a.x + tx * s * 1.28, wz = a.z + tz * s * 1.28;
    ctx.collide(wx + nx * 0.6 - 0.35, wz + nz * 0.6 - 0.35,
      wx + nx * 7.2 + 0.35, wz + nz * 7.2 + 0.35, y + 2.2);
  }
  const bx = a.x + nx * 7.7, bz = a.z + nz * 7.7;
  const by = ctx.groundAt(bx, bz);
  bk.add(boxGeo(2.7, 1.9, 0.14, 0, by - y + 0.95, 7.7), M, PAL.timberGrey, T_WOOD);
  bk.add(boxGeo(2.9, 0.09, 0.26, 0, by - y + 1.94, 7.7), M, PAL.tileRidge, T_TILE);
  ctx.collide(bx - 1.6, bz - 1.6, bx + 1.6, bz + 1.6, by + 1.9);

  const at = (o, lat = 0) => ({ x: a.x + nx * o + tx * lat, z: a.z + nz * o + tz * lat });
  /* The cherry stands IN the gap, not on the pavement: a trunk in the middle of
   * a 6 m street reads as scaffolding, and the canopy still hangs over the
   * roofs, which is what makes the photograph. */
  const t1 = at(1.7, -0.2);
  ctx.tree({ kind: tree, x: t1.x, z: t1.z, y: ctx.groundAt(t1.x, t1.z),
    scale, rot: rng.range(0, 6.28), seed: rng.int(0, 9999) });
  const t2 = at(5.6, 0.4);
  ctx.tree({ kind: rng.chance(0.5) ? 'maple' : 'camellia', x: t2.x, z: t2.z,
    y: ctx.groundAt(t2.x, t2.z), scale: rng.range(0.7, 0.95),
    rot: rng.range(0, 6.28), seed: rng.int(0, 9999) });
  for (let k = 0; k < 3; k++) {
    const q = at(2.0 + k * 1.4, 0.85);
    ctx.tree({ kind: 'potted', x: q.x, z: q.z, y: ctx.groundAt(q.x, q.z),
      scale: rng.range(0.7, 1.1), rot: rng.range(0, 6.28), seed: rng.int(0, 9999) });
  }
  const st = at(1.7);
  ctx.prop({ kind: 'stepStone', x: st.x, z: st.z, y: ctx.groundAt(st.x, st.z),
    rot: a.across, seed: 7 });
  if (rng.chance(0.65)) {
    const cq = at(3.4, 0.7);
    ctx.prop({ kind: 'catAsleep', x: cq.x, z: cq.z, y: ctx.groundAt(cq.x, cq.z),
      rot: rng.range(0, 6.28), seed: 3 });
  }
}

/**
 * What is on the paving itself: the beige vending machines, the cedar hydrant
 * boxes, the drainage grates, the swept piles, a cat, and the cherries -- which
 * are set BEHIND the frontage line so what you see over the street is blossom
 * and not a bare trunk.
 */
export function streetDressing(ctx, c, B, opt) {
  const R = rngKit(opt.seed || 1);

  for (const t of opt.vending || []) {
    const side = R.sign();
    const a = atStreet(c.id, t, { side, offset: c.frontage - 0.46 });
    if (!a) continue;
    const y = ctx.groundAt(a.x, a.z);
    ctx.prop({ kind: 'vendingMachine', x: a.x, z: a.z, y, rot: a.across, seed: R.int(0, 9999) });
    opt.nudge.at(ctx, {
      x: a.x - a.nx * 0.5, y: y + 1.15, z: a.z - a.nz * 0.5,
      w: 1.3, h: 1.6, d: 1.0, label: 'buy a hot tea',
    });
  }
  for (const t of opt.hydrants || []) {
    const side = R.sign();
    const a = atStreet(c.id, t, { side, offset: c.frontage - 0.44 });
    if (a) hydrantBox(ctx, B, a.x, a.z, ctx.groundAt(a.x, a.z), a.across);
  }
  /* 桜 behind the frontage: the canopy comes over the eaves, the trunk does not
   * stand in the carriageway.  Ninenzaka in blossom is the postcard and it is a
   * picture of a roofline under blossom, not of a tree. */
  for (const [t, side, sc] of opt.sakura || []) {
    const a = atStreet(c.id, t, { side, offset: c.frontage + 2.6 });
    if (!a) continue;
    ctx.tree({ kind: 'sakura', x: a.x, z: a.z, y: ctx.groundAt(a.x, a.z),
      scale: sc, rot: R.range(0, 6.28), seed: R.int(0, 9999) });
  }

  for (const side of [-1, 1]) {
    for (const pt of alongStreet({
      street: c.id, side, from: 0.04, to: 0.96, spacing: 7.5, jitter: 2.2,
      seed: 71 + side, offset: c.half + 0.30,
    })) {
      const r = R.next();
      if (r < 0.28) ctx.prop({ kind: 'grating', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry, seed: R.int(0, 9999) });
      else if (r < 0.42) ctx.prop({ kind: 'drainCover', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry, seed: R.int(0, 9999) });
      else if (r < 0.50) ctx.prop({ kind: 'leafPile', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry, seed: R.int(0, 9999) });
      else if (r < 0.56) ctx.prop({ kind: 'puddle', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry, seed: R.int(0, 9999) });
    }
  }
  for (const t of opt.manholes || []) {
    const a = atStreet(c.id, t, { side: 0, offset: 0 });
    if (a) ctx.prop({ kind: 'manhole', x: a.x, z: a.z, y: a.y, rot: a.along, seed: 11 });
  }
  if (opt.cat != null) {
    const a = atStreet(c.id, opt.cat, { side: -1, offset: c.frontage - 0.9 });
    if (a) ctx.prop({ kind: 'catAsleep', x: a.x, z: a.z, y: ctx.groundAt(a.x, a.z),
      rot: a.across + 0.6, seed: 5 });
  }
}

/** The prompts.  Short, lower-case, physical. */
export function addInteractables(ctx, c, nudge, spots) {
  for (const s of spots) {
    const a = atStreet(c.id, s.t, { side: s.side, offset: c.frontage - (s.out ?? 0.85) });
    if (!a) continue;
    nudge.at(ctx, {
      x: a.x, y: ctx.groundAt(a.x, a.z) + (s.y ?? 1.3), z: a.z,
      w: 1.5, h: 1.3, d: 1.1, label: s.label,
    });
  }
}

/* ------------------------------------------------------------------ *
 * The machiya coffee house at 桝屋町349.
 *
 * A 100-year Taisho townhouse, 269.52 m^2 / 81.53 坪, whose main building and
 * 大塀 are designated traditional buildings inside the preservation district --
 * and whose outer wall is **the only one on this stretch still preserving its
 * original appearance**.  Two storeys, dark timber, upper-floor 格子 over the
 * paving, entry through a hanging noren, no illuminated fascia, and a front
 * 坪庭 with the tile laid in a scale/wave pattern.
 *
 * The building is built faithfully.  The plate on it says 珈琲 and nothing
 * else: STREET.md 7.2 -- model the form, never the mark.
 * ------------------------------------------------------------------ */
export function coffeeHouse(ctx, p, B, seed) {
  const court = 3.4;
  const b = makeMachiya(ctx, {
    x: p.x + p.street.nx * court, z: p.z + p.street.nz * court,
    ry: p.ry, width: p.width, depth: Math.max(9, p.depth - court),
    style: 'residence', floors: 2, seed, baker: B,
    latticeKind: 'senbon',
    timberTone: PAL.timberDark, plasterTone: PAL.plasterOchre,
    roofMaterial: 'tileOld', sudare: false, komayose: false, degoshi: 0,
    /* Entry through a hanging noren -- and nothing else on the elevation. */
    noren: { text: '珈琲', cloth: PAL.norenGreen, textColor: PAL.norenCream, panels: 5 },
    signboard: null,
    nameplate: '珈琲',
  });

  const bk = ctx.baker(B);
  const y = p.yLow;
  const M = trs(p.x, y, p.z, 0, p.ry, 0);
  const w = p.width, gate = 1.95;

  // 大塀 -- the designated wall: a stone base, plaster above, a tile cap
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -w / 2 : gate / 2;
    const x1 = s < 0 ? -gate / 2 : w / 2;
    if (x1 - x0 < 0.25) continue;
    const cx = (x0 + x1) / 2;
    bk.add(boxGeo(x1 - x0, 0.52, 0.32, cx, 0.26, 0.16), M, PAL.stoneWall, T_STONE);
    bk.add(boxGeo(x1 - x0, 1.40, 0.24, cx, 1.22, 0.16), M, PAL.plasterWarm, T_PALE);
    bk.add(boxGeo(x1 - x0 + 0.10, 0.10, 0.40, cx, 1.97, 0.16), M, PAL.tileRidge, T_TILE);
    const wc = toWorldOf(p, cx, -0.16);
    ctx.collideRot(wc.x, wc.z, x1 - x0, 0.45, p.ry, y + 2.0);
  }
  for (const s of [-1, 1]) {
    bk.add(boxGeo(0.17, 2.36, 0.17, s * gate / 2, 1.18, 0.16), M, PAL.timberDark, T_DEEP);
  }
  bk.add(boxGeo(gate + 0.74, 0.11, 0.66, 0, 2.42, 0.12), M, PAL.tileRoof, T_TILE);
  bk.add(boxGeo(gate + 0.84, 0.09, 0.10, 0, 2.49, -0.20), M, PAL.tileRidge, T_TILE);

  /* The 坪庭 floor: tile laid in a scale/wave pattern.  Staggered half-discs,
   * which is what 波打ち瓦敷き looks like from standing height. */
  for (let r = 0; r < 6; r++) {
    for (let k = -5; k <= 5; k++) {
      const x = k * 0.44 + (r % 2 ? 0.22 : 0);
      if (Math.abs(x) > w / 2 - 0.18) continue;
      const g = new THREE.CylinderGeometry(0.245, 0.245, 0.05, 8, 1, false, Math.PI * 0.12, Math.PI * 0.76);
      g.translate(x, 0.03, 0.6 + r * 0.50);
      bk.add(g, M, r % 2 ? PAL.tileRoof : PAL.tileEdge, T_TILE);
    }
  }
  const tp = toWorldOf(p, w * 0.30, -1.6);
  ctx.tree({ kind: 'maple', x: tp.x, z: tp.z, y: ctx.groundAt(tp.x, tp.z), scale: 0.9, seed: 991 });
  const lp = toWorldOf(p, -w * 0.30, -1.4);
  ctx.tree({ kind: 'shrub', x: lp.x, z: lp.z, y: ctx.groundAt(lp.x, lp.z), scale: 0.8, seed: 992 });
  return b;
}

/* ==================================================================== *
 * PART 5 -- 二年坂 itself.
 * ==================================================================== */

/**
 * The frontage, in walk order from the Nene-no-michi end.  `t` is the fraction
 * of the street the shop wants; the layout snaps it to the nearest free plot.
 * Everything here is from STREET.md 1.7.
 */
const NINEN_EAST = [
  { t: 0.06, kind: 'restaurant', name: '釜座', floors: 2 },
  { t: 0.13, kind: 'komono' },
  /* Peter Rabbit: "deliberately quaint traditional exterior conforming to
   * preservation rules -- no bright branding on the street."  So: none. */
  { t: 0.20, kind: 'wagashi', name: '菓子', floors: 2 },
  { t: 0.27, hero: true, display: 'plush', floors: 1.5, openBays: 2,
    noren: { text: '和', cloth: PAL.norenGreen, textColor: PAL.norenCream, panels: 3 },
    sign: { text: '和小物', board: PAL.timberPale, textColor: PAL.black, vertical: true, brush: true } },
  /* 香十: "a small single-noren shop" -- one noren and nothing else. */
  { t: 0.34, kind: 'incense', signboard: false, floors: 2 },
  { t: 0.40, kind: 'wagashi' },
  { t: 0.46, hero: true, display: 'apple', floors: 2, openBays: 2, proj: 0.66,
    timber: PAL.timberMid, plaster: PAL.plaster, roof: 'tile', noren: null,
    sign: { text: '飴林檎', board: PAL.white, textColor: PAL.redDeep, vertical: true, brush: false } },
  { t: 0.52, kind: 'wagashi', name: '艸堂' },
  /* かさぎ屋, est. 1914, beside the foot of the sixteen-step stair.  Meiji
   * two-storey machiya, a dark 長暖簾 over a wooden sliding door, no illuminated
   * signage and NO A-board.  The absence is the character. */
  { t: 0.58, hero: true, open: 'closed', floors: 2, style: 'machiya',
    timber: PAL.timberDark, plaster: PAL.plasterOchre, lattice: 'itoya', sign: null,
    noren: { text: 'かさぎ屋', cloth: PAL.norenBrown, textColor: PAL.paperWarm, panels: 5 },
    tatefuda: '甘党の素通り出来ぬ二寧坂' },
  { t: 0.66, hero: true, display: 'grill', openBays: 1, floors: 1.5,
    noren: { text: '煎餅', cloth: PAL.norenIndigo, textColor: PAL.norenCream, panels: 5 },
    sign: { text: '手焼せんべい', board: PAL.timberPale, textColor: PAL.black, vertical: true, brush: true } },
  { t: 0.73, kind: 'crafts' },
  { t: 0.79, kind: 'matcha' },
  { t: 0.86, kind: 'wagashi' },
  /* 阿古屋茶屋, 2F over 嘉祥窯: a stone-stepped exterior facing 二年坂, with the
   * 記名表 sign-up board set out on the step from 10:00. */
  { t: 0.93, hero: true, display: 'chilled', openBays: 1, floors: 2,
    noren: { text: '京漬物', cloth: PAL.norenBrown, textColor: PAL.norenCream, panels: 5 },
    sign: { text: '茶屋', board: PAL.timberPale, textColor: PAL.black, vertical: true, brush: true } },
];

const NINEN_WEST = [
  /* 二年坂まるん, 八坂通二年坂西入 -- the open wall of glass candy jars. */
  { t: 0.05, hero: true, display: 'candy', floors: 2, openBays: 2, proj: 0.52, noren: null,
    sign: { text: '京あめ', board: PAL.timberPale, textColor: PAL.black, vertical: true, brush: true } },
  { t: 0.12, kind: 'komono' },
  { t: 0.19, kind: 'souvenir', name: '富貴屋' },
  { t: 0.26, kind: 'incense', name: '二井三' },
  { t: 0.33, kind: 'komono' },
  { t: 0.40, kind: 'komono', name: 'ちりめん', floors: 2 },
  { t: 0.48, coffeehouse: true },
  { t: 0.56, kind: 'wagashi', name: '丹波黒' },
  { t: 0.63, kind: 'matcha' },
  { t: 0.70, kind: 'ceramics' },
  { t: 0.79, kind: 'crafts' },
  { t: 0.86, kind: 'restaurant' },
  /* 嘉祥窯 -- four generations of Kyo-yaki, on the corner with 三年坂. */
  { t: 0.93, hero: true, display: 'ceramic', openBays: 2, floors: 2,
    noren: { text: '清水焼', cloth: PAL.norenCream, textColor: PAL.black, panels: 3 },
    sign: { text: '清水焼窯元', board: PAL.timberPale, textColor: PAL.black, vertical: true, brush: true } },
];

export function build(ctx) {
  const rng = rngKit(20903);
  const B = 'ninenzaka';
  const c = ctx.getCorridor('ninenzaka');
  if (!c) return {};
  const nudge = makeNudger(ctx);
  const out = { buildings: [], plots: [], shops: 0 };
  const lanterns = [];

  /* ---------------------------------------------------------------- *
   * 1.  The plots.  Narrow frontages, party walls, and two gaps a side for
   *     the lanes that let light into the row.  The west gap at t = 0.747 is
   *     placed to open the pagoda sightline from the middle of the street.
   * ---------------------------------------------------------------- */
  const SKIP = { '-1': [[0.300, 0.332], [0.620, 0.652]], '1': [[0.220, 0.252], [0.732, 0.764]] };
  const OPT = { '-1': { base: 0.30, taper: 10 }, '1': { base: 0.34, taper: 10 } };
  const sides = {};
  for (const side of [-1, 1]) {
    sides[side] = layoutPlots({
      street: 'ninenzaka', side, from: 0.025, to: 0.975,
      mix: 'shop', gap: 0.05, seed: 611 + side, skip: SKIP[String(side)],
    });
    for (const p of sides[side]) p.depth = rng.range(9.5, 15.5);
  }

  /* 2.  Made ground.  EVERY terrace on BOTH sides before ANY building. */
  for (const side of [-1, 1]) {
    for (const p of sides[side]) planTerrace(ctx, c, p, p.depth, OPT[String(side)]);
  }
  for (const side of [-1, 1]) {
    layFacing(ctx, c, side, { from: 0.015, to: 0.985, baker: B, seed: 41 + side, opts: OPT[String(side)] });
  }

  /* ---------------------------------------------------------------- *
   * 3.  The frontage.
   * ---------------------------------------------------------------- */
  for (const side of [-1, 1]) {
    const plots = sides[side];
    const claimed = assignShops(plots, side < 0 ? NINEN_EAST : NINEN_WEST);
    out.plots.push(...plots);

    plots.forEach((p, i) => {
      const spec = claimed.get(i) || {};
      const seed = (104729 * (i + 3) + (side > 0 ? 977 : 31)) >>> 0;
      /* Not `p.rise`: on the stepped flight the terrace is only 0.3 m but the
       * fall across a four-ken frontage is 1.5 m, so the seat drops and the
       * plinth grows anyway.  What decides is where the shop FLOOR lands. */
      const raised = (p.terraceTop - p.yLow) > 0.50;
      let b;

      if (spec.coffeehouse) {
        b = coffeeHouse(ctx, p, B, seed);
      } else if (spec.hero || raised) {
        /* Terraced frontages go through `zakaFront` whatever they sell: the
         * kit hangs its goods off the seat, and on a metre of plinth that puts
         * them inside the stone. */
        b = zakaFront(ctx, p, {
          kind: spec.kind || (spec.hero ? null : pickTrade('ninenzaka', rng.next())),
          floors: spec.floors ?? (rng.chance(0.40) ? 2 : 1.5),
          timber: spec.timber ?? (rng.chance(0.12) ? PAL.bengaraDeep : rng.chance(0.22) ? PAL.timberMid : PAL.timber),
          plaster: spec.plaster ?? (rng.chance(0.40) ? PAL.plasterOchre : PAL.plasterWarm),
          ...spec,
        }, B, seed);
        if (spec.tatefuda) {
          const w = toWorldOf(p, p.width * 0.36, -0.62);
          tateFuda(ctx, B, w.x, ctx.groundAt(w.x, w.z), w.z, p.ry + 0.25, spec.tatefuda);
        }
      } else {
        /* At grade, the kit's own shopfront: menus, price strips, A-boards and
         * per-trade clutter, on the 二寧坂 mix -- 0.40 food, 0.15 craft,
         * 0.25 komono, 0.15 restaurant. */
        b = makeShopfront(ctx, {
          x: p.x, z: p.z, ry: p.ry, width: p.width, depth: p.depth,
          kind: spec.kind || pickTrade('ninenzaka', rng.next()),
          name: spec.name || null, seed, baker: B,
          floors: spec.floors ?? (rng.chance(0.40) ? 2 : 1.5),
          timberTone: rng.chance(0.12) ? PAL.bengaraDeep : rng.chance(0.22) ? PAL.timberMid : PAL.timber,
          plasterTone: rng.chance(0.40) ? PAL.plasterOchre : PAL.plasterWarm,
          roofMaterial: rng.chance(0.28) ? 'tileOld' : 'tile',
          signboard: spec.signboard === false ? false : undefined,
          sodekabe: rng.chance(0.18), udatsu: rng.chance(0.05),
        });
      }

      out.buildings.push(b);
      out.shops++;
      ctx.stats.shopfronts++;

      /* 提灯 under the 通り庇 on about a third of them -- the reason to walk
       * this street at dusk. */
      if (rng.chance(0.30)) {
        for (const k of [-1, 1]) {
          const w = toWorldOf(p, k * Math.min(0.78, p.width * 0.30), -0.55);
          lanterns.push({ x: w.x, z: w.z, y: b.hisashiY - 0.12, ry: p.ry });
          ctx.light({ x: w.x, y: b.hisashiY - 0.32, z: w.z, color: PAL.lanternLit,
            intensity: 0.30, distance: 6 });
        }
      }
      dressPavement(ctx, rng, p, b);
    });
  }

  /* 4.  The lanes, and the cherries that stand in them. */
  sideLane(ctx, c, -1, 0.316, B, rng, { tree: 'shidare', scale: 1.30 });
  sideLane(ctx, c, -1, 0.636, B, rng, { tree: 'sakura', scale: 1.32 });
  sideLane(ctx, c, 1, 0.236, B, rng, { tree: 'sakura', scale: 1.35 });
  sideLane(ctx, c, 1, 0.748, B, rng, { tree: 'sakura', scale: 1.25 });

  /* 5.  The paving. */
  streetDressing(ctx, c, B, {
    nudge,
    vending: [0.11, 0.53, 0.84],
    hydrants: [0.09, 0.37, 0.68, 0.90],
    sakura: [[0.025, -1, 1.05], [0.985, 1, 0.95]],
    manholes: [0.15, 0.47, 0.80],
    cat: 0.42,
    seed: 5501,
  });

  /* 6.  Interactables.  Small, physical, and never a game mechanic. */
  addInteractables(ctx, c, nudge, [
    { t: 0.05, side: 1, label: 'look at the candy jars', y: 1.6, out: 0.9 },
    { t: 0.46, side: -1, label: 'look at the candy apples', y: 1.4 },
    { t: 0.58, side: -1, label: 'part the noren', y: 1.7 },
    { t: 0.66, side: -1, label: 'smell the grill', y: 1.3 },
    { t: 0.93, side: 1, label: 'inspect the pottery', y: 1.5, out: 0.9 },
  ]);
  /* 風鈴 under an eave, and a resident's mamachari against a wall. */
  {
    const a = atStreet('ninenzaka', 0.24, { side: -1, offset: c.frontage - 0.5 });
    if (a) {
      const y = ctx.groundAt(a.x, a.z);
      ctx.prop({ kind: 'windChime', x: a.x, z: a.z, y, rot: a.across, seed: 21 });
      nudge.at(ctx, { x: a.x, y: y + 2.2, z: a.z, label: 'ring the wind chime' });
    }
    const e = atStreet('ninenzaka', 0.715, { side: 1, offset: c.frontage - 0.62 });
    if (e) {
      const y = ctx.groundAt(e.x, e.z);
      ctx.prop({ kind: 'bicycle', x: e.x, z: e.z, y, rot: e.across + Math.PI / 2, seed: 22 });
      nudge.at(ctx, { x: e.x, y: y + 1.0, z: e.z, w: 1.1, h: 1.0, d: 1.7,
        label: 'ring the bicycle bell' });
    }
  }

  lanternRun(ctx, lanterns, B);
  return out;
}
