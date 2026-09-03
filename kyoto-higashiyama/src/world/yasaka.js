import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT, cel, celTex } from '../core/toon.js';
import {
  trs, lathe, taperBox, rngKit, lerp, clamp, bake, fbm2, stairs,
} from '../core/util.js';
import {
  make, cached, hex, MINCHO, lanternTex, woodenSign, noticeBoard,
} from '../core/textures.js';
import { irimoyaRoof, shedRoof, rafters } from '../kit/roof.js';
import {
  makeTorii, makeRomon, makeMaiden, makeHonden,
  makeStoneLantern, makeWoodLantern, makeTemizuya, makeEmaRack,
  makeOmikujiStand, makeKomainu, makeTamagaki, makeShrineSteps,
  makeChozu, makeSubShrine, SPEC,
} from '../kit/shrine.js';

/* ------------------------------------------------------------------ *
 * 八坂神社 -- the Yasaka Shrine precinct.
 *
 * ------------------------------------------------- THE GEOGRAPHIC FACT
 *
 * **本殿, 舞殿, 南楼門 and the 石鳥居 stand on one straight north-south axis
 * (x = -60 .. -68).  The famous vermilion 西楼門 is NOT on it.**  It is a side
 * entrance 92 m west and 39 m north of the Maiden at (-157.3, -575.2), facing
 * WEST down Shijo-dori, and putting it on the axis is the commonest error in
 * reconstructions of this shrine.  Every coordinate here comes from `LANDMARK`
 * in route.js; nothing in this file invents one.
 *
 * The formal main entrance (正門) is the stone torii on Shimogawara-dori, and
 * before Meiji the South Romon was the main gate.  So the composition is a long
 * ceremonial approach from the south and a busy side door from the city in the
 * west, and they meet at the Maiden.
 *
 * ----------------------------------------------------------- THE GROUND
 *
 * The precinct climbs west to east -- 44.3 m under the west gate, 49.7 at the
 * Maiden, 50.8 at the South Romon, 51.2 at the stone torii -- and it does not
 * climb evenly, so there is no single flat precinct floor to be had.  Two
 * pieces of made ground are registered, and **both are drawn**: the visible
 * terrain mesh is baked before any district runs, so a platform nobody builds a
 * deck for is an invisible ledge.
 *
 *   1. 祇園石段下 -- the terrace at the head of the Shijo steps
 *   2. the 本殿 terrace, which is a genuine ~2 m of fill on its north side
 *
 * Everything else sits on the corridor ground.  The 白川砂 gravel of the two
 * approaches comes from the street layer; the rest of the precinct floor is an
 * apron laid here, because a shrine standing on lawn is the fastest way to make
 * it read as a park.
 *
 * --------------------------------------------------------- THE MATERIAL
 *
 * 朱 `PAL.vermilion` with `TINT.warmDeep` -- never the violet default, which
 * turns lacquer purple, and never `PAL.bengara`, which is Gion's and half the
 * chroma.  The West Romon is 切妻造・本瓦葺 (GABLED, silver-grey TILE) with
 * 緑青 GREEN lattice; the Honden is not painted at all -- bare timber under
 * 1,320 m2 of cypress bark.
 * ------------------------------------------------------------------ */

export const id = 'yasaka';

const BAKER = 'yasaka';

/* Shading signatures, matching the shrine kit's so the two merge into the same
 * buckets rather than doubling the mesh count. */
const O = {
  verm:    { bands: 3, tint: TINT.warmDeep },
  timber:  { bands: 3, tint: TINT.warm },
  deep:    { bands: 'deep', tint: TINT.warm },
  stone:   { bands: 3, tint: TINT.cool },
  plaster: { bands: 'soft3', tint: TINT.cool },
  gravel:  { bands: 'soft3', tint: TINT.cool },
  metal:   { bands: 4, tint: TINT.cool, flat: false },
};

/* ------------------------------------------------------------------ *
 * A local parts bag -- the shrine kit's convention, for the four things the
 * kit does not build: the ema hall, the mikoshi store, the 透塀 and the bell.
 *
 * Everything is modelled in a local frame whose origin is on the ground at the
 * object's centre with **local -Z the front**, and flushed through one matrix.
 * One rotation per object is the whole point: assemblies positioned in world
 * space are where the sign errors live.
 * ------------------------------------------------------------------ */
function bag() {
  const list = [];
  const api = {
    add(geometry, color, opts) { list.push({ geometry, color, opts }); return api; },
    push(arr) { if (arr) for (const p of arr) list.push(p); return api; },
    /** A box with its origin at the centre of its base. */
    box(w, h, d, x, y, z, color, opts, ry = 0) {
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(0, h / 2, 0);
      if (ry) g.rotateY(ry);
      g.translate(x, y, z);
      return api.add(g, color, opts);
    },
    /** A box centred on itself -- beams and rails. */
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

/** Local (lx, lz) -> world for a frame rotated `ry` about (x, z). */
function toWorld(x, z, ry, lx, lz) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return { x: x + lx * c + lz * s, z: z - lx * s + lz * c };
}

/** Rotate a `parts` array in place (roof.js lays its runs out along X). */
function rotParts(parts, ry, dx = 0, dz = 0) {
  const m = trs(dx, 0, dz, 0, ry, 0);
  for (const p of parts) p.geometry.applyMatrix4(m);
  return parts;
}

/** Seat a footprint on its LOWEST corner; the plinth makes up the difference. */
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
 * Made ground, drawn.
 *
 * `ctx.platform` moves the height field, but the visible terrain mesh was
 * baked before this module ran, so a platform on its own is an invisible
 * ledge.  Every one registered here is paired with a `terrace()`: a deck plus
 * a battered 石垣 skirt sampled against the real ground along each edge, which
 * is what a Kyoto retaining wall is and what makes the level change read.
 * ------------------------------------------------------------------ */
function retainingEdge(ctx, baker, ax, az, bx, bz, top, opts = {}) {
  const { batter = 0.11, color = PAL.stoneWall, coping = true, minShow = 0.10 } = opts;
  const len = Math.hypot(bx - ax, bz - az);
  const n = Math.max(2, Math.round(len / 2.2));
  const tx = (bx - ax) / len, tz = (bz - az) / len;
  const ox = opts.ox ?? -tz, oz = opts.oz ?? tx;
  const pos = [], idx = [];
  let maxH = 0;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = lerp(ax, bx, t), pz = lerp(az, bz, t);
    const g = ctx.groundAt(px + ox * 1.1, pz + oz * 1.1) - 0.45;
    const h = Math.max(minShow, top - g);
    if (h > maxH) maxH = h;
    pos.push(px + ox * 0.06, top, pz + oz * 0.06);
    pos.push(px + ox * (0.06 + batter * h), top - h, pz + oz * (0.06 + batter * h));
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  baker.add(g, null, color, O.stone);

  /* The coping.  A 石垣 without one reads as a cliff: the flat capping course
   * is the line that says somebody built it. */
  if (coping) {
    const cg = new THREE.BoxGeometry(len, 0.20, 0.44);
    cg.rotateY(Math.atan2(tx, tz) + Math.PI / 2);
    cg.translate((ax + bx) / 2 + ox * 0.10, top + 0.06, (az + bz) / 2 + oz * 0.10);
    baker.add(cg, null, PAL.paving, O.stone);
  }
  return maxH;
}

/** A rectangle of made ground: the deck, its skirt, and its collision. */
function terrace(ctx, baker, { x0, z0, x1, z1, top, surface = PAL.gravel, open = [], batter = 0.11 }) {
  /* The deck stops 0.05 m short of the nominal top.  The `terrain()` hook has
   * usually already raised the drawn hillside to exactly `top`, and two
   * coplanar surfaces 40 m across is a z-fight the size of the precinct; where
   * the hook has not run, the gravel apron covers the same 0.05 m. */
  const deck = new THREE.BoxGeometry(x1 - x0, 0.6, z1 - z0);
  deck.translate((x0 + x1) / 2, top - 0.35, (z0 + z1) / 2);
  baker.add(deck, null, surface, O.gravel);

  const edges = {
    north: [x0, z0, x1, z0, 0, -1],
    south: [x1, z1, x0, z1, 0, 1],
    west: [x0, z1, x0, z0, -1, 0],
    east: [x1, z0, x1, z1, 1, 0],
  };
  for (const [name, e] of Object.entries(edges)) {
    if (open.includes(name)) continue;
    const h = retainingEdge(ctx, baker, e[0], e[1], e[2], e[3], top, { ox: e[4], oz: e[5], batter });
    /* Anything you could fall off gets a collider; a 0.4 m step does not, or
     * the precinct would be fenced against its own kerbs. */
    if (h > 0.9) {
      if (name === 'north') ctx.collide(x0, z0 - 0.5, x1, z0 + 0.15, top);
      if (name === 'south') ctx.collide(x0, z1 - 0.15, x1, z1 + 0.5, top);
      if (name === 'west') ctx.collide(x0 - 0.5, z0, x0 + 0.15, z1, top);
      if (name === 'east') ctx.collide(x1 - 0.15, z0, x1 + 0.5, z1, top);
    }
  }
}

/* ------------------------------------------------------------------ *
 * 白川砂 -- the precinct floor.
 *
 * The two approaches are gravel corridors and the street layer paves them, but
 * the twelve thousand square metres between them are bare hillside, which
 * renders as lawn.  Yasaka's precinct is raked pale gravel almost wall to wall,
 * and that bright field under dark trees is most of what the place looks like,
 * so it is laid here: one grid of quads following `groundAt`, skipping anything
 * already paved and anything too steep to be precinct.
 * ------------------------------------------------------------------ */
function gravelApron(ctx, baker, { x0, z0, x1, z1, cell = 3.0, lift = 0.05, skip }) {
  const nx = Math.round((x1 - x0) / cell), nz = Math.round((z1 - z0) / cell);
  const paved = (x, z) => {
    const s = ctx.surfaceAt(x, z);
    return !!s && s.dist < s.half + 0.4;
  };
  let quads = 0;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const ax = x0 + i * cell, az = z0 + j * cell;
      const bx = ax + cell, bz = az + cell;
      const cx = ax + cell / 2, cz = az + cell / 2;
      if (skip && skip(cx, cz)) continue;
      if (paved(ax, az) || paved(bx, az) || paved(ax, bz) || paved(bx, bz) || paved(cx, cz)) continue;
      if (ctx.slopeAt(cx, cz) > 15) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([
        ax, ctx.groundAt(ax, az) + lift, az,
        bx, ctx.groundAt(bx, az) + lift, az,
        bx, ctx.groundAt(bx, bz) + lift, bz,
        ax, ctx.groundAt(ax, bz) + lift, bz,
      ], 3));
      g.setIndex([0, 2, 1, 0, 3, 2]);
      g.computeVertexNormals();
      /* 白川砂 is not one flat tone: it is raked, and it silts darker where it
       * is walked.  Three stops rather than one, and the middle of them is
       * `PAL.paving` -- warm tan on its own reads as beach sand against the
       * cool grey of the paved corridor it runs up to. */
      const m = fbm2(cx * 0.05, cz * 0.05, 2, 9);
      const tone = m > 0.58 ? PAL.gravel : m > 0.34 ? PAL.paving : PAL.gravelDark;
      baker.add(g, null, tone, O.gravel);
      quads++;
    }
  }
  return quads;
}

