import * as THREE from 'three';
import { STREETS, HILL_PROFILE, HILL_TILT, BOUNDS } from '../data/route.js';
import { clamp, lerp, sstep, fbm2, resample, closestOnPolyline, polyLength } from '../core/util.js';

/* ------------------------------------------------------------------ *
 * The terrain.
 *
 * **One height function.  Everything queries it.**  The player, the buildings,
 * the steps, the walls, the vegetation, the props, the collision and the
 * street surfaces all call `heightAt`.  Nothing in this project is allowed to
 * decide for itself what the ground is doing.
 *
 * The reason that rule is written this hard is that the failure it prevents is
 * invisible from the code and fatal on screen: a hillside solved visually while
 * collision stays flat gives you a world where you walk through the paving and
 * float over the steps, and it looks *fine* in every screenshot.
 *
 * --------------------------------------------------------------- SHAPE
 *
 * The field is built in three layers:
 *
 *   1. **The hillside.**  A west-to-east elevation profile (the Kyoto basin at
 *      41 m, climbing into Higashiyama behind Kiyomizu-dera at 300 m) with a
 *      small north-south tilt and some low-frequency noise.  This is what the
 *      ground does where nothing has been built.
 *
 *   2. **Street corridors.**  Every entry in `STREETS` is resampled to a
 *      1.5 m polyline and becomes a corridor: within the paved half-width the
 *      ground *is* the street's own elevation, and from there it blends back
 *      out to the hillside over a few metres.  Where corridors overlap -- at a
 *      junction -- the result is their weighted average, so the junction is
 *      flat and continuous rather than a crease.  This is why the street
 *      elevations in `route.js` have to agree where two streets meet: they are
 *      averaged, not chosen between.
 *
 *   3. **Platforms and cuts.**  Boxes that raise or lower the ground -- a
 *      temple deck, a shrine's raised precinct, the sunk bed of the Shirakawa.
 *      Platforms are only offered to a walker already within a step of them,
 *      which is what lets you walk *under* Kiyomizu-dera's stage as well as on
 *      it.
 *
 * -------------------------------------------------------------- STEPS
 *
 * A street marked with a `steps` range is quantised: inside that stretch the
 * corridor's elevation is snapped to discrete treads.  Ninenzaka and
 * Sannenzaka are real flights of stone steps and a smooth ramp there reads as
 * a wheelchair access route, which is the one thing those streets are famous
 * for not being.  Quantising in the *height field* rather than modelling steps
 * on top of a ramp means the player's feet and the visible stone are the same
 * surface by construction.
 * ------------------------------------------------------------------ */

const CORRIDOR_BLEND = 5.0;     // metres from the paved edge back to the hillside
const SAMPLE = 1.5;             // corridor resampling spacing

/* ------------------------------ the hillside ----------------------------- */

/** The west-to-east elevation profile, interpolated. */
function profileAt(x) {
  const P = HILL_PROFILE;
  if (x <= P[0][0]) return P[0][1];
  if (x >= P[P.length - 1][0]) return P[P.length - 1][1];
  for (let i = 0; i < P.length - 1; i++) {
    if (x <= P[i + 1][0]) {
      const t = (x - P[i][0]) / (P[i + 1][0] - P[i][0]);
      // smoothstep rather than linear: a piecewise-linear hillside creases at
      // every control point, and the creases catch the light
      return lerp(P[i][1], P[i + 1][1], t * t * (3 - 2 * t));
    }
  }
  return P[P.length - 1][1];
}

/* ------------------------------------------------------------------ *
 * The base hillside, derived from the street network.
 *
 * The first version of this was a west-to-east elevation profile plus a
 * north-south tilt, and it was wrong in a way that only a render showed: at
 * the top of Sannenzaka the profile put the bare ground at 70.7 m while the
 * street was at 75.4, so **the street ran along the top of a five-metre
 * embankment** with a canyon down both sides.  A profile in x with a linear
 * correction in z cannot describe this landform, because the route does not
 * climb along the hill -- it climbs *into* it, diagonally, and the elevation at
 * a given x differs by twelve metres between Ninenzaka and Sannenzaka.
 *
 * So the hillside is derived from the thing that actually knows where the
 * ground is: **the surveyed streets themselves.**  A coarse grid is built once
 * at start-up, and each cell takes an inverse-distance-weighted blend of the
 * elevations of every corridor within reach, falling back to the raw west-east
 * profile only where nothing is near -- which is the wooded slope above the
 * temple and the basin off to the west, where there is no survey to disagree
 * with anyway.
 *
 * Cost: about 14 000 cells built once, then a bilinear lookup per query.
 * ------------------------------------------------------------------ */

