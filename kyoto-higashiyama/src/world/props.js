import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { cel, celTex, flat, TINT } from '../core/toon.js';
import { Baker, bake, trs, rngKit, sagCurve, TAU } from '../core/util.js';
import {
  FURNITURE, META, SHADE, CELL, KINDS, ALIAS, propAtlas, atlasUV,
} from '../kit/streetfurniture.js';

/* ------------------------------------------------------------------ *
 * The central prop batcher.
 *
 * District builders never make a prop.  They say where one is:
 *
 *     ctx.prop({ kind, x, z, y, rot, scale, variant, seed, zone })
 *
 * and `buildWorld` collects every one of them into `world.props`.  This module
 * is called once, after every district has run and after every platform has
 * been registered, and turns the whole list into a handful of meshes.
 *
 * ------------------------------------------------------------ THE BUDGET
 *
 * Sixty prop kinds at several meshes each is four hundred draw calls, and the
 * scene is draw-call bound.  So:
 *
 *   - Solid geometry goes into **six zone bakers**, one per stretch of the
 *     route, each merging by shading signature.  Three signatures x six zones
 *     is eighteen meshes for every solid prop in the world, and a zone is a
 *     200-300 m cull unit, so a street view submits two or three of them.
 *   - Everything with a printed face reads from **one atlas** and merges into
 *     **one** mesh (plus one for the cut-out cloth).  A sign is a few hundred
 *     triangles; making it a world-wide cull unit costs nothing and saves
 *     thirty materials.
 *   - Wire, split bamboo and broom bristle go into **one** world-wide mesh with
 *     smooth shading -- one facet thick, and flat shading turns them black.
 *   - Four small `InstancedMesh`es carry the only things that move.
 *
 * Total: **25 draw calls for every prop in Higashiyama**, of which a typical
 * street view submits eight or nine.
 *
 * ------------------------------------------------------------ THE SEATING
 *
 * Every prop is seated on `ctx.groundAt`, and the route is on a hill, so this
 * is not a formality: the difference between the street corridor's own
 * elevation and the bare hillside two metres away is up to a metre and a half.
 * A prop that ignores it is buried or floating and nothing throws.
 *
 * Props marked `flat` in the kit's META (a manhole, a drain cover, a step
 * stone, a puddle, a drift of leaves) are additionally tilted into
 * `ctx.normalAt`, because they are *in* the street's plane.  Everything else
 * stays upright: a vending machine on a 1-in-8 street is vertical, and a pole
 * leaning with the road is the tell that somebody applied the normal to
 * everything.
 * ------------------------------------------------------------------ */

/** The list, so a caller can be checked.  Order is the kit's declaration order. */
export const PROP_KINDS = KINDS.slice();

/** Names other modules already use, mapped onto the canonical ones. */
export const PROP_ALIASES = ALIAS;

/** Per-kind facts a district or a QA tool may want without building anything. */
export const PROP_INFO = META;

/**
 * `y` is an **absolute world elevation**, not a lift.
 *
 * Callers pass the number they already have -- `atStreet()` hands back the
 * corridor's own `y`, and `machiya.js` hangs its lanterns at
 * `base + hisashiY`.  Omit `y` and the prop is seated on `ctx.groundAt`, which
 * is what a prop standing on the street wants.  Anything that hangs off a wall
 * or an eave sees `e.anchored` and hangs from the origin instead of from its
 * own default height, so one call places a lantern under a real hisashi and
 * another puts one at 2.86 m over bare ground.
 */

/* ------------------------------------------------------------------ *
 * Zones.
 *
 * Six stretches of the route, tested in order and exhaustive.  These are cull
 * units, not districts -- the point is that standing on Ninenzaka you do not
 * submit Gion's pickle barrels.
 * ------------------------------------------------------------------ */
const ZONES = [
  { id: 'gionZ', test: (x, z) => x < -280 },
  { id: 'yasakaZ', test: (x, z) => z < -420 },
  { id: 'neneZ', test: (x, z) => z < -40 },
  { id: 'pagodaZ', test: (x, z) => z < 90 },
  { id: 'sannenzakaZ', test: (x, z) => z < 300 },
  { id: 'kiyomizuZ', test: () => true },
];

function zoneOf(x, z) {
  for (const zn of ZONES) if (zn.test(x, z)) return zn.id;
  return 'kiyomizuZ';
}

