import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT, cel } from '../core/toon.js';
import { rngKit, trs, taperBox, ribbon, clamp, lerp, fbm2, TAU } from '../core/util.js';
import { BOUNDS } from '../data/route.js';

/* ------------------------------------------------------------------ *
 * 東山 -- the hillside.
 *
 * Everything east of the route and above it: the wooded Higashiyama slope that
 * closes every eastward view in the world.  It has no street, no frontage and
 * no hero shot of its own, and if it is missing the whole route reads as a set
 * of streets laid out on a lawn.
 *
 * ------------------------------------------------------------- THE SHAPE
 *
 * `HILL_PROFILE` climbs from 82 m at x = 300 to 132 m at x = 600, 168 m at
 * x = 700 and 252 m at x = 960 -- so Kiyomizu-dera's stage at 115.5 m sits
 * with 120 m of hill *behind* it, which is the fact that makes the temple look
 * tucked into the mountain rather than perched on it (GEO.md, correction 3).
 * Nothing here touches the height field: the ground is `heightAt` and this
 * module only puts things on it.
 *
 * ------------------------------------------------------------ THE FOREST
 *
 * Higashiyama is not wild woodland.  It is a **人工林** on the upper slopes --
 * 杉 planted on a grid, in stands, all the same age, dark and vertical -- with
 * broadleaf and 楓 lower down on the sunnier flanks and 竹 in the damp
 * gullies.  Planting cedar on a grid inside a stand and scattering everything
 * else is the whole of the difference between "a Japanese hill" and "trees".
 *
 * The job of the mass is to be **a mass with a lit edge, read at 50-200 m
 * through haze.**  Nothing out there needs to be legible as an individual
 * tree, and trying to make it so is how the frame budget dies:
 * `buildVegetation` batches the whole world into nine instanced meshes, so a
 * forest costs no draw calls at all -- but the instances are one world-spanning
 * cull unit, so **every triangle out here is paid for in every frame in the
 * world, including standing in Gion**.  A cedar is about 1 100 triangles.  That
 * single number sets the tree count, and the count is held down by:
 *
 *   - a hard minimum distance from every street, so nothing is planted on a
 *     surface somebody else owns;
 *   - a density that falls with distance from the route -- 14 m spacing on the
 *     near flank, 30 m beyond 200 m;
 *   - trees that get *bigger* as they get further away, so the far stands hold
 *     the same visual weight for a quarter of the trees.
 *
 * No hillside tree is ever flagged `hero`, so none of them casts a canopy
 * shadow.  Trunks cast, which is what seats them on the slope.
 *
 * ---------------------------------------------------------- THE HUMAN BIT
 *
 * A hill in Kyoto is used.  Above the top of Sannenzaka there is a cut bank
 * and a coursed 石垣 holding the ground up; there is a service track with a
 * deer fence and a water tank on it; there is a stone marker and a small torii
 * on the mountain path; and on the south-facing slope below Chawan-zaka there
 * is a **graveyard**, because the whole of 鳥辺野 -- this hillside -- has been
 * Kyoto's burial ground since the Heian period and its terraces of small stone
 * stupas are one of the most striking things you can see from the route.
 * ------------------------------------------------------------------ */

export const id = 'hillside';

/* --------------------------------------------------------------------- *
 * Where the forest is allowed to be.
 *
 * `EDGE` is the urban boundary: east of it the ground is hill rather than
 * town.  It is authored, because the thing that actually decides it -- where
 * the last building stands -- lives in eleven other district files.
 * --------------------------------------------------------------------- */
const EDGE = [
  [-880, 205], [-700, 225], [-560, 238], [-400, 246], [-200, 264],
  [0, 290], [150, 320], [260, 356], [350, 402], [450, 442],
  [550, 402], [650, 344], [800, 322], [960, 310],
];

/** Ground another district owns.  A tree inside one of these is a bug. */
const KEEP_OUT = [
  { id: '清水寺', x0: 348, x1: 648, z0: 312, z1: 516 },
  { id: '子安塔', x0: 466, x1: 628, z0: 452, z1: 692 },
  { id: '円山公園', x0: -44, x1: 244, z0: -684, z1: -424 },
  { id: '高台寺', x0: 76, x1: 272, z0: -314, z1: -106 },
];

const X_MAX = 1000;           // past this the far-field terrain grid stops
const Z_MIN = -880, Z_MAX = 720;
const NEAR_STREET = 26;       // never plant closer than this to any corridor

function edgeAt(z) {
  if (z <= EDGE[0][0]) return EDGE[0][1];
  if (z >= EDGE[EDGE.length - 1][0]) return EDGE[EDGE.length - 1][1];
  for (let i = 0; i < EDGE.length - 1; i++) {
    if (z <= EDGE[i + 1][0]) {
      const t = (z - EDGE[i][0]) / (EDGE[i + 1][0] - EDGE[i][0]);
      return lerp(EDGE[i][1], EDGE[i + 1][1], t * t * (3 - 2 * t));
    }
  }
  return EDGE[EDGE.length - 1][1];
}

const inKeepOut = (x, z) =>
  KEEP_OUT.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);

/* --------------------------------------------------------------------- *
 * Distance to the nearest street.
 *
 * Cheap and approximate on purpose: every corridor in `STREETS` is walked at
 * 7 m and the knots are bucketed on a 64 m grid, so a query touches a couple
 * of dozen of them.  Exact distance to a polyline is not worth it -- this is
 * deciding whether a tree may stand somewhere, not where a wall goes.
 * --------------------------------------------------------------------- */
