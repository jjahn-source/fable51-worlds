import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT } from '../core/toon.js';
import { Baker, lathe, trs, lerp, rngKit } from '../core/util.js';
import { hipRoof, gableRoof, irimoyaRoof, karahafu, rafters, brackets, gyo } from './roof.js';
import { hullOutlineTree } from '../core/outline.js';
import { makeThreeStoreyPagoda } from './pagoda.js';
import { KIYOMIZU } from '../data/route.js';

/* ------------------------------------------------------------------ *
 * 清水寺 -- Kiyomizu-dera's vocabulary.
 *
 * Everything here is built to ARCH.md §6, which is a cultural-property record
 * set rather than a guidebook.  Four corrections it makes matter more than the
 * rest, because the popular figures are wrong in ways that change the model:
 *
 *   - **The temple is not on a mountain.**  The stage deck is 115.5 m ASL and
 *     the whole precinct spans 96 m (the Otowa waterfall) to 122 m (Jishu).
 *     The 240-250 m that circulates is the ridge *behind* it.  Kiyomizu is
 *     tucked into a ravine head, not perched on a summit.
 *
 *   - **The stage is 21.8 x 9.6 m, not 18 x 10.**  Two checks defeat the
 *     popular figure: 21.8 x 9.6 = 209 m2 against the temple's own ~200 m2,
 *     and the stage sits *between* the two 翼廊 wings, which the 36 m frontage
 *     minus 2 x 5.1 m of wing puts at exactly 21.8 m of clear width.
 *
 *   - **168 pillars under the Hondo, 78 under the stage, 18 "major", 6 in the
 *     sixteen-sided front rank.**  Those are four different populations, not
 *     four claims about one number.  The 139 in circulation is hedged and
 *     uncited in its own source.
 *
 *   - **Pillar diameter is 0.64 m.**  The temple's own essay says 2 m, which
 *     is 周囲 (circumference) misread as 直径 -- the same site's history page
 *     gives 周囲約2メートル.
 *
 * The other thing to hold on to: 檜皮葺 and 本瓦葺 must not look alike.  The
 * Hondo, Niomon, Saimon, Okunoin and Koyasu-to are cypress bark -- warm brown,
 * matte, no ribs, a 250 mm razor-cut eave and a soft 箱棟 ridge.  The
 * three-storey pagoda, the belfry, the sutra hall and Todoroki-mon are tile --
 * cold grey, hard ribs, 鬼瓦 and stacked ridge courses.  That pairing, 150 m
 * apart, is the signature of the site.
 * ------------------------------------------------------------------ */

/* ---------------------------- shared helpers ---------------------------- */

const _m4 = () => new THREE.Matrix4();
const DEG = Math.PI / 180;

function xform(parts, m) {
  for (const p of parts) p.geometry.applyMatrix4(m);
  return parts;
}

const triCount = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;

class Parts {
  constructor() { this.list = []; this.count = 0; }
  add(geometry, color, opts) {
    this.list.push({ geometry, color, opts });
    this.count += triCount(geometry);
    return this;
  }
  all(parts) { for (const p of parts) this.add(p.geometry, p.color, p.opts); return this; }
  /** Hand everything to a baker under one placement matrix. */
  bake(B, m) { for (const p of this.list) B.add(p.geometry, m, p.color, p.opts); return this.count; }
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

function post(rBot, rTop, h, seg = 12) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1);
  g.translate(0, h / 2, 0);
  return g;
}

/**
 * The `ry` that points a building's FRONT at a compass bearing.
 *
 * Every generator here builds in a local frame where +u runs along the
 * frontage and **+v is the way the building faces**, so that a gate's doorway,
 * a hall's open side and a stage's projection are all the same axis.  With
 * `world(u,v) = (x + u cos ry + v sin ry, z - u sin ry + v cos ry)`, +v has
 * bearing `atan2(sin ry, -cos ry)`, so the front faces bearing B at
 * `ry = 180 - B`.  Getting this backwards puts the Saimon's sunset front
 * facing the hillside, which is the sort of error that only shows up in a
 * render.
 */
export const facing = (deg) => (180 - deg) * DEG;
/** The bearing of the frontage (+u) axis instead -- e.g. the stage's 80.4. */
export const bearingToRy = (deg) => facing(deg + 90);

/**
 * Timber palettes.  Vermilion is the exception in this world and only the
 * gates, the three-storey pagoda and Koyasu-to get it.
 */
function palette(vermilion) {
  return vermilion ? {
    column: PAL.vermilion, beam: PAL.vermilionDeep, bracket: PAL.vermilion,
    block: PAL.gatePanel, rafter: PAL.vermilion, panel: PAL.gatePanel,
    rail: PAL.vermilion, dark: PAL.vermilionDeep, tint: TINT.warmDeep,
    panelBands: 'soft3',
  } : {
    column: PAL.timberMid, beam: PAL.timberDark, bracket: PAL.timberWarm,
    block: PAL.timberPale, rafter: PAL.timberWarm, panel: PAL.plaster,
    rail: PAL.timber, dark: PAL.timberDark, tint: TINT.warm,
    panelBands: 'soft3',
  };
}

/** Finish a building: own baker (and a drawn outline) or a district's. */
function emit(ctx, P, { baker, x, y, z, ry, name, outline }) {
  const own = !baker;
  const B = baker || new Baker(name);
  const tris = P.bake(B, trs(x, y, z, 0, ry, 0));
  let group = null;
  if (own) {
    group = B.build();
    group.name = name;
    ctx.add(group);
    if (outline) {
      hullOutlineTree(group, { thickness: 0.0028 });
      group.traverse((n) => {
        if (n.userData.isOutline) { n.castShadow = false; n.userData.noShadow = true; }
      });
    }
  }
  return { group, triangles: tris };
}

/* ------------------------------------------------------------------ *
 * 1.  THE GROUND
 *
 * `kiyomizuTerrain` carves the ravine head the stage is built out over.
 *
 * The height field in `route.js` is a west-to-east hill profile plus the
 * street corridors, and at the temple it reads about 120 m -- five metres
 * ABOVE the stage deck.  The DEM says otherwise, and says it precisely: a 95 m
 * transect on bearing 200 deg through the Hondo gives 115.5 m of dead-flat
 * terrace out to ten metres past the hall centre, then 105.8 at +15 m, 102.7
 * at +20, 98.5 at +25, 92.9 at +35 and 84.3 at +50.  The stage is built out
 * over precisely that break of slope, and without it there is no 13 m of air
 * under the deck and no ravine for the Koyasu pagoda to float across.
 *
 * So the ravine is registered as a staircase of `ctx.cut` boxes fitted to that
 * transect, three nested widths per band so the sides step down rather than
 * standing as a wall.  **Call this before anything is seated at Kiyomizu.**
 *
 * ⚠ `world/index.js` builds the visible ground mesh *before* the districts
 * run, so a cut registered here changes `heightAt` -- collision, seating, the
 * player -- but not the drawn hillside.  Until that build order is fixed (or
 * the ravine goes into `HILL_PROFILE`), the visible hill will still stand over
 * the stage.  See the note in `_temple_test.js`.
 * ------------------------------------------------------------------ */
export function kiyomizuTerrain(ctx) {
  /* The fall line, keyed on z (south) at the stage's longitude.  Fitted to the
   * DEM transect above; the stage centre lands on 102.8 m, which is the
   * surveyed bare ground and therefore the sourced 12.7 m of air. */
  const FALL = [
    [421, 115.4], [424, 113.4], [426, 109.6], [428, 105.4], [429.5, 102.8],
    [432, 101.9], [435, 101.4], [440, 99.4], [446, 96.9], [452, 95.0],
    [458, 93.4], [464, 91.6], [470, 90.0],
  ];
  const floorAt = (z) => {
    if (z <= FALL[0][0]) return FALL[0][1];
    for (let i = 1; i < FALL.length; i++) {
      if (z <= FALL[i][0]) {
        const a = FALL[i - 1], b = FALL[i];
        return lerp(a[1], b[1], (z - a[0]) / (b[0] - a[0]));
      }
    }
    return FALL[FALL.length - 1][1];
  };

  /* Three nested windows a band: the ravine is a V, and a single box would
   * leave a sixteen-metre vertical wall down each side of it. */
  const bands = [
    { inset: 0, drop: 0, x0: 502, x1: 534 },
    { inset: 0, drop: 3.6, x0: 497, x1: 538 },
    { inset: 0, drop: 8.0, x0: 491, x1: 543 },
  ];
  for (let z = 421; z < 470; z += 2) {
    const y = floorAt(z + 1);
    for (const b of bands) {
      /* East of x=534 the Okunoin path runs along the hillside at 115-116 m;
       * the deck platform restores it inside the stage footprint, but beyond
       * that the cut has to stay clear of it. */
      const x1 = z < 440 ? Math.min(b.x1, 534) : b.x1;
      ctx.cut({ x0: b.x0, z0: z, x1, z1: z + 2.2, top: y + b.drop });
    }
  }
  /* The bowl the Otowa waterfall falls into: the ravine floor at 96 m, joined
   * to the main ravine.  The Okunoin path already descends to it as a
   * corridor; this widens the slot so it reads as a valley head rather than a
   * trench, and keeps clear of the path's own descent east of x=560. */
  ctx.cut({ x0: 534, z0: 446, x1: 562, z1: 472, top: 100.5 });
  ctx.cut({ x0: 538, z0: 450, x1: 558, z1: 468, top: 96.4 });

  /* The ravine's EAST flank, climbing out of the head toward the Okunoin.
   * Without it the ground stands level with the deck right up against the
   * stage's east end and the whole structure reads as a platform on a lawn
   * from the one viewpoint it is always photographed from.
   *
   * It starts at z = 435 -- just south of the 奥の院道 corridor, which
   * route.js draws straight out from the stage centre across the ravine head.
   * That polyline should really hug the Hondo's east side (z ~ 420) before it
   * turns south; as drawn, cutting the ground it crosses would leave a hole in
   * the walkway, so the flank stops short of it. */
  for (let z = 435; z < 468; z += 2) {
    const y = floorAt(z + 1);
    /* Disjoint slices, not nested ones: a cut takes the MINIMUM of every box
     * covering a point, so overlapping bands with rising tops would all be
     * beaten by the deepest one and the flank would come out inverted. */
    for (let k = 0; k < 8; k++) {
      const x0 = 533 + k * 2.5;
      ctx.cut({ x0, z0: z, x1: x0 + 2.6, z1: z + 2.2, top: y + 1.2 + k * 2.3 });
    }
  }

  /* ------------------------- the precinct terraces -----------------------
   * 「境内は山腹を石垣で段状に造成」-- the whole temple is cut into the
   * hillside as terraces on stone retaining walls, and the survey gives the
   * level of every one of them.  The street corridors carry the path itself
   * but only for five metres either side, so without these the halls stand on
   * a hillside that is six metres above their own floors.  Each terrace gets a
   * shallower apron around it so the edge steps down rather than standing as a
   * wall; the visible 石垣 is the district builder's to draw. */
  const TERRACE = [
    { name: 'niomon',      x0: 352, z0: 328, x1: 402, z1: 364, top: 104.8 },
    { name: 'saimon',      x0: 384, z0: 362, x1: 412, z1: 392, top: 112.0 },
    { name: 'sanjunoto',   x0: 404, z0: 372, x1: 442, z1: 402, top: 112.4 },
    { name: 'todorokimon', x0: 442, z0: 398, x1: 500, z1: 432, top: 115.1 },
    { name: 'hondo',       x0: 494, z0: 396, x1: 544, z1: 424, top: 115.6 },
    { name: 'okunoinWalk', x0: 534, z0: 408, x1: 572, z1: 432, top: 116.2 },
    { name: 'okunoin',     x0: 566, z0: 430, x1: 598, z1: 452, top: 116.6 },
    { name: 'jishu',       x0: 506, z0: 362, x1: 540, z1: 392, top: 122.4 },
  ];
  for (const t of TERRACE) {
    ctx.cut(t);
    ctx.cut({ x0: t.x0 - 5, z0: t.z0 - 5, x1: t.x1 + 5, z1: t.z1 + 5, top: t.top + 3.4 });
    ctx.cut({ x0: t.x0 - 10, z0: t.z0 - 10, x1: t.x1 + 10, z1: t.z1 + 10, top: t.top + 7.5 });
  }
  return { floorAt, terraces: TERRACE };
}

