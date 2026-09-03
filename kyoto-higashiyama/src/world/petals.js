import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { flat, celTex } from '../core/toon.js';
import { petalTex } from '../core/textures.js';
import { Baker, rngKit, clamp, lerp, TAU } from '../core/util.js';

/* ------------------------------------------------------------------ *
 * 花吹雪 -- falling petals, and the ones that have already landed.
 *
 * Two systems, and the second is the one people underestimate.
 *
 * ------------------------------------------------------------- FALLING
 *
 * A few hundred petals in a box that **follows the player**, wrapped
 * toroidally, so it is always snowing petals within twenty metres of you and
 * never anywhere else.  Three `InstancedMesh`es, one per tone, driven by a
 * plain typed-array particle system: no per-petal object, no allocation in the
 * loop, three draw calls for the whole sky.
 *
 * The motion is the entire risk here.  Petals that fall straight down at a
 * constant rate read as rain; petals that whirl read as a video-game particle
 * effect, and this world's rule is that nothing bounces, spins or pulses.  A
 * cherry petal is a 15 mm aerofoil: it descends at roughly 0.3-0.6 m/s and it
 * *flutters* -- a large slow lateral wave with a small fast one on top of it,
 * and a slow tumble about its own long axis.  Two sine terms per axis at
 * incommensurate frequencies is enough, and it is the ratio between them that
 * reads as air rather than as noise.
 *
 * They are unlit (`flat`) and pale on purpose.  A lit petal picks up the
 * shadow ramp, and a petal that goes grey when it drifts into an eave's shadow
 * is a petal that disappears -- against a plaster wall, against the sky and
 * against the paving, which is everywhere it can be.
 *
 * -------------------------------------------------------------- FALLEN
 *
 * Drifts of petals that have already come down: in the gutter, along the foot
 * of a wall, in the inside corner of a flight of steps, in the lee of a
 * planter.  They are baked, static, lie flat on the height field, and they are
 * one of the strongest "it is April in Kyoto" signals available anywhere in
 * the project -- a pale pink line running down a granite gutter is instantly
 * legible and costs two draw calls for the whole route.
 *
 * Each drift is a *drape*: every vertex is seated on `ctx.groundAt` at its own
 * xz, so it follows the camber of the street and the treads of a stair
 * instead of hovering over them.  The mass of it is a soft-edged mat on the
 * high-key ramp; a scatter of individual petal quads round its rim breaks the
 * outline so it does not read as a decal.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Falling
 * ------------------------------------------------------------------ */

const _v = new THREE.Vector3();
const _c = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q2 = new THREE.Quaternion();
const _n = new THREE.Vector3();
const _UP = new THREE.Vector3(0, 1, 0);

/**
 * The falling-petal system.
 *
 * @param ctx   the world context (`add`, `update`, `groundAt`)
 * @param opts
 *   `count`     total petals (default 420, split across the tones)
 *   `radius`    half-width of the following box, metres (default 19)
 *   `height`    how far above the follow point petals spawn (default 12)
 *   `below`     how far below it they are recycled (default 3.2)
 *   `size`      petal quad edge, metres (default 0.10 -- life size is 0.015,
 *               but a 15 mm quad at ten metres is a third of a pixel)
 *   `target`    what to follow: an Object3D, a {x,y,z}, or a function
 * @returns `{ group, meshes, update, gust, stats }`
 */
