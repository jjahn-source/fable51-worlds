import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT, cel, celTex, flat } from '../core/toon.js';
import { rngKit, trs, bake, clamp, lerp } from '../core/util.js';
import { make, cached, hex, mixHex, vertical, centered, grain } from '../core/textures.js';
import { hipRoof, gableRoof } from '../kit/roof.js';

/* ------------------------------------------------------------------ *
 * 東大路通 -- Higashioji-dori.  The arterial.
 *
 * ------------------------------------------------------------ THE POINT
 *
 * This street is not a hero and it is not supposed to be.  It is the reason
 * the hero streets read as historic: 21.8 m of four-lane asphalt, poles,
 * transformers, a sky full of wire, buses, signals and ordinary 1970s city
 * building, and then you turn east off it into 八坂通 and the wires stop, the
 * paving turns to granite and the buildings drop to two storeys of timber.
 * That step is the whole of Higashiyama's arrival, and it only exists if the
 * thing you step out of is genuinely modern.
 *
 * So the brief here is the opposite of everywhere else in the project: build
 * *background*.  Good proportion, a strong horizontal ground-floor line, no
 * two boxes identical, and nothing that asks to be looked at.
 *
 * ------------------------------------------------------------ THE STREET
 *
 * 1141 m of corridor from z = -720 (north of Shijo) to z = +420, climbing
 * 40.2 -> 58.4 m.  Half-width 7.0 (so a 14 m carriageway: four 3.5 m lanes,
 * which is what the road table's 21.82 m = 72 尺 reserve gives once the two
 * footways are taken out), frontage 10.0.  ARCH 3.4 / GEO's road table.
 *
 * `streets.js` has already laid the asphalt and, because this is the only
 * corridor in the world with `surface: 'asphalt'` and `half > 5`, the raised
 * footways and their kerb platforms.  Everything above the paving is here.
 *
 * ------------------------------------------------------------ THE WIRES
 *
 * STREET 3.2, `[V]`, is unambiguous: **東大路通 has full overhead** while
 * Hanamikoji (2001), Nene-no-michi (1998) and the whole Sannenzaka district
 * (2004-08) are undergrounded.  Kansai poles are 11-16 m at about 30 m
 * spacing; the two sides here are staggered by ~11 m, because `props.js`
 * chains every pole to its two nearest neighbours within 46 m and a staggered
 * pair of runs is what turns that into a genuine tangle *across* the road
 * rather than two tidy parallel lines.  Crossing the carriageway is the entire
 * visual point of the wires.
 *
 * --------------------------------------------------------- THE JUNCTIONS
 *
 * Three, and they are gateways rather than crossroads:
 *
 *   四条通       z = -576.1   Gion.  The busiest corner on the route.
 *   八坂通       z =  -16.5   the pagoda street.  Turn east here and the
 *                             world changes in ten metres.
 *   清水道       z = +103.3   the Kiyomizu approach and its bus stop, which
 *                             is where most of the hill's foot traffic lands.
 *
 * Each gets a signalled crossing, a stop bar, street-name plates and a break
 * in the frontage, and the east frontage stops short of each so that the
 * mouth of the historic street is a hole in a wall of city.
 * ------------------------------------------------------------------ */

export const id = 'higashioji';

const ST = 'higashioji';
const HALF = 7.0;            // carriageway half-width
const FOOT_OUT = 10.7;       // outer edge of the footway platform (streets.js)
const FACE = 10.5;           // the building line, just inside the footway edge
const POLE_OFF = 10.15;      // poles at the back of the footway
const PAINT = 0.055;         // road markings, clear of the paving's 0.02 lift

/* Wall tones.  Six, all from the palette's stone/plaster band, because a
 * 1970s Kyoto street is tile, painted render and fair-faced concrete and
 * nothing else -- but never the same one twice running. */
const WALLS = [
  PAL.concrete, PAL.plasterGrey, PAL.mortar, PAL.plasterWarm,
  PAL.plasterDark, PAL.concreteDark,
];

/* ------------------------------------------------------------------ *
 * The signage atlas.
 *
 * Eight printed faces on one 1024 canvas, so every sign on 569 m of arterial
 * -- projecting 袖看板, fascia bands, the bus stop board, the street-name
 * plates, the coin-park and forecourt boards -- is ONE mesh and ONE material.
 * Kyoto's 屋外広告物条例 does most of the art direction for us: no rooftop
 * signage anywhere in the city, muted grounds, and mincho rather than gothic.
 * ------------------------------------------------------------------ */

/** uv cells: [u0, v0, u1, v1]. */
const CELL = {
  coffee:   [0.00, 0.50, 0.25, 1.00],
  kusuri:   [0.25, 0.50, 0.50, 1.00],
  fudosan:  [0.50, 0.50, 0.75, 1.00],
  yugijo:   [0.75, 0.50, 1.00, 1.00],
  busStop:  [0.00, 0.25, 0.50, 0.50],
  plate:    [0.50, 0.25, 1.00, 0.50],
  parking:  [0.00, 0.00, 0.50, 0.25],
  fuel:     [0.50, 0.00, 1.00, 0.25],
};

function signAtlas() {
  return cached('oji.signs', () => make(1024, 1024, (c, W, H) => {
    c.clearRect(0, 0, W, H);

    /* --- the four projecting signs, 256 x 512 each, along the top --- */
    const vsign = (i, text, ground, ink, accent) => {
      const x = i * 256, w = 256, h = 512;
      c.save();
      c.beginPath(); c.rect(x, 0, w, h); c.clip();
      c.fillStyle = hex(ground);
      c.fillRect(x, 0, w, h);
      grain(c, W, H, 0.03, 7 + i);
      c.strokeStyle = hex(accent);
      c.lineWidth = 9;
      c.strokeRect(x + 12, 12, w - 24, h - 24);
      const chars = [...text];
      const size = Math.min(w * 0.60, (h * 0.80) / chars.length * 1.06);
      vertical(c, text, x + w * 0.5, h * 0.5 - size * (chars.length - 1) * 0.56,
               size * 1.12, size, hex(ink));
      c.restore();
    };
    vsign(0, '珈琲', PAL.paperWarm, 0x4a3a33, 0x6b5040);
    vsign(1, 'くすり', PAL.plaster, 0x2f4438, PAL.norenGreen);
    vsign(2, '不動産', PAL.plasterWarm, PAL.black, 0x8e867f);
    vsign(3, '遊技場', 0x4a3f38, PAL.paperWarm, 0x8a7f74);

    /* --- 京都市バス stop board --- */
    c.save();
    c.beginPath(); c.rect(0, 512, 512, 256); c.clip();
    c.fillStyle = hex(0x2f4438);
    c.fillRect(0, 512, 512, 256);
    c.fillStyle = hex(PAL.paper);
    c.fillRect(14, 526, 484, 228);
    c.fillStyle = hex(0x2f4438);
    c.fillRect(14, 526, 484, 52);
    centered(c, '京都市バス', 256, 552, 300, 34, hex(PAL.paper));
    centered(c, '東山安井', 256, 630, 380, 74, hex(PAL.black));
    centered(c, 'Higashiyama Yasui', 256, 700, 380, 30, hex(0x585460));
    c.strokeStyle = hex(0x2f4438); c.lineWidth = 5;
    c.strokeRect(14, 526, 484, 228);
    c.restore();

    /* --- the 通り名 plate: white on dark green, kanji over romaji --- */
    c.save();
    c.beginPath(); c.rect(512, 512, 512, 256); c.clip();
    c.fillStyle = hex(0x27503f);
    c.fillRect(512, 512, 512, 256);
    c.strokeStyle = hex(PAL.paper); c.lineWidth = 4;
    c.strokeRect(524, 524, 488, 232);
    centered(c, '東大路通', 768, 596, 420, 78, hex(PAL.paper));
    centered(c, 'Higashioji dori', 768, 686, 420, 40, hex(PAL.paper));
    c.restore();

    /* --- 時間貸駐車場 --- */
    c.save();
    c.beginPath(); c.rect(0, 768, 512, 256); c.clip();
    c.fillStyle = hex(0x2c3c58);
    c.fillRect(0, 768, 512, 256);
    c.fillStyle = hex(PAL.paperWarm);
    c.fillRect(16, 784, 480, 118);
    centered(c, '時間貸駐車場', 256, 842, 430, 78, hex(0x2c3c58));
    centered(c, '８：００〜２０：００　２００円／３０分', 256, 942, 470, 40, hex(PAL.paper));
    c.restore();

    /* --- the forecourt price board --- */
    c.save();
    c.beginPath(); c.rect(512, 768, 512, 256); c.clip();
    c.fillStyle = hex(0x3a4048);
    c.fillRect(512, 768, 512, 256);
    c.fillStyle = hex(PAL.paperWarm);
    c.fillRect(528, 782, 480, 60);
    centered(c, 'セルフ給油所', 768, 812, 380, 44, hex(0x3a4048));
    centered(c, 'レギュラー　１６１', 768, 890, 450, 46, hex(PAL.paperWarm));
    centered(c, 'ハイオク　　１７２', 768, 954, 450, 46, hex(PAL.paperWarm));
    c.restore();
  }));
}

/** Give a PlaneGeometry the uv of one atlas cell. */
function uvCell(geo, cellName) {
  const [u0, v0, u1, v1] = CELL[cellName];
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, lerp(u0, u1, uv.getX(i)), lerp(v0, v1, uv.getY(i)));
  }
  uv.needsUpdate = true;
  return geo;
}

/* ------------------------------------------------------------------ *
 * Plot layout.
 *
 * Not `layoutPlots`: that snaps frontages to the 京間 ken, which is exactly
 * right for a machiya row and exactly wrong here.  A post-war city block is
 * dimensioned off the plot it replaced and the lift core it needs, and it runs
 * 8-24 m.  What it keeps from the machiya street is the *sequence* rule -- a
 * wide frontage is followed by narrow ones -- because a run of equal boxes is
 * the single thing that makes a procedural street look procedural.
 * ------------------------------------------------------------------ */