/* ------------------------------------------------------------------ *
 * 2.  懸造 -- KAKEZUKURI, the pillar scaffold.
 *
 * **This is the object.  It is not a texture and it is not a box on stilts.**
 *
 * A lattice of keyaki (zelkova) uprights standing loose on 束石 stone pads --
 * not fixed to them, not fixed to each other -- laced in both directions by
 * 貫, thick zelkova planks driven THROUGH mortices in the columns and locked
 * with hardwood wedges.  No nails anywhere in the frame; that claim is true of
 * the substructure and false of the building above it, whose bark roof carries
 * something like 1.7 million bamboo nails.  What the frame gives you is a
 * moment-resisting cage that can be taken apart member by member, which is how
 * 根継ぎ works: rot the base of a 400-year-old column away, cut off 300-900 mm
 * and scarf a new length on.  Nine of the stage's columns had that done in
 * 2013, for the first time since 1633.
 *
 * ------------------------------------------------------- THE GRID
 *
 * The published numbers are 78 uprights under the stage, of which **18 are
 * "major"** and the **front rank of 6 is sixteen-sided in plan and 12 m long**.
 * One grid reconciles the last two exactly:
 *
 *     across  21.8 m / 10 bays = 2.18 m  ->  11 positions
 *     deep     9.6 m /  4 bays = 2.40 m  ->   5 rows      = 55 uprights
 *     majors   every other position, rows 0/2/4  ->  6 x 3 = 18   ✔
 *     front rank, row 0, majors only        ->  6 sixteen-sided   ✔
 *
 * 55 rather than 78: the remaining ~23 are the props under the two 翼廊 wings,
 * which are their own structure.  The alternative -- forcing 78 onto this
 * footprint -- gives 1.45 m centres, and with 0.64 m columns and the walker's
 * 0.68 m that leaves 130 mm of clearance, i.e. you cannot walk under the
 * stage.  Walking under it is a hero view, so the grid that keeps it wins and
 * the deviation is stated rather than hidden.
 *
 * Every upright stands from **its own ground point**, so they are all
 * different lengths -- 12 to 14 m at the front rank, nothing at the back where
 * the terrace absorbs them -- and that fan of lengths is the whole picture.
 * ------------------------------------------------------------------ */
export function makeKakezukuri(ctx, {
  x, z, deckY, groundFn = null, w = 21.8, d = 9.6, ry = 0, baker = null,
  name = 'kakezukuri',
  acrossBays = null, deepBays = null,
  front = true,                 // the outer row carries the 16-sided majors
  railing = true, deck = true, platform = true, collide = true,
  boardWidth = 0.30, nukiTiers = 5, seed = 1633,
} = {}) {
  const P = new Parts();
  const rng = rngKit(seed);
  /* The uprights stand on the BARE ground, not on the platformed ground.
   * `ctx.groundAt` offers every registered platform -- including the deck this
   * function is about to register and the terrace next door -- so asking it
   * where the ground is under a stage returns the top of the stage.  Passing a
   * `fromY` far below means no platform is within a step of the querier, which
   * is exactly the question being asked: where would somebody standing in the
   * ravine be standing? */
  const BARE = -1e9;
  /* ...and it samples the LOWEST corner of the 4 m cell the upright stands in
   * rather than the point itself.  The drawn hillside is a 4 m grid that
   * interpolates linearly between its samples while `heightAt` steps, so a
   * column seated on the exact point can end up a metre above the mesh --
   * fifty-five uprights hanging in the air with their stone pads floating
   * under them, which is the single most obvious way to break this view.
   * Seating on the cell minimum can only ever bury a base, and a buried base
   * is invisible. */
  const CELL = 4;
  const ground = groundFn || ((gx, gz) => {
    const i = Math.floor(gx / CELL) * CELL, j = Math.floor(gz / CELL) * CELL;
    return Math.min(
      ctx.heightAt(i, j, BARE), ctx.heightAt(i + CELL, j, BARE),
      ctx.heightAt(i, j + CELL, BARE), ctx.heightAt(i + CELL, j + CELL, BARE),
      ctx.heightAt(gx, gz, BARE),
    );
  });
  const K = KIYOMIZU;

  const nBx = acrossBays ?? Math.max(2, Math.round(w / 2.18));
  const nBz = deepBays ?? Math.max(1, Math.round(d / 2.40));
  const nx = nBx + 1, nz = nBz + 1;
  const sx = w / nBx, sz = d / nBz;
  const cos = Math.cos(ry), sin = Math.sin(ry);
  /** local (u,v) -> world.  +v is the direction the deck projects (the front). */
  const world = (u, v) => ({ x: x + u * cos + v * sin, z: z - u * sin + v * cos });

  /* ---- the platform first: nothing may be seated before it exists ---- */
  const hw = (Math.abs(w / 2 * cos) + Math.abs(d / 2 * sin));
  const hd = (Math.abs(w / 2 * sin) + Math.abs(d / 2 * cos));
  if (platform) {
    ctx.platform({ x0: x - hw, z0: z - hd, x1: x + hw, z1: z + hd, top: deckY });
  }

  /* ------------------------------ the uprights ---------------------------- */
  const posts = [];
  let majors = 0;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const u = -w / 2 + i * sx;
      const v = d / 2 - j * sz;               // row 0 is the FRONT (outermost)
      const p = world(u, v);
      const g0 = ground(p.x, p.z);
      const len = deckY - g0;
      // where the terrace has risen to meet the deck there is no pillar
      if (len < 0.7) continue;
      const major = (i % 2 === 0) && (j % 2 === 0);
      if (major) majors++;
      const sixteen = major && j === 0 && front;
      const r = (sixteen ? 0.72 : major ? K.pillarDia : 0.46) / 2;
      posts.push({ i, j, u, v, g: g0, len, major, sixteen, r });
    }
  }

  for (const p of posts) {
    /* 束石 -- the stone pad.  The column simply stands on it: no tenon, no
     * fixing, which is exactly why the frame can be dismantled. */
    P.add(box(p.r * 3.0, 0.55, p.r * 3.0).translate(p.u, p.g - 0.16, p.v),
      PAL.stoneDark, { bands: 3, tint: TINT.cool });
    const seg = p.sixteen ? 16 : p.major ? 10 : 8;
    // a very slight taper: these are whole trunks, 300-400 years old.  The
    // head stops under the deck girders -- a column through the floor boards
    // is the commonest tell that a deck was modelled separately from its legs.
    const g = post(p.r, p.r * 0.94, p.len - 0.30, seg);
    g.translate(p.u, p.g + 0.16, p.v);
    P.add(g, p.major ? PAL.timberMid : PAL.timber,
      { bands: 3, tint: TINT.warm, flat: false });
    /* 根継ぎ -- the scarf joint where a rotted base was cut away and a new
     * length spliced on.  Nine of the stage's columns carry one. */
    if (p.major && rng.chance(0.22)) {
      P.add(box(p.r * 2.18, 0.10, p.r * 2.18).translate(p.u, p.g + 0.85, p.v),
        PAL.timberPale, { bands: 3, tint: TINT.warm });
    }
  }

  /* --------------------------------- 貫 ----------------------------------
   * The tie-beams: 240 x 90 mm zelkova planks threaded through mortices in the
   * columns, five tiers at the building's own 8-shaku (2.42 m) module, and
   * projecting a little past the outer columns because that is what a plank
   * driven through a post looks like from underneath. */
  const byPos = new Map(posts.map((p) => [p.i + ',' + p.j, p]));
  const topOfNuki = deckY - 0.75;
  for (let t = 0; t < nukiTiers; t++) {
    const ny = topOfNuki - t * 2.42;
    // across (along the deck's long axis)
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = byPos.get(i + ',' + j), b = byPos.get((i + 1) + ',' + j);
        if (!a || !b) continue;
        if (ny < a.g + 0.5 || ny < b.g + 0.5) continue;
        const over0 = i === 0 ? 0.20 : 0, over1 = i === nx - 2 ? 0.20 : 0;
        const len = sx + over0 + over1;
        P.add(box(len, 0.24, 0.09).translate(a.u + sx / 2 - over0 / 2 + over1 / 2, ny, a.v),
          PAL.timberMid, { bands: 3, tint: TINT.warm });
      }
    }
    // and the other way
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz - 1; j++) {
        const a = byPos.get(i + ',' + j), b = byPos.get(i + ',' + (j + 1));
        if (!a || !b) continue;
        if (ny < a.g + 0.5 || ny < b.g + 0.5) continue;
        const over = j === 0 ? 0.20 : 0;
        P.add(box(0.09, 0.24, sz + over).translate(a.u, ny, a.v - sz / 2 + over / 2),
          PAL.timberMid, { bands: 3, tint: TINT.warm });
      }
    }
  }

  /* ------------------------------- the deck ------------------------------- */
  if (deck) {
    // 大引 -- the girders, on the pillar lines, and the 根太 joists over them
    for (let i = 0; i < nx; i++) {
      const u = -w / 2 + i * sx;
      P.add(box(0.24, 0.34, d + 0.5).translate(u, deckY - 0.42, 0),
        PAL.timberMid, { bands: 3, tint: TINT.warm });
    }
    const nJoist = Math.round(d / 0.75);
    for (let k = 0; k <= nJoist; k++) {
      const v = -d / 2 + (k / nJoist) * d;
      P.add(box(w + 0.4, 0.18, 0.12).translate(0, deckY - 0.19, v),
        PAL.timberMid, { bands: 3, tint: TINT.warm });
    }
    /* 166 hinoki planks, 0.30 m wide and about 0.10 m thick, running
     * front-to-back with a staggered mid-span joint -- 72 columns of two,
     * which is the 166 the temple counted after the 2020 re-decking, near
     * enough that the difference is the strip under the eaves. */
    const nP = Math.max(2, Math.round(w / boardWidth));
    for (let k = 0; k < nP; k++) {
      const u = -w / 2 + (k + 0.5) * (w / nP);
      const split = -d / 2 + d * (0.38 + (k % 2) * 0.24);
      for (const [v0, v1] of [[-d / 2, split], [split, d / 2]]) {
        P.add(box(w / nP - 0.012, 0.10, v1 - v0 - 0.01)
          .translate(u, deckY - 0.05, (v0 + v1) / 2),
        k % 5 === 2 ? PAL.timberGrey : PAL.timberPale, { bands: 3, tint: TINT.warm });
      }
    }
    // the fascia round the deck edge
    for (const s of [-1, 1]) {
      P.add(box(w + 0.42, 0.30, 0.16).translate(0, deckY - 0.15, s * (d / 2 + 0.13)),
        PAL.timberMid, { bands: 3, tint: TINT.warm });
      P.add(box(0.16, 0.30, d + 0.42).translate(s * (w / 2 + 0.13), deckY - 0.15, 0),
        PAL.timberMid, { bands: 3, tint: TINT.warm });
    }
  }

  /* ------------------------------- 高欄 -----------------------------------
   * The balustrade is, in origin, a Meiji addition: jumping off the stage was
   * banned in 1872 and the railings went up then.  (The 成就院 diary logs 235
   * jumps between 1694 and 1864, with 34 deaths -- an 85 % survival rate.) */
  if (railing) {
    const rh = 1.05;
    const sides = [
      { len: w, ux: 1, uz: 0, off: d / 2 },      // the front
      { len: d, ux: 0, uz: 1, off: w / 2 },
      { len: d, ux: 0, uz: 1, off: -w / 2 },
    ];
    for (const s of sides) {
      const n = Math.max(3, Math.round(s.len / 1.8));
      for (let k = 0; k <= n; k++) {
        const t = -s.len / 2 + (k / n) * s.len;
        const px = s.ux ? t : s.off, pv = s.ux ? s.off : t;
        P.add(box(0.12, rh, 0.12).translate(px, deckY + rh / 2, pv),
          PAL.timberMid, { bands: 3, tint: TINT.warm });
        // 擬宝珠 -- the onion knop on the post head
        P.add(lathe([[0.04, 0], [0.09, 0.05], [0.10, 0.14], [0.05, 0.21], [0, 0.24]], 8)
          .translate(px, deckY + rh, pv), PAL.metalDark, { bands: 4, tint: TINT.cool, flat: false });
      }
      for (const [hy, hh] of [[rh - 0.06, 0.13], [rh * 0.52, 0.08]]) {
        P.add(box(s.ux ? s.len : 0.14, hh, s.ux ? 0.14 : s.len)
          .translate(s.ux ? 0 : s.off, deckY + hy, s.ux ? s.off : 0),
        PAL.timberMid, { bands: 3, tint: TINT.warm });
      }
    }
  }

  /* ------------------------------ collision ------------------------------
   * The uprights are NOT collided individually -- 55 boxes under one deck is
   * an absurd way to spend the collision list, and the interior of the cage is
   * meant to be walked through.  The perimeter rank is collided so you cannot
   * drift out through the outer columns into the ravine, and the major
   * interior columns are collided in clumps of four. */
  if (collide) {
    for (const p of posts) {
      const edge = p.i === 0 || p.i === nx - 1 || p.j === 0 || p.j === nz - 1;
      const clump = p.major && p.i % 4 === 0 && p.j % 4 === 0;
      if (!edge && !clump) continue;
      const q = world(p.u, p.v);
      ctx.collide(q.x - p.r, q.z - p.r, q.x + p.r, q.z + p.r, undefined, undefined);
    }
    /* The balustrade, so you cannot walk off the deck -- and only the
     * balustrade: `bottom` at deck level means it does not exist at all for
     * somebody standing on the ravine floor under it. */
    if (railing) {
      for (const s of [-1, 1]) {
        const a = world(-w / 2, s * d / 2), b = world(w / 2, s * d / 2);
        ctx.collide(Math.min(a.x, b.x) - 0.1, Math.min(a.z, b.z) - 0.1,
          Math.max(a.x, b.x) + 0.1, Math.max(a.z, b.z) + 0.1, deckY + 1.05, deckY - 0.2);
        const c = world(s * w / 2, -d / 2), e = world(s * w / 2, d / 2);
        ctx.collide(Math.min(c.x, e.x) - 0.1, Math.min(c.z, e.z) - 0.1,
          Math.max(c.x, e.x) + 0.1, Math.max(c.z, e.z) + 0.1, deckY + 1.05, deckY - 0.2);
      }
    }
  }

  const out = emit(ctx, P, { baker, x, y: 0, z, ry, name, outline: false });
  return {
    ...out, x, z, ry, deckY, w, d,
    posts: posts.length, majors, world,
    /** the longest upright, which is the number everybody quotes */
    longest: posts.reduce((m, p) => Math.max(m, p.len), 0),
  };
}

