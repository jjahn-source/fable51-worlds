import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL } from '../core/palette.js';
import { TINT, celTex } from '../core/toon.js';
import { rngKit, lerp, clamp, trs, lathe } from '../core/util.js';
import { cached, make, noticeBoard, templePlaque, woodenSign, hex } from '../core/textures.js';
import { groundColorAt } from './terrain.js';
import { hullOutlineTree } from '../core/outline.js';
import {
  kiyomizuTerrain, makeKakezukuri, makeHondo, makeNiomon, makeSaimon,
  makeTodorokimon, makeTempleGate, makeOkunoin, makeOtowaFalls, makeKoyasuPagoda,
  makeShoro, makeSutraHall, makeTempleWall, makeStoneSteps, bearingToRy,
} from '../kit/temple.js';
import { makeThreeStoreyPagoda } from '../kit/pagoda.js';
import {
  makeStoneLantern, makeSaisenbako, makeEmaRack, makeOmikujiStand, makeChozu,
} from '../kit/shrine.js';
import { KIYOMIZU } from '../data/route.js';

/* ------------------------------------------------------------------ *
 * 音羽山清水寺 -- Kiyomizu-dera.  The end of the walk.
 *
 * Built to `docs/KIT.md` and to `src/kit/temple.js`, which carries the
 * cultural-property record and the four corrections that matter:
 *
 *   - **The temple is not on a mountain.**  The stage deck is 115.5 m ASL and
 *     the precinct runs from 96 m (the Otowa waterfall) to 122 m (Jishu).  The
 *     240-250 m in circulation is the ridge *behind*.  Everything here is
 *     tucked into a ravine head.
 *   - **The stage is 21.8 x 9.6 m**, with 12.7 m of air under its centre and
 *     14.4 at the outer corner, because the bare ground beneath is 102.8.
 *   - **The pillars are 0.64 m in diameter.**  The 2 m everybody quotes is
 *     周囲, circumference, misread as 直径.
 *   - The Hondo is 檜皮葺 -- thick, soft, brown cypress bark with no ribs and
 *     no tile furniture -- and the three-storey pagoda 150 m away is hard grey
 *     本瓦葺.  That pairing is the signature of the site and the fastest thing
 *     to get wrong.
 *
 * ----------------------------------------------------------- THE AXIS
 *
 * 仁王門 (104.5) -> 西門 + 三重塔 (112) -> 轟門 (114.9) -> 本堂 (115.5),
 * climbing eleven metres over two hundred, WNW to ESE.  Then the ground falls
 * off a cliff: the stage projects south over the head of the 錦雲渓 and the
 * 奥の院 stands on the ravine's east rim looking back at it.  That one view --
 * the Hondo in profile from Okunoin -- is what the whole district is for, and
 * every decision below was checked against it.
 *
 * ---------------------------------------------------- THE GROUND PROBLEM
 *
 * `world/index.js` builds the visible ground mesh **before** the districts run,
 * so a `ctx.cut` registered here moves the height field -- collision, seating,
 * the player -- but not the drawn hillside.  At Kiyomizu the un-cut hill reads
 * 115.5 m under the stage, i.e. level with the deck, so without a fix the hero
 * object of the project is a shed sitting on a lawn.
 *
 * The proper fix is in `world/index.js` (build the ground after the districts
 * have registered their cuts) or in `route.js` (put the ravine in
 * HILL_PROFILE).  Neither file is mine.  So `reliefGround()` below does the
 * next best thing entirely inside this district: it sinks the coarse ground
 * vertices inside the temple's box on a taper -- so nothing outside is touched
 * and no seam can open at the edge -- and lays a finer, cut-aware patch over
 * the top.  See the comment on that function; it is the only piece of code
 * here that reaches outside its own geometry, and it is flagged, not hidden.
 * ------------------------------------------------------------------ */

export const id = 'kiyomizu';

const BAKER = 'kiyomizu';
const DEG = Math.PI / 180;
const K = KIYOMIZU;

/** The stage and Hondo share one bearing: the long axis runs 80.4 deg. */
const RY = bearingToRy(80.4);
const SIN = Math.sin(RY), COS = Math.cos(RY);

/**
 * The Hondo is placed **1.0 m north** of the OSM centroid, along its own axis.
 *
 * The centroid is the middle of the whole 36 x 31 footprint including the
 * stage, and `makeHondo` takes it as such.  The metre is the difference
 * between the surveyed 本堂 point falling *behind* the 蔀戸 line -- where no
 * visitor has ever stood -- and falling in the 外陣 gallery between the front
 * columns and the shutters, which is where everybody stands and where the
 * route's own waypoint is.  One metre on a 36 m building, stated rather than
 * quietly absorbed.
 */
const HONDO = { x: 519.9 - 1.0 * SIN, z: 418.6 - 1.0 * COS };

/** The region `reliefGround` re-tessellates.  The district box, near enough. */
const RELIEF = { x0: 360, x1: 604, z0: 330, z1: 650 };

/* ------------------------------------------------------------------ *
 * 1.  THE GROUND
 * ------------------------------------------------------------------ */

/**
 * The ravine, in two parts.
 *
 * `kiyomizuTerrain` cuts the fall line under the stage from the DEM transect
 * -- 115.4 at z=421 down to 90.0 at z=470 -- but it stops short in three
 * places, all of them for the same reason: it is protecting the 奥の院道
 * corridor, which the route data draws straight through the buildings it
 * serves.  This adds the rest:
 *
 *   - **east of the stage.**  The kit clips its bands at x=534 for z<440 so
 *     the path off the stage survives.  The head of the ravine really does
 *     continue east to the foot of Okunoin, and the postcard depends on it, so
 *     the bands are carried on -- and the path is put back as a narrow rim
 *     terrace instead (see `terraces`).
 *   - **under 奥の院.**  Its deck projects WSW over the head of the Otowa
 *     gorge; without a cut it stands 0.9 m off the ground and has no
 *     kakezukuri at all.
 *   - **the 錦雲渓 south of the falls**, which the Koyasu pagoda floats
 *     across.  Without it the ravine floor jumps from 90 m to 103 m in two
 *     metres of z, which is a cliff nobody asked for.
 */