function streetField(STREETS) {
  const CELL = 64;
  const buckets = new Map();
  const key = (i, j) => i * 100000 + j;
  const add = (x, z) => {
    const i = Math.floor(x / CELL), j = Math.floor(z / CELL);
    const k = key(i, j);
    let b = buckets.get(k);
    if (!b) { b = []; buckets.set(k, b); }
    b.push(x, z);
  };
  let n = 0;
  for (const spec of Object.values(STREETS)) {
    const pts = spec.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const steps = Math.max(1, Math.round(len / 7));
      for (let k = 0; k <= steps; k++) {
        add(lerp(a.x, b.x, k / steps), lerp(a.z, b.z, k / steps));
        n++;
      }
    }
  }
  return {
    knots: n,
    /** Distance to the nearest street knot, capped at `cap`. */
    dist(x, z, cap = 400) {
      const rings = Math.ceil(cap / CELL);
      const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
      let best = cap * cap;
      for (let r = 0; r <= rings; r++) {
        for (let i = ci - r; i <= ci + r; i++) {
          for (let j = cj - r; j <= cj + r; j++) {
            // only the new ring each time
            if (r > 0 && Math.abs(i - ci) !== r && Math.abs(j - cj) !== r) continue;
            const b = buckets.get(key(i, j));
            if (!b) continue;
            for (let m = 0; m < b.length; m += 2) {
              const dx = x - b[m], dz = z - b[m + 1];
              const d2 = dx * dx + dz * dz;
              if (d2 < best) best = d2;
            }
          }
        }
        // once a hit is inside the ring already scanned, no further ring can win
        if (best < (r * CELL) * (r * CELL)) break;
      }
      return Math.sqrt(best);
    },
  };
}

/* ------------------------------------------------------------------ *
 * build
 * ------------------------------------------------------------------ */