function blockPlots(c, side, s0, s1, rng, skips) {
  const out = [];
  const widths = [10, 13, 16, 20, 24];
  let s = s0, prev = 13, guard = 0;
  while (s < s1 && guard++ < 400) {
    let w = rng.pick(widths);
    if (prev >= 20) w = rng.pick([10, 13, 16]);
    if (s + w > s1) break;
    const mid = s + w / 2;
    const p = c.pointAt(mid);
    const skipped = skips.some(([a, b]) => mid > a && mid < b);
    if (!skipped) {
      const nx = -p.tz * side, nz = p.tx * side;
      const fx = p.x + nx * FACE, fz = p.z + nz * FACE;
      const a = c.pointAt(mid - w / 2), b = c.pointAt(mid + w / 2);
      const ax = a.x + (-a.tz * side) * FACE, az = a.z + (a.tx * side) * FACE;
      const bx = b.x + (-b.tz * side) * FACE, bz = b.z + (b.tx * side) * FACE;
      out.push({
        x: fx, z: fz, ry: Math.atan2(nx, nz), width: w, s: mid,
        nx, nz, side, ax, az, bx, bz,
      });
    }
    prev = w;
    s += w + rng.range(0.3, 1.6);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * One ordinary building.
 *
 * Built in a local frame: origin at the centre of the facade on the ground,
 * the facade in the z = 0 plane facing -z, the body running back into +z --
 * the same convention `machiya.js` uses, so the two kits can stand next to
 * each other.
 *
 * The thing that has to be right is the **horizontal split**.  A Japanese
 * commercial block is a glazed, recessed, cluttered ground floor under a
 * blank-ish gridded slab, and the line between them is a projecting fascia at
 * about 4 m.  Get that band and its shadow and the massing reads correctly
 * however plain the rest is; miss it and you have a stack of window bands.
 *
 * Per KIT.md section 10 the recess is *built outward*: the upper mass is a
 * box that stops at the facade line, the ground-floor volume stops 0.9 m
 * short of it, and piers, a header, a threshold and a dark interior backdrop
 * fill the gap.  You cannot carve a shopfront out of a box.
 * ------------------------------------------------------------------ */

const O = {
  wall:  { bands: 'soft3', tint: TINT.cool },
  wallD: { bands: 3, tint: TINT.cool },
  dark:  { bands: 'deep', tint: TINT.cool },
  metal: { bands: 4, tint: TINT.cool, flat: false },
  tile:  { bands: 3, tint: TINT.cool },
  timber:{ bands: 3, tint: TINT.warm },
};

class Parts {
  constructor() { this.list = []; }
  add(g, color, opts) { this.list.push({ geometry: g, color, opts: opts || O.wall }); return this; }
  /** A box given by its two opposite corners, in the local frame. */
  bx(x0, y0, z0, x1, y1, z1, color, opts) {
    const g = new THREE.BoxGeometry(
      Math.max(0.004, Math.abs(x1 - x0)),
      Math.max(0.004, Math.abs(y1 - y0)),
      Math.max(0.004, Math.abs(z1 - z0))
    );
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return this.add(g, color, opts);
  }
  many(list) { for (const p of list) this.list.push(p); return this; }
}

/**
 * @param spec  { width, depth, floors, storey, style, wall, base }
 * @returns     { height, frontProj }
 */
function cityBuilding(P, spec, rng) {
  const {
    width: W, depth: D, floors, storey, style, wall, trim,
  } = spec;

  const GF = style === 'pachinko' ? 5.4 : style === 'bank' ? 4.6 : 4.05;
  const REC = style === 'konbini' ? 0.55 : 0.92;   // shopfront recess
  const SKIN = 0.22;                                // window reveal depth
  const TOP = GF + floors * storey;
  const hw = W / 2;

  /* -------- the mass ------------------------------------------------ */
  // the core, held back from the facade line by the window reveal
  P.bx(-hw, GF, SKIN, hw, TOP, D, wall, O.wall);
  // the ground-floor volume, held back further for the shopfront recess
  P.bx(-hw, 0, REC, hw, GF, D, wall, O.wallD);
  // the flanks run right out to the facade line: a party wall has no reveal
  for (const s of [-1, 1]) {
    P.bx(s * hw, 0, 0, s * (hw - 0.24), TOP, SKIN + 0.02, wall, O.wallD);
  }

  /* -------- the ground floor, built outward ------------------------- */
  const bays = Math.max(2, Math.round(W / 4.4));
  const bayW = W / bays;
  const pierW = 0.34;
  for (let i = 0; i <= bays; i++) {
    const x = -hw + i * bayW;
    const pw = (i === 0 || i === bays) ? 0.46 : pierW;
    P.bx(x - pw / 2, 0, 0, x + pw / 2, GF - 0.4, REC, wall, O.wallD);
  }
  // the header the upper mass sits on, and the shadow it throws
  P.bx(-hw, GF - 0.4, -0.06, hw, GF, REC, trim, O.wallD);
  // the threshold: a granite step across the whole frontage
  P.bx(-hw, -0.02, -0.30, hw, 0.16, REC, PAL.paving, O.wallD);

  // the shopfront itself, at the back of the recess
  for (let i = 0; i < bays; i++) {
    const cx = -hw + (i + 0.5) * bayW;
    const w = bayW - pierW - 0.16;
    const shuttered = style !== 'konbini' && style !== 'bank' && rng.chance(0.20);
    if (shuttered) {
      // 電動シャッター, half the shops on a Kyoto arterial after six
      P.bx(cx - w / 2, 0.16, REC - 0.05, cx + w / 2, GF - 0.55, REC, PAL.metalDark, O.metal);
      for (let k = 0; k < 9; k++) {
        const y = 0.28 + k * ((GF - 0.95) / 9);
        P.bx(cx - w / 2, y, REC - 0.10, cx + w / 2, y + 0.05, REC - 0.04, PAL.metal, O.metal);
      }
      P.bx(cx - w / 2 - 0.05, GF - 0.62, REC - 0.16, cx + w / 2 + 0.05, GF - 0.42, REC, PAL.metalDark, O.metal);
    } else {
      /* Glazing.  The interior backdrop first, then the glass in front of it
       * -- and the glass is split, because a shop window is not one value: the
       * upper third carries the sky and the lower two thirds are the dark of
       * the shop.  One extra box, and it is the difference between a window
       * and a painted navy rectangle. */
      const gTop = GF - 0.55, gSky = gTop - (gTop - 0.16) * 0.32;
      P.bx(cx - w / 2, 0.16, REC + 0.30, cx + w / 2, gTop, REC + 0.34,
           PAL.shopInterior, O.dark);
      P.bx(cx - w / 2, 0.16, REC - 0.02, cx + w / 2, gSky, REC + 0.02,
           PAL.glassDark, O.dark);
      P.bx(cx - w / 2, gSky, REC - 0.02, cx + w / 2, gTop, REC + 0.02,
           PAL.glass, { bands: 'soft3', tint: TINT.cool });
      // mullions
      for (let k = 0; k <= 2; k++) {
        const mx = cx - w / 2 + (k / 2) * w;
        P.bx(mx - 0.035, 0.16, REC - 0.06, mx + 0.035, GF - 0.55, REC + 0.03,
             PAL.metalDark, O.metal);
      }
      P.bx(cx - w / 2, GF - 0.58, REC - 0.06, cx + w / 2, GF - 0.50, REC + 0.03,
           PAL.metalDark, O.metal);
      P.bx(cx - w / 2, 0.16, REC - 0.06, cx + w / 2, 0.24, REC + 0.03,
           PAL.metalDark, O.metal);
    }
  }

  /* -------- the fascia: the line that does all the work ------------- */
  P.bx(-hw - 0.06, GF, -0.20, hw + 0.06, GF + 0.62, SKIN + 0.04, trim, O.wallD);
  P.bx(-hw - 0.10, GF + 0.62, -0.24, hw + 0.10, GF + 0.74, SKIN + 0.04,
       mixHex(trim, 0x000000, 0.22) | 0, O.wallD);

  /* -------- the upper storeys --------------------------------------- */
  const wBays = Math.max(2, Math.round(W / 2.9));
  const wBayW = W / wBays;
  const winW = Math.min(1.62, wBayW - 0.60);
  const balcony = style === 'apartment';
  for (let f = 0; f < floors; f++) {
    const y0 = GF + 0.78 + f * storey;
    const sill = y0 + 0.52;
    const head = Math.min(y0 + storey - 0.62, sill + 1.42);
    if (style === 'pachinko' && f === 0) {
      // a pachinko parlour's upper wall is deliberately blank
      P.bx(-hw, y0 - 0.78, 0, hw, y0 - 0.78 + storey, SKIN,
           mixHex(wall, 0x000000, 0.10) | 0, O.wallD);
      continue;
    }
    // spandrel below the window band, and the head band above it
    P.bx(-hw, y0 - 0.78, 0, hw, sill, SKIN, wall, O.wall);
    P.bx(-hw, head, 0, hw, y0 - 0.78 + storey, SKIN, wall, O.wall);
    for (let i = 0; i < wBays; i++) {
      const cx = -hw + (i + 0.5) * wBayW;
      // the pier between windows, out to the facade line
      P.bx(cx - wBayW / 2, sill, 0, cx - winW / 2, head, SKIN, wall, O.wall);
      // the glass, set back in its reveal, sky in the head of the opening
      const wSky = head - (head - sill) * 0.30;
      P.bx(cx - winW / 2, sill, SKIN - 0.03, cx + winW / 2, wSky, SKIN + 0.01,
           PAL.glassDark, O.dark);
      P.bx(cx - winW / 2, wSky, SKIN - 0.03, cx + winW / 2, head, SKIN + 0.01,
           PAL.glass, { bands: 'soft3', tint: TINT.cool });
      // the sill, which is what catches the light on a plain elevation
      P.bx(cx - winW / 2 - 0.09, sill - 0.09, -0.06, cx + winW / 2 + 0.09, sill, SKIN,
           trim, O.wallD);
    }
    P.bx(hw - (wBayW - winW) / 2, sill, 0, hw, head, SKIN, wall, O.wall);

    if (balcony) {
      // the slab, the upstand and the rail: an apartment block's whole face
      P.bx(-hw, y0 - 0.80, -1.05, hw, y0 - 0.66, 0, PAL.concreteDark, O.wallD);
      P.bx(-hw, y0 - 0.66, -1.05, hw, y0 + 0.32, -0.92, PAL.concrete, O.wallD);
      for (let k = 0; k <= Math.round(W / 1.6); k++) {
        const bx2 = -hw + (k / Math.round(W / 1.6)) * W;
        P.bx(bx2 - 0.025, y0 + 0.32, -1.02, bx2 + 0.025, y0 + 0.86, -0.96,
             PAL.metalDark, O.metal);
      }
      P.bx(-hw, y0 + 0.86, -1.04, hw, y0 + 0.92, -0.94, PAL.metalDark, O.metal);
    }
  }

  /* -------- the flanks, where they are seen ------------------------- *
   * A mid-block building presents a party wall to its neighbour and that is
   * correct -- an exposed blank flank is one of the most Japanese things about
   * a Japanese street.  A building on a **corner** is a different animal: it
   * has two elevations, and leaving its flank blank turns the mouth of
   * Yasaka-dori into a slot between two cliffs, which is exactly what the
   * first render of the gateway showed. */
  if (spec.flank) {
    const nF = Math.max(2, Math.round(D / 3.4));
    for (const sd of [-1, 1]) {
      const fx = sd * hw;
      // the fascia and the parapet, returned down the side
      P.bx(fx, GF, SKIN, fx - sd * 0.10, GF + 0.62, D - 0.2, trim, O.wallD);
      P.bx(fx, GF + 0.62, SKIN, fx - sd * 0.16, GF + 0.74, D - 0.2,
           mixHex(trim, 0x000000, 0.22) | 0, O.wallD);
      for (let f = 0; f < floors; f++) {
        const y0 = GF + 0.78 + f * storey;
        const sill = y0 + 0.52, head = Math.min(y0 + storey - 0.62, sill + 1.42);
        for (let i = 0; i < nF; i++) {
          const z0 = 1.0 + (i + 0.5) * ((D - 2.0) / nF) - 0.62;
          P.bx(fx, sill, z0, fx - sd * 0.10, head, z0 + 1.24, PAL.glassDark, O.dark);
          P.bx(fx + sd * 0.02, sill - 0.09, z0 - 0.09, fx - sd * 0.08, sill,
               z0 + 1.33, trim, O.wallD);
        }
      }
      // the downpipe, which is what actually breaks a blank flank up
      P.bx(fx + sd * 0.02, 0, D * 0.7, fx - sd * 0.12, TOP, D * 0.7 + 0.14,
           PAL.plasterGrey, O.wallD);
    }
  }

  /* -------- the top ------------------------------------------------- */
  let height = TOP;
  const pitched = spec.pitched;
  if (pitched) {
    /* Kyoto's 2007 新景観政策 pushed new work back toward 勾配屋根, and a few
     * of these have been re-roofed since.  Low pitch, tile, deep eave. */
    const r = hipRoof({
      w: W, d: D, pitch: 0.30, eave: 0.85, material: rng.chance(0.3) ? 'tileOld' : 'tile',
      mukuri: 0.02, y: TOP, ry: 0,
    });
    for (const p of r.parts) p.geometry.translate(0, 0, D / 2);
    P.many(r.parts);
    height = r.ridgeY;
  } else {
    // a parapet, a coping, and the plant that lives behind it
    P.bx(-hw - 0.08, TOP, -0.14, hw + 0.08, TOP + 0.86, SKIN + 0.10, wall, O.wallD);
    P.bx(-hw - 0.14, TOP + 0.86, -0.20, hw + 0.14, TOP + 1.00, SKIN + 0.16,
         mixHex(trim, 0x000000, 0.18) | 0, O.wallD);
    for (const s of [-1, 1]) {
      P.bx(s * hw, TOP, SKIN, s * (hw + 0.08), TOP + 0.72, D, wall, O.wallD);
    }
    P.bx(-hw, TOP, D - 0.10, hw, TOP + 0.72, D, wall, O.wallD);
    height = TOP + 1.0;
    // 高置水槽 and the lift overrun -- the silhouette above a Japanese parapet
    const tx = rng.range(-hw * 0.4, hw * 0.4);
    P.bx(tx - 1.05, TOP + 0.9, D * 0.45, tx + 1.05, TOP + 2.05, D * 0.45 + 1.9,
         PAL.metalWarm, O.metal);
    for (const sx of [-0.85, 0.85]) for (const sz of [0.25, 1.65]) {
      P.bx(tx + sx - 0.06, TOP, D * 0.45 + sz - 0.06, tx + sx + 0.06, TOP + 0.9,
           D * 0.45 + sz + 0.06, PAL.metalDark, O.metal);
    }
    if (floors >= 3) {
      P.bx(hw - 2.6, TOP, D * 0.62, hw - 0.5, TOP + 2.4, D * 0.62 + 2.4,
           mixHex(wall, 0x000000, 0.06) | 0, O.wallD);
      height = TOP + 2.4;
    }
  }
  return { height, GF, REC, SKIN, bays, bayW };
}

/* ------------------------------------------------------------------ *
 * build
 * ------------------------------------------------------------------ */
export function build(ctx) {
  const c = ctx.getCorridor(ST);
  if (!c) { console.warn('[higashioji] no corridor'); return {}; }

  const rng = rngKit(88117);
  const L = c.length;
  const out = { buildings: [], junctions: [] };

  /* ---------------------------------------------------------------- *
   * Four bakers, not one.
   *
   * A merged mesh is a single frustum-cull unit, and this district is 1141 m
   * long -- a quarter of the world's north-south extent.  Baked into one
   * bucket, every shopfront in Gion would be submitted while you stand at
   * Kiyomizu-michi.  So the street is cut into four ~295 m blocks and every
   * piece of geometry is routed to the block it stands in, which is what
   * `ctx.baker()`'s "or per block within a big district" is for.
   *
   * `B.add` has the Baker's own signature, so nothing downstream knows.
   * ---------------------------------------------------------------- */
  const NZ = 4;
  const Z0 = -740, Z1 = 440, ZW = (Z1 - Z0) / NZ;
  const blocks = [];
  for (let i = 0; i < NZ; i++) blocks.push(ctx.baker(ST + '.' + i));
  const _bs = new THREE.Sphere();
  const B = {
    add(g, m, color, opts) {
      let z;
      if (m) z = m.elements[14];
      else {
        if (!g.boundingSphere) g.computeBoundingSphere();
        z = g.boundingSphere ? g.boundingSphere.center.z : 0;
      }
      blocks[clamp(Math.floor((z - Z0) / ZW), 0, NZ - 1)].add(g, m, color, opts);
      return B;
    },
  };

  /** Arc length at a given z on the centreline. */
  const sAtZ = (z) => {
    const pts = c.points;
    let run = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const seg = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
      if ((pts[i].z <= z && pts[i + 1].z >= z) || i === pts.length - 2) {
        const dz = pts[i + 1].z - pts[i].z;
        const t = Math.abs(dz) > 1e-6 ? clamp((z - pts[i].z) / dz, 0, 1) : 0;
        return run + seg * t;
      }
      run += seg;
    }
    return run;
  };

  /** A frame on the street: `off` is metres EAST of the centreline. */
  const at = (s, off = 0, dy = 0) => {
    const p = c.pointAt(clamp(s, 0, L));
    const ex = p.tz, ez = -p.tx;                 // the east-pointing normal
    const x = p.x + ex * off, z = p.z + ez * off;
    return {
      x, z, y: ctx.groundAt(x, z) + dy, s,
      /* ry = 0 faces -z; a facade looking WEST (from the east side) needs
       * ry = atan2(nx, nz) with n the outward normal, per plots.js. */
      faceWest: Math.atan2(ex, ez),
      faceEast: Math.atan2(-ex, -ez),
      along: Math.atan2(-p.tx, -p.tz),
      ex, ez, tx: p.tx, tz: p.tz,
    };
  };

  const S_SHIJO = sAtZ(-576.1);
  const S_YASAKA = sAtZ(-16.5);
  const S_KIYOMIZU = sAtZ(103.3);

  /* ================================================================ *
   * 1.  The frontage.
   * ================================================================ */
  const skipsWest = [
    [S_SHIJO - 24, S_SHIJO + 24],
    [S_KIYOMIZU - 40, S_KIYOMIZU - 12],      // the coin park by the bus stop
  ];
  const skipsEast = [
    [S_SHIJO - 26, S_SHIJO + 26],
    // 八坂神社's west approach: the shrine's forecourt, not a frontage
    [sAtZ(-660), sAtZ(-506)],
    [S_YASAKA - 26, S_YASAKA + 24],
    [S_KIYOMIZU - 24, S_KIYOMIZU + 26],
  ];

  /* Coin parks are collected and built after the signage atlas helper exists,
   * because their board is a printed face like any other. */
  const parks = [];

  const styleBag = [
    'block', 'block', 'block', 'apartment', 'block', 'shophouse',
    'block', 'apartment', 'block', 'bank', 'block', 'pachinko',
  ];
  let styleI = 0;

  for (const side of [-1, 1]) {           // -1 = east, +1 = west
    const east = side < 0;
    const plots = blockPlots(
      c, side, 14, L - 14, rngKit(4001 + side * 17),
      east ? skipsEast : skipsWest
    );
    let prevWall = null;
    plots.forEach((p, i) => {
      /* Gaps in the frontage are not laziness -- a Kyoto arterial is about a
       * fifth surface car park, and the holes are where you see the hill. */
      if (rng.chance(0.13)) { p.vacant = true; return; }

      let style = styleBag[(styleI++) % styleBag.length];
      if (p.width < 11 && style === 'apartment') style = 'block';
      if (p.width > 19 && style === 'shophouse') style = 'block';
      // one convenience store on the whole street, near the bus stop
      if (east && Math.abs(p.s - (S_KIYOMIZU + 62)) < 26 && p.width > 13) style = 'konbini';

      /* Height variety is the difference between a street and a wall.  The
       * 歴史遺産型美観地区 height limit on this stretch is 15 m, and 20 m
       * north of Shijo, so: two storeys to five, weighted to three. */
      const floors = style === 'shophouse' ? 1
        : style === 'konbini' ? 0
        : style === 'pachinko' ? 2
        : style === 'apartment' ? rng.int(3, 5)
        : rng.pick([2, 2, 3, 3, 3, 4, 4, 5]);
      const storey = style === 'apartment' ? 2.95 : 3.35;
      const depth = clamp(p.width * rng.range(0.8, 1.25), 9, 17);
      const wall = rng.pickNot(WALLS, prevWall);
      prevWall = wall;

      const base = Math.min(ctx.groundAt(p.ax, p.az), ctx.groundAt(p.bx, p.bz),
                            ctx.groundAt(p.x, p.z));
      const P = new Parts();

      let r;
      if (style === 'konbini') {
        r = konbini(P, { width: p.width, depth: Math.min(depth, 13) }, rng);
      } else if (style === 'shophouse') {
        r = shophouse(P, { width: p.width, depth: Math.min(depth, 12) }, rng);
      } else {
        r = cityBuilding(P, {
          width: p.width, depth, floors, storey, style, wall,
          trim: mixHex(wall, PAL.stoneDark, 0.45) | 0,
          pitched: rng.chance(0.22),
          /* On a corner the flank is a second elevation, not a party wall. */
          flank: [S_SHIJO, S_YASAKA, S_KIYOMIZU]
            .some((js) => Math.abs(p.s - js) < 46),
        }, rng);
      }

      // a plinth, because the street falls 1.6 % and the building does not
      P.bx(-p.width / 2 - 0.05, -0.55, -0.34, p.width / 2 + 0.05, 0.02,
           Math.min(depth, 4), PAL.concreteDark, O.wallD);

      const M = trs(p.x, base, p.z, 0, p.ry, 0);
      for (const q of P.list) { B.add(q.geometry, M, q.color, q.opts); q.geometry.dispose(); }

      const cx = p.x + p.nx * depth * 0.5, cz = p.z + p.nz * depth * 0.5;
      ctx.collideRot(cx, cz, p.width, depth, p.ry, base + r.height);
      ctx.stats.buildings++;
      if (style !== 'apartment') ctx.stats.shopfronts++;
      out.buildings.push({ ...p, style, depth, floors, base, height: r.height });

      /* The wall furniture.  Every one of these is a prop, so forty of them
       * cost nothing: the meter box by the door, the AC condensers up the
       * flank, and the gas meter that is on every building in Japan. */
      const eOff = FACE + 0.16;
      const f = at(p.s, side < 0 ? eOff : -eOff);
      ctx.prop({ kind: 'meterBox', x: f.x, z: f.z, rot: side < 0 ? f.faceWest : f.faceEast,
                 variant: rng.chance(0.5) ? 'gas' : undefined, seed: 900 + i });
      if (style === 'apartment' || rng.chance(0.5)) {
        for (let k = 0; k < (style === 'apartment' ? 3 : 1); k++) {
          const g = at(p.s + rng.range(-p.width * 0.35, p.width * 0.35), side < 0 ? eOff : -eOff);
          ctx.prop({ kind: 'acUnit', x: g.x, z: g.z,
                     rot: side < 0 ? f.faceWest : f.faceEast,
                     variant: k === 0 ? 'ground' : 'high', seed: 1200 + i * 7 + k });
        }
      }
    });

    /* The vacant plots become what they are in life: coin parking. */
    plots.filter((p) => p.vacant && p.width > 11).slice(0, 3).forEach((p, i) => {
      parks.push({ p, seed: 6100 + i + (east ? 40 : 0) });
    });
  }

  /* ================================================================ *
   * 2.  Road markings.
   *
   * 中央線, 車線境界線 (5 m line, 5 m gap), 車道外側線, the crossings and
   * their stop bars.  All of it goes into the district baker as flat quads
   * sampled off `heightAt`, 55 mm clear of the paving's own 20 mm lift, so
   * the paint follows the 1.6 % climb instead of floating over it.
   * ================================================================ */
  const paint = (sA, sB, off, w, color = PAL.white) => {
    const n = Math.max(1, Math.round((sB - sA) / 6));
    const pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const s = lerp(sA, sB, i / n);
      const p = c.pointAt(clamp(s, 0, L));
      const ex = p.tz, ez = -p.tx;
      for (const k of [-0.5, 0.5]) {
        const o = off + k * w;
        const x = p.x + ex * o, z = p.z + ez * o;
        pos.push(x, ctx.groundAt(x, z) + PAINT, z);
      }
    }
    for (let i = 0; i < n; i++) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    B.add(g, null, color, { bands: 'soft3', tint: TINT.cool, shadow: false, flat: false });
    g.dispose();
  };

  const junctions = [
    { s: S_SHIJO, half: 13.4, name: '四条通' },
    { s: S_YASAKA, half: 5.0, name: '八坂通' },
    { s: S_KIYOMIZU, half: 6.5, name: '清水道' },
  ];
  const clearOfJunction = (s) =>
    junctions.every((j) => Math.abs(s - j.s) > j.half + 7.5);

  /* The stretches of open carriageway between the junctions.  A continuous
   * line is one strip rather than three hundred, which matters: every `add`
   * clones a geometry, and the paint was the second-largest thing in this
   * district's build time before it was run this way. */
  const runs = [];
  {
    let cur = 12;
    const blocked = junctions
      .map((j) => [j.s - j.half - 8.5, j.s + j.half + 8.5])
      .sort((a, b) => a[0] - b[0]);
    for (const [a, b] of blocked) {
      if (a > cur + 6) runs.push([cur, a]);
      cur = Math.max(cur, b);
    }
    if (cur < L - 12) runs.push([cur, L - 12]);
  }
  for (const [a, b] of runs) {
    // 中央線: a doubled 150 mm line down the middle of a four-lane road
    paint(a, b, -0.16, 0.15);
    paint(a, b, 0.16, 0.15);
    // 車道外側線: the solid edge line that separates carriageway from gutter
    paint(a, b, -6.4, 0.15);
    paint(a, b, 6.4, 0.15);
    // 車線境界線: 5 m painted, 5 m clear
    for (let s = a; s < b - 5; s += 10) {
      paint(s, Math.min(s + 5, b), -3.5, 0.15);
      paint(s, Math.min(s + 5, b), 3.5, 0.15);
    }
  }

  /* 横断歩道.  Japanese zebra is a ladder of 450 mm bars at 900 mm centres
   * running ACROSS the traffic, 4-5 m deep, with a 450 mm 停止線 set back
   * from it.  One on each approach at every junction. */
  for (const j of junctions) {
    for (const dir of [-1, 1]) {
      const s0 = j.s + dir * (j.half + 1.6);
      for (let k = -7; k <= 7; k++) {
        const off = k * 0.92;
        if (Math.abs(off) > HALF - 0.35) continue;
        paint(s0, s0 + dir * 4.2, off, 0.45);
      }
      // the stop bar, on the near side of the crossing only
      const sb = j.s + dir * (j.half + 7.0);
      paint(sb, sb + dir * 0.45, dir > 0 ? -3.5 : 3.5, 6.6);
    }
    out.junctions.push(j);
  }

  /* ================================================================ *
   * 3.  Poles and the wire.
   * ================================================================ */
  /* Spacing is the whole design of the wire.
   *
   * `props.js` chains every pole to its two nearest neighbours inside 46 m,
   * so the *ratio* of along-street spacing to road width decides what the sky
   * looks like.  The two footway lines are 20.3 m apart; at 38 m spacing with
   * the two sides opposite each other, a pole's two nearest are the one across
   * the road (20.3 m) and the next one along its own side (38 m) -- which
   * gives a run down each footway AND a span across the carriageway at every
   * pole, which is exactly the Japanese arterial.  Stagger the sides and you
   * get a pure zigzag with no longitudinal run; halve the spacing and you get
   * two tidy parallel lines and no crossing at all. */
  const poleS = [];
  for (let s = 18; s < L - 18; s += 38) {
    const jitter = rng.range(-2.6, 2.6);
    poleS.push([s + jitter, 1]);      // west
    poleS.push([s + jitter, -1]);     // east, opposite
  }
  for (const [s, side] of poleS) {
    if (s < 6 || s > L - 6) continue;
    const near = junctions.find((j) => Math.abs(s - j.s) < j.half + 4.5);
    if (near) continue;
    const p = at(s, side < 0 ? POLE_OFF : -POLE_OFF);
    ctx.prop({ kind: 'utilityPole', x: p.x, z: p.z,
               rot: side < 0 ? p.faceWest : p.faceEast, seed: Math.round(s * 13) });
  }

  /* ================================================================ *
   * 4.  The junctions: signals, plates, mirrors.
   * ================================================================ */
  const signParts = [];
  const sq = (w, h, cell) => uvCell(new THREE.PlaneGeometry(w, h), cell);
  /**
   * A printed face at a world point, looking the way `yaw` faces.
   *
   * `PlaneGeometry`'s front normal is +Z and the project's yaw convention is
   * that `ry = 0` faces -Z, so a plate rotated by `ry` alone points *backwards*
   * and the text on it reads mirrored -- which is exactly what the first
   * render of the bus stop showed, and nothing in the code says so.
   */
  const plate = (w, h, cell, x, y, z, yaw) => {
    const g = sq(w, h, cell);
    g.rotateY(yaw + Math.PI);
    g.translate(x, y, z);
    signParts.push({ geometry: g });
    return g;
  };

  for (const j of junctions) {
    for (const dir of [-1, 1]) {
      for (const side of [-1, 1]) {
        const s = j.s + dir * (j.half + 6.2);
        const p = at(s, side < 0 ? POLE_OFF - 0.6 : -(POLE_OFF - 0.6));
        // the vehicle signal: a 5.6 m post with a 6 m arm over the carriageway
        const armDir = side < 0 ? -1 : 1;    // in toward the centreline
        const facing = dir > 0 ? p.along : p.along + Math.PI;
        signalMast(B, ctx, p, armDir, facing, side);
        // the pedestrian head on the same post, facing across
        pedSignal(B, p, side < 0 ? p.faceWest : p.faceEast);
      }
    }
    // the street-name plates, one pair per junction, on the near corner
    const pl = at(j.s - j.half - 2.0, -(POLE_OFF - 0.4));
    plate(1.30, 0.34, 'plate', pl.x, pl.y + 2.30, pl.z, pl.faceEast);
    // カーブミラー on the side-street mouth
    const m = at(j.s + j.half + 3.2, POLE_OFF - 0.9);
    ctx.prop({ kind: 'trafficMirror', x: m.x, z: m.z, rot: m.faceWest + 0.7,
               seed: Math.round(j.s) });
  }

  /* The coin parks, now that `plate` exists. */
  parks.forEach((q) => coinPark(ctx, B, q.p, plate, rngKit(q.seed)));

  /* ================================================================ *
   * 5.  The bus stop -- 東山安井, at the 清水道 corner.
   *
   * This is where the hill's foot traffic lands: the 清水道 and 五条坂 stops
   * are the two biggest crowd sources in Higashiyama, and buses run on 東大路
   * and nowhere else on the route (STREET 3.11).
   * ================================================================ */
  const stopS = S_KIYOMIZU - 30;
  const shelter = at(stopS, -(FACE - 2.4));
  busShelter(B, ctx, shelter, plate);

  // the bus itself, pulled up at the flag.  No driver: the world has no people.
  const busAt = at(stopS + 1.5, -5.0);
  const bus = cityBus(B, ctx, busAt, rng);

  // a second flag on the east side, for the southbound stop
  const stop2 = at(S_KIYOMIZU + 34, FACE - 1.9);
  busFlag(B, stop2, stop2.faceWest, plate);

  /* ================================================================ *
   * 6.  Standing traffic.
   * ================================================================ */
  // the taxi rank at the 四条 corner -- ヤサカ maroon-and-white, three deep
  for (let i = 0; i < 3; i++) {
    const t = at(S_SHIJO + 22 + i * 5.6, -5.6);
    ctx.prop({ kind: 'taxi', x: t.x, z: t.z, rot: t.along, seed: 400 + i });
  }
  // a delivery van on the hazards outside a shop
  {
    const v = at(S_YASAKA - 74, 5.4);
    ctx.prop({ kind: 'van', x: v.x, z: v.z, rot: v.along + Math.PI, seed: 401 });
  }
  // parked cars: three at the kerb, the rest are in the coin parks
  for (const [s, off, ry] of [[S_SHIJO + 96, -5.4, 0], [S_YASAKA + 40, 5.4, Math.PI],
                              [S_KIYOMIZU + 128, -5.4, 0]]) {
    const q = at(s, off);
    parkedCar(B, q.x, q.y, q.z, q.along + ry, rng);
  }

  /* ================================================================ *
   * 7.  The forecourt -- a small self-service filling station.
   * ================================================================ */
  petrol(ctx, B, at(28, -(FACE + 6.0)), plate, rng);

  /* ================================================================ *
   * 8.  Footway furniture.
   * ================================================================ */
  const kerbLine = HALF + 0.55;   // in the gutter, hard against the kerb
  for (let s = 20; s < L - 20; s += 13) {
    for (const side of [-1, 1]) {
      const o = side < 0 ? kerbLine : -kerbLine;
      const p = at(s + rng.range(-3, 3), o);
      const inJunction = junctions.some((j) => Math.abs(p.s - j.s) < j.half + 9);
      if (inJunction) continue;
      const r = rng.next();
      if (r < 0.30) {
        ctx.prop({ kind: 'drainCover', x: p.x, z: p.z, rot: p.along,
                   variant: 4, seed: Math.round(s * 3) });
      } else if (r < 0.44) {
        ctx.prop({ kind: 'manhole', x: p.x, z: p.z, rot: rng.range(0, 6.28),
                   seed: Math.round(s * 5) });
      } else if (r < 0.54) {
        ctx.prop({ kind: 'grating', x: p.x, z: p.z, rot: p.along,
                   variant: 'long', seed: Math.round(s * 7) });
      }
    }
  }

  // ガードパイプ: two rails on posts, where the footway meets a junction
  for (const j of junctions) {
    for (const dir of [-1, 1]) for (const side of [-1, 1]) {
      const s0 = j.s + dir * (j.half + 11);
      guardRail(B, ctx, at, s0, s0 + dir * 15, side < 0 ? kerbLine : -kerbLine);
    }
  }

  /* The shrine frontage.  East of the road here is 八坂神社's west forecourt,
   * not a building line, so the footway is edged with granite bollards and
   * the city's copper standard lamps rather than shopfronts -- the one stretch
   * of 東大路 that is dressed for the historic district it faces. */
  for (let s = sAtZ(-654); s < sAtZ(-512); s += 2.6) {
    const p = at(s, FACE - 0.9);
    ctx.prop({ kind: 'bollard', x: p.x, z: p.z, rot: p.faceWest,
               variant: 'granite', seed: Math.round(s * 11) });
  }
  for (let s = sAtZ(-648); s < sAtZ(-518); s += 24) {
    const p = at(s, FACE - 2.1);
    ctx.prop({ kind: 'streetLamp', x: p.x, z: p.z, rot: p.faceWest,
               seed: Math.round(s * 13) });
  }

  // 消火器格納箱, a post box, bicycle racks and the vending machines
  {
    const e1 = at(S_YASAKA - 46, -(FACE - 0.7));
    ctx.prop({ kind: 'extinguisherBox', x: e1.x, z: e1.z, rot: e1.faceEast, seed: 61 });
    const e2 = at(S_KIYOMIZU + 78, FACE - 0.7);
    ctx.prop({ kind: 'extinguisherBox', x: e2.x, z: e2.z, rot: e2.faceWest, seed: 62 });
    const pb = at(S_SHIJO + 40, -(FACE - 1.0));
    ctx.prop({ kind: 'postBox', x: pb.x, z: pb.z, rot: pb.faceEast, seed: 63 });
    for (const [s, side] of [[S_SHIJO - 62, 1], [S_YASAKA + 96, -1]]) {
      const br = at(s, side < 0 ? FACE - 1.3 : -(FACE - 1.3));
      ctx.prop({ kind: 'bicycleRack', x: br.x, z: br.z,
                 rot: side < 0 ? br.faceWest : br.faceEast, variant: 4, seed: 64 + s });
    }
  }

  /* The vending machines.  STREET 3.3: **normal density and full colour on
   * 東大路通** -- of the whole route this is the one street where a machine is
   * allowed to look like a machine, and OSM counts 53 in the wider Higashiyama
   * box.  They occur in banks of two or three against a wall, never alone. */
  for (let i = 0; i < 3; i++) {
    const p = at(S_YASAKA + 26 + (i - 1) * 1.22, -(FACE - 0.62));
    ctx.prop({ kind: 'vendingMachine', x: p.x, z: p.z, rot: p.faceEast, seed: 70 + i });
  }
  for (const [s0, side, n] of [[S_SHIJO - 148, -1, 2], [S_SHIJO + 168, 1, 2],
                               [S_KIYOMIZU + 232, -1, 3], [sAtZ(-698), 1, 2]]) {
    for (let i = 0; i < n; i++) {
      const p = at(s0 + i * 1.22, side < 0 ? FACE - 0.62 : -(FACE - 0.62));
      ctx.prop({ kind: 'vendingMachine', x: p.x, z: p.z,
                 rot: side < 0 ? p.faceWest : p.faceEast, seed: 700 + s0 + i });
    }
  }

  /* ================================================================ *
   * 8b.  The rest of the length.
   *
   * The three junctions carry the composition, but 1141 m of arterial with
   * nothing between them reads as a corridor rather than a street.  This pass
   * walks the whole frontage and leaves the ordinary residue of a working
   * road -- a bicycle against a wall, a planter somebody put out, a cone left
   * over from a delivery, a parked car -- at a density low enough that no two
   * are ever in the same frame twice.
   * ================================================================ */
  for (let s = 26; s < L - 26; s += 17) {
    for (const side of [-1, 1]) {
      if (!rng.chance(0.55)) continue;
      const p = at(s + rng.range(-5, 5), side < 0 ? FACE - 1.05 : -(FACE - 1.05));
      if (junctions.some((j) => Math.abs(p.s - j.s) < j.half + 10)) continue;
      const ry = side < 0 ? p.faceWest : p.faceEast;
      const r = rng.next();
      if (r < 0.30) {
        ctx.prop({ kind: 'bicycle', x: p.x, z: p.z, rot: ry + Math.PI / 2,
                   seed: Math.round(s * 17 + side) });
      } else if (r < 0.52) {
        ctx.prop({ kind: 'planterPot', x: p.x, z: p.z, rot: ry,
                   seed: Math.round(s * 19 + side) });
      } else if (r < 0.62) {
        ctx.prop({ kind: 'roadCone', x: p.x, z: p.z, rot: ry,
                   seed: Math.round(s * 23 + side) });
      } else if (r < 0.72) {
        ctx.prop({ kind: 'acUnit', x: p.x, z: p.z, rot: ry, variant: 'ground',
                   seed: Math.round(s * 29 + side) });
      } else if (r < 0.80) {
        ctx.prop({ kind: 'crate', x: p.x, z: p.z, rot: ry + rng.range(-0.4, 0.4),
                   seed: Math.round(s * 31 + side) });
      }
    }
  }

  /* Standing traffic down the length: a car at the kerb every 150 m or so,
   * and two more vans.  Nobody is in any of them. */
  for (let s = 60; s < L - 60; s += 118) {
    const side = rng.sign();
    const q = at(s + rng.range(-20, 20), side < 0 ? 5.4 : -5.4);
    if (junctions.some((j) => Math.abs(q.s - j.s) < j.half + 16)) continue;
    if (rng.chance(0.24)) {
      ctx.prop({ kind: 'van', x: q.x, z: q.z,
                 rot: side < 0 ? q.along + Math.PI : q.along, seed: 800 + s });
    } else {
      parkedCar(B, q.x, q.y, q.z, side < 0 ? q.along + Math.PI : q.along, rng);
    }
  }

  /* ================================================================ *
   * 9.  Facade signage -- the 袖看板, projecting into the street.
   * ================================================================ */
  const cells = ['coffee', 'kusuri', 'fudosan', 'yugijo'];
  const hosts = out.buildings.filter((b) => b.floors >= 2 && b.style !== 'apartment');
  let lastSign = -1e9, ci = 0;
  for (const b of hosts) {
    // one sign every ~110 m of frontage: a Kyoto arterial is signed, but the
    // 屋外広告物条例 keeps it a long way short of Osaka
    if (b.s - lastSign < 62 || !rng.chance(0.62)) continue;
    lastSign = b.s;
    const cell = cells[(ci++) % cells.length];
    const ry = b.ry;
    const y = b.base + 3.55;
    const proj = 1.05;
    // the board: baked, with the two printed faces hung on either side of it
    const dx0 = Math.sin(ry) * -proj * 0.5, dz0 = -Math.cos(ry) * proj * 0.5;
    const g = new THREE.BoxGeometry(0.13, 2.55, proj);
    B.add(g, trs(b.x + dx0, y + 1.28, b.z + dz0, 0, ry, 0), PAL.plasterGrey, O.wallD);
    g.dispose();
    for (const s2 of [-1, 1]) {
      const q = sq(proj * 0.86, 2.30, cell);
      q.rotateY(ry + s2 * Math.PI / 2);
      q.translate(b.x + dx0 + Math.cos(ry) * s2 * 0.072,
                  y + 1.28,
                  b.z + dz0 - Math.sin(ry) * s2 * 0.072);
      signParts.push({ geometry: q });
    }
    for (const dy of [0.16, 2.34]) {
      const bg = new THREE.BoxGeometry(0.07, 0.07, 0.34);
      B.add(bg, trs(b.x, y + dy, b.z, 0, ry, 0), PAL.metalDark, O.metal);
      bg.dispose();
    }
  }

  /* ================================================================ *
   * 10.  Bake the signage, and the four things you can touch.
   * ================================================================ */
  if (signParts.length) {
    const mesh = new THREE.Mesh(bake(signParts), celTex(signAtlas(), {
      bands: 3, tint: TINT.cool, side: THREE.DoubleSide, flat: true,
    }));
    mesh.name = 'higashioji.signs';
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    ctx.add(mesh);
    signParts.forEach((p) => p.geometry.dispose());
  }

  /* The shutter goes on a real wall: a building picked off the list rather
   * than a coordinate written by hand, so it cannot end up floating in a gap
   * the plot walker happened to leave. */
  const shutterHost = out.buildings
    .filter((b) => b.side < 0 && b.s > S_KIYOMIZU + 40 && b.width > 12
                   && b.style !== 'konbini' && b.style !== 'shophouse')
    .sort((a, b) => a.s - b.s)[0]
    || out.buildings.find((b) => b.side < 0 && b.width > 12);

  interactables(ctx, B, at, {
    S_YASAKA, S_KIYOMIZU, S_SHIJO, bus, shutterHost,
  });

  if (typeof console !== 'undefined' && console.info) {
    console.info('[higashioji]', out.buildings.length, 'buildings ·',
      blocks.reduce((a, b) => a + b.triangles, 0), 'baked tris ·',
      signParts.length, 'sign faces');
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * The pieces.
 * ------------------------------------------------------------------ */

/**
 * 車両用交通信号機.  A 5.6 m post, a straight arm out over the carriageway
 * and a horizontal three-lamp head.
 *
 * The head is horizontal and the **red is on the right**, which is the
 * Japanese convention and the single detail that stops a signal reading as
 * American.  Lamps go on the `soft` ramp: its darkest stop is still 184/255,
 * so a lit aspect stays lit on the shadow side without an emissive material
 * and without its own draw call.
 */
function signalMast(B, ctx, p, armDir, facing, side) {
  const ry = facing;
  const H = 5.6, ARM = 5.4;
  const M = (dx, dy, dz, rx = 0, rz = 0) =>
    trs(p.x + Math.cos(ry) * dx + Math.sin(ry) * dz, p.y + dy,
        p.z - Math.sin(ry) * dx + Math.cos(ry) * dz, rx, ry, rz);

  const post = new THREE.CylinderGeometry(0.075, 0.105, H, 8);
  B.add(post, M(0, H / 2, 0), PAL.metalWarm, O.metal); post.dispose();
  const boot = new THREE.CylinderGeometry(0.17, 0.20, 0.22, 8);
  B.add(boot, M(0, 0.11, 0), PAL.concreteDark, O.wallD); boot.dispose();

  const ax = armDir * ARM * 0.5;
  const arm = new THREE.CylinderGeometry(0.058, 0.070, ARM, 6);
  B.add(arm, M(ax, H - 0.30, 0, 0, Math.PI / 2), PAL.metalWarm, O.metal); arm.dispose();
  const stay = new THREE.CylinderGeometry(0.035, 0.035, 1.9, 5);
  B.add(stay, M(armDir * 0.72, H - 0.92, 0, 0, armDir * 0.85), PAL.metalWarm, O.metal);
  stay.dispose();

  // the head, hung at the far end of the arm
  const hx = armDir * (ARM - 0.5);
  const box = new THREE.BoxGeometry(1.02, 0.36, 0.30);
  B.add(box, M(hx, H - 0.55, 0), 0x3f4a44, O.wallD); box.dispose();
  const lamps = [
    [-0.33, 0x4e9c6a], [0, 0xd8a33c], [0.33, PAL.red],   // 青 黄 赤, red at the right
  ];
  for (const [lx, col] of lamps) {
    const lens = new THREE.CylinderGeometry(0.115, 0.115, 0.05, 12);
    B.add(lens, M(hx + armDir * lx, H - 0.55, -0.17, Math.PI / 2),
          col, { bands: 'soft', tint: TINT.cool, shadow: false });
    lens.dispose();
    const visor = new THREE.CylinderGeometry(0.135, 0.135, 0.16, 12, 1, true,
                                             Math.PI * 0.05, Math.PI * 0.9);
    B.add(visor, M(hx + armDir * lx, H - 0.53, -0.24, Math.PI / 2), 0x2f3a36, O.wallD);
    visor.dispose();
  }
}

/** 歩行者用信号機 -- the two-lamp pedestrian head, at 3.1 m. */
function pedSignal(B, p, ry) {
  const M = (dx, dy, dz) =>
    trs(p.x + Math.cos(ry) * dx + Math.sin(ry) * dz, p.y + dy,
        p.z - Math.sin(ry) * dx + Math.cos(ry) * dz, 0, ry, 0);
  const box = new THREE.BoxGeometry(0.34, 0.72, 0.26);
  B.add(box, M(0, 3.15, 0.20), 0x3f4a44, O.wallD); box.dispose();
  for (const [dy, col] of [[3.36, PAL.red], [2.94, 0x4e9c6a]]) {
    const lens = new THREE.BoxGeometry(0.24, 0.24, 0.03);
    B.add(lens, M(0, dy, 0.34), col, { bands: 'soft', tint: TINT.cool, shadow: false });
    lens.dispose();
  }
}

/** ガードパイプ -- two rails on posts along the kerb at a junction. */
function guardRail(B, ctx, at, s0, s1, off) {
  const n = Math.max(2, Math.round(Math.abs(s1 - s0) / 2.1));
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const s = lerp(s0, s1, i / n);
    const p = at(s, off);
    const post = new THREE.CylinderGeometry(0.038, 0.042, 0.82, 6);
    B.add(post, trs(p.x, p.y + 0.41, p.z), PAL.metalWarm, O.metal);
    post.dispose();
    if (prev) {
      for (const dy of [0.74, 0.44]) {
        const dx = p.x - prev.x, dz = p.z - prev.z;
        const len = Math.hypot(dx, dz);
        const g = new THREE.CylinderGeometry(0.028, 0.028, len, 5);
        g.rotateX(Math.PI / 2);
        B.add(g, trs((p.x + prev.x) / 2, (p.y + prev.y) / 2 + dy, (p.z + prev.z) / 2,
                     0, Math.atan2(dx, dz), 0), PAL.metalWarm, O.metal);
        g.dispose();
      }
    }
    prev = p;
  }
}

/**
 * バス停留所 -- shelter, bench, timetable and flag.
 *
 * 京都市バス is green and cream, and the stop is the one place on this street
 * where a saturated colour is correct.
 */
function busShelter(B, ctx, p, plate) {
  const ry = p.faceEast;
  const W = 5.0, D = 1.7, H = 2.45;
  const M = (dx, dy, dz, rx = 0, rz = 0) =>
    trs(p.x + Math.cos(ry) * dx + Math.sin(ry) * dz, p.y + dy,
        p.z - Math.sin(ry) * dx + Math.cos(ry) * dz, rx, ry, rz);
  const box = (w, h, d, dx, dy, dz, col, o) => {
    const g = new THREE.BoxGeometry(w, h, d);
    B.add(g, M(dx, dy, dz), col, o || O.wallD);
    g.dispose();
  };
  // four posts, the back wall, the roof
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(0.10, H, 0.10, sx * (W / 2 - 0.12), H / 2, sz * (D / 2 - 0.10), PAL.metalDark, O.metal);
  }
  box(W - 0.3, H - 0.5, 0.05, 0, (H + 0.4) / 2, D / 2 - 0.06, PAL.glassDark, O.dark);
  box(W + 0.3, 0.12, D + 0.5, 0, H + 0.06, 0, PAL.metalWarm, O.metal);
  box(W + 0.36, 0.07, D + 0.56, 0, H + 0.14, 0, 0x2f4438, O.wallD);
  // the bench nobody is sitting on
  box(W - 1.2, 0.08, 0.42, 0, 0.46, D / 2 - 0.34, PAL.timberPale, O.timber);
  for (const sx of [-1, 1]) {
    box(0.07, 0.44, 0.38, sx * (W / 2 - 0.9), 0.24, D / 2 - 0.34, PAL.metalDark, O.metal);
  }
  ctx.collideRot(p.x, p.z, W, D, ry, p.y + H + 0.2);

  /* The timetable, on the back wall, facing out of the shelter. */
  plate(1.9, 0.95, 'busStop',
        p.x + Math.sin(ry) * (D / 2 - 0.11), p.y + 1.62,
        p.z + Math.cos(ry) * (D / 2 - 0.11), ry);

  busFlag(B, { x: p.x + Math.cos(ry) * (W / 2 + 0.9), y: p.y,
               z: p.z - Math.sin(ry) * (W / 2 + 0.9) }, ry, plate);
}