/* ------------------------------------------------------------------ *
 * 3.  本堂 -- THE HONDO.
 *
 * 桁行九間 梁間七間, 寄棟造 with 起り, 東西北面もこし付, 正面両翼廊及び庇付,
 * 檜皮葺, 正面舞台付.  National Treasure, 1633, Tokugawa Iemitsu.
 *
 * The plan closes on the published 36 x 31 m twice over, which is why it is
 * trusted:
 *
 *     moya 9 x 7 bays at 8 shaku      21.8 x 17.0
 *     width  21.8 + 2.0 + 2.0 mokoshi + 2 x 5.1 wings   = 36.0
 *     depth  17.0 + 2.0 + 2.0         + 10.0 stage      = 31.0
 *
 * The roof is **hipped, not hip-and-gable** -- the ICP commentary praises the
 * 起り, the convex swelling across the slope, as the thing that handles a
 * complicated plan gracefully -- and it is 2,050 m2 of cypress bark: 100 mm
 * thick in the field, **250 mm at the eave**, razor-cut with an adze, on a
 * 箱棟 with no tile anywhere.  That soft, thick, ribless edge against the
 * hard-ribbed grey of the three-storey pagoda 150 m away is the whole visual
 * argument of the site.
 * ------------------------------------------------------------------ */
