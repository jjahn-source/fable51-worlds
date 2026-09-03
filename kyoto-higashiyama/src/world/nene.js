import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT, celTex } from '../core/toon.js';
import { rngKit, trs, stairs, taperBox, beam, lerp, clamp } from '../core/util.js';
import {
  lanternTex, woodenSign, verticalSign, templePlaque, noticeBoard,
} from '../core/textures.js';
import { makeMachiya } from '../kit/machiya.js';
import { makeShopfront } from '../kit/shopfront.js';
import { makeStoneLantern, makeChozu } from '../kit/shrine.js';
import { gableRoof, hipRoof, rafters } from '../kit/roof.js';
import { layoutPlots, alongStreet, atStreet } from './plots.js';

/* ------------------------------------------------------------------ *
 * ねねの道 と 石塀小路 -- the quiet act.
 *
 * The route goes dense (Gion) -> QUIET (here) -> revelation (the pagoda) ->
 * dense (Ninenzaka) -> payoff (Kiyomizu).  This module is the trough, and the
 * whole of its art direction follows from that one fact: **there is almost
 * nothing to buy on it.**  Twenty-odd frontages over 290 m, of which exactly
 * two trade to the street; against Hanamikoji's hundred-plus.  If this street
 * gets shopfronts the rhythm of the entire walk goes flat.
 *
 * ---------------------------------------------------------- THE SECTION
 *
 * 290 m, bearing 182.5 deg, 御影石 slab paving full width (undergrounded
 * 1995-98, so no poles), and -- the thing that makes it feel unlike every
 * other street on the route -- **it is walled on one side and open on the
 * other.**  The survey's face-to-face spread is 6.2-24.2 m, and the reason the
 * p90 is 24 is that the 高台寺 side has no frontage on it at all: a stone
 * revetment, a 築地塀 on top of it, and trees.  You walk it with a building
 * line on your right and a temple bank on your left.
 *
 * ------------------------------------------------ WORKING WITH streets.js
 *
 * `streets.js` lays an automatic 石垣 down this street's side **+1**, which --
 * side +1 being the right hand of somebody walking south, and south being +Z --
 * is the **west** side, not the Kodai-ji side its comment claims.  That is not
 * a thing this module can move, and geography settles which way round the
 * street has to be: `LANDMARK.kodaijiPrecinct` is at x = 192 and the hero view
 * `nene-kodaiji` looks *east* up the approach, so the temple is east and the
 * frontage is west.
 *
 * So the automatic wall is taken for what it is on the west side -- the low
 * coursed 石垣 that every plot along here stands behind -- and the frontage is
 * set back 1.9 m to sit on top of it, which is exactly the section a walled
 * Higashiyama residence has anyway.  The temple's own 石垣 + 築地塀 is built
 * here, on the east, on a terrace this module registers.
 *
 * The automatic wall has no openings in it, and three things have to pass
 * through: both mouths of 石塀小路 and the ryokan forecourt.  `openWall`
 * below cuts them, and it is the one piece of this file that reaches outside
 * its own district -- see the note there.
 *
 * ------------------------------------------------------------ 石塀小路
 *
 * 2.8 m wide.  With the walker's 0.34 m radius that is 2.12 m of usable width,
 * so the walls are the only things in it: everything else -- lantern, chime,
 * nameplate -- is either fixed flat to the wall or hung above 2.0 m.  The
 * gates are cut *into* the wall rather than standing out from it.
 *
 * It is roofed by the buildings either side and it is dark, and that contrast
 * -- out of the bright open promenade into a 3 m stone slot -- is the best
 * thing in the district, so the eaves oversail from both sides and leave a
 * 1.7 m slot of sky.
 * ------------------------------------------------------------------ */

export const id = 'nene';

/* --------------------------------- set-out -------------------------------- */

const EAST_OFF = 6.00;      // the temple revetment's face, from the centreline
const EAST_RISE = 1.70;     // how far the precinct stands above the paving
const EAST_DEEP = 13.0;     // how far back the terrace is modelled
const WEST_SET = 1.90;      // frontage setback, so the plots sit behind the 石垣

/* 台所坂 -- the approach.  `LANDMARK.kodaijiGate` (60.5, -220.7) sits at
 * s = 147.6 on the street, and the bay the flight climbs out of is opened in
 * the precinct wall either side of it.
 *
 * The bay's north edge is set at z = -230.5 for a reason that is only visible
 * in a render: the hero camera `nene-kodaiji` stands at (64, -228) and looks
 * ESE across the approach, so a wall anywhere between -228 and the flight
 * fills the entire frame with plaster.  The first version of this district did
 * exactly that. */
const APPROACH_S0 = 137.8, APPROACH_S1 = 155.0;
const BAY_Z0 = -230.5, BAY_Z1 = -213.5;             // the walled bay
const FLIGHT_Z = -221.3, FLIGHT_W = 12.6;           // and the flight inside it

/* Where the automatic 石垣 has to be opened, in arc length along the street. */
const GAPS = [
  [146.0, 153.5],   // 石塀小路, the north mouth -- opposite the temple steps
  [178.0, 190.0],   // the ryokan forecourt
  [212.0, 219.5],   // 石塀小路, the south mouth
];

/* ------------------------------------------------------------------ *
 * Cutting a gateway through a wall this district does not own.
 *
 * `layRetaining` in `streets.js` runs an unbroken 石垣 down the west side of
 * Nene-no-michi from t 0.02 to 0.86 and collides every panel of it.  Both
 * mouths of 石塀小路 and the forecourt are inside that run, so without an
 * opening the alley is not merely awkward, it is unreachable -- `walkthrough`
 * reports it as a STUCK, and did so before this district existed.
 *
 * The wall is not this module's to edit, but it has not been *built* yet:
 * district builders run before the bakers are flushed, so the panels are still
 * sitting in the `streetworks` baker as world-space geometry and in
 * `ctx.colliders` as boxes.  Dropping the handful that fall inside a gateway
 * rectangle is the same operation as leaving a gap in it, done a step later.
 * Everything is feature-tested, because this is a reach across a module
 * boundary and it must fail quiet rather than take the district down.
 * ------------------------------------------------------------------ */