const GRID = {
  x0: -960, z0: -960, cell: 16,
  nx: Math.ceil((1300 + 960) / 16), nz: Math.ceil((900 + 960) / 16),
  data: null,
};

function buildBaseGrid() {
  const { x0, z0, cell, nx, nz } = GRID;
  const data = new Float32Array((nx + 1) * (nz + 1));
  /* Every corridor point in the world, flattened once.  A few thousand of
   * them, which is small enough to scan per cell. */
  const knots = [];
  for (const c of corridors) {
    // one knot every ~8 m is plenty for a field this coarse
    const stride = Math.max(1, Math.round(8 / SAMPLE));
    for (let i = 0; i < c.points.length; i += stride) {
      const p = c.points[i];
      knots.push(p.x, p.z, c.heightAlong(i * SAMPLE));
    }
    const last = c.points[c.points.length - 1];
    knots.push(last.x, last.z, last.y);
  }

  const REACH = 190;          // metres of influence
  const REACH2 = REACH * REACH;
  for (let j = 0; j <= nz; j++) {
    const z = z0 + j * cell;
    for (let i = 0; i <= nx; i++) {
      const x = x0 + i * cell;
      let wsum = 0, hsum = 0, nearest = Infinity;
      for (let k = 0; k < knots.length; k += 3) {
        const dx = x - knots[k], dz = z - knots[k + 1];
        const d2 = dx * dx + dz * dz;
        if (d2 > REACH2) continue;
        if (d2 < nearest) nearest = d2;
        /* 1/d^2 with a floor, which is the standard IDW and behaves: it goes
         * to the nearest knot's value close in, and to a broad average far
         * out, with no discontinuity anywhere. */
        const w = 1 / (d2 + 90);
        wsum += w;
        hsum += w * knots[k + 2];
      }
      const prof = profileAt(x) + z * HILL_TILT;
      if (wsum > 0) {
        const surveyed = hsum / wsum;
        /* Hand back to the raw profile as the nearest street recedes.  By
         * 190 m out there is no street worth trusting and the profile -- which
         * is fitted to the DEM along the ridge -- is the better answer. */
        const t = sstep(60 * 60, REACH2, nearest);
        data[j * (nx + 1) + i] = lerp(surveyed, prof, t);
      } else {
        data[j * (nx + 1) + i] = prof;
      }
    }
  }
  GRID.data = data;
}

/**
 * The bare hillside.  Noise amplitude grows with elevation: the built-up lower
 * ground has been graded flat by centuries of building on it, the wooded slope
 * above the temple has not.
 */
export function hillAt(x, z) {
  if (!GRID.data) buildBaseGrid();
  const { x0, z0, cell, nx, nz, data } = GRID;
  const fx = clamp((x - x0) / cell, 0, nx - 1e-4);
  const fz = clamp((z - z0) / cell, 0, nz - 1e-4);
  const i = fx | 0, j = fz | 0;
  const tx = fx - i, tz = fz - j;
  const w = nx + 1;
  const h00 = data[j * w + i], h10 = data[j * w + i + 1];
  const h01 = data[(j + 1) * w + i], h11 = data[(j + 1) * w + i + 1];
  let h = lerp(lerp(h00, h10, tx), lerp(h01, h11, tx), tz);

  const rough = sstep(90, 240, h);
  h += (fbm2(x * 0.0055, z * 0.0055, 3, 11) - 0.5) * (1.1 + rough * 15.0);
  h += (fbm2(x * 0.021, z * 0.021, 2, 23) - 0.5) * (0.35 + rough * 2.6);
  return h;
}

/* ------------------------------- corridors ------------------------------- */

