import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { cel, TINT } from '../core/toon.js';
import { Baker, rngKit, clamp, lerp, sstep, TAU } from '../core/util.js';

/* ------------------------------------------------------------------ *
 * Vegetation -- the central batcher.
 *
 * District builders never plant anything.  They call `ctx.tree({...})`, the
 * specs land in `world.trees`, and this module builds **all of them at once**,
 * after every district has run.  There are several hundred trees on this route
 * and the scene is draw-call bound, so the whole of the world's planting comes
 * out as **nine meshes**:
 *
 *     1  merged wood      every trunk, limb, twig, lenticel and planter in the
 *                         world, vertex-coloured, one material, one draw
 *     2  blossom          soft3 and soft ramps, pink shadow tint, per-blob
 *                         tone in `instanceColor`
 *     3  green            pale (soft3), dark (3-band), and ground-level --
 *                         the last is the only canopy that receives shadow
 *     2  hero canopies    blossom and green, the only ones allowed to CAST
 *     1  bamboo culms     one lathed culm with its nodes, instanced
 *
 * Everything above is an `InstancedMesh` except the wood, and every one of them
 * is created lazily, so a district set with no bamboo in it pays nothing.
 *
 * ------------------------------------------------------- THE ART DIRECTION
 *
 * The one thing that can kill this project visually is cherry blossom going
 * muddy on its shadow side.  A dark cherry tree does not read as "a cherry
 * tree in shade", it reads as *autumn*, and the entire premise of the world is
 * that it is April.  So, without exception:
 *
 *   - every blossom mass is on `bands: 'soft'` or `'soft3'` -- the high-key
 *     ramps whose darkest stop is still 176/255 -- with a **pink-leaning**
 *     shadow tint (0xc8a8c0), never the violet default.  A violet shadow on a
 *     pink mass is the single reliable way to turn blossom grey.
 *   - a canopy carries **five** pastel tones distributed across its clusters
 *     (blossomLight → blossom → blossomWarm → blossomShade → blossomDeep),
 *     biased so the crown is lightest.  The value variation inside the mass is
 *     what makes it read as painted; without it a cherry is a pink balloon.
 *   - no canopy ever *receives* a shadow.  A toon ramp only shapes direct
 *     light, so a shadowed blob falls back to flat ambient and you get dark
 *     circles hanging in the sky next to a tree that is fine.  (METHOD §9.6.)
 *
 * Canopies are **clusters of small faceted blobs**, never billboards.  A
 * billboard turns to face the camera as you walk past it and the painted
 * illusion dies on the spot; a lump of geometry with a flat-shaded facet
 * catching the sun does not.  And they are *small*: a big sphere reads as a
 * boulder, thirty small ones read as blossom.  The blobs are hung off the
 * branch tips rather than scattered on a shell, so the canopy has the shape
 * the branching gave it.
 *
 * ---------------------------------------------------------------- SHADOWS
 *
 * All wood casts -- a trunk shadow is thin, cheap and it is what seats a tree
 * on the ground.  **Canopies cast only if the tree is a hero**, capped at
 * `maxShadowCasters` (default 48).  A few hundred shadow-casting canopies is
 * the fastest way to lose the frame budget and a blossom canopy's cast shadow
 * is not what sells the image anyway -- the mass against the sky is.
 *
 * `buildWorld` finishes with `shadowify(root, true, true)`, which would
 * happily switch every canopy back on, so the flags here are *pinned* with a
 * property descriptor rather than merely assigned.
 * ------------------------------------------------------------------ */

/** Every kind a district may ask for. */
export const TREE_KINDS = [
  'sakura', 'shidare', 'maple', 'pine', 'bamboo', 'cedar',
  'shrub', 'camellia', 'potted', 'willow', 'ginkgo',
];

/* ------------------------------------------------------------------ *
 * Colour
 *
 * Everything below is either a PAL entry or an explicit mix of two of them.
 * The palette has no cherry-bark or ginkgo tone, and inventing a loose hex
 * here would be how a fifth brown gets into a world that is supposed to have
 * six; mixing two named ones keeps the ladder intact.
 * ------------------------------------------------------------------ */

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return ((Math.round(ar + (br - ar) * t) << 16) |
          (Math.round(ag + (bg - ag) * t) << 8) |
           Math.round(ab + (bb - ab) * t));
}

/** Bark.  Cherry is grey-mauve, pine is red-brown, bamboo is nearly yellow. */
const BARK = {
  sakura:     mixHex(PAL.trunkPale, PAL.purple, 0.20),
  sakuraDeep: mixHex(PAL.trunk, PAL.purple, 0.18),
  lenticel:   mixHex(mixHex(PAL.trunkPale, PAL.purple, 0.20), PAL.ink, 0.42),
  maple:      mixHex(PAL.trunk, PAL.stoneMoss, 0.16),
  pine:       PAL.trunkPine,
  pinePlate:  mixHex(PAL.trunkPine, PAL.bengara, 0.30),
  cedar:      mixHex(PAL.trunk, PAL.bengara, 0.12),
  willow:     mixHex(PAL.trunkPale, PAL.stoneMoss, 0.26),
  ginkgo:     mixHex(PAL.trunkPale, PAL.stone, 0.30),
  shrub:      PAL.trunk,
  potRim:       PAL.timberMid,
  potWood:      PAL.timberWarm,
  /* 'dark glazed or terracotta' (STREET.md 3.1).  Held off black: a 0.3 m pot
   * with a near-black rim reads as a heavy plinth at twenty metres, which is
   * half of what made the doorway plants look like lollipops on stands. */
  potGlaze:     mixHex(PAL.bengara, PAL.stoneDark, 0.42),
  potGlazeRim:  mixHex(PAL.bengaraDeep, PAL.stoneDark, 0.30),
  potStone:     PAL.stone,
};

/* Canopy tone ladders.  **Ordered lightest first** -- `toneAt` reads the list
 * from the top down as a blob sits lower in the crown, which is how a mass
 * gets internal value without any of it going dark. */
const TONE = {
  sakura: [PAL.blossomLight, PAL.blossom, PAL.blossomWarm, PAL.blossomShade, PAL.blossomDeep],
  sakuraCrown: [PAL.blossomLight, PAL.blossomWarm, PAL.blossom],
  shidare: [PAL.shidareLit, PAL.blossom, PAL.shidare, PAL.blossomDeep, PAL.blossomShade],
  potted: [PAL.blossomLight, PAL.blossomWarm, PAL.blossom, PAL.blossomShade],

  maple: [
    mixHex(PAL.leafMapleLit, PAL.bambooCulmPale, 0.30),
    PAL.leafMapleLit, PAL.leafMaple,
    mixHex(PAL.leafMaple, PAL.shrub, 0.35),
  ],
  mapleAutumn: [
    mixHex(PAL.leafMapleAutumnLit, PAL.gold, 0.28),
    PAL.leafMapleAutumnLit, PAL.leafMapleAutumn,
    mixHex(PAL.leafMapleAutumn, PAL.bengara, 0.30),
  ],
  ginkgo: [
    mixHex(PAL.leafMapleLit, PAL.matcha, 0.42),
    PAL.leafMapleLit, mixHex(PAL.leafMaple, PAL.matcha, 0.30),
  ],
  ginkgoAutumn: [mixHex(PAL.gold, PAL.leafMapleLit, 0.24), PAL.gold, PAL.goldDeep],
  willow: [
    mixHex(PAL.bambooCulmPale, PAL.leafMapleLit, 0.35),
    mixHex(PAL.bambooLit, PAL.leafMapleLit, 0.45),
    PAL.bamboo,
  ],
  bambooLeaf: [PAL.bambooCulmPale, PAL.bambooLit, PAL.bamboo],

  /* Lifted deliberately.  A 3-band ramp puts its darkest stop at 92/255, so a
   * tone that starts at leafCedar's 0x3f6350 lands on the shadow side within a
   * few per cent of the ink colour and the tree stops having any shape at all.
   * Every dark green here is held above that floor. */
  pine: [
    mixHex(PAL.leafPineLit, PAL.bambooLit, 0.26),
    PAL.leafPineLit,
    mixHex(PAL.leafPine, PAL.leafPineLit, 0.30),
  ],
  cedar: [
    mixHex(PAL.leafCedarLit, PAL.bambooLit, 0.22),
    PAL.leafCedarLit,
    mixHex(PAL.leafCedar, PAL.leafCedarLit, 0.42),
  ],
  shrub: [PAL.shrubLit, PAL.shrub, PAL.moss],
  /* 鉢植え.  STREET.md 3.12: the doorway pots are 南天, 万両, 葉蘭, ferns,
   * dwarf maple and bamboo -- foliage, not blossom.  A row of shopfronts each
   * with a pink flowering cherry in a tub is a thing that does not happen. */
  pottedLeaf: [PAL.shrubLit, PAL.shrub, mixHex(PAL.leafPine, PAL.shrub, 0.45)],
  pottedMaple: [mixHex(PAL.leafMapleLit, PAL.bambooCulmPale, 0.25), PAL.leafMapleLit, PAL.leafMaple],
  pottedBerry: [PAL.red, PAL.redDeep],
  camellia: [mixHex(PAL.shrubLit, PAL.leafPine, 0.35), mixHex(PAL.leafPine, PAL.shrubLit, 0.25), PAL.leafPine],
  camelliaFlower: [PAL.red, PAL.redDeep, PAL.blossomDeep],
  culm: [PAL.bambooCulmPale, PAL.bambooCulm, mixHex(PAL.bambooCulm, PAL.bamboo, 0.4)],
};

