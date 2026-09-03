import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT, cel, celTex } from '../core/toon.js';
import {
  trs, lathe, taperBox, prism, rngKit, lerp, clamp, stairs,
} from '../core/util.js';
import { lanternTex, emaTex, omikujiTex, templePlaque, woodenSign, cached } from '../core/textures.js';
import {
  irimoyaRoof, gableRoof, shedRoof, brackets, rafters, gyo, chigi, ROOFING,
} from './roof.js';

/* ------------------------------------------------------------------ *
 * 八坂神社 -- the shrine kit.
 *
 * A kit of generators, not a scene.  The Yasaka district builder places these;
 * everything here takes a world position, seats itself on `ctx.groundAt`, draws
 * into a baker the caller names, and registers its own collision.
 *
 * ---------------------------------------------------------------- LAYOUT
 *
 * The fact that governs how these are used: **Honden, Maiden, South Romon and
 * the stone torii form a straight north-south ceremonial axis, and the famous
 * vermilion West Romon is NOT on it.**  It is a side entrance 92 m west and
 * 39 m north of the Maiden, facing west down Shijo-dori.  The stone torii is
 * the formal 正門; before Meiji the South Romon was the main gate; the West
 * Romon has never been.  Surveyed positions are in `LANDMARK` (route.js) and
 * `docs/recon/GEO.md` s6 -- nothing in this file holds a coordinate.
 *
 * ------------------------------------------- FOUR THINGS ARCH.md s4 FIXES
 *
 * 1. **The West Romon is 切妻造・本瓦葺 -- GABLED, and TILED.**  Not irimoya,
 *    not cypress bark.  It was hiwadabuki at the 1497 rebuild and was retiled
 *    in the Eiroku era.  Its roof is silver-grey 本瓦, which is why the gate
 *    reads as vermilion-against-grey and not vermilion-against-brown.
 * 2. **Its lattice is 緑青 verdigris GREEN, not red.**  The complementary
 *    green-on-vermilion pairing is the single most commonly botched detail on
 *    this building.  `PAL.gateGreen`.
 * 3. **Four different roof materials in one precinct**, and they are worth
 *    honouring: 檜皮葺 (Honden, 透塀) · 本瓦葺 (West Romon, its wings, 神輿庫) ·
 *    銅板葺 (South Romon, Maiden, 神饌所) · 桟瓦葺 (絵馬堂, both 手水舎, 神馬舎).
 * 4. **The Honden is not painted.**  Bare timber under a bark roof.  Vermilion
 *    at Yasaka is the two gates and the Maiden's frame, nothing else.
 *
 * ------------------------------------------------------------- DIMENSIONS
 *
 * `SPEC` below is ARCH.md s4.6's build-ready table, verbatim.  Footprints are
 * OSM polygons or cultural-property records; the derived numbers are marked.
 * Bay counts come from the 構造及び形式 strings, which is the only place they
 * exist: 三間一戸楼門 for both gates, 桁行三間梁間三間 for the Maiden,
 * 桁行七間梁間六間 for the Honden.
 *
 * -------------------------------------------------------------- MATERIAL
 *
 * ------------------------------------------------------------------ USE
 *
 *   const gate = makeRomon(ctx, { kind: 'west', x, z, ry: Math.PI / 2 });
 *
 * `ry` is the project's yaw: an object given `ry = yawTo(x, z, tx, tz)` faces
 * (tx, tz), and `ry = 0` faces north.  Everything is modelled in a local frame
 * whose **front is local -Z** and flushed through one matrix, so an assembly
 * has exactly one rotation in it.
 *
 * Generators that stand on a 基壇 (both gates) register their podium as a
 * platform at the END of their own build, so anything the district wants to
 * seat ON that podium must be placed after the gate -- KIT.md s2.
 *
 * -------------------------------------------------------------- MATERIAL
 *
 * `PAL.vermilion` (0xd2551a) is 朱 -- an orange red, about twice the chroma of
 * `PAL.bengara` (0x8f2d12), the Gion ochaya lacquer.  Confusing the two is
 * flagged in the survey as the likeliest rendering error in this project.
 * Shrine structures get vermilion; nothing in Gion does.  And vermilion takes
 * `TINT.warmDeep`: a vermilion gate shaded with the default violet goes purple,
 * which is a thing that does not happen to lacquer.
 * ------------------------------------------------------------------ */

/* ------------------------------- shading -------------------------------- */

const O = {
  verm:      { bands: 3, tint: TINT.warmDeep },
  vermDeep:  { bands: 2, tint: TINT.warmDeep },
  timber:    { bands: 3, tint: TINT.warm },
  timberDark:{ bands: 3, tint: TINT.warm },
  deep:      { bands: 'deep', tint: TINT.warm },
  stone:     { bands: 3, tint: TINT.cool },
  plaster:   { bands: 'soft3', tint: TINT.cool },
  paper:     { bands: 'soft3', tint: TINT.cool },
  gravel:    { bands: 'soft3', tint: TINT.cool },
  hiwada:    { bands: 3, tint: TINT.warm },
  green:     { bands: 3, tint: TINT.green },
  metal:     { bands: 4, tint: TINT.cool, flat: false },
};

/** The ken (京間).  Bay spacing on everything here is a multiple of it. */
export const KEN = 1.96970;

/**
 * Measured footprints, derived heights.  `conf` marks which is which.
 * The district builder may override any of it.
 */
/**
 * ARCH.md s4.6, the build-ready table.  `wall`/`deep` are the structural
 * (post-centre) plan; `w`/`d` are the roof outline including eaves, which is
 * what OSM traced.  Everything not marked DERIVED is a published figure.
 */
export const SPEC = {
  /* 三間一戸楼門、切妻造、本瓦葺 -- 1497, ICP 1911.  桁行 7.9 m, ridge 9.1 m. */
  westRomon: {
    w: 11.7, d: 9.0,               // roof outline N-S x E-W  [OSM]
    wall: 7.9, deep: 5.2,          // 桁行 [MED] / 梁間 [DERIVED]
    eave: 1.90,                    // (11.7 - 7.9) / 2        [DERIVED]
    height: 9.1,                   // ridge                   [MED]
    lowerEave: 5.50, upperEave: 7.40,   // [UNKNOWN -- suggested by ARCH.md]
    bays: 3, bay: 2.63,            // 7.9 / 3                 [DERIVED]
    roof: 'gable', material: 'tile',
    pitch: 0.40, sori: 0.09, cornerLift: 0.45, ridgeCourses: 7,
    lattice: PAL.gateGreen,
    wing: { bays: 5, bay: 2.63, depth: 2.60, height: 4.2 },  // 翼廊, 1925, dog-legged
  },
  /* 三間一戸楼門、入母屋造、東西廻廊附属、切妻造、銅板葺 -- 1879, ICP 2020. */
  southRomon: {
    w: 9.0, d: 10.8,               // the gate proper; corridors are separate
    wall: 9.0, deep: 6.0,          // 三間 x 3.0 m, 二間        [DERIVED]
    eave: 2.40,
    height: 14.0,                  // [MED]
    lowerEave: 6.60, upperEave: 9.60,
    bays: 3, bay: 3.00,
    roof: 'irimoya', material: 'copper',
    pitch: 0.62, sori: 0.11, cornerLift: 0.80, ridgeCourses: 6,
    lattice: PAL.gateGreen,
    corridor: { length: 5.20, depth: 3.60, height: 3.5 },    // 東西廻廊, 切妻銅板葺
  },
  /* 桁行三間、梁間三間、入母屋造、銅板葺 -- 1903, ICP 2020. */
  maiden: {
    w: 13.3, d: 11.9,              // roof outline            [OSM]
    wall: 9.3, deep: 7.9,          // platform                [DERIVED]
    eave: 2.00, bays: 3,
    height: 9.0,                   // 8.5-9.5 suggested; the "14 m" is rejected
    post: 3.90, base: 0.66,
    material: 'copper', pitch: 0.50, sori: 0.11, cornerLift: 0.70,
    lanterns: 250,                 // ~126 per tier x 2 tiers [DERIVED]
    lantern: { d: 0.34, h: 0.66 }, // 堂島提灯                 [HIGH catalogue]
  },
  /* 桁行七間、梁間六間、入母屋造、正面向拝三間、両側面及び背面庇付、
   * 背面三間突出、檜皮葺 -- 1654, National Treasure 2020. */
  honden: {
    w: 35.0, d: 30.0,              // eaves-line plan, 1049.5 m2
    wall: 27.80, deep: 23.83,      // 662.38 m2 at 7:6        [DERIVED]
    eave: 3.20,                    // 3.0-3.6 all round       [DERIVED]
    height: 15.53,                 // ridge                   [HIGH, the shrine]
    eaveHeight: 6.80,              // [UNKNOWN -- 6.5-7.0 suggested]
    baysX: 7, baysZ: 6, bay: 3.97, // = 2.02 Kyoma ken, a strong self-check
    base: 0.95,
    material: 'hiwada', pitch: 0.60, sori: 0.13, cornerLift: 0.95,
    kohai: { bays: 3, depth: 4.2 },      // 正面向拝三間
    hisashi: 2.60,                       // 又庇 skirt on both flanks and the rear
    rear: { bays: 3, depth: 4.0 },       // 背面三間突出
  },
  /* 石造明神鳥居 -- 1646, ICP 1911.  One of the three great stone torii. */
  stoneTorii: {
    height: 9.5,                   // 9.33 is the tolerance floor
    span: 6.8,                     // 柱間                     [MED]
    pillarR: 0.375,                // phi 0.75                 [DERIVED, 3 rules agree]
    width: 9.9,                    // 笠木 length, 1.45 x span [DERIVED]
  },
  /* 桁行一間、梁間一間 -- south is 入母屋, west is 切妻; both 桟瓦葺, 水盤付. */
  temizuyaSouth: { w: 6.2, d: 3.7, bay: 3.0, height: 4.2, roof: 'irimoya', material: 'tile' },
  temizuyaWest:  { w: 5.4, d: 4.1, bay: 3.0, height: 4.2, roof: 'gable',   material: 'tile' },
  /* 桁行七間、梁間二間、入母屋造、北面下屋付、桟瓦葺 -- 1744. */
  emado: { w: 25.4, d: 9.1, baysX: 7, bay: 3.63, height: 6.4 },
};


/* ------------------------------------------------------------------ *
 * Local-frame parts bag.
 *
 * Everything is modelled in a local frame -- origin on the ground at the
 * object's centre, **local -Z is the front** -- and flushed through one matrix.
 * That convention is chosen so `ry` is exactly the project's yaw: an object
 * given `ry = yawTo(x, z, tx, tz)` faces (tx, tz).  Assemblies built from part
 * positions in world space is where the sign errors live; this way there is
 * exactly one rotation in the whole object.
 * ------------------------------------------------------------------ */

function bag() {
  const list = [];
  const api = {
    list,
    add(geometry, color, opts) { list.push({ geometry, color, opts }); return api; },
    /** roof.js and friends hand back `[{geometry, color, opts}]`. */
    push(arr) { if (arr) for (let i = 0; i < arr.length; i++) list.push(arr[i]); return api; },

    /** A box with its origin at the centre of its base. */
    box(w, h, d, x, y, z, color, opts, ry = 0) {
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(0, h / 2, 0);
      if (ry) g.rotateY(ry);
      g.translate(x, y, z);
      return api.add(g, color, opts);
    },
    /** A box centred on its own centre -- for beams and rails. */
    bar(w, h, d, x, y, z, color, opts, ry = 0) {
      const g = new THREE.BoxGeometry(w, h, d);
      if (ry) g.rotateY(ry);
      g.translate(x, y, z);
      return api.add(g, color, opts);
    },
    /** A vertical cylinder, base at y. */
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

    get triangles() {
      let t = 0;
      for (const p of list) t += p.geometry.attributes.position.count / 3;
      return Math.round(t);
    },

    /** Emit into a baker at world (x, y, z), rotated by `ry`. */
    flush(baker, x, y, z, ry = 0) {
      const tris = api.triangles;
      const m = trs(x, y, z, 0, ry, 0);
      for (const p of list) baker.add(p.geometry, m, p.color, p.opts);
      list.length = 0;
      return tris;
    },
  };
  return api;
}

/* ------------------------------ geometry -------------------------------- */

/**
 * A rectangular bar swept along a polyline in the local XY plane, running
 * along X.  This is what a 笠木 is: a beam that *curves*, and a torii built
 * with a straight box across the top reads as a gateway in a theme park.
 * `stations` are `{x, y}` from one end to the other.
 */