/**
 * A corridor is a street turned into a height-field feature.  Built once at
 * start-up; queried tens of thousands of times while the world is built and a
 * handful of times a frame after that.
 */
class Corridor {
  constructor(id, spec) {
    this.id = id;
    this.spec = spec;
    this.half = spec.half;
    this.frontage = spec.frontage ?? spec.half + 0.7;
    this.surface = spec.surface || 'sett';
    this.kind = spec.kind || 'street';

    // resample so a long straight segment still gets a smooth cross-blend
    const pts = resample(spec.points.map((p) => ({ ...p })), SAMPLE);
    // resample() lerps y linearly, which is right for a ramp
    this.points = pts;
    this.length = polyLength(pts);

    /* Stepped stretches are handled **analytically**, from arc length, not by
     * quantising the resampled points.
     *
     * The reason is a straight collision between two numbers.  The corridor
     * resamples at 1.5 m, and a Kyoto slope-stair has treads of 0.70 m
     * (Sannenzaka) to 0.94 m (Ninenzaka) -- so the sampling is *coarser than
     * the tread* and a quantised polyline simply cannot represent the flight.
     * The first version of this file snapped the sample points and produced two
     * enormous steps where there should have been forty-six.
     *
     * So the flight is stored as its endpoints and a step count, and the height
     * inside it is computed from `s`.  `stepRuns` is also what `streets.js`
     * reads to build the visible nosings, which is how the stone the player
     * sees and the surface their feet are on stay the same thing by
     * construction rather than by agreement. */
    this.stepRuns = [];
    if (spec.steps) {
      for (const seg of spec.steps) {
        const s0 = seg.from * this.length;
        const s1 = seg.to * this.length;
        const y0 = this.rawHeightAt(s0);
        const y1 = this.rawHeightAt(s1);
        const rise = y1 - y0;
        const n = Math.max(1, Math.round(Math.abs(rise) / seg.riser));
        this.stepRuns.push({ s0, s1, y0, y1, n, riser: rise / n, tread: (s1 - s0) / n });
      }
    }

    // AABB, so a query far away costs one comparison
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of pts) {
      if (p.x < x0) x0 = p.x;
      if (p.x > x1) x1 = p.x;
      if (p.z < z0) z0 = p.z;
      if (p.z > z1) z1 = p.z;
    }
    const pad = this.half + CORRIDOR_BLEND + 1;
    this.box = { x0: x0 - pad, x1: x1 + pad, z0: z0 - pad, z1: z1 + pad };
  }

  /** The un-stepped ramp height at arc length `s`. */
  rawHeightAt(s) {
    const pts = this.points;
    let run = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const seg = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
      if (run + seg >= s || i === pts.length - 2) {
        const t = seg > 1e-6 ? clamp((s - run) / seg, 0, 1) : 0;
        return lerp(pts[i].y, pts[i + 1].y, t);
      }
      run += seg;
    }
    return pts[pts.length - 1].y;
  }

  /** The height at arc length `s`, flights quantised into treads. */
  heightAlong(s) {
    for (let i = 0; i < this.stepRuns.length; i++) {
      const r = this.stepRuns[i];
      if (s < r.s0 || s > r.s1) continue;
      const k = Math.floor(((s - r.s0) / (r.s1 - r.s0)) * r.n + 1e-9);
      return r.y0 + r.riser * Math.min(k, r.n);
    }
    return this.rawHeightAt(s);
  }

  /** `{ w, y }` -- influence weight 0..1 and the corridor's height there. */
  sample(x, z, out) {
    const b = this.box;
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) { out.w = 0; return out; }
    const c = closestOnPolyline(this.points, x, z);
    const d = c.dist;
    if (d > this.half + CORRIDOR_BLEND) { out.w = 0; return out; }
    out.w = 1 - sstep(this.half, this.half + CORRIDOR_BLEND, d);
    out.y = this.heightAlong(c.s);
    out.dist = d;
    out.s = c.s;
    return out;
  }

  /** The centreline point at arc length `s`, with its stepped height. */
  pointAt(s) {
    const pts = this.points;
    let run = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = pts[i + 1].x - pts[i].x, dz = pts[i + 1].z - pts[i].z;
      const seg = Math.hypot(dx, dz);
      if (run + seg >= s || i === pts.length - 2) {
        const t = seg > 1e-6 ? clamp((s - run) / seg, 0, 1) : 0;
        return {
          x: lerp(pts[i].x, pts[i + 1].x, t),
          z: lerp(pts[i].z, pts[i + 1].z, t),
          y: this.heightAlong(s),
          tx: dx / (seg || 1), tz: dz / (seg || 1), s,
        };
      }
      run += seg;
    }
    const last = pts[pts.length - 1];
    return { x: last.x, z: last.z, y: last.y, tx: 0, tz: 1, s };
  }
}

