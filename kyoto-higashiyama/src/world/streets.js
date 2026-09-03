import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { celTex, cel, TINT } from '../core/toon.js';
import { settTex, slabTex, gravelTex } from '../core/textures.js';
import { bake, lerp, clamp, rngKit } from '../core/util.js';
import { allCorridors, heightAt, corridor } from './terrain.js';

/* ------------------------------------------------------------------ *
 * Street surfaces.
 *
 * The terrain already carries the streets' *elevation* and a flat vertex
 * colour for them.  This module lays the actual paving on top: granite setts,
 * stone slabs, asphalt, shrine gravel, the drainage channel down each side,
 * the kerb, and -- the part that matters most -- the stone nosings of the
 * stepped flights.
 *
 * ------------------------------------------------------- WHY IT IS SEPARATE
 *
 * The paving is a **ribbon sampled from the height field**, not an independent
 * model of the street.  Every vertex on it calls `heightAt`.  That is the whole
 * design: the stone the player sees and the surface their feet are on are the
 * same function evaluated twice, so they cannot drift apart.  The alternative
 * -- model the steps, then separately teach collision about them -- is the
 * failure this project is most exposed to, because it looks perfect in a
 * screenshot and is wrong the moment anyone walks.
 *
 * The one liberty taken is a 0.02 m lift, so the paving sits just clear of the
 * terrain grid underneath it rather than z-fighting with it.
 *
 * ------------------------------------------------------------- THE FLIGHTS
 *
 * Sannenzaka is 46 steps over 32 m and Ninenzaka is 17 over 15.9 m: treads of
 * 0.70 m and 0.94 m against risers of 0.13-0.14 m.  These are Kyoto
 * *slope-stairs* -- much closer to a ramp with interruptions than to a
 * staircase -- and building them at a European 0.28 / 0.175 would make both
 * streets twice as steep as they are and turn a stroll into a climb.
 * ------------------------------------------------------------------ */

const LIFT = 0.02;

/** How finely the ribbon is sampled along the street. */
const STEP_SAMPLE = 0.14;    // inside a flight: fine enough to draw the nosing
const RAMP_SAMPLE = 2.2;

export function buildStreets(ctx) {
  const group = new THREE.Group();
  group.name = 'streets';

  /* Paving is textured, so it cannot go through the vertex-colour baker.
   * Instead everything sharing a surface type is merged into one geometry with
   * uv, giving one draw call per material for the whole world's streets. */
  const buckets = new Map();
  const push = (surface, geometry) => {
    if (!buckets.has(surface)) buckets.set(surface, []);
    buckets.get(surface).push({ geometry });
  };

  const baker = ctx.baker('streetworks');
  const rng = rngKit(4402);

  for (const c of allCorridors()) {
    if (c.spec.kind === 'water') continue;
    layPaving(c, push);
    layEdges(c, baker, ctx, rng);
    if (c.stepRuns.length) layStepNosings(c, baker, push);
    layRetaining(c, baker, ctx, rng);
  }

  const MATS = {
    sett:    () => celTex(repeat(settTex(), 1, 1), { bands: 3, tint: TINT.cool, color: 0xd8d4cf }),
    slab:    () => celTex(repeat(slabTex(), 1, 1), { bands: 3, tint: TINT.cool, color: 0xdcd8d2 }),
    gravel:  () => celTex(repeat(gravelTex(), 1, 1), { bands: 'soft3', tint: TINT.cool, color: 0xe8e4dc }),
    asphalt: () => cel({ color: PAL.asphalt, bands: 3, tint: TINT.cool, flat: false }),
  };

  for (const [surface, parts] of buckets) {
    const geo = bake(parts);
    if (!geo) continue;
    const mat = (MATS[surface] || MATS.sett)();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = 'paving-' + surface;
    group.add(mesh);
  }

  ctx.add(group);
  return group;
}

function repeat(tex, rx, ry) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  return tex;
}

/* ------------------------------------------------------------------ *
 * The carriageway.
 * ------------------------------------------------------------------ */

