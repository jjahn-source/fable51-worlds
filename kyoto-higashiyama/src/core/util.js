import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cel, TINT } from './toon.js';

/* ------------------------------------------------------------------ *
 * Maths, RNG, geometry helpers, and the baker.
 * ------------------------------------------------------------------ */

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (v - a) / (b - a || 1e-6);
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

/** Hermite smoothstep that tolerates a > b (descending ranges). */
export function sstep(a, b, v) {
  const t = clamp((v - a) / (b - a || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Deterministic PRNG so the world looks identical on every load. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngKit(seed) {
  const r = mulberry32(seed);
  return {
    next: r,
    range: (a, b) => a + (b - a) * r(),
    int: (a, b) => Math.floor(a + (b - a + 1) * r()),
    pick: (arr) => arr[Math.floor(r() * arr.length) % arr.length],
    /** Pick without repeating the previous choice -- for facade variation. */
    pickNot: (arr, prev) => {
      if (arr.length < 2) return arr[0];
      let v = arr[Math.floor(r() * arr.length) % arr.length];
      let guard = 0;
      while (v === prev && guard++ < 8) v = arr[Math.floor(r() * arr.length) % arr.length];
      return v;
    },
    chance: (p) => r() < p,
    sign: () => (r() < 0.5 ? -1 : 1),
    /** Gaussian-ish, for jitter that should cluster near zero. */
    gauss: () => (r() + r() + r() - 1.5) / 1.5,
    shuffle: (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

/* ------------------------------- 2D noise ------------------------------- */

/** Cheap value noise, for terrain jitter and ground colour mottle. */
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const h = (a, b) => {
    let n = (a * 374761393 + b * 668265263 + seed * 1442695040888963407) | 0;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967296;
  };
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(
    lerp(h(xi, yi), h(xi + 1, yi), u),
    lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u),
    v
  );
}

export function fbm2(x, y, octaves = 3, seed = 0) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    v += a * noise2(x * f, y * f, seed + i * 91);
    f *= 2.03;
    a *= 0.5;
  }
  return v;
}

/* ------------------------------- matrices ------------------------------- */

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Compose a matrix from loose position/euler/scale args. */
export function trs(px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _v.set(px, py, pz);
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _s.set(sx, sy, sz);
  return _m.clone().compose(_v, _q, _s);
}

/* ------------------------------ merging --------------------------------- */

/**
 * Merge a list of `{geometry, matrix}` into one buffer geometry.
 * ExtrudeGeometry and LatheGeometry differ in indexing from the primitives, so
 * a mixed batch is flattened to non-indexed before merging, and any attribute
 * not present on every member is dropped -- the merge rejects the batch
 * otherwise, with an error that does not say which one was the problem.
 */
export function bake(parts) {
  if (!parts.length) return null;
  let geos = parts.map(({ geometry, matrix }) => {
    const g = geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    return g;
  });
  const indexed = geos.filter((g) => g.index).length;
  if (indexed > 0 && indexed < geos.length) {
    geos = geos.map((g) => {
      if (!g.index) return g;
      const flatG = g.toNonIndexed();
      g.dispose();
      return flatG;
    });
  }
  const common = geos.reduce(
    (acc, g) => acc.filter((name) => g.attributes[name] !== undefined),
    Object.keys(geos[0].attributes)
  );
  for (const g of geos) {
    for (const name of Object.keys(g.attributes)) {
      if (!common.includes(name)) g.deleteAttribute(name);
    }
  }
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return merged;
}

/* ------------------------------------------------------------------ *
 * The baker.
 *
 * This is the single most important optimisation in the project and every
 * district builder is expected to use it.
 *
 * The naive way to build a Kyoto street is one `THREE.Mesh` per element --
 * a post, a batten, a tile course, a lantern -- with a shared cel material per
 * colour.  A single machiya facade is about 250 elements; sixty of them plus
 * the shops is fifteen thousand meshes, which is fifteen thousand draw calls
 * and about 40 fps of pure CPU overhead before anything is shaded.
 *
 * Instead: colour goes into a **vertex attribute** and everything with the same
 * *shading* signature -- ramp band count, shadow tint, transparency, side --
 * merges into one geometry with one material.  The whole of Ninenzaka, sixty
 * shopfronts and every prop on them, comes out as a handful of draw calls.
 *
 * Cost of the trick: the merged mesh is one frustum-cull unit and one shadow
 * caster, so a bucket must not span the whole world.  Bake **per district**, or
 * per block within a big district, which is what `ctx.baker()` hands out.
 * ------------------------------------------------------------------ */

const _col = new THREE.Color();

export class Baker {
  constructor(name = 'bake') {
    this.name = name;
    this.buckets = new Map();
  }

  /**
   * Queue a geometry.  `color` is an sRGB hex; it is converted to the linear
   * working space and written to every vertex.
   *
   * Shading options bucket the geometry: `bands`, `tint`, `transparent`,
   * `opacity`, `side`, `flat`.  Anything textured must not come through here --
   * use a separate mesh, or `addTextured`.
   */
  add(geometry, matrix, color, opts = {}) {
    const {
      bands = 3, tint = TINT.cool, transparent = false, opacity = 1,
      side = THREE.FrontSide, flat = true, shadow = true, receive = true,
    } = opts;
    const key = [bands, tint, transparent, opacity, side, flat, shadow, receive].join('|');
    let b = this.buckets.get(key);
    if (!b) {
      b = { parts: [], opts: { bands, tint, transparent, opacity, side, flat }, shadow, receive };
      this.buckets.set(key, b);
    }
    const g = geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    // strip everything the merged mesh will not use -- uv and anything exotic
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    _col.set(color);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3 + 0] = _col.r;
      arr[i * 3 + 1] = _col.g;
      arr[i * 3 + 2] = _col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    b.parts.push({ geometry: g, matrix: null });
    return this;
  }

  /** Convenience: queue a mesh (its geometry, its world matrix, a colour). */
  addMesh(mesh, color, opts) {
    mesh.updateMatrix();
    return this.add(mesh.geometry, mesh.matrix, color, opts);
  }

  /** How many triangles are queued -- for the perf HUD and the QA report. */
  get triangles() {
    let t = 0;
    for (const b of this.buckets.values()) {
      for (const p of b.parts) t += p.geometry.attributes.position.count / 3;
    }
    return Math.round(t);
  }

  /** Build the merged meshes.  Returns a Group; the buckets are then empty. */
  build() {
    const group = new THREE.Group();
    group.name = this.name;
    for (const b of this.buckets.values()) {
      if (!b.parts.length) continue;
      const geo = bake(b.parts);
      b.parts.forEach((p) => p.geometry.dispose());
      if (!geo) continue;
      const mat = cel({ ...b.opts, vertexColors: true, color: 0xffffff, cache: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = b.shadow && !b.opts.transparent;
      mesh.receiveShadow = b.receive;
      group.add(mesh);
    }
    this.buckets.clear();
    return group;
  }
}

/* ---------------------------- mesh primitives ---------------------------- */

/** A box mesh whose local origin sits at the centre of its base. */
export function boxOnGround(w, h, d, mat) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return new THREE.Mesh(g, mat);
}

export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

export function cyl(rt, rb, h, seg, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  return m;
}

export function plane(w, h, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  return m;
}

/* ------------------------- geometry constructors ------------------------- */

const _boxCache = new Map();
/** A shared 1×1×1 box centred on its base, for the baker to transform. */
export function unitBox() {
  if (!_boxCache.has('b')) {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.translate(0, 0.5, 0);
    _boxCache.set('b', g);
  }
  return _boxCache.get('b');
}

/** A shared unit cylinder, base at y=0, radius 0.5, for the baker. */
export function unitCyl(seg = 10) {
  const k = 'c' + seg;
  if (!_boxCache.has(k)) {
    const g = new THREE.CylinderGeometry(0.5, 0.5, 1, seg);
    g.translate(0, 0.5, 0);
    _boxCache.set(k, g);
  }
  return _boxCache.get(k);
}

/**
 * A box between two points, with a given cross-section.  This is the workhorse
 * for every beam, rafter, handrail and bamboo pole in the world: architecture
 * is mostly sticks between two places, and expressing that as position + euler
 * by hand is where sign errors live.
 */
export function beam(ax, ay, az, bx, by, bz, w, h) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  const g = new THREE.BoxGeometry(w, h, len);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(dx, dy, dz).normalize()
  );
  m.compose(
    new THREE.Vector3((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2),
    q,
    new THREE.Vector3(1, 1, 1)
  );
  g.applyMatrix4(m);
  return g;
}

/**
 * A tapered box -- wider at the base than the top.  Battered stone walls, the
 * shaft of a stone lantern, a pagoda storey.  `taper` is the top width as a
 * fraction of the bottom.
 */
export function taperBox(wBot, dBot, h, taper = 0.9, taperD = null) {
  const tD = taperD === null ? taper : taperD;
  const wTop = wBot * taper, dTop = dBot * tD;
  const hw0 = wBot / 2, hd0 = dBot / 2, hw1 = wTop / 2, hd1 = dTop / 2;
  const v = [
    // bottom quad, top quad
    -hw0, 0, -hd0, hw0, 0, -hd0, hw0, 0, hd0, -hw0, 0, hd0,
    -hw1, h, -hd1, hw1, h, -hd1, hw1, h, hd1, -hw1, h, hd1,
  ];
  const idx = [
    0, 2, 1, 0, 3, 2,        // bottom
    4, 5, 6, 4, 6, 7,        // top
    0, 1, 5, 0, 5, 4,        // -z
    1, 2, 6, 1, 6, 5,        // +x
    2, 3, 7, 2, 7, 6,        // +z
    3, 0, 4, 3, 4, 7,        // -x
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A lathed profile.  Stone lanterns, pagoda finials, temple bells, sake jars,
 * water basins -- a surprising amount of Japanese object vocabulary is a solid
 * of revolution, and doing them as lathes rather than stacked cylinders is what
 * makes a stone lantern read as carved rather than as Lego.
 *
 * `profile` is an array of [radius, y] pairs, bottom to top.
 */
export function lathe(profile, segments = 12) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(1e-4, r), y));
  return new THREE.LatheGeometry(pts, segments);
}