function ravine(ctx) {
  const { floorAt } = kiyomizuTerrain(ctx);

  /* --- the head of the ravine, carried east under the stage's east end --- */
  for (let z = 423; z < 443; z += 2) {
    const y = floorAt(z + 1);
    ctx.cut({ x0: 530, z0: z, x1: 541, z1: z + 2.2, top: y });
    ctx.cut({ x0: 541, z0: z, x1: 547, z1: z + 2.2, top: y + 4.2 });
  }
  /* The east flank, stepping up out of the ravine toward Okunoin.  Three
   * nested bands again: a single box would leave a wall. */
  for (let z = 441; z < 465; z += 2) {
    const y = floorAt(z + 1);
    ctx.cut({ x0: 534, z0: z, x1: 556, z1: z + 2.2, top: y + 1.5 });
    ctx.cut({ x0: 548, z0: z, x1: 566, z1: z + 2.2, top: y + 6.0 });
  }

  /* --- under 奥の院's deck ---------------------------------------------- *
   * Kept clear of the stepped descent to the falls, which leaves Okunoin on
   * its south-east and runs (586,452) -> (580,462) -> (566,466). */
  const okuBands = [
    [440, 444, 562, 575, 110.5],
    [444, 448, 560, 577, 106.0],
    [448, 452, 558, 577, 102.0],
    [452, 458, 556, 576, 99.0],
    [458, 463, 552, 572, 97.4],
  ];
  for (const [z0, z1, x0, x1, top] of okuBands) ctx.cut({ x0, z0, x1, z1, top });

  /* --- the Otowa bowl, widened south so the basin and the queue are level - */
  ctx.cut({ x0: 538, z0: 462, x1: 564, z1: 480, top: 96.8 });

  /* --- 錦雲渓 -- the wooded ravine the Koyasu pagoda is seen across ------- *
   * The 子安塔道 climbs the valley's east side; the floor west of it is cut
   * to about eight metres below the path, which is what makes the far slope
   * read as a far slope and the little vermilion tower read as floating. */
  const KPATH = [
    [458.8, 547.9, 96.0], [490, 546, 98.0], [528, 540, 103.0],
    [570, 530, 109.0], [624.8, 521.2, 116.6],
  ];
  const along = (z) => {
    if (z <= KPATH[0][0]) return KPATH[0];
    for (let i = 1; i < KPATH.length; i++) {
      if (z <= KPATH[i][0]) {
        const a = KPATH[i - 1], b = KPATH[i], t = (z - a[0]) / (b[0] - a[0]);
        return [z, lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
      }
    }
    return KPATH[KPATH.length - 1];
  };
  for (let z = 470; z < 616; z += 4) {
    const [, px, py] = along(z + 2);
    ctx.cut({ x0: px - 46, z0: z, x1: px - 9, z1: z + 4.4, top: py - 7.5 });
    ctx.cut({ x0: px - 34, z0: z, x1: px - 13, z1: z + 4.4, top: py - 11.0 });
  }
  return { floorAt };
}

/**
 * The made ground.
 *
 * Kiyomizu is not a building on a hill, it is **six terraces cut into one**,
 * and the height field does not know that: `route.js` describes the precinct
 * as a 10 m corridor, so without this the approach runs along the top of a
 * three-metre embankment with the wood falling away on both sides -- the exact
 * failure `terrain.js` documents for Sannenzaka.
 *
 * Everything here is registered **before** `reliefGround`, so it becomes
 * visible, walkable ground rather than an invisible ledge.  Everything a
 * *building* stands on -- the Hondo's deck, the stage, Okunoin's floor -- is
 * registered later by the kit and stays invisible, because a deck on stilts is
 * not ground and filling under it would bury the object this district is for.
 */
function terraces(ctx) {
  const P = (x0, z0, x1, z1, top, step) =>
    ctx.platform({ x0, z0, x1, z1, top, step });

  /* --- the approach court, swept along 清水寺境内 ------------------------ *
   * A chain of overlapping boxes at the corridor's own elevation, so the
   * court is a broad ramp rather than a ribbon.  It stops short of the Hondo
   * (x < 497) and is clipped at z=421, which is the lip of the ravine: one
   * box past that line and the stage would be standing on filled ground. */
  const c = ctx.getCorridor('kiyomizuPrecinct');
  if (c) {
    for (let s = 0; s < c.length - 1; s += 1.5) {
      const p = c.pointAt(s);
      if (p.x > 497) break;
      // narrow at the gate so the street outside it is left alone, then broad
      const half = clamp(4.5 + s * 0.32, 4.5, 12.5);
      P(Math.max(p.x - half, 368), p.z - half,
        p.x + half, Math.min(p.z + half, 421), p.y - 0.05, 0.45);
    }
  }

  /* --- 本堂 court: the level the Hondo, the 経堂 and 轟門 all stand on --- */
  P(496, 399, 542, 421, 115.45, 0.45);

  /* --- 地主神社: two terraces up the bank behind the Hondo ---------------
   * The survey puts Jishu at 122.4, seven metres above the Hondo's floor and
   * twelve above what the height field thinks the bare hill is doing here.
   * Two terraces and two flights, which is what is actually there. */
  P(498, 382, 546, 400, 118.90, 0.45);
  P(505, 363, 541, 384, 122.40, 0.45);

  /* --- the rim to 奥の院 ------------------------------------------------ *
   * The one causeway across the head of the ravine.  Deliberately narrow --
   * about twelve metres, most of it on the uphill side -- because the whole
   * point of the Okunoin view is that you are standing out over a void, and a
   * generous terrace here would put a lawn in the middle of the postcard. */
  P(533.0, 425, 546, 437, 115.72, 0.45);
  P(543, 427, 557, 439, 115.95, 0.45);
  P(554, 429, 569, 441, 116.20, 0.45);
  P(564, 430, 582, 443, 116.60, 0.45);

  /* --- the 音羽の瀧 forecourt: the queue, level with the basin ---------- */
  P(540, 456, 559, 474, 96.55, 0.45);
}

/* ------------------------------------------------------------------ *
 * `reliefGround` -- the drawn hillside, re-cut.
 *
 * ⚠ This function edits the ground mesh that `world/index.js` built before the
 * districts ran.  It is a workaround for a build-order bug that is flagged in
 * `kit/temple.js` and in `_temple_test.js` and belongs in neither file's
 * owner's hands; see the header comment.  It is written to be *safe* rather
 * than clever:
 *
 *   1. Every coarse vertex inside RELIEF is pushed 60 m down, on a **taper**
 *      that is zero on the boundary and full one and a half coarse cells in.
 *      Because the taper is zero at the edge, no triangle that leaves the box
 *      is disturbed and no seam, crack or tear can open outside it -- which is
 *      the failure mode of the obvious version (delete the triangles).
 *   2. A finer patch is laid over the box, sampled from the same `groundAt`
 *      every other module uses, so the drawn hill and the height field are the
 *      same surface by construction.  It is lifted 0.05 m, which is enough to
 *      win against the coarse mesh wherever the taper has not yet bitten and
 *      far too little to see.
 *
 * The patch is graded: 1.25 m through the ravine and the precinct, 3 m out on
 * the wooded slope.  About 17 000 quads, one draw call, and it is the only
 * reason there is a hole in the ground under the stage at all.
 */
function reliefGround(ctx) {
  const ground = ctx.root.getObjectByName('ground');
  if (!ground) return null;
  const R = RELIEF;

  /* ---- 1. sink the coarse ground inside the box, on a taper ---- */
  ground.traverse((o) => {
    if (!o.isMesh || !o.geometry.attributes.position) return;
    const p = o.geometry.attributes.position;
    o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    if (bb.max.x < R.x0 || bb.min.x > R.x1 || bb.max.z < R.z0 || bb.min.z > R.z1) return;
    /* The coarse cell, inferred: the near field is 6 m and the far rings are
     * 24, and the taper has to be wider than whichever this mesh is. */
    const area = (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z);
    const cell = Math.sqrt(area / Math.max(1, p.count));
    const band = clamp(cell * 1.6, 8, 40);
    let touched = false;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const d = Math.min(x - R.x0, R.x1 - x, z - R.z0, R.z1 - z);
      if (d <= 0) continue;
      p.setY(i, p.getY(i) - 60 * Math.min(1, d / band));
      touched = true;
    }
    if (touched) {
      p.needsUpdate = true;
      o.geometry.computeVertexNormals();
      o.geometry.computeBoundingSphere();
    }
  });

  /* ---- 2. the replacement patch ---- */
  const axis = (a, b, fineFrom, fineTo, coarse, fine) => {
    const out = [];
    let v = a;
    while (v < b) {
      out.push(v);
      v += (v >= fineFrom && v < fineTo) ? fine : coarse;
    }
    out.push(b);
    return out;
  };
  // fine through the ravine, the stage and the Otowa gorge; coarse elsewhere
  const xs = axis(R.x0, R.x1, 494, 596, 3.0, 1.25);
  const zs = axis(R.z0, R.z1, 396, 486, 3.0, 1.25);

  const nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const c = new THREE.Color();
  let k = 0;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = xs[i], z = zs[j];
      const surf = ctx.surfaceAt(x, z);
      /* The paving ribbons in `streets.js` sit 0.02 m over `groundAt`, and the
       * ground is dipped under them so a coarse interpolation cannot poke
       * through.  Only the real streets are paved; a terrace of mine is not. */
      const paved = surf && ctx.STREETS[surf.id];
      pos[k] = x;
      pos[k + 1] = ctx.groundAt(x, z) - (paved ? 0.16 : 0) + 0.05;
      pos[k + 2] = z;
      c.set(groundColorAt(x, z, PAL, surf));
      col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
      k += 3;
    }
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, cc = a + nx, d = cc + 1;
      idx.push(a, cc, b, b, cc, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.Uint32BufferAttribute(idx, 1));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, ctx.groundMaterial);
  mesh.name = 'kiyomizuGround';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  ctx.add(mesh);
  return { mesh, quads: (nx - 1) * (nz - 1) };
}