function barX(stations, hz, hy, taper = null) {
  const n = stations.length;
  const pos = [], idx = [];
  for (let i = 0; i < n; i++) {
    const s = stations[i];
    const k = taper ? taper(i / (n - 1)) : 1;
    const az = hz * k, ay = hy * k;
    pos.push(s.x, s.y + ay, -az);
    pos.push(s.x, s.y + ay, az);
    pos.push(s.x, s.y - ay, az);
    pos.push(s.x, s.y - ay, -az);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 4, b = (i + 1) * 4;
    for (let e = 0; e < 4; e++) {
      const e2 = (e + 1) % 4;
      idx.push(a + e, a + e2, b + e, a + e2, b + e2, b + e);
    }
  }
  idx.push(0, 2, 1, 0, 3, 2);
  const l = (n - 1) * 4;
  idx.push(l, l + 1, l + 2, l, l + 2, l + 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A slab swept along a polyline in the local ZY plane, spanning X.  The sweep
 * for a 流造 front slope and for any roof plane the roof kit does not cover.
 */
function slabZ(stations, hx, thick) {
  const n = stations.length;
  const pos = [], idx = [];
  for (let i = 0; i < n; i++) {
    const s = stations[i];
    pos.push(-hx, s.y, s.z);
    pos.push(hx, s.y, s.z);
    pos.push(hx, s.y - thick, s.z);
    pos.push(-hx, s.y - thick, s.z);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 4, b = (i + 1) * 4;
    for (let e = 0; e < 4; e++) {
      const e2 = (e + 1) % 4;
      idx.push(a + e, b + e, a + e2, a + e2, b + e, b + e2);
    }
  }
  idx.push(0, 1, 2, 0, 2, 3);
  const l = (n - 1) * 4;
  idx.push(l, l + 2, l + 1, l, l + 3, l + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Rotate and offset a `parts` array in place.
 *
 * `roof.js`'s `rafters` and `brackets` take an `ry` that turns each *stick*
 * but still lays the run out along X, which is right for a front elevation and
 * wrong for a side one.  Generate the run along X and turn the whole array
 * with this instead.
 */
function rotParts(parts, ry, dx = 0, dz = 0) {
  const m = trs(dx, 0, dz, 0, ry, 0);
  for (const p of parts) p.geometry.applyMatrix4(m);
  return parts;
}

/** Local (lx, lz) -> world, for a frame rotated by `ry` about (x, z). */
function toWorld(x, z, ry, lx, lz) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return { x: x + lx * c + lz * s, z: z - lx * s + lz * c };
}

/**
 * Seat a footprint.  A building on a slope sits on the *lowest* of its corners
 * and its plinth makes up the difference -- which is what a real 基壇 is for.
 */
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

const seedOf = (x, z, salt = 0) =>
  (Math.round(x * 7919) ^ Math.round(z * 104729) ^ (salt * 2654435761)) >>> 0;

/* ------------------------------------------------------------------ *
 * 提灯 -- the paper lantern, as an instanced batch.
 *
 * The Maiden carries about two hundred of these and they cannot be two hundred
 * meshes.  One geometry, one material, one InstancedMesh, one draw call, and a
 * handle so they can light at dusk.
 *
 * The body is a barrel with proper cylindrical UVs (a LatheGeometry's v runs on
 * point index, which smears the collars); the ends close to a small disc so the
 * dark collar band in the texture reads at both ends.
 * ------------------------------------------------------------------ */

function lanternGeo(h = 0.84, r = 0.215, radial = 10, rings = 4) {
  const pos = [], uv = [], idx = [];
  const prof = (v) => 0.30 + 0.70 * Math.pow(Math.sin(Math.PI * clamp(v, 0, 1)), 0.5);
  for (let i = 0; i <= rings; i++) {
    const v = i / rings;
    const rr = r * prof(v);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      pos.push(Math.cos(a) * rr, v * h, Math.sin(a) * rr);
      uv.push(j / radial, v);
    }
  }
  const stride = radial + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * stride + j, b = a + 1, c = a + stride, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  // caps -- a fan to a centre point, uv parked on the collar band
  for (const [v, yy, flip] of [[0, 0, true], [1, h, false]]) {
    const centre = pos.length / 3;
    pos.push(0, yy, 0); uv.push(0.5, v);
    const rr = r * prof(v);
    const ring = pos.length / 3;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      pos.push(Math.cos(a) * rr, yy, Math.sin(a) * rr);
      uv.push(j / radial, v);
    }
    for (let j = 0; j < radial; j++) {
      if (flip) idx.push(centre, ring + j, ring + j + 1);
      else idx.push(centre, ring + j + 1, ring + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** 絵馬 -- the pentagonal votive tablet, with real UVs on both faces. */
function emaGeo(w = 0.145, h = 0.108, t = 0.011) {
  const hw = w / 2, sh = h * 0.66;
  const out = [[-hw, 0], [hw, 0], [hw, sh], [0, h], [-hw, sh]];
  const pos = [], uv = [], idx = [];
  const u = (p) => (p[0] + hw) / w, v = (p) => p[1] / h;
  for (const s of [1, -1]) {
    const base = pos.length / 3;
    for (const p of out) { pos.push(p[0], p[1], (s * t) / 2); uv.push(s > 0 ? u(p) : 1 - u(p), v(p)); }
    if (s > 0) idx.push(base, base + 1, base + 2, base, base + 2, base + 3, base, base + 3, base + 4);
    else idx.push(base, base + 2, base + 1, base, base + 3, base + 2, base, base + 4, base + 3);
  }
  // rim
  for (let i = 0; i < out.length; i++) {
    const a = out[i], b = out[(i + 1) % out.length];
    const base = pos.length / 3;
    pos.push(a[0], a[1], t / 2, b[0], b[1], t / 2, b[0], b[1], -t / 2, a[0], a[1], -t / 2);
    uv.push(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const _geoCache = new Map();
const geoOnce = (k, fn) => {
  if (!_geoCache.has(k)) _geoCache.set(k, fn());
  return _geoCache.get(k);
};

/**
 * Build an instanced batch of textured objects.
 * `placements` are `{ x, y, z, ry, rx, rz, s }` in WORLD space.
 */
function instanceBatch(ctx, name, geometry, material, placements) {
  if (!placements.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  mesh.name = name;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    e.set(p.rx || 0, p.ry || 0, p.rz || 0, 'YXZ');
    q.setFromEuler(e);
    v.set(p.x, p.y, p.z);
    sc.setScalar(p.s ?? 1);
    m.compose(v, q, sc);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.frustumCulled = true;
  ctx.add(mesh);
  return mesh;
}

/* ------------------------------------------------------------------ *
 * Lighting the paper.
 *
 * One material per batch (not the shared celTex cache) so a batch can glow
 * without lighting every sheet of paper in Higashiyama.  `autoLight` watches
 * the time-of-day state and turns the batch on at sunset and dusk; it is a
 * single string compare per frame and it only touches the material on a
 * change.
 * ------------------------------------------------------------------ */

function paperMaterial(map, { bands = 'soft3' } = {}) {
  return cel({ map, bands, tint: TINT.cool, flat: false, cache: false });
}

function litHandle(ctx, materials, { autoLight = true, intensity = 0.78 } = {}) {
  let on = null;
  const set = (v) => {
    if (v === on) return;
    on = v;
    for (const m of materials) {
      m.emissive.set(v ? PAL.paperLit : 0x000000);
      m.emissiveIntensity = v ? intensity : 0;
      m.needsUpdate = true;
    }
  };
  set(false);
  if (autoLight) {
    ctx.update(() => {
      const k = (typeof window !== 'undefined' && window.__scene?.time?.key) || 'day';
      set(k === 'dusk' || k === 'sunset');
    });
  }
  return set;
}

/* ------------------------------------------------------------------ *
 * 鳥居 -- the torii.
 *
 * Getting this right is not decoration.  A 明神鳥居 has, from the top down:
 *
 *   笠木 kasagi     the top lintel, and it CURVES upward toward both ends
 *   島木 shimaki    a second, heavier board immediately beneath it
 *   額束 gakuzuka   a tablet post between the lintel and the second rail
 *   貫   nuki       the second rail, which PIERCES the pillars and projects
 *   楔   kusabi     the wedges driven in where it does
 *   柱   hashira    the pillars, which BATTER inward (~1/70) and taper
 *   亀腹 kamebara   the swollen collar at each pillar's foot
 *
 * Straight parallel pillars under a flat lintel is a theme-park gateway.  The
 * lean is only ~1/70 -- a hundred millimetres over seven metres -- and it is
 * still the difference between a torii and a goalpost, because it is what
 * closes the silhouette at the top.
 *
 * 神明鳥居 (shinmei) is the plain form: a round log lintel, no shimaki, no
 * curve, no tablet, and the nuki stopped inside the pillars.
 *
 * ARCH.md s4.2 on the 1646 石鳥居 specifically, and these are the four details
 * that make it read as *that* torii rather than a generic one:
 *
 *   - the 笠石 assembly is FIVE stones, and the 笠木 and 島木 are visibly
 *     DIFFERENT COLOURS -- different quarries.  Model them with different
 *     albedo.
 *   - each pillar is TWO stones (上下二石) with a visible horizontal joint.
 *   - the 笠木 ends are cut at an ACUTE angle -- an early-Edo signature.
 *   - the 笠木 curves sharply (反り増し) only from about 1/3 of its length
 *     outward, while the 島木 stays nearly horizontal.  That is what
 *     distinguishes it from Sumiyoshi Taisha, where both curve gently.
 * ------------------------------------------------------------------ */

const TORII = {
  myojin: {
    height: 5.4, span: 4.40, pillarR: 0.235, batter: 1 / 70,
    color: PAL.vermilion, opts: O.verm, sori: 0.055, seg: 12, sharp: 0,
  },
  shinmei: {
    height: 4.6, span: 3.90, pillarR: 0.215, batter: 1 / 110,
    color: PAL.timberWarm, opts: O.timber, sori: 0, seg: 10, sharp: 0,
  },
  stone: {
    height: SPEC.stoneTorii.height, span: SPEC.stoneTorii.span,
    pillarR: SPEC.stoneTorii.pillarR, batter: 1 / 90, width: SPEC.stoneTorii.width,
    color: PAL.stone, opts: O.stone, sori: 0.062, seg: 14, sharp: 1,
    shimakiColor: PAL.pavingDark,      // a different quarry -- ARCH.md s4.2
    joint: 0.46,                       // 上下二石: the horizontal joint height
  },
};

/**
 * @param {object} o
 * @param {number} o.x @param {number} o.z  world position of the centre
 * @param {number} [o.y]   ground; defaults to `ctx.groundAt`
 * @param {number} [o.ry]  yaw you face walking through it (0 = north)
 * @param {'myojin'|'shinmei'|'stone'} [o.kind]
 * @param {number} [o.height] top of the kasagi above the ground
 * @param {number} [o.span]   pillar centre to pillar centre at the foot
 * @param {string} [o.plaque] text for the 神額 on the gakuzuka
 * @param {boolean|object} [o.shimenawa]
 */
export function makeTorii(ctx, o = {}) {
  const K = TORII[o.kind] || TORII.myojin;
  const kind = o.kind || 'myojin';
  const stone = kind === 'stone';
  const shinmei = kind === 'shinmei';
  const H = o.height ?? K.height;
  const S = o.span ?? K.span;
  const rB = o.pillarR ?? K.pillarR * (o.span ? o.span / K.span : 1);
  const ry = o.ry ?? 0;
  const x = o.x, z = o.z;
  const y = o.y ?? Math.min(
    ctx.groundAt(toWorld(x, z, ry, -S / 2, 0).x, toWorld(x, z, ry, -S / 2, 0).z),
    ctx.groundAt(toWorld(x, z, ry, S / 2, 0).x, toWorld(x, z, ry, S / 2, 0).z)
  );
  const color = o.color ?? K.color;
  const opts = o.opts ?? K.opts;
  const b = bag();

  const rT = rB * (stone ? 0.90 : 0.86);
  const lean = H * K.batter;
  const theta = Math.atan2(lean, H);

  /* --- the two horizontals ------------------------------------------- */
  const kasagiH = H * (shinmei ? 0.075 : 0.048);
  const shimakiH = shinmei ? 0 : H * 0.060;
  const lintelBot = H - kasagiH - shimakiH;          // underside of the shimaki
  const over = o.overhang ?? (shinmei ? S * 0.10 + 0.16 : S * 0.13 + 0.26);
  const L = o.width ?? K.width ?? S + over * 2;
  const riseEnd = K.sori * L;
  /* 反り増し.  A wooden myojin torii curves continuously; the 1646 stone one
   * is nearly flat until about a third out and then lifts sharply, and the
   * 島木 under it stays almost horizontal.  `sharp` selects between them. */
  const arcK = K.sharp
    ? (u) => riseEnd * Math.pow(Math.max(0, (u - 0.34) / 0.66), 1.55)
    : (u) => riseEnd * (0.55 * u * u + 0.45 * Math.pow(u, 4));
  const arcS = K.sharp ? (u) => arcK(u) * 0.16 : arcK;

  const stationsAt = (fn) => {
    const out = [];
    const NS = shinmei ? 2 : 15;
    for (let i = 0; i <= NS; i++) {
      const t = i / NS, u = t * 2 - 1;
      out.push({ x: u * (L / 2), y: fn(Math.abs(u)) });
    }
    return out;
  };

  if (shinmei) {
    // a round log, slightly tapered at the ends
    const g = new THREE.CylinderGeometry(kasagiH * 0.5, kasagiH * 0.56, L, 10);
    g.rotateZ(Math.PI / 2);
    g.translate(0, lintelBot + kasagiH * 0.5, 0);
    b.add(g, color, opts);
  } else {
    // 島木 -- the heavy board, deeper than the kasagi
    const sh = stationsAt(arcS).map((p) => ({ x: p.x, y: p.y + lintelBot + shimakiH / 2 }));
    b.add(
      barX(sh, rB * 1.42, shimakiH / 2, (t) => 1 - 0.09 * Math.pow(Math.abs(t * 2 - 1), 6)),
      o.shimakiColor ?? K.shimakiColor ?? color, opts
    );
    // 笠木 -- rides on it, a touch wider and thinner
    const kh = stationsAt(arcK).map((p) => ({
      x: p.x, y: p.y + lintelBot + shimakiH + kasagiH * 0.5,
    }));
    b.add(barX(kh, rB * 1.56, kasagiH * 0.5), color, opts);
    /* The 木口.  On the stone torii the ends are cut at an acute angle, which
     * is an early-Edo signature and reads clearly in silhouette; on a wooden
     * one the rake is slight. */
    const rake = stone ? 0.36 : 0.11;
    for (const sgn of [-1, 1]) {
      const g = new THREE.BoxGeometry(rB * (stone ? 0.55 : 0.30), (shimakiH + kasagiH) * 1.04, rB * 3.2);
      g.rotateZ(sgn * rake);
      g.translate(
        sgn * (L / 2 + rB * 0.10), lintelBot + arcK(1) * 0.9 + (shimakiH + kasagiH) * 0.5, 0
      );
      b.add(g, color, opts);
    }
    /* 五分割 -- the top assembly is five stones, so it carries four joints. */
    if (stone) {
      for (const u of [-0.62, -0.21, 0.21, 0.62]) {
        const px = u * (L / 2);
        const g = new THREE.BoxGeometry(0.035, (shimakiH + kasagiH) * 0.99, rB * 3.14);
        g.translate(px, lintelBot + arcS(Math.abs(u)) + (shimakiH + kasagiH) * 0.5, 0);
        b.add(g, PAL.stoneDark, O.stone);
      }
    }
  }

  /* --- the pillars ---------------------------------------------------- */
  const pillarH = lintelBot + shimakiH * 0.5 + 0.02;
  for (const s of [-1, 1]) {
    const g = new THREE.CylinderGeometry(rT, rB, pillarH, K.seg);
    g.translate(0, pillarH / 2, 0);
    g.rotateZ(s * theta);
    g.translate(s * (S / 2), 0, 0);
    b.add(g, color, opts);
    /* 上下二石 -- each pillar is two stones, and the joint shows. */
    if (K.joint) {
      const jy = pillarH * K.joint;
      const jr = lerp(rB, rT, K.joint) * 1.035;
      const j = new THREE.CylinderGeometry(jr, jr, 0.055, K.seg);
      j.translate(0, jy, 0);
      j.rotateZ(s * theta);
      j.translate(s * (S / 2), 0, 0);
      b.add(j, PAL.stoneDark, O.stone);
    }
    // 亀腹 / 藁座 -- the swollen foot
    const kb = lathe([
      [rB * 1.62, 0], [rB * 1.66, rB * 0.24], [rB * 1.48, rB * 0.52],
      [rB * 1.18, rB * 0.80], [rB * 1.03, rB * 0.94],
    ], K.seg);
    kb.translate(s * (S / 2), 0.01, 0);
    b.add(kb, stone ? PAL.stoneDark : PAL.stone, O.stone);
    // 台石 -- the footing block
    b.box(rB * 3.5, 0.24, rB * 3.5, s * (S / 2), -0.18, 0, PAL.stoneDark, O.stone);
  }

  /* --- 貫 the second rail, and the wedges ----------------------------- */
  const nukiY = lintelBot * (shinmei ? 0.30 : 0.335);
  const inset = nukiY * Math.tan(theta);
  const nukiHalf = S / 2 - inset;
  const nukiH = rB * (stone ? 1.05 : 1.20);
  const nukiD = rB * (stone ? 1.20 : 0.92);
  const proj = shinmei ? rB * 0.20 : rB * 2.35;
  b.bar(nukiHalf * 2 + proj * 2, nukiH, nukiD, 0, nukiY, 0, color, opts);
  if (!shinmei) {
    for (const s of [-1, 1]) {
      for (const t of [-1, 1]) {
        const g = new THREE.BoxGeometry(rB * 0.30, nukiH * 0.62, nukiD * 1.35);
        g.rotateZ(t * 0.06);
        g.translate(s * (nukiHalf + rB * 0.55), nukiY + t * nukiH * 0.30, 0);
        b.add(g, stone ? PAL.stoneDark : PAL.timberDark, stone ? O.stone : O.timber);
      }
    }
  }

  /* --- 額束 the tablet post ------------------------------------------- */
  let plaqueMesh = null;
  if (!shinmei) {
    const gzBot = nukiY + nukiH / 2;
    const gzH = lintelBot - gzBot;
    const gzW = clamp(S * 0.11, 0.30, 1.35);
    b.box(gzW, gzH + 0.02, nukiD * 1.05, 0, gzBot, 0, color, opts);
    if (o.plaque) {
      const tex = cached('plaque:' + o.plaque, () =>
        templePlaque(o.plaque, { frame: stone ? PAL.stoneDark : PAL.vermilionDeep, board: 0x2a231c }));
      const pw = Math.min(gzW * 2.35, S * 0.26);
      const ph = pw * 0.42;
      const geo = new THREE.PlaneGeometry(pw, ph);
      plaqueMesh = new THREE.Mesh(geo, celTex(tex, { bands: 3, tint: TINT.warm, side: THREE.DoubleSide }));
      const p = toWorld(x, z, ry, 0, -(nukiD * 0.55 + 0.03));
      plaqueMesh.position.set(p.x, y + gzBot + gzH * 0.52, p.z);
      plaqueMesh.rotation.y = ry + Math.PI;
      ctx.add(plaqueMesh);
    }
  }

  /* --- collision ------------------------------------------------------ */
  const half = rB * 1.35;
  const clear = S - half * 2;
  for (const s of [-1, 1]) {
    const p = toWorld(x, z, ry, s * (S / 2), 0);
    ctx.collideRot(p.x, p.z, half * 2, half * 2, ry, undefined, undefined);
  }
  if (clear < 1.8 && typeof console !== 'undefined') {
    console.warn(`[shrine] torii at ${x.toFixed(1)},${z.toFixed(1)} has only ${clear.toFixed(2)} m clear`);
  }

  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), x, y, z, ry);

  if (o.shimenawa) {
    const sp = toWorld(x, z, ry, 0, -(rB * 1.3));
    makeShimenawa(ctx, {
      x: sp.x, z: sp.z, ry, y: y + nukiY + nukiH * 0.30,
      span: nukiHalf * 2 * 0.92, radius: rB * 0.68,
      baker: o.baker, ...(typeof o.shimenawa === 'object' ? o.shimenawa : {}),
    });
  }

  return { kind, x, y, z, ry, height: H, span: S, width: L, clear, top: y + H, triangles: tris, plaque: plaqueMesh };
}

/* ------------------------------------------------------------------ *
 * 注連縄 -- the sacred rope.
 *
 * Thick twisted rice straw with 紙垂 (folded paper zigzags) hanging from it.
 * Built as three helical strands round a sagging axis, because a plain
 * cylinder with a straw colour reads as a pipe: the whole character of the
 * object is the twist, and it is only ~700 triangles to have it.
 * ------------------------------------------------------------------ */
export function makeShimenawa(ctx, o = {}) {
  const { x, z, ry = 0 } = o;
  const y = o.y ?? ctx.groundAt(x, z) + 3.0;
  const span = o.span ?? 3.4;
  const R = o.radius ?? clamp(span * 0.055, 0.07, 0.34);
  const sag = o.sag ?? span * 0.055;
  const strands = o.strands ?? 3;
  const twists = o.twists ?? Math.max(3, Math.round(span * 1.5));
  const b = bag();

  const pts = [];
  const NP = 9;
  for (let i = 0; i <= NP; i++) {
    const t = i / NP;
    pts.push(new THREE.Vector3(lerp(-span / 2, span / 2, t), -Math.sin(Math.PI * t) * sag, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const rad = (t) => R * (0.42 + 0.58 * Math.pow(Math.sin(Math.PI * t), 0.55));

  const tub = Math.max(18, Math.round(span * 8));
  const frames = curve.computeFrenetFrames(tub, false);
  for (let s = 0; s < strands; s++) {
    const pos = [], idx = [];
    const radial = 5;
    for (let i = 0; i <= tub; i++) {
      const t = i / tub;
      const P = curve.getPointAt(t);
      const N = frames.normals[i], B = frames.binormals[i];
      const Rr = rad(t);
      const off = Rr * 0.50, sr = Rr * 0.60;
      const a = (t * twists + s / strands) * Math.PI * 2;
      const cx = Math.cos(a) * off, cy = Math.sin(a) * off;
      for (let j = 0; j < radial; j++) {
        const bb = (j / radial) * Math.PI * 2;
        const px = cx + Math.cos(bb) * sr, py = cy + Math.sin(bb) * sr;
        pos.push(P.x + N.x * px + B.x * py, P.y + N.y * px + B.y * py, P.z + N.z * px + B.z * py);
      }
    }
    for (let i = 0; i < tub; i++) {
      for (let j = 0; j < radial; j++) {
        const a = i * radial + j, bb = i * radial + ((j + 1) % radial);
        const c = (i + 1) * radial + j, d = (i + 1) * radial + ((j + 1) % radial);
        idx.push(a, bb, c, bb, d, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    b.add(g, PAL.kaya, O.timber);
  }

  /* 紙垂 -- four folded lobes, alternating, and the straw tassels between. */
  const nShide = o.shide ?? Math.max(2, Math.round(span / 1.15));
  const sw = clamp(R * 1.5, 0.10, 0.26), sh = sw * 1.05, st = 0.008;
  for (let i = 0; i < nShide; i++) {
    const t = (i + 0.5) / nShide;
    const P = curve.getPointAt(t);
    for (let k = 0; k < 4; k++) {
      const sgn = k % 2 ? 1 : -1;
      const g = new THREE.BoxGeometry(sw, sh, st);
      g.rotateY(sgn * 0.38);
      g.translate(P.x + sgn * sw * 0.24, P.y - rad(t) - sh * (k + 0.5) * 0.90, P.z + sgn * sw * 0.10);
      b.add(g, PAL.paper, O.paper);
    }
    // 〆の子 -- the straw tassel
    if (o.tassels !== false && i < nShide - 1) {
      const t2 = (i + 1) / nShide;
      const P2 = curve.getPointAt(t2);
      const tl = rad(t2) * 3.4;
      const g = new THREE.CylinderGeometry(rad(t2) * 0.10, rad(t2) * 0.42, tl, 6);
      g.translate(P2.x, P2.y - rad(t2) - tl / 2, P2.z);
      b.add(g, PAL.kaya, O.timber);
    }
  }

  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), x, y, z, ry);
  return { x, y, z, ry, span, radius: R, triangles: tris };
}

/* ------------------------------------------------------------------ *
 * 賽銭箱 -- the offertory box.
 *
 * A flared chest with a slatted top over a dark void.  The slats are the whole
 * object and they are built OUTWARD: the carcass stops below the rim, the
 * interior is a dark box, and the battens are laid across the gap.  Modelled as
 * a solid with a texture it reads as a crate.
 * ------------------------------------------------------------------ */
export function makeSaisenbako(ctx, o = {}) {
  const { x, z, ry = 0 } = o;
  const y = o.y ?? ctx.groundAt(x, z);
  const w = o.w ?? 2.60, d = o.d ?? 1.05, h = o.h ?? 0.82;
  const b = bag();

  // feet and carcass
  for (const sx of [-1, 1]) b.box(w * 0.10, 0.12, d * 0.92, sx * (w / 2 - w * 0.06), 0, 0, PAL.timberDark, O.timber);
  const body = taperBox(w * 0.94, d * 0.90, h - 0.24, 1.075, 1.075);
  body.translate(0, 0.12, 0);
  b.add(body, PAL.timber, O.timber);
  // the dark inside, seen between the slats
  b.box(w * 0.92, 0.30, d * 0.86, 0, h - 0.46, 0, PAL.shopInterior, O.deep);
  // rim
  b.bar(w, 0.11, d, 0, h - 0.055, 0, PAL.timberDark, O.timber);
  for (const sz of [-1, 1]) b.bar(w, 0.10, 0.10, 0, h - 0.11, sz * (d / 2 - 0.05), PAL.timberDark, O.timber);
  for (const sx of [-1, 1]) b.bar(0.10, 0.10, d, sx * (w / 2 - 0.05), h - 0.11, 0, PAL.timberDark, O.timber);
  // 格子 the slats
  const n = o.slats ?? Math.max(9, Math.round(w / 0.20));
  for (let i = 0; i <= n; i++) {
    const px = -w / 2 + 0.13 + (i / n) * (w - 0.26);
    const g = new THREE.CylinderGeometry(0.032, 0.032, d - 0.14, 6);
    g.rotateX(Math.PI / 2);
    g.translate(px, h - 0.085, 0);
    b.add(g, PAL.timberDark, O.timber);
  }
  // black-iron corner straps
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.box(0.055, h - 0.20, 0.10, sx * (w / 2 - 0.03), 0.13, sz * (d / 2 - 0.06), PAL.iron, O.metal);
    }
  }
  b.bar(w * 0.30, 0.055, 0.02, 0, h * 0.46, -d / 2 - 0.012, PAL.gateGold, O.metal);

  ctx.collideRot(x, z, w, d, ry, y + h);
  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), x, y, z, ry);
  return { x, y, z, ry, w, d, h, top: y + h, triangles: tris };
}

/* ------------------------------------------------------------------ *
 * 楼門 -- the two-storey gate.
 *
 * A 楼門 is not a 二重門: it has TWO STOREYS and ONE ROOF, with a balustraded
 * balcony (縁 + 高欄) running round the top of the lower storey where the
 * second roof would be on a 二重門.  Both of Yasaka's gates are
 * 「三間一戸楼門」 -- three bays wide, one doorway, and you walk through the
 * middle one.
 *
 * The two are NOT the same building and must not be built from one template:
 *
 *   西楼門  切妻造、本瓦葺   1497   gabled, silver-grey formal TILE, 9.1 m,
 *                                  7.9 m frontage, 緑青 GREEN lattice, and
 *                                  two dog-legged 翼廊 wings (1925)
 *   南楼門  入母屋造、銅板葺  1879   hip-and-gable, patinated COPPER, ~14 m,
 *                                  9 m wide, with 東西廻廊 corridors attached
 *
 * The side bays are built OUTWARD, per KIT.md s10: the infill plane stops
 * 0.30 m back from the column centre line so the columns stand proud of it and
 * the 連子窓 has a real recess behind it.  A gate modelled as a box with a
 * lattice texture on it has no depth at any angle but dead ahead.
 * ------------------------------------------------------------------ */

/**
 * 連子窓 -- vertical battens over a recess.  Built outward, always.
 *
 * The recess is `timberDark` on a normal ramp rather than `shopInterior` on a
 * deep one: a shop interior wants to read as a black slot, but a lattice on a
 * gate wants to read as a *lattice*, and against a genuinely black ground the
 * green battens disappear and the whole bay goes to a dark band.
 */
function renjiWindow(b, { w, h, x, y, z, depth = 0.26, color, pitch = 0.16, thick = 0.06,
                          recess = PAL.timberDark }) {
  b.box(w, h, 0.06, x, y, z + depth, recess, { bands: 3, tint: TINT.warm });
  const n = Math.max(2, Math.round(w / pitch));
  for (let i = 0; i <= n; i++) {
    const px = x - w / 2 + (i / n) * w;
    b.box(thick, h, thick * 1.6, px, y, z, color, O.verm);
  }
  b.bar(w + 0.10, 0.11, 0.13, x, y + h, z, color, O.verm);
  b.bar(w + 0.10, 0.11, 0.13, x, y, z, color, O.verm);
}

/** The same window as a loose `parts` array, so a caller can turn it. */
function renjiParts(opts) {
  const t = bag();
  renjiWindow(t, opts);
  return t.list.splice(0);
}

/**
 * Copper roofs come out of `roof.js` on a 4-band cool ramp, which on 緑青 puts
 * the shadow side into a near-navy that reads as slate, not as patina.  The
 * palette's rule is that a roof stays lighter than the timber under it, so the
 * copper surfaces get the high-key ramp and a blue-green shadow instead.
 */
function patinate(parts) {
  for (const p of parts) {
    if (p.color === PAL.copper || p.color === PAL.copperDark) {
      p.opts = { bands: 'soft3', tint: TINT.green };
    }
  }
  return parts;
}

/** A 隨身 in a niche: a silhouette on a plinth, in the dark.  Nothing more. */
function guardian(b, { x, y, z, s = 1, seed = 1 }) {
  const r = rngKit(seed);
  const c = PAL.timberDark;
  b.box(0.62, 0.16, 0.52, x, y, z, PAL.stoneDark, O.stone);
  const torso = taperBox(0.54, 0.44, 0.66, 0.82);
  torso.translate(x, y + 0.16, z);
  b.add(torso, c, O.deep);
  b.box(0.40, 0.34, 0.32, x, y + 0.82, z, c, O.deep);
  b.cyl(0.13, 0.12, 0.20, x, y + 1.16, z, 8, c, O.deep);
  b.box(0.34, 0.10, 0.30, x, y + 1.36, z, c, O.deep);           // 冠
  b.box(0.055, 0.86, 0.055, x + s * 0.30, y + 0.20, z - 0.10, PAL.timberWarm, O.timber);  // 弓
  return r;
}

export function makeRomon(ctx, o = {}) {
  const kind = o.kind || 'west';
  const S = { ...(kind === 'south' ? SPEC.southRomon : SPEC.westRomon), ...(o.spec || {}) };
  const x = o.x, z = o.z;
  const ry = o.ry ?? (kind === 'south' ? Math.PI : Math.PI / 2);   // south faces S, west faces W
  const W = S.wall, D = S.deep, E = S.eave;
  const st = seat(ctx, x, z, S.w, S.d, ry);
  const y = o.y ?? st.lo;
  const podium = o.podium ?? Math.max(0.35, st.rise + 0.30);
  const b = bag();

  const colR = o.colR ?? S.bay / 8.5;
  const bayW = S.bay;
  const colX = [-1.5, -0.5, 0.5, 1.5].map((k) => k * bayW);        // 4 columns, 3 bays
  const rowsZ = [-D / 2, 0, D / 2];                                // 梁間二間 -> 3 rows
  const deckOut = o.deckOut ?? 0.60;

  /* The elevation.
   *
   * Ridge height and plan are MEASURED (9.1 m / 7.9 x 5.2 for the west gate);
   * how the height below the roof divides between the two storeys is not --
   * ARCH.md s4.1 flags its 5.5 / 7.4 m eave heights `[UNKNOWN -- suggested]`.
   * Those suggestions imply a 1.7 m roof rise over a 4.5 m half-span, i.e. a
   * 21 deg roof, which is too flat for 本瓦葺 and reads wrong.  So: take the
   * measured ridge and plan literally, give the roof the pitch its material
   * wants, and split what is left 63/37 about the balcony, which is the
   * proportion a 楼門 actually has. */
  const roofRise = (() => {
    if (S.roof === 'gable') {
      return ((D + 2 * E) / 2) * S.pitch + 0.075 * (S.ridgeCourses || 3) + 0.14;
    }
    const rise = (Math.min(W + 2 * E, D + 2 * E) / 2) * S.pitch;
    const gd = D * 0.40;
    return rise * 0.52 + ((gd + 2 * E * 0.42) / 2) * S.pitch * 1.06 + 0.30;
  })();
  const eaveY = o.eaveY ?? (S.height - roofRise);
  const deckTop = podium + (eaveY - podium) * (o.deckFrac ?? 0.63);
  const deckY = deckTop - podium;

  /* --- 基壇 the stylobate --------------------------------------------- */
  {
    const pw = W + 1.5, pd = D + 1.5;
    const g = taperBox(pw, pd, podium - 0.10, 0.975, 0.975);
    b.add(g, PAL.stoneWall, O.stone);
    b.bar(pw + 0.16, 0.11, pd + 0.16, 0, podium - 0.045, 0, PAL.paving, O.stone);
  }

  /* --- lower storey ---------------------------------------------------- */
  for (const cz of rowsZ) {
    for (const cx of colX) {
      b.lathe([[colR * 1.55, 0], [colR * 1.6, 0.06], [colR * 1.42, 0.16], [colR * 1.2, 0.2]],
        10, cx, podium, cz, PAL.stoneDark, O.stone);
      b.cyl(colR, colR * 0.93, deckY - 0.20, cx, podium + 0.20, cz, 12, PAL.vermilion, O.verm);
      // black-iron collars top and bottom
      b.cyl(colR * 1.06, colR * 1.06, 0.10, cx, podium + 0.22, cz, 12, PAL.iron, O.metal);
      b.cyl(colR * 1.0, colR * 1.0, 0.09, cx, podium + deckY - 0.42, cz, 12, PAL.iron, O.metal);
    }
  }
  // 頭貫 + 台輪 -- the tie beams round the head of the lower storey
  const headY = podium + deckY - 0.34;
  for (const cz of rowsZ) b.bar(W + colR * 2, 0.26, colR * 1.5, 0, headY, cz, PAL.vermilion, O.verm);
  for (const cx of colX) b.bar(colR * 1.5, 0.26, D + colR * 2, cx, headY, 0, PAL.vermilion, O.verm);
  b.bar(W + colR * 2.6, 0.14, D + colR * 2.6, 0, headY + 0.20, 0, PAL.vermilion, O.verm);
  /* 冠木 -- the heavy lintel over the doorway, sitting high in the opening.
   * Hung at mid-height with nothing above it, a lintel on two columns reads as
   * a torii standing inside the gate. */
  for (const cz of [-D / 2, D / 2]) {
    b.bar(bayW + colR * 3.4, 0.42, colR * 2.2, 0, podium + deckY * 0.80, cz, PAL.vermilion, O.verm);
    const kg = prism([[-0.46, 0], [0.46, 0], [0.20, 0.48], [-0.20, 0.48]], colR * 1.4);
    kg.translate(0, podium + deckY * 0.80 + 0.21, cz);
    b.add(kg, PAL.timberWarm, O.timber);
  }

  /* --- the side bays, built outward ------------------------------------ */
  const inset = 0.30;
  for (const sx of [-1, 1]) {
    const cx = sx * (bayW);                              // centre of the side bay
    for (const [cz, zs] of [[-D / 2, 1], [D / 2, -1]]) {
      const zz = cz + zs * inset;
      /* 朱 timber, white plaster, 緑青 lattice -- ARCH.md s4.1 is explicit that
       * the lattice is verdigris GREEN and calls painting it red the most
       * commonly botched detail on this building. */
      const sill = podium + deckY * 0.40;
      const lat = deckY * 0.30;
      b.box(bayW - colR, deckY - 0.34 - (sill - podium) - lat, colR * 0.5,
        cx, sill + lat, zz, PAL.gatePanel, O.plaster);
      b.box(bayW - colR, sill - podium, colR * 0.5, cx, podium, zz, PAL.gatePanel, O.plaster);
      renjiWindow(b, {
        w: bayW - colR * 1.2, h: lat, x: cx, y: sill, z: zz,
        depth: zs * 0.22, color: S.lattice,
      });
      // 長押 -- the horizontal rails that stop the plaster reading as one slab
      for (const ny of [podium + deckY * 0.16, sill + lat + deckY * 0.10]) {
        b.bar(bayW + colR, 0.15, colR * 0.9, cx, ny, cz + zs * 0.18, PAL.vermilion, O.verm);
      }
    }
    // the guardian, seen through the front lattice
    if (o.guardians !== false) {
      guardian(b, { x: sx * bayW, y: podium + 0.10, z: -D / 2 + 0.62, s: sx, seed: seedOf(x, z, sx) });
    }
    // and the closed cross-walls at the ends of the gate
    b.box(colR * 0.6, deckY - 0.34, D - colR, sx * (W / 2), podium, 0, PAL.gatePanel, O.plaster);
  }

  /* --- 腰組 the brackets under the balcony, and the deck ---------------- */
  const kBy = deckTop - 0.74, kSc = colR * 2.5;
  for (const cx of colX) {
    b.push(brackets({ x: cx, y: kBy, z: D / 2, steps: 1, scale: kSc }));
    b.push(rotParts(brackets({ x: cx, y: kBy, z: D / 2, steps: 1, scale: kSc }), Math.PI));
  }
  for (const cz of rowsZ) {
    b.push(rotParts(brackets({ x: cz, y: kBy, z: W / 2, steps: 1, scale: kSc }), Math.PI / 2));
    b.push(rotParts(brackets({ x: cz, y: kBy, z: W / 2, steps: 1, scale: kSc }), -Math.PI / 2));
  }
  const dw = W + deckOut * 2, dd = D + deckOut * 2;
  b.bar(dw, 0.16, dd, 0, deckTop - 0.08, 0, PAL.timberDark, O.timber);
  b.bar(dw + 0.08, 0.11, dd + 0.08, 0, deckTop + 0.03, 0, PAL.timberWarm, O.timber);

  /* --- 高欄 the balustrade --------------------------------------------- */
  {
    const railH = 0.86, hw = dw / 2 + 0.04, hd = dd / 2 + 0.04;
    const runs = [
      { a: [-hw, -hd], c: [hw, -hd] }, { a: [-hw, hd], c: [hw, hd] },
      { a: [-hw, -hd], c: [-hw, hd] }, { a: [hw, -hd], c: [hw, hd] },
    ];
    for (const r of runs) {
      const len = Math.hypot(r.c[0] - r.a[0], r.c[1] - r.a[1]);
      const n = Math.max(3, Math.round(len / 0.78));
      const alongX = Math.abs(r.c[0] - r.a[0]) > 0.01;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const px = lerp(r.a[0], r.c[0], t), pz = lerp(r.a[1], r.c[1], t);
        b.box(0.10, railH, 0.10, px, deckTop + 0.08, pz, PAL.vermilion, O.verm);
        if (i === 0 || i === n) {  // 擬宝珠
          b.lathe([[0.055, 0], [0.075, 0.03], [0.06, 0.07], [0.085, 0.10],
                   [0.075, 0.17], [0.045, 0.22], [0, 0.25]], 8,
            px, deckTop + 0.08 + railH, pz, PAL.gateGold, O.metal);
        }
      }
      const mx = (r.a[0] + r.c[0]) / 2, mz = (r.a[1] + r.c[1]) / 2;
      for (const hy of [railH * 0.42, railH]) {
        b.bar(alongX ? len : 0.09, 0.09, alongX ? 0.09 : len,
          mx, deckTop + 0.08 + hy, mz, PAL.vermilion, O.verm);
      }
    }
  }

  /* --- upper storey ----------------------------------------------------- */
  const upBase = deckTop + 0.08;
  const upH = Math.max(1.05, eaveY - upBase - 0.44);
  const ucolR = colR * 0.86;
  const upX = colX.map((v) => v * 0.94);
  const upZ = [-D / 2 * 0.94, D / 2 * 0.94];
  for (const cz of upZ) {
    for (const cx of upX) b.cyl(ucolR, ucolR * 0.94, upH, cx, upBase, cz, 10, PAL.vermilion, O.verm);
  }
  // walls: plaster panels with green lattice windows, doors on the front bay
  for (const sx of [-1, 1]) {
    for (const [cz, zs] of [[upZ[0], 1], [upZ[1], -1]]) {
      const cx = sx * bayW * 0.94;
      b.box(bayW * 0.94 - ucolR, upH, ucolR * 0.5, cx, upBase, cz + zs * 0.22, PAL.gatePanel, O.plaster);
      renjiWindow(b, {
        w: bayW * 0.62, h: upH * 0.52, x: cx, y: upBase + upH * 0.30, z: cz + zs * 0.20,
        depth: zs * 0.18, color: S.lattice, pitch: 0.12, thick: 0.042,
      });
    }
    b.box(ucolR * 0.55, upH, D * 0.94 - ucolR, sx * (W / 2) * 0.94, upBase, 0, PAL.gatePanel, O.plaster);
  }
  // 板唐戸 -- the plank doors in the middle bay, with iron studs
  for (const [cz, zs] of [[upZ[0], -1], [upZ[1], 1]]) {
    for (const sx of [-1, 1]) {
      b.box(bayW * 0.46, upH * 0.94, 0.09, sx * bayW * 0.245, upBase, cz + zs * 0.10, PAL.vermilion, O.verm);
      for (let r = 0; r < 4; r++) {
        for (let c2 = 0; c2 < 2; c2++) {
          b.cyl(0.035, 0.035, 0.03, sx * bayW * 0.245 + (c2 - 0.5) * bayW * 0.22,
            upBase + upH * (0.22 + r * 0.20), cz + zs * 0.155, 6, PAL.iron, O.metal);
        }
      }
    }
  }
  // 頭貫 / 台輪 and the bracket complex that carries the roof
  b.bar(W * 0.94 + ucolR * 2, 0.24, D * 0.94 + ucolR * 2, 0, upBase + upH + 0.12, 0, PAL.vermilion, O.verm);
  b.bar(W * 0.94 + ucolR * 3, 0.13, D * 0.94 + ucolR * 3, 0, upBase + upH + 0.30, 0, PAL.vermilion, O.verm);
  const bY = upBase + upH + 0.36;
  const bScale = colR * 2.4;
  const bXs = [...upX];
  for (let i = 0; i < upX.length - 1; i++) bXs.push((upX[i] + upX[i + 1]) / 2);
  const bZ = D / 2 * 0.94;
  for (const cx of bXs) {
    b.push(brackets({ x: cx, y: bY, z: bZ, steps: 2, scale: bScale }));
    b.push(rotParts(brackets({ x: cx, y: bY, z: bZ, steps: 2, scale: bScale }), Math.PI));
  }
  const bWx = W / 2 * 0.94;
  for (const cz of [-bZ * 0.62, 0, bZ * 0.62]) {
    b.push(rotParts(brackets({ x: cz, y: bY, z: bWx, steps: 2, scale: bScale }), Math.PI / 2));
    b.push(rotParts(brackets({ x: cz, y: bY, z: bWx, steps: 2, scale: bScale }), -Math.PI / 2));
  }

  /* --- rafters and the roof --------------------------------------------- */
  const rafterY = eaveY - 0.14;
  const rf = (w2, z2) => rafters({
    w: w2, depth: E + 0.18, y: rafterY, z: z2, double: true, pitch: 0.34,
  });
  b.push(rf(W + E * 1.5, D / 2 - 0.10));
  b.push(rotParts(rf(W + E * 1.5, D / 2 - 0.10), Math.PI));
  b.push(rotParts(rf(D + E * 1.5, W / 2 - 0.10), Math.PI / 2));
  b.push(rotParts(rf(D + E * 1.5, W / 2 - 0.10), -Math.PI / 2));

  let roof;
  if (S.roof === 'gable') {
    roof = gableRoof({
      w: W, d: D, pitch: S.pitch, eave: E, material: S.material,
      mukuri: 0, sori: S.sori, cornerLift: S.cornerLift, ridgeCourses: S.ridgeCourses,
      y: eaveY, ry: 0, ridgeAlongX: true, gableEnd: true,
    });
    b.push(roof.parts);
    for (const sx of [-1, 1]) {
      b.push(gyo({ w: 0.66, h: 0.86, y: roof.ridgeY - 0.62, z: 0, ry: sx * Math.PI / 2 })
        .map((p) => { p.geometry.translate(sx * (W / 2 + E - 0.08), 0, 0); return p; }));
    }
  } else {
    roof = irimoyaRoof({
      w: W, d: D, pitch: S.pitch, eave: E, material: S.material,
      sori: S.sori, cornerLift: S.cornerLift, ridgeCourses: S.ridgeCourses,
      gableFrac: 0.40, y: eaveY, ry: 0, gableFace: 'x',
    });
    b.push(patinate(roof.parts));
    // a copper roof gets no tile ridge, so it gets a boxed 箱棟 instead
    b.bar(W * 0.44, 0.34, 0.52, 0, roof.ridgeY + 0.10, 0, PAL.copperDark, { bands: 'soft3', tint: TINT.green });
  }

  /* --- the plaque -------------------------------------------------------- */
  let plaque = null;
  if (o.plaque) {
    const tex = cached('plaque:' + o.plaque, () => templePlaque(o.plaque));
    const pw = bayW * 0.86, ph = pw * 0.40;
    plaque = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph),
      celTex(tex, { bands: 3, tint: TINT.warm, side: THREE.DoubleSide }));
    const p = toWorld(x, z, ry, 0, -(D / 2 * 0.94 + 0.30));
    plaque.position.set(p.x, y + upBase + upH * 0.72, p.z);
    plaque.rotation.y = ry + Math.PI;
    ctx.add(plaque);
  }

  /* --- 翼廊 / 廻廊 the attached wings ------------------------------------ */
  const wings = [];
  if (o.wings !== false && (S.wing || S.corridor)) {
    if (S.wing) {
      /* 「桁行折曲がり延長五間、梁間一間」 -- the wing DOG-LEGS.  Three bays run
       * out along the frontage, then it turns and two run back.  Straight
       * wings are the commonest massing error on this gate. */
      const legA = 3 * S.wing.bay, legB = 2 * S.wing.bay, wd = S.wing.depth;
      for (const sx of [-1, 1]) {
        const x0 = sx * (W / 2 + 0.9);
        wings.push({ run: [[x0, -D / 2 + wd / 2], [x0 + sx * legA, -D / 2 + wd / 2]], depth: wd, along: 'x' });
        wings.push({ run: [[x0 + sx * (legA - wd / 2), -D / 2 + wd / 2], [x0 + sx * (legA - wd / 2), -D / 2 + wd / 2 + legB]], depth: wd, along: 'z' });
      }
    } else {
      const cl = S.corridor.length, wd = S.corridor.depth;
      for (const sx of [-1, 1]) {
        const x0 = sx * (W / 2 + 0.7);
        wings.push({ run: [[x0, 0], [x0 + sx * cl, 0]], depth: wd, along: 'x' });
      }
    }
    const wh = (S.wing || S.corridor).height;
    const wbay = S.wing ? S.wing.bay : 3.0;
    for (const wgn of wings) {
      const [a, c] = wgn.run;
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const cx = (a[0] + c[0]) / 2, cz = (a[1] + c[1]) / 2;
      const alongX = wgn.along === 'x';
      const ww = alongX ? len : wgn.depth;      // local X extent
      const wdd = alongX ? wgn.depth : len;     // local Z extent
      const wallH = wh * 0.62, eaveH = wh * 0.70;
      const face = alongX ? wdd / 2 : ww / 2;   // half-thickness on the outward side

      b.box(ww + 0.45, 0.42, wdd + 0.45, cx, 0, cz, PAL.stoneWall, O.stone);
      b.bar(ww + 0.6, 0.10, wdd + 0.6, cx, 0.47, cz, PAL.paving, O.stone);
      // posts at one bay, standing PROUD of a thin infill panel -- the panel is
      // 0.26 m thick and set on the centre line, so the posts read
      const n = Math.max(2, Math.round(len / wbay));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const px = lerp(a[0], c[0], t), pz = lerp(a[1], c[1], t);
        for (const sgn of [-1, 1]) {
          b.box(0.22, wallH, 0.22, alongX ? px : px + sgn * face * 0.86,
            0.42, alongX ? pz + sgn * face * 0.86 : pz, PAL.vermilion, O.verm);
        }
      }
      b.box(ww - 0.1, wallH * 0.96, wdd - 0.1, cx, 0.42, cz, PAL.gatePanel, O.plaster);
      for (const sgn of [-1, 1]) {
        b.bar(alongX ? ww + 0.3 : 0.15, 0.15, alongX ? 0.15 : wdd + 0.3,
          alongX ? cx : cx + sgn * face, 0.42 + wallH * 0.30,
          alongX ? cz + sgn * face : cz, PAL.vermilion, O.verm);
        /* Built at the origin facing +Z, then turned onto whichever face this
         * is: the run is along local X, so it has to rotate with the leg. */
        const rp = renjiParts({
          w: len - 0.5, h: wallH * 0.34, x: 0, y: 0.42 + wallH * 0.50, z: 0,
          depth: -0.20, color: S.lattice, pitch: 0.17, thick: 0.055,
        });
        const rr = alongX ? (sgn > 0 ? 0 : Math.PI) : sgn * Math.PI / 2;
        b.push(rotParts(rp, rr,
          alongX ? cx : cx + sgn * face,
          alongX ? cz + sgn * face : cz));
      }
      /* Head beam and the tiled gable roof.  The roof is always generated with
       * its ridge along X and then turned: `gableRoof`'s `ridgeAlongX: false`
       * path rotates the 破風 boards twice and leaves them flying loose. */
      b.bar(ww + 0.4, 0.20, wdd + 0.4, cx, 0.42 + wallH, cz, PAL.vermilion, O.verm);
      const wr = gableRoof({
        w: len, d: wgn.depth, pitch: 0.44, eave: 0.80, material: S.material,
        mukuri: 0, sori: 0.05, cornerLift: 0, ridgeCourses: 3,
        y: 0.42 + eaveH, ry: 0, ridgeAlongX: true, gableEnd: true,
      });
      b.push(patinate(rotParts(wr.parts, alongX ? 0 : Math.PI / 2, cx, cz)));
      const wp = toWorld(x, z, ry, cx, cz);
      ctx.collideRot(wp.x, wp.z, ww, wdd, ry, undefined, undefined);
    }
  }

  /* --- collision -------------------------------------------------------- */
  // the two side masses only; the middle bay is the doorway and stays open
  const sideW = (W - bayW) / 2;
  for (const sx of [-1, 1]) {
    const p = toWorld(x, z, ry, sx * (bayW / 2 + sideW / 2), 0);
    ctx.collideRot(p.x, p.z, sideW, D + 0.6, ry, undefined, undefined);
  }
  if (o.platform !== false) {
    const p0 = toWorld(x, z, ry, -(W / 2 + 0.7), -(D / 2 + 0.7));
    const p1 = toWorld(x, z, ry, W / 2 + 0.7, D / 2 + 0.7);
    ctx.platform({
      x0: Math.min(p0.x, p1.x), x1: Math.max(p0.x, p1.x),
      z0: Math.min(p0.z, p1.z), z1: Math.max(p0.z, p1.z),
      top: y + podium, step: 0.5,
    });
  }

  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), x, y, z, ry);
  return {
    kind, x, y, z, ry, w: S.w, d: S.d, wall: W, deep: D,
    podium, deckTop: y + deckTop, eaveY: y + eaveY, ridgeY: y + roof.ridgeY,
    clear: bayW, triangles: tris, plaque, wings: wings.length,
  };
}

/* ------------------------------------------------------------------ *
 * 舞殿 -- the dance stage, and its lanterns.
 *
 * 「桁行三間、梁間三間、入母屋造、銅板葺」 (1903, ICP 2020).  A three-by-three
 * bay open pavilion under a patinated COPPER hip-and-gable roof -- not tile and
 * not bark, which matters because the copper is the one cool-green mass in a
 * precinct otherwise made of vermilion, grey tile and brown bark.
 *
 * The identifying feature is the lanterns: white 長型 paper lanterns hung
 * ぐるりと -- continuously round all four sides in an upper and a lower row --
 * each bearing a donor's name in black, mostly Gion ochaya and okiya (富美代,
 * 近善, 辻留, 八百三 ...), with red hoops top and bottom.  ARCH.md s4.4 derives
 * ~126 per tier from the 50.4 m eaves perimeter at 0.40 m centres, so ~250.
 *
 * They are ONE InstancedMesh: one geometry, one texture, one draw call, with a
 * per-instance colour jitter so a batch of 250 does not look stamped, and a
 * handle so they light at dusk.
 * ------------------------------------------------------------------ */

export function makeMaiden(ctx, o = {}) {
  const S = { ...SPEC.maiden, ...(o.spec || {}) };
  const x = o.x, z = o.z, ry = o.ry ?? 0;
  const st = seat(ctx, x, z, S.w, S.d, ry);
  const y = o.y ?? st.lo;
  const base = Math.max(S.base, st.rise + 0.30);
  const W = S.wall, D = S.deep, E = S.eave;
  const b = bag();

  /* --- 基壇 and deck --------------------------------------------------- */
  b.add(taperBox(W + 1.3, D + 1.3, base - 0.12, 0.972, 0.972), PAL.stoneWall, O.stone);
  b.bar(W + 1.5, 0.12, D + 1.5, 0, base - 0.06, 0, PAL.paving, O.stone);
  const deck = base + 0.22;
  b.bar(W + 0.5, 0.22, D + 0.5, 0, base + 0.11, 0, PAL.timberWarm, O.timber);
  b.bar(W + 0.62, 0.09, D + 0.62, 0, deck + 0.04, 0, PAL.timberPale, O.timber);

  /* --- 16 posts on a 3 x 3 bay grid ------------------------------------ */
  const bx = W / 3, bz = D / 3;
  const colR = o.colR ?? 0.245;
  const gx = [-1.5, -0.5, 0.5, 1.5].map((k) => k * bx);
  const gz = [-1.5, -0.5, 0.5, 1.5].map((k) => k * bz);
  const post = S.post;
  for (const cx of gx) {
    for (const cz of gz) {
      const edge = Math.abs(cx) > bx || Math.abs(cz) > bz;
      const r = edge ? colR : colR * 0.86;
      b.lathe([[r * 1.5, 0], [r * 1.55, 0.05], [r * 1.3, 0.13]], 10, cx, deck, cz, PAL.stoneDark, O.stone);
      b.cyl(r, r * 0.94, post, cx, deck + 0.10, cz, 12, PAL.vermilion, O.verm);
    }
  }
  // 頭貫 / 台輪 round the head of the posts
  const headY = deck + 0.10 + post - 0.30;
  for (const cz of [gz[0], gz[3]]) b.bar(W + colR * 2, 0.24, colR * 1.5, 0, headY, cz, PAL.vermilion, O.verm);
  for (const cx of [gx[0], gx[3]]) b.bar(colR * 1.5, 0.24, D + colR * 2, cx, headY, 0, PAL.vermilion, O.verm);
  b.bar(W + colR * 3, 0.13, D + colR * 3, 0, headY + 0.19, 0, PAL.vermilion, O.verm);
  // 蟇股 -- the frog-leg struts sitting on the head beam between the posts
  for (const cz of [gz[0], gz[3]]) {
    for (let i = 0; i < 3; i++) {
      const px = (gx[i] + gx[i + 1]) / 2;
      const kg = prism([[-0.42, 0], [0.42, 0], [0.20, 0.44], [-0.20, 0.44]], 0.13);
      kg.translate(px, headY + 0.26, cz);
      b.add(kg, PAL.timberWarm, O.timber);
    }
  }
  // the enclosed core -- the Maiden is open-sided but its middle bay is not
  b.box(bx * 2 - 0.3, post * 0.62, bz * 2 - 0.3, 0, deck + 0.10, 0, PAL.gatePanel, O.plaster);
  b.bar(bx * 2, 0.14, bz * 2, 0, deck + 0.10 + post * 0.62, 0, PAL.timberDark, O.timber);

  /* --- 高欄 and the 木階 ------------------------------------------------ */
  {
    const hw = W / 2 + 0.25, hd = D / 2 + 0.25, railH = 0.80;
    const runs = [[[-hw, -hd], [hw, -hd]], [[-hw, hd], [hw, hd]],
                  [[-hw, -hd], [-hw, hd]], [[hw, -hd], [hw, hd]]];
    for (const [a, c] of runs) {
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const alongX = Math.abs(c[0] - a[0]) > 0.01;
      const n = Math.max(3, Math.round(len / 0.82));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const px = lerp(a[0], c[0], t), pz = lerp(a[1], c[1], t);
        if (alongX && Math.abs(px) < bx * 0.55 && pz < 0) continue;   // the stair opening
        b.box(0.09, railH, 0.09, px, deck + 0.06, pz, PAL.vermilion, O.verm);
        if (i === 0 || i === n) {
          b.lathe([[0.05, 0], [0.07, 0.03], [0.055, 0.065], [0.078, 0.095],
                   [0.068, 0.155], [0.04, 0.20], [0, 0.23]], 8,
            px, deck + 0.06 + railH, pz, PAL.gateGold, O.metal);
        }
      }
      for (const hy of [railH * 0.44, railH]) {
        b.bar(alongX ? len : 0.085, 0.085, alongX ? 0.085 : len,
          (a[0] + c[0]) / 2, deck + 0.06 + hy, (a[1] + c[1]) / 2, PAL.vermilion, O.verm);
      }
    }
    // the stair down to the gravel on the south face
    const steps = Math.max(2, Math.round(deck / 0.20));
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      b.box(bx * 1.15, deck / steps + 0.03, 0.34, 0, t * deck, -(D / 2 + 0.42 + i * 0.34),
        PAL.timberWarm, O.timber);
    }
  }

  /* --- rafters and the copper roof ------------------------------------- */
  const eaveY = deck + 0.10 + post;
  const rf = (w2, z2) => rafters({ w: w2, depth: E + 0.2, y: eaveY - 0.12, z: z2, double: true, pitch: 0.36 });
  b.push(rf(W + E * 1.4, D / 2 - 0.1));
  b.push(rotParts(rf(W + E * 1.4, D / 2 - 0.1), Math.PI));
  b.push(rotParts(rf(D + E * 1.4, W / 2 - 0.1), Math.PI / 2));
  b.push(rotParts(rf(D + E * 1.4, W / 2 - 0.1), -Math.PI / 2));

  const roof = irimoyaRoof({
    w: W, d: D, pitch: o.pitch ?? 0.70, eave: E, material: S.material,
    sori: S.sori, cornerLift: S.cornerLift, ridgeCourses: 0,
    gableFrac: 0.40, y: eaveY, ry: 0, gableFace: 'x',
  });
  b.push(patinate(roof.parts));
  // 箱棟 -- a copper roof has a boxed ridge, not a stack of tile courses
  b.bar(W * 0.46, 0.36, 0.56, 0, roof.ridgeY + 0.10, 0, PAL.copperDark, { bands: 'soft3', tint: TINT.green });
  for (const sx of [-1, 1]) {
    b.box(0.10, 0.62, 0.46, sx * W * 0.23, roof.ridgeY - 0.08, 0, PAL.copperDark, { bands: 'soft3', tint: TINT.green });
  }

  /* --- 提灯 ------------------------------------------------------------- */
  const lan = { ...S.lantern, ...(o.lantern || {}) };
  const tiers = o.tiers ?? 2;
  const hx = o.hangX ?? (W / 2 + E * 0.86);
  const hz = o.hangZ ?? (D / 2 + E * 0.86);
  const spacing = o.lanternSpacing ?? 0.40;
  const soffit = eaveY - 0.30;
  const placements = [];
  const rng = rngKit(seedOf(x, z, 5));
  for (let t = 0; t < tiers; t++) {
    const top = soffit - 0.22 - t * (lan.h + 0.18);
    // the rail they hang from
    b.bar(hx * 2 + 0.16, 0.08, 0.08, 0, top + 0.10, -hz, PAL.timberDark, O.timber);
    b.bar(hx * 2 + 0.16, 0.08, 0.08, 0, top + 0.10, hz, PAL.timberDark, O.timber);
    b.bar(0.08, 0.08, hz * 2, -hx, top + 0.10, 0, PAL.timberDark, O.timber);
    b.bar(0.08, 0.08, hz * 2, hx, top + 0.10, 0, PAL.timberDark, O.timber);
    const sides = [
      { a: [-hx, -hz], c: [hx, -hz] }, { a: [-hx, hz], c: [hx, hz] },
      { a: [-hx, -hz], c: [-hx, hz] }, { a: [hx, -hz], c: [hx, hz] },
    ];
    for (const s of sides) {
      const len = Math.hypot(s.c[0] - s.a[0], s.c[1] - s.a[1]);
      const n = Math.max(2, Math.round(len / spacing));
      for (let i = 0; i <= n; i++) {
        if (i === n) continue;                     // corners are shared
        const u = (i + 0.5) / n;
        const lx = lerp(s.a[0], s.c[0], u), lz = lerp(s.a[1], s.c[1], u);
        const p = toWorld(x, z, ry, lx, lz);
        placements.push({
          x: p.x, y: y + top - lan.h, z: p.z,
          ry: ry + (rng.next() - 0.5) * 0.16,
          s: 1 + (rng.next() - 0.5) * 0.05,
        });
      }
    }
  }

  const geo = geoOnce(`lantern:${lan.d}:${lan.h}`, () => lanternGeo(lan.h, lan.d / 2, 10, 4));
  const tex = cached('maidenLantern', () => lanternTex(o.lanternText ?? '奉納', {
    paper: PAL.paper, textColor: PAL.black, band: PAL.lanternRed, ribs: 13,
  }));
  const mat = paperMaterial(tex, { bands: 'soft3' });
  const mesh = instanceBatch(ctx, 'maiden-lanterns', geo, mat, placements);
  if (mesh) {
    const c = new THREE.Color();
    for (let i = 0; i < placements.length; i++) {
      const k = rng.next();
      c.set(PAL.paper).offsetHSL(0, 0, (k - 0.5) * 0.055).multiplyScalar(0.97 + k * 0.06);
      mesh.setColorAt(i, c);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  const setLit = litHandle(ctx, [mat], { autoLight: o.autoLight !== false, intensity: 0.85 });

  ctx.collideRot(x, z, W + 1.5, D + 1.5, ry, undefined, undefined);
  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), x, y, z, ry);
  return {
    x, y, z, ry, w: S.w, d: S.d, base, deck: y + deck,
    eaveY: y + eaveY, ridgeY: y + roof.ridgeY,
    lanterns: placements.length, lanternMesh: mesh, setLit,
    triangles: tris + Math.round((placements.length * geo.index.count) / 3),
  };
}

