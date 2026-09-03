import * as THREE from 'three';
import { PAL } from './palette.js';

/* ------------------------------------------------------------------ *
 * Procedural Canvas2D textures.
 *
 * The project ships with **zero binary assets**.  Every sign, noren, lantern,
 * menu, plaque, price strip, roof tile course and lattice screen is drawn at
 * start-up with Canvas2D.
 *
 * Two rules run through all of it:
 *
 *   1. **Flat and low-frequency.**  Crisp shapes and type, never photographic
 *      noise.  A texture here is a piece of painted set dressing, and the ink
 *      pass in `post.js` is looking at the depth buffer, not at these -- so
 *      anything busy just becomes mush at ten metres and costs memory.
 *
 *   2. **Kyoto's signage ordinance is an art-direction gift.**  The city's
 *      景観条例 restricts sign size, forbids rooftop and flashing signs, and
 *      pushes colours to muted earth tones in the historic districts -- which
 *      is why the real Higashiyama reads as timber and cloth rather than as
 *      plastic.  So: 明朝 and brush faces, black on cream, white on indigo,
 *      gold on black.  No fluorescent anything.  When in doubt, less.
 *
 * Type: 明朝 (mincho, the serif-like face) is the default here, not gothic.
 * Kyoto's shop signs, temple plaques and noren are overwhelmingly mincho or
 * brush-written; gothic reads as a convenience store, which is exactly the
 * distinction the ordinance is trying to preserve.
 * ------------------------------------------------------------------ */

export const MINCHO =
  `'Hiragino Mincho ProN', 'Yu Mincho', 'YuMincho', 'MS PMincho', 'Songti SC', serif`;
export const GOTHIC =
  `'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Yu Gothic UI', 'Meiryo', 'MS Gothic', sans-serif`;
/** For the brush-written look: a heavier mincho, drawn with a wobble. */
export const BRUSH =
  `'Hiragino Mincho ProN', 'Yu Mincho', 'MS PMincho', serif`;

const cache = new Map();

/* ------------------------------------------------------------------ *
 * The texture RNG.
 *
 * Hand-rolled `s = (s * 1103515245 + 12345) >>> 0` is the obvious LCG and it is
 * **broken in JavaScript**: the multiply produces ~3.8e18, far past the 2^53
 * where a double still holds integers exactly, so the low bits -- the only ones
 * `>>> 0` keeps -- are rounding noise.  In practice it collapses to a near
 * constant after a couple of steps.
 *
 * The symptom is not a crash.  It is that every paving stone in the world comes
 * out the same tone, so the granite reads as a sheet of flat tan and the whole
 * street looks unfinished, with nothing in the code to suggest why.
 *
 * `Math.imul` does the multiply in 32-bit integer space, which is what the
 * algorithm always assumed.
 * ------------------------------------------------------------------ */
