import * as THREE from 'three';
import { PAL, CERAMIC } from '../core/palette.js';
import { TINT } from '../core/toon.js';
import { trs, lathe, prism, taperBox, TAU } from '../core/util.js';
import {
  make, cached, hex, mixHex, MINCHO, GOTHIC, vertical, verticalFit, centered,
  brushVertical, woodGrain, grain,
} from '../core/textures.js';

/* ------------------------------------------------------------------ *
 * 街具 -- the street furniture kit.
 *
 * This file knows how to *draw* a prop and nothing else.  It has no idea where
 * the ground is, which district it is in, how many of it there are or whether
 * it is instanced -- `src/world/props.js` owns all of that.  Everything here is
 * authored in one local frame and handed to an emitter:
 *
 *     origin  at the centre of the prop's footprint, on the ground
 *     +Y      up
 *     +Z      the front: the way the prop is used from, the way it faces the
 *             street.  A wall-mounted prop's back is at -Z and touches the wall.
 *     +X      the prop's own right when you are looking at its face
 *
 * `props.js` turns that by `rot` and seats it on `groundAt`.  A builder that
 * bakes a world position into its geometry is wrong; a builder that assumes it
 * is upright when it is `flat: true` is wrong; those are the only two ways to
 * break the contract.
 *
 * ------------------------------------------------------------- WHY SO FLAT
 *
 * Every solid part goes into one of **three** shading buckets, and that is not
 * an aesthetic choice -- it is the draw-call budget.  The baker merges by
 * shading signature, so a fourth bucket costs one draw call in every zone of
 * the world at once.  Three buys the distinction that actually matters in a
 * Kyoto street:
 *
 *     warm   timber, bamboo, lacquer, cloth, earth   -- shadow leans red
 *     cool   stone, granite, concrete, metal, tile   -- shadow leans violet
 *     pale   paper, plaster, ceramic, blossom, snow  -- high-key, stays light
 *
 * A fourth, `thin`, exists for wire, split bamboo and broom bristle, which are
 * one facet thick and go black under flat shading.  It is deliberately *not*
 * per-zone: props.js merges it once for the whole world, because it is a few
 * thousand triangles and half of it (the overhead wires) spans the map anyway.
 *
 * -------------------------------------------------------------- SIGNAGE
 *
 * Everything with a printed face reads from **one atlas**.  Forty different
 * `celTex` materials would be forty draw calls; one 2048x1024 canvas with
 * thirty-two cells on it is one.  Decals are always separate quads standing
 * proud of the body they belong to -- never a map on the body box -- because a
 * BoxGeometry puts its uv on all six faces and because depth is built outward.
 * ------------------------------------------------------------------ */

/* ------------------------------ shading ---------------------------------- */

export const SHADE = {
  warm: { bands: 3, tint: TINT.warm },
  cool: { bands: 3, tint: TINT.cool },
  pale: { bands: 'soft3', tint: TINT.cool },
  /* one facet thick -- flat shading turns these black away from the sun */
  thin: { bands: 3, tint: TINT.warm, flat: false },
};

/* ------------------------------- atlas ----------------------------------- */

export const AW = 2048, AH = 1280, ACOLS = 8, AROWS = 5;
const CW = AW / ACOLS, CH = AH / AROWS;

/** Cell names -> index.  Row-major, 8 across. */
export const CELL = {
  manhole: 0, drainSlot: 1, grating: 2, vendFront: 3,
  notice: 4, extinguisher: 5, meterElec: 6, acGrille: 7,
  mirrorFace: 8, aboard: 9, lanternRed: 10, lanternWhite: 11,
  sudareFace: 12, postFace: 13, shutterFace: 14, ceramicGlaze: 15,
  tags: 16, clothPlain: 17, clothNoren: 18, boxLabel: 19,
  markerFace: 20, tileEnd: 21, fanFace: 22, noPark: 23,
  vendSide: 24, nameplate: 25, surveyMark: 26, yatsuhashi: 27,
  paperPlain: 28, teaCanister: 29, coneBand: 30, blank: 31,
  polePlates: 32, menuStrips: 33, hydrantPlate: 34, lampPanel: 35,
  meterGas: 36, kansaiPlate: 37,
};

/**
 * Remap a geometry's uv into one atlas cell, in place.
 *
 * The inset is not optional: without it the mip chain bleeds the neighbouring
 * cell in along every edge, and the tell is a coloured fringe round a sign at
 * exactly the distance where nobody is looking for a texture bug.
 */
export function atlasUV(geo, cell, inset = 3) {
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  const cx = cell % ACOLS, cy = Math.floor(cell / ACOLS);
  const u0 = (cx * CW + inset) / AW, u1 = ((cx + 1) * CW - inset) / AW;
  const v0 = 1 - ((cy + 1) * CH - inset) / AH, v1 = 1 - (cy * CH + inset) / AH;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  }
  uv.needsUpdate = true;
  return geo;
}

/* ------------------------------------------------------------------ *
 * The atlas cells.
 *
 * Each painter is handed a 256 x 256 context already translated and clipped to
 * its own cell.  Type is 明朝 throughout -- see the note at the top of
 * `textures.js`: gothic on a Kyoto shopfront reads as a convenience store, and
 * the signage ordinance exists precisely to stop that happening.
 * ------------------------------------------------------------------ */

/**
 * `mixHex` returns a **'#rrggbb' string**, for a Canvas2D fillStyle.  The baker
 * wants a number, and `mixHex(a, b, t) | 0` -- which reads as if it coerces --
 * is `NaN | 0`, i.e. **black**.  Every blended colour in this file went through
 * that expression once, and the tell was a beige vending machine rendering as a
 * black slab with black shelves inside it.
 */
const mix = (a, b, t) => parseInt(mixHex(a, b, t).slice(1), 16);

/**
 * The vending machine's colour, and the figure is exact.
 *
 * The soft-drink industry's own 自主景観ガイドライン (Jan 2006) specifies
 * 修正マンセル 5Y7.5/1.5, i.e. 日本塗料工業会 E25-75C -- a **warm pale
 * grey-beige, not brown**.  The widely-repeated "brown Kyoto vending machine"
 * is unverified (STREET 3.3); the beige is documented, so the beige wins.
 * `PAL.vendBody` is the browner wrap, kept for the `brown` variant.
 */
const VEND = mix(PAL.vendPanel, PAL.vendBody, 0.28);

const PAINT = {};

/* --- 京都市 下水道: the sewer lid.  Kyoto's carries the 御所車 cart wheel. --- */
PAINT.manhole = (c, W, H) => {
  const R = W * 0.5;
  c.fillStyle = hex(PAL.drain);
  c.fillRect(0, 0, W, H);
  c.translate(W / 2, H / 2);
  c.fillStyle = mixHex(PAL.drain, 0x000000, 0.22);
  c.beginPath(); c.arc(0, 0, R * 0.96, 0, TAU); c.fill();
  c.fillStyle = mixHex(PAL.drain, 0xffffff, 0.10);
  c.beginPath(); c.arc(0, 0, R * 0.88, 0, TAU); c.fill();
  // the cart wheel: a hub, sixteen spokes, two rims
  c.strokeStyle = mixHex(PAL.drain, 0x000000, 0.45);
  c.lineWidth = R * 0.055;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    c.beginPath();
    c.moveTo(Math.cos(a) * R * 0.16, Math.sin(a) * R * 0.16);
    c.lineTo(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62);
    c.stroke();
  }
  for (const r of [0.62, 0.70, 0.80]) {
    c.lineWidth = R * (r === 0.70 ? 0.03 : 0.05);
    c.beginPath(); c.arc(0, 0, R * r, 0, TAU); c.stroke();
  }
  c.fillStyle = mixHex(PAL.drain, 0x000000, 0.45);
  c.beginPath(); c.arc(0, 0, R * 0.15, 0, TAU); c.fill();
  // The centre carries the city's first-generation seal, not more text: the
  // current seal incorporates the goshoguruma itself and is too fine to cast.
  c.strokeStyle = mixHex(PAL.drain, 0xffffff, 0.28);
  c.lineWidth = R * 0.030;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    c.beginPath();
    c.moveTo(Math.cos(a) * R * 0.045, Math.sin(a) * R * 0.045);
    c.lineTo(Math.cos(a) * R * 0.125, Math.sin(a) * R * 0.125);
    c.stroke();
  }
  // the lettering rides the rim, upright, the way a real lid is cast
  c.fillStyle = mixHex(PAL.drain, 0xffffff, 0.30);
  c.font = `bold ${R * 0.155}px ${MINCHO}`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('京都市', 0, -R * 0.74);
  c.fillText('おすい', 0, R * 0.76);
};

/* --- 側溝蓋: the precast channel cover, with its two lifting eyes --- */
PAINT.drainSlot = (c, W, H) => {
  c.fillStyle = hex(PAL.concrete);
  c.fillRect(0, 0, W, H);
  grain(c, W, H, 0.05, 7);
  c.strokeStyle = mixHex(PAL.concrete, 0x000000, 0.34);
  c.lineWidth = 3;
  c.strokeRect(4, 4, W - 8, H - 8);
  c.fillStyle = mixHex(PAL.concrete, 0x000000, 0.55);
  for (const x of [W * 0.3, W * 0.7]) {
    c.beginPath(); c.ellipse(x, H * 0.5, W * 0.075, H * 0.05, 0, 0, TAU); c.fill();
  }
  c.strokeStyle = mixHex(PAL.concrete, 0x000000, 0.18);
  c.lineWidth = 2;
  for (const y of [H * 0.22, H * 0.78]) {
    c.beginPath(); c.moveTo(W * 0.06, y); c.lineTo(W * 0.94, y); c.stroke();
  }
};

/* --- the steel gutter grating --- */
PAINT.grating = (c, W, H) => {
  c.fillStyle = hex(PAL.metalDark);
  c.fillRect(0, 0, W, H);
  c.fillStyle = hex(0x24222c);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const y = H * (0.09 + (i / n) * 0.84);
    c.fillRect(W * 0.09, y, W * 0.82, H * 0.052);
  }
  c.strokeStyle = mixHex(PAL.metalDark, 0xffffff, 0.22);
  c.lineWidth = 4;
  c.strokeRect(3, 3, W - 6, H - 6);
};

/* --- the brown-wrapped vending machine.  Muted, by ordinance and on purpose. --- */
PAINT.vendFront = (c, W, H) => {
  c.fillStyle = hex(VEND);
  c.fillRect(0, 0, W, H);
  // the glazed display: three shelves of stock, kept low-contrast
  /* The display is a *lit* case, not a hole.  Drawn near-black it took the
   * whole upper half of the machine down with it. */
  c.fillStyle = mixHex(PAL.shopInterior, PAL.paperWarm, 0.35);
  c.fillRect(W * 0.07, H * 0.07, W * 0.86, H * 0.46);
  const tones = [PAL.matchaDeep, 0x6b4a38, PAL.indigoDeep, 0x8a6647, 0x4a6e94];
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 5; i++) {
      const t = tones[(i + r * 2) % 5];
      c.fillStyle = mixHex(t, 0xffffff, 0.10);
      c.fillRect(W * (0.10 + i * 0.166), H * (0.10 + r * 0.15), W * 0.125, H * 0.115);
      c.fillStyle = mixHex(t, 0xffffff, 0.52);
      c.fillRect(W * (0.10 + i * 0.166), H * (0.10 + r * 0.15), W * 0.038, H * 0.115);
      c.fillStyle = hex(PAL.paperWarm);
      c.fillRect(W * (0.10 + i * 0.166), H * (0.10 + r * 0.15), W * 0.125, H * 0.016);
    }
    c.fillStyle = mixHex(PAL.shopInterior, 0x000000, 0.3);
    c.fillRect(W * 0.07, H * (0.216 + r * 0.15), W * 0.86, H * 0.010);
  }
  // あたたかい / つめたい: the one place a machine is allowed two saturated
  // bands, and the two words that say "Japan" faster than anything else here
  const bands = [['あたたかい', PAL.redDeep], ['つめたい', PAL.indigoDeep]];
  bands.forEach(([txt, colr], i) => {
    c.fillStyle = hex(colr);
    c.fillRect(W * (0.07 + i * 0.44), H * 0.545, W * 0.42, H * 0.048);
    c.fillStyle = hex(PAL.white);
    c.font = `bold ${H * 0.036}px ${MINCHO}`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(txt, W * (0.28 + i * 0.44), H * 0.570);
  });
  // price flags -- generic product words only, never a brand mark
  const names = ['緑茶', 'ほうじ茶', '水', 'コーヒー', '緑茶'];
  for (let i = 0; i < 5; i++) {
    c.fillStyle = hex(PAL.paperWarm);
    c.fillRect(W * (0.10 + i * 0.166), H * 0.605, W * 0.125, H * 0.062);
    c.fillStyle = hex(PAL.black);
    c.font = `${H * 0.030}px ${MINCHO}`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(names[i], W * (0.1625 + i * 0.166), H * 0.622);
    c.fillStyle = hex(PAL.redDeep);
    c.font = `bold ${H * 0.032}px ${MINCHO}`;
    c.fillText('１６０円', W * (0.1625 + i * 0.166), H * 0.652);
  }
  // coin column, then the 取出口 at the bottom -- a real dark pocket
  c.fillStyle = mixHex(VEND, 0x000000, 0.28);
  c.fillRect(W * 0.70, H * 0.69, W * 0.23, H * 0.15);
  c.fillStyle = hex(0x1f1c24);
  c.fillRect(W * 0.765, H * 0.715, W * 0.035, H * 0.070);
  c.fillStyle = mixHex(VEND, 0x000000, 0.45);
  c.font = `${H * 0.030}px ${MINCHO}`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('返却レバー', W * 0.815, H * 0.815);
  c.fillStyle = hex(0x1b1820);
  c.fillRect(W * 0.07, H * 0.855, W * 0.52, H * 0.10);
  c.fillStyle = mixHex(VEND, 0xffffff, 0.22);
  c.font = `${H * 0.040}px ${MINCHO}`;
  c.textAlign = 'left';
  c.fillText('取出口', W * 0.09, H * 0.822);
};

PAINT.vendSide = (c, W, H) => {
  c.fillStyle = hex(VEND);
  c.fillRect(0, 0, W, H);
  grain(c, W, H, 0.03, 17);
  c.fillStyle = mixHex(VEND, 0x000000, 0.16);
  c.fillRect(W * 0.14, 0, W * 0.05, H);
};

