import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT, cel, celTex } from '../core/toon.js';
import { trs, lathe, taperBox, rngKit, lerp, clamp, fbm2 } from '../core/util.js';
import { cached, lanternTex, noticeBoard } from '../core/textures.js';
import { gableRoof, shedRoof, rafters, hisashi } from '../kit/roof.js';
import {
  makeTorii, makeStoneLantern, makeSubShrine, makeChozu, makeTamagaki,
} from '../kit/shrine.js';

/* ------------------------------------------------------------------ *
 * 円山公園 -- Maruyama Park.
 *
 * Kyoto's oldest public park (1886), immediately east of Yasaka Shrine and cut
 * out of its grounds, so it has no gate and no boundary: the shrine's gravel
 * simply stops being gravel and becomes lawn under maples.  It rises gently
 * from 56 m at the shrine edge to about 59 m against the hillside.
 *
 * ------------------------------------------------------------ THE TREE
 *
 * **祇園枝垂桜 at (96, -561) is the hero object and the composition anchor.**
 * One enormous 一重白彼岸枝垂桜, deeper pink than the somei-yoshino along the
 * streets -- `PAL.shidare` exists precisely for it -- standing alone in an open
 * gravel circle with a ring of 茶店 round the edge and timber 支柱 propping its
 * lower limbs, which is the detail that says *this particular tree* rather than
 * "a weeping cherry".  Everything else in this file is composed to leave it
 * room and to give it something to be seen against.
 *
 * ---------------------------------------------------------- THE GROUND
 *
 * Nothing here registers a `ctx.platform` or a `ctx.cut`, and that is
 * deliberate: the visible terrain mesh is baked before any district runs, so a
 * cut is a hole the ground closes over like a lid and a platform is an
 * invisible ledge.  The pond is therefore a **positive** object -- a stone bund
 * standing above the lawn with the water inside it, which is what a garden pond
 * on flat ground actually is -- and the paths are drawn as geometry laid on the
 * height field rather than carved into it.
 *
 * The one real corridor here is `STREETS.maruyamaLink`, the walk down to
 * Nene-no-michi, which the street layer already paves.
 * ------------------------------------------------------------------ */

export const id = 'maruyama';

const BAKER = 'maruyama';

const O = {
  verm:    { bands: 3, tint: TINT.warmDeep },
  timber:  { bands: 3, tint: TINT.warm },
  deep:    { bands: 'deep', tint: TINT.warm },
  stone:   { bands: 3, tint: TINT.cool },
  plaster: { bands: 'soft3', tint: TINT.cool },
  gravel:  { bands: 'soft3', tint: TINT.cool },
  green:   { bands: 3, tint: TINT.green },
  metal:   { bands: 4, tint: TINT.cool, flat: false },
};

/* The parts bag -- same convention as the shrine kit: local frame, origin on
 * the ground at the object's centre, local -Z is the front, one matrix out. */
function bag() {
  const list = [];
  const api = {
    add(geometry, color, opts) { list.push({ geometry, color, opts }); return api; },
    push(arr) { if (arr) for (const p of arr) list.push(p); return api; },
    box(w, h, d, x, y, z, color, opts, ry = 0) {
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(0, h / 2, 0);
      if (ry) g.rotateY(ry);
      g.translate(x, y, z);
      return api.add(g, color, opts);
    },
    bar(w, h, d, x, y, z, color, opts, ry = 0) {
      const g = new THREE.BoxGeometry(w, h, d);
      if (ry) g.rotateY(ry);
      g.translate(x, y, z);
      return api.add(g, color, opts);
    },
    cyl(rBot, rTop, h, x, y, z, seg, color, opts) {
      const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
      g.translate(x, y + h / 2, z);
      return api.add(g, color, opts);
    },
    lathe(profile, seg, x, y, z, color, opts) {
      const g = lathe(profile, seg);
      g.translate(x, y, z);
      return api.add(g, color, opts);
    },
    flush(baker, x, y, z, ry = 0) {
      const m = trs(x, y, z, 0, ry, 0);
      for (const p of list) baker.add(p.geometry, m, p.color, p.opts);
      list.length = 0;
    },
  };
  return api;
}

const toWorld = (x, z, ry, lx, lz) => {
  const c = Math.cos(ry), s = Math.sin(ry);
  return { x: x + lx * c + lz * s, z: z - lx * s + lz * c };
};

function seat(ctx, x, z, w, d, ry) {
  let lo = Infinity, hi = -Infinity;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const p = toWorld(x, z, ry, (i * w) / 2, (j * d) / 2);
      const g = ctx.groundAt(p.x, p.z);
      if (g < lo) lo = g;
      if (g > hi) hi = g;
    }
  }
  return { lo, hi, rise: hi - lo };
}

/* ------------------------------------------------------------------ *
 * Paths and open ground, drawn on the height field.
 *
 * A park path is not a street: it is a strip of raked gravel a couple of
 * metres wide that follows whatever the ground is doing.  Both of these sample
 * `groundAt` at every vertex and sit 0.05 m proud of it, so they follow the
 * terrain exactly and never need it to change.
 * ------------------------------------------------------------------ */