function rand(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a texture.  Sizes are powers of two wherever the texture repeats;
 * signage does not repeat and is sized to its aspect instead.
 */
export function make(w, h, draw, { srgb = true, repeat = null, aniso = 4, mips = true } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = true;
  draw(c, w, h);
  const tex = new THREE.CanvasTexture(cv);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  tex.generateMipmaps = mips;
  if (!mips) {
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
  }
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  tex.needsUpdate = true;
  return tex;
}

export function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

export function textureCount() { return cache.size; }

export const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');

/**
 * Darken a hex colour, returning a NUMBER.
 *
 * `mixHex` returns a CSS string, so the tempting `mixHex(c, 0x000000, 0.45) | 0`
 * is `NaN | 0`, which is `0`, which is black -- and `woodGrain` takes a number,
 * so every wooden sign in the world was being grained in pure black without
 * anything failing.  Caught by another builder who hit the same idiom 89 times
 * in their own file.
 */
export function darken(hexNum, t) {
  const r = Math.round(((hexNum >> 16) & 255) * (1 - t));
  const g = Math.round(((hexNum >> 8) & 255) * (1 - t));
  const b = Math.round((hexNum & 255) * (1 - t));
  return (r << 16) | (g << 8) | b;
}

/** Mix two hex colours, for shading inside a canvas. */
export function mixHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return hex(
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

/* ------------------------------------------------------------------ *
 * Type
 * ------------------------------------------------------------------ */

/** Shrink until it fits.  Returns the size actually used. */
export function fitText(c, text, maxW, size, font = MINCHO, weight = 'bold') {
  let s = size;
  do {
    c.font = `${weight} ${s}px ${font}`;
    if (c.measureText(text).width <= maxW) break;
    s -= 1;
  } while (s > 6);
  return s;
}

export function centered(c, text, x, y, maxW, size, color, {
  font = MINCHO, weight = 'bold', spacing = 0,
} = {}) {
  const s = fitText(c, text, maxW, size, font, weight);
  c.fillStyle = color;
  c.textBaseline = 'middle';
  if (spacing) {
    c.textAlign = 'left';
    const chars = [...text];
    const total = chars.reduce((a, ch) => a + c.measureText(ch).width + spacing, -spacing);
    let cx = x - total / 2;
    for (const ch of chars) {
      c.fillText(ch, cx, y);
      cx += c.measureText(ch).width + spacing;
    }
  } else {
    c.textAlign = 'center';
    c.fillText(text, x, y);
  }
  return s;
}

/**
 * Vertical writing -- 縦書き.  This is the default for Japanese signage and
 * getting it right is most of what makes a sign read as Japanese rather than as
 * Japanese words on a Western sign.
 *
 * Small kana are inset, the long vowel mark and brackets rotate, and 、。are
 * offset to the top right of their cell, which is what a vertical setting does.
 */
const ROTATE_IN_VERTICAL = new Set(['ー', '−', '—', '〜', '～', '（', '）', '「', '」', '『', '』', '【', '】', '(', ')']);
const SMALL_KANA = new Set(['っ', 'ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ッ', 'ャ', 'ュ', 'ョ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ']);
const CORNER_PUNCT = new Set(['、', '。', '，', '．']);

export function vertical(c, text, x, y0, step, size, color, {
  font = MINCHO, weight = 'bold', spacingBoost = 1,
} = {}) {
  c.font = `${weight} ${size}px ${font}`;
  c.fillStyle = color;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const chars = [...text];
  let y = y0;
  for (const ch of chars) {
    if (ROTATE_IN_VERTICAL.has(ch)) {
      c.save();
      c.translate(x, y);
      c.rotate(Math.PI / 2);
      c.fillText(ch, 0, 0);
      c.restore();
    } else if (CORNER_PUNCT.has(ch)) {
      c.fillText(ch, x + size * 0.26, y - size * 0.28);
    } else if (SMALL_KANA.has(ch)) {
      c.fillText(ch, x + size * 0.1, y - size * 0.08);
    } else {
      c.fillText(ch, x, y);
    }
    y += step * spacingBoost;
  }
  return y;
}

/** Vertical text auto-fitted into a column of a given height. */
export function verticalFit(c, text, x, yTop, yBot, maxSize, color, opts = {}) {
  const n = [...text].length || 1;
  const step = Math.min(maxSize * 1.06, (yBot - yTop) / n);
  const size = Math.min(maxSize, step * 0.94);
  return vertical(c, text, x, yTop + step / 2, step, size, color, opts);
}

/**
 * A brush-written look, without a brush font.
 *
 * Real 筆文字 is drawn with a loaded brush: strokes swell in the middle and
 * dry out at the end.  Faking it properly needs stroke data we do not have, so
 * this does the two things that actually read at sign distance -- a very
 * slightly irregular baseline and a doubled draw with a tiny offset and lower
 * alpha, which thickens the strokes unevenly.  At two metres it is convincing;
 * at twenty centimetres it is not, and nothing in this world is looked at from
 * twenty centimetres.
 */
export function brushVertical(c, text, x, y0, step, size, color, { jitter = 1 } = {}) {
  const chars = [...text];
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  let y = y0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const jx = (((i * 37) % 7) / 7 - 0.5) * jitter * size * 0.03;
    const jr = (((i * 53) % 5) / 5 - 0.5) * jitter * 0.03;
    c.save();
    c.translate(x + jx, y);
    c.rotate(jr);
    c.font = `bold ${size}px ${BRUSH}`;
    c.globalAlpha = 1;
    c.fillStyle = color;
    c.fillText(ch, 0, 0);
    c.globalAlpha = 0.5;
    c.fillText(ch, size * 0.012, size * 0.014);
    c.globalAlpha = 0.28;
    c.font = `bold ${size * 1.02}px ${BRUSH}`;
    c.fillText(ch, -size * 0.008, 0);
    c.restore();
    y += step;
  }
  c.globalAlpha = 1;
  return y;
}

/* ------------------------------------------------------------------ *
 * Surfaces
 * ------------------------------------------------------------------ */

/** Paper / plaster grain.  Very low contrast -- it is a tint, not a texture. */
export function grain(c, w, h, amount = 0.045, seed = 1) {
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  const rnd = rand(seed * 2654435761);
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 255 * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  c.putImageData(img, 0, 0);
}

/** Wood grain, drawn as long low-contrast strokes along one axis. */
export function woodGrain(c, w, h, base, dark, { vertical: vert = false, lines = 26, seed = 3 } = {}) {
  c.fillStyle = hex(base);
  c.fillRect(0, 0, w, h);
  const rnd = rand(seed * 40503 + 7);
  c.strokeStyle = hex(dark);
  for (let i = 0; i < lines; i++) {
    c.globalAlpha = 0.04 + rnd() * 0.10;
    c.lineWidth = 0.6 + rnd() * 2.2;
    c.beginPath();
    if (vert) {
      const x = rnd() * w;
      c.moveTo(x, 0);
      for (let y = 0; y <= h; y += h / 8) c.lineTo(x + (rnd() - 0.5) * w * 0.03, y);
    } else {
      const y = rnd() * h;
      c.moveTo(0, y);
      for (let x = 0; x <= w; x += w / 8) c.lineTo(x, y + (rnd() - 0.5) * h * 0.03);
    }
    c.stroke();
  }
  c.globalAlpha = 1;
}

/* ------------------------------------------------------------------ *
 * Building materials
 * ------------------------------------------------------------------ */

/**
 * 本瓦葺 / 桟瓦葺 -- the roof tile course.
 *
 * A tiled roof is *corrugated*, and that corrugation is what makes it read as
 * tile from a hundred metres rather than as a grey plane.  Drawn as bands with
 * a lit crest and a shaded valley, plus the round 丸瓦 caps that run down the
 * slope on a temple roof.
 *
 * `repeat` is set by the caller from the real tile module: a 桟瓦 is about
 * 0.235 m wide with 0.265 m of exposed length, so a 6 m wide roof slope with a
 * 4 m rafter run repeats about 25 x 15.
 */
export const tileTex = (kind = 'sangawara') =>
  cached('tile' + kind, () => make(128, 128, (c, w, h) => {
    const rows = kind === 'hongawara' ? 4 : 5;
    c.fillStyle = hex(PAL.tileRoof);
    c.fillRect(0, 0, w, h);
    const rh = h / rows;
    for (let i = 0; i < rows; i++) {
      const y = i * rh;
      // the shaded top of each course, where the tile above overlaps it
      c.fillStyle = hex(PAL.tileShade);
      c.fillRect(0, y, w, rh * 0.30);
      // the lit crest
      c.fillStyle = hex(PAL.tileEdge);
      c.fillRect(0, y + rh * 0.30, w, rh * 0.13);
      c.fillStyle = hex(PAL.tileRoof);
      c.fillRect(0, y + rh * 0.43, w, rh * 0.57);
    }
    if (kind === 'hongawara') {
      // 丸瓦: the half-round caps down the slope
      const cols = 4;
      for (let j = 0; j < cols; j++) {
        const x = (j + 0.5) * (w / cols);
        c.fillStyle = hex(PAL.tileEdge);
        c.fillRect(x - w * 0.035, 0, w * 0.07, h);
        c.fillStyle = hex(PAL.tileShade);
        c.fillRect(x + w * 0.028, 0, w * 0.016, h);
        c.fillStyle = hex(mixHex(PAL.tileEdge, 0xffffff, 0.22));
        c.fillRect(x - w * 0.018, 0, w * 0.012, h);
      }
    } else {
      // 桟瓦: the S-profile leaves one raised rib per tile width
      const cols = 5;
      for (let j = 0; j < cols; j++) {
        const x = (j + 0.5) * (w / cols);
        c.fillStyle = hex(PAL.tileShade);
        c.globalAlpha = 0.5;
        c.fillRect(x - w * 0.012, 0, w * 0.024, h);
        c.globalAlpha = 1;
      }
    }
    grain(c, w, h, 0.03, 7);
  }, { repeat: [1, 1] }));

/**
 * 檜皮葺 -- cypress-bark thatch.  Kiyomizu-dera's main hall and most shrine
 * roofs.  Soft, brown, and layered in fine horizontal courses rather than
 * corrugated -- which is what distinguishes it from tile at a distance.
 */
export const hiwadaTex = () =>
  cached('hiwada', () => make(128, 128, (c, w, h) => {
    c.fillStyle = hex(PAL.hiwada);
    c.fillRect(0, 0, w, h);
    const rows = 22;
    for (let i = 0; i < rows; i++) {
      const y = (i / rows) * h;
      c.fillStyle = i % 2 ? hex(mixHex(PAL.hiwada, PAL.hiwadaLit, 0.5)) : hex(PAL.hiwada);
      c.fillRect(0, y, w, h / rows * 0.62);
      c.fillStyle = hex(mixHex(PAL.hiwada, 0x000000, 0.22));
      c.fillRect(0, y + h / rows * 0.62, w, h / rows * 0.16);
    }
    grain(c, w, h, 0.05, 13);
  }, { repeat: [1, 1] }));

/**
 * 格子 -- the lattice screen, as an alpha-mapped texture.
 *
 * Modelling every batten as geometry is correct and is what the hero facades on
 * Hanamikoji do.  For the rest of the world -- forty machiya seen from across a
 * street -- this is the same image for a two-hundredth of the cost.
 *
 * The three variants are real distinctions: 糸屋格子 (thread merchant) has the
 * battens grouped, 米屋格子 (rice) is heavy and widely spaced because rice bales
 * had to pass, 酒屋格子 (sake) is the heaviest of all.
 */
export const latticeTex = (kind = 'itoya') =>
  cached('lattice' + kind, () => make(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const recess = hex(PAL.timberDark);
    c.fillStyle = recess;
    c.fillRect(0, 0, w, h);
    const cfg = {
      itoya:  { n: 28, wide: 0.36, group: 4, groupGap: 1.9 },
      komeya: { n: 12, wide: 0.52, group: 0, groupGap: 1 },
      sakaya: { n: 9,  wide: 0.62, group: 0, groupGap: 1 },
      fine:   { n: 40, wide: 0.30, group: 0, groupGap: 1 },
    }[kind] || { n: 24, wide: 0.4, group: 0, groupGap: 1 };

    c.fillStyle = hex(PAL.timber);
    if (cfg.group) {
      // grouped battens: n in a bunch, then a wider gap
      const unit = w / (cfg.n * (1 + 0) + Math.floor(cfg.n / cfg.group) * (cfg.groupGap - 1));
      let x = 0, i = 0;
      while (x < w) {
        c.fillRect(x, 0, unit * cfg.wide, h);
        x += unit;
        i++;
        if (i % cfg.group === 0) x += unit * (cfg.groupGap - 1);
      }
    } else {
      const unit = w / cfg.n;
      for (let i = 0; i < cfg.n; i++) c.fillRect(i * unit, 0, unit * cfg.wide, h);
    }
    // the horizontal rails: top, middle, bottom
    c.fillStyle = hex(PAL.timberMid);
    c.fillRect(0, 0, w, h * 0.06);
    c.fillRect(0, h * 0.47, w, h * 0.05);
    c.fillRect(0, h * 0.94, w, h * 0.06);
  }, { repeat: [1, 1] }));