function layPaving(c, push) {
  const pos = [], uv = [], idx = [];
  const half = c.half;
  const total = c.length;
  const samples = sampleRun(c);

  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    const nx = -p.tz, nz = p.tx;
    /* The cross-fall.  Every stone street in Kyoto is crowned or falls to one
     * side, and the 0.04 m of it here is what puts a line of shadow in the
     * gutter and stops the paving reading as a flat ribbon of texture. */
    const camber = 0.035;
    for (const s of [-1, 0, 1]) {
      const w = half * s;
      const y = heightAt(p.x + nx * w, p.z + nz * w) + LIFT - camber * s * s;
      pos.push(p.x + nx * w, y, p.z + nz * w);
      // uv: metres, so the texture's real-world scale is set by the material
      uv.push((s + 1) * half * 0.5, p.s * 0.5);
    }
  }
  const stride = 3;
  for (let i = 0; i < samples.length - 1; i++) {
    for (let k = 0; k < 2; k++) {
      const a = i * stride + k, b = a + 1, cc = a + stride, d = cc + 1;
      idx.push(a, cc, b, b, cc, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  push(c.surface, g);
}

/** Sample points along the corridor, fine inside flights and coarse outside. */
function sampleRun(c) {
  const out = [];
  const total = c.length;
  let s = 0;
  while (s < total) {
    out.push(c.pointAt(s));
    const inFlight = c.stepRuns.some((r) => s >= r.s0 - 0.3 && s <= r.s1 + 0.3);
    s += inFlight ? STEP_SAMPLE : RAMP_SAMPLE;
  }
  out.push(c.pointAt(total));
  return out;
}

/* ------------------------------------------------------------------ *
 * The step nosings.
 *
 * A flight in the height field is a staircase of flat treads.  Drawn as a
 * ribbon that is exactly what you get: flat treads joined by *vertical* walls
 * that the ribbon renders as zero-area slivers, so from the front the flight
 * reads as a ramp with stripes.  The nosings are the risers built as real
 * geometry -- a stone face per step, standing a couple of centimetres proud,
 * which is what catches the light and draws the flight.
 * ------------------------------------------------------------------ */

function layStepNosings(c, baker, push) {
  for (const r of c.stepRuns) {
    for (let k = 1; k <= r.n; k++) {
      const s = r.s0 + (r.s1 - r.s0) * (k / r.n);
      const p = c.pointAt(s - 1e-4);
      const nx = -p.tz, nz = p.tx;
      const yBelow = r.y0 + r.riser * (k - 1);
      const yAbove = r.y0 + r.riser * k;
      const h = Math.abs(yAbove - yBelow);
      if (h < 0.005) continue;
      const w = c.half * 2 + 0.1;
      /* The riser face, plus a nosing that oversails the tread below by 25 mm.
       * The oversail is the whole reason a stone step is visible at all from
       * above: without it, looking down a flight from the top gives you a flat
       * grey field with no lines in it. */
      const face = new THREE.BoxGeometry(w, h + 0.02, 0.055);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(p.x, yBelow + h / 2 + LIFT, p.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(p.tx, p.tz), 0)),
        new THREE.Vector3(1, 1, 1)
      );
      face.applyMatrix4(m);
      baker.add(face, null, PAL.pavingDark, { bands: 3, tint: TINT.cool });

      const nose = new THREE.BoxGeometry(w, 0.05, 0.10);
      const m2 = new THREE.Matrix4().compose(
        new THREE.Vector3(p.x, yAbove + LIFT - 0.01, p.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(p.tx, p.tz), 0)),
        new THREE.Vector3(1, 1, 1)
      );
      nose.applyMatrix4(m2);
      baker.add(nose, null, PAL.pavingLit, { bands: 3, tint: TINT.cool });
    }
  }
}

/* ------------------------------------------------------------------ *
 * Edges: the gutter, the kerb, and the strip between paving and frontage.
 *
 * 側溝 -- the open drainage channel -- runs down one or both sides of nearly
 * every street in this part of Kyoto, and it is worth building because it is a
 * *line*: a dark 120 mm slot with a granite lip, running the length of the
 * street and following every change of grade.  It does as much to draw a street
 * in a cel image as the buildings do.
 * ------------------------------------------------------------------ */