export function build(ctx) {
  const B = ctx.baker('hillside');
  const rng = rngKit(31771);
  const field = streetField(ctx.STREETS);
  const out = { trees: 0, stands: 0, graves: 0, byKind: {} };

  /** Can a tree stand here at all? Returns the distance-to-street, or -1. */
  const plantable = (x, z) => {
    if (x < edgeAt(z) || x > X_MAX || z < Z_MIN || z > Z_MAX) return -1;
    if (inKeepOut(x, z)) return -1;
    const d = field.dist(x, z, 420);
    if (d < NEAR_STREET) return -1;
    if (ctx.slopeAt(x, z, 3) > 46) return -1;
    return d;
  };

  /* ================================================================ *
   * 1.  The forest.
   * ================================================================ */

  /**
   * One tree, with the species chosen from the ground it stands on.
   *
   * The rule is the one a forester would use, not a random pick:
   *   杉    high, steep, shaded -- and overwhelmingly inside a stand
   *   松    the dry convex ground: ridges, spurs, the top of a bank
   *   楓 / 椿  everything lower and on the sunnier flanks
   *   低木   the steep ground where nothing taller holds
   *
   * 竹 is not chosen here.  A bamboo call plants a whole grove and costs
   * nearly nine thousand triangles, so the four groves on this hill are
   * placed by hand, in the gullies where they actually are.
   */
  const plant = (x, z, d, forceKind) => {
    const y = ctx.groundAt(x, z);
    const slope = ctx.slopeAt(x, z, 3);
    const n = ctx.normalAt(x, z, 4);
    /* Aspect: the hill faces west, so a *west*-facing (nx > 0) flank is the
     * sunny one and an east-facing one is the shaded back of a spur. */
    const sunny = n.x;
    /* Convexity, from the height field itself: a point that stands above the
     * mean of its neighbours is a spur, below it is a gully. */
    const conv = y - (ctx.groundAt(x + 9, z) + ctx.groundAt(x - 9, z)
                    + ctx.groundAt(x, z + 9) + ctx.groundAt(x, z - 9)) / 4;

    /* Species, and the **triangle cost of each one**, which on a hillside of
     * this size is not a footnote -- it is the design.  Measured, per tree,
     * at the batcher's default detail:
     *
     *     楓 maple    1 106      椿 camellia  1 349      低木 shrub 1 253
     *     杉 cedar    2 017      銀杏 ginkgo  3 276      松 pine    3 752
     *     竹 bamboo   8 971  (it is a whole stand from one call)
     *
     * A cedar costs nearly two maples and a pine costs three and a half, and
     * `buildVegetation` batches the world into instanced meshes that are ONE
     * cull unit -- so every one of these is paid for in every frame, standing
     * in Gion.  Cedar therefore appears almost only inside a plantation stand,
     * where its regimented spires do a job nothing else can; the loose cover
     * between the stands is carried by maple and camellia, which are half the
     * price; pine is rationed to the few convex spurs where its silhouette is
     * worth 3 752 triangles; and 銀杏 and 竹 are not on this hill at all. */
    let kind = forceKind;
    if (!kind) {
      if (conv > 1.1 && y > 120 && rng.chance(0.18)) kind = 'pine';
      else if (y > 155 && slope > 15 && sunny < 0.02 && rng.chance(0.30)) kind = 'cedar';
      else if (slope > 26 && rng.chance(0.22)) kind = 'shrub';
      else if (sunny > 0.02 || y < 125) kind = rng.chance(0.62) ? 'maple' : 'camellia';
      else kind = rng.chance(0.72) ? 'maple' : 'camellia';
    }

    /* Distance scale.  This is the other half of the budget answer: a stand
     * 250 m off holds the same weight with a third of the trees if each one is
     * half again as big, and at that range through the basin haze nothing is
     * legible as an individual anyway.  杉 genuinely reach 35 m, so it is not
     * even a cheat. */
    const far = clamp((d - 90) / 240, 0, 1);
    const scale = (1.0 + far * 0.85) * rng.range(0.86, 1.16);

    ctx.tree({
      kind, x, z, y, scale,
      rot: rng.range(0, TAU),
      seed: (Math.round(x * 7.7) ^ Math.round(z * 131.3) ^ 0x5bf03) >>> 0,
      /* never a hero: a canopy shadow out here is pure cost */
      hero: false, shadow: false,
    });
    out.trees++;
    out.byKind[kind] = (out.byKind[kind] || 0) + 1;
  };

  /* ---- the 人工林: cedar stands, planted on a grid ---------------- *
   * A plantation is the one place in this world where a perfectly regular
   * layout is *correct*, and it is instantly recognisable: parallel ranks of
   * identical spires, all the same age, with the ground visible between them.
   * Scattering the cedars instead would throw away the single most legible
   * fact about a Japanese hillside. */
  const STANDS = [
    // on the shoulder above Kiyomizu-michi and Sannenzaka
    { x: 268, z: 108, r: 15 }, { x: 320, z: 200, r: 15 },
    // the ridge behind the temple -- the wall that closes the eastward view
    { x: 712, z: 344, r: 17 }, { x: 766, z: 258, r: 16 },
    // the northern slope behind Maruyama
    { x: 306, z: -480, r: 15 },
    // and the high shoulder south of the temple
    { x: 470, z: 606, r: 14 },
  ];
  for (const st of STANDS) {
    const a = rng.range(0, Math.PI);
    const ca = Math.cos(a), sa = Math.sin(a);
    /* 5.8 m, not the 3-4 m a real 人工林 is planted at.  A stand at true
     * spacing is 60 cedars and 120 000 triangles; at this spacing it is 22 and
     * it still reads as ranks, because what says "plantation" is the *grid*,
     * not the density. */
    const pitch = 5.8;
    const n = Math.ceil(st.r / pitch);
    let planted = 0;
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const u = i * pitch + rng.range(-0.35, 0.35);
        const v = j * pitch + rng.range(-0.35, 0.35);
        if (Math.hypot(u, v) > st.r) continue;
        const x = st.x + u * ca - v * sa;
        const z = st.z + u * sa + v * ca;
        const d = plantable(x, z);
        if (d < 0) continue;
        plant(x, z, d, 'cedar');
        planted++;
      }
    }
    if (planted) out.stands++;
  }

  /* ---- the scattered cover ---------------------------------------- *
   * A jittered grid over the whole slope, with the acceptance falling away
   * from the route.  The grid is coarse and the acceptance is low: this is a
   * *thinning* pass, not a filling one. */
  const GRID = 34;
  const jitter = rngKit(90210);
  for (let z = Z_MIN; z < Z_MAX; z += GRID) {
    for (let x = 180; x < X_MAX; x += GRID) {
      const px = x + jitter.range(-GRID * 0.45, GRID * 0.45);
      const pz = z + jitter.range(-GRID * 0.45, GRID * 0.45);
      const d = plantable(px, pz);
      if (d < 0) continue;
      /* Density falls with distance from anywhere anybody stands, and falls
       * again past the world bounds, where the ground exists only to close
       * the view. */
      let p = d < 70 ? 0.66 : d < 140 ? 0.50 : d < 220 ? 0.34 : 0.16;
      if (px > BOUNDS.x1) p *= 0.5;
      if (pz < -760 || pz > 560) p *= 0.55;
      if (!jitter.chance(p)) continue;
      plant(px, pz, d);
    }
  }

  /* ---- 竹林: four groves, placed by hand ---------------------------- *
   * Bamboo runs in the damp bottoms, and on this hill the documented one is
   * **behind 高台寺** (STREET 3.12).  One `ctx.tree({kind:'bamboo'})` is a
   * stand of sixteen to twenty-eight culms and costs 8 971 triangles, which
   * is four maples -- so these are the only four on the hill and each one is
   * somewhere a grove is actually recorded or a gully actually is. */
  for (const [bx, bz] of [[272, -198], [288, -172], [266, -226], [424, 548]]) {
    if (plantable(bx, bz) < 0) continue;
    ctx.tree({
      kind: 'bamboo', x: bx, z: bz, y: ctx.groundAt(bx, bz),
      scale: rng.range(0.95, 1.2), rot: rng.range(0, TAU),
      seed: 6600 + Math.round(bx), hero: false, shadow: false,
    });
    out.trees++;
    out.byKind.bamboo = (out.byKind.bamboo || 0) + 1;
  }

  /* ---- the far ridge ---------------------------------------------- *
   * Beyond the world bounds the hill still has to be wooded, because it is
   * what closes every eastward view -- and it cannot be wooded with trees.
   * At 2 017 triangles each, covering the 0.4 km2 of ridge between x = 740
   * and x = 1000 with cedars is four hundred thousand triangles that nobody
   * can walk within sixty metres of and that the basin haze eats anyway.
   *
   * So out there the canopy is **relief on the landform, not vegetation**: a
   * field of low faceted lumps sitting on `groundAt`, in the cedar greens,
   * baked into this district's own bucket.  It is the same decision a painted
   * background makes about a distant hillside, it costs 20 triangles per lump
   * against 2 017, and it is deliberately kept 60 m outside `BOUNDS.x1` so
   * that no walker can ever get close enough to see what it is.  Where the
   * real trees stop and this starts, the two overlap for 40 m. */
  {
    const lump = new THREE.IcosahedronGeometry(1, 0);
    const tone = [PAL.leafCedar, PAL.leafCedarLit, PAL.leafPine, PAL.mossDeep,
                  PAL.leafPineLit];
    const fr = rngKit(5150);
    let lumps = 0;
    for (let z = Z_MIN; z < Z_MAX; z += 22) {
      for (let x = 726; x < X_MAX; x += 22) {
        const px = x + fr.range(-9, 9), pz = z + fr.range(-9, 9);
        if (px < 740 && fr.chance(0.65)) continue;     // fade in over 40 m
        if (px > X_MAX || pz < Z_MIN || pz > Z_MAX) continue;
        if (!fr.chance(0.86)) continue;
        const gy = ctx.groundAt(px, pz);
        // a low-frequency field so the canopy has a grain instead of a fizz
        const n = fbm2(px * 0.004, pz * 0.004, 2, 17);
        const rx = 11 + n * 9, ry = 5.5 + n * 4.5;
        B.add(lump,
          trs(px, gy + ry * 0.82, pz, 0, fr.range(0, TAU), 0,
              rx, ry, rx * fr.range(0.8, 1.2)),
          tone[Math.min(tone.length - 1, Math.floor((0.35 + n * 0.9) * tone.length))],
          { bands: 3, tint: TINT.green, shadow: false, receive: false });
        lumps++;
      }
    }
    lump.dispose();
    out.lumps = lumps;
  }

  /* ================================================================ *
   * 2.  The transition above the top of Sannenzaka.
   *
   * This is where the hill meets the built route, and it is the one piece of
   * the hillside seen close up.  The ingredients are the ones the real slope
   * has: a coursed 石垣 holding the ground up, a cut bank above it, a pipe
   * fence along the top, a gravel path, and leaf litter and moss at the foot.
   * ================================================================ */
  const wall = [];
  {
    /* The wall follows a line, but its HEIGHT comes from the height field:
     * the ground six metres up-slope against the ground at the face.  Where
     * that difference is under a metre the land just slopes and no wall goes
     * in, which is the rule `streets.js` uses for the same reason -- a wall
     * placed by hand on a derived terrain is a wall in the wrong place. */
    const a = { x: 212, z: 186 }, b = { x: 244, z: 268 };
    const steps = 26;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1) / steps;
      const x0 = lerp(a.x, b.x, t0), z0 = lerp(a.z, b.z, t0);
      const x1 = lerp(a.x, b.x, t1), z1 = lerp(a.z, b.z, t1);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const len = Math.hypot(x1 - x0, z1 - z0) + 0.06;
      const ry = Math.atan2(x1 - x0, z1 - z0);
      const base = Math.min(ctx.groundAt(x0, z0), ctx.groundAt(x1, z1)) - 0.45;
      const top = ctx.groundAt(cx + 7, cz);         // the ground it holds up
      const h = top - base;
      if (h < 1.0) continue;
      // 石垣: coursed granite with a pronounced batter
      B.add(taperBox(len, 1.35, h, 1.0, 0.62), trs(cx, base, cz, 0, ry, 0),
            rng.chance(0.35) ? PAL.stoneWallDark : PAL.stoneWall,
            { bands: 3, tint: TINT.cool });
      // the courses, three of them, which is what says "coursed" at 30 m
      for (let k = 1; k < 4; k++) {
        const y = base + (h * k) / 4;
        B.add(new THREE.BoxGeometry(len, 0.06, 1.30 - (k * 0.11)),
              trs(cx, y, cz, 0, ry, 0), PAL.stoneWallDark,
              { bands: 3, tint: TINT.cool, shadow: false });
      }
      // 天端 -- the coping, and the earth behind it
      B.add(new THREE.BoxGeometry(len, 0.16, 0.95),
            trs(cx, base + h, cz, 0, ry, 0), PAL.stone, { bands: 3, tint: TINT.cool });
      ctx.collide(Math.min(x0, x1) - 0.5, Math.min(z0, z1) - 0.5,
                  Math.max(x0, x1) + 0.5, Math.max(z0, z1) + 0.5, base + h);
      wall.push({ x: cx, z: cz, top: base + h, ry });
    }
    // the pipe fence along the top of it
    for (let i = 0; i < wall.length; i += 2) {
      const w = wall[i];
      const px = w.x + 0.55, pz = w.z;
      B.add(new THREE.CylinderGeometry(0.032, 0.036, 1.05, 6),
            trs(px, w.top + 0.52, pz), PAL.metalWarm,
            { bands: 4, tint: TINT.cool, flat: false });
      const nx = wall[i + 2];
      if (nx) {
        for (const dy of [0.95, 0.60]) {
          const dx = nx.x + 0.55 - px, dz = nx.z - pz;
          const g = new THREE.CylinderGeometry(0.024, 0.024, Math.hypot(dx, dz), 5);
          g.rotateX(Math.PI / 2);
          B.add(g, trs(px + dx / 2, w.top + dy, pz + dz / 2, 0, Math.atan2(dx, dz), 0),
                PAL.metalWarm, { bands: 4, tint: TINT.cool, flat: false });
        }
      }
    }
  }

  /* ---- the path, the torii and the marker ------------------------- *
   * A 山道 leaving the top of the built route: gravel, a stone marker at the
   * foot of it, a small stone torii where it enters the trees.  The torii is
   * stone rather than vermilion on purpose -- 朱 is spent on Yasaka Shrine and
   * Kiyomizu's gates and nothing else (palette.js). */
  const PATH = [
    { x: 206, z: 176 }, { x: 216, z: 196 }, { x: 226, z: 220 },
    { x: 236, z: 248 }, { x: 252, z: 276 }, { x: 276, z: 300 },
    { x: 308, z: 316 },
  ];
  /**
   * A ribbon takes its y from the points it is given, so a path described by
   * seven corners over 150 m of hillside is seven straight chords through the
   * ground -- buried in every hollow and floating over every rise.  Resample
   * at 4 m and take the height field at each sample.
   */
  const onGround = (line, step = 4, lift = 0.07) => {
    const pts = [];
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i], b = line[i + 1];
      const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / step));
      for (let k = 0; k < n; k++) {
        const x = lerp(a.x, b.x, k / n), z = lerp(a.z, b.z, k / n);
        pts.push({ x, y: ctx.groundAt(x, z) + lift, z });
      }
    }
    const e = line[line.length - 1];
    pts.push({ x: e.x, y: ctx.groundAt(e.x, e.z) + lift, z: e.z });
    return pts;
  };

  {
    const g = ribbon(onGround(PATH), 1.05);
    B.add(g, null, PAL.gravel, { bands: 'soft3', tint: TINT.cool, shadow: false });
    g.dispose();
    // the leaf litter and the moss that says the path is walked and damp
    for (let i = 0; i < 26; i++) {
      const t = rng.range(0, 1) * (PATH.length - 1);
      const k = Math.min(PATH.length - 2, Math.floor(t));
      const f = t - k;
      const px = lerp(PATH[k].x, PATH[k + 1].x, f) + rng.range(-2.6, 2.6);
      const pz = lerp(PATH[k].z, PATH[k + 1].z, f) + rng.range(-2.6, 2.6);
      ctx.prop({ kind: rng.chance(0.6) ? 'leafPile' : 'stepStone',
                 x: px, z: pz, rot: rng.range(0, TAU), seed: 200 + i });
    }
    // 標石 at the foot of the path
    ctx.prop({ kind: 'pathMarker', x: PATH[0].x - 1.4, z: PATH[0].z - 1.0,
               rot: 2.3, variant: 'tall', seed: 41 });
    torii(ctx, B, 236, 248, Math.atan2(236 - 226, 248 - 220));
  }

  /* ================================================================ *
   * 3.  The graveyard terraces.
   *
   * 鳥辺野.  This hillside has been Kyoto's burial ground since the Heian
   * period and the slopes south of Kiyomizu-dera are terraced with it: rank
   * on rank of small stone stupas on stepped platforms, granite-faced, with a
   * stepped path up the middle and a water point at the bottom.  It is both
   * true and the most striking thing on the hill that is not a tree.
   * ================================================================ */
  const graves = [];
  {
    const x0 = 252, z0 = 438, wZ = 62;
    const nT = 6, dX = 15;
    for (let i = 0; i < nT; i++) {
      const gx0 = x0 + i * dX, gx1 = gx0 + dX - 3.2;
      /* Each terrace is levelled to the ground at its UPHILL edge, so it is
       * cut into the back and stands proud at the front -- which is what the
       * retaining face in front of it is holding up. */
      const top = ctx.groundAt(gx1 - 1.5, z0 + wZ / 2) + 0.10;
      ctx.platform({ x0: gx0, z0, x1: gx1, z1: z0 + wZ, top, step: 0.55 });
      // the deck
      B.add(new THREE.BoxGeometry(gx1 - gx0, 0.22, wZ),
            trs((gx0 + gx1) / 2, top - 0.11, (z0 + z0 + wZ) / 2),
            PAL.gravel, { bands: 'soft3', tint: TINT.cool });
      // the granite face holding it up, panel by panel
      for (let z = z0; z < z0 + wZ; z += 3.1) {
        const base = ctx.groundAt(gx0, z + 1.55) - 0.4;
        const h = Math.max(0.4, top - base);
        B.add(taperBox(3.1, 1.0, h, 1.0, 0.62), trs(gx0, base, z + 1.55),
              rng.chance(0.4) ? PAL.stoneMoss : PAL.stoneWall,
              { bands: 3, tint: TINT.cool });
      }
      ctx.collide(gx0 - 0.35, z0, gx0 + 0.35, z0 + wZ, top);

      /* The stupas.  A 五輪塔 is five stacked stones -- cube, sphere, pyramid,
       * hemisphere, jewel -- but at the range this is seen, a stepped column
       * with a cap is the whole read, and a hundred of them are the point. */
      const rows = 2;
      for (let r2 = 0; r2 < rows; r2++) {
        const gx = gx0 + 3.4 + r2 * 5.0;
        for (let z = z0 + 2.4; z < z0 + wZ - 2.0; z += 2.05) {
          if (rng.chance(0.14)) continue;         // gaps: nothing is a full rank
          const jz = z + rng.range(-0.22, 0.22);
          const jx = gx + rng.range(-0.3, 0.3);
          const ry = rng.range(-0.12, 0.12);
          const H = rng.range(0.85, 1.5);
          const w = rng.range(0.30, 0.42);
          const col = rng.chance(0.30) ? PAL.stoneMoss : PAL.stone;
          B.add(new THREE.BoxGeometry(w * 1.5, 0.16, w * 1.5),
                trs(jx, top + 0.08, jz, 0, ry, 0), PAL.stoneDark,
                { bands: 3, tint: TINT.cool });
          B.add(taperBox(w, w, H - 0.34, 0.90), trs(jx, top + 0.16, jz, 0, ry, 0),
                col, { bands: 3, tint: TINT.cool });
          B.add(taperBox(w * 1.16, w * 1.16, 0.13, 0.66),
                trs(jx, top + H - 0.18, jz, 0, ry, 0), col,
                { bands: 3, tint: TINT.cool });
          B.add(new THREE.BoxGeometry(w * 0.5, 0.12, w * 0.5),
                trs(jx, top + H - 0.03, jz, 0, ry, 0), col,
                { bands: 3, tint: TINT.cool });
          graves.push({ x: jx, z: jz, y: top });
          out.graves++;
        }
      }
    }
    // the stepped path up the middle of the terraces
    for (let i = 0; i < nT; i++) {
      const gx = x0 + i * dX + dX - 3.2;
      const zc = z0 + wZ * 0.5;
      const yA = ctx.groundAt(gx, zc), yB = ctx.groundAt(gx + 3.2, zc);
      for (let k = 0; k < 5; k++) {
        B.add(new THREE.BoxGeometry(0.64, 0.16, 2.4),
              trs(gx + 0.32 + k * 0.64, lerp(yA, yB, k / 5) + 0.08, zc),
              PAL.paving, { bands: 3, tint: TINT.cool });
      }
    }
    // the water point at the bottom corner, and its buckets
    const wpx = x0 - 2.0, wpz = z0 + 8;
    const wpy = ctx.groundAt(wpx, wpz);
    B.add(new THREE.BoxGeometry(1.9, 0.85, 0.85), trs(wpx, wpy + 0.42, wpz),
          PAL.concrete, { bands: 3, tint: TINT.cool });
    B.add(new THREE.BoxGeometry(1.7, 0.10, 0.70), trs(wpx, wpy + 0.88, wpz),
          PAL.stoneDark, { bands: 3, tint: TINT.cool });
    for (const dx of [-0.5, 0.5]) {
      B.add(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 6),
            trs(wpx + dx, wpy + 1.15, wpz - 0.2), PAL.metalWarm,
            { bands: 4, tint: TINT.cool, flat: false });
      B.add(new THREE.CylinderGeometry(0.020, 0.020, 0.22, 6),
            trs(wpx + dx, wpy + 1.38, wpz - 0.08), PAL.metalWarm,
            { bands: 4, tint: TINT.cool, flat: false });
    }
    ctx.prop({ kind: 'waterBucket', x: wpx + 1.4, z: wpz + 0.4, rot: 1.1, seed: 51 });
    ctx.prop({ kind: 'waterBucket', x: wpx + 1.9, z: wpz - 0.5, rot: 2.4, seed: 52 });
    ctx.prop({ kind: 'broom', x: wpx - 0.9, z: wpz + 0.3, rot: 0.6, seed: 53 });
    out.waterPoint = { x: wpx, y: wpy, z: wpz };

    /* The 墓地 sits west of the forest edge, so the scatter never reaches it.
     * A cemetery on this hill is not bare ground: plant its margin by hand. */
    for (let i = 0; i < 16; i++) {
      const tx = x0 - 6 + rng.range(0, nT * dX + 12);
      const tz = rng.chance(0.5) ? z0 - rng.range(3, 12) : z0 + wZ + rng.range(2, 14);
      ctx.tree({
        kind: rng.chance(0.6) ? 'maple' : 'camellia',
        x: tx, z: tz, y: ctx.groundAt(tx, tz),
        scale: rng.range(0.85, 1.25), rot: rng.range(0, TAU),
        seed: 7700 + i, hero: false, shadow: false,
      });
      out.trees++;
      out.byKind.grave = (out.byKind.grave || 0) + 1;
    }
  }

  /* ================================================================ *
   * 4.  The service track, the deer fence and the water tank.
   *
   * Every wooded hill above a Japanese city has these three things on it, and
   * a hill without them reads as scenery rather than as land somebody looks
   * after.
   * ================================================================ */
  const TRACK = [
    { x: 640, z: 402 }, { x: 664, z: 366 }, { x: 686, z: 330 },
    { x: 700, z: 296 }, { x: 706, z: 258 }, { x: 698, z: 218 },
    { x: 678, z: 186 },
  ];
  {
    const g = ribbon(onGround(TRACK, 4, 0.08), 1.7);
    B.add(g, null, PAL.gravelDark, { bands: 'soft3', tint: TINT.cool, shadow: false });
    g.dispose();
    // the cut bank on the uphill side: a low earth face with a stone toe
    for (let i = 0; i < TRACK.length - 1; i++) {
      const a = TRACK[i], b = TRACK[i + 1];
      const cx = (a.x + b.x) / 2 + 2.2, cz = (a.z + b.z) / 2;
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const base = ctx.groundAt(cx, cz) - 0.3;
      const h = Math.max(0.5, ctx.groundAt(cx + 5, cz) - base);
      B.add(taperBox(len, 1.1, Math.min(h, 2.6), 1.0, 0.45),
            trs(cx, base, cz, 0, Math.atan2(b.x - a.x, b.z - a.z), 0),
            PAL.stoneWallDark, { bands: 3, tint: TINT.cool });
    }
    // 高置水槽 -- the tank the hill's standpipes run off
    const tk = { x: 706, z: 258 };
    const ty = ctx.groundAt(tk.x + 9, tk.z);
    B.add(new THREE.BoxGeometry(9.2, 0.5, 7.2), trs(tk.x + 9, ty + 0.25, tk.z),
          PAL.concreteDark, { bands: 3, tint: TINT.cool });
    for (const dx of [-3.2, 3.2]) for (const dz of [-2.4, 2.4]) {
      B.add(new THREE.BoxGeometry(0.42, 4.2, 0.42),
            trs(tk.x + 9 + dx, ty + 2.6, tk.z + dz), PAL.concrete,
            { bands: 3, tint: TINT.cool });
    }
    B.add(new THREE.BoxGeometry(8.0, 3.4, 6.0), trs(tk.x + 9, ty + 6.4, tk.z),
          PAL.metalWarm, { bands: 4, tint: TINT.cool, flat: false });
    B.add(new THREE.BoxGeometry(8.3, 0.24, 6.3), trs(tk.x + 9, ty + 8.2, tk.z),
          PAL.metalDark, { bands: 4, tint: TINT.cool, flat: false });
    for (let k = 0; k < 11; k++) {
      B.add(new THREE.BoxGeometry(0.44, 0.05, 0.05),
            trs(tk.x + 5.0, ty + 0.8 + k * 0.62, tk.z + 2.6), PAL.metalDark,
            { bands: 4, tint: TINT.cool, flat: false });
    }
    ctx.collideRot(tk.x + 9, tk.z, 8.4, 6.4, 0, ty + 8.4);
    out.tank = { x: tk.x + 5.2, y: ty, z: tk.z + 2.6 };

    /* 獣害防止柵 -- the deer fence, across the track with a gate in it.  The
     * gate is one of the four things you can touch up here. */
    const gx = TRACK[1].x, gz = TRACK[1].z;
    /* The fence runs ACROSS the track, so its own +x axis is the track's
     * normal.  `fry` is that yaw, and everything on the fence -- post
     * spacing, the wire runs, the colliders and the gate's swing -- is
     * expressed in it, because mixing the two frames is how a gate ends up
     * swinging sideways through its own fence. */
    const fry = Math.atan2(TRACK[2].x - TRACK[0].x, TRACK[2].z - TRACK[0].z) + Math.PI / 2;
    const ux = Math.cos(fry), uz = -Math.sin(fry);      // along the fence
    for (let k = -7; k <= 7; k++) {
      if (k === 0) continue;                            // the gate opening
      const px = gx + ux * k * 2.0, pz = gz + uz * k * 2.0;
      const py = ctx.groundAt(px, pz);
      B.add(new THREE.CylinderGeometry(0.045, 0.05, 1.9, 6), trs(px, py + 0.95, pz),
            PAL.metalWarm, { bands: 4, tint: TINT.cool, flat: false });
      if (k < 7) {
        for (const dy of [1.75, 1.15, 0.55]) {
          const g2 = new THREE.CylinderGeometry(0.018, 0.018, 2.0, 5);
          g2.rotateZ(Math.PI / 2);
          B.add(g2, trs(px + ux, py + dy, pz + uz, 0, fry, 0),
                PAL.metalDark, { bands: 4, tint: TINT.cool, flat: false });
        }
      }
      if (Math.abs(k) > 1) ctx.collideRot(px, pz, 2.0, 0.28, fry, py + 1.9);
    }
    const hx = gx - ux * 2.0, hz = gz - uz * 2.0;
    out.gate = { x: hx, y: ctx.groundAt(hx, hz), z: hz, ry: fry };
  }

  /* ================================================================ *
   * 5.  Four things you can touch.
   * ================================================================ */
  interactables(ctx, B, out, rng);

  console.info('[hillside]', out.trees, 'trees ·', out.stands, 'cedar stands ·',
               out.graves, 'stupas ·', out.lumps, 'ridge lumps · baker', B.triangles,
               'tris ·', JSON.stringify(out.byKind));
  return out;
}

