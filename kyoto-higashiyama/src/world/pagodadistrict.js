import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT, cel, celTex } from '../core/toon.js';
import { rngKit, trs, clamp, lerp, bake } from '../core/util.js';
import {
  templePlaque, noticeBoard, verticalSign, woodenSign, lanternTex,
  gravelTex, slabTex,
} from '../core/textures.js';
import { makeMachiya, KEN } from '../kit/machiya.js';
import { makeShopfront } from '../kit/shopfront.js';
import { makeFiveStoreyPagoda } from '../kit/pagoda.js';
import { makeStoneLantern } from '../kit/shrine.js';
import { gableRoof, hipRoof, shedRoof, brackets, gyo } from '../kit/roof.js';
import { layoutPlots, alongStreet, atStreet } from './plots.js';

/* ==================================================================== *
 * 八坂通 · 法観寺 · 八坂庚申堂 -- the pagoda district.
 *
 * This district exists to build one photograph.
 *
 * ------------------------------------------------------- THE SIGHTLINE
 *
 * 八坂通 runs at bearing 100.3 deg, ONE lane, **6.3 m face to face**, and it
 * climbs **5.1 %** toward the tower: 50.6 m where it leaves 東大路 up to
 * 59.8 m at the pagoda's foot.  That climb is the whole trick of the classic
 * view.  The street rises *toward* the pagoda, so the tower is lifted out of
 * the rooflines by nine metres of ground before its own 38.79 m start.  The
 * terrain already does this -- `STREETS.yasakadori` carries the surveyed
 * profile -- and the only job here is not to fight it: every machiya is seated
 * on `ctx.groundAt` and steps up the hill with the paving.
 *
 * The surveyed viewpoints (GEO.md 5), all looking very nearly due east:
 *
 *     x -187.9  z -16.5   188 m out   16.3 deg to the finial
 *     x -115.4  z  -7.6   115 m       24.8
 *     x  -88.7  z  -4.6    89 m       30.7    <- the hero frame
 *     x  -43.6  z  -0.7    44 m       47.7    (the Shimogawara crossing)
 *
 * ⚠️  **The published angles are computed from the NOMINAL 46 m height.**
 * 61.3 (ground) + 46 - 54.6 (eye) over 88.8 m of run is exactly 30.7 deg.  The
 * measured tower is 38.79 m from the top of its stone podium (route.js
 * `PAGODA`, ARCH.md 5) and this district builds the measured one, which puts
 * its 宝珠 at 100.99 m ASL and the elevation from the hero frame at **27.6
 * deg**.  Nothing here is wrong; the two numbers simply cannot both be true,
 * and the project's own contract says the survey height wins.  Do not "fix"
 * this by growing the pagoda.
 *
 * -------------------------------------------------------- THE FRONTAGE
 *
 * `frontage: 3.15` -- 6.3 m face to face, so the two rows very nearly touch
 * the carriageway.  むしこ町家 and 総二階 in a mix, tile, dark timber, deep
 * eaves, and **no bengara**: this is not Gion.  The rows are what crop the
 * tower left and right, so they run right up to the bend and then stop dead,
 * and the compound wall takes over.
 *
 * ---------------------------------------------------------- THE GROUND
 *
 * The terrain's hillside is derived from the surveyed street network by
 * inverse-distance weighting, and at the origin that lands 1.8 m low: 59.5
 * where the GSI LiDAR bare-earth point says **61.3**.  `LANDMARK.pagoda.y` is
 * the survey, so the precinct is registered as a `ctx.platform` at 61.30 and
 * the level difference is taken up by a 石垣 -- which is what the real
 * compound does, and which is why the tower reads as standing *above* the
 * street rather than in it.  The visible ground mesh is built before any
 * district runs and never sees a platform, so the terrace deck, its stone
 * base and the flight up to the gate are all drawn here explicitly.
 *
 * ------------------------------------------------------------ THE COLOUR
 *
 * 法観寺 is **unpainted weathered timber with white plaster panels under
 * silver-grey tile.**  No vermilion anywhere on it.  The one place in the
 * whole world where saturated colour is correct in quantity is 200 m south of
 * it: the くくり猿 at 八坂庚申堂, several hundred small bright cloth balls in
 * bunches, and they are built as a single instanced batch so that the loudest
 * thing on the route costs one draw call.
 * ==================================================================== */

export const id = 'pagodadistrict';

const BK = 'pagoda';

/* ------------------------------------------------------------------ *
 * 法観寺's precinct, as a rectangle on the ground.
 *
 * 61.30 m is `LANDMARK.pagoda.y`.  The box is sized off the tower: the first
 * roof spans 13.91 m, so its eave tips reach z = +/-6.95 and the compound has
 * to be at least 16 m square before the wall is inside the roof.  The south
 * edge stops at z = +10.2 because 八坂通東 (the Sannenzaka link) runs past
 * below it and its frontage line is at z = +10.8 at the compound's west
 * corner -- the two must not overlap.
 * ------------------------------------------------------------------ */
const TERR = { x0: -15.6, z0: -14.4, x1: 13.4, z1: 10.2, top: 61.30 };

/** The gate's centre on the west wall: on the axis of the classic sightline. */
const GATE_Z = -1.0;
const GATE_W = 4.2;

/* ------------------------------------------------------------------ *
 * The straight axis of 八坂通, continued east past the bend.
 *
 * `STREETS.yasakadori` is straight from 東大路 to the Shimogawara crossing and
 * then swings 40 deg south over its last 27 m -- that is the OSM way going
 * *round* the pagoda block, and it is also where `LANDMARK.yasakadoriEast`
 * and GEO.md 3's own coordinate table disagree (route.js has the east end at
 * z = +13.4, the table at z = +1.2).  route.js is the contract, so the
 * corridor keeps its bend and nothing here moves it.
 *
 * But the *sightline* does not bend, and the block on the north side of that
 * last stretch is real ground that the corridor no longer describes.  This is
 * the straight run derived from the two surveyed points that bracket it --
 * (-115.4, -7.6) and (-43.6, -0.7), unit (0.99543, 0.09566) -- and it carries
 * the western neighbours of the compound.  Derived, and said so, per KIT.md 1.
 * ------------------------------------------------------------------ */
const AXIS = { x: -43.6, z: -0.7, tx: 0.99543, tz: 0.09566 };
/** Its north-side normal, and the yaw a facade on that side takes. */
const AXIS_N = { x: 0.09566, z: -0.99543 };
const AXIS_RY = Math.atan2(AXIS_N.x, AXIS_N.z);
/** A point `off` metres NORTH of the axis at arc length `s`.  Positive is
 *  north: `AXIS_N` already points that way, so do not negate it. */
const axisPt = (s, off = 0) => ({
  x: AXIS.x + AXIS.tx * s + AXIS_N.x * off,
  z: AXIS.z + AXIS.tz * s + AXIS_N.z * off,
});

/* ---------------------------- small helpers ------------------------------ */

const box = (w, h, d) => new THREE.BoxGeometry(Math.max(2e-3, w), Math.max(2e-3, h), Math.max(2e-3, d));

/** Hand a roof-kit `parts` array to a baker under one matrix. */
function addParts(b, parts, m) {
  for (const p of parts) {
    b.add(p.geometry, m, p.color, p.opts);
    p.geometry.dispose();
  }
}

/**
 * A flat surface sampled from the height field: a temple court, a forecourt.
 * uv is in metres/2, which is the scale `streets.js` uses, so a slab laid here
 * matches a slab laid there.
 *
 * `corners` (a, b, c, d anticlockwise) lets it be a parallelogram rather than
 * an axis-aligned box -- the forecourt at the head of 八坂通 runs along the
 * street's bearing, not along +x.
 */
function groundSheet(ctx, { x0, z0, x1, z1, corners = null, y = null, cell = 2.4, lift = 0.05, tex, color }) {
  const A = corners || [{ x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 }];
  const su = Math.hypot(A[1].x - A[0].x, A[1].z - A[0].z);
  const sv = Math.hypot(A[3].x - A[0].x, A[3].z - A[0].z);
  const nx = Math.max(1, Math.round(su / cell));
  const nz = Math.max(1, Math.round(sv / cell));
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const u = i / nx, v = j / nz;
      const x = lerp(lerp(A[0].x, A[1].x, u), lerp(A[3].x, A[2].x, u), v);
      const z = lerp(lerp(A[0].z, A[1].z, u), lerp(A[3].z, A[2].z, u), v);
      pos.push(x, (y === null ? ctx.groundAt(x, z) : y) + lift, z);
      uv.push(x * 0.5, z * 0.5);
    }
  }
  const w = nx + 1;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * w + i;
      idx.push(a, a + w, a + 1, a + 1, a + w, a + w + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, celTex(tex, { bands: 'soft3', tint: TINT.cool, color, flat: false }));
  m.receiveShadow = true;
  m.castShadow = false;
  ctx.add(m);
  return m;
}

/* ==================================================================== *
 * 1.  THE PRECINCT -- terrace, 石垣, 築地塀, 山門, the flight up to it.
 * ==================================================================== */

/**
 * 石垣 -- the stone base that takes up the fall between the hillside and the
 * terrace.  Marched at 2 m so the bottom edge follows the ground; the courses
 * are tonally mixed, because a Kyoto retaining wall is rubble and reads as a
 * value texture rather than as a surface.
 */
