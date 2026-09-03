import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT, cel, celTex } from '../core/toon.js';
import { rngKit, trs, clamp, lerp } from '../core/util.js';
import {
  verticalSign, woodenSign, noticeBoard, lanternTex, templePlaque,
} from '../core/textures.js';
import { makeMachiya, KEN } from '../kit/machiya.js';
import { makeShopfront } from '../kit/shopfront.js';
import { makeStoneLantern } from '../kit/shrine.js';
import { gableRoof, hipRoof, shedRoof, brackets } from '../kit/roof.js';
import { layoutPlots, alongStreet, atStreet } from './plots.js';

/* ==================================================================== *
 * 下河原通 -- Shimogawara-dori.
 *
 * 466 m running south from the stone torii at Yasaka Shrine's south approach
 * to the top of 八坂通, climbing 51.4 m to 57.8 m -- a steady 1.4 %, which is
 * gentle enough that it reads as level and steep enough that every wall on it
 * steps.  11.5 m face to face, stone paving, bearing 176.9.
 *
 * ------------------------------------------------------------ THE POINT
 *
 * This is the **connective** street, and its job is to be quiet.  It links
 * the shrine to the pagoda and it is what you walk down between two of the
 * loudest things on the route, so if it competes with either of them the
 * whole sequence flattens.  Hanamikoji earns its place on frontage; Yasaka-
 * dori earns its place on a sightline; Shimogawara earns its place by having
 * long stretches where **nothing happens**: a temple wall, a garden wall, a
 * run of ordinary houses, bamboo showing over a fence.
 *
 * The measured 11.5 m face-to-face is flagged BIASED HIGH in the survey's
 * uncertainty register (GEO.md, item 12) precisely because so much of one
 * side is garden and wall with no mapped building to cast a ray at.  That is
 * not a defect in the number -- it is a description of the street.  So the
 * frontage line at 4.0 m is used where there are buildings, and the walls are
 * set a little further back, which is what makes it feel wider than Yasaka-
 * dori by more than the 5 m of difference.
 *
 * ------------------------------------------------------------- THE POLES
 *
 * **Shimogawara still has its overhead wires.**  Only 花見小路, 二年坂 /
 * 産寧坂, ねねの道 and 祇園新橋 were undergrounded; 八坂通 is partial and
 * 下河原通 has no project record either way, which in Kyoto means no.  The
 * poles, the crossarms and the comms bundle sagging between them are half of
 * why this street reads as a real place rather than a preserved one, and
 * leaving them off would be the error -- the central prop batcher chains the
 * wires between neighbours for free.
 *
 * ------------------------------------------------------ 文の助茶屋
 *
 * 下河原通東入八坂上町373, founded 1909 by the rakugo-ka 二代目桂文之助.  It
 * is the one thing on the street that is worth stopping for, and the reason
 * is architectural: it **enters through a substantial temple-style gate**
 * (「お寺みたいな門」), not a shopfront, and what is behind the gate is a
 * garden courtyard with 縁台 benches, a big 行灯, red 番傘 parasols and a
 * plum and a maple carried over from the original Kodai-ji sub-temple site.
 * A shopfront here would be the single wrongest building on the street.
 * ==================================================================== */

export const id = 'shimogawara';

const BK = 'shimogawara';
const ST = 'shimogawara';

const box = (w, h, d) => new THREE.BoxGeometry(Math.max(2e-3, w), Math.max(2e-3, h), Math.max(2e-3, d));

function addParts(b, parts, m) {
  for (const p of parts) { b.add(p.geometry, m, p.color, p.opts); p.geometry.dispose(); }
}

/* ------------------------------------------------------------------ *
 * Walls.
 *
 * Two kinds, and the difference matters: a 築地塀 (rammed earth on a stone
 * plinth, under its own tiled roof) belongs to a temple, and a 板塀 (charred
 * cedar boards on a timber frame, capped with a thin board) belongs to a
 * house.  Putting the temple wall round a garden is the commonest way to make
 * a Japanese street look like a theme park.
 * ------------------------------------------------------------------ */

/** Walk a stretch of the street's frontage line and return its points. */
function frontageRun(street, side, from, to, offset, step = 5.0) {
  const pts = alongStreet({ street, side, from, to, spacing: step, jitter: 0, seed: 1, offset });
  return pts;
}