/* --- 私道につき無断撮影禁止.  Hanamikoji's own sign, and a real one. --- */
PAINT.notice = (c, W, H) => {
  c.fillStyle = hex(PAL.paper);
  c.fillRect(0, 0, W, H);
  grain(c, W, H, 0.04, 3);
  c.strokeStyle = hex(PAL.timber);
  c.lineWidth = 5;
  c.strokeRect(6, 6, W - 12, H - 12);
  /* Verbatim, from the boards the 祇園町南側地区協議会 put up on 2019-10-25.
   * The Japanese writes 一万円 in kanji and the English writes GBP-style
   * digits; that mismatch is on the real sign and is worth keeping. */
  centered(c, '私道での撮影禁止', W / 2, H * 0.115, W * 0.86, H * 0.10, hex(PAL.black));
  // the camera pictogram, struck through
  c.save();
  c.translate(W / 2, H * 0.42);
  c.fillStyle = mixHex(PAL.black, PAL.paper, 0.12);
  c.fillRect(-W * 0.20, -H * 0.075, W * 0.40, H * 0.155);
  c.fillRect(-W * 0.085, -H * 0.105, W * 0.13, H * 0.035);
  c.fillStyle = hex(PAL.paper);
  c.beginPath(); c.arc(0, 0, W * 0.062, 0, TAU); c.fill();
  c.fillStyle = mixHex(PAL.black, PAL.paper, 0.12);
  c.beginPath(); c.arc(0, 0, W * 0.036, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(200,52,72,0.92)';
  c.lineWidth = W * 0.055;
  c.beginPath(); c.moveTo(-W * 0.26, H * 0.13); c.lineTo(W * 0.26, -H * 0.13); c.stroke();
  c.restore();
  centered(c, 'No photography', W / 2, H * 0.60, W * 0.80, H * 0.062, hex(PAL.black), { font: GOTHIC });
  centered(c, '許可のない撮影は', W / 2, H * 0.72, W * 0.86, H * 0.066, hex(PAL.redDeep));
  centered(c, '一万円申し受けます', W / 2, H * 0.80, W * 0.86, H * 0.066, hex(PAL.redDeep));
  centered(c, '祇園町南側地区協議会', W / 2, H * 0.90, W * 0.72, H * 0.048,
    mixHex(PAL.black, PAL.paper, 0.35));
};

/* --- 消火器.  Fire kit is legally red; it is the one loud small thing here. --- */
PAINT.extinguisher = (c, W, H) => {
  c.fillStyle = hex(PAL.redDeep);
  c.fillRect(0, 0, W, H);
  c.strokeStyle = mixHex(PAL.redDeep, 0x000000, 0.35);
  c.lineWidth = 6;
  c.strokeRect(5, 5, W - 10, H - 10);
  verticalFit(c, '消火器', W * 0.5, H * 0.10, H * 0.78, H * 0.20, hex(PAL.white));
  c.fillStyle = mixHex(PAL.redDeep, 0x000000, 0.5);
  c.fillRect(W * 0.34, H * 0.86, W * 0.32, H * 0.05);
};

PAINT.meterElec = (c, W, H) => {
  c.fillStyle = hex(PAL.meterBox);
  c.fillRect(0, 0, W, H);
  c.strokeStyle = mixHex(PAL.meterBox, 0x000000, 0.3);
  c.lineWidth = 4;
  c.strokeRect(6, 6, W - 12, H - 12);
  c.fillStyle = hex(0x2a2830);
  c.fillRect(W * 0.16, H * 0.20, W * 0.68, H * 0.34);
  c.fillStyle = hex(PAL.paperWarm);
  c.fillRect(W * 0.20, H * 0.26, W * 0.60, H * 0.22);
  c.fillStyle = hex(PAL.black);
  c.font = `bold ${H * 0.16}px ${MINCHO}`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('0 4 7 2', W * 0.5, H * 0.375);
  c.font = `${H * 0.10}px ${MINCHO}`;
  c.fillStyle = mixHex(PAL.meterBox, 0x000000, 0.6);
  c.fillText('電力量計', W * 0.5, H * 0.70);
  c.fillStyle = hex(PAL.indigoDeep);
  c.fillRect(W * 0.20, H * 0.80, W * 0.60, H * 0.12);
  centered(c, '関西電力', W * 0.5, H * 0.86, W * 0.54, H * 0.09, hex(PAL.white));
};

PAINT.meterGas = (c, W, H) => {
  c.fillStyle = hex(PAL.plasterWarm);
  c.fillRect(0, 0, W, H);
  c.strokeStyle = mixHex(PAL.plasterWarm, 0x000000, 0.3);
  c.lineWidth = 4;
  c.strokeRect(6, 6, W - 12, H - 12);
  c.fillStyle = hex(0x2a2830);
  c.fillRect(W * 0.18, H * 0.22, W * 0.64, H * 0.30);
  c.fillStyle = hex(PAL.paperWarm);
  c.fillRect(W * 0.22, H * 0.27, W * 0.56, H * 0.20);
  c.fillStyle = hex(PAL.black);
  c.font = `bold ${H * 0.14}px ${MINCHO}`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('1 3 8', W * 0.5, H * 0.37);
  c.fillStyle = hex(PAL.indigo);
  c.fillRect(W * 0.18, H * 0.60, W * 0.64, H * 0.14);
  centered(c, '大阪ガス', W * 0.5, H * 0.67, W * 0.58, H * 0.10, hex(PAL.white));
  // the 検針票 tag, tucked behind: ubiquitous, and nobody models it
  c.fillStyle = hex(PAL.paper);
  c.fillRect(W * 0.60, H * 0.78, W * 0.26, H * 0.17);
  c.strokeStyle = mixHex(PAL.paper, 0x000000, 0.3);
  c.lineWidth = 2;
  c.strokeRect(W * 0.60, H * 0.78, W * 0.26, H * 0.17);
};

/* The stack of little plates on a pole.  Three of them and a street reads as
 * a real Japanese street -- the highest value per unit of work in the kit. */
PAINT.polePlates = (c, W, H) => {
  c.clearRect(0, 0, W, H);
  const plate = (y, h, bg, fg, txt, size) => {
    c.fillStyle = hex(bg);
    c.fillRect(W * 0.16, y, W * 0.68, h);
    c.strokeStyle = mixHex(bg, 0x000000, 0.35);
    c.lineWidth = 2;
    c.strokeRect(W * 0.16, y, W * 0.68, h);
    verticalFit(c, txt, W * 0.5, y + h * 0.06, y + h * 0.94, size, hex(fg));
  };
  plate(H * 0.02, H * 0.30, PAL.indigoDeep, PAL.white, '関西電力', W * 0.5);
  plate(H * 0.35, H * 0.22, PAL.paper, PAL.black, '東山幹', W * 0.44);
  plate(H * 0.60, H * 0.16, 0xa8342c, PAL.white, '登はん禁止', W * 0.30);
  plate(H * 0.79, H * 0.19, PAL.gateGreen, PAL.white, 'NTT西日本', W * 0.32);
};

/* 短冊掛け -- the menu rack: eight paper strips on a timber frame. */
PAINT.menuStrips = (c, W, H) => {
  c.fillStyle = mixHex(PAL.timber, 0x000000, 0.25);
  c.fillRect(0, 0, W, H);
  const items = ['抹茶', '煎茶', 'ぜんざい', 'わらび餅', 'あんみつ', '甘酒', 'みたらし', 'くずきり'];
  for (let i = 0; i < 8; i++) {
    const x = W * (0.045 + i * 0.1195);
    c.fillStyle = hex(PAL.paper);
    c.fillRect(x, H * 0.05, W * 0.10, H * 0.90);
    verticalFit(c, items[i], x + W * 0.05, H * 0.10, H * 0.72, W * 0.075, hex(PAL.black));
    verticalFit(c, '七〇〇円', x + W * 0.05, H * 0.74, H * 0.94, W * 0.052, hex(PAL.redDeep));
  }
};

/* 市民用消火栓 -- the cedar hydrant box's plate. */
PAINT.hydrantPlate = (c, W, H) => {
  c.fillStyle = hex(PAL.paper);
  c.fillRect(0, 0, W, H);
  c.strokeStyle = hex(PAL.redDeep);
  c.lineWidth = 8;
  c.strokeRect(8, 8, W - 16, H - 16);
  centered(c, '市民用', W / 2, H * 0.32, W * 0.72, H * 0.20, hex(PAL.black));
  centered(c, '消火栓', W / 2, H * 0.64, W * 0.80, H * 0.28, hex(PAL.redDeep));
};

/* The paper panel of Hanamikoji's copper street lamp. */
PAINT.lampPanel = (c, W, H) => {
  c.fillStyle = hex(PAL.paperWarm);
  c.fillRect(0, 0, W, H);
  grain(c, W, H, 0.05, 23);
  c.strokeStyle = mixHex(PAL.copperDark, 0x000000, 0.2);
  c.lineWidth = 7;
  c.strokeRect(4, 4, W - 8, H - 8);
  c.beginPath(); c.moveTo(0, H * 0.5); c.lineTo(W, H * 0.5); c.stroke();
};

PAINT.kansaiPlate = (c, W, H) => {
  c.fillStyle = hex(PAL.paper);
  c.fillRect(0, 0, W, H);
  c.fillStyle = hex(PAL.black);
  c.font = `bold ${H * 0.30}px ${MINCHO}`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('危険', W * 0.5, H * 0.32);
  c.fillStyle = hex(PAL.redDeep);
  c.fillText('高電圧', W * 0.5, H * 0.70);
};

PAINT.acGrille = (c, W, H) => {
  c.fillStyle = hex(PAL.acUnit);
  c.fillRect(0, 0, W, H);
  c.strokeStyle = mixHex(PAL.acUnit, 0x000000, 0.28);
  c.lineWidth = 3;
  c.strokeRect(5, 5, W - 10, H - 10);
  c.save();
  c.translate(W * 0.5, H * 0.52);
  c.fillStyle = mixHex(PAL.acUnit, 0x000000, 0.30);
  c.beginPath(); c.arc(0, 0, W * 0.36, 0, TAU); c.fill();
  c.fillStyle = mixHex(PAL.acUnit, 0xffffff, 0.10);
  c.beginPath(); c.arc(0, 0, W * 0.33, 0, TAU); c.fill();
  c.strokeStyle = mixHex(PAL.acUnit, 0x000000, 0.26);
  c.lineWidth = 3.5;
  for (let i = 1; i <= 4; i++) { c.beginPath(); c.arc(0, 0, W * 0.33 * (i / 4.4), 0, TAU); c.stroke(); }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    c.beginPath(); c.moveTo(0, 0);
    c.lineTo(Math.cos(a) * W * 0.33, Math.sin(a) * W * 0.33); c.stroke();
  }
  c.restore();
  c.fillStyle = mixHex(PAL.acUnit, 0x000000, 0.2);
  for (let i = 0; i < 3; i++) c.fillRect(W * 0.1, H * (0.08 + i * 0.035), W * 0.8, H * 0.016);
};

/* --- the traffic mirror's face: sky, not silver.  A mirror reads as pale. --- */
PAINT.mirrorFace = (c, W, H) => {
  /* A mirror is the brightest thing on its pole: it is a disc of sky.  Graded
   * down to `stoneDark` at one end it read as a black hole in an orange ring. */
  const g = c.createLinearGradient(0, 0, W * 0.8, H);
  g.addColorStop(0, hex(PAL.paper));
  g.addColorStop(0.55, mixHex(PAL.mirrorFace, PAL.paper, 0.30));
  g.addColorStop(1, mixHex(PAL.mirrorFace, PAL.stoneDark, 0.20));
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.globalAlpha = 0.5;
  c.fillStyle = hex(PAL.white);
  c.beginPath();
  c.ellipse(W * 0.34, H * 0.3, W * 0.24, H * 0.1, -0.6, 0, TAU);
  c.fill();
  c.globalAlpha = 1;
};

PAINT.aboard = (c, W, H) => {
  c.fillStyle = hex(0x2f2a2c);
  c.fillRect(0, 0, W, H);
  c.strokeStyle = hex(PAL.timberPale);
  c.lineWidth = 5;
  c.strokeRect(7, 7, W - 14, H - 14);
  brushVertical(c, 'お品書き', W * 0.83, H * 0.16, H * 0.115, H * 0.10, hex(PAL.paperWarm));
  const items = ['抹茶あんみつ', 'わらび餅', '生八ツ橋', 'ほうじ茶'];
  items.forEach((t, i) => {
    verticalFit(c, t, W * (0.63 - i * 0.155), H * 0.12, H * 0.86, H * 0.082, hex(PAL.paper));
  });
};

/* --- 提灯.  The ribs matter more than the writing. --- */
function chochin(c, W, H, paper, ink, draw) {
  c.fillStyle = hex(paper);
  c.fillRect(0, 0, W, H);
  c.strokeStyle = mixHex(paper, 0x000000, 0.22);
  c.lineWidth = 2.4;
  for (let i = 1; i < 13; i++) {
    const y = (i / 13) * H;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  c.fillStyle = hex(PAL.lanternFrame);
  c.fillRect(0, 0, W, H * 0.07);
  c.fillRect(0, H * 0.93, W, H * 0.07);
  draw(c, W, H, hex(ink));
}

PAINT.lanternRed = (c, W, H) => chochin(c, W, H, PAL.lanternRed, PAL.black, (cc, w, h, ink) => {
  // つなぎ団子 -- the Gion Kobu crest: five dumplings on a ring
  cc.save();
  cc.translate(w * 0.5, h * 0.30);
  cc.fillStyle = hex(PAL.paper);
  cc.beginPath(); cc.arc(0, 0, w * 0.15, 0, TAU); cc.fill();
  cc.fillStyle = ink;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - Math.PI / 2;
    cc.beginPath();
    cc.arc(Math.cos(a) * w * 0.085, Math.sin(a) * w * 0.085, w * 0.036, 0, TAU);
    cc.fill();
  }
  cc.restore();
  verticalFit(cc, '祇園', w * 0.5, h * 0.50, h * 0.88, h * 0.19, hex(PAL.black));
});

PAINT.lanternWhite = (c, W, H) => chochin(c, W, H, PAL.lantern, PAL.black, (cc, w, h, ink) => {
  verticalFit(cc, '御食事', w * 0.5, h * 0.14, h * 0.88, h * 0.21, ink);
});

PAINT.paperPlain = (c, W, H) => chochin(c, W, H, PAL.paperWarm, PAL.black, () => {});

PAINT.sudareFace = (c, W, H) => {
  c.fillStyle = hex(PAL.sudare);
  c.fillRect(0, 0, W, H);
  /* The reeds are a *tint*, not a texture.  Drawn dark and dense they average
   * to a near-black panel in the mip chain, and a sudare that is not warm
   * straw stops reading as a sudare and starts reading as a shuttered window. */
  c.strokeStyle = hex(PAL.sudareDark);
  c.lineWidth = 1.1;
  c.globalAlpha = 0.30;
  for (let i = 0; i < 42; i++) {
    const y = (i / 42) * H + 2;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  c.globalAlpha = 1;
  c.fillStyle = mixHex(PAL.sudare, PAL.timber, 0.55);
  c.fillRect(W * 0.16, 0, 3, H);
  c.fillRect(W * 0.82, 0, 3, H);
  c.fillStyle = mixHex(PAL.sudare, PAL.timber, 0.45);
  c.fillRect(0, 0, W, H * 0.05);
  c.fillRect(0, H * 0.95, W, H * 0.05);
};

PAINT.postFace = (c, W, H) => {
  c.fillStyle = hex(0xa8342c);
  c.fillRect(0, 0, W, H);
  c.fillStyle = hex(PAL.white);
  c.font = `bold ${H * 0.30}px ${MINCHO}`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('〒', W * 0.5, H * 0.30);
  c.font = `bold ${H * 0.11}px ${MINCHO}`;
  c.fillText('郵便', W * 0.5, H * 0.52);
  c.fillStyle = hex(0x1f1a1e);
  c.fillRect(W * 0.14, H * 0.66, W * 0.72, H * 0.075);
  c.fillStyle = mixHex(0xa8342c, 0x000000, 0.3);
  c.fillRect(W * 0.14, H * 0.745, W * 0.72, H * 0.03);
};

PAINT.shutterFace = (c, W, H) => {
  c.fillStyle = hex(PAL.metalWarm);
  c.fillRect(0, 0, W, H);
  const n = 22;
  for (let i = 0; i < n; i++) {
    const y = (i / n) * H;
    c.fillStyle = mixHex(PAL.metalWarm, 0xffffff, 0.14);
    c.fillRect(0, y, W, H / n * 0.52);
    c.fillStyle = mixHex(PAL.metalWarm, 0x000000, 0.16);
    c.fillRect(0, y + H / n * 0.78, W, H / n * 0.22);
  }
};

PAINT.ceramicGlaze = (c, W, H) => {
  c.fillStyle = hex(PAL.ceramicWhite);
  c.fillRect(0, 0, W, H);
  c.strokeStyle = hex(PAL.ceramicBlue);
  c.lineWidth = W * 0.035;
  c.globalAlpha = 0.85;
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.arc(W * (0.2 + i * 0.22), H * 1.15, W * 0.26, Math.PI * 1.12, Math.PI * 1.88);
    c.stroke();
  }
  c.globalAlpha = 0.5;
  c.lineWidth = W * 0.016;
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.arc(W * (0.1 + i * 0.22), H * -0.15, W * 0.2, Math.PI * 0.14, Math.PI * 0.86);
    c.stroke();
  }
  c.globalAlpha = 1;
};

PAINT.tags = (c, W, H) => {
  c.fillStyle = mixHex(PAL.paper, PAL.timber, 0.1);
  c.fillRect(0, 0, W, H);
  const rows = [['小 皿', '八〇〇円'], ['湯 呑', '一二〇〇円'], ['急 須', '三八〇〇円'], ['箸 置', '五〇〇円']];
  rows.forEach(([n, p], i) => {
    const y = H * (0.10 + i * 0.225);
    c.fillStyle = hex(PAL.paper);
    c.fillRect(W * 0.06, y, W * 0.88, H * 0.185);
    c.strokeStyle = mixHex(PAL.paper, 0x000000, 0.28);
    c.lineWidth = 2;
    c.strokeRect(W * 0.06, y, W * 0.88, H * 0.185);
    c.fillStyle = hex(PAL.black);
    c.font = `${H * 0.075}px ${MINCHO}`;
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(n, W * 0.11, y + H * 0.09);
    c.fillStyle = hex(PAL.redDeep);
    c.textAlign = 'right';
    c.fillText(p, W * 0.90, y + H * 0.09);
  });
};

/* --- cloth.  These two cells carry alpha; everything else is opaque. --- */
function clothCell(c, W, H, cloth, draw) {
  c.clearRect(0, 0, W, H);
  c.fillStyle = hex(cloth);
  c.beginPath();
  c.moveTo(W * 0.04, 0);
  c.lineTo(W * 0.96, 0);
  c.lineTo(W * 0.96, H * 0.93);
  for (let i = 10; i >= 0; i--) {
    const t = i / 10;
    c.lineTo(W * (0.04 + t * 0.92), H * (0.93 + Math.sin(t * Math.PI * 2.4) * 0.035));
  }
  c.closePath();
  c.fill();
  c.fillStyle = mixHex(cloth, 0x000000, 0.22);
  c.fillRect(W * 0.04, 0, W * 0.92, H * 0.06);
  if (draw) draw(c, W, H);
}

PAINT.clothPlain = (c, W, H) => clothCell(c, W, H, PAL.norenCream, (cc, w, h) => {
  cc.strokeStyle = mixHex(PAL.norenCream, PAL.timber, 0.3);
  cc.lineWidth = 3;
  for (const x of [w * 0.3, w * 0.7]) {
    cc.beginPath(); cc.moveTo(x, h * 0.08); cc.lineTo(x, h * 0.9); cc.stroke();
  }
});

PAINT.clothNoren = (c, W, H) => clothCell(c, W, H, PAL.norenIndigo, (cc, w, h) => {
  centered(cc, '湯', w * 0.5, h * 0.42, w * 0.6, h * 0.34, hex(PAL.paper));
});

PAINT.boxLabel = (c, W, H) => {
  woodGrain(c, W, H, PAL.timberPale, mix(PAL.timberPale, 0x000000, 0.45), { lines: 12 });
  c.strokeStyle = mixHex(PAL.timberPale, 0x000000, 0.38);
  c.lineWidth = 6;
  c.strokeRect(8, 8, W - 16, H - 16);
  c.beginPath(); c.moveTo(8, 8); c.lineTo(W - 8, H - 8); c.stroke();
  centered(c, '京', W * 0.5, H * 0.5, W * 0.5, H * 0.42, mixHex(PAL.black, PAL.timberPale, 0.15));
};

PAINT.markerFace = (c, W, H) => {
  c.fillStyle = hex(PAL.stone);
  c.fillRect(0, 0, W, H);
  grain(c, W, H, 0.06, 11);
  verticalFit(c, '清水道', W * 0.5, H * 0.08, H * 0.94, H * 0.26, mixHex(PAL.stone, 0x000000, 0.62));
};

/* --- 軒丸瓦: the round eave-tile end, with a 三つ巴 --- */
PAINT.tileEnd = (c, W, H) => {
  c.fillStyle = hex(PAL.tileRoof);
  c.fillRect(0, 0, W, H);
  c.translate(W / 2, H / 2);
  c.fillStyle = hex(PAL.tileShade);
  c.beginPath(); c.arc(0, 0, W * 0.44, 0, TAU); c.fill();
  c.fillStyle = hex(PAL.tileEdge);
  c.beginPath(); c.arc(0, 0, W * 0.38, 0, TAU); c.fill();
  c.fillStyle = hex(PAL.tileRidge);
  for (let i = 0; i < 3; i++) {
    c.save();
    c.rotate((i / 3) * TAU);
    c.beginPath();
    c.arc(0, -W * 0.15, W * 0.115, 0, TAU);
    c.fill();
    c.beginPath();
    c.moveTo(-W * 0.03, -W * 0.15);
    c.quadraticCurveTo(W * 0.02, W * 0.06, W * 0.16, W * 0.10);
    c.quadraticCurveTo(W * 0.02, W * 0.02, W * 0.085, -W * 0.15);
    c.closePath();
    c.fill();
    c.restore();
  }
};

PAINT.fanFace = (c, W, H) => {
  c.fillStyle = hex(PAL.paperWarm);
  c.fillRect(0, 0, W, H);
  c.fillStyle = hex(PAL.leafMapleAutumn);
  c.globalAlpha = 0.85;
  for (let i = 0; i < 5; i++) {
    const x = W * (0.18 + (i % 3) * 0.3), y = H * (0.3 + Math.floor(i / 3) * 0.34);
    c.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * 0.52;
      c.moveTo(x, y + W * 0.07);
      c.lineTo(x + Math.cos(a) * W * 0.085, y + W * 0.07 + Math.sin(a) * W * 0.085);
    }
    c.lineWidth = W * 0.028;
    c.strokeStyle = hex(PAL.leafMapleAutumn);
    c.stroke();
  }
  c.globalAlpha = 1;
  c.strokeStyle = mixHex(PAL.paperWarm, PAL.timber, 0.35);
  c.lineWidth = 2;
  for (let i = 0; i <= 10; i++) {
    c.beginPath(); c.moveTo(W * 0.5, H * 1.35);
    c.lineTo(W * (i / 10), -H * 0.1); c.stroke();
  }
};

PAINT.noPark = (c, W, H) => {
  c.fillStyle = hex(PAL.white);
  c.fillRect(0, 0, W, H);
  c.translate(W / 2, H / 2);
  c.fillStyle = hex(PAL.indigo);
  c.beginPath(); c.arc(0, 0, W * 0.42, 0, TAU); c.fill();
  c.fillStyle = hex(PAL.white);
  c.beginPath(); c.arc(0, 0, W * 0.33, 0, TAU); c.fill();
  c.fillStyle = hex(PAL.indigo);
  c.beginPath(); c.arc(0, 0, W * 0.30, 0, TAU); c.fill();
  c.strokeStyle = hex(PAL.red);
  c.lineWidth = W * 0.075;
  c.beginPath(); c.moveTo(-W * 0.24, W * 0.24); c.lineTo(W * 0.24, -W * 0.24); c.stroke();
};

PAINT.nameplate = (c, W, H) => {
  woodGrain(c, W, H, PAL.timberPale, mix(PAL.timberPale, 0x000000, 0.5), { lines: 14, vertical: true });
  c.strokeStyle = mixHex(PAL.timberPale, 0x000000, 0.3);
  c.lineWidth = 3;
  c.strokeRect(5, 5, W - 10, H - 10);
  brushVertical(c, '中村', W * 0.5, H * 0.30, H * 0.34, H * 0.28, hex(PAL.black));
};

