import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT } from '../core/toon.js';
import { Baker, lathe, trs, clamp, lerp } from '../core/util.js';
import { brackets, rafters, ROOFING } from './roof.js';
import { hullOutlineTree } from '../core/outline.js';
import { PAGODA } from '../data/route.js';

/* ------------------------------------------------------------------ *
 * 塔 -- the pagoda.
 *
 * The Yasaka Pagoda (法観寺五重塔, 1440) is the world's origin and its single
 * most important composition anchor: it is read from 400 m down Yasaka-dori
 * and from 4 m at its own foot, and it has to survive both.
 *
 * **It is also the best-documented object in the project.**  Plan, taper,
 * eaves, brackets, total height, body height and finial length are measured
 * survey values (浜島正士 1968-73, from the 京都府教育委員会 preservation
 * drawings; 白井裕泰 1990 for the taper typology).  Everything structural in
 * this file is typed in from ARCH.md §5 rather than invented, and where the
 * survey says `[UNKNOWN]` the code says so.
 *
 * ------------------------------------------------- THE FIVE HARD FACTS
 *
 *  1. **38.79 m, not 46 m.**  128.00 尺 total, of which 塔身 88.00 尺 =
 *     26.667 m and 相輪 40.00 尺 = 12.121 m.  The 46 m in every guidebook is
 *     labelled 公称 -- nominal -- by the one source that admits it, and it
 *     implies a height/plan ratio outside the range of every wayō pagoda ever
 *     measured.
 *
 *  2. **The taper is CONVEX (type C 中腹).**  Measured body widths
 *     6.303 / 5.918 / 5.582 / 4.982 / 4.433 m: the drop from 2重 to 3重 is the
 *     *smallest* of the four, so the tower holds its width through the middle
 *     and then falls away.  Only three surviving five-storey pagodas do this
 *     and Hōkan-ji is the last ever built that way -- 『匠明』 (1607) calls it
 *     the correct profile.  **Interpolating linearly destroys the silhouette.**
 *
 *  3. **The pagoda is mostly roof.**  Eave spans 13.909 / 13.524 / 13.188 /
 *     12.588 / 12.039 m -- the roof plan shrinks 13 % while the body shrinks
 *     30 %, and the first roof is 2.2x the width of the body under it.  Eave
 *     projection is 3.803 m per side and is *identical on all five storeys*.
 *
 *  4. **The eave is two straight tiers, not one curve.**  地垂木 at 16.7-21.8°
 *     and 飛檐垂木 at 9.6-13°, over a hidden 野地 sheathing at 21.8-36.9°.
 *     That break -- shallow flying tier, steeper inner tier, steep hidden cap
 *     -- is what produces the upward flick.  The kit's `hipRoof` is one
 *     constant pitch and cannot express it, so the tower brings its own roof
 *     shell (`pagodaRoof` below) and leaves `hipRoof` to the halls and gates.
 *
 *  5. **縁 and 高欄 on the FIFTH STOREY ONLY**, and none at ground level.
 *     Hōkan-ji is famous for it -- 「縁、高欄が五重目にしか付いていない珍しい
 *     建築様式」.  Put a balcony on every storey and it reads as a generic
 *     pagoda, which is the one thing this one is not.
 *
 * ----------------------------------------------------------- MATERIALS
 *
 * Hōkan-ji is **unpainted weathered timber with plaster panels** under
 * silver-grey 本瓦葺 tile: no vermilion anywhere, no 裳階 skirt roof, no
 * forecourt (the compound is a scrap of ground between houses).  Kiyomizu's
 * 三重塔 is **vermilion under tile**; its 子安塔 is **vermilion under
 * 檜皮葺** -- the most commonly mis-modelled fact about that building.
 *
 * ------------------------------------------------------------------ USE
 *
 *   makeFiveStoreyPagoda(ctx, { x, z, ry, height, baseWidth, baker, lod })
 *   makeThreeStoreyPagoda(ctx, { ..., vermilion: true })
 *
 * With no `baker` the tower gets its own -- which is what you want for the
 * Yasaka Pagoda, because it is one of the four or five objects in the world
 * that earns a *drawn* inverted-hull outline on top of the screen-space ink,
 * and an outline needs a mesh of its own.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * The measured constants.  ARCH.md §5; 1 支 (eda, the rafter-pitch module) is
 * 203.3 mm and every plan dimension on the real building is a whole number of
 * them.  This is NOT the 1.9697 m Kyoma ken -- temple carpentry uses a
 * different module system and forcing the pagoda onto the ken is wrong.
 * ------------------------------------------------------------------ */
export const EDA = 0.2033;              // 支 -- one rafter pitch  [HIGH]

export const HOKANJI = {
  /** 総高 H = 128.00 尺, from the top of the stone podium.        [MEASURED] */
  height: PAGODA.height,                // 38.79
  /** 塔身 H₀ = 88.00 尺, podium to the underside of the 露盤.     [MEASURED] */
  bodyHeight: PAGODA.bodyHeight,        // 26.67
  /** 相輪 L = 40.00 尺 -- 31.25 % of the total.                   [MEASURED] */
  sorinHeight: PAGODA.sorinHeight,      // 12.12
  /** 総柱間 per storey -- convex type C.  DO NOT INTERPOLATE.     [MEASURED] */
  widths: PAGODA.storeyWidths,          // 6.303 5.918 5.582 4.982 4.433
  /** 中の間 / 脇間, the centre and side bays of the three-bay face.[MEASURED] */
  centreBay: [2.242, 2.112, 1.994, 1.818, 1.615],
  sideBay: [2.030, 1.903, 1.794, 1.582, 1.409],
  /** 軒長 -- eave tip to eave tip.                                [MEASURED] */
  eaveSpan: PAGODA.eaveSpan,
  /** 丸桁の出 G: column centre to purlin centre = 6 支 = 3 bracket steps. */
  marugetaOut: 1.218,
  jiDarukiOut: 1.595,                   // 地垂木の出                [MEASURED]
  hienDarukiOut: 0.989,                 // 飛檐垂木の出              [MEASURED]
  eaveOut: 3.803,                       // 総軒の出 E = G + R        [MEASURED]
  /** 手先の出 per bracket step = 2 支.                             [MEASURED] */
  bracketStep: 0.407,
  /** Storey pitches, 台輪天端 to 台輪天端.  [DERIVED from 中山寺 2016] */
  storeyPitch: [4.808, 4.584, 4.249, 4.100, 3.797],
  topRoofZone: 5.128,                   // 5th 台輪 -> underside of 露盤
  /** 柱径 initial storey, from 木割 (柱径 = 2.4 支).              [DERIVED] */
  columnDia: 0.48,
  /** 心柱: hinoki, ground-founded in the Hakuhō 心礎 socket.      [DERIVED] */
  shinbashiraDia: 0.85,
  /** 隅反り at the first storey.  The kiwari and the observed rules
   *  disagree by 2x and Hōkan-ji is in neither corpus -- `[UNKNOWN]`,
   *  suggested band 0.25-0.55 m, tuned here against photographs. */
  cornerRise: 0.50,
  /** 野地 (hidden sheathing) pitch, lower -> upper storey, degrees. */
  nojiPitch: [22, 25, 27, 30, null],    // the top one is solved for H₀
  jiPitch: [16.7, 17.8, 19.0, 20.4, 21.8],
  hienPitch: [9.6, 10.4, 11.2, 12.1, 13.0],
  /** 縁/高欄 on the fifth storey only. */
  veranda: PAGODA.veranda,
};

