import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { cel, TINT } from '../core/toon.js';
import { Baker, rngKit, shadowify, mergeByMaterial } from '../core/util.js';
import { BOUNDS, STREETS, LANDMARK, DISTRICTS, districtAt } from '../data/route.js';
import {
  initTerrain, heightAt, surfaceAt, normalAt, slopeAt, buildGround,
  addPlatform, addCut, addCorridor, corridor, allCorridors, clearTerrain,
} from './terrain.js';

/* ------------------------------------------------------------------ *
 * World assembly.
 *
 * The build order matters and is not arbitrary:
 *
 *   0. terrain hooks -- every district that reshapes the ground does it here,
 *                      via an optional `terrain(ctx)` export, BEFORE the ground
 *                      mesh exists
 *   1. the ground   -- the drawn hillside, built from the finished height field
 *   2. structures   -- the districts proper
 *   3. structures   -- buildings, walls, gates: these define the collision
 *   4. surfaces     -- the street paving, which is laid over the terrain and
 *                      needs to know where the buildings' thresholds are
 *   5. vegetation   -- collected from every district and batched centrally
 *   6. props        -- seated with `groundAt`, so everything above must be done
 *   7. bake         -- every district's baker is flushed
 *
 * A builder that seats a prop before the platform under it is registered puts
 * the prop underground, and nothing will tell you: it looks like the prop was
 * never added.
 * ------------------------------------------------------------------ */