PAINT.surveyMark = (c, W, H) => {
  c.fillStyle = hex(PAL.brass);
  c.fillRect(0, 0, W, H);
  c.translate(W / 2, H / 2);
  c.strokeStyle = mixHex(PAL.brass, 0x000000, 0.55);
  c.lineWidth = W * 0.045;
  c.beginPath(); c.moveTo(-W * 0.3, 0); c.lineTo(W * 0.3, 0);
  c.moveTo(0, -H * 0.3); c.lineTo(0, H * 0.3); c.stroke();
  c.beginPath(); c.arc(0, 0, W * 0.36, 0, TAU); c.stroke();
  c.fillStyle = mixHex(PAL.brass, 0x000000, 0.55);
  c.font = `bold ${H * 0.11}px ${MINCHO}`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('基準点', 0, H * 0.40);
};

PAINT.yatsuhashi = (c, W, H) => {
  c.fillStyle = mixHex(PAL.timberPale, PAL.timber, 0.25);
  c.fillRect(0, 0, W, H);
  const tones = [PAL.sweetPink, PAL.sweetGreen, PAL.wagashi, PAL.paperWarm];
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < 5; i++) {
      const x = W * (0.13 + i * 0.185), y = H * (0.16 + r * 0.22);
      c.fillStyle = hex(tones[(r + i) % 4]);
      c.beginPath();
      c.moveTo(x - W * 0.07, y + W * 0.055);
      c.lineTo(x + W * 0.07, y + W * 0.055);
      c.lineTo(x, y - W * 0.06);
      c.closePath(); c.fill();
    }
  }
};

PAINT.teaCanister = (c, W, H) => {
  c.fillStyle = hex(0x3a3430);
  c.fillRect(0, 0, W, H);
  c.fillStyle = hex(PAL.paperWarm);
  c.fillRect(W * 0.12, H * 0.24, W * 0.76, H * 0.52);
  verticalFit(c, '煎茶', W * 0.5, H * 0.30, H * 0.70, H * 0.20, hex(PAL.matchaDeep));
  c.fillStyle = hex(PAL.gold);
  c.fillRect(0, H * 0.08, W, H * 0.035);
  c.fillRect(0, H * 0.885, W, H * 0.035);
};

PAINT.coneBand = (c, W, H) => {
  c.fillStyle = hex(0xc45a30);
  c.fillRect(0, 0, W, H);
  c.fillStyle = hex(PAL.white);
  c.fillRect(0, H * 0.34, W, H * 0.30);
};

PAINT.blank = (c, W, H) => {
  c.fillStyle = hex(PAL.white);
  c.fillRect(0, 0, W, H);
};

/** The one texture every printed face in the world reads from. */
export const propAtlas = () => cached('propAtlas', () => make(AW, AH, (c) => {
  c.fillStyle = hex(PAL.plasterGrey);
  c.fillRect(0, 0, AW, AH);
  for (const [name, i] of Object.entries(CELL)) {
    const p = PAINT[name];
    if (!p) continue;
    c.save();
    c.translate((i % ACOLS) * CW, Math.floor(i / ACOLS) * CH);
    c.beginPath();
    c.rect(0, 0, CW, CH);
    c.clip();
    p(c, CW, CH);
    c.restore();
  }
}));

/* ------------------------------------------------------------------ *
 * The builders.
 *
 * Each takes the emitter `e` that `props.js` hands it and draws one prop in
 * the local frame described at the top of this file.  The emitter's vocabulary
 * is deliberately small:
 *
 *   e.box(w,h,d, colour, shade, x,y,z, rx,ry,rz)     centred on (x,y,z)
 *   e.up (w,h,d, colour, shade, x,y,z, ...)          base at y
 *   e.cyl(rTop,rBot,h,seg, colour, shade, x,y,z,...) centred on (x,y,z)
 *   e.tube(ax,ay,az, bx,by,bz, w,h, colour, shade)   a member between two joints
 *   e.lathe(profile, seg, colour, shade, x,y,z, ry)  a solid of revolution
 *   e.geo(geometry, matrix, colour, shade)           anything else
 *   e.decal(w,h, CELL.x, x,y,z, rx,ry,rz)            a printed face, standing proud
 *   e.decalGeo(geometry, matrix, CELL.x)             a printed face on a lathe/cylinder
 *   e.cloth(w,h, CELL.x, x,y,z, ry)                  a cut-out cloth panel
 *   e.anim(kind, opts)                               the only things that move
 *   e.collide(w,d, top, bottom, ox,oz)               only if it genuinely blocks
 *   e.hook(opts)                                     offer, never register
 *   e.attach(x,y,z)                                  a wire termination
 *   e.gy(dx,dz)                                      ground height at a local offset
 *   e.rng  e.variant  e.v(name)  e.seed
 *
 * `shade` is 'warm' | 'cool' | 'pale' | 'thin'.  Nothing else exists, on
 * purpose: see the note at the top.
 *
 * **Members are drawn between joints, never placed by eye.**  Both previous
 * incarnations of this project shipped a bicycle whose fork stopped 0.3 m short
 * of the hub it was holding, because the parts were positioned rather than
 * connected.  `e.tube` takes the two ends.
 * ------------------------------------------------------------------ */

export const FURNITURE = {};
export const META = {};

const def = (name, group, opts, fn) => {
  FURNITURE[name] = fn;
  META[name] = { name, group, ...opts };
};

/* ================================================================== *
 * 1.  祇園 -- Gion and Hanamikoji
 * ================================================================== */

/**
 * 提灯 on an eave bracket.  ARCH 3.3: a 尺二 chochin is 0.28 m across and
 * 0.42 m in the body, hung at about 2.4 m under the hisashi.  Ochaya hang them
 * in pairs bearing the つなぎ団子 crest of Gion Kobu.
 */
def('ochayaLantern', 'gion', { alias: ['chochin'] }, (e) => {
  const white = e.v('white') || e.variant === 0;
  const cell = white ? CELL.lanternWhite : CELL.lanternRed;
  const pair = e.v('pair') ? [-0.30, 0.30] : [0];
  /* If the caller gave an explicit world y it is the hisashi soffit and the
   * bracket hangs from it; otherwise this is a free-standing placement and the
   * lantern goes at 2.86 m, under a townhouse's own pent roof. */
  const armY = e.anchored ? 0.0 : 2.86;
  if (!e.anchored) {
    /* Free-standing: the lantern needs its own bracket off the wall.  Hung
     * from a real hisashi -- which is what `machiya.js` does -- the eave is
     * already there and a second bracket hangs in mid-air under it. */
    e.box(0.06, 0.06, 0.40, PAL.timberDark, 'warm', 0, armY, 0.20);
    e.tube(0, armY - 0.44, 0.02, 0, armY - 0.03, 0.34, 0.05, 0.05, PAL.timberDark, 'warm');
  }
  for (const dx of pair) {
    if (!e.anchored) e.box(0.05, 0.05, 0.46, PAL.timberDark, 'warm', dx, armY, 0.22);
    e.cyl(0.008, 0.008, 0.17, 4, PAL.iron, 'cool', dx, armY - 0.085, 0.32);
    // the body: a lathe, so it bulges the way a chochin does
    /* 長型 9号: Φ24 x 60 cm overall including the handle (STREET 3.4), which
     * is the ochaya eave size.  The body is therefore Φ0.24 x ~0.46 and the
     * fittings make up the rest. */
    const prof = [
      [0.001, 0], [0.042, 0.006], [0.045, 0.028], [0.098, 0.115],
      [0.120, 0.24], [0.118, 0.34], [0.082, 0.42], [0.048, 0.445],
      [0.046, 0.465], [0.001, 0.470],
    ];
    const g = lathe(prof, 10);
    e.decalGeo(g, trs(dx, armY - 0.66, 0.32), cell);
    e.cyl(0.052, 0.052, 0.03, 8, PAL.lanternFrame, 'warm', dx, armY - 0.17, 0.32);
    e.cyl(0.05, 0.05, 0.025, 8, PAL.lanternFrame, 'warm', dx, armY - 0.655, 0.32);
    e.cyl(0.014, 0.020, 0.06, 5, PAL.lanternFrame, 'warm', dx, armY - 0.70, 0.32);
  }
});

/**
 * 犬矢来, free-standing.  Wall-attached fenders belong to `machiya.js`; this is
 * the loose length that closes the gap between two frontages or wraps a corner.
 *
 * ARCH 2.8: 0.80 m at the wall, projecting 0.30 m at grade, a single convex
 * bow, split bamboo butt-jointed so it reads as a ribbed surface and not as a
 * picket fence.  Weathered Gion ones are near-black; new ones are straw.
 */
def('inuyaraiFree', 'gion', {}, (e) => {
  const len = e.v('long') ? 3.8 : e.v('short') ? 1.1 : 1.95;
  const black = e.v('black') || e.rng.chance(0.45);
  const cane = black ? 0x3a332c : PAL.bambooCulmPale;
  const caneAlt = black ? 0x2e2924 : PAL.bambooCulm;
  const H = 0.80, OUT = 0.30;
  // the bow, as a quadratic from the wall top to the ground line
  const at = (t) => {
    const mt = 1 - t;
    return {
      z: mt * mt * 0.02 + 2 * mt * t * 0.27 + t * t * OUT,
      y: mt * mt * H + 2 * mt * t * 0.52 + t * t * 0.0,
    };
  };
  const S = [at(0), at(0.34), at(0.68), at(1)];
  const pitch = 0.052;
  const n = Math.max(2, Math.round(len / pitch));
  for (let i = 0; i <= n; i++) {
    const dx = -len / 2 + (i / n) * len;
    const dy = e.gy(dx, 0.15);
    const col = (i % 3 === 0) ? caneAlt : cane;
    for (let k = 0; k < 3; k++) {
      e.tube(dx, S[k].y + dy, S[k].z, dx, S[k + 1].y + dy, S[k + 1].z, 0.034, 0.017, col, 'thin');
    }
  }
  // three lashing rails in black shuro rope
  for (const t of [0.06, 0.5, 0.94]) {
    const p = at(t);
    for (let s = 0; s < 6; s++) {
      const x0 = -len / 2 + (s / 6) * len, x1 = -len / 2 + ((s + 1) / 6) * len;
      e.tube(x0, p.y + e.gy(x0, 0.15) + 0.012, p.z + 0.019,
             x1, p.y + e.gy(x1, 0.15) + 0.012, p.z + 0.019, 0.016, 0.016, 0x2a2622, 'thin');
    }
  }
});

/** 簾.  The blind itself, for an opening a facade module has left blank. */
def('sudareBlind', 'gion', {}, (e) => {
  const w = e.v('wide') ? 1.80 : 0.92;
  const top = e.anchored ? 0 : 2.88;
  const drop = e.v('rolled') ? 0.22 : (e.v('half') ? 0.85 : 1.62);
  e.cyl(0.028, 0.028, w + 0.10, 6, PAL.bambooCulm, 'warm', 0, top, 0.03, 0, 0, Math.PI / 2);
  if (e.v('rolled')) {
    e.cyl(0.10, 0.10, w, 8, PAL.sudare, 'warm', 0, top - 0.14, 0.05, 0, 0, Math.PI / 2);
    e.decalGeo(new THREE.CylinderGeometry(0.10, 0.10, w, 10, 1, true),
      trs(0, top - 0.14, 0.05, 0, 0, Math.PI / 2), CELL.sudareFace);
  } else {
    e.decal(w, drop, CELL.sudareFace, 0, top - 0.03 - drop / 2, 0.045);
    e.decal(w, drop, CELL.sudareFace, 0, top - 0.03 - drop / 2, 0.035, 0, Math.PI);
    e.cyl(0.02, 0.02, w, 5, PAL.timberDark, 'warm', 0, top - 0.03 - drop, 0.045, 0, 0, Math.PI / 2);
  }
});

/** 表札 -- the small nameplate by an ochaya door.  ARCH 3.3: about 0.12 x 0.40. */
def('nameplate', 'gion', {}, (e) => {
  /* STREET 3.1 is firmer than ARCH here: ~0.06 x 0.20 m at ~1.4 m.  Ochaya
   * nameplates are fingernail-sized, and that is the whole point of them. */
  const w = e.v('large') ? 0.12 : 0.075, h = e.v('large') ? 0.34 : 0.21;
  const y = e.anchored ? 0 : 1.42;
  e.box(w + 0.03, h + 0.03, 0.035, PAL.timberDark, 'warm', 0, y, 0.018);
  e.decal(w, h, CELL.nameplate, 0, y, 0.038);
  if (e.v('brass')) e.box(w + 0.05, 0.02, 0.05, PAL.brass, 'cool', 0, y - h / 2 - 0.02, 0.025);
});

/** The doorway pot.  A proper potted tree is `ctx.tree({ kind: 'potted' })`. */
def('planterPot', 'gion', {}, (e) => {
  const r = e.rng.range(0.15, 0.21);
  const h = r * 1.7;
  const glazed = e.rng.chance(0.5);
  const body = glazed ? e.rng.pick(CERAMIC) : 0x8a6a56;
  e.lathe([[r * 0.62, 0], [r * 0.70, 0.02], [r * 0.92, h * 0.55],
           [r, h * 0.88], [r * 1.06, h], [r * 1.02, h * 0.99], [r * 0.9, h * 0.94]],
    10, body, glazed ? 'pale' : 'warm', 0, 0, 0);
  e.cyl(r * 0.9, r * 0.9, 0.02, 10, 0x4a3f34, 'warm', 0, h * 0.93, 0);
  const rr = e.rng;
  const n = rr.int(4, 7);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rr.range(0, 1);
    const rad = rr.range(0.02, r * 0.75);
    e.geo(new THREE.IcosahedronGeometry(rr.range(0.075, 0.13), 0),
      trs(Math.cos(a) * rad, h * (0.95 + rr.range(0.10, 0.42)), Math.sin(a) * rad,
          0, a, 0, 1, 0.72, 1),
      i % 3 === 0 ? PAL.shrubLit : PAL.shrub, 'cool');
  }
});

/** The black timber car-stop outside an ochaya.  Slim: no collider by design. */
def('bollard', 'gion', {}, (e) => {
  if (e.v('granite')) {
    e.lathe([[0.10, 0], [0.105, 0.42], [0.10, 0.50], [0.075, 0.54], [0.001, 0.56]],
      8, PAL.stone, 'cool', 0, 0, 0);
    return;
  }
  const h = 0.72;
  e.up(0.13, h - 0.05, 0.13, PAL.timberDark, 'warm', 0, 0, 0);
  e.geo(taperBox(0.13, 0.13, 0.05, 0.34), trs(0, h - 0.05, 0), PAL.timberDark, 'warm');
  e.box(0.155, 0.03, 0.155, PAL.iron, 'cool', 0, 0.05, 0);
  if (e.v('roped')) e.cyl(0.012, 0.012, 0.10, 4, PAL.iron, 'cool', 0, h - 0.16, 0, Math.PI / 2, 0, 0);
});

/* -------------------------------- vehicles ------------------------------- *
 * A vehicle noses **+Z**, like everything else here.  Half the vehicles in the
 * previous incarnation of this project were built nosing +X while every other
 * prop faced +Z, and the two conventions met exactly once, in a car park.
 * ------------------------------------------------------------------------- */

function wheel(e, x, z, r = 0.31, w = 0.19) {
  e.cyl(r, r, w, 10, 0x24222a, 'cool', x, r, z, 0, 0, Math.PI / 2);
  e.cyl(r * 0.55, r * 0.55, w + 0.012, 8, PAL.metalDark, 'cool', x, r, z, 0, 0, Math.PI / 2);
}

/** The Kyoto taxi -- black lacquer, or MK / Yasaka green, with a roof 行灯. */
/**
 * The Kyoto taxi.  ヤサカ's livery is **maroon (えんじ) over white**, with the
 * clover mark on the andon and the body; the Crown Sedan is plain black, and MK
 * runs black premium sedans (STREET 3.11).  So: two-tone by default, `black`
 * and `green` for the other two.  The mark is a generic three-leaf, never the
 * company's actual logo.
 */
def('taxi', 'gion', {}, (e) => {
  const black = e.v('black'), green = e.v('green');
  /* えんじ, lifted.  The sun is high and behind, so a parked car's long side is
   * always the face turned away from it, and the cel ramp's bottom band on a
   * true maroon lands within a few per cent of the ink colour -- the glazing,
   * the shut lines and the whole livery stop existing.  Lift it. */
  const enji = mix(PAL.bengaraLit, PAL.purple, 0.10);
  const body = green ? PAL.taxiGreen : black ? PAL.taxiBlack : enji;
  const twoTone = !green && !black;
  const upper = twoTone ? PAL.vanWhite : mix(body, 0xffffff, 0.10);
  const upS = twoTone ? 'pale' : 'warm';
  const L = 4.60, W = 1.70;
  const hw = W / 2;

  e.box(W, 0.54, L, body, 'warm', 0, 0.53, 0);
  e.box(W, 0.22, L - 0.10, upper, upS, 0, 0.91, 0);
  if (twoTone) e.box(W + 0.012, 0.05, L - 0.16, mix(enji, 0x000000, 0.28), 'warm', 0, 0.80, 0);
  // bonnet and boot, stopping short of the greenhouse
  e.box(W - 0.08, 0.14, 1.10, upper, upS, 0, 1.06, 1.62);
  e.box(W - 0.08, 0.14, 0.86, upper, upS, 0, 1.06, -1.80);

  /* The greenhouse, built outward: a roof slab on six pillars with the glass
   * set between them.  As one tapered box with a full-length pane laid on its
   * side the pane stood proud of the taper over its whole height and the car
   * came out with a solid black upper half. */
  const gY0 = 1.02, gY1 = 1.48;
  const pillars = [[1.12, 0.13, 0.34], [0.02, 0.10, 0], [-1.16, 0.15, -0.30]];
  for (const sd of [-1, 1]) {
    for (const [pz, pw, rake] of pillars) {
      e.box(0.075, gY1 - gY0 + 0.06, pw, upper, upS, sd * (hw - 0.055), (gY0 + gY1) / 2, pz + 0.02, rake * 0.16);
    }
    e.box(0.05, 0.10, 2.46, upper, upS, sd * (hw - 0.05), gY1 - 0.02, -0.06);
    // the glass sits INSIDE the pillar line, which is what a window is
    e.box(0.03, gY1 - gY0 - 0.10, 0.92, PAL.glassDark, 'cool', sd * (hw - 0.075), (gY0 + gY1) / 2 - 0.02, 0.56);
    e.box(0.03, gY1 - gY0 - 0.10, 1.00, PAL.glassDark, 'cool', sd * (hw - 0.075), (gY0 + gY1) / 2 - 0.02, -0.60);
  }
  e.box(W - 0.20, 0.09, 2.52, upper, upS, 0, gY1 + 0.02, -0.06);
  // windscreen and rear screen, raked, offset along the rake's own outward face
  e.box(W - 0.26, 0.56, 0.04, PAL.glassDark, 'cool', 0, 1.235, 1.22, -0.42);
  e.box(W - 0.28, 0.50, 0.04, PAL.glassDark, 'cool', 0, 1.235, -1.24, 0.40);

  // 行灯 -- the roof sign, and the one thing that makes a dark box a taxi
  e.up(0.44, 0.16, 0.22, PAL.paperWarm, 'pale', 0, gY1 + 0.06, 0.34);
  e.box(0.47, 0.035, 0.25, PAL.black, 'warm', 0, gY1 + 0.14, 0.34);
  // a generic three-leaf, in place of any company mark
  for (const sd of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU - Math.PI / 2;
      e.cyl(0.05, 0.05, 0.012, 7, PAL.gateGreen, 'cool',
        sd * (hw + 0.006), 0.94 + Math.sin(a) * 0.052, 0.10 + Math.cos(a) * 0.052, 0, 0, Math.PI / 2);
    }
  }
  // lamps: small and deep, split by a housing bar, per the saturated-lamp rule
  for (const sd of [-1, 1]) {
    e.box(0.21, 0.13, 0.05, PAL.paperWarm, 'pale', sd * (hw - 0.24), 0.86, L / 2 - 0.01);
    e.box(0.19, 0.12, 0.05, PAL.redDeep, 'warm', sd * (hw - 0.24), 0.88, -L / 2 + 0.01);
    e.box(0.20, 0.022, 0.06, body, 'warm', sd * (hw - 0.24), 0.88, -L / 2 + 0.012);
  }
  e.box(W - 0.04, 0.11, 0.10, PAL.metalDark, 'cool', 0, 0.42, L / 2 - 0.02);
  e.box(W - 0.04, 0.11, 0.10, PAL.metalDark, 'cool', 0, 0.42, -L / 2 + 0.02);
  for (const sd of [-1, 1]) { wheel(e, sd * (hw - 0.10), 1.36); wheel(e, sd * (hw - 0.10), -1.36); }
  e.collide(W + 0.16, L + 0.14, 1.62);
});