/* ------------------------------------------------------------------ *
 * Grain -- how coarse a canopy may be for its size
 *
 * The obvious rule, blob radius as a fixed fraction of crown radius, is
 * scale-INVARIANT, and that is exactly what is wrong with it.  A four-metre
 * crown gets away with a coarse grain because there are sixty lumps in it and
 * they merge into a mass.  The same fraction on a 0.4 m crown is six discrete
 * spheres with sky between them, sitting on a bare stem: a lollipop.  Small
 * trees were the least convincing thing in the pagoda view for exactly this
 * reason.
 *
 * So the blob's *share* of the crown falls as the crown does, and the count
 * comes from coverage rather than from a per-kind constant.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * THE OVERLAP RULE -- the one invariant every canopy in this file obeys
 *
 * A canopy reads as a painted mass only when its clusters lose their own
 * outlines: the silhouette must be the UNION, and you must not be able to
 * count the blobs.  Two conditions make that true, and both fail the moment a
 * blob approaches the size of the crown it is in:
 *
 *   1. a blob's radius is at most a QUARTER of the crown's, so there are four
 *      or more of them across every axis and no single one can define the
 *      outline;
 *   2. consecutive blobs are spaced at well under a blob radius, so each is
 *      buried a third or more deep in its neighbour.
 *
 * The ink pass is the judge, and it is unforgiving: it draws a line at every
 * depth discontinuity, so two blobs that merely touch get a hard crease
 * between them and read as two objects.  Two that overlap by a third get no
 * crease at all.
 *
 * There is a third condition that is easy to miss and does most of the work:
 *
 *   3. **blobs are elongated along the axis of the form they are building.**
 *      A cedar is a vertical spire and a willow strand is a hanging ribbon, so
 *      their blobs are prolate; a pine plate is a horizontal layer, so its
 *      blobs are oblate.  A sphere is the one shape that reads as an object in
 *      its own right at every size, which is why a column of spheres reads as
 *      a bunch of grapes and a column of the same volume in prolate lumps
 *      reads as a branch.  Getting this wrong cost the willows and the cedars
 *      an entire round.
 * ------------------------------------------------------------------ */

/** The hard ceiling on a blob's radius, as a fraction of its crown's. */
const BLOB_MAX = 0.25;

/**
 * For a single-mass crown of radius `R`: the blob radius and how many of them
 * it takes.  `over` is how many times the crown's projected area the blobs add
 * up to -- below about 1.1 the gaps open and the mass stops reading as one
 * thing.
 */
function grain(R, over = 1.25, cap = 96) {
  const f = lerp(0.135, 0.185, sstep(0.2, 2.4, R));
  return { b: R * f, n: clamp(Math.round(over / (f * f)), 8, cap) };
}

/**
 * For the crowns built cluster-by-cluster off branch tips, where the tip count
 * is fixed by the branching and cannot follow the crown size.  Returns the
 * factor to shrink each blob by and the factor to multiply the per-tip count
 * by.  Both are 1 at full size, so a normal tree is untouched.
 */
function fineness(R) {
  const f = clamp(0.58 + 0.105 * R, 0.58, 1);
  return { size: f, count: clamp(1 / (f * f), 1, 3) };
}

/**
 * Pick a tone from a lightest-first ladder given how high the blob sits in the
 * crown (`up` 0 = bottom, 1 = top), with a little scatter so the mass does not
 * band.
 */
function toneAt(list, rng, up) {
  const t = clamp(1 - up + rng.range(-0.26, 0.26), 0, 0.9999);
  return list[Math.floor(t * list.length)];
}

/* ------------------------------------------------------------------ *
 * Shared geometry
 * ------------------------------------------------------------------ */

/**
 * The canopy blob.
 *
 * A perturbed icosahedron with a faint vertical gradient baked into its vertex
 * colours -- 0.90 at the bottom, 1.10 at the top -- so every blob has light
 * gathering on its upper surface before the sun is even considered.  The
 * gradient is a *modulation*: the actual tone arrives per instance in
 * `instanceColor`, and the two multiply in the shader.
 *
 * Detail 1 (80 tris) for blossom and the pale greens, which are looked at from
 * two metres.  Detail 0 (20 tris) for the dark masses and ground foliage,
 * which never are, and which read better angular anyway.
 */
function blobGeometry(detail = 1) {
  // 0 -> 20 faces, 0.5 -> 32, 1 -> 80.  The half step is a once-subdivided
  // octahedron: two thirds of detail 1's triangles for most of its roundness,
  // and it is what the bulk canopies run on.
  const g = detail === 0.5
    ? new THREE.OctahedronGeometry(1, 1)
    : new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  const n = p.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // low-frequency lumpiness -- a function of position, so the duplicated
    // corners of a non-indexed polyhedron stay welded
    const k = 1 + 0.15 * (Math.sin(x * 2.3 + y * 1.7) * 0.5 + Math.sin(z * 3.1 - y * 2.1) * 0.5);
    p.setXYZ(i, x * k, y * k, z * k);
    const s = 0.90 + 0.14 * (y * 0.5 + 0.5);   // 0.90 under, 1.04 on top
    col[i * 3] = s; col[i * 3 + 1] = s; col[i * 3 + 2] = s;
  }
  g.deleteAttribute('uv');
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * A bamboo culm: 竹 is *the stem*, not the leaf, and the stem is a pale
 * yellow-green tube with a swollen ring and a dark collar at every node.  This
 * is a lathe rather than a cylinder because the nodes have to be in the
 * silhouette -- a smooth pole reads as scaffolding.
 *
 * A gentle bend is baked in and each instance is given a random yaw, so a
 * stand of them leans every way without needing a curved instance.
 * Unit height; per-instance scale is (diameter, height, diameter).
 */
function culmGeometry(nodes = 7, seg = 5) {
  const prof = [];
  const R = 0.5;
  prof.push([R * 1.06, 0]);
  for (let i = 0; i < nodes; i++) {
    const y0 = (i + 0.72) / nodes;
    const taper = 1 - 0.34 * y0;
    prof.push([R * taper * 0.985, y0 - 0.012]);
    prof.push([R * taper * 1.26, y0]);          // the swollen ring
    prof.push([R * taper * 0.985, y0 + 0.012]);
  }
  prof.push([R * 0.60, 1.0]);

  const pts = prof.map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, seg);
  const p = g.attributes.position;
  g.deleteAttribute('uv');
  // vertex colour: dark collar just above each node, pale internode
  const n = p.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const y = p.getY(i);
    let s = 0.94 + 0.10 * y;
    for (let k = 0; k < nodes; k++) {
      const yn = (k + 0.72) / nodes;
      if (Math.abs(y - yn) < 0.018) s *= 0.66;
    }
    col[i * 3] = s; col[i * 3 + 1] = s; col[i * 3 + 2] = s;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/* Unit tubes for trunks and limbs.  Cached by segment count and taper so six
 * thousand limbs allocate about thirty geometries between them; the baker only
 * ever sees a matrix. */
const _tubes = new Map();
function unitTube(seg, taper) {
  const t = clamp(Math.round(taper * 16) / 16, 0.0625, 1);
  const key = seg + ':' + t;
  let g = _tubes.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(0.5 * t, 0.5, 1, seg, 1, true);
    g.translate(0, 0.5, 0);
    _tubes.set(key, g);
  }
  return g;
}

const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _eul = new THREE.Euler();

/** The matrix that puts a unit tube between two points at a given base width. */
function tubeMatrix(ax, ay, az, bx, by, bz, d0) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1e-4;
  _dir.set(dx / len, dy / len, dz / len);
  _quat.setFromUnitVectors(_up, _dir);
  _pos.set(ax, ay, az);
  _scl.set(d0, len, d0);
  return new THREE.Matrix4().compose(_pos, _quat, _scl);
}

function placeMatrix(x, y, z, rx, ry, rz, sx, sy, sz) {
  _pos.set(x, y, z);
  _eul.set(rx, ry, rz, 'YXZ');
  _quat.setFromEuler(_eul);
  _scl.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_pos, _quat, _scl);
}

/* ------------------------------------------------------------------ *
 * Shadow flags that survive `shadowify`
 * ------------------------------------------------------------------ */