export function buildPetals(ctx, opts = {}) {
  const {
    count = 900,
    radius = 15,
    height = 11,
    below = 2.6,
    /* A somei-yoshino petal is about 15 mm.  This is stylised up -- a 15 mm
     * quad at ten metres is a third of a pixel and the field simply is not
     * there -- but the stylisation is capped in ANGLE rather than in metres,
     * which is the part that matters.  `size` is what a petal measures once it
     * is more than `size / maxAngle` away (2.1 m here); inside that it shrinks
     * so it keeps subtending the same small angle.
     *
     * That cap is the fix for the one real failure this system has: the volume
     * follows the player, so petals are *always* passing within a metre of the
     * eye, and an uncapped 90 mm sprite at 0.6 m covers a fifth of the screen.
     * It read, correctly, as a dinner plate.  Presence comes from count,
     * motion and chroma; never from letting the near ones grow. */
    size = 0.09,
    /* The largest angle a petal may subtend, radians.  0.05 rad is about 3
     * degrees: a petal an arm's length away is a petal, not a plate. */
    maxAngle = 0.042,
    /* The palette's own petal tones, and NOT `blossomLight`.  A near-white
     * petal against a pale April sky, a plaster wall or granite paving is
     * three surfaces out of four it cannot be seen against; the mass on the
     * tree is what carries the high key, and a petal in the air needs enough
     * chroma to be a mark.  `blossomDeep` is the one that makes the field
     * legible at all against the sky. */
    tones = [PAL.petal, PAL.petalDeep, PAL.blossomDeep],
    fall = [0.30, 0.62],
    sway = 0.44,
    seed = 20250401,
    target = null,
    name = 'petals',
    settle = 40,
  } = opts;

  const group = new THREE.Group();
  group.name = name;

  const rng = rngKit(seed >>> 0);
  // narrower than tall, so the sprite reads as a petal and not as a disc
  const geo = new THREE.PlaneGeometry(size * 0.86, size * 1.16);
  const tex = petalTex();

  const per = Math.max(1, Math.floor(count / tones.length));
  const groups = tones.map((tone, gi) => {
    const n = gi === tones.length - 1 ? count - per * (tones.length - 1) : per;
    const mat = flat({
      color: tone,
      map: tex,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
      /* Deliberately low.  `petalTex` is mipmapped, and a mip averages the
       * sprite's alpha down as it shrinks -- at a 20-pixel petal an alphaTest
       * of 0.3 erodes the whole shape away and the field simply vanishes at
       * middle distance.  Blending carries the soft edge instead; the test is
       * only here to stop the empty corners writing anything. */
      alphaTest: 0.10,
      cache: false,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // they are everywhere the player is, so the frustum test can only ever
    // cost something and never save anything
    mesh.frustumCulled = false;
    mesh.renderOrder = 4;
    mesh.name = name + ':' + gi;
    // the ink pass reads the depth buffer; a depth-writing petal would be
    // outlined, and four hundred outlined petals is speckle
    mesh.userData.noOutline = true;
    mesh.userData.noShadow = true;
    Object.defineProperty(mesh, 'castShadow', { get: () => false, set: () => {}, configurable: true });
    Object.defineProperty(mesh, 'receiveShadow', { get: () => false, set: () => {}, configurable: true });
    group.add(mesh);

    return {
      mesh, n,
      x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n),
      ph: new Float32Array(n), fr: new Float32Array(n), vs: new Float32Array(n),
      sp: new Float32Array(n), tw: new Float32Array(n), sc: new Float32Array(n),
    };
  });

  /* ---------------------------- the follow point ------------------------- *
   * `ctx` carries neither the player nor the camera, and `main.js` publishes
   * both only after `buildWorld` returns -- so the follow point is resolved
   * lazily, on the first frame.
   *
   * The authoritative source is the *rendering camera*, picked up in
   * `onBeforeRender` below.  That is not a nicety: the shot harness teleports
   * the player and renders in the same synchronous call, so a field that only
   * re-centres inside the update loop is still sitting around the previous
   * position when the frame is captured, and every shot comes out with no
   * petals in it.  Everything else is a fallback for a context with no camera.
   *
   * Whatever the source, `centre()` returns the EYE, not the feet. */
  const EYE = 1.62;
  let source = null;
  let camEye = null;

  function resolveSource() {
    if (typeof target === 'function') return { fn: target, lift: 0 };
    if (target && target.isObject3D) return { obj: target, lift: 0 };
    if (target && typeof target.x === 'number') return { pt: target, lift: 0 };
    if (ctx.player?.pos) return { pt: ctx.player.pos, lift: EYE };
    if (ctx.camera?.position) return { pt: ctx.camera.position, lift: 0 };
    const g = (typeof window !== 'undefined') ? window.__scene : null;
    if (g?.camera?.position) return { pt: g.camera.position, lift: 0 };
    if (g?.player?.pos) return { pt: g.player.pos, lift: EYE };
    return null;
  }

  function centre() {
    if (camEye) return _c.copy(camEye);
    if (!source) source = resolveSource();
    if (source) {
      const l = source.lift;
      if (source.fn) { const p = source.fn(); if (p) return _c.set(p.x, p.y + l, p.z); }
      else if (source.obj) return _c.set(source.obj.position.x, source.obj.position.y + l, source.obj.position.z);
      else if (source.pt) return _c.set(source.pt.x, source.pt.y + l, source.pt.z);
    }
    return _c.set(0, (ctx.groundAt ? ctx.groundAt(0, 0) : 0) + EYE, 0);
  }

  function scatter(g, i, cx, cy, cz, full) {
    g.x[i] = cx + rng.range(-radius, radius);
    g.z[i] = cz + rng.range(-radius, radius);
    g.y[i] = full ? cy + rng.range(-below, height) : cy + height * rng.range(0.86, 1.0);
    g.ph[i] = rng.range(0, TAU);
    g.fr[i] = rng.range(0.42, 0.86);
    g.vs[i] = rng.range(fall[0], fall[1]);
    g.sp[i] = rng.range(0.5, 1.5) * rng.sign();
    g.tw[i] = rng.range(0, TAU);
    g.sc[i] = rng.range(0.78, 1.30);
  }

  {
    const c = centre();
    for (const g of groups) for (let i = 0; i < g.n; i++) scatter(g, i, c.x, c.y, c.z, true);
  }

  /* A gust: a decaying lateral push, for a train, a door, a turn of wind. */
  let gustX = 0, gustZ = 0;
  function gust(dx, dz, strength = 1) {
    const l = Math.hypot(dx, dz) || 1;
    gustX += (dx / l) * strength;
    gustZ += (dz / l) * strength;
  }

  let lastX = 0, lastZ = 0, primed = false;

  function update(dt, t) {
    lastT = t;
    const c = centre();
    const cx = c.x, cy = c.y, cz = c.z;
    const eyeY = cy;          // `centre()` already returns the eye

    /* A teleport (the shot harness does one before every frame it captures)
     * must not be wrapped one box-width at a time -- re-scatter instead. */
    const jump = primed ? Math.hypot(cx - lastX, cz - lastZ) : Infinity;
    const reset = jump > radius;
    lastX = cx; lastZ = cz; primed = true;

    gustX *= Math.exp(-dt * 1.4);
    gustZ *= Math.exp(-dt * 1.4);
    const gx = gustX, gz = gustZ;
    const D = radius * 2;

    for (const g of groups) {
      const { x, y, z, ph, fr, vs, sp, tw, sc, n, mesh } = g;
      for (let i = 0; i < n; i++) {
        if (reset) { scatter(g, i, cx, cy, cz, true); }
        else {
          y[i] -= vs[i] * dt;
          x[i] += gx * dt * 0.9;
          z[i] += gz * dt * 0.9;
          let dx = x[i] - cx;
          if (dx > radius) x[i] -= D; else if (dx < -radius) x[i] += D;
          let dz = z[i] - cz;
          if (dz > radius) z[i] -= D; else if (dz < -radius) z[i] += D;
          if (y[i] < cy - below) {
            x[i] = cx + rng.range(-radius, radius);
            z[i] = cz + rng.range(-radius, radius);
            y[i] = cy + height * rng.range(0.9, 1.0);
          } else if (y[i] > cy + height + 2) {
            y[i] = cy + height;
          }
        }

        /* the flutter: a large slow wave plus a small fast one.  It is the
         * ratio -- 1 : 2.7 -- that reads as air rather than as a wobble. */
        const p = ph[i], f = fr[i];
        const swx = Math.sin(t * f + p) * sway + Math.sin(t * f * 2.7 + p * 1.7) * sway * 0.34;
        const swz = Math.cos(t * f * 0.83 + p * 1.3) * sway + Math.sin(t * f * 2.3 + p * 2.1) * sway * 0.30;

        const px = x[i] + swx, pz = z[i] + swz;
        const ex = px - cx, ez = pz - cz, ey = y[i] - eyeY;
        /* Clamp the apparent size.  Beyond about two metres this does
         * nothing; inside it, the petal shrinks so it keeps subtending the
         * same small angle instead of ballooning, and the last 0.4 m fades it
         * out entirely so nothing ever sits on the reticle. */
        const near = Math.sqrt(ex * ex + ey * ey + ez * ez);
        const capped = Math.min(sc[i], (near * maxAngle) / size);
        const fade = near < 0.4 ? capped * (near / 0.4) * (near / 0.4) : capped;
        _v.set(px, y[i], pz);
        _e.set(
          tw[i] + t * sp[i] * 0.8,
          p + t * sp[i] * 0.55,
          Math.sin(t * f * 1.6 + p) * 0.7,
          'YXZ'
        );
        _q.setFromEuler(_e);
        _s.setScalar(fade);
        _m.compose(_v, _q, _s);
        mesh.setMatrixAt(i, _m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // settle the field before the first frame, so the opening image already has
  // petals mid-air rather than a curtain arriving from the top of the screen
  let lastT = 0;
  for (let i = 0; i < settle; i++) update(0.1, i * 0.1);

  /* Follow the camera that is actually about to draw us.  This is what makes
   * the field correct in a frame the update loop has not run for -- every
   * captured shot, and the first frame after any teleport. */
  const lead = groups[0].mesh;
  lead.onBeforeRender = (renderer, scene, camera) => {
    if (!camera || !camera.isCamera) return;
    if (!camEye) camEye = new THREE.Vector3();
    camEye.copy(camera.position);
    if (Math.hypot(camEye.x - lastX, camEye.z - lastZ) > radius * 0.9) update(0, lastT);
  };

  if (ctx.add) ctx.add(group); else ctx.scene?.add(group);
  if (ctx.update) ctx.update(update);

  return {
    group,
    meshes: groups.map((g) => g.mesh),
    update,
    gust,
    stats: { petals: count, meshes: groups.length, triangles: count * 2 },
  };
}

/* ------------------------------------------------------------------ *
 * Fallen
 * ------------------------------------------------------------------ */

/**
 * A round drift, draped on the height field.
 * Every rim vertex is seated on `groundAt` at its own xz, so the mat follows a
 * camber, a gutter or a tread instead of hovering across it.
 */
function driftDisc(ctx, cx, cz, r, rng, lift) {
  const pos = [];
  const idx = [];
  const lobes = rng.int(3, 5);
  for (let L = 0; L < lobes; L++) {
    const la = rng.range(0, TAU);
    const ld = L === 0 ? 0 : r * rng.range(0.3, 0.85);
    const lx = cx + Math.cos(la) * ld;
    const lz = cz + Math.sin(la) * ld;
    const lr = r * (L === 0 ? rng.range(0.62, 0.9) : rng.range(0.34, 0.66));
    const n = 11;
    const phase = rng.range(0, TAU);
    const base = pos.length / 3;
    pos.push(lx, ctx.groundAt(lx, lz) + lift, lz);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const rr = lr * (0.76 + 0.30 * (0.5 + 0.5 * Math.sin(a * 2.0 + phase))) * rng.range(0.9, 1.1);
      const x = lx + Math.cos(a) * rr;
      const z = lz + Math.sin(a) * rr;
      pos.push(x, ctx.groundAt(x, z) + lift, z);
    }
    for (let i = 0; i < n; i++) idx.push(base, base + 1 + ((i + 1) % n), base + 1 + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A drift running along a line -- a gutter, the foot of a wall, the inside
 * corner of a stair.  A strip rather than a fan, because a six-metre gutter
 * drift built as a fan is a row of slivers.
 */
function driftRun(ctx, x0, z0, x1, z1, r, rng, lift) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const m = Math.max(2, Math.round(len / 0.7));
  const tx = (x1 - x0) / (len || 1), tz = (z1 - z0) / (len || 1);
  const nx = -tz, nz = tx;
  const pos = [];
  const idx = [];
  const phase = rng.range(0, TAU);
  for (let j = 0; j <= m; j++) {
    const t = j / m;
    const px = lerp(x0, x1, t), pz = lerp(z0, z1, t);
    // taper to nothing at both ends, and wander in width along the run
    const w = r * Math.sin(Math.PI * clamp(t, 0, 1)) ** 0.55 *
      (0.72 + 0.34 * (0.5 + 0.5 * Math.sin(t * 9.3 + phase)));
    const ax = px + nx * w, az = pz + nz * w;
    const bx = px - nx * w * rng.range(0.55, 1.0), bz = pz - nz * w * rng.range(0.55, 1.0);
    pos.push(ax, ctx.groundAt(ax, az) + lift, az);
    pos.push(bx, ctx.groundAt(bx, bz) + lift, bz);
  }
  for (let j = 0; j < m; j++) {
    const a = j * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Drifts of fallen petals.
 *
 * @param ctx      world context
 * @param patches  each is either
 *                   `{ x, z, r, seed, density, tone }`                a pool
 *                   `{ x0, z0, x1, z1, r, seed, density, tone }`      a run
 * @param opts     `{ lift, loose, name, scatterSize }`
 * @returns `{ group, meshes, stats }`
 */
export function buildFallenPatches(ctx, patches = [], opts = {}) {
  const {
    lift = 0.03,
    loose = true,
    loosePerM2 = 46,
    looseMax = 9000,
    scatterSize = 0.075,
    name = 'fallenPetals',
    seed = 913,
  } = opts;

  const group = new THREE.Group();
  group.name = name;
  const stats = { patches: 0, mats: 0, loose: 0, meshes: 0, triangles: 0 };

  if (!patches.length) {
    if (ctx.add) ctx.add(group); else ctx.scene?.add(group);
    return { group, meshes: [], stats };
  }

  /* The mat.  High-key ramp and a pink shadow tint for exactly the same reason
   * the canopies get them: a drift of petals in an eave's shade must stay
   * pink.  `flat: false` because it is a single near-horizontal facet and a
   * flat-shaded one turned a few degrees from the sun goes to the ramp's
   * bottom band across the whole drift at once. */
  const baker = new Baker(name);
  const matOpts = { bands: 'soft', tint: 0xdcbecc, flat: false, shadow: false, receive: false };

  const looseMats = [];
  const looseCols = [];

  for (let pi = 0; pi < patches.length; pi++) {
    const p = patches[pi];
    const rng = rngKit(((p.seed ?? (pi * 2654435761 + seed)) >>> 0) || 1);
    const r = p.r ?? 1.3;
    const isRun = p.x1 !== undefined && p.z1 !== undefined;
    const tone = p.tone ?? rng.pick([PAL.petal, PAL.blossomWarm, PAL.petal, PAL.petalDeep, PAL.blossomShade]);

    let geo, area, cx, cz;
    if (isRun) {
      const x0 = p.x0 ?? p.x, z0 = p.z0 ?? p.z;
      geo = driftRun(ctx, x0, z0, p.x1, p.z1, r, rng, lift);
      area = Math.hypot(p.x1 - x0, p.z1 - z0) * r * 1.1;
      cx = (x0 + p.x1) / 2; cz = (z0 + p.z1) / 2;
    } else {
      geo = driftDisc(ctx, p.x, p.z, r, rng, lift);
      area = Math.PI * r * r * 0.68;
      cx = p.x; cz = p.z;
    }
    baker.add(geo, null, tone, matOpts);
    geo.dispose();
    stats.mats++;

    /* Loose petals round the rim.  The mat carries the mass; these break its
     * edge, which is the difference between a drift and a sticker. */
    if (loose && looseMats.length < looseMax) {
      const n = Math.min(220, Math.round(area * loosePerM2 * (p.density ?? 1)));
      for (let i = 0; i < n && looseMats.length < looseMax; i++) {
        let x, z;
        if (isRun) {
          const t = rng.next();
          x = lerp(p.x0 ?? p.x, p.x1, t) + rng.gauss() * r * 1.5;
          z = lerp(p.z0 ?? p.z, p.z1, t) + rng.gauss() * r * 1.5;
        } else {
          const a = rng.range(0, TAU);
          const d = r * (0.55 + Math.sqrt(rng.next()) * 0.85);
          x = cx + Math.cos(a) * d;
          z = cz + Math.sin(a) * d;
        }
        const y = ctx.groundAt(x, z) + lift + 0.006;
        // lie flat ON the slope, not flat in the world
        if (ctx.normalAt) { _n.copy(ctx.normalAt(x, z)); _q.setFromUnitVectors(_UP, _n); }
        else _q.identity();
        _e.set(rng.range(-0.34, 0.34), rng.range(0, TAU), rng.range(-0.34, 0.34), 'YXZ');
        _q2.setFromEuler(_e);
        _q.multiply(_q2);
        _v.set(x, y, z);
        _s.setScalar(rng.range(0.7, 1.4));
        looseMats.push(new THREE.Matrix4().compose(_v, _q, _s));
        looseCols.push(rng.chance(0.32) ? PAL.petalDeep : PAL.petal);
      }
    }
    stats.patches++;
  }

  const meshes = [];
  const matTris = baker.triangles;
  const baked = baker.build();
  for (const m of baked.children) {
    m.name = name + ':mat';
    m.userData.noShadow = true;
    /* Neither cast nor receive, and `shadowify` must not be able to undo it.
     * A ramp only shapes DIRECT light, so a drift half-covered by a tree's
     * shadow falls to flat ambient over that half -- a pale pink film with a
     * lavender half is a puddle, which is the one thing it must not be. */
    Object.defineProperty(m, 'castShadow', { get: () => false, set: () => {}, configurable: true });
    Object.defineProperty(m, 'receiveShadow', { get: () => false, set: () => {}, configurable: true });
    meshes.push(m);
  }
  group.add(baked);

  if (looseMats.length) {
    const g = new THREE.PlaneGeometry(scatterSize, scatterSize * 1.08);
    g.rotateX(-Math.PI / 2);
    const mat = celTex(petalTex(), {
      color: 0xffffff,
      bands: 'soft',
      tint: 0xd0b4c8,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.10,
      depthWrite: false,
      flat: false,
    });
    const inst = new THREE.InstancedMesh(g, mat, looseMats.length);
    const col = new THREE.Color();
    for (let i = 0; i < looseMats.length; i++) {
      inst.setMatrixAt(i, looseMats[i]);
      col.set(looseCols[i]);
      inst.setColorAt(i, col);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.name = name + ':loose';
    inst.userData.noShadow = true;
    inst.userData.noOutline = true;
    Object.defineProperty(inst, 'castShadow', { get: () => false, set: () => {}, configurable: true });
    Object.defineProperty(inst, 'receiveShadow', { get: () => false, set: () => {}, configurable: true });
    inst.computeBoundingSphere();
    group.add(inst);
    meshes.push(inst);
    stats.loose = looseMats.length;
  }

  stats.meshes = meshes.length;
  stats.triangles = Math.round(matTris + stats.loose * 2);

  if (ctx.add) ctx.add(group); else ctx.scene?.add(group);
  return { group, meshes, stats };
}

/* ------------------------------------------------------------------ *
 * Convenience: drifts derived from the trees themselves
 * ------------------------------------------------------------------ */

/**
 * Petal drifts under the cherry trees, without a district having to place
 * them by hand.  A real drift does not sit symmetrically under the tree: it
 * collects downwind and against whatever stopped it, so these are offset in a
 * consistent direction and thrown a little wide of the trunk.
 *
 * Pass the same `world.trees` array the vegetation batcher gets.
 *
 * @returns a `patches` array for `buildFallenPatches`
 */
export function driftsFromTrees(trees = [], opts = {}) {
  const {
    kinds = ['sakura', 'shidare'],
    wind = -0.5,           // radians: the direction drifts collect toward
    perTree = 3,
    seed = 4487,
    minScale = 0,
  } = opts;
  const set = new Set(kinds);
  const out = [];
  const wx = Math.cos(wind), wz = Math.sin(wind);
  let k = 0;
  for (const t of trees) {
    if (!set.has(t.kind)) continue;
    if ((t.scale ?? 1) < minScale) continue;
    const rng = rngKit(((t.seed ?? (k * 2654435761 + seed)) ^ 0x5f3a) >>> 0 || 1);
    k++;
    const S = t.scale ?? 1;
    const n = typeof perTree === 'function' ? perTree(t) : perTree;
    for (let i = 0; i < n; i++) {
      const spread = rng.range(1.2, 3.4) * S;
      const a = rng.range(0, TAU);
      out.push({
        x: t.x + wx * spread * 0.7 + Math.cos(a) * spread * 0.6,
        z: t.z + wz * spread * 0.7 + Math.sin(a) * spread * 0.6,
        r: rng.range(0.45, 1.25) * S,
        seed: (rng.next() * 0xffffffff) >>> 0,
        density: rng.range(0.7, 1.2),
      });
    }
  }
  return out;
}

export default buildPetals;