/* ------------------------------------------------------------------ *
 * 提灯 -- the Maiden's lanterns.
 *
 * About 250 of them and the single most identifiable thing in the precinct, so
 * they are one geometry, three textures, three InstancedMeshes -- three draw
 * calls for the lot.
 *
 * Three textures rather than the kit's one because the real lanterns carry
 * **donor names, not 「奉納」**: the shrine uses that word to describe them, it
 * is not what is printed on the face (STREET.md s2.5b, which also declines to
 * name a real donor, so these follow the 花街 naming pattern -- a stem plus
 * 屋/亭/家 -- and are not a claim about anybody).
 *
 * The body is a cylinder whose rings are pinched toward the collars, which
 * keeps CylinderGeometry's clean cylindrical uv; a LatheGeometry's v runs on
 * point index and smears the black hoops into the paper.
 * ------------------------------------------------------------------ */
function lanternGeo(h, r, radial = 10, rings = 4) {
  const g = new THREE.CylinderGeometry(r, r, h, radial, rings, false);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = clamp((p.getY(i) + h / 2) / h, 0, 1);
    const k = 0.34 + 0.66 * Math.pow(Math.sin(Math.PI * v), 0.5);
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  g.translate(0, -h / 2, 0);          // origin at the top: they hang
  return g;
}

const DONORS = ['井筒屋', '中村亭', '松乃家'];

function lanternBatches(ctx, name, placements, { h, d, seed = 1 }) {
  const geo = lanternGeo(h, d / 2, 10, 4);
  const rng = rngKit(seed);
  const mats = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const col = new THREE.Color();

  DONORS.forEach((text, gi) => {
    const list = placements.filter((_, i) => i % DONORS.length === gi);
    if (!list.length) return;
    const tex = cached('yasakaLantern:' + text, () => lanternTex(text, {
      paper: PAL.paper, textColor: PAL.black, band: PAL.lanternRed, ribs: 13,
    }));
    /* Its own material, not the shared celTex cache: this batch has to glow at
     * dusk without lighting every sheet of paper in Higashiyama. */
    /* A small CONSTANT emissive, boosted at dusk.  The constant part is not
     * decoration: the shot harness sets the time and renders in the same tick,
     * so an update-driven glow has not run yet when a dusk frame is captured,
     * and the row comes out grey in the one image it matters most in. */
    const mat = cel({
      map: tex, bands: 'soft3', tint: TINT.cool, flat: false, cache: false,
      emissive: PAL.paperLit, emissiveIntensity: 0.32,
    });
    mats.push(mat);
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    mesh.name = name + ':' + gi;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      e.set(0, p.ry || 0, 0, 'YXZ');
      q.setFromEuler(e);
      v.set(p.x, p.y, p.z);
      sc.setScalar(p.s ?? 1);
      m.compose(v, q, sc);
      mesh.setMatrixAt(i, m);
      const k = rng.next();
      col.set(PAL.paper).offsetHSL(0, 0, (k - 0.5) * 0.05).multiplyScalar(0.97 + k * 0.06);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.userData.noOutline = true;
    ctx.add(mesh);
  });
  return { mats, count: placements.length };
}

/* ------------------------------------------------------------------ *
 * The sub-shrine nameplate atlas.
 *
 * Yasaka has a dozen 摂末社 and each carries a gold-on-black 社号額.  Twelve
 * textures would be twelve materials and twelve draw calls for a few hundred
 * triangles, so they share one atlas and merge into a single mesh.
 * ------------------------------------------------------------------ */
const PLATE_COLS = 2, PLATE_ROWS = 6;

