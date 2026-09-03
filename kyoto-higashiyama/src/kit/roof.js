import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT } from '../core/toon.js';
import { lerp, clamp } from '../core/util.js';

/* ------------------------------------------------------------------ *
 * Roofs.
 *
 * More than any other single thing, the roof is what makes a Japanese building
 * read as Japanese, and the reason is **curvature**.  A pitched box with a
 * tile texture on it is a barn.  Two curvatures do nearly all the work:
 *
 *   むくり (mukuri) -- a slight *convex* bulge, so the slope is steeper at the
 *   ridge and flattens toward the eave.  This is the townhouse roof: machiya,
 *   shops, ordinary Kyoto.  It is subtle -- a rise of 2-4 % of the run at
 *   mid-slope -- and it is what makes a row of roofs look soft rather than
 *   folded out of card.
 *
 *   反り (sori) -- a *concave* sweep, so the slope flattens near the ridge and
 *   turns up at the eave, usually with the corners lifted further still.  This
 *   is the temple and shrine roof: Kiyomizu-dera's main hall, the pagoda's five
 *   tiers, Yasaka's gates.  Get it and a roof looks like it is being carried;
 *   miss it and the same geometry looks like a tent.
 *
 * The other thing a real roof has that a modelled one usually does not is
 * **thickness at the eave**.  A Japanese eave is the cut end of a deep stack of
 * rafters, battens and tile or bark, and it is 0.12 m of tile or fully 0.30 m of
 * cypress bark seen edge-on, held out a long way past the wall.  That band of
 * dark under a bright roof is a huge part of the silhouette, so every roof here
 * is a solid with a visible edge rather than a surface.
 *
 * ------------------------------------------------------------------ USE
 *
 * Every generator returns `{ parts, top, eaveY, ridgeY }` where `parts` is an
 * array of `{ geometry, color, opts }` ready to hand to a `Baker`.  Nothing in
 * here makes a Mesh, because nothing in here should be its own draw call.
 * ------------------------------------------------------------------ */

/** Roofing materials and what they imply. */
export const ROOFING = {
  tile:   { top: PAL.tileRoof, edge: PAL.tileRidge, thick: 0.13, bands: 3, tint: TINT.cool },
  tileOld:{ top: PAL.tileWarm, edge: PAL.tileRidge, thick: 0.13, bands: 3, tint: TINT.cool },
  hiwada: { top: PAL.hiwada,   edge: PAL.hiwadaEdge, thick: 0.30, bands: 3, tint: TINT.warm },
  kaya:   { top: PAL.kaya,     edge: PAL.kaya,       thick: 0.45, bands: 3, tint: TINT.warm },
  copper: { top: PAL.copper,   edge: PAL.copperDark, thick: 0.08, bands: 4, tint: TINT.cool },
  board:  { top: PAL.timberGrey, edge: PAL.timberDark, thick: 0.07, bands: 3, tint: TINT.warm },
};

/**
 * The slope curve.
 *
 * `t` runs 0 at the ridge to 1 at the eave.  Returns the height *below* the
 * ridge as a fraction of the total rise.  A straight roof is `t`; mukuri bows
 * it one way and sori the other.
 */
function slopeCurve(t, mukuri, sori) {
  // a straight line plus a sine bump, which is zero at both ends by
  // construction and so cannot move the ridge or the eave
  const bump = Math.sin(t * Math.PI);
  let v = t + bump * mukuri - bump * sori;
  /* Sori also has to *flatten near the ridge and turn up at the eave*, which a
   * symmetric bump does not do.  The extra term is weighted to the eave end. */
  if (sori > 0) v -= Math.pow(t, 2.6) * sori * 1.35;
  return v;
}

/**
 * A single roof plane, as a curved slab with a thick cut edge.
 *
 * `x` runs along the ridge, `z` from ridge (0) to eave (depth).  The caller
 * transforms it into place; building every plane in the same local frame is
 * what keeps the sign errors out.
 */