function gravelPath(ctx, baker, pts, half = 1.9, lift = 0.05, color = PAL.gravel) {
  const pos = [], idx = [];
  let n = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const steps = Math.max(1, Math.round(len / 3.0));
    for (let s = 0; s <= steps; s++) {
      if (i > 0 && s === 0) continue;
      const t = s / steps;
      const px = lerp(a[0], c[0], t), pz = lerp(a[1], c[1], t);
      // the tangent at this station, blended across the joint
      const bx = c[0] - a[0], bz = c[1] - a[1];
      const bl = Math.hypot(bx, bz);
      const nx = -bz / bl, nz = bx / bl;
      for (const s2 of [-1, 1]) {
        const wx = px + nx * half * s2, wz = pz + nz * half * s2;
        pos.push(wx, ctx.groundAt(wx, wz) + lift, wz);
      }
      n++;
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  baker.add(g, null, color, O.gravel);
  return n;
}

/** An open apron of raked gravel -- the circle the hero cherry stands in. */
function gravelPatch(ctx, baker, { cx, cz, rx, rz, cell = 2.6, lift = 0.045, skip }) {
  const nx = Math.ceil((rx * 2) / cell), nz = Math.ceil((rz * 2) / cell);
  let quads = 0;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const ax = cx - rx + i * cell, az = cz - rz + j * cell;
      const bx = ax + cell, bz = az + cell;
      const mx = ax + cell / 2, mz = az + cell / 2;
      // an ellipse, so the clearing has a soft edge rather than a kerb line
      const u = (mx - cx) / rx, v = (mz - cz) / rz;
      if (u * u + v * v > 1) continue;
      if (skip && skip(mx, mz)) continue;
      if (ctx.slopeAt(mx, mz) > 16) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([
        ax, ctx.groundAt(ax, az) + lift, az,
        bx, ctx.groundAt(bx, az) + lift, az,
        bx, ctx.groundAt(bx, bz) + lift, bz,
        ax, ctx.groundAt(ax, bz) + lift, bz,
      ], 3));
      g.setIndex([0, 2, 1, 0, 3, 2]);
      g.computeVertexNormals();
      const m = fbm2(mx * 0.06, mz * 0.06, 2, 17);
      baker.add(g, null, m > 0.58 ? PAL.gravel : m > 0.34 ? PAL.paving : PAL.gravelDark, O.gravel);
      quads++;
    }
  }
  return quads;
}

/* ------------------------------------------------------------------ *
 * The pond.
 *
 * Built UP, not dug: a battered stone bund standing 0.4 m above the lawn with
 * the water inside it.  That is what a garden pond on flat ground is, and it is
 * also the only way to have one here -- the ground mesh is baked before this
 * module runs, so a `ctx.cut` would put a lid of terrain over the water.
 *
 * The rocks round the edge (岩組) are the whole read: a Japanese pond has no
 * visible engineering, it has stones set at the waterline with their best face
 * out and moss on the shaded ones.
 * ------------------------------------------------------------------ */
function pond(ctx, baker, o) {
  const { x0, z0, x1, z1 } = o;
  const rng = rngKit(o.seed ?? 991);
  // the rim has to clear the highest ground it crosses or the lawn pokes through
  let hi = -Infinity;
  for (let i = 0; i <= 6; i++) {
    for (let j = 0; j <= 6; j++) {
      const g = ctx.groundAt(lerp(x0, x1, i / 6), lerp(z0, z1, j / 6));
      if (g > hi) hi = g;
    }
  }
  const rim = hi + 0.34;
  const water = rim - 0.22;
  const b = bag();

  // the water: one plane, faintly transparent, no ripple geometry
  const wg = new THREE.PlaneGeometry(x1 - x0 - 0.6, z1 - z0 - 0.6);
  wg.rotateX(-Math.PI / 2);
  wg.translate((x0 + x1) / 2, water, (z0 + z1) / 2);
  const wm = new THREE.Mesh(wg, cel({
    color: PAL.water, bands: 'soft3', tint: TINT.cool, flat: false,
    transparent: true, opacity: 0.88,
  }));
  wm.receiveShadow = false;
  wm.castShadow = false;
  wm.userData.noOutline = true;
  ctx.add(wm);
  // the bed, just under the surface, so the water reads as green rather than void
  b.bar(x1 - x0 - 0.6, 0.2, z1 - z0 - 0.6, (x0 + x1) / 2, water - 0.16, (z0 + z1) / 2,
    PAL.waterMoss, { bands: 3, tint: TINT.green });

  /* The bund.  Each side is a battered wall from the rim down to the lawn,
   * sampled against the real ground so it never floats. */
  const edges = [
    [x0, z0, x1, z0, 0, -1], [x1, z1, x0, z1, 0, 1],
    [x0, z1, x0, z0, -1, 0], [x1, z0, x1, z1, 1, 0],
  ];
  for (const [ax, az, bx, bz, ox, oz] of edges) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(2, Math.round(len / 2.0));
    const pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const px = lerp(ax, bx, t), pz = lerp(az, bz, t);
      const g = ctx.groundAt(px + ox * 1.2, pz + oz * 1.2) - 0.25;
      pos.push(px, rim, pz);
      pos.push(px + ox * 0.55, g, pz + oz * 0.55);
    }
    for (let i = 0; i < n; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g2.setIndex(idx);
    g2.computeVertexNormals();
    baker.add(g2, null, PAL.stoneWall, O.stone);
    ctx.collide(
      Math.min(ax, bx) + ox * 0.3 - 0.3, Math.min(az, bz) + oz * 0.3 - 0.3,
      Math.max(ax, bx) + ox * 0.3 + 0.3, Math.max(az, bz) + oz * 0.3 + 0.3,
      rim + 0.1
    );
  }

  /* 岩組 -- the set stones at the waterline.  Irregular lathed lumps, some
   * mossed, clustered rather than spaced: a ring of evenly placed boulders
   * reads as a flower bed. */
  let rocks = 0;
  for (let i = 0; i < 46; i++) {
    const t = rng.next();
    const side = rng.int(0, 3);
    let px, pz;
    if (side === 0) { px = lerp(x0, x1, t); pz = z0 + rng.range(-0.5, 0.9); }
    else if (side === 1) { px = lerp(x0, x1, t); pz = z1 + rng.range(-0.9, 0.5); }
    else if (side === 2) { px = x0 + rng.range(-0.5, 0.9); pz = lerp(z0, z1, t); }
    else { px = x1 + rng.range(-0.9, 0.5); pz = lerp(z0, z1, t); }
    const r = rng.range(0.34, 0.92);
    const h = r * rng.range(0.6, 1.15);
    b.lathe([
      [r * 0.86, 0], [r, h * 0.3], [r * 0.92, h * 0.62], [r * 0.6, h * 0.9], [0, h],
    ], rng.int(5, 7), px, rim - rng.range(0.1, 0.4), pz,
      rng.chance(0.34) ? PAL.stoneMoss : rng.chance(0.5) ? PAL.stoneDark : PAL.stone,
      rng.chance(0.34) ? O.green : O.stone);
    rocks++;
  }

  b.flush(baker, 0, 0, 0, 0);
  return { rim, water, rocks, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
}