function openWall(ctx, rects) {
  if (!rects.length) return 0;
  const inside = (x, z) =>
    rects.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);

  let cut = 0;
  const list = ctx.colliders;
  if (Array.isArray(list)) {
    for (let i = list.length - 1; i >= 0; i--) {
      const c = list[i];
      if (inside((c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2)) { list.splice(i, 1); cut++; }
    }
  }

  const b = ctx.baker('streetworks');
  if (!b || !(b.buckets instanceof Map)) return cut;
  for (const bucket of b.buckets.values()) {
    if (!Array.isArray(bucket.parts)) continue;
    bucket.parts = bucket.parts.filter((p) => {
      const g = p.geometry;
      if (!g || !g.attributes || !g.attributes.position) return true;
      if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox;
      return !inside((bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2);
    });
  }
  return cut;
}

/* ------------------------------------------------------------------ */

export function build(ctx) {
  const rng = rngKit(60517);
  const BK = 'nene';
  const B = ctx.baker(BK);
  const out = { buildings: [], plots: [], interactables: 0 };

  /* Shading signatures.  Keeping them to eight is what keeps the whole
   * district inside a handful of draw calls. */
  const O = {
    stone: { bands: 3, tint: TINT.cool },
    stonePale: { bands: 'soft3', tint: TINT.cool },
    plaster: { bands: 'soft3', tint: TINT.cool },
    timber: { bands: 3, tint: TINT.warm },
    timberDeep: { bands: 4, tint: TINT.warm },
    tile: { bands: 3, tint: TINT.cool },
    green: { bands: 3, tint: TINT.green },
    dark: { bands: 'deep', tint: TINT.cool },
  };

  const addWorld = (geo, color, opts) => { B.add(geo, null, color, opts); geo.dispose(); };
  const add = (geo, x, y, z, ry, color, opts) => {
    B.add(geo, trs(x, y, z, 0, ry, 0), color, opts);
    geo.dispose();
  };
  const box = (w, h, d, x, y, z, ry, color, opts) => add(
    new THREE.BoxGeometry(Math.max(2e-3, w), Math.max(2e-3, h), Math.max(2e-3, d)),
    x, y, z, ry, color, opts
  );
  const parts = (list, x, y, z, ry) => {
    for (const p of list) add(p.geometry, x, y, z, ry, p.color, p.opts);
  };

  /** An interactable: an invisible box that still raycasts, plus its prompt. */
  const hit = (x, y, z, w, h, d, label, action) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    m.position.set(x, y, z);
    m.visible = false;
    ctx.add(m);
    ctx.interact({ hitbox: m, label, action });
    out.interactables++;
    return m;
  };

  const street = ctx.getCorridor('nene');
  const alley = ctx.getCorridor('ishibekoji');
  if (!street || !alley) { console.warn('[nene] corridors missing'); return out; }
  const L = street.length;

  /**
   * A frame on a street at arc length `s`.  `n` is the outward normal on the
   * named side; `ry` lays a box ALONG the street (local +z runs with travel,
   * local +x is the side-(-1) normal), which is the convention `streets.js`
   * uses and the one every wall panel here is built in.
   */
  const frameAt = (c, s, side) => {
    const p = c.pointAt(clamp(s, 0, c.length));
    return {
      x: p.x, z: p.z, tx: p.tx, tz: p.tz,
      nx: -p.tz * side, nz: p.tx * side,
      ry: Math.atan2(p.tx, p.tz),
    };
  };
  /** A point `off` metres to `side` of the street at `s`. */
  const off = (c, s, side, d) => {
    const f = frameAt(c, s, side);
    return { x: f.x + f.nx * d, z: f.z + f.nz * d, ry: f.ry, nx: f.nx, nz: f.nz };
  };

  /* ------------------------------------------------------------------ *
   * 1.  The gateways through the automatic 石垣.
   * ------------------------------------------------------------------ */
  {
    const rects = GAPS.map(([s0, s1]) => {
      const xs = [], zs = [];
      for (const s of [s0, s1]) {
        for (const d of [2.9, 7.8]) {
          const p = off(street, s, 1, d);
          xs.push(p.x); zs.push(p.z);
        }
      }
      return {
        x0: Math.min(...xs) - 0.1, x1: Math.max(...xs) + 0.1,
        z0: Math.min(...zs) - 0.1, z1: Math.max(...zs) + 0.1,
      };
    });
    openWall(ctx, rects);
  }

  /* ------------------------------------------------------------------ *
   * 2.  高台寺 -- the east bank.
   *
   * A terrace 1.35 m above the paving, held by a coursed 石垣 with a
   * pronounced batter, carrying a 築地塀 set 0.55 m back from the revetment
   * face.  ARCH 7.7 puts a large one at 4.0 m; a precinct boundary wall like
   * this is smaller, 2.15 m with three 定規筋 stripes -- five is imperial and
   * would be a rank error.
   *
   * Total above the paving: 1.35 + 2.15 + the tiled cap, a shade under 4 m,
   * which is what closes the east side without closing the sky.
   *
   * **Platforms are registered before anything is seated**, and because
   * `buildGround` has already run they are also *drawn* here -- a platform
   * with no geometry over it is a player standing in mid-air above a field.
   * ------------------------------------------------------------------ */
  const EAST_S0 = 10, EAST_S1 = 252, EAST_SEG = 6.0;
  /* The approach cuts the terrace in two, so the flight has somewhere to
   * climb; either side of it the bank runs deeper to take the flanking walls. */
  const inApproach = (s) => s > APPROACH_S0 && s < APPROACH_S1;

  for (let s = EAST_S0; s < EAST_S1; s += EAST_SEG) {
    const s1 = Math.min(EAST_S1, s + EAST_SEG);
    const a = off(street, s, -1, EAST_OFF);
    const b = off(street, s1, -1, EAST_OFF);
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 0.2) continue;
    const mid = off(street, (s + s1) / 2, -1, EAST_OFF);
    const gy = Math.min(ctx.groundAt(a.x, a.z), ctx.groundAt(b.x, b.z));
    const top = gy + EAST_RISE;
    const deep = inApproach(s + EAST_SEG * 0.5) ? 0 : EAST_DEEP;
    if (!deep) continue;

    /* The terrace itself: registered, then built, so collision and the thing
     * the player can see are the same surface. */
    const cx = mid.x + mid.nx * (0.30 + deep / 2);
    const cz = mid.z + mid.nz * (0.30 + deep / 2);
    ctx.platform({
      x0: Math.min(a.x, b.x) + 0.30, x1: Math.max(a.x, b.x) + 0.30 + deep,
      z0: Math.min(a.z, b.z) - 0.15, z1: Math.max(a.z, b.z) + 0.15,
      top, step: 0.34,
    });
    box(deep, 1.7, len + 0.12, cx, top - 0.85, cz, mid.ry,
      rng.chance(0.4) ? PAL.mossDeep : PAL.moss, O.green);

    /* 石垣 -- the coursed granite that holds the precinct up.
     *
     * It is laid as **blocks, not courses**.  The first version ran one long
     * box per course, and at 1600 x 900 that is not a stone wall: with no
     * vertical joint anywhere in 250 m it reads as horizontal weatherboard,
     * and the render showed a temple bank that looked like a fence.  Each
     * course is broken into 0.9-1.4 m blocks with a few millimetres of step
     * between them, which is what puts the vertical joint in and what makes
     * the ink pass draw masonry. */
    const courses = 6, ch = (EAST_RISE + 0.32) / courses;
    for (let k = 0; k < courses; k++) {
      const inset = (k / courses) * 0.20;          // 1-in-8 batter
      const nb = Math.max(1, Math.round(len / 1.15));
      for (let j = 0; j < nb; j++) {
        const bl = len / nb;
        const t = (j + 0.5) / nb - 0.5;
        const bx = mid.x + mid.nz * t * len, bz = mid.z - mid.nx * t * len;
        const jog = ((j + k) % 3) * 0.012;
        box(0.80 - inset * 0.4 - jog, ch * 1.02, bl - 0.035,
          bx + mid.nx * (0.28 + inset + jog), gy - 0.32 + ch * (k + 0.5),
          bz + mid.nz * (0.28 + inset + jog), mid.ry,
          /* Granite, not a chequerboard.  One tone carries the wall and the
           * others are occasional: at equal weights the courses read as a
           * tiled floor stood on end, which is what the first pass looked
           * like.  PAL.stone is far too pale for a block and is kept for the
           * coping alone. */
          k < 2 && rng.chance(0.20) ? PAL.stoneMoss
            : rng.chance(0.76) ? PAL.stoneWall : PAL.stoneWallDark, O.stone);
      }
    }
    // the 天端石 coping the 築地塀 stands behind
    box(0.94, 0.17, len + 0.06, mid.x + mid.nx * (0.28 + 0.20),
      gy + EAST_RISE + 0.085, mid.z + mid.nz * (0.28 + 0.20), mid.ry,
      PAL.stone, O.stone);

    /* The verge between the paving and the wall.  ねねの道 is full-width
     * 御影石 with a planted strip at the temple's foot, and without it the
     * bare terrain colour shows as a three-metre band of nothing. */
    box(EAST_OFF - 3.55, 0.30, len + 0.06,
      mid.x + mid.nx * ((3.35 + EAST_OFF - 0.4) / 2), gy + 0.02,
      mid.z + mid.nz * ((3.35 + EAST_OFF - 0.4) / 2), mid.ry,
      rng.chance(0.45) ? PAL.mossDeep : rng.chance(0.5) ? PAL.moss : PAL.gravelDark,
      O.green);
    ctx.collideRot(mid.x + mid.nx * 0.34, mid.z + mid.nz * 0.34, 0.9, len, mid.ry, top);
  }

  /* ------------------------------------------------------------------ *
   * 築地塀 -- the roofed earthen wall on top of the revetment.
   *
   * ARCH 7.7: rammed earth (版築) in lifts, battered about 4 degrees a face,
   * 聚楽壁 ochre, capped with a tiled roof, and carrying 定規筋 rank stripes in
   * the upper third -- five for an imperial precinct, three for the lowest of
   * the graded set, so three here.
   *
   * `shrine.js` has `makeTsuijibei` and this was built on it first.  It comes
   * out wrong at this scale and the render is unambiguous about why: the kit
   * stands four 版築 lift lines 35 mm PROUD of the face, each casting its own
   * shadow line, and with three stripes above them a 2.3 m wall carries seven
   * horizontal shadows and reads as a Venetian blind two hundred metres long.
   * So the lifts are drawn flush and dark here, the stripes are thin and only
   * in the upper third, and the roof gets a real overhang with a shadow under
   * it -- which is the line that should be doing the drawing.  Worth a note to
   * whoever owns the kit; it is a good wall everywhere it is short.
   * ------------------------------------------------------------------ */
  const earthWall = (pts, { height = 2.30, seg = 4.0, stripes = 3 } = {}) => {
    const baseT = height * 0.44, topT = height * 0.30;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1];
      const dx = c.x - a.x, dz = c.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.05) continue;
      const ang = Math.atan2(dx, dz);
      const nx = -dz / len, nz = dx / len;
      const n = Math.max(1, Math.round(len / seg));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const cx = lerp(a.x, c.x, t), cz = lerp(a.z, c.z, t);
        const gy = ctx.groundAt(cx, cz);
        const sl = len / n + 0.04;
        // the stone footing
        box(baseT + 0.18, 0.26, sl, cx, gy + 0.13, cz, ang, PAL.stoneWall, O.stone);
        // the rammed body, battered
        const g = taperBox(sl, baseT, height, 1.0, topT / baseT);
        g.rotateY(ang + Math.PI / 2);
        g.translate(cx, gy + 0.24, cz);
        addWorld(g, PAL.plasterOchre, O.plaster);
        // 版築 -- the lift lines, FLUSH and dark: a shadow, not a ledge
        for (let l = 1; l <= 2; l++) {
          const f = l * 0.26;
          box(lerp(baseT, topT, f) + 0.006, 0.028, sl, cx, gy + 0.24 + height * f, cz,
            ang, PAL.plasterDark, O.plaster);
        }
        // 定規筋 -- thin, and only in the upper third
        for (let l = 0; l < stripes; l++) {
          const f = 0.70 + l * 0.085;
          box(lerp(baseT, topT, f) + 0.045, 0.055, sl, cx, gy + 0.24 + height * f, cz,
            ang, PAL.plaster, O.plaster);
        }
        // the roof: two slopes, a heavy ridge course, and a dark eave shadow
        const capY = gy + 0.24 + height;
        const over = 0.30;
        for (const sg of [-1, 1]) {
          const slab = new THREE.BoxGeometry(topT / 2 + over, 0.11, sl);
          slab.rotateZ(sg * 0.40);
          add(slab, cx + nx * sg * (topT / 4 + over / 2), capY + 0.10,
            cz + nz * sg * (topT / 4 + over / 2), ang, PAL.tileRoof, O.tile);
          box(0.10, 0.07, sl, cx + nx * sg * (topT / 2 + over - 0.02), capY - 0.02,
            cz + nz * sg * (topT / 2 + over - 0.02), ang, PAL.tileRidge, O.tile);
        }
        box(0.34, 0.19, sl, cx, capY + 0.26, cz, ang, PAL.tileRidge, O.tile);
      }
      ctx.collideRot((a.x + c.x) / 2, (a.z + c.z) / 2, baseT + 0.2, len,
        Math.atan2(dx, dz), ctx.groundAt((a.x + c.x) / 2, (a.z + c.z) / 2) + height + 0.5);
    }
  };

  /* The wall along the street, in runs that skip the approach bay. */
  const tsuijiRun = (s0, s1, d) => {
    const pts = [];
    for (let s = s0; s <= s1 + 0.01; s = Math.min(s1, s + 8)) {
      const p = off(street, s, -1, d);
      pts.push({ x: p.x, z: p.z });
      if (s >= s1) break;
    }
    if (pts.length > 1) earthWall(pts, { height: 2.30 });
  };
  tsuijiRun(EAST_S0 + 1, APPROACH_S0, EAST_OFF + 0.80);
  tsuijiRun(APPROACH_S1, EAST_S1 - 1, EAST_OFF + 0.80);

  /* ------------------------------------------------------------------ *
   * 3.  台所坂 -- the Kodai-ji approach.
   *
   * `LANDMARK.kodaijiGate` (60.5, -220.7) is on the street and the temple is
   * up and east of it, so the precinct wall opens into a 17 m bay and a broad
   * flight climbs 2.9 m out of it to a gate.
   *
   * It is built **wide** -- 12.6 m, nearly the width of the bay -- rather than
   * as a 6 m stair in a trench, and that is a composition decision as much as
   * an archaeological one: a narrow flight needs 2.9 m cheek walls to retain
   * the fill either side of it, and from the hero camera, which is 8 m off the
   * axis, those walls are all you see.  Wide, the flight is its own ground and
   * the cheeks stay ankle-high.
   *
   * Proportions are Kyoto slope-stair: rise 0.145, tread 0.80 -- much closer
   * to a ramp with interruptions than to a staircase.  `stairs()` builds the
   * treads and every one of them is registered as a platform, so the stone the
   * player sees and the surface their feet are on are the same numbers.
   * ------------------------------------------------------------------ */
  let gateHit = null;
  {
    const foot = { x: 64.6, z: FLIGHT_Z };
    const y0 = ctx.groundAt(foot.x, foot.z);
    const yMid = y0 + 1.45;
    const yTop = y0 + 2.90;
    const zN = FLIGHT_Z - FLIGHT_W / 2, zS = FLIGHT_Z + FLIGHT_W / 2;

    /* The landing and the forecourt, registered before anything sits on them. */
    ctx.platform({ x0: 72.6, x1: 76.2, z0: zN, z1: zS, top: yMid, step: 0.34 });
    ctx.platform({ x0: 83.8, x1: 92.4, z0: zN + 1.4, z1: zS - 1.4, top: yTop, step: 0.34 });

    const flights = [
      { x0: 64.6, x1: 72.6, y0, y1: yMid },
      { x0: 76.2, x1: 84.2, y0: yMid, y1: yTop },
    ];
    for (const f of flights) {
      const st = stairs(f.x0, f.y0, FLIGHT_Z, f.x1, f.y1, FLIGHT_Z, FLIGHT_W, 0.145);
      addWorld(st.geometry, PAL.paving, O.stone);
      for (const t of st.treads) {
        ctx.platform({
          x0: t.x - t.hd - 0.02, x1: t.x + t.hd + 0.02, z0: zN, z1: zS,
          top: t.y, step: st.rise + 0.30,
        });
      }
      /* The nosing, standing 30 mm proud of the riser.  It is the only thing
       * that draws a flight seen from above. */
      for (let i = 1; i <= st.steps; i++) {
        const x = f.x0 + st.tread * i;
        box(0.12, 0.055, FLIGHT_W, x - 0.055, f.y0 + st.rise * i - 0.012, FLIGHT_Z, 0,
          PAL.pavingLit, O.stonePale);
      }
    }
    box(3.6, 1.2, FLIGHT_W, 74.4, yMid - 0.60, FLIGHT_Z, 0, PAL.paving, O.stone);
    box(8.6, 2.4, FLIGHT_W - 2.8, 88.1, yTop - 1.20, FLIGHT_Z, 0, PAL.gravel, O.stonePale);

    /* The low cheeks either side of the flight, and the revetment that holds
     * the forecourt up where it stands above them. */
    const cheek = (zc, x0, x1) => {
      for (let x = x0; x < x1; x += 2.2) {
        const len = Math.min(2.2, x1 - x) + 0.05;
        const cx = x + len / 2;
        const stair = cx < 72.6 ? lerp(y0, yMid, (cx - 64.6) / 8.0)
          : cx < 76.2 ? yMid
            : cx < 84.2 ? lerp(yMid, yTop, (cx - 76.2) / 8.0) : yTop;
        const gnd = ctx.groundAt(cx, zc + Math.sign(zc - FLIGHT_Z) * 1.4);
        const topY = stair + 0.42;
        const botY = Math.min(stair, gnd) - 0.30;
        const h = topY - botY;
        const nc = Math.max(1, Math.round(h / 0.34));
        for (let k = 0; k < nc; k++) {
          box(0.54 - (k / nc) * 0.11, (h / nc) * 1.05, len, cx, botY + (h / nc) * (k + 0.5), zc, 0,
            k < 2 && rng.chance(0.4) ? PAL.stoneMoss
              : rng.chance(0.5) ? PAL.stoneWall : PAL.stoneWallDark, O.stone);
        }
        box(0.70, 0.14, len, cx, topY + 0.06, zc, 0, PAL.stone, O.stone);
        if (h > 0.9) ctx.collide(cx - len / 2, zc - 0.4, cx + len / 2, zc + 0.4, topY);
      }
    };
    cheek(zN - 0.30, 64.4, 92.4);
    cheek(zS + 0.30, 64.4, 92.4);
    // the forecourt's east face, closing the bay
    for (let z = zN + 1.4; z < zS - 1.4; z += 2.2) {
      const len = Math.min(2.2, zS - 1.4 - z) + 0.05;
      box(0.62, yTop - y0 + 0.6, len, 92.2, (yTop + y0) / 2 - 0.3, z + len / 2, 0,
        rng.chance(0.5) ? PAL.stoneWall : PAL.stoneWallDark, O.stone);
    }

    /* 親柱 -- the newels at the foot.  They are what says "a flight starts
     * here" from a hundred metres up the street. */
    for (const zc of [zN + 0.1, zS - 0.1]) {
      box(0.44, 1.30, 0.44, 64.6, y0 + 0.55, zc, 0, PAL.stone, O.stone);
      add(new THREE.ConeGeometry(0.31, 0.24, 4), 64.6, y0 + 1.26, zc,
        Math.PI / 4, PAL.stone, O.stone);
      ctx.collide(64.4, zc - 0.25, 64.85, zc + 0.25, y0 + 1.3);
    }

    /* The precinct wall returns east along both edges of the bay -- these are
     * what make the flight read as being *inside* the temple's boundary
     * rather than as a stair in a field. */
    for (const zc of [BAY_Z0 + 0.5, BAY_Z1 - 0.5]) {
      earthWall([{ x: 70, z: zc }, { x: 78, z: zc }, { x: 86, z: zc }, { x: 93.2, z: zc }],
        { height: 2.10 });
    }

    /* -------------------------------- the gate ------------------------------ *
     * 棟門 -- two posts, a header, board doors and a tiled gable.  It is
     * CLOSED, which is both true of a temple gate outside opening hours and
     * the right answer for a quiet act: the player climbs, reads the board and
     * turns back down into the street.  Depth is built outward (KIT 10) -- the
     * doors sit 0.30 m behind the post faces, in a real reveal.
     * ------------------------------------------------------------------ */
    const gx = 87.6, gz = FLIGHT_Z, gy = yTop;
    const clear = 2.70, postH = 3.05, postW = 0.34;

    for (const sz of [-1, 1]) {
      box(0.52, 0.30, 0.52, gx, gy + 0.14, gz + sz * (clear / 2 + postW / 2), 0,
        PAL.stoneDark, O.stone);
      box(postW, postH, postW, gx, gy + 0.28 + postH / 2,
        gz + sz * (clear / 2 + postW / 2), 0, PAL.timberDark, O.timberDeep);
      // the wing walls that tie the gate into the 築地塀
      box(0.72, 2.30, 1.90, gx, gy + 1.15,
        gz + sz * (clear / 2 + postW + 0.95), 0, PAL.plasterOchre, O.plaster);
      box(0.96, 0.16, 2.06, gx, gy + 2.34,
        gz + sz * (clear / 2 + postW + 0.95), 0, PAL.tileRidge, O.tile);
      ctx.collide(gx - 0.5, gz + sz * (clear / 2) - 0.1,
        gx + 0.5, gz + sz * (clear / 2 + postW + 1.9), gy + 2.4);
    }
    // 冠木 -- the head beam, and the 蟇股 above it
    box(0.42, 0.34, clear + postW * 2 + 0.4, gx, gy + 0.28 + postH - 0.17, gz, 0,
      PAL.timberDark, O.timberDeep);
    box(0.30, 0.46, 0.62, gx, gy + 0.28 + postH + 0.20, gz, 0, PAL.timberWarm, O.timber);

    // the leaves, shut, with iron studs on a boarded frame
    for (const sz of [-1, 1]) {
      box(0.10, 2.42, clear / 2 - 0.02, gx + 0.24, gy + 1.25,
        gz + sz * (clear / 4 + 0.01), 0, PAL.timber, O.timberDeep);
      for (let k = 0; k < 3; k++) {
        box(0.13, 0.10, clear / 2 - 0.06, gx + 0.24, gy + 0.55 + k * 0.72,
          gz + sz * (clear / 4 + 0.01), 0, PAL.timberDark, O.timberDeep);
        add(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 6),
          gx + 0.185, gy + 0.75 + k * 0.62, gz + sz * (clear / 4),
          0, PAL.iron, { bands: 3, tint: TINT.cool });
      }
    }
    ctx.collide(gx - 0.45, gz - clear / 2 - 0.4, gx + 0.45, gz + clear / 2 + 0.4, gy + 3.4);

    parts(gableRoof({
      w: clear + postW * 2 + 2.1, d: 2.40, pitch: 0.50, eave: 1.20,
      material: 'tile', mukuri: 0, sori: 0.10, cornerLift: 0.5,
      ridgeCourses: 4, y: gy + 0.28 + postH + 0.42, ridgeAlongX: true, gableEnd: true,
    }).parts, gx, 0, gz, Math.PI / 2);
    parts(rafters({
      w: clear + postW * 2 + 1.5, depth: 1.15, y: gy + 0.28 + postH + 0.36,
      spacing: 0.30, size: 0.06, pitch: 0.40,
    }), gx, 0, gz, Math.PI / 2);

    /* 扁額 -- the plaque over the doors, and the admission board beside it.
     * The 2026-04-01 rise took 高台寺 to 800/400; anything older shows
     * 600/250, which is the kind of detail a reference photograph will lie
     * about. */
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.10, 0.44),
      celTex(templePlaque('高台寺'), { bands: 3, tint: TINT.warm })
    );
    plaque.position.set(gx - 0.20, gy + 0.28 + postH - 0.62, gz);
    plaque.rotation.y = -Math.PI / 2;
    plaque.userData.noOutline = true;
    ctx.add(plaque);

    const notice = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.62), celTex(
      noticeBoard([
        '拝観料　大人 800円', '中高生 400円',
        '拝観時間　9:00〜17:30', '（17:00受付終了）',
      ], { board: 0x3a3028, textColor: PAL.paper, accent: PAL.gold, w: 320, h: 256 }),
      { bands: 3, tint: TINT.cool }
    ));
    notice.position.set(gx - 0.78, gy + 1.44, gz - clear / 2 - 1.25);
    notice.rotation.y = -Math.PI / 2;
    notice.userData.noOutline = true;
    ctx.add(notice);
    for (const dz of [-1.58, -0.92]) {
      box(0.09, 1.55, 0.09, gx - 0.76, gy + 0.72, gz - clear / 2 + dz, 0,
        PAL.timberDark, O.timber);
    }

    /* 石灯籠.  They flank the LANDING rather than the foot: the hero camera
     * stands at the north-west corner of the flight, and a 2.3 m lantern at
     * the foot sits two metres from the lens and blocks the gate. */
    for (const sz of [-1, 1]) {
      makeStoneLantern(ctx, {
        x: 74.4, z: FLIGHT_Z + sz * (FLIGHT_W / 2 - 1.1),
        kind: 'kasuga', height: 2.30, baker: BK,
      });
    }
    makeStoneLantern(ctx, { x: 85.4, z: zS - 2.2, kind: 'oribe', height: 1.25, baker: BK });
    ctx.prop({
      kind: 'pathMarker', x: 63.9, z: zS + 1.2,
      y: ctx.groundAt(63.9, zS + 1.2), rot: -Math.PI / 2, variant: 1,
    });
    const basin = makeChozu(ctx, { x: 67.0, z: zS + 1.6, radius: 0.40, baker: BK });

    gateHit = { gx, gy, gz, clear, basin };
  }
  if (gateHit) {
    hit(gateHit.gx + 0.18, gateHit.gy + 1.30, gateHit.gz, 0.3, 2.2, gateHit.clear,
      'the temple gate', (audio) => { audio?.knock?.(210, 0.26, 0.34); });
    hit(gateHit.basin.x, gateHit.basin.y + 0.40, gateHit.basin.z, 1.0, 0.7, 1.0,
      'the water basin', (audio) => { audio?.splash?.(0.18); });
  }

  /* ------------------------------------------------------------------ *
   * 4.  The west frontage.
   *
   * Walled residences, 数寄屋 tea houses behind gates, two galleries and
   * exactly two shops.  `setback` puts every facade 1.9 m back from the
   * frontage line so it stands *behind* the street's 石垣 with a 犬走り strip
   * between -- which is the section a Higashiyama plot on a terrace has, and
   * the reason this side reads as private rather than as retail.
   *
   * The runs are deliberately broken: three long stretches with no building on
   * them at all, just a 塀 and bamboo behind it.  Those are the trough inside
   * the trough.
   * ------------------------------------------------------------------ */
  const HOUSES = [
    [0.045, 0.118], [0.148, 0.185], [0.255, 0.338], [0.360, 0.398],
    [0.412, 0.492], [0.545, 0.600], [0.672, 0.718],
    [0.768, 0.830], [0.848, 0.888],
  ];
  const WALLS = [
    [0.118, 0.148], [0.185, 0.255], [0.338, 0.360], [0.398, 0.412],
    [0.600, 0.616], [0.830, 0.848], [0.888, 0.952],
  ];

  /* The two frontages that trade, and there are only two.  藤菜美 高台寺店
   * (下河原町463-24) is the one confirmed shop on this street: dango grilled in
   * view of the street, counter seats, a 坪庭 behind.  洛匠 closed in 2020 and
   * is NOT built as trading.  Everything else on the unverified list stays off
   * the street. */
  const SHOPS = {
    0.782: { kind: 'wagashi', name: '京だんご 藤菜美' },
    0.445: { kind: 'crafts', name: '京金網' },
  };

  let plotIndex = 0;
  for (const [t0, t1] of HOUSES) {
    const plots = layoutPlots({
      street: 'nene', side: 1, from: t0, to: t1,
      mix: 'machiya', gap: 1.15, setback: WEST_SET,
      seed: 811 + Math.round(t0 * 1000),
    });
    out.plots.push(...plots);

    let prev = null;
    plots.forEach((p, i) => {
      /* 数寄屋風 and 和風邸宅 are two of the six typologies the 1976
       * preservation plan names, and they are the two this street is made of.
       * A 'shop' appears twice in 290 m and never next to another. */
      /* Weighted to the LOW forms.  A run of full two-storey houses turns
       * this side into a wall of timber the height of Hanamikoji's, and the
       * whole point of the street is that it is lower and quieter than that. */
      let style = rng.chance(0.46) ? 'sukiya' : rng.chance(0.55) ? 'machiya' : 'residence';
      if (style === prev && style !== 'machiya') style = 'machiya';
      prev = style;

      const key = Object.keys(SHOPS).find((k) => Math.abs(p.t - Number(k)) < 0.016);
      const shop = key ? SHOPS[key] : null;
      if (shop) delete SHOPS[key];
      const seed = (7919 * (++plotIndex) + 37) >>> 0;

      const b = shop
        ? makeShopfront(ctx, {
          x: p.x, z: p.z, ry: p.ry, width: p.width, y: p.yLow,
          kind: shop.kind, name: shop.name, seed, baker: BK,
        })
        : makeMachiya(ctx, {
          x: p.x, z: p.z, ry: p.ry,
          width: p.width,
          depth: rng.range(8, 15),
          style,
          y: p.yLow,
          seed,
          baker: BK,
          timberTone: style === 'sukiya' ? PAL.timberGrey
            : rng.chance(0.3) ? PAL.timberMid : PAL.timber,
          plasterTone: rng.chance(0.5) ? PAL.plasterOchre : PAL.plasterWarm,
          roofMaterial: rng.chance(0.28) ? 'tileOld' : 'tile',
          /* No signage on a residence, and a 表札 on about half of them.  The
           * fastest way to make this street look wrong is to hang shop signs
           * on it -- there are four pieces of commercial text in 290 m. */
          nameplate: rng.chance(0.5),
          lanterns: 0,
        });
      out.buildings.push(b);

      /* 犬走り -- the washed-gravel strip the plan mandates, between the
       * street's 石垣 and the sill. */
      const gx = p.x + p.street.nx * -0.95, gz = p.z + p.street.nz * -0.95;
      box(p.width + 0.4, 0.18, 1.9, gx, ctx.groundAt(gx, gz) + 0.05, gz, p.ry,
        PAL.gravel, O.stonePale);
    });
  }

  /* The long blank walls.  Stone base, 聚楽壁 above, a tiled cap, and bamboo
   * behind -- the stretches where there is nothing at all to look at, which is
   * the point of the whole district. */
  const wallRun = (c, s0, s1, side, d, opt = {}) => {
    const {
      stoneH = 0.55, topH = 2.25, thick = 0.36, panel = PAL.plasterOchre,
      panelOpts = O.plaster, seg = 2.4, cap = true, collide = true, posts = false,
    } = opt;
    for (let s = s0; s < s1 - 0.05; s += seg) {
      const s2 = Math.min(s1, s + seg);
      const a = off(c, s, side, d), b2 = off(c, s2, side, d);
      const len = Math.hypot(b2.x - a.x, b2.z - a.z);
      if (len < 0.15) continue;
      const m = off(c, (s + s2) / 2, side, d);
      const gy = Math.min(ctx.groundAt(a.x, a.z), ctx.groundAt(b2.x, b2.z));
      // the stone base: two courses, mossy at the joints
      for (let k = 0; k < 2; k++) {
        box(thick + 0.10 - k * 0.03, stoneH / 2 + 0.16, len + 0.05,
          m.x, gy - 0.14 + (stoneH / 2) * (k + 0.5), m.z, m.ry,
          rng.chance(0.35) ? PAL.stoneMoss : k ? PAL.stoneWall : PAL.stoneWallDark, O.stone);
      }
      // the panel
      box(thick, topH - stoneH, len + 0.03, m.x, gy + (stoneH + topH) / 2, m.z, m.ry,
        panel, panelOpts);
      if (posts) {
        box(thick + 0.06, topH - stoneH, 0.115, m.x, gy + (stoneH + topH) / 2,
          m.z + 0 * len, m.ry, PAL.timberDark, O.timberDeep);
      }
      if (cap) {
        // the 屋根瓦 cap: two slopes and a ridge, which is what stops a 塀
        // reading as a garden fence
        for (const sg of [-1, 1]) {
          const g = new THREE.BoxGeometry(thick / 2 + 0.20, 0.09, len + 0.05);
          g.rotateZ(sg * 0.40);
          add(g, m.x + m.nx * sg * (thick / 4 + 0.09), gy + topH + 0.06,
            m.z + m.nz * sg * (thick / 4 + 0.09), m.ry, PAL.tileRoof, O.tile);
        }
        box(0.26, 0.15, len + 0.05, m.x, gy + topH + 0.16, m.z, m.ry,
          PAL.tileRidge, O.tile);
      }
      if (collide) {
        ctx.collideRot(m.x, m.z, thick + 0.12, len, m.ry, gy + topH);
      }
    }
  };

  for (const [t0, t1] of WALLS) {
    wallRun(street, t0 * L, t1 * L, 1, street.frontage + WEST_SET,
      { topH: 2.3, panel: rng.chance(0.5) ? PAL.plasterOchre : PAL.plasterDark });
    /* Bamboo and maple behind it -- the planting on this street shifts from
     * urban to temple garden, and this is where it happens. */
    for (let s = t0 * L + 3; s < t1 * L - 2; s += 3.4) {
      const p = off(street, s, 1, street.frontage + WEST_SET + rng.range(2.2, 6.0));
      const kind = rng.chance(0.5) ? 'bamboo' : rng.chance(0.5) ? 'maple' : 'camellia';
      ctx.tree({
        kind, x: p.x, z: p.z, y: ctx.groundAt(p.x, p.z),
        scale: kind === 'bamboo' ? rng.range(0.55, 0.75) : rng.range(0.85, 1.2),
        rot: rng.range(0, 6.28), seed: rng.int(0, 9999),
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * 5.  The ryokan forecourt -- the break in the west frontage at s 174-194.
   *
   * A 露地: a stone-paved court behind a low wall, a 中門 you can see through,
   * a maple and a 蹲踞.  It is one of the two garden glimpses on the street,
   * and it is also the way through to 石塀小路 from Nene-no-michi at this end.
   * ------------------------------------------------------------------ */
  {
    const s0 = 174, s1 = 194;
    // the apron, sampled off the ground so it does not float on the camber
    for (let s = s0 + 1; s < s1 - 1; s += 3.0) {
      const p = off(street, s, 1, street.frontage + 2.6);
      box(6.4, 0.26, 3.05, p.x, ctx.groundAt(p.x, p.z) + 0.05, p.z, p.ry,
        rng.chance(0.5) ? PAL.paving : PAL.pavingWarm, O.stone);
    }
    // the flanking walls of the court, running back from the street
    for (const s of [s0 + 0.6, s1 - 0.6]) {
      const a = off(street, s, 1, street.frontage + 1.2);
      const b2 = off(street, s, 1, street.frontage + 9.4);
      const n = 4;
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const x = lerp(a.x, b2.x, t), z = lerp(a.z, b2.z, t);
        const gy = ctx.groundAt(x, z);
        const len = Math.hypot(b2.x - a.x, b2.z - a.z) / n;
        box(len, 1.95, 0.34, x, gy + 0.98, z, a.ry, PAL.plasterOchre, O.plaster);
        box(len, 0.24, 0.62, x, gy + 0.55, z, a.ry, PAL.stoneWallDark, O.stone);
        box(len, 0.14, 0.52, x, gy + 2.02, z, a.ry, PAL.tileRidge, O.tile);
        ctx.collideRot(x, z, len, 0.5, a.ry, gy + 2.0);
      }
    }
    /* 中門 -- the middle gate, standing open.  Posts, a header and a small
     * pent roof; no leaves, because the whole point of it is that you can see
     * the garden through it. */
    const g = off(street, (s0 + s1) / 2, 1, street.frontage + 7.0);
    const ggy = ctx.groundAt(g.x, g.z);
    for (const sg of [-1, 1]) {
      box(0.20, 2.30, 0.20, g.x + g.nz * sg * 1.35, ggy + 1.15, g.z - g.nx * sg * 1.35,
        g.ry, PAL.timberDark, O.timberDeep);
    }
    box(3.10, 0.24, 0.22, g.x, ggy + 2.36, g.z, g.ry + Math.PI / 2, PAL.timberDark, O.timberDeep);
    parts(gableRoof({
      w: 3.4, d: 1.05, pitch: 0.42, eave: 0.5, material: 'tile',
      mukuri: 0.03, ridgeCourses: 2, y: ggy + 2.50, ridgeAlongX: true,
    }).parts, g.x, 0, g.z, g.ry + Math.PI / 2);
    // the gate is walk-through: collide only the posts
    for (const sg of [-1, 1]) {
      ctx.collideRot(g.x + g.nz * sg * 1.35, g.z - g.nx * sg * 1.35, 0.3, 0.3, 0, ggy + 2.3);
    }
    const gm = makeStoneLantern(ctx, {
      x: g.x + g.nx * 3.2 + g.nz * 2.0, z: g.z + g.nz * 3.2 - g.nx * 2.0,
      kind: 'yukimi', height: 0.95, baker: BK,
    });
    for (let k = 0; k < 5; k++) {
      const p = off(street, s0 + 3 + k * 3.5, 1, street.frontage + rng.range(9, 13));
      ctx.tree({
        kind: k === 1 ? 'pine' : 'maple', x: p.x, z: p.z, y: ctx.groundAt(p.x, p.z),
        scale: rng.range(0.9, 1.4), rot: rng.range(0, 6.28), seed: rng.int(0, 9999),
      });
    }
    hit(g.x, ggy + 1.4, g.z, 1.4, 2.0, 1.4, 'the garden gate',
      (audio) => { audio?.slide?.(0.7, 900, 0.16); });
  }

  /* ------------------------------------------------------------------ *
   * 6.  石塀小路.
   *
   * Both sides continuous: a coursed stone base with plaster or cedar boarding
   * above it, which is the thing the alley is named for.  The polyline is
   * authored (OSM has only a 35 m stub) and the survey flags it LOW, so it is
   * built exactly to the polyline and nothing is inferred beyond it.
   *
   * Nothing stands against these walls.  The gates are cut INTO them: the wall
   * stops short and piers, a header and a dark reveal fill the last 0.5 m, so
   * the opening has real depth and still leaves the full 2.4 m of walkable
   * width.
   * ------------------------------------------------------------------ */
  const AL = alley.length;
  const IK_OFF = 1.72;   // wall centreline: 3.1 m clear, 2.4 m of it walkable

  /* The one place the alley is not 2.8 m wide.  The hero view
   * `ishibekoji-turn` stands at (20, -170), which is 2.2 m off the polyline --
   * inside the east wall at the base offset, and the shot comes back as a
   * close-up of plaster.  A small court at the south-west turn is both the fix
   * and a real feature of a 130 m alley that has to admit deliveries
   * somewhere; the survey flags this geometry LOW anyway. */
  const IK_WIDE = { s0: 33, s1: 57, ramp: 4, peak: 3.35 };
  const ikOff = (side, s) => {
    if (side < 0) return IK_OFF;
    const { s0, s1, ramp, peak } = IK_WIDE;
    if (s <= s0 || s >= s1) return IK_OFF;
    const t = clamp(Math.min((s - s0) / ramp, (s1 - s) / ramp), 0, 1);
    return lerp(IK_OFF, peak, t * t * (3 - 2 * t));
  };

  /* Where the wall stops.  The pair at s 76-84 is the cross-lane, which is how
   * 石塀小路 reaches west toward 下河原通 -- the survey's own description of
   * it -- and it is also the only way through from Nene-no-michi at that end,
   * so `walkthrough` depends on it. */
  const IK_OPEN = [[76, 84]];
  const openAt = (s) => IK_OPEN.some(([a, b]) => s > a && s < b);

  /* The entrances, on panel boundaries so the wall can stop for them rather
   * than have a door drawn on the front of it: a gate, a lantern, a small
   * nameplate, a swept threshold, and nothing else. */
  const ENTRANCES = [
    [11.2, -1, 0], [23.2, 1, 1], [37.6, -1, 0], [59.2, 1, 1],
    [71.2, -1, 0], [99.2, 1, 0], [111.2, -1, 1], [123.2, 1, 0],
  ];
  const entranceAt = (side, s) =>
    ENTRANCES.some(([es, esd]) => esd === side && s > es && s < es + 2.4);

  const PANEL = 2.4;
  for (const side of [-1, 1]) {
    for (let s = 1.6; s < AL - 1.6; s += PANEL) {
      const s2 = Math.min(AL - 1.6, s + PANEL);
      const sm = (s + s2) / 2;
      if (openAt(sm)) continue;
      const gate = entranceAt(side, sm);
      const a = off(alley, s, side, ikOff(side, s));
      const b2 = off(alley, s2, side, ikOff(side, s2));
      const len = Math.hypot(b2.x - a.x, b2.z - a.z);
      if (len < 0.2) continue;
      const m = off(alley, sm, side, ikOff(side, sm));
      const gy = Math.min(ctx.groundAt(a.x, a.z), ctx.groundAt(b2.x, b2.z));
      const inward = { x: -m.nx, z: -m.nz };

      /* 石塀 -- the coursed stone base, and the reason the alley has the name
       * it has.  Three courses at 0.35, each stepped back 20 mm, the bottom
       * one mossy; it has to read as *stone* against the plaster above it or
       * the whole street is just a plastered lane. */
      const stoneH = 1.05;
      for (let k = 0; k < 3; k++) {
        box(0.44 - k * 0.035, 0.36, len + 0.05, m.x, gy - 0.06 + 0.35 * k + 0.18, m.z, m.ry,
          k === 0 ? (rng.chance(0.6) ? PAL.stoneMoss : PAL.stoneWallDark)
            : k === 1 ? (rng.chance(0.5) ? PAL.stoneWall : PAL.stoneWallDark)
              : (rng.chance(0.5) ? PAL.stone : PAL.stoneWall), O.stone);
      }
      // the 水切 -- the timber sill capping the stone
      box(0.42, 0.09, len + 0.05, m.x, gy + stoneH + 0.05, m.z, m.ry,
        PAL.timberDark, O.timberDeep);

      const topH = 2.85 + ((s * 7919) % 11) / 11 * 0.5;   // 2.85-3.35, stable
      const bodyY0 = gy + stoneH + 0.10, bodyY1 = gy + topH;

      if (gate) {
        /* An opening with real depth: the wall stops, two piers and a header
         * frame the hole, and the leaf sits 0.34 m back in the reveal.  A door
         * painted on the face of a solid wall is the commonest bug in this
         * kind of build and it is what this file did first. */
        const pierD = 0.46, headY = bodyY0 + 1.86;
        const clearL = len - pierD * 2;
        for (const sg of [-1, 1]) {
          const px = m.x + (m.nz * sg) * (len / 2 - pierD / 2);
          const pz = m.z - (m.nx * sg) * (len / 2 - pierD / 2);
          box(0.40, headY - bodyY0, pierD, px, (bodyY0 + headY) / 2, pz, m.ry,
            PAL.timberDark, O.timberDeep);
        }
        // the header, and the transom band above it back up to the coping
        box(0.42, 0.26, len + 0.03, m.x, headY + 0.13, m.z, m.ry, PAL.timberDark, O.timberDeep);
        if (bodyY1 > headY + 0.30) {
          box(0.30, bodyY1 - headY - 0.26, len + 0.03, m.x,
            (headY + 0.26 + bodyY1) / 2, m.z, m.ry, PAL.plasterOchre, O.plaster);
        }
        // the reveal, and the shut leaf standing in it
        box(0.08, headY - bodyY0 + 0.1, clearL, m.x + inward.x * 0.36,
          (bodyY0 + headY) / 2, m.z + inward.z * 0.36, m.ry, PAL.shopInterior, O.dark);
        box(0.09, headY - bodyY0 - 0.06, clearL - 0.06, m.x + inward.x * 0.27,
          (bodyY0 + headY) / 2 - 0.03, m.z + inward.z * 0.27, m.ry, PAL.timberMid, O.timberDeep);
        for (let k = 0; k < 4; k++) {
          box(0.11, 0.07, clearL - 0.12, m.x + inward.x * 0.24,
            bodyY0 + 0.30 + k * 0.46, m.z + inward.z * 0.24, m.ry, PAL.timberDark, O.timberDeep);
        }
        // the granite threshold, swept, standing 60 mm proud
        box(0.90, 0.12, clearL + 0.30, m.x + inward.x * 0.12, gy + 0.06,
          m.z + inward.z * 0.12, m.ry, PAL.pavingLit, O.stonePale);
      } else {
        /* 聚楽壁 between posts, or 杉板張り -- both are in the 1976
         * preservation plan's mandated list, and alternating them is what
         * stops 130 m of wall reading as one extruded profile. */
        const boards = ((s * 104729) % 100) / 100 < 0.34;
        box(0.30, bodyY1 - bodyY0, len + 0.03, m.x, (bodyY0 + bodyY1) / 2, m.z, m.ry,
          boards ? PAL.timberGrey : rng.chance(0.5) ? PAL.plasterOchre : PAL.plaster,
          boards ? O.timber : O.plaster);
        const n = boards ? 6 : 2;
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n - 0.5;
          const bx = m.x + m.nz * t * len, bz = m.z - m.nx * t * len;
          box(boards ? 0.34 : 0.35, bodyY1 - bodyY0, boards ? 0.055 : 0.12,
            bx - m.nx * (boards ? 0.02 : 0), (bodyY0 + bodyY1) / 2,
            bz - m.nz * (boards ? 0.02 : 0), m.ry, PAL.timberDark, O.timberDeep);
        }
      }

      // the tiled coping -- two slopes and a ridge; without it a 塀 is a fence
      for (const sg of [-1, 1]) {
        const g = new THREE.BoxGeometry(0.34, 0.08, len + 0.05);
        g.rotateZ(sg * 0.42);
        add(g, m.x + m.nx * sg * 0.13, gy + topH + 0.06, m.z + m.nz * sg * 0.13, m.ry,
          PAL.tileRoof, O.tile);
      }
      box(0.22, 0.13, len + 0.05, m.x, gy + topH + 0.15, m.z, m.ry, PAL.tileRidge, O.tile);

      /* The eave that oversails the alley from the building behind.  It needs
       * no collider -- it is 3.6 m up and the walker's head is at 1.95 -- and
       * the 1.5 m slot of sky it leaves between the two sides is the whole
       * reason the alley is dark. */
      if (ikOff(side, sm) < 2.0) {
        parts(rafters({
          w: len + 0.15, depth: 0.78, y: gy + topH + 0.62, spacing: 0.30,
          size: 0.055, pitch: 0.34,
        }), m.x - m.nx * 0.06, 0, m.z - m.nz * 0.06,
        m.ry + (side < 0 ? Math.PI / 2 : -Math.PI / 2));
        const g = new THREE.BoxGeometry(0.86, 0.10, len + 0.05);
        g.rotateZ((side < 0 ? 1 : -1) * 0.32 * (m.nx > 0 ? 1 : 1));
        add(g, m.x + inward.x * 0.34, gy + topH + 0.72, m.z + inward.z * 0.34, m.ry,
          PAL.tileRoof, O.tile);
      }
      ctx.collideRot(m.x, m.z, 0.44, len, m.ry, gy + topH);
    }
  }

  /* The court at the turn gets its own paving -- the corridor only lays 2.8 m
   * of it, and bare hillside inside a stone alley is a hole. */
  for (let s = IK_WIDE.s0 + 2; s < IK_WIDE.s1 - 2; s += 2.2) {
    const w = ikOff(1, s);
    if (w < 1.9) continue;
    const p = off(alley, s, 1, (1.3 + w) / 2);
    box(w - 1.3, 0.22, 2.3, p.x, ctx.groundAt(p.x, p.z) + 0.04, p.z, p.ry,
      rng.chance(0.5) ? PAL.paving : PAL.pavingWarm, O.stone);
  }

  /* The masses behind the walls: this is a lane between the backs of ryokan,
   * and the roofs are what close the sky over it.  They are placed by hand
   * rather than scattered, because the inside of the loop has to stay clear --
   * the ryokan's garden court is the route from Nene-no-michi through to the
   * cross-lane, and a mass dropped in it makes the alley a dead end.
   */
  const IK_MASS = [
    // [s, side, width, depth, ridge]
    [6, -1, 9, 8, 6.2], [17, -1, 8, 7, 5.6], [28, -1, 9, 8, 6.4],
    [7, 1, 8, 6.5, 5.4], [19, 1, 9, 7, 6.0],
    [44, -1, 8, 8, 5.8], [56, -1, 9, 7.5, 6.4], [68, -1, 8, 8, 5.6],
    [45, 1, 7, 6, 5.2],
    [92, -1, 9, 8, 6.0], [104, -1, 8, 7.5, 5.6], [118, -1, 9, 8, 6.4],
    [104, 1, 8, 6.5, 5.6], [118, 1, 8, 6, 5.4],
  ];
  for (const [s, side, w, d, ridge] of IK_MASS) {
    const p = off(alley, s, side, ikOff(side, s) + 0.25 + d / 2);
    const gy = ctx.groundAt(p.x, p.z);
    box(d, ridge - 0.9, w, p.x, gy + (ridge - 0.9) / 2, p.z, p.ry,
      rng.chance(0.5) ? PAL.plasterWarm : PAL.plasterOchre, O.plaster);
    parts(gableRoof({
      w, d, pitch: 0.42, eave: 0.9, material: rng.chance(0.3) ? 'tileOld' : 'tile',
      mukuri: 0.03, ridgeCourses: 3, y: gy + ridge - 0.9, ridgeAlongX: true,
    }).parts, p.x, 0, p.z, p.ry + Math.PI / 2);
    ctx.collideRot(p.x, p.z, d, w, p.ry, gy + ridge);
  }

  /* ------------------------------------------------------------------ *
   * The entrances on the alley.  A gate, a lantern, a small nameplate, a
   * swept threshold, and nothing else -- and every one of them recessed into
   * the wall rather than projecting from it, because there is no room.
   * ------------------------------------------------------------------ */
  const nameMat = celTex(woodenSign('石塀小路 夢庵', { vertical: true, board: PAL.timberDark, textColor: PAL.paper, w: 96, h: 256 }),
    { bands: 3, tint: TINT.warm });
  const nameMat2 = celTex(woodenSign('直心房さいき', { vertical: true, board: PAL.timberDark, textColor: PAL.paper, w: 96, h: 256 }),
    { bands: 3, tint: TINT.warm });
  const lanternMat = celTex(
    lanternTex('', { paper: PAL.paper, textColor: PAL.black, ribs: 8, band: PAL.lanternFrame }),
    { bands: 'soft', tint: TINT.warm, color: 0xffffff }
  );
  const lanternGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.30, 9, 1, true);
  const swayers = [];

  for (const [es, side, which] of ENTRANCES) {
    const sm = es + PANEL / 2;
    const m = off(alley, sm, side, ikOff(side, sm));
    const gy = ctx.groundAt(m.x, m.z);

    /* The nameplate, flat on the pier -- 120 x 300 mm, brush-written, and the
     * only text on 130 m of alley.  石塀小路 夢庵 and 直心房さいき are the two
     * premises the census confirms here; the rest of the list was not sourced
     * and is not built. */
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.34),
      which ? nameMat2 : nameMat);
    plate.position.set(m.x - m.nx * 0.16 + m.nz * 0.92, gy + 1.44,
      m.z - m.nz * 0.16 - m.nx * 0.92);
    plate.rotation.y = Math.atan2(-m.nx, -m.nz);
    plate.userData.noOutline = true;
    ctx.add(plate);

    /* A small paper lantern over the head of the opening.  It hangs at 2.34 m
     * -- clear of a 1.95 m head and of the 2.12 m of usable width, which is
     * the constraint the whole alley is designed around. */
    const lamp = new THREE.Mesh(lanternGeo, lanternMat);
    lamp.position.set(m.x - m.nx * 0.34, gy + 2.36, m.z - m.nz * 0.34);
    lamp.userData.noOutline = true;
    ctx.add(lamp);
    box(0.05, 0.05, 0.44, m.x - m.nx * 0.18, gy + 2.58, m.z - m.nz * 0.18,
      Math.atan2(-m.nx, -m.nz), PAL.timberDark, O.timberDeep);
    swayers.push({ obj: lamp, phase: rng.range(0, 6.28), amp: 0 });
    ctx.light({
      x: lamp.position.x, y: lamp.position.y, z: lamp.position.z,
      color: PAL.lanternLit, intensity: 0.42, distance: 6,
    });

    // a bamboo broom stood against the pier, on the wall side of the line
    ctx.prop({
      kind: 'broom', x: m.x - m.nx * 0.30 + m.nz * 1.05,
      z: m.z - m.nz * 0.30 - m.nx * 1.05, y: gy, rot: m.ry,
    });
  }

  /* The wind chime, which is the one sound in the alley and one of its
   * interactables. */
  {
    const m = off(alley, 65.6, -1, ikOff(-1, 65.6));
    const gy = ctx.groundAt(m.x, m.z);
    ctx.prop({ kind: 'windChime', x: m.x - m.nx * 0.42, z: m.z - m.nz * 0.42, y: gy, rot: Math.atan2(-m.nx, -m.nz) });
    hit(m.x - m.nx * 0.5, gy + 2.4, m.z - m.nz * 0.5, 0.7, 0.7, 0.7, 'a wind chime',
      (audio) => { audio?.chime?.(); for (const s of swayers) s.amp = 0.055; });
  }
  /* And a lantern you can set swinging. */
  {
    const m = off(alley, 100.4, 1, ikOff(1, 100.4));
    const gy = ctx.groundAt(m.x, m.z);
    hit(m.x - m.nx * 0.5, gy + 2.2, m.z - m.nz * 0.5, 0.8, 1.0, 0.8, 'a paper lantern',
      (audio) => { audio?.suzu?.(); for (const s of swayers) s.amp = 0.075; });
  }

  /* The cross-lane out of the west leg: a stone apron so the gap in the wall
   * reads as a turning rather than as a hole. */
  {
    for (let k = 0; k < 4; k++) {
      const p = off(alley, 80, -1, IK_OFF + 1.0 + k * 2.4);
      box(2.5, 0.24, 3.0, p.x, ctx.groundAt(p.x, p.z) + 0.05, p.z, p.ry,
        rng.chance(0.5) ? PAL.sett : PAL.settDark, O.stone);
    }
    // and the return walls that frame it
    for (const sg of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const p = off(alley, 80 + sg * 2.2, -1, IK_OFF + 1.2 + k * 2.2);
        const gy = ctx.groundAt(p.x, p.z);
        box(2.2, 1.85, 0.34, p.x, gy + 0.93, p.z, p.ry + Math.PI / 2,
          PAL.plasterOchre, O.plaster);
        box(2.2, 0.13, 0.5, p.x, gy + 1.92, p.z, p.ry + Math.PI / 2, PAL.tileRidge, O.tile);
        ctx.collideRot(p.x, p.z, 2.2, 0.5, p.ry + Math.PI / 2, gy + 1.9);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * 7.  The street stones, the finger post, and the rickshaws.
   * ------------------------------------------------------------------ */
  {
    const stoneMat = celTex(verticalSign('ねねの道', {
      board: 0x8e8b84, textColor: PAL.black, frame: false, w: 96, h: 384,
    }), { bands: 3, tint: TINT.cool });
    const stoneMat2 = celTex(verticalSign('石塀小路', {
      board: 0x8e8b84, textColor: PAL.black, frame: false, w: 96, h: 384,
    }), { bands: 3, tint: TINT.cool });

    const marker = (x, z, ry, mat, label) => {
      const gy = ctx.groundAt(x, z);
      add(taperBox(0.26, 0.26, 1.62, 0.90), x, gy, z, ry, PAL.stone, O.stone);
      add(new THREE.ConeGeometry(0.20, 0.16, 4), x, gy + 1.70, z, ry + Math.PI / 4,
        PAL.stone, O.stone);
      for (const sg of [-1, 1]) {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 1.20), mat);
        f.position.set(x + Math.cos(ry) * sg * 0.126, gy + 0.86, z - Math.sin(ry) * sg * 0.126);
        f.rotation.y = ry + (sg > 0 ? Math.PI / 2 : -Math.PI / 2);
        f.userData.noOutline = true;
        ctx.add(f);
      }
      ctx.collideRot(x, z, 0.3, 0.3, ry, gy + 1.7);
      if (label) {
        hit(x, gy + 1.0, z, 0.7, 1.6, 0.7, label,
          (audio) => { audio?.knock?.(320, 0.14, 0.2); });
      }
    };

    const n0 = off(street, 14, -1, 4.6);
    marker(n0.x, n0.z, n0.ry, stoneMat, 'the street stone');
    // 石塀小路 -- one at each mouth, standing in the gap in the street wall
    for (const ms of [151.0, 213.2]) {
      const q = off(street, ms, 1, 4.5);
      marker(q.x, q.z, q.ry, stoneMat2, null);
    }

    /* 木製案内板 -- the brown finger post the ordinance requires inside the
     * preservation district instead of blue-and-white road signage. */
    const fingerMat = celTex(woodenSign('高台寺　→', { board: 0x4a3a2c, textColor: PAL.paper, w: 256, h: 96 }),
      { bands: 3, tint: TINT.warm });
    const fingerMat2 = celTex(woodenSign('圓徳院　→', { board: 0x4a3a2c, textColor: PAL.paper, w: 256, h: 96 }),
      { bands: 3, tint: TINT.warm });
    const fp = off(street, 133.0, -1, 4.4);
    const fgy = ctx.groundAt(fp.x, fp.z);
    box(0.11, 2.35, 0.11, fp.x, fgy + 1.17, fp.z, 0, PAL.timberDark, O.timberDeep);
    for (const [k, mat] of [[0, fingerMat], [1, fingerMat2]]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.24), mat);
      s.position.set(fp.x - 0.07, fgy + 2.02 - k * 0.30, fp.z);
      s.rotation.y = -Math.PI / 2;
      s.userData.noOutline = true;
      ctx.add(s);
    }

    /* 人力車 -- えびす屋's 東山店 works the 「ねねの道さんぽ」 course and its
     * boarding point is 高台寺公園, at this end of the street.  Parked and
     * empty: black lacquer, red 毛氈, shafts down on the stone. */
    for (const [s, d] of [[132.5, 4.4], [135.8, 4.5], [206, 4.2]]) {
      const p = off(street, s, -1, d);
      ctx.prop({ kind: 'rickshaw', x: p.x, z: p.z, y: ctx.groundAt(p.x, p.z), rot: p.ry + Math.PI });
    }
  }

  /* ------------------------------------------------------------------ *
   * 8.  The surface, and the planting.
   *
   * Almost nothing on the paving: this is the emptiest stretch of the whole
   * route and the emptiness is the content.  What there is belongs to the
   * temple side -- swept leaves, a stack of old tiles, a water bucket.
   * ------------------------------------------------------------------ */
  for (const pt of alongStreet({
    street: 'nene', side: -1, from: 0.06, to: 0.86, spacing: 11, jitter: 4.5,
    seed: 71, offset: EAST_OFF - 1.35,
  })) {
    if (rng.chance(0.34)) ctx.prop({ kind: 'leafPile', x: pt.x, z: pt.z, y: pt.y, rot: rng.range(0, 6.28) });
    else if (rng.chance(0.16)) ctx.prop({ kind: 'stepStone', x: pt.x, z: pt.z, y: pt.y, rot: rng.range(0, 6.28) });
  }
  for (const pt of alongStreet({
    street: 'nene', side: 1, from: 0.06, to: 0.94, spacing: 9.5, jitter: 3.5,
    seed: 72, offset: street.frontage + 1.15,
  })) {
    if (rng.chance(0.30)) ctx.prop({ kind: 'planterPot', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry });
    else if (rng.chance(0.10)) ctx.prop({ kind: 'bucket', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry });
    else if (rng.chance(0.07)) ctx.prop({ kind: 'catAsleep', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry });
  }
  ctx.prop({ kind: 'tileStack', x: 69.0, z: -229.6, y: ctx.groundAt(69.0, -229.6), rot: 0.4 });
  ctx.prop({ kind: 'waterBucket', x: 67.6, z: -214.6, y: ctx.groundAt(67.6, -214.6), rot: 1.1 });
  ctx.prop({ kind: 'leafPile', x: 72.0, z: -214.8, y: ctx.groundAt(72.0, -214.8), rot: 0.9 });

  /* The temple bank's planting.  Maple along the wall, pine at the corners,
   * two stands of bamboo behind 高台寺 -- which is where the survey puts it --
   * and shrubs at the wall base, where the moss is. */
  for (let s = EAST_S0 + 4; s < EAST_S1 - 4; s += 5.2) {
    if (inApproach(s)) continue;
    const d = EAST_OFF + rng.range(2.2, 10.5);
    const p = off(street, s + rng.range(-1.6, 1.6), -1, d);
    const y = ctx.groundAt(p.x, p.z);
    const bamboo = s > 172 && s < 202;
    ctx.tree({
      kind: bamboo ? 'bamboo' : rng.chance(0.66) ? 'maple' : rng.chance(0.55) ? 'pine' : 'cedar',
      x: p.x, z: p.z, y,
      scale: bamboo ? rng.range(0.55, 0.75) : rng.range(0.9, 1.4),
      rot: rng.range(0, 6.28), seed: rng.int(0, 9999),
    });
    if (rng.chance(0.4)) {
      const q = off(street, s + rng.range(-2, 2), -1, EAST_OFF - 0.75);
      ctx.tree({
        kind: rng.chance(0.5) ? 'shrub' : 'camellia', x: q.x, z: q.z,
        y: ctx.groundAt(q.x, q.z), scale: rng.range(0.6, 0.95),
        rot: rng.range(0, 6.28), seed: rng.int(0, 9999),
      });
    }
  }
  /* The maples that lean over 台所坂 -- the shot the whole street is for.
   * They stand in the two strips between the flight and the bay walls, never
   * on the flight itself. */
  for (const [x, z, k] of [
    [68.5, -229.2, 'maple'], [75.5, -229.4, 'maple'], [83.0, -229.6, 'pine'],
    [90.0, -229.4, 'cedar'], [69.5, -214.4, 'maple'], [77.5, -214.5, 'maple'],
    [86.0, -214.6, 'maple'], [92.0, -214.6, 'pine'],
  ]) {
    ctx.tree({ kind: k, x, z, y: ctx.groundAt(x, z), scale: rng.range(1.0, 1.4), rot: rng.range(0, 6.28), seed: rng.int(0, 9999) });
  }
  // and a few over the alley walls, seen from inside the slot
  for (const s of [14, 33, 62, 90, 116]) {
    const sd = rng.chance(0.5) ? 1 : -1;
    const p = off(alley, s, sd, ikOff(sd, s) + rng.range(2.4, 4.5));
    const k = rng.chance(0.6) ? 'maple' : 'bamboo';
    ctx.tree({ kind: k, x: p.x, z: p.z, y: ctx.groundAt(p.x, p.z), scale: k === 'bamboo' ? rng.range(0.55, 0.7) : rng.range(0.9, 1.3), rot: rng.range(0, 6.28), seed: rng.int(0, 9999) });
  }

  /* ------------------------------------------------------------------ *
   * 9.  Motion.  One loop, and the only thing in it is paper moving in air.
   * ------------------------------------------------------------------ */
  if (swayers.length) {
    ctx.update((dt, t) => {
      for (let i = 0; i < swayers.length; i++) {
        const s = swayers[i];
        if (s.amp > 0.0008) s.amp *= Math.max(0, 1 - dt * 0.8);
        else s.amp = 0;
        const a = 0.012 + s.amp;
        s.obj.rotation.z = Math.sin(t * 1.15 + s.phase) * a;
        s.obj.rotation.x = Math.cos(t * 0.87 + s.phase) * a * 0.6;
      }
    });
  }

  ctx.stats.landmarks++;
  return out;
}