function roofPlane({
  length, depth, rise, thick,
  mukuri = 0, sori = 0, cornerLift = 0, segments = 8, lengthSegments = 4,
  hipStart = null,        // for a hip: the eave line shrinks to this at the ends
}) {
  const nz = segments, nx = Math.max(2, lengthSegments);
  const pos = [];
  const uv = [];
  const idx = [];

  // top surface
  const rowTop = [];
  for (let j = 0; j <= nz; j++) {
    const t = j / nz;
    const y = -slopeCurve(t, mukuri, sori) * rise;
    const z = t * depth;
    const row = [];
    for (let i = 0; i <= nx; i++) {
      const u = i / nx;
      let x = (u - 0.5) * length;
      // a hip plane's eave narrows toward the ends
      if (hipStart !== null) {
        const shrink = lerp(0, hipStart, t);
        x = (u - 0.5) * (length - 2 * shrink * 0);
      }
      /* Corner uplift: the eave lifts toward both ends of the run, strongest
       * at the very corner and fading inward over about a fifth of the length.
       * Weighted by t^2 so it does nothing at the ridge. */
      let lift = 0;
      if (cornerLift > 0) {
        const edge = Math.max(0, (Math.abs(u - 0.5) - 0.28) / 0.22);
        lift = cornerLift * Math.pow(clamp(edge, 0, 1), 1.7) * t * t;
      }
      row.push(pos.length / 3);
      pos.push(x, y + lift, z);
      uv.push(u * length, t * depth);
    }
    rowTop.push(row);
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = rowTop[j][i], b = rowTop[j][i + 1], c = rowTop[j + 1][i], d = rowTop[j + 1][i + 1];
      idx.push(a, c, b, b, c, d);
    }
  }

  // bottom surface, offset straight down by the slab thickness
  const base = pos.length / 3;
  const rowBot = [];
  for (let j = 0; j <= nz; j++) {
    const row = [];
    for (let i = 0; i <= nx; i++) {
      const k = rowTop[j][i] * 3;
      row.push(pos.length / 3);
      pos.push(pos[k], pos[k + 1] - thick, pos[k + 2]);
      uv.push(0, 0);
    }
    rowBot.push(row);
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = rowBot[j][i], b = rowBot[j][i + 1], c = rowBot[j + 1][i], d = rowBot[j + 1][i + 1];
      idx.push(a, b, c, b, d, c);
    }
  }

  // the eave edge -- the visible band, and the reason the slab is a solid
  for (let i = 0; i < nx; i++) {
    const a = rowTop[nz][i], b = rowTop[nz][i + 1];
    const c = rowBot[nz][i], d = rowBot[nz][i + 1];
    idx.push(a, b, c, b, d, c);
  }
  // the two rake edges (the sloping sides)
  for (let j = 0; j < nz; j++) {
    let a = rowTop[j][0], b = rowTop[j + 1][0], c = rowBot[j][0], d = rowBot[j + 1][0];
    idx.push(a, c, b, b, c, d);
    a = rowTop[j][nx]; b = rowTop[j + 1][nx]; c = rowBot[j][nx]; d = rowBot[j + 1][nx];
    idx.push(a, b, c, b, d, c);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geometry: g, base };
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _one = new THREE.Vector3(1, 1, 1);

function place(geo, x, y, z, ry = 0) {
  _e.set(0, ry, 0);
  _q.setFromEuler(_e);
  _v.set(x, y, z);
  _m.compose(_v, _q, _one);
  geo.applyMatrix4(_m);
  return geo;
}

/**
 * 棟 -- the ridge.
 *
 * On a tiled roof this is a stack of 熨斗瓦 (flat tiles laid on edge) capped by
 * a round 冠瓦, and it is the darkest, heaviest line on the building.  A roof
 * without one reads as unfinished; a temple's is enormous.  `courses` is how
 * many tile courses high -- 2 for a house, 5-9 for a temple or a gate.
 */