export function makeHondo(ctx, {
  x, z, y = null, ry = facing(170.4), baker = null, name = 'kiyomizuHondo',
  w = 36.0, d = 31.0, deckY = null, stageDepth = 9.6, wing = 5.1,
} = {}) {
  deckY = deckY ?? y ?? ctx.groundAt(x, z);
  const P = new Parts();
  const C = palette(false);
  const hallD = d - stageDepth;              // 21.0 -- the hall without the stage
  const moyaW = w - 2 * wing;                // 21.8 -- clear between the wings
  const coreW = moyaW + 4.0, coreD = hallD;  // 25.8 x 21.0 including the mokoshi
  const floorY = deckY;
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const world = (u, v) => ({ x: x + u * cos + v * sin, z: z - u * sin + v * cos });

  /* The hall's own centre: the surveyed point is the centroid of the whole
   * 36 x 31 footprint, and the hall occupies the northern 21 m of it. */
  const hallC = world(0, -(d - hallD) / 2);

  /* ---- the terrace, before anything stands on it ---- */
  const thw = Math.abs(w / 2 * cos) + Math.abs(hallD / 2 * sin);
  const thd = Math.abs(w / 2 * sin) + Math.abs(hallD / 2 * cos);
  ctx.platform({
    x0: hallC.x - thw, z0: hallC.z - thd, x1: hallC.x + thw, z1: hallC.z + thd, top: deckY,
  });

  /* The hall stands on its own kakezukuri: on the north it is on the ground
   * within a metre, on the south it is out over the break of slope. */
  const under = makeKakezukuri(ctx, {
    x: hallC.x, z: hallC.z, deckY, w, d: coreD, ry, baker,
    name: name + 'Under', front: false, railing: false, deck: false,
    platform: false, collide: true, nukiTiers: 4,
  });

  /* ------------------------------- the body ------------------------------- */
  const colH = 5.6;                       // floor to the 台輪 of the 正堂
  const mokoshiH = 3.9;                   // the skirt-roof eave
  const bay = 2.42;
  const nW = Math.round(moyaW / bay), nD = Math.round((coreD - 4) / bay);

  // the floor slab and the dark under-floor band
  P.add(box(coreW, 0.34, coreD).translate(0, floorY - 0.17, -(d - hallD) / 2),
    PAL.timberDark, { bands: 3, tint: TINT.warm });

  const cz = -(d - hallD) / 2;             // the hall's local centre in v
  const halfW = coreW / 2, halfD = coreD / 2;

  // 円柱 -- the perimeter columns of the 正堂 plus the mokoshi columns
  for (let i = 0; i <= nW; i++) {
    const u = -moyaW / 2 + (i / nW) * moyaW;
    for (const s of [-1, 1]) {
      const v = cz + s * (halfD - 2.0);
      P.add(post(0.27, 0.25, colH, 10).translate(u, floorY, v),
        C.column, { bands: 3, tint: C.tint, flat: false });
    }
  }
  for (let j = 0; j <= nD; j++) {
    const v = cz + lerp(-(halfD - 2.0), halfD - 2.0, j / nD);
    for (const s of [-1, 1]) {
      P.add(post(0.27, 0.25, colH, 10).translate(s * moyaW / 2, floorY, v),
        C.column, { bands: 3, tint: C.tint, flat: false });
    }
  }

  /* The walls, built outward: the 外陣 is wrapped by a corridor with 蔀戸
   * (hinged lattice shutters) at the corridor line, so the front reads as a
   * dark recess behind a screen of columns rather than as a wall. */
  const inset = 0.9;
  for (let f = 0; f < 4; f++) {
    const fp = [];
    const along = f % 2 === 0 ? moyaW : coreD - 4.0;
    const out = (f % 2 === 0 ? halfD - 2.0 : moyaW / 2) - inset;
    const nb = Math.max(3, Math.round(along / bay));
    for (let b = 0; b < nb; b++) {
      const bw = along / nb, bx = -along / 2 + (b + 0.5) * bw;
      if (f === 0) {
        /* The south face is open to the stage: the 外陣 behind a screen of
         * columns, with 蔀戸 -- hinged lattice shutters -- swung up under the
         * head beam.  The dark is the point.  Visitors get no further. */
        fp.push({ geometry: box(bw - 0.06, colH - 1.5, 0.30).translate(bx, floorY + (colH - 1.5) / 2, out - 1.1), color: PAL.shopInterior, opts: { bands: 'deep', tint: TINT.warm } });
        fp.push({ geometry: box(bw - 0.10, 1.5, 0.14).translate(bx, floorY + colH - 0.75, out), color: PAL.timberDark, opts: { bands: 3, tint: C.tint } });
      } else {
        fp.push({ geometry: box(bw - 0.08, colH - 1.2, 0.16).translate(bx, floorY + (colH - 1.2) / 2 + 0.2, out), color: C.panel, opts: { bands: C.panelBands, tint: TINT.cool } });
        fp.push({ geometry: box(bw, 0.16, 0.24).translate(bx, floorY + colH - 0.9, out + 0.03), color: C.beam, opts: { bands: 3, tint: C.tint } });
      }
    }
    P.all(rotateFace(fp, f, out, cz));
  }

  /* --------------------------- 裳階 -- the mokoshi ------------------------
   * A skirt roof on the east, west and north faces (the record is explicit:
   * 東西北面もこし付) housing the 局, the vigil cells.  It is what gives the
   * hall its double eave line and most of its bulk at ground level. */
  for (const f of [1, 2, 3]) {
    const along = f % 2 === 0 ? moyaW + 4.0 : coreD;
    const out = f % 2 === 0 ? halfD : halfW;
    const r = gableRoof({
      w: along, d: 2.0, pitch: 0.52, eave: 1.5, material: 'hiwada',
      mukuri: 0.05, sori: 0.02, cornerLift: 0.35, y: floorY + mokoshiH,
      ridgeAlongX: true, gableEnd: false,
    });
    // keep only the outward slope: a skirt roof, not a ridge
    const half = r.parts.slice(0, 1);
    const set = half.map((p) => ({ ...p }));
    xform(set, _m4().makeTranslation(0, 0, out - 1.0));
    P.all(rotateFace(set, f, 0, cz));
    /* The wall under it, with the 局 (vigil cells) expressed as a column
     * rhythm: without them the mokoshi is a thirty-metre blank band, and the
     * hall's whole elevation is a ladder of dark timber on pale plaster. */
    const wallSet = [
      { geometry: box(along, mokoshiH - 0.5, 0.22).translate(0, floorY + 0.25 + (mokoshiH - 0.5) / 2, out - 0.1), color: C.panel, opts: { bands: C.panelBands, tint: TINT.cool } },
      { geometry: box(along, 0.30, 0.34).translate(0, floorY + 0.15, out - 0.06), color: C.beam, opts: { bands: 3, tint: C.tint } },
      { geometry: box(along, 0.22, 0.30).translate(0, floorY + mokoshiH - 0.11, out - 0.06), color: C.beam, opts: { bands: 3, tint: C.tint } },
    ];
    const nm = Math.max(4, Math.round(along / 2.42));
    for (let k = 0; k <= nm; k++) {
      const mu = -along / 2 + (k / nm) * along;
      wallSet.push({ geometry: box(0.24, mokoshiH - 0.3, 0.30).translate(mu, floorY + (mokoshiH - 0.3) / 2, out + 0.02), color: C.column, opts: { bands: 3, tint: C.tint } });
    }
    P.all(rotateFace(wallSet, f, 0, cz));
  }

  /* ------------------------------- the roof ------------------------------- */
  const eaveY = floorY + colH + 1.35;
  const roof = hipRoof({
    w: coreW, d: coreD, pitch: 0.72, eave: 2.6, material: 'hiwada',
    mukuri: 0.055, sori: 0.02, cornerLift: 1.15, ridgeCourses: 0, y: eaveY,
  });
  xform(roof.parts, _m4().makeTranslation(0, 0, cz));
  P.all(roof.parts);
  /* 箱棟 -- a boxed ridge of bound bark, copper-capped.  A hiwada roof has no
   * 鬼瓦 and no 熨斗瓦: the ridge is a plain dark bar and the hips are soft
   * rolls, and putting tile furniture on it is the commonest way to make a
   * bark roof look like a tiled one. */
  P.add(box(roof.ridgeLen + 0.6, 0.55, 0.66).translate(0, roof.ridgeY + 0.27, cz),
    PAL.hiwadaEdge, { bands: 3, tint: TINT.warm });
  P.add(box(roof.ridgeLen + 0.9, 0.10, 0.80).translate(0, roof.ridgeY + 0.57, cz),
    PAL.copper, { bands: 4, tint: TINT.cool });

  // 二軒 rafters under the great eave, on all four sides
  for (let f = 0; f < 4; f++) {
    const along = f % 2 === 0 ? coreW : coreD;
    const out = (f % 2 === 0 ? coreD : coreW) / 2;
    const rf = rafters({
      w: along + 3.0, depth: 2.5, y: 0, z: 0, spacing: 0.30, size: 0.10,
      color: C.rafter, double: true,
    });
    xform(rf, _m4().makeRotationX(19 * DEG));
    xform(rf, _m4().makeTranslation(0, eaveY - 0.30, out - 0.6));
    P.all(rotateFace(rf, f, 0, cz));
  }

  /* ------------------------- 翼廊 -- the two wings -------------------------
   * The 楽舎, the musicians' galleries, project south at each end of the front
   * with 入母屋・妻入 roofs -- gable end forward, deliberately breaking the
   * long hip line.  The stage lies between them, which is the check that gives
   * the 21.8 m of clear width. */
  const wingD = 7.4;
  for (const s of [-1, 1]) {
    const wu = s * (moyaW + wing) / 2;
    const wv = cz + halfD - 1.0 + 3.2;
    const wc = world(wu, wv);
    /* The wings project south past the break of slope like everything else
     * here, so they get their own scaffold.  Without it they float, which is
     * the single most visible error in a kakezukuri building. */
    makeKakezukuri(ctx, {
      x: wc.x, z: wc.z, deckY, w: wing + 0.4, d: wingD, ry, baker,
      name: name + 'WingUnder', front: false, railing: false, deck: false,
      platform: true, collide: true, nukiTiers: 4, seed: 1633 + s,
    });
    const set = new Parts();
    const wh = colH * 0.72;
    // the floor band, then columns and infill between them
    set.add(box(wing + 0.5, 0.34, wingD + 0.5).translate(wu, floorY - 0.17, wv),
      PAL.timberDark, { bands: 3, tint: TINT.warm });
    for (const cu of [-1, 0, 1]) {
      for (const cv of [-1, -1 / 3, 1 / 3, 1]) {
        if (cu === 0 && Math.abs(cv) !== 1) continue;
        set.add(post(0.22, 0.20, wh, 8)
          .translate(wu + cu * wing / 2, floorY, wv + cv * wingD / 2),
        C.column, { bands: 3, tint: C.tint, flat: false });
      }
    }
    for (const f of [0, 1, 2, 3]) {
      const along = f % 2 === 0 ? wing : wingD;
      const off = (f % 2 === 0 ? wingD : wing) / 2 - 0.18;
      const fp = [
        { geometry: box(along - 0.36, wh - 1.0, 0.14).translate(0, floorY + (wh - 1.0) / 2 + 0.3, off), color: C.panel, opts: { bands: C.panelBands, tint: TINT.cool } },
        { geometry: box(along + 0.2, 0.20, 0.24).translate(0, floorY + wh - 0.10, off + 0.06), color: C.beam, opts: { bands: 3, tint: C.tint } },
      ];
      xform(fp, _m4().makeRotationY(-f * Math.PI / 2));
      xform(fp, _m4().makeTranslation(wu, 0, wv));
      set.all(fp);
    }
    /* 入母屋造・妻入 -- the gable end faces forward, deliberately breaking the
     * long hip line of the main roof.  These are the 楽舎, the galleries the
     * musicians play from when something is dedicated on the stage. */
    /* The wing ridge has to finish just UNDER the main eave: a 楽舎 whose
     * roof climbs into the great hip roof turns the whole silhouette into a
     * crumple, and in the photographs the gable apexes sit right about on the
     * main eave line. */
    const wr = irimoyaRoof({
      w: wing + 0.6, d: wingD, pitch: 0.52, eave: 1.4, material: 'hiwada',
      sori: 0.04, cornerLift: 0.45, ridgeCourses: 0, gableFrac: 0.62,
      y: floorY + wh + 0.55, gableFace: 'z',
    });
    xform(wr.parts, _m4().makeTranslation(wu, 0, wv));
    set.all(wr.parts);
    set.add(box(0.4, 0.34, wingD * 0.62 + 0.5).translate(wu, wr.ridgeY + 0.17, wv),
      PAL.hiwadaEdge, { bands: 3, tint: TINT.warm });
    set.all(xform(gyo({ w: 0.7, h: 0.9, y: wr.ridgeY - 1.2, z: 0 }),
      _m4().makeTranslation(wu, 0, wv + wingD / 2 + 0.9)));
    P.all(set.list);
  }

  /* -------------------------- 舞台 -- the stage --------------------------- */
  const stageC = world(0, (d - stageDepth) / 2);

  const out = emit(ctx, P, { baker, x, y: 0, z, ry, name, outline: false });
  /* Solid to anybody on the terrace, transparent to anybody on the ravine
   * floor twelve metres below -- which is what `bottom` is for. */
  ctx.collideRot(hallC.x, hallC.z, coreW - 1.0, coreD - 1.0, ry, undefined, deckY + 1.0);

  return {
    ...out, x, z, ry, deckY, w, d, hallC, stageC, stageDepth, moyaW,
    under, eaveY, ridgeY: roof.ridgeY,
  };
}

/**
 * Rotate a face's parts into position round a hall centred at `cz` in v.
 * f: 0 = +v (front/south), 1 = +u, 2 = -v, 3 = -u.
 */
function rotateFace(parts, f, out, cz) {
  const ang = -f * Math.PI / 2;
  xform(parts, _m4().makeRotationY(ang));
  xform(parts, _m4().makeTranslation(0, 0, cz));
  return parts;
}

/* ------------------------------------------------------------------ *
 * 4.  THE GATES
 * ------------------------------------------------------------------ */

/**
 * 仁王門 -- the Deva gate, and everybody's first sight of the temple.
 *
 * 三間一戸楼門, 入母屋造, 檜皮葺: a **two-storey** gate, three bays wide with a
 * single doorway, 10 x 5 m on plan and 14 m to the ridge.  Vermilion -- it is
 * nicknamed 赤門 -- and it is the only major hall that escaped the 1629 fire,
 * so it is older than everything around it (c.1500, after the Onin War).
 *
 * The 仁王 are **3.65 m tall**, among the largest in Kyoto, and they stand in
 * the two side bays behind red grilles.  They are heavily stylised here: at
 * the distance you ever see them, a Nio is a dark silhouette with a raised arm
 * and a twist in the hips, and carving one properly would cost more triangles
 * than the gate.
 */