function stoneBase(ctx, b, rng) {
  const runs = [
    { ax: TERR.x0, az: TERR.z0, bx: TERR.x0, bz: TERR.z1, nx: -1, nz: 0 },  // west
    { ax: TERR.x0, az: TERR.z1, bx: TERR.x1, bz: TERR.z1, nx: 0, nz: 1 },   // south
    { ax: TERR.x1, az: TERR.z1, bx: TERR.x1, bz: TERR.z0, nx: 1, nz: 0 },   // east
    { ax: TERR.x1, az: TERR.z0, bx: TERR.x0, bz: TERR.z0, nx: 0, nz: -1 },  // north
  ];
  const D = 1.15;                       // how far the base reaches back inside
  for (const r of runs) {
    const len = Math.hypot(r.bx - r.ax, r.bz - r.az);
    const n = Math.max(1, Math.round(len / 2.0));
    const along = { x: (r.bx - r.ax) / len, z: (r.bz - r.az) / len };
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      const mx = lerp(r.ax, r.bx, (t0 + t1) / 2), mz = lerp(r.az, r.bz, (t0 + t1) / 2);
      const segLen = len / n + 0.06;
      /* The lowest ground this segment straddles, dropped another 0.7 so the
       * base is buried rather than balanced on the surface. */
      let lo = Infinity;
      for (const t of [t0, 0.5 * (t0 + t1), t1]) {
        const px = lerp(r.ax, r.bx, t) + r.nx * 0.9;
        const pz = lerp(r.az, r.bz, t) + r.nz * 0.9;
        lo = Math.min(lo, ctx.groundAt(px, pz));
      }
      const bottom = lo - 0.75;
      const h = TERR.top + 0.16 - bottom;
      const ang = Math.atan2(along.x, along.z);
      const cx = mx - r.nx * D * 0.5, cz = mz - r.nz * D * 0.5;
      const M = trs(cx, bottom, cz, 0, ang, 0);
      /* One tone, barely varied.  Alternating three greys at a 2 m segment
       * turns a retaining wall into a chequerboard of pale rectangles, which
       * is exactly what it did on the first pass. */
      const tone = rng.chance(0.22) ? PAL.stoneWallDark : PAL.stoneWall;
      b.add(box(segLen, h, D), M.clone().multiply(trs(0, h / 2, 0)), tone,
        { bands: 3, tint: TINT.cool });
      /* 布積み -- the courses.  Three shallow shadow lines up the face, which
       * is what tells the eye it is masonry and not a concrete panel, and
       * they run continuously through the segment joints. */
      for (const cy of [0.30, 0.55, 0.80]) {
        b.add(box(segLen + 0.02, 0.06, D + 0.06), M.clone().multiply(trs(0, h * cy, 0)),
          PAL.stoneWallDark, { bands: 3, tint: TINT.cool });
      }
      // the footing course, projecting: the batter, in one step
      b.add(box(segLen + 0.02, 0.5, D + 0.30), M.clone().multiply(trs(0, 0.25, 0)),
        PAL.stoneWallDark, { bands: 3, tint: TINT.cool });
    }
    // 天端石 -- the dressed coping the earthen wall stands on
    const mx = (r.ax + r.bx) / 2, mz = (r.az + r.bz) / 2;
    b.add(box(len + 0.5, 0.20, D + 0.30),
      trs(mx - r.nx * D * 0.5, TERR.top + 0.22, mz - r.nz * D * 0.5, 0,
        Math.atan2(along.x, along.z), 0),
      PAL.stone, { bands: 3, tint: TINT.cool });
  }
}

/**
 * 築地塀 -- the roofed earthen wall.  Rammed earth on a stone coping, banded
 * with lime lines, under its own little tiled roof with a 0.5 m overhang.  It
 * is the second most-photographed object in this district and its silhouette
 * is a horizontal line with a tile shadow under it.
 */
function earthWall(ctx, b, { ax, az, bx, bz, base, h = 1.95, thick = 0.46, step = 5.0, inset = 0 }) {
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 0.4) return;
  const n = Math.max(1, Math.round(len / step));
  const ang = Math.atan2((bx - ax) / len, (bz - az) / len);
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    const cx = lerp(ax, bx, t), cz = lerp(az, bz, t);
    const l = len / n + 0.04;
    const m = trs(cx, base, cz, 0, ang, 0);
    b.add(box(l, h - 0.18, thick), m.clone().multiply(trs(0, (h - 0.18) / 2, 0)),
      PAL.plasterOchre, { bands: 3, tint: TINT.cool });
    for (const ly of [0.46, 0.72]) {
      b.add(box(l, 0.055, thick + 0.05), m.clone().multiply(trs(0, (h - 0.18) * ly, 0)),
        PAL.plaster, { bands: 'soft3', tint: TINT.cool });
    }
    const cap = gableRoof({
      w: l, d: thick + 0.36, pitch: 0.32, eave: 0.30, material: 'tile',
      mukuri: 0.03, ridgeCourses: 2, y: h - 0.18, gableEnd: false,
    });
    addParts(b, cap.parts, m);
  }
  ctx.collide(
    Math.min(ax, bx) - thick, Math.min(az, bz) - thick,
    Math.max(ax, bx) + thick, Math.max(az, bz) + thick
  );
}

/**
 * A flight of dressed granite steps, with the height field told about every
 * tread so it is actually climbable.  The treads are the Kyoto podium
 * proportion -- 0.165 rise on a 0.36 tread -- not a European staircase.
 *
 * `ry` points the flight: it descends along local +z from `(x, z)`.
 */
function stoneFlight(ctx, b, { x, z, ry = 0, w = 3.6, steps = 17, rise = 0.165, tread = 0.36, top }) {
  const cos = Math.cos(ry), sin = Math.sin(ry);
  for (let i = 0; i < steps; i++) {
    const v = (i + 0.5) * tread;
    const ty = top - (i + 1) * rise;
    const px = x + v * sin, pz = z + v * cos;
    b.add(box(w, rise + 0.62, tread + 0.02), trs(px, ty - 0.31, pz, 0, ry, 0),
      i % 3 === 0 ? PAL.stone : PAL.paving, { bands: 3, tint: TINT.cool });
    /* The tread's own platform.  Extents are the tread, not a square: a
     * square box here would raise the ground two metres either side of the
     * flight, which is invisible in the geometry and lethal on foot. */
    const hx = Math.abs(cos) * w / 2 + Math.abs(sin) * (tread * 0.75);
    const hz = Math.abs(sin) * w / 2 + Math.abs(cos) * (tread * 0.75);
    ctx.platform({ x0: px - hx, z0: pz - hz, x1: px + hx, z1: pz + hz, top: ty });
  }
  // the cheek walls
  for (const s of [-1, 1]) {
    const cx = x + s * (w / 2 + 0.26) * cos + (steps * tread / 2) * sin;
    const cz = z - s * (w / 2 + 0.26) * sin + (steps * tread / 2) * cos;
    b.add(box(0.5, 1.1, steps * tread), trs(cx, top - steps * rise / 2 - 0.15, cz, 0, ry, 0),
      PAL.stoneWall, { bands: 3, tint: TINT.cool });
  }
  return { bottomY: top - steps * rise, run: steps * tread };
}

/**
 * 薬医門 -- the gate.  Four posts, the ridge parallel to the wall, plank
 * leaves standing open against the reveal, a 扁額 in the bay.
 *
 * Built with the opening running along local z, `ry = 0` facing north, and
 * the ridge along local x -- which is why the west gate takes `ry = PI/2`.
 */
function templeGate(ctx, b, { x, z, y, ry = 0, w = 4.2, d = 2.6, colH = 3.45, plaque = null }) {
  const M = trs(x, y, z, 0, ry, 0);
  const P = [];
  const push = (g, color, opts) => P.push({ geometry: g, color, opts });
  const T = { bands: 3, tint: TINT.warm };
  const hw = w / 2;

  // 礎石 and the four posts -- the front pair heavier, as a yakuimon's are
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const front = sz < 0;
      const r = front ? 0.21 : 0.155;
      const pz = sz * d / 2;
      push(box(r * 2.6, 0.30, r * 2.6).translate(sx * hw, 0.10, pz), PAL.stone, { bands: 3, tint: TINT.cool });
      const g = new THREE.CylinderGeometry(r * 0.94, r, front ? colH : colH * 0.86, 10);
      g.translate(sx * hw, 0.24 + (front ? colH : colH * 0.86) / 2, pz);
      push(g, PAL.timberMid, { bands: 3, tint: TINT.warm, flat: false });
    }
    // 貫 -- the tie between the front and rear post on each side
    push(box(0.13, 0.20, d).translate(sx * hw, 0.24 + colH * 0.80, 0), PAL.timberDark, T);
  }
  // 冠木 -- the head beam across the opening, and the 蟇股 over it
  push(box(w + 0.9, 0.34, 0.30).translate(0, 0.24 + colH - 0.17, -d / 2), PAL.timberDark, T);
  push(box(w + 0.5, 0.26, 0.26).translate(0, 0.24 + colH * 0.86 - 0.13, d / 2), PAL.timberDark, T);
  for (const sx of [-1, 1]) {
    push(box(0.62, 0.44, 0.22).translate(sx * w * 0.24, 0.24 + colH + 0.20, -d / 2), PAL.timberWarm, T);
  }
  // 斗栱 over each post, two steps -- a gate, not a pagoda
  for (const sx of [-1, 1]) {
    for (const p of brackets({ x: sx * hw, y: 0.24 + colH, z: -d / 2 - 0.04, steps: 2, scale: 0.86,
      color: PAL.timberWarm, block: PAL.timberPale })) P.push(p);
    for (const p of brackets({ x: sx * hw, y: 0.24 + colH, z: d / 2 + 0.04, steps: 2, scale: 0.72,
      ry: Math.PI, color: PAL.timberWarm, block: PAL.timberPale })) P.push(p);
  }
  // the plank leaves, standing open against the side posts
  for (const sx of [-1, 1]) {
    const g = box(0.10, colH - 0.55, w * 0.44);
    g.translate(sx * (hw - 0.14), 0.24 + (colH - 0.55) / 2, d * 0.02 + w * 0.20);
    push(g, PAL.timberDark, { bands: 2, tint: TINT.warm });
  }
  // the threshold stone
  push(box(w + 0.4, 0.22, 0.55).translate(0, 0.11, 0), PAL.stone, { bands: 3, tint: TINT.cool });

  const roof = gableRoof({
    w: w + 1.5, d: d + 0.9, pitch: 0.5, eave: 1.15, material: 'tile',
    mukuri: 0, sori: 0.10, cornerLift: 0.42, ridgeCourses: 5, y: 0.24 + colH + 0.62,
  });
  P.push(...roof.parts);
  P.push(...gyo({ w: 0.5, h: 0.62, y: roof.ridgeY - 0.85, z: (d + 0.9) / 2 + 1.1 }));

  for (const p of P) b.add(p.geometry, M, p.color, p.opts);
  for (const p of P) p.geometry.dispose();

  if (plaque) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.58),
      celTex(templePlaque(plaque, { rtl: true, frame: PAL.timberDark }), { bands: 3, tint: TINT.warm }));
    m.position.set(x, y + 0.24 + colH + 0.10, z);
    m.rotation.y = ry + Math.PI;
    m.translateZ(d / 2 + 0.16);
    m.userData.noOutline = true;
    ctx.add(m);
  }

  // one collider a side; the bay itself stays clear
  for (const s of [-1, 1]) {
    const cx = x + s * hw * Math.cos(ry), cz = z - s * hw * Math.sin(ry);
    ctx.collideRot(cx, cz, 0.62, d + 0.5, ry);
  }
  return { ridgeY: y + roof.ridgeY };
}