/* ------------------------------------------------------------------ *
 * 本殿 -- the main hall, 祇園造, National Treasure.
 *
 * 「桁行七間、梁間六間、入母屋造、正面向拝三間、両側面及び背面庇付、
 *   背面三間突出、檜皮葺」 -- 1654, by Ietsuna (NOT Iemitsu).
 *
 * The 祇園造 idea, and the reason this building looks like nothing else: the
 * honden and the haiden, normally two separate buildings, are covered by ONE
 * great irimoya roof, with 又庇 secondary aisle roofs run round the flanks and
 * the rear to make a ring of small rooms.  It is the largest shrine honden in
 * Japan.  **The roof is the building** -- 1,320 m² of 檜皮 developed surface
 * against 662 m² of floor -- so the massing is: a low dark timber body, a
 * shallow skirt of secondary roofs, and then an enormous brown sweep.
 *
 * Numbers all from ARCH.md s4.3 and the shrine's own published figures: floor
 * 662.38 m² solved at 7:6 gives 27.80 x 23.83 m; eaves-line 1,049.50 m²;
 * ridge 15.53 m; mean roof slope arccos(1049.50/1320.00) = 37.3 deg.
 *
 * **It is not painted.**  Bare timber and white plaster under bark.  Vermilion
 * on the Honden is a common and very visible error.
 * ------------------------------------------------------------------ */