export function makeNiomon(ctx, {
  x, z, y = null, ry = facing(256), baker = null, name = 'niomon',
  w = 10.0, d = 5.0, ridge = 14.0, steps = true,
} = {}) {
  const P = new Parts();
  const C = palette(true);
  const g0 = y ?? ctx.groundAt(x, z);
  const podium = 1.15;
  const base = g0 + podium;
  const centreBay = 3.9, sideBay = (w - centreBay) / 2;
  const lowerH = 4.8, upperH = 2.7;

  // the stone podium
  P.add(box(w + 1.6, podium + 1.2, d + 1.6).translate(0, podium / 2 - 0.6, 0),
    PAL.stoneWall, { bands: 3, tint: TINT.cool });
  P.add(box(w + 2.0, 0.18, d + 2.0).translate(0, podium - 0.09, 0),
    PAL.stone, { bands: 3, tint: TINT.cool });

  const cols = [-w / 2, -centreBay / 2, centreBay / 2, w / 2];
  const rows = [-d / 2, 0, d / 2];
  for (const cu of cols) {
    for (const cv of rows) {
      P.add(post(0.34, 0.31, lowerH, 12).translate(cu, podium, cv),
        C.column, { bands: 3, tint: C.tint, flat: false });
      P.add(post(0.46, 0.44, 0.20, 12).translate(cu, podium - 0.18, cv),
        PAL.stone, { bands: 3, tint: TINT.cool });
    }
  }

  /* 仁王 -- the guardians.  A plinth, a twisted mass, an arm.  Silhouette
   * only: 阿形 with the mouth open on one side, 吽形 closed on the other, and
   * the pose mirrored between them. */
  for (const s of [-1, 1]) {
    const cu = s * (centreBay + sideBay) / 2;
    P.add(box(1.5, 0.55, 1.7).translate(cu, podium, 0), PAL.stoneDark, { bands: 3, tint: TINT.cool });
    const nio = new Parts();
    const h = 3.65, t = podium + 0.55;
    nio.add(box(1.05, h * 0.46, 0.62).translate(0, t + h * 0.23, 0), PAL.timberDark, { bands: 2, tint: TINT.warm });
    nio.add(box(0.86, h * 0.30, 0.54).translate(s * 0.08, t + h * 0.60, 0), PAL.timberDark, { bands: 2, tint: TINT.warm });
    nio.add(post(0.20, 0.19, h * 0.20, 8).translate(-s * 0.10, t + h * 0.76, 0), PAL.timberDark, { bands: 2, tint: TINT.warm });
    // the raised arm, and the lowered one
    const arm = box(0.19, h * 0.40, 0.19);
    arm.rotateZ(s * 0.55);
    arm.translate(s * 0.62, t + h * 0.66, 0.02);
    nio.add(arm, PAL.timberDark, { bands: 2, tint: TINT.warm });
    const arm2 = box(0.18, h * 0.36, 0.18);
    arm2.rotateZ(-s * 0.24);
    arm2.translate(-s * 0.56, t + h * 0.40, 0.06);
    nio.add(arm2, PAL.timberDark, { bands: 2, tint: TINT.warm });
    for (const lu of [-0.26, 0.26]) {
      nio.add(box(0.24, h * 0.30, 0.26).translate(lu, t + h * 0.15, 0), PAL.timberDark, { bands: 2, tint: TINT.warm });
    }
    xform(nio.list, _m4().makeTranslation(cu, 0, 0));
    P.all(nio.list);
    // the grille that fronts the bay
    const nb = 9;
    for (let k = 0; k < nb; k++) {
      const gu = cu - sideBay / 2 + 0.2 + (k / (nb - 1)) * (sideBay - 0.4);
      P.add(box(0.09, 3.7, 0.09).translate(gu, podium + 0.6, d / 2 - 0.2),
        C.dark, { bands: 3, tint: C.tint });
    }
    P.add(box(sideBay - 0.2, 0.22, 0.26).translate(cu, podium + 4.35, d / 2 - 0.2), C.beam, { bands: 3, tint: C.tint });
  }

  // the head beams, the bracket zone and the upper storey
  for (let f = 0; f < 4; f++) {
    const along = f % 2 === 0 ? w : d;
    const off = (f % 2 === 0 ? d : w) / 2;
    const fp = [];
    fp.push({ geometry: box(along + 0.5, 0.32, 0.34).translate(0, podium + lowerH - 0.16, off), color: C.beam, opts: { bands: 3, tint: C.tint } });
    const n = Math.max(2, Math.round(along / 2.4));
    for (let k = 0; k <= n; k++) {
      const bu = -along / 2 + (k / n) * along;
      fp.push(...brackets({ x: bu, y: podium + lowerH, z: off - 0.1, steps: 2, scale: 1.0, color: C.bracket, block: C.block }));
    }
    xform(fp, _m4().makeRotationY(-f * Math.PI / 2));
    P.all(fp);
  }
  // 縁 -- the balcony round the upper storey
  const balY = podium + lowerH + 1.15;
  P.add(box(w + 2.2, 0.16, d + 2.2).translate(0, balY, 0), C.beam, { bands: 3, tint: C.tint });
  for (let f = 0; f < 4; f++) {
    const along = (f % 2 === 0 ? w : d) + 2.2;
    const off = ((f % 2 === 0 ? d : w) + 2.2) / 2;
    const fp = [];
    const n = Math.max(3, Math.round(along / 1.4));
    for (let k = 0; k <= n; k++) {
      fp.push({ geometry: box(0.10, 0.66, 0.10).translate(-along / 2 + (k / n) * along, balY + 0.41, off - 0.08), color: C.rail, opts: { bands: 3, tint: C.tint } });
    }
    fp.push({ geometry: box(along, 0.13, 0.17).translate(0, balY + 0.78, off - 0.08), color: C.rail, opts: { bands: 3, tint: C.tint } });
    xform(fp, _m4().makeRotationY(-f * Math.PI / 2));
    P.all(fp);
  }
  // the upper storey itself, set in from the balcony
  const uw = w - 1.6, ud = d - 1.2;
  for (const cu of [-uw / 2, -centreBay / 2 + 0.4, centreBay / 2 - 0.4, uw / 2]) {
    for (const cv of [-ud / 2, ud / 2]) {
      P.add(post(0.26, 0.24, upperH, 10).translate(cu, balY + 0.16, cv),
        C.column, { bands: 3, tint: C.tint, flat: false });
    }
  }
  for (let f = 0; f < 4; f++) {
    const along = f % 2 === 0 ? uw : ud;
    const off = (f % 2 === 0 ? ud : uw) / 2;
    const fp = [{ geometry: box(along - 0.2, upperH - 0.5, 0.16).translate(0, balY + 0.16 + upperH / 2, off - 0.05), color: C.panel, opts: { bands: C.panelBands, tint: TINT.cool } }];
    const n = Math.max(2, Math.round(along / 2.0));
    for (let k = 0; k <= n; k++) {
      fp.push(...brackets({ x: -along / 2 + (k / n) * along, y: balY + upperH + 0.16, z: off - 0.06, steps: 3, scale: 1.0, color: C.bracket, block: C.block }));
    }
    xform(fp, _m4().makeRotationY(-f * Math.PI / 2));
    P.all(fp);
  }

  const eaveY = balY + upperH + 1.5;
  const roof = irimoyaRoof({
    w, d, pitch: 0.62, eave: 2.1, material: 'hiwada',
    sori: 0.07, cornerLift: 0.85, ridgeCourses: 0, gableFrac: 0.55, y: eaveY,
  });
  P.all(roof.parts);
  P.add(box(w * 0.46 + 0.4, 0.42, 0.52).translate(0, roof.ridgeY + 0.21, 0),
    PAL.hiwadaEdge, { bands: 3, tint: TINT.warm });
  for (let f = 0; f < 4; f++) {
    const along = f % 2 === 0 ? w : d;
    const off = (f % 2 === 0 ? d : w) / 2;
    const rf = rafters({ w: along + 3.6, depth: 2.0, y: 0, z: 0, spacing: 0.28, size: 0.085, color: C.rafter, double: true });
    xform(rf, _m4().makeRotationX(17 * DEG));
    xform(rf, _m4().makeTranslation(0, eaveY - 0.26, off - 0.4));
    xform(rf, _m4().makeRotationY(-f * Math.PI / 2));
    P.all(rf);
  }
  P.all(xform(gyo({ w: 0.8, h: 1.0, y: roof.ridgeY - 1.5, z: 0 }), _m4().makeTranslation(0, 0, d / 2 + 1.1)));

  const out = emit(ctx, P, { baker, x, y: g0, z, ry, name, outline: !baker });

  /* Collision: the two side bays are solid, the centre bay is a 3.9 m doorway
   * you walk straight through. */
  const cos = Math.cos(ry), sin = Math.sin(ry);
  for (const s of [-1, 1]) {
    const cu = s * (centreBay + sideBay) / 2;
    const px = x + cu * cos, pz = z - cu * sin;
    ctx.collideRot(px, pz, sideBay, d + 0.6, ry, undefined, undefined);
  }
  ctx.platform({ x0: x - (w + 2) / 2, z0: z - (d + 2) / 2, x1: x + (w + 2) / 2, z1: z + (d + 2) / 2, top: base });

  /* The flight up from 清水坂.  No Japanese source publishes a count; the
   * gate platform stands 3-4 m above the street at the end of the approach and
   * Kyoto podium stairs of this period run shallow, so: 22 risers of 0.16 m on
   * 0.36 m treads, as wide as the gate itself. */
  if (steps) {
    const off = d / 2 + 1.1;
    makeStoneSteps(ctx, {
      x: x + off * Math.sin(ry), z: z + off * Math.cos(ry),
      ry, w: w - 0.8, steps: 22, top: base, baker,
    });
  }
  return { ...out, x, z, ry, base, ridgeY: roof.ridgeY };
}

/**
 * 西門 -- the west gate, and the sunset.
 *
 * 三間一戸八脚門, 切妻造, **正面向拝一間, 背面軒唐破風付**, 檜皮葺, 1631.  It
 * is floored and has a coffered ceiling, so it reads more like a shrine's
 * offering hall than a gate -- and its function is exactly that: it is the
 * 日想観 platform, where you watch the sun go down over the Western Paradise.
 * Vermilion all over, with 極彩色 polychrome in the bracketing.
 */
