import { corridor, heightAt } from './terrain.js';
import { rngKit, lerp, clamp } from '../core/util.js';

/* ------------------------------------------------------------------ *
 * Plot layout.
 *
 * Every district that lines a street with buildings uses this.  Given a street
 * id and a stretch of it, it walks the frontage and hands back a list of plots
 * -- position, facing, frontage width, and the ground height at the facade --
 * so a district builder only has to decide *what* goes on each plot, never
 * where the plot is.
 *
 * ----------------------------------------------------------- THE KEN GRID
 *
 * Frontages are snapped to the 京間 ken (1.97 m), because that is how the real
 * buildings are dimensioned and because a street of buildings whose widths are
 * all multiples of one module has a *rhythm* -- the posts line up across the
 * gaps between buildings, and a row of six machiya reads as one wall with a
 * beat rather than as six unrelated objects.  It is the single cheapest thing
 * you can do to make a procedural street look authored.
 *
 * Kyoto machiya frontages run 2-5 ken, with 3 (5.91 m) the commonest, and a
 * corner or a grander ochaya taking 5-7.  The distribution here is weighted to
 * match, and the *sequence* is deliberately not random: a very wide plot is
 * followed by narrow ones, so the street has phrases rather than noise.
 *
 * ------------------------------------------------------------ THE SLOPE
 *
 * Nothing here is flat.  Each plot reports `y` (the ground at its facade
 * centre) and `yLow`/`yHigh` (the ground at its two ends), and the builder is
 * expected to seat the building on the *low* corner and let a plinth take up
 * the difference -- which is exactly what the real buildings on Sannenzaka do,
 * and why that street has a visible stepped line of stone bases running up it.
 * ------------------------------------------------------------------ */

export const KEN = 1.97;

/** Frontage widths, in ken, weighted the way a Kyoto street actually runs. */
const FRONTAGE_MIX = {
  machiya:  [[2, 0.10], [2.5, 0.14], [3, 0.30], [3.5, 0.18], [4, 0.16], [5, 0.09], [6, 0.03]],
  shop:     [[1.5, 0.10], [2, 0.26], [2.5, 0.24], [3, 0.24], [3.5, 0.10], [4, 0.06]],
  ochaya:   [[3, 0.22], [4, 0.30], [5, 0.28], [6, 0.14], [7, 0.06]],
  temple:   [[6, 0.4], [8, 0.35], [10, 0.25]],
};

function pickFrontage(rng, mix, prev) {
  const table = FRONTAGE_MIX[mix] || FRONTAGE_MIX.machiya;
  /* After anything 5 ken or wider, bias hard toward narrow.  This is what
   * turns a random sequence into a rhythm: wide, narrow, narrow, medium. */
  const wide = prev >= 5;
  let r = rng.next();
  let acc = 0;
  for (const [ken, p] of table) {
    const w = wide && ken >= 4 ? p * 0.25 : p;
    acc += w;
    if (r <= acc) return ken;
  }
  return 3;
}

/**
 * Walk a street's frontage and lay out plots.
 *
 * ```js
 * const plots = layoutPlots({
 *   street: 'hanamikoji',
 *   side: -1,              // -1 = left of travel, +1 = right
 *   from: 0.05, to: 0.95,  // fractions of arc length
 *   mix: 'ochaya',
 *   gap: 0.06,             // metres between neighbours (party walls: near zero)
 *   setback: 0,            // extra metres back from the frontage line
 *   seed: 12,
 *   skip: [[0.4, 0.5]],    // fractions to leave empty (a side street, a gate)
 * });
 * ```
 *
 * Each plot is:
 * ```js
 * { x, z,        // the CENTRE OF THE FACADE, on the frontage line
 *   ry,          // rotation so the facade faces the street
 *   width, ken,  // frontage
 *   y,           // ground at the facade centre
 *   yLow, yHigh, // ground at the two ends of the facade
 *   s, t,        // arc length and fraction along the street
 *   side, index, back:{x,z} }  // `back` is a point 1 m behind the facade
 * ```
 */