/**
 * Extrude a 2D shape (array of [x, y]) to a depth, centred on z.
 * Used for gable ends, bracket profiles, sign boards with a shaped top.
 */
export function prism(points, depth, { bevel = 0 } = {}) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 4,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/**
 * A ribbon: a strip of quads following a polyline of `{x, y, z}` points at a
 * given half-width, with an optional per-point width.  Every street surface,
 * every stair flight and every stone channel in the world is one of these, and
 * because it takes explicit y per point it is how the visible surface is made
 * to agree with `heightAt` rather than being modelled independently and then
 * discovered to disagree.
 */
export function ribbon(points, halfWidth, { widths = null, uvRepeat = 0 } = {}) {
  const n = points.length;
  if (n < 2) return null;
  const pos = [];
  const uv = [];
  const idx = [];
  let run = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    let tx = b.x - a.x, tz = b.z - a.z;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl; tz /= tl;
    // left normal in the ground plane
    const nx = -tz, nz = tx;
    const hw = widths ? widths[i] : halfWidth;
    pos.push(p.x + nx * hw, p.y, p.z + nz * hw);
    pos.push(p.x - nx * hw, p.y, p.z - nz * hw);
    if (i > 0) {
      const q = points[i - 1];
      run += Math.hypot(p.x - q.x, p.z - q.z);
    }
    const vRun = uvRepeat ? run / uvRepeat : run;
    uv.push(0, vRun, 1, vRun);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A vertical skirt hanging from a polyline -- the side of a raised path, a
 * revetment, the face of a terrace.  Takes the same points as `ribbon` and a
 * depth to drop to (absolute y, or a function of the point).
 */
export function skirt(points, halfWidth, bottomY, side = 1) {
  const n = points.length;
  const pos = [];
  const idx = [];
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    let tx = b.x - a.x, tz = b.z - a.z;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl; tz /= tl;
    const nx = -tz * side, nz = tx * side;
    const by = typeof bottomY === 'function' ? bottomY(p) : bottomY;
    pos.push(p.x + nx * halfWidth, p.y, p.z + nz * halfWidth);
    pos.push(p.x + nx * halfWidth, by, p.z + nz * halfWidth);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    if (side > 0) idx.push(a, b, c, b, d, c);
    else idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A flight of steps between two points, as one geometry.
 * Returns `{ geometry, treads }` where `treads` is the list of tread top
 * surfaces so the terrain can be told about them.
 */
export function stairs(x0, y0, z0, x1, y1, z1, width, riserTarget = 0.16) {
  const dx = x1 - x0, dz = z1 - z0, dy = y1 - y0;
  const run = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.round(Math.abs(dy) / riserTarget));
  const rise = dy / steps;
  const tread = run / steps;
  const tx = dx / run, tz = dz / run;
  const nx = -tz * width / 2, nz = tx * width / 2;
  const parts = [];
  const treads = [];
  for (let i = 0; i < steps; i++) {
    const sx = x0 + tx * tread * i, sz = z0 + tz * tread * i;
    const sy = y0 + rise * i;
    const cx = sx + tx * tread / 2, cz = sz + tz * tread / 2;
    const cy = sy + rise / 2;
    // one box per step, its top at the tread height
    const g = new THREE.BoxGeometry(width, Math.abs(rise) + 0.02, tread);
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, Math.atan2(tx, tz), 0)
    );
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(cx, sy + rise - Math.abs(rise) / 2 - 0.01, cz),
      q, new THREE.Vector3(1, 1, 1)
    );
    g.applyMatrix4(m);
    parts.push({ geometry: g });
    treads.push({ x: cx, z: cz, y: sy + rise, hw: width / 2, hd: tread / 2, nx, nz });
  }
  return { geometry: bake(parts), steps, rise, tread, treads };
}