export function makeSaimon(ctx, {
  x, z, y = null, ry = facing(270), baker = null, name = 'saimon',
  w = 8.8, d = 5.2,
} = {}) {
  const P = new Parts();
  const C = palette(true);
  const g0 = y ?? ctx.groundAt(x, z);
  const podium = 1.4, colH = 4.4;

  P.add(box(w + 3.0, podium + 1.4, d + 3.0).translate(0, podium / 2 - 0.7, 0),
    PAL.stoneWall, { bands: 3, tint: TINT.cool });
  P.add(box(w + 3.4, 0.18, d + 3.4).translate(0, podium - 0.09, 0),
    PAL.stone, { bands: 3, tint: TINT.cool });
  // the floor: this gate is floored, which is what makes it a hall
  P.add(box(w - 0.4, 0.22, d - 0.4).translate(0, podium + 0.11, 0),
    PAL.timberPale, { bands: 3, tint: TINT.warm });

  // 八脚門: two ranks of four columns, plus the main pair
  const cols = [-w / 2, -w / 6, w / 6, w / 2];
  for (const cu of cols) {
    for (const cv of [-d / 2, 0, d / 2]) {
      const main = cv === 0;
      P.add(post(main ? 0.30 : 0.24, main ? 0.28 : 0.22, colH, 10).translate(cu, podium, cv),
        C.column, { bands: 3, tint: C.tint, flat: false });
    }
  }
  // the balustrade round the platform -- this is a viewing place
  for (let f = 0; f < 4; f++) {
    const along = (f % 2 === 0 ? w : d) + 3.0;
    const off = ((f % 2 === 0 ? d : w) + 3.0) / 2;
    const fp = [];
    const n = Math.max(3, Math.round(along / 1.5));
    for (let k = 0; k <= n; k++) {
      fp.push({ geometry: box(0.11, 0.86, 0.11).translate(-along / 2 + (k / n) * along, podium + 0.43, off - 0.12), color: C.rail, opts: { bands: 3, tint: C.tint } });
    }
    fp.push({ geometry: box(along, 0.13, 0.16).translate(0, podium + 0.90, off - 0.12), color: C.rail, opts: { bands: 3, tint: C.tint } });
    xform(fp, _m4().makeRotationY(-f * Math.PI / 2));
    P.all(fp);
  }
  for (let f = 0; f < 4; f++) {
    const along = f % 2 === 0 ? w : d;
    const off = (f % 2 === 0 ? d : w) / 2;
    const fp = [{ geometry: box(along + 0.4, 0.30, 0.30).translate(0, podium + colH - 0.15, off), color: C.beam, opts: { bands: 3, tint: C.tint } }];
    const n = Math.max(2, Math.round(along / 2.0));
    for (let k = 0; k <= n; k++) {
      fp.push(...brackets({ x: -along / 2 + (k / n) * along, y: podium + colH, z: off - 0.08, steps: 2, scale: 0.95, color: C.bracket, block: C.block }));
    }
    xform(fp, _m4().makeRotationY(-f * Math.PI / 2));
    P.all(fp);
  }

  const eaveY = podium + colH + 1.05;
  const roof = gableRoof({
    w, d, pitch: 0.58, eave: 1.9, material: 'hiwada',
    mukuri: 0, sori: 0.08, cornerLift: 0.55, ridgeCourses: 0, y: eaveY,
    ridgeAlongX: true, gableEnd: true,
  });
  P.all(roof.parts);
  P.add(box(w + 3.8, 0.40, 0.50).translate(0, roof.ridgeY + 0.20, 0), PAL.hiwadaEdge, { bands: 3, tint: TINT.warm });
  // 向拝 -- the porch roof on the front, and the 唐破風 on the back
  const por = gableRoof({
    w: w * 0.42, d: 1.7, pitch: 0.40, eave: 0.9, material: 'hiwada',
    sori: 0.10, cornerLift: 0.35, ridgeCourses: 0, y: podium + colH - 0.2, gableEnd: false,
  });
  xform(por.parts, _m4().makeTranslation(0, 0, d / 2 + 1.5));
  P.all(por.parts);
  const kara = karahafu({ w: w * 0.44, h: 1.15, depth: 1.5, y: podium + colH + 0.1, material: 'copper' });
  xform(kara.parts, _m4().makeTranslation(0, 0, -(d / 2 + 1.4)));
  P.all(kara.parts);
  P.all(xform(gyo({ w: 0.7, h: 0.9, y: roof.ridgeY - 1.3 }), _m4().makeTranslation(0, 0, w / 2 * 0 + d / 2 + 1.2)));

  const out = emit(ctx, P, { baker, x, y: g0, z, ry, name, outline: !baker });
  ctx.platform({ x0: x - (w + 3) / 2, z0: z - (d + 3) / 2, x1: x + (w + 3) / 2, z1: z + (d + 3) / 2, top: g0 + podium });
  const cos = Math.cos(ry), sin = Math.sin(ry);
  for (const s of [-1, 1]) {
    const cu = s * (w / 2 - w / 12);
    ctx.collideRot(x + cu * cos, z - cu * sin, w / 3, d + 0.4, ry);
  }
  return { ...out, x, z, ry, base: g0 + podium, ridgeY: roof.ridgeY };
}

/**
 * 轟門 -- the middle gate: 三間一戸八脚門, 切妻造, **本瓦葺**, 7.3 x 4.9 m.
 * The ticket gate into the Hondo precinct, and famously doorless.
 */
export function makeTodorokimon(ctx, {
  x, z, y = null, ry = facing(285), baker = null, name = 'todorokimon',
  w = 7.27, d = 4.85,
} = {}) {
  const P = new Parts();
  const C = palette(true);
  const g0 = y ?? ctx.groundAt(x, z);
  const podium = 0.55, colH = 3.9;

  P.add(box(w + 1.2, podium + 1.0, d + 1.2).translate(0, podium / 2 - 0.5, 0), PAL.stoneWall, { bands: 3, tint: TINT.cool });
  const cols = [-w / 2, -w / 6, w / 6, w / 2];
  for (const cu of cols) for (const cv of [-d / 2, 0, d / 2]) {
    P.add(post(0.26, 0.24, colH, 10).translate(cu, podium, cv), C.column, { bands: 3, tint: C.tint, flat: false });
  }
  for (const s of [-1, 1]) {
    P.add(box(w / 3 - 0.2, colH - 1.0, 0.16).translate(s * (w / 2 - w / 12), podium + colH / 2 - 0.3, 0),
      C.panel, { bands: C.panelBands, tint: TINT.cool });
  }
  for (let f = 0; f < 4; f++) {
    const along = f % 2 === 0 ? w : d;
    const off = (f % 2 === 0 ? d : w) / 2;
    const fp = [{ geometry: box(along + 0.3, 0.26, 0.28).translate(0, podium + colH - 0.13, off), color: C.beam, opts: { bands: 3, tint: C.tint } }];
    const n = Math.max(2, Math.round(along / 1.9));
    for (let k = 0; k <= n; k++) {
      fp.push(...brackets({ x: -along / 2 + (k / n) * along, y: podium + colH, z: off - 0.06, steps: 2, scale: 0.85, color: C.bracket, block: C.block }));
    }
    xform(fp, _m4().makeRotationY(-f * Math.PI / 2));
    P.all(fp);
  }
  const eaveY = podium + colH + 0.95;
  const roof = gableRoof({
    w, d, pitch: 0.52, eave: 1.5, material: 'tile', mukuri: 0, sori: 0.09,
    cornerLift: 0.45, ridgeCourses: 5, y: eaveY, gableEnd: true,
  });
  P.all(roof.parts);
  const out = emit(ctx, P, { baker, x, y: g0, z, ry, name, outline: false });
  const cos = Math.cos(ry), sin = Math.sin(ry);
  for (const s of [-1, 1]) {
    const cu = s * (w / 2 - w / 12);
    ctx.collideRot(x + cu * cos, z - cu * sin, w / 3, d + 0.3, ry);
  }
  return { ...out, x, z, ry };
}

/**
 * 四脚門 / 三門 -- the generic temple gate, for the smaller compounds.
 * Two main columns with a strut pair fore and aft, a gabled tile roof, and
 * doors if you ask for them.
 */
export function makeTempleGate(ctx, {
  x, z, y = null, ry = 0, baker = null, name = 'templeGate',
  w = 3.6, d = 2.4, colH = 3.2, material = 'tile', vermilion = false, doors = false,
} = {}) {
  const P = new Parts();
  const C = palette(vermilion);
  const g0 = y ?? ctx.groundAt(x, z);
  for (const cu of [-w / 2, w / 2]) {
    P.add(post(0.22, 0.20, colH, 10).translate(cu, 0, 0), C.column, { bands: 3, tint: C.tint, flat: false });
    for (const cv of [-d / 2, d / 2]) {
      P.add(post(0.15, 0.14, colH * 0.78, 8).translate(cu, 0, cv), C.column, { bands: 3, tint: C.tint, flat: false });
      P.add(box(0.14, 0.16, d / 2).translate(cu, colH * 0.78, cv / 2), C.beam, { bands: 3, tint: C.tint });
    }
    P.add(box(0.44, 0.20, 0.44).translate(cu, -0.10, 0), PAL.stone, { bands: 3, tint: TINT.cool });
  }
  P.add(box(w + 0.6, 0.24, 0.26).translate(0, colH - 0.12, 0), C.beam, { bands: 3, tint: C.tint });
  if (doors) {
    for (const s of [-1, 1]) {
      P.add(box(w / 2 - 0.14, colH - 0.9, 0.08).translate(s * w / 4, (colH - 0.9) / 2, 0.06),
        C.dark, { bands: 2, tint: C.tint });
    }
  }
  const roof = gableRoof({
    w, d, pitch: 0.48, eave: 1.1, material, mukuri: 0, sori: 0.09,
    cornerLift: 0.35, ridgeCourses: 4, y: colH + 0.55,
  });
  P.all(roof.parts);
  const out = emit(ctx, P, { baker, x, y: g0, z, ry, name, outline: false });
  for (const s of [-1, 1]) {
    const cu = s * w / 2;
    ctx.collideRot(x + cu * Math.cos(ry), z - cu * Math.sin(ry), 0.7, d + 0.4, ry);
  }
  return { ...out, x, z, ry };
}

export function makeSanmon(ctx, opts = {}) {
  return makeNiomon(ctx, { w: 12.0, d: 6.0, ridge: 16.0, name: 'sanmon', steps: false, ...opts });
}

/* ------------------------------------------------------------------ *
 * 5.  奥の院 -- OKUNOIN.
 *
 * 懸造、桁行五間、梁間五間、一重、寄棟造、檜皮葺, 1633.  A 5 x 5 bay hall on
 * its own, much smaller kakezukuri, standing directly over the Otowa
 * waterfall -- and **the viewpoint**: this is where the photograph of the
 * Hondo and its stage is taken from, 50 m away on bearing 282 deg.
 *
 * Its 2011-17 restoration repainted the 極彩色 on the bracket sets from paint
 * evidence **except on the south face**, whose original paint survives well.
 * The building is deliberately two-tone and is modelled that way.
 * ------------------------------------------------------------------ */