/* --------------------------------- state --------------------------------- */

const corridors = [];
const platforms = [];
const cuts = [];
/** Extra corridors registered by district builders (courtyards, side paths). */
const extra = [];

const _s1 = { w: 0, y: 0, dist: 0, s: 0 };
const _s2 = { w: 0, y: 0, dist: 0, s: 0 };

export function initTerrain() {
  corridors.length = 0;
  GRID.data = null;
  for (const [id, spec] of Object.entries(STREETS)) {
    if (spec.kind === 'water') continue;   // the canal is a cut, not a corridor
    corridors.push(new Corridor(id, spec));
  }
  return corridors;
}

/**
 * Register an extra corridor at build time -- a temple path, a courtyard edge,
 * a private lane that is not part of the route data.  Same shape as a STREETS
 * entry.
 */
export function addCorridor(id, spec) {
  const c = new Corridor(id, spec);
  corridors.push(c);
  extra.push(c);
  /* The derived hillside is built from the corridors, so adding one must
   * invalidate it -- otherwise a district's private path is a street the
   * ground around it has never heard of. */
  GRID.data = null;
  return c;
}

/** A flat area that raises the ground -- a deck, a plinth, a raised precinct. */
export function addPlatform(p) {
  platforms.push(p);
  return p;
}

/** A box that pulls the ground down -- a canal bed, a sunken court. */
export function addCut(c) {
  cuts.push(c);
  return c;
}

export function clearTerrain() {
  corridors.length = 0;
  platforms.length = 0;
  cuts.length = 0;
  extra.length = 0;
}

/* ------------------------------- the query ------------------------------- */

/**
 * **The** height function.
 *
 * `fromY` is the querier's current feet height.  Pass it and platforms are only
 * offered within a step of where you already are, which is what makes an
 * elevated deck walkable *and* walk-under-able.  Omit it and every platform
 * applies, which is what a prop being seated on a deck wants.
 */
export function heightAt(x, z, fromY) {
  let wsum = 0, hsum = 0;
  for (let i = 0; i < corridors.length; i++) {
    const s = corridors[i].sample(x, z, i & 1 ? _s1 : _s2);
    if (s.w > 0) {
      // weight^2 sharpens the junction blend: two corridors crossing at right
      // angles average cleanly, but a corridor merely passing 4 m away from
      // another does not drag it
      const w = s.w * s.w;
      wsum += w;
      hsum += w * s.y;
    }
  }

  /* Blending the corridors against the hillside.
   *
   * The obvious formula -- normalise when the corridor weights reach 1, and
   * fall back to the hillside below that -- has a **kink in its derivative at
   * wsum = 1**, and a kink in a height field is a crease, and a crease is a
   * line of curvature, and the ink pass draws lines of curvature.  The first
   * render of this world had a black line down both sides of every street in
   * it, converging on the vanishing point, and it looked like a wireframe.
   *
   * So the hillside gets a weight that decays *smoothly* instead of being
   * switched off: `exp(-6 w)` is 1 with no corridors, 0.0025 by the time one
   * corridor is at full strength, and has no discontinuity anywhere. */
  const base = hillAt(x, z);
  const wBase = Math.exp(-6 * wsum);
  let h = (hsum + base * wBase) / (wsum + wBase);

  for (let i = 0; i < cuts.length; i++) {
    const c = cuts[i];
    if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) h = Math.min(h, c.top);
  }

  for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i];
    if (x <= p.x0 || x >= p.x1 || z <= p.z0 || z >= p.z1) continue;
    if (fromY !== undefined && p.top > fromY + (p.step ?? 0.42)) continue;
    if (p.top > h) h = p.top;
  }

  return h;
}