export function makeHonden(ctx, o = {}) {
  const S = { ...SPEC.honden, ...(o.spec || {}) };
  const x = o.x, z = o.z, ry = o.ry ?? Math.PI;      // faces south
  const st = seat(ctx, x, z, S.w, S.d, ry);
  const y = o.y ?? st.lo;
  const W = S.wall, D = S.deep, E = S.eave;
  const base = Math.max(S.base, st.rise + 0.35);
  const b = bag();
  const wood = PAL.timberMid, woodDark = PAL.timberDark;

  /* --- 基壇 ------------------------------------------------------------ */
  b.add(taperBox(W + 2.4, D + 2.4, base - 0.14, 0.986, 0.986), PAL.stoneWall, O.stone);
  b.bar(W + 2.7, 0.14, D + 2.7, 0, base - 0.07, 0, PAL.paving, O.stone);
  const floor = base + 0.55;

  /* --- the body: 7 x 6 bays at 3.97 m ---------------------------------- */
  const bay = S.bay, nx = S.baysX, nz = S.baysZ;
  const colR = 0.30;
  const wallY = S.eaveHeight - 0.9;
  const gxs = [], gzs = [];
  for (let i = 0; i <= nx; i++) gxs.push(-W / 2 + (i / nx) * W);
  for (let i = 0; i <= nz; i++) gzs.push(-D / 2 + (i / nz) * D);
  // floor slab and the 縁 veranda
  b.bar(W + 1.9, 0.34, D + 1.9, 0, floor - 0.17, 0, woodDark, O.timber);
  b.bar(W + 2.2, 0.10, D + 2.2, 0, floor - 0.02, 0, PAL.timberWarm, O.timber);
  // 高欄 round the 縁 -- posts at a bay, two rails, giboshi at the corners
  {
    const hw = W / 2 + 1.05, hd = D / 2 + 1.05, rh = 0.82;
    const runs = [[[-hw, -hd], [hw, -hd]], [[-hw, hd], [hw, hd]],
                  [[-hw, -hd], [-hw, hd]], [[hw, -hd], [hw, hd]]];
    for (const [ra, rc] of runs) {
      const len = Math.hypot(rc[0] - ra[0], rc[1] - ra[1]);
      const alongX = Math.abs(rc[0] - ra[0]) > 0.01;
      const n = Math.max(3, Math.round(len / 1.4));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const px = lerp(ra[0], rc[0], t), pz = lerp(ra[1], rc[1], t);
        if (alongX && pz < 0 && Math.abs(px) < bay * 1.6) continue;   // the 向拝 opening
        b.box(0.11, rh, 0.11, px, floor + 0.03, pz, woodDark, O.timber);
        if (i === 0 || i === n) {
          b.lathe([[0.06, 0], [0.085, 0.035], [0.065, 0.08], [0.09, 0.115],
                   [0.08, 0.19], [0.05, 0.25], [0, 0.28]], 8,
            px, floor + 0.03 + rh, pz, PAL.gateGold, O.metal);
        }
      }
      for (const hy of [rh * 0.44, rh]) {
        b.bar(alongX ? len : 0.10, 0.10, alongX ? 0.10 : len,
          (ra[0] + rc[0]) / 2, floor + 0.03 + hy, (ra[1] + rc[1]) / 2, woodDark, O.timber);
      }
    }
  }
  // perimeter columns + wall infill, built outward from the column line
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= nz; j++) {
      const edge = i === 0 || i === nx || j === 0 || j === nz;
      if (!edge) continue;
      b.cyl(colR, colR * 0.94, wallY, gxs[i], floor, gzs[j], 10, wood, O.timber);
    }
  }
  /* The 本殿 is a closed building.  Its front carries 蔀戸 -- hinged lattice
   * shutters -- across the middle third only; the rest is boarded and
   * plastered, and letting the lattice band run the full height turns the
   * largest shrine honden in Japan into an open pavilion. */
  for (const [cz, zs] of [[-D / 2, 1], [D / 2, -1]]) {
    b.box(W - colR, wallY * 0.94, colR * 1.0, 0, floor, cz + zs * 0.34, PAL.gatePanel, O.plaster);
    b.box(W - colR, wallY * 0.30, colR * 1.1, 0, floor, cz + zs * 0.32, PAL.timberPale, O.timber);
    if (zs > 0) {
      for (let i = 1; i < nx - 1; i++) {
        const px = (gxs[i] + gxs[i + 1]) / 2;
        renjiWindow(b, {
          w: bay - colR * 3.0, h: wallY * 0.26, x: px, y: floor + wallY * 0.42,
          z: cz + zs * 0.26, depth: zs * 0.16, color: woodDark, pitch: 0.19, thick: 0.06,
          recess: PAL.timber,
        });
      }
      // the doors on the centre bay
      for (const sxx of [-1, 1]) {
        b.box(bay * 0.44, wallY * 0.60, 0.09, sxx * bay * 0.24, floor + 0.05, cz + zs * 0.20,
          PAL.timberDark, O.timber);
      }
    }
    // 長押
    for (const ny of [floor + wallY * 0.30, floor + wallY * 0.72]) {
      b.bar(W + colR, 0.18, colR * 1.4, 0, ny, cz + zs * 0.22, woodDark, O.timber);
    }
  }
  for (const sx of [-1, 1]) {
    b.box(colR * 0.9, wallY * 0.94, D - colR, sx * (W / 2 - 0.34), floor, 0, PAL.gatePanel, O.plaster);
  }
  // 頭貫 / 台輪
  const headY = floor + wallY;
  for (const cz of [-D / 2, D / 2]) b.bar(W + colR * 2, 0.30, colR * 1.6, 0, headY, cz, woodDark, O.timber);
  for (const cx of [-W / 2, W / 2]) b.bar(colR * 1.6, 0.30, D + colR * 2, cx, headY, 0, woodDark, O.timber);

  /* --- 又庇 -- the secondary aisle roofs, flanks and rear --------------- */
  const skirtY = S.eaveHeight - 2.1;
  const sk = S.hisashi;
  const skirts = [
    { ry: 0, dx: 0, dz: D / 2, w: W + 1.4 },                       // rear (north in local +Z)
    { ry: Math.PI / 2, dx: W / 2, dz: 0, w: D + 1.4 },
    { ry: -Math.PI / 2, dx: -W / 2, dz: 0, w: D + 1.4 },
  ];
  for (const s of skirts) {
    const r = shedRoof({ w: s.w, d: sk, pitch: 0.42, eave: 0.5, material: S.material, mukuri: 0, y: skirtY, ry: 0, ridgeCourses: 0 });
    b.push(rotParts(r.parts, s.ry, s.dx, s.dz));
    b.push(rotParts(rafters({ w: s.w, depth: sk + 0.4, y: skirtY - 0.10, z: -0.2, double: false, pitch: 0.30 }), s.ry, s.dx, s.dz));
  }
  // 背面三間突出 -- the three-bay block off the back
  {
    const rw = S.rear.bays * bay, rd = S.rear.depth;
    b.box(rw, wallY * 0.86, rd, 0, floor, D / 2 + rd / 2, PAL.gatePanel, O.plaster);
    for (const sx of [-1, 1]) b.cyl(colR, colR * 0.94, wallY * 0.86, sx * rw / 2, floor, D / 2 + rd, 10, wood, O.timber);
    const r = gableRoof({
      w: rw, d: rd, pitch: 0.55, eave: 1.5, material: S.material,
      mukuri: 0, sori: 0.09, cornerLift: 0.35, y: floor + wallY * 0.86, ry: 0, ridgeAlongX: false,
    });
    for (const p of r.parts) p.geometry.translate(0, 0, D / 2 + rd / 2);
    b.push(r.parts);
  }

  /* --- the great roof --------------------------------------------------- */
  const eaveY = S.eaveHeight;
  const rf = (w2, z2) => rafters({ w: w2, depth: E + 0.3, y: eaveY - 0.18, z: z2, double: true, pitch: 0.34, spacing: 0.36 });
  b.push(rf(W + E * 1.5, D / 2 - 0.1));
  b.push(rotParts(rf(W + E * 1.5, D / 2 - 0.1), Math.PI));
  b.push(rotParts(rf(D + E * 1.5, W / 2 - 0.1), Math.PI / 2));
  b.push(rotParts(rf(D + E * 1.5, W / 2 - 0.1), -Math.PI / 2));

  const roof = irimoyaRoof({
    w: W, d: D, pitch: o.pitch ?? S.pitch, eave: E, material: S.material,
    sori: S.sori, cornerLift: S.cornerLift, ridgeCourses: 0,
    gableFrac: 0.40, y: eaveY, ry: 0, gableFace: 'x',
  });
  b.push(roof.parts);
  // 箱棟 + 鬼板.  A hiwada roof's ridge is a boxed timber crest, not tile.
  b.bar(W * 0.50, 0.62, 0.95, 0, roof.ridgeY + 0.22, 0, PAL.hiwadaEdge, O.hiwada);
  b.bar(W * 0.50, 0.16, 1.10, 0, roof.ridgeY + 0.58, 0, woodDark, O.timber);
  for (const sx of [-1, 1]) {
    b.box(0.16, 1.15, 0.85, sx * W * 0.25, roof.ridgeY - 0.10, 0, woodDark, O.timber);
    b.push(gyo({ w: 1.15, h: 1.5, y: roof.ridgeY - 1.35, z: 0, ry: sx * Math.PI / 2 })
      .map((p) => { p.geometry.translate(sx * (W / 2 + E - 0.2), 0, 0); return p; }));
  }

  /* --- 向拝 -- the three-bay porch on the front ------------------------- */
  const kw = S.kohai.bays * bay, kd = S.kohai.depth;
  {
    const front = -D / 2;
    const outZ = front - kd;
    const stations = [];
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const zz = lerp(front + 0.6, outZ - 1.1, t);
      // a concave sweep: steep off the main eave, flattening and lifting at the lip
      const yy = lerp(eaveY + 0.35, eaveY - 2.35, Math.pow(t, 0.72)) + Math.pow(t, 3.2) * 0.55;
      stations.push({ z: zz, y: yy });
    }
    b.add(slabZ(stations, kw / 2 + 1.5, ROOFING[S.material].thick), PAL.hiwada, O.hiwada);
    b.add(slabZ(stations.map((p) => ({ z: p.z, y: p.y - ROOFING[S.material].thick })), kw / 2 + 1.55, 0.09),
      PAL.hiwadaEdge, O.hiwada);
    // the four columns that carry it, and the 虹梁 rainbow beam
    const kY = stations[n].y - 0.5;
    for (const k of [-1.5, -0.5, 0.5, 1.5]) {
      const px = k * (kw / 3);
      b.lathe([[0.42, 0], [0.44, 0.08], [0.36, 0.20]], 10, px, floor - 0.5, outZ, PAL.stoneDark, O.stone);
      b.cyl(0.27, 0.25, kY - floor + 0.5, px, floor - 0.5 + 0.20, outZ, 10, wood, O.timber);
      b.push(brackets({ x: px, y: kY - 0.55, z: outZ, steps: 1, scale: 0.72 }));
    }
    b.bar(kw + 1.2, 0.42, 0.34, 0, kY, outZ, woodDark, O.timber);
    b.bar(kw + 1.2, 0.24, 0.28, 0, kY - 0.62, outZ, woodDark, O.timber);
    for (const k of [-1, 0, 1]) {
      b.bar(0.30, 0.34, kd + 0.6, k * (kw / 3), kY - 0.05, front - kd / 2 + 0.3, woodDark, O.timber);
    }
    // the stone steps up to the porch
    const steps = Math.max(3, Math.round((floor - 0.15) / 0.17));
    for (let i = 0; i < steps; i++) {
      b.box(kw * 0.62, (floor + 0.05) / steps + 0.03, 0.42, 0,
        (i / steps) * (floor + 0.05), outZ - 0.5 - i * 0.42, PAL.paving, O.stone);
    }
  }

  ctx.collideRot(x, z, S.w * 0.86, S.d * 0.86, ry, undefined, undefined);
  const kp = toWorld(x, z, ry, 0, -(D / 2 + kd * 0.6));
  ctx.collideRot(kp.x, kp.z, kw, kd, ry, undefined, undefined);

  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), x, y, z, ry);
  const out = {
    x, y, z, ry, w: S.w, d: S.d, wall: W, deep: D,
    floor: y + floor, eaveY: y + eaveY, ridgeY: y + roof.ridgeY, triangles: tris,
  };
  if (o.furniture !== false) {
    const fp = toWorld(x, z, ry, 0, -(D / 2 + kd + 0.9));
    out.saisenbako = makeSaisenbako(ctx, { x: fp.x, z: fp.z, ry, y: y + 0.0, w: 4.2, d: 1.2, baker: o.baker });
    makeShimenawa(ctx, {
      x: toWorld(x, z, ry, 0, -(D / 2 + kd)).x, z: toWorld(x, z, ry, 0, -(D / 2 + kd)).z,
      ry, y: y + floor + 2.5, span: kw * 0.72, radius: 0.30, baker: o.baker,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 石灯籠 -- the stone lantern.
 *
 * Lathed profiles, not stacked cylinders.  The difference is not subtle: a
 * Kasuga lantern is a sequence of swellings, throats and flares, and the whole
 * object reads as carved or as Lego depending on whether those exist.
 *
 * ARCH.md s7.5 gives the canonical 春日 proportions on a 10.1-shaku basis, and
 * they are used here verbatim as fractions of the total height:
 *
 *   地輪 0.0495 · 竿 0.3564 · 中台 0.0990 · 火袋 0.1683 · 笠 0.1287 · 宝珠 0.1980
 *
 * The 竿 is CIRCULAR; the 笠, 火袋, 中台 and 地輪 are all HEXAGONAL in plan --
 * which is why they are lathed at six segments and the shaft at ten.  蕨手
 * (curled scrolls) at the six roof corners.  The paired approach lanterns at
 * Yasaka are 2.40 m; the 万灯籠 donated by the Gion shops number about 100.
 * ------------------------------------------------------------------ */

const KASUGA = { ji: 0.0495, sao: 0.3564, chu: 0.0990, hi: 0.1683, kasa: 0.1287, hoju: 0.1980 };

export function makeStoneLantern(ctx, o = {}) {
  const kind = o.kind || 'kasuga';
  const x = o.x, z = o.z, ry = o.ry ?? 0;
  const y = o.y ?? ctx.groundAt(x, z);
  const rng = rngKit(seedOf(x, z, 3));
  const H = o.height ?? ({ kasuga: 2.40, oribe: 1.20, yukimi: 0.75, path: 1.55 })[kind];
  const b = bag();
  const col = o.color ?? (rng.chance(0.28) ? PAL.lanternStone : PAL.stone);
  const dark = PAL.stoneDark;
  /* The 火袋's paper takes the high-key ramp, so at dusk -- when everything
   * else drops -- it stays the palest thing in the frame without needing its
   * own emissive material and its own draw call. */
  const paperCol = o.lit ? PAL.paperLit : PAL.paper;

  const firebox = (r, h, cy, seg, paper) => {
    b.lathe([[r * 1.05, 0], [r * 1.05, h * 0.10], [r, h * 0.16]], seg, 0, cy, 0, col, O.stone);
    b.lathe([[r, h * 0.84], [r * 1.05, h * 0.90], [r * 1.05, h]], seg, 0, cy, 0, col, O.stone);
    // the corner posts, and a real void behind them
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2 + Math.PI / seg;
      b.box(r * 0.30, h * 0.70, r * 0.30, Math.cos(a) * r * 0.86, cy + h * 0.15, Math.sin(a) * r * 0.86, col, O.stone, a);
    }
    b.lathe([[r * 0.70, h * 0.16], [r * 0.70, h * 0.84]], seg, 0, cy, 0, PAL.shopInterior, O.deep);
    if (paper !== false) {
      const g = lathe([[r * 0.78, h * 0.20], [r * 0.78, h * 0.80]], seg);
      g.translate(0, cy, 0);
      b.add(g, paperCol, { bands: 'soft', tint: TINT.cool });
    }
  };

  const warabite = (r, cy, seg) => {
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const g = new THREE.BoxGeometry(r * 0.16, r * 0.30, r * 0.16);
      g.rotateZ(0.5);
      g.translate(Math.cos(a) * r * 0.98, cy + r * 0.10, Math.sin(a) * r * 0.98);
      b.add(g, col, O.stone);
      b.cyl(r * 0.09, r * 0.07, r * 0.20, Math.cos(a) * r * 1.02, cy + r * 0.18, Math.sin(a) * r * 1.02, 6, col, O.stone);
    }
  };

  if (kind === 'kasuga' || kind === 'path') {
    const seg = kind === 'kasuga' ? 6 : 4;
    let cy = 0;
    // 地輪
    const jiH = KASUGA.ji * H, jiR = 0.208 * H;
    b.box(jiR * 2.5, 0.10, jiR * 2.5, 0, -0.08, 0, dark, O.stone);
    b.lathe([[jiR * 1.03, 0], [jiR, jiH * 0.72], [jiR * 0.90, jiH]], seg, 0, cy, 0, col, O.stone);
    cy += jiH;
    // 竿 -- circular, two 節 rings, a swelling near the top
    const saoH = KASUGA.sao * H, r = 0.037 * H;
    b.lathe([
      [r * 1.22, 0], [r * 1.05, saoH * 0.045], [r, saoH * 0.28], [r * 1.30, saoH * 0.32],
      [r, saoH * 0.36], [r * 0.98, saoH * 0.60], [r * 1.28, saoH * 0.64], [r * 0.98, saoH * 0.68],
      [r * 0.96, saoH * 0.90], [r * 1.20, saoH * 0.96], [r * 1.10, saoH],
    ], 10, 0, cy, 0, col, O.stone);
    cy += saoH;
    // 中台
    const chuH = KASUGA.chu * H, chuR = 0.115 * H;
    b.lathe([[r * 1.15, 0], [chuR * 0.72, chuH * 0.24], [chuR, chuH * 0.52],
             [chuR * 0.96, chuH * 0.78], [chuR * 0.88, chuH]], seg, 0, cy, 0, col, O.stone);
    cy += chuH;
    // 火袋
    const hiH = KASUGA.hi * H, hiR = 0.090 * H;
    firebox(hiR, hiH, cy, seg, o.paper);
    cy += hiH;
    // 笠 -- hexagonal, concave, with 蕨手 at the corners
    const kaH = KASUGA.kasa * H, kaR = 0.150 * H;
    b.lathe([[kaR, 0], [kaR * 0.98, kaH * 0.16], [kaR * 0.72, kaH * 0.52],
             [kaR * 0.42, kaH * 0.82], [kaR * 0.30, kaH]], seg, 0, cy, 0, col, O.stone);
    warabite(kaR, cy, seg);
    cy += kaH;
    // 宝珠 -- 請花 and the jewel
    const hoH = KASUGA.hoju * H;
    b.lathe([
      [kaR * 0.32, 0], [kaR * 0.46, hoH * 0.10], [kaR * 0.30, hoH * 0.22],
      [kaR * 0.34, hoH * 0.30], [kaR * 0.44, hoH * 0.50], [kaR * 0.40, hoH * 0.72],
      [kaR * 0.22, hoH * 0.90], [0, hoH],
    ], 8, 0, cy, 0, col, O.stone);
  } else if (kind === 'yukimi') {
    /* 雪見 -- sized by 笠 WIDTH, and width is about equal to height.  Three or
     * four legs replace the shaft; two of the three face the 上座. */
    const kaR = H * 0.52;
    const legs = o.legs ?? 3;
    const legH = H * 0.42;
    for (let i = 0; i < legs; i++) {
      const a = (i / legs) * Math.PI * 2 + Math.PI * 0.5;
      const g = new THREE.CylinderGeometry(H * 0.055, H * 0.075, legH, 7);
      g.rotateZ(0.20);
      g.rotateY(-a);
      g.translate(Math.cos(a) * kaR * 0.44, legH / 2, Math.sin(a) * kaR * 0.44);
      b.add(g, col, O.stone);
    }
    b.lathe([[H * 0.20, 0], [H * 0.26, H * 0.045], [H * 0.24, H * 0.09]], 6, 0, legH, 0, col, O.stone);
    firebox(H * 0.21, H * 0.24, legH + H * 0.09, 6, o.paper);
    const cy = legH + H * 0.09 + H * 0.24;
    b.lathe([[kaR, 0], [kaR * 0.94, H * 0.055], [kaR * 0.62, H * 0.135],
             [kaR * 0.30, H * 0.185], [kaR * 0.16, H * 0.20]], 6, 0, cy, 0, col, O.stone);
    warabite(kaR, cy, 6);
    b.lathe([[kaR * 0.18, 0], [kaR * 0.26, H * 0.03], [kaR * 0.20, H * 0.07], [0, H * 0.13]],
      8, 0, cy + H * 0.20, 0, col, O.stone);
  } else {
    /* 織部 -- NO base: the 竿 goes straight into the ground, which is what makes
     * it a 露地 object rather than a shrine one.  Square 笠 with a convex 起り,
     * square 火袋 and 中台, a rectangular shaft swelling at the top. */
    const saoH = H * 0.52, sw = H * 0.115;
    b.add(taperBox(sw, sw * 0.72, saoH, 1.0, 1.0), col, O.stone);
    b.lathe([[sw * 0.52, 0], [sw * 0.72, H * 0.035], [sw * 0.60, H * 0.075]], 4, 0, saoH - H * 0.075, 0, col, O.stone);
    b.box(H * 0.20, H * 0.06, H * 0.20, 0, saoH, 0, col, O.stone, Math.PI / 4);
    firebox(H * 0.145, H * 0.22, saoH + H * 0.06, 4, o.paper);
    const cy = saoH + H * 0.06 + H * 0.22;
    b.lathe([[H * 0.26, 0], [H * 0.25, H * 0.055], [H * 0.19, H * 0.10], [H * 0.09, H * 0.125]],
      4, 0, cy, 0, col, O.stone);
    b.lathe([[H * 0.06, 0], [H * 0.09, H * 0.03], [H * 0.07, H * 0.07], [0, H * 0.12]],
      8, 0, cy + H * 0.125, 0, col, O.stone);
  }

  if (o.moss !== false && rng.chance(0.55)) {
    b.lathe([[0.24 * H, 0], [0.22 * H, 0.03 * H]], 6, 0, 0.005, 0, PAL.stoneMoss, O.green);
  }

  ctx.collideRot(x, z, H * 0.42, H * 0.42, ry, y + H * 0.10);
  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), x, y, z, ry);
  return { kind, x, y, z, ry, height: H, top: y + H, triangles: tris };
}