export function makeOkunoin(ctx, {
  x: ax, z: az, y = null, ry = facing(282), baker = null, name = 'okunoin',
  w = 11.0, d = 11.0, deckY = null, deckDepth = 5.6,
} = {}) {
  const P = new Parts();
  const C = palette(false);
  /* The hall faces the Hondo: the bearing from here to the stage is 282 deg
   * and this is the viewpoint the whole complex is photographed from, so the
   * anchor point is the DECK, not the building.  The hall is set back behind
   * it, which is also what keeps a camera standing at the surveyed coordinate
   * from finding itself inside the building. */
  const back = w / 2 + deckDepth / 2 - 1.0;
  const x = ax - back * Math.sin(ry), z = az - back * Math.cos(ry);
  const g0 = y ?? ctx.groundAt(x, z);
  const floorY = deckY ?? (g0 + 0.9);
  const colH = 4.6;

  const under = makeKakezukuri(ctx, {
    x: ax, z: az, deckY: floorY, w, d: deckDepth, ry, baker,
    name: name + 'Under', front: true, railing: true, deck: true,
    platform: true, collide: true, nukiTiers: 3, seed: 1755,
  });

  ctx.platform({ x0: x - w / 2 - 1, z0: z - d / 2 - 1, x1: x + w / 2 + 1, z1: z + d / 2 + 1, top: floorY });

  P.add(box(w, 0.30, d).translate(0, floorY - 0.15, 0), PAL.timberDark, { bands: 3, tint: TINT.warm });
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const u = -w / 2 + (i / n) * w;
    for (const s of [-1, 1]) {
      P.add(post(0.24, 0.22, colH, 10).translate(u, floorY, s * d / 2), C.column, { bands: 3, tint: C.tint, flat: false });
      P.add(post(0.24, 0.22, colH, 10).translate(s * w / 2, floorY, u), C.column, { bands: 3, tint: C.tint, flat: false });
    }
  }
  for (let f = 0; f < 4; f++) {
    const fp = [];
    // the south face keeps its original paint; the other three were repainted
    const bright = f === 0;
    for (let b = 0; b < n; b++) {
      const bw = w / n, bu = -w / 2 + (b + 0.5) * bw;
      const open = f === 0 && b > 0 && b < n - 1;
      fp.push({
        geometry: box(bw - 0.10, colH - 1.1, 0.16).translate(bu, floorY + (colH - 1.1) / 2 + 0.15, w / 2 - 0.2),
        color: open ? PAL.shopInterior : C.panel,
        opts: open ? { bands: 'deep', tint: TINT.warm } : { bands: C.panelBands, tint: TINT.cool },
      });
    }
    fp.push({ geometry: box(w + 0.3, 0.26, 0.28).translate(0, floorY + colH - 0.13, w / 2 - 0.02), color: C.beam, opts: { bands: 3, tint: C.tint } });
    for (let k = 0; k <= n; k++) {
      fp.push(...brackets({
        x: -w / 2 + (k / n) * w, y: floorY + colH, z: w / 2 - 0.1, steps: 2, scale: 0.9,
        color: bright ? PAL.vermilion : PAL.bengara, block: bright ? PAL.gatePanel : PAL.gateGreen,
      }));
    }
    xform(fp, _m4().makeRotationY(-f * Math.PI / 2));
    P.all(fp);
  }
  const eaveY = floorY + colH + 1.15;
  const roof = hipRoof({
    w, d, pitch: 0.66, eave: 2.2, material: 'hiwada', mukuri: 0.05, sori: 0.03,
    cornerLift: 0.85, ridgeCourses: 0, y: eaveY,
  });
  P.all(roof.parts);
  P.add(box(roof.ridgeLen + 0.5, 0.42, 0.55).translate(0, roof.ridgeY + 0.21, 0), PAL.hiwadaEdge, { bands: 3, tint: TINT.warm });
  for (let f = 0; f < 4; f++) {
    const rf = rafters({ w: w + 3.6, depth: 2.1, y: 0, z: 0, spacing: 0.28, size: 0.085, color: C.rafter, double: true });
    xform(rf, _m4().makeRotationX(18 * DEG));
    xform(rf, _m4().makeTranslation(0, eaveY - 0.26, w / 2 - 0.4));
    xform(rf, _m4().makeRotationY(-f * Math.PI / 2));
    P.all(rf);
  }

  const out = emit(ctx, P, { baker, x, y: 0, z, ry, name, outline: false });
  ctx.collideRot(x, z, w - 0.6, d - 0.6, ry, undefined, floorY + 1.0);
  return { ...out, x, z, ry, floorY, under, ridgeY: roof.ridgeY, deck: { x: ax, z: az } };
}

/* ------------------------------------------------------------------ *
 * 6.  音羽の滝 -- THE OTOWA WATERFALL.
 *
 * Three streams, four metres, and the temple's whole reason for existing: the
 * water is 金色水 and 延命水, you catch it in a long-handled 柄杓 from the
 * rack, and it is **not** a natural sheet fall -- it is delivered through
 * three 筧, split timber flumes, so model three discrete spouts 1.3 m apart.
 * 不動明王 is enshrined at the head of it, and 奥の院 stands directly overhead.
 * ------------------------------------------------------------------ */
export function makeOtowaFalls(ctx, {
  x, z, y = null, ry = facing(230), baker = null, name = 'otowa',
  drop = 4.0, spacing = 1.3,
} = {}) {
  const P = new Parts();
  const g0 = y ?? ctx.groundAt(x, z);

  // the cliff face the flumes come out of
  P.add(box(9.0, 6.5, 2.4).translate(0, g0 + 2.4, -3.4), PAL.stoneWall, { bands: 3, tint: TINT.cool });
  for (let k = 0; k < 5; k++) {
    P.add(box(1.8 + k * 0.3, 1.1, 1.0).translate(-3.2 + k * 1.7, g0 + 0.55 + (k % 2) * 0.4, -2.1),
      PAL.stoneDark, { bands: 3, tint: TINT.cool });
  }
  // the catch basin: dressed stone, about 0.5 m deep
  P.add(box(4.6, 0.55, 2.0).translate(0, g0 + 0.27, 0.4), PAL.stoneDark, { bands: 3, tint: TINT.cool });
  P.add(box(4.0, 0.10, 1.5).translate(0, g0 + 0.50, 0.4), PAL.water,
    { bands: 3, tint: TINT.cool, transparent: true, opacity: 0.82 });

  const streams = [];
  for (let k = -1; k <= 1; k++) {
    const u = k * spacing;
    // 筧 -- the split-timber flume the water arrives in
    const fl = box(0.22, 0.14, 1.5);
    fl.rotateX(-0.14);
    fl.translate(u, g0 + drop + 0.6, -1.6);
    P.add(fl, PAL.bamboo, { bands: 3, tint: TINT.green });
    // the fall itself: a thin tapering sheet, and the ring where it lands
    const s = box(0.16, drop, 0.10);
    s.translate(u, g0 + 0.5 + drop / 2, -0.85);
    P.add(s, PAL.waterFoam, { bands: 'soft', tint: TINT.cool, transparent: true, opacity: 0.72 });
    P.add(lathe([[0.10, 0], [0.34, 0.06], [0.42, 0.13], [0.24, 0.16]], 10)
      .translate(u, g0 + 0.50, -0.85), PAL.waterFoam,
    { bands: 'soft', tint: TINT.cool, transparent: true, opacity: 0.6 });
    streams.push(u);
  }

  /* The shelter: a small 本瓦葺 roof over the queue, with the ladle rack under
   * it.  Six metres by three, eaves at 2.8 -- sized to shelter three queues. */
  const sw = 6.2, sd = 3.0, eaveH = 2.8;
  for (const cu of [-sw / 2, 0, sw / 2]) {
    for (const cv of [-sd / 2 + 0.2, sd / 2]) {
      P.add(post(0.13, 0.12, eaveH, 8).translate(cu, g0, cv), PAL.timberMid, { bands: 3, tint: TINT.warm, flat: false });
    }
  }
  P.add(box(sw + 0.4, 0.20, 0.22).translate(0, g0 + eaveH - 0.10, sd / 2), PAL.timberDark, { bands: 3, tint: TINT.warm });
  const roof = gableRoof({
    w: sw, d: sd, pitch: 0.46, eave: 0.9, material: 'tile', mukuri: 0.02,
    sori: 0.06, cornerLift: 0.25, ridgeCourses: 3, y: g0 + eaveH,
  });
  P.all(roof.parts);
  // the ladle rack, and the ladles
  P.add(box(sw * 0.7, 0.10, 0.30).translate(0, g0 + 1.55, sd / 2 - 0.5), PAL.timberPale, { bands: 3, tint: TINT.warm });
  for (let k = 0; k < 9; k++) {
    const u = -sw * 0.3 + (k / 8) * sw * 0.6;
    P.add(box(0.045, 1.25, 0.045).translate(u, g0 + 1.0, sd / 2 - 0.5), PAL.timberPale, { bands: 3, tint: TINT.warm });
    P.add(lathe([[0.001, 0], [0.075, 0.01], [0.085, 0.09], [0.07, 0.10]], 8)
      .translate(u, g0 + 1.60, sd / 2 - 0.5), PAL.timberPale, { bands: 3, tint: TINT.warm });
  }
  // 不動明王's little shrine at the head of the falls
  P.add(box(0.9, 1.3, 0.7).translate(2.9, g0 + 0.65, -1.9), PAL.stoneDark, { bands: 3, tint: TINT.cool });

  const out = emit(ctx, P, { baker, x, y: 0, z, ry, name, outline: false });
  ctx.collideRot(x, z - 3.4, 9.0, 2.4, ry);
  return { ...out, x, z, ry, streams, basinY: g0 + 0.5 };
}

/* ------------------------------------------------------------------ *
 * 7.  子安塔 -- KOYASU-TO.
 *
 * 三間三重塔婆、**檜皮葺** -- cypress bark, NOT tile, which is the most
 * commonly mis-modelled fact about this building.  15 m, vermilion and
 * brightly restored, standing across the 錦雲渓 valley 193 m due south of the
 * stage at the same elevation, +4.3 deg above the eyeline.  It reads as a
 * small red tower floating in the treetops, and it is the depth cue that makes
 * the ravine legible from the stage.
 * ------------------------------------------------------------------ */
export function makeKoyasuPagoda(ctx, opts = {}) {
  return makeThreeStoreyPagoda(ctx, {
    storeyWidths: [3.0, 2.72, 2.45],
    eaveSpan: [6.9, 6.65, 6.4],
    height: 15.0, sorinHeight: 4.5, bodyHeight: 10.5,
    marugetaOut: 0.62, jiDarukiOut: 0.80, hienDarukiOut: 0.52,
    cornerRise: 0.30, plinthH: 0.7, eda: 0.30,
    material: 'hiwada', vermilion: true, name: 'koyasuto',
    ...opts,
  });
}

/* ------------------------------------------------------------------ *
 * 8.  THE REST OF THE VOCABULARY
 * ------------------------------------------------------------------ */

/**
 * 鐘楼 -- the belfry.  桁行一間、梁間二間、切妻造、本瓦葺, 1607, and unusually
 * **six** pillars rather than the normal four.  Momoyama carving: peony 懸魚,
 * chrysanthemum 蟇股, and tapir-and-elephant 木鼻 at the corner columns.
 */
export function makeShoro(ctx, {
  x, z, y = null, ry = 0, baker = null, name = 'shoro', w = 2.6, d = 4.9, colH = 3.6,
} = {}) {
  const P = new Parts();
  const C = palette(false);
  const g0 = y ?? ctx.groundAt(x, z);
  P.add(box(w + 1.5, 0.75, d + 1.5).translate(0, 0.05, 0), PAL.stoneWall, { bands: 3, tint: TINT.cool });
  // six columns: two ranks of three, splayed slightly outward at the foot
  for (const cu of [-w / 2, w / 2]) {
    for (const cv of [-d / 2, 0, d / 2]) {
      P.add(post(0.20, 0.17, colH, 10).translate(cu, 0.45, cv), C.column, { bands: 3, tint: C.tint, flat: false });
      P.add(box(0.50, 0.16, 0.50).translate(cu, 0.38, cv), PAL.stone, { bands: 3, tint: TINT.cool });
    }
  }
  for (let f = 0; f < 4; f++) {
    const along = f % 2 === 0 ? w : d;
    const off = (f % 2 === 0 ? d : w) / 2;
    const fp = [{ geometry: box(along + 0.3, 0.22, 0.24).translate(0, 0.45 + colH - 0.11, off), color: C.beam, opts: { bands: 3, tint: C.tint } }];
    for (let k = 0; k <= Math.max(1, Math.round(along / 1.8)); k++) {
      const nk = Math.max(1, Math.round(along / 1.8));
      fp.push(...brackets({ x: -along / 2 + (k / nk) * along, y: 0.45 + colH, z: off - 0.06, steps: 2, scale: 0.8, color: C.bracket, block: C.block }));
    }
    xform(fp, _m4().makeRotationY(-f * Math.PI / 2));
    P.all(fp);
  }
  const roof = gableRoof({
    w, d, pitch: 0.52, eave: 1.5, material: 'tile', sori: 0.10, mukuri: 0,
    cornerLift: 0.45, ridgeCourses: 4, y: 0.45 + colH + 0.9, ridgeAlongX: false,
  });
  P.all(roof.parts);
  P.all(xform(gyo({ w: 0.6, h: 0.75, y: roof.ridgeY - 1.0 }), _m4().makeTranslation(0, 0, d / 2 + 1.3)));
  P.all(makeBell({ y: 0.45 + colH - 0.55 }).list);

  const out = emit(ctx, P, { baker, x, y: g0, z, ry, name, outline: false });
  ctx.collideRot(x, z, w + 0.6, d + 0.6, ry);

  /* The one interactable in the kit: strike the bell.  Restrained -- the bell
   * swings a couple of centimetres and stops. */
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1.4),
    new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(x, g0 + 0.45 + colH - 1.3, z);
  hit.visible = false;
  ctx.add(hit);
  ctx.interact({ hitbox: hit, label: 'strike the bell', action() {} });

  return { ...out, x, z, ry };
}