/** The small delivery van -- a 軽バン, which is what actually gets down these lanes. */
def('van', 'gion', {}, (e) => {
  const L = 3.40, W = 1.48, H = 1.90;
  const body = e.v('grey') ? PAL.concreteDark : PAL.vanWhite;
  e.box(W, 0.44, L, body, 'cool', 0, 0.46, 0);
  e.box(W, H - 0.68, L - 0.90, body, 'cool', 0, 0.68 + (H - 0.68) / 2, -0.42);
  e.geo(taperBox(W, 0.94, 0.72, 0.94, 0.78), trs(0, 0.68, 1.10), body, 'cool');
  e.box(W - 0.10, 0.46, 0.04, PAL.glassDark, 'cool', 0, 1.24, 1.40);
  for (const s of [-1, 1]) e.box(0.03, 0.40, 0.62, PAL.glassDark, 'cool', s * (W / 2 - 0.02), 1.22, 0.94);
  e.box(W + 0.04, 0.06, L - 0.86, mix(body, 0x000000, 0.25), 'cool', 0, H - 0.04, -0.42);
  for (const s of [-1, 1]) {
    e.box(0.17, 0.12, 0.05, PAL.paperWarm, 'pale', s * (W / 2 - 0.20), 0.72, L / 2 - 0.02);
    e.box(0.16, 0.24, 0.05, PAL.redDeep, 'warm', s * (W / 2 - 0.16), 1.10, -L / 2 + 0.02);
  }
  for (const s of [-1, 1]) { wheel(e, s * (W / 2 - 0.06), 1.00, 0.27, 0.16); wheel(e, s * (W / 2 - 0.06), -1.02, 0.27, 0.16); }
  e.collide(W + 0.16, L + 0.14, H);
});

/* -------------------------------- bicycle -------------------------------- *
 * Built from named joints so a shared end is shared by construction.  The rack
 * and the loose bike call the same function for the same reason.
 * ------------------------------------------------------------------------- */

function bikeFrame(e, ox, oz, ry, rr, { basket = true, lean = 0 } = {}) {
  const frameCol = rr.pick([0x4a5058, 0x2f3a4a, 0x6b4a38, 0x3f5148, 0x5c4a52]);
  const R = 0.335;
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const cl = Math.cos(lean), sl = Math.sin(lean);
  /* local bike frame: +z forward, +y up, then leaned about z, then yawed */
  const P = (x, y, z) => {
    const lx = x * cl - y * sl, ly = x * sl + y * cl;
    return [ox + lx * cs + z * sn, ly, oz - lx * sn + z * cs];
  };
  const J = {
    rear: P(0, R, -0.53), front: P(0, R, 0.53),
    bb: P(0, 0.28, -0.06), seat: P(0, 0.92, -0.28),
    head: P(0, 0.98, 0.42), headLow: P(0, 0.62, 0.50),
    bar: P(0, 1.00, 0.40),
  };
  const tube = (a, b, w) => e.tube(a[0], a[1], a[2], b[0], b[1], b[2], w, w, frameCol, 'warm');
  // wheels, with a hub and a hint of spoke
  for (const [hub, sgn] of [[J.rear, -1], [J.front, 1]]) {
    const g = new THREE.TorusGeometry(R, 0.022, 4, 14);
    e.geo(g, trs(hub[0], hub[1], hub[2], 0, ry + Math.PI / 2, lean), 0x2a2730, 'warm');
    e.cyl(0.03, 0.03, 0.075, 6, PAL.metal, 'cool', hub[0], hub[1], hub[2], 0, 0, Math.PI / 2 + lean);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI + sgn * 0.3;
      const t = P(0, R + Math.sin(a) * R * 0.96, (sgn * 0.53) + Math.cos(a) * R * 0.96);
      e.tube(hub[0], hub[1], hub[2], t[0], t[1], t[2], 0.008, 0.008, PAL.metal, 'thin');
    }
  }
  tube(J.bb, J.seat, 0.032);        // seat tube
  tube(J.bb, J.headLow, 0.032);     // down tube
  tube(J.seat, J.head, 0.030);      // top tube
  tube(J.head, J.headLow, 0.034);   // head tube
  tube(J.bb, J.rear, 0.024);        // chain stay
  tube(J.seat, J.rear, 0.022);      // seat stay
  tube(J.headLow, J.front, 0.026);  // fork
  // saddle, bars, mudguards
  e.geo(new THREE.BoxGeometry(0.09, 0.05, 0.24), trs(J.seat[0], J.seat[1] + 0.05, J.seat[2], 0, ry, lean), 0x2a2730, 'warm');
  e.cyl(0.014, 0.014, 0.44, 5, PAL.metalDark, 'cool', J.bar[0], J.bar[1], J.bar[2], 0, 0, Math.PI / 2 + lean);
  const bell = P(0.10, 1.02, 0.40);
  e.cyl(0.023, 0.023, 0.018, 8, PAL.brass, 'cool', bell[0], bell[1], bell[2], 0, 0, lean);
  if (basket) {
    const c = P(0, 0.80, 0.60);
    for (const [dx, dz, w, d] of [[0, 0.13, 0.30, 0.02], [0, -0.13, 0.30, 0.02], [0.14, 0, 0.02, 0.26], [-0.14, 0, 0.02, 0.26]]) {
      const q = P(dx, 0.80, 0.60 + dz);
      e.geo(new THREE.BoxGeometry(w, 0.20, d), trs(q[0], q[1], q[2], 0, ry, lean), PAL.metal, 'thin');
    }
    e.geo(new THREE.BoxGeometry(0.30, 0.02, 0.26), trs(c[0], c[1] - 0.10, c[2], 0, ry, lean), PAL.metal, 'thin');
  }
  const rack = P(0, 0.66, -0.60);
  e.geo(new THREE.BoxGeometry(0.20, 0.02, 0.34), trs(rack[0], rack[1], rack[2], 0, ry, lean), PAL.metalDark, 'thin');
  return { bell, frameCol };
}

/**
 * ママチャリ, 1.75 m, basket on the front, and a bell you can ring.
 *
 * Placement note for callers, because it is the commonest way to lose a
 * bicycle: a bike **propped** against a wall is parallel to it and stands off
 * by half a handlebar (~0.35 m); a bike in a **rack** is nose-in and needs half
 * a wheelbase (~0.95 m) of clearance.  Place one by its width against a wall
 * and 0.86 m of it is inside the render, invisible from every angle.
 */
def('bicycle', 'gion', {}, (e) => {
  const lean = e.v('lean') ? -0.13 : 0;
  bikeFrame(e, 0, 0, 0, e.rng, { basket: !e.v('nobasket'), lean });
  e.hook({ id: 'bell', label: 'ring the bell', w: 0.5, h: 0.5, d: 0.7, x: 0, y: 1.0, z: 0.35 });
});

/** 私道につき無断撮影禁止 -- Hanamikoji's own notice, on two posts. */
def('noticePrivateRoad', 'gion', {}, (e) => {
  if (e.v('wall')) {
    e.box(0.56, 0.76, 0.04, PAL.timber, 'warm', 0, 1.52, 0.02);
    e.decal(0.50, 0.70, CELL.notice, 0, 1.52, 0.045);
    return;
  }
  for (const s of [-1, 1]) e.up(0.055, 1.52, 0.055, PAL.timberDark, 'warm', s * 0.24, e.gy(s * 0.24, 0), 0);
  e.box(0.60, 0.80, 0.045, PAL.timber, 'warm', 0, 1.10, 0.02);
  e.decal(0.53, 0.73, CELL.notice, 0, 1.10, 0.048);
  e.decal(0.53, 0.73, CELL.notice, 0, 1.10, -0.005, 0, Math.PI);
});

/** 傘立て -- the umbrella stand by a doorway, with a couple left in it. */
def('umbrellaStand', 'gion', {}, (e) => {
  const r = 0.17, h = 0.52;
  if (e.v('ceramic')) {
    e.lathe([[r * 0.7, 0], [r, 0.05], [r * 0.96, h * 0.7], [r, h], [r * 0.86, h], [r * 0.84, 0.06]],
      10, e.rng.pick([PAL.ceramicBlue, PAL.ceramicWhite, PAL.ceramicGreen]), 'pale', 0, 0, 0);
  } else {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      e.up(0.028, h, 0.028, PAL.timberDark, 'warm', Math.cos(a) * r, 0, Math.sin(a) * r, 0, -a, 0);
    }
    for (const y of [0.08, h - 0.05]) {
      e.geo(new THREE.TorusGeometry(r, 0.014, 4, 12), trs(0, y, 0, Math.PI / 2), PAL.timberDark, 'warm');
    }
  }
  const rr = e.rng;
  const n = rr.int(1, 3);
  for (let i = 0; i < n; i++) {
    const a = (i / 3) * TAU + rr.range(0, 1.2);
    const tilt = 0.12 + rr.range(0, 0.08);
    const col = rr.pick([PAL.norenIndigo, PAL.norenNavy, 0x3f4448, PAL.norenGreen]);
    e.cyl(0.026, 0.038, 0.98, 6, col, 'warm',
      Math.cos(a) * r * 0.5 + Math.sin(a) * 0.06, 0.50, Math.sin(a) * r * 0.5,
      Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    e.cyl(0.010, 0.010, 0.22, 4, PAL.timberPale, 'warm',
      Math.cos(a) * r * 0.5 + Math.sin(a) * 0.10, 1.06, Math.sin(a) * r * 0.5,
      Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
  }
});

/** A folded umbrella, leaning, or left flat on a step. */
def('umbrellaFolded', 'gion', {}, (e) => {
  const col = e.rng.pick([PAL.norenIndigo, 0x3f4448, PAL.norenGreen, PAL.bengaraDeep]);
  if (e.v('flat')) {
    e.cyl(0.030, 0.042, 0.86, 6, col, 'warm', 0, 0.045, 0, Math.PI / 2, 0, 0);
    e.cyl(0.011, 0.011, 0.22, 4, PAL.timberPale, 'warm', 0, 0.045, -0.54, Math.PI / 2, 0, 0);
    return;
  }
  const tilt = 0.20;
  e.cyl(0.030, 0.042, 0.92, 6, col, 'warm', 0, 0.48, 0.05, tilt, 0, 0);
  e.cyl(0.011, 0.011, 0.24, 4, PAL.timberPale, 'warm', 0, 1.05, 0.17, tilt, 0, 0);
  e.geo(new THREE.TorusGeometry(0.05, 0.011, 4, 8), trs(0, 1.15, 0.24, 0, 0, Math.PI / 2), PAL.timberPale, 'warm');
});

/* ================================================================== *
 * 2.  Modern infrastructure
 *
 * This group is half of what makes Kyoto read as a city rather than as a
 * theme park, and it is also the half that has to be *placed* correctly:
 * Hanamikoji and the whole Sannenzaka district had their wires undergrounded
 * (ARCH 3.4, `[HIGH]`), so a pole on either is a factual error.  The kit does
 * not enforce that -- `props.js` does, by refusing a pole in a no-pole zone.
 * ================================================================== */

/**
 * 電柱.  Concrete (the modern default) or timber (older side lanes), with the
 * 柱上変圧器, the insulators, the comms boxes and the coil of slack that makes
 * a Japanese pole look like a Japanese pole.  Wire terminations are published
 * through `e.attach` and strung between poles by `props.js`.
 */
def('utilityPole', 'infra', { noPoleZones: true }, (e) => {
  const timber = e.v('timber');
  /* Kansai standard: 11-16 m, base Φ~30 cm, ~1/6 buried, ~30 m spacing. */
  const H = timber ? 9.4 : 11.6;
  const rTop = timber ? 0.095 : 0.100, rBot = timber ? 0.140 : 0.152;
  const col = timber ? PAL.timberGrey : PAL.utilityPole;
  e.cyl(rTop, rBot, H, 8, col, timber ? 'warm' : 'cool', 0, H / 2, 0);
  e.cyl(rBot * 1.25, rBot * 1.35, 0.16, 8, PAL.concreteDark, 'cool', 0, 0.08, 0);
  // 足場ボルト -- the climbing pegs, alternating up the shaft
  for (let i = 0; i < 6; i++) {
    const s = i % 2 ? 1 : -1;
    e.cyl(0.016, 0.016, 0.30, 3, PAL.iron, 'cool', s * 0.14, 2.5 + i * 0.68, 0, 0, 0, Math.PI / 2);
  }
  // the crossarms.  Steel angle, grey, not timber -- this is the commonest
  // thing a reconstruction gets wrong about a Japanese pole.
  const arms = [[H - 0.55, 1.90], [H - 1.40, 1.60]];
  for (const [ay, len] of arms) {
    e.box(len, 0.075, 0.085, PAL.metalDark, 'cool', 0, ay, 0);
    e.tube(0, ay - 0.55, 0, 0, ay - 0.02, 0, 0.05, 0.05, PAL.metalDark, 'cool');
    for (const s of [-1, 0, 1]) {
      const x = s * (len / 2 - 0.16);
      /* The insulator is a 0.13 m object read from ten metres and there are six
       * of them on each of a hundred and eleven poles, so it is two stacked
       * cones and not a lathe: the lathe version was ninety thousand triangles
       * of porcelain nobody can resolve. */
      e.cyl(0.045, 0.055, 0.09, 6, PAL.metalDark, 'cool', x, ay + 0.085, 0);
      e.cyl(0.036, 0.072, 0.055, 6, PAL.plasterGrey, 'pale', x, ay + 0.155, 0);
      e.cyl(0.028, 0.062, 0.050, 6, PAL.plasterGrey, 'pale', x, ay + 0.205, 0);
      e.attach(x, ay + 0.26, 0);
    }
  }
  // 柱上変圧器 -- two of them on a bracket, the heaviest thing on the pole
  const tY = H - 3.0;
  for (const s of [-1, 1]) {
    e.box(0.62, 0.06, 0.07, PAL.metalDark, 'cool', 0, tY + 0.42 + (s < 0 ? 0 : 0.001), s * 0.20);
  }
  for (const tx of [-0.30, 0.30]) {
    e.cyl(0.225, 0.225, 0.66, 8, PAL.metalDark, 'cool', tx, tY + 0.35, 0);
    e.cyl(0.20, 0.225, 0.06, 8, PAL.metalDark, 'cool', tx, tY + 0.71, 0);
    e.cyl(0.09, 0.09, 0.08, 5, PAL.metalDark, 'cool', tx, tY + 0.78, 0);
  }
  e.box(0.80, 0.07, 0.09, PAL.metalDark, 'cool', 0, tY - 0.04, 0);
  /* The plates.  Three of them and the pole stops being a grey cylinder --
   * the highest value per unit of work anywhere in this file. */
  e.decal(0.135, 0.86, CELL.polePlates, 0, 2.62, rTop + 0.10);
  e.decal(0.135, 0.86, CELL.polePlates, 0, 2.62, -(rTop + 0.10), 0, Math.PI);
  e.decal(0.19, 0.19, CELL.kansaiPlate, rTop + 0.09, 4.05, 0, 0, Math.PI / 2);
  // comms: two boxes, a coil of slack, and the low bundle terminations
  e.box(0.30, 0.44, 0.22, PAL.concrete, 'cool', 0.20, tY - 1.30, 0.02);
  e.box(0.24, 0.30, 0.18, PAL.metalWarm, 'cool', -0.20, tY - 1.75, 0.02);
  e.geo(new THREE.TorusGeometry(0.24, 0.028, 4, 12), trs(0, tY - 2.35, 0.16, 0.25, 0, 0), PAL.wire, 'thin');
  for (const s of [-1, 1]) e.attach(s * 0.16, tY - 2.15, 0.05);
  // a pole is a real obstruction: 0.34 m of box, not the 0.4 that seals a lane
  e.collide(0.34, 0.34, undefined, undefined);
});

/** The wall-mounted outdoor unit.  Its back face touches the wall, at z = 0. */
def('acUnit', 'infra', {}, (e) => {
  const W = 0.80, HH = 0.58, D = 0.30, stand = 0.09;
  const y = e.anchored ? 0 : (e.v('ground') ? 0.34 : (e.v('high') ? 3.30 : 2.30));
  const cz = stand + D / 2;
  e.box(W, HH, D, PAL.acUnit, 'pale', 0, y, cz);
  e.decal(W - 0.06, HH - 0.06, CELL.acGrille, 0, y, cz + D / 2 + 0.006);
  e.box(W + 0.03, 0.035, D - 0.04, mix(PAL.acUnit, 0x000000, 0.14), 'pale', 0, y + HH / 2, cz);
  if (e.v('ground')) {
    for (const s of [-1, 1]) e.up(0.07, y - HH / 2, 0.07, PAL.concreteDark, 'cool', s * (W / 2 - 0.10), 0, cz);
  } else {
    for (const s of [-1, 1]) {
      e.box(0.05, 0.05, stand + 0.05, PAL.iron, 'cool', s * (W / 2 - 0.09), y + HH / 2 - 0.06, stand / 2);
      e.tube(s * (W / 2 - 0.09), y - HH / 2 - 0.16, 0.02, s * (W / 2 - 0.09), y + HH / 2 - 0.06, stand, 0.04, 0.04, PAL.iron, 'cool');
    }
  }
  // the pipe run, taped, dropping down the wall -- always there, never modelled
  e.cyl(0.035, 0.035, Math.max(0.4, y - 0.5), 5, PAL.plasterGrey, 'pale', W / 2 - 0.02, (y - 0.28) / 2 + 0.1, 0.05);
  e.cyl(0.035, 0.035, 0.22, 5, PAL.plasterGrey, 'pale', W / 2 - 0.02, y - 0.28, 0.05, Math.PI / 2, 0, 0);
});

/** The meter box -- 電力量計, and the gas meter, both bolted to the front wall. */
def('meterBox', 'infra', {}, (e) => {
  /* 0.25 x 0.30 x 0.15 m, boxed on the side wall of every machiya, grey or
   * beige plastic with a clear window (STREET 2.11).  Ubiquitous, almost never
   * modelled, and a strong realism cue for four boxes of geometry. */
  const gas = e.v('gas');
  const W = gas ? 0.26 : 0.25, HH = gas ? 0.34 : 0.30, D = 0.15;
  const y = e.anchored ? 0 : (gas ? 0.86 : 1.58);
  e.box(W, HH, D, gas ? PAL.plasterWarm : PAL.meterBox, 'pale', 0, y, D / 2);
  e.decal(W - 0.03, HH - 0.03, gas ? CELL.meterGas : CELL.meterElec, 0, y, D + 0.006);
  e.box(W + 0.04, 0.03, D + 0.03, mix(PAL.meterBox, 0x000000, 0.3), 'cool', 0, y + HH / 2, D / 2);
  if (gas) {
    e.cyl(0.028, 0.028, 0.9, 5, PAL.metalWarm, 'cool', -W / 2 + 0.05, y - HH / 2 - 0.45, 0.06);
    e.cyl(0.028, 0.028, 0.14, 5, PAL.metalWarm, 'cool', -W / 2 + 0.05, y - HH / 2 - 0.02, 0.06, Math.PI / 2, 0, 0);
  }
});

/* ------------------------- things that lie flat -------------------------- *
 * Everything in this block is `flat: true`: `props.js` aligns it to
 * `ctx.normalAt` instead of standing it up, because a manhole on a 1-in-8
 * street is in the street's plane, not in the world's.
 * ------------------------------------------------------------------------- */

def('manhole', 'surface', { flat: true }, (e) => {
  const r = e.v('small') ? 0.24 : 0.32;
  e.cyl(r + 0.055, r + 0.055, 0.055, 14, PAL.concreteDark, 'cool', 0, 0.015, 0);
  e.cyl(r, r, 0.05, 16, PAL.drain, 'cool', 0, 0.032, 0);
  e.decalGeo(new THREE.CircleGeometry(r, 18), trs(0, 0.058, 0, -Math.PI / 2), CELL.manhole);
});

/** 側溝 -- the precast channel cover.  `variant` may be the number of units. */
def('drainCover', 'surface', { flat: true, run: true }, (e) => {
  const n = e.num(4);
  const uw = 0.32, d = 0.44;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * uw;
    e.box(uw - 0.012, 0.06, d, PAL.concrete, 'pale', x, 0.03, 0);
    e.decalGeo(new THREE.PlaneGeometry(uw - 0.02, d - 0.02), trs(x, 0.062, 0, -Math.PI / 2), CELL.drainSlot);
  }
  // the channel's own kerb lips, which is what makes a gutter read as a gutter
  for (const s of [-1, 1]) {
    e.box(uw * n, 0.075, 0.055, PAL.stoneDark, 'cool', 0, 0.038, s * (d / 2 + 0.028));
  }
});