/**
 * 相輪 internal split, as fractions of the finial's own length.
 * `[DERIVED]` -- no per-component measurement exists for ANY Japanese pagoda.
 * The 露盤 is the exception: 『木砕之注文』(1394) gives width = 0.238 x 初重総間
 * with height/width 0.344, which is a real rule and is used below.
 */
export const SORIN_SPLIT = {
  roban: 0.050, fukubachi: 0.075, ukebana: 0.045, kurin: 0.500,
  suien: 0.160, ryusha: 0.060, hoju: 0.110,
  /** the small upper 請花 is taken out of the 九輪's share, so this sums to 1 */
  ukebana2: 0.028,
};

/* ------------------------------- helpers -------------------------------- */

const _m4 = () => new THREE.Matrix4();

/** Apply a matrix to a list of `{geometry}` parts, in place. */
function xform(parts, m) {
  for (const p of parts) p.geometry.applyMatrix4(m);
  return parts;
}

/**
 * Move a set of parts out to a face and then swing the whole face round.
 * The order matters and is the commonest sign error in this kind of code:
 * `trs()` composes T*R, which rotates the geometry in place and then
 * translates along the *unrotated* axes.  A face wants the opposite -- offset
 * first, then rotate offset and geometry together.
 */
function toFace(parts, px, py, pz, ry = 0) {
  xform(parts, _m4().makeTranslation(px, py, pz));
  if (ry) xform(parts, _m4().makeRotationY(ry));
  return parts;
}

function triCount(g) {
  return (g.index ? g.index.count : g.attributes.position.count) / 3;
}

/** A collector that knows what it costs. */
class Parts {
  constructor() { this.list = []; this.count = 0; }
  add(geometry, color, opts) {
    this.list.push({ geometry, color, opts });
    this.count += triCount(geometry);
    return this;
  }
  all(parts) {
    for (const p of parts) this.add(p.geometry, p.color, p.opts);
    return this;
  }
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

/** A cylinder with its base at y = 0. */
function post(rBot, rTop, h, seg = 12) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1);
  g.translate(0, h / 2, 0);
  return g;
}

/**
 * A torus, as a lathe of a circle -- the 九輪's rings.  A ring *is* a solid of
 * revolution, and stacking cylinders for one is exactly the Lego effect the
 * project is trying to avoid.
 */
function ring(R, tube, seg = 14, prof = 6) {
  const p = [];
  for (let i = 0; i <= prof; i++) {
    const a = (i / prof) * Math.PI * 2;
    p.push([R + Math.cos(a) * tube, Math.sin(a) * tube]);
  }
  return lathe(p, seg);
}

const DEG = Math.PI / 180;

/* ------------------------------------------------------------------ *
 * 屋根 -- the pagoda roof.
 *
 * Built from its **section**, because that is how the thing is actually
 * designed and because the section is the part that is measured:
 *
 *      apex ______
 *              \  \ 野地  22-37 deg, HIDDEN above the body
 *               \  \
 *      丸桁 ------\--\_____ 地垂木  16.7-21.8 deg
 *                       \___ 飛檐垂木  9.6-13 deg   <- the line you see
 *                            |
 *                        eave tip, 3.803 m out from the column centre
 *
 * The break between the two rafter tiers is what makes the eave flick up.  A
 * single-pitch roof -- which is all `hipRoof` can do -- cannot produce it, and
 * a roof with a smooth spline through the whole section produces a tent.
 *
 * Returns one closed shell plus the 隅棟 (hip ridges) and the 鬼瓦 that sit at
 * the four corners of every roof.  `rows` and `perSide` drive the cost: 8x4 is
 * the hero roof at ~700 triangles, 4x2 is the far LOD at ~150.
 * ------------------------------------------------------------------ */
