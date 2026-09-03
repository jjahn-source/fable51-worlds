import { buildStreets, buildCanal, cutCanal } from './streets.js';

/* The base layer: paving, kerbs, gutters, step nosings, the canal.  Runs first,
 * because every district that seats a prop needs the surfaces to exist. */
export const id = 'base';

/* The canal's channel is a cut in the height field, so it has to be registered
 * before the ground mesh is generated -- otherwise the Shirakawa runs along the
 * bottom of a trench the drawn hillside knows nothing about. */
export function terrain(ctx) { cutCanal(ctx); }

export function build(ctx) {
  const streets = buildStreets(ctx);
  const canal = buildCanal(ctx);
  return { streets, canal };
}