/** The stop's own 標識 -- a board on a slim post at the kerb. */
function busFlag(B, p, ry, plate) {
  const post = new THREE.CylinderGeometry(0.045, 0.052, 2.7, 7);
  B.add(post, trs(p.x, p.y + 1.35, p.z), PAL.metalWarm, O.metal); post.dispose();
  const base = new THREE.CylinderGeometry(0.24, 0.28, 0.14, 10);
  B.add(base, trs(p.x, p.y + 0.07, p.z), PAL.concreteDark, O.wallD); base.dispose();
  const board = new THREE.BoxGeometry(1.05, 0.56, 0.06);
  B.add(board, trs(p.x, p.y + 2.42, p.z, 0, ry, 0), 0x2f4438, O.wallD); board.dispose();
  // both faces: the front looks out at the road, the back down the footway
  plate(0.96, 0.48, 'busStop',
        p.x - Math.sin(ry) * 0.04, p.y + 2.42, p.z - Math.cos(ry) * 0.04, ry);
  plate(0.96, 0.48, 'busStop',
        p.x + Math.sin(ry) * 0.04, p.y + 2.42, p.z + Math.cos(ry) * 0.04, ry + Math.PI);
}

/**
 * 京都市バス -- a city bus at the stop, empty.
 *
 * The world has no people in it, so a vehicle is a *trace*: parked, stopped,
 * doors shut, nobody at the wheel.  Cream body, dark green skirt and waist
 * band, which is the Kyoto City Bus livery and reads at fifty metres.
 */