/* ------------------------------- shadows -------------------------------- */

/**
 * Recursively enable shadow casting/receiving on a subtree.
 *
 * Transparent meshes are skipped: cloth, glass, netting and foliage cards are
 * there to be seen through, and letting them cast drops a hard black shadow
 * over whatever they cover -- a noren over a shop doorway is the case that
 * shows it worst.
 */
export function shadowify(obj, cast = true, receive = true) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const seeThrough = o.userData.noShadow ||
      (o.material && !Array.isArray(o.material) && o.material.transparent);
    o.castShadow = cast && !seeThrough;
    o.receiveShadow = receive;
  });
  return obj;
}

/** Mark a subtree as never casting or receiving -- distant flats, sky, water. */
export function noShadow(obj) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false;
    o.receiveShadow = false;
  });
  return obj;
}

/* --------------------------------- curves -------------------------------- */

/** A catenary-ish sagging curve between two points -- overhead wires, rope. */
export function sagCurve(a, b, sag, segments = 14) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(Math.PI * t) * sag;
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts);
}

/** Resample a polyline of {x,z} (plus anything else) to an even spacing. */
export function resample(points, spacing) {
  if (points.length < 2) return points.slice();
  const out = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    if (seg < 1e-6) continue;
    let t = (spacing - carry) / seg;
    while (t <= 1) {
      out.push({
        x: lerp(a.x, b.x, t),
        z: lerp(a.z, b.z, t),
        y: a.y !== undefined ? lerp(a.y, b.y ?? a.y, t) : undefined,
      });
      t += spacing / seg;
    }
    carry = (carry + seg) % spacing;
  }
  const last = points[points.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last.x - tail.x, last.z - tail.z) > spacing * 0.4) out.push(last);
  return out;
}