function layEdges(c, baker, ctx, rng) {
  const total = c.length;
  const spec = c.spec;
  const isBig = spec.surface === 'asphalt' && c.half > 5;
  const gutterW = isBig ? 0.36 : 0.22;
  const step = 2.4;

  for (let s = 0; s < total - step * 0.5; s += step) {
    const a = c.pointAt(s);
    const b = c.pointAt(Math.min(total, s + step));
    const inFlight = c.stepRuns.some((r) => s >= r.s0 - 1 && s <= r.s1 + 1);
    if (inFlight) continue;   // a flight has no channel down it

    for (const side of [-1, 1]) {
      const nxa = -a.tz * side, nza = a.tx * side;
      const nxb = -b.tz * side, nzb = b.tx * side;
      const off = c.half + gutterW * 0.5;
      const ax = a.x + nxa * off, az = a.z + nza * off;
      const bx = b.x + nxb * off, bz = b.z + nzb * off;
      const ay = heightAt(ax, az), by = heightAt(bx, bz);
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 0.05) continue;

      // the channel: a dark slot set slightly below the paving
      const ch = new THREE.BoxGeometry(gutterW, 0.10, len);
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(bx - ax, by - ay, bz - az).normalize()
      );
      ch.applyMatrix4(new THREE.Matrix4().compose(
        new THREE.Vector3((ax + bx) / 2, (ay + by) / 2 - 0.03, (az + bz) / 2),
        q, new THREE.Vector3(1, 1, 1)
      ));
      baker.add(ch, null, PAL.drain, { bands: 'deep', tint: TINT.cool, shadow: false });

      // the granite lip on the outer side of it
      const lip = new THREE.BoxGeometry(0.14, 0.11, len);
      lip.applyMatrix4(new THREE.Matrix4().compose(
        new THREE.Vector3(
          (ax + bx) / 2 + nxa * (gutterW * 0.5 + 0.07),
          (ay + by) / 2 + 0.025,
          (az + bz) / 2 + nza * (gutterW * 0.5 + 0.07)
        ),
        q, new THREE.Vector3(1, 1, 1)
      ));
      baker.add(lip, null, rng.chance(0.5) ? PAL.stone : PAL.pavingWarm,
                { bands: 3, tint: TINT.cool, shadow: false });
    }
  }

  /* A big road gets a raised footway rather than a channel: 0.14 m of kerb,
   * which the walker steps up onto because it is under the 0.42 m step
   * threshold. */
  if (isBig) {
    for (let s = 0; s < total - 3; s += 3) {
      const a = c.pointAt(s);
      const b = c.pointAt(Math.min(total, s + 3));
      for (const side of [-1, 1]) {
        const nx = -a.tz * side, nz = a.tx * side;
        const off = c.half + 1.9;
        const ax = a.x + nx * off, az = a.z + nz * off;
        const bx = b.x - b.tz * side * off, bz = b.z + b.tx * side * off;
        const ay = heightAt(ax, az);
        const g = new THREE.BoxGeometry(3.6, 0.14, 3.2);
        g.applyMatrix4(new THREE.Matrix4().compose(
          new THREE.Vector3(ax, ay + 0.07, az),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(a.tx, a.tz), 0)),
          new THREE.Vector3(1, 1, 1)
        ));
        baker.add(g, null, PAL.concrete, { bands: 3, tint: TINT.cool, shadow: false });
        ctx.platform({ x0: ax - 1.8, z0: az - 1.6, x1: ax + 1.8, z1: az + 1.6, top: ay + 0.14 });
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * 白川 -- the canal.
 *
 * The one piece of water on the route, and the reason the Shinbashi corner is
 * the most painted spot in Gion.  Built as a cut in the terrain with a stone
 * revetment, a shallow flowing surface, and the stepping stones across it.
 * ------------------------------------------------------------------ */

/**
 * The channel, as a cut in the height field.
 *
 * Registered from the terrain phase, before the ground mesh is generated: a cut
 * that arrives afterwards moves the walkable surface without moving the drawn
 * one, and the canal ends up as a trench you fall into with no visible banks.
 */
export function cutCanal(ctx) {
  const spec = ctx.STREETS.shirakawa;
  const pts = spec.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    ctx.cut({
      x0: Math.min(a.x, b.x) - spec.half, x1: Math.max(a.x, b.x) + spec.half,
      z0: Math.min(a.z, b.z) - spec.half, z1: Math.max(a.z, b.z) + spec.half,
      top: (a.y + b.y) / 2 - 1.55,
    });
  }
}