function cityBus(B, ctx, p, rng) {
  const ry = p.along;
  const L = 10.6, Wd = 2.48, floor = 0.72, roof = 3.05;
  const M = (dx, dy, dz, rx = 0, rz = 0) =>
    trs(p.x + Math.cos(ry) * dx + Math.sin(ry) * dz, p.y + dy,
        p.z - Math.sin(ry) * dx + Math.cos(ry) * dz, rx, ry, rz);
  const box = (w, h, d, dx, dy, dz, col, o) => {
    const g = new THREE.BoxGeometry(w, h, d);
    B.add(g, M(dx, dy, dz), col, o || O.wallD);
    g.dispose();
  };
  // dz runs along the bus, dx across it
  box(Wd, roof - floor, L, 0, (floor + roof) / 2, 0, PAL.plasterWarm, O.wall);
  box(Wd + 0.02, 0.46, L, 0, floor + 0.10, 0, PAL.taxiGreen, O.wallD);       // skirt
  box(Wd + 0.02, 0.30, L, 0, floor + 1.02, 0, PAL.norenGreen, O.wallD);      // waist band
  box(Wd + 0.02, 0.12, L, 0, floor + 1.30, 0, PAL.paperWarm, O.wall);
  box(Wd - 0.10, 0.20, L - 0.3, 0, roof - 0.05, 0, PAL.plasterGrey, O.wall); // roof
  // the glazing: one long dark band per side, and the screens
  for (const s of [-1, 1]) {
    box(0.06, 0.94, L - 1.5, s * (Wd / 2), floor + 1.92, 0, PAL.glassDark, O.dark);
  }
  box(Wd - 0.16, 1.10, 0.08, 0, floor + 1.86, -L / 2 + 0.06, PAL.glassDark, O.dark);
  box(Wd - 0.30, 0.90, 0.08, 0, floor + 1.86, L / 2 - 0.06, PAL.glassDark, O.dark);
  // 行先表示器 -- the destination blind over the screen
  box(1.55, 0.30, 0.06, 0, floor + 2.62, -L / 2 + 0.03, PAL.black, O.dark);
  // the wheels
  for (const dz of [-L / 2 + 1.9, L / 2 - 2.4]) for (const s of [-1, 1]) {
    const g = new THREE.CylinderGeometry(0.50, 0.50, 0.26, 12);
    B.add(g, M(s * (Wd / 2 - 0.09), 0.50, dz, 0, Math.PI / 2), PAL.blackSoft, O.wallD);
    g.dispose();
    const h = new THREE.CylinderGeometry(0.22, 0.22, 0.28, 10);
    B.add(h, M(s * (Wd / 2 - 0.07), 0.50, dz, 0, Math.PI / 2), PAL.metal, O.metal);
    h.dispose();
  }
  // bumpers
  box(Wd + 0.06, 0.22, 0.20, 0, floor - 0.08, -L / 2 + 0.05, PAL.metalDark, O.metal);
  box(Wd + 0.06, 0.22, 0.20, 0, floor - 0.08, L / 2 - 0.05, PAL.metalDark, O.metal);

  ctx.collideRot(p.x, p.z, Wd + 0.2, L, ry, p.y + roof);

  /* The door.  Left as a separate mesh because it is the one thing on this
   * street that moves, and because a door that opens is worth one draw call. */
  const doorGeo = new THREE.BoxGeometry(0.07, 1.92, 1.10);
  const door = new THREE.Mesh(doorGeo, cel({
    color: PAL.glassDark, bands: 'deep', tint: TINT.cool,
  }));
  const dz0 = -L / 2 + 2.35;
  door.position.set(
    p.x + Math.cos(ry) * (-Wd / 2) + Math.sin(ry) * dz0,
    p.y + floor + 1.28,
    p.z - Math.sin(ry) * (-Wd / 2) + Math.cos(ry) * dz0
  );
  door.rotation.y = ry;
  door.userData.axis = { x: Math.sin(ry), z: Math.cos(ry) };
  door.userData.home = door.position.clone();
  ctx.add(door);
  return { door, x: p.x, y: p.y, z: p.z, ry, floor, L, Wd };
}

