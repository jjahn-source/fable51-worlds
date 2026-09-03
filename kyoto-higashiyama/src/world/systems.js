import { buildVegetation } from './vegetation.js';
import { buildProps } from './props.js';
import { buildPetals, buildFallenPatches, driftsFromTrees } from './petals.js';
import { nearestCorridorDist } from './terrain.js';
import { mulberry32 } from '../core/util.js';

/* ------------------------------------------------------------------ *
 * The central batchers.
 *
 * These run once, after every district has built, and they are the reason a
 * world with a couple of thousand trees and three thousand props costs a few
 * dozen draw calls instead of a few thousand.
 *
 * A district never builds a tree or a repeated prop itself.  It calls
 * `ctx.tree({ kind, x, z, ... })` and `ctx.prop({ kind, x, z, ... })` during
 * its own build; those specs accumulate in one list, and the modules below turn
 * each list into merged geometry and instanced meshes.
 *
 * Order matters here too:
 *
 *   1. vegetation -- needs the districts' tree specs, and nothing else
 *   2. petals     -- the fallen drifts are placed FROM the tree list, so the
 *                    trees have to be resolved first
 *   3. props      -- last, because a prop is seated on `groundAt` and by this
 *                    point every platform, cut and terrace in the world is
 *                    registered
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Thinning the far forest.
 *
 * Vegetation is by a wide margin the most expensive thing in the world: at
 * ~2 100 trees it was 4.7 M triangles, more than half the frame, and because
 * canopies are instanced it is 4.7 M whether you can see them or not -- an
 * `InstancedMesh` has one bounding volume, so the frustum cannot help.
 *
 * About half of those trees are the Higashiyama slope behind Kiyomizu-dera,
 * and **their entire job is to be a mass with a lit edge, read at 50 to 200 m
 * through haze.**  Nothing out there is ever looked at as a tree.  So the
 * further a tree is from any street the player can stand on, the more likely
 * it is to be dropped -- and the survivors are scaled up a little, so the
 * canopy the slope presents stays about the same while the count falls.
 *
 * This is done centrally rather than in the hillside builder because it is a
 * *budget* decision, not a design one: a district should say where its forest
 * is, and the frame budget should decide how much of it gets built.
 * ------------------------------------------------------------------ */

/** Beyond this distance from a street, thinning starts. */
const KEEP_NEAR = 55;
/** By this distance, only `FAR_KEEP` of the trees survive. */
const KEEP_FAR = 190;
const FAR_KEEP = 0.34;

function thinFarForest(trees) {
  const rand = mulberry32(0x5eed);
  const kept = [];
  let dropped = 0;
  for (const t of trees) {
    /* Anything a district marked as a hero, and anything with an explicit
     * `keep`, is never thinned -- those are placed for a reason. */
    if (t.hero || t.keep) { kept.push(t); continue; }
    const d = nearestCorridorDist(t.x, t.z, KEEP_FAR + 10);
    if (d <= KEEP_NEAR) { kept.push(t); continue; }
    const f = Math.min(1, (d - KEEP_NEAR) / (KEEP_FAR - KEEP_NEAR));
    const keepP = 1 - (1 - FAR_KEEP) * f;
    if (rand() < keepP) {
      // grow the survivors to cover for the ones that went
      kept.push({ ...t, scale: (t.scale ?? 1) * (1 + 0.30 * f) });
    } else {
      dropped++;
    }
  }
  if (dropped) {
    console.log(`[vegetation] thinned ${dropped} distant trees of ${trees.length} ` +
                `(kept ${kept.length})`);
  }
  return kept;
}

export const vegetation = {
  id: 'vegetation',
  build(ctx, bag) {
    const thinned = thinFarForest(bag.trees);
    /* Hand the thinned list back to the bag so `petals` derives its drifts
     * from the trees that actually exist, and `world.trees` reports the truth. */
    bag.trees.length = 0;
    bag.trees.push(...thinned);
    return buildVegetation(ctx, thinned);
  },
};

export const petals = {
  id: 'petals',
  build(ctx, { trees }) {
    /* Falling petals follow the player, so they are always near and never far.
     * The fallen drifts are derived from where the blossom actually is --
     * gutters and wall bases under the cherry trees -- which is both correct
     * and free: it costs one pass over a list that already exists. */
    const falling = buildPetals(ctx);
    const drifts = driftsFromTrees(trees);
    const fallen = buildFallenPatches(ctx, drifts);
    return { falling, fallen };
  },
};

export const props = {
  id: 'props',
  build(ctx, { props: list }) {
    return buildProps(ctx, list);
  },
};

export const SYSTEM_MODULES = [vegetation, petals, props];