/* ------------------------------------------------------------------ *
 * 常夜灯 -- the tall wooden lantern post of a precinct.
 *
 * A square vermilion post on a stone footing carrying a paper box with a small
 * hipped cap.  These line the Yasaka approaches and are what actually lights
 * the precinct at night; they take the same dusk handle as the Maiden's.
 * ------------------------------------------------------------------ */
export function makeWoodLantern(ctx, o = {}) {
  const x = o.x, z = o.z, ry = o.ry ?? 0;
  const y = o.y ?? ctx.groundAt(x, z);
  const H = o.height ?? 3.30;
  const b = bag();
  const col = o.color ?? PAL.vermilion;
  const opts = col === PAL.vermilion ? O.verm : O.timber;
  const baseH = 0.52, boxH = H * 0.20, boxW = H * 0.20;

  b.add(taperBox(boxW * 1.8, boxW * 1.8, baseH, 0.86, 0.86), PAL.stoneWall, O.stone);
  b.bar(boxW * 1.7, 0.09, boxW * 1.7, 0, baseH + 0.045, 0, PAL.paving, O.stone);
  const postH = H - baseH - boxH - boxW * 0.55;
  const postG = taperBox(boxW * 0.44, boxW * 0.44, postH, 0.90, 0.90);
  postG.translate(0, baseH + 0.09, 0);
  b.add(postG, col, opts);
  // the paper box: frame first, then the four panels set back inside it
  const by = baseH + 0.09 + postH;
  b.bar(boxW * 1.35, 0.10, boxW * 1.35, 0, by + 0.05, 0, col, opts);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.box(0.062, boxH, 0.062, sx * boxW * 0.5, by + 0.10, sz * boxW * 0.5, col, opts);
    }
  }
  const panel = new THREE.BoxGeometry(boxW * 0.94, boxH * 0.94, boxW * 0.94);
  panel.translate(0, by + 0.10 + boxH * 0.5, 0);
  b.add(panel, o.lit ? PAL.paperLit : PAL.paper, { bands: 'soft3', tint: TINT.cool });
  b.bar(boxW * 1.35, 0.09, boxW * 1.35, 0, by + 0.10 + boxH, 0, col, opts);
  // a little hipped cap and a finial
  const cap = new THREE.ConeGeometry(boxW * 1.05, boxW * 0.50, 4);
  cap.rotateY(Math.PI / 4);
  cap.translate(0, by + 0.14 + boxH + boxW * 0.25, 0);
  b.add(cap, PAL.copperDark, O.metal);
  b.lathe([[0.05, 0], [0.075, 0.035], [0.055, 0.075], [0, 0.14]], 8,
    0, by + 0.14 + boxH + boxW * 0.5, 0, PAL.gateGold, O.metal);

  ctx.collideRot(x, z, boxW * 1.8, boxW * 1.8, ry);
  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), x, y, z, ry);
  return { x, y, z, ry, height: H, triangles: tris };
}