function earthWall(ctx, b, pts, { h = 2.25, thick = 0.5, collide = true }) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1];
    const len = Math.hypot(c.x - a.x, c.z - a.z);
    if (len < 0.3) continue;
    const cx = (a.x + c.x) / 2, cz = (a.z + c.z) / 2;
    const ang = Math.atan2((c.x - a.x) / len, (c.z - a.z) / len);
    const base = Math.min(a.y, c.y) - 0.35;
    const M = trs(cx, base, cz, 0, ang, 0);
    const bodyH = h - 0.26 + (Math.max(a.y, c.y) - Math.min(a.y, c.y)) * 0.5 + 0.35;
    b.add(box(len + 0.05, 0.46, thick + 0.24), M.clone().multiply(trs(0, 0.23, 0)),
      PAL.stoneWall, { bands: 3, tint: TINT.cool });
    b.add(box(len + 0.05, bodyH, thick), M.clone().multiply(trs(0, 0.40 + bodyH / 2, 0)),
      PAL.plasterOchre, { bands: 3, tint: TINT.cool });
    for (const ly of [0.44, 0.70]) {
      b.add(box(len + 0.05, 0.05, thick + 0.05), M.clone().multiply(trs(0, 0.40 + bodyH * ly, 0)),
        PAL.plaster, { bands: 'soft3', tint: TINT.cool });
    }
    const cap = gableRoof({
      w: len + 0.05, d: thick + 0.42, pitch: 0.32, eave: 0.32, material: 'tile',
      mukuri: 0.03, ridgeCourses: 2, y: 0.40 + bodyH, gableEnd: false,
    });
    addParts(b, cap.parts, M);
    if (collide) {
      ctx.collide(Math.min(a.x, c.x) - thick, Math.min(a.z, c.z) - thick,
        Math.max(a.x, c.x) + thick, Math.max(a.z, c.z) + thick);
    }
  }
}

/** 板塀 -- the charred-cedar board fence, on a low stone kerb. */
function boardFence(ctx, b, pts, { h = 1.95, rng, collide = true }) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1];
    const len = Math.hypot(c.x - a.x, c.z - a.z);
    if (len < 0.3) continue;
    const cx = (a.x + c.x) / 2, cz = (a.z + c.z) / 2;
    const ang = Math.atan2((c.x - a.x) / len, (c.z - a.z) / len);
    const base = Math.min(a.y, c.y);
    const M = trs(cx, base, cz, 0, ang, 0);
    const rise = Math.max(a.y, c.y) - base;
    b.add(box(len + 0.04, 0.34 + rise, 0.34), M.clone().multiply(trs(0, (0.34 + rise) / 2 - 0.1, 0)),
      PAL.stoneWallDark, { bands: 3, tint: TINT.cool });
    // boards, with the posts standing proud of them every ken
    b.add(box(len + 0.02, h, 0.055), M.clone().multiply(trs(0, 0.28 + rise + h / 2, 0)),
      rng && rng.chance(0.4) ? PAL.timberGrey : PAL.timberDark, { bands: 2, tint: TINT.warm });
    const n = Math.max(1, Math.round(len / KEN));
    for (let k = 0; k <= n; k++) {
      b.add(box(0.11, h + 0.08, 0.13), M.clone().multiply(trs(-len / 2 + (k / n) * len, 0.28 + rise + h / 2, 0.02)),
        PAL.timberDark, { bands: 3, tint: TINT.warm });
    }
    // 笠木 -- the capping board, which is what keeps it from reading as a panel
    b.add(box(len + 0.24, 0.09, 0.30), M.clone().multiply(trs(0, 0.28 + rise + h + 0.045, 0)),
      PAL.timberMid, { bands: 3, tint: TINT.warm });
    if (collide) {
      ctx.collide(Math.min(a.x, c.x) - 0.2, Math.min(a.z, c.z) - 0.2,
        Math.max(a.x, c.x) + 0.2, Math.max(a.z, c.z) + 0.2);
    }
  }
}

/**
 * 棟門 -- a temple-form gate for a garden or a teahouse: two posts, a plank
 * threshold, deep tiled gable, plaque in the bay.  Opening runs along local
 * z; `ry = 0` faces north.
 */