/**
 * Where an overhead wire is a factual error -- and, just as important, where it
 * is not.
 *
 * Kyoto City's own 無電柱化 programme records settle this street by street
 * (STREET 3.2, all `[V]`):
 *
 *   ねねの道            no wires   第3期, 1995-1998
 *   花見小路通          no wires   第4期, completed 2001 with the stone paving
 *   産寧坂/二年坂/一年坂 no wires   第5期, 2004-2008
 *   白川南通            no wires   but by 裏配線 -- the wires moved to 新橋通
 *   八坂通              partial    軒下配線; a 460 m segment still outstanding
 *   清水坂 / 茶わん坂    POLES      target route #6, not yet done
 *   新橋通 (祇園新橋)    POLES      target route #20 -- this is where 白川南's went
 *   東大路通            POLES      full overhead, transformers, signals, buses
 *
 * The interesting half of that is the second half: **the postcard streets are
 * clean and 清水坂, the busiest street on the route, is not.**  That contrast is
 * real and worth building rather than smoothing away -- so this list refuses a
 * pole where it would be wrong and says nothing anywhere else.
 *
 * 石塀小路 has no project record either way `[?]`; it is refused anyway, because
 * a 0.34 m collider in a 2.8 m alley leaves 2.12 m and a pole would take half
 * of it.
 */
const NO_POLE_STREETS = new Set([
  'hanamikoji', 'nene', 'ninenzaka', 'sannenzaka', 'shirakawaMinami',
  'ishibekoji', 'maruyamaLink', 'yasakaAxis', 'yasakaWestApproach',
  'kiyomizuPrecinct', 'okunoinPath', 'koyasuPath',
]);

/** Backstop for a pole placed off the corridor, inside a preservation area. */
const NO_POLE_AREA = [
  { id: '花見小路', x0: -486, x1: -326, z0: -624, z1: -288 },
  { id: 'ねねの道', x0: 6, x1: 132, z0: -404, z1: -52 },
  { id: '産寧坂地区', x0: 88, x1: 214, z0: -104, z1: 282 },
  { id: '石塀小路', x0: -2, x1: 78, z0: -232, z1: -134 },
];