function plateAtlas(names) {
  return cached('yasakaPlates', () => make(512, 768, (c, W, H) => {
    const cw = W / PLATE_COLS, ch = H / PLATE_ROWS;
    for (let i = 0; i < PLATE_COLS * PLATE_ROWS; i++) {
      const cx = (i % PLATE_COLS) * cw, cy = Math.floor(i / PLATE_COLS) * ch;
      c.fillStyle = hex(PAL.vermilionDeep);
      c.fillRect(cx, cy, cw, ch);
      c.fillStyle = hex(0x241d18);
      c.fillRect(cx + 8, cy + 7, cw - 16, ch - 14);
      const t = names[i] || '';
      if (!t) continue;
      const chars = [...t];
      const size = Math.min(ch * 0.50, ((cw - 34) / chars.length) * 1.02);
      c.font = `bold ${size}px ${MINCHO}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = hex(PAL.gold);
      const step = (cw - 30) / chars.length;
      let x = cx + cw / 2 - (step * (chars.length - 1)) / 2;
      for (const g of chars) { c.fillText(g, x, cy + ch / 2); x += step; }
    }
  }));
}

/** A plate plane with its uv pushed into cell `i` of the atlas. */
function plateGeo(w, h, i) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  const col = i % PLATE_COLS, row = Math.floor(i / PLATE_COLS);
  for (let k = 0; k < uv.count; k++) {
    uv.setXY(k,
      (col + uv.getX(k)) / PLATE_COLS,
      (PLATE_ROWS - row - 1 + uv.getY(k)) / PLATE_ROWS);
  }
  uv.needsUpdate = true;
  return g;
}

/* ------------------------------------------------------------------ *
 * 絵馬堂 -- the ema hall (1744, moved here 1925).
 *
 * 「桁行七間、梁間二間、入母屋造、北面下屋付、桟瓦葺」.  25.4 x 9.1 m is the
 * ROOF outline, so with a 1.9 m eave the structure is 21.6 x 5.3 m -- 七間 at
 * 3.09 and 二間 at 2.65.  It is OPEN-SIDED: no walls at all, just the posts,
 * the great painted votive boards hung high in the frame, and daylight
 * straight through it.
 * ------------------------------------------------------------------ */
function emado(ctx, o) {
  const { x, z, ry = 0 } = o;
  const W = 21.6, D = 5.3, eave = 1.9;
  const st = seat(ctx, x, z, W + eave * 2, D + eave * 2, ry);
  const y = o.y ?? st.lo;
  const b = bag();
  const base = Math.max(0.42, st.rise + 0.30);
  const postH = 3.3;

  b.add(taperBox(W + 2.2, D + 2.2, base - 0.10, 0.985, 0.985), PAL.stoneWall, O.stone);
  b.bar(W + 2.5, 0.10, D + 2.5, 0, base - 0.05, 0, PAL.paving, O.stone);

  const gx = [], gz = [-D / 2, 0, D / 2];
  for (let i = 0; i <= 7; i++) gx.push(-W / 2 + (i / 7) * W);
  for (const cx of gx) {
    for (const cz of gz) {
      b.lathe([[0.28, 0], [0.29, 0.06], [0.23, 0.16]], 8, cx, base, cz, PAL.stoneDark, O.stone);
      b.cyl(0.185, 0.175, postH, cx, base + 0.16, cz, 10, PAL.timberMid, O.timber);
    }
  }
  const headY = base + 0.16 + postH;
  for (const cz of gz) b.bar(W + 0.5, 0.24, 0.20, 0, headY, cz, PAL.timberDark, O.timber);
  for (const cx of [gx[0], gx[7]]) b.bar(0.20, 0.24, D + 0.5, cx, headY, 0, PAL.timberDark, O.timber);
  b.bar(W + 0.8, 0.13, D + 0.8, 0, headY + 0.18, 0, PAL.timberDark, O.timber);

  /* The 大絵馬 -- the big painted boards, which is what the hall is FOR.  They
   * hang in the upper frame between the posts on both long faces. */
  for (let i = 0; i < 7; i++) {
    const cx = (gx[i] + gx[i + 1]) / 2;
    for (const [cz, s] of [[-D / 2, 1], [D / 2, -1]]) {
      b.bar(2.35, 1.30, 0.09, cx, headY - 0.95, cz + s * 0.14, PAL.timberDark, O.timber);
      b.bar(2.10, 1.08, 0.05, cx, headY - 0.95, cz + s * 0.20, PAL.plasterOchre, O.plaster);
    }
  }
  b.push(rafters({ w: W + eave, depth: eave + 0.2, y: headY + 0.28, z: D / 2, double: true, pitch: 0.32 }));
  b.push(rotParts(rafters({ w: W + eave, depth: eave + 0.2, y: headY + 0.28, z: D / 2, double: true, pitch: 0.32 }), Math.PI));

  const eaveY = headY + 0.42;
  b.push(irimoyaRoof({
    w: W, d: D, pitch: 0.48, eave, material: 'tile',
    sori: 0.08, cornerLift: 0.55, ridgeCourses: 5, gableFrac: 0.30, y: eaveY, gableFace: 'x',
  }).parts);
  // 北面下屋 -- the lean-to on the back, which the designation calls out
  const sw = shedRoof({ w: W * 0.86, d: 2.1, pitch: 0.34, material: 'tile', mukuri: 0.02, y: eaveY - 0.80, ridgeCourses: 2 });
  for (const p of sw.parts) p.geometry.translate(0, 0, D / 2 + 0.4);
  b.push(sw.parts);

  /* Collide the two end masses of posts and leave the middle open: it is a
   * hall, and the whole point of it is that you can walk through. */
  for (const sx of [-1, 1]) {
    const p = toWorld(x, z, ry, sx * (W / 2 - 1.2), 0);
    ctx.collideRot(p.x, p.z, 2.6, D + 0.8, ry, y + base + 0.2);
  }
  b.flush(ctx.baker(o.baker || BAKER), x, y, z, ry);
  return { x, y, z, ry, w: W, d: D, base: y + base, eaveY: y + eaveY };
}

/* ------------------------------------------------------------------ *
 * 神輿庫 -- the portable-shrine store (1928, reinforced concrete).
 *
 * 「桁行10.7 m、梁間7.3 m、鉄筋コンクリート造、入母屋造、本瓦葺、正面庇付」.
 * A closed, heavy, plastered box under a formal tile roof: the one building in
 * the precinct that is deliberately blank, and useful for exactly that -- the
 * east side needs a solid mass to sit against.
 * ------------------------------------------------------------------ */
function mikoshiko(ctx, o) {
  const { x, z, ry = 0 } = o;
  const W = 10.7, D = 7.3, eave = 2.4;
  const st = seat(ctx, x, z, W + eave * 2, D + eave * 2, ry);
  const y = o.y ?? st.lo;
  const b = bag();
  const base = Math.max(0.55, st.rise + 0.35);
  const wallH = 4.4;

  b.add(taperBox(W + 1.6, D + 1.6, base - 0.10, 0.985, 0.985), PAL.stoneWall, O.stone);
  b.bar(W + 1.9, 0.10, D + 1.9, 0, base - 0.05, 0, PAL.paving, O.stone);
  b.box(W, wallH, D, 0, base, 0, PAL.gatePanel, O.plaster);
  b.bar(W + 0.24, 0.55, D + 0.24, 0, base + 0.27, 0, PAL.plasterGrey, O.plaster);
  for (let i = 0; i <= 4; i++) {
    const px = -W / 2 + (i / 4) * W;
    for (const [cz, s] of [[-D / 2, 1], [D / 2, -1]]) {
      b.box(0.34, wallH - 0.5, 0.16, px, base + 0.5, cz - s * 0.08, PAL.plasterGrey, O.plaster);
    }
  }
  // the great pair of doors, built outward into a real reveal
  b.box(4.0, 3.2, 0.34, 0, base + 0.2, -D / 2 + 0.17, PAL.shopInterior, O.deep);
  for (const sx of [-1, 1]) {
    b.box(1.86, 3.05, 0.10, sx * 0.97, base + 0.2, -D / 2 - 0.03, PAL.timberDark, O.timber);
    for (let r = 0; r < 5; r++) {
      for (let c2 = 0; c2 < 2; c2++) {
        b.cyl(0.045, 0.045, 0.04, sx * 0.97 + (c2 - 0.5) * 1.0, base + 0.5 + r * 0.6, -D / 2 - 0.09, 6, PAL.iron, O.metal);
      }
    }
  }
  b.bar(4.6, 0.42, 0.42, 0, base + 3.55, -D / 2 + 0.05, PAL.timberDark, O.timber);

  const eaveY = base + wallH;
  const rf = (w2, z2) => rafters({ w: w2, depth: eave + 0.2, y: eaveY - 0.12, z: z2, double: true, pitch: 0.32 });
  b.push(rf(W + eave, D / 2));
  b.push(rotParts(rf(W + eave, D / 2), Math.PI));
  b.push(rotParts(rf(D + eave, W / 2), Math.PI / 2));
  b.push(rotParts(rf(D + eave, W / 2), -Math.PI / 2));
  b.push(irimoyaRoof({
    w: W, d: D, pitch: 0.50, eave, material: 'tile',
    sori: 0.09, cornerLift: 0.6, ridgeCourses: 6, gableFrac: 0.36, y: eaveY, gableFace: 'x',
  }).parts);
  // 正面庇, 桟瓦葺 -- a lower pent over the doors
  const hs = shedRoof({ w: 6.2, d: 1.5, pitch: 0.30, material: 'tile', mukuri: 0.03, y: base + 3.9, ry: Math.PI, ridgeCourses: 1 });
  for (const p of hs.parts) p.geometry.translate(0, 0, -D / 2 - 0.55);
  b.push(hs.parts);

  ctx.collideRot(x, z, W + 0.4, D + 0.4, ry);
  b.flush(ctx.baker(o.baker || BAKER), x, y, z, ry);
  return { x, y, z, ry, eaveY: y + eaveY };
}

/* ------------------------------------------------------------------ *
 * 透塀 -- the "see-through fence" round the Honden (檜皮葺, 二三間).
 *
 * The name is literal: a cypress-bark-capped wall whose middle band is open
 * 連子 lattice, so the inner precinct is screened but not hidden.  It carries a
 * 潜門 on the axis, and that gap has to be genuinely walkable -- the walker's
 * radius is added to every collider, so a nominal 1.6 m doorway is a wall.
 * ------------------------------------------------------------------ */
function sukashibei(ctx, baker, { x0, x1, z, y, gap = [0, 0] }) {
  const b = bag();
  const H = 2.35, pitch = 2.0;
  const n = Math.max(2, Math.round((x1 - x0) / pitch));
  const inGap = (px) => px > gap[0] && px < gap[1];
  for (let i = 0; i <= n; i++) {
    const px = lerp(x0, x1, i / n);
    if (inGap(px)) continue;
    b.lathe([[0.16, 0], [0.17, 0.05], [0.13, 0.13]], 8, px, 0, z, PAL.stoneDark, O.stone);
    b.cyl(0.105, 0.10, H, px, 0.10, z, 8, PAL.timberMid, O.timber);
  }
  for (let i = 0; i < n; i++) {
    const a = lerp(x0, x1, i / n), c = lerp(x0, x1, (i + 1) / n);
    const mid = (a + c) / 2, len = c - a;
    if (inGap(mid)) continue;
    b.bar(len, 0.10, 0.20, mid, 0.36, z, PAL.stoneDark, O.stone);
    b.bar(len, 0.62, 0.11, mid, 0.76, z, PAL.gatePanel, O.plaster);
    b.bar(len, 0.09, 0.14, mid, 1.10, z, PAL.timberDark, O.timber);
    // 連子 -- vertical battens over a dark void, which is the whole point
    b.bar(len, 0.70, 0.05, mid, 1.52, z + 0.05, PAL.shopInterior, O.deep);
    const nb = Math.max(4, Math.round(len / 0.17));
    for (let k = 0; k <= nb; k++) {
      b.bar(0.045, 0.70, 0.06, lerp(a + 0.06, c - 0.06, k / nb), 1.52, z - 0.02, PAL.timberDark, O.timber);
    }
    b.bar(len, 0.11, 0.20, mid, 1.93, z, PAL.timberDark, O.timber);
    for (const s of [-1, 1]) {
      const r = shedRoof({
        w: len + 0.06, d: 0.34, pitch: 0.42, material: 'hiwada',
        mukuri: 0.03, y: H - 0.35, ry: s > 0 ? Math.PI : 0, ridgeCourses: 0,
      });
      for (const p of r.parts) p.geometry.translate(mid, 0, z + s * 0.17);
      b.push(r.parts);
    }
    ctx.collide(a, z - 0.35, c, z + 0.35);
  }
  b.flush(baker, 0, y, 0, 0);
}

/* ------------------------------------------------------------------ *
 * Reshaping the ground.
 *
 * Two pieces of made ground, and they are registered from the `terrain()` hook
 * so the DRAWN hillside is raised as well as the height field.  Registering
 * them from `build()` instead is not merely untidy: the ground mesh is
 * generated before the districts run, so the player would walk two metres above
 * a hillside that never heard about it.
 *
 * `shapeGround` is idempotent per world, so the module still works if the hook
 * is not called at all -- in which case `build()` registers the same platforms
 * and the drawn terrace geometry carries the level change on its own.
 * ------------------------------------------------------------------ */

/* 本殿 terrace.  The ground falls ~2 m away to the north behind the Honden: the
 * hall stands on genuine made ground, and the 石垣 holding it up is a real and
 * visible part of the precinct. */
const HT = { x0: -84, z0: -586, x1: -38, z1: -544.5, top: 49.85 };
/* 祇園石段下 -- the terrace at the head of the Shijo steps, and the flight. */
const TER = { x0: -161.2, z0: -585.0, x1: -148.0, z1: -565.0 };
const GATE_PODIUM = 1.45;
const STEP_FOOT_X = -168.4, STEP_Z = -575.2, STEP_W = 16.0, STEP_RISE = 0.145;

let _shaped = null;          // the ctx whose ground has been shaped
let _byHook = false;         // ...and whether the hook did it

function shapeGround(ctx) {
  if (_shaped === ctx) return _shaped.__yasakaGround;
  ctx.platform({ ...HT, step: 0.44 });

  /* The gate's seat, taken from the RAW ground before anything raises it, so
   * `makeRomon` can be handed the same `y` later and not seat itself on the
   * terrace it is supposed to be standing on. */
  let lo = Infinity;
  const S = SPEC.westRomon;
  for (const dx of [-S.d / 2 - 0.7, 0, S.d / 2 + 0.7]) {
    for (const dz of [-S.w / 2 - 0.7, 0, S.w / 2 + 0.7]) {
      lo = Math.min(lo, ctx.groundAt(-157.3 + dx, -575.2 + dz));
    }
  }
  const top = lo + GATE_PODIUM;
  ctx.platform({ ...TER, top, step: 0.5 });

  const foot = ctx.groundAt(STEP_FOOT_X, STEP_Z);
  const f = stairs(STEP_FOOT_X, foot, STEP_Z, TER.x0 + 0.1, top, STEP_Z, STEP_W, STEP_RISE);
  for (const t of f.treads) {
    ctx.platform({
      x0: t.x - t.hd, x1: t.x + t.hd,
      z0: t.z - t.hw, z1: t.z + t.hw,
      top: t.y, step: STEP_RISE + 0.30,
    });
  }
  const g = { gateY: lo, gateTop: top, foot };
  _shaped = ctx;
  ctx.__yasakaGround = g;
  return g;
}

/** Called by `buildWorld` before the ground mesh is generated. */
export function terrain(ctx) {
  _byHook = true;
  shapeGround(ctx);
}

/* ------------------------------------------------------------------ *
 * The build.
 * ------------------------------------------------------------------ */
export function build(ctx) {
  const rng = rngKit(84021);
  const b = ctx.baker(BAKER);
  const L = ctx.LANDMARK;
  const out = { structures: [], lanterns: 0, ema: 0, omikuji: 0, stoneLanterns: 0 };
  const lanternMats = [];

  const hotspot = (x, y, z, w, h, d, label, action) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
    m.position.set(x, y, z);
    m.visible = false;
    m.name = 'hot.' + label.replace(/\s+/g, '-');
    ctx.add(m);
    return ctx.interact({ hitbox: m, label, action });
  };

  /* ================================================================ *
   * 1.  MADE GROUND -- see `shapeGround` above.  Idempotent: if the
   *     terrain hook already ran, this is a no-op and returns its numbers.
   * ================================================================ */
  const G = shapeGround(ctx);
  const gateTop = G.gateTop;

  /* ================================================================ *
   * 2.  西楼門 -- the side door, and 祇園石段下 under it
   * ================================================================ */

  /* 切妻造・本瓦葺, 1497.  GABLED and TILED -- not hip-and-gable, not bark, so
   * the gate reads vermilion against silver-grey; and its lattice is 緑青
   * GREEN (SPEC.westRomon.lattice), the detail almost every reconstruction of
   * this building gets wrong.  ry = pi/2 faces west down the 22 m Shijo
   * corridor: the axial view everybody photographs. */
  const west = makeRomon(ctx, {
    kind: 'west', x: L.yasakaWestGate.x, z: L.yasakaWestGate.z,
    /* `y` explicitly, because the terrace it stands on is already in the height
     * field by now and letting it seat itself would put it 1.45 m too high. */
    y: G.gateY, ry: Math.PI / 2, podium: GATE_PODIUM, baker: BAKER,
    spec: { wing: { bays: 5, bay: 2.63, depth: 2.60, height: 3.5 } },
  });
  out.structures.push('西楼門');
  ctx.stats.landmarks++;

  terrace(ctx, b, { ...TER, top: gateTop, surface: PAL.paving, open: ['west', 'east'] });

  /* The flight.  ARCH s4.1: about twenty steps, deliberately broad and shallow
   * (rise ~0.15, going ~0.40), the width of the street.  Every tread is
   * registered as a platform by the kit, so the stone you see and the stone you
   * stand on are the same surface by construction. */
  const stepFootX = STEP_FOOT_X;
  const flight = makeShrineSteps(ctx, {
    x0: stepFootX, z0: STEP_Z, y0: G.foot,
    x1: TER.x0 + 0.1, z1: STEP_Z, y1: gateTop,
    width: STEP_W, rise: STEP_RISE, cheekH: 0.72,
    platform: !_byHook, baker: BAKER,
  });

  /* 社号標 -- the granite pillar at the foot of the steps.  「官幣大社」 is the
   * pre-war shrine rank and it is still carved on the old post. */
  {
    const sx = stepFootX + 0.2, sz = -585.2;
    const sy = ctx.groundAt(sx, sz);
    const sb = bag();
    sb.add(taperBox(0.78, 0.78, 0.32, 0.92), PAL.stoneDark, O.stone);
    const shaft = taperBox(0.46, 0.46, 3.00, 0.96);
    shaft.translate(0, 0.32, 0);
    sb.add(shaft, PAL.stone, O.stone);
    const cap = taperBox(0.50, 0.50, 0.16, 0.62);
    cap.translate(0, 3.32, 0);
    sb.add(cap, PAL.stone, O.stone);
    sb.flush(b, sx, sy, sz, 0);
    ctx.collide(sx - 0.5, sz - 0.5, sx + 0.5, sz + 0.5);
    const tex = cached('yasakaShago', () => woodenSign('官幣大社　八坂神社', {
      board: PAL.stone, textColor: 0x3a332c, w: 128, h: 512, vertical: true,
    }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.40, 2.6), celTex(tex, { bands: 3, tint: TINT.cool }));
    m.position.set(sx - 0.235, sy + 1.80, sz);
    m.rotation.y = -Math.PI / 2;
    m.userData.noOutline = true;
    ctx.add(m);
    hotspot(sx + 1.2, sy + 1.5, sz, 1.8, 2.4, 1.8,
      'read the shrine post', (audio) => audio?.knock?.(230, 0.14, 0.18));
  }

  /* ================================================================ *
   * 3.  舞殿 -- the Maiden, and its lanterns
   * ================================================================ */

  /* 桁行三間、梁間三間、入母屋造、銅板葺 (1903).  ry = pi puts its 木階 on the
   * south face, looking down the axis at the South Romon.  The patinated copper
   * is the one cool-green mass in a precinct otherwise made of vermilion, grey
   * tile and brown bark.
   *
   * `tiers: 0` because the lanterns are built below instead of by the kit: the
   * real ones carry donor names, and one shared texture letters all 240 the
   * same. */
  const maiden = makeMaiden(ctx, {
    x: L.yasakaMaiden.x, z: L.yasakaMaiden.z, ry: Math.PI,
    /* SPEC's own 0.50, not the kit's 0.70 default: at 0.70 the ridge lands at
     * 10.3 m, over the 8.5-9.5 m band ARCH s4.4 argues for after rejecting the
     * copy-error "14 m". */
    pitch: SPEC.maiden.pitch,
    baker: BAKER, tiers: 0, autoLight: false,
  });
  out.structures.push('舞殿');
  ctx.stats.landmarks++;

  {
    const S = SPEC.maiden;
    const lan = { d: 0.33, h: 0.58 };
    const hx = S.wall / 2 + S.eave * 0.86;
    const hz = S.deep / 2 + S.eave * 0.86;
    const spacing = 0.40;
    /* Everything here is in the Maiden's LOCAL frame.  `maiden.eaveY` comes
     * back in WORLD space, so the seat height has to come off it before it is
     * used as a local offset -- add it twice and the whole row ends up fifty
     * metres in the air, which is exactly what the first render showed. */
    const eaveLocal = maiden.eaveY - maiden.y;
    const placements = [];
    const lrng = rngKit(5501);
    const mb = bag();
    for (let t = 0; t < 2; t++) {
      const top = eaveLocal - 0.52 - t * (lan.h + 0.18);
      mb.bar(hx * 2 + 0.16, 0.08, 0.08, 0, top + 0.10, -hz, PAL.timberDark, O.timber);
      mb.bar(hx * 2 + 0.16, 0.08, 0.08, 0, top + 0.10, hz, PAL.timberDark, O.timber);
      mb.bar(0.08, 0.08, hz * 2, -hx, top + 0.10, 0, PAL.timberDark, O.timber);
      mb.bar(0.08, 0.08, hz * 2, hx, top + 0.10, 0, PAL.timberDark, O.timber);
      const sides = [
        [[-hx, -hz], [hx, -hz]], [[-hx, hz], [hx, hz]],
        [[-hx, -hz], [-hx, hz]], [[hx, -hz], [hx, hz]],
      ];
      for (const [a, c] of sides) {
        const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
        const n = Math.max(2, Math.round(len / spacing));
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) / n;
          const p = toWorld(maiden.x, maiden.z, maiden.ry,
            lerp(a[0], c[0], u), lerp(a[1], c[1], u));
          placements.push({
            x: p.x, y: maiden.y + top, z: p.z,
            ry: maiden.ry + lrng.range(-0.09, 0.09),
            s: 1 + lrng.range(-0.025, 0.025),
          });
        }
      }
    }
    mb.flush(b, maiden.x, maiden.y, maiden.z, maiden.ry);
    const batch = lanternBatches(ctx, 'maiden-lanterns', placements, { h: lan.h, d: lan.d, seed: 7717 });
    lanternMats.push(...batch.mats);
    out.lanterns = batch.count;

    /* At dusk they light.  A handful become real point lights: two hundred and
     * forty would bring the renderer down, and eight round the eaves carry the
     * glow while the emissive paper does the rest. */
    for (let i = 0; i < 8; i++) {
      const p = placements[Math.floor((i + 0.5) * placements.length / 8)];
      ctx.light({ x: p.x, y: p.y - 0.3, z: p.z, color: PAL.lanternLit, intensity: 0.6, distance: 12 });
    }
  }

  /* ================================================================ *
   * 4.  本殿 -- the National Treasure, on its terrace
   * ================================================================ */

  terrace(ctx, b, { ...HT, surface: PAL.gravel });
  makeShrineSteps(ctx, {
    x0: -61, z0: HT.z1 + 2.2, y0: ctx.groundAt(-61, HT.z1 + 2.4),
    x1: -61, z1: HT.z1 - 0.4, y1: HT.top,
    width: 6.6, rise: 0.14, cheek: false, baker: BAKER,
  });

  const honden = makeHonden(ctx, {
    x: L.yasakaHonden.x, z: L.yasakaHonden.z, ry: Math.PI, baker: BAKER,
  });
  out.structures.push('本殿');
  ctx.stats.landmarks++;

  /* 透塀 -- 「折曲り延長二三間、潜門一所付、檜皮葺」.  Twenty-three bays of
   * see-through fence across the front of the terrace, with a real opening on
   * the axis wide enough to walk. */
  sukashibei(ctx, b, { x0: -82, x1: -40, z: HT.z1 - 1.1, y: HT.top, gap: [-65.5, -57.5] });

  /* 本坪鈴 -- the great bell on its striped rope at the head of the porch
   * steps, hung clear of the 向拝's roof lip.  The 賽銭箱 below it came with
   * the Honden. */
  const bellPos = toWorld(honden.x, honden.z, honden.ry, 0,
    -(SPEC.honden.deep / 2 + SPEC.honden.kohai.depth - 0.5));
  {
    const bb = bag();
    const hangY = honden.eaveY - 2.30;
    const by = hangY - 0.72;
    bb.cyl(0.045, 0.045, 0.74, 0, by + 0.70, 0, 8, PAL.iron, O.metal);
    bb.lathe([
      [0.40, 0], [0.41, 0.07], [0.38, 0.26], [0.31, 0.46],
      [0.19, 0.60], [0.10, 0.68], [0.045, 0.72],
    ], 14, 0, by, 0, PAL.gateGold, O.metal);
    bb.lathe([[0.40, 0], [0.30, 0.02], [0.30, 0.16], [0.40, 0.14]], 14, 0, by, 0, PAL.timberDark, O.deep);
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      bb.cyl(0.078 - t * 0.018, 0.078 - t * 0.018, 0.34, 0, by - 0.34 * (i + 1), 0, 7,
        i % 2 ? PAL.norenRed : PAL.paper, { bands: 'soft3', tint: TINT.warm });
    }
    bb.flush(b, bellPos.x, 0, bellPos.z, honden.ry);
    hotspot(bellPos.x, honden.floor + 1.0, bellPos.z, 2.4, 2.8, 2.4,
      'ring the bell', (audio) => audio?.suzu?.());
  }
  if (honden.saisenbako) {
    const s = honden.saisenbako;
    hotspot(s.x, s.top + 0.3, s.z, 3.2, 1.8, 2.2,
      'offer a coin', (audio) => audio?.knock?.(280, 0.30, 0.22));
  }

  /* ================================================================ *
   * 5.  南楼門 and 石鳥居 -- the formal approach, on the axis
   * ================================================================ */

  /* 三間一戸楼門、入母屋造、銅板葺 (1879), ~14 m, with its 東西廻廊.  It faces
   * south down Shimogawara-dori; this, not the west gate, is the 表参道. */
  const south = makeRomon(ctx, {
    kind: 'south', x: L.yasakaSouthGate.x, z: L.yasakaSouthGate.z,
    ry: Math.PI, baker: BAKER, plaque: '八坂神社',
  });
  out.structures.push('南楼門');
  ctx.stats.landmarks++;
  makeShrineSteps(ctx, {
    x0: south.x, z0: south.z + 7.6, y0: ctx.groundAt(south.x, south.z + 7.8),
    x1: south.x, z1: south.z + 4.6, y1: south.y + south.podium,
    width: 7.2, rise: 0.15, cheekH: 0.55, baker: BAKER,
  });
  {
    // a big white lantern hung in the gate bay -- 0.8-1.2 m, black characters
    const tex = cached('yasakaGateLantern', () => lanternTex('八坂神社', {
      paper: PAL.paper, textColor: PAL.black, band: PAL.lanternFrame, ribs: 15,
    }));
    const mat = cel({
      map: tex, bands: 'soft3', tint: TINT.cool, flat: false, cache: false,
      emissive: PAL.paperLit, emissiveIntensity: 0.32,
    });
    lanternMats.push(mat);
    const m = new THREE.Mesh(lanternGeo(1.30, 0.50, 12, 5), mat);
    m.position.set(south.x, south.deckTop - 0.55, south.z + 2.4);
    m.rotation.y = Math.PI;
    m.userData.noOutline = true;
    ctx.add(m);
  }

  /* 石造明神鳥居, 1646 -- one of the three great stone torii of Japan (NOT "the
   * largest": a specialist ranking puts it fourth by height).  ry = pi so its
   * 神額 faces south, at the people coming up Shimogawara-dori. */
  const torii = makeTorii(ctx, {
    kind: 'stone', x: L.yasakaStoneTorii.x, z: L.yasakaStoneTorii.z,
    ry: Math.PI, plaque: '祇園社', baker: BAKER,
  });
  out.structures.push('石鳥居');
  ctx.stats.landmarks++;

  /* 阿吽 -- one mouth open, one shut, facing the visitor rather than each
   * other.  A pair at the torii and a pair at the South Romon. */
  for (const [cx, cz] of [[torii.x, torii.z - 4.2], [south.x, south.z + 7.2]]) {
    for (const sx of [-1, 1]) {
      makeKomainu(ctx, {
        x: cx + sx * 5.6, z: cz, ry: Math.PI,
        mouth: sx < 0 ? 'a' : 'un', height: 1.95, baker: BAKER,
      });
    }
  }

  /* ================================================================ *
   * 6.  手水舎 x2, 絵馬堂, 神輿庫
   * ================================================================ */

  /* 南手水舎 (1887) is 入母屋造 and 西手水舎 (1928) is 切妻造.  Two different
   * buildings; copy-pasting one for the other is exactly the error the ICP
   * strings exist to prevent, and the kit keys off `kind`. */
  const tzSouth = makeTemizuya(ctx, { kind: 'south', x: -50.5, z: -509.0, ry: Math.PI * 0.5, baker: BAKER });
    /* NORTH of the west approach, not on it.  The first placement sat squarely
   * in the middle of the 'into the precinct' view and blocked the whole thing;
   * the real 西手水舎 stands off to the left as you come through the gate. */
  const tzWest = makeTemizuya(ctx, { kind: 'west', x: -126.0, z: -577.5, ry: Math.PI * 0.92, baker: BAKER });
  out.structures.push('南手水舎', '西手水舎');
  for (const tz of [tzSouth, tzWest]) {
    hotspot(tz.x, tz.y + 1.05, tz.z, 2.8, 1.8, 2.2,
      'wash your hands', (audio) => audio?.splash?.(0.24));
    /* 手水の作法 -- the etiquette board beside every basin in Japan.  One
     * texture shared by both boards, so both are one material. */
    const tex = cached('temizuSahou', () => noticeBoard(
      ['手水の作法', '一 左手右手の順に清める', '二 左手に水を受け口を清める',
       '三 柄を伝わせ柄杓を清める', '四 元の場所に伏せて置く'],
      { board: 0x3a3028, textColor: PAL.paper, accent: PAL.gold, w: 320, h: 384 }
    ));
    const p = toWorld(tz.x, tz.z, tz.ry, 2.6, -1.8);
    const gy = ctx.groundAt(p.x, p.z);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.62), celTex(tex, { bands: 3, tint: TINT.cool }));
    m.position.set(p.x, gy + 1.30, p.z);
    m.rotation.set(-0.30, tz.ry + Math.PI, 0, 'YXZ');
    m.userData.noOutline = true;
    ctx.add(m);
    const sb = bag();
    for (const sx of [-1, 1]) sb.cyl(0.035, 0.035, 1.05, sx * 0.20, 0, 0, 6, PAL.timberDark, O.timber);
    sb.flush(b, p.x, gy, p.z, tz.ry);
  }

  emado(ctx, { x: -33.0, z: -534.0, ry: Math.PI / 2, baker: BAKER });
  mikoshiko(ctx, { x: -31.0, z: -572.0, ry: Math.PI / 2, baker: BAKER });
  out.structures.push('絵馬堂', '神輿庫');

  /* ================================================================ *
   * 7.  摂末社 -- the sub-shrines
   *
   * Yasaka has more of these than anywhere else on the route and they are half
   * of what makes the precinct read as a walled village rather than as one
   * building.  Names are the shrine's own goshuin list (STREET.md s2.7).
   * 北向蛭子社 faces NORTH, which is its whole identity and the reason it has a
   * name at all.
   * ================================================================ */
  const SUBS = [
    { name: '疫神社', x: -141, z: -584.0, ry: Math.PI * 0.5, w: 2.3, material: 'hiwada' },
    { name: '大神宮社', x: -119, z: -558.5, ry: Math.PI, w: 2.2, material: 'hiwada', chozu: true },
    { name: '悪王子社', x: -105, z: -582.0, ry: Math.PI, w: 2.4, material: 'copper' },
    { name: '大国主社', x: -95.0, z: -524.0, ry: Math.PI / 2, w: 2.6, material: 'copper', komainu: true },
    { name: '北向蛭子社', x: -77.0, z: -512.0, ry: 0, w: 2.6, material: 'tile', komainu: true },
    { name: '美御前社', x: -30.0, z: -556.0, ry: -Math.PI / 2, w: 2.3, material: 'copper' },
    { name: '刃物神社', x: -42.0, z: -514.0, ry: Math.PI, w: 2.0, color: PAL.timberMid, material: 'copper' },
    { name: '玉光稲荷社', x: -100.0, z: -540.0, ry: Math.PI * 0.5, w: 2.2, material: 'copper', inari: true },
    { name: '日吉社', x: -90.0, z: -594.0, ry: Math.PI, w: 2.0, material: 'hiwada' },
    { name: '厳島社', x: -44.0, z: -598.0, ry: Math.PI, w: 2.0, material: 'hiwada' },
  ];
  const plates = [];
  const plateTex = plateAtlas(SUBS.map((s) => s.name));
  SUBS.forEach((s, i) => {
    const r = makeSubShrine(ctx, {
      x: s.x, z: s.z, ry: s.ry, w: s.w, d: s.w * 0.80,
      color: s.color ?? PAL.vermilion, material: s.material,
      chigi: false, baker: BAKER,
    });
    out.structures.push(s.name);
    /* The 社号額 hangs under the front eave.  `makeSubShrine` returns only its
     * ridge, but the 流造 geometry fixes eave = ridge - (d/2 + eave) * 0.62,
     * so the plate hangs off `ridgeY` without guessing a ground height. */
    const p = toWorld(s.x, s.z, s.ry, 0, -(s.w * 0.40 + 0.55));
    plates.push({ i, w: Math.min(s.w * 0.62, 1.35), x: p.x, z: p.z, y: r.ridgeY - 1.45, ry: s.ry + Math.PI });

    if (s.inari) {
      /* 玉光稲荷社 -- an Inari gets a run of small vermilion torii walking in to
       * it, which is the one place in this precinct where red repeats. */
      for (let k = 1; k <= 7; k++) {
        const q = toWorld(s.x, s.z, s.ry, 0, -(4.6 + k * 1.5));
        makeTorii(ctx, {
          x: q.x, z: q.z, ry: s.ry, kind: 'myojin',
          height: 2.55, span: 1.85, baker: BAKER,
        });
      }
    }
    if (s.komainu) {
      for (const sx of [-1, 1]) {
        const q = toWorld(s.x, s.z, s.ry, sx * 2.4, -4.2);
        makeKomainu(ctx, { x: q.x, z: q.z, ry: s.ry, mouth: sx < 0 ? 'a' : 'un', height: 1.30, baker: BAKER });
      }
    }
    if (s.chozu) {
      const q = toWorld(s.x, s.z, s.ry, 3.2, -3.0);
      makeChozu(ctx, { x: q.x, z: q.z, ry: s.ry, baker: BAKER });
    }
  });

  /* All the nameplates in one mesh: one atlas, one material, one draw call. */
  {
    const parts = plates.map((p) => ({
      geometry: plateGeo(p.w, p.w * 0.34, p.i),
      matrix: trs(p.x, p.y, p.z, 0, p.ry, 0),
    }));
    const geo = bake(parts);
    if (geo) {
      const m = new THREE.Mesh(geo, celTex(plateTex, { bands: 3, tint: TINT.warm, side: THREE.DoubleSide }));
      m.name = 'yasaka-nameplates';
      m.userData.noOutline = true;
      ctx.add(m);
    }
  }

  /* ================================================================ *
   * 8.  絵馬 and おみくじ
   *
   * Both instanced by the kit.  The ema racks stand where the real ones do --
   * by the ema hall and beside the Maiden -- and the 結び所 is the dense white
   * ruffle you can read from thirty metres.
   * ================================================================ */
  for (const [x, z, ry, frames] of [
    [-40.0, -524.0, Math.PI / 2, 3],
    [-40.0, -546.0, Math.PI / 2, 2],
    [-74.0, -522.0, 0, 2],
  ]) {
    const r = makeEmaRack(ctx, { x, z, ry, frames, rows: 3, baker: BAKER });
    out.ema += r.ema;
  }
  const omi = makeOmikujiStand(ctx, { x: -53.5, z: -515.0, ry: Math.PI / 2, rackW: 4.2, baker: BAKER });
  out.omikuji = omi.slips;
  hotspot(-40.0, ctx.groundAt(-40, -524) + 1.2, -524, 3.4, 2.2, 2.6,
    'hang an ema', (audio) => audio?.knock?.(680, 0.16, 0.11));
  hotspot(omi.x, omi.y + 1.1, omi.z, 2.6, 2.0, 2.0,
    'draw a fortune', (audio) => audio?.knock?.(520, 0.22, 0.13));

  /* 由緒書 -- the notice board by the south gate, which is where a shrine
   * explains itself.  The sixth interactable. */
  {
    const nx = -55.5, nz = -496.0;
    const ny = ctx.groundAt(nx, nz);
    const nb = bag();
    for (const sx of [-1, 1]) nb.cyl(0.075, 0.07, 2.0, sx * 0.85, 0, 0, 8, PAL.timberDark, O.timber);
    nb.bar(2.0, 0.10, 0.18, 0, 1.98, 0, PAL.timberDark, O.timber);
    nb.bar(1.90, 1.15, 0.09, 0, 1.35, 0.02, PAL.timberPale, O.timber);
    const r = shedRoof({ w: 2.2, d: 0.5, pitch: 0.35, material: 'tile', mukuri: 0.03, y: 2.02, ry: Math.PI, ridgeCourses: 1 });
    for (const p of r.parts) p.geometry.translate(0, 0, -0.22);
    nb.push(r.parts);
    nb.flush(b, nx, ny, nz, Math.PI);
    const tex = cached('yasakaYuisho', () => noticeBoard(
      ['八坂神社', '御祭神　素戔嗚尊', '櫛稲田姫命　八柱御子神',
       '本殿　国宝　承応三年再建', '祇園祭　七月一日より一箇月'],
      { board: PAL.paperWarm, textColor: PAL.black, accent: PAL.redDeep, w: 448, h: 288 }
    ));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 1.06), celTex(tex, { bands: 3, tint: TINT.warm }));
    m.position.set(nx, ny + 1.35, nz + 0.10);
    m.userData.noOutline = true;
    ctx.add(m);
    ctx.collide(nx - 1.0, nz - 0.25, nx + 1.0, nz + 0.25);
    hotspot(nx, ny + 1.4, nz + 0.7, 2.4, 2.2, 1.2,
      'read the notice', (audio) => audio?.knock?.(210, 0.13, 0.20));
  }

  /* ================================================================ *
   * 9.  石灯籠 and 常夜灯 -- what actually lights the precinct
   *
   * The paired approach lanterns are 2.40 m (ARCH s4.5); the 万灯籠 donated by
   * the Gion shops number about a hundred and are dotted through the grounds.
   * These come from the kit as geometry, not props -- a lathed Kasuga profile
   * is the difference between something carved and something stacked.
   *
   * ONE row per side per approach.  Two rows of two kinds is a picket fence,
   * and the first render of this district was exactly that.
   * ================================================================ */
  const lanternAt = (x, z, kind, h, lit) => {
    if (ctx.slopeAt(x, z) > 24) return false;
    makeStoneLantern(ctx, { x, z, kind, height: h, ry: rng.range(0, 6.283), lit, baker: BAKER });
    return true;
  };

  {
    // the ceremonial axis: paired stone lanterns, evenly spaced -- these ARE
    // municipal lighting and are allowed to look like it
    const c = ctx.getCorridor('yasakaAxis');
    for (let t = 0.05; t <= 0.95; t += 0.075) {
      const p = c.pointAt(t * c.length);
      const nx = -p.tz, nz = p.tx;
      for (const s of [-1, 1]) {
        if (lanternAt(p.x + nx * 7.2 * s, p.z + nz * 7.2 * s, 'kasuga', 2.40, true)) out.stoneLanterns++;
      }
    }
  }
  {
    // the west approach: the tall vermilion 常夜灯 instead, because the climb
    // wants a vertical rhythm and because they are what is actually there
    const c = ctx.getCorridor('yasakaWestApproach');
    for (let t = 0.16; t <= 0.94; t += 0.115) {
      const p = c.pointAt(t * c.length);
      const nx = -p.tz, nz = p.tx;
      for (const s of [-1, 1]) {
        const x = p.x + nx * 7.0 * s, z = p.z + nz * 7.0 * s;
        if (ctx.slopeAt(x, z) > 24) continue;
        const gy = ctx.groundAt(x, z);
        makeWoodLantern(ctx, { x, z, y: gy, ry: Math.atan2(nx * s, nz * s), height: 3.4, lit: true, baker: BAKER });
        ctx.light({ x, y: gy + 3.0, z, color: PAL.lanternLit, intensity: 0.35, distance: 11 });
      }
    }
  }
  // 万灯籠 -- the scatter through the grounds, on ground flat enough to stand on
  for (let i = 0; i < 54; i++) {
    const x = rng.range(-158, -24), z = rng.range(-600, -466);
    if (x > -88 && x < -30 && z > -592 && z < -508) continue;      // out of the courts
    if (x < -142 && Math.abs(z + 575) < 16) continue;              // clear of the steps
    const kind = rng.chance(0.72) ? 'kasuga' : (rng.chance(0.5) ? 'oribe' : 'yukimi');
    if (lanternAt(x, z, kind, kind === 'kasuga' ? rng.range(1.9, 2.5) : undefined, false)) out.stoneLanterns++;
  }

  /* ================================================================ *
   * 10.  白川砂, 玉垣, and the edge between gravel and trees
   * ================================================================ */
  /* The apron covers the Honden terrace as well -- it is gravel up there too --
   * but stops clear of the 石段下, which is paved stone and a flight of steps. */
  const inTerrace = (x, z) =>
    (x > TER.x0 - 3 && x < TER.x1 + 2 && z > TER.z0 - 3 && z < TER.z1 + 3) ||
    (x > stepFootX - 3 && x < TER.x0 + 1 && z > -586 && z < -564);
  out.apron = gravelApron(ctx, b, {
    x0: -166, z0: -604, x1: -22, z1: -460, cell: 3.0, skip: inTerrace,
  });

  /* 玉垣 -- the inscribed stone fence.  A sparse boundary run along the south
   * side onto Shimogawara with the axis left open, and dense inner runs closing
   * the flanks of the Maiden court. */
  for (const [pts, dense] of [
    [[{ x: -120, z: -462 }, { x: -78, z: -462 }], false],
    [[{ x: -58, z: -462 }, { x: -26, z: -462 }], false],
    [[{ x: -88, z: -505 }, { x: -88, z: -530 }], true],
    [[{ x: -26, z: -508 }, { x: -26, z: -534 }], true],
  ]) {
    makeTamagaki(ctx, { points: pts, dense, baker: BAKER });
  }

  // 飛石 and path markers where the gravel meets the trees
  for (let i = 0; i < 30; i++) {
    const x = rng.range(-150, -28), z = rng.range(-598, -468);
    if (ctx.slopeAt(x, z) > 16) continue;
    ctx.prop({ kind: 'stepStone', x, z, y: 0, rot: rng.range(0, 6.283), seed: 400 + i });
  }
  for (const [x, z, ry] of [[-148, -569, 1.4], [-71, -474, 0], [-45, -503, 0.6], [-118, -571, 1.2]]) {
    ctx.prop({ kind: 'pathMarker', x, z, y: 0, rot: ry, variant: 'tall', seed: 77 });
  }
  // the traces of a precinct that is swept every morning
  for (const [k, x, z] of [
    ['broom', -46.5, -530.0], ['bucket', -45.5, -531.2], ['leafPile', -95, -560],
    ['leafPile', -36, -588], ['waterBucket', -131.0, -570.5], ['crate', -26.5, -566.0],
    ['stool', -49.0, -512.5], ['tileStack', -25.0, -578.0], ['catAsleep', -87.5, -540.0],
    ['leafPile', -145, -571], ['broom', -25.5, -565.0],
  ]) {
    ctx.prop({ kind: k, x, z, y: 0, rot: rng.range(0, 6.283), seed: Math.round(x * 7 + z) });
  }

  /* ================================================================ *
   * 11.  The trees
   *
   * The shrine sits in a dark ring of very old evergreen, and that ring is what
   * separates it from the city on three sides and from the park on the fourth.
   * Cedar and pine round the edge, cherry only where the precinct opens east
   * toward Maruyama, and NOTHING west of the gate -- Shijo-dori is a city
   * street, and a screen of trees there would hide the one view the whole west
   * front exists for.
   * ================================================================ */
  const KEEP = [
    { x0: -172, z0: -592, x1: -144, z1: -558 },      // the gate and its steps
    { x0: -90, z0: -600, x1: -28, z1: -503 },        // the courts
    { x0: -48, z0: -590, x1: -20, z1: -512 },        // ema hall / mikoshi store
    { x0: -126, z0: -572, x1: -96, z1: -548 },
    { x0: -108, z0: -546, x1: -92, z1: -516 },
  ];
  const blocked = (x, z) => {
    if (x < -160) return true;
    for (const k of KEEP) if (x > k.x0 && x < k.x1 && z > k.z0 && z < k.z1) return true;
    for (const s of SUBS) if (Math.hypot(x - s.x, z - s.z) < 9) return true;
    const su = ctx.surfaceAt(x, z);
    return !!su && su.dist < su.half + 4.0;
  };
  let planted = 0;
  for (let i = 0; i < 520 && planted < 140; i++) {
    const x = rng.range(-164, -20), z = rng.range(-650, -458);
    if (blocked(x, z)) continue;
    if (ctx.slopeAt(x, z) > 32) continue;
    const edge = z < -600 || z > -482 || x > -26;
    const u = rng.next();
    let kind;
    /* The outer ring is the dark evergreen screen and can take cedar; inside
     * it the precinct is broadleaf and pine.  A precinct planted with cedar
     * reads as a conifer plantation, which is a different country. */
    if (edge) kind = u < 0.38 ? 'cedar' : u < 0.68 ? 'pine' : u < 0.84 ? 'maple' : 'shrub';
    else kind = u < 0.16 ? 'sakura' : u < 0.40 ? 'maple' : u < 0.58 ? 'pine' : u < 0.72 ? 'ginkgo' : u < 0.90 ? 'shrub' : 'camellia';
    ctx.tree({
      kind, x, z,
      scale: kind === 'cedar' ? rng.range(1.1, 1.7) : kind === 'pine' ? rng.range(0.95, 1.45) : rng.range(0.8, 1.3),
      rot: rng.range(0, 6.283), seed: (i * 2654435761) >>> 0,
    });
    planted++;
  }
  /* The named old trees: a ring of very large 楠 close in round the Honden
   * terrace, which is what actually shades the inner precinct. */
  for (const [x, z, s] of [
    [-94, -594, 2.0], [-30, -598, 1.9], [-97, -572, 1.75], [-22, -548, 1.7],
    [-104, -500, 1.7], [-40, -480, 1.6], [-152, -594, 1.5], [-150, -554, 1.5],
  ]) {
    if (ctx.slopeAt(x, z) > 30) continue;
    ctx.tree({ kind: 'cedar', x, z, scale: s, rot: rng.range(0, 6.283), seed: Math.round(x * 31 + z * 7) >>> 0, hero: true });
    planted++;
  }
  // a few cherries where the precinct opens east toward Maruyama
  for (const [x, z] of [[-24, -524], [-22, -540], [-26, -506], [-21, -560], [-28, -494]]) {
    ctx.tree({ kind: 'sakura', x, z, scale: rng.range(1.0, 1.3), rot: rng.range(0, 6.283), seed: Math.round(x * 17 + z) >>> 0 });
    planted++;
  }
  out.trees = planted;

  /* ================================================================ *
   * 12.  Dusk
   *
   * One update for every lit paper batch in the district: a string compare per
   * frame, and it touches a material only when the state actually changes.
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

  out.steps = flight.steps;
  return out;
}