def('grating', 'surface', { flat: true }, (e) => {
  const w = e.v('long') ? 1.00 : 0.50, d = 0.42;
  e.box(w + 0.10, 0.07, d + 0.10, PAL.concrete, 'pale', 0, 0.035, 0);
  e.box(w, 0.055, d, PAL.metalDark, 'cool', 0, 0.055, 0);
  e.decalGeo(new THREE.PlaneGeometry(w, d), trs(0, 0.085, 0, -Math.PI / 2), CELL.grating);
});

def('surveyMark', 'surface', { flat: true }, (e) => {
  e.cyl(0.075, 0.075, 0.05, 10, PAL.stoneDark, 'cool', 0, 0.02, 0);
  e.decalGeo(new THREE.CircleGeometry(0.055, 12), trs(0, 0.046, 0, -Math.PI / 2), CELL.surveyMark);
});

/** A puddle in the gutter after rain -- flat, pale, and the sky's colour. */
def('puddle', 'surface', { flat: true }, (e) => {
  const rr = e.rng;
  const R = rr.range(0.35, 0.75);
  const seg = 14;
  const pts = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * TAU;
    const r = R * (0.62 + rr.range(0, 0.5));
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  // the wet ring first, then the water inside it, 6 mm proud so it never fights
  const wet = g.clone();
  wet.scale(1.22, 1, 1.22);
  e.geo(wet, trs(0, 0.008, 0), mix(PAL.pavingDark, PAL.ink, 0.22), 'cool');
  e.geo(g, trs(0, 0.014, 0), PAL.waterSky, 'pale');
});

/* --------------------------- standing infrastructure ---------------------- */

/** カーブミラー.  The orange frame is the whole silhouette; do not lose it. */
def('trafficMirror', 'infra', {}, (e) => {
  /* Φ800 mirror on a Φ76.3 x 4000 STK400 pole, lower edge at the standard
   * 2.5 m (STREET 3.11).  Put the glass any lower and it is at head height
   * in a 4 m lane. */
  const R = e.v('small') ? 0.30 : 0.40;
  const H = 2.5 + R * 2 + 0.14;
  e.cyl(0.040, 0.048, H, 8, PAL.metalWarm, 'cool', 0, H / 2, 0);
  e.cyl(0.10, 0.12, 0.14, 8, PAL.concreteDark, 'cool', 0, 0.07, 0);
  const tilt = -0.30;
  const mz = 0.18, my = H - R - 0.14;
  /* The plate's outward normal after a rotation of `tilt` about X.  Derive it:
   * offsetting the face by a hand-written (dy, dz) pair put the printed circle
   * 19 mm proud of a plate 25 mm thick -- i.e. inside it -- and a mirror with
   * no face reads as a black disc on a stick. */
  const nY = -Math.sin(tilt), nZ = Math.cos(tilt);
  e.cyl(R, R, 0.06, 16, mix(PAL.mirror, 0x000000, 0.35), 'warm', 0, my, mz, tilt + Math.PI / 2);
  e.decalGeo(new THREE.CircleGeometry(R - 0.03, 18),
    trs(nY * 0, my + nY * 0.055, mz + nZ * 0.055, tilt), CELL.mirrorFace);
  e.geo(new THREE.TorusGeometry(R, 0.05, 5, 16), trs(0, my + nY * 0.03, mz + nZ * 0.03, tilt), PAL.mirror, 'warm');
  // the visor, which is what stops it reading as a road sign
  e.geo(new THREE.CylinderGeometry(R + 0.07, R + 0.07, 0.20, 14, 1, true, Math.PI * 0.12, Math.PI * 0.76),
    trs(0, my - nY * 0.05, mz - nZ * 0.05, tilt + Math.PI / 2), PAL.mirror, 'warm');
  e.tube(0, my - 0.46, 0.02, 0, my - 0.08, mz - 0.10, 0.05, 0.05, PAL.metalWarm, 'cool');
});

/** 郵便ポスト.  Small, and one of the few reds the ordinance cannot touch. */
/**
 * 郵便ポスト -- Japan Post's 1号丸型: **Φ400 x 1350 mm, 朱色**.  It is a round
 * pillar, not a box, and that cylinder is most of what makes it read as a
 * Japanese post box from thirty metres.  A brown Kyoto post box is unverified
 * (STREET 3.11) -- red is always safe.
 */
def('postBox', 'infra', {}, (e) => {
  const R = 0.20, H = 1.35;
  const red = PAL.vermilion;
  e.cyl(R * 1.18, R * 1.30, 0.10, 12, PAL.concreteDark, 'cool', 0, 0.05, 0);
  e.cyl(R, R, H - 0.22, 14, red, 'warm', 0, 0.10 + (H - 0.22) / 2, 0);
  e.lathe([[R, 0], [R * 1.03, 0.02], [R * 0.98, 0.07], [R * 0.76, 0.14], [R * 0.4, 0.185], [0.001, 0.20]],
    14, red, 'warm', 0, H - 0.12, 0);
  e.cyl(R * 1.04, R * 1.04, 0.035, 14, mix(red, 0x000000, 0.35), 'warm', 0, H - 0.13, 0);
  e.decalGeo(new THREE.CylinderGeometry(R + 0.004, R + 0.004, 0.62, 16, 1, true),
    trs(0, 0.86, 0), CELL.postFace);
  // the posting slot: a real dark pocket, not a printed rectangle
  e.box(0.26, 0.055, 0.06, 0x1b1820, 'warm', 0, 1.02, R - 0.01);
  e.box(0.30, 0.035, 0.05, mix(red, 0x000000, 0.4), 'warm', 0, 1.07, R + 0.005);
  e.collide(R * 2 + 0.16, R * 2 + 0.16, H + 0.20);
});

def('extinguisherBox', 'infra', {}, (e) => {
  const W = 0.32, HH = 0.62, D = 0.24;
  const y = e.anchored ? 0 : (e.v('wall') ? 1.05 : 0.34 + HH / 2);
  e.box(W, HH, D, PAL.redDeep, 'warm', 0, y, D / 2);
  e.decal(W - 0.04, HH - 0.05, CELL.extinguisher, 0, y, D + 0.006);
  e.box(W + 0.035, 0.04, D + 0.035, mix(PAL.redDeep, 0x000000, 0.35), 'warm', 0, y + HH / 2, D / 2);
  if (!e.v('wall')) {
    for (const s of [-1, 1]) e.up(0.045, 0.34, 0.045, PAL.iron, 'cool', s * (W / 2 - 0.05), e.gy(s * 0.1, 0.1), D / 2);
    e.box(W, 0.03, D, PAL.iron, 'cool', 0, 0.34, D / 2);
  }
});

/**
 * The brown-wrapped vending machine.  `PAL.vendBody` is a muted brown because
 * Kyoto's 景観条例 forces the wrap in the historic districts -- a red machine
 * here would be a lie twice over, and it would win every frame it stood in.
 *
 * Built as a frame around a real recess: back panel, two piers, header, plinth.
 * A printed face on a solid box is a sticker, every time.
 */
def('vendingMachine', 'infra', {}, (e) => {
  /* Fuji Electric F25WP5F: 1830 x 1027 x 669 mm, which is the middle of the
   * real range (1830 H x 870-1185 W x 538-741 D).  STREET 3.3. */
  const W = e.v('wide') ? 1.185 : 1.027, H = 1.83, D = 0.669;
  const BODY = e.v('brown') ? PAL.vendBody : VEND;
  const REC = 0.09;
  const front = D / 2;
  /* `pale`, not `cool`.  This is a value-7.5 object standing in a street of
   * value-8.4 plaster: on the three-band ramp its shadow side lands at 36 % and
   * the machine reads as a black slab, which is the exact failure the high-key
   * ramp exists to prevent. */
  const SH2 = e.v('brown') ? 'warm' : 'pale';
  e.box(W, H, 0.12, BODY, SH2, 0, H / 2, -front + 0.06);
  for (const s of [-1, 1]) e.box(0.11, H, D, BODY, SH2, s * (W / 2 - 0.055), H / 2, 0);
  e.box(W - 0.22, 0.20, D, BODY, SH2, 0, H - 0.10, 0);
  e.box(W - 0.22, 0.16, D, BODY, SH2, 0, 0.08, 0);
  e.box(W - 0.22, H - 0.36, D - REC, mix(BODY, 0x000000, 0.12), SH2, 0, H / 2, -REC / 2);
  e.decal(W - 0.24, H - 0.38, CELL.vendFront, 0, H / 2, front - REC + 0.008);
  for (const s of [-1, 1]) {
    e.decal(D - 0.04, H - 0.20, CELL.vendSide, s * (W / 2 + 0.003), H / 2 - 0.02, 0, 0, s * Math.PI / 2);
  }
  e.box(W + 0.05, 0.07, D + 0.05, mix(BODY, 0x000000, 0.26), SH2, 0, H + 0.02, 0);
  e.box(W - 0.30, 0.04, 0.06, PAL.metalDark, 'cool', 0, 0.28, front + 0.02);
  e.collide(W + 0.14, D + 0.14, H + 0.06);
  e.hook({ id: 'vend', label: 'buy a hot tea', w: 1.2, h: 1.8, d: 1.0, x: 0, y: 0.9, z: 0.5 });
});

/** 駐輪ラック -- the rack, and the bikes in it, from the same generator. */
def('bicycleRack', 'infra', {}, (e) => {
  const n = e.num(3);
  const pitch = 0.62;
  const w = n * pitch + 0.3;
  for (const s of [-1, 1]) {
    e.cyl(0.028, 0.028, w, 6, PAL.metalDark, 'cool', 0, 0.10, s * 0.42, 0, 0, Math.PI / 2);
    for (const t of [-1, 1]) e.up(0.05, 0.12, 0.05, PAL.metalDark, 'cool', t * (w / 2 - 0.1), e.gy(t * (w / 2 - 0.1), s * 0.42), s * 0.42);
  }
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * pitch;
    // a bike in a rack is nose-in: half a wheelbase has to clear whatever is
    // behind it, not half a handlebar
    e.up(0.05, 0.30, 0.05, PAL.metalDark, 'cool', x - 0.16, e.gy(x, 0), 0.42);
    e.up(0.05, 0.30, 0.05, PAL.metalDark, 'cool', x + 0.16, e.gy(x, 0), 0.42);
    if (e.rng.chance(0.78)) bikeFrame(e, x, -0.10, Math.PI, e.rng, { basket: e.rng.chance(0.6), lean: 0 });
  }
});

/** カラーコーン and its bar.  Slim and frangible: no collider, by the rule. */
def('roadCone', 'infra', {}, (e) => {
  const H = 0.68;
  e.box(0.34, 0.035, 0.34, 0xb04e2a, 'warm', 0, 0.017, 0);
  e.cyl(0.035, 0.135, H, 8, 0xc45a30, 'warm', 0, H / 2 + 0.03, 0);
  e.decalGeo(new THREE.CylinderGeometry(0.078, 0.098, 0.17, 10, 1, true), trs(0, 0.40, 0), CELL.coneBand);
  if (e.v('bar')) {
    e.cyl(0.032, 0.032, 1.85, 6, PAL.paperWarm, 'pale', 0.95, 0.52, 0, 0, 0, Math.PI / 2);
    e.cyl(0.033, 0.033, 0.3, 6, 0xc45a30, 'warm', 0.55, 0.52, 0, 0, 0, Math.PI / 2);
    e.cyl(0.033, 0.033, 0.3, 6, 0xc45a30, 'warm', 1.35, 0.52, 0, 0, 0, Math.PI / 2);
  }
});

/** 単管バリケード -- the temporary barrier.  This one genuinely blocks. */
def('barrier', 'infra', {}, (e) => {
  const W = 1.60, H = 0.96;
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.06);
    e.tube(x, e.gy(x, -0.28), -0.28, x, H, 0, 0.05, 0.05, PAL.metalWarm, 'cool');
    e.tube(x, e.gy(x, 0.28), 0.28, x, H, 0, 0.05, 0.05, PAL.metalWarm, 'cool');
    e.tube(x, 0.36, -0.24, x, 0.36, 0.24, 0.04, 0.04, PAL.metalWarm, 'cool');
  }
  for (const y of [H - 0.06, H - 0.34]) {
    e.cyl(0.036, 0.036, W, 6, PAL.paperWarm, 'pale', 0, y, 0, 0, 0, Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      e.cyl(0.038, 0.038, 0.18, 6, 0xc45a30, 'warm', -W / 2 + 0.22 + i * 0.4, y, 0, 0, 0, Math.PI / 2);
    }
  }
  e.decal(0.42, 0.30, CELL.noPark, 0, 0.62, 0.03);
  e.collide(W + 0.06, 0.62, H);
});

/* ================================================================== *
 * 3.  Shop clutter -- the apron
 *
 * This is the layer that carries the identity.  A Higashiyama shopfront is
 * mostly the metre and a half of ground in front of it: the pottery stand, the
 * sample tray, the pickle barrels, the A-board, the crates it has not put away
 * and the bench nobody is sitting on.  Get the apron right and a plain box
 * behind it reads as a shop; get it wrong and no amount of facade detail helps.
 * ================================================================== */

/** 清水焼 on a tiered stand.  The blues and creams are the district's own. */
def('ceramicStand', 'shop', {}, (e) => {
  const W = e.v('wide') ? 1.70 : 1.20, D = 0.40;
  const tiers = [[0.44, 0.16], [0.72, 0.02], [1.00, -0.12]];
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) {
      const x = s * (W / 2 - 0.05), z = t * (D / 2 - 0.05) + 0.02;
      e.up(0.05, 1.02 + t * 0.06, 0.05, PAL.timberMid, 'warm', x, e.gy(x, z), z);
    }
  }
  const rr = e.rng;
  for (const [y, z] of tiers) {
    e.box(W, 0.035, D, PAL.timberPale, 'warm', 0, y, z);
    e.box(W, 0.05, 0.025, PAL.timberMid, 'warm', 0, y - 0.03, z + D / 2);
    const n = Math.round(W / 0.24);
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * (W / n);
      const kind = rr.int(0, 2);
      const col = rr.pick(CERAMIC);
      if (kind === 0) {
        const r = rr.range(0.055, 0.085);
        e.lathe([[r * 0.4, 0], [r * 0.5, 0.008], [r, r * 0.9], [r * 0.92, r * 1.25], [r * 0.86, r * 1.3]],
          9, col, 'pale', x, y + 0.02, z + rr.range(-0.05, 0.05));
      } else if (kind === 1) {
        const r = rr.range(0.05, 0.07);
        e.lathe([[r * 0.42, 0], [r * 0.5, 0.01], [r * 0.86, 0.09], [r, 0.16], [r * 0.92, 0.19], [r * 0.5, 0.20], [r * 0.46, 0.185]],
          9, col, 'pale', x, y + 0.02, z + rr.range(-0.05, 0.05));
      } else {
        const r = rr.range(0.07, 0.10);
        e.lathe([[0.001, 0], [r * 0.7, 0.005], [r, 0.035], [r * 0.98, 0.05]], 10, col, 'pale', x, y + 0.02, z);
        e.decalGeo(new THREE.CircleGeometry(r * 0.9, 10), trs(x, y + 0.073, z, -Math.PI / 2), CELL.ceramicGlaze);
      }
    }
  }
  e.decal(0.34, 0.10, CELL.tags, 0, 0.40, D / 2 + 0.03, -0.5);
  e.collide(W + 0.10, D + 0.16, 1.06);
});

/** The sample tray outside a 八ツ橋 shop -- 試食, and always under a paper cover. */
def('sampleTray', 'shop', {}, (e) => {
  const y = 0.90;                       // 0.35 x 0.25 tray on a 0.90 m stand
  for (const s of [-1, 1]) for (const t of [-1, 1]) {
    e.up(0.045, y, 0.045, PAL.timberMid, 'warm', s * 0.26, e.gy(s * 0.26, t * 0.17), t * 0.17);
  }
  e.box(0.52, 0.03, 0.38, PAL.timberPale, 'warm', 0, y, 0);
  e.box(0.37, 0.045, 0.27, mix(PAL.timberPale, PAL.timber, 0.3), 'warm', 0, y + 0.035, 0);
  e.decalGeo(new THREE.PlaneGeometry(0.34, 0.24), trs(0, y + 0.06, 0, -Math.PI / 2), CELL.yatsuhashi);
  for (const s of [-1, 1]) e.box(0.52, 0.02, 0.02, PAL.timberMid, 'warm', 0, y + 0.16, s * 0.16);
  e.decal(0.30, 0.09, CELL.tags, 0, y + 0.16, 0.20, -0.35);
});

/** 漬物樽.  A stack of them by the door is a Kyoto pickle shop, entire. */
/**
 * 樽.  `variant` 0 酒樽, 1 菰樽 (the straw-wrapped presentation barrel), 2
 * 漬物樽 with a stone on the lid -- `shopfront.js`'s published contract, so the
 * number is a *type* here and not a count; use `variant: 'row'` for three.
 *
 * Note for placement: STREET 3.7 corrects the usual assumption -- decorative
 * barrels are **not** out on the pavement on Kiyomizu-zaka, Sannenzaka or
 * Ninenzaka.  They belong to a sake shop's frontage and to interiors.
 */