/* ------------------------------------------------------------------ *
 * 2.  SMALL VOCABULARY
 * ------------------------------------------------------------------ */

/** An invisible box that raycasts, for `ctx.interact`. */
function hotspot(ctx, x, y, z, w, h, d, label, action) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ visible: false }));
  m.position.set(x, y, z);
  m.visible = false;
  m.name = 'hot.' + label.replace(/\s+/g, '-');
  ctx.add(m);
  return ctx.interact({ hitbox: m, label, action: action || (() => {}) });
}

/**
 * 石垣 -- the coursed, battered stone bank that holds a terrace up.
 *
 * Every level at Kiyomizu is made ground and every one of them is faced like
 * this; without it a `ctx.platform` reads as a lawn floating over a hole.  The
 * face is built **outward** from the terrace edge (KIT.md 10): the wall stands
 * clear of the platform line, leans back as it rises, and its foot is found by
 * asking the height field where the ground outside actually is.
 */
function stoneBank(ctx, b, pts, top, { batter = 0.14, seg = 2.6, out = 0.0 } = {}) {
  let n = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1];
    const len = Math.hypot(c.x - a.x, c.z - a.z);
    if (len < 0.2) continue;
    const nSeg = Math.max(1, Math.round(len / seg));
    const tx = (c.x - a.x) / len, tz = (c.z - a.z) / len;
    const nx = -tz, nz = tx;                       // outward, by winding order
    const ang = Math.atan2(-tx, -tz) + Math.PI / 2;
    for (let s = 0; s < nSeg; s++) {
      const tm = (s + 0.5) / nSeg;
      const mx = lerp(a.x, c.x, tm) + nx * out;
      const mz = lerp(a.z, c.z, tm) + nz * out;
      /* Where the ground outside actually is -- the wall's height is a
       * question for the height field, not a constant. */
      const foot = Math.min(
        ctx.groundAt(mx + nx * 1.4, mz + nz * 1.4),
        ctx.groundAt(mx + nx * 3.2, mz + nz * 3.2)
      );
      const h = top - foot;
      if (h < 0.4) continue;
      const l = len / nSeg + 0.14;
      const M = trs(mx, 0, mz, 0, ang, 0);
      /* Courses, each stepped back: a 石垣 is not a retaining wall, it is a
       * slope of dressed stone, and the batter is what says so. */
      const courses = clamp(Math.round(h / 1.6), 1, 5);
      for (let q = 0; q < courses; q++) {
        const y0 = foot + (h * q) / courses;
        const hq = h / courses + 0.08;
        const back = batter * h * ((q + 0.5) / courses);
        const g = new THREE.BoxGeometry(l, hq, 0.78);
        g.translate(0, y0 + hq / 2 - 0.04, -back - 0.30);
        b.add(g, M, q % 2 ? PAL.stoneWall : PAL.stoneWallDark,
          { bands: 3, tint: TINT.cool });
        n++;
      }
      const cap = new THREE.BoxGeometry(l, 0.24, 1.05);
      cap.translate(0, top + 0.04, -batter * h - 0.36);
      b.add(cap, M, PAL.stone, { bands: 3, tint: TINT.cool });
    }
  }
  return n;
}

/**
 * 千体石仏群 -- the field of small stone Buddhas.
 *
 * Around 200 of them, gathered from wayside shrines across Kyoto when the
 * Meiji separation of Buddhism and Shinto emptied them, and stood in ranks on
 * the terrace by the 西門.  Each is a shoulder-high granite figure in a red
 * bib, and the picture is entirely in the repetition: one is nothing, two
 * hundred in rows is one of the strangest things on the site.
 */
function sentaiSekibutsu(ctx, b, { x, z, ry = 0, rows = 7, cols = 22, seed = 4412 }) {
  const rng = rngKit(seed);
  const cos = Math.cos(ry), sin = Math.sin(ry);
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let cN = 0; cN < cols; cN++) {
      if (rng.chance(0.10)) continue;
      const u = (cN - (cols - 1) / 2) * 0.62 + rng.range(-0.05, 0.05);
      const v = (r - (rows - 1) / 2) * 0.72 + rng.range(-0.05, 0.05);
      const px = x + u * cos + v * sin, pz = z - u * sin + v * cos;
      // the tiers step up to the back, as they are actually set out
      const gy = ctx.groundAt(px, pz) + r * 0.14;
      const h = rng.range(0.52, 0.78);
      const col = rng.chance(0.35) ? PAL.stoneMoss : PAL.stone;
      const opt = { bands: 3, tint: col === PAL.stoneMoss ? TINT.green : TINT.cool };
      // body: a tapered block; head: a small lathe; a bib in faded red
      const body = new THREE.BoxGeometry(0.24, h, 0.18);
      body.translate(px, gy + h / 2, pz);
      b.add(body, null, col, opt);
      const head = lathe([[0.06, 0], [0.095, 0.05], [0.085, 0.14], [0.03, 0.19]], 7);
      head.translate(px, gy + h, pz);
      b.add(head, null, col, { ...opt, flat: false });
      const bib = new THREE.BoxGeometry(0.21, 0.20, 0.05);
      bib.translate(px, gy + h - 0.14, pz + 0.10);
      b.add(bib, null, rng.chance(0.5) ? PAL.lanternRed : PAL.bengaraLit,
        { bands: 3, tint: TINT.warmDeep });
      n++;
    }
  }
  return n;
}

/** 掛樋 water: a scrolling ribbon, the one thing at Kiyomizu that moves fast. */
const waterTex = () => cached('kiyomizuFall', () => make(32, 128, (cv, W, H) => {
  cv.fillStyle = hex(PAL.waterFoam);
  cv.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    cv.fillStyle = i % 3 ? hex(PAL.waterSky) : hex(PAL.water);
    cv.globalAlpha = 0.35 + Math.random() * 0.4;
    cv.fillRect(x, y, 1.5 + Math.random() * 3, 10 + Math.random() * 40);
  }
  cv.globalAlpha = 1;
}, { repeat: [1, 1] }));

/**
 * A flight of steps that finds its own bottom.
 *
 * `makeStoneSteps` descends a fixed number of treads from `top`, which means
 * hand-tuning the count against the ground -- and the ground here is a height
 * field with cuts and terraces in it, so the number is not knowable when the
 * call is written.  This walks out from the head of the flight until the tread
 * would be under the ground and stops there.
 */
function flight(ctx, { x, z, ry, w = 4.2, top, rise = 0.16, tread = 0.38, max = 70, baker }) {
  const s = Math.sin(ry), c = Math.cos(ry);
  let n = 1;
  while (n < max) {
    const v = (n + 0.5) * tread;
    if (top - n * rise <= ctx.groundAt(x + v * s, z + v * c) + 0.06) break;
    n++;
  }
  return makeStoneSteps(ctx, { x, z, ry, w, steps: n, rise, tread, top, baker });
}