function noPoleAt(ctx, x, z) {
  const su = ctx.surfaceAt ? ctx.surfaceAt(x, z) : null;
  if (su && NO_POLE_STREETS.has(su.id)) return su.id;
  const a = NO_POLE_AREA.find((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
  return a ? a.id : null;
}

/* ------------------------------ hashing ---------------------------------- */

/** A stable seed from a placement, so the world is identical on every load. */
function hashSpec(kind, x, z, i) {
  let h = 2166136261;
  const s = kind + '|' + Math.round(x * 16) + '|' + Math.round(z * 16) + '|' + i;
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ *
 * buildProps
 * ------------------------------------------------------------------ */

const _up = new THREE.Vector3(0, 1, 0);

export function buildProps(ctx, props = []) {
  const group = new THREE.Group();
  group.name = 'props';

  /* Bakers.  These are *ours*, not `ctx.baker()`'s: the world flushes its
   * baker map right after the districts run, and this module is called after
   * that, so a baker taken from ctx would be filled and never built.  Owning
   * them here also means the zone split is this module's business alone. */
  const zoneBakers = new Map();
  const bakerFor = (id) => {
    let b = zoneBakers.get(id);
    if (!b) { b = new Baker('props.' + id); zoneBakers.set(id, b); }
    return b;
  };
  /* One facet thick: wire, split bamboo, spokes, bristle.  Smooth-shaded and
   * merged once for the whole world, because half of it is the overhead wire
   * run, which spans the map whatever we do. */
  const thin = new Baker('props.thin');

  const atlasParts = [];      // opaque printed faces
  const clothParts = [];      // cut-out cloth
  const anims = { chime: [], tail: [], steam: [], cloth: [] };
  const hooks = [];
  const poles = [];           // { x, z, attach: [Vector3] }

  const stats = {
    placed: 0, skipped: 0, unknown: {}, polesDropped: 0,
    byKind: {}, colliders: 0, hooks: 0,
  };

  const _pos = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _qy = new THREE.Quaternion();
  const _scl = new THREE.Vector3();
  const _mx = new THREE.Matrix4();
  const _tmp = new THREE.Matrix4();

  for (let i = 0; i < props.length; i++) {
    const spec = props[i];
    if (!spec || !spec.kind) continue;
    const kind = FURNITURE[spec.kind] ? spec.kind : (ALIAS[spec.kind] || spec.kind);
    const fn = FURNITURE[kind];
    if (!fn) {
      stats.unknown[spec.kind] = (stats.unknown[spec.kind] || 0) + 1;
      continue;
    }
    const meta = META[kind] || {};
    const x = spec.x, z = spec.z;

    /* The undergrounding rule.  A pole on Hanamikoji is not a style choice. */
    if (meta.noPoleZones) {
      const bad = noPoleAt(ctx, x, z);
      if (bad && !spec.force) {
        stats.polesDropped++;
        stats.skipped++;
        (stats.poleZones || (stats.poleZones = {}))[bad] =
          ((stats.poleZones || {})[bad] || 0) + 1;
        continue;
      }
    }

    const s = spec.scale ?? 1;
    const ry = spec.rot ?? 0;
    const g0 = ctx.groundAt(x, z);
    /* `y` is an absolute elevation when given -- see the note above. */
    const anchored = typeof spec.y === 'number';
    const py = anchored ? spec.y : g0;

    _pos.set(x, py, z);
    _scl.set(s, s, s);
    _qy.setFromAxisAngle(_up, ry);
    if (meta.flat) {
      const n = ctx.normalAt(x, z);
      _q.setFromUnitVectors(_up, n).multiply(_qy);
    } else {
      _q.copy(_qy);
    }
    _mx.compose(_pos, _q, _scl);

    const cs = Math.cos(ry), sn = Math.sin(ry);
    const zid = spec.zone && zoneBakers.has(spec.zone) ? spec.zone : zoneOf(x, z);
    const baker = bakerFor(zid);
    const rng = rngKit(spec.seed ?? hashSpec(kind, x, z, i));
    const tokens = typeof spec.variant === 'string' ? spec.variant.split('+') : [];
    const myAnims = [];

    /* the emitter ------------------------------------------------------- */
    const push = (geo, m, color, shade) => {
      const target = shade === 'thin' ? thin : baker;
      target.add(geo, m ? _tmp.multiplyMatrices(_mx, m) : _mx, color, SHADE[shade] || SHADE.cool);
    };
    const dec = (geo, m, cell, list) => {
      const g = geo.clone();
      atlasUV(g, cell);
      list.push({ geometry: g, matrix: (m ? new THREE.Matrix4().multiplyMatrices(_mx, m) : _mx.clone()) });
    };

    const e = {
      rng,
      seed: spec.seed ?? 0,
      variant: spec.variant,
      zone: zid,
      /** True when the caller pinned an absolute y: hang from the origin. */
      anchored,
      v: (name) => tokens.includes(name),
      num: (d) => (typeof spec.variant === 'number' ? spec.variant : d),

      geo: (geometry, m, color, shade) => push(geometry, m, color, shade),

      box: (w, h, d, color, shade, px = 0, py2 = 0, pz = 0, rx = 0, ry2 = 0, rz = 0) =>
        push(new THREE.BoxGeometry(w, h, d), trs(px, py2, pz, rx, ry2, rz), color, shade),

      up: (w, h, d, color, shade, px = 0, py2 = 0, pz = 0, rx = 0, ry2 = 0, rz = 0) => {
        const g = new THREE.BoxGeometry(w, h, d);
        g.translate(0, h / 2, 0);
        push(g, trs(px, py2, pz, rx, ry2, rz), color, shade);
      },

      cyl: (rt, rb, h, seg, color, shade, px = 0, py2 = 0, pz = 0, rx = 0, ry2 = 0, rz = 0) =>
        push(new THREE.CylinderGeometry(rt, rb, h, seg), trs(px, py2, pz, rx, ry2, rz), color, shade),

      tube: (ax, ay, az, bx, by, bz, w, h, color, shade) => {
        if (Math.hypot(bx - ax, by - ay, bz - az) < 1e-5) return;
        push(beamGeo(ax, ay, az, bx, by, bz, w, h), null, color, shade);
      },

      lathe: (profile, seg, color, shade, px = 0, py2 = 0, pz = 0, ry2 = 0) =>
        push(latheGeo(profile, seg), trs(px, py2, pz, 0, ry2, 0), color, shade),

      decal: (w, h, cell, px = 0, py2 = 0, pz = 0, rx = 0, ry2 = 0, rz = 0) =>
        dec(new THREE.PlaneGeometry(w, h), trs(px, py2, pz, rx, ry2, rz), cell, atlasParts),

      decalGeo: (geometry, m, cell) => dec(geometry, m, cell, atlasParts),

      cloth: (w, h, cell, px = 0, py2 = 0, pz = 0, ry2 = 0) => {
        const g = new THREE.PlaneGeometry(w, h);
        g.translate(0, -h / 2, 0);
        dec(g, trs(px, py2, pz, 0, ry2, 0), cell, clothParts);
      },

      anim: (kind, o) => {
        const p = new THREE.Vector3(o.x || 0, o.y || 0, o.z || 0).applyMatrix4(_mx);
        const rec = {
          ...o,
          kind, p, q: _q.clone(), s,
          phase: rng.range(0, TAU), energy: 0,
          /* the prop's own rotation is already in `q`; this is the extra turn
           * the builder asked for *inside* the prop, and adding `ry` to it here
           * would apply the placement yaw twice */
          lry: o.ry || 0,
        };
        (anims[kind] || (anims[kind] = [])).push(rec);
        myAnims.push(rec);
        return rec;
      },

      collide: (w, d, top, bottom, ox = 0, oz = 0) => {
        const cx = x + s * (ox * cs + oz * sn);
        const cz = z + s * (-ox * sn + oz * cs);
        ctx.collideRot(cx, cz, w * s, d * s, ry,
          top === undefined ? undefined : py + top * s,
          bottom === undefined ? undefined : py + bottom * s);
        stats.colliders++;
      },

      hook: (o) => {
        const p = new THREE.Vector3(o.x || 0, o.y || 0, o.z || 0).applyMatrix4(_mx);
        const box = new THREE.Mesh(
          new THREE.BoxGeometry((o.w || 0.6) * s, (o.h || 0.6) * s, (o.d || 0.6) * s),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        box.position.copy(p);
        box.rotation.y = ry;
        box.visible = false;
        box.name = 'hook.' + kind + '.' + (o.id || '');
        group.add(box);
        const captured = myAnims.slice();
        hooks.push({
          kind, id: o.id || kind, label: o.label || kind,
          x: p.x, y: p.y, z: p.z, variant: spec.variant, hitbox: box,
          /* Offered, never registered: a district calls ctx.interact with this.
           * The default action nudges whatever moves on this prop, so a hook
           * with no wiring still does something honest. */
          action: () => { for (const a of captured) a.energy = 1; },
        });
        stats.hooks++;
      },

      attach: (ax, ay, az) => {
        const p = new THREE.Vector3(ax, ay, az).applyMatrix4(_mx);
        (e._attach || (e._attach = [])).push(p);
      },

      /** Ground height at a local offset, expressed in the prop's own units. */
      gy: (dx, dz) => {
        const wx = x + s * (dx * cs + dz * sn);
        const wz = z + s * (-dx * sn + dz * cs);
        return (ctx.groundAt(wx, wz) - py) / s;
      },
    };

    try {
      fn(e);
    } catch (err) {
      console.error(`[props] "${kind}" at ${x.toFixed(1)},${z.toFixed(1)} failed:`, err);
      stats.skipped++;
      continue;
    }

    if (e._attach) poles.push({ x, z, attach: e._attach });
    stats.placed++;
    stats.byKind[kind] = (stats.byKind[kind] || 0) + 1;
  }

  /* ---------------------------- overhead wires --------------------------- */
  stats.wires = stringWires(poles, thin);

  /* ------------------------------- build --------------------------------- */
  /* Count the *built* geometry, not the queue: `Baker.triangles` reads
   * `position.count / 3`, which is right for the non-indexed geometry it is
   * usually fed and undercounts an indexed merge by more than half.  The number
   * that matters is the number the GPU is asked for. */
  let tris = 0;
  const built = (g) => {
    group.add(g);
    g.traverse((o) => {
      if (!o.isMesh) return;
      const n = o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
      tris += (n / 3) * (o.isInstancedMesh ? o.count : 1);
    });
  };
  for (const b of zoneBakers.values()) built(b.build());
  built(thin.build());

  const atlas = propAtlas();
  if (atlasParts.length) {
    const m = new THREE.Mesh(bake(atlasParts), celTex(atlas, {
      bands: 3, tint: TINT.warm, side: THREE.DoubleSide, flat: true,
    }));
    m.name = 'props.signage';
    m.castShadow = false;      // thin plates: the shadow is a row of sawteeth
    m.receiveShadow = true;
    tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
    group.add(m);
    atlasParts.forEach((p) => p.geometry.dispose());
  }
  if (clothParts.length) {
    const m = new THREE.Mesh(bake(clothParts), celTex(atlas, {
      bands: 3, tint: TINT.warm, side: THREE.DoubleSide,
      transparent: true, alphaTest: 0.45, flat: false,
    }));
    m.name = 'props.cloth';
    m.castShadow = false;
    m.receiveShadow = false;
    m.userData.noOutline = true;
    tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
    group.add(m);
    clothParts.forEach((p) => p.geometry.dispose());
  }

  /* ------------------------------ the motion ----------------------------- */
  const movers = buildMotion(group, anims, atlas);
  /* An InstancedMesh whose matrices have never been written draws every
   * instance at the origin at unit scale.  Run each mover once, now, so the
   * first frame -- and every headless screenshot, which renders about two --
   * is already correct rather than showing a sphere at the pagoda. */
  for (const m of movers) m(0, 0);

  ctx.add(group);
  if (movers.length) ctx.update((dt, t) => { for (const m of movers) m(dt, t); });

  stats.triangles = Math.round(tris);
  stats.drawCalls = countCalls(group);
  stats.motion = movers.length;
  if (Object.keys(stats.unknown).length) {
    console.warn('[props] unknown kinds:', stats.unknown,
      '\n  known:', PROP_KINDS.join(' '));
  }
  if (stats.polesDropped) {
    console.warn(`[props] ${stats.polesDropped} utility pole(s) refused as ` +
      'undergrounded streets:', stats.poleZones,
      '\n  Poles are correct on 東大路通, 清水坂/茶わん坂, 新橋通 and 八坂通.');
  }

  /* Offered, never registered.
   *
   * `props` is a *system*: it runs after every district, so a district cannot
   * read this list during its own build.  Whoever wants the interactions wires
   * them afterwards, and each hook is already the shape `ctx.interact` takes:
   *
   *     for (const h of ctx.propHooks) ctx.interact(h);
   *
   * or selectively, `ctx.propHooks.filter(h => h.kind === 'bicycle')`. */
  ctx.propHooks = hooks;
  group.userData.hooks = hooks;

  /* `world.stats` is spread from this object *after* the systems run, so
   * anything written here reaches `__stats()` and the QA report. */
  if (ctx.stats) {
    ctx.stats.propKinds = Object.keys(stats.byKind).length;
    ctx.stats.propDrawCalls = stats.drawCalls;
    ctx.stats.propTriangles = stats.triangles;
    ctx.stats.propColliders = stats.colliders;
    ctx.stats.propHooks = hooks.length;
    ctx.stats.propWires = stats.wires;
    ctx.stats.propMotion = movers.length;
    ctx.stats.propsDropped = stats.skipped;
  }
  console.log(`[props] ${stats.placed} props · ${stats.drawCalls} draw calls · ` +
    `${(stats.triangles / 1000).toFixed(0)}k tris · ${stats.colliders} colliders · ` +
    `${hooks.length} hooks · ${stats.wires} wires · ${movers.length} movers`);

  return { group, hooks, stats };
}

function countCalls(root) {
  let n = 0;
  root.traverse((o) => { if (o.isMesh && o.material && o.material.visible !== false) n++; });
  return n;
}

/* ------------------------------------------------------------------ *
 * Overhead wires.
 *
 * A Japanese pole is not a pole, it is a junction: six power conductors on two
 * crossarms and a fat comms bundle below them, and the reason a Kyoto side
 * street reads as a real city is that the sky above it is crossed by all of
 * them at once.  Each pole is chained to its two nearest neighbours within a
 * span, which gives a run along a street for free and a genuine tangle
 * wherever two runs meet.
 *
 * The wires are opaque and about 30 mm across on purpose: the ink pass draws
 * them, and a drawn wire against a pale sky is exactly what a painted
 * background does with them.
 * ------------------------------------------------------------------ */
const MAX_SPAN = 46;

function stringWires(poles, baker) {
  if (poles.length < 2) return 0;
  const edges = new Set();
  for (let i = 0; i < poles.length; i++) {
    const near = [];
    for (let j = 0; j < poles.length; j++) {
      if (i === j) continue;
      const d = Math.hypot(poles[j].x - poles[i].x, poles[j].z - poles[i].z);
      if (d <= MAX_SPAN) near.push({ j, d });
    }
    near.sort((a, b) => a.d - b.d);
    for (const { j } of near.slice(0, 2)) {
      edges.add(Math.min(i, j) * 100000 + Math.max(i, j));
    }
  }
  let n = 0;
  for (const key of edges) {
    const a = poles[Math.floor(key / 100000)];
    const b = poles[key % 100000];
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const k = Math.min(a.attach.length, b.attach.length);
    const sag = 0.028 * dist + 0.14;
    for (let m = 0; m < k; m++) {
      const curve = sagCurve(a.attach[m], b.attach[m], sag * (m >= k - 2 ? 1.5 : 1), 7);
      const g = new THREE.TubeGeometry(curve, 7, m >= k - 2 ? 0.042 : 0.028, 3, false);
      baker.add(g, null, PAL.wire, SHADE.thin);
      g.dispose();
      n++;
    }
  }
  return n;
}

/* ------------------------------------------------------------------ *
 * Motion.
 *
 * Four instanced meshes carry every moving prop in the world, and the motion
 * is deliberately at the bottom of what is perceptible: a paper strip on a
 * wind chime turning a few degrees, a cat's tail, steam off a bowl, a cloth
 * lifting on a line.  Nothing bounces, nothing spins, nothing pulses.  If it
 * reads as "a game thing is happening" it is wrong, and the way that failure
 * arrives is always amplitude, never frequency.
 * ------------------------------------------------------------------ */

function buildMotion(group, anims, atlas) {
  const out = [];
  const d = new THREE.Object3D();
  const qe = new THREE.Quaternion();
  const ee = new THREE.Euler();
  const col = new THREE.Color();
  const UPV = new THREE.Vector3(0, 1, 0);

  /* --- 風鈴 の 短冊 : the paper strip, which is what actually flutters --- */
  const chime = anims.chime || [];
  if (chime.length) {
    const g = new THREE.PlaneGeometry(1, 1);
    g.translate(0, -0.5, 0);
    const inst = new THREE.InstancedMesh(g, cel({
      color: PAL.paper, bands: 'soft3', tint: TINT.cool,
      side: THREE.DoubleSide, flat: false, cache: false,
    }), chime.length);
    inst.name = 'props.chimeStrips';
    inst.castShadow = false;
    inst.receiveShadow = false;
    inst.frustumCulled = false;
    group.add(inst);
    out.push((dt, t) => {
      for (let i = 0; i < chime.length; i++) {
        const a = chime[i];
        a.energy *= Math.exp(-1.7 * dt);
        const amp = 0.085 + a.energy * 0.30;
        ee.set(Math.sin(t * 1.31 + a.phase) * amp, 0,
               Math.sin(t * 2.07 + a.phase * 1.7) * amp * 0.75);
        d.position.copy(a.p);
        d.quaternion.copy(a.q).multiply(qe.setFromEuler(ee));
        d.scale.set((a.w || 0.045) * a.s, (a.h || 0.16) * a.s, 1);
        d.updateMatrix();
        inst.setMatrixAt(i, d.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    });
  }

  /* --- the cat's tail --- */
  const tails = anims.tail || [];
  if (tails.length) {
    const g = new THREE.CylinderGeometry(0.36, 1, 1, 5);
    g.translate(0, 0.5, 0);
    g.rotateX(Math.PI / 2);           // now it runs along +Z from its own base
    const inst = new THREE.InstancedMesh(g, cel({
      color: 0xffffff, bands: 3, tint: TINT.warm, cache: false,
    }), tails.length);
    inst.name = 'props.catTails';
    inst.castShadow = true;
    inst.receiveShadow = false;
    inst.frustumCulled = false;
    for (let i = 0; i < tails.length; i++) {
      col.set(tails[i].color ?? 0xc8bcae);
      inst.setColorAt(i, col);
    }
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    group.add(inst);
    out.push((dt, t) => {
      for (let i = 0; i < tails.length; i++) {
        const a = tails[i];
        a.energy *= Math.exp(-1.1 * dt);
        const sway = Math.sin(t * 0.62 + a.phase) * (0.12 + a.energy * 0.5);
        d.position.copy(a.p);
        d.quaternion.copy(a.q)
          .multiply(qe.setFromAxisAngle(UPV, (a.lry || 0) + sway))
          .multiply(new THREE.Quaternion().setFromEuler(
            ee.set(Math.sin(t * 0.41 + a.phase) * 0.06, 0, 0)));
        d.scale.set((a.r || 0.026) * a.s, (a.r || 0.026) * a.s, (a.len || 0.3) * a.s);
        d.updateMatrix();
        inst.setMatrixAt(i, d.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    });
  }

  /* --- steam: incense, and a bowl somebody put down a minute ago --- */
  const sources = anims.steam || [];
  if (sources.length) {
    const puffs = [];
    for (const a of sources) {
      const n = a.n || 4;
      for (let k = 0; k < n; k++) puffs.push({ a, u0: k / n });
    }
    // a sphere, not a billboard: there is no camera in an update loop, and a
    // quad seen edge-on is a prop that vanishes from exactly one angle
    const inst = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.5, 0),
      flat({ color: PAL.paper, transparent: true, opacity: 0.26, depthWrite: false, cache: false }),
      puffs.length
    );
    inst.name = 'props.steam';
    inst.castShadow = false;
    inst.receiveShadow = false;
    inst.frustumCulled = false;
    inst.renderOrder = 3;
    inst.userData.noOutline = true;
    group.add(inst);
    out.push((dt, t) => {
      for (let i = 0; i < puffs.length; i++) {
        const { a, u0 } = puffs[i];
        const u = (t * 0.30 + a.phase * 0.16 + u0) % 1;
        const r = (a.r || 0.15) * a.s;
        const sc = r * (0.55 + u * 1.7) * Math.sin(Math.PI * u);
        d.position.set(
          a.p.x + Math.sin(t * 0.5 + a.phase + u * 2.4) * r * u * 1.4,
          a.p.y + u * (a.rise || 0.8) * a.s,
          a.p.z + Math.cos(t * 0.37 + a.phase * 1.4 + u * 2.1) * r * u * 1.1
        );
        d.quaternion.identity();
        d.scale.setScalar(Math.max(1e-4, sc));
        d.updateMatrix();
        inst.setMatrixAt(i, d.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    });
  }

  /* --- a cloth on a line: it lifts, it does not flap --- */
  const cloths = anims.cloth || [];
  if (cloths.length) {
    const g = new THREE.PlaneGeometry(1, 1);
    g.translate(0, -0.5, 0);
    atlasUV(g, CELL.clothPlain);
    const inst = new THREE.InstancedMesh(g, celTex(atlas, {
      bands: 3, tint: TINT.warm, side: THREE.DoubleSide,
      transparent: true, alphaTest: 0.45, flat: false,
    }), cloths.length);
    inst.name = 'props.clothMoving';
    inst.castShadow = false;
    inst.receiveShadow = false;
    inst.frustumCulled = false;
    inst.userData.noOutline = true;
    for (let i = 0; i < cloths.length; i++) {
      col.set(cloths[i].cell === CELL.clothNoren ? 0x33486e : 0xffffff);
      inst.setColorAt(i, col);
    }
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    group.add(inst);
    out.push((dt, t) => {
      for (let i = 0; i < cloths.length; i++) {
        const a = cloths[i];
        a.energy *= Math.exp(-1.3 * dt);
        ee.set(0.045 + Math.sin(t * 0.63 + a.phase) * (0.055 + a.energy * 0.25), 0,
               Math.sin(t * 0.47 + a.phase * 1.3) * 0.035);
        d.position.copy(a.p);
        d.quaternion.copy(a.q).multiply(qe.setFromEuler(ee));
        d.scale.set((a.w || 0.55) * a.s, (a.h || 0.7) * a.s, 1);
        d.updateMatrix();
        inst.setMatrixAt(i, d.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    });
  }

  return out;
}

/* --------------------------- geometry shims ------------------------------ *
 * `beam` and `lathe` live in util.js; these are thin local names so the
 * emitter above reads as one vocabulary rather than two.
 * ------------------------------------------------------------------------- */
function beamGeo(ax, ay, az, bx, by, bz, w, h) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  const g = new THREE.BoxGeometry(w, h, len);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(dx, dy, dz).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), q,
    new THREE.Vector3(1, 1, 1)));
  return g;
}

function latheGeo(profile, segments = 12) {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(Math.max(1e-4, r), y)), segments);
}