/**
 * Pin `castShadow` / `receiveShadow`.
 *
 * `buildWorld` ends with `shadowify(root, true, true)` and there is no telling
 * whether this module runs before or after it.  An assignment would be undone;
 * an accessor that ignores its setter is not.  This is the only place in the
 * project that needs it, and it needs it because the canopy rule (never
 * receive) is not a preference -- a receiving canopy is a black disc in the
 * sky.
 */
function lockShadow(mesh, cast, receive) {
  mesh.userData.noShadow = !cast;
  Object.defineProperty(mesh, 'castShadow', {
    get: () => cast, set: () => {}, configurable: true,
  });
  Object.defineProperty(mesh, 'receiveShadow', {
    get: () => receive, set: () => {}, configurable: true,
  });
  return mesh;
}

/* ------------------------------------------------------------------ *
 * An instanced canopy group
 * ------------------------------------------------------------------ */

class Cluster {
  constructor(name, geo, mat, { cast = false, receive = false } = {}) {
    this.name = name;
    this.geo = geo;
    this.mat = mat;
    this.cast = cast;
    this.receive = receive;
    this.mats = [];
    this.cols = [];
  }

  push(matrix, color) {
    this.mats.push(matrix);
    this.cols.push(color);
    return this;
  }

  get count() { return this.mats.length; }

  build(parent) {
    const n = this.mats.length;
    if (!n) return null;
    const inst = new THREE.InstancedMesh(this.geo, this.mat, n);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      inst.setMatrixAt(i, this.mats[i]);
      c.set(this.cols[i]);
      inst.setColorAt(i, c);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.name = this.name;
    lockShadow(inst, this.cast, this.receive);
    inst.computeBoundingSphere();
    parent.add(inst);
    this.mats.length = 0;
    this.cols.length = 0;
    return inst;
  }
}

/* ------------------------------------------------------------------ *
 * The per-tree builders
 *
 * Every one of them receives `T`, a small facade over the batchers, and works
 * in **world space** -- the tree's own origin is (x, baseY, z) and its
 * rotation is folded into the branch directions.  No THREE.Group is created
 * for a tree at any point, and none survives into the scene.
 * ------------------------------------------------------------------ */

/**
 * A recursive limb.  Two or three levels for a hero, one for the rest; every
 * end is handed to `onNode` so the canopy can be hung off the structure it
 * actually grew from.
 */
function branch(T, x, y, z, dx, dy, dz, len, rad, depth, color, onNode) {
  const r = T.rng;
  const ex = x + dx * len, ey = y + dy * len, ez = z + dz * len;
  const taper = depth === 0 ? 0.62 : 0.55;
  T.wood.add(unitTube(depth <= 1 ? 6 : 5, taper), tubeMatrix(x, y, z, ex, ey, ez, rad * 2), color, T.woodOpts);
  T.limbs++;
  if (depth >= T.depth) { onNode(ex, ey, ez, rad * taper, depth, true); return; }
  // the fork itself gets reported too: blossom hung only on the outermost
  // twigs gives a pancake sitting on a bare armature, which is what the first
  // pass looked like
  if (depth >= 1) onNode(ex, ey, ez, rad * taper, depth, false);

  const n = depth === 0 ? r.int(2, 3) : r.int(2, 3);
  for (let i = 0; i < n; i++) {
    const spread = lerp(0.62, 0.34, depth / Math.max(1, T.depth));
    const a = r.range(0, TAU);
    // splay away from the parent direction
    let nx = dx + Math.cos(a) * spread + r.gauss() * 0.12;
    let nz = dz + Math.sin(a) * spread + r.gauss() * 0.12;
    let ny = dy + r.range(-0.08, 0.20) - spread * 0.18;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    branch(T, ex, ey, ez, nx, ny, nz,
      len * r.range(0.56, 0.78), rad * taper * r.range(0.78, 0.94),
      depth + 1, color, onNode);
  }
}

/** A cluster of blossom or leaf blobs hung around a point. */
function puff(T, group, x, y, z, r, count, tones, up, { flatten = 0.82, spread = 1.0 } = {}) {
  const rng = T.rng;
  for (let i = 0; i < count; i++) {
    const a = rng.range(0, TAU);
    const d = Math.sqrt(rng.next()) * r * spread;
    const bx = x + Math.cos(a) * d;
    const bz = z + Math.sin(a) * d;
    const by = y + rng.gauss() * r * 0.42 * flatten;
    const s = r * rng.range(0.42, 0.66);
    const u = clamp(up + (by - y) / (r * 2.4), 0, 1);
    group.push(
      placeMatrix(bx, by, bz,
        rng.range(-0.3, 0.3), rng.range(0, TAU), rng.range(-0.3, 0.3),
        s, s * flatten, s * rng.range(0.85, 1.15)),
      toneAt(tones, rng, u)
    );
    T.blobs++;
  }
}

/* ------------------------------- 桜 ------------------------------------ *
 * Somei-yoshino: a short bole that forks low into three or four heavy limbs,
 * and a crown much wider than it is tall.  The blossom sits ON the branches --
 * a somei-yoshino flowers before it leafs, so the mass is the structure with
 * cloud on it, not a ball on a stick.
 * ---------------------------------------------------------------------- */
function buildSakura(T, spec) {
  const r = T.rng;
  const S = T.scale;
  const h = r.range(6.4, 8.6) * S;
  const R = h * r.range(0.56, 0.72);
  const bole = h * r.range(0.20, 0.32);
  const rad = h * r.range(0.024, 0.034);

  const bark = r.chance(0.5) ? BARK.sakura : BARK.sakuraDeep;
  T.wood.add(unitTube(7, 0.74), tubeMatrix(T.x, T.y, T.z, T.x + r.gauss() * 0.18, T.y + bole, T.z + r.gauss() * 0.18, rad * 2.1), bark, T.woodOpts);

  // 桜 bark is famous for its horizontal lenticels; on a hero they are worth
  // the eight boxes it takes to show them.
  if (T.hero) {
    for (let i = 0; i < 7; i++) {
      const ly = T.y + bole * r.range(0.12, 0.95);
      const la = r.range(0, TAU);
      const lr = rad * 1.16;
      const g = new THREE.BoxGeometry(rad * r.range(0.7, 1.5), rad * 0.11, rad * 0.24);
      T.wood.add(g, placeMatrix(T.x + Math.cos(la) * lr * 0.6, ly, T.z + Math.sin(la) * lr * 0.6, 0, -la, 0, 1, 1, 1), BARK.lenticel, T.woodOpts);
      g.dispose();
    }
  }

  const tips = [];
  const nLimb = r.int(3, 5);
  const base = r.range(0, TAU);
  for (let i = 0; i < nLimb; i++) {
    const a = base + (i / nLimb) * TAU + r.gauss() * 0.4;
    const tilt = r.range(0.44, 0.78);           // away from vertical
    const dx = Math.cos(a) * tilt, dz = Math.sin(a) * tilt;
    const dy = 1;
    const l = Math.hypot(dx, dy, dz);
    branch(T, T.x + r.gauss() * 0.1, T.y + bole, T.z + r.gauss() * 0.1,
      dx / l, dy / l, dz / l,
      (h - bole) * r.range(0.52, 0.72), rad * r.range(0.62, 0.82), 0, bark,
      (tx, ty, tz, tr, d, tip) => tips.push([tx, ty, tz, tip]));
  }

  /* The canopy hangs off the tips.  **Small**: a blob is a cluster of flowers,
   * not a canopy.  At R/8 a cherry needs fifty of them and reads as blossom;
   * at R/4 it needs twelve and reads as a bag of boulders, which is what the
   * first pass of this looked like. */
  const fine = fineness(R);
  const blobR = R * r.range(0.135, 0.165) * fine.size;
  let top = -Infinity;
  for (const [tx, ty] of tips) if (ty > top) top = ty;
  const bottom = T.y + bole;
  for (const [tx, ty, tz, tip] of tips) {
    const up = clamp((ty - bottom) / Math.max(0.5, top - bottom), 0, 1);
    const n = Math.round((tip ? r.int(3, 5) : r.int(2, 3)) * fine.count);
    // the high-key 2-band ramp takes the share of the cluster that catches the
    // light; the 3-band one takes the rest, and the two together are what give
    // the mass its internal value without any of it going dark
    const nCrown = Math.round(n * (0.30 + up * 0.35));
    const opt = { flatten: tip ? 0.92 : 0.80, spread: tip ? 1.5 : 1.1 };
    if (nCrown) puff(T, T.cast ? T.g.blossomHero : T.g.crown, tx, ty, tz, blobR, nCrown, TONE.sakuraCrown, up * 0.9 + 0.1, opt);
    if (n - nCrown) puff(T, T.cast ? T.g.blossomHero : T.g.blossom, tx, ty, tz, blobR, n - nCrown, TONE.sakura, up * 0.9 + 0.1, opt);
  }
  // the crown: light blobs that give the mass a top edge against the sky
  for (let i = 0, nc = Math.round(9 * fine.count); i < nc; i++) {
    const a = r.range(0, TAU), d = R * r.range(0, 0.46);
    const s = blobR * r.range(0.85, 1.25);
    (T.cast ? T.g.blossomHero : T.g.crown).push(
      placeMatrix(T.x + Math.cos(a) * d, top + r.range(-0.5, 0.4), T.z + Math.sin(a) * d,
        r.range(-0.2, 0.2), r.range(0, TAU), r.range(-0.2, 0.2), s, s * 0.74, s),
      r.pick(TONE.sakuraCrown));
    T.blobs++;
  }

  T.collide(rad * 1.5);
  return h;
}