/* ------------------------------------------------------------------ *
 * 反橋 -- the small arched bridge.
 *
 * Vermilion, humped, with 擬宝珠 newels: the one saturated object in the park
 * apart from the tree, and it earns it by being the thing every photograph of
 * the pond is composed around.
 * ------------------------------------------------------------------ */
function archBridge(ctx, baker, { x0, z0, x1, z1, y, width = 1.9, rise = 0.85 }) {
  const b = bag();
  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const tx = dx / len, tz = dz / len;
  const nx = -tz, nz = tx;
  const n = 10;
  const arc = (t) => Math.sin(Math.PI * clamp(t, 0, 1)) * rise;

  // the deck, as a run of short boards following the hump
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const mx = x0 + dx * (t0 + t1) / 2, mz = z0 + dz * (t0 + t1) / 2;
    const my = y + arc((t0 + t1) / 2);
    const g = new THREE.BoxGeometry(width, 0.16, len / n + 0.03);
    g.rotateX(-Math.atan2(arc(t1) - arc(t0), len / n));
    g.rotateY(Math.atan2(tx, tz));
    g.translate(mx, my, mz);
    b.add(g, PAL.vermilion, O.verm);
    const u = new THREE.BoxGeometry(width * 0.8, 0.14, 0.10);
    u.rotateY(Math.atan2(tx, tz));
    u.translate(mx, my - 0.15, mz);
    b.add(u, PAL.timberDark, O.timber);
  }
  // the two piers
  for (const t of [0.06, 0.94]) {
    const px = x0 + dx * t, pz = z0 + dz * t;
    b.box(width + 0.5, 0.7, 0.9, px, y + arc(t) - 0.85, pz, PAL.stoneWall, O.stone, Math.atan2(tx, tz));
  }
  // 高欄 with 擬宝珠 newels
  for (const s of [-1, 1]) {
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const px = x0 + dx * t + nx * s * width * 0.5;
      const pz = z0 + dz * t + nz * s * width * 0.5;
      const py = y + arc(t) + 0.08;
      b.box(0.09, 0.78, 0.09, px, py, pz, PAL.vermilion, O.verm);
      b.lathe([[0.05, 0], [0.07, 0.03], [0.055, 0.065], [0.078, 0.095],
               [0.068, 0.155], [0.04, 0.20], [0, 0.23]], 8,
        px, py + 0.78, pz, PAL.gateGold, O.metal);
      if (i < 4) {
        const t2 = (i + 1) / 4;
        const qx = x0 + dx * t2 + nx * s * width * 0.5;
        const qz = z0 + dz * t2 + nz * s * width * 0.5;
        const qy = y + arc(t2) + 0.08;
        for (const hy of [0.36, 0.74]) {
          const g = new THREE.BoxGeometry(0.075, 0.075, Math.hypot(qx - px, qz - pz) + 0.02);
          g.rotateX(-Math.atan2(qy - py, Math.hypot(qx - px, qz - pz)));
          g.rotateY(Math.atan2(qx - px, qz - pz));
          g.translate((px + qx) / 2, (py + qy) / 2 + hy, (pz + qz) / 2);
          b.add(g, PAL.vermilion, O.verm);
        }
      }
    }
  }
  b.flush(baker, 0, 0, 0, 0);
  // walkable: a platform per plank so the hump is climbable, and rails to hold you
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const px = x0 + dx * t, pz = z0 + dz * t;
    ctx.platform({
      x0: px - width / 2, x1: px + width / 2,
      z0: pz - (len / n) / 2 - 0.2, z1: pz + (len / n) / 2 + 0.2,
      top: y + arc(t) + 0.08, step: 0.35,
    });
  }
  return { len, rise };
}

/* ------------------------------------------------------------------ *
 * 茶店 -- the park tea stall, closed.
 *
 * The world has no people in it, so every stall in this park is shut: shutters
 * down, noren taken in, the 縁台 benches stacked against the front.  A row of
 * these round the cherry is what gives the clearing an edge, and the fact they
 * are closed is what makes the place read as early morning rather than empty.
 * ------------------------------------------------------------------ */
function teaStall(ctx, o) {
  const { x, z, ry = 0 } = o;
  const W = o.w ?? 6.2, D = o.d ?? 4.0;
  const st = seat(ctx, x, z, W + 1.4, D + 1.4, ry);
  const y = o.y ?? st.lo;
  const b = bag();
  const base = Math.max(0.30, st.rise + 0.22);
  const wallH = 2.55;
  const rng = rngKit(Math.round(x * 71 + z * 13) >>> 0);

  b.add(taperBox(W + 1.0, D + 1.0, base - 0.06, 0.98, 0.98), PAL.stoneWall, O.stone);
  b.bar(W + 1.2, 0.08, D + 1.2, 0, base - 0.03, 0, PAL.paving, O.stone);

  // the carcass stops short of the front so the shopfront has real depth
  b.box(W, wallH, D - 0.9, 0, base, 0.45, PAL.plasterWarm, O.plaster);
  for (const sx of [-1, 1]) {
    b.box(0.20, wallH, D, sx * (W / 2 - 0.10), base, 0, PAL.timber, O.timber);
  }
  b.box(W, 0.34, 0.24, 0, base + wallH - 0.34, -D / 2 + 0.12, PAL.timberDark, O.timber);
  // the dark interior and the shutters pulled down over it
  b.box(W - 0.5, wallH - 0.5, 0.30, 0, base, -D / 2 + 0.6, PAL.shopInterior, O.deep);
  const nsl = Math.round((W - 0.6) / 0.9);
  for (let i = 0; i < nsl; i++) {
    const px = -W / 2 + 0.3 + (i + 0.5) * ((W - 0.6) / nsl);
    b.box((W - 0.6) / nsl - 0.03, wallH - 0.62, 0.07, px, base + 0.02, -D / 2 + 0.30,
      i % 2 ? PAL.timberGrey : PAL.timberMid, O.timber);
  }
  b.box(W - 0.4, 0.18, 0.34, 0, base, -D / 2 + 0.20, PAL.stoneDark, O.stone);

  // 庇 over the front, and the main roof
  b.push(hisashi({
    w: W + 0.5, depth: 1.35, y: base + wallH - 0.55, pitch: 0.30,
    material: 'tile', z: -D / 2, color: PAL.timber,
  }).parts);
  const eaveY = base + wallH;
  b.push(rafters({ w: W + 0.9, depth: 1.0, y: eaveY - 0.12, z: D / 2 - 0.05, pitch: 0.32, size: 0.06 }));
  b.push(gableRoof({
    w: W, d: D, pitch: 0.46, eave: 0.95, material: rng.chance(0.4) ? 'tileOld' : 'tile',
    mukuri: 0.03, sori: 0, cornerLift: 0, ridgeCourses: 3, y: eaveY, ridgeAlongX: true,
  }).parts);

  // 縁台 stacked against the front, and a rolled sunshade
  b.bar(2.4, 0.10, 0.44, -W * 0.22, base + 0.42, -D / 2 - 1.0, PAL.timberPale, O.timber);
  b.bar(2.4, 0.10, 0.44, -W * 0.22, base + 0.56, -D / 2 - 1.0, PAL.timberPale, O.timber);
  for (const sx of [-1, 1]) {
    b.box(0.08, 0.40, 0.40, -W * 0.22 + sx * 1.05, base, -D / 2 - 1.0, PAL.timberMid, O.timber);
  }
  b.cyl(0.10, 0.10, 2.2, W * 0.26, base + 0.05, -D / 2 - 0.9, 8, PAL.timberMid, O.timber);

  ctx.collideRot(x, z, W + 0.4, D + 0.4, ry);
  b.flush(ctx.baker(o.baker || BAKER), x, y, z, ry);

  /* One red lantern under the eave.  The stall is shut, but the lantern stays
   * out -- which is the whole difference between closed and abandoned. */
  const lp = toWorld(x, z, ry, W * 0.34, -(D / 2 + 0.9));
  return {
    x, y, z, ry, w: W, d: D, front: toWorld(x, z, ry, 0, -(D / 2 + 1.4)),
    lantern: { x: lp.x, y: y + base + wallH - 0.95, z: lp.z },
    doorY: y + base + wallH * 0.5,
  };
}