/* ------------------------------------------------------------------ *
 * 手水舎 -- the water pavilion.
 *
 * Both of Yasaka's are 「桁行一間、梁間一間 ... 桟瓦葺、水盤付」 -- one bay
 * square, pan-tile, and the 水盤 basin is part of the designation.  They differ
 * in roof form and must not be copy-pasted: **south is 入母屋, west is 切妻.**
 * ------------------------------------------------------------------ */
export function makeTemizuya(ctx, o = {}) {
  const which = o.kind === 'west' ? SPEC.temizuyaWest : SPEC.temizuyaSouth;
  const S = { ...which, ...(o.spec || {}) };
  const x = o.x, z = o.z, ry = o.ry ?? 0;
  const bay = o.bay ?? S.bay, E = o.eave ?? 1.30;
  const st = seat(ctx, x, z, bay + E * 2, bay + E * 2, ry);
  const y = o.y ?? st.lo;
  const b = bag();
  const postH = o.postH ?? 2.55, colR = 0.14;

  // 4 posts on stone plinths, tied at the head, with 蟇股 between
  b.bar(bay + 1.5, 0.16, bay + 1.5, 0, 0.08, 0, PAL.paving, O.stone);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const px = sx * bay / 2, pz = sz * bay / 2;
      b.lathe([[colR * 1.9, 0], [colR * 1.95, 0.07], [colR * 1.6, 0.17]], 8, px, 0.16, pz, PAL.stoneDark, O.stone);
      b.box(colR * 2, postH, colR * 2, px, 0.30, pz, PAL.timberMid, O.timber);
    }
  }
  const headY = 0.30 + postH - 0.26;
  for (const sz of [-1, 1]) b.bar(bay + colR * 2, 0.22, colR * 1.6, 0, headY, sz * bay / 2, PAL.timberDark, O.timber);
  for (const sx of [-1, 1]) b.bar(colR * 1.6, 0.22, bay + colR * 2, sx * bay / 2, headY, 0, PAL.timberDark, O.timber);
  for (const sz of [-1, 1]) {
    const kg = prism([[-0.34, 0], [0.34, 0], [0.16, 0.36], [-0.16, 0.36]], 0.11);
    kg.translate(0, headY + 0.20, sz * bay / 2);
    b.add(kg, PAL.timberWarm, O.timber);
  }

  const eaveY = 0.30 + postH;
  const rf = (z2) => rafters({ w: bay + E * 1.4, depth: E + 0.15, y: eaveY - 0.10, z: z2, spacing: 0.28, size: 0.06, pitch: 0.36 });
  b.push(rf(bay / 2 - 0.08));
  b.push(rotParts(rf(bay / 2 - 0.08), Math.PI));
  b.push(rotParts(rf(bay / 2 - 0.08), Math.PI / 2));
  b.push(rotParts(rf(bay / 2 - 0.08), -Math.PI / 2));

  const roofArgs = {
    w: bay, d: bay, pitch: 0.52, eave: E, material: S.material,
    sori: 0.09, cornerLift: 0.35, ridgeCourses: 4, y: eaveY, ry: 0,
  };
  const roof = S.roof === 'gable'
    ? gableRoof({ ...roofArgs, mukuri: 0, ridgeAlongX: true, gableEnd: true })
    : irimoyaRoof({ ...roofArgs, gableFrac: 0.42, gableFace: 'x' });
  b.push(roof.parts);

  /* --- 水盤 -- the basin, the ladles, and the water --------------------- */
  const bw = o.basinW ?? bay * 0.72, bd = bw * 0.55, bh = 0.78;
  b.add(taperBox(bw, bd, bh - 0.10, 1.04, 1.04), PAL.stoneWall, O.stone);
  b.bar(bw + 0.14, 0.12, bd + 0.14, 0, bh - 0.05, 0, PAL.stone, O.stone);
  b.bar(bw - 0.16, 0.16, bd - 0.16, 0, bh - 0.10, 0, PAL.stoneDark, O.stone);   // the hollow
  const water = new THREE.BoxGeometry(bw - 0.20, 0.02, bd - 0.20);
  water.translate(0, bh - 0.06, 0);
  b.add(water, PAL.water, { bands: 'soft3', tint: TINT.cool });
  // the bamboo spout and its thin fall
  b.cyl(0.045, 0.045, 0.95, 0, bh + 0.10, -bd / 2 - 0.18, 7, PAL.bamboo, O.green);
  const spout = new THREE.CylinderGeometry(0.042, 0.042, 0.42, 7);
  spout.rotateX(Math.PI / 2 - 0.22);
  spout.translate(0, bh + 0.94, -bd / 2 + 0.02);
  b.add(spout, PAL.bamboo, O.green);
  b.cyl(0.014, 0.020, bh + 0.80 - bh + 0.08, 0, bh - 0.04, -bd / 2 + 0.20, 6, PAL.waterFoam,
    { bands: 'soft', tint: TINT.cool, transparent: true, opacity: 0.55 });
  // 柄杓 -- the ladles, on a bamboo rack across the basin
  for (const sx of [-1, 1]) b.cyl(0.03, 0.03, bh + 0.14, sx * (bw / 2 - 0.10), 0, bd / 2 + 0.02, 6, PAL.bamboo, O.green);
  const rail = new THREE.CylinderGeometry(0.028, 0.028, bw - 0.16, 6);
  rail.rotateZ(Math.PI / 2);
  rail.translate(0, bh + 0.14, bd / 2 + 0.02);
  b.add(rail, PAL.bamboo, O.green);
  const nl = o.ladles ?? 4;
  for (let i = 0; i < nl; i++) {
    const px = -bw / 2 + 0.22 + (i / Math.max(1, nl - 1)) * (bw - 0.44);
    b.lathe([[0.062, 0], [0.070, 0.018], [0.070, 0.055], [0.055, 0.058]], 8, px, bh + 0.15, bd / 2 - 0.14, PAL.timberPale, O.timber);
    const hn = new THREE.CylinderGeometry(0.014, 0.014, 0.40, 6);
    hn.rotateX(Math.PI / 2 + 0.10);
    hn.translate(px, bh + 0.18, bd / 2 + 0.10);
    b.add(hn, PAL.timberPale, O.timber);
  }

  const bp = toWorld(x, z, ry, 0, 0);
  ctx.collideRot(bp.x, bp.z, bw + 0.3, bd + 0.3, ry, y + bh);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const p = toWorld(x, z, ry, sx * bay / 2, sz * bay / 2);
      ctx.collideRot(p.x, p.z, colR * 3, colR * 3, ry);
    }
  }
  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), x, y, z, ry);
  return { x, y, z, ry, bay, eaveY: y + eaveY, ridgeY: y + roof.ridgeY, triangles: tris };
}

