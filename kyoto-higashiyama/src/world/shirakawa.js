import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT, celTex, flat } from '../core/toon.js';
import { rngKit, clamp, lerp, trs, closestOnPolyline, resample, TAU } from '../core/util.js';
import { noticeBoard, norenTex } from '../core/textures.js';
import { makeMachiya } from '../kit/machiya.js';
import { makeTorii } from '../kit/shrine.js';
import { layoutPlots, alongStreet, atStreet } from './plots.js';
import { groundColorAt } from './terrain.js';

/* ------------------------------------------------------------------ *
 * 祇園白川 -- Shinbashi-dori, the Shirakawa, and the Tatsumi bridge.
 *
 * The most photographed hundred metres in Kyoto, and the reason is a stack of
 * four horizontal bands: stone lane, low stone wall, water, and a wall of
 * two-storey timber rising straight out of the far bank -- with willows
 * hanging across the whole of it.  Every decision below is about keeping those
 * four bands legible.
 *
 * ------------------------------------------------------------ THE SURVEY
 *
 * Three streets, from north to south (route.js; all bearings measured):
 *
 *   新橋通  z -811.9 .. -795.4   the preservation street, stone, one-way
 *   白川南通 z -754.9 .. -795.4   the canal walk, hard against the water
 *   白川    the stream itself, a `kind:'water'` polyline, NOT a corridor
 *
 * They are not parallel.  Shinbashi and the canal walk are 57 m apart at the
 * west end and **converge to a point** at (-421.4, -795.4), which is why the
 * block between them is a wedge and why the frontage on its inner face has to
 * stop before the two streets meet.  The canal runs a constant **5.25 m south
 * of the canal walk's centreline** over its whole length -- so the lane's
 * south kerb IS the top of the revetment, and there is no verge between them.
 * The willows grow out of the pavement, which is exactly what they do in life.
 *
 * (The name 白川"南"通 says the lane is on the south bank; the surveyed
 * coordinates put it on the north.  route.js is the contract -- KIT.md 1 -- so
 * the lane is built where the survey says it is and the composition is
 * unchanged: lane, wall, water, far-bank frontage.)
 *
 * ------------------------------------------------------------ THE GROUND
 *
 * The canal is a `ctx.cut` registered by `base`, and a cut is an
 * **axis-aligned box**.  The Shirakawa runs diagonally, so the six boxes that
 * quantise it excavate a 28 m wide trench that swallows the canal walk, the
 * junction and the bridge -- probe the height field along z at x = -466 and
 * the ground is at 35.8 for twenty-six metres.  Left alone, the player falls
 * three metres into a pit the moment they step onto 白川南通.
 *
 * So the first thing this district does is **give the banks back**: a run of
 * platform strips either side of the centreline, stepped every 2 m so the
 * staircase they leave at the water's edge is smaller than the wall that
 * stands on it.  The channel keeps the cut.
 *
 * The second thing is the terrain *mesh*.  `buildGround` runs before any
 * district, so the visible ground was tessellated with **no canal in it at
 * all** -- a flat plane at 39 m straight over the top of the water.  Nothing
 * throws; the Shirakawa is simply not there.  The fix is surgical and local:
 * find every ground triangle that overlaps the channel, drop it, and relay
 * that patch of ground at 2 m instead of the 6 m (near) / 24 m (far, and the
 * far field starts at z = -780, i.e. across most of this district) that the
 * terrain uses.  See `relayGround` below.
 *
 * -------------------------------------------------------------- THE WIRES
 *
 * 新橋通 **still has poles.**  STREET.md 3.2, from the city's own 無電柱化
 * programme documents: 花見小路 was undergrounded in 2001 and 白川南通 is
 * pole-free -- but only by 裏配線, rerouting the wires onto the back street,
 * *which is Shinbashi*.  So the postcard lane is clean and the street one
 * block north carries the whole bundle, and that contrast is the single
 * cheapest piece of truth available here.  `props.js` guards the area with a
 * blanket no-pole rectangle, so the poles are placed with `force: true` and
 * only on Shinbashi's own centreline.
 * ------------------------------------------------------------------ */

export const id = 'shirakawa';

/* ---------------------------------------------------------------- tuning */

const CHAN = 2.85;          // half-width of open water
const WALL_T = 0.62;        // revetment thickness, CHAN .. CHAN+WALL_T
const WALL_OUT = CHAN + WALL_T;
const DROP = 1.24;          // bank to water surface
const BANK_OUT = 17.0;      // how far the bank platforms reach from the axis
const STEP = 2.0;           // platform / geometry station spacing along the canal