function ridgeParts({ length, y, z = 0, courses = 3, width = 0.42, ry = 0, endCaps = true }) {
  const parts = [];
  const ch = 0.075;
  for (let i = 0; i < courses; i++) {
    const w = width * (1 - i * 0.045);
    const g = new THREE.BoxGeometry(length, ch, w);
    place(g, 0, y + ch * (i + 0.5), z, 0);
    parts.push({ geometry: g, color: PAL.tileRidge, opts: { bands: 3, tint: TINT.cool } });
  }
  // the round cap
  const cap = new THREE.CylinderGeometry(width * 0.30, width * 0.30, length, 8);
  /* One rotation, not two.  A CylinderGeometry's axis starts along +Y;
   * `rotateZ(pi/2)` lays it along X, which is along the ridge, and that is the
   * whole job.  The extra `rotateY(pi/2)` that used to follow took it round to
   * Z -- so every roof in the world grew an eight-metre pole lying *across* it
   * and sticking out over the street at both ends.  From the ground it read as
   * a mysterious horizontal bar floating above the roofline; only a view from
   * above showed what it was. */
  cap.rotateZ(Math.PI / 2);
  place(cap, 0, y + ch * courses, z, 0);
  parts.push({ geometry: cap, color: PAL.tileEdge, opts: { bands: 3, tint: TINT.cool } });

  if (endCaps) {
    /* 鬼瓦 -- the demon-face end tile.  Not carved here; it is a raised plate
     * standing proud of the ridge end, which is all that reads past ten metres
     * and is the shape that says "the ridge stops here". */
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.10, ch * courses * 1.5, width * 1.5);
      place(g, s * length / 2, y + ch * courses * 0.75, z, 0);
      parts.push({ geometry: g, color: PAL.tileRidge, opts: { bands: 3, tint: TINT.cool } });
    }
  }

  if (ry) for (const p of parts) place(p.geometry, 0, 0, 0, ry);
  return parts;
}

/* ------------------------------------------------------------------ *
 * 切妻 -- the gable roof.
 *
 * Two planes meeting at a ridge, open at both ends.  The default Kyoto
 * townhouse roof when its ridge runs parallel to the street (平入, hirairi)
 * and the standard shop roof.
 * ------------------------------------------------------------------ */
export function gableRoof({
  w, d, pitch = 0.45, eave = 0.9, material = 'tile',
  mukuri = 0.03, sori = 0, cornerLift = 0, ridgeCourses = 3,
  y = 0, ry = 0, ridgeAlongX = true, gableEnd = true,
}) {
  const R = ROOFING[material] || ROOFING.tile;
  const parts = [];
  const runLen = (ridgeAlongX ? w : d) + eave * 2;   // along the ridge
  const runDep = ((ridgeAlongX ? d : w) + eave * 2) / 2;  // ridge to eave
  const rise = runDep * pitch;

  for (const s of [1, -1]) {
    const p = roofPlane({
      length: runLen, depth: runDep, rise, thick: R.thick,
      mukuri, sori, cornerLift, segments: sori > 0 || mukuri > 0 ? 8 : 3,
      lengthSegments: cornerLift > 0 ? 10 : 2,
    });
    // the plane is built running +z from the ridge; the far slope is mirrored
    p.geometry.scale(1, 1, s);
    place(p.geometry, 0, y + rise, 0, ridgeAlongX ? 0 : Math.PI / 2);
    if (ry) place(p.geometry, 0, 0, 0, ry);
    parts.push({ geometry: p.geometry, color: R.top, opts: { bands: R.bands, tint: R.tint } });
  }

  if (material === 'tile' || material === 'tileOld') {
    parts.push(...ridgeParts({
      length: runLen, y: y + rise, courses: ridgeCourses,
      ry: ry + (ridgeAlongX ? 0 : Math.PI / 2),
    }));
  }

  /* 破風 -- the gable board, a wide plank closing the triangular end.  On a
   * machiya it is plain; on a temple it is carved and often has a 懸魚 hanging
   * below the apex. */
  if (gableEnd) {
    const across = (ridgeAlongX ? d : w) / 2 + eave;
    for (const s of [-1, 1]) {
      const tri = new THREE.Shape();
      tri.moveTo(-across, 0);
      tri.lineTo(across, 0);
      tri.lineTo(0, rise);
      tri.closePath();
      const g = new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false });
      g.translate(0, 0, -0.06);
      g.rotateY(Math.PI / 2);
      place(g, s * (runLen / 2 - 0.04), y, 0, ridgeAlongX ? 0 : Math.PI / 2);
      if (ry) place(g, 0, 0, 0, ry);
      parts.push({ geometry: g, color: PAL.timberDark, opts: { bands: 3, tint: TINT.warm } });
    }
  }

  return { parts, ridgeY: y + rise, eaveY: y, rise, eave };
}