export function buildCanal(ctx) {
  const spec = ctx.STREETS.shirakawa;
  const pts = spec.points;
  const baker = ctx.baker('shirakawa');
  const group = new THREE.Group();
  group.name = 'shirakawa';

  const surface = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const tx = dx / len, tz = dz / len;
    const nx = -tz, nz = tx;
    const y = (a.y + b.y) / 2 - 1.42;

    // the water plane
    const w = new THREE.PlaneGeometry(spec.half * 2, len);
    w.rotateX(-Math.PI / 2);
    w.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3((a.x + b.x) / 2, y, (a.z + b.z) / 2),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(tx, tz), 0)),
      new THREE.Vector3(1, 1, 1)
    ));
    surface.push({ geometry: w });

    // the bed
    const bed = new THREE.BoxGeometry(spec.half * 2, 0.25, len);
    bed.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3((a.x + b.x) / 2, y - 0.22, (a.z + b.z) / 2),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(tx, tz), 0)),
      new THREE.Vector3(1, 1, 1)
    ));
    baker.add(bed, null, PAL.waterMoss, { bands: 3, tint: TINT.green });

    // the stone revetment walls
    for (const side of [-1, 1]) {
      const wall = new THREE.BoxGeometry(0.45, 1.75, len);
      wall.applyMatrix4(new THREE.Matrix4().compose(
        new THREE.Vector3(
          (a.x + b.x) / 2 + nx * side * (spec.half + 0.2), y + 0.72,
          (a.z + b.z) / 2 + nz * side * (spec.half + 0.2)
        ),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(tx, tz), 0)),
        new THREE.Vector3(1, 1, 1)
      ));
      baker.add(wall, null, PAL.stoneWall, { bands: 3, tint: TINT.cool });
      ctx.collide(
        (a.x + b.x) / 2 + nx * side * (spec.half + 0.2) - 0.4,
        (a.z + b.z) / 2 + nz * side * (spec.half + 0.2) - len / 2,
        (a.x + b.x) / 2 + nx * side * (spec.half + 0.2) + 0.4,
        (a.z + b.z) / 2 + nz * side * (spec.half + 0.2) + len / 2
      );
    }
  }

  const water = new THREE.Mesh(
    bake(surface),
    cel({ color: PAL.water, bands: 'soft3', tint: TINT.cool, flat: false,
          transparent: true, opacity: 0.86 })
  );
  water.receiveShadow = false;
  water.castShadow = false;
  water.userData.noOutline = true;
  group.add(water);
  ctx.add(group);
  return { group, water };
}


/* ------------------------------------------------------------------ *
 * 石垣 -- the retaining walls.
 *
 * This is the one piece of civil engineering that makes Higashiyama look like
 * Higashiyama rather than like a Japanese street on a hill.  The whole district
 * is built across a slope, so almost every plot is terraced, and the terraces
 * are held up by coursed granite walls with a pronounced batter.  Walk
 * Sannenzaka and there is a stone wall on your left for most of it; walk
 * Nene-no-michi and there is one on your right the entire way.
 *
 * They are generated rather than placed, from the thing that decides where one
 * is needed: **the height difference between the street and the ground a few
 * metres back from it.**  Where the land behind the frontage line stands more
 * than half a metre above the paving, it needs holding up, and a wall goes in.
 * Where it drops away, the wall goes the other way and the ground above it is
 * the street.  Nobody has to decide this by hand and it cannot get out of step
 * with the terrain, because it is derived from it.
 * ------------------------------------------------------------------ */

const WALL_MIN = 0.85;      // below this the ground just slopes; no wall
const WALL_STEP = 2.6;      // panel length

/**
 * Walls are **authored, not automatic.**
 *
 * The first version derived them purely from the height field: wherever the
 * ground a few metres behind the frontage stood higher than the paving, a wall
 * went in.  That is the right *rule* and it produced the wrong *world*, because
 * the terrain is itself derived from the streets and then has noise added, so
 * the rule fired on the noise -- long stone benches marching away across open
 * fields on both sides of Nene-no-michi, where in life there is a temple wall on
 * one side and nothing at all on the other.
 *
 * So a street now has to *ask* for a wall, on a named side, over a named
 * stretch.  Where it asks, the height field still decides how tall the wall is
 * and where its courses sit -- which is the part that has to be derived, or the
 * wall and the ground drift apart the moment either changes.
 */
const RETAIN = {
  // Kodai-ji's precinct wall runs the length of Nene-no-michi's east side
  nene:        [{ side: 1, from: 0.02, to: 0.86 }],
  // Sannenzaka is cut into the slope: wall on the uphill (east) side
  sannenzaka:  [{ side: 1, from: 0.10, to: 0.78 }],
  ninenzaka:   [{ side: 1, from: 0.16, to: 0.62 }],
  // the upper Kiyomizu approach is terraced on both sides
  kiyomizuzaka: [{ side: 1, from: 0.30, to: 0.92 }, { side: -1, from: 0.55, to: 0.95 }],
  // Shimogawara climbs along a terrace
  shimogawara: [{ side: 1, from: 0.30, to: 0.90 }],
  // the temple precinct sits on made ground
  kiyomizuPrecinct: [{ side: -1, from: 0.10, to: 0.70 }],
  okunoinPath: [{ side: 1, from: 0.05, to: 0.50 }],
  chawanzaka:  [{ side: -1, from: 0.62, to: 0.96 }],
};