/* The bands the bank platform is built in.  Three, because the true ground
 * falls about 0.27 m from the lane's crown to the middle of the block, and one
 * flat slab across the lot would leave the paving ribbon standing on a kerb.
 * The 0.12 m risers are well under the 0.42 m step threshold: invisible. */
const BANDS = [[2.90, 7.0, 0.00], [7.0, 12.0, 0.13], [12.0, BANK_OUT, 0.26]];

/* ------------------------------------------------------------------ *
 * The canal frame.
 *
 * Everything in this district is positioned in (s, d): arc length along the
 * stream and signed offset across it, **negative north** (the lane side) and
 * positive south (the far bank).  Nothing in this file holds a raw z for
 * anything that belongs to the water.
 *
 * Built once and memoised, because both the terrain hook and the builder need
 * it and the terrain hook runs first.
 * ------------------------------------------------------------------ */
let FRAME = null;

function frame(ctx) {
  if (FRAME) return FRAME;
  const spine = resample(ctx.STREETS.shirakawa.points, STEP);
  const ST = [];
  {
    let s = 0;
    for (let i = 0; i < spine.length; i++) {
      const a = spine[i];
      const b = spine[Math.min(spine.length - 1, i + 1)];
      const p = spine[Math.max(0, i - 1)];
      const dx = b.x - p.x, dz = b.z - p.z;
      const L = Math.hypot(dx, dz) || 1;
      if (i > 0) s += Math.hypot(a.x - spine[i - 1].x, a.z - spine[i - 1].z);
      // the SOUTH normal: rotate the tangent +90 deg about Y
      ST.push({ x: a.x, z: a.z, y: a.y, s, tx: dx / L, tz: dz / L, nx: -dz / L, nz: dx / L });
    }
  }
  const SLEN = ST[ST.length - 1].s;

  /** Point at (s, d).  `d` negative = north (lane), positive = south. */
  const at = (s, d) => {
    const t = clamp(s / SLEN, 0, 1) * (ST.length - 1);
    const i = Math.min(ST.length - 2, Math.floor(t));
    const f = t - i;
    const a = ST[i], b = ST[i + 1];
    return {
      x: lerp(a.x, b.x, f) + lerp(a.nx, b.nx, f) * d,
      z: lerp(a.z, b.z, f) + lerp(a.nz, b.nz, f) * d,
      nx: lerp(a.nx, b.nx, f), nz: lerp(a.nz, b.nz, f),
      tx: lerp(a.tx, b.tx, f), tz: lerp(a.tz, b.tz, f),
    };
  };
  /** (x, z) -> (s, d).  Used to test the terrain against the channel. */
  const project = (x, z) => {
    const c = closestOnPolyline(spine, x, z);
    const i = Math.min(ST.length - 1, Math.max(0, c.index));
    const side = (x - c.px) * ST[i].nx + (z - c.pz) * ST[i].nz;
    return { s: c.s, d: side >= 0 ? c.dist : -c.dist };
  };

  /* The bank's elevation is the canal walk's design elevation: the lane runs
   * 5.25 m north of the stream for its whole length and its south kerb is the
   * top of the wall, so they are the same level by construction.  Derived from
   * the corridor rather than written down -- KIT.md 1. */
  const laneC = ctx.getCorridor('shirakawaMinami');
  const bankYAt = (x) => {
    if (!laneC) return 39.0;
    let lo = 0, hi = laneC.length;
    for (let k = 0; k < 22; k++) {
      const m = (lo + hi) / 2;
      if (laneC.pointAt(m).x < x) lo = m; else hi = m;
    }
    return laneC.pointAt((lo + hi) / 2).y;
  };
  const bankY = ST.map((p) => bankYAt(p.x));
  const bankAt = (s) => bankY[clamp(Math.round(s / STEP), 0, bankY.length - 1)];

  FRAME = { spine, ST, SLEN, at, project, bankY, bankAt };
  return FRAME;
}

/** z on a corridor at a given x, by bisection.  Both streets here are monotone in x. */
function nearestZ(c, x) {
  if (!c) return 0;
  let lo = 0, hi = c.length;
  for (let k = 0; k < 22; k++) {
    const m = (lo + hi) / 2;
    if (c.pointAt(m).x < x) lo = m; else hi = m;
  }
  return c.pointAt((lo + hi) / 2).z;
}

/** An invisible hitbox plus its prompt. */
function interact(ctx, x, y, z, r, label, action) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(r, r, r));
  m.position.set(x, y, z);
  m.visible = false;
  ctx.add(m);
  ctx.interact({ hitbox: m, label, action });
  return m;
}