/* ------------------------------------------------------------------ *
 * 寄棟 -- the hip roof.  Four slopes, no gable.  Warehouses, sub-halls, and
 * the lower half of every irimoya.
 * ------------------------------------------------------------------ */
export function hipRoof({
  w, d, pitch = 0.45, eave = 0.9, material = 'tile',
  mukuri = 0.02, sori = 0, cornerLift = 0, ridgeCourses = 3, y = 0, ry = 0,
}) {
  const R = ROOFING[material] || ROOFING.tile;
  const parts = [];
  const W = w + eave * 2, D = d + eave * 2;
  const short = Math.min(W, D);
  const depth = short / 2;
  const rise = depth * pitch;
  const ridgeLen = Math.max(0.4, Math.max(W, D) - short);
  const alongX = W >= D;

  // the two long slopes
  for (const s of [1, -1]) {
    const p = roofPlane({
      length: alongX ? W : D, depth, rise, thick: R.thick,
      mukuri, sori, cornerLift, segments: 7, lengthSegments: cornerLift > 0 ? 10 : 2,
    });
    p.geometry.scale(1, 1, s);
    place(p.geometry, 0, y + rise, 0, alongX ? 0 : Math.PI / 2);
    if (ry) place(p.geometry, 0, 0, 0, ry);
    parts.push({ geometry: p.geometry, color: R.top, opts: { bands: R.bands, tint: R.tint } });
  }
  // the two hip ends -- triangular, so built as a narrow plane that tapers
  for (const s of [1, -1]) {
    const endLen = alongX ? D : W;
    const p = roofPlane({
      length: endLen, depth, rise, thick: R.thick,
      mukuri, sori, cornerLift, segments: 7, lengthSegments: 2,
    });
    // taper the end plane to a point at the ridge by scaling x with z
    const pos = p.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      const t = clamp(Math.abs(z) / depth, 0, 1);
      // at the ridge (t=0) the plane is the ridge length; at the eave it is full
      const k = lerp(ridgeLen / endLen, 1, t);
      pos.setX(i, pos.getX(i) * k);
    }
    pos.needsUpdate = true;
    p.geometry.computeVertexNormals();
    p.geometry.scale(1, 1, s);
    place(p.geometry, 0, y + rise, 0, alongX ? Math.PI / 2 : 0);
    if (ry) place(p.geometry, 0, 0, 0, ry);
    parts.push({ geometry: p.geometry, color: R.top, opts: { bands: R.bands, tint: R.tint } });
  }

  if (material === 'tile' || material === 'tileOld') {
    parts.push(...ridgeParts({
      length: ridgeLen, y: y + rise, courses: ridgeCourses,
      ry: ry + (alongX ? 0 : Math.PI / 2),
    }));
    /* 隅棟 -- the four hip ridges running down to the corners.  These are what
     * makes a hip roof read as a hip roof in silhouette. */
    const hw = (alongX ? W : D) / 2, hd = depth;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const len = Math.hypot(hw - ridgeLen / 2, hd);
        const g = new THREE.BoxGeometry(len, 0.13, 0.30);
        const ang = Math.atan2(hd, hw - ridgeLen / 2);
        g.rotateZ(-Math.atan2(rise, len) * 0.9);
        place(g, 0, 0, 0, 0);
        const mid = new THREE.Matrix4().compose(
          new THREE.Vector3(sx * (ridgeLen / 2 + (hw - ridgeLen / 2) / 2) * 0.9, y + rise * 0.5 + 0.06, sz * hd / 2),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -sx * sz * ang, 0)),
          _one
        );
        g.applyMatrix4(mid);
        if (!alongX) place(g, 0, 0, 0, Math.PI / 2);
        if (ry) place(g, 0, 0, 0, ry);
        parts.push({ geometry: g, color: PAL.tileRidge, opts: { bands: 3, tint: TINT.cool } });
      }
    }
  }

  return { parts, ridgeY: y + rise, eaveY: y, rise, eave, ridgeLen };
}

/* ------------------------------------------------------------------ *
 * 入母屋 -- hip-and-gable.
 *
 * The grandest of the ordinary roof forms: a hip roof with a gable perched on
 * top of it, so the building gets both the swept corners of a hip and the
 * decorated triangular face of a gable.  Yasaka Shrine's west gate, its main
 * hall, Kiyomizu-dera's Niomon and main hall, and every pagoda's top storey.
 *
 * Built as exactly what it is: a hip roof, and a smaller gable roof sitting on
 * it, with the gable's own eaves cutting into the hip's upper slopes.
 * ------------------------------------------------------------------ */