/**
 * 本堂 collision, re-cut so the 外陣 can be walked into.
 *
 * `makeHondo` collides the hall as one bounding box, solid to anybody on the
 * terrace.  That is right for the 内陣 -- nobody goes in -- and wrong for the
 * 外陣, the outer worship hall between the front columns and the 蔀戸, which is
 * the room every visitor walks through on the way to the stage and where the
 * surveyed 本堂 point falls.  So the box is replaced by a rank of slabs
 * covering the hall from the shutter line north.
 *
 * Slabs rather than one box for a specific reason: the hall is turned 9.6 deg
 * off the axes, and a single AABB of a 25 x 21 m plan over-reaches by 4.1 m in
 * z -- enough to put an invisible wall four metres out in front of the
 * shutters.  Ten slabs bring that down to 0.21 m.
 *
 * The substructure columns get a `top` at deck level in the same pass: they are
 * pillars in a ravine, and to somebody standing on the deck twelve metres above
 * their heads they do not exist.
 */
function openTheGejin(ctx, from, hall, opts) {
  const cs = ctx.colliders;
  for (let i = from; i < cs.length; i++) {
    const c = cs[i];
    if (c.top === undefined && c.bottom === undefined
        && c.x1 - c.x0 < 2.2 && c.z1 - c.z0 < 2.2) c.top = opts.deckY;
  }
  for (let i = cs.length - 1; i >= from; i--) {
    const c = cs[i];
    if (c.x1 - c.x0 > 18 && c.z1 - c.z0 > 15) { cs.splice(i, 1); break; }
  }
  const { x, z, ry, coreW, halfD, cz, screenV, deckY } = opts;
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const world = (u, v) => ({ x: x + u * cos + v * sin, z: z - u * sin + v * cos });
  const v0 = cz - halfD + 0.5, v1 = screenV;
  const nSlab = 10, uw = (coreW - 1.0) / nSlab;
  for (let k = 0; k < nSlab; k++) {
    const u = -(coreW - 1.0) / 2 + (k + 0.5) * uw;
    const p = world(u, (v0 + v1) / 2);
    ctx.collideRot(p.x, p.z, uw, v1 - v0, ry, undefined, deckY + 1.0);
  }
}

/* ------------------------------------------------------------------ *
 * 3.  THE BUILD
 * ------------------------------------------------------------------ */

/**
 * How much of the maple reads red.  1.0 gives the November hillside.
 *
 * The world is set in spring, so this is NOT "some of the maples have turned".
 * It is the red-leaved cultivars: ノムラモミジ and 出猩々 are red from the moment
 * they open and are planted all over Kyoto's temple gardens precisely because
 * they hold that colour through the green months.  A tenth of the maples is
 * about right for a precinct planting; more than that and it stops being a
 * cultivar and starts being the wrong season.
 */
const AUTUMN = 0.09;