/* ------------------------------------------------------------------ *
 * The build.
 * ------------------------------------------------------------------ */
export function build(ctx) {
  const rng = rngKit(56610);
  const b = ctx.baker(BAKER);
  const L = ctx.LANDMARK;
  const out = { structures: [], trees: 0, lanterns: 0 };
  const lanternMats = [];

  const hotspot = (x, y, z, w, h, d, label, action) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
    m.position.set(x, y, z);
    m.visible = false;
    m.name = 'hot.' + label.replace(/\s+/g, '-');
    ctx.add(m);
    return ctx.interact({ hitbox: m, label, action });
  };

  const CH = L.maruyamaCherry;                 // (96, -561)
  const PK = L.maruyamaPark;                   // (138.3, -589.6)

  /* ================================================================ *
   * 1.  The paths
   *
   * One spine east from the shrine to the tree and on toward the hillside, a
   * loop round the pond, and the spur that becomes `STREETS.maruyamaLink` where
   * the park drops south to Nene-no-michi.  Drawn on the height field; the park
   * has no kerbs and no camber and does not want any.
   * ================================================================ */
  const SPINE = [
    [-16, -551], [4, -554], [26, -557], [50, -559], [72, -560.5],
    [96, -561.5], [116, -560], [136, -558], [158, -556], [178, -552],
  ];
  gravelPath(ctx, b, SPINE, 2.6);
  const POND_LOOP = [
    [114, -558], [110, -546], [114, -532], [130, -527], [148, -531],
    [153, -545], [148, -557], [130, -560],
  ];
  gravelPath(ctx, b, POND_LOOP, 1.8);
  gravelPath(ctx, b, [[96, -561.5], [92, -574], [96, -588], [112, -596], [134, -596]], 1.8);
  gravelPath(ctx, b, [[134, -596], [152, -590], [160, -576], [158, -560]], 1.8);

  /* ================================================================ *
   * 2.  祇園枝垂桜 -- the hero
   *
   * A single 枝垂桜 at the surveyed position, in an open gravel circle 26 m
   * across so that nothing is close enough to compete with it.  `hero: true` is
   * the default for this kind in the vegetation batcher and it buys the richer
   * branching and a cast shadow; the scale takes the builder's 8-10.5 m base up
   * to the ~13 m the real tree stands at.
   * ================================================================ */
  gravelPatch(ctx, b, { cx: CH.x, cz: CH.z, rx: 15.5, rz: 13.5 });
  ctx.tree({
    kind: 'shidare', x: CH.x, z: CH.z, scale: 1.62,
    rot: 0.6, seed: 19470401, hero: true, shadow: true,
  });
  /* A second, smaller stem 1.8 m off the first.  The builder hangs 25-45
   * curtains on a 枝垂桜 whatever its scale, so one at this size reads as a
   * handful of ropes with sky between them; two overlapping crowns give the
   * mass the real tree has, and an old 枝垂 does fork low enough that a second
   * stem inside the same root plate is honest rather than a cheat. */
  ctx.tree({
    kind: 'shidare', x: CH.x - 1.5, z: CH.z + 1.0, scale: 1.30,
    rot: 2.4, seed: 19470402, hero: true, shadow: false,
  });
  out.trees += 2;
  const chY = ctx.groundAt(CH.x, CH.z);

  {
    const cb = bag();
    /* 根囲い -- the low stone kerb round the root plate, which is there to stop
     * anybody standing on the roots and is the reason the tree reads as
     * *protected* rather than merely large. */
    const R = 5.2;
    const nk = 28;
    for (let i = 0; i < nk; i++) {
      const a = (i / nk) * Math.PI * 2;
      const px = Math.cos(a) * R, pz = Math.sin(a) * R;
      const gy = ctx.groundAt(CH.x + px, CH.z + pz) - chY;
      cb.box(0.34, 0.30, 0.9, px, gy, pz, i % 2 ? PAL.stone : PAL.stoneDark, O.stone, -a);
    }
    // the earth inside it, raised a little and mossed
    cb.lathe([[R - 0.1, 0.14], [R - 0.6, 0.24], [0, 0.30]], 20, 0, 0, 0, PAL.moss, O.green);

    /* 支柱 -- the timber props under the lower limbs.  The real tree has stood
     * on these since the 1950s and they are the single most identifying detail
     * on it after the colour: without them it is just a big cherry. */
    const props = 7;
    for (let i = 0; i < props; i++) {
      const a = (i / props) * Math.PI * 2 + 0.35;
      const rr = 7.0 + (i % 3) * 0.8;
      const px = Math.cos(a) * rr, pz = Math.sin(a) * rr;
      const gy = ctx.groundAt(CH.x + px, CH.z + pz) - chY;
      const h = 4.6 + (i % 2) * 0.55;
      cb.box(0.5, 0.16, 0.5, px, gy, pz, PAL.stoneDark, O.stone);
      cb.cyl(0.13, 0.115, h, px, gy + 0.16, pz, 8, PAL.timberMid, O.timber);
      // the fork at the head, and the straw pad in it
      for (const s of [-1, 1]) {
        const g = new THREE.CylinderGeometry(0.075, 0.085, 0.62, 7);
        g.rotateZ(s * 0.45);
        g.rotateY(-a);
        g.translate(px + Math.cos(a + Math.PI / 2) * s * 0.13, gy + 0.16 + h + 0.26,
          pz + Math.sin(a + Math.PI / 2) * s * 0.13);
        cb.add(g, PAL.timberMid, O.timber);
      }
      cb.bar(0.34, 0.13, 0.34, px, gy + 0.16 + h + 0.52, pz, PAL.kaya, O.timber);
      /* the diagonal brace back to the ground.  Drawn between its two JOINTS,
       * never positioned by eye: a prop whose foot misses the earth by 0.2 m is
       * the kind of thing that looks fine in every screenshot and wrong the
       * moment you walk past it. */
      const bx = Math.cos(a) * (rr + 1.6), bz = Math.sin(a) * (rr + 1.6);
      const by = ctx.groundAt(CH.x + bx, CH.z + bz) - chY;
      const ay = gy + 0.16 + h * 0.62;
      const bl = Math.hypot(bx - px, by - ay, bz - pz);
      const brace = new THREE.CylinderGeometry(0.055, 0.065, bl, 6);
      brace.rotateX(Math.PI / 2);
      brace.applyMatrix4(new THREE.Matrix4().extractRotation(
        new THREE.Matrix4().lookAt(
          new THREE.Vector3(px, ay, pz),
          new THREE.Vector3(bx, by, bz),
          new THREE.Vector3(0, 1, 0)
        )
      ));
      brace.translate((px + bx) / 2, (ay + by) / 2, (pz + bz) / 2);
      cb.add(brace, PAL.timberMid, O.timber);
    }
    cb.flush(b, CH.x, chY, CH.z, 0);
    ctx.collide(CH.x - 1.4, CH.z - 1.4, CH.x + 1.4, CH.z + 1.4);
  }

  /* 駒札 -- the park's own board about the tree, and the reason anybody
   * standing here knows what they are looking at. */
  {
    const nx = CH.x - 6.2, nz = CH.z + 7.4;
    const ny = ctx.groundAt(nx, nz);
    const nb = bag();
    for (const sx of [-1, 1]) nb.cyl(0.06, 0.055, 1.35, sx * 0.52, 0, 0, 8, PAL.timberDark, O.timber);
    nb.bar(1.30, 0.09, 0.14, 0, 1.34, 0, PAL.timberDark, O.timber);
    nb.bar(1.22, 0.72, 0.07, 0, 0.98, 0.02, PAL.timberPale, O.timber);
    const r = shedRoof({ w: 1.45, d: 0.36, pitch: 0.34, material: 'board', mukuri: 0.02, y: 1.36, ry: Math.PI, ridgeCourses: 0 });
    for (const p of r.parts) p.geometry.translate(0, 0, -0.16);
    nb.push(r.parts);
    nb.flush(b, nx, ny, nz, Math.PI * 0.15);
    const tex = cached('maruyamaCherrySign', () => noticeBoard(
      ['祇園枝垂桜', '一重白彼岸枝垂桜', '初代は昭和二十二年に枯死',
       '現在の木は二代目', '樹高約十二メートル'],
      { board: PAL.paperWarm, textColor: PAL.black, accent: PAL.redDeep, w: 384, h: 256 }
    ));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.66), celTex(tex, { bands: 3, tint: TINT.warm }));
    m.position.set(nx + Math.sin(Math.PI * 0.15) * 0.06, ny + 0.98, nz + Math.cos(Math.PI * 0.15) * 0.06);
    m.rotation.y = Math.PI * 0.15;
    m.userData.noOutline = true;
    ctx.add(m);
    ctx.collide(nx - 0.7, nz - 0.2, nx + 0.7, nz + 0.2);
    hotspot(nx, ny + 1.1, nz + 0.8, 2.0, 1.8, 1.4,
      'read about the cherry', (audio) => audio?.knock?.(220, 0.13, 0.18));
  }

  /* At dusk the tree is floodlit -- it is the one thing in Higashiyama that
   * genuinely is, and the night view of it is why the park has a name outside
   * Kyoto.  Four ground lights round the root plate, and the 雪洞 that ring the
   * clearing carry the rest. */
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.8;
    const px = CH.x + Math.cos(a) * 5.6, pz = CH.z + Math.sin(a) * 5.6;
    ctx.light({ x: px, y: ctx.groundAt(px, pz) + 0.6, z: pz, color: PAL.lanternLit, intensity: 0.9, distance: 22 });
    const lb = bag();
    lb.box(0.44, 0.20, 0.34, 0, 0, 0, PAL.stoneDark, O.stone);
    lb.box(0.30, 0.16, 0.10, 0, 0.20, -0.10, PAL.metalDark, O.metal);
    lb.flush(b, px, ctx.groundAt(px, pz), pz, -a);
  }

  /* ================================================================ *
   * 3.  雪洞 -- the paper lantern ring round the clearing
   *
   * The park hangs these on a wire round the cherry every spring.  One
   * geometry, one texture, one InstancedMesh, and their posts in the baker.
   * ================================================================ */
  {
    const N = 26, R = 17.5;
    const geo = (() => {
      const g = new THREE.CylinderGeometry(0.19, 0.19, 0.44, 9, 3, false);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const v = clamp((p.getY(i) + 0.22) / 0.44, 0, 1);
        const k = 0.42 + 0.58 * Math.pow(Math.sin(Math.PI * v), 0.5);
        p.setX(i, p.getX(i) * k);
        p.setZ(i, p.getZ(i) * k);
      }
      g.computeVertexNormals();
      g.translate(0, -0.22, 0);
      return g;
    })();
    const tex = cached('maruyamaBonbori', () => lanternTex('', {
      paper: PAL.paper, band: PAL.lanternRed, ribs: 9,
    }));
    const mat = cel({
      map: tex, bands: 'soft3', tint: TINT.cool, flat: false, cache: false,
      emissive: PAL.paperLit, emissiveIntensity: 0.32,
    });
    lanternMats.push(mat);
    const place = [];
    const pb = bag();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const px = CH.x + Math.cos(a) * R, pz = CH.z + Math.sin(a) * R;
      const gy = ctx.groundAt(px, pz);
      // the post that carries it
      pb.cyl(0.06, 0.055, 2.55, 0, 0, 0, 7, PAL.timberDark, O.timber);
      pb.bar(0.42, 0.05, 0.05, 0.14, 2.52, 0, PAL.timberDark, O.timber);
      pb.flush(b, px, gy, pz, -a);
      place.push({ x: px + Math.cos(a + Math.PI) * 0.14, y: gy + 2.46, z: pz + Math.sin(a + Math.PI) * 0.14, ry: -a });
    }
    const mesh = new THREE.InstancedMesh(geo, mat, place.length);
    mesh.name = 'maruyama-bonbori';
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < place.length; i++) {
      e.set(0, place[i].ry, 0, 'YXZ');
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(place[i].x, place[i].y, place[i].z), q, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.userData.noOutline = true;
    ctx.add(mesh);
    out.lanterns = place.length;
    // four of them become real lights; the rest are emissive paper
    for (let i = 0; i < 4; i++) {
      const p = place[Math.floor(i * place.length / 4)];
      ctx.light({ x: p.x, y: p.y - 0.2, z: p.z, color: PAL.lanternLit, intensity: 0.45, distance: 13 });
    }
  }

  /* ================================================================ *
   * 4.  茶店 -- the tea stalls round the clearing, all shut
   * ================================================================ */
  const stalls = [];
  /* Ringing the clearing, but every one of them OFF the walk in from the east:
   * the first placement put a 6 m stall 16 m in front of the camera on the
   * hero view's own sightline and the tree was behind it. */
  for (const [sx, sz, sry, w] of [
    [86.0, -581.0, -0.45, 6.6],
    [110.0, -586.0, 0.35, 5.6],
    [104.0, -542.0, Math.PI + 0.35, 6.0],
    [72.0, -540.0, Math.PI - 0.6, 5.8],
  ]) {
    const st = teaStall(ctx, { x: sx, z: sz, ry: sry, w, d: 4.0, baker: BAKER });
    stalls.push(st);
    out.structures.push('茶店');
    ctx.stats.buildings++;
    ctx.prop({ kind: 'endai', x: st.front.x, z: st.front.z, y: 0, rot: sry, seed: Math.round(sx * 11) });
    ctx.prop({ kind: 'stool', x: st.front.x + 1.6, z: st.front.z + 0.4, y: 0, rot: rng.range(0, 6.28), seed: Math.round(sz * 7) });
    if (rng.chance(0.6)) {
      ctx.prop({ kind: 'crate', x: st.front.x - 1.9, z: st.front.z + 0.6, y: 0, rot: sry, seed: Math.round(sx * 3) });
    }
  }
  /* Their lanterns: one texture, one material, one mesh each -- four draw
   * calls, and they are the only warm accent on this side of the clearing. */
  {
    const tex = cached('maruyamaStallLantern', () => lanternTex('茶', {
      paper: PAL.lanternRed, textColor: PAL.paper, band: PAL.lanternFrame, ribs: 9,
    }));
    const mat = cel({
      map: tex, bands: 'soft', tint: TINT.warm, flat: false, cache: false,
      emissive: PAL.lanternLit, emissiveIntensity: 0.28,
    });
    lanternMats.push(mat);
    const geo = new THREE.CylinderGeometry(0.15, 0.15, 0.40, 9, 1, true);
    geo.translate(0, -0.20, 0);
    for (const st of stalls) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(st.lantern.x, st.lantern.y, st.lantern.z);
      m.rotation.y = st.ry;
      m.userData.noOutline = true;
      ctx.add(m);
    }
  }
  hotspot(stalls[0].front.x, stalls[0].doorY, stalls[0].front.z, 2.6, 2.4, 2.4,
    'try the shutter', (audio) => audio?.slide?.(0.65, 900, 0.16));

  /* ================================================================ *
   * 5.  The pond, its island and its bridge
   * ================================================================ */
  const P = pond(ctx, b, { x0: 119, z0: -554, x1: 145, z1: -536, seed: 8812 });
  out.structures.push('池');

  /* The island.  A raised mound inside the bund with a small 弁天社 on it --
   * the object that gives the pond a subject and the bridge a destination. */
  {
    const ix = 130.5, iz = -543.5, ir = 4.6;
    const ib = bag();
    ib.lathe([
      [ir, 0], [ir * 0.96, 0.30], [ir * 0.80, 0.62], [ir * 0.5, 0.82], [0, 0.90],
    ], 16, 0, P.water - 0.30, 0, PAL.stoneWall, O.stone);
    ib.lathe([[ir * 0.78, 0.58], [ir * 0.55, 0.80], [0, 0.88]], 16, 0, P.water - 0.24, 0, PAL.moss, O.green);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.4;
      const rr = ir * rng.range(0.86, 1.04);
      const r = rng.range(0.3, 0.6);
      ib.lathe([[r, 0], [r * 0.94, r * 0.7], [0, r]], 6,
        Math.cos(a) * rr, P.water - rng.range(0.1, 0.3), Math.sin(a) * rr,
        rng.chance(0.4) ? PAL.stoneMoss : PAL.stoneDark, rng.chance(0.4) ? O.green : O.stone);
    }
    ib.flush(b, ix, 0, iz, 0);
    const islandY = P.water + 0.60;
    makeSubShrine(ctx, {
      x: ix, z: iz + 0.4, y: islandY, ry: Math.PI, w: 1.7, d: 1.4,
      base: 0.35, bodyH: 1.45, eave: 0.62, material: 'copper',
      color: PAL.vermilion, chigi: false, torii: false, saisenbako: false, baker: BAKER,
    });
    out.structures.push('弁天社');
    makeTorii(ctx, {
      x: ix, z: iz + 3.4, y: islandY, ry: Math.PI, kind: 'myojin',
      height: 2.5, span: 1.8, baker: BAKER,
    });
    ctx.tree({ kind: 'pine', x: ix - 2.4, z: iz - 2.0, y: islandY, scale: 0.85, rot: 1.1, seed: 4242 });
    out.trees++;
  }
  archBridge(ctx, b, {
    x0: 130.5, z0: -554.6, x1: 130.5, z1: -547.6, y: P.rim - 0.05, width: 1.9, rise: 0.8,
  });
  out.structures.push('反橋');

  // a 蹲踞 and its dipper at the pond's west corner
  makeChozu(ctx, { x: 116.5, z: -551.5, ry: 0.6, baker: BAKER });
  hotspot(116.5, ctx.groundAt(116.5, -551.5) + 0.6, -551.5, 1.8, 1.6, 1.8,
    'rinse your hands', (audio) => audio?.splash?.(0.20));

  /* ================================================================ *
   * 6.  Stone lanterns, benches, and the rest of the park furniture
   * ================================================================ */
  const alongPath = (pts, spacing, fn) => {
    let carry = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      let s = carry;
      while (s < len) {
        const t = s / len;
        const px = lerp(a[0], c[0], t), pz = lerp(a[1], c[1], t);
        const nx = -(c[1] - a[1]) / len, nz = (c[0] - a[0]) / len;
        fn(px, pz, nx, nz);
        s += spacing;
      }
      carry = s - len;
    }
  };

  let stone = 0;
  alongPath(SPINE, 18, (px, pz, nx, nz) => {
    for (const s of [-1, 1]) {
      const x = px + nx * 3.6 * s, z = pz + nz * 3.6 * s;
      if (ctx.slopeAt(x, z) > 22) continue;
      if (Math.hypot(x - CH.x, z - CH.z) < 17) continue;      // keep the tree's circle clear
      makeStoneLantern(ctx, {
        x, z, kind: rng.chance(0.7) ? 'kasuga' : 'oribe',
        height: rng.chance(0.7) ? rng.range(1.8, 2.3) : undefined,
        ry: rng.range(0, 6.283), baker: BAKER,
      });
      stone++;
    }
  });
  alongPath(POND_LOOP, 13, (px, pz, nx, nz) => {
    const x = px - nx * 2.8, z = pz - nz * 2.8;
    if (ctx.slopeAt(x, z) > 22) return;
    makeStoneLantern(ctx, {
      x, z, kind: rng.chance(0.5) ? 'yukimi' : 'oribe',
      ry: rng.range(0, 6.283), baker: BAKER,
    });
    stone++;
  });
  out.stoneLanterns = stone;

  // benches facing the tree and the pond, and the traces of a park at 6 a.m.
  for (const [x, z, r] of [
    [CH.x - 11.5, CH.z + 4.0, 1.2], [CH.x + 10.5, CH.z + 6.0, -1.9],
    [CH.x - 2.0, CH.z + 12.5, 3.14], [CH.x + 12.0, CH.z - 6.0, -1.2],
    [117.5, -557.5, 0.5], [147.0, -534.0, 3.6], [64.0, -557.0, 1.6],
    [156.0, -554.0, 2.4],
  ]) {
    ctx.prop({ kind: 'endai', x, z, y: 0, rot: r, variant: 'bare', seed: Math.round(x * 13 + z) });
  }
  for (const [k, x, z] of [
    ['leafPile', 88, -568], ['leafPile', 121, -560], ['leafPile', 150, -548],
    ['broom', 104.5, -574.5], ['bucket', 105.6, -573.6], ['waterBucket', 118, -549],
    ['catAsleep', 99, -577], ['crate', 113.5, -567.5], ['stool', 141, -560],
    ['boxStack', 82.5, -550.5], ['tileStack', 79, -573],
  ]) {
    ctx.prop({ kind: k, x, z, y: 0, rot: rng.range(0, 6.283), seed: Math.round(x * 7 + z) });
  }
  for (let i = 0; i < 22; i++) {
    const x = rng.range(30, 190), z = rng.range(-620, -470);
    if (ctx.slopeAt(x, z) > 16) continue;
    ctx.prop({ kind: 'stepStone', x, z, y: 0, rot: rng.range(0, 6.283), seed: 800 + i });
  }

  /* ================================================================ *
   * 7.  円山公園南口 -- the way down to Nene-no-michi
   *
   * `STREETS.maruyamaLink` is a real corridor and the street layer paves it;
   * what it needs from this district is the thing that says a boundary has been
   * crossed.  A stone-post gate, a 玉垣 run and a lantern each side.
   * ================================================================ */
  {
    const c = ctx.getCorridor('maruyamaLink');
    const p = c.pointAt(6);
    const nx = -p.tz, nz = p.tx;
    for (const s of [-1, 1]) {
      const x = p.x + nx * 3.4 * s, z = p.z + nz * 3.4 * s;
      const gy = ctx.groundAt(x, z);
      const gb = bag();
      gb.add(taperBox(0.70, 0.70, 0.26, 0.92), PAL.stoneDark, O.stone);
      const sh = taperBox(0.40, 0.40, 2.30, 0.95);
      sh.translate(0, 0.26, 0);
      gb.add(sh, PAL.stone, O.stone);
      const cap = taperBox(0.44, 0.44, 0.14, 0.62);
      cap.translate(0, 2.56, 0);
      gb.add(cap, PAL.stone, O.stone);
      gb.flush(b, x, gy, z, Math.atan2(nx * s, nz * s));
      ctx.collide(x - 0.45, z - 0.45, x + 0.45, z + 0.45);
      makeStoneLantern(ctx, {
        x: x + nx * 1.9 * s, z: z + nz * 1.9 * s, kind: 'kasuga', height: 2.1,
        ry: rng.range(0, 6.283), baker: BAKER,
      });
    }
    const q = c.pointAt(26);
    makeTamagaki(ctx, {
      points: [{ x: q.x - 14, z: q.z + 2 }, { x: q.x - 4, z: q.z + 1 }],
      dense: false, baker: BAKER,
    });
    ctx.prop({ kind: 'pathMarker', x: p.x + nx * 5.0, z: p.z + nz * 5.0, y: 0, rot: 0.4, variant: 'tall', seed: 61 });
  }

  /* ================================================================ *
   * 8.  The planting
   *
   * A park, not a forest: maples and cherries in loose groups with open lawn
   * between them, pines held to the pond and the ridge, and cedar only at the
   * back where the park runs into the hillside.  Nothing inside the hero
   * tree's 20 m circle, and nothing on the paths.
   * ================================================================ */
  const onPath = (x, z) => {
    const near = (pts, half) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], c = pts[i + 1];
        const dx = c[0] - a[0], dz = c[1] - a[1];
        const l2 = dx * dx + dz * dz;
        const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1);
        const px = a[0] + dx * t, pz = a[1] + dz * t;
        if (Math.hypot(x - px, z - pz) < half) return true;
      }
      return false;
    };
    return near(SPINE, 4.6) || near(POND_LOOP, 3.8);
  };
  const blocked = (x, z) => {
    if (Math.hypot(x - CH.x, z - CH.z) < 21) return true;
    if (x > 112 && x < 152 && z > -562 && z < -529) return true;      // the pond
    for (const st of stalls) if (Math.hypot(x - st.x, z - st.z) < 8) return true;
    const su = ctx.surfaceAt(x, z);
    if (su && su.dist < su.half + 3.0) return true;
    return onPath(x, z);
  };

  let planted = 0;
  for (let i = 0; i < 900 && planted < 230; i++) {
    const x = rng.range(-14, 214), z = rng.range(-656, -444);
    if (blocked(x, z)) continue;
    if (ctx.slopeAt(x, z) > 30) continue;
    const back = x > 168 || z < -616;                 // the hillside behind the park
    const nearPond = Math.hypot(x - P.cx, z - P.cz) < 34;
    const u = rng.next();
    let kind;
    if (back) kind = u < 0.44 ? 'cedar' : u < 0.72 ? 'pine' : u < 0.88 ? 'maple' : 'shrub';
    else if (nearPond) kind = u < 0.30 ? 'pine' : u < 0.50 ? 'maple' : u < 0.66 ? 'willow' : u < 0.84 ? 'shrub' : 'sakura';
    else kind = u < 0.34 ? 'sakura' : u < 0.58 ? 'maple' : u < 0.70 ? 'pine' : u < 0.80 ? 'ginkgo' : u < 0.94 ? 'shrub' : 'camellia';
    ctx.tree({
      kind, x, z,
      scale: kind === 'cedar' ? rng.range(1.1, 1.6)
        : kind === 'shrub' || kind === 'camellia' ? rng.range(0.8, 1.25)
        : rng.range(0.9, 1.35),
      rot: rng.range(0, 6.283), seed: (i * 2654435761) >>> 0,
    });
    planted++;
  }
  /* ---------------------------------------------------------------- *
   * The backdrop.
   *
   * A pale pink tree against a pale sky is a tree with no silhouette, and the
   * whole of this district is pale.  So a deliberate band of dark evergreen
   * goes in WEST and NORTH-WEST of the clearing -- behind the tree from the
   * hero camera, which walks in from the east -- and it is the single change
   * that makes the cherry read as a mass rather than as a stain.
   * ---------------------------------------------------------------- */
  for (const [gx, gz, n, r] of [
    [62, -578, 9, 11], [58, -552, 8, 10], [74, -594, 7, 9], [86, -600, 6, 8],
    [120, -592, 6, 9],
  ]) {
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, 6.283), rr = Math.sqrt(rng.next()) * r;
      const x = gx + Math.cos(a) * rr, z = gz + Math.sin(a) * rr;
      if (blocked(x, z) || ctx.slopeAt(x, z) > 30) continue;
      const u = rng.next();
      ctx.tree({
        kind: u < 0.46 ? 'pine' : u < 0.78 ? 'cedar' : 'camellia',
        x, z, scale: rng.range(1.15, 1.65), rot: rng.range(0, 6.283),
        seed: Math.round(x * 53 + z * 11) >>> 0,
      });
      planted++;
    }
  }

  /* A second string of large cherries just outside the clearing, so the hero
   * tree is read against blossom as well as against dark -- and older maples
   * close in, which is what actually frames it in photographs. */
  for (const [x, z, k, s] of [
    [CH.x - 21, CH.z - 9, 'sakura', 1.35], [CH.x - 17, CH.z + 14, 'sakura', 1.25],
    [CH.x + 21, CH.z - 12, 'sakura', 1.30], [CH.x + 19, CH.z + 13, 'sakura', 1.20],
    [CH.x - 24, CH.z + 2, 'maple', 1.30], [CH.x + 25, CH.z + 3, 'maple', 1.25],
    [CH.x + 2, CH.z - 22, 'maple', 1.20], [CH.x - 4, CH.z + 21, 'pine', 1.15],
    [PK.x - 6, PK.z + 4, 'sakura', 1.30], [PK.x + 12, PK.z - 6, 'maple', 1.2],
  ]) {
    if (ctx.slopeAt(x, z) > 28) continue;
    ctx.tree({ kind: k, x, z, scale: s, rot: rng.range(0, 6.283), seed: Math.round(x * 37 + z * 5) >>> 0, hero: k === 'sakura' });
    planted++;
  }
  out.trees += planted;

  /* ================================================================ *
   * 9.  Dusk
   * ================================================================ */
  {
    let on = null;
    const set = (v) => {
      if (v === on) return;
      on = v;
      for (const m of lanternMats) {
        m.emissiveIntensity = v ? 1.05 : 0.32;
        m.needsUpdate = true;
      }
    };
    set(false);
    ctx.update(() => {
      const k = (typeof window !== 'undefined' && window.__scene?.time?.key) || 'day';
      set(k === 'dusk' || k === 'sunset');
    });
  }

  return out;
}