/** Total planar length of a polyline. */
export function polyLength(points) {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  }
  return d;
}

/**
 * Closest point on a polyline to (x, z).
 * Returns `{ dist, t, index, px, pz, s }` where `s` is arc length along the
 * line and `t` the fraction within the segment.  This is the primitive the
 * terrain's street corridors are built on, so it is called a lot: no
 * allocation, no Vector3.
 */
export function closestOnPolyline(points, x, z) {
  let best = Infinity, bi = 0, bt = 0, bx = 0, bz = 0, bs = 0, run = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len2 = dx * dx + dz * dz;
    let t = len2 > 1e-9 ? ((x - a.x) * dx + (z - a.z) * dz) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = a.x + dx * t, pz = a.z + dz * t;
    const d = (x - px) * (x - px) + (z - pz) * (z - pz);
    if (d < best) {
      best = d; bi = i; bt = t; bx = px; bz = pz;
      bs = run + Math.sqrt(len2) * t;
    }
    run += Math.sqrt(len2);
  }
  return { dist: Math.sqrt(best), t: bt, index: bi, px: bx, pz: bz, s: bs, total: run };
}

/** Bearing in degrees from north (+Z is south, so north is -Z). */
export function bearing(ax, az, bx, bz) {
  return (Math.atan2(bx - ax, -(bz - az)) * RAD + 360) % 360;
}