/** 漆喰 plaster wall, with the faint horizontal trowel banding it really has. */
export const plasterTex = (tone = PAL.plaster) =>
  cached('plaster' + tone, () => make(128, 128, (c, w, h) => {
    c.fillStyle = hex(tone);
    c.fillRect(0, 0, w, h);
    c.globalAlpha = 0.05;
    c.fillStyle = hex(mixHex(tone, 0x000000, 0.4));
    for (let i = 0; i < 9; i++) {
      const y = (i / 9) * h + Math.sin(i) * 3;
      c.fillRect(0, y, w, 1.6);
    }
    c.globalAlpha = 1;
    grain(c, w, h, 0.03, 21);
  }, { repeat: [1, 1] }));

/* ------------------------------------------------------------------ *
 * The stone of Higashiyama.
 *
 * The setts on Ninenzaka, Sannenzaka and Ishibe-koji are **reused Kyoto tram-bed
 * granite** -- lifted and relaid after the city's tram system closed in 1978.
 * So they are not a fresh pavement: they are pre-worn, mismatched, and laid in
 * whatever order they came out of the lorry.  That is the single most useful
 * fact about the ground in this project, because it licenses -- requires --
 * real tonal spread between neighbouring stones.
 *
 * The first version of these textures blended each stone a little way from one
 * base tone, which gave a spread of about 10 % luminance between the lightest
 * and darkest.  On screen, through a cel ramp and a colour grade, 10 % is
 * nothing: the street rendered as a flat sheet and looked unpaved.  These
 * ladders run about 40 %, from a wet-looking near-black through to a
 * bleached, sun-worn pale, and each stone takes one of them whole rather than
 * being a blend.
 * ------------------------------------------------------------------ */