/** A short noren hung across a doorway on a facade at (x, z) facing `ry`. */
function norenOn(ctx, x, z, ry, y, text, cloth) {
  const g = new THREE.PlaneGeometry(1.55, 1.15);
  g.rotateY(Math.PI);
  const m = new THREE.Mesh(g, celTex(norenTex(text, {
    cloth, panels: 3, textColor: PAL.norenCream,
  }), { bands: 3, tint: TINT.cool, transparent: true, alphaTest: 0.42, side: THREE.DoubleSide }));
  m.position.set(x - Math.sin(ry) * 0.16, y - 0.575, z - Math.cos(ry) * 0.16);
  m.rotation.y = ry;
  m.userData.noOutline = true;
  ctx.add(m);
  return m;
}

/**
 * `buildWillow`'s lean angle, reproduced.
 *
 * The kit draws, in order: `range(7,10)` height, `range(0.40,0.52)` shoulder,
 * `range(0.024,0.034)` radius, then `range(0, TAU)` -- the lean.  Replaying
 * the first four draws of a candidate seed is enough to know which way a tree
 * will fall before it is built.  If the kit's order ever changes this degrades
 * to "a randomly aimed willow", which is what it would have been anyway.
 */
function leanSeed(base, want) {
  let best = (base * 2654435761) >>> 0 || 1, err = 9;
  for (let k = 0; k < 128; k++) {
    const s = ((base * 2654435761) ^ (k * 40503)) >>> 0 || 1;
    const r = rngKit(s);
    r.range(7, 10); r.range(0.40, 0.52); r.range(0.024, 0.034);
    const a = r.range(0, TAU);
    let e = Math.abs(a - want);
    while (e > Math.PI) e = Math.abs(e - TAU);
    if (e < err) { err = e; best = s; }
    if (err < 0.22) break;
  }
  return best;
}

/* ------------------------------------------------------------------ *
 * relayGround
 *
 * `buildGround` tessellates the world *before* any district runs, so the
 * terrain mesh over this district was built with no canal in it: a flat sheet
 * at 39 m straight across the water.  And the near field stops at z = -780, so
 * two-thirds of Gion Shinbashi is on the 24 m far grid -- a single triangle
 * there is wider than the stream.
 *
 * So: find every ground triangle that overlaps the channel, take the bounding
 * box of that set, drop every triangle whose centroid falls inside it, and
 * relay that rectangle at 2 m -- with the channel left open.  The replacement
 * runs 17 m past the removal box on all sides, which is more than the reach of
 * the largest surviving triangle, so it always tucks under rather than
 * fighting.  Vertex colours and the street dip come from the terrain's own
 * functions, so the patch is the same ground, only finer.
 * ------------------------------------------------------------------ */