function pagodaRoof({
  S, eaveSpan, purlinY, G, jiOut, hienOut,
  noji, jiPitch, hienPitch, sori = 0.10, cornerRise = 0.5,
  thick = 0.13, perSide = 4, rowsCap = 3, apexY = null,
}) {
  const rp = S / 2 + G;                       // 丸桁 -- the purlin ring
  const rk = rp + jiOut;                      // 木負 -- the first fascia
  const re = eaveSpan / 2;                    // 茅負 -- the eave tip
  const yp = purlinY;
  const yk = yp - jiOut * Math.tan(jiPitch * DEG);
  const ye = yk - hienOut * Math.tan(hienPitch * DEG);
  const ya = apexY !== null ? apexY : yp + rp * Math.tan(noji * DEG);

  /* The section, as (radius, y, "outwardness").  Outwardness runs 0 at the
   * purlin to 1 at the tip and is what the corner rise accumulates on: the
   * 茅負 carries 2.4x the sori of the 木負, so the curve builds outward. */
  const sect = [];
  for (let i = 0; i <= rowsCap; i++) {
    const t = i / rowsCap;
    /* the hidden cap, bowed very slightly concave so the tile plane reads as
     * swept rather than conical */
    const r = lerp(0, rp, t);
    const bow = Math.sin(t * Math.PI) * sori * (ya - yp);
    sect.push({ r, y: lerp(ya, yp, t) - bow, o: 0 });
  }
  sect.push({ r: lerp(rp, rk, 0.5), y: lerp(yp, yk, 0.5), o: 0.28 });
  sect.push({ r: rk, y: yk, o: 0.55 });
  sect.push({ r: lerp(rk, re, 0.55), y: lerp(yk, ye, 0.55), o: 0.80 });
  sect.push({ r: re, y: ye, o: 1.0 });
  const iPurlin = rowsCap;                    // index of the purlin row

  /* the plan ring: a square walked corner to corner, `perSide` samples a side,
   * carrying how close each sample is to a corner */
  const n = perSide * 4;
  const ringXZ = [];
  for (let i = 0; i < n; i++) {
    const s = Math.floor(i / perSide), k = (i % perSide) / perSide;
    const u = k * 2 - 1;
    let px, pz;
    if (s === 0) { px = u; pz = 1; } else if (s === 1) { px = 1; pz = -u; }
    else if (s === 2) { px = -u; pz = -1; } else { px = -1; pz = u; }
    ringXZ.push([px, pz, Math.abs(u)]);
  }

  const pos = [], idx = [];
  const rowsIdx = [];
  for (const row of sect) {
    const r = [];
    for (let i = 0; i < n; i++) {
      const [px, pz, corner] = ringXZ[i];
      // 隅反り: nothing along the straight run, everything in the last third
      const c = Math.pow(clamp((corner - 0.42) / 0.58, 0, 1), 1.8);
      const lift = cornerRise * c * row.o;
      r.push(pos.length / 3);
      pos.push(px * row.r, row.y + lift, pz * row.r);
    }
    rowsIdx.push(r);
  }
  for (let j = 0; j < rowsIdx.length - 1; j++) {
    for (let i = 0; i < n; i++) {
      const k = (i + 1) % n;
      const a = rowsIdx[j][i], b = rowsIdx[j][k], c = rowsIdx[j + 1][i], d = rowsIdx[j + 1][k];
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();

  /* The underside is its own geometry, because it is a different MATERIAL:
   * looking up at a Japanese eave you see timber -- boards and the rafter comb
   * -- not the roof covering, and giving the soffit the tile's silver-grey is
   * what makes a roof read as a flat plate stuck on the side of the building
   * rather than as a deep overhang with a shadow under it.  Built only from
   * the purlin outward; inside that the roof is enclosed by the storey above. */
  const upos = [], uidx = [];
  const bandTop = [], bandBot = [];
  for (let j = iPurlin; j < rowsIdx.length; j++) {
    const rowT = [], rowB = [];
    for (let i = 0; i < n; i++) {
      const k = rowsIdx[j][i] * 3;
      rowT.push(upos.length / 3);
      upos.push(pos[k], pos[k + 1], pos[k + 2]);
      rowB.push(upos.length / 3);
      upos.push(pos[k], pos[k + 1] - thick, pos[k + 2]);
    }
    bandTop.push(rowT); bandBot.push(rowB);
  }
  for (let j = 0; j < bandBot.length - 1; j++) {
    for (let i = 0; i < n; i++) {
      const k = (i + 1) % n;
      const a = bandBot[j][i], b = bandBot[j][k], c = bandBot[j + 1][i], d = bandBot[j + 1][k];
      uidx.push(a, b, c, b, d, c);
    }
  }
  // 茅負 -- the cut edge of the eave, the band that draws the roof
  const tE = bandTop[bandTop.length - 1], bE = bandBot[bandBot.length - 1];
  for (let i = 0; i < n; i++) {
    const k = (i + 1) % n;
    uidx.push(tE[i], tE[k], bE[i], tE[k], bE[k], bE[i]);
  }
  const gu = new THREE.BufferGeometry();
  gu.setAttribute('position', new THREE.Float32BufferAttribute(upos, 3));
  gu.setIndex(uidx);
  gu.computeVertexNormals();

  return {
    shell: g, soffit: gu, apexY: ya, purlinY: yp, tipY: ye, rp, rk, re,
    /** The roof surface height at a horizontal radius -- what the storey above
     *  has to stand on, and how far the veranda has to be lifted. */
    at(r) {
      if (r >= re) return ye;
      for (let i = 1; i < sect.length; i++) {
        if (r <= sect[i].r) {
          const a = sect[i - 1], b = sect[i];
          return lerp(a.y, b.y, (r - a.r) / (b.r - a.r || 1));
        }
      }
      return ye;
    },
  };
}

/* ------------------------------------------------------------------ *
 * 相輪 -- the sorin.
 *
 * 12.121 m of bronze on the Yasaka Pagoda: **31.25 % of the whole height**,
 * the second or third largest finial-to-plan ratio of the eighteen five-storey
 * pagodas Hamashima surveyed, and deliberately archaising for a 1440 building.
 * Hamashima singles it out.  **If the render looks stubby, the sorin is too
 * short** -- that is the failure mode, and it is why the 46 m myth is so
 * damaging: it stretches the body and leaves the finial looking like a spike.
 *
 * Bottom to top: 露盤 → 伏鉢 → 請花 → 九輪 (NINE rings) → 水煙 (four flame
 * blades) → 龍車 → 宝珠.  The internal split is `[DERIVED]`; the 露盤 rule and
 * the 九輪 ring pitch are sourced.
 * ------------------------------------------------------------------ */
export function sorin({ height = 12.121, y = 0, S1 = 6.303, rings = 9, lod = 'full' } = {}) {
  const P = new Parts();
  const L = height;
  const K = SORIN_SPLIT;
  const seg = lod === 'far' ? 8 : 14;
  const bronze = PAL.copperDark, patina = PAL.copper;
  const OPT = { bands: 4, tint: TINT.cool, flat: false };

  // 露盤: width = 0.238 x 初重総間, height/width = 0.344   『木砕之注文』1394
  const rw = 0.238 * S1, rh = rw * 0.344;
  let yy = y;
  P.add(box(rw, rh, rw).translate(0, yy + rh / 2, 0), bronze, { bands: 3, tint: TINT.cool });
  P.add(box(rw * 1.12, rh * 0.22, rw * 1.12).translate(0, yy + rh, 0), bronze, { bands: 3, tint: TINT.cool });
  yy += Math.max(rh, L * K.roban);

  // the mast: 擦管, bronze over the top of the shinbashira
  P.add(post(rw * 0.125, rw * 0.095, L - (yy - y), lod === 'far' ? 6 : 10)
    .translate(0, yy, 0), bronze, OPT);

  // 伏鉢 -- the inverted bowl
  const fh = L * K.fukubachi;
  P.add(lathe([
    [0.52, 0.00], [0.51, 0.12], [0.44, 0.46], [0.31, 0.76], [0.18, 0.92], [0.10, 1.00],
  ].map(([r, h]) => [r * rw, yy + h * fh]), seg), bronze, OPT);
  yy += fh;

  // 請花 -- the lotus cup
  const uh = L * K.ukebana;
  P.add(lathe([
    [0.12, 0.00], [0.28, 0.22], [0.44, 0.62], [0.47, 0.90], [0.24, 1.00],
  ].map(([r, h]) => [r * rw, yy + h * uh]), seg), patina, OPT);
  yy += uh;

  /* 九輪 -- NINE rings.  The count is fixed (the nine heavens) and it is the
   * commonest thing to fudge.  Ring pitch is 673 mm on the real tower and the
   * diameters taper 1.2 -> 0.8 m; per-ring dimensions are unpublished for
   * every Japanese pagoda, so -- following the one modeller who has tried --
   * they are three groups of three rather than nine different sizes. */
  const kh = L * (K.kurin - K.ukebana2);
  const pitch = kh / rings;
  for (let i = 0; i < rings; i++) {
    const grp = Math.floor(i / 3);                   // 0,1,2 -- three of each
    const R = lerp(0.60, 0.40, grp / 2) * rw;
    const g = ring(R, 0.078 * rw, seg, lod === 'far' ? 4 : 6);
    g.translate(0, yy + pitch * (i + 0.5), 0);
    P.add(g, patina, OPT);
  }
  yy += kh;

  // the upper 請花
  P.add(lathe([
    [0.10, 0.00], [0.24, 0.28], [0.36, 0.66], [0.18, 1.00],
  ].map(([r, h]) => [r * rw, yy + h * (L * K.ukebana2)]), seg), patina, OPT);
  yy += L * K.ukebana2;

  /* 水煙 -- "water flame": four pierced bronze blades.  At Yakushi-ji they are
   * 1.90-1.945 m tall, 0.48 m at the base and 37-50 mm thick, and at any
   * distance at all they are pure silhouette -- so four shaped plates, and the
   * piercing is left to the outline. */
  const sh = L * K.suien;
  if (lod !== 'far') {
    const w = sh * 0.26;
    const pts = [
      [0.00, 0.00], [0.34, 0.14], [0.52, 0.44], [0.38, 0.62],
      [0.60, 0.92], [0.44, 1.28], [0.20, 1.72], [0.30, 1.20],
      [0.10, 0.86], [0.00, 1.10], [-0.10, 0.86], [-0.30, 1.20],
      [-0.20, 1.72], [-0.44, 1.28], [-0.60, 0.92], [-0.38, 0.62],
      [-0.52, 0.44], [-0.34, 0.14],
    ];
    for (let i = 0; i < 4; i++) {
      const shape = new THREE.Shape();
      shape.moveTo(pts[0][0] * w, pts[0][1] * sh * 0.58);
      for (let k = 1; k < pts.length; k++) shape.lineTo(pts[k][0] * w, pts[k][1] * sh * 0.58);
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: false, curveSegments: 1 });
      g.translate(0, 0, -0.022);
      xform([{ geometry: g }], trs(0, yy, 0, 0, i * Math.PI / 2, 0));
      P.add(g, patina, { bands: 3, tint: TINT.cool });
    }
  } else {
    for (let i = 0; i < 2; i++) {
      const g = box(sh * 0.5, sh, 0.05);
      g.translate(0, yy + sh * 0.5, 0);
      xform([{ geometry: g }], trs(0, 0, 0, 0, i * Math.PI / 2, 0));
      P.add(g, patina, { bands: 3, tint: TINT.cool });
    }
  }
  yy += sh;

  // 龍車
  const rh2 = L * K.ryusha;
  P.add(lathe([
    [0.10, 0.00], [0.22, 0.10], [0.22, 0.62], [0.13, 0.76], [0.10, 1.00],
  ].map(([r, h]) => [r * rw, yy + h * rh2]), seg), bronze, OPT);
  yy += rh2;

  /* 宝珠 -- the jewel, and the top of the 38.79 m.  The one bright accent on
   * the whole tower: at 100 m ASL it is the highest thing between the shrine
   * and the temple, and it is the first part of the pagoda you see coming up
   * Yasaka-dori. */
  const hh = L * K.hoju;
  P.add(lathe([
    [0.05, 0.00], [0.22, 0.10], [0.33, 0.34], [0.28, 0.60],
    [0.15, 0.80], [0.05, 0.93], [0.00, 1.00],
  ].map(([r, h]) => [r * rw, yy + h * hh]), seg), PAL.gold, { bands: 4, tint: TINT.warm, flat: false });

  return P;
}