/**
 * A small tile-roofed hall.  法観寺's compound holds a 薬師堂 and a 太子堂 --
 * both modest, both 三間 wide, both dwarfed by the tower, which is the point:
 * they are the scale reference that tells you how big the pagoda is.
 */
function smallHall(ctx, b, { x, z, ry = 0, w = 5.6, d = 4.6, colH = 2.85, plaque = null, hip = false }) {
  let lo = Infinity;
  for (const dx of [-w / 2, w / 2]) for (const dz of [-d / 2, d / 2]) {
    lo = Math.min(lo, ctx.groundAt(x + dx, z + dz));
  }
  const y = lo;
  const M = trs(x, y, z, 0, ry, 0);
  const P = [];
  const push = (g, color, opts) => P.push({ geometry: g, color, opts });
  const T = { bands: 3, tint: TINT.warm };

  // 亀腹 -- the stone plinth, and the deck on it
  push(box(w + 1.0, 0.52, d + 1.0).translate(0, 0.26, 0), PAL.stoneWall, { bands: 3, tint: TINT.cool });
  push(box(w + 0.7, 0.14, d + 0.7).translate(0, 0.58, 0), PAL.stone, { bands: 3, tint: TINT.cool });
  // 縁 -- a narrow veranda on the entrance face only
  push(box(w + 0.5, 0.16, 0.85).translate(0, 0.70, -(d / 2 + 0.42)), PAL.timberMid, T);
  push(box(w * 0.5, 0.16, 0.42).translate(0, 0.52, -(d / 2 + 1.02)), PAL.stone, { bands: 3, tint: TINT.cool });

  // the body: plaster walls, exposed posts, a plank door in the centre bay
  const bays = 3, bw = w / bays;
  push(box(w, colH, d).translate(0, 0.65 + colH / 2, 0.10), PAL.plaster, { bands: 'soft3', tint: TINT.cool });
  /* 腰板 -- the dark boarded wainscot round the bottom metre of the walls.
   * Without it the flanks of a small hall are a blank cream panel, which is
   * the single most obvious "unfinished box" tell in a cel-shaded scene. */
  push(box(w + 0.06, 0.92, d + 0.06).translate(0, 0.65 + 0.46, 0.10), PAL.timberDark, { bands: 2, tint: TINT.warm });
  push(box(w + 0.12, 0.09, d + 0.12).translate(0, 0.65 + 0.94, 0.10), PAL.timberMid, { bands: 3, tint: TINT.warm });
  // and the corner posts, so the flanks carry the same frame as the front
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      push(box(0.16, colH, 0.16).translate(sx * w / 2, 0.65 + colH / 2, 0.10 + sz * d / 2), PAL.timberMid, { bands: 3, tint: TINT.warm });
    }
  }
  for (const sx of [-1, 1]) {
    push(box(0.16, 0.18, d + 0.1).translate(sx * w / 2, 0.65 + colH - 0.09, 0.10), PAL.timberDark, { bands: 3, tint: TINT.warm });
  }
  for (let i = 0; i <= bays; i++) {
    const px = -w / 2 + i * bw;
    push(box(0.15, colH, 0.15).translate(px, 0.65 + colH / 2, -d / 2), PAL.timberMid, T);
  }
  push(box(w + 0.2, 0.20, 0.20).translate(0, 0.65 + colH - 0.10, -d / 2), PAL.timberDark, T);
  push(box(w + 0.2, 0.16, 0.18).translate(0, 0.65 + colH * 0.62, -d / 2), PAL.timberDark, T);
  // the centre bay: a shadowed recess with two 板唐戸 leaves standing in it
  push(box(bw + 0.02, colH - 0.34, 0.30).translate(0, 0.65 + (colH - 0.34) / 2, -d / 2 + 0.30),
    PAL.shopInterior, { bands: 'deep', tint: TINT.warm });
  for (const s of [-1, 1]) {
    push(box(bw / 2 - 0.10, colH - 0.40, 0.07).translate(s * bw / 4, 0.65 + (colH - 0.40) / 2, -d / 2 + 0.14),
      PAL.timberDark, { bands: 2, tint: TINT.warm });
  }
  // 連子窓 in the flanking bays
  for (const s of [-1, 1]) {
    push(box(bw - 0.4, colH * 0.5, 0.12).translate(s * bw, 0.65 + colH * 0.52, -d / 2 + 0.02),
      PAL.timberDark, { bands: 'deep', tint: TINT.warm });
    for (let k = 0; k < 7; k++) {
      push(box(0.05, colH * 0.48, 0.05).translate(s * bw - (bw - 0.5) / 2 + (k / 6) * (bw - 0.5),
        0.65 + colH * 0.52, -d / 2 + 0.08), PAL.timberMid, T);
    }
  }

  const eaveY = 0.65 + colH;
  for (let f = 0; f < 4; f++) {
    const along = f % 2 === 0 ? w : d, off = (f % 2 === 0 ? d : w) / 2;
    const fp = [];
    const nk = Math.max(2, Math.round(along / 1.7));
    for (let k = 0; k <= nk; k++) {
      fp.push(...brackets({ x: -along / 2 + (k / nk) * along, y: eaveY, z: off - 0.04,
        steps: 1, scale: 0.72, color: PAL.timberWarm, block: PAL.timberPale }));
    }
    const rm = new THREE.Matrix4().makeRotationY(f * Math.PI / 2);
    for (const p of fp) p.geometry.applyMatrix4(rm);
    P.push(...fp);
  }
  const roof = hip
    ? hipRoof({ w, d, pitch: 0.5, eave: 1.45, material: 'tile', mukuri: 0, sori: 0.10, cornerLift: 0.45, ridgeCourses: 4, y: eaveY + 0.45 })
    : gableRoof({ w, d, pitch: 0.5, eave: 1.45, material: 'tile', mukuri: 0, sori: 0.10, cornerLift: 0.45, ridgeCourses: 4, y: eaveY + 0.45, ridgeAlongX: true });
  P.push(...roof.parts);

  for (const p of P) b.add(p.geometry, M, p.color, p.opts);
  for (const p of P) p.geometry.dispose();
  ctx.collideRot(x, z, w + 0.9, d + 1.6, ry, y + 0.9);

  if (plaque) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.44),
      celTex(templePlaque(plaque, { rtl: true, frame: PAL.timberDark }), { bands: 3, tint: TINT.warm }));
    m.position.set(x, y + eaveY - 0.30, z);
    m.rotation.y = ry + Math.PI;
    m.translateZ(d / 2 + 0.14);
    m.userData.noOutline = true;
    ctx.add(m);
  }
  return { y, eaveY: y + eaveY, ridgeY: y + roof.ridgeY };
}

/* ==================================================================== *
 * 2.  くくり猿 -- the Koshin-do's bound monkeys.
 *
 * 「くくり猿　一体　五百円　　赤　青　黄色」.  A monkey with its limbs tied,
 * one wish per ball, an ofuda of 青面金剛 sealed inside; officially a 御守 and
 * not a souvenir.  They hang in bunches at the 賓頭盧堂, off the 本堂 eaves,
 * off the gate and the railings, and the 塔ノ下商店街 approach beneath the
 * pagoda is strung with red ones.
 *
 * Several hundred fully-saturated 6 cm objects would be an outrage anywhere
 * else in this world.  Here it is the correct answer, and it is one
 * InstancedMesh: the balls carry their colour in `instanceColor` and the whole
 * of the loudest thing on the route is a single draw call.
 * ==================================================================== */

/** The observed set, not the official three -- the temple names 赤青黄色 but
 *  the racks are pink, orange, green, purple, pale blue and white as well. */
const SARU = [
  0xe8503a, 0xf0b825, 0x4fa862, 0x3f82c8, 0xf085ac,
  0xf08a2e, 0x9464b8, 0x86c8e2, 0xf6f0e4, 0xd8506e,
];

class Kukurizaru {
  constructor(seed) {
    this.rng = rngKit(seed);
    this.m = [];
    this.c = [];
    this.cords = [];
  }