function relayGround(ctx, project, ST, bankY, SLEN) {
  const ground = ctx.root.getObjectByName('ground');
  if (!ground) return;

  const OPEN = 3.55;                       // the hole: the back of the revetment
  const box = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
  const meshes = [];
  ground.traverse((o) => { if (o.isMesh && o.geometry?.index) meshes.push(o); });

  /* A generous box round the stream, so pass 1 does not project a hundred
   * thousand triangles it is never going to want. */
  const near = { x0: -640, x1: -340, z0: -840, z1: -700 };

  /* pass 1 -- which triangles reach over the water */
  for (const m of meshes) {
    const pos = m.geometry.attributes.position.array;
    const idx = m.geometry.index.array;
    for (let i = 0; i < idx.length; i += 3) {
      let hit = false, bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
      for (let k = 0; k < 3; k++) {
        const v = idx[i + k] * 3;
        const x = pos[v], z = pos[v + 2];
        bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x);
        bz0 = Math.min(bz0, z); bz1 = Math.max(bz1, z);
      }
      // cheap: does the triangle's box come within the channel at all
      const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
      if (cx < near.x0 || cx > near.x1 || cz < near.z0 || cz > near.z1) continue;
      const p = project(cx, cz);
      const reach = Math.max(bx1 - bx0, bz1 - bz0) * 0.75;
      if (p.s > -reach && p.s < SLEN + reach && Math.abs(p.d) < OPEN + reach) hit = true;
      if (!hit) continue;
      box.x0 = Math.min(box.x0, bx0); box.x1 = Math.max(box.x1, bx1);
      box.z0 = Math.min(box.z0, bz0); box.z1 = Math.max(box.z1, bz1);
    }
  }
  if (!isFinite(box.x0)) return;

  /* pass 2 -- drop everything centred inside that box */
  let dropped = 0;
  for (const m of meshes) {
    const pos = m.geometry.attributes.position.array;
    const idx = m.geometry.index.array;
    const keep = [];
    for (let i = 0; i < idx.length; i += 3) {
      let x = 0, z = 0;
      for (let k = 0; k < 3; k++) { const v = idx[i + k] * 3; x += pos[v]; z += pos[v + 2]; }
      x /= 3; z /= 3;
      if (x > box.x0 && x < box.x1 && z > box.z0 && z < box.z1) { dropped++; continue; }
      keep.push(idx[i], idx[i + 1], idx[i + 2]);
    }
    if (keep.length !== idx.length) {
      m.geometry.setIndex(keep.length > 65535
        ? new THREE.Uint32BufferAttribute(keep, 1)
        : new THREE.Uint16BufferAttribute(keep, 1));
      m.geometry.computeVertexNormals();
    }
  }
  if (!dropped) return;

  /* pass 3 -- relay it.
   *
   * Two pieces.  A **canal-aligned apron** either side of the stream, whose
   * inner edge is exactly the back of the revetment, because a hole cut out of
   * an axis-aligned grid is ragged by half a cell and the wall is 0.6 m thick;
   * and an ordinary axis-aligned patch for everything beyond it, which is flat
   * ground and does not care how it is tessellated.  They overlap by a couple
   * of metres and the apron sits 0.04 m higher, so the join is a step nobody
   * can see rather than two coplanar surfaces fighting. */
  const OUT = 14.0;                          // the apron's outer edge
  const c = new THREE.Color();
  const colour = (x, z) => {
    const surf = ctx.surfaceAt(x, z);
    c.set(groundColorAt(x, z, ctx.PAL, surf));
    return { r: c.r, g: c.g, b: c.b, dip: surf ? 0.16 : 0 };
  };

  {
    const rows = [OPEN, 4.4, 5.6, 7.2, 9.2, 11.4, OUT];
    const D = [...rows.map((r) => -r).reverse(), ...rows];   // north .. south
    const n = ST.length, m = D.length;
    const pos = new Float32Array(n * m * 3);
    const col = new Float32Array(n * m * 3);
    for (let i = 0; i < n; i++) {
      const p = ST[i];
      for (let j = 0; j < m; j++) {
        const x = p.x + p.nx * D[j], z = p.z + p.nz * D[j];
        const q = colour(x, z);
        const k = (i * m + j) * 3;
        pos[k] = x; pos[k + 1] = ctx.groundAt(x, z) - q.dip - 0.02; pos[k + 2] = z;
        col[k] = q.r; col[k + 1] = q.g; col[k + 2] = q.b;
      }
    }
    const idx = [];
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < m - 1; j++) {
        // the middle pair straddles the water: leave it out
        if (D[j] < 0 && D[j + 1] > 0) continue;
        const a0 = i * m + j, b0 = a0 + 1, c0 = a0 + m, d0 = c0 + 1;
        idx.push(a0, c0, b0, b0, c0, d0);
      }
    }
    ground.add(patchMesh(ctx, pos, col, idx, 'ground:shirakawa-bank'));
  }

  const M = 17;
  const R = { x0: box.x0 - M, x1: box.x1 + M, z0: box.z0 - M, z1: box.z1 + M };
  const cell = 2.0;
  const nx = Math.max(1, Math.round((R.x1 - R.x0) / cell));
  const nz = Math.max(1, Math.round((R.z1 - R.z0) / cell));
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3);
  const col = new Float32Array((nx + 1) * (nz + 1) * 3);
  let k = 0;
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = R.x0 + (i / nx) * (R.x1 - R.x0);
      const z = R.z0 + (j / nz) * (R.z1 - R.z0);
      const q = colour(x, z);
      pos[k] = x; pos[k + 1] = ctx.groundAt(x, z) - q.dip - 0.06; pos[k + 2] = z;
      col[k] = q.r; col[k + 1] = q.g; col[k + 2] = q.b;
      k += 3;
    }
  }
  const idx = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = R.x0 + ((i + 0.5) / nx) * (R.x1 - R.x0);
      const z = R.z0 + ((j + 0.5) / nz) * (R.z1 - R.z0);
      const p = project(x, z);
      if (p.s > -cell && p.s < SLEN + cell && Math.abs(p.d) < OUT - cell * 0.9) continue;
      const a0 = j * (nx + 1) + i, b0 = a0 + 1, c0 = a0 + nx + 1, d0 = c0 + 1;
      idx.push(a0, c0, b0, b0, c0, d0);
    }
  }
  ground.add(patchMesh(ctx, pos, col, idx, 'ground:shirakawa'));
}