/* ------------------------------ 枝垂桜 --------------------------------- *
 * The weeping cherry -- Maruyama Park's is the most looked-at tree in Kyoto.
 * A clean trunk to shoulder height, limbs that arch UP and out, and then
 * curtains that fall almost to the ground.  Deeper pink than the street
 * cherries, and the strands are the whole read: a weeping cherry built as a
 * dome with a droopy edge is just a mushroom.
 * ---------------------------------------------------------------------- */
function buildShidare(T, spec) {
  const r = T.rng;
  const S = T.scale;
  const h = r.range(8.0, 10.5) * S;
  const shoulder = h * r.range(0.46, 0.56);
  const rad = h * r.range(0.034, 0.046);
  const bark = BARK.sakuraDeep;

  T.wood.add(unitTube(8, 0.56), tubeMatrix(T.x, T.y, T.z, T.x, T.y + shoulder, T.z, rad * 2.4), bark, T.woodOpts);
  if (T.hero) {
    for (let i = 0; i < 8; i++) {
      const ly = T.y + shoulder * r.range(0.1, 0.9);
      const la = r.range(0, TAU);
      const g = new THREE.BoxGeometry(rad * r.range(0.8, 1.7), rad * 0.12, rad * 0.26);
      T.wood.add(g, placeMatrix(T.x + Math.cos(la) * rad * 0.7, ly, T.z + Math.sin(la) * rad * 0.7, 0, -la, 0, 1, 1, 1), BARK.lenticel, T.woodOpts);
      g.dispose();
    }
  }

  const nLimb = r.int(5, 7);
  const reach = h * r.range(0.42, 0.56);
  const hangs = [];
  const base = r.range(0, TAU);
  for (let i = 0; i < nLimb; i++) {
    const a = base + (i / nLimb) * TAU + r.gauss() * 0.28;
    const ca = Math.cos(a), sa = Math.sin(a);
    // up and out to a knuckle, then out and slightly down to the shoulder
    const k1x = T.x + ca * reach * 0.42, k1z = T.z + sa * reach * 0.42;
    const k1y = T.y + shoulder + h * r.range(0.14, 0.22);
    const k2x = T.x + ca * reach, k2z = T.z + sa * reach;
    const k2y = k1y + h * r.range(-0.02, 0.06);
    T.wood.add(unitTube(6, 0.66), tubeMatrix(T.x, T.y + shoulder, T.z, k1x, k1y, k1z, rad * 1.3), bark, T.woodOpts);
    T.wood.add(unitTube(5, 0.60), tubeMatrix(k1x, k1y, k1z, k2x, k2y, k2z, rad * 0.9), bark, T.woodOpts);
    T.limbs += 2;
    const nH = T.hero ? r.int(5, 7) : r.int(3, 5);
    for (let j = 0; j < nH; j++) {
      const t = r.range(0.35, 1.02);
      const ja = a + r.gauss() * 0.5;
      hangs.push([
        T.x + Math.cos(ja) * reach * t * r.range(0.82, 1.06),
        lerp(k1y, k2y, clamp(t, 0, 1)) + r.range(-0.3, 0.2),
        T.z + Math.sin(ja) * reach * t * r.range(0.82, 1.06),
      ]);
    }
    // blossom over the shoulder, so the arching limbs are not bare sticks
    for (let j = 0; j < 6; j++) {
      const t = r.range(0.05, 1.0);
      const bx = lerp(T.x, k2x, t), bz = lerp(T.z, k2z, t);
      const by = lerp(T.y + shoulder, k2y, t) + h * 0.025;
      puff(T, T.cast ? T.g.blossomHero : T.g.crown, bx, by, bz, h * 0.040, 3,
        TONE.sakuraCrown, 0.9, { flatten: 0.85, spread: 1.2 });
    }
  }

  // the curtains
  const grp = T.cast ? T.g.blossomHero : T.g.blossom;
  const blobR = h * 0.0185;
  for (const [hx, hy, hz] of hangs) {
    const drop = h * r.range(0.34, 0.62);
    /* The strand blobs must overlap hard.  Spaced at their own radius they
     * read as a string of beads; at two thirds of it, with a little vertical
     * stretch, the strand becomes one hanging mass of blossom. */
    const n = Math.max(6, Math.round(drop / (blobR * 0.68)));
    const swayA = r.range(0, TAU);
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      const y = hy - drop * t;
      const s = blobR * lerp(1.15, 0.58, t) * r.range(0.82, 1.18);
      const dx = Math.cos(swayA) * t * blobR * 2.6 + r.gauss() * blobR * 1.1;
      const dz = Math.sin(swayA) * t * blobR * 2.6 + r.gauss() * blobR * 1.1;
      const up = clamp(1 - t * 0.85, 0, 1);
      (t < 0.18 ? T.g.crown : grp).push(
        placeMatrix(hx + dx, y, hz + dz,
          r.range(-0.25, 0.25), r.range(0, TAU), r.range(-0.25, 0.25),
          s * 1.12, s * 1.28, s * 1.12),
        toneAt(t < 0.2 ? TONE.sakuraCrown : TONE.shidare, r, up));
      T.blobs++;
    }
  }

  T.collide(rad * 1.6);
  return h;
}

/* ------------------------------- 楓 ------------------------------------ *
 * Maple.  In April it is fresh yellow-green and the leaves have only just
 * opened, so the crown is airy and layered -- flat tiers with daylight between
 * them, never a lollipop.  Multi-stemmed from the base, which is how a Kyoto
 * garden maple is nearly always trained.
 * ---------------------------------------------------------------------- */
function buildMaple(T, spec) {
  const r = T.rng;
  const S = T.scale;
  const h = r.range(4.6, 7.2) * S;
  const R = h * r.range(0.50, 0.66);
  const rad = h * r.range(0.026, 0.036);
  const tones = T.autumn ? TONE.mapleAutumn : TONE.maple;
  const grp = T.autumn ? (T.g.leafWarm || T.g.leafLight) : T.g.leafLight;

  const stems = r.int(2, 3);
  const tips = [];
  const base = r.range(0, TAU);
  for (let i = 0; i < stems; i++) {
    const a = base + (i / stems) * TAU + r.gauss() * 0.5;
    const tilt = r.range(0.16, 0.34);
    const dx = Math.cos(a) * tilt, dz = Math.sin(a) * tilt;
    const l = Math.hypot(dx, 1, dz);
    branch(T, T.x, T.y, T.z, dx / l, 1 / l, dz / l,
      h * r.range(0.42, 0.56), rad * r.range(0.8, 1.05), 0, BARK.maple,
      (tx, ty, tz, tr, d, tip) => tips.push([tx, ty, tz, tip]));
  }

  let top = -Infinity, bot = Infinity;
  for (const [, ty] of tips) { if (ty > top) top = ty; if (ty < bot) bot = ty; }
  const fine = fineness(R);
  const blobR = R * r.range(0.115, 0.145) * fine.size;
  for (const [tx, ty, tz, tip] of tips) {
    const up = clamp((ty - bot) / Math.max(0.6, top - bot), 0, 1);
    const n = Math.round((tip ? r.int(6, 9) : r.int(2, 3)) * fine.count);
    puff(T, grp, tx, ty, tz, blobR, n, tones,
      up * 0.85 + 0.15, { flatten: 0.46, spread: tip ? 1.7 : 1.1 });
  }
  T.collide(rad * 1.4);
  return h;
}

/* ------------------------------- 松 ------------------------------------ *
 * The pine, and the single kind that makes a garden read as Japanese.
 *
 * Everything here is a rule about what it must NOT be: not a cone, not
 * symmetric, not continuous.  A trained black pine is a leaning, contorted
 * trunk carrying a handful of horizontal foliage PLATES with clear sky between
 * them.  The gaps are the point -- 透かし, the thinning that a gardener spends
 * a week a year on, is what separates a Japanese pine from a Christmas tree.
 * ---------------------------------------------------------------------- */