/** Big slabs: mostly mid tones with a few outliers, warm and cool mixed. */
const STONE_TONES = [
  0xc4bcb2, 0xb8afa4, 0xaaa196, 0x9c948a, 0xc9c2b6,
  0xb2a89c, 0xa49a90, 0xbfb6aa, 0x968d84, 0xcdc6ba,
  0xa8a49e, 0xb6ada0,
];

/** Setts: smaller, darker, and more varied still -- they hold the damp. */
const SETT_TONES = [
  0x8e867c, 0x7e766c, 0x9c948a, 0x6e6862, 0xa8a096,
  0x8a8278, 0x746e66, 0x968e84, 0x625c58, 0xb0a89c,
];

/** Granite sett paving -- the small blocks, laid in courses. */
export const settTex = () =>
  cached('sett', () => make(256, 256, (c, w, h) => {
    c.fillStyle = hex(PAL.settDark);
    c.fillRect(0, 0, w, h);
    const rows = 8;
    const rh = h / rows;
    const rnd = rand(99);
    for (let j = 0; j < rows; j++) {
      let x = -rnd() * 30;
      while (x < w) {
        const bw = 22 + rnd() * 16;
        c.fillStyle = hex(SETT_TONES[Math.floor(rnd() * SETT_TONES.length)]);
        c.fillRect(x + 1.3, j * rh + 1.3, bw - 2.6, rh - 2.6);
        x += bw;
      }
    }
    grain(c, w, h, 0.05, 31);
  }, { repeat: [1, 1] }));

/** Big stone slabs -- Ninenzaka, Sannenzaka, Nene-no-michi. */
export const slabTex = () =>
  cached('slab', () => make(256, 256, (c, w, h) => {
    c.fillStyle = hex(PAL.pavingDark);
    c.fillRect(0, 0, w, h);
    const rnd = rand(7);
    // two courses of large slabs with a band of setts between, which is how
    // the real streets are laid
    const bands = [
      { y: 0, h: 0.42, slab: true },
      { y: 0.42, h: 0.16, slab: false },
      { y: 0.58, h: 0.42, slab: true },
    ];
    for (const b of bands) {
      const y = b.y * h, bh = b.h * h;
      if (b.slab) {
        let x = -rnd() * 40;
        while (x < w) {
          const bw = 60 + rnd() * 50;
          c.fillStyle = hex(STONE_TONES[Math.floor(rnd() * STONE_TONES.length)]);
          c.fillRect(x + 1.6, y + 1.6, bw - 3.2, bh - 3.2);
          x += bw;
        }
      } else {
        let x = 0;
        while (x < w) {
          const bw = 14 + rnd() * 8;
          c.fillStyle = hex(SETT_TONES[Math.floor(rnd() * SETT_TONES.length)]);
          c.fillRect(x + 1.1, y + 1.1, bw - 2.2, bh - 2.2);
          x += bw;
        }
      }
    }
    grain(c, w, h, 0.05, 41);
  }, { repeat: [1, 1] }));