def('pickleBarrel', 'shop', { alias: ['barrel'] }, (e) => {
  const type = typeof e.variant === 'number' ? e.variant : 2;
  const n = e.v('row') ? 3 : e.v('pair') ? 2 : 1;
  const rr = e.rng;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + 0.6;
    const rad = n === 1 ? 0 : 0.34;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    const R = type === 1 ? 0.25 : rr.range(0.22, 0.26), H = type === 1 ? 0.60 : rr.range(0.46, 0.58);
    const gy = e.gy(x, z);
    const stave = type === 1 ? PAL.kaya : PAL.timberPale;
    e.lathe([[R * 0.88, 0], [R, 0.04], [R * 1.02, H * 0.5], [R, H - 0.04], [R * 0.94, H], [R * 0.86, H], [R * 0.84, 0.05]],
      12, stave, 'warm', x, gy, z);
    if (type === 1) {
      // 菰樽: straw matting, three rope bands and a painted head
      for (const hy of [0.10, H * 0.5, H - 0.10]) {
        e.geo(new THREE.TorusGeometry(R * 1.03, 0.020, 4, 12), trs(x, gy + hy, z, Math.PI / 2), 0x6b5844, 'thin');
      }
      e.cyl(R * 0.9, R * 0.9, 0.03, 12, PAL.paperWarm, 'pale', x, gy + H + 0.015, z);
      e.cyl(R * 0.42, R * 0.42, 0.035, 10, PAL.bengara, 'warm', x, gy + H + 0.025, z);
    } else {
      for (const hy of [0.06, H - 0.07]) {
        e.geo(new THREE.TorusGeometry(R * 1.0, 0.016, 4, 12), trs(x, gy + hy, z, Math.PI / 2), 0x4a3f34, 'warm');
      }
      if (type === 2) {
        e.cyl(R * 0.9, R * 0.9, 0.03, 12, mix(PAL.timberPale, PAL.timber, 0.35), 'warm', x, gy + H + 0.015, z);
        e.geo(new THREE.IcosahedronGeometry(0.09, 0), trs(x, gy + H + 0.07, z, 0.3, a, 0, 1, 0.7, 1), PAL.stone, 'cool');
      } else {
        e.cyl(R * 0.86, R * 0.86, 0.02, 12, 0x4a3a2c, 'warm', x, gy + H - 0.05, z);
        e.decalGeo(new THREE.CylinderGeometry(R * 1.03, R * 1.0, H * 0.44, 14, 1, true),
          trs(x, gy + H * 0.55, z), CELL.boxLabel);
      }
    }
  }
});

/** 茶筒 on a shelf -- the tea shop's whole window in one prop. */
def('teaCanisters', 'shop', {}, (e) => {
  const W = 0.92;
  for (const s of [-1, 1]) e.up(0.05, 0.98, 0.05, PAL.timberMid, 'warm', s * (W / 2 - 0.03), e.gy(s * 0.4, 0), 0);
  const rr = e.rng;
  for (const y of [0.52, 0.82]) {
    e.box(W, 0.03, 0.24, PAL.timberPale, 'warm', 0, y, 0);
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 0.17;
      const r = rr.range(0.045, 0.06), h = rr.range(0.13, 0.19);
      e.cyl(r, r, h, 9, 0x3a3430, 'warm', x, y + h / 2 + 0.015, 0);
      e.decalGeo(new THREE.CylinderGeometry(r + 0.002, r + 0.002, h * 0.9, 10, 1, true), trs(x, y + h / 2 + 0.015, 0), CELL.teaCanister);
      e.cyl(r * 1.04, r * 1.04, 0.02, 9, PAL.gold, 'cool', x, y + h + 0.02, 0);
    }
  }
  e.box(W + 0.06, 0.04, 0.28, PAL.timberMid, 'warm', 0, 1.00, 0);
});

/** The folding A-board.  Two boards hinged at the top, both faces printed. */
def('aBoard', 'shop', {}, (e) => {
  const W = 0.55, H = 0.92, tilt = 0.19;
  for (const s of [-1, 1]) {
    const cz = s * Math.sin(tilt) * H / 2;
    e.box(W, H, 0.035, PAL.timberDark, 'warm', 0, H / 2 * Math.cos(tilt) + 0.02, cz, s * tilt);
    e.decal(W - 0.07, H - 0.09, CELL.aboard,
      0, H / 2 * Math.cos(tilt) + 0.02, cz + s * 0.026 * Math.cos(tilt),
      s * tilt, s > 0 ? 0 : Math.PI);
    for (const t of [-1, 1]) {
      e.box(0.05, H + 0.06, 0.05, PAL.timberMid, 'warm', t * (W / 2 - 0.02), H / 2 * Math.cos(tilt) + 0.02, cz, s * tilt);
    }
  }
  e.cyl(0.02, 0.02, W + 0.06, 5, PAL.iron, 'cool', 0, H * Math.cos(tilt) + 0.02, 0, 0, 0, Math.PI / 2);
});

def('crate', 'shop', {}, (e) => {
  const rr = e.rng;
  const W = 0.42, H = 0.26, D = 0.31;
  const kindN = typeof e.variant === 'number' ? e.variant : 1;
  if (kindN === 2) {
    // upturned, which is what a crate on a pavement usually is
    e.box(W, H, D, PAL.timberPale, 'warm', 0, H / 2, 0, 0, 0, 0);
    e.box(W + 0.02, 0.035, D + 0.02, mix(PAL.timberPale, PAL.timber, 0.4), 'warm', 0, H, 0);
    for (const sd of [-1, 1]) {
      e.box(0.05, H, D + 0.02, mix(PAL.timberPale, PAL.timber, 0.35), 'warm', sd * (W / 2 - 0.02), H / 2, 0);
    }
    e.decal(W * 0.5, H * 0.5, CELL.boxLabel, 0, H * 0.52, D / 2 + 0.006);
    return;
  }
  e.box(W, H, D, PAL.timberPale, 'warm', 0, H / 2, 0);
  for (const s of [-1, 1]) {
    e.box(0.05, H + 0.02, D + 0.02, mix(PAL.timberPale, PAL.timber, 0.35), 'warm', s * (W / 2 - 0.02), H / 2, 0);
  }
  e.box(W + 0.02, 0.045, D + 0.02, mix(PAL.timberPale, PAL.timber, 0.35), 'warm', 0, H - 0.03, 0);
  e.decal(W * 0.5, H * 0.55, CELL.boxLabel, 0, H * 0.5, D / 2 + 0.006);
  if (kindN === 1) {
    // produce, heaped just proud of the rim
    const cols = [PAL.matcha, PAL.wagashi, PAL.sweetGreen, PAL.timberWarm, PAL.leafMapleAutumn];
    for (let i = 0; i < 7; i++) {
      e.geo(new THREE.IcosahedronGeometry(rr.range(0.045, 0.075), 0),
        trs(rr.range(-W / 2 + 0.08, W / 2 - 0.08), H + rr.range(-0.01, 0.035), rr.range(-D / 2 + 0.07, D / 2 - 0.07),
            rr.range(0, 1), rr.range(0, 3), 0),
        rr.pick(cols), 'warm');
    }
  } else if (rr.chance(0.45)) {
    e.box(W - 0.06, H - 0.04, D - 0.04, PAL.timberPale, 'warm',
      rr.range(-0.05, 0.05), H + (H - 0.04) / 2, rr.range(-0.04, 0.04), 0, rr.range(-0.2, 0.2), 0);
  }
});

def('boxStack', 'shop', {}, (e) => {
  const rr = e.rng;
  const n = e.num(rr.int(2, 4));
  let y = 0;
  for (let i = 0; i < n; i++) {
    const w = rr.range(0.34, 0.50), h = rr.range(0.20, 0.30), d = rr.range(0.30, 0.42);
    const col = mix(PAL.timberPale, PAL.plasterOchre, 0.4);
    e.box(w, h, d, col, 'warm', rr.range(-0.04, 0.04), y + h / 2, rr.range(-0.04, 0.04), 0, rr.range(-0.25, 0.25), 0);
    e.box(w * 0.18, h * 0.02 + 0.008, d + 0.006, mix(col, PAL.timber, 0.35), 'warm', 0, y + h * 0.5, 0);
    y += h;
  }
});

/** 縁台 -- the bench under the eave, with the red 毛氈 a teahouse puts on it. */
def('endai', 'shop', {}, (e) => {
  const W = e.v('short') ? 1.10 : 1.50, D = 0.45, H = 0.40;
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.10);
    e.up(0.07, H - 0.04, 0.07, PAL.timberMid, 'warm', x, e.gy(x, -0.15), -0.15);
    e.up(0.07, H - 0.04, 0.07, PAL.timberMid, 'warm', x, e.gy(x, 0.15), 0.15);
    e.box(0.05, 0.05, 0.38, PAL.timberMid, 'warm', x, 0.12, 0);
  }
  e.box(W, 0.045, D, PAL.timberPale, 'warm', 0, H, 0);
  e.box(W + 0.04, 0.03, 0.05, PAL.timberMid, 'warm', 0, H - 0.03, D / 2);
  if (!e.v('bare')) {
    e.box(W - 0.06, 0.02, D + 0.10, PAL.bengaraLit, 'warm', 0, H + 0.03, 0.02);
    e.box(W - 0.06, 0.14, 0.02, PAL.bengaraLit, 'warm', 0, H - 0.04, D / 2 + 0.05);
  }
});

def('stool', 'shop', {}, (e) => {
  const H = 0.42, R = 0.15;
  e.lathe([[R * 0.9, 0], [R, 0.02], [R * 0.98, H - 0.04], [R * 1.06, H - 0.02], [R * 1.06, H], [0.001, H]],
    9, PAL.timberMid, 'warm', 0, 0, 0);
  e.geo(new THREE.TorusGeometry(R * 0.92, 0.014, 4, 10), trs(0, 0.14, 0, Math.PI / 2), PAL.timberDark, 'warm');
});

def('bucket', 'shop', {}, (e) => {
  const R = 0.15, H = 0.28;
  e.lathe([[R * 0.86, 0], [R * 0.9, 0.015], [R, H - 0.01], [R * 0.98, H], [R * 0.92, H], [R * 0.84, 0.02]],
    10, PAL.timberPale, 'warm', 0, 0, 0);
  for (const hy of [0.03, H - 0.035]) {
    e.geo(new THREE.TorusGeometry(R * 0.99, 0.011, 4, 10), trs(0, hy, 0, Math.PI / 2), PAL.metalDark, 'cool');
  }
  e.geo(new THREE.TorusGeometry(R * 0.95, 0.010, 4, 9, Math.PI), trs(0, H, 0, 0, 0, 0), PAL.metalDark, 'thin');
});

/** 竹箒, leaning where somebody left it.  It is half of the swept-leaves story. */
/**
 * 竹箒, leaning where somebody left it.  Half of the swept-leaves story.
 *
 * Written between its two ends, not as a lean angle: a broom "leaning on a
 * wall" has its *head* on the ground out from the wall and its *handle top*
 * just touching the wall face at local z = 0.  Written as an angle about the
 * base it went the other way and buried the whole handle in the plaster --
 * from the street the prop simply was not there.
 */
def('broom', 'shop', {}, (e) => {
  const rr = e.rng;
  const flat = e.v('flat');
  // head on the ground, handle top against the wall
  const H = flat
    ? { bx: 0, by: 0.03, bz: 0.72, tx: 0, ty: 0.05, tz: -0.68 }
    : { bx: 0, by: 0.05, bz: 0.50, tx: rr.range(-0.05, 0.05), ty: 1.44, tz: 0.055 };
  e.tube(H.bx, H.by, H.bz, H.tx, H.ty, H.tz, 0.028, 0.028, PAL.bambooCulm, 'thin');
  // the binding, then the fan of twigs splaying past the base
  e.cyl(0.038, 0.030, 0.08, 6, 0x2a2622, 'warm',
    H.bx + (H.tx - H.bx) * 0.12, H.by + (H.ty - H.by) * 0.12, H.bz + (H.tz - H.bz) * 0.12,
    Math.atan2(H.bz - H.tz, H.ty - H.by), 0, 0);
  for (let i = 0; i < 15; i++) {
    const t = (i / 14 - 0.5);
    e.tube(H.bx + (H.tx - H.bx) * 0.10, H.by + (H.ty - H.by) * 0.10, H.bz + (H.tz - H.bz) * 0.10,
           H.bx + t * 0.22, 0.005, H.bz + 0.26 - Math.abs(t) * 0.07,
           0.010, 0.010, i % 2 ? PAL.bambooCulmPale : 0x9c8558, 'thin');
  }
});

/** 大八車 -- the two-wheel hand cart, parked with its shafts down. */
def('handCart', 'shop', {}, (e) => {
  const W = 0.86, L = 1.30, bedY = 0.50;
  e.box(W, 0.05, L, PAL.timberPale, 'warm', 0, bedY, 0);
  for (const s of [-1, 1]) e.box(0.06, 0.16, L, PAL.timberMid, 'warm', s * (W / 2 - 0.03), bedY + 0.10, 0);
  e.box(W, 0.16, 0.06, PAL.timberMid, 'warm', 0, bedY + 0.10, -L / 2 + 0.03);
  for (const s of [-1, 1]) {
    const R = 0.34;
    e.geo(new THREE.TorusGeometry(R, 0.035, 4, 14), trs(s * (W / 2 + 0.05), R, -0.10, 0, Math.PI / 2), PAL.timberMid, 'warm');
    e.cyl(0.05, 0.05, 0.10, 8, PAL.timberDark, 'warm', s * (W / 2 + 0.05), R, -0.10, 0, 0, Math.PI / 2);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI;
      e.cyl(0.016, 0.016, R * 1.9, 4, PAL.timberMid, 'thin', s * (W / 2 + 0.05), R, -0.10, a, Math.PI / 2, 0);
    }
    // the shafts, down on the ground the way a parked cart rests
    e.tube(s * (W / 2 - 0.10), bedY - 0.02, L / 2 - 0.1, s * (W / 2 - 0.16), 0.05, L / 2 + 0.78, 0.05, 0.05, PAL.timberPale, 'warm');
  }
  if (e.rng.chance(0.6)) {
    e.box(0.42, 0.26, 0.34, mix(PAL.timberPale, PAL.plasterOchre, 0.4), 'warm', 0.1, bedY + 0.16, -0.2, 0, 0.2, 0);
  }
});

/** The parcel trolley left by a back door. */
def('parcelTrolley', 'shop', {}, (e) => {
  const lean = 0.22;
  const H = 1.20;
  for (const s of [-1, 1]) {
    e.tube(s * 0.20, 0.10, 0, s * 0.20, H * Math.cos(lean), -H * Math.sin(lean), 0.035, 0.035, PAL.metalDark, 'cool');
    e.cyl(0.085, 0.085, 0.045, 8, 0x2a2730, 'warm', s * 0.22, 0.085, 0.02, 0, 0, Math.PI / 2);
  }
  e.box(0.44, 0.03, 0.22, PAL.metalDark, 'cool', 0, 0.10, 0.10, -0.1);
  for (const y of [0.42, 0.86]) {
    e.cyl(0.024, 0.024, 0.42, 5, PAL.metalDark, 'cool', 0, y * Math.cos(lean) + 0.08, -y * Math.sin(lean), 0, 0, Math.PI / 2);
  }
  e.cyl(0.026, 0.026, 0.44, 5, PAL.iron, 'cool', 0, H * Math.cos(lean) + 0.06, -H * Math.sin(lean), 0, 0, Math.PI / 2);
  if (e.rng.chance(0.7)) {
    e.box(0.38, 0.30, 0.28, mix(PAL.timberPale, PAL.plasterOchre, 0.35), 'warm', 0, 0.28, 0.02, -lean * 0.6);
    e.box(0.34, 0.24, 0.24, mix(PAL.timberPale, PAL.plasterOchre, 0.5), 'warm', 0, 0.56, -0.06, -lean * 0.6);
  }
});

/** A cloth on a line.  This one moves -- restrained, one axis, slow. */
def('hangingCloth', 'shop', {}, (e) => {
  const W = 0.58, H = 0.74, y = e.anchored ? 0 : 2.05;
  e.cyl(0.022, 0.022, 1.5, 5, PAL.bambooCulm, 'warm', 0, y + 0.03, 0.12, 0, 0, Math.PI / 2);
  e.anim('cloth', { x: 0, y: y, z: 0.12, w: W, h: H, cell: e.v('noren') ? CELL.clothNoren : CELL.clothPlain });
});

/** 扇子 on a rack.  Open fans are the cheapest strong silhouette in the world. */
def('fanRack', 'shop', {}, (e) => {
  const W = 1.05, H = 1.35;
  for (const s of [-1, 1]) {
    const x = s * (W / 2);
    e.up(0.05, H, 0.05, PAL.timberMid, 'warm', x, e.gy(x, 0), 0);
    e.up(0.05, 0.04, 0.42, PAL.timberMid, 'warm', x, e.gy(x, 0), 0);
  }
  const rr = e.rng;
  for (const y of [0.62, 1.00]) {
    e.box(W + 0.10, 0.035, 0.05, PAL.timberMid, 'warm', 0, y, 0);
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 0.21;
      const r = rr.range(0.14, 0.19);
      const g = new THREE.CircleGeometry(r, 7, Math.PI * 0.18, Math.PI * 0.64);
      e.decalGeo(g, trs(x, y + 0.02, 0.028, 0, 0, 0), CELL.fanFace);
      e.decalGeo(g.clone(), trs(x, y + 0.02, 0.020, 0, Math.PI, 0), CELL.fanFace);
      e.cyl(0.012, 0.012, r * 0.5, 4, PAL.timberDark, 'thin', x, y - r * 0.2, 0.024);
    }
  }
});

def('umbrellaRack', 'shop', {}, (e) => {
  const W = 0.92;
  for (const s of [-1, 1]) {
    const x = s * (W / 2);
    e.up(0.05, 1.20, 0.05, PAL.timberMid, 'warm', x, e.gy(x, 0), 0);
    e.up(0.05, 0.035, 0.44, PAL.timberMid, 'warm', x, e.gy(x, 0), 0);
  }
  e.box(W + 0.08, 0.04, 0.05, PAL.timberMid, 'warm', 0, 1.16, 0);
  e.box(W + 0.08, 0.04, 0.05, PAL.timberMid, 'warm', 0, 0.30, 0);
  const rr = e.rng;
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.13;
    const col = rr.pick([PAL.norenIndigo, PAL.norenNavy, 0x3f4448, PAL.norenGreen, PAL.bengaraDeep, PAL.norenBrown]);
    const t = rr.range(-0.06, 0.06);
    e.cyl(0.028, 0.040, 0.90, 6, col, 'warm', x, 0.72, 0.02, 0, 0, t);
    e.cyl(0.010, 0.010, 0.22, 4, PAL.timberPale, 'warm', x + t * 0.5, 1.26, 0.02, 0, 0, t);
  }
});

/** 風鈴.  Glass, a clapper, and the 短冊 that is the only part that moves. */
def('windChime', 'shop', {}, (e) => {
  const y = e.anchored ? 0 : 2.32;
  const n = e.v('row') ? 3 : 1;
  e.box(0.05, 0.05, 0.34, PAL.timberDark, 'warm', 0, y + 0.22, 0.16);
  if (n > 1) e.cyl(0.014, 0.014, 0.86, 4, PAL.bambooCulm, 'thin', 0, y + 0.20, 0.30, 0, 0, Math.PI / 2);
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : (i - 1) * 0.34;
    e.cyl(0.004, 0.004, 0.11, 4, PAL.timberDark, 'thin', x, y + 0.15, 0.30);
    // the bell: a lathe, pale and glassy, and small enough to stay small
    e.lathe([[0.012, 0], [0.030, 0.012], [0.048, 0.045], [0.052, 0.075], [0.040, 0.090], [0.014, 0.094], [0.010, 0.098]],
      9, e.rng.pick([PAL.waterSky, PAL.paper, PAL.bambooLit]), 'pale', x, y, 0.30);
    e.cyl(0.007, 0.007, 0.05, 4, PAL.paper, 'pale', x, y - 0.025, 0.30);
    e.anim('chime', { x, y: y - 0.05, z: 0.30, w: 0.042, h: 0.16 });
  }
});