/** 梵鐘 -- the bell itself, as a lathe with a 龍頭 loop and its 乳 bosses. */
export function makeBell({ y = 0, h = 1.6, dia = 0.92 } = {}) {
  const P = new Parts();
  const r = dia / 2;
  const prof = [
    [0.00, 0.00], [0.42, 0.00], [0.50, 0.06], [0.50, 0.14],
    [0.48, 0.42], [0.44, 0.72], [0.34, 0.90], [0.20, 0.97], [0.10, 1.00], [0.00, 1.00],
  ];
  P.add(lathe(prof.map(([rr, hh]) => [rr * dia, y - h + hh * h]), 14),
    PAL.metalDark, { bands: 4, tint: TINT.cool, flat: false });
  // 龍頭 -- the dragon-head loop it hangs from
  P.add(lathe([[0.05, 0], [0.10, 0.05], [0.10, 0.18], [0.04, 0.24]], 8)
    .translate(0, y, 0), PAL.metalDark, { bands: 4, tint: TINT.cool, flat: false });
  // 乳 -- the grid of bosses round the shoulder, as blocks: at any distance
  // a boss is a dot of shadow and a sphere would cost forty triangles for it
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    for (let k = 0; k < 2; k++) {
      P.add(box(0.07, 0.07, 0.07)
        .translate(Math.cos(a) * r * 0.99, y - h * 0.34 + k * 0.15, Math.sin(a) * r * 0.99),
      PAL.metalDark, { bands: 4, tint: TINT.cool });
    }
  }
  return P;
}

/**
 * 経堂 -- the sutra hall.  桁行五間、梁間四間、背面庇付、入母屋造、本瓦葺.
 * It doubles as the lecture hall and its 鏡天井 carries a circle-dragon in ink.
 */
export function makeSutraHall(ctx, {
  x, z, y = null, ry = 0, baker = null, name = 'kyozo', w = 12.1, d = 9.7, colH = 4.4,
} = {}) {
  const P = new Parts();
  const C = palette(false);
  const g0 = y ?? ctx.groundAt(x, z);
  P.add(box(w + 1.4, 0.85, d + 1.4).translate(0, -0.1, 0), PAL.stoneWall, { bands: 3, tint: TINT.cool });
  P.add(box(w, 0.26, d).translate(0, 0.62, 0), PAL.timberDark, { bands: 3, tint: TINT.warm });
  const nW = 5, nD = 4;
  for (let i = 0; i <= nW; i++) {
    const u = -w / 2 + (i / nW) * w;
    for (const s of [-1, 1]) P.add(post(0.22, 0.20, colH, 10).translate(u, 0.75, s * d / 2), C.column, { bands: 3, tint: C.tint, flat: false });
  }
  for (let j = 1; j < nD; j++) {
    const v = -d / 2 + (j / nD) * d;
    for (const s of [-1, 1]) P.add(post(0.22, 0.20, colH, 10).translate(s * w / 2, 0.75, v), C.column, { bands: 3, tint: C.tint, flat: false });
  }
  for (let f = 0; f < 4; f++) {
    const along = f % 2 === 0 ? w : d;
    const off = (f % 2 === 0 ? d : w) / 2;
    const fp = [{ geometry: box(along - 0.3, colH - 0.8, 0.16).translate(0, 0.75 + (colH - 0.8) / 2, off - 0.14), color: C.panel, opts: { bands: C.panelBands, tint: TINT.cool } },
      { geometry: box(along + 0.3, 0.24, 0.26).translate(0, 0.75 + colH - 0.12, off), color: C.beam, opts: { bands: 3, tint: C.tint } }];
    const n = Math.max(2, Math.round(along / 2.2));
    for (let k = 0; k <= n; k++) fp.push(...brackets({ x: -along / 2 + (k / n) * along, y: 0.75 + colH, z: off - 0.06, steps: 2, scale: 0.9, color: C.bracket, block: C.block }));
    xform(fp, _m4().makeRotationY(-f * Math.PI / 2));
    P.all(fp);
  }
  const roof = irimoyaRoof({
    w, d, pitch: 0.56, eave: 1.9, material: 'tile', sori: 0.09, cornerLift: 0.7,
    ridgeCourses: 6, gableFrac: 0.5, y: 0.75 + colH + 1.05, gableFace: 'x',
  });
  P.all(roof.parts);
  const out = emit(ctx, P, { baker, x, y: g0, z, ry, name, outline: false });
  ctx.collideRot(x, z, w, d, ry);
  ctx.platform({ x0: x - w / 2 - 0.7, z0: z - d / 2 - 0.7, x1: x + w / 2 + 0.7, z1: z + d / 2 + 0.7, top: g0 + 0.75 });
  return { ...out, x, z, ry };
}

/**
 * 築地塀 -- the temple boundary wall.
 *
 * A rammed-earth core on a stone plinth, battered inward as it rises, capped
 * with its own little tiled roof.  It follows the ground, so on a slope it
 * steps rather than tilts -- an earth wall cannot lean.
 */
export function makeTempleWall(ctx, {
  points, y = null, baker = null, name = 'tsuijibei',
  h = 2.3, thick = 0.62, step = 6.0, collide = true, material = 'tile',
} = {}) {
  const P = new Parts();
  let n = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const nSeg = Math.max(1, Math.round(len / step));
    for (let k = 0; k < nSeg; k++) {
      const p0 = { x: lerp(a.x, b.x, k / nSeg), z: lerp(a.z, b.z, k / nSeg) };
      const p1 = { x: lerp(a.x, b.x, (k + 1) / nSeg), z: lerp(a.z, b.z, (k + 1) / nSeg) };
      const mid = { x: (p0.x + p1.x) / 2, z: (p0.z + p1.z) / 2 };
      /* An earth wall cannot lean, so a run on a slope is seated on the LOWER
       * of its two ends and the stone plinth under it makes up the rest --
       * which is exactly what the real ones do, in visible steps. */
      const gy = y ?? Math.min(ctx.groundAt(p0.x, p0.z), ctx.groundAt(p1.x, p1.z));
      const l = Math.hypot(p1.x - p0.x, p1.z - p0.z) + 0.06;
      const ang = Math.atan2(-(p1.x - p0.x), -(p1.z - p0.z)) + Math.PI / 2;

      const seg = new Parts();
      seg.add(box(l, 0.9, thick + 0.24).translate(0, -0.16, 0), PAL.stoneWall, { bands: 3, tint: TINT.cool });
      seg.add(box(l, h - 0.3, thick).translate(0, 0.29 + (h - 0.3) / 2, 0), PAL.plasterOchre, { bands: 3, tint: TINT.cool });
      // the horizontal white lines a 築地塀 is banded with
      for (const ly of [0.52, 0.94]) {
        seg.add(box(l, 0.05, thick + 0.03).translate(0, 0.29 + (h - 0.3) * ly, 0),
          PAL.plaster, { bands: 'soft3', tint: TINT.cool });
      }
      seg.all(gableRoof({
        w: l, d: thick + 0.55, pitch: 0.34, eave: 0.14, material, mukuri: 0.02,
        ridgeCourses: 2, y: h,
      }).parts);
      xform(seg.list, trs(mid.x, gy, mid.z, 0, ang, 0));
      P.all(seg.list);

      if (collide) {
        const hx = Math.abs(Math.cos(ang)) * l / 2 + Math.abs(Math.sin(ang)) * thick / 2;
        const hz = Math.abs(Math.sin(ang)) * l / 2 + Math.abs(Math.cos(ang)) * thick / 2;
        ctx.collide(mid.x - hx, mid.z - hz, mid.x + hx, mid.z + hz);
      }
      n++;
    }
  }
  const out = emit(ctx, P, { baker, x: 0, y: 0, z: 0, ry: 0, name, outline: false });
  return { ...out, segments: n };
}

/**
 * A flight of stone steps, with the height field told about every tread.
 *
 * Kyoto podium stairs of this period run shallow: 0.16 m rise on a 0.36 m
 * tread for a temple podium, against the 0.13-0.15 / 0.70-0.94 of the street
 * slope-stairs on Sannenzaka.  `top` is the level the flight arrives at; it
 * descends from there to meet the ground.
 */
export function makeStoneSteps(ctx, {
  x, z, ry = 0, w = 4.0, steps = 12, rise = 0.16, tread = 0.36,
  top = null, baker = null, name = 'steps',
} = {}) {
  const P = new Parts();
  const sin = Math.sin(ry), cos = Math.cos(ry);
  const topY = top ?? ctx.groundAt(x, z);
  for (let i = 0; i < steps; i++) {
    const v = (i + 0.5) * tread;                 // out from the podium edge
    const ty = topY - (i + 1) * rise;            // this tread's top surface
    const g = box(w, rise + 0.6, tread + 0.01);
    g.translate(0, ty - (rise + 0.6) / 2, v);
    P.add(g, PAL.stone, { bands: 3, tint: TINT.cool });
    /* Tell the height field about every tread: the visible stone and the
     * player's feet have to be the same surface, and a flight modelled as
     * geometry with flat collision under it is the bug KIT.md 2 is about.
     * The box is the tread's own AABB, so a flight turned far off the axes
     * degrades toward a ramp -- keep long flights near a cardinal bearing. */
    const px = x + v * sin, pz = z + v * cos;
    const hx = Math.abs(w / 2 * cos) + Math.abs(tread / 2 * sin);
    const hz = Math.abs(w / 2 * sin) + Math.abs(tread / 2 * cos);
    ctx.platform({ x0: px - hx, z0: pz - hz, x1: px + hx, z1: pz + hz, top: ty });
  }
  // the cheek walls
  for (const s of [-1, 1]) {
    const g = box(0.42, 0.6, steps * tread);
    g.translate(s * (w / 2 + 0.21), topY - steps * rise / 2 - 0.1, steps * tread / 2);
    P.add(g, PAL.stoneWall, { bands: 3, tint: TINT.cool });
  }
  const out = emit(ctx, P, { baker, x, y: 0, z, ry, name, outline: false });
  return { ...out, x, z, ry, topY, bottomY: topY - steps * rise, run: steps * tread };
}

export { palette as templePalette };