/* ------------------------------------------------------------------ *
 * 絵馬掛 -- the votive-tablet rack.
 *
 * ARCH.md s7.5/s4.5: a two-sided frame about 1.8 m long x 1.5 m high x 0.6 m
 * deep, sized to one Kyoma bay; visitor 絵馬 are 150 x 90 mm.  Hundreds of
 * them hang in overlapping rows, and they are ONE InstancedMesh -- a rack of
 * 200 individually-meshed tablets is 200 draw calls for an object you look at
 * for four seconds.
 * ------------------------------------------------------------------ */
export function makeEmaRack(ctx, o = {}) {
  const x = o.x, z = o.z, ry = o.ry ?? 0;
  const y = o.y ?? ctx.groundAt(x, z);
  const frames = o.frames ?? 2;                 // a standard frame is 1.8 m
  const L = o.length ?? 1.8 * frames;
  const H = o.height ?? 1.55, DP = o.depth ?? 0.60;
  const b = bag();
  const rng = rngKit(seedOf(x, z, 7));
  const ew = o.emaW ?? 0.150, eh = o.emaH ?? 0.090;

  // posts, head beam, and a little board roof over the top
  for (let i = 0; i <= frames; i++) {
    const px = -L / 2 + (i / frames) * L;
    for (const sz of [-1, 1]) b.box(0.10, H, 0.10, px, 0, sz * DP / 2, PAL.timberMid, O.timber);
    b.bar(0.10, 0.10, DP, px, H - 0.05, 0, PAL.timberMid, O.timber);
  }
  for (const sz of [-1, 1]) b.bar(L + 0.2, 0.12, 0.10, 0, H - 0.05, sz * DP / 2, PAL.timberDark, O.timber);
  const rows = o.rows ?? 3;
  const bars = [];
  for (let r = 0; r < rows; r++) {
    const by = H - 0.22 - r * (eh + 0.055);
    for (const sz of [-1, 1]) {
      const g = new THREE.CylinderGeometry(0.022, 0.022, L + 0.1, 6);
      g.rotateZ(Math.PI / 2);
      g.translate(0, by, sz * (DP / 2 + 0.03));
      b.add(g, PAL.timberDark, O.timber);
      bars.push({ y: by, z: sz * (DP / 2 + 0.05), face: sz });
    }
  }
  const r2 = shedRoof({ w: L + 0.5, d: DP + 0.4, pitch: 0.32, eave: 0.18, material: 'board', mukuri: 0.02, y: H + 0.02, ry: 0, ridgeCourses: 0 });
  for (const p of r2.parts) p.geometry.translate(0, 0, -(DP + 0.4) / 2);
  b.push(r2.parts);

  // the tablets
  const pitch = o.pitch ?? 0.088;
  const placements = [];
  for (const bar of bars) {
    const n = Math.floor((L - 0.16) / pitch);
    for (let i = 0; i < n; i++) {
      const lx = -L / 2 + 0.08 + (i + 0.5) * pitch;
      const p = toWorld(x, z, ry, lx, bar.z);
      placements.push({
        x: p.x, y: y + bar.y - eh - 0.03, z: p.z,
        ry: ry + (bar.face < 0 ? Math.PI : 0) + (rng.next() - 0.5) * 0.30,
        rz: (rng.next() - 0.5) * 0.16,
        s: 0.94 + rng.next() * 0.12,
      });
    }
  }
  const geo = geoOnce(`ema:${ew}:${eh}`, () => emaGeo(ew, eh, 0.011));
  const variants = clamp(o.variants ?? 2, 1, 4);
  const meshes = [];
  for (let v = 0; v < variants; v++) {
    const part = placements.filter((_, i) => i % variants === v);
    const mat = celTex(emaTex(v), { bands: 3, tint: TINT.warm, side: THREE.DoubleSide, flat: false });
    const m = instanceBatch(ctx, `ema-${v}`, geo, mat, part);
    if (m) meshes.push(m);
  }

  ctx.collideRot(x, z, L + 0.3, DP + 0.4, ry, undefined, undefined);
  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), x, y, z, ry);
  return {
    x, y, z, ry, length: L, height: H, ema: placements.length, meshes,
    triangles: tris + Math.round((placements.length * geo.index.count) / 3),
  };
}

/* ------------------------------------------------------------------ *
 * おみくじ -- the fortune stand, and the 結び所 the slips get tied to.
 *
 * The tied slips are the picture: a few hundred folded white papers knotted
 * onto wires in dense rows, which is why they are instanced too.
 * ------------------------------------------------------------------ */
export function makeOmikujiStand(ctx, o = {}) {
  const x = o.x, z = o.z, ry = o.ry ?? 0;
  const y = o.y ?? ctx.groundAt(x, z);
  const b = bag();
  const rng = rngKit(seedOf(x, z, 9));
  const w = o.w ?? 1.60, d = o.d ?? 0.72, h = o.h ?? 0.94;

  // the counter, with a slanted top and a coin box
  b.add(taperBox(w, d, h - 0.10, 1.0, 1.0), PAL.timberMid, O.timber);
  b.bar(w + 0.12, 0.10, d + 0.12, 0, h - 0.05, 0, PAL.timberPale, O.timber);
  b.box(w * 0.94, 0.05, d * 0.94, 0, h, 0, PAL.timberDark, O.timber);
  b.box(0.32, 0.26, 0.30, w * 0.34, h, 0, PAL.timberDark, O.timber);
  b.bar(0.16, 0.02, 0.04, w * 0.34, h + 0.26, 0, PAL.iron, O.metal);
  // 御籤筒 -- the hexagonal shaker
  b.lathe([[0.075, 0], [0.085, 0.04], [0.082, 0.34], [0.095, 0.38], [0.072, 0.40]], 6,
    -w * 0.22, h + 0.02, 0, PAL.timberWarm, O.timber);
  // a small sign board
  {
    const tex = cached('omikujiSign', () => woodenSign('おみくじ', { vertical: true, brush: true, border: true, w: 128, h: 320 }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.60),
      celTex(tex, { bands: 3, tint: TINT.warm, side: THREE.DoubleSide }));
    const p = toWorld(x, z, ry, -w * 0.44, -d / 2 - 0.02);
    m.position.set(p.x, y + h + 0.42, p.z);
    m.rotation.y = ry + Math.PI;
    ctx.add(m);
    b.box(0.05, 0.78, 0.05, -w * 0.44, h - 0.06, -d / 2 - 0.02, PAL.timberDark, O.timber);
  }

  /* --- 結び所 -- the rack of tied slips --------------------------------- */
  const rw = o.rackW ?? 3.0, rh = o.rackH ?? 1.65, rz = o.rackZ ?? 1.9;
  const wires = o.wires ?? 5;
  const placements = [];
  for (const sx of [-1, 1]) b.box(0.09, rh, 0.09, sx * rw / 2, 0, rz, PAL.timberMid, O.timber);
  b.bar(rw + 0.2, 0.10, 0.10, 0, rh, rz, PAL.timberDark, O.timber);
  for (let i = 0; i < wires; i++) {
    const wy = rh - 0.16 - i * ((rh - 0.34) / wires);
    const g = new THREE.CylinderGeometry(0.010, 0.010, rw, 5);
    g.rotateZ(Math.PI / 2);
    g.translate(0, wy, rz);
    b.add(g, PAL.metalDark, O.metal);
    const n = Math.floor((rw - 0.2) / 0.055);
    for (let k = 0; k < n; k++) {
      const lx = -rw / 2 + 0.10 + (k + 0.5) * 0.055;
      const p = toWorld(x, z, ry, lx, rz);
      placements.push({
        x: p.x, y: y + wy - 0.085, z: p.z,
        ry: ry + (rng.next() - 0.5) * 0.9, rz: (rng.next() - 0.5) * 0.25,
        s: 0.9 + rng.next() * 0.25,
      });
    }
  }
  const geo = geoOnce('omikuji', () => {
    const g = new THREE.BoxGeometry(0.030, 0.150, 0.006);
    g.translate(0, 0.075, 0);
    return g;
  });
  const mat = celTex(omikujiTex(), { bands: 'soft3', tint: TINT.cool, side: THREE.DoubleSide, flat: false });
  const mesh = instanceBatch(ctx, 'omikuji', geo, mat, placements);

  ctx.collideRot(x, z, w, d, ry, y + h);
  const rp = toWorld(x, z, ry, 0, rz);
  ctx.collideRot(rp.x, rp.z, rw, 0.3, ry, undefined, undefined);
  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), x, y, z, ry);
  return { x, y, z, ry, slips: placements.length, mesh, triangles: tris + placements.length * 12 };
}

/* ------------------------------------------------------------------ *
 * 狛犬 -- the guardian lion-dogs.
 *
 * One 阿形 with its mouth open and one 吽形 with it shut -- the first and last
 * sounds, the pair bracketing everything between.  Heavily stylised on purpose:
 * at any distance you actually see one of these from, a komainu is a
 * silhouette on a plinth, and carving it would spend a thousand triangles on
 * something the ink pass draws for free.  What has to read is the profile --
 * the heavy haunches, the upright chest, the mane, the flame of a tail.
 * ------------------------------------------------------------------ */
export function makeKomainu(ctx, o = {}) {
  const x = o.x, z = o.z, ry = o.ry ?? 0;
  const y = o.y ?? ctx.groundAt(x, z);
  const open = o.mouth === undefined ? true : (o.mouth === 'open' || o.mouth === 'a');
  const H = o.height ?? 2.10;
  const s = H / 2.10;
  const b = bag();
  const col = o.color ?? PAL.stone, dk = PAL.stoneDark;

  /* --- the plinth ------------------------------------------------------ */
  const ph = 1.10 * s;
  b.bar(1.02 * s, 0.16 * s, 0.86 * s, 0, 0.08 * s, 0, dk, O.stone);
  const pl = taperBox(0.82 * s, 0.68 * s, ph - 0.16 * s, 0.94, 0.94);
  pl.translate(0, 0.16 * s, 0);
  b.add(pl, col, O.stone);
  b.bar(0.94 * s, 0.10 * s, 0.80 * s, 0, ph - 0.05 * s, 0, col, O.stone);

  /* --- the animal, built from joints ----------------------------------- */
  const g = ph;                       // its ground
  // haunches at the back, chest forward and up
  const hq = taperBox(0.46 * s, 0.50 * s, 0.50 * s, 0.86, 0.90);
  hq.translate(0, g, 0.15 * s);
  b.add(hq, col, O.stone);
  const ch = taperBox(0.42 * s, 0.36 * s, 0.62 * s, 0.86, 0.92);
  ch.rotateX(-0.10);
  ch.translate(0, g + 0.02 * s, -0.13 * s);
  b.add(ch, col, O.stone);
  // forelegs, straight and braced
  for (const sx of [-1, 1]) {
    b.cyl(0.075 * s, 0.065 * s, 0.50 * s, sx * 0.13 * s, g, -0.24 * s, 7, col, O.stone);
    b.box(0.15 * s, 0.07 * s, 0.20 * s, sx * 0.13 * s, g, -0.31 * s, col, O.stone);
  }
  // hind paw hints
  for (const sx of [-1, 1]) b.box(0.14 * s, 0.10 * s, 0.22 * s, sx * 0.17 * s, g, 0.26 * s, col, O.stone);
  // neck, mane, head
  const neckY = g + 0.60 * s;
  b.cyl(0.15 * s, 0.14 * s, 0.20 * s, 0, neckY, -0.14 * s, 8, col, O.stone);
  b.lathe([
    [0.13 * s, 0], [0.27 * s, 0.06 * s], [0.20 * s, 0.13 * s],
    [0.30 * s, 0.18 * s], [0.21 * s, 0.26 * s], [0.13 * s, 0.31 * s],
  ], 8, 0, neckY + 0.10 * s, -0.14 * s, col, O.stone);
  const headY = neckY + 0.24 * s;
  b.box(0.30 * s, 0.28 * s, 0.32 * s, 0, headY, -0.18 * s, col, O.stone);
  b.box(0.19 * s, 0.15 * s, 0.16 * s, 0, headY + 0.05 * s, -0.36 * s, col, O.stone);   // snout
  // the mouth: a real void for 阿形, a cut line for 吽形
  if (open) {
    b.box(0.13 * s, 0.10 * s, 0.10 * s, 0, headY + 0.04 * s, -0.40 * s, PAL.shopInterior, O.deep);
    b.box(0.15 * s, 0.04 * s, 0.09 * s, 0, headY + 0.14 * s, -0.41 * s, col, O.stone);
  } else {
    b.box(0.16 * s, 0.025 * s, 0.05 * s, 0, headY + 0.08 * s, -0.43 * s, dk, O.stone);
  }
  for (const sx of [-1, 1]) {
    b.box(0.09 * s, 0.10 * s, 0.06 * s, sx * 0.12 * s, headY + 0.24 * s, -0.14 * s, col, O.stone);  // ears
    b.box(0.055 * s, 0.045 * s, 0.03 * s, sx * 0.085 * s, headY + 0.11 * s, -0.335 * s, dk, O.stone); // eyes
  }
  // the tail: a flame, and the whole reason the silhouette works
  {
    const t = prism([
      [0, 0], [0.10, 0.14], [0.05, 0.30], [0.15, 0.42], [0.07, 0.58],
      [0.16, 0.72], [0.02, 0.86], [-0.10, 0.66], [-0.05, 0.48],
      [-0.15, 0.34], [-0.07, 0.18], [-0.13, 0.04],
    ].map(([a, c]) => [a * s * 1.5, c * s * 1.35]), 0.11 * s);
    t.rotateY(Math.PI / 2);
    t.rotateX(0.16);
    t.translate(0, g + 0.30 * s, 0.32 * s);
    b.add(t, col, O.stone);
  }

  ctx.collideRot(x, z, 1.05 * s, 0.90 * s, ry, undefined, undefined);
  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), x, y, z, ry);
  return { x, y, z, ry, mouth: open ? 'a' : 'un', height: H, triangles: tris };
}

/* ------------------------------------------------------------------ *
 * 玉垣 -- the inscribed stone fence.
 *
 * ARCH.md s7.6: 地覆石 sill, square 柱 posts, 笠石 cap.  Two grades of post --
 * 親柱 large at the ends and at intervals, 子柱 small between, with the donors'
 * names and amounts carved on the 子柱 shafts.  Two real spacings exist and
 * they are both right: 350 mm pitch for a dense inner-precinct run, 1000 mm for
 * a sparse boundary one.  `dense` chooses.
 * ------------------------------------------------------------------ */