function gardenGate(ctx, b, { x, z, y, ry = 0, w = 3.3, d = 1.9, colH = 3.0, plaque = null, plaqueBoard = null }) {
  const M = trs(x, y, z, 0, ry, 0);
  const P = [];
  const push = (g, color, opts) => P.push({ geometry: g, color, opts });
  const T = { bands: 3, tint: TINT.warm };
  const hw = w / 2;
  for (const sx of [-1, 1]) {
    push(box(0.58, 0.26, 0.58).translate(sx * hw, 0.10, 0), PAL.stone, { bands: 3, tint: TINT.cool });
    const g = new THREE.CylinderGeometry(0.17, 0.19, colH, 10);
    g.translate(sx * hw, 0.22 + colH / 2, 0);
    push(g, PAL.timberMid, { bands: 3, tint: TINT.warm, flat: false });
    for (const sz of [-1, 1]) {
      const s = new THREE.CylinderGeometry(0.11, 0.12, colH * 0.72, 8);
      s.translate(sx * hw, 0.22 + colH * 0.36, sz * d / 2);
      push(s, PAL.timberMid, { bands: 3, tint: TINT.warm, flat: false });
      push(box(0.10, 0.14, d / 2).translate(sx * hw, 0.22 + colH * 0.72, sz * d / 4), PAL.timberDark, T);
    }
  }
  push(box(w + 0.7, 0.30, 0.26).translate(0, 0.22 + colH - 0.15, 0), PAL.timberDark, T);
  push(box(w + 0.3, 0.14, 0.20).translate(0, 0.22 + colH * 0.58, 0), PAL.timberDark, T);
  push(box(w + 0.3, 0.20, 0.52).translate(0, 0.10, 0), PAL.stone, { bands: 3, tint: TINT.cool });
  for (const sx of [-1, 1]) {
    for (const p of brackets({ x: sx * hw, y: 0.22 + colH, z: 0, steps: 1, scale: 0.8,
      color: PAL.timberWarm, block: PAL.timberPale })) P.push(p);
  }
  const roof = gableRoof({
    w: w + 1.1, d: d + 1.0, pitch: 0.48, eave: 1.0, material: 'tile',
    mukuri: 0, sori: 0.10, cornerLift: 0.38, ridgeCourses: 4, y: 0.22 + colH + 0.42,
  });
  P.push(...roof.parts);
  for (const p of P) b.add(p.geometry, M, p.color, p.opts);
  for (const p of P) p.geometry.dispose();
  for (const s of [-1, 1]) {
    ctx.collideRot(x + s * hw * Math.cos(ry), z - s * hw * Math.sin(ry), 0.55, d + 0.6, ry);
  }
  if (plaque) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.5),
      celTex(templePlaque(plaque, { board: plaqueBoard ?? 0x2e2620, frame: PAL.timberDark }), { bands: 3, tint: TINT.warm }));
    m.position.set(x, y + 0.22 + colH - 0.02, z);
    m.rotation.y = ry + Math.PI;
    m.translateZ(d / 2 + 0.32);
    m.userData.noOutline = true;
    ctx.add(m);
  }
  return { ridgeY: y + roof.ridgeY };
}

/* ==================================================================== *
 * The build.
 * ==================================================================== */