/* ================================================================== *
 * 4.  Temple and shrine ground
 *
 * The 賽銭箱 is *not* here: `shrine.js` owns it, and two modules building the
 * same object is how a world ends up with two of everything, 30 mm apart,
 * z-fighting in exactly one frame.
 * ================================================================== */

/** 標石 -- the stone that tells you which way the approach goes. */
def('pathMarker', 'temple', {}, (e) => {
  const H = e.v('tall') ? 1.75 : 1.25, W = 0.20;
  e.up(W + 0.10, 0.10, W + 0.10, PAL.stoneDark, 'cool', 0, 0, 0);
  e.geo(taperBox(W, W, H - 0.16, 0.94), trs(0, 0.08, 0), PAL.stone, 'cool');
  e.geo(taperBox(W * 0.94, W * 0.94, 0.08, 0.35), trs(0, H - 0.08, 0), PAL.stone, 'cool');
  e.decal(W * 0.72, H * 0.66, CELL.markerFace, 0, H * 0.52, W / 2 * 0.96 + 0.004);
  e.decal(W * 0.72, H * 0.66, CELL.markerFace, 0, H * 0.52, -(W / 2 * 0.96 + 0.004), 0, Math.PI);
});

/** 玉垣 -- the run of low stone posts round a precinct.  `variant` = count. */
def('tamagaki', 'temple', { run: true }, (e) => {
  const n = e.num(6);
  const pitch = 0.60, W = 0.15, H = 1.20;
  const len = (n - 1) * pitch;
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + i * pitch;
    const gy = e.gy(x, 0);
    e.geo(taperBox(W, W, H, 0.92), trs(x, gy, 0), PAL.stone, 'cool');
    e.geo(taperBox(W * 0.9, W * 0.9, 0.05, 0.45), trs(x, gy + H, 0), PAL.stone, 'cool');
    if (i < n - 1) {
      const gy2 = e.gy(x + pitch, 0);
      e.tube(x, gy + H - 0.18, 0, x + pitch, gy2 + H - 0.18, 0, 0.10, 0.09, PAL.stoneDark, 'cool');
    }
  }
});

/** 常香炉 -- the incense burner, and the only smoke in the world. */
def('incenseBurner', 'temple', {}, (e) => {
  // Kiyomizu's: a ~1.2 m bowl on a ~1.0 m stand (STREET 3.5)
  const R = 0.58, H = 0.92;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.4;
    e.tube(Math.cos(a) * R * 0.7, 0, Math.sin(a) * R * 0.7,
           Math.cos(a) * R * 0.8, H * 0.45, Math.sin(a) * R * 0.8, 0.07, 0.07, PAL.copperDark, 'cool');
  }
  e.lathe([[R * 0.62, H * 0.4], [R * 0.9, H * 0.55], [R, H * 0.78], [R * 0.96, H], [R * 0.86, H], [R * 0.80, H * 0.5]],
    14, PAL.copperDark, 'cool', 0, 0, 0);
  e.cyl(R * 0.82, R * 0.82, 0.06, 14, 0x54514a, 'cool', 0, H - 0.05, 0);
  // 灰 and the standing sticks
  const rr = e.rng;
  for (let i = 0; i < 9; i++) {
    const a = rr.range(0, TAU), rad = rr.range(0, R * 0.6);
    e.cyl(0.004, 0.004, 0.20, 3, PAL.timberPale, 'thin', Math.cos(a) * rad, H + 0.08, Math.sin(a) * rad, rr.range(-0.1, 0.1), 0, rr.range(-0.1, 0.1));
  }
  // the lid, on four short posts, the way a 常香炉 is actually roofed
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.78;
    e.cyl(0.035, 0.035, 0.42, 5, PAL.copperDark, 'cool', Math.cos(a) * R * 0.72, H + 0.21, Math.sin(a) * R * 0.72);
  }
  e.lathe([[R * 1.1, 0], [R * 1.05, 0.06], [R * 0.6, 0.20], [R * 0.2, 0.28], [0.06, 0.32], [0.001, 0.34]],
    12, PAL.copper, 'cool', 0, H + 0.42, 0);
  e.anim('steam', { x: 0, y: H + 0.16, z: 0, rise: 1.5, r: 0.30, n: 5, color: PAL.paper });
  e.collide(R * 2 + 0.1, R * 2 + 0.1, H + 0.8);
});

/** ろうそく立て -- the candle stand, with its wind hood. */
def('candleStand', 'temple', {}, (e) => {
  const W = 0.70, H = 0.92;
  for (const s of [-1, 1]) for (const t of [-1, 1]) {
    e.up(0.04, H, 0.04, PAL.iron, 'cool', s * (W / 2 - 0.04), e.gy(s * 0.3, t * 0.1), t * 0.13);
  }
  e.box(W, 0.04, 0.30, PAL.iron, 'cool', 0, H - 0.14, 0);
  e.box(W + 0.08, 0.05, 0.36, PAL.iron, 'cool', 0, H + 0.10, 0);
  for (const s of [-1, 1]) e.box(W + 0.08, 0.22, 0.03, PAL.iron, 'cool', 0, H, s * 0.18);
  const rr = e.rng;
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.095;
    const h = rr.range(0.05, 0.16);
    e.cyl(0.013, 0.013, h, 6, PAL.paper, 'pale', x, H - 0.12 + h / 2, 0);
    e.cyl(0.004, 0.004, 0.02, 3, PAL.black, 'warm', x, H - 0.12 + h + 0.01, 0);
  }
});

/** A stack of spare roof tiles against a wall.  Every temple has one. */
def('tileStack', 'temple', {}, (e) => {
  const rr = e.rng;
  const rows = e.num(2);
  for (let r = 0; r < rows; r++) {
    const z = 0.20 + r * 0.30;
    const n = rr.int(7, 11);
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 0.055;
      e.geo(new THREE.BoxGeometry(0.05, 0.30, 0.27),
        trs(x, e.gy(x, z) + 0.15, z, -0.22, 0, 0), r % 2 ? PAL.tileWarm : PAL.tileRoof, 'cool');
    }
    if (rr.chance(0.7)) {
      const x = (n / 2) * 0.055 + 0.12;
      e.cyl(0.075, 0.075, 0.05, 10, PAL.tileRoof, 'cool', x, e.gy(x, z) + 0.03, z, 0, 0, Math.PI / 2);
      e.decalGeo(new THREE.CircleGeometry(0.07, 12), trs(x + 0.028, e.gy(x, z) + 0.03, z, 0, Math.PI / 2, 0), CELL.tileEnd);
    }
  }
});

/** 手桶と柄杓 -- the water bucket and its ladle, left on the ground. */
def('waterBucket', 'temple', {}, (e) => {
  const R = 0.145, H = 0.26;
  e.lathe([[R * 0.86, 0], [R * 0.9, 0.015], [R, H - 0.01], [R * 0.98, H], [R * 0.9, H], [R * 0.84, 0.02]],
    10, PAL.timberPale, 'warm', 0, 0, 0);
  for (const hy of [0.03, H - 0.03]) {
    e.geo(new THREE.TorusGeometry(R * 0.99, 0.010, 4, 10), trs(0, hy, 0, Math.PI / 2), PAL.metalDark, 'cool');
  }
  e.tube(-R, H + 0.02, 0, R, H + 0.02, 0, 0.020, 0.020, PAL.timberMid, 'warm');
  e.cyl(R * 0.9, R * 0.9, 0.01, 10, PAL.waterSky, 'pale', 0, H - 0.05, 0);
  // the ladle, hooked over the rim
  e.cyl(0.055, 0.055, 0.045, 8, PAL.timberPale, 'warm', 0.10, H + 0.06, 0.10);
  e.tube(0.10, H + 0.075, 0.10, 0.10, H + 0.055, 0.40, 0.016, 0.016, PAL.timberPale, 'warm');
});

/** 蹲踞 -- the low stone water basin, with its bamboo spout. */
def('stoneBasin', 'temple', {}, (e) => {
  const R = 0.30;
  e.lathe([[R * 1.05, 0], [R * 1.1, 0.06], [R * 1.02, 0.34], [R, 0.40], [R * 0.78, 0.40], [R * 0.80, 0.10], [R * 0.6, 0.08]],
    12, PAL.stone, 'cool', 0, 0, 0);
  e.cyl(R * 0.78, R * 0.78, 0.02, 12, PAL.waterSky, 'pale', 0, 0.355, 0);
  // 掛樋 -- the split-bamboo spout on its post
  e.cyl(0.035, 0.04, 0.86, 6, PAL.bambooCulm, 'warm', -R - 0.18, 0.43, -0.12);
  e.geo(new THREE.CylinderGeometry(0.035, 0.035, 0.52, 7, 1, false, 0, Math.PI),
    trs(-R + 0.06, 0.84, -0.02, Math.PI / 2 + 0.09, 0, 0), PAL.bambooCulmPale, 'warm');
  const rr = e.rng;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 1.2;
    e.geo(new THREE.IcosahedronGeometry(rr.range(0.09, 0.16), 0),
      trs(Math.cos(a) * (R + 0.30), 0.03, Math.sin(a) * (R + 0.30), 0, a, 0, 1, 0.55, 1), PAL.stoneDark, 'cool');
  }
  if (e.rng.chance(0.6)) {
    e.geo(new THREE.IcosahedronGeometry(0.20, 0), trs(R + 0.34, 0.02, 0.24, 0.2, 1.1, 0, 1, 0.4, 1), PAL.stoneMoss, 'cool');
  }
});

/** A swept pile of leaves.  With the broom still leaning in it, if you like. */
def('leafPile', 'temple', { flat: true }, (e) => {
  const rr = e.rng;
  const R = rr.range(0.34, 0.62);
  const autumn = e.v('autumn');
  const tones = autumn
    ? [PAL.leafMapleAutumn, PAL.leafMapleAutumnLit, 0xa8683c, PAL.timberWarm]
    : [PAL.petalDeep, PAL.petal, PAL.blossomShade, PAL.blossomWarm];
  e.geo(new THREE.IcosahedronGeometry(R, 1), trs(0, -R * 0.55, 0, 0, rr.range(0, 3), 0, 1, 0.42, 1),
    tones[0], autumn ? 'warm' : 'pale');
  for (let i = 0; i < 14; i++) {
    const a = rr.range(0, TAU), rad = rr.range(0, R * 1.25);
    const g = new THREE.PlaneGeometry(rr.range(0.05, 0.10), rr.range(0.05, 0.09));
    g.rotateX(-Math.PI / 2);
    e.geo(g, trs(Math.cos(a) * rad, 0.012 + rr.range(0, 0.05), Math.sin(a) * rad, 0, rr.range(0, TAU), 0),
      rr.pick(tones), autumn ? 'warm' : 'pale');
  }
});

/* ================================================================== *
 * 5.  The street surface
 * ================================================================== */

/** 縁石 -- a run of dressed granite kerb, each unit on its own ground. */
def('kerbStone', 'surface', { run: true }, (e) => {
  const n = e.num(4);
  const uw = 0.92, H = e.v('low') ? 0.09 : 0.17, D = 0.16;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * uw;
    const gy = e.gy(x, 0);
    e.box(uw - 0.012, H + 0.24, D, i % 2 ? PAL.stone : PAL.stoneDark, 'cool', x, gy + H / 2 - 0.12, 0);
  }
  // a kerb is a step, not a wall: give the walker its top and let them over it
  e.collide(n * uw, D, H, undefined);
});

/** 車止め -- the granite bollard that keeps a car off a stone street. */
def('graniteBollard', 'surface', {}, (e) => {
  const W = 0.22, H = 0.62;
  e.geo(taperBox(W + 0.06, W + 0.06, 0.08, 0.94), trs(0, 0, 0), PAL.stoneDark, 'cool');
  e.geo(taperBox(W, W, H - 0.14, 0.95), trs(0, 0.06, 0), PAL.stone, 'cool');
  e.lathe([[W * 0.48, 0], [W * 0.5, 0.02], [W * 0.42, 0.06], [W * 0.24, 0.08], [0.001, 0.085]],
    8, PAL.stone, 'cool', 0, H - 0.08, 0);
  if (e.v('chain')) e.geo(new THREE.TorusGeometry(0.035, 0.010, 4, 8), trs(0, H - 0.20, W / 2 * 0.9, 0, Math.PI / 2), PAL.iron, 'cool');
});

/** 飛石 -- a step stone.  Lies in the ground's own plane, always. */
def('stepStone', 'surface', { flat: true }, (e) => {
  const rr = e.rng;
  const R = rr.range(0.24, 0.40);
  const seg = 8;
  const pts = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * TAU;
    const r = R * (0.72 + rr.range(0, 0.42));
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const g = prism(pts, rr.range(0.09, 0.15));
  g.rotateX(-Math.PI / 2);
  e.geo(g, trs(0, 0.015, 0), rr.chance(0.25) ? PAL.stoneMoss : (rr.chance(0.5) ? PAL.stone : PAL.stoneDark), 'cool');
});

/* ================================================================== *
 * 6.  Life without people
 *
 * The project is in Quiet Kyoto mode: no figures anywhere, not as geometry and
 * not as silhouettes.  Everything below is somebody's trace.
 * ================================================================== */

/** A cat asleep on a warm step.  The tail is the only thing that moves. */
def('catAsleep', 'life', {}, (e) => {
  const rr = e.rng;
  const coat = rr.pick([0xd8cec0, 0x8a8078, 0x4a423e, 0xc4a882, 0xe4dcd0]);
  const pale = mix(coat, 0xffffff, 0.25);
  const ry = rr.range(-0.5, 0.5);
  // curled: one flattened body lump, a head tucked against it, two ears
  e.geo(new THREE.IcosahedronGeometry(0.17, 1), trs(0, 0.115, 0, 0, ry, 0, 1.5, 0.78, 1.15), coat, 'warm');
  e.geo(new THREE.IcosahedronGeometry(0.105, 1), trs(Math.sin(ry) * 0.20 + 0.14, 0.115, Math.cos(ry) * 0.20 * 0 + 0.10, 0, ry, 0, 1.05, 0.92, 1), coat, 'warm');
  for (const s of [-1, 1]) {
    e.geo(prism([[0, 0], [0.045, 0], [0.022, 0.055]], 0.02),
      trs(0.14 + s * 0.012, 0.185, 0.10 + s * 0.055, 0, ry + s * 0.4, 0), coat, 'warm');
  }
  e.geo(new THREE.IcosahedronGeometry(0.055, 0), trs(0.20, 0.085, 0.10, 0, ry, 0, 1, 0.7, 1), pale, 'warm');
  e.anim('tail', { x: -0.14, y: 0.085, z: -0.06, ry, len: 0.30, r: 0.026, color: coat });
  e.hook({ id: 'cat', label: 'let it sleep', w: 0.7, h: 0.6, d: 0.7, x: 0, y: 0.2, z: 0 });
});

/** A bowl somebody left on the bench.  It is still steaming, so they are close. */
def('steamingBowl', 'life', {}, (e) => {
  const y = e.v('ground') ? 0.02 : 0.44;
  const R = 0.075;
  e.lathe([[R * 0.42, 0], [R * 0.46, 0.012], [R * 0.9, 0.05], [R, 0.075], [R * 0.94, 0.082], [R * 0.86, 0.05], [R * 0.4, 0.014]],
    10, e.rng.pick([PAL.ceramicWhite, PAL.ceramicBlue, 0x3a3430]), 'pale', 0, y, 0);
  e.cyl(R * 0.82, R * 0.82, 0.008, 10, mix(PAL.matchaDeep, PAL.timberWarm, 0.4), 'warm', 0, y + 0.062, 0);
  e.cyl(0.006, 0.006, 0.20, 4, PAL.timberPale, 'thin', 0.03, y + 0.085, 0.02, 0.5, 0.6, 0);
  if (!e.v('ground')) {
    e.box(0.30, 0.02, 0.24, PAL.timberPale, 'warm', 0, y - 0.012, 0);
  }
  e.anim('steam', { x: 0, y: y + 0.10, z: 0, rise: 0.42, r: 0.075, n: 3, color: PAL.paper });
});

/**
 * A shutter, half raised.  A shop between shifts, without needing anybody in
 * the doorway.  The district owns the opening; this fills it.
 */
def('shutterHalf', 'life', {}, (e) => {
  const W = e.num(1.90), head = 2.28;
  const open = e.v('open') ? 0.62 : e.v('shut') ? 0.0 : 0.38;
  const drop = (head - 0.02) * (1 - open);
  e.box(W + 0.20, 0.28, 0.24, PAL.metalWarm, 'cool', 0, head + 0.14, 0.02);
  for (const s of [-1, 1]) e.up(0.09, head, 0.14, PAL.metalDark, 'cool', s * (W / 2 + 0.045), 0, 0.02);
  e.decal(W, drop, CELL.shutterFace, 0, head - drop / 2, 0.08);
  e.box(W + 0.02, 0.06, 0.09, PAL.metalDark, 'cool', 0, head - drop, 0.08);
  // the dark behind it, so the gap under a half-shutter is a gap and not a line
  e.box(W, head - drop, 0.04, PAL.shopInterior, 'warm', 0, (head - drop) / 2, -0.10);
  e.hook({ id: 'shutter', label: 'peer under the shutter', w: W, h: 1.6, d: 0.9, x: 0, y: 0.8, z: 0.5 });
});

/**
 * A sliding door left ajar.  Built outward: jambs and a head frame stand proud
 * of the wall line, the panels run in front of them, and the gap between the
 * two is a real hole with dark behind it.
 */
def('slidingDoor', 'life', {}, (e) => {
  const W = e.num(1.72), H = 1.92;
  const gap = e.v('wide') ? 0.52 : 0.30;
  const pw = W / 2;
  e.box(W, H, 0.05, PAL.shopInterior, 'warm', 0, H / 2, -0.06);
  for (const s of [-1, 1]) e.up(0.09, H + 0.08, 0.16, PAL.timber, 'warm', s * (W / 2 + 0.045), 0, 0.05);
  e.box(W + 0.18, 0.12, 0.16, PAL.timber, 'warm', 0, H + 0.06, 0.05);
  e.box(W + 0.18, 0.06, 0.18, PAL.timberDark, 'warm', 0, 0.03, 0.05);
  const panel = (cx, z) => {
    e.box(pw, H, 0.035, PAL.timberMid, 'warm', cx, H / 2, z);
    e.decal(pw - 0.10, H - 0.14, CELL.paperPlain, cx, H / 2, z + 0.020);
    for (let i = 1; i < 3; i++) e.box(pw, 0.035, 0.05, PAL.timberMid, 'warm', cx, (H / 3) * i, z + 0.012);
    e.box(0.035, H, 0.05, PAL.timberMid, 'warm', cx - pw / 2 + 0.018, H / 2, z + 0.012);
    e.box(0.035, H, 0.05, PAL.timberMid, 'warm', cx + pw / 2 - 0.018, H / 2, z + 0.012);
  };
  panel(-W / 2 + pw / 2 - gap, 0.09);
  panel(W / 2 - pw / 2, 0.145);
  e.hook({ id: 'door', label: 'look inside', w: W, h: 1.8, d: 0.9, x: 0, y: 1.0, z: 0.5 });
});

/**
 * 人力車 -- black lacquer, a red seat blanket, parked with its shafts down.
 * Nobody is pulling it: that is the point.
 */