/* ------------------------------------------------------------------ *
 * The tower.
 * ------------------------------------------------------------------ */

function makePagoda(ctx, o = {}) {
  const {
    x = 0, z = 0, ry = 0, y = null,
    vermilion = false,
    material = 'tile',
    baker = null,
    lod = 'full',
    name = 'pagoda',
    outline = null,
    collide = true,
    plinthH = 0.90,
    /** rafter pitch.  203 mm is the measured 支 at Hōkan-ji; a small tower
     *  does not want 34 rafters a side costing more than the rest of it. */
    eda = EDA,
  } = o;
  const far = lod === 'far' || lod === 1;
  const H = HOKANJI;

  /* -------- the storey table: measured where measured, derived where not --- */
  const widths = o.storeyWidths || H.widths;
  const storeys = widths.length;
  const eaveSpan = o.eaveSpan || H.eaveSpan;
  const height = o.height ?? H.height;
  const sorinLen = o.sorinHeight ?? (height * (storeys >= 5 ? 0.3125 : 0.295));
  const bodyH = o.bodyHeight ?? (height - sorinLen);
  const G = o.marugetaOut ?? H.marugetaOut;
  const jiOut = o.jiDarukiOut ?? H.jiDarukiOut;
  const hienOut = o.hienDarukiOut ?? H.hienDarukiOut;
  const cornerRise = o.cornerRise ?? H.cornerRise;
  const centreBay = o.centreBay || H.centreBay;
  const sideBay = o.sideBay || H.sideBay;

  /* Storey pitches.  Hōkan-ji's are `[DERIVED]` from 中山寺 2016's measured
   * shape mapped onto the published 塔身; the same normalised shape serves any
   * other tower, with the top-roof zone taking 19.2 % of the body height. */
  let pitches = o.storeyPitch;
  let topRoofZone = o.topRoofZone;
  if (!pitches) {
    if (storeys === 5 && Math.abs(bodyH - H.bodyHeight) < 0.01) {
      pitches = H.storeyPitch; topRoofZone = H.topRoofZone;
    } else {
      const shape = storeys === 3 ? [1.0, 0.93, 0.86] : [1.0, 0.953, 0.884, 0.853, 0.790];
      const sum = shape.reduce((a, b) => a + b, 0);
      const k = (bodyH * 0.808) / sum;
      pitches = shape.map((v) => v * k);
      topRoofZone = bodyH * 0.192;
    }
  }

  /* ------------------------------ colours ------------------------------ */
  const C = vermilion ? {
    column: PAL.vermilion, beam: PAL.vermilionDeep, bracket: PAL.vermilion,
    block: PAL.gatePanel, rafter: PAL.vermilion, panel: PAL.gatePanel,
    door: PAL.vermilionDeep, rail: PAL.vermilion, tint: TINT.warmDeep,
    panelBands: 'soft3', panelTint: TINT.cool,
  } : {
    column: PAL.timberMid, beam: PAL.timberDark, bracket: PAL.timberWarm,
    block: PAL.timberPale, rafter: PAL.timberWarm, panel: PAL.plasterWarm,
    door: PAL.timberDark, rail: PAL.timber, tint: TINT.warm,
    panelBands: 'soft3', panelTint: TINT.cool,
  };
  const R = ROOFING[material] || ROOFING.tile;
  const P = new Parts();

  /* --------------------------- seating on the ground -------------------- */
  const S1 = widths[0];
  const podium = S1 + 2.6;
  /* The datum is the ground at the tower's CENTRE, not at its lowest corner.
   * A machiya is seated on its lowest corner because its floor has to clear
   * the ground everywhere; a pagoda's datum is a surveyed elevation -- every
   * measured height in ARCH.md §5 is from the top of the stone podium -- and
   * dropping the whole tower to the low corner of a sloping site would put the
   * finial two metres under its published height.  The podium's skirt takes up
   * the difference instead, which is what the real 基壇 does. */
  let lowest = Infinity;
  for (const cx of [-podium / 2, podium / 2]) {
    for (const cz of [-podium / 2, podium / 2]) {
      lowest = Math.min(lowest, y !== null ? y : ctx.groundAt(x + cx, z + cz));
    }
  }
  const groundY = y !== null ? y : ctx.groundAt(x, z);
  const drop = clamp(groundY - lowest, 0.25, 3.5) + 0.3;
  const baseY = groundY + plinthH;        // the tower's own zero: podium top

  /* ------------------------------- 基壇 ---------------------------------
   * 「石壇上に建ち、縁はめぐらさない」-- a stone podium and NO ground-level
   * veranda.  The datum for every measured height above is its top surface. */
  {
    const g = box(podium, plinthH + drop, podium);
    g.translate(0, plinthH / 2 - drop / 2, 0);
    P.add(g, PAL.stoneWall, { bands: 3, tint: TINT.cool });
    P.add(box(podium + 0.30, 0.18, podium + 0.30).translate(0, plinthH - 0.09, 0),
      PAL.stone, { bands: 3, tint: TINT.cool });
    // one step, on the door face only -- the compound is tiny and there is no
    // ceremonial approach to speak of
    P.add(box(3.0, 0.28, 0.85).translate(0, plinthH - 0.42, podium / 2 + 0.38),
      PAL.stone, { bands: 3, tint: TINT.cool });
  }

  /* --------------------------- the storey table -------------------------- */
  const table = [];
  let daiwa = 0;
  /* 三手先 total projection == 丸桁の出 exactly -- a closure between two
   * separate Hamashima papers -- so the bracket step is G/3 and does not need
   * to be given separately.  At Hōkan-ji that is 406 mm against the measured
   * 407.  The kit's bracket module steps 0.351 x scale, so scale 1.157 lands
   * on it. */
  const brkScale = (o.bracketStep ?? (G / 3)) / 0.351;
  const brkH = brkScale * 0.99;             // 組物高 -- CONSTANT every storey
  for (let i = 0; i < storeys; i++) {
    daiwa += pitches[i];
    const top = i === storeys - 1;
    const purlinY = daiwa + brkH;
    const noji = top
      ? null
      : (o.nojiPitch || H.nojiPitch)[Math.min(i, (o.nojiPitch || H.nojiPitch).length - 1)] ?? 26;
    table.push({
      i, w: widths[i], span: eaveSpan[i], daiwaY: daiwa, purlinY, noji,
      ji: (o.jiPitch || H.jiPitch)[i] ?? 18, hien: (o.hienPitch || H.hienPitch)[i] ?? 11,
      // the corner rise diminishes with the storey, as the eave does
      rise: cornerRise * (eaveSpan[i] / eaveSpan[0]),
    });
  }
  /* The top roof's apex is not free: 塔身 H₀ is measured to the underside of
   * the 露盤, so the fifth roof is solved to land exactly on it.  That makes
   * it markedly steeper than the four below, which is what the photographs
   * show and what 匠明 prescribes (上重ほど急). */
  const topApex = bodyH;

  /* ------------------------------ 心柱 ----------------------------------
   * 礎石立ち: the shinbashira reaches the ground and stands in the socket of
   * the original Hakuhō 心礎, which is still under the floor and is the reason
   * the pagoda has not moved since the seventh century.  Structurally it
   * carries 0.8 % of the load -- it is a damper, not a column. */
  P.add(post(H.shinbashiraDia / 2, H.shinbashiraDia / 2 * 0.72, topApex + 0.4, far ? 6 : 10),
    C.beam, { bands: 3, tint: C.tint, flat: false });

  /* ------------------------------ storeys ------------------------------- */
  const roofs = [];
  for (const S of table) {
    const hw = S.w / 2;
    const roof = pagodaRoof({
      S: S.w, eaveSpan: S.span, purlinY: S.purlinY, G, jiOut, hienOut,
      noji: S.noji, jiPitch: S.ji, hienPitch: S.hien,
      sori: 0.10, cornerRise: S.rise, thick: R.thick,
      perSide: far ? 2 : 4, rowsCap: far ? 2 : 3,
      apexY: S.i === storeys - 1 ? topApex : null,
    });
    roofs.push(roof);

    /* Where this storey's columns start: on the roof below, at the body
     * radius, less a little so there is no seam. */
    const below = roofs[S.i - 1];
    const floorY = S.i === 0 ? 0 : below.at(hw) - 0.25;
    const colH = S.daiwaY - floorY;

    /* ---------------------------- columns ----------------------------
     * 12 perimeter columns a storey (four corners plus two a side), three
     * bays, 柱径 ~480 mm on the first storey tapering upward. */
    const colR = H.columnDia * 0.5 * (S.w / S1) ** 0.5;
    const cb = centreBay[S.i] ?? S.w * 0.36, sb = sideBay[S.i] ?? S.w * 0.32;
    const cols = [-hw, -cb / 2, cb / 2, hw];
    for (const cx of cols) {
      for (const cz of cols) {
        const onEdge = Math.abs(Math.abs(cx) - hw) < 1e-6 || Math.abs(Math.abs(cz) - hw) < 1e-6;
        if (!onEdge) continue;
        P.add(post(colR, colR * 0.94, colH, far ? 5 : 10).translate(cx, floorY, cz),
          C.column, { bands: 3, tint: C.tint, flat: !far });
      }
    }
    if (S.i === 0) {
      // 四天柱 -- the four interior columns round the 須弥壇, visible through
      // the open plank door
      for (const cx of [-cb / 2, cb / 2]) for (const cz of [-cb / 2, cb / 2]) {
        if (far) break;
        P.add(post(colR * 0.92, colR * 0.88, colH, 8).translate(cx * 0.86, floorY, cz * 0.86),
          C.beam, { bands: 'deep', tint: C.tint });
      }
    }

    /* -------------------------- walls and openings ------------------------
     * 初重: 中央間 板唐戸 (plank door), 脇間 連子窓 (renji lattice window).
     * Upper storeys: the record lists only the door, the renji and the
     * kentozuka -- the infill is `[UNKNOWN]`, plaster or plank.  Plaster is
     * used here because the pale panel is half the tower's value structure
     * and because photographs read light between the dark members. */
    for (let f = 0; f < 4; f++) {
      const fp = [];
      const zf = hw - 0.20;
      const edges = [-hw, -cb / 2, cb / 2, hw];
      for (let b = 0; b < 3; b++) {
        const x0 = edges[b], x1 = edges[b + 1];
        const bw = x1 - x0, cxm = (x0 + x1) / 2;
        const centre = b === 1;
        const hgt = colH - 0.30;
        const midY = floorY + 0.15 + hgt / 2;
        if (centre && S.i === 0) {
          // 板唐戸 -- two plank leaves, standing 0.28 m back inside the reveal
          for (const s of [-1, 1]) {
            fp.push({ geometry: box(bw / 2 - 0.10, hgt, 0.09).translate(cxm + s * bw / 4, midY, zf - 0.28), color: C.door, opts: { bands: 2, tint: C.tint } });
          }
          fp.push({ geometry: box(bw + 0.1, 0.26, 0.34).translate(cxm, floorY + 0.13, hw - 0.10), color: C.beam, opts: { bands: 3, tint: C.tint } });
          fp.push({ geometry: box(bw + 0.1, 0.24, 0.30).translate(cxm, floorY + hgt + 0.22, zf), color: C.beam, opts: { bands: 3, tint: C.tint } });
        } else if (centre || S.i === 0) {
          /* 連子窓 -- square battens set diagonally in a dark recess.  On the
           * first storey they fill both 脇間; above, the centre bay. */
          fp.push({ geometry: box(bw - 0.30, hgt * 0.66, 0.12).translate(cxm, midY, zf - 0.10), color: PAL.timberDark, opts: { bands: 'deep', tint: C.tint } });
          if (!far) {
            const nS = Math.max(3, Math.round((bw - 0.4) / 0.19));
            for (let k = 0; k < nS; k++) {
              const px = cxm - (bw - 0.42) / 2 + (k / (nS - 1)) * (bw - 0.42);
              fp.push({ geometry: box(0.055, hgt * 0.64, 0.055).translate(px, midY, zf - 0.02), color: C.rail, opts: { bands: 3, tint: C.tint } });
            }
          }
          fp.push({ geometry: box(bw - 0.16, hgt * 0.17, 0.14).translate(cxm, midY + hgt * 0.41, zf), color: C.panel, opts: { bands: C.panelBands, tint: C.panelTint } });
          fp.push({ geometry: box(bw - 0.16, hgt * 0.17, 0.14).translate(cxm, midY - hgt * 0.41, zf), color: C.panel, opts: { bands: C.panelBands, tint: C.panelTint } });
        } else {
          fp.push({ geometry: box(bw - 0.10, hgt, 0.14).translate(cxm, midY, zf), color: C.panel, opts: { bands: C.panelBands, tint: C.panelTint } });
        }
        /* 中備 間斗束 -- the strut between the bracket sets.  All three bays
         * on storeys 1-4; the FIFTH STOREY has one in the centre bay only. */
        const kento = S.i === storeys - 1 ? centre : true;
        if (kento && !far) {
          fp.push({ geometry: box(0.20, 0.44, 0.24).translate(cxm, S.daiwaY + 0.22, hw - 0.02), color: C.beam, opts: { bands: 3, tint: C.tint } });
          fp.push({ geometry: box(0.62, 0.16, 0.30).translate(cxm, S.daiwaY + 0.52, hw + 0.04), color: C.bracket, opts: { bands: 3, tint: C.tint } });
        }
      }
      // 台輪 -- the head beam the whole bracket zone sits on
      fp.push({ geometry: box(S.w + 0.26, 0.22, 0.28).translate(0, S.daiwaY - 0.11, hw + 0.02), color: C.beam, opts: { bands: 3, tint: C.tint } });
      // 長押 -- the nageshi rail at the head of the openings
      fp.push({ geometry: box(S.w + 0.10, 0.13, 0.22).translate(0, floorY + colH - 0.26, hw + 0.01), color: C.beam, opts: { bands: 3, tint: C.tint } });
      P.all(xform(fp, _m4().makeRotationY(f * Math.PI / 2)));
    }

    /* --------------------------- 三手先 brackets ---------------------------
     * Three-stepped, 407 mm per step, 1.218 m total -- which closes exactly
     * with the separately-measured 丸桁の出.  **Every bracket member on the
     * real building is the same size on all five storeys**, so one set is
     * modelled and instanced twelve times a storey, sixty in all.
     *
     * The kit's bracket module is 0.26 x scale with a 1.35 step, i.e.
     * 0.351 x scale per step; scale 1.16 lands on the measured 407 mm exactly.
     */
    if (!far) {
      const seats = [-hw, -cb / 2, cb / 2, hw];
      for (let f = 0; f < 4; f++) {
        const fp = [];
        for (const px of seats) {
          if (Math.abs(Math.abs(px) - hw) < 1e-6) continue;   // corners: below
          fp.push(...brackets({
            x: px, y: S.daiwaY, z: hw - 0.10, steps: 3, scale: brkScale,
            color: C.bracket, block: C.block,
          }));
        }
        P.all(xform(fp, _m4().makeRotationY(f * Math.PI / 2)));
      }
      // 隅斗栱 -- the corner sets, turned out on the diagonal
      for (let c = 0; c < 4; c++) {
        const cl = brackets({
          x: 0, y: S.daiwaY, z: hw * Math.SQRT2 - 0.14, steps: 3, scale: brkScale * 1.04,
          color: C.bracket, block: C.block,
        });
        P.all(xform(cl, _m4().makeRotationY(Math.PI / 4 + c * Math.PI / 2)));
      }
    } else {
      for (let f = 0; f < 4; f++) {
        const g = box(S.w + 2.4, brkH * 0.9, 1.2);
        g.translate(0, S.daiwaY + brkH * 0.45, hw + 0.5);
        xform([{ geometry: g }], _m4().makeRotationY(f * Math.PI / 2));
        P.add(g, C.bracket, { bands: 3, tint: C.tint });
      }
    }

    /* ---------------------------- 二軒繁垂木 -----------------------------
     * Two tiers of close-set parallel rafters -- 地垂木 inside, 飛檐垂木 out
     * -- at the 203 mm 支 pitch, which is 68 to a side on the first storey.
     * They are the single most expensive thing in this file and they earn it:
     * a Japanese eave seen from below is a comb of shadow, and you spend a lot
     * of this game standing under one looking up.
     *
     * Simplification, stated: the real rafters stop against the 隅木 on the
     * corner diagonal.  Here each side runs the full eave span and the two
     * sets interpenetrate inside the corner square, under the 隅木 that is
     * laid over them -- invisible from any standing viewpoint and it saves
     * per-rafter length solving. */
    if (!far) {
      for (let f = 0; f < 4; f++) {
        const inner = rafters({
          w: S.span - 0.1, depth: jiOut + 0.55, y: 0, z: 0,
          spacing: eda, size: 0.095 * (eda / EDA), color: C.rafter, double: false,
        });
        xform(inner, _m4().makeRotationX(S.ji * DEG));
        toFace(inner, 0, S.purlinY - 0.16, roof.rp - 0.55, f * Math.PI / 2);
        P.all(inner);

        const outer = rafters({
          w: S.span - 0.05, depth: hienOut, y: 0, z: 0,
          spacing: eda, size: 0.078 * (eda / EDA), color: C.rafter, double: false,
        });
        xform(outer, _m4().makeRotationX(S.hien * DEG));
        toFace(outer, 0, roof.at(roof.rk) - 0.30, roof.rk, f * Math.PI / 2);
        P.all(outer);
      }
      /* 隅木 -- the hip rafter, laid on the diagonal from the purlin ring out
       * to the lifted corner.  It follows the roof's OWN corner profile: a
       * corner is 1.414x further out than the eave's mid-side, so a hip rafter
       * given the mid-side pitch plunges a couple of metres below the roof and
       * turns the eave into a drooping wing. */
      for (let c = 0; c < 4; c++) {
        const r0 = roof.rp * Math.SQRT2, r1 = roof.re * Math.SQRT2;
        const y0 = S.purlinY - 0.16, y1 = roof.at(roof.re) + S.rise - 0.22;
        const L = Math.hypot(r1 - r0, y0 - y1);
        const g = box(0.19, 0.24, L);
        g.rotateX(Math.atan2(y0 - y1, r1 - r0));
        g.translate(0, (y0 + y1) / 2, (r0 + r1) / 2);
        xform([{ geometry: g }], _m4().makeRotationY(Math.PI / 4 + c * Math.PI / 2));
        P.add(g, PAL.timberDark, { bands: 3, tint: C.tint });
      }
    }

    /* ------------------------------- the roof ------------------------------ */
    P.add(roof.shell, R.top, { bands: R.bands, tint: R.tint });
    P.add(roof.soffit, C.rafter, { bands: 3, tint: C.tint });

    /* 降棟 and 鬼瓦: hip ridges to the four corners and a demon-face end block
     * at each -- 「鬼瓦 at the four corners of every roof」.  A 檜皮葺 roof has
     * neither; it gets soft bark rolls instead, which is why this is gated on
     * the material. */
    if (!far) {
      for (let c = 0; c < 4; c++) {
        const tip = roof.re * Math.SQRT2;
        const apex = roof.apexY;
        const tipY = roof.at(roof.re) + S.rise;
        const L = Math.hypot(tip, apex - tipY);
        const g = box(0.30, 0.16, L);
        g.rotateX(Math.atan2(apex - tipY, tip));
        g.translate(0, (apex + tipY) / 2 + 0.09, tip / 2);
        xform([{ geometry: g }], _m4().makeRotationY(Math.PI / 4 + c * Math.PI / 2));
        P.add(g, material === 'hiwada' ? PAL.hiwadaEdge : PAL.tileRidge,
          { bands: 3, tint: R.tint });
        if (material !== 'hiwada') {
          const on = box(0.42, 0.46, 0.20);
          on.translate(0, tipY + 0.26, tip - 0.22);
          xform([{ geometry: on }], _m4().makeRotationY(Math.PI / 4 + c * Math.PI / 2));
          P.add(on, PAL.tileRidge, { bands: 3, tint: TINT.cool });
        }
      }
    }

    /* --------------------------- 縁 and 高欄 ------------------------------
     * **Fifth storey only.**  Not a stylistic choice -- it is the building's
     * single most distinctive elevational feature and the thing that tells
     * Hōkan-ji apart from every other five-storey pagoda in Japan. */
    const wantsVeranda = (o.veranda || H.veranda)[S.i] ?? false;
    if (wantsVeranda && !far && below) {
      const out = 1.25;
      const dw = S.w + out * 2;
      const dy = below.at(hw) + 0.16;
      P.add(box(dw, 0.14, dw).translate(0, dy, 0), C.beam, { bands: 3, tint: C.tint });
      const nPost = Math.max(4, Math.round(dw / 1.35));
      for (let f = 0; f < 4; f++) {
        const fp = [];
        for (let k = 0; k <= nPost; k++) {
          const px = -dw / 2 + (k / nPost) * dw;
          fp.push({ geometry: box(0.10, 0.60, 0.10).translate(px, dy + 0.37, dw / 2 - 0.08), color: C.rail, opts: { bands: 3, tint: C.tint } });
        }
        fp.push({ geometry: box(dw, 0.12, 0.16).translate(0, dy + 0.70, dw / 2 - 0.08), color: C.rail, opts: { bands: 3, tint: C.tint } });
        fp.push({ geometry: box(dw, 0.07, 0.10).translate(0, dy + 0.40, dw / 2 - 0.08), color: C.rail, opts: { bands: 3, tint: C.tint } });
        // 腕木 -- the brackets that carry the deck out over the roof below
        for (let k = 0; k <= 3; k++) {
          const px = -dw / 2 + (k / 3) * dw;
          fp.push({ geometry: box(0.10, 0.12, out * 1.4).translate(px, dy - 0.12, dw / 2 - out * 0.7), color: C.beam, opts: { bands: 3, tint: C.tint } });
        }
        P.all(xform(fp, _m4().makeRotationY(f * Math.PI / 2)));
      }
    }
  }

  /* -------------------------------- 相輪 -------------------------------- */
  P.all(sorin({
    height: sorinLen, y: bodyH, S1, rings: 9, lod: far ? 'far' : 'full',
  }).list);

  /* ------------------------------ bake it ------------------------------- */
  const own = !baker;
  const B = baker || new Baker(name);
  const M = trs(x, baseY, z, 0, ry, 0);
  for (const p of P.list) B.add(p.geometry, M, p.color, p.opts);

  let group = null;
  if (own) {
    group = B.build();
    group.name = name;
    ctx.add(group);
    /* The drawn outline.  Four or five objects in this world earn one, and the
     * pagoda is the first: it is read at every distance from 4 m to 400 m, and
     * a clip-space hull is the only line that holds a constant weight across
     * that range.  See core/outline.js. */
    if (outline !== false) {
      hullOutlineTree(group, { thickness: far ? 0.0022 : 0.0030 });
      group.traverse((n) => {
        if (n.userData.isOutline) { n.castShadow = false; n.userData.noShadow = true; }
      });
    }
  }

  if (collide) {
    ctx.collideRot(x, z, podium, podium, ry);
    ctx.platform({
      x0: x - podium / 2 - 0.2, z0: z - podium / 2 - 0.2,
      x1: x + podium / 2 + 0.2, z1: z + podium / 2 + 0.2,
      top: groundY + plinthH,
    });
  }

  return {
    group, baker: B, triangles: P.count,
    x, z, ry, groundY, baseY,
    apexY: baseY + bodyH,
    top: baseY + bodyH + sorinLen,
    storeys: table, roofs, sorinLength: sorinLen,
  };
}