/** An ordinary parked car -- four of them, and none of them is a hero. */
function parkedCar(B, x, y, z, ry, rng) {
  const body = rng.pick([PAL.plasterGrey, PAL.metalDark, PAL.white, PAL.indigoDeep,
                         PAL.stoneDark]);
  const M = (dx, dy, dz, rx = 0, rz = 0) =>
    trs(x + Math.cos(ry) * dx + Math.sin(ry) * dz, y + dy,
        z - Math.sin(ry) * dx + Math.cos(ry) * dz, rx, ry, rz);
  const box = (w, h, d, dx, dy, dz, col, o) => {
    const g = new THREE.BoxGeometry(w, h, d);
    B.add(g, M(dx, dy, dz), col, o || O.wallD);
    g.dispose();
  };
  const W = 1.72, Ln = 4.35;
  box(W, 0.60, Ln, 0, 0.72, 0, body, O.wallD);
  box(W - 0.10, 0.52, Ln * 0.50, 0, 1.24, -0.20, body, O.wallD);
  box(W - 0.02, 0.36, Ln * 0.48, 0, 1.28, -0.20, PAL.glassDark, O.dark);
  box(W + 0.03, 0.10, Ln - 0.5, 0, 0.46, 0, PAL.blackSoft, O.wallD);
  for (const dz of [-Ln / 2 + 0.95, Ln / 2 - 0.85]) for (const s of [-1, 1]) {
    const g = new THREE.CylinderGeometry(0.31, 0.31, 0.20, 10);
    B.add(g, M(s * (W / 2 - 0.05), 0.31, dz, 0, Math.PI / 2), PAL.blackSoft, O.wallD);
    g.dispose();
  }
}