  /**
   * One bunch.  A CLUMP, not a string of beads: the balls are 6-7 cm and they
   * hang shoulder to shoulder down a short cord, so a bunch is a lump of
   * colour about 0.3 m long.  Spacing them out along a 0.6 m cord -- which is
   * what the first pass did -- turns the whole thing into a bead curtain with
   * more black cord in it than monkey, and the temple's own photographs are
   * unambiguous: it is a *mass*.
   */
  bunch(x, y, z, n = 6, { drop = 0.30, red = false, spread = 0.055 } = {}) {
    const R = this.rng;
    const step = drop / n;
    for (let i = 0; i < n; i++) {
      const s = R.range(0.82, 1.15);
      const px = x + R.range(-spread, spread);
      const pz = z + R.range(-spread, spread);
      const py = y - 0.09 - step * (i + 0.5);
      this.m.push(trs(px, py, pz, R.range(0, 6.283), R.range(0, 6.283), 0, s, s, s));
      const col = red
        ? (R.chance(0.78) ? SARU[0] : SARU[9])
        : SARU[R.int(0, SARU.length - 1)];
      this.c.push(col);
    }
    this.cords.push({ x, y, z, drop: 0.10 });
  }

  /** A dense rack of them -- what the 賓頭盧堂 actually looks like. */
  rack(x, y, z, ry, w, cols, rows, opts = {}) {
    const cos = Math.cos(ry), sin = Math.sin(ry);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = (-w / 2) + (c + 0.5) * (w / cols);
        const px = x + u * cos, pz = z - u * sin;
        this.bunch(px, y - r * 0.46, pz, this.rng.int(5, 8),
          { drop: 0.30, spread: 0.06, ...opts });
      }
    }
  }

  emit(ctx, b) {
    if (!this.m.length) return null;
    /* The cords.  Baked, dark, and one facet thick would disappear -- 8 mm
     * of actual geometry is what reads as a cord under the ink pass. */
    for (const c of this.cords) {
      b.add(box(0.012, c.drop, 0.012), trs(c.x, c.y - c.drop / 2, c.z),
        PAL.timberDark, { bands: 2, tint: TINT.warm });
    }
    /* 0.042 m radius -- an 8 cm ball.  STREET.md flags the real diameter as
     * `[?]` with 5-7 cm as the working figure; the top of that range plus a
     * little is what survives being 4 pixels across from the lane. */
    const geo = new THREE.IcosahedronGeometry(0.042, 0);
    geo.scale(1, 0.92, 1);
    const mat = cel({
      color: 0xffffff, bands: 'soft3', tint: TINT.warm, flat: true, cache: false,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, this.m.length);
    const col = new THREE.Color();
    for (let i = 0; i < this.m.length; i++) {
      mesh.setMatrixAt(i, this.m[i]);
      mesh.setColorAt(i, col.set(this.c[i]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.name = 'kukurizaru';
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.userData.noOutline = true;
    ctx.add(mesh);
    return mesh;
  }
}

/* ==================================================================== *
 * 3.  THE BUILD
 * ==================================================================== */

export function build(ctx) {
  const rng = rngKit(9911);
  const b = ctx.baker(BK);
  const out = { buildings: [], plots: [] };

  /* ------------------------------------------------------------------ *
   * 3.1  The terrace.  Registered BEFORE anything is seated on it -- the
   *      pagoda asks `groundAt` at its four podium corners and would drop
   *      1.8 m into the hillside otherwise.
   * ------------------------------------------------------------------ */
  ctx.platform({ x0: TERR.x0, z0: TERR.z0, x1: TERR.x1, z1: TERR.z1, top: TERR.top });

  /* The deck.  白川砂 raked gravel, which is what the compound floor is, and
   * it has to be drawn here because the visible ground mesh is built before
   * any district runs and so has never heard of this platform. */
  groundSheet(ctx, {
    x0: TERR.x0 - 0.1, z0: TERR.z0 - 0.1, x1: TERR.x1 + 0.1, z1: TERR.z1 + 0.1,
    y: TERR.top, lift: 0.02, cell: 2.9, tex: gravelTex(), color: 0xe6e1d6,
  });
  stoneBase(ctx, b, rng);

  /* ------------------------------------------------------------------ *
   * 3.2  法観寺 五重塔.
   *
   * Turned 2.1 deg anticlockwise off cardinal -- the survey has the compound
   * walls on bearings 87.9 / 178.0, and the tower is square to them.  No
   * baker is passed, so the tower gets its own mesh and its own drawn
   * inverted-hull outline: it is read from 190 m and from 4 m, and a
   * clip-space hull is the only line that holds a constant weight across
   * that range.  It is the ONLY object in this district that gets one.
   * ------------------------------------------------------------------ */
  const pagoda = makeFiveStoreyPagoda(ctx, { x: 0, z: 0, ry: 0.037 });
  ctx.stats.landmarks++;

  /* ------------------------------------------------------------------ *
   * 3.3  The wall, the gate, and the flight up to it.
   * ------------------------------------------------------------------ */
  const WALL_Y = TERR.top + 0.32;
  const IN = 0.55;                    // the wall stands inside the coping
  const W = { x0: TERR.x0 + IN, z0: TERR.z0 + IN, x1: TERR.x1 - IN, z1: TERR.z1 - IN };
  // west, in two runs with the gate bay between them
  earthWall(ctx, b, { ax: W.x0, az: W.z0, bx: W.x0, bz: GATE_Z - GATE_W / 2, base: WALL_Y });
  earthWall(ctx, b, { ax: W.x0, az: GATE_Z + GATE_W / 2, bx: W.x0, bz: W.z1, base: WALL_Y });
  earthWall(ctx, b, { ax: W.x0, az: W.z1, bx: W.x1, bz: W.z1, base: WALL_Y });
  earthWall(ctx, b, { ax: W.x1, az: W.z1, bx: W.x1, bz: W.z0, base: WALL_Y });
  earthWall(ctx, b, { ax: W.x1, az: W.z0, bx: W.x0, bz: W.z0, base: WALL_Y });

  const gate = templeGate(ctx, b, {
    x: W.x0 + 0.1, z: GATE_Z, y: TERR.top, ry: Math.PI / 2,
    w: GATE_W - 0.4, d: 2.7, colH: 3.5, plaque: '法観寺',
  });

  /* The flight.  2.75 m of fall between the terrace and the hillside outside
   * it, taken in 17 shallow treads, and every one of them registered so the
   * gate can actually be walked through. */
  const flight = stoneFlight(ctx, b, {
    x: TERR.x0 - 0.55, z: GATE_Z, ry: -Math.PI / 2, w: 3.5, steps: 17, top: TERR.top,
  });

  /* The forecourt.  石畳, laid along the street's straight bearing rather
   * than along +x, and running the whole 25 m from the bend to the foot of
   * the flight -- because the alternative is the hillside's moss coming up to
   * a temple gate, and because this is the floor of the last quarter of the
   * hero frame. */
  groundSheet(ctx, {
    corners: [axisPt(1.5, 4.6), axisPt(28.6, 4.6), axisPt(28.6, -1.2), axisPt(1.5, -1.2)],
    cell: 2.4, lift: 0.045, tex: slabTex(), color: 0xd6d1c9,
  });

  /* ------------------------------------------------------------------ *
   * 3.4  Inside the compound.
   *
   * 「石壇上に建ち」 and very little else: 法観寺's precinct is famously a
   * scrap of ground with two small halls, some gravel, a few big trees and a
   * ticket desk.  Restraint here is not a budget decision -- a busy precinct
   * would make the tower look small.
   * ------------------------------------------------------------------ */
  const yakushido = smallHall(ctx, b, {
    x: 8.6, z: 2.2, ry: Math.PI / 2, w: 5.8, d: 4.6, plaque: '薬師堂', hip: true,
  });
  /* Kept off the diagonal from the compound's south-west corner to the tower:
   * that line is the `pagoda-base` hero view and a hall on it is a wall. */
  smallHall(ctx, b, {
    x: -10.4, z: -8.4, ry: Math.PI, w: 4.6, d: 3.8, colH: 2.65, plaque: '太子堂',
  });

  /* 拝観受付所 -- 「中学生以上 四百円」「※小学生以下拝観不可」.  A booth, not a
   * building: the internal stair is near-vertical and the temple's opening is
   * 不定休, which is why there is a hand-lettered board rather than a sign. */
  {
    const bx = -11.4, bz = -5.6, byy = ctx.groundAt(bx, bz);
    const M = trs(bx, byy, bz, 0, Math.PI / 2, 0);
    b.add(box(2.4, 2.15, 1.9), M.clone().multiply(trs(0, 1.08, 0.1)), PAL.timber, { bands: 3, tint: TINT.warm });
    b.add(box(2.1, 0.75, 0.30), M.clone().multiply(trs(0, 1.30, -0.98)), PAL.shopInterior, { bands: 'deep', tint: TINT.warm });
    b.add(box(2.4, 0.14, 0.5), M.clone().multiply(trs(0, 0.92, -1.02)), PAL.timberPale, { bands: 3, tint: TINT.warm });
    const r = shedRoof({ w: 3.0, d: 2.4, pitch: 0.34, eave: 0.45, material: 'tile', y: 2.2, ridgeCourses: 2 });
    for (const p of r.parts) p.geometry.translate(0, 0, -1.35);
    addParts(b, r.parts, M);
    ctx.collideRot(bx, bz, 2.6, 2.2, Math.PI / 2);

    const nb = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.96), celTex(noticeBoard(
      ['中学生以上　四百円', '※小学生以下拝観不可', '不定休'],
      { title: '拝観', board: 0x3a3028, textColor: PAL.paper, accent: PAL.gold }
    ), { bands: 3, tint: TINT.warm }));
    nb.position.set(bx - 1.5, byy + 1.55, bz + 1.2);
    nb.rotation.y = -Math.PI / 2 + 0.35;
    nb.userData.noOutline = true;
    ctx.add(nb);
  }

  /* 五智如来 -- the plaque the goshuin's 墨書 names, on the east hall. */
  {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.05),
      celTex(verticalSign('五智如来', { board: PAL.timberPale, brush: true }), { bands: 3, tint: TINT.warm }));
    s.position.set(5.4, yakushido.y + 1.9, 1.0);
    s.rotation.y = Math.PI / 2;
    s.userData.noOutline = true;
    ctx.add(s);
  }

  // 石灯籠, a 手水鉢, and the tiles waiting to go back on a roof
  makeStoneLantern(ctx, { x: -6.4, z: -3.2, kind: 'kasuga', height: 2.1, baker: BK });
  makeStoneLantern(ctx, { x: -6.0, z: 4.6, kind: 'oribe', height: 1.25, baker: BK });
  ctx.prop({ kind: 'stoneBasin', x: -10.4, z: -1.2, y: ctx.groundAt(-10.4, -1.2), rot: 1.2 });
  ctx.prop({ kind: 'tileStack', x: 10.8, z: -9.0, y: ctx.groundAt(10.8, -9.0), rot: 0.4 });
  ctx.prop({ kind: 'tileStack', x: 9.4, z: -10.4, y: ctx.groundAt(9.4, -10.4), rot: 1.9 });
  ctx.prop({ kind: 'incenseBurner', x: 8.6, z: -2.4, y: ctx.groundAt(8.6, -2.4), rot: Math.PI / 2 });
  ctx.prop({ kind: 'leafPile', x: -4.2, z: 7.6, y: ctx.groundAt(-4.2, 7.6) });
  ctx.prop({ kind: 'broom', x: -12.6, z: 6.4, y: ctx.groundAt(-12.6, 6.4), rot: 2.1 });
  ctx.prop({ kind: 'waterBucket', x: -12.0, z: 5.2, y: ctx.groundAt(-12.0, 5.2), rot: 0.6 });
  for (const [px, pz] of [[-12.4, -1.0], [-9.4, -1.0], [-6.4, -0.4], [-3.6, 1.4]]) {
    ctx.prop({ kind: 'stepStone', x: px, z: pz, y: ctx.groundAt(px, pz), rot: rng.range(0, 6.28) });
  }

  /* The trees.  Four, all big, all inside the wall -- they are the only thing
   * in the frame that can argue with the tower for the corner of the sky. */
  ctx.tree({ kind: 'pine', x: -13.6, z: -12.2, y: ctx.groundAt(-13.6, -12.2), scale: 1.3, seed: 41, shadow: true });
  ctx.tree({ kind: 'maple', x: 10.2, z: -6.4, y: ctx.groundAt(10.2, -6.4), scale: 1.15, seed: 42 });
  ctx.tree({ kind: 'camellia', x: -12.6, z: 2.6, y: ctx.groundAt(-12.6, 2.6), scale: 1.0, seed: 43 });
  ctx.tree({ kind: 'pine', x: 6.4, z: 8.0, y: ctx.groundAt(6.4, 8.0), scale: 1.1, seed: 44 });
  for (let i = 0; i < 6; i++) {
    const px = rng.range(TERR.x0 + 1.6, TERR.x1 - 1.6);
    const pz = rng.range(TERR.z0 + 1.6, TERR.z1 - 1.6);
    if (Math.abs(px) < 6.4 && Math.abs(pz) < 6.4) continue;
    ctx.tree({ kind: 'shrub', x: px, z: pz, y: ctx.groundAt(px, pz), scale: rng.range(0.6, 1.0), seed: 50 + i });
  }

  /* ------------------------------------------------------------------ *
   * 3.5  八坂通 -- the frontage.
   *
   * `frontage` is 3.15, so the two rows stand 6.3 m apart and the street is
   * a slot.  Party walls (`gap: 0.02`): the row has to read as one wall with
   * a beat, because it is the thing that converges on the tower.
   *
   * The north row stops at t = 0.955 and the south at 0.985.  Past that the
   * corridor swings south-east around the compound and there is nothing to
   * line: the last 25 m of the view is temple wall, and that is exactly what
   * the survey describes.
   * ------------------------------------------------------------------ */
  const NAMES = {
    ceramics: ['京焼・清水焼', '陶器'],
    crafts: ['京の暮らしの道具', '手仕事'],
    wagashi: ['京だんご', '甘味'],
    souvenir: ['京みやげ'],
    komono: ['京こもの'],
    restaurant: ['京料理'],
    matcha: ['甘味処'],
    coffee: ['珈琲'],
  };

  for (const side of [-1, 1]) {
    const plots = layoutPlots({
      street: 'yasakadori', side,
      /* **Both rows stop at t = 0.84.**  That is the 下河原通 crossing at
       * (-43.6, -0.7) -- a crossroads, so of course the frontage breaks
       * there -- and it is also where the corridor stops running straight
       * and swings south-east around the compound.  A plot laid on the bend
       * lands a two-storey facade broadside across the sightline five metres
       * in front of the crossing and hides the entire tower from the
       * second-most-photographed viewpoint on the route; on the south side it
       * drives an 11 m deep building straight across 庚申堂道.  The ground
       * east of the crossing belongs to the temple's neighbours (`AXIS`
       * below) and to the Koshin-do lane. */
      from: 0.028, to: 0.840,
      mix: 'machiya', gap: 0.02, seed: 730 + side,
      /* Gaps: the 庚申堂 lane leaves the south side at t ~ 0.88, the modern
       * coffee box takes its own plot at 0.79, and each side loses one
       * frontage to a service alley. */
      skip: side > 0
        ? [[0.775, 0.826], [0.395, 0.425]]
        : [[0.615, 0.645], [0.245, 0.268]],
    });
    out.plots.push(...plots);

    let prev = null;
    plots.forEach((p, i) => {
      /* Trade density rises toward the pagoda: the top of the street is all
       * shops and the 東大路 end is half residential.  `t` is the fraction
       * along, and t = 1 is the tower. */
      const shopChance = clamp(0.12 + p.t * 0.72, 0, 0.9);
      const isShop = rng.chance(shopChance);
      const seed = (7717 * (i + 3) + (side > 0 ? 331 : 29)) >>> 0;

      if (isShop) {
        let kind = rng.pick(p.t > 0.6
          ? ['ceramics', 'crafts', 'wagashi', 'souvenir', 'matcha', 'komono', 'ceramics']
          : ['restaurant', 'komono', 'crafts', 'wagashi', 'souvenir']);
        if (kind === prev) kind = rng.pick(['ceramics', 'crafts', 'komono']);
        prev = kind;
        const names = NAMES[kind];
        out.buildings.push(makeShopfront(ctx, {
          x: p.x, z: p.z, ry: p.ry, width: p.width,
          depth: rng.range(7.5, 13.5),
          kind, seed, baker: BK,
          name: names ? rng.pick(names) : null,
          timberTone: rng.chance(0.3) ? PAL.timberDark : PAL.timber,
          plasterTone: rng.chance(0.42) ? PAL.plasterOchre : PAL.plaster,
          roofMaterial: rng.chance(0.24) ? 'tileOld' : 'tile',
        }));
        ctx.stats.shopfronts++;
      } else {
        /* 総二階 among the むしこ.  Yasaka-dori's north wall is described as
         * a run of *two-storey* machiya, and the mixed eave line -- 4.80 m
         * against 5.80 -- is what stops the row reading as one extruded
         * profile. */
        const style = rng.chance(0.42) ? 'residence' : 'machiya';
        prev = null;
        out.buildings.push(makeMachiya(ctx, {
          x: p.x, z: p.z, ry: p.ry, width: p.width,
          depth: rng.range(8, 15),
          style, seed, baker: BK,
          timberTone: rng.chance(0.34) ? PAL.timberDark : PAL.timber,
          plasterTone: rng.chance(0.5) ? PAL.plasterOchre : PAL.plasterWarm,
          roofMaterial: rng.chance(0.22) ? 'tileOld' : 'tile',
        }));
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 3.5b  塔ノ下 -- the block under the tower.
   *
   * The ground between the bend and the compound's west wall.  It is set back
   * 9 m from the sightline behind a 板塀 and it is deliberately LOW, because
   * anything on this ground stands 6 to 7 degrees left of the tower at 60 m
   * and would eat the pagoda's first roof if it were a storey taller.  What
   * it does instead is close the left of the frame at street level, which is
   * the thing that was missing when the corridor row was cut back.
   * ------------------------------------------------------------------ */
  {
    // the fence on the street side, following the axis
    const fpts = [];
    for (let sAlong = 2.0; sAlong <= 27.0; sAlong += 4.2) {
      const q = axisPt(sAlong, 4.35);
      fpts.push({ x: q.x, z: q.z, y: ctx.groundAt(q.x, q.z) });
    }
    for (let i = 0; i < fpts.length - 1; i++) {
      const a = fpts[i], c = fpts[i + 1];
      const len = Math.hypot(c.x - a.x, c.z - a.z);
      const ang = Math.atan2((c.x - a.x) / len, (c.z - a.z) / len);
      const cx = (a.x + c.x) / 2, cz = (a.z + c.z) / 2;
      const base = Math.min(a.y, c.y);
      const rise = Math.max(a.y, c.y) - base;
      const M = trs(cx, base, cz, 0, ang, 0);
      b.add(box(len + 0.04, 0.34 + rise, 0.34), M.clone().multiply(trs(0, (0.34 + rise) / 2 - 0.10, 0)),
        PAL.stoneWallDark, { bands: 3, tint: TINT.cool });
      b.add(box(len + 0.02, 1.85, 0.05), M.clone().multiply(trs(0, 0.28 + rise + 0.93, 0)),
        PAL.timberDark, { bands: 2, tint: TINT.warm });
      const nP = Math.max(1, Math.round(len / KEN));
      for (let k = 0; k <= nP; k++) {
        b.add(box(0.11, 1.95, 0.13), M.clone().multiply(trs(-len / 2 + (k / nP) * len, 0.28 + rise + 0.93, 0.02)),
          PAL.timberDark, { bands: 3, tint: TINT.warm });
      }
      b.add(box(len + 0.22, 0.09, 0.30), M.clone().multiply(trs(0, 0.28 + rise + 1.87, 0)),
        PAL.timberMid, { bands: 3, tint: TINT.warm });
      ctx.collide(Math.min(a.x, c.x) - 0.2, Math.min(a.z, c.z) - 0.2,
        Math.max(a.x, c.x) + 0.2, Math.max(a.z, c.z) + 0.2);
    }
    // the houses behind it, single-storey 数寄屋 and low machiya
    let sAlong = 2.6;
    let n = 0;
    while (sAlong < 23.5) {
      const w = rng.pick([2, 3, 3, 4]) * KEN;
      if (sAlong + w > 24.5) break;
      const q = axisPt(sAlong + w / 2, 9.3);
      out.buildings.push(makeMachiya(ctx, {
        x: q.x, z: q.z, ry: AXIS_RY, width: w, depth: rng.range(7, 11),
        style: rng.chance(0.5) ? 'sukiya' : 'machiya',
        floors: 1.5, seed: (3301 * (n + 2)) >>> 0, baker: BK,
        timberTone: rng.chance(0.4) ? PAL.timberGrey : PAL.timber,
        plasterTone: PAL.plasterOchre,
        roofMaterial: rng.chance(0.4) ? 'tileOld' : 'tile',
      }));
      sAlong += w + 0.9;
      n++;
    }
    for (const sA of [5.0, 12.0, 19.5]) {
      const q = axisPt(sA, 6.6);
      ctx.tree({
        kind: rng.chance(0.5) ? 'maple' : 'pine', x: q.x, z: q.z,
        y: ctx.groundAt(q.x, q.z), scale: rng.range(0.85, 1.1), seed: 610 + n++,
      });
    }
    // a stone marker where the temple's approach leaves the street
    const mk = axisPt(3.2, 3.1);
    b.add(box(0.26, 1.7, 0.26), trs(mk.x, ctx.groundAt(mk.x, mk.z) + 0.85, mk.z, 0, AXIS_RY, 0),
      PAL.stone, { bands: 3, tint: TINT.cool });
    const ms = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 1.06),
      celTex(verticalSign('八坂の塔', { board: PAL.stone, textColor: PAL.black, frame: false }), { bands: 3, tint: TINT.cool }));
    ms.position.set(mk.x, ctx.groundAt(mk.x, mk.z) + 1.06, mk.z);
    ms.rotation.y = AXIS_RY + Math.PI;
    ms.translateZ(0.14);
    ms.userData.noOutline = true;
    ctx.add(ms);
  }

  /* ------------------------------------------------------------------ *
   * 3.6  The modern insert.
   *
   * A minimal white coffee box with a full-height glass front, standing on
   * the pagoda's view axis with two-storey machiya either side of it.  It is
   * the strongest modern/traditional juxtaposition on the whole route and
   * leaving it out would be the bigger falsification -- but it carries **no
   * mark and no name**: a generic 珈琲 on a small plate, and nothing else.
   * Low, flat-topped and white, so it takes nothing from the tower.
   * ------------------------------------------------------------------ */
  {
    const a = atStreet('yasakadori', 0.800, { side: 1, offset: 3.15 });
    if (a) {
      const w = 6.6, d = 7.4, h = 4.15;
      let lo = Infinity;
      for (const dx of [-w / 2, w / 2]) for (const dz of [0.4, d]) {
        const px = a.x + dx * Math.cos(a.ry) + dz * Math.sin(a.ry);
        const pz = a.z - dx * Math.sin(a.ry) + dz * Math.cos(a.ry);
        lo = Math.min(lo, ctx.groundAt(px, pz));
      }
      const M = trs(a.x, lo, a.z, 0, a.ry, 0);
      // the box, stopping 0.75 m short of the frontage line -- KIT.md 10
      b.add(box(w, h + 0.9, d - 0.75), M.clone().multiply(trs(0, (h + 0.9) / 2 - 0.9, 0.75 + (d - 0.75) / 2)),
        PAL.white, { bands: 'soft3', tint: TINT.cool });
      // the glass wall and its dark reveal
      b.add(box(w - 0.5, h - 0.55, 0.10), M.clone().multiply(trs(0, (h - 0.55) / 2 + 0.18, 0.70)),
        PAL.glassDark, { bands: 'deep', tint: TINT.cool });
      const glass = new THREE.Mesh(box(w - 0.62, h - 0.68, 0.05),
        cel({ color: PAL.glass, bands: 4, tint: TINT.cool, transparent: true, opacity: 0.42, flat: false }));
      glass.applyMatrix4(M.clone().multiply(trs(0, (h - 0.68) / 2 + 0.20, 0.58)));
      glass.userData.noOutline = true;
      ctx.add(glass);
      // mullions, the counter behind it, the parapet, the thin steel canopy
      for (const u of [-0.5, 0, 0.5]) {
        b.add(box(0.07, h - 0.6, 0.14), M.clone().multiply(trs(u * (w - 0.7), (h - 0.6) / 2 + 0.18, 0.55)),
          PAL.metalDark, { bands: 3, tint: TINT.cool });
      }
      b.add(box(w - 1.4, 0.10, 0.6), M.clone().multiply(trs(0, 1.02, 1.15)), PAL.counter, { bands: 3, tint: TINT.warm });
      b.add(box(w + 0.2, 0.32, d - 0.55), M.clone().multiply(trs(0, h + 0.16, 0.85 + (d - 0.75) / 2)),
        PAL.white, { bands: 'soft3', tint: TINT.cool });
      b.add(box(w + 0.3, 0.06, 1.05), M.clone().multiply(trs(0, h - 0.62, 0.12)), PAL.metal, { bands: 3, tint: TINT.cool });
      b.add(box(w + 0.3, 0.22, 0.10), M.clone().multiply(trs(0, 0.11, 0.60)), PAL.stone, { bands: 3, tint: TINT.cool });
      ctx.collideRot(a.x + Math.sin(a.ry) * d / 2, a.z + Math.cos(a.ry) * d / 2, w, d, a.ry, lo + h);

      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.24),
        celTex(woodenSign('珈琲', { board: PAL.white, textColor: PAL.blackSoft }), { bands: 'soft3', tint: TINT.cool }));
      sign.applyMatrix4(M.clone().multiply(trs(w * 0.30, 3.35, 0.44)));
      sign.rotation.y = a.ry + Math.PI;
      sign.userData.noOutline = true;
      ctx.add(sign);

      const fx = a.x - Math.sin(a.ry) * 1.1, fz = a.z - Math.cos(a.ry) * 1.1;
      ctx.prop({ kind: 'aBoard', x: fx + 1.8, z: fz + 0.4, y: ctx.groundAt(fx + 1.8, fz + 0.4), rot: a.ry + 0.4 });
      ctx.prop({ kind: 'stool', x: fx - 1.6, z: fz + 0.2, y: ctx.groundAt(fx - 1.6, fz + 0.2), rot: a.ry });
      ctx.stats.shopfronts++;
    }
  }

  /* ------------------------------------------------------------------ *
   * 3.7  八坂庚申堂 -- 大黒山 金剛寺 庚申堂.
   *
   * Tendai, founded 天徳4年 (960); the 本堂 rebuilt 延宝6年 (1678).  One of
   * Japan's three great Koshin-do, free, 9:00-17:00, and 「八坂ノ塔のすぐ下
   * くくり猿が目印です」.  **No ema racks** -- the kukurizaru IS the wish
   * vehicle here and an ema rack would be a straight factual error.
   *
   * The lane arrives from the north, so the gate faces north (ry = 0).
   * ------------------------------------------------------------------ */
  const saru = new Kukurizaru(70707);
  {
    const cx = -34.0, cz = 26.0;
    const gy = ctx.groundAt(cx, cz - 4.2);

    /* A small level court.  The lane's own corridor already carries most of
     * it; this is the extra metre or so the halls need to stand on. */
    ctx.platform({ x0: cx - 9.2, z0: cz - 6.6, x1: cx + 9.2, z1: cz + 9.4, top: gy + 0.18 });
    groundSheet(ctx, {
      x0: cx - 9.1, z0: cz - 6.5, x1: cx + 9.1, z1: cz + 9.3,
      y: gy + 0.18, lift: 0.02, cell: 2.2, tex: gravelTex(), color: 0xe4dfd2,
    });

    // 山門 -- small, timber, with the temple's formal name over it
    templeGate(ctx, b, {
      x: cx, z: cz - 4.0, y: gy + 0.18, ry: 0, w: 3.2, d: 2.0, colH: 2.9, plaque: '八坂庚申堂',
    });
    // the pillar boards flanking the gate: 「日本最初」「庚申信仰発祥の地」
    const pillarText = ['日本最初', '庚申信仰発祥の地'];
    for (let i = 0; i < 2; i++) {
      const px = cx + (i ? 2.5 : -2.5), pz = cz - 4.0;
      const py = ctx.groundAt(px, pz);
      b.add(box(0.26, 2.2, 0.26), trs(px, py + 1.1, pz), PAL.timberPale, { bands: 3, tint: TINT.warm });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 1.5),
        celTex(verticalSign(pillarText[i], { board: PAL.timberPale, brush: true }), { bands: 3, tint: TINT.warm }));
      s.position.set(px, py + 1.35, pz - 0.15);
      s.userData.noOutline = true;
      ctx.add(s);
    }

    // 本堂 -- 1678, modest, tile, with a deep porch the bunches hang from
    const hondo = smallHall(ctx, b, {
      x: cx, z: cz + 4.6, ry: 0, w: 7.6, d: 6.2, colH: 3.05, hip: false,
    });
    // 賓頭盧堂 -- the little open structure the racks stand under
    {
      const bx = cx + 4.9, bz = cz + 0.6, by = ctx.groundAt(bx, bz);
      const M = trs(bx, by, bz, 0, -Math.PI / 2, 0);
      b.add(box(3.4, 0.34, 3.0), M.clone().multiply(trs(0, 0.17, 0)), PAL.stone, { bands: 3, tint: TINT.cool });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        b.add(box(0.16, 2.5, 0.16), M.clone().multiply(trs(sx * 1.5, 1.55, sz * 1.3)), PAL.vermilionDeep, { bands: 3, tint: TINT.warmDeep });
      }
      b.add(box(3.5, 0.20, 0.20), M.clone().multiply(trs(0, 2.9, -1.3)), PAL.vermilion, { bands: 3, tint: TINT.warmDeep });
      b.add(box(3.5, 0.20, 0.20), M.clone().multiply(trs(0, 2.9, 1.3)), PAL.vermilion, { bands: 3, tint: TINT.warmDeep });
      const r = hipRoof({ w: 3.2, d: 2.8, pitch: 0.46, eave: 0.85, material: 'tile', sori: 0.09, cornerLift: 0.3, ridgeCourses: 3, y: 3.02 });
      addParts(b, r.parts, M);
      ctx.collideRot(bx, bz, 3.4, 3.0, 0, by + 0.35);

      /* The racks.  This is the picture: a dense wall of colour under a dark
       * eave, with the pagoda over the roofline behind it. */
      saru.rack(bx - 0.1, by + 2.74, bz - 1.15, -Math.PI / 2, 3.0, 12, 5);
      saru.rack(bx - 0.1, by + 2.74, bz + 1.15, -Math.PI / 2, 3.0, 12, 5);
      saru.rack(bx - 1.35, by + 2.74, bz, 0, 2.4, 9, 5);
    }

    // strung off the 本堂 eaves and the gate
    for (let tier = 0; tier < 2; tier++) {
      for (let i = 0; i < 17; i++) {
        const u = -3.6 + (i / 16) * 7.2;
        saru.bunch(cx + u, hondo.eaveY - 0.30 - tier * 0.44, cz + 4.6 - 3.9, rng.int(5, 8));
      }
    }
    for (let i = 0; i < 9; i++) {
      saru.bunch(cx - 1.8 + i * 0.45, gy + 0.18 + 2.6, cz - 4.0 - 1.15, rng.int(4, 7));
    }
    // and along the rail of the little court
    for (let i = 0; i < 8; i++) {
      saru.bunch(cx - 6.4 + i * 1.7, gy + 1.58, cz - 4.7, rng.int(4, 6));
      b.add(box(1.7, 0.09, 0.09), trs(cx - 6.4 + i * 1.7, gy + 1.58, cz - 4.7), PAL.vermilionDeep,
        { bands: 3, tint: TINT.warmDeep });
    }

    /* 授与品 board, verbatim from the temple, in vertical kanji numerals.
     * 「くくり猿　一体　五百円 / 赤　青　黄色」 -- the official three colours,
     * quoted as written even though the racks are visibly ten. */
    const price = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.04), celTex(noticeBoard(
      ['くくり猿　一体　五百円', '　　　赤　青　黄色', '小型くくり猿　五百円', '五連くくり猿　二千五百円', '料金　無料'],
      { title: '授与品', board: 0x3a3028, textColor: PAL.paper, accent: PAL.gold }
    ), { bands: 3, tint: TINT.warm }));
    price.position.set(cx - 3.1, gy + 1.72, cz - 2.4);
    price.rotation.y = 0.25;
    price.userData.noOutline = true;
    ctx.add(price);

    // 三猿, a 手水鉢, hanging 提灯, and the temple's own trees
    ctx.prop({ kind: 'stoneBasin', x: cx - 5.2, z: cz + 0.4, y: ctx.groundAt(cx - 5.2, cz + 0.4), rot: 1.6 });
    ctx.prop({ kind: 'candleStand', x: cx + 1.6, z: cz + 0.2, y: ctx.groundAt(cx + 1.6, cz + 0.2) });
    ctx.prop({ kind: 'incenseBurner', x: cx - 0.2, z: cz + 0.4, y: ctx.groundAt(cx - 0.2, cz + 0.4) });
    ctx.tree({ kind: 'maple', x: cx - 6.0, z: cz + 6.4, y: ctx.groundAt(cx - 6.0, cz + 6.4), scale: 1.0, seed: 71 });
    ctx.tree({ kind: 'camellia', x: cx + 6.2, z: cz + 6.8, y: ctx.groundAt(cx + 6.2, cz + 6.8), scale: 0.9, seed: 72 });

    const lt = celTex(lanternTex('庚申', { paper: PAL.paper, textColor: PAL.black, ribs: 9, band: PAL.lanternFrame }),
      { bands: 'soft', tint: TINT.warm, color: 0xffffff });
    const lg = new THREE.CylinderGeometry(0.15, 0.15, 0.44, 10, 1, true);
    for (const u of [-1.9, 1.9]) {
      const m = new THREE.Mesh(lg, lt);
      m.position.set(cx + u, hondo.eaveY - 0.55, cz + 4.6 - 3.6);
      m.userData.noOutline = true;
      ctx.add(m);
      ctx.light({ x: cx + u, y: hondo.eaveY - 0.55, z: cz + 4.6 - 3.6, color: PAL.lanternLit, intensity: 0.55, distance: 8 });
    }

    /* 塔ノ下商店街 -- the little approach beneath the pagoda, 「赤いくくり猿が
     * 吊るされた」.  Red ones, strung from the shop eaves down the lane. */
    for (const t of [0.34, 0.43, 0.52, 0.61, 0.70, 0.77]) {
      for (const s of [-1, 1]) {
        const a = atStreet('koshindoLane', t, { side: s, offset: 2.85 });
        if (!a) continue;
        saru.bunch(a.x, a.y + 2.58, a.z, rng.int(4, 6), { red: true });
      }
    }
  }

  /* 塔ノ下商店街 -- the lane's own frontage.
   *
   * `STREETS.koshindoLane` carries `frontage: 2.0`, which would put the two
   * rows 4.0 m apart: with a shopfront's display projecting 0.9 m into that
   * there is 1.4 m of usable lane and the walker (radius 0.34) cannot get
   * down it -- the `koshindo` hero camera stands *inside* a shop's goods.
   * The measured value is the paved width, not the building line, so the
   * frontage is set back 1.2 m to give the same 6.4 m face to face that
   * 八坂通 has.  Stated, per KIT.md 1. */
  for (const side of [-1, 1]) {
    const plots = layoutPlots({
      /* The two sides start in different places.  East of the lane at low t
       * is still 八坂通's own carriageway, so that row cannot begin until
       * t = 0.30; west of it is the corner block between the two streets,
       * which is real ground and is what closes the right of the classic
       * frame now that the corridor row stops at the crossing. */
      street: 'koshindoLane', side, from: side > 0 ? 0.14 : 0.30, to: 0.78,
      mix: 'shop', gap: 0.03, setback: 1.2, seed: 880 + side,
    });
    plots.forEach((p, i) => {
      out.buildings.push(makeShopfront(ctx, {
        x: p.x, z: p.z, ry: p.ry, width: p.width, depth: rng.range(5.5, 8.5),
        kind: rng.pick(['souvenir', 'wagashi', 'komono', 'ceramics']),
        seed: (5051 * (i + 2) + (side > 0 ? 17 : 91)) >>> 0, baker: BK,
        timberTone: PAL.timber,
      }));
      ctx.stats.shopfronts++;
    });
  }

  saru.emit(ctx, b);

  /* ------------------------------------------------------------------ *
   * 3.7b  八坂通東 -- the first 30 m of the Sannenzaka link.
   *
   * The stretch that runs east under the compound's south wall, and the floor
   * of the `pagoda-east` hero view (「the *second* most photographed angle:
   * the pagoda with the Kyoto basin falling away behind it」).  Only the head
   * of it is built here -- the block inside the 'pagoda' district box -- and
   * the climb to Sannenzaka belongs to whoever owns that street.
   * ------------------------------------------------------------------ */
  /* **South side only.**  The north side of this stretch is the compound and
   * the strip of ground between it and the road, and a machiya row on it
   * stands squarely between the road and the tower -- which kills the
   * looking-back view stone dead.  It gets a wall and trees instead. */
  {
    const plots = layoutPlots({
      street: 'pagodaLink', side: 1, from: 0.02, to: 0.30,
      mix: 'machiya', gap: 0.03, seed: 951,
    });
    plots.forEach((p, i) => {
      const side = 1;
      const seed = (8123 * (i + 2) + (side > 0 ? 47 : 13)) >>> 0;
      if (rng.chance(0.55)) {
        out.buildings.push(makeShopfront(ctx, {
          x: p.x, z: p.z, ry: p.ry, width: p.width, depth: rng.range(7, 12),
          kind: rng.pick(['ceramics', 'wagashi', 'souvenir', 'matcha', 'crafts']),
          seed, baker: BK,
          timberTone: rng.chance(0.3) ? PAL.timberDark : PAL.timber,
        }));
        ctx.stats.shopfronts++;
      } else {
        out.buildings.push(makeMachiya(ctx, {
          x: p.x, z: p.z, ry: p.ry, width: p.width, depth: rng.range(8, 13),
          style: rng.chance(0.4) ? 'residence' : 'machiya', seed, baker: BK,
          timberTone: rng.chance(0.3) ? PAL.timberDark : PAL.timber,
          plasterTone: rng.chance(0.5) ? PAL.plasterOchre : PAL.plasterWarm,
          roofMaterial: rng.chance(0.25) ? 'tileOld' : 'tile',
        }));
      }
    });
  }
  /* The north edge: a 板塀 with the compound's trees over it, and then the
   * 石垣 and the tower.  This is the *second* most photographed angle on the
   * route and it is a wall, a roof and a pagoda -- nothing else. */
  {
    /* 築地塀, not a board fence: this IS the temple's own boundary and a
     * charred-cedar slab of `timberDark` at 7 m reads as a black billboard
     * with the tower behind it.  The earthen wall is pale, it carries the
     * same two lime bands as the compound's, and its tiled cap gives the
     * frame a horizontal to sit the pagoda on. */
    const pts = alongStreet({
      street: 'pagodaLink', side: -1, from: 0.012, to: 0.245,
      spacing: 5.0, jitter: 0, seed: 3, offset: 4.4,
    });
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1];
      const len = Math.hypot(c.x - a.x, c.z - a.z);
      if (len < 0.3) continue;
      const ang = Math.atan2((c.x - a.x) / len, (c.z - a.z) / len);
      const base = Math.min(a.y, c.y) - 0.2;
      const M = trs((a.x + c.x) / 2, base, (a.z + c.z) / 2, 0, ang, 0);
      const h = 2.05 + (Math.max(a.y, c.y) - Math.min(a.y, c.y)) * 0.5 + 0.2;
      b.add(box(len + 0.05, 0.46, 0.68), M.clone().multiply(trs(0, 0.23, 0)),
        PAL.stoneWall, { bands: 3, tint: TINT.cool });
      b.add(box(len + 0.05, h - 0.46, 0.44), M.clone().multiply(trs(0, 0.46 + (h - 0.46) / 2, 0)),
        PAL.plasterOchre, { bands: 3, tint: TINT.cool });
      for (const ly of [0.44, 0.70]) {
        b.add(box(len + 0.05, 0.05, 0.49), M.clone().multiply(trs(0, 0.46 + (h - 0.46) * ly, 0)),
          PAL.plaster, { bands: 'soft3', tint: TINT.cool });
      }
      const cap = gableRoof({
        w: len + 0.05, d: 0.86, pitch: 0.32, eave: 0.30, material: 'tile',
        mukuri: 0.03, ridgeCourses: 2, y: h, gableEnd: false,
      });
      addParts(b, cap.parts, M);
      ctx.collide(Math.min(a.x, c.x) - 0.30, Math.min(a.z, c.z) - 0.30,
        Math.max(a.x, c.x) + 0.30, Math.max(a.z, c.z) + 0.30);
    }
    for (const t of [0.05, 0.11, 0.17, 0.23]) {
      const q = atStreet('pagodaLink', t, { side: -1, offset: 6.6 });
      if (!q) continue;
      ctx.tree({
        kind: rng.chance(0.55) ? 'maple' : 'camellia', x: q.x, z: q.z,
        y: ctx.groundAt(q.x, q.z), scale: rng.range(0.8, 1.1), seed: rng.int(0, 9999),
      });
    }
  }
  {
    for (const pt of alongStreet({
      street: 'pagodaLink', side: 1, from: 0.03, to: 0.28,
      spacing: 7.5, jitter: 3, seed: 661, offset: 3.5,
    })) {
      const r = rng.next();
      if (r < 0.16) ctx.prop({ kind: 'planterPot', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry, seed: rng.int(0, 9999) });
      else if (r < 0.24) ctx.prop({ kind: 'bicycle', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry + Math.PI / 2, seed: rng.int(0, 9999) });
      else if (r < 0.30) ctx.tree({ kind: 'potted', x: pt.x, z: pt.z, y: pt.y, scale: rng.range(0.5, 0.75), seed: rng.int(0, 9999) });
    }
  }

  /* ------------------------------------------------------------------ *
   * 3.8  街区名 and street-level clutter.
   *
   * 八坂通 is inside the 産寧坂 preservation district, so: **no poles, no
   * overhead wires, no bright signage.**  What is here is what the ordinance
   * leaves: potted plants against the frontage, a bicycle, drain covers, and
   * one vending machine in the regulated brown that the city forces on it.
   * ------------------------------------------------------------------ */
  for (const side of [-1, 1]) {
    for (const pt of alongStreet({
      street: 'yasakadori', side, from: 0.05, to: 0.94,
      spacing: 6.2, jitter: 2.6, seed: 610 + side, offset: 2.55,
    })) {
      /* Pots, not planting.  A Kyoto frontage keeps a row of small ones on
       * its 犬走り; a big potted shrub every six metres reads as municipal
       * landscaping, which is the one thing this street does not have. */
      const r = rng.next();
      if (r < 0.15) {
        ctx.tree({ kind: 'potted', x: pt.x, z: pt.z, y: pt.y, scale: rng.range(0.5, 0.75), rot: rng.range(0, 6.28), seed: rng.int(0, 9999) });
      } else if (r < 0.40) {
        ctx.prop({ kind: 'planterPot', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry, seed: rng.int(0, 9999) });
      } else if (r < 0.47) {
        ctx.prop({ kind: 'bicycle', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry + Math.PI / 2, seed: rng.int(0, 9999) });
      } else if (r < 0.53) {
        ctx.prop({ kind: 'crate', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry, variant: rng.int(0, 2) });
      } else if (r < 0.57) {
        ctx.prop({ kind: 'umbrellaStand', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry });
      }
    }
  }
  // the gutter line: drain covers down the north channel, and two manholes
  for (const pt of alongStreet({
    street: 'yasakadori', side: -1, from: 0.06, to: 0.95, spacing: 11, jitter: 2, seed: 77, offset: 1.85,
  })) {
    ctx.prop({ kind: 'drainCover', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry });
  }
  for (const t of [0.22, 0.58, 0.83]) {
    const a = atStreet('yasakadori', t, { side: 1, offset: 1.2 });
    if (a) ctx.prop({ kind: 'manhole', x: a.x, z: a.z, y: a.y, rot: a.along });
  }
  /* One vending machine, in 茶 brown, at the 東大路 end where the ordinance
   * relaxes -- it is the single clearest signal that this is a working city
   * street and not a film set. */
  {
    const a = atStreet('yasakadori', 0.055, { side: 1, offset: 2.7 });
    if (a) {
      ctx.prop({ kind: 'vendingMachine', x: a.x, z: a.z, y: a.y, rot: a.across });
      ctx.light({ x: a.x, y: a.y + 1.3, z: a.z, color: PAL.paperLit, intensity: 0.35, distance: 5 });
    }
    const c = atStreet('yasakadori', 0.075, { side: -1, offset: 2.6 });
    if (c) ctx.prop({ kind: 'trafficMirror', x: c.x, z: c.z, y: c.y, rot: c.across });
    const d = atStreet('yasakadori', 0.30, { side: -1, offset: 2.5 });
    if (d) ctx.prop({ kind: 'extinguisherBox', x: d.x, z: d.z, y: d.y, rot: d.across });
    const e = atStreet('yasakadori', 0.66, { side: 1, offset: 2.5 });
    if (e) ctx.prop({ kind: 'catAsleep', x: e.x, z: e.z, y: e.y, rot: e.along + 0.4 });
  }

  /* 八坂通 -- the incised granite street marker at the Higashioji end. */
  {
    const a = atStreet('yasakadori', 0.022, { side: -1, offset: 2.9 });
    if (a) {
      b.add(box(0.24, 1.55, 0.24), trs(a.x, a.y + 0.78, a.z, 0, a.across, 0), PAL.stone, { bands: 3, tint: TINT.cool });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.95),
        celTex(verticalSign('八坂通', { board: PAL.stone, textColor: PAL.black, frame: false }), { bands: 3, tint: TINT.cool }));
      s.position.set(a.x, a.y + 0.98, a.z);
      s.rotation.y = a.across;
      s.translateZ(0.13);
      s.userData.noOutline = true;
      ctx.add(s);
    }
  }

  /* ------------------------------------------------------------------ *
   * 3.9  Interactables.  Small, quiet, and none of them a game mechanic.
   * ------------------------------------------------------------------ */
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hit = (x, y, z, w, h, d, label, action) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat);
    m.position.set(x, y, z);
    m.visible = false;
    m.userData.noOutline = true;
    ctx.add(m);
    ctx.interact({ hitbox: m, label, action: action || (() => {}) });
    return m;
  };

  hit(TERR.x0 + 0.1, TERR.top + 1.6, GATE_Z, 1.0, 2.8, GATE_W, 'the temple gate — 法観寺');
  hit(-11.4, TERR.top + 1.5, -5.6, 2.6, 2.2, 2.4, 'buy a ticket — 四百円');
  hit(8.6, yakushido.y + 1.5, 2.2, 2.0, 2.4, 5.0, 'the Yakushi hall');
  hit(-10.4, ctx.groundAt(-10.4, -1.2) + 0.7, -1.2, 1.1, 1.2, 1.1, 'rinse your hands');
  hit(-34.0, ctx.groundAt(-34, 21.6) + 1.6, 21.6, 3.4, 2.6, 1.2, 'Yasaka Koshin-do');
  {
    const bxx = -34.0 + 4.9, bzz = 26.0 + 0.6;
    hit(bxx, ctx.groundAt(bxx, bzz) + 1.9, bzz, 3.4, 2.4, 3.0, 'tie a kukurizaru');
  }
  {
    const a = atStreet('yasakadori', 0.800, { side: 1, offset: 2.2 });
    if (a) hit(a.x, a.y + 1.4, a.z, 2.0, 2.2, 1.2, 'coffee');
  }

  return { ...out, pagoda, terrace: TERR, flight };
}