export function layoutPlots({
  street, side = -1, from = 0, to = 1, mix = 'machiya',
  gap = 0.05, setback = 0, seed = 1, skip = [], minWidth = 0, maxCount = 999,
}) {
  const c = corridor(street);
  if (!c) {
    console.warn(`[plots] no corridor "${street}"`);
    return [];
  }
  const rng = rngKit(seed * 7919 + (side > 0 ? 131 : 0));
  const total = c.length;
  const s0 = from * total, s1 = to * total;
  const offset = c.frontage + setback;

  const plots = [];
  let s = s0;
  let prevKen = 3;
  let index = 0;

  while (s < s1 && plots.length < maxCount) {
    const ken = pickFrontage(rng, mix, prevKen);
    const width = ken * KEN;
    if (s + width > s1) break;
    const mid = s + width / 2;
    const frac = mid / total;

    const skipped = skip.some(([a, b]) => frac >= a && frac <= b);
    if (skipped) { s += width + gap; continue; }
    if (width < minWidth) { s += width + gap; continue; }

    const p = c.pointAt(mid);
    const nx = -p.tz * side, nz = p.tx * side;
    const fx = p.x + nx * offset;
    const fz = p.z + nz * offset;

    /* The yaw that makes the facade face the street.
     *
     * `(nx, nz)` is the OUTWARD normal -- it points from the street toward the
     * plot.  The facade has to look back the other way, along `(-nx, -nz)`.
     * The kit's convention is that `ry = 0` puts the facade normal at
     * `(0, 0, -1)`; a rotation of `ry` about Y takes that to
     * `(-sin ry, 0, -cos ry)`.  Setting that equal to `(-nx, -nz)` gives
     * `sin ry = nx`, `cos ry = nz`, so:
     *
     *     ry = atan2(nx, nz)
     *
     * The obvious-looking `atan2(-nx, -nz)` is this plus pi, and it is wrong in
     * the way that is hardest to spot from code and instant from a render: the
     * facades face away from the street and every building's *body* extends out
     * over the carriageway, so the first thing you see is the inside of a wall
     * with the camera embedded in it. */
    const ry = Math.atan2(nx, nz);

    const a = c.pointAt(Math.max(0, mid - width / 2));
    const b = c.pointAt(Math.min(total, mid + width / 2));
    const ax = a.x + (-a.tz * side) * offset, az = a.z + (a.tx * side) * offset;
    const bx = b.x + (-b.tz * side) * offset, bz = b.z + (b.tx * side) * offset;
    const yA = heightAt(ax, az), yB = heightAt(bx, bz);

    plots.push({
      x: fx, z: fz, ry, width, ken,
      y: heightAt(fx, fz),
      yLow: Math.min(yA, yB), yHigh: Math.max(yA, yB),
      s: mid, t: frac, side, index: index++,
      back: { x: fx + nx * 1.0, z: fz + nz * 1.0 },
      /* The street centre opposite this plot -- what a shop's clutter, its
       * noren and its A-board are positioned relative to. */
      street: { x: p.x, z: p.z, y: p.y, tx: p.tx, tz: p.tz, nx, nz },
    });
    prevKen = ken;
    s += width + gap;
  }
  return plots;
}

/**
 * Points along a street at a spacing, for anything that runs *with* the street
 * rather than facing it: lanterns, poles, planters, wall panels, a run of
 * fence.  Returns `{ x, z, y, ry, s, t, nx, nz }` on the frontage line.
 */
export function alongStreet({
  street, side = -1, from = 0, to = 1, spacing = 6, offset = null,
  jitter = 0, seed = 3,
}) {
  const c = corridor(street);
  if (!c) return [];
  const rng = rngKit(seed * 104729);
  const total = c.length;
  const s0 = from * total, s1 = to * total;
  const off = offset === null ? c.frontage - 0.35 : offset;
  const out = [];
  for (let s = s0; s <= s1; s += spacing) {
    const ss = clamp(s + (jitter ? (rng.next() - 0.5) * jitter : 0), 0, total);
    const p = c.pointAt(ss);
    const nx = -p.tz * side, nz = p.tx * side;
    const x = p.x + nx * off, z = p.z + nz * off;
    out.push({
      // same convention as layoutPlots: faces back toward the street
      x, z, y: heightAt(x, z), ry: Math.atan2(nx, nz),
      s: ss, t: ss / total, nx, nz, tx: p.tx, tz: p.tz, side,
    });
  }
  return out;
}

/**
 * A point on a street by fraction, with its frame.  For placing one specific
 * thing -- a gate, a bridge, a landmark -- at a known place along a street.
 */
export function atStreet(street, t, { side = 0, offset = 0 } = {}) {
  const c = corridor(street);
  if (!c) return null;
  const p = c.pointAt(clamp(t, 0, 1) * c.length);
  const nx = -p.tz * side, nz = p.tx * side;
  const x = p.x + nx * offset, z = p.z + nz * offset;
  return {
    x, z, y: heightAt(x, z),
    ry: side ? Math.atan2(nx, nz) : Math.atan2(-p.tx, -p.tz),
    tx: p.tx, tz: p.tz, nx, nz, s: p.s,
    /** yaw that faces along the street, in the direction of increasing s */
    along: Math.atan2(-p.tx, -p.tz),
    /** yaw that faces back across the street from the `side` frontage */
    across: Math.atan2(nx, nz),
  };
}

/**
 * Register the collision and the terrace for a row of plots in one call.
 *
 * A row of party-walled townhouses is one continuous wall from the street's
 * point of view, and collided as one box per plot rather than per element.
 * `depth` is how far back the building goes.
 */
export function collidePlots(ctx, plots, depth = 9, top) {
  for (const p of plots) {
    const nx = p.street.nx, nz = p.street.nz;
    const cx = p.x + nx * depth * 0.5;
    const cz = p.z + nz * depth * 0.5;
    ctx.collideRot(cx, cz, p.width, depth, p.ry, top);
  }
}