export function irimoyaRoof({
  w, d, pitch = 0.5, eave = 1.4, material = 'hiwada',
  sori = 0.10, cornerLift = 0.5, ridgeCourses = 6,
  gableFrac = 0.42, y = 0, ry = 0, gableFace = 'x',
}) {
  const parts = [];
  const lower = hipRoof({
    w, d, pitch, eave, material, mukuri: 0, sori, cornerLift,
    ridgeCourses: 0, y, ry,
  });
  parts.push(...lower.parts);

  // the gable sits above, spanning a fraction of the plan
  const gw = (gableFace === 'x' ? w : d) * gableFrac + eave * 0.4;
  const gd = (gableFace === 'x' ? d : w) * gableFrac;
  const gy = y + lower.rise * 0.52;
  const upper = gableRoof({
    w: gableFace === 'x' ? gw : gd,
    d: gableFace === 'x' ? gd : gw,
    pitch: pitch * 1.06, eave: eave * 0.42, material,
    mukuri: 0, sori: sori * 0.7, cornerLift: cornerLift * 0.35,
    ridgeCourses, y: gy, ry, ridgeAlongX: gableFace === 'x', gableEnd: true,
  });
  parts.push(...upper.parts);

  return { parts, ridgeY: upper.ridgeY, eaveY: y, rise: upper.ridgeY - y, eave };
}

/* ------------------------------------------------------------------ *
 * 片流れ / 庇 -- the shed roof and the pent roof.
 *
 * `hisashi` is the small subsidiary roof over a doorway, a shopfront or the
 * lower storey of a two-storey building.  It is everywhere in Higashiyama and
 * it is what gives a street its horizontal banding: a line of dark eaves at
 * about 2.6 m running the whole length of the frontage.
 * ------------------------------------------------------------------ */
export function shedRoof({
  w, d, pitch = 0.38, eave = 0.5, material = 'tile',
  mukuri = 0.02, y = 0, ry = 0, ridgeCourses = 2,
}) {
  const R = ROOFING[material] || ROOFING.tile;
  const parts = [];
  const depth = d + eave;
  const rise = depth * pitch;
  const p = roofPlane({
    length: w + eave * 2, depth, rise, thick: R.thick,
    mukuri, sori: 0, cornerLift: 0, segments: 4, lengthSegments: 2,
  });
  place(p.geometry, 0, y + rise, 0, ry);
  parts.push({ geometry: p.geometry, color: R.top, opts: { bands: R.bands, tint: R.tint } });
  if (ridgeCourses && (material === 'tile' || material === 'tileOld')) {
    const g = new THREE.BoxGeometry(w + eave * 2, 0.16, 0.30);
    place(g, 0, y + rise + 0.08, -0.05, ry);
    parts.push({ geometry: g, color: PAL.tileRidge, opts: { bands: 3, tint: TINT.cool } });
  }
  return { parts, ridgeY: y + rise, eaveY: y, rise, depth };
}

/**
 * 庇 -- the pent roof over a shopfront.  A shed roof plus the bracket arms
 * that carry it, which are as much of the read as the roof is.
 */
export function hisashi({
  w, depth = 1.05, y = 2.55, pitch = 0.30, material = 'tile',
  brackets = true, bracketEvery = 1.9, z = 0, ry = 0, color = PAL.timber,
}) {
  const parts = [];
  const r = shedRoof({
    w, d: depth, pitch, eave: 0.16, material, mukuri: 0.03, y, ry, ridgeCourses: 1,
  });
  // the shed is built running +z; push it out over the street
  for (const p of r.parts) p.geometry.translate(0, 0, z + depth * 0.5);
  parts.push(...r.parts);

  if (brackets) {
    const n = Math.max(2, Math.round(w / bracketEvery));
    for (let i = 0; i <= n; i++) {
      const x = -w / 2 + (i / n) * w;
      // a sloping arm from the wall out to the eave
      const g = new THREE.BoxGeometry(0.075, 0.13, depth * 1.02);
      g.rotateX(-Math.atan2(r.rise * 0.7, depth));
      g.translate(x, y - 0.10, z + depth * 0.52);
      parts.push({ geometry: g, color, opts: { bands: 3, tint: TINT.warm } });
      // and the little strut back to the wall below it
      const s = new THREE.BoxGeometry(0.06, 0.42, 0.06);
      s.translate(x, y - 0.30, z + 0.09);
      parts.push({ geometry: s, color, opts: { bands: 3, tint: TINT.warm } });
    }
  }
  return { parts, ridgeY: r.ridgeY, eaveY: y, depth };
}