/**
 * 時間貸駐車場 -- the coin car park.
 *
 * A Kyoto arterial is about a fifth surface parking, and this is what a gap
 * in the frontage actually contains: a fence of pipe, wheel stops, flap locks,
 * a payment column and a lit board on a post.
 */
function coinPark(ctx, B, p, plate, rng) {
  const D = 13;
  const ry = p.ry;
  const M = (dx, dy, dz) =>
    trs(p.x + Math.cos(ry) * dx + Math.sin(ry) * dz, p.y0 + dy,
        p.z - Math.sin(ry) * dx + Math.cos(ry) * dz, 0, ry, 0);
  p.y0 = ctx.groundAt(p.x, p.z);
  const box = (w, h, d, dx, dy, dz, col, o) => {
    const g = new THREE.BoxGeometry(w, h, d);
    B.add(g, M(dx, dy, dz), col, o || O.wallD);
    g.dispose();
  };
  const bays = Math.max(2, Math.floor(p.width / 2.6));
  for (let i = 0; i < bays; i++) {
    const dx = -p.width / 2 + (i + 0.5) * (p.width / bays);
    // 車止め and the flap lock, which is the whole read of a coin park
    box(1.6, 0.11, 0.16, dx, 0.055, 4.6, PAL.concreteDark, O.wallD);
    box(0.52, 0.06, 0.62, dx, 0.03, 2.4, PAL.metalDark, O.metal);
    box(0.46, 0.28, 0.06, dx, 0.16, 2.15, 0xd8a33c, { bands: 3, tint: TINT.warm });
    // the white bay line
    box(0.10, 0.02, 5.0, dx - p.width / bays / 2, 0.02, 2.6, PAL.white,
        { bands: 'soft3', tint: TINT.cool, shadow: false });
  }
  // the back and side fence: galvanised pipe, never a wall
  for (const [x0, x1, dz] of [[-p.width / 2, p.width / 2, D - 0.4]]) {
    for (let t = 0; t <= 6; t++) {
      const dx = lerp(x0, x1, t / 6);
      box(0.06, 1.15, 0.06, dx, 0.58, dz, PAL.metalWarm, O.metal);
    }
    for (const dy of [1.08, 0.72]) box(x1 - x0, 0.05, 0.05, 0, dy, dz, PAL.metalWarm, O.metal);
  }
  // the payment column and its board
  box(0.34, 1.22, 0.30, p.width / 2 - 0.7, 0.61, 1.2, PAL.metalWarm, O.metal);
  box(0.30, 0.34, 0.04, p.width / 2 - 0.7, 1.02, 1.02, PAL.black, O.dark);
  // and the lit board on a post at the pavement edge, which is how you find one
  box(1.9, 0.95, 0.10, 0, 3.35, 0.4, 0x2c3c58, O.wallD);
  box(0.10, 3.4, 0.10, 0, 1.7, 0.4, PAL.metalWarm, O.metal);
  if (plate) {
    const wx = p.x + Math.sin(ry) * 0.4, wz = p.z + Math.cos(ry) * 0.4;
    plate(1.78, 0.86, 'parking', wx - Math.sin(ry) * 0.06, p.y0 + 3.35,
          wz - Math.cos(ry) * 0.06, ry);
  }

  ctx.collide(p.x - p.width / 2 - 0.2, p.z - 0.2, p.x + p.width / 2 + 0.2, p.z + 0.2,
              p.y0 + 0.14);
  for (let i = 0; i < Math.min(3, bays); i++) {
    if (!rng.chance(0.6)) continue;
    const dx = -p.width / 2 + (i + 0.5) * (p.width / bays);
    const wx = p.x + Math.cos(ry) * dx + Math.sin(ry) * 2.9;
    const wz = p.z - Math.sin(ry) * dx + Math.cos(ry) * 2.9;
    parkedCar(B, wx, ctx.groundAt(wx, wz), wz, ry, rng);
  }
}