export function build(ctx) {
  const rng = rngKit(11331);
  const b = ctx.baker(BAKER);
  const L = ctx.LANDMARK;
  const out = { structures: [], pillars: 0, majors: 0, trees: 0, interact: 0 };
  const veg = [];              // exclusion circles: {x,z,r}
  const keepClear = (x, z, r) => veg.push({ x, z, r });

  /* ================================================================ *
   * 1.  THE GROUND -- cuts, then terraces, then the drawn relief.
   *     Nothing may be seated before all three have run.
   * ================================================================ */
  ravine(ctx);
  terraces(ctx);
  const relief = reliefGround(ctx);
  out.groundQuads = relief ? relief.quads : 0;

  /* ================================================================ *
   * 2.  仁王門 -- the Deva gate, and the first sight of the temple.
   *
   *     三間一戸楼門・入母屋造・檜皮葺, c.1500 -- the one major building
   *     that escaped the 1629 fire, so it is older than everything
   *     round it.  Vermilion; the locals call it 赤門.  Own baker and a
   *     drawn hull outline: it is read from 300 m down 清水坂 and from
   *     three, and a clip-space line is the only one that holds.
   * ================================================================ */
  const ryNio = bearingToRy(193.9);        // faces WNW, back down Kiyomizu-zaka
  const nio = makeNiomon(ctx, {
    x: L.niomon.x, z: L.niomon.z, ry: ryNio, steps: false,
  });
  out.structures.push('仁王門');
  ctx.stats.landmarks++;
  keepClear(nio.x, nio.z, 13);
  {
    const off = 5.0 / 2 + 1.1;
    flight(ctx, {
      x: nio.x + off * Math.sin(ryNio), z: nio.z + off * Math.cos(ryNio),
      ry: ryNio, w: 8.0, top: nio.base, rise: 0.16, tread: 0.40, baker: b,
    });
  }
  /* 「清水寺」 -- the plaque over the door, attributed to 藤原行成.  Gold on
   * dark, right-to-left, which is how the real board is written. */
  {
    const tex = cached('plq.kiyomizu', () => templePlaque('清水寺', { rtl: true }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.86),
      celTex(tex, { bands: 3, tint: TINT.warmDeep }));
    const d = 5.0 / 2 + 0.05;
    m.position.set(nio.x + d * Math.sin(ryNio), nio.base + 4.05, nio.z + d * Math.cos(ryNio));
    m.rotation.y = ryNio;
    m.userData.noOutline = true;
    ctx.add(m);
  }

  /* ================================================================ *
   * 3.  西門 and 三重塔 -- the pair that reads from the whole city.
   * ================================================================ */
  /* 三間一戸八脚門・切妻造・正面向拝一間・背面軒唐破風付・檜皮葺, 1631.
   * Floored, with a coffered ceiling: it is a hall as much as a gate, and
   * its function is 日想観 -- you stand on it and watch the sun go down
   * over the Western Paradise.  So it faces **due west**, and the whole
   * point of the object is the sunset seen through it. */
  const sai = makeSaimon(ctx, {
    x: L.saimon.x, z: L.saimon.z, ry: bearingToRy(180),
  });
  out.structures.push('西門');
  ctx.stats.landmarks++;
  keepClear(sai.x, sai.z, 11);
  flight(ctx, {
    x: sai.x - 4.2, z: sai.z, ry: -Math.PI / 2, w: 6.4, top: sai.base,
    rise: 0.16, tread: 0.38, baker: b,
  });

  /* 三重塔 -- 30.2 m, vermilion, and **本瓦葺**: hard grey ribbed tile with
   * 鬼瓦, against the soft brown bark of the Hondo 150 m away.  The temple
   * says 「国内最大級」, one of the largest -- not the tallest, and this file
   * will not say that it is. */
  const pagoda = makeThreeStoreyPagoda(ctx, {
    x: L.sanjunoto.x, z: L.sanjunoto.z, ry: 0.30,
    height: K.sanjunotoHeight, material: 'tile', vermilion: true,
    name: 'sanjunoto',
  });
  out.structures.push('三重塔');
  ctx.stats.landmarks++;
  keepClear(pagoda.x, pagoda.z, 13);

  /* 千体石仏群 -- two hundred small granite Buddhas in ranks, gathered from
   * wayside shrines across Kyoto when the Meiji separation edict emptied
   * them.  Every one in a red bib.  The picture is the repetition. */
  out.sekibutsu = sentaiSekibutsu(ctx, b, { x: 413, z: 371, ry: 0.42, rows: 7, cols: 24 });
  keepClear(413, 371, 10);

  /* 鐘楼 -- 桁行一間梁間二間・切妻造・本瓦葺, 1607, and unusually six pillars
   * rather than four.  It registers its own bell interactable. */
  const shoro = makeShoro(ctx, { x: 388.0, z: 350.5, ry: 0.75, baker: b });
  out.structures.push('鐘楼');
  keepClear(shoro.x, shoro.z, 7);
  out.interact++;

  /* 経堂 -- the sutra hall, 桁行五間梁間四間・入母屋造・本瓦葺, with the
   * circle-dragon on its 鏡天井. */
  const kyozo = makeSutraHall(ctx, { x: 438, z: 380, ry: 0.44, baker: b });
  out.structures.push('経堂');
  keepClear(kyozo.x, kyozo.z, 11);

  /* 随求堂 -- smaller, and the one you go *under*: 胎内めぐり, a hundred yen
   * to walk the pitch-dark passage beneath it. */
  const zuigudo = makeSutraHall(ctx, {
    x: 458, z: 396, ry: 0.52, baker: b, w: 9.2, d: 7.6, colH: 3.9, name: 'zuigudo',
  });
  out.structures.push('随求堂');
  keepClear(zuigudo.x, zuigudo.z, 9);

  /* ================================================================ *
   * 4.  轟門 -- the middle gate, the ticket gate, and famously doorless.
   *     三間一戸八脚門・切妻造・本瓦葺, 7.27 x 4.85 m.
   * ================================================================ */
  const todo = makeTodorokimon(ctx, {
    x: L.todorokimon.x, z: L.todorokimon.z, ry: bearingToRy(32.8), baker: b,
  });
  out.structures.push('轟門');
  ctx.stats.landmarks++;
  keepClear(todo.x, todo.z, 8);

  /* ================================================================ *
   * 5.  本堂 and 舞台 -- the National Treasure and its stage.
   *
   *     桁行九間梁間七間・寄棟造・起り・東西北面もこし付・正面両翼廊及び庇付
   *     ・檜皮葺・正面舞台付.  1633, Tokugawa Iemitsu.  36 x 31 m on plan,
   *     2,050 m2 of cypress bark 100 mm thick in the field and **250 mm at
   *     the eave**, on a 箱棟 with no tile anywhere.
   *
   *     `wing: 7.1` rather than the kit's default 5.1 is deliberate: the
   *     record's own arithmetic is 21.8 moya + 2 x 2.0 mokoshi + 2 x 5.1
   *     wing = 36.0, and the kit computes its moya as `w - 2*wing`, which
   *     leaves out the mokoshi and gives 25.8 where 21.8 is wanted.  7.1
   *     puts the clear width between the wings back to 21.8 -- which is
   *     exactly the stage's width, and the check that proves the figure.
   * ================================================================ */
  const HALL = { wing: 7.1, coreW: 25.8, halfD: 10.7, cz: -4.8, screenV: 1.75 };
  const c0 = ctx.colliders.length;
  const hondo = makeHondo(ctx, {
    x: HONDO.x, z: HONDO.z, ry: RY, baker: b,
    w: K.hondo[0], d: K.hondo[1], deckY: K.stageDeckY,
    stageDepth: K.stage[1], wing: HALL.wing,
  });
  out.structures.push('本堂');
  ctx.stats.landmarks++;
  out.pillars += hondo.under.posts;
  out.majors += hondo.under.majors;
  openTheGejin(ctx, c0, hondo, { ...HALL, x: HONDO.x, z: HONDO.z, ry: RY, deckY: K.stageDeckY });
  // the 翼廊, the two musicians' galleries flanking the stage
  for (const s of [-1, 1]) {
    const wu = s * (21.8 + HALL.wing) / 2, wv = HALL.cz + HALL.halfD - 1.0 + 3.2;
    ctx.collideRot(
      HONDO.x + wu * COS + wv * SIN, HONDO.z - wu * SIN + wv * COS,
      HALL.wing, 7.4, RY, undefined, K.stageDeckY + 1.0
    );
  }

  /* -------------------------------- 舞台 --------------------------------
   * 21.8 x 9.6 m -- **not** the 18 x 10 in circulation; 21.8 x 9.6 = 209 m2
   * against the temple's own ~200, and the stage is by definition the deck
   * between the two 翼廊, which the 36 m frontage less 2 x 5.1 m of wing
   * fixes at 21.8 m of clear width.
   *
   * It is placed off the **hall's** frame rather than off its own OSM
   * centroid: the two surveyed polygons disagree by about 8 m, and putting
   * the stage on its own centroid slides it clean past the east wing.  This
   * is `kit/temple.js`'s judgement and this file follows it.
   *
   * 55 uprights on a 2.18 x 2.40 m grid rather than the published 78: at 78
   * the centres come to 1.45 m, and 1.45 less a 0.64 m column less the
   * walker's 0.68 m leaves 130 mm -- i.e. you cannot walk underneath, which
   * is a hero view.  The deviation is stated, not hidden.
   */
  const stage = makeKakezukuri(ctx, {
    x: hondo.stageC.x, z: hondo.stageC.z, deckY: K.stageDeckY,
    w: K.stage[0], d: K.stage[1], ry: RY, baker: b,
    front: true, railing: true, deck: true, platform: true, collide: true,
    nukiTiers: 5, seed: 1633,
  });
  out.structures.push('舞台');
  ctx.stats.landmarks++;
  out.pillars += stage.posts;
  out.majors += stage.majors;
  out.stageDrop = stage.longest;
  // the stage's own columns, likewise, do not exist to somebody on the deck
  for (let i = c0; i < ctx.colliders.length; i++) {
    const c = ctx.colliders[i];
    if (c.top === undefined && c.bottom === undefined
        && c.x1 - c.x0 < 2.2 && c.z1 - c.z0 < 2.2) c.top = K.stageDeckY;
  }
  keepClear(hondo.hallC.x, hondo.hallC.z, 24);
  keepClear(stage.x, stage.z, 15);

  /* The world in front of the stage.  `world()` in the hall's own frame, so
   * everything below is placed in bays rather than in metres off a corner. */
  const HW = (u, v) => ({ x: HONDO.x + u * COS + v * SIN, z: HONDO.z - u * SIN + v * COS });

  /* 賽銭箱 -- in the 外陣, under the great eave, where it actually is. */
  {
    const p = HW(-1.0, 2.65);
    const box = makeSaisenbako(ctx, {
      x: p.x, z: p.z, ry: RY + Math.PI / 2, y: K.stageDeckY, w: 3.2, baker: BAKER,
    });
    hotspot(ctx, p.x, K.stageDeckY + 0.95, p.z, 3.4, 1.6, 1.8,
      'offer a coin', () => {});
    out.interact++;
    void box;
  }
  /* 常香炉 -- the incense burner out on the terrace, and the 手水鉢 beside it. */
  {
    const p = HW(6.4, 4.6);
    ctx.prop({ kind: 'incenseBurner', x: p.x, z: p.z, y: K.stageDeckY, rot: RY, seed: 41 });
    hotspot(ctx, p.x, K.stageDeckY + 1.1, p.z, 1.9, 1.9, 1.9,
      'waft the incense over your head', () => {});
    out.interact++;
    const q = HW(-9.6, 4.4);
    makeChozu(ctx, { x: q.x, z: q.z, y: K.stageDeckY, ry: RY, baker: BAKER });
  }
  /* The 高欄 on the stage's south edge -- the rail everybody leans on, and
   * the 1872 ban on jumping off is why it is there at all.  (The 成就院 diary
   * logs 235 jumps between 1694 and 1864, and 34 deaths: an 85 % survival
   * rate, which is a more interesting number than the legend.) */
  {
    const p = HW(0, (K.hondo[1] - K.stage[1]) / 2 + K.stage[1] / 2 - 0.3);
    hotspot(ctx, p.x, K.stageDeckY + 1.2, p.z, 6.0, 1.8, 1.6,
      'lean on the rail', () => {});
    out.interact++;
  }

  /* ================================================================ *
   * 6.  地主神社 -- the shrine behind the Hondo, up the bank.
   *
   *     **Shut since 2022-08-19** for 建造物・境内整備工事, with no reopening
   *     date, so it is modelled closed and fenced with its own banner on
   *     the gate.  Do not staff it and do not make the 恋占いの石
   *     reachable: that is the single most-repeated error about this site.
   * ================================================================ */
  {
    const jx = L.jishuShrine.x, jz = L.jishuShrine.z;
    flight(ctx, { x: 521, z: 400, ry: 0, w: 5.2, top: 118.90, rise: 0.157, tread: 0.36, baker: b });
    flight(ctx, { x: 521, z: 384, ry: 0, w: 4.6, top: 122.40, rise: 0.157, tread: 0.36, baker: b });
    stoneBank(ctx, b, [{ x: 546, z: 400 }, { x: 498, z: 400 }], 118.90, { seg: 3.0 });
    stoneBank(ctx, b, [{ x: 541, z: 384 }, { x: 505, z: 384 }], 122.40, { seg: 3.0 });
    const gate = makeTempleGate(ctx, {
      x: jx, z: jz + 8.0, ry: 0, w: 3.8, d: 2.6, colH: 3.3,
      material: 'tile', vermilion: true, doors: true, baker: b,
    });
    void gate;
    makeTempleWall(ctx, {
      points: [{ x: 507, z: 366 }, { x: 507, z: 381 }, { x: 517, z: 381 }],
      baker: b, h: 2.1, name: 'jishuWall',
    });
    makeTempleWall(ctx, {
      points: [{ x: 527, z: 381 }, { x: 538, z: 381 }, { x: 538, z: 366 }],
      baker: b, h: 2.1, name: 'jishuWall2',
    });
    /* 「地主神社は建造物・境内整備工事のため、閉門しています。（工期未定・
     * 開門時期未定）」 -- verbatim from the banner on the closed gate. */
    const tex = cached('notice.jishu', () => noticeBoard([
      '地主神社は建造物・境内',
      '整備工事のため、',
      '閉門しています。',
      '（工期未定・開門時期未定）',
    ], { title: '地主神社', board: 0x3a3028, w: 384, h: 448 }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.75),
      celTex(tex, { bands: 3, tint: TINT.cool }));
    const gy = ctx.groundAt(jx - 3.4, jz + 8.4);
    m.position.set(jx - 3.4, gy + 1.55, jz + 8.4);
    m.rotation.y = Math.PI;
    m.userData.noOutline = true;
    ctx.add(m);
    ctx.collide(jx - 4.2, jz + 8.2, jx - 2.6, jz + 8.6, gy + 0.9);
    hotspot(ctx, jx - 3.4, gy + 1.55, jz + 8.9, 1.8, 2.0, 0.9,
      'read the notice', () => {});
    out.interact++;
    out.structures.push('地主神社');
    ctx.stats.landmarks++;
    keepClear(jx, jz, 16);
  }

  /* ================================================================ *
   * 7.  奥の院 -- and the view back.
   *
   *     懸造・桁行五間梁間五間・一重・寄棟造・檜皮葺, 1633.  Its own, much
   *     smaller kakezukuri standing over the head of the Otowa gorge -- and
   *     **the viewpoint**: this is where the photograph of the Hondo and its
   *     stage in profile is taken, fifty metres away on bearing 282.
   *
   *     So it is turned to face 250 deg, WSW, out over the falls: that puts
   *     its deck on the ravine side, which is where the camera stands, and
   *     leaves the sightline back to the stage clear of its own roof.  Its
   *     2011-17 restoration repainted the 極彩色 bracketing from paint
   *     evidence **except on the south face**, whose original survives; the
   *     kit models that two-tone and it is worth walking round to see.
   * ================================================================ */
  const c1 = ctx.colliders.length;
  const oku = makeOkunoin(ctx, {
    x: L.okunoin.x, z: L.okunoin.z, ry: bearingToRy(160),
    deckY: 116.95, baker: b, w: 11.0, d: 11.0,
  });
  out.structures.push('奥の院');
  ctx.stats.landmarks++;
  out.pillars += oku.under.posts;
  for (let i = c1; i < ctx.colliders.length; i++) {
    const c = ctx.colliders[i];
    if (c.top === undefined && c.bottom === undefined
        && c.x1 - c.x0 < 2.2 && c.z1 - c.z0 < 2.2) c.top = 116.95;
  }
  keepClear(oku.x, oku.z, 15);
  stoneBank(ctx, b, [{ x: 533, z: 437 }, { x: 548, z: 439.5 }, { x: 566, z: 442 }],
    116.1, { seg: 3.2, batter: 0.16 });

  /* 阿弥陀堂 -- on the rim between the Hondo and Okunoin, where it is. */
  const amida = makeSutraHall(ctx, {
    x: 552, z: 431, ry: bearingToRy(80) , baker: b, w: 10.4, d: 8.2, colH: 4.0, name: 'amidado',
  });
  out.structures.push('阿弥陀堂');
  keepClear(amida.x, amida.z, 10);

  /* ================================================================ *
   * 8.  音羽の瀧 -- three streams, four metres, and the temple's name.
   *
   *     Not a natural sheet fall: the water is delivered through three 筧,
   *     split-timber flumes, 1.3 m apart, and you catch it in a long-handled
   *     柄杓 off the rack.  金色水 and 延命水.  不動明王 is enshrined at the
   *     head of it and 奥の院 stands directly overhead.
   *
   *     The temple writes it 音羽の**瀧**, with the old character, on its own
   *     map; 滝 is the tourist-signage form.
   * ================================================================ */
  const ryOto = bearingToRy(70);           // the queue stands SSE of the fall
  const otowa = makeOtowaFalls(ctx, {
    x: L.otowaFalls.x, z: L.otowaFalls.z, ry: ryOto, baker: b,
  });
  out.structures.push('音羽の瀧');
  ctx.stats.landmarks++;
  keepClear(otowa.x, otowa.z, 10);
  {
    /* The water itself, as one mesh of four quads with a scrolling streak
     * texture.  It is the only thing in the district that moves quickly, and
     * it is the loudest thing on the site; everything else here drifts. */
    const g0 = ctx.groundAt(otowa.x, otowa.z);
    const quads = [];
    const push = (w, h, px, py, pz, rx) => {
      const q = new THREE.PlaneGeometry(w, h);
      if (rx) q.rotateX(rx);
      q.translate(px, py, pz);
      quads.push(q);
    };
    for (const u of otowa.streams) push(0.30, 4.0, u, g0 + 0.5 + 2.0, -0.88, 0);
    push(4.0, 1.5, 0, g0 + 0.53, 0.4, -Math.PI / 2);
    const merged = mergeGeometries(quads, false);
    merged.applyMatrix4(trs(otowa.x, 0, otowa.z, 0, ryOto, 0));
    const mesh = new THREE.Mesh(merged, celTex(waterTex(), {
      bands: 'soft3', tint: TINT.cool, transparent: true,
      side: THREE.DoubleSide, flat: false,
    }));
    mesh.material.opacity = 0.80;
    mesh.material.depthWrite = false;
    mesh.userData.noOutline = true;
    mesh.renderOrder = 2;
    ctx.add(mesh);
    const tex = mesh.material.map;
    /* Water is the one thing here allowed to move fast.  Everything else in
     * this world drifts; the fall does not. */
    ctx.update((dt) => { tex.offset.y -= dt * 1.35; });
    hotspot(ctx, otowa.x, g0 + 1.5, otowa.z + 1.4, 4.6, 2.4, 2.4,
      'take a ladle from the rack', () => { tex.offset.y -= 0.4; });
    out.interact++;
    hotspot(ctx, otowa.x, g0 + 0.9, otowa.z - 0.6, 4.6, 1.8, 1.6,
      'drink from the 延命水', () => {});
    out.interact++;
  }

  /* ================================================================ *
   * 9.  子安塔 -- across the 錦雲渓.
   *
   *     三間三重塔婆・**檜皮葺** -- cypress bark, not tile, which is the most
   *     commonly mis-modelled thing about this building.  15 m, vermilion,
   *     193 m due south of the stage at very nearly the same elevation, so it
   *     reads as a small red tower floating in the treetops.  It is the depth
   *     cue that makes the ravine legible from the stage, and it does *not*
   *     get an outline: three objects in this district do, and they are all
   *     on the approach.
   * ================================================================ */
  const koyasu = makeKoyasuPagoda(ctx, {
    x: L.koyasuPagoda.x, z: L.koyasuPagoda.z, ry: 0.42, baker: b, outline: false,
  });
  out.structures.push('子安塔');
  ctx.stats.landmarks++;
  keepClear(koyasu.x, koyasu.z, 12);
  {
    const gy = ctx.groundAt(koyasu.x - 5.5, koyasu.z - 2.0);
    const tex = cached('plq.koyasu', () => templePlaque('子安塔', { w: 384, h: 180 }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.42),
      celTex(tex, { bands: 3, tint: TINT.warmDeep, side: THREE.DoubleSide }));
    m.position.set(koyasu.x - 5.5, gy + 1.35, koyasu.z - 2.0);
    m.rotation.y = 0.42 + Math.PI;
    m.userData.noOutline = true;
    ctx.add(m);
    b.add(new THREE.BoxGeometry(0.10, 1.35, 0.10),
      trs(koyasu.x - 5.5, gy + 0.675, koyasu.z - 2.0, 0, 0.42, 0),
      PAL.timberDark, { bands: 3, tint: TINT.warm });
    hotspot(ctx, koyasu.x - 5.5, gy + 1.3, koyasu.z - 2.2, 1.2, 1.6, 1.0,
      'read the plaque', () => {});
    out.interact++;
  }

  /* ================================================================ *
   * 10.  THE FURNITURE
   * ================================================================ */

  /* 築地塀 -- rammed earth on a stone plinth, battered, with its own little
   * tiled roof.  It closes the north side of the approach, which is what
   * turns a path across a hillside into a precinct. */
  makeTempleWall(ctx, {
    points: [{ x: 380, z: 342 }, { x: 398, z: 358 }, { x: 406, z: 368 }],
    baker: b, h: 2.2, name: 'kiyomizuWallN',
  });
  makeTempleWall(ctx, {
    points: [{ x: 406, z: 368 }, { x: 434, z: 372 }, { x: 452, z: 378 }],
    baker: b, h: 2.2, name: 'kiyomizuWallN2',
  });

  /* The banks that hold the courts up.  Wound so the outward normal faces
   * downhill; `stoneBank` asks the height field where the foot is. */
  stoneBank(ctx, b, [{ x: 452, z: 400 }, { x: 452, z: 372 }, { x: 404, z: 372 }], 112.35, { seg: 3.2 });
  stoneBank(ctx, b, [{ x: 498, z: 421 }, { x: 498, z: 399 }, { x: 470, z: 396 }], 114.9, { seg: 3.2 });
  stoneBank(ctx, b, [{ x: 542, z: 400 }, { x: 496, z: 399 }], 115.45, { seg: 3.4 });

  /* 石灯籠 -- 春日型, down both sides of the approach.  Spaced irregularly
   * and set well back: they belong to the donors who gave them, not to a
   * lighting scheme, and an even run reads as municipal. */
  {
    const c = ctx.getCorridor('kiyomizuPrecinct');
    if (c) {
      for (let s = 14; s < c.length - 8; s += rng.range(11, 19)) {
        const p = c.pointAt(s);
        const side = rng.chance(0.5) ? 1 : -1;
        const off = rng.range(6.2, 8.4) * side;
        const px = p.x + (-p.tz) * off, pz = p.z + p.tx * off;
        if (px > 494) continue;                 // the Hondo terrace has its own
        const lit = rng.chance(0.4);
        makeStoneLantern(ctx, {
          kind: rng.chance(0.75) ? 'kasuga' : 'path',
          x: px, z: pz, ry: rng.range(0, 6.28), baker: BAKER, lit,
        });
        keepClear(px, pz, 2.4);
        if (lit) {
          ctx.light({ x: px, y: ctx.groundAt(px, pz) + 1.9, z: pz,
            color: PAL.lanternLit, intensity: 0.42, distance: 9 });
        }
      }
    }
  }
  // a pair flanking the Todoroki-mon, and a pair at the head of the Niomon steps
  for (const s of [-1, 1]) {
    const px = todo.x + s * 6.0 * Math.cos(todo.ry), pz = todo.z - s * 6.0 * Math.sin(todo.ry);
    makeStoneLantern(ctx, { kind: 'kasuga', x: px, z: pz, ry: 0.3, baker: BAKER });
    keepClear(px, pz, 2.4);
  }

  /* 絵馬 and おみくじ, on the terrace west of the Hondo where the 授与所 is. */
  {
    const ema = makeEmaRack(ctx, {
      x: 505.5, z: 414.0, ry: RY + Math.PI / 2, y: 115.5, frames: 3, baker: BAKER,
    });
    out.ema = ema.ema;
    hotspot(ctx, 505.5, 116.4, 414.0, 3.0, 1.8, 2.0, 'hang an ema', () => {});
    out.interact++;
    const omi = makeOmikujiStand(ctx, {
      x: 509.5, z: 409.5, ry: RY, y: 115.5, baker: BAKER,
    });
    out.omikuji = omi.slips;
    hotspot(ctx, 509.5, 116.3, 409.5, 2.2, 1.8, 1.6, 'draw a fortune', () => {});
    out.interact++;
    keepClear(507, 412, 9);
  }

  /* ------------------------------ the notices -----------------------------
   * Verbatim from `docs/recon/STREET.md` 2.7.  The hours board is the one
   * with the lovely clause in it: the gate opens at six, and the amulet and
   * goshuin counters do not open until about eight. */
  const boardMat = (key, lines, title) => celTex(
    cached(key, () => noticeBoard(lines, { title, board: 0x3a3028, w: 384, h: 512 })),
    { bands: 3, tint: TINT.cool }
  );
  const postBoard = (x, z, ry, mat, w = 1.6, h = 2.05, label = 'read the notice') => {
    const gy = ctx.groundAt(x, z);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h * 0.78), mat);
    m.position.set(x, gy + 1.55, z);
    m.rotation.y = ry;
    m.userData.noOutline = true;
    ctx.add(m);
    for (const s of [-1, 1]) {
      b.add(new THREE.BoxGeometry(0.11, h + 0.5, 0.11),
        trs(x + s * (w / 2 + 0.09) * Math.cos(ry), gy + (h + 0.5) / 2 - 0.25,
          z - s * (w / 2 + 0.09) * Math.sin(ry), 0, ry, 0),
        PAL.timberDark, { bands: 3, tint: TINT.warm });
    }
    b.add(new THREE.BoxGeometry(w + 0.5, 0.16, 0.34),
      trs(x, gy + h + 0.22, z, 0, ry, 0), PAL.timberDark, { bands: 3, tint: TINT.warm });
    ctx.collide(x - w / 2, z - 0.3, x + w / 2, z + 0.3, gy + 0.6);
    hotspot(ctx, x + 0.9 * Math.sin(ry), gy + 1.5, z + 0.9 * Math.cos(ry),
      1.8, 2.0, 1.2, label, () => {});
    out.interact++;
  };

  postBoard(378.5, 352.0, bearingToRy(193.9) + Math.PI / 2,
    boardMat('notice.hours', [
      '拝観時間：',
      '6：00開門〜18：00閉門',
      '（7.8月は18：30閉門）',
      '春、夏、秋の夜間特別拝観',
      '期間中は21：00受付終了',
      'なお、お守り授与所、納経所',
      '（ご朱印）での授与は8：00頃',
      'からとなりますので、',
      'ご了承の上お参りください。',
    ], '音羽山清水寺'), 1.8, 2.2, 'read the opening times');

  postBoard(470.0, 414.0, bearingToRy(212.8) + Math.PI / 2,
    boardMat('notice.fee', [
      '拝観料',
      '大人 500円',
      '小・中学生 200円',
      '拝観料の団体割引等は',
      'ございません。',
      'Admission',
      'Adults ¥500',
      'Junior high & under ¥200',
    ], '拝観料'), 1.7, 2.1, 'read the admission notice');

  /* 世界文化遺産　清水寺 -- the granite entrance marker by the Niomon steps.
   * ~0.3 x 0.3 x 2.0 m, deeply incised, black-inked. */
  {
    const mx = 370.0, mz = 351.6, gy = ctx.groundAt(mx, mz);
    const tex = cached('marker.kiyomizu', () => woodenSign('世界文化遺産　清水寺', {
      vertical: true, brush: false, border: false, w: 96, h: 512,
      board: PAL.stone, textColor: PAL.black,
    }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 1.9),
      celTex(tex, { bands: 3, tint: TINT.cool, side: THREE.DoubleSide }));
    m.position.set(mx, gy + 1.1, mz + 0.16);
    m.rotation.y = bearingToRy(193.9) + Math.PI / 2;
    m.userData.noOutline = true;
    ctx.add(m);
    b.add(new THREE.BoxGeometry(0.32, 2.2, 0.32), trs(mx, gy + 1.0, mz, 0, 0.1, 0),
      PAL.stone, { bands: 3, tint: TINT.cool });
    ctx.collide(mx - 0.2, mz - 0.2, mx + 0.2, mz + 0.2);
  }

  /* Traces of people rather than people: the sweeping done at dawn, the
   * candle stands, the leaf piles under the maples. */
  for (const [x, z, kind] of [
    [392.0, 362.5, 'candleStand'], [416.5, 392.0, 'candleStand'],
    [447.0, 402.0, 'waterBucket'], [462.0, 404.5, 'broom'],
    [430.5, 396.5, 'tileStack'], [401.0, 371.5, 'stoneBasin'],
    [479.0, 424.0, 'leafPile'], [498.0, 411.0, 'leafPile'],
    [551.0, 437.0, 'pathMarker'], [536.5, 431.0, 'pathMarker'],
  ]) {
    ctx.prop({ kind, x, z, y: ctx.groundAt(x, z), rot: rng.range(0, 6.28), seed: rng.int(0, 9999) });
  }

  /* ================================================================ *
   * 11.  THE WOOD
   *
   *      The stage's whole meaning is that it projects out over a wooded
   *      ravine.  If the ravine is bare the object is a balcony over a
   *      quarry, so this is not decoration -- it is half the building.
   *
   *      The mix is what is actually on this hillside: イロハモミジ maple
   *      through the ravine and along the approach, 杉 cedar in the deep
   *      shade of the gorge and up the slope behind, 赤松 pine on the dry
   *      ridges, one bamboo stand, and moss and camellia at ground level.
   *      Maple is spring green here; `AUTUMN` at the top of the file is the
   *      dial, and at 1.0 the whole hillside turns.
   * ================================================================ */
  const plant = (spec) => {
    const r = rngKit(spec.seed);
    let placed = 0, guard = 0;
    while (placed < spec.n && guard++ < spec.n * 6) {
      const x = r.range(spec.x0, spec.x1), z = r.range(spec.z0, spec.z1);
      if (spec.test && !spec.test(x, z)) continue;
      const su = ctx.surfaceAt(x, z);
      if (su && su.dist < su.half + 2.0) continue;      // never on the path
      let clash = false;
      for (let i = 0; i < veg.length; i++) {
        const c = veg[i];
        if ((x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r) { clash = true; break; }
      }
      if (clash) continue;
      const y = ctx.groundAt(x, z);
      const kind = spec.pick(r, x, z, y);
      if (!kind) continue;
      ctx.tree({
        kind, x, z, y,
        scale: spec.scale ? spec.scale(r, kind) : r.range(0.85, 1.25),
        rot: r.range(0, Math.PI * 2), seed: r.int(0, 999999),
        autumn: kind === 'maple' && r.chance(AUTUMN),
      });
      placed++;
    }
    out.trees += placed;
    return placed;
  };

  /* The ravine under and around the stage -- the densest planting in the
   * world, and the one the Okunoin view is composed against.  Cedar low in
   * the gorge where it is always in shade, maple up the sides. */
  plant({
    x0: 486, x1: 580, z0: 424, z1: 500, n: 280, seed: 7701,
    pick: (r, x, z, y) => (y < 100 ? (r.chance(0.55) ? 'cedar' : 'maple')
      : y < 110 ? (r.chance(0.62) ? 'maple' : 'cedar')
        : (r.chance(0.5) ? 'maple' : r.chance(0.5) ? 'pine' : 'shrub')),
    scale: (r, k) => (k === 'cedar' ? r.range(1.1, 1.7) : r.range(0.85, 1.35)),
  });
  /* The 錦雲渓 south of the falls, which the Koyasu pagoda floats across. */
  plant({
    x0: 478, x1: 586, z0: 466, z1: 646, n: 300, seed: 7702,
    pick: (r, x, z, y) => (y < 102 ? (r.chance(0.5) ? 'cedar' : 'maple')
      : r.chance(0.42) ? 'cedar' : r.chance(0.5) ? 'maple' : 'pine'),
    scale: (r, k) => (k === 'cedar' ? r.range(1.15, 1.8) : r.range(0.9, 1.4)),
  });
  /* The slope above and behind the precinct: cedar and pine closing every
   * eastward view, which is what the ridge behind the temple actually does. */
  plant({
    x0: 400, x1: 600, z0: 332, z1: 412, n: 180, seed: 7703,
    pick: (r, x, z) => (x > 545 ? (r.chance(0.6) ? 'cedar' : 'pine')
      : r.chance(0.42) ? 'maple' : r.chance(0.55) ? 'cedar' : 'pine'),
    scale: (r, k) => (k === 'cedar' ? r.range(1.1, 1.75) : r.range(0.9, 1.4)),
  });
  /* The approach itself: maple over the path, a few big pines, and the
   * ground layer of camellia and shrub against the walls. */
  plant({
    x0: 366, x1: 500, z0: 336, z1: 428, n: 130, seed: 7704,
    pick: (r) => (r.chance(0.50) ? 'maple' : r.chance(0.34) ? 'pine'
      : r.chance(0.5) ? 'camellia' : 'shrub'),
    scale: (r, k) => (k === 'maple' ? r.range(0.9, 1.5) : r.range(0.8, 1.2)),
  });
  /* One bamboo stand, in the damp hollow north-east of the 経堂. */
  plant({
    x0: 452, x1: 476, z0: 372, z1: 392, n: 46, seed: 7705,
    pick: () => 'bamboo', scale: (r) => r.range(0.9, 1.3),
  });
  /* Moss and low shrub in the shade under the kakezukuri -- the ravine floor
   * is not bare earth, and looking up into the frame from down there is one
   * of the best things in the project. */
  plant({
    x0: 500, x1: 548, z0: 432, z1: 476, n: 70, seed: 7706,
    pick: (r) => (r.chance(0.6) ? 'shrub' : 'camellia'),
    scale: (r) => r.range(0.7, 1.15),
  });

  out.interactables = out.interact;
  ctx.stats.shopfronts += 0;
  return out;
}