/**
 * What surface is underfoot: `{ id, surface, dist, half, s, t }`, or null on
 * the bare hillside.  Used by the ground builder to pick paving, by the audio
 * system to pick a footstep, and by the HUD.
 */
export function surfaceAt(x, z) {
  let best = null, bw = 0;
  for (let i = 0; i < corridors.length; i++) {
    const c = corridors[i];
    const s = c.sample(x, z, _s1);
    if (s.w > bw) {
      bw = s.w;
      best = { id: c.id, surface: c.surface, dist: s.dist, half: c.half, s: s.s, y: s.y, kind: c.kind };
    }
  }
  return bw > 0.5 ? best : null;
}

/**
 * Distance to the nearest street, for anything that wants to know how built-up
 * a place is.  Cheap: the corridors' AABBs reject nearly everything.
 */
export function nearestCorridorDist(x, z, max = 60) {
  let best = max;
  for (let i = 0; i < corridors.length; i++) {
    const c = corridors[i];
    const b = c.box;
    if (x < b.x0 - max || x > b.x1 + max || z < b.z0 - max || z > b.z1 + max) continue;
    const d = closestOnPolyline(c.points, x, z).dist - c.half;
    if (d < best) best = d;
    if (best <= 0) return 0;
  }
  return Math.max(0, best);
}

/** The corridor object for a street id -- district builders need its geometry. */
export function corridor(id) {
  return corridors.find((c) => c.id === id) || null;
}

export function allCorridors() { return corridors; }

/**
 * The surface normal, by central difference.  Props that sit flat on a slope
 * (a fallen petal patch, a stone slab, a puddle) need it; anything upright
 * does not and should stay upright.
 */
const _n = new THREE.Vector3();
export function normalAt(x, z, e = 0.5) {
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return _n.set(-hx / (2 * e), 1, -hz / (2 * e)).normalize();
}

/** Slope in degrees, for deciding whether something can stand somewhere. */
export function slopeAt(x, z, e = 1.0) {
  const n = normalAt(x, z, e);
  return Math.acos(clamp(n.y, -1, 1)) * 180 / Math.PI;
}

/* ------------------------------- the mesh -------------------------------- */

/**
 * The visible hillside between the streets.
 *
 * An adaptive-ish grid: fine where the route is, coarse out on the wooded
 * slope where nothing is closer than eighty metres.  Vertex-coloured, because
 * the ground changes material continuously (paving to gravel to moss to
 * hillside) and painting that with separate meshes would mean seams everywhere.
 */
export function buildGround(ctx, { cell = 6, farCell = 24 } = {}) {
  const { x0, x1, z0, z1 } = BOUNDS;
  const group = new THREE.Group();
  group.name = 'ground';

  // near field: the walkable world
  const near = { x0: -760, x1: 560, z0: -780, z1: 500 };
  group.add(gridMesh(near, cell, ctx));
  // far field: the wooded slope and the basin edge, coarse
  const rings = [
    { x0: 560, x1: 1100, z0: -900, z1: 620, cell: farCell },
    { x0: -900, x1: -760, z0: -900, z1: 620, cell: farCell },
    { x0: -900, x1: 1100, z0: 500, z1: 760, cell: farCell },
    { x0: -900, x1: 1100, z0: -960, z1: -780, cell: farCell },
  ];
  for (const r of rings) group.add(gridMesh(r, r.cell, ctx));

  return group;
}

const _c = new THREE.Color();