export function buildWorld(scene, opts = {}) {
  const root = new THREE.Group();
  root.name = 'world';
  scene.add(root);

  initTerrain();

  const colliders = [];
  const interactables = [];
  const updaters = [];
  const bakers = new Map();
  /** Vegetation and props are collected here and batched once, centrally. */
  const trees = [];
  const props = [];
  const lights = [];
  const stats = { buildings: 0, shopfronts: 0, landmarks: 0, districts: 0 };

  const groundMaterial = cel({
    color: 0xffffff, vertexColors: true, bands: 3, tint: TINT.cool, flat: false,
  });

  const ctx = {
    scene,
    root,
    PAL,
    colliders,
    interactables,
    groundMaterial,
    stats,

    add(obj) { root.add(obj); return obj; },

    /**
     * An axis-aligned box the player cannot walk through.
     *
     * Remember that the walker's 0.34 m radius is added to every side: a
     * doorway needs 1.8 m of clear width to feel like a doorway, and two
     * colliders 0.7 m apart are a wall.
     *
     * `top` lets a walker step over something low; `bottom` lets them walk
     * under something high.  Leave both undefined for an ordinary wall.
     */
    collide(x0, z0, x1, z1, top, bottom) {
      colliders.push({
        x0: Math.min(x0, x1), x1: Math.max(x0, x1),
        z0: Math.min(z0, z1), z1: Math.max(z0, z1),
        top, bottom,
      });
    },

    /**
     * A collider for a rotated footprint.
     *
     * Collision is axis-aligned, so a rotated box has to be approximated.  The
     * obvious approximation -- one AABB around the whole thing -- is fine for a
     * roughly square building and **catastrophic for a long thin one**, which
     * is exactly what a shopfront strip is.
     *
     * A 13.8 m wide, 0.45 m deep frontage rotated only 8 degrees off axis has an
     * AABB 2.24 m deep.  That is 1.8 m of solid, invisible wall standing in the
     * carriageway, and with sixty buildings down a 5.8 m street the result is a
     * street you cannot walk down at all -- which is what happened, and what the
     * walkthrough caught: the player made 30 m from spawn and then stopped, with
     * nothing on screen to suggest why.
     *
     * So a long box is split along its length into segments short enough that
     * each one's AABB is nearly tight.  At a 1.5 m segment and an 8 degree
     * rotation the error is 0.21 m instead of 1.8 m.
     */
    collideRot(cx, cz, w, d, ry, top, bottom) {
      const cos = Math.cos(ry), sin = Math.sin(ry);
      const long = Math.max(w, d), short = Math.min(w, d);
      // a chunky footprint approximates fine in one box
      if (long < 2.2 || short / long > 0.55) {
        const ac = Math.abs(cos), as = Math.abs(sin);
        const hw = (w * ac + d * as) / 2;
        const hd = (w * as + d * ac) / 2;
        ctx.collide(cx - hw, cz - hd, cx + hw, cz + hd, top, bottom);
        return;
      }
      const n = Math.min(24, Math.max(2, Math.ceil(long / 1.5)));
      const alongW = w >= d;
      // unit vector along the box's long axis, in world space
      const ux = alongW ? cos : -sin;
      const uz = alongW ? -sin : -cos;
      const seg = long / n;
      const halfSeg = seg / 2;
      const ac = Math.abs(cos), as = Math.abs(sin);
      const sw = alongW ? seg : short, sd = alongW ? short : seg;
      const hw = (sw * ac + sd * as) / 2;
      const hd = (sw * as + sd * ac) / 2;
      for (let i = 0; i < n; i++) {
        const t = -long / 2 + halfSeg + i * seg;
        const px = cx + ux * t, pz = cz + uz * t;
        ctx.collide(px - hw, pz - hd, px + hw, pz + hd, top, bottom);
      }
    },

    platform: addPlatform,
    cut: addCut,
    corridor: addCorridor,
    getCorridor: corridor,

    /** The ground height, all platforms and cuts applied.  Seat props on this. */
    groundAt(x, z) { return heightAt(x, z); },
    heightAt,
    surfaceAt,
    normalAt,
    slopeAt,

    interact(i) { interactables.push(i); return i; },
    update(fn) { updaters.push(fn); return fn; },

    /** One baker per district -- see the note in `util.js`. */
    baker(name) {
      if (!bakers.has(name)) bakers.set(name, new Baker(name));
      return bakers.get(name);
    },

    /** Register a tree for the central vegetation batcher. */
    tree(spec) { trees.push(spec); return spec; },
    /** Register a prop for the central prop batcher. */
    prop(spec) { props.push(spec); return spec; },
    /** A point light for dusk.  Collected so the count can be capped. */
    light(spec) { lights.push(spec); return spec; },

    rng: rngKit,
    LANDMARK,
    STREETS,
  };

  /* ----------------------- 0. the terrain hooks -------------------------- */
  /* A district that reshapes the ground -- Kiyomizu-dera carves a ravine 13 m
   * deep under its stage, the canal cuts its channel, a temple terraces its
   * precinct -- must do it **before the ground mesh is generated**.
   *
   * The first version of this file built the ground first and the districts
   * second, and the consequence was invisible in every screenshot that did not
   * happen to look at the right hillside: `ctx.cut` reached the *height field*,
   * so the player walked at the right level, but never reached the *drawn*
   * ground, which was still the un-carved profile.  At Kiyomizu that put the
   * visible hillside five metres above the stage deck it is supposed to fall
   * away beneath.  Found by the temple builder, who could see it and could not
   * fix it from their own files. */
  for (const mod of opts.districts || []) {
    if (typeof mod.terrain !== 'function') continue;
    try {
      mod.terrain(ctx);
    } catch (e) {
      console.error(`[world] terrain hook "${mod.id}" failed:`, e);
    }
  }

  /* --------------------------- 1. the ground ---------------------------- */
  const ground = buildGround(ctx);
  root.add(ground);

  /* -------------------------- 2. the districts -------------------------- */
  const built = [];
  for (const mod of opts.districts || []) {
    try {
      const r = mod.build(ctx);
      built.push({ id: mod.id, result: r });
      stats.districts++;
    } catch (e) {
      // A district that throws must not take the world with it: the rest of
      // the route is still walkable and the failure is visible as a hole.
      console.error(`[world] district "${mod.id}" failed:`, e);
    }
  }

  /* --------------------- 3. the central batchers ------------------------- */
  /* Vegetation and props are collected from every district and built once, so
   * a few hundred trees and a few thousand props cost a handful of draw calls
   * rather than a few thousand.  They run here, after every district has had a
   * chance to register, and before the bakers are flushed -- because they draw
   * into bakers of their own. */
  for (const sys of opts.systems || []) {
    try {
      sys.build(ctx, { trees, props, lights });
    } catch (e) {
      console.error(`[world] system "${sys.id}" failed:`, e);
    }
  }

  /* ---------------------------- 4. flush bakers -------------------------- */
  let bakedTris = 0;
  for (const b of bakers.values()) {
    bakedTris += b.triangles;
    root.add(b.build());
  }

  /* ------------------- 5. wire the props' interactions -------------------- */
  /* `props` is a system, so it runs after every district and a district cannot
   * see its hooks during its own build.  The prop kit therefore *offers* them --
   * a bicycle bell, a vending machine, a sleeping cat, a half-raised shutter, a
   * sliding door -- already in the shape `ctx.interact` takes, and leaves the
   * registering to whoever knows how many the world should have.
   *
   * That is here, and the reason it is capped is the prompt: an interaction on
   * every one of 145 hooks would put a prompt in front of the player every few
   * metres, which is the "quest markers everywhere" failure the brief is
   * explicit about avoiding.  So the hooks are thinned to a sensible spread --
   * every distinct kind survives, and beyond that they are taken at intervals. */
  if (ctx.propHooks && ctx.propHooks.length) {
    const seenKind = new Set();
    let taken = 0;
    ctx.propHooks.forEach((h, i) => {
      const first = !seenKind.has(h.kind);
      if (first) seenKind.add(h.kind);
      // every kind at least once, then roughly one in five of the rest
      if (!first && i % 5 !== 0) return;
      interactables.push(h);
      taken++;
    });
    stats.propInteractions = taken;
  }

  /* ------------------- 6. merge what the baker could not ------------------ */
  /* Textured meshes -- signs, noren, fascias, lantern faces -- cannot go
   * through the vertex-colour baker because it strips uv.  They already share
   * materials via `celTex`; this merges the static ones so that sharing turns
   * into shared draw calls too.  See the note in `util.js`. */
  const mergeStats = mergeByMaterial(root);

  /* ------------------------------ the API ------------------------------- */
  const world = {
    root,
    colliders,
    interactables,
    bounds: BOUNDS,
    heightAt,
    surfaceAt,
    normalAt,
    districtAt,
    /* The live corridor list.
     *
     * QA tools must read this rather than `import`ing `terrain.js` themselves:
     * Vite serves a module with a `?t=` cache-busting query after any hot
     * update, so a dynamic import from the page can resolve to a SECOND
     * instance of the module with its own empty `corridors` array.  The symptom
     * is a tool that cheerfully reports "0 waypoints over 16 legs" and then
     * fails on undefined, with nothing wrong in the world at all. */
    corridors: allCorridors(),
    stats: { ...stats, bakedTriangles: bakedTris, colliders: colliders.length,
             interactables: interactables.length, trees: trees.length, props: props.length,
             mergedMeshes: mergeStats.merged, drawCallsSaved: mergeStats.saved },
    trees,
    props,
    lights,
    built,
    update(dt, t) {
      for (let i = 0; i < updaters.length; i++) updaters[i](dt, t);
    },
  };

  shadowify(root, true, true);
  return world;
}

export { clearTerrain, allCorridors };