def('rickshaw', 'life', {}, (e) => {
  /* ~235 cm long x 130 cm wide x 200 cm tall, wheels Φ~100 cm (STREET 3.10). */
  const R = 0.50, W = 1.30;
  const bodyY = 0.52;
  const black = PAL.rickshaw;
  for (const s of [-1, 1]) {
    const x = s * (W / 2 + 0.06);
    e.geo(new THREE.TorusGeometry(R, 0.035, 4, 18), trs(x, R, -0.10, 0, Math.PI / 2), black, 'warm');
    e.geo(new THREE.TorusGeometry(R - 0.045, 0.020, 4, 16), trs(x, R, -0.10, 0, Math.PI / 2), PAL.timberPale, 'warm');
    e.cyl(0.065, 0.065, 0.09, 9, PAL.metalDark, 'cool', x, R, -0.10, 0, 0, Math.PI / 2);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI;
      e.cyl(0.010, 0.010, (R - 0.05) * 2, 4, PAL.timberPale, 'thin', x, R, -0.10, a, Math.PI / 2, 0);
    }
    e.tube(x, R, -0.10, s * (W / 2 - 0.10), bodyY - 0.06, -0.10, 0.05, 0.05, black, 'warm');
  }
  // the tub, tapered, with the footboard forward of it
  e.geo(taperBox(W, 0.92, 0.52, 1.14, 1.06), trs(0, bodyY - 0.04, -0.02), black, 'warm');
  e.box(W - 0.06, 0.05, 0.86, black, 'warm', 0, bodyY - 0.02, 0.30);
  e.box(W - 0.02, 0.10, 0.08, black, 'warm', 0, bodyY + 0.02, 0.70);
  // the seat and its 毛氈 blanket -- the only red in the object
  e.box(W - 0.14, 0.10, 0.46, PAL.rickshawRed, 'warm', 0, bodyY + 0.46, -0.10);
  e.box(W - 0.10, 0.34, 0.06, PAL.rickshawRed, 'warm', 0, bodyY + 0.64, -0.30);
  e.box(W - 0.16, 0.26, 0.03, PAL.rickshawRed, 'warm', 0, bodyY + 0.36, 0.12, 0.35);
  // the folded hood behind the seat
  e.geo(new THREE.CylinderGeometry(0.34, 0.34, W - 0.14, 10, 1, false, Math.PI * 0.06, Math.PI * 0.62),
    trs(0, bodyY + 0.60, -0.40, 0, 0, Math.PI / 2), black, 'warm');
  for (const s of [-1, 1]) e.tube(s * (W / 2 - 0.06), bodyY + 0.30, -0.42, s * (W / 2 - 0.06), bodyY + 0.86, -0.34, 0.04, 0.04, black, 'warm');
  // the shafts, down on the ground: an empty rickshaw always rests nose-down
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.14);
    e.tube(x, bodyY + 0.10, 0.30, x + s * 0.05, 0.06, 1.62, 0.055, 0.055, black, 'warm');
    e.cyl(0.05, 0.05, 0.16, 6, PAL.timberPale, 'warm', x + s * 0.05, 0.06, 1.56, Math.PI / 2 - 0.30, 0, 0);
  }
  e.cyl(0.06, 0.06, 0.16, 8, PAL.brass, 'cool', -W / 2 + 0.02, bodyY + 0.34, 0.44, 0, 0, Math.PI / 2);
  e.collide(W + 0.5, 3.0, 1.35, undefined, 0, 0.35);
});

/* ================================================================== *
 * 7.  The four props the census says are here and nobody builds
 * ================================================================== */

/**
 * 市民用消火栓 -- the citizen hydrant, in its **cedar box**.
 *
 * The best Kyoto-specific prop on the route and almost never modelled.  Forty-one
 * of them went into the 産寧坂 preservation district (plus 高台寺南門通, 一念坂
 * and 二寧坂) under the 文化財とその周辺を守る防災水利整備事業, each with a 30 m
 * hose, and the city's own document says why they look like this, verbatim:
 * 「外観（BOX）：景観への配慮から杉を採用」.  Residents put out a shop fire on
 * 二年坂 with one in January 2024 before the brigade got water on.  They are
 * also what the 打ち水 comes from.  STREET 3.8, all `[V]`.
 */
def('hydrantBox', 'infra', {}, (e) => {
  const W = 0.62, D = 0.44, H = 0.88;
  e.up(W + 0.08, 0.10, D + 0.08, PAL.stoneDark, 'cool', 0, 0, 0);
  e.up(W, H - 0.10, D, PAL.timberPale, 'warm', 0, 0.08, 0);
  // vertical cedar boarding: three battens is enough to say 杉
  for (let i = 0; i < 5; i++) {
    e.box(0.03, H - 0.22, 0.02, mix(PAL.timberPale, PAL.timber, 0.35), 'warm',
      -W / 2 + 0.09 + i * ((W - 0.18) / 4), H / 2, D / 2 + 0.011);
  }
  for (const y of [0.20, H - 0.10]) {
    e.box(W + 0.02, 0.05, D + 0.02, mix(PAL.timberPale, PAL.timber, 0.45), 'warm', 0, y, 0);
  }
  // a shallow gabled lid, tile-capped, the way the real boxes are finished
  for (const sd of [-1, 1]) {
    e.box(W * 0.56, 0.05, D + 0.14, PAL.tileRoof, 'cool', sd * W * 0.26, H + 0.05, 0, 0, 0, -sd * 0.28);
  }
  e.box(0.10, 0.06, D + 0.16, PAL.tileRidge, 'cool', 0, H + 0.115, 0);
  e.decal(0.24, 0.24, CELL.hydrantPlate, 0, H * 0.62, D / 2 + 0.02);
  e.box(0.10, 0.04, 0.05, PAL.iron, 'cool', 0, H * 0.30, D / 2 + 0.02);
  e.collide(W + 0.10, D + 0.10, H + 0.14);
  e.hook({ id: 'hydrant', label: 'open the hydrant box', w: 0.9, h: 1.0, d: 0.9, x: 0, y: 0.5, z: 0.4 });
});

/**
 * 野点傘 -- the big red paper parasol beside the teahouse bench.  1.8 m across,
 * documented on this route at 文の助茶屋's courtyard and standard beside a
 * 縁台 with 緋毛氈 (STREET 3.7).  One of the few full-chroma reds the ordinance
 * has nothing to say about, and the strongest silhouette in the kit.
 */
def('nodateGasa', 'shop', {}, (e) => {
  const R = 0.90, poleH = 2.10, rise = 0.34;
  /* Tilted ~8 degrees, and `rot` aims the tilt -- `shopfront.js`'s published
   * contract.  A parasol standing dead vertical reads as a garden umbrella;
   * the lean over the bench is what makes it a 野点傘. */
  const tl = e.v('upright') ? 0 : 0.145;
  const ct = Math.cos(tl), st = Math.sin(tl);
  const at = (h) => [0, h * ct, h * st];
  const top = at(poleH), hub = at(poleH - rise);
  e.tube(0, 0.02, 0, top[0], top[1], top[2], 0.056, 0.056, PAL.bambooCulm, 'warm');
  e.cyl(0.13, 0.16, 0.10, 9, PAL.stoneDark, 'cool', 0, 0.05, 0);
  // the canopy: a shallow cone, and the ribs under it, which is what reads
  e.lathe([[0.001, rise], [R * 0.25, rise * 0.72], [R * 0.62, rise * 0.34],
           [R * 0.94, 0.045], [R, 0], [R * 0.96, -0.012], [R * 0.6, rise * 0.30], [0.001, rise - 0.02]],
    16, PAL.vermilion, 'warm', hub[0], hub[1], hub[2]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    e.tube(top[0], top[1] - 0.03, top[2],
      hub[0] + Math.cos(a) * R * 0.97, hub[1] + 0.02, hub[2] + Math.sin(a) * R * 0.97,
      0.014, 0.014, PAL.timberDark, 'thin');
  }
  e.cyl(0.05, 0.05, 0.09, 8, PAL.timberDark, 'warm', top[0], top[1] + 0.04, top[2], tl);
});


/** 短冊掛け -- the menu rack: a timber frame of paper strips, 0.6 x 1.2 m. */
def('menuRack', 'shop', {}, (e) => {
  const W = 0.66, H = 1.32, y0 = 0.62;
  for (const sd of [-1, 1]) {
    const x = sd * W / 2;
    e.up(0.05, y0 + H, 0.05, PAL.timberMid, 'warm', x, e.gy(x, 0), 0);
    e.up(0.05, 0.035, 0.40, PAL.timberMid, 'warm', x, e.gy(x, 0), 0);
  }
  e.box(W + 0.10, 0.06, 0.06, PAL.timberMid, 'warm', 0, y0 + H, 0);
  e.box(W + 0.10, 0.05, 0.06, PAL.timberMid, 'warm', 0, y0 + 0.04, 0);
  e.box(W, 0.03, 0.035, PAL.timberDark, 'warm', 0, y0 + H - 0.10, 0.012);
  e.decal(W - 0.06, H - 0.20, CELL.menuStrips, 0, y0 + H / 2 - 0.06, 0.032);
  e.decal(W - 0.06, H - 0.20, CELL.menuStrips, 0, y0 + H / 2 - 0.06, 0.020, 0, Math.PI);
});

/**
 * The copper street lamp.  Hanamikoji's lamps are copper, installed with the
 * stone paving and the undergrounding in 2001 (STREET 3.1, `[V]`), at roughly
 * 20 m spacing -- so on that street the lamp *replaces* the utility pole as the
 * vertical rhythm, and getting one right buys back what the undergrounding took
 * away.  The fixture only: a district that wants it to glow calls `ctx.light`.
 */
def('streetLamp', 'infra', {}, (e) => {
  const H = e.v('short') ? 3.10 : 3.85;
  const cu = PAL.copperDark, cuLit = PAL.copper;
  e.lathe([[0.13, 0], [0.135, 0.05], [0.10, 0.10], [0.075, 0.16], [0.062, 0.30]],
    10, cu, 'cool', 0, 0, 0);
  e.cyl(0.042, 0.058, H - 0.30, 8, cu, 'cool', 0, 0.30 + (H - 0.30) / 2, 0);
  for (const y of [1.05, H - 0.75]) e.cyl(0.058, 0.058, 0.05, 8, cuLit, 'cool', 0, y, 0);
  // the head: a square paper lantern under a small copper hip cap
  const hy = H - 0.02;
  e.box(0.30, 0.05, 0.30, cu, 'cool', 0, hy - 0.44, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    e.decal(0.245, 0.40, CELL.lampPanel,
      Math.sin(a) * 0.128, hy - 0.24, Math.cos(a) * 0.128, 0, a);
    e.box(0.032, 0.42, 0.032, cu, 'cool',
      Math.sin(a + Math.PI / 4) * 0.185, hy - 0.24, Math.cos(a + Math.PI / 4) * 0.185, 0, a, 0);
  }
  e.geo(taperBox(0.40, 0.40, 0.16, 0.28), trs(0, hy - 0.03, 0), cuLit, 'cool');
  e.box(0.42, 0.045, 0.42, cu, 'cool', 0, hy - 0.03, 0);
  e.cyl(0.024, 0.030, 0.10, 6, cuLit, 'cool', 0, hy + 0.17, 0);
});

/**
 * 鍾馗さん -- the little ceramic guardian that stands on a machiya's 庇 ridge,
 * facing the neighbour's, to turn their bad luck away.  It is a **roof tile**
 * (瓦人形), fired from the same clay as the roof it stands on, and it is the
 * one figure this world contains: the no-people rule is about *inhabitants*,
 * and a 25 cm ridge ornament is architecture.
 *
 * `machiya.js` places it, at the ridge, on about one house in five.
 */
def('shoki', 'temple', {}, (e) => {
  const H = 0.26;
  const clay = e.v('dark') ? PAL.tileRidge : PAL.tileRoof;
  // the tile plinth it is bedded on, which is what makes it read as a roof tile
  e.geo(taperBox(0.15, 0.13, 0.035, 0.88), trs(0, 0, 0), PAL.tileShade, 'cool');
  // robe: a flaring skirt, the whole silhouette
  e.lathe([[0.070, 0], [0.072, 0.02], [0.056, H * 0.34], [0.048, H * 0.52],
           [0.055, H * 0.60], [0.044, H * 0.66], [0.030, H * 0.68]],
    8, clay, 'cool', 0, 0.035, 0);
  // sleeves, squared off the way a fired figure is
  for (const sd of [-1, 1]) {
    e.box(0.030, 0.075, 0.034, clay, 'cool', sd * 0.055, 0.035 + H * 0.52, 0, 0, 0, sd * 0.30);
  }
  // head, cap and the beard that is half the silhouette
  e.cyl(0.030, 0.030, 0.042, 7, clay, 'cool', 0, 0.035 + H * 0.72, 0);
  e.geo(prism([[-0.022, 0], [0.022, 0], [0.0, 0.05]], 0.026),
    trs(0, 0.035 + H * 0.60, 0.020), mix(clay, 0x000000, 0.25), 'cool');
  e.geo(taperBox(0.072, 0.058, 0.038, 0.55), trs(0, 0.035 + H * 0.76, 0), clay, 'cool');
  e.cyl(0.012, 0.016, 0.028, 6, clay, 'cool', 0, 0.035 + H * 0.87, 0);
  // the sword, held out: it is what tells you which figure this is
  e.tube(0.055, 0.035 + H * 0.50, 0.02, 0.105, 0.035 + H * 0.90, 0.03, 0.012, 0.020, clay, 'cool');
});

/** 竹籠 -- the round bamboo basket, 0.34 dia x 0.22.  Stacked, or holding stock. */
def('basket', 'shop', {}, (e) => {
  const rr = e.rng;
  const n = e.v('stack') ? 3 : 1;
  const R = 0.17, H = 0.22;
  for (let k = 0; k < n; k++) {
    const y = k * (H - 0.055);
    const jr = k ? rr.range(-0.35, 0.35) : 0;
    e.lathe([[R * 0.68, 0], [R * 0.74, 0.012], [R * 0.94, H * 0.55], [R, H - 0.015],
             [R * 1.03, H], [R * 0.97, H], [R * 0.90, H * 0.5], [R * 0.64, 0.02]],
      11, k % 2 ? PAL.bambooCulmPale : PAL.bambooCulm, 'warm',
      rr.range(-0.02, 0.02), y, rr.range(-0.02, 0.02), jr);
    // two weave bands: enough to say 竹 without a texture
    for (const hy of [H * 0.32, H * 0.72]) {
      e.geo(new THREE.TorusGeometry(R * 0.97, 0.010, 4, 12),
        trs(0, y + hy, 0, Math.PI / 2), mix(PAL.bambooCulm, PAL.timber, 0.4), 'thin');
    }
  }
  if (n === 1 && e.rng.chance(0.6)) {
    const cols = [PAL.matcha, PAL.wagashi, PAL.leafMapleAutumn, PAL.sweetGreen, PAL.timberWarm];
    for (let i = 0; i < 6; i++) {
      e.geo(new THREE.IcosahedronGeometry(rr.range(0.035, 0.06), 0),
        trs(rr.range(-0.10, 0.10), H - 0.03 + rr.range(0, 0.04), rr.range(-0.10, 0.10),
            rr.range(0, 1), rr.range(0, 3), 0), rr.pick(cols), 'warm');
    }
  }
});

/** 叺 -- the hemp sack, 0.35 x 0.50, slumped.  Rice, beans, charcoal, coffee. */
def('sack', 'shop', {}, (e) => {
  const rr = e.rng;
  const R = 0.175, H = 0.50;
  const cloth = e.v('dark') ? 0x6b5844 : PAL.kaya;
  // a slumped sack is wide at the bottom, pinched at the neck, and rolled over
  e.lathe([[R * 0.86, 0], [R * 1.02, 0.06], [R, H * 0.42], [R * 0.86, H * 0.72],
           [R * 0.62, H * 0.88], [R * 0.70, H * 0.96], [R * 0.52, H], [0.02, H * 0.99]],
    9, cloth, 'warm', 0, 0, 0, rr.range(0, TAU));
  e.geo(new THREE.TorusGeometry(R * 0.60, 0.018, 4, 9),
    trs(0, H * 0.90, 0, Math.PI / 2), mix(cloth, PAL.timber, 0.5), 'thin');
  e.decal(0.17, 0.13, CELL.boxLabel, 0, H * 0.44, R * 0.98);
  if (e.v('open')) {
    e.cyl(R * 0.48, R * 0.48, 0.02, 9, PAL.paperWarm, 'pale', 0, H * 0.97, 0);
  }
});

/**
 * 杉玉 (酒林) -- the ball of cedar sprigs hung over a sake shop's door when the
 * new season's brew is ready.  Fresh in autumn it is bright green; it browns
 * through the year and the colour is how the street tells the time.
 * `variant` 0 fresh, 1 aged.  `y` is the hanging point.
 */
def('sugidama', 'shop', {}, (e) => {
  const fresh = e.variant === 0 || e.v('fresh');
  const R = 0.20;
  const y = e.anchored ? -R - 0.18 : 2.36;
  e.cyl(0.008, 0.008, 0.22, 4, PAL.iron, 'cool', 0, y + R + 0.11, 0);
  e.cyl(0.05, 0.06, 0.05, 8, PAL.timberDark, 'warm', 0, y + R + 0.02, 0);
  const rr = e.rng;
  const tone = fresh ? [PAL.leafCedar, PAL.leafCedarLit, PAL.leafPine]
                     : [PAL.kaya, 0xb09a72, 0x9c8a68];
  // many small lumps, never a few big ones: a sphere reads as a boulder
  for (let i = 0; i < 26; i++) {
    const a = rr.range(0, TAU), b = Math.acos(rr.range(-1, 1));
    const rad = R * rr.range(0.62, 0.94);
    e.geo(new THREE.IcosahedronGeometry(R * rr.range(0.30, 0.46), 0),
      trs(Math.sin(b) * Math.cos(a) * rad, y + Math.cos(b) * rad, Math.sin(b) * Math.sin(a) * rad,
          rr.range(0, 3), rr.range(0, 3), 0),
      rr.pick(tone), fresh ? 'cool' : 'warm');
  }
});

/** 植木鉢 -- the bare pot.  `ctx.tree({ kind: 'potted' })` for the planted one. */
def('uekibachi', 'gion', {}, (e) => {
  const rr = e.rng;
  const R = 0.14, H = 0.26;
  const glazed = rr.chance(0.55);
  e.lathe([[R * 0.62, 0], [R * 0.70, 0.02], [R * 0.92, H * 0.55], [R, H * 0.88],
           [R * 1.06, H], [R * 1.02, H * 0.99], [R * 0.90, H * 0.94]],
    10, glazed ? rr.pick(CERAMIC) : 0x8a6a56, glazed ? 'pale' : 'warm', 0, 0, 0);
  e.cyl(R * 0.88, R * 0.88, 0.02, 10, 0x4a3f34, 'warm', 0, H * 0.92, 0);
  if (rr.chance(0.5)) {
    e.geo(new THREE.IcosahedronGeometry(0.055, 0), trs(rr.range(-0.05, 0.05), H * 0.98, rr.range(-0.05, 0.05), 0, 0, 0, 1, 0.6, 1), PAL.shrub, 'cool');
  }
});

export const KINDS = Object.keys(FURNITURE);

/**
 * Names other modules already use for these props.  `machiya.js` asks for
 * `chochin` and `shoki`; `hanamikoji.js` asks for `planter`.  Renaming their
 * call sites is not this module's business, so the alias resolves here.
 */
export const ALIAS = {
  chochin: 'ochayaLantern',
  lantern: 'ochayaLantern',
  planter: 'planterPot',
  potted: 'planterPot',
  barrel: 'pickleBarrel',
  komodaru: 'pickleBarrel',
  inuyarai: 'inuyaraiFree',
  sudare: 'sudareBlind',
  cone: 'roadCone',
  bench: 'endai',
  hydrant: 'hydrantBox',
  parasol: 'nodateGasa',
  mirror: 'trafficMirror',
  pole: 'utilityPole',
  vending: 'vendingMachine',
  cat: 'catAsleep',
};