/** Ground colour at a point -- the material the hillside is wearing there. */
export function groundColorAt(x, z, PAL, surf) {
  const s = surf !== undefined ? surf : surfaceAt(x, z);
  const h = heightAt(x, z);
  const mottle = fbm2(x * 0.06, z * 0.06, 2, 5);

  if (s) {
    const edge = s.dist / s.half;
    let base;
    switch (s.surface) {
      case 'asphalt': base = PAL.asphalt; break;
      case 'gravel':  base = PAL.gravel; break;
      case 'slab':    base = PAL.paving; break;
      case 'water':   base = PAL.water; break;
      default:        base = PAL.sett;
    }
    _c.set(base);
    // the gutter line: every Kyoto street darkens at its edges
    if (edge > 0.78) _c.multiplyScalar(0.88);
    _c.multiplyScalar(0.94 + mottle * 0.12);
    return _c.getHex();
  }

  /* Off the street.
   *
   * The first version returned moss and grass everywhere, and in the built-up
   * districts that was badly wrong: the strips of ground visible between and
   * behind the machiya came out as bright lawn, so a dense Kyoto street had
   * suburban verges down both sides.  Almost none of the ground in Higashiyama
   * that is not paved is *grass* -- it is packed earth, gravel, the shaded strip
   * under an eave, a swept yard, a wall base.
   *
   * So the ground between the buildings is keyed to how close the nearest
   * street is, which is the cheapest available proxy for how built-up somewhere
   * is: within about twenty metres of a corridor the ground is urban, and only
   * out on the open hillside does it become vegetation. */
  const near = nearestCorridorDist(x, z);
  const urban = 1 - sstep(14, 46, near);
  const wooded = sstep(95, 155, h);

  /* The vegetation tone darkens and desaturates with distance from any street.
   * Close in it is the bright moss of a temple garden, which is right; spread
   * unchanged over the whole hillside it reads from the air as a golf course.
   * Higashiyama's slopes are closed broadleaf and cedar, and the ground under
   * them is dark. */
  const far = sstep(40, 170, near);
  const veg = new THREE.Color(PAL.moss).lerp(new THREE.Color(PAL.mossDeep), wooded);
  if (mottle > 0.62) veg.lerp(new THREE.Color(PAL.grass), 0.5);
  veg.lerp(new THREE.Color(PAL.leafCedar), far * 0.55);
  veg.multiplyScalar(1 - far * 0.16);

  // packed earth and swept yard, with a little moss surviving in the shade
  const built = new THREE.Color(PAL.plasterDark)
    .lerp(new THREE.Color(PAL.gravelDark), mottle)
    .lerp(new THREE.Color(PAL.stoneMoss), mottle > 0.74 ? 0.35 : 0.0);

  _c.copy(veg).lerp(built, urban);
  _c.multiplyScalar(0.93 + mottle * 0.14);
  return _c.getHex();
}

/* How far the terrain grid drops away under a street.
 *
 * The paving ribbons in `streets.js` are sampled from `heightAt` and lifted
 * 0.02 m.  The terrain grid is sampled from the same function but only every
 * few metres, and it interpolates *linearly* in between -- so on a cambered or
 * curving street it rides above its own samples and pokes straight through the
 * paving.  The symptom is that the carriageway renders as flat untextured
 * ground and looks like the paving was never built, which is exactly what it
 * looked like here for two rounds.
 *
 * 0.16 m of clearance is more than the worst interpolation error at a 6 m cell
 * and far less than the kerb, so nothing is visible where the two meet. */
const STREET_DIP = 0.16;

function gridMesh(rect, cell, ctx) {
  const nx = Math.max(1, Math.round((rect.x1 - rect.x0) / cell));
  const nz = Math.max(1, Math.round((rect.z1 - rect.z0) / cell));
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3);
  const col = new Float32Array((nx + 1) * (nz + 1) * 3);
  const PAL = ctx.PAL;
  let k = 0;
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = rect.x0 + (i / nx) * (rect.x1 - rect.x0);
      const z = rect.z0 + (j / nz) * (rect.z1 - rect.z0);
      const surf = surfaceAt(x, z);
      pos[k] = x;
      pos[k + 1] = heightAt(x, z) - (surf ? STREET_DIP : 0);
      pos[k + 2] = z;
      _c.set(groundColorAt(x, z, PAL, surf));
      col[k] = _c.r; col[k + 1] = _c.g; col[k + 2] = _c.b;
      k += 3;
    }
  }
  const idx = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx.length > 65535 ? new THREE.Uint32BufferAttribute(idx, 1)
                                : new THREE.Uint16BufferAttribute(idx, 1));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, ctx.groundMaterial);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}