/** Yaw (radians, three.js camera convention) that looks from a to b. */
export function yawTo(ax, az, bx, bz) {
  return Math.atan2(-(bx - ax), -(bz - az));
}


/* ------------------------------------------------------------------ *
 * Merging by material.
 *
 * The vertex-colour `Baker` handles untextured geometry, which is most of the
 * world.  It cannot handle the rest: signs, noren, lattice sheets, shop
 * fascias and lantern faces all carry a `map`, and a map needs uv, which the
 * baker strips.  So every one of those stays its own `THREE.Mesh`.
 *
 * `celTex` already makes them *share materials* -- forty shopfronts using the
 * same sign atlas are one program and one material.  Sharing a material does
 * not merge a draw call, though, and with 364 shopfronts each carrying a
 * handful of textured pieces the world reached **1 786 meshes and 1 456 draw
 * calls in the worst view** -- comfortably CPU-bound before anything was
 * shaded.
 *
 * This pass runs after every district has built and merges the static textured
 * meshes that already share a material.  Of 1 786 meshes, 1 386 were
 * mergeable on that rule alone.
 *
 * ---------------------------------------------------------- WHAT IT SKIPS
 *
 *   - anything `userData.animated` -- a merged mesh has one transform, so
 *     merging a noren that sways would swing the whole street with it
 *   - anything invisible (interaction hitboxes)
 *   - `InstancedMesh`, which is already the thing this is trying to achieve
 *   - anything `userData.noMerge`
 *   - a group with only one member, where merging costs a copy and saves
 *     nothing
 *
 * Merging is done **per group** rather than world-wide, so each merged mesh
 * stays a sensible frustum-cull unit.  Merging the whole world into one mesh
 * would trade a draw-call problem for a culling problem.
 * ------------------------------------------------------------------ */
export function mergeByMaterial(group, { minGroup = 2 } = {}) {
  const buckets = new Map();
  const victims = [];

  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    if (!o.visible || o.userData.animated || o.userData.noMerge) return;
    if (o.userData.isOutline) return;
    const m = o.material;
    if (!m || Array.isArray(m)) return;
    if (!o.geometry || !o.geometry.attributes.position) return;
    /* **Textured meshes only.**
     *
     * The vertex-colour baker's own output must not come through here.  Its
     * meshes share materials *across districts* -- they are all `cel({
     * vertexColors: true })` with the same ramp and tint -- so merging by
     * material silently welds every district in the world into a handful of
     * enormous meshes, each one a single frustum-cull unit spanning two
     * kilometres.  Draw calls fall and rendered triangles *rise*, because
     * nothing can be culled any more: measured, 3.9 M to 4.7 M.
     *
     * Baker output is already optimal and already scoped to a district.  What
     * needs merging is the textured meshes the baker cannot take -- signs,
     * noren, fascias, lantern faces -- and those carry a map. */
    if (!m.map) return;
    // shadow flags become a property of the merged mesh, so they have to match
    const key = `${m.uuid}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}|${o.renderOrder}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { mat: m, cast: o.castShadow, recv: o.receiveShadow,
                                    order: o.renderOrder, parts: [] }));
    b.parts.push(o);
  });

  let merged = 0, saved = 0;
  for (const b of buckets.values()) {
    if (b.parts.length < minGroup) continue;
    const parts = [];
    for (const o of b.parts) {
      o.updateWorldMatrix(true, false);
      parts.push({ geometry: o.geometry, matrix: o.matrixWorld });
    }
    let geo = null;
    try {
      geo = bake(parts);
    } catch {
      /* A batch that will not merge is not worth failing the world over: leave
       * those meshes exactly as they are and carry on. */
      continue;
    }
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.recv;
    mesh.renderOrder = b.order;
    mesh.name = 'merged';
    mesh.userData.mergedFrom = b.parts.length;
    group.add(mesh);
    for (const o of b.parts) {
      o.removeFromParent();
      o.geometry.dispose();
    }
    merged++;
    saved += b.parts.length - 1;
    victims.push(...b.parts);
  }
  return { merged, saved };
}