/** 白川砂 -- the raked pale gravel of a shrine precinct. */
export const gravelTex = () =>
  cached('gravel', () => make(128, 128, (c, w, h) => {
    c.fillStyle = hex(PAL.gravel);
    c.fillRect(0, 0, w, h);
    const rnd = rand(3);
    for (let i = 0; i < 900; i++) {
      c.fillStyle = hex(mixHex(PAL.gravel, rnd() > 0.5 ? 0xffffff : PAL.gravelDark, rnd() * 0.55));
      c.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
    }
  }, { repeat: [1, 1] }));

/* ------------------------------------------------------------------ *
 * Signage
 * ------------------------------------------------------------------ */

/**
 * 看板 -- the vertical wooden shop signboard.
 *
 * The commonest sign in Higashiyama by a wide margin: a plank, hung or fixed
 * flat to the facade, with the shop's name written down it in mincho or brush.
 */
export function verticalSign(text, {
  board = PAL.timberPale, textColor = PAL.black, w = 128, h = 512,
  frame = true, brush = false, sub = null,
} = {}) {
  return make(w, h, (c, W, H) => {
    woodGrain(c, W, H, board, darken(board, 0.45), { vertical: true, lines: 18 });
    if (frame) {
      c.strokeStyle = hex(mixHex(board, 0x000000, 0.4));
      c.lineWidth = 3;
      c.strokeRect(4, 4, W - 8, H - 8);
    }
    const pad = H * 0.07;
    const cols = sub ? 2 : 1;
    const cx = cols === 2 ? W * 0.62 : W * 0.5;
    const size = Math.min(W * (cols === 2 ? 0.52 : 0.72), (H - pad * 2) / Math.max(1, [...text].length) * 0.94);
    const step = size * 1.1;
    const y0 = (H - step * ([...text].length - 1)) / 2;
    if (brush) brushVertical(c, text, cx, y0, step, size, hex(textColor));
    else vertical(c, text, cx, y0, step, size, hex(textColor));
    if (sub) {
      const ss = size * 0.42;
      vertical(c, sub, W * 0.24, y0 + step * 0.3, ss * 1.12, ss, hex(mixHex(textColor, board, 0.3)));
    }
  }, { mips: true });
}

/**
 * 暖簾 -- the split curtain hung across a shop entrance.
 *
 * Drawn with the splits as transparent gaps, so the mesh can be a single quad
 * with an alpha map and still read as separate panels swinging.  `panels` is
 * usually 3 for a shop and 2 or 5 for a restaurant.
 */