function layRetaining(c, baker, ctx, rng) {
  const runs = RETAIN[c.id];
  if (!runs) return;
  const total = c.length;
  const back = c.frontage + 2.2;

  for (const run of runs) {
    const s0 = run.from * total, s1 = run.to * total;
    const side = run.side;

    for (let s = s0; s < s1 - WALL_STEP; s += WALL_STEP) {
      const a = c.pointAt(s);
      const b = c.pointAt(Math.min(total, s + WALL_STEP));
      const anx = -a.tz * side, anz = a.tx * side;
      const bnx = -b.tz * side, bnz = b.tx * side;

      const fx = a.x + anx * c.frontage, fz = a.z + anz * c.frontage;
      const fx2 = b.x + bnx * c.frontage, fz2 = b.z + bnz * c.frontage;
      const fy = heightAt(fx, fz), fy2 = heightAt(fx2, fz2);
      const gy = heightAt(a.x + anx * back, a.z + anz * back);
      const gy2 = heightAt(b.x + bnx * back, b.z + bnz * back);

      /* The wall stands on the *lower* ground and holds up the higher.  Height
       * is the difference, taken from the mean of both ends so a single noisy
       * sample cannot spike one panel. */
      const low = Math.min(fy, fy2);
      const high = (gy + gy2) / 2;
      const rise = high - low;
      /* Below the threshold the bank just slopes, which is also what it does in
       * life -- not every change of level in Kyoto is revetted.  A minimum
       * height is applied above it so a wall that exists is worth seeing. */
      const h = rise < WALL_MIN ? 1.05 : Math.min(4.2, rise + 0.35);
      const len = Math.hypot(fx2 - fx, fz2 - fz);
      if (len < 0.1) continue;

      /* Coursed, and the courses matter: a Kyoto retaining wall is laid in
       * visible horizontal bands 0.28-0.36 m deep, and that banding is what
       * reads at twenty metres.  A single smooth box is a concrete wall. */
      const courses = Math.max(2, Math.round(h / 0.32));
      const ch = h / courses;
      const yBase = low - 0.25;
      const ry = Math.atan2(a.tx, a.tz);

      for (let k = 0; k < courses; k++) {
        /* Batter: the wall leans back about 1 in 8, so each course steps in.
         * Without it the wall reads as modern blockwork rather than as stone. */
        const inset = (k / courses) * h * 0.13;
        const g = new THREE.BoxGeometry(0.55, ch * 1.06, len * 1.02);
        g.applyMatrix4(new THREE.Matrix4().compose(
          new THREE.Vector3(
            (fx + fx2) / 2 + anx * (0.30 + inset),
            yBase + ch * (k + 0.5),
            (fz + fz2) / 2 + anz * (0.30 + inset)
          ),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
          new THREE.Vector3(1, 1, 1)
        ));
        // the low courses stay damp and grow moss; the tone alternates
        const lowCourse = k < 2;
        const col = lowCourse && rng.chance(0.42) ? PAL.stoneMoss
                  : rng.chance(0.5) ? PAL.stoneWall : PAL.stoneWallDark;
        baker.add(g, null, col, { bands: 3, tint: TINT.cool });
      }

      // the coping stone along the top
      const cop = new THREE.BoxGeometry(0.74, 0.17, len * 1.02);
      cop.applyMatrix4(new THREE.Matrix4().compose(
        new THREE.Vector3(
          (fx + fx2) / 2 + anx * (0.30 + h * 0.13),
          yBase + h + 0.085,
          (fz + fz2) / 2 + anz * (0.30 + h * 0.13)
        ),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
        new THREE.Vector3(1, 1, 1)
      ));
      baker.add(cop, null, PAL.stone, { bands: 3, tint: TINT.cool });

      ctx.collideRot(
        (fx + fx2) / 2 + anx * 0.30, (fz + fz2) / 2 + anz * 0.30,
        0.72, len, ry, yBase + h
      );
      /* The ground the wall holds up is flat behind it -- that is what a
       * terrace is, and without saying so the player can walk up the noise
       * behind the wall and end up standing on top of it. */
      ctx.platform({
        x0: Math.min(fx, fx2) + anx * 0.6 - 2, z0: Math.min(fz, fz2) + anz * 0.6 - 2,
        x1: Math.max(fx, fx2) + anx * 6 + 2, z1: Math.max(fz, fz2) + anz * 6 + 2,
        top: yBase + h, step: 0.2,
      });
    }
  }
}