/* ------------------------------------------------------------------ *
 * 鳥居 -- a small stone one, on a mountain path.
 *
 * 明神鳥居 form: two battered pillars, a 貫 through them, a 島木 and a 笠木
 * above with a slight upward sweep at the ends, and the 額束 between.  Clear
 * height 3.6 m -- these are small; the big vermilion ones belong to the
 * shrine, and both the colour and the scale are how you tell them apart.
 * ------------------------------------------------------------------ */
function torii(ctx, B, x, z, ry) {
  const y = Math.min(ctx.groundAt(x - 1.9, z), ctx.groundAt(x + 1.9, z));
  const CLEAR = 3.6, SPAN = 2.9;
  const O = { bands: 3, tint: TINT.cool };
  const M = (dx, dy, dz, rz = 0) =>
    trs(x + Math.cos(ry) * dx + Math.sin(ry) * dz, y + dy,
        z - Math.sin(ry) * dx + Math.cos(ry) * dz, 0, ry, rz);
  for (const s of [-1, 1]) {
    // the pillar leans inward -- 転び -- which is most of why a torii stands up
    B.add(taperBox(0.30, 0.30, CLEAR + 0.5, 0.84), M(s * SPAN / 2, 0, 0, -s * 0.022),
          PAL.stone, O);
    B.add(new THREE.BoxGeometry(0.48, 0.14, 0.48), M(s * SPAN / 2, 0, 0),
          PAL.stoneDark, O);
  }
  // 貫 -- the tie beam, which passes through both pillars and projects
  B.add(new THREE.BoxGeometry(SPAN + 0.8, 0.20, 0.24), M(0, CLEAR - 0.55, 0),
        PAL.stone, O);
  // 額束
  B.add(new THREE.BoxGeometry(0.24, 0.62, 0.20), M(0, CLEAR - 0.35, 0), PAL.stone, O);
  // 島木 and 笠木, the upper member in two courses with a lifted end
  B.add(new THREE.BoxGeometry(SPAN + 1.15, 0.22, 0.34), M(0, CLEAR + 0.15, 0),
        PAL.stone, O);
  for (let k = -3; k <= 3; k++) {
    const t = k / 3;
    B.add(new THREE.BoxGeometry((SPAN + 1.45) / 7 + 0.02, 0.20, 0.40),
          M(t * (SPAN + 1.45) / 2, CLEAR + 0.40 + t * t * 0.13, 0, -t * 0.10),
          PAL.stone, O);
  }
  ctx.collide(x - 0.3, z - 0.3, x + 0.3, z + 0.3, y + CLEAR + 0.6);
}