export function norenTex(text, {
  cloth = PAL.norenIndigo, textColor = PAL.paper, panels = 3,
  w = 512, h = 256, crest = null, splitFrom = 0.14,
} = {}) {
  return make(w, h, (c, W, H) => {
    c.clearRect(0, 0, W, H);
    const gap = W * 0.006;
    const pw = (W - gap * (panels - 1)) / panels;
    for (let i = 0; i < panels; i++) {
      const x = i * (pw + gap);
      c.fillStyle = hex(cloth);
      // the top band is continuous; the splits start below it
      c.fillRect(x, H * splitFrom, pw, H * (1 - splitFrom));
    }
    c.fillStyle = hex(cloth);
    c.fillRect(0, 0, W, H * splitFrom + 1);
    // the sleeve the pole runs through, a shade darker
    c.fillStyle = hex(mixHex(cloth, 0x000000, 0.18));
    c.fillRect(0, 0, W, H * 0.055);

    if (crest) {
      c.save();
      c.translate(W * 0.5, H * 0.30);
      c.fillStyle = hex(textColor);
      c.beginPath();
      c.arc(0, 0, H * 0.10, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = hex(cloth);
      c.beginPath();
      c.arc(0, 0, H * 0.072, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = hex(textColor);
      c.font = `bold ${H * 0.10}px ${MINCHO}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(crest, 0, H * 0.005);
      c.restore();
    }

    const chars = [...text];
    if (chars.length <= 4) {
      // one character per panel, centred -- the classic layout
      const size = Math.min(pw * 0.62, H * 0.42);
      const per = Math.ceil(chars.length / panels);
      for (let i = 0; i < panels; i++) {
        const slice = chars.slice(i * per, (i + 1) * per).join('');
        if (!slice) continue;
        const x = i * (pw + gap) + pw / 2;
        vertical(c, slice, x, H * (crest ? 0.60 : 0.50), size * 1.1, size, hex(textColor));
      }
    } else {
      // long names run down the middle panel
      const size = Math.min(pw * 0.5, (H * 0.72) / chars.length * 1.4);
      vertical(c, text, W * 0.5, H * 0.26, size * 1.08, size, hex(textColor));
    }
  });
}

/**
 * 提灯 -- the paper lantern face, drawn as an unrolled cylinder.
 *
 * The horizontal ribs matter more than the writing: a lantern without them is
 * a glowing tube.  Reads correctly wrapped once around a cylinder.
 */
export function lanternTex(text, {
  paper = PAL.lantern, textColor = PAL.black, ribs = 11,
  w = 256, h = 256, band = null, vertical: vert = true,
} = {}) {
  return make(w, h, (c, W, H) => {
    c.fillStyle = hex(paper);
    c.fillRect(0, 0, W, H);
    // ribs
    c.strokeStyle = hex(mixHex(paper, 0x000000, 0.20));
    c.lineWidth = 1.6;
    for (let i = 1; i < ribs; i++) {
      const y = (i / ribs) * H;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y);
      c.stroke();
    }
    // top and bottom collars
    c.fillStyle = hex(PAL.lanternFrame);
    c.fillRect(0, 0, W, H * 0.055);
    c.fillRect(0, H * 0.945, W, H * 0.055);
    if (band) {
      c.fillStyle = hex(band);
      c.fillRect(0, H * 0.055, W, H * 0.075);
      c.fillRect(0, H * 0.87, W, H * 0.075);
    }
    if (text) {
      const chars = [...text];
      if (vert) {
        const size = Math.min(W * 0.34, (H * 0.66) / chars.length * 1.25);
        vertical(c, text, W * 0.5, H * 0.22, size * 1.14, size, hex(textColor));
      } else {
        centered(c, text, W * 0.5, H * 0.5, W * 0.8, W * 0.3, hex(textColor));
      }
    }
  });
}

/**
 * 木札 / 表札 -- a small wooden plaque.  Shop nameplates, temple sub-hall
 * labels, the little sign by an ochaya's door.
 */
export function woodenSign(text, {
  board = PAL.timberPale, textColor = PAL.black,
  w = 256, h = 128, vertical: vert = false, brush = false, border = false,
} = {}) {
  return make(w, h, (c, W, H) => {
    woodGrain(c, W, H, board, darken(board, 0.5), { vertical: vert, lines: 14 });
    if (border) {
      c.strokeStyle = hex(mixHex(board, 0x000000, 0.35));
      c.lineWidth = 3;
      c.strokeRect(5, 5, W - 10, H - 10);
    }
    if (vert) {
      const chars = [...text];
      const size = Math.min(W * 0.66, (H * 0.86) / chars.length * 1.15);
      if (brush) brushVertical(c, text, W / 2, H * 0.5 - size * (chars.length - 1) * 0.55, size * 1.1, size, hex(textColor));
      else vertical(c, text, W / 2, H * 0.5 - size * (chars.length - 1) * 0.55, size * 1.1, size, hex(textColor));
    } else {
      centered(c, text, W / 2, H / 2, W * 0.86, H * 0.52, hex(textColor), { spacing: H * 0.04 });
    }
  });
}

/**
 * 扁額 -- the temple / shrine plaque over a gate.  Dark board, gold or white
 * characters, a heavy frame.  Always horizontal, always read right-to-left on
 * the oldest ones -- which is a real thing and worth honouring on the hero
 * gates.
 */
export function templePlaque(text, {
  board = 0x2e2620, textColor = PAL.gold, w = 512, h = 200,
  rtl = false, frame = PAL.vermilionDeep,
} = {}) {
  return make(w, h, (c, W, H) => {
    c.fillStyle = hex(frame);
    c.fillRect(0, 0, W, H);
    c.fillStyle = hex(board);
    c.fillRect(W * 0.045, H * 0.10, W * 0.91, H * 0.80);
    const t = rtl ? [...text].reverse().join('') : text;
    c.fillStyle = hex(textColor);
    const chars = [...t];
    const size = Math.min(H * 0.56, (W * 0.80) / chars.length * 1.02);
    c.font = `bold ${size}px ${MINCHO}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const step = (W * 0.82) / chars.length;
    let x = W * 0.5 - (step * (chars.length - 1)) / 2;
    for (const ch of chars) {
      c.fillText(ch, x, H * 0.5);
      x += step;
    }
    // a faint bevel on the frame
    c.strokeStyle = hex(mixHex(frame, 0x000000, 0.4));
    c.lineWidth = 3;
    c.strokeRect(W * 0.045, H * 0.10, W * 0.91, H * 0.80);
  });
}

/**
 * お品書き -- the menu board.  A column of dishes with prices, brush-written on
 * a pale board.  `items` is `[[name, price], ...]`; price may be omitted.
 */
export function menuBoard(title, items, {
  board = PAL.paperWarm, textColor = PAL.black, accent = PAL.redDeep,
  w = 320, h = 512, columns = 1,
} = {}) {
  return make(w, h, (c, W, H) => {
    c.fillStyle = hex(board);
    c.fillRect(0, 0, W, H);
    c.strokeStyle = hex(mixHex(board, 0x000000, 0.30));
    c.lineWidth = 2.5;
    c.strokeRect(6, 6, W - 12, H - 12);
    let y = H * 0.10;
    if (title) {
      centered(c, title, W / 2, y, W * 0.78, H * 0.075, hex(accent), { spacing: 3 });
      y += H * 0.055;
      c.strokeStyle = hex(mixHex(board, 0x000000, 0.22));
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(W * 0.12, y);
      c.lineTo(W * 0.88, y);
      c.stroke();
      y += H * 0.045;
    }
    const rows = Math.ceil(items.length / columns);
    const colW = W / columns;
    const lh = Math.min(H * 0.062, (H - y - H * 0.06) / Math.max(1, rows));
    const size = lh * 0.66;
    items.forEach((it, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      const yy = y + row * lh + lh * 0.5;
      const x0 = col * colW + colW * 0.10;
      const x1 = col * colW + colW * 0.90;
      const [name, price] = Array.isArray(it) ? it : [it, null];
      c.font = `${size}px ${MINCHO}`;
      c.fillStyle = hex(textColor);
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText(name, x0, yy);
      if (price) {
        c.textAlign = 'right';
        c.fillText(price, x1, yy);
      }
    });
  });
}

/**
 * 立て看板 -- the free-standing notice board.  Admission, opening hours,
 * warnings.  Kyoto's are almost always dark timber with white or gold text.
 */
export function noticeBoard(lines, {
  board = 0x3a3028, textColor = PAL.paper, accent = PAL.gold,
  w = 384, h = 512, title = null,
} = {}) {
  return make(w, h, (c, W, H) => {
    woodGrain(c, W, H, board, darken(board, 0.5), { lines: 20 });
    c.strokeStyle = hex(mixHex(board, 0xffffff, 0.15));
    c.lineWidth = 3;
    c.strokeRect(7, 7, W - 14, H - 14);
    let y = H * 0.12;
    if (title) {
      centered(c, title, W / 2, y, W * 0.8, H * 0.085, hex(accent), { spacing: 4 });
      y += H * 0.085;
    }
    const lh = Math.min(H * 0.075, (H - y - H * 0.08) / Math.max(1, lines.length));
    for (const ln of lines) {
      centered(c, ln, W / 2, y + lh * 0.5, W * 0.84, lh * 0.62, hex(textColor));
      y += lh;
    }
  });
}

/**
 * A price strip -- the little cards propped in front of goods on a stall.
 * Several to a texture, so a whole tray of pottery is one draw.
 */
export function priceStrip(entries, { w = 512, h = 128, board = PAL.paper } = {}) {
  return make(w, h, (c, W, H) => {
    const n = entries.length;
    const cw = W / n;
    for (let i = 0; i < n; i++) {
      const [name, price] = Array.isArray(entries[i]) ? entries[i] : [entries[i], ''];
      c.fillStyle = hex(board);
      c.fillRect(i * cw + 2, 2, cw - 4, H - 4);
      c.strokeStyle = hex(mixHex(board, 0x000000, 0.3));
      c.lineWidth = 1.5;
      c.strokeRect(i * cw + 2, 2, cw - 4, H - 4);
      centered(c, name, i * cw + cw / 2, H * 0.34, cw * 0.84, H * 0.30, hex(PAL.black));
      centered(c, price, i * cw + cw / 2, H * 0.72, cw * 0.84, H * 0.30, hex(PAL.redDeep));
    }
  });
}

/** 絵馬 -- the votive tablet.  Pentagon board, ink drawing, hand-written wish. */
export const emaTex = (variant = 0) =>
  cached('ema' + variant, () => make(128, 128, (c, W, H) => {
    const woods = [0xd8c49a, 0xe0cca6, 0xcdb890, 0xd2bd94];
    woodGrain(c, W, H, woods[variant % woods.length], 0x9c8360, { lines: 10 });
    c.strokeStyle = hex(0x8a7050);
    c.lineWidth = 2;
    c.strokeRect(3, 3, W - 6, H - 6);
    // an ink sketch: a horse, a torii, or the shrine crest, kept very simple
    c.fillStyle = hex(PAL.black);
    c.globalAlpha = 0.72;
    if (variant % 3 === 0) {
      c.fillRect(W * 0.24, H * 0.30, W * 0.52, H * 0.05);
      c.fillRect(W * 0.20, H * 0.38, W * 0.60, H * 0.045);
      c.fillRect(W * 0.30, H * 0.35, W * 0.05, H * 0.36);
      c.fillRect(W * 0.65, H * 0.35, W * 0.05, H * 0.36);
    } else if (variant % 3 === 1) {
      c.beginPath();
      c.arc(W * 0.5, H * 0.46, W * 0.17, 0, Math.PI * 2);
      c.fill();
    } else {
      c.font = `bold ${H * 0.34}px ${MINCHO}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('祈', W * 0.5, H * 0.47);
    }
    c.globalAlpha = 1;
    // a scribble of handwriting
    c.strokeStyle = hex(0x384058);
    c.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      const y = H * (0.74 + i * 0.05);
      c.beginPath();
      c.moveTo(W * 0.22, y);
      c.lineTo(W * (0.5 + (i % 2) * 0.25), y);
      c.stroke();
    }
  }));

/** おみくじ -- the folded fortune slip, tied in rows.  White with faint text. */
export const omikujiTex = () =>
  cached('omikuji', () => make(64, 128, (c, W, H) => {
    c.fillStyle = hex(0xf7f4ec);
    c.fillRect(0, 0, W, H);
    c.fillStyle = hex(0xdcd6c8);
    c.fillRect(0, 0, W * 0.16, H);
    c.strokeStyle = hex(0x9aa0b0);
    c.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const y = H * (0.14 + i * 0.11);
      c.beginPath();
      c.moveTo(W * 0.3, y);
      c.lineTo(W * 0.82, y);
      c.stroke();
    }
  }));

/** A rolled-up bamboo blind, 簾, seen edge-on -- fine horizontal lines. */
export const sudareTex = () =>
  cached('sudare', () => make(64, 256, (c, W, H) => {
    c.fillStyle = hex(PAL.sudare);
    c.fillRect(0, 0, W, H);
    c.strokeStyle = hex(PAL.sudareDark);
    c.lineWidth = 1.2;
    for (let i = 0; i < 64; i++) {
      const y = (i / 64) * H;
      c.globalAlpha = 0.5;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y);
      c.stroke();
    }
    c.globalAlpha = 1;
    // the binding cords
    c.fillStyle = hex(0x6b5844);
    c.fillRect(W * 0.18, 0, 2, H);
    c.fillRect(W * 0.78, 0, 2, H);
  }, { repeat: [1, 1] }));

/** 幟 -- the tall vertical cloth banner outside a shop or shrine. */
export function bannerTex(text, {
  cloth = PAL.banner, textColor = PAL.bannerRed, w = 128, h = 512, edge = null,
} = {}) {
  return make(w, h, (c, W, H) => {
    c.fillStyle = hex(cloth);
    c.fillRect(0, 0, W, H);
    if (edge) {
      c.fillStyle = hex(edge);
      c.fillRect(0, 0, W * 0.08, H);
      c.fillRect(W * 0.92, 0, W * 0.08, H);
    }
    const chars = [...text];
    const size = Math.min(W * 0.62, (H * 0.86) / chars.length * 1.1);
    brushVertical(c, text, W * 0.5, H * 0.10 + size * 0.6, size * 1.08, size, hex(textColor));
  });
}

/** The cel-shaded petal sprite: four soft lobes, no photographic edge. */
export const petalTex = () =>
  cached('petal', () => make(64, 64, (c, W, H) => {
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#ffffff';
    c.beginPath();
    // a cherry petal: a rounded shape with a notch at the tip
    c.moveTo(32, 58);
    c.bezierCurveTo(6, 46, 6, 16, 26, 8);
    c.bezierCurveTo(30, 14, 34, 14, 38, 8);
    c.bezierCurveTo(58, 16, 58, 46, 32, 58);
    c.closePath();
    c.fill();
  }));

/** A soft round blob, for canopy cards and distant foliage. */
export const blobTex = (lobes = 6) =>
  cached('blob' + lobes, () => make(128, 128, (c, W, H) => {
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#ffffff';
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2;
      const r = 26 + ((i * 37) % 11);
      c.beginPath();
      c.arc(64 + Math.cos(a) * 26, 64 + Math.sin(a) * 26, r, 0, Math.PI * 2);
      c.fill();
    }
    c.beginPath();
    c.arc(64, 64, 36, 0, Math.PI * 2);
    c.fill();
  }));

/** A flat cloud puff for the sky. */
export const cloudTex = () =>
  cached('cloud', () => make(256, 128, (c, W, H) => {
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#ffffff';
    const puffs = [
      [60, 78, 34], [104, 62, 44], [152, 70, 38], [196, 82, 28], [30, 88, 24],
    ];
    for (const [x, y, r] of puffs) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    c.fillRect(30, 78, 172, 26);
    // soften the bottom edge so it does not read as a cut-out
    const g = c.createLinearGradient(0, 84, 0, 116);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalCompositeOperation = 'destination-in';
    c.fillStyle = 'rgba(255,255,255,1)';
    c.fillRect(0, 0, W, 84);
    c.fillStyle = g;
    c.fillRect(0, 84, W, 44);
    c.globalCompositeOperation = 'source-over';
  }));

/** Shop interior backdrop -- what you see through the glass, kept very dark. */
export const interiorTex = (kind = 'shop') =>
  cached('interior' + kind, () => make(256, 256, (c, W, H) => {
    c.fillStyle = hex(PAL.shopInterior);
    c.fillRect(0, 0, W, H);
    // a back wall with shelving, suggested rather than drawn
    c.fillStyle = hex(mixHex(PAL.shopInterior, 0x000000, 0.35));
    c.fillRect(0, 0, W, H * 0.28);
    c.fillStyle = hex(mixHex(PAL.shopInterior, PAL.shopInteriorLit, 0.5));
    for (let i = 0; i < 4; i++) {
      c.fillRect(W * 0.08, H * (0.34 + i * 0.15), W * 0.84, H * 0.026);
    }
    if (kind === 'ceramic') {
      for (let i = 0; i < 14; i++) {
        const x = W * (0.12 + (i % 5) * 0.19);
        const y = H * (0.32 + Math.floor(i / 5) * 0.15);
        c.fillStyle = hex(mixHex(PAL.ceramicWhite, PAL.ceramicBlue, (i % 3) * 0.3));
        c.beginPath();
        c.arc(x, y, W * 0.035, 0, Math.PI * 2);
        c.fill();
      }
    } else if (kind === 'tea') {
      for (let i = 0; i < 10; i++) {
        const x = W * (0.14 + (i % 5) * 0.18);
        const y = H * (0.38 + Math.floor(i / 5) * 0.15);
        c.fillStyle = hex(mixHex(0x3a4a3a, PAL.matchaDeep, (i % 2) * 0.4));
        c.fillRect(x - W * 0.03, y - H * 0.05, W * 0.06, H * 0.05);
      }
    }
    // a warm glow low down, so a lit interior reads at dusk
    const g = c.createRadialGradient(W * 0.5, H * 0.62, 0, W * 0.5, H * 0.62, W * 0.5);
    g.addColorStop(0, 'rgba(210,170,110,0.34)');
    g.addColorStop(1, 'rgba(210,170,110,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }));