/* ------------------------------------------------------------------ *
 * 唐破風 -- the karahafu, the undulating "Chinese gable".
 *
 * A cusped ogee curve used over the entrance of something important -- a
 * shrine's offertory hall, a temple gate, a grand ochaya's doorway.  It is one
 * of the most recognisable shapes in Japanese architecture and it is entirely
 * a silhouette, so it is worth the vertices.
 * ------------------------------------------------------------------ */
export function karahafu({ w = 3.2, h = 1.1, depth = 1.6, y = 0, ry = 0, material = 'copper' }) {
  const R = ROOFING[material] || ROOFING.copper;
  const parts = [];
  const pts = [];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (t - 0.5) * w;
    // the ogee: a central hump with a reversed curve dropping to lifted ends
    const u = (t - 0.5) * 2;
    const yy = h * (Math.pow(Math.cos(u * Math.PI * 0.5), 1.5) * 0.86)
             + h * 0.22 * Math.pow(Math.abs(u), 3.2);
    pts.push([x, yy]);
  }
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1] - R.thick - 0.10);
  for (let i = pts.length - 1; i >= 0; i--) shape.lineTo(pts[i][0], pts[i][1] - R.thick - 0.10);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 2 });
  g.translate(0, 0, -depth / 2);
  place(g, 0, y, 0, ry);
  parts.push({ geometry: g, color: R.top, opts: { bands: R.bands, tint: R.tint } });

  // the white plaster tympanum under the curve
  const tym = new THREE.Shape();
  tym.moveTo(pts[0][0], pts[0][1] - R.thick - 0.10);
  for (let i = 1; i < pts.length; i++) tym.lineTo(pts[i][0], pts[i][1] - R.thick - 0.12);
  tym.lineTo(pts[pts.length - 1][0], 0);
  tym.lineTo(pts[0][0], 0);
  tym.closePath();
  const tg = new THREE.ExtrudeGeometry(tym, { depth: 0.09, bevelEnabled: false, curveSegments: 2 });
  tg.translate(0, 0, -0.045);
  place(tg, 0, y, 0, ry);
  parts.push({ geometry: tg, color: PAL.gatePanel, opts: { bands: 'soft3', tint: TINT.cool } });

  return { parts, top: y + h };
}

/**
 * 懸魚 -- the "hanging fish", the carved pendant under a gable apex.
 * Pure silhouette, and its absence is one of those things you cannot name but
 * can see: a temple gable with nothing hanging from it looks bare.
 */
export function gyo({ w = 0.55, h = 0.7, y = 0, z = 0, ry = 0 }) {
  const s = new THREE.Shape();
  s.moveTo(0, h * 0.5);
  s.bezierCurveTo(w * 0.5, h * 0.34, w * 0.44, -h * 0.16, 0, -h * 0.5);
  s.bezierCurveTo(-w * 0.44, -h * 0.16, -w * 0.5, h * 0.34, 0, h * 0.5);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -0.035);
  place(g, 0, y, z, ry);
  return [{ geometry: g, color: PAL.timberWarm, opts: { bands: 3, tint: TINT.warm } }];
}

/**
 * 千木 and 堅魚木 -- the crossed finials and the barrel-shaped billets that ride
 * the ridge of a shrine's main hall.  These say "shrine, not temple" more
 * loudly than anything else on the building.
 */