/** セルフ給油所 -- the small filling station at the north end. */
function petrol(ctx, B, p, plate, rng) {
  const ry = p.faceEast;
  const y0 = p.y;
  const M = (dx, dy, dz, rx = 0, rz = 0) =>
    trs(p.x + Math.cos(ry) * dx + Math.sin(ry) * dz, y0 + dy,
        p.z - Math.sin(ry) * dx + Math.cos(ry) * dz, rx, ry, rz);
  const box = (w, h, d, dx, dy, dz, col, o) => {
    const g = new THREE.BoxGeometry(w, h, d);
    B.add(g, M(dx, dy, dz), col, o || O.wallD);
    g.dispose();
  };
  const W = 16, D = 9, CH = 4.9;
  // the canopy: a deep slab on four columns, which is the whole silhouette
  box(W, 0.55, D, 0, CH, 0, PAL.plaster, O.wall);
  box(W + 0.3, 0.28, D + 0.3, 0, CH + 0.36, 0, 0x2f4438, O.wallD);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(0.48, CH - 0.28, 0.48, sx * (W / 2 - 1.5), (CH - 0.28) / 2, sz * (D / 2 - 1.4),
        PAL.concrete, O.wallD);
  }
  // two pump islands under it
  for (const sx of [-1, 1]) {
    box(3.2, 0.16, 1.1, sx * 3.6, 0.08, 0, PAL.concreteDark, O.wallD);
    box(0.52, 1.42, 0.86, sx * 3.6, 0.87, 0, PAL.plasterGrey, O.wall);
    box(0.40, 0.42, 0.05, sx * 3.6, 1.35, 0.44, PAL.black, O.dark);
    box(0.10, 0.10, 0.34, sx * 3.6 + 0.34, 1.10, 0.42, PAL.redDeep,
        { bands: 3, tint: TINT.warm });
  }
  // the kiosk behind
  box(6.0, 3.1, 4.4, -W / 2 + 4.0, 1.55, D / 2 + 2.4, PAL.plaster, O.wall);
  box(6.3, 0.30, 4.7, -W / 2 + 4.0, 3.22, D / 2 + 2.4, 0x2f4438, O.wallD);
  box(4.6, 1.6, 0.08, -W / 2 + 4.0, 1.55, D / 2 + 0.22, PAL.glassDark, O.dark);
  ctx.collideRot(
    p.x + Math.sin(ry) * (D / 2 + 2.4) + Math.cos(ry) * (-W / 2 + 4.0),
    p.z + Math.cos(ry) * (D / 2 + 2.4) - Math.sin(ry) * (-W / 2 + 4.0),
    6.0, 4.4, ry, y0 + 3.4
  );
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = p.x + Math.cos(ry) * sx * (W / 2 - 1.5) + Math.sin(ry) * sz * (D / 2 - 1.4);
    const cz = p.z - Math.sin(ry) * sx * (W / 2 - 1.5) + Math.cos(ry) * sz * (D / 2 - 1.4);
    ctx.collide(cx - 0.3, cz - 0.3, cx + 0.3, cz + 0.3, y0 + CH);
  }
  // the price board on a post at the kerb
  const bx = p.x + Math.cos(ry) * (W / 2 + 1.2) + Math.sin(ry) * (-D / 2 - 2.0);
  const bz = p.z - Math.sin(ry) * (W / 2 + 1.2) + Math.cos(ry) * (-D / 2 - 2.0);
  const post = new THREE.CylinderGeometry(0.09, 0.11, 5.0, 8);
  B.add(post, trs(bx, ctx.groundAt(bx, bz) + 2.5, bz), PAL.metalWarm, O.metal);
  post.dispose();
  const bd = new THREE.BoxGeometry(2.3, 1.5, 0.14);
  B.add(bd, trs(bx, ctx.groundAt(bx, bz) + 4.4, bz, 0, ry, 0), 0x3a4048, O.wallD);
  bd.dispose();
  const by = ctx.groundAt(bx, bz) + 4.4;
  plate(2.1, 1.32, 'fuel', bx - Math.sin(ry) * 0.08, by, bz - Math.cos(ry) * 0.08, ry);
  plate(2.1, 1.32, 'fuel', bx + Math.sin(ry) * 0.08, by, bz + Math.cos(ry) * 0.08, ry + Math.PI);
}