function buildPine(T, spec) {
  const r = T.rng;
  const S = T.scale;
  const h = r.range(5.2, 8.8) * S;
  const rad = h * r.range(0.034, 0.048);
  const lean = r.range(0.10, 0.26);
  const la = r.range(0, TAU);
  const lx = Math.cos(la), lz = Math.sin(la);

  // a contorted trunk: five segments, each one drifting and kinking
  const node = [];
  let cx = T.x, cy = T.y, cz = T.z, cr = rad;
  node.push([cx, cy, cz, cr]);
  const segs = 5;
  for (let i = 0; i < segs; i++) {
    const t = (i + 1) / segs;
    const sway = Math.sin(t * 4.1 + la) * h * 0.055;
    const nx = T.x + lx * lean * h * t + Math.cos(la + 1.9) * sway;
    const nz = T.z + lz * lean * h * t + Math.sin(la + 1.9) * sway;
    const ny = T.y + h * t * r.range(0.94, 1.06) * (1 - 0.06 * i);
    const nr = rad * (1 - 0.62 * t) * r.range(0.92, 1.06);
    T.wood.add(unitTube(6, clamp(nr / cr, 0.2, 1)), tubeMatrix(cx, cy, cz, nx, ny, nz, cr * 2), BARK.pine, T.woodOpts);
    T.limbs++;
    cx = nx; cy = ny; cz = nz; cr = nr;
    node.push([cx, cy, cz, cr]);
  }

  // 黒松 bark is plated, and a few angular slabs are enough to say so
  if (T.hero) {
    for (let i = 0; i < 10; i++) {
      const t = r.range(0.02, 0.7);
      const k = Math.min(segs - 1, Math.floor(t * segs));
      const f = t * segs - k;
      const px = lerp(node[k][0], node[k + 1][0], f);
      const py = lerp(node[k][1], node[k + 1][1], f);
      const pz = lerp(node[k][2], node[k + 1][2], f);
      const pr = lerp(node[k][3], node[k + 1][3], f) * 1.04;
      const a = r.range(0, TAU);
      const g = new THREE.BoxGeometry(pr * r.range(0.5, 0.9), pr * r.range(0.5, 1.1), pr * 0.22);
      T.wood.add(g, placeMatrix(px + Math.cos(a) * pr, py, pz + Math.sin(a) * pr, 0, -a + Math.PI / 2, r.gauss() * 0.3, 1, 1, 1), BARK.pinePlate, T.woodOpts);
      g.dispose();
    }
  }

  // the plates: 4-6 of them, biggest at mid-height, each offset off the trunk
  const grp = T.cast ? T.g.leafHero : T.g.leafDark;
  const nPlate = r.int(5, 7);
  for (let i = 0; i < nPlate; i++) {
    const t = 0.34 + (i / Math.max(1, nPlate - 1)) * 0.64;
    const k = Math.min(segs - 1, Math.floor(t * segs));
    const f = t * segs - k;
    const px = lerp(node[k][0], node[k + 1][0], f);
    const py = lerp(node[k][1], node[k + 1][1], f);
    const pz = lerp(node[k][2], node[k + 1][2], f);
    const pr = lerp(node[k][3], node[k + 1][3], f);

    const a = r.range(0, TAU);
    const reach = h * r.range(0.07, 0.19);
    const ox = px + Math.cos(a) * reach, oz = pz + Math.sin(a) * reach;
    const oy = py + r.range(-0.12, 0.10) * h * 0.2;
    // the branch that carries the plate: nearly horizontal, which is the shape
    T.wood.add(unitTube(5, 0.45), tubeMatrix(px, py, pz, ox, oy + h * 0.02, oz, pr * 1.2), BARK.pine, T.woodOpts);
    T.limbs++;

    /* The plate: a ragged horizontal pad built from many SMALL flat lumps in
     * two loose rings, never one big disc.  A disc reads as a lily pad on a
     * stick; a pad of eighteen lumps has the ragged, thinned edge that 透かし
     * -- the gardener's annual thinning -- actually produces. */
    const bell = Math.sin(((i + 0.6) / (nPlate + 0.2)) * Math.PI);
    const plateR = h * r.range(0.13, 0.20) * (0.55 + bell * 0.75);
    const nB = 15 + Math.round(bell * 10);
    const up = t;
    for (let j = 0; j < nB; j++) {
      const ring = j < nB * 0.42 ? 0.30 : 1.0;
      const ba = (j / nB) * TAU * 2.4 + r.gauss() * 0.6;
      const bd = plateR * ring * r.range(0.30, 1.04);
      /* Held to a quarter of the plate radius even after the horizontal
       * stretch, so a plate reads as a LAYER and not as a ring of rocks. */
      const sB = plateR * r.range(0.13, 0.19);
      grp.push(
        placeMatrix(ox + Math.cos(ba) * bd, oy + r.range(-0.08, 0.08) * plateR, oz + Math.sin(ba) * bd,
          r.range(-0.12, 0.12), r.range(0, TAU), r.range(-0.12, 0.12),
          sB * r.range(1.15, 1.55), sB * r.range(0.24, 0.36), sB * r.range(1.15, 1.55)),
        toneAt(TONE.pine, r, clamp(up + r.range(-0.15, 0.25), 0, 1)));
      T.blobs++;
    }
  }

  T.collide(rad * 1.5);
  return h;
}

/* ------------------------------- 杉 ------------------------------------ *
 * Cryptomeria, the hillside conifer.  Tall, straight, dark and NARROW: a
 * cedar's job in this world is to be the vertical texture of the slope behind
 * Kiyomizu-dera, so its silhouette is a spire, not a triangle.
 * ---------------------------------------------------------------------- */
function buildCedar(T, spec) {
  const r = T.rng;
  const S = T.scale;
  const h = r.range(13, 22) * S;
  const rad = h * r.range(0.013, 0.019);
  // 杉 is a NARROW tree: crown width is about a fifth of its height
  const R = h * r.range(0.085, 0.125);

  T.wood.add(unitTube(6, 0.18), tubeMatrix(T.x, T.y, T.z, T.x + r.gauss() * 0.3, T.y + h, T.z + r.gauss() * 0.3, rad * 2), BARK.cedar, T.woodOpts);
  T.limbs++;

  /* A tapering column, not a cairn.
   *
   * The pass before this gave every blob a radius of up to 0.95 R and offset
   * it laterally by up to 0.6 R, so each one protruded past the union and the
   * tree read as six to ten green boulders piled on a stick, separately
   * countable and each with its own ink outline.  Two changes fix it: the blob
   * is held to a quarter of the crown radius (rule 1), and it is stretched
   * about twice along the spire's own axis (rule 3), which triples the
   * vertical overlap for the same triangle count. */
  const grp = T.cast ? T.g.leafHero : T.g.leafDark;
  const n = r.int(84, 108);
  for (let i = 0; i < n; i++) {
    const t = 0.12 + (i / n) * 0.90;
    const taper = Math.pow(1 - Math.min(t, 0.995), 0.5);
    const b = R * taper * r.range(0.20, 0.26);
    const a = i * 2.399 + r.gauss() * 0.45;      // golden-angle spiral
    // centre-weighted, so the core of the spire is solid and only a minority
    // of the blobs break the outline -- sky through the middle of a sugi is
    // what makes it read as lace rather than as a dark mass
    const d = R * taper * 0.62 * Math.pow(r.next(), 1.15);
    const y = T.y + h * Math.min(t, 1.0) + r.gauss() * h * 0.010;
    grp.push(
      placeMatrix(T.x + Math.cos(a) * d, y, T.z + Math.sin(a) * d,
        r.range(-0.10, 0.10), r.range(0, TAU), r.range(-0.10, 0.10),
        b, b * r.range(2.0, 2.6), b),
      toneAt(TONE.cedar, r, clamp(t, 0, 1)));
    T.blobs++;
  }
  T.collide(rad * 1.6);
  return h;
}

/* ------------------------------- 竹 ------------------------------------ *
 * A grove, not a tree.  One `ctx.tree({kind:'bamboo'})` plants a stand of
 * fifteen-odd culms, because that is the only way bamboo ever occurs and
 * because a lone culm looks like a fishing rod.
 *
 * The culms are the read.  Foliage is one or two small sprays right at the
 * top and nothing at all below two thirds height, which is what gives a
 * grove its characteristic empty, striped lower storey.
 * ---------------------------------------------------------------------- */
function buildBamboo(T, spec) {
  const r = T.rng;
  const S = T.scale;
  const spread = r.range(1.3, 2.2) * S;
  const n = spec.count ?? r.int(16, 28);
  let maxH = 0;
  for (let i = 0; i < n; i++) {
    const a = r.range(0, TAU);
    const d = Math.sqrt(r.next()) * spread;
    const bx = T.x + Math.cos(a) * d;
    const bz = T.z + Math.sin(a) * d;
    const by = T.hasY ? T.y : T.groundAt(bx, bz);
    const h = r.range(7.0, 12.0) * S;
    // 孟宗竹 runs 90-140 mm; below about 85 mm a culm reads as a wire
    const dia = r.range(0.105, 0.165) * (0.7 + S * 0.3);
    maxH = Math.max(maxH, h);
    T.g.culm.push(
      placeMatrix(bx, by, bz, r.range(-0.075, 0.075), r.range(0, TAU), r.range(-0.075, 0.075), dia, h, dia),
      r.pick(TONE.culm));
    T.culms++;

    /* Sprays, only in the top third.  Small and many: a bamboo leaf spray is
     * a narrow feather about 300 mm across, and the big flat discs the first
     * pass used read as lily pads threaded onto a wire. */
    const sprays = r.int(7, 12);
    for (let k = 0; k < sprays; k++) {
      const t = r.range(0.66, 1.02);
      const sa = r.range(0, TAU);
      const sd = r.range(0.10, 0.62) * S * t;
      const sB = r.range(0.13, 0.24) * S;
      T.g.leafLight.push(
        placeMatrix(bx + Math.cos(sa) * sd, by + h * Math.min(t, 1.0) - r.range(0, 0.3),
          bz + Math.sin(sa) * sd,
          r.range(-0.5, 0.5), -sa, r.range(-0.25, 0.25),
          sB * r.range(0.7, 1.1), sB * r.range(0.5, 0.8), sB * r.range(1.5, 2.6)),
        toneAt(TONE.bambooLeaf, r, t));
      T.blobs++;
    }
  }
  // one collider for the stand, not one per culm: the player's collision loop
  // is linear in the collider count and a grove would be two hundred of them
  T.collideBox(spread * 0.82);
  return maxH;
}