/* ------------------------------------------------------------------ *
 * The four.
 *
 * None of them is a puzzle.  They are the mechanical facts of a hill that is
 * looked after: a tap, a ladle, a rack of grave tablets that moves in the
 * wind, and a gate in a deer fence.
 * ------------------------------------------------------------------ */
function interactables(ctx, B, out, rng) {
  const O = { bands: 4, tint: TINT.cool, flat: false };
  const hit = (x, y, z, w, h, d, label, action) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ visible: false }));
    m.position.set(x, y, z);
    m.visible = false;
    ctx.add(m);
    ctx.interact({ hitbox: m, label, action });
    return m;
  };

  /* --- 1. the standpipe at the water point --- */
  if (out.waterPoint) {
    const { x, y, z } = out.waterPoint;
    const wheelMat = cel({ color: PAL.metalDark, bands: 4, tint: TINT.cool });
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 5, 10), wheelMat);
    wheel.position.set(x - 0.5, y + 1.30, z - 0.34);
    wheel.rotation.x = Math.PI / 2;
    ctx.add(wheel);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.016, 0.44, 5),
      cel({ color: PAL.waterSky, bands: 'soft3', tint: TINT.cool })
    );
    water.position.set(x - 0.5, y + 1.16, z - 0.08);
    water.visible = false;
    water.userData.noOutline = true;
    ctx.add(water);
    let run = 0;
    ctx.update((dt) => {
      if (run <= 0) return;
      run -= dt;
      wheel.rotation.z += dt * 0.9;
      water.scale.y = 0.9 + Math.sin(run * 9) * 0.06;
      if (run <= 0) water.visible = false;
    });
    hit(x - 0.5, y + 1.1, z - 0.2, 1.0, 1.2, 1.0, '給水栓 — open the tap', () => {
      run = 9; water.visible = true;
    });

    /* --- 2. the ladle on the bucket --- */
    const ladle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.52, 5),
      cel({ color: PAL.timberPale, bands: 3, tint: TINT.warm })
    );
    const lx = x + 1.4, lz = z + 0.4, ly = ctx.groundAt(lx, lz) + 0.30;
    ladle.position.set(lx, ly, lz);
    ladle.rotation.set(0, 0.7, Math.PI / 2 - 0.18);
    ctx.add(ladle);
    let tip = 0, tipWant = 0;
    ctx.update((dt) => {
      if (Math.abs(tip - tipWant) < 1e-3) {
        if (tipWant > 0.5) tipWant = 0;
        return;
      }
      tip += Math.sign(tipWant - tip) * Math.min(Math.abs(tipWant - tip), dt * 1.1);
      ladle.rotation.z = Math.PI / 2 - 0.18 - tip * 1.15;
      ladle.position.y = ly + tip * 0.16;
    });
    hit(lx, ly + 0.3, lz, 0.9, 0.9, 0.9, '柄杓 — lift the ladle', () => { tipWant = 1; });
  }

  /* --- 3. 卒塔婆 -- the rack of grave tablets, which moves in the wind --- */
  {
    const x = 258, z = 470;
    const y = ctx.groundAt(x, z);
    // the rack: two posts and a rail, baked
    for (const dz of [-0.7, 0.7]) {
      B.add(new THREE.BoxGeometry(0.09, 1.9, 0.09), trs(x, y + 0.95, z + dz),
            PAL.timberGrey, { bands: 3, tint: TINT.warm });
    }
    B.add(new THREE.BoxGeometry(0.07, 0.07, 1.5), trs(x, y + 1.72, z),
          PAL.timberGrey, { bands: 3, tint: TINT.warm });
    /* The tablets themselves are their own mesh, because they are the only
     * thing on this hill that moves.  One mesh, eight tablets in its
     * geometry, a couple of degrees of sway: 卒塔婆 clatter, they do not
     * swing. */
    const parts = [];
    for (let i = 0; i < 8; i++) {
      const g = new THREE.BoxGeometry(0.035, 1.5, 0.115);
      g.translate((i - 3.5) * 0.055, -0.75, (i - 3.5) * 0.14);
      parts.push(g);
    }
    // merged by hand into one buffer: eight boxes, one mesh, one draw call
    const pos = [];
    for (const g of parts) {
      const a = g.attributes.position, idx = g.index;
      for (let i = 0; i < idx.count; i++) {
        const k = idx.getX(i);
        pos.push(a.getX(k), a.getY(k), a.getZ(k));
      }
      g.dispose();
    }
    const sotoba = new THREE.BufferGeometry();
    sotoba.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    sotoba.computeVertexNormals();
    const mesh = new THREE.Mesh(sotoba, cel({
      color: PAL.timberPale, bands: 3, tint: TINT.warm,
    }));
    mesh.position.set(x, y + 1.68, z);
    ctx.add(mesh);
    let energy = 0;
    ctx.update((dt, t) => {
      energy *= Math.exp(-1.4 * dt);
      const a = 0.012 + energy * 0.07;
      mesh.rotation.z = Math.sin(t * 1.9) * a;
      mesh.rotation.x = Math.sin(t * 1.3 + 1.1) * a * 0.6;
    });
    hit(x, y + 1.0, z, 1.3, 2.0, 1.6, '卒塔婆 — the grave tablets', () => { energy = 1; });
  }

  /* --- 4. the gate in the deer fence --- */
  if (out.gate) {
    const { x, y, z, ry } = out.gate;
    /* Hinged at one end and swinging in the fence's own frame: the gate leaf
     * runs along local +X, which `rotation.y = ry` maps onto the fence line. */
    const g = new THREE.BoxGeometry(3.9, 1.75, 0.06);
    g.translate(1.95, 0, 0);
    const gate = new THREE.Mesh(g, cel({
      color: PAL.metalWarm, bands: 4, tint: TINT.cool,
    }));
    gate.position.set(x, y + 0.92, z);
    gate.rotation.y = ry;
    ctx.add(gate);
    let open = 0, want = 0;
    ctx.update((dt) => {
      if (Math.abs(open - want) < 1e-3) return;
      open += Math.sign(want - open) * Math.min(Math.abs(want - open), dt * 1.1);
      gate.rotation.y = ry + open * 1.15;
    });
    hit(x, y + 0.9, z, 1.6, 1.9, 1.6, 'the deer gate', () => {
      want = want > 0.5 ? 0 : 1;
    });
  }
}