/* ------------------------------------------------------------------ *
 * 五重塔 -- the five-storey pagoda.
 *
 * Defaults are the Yasaka Pagoda exactly, from the measured survey: 38.79 m
 * from the top of the stone podium to the tip of the 宝珠, on a 6.303 m
 * first-storey column grid under a 13.909 m first roof.  永享12年 (1440),
 * 足利義教; the only surviving 利生塔 of the sixty-six the Ashikaga raised, and
 * one of the first buildings in Japan to be protected (1897).
 * ------------------------------------------------------------------ */
export function makeFiveStoreyPagoda(ctx, opts = {}) {
  return makePagoda(ctx, {
    vermilion: false, material: 'tile', name: 'yasakaPagoda', ...opts,
  });
}

/* ------------------------------------------------------------------ *
 * 三重塔 -- the three-storey pagoda.
 *
 * Kiyomizu-dera's (1632) is **30.2 m** -- the temple's own figure is 「約30m」
 * and the only value published with a decimal is 30.2; the 31 m in circulation
 * is a Wikipedia outlier.  It is vermilion with 極彩色 detail under 本瓦葺, on
 * a first storey of about 6.0 m, and it tapers *slowly* (~0.88 a storey),
 * which is why it reads as a fat pagoda and why the temple calls it
 * 「国内最大級」 -- among the largest.  **Not** the tallest; do not claim it.
 * ------------------------------------------------------------------ */
export function makeThreeStoreyPagoda(ctx, opts = {}) {
  const S = opts.storeyWidths || [6.0, 5.3, 4.6];
  const E = opts.eaveSpan || [13.2, 12.6, 12.0];
  return makePagoda(ctx, {
    storeyWidths: S, eaveSpan: E,
    height: 30.2, sorinHeight: 9.0, bodyHeight: 21.2,
    centreBay: S.map((w) => w * 0.358), sideBay: S.map((w) => w * 0.321),
    marugetaOut: 1.15, jiDarukiOut: 1.55, hienDarukiOut: 0.95,
    nojiPitch: [24, 28, null], jiPitch: [17.5, 19.5, 21.5], hienPitch: [10.0, 11.5, 13.0],
    cornerRise: 0.52, veranda: [false, false, false],
    vermilion: true, material: 'tile', name: 'sanjunoto',
    ...opts,
  });
}

export { makePagoda, pagodaRoof };