/* ------------------------------ 低木 ----------------------------------- *
 * Shrubs and camellia.  These sit on the ground, so unlike every other canopy
 * they DO receive shadow -- being in a building's shade is correct for them
 * and reads as the thing that grounds a courtyard.
 * ---------------------------------------------------------------------- */
function buildShrub(T, spec) {
  const r = T.rng;
  const S = T.scale;
  const h = r.range(0.7, 1.5) * S;
  const R = h * r.range(0.62, 0.92);
  const { b, n } = grain(R, 1.35, 80);
  for (let i = 0; i < n; i++) {
    const a = r.range(0, TAU);
    const d = Math.sqrt(r.next()) * R * 0.92;
    const s = b * r.range(0.75, 1.3);
    const y = T.y + h * r.range(0.24, 0.70) * (1 - 0.35 * (d / (R * 0.92)));
    T.g.ground.push(
      placeMatrix(T.x + Math.cos(a) * d, y, T.z + Math.sin(a) * d,
        r.range(-0.3, 0.3), r.range(0, TAU), r.range(-0.3, 0.3),
        s, s * r.range(0.62, 0.86), s * r.range(0.85, 1.15)),
      toneAt(TONE.shrub, r, clamp((y - T.y) / h, 0, 1)));
    T.blobs++;
  }
  return h;
}

function buildCamellia(T, spec) {
  const r = T.rng;
  const S = T.scale;
  const h = r.range(1.6, 2.8) * S;
  const R = h * r.range(0.40, 0.56);
  const rad = h * 0.026;
  T.wood.add(unitTube(5, 0.5), tubeMatrix(T.x, T.y, T.z, T.x, T.y + h * 0.4, T.z, rad * 2), BARK.shrub, T.woodOpts);
  T.limbs++;
  const { b, n } = grain(R, 1.45, 84);
  for (let i = 0; i < n; i++) {
    const a = r.range(0, TAU);
    const d = Math.sqrt(r.next()) * R * 0.86;
    const y = T.y + h * r.range(0.34, 0.96);
    const s = b * r.range(0.78, 1.28);
    T.g.ground.push(
      placeMatrix(T.x + Math.cos(a) * d, y, T.z + Math.sin(a) * d,
        r.range(-0.3, 0.3), r.range(0, TAU), r.range(-0.3, 0.3),
        s, s * r.range(0.78, 1.0), s),
      toneAt(TONE.camellia, r, clamp((y - T.y) / h, 0, 1)));
    T.blobs++;
  }
  // 椿 flowers: specks of red in very dark green, which is the whole reason
  // to plant one.  Kept at 0.17 m so they read as flecks and not as fruit.
  const flowers = r.int(3, 7);
  for (let i = 0; i < flowers; i++) {
    const a = r.range(0, TAU);
    const d = R * r.range(0.55, 0.95);
    const s = 0.085 * S + r.range(0, 0.03);
    T.g.ground.push(
      placeMatrix(T.x + Math.cos(a) * d, T.y + h * r.range(0.45, 0.95), T.z + Math.sin(a) * d,
        0, r.range(0, TAU), 0, s, s * 0.8, s),
      r.pick(TONE.camelliaFlower));
    T.blobs++;
  }
  return h;
}

/* ------------------------------ 鉢植え --------------------------------- *
 * The doorway pot.  STREET.md 3.12 is specific about this and the first pass
 * of it was wrong on every count: the pots are **0.25-0.40 m across** and what
 * is in them is 南天, 万両, 葉蘭, ferns, a dwarf maple or a few culms of
 * bamboo -- foliage, in an asymmetric group of two to five, at a shopfront
 * doorway.  A 2.3 m flowering cherry in a half-metre tub outside every machiya
 * is not a thing that happens in Kyoto, and at twenty metres it read as a
 * lollipop: a bare stem, six discrete pink spheres, and a heavy dark base.
 *
 * So: a small pot, several thin stems rather than one, the foliage starting
 * just above the rim, and a grain fine enough for a 0.4 m crown.
 * ---------------------------------------------------------------------- */
function buildPotted(T, spec) {
  const r = T.rng;
  const S = T.scale;
  const pw = r.range(0.26, 0.40) * S;          // 植木鉢, measured
  const ph = r.range(0.21, 0.31) * S;
  const wooden = spec.variant !== undefined ? spec.variant % 2 === 0 : r.chance(0.45);

  // slightly tapered, because a straight-sided box reads as a crate
  const pot = taperPot(pw, ph);
  T.wood.add(pot, placeMatrix(T.x, T.y, T.z, 0, T.rot, 0, 1, 1, 1),
    wooden ? BARK.potWood : BARK.potGlaze, T.woodOpts);
  pot.dispose();
  const rim = new THREE.BoxGeometry(pw * 1.08, ph * 0.10, pw * 1.08);
  T.wood.add(rim, placeMatrix(T.x, T.y + ph - ph * 0.05, T.z, 0, T.rot, 0, 1, 1, 1),
    wooden ? BARK.potRim : BARK.potGlazeRim, T.woodOpts);
  rim.dispose();
  // the soil, so the pot is not an open box seen from the shop's step
  const soil = new THREE.BoxGeometry(pw * 0.86, 0.04, pw * 0.86);
  T.wood.add(soil, placeMatrix(T.x, T.y + ph * 0.9, T.z, 0, T.rot, 0, 1, 1, 1), PAL.mossDeep, T.woodOpts);
  soil.dispose();

  /* What is in it.  Blossom is a rare treat, not the default. */
  const blossoming = spec.blossom ?? r.chance(0.10);
  const dwarfMaple = !blossoming && r.chance(0.30);
  const h = r.range(0.45, 1.05) * S;           // above the rim
  const y0 = T.y + ph;

  const grp = blossoming ? T.g.blossom : T.g.ground;
  const tones = blossoming ? TONE.potted
    : dwarfMaple ? (T.autumn ? TONE.mapleAutumn : TONE.pottedMaple)
    : TONE.pottedLeaf;
  const bark = blossoming ? BARK.sakura : dwarfMaple ? BARK.maple : BARK.shrub;

  /* Two to four thin stems from the rim.  One stem is a lollipop stick; a
   * clump is what a nandina or an aspidistra actually is. */
  const stems = blossoming ? 1 : r.int(2, 4);
  const rad = (blossoming ? 0.020 : 0.012) * S;
  const tips = [];
  const base = r.range(0, TAU);
  for (let i = 0; i < stems; i++) {
    const a = base + (i / stems) * TAU + r.gauss() * 0.5;
    const lean = r.range(0.06, 0.24) * (stems > 1 ? 1 : 0.35);
    const tx = T.x + Math.cos(a) * h * lean;
    const tz = T.z + Math.sin(a) * h * lean;
    const ty = y0 + h * r.range(0.62, 0.94);
    T.wood.add(unitTube(5, 0.55), tubeMatrix(T.x + Math.cos(a) * pw * 0.16, y0,
      T.z + Math.sin(a) * pw * 0.16, tx, ty, tz, rad * 2), bark, T.woodOpts);
    T.limbs++;
    tips.push([tx, ty, tz]);
  }

  /* The foliage.  `grain` sizes it for a crown this small -- about sixty
   * blobs of 110 mm rather than a dozen of 400 mm, which is the whole fix. */
  const R = h * 0.42;
  const { b, n } = grain(R, 1.2, 76);
  for (let i = 0; i < n; i++) {
    const [tx, ty, tz] = tips[i % tips.length];
    const a = r.range(0, TAU);
    const d = Math.sqrt(r.next()) * R;
    const y = lerp(y0 + h * 0.16, y0 + h, Math.pow(r.next(), 0.7));
    const s = b * r.range(0.72, 1.25);
    const cx = lerp(T.x, tx, 0.6) + Math.cos(a) * d;
    const cz = lerp(T.z, tz, 0.6) + Math.sin(a) * d;
    grp.push(
      placeMatrix(cx, y, cz,
        r.range(-0.4, 0.4), r.range(0, TAU), r.range(-0.4, 0.4),
        s * r.range(0.9, 1.3), s * r.range(0.7, 1.0), s * r.range(0.9, 1.3)),
      toneAt(tones, r, clamp((y - y0) / h, 0, 1)));
    T.blobs++;
  }

  // 南天 carries red berries through the spring, and three specks of red at a
  // doorway is worth more than the geometry costs
  if (!blossoming && !dwarfMaple && r.chance(0.5)) {
    for (let i = 0; i < r.int(2, 5); i++) {
      const a = r.range(0, TAU);
      const d = R * r.range(0.3, 0.95);
      const sB = 0.035 * S;
      T.g.ground.push(
        placeMatrix(T.x + Math.cos(a) * d, y0 + h * r.range(0.5, 0.95), T.z + Math.sin(a) * d,
          0, r.range(0, TAU), 0, sB, sB, sB),
        r.pick(TONE.pottedBerry));
      T.blobs++;
    }
  }

  T.collide(pw * 0.5);
  return ph + h;
}