export function makeTamagaki(ctx, o = {}) {
  const pts = o.points || [];
  if (pts.length < 2) return { posts: 0, triangles: 0 };
  const dense = o.dense ?? true;
  const pitch = o.pitch ?? (dense ? 0.35 : 1.00);
  const H = o.height ?? 0.90;
  const post = o.post ?? 0.1515;                 // 五寸角
  const oyaEvery = o.oyaEvery ?? 10;
  const b = bag();
  let n = 0, k = 0;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1];
    const dx = c.x - a.x, dz = c.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-3) continue;
    const ang = Math.atan2(dx, dz);              // the run direction, as a yaw
    const mid = { x: (a.x + c.x) / 2, z: (a.z + c.z) / 2 };
    const gm = ctx.groundAt(mid.x, mid.z);
    // 地覆石 and 笠石 -- the sill and the cap, following the ground
    const steps = Math.max(1, Math.round(len / 2.2));
    for (let sIdx = 0; sIdx < steps; sIdx++) {
      const t0 = sIdx / steps, t1 = (sIdx + 1) / steps;
      const p0 = { x: lerp(a.x, c.x, t0), z: lerp(a.z, c.z, t0) };
      const p1 = { x: lerp(a.x, c.x, t1), z: lerp(a.z, c.z, t1) };
      const cm = { x: (p0.x + p1.x) / 2, z: (p0.z + p1.z) / 2 };
      const gy = ctx.groundAt(cm.x, cm.z);
      const sl = len / steps + 0.02;
      b.bar(0.20, 0.15, sl, cm.x, gy + 0.04, cm.z, PAL.stoneWall, O.stone, ang);
      b.bar(0.25, 0.12, sl, cm.x, gy + H + 0.06, cm.z, PAL.stone, O.stone, ang);
    }
    const count = Math.max(1, Math.round(len / pitch));
    for (let j = 0; j <= count; j++) {
      if (i > 0 && j === 0) continue;
      const t = j / count;
      const px = lerp(a.x, c.x, t), pz = lerp(a.z, c.z, t);
      const gy = ctx.groundAt(px, pz);
      const oya = (k % oyaEvery === 0) || (i === 0 && j === 0) || (i === pts.length - 2 && j === count);
      const w = oya ? post * 1.28 : post;
      const hh = oya ? H * 1.32 : H;
      const g = taperBox(w, w, hh, 1.0, 1.0);
      g.rotateY(ang);
      g.translate(px, gy + 0.10, pz);
      b.add(g, PAL.stone, O.stone);
      // the shouldered pyramid head
      const cap = new THREE.ConeGeometry(w * 0.78, w * 0.62, 4);
      cap.rotateY(Math.PI / 4 + ang);
      cap.translate(px, gy + 0.10 + hh + w * 0.28, pz);
      b.add(cap, PAL.stone, O.stone);
      n++; k++;
    }
    ctx.collide(
      Math.min(a.x, c.x) - 0.16, Math.min(a.z, c.z) - 0.16,
      Math.max(a.x, c.x) + 0.16, Math.max(a.z, c.z) + 0.16,
      gm + H + 0.2
    );
  }
  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), 0, 0, 0, 0);
  return { posts: n, height: H, triangles: tris };
}

/* ------------------------------------------------------------------ *
 * 築地塀 -- the roofed earthen wall.
 *
 * ARCH.md s7.7: a large one is 4.0 m high, 1.8 m thick at the base and 1.2 m
 * at the top -- a 4.3 deg batter per face -- built in rammed lifts (版築) that
 * show as horizontal lines on the face, capped with a tiled roof, and carrying
 * 定規筋 rank stripes in the upper third: five for an imperial precinct, three
 * for the lowest of the graded set.  聚楽壁 ochre with white 漆喰 stripes.
 * ------------------------------------------------------------------ */
export function makeTsuijibei(ctx, o = {}) {
  const pts = o.points || [];
  if (pts.length < 2) return { length: 0, triangles: 0 };
  const H = o.height ?? 2.60;
  const baseT = o.baseT ?? H * 0.45, topT = o.topT ?? H * 0.30;
  const stripes = o.stripes ?? 3;
  const b = bag();
  let total = 0;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1];
    const dx = c.x - a.x, dz = c.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-3) continue;
    total += len;
    const ang = Math.atan2(dx, dz);
    const steps = Math.max(1, Math.round(len / 3.0));
    for (let sIdx = 0; sIdx < steps; sIdx++) {
      const t0 = sIdx / steps, t1 = (sIdx + 1) / steps;
      const cm = { x: lerp(a.x, c.x, (t0 + t1) / 2), z: lerp(a.z, c.z, (t0 + t1) / 2) };
      const gy = ctx.groundAt(cm.x, cm.z);
      const sl = len / steps + 0.03;
      // the stone footing, then the rammed-earth body
      b.bar(baseT + 0.16, 0.28, sl, cm.x, gy + 0.14, cm.z, PAL.stoneWall, O.stone, ang);
      const g = taperBox(sl, baseT, H, 1.0, topT / baseT);
      g.rotateY(ang + Math.PI / 2);
      g.translate(cm.x, gy + 0.26, cm.z);
      b.add(g, PAL.plasterOchre, { bands: 3, tint: TINT.cool });
      // 版築 -- the lift lines
      for (let l = 1; l < 5; l++) {
        const ly = gy + 0.26 + (l / 5) * H * 0.72;
        const tt = lerp(baseT, topT, (l / 5) * 0.72);
        b.bar(tt + 0.035, 0.035, sl, cm.x, ly, cm.z, PAL.plasterDark, { bands: 3, tint: TINT.cool }, ang);
      }
      // 定規筋 -- the rank stripes, in the upper third
      for (let l = 0; l < stripes; l++) {
        const ly = gy + 0.26 + H * (0.66 + l * (0.26 / Math.max(1, stripes)));
        const tt = lerp(baseT, topT, (ly - gy - 0.26) / H);
        b.bar(tt + 0.05, 0.11, sl, cm.x, ly, cm.z, PAL.plaster, O.plaster, ang);
      }
      // the tiled cap
      const capY = gy + 0.26 + H;
      const over = 0.30;
      for (const sgn of [-1, 1]) {
        const slab = new THREE.BoxGeometry(sl, 0.13, topT / 2 + over);
        slab.rotateX(sgn * 0.42);
        slab.rotateY(ang + Math.PI / 2);
        const off = { x: Math.cos(ang) * sgn * (topT / 4 + over / 2), z: -Math.sin(ang) * sgn * (topT / 4 + over / 2) };
        slab.translate(cm.x + off.x, capY + 0.12, cm.z + off.z);
        b.add(slab, PAL.tileRoof, O.stone);
      }
      b.bar(0.34, 0.22, sl, cm.x, capY + 0.28, cm.z, PAL.tileRidge, O.stone, ang);
    }
    const gm = ctx.groundAt((a.x + c.x) / 2, (a.z + c.z) / 2);
    ctx.collide(
      Math.min(a.x, c.x) - baseT / 2, Math.min(a.z, c.z) - baseT / 2,
      Math.max(a.x, c.x) + baseT / 2, Math.max(a.z, c.z) + baseT / 2,
      gm + H + 0.5
    );
  }
  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), 0, 0, 0, 0);
  return { length: total, height: H, triangles: tris };
}

/* ------------------------------------------------------------------ *
 * The approach steps.
 *
 * A shrine flight is broad and shallow -- the 祇園石段下 is described as about
 * 20 steps, and at the suggested 0.15 rise / 0.40 going that is 3.0 m of rise
 * over 8 m of run, which is nearly a ramp.  It gets stepped stone cheek walls
 * and 親柱 newels, and every tread is registered as a platform so the walker
 * can climb it.
 * ------------------------------------------------------------------ */
export function makeShrineSteps(ctx, o = {}) {
  const { x0, z0, x1, z1 } = o;
  const y0 = o.y0 ?? ctx.groundAt(x0, z0);
  const y1 = o.y1 ?? ctx.groundAt(x1, z1);
  const width = o.width ?? 6.0;
  const rise = o.rise ?? 0.15;
  const b = bag();
  const st = stairs(x0, y0, z0, x1, y1, z1, width, rise);
  b.add(st.geometry, o.color ?? PAL.paving, O.stone);

  const dx = x1 - x0, dz = z1 - z0;
  const run = Math.hypot(dx, dz) || 1;
  const tx = dx / run, tz = dz / run;
  const nx = -tz, nz = tx;

  if (o.cheek !== false) {
    const ch = o.cheekH ?? 0.62;
    for (const s of [-1, 1]) {
      for (let i = 0; i < st.steps; i++) {
        const t = (i + 0.5) / st.steps;
        const px = x0 + dx * t + nx * s * (width / 2 + 0.28);
        const pz = z0 + dz * t + nz * s * (width / 2 + 0.28);
        const py = y0 + (y1 - y0) * ((i + 1) / st.steps);
        b.box(0.56, ch, st.tread + 0.02, px, py, pz, PAL.stoneWall, O.stone, Math.atan2(tx, tz));
      }
      // 親柱 at the foot and the head
      for (const [ex, ez, ey] of [[x0, z0, y0], [x1, z1, y1]]) {
        b.box(0.42, 1.15, 0.42, ex + nx * s * (width / 2 + 0.28), ey, ez + nz * s * (width / 2 + 0.28),
          PAL.stone, O.stone, Math.atan2(tx, tz));
        const cap = new THREE.ConeGeometry(0.30, 0.22, 4);
        cap.rotateY(Math.PI / 4);
        cap.translate(ex + nx * s * (width / 2 + 0.28), ey + 1.26, ez + nz * s * (width / 2 + 0.28));
        b.add(cap, PAL.stone, O.stone);
      }
    }
  }

  if (o.platform !== false) {
    for (const t of st.treads) {
      ctx.platform({
        x0: t.x - t.hd - t.hw * Math.abs(nx), x1: t.x + t.hd + t.hw * Math.abs(nx),
        z0: t.z - t.hd - t.hw * Math.abs(nz), z1: t.z + t.hd + t.hw * Math.abs(nz),
        top: t.y, step: rise + 0.30,
      });
    }
  }
  // the cheeks are walls
  for (const s of [-1, 1]) {
    ctx.collide(
      Math.min(x0, x1) + nx * s * (width / 2 + 0.28) - 0.35,
      Math.min(z0, z1) + nz * s * (width / 2 + 0.28) - 0.35,
      Math.max(x0, x1) + nx * s * (width / 2 + 0.28) + 0.35,
      Math.max(z0, z1) + nz * s * (width / 2 + 0.28) + 0.35,
      Math.max(y0, y1) + 0.9
    );
  }

  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), 0, 0, 0, 0);
  return { steps: st.steps, rise: st.rise, tread: st.tread, width, triangles: tris };
}

/* ------------------------------------------------------------------ *
 * 蹲踞 -- the low standalone basin, and 摂社 -- a sub-shrine.
 *
 * Yasaka has a great many of the second kind: 疫神社, 大国主社, 美御前社,
 * 又旅社 and a dozen more, each a 一間社流造 the size of a garden shed.  The
 * 流造 roof is the point of it: the ridge sits over the BACK of the body and
 * the front slope sweeps on down over the steps, so the roof is asymmetric.
 * Building it as a symmetric gable is what makes a sub-shrine look like a
 * bird box.
 * ------------------------------------------------------------------ */
export function makeChozu(ctx, o = {}) {
  const x = o.x, z = o.z, ry = o.ry ?? 0;
  const y = o.y ?? ctx.groundAt(x, z);
  const r = o.radius ?? 0.42, h = o.height ?? 0.34;
  const b = bag();
  const rng = rngKit(seedOf(x, z, 13));
  b.lathe([
    [r * 1.08, 0], [r * 1.12, h * 0.30], [r * 1.05, h * 0.78], [r, h],
    [r * 0.80, h * 0.94], [r * 0.78, h * 0.28], [0, h * 0.22],
  ], 12, 0, 0, 0, PAL.stone, O.stone);
  const water = new THREE.CylinderGeometry(r * 0.78, r * 0.78, 0.02, 12);
  water.translate(0, h * 0.84, 0);
  b.add(water, PAL.water, { bands: 'soft3', tint: TINT.cool });
  // the bamboo 掛樋 that feeds it
  b.cyl(0.04, 0.04, 0.72, -r * 1.5, 0, -r * 0.4, 7, PAL.bamboo, O.green);
  const sp = new THREE.CylinderGeometry(0.036, 0.036, 0.62, 7);
  sp.rotateZ(Math.PI / 2 - 0.30);
  sp.translate(-r * 1.1, 0.68, -r * 0.4);
  b.add(sp, PAL.bamboo, O.green);
  // the 役石 set round it
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rng.range(0, 1);
    const rr = r * (1.9 + rng.range(0, 0.5));
    b.lathe([[0.20 + rng.range(0, 0.1), 0], [0.17, 0.10], [0.05, 0.15]], 6,
      Math.cos(a) * rr, 0, Math.sin(a) * rr, rng.chance(0.4) ? PAL.stoneMoss : PAL.stoneDark,
      rng.chance(0.4) ? O.green : O.stone);
  }
  ctx.collideRot(x, z, r * 2.4, r * 2.4, ry, y + h);
  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), x, y, z, ry);
  return { x, y, z, ry, radius: r, triangles: tris };
}

export function makeSubShrine(ctx, o = {}) {
  const x = o.x, z = o.z, ry = o.ry ?? Math.PI;
  const W = o.w ?? 2.20, D = o.d ?? 1.80;
  const st = seat(ctx, x, z, W + 2.4, D + 3.2, ry);
  const y = o.y ?? st.lo;
  const base = Math.max(o.base ?? 0.55, st.rise + 0.25);
  const bodyH = o.bodyH ?? 1.95;
  const E = o.eave ?? 0.80;
  const b = bag();
  const col = o.color ?? PAL.vermilion;
  const opts = col === PAL.vermilion ? O.verm : O.timber;

  // 基壇 and floor
  b.add(taperBox(W + 1.0, D + 1.0, base - 0.10, 0.96, 0.96), PAL.stoneWall, O.stone);
  b.bar(W + 1.2, 0.10, D + 1.2, 0, base - 0.05, 0, PAL.paving, O.stone);
  const floor = base + 0.30;
  b.bar(W + 0.7, 0.24, D + 0.7, 0, floor - 0.12, 0, PAL.timberDark, O.timber);
  b.bar(W + 0.9, 0.07, D + 0.9, 0, floor + 0.02, 0, PAL.timberWarm, O.timber);

  // the body: four corner posts, boarded walls, a pair of doors on the front
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) b.cyl(0.11, 0.10, bodyH, sx * W / 2, floor, sz * D / 2, 8, col, opts);
  }
  b.box(W - 0.10, bodyH * 0.96, D - 0.10, 0, floor, 0, PAL.timberPale, O.timber);
  for (const sx of [-1, 1]) {
    b.box(W * 0.44, bodyH * 0.80, 0.07, sx * W * 0.23, floor + 0.05, -D / 2 - 0.05, col, opts);
    for (let r = 0; r < 3; r++) {
      b.cyl(0.028, 0.028, 0.025, sx * W * 0.23, floor + 0.25 + r * 0.45, -D / 2 - 0.085, 6, PAL.iron, O.metal);
    }
  }
  b.bar(W + 0.30, 0.18, D + 0.30, 0, floor + bodyH, 0, col, opts);
  // 縁 and 高欄 on the front
  b.bar(W + 0.9, 0.09, 0.55, 0, floor + 0.06, -D / 2 - 0.30, PAL.timberWarm, O.timber);
  for (const sx of [-1, 1]) {
    b.box(0.07, 0.48, 0.07, sx * (W / 2 + 0.34), floor + 0.10, -D / 2 - 0.30, col, opts);
  }
  b.bar(W + 0.76, 0.07, 0.07, 0, floor + 0.58, -D / 2 - 0.30, col, opts);
  // the steps down from the porch
  const ns = Math.max(2, Math.round(floor / 0.20));
  for (let i = 0; i < ns; i++) {
    b.box(W * 0.60, floor / ns + 0.03, 0.26, 0, (i / ns) * floor, -(D / 2 + 0.62 + i * 0.26), PAL.timberWarm, O.timber);
  }

  /* --- 流造 -- the ridge over the back, the front slope carried on ------ */
  const eaveY = floor + bodyH + 0.18;
  const ridgeY = eaveY + (D / 2 + E) * 0.62;
  const R = ROOFING[o.material || 'hiwada'];
  const slope = (fromZ, toZ, drop, lift) => {
    const out = [];
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      out.push({ z: lerp(fromZ, toZ, t), y: ridgeY - drop * (Math.pow(t, 0.80) - Math.pow(t, 4) * lift) });
    }
    return out;
  };
  const backEdge = D / 2 + E, frontEdge = -(D / 2 + E + (o.nagare ?? 1.05));
  b.add(slabZ(slope(0.02, backEdge, ridgeY - eaveY, 0.10), W / 2 + E, R.thick), R.top, O.hiwada);
  b.add(slabZ(slope(-0.02, frontEdge, ridgeY - eaveY + 0.30, 0.16), W / 2 + E, R.thick), R.top, O.hiwada);
  // 破風 boards closing the ends, and the ridge
  for (const sx of [-1, 1]) {
    b.bar(0.09, 0.30, D + E * 2 + 1.2, sx * (W / 2 + E), ridgeY - 0.55, -0.4, PAL.timberDark, O.timber, 0);
  }
  b.bar(W + E * 2, 0.24, 0.42, 0, ridgeY + 0.10, 0, PAL.timberDark, O.timber);
  if (o.chigi !== false) {
    b.push(chigi({ length: W + E * 1.4, ridgeY: ridgeY + 0.18, count: 4, ry: 0 }));
  }
  b.push(rotParts(rafters({ w: W + E * 1.6, depth: E + 0.5, y: eaveY - 0.06, z: D / 2 - 0.05, spacing: 0.26, size: 0.055, pitch: 0.42 }), Math.PI));

  ctx.collideRot(x, z, W + 1.2, D + 1.2, ry, undefined, undefined);
  const tris = b.flush(ctx.baker(o.baker || 'yasaka'), x, y, z, ry);
  const out = { x, y, z, ry, w: W, d: D, ridgeY: y + ridgeY, triangles: tris };
  if (o.torii !== false) {
    const tp = toWorld(x, z, ry, 0, -(D / 2 + 3.4));
    out.torii = makeTorii(ctx, {
      x: tp.x, z: tp.z, ry, kind: 'myojin',
      height: 3.1, span: 2.35, baker: o.baker,
    });
  }
  if (o.saisenbako !== false) {
    const sp = toWorld(x, z, ry, 0, -(D / 2 + 1.15));
    out.saisenbako = makeSaisenbako(ctx, { x: sp.x, z: sp.z, ry, w: W * 0.8, d: 0.6, h: 0.62, baker: o.baker });
  }
  return out;
}