/** A convenience store: one storey, a deep glazed front, a flat sign band. */
function konbini(P, { width: W, depth: D }, rng) {
  const hw = W / 2, H = 3.6;
  P.bx(-hw, 0, 0.55, hw, H, D, PAL.plaster, O.wall);
  // the glazing: piers, a header, and the dark inside behind it
  P.bx(-hw, 0.14, 0.90, hw, H - 0.85, 0.98, PAL.shopInterior, O.dark);
  P.bx(-hw, 0.14, 0.50, hw, H - 0.85, 0.56, PAL.glassDark, O.dark);
  for (let i = 0; i <= 5; i++) {
    const x = -hw + (i / 5) * W;
    P.bx(x - 0.06, 0.14, 0.44, x + 0.06, H - 0.85, 0.60, PAL.metal, O.metal);
  }
  P.bx(-hw - 0.12, H - 0.90, 0.32, hw + 0.12, H - 0.02, 0.62, PAL.plasterGrey, O.wall);
  P.bx(-hw - 0.16, H - 0.02, 0.28, hw + 0.16, H + 0.34, 0.66, 0x4a6e5a, O.wallD);
  P.bx(-hw, 0, -0.05, hw, 0.14, 0.60, PAL.concrete, O.wallD);
  P.bx(-hw, H, 0.55, hw, H + 0.55, D, PAL.plaster, O.wall);
  return { height: H + 0.55 };
}

/**
 * The survivor: a two-storey timber-and-plaster shophouse between the blocks.
 *
 * Every Kyoto arterial has a handful of these left, squeezed between concrete,
 * and they are what makes the concrete legible as concrete.
 */
function shophouse(P, { width: W, depth: D }, rng) {
  const hw = W / 2, GF = 2.55, EAVE = 5.85;
  P.bx(-hw, 0, 0.62, hw, EAVE, D, PAL.plasterOchre, O.wall);
  // the shopfront under a 庇
  for (let i = 0; i <= 3; i++) {
    const x = -hw + (i / 3) * W;
    P.bx(x - 0.09, 0, 0, x + 0.09, GF, 0.62, PAL.timber, O.timber);
  }
  P.bx(-hw, GF, -0.06, hw, GF + 0.22, 0.62, PAL.timberDark, O.timber);
  P.bx(-hw + 0.2, 0.12, 0.55, hw - 0.2, GF - 0.15, 0.62, PAL.shopInterior, O.dark);
  P.bx(-hw, -0.02, -0.24, hw, 0.12, 0.62, PAL.paving, O.wallD);
  // 虫籠窓 on the half upper storey
  for (let i = 0; i < 3; i++) {
    const x = -hw + (i + 0.5) * (W / 3);
    P.bx(x - 0.5, GF + 1.1, 0.55, x + 0.5, GF + 1.9, 0.63, PAL.plasterDark, O.wallD);
    for (let k = 0; k < 5; k++) {
      P.bx(x - 0.5 + k * 0.22, GF + 1.1, 0.50, x - 0.42 + k * 0.22, GF + 1.9, 0.57,
           PAL.timberDark, O.timber);
    }
  }
  const r = gableRoof({
    w: W, d: D, pitch: 0.45, eave: 0.9, material: rng.chance(0.35) ? 'tileOld' : 'tile',
    mukuri: 0.03, y: EAVE, ridgeAlongX: true,
  });
  for (const p of r.parts) p.geometry.translate(0, 0, D / 2);
  P.many(r.parts);
  // the 庇 over the shopfront, which is what gives the street its low band
  P.bx(-hw - 0.25, GF + 0.22, -1.05, hw + 0.25, GF + 0.40, 0.62, PAL.tileRoof, O.tile);
  P.bx(-hw - 0.25, GF + 0.34, -1.10, hw + 0.25, GF + 0.46, -0.90, PAL.tileRidge, O.tile);
  return { height: r.ridgeY };
}

/* ------------------------------------------------------------------ *
 * The four things you can touch.
 *
 * Nothing here is a puzzle and nothing here is a game mechanic.  They are the
 * small mechanical facts of a city street: a button that changes a light, a
 * bus door, a can that drops, a shutter that rattles.
 * ------------------------------------------------------------------ */
function interactables(ctx, B, at, K) {
  const hit = (x, y, z, w, h, d, label, action) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ visible: false }));
    m.position.set(x, y, z);
    m.visible = false;
    ctx.add(m);
    ctx.interact({ hitbox: m, label, action });
    return m;
  };

  /* --- 1. the 押ボタン box at the 八坂通 crossing --- */
  {
    const p = at(K.S_YASAKA - 11.5, -(HALF + 1.6));
    const post = new THREE.CylinderGeometry(0.05, 0.06, 1.35, 7);
    B.add(post, trs(p.x, p.y + 0.67, p.z), PAL.metalWarm, O.metal); post.dispose();
    const bxg = new THREE.BoxGeometry(0.20, 0.28, 0.13);
    B.add(bxg, trs(p.x, p.y + 1.28, p.z, 0, p.faceEast, 0), PAL.metalWarm, O.metal);
    bxg.dispose();

    const lampMat = (col) => flat({ color: col, fog: true });
    const mk = (col, dy) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), lampMat(col));
      m.position.set(p.x + Math.sin(p.faceWest) * 0.10, p.y + 3.0 + dy,
                     p.z + Math.cos(p.faceWest) * 0.10);
      m.rotation.y = p.faceWest;
      m.userData.noOutline = true;
      ctx.add(m);
      return m;
    };
    // the head itself is baked; only the two aspects are their own meshes
    const head = new THREE.BoxGeometry(0.36, 0.78, 0.24);
    B.add(head, trs(p.x, p.y + 3.10, p.z, 0, p.faceWest, 0), 0x3f4a44, O.wallD);
    head.dispose();
    const red = mk(PAL.red, 0.22);
    const green = mk(0x4e9c6a, -0.20);
    green.visible = false;
    let timer = 0;
    ctx.update((dt) => {
      if (timer > 0) {
        timer -= dt;
        if (timer <= 0) { red.visible = true; green.visible = false; }
      }
    });
    hit(p.x, p.y + 1.28, p.z, 0.7, 0.8, 0.7, '押ボタン — call the crossing', () => {
      timer = 14;
      red.visible = false;
      green.visible = true;
    });
  }

  /* --- 2. the bus door --- */
  if (K.bus) {
    const d = K.bus.door;
    let t = 0, want = 0;
    ctx.update((dt) => {
      if (Math.abs(t - want) < 1e-3) return;
      t += Math.sign(want - t) * Math.min(Math.abs(want - t), dt * 1.5);
      d.position.set(
        d.userData.home.x + d.userData.axis.x * t * 1.05,
        d.userData.home.y,
        d.userData.home.z + d.userData.axis.z * t * 1.05
      );
    });
    hit(d.position.x, d.position.y, d.position.z, 1.4, 2.0, 1.4,
        'the bus door', () => { want = want > 0.5 ? 0 : 1; });
  }

  /* --- 3. the vending machine: a can drops --- */
  {
    const p = at(K.S_YASAKA + 26, -(FACE - 1.30));
    const canMat = cel({ color: PAL.metal, bands: 4, tint: TINT.cool, flat: false });
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 8), canMat);
    can.position.set(p.x, p.y + 0.30, p.z);
    can.visible = false;
    ctx.add(can);
    let fall = -1;
    ctx.update((dt) => {
      if (fall < 0) return;
      fall += dt;
      if (fall > 1.6) { fall = -1; can.visible = false; return; }
      can.rotation.z += dt * 3.2;
      can.position.y = p.y + 0.30 + Math.max(0, 0.55 - fall * 1.4);
    });
    hit(p.x, p.y + 1.0, p.z, 1.5, 1.9, 1.2, 'buy a hot coffee', () => {
      fall = 0; can.visible = true;
    });
  }

  /* --- 4. a shop shutter, half down --- */
  if (K.shutterHost) {
    const h = K.shutterHost;
    const p = { x: h.x, y: h.base, z: h.z, faceWest: h.ry };
    const g = new THREE.BoxGeometry(2.6, 2.4, 0.06);
    g.translate(0, -1.2, 0);        // hinge at the top, so it rolls up
    const sh = new THREE.Mesh(g, cel({ color: PAL.metal, bands: 4, tint: TINT.cool, flat: false }));
    sh.position.set(p.x, p.y + 3.05, p.z);
    sh.rotation.y = p.faceWest;
    ctx.add(sh);
    const box = new THREE.BoxGeometry(2.75, 0.34, 0.30);
    B.add(box, trs(p.x, p.y + 3.20, p.z, 0, p.faceWest, 0), PAL.metalDark, O.metal);
    box.dispose();
    let open = 0, want = 0;
    ctx.update((dt) => {
      if (Math.abs(open - want) < 1e-3) return;
      open += Math.sign(want - open) * Math.min(Math.abs(want - open), dt * 0.9);
      sh.scale.y = 1 - open * 0.72;
    });
    hit(p.x, p.y + 1.4, p.z, 2.8, 2.4, 1.0, 'the shutter', () => {
      want = want > 0.5 ? 0 : 1;
    });
  }
}