/** A pot: square, tapered in toward the foot, its base sitting on the ground. */
function taperPot(w, h) {
  const hw0 = w / 2, hw1 = w * 0.38;
  const v = [
    -hw1, 0, -hw1, hw1, 0, -hw1, hw1, 0, hw1, -hw1, 0, hw1,
    -hw0, h, -hw0, hw0, h, -hw0, hw0, h, hw0, -hw0, h, hw0,
  ];
  const idx = [
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ------------------------------- 柳 ------------------------------------ *
 * The Shirakawa willow.  Same generator shape as the weeping cherry with
 * three numbers changed -- taller and thinner, limbs nearly horizontal, and
 * a hundred and twenty small blobs instead of forty big ones.  At 0.9 m a
 * blob IS a canopy, so a curtain of them is a cloud; at 0.3 m it is a leaf
 * spray, and a curtain of those is a willow.
 * ---------------------------------------------------------------------- */
function buildWillow(T, spec) {
  const r = T.rng;
  const S = T.scale;
  const h = r.range(7.0, 10.0) * S;
  const shoulder = h * r.range(0.40, 0.52);
  const rad = h * r.range(0.024, 0.034);
  const leanA = r.range(0, TAU);
  const lean = r.range(0.05, 0.16);

  const tx = T.x + Math.cos(leanA) * lean * h;
  const tz = T.z + Math.sin(leanA) * lean * h;
  T.wood.add(unitTube(7, 0.52), tubeMatrix(T.x, T.y, T.z, tx, T.y + shoulder, tz, rad * 2.2), BARK.willow, T.woodOpts);
  T.limbs++;

  const hangs = [];
  const nLimb = r.int(5, 8);
  const base = r.range(0, TAU);
  const reach = h * r.range(0.40, 0.58);
  for (let i = 0; i < nLimb; i++) {
    const a = base + (i / nLimb) * TAU + r.gauss() * 0.34;
    const ca = Math.cos(a), sa = Math.sin(a);
    const ex = tx + ca * reach, ez = tz + sa * reach;
    const ey = T.y + shoulder + h * r.range(0.04, 0.16);   // nearly horizontal
    T.wood.add(unitTube(5, 0.4), tubeMatrix(tx, T.y + shoulder, tz, ex, ey, ez, rad * 1.1), BARK.willow, T.woodOpts);
    T.limbs++;
    /* Fewer, denser strands.  The tighter element pitch above roughly doubles
     * the cost of a strand, so the count comes down to pay for it: a willow
     * reads on the continuity of each curtain, not on how many there are. */
    const nH = r.int(3, 5);
    for (let j = 0; j < nH; j++) {
      const t = r.range(0.24, 1.06);
      const ja = a + r.gauss() * 0.5;
      hangs.push([tx + Math.cos(ja) * reach * t, lerp(T.y + shoulder, ey, clamp(t, 0, 1)), tz + Math.sin(ja) * reach * t]);
    }
  }

  /* The curtain, and it is the entire tree.
   *
   * A willow is NOT a ball of clusters on a trunk and it is not a column of
   * spheres either: it is an arching frame carrying long, thin, almost
   * vertical ribbons of foliage that reach nearly to the ground.  The pass
   * before this hung near-spherical blobs down a path and got bunches of
   * grapes -- every lump separately legible, every lump separately inked.
   *
   * So each element of a strand is a PROLATE lump about three times as tall as
   * it is wide (rule 3), and the elements are spaced at well under their own
   * length, so a strand's silhouette is a continuous 0.3 m ribbon with no
   * crease anywhere along it.  The strands are narrow and there are a lot of
   * them, which is what makes the whole thing read as a veil you can see the
   * water through rather than as a wall. */
  const wide = 0.155 * Math.max(0.8, S);      // half-width of one strand
  for (const [hx, hy, hz] of hangs) {
    /* Clamped so the hem stays above head height.  A willow whose curtain
     * reaches the paving is a wall: you cannot see the Shirakawa past it, and
     * on a 4 m lane the hero camera ends up standing inside the foliage. */
    const hem = T.y + 2.15 * Math.max(0.75, S);
    const drop = Math.min(h * r.range(0.40, 0.70), Math.max(0.8, hy - hem));
    /* Spacing is what decides whether a strand reads as a ribbon or as a
     * string of beads, and 2.3 x the half-width was on the wrong side of it:
     * the elements are prolate, so they overlap generously in Y, but at that
     * pitch the lateral jitter pulled them far enough apart that each one kept
     * its own silhouette and its own ink outline.  1.4 closes the gap. */
    const n = Math.max(7, Math.round(drop / (wide * 1.4)));
    const sa = r.range(0, TAU);
    const swing = wide * r.range(1.4, 3.0);   // how far the strand drifts out
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      const b = wide * lerp(1.18, 0.62, t) * r.range(0.86, 1.14);
      T.g.leafLight.push(
        placeMatrix(hx + Math.cos(sa) * t * swing + r.gauss() * wide * 0.30,
          hy - drop * t,
          hz + Math.sin(sa) * t * swing + r.gauss() * wide * 0.30,
          r.range(-0.14, 0.14), r.range(0, TAU), r.range(-0.14, 0.14),
          b, b * r.range(2.5, 3.4), b),
        toneAt(TONE.willow, r, clamp(1 - t * 0.8, 0, 1)));
      T.blobs++;
    }
    // a cap over the hang point, so the near-horizontal limbs are not sticks
    puff(T, T.g.leafLight, hx, hy + wide * 0.4, hz, wide * 2.2, 4, TONE.willow, 0.9,
      { flatten: 0.62, spread: 1.15 });
  }
  T.collide(rad * 1.4);
  return h;
}

/* ------------------------------ 銀杏 ----------------------------------- *
 * Ginkgo: an upright flame, narrow at the bottom and flaring at the top.  In
 * April it is a fresh acid green; the autumn switch takes it to gold.
 * ---------------------------------------------------------------------- */
function buildGinkgo(T, spec) {
  const r = T.rng;
  const S = T.scale;
  const h = r.range(8, 13) * S;
  const rad = h * r.range(0.024, 0.034);
  const tones = T.autumn ? TONE.ginkgoAutumn : TONE.ginkgo;

  const tips = [];
  T.wood.add(unitTube(7, 0.42), tubeMatrix(T.x, T.y, T.z, T.x + r.gauss() * 0.16, T.y + h * 0.52, T.z + r.gauss() * 0.16, rad * 2), BARK.ginkgo, T.woodOpts);
  T.limbs++;
  const nLimb = r.int(4, 6);
  const base = r.range(0, TAU);
  for (let i = 0; i < nLimb; i++) {
    const a = base + (i / nLimb) * TAU + r.gauss() * 0.3;
    const tilt = r.range(0.22, 0.46);
    const dx = Math.cos(a) * tilt, dz = Math.sin(a) * tilt;
    const l = Math.hypot(dx, 1, dz);
    branch(T, T.x, T.y + h * 0.52, T.z, dx / l, 1 / l, dz / l,
      h * r.range(0.24, 0.36), rad * 0.6, Math.max(0, T.depth - 1), BARK.ginkgo,
      (ex, ey, ez) => tips.push([ex, ey, ez]));   // ginkgo fills every node
  }
  let top = -Infinity, bot = Infinity;
  for (const [, ty] of tips) { if (ty > top) top = ty; if (ty < bot) bot = ty; }
  const fine = fineness(h * 0.28);
  const blobR = h * r.range(0.048, 0.066) * fine.size;
  for (const [px, py, pz] of tips) {
    const up = clamp((py - bot) / Math.max(0.6, top - bot), 0, 1);
    puff(T, T.g.leafLight, px, py, pz, blobR, Math.round(r.int(8, 12) * fine.count),
      tones, up * 0.8 + 0.2, { flatten: 0.92, spread: 1.5 });
  }
  T.collide(rad * 1.4);
  return h;
}

const BUILDERS = {
  sakura: buildSakura,
  shidare: buildShidare,
  maple: buildMaple,
  pine: buildPine,
  cedar: buildCedar,
  bamboo: buildBamboo,
  shrub: buildShrub,
  camellia: buildCamellia,
  potted: buildPotted,
  willow: buildWillow,
  ginkgo: buildGinkgo,
};

/** Kinds whose canopy is worth a shadow when they are a hero. */
const HERO_BY_DEFAULT = new Set(['shidare']);

/* ------------------------------------------------------------------ *
 * buildVegetation
 * ------------------------------------------------------------------ */

/**
 * Build every tree in the world.
 *
 * @param ctx    the world context (`groundAt`, `add`, `collide`, `PAL`)
 * @param trees  the specs collected from every district's `ctx.tree(...)`
 * @param opts   `{ autumn, maxShadowCasters, collide, detail, name }`
 * @returns      `{ group, meshes, stats }`
 */
export function buildVegetation(ctx, trees = [], opts = {}) {
  const {
    autumn = false,
    maxShadowCasters = 48,
    collide = true,
    name = 'vegetation',
    detail = {},
  } = opts;

  const group = new THREE.Group();
  group.name = name;

  const stats = {
    trees: 0, skipped: 0, blobs: 0, culms: 0, limbs: 0,
    meshes: 0, triangles: 0, shadowCasters: 0, byKind: {},
  };
  if (!trees.length) {
    if (ctx.add) ctx.add(group); else ctx.scene?.add(group);
    return { group, meshes: [], stats };
  }

  /* ------------------------------ materials ----------------------------- *
   * `bands` and `tint` are the whole art direction, condensed.  Blossom is on
   * the high-key ramps with a PINK shadow tint; foliage is on a blue-green
   * one; nothing pale is ever allowed onto the default 3-band violet ramp.
   * `vertexColors` is on so the blob's baked top-light gradient survives, and
   * `instanceColor` multiplies the per-blob tone on top of it. */
  const blossomMat = cel({ color: 0xffffff, bands: 'soft3', tint: 0xc8a8c0, vertexColors: true });
  const crownMat = cel({ color: 0xffffff, bands: 'soft', tint: 0xd0b4c8, vertexColors: true });
  const leafLightMat = cel({ color: 0xffffff, bands: 'soft3', tint: TINT.green, vertexColors: true });
  const leafDarkMat = cel({ color: 0xffffff, bands: 3, tint: TINT.green, vertexColors: true });
  const leafWarmMat = autumn
    ? cel({ color: 0xffffff, bands: 'soft3', tint: TINT.warm, vertexColors: true })
    : null;
  // thin geometry gets smooth normals: at culm thickness you only ever see one
  // facet, and a flat-shaded facet turned from the sun is nearly black
  const culmMat = cel({ color: 0xffffff, bands: 'soft3', tint: TINT.green, vertexColors: true, flat: false });

  /* Blob resolution.  A blob is 20 triangles at detail 0, 32 at 0.5 and 80 at
   * detail 1, and there are twenty-five thousand of them in a full world, so
   * this is the single biggest triangle decision in the module.
   *
   * Blossom gets detail 1 and the greens get detail 0, and that split is
   * deliberate rather than lazy: at detail 0 a cherry canopy's facets are
   * plainly readable at ten metres and it stops looking painted, which is the
   * one judgement this file has to pass.  A dark pine plate at detail 0 is
   * *better* -- angular reads as brushwork there.
   *
   * `opts.detail = { blossom: 0.5 }` is the dial if a frame budget needs it:
   * it costs about 22% of the vegetation's triangles and gives the cherries a
   * faceted, cut-gem edge. */
  const dHero = detail.hero ?? 1, dBlossom = detail.blossom ?? 1;
  const dLight = detail.light ?? 0, dDark = detail.dark ?? 0;
  const blobs = new Map();
  const blob = (d) => {
    if (!blobs.has(d)) blobs.set(d, blobGeometry(d));
    return blobs.get(d);
  };
  const blobHero = blob(dHero);
  const blobFine = blob(dBlossom);
  const blobLight = blob(dLight);
  const blobCoarse = blob(dDark);
  const culmGeo = culmGeometry();

  const g = {
    blossom: new Cluster(name + ':blossom', blobFine, blossomMat),
    crown: new Cluster(name + ':blossomCrown', blobFine, crownMat),
    blossomHero: new Cluster(name + ':blossomHero', blobHero, blossomMat, { cast: true }),
    leafLight: new Cluster(name + ':leafLight', blobLight, leafLightMat),
    leafDark: new Cluster(name + ':leafDark', blobCoarse, leafDarkMat),
    leafHero: new Cluster(name + ':leafHero', blobCoarse, leafDarkMat, { cast: true }),
    // ground foliage is the one canopy that receives: it sits where being in a
    // building's shade is correct, and it never floats where a black disc
    // would show
    ground: new Cluster(name + ':ground', blobCoarse, leafDarkMat, { receive: true }),
    culm: new Cluster(name + ':bambooCulm', culmGeo, culmMat, { cast: true }),
    leafWarm: leafWarmMat ? new Cluster(name + ':leafWarm', blobLight, leafWarmMat) : null,
  };

  const wood = new Baker(name + ':wood');
  const woodOpts = { bands: 3, tint: TINT.warm, flat: false, shadow: true, receive: true };

  /* ---------------------------- shadow policy --------------------------- *
   * All wood casts.  Canopies cast only for heroes, and only for the first
   * `maxShadowCasters` of them in declaration order -- deterministic, and it
   * puts a hard ceiling on the shadow pass whatever a district asks for. */
  let casters = 0;

  const T = {
    wood, woodOpts, g,
    x: 0, y: 0, z: 0, rot: 0, scale: 1, cos: 1, sin: 0,
    rng: null, hero: false, cast: false, depth: 1, autumn, hasY: false,
    blobs: 0, culms: 0, limbs: 0,
    groundAt: (x, z) => ctx.groundAt(x, z),
    collide(r) {
      if (!collide || !ctx.collide || r < 0.14) return;
      ctx.collide(T.x - r, T.z - r, T.x + r, T.z + r);
    },
    collideBox(r) {
      if (!collide || !ctx.collide || r < 0.2) return;
      ctx.collide(T.x - r, T.z - r, T.x + r, T.z + r);
    },
  };

  let seedCounter = 0;
  for (const spec of trees) {
    const kind = spec.kind || 'shrub';
    const fn = BUILDERS[kind] || BUILDERS.shrub;
    if (!BUILDERS[kind]) stats.skipped++;

    const x = spec.x ?? 0, z = spec.z ?? 0;
    const y = spec.y !== undefined ? spec.y : ctx.groundAt(x, z);
    const seed = (spec.seed ?? (Math.round(x * 17.3) ^ Math.round(z * 91.7) ^ (seedCounter * 2654435761))) >>> 0;
    seedCounter++;
    const rng = rngKit(seed || 1);

    const hero = spec.hero ?? HERO_BY_DEFAULT.has(kind);
    const wantsShadow = spec.shadow ?? hero;
    const shadowed = wantsShadow && casters < maxShadowCasters;
    if (shadowed) { casters++; stats.shadowCasters++; }

    T.x = x; T.y = y; T.z = z;
    T.scale = spec.scale ?? 1;
    T.rot = spec.rot ?? rng.range(0, TAU);
    T.cos = Math.cos(T.rot); T.sin = Math.sin(T.rot);
    T.rng = rng;
    T.hero = hero;                     // richer branching, bark detail
    T.cast = shadowed;                 // allowed into a shadow-casting cluster
    T.hasY = spec.y !== undefined;
    T.depth = hero ? 2 : 1;
    T.autumn = spec.autumn ?? autumn;

    try {
      fn(T, spec);
      stats.trees++;
      stats.byKind[kind] = (stats.byKind[kind] || 0) + 1;
    } catch (e) {
      console.error('[vegetation] tree failed', kind, e);
    }
  }

  stats.blobs = T.blobs;
  stats.culms = T.culms;
  stats.limbs = T.limbs;

  /* ------------------------------- assemble ------------------------------ */
  const meshes = [];
  const woodTris = wood.triangles;
  const woodGroup = wood.build();
  for (const m of woodGroup.children) {
    lockShadow(m, true, true);
    m.name = name + ':wood';
    meshes.push(m);
  }
  group.add(woodGroup);

  stats.clusters = {};
  for (const key of Object.keys(g)) {
    const cl = g[key];
    if (!cl) continue;
    if (cl.count) stats.clusters[key] = cl.count;
    const m = cl.build(group);
    if (m) meshes.push(m);
  }

  stats.meshes = meshes.length;
  stats.triangles = Math.round(
    woodTris +
    meshes.reduce((acc, m) => acc + (m.isInstancedMesh
      ? (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3 * m.count
      : 0), 0)
  );

  if (ctx.add) ctx.add(group); else ctx.scene?.add(group);
  return { group, meshes, stats };
}

export default buildVegetation;