export function build(ctx) {
  const rng = rngKit(31337);
  const b = ctx.baker(BK);
  const out = { buildings: [], walls: 0 };

  /* Which side is which.  The street runs almost due south (bearing 176.9),
   * and `plots.js` normals give side -1 = EAST, side +1 = WEST.  Kodai-ji's
   * hill is on the east, the shrine's ground and the Gion blocks on the
   * west, and the two sides are deliberately not symmetrical. */
  const EAST = -1, WEST = 1;

  /* ------------------------------------------------------------------ *
   * 1.  The frontage, in runs.
   *
   * The street is authored as a *sequence*, not as a uniform row, because a
   * quiet street is quiet by having long stretches with no doors in them.
   * Each run is either buildings or a wall, and the walls are more than half
   * the length of the east side.
   * ------------------------------------------------------------------ */
  const RUNS = [
    // ---- east side: the Kodai-ji flank.  Mostly wall and garden.
    { side: EAST, from: 0.045, to: 0.150, kind: 'earth', trees: 'cedar' },
    { side: EAST, from: 0.160, to: 0.330, kind: 'houses' },
    { side: EAST, from: 0.340, to: 0.415, kind: 'board', trees: 'bamboo' },
    { side: EAST, from: 0.425, to: 0.565, kind: 'houses' },
    { side: EAST, from: 0.575, to: 0.700, kind: 'earth', trees: 'maple', gate: 0.640 },
    { side: EAST, from: 0.710, to: 0.855, kind: 'mixed' },
    { side: EAST, from: 0.865, to: 0.900, kind: 'board', trees: 'bamboo' },
    // 0.905 - 0.965 is 文の助茶屋, built separately below

    // ---- west side: ordinary blocks, a few restaurants, one long garden.
    { side: WEST, from: 0.045, to: 0.260, kind: 'houses' },
    { side: WEST, from: 0.270, to: 0.345, kind: 'board', trees: 'shrub' },
    { side: WEST, from: 0.355, to: 0.520, kind: 'mixed' },
    { side: WEST, from: 0.530, to: 0.600, kind: 'earth', trees: 'pine' },
    { side: WEST, from: 0.610, to: 0.800, kind: 'houses' },
    { side: WEST, from: 0.810, to: 0.870, kind: 'board', trees: 'bamboo' },
    { side: WEST, from: 0.880, to: 0.975, kind: 'mixed' },
  ];

  let runIndex = 0;
  for (const r of RUNS) {
    runIndex++;
    if (r.kind === 'earth' || r.kind === 'board') {
      /* The walls sit 0.9 m behind the building frontage line.  That gap is
       * the whole reason the street feels open where it is walled: the eye
       * reads the setback long before it reads the wall. */
      const pts = frontageRun(ST, r.side, r.from, r.to, 4.9, 5.5);
      if (pts.length > 1) {
        if (r.kind === 'earth') earthWall(ctx, b, pts, { h: 2.3, thick: 0.5 });
        else boardFence(ctx, b, pts, { h: 1.95, rng });
        out.walls += pts.length - 1;
      }
      /* What is behind it.  A wall with nothing over it is a fence; a wall
       * with a bamboo stand or a pine leaning over it is a garden. */
      const back = frontageRun(ST, r.side, r.from + 0.006, r.to - 0.006, 8.4, 7.5);
      for (const p of back) {
        if (r.trees === 'bamboo') {
          ctx.tree({ kind: 'bamboo', x: p.x, z: p.z, y: p.y, scale: rng.range(0.9, 1.2), seed: rng.int(0, 9999) });
        } else if (r.trees === 'cedar') {
          ctx.tree({ kind: 'cedar', x: p.x, z: p.z, y: p.y, scale: rng.range(0.9, 1.25), seed: rng.int(0, 9999) });
        } else if (r.trees === 'pine' && rng.chance(0.6)) {
          ctx.tree({ kind: 'pine', x: p.x, z: p.z, y: p.y, scale: rng.range(0.85, 1.2), seed: rng.int(0, 9999) });
        } else if (r.trees === 'maple' && rng.chance(0.7)) {
          ctx.tree({ kind: 'maple', x: p.x, z: p.z, y: p.y, scale: rng.range(0.85, 1.15), seed: rng.int(0, 9999) });
        } else if (rng.chance(0.55)) {
          ctx.tree({ kind: 'shrub', x: p.x, z: p.z, y: p.y, scale: rng.range(0.7, 1.1), seed: rng.int(0, 9999) });
        }
      }
      if (r.gate) {
        const a = atStreet(ST, r.gate, { side: r.side, offset: 4.7 });
        if (a) {
          gardenGate(ctx, b, {
            x: a.x, z: a.z, y: ctx.groundAt(a.x, a.z), ry: a.across,
            w: 3.2, d: 1.9, colH: 3.0, plaque: '圓徳院',
          });
          makeStoneLantern(ctx, {
            x: a.x - a.nx * 2.6 + a.tx * 2.6, z: a.z - a.nz * 2.6 + a.tz * 2.6,
            kind: 'path', height: 1.6, baker: BK,
          });
        }
      }
      continue;
    }

    /* Buildings.  `layoutPlots` snaps every frontage to the ken so the posts
     * line up across the gaps between houses -- which is what makes a run of
     * six read as one wall with a beat. */
    const plots = layoutPlots({
      street: ST, side: r.side, from: r.from, to: r.to,
      mix: r.kind === 'mixed' ? 'shop' : 'machiya',
      gap: 0.04, seed: 400 + runIndex * 13,
    });
    let prev = null;
    plots.forEach((p, i) => {
      const seed = (6151 * (i + 2) + runIndex * 977) >>> 0;
      /* 'mixed' runs carry the street's handful of restaurants and tea
       * houses; 'houses' runs are residential and get no signage at all,
       * which is most of what makes them quiet. */
      const wantShop = r.kind === 'mixed' && rng.chance(0.62);
      if (wantShop) {
        let kind = rng.pick(['restaurant', 'restaurant', 'matcha', 'soba', 'komono', 'crafts']);
        if (kind === prev) kind = 'restaurant';
        prev = kind;
        out.buildings.push(makeShopfront(ctx, {
          x: p.x, z: p.z, ry: p.ry, width: p.width, depth: rng.range(9, 15),
          kind, seed, baker: BK,
          name: kind === 'restaurant' ? rng.pick(['京料理', '割烹', '仕出し']) : null,
          timberTone: rng.chance(0.45) ? PAL.timberDark : PAL.timber,
          plasterTone: rng.chance(0.4) ? PAL.plasterOchre : PAL.plasterWarm,
          roofMaterial: rng.chance(0.25) ? 'tileOld' : 'tile',
        }));
        ctx.stats.shopfronts++;
      } else {
        prev = null;
        /* 数寄屋風 sparingly.  Its 丸竹組格子 is the one green surface in the
         * machiya kit, and at one house in three a whole block of it turns
         * the street into a run of green stripes -- which is the first thing
         * a render of this street showed. */
        const style = rng.chance(0.12) ? 'sukiya' : rng.chance(0.45) ? 'residence' : 'machiya';
        out.buildings.push(makeMachiya(ctx, {
          x: p.x, z: p.z, ry: p.ry, width: p.width, depth: rng.range(9, 16),
          style, seed, baker: BK,
          timberTone: rng.chance(0.35) ? PAL.timberDark : rng.chance(0.3) ? PAL.timberGrey : PAL.timber,
          plasterTone: rng.chance(0.55) ? PAL.plasterOchre : PAL.plasterWarm,
          roofMaterial: rng.chance(0.28) ? 'tileOld' : 'tile',
        }));
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 2.  京甘味 文の助茶屋 -- 1909, 下河原通東入八坂上町373.
   *
   * The gate is the building.  Behind it a walled courtyard with the 縁台
   * benches under 緋毛氈, a red 番傘 over them, a big 行灯 by the path, a plum
   * and a maple, and the tea house itself set back so that from the street
   * you see a gate, a roof over a wall, and a tree.
   * ------------------------------------------------------------------ */
  const bunnosuke = (() => {
    const a = atStreet(ST, 0.932, { side: EAST, offset: 4.6 });
    if (!a) return null;
    const gy = ctx.groundAt(a.x, a.z);
    const ry = a.across;                     // faces back across the street
    const cos = Math.cos(ry), sin = Math.sin(ry);
    /* local +z runs INTO the plot, away from the street -- the same frame
     * `makeMachiya` uses, so the two can be reasoned about together. */
    const L = (u, v) => ({ x: a.x + u * cos + v * sin, z: a.z - u * sin + v * cos });

    gardenGate(ctx, b, { x: a.x, z: a.z, y: gy, ry, w: 3.4, d: 2.1, colH: 3.15, plaque: '文の助茶屋' });

    // the courtyard walls either side of the gate, and down the plot
    for (const s of [-1, 1]) {
      const p0 = L(s * 2.1, 0), p1 = L(s * 8.5, 0);
      earthWall(ctx, b, [
        { x: p0.x, z: p0.z, y: ctx.groundAt(p0.x, p0.z) },
        { x: p1.x, z: p1.z, y: ctx.groundAt(p1.x, p1.z) },
      ], { h: 2.15, thick: 0.44 });
      const p2 = L(s * 8.5, 11.0);
      earthWall(ctx, b, [
        { x: p1.x, z: p1.z, y: ctx.groundAt(p1.x, p1.z) },
        { x: p2.x, z: p2.z, y: ctx.groundAt(p2.x, p2.z) },
      ], { h: 2.15, thick: 0.44 });
    }

    // the tea house itself, set back 9 m behind the gate
    const h = L(0, 11.5);
    const tea = makeMachiya(ctx, {
      x: h.x, z: h.z, ry, width: 5 * KEN, depth: 11.0,
      style: 'residence', floors: 2, seed: 4409, baker: BK,
      timberTone: PAL.timber, plasterTone: PAL.plasterOchre,
      noren: { text: '文の助茶屋', cloth: PAL.norenIndigo, panels: 3 },
      lanterns: 2,
    });
    out.buildings.push(tea);
    ctx.stats.shopfronts++;

    // 縁台 under 緋毛氈 with a 番傘 over them, and a big 行灯 by the path
    for (let i = 0; i < 3; i++) {
      const p = L(-2.4 + i * 2.4, 5.4 + (i % 2) * 1.1);
      ctx.prop({ kind: 'endai', x: p.x, z: p.z, y: ctx.groundAt(p.x, p.z), rot: ry });
    }
    const u1 = L(-3.4, 5.0);
    ctx.prop({ kind: 'umbrellaFolded', x: u1.x, z: u1.z, y: ctx.groundAt(u1.x, u1.z), rot: ry + 0.3 });
    const st1 = L(3.2, 6.4);
    ctx.prop({ kind: 'stool', x: st1.x, z: st1.z, y: ctx.groundAt(st1.x, st1.z), rot: ry });
    const bs = L(-4.6, 3.2);
    ctx.prop({ kind: 'stoneBasin', x: bs.x, z: bs.z, y: ctx.groundAt(bs.x, bs.z), rot: ry });
    for (const [u, v] of [[0, 3.0], [0, 5.6], [0.4, 8.2]]) {
      const p = L(u, v);
      ctx.prop({ kind: 'stepStone', x: p.x, z: p.z, y: ctx.groundAt(p.x, p.z), rot: rng.range(0, 6.28) });
    }
    const pl = L(4.0, 4.0), mp = L(-5.2, 8.6);
    ctx.tree({ kind: 'maple', x: mp.x, z: mp.z, y: ctx.groundAt(mp.x, mp.z), scale: 1.15, seed: 900, shadow: true });
    ctx.tree({ kind: 'camellia', x: pl.x, z: pl.z, y: ctx.groundAt(pl.x, pl.z), scale: 1.0, seed: 901 });

    // 行灯 -- the big standing lamp by the gate, and a red 提灯 under the eave
    const an = L(2.4, 2.2);
    const any = ctx.groundAt(an.x, an.z);
    const M = trs(an.x, any, an.z, 0, ry, 0);
    b.add(box(0.62, 0.14, 0.62), M.clone().multiply(trs(0, 0.07, 0)), PAL.stone, { bands: 3, tint: TINT.cool });
    b.add(box(0.10, 1.1, 0.10), M.clone().multiply(trs(0, 0.65, 0)), PAL.timberDark, { bands: 3, tint: TINT.warm });
    const shade = new THREE.Mesh(box(0.44, 0.78, 0.44),
      cel({ color: PAL.paperLit, bands: 'soft', tint: TINT.warm, flat: true }));
    shade.applyMatrix4(M.clone().multiply(trs(0, 1.60, 0)));
    shade.userData.noOutline = true;
    ctx.add(shade);
    b.add(box(0.56, 0.09, 0.56), M.clone().multiply(trs(0, 2.03, 0)), PAL.timberDark, { bands: 3, tint: TINT.warm });
    ctx.light({ x: an.x, y: any + 1.6, z: an.z, color: PAL.lanternLit, intensity: 0.6, distance: 9 });

    const lt = celTex(lanternTex('文の助', { paper: PAL.lanternRed, textColor: PAL.paper, ribs: 9, band: PAL.lanternFrame }),
      { bands: 'soft', tint: TINT.warm, color: 0xffffff });
    for (const s of [-1, 1]) {
      const p = L(s * 1.15, -0.5);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.42, 10, 1, true), lt);
      m.position.set(p.x, gy + 2.45, p.z);
      m.rotation.y = ry;
      m.userData.noOutline = true;
      ctx.add(m);
      ctx.light({ x: p.x, y: gy + 2.45, z: p.z, color: PAL.lanternLit, intensity: 0.4, distance: 6 });
    }

    // the hand-written boards by the gate: 甘酒 and わらび餅, the two things it is for
    const sp = L(-2.5, -0.6);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 1.15),
      celTex(verticalSign('甘酒　わらびもち', { board: PAL.timberPale, brush: true }), { bands: 3, tint: TINT.warm }));
    sign.position.set(sp.x, ctx.groundAt(sp.x, sp.z) + 1.35, sp.z);
    sign.rotation.y = ry + Math.PI;
    sign.userData.noOutline = true;
    ctx.add(sign);
    b.add(box(0.38, 1.9, 0.09), trs(sp.x, ctx.groundAt(sp.x, sp.z) + 0.95, sp.z, 0, ry, 0),
      PAL.timberDark, { bands: 3, tint: TINT.warm });

    return { x: a.x, z: a.z, y: gy, ry };
  })();

  /* ------------------------------------------------------------------ *
   * 3.  A roadside 地蔵尊.
   *
   * Every quiet lane in this city has one: a tiny tiled shelter with a stone
   * figure in a red bib, a cup of water and a few flowers.  It is two metres
   * tall, it costs nothing, and it is one of the strongest signals that a
   * street is lived on rather than visited.
   * ------------------------------------------------------------------ */
  {
    const a = atStreet(ST, 0.470, { side: WEST, offset: 4.3 });
    if (a) {
      const y = ctx.groundAt(a.x, a.z);
      const M = trs(a.x, y, a.z, 0, a.across, 0);
      b.add(box(1.35, 0.30, 1.05), M.clone().multiply(trs(0, 0.15, 0)), PAL.stone, { bands: 3, tint: TINT.cool });
      b.add(box(1.15, 1.25, 0.85), M.clone().multiply(trs(0, 0.92, 0.06)), PAL.plaster, { bands: 'soft3', tint: TINT.cool });
      b.add(box(0.80, 1.05, 0.30), M.clone().multiply(trs(0, 0.86, -0.34)), PAL.shopInterior, { bands: 'deep', tint: TINT.cool });
      // the figure, and the red bib that is the only saturated thing on it
      const fig = new THREE.CylinderGeometry(0.10, 0.13, 0.52, 8);
      fig.translate(0, 0.62, -0.30);
      b.add(fig, M, PAL.stoneMoss, { bands: 3, tint: TINT.cool });
      const head = new THREE.SphereGeometry(0.10, 8, 6);
      head.translate(0, 0.94, -0.30);
      b.add(head, M, PAL.stoneMoss, { bands: 3, tint: TINT.cool });
      b.add(box(0.24, 0.22, 0.05), M.clone().multiply(trs(0, 0.74, -0.40)), PAL.red, { bands: 3, tint: TINT.warmDeep });
      const cap = gableRoof({ w: 1.35, d: 1.1, pitch: 0.42, eave: 0.28, material: 'tile', ridgeCourses: 2, y: 1.55 });
      addParts(b, cap.parts, M);
      ctx.collideRot(a.x, a.z, 1.4, 1.1, a.across);
      ctx.prop({ kind: 'waterBucket', x: a.x + a.tx * 0.9, z: a.z + a.tz * 0.9, y, rot: a.across });
    }
  }

  /* ------------------------------------------------------------------ *
   * 4.  The poles.
   *
   * `props.js` refuses a pole inside the undergrounded districts and chains
   * the wires between neighbours itself, so this is a placement problem and
   * nothing else: one side of the street, roughly every 30 m, set right back
   * against the frontage where the real ones stand.  They stop before the
   * 産寧坂 boundary at the south end, which the batcher would enforce anyway.
   * ------------------------------------------------------------------ */
  for (const pt of alongStreet({
    street: ST, side: WEST, from: 0.055, to: 0.885, spacing: 31, jitter: 5.5, seed: 21, offset: 3.7,
  })) {
    ctx.prop({ kind: 'utilityPole', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry, seed: rng.int(0, 9999) });
  }
  for (const pt of alongStreet({
    street: ST, side: EAST, from: 0.20, to: 0.80, spacing: 62, jitter: 8, seed: 22, offset: 3.7,
  })) {
    ctx.prop({ kind: 'utilityPole', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry, seed: rng.int(0, 9999) });
  }

  /* ------------------------------------------------------------------ *
   * 5.  The surface.
   *
   * Sparse.  Potted plants against the houses, a bicycle here and there, the
   * drain covers down the gutter, a couple of meter boxes and an air-con unit
   * -- the modern infrastructure that a preserved street hides and this one
   * does not.
   * ------------------------------------------------------------------ */
  for (const side of [EAST, WEST]) {
    for (const pt of alongStreet({
      street: ST, side, from: 0.05, to: 0.96, spacing: 8.5, jitter: 3.4,
      seed: 500 + side, offset: 3.55,
    })) {
      const r = rng.next();
      if (r < 0.22) {
        ctx.tree({ kind: 'potted', x: pt.x, z: pt.z, y: pt.y, scale: rng.range(0.7, 1.05), rot: rng.range(0, 6.28), seed: rng.int(0, 9999) });
      } else if (r < 0.33) {
        ctx.prop({ kind: 'planterPot', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry, seed: rng.int(0, 9999) });
      } else if (r < 0.40) {
        ctx.prop({ kind: 'bicycle', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry + Math.PI / 2, seed: rng.int(0, 9999) });
      } else if (r < 0.45) {
        ctx.prop({ kind: 'meterBox', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry });
      } else if (r < 0.485) {
        ctx.prop({ kind: 'acUnit', x: pt.x, z: pt.z, y: pt.y + 2.6, rot: pt.ry });
      } else if (r < 0.505) {
        ctx.prop({ kind: 'bollard', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry });
      }
    }
  }
  for (const pt of alongStreet({
    street: ST, side: EAST, from: 0.05, to: 0.96, spacing: 13, jitter: 2.5, seed: 91, offset: 2.5,
  })) {
    ctx.prop({ kind: 'drainCover', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry });
  }
  for (const t of [0.13, 0.37, 0.61, 0.88]) {
    const a = atStreet(ST, t, { side: WEST, offset: 1.6 });
    if (a) ctx.prop({ kind: 'manhole', x: a.x, z: a.z, y: a.y, rot: a.along });
  }
  {
    const a = atStreet(ST, 0.245, { side: WEST, offset: 3.5 });
    if (a) ctx.prop({ kind: 'vendingMachine', x: a.x, z: a.z, y: a.y, rot: a.across });
    const c = atStreet(ST, 0.755, { side: EAST, offset: 3.4 });
    if (c) ctx.prop({ kind: 'postBox', x: c.x, z: c.z, y: c.y, rot: c.across });
    const d = atStreet(ST, 0.545, { side: WEST, offset: 3.3 });
    if (d) ctx.prop({ kind: 'trafficMirror', x: d.x, z: d.z, y: d.y, rot: d.across });
    const e = atStreet(ST, 0.335, { side: EAST, offset: 3.2 });
    if (e) ctx.prop({ kind: 'bicycleRack', x: e.x, z: e.z, y: e.y, rot: e.across });
    const f = atStreet(ST, 0.815, { side: EAST, offset: 3.2 });
    if (f) ctx.prop({ kind: 'catAsleep', x: f.x, z: f.z, y: f.y, rot: f.along });
  }

  /* 下河原通 -- the incised granite marker at the shrine end. */
  {
    const a = atStreet(ST, 0.035, { side: WEST, offset: 3.6 });
    if (a) {
      b.add(box(0.24, 1.6, 0.24), trs(a.x, a.y + 0.80, a.z, 0, a.across, 0), PAL.stone, { bands: 3, tint: TINT.cool });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.0),
        celTex(verticalSign('下河原通', { board: PAL.stone, textColor: PAL.black, frame: false }), { bands: 3, tint: TINT.cool }));
      s.position.set(a.x, a.y + 1.02, a.z);
      s.rotation.y = a.across;
      s.translateZ(0.13);
      s.userData.noOutline = true;
      ctx.add(s);
    }
  }

  /* ------------------------------------------------------------------ *
   * 6.  Interactables.
   * ------------------------------------------------------------------ */
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hit = (x, y, z, w, h, d, label) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat);
    m.position.set(x, y, z);
    m.visible = false;
    m.userData.noOutline = true;
    ctx.add(m);
    ctx.interact({ hitbox: m, label, action() {} });
    return m;
  };

  if (bunnosuke) {
    hit(bunnosuke.x, bunnosuke.y + 1.7, bunnosuke.z, 3.6, 2.6, 1.4, 'the tea house gate — 甘酒 と わらびもち');
  }
  {
    const a = atStreet(ST, 0.640, { side: EAST, offset: 4.5 });
    if (a) hit(a.x, ctx.groundAt(a.x, a.z) + 1.6, a.z, 3.4, 2.6, 1.3, 'a garden gate');
    const j = atStreet(ST, 0.470, { side: WEST, offset: 4.1 });
    if (j) hit(j.x, ctx.groundAt(j.x, j.z) + 1.0, j.z, 1.4, 1.6, 1.1, 'the roadside Jizo');
    const v = atStreet(ST, 0.245, { side: WEST, offset: 3.3 });
    if (v) hit(v.x, v.y + 1.1, v.z, 1.2, 1.8, 0.9, 'a can of hot coffee');
  }

  return out;
}