export function chigi({ length = 6.0, y = 0, ridgeY = 0, count = 5, ry = 0 }) {
  const parts = [];
  // 堅魚木: short barrels lying across the ridge
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const x = (t - 0.5) * length * 0.72;
    const g = new THREE.CylinderGeometry(0.17, 0.17, 1.05, 8);
    g.rotateX(Math.PI / 2);
    place(g, x, ridgeY + 0.20, 0, ry);
    parts.push({ geometry: g, color: PAL.timberWarm, opts: { bands: 4, tint: TINT.warm, flat: false } });
  }
  // 千木: two crossed boards at each end
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.13, 2.1, 0.30);
      g.rotateX(t * 0.22);
      g.rotateZ(t * 0.0);
      place(g, s * length * 0.48, ridgeY + 0.85, t * 0.42, ry);
      parts.push({ geometry: g, color: PAL.timberWarm, opts: { bands: 3, tint: TINT.warm } });
    }
  }
  return parts;
}

/* ------------------------------------------------------------------ *
 * 軒 -- the eave underside.
 *
 * A Japanese eave overhangs by a metre or more and you spend a lot of the game
 * standing under one.  What is up there is a grid of exposed rafters (垂木) at
 * about 0.30 m centres, and on a temple *two* tiers of them (二軒).  Cheap, and
 * it is the difference between a roof that is carried and a roof that is glued
 * on.
 * ------------------------------------------------------------------ */
export function rafters({
  w, depth, y, spacing = 0.32, size = 0.075, ry = 0, z = 0,
  color = PAL.timberWarm, pitch = 0, double = false,
}) {
  const parts = [];
  const n = Math.max(2, Math.round(w / spacing));
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + (i / n) * w;
    const g = new THREE.BoxGeometry(size, size, depth);
    if (pitch) g.rotateX(-Math.atan(pitch));
    place(g, x, y, z + depth / 2, ry);
    parts.push({ geometry: g, color, opts: { bands: 3, tint: TINT.warm } });
    if (double) {
      const g2 = new THREE.BoxGeometry(size * 0.86, size * 0.86, depth * 0.62);
      if (pitch) g2.rotateX(-Math.atan(pitch));
      place(g2, x, y - size * 1.25, z + depth * 0.31, ry);
      parts.push({ geometry: g2, color, opts: { bands: 3, tint: TINT.warm } });
    }
  }
  // the 木負 / 茅負 -- the fascia the rafter ends are cut against
  const f = new THREE.BoxGeometry(w + 0.1, size * 1.5, size * 1.2);
  place(f, 0, y, z + depth, ry);
  parts.push({ geometry: f, color: PAL.timberDark, opts: { bands: 3, tint: TINT.warm } });
  return parts;
}

/**
 * 組物 / 斗栱 -- the bracket complex.
 *
 * The stepped stack of blocks (斗) and arms (肘木) that transfers a temple
 * roof's weight onto its columns, and steps the eave outward as it goes.  A
 * 三手先 (three-stepped) set is what carries a pagoda's eaves; a gate uses one
 * or two steps.
 *
 * Not carved -- at the distance these are seen, a bracket complex is a
 * *rhythm of light and shadow*, and boxes at the right spacing give exactly
 * that.  Carving them would cost ten times the vertices for nothing.
 */
export function brackets({
  x = 0, y = 0, z = 0, steps = 2, ry = 0, scale = 1,
  color = PAL.timberWarm, block = PAL.gatePanel,
}) {
  const parts = [];
  const u = 0.26 * scale;      // the 斗 module
  for (let s = 0; s <= steps; s++) {
    const out = s * u * 1.35;
    const yy = y + s * u * 1.15;
    // the block
    const b = new THREE.BoxGeometry(u * 1.15, u * 0.62, u * 1.15);
    place(b, x, yy, z + out, ry);
    parts.push({ geometry: b, color: block, opts: { bands: 3, tint: TINT.warm } });
    // the arm running across it
    const a = new THREE.BoxGeometry(u * (3.0 + s * 0.9), u * 0.5, u * 0.66);
    place(a, x, yy + u * 0.55, z + out, ry);
    parts.push({ geometry: a, color, opts: { bands: 3, tint: TINT.warm } });
    // and the tail running back into the building
    if (s > 0) {
      const t = new THREE.BoxGeometry(u * 0.5, u * 0.42, u * 2.2);
      place(t, x, yy + u * 0.25, z + out - u * 0.9, ry);
      parts.push({ geometry: t, color, opts: { bands: 3, tint: TINT.warm } });
    }
  }
  return parts;
}