/** One vertex-coloured ground mesh sharing the terrain's own material. */
function patchMesh(ctx, pos, col, idx, name) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx.length > 65535 ? new THREE.Uint32BufferAttribute(idx, 1)
    : new THREE.Uint16BufferAttribute(idx, 1));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, ctx.groundMaterial);
  mesh.name = name;
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

/* ------------------------------------------------------------------ *
 * terrain -- give the banks back.
 *
 * `base` registers the channel as a `ctx.cut`, and a cut is an axis-aligned
 * box.  The Shirakawa runs diagonally, so the boxes that quantise it excavate
 * a trench far wider than the stream -- wide enough to swallow the canal walk,
 * the junction and the bridge.  Left alone the player steps onto 白川南通 and
 * drops three metres into a pit.
 *
 * So this runs in the terrain phase, after the cut and before the ground mesh
 * is generated, and lays a run of platform strips either side of the axis that
 * restore everything except the channel itself.  Stepped every 2 m along the
 * stream, so the staircase the quantisation leaves at the water's edge is
 * smaller than the wall that stands on it and is hidden by it.
 * ------------------------------------------------------------------ */
export function terrain(ctx) {
  const F = frame(ctx);
  const { ST, SLEN, at, bankAt } = F;

  for (let s = -6; s <= SLEN + 6; s += STEP) {
    const y = bankAt(clamp(s, 0, SLEN));
    for (const side of [-1, 1]) {
      for (const [d0, d1, drop] of BANDS) {
        const a = at(clamp(s, 0, SLEN), side * d0);
        const b = at(clamp(s, 0, SLEN), side * d1);
        const c = at(clamp(s + STEP, 0, SLEN), side * d0);
        const d = at(clamp(s + STEP, 0, SLEN), side * d1);
        ctx.platform({
          x0: Math.min(a.x, b.x, c.x, d.x), x1: Math.max(a.x, b.x, c.x, d.x),
          z0: Math.min(a.z, b.z, c.z, d.z), z1: Math.max(a.z, b.z, c.z, d.z),
          top: y - drop,
          /* A generous step, because these strips are the ground rather than
           * something standing on it: a walker must never be refused one. */
          step: 1.2,
        });
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * build
 * ------------------------------------------------------------------ */
export function build(ctx) {
  const F = frame(ctx);
  const { ST, SLEN, at, project, bankY, bankAt } = F;
  const B = ctx.baker('shirakawa');
  const rng = rngKit(88117);
  const out = { willows: 0, buildings: 0 };

  /* The visible ground was tessellated before this district existed, at 6 m
   * near and 24 m far -- and the far field starts at z = -780, which is most of
   * Gion Shinbashi.  A single far triangle is wider than the stream.  Relay it. */
  relayGround(ctx, project, ST, bankY, SLEN);

  /* ------------------------------- the channel ---------------------------- */
  /* Four horizontal bands make this view: stone lane, low wall, water, and the
   * timber wall of the far bank.  The revetment is the second of them, and it
   * is a *line* -- so it is built as a continuous run of stepped blocks rather
   * than per-station boxes that would read as a dotted edge. */
  const waterParts = [];
  for (let i = 0; i < ST.length - 1; i++) {
    const s0 = ST[i].s, s1 = ST[i + 1].s;
    const y = bankAt(s0);
    const wy = y - DROP;

    for (const side of [-1, 1]) {
      const a = at(s0, side * CHAN), b = at(s1, side * CHAN);
      const len = Math.hypot(b.x - a.x, b.z - a.z) + 0.04;
      const ry = Math.atan2(a.tx, a.tz);
      // the revetment: coursed granite, its top level with the lane
      const courses = 3;
      const h = (y - (wy - 0.55)) / courses;
      for (let k = 0; k < courses; k++) {
        const g = new THREE.BoxGeometry(WALL_T, h * 1.04, len);
        g.applyMatrix4(trs(
          (a.x + b.x) / 2 + a.nx * side * (CHAN + WALL_T / 2),
          wy - 0.55 + h * (k + 0.5),
          (a.z + b.z) / 2 + a.nz * side * (CHAN + WALL_T / 2),
          0, ry, 0
        ));
        B.add(g, null, k === courses - 1 ? PAL.stone
          : rng.chance(0.4) ? PAL.stoneMoss : PAL.stoneWall,
          { bands: 3, tint: TINT.cool });
      }
      ctx.collide(
        Math.min(a.x, b.x) + a.nx * side * CHAN - 0.4,
        Math.min(a.z, b.z) + a.nz * side * CHAN - 0.4,
        Math.max(a.x, b.x) + a.nx * side * CHAN + 0.4,
        Math.max(a.z, b.z) + a.nz * side * CHAN + 0.4,
        y + 0.05
      );
    }

    // the bed, and the water plane over it
    const p0 = at(s0, 0), p1 = at(s1, 0);
    const bedRy = Math.atan2(p0.tx, p0.tz);
    const bedLen = Math.hypot(p1.x - p0.x, p1.z - p0.z) + 0.05;
    const bed = new THREE.BoxGeometry(CHAN * 2, 0.3, bedLen);
    bed.applyMatrix4(trs((p0.x + p1.x) / 2, wy - 0.30, (p0.z + p1.z) / 2, 0, bedRy, 0));
    B.add(bed, null, PAL.waterMoss, { bands: 3, tint: TINT.green });

    const w = new THREE.PlaneGeometry(CHAN * 2, bedLen);
    w.rotateX(-Math.PI / 2);
    w.applyMatrix4(trs((p0.x + p1.x) / 2, wy, (p0.z + p1.z) / 2, 0, bedRy, 0));
    waterParts.push({ geometry: w });
  }

  {
    const geo = waterParts.length ? bakeParts(waterParts) : null;
    if (geo) {
      const water = new THREE.Mesh(geo, celTexWater());
      water.userData.noOutline = true;
      water.userData.noShadow = true;
      water.receiveShadow = false;
      water.castShadow = false;
      water.name = 'shirakawa-water';
      ctx.add(water);
    }
  }

  /* -------------------------------- the willows --------------------------- */
  /* They grow out of the pavement on the lane side, which is what they do in
   * life, and they lean OUT over the water -- which is the whole picture.  The
   * lean is chosen by replaying the vegetation kit's own draw order; see
   * `leanSeed`. */
  for (let s = 8; s < SLEN - 6; s += rng.range(11, 17)) {
    const p = at(s, -(CHAN + 1.5));
    const y = bankAt(s);
    // want the lean pointing across the water: the +d direction is south
    const want = Math.atan2(p.nx, p.nz);
    ctx.tree({
      kind: 'willow', x: p.x, z: p.z, y,
      scale: rng.range(0.92, 1.16), rot: rng.range(0, TAU),
      seed: leanSeed(9000 + Math.round(s), want), hero: true,
    });
    out.willows++;
  }
  // a few cherries behind them, on the far bank
  for (let s = 14; s < SLEN - 10; s += rng.range(16, 26)) {
    const p = at(s, CHAN + 3.2);
    ctx.tree({
      kind: 'sakura', x: p.x, z: p.z, y: bankAt(s),
      scale: rng.range(0.85, 1.05), rot: rng.range(0, TAU), seed: rng.int(1, 1e6),
    });
  }

  /* ------------------------------- the frontage --------------------------- */
  /* Band four -- the wall of two-storey timber rising straight out of the far
   * bank -- is what closes the picture, and it is the one row that must NOT be
   * laid off a street corridor.  There is no street on the far bank; the houses
   * front the *water*.  So they are placed from the canal frame directly, at a
   * fixed offset across the stream, each rotated to face back over it.
   *
   * The first version laid this row off `shinbashi` and got the composition
   * exactly backwards: those houses front Shinbashi, one block north, so all the
   * canal ever saw was their blank party-wall backs -- two big untextured tan
   * planes filling the left of the frame. */
  {
    const FAR = CHAN + 2.6;
    let s = 4;
    const FAR_END = SLEN - 22;      // stop short of the bridge and the junction
    let i = 0;
    while (s < FAR_END) {
      const w = rng.pick([2, 3, 3, 4]) * 1.9697;
      const mid = s + w / 2;
      if (mid > FAR_END) break;
      const p = at(mid, FAR);
      /* `p.n` is the outward normal -- it points from the water toward this
       * plot -- so the same rule `plots.js` uses applies: `ry = atan2(nx, nz)`
       * turns the kit's default -Z facade onto `-n`, which is back across the
       * stream.  `atan2(-nx, -nz)` is that plus pi and faces the house away
       * from the water with its body over it; I wrote that first, and the
       * render was a blank party wall filling half the frame. */
      const ry = Math.atan2(p.nx, p.nz);
      const style = rng.chance(0.72) ? 'ochaya' : 'machiya';
      makeMachiya(ctx, {
        x: p.x, z: p.z, ry, width: w, depth: rng.range(8, 12),
        style, y: bankAt(mid), seed: (5501 * (i + 1)) >>> 0, baker: 'shirakawa',
        timberTone: style === 'ochaya'
          ? (rng.chance(0.3) ? PAL.bengaraDeep : PAL.bengara) : PAL.timber,
        plasterTone: rng.chance(0.4) ? PAL.plasterOchre : PAL.plasterWarm,
        inuyarai: false, komayose: false,
      });
      ctx.stats.buildings++;
      out.buildings++;
      s += w + 0.05;
      i++;
    }
  }

  /* The wedge block between the lane and Shinbashi fronts BOTH ways -- the lane
   * on one face, Shinbashi on the other -- because it is only about twelve
   * metres deep.  Two shallow rows, so they do not intersect. */
  /* Side -1 on the canal walk is its NORTH side -- the wedge block -- and side
   * +1 is the water.  (The lane's tangent runs east and slightly north, so the
   * left-of-travel normal points north.)  Putting the row on +1 builds it in
   * the Shirakawa. */
  /* The wedge closes to a POINT at (-421.4, -795.4), where Shinbashi and the
   * canal walk meet.  Frontage laid to 0.95 of either street therefore builds
   * into the last few metres of a triangle a metre wide, and the two rows meet
   * in the middle and seal both streets -- the passability audit found 12 m of
   * Shinbashi and 19.5 m of the canal walk closed, both at the east end.  So
   * both rows stop well short of the junction and the tip is left open. */
  for (const [street, side, seed, to] of [
    ['shirakawaMinami', -1, 733, 0.74],
    ['shinbashi', 1, 611, 0.80],
  ]) {
    const plots = layoutPlots({
      street, side, from: 0.05, to, mix: 'ochaya', gap: 0.04, seed,
    });
    plots.forEach((p, i) => {
      const style = rng.chance(0.6) ? 'ochaya' : 'machiya';
      makeMachiya(ctx, {
        x: p.x, z: p.z, ry: p.ry, width: p.width,
        depth: rng.range(5.5, 8.5), style, y: p.yLow,
        seed: (4409 * (i + 1) + seed) >>> 0,
        baker: 'shirakawa',
        timberTone: style === 'ochaya'
          ? (rng.chance(0.3) ? PAL.bengaraDeep : PAL.bengara) : PAL.timber,
        plasterTone: rng.chance(0.4) ? PAL.plasterOchre : PAL.plasterWarm,
        inuyarai: street === 'shirakawaMinami', komayose: false,
      });
      ctx.stats.buildings++;
      out.buildings++;
    });
  }

  /* -------------------------------- 巽橋 ---------------------------------- */
  /* The little humped bridge at the east end.  A hero viewpoint, so it is real
   * geometry and it is walkable: deck platform, parapet colliders, and the two
   * ramps that get you onto it. */
  const bridgeS = SLEN - 12;
  {
    const c = at(bridgeS, 0);
    const y = bankAt(bridgeS) + 0.34;
    const ry = Math.atan2(c.nx, c.nz);       // across the stream
    const span = (CHAN + WALL_T) * 2 + 2.4;
    const wide = 2.6;

    const deck = new THREE.BoxGeometry(span, 0.22, wide);
    deck.applyMatrix4(trs(c.x, y, c.z, 0, ry, 0));
    B.add(deck, null, PAL.timberGrey, { bands: 3, tint: TINT.warm });
    ctx.platform({
      x0: c.x - span / 2, z0: c.z - span / 2,
      x1: c.x + span / 2, z1: c.z + span / 2,
      top: y + 0.11, step: 0.55,
    });

    for (const t of [-1, 1]) {
      // the parapet: posts and a rail
      for (let u = -0.42; u <= 0.43; u += 0.28) {
        const px = c.x + Math.cos(ry) * (span * u) - Math.sin(ry) * 0;
        const pz = c.z - Math.sin(ry) * (span * u);
        const post = new THREE.BoxGeometry(0.1, 0.9, 0.1);
        post.applyMatrix4(trs(
          px - Math.sin(ry + Math.PI / 2) * (wide / 2) * t, y + 0.55,
          pz - Math.cos(ry + Math.PI / 2) * (wide / 2) * t, 0, ry, 0
        ));
        B.add(post, null, PAL.timberDark, { bands: 3, tint: TINT.warm });
      }
      const rail = new THREE.BoxGeometry(span, 0.11, 0.13);
      rail.applyMatrix4(trs(
        c.x - Math.sin(ry + Math.PI / 2) * (wide / 2) * t, y + 1.0,
        c.z - Math.cos(ry + Math.PI / 2) * (wide / 2) * t, 0, ry, 0
      ));
      B.add(rail, null, PAL.timberDark, { bands: 3, tint: TINT.warm });
      ctx.collideRot(
        c.x - Math.sin(ry + Math.PI / 2) * (wide / 2) * t,
        c.z - Math.cos(ry + Math.PI / 2) * (wide / 2) * t,
        span, 0.16, ry, y + 1.05
      );
    }

    interact(ctx, c.x, y + 1.3, c.z, 1.6, 'stand on the bridge', (audio) => {
      audio?.knock?.(300, 0.16, 0.22);
    });
  }

  /* ------------------------------ 巽大明神 -------------------------------- */
  /* The tiny shrine beside the bridge: a vermilion fence, one small torii and a
   * hall the size of a wardrobe.  It is the only saturated thing on the lane. */
  {
    const p = at(bridgeS - 9, -(CHAN + 5.6));
    const y = bankAt(bridgeS - 9);
    makeTorii(ctx, {
      x: p.x, z: p.z, y, ry: Math.atan2(-p.nx, -p.nz),
      kind: 'myojin', height: 2.5, span: 1.9, baker: 'shirakawa',
    });
    const hall = new THREE.BoxGeometry(1.9, 2.1, 1.7);
    hall.applyMatrix4(trs(p.x - p.nx * 2.6, y + 1.05, p.z - p.nz * 2.6,
      0, Math.atan2(-p.nx, -p.nz), 0));
    B.add(hall, null, PAL.vermilion, { bands: 3, tint: TINT.warmDeep });
    ctx.collideRot(p.x - p.nx * 2.6, p.z - p.nz * 2.6, 2.1, 1.9,
      Math.atan2(-p.nx, -p.nz), y + 2.1);
    interact(ctx, p.x - p.nx * 1.3, y + 1.4, p.z - p.nz * 1.3, 1.3,
      'bow at the little shrine', (audio) => audio?.suzu?.());
  }

  /* -------------------------------- the wires ----------------------------- */
  /* 新橋通 still carries poles: 白川南通 was cleared by 裏配線, which means the
   * bundle was rerouted onto the back street, and the back street is this one.
   * `props.js` blankets this area with a no-pole rule, so these are forced. */
  for (const pt of alongStreet({
    street: 'shinbashi', side: 1, from: 0.06, to: 0.94,
    spacing: 26, jitter: 4, seed: 51, offset: 3.0,
  })) {
    ctx.prop({ kind: 'utilityPole', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry,
               seed: rng.int(1, 1e6), force: true });
  }

  /* ------------------------------- the lane ------------------------------- */
  for (const pt of alongStreet({
    street: 'shirakawaMinami', side: -1, from: 0.05, to: 0.95,
    spacing: 8, jitter: 3, seed: 77, offset: CHAN + 0.9,
  })) {
    if (rng.chance(0.30)) {
      ctx.prop({ kind: 'planterPot', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry,
                 seed: rng.int(1, 1e6) });
    } else if (rng.chance(0.16)) {
      ctx.prop({ kind: 'bicycle', x: pt.x, z: pt.z, y: pt.y,
                 rot: pt.ry + Math.PI / 2, seed: rng.int(1, 1e6) });
    }
  }

  /* A noren and a nameplate on a couple of the far-bank houses, and nothing
   * else: this is Gion, and an ochaya does not advertise. */
  {
    const a = atStreet('shirakawaMinami', 0.38, { side: 1, offset: 3.1 });
    if (a) norenOn(ctx, a.x, a.z, a.across, a.y + 1.95, '茶寮', PAL.norenIndigo);
    const b = atStreet('shirakawaMinami', 0.66, { side: 1, offset: 3.1 });
    if (b) norenOn(ctx, b.x, b.z, b.across, b.y + 1.95, '白川', PAL.norenNavy);
  }

  {
    const p = at(SLEN * 0.45, -(CHAN + 2.0));
    interact(ctx, p.x, bankAt(SLEN * 0.45) + 1.3, p.z, 1.5,
      'watch the water', (audio) => audio?.splash?.(0.12));
  }

  return out;
}

/* Local helpers that need three.js but not the district's frame. */
function bakeParts(parts) {
  const geos = parts.map((p) => p.geometry);
  if (!geos.length) return null;
  let out = geos[0];
  if (geos.length > 1) {
    const merged = [];
    for (const g of geos) merged.push(g.index ? g.toNonIndexed() : g);
    out = mergeAllGeo(merged);
  }
  return out;
}

function mergeAllGeo(geos) {
  const pos = [];
  for (const g of geos) {
    const a = g.attributes.position.array;
    for (let i = 0; i < a.length; i++) pos.push(a[i]);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
}

let _waterMat = null;
function celTexWater() {
  if (_waterMat) return _waterMat;
  _waterMat = flat({ color: PAL.water, transparent: true, opacity: 0.88, cache: false });
  return _waterMat;
}
