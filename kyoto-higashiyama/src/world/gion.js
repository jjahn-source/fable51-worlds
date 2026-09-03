import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT, celTex } from '../core/toon.js';
import { rngKit, clamp, lerp, trs, beam, bake, TAU } from '../core/util.js';
import {
  noticeBoard, woodenSign, verticalSign, bannerTex, interiorTex, cached,
} from '../core/textures.js';
import { makeMachiya, KEN } from '../kit/machiya.js';
import { makeShopfront } from '../kit/shopfront.js';
import { layoutPlots, alongStreet, atStreet } from './plots.js';

/* ------------------------------------------------------------------ *
 * 四条通 -- Gion's east end, and the back of the block.
 *
 * This district exists to be **the one that is not pretty**, and that is the
 * whole of its brief.  Hanamikoji and Gion Shinbashi are preservation
 * districts a hundred metres away; Shijo-dori is a four-lane arterial with
 * bus stops, signals, poles, plate glass and a Lawson.  A walker who arrives
 * at Yasaka's west gate having seen nothing but stone paving and lattice has
 * been told the whole city looks like that, and it does not -- the historic
 * streets read as historic *because* you come off a real city street to reach
 * them.  So the contrast is built rather than smoothed away.
 *
 * ------------------------------------------------------------ THE STREET
 *
 * 474 m of it in this world, from Kawabata at the west (38.4 m) to the shrine
 * at the east (42.9 m), bearing 92.9 deg, and it climbs 4.5 m -- the only
 * thing on this street that is not flat.  `half` is 7.0 and `frontage` 13.4,
 * so there is **6.4 m of footway each side**, which is not a guess: Kyoto
 * widened Shijo's pavements to about that in the 2015 歩道拡幅 and took a
 * traffic lane out to pay for it.  That proportion -- a carriageway barely
 * wider than its own pavements -- is most of why Shijo does not look like an
 * ordinary arterial.
 *
 * ------------------------------------------------------- THE VISTA RULE
 *
 * 八坂神社 西楼門 stands at the end of it (LANDMARK.yasakaWestGate,
 * -157.3, -575.2, built 1497, moved 6 m east and 3 m north in 1913 when Shijo
 * was widened).  Another district builds the gate.  This one builds the
 * street that frames it, which means two things:
 *
 *   1. **Nothing east of x = -200.**  The ground in front of the gate stays
 *      clear, and the frontage stops 43 m short of it.
 *   2. **The frontage steps down as it goes east.**  Four storeys at the
 *      Kawabata end, three through the middle, two for the last 120 m -- so
 *      the walls funnel and the gate is the tallest thing in the view by the
 *      time you can see it.  A constant cornice line all the way to the shrine
 *      would leave the gate as one more object in a row.
 *
 * -------------------------------------------------------- THE BACK LANES
 *
 * The rest of this file is the back of Hanamikoji: rear walls, service yards,
 * air-conditioning plant, meters, a car park, the bins.  Nobody walks there.
 * It is built because you see it down every alley off Hanamikoji, and an empty
 * void behind a facade is the fastest way to break a world -- the frontage
 * stops being a building and becomes a flat.
 * ------------------------------------------------------------------ */

export const id = 'gion';

/** Where the frontage stops, so the shrine gate closes the vista. */
const EAST_LIMIT = -200;

/* Shop names for Shijo.  Every one of these is a real business on this street
 * or in Gion (STREET.md 1.8, [V]), or a correctly-formed generic from 2.2.
 * They are used as *type*, not as a claim about a shopfront. */
const FASCIA = [
  '鍵善良房', '祇園小石', '祇園徳屋', '都路里', '一保堂茶舗', '宮脇賣扇庵',
  '京菓匠', '御菓子司', '京料理', '茶寮', '和小物', '京扇堂', '香老舗',
  '西陣織', '京銘菓', '旅館',
];

export function build(ctx) {
  const rng = rngKit(40401);
  const B = 'gion';
  const b = ctx.baker(B);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const out = { buildings: [], plots: [], blocks: 0 };

  /* Textured plates -- shopfront glazing and fascia lettering -- are collected
   * and merged per material at the end, because a hundred shopfronts with a
   * mesh each is a hundred draw calls and the whole point of this street is
   * that it is a hundred shopfronts. */
  const plates = new Map();
  const plate = (key, tex, geo, opts) => {
    let g = plates.get(key);
    if (!g) plates.set(key, (g = { tex, opts, parts: [] }));
    g.parts.push({ geometry: geo });
  };

  const shijo = ctx.getCorridor('shijo');
  if (!shijo) return out;
  const tAtX = (x) => {
    let lo = 0, hi = shijo.length;
    for (let k = 0; k < 22; k++) {
      const m = (lo + hi) / 2;
      if (shijo.pointAt(m).x < x) lo = m; else hi = m;
    }
    return (lo + hi) / 2 / shijo.length;
  };
  const T_EAST = tAtX(EAST_LIMIT);

  /* ================================================================== *
   * 1.  The carriageway.
   *
   * The corridor gives asphalt out to `half`; everything that makes it read as
   * a city street is here: a kerb, a raised footway, lane markings and a
   * crossing.  The footway is a real platform, so you step up onto it.
   * ================================================================== */
  const KERB = 0.15;
  const FOOT_IN = 7.0, FOOT_OUT = 13.1;
  {
    const pts = alongStreet({ street: 'shijo', side: -1, from: 0, to: 1, spacing: 4, offset: 0 });
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      const y = Math.min(p.y, q.y);
      const len = Math.hypot(q.x - p.x, q.z - p.z) + 0.05;
      const ry = Math.atan2(p.tx, p.tz);
      for (const side of [-1, 1]) {
        const nx = -p.tz * side, nz = p.tx * side;
        // 縁石 -- the granite kerb, standing 0.15 proud of the carriageway
        b.add(box, trs(p.x + nx * (FOOT_IN + 0.11), y + KERB / 2, p.z + nz * (FOOT_IN + 0.11), 0, ry, 0)
          .scale(new THREE.Vector3(0.22, KERB + 0.30, len)),
        PAL.stone, { bands: 3, tint: TINT.cool });
        // the footway slab
        const w = FOOT_OUT - FOOT_IN - 0.22;
        b.add(box, trs(p.x + nx * (FOOT_IN + 0.22 + w / 2), y + KERB - 0.05,
          p.z + nz * (FOOT_IN + 0.22 + w / 2), 0, ry, 0)
          .scale(new THREE.Vector3(w, 0.16, len)),
        i % 5 === 0 ? PAL.pavingLit : PAL.paving, { bands: 3, tint: TINT.cool });
        /* And the platform under it, so a walker is actually up on the kerb.
         * Shijo runs 92.9 deg, so these boxes are very nearly axis-aligned and
         * the AABB is tight. */
        const cx = p.x + nx * (FOOT_IN + w / 2 + 0.22);
        const cz = p.z + nz * (FOOT_IN + w / 2 + 0.22);
        const hx = (Math.abs(p.tx) * len + w * Math.abs(p.tz)) / 2;
        const hz = (Math.abs(p.tz) * len + w * Math.abs(p.tx)) / 2;
        ctx.platform({ x0: cx - hx, z0: cz - hz, x1: cx + hx, z1: cz + hz, top: y + KERB });
      }
      /* 車線 -- the centre line and the lane divider.  Paint, not geometry:
       * flat unlit quads a couple of centimetres over the asphalt. */
      if (i % 2 === 0) {
        for (const off of [-3.5, 3.5]) {
          const nx = -p.tz, nz = p.tx;
          b.add(box, trs(p.x + nx * off, y + 0.03, p.z + nz * off, 0, ry, 0)
            .scale(new THREE.Vector3(0.14, 0.02, len * 0.55)),
          PAL.white, { bands: 'soft3', tint: TINT.cool });
        }
      }
      b.add(box, trs(p.x, y + 0.03, p.z, 0, ry, 0)
        .scale(new THREE.Vector3(0.30, 0.02, len)),
      PAL.white, { bands: 'soft3', tint: TINT.cool });
    }
  }

  /* 横断歩道 -- the crossing at the Hanamikoji junction, with its stop lines.
   * A signalised crossing is the loudest single statement that this is not a
   * preservation street. */
  const crossT = tAtX(-381.8);
  {
    const c = atStreet('shijo', crossT + 0.012, {});
    if (c) {
      const ry = Math.atan2(c.tx, c.tz);
      // atStreet with no side hands back a zero normal; take it from the tangent
      const nx = -c.tz, nz = c.tx;
      for (let k = -7; k <= 7; k++) {
        if (k === 0) continue;
        const off = k * 0.92;
        if (Math.abs(off) > 7.2) continue;
        b.add(box, trs(c.x + nx * off, c.y + 0.03, c.z + nz * off, 0, ry, 0)
          .scale(new THREE.Vector3(0.50, 0.02, 4.2)), PAL.white,
        { bands: 'soft3', tint: TINT.cool });
      }
      for (const s of [-1, 1]) {
        const st = atStreet('shijo', crossT + 0.012 + s * 0.0125, {});
        if (!st) continue;
        b.add(box, trs(st.x, st.y + 0.03, st.z, 0, Math.atan2(st.tx, st.tz), 0)
          .scale(new THREE.Vector3(7.0, 0.02, 0.42)), PAL.white,
        { bands: 'soft3', tint: TINT.cool });
      }
      // the four signal masts
      for (const side of [-1, 1]) {
        for (const along of [-0.014, 0.038]) {
          const p = atStreet('shijo', clamp(crossT + along, 0.02, 0.96), { side, offset: FOOT_OUT - 1.1 });
          if (p) trafficSignal(ctx, b, box, p, side);
        }
      }
      {
        const bx = c.x - nx * (FOOT_OUT - 1.1), bz = c.z - nz * (FOOT_OUT - 1.1);
        interactAt(ctx, bx, ctx.groundAt(bx, bz) + 1.15, bz, 1.1,
          'press the crossing button', (a) => a?.knock?.(760, 0.10, 0.08));
      }
    }
  }

  /* ================================================================== *
   * 2.  The frontage.
   *
   * A mix, and the mix is the point: Shijo's east end is Meiji and Taisho
   * machiya with modern ground floors cut into them, 1960s concrete blocks
   * with tiled parapets, and the occasional intact ochaya.  Roughly two in
   * five are traditional, and the proportion rises as you go east.
   * ================================================================== */
  for (const side of [-1, 1]) {
    const south = side > 0;
    const plots = layoutPlots({
      street: 'shijo', side,
      from: 0.02, to: T_EAST,
      mix: 'ochaya', gap: 0.10, seed: 4004 + side,
      /* The south side is left clear where Hanamikoji comes in: that block is
       * built by the neighbouring district and its first houses stand inside
       * Shijo's frontage zone.  The north side gets a service alley instead. */
      skip: south
        ? [[tAtX(-397), tAtX(-361)], [tAtX(-262), tAtX(-256)]]
        : [[tAtX(-470), tAtX(-464)], [tAtX(-318), tAtX(-312)]],
    });
    out.plots.push(...plots);

    let prev = null;
    plots.forEach((p, i) => {
      const east = (p.x - -640) / (EAST_LIMIT - -640);      // 0 west .. 1 east
      /* Storeys taper toward the shrine.  Kyoto's height limit in this zone is
       * 15 m; nothing here is close to it, and the tallest is at the far end
       * from the gate. */
      const maxFloors = east > 0.80 ? 2 : east > 0.55 ? 3 : 4;
      const traditional = rng.next() < lerp(0.28, 0.68, east);

      if (traditional) {
        /* A machiya with its mise bay opened as a shop.  Two storeys, because
         * a 厨子二階 half-storey next to a four-storey block reads as a shed. */
        const built = makeShopfront(ctx, {
          x: p.x, z: p.z, ry: p.ry, width: p.width,
          depth: rng.range(11, 17), floors: 2, style: 'shop',
          baker: B, seed: (3137 * (i + 1) + (south ? 71 : 13)) >>> 0,
          kind: rng.pick(['wagashi', 'matcha', 'komono', 'restaurant', 'crafts',
            'fans', 'incense', 'sake', 'souvenir']),
          komayose: false, inuyarai: false,
          timberTone: rng.chance(0.3) ? PAL.bengara : PAL.timber,
          plasterTone: rng.chance(0.4) ? PAL.plasterOchre : PAL.plaster,
        });
        out.buildings.push(built);
        ctx.stats.shopfronts++;
      } else {
        let floors = clamp(Math.round(rng.range(2, maxFloors + 0.49)), 2, maxFloors);
        // never three of a height in a row: a flat cornice line down a whole
        // block is the tell that a street was generated rather than built
        if (floors === prev) floors = clamp(floors + (floors >= maxFloors ? -1 : 1), 2, maxFloors);
        prev = floors;
        cityBlock(ctx, b, box, plate, {
          x: p.x, z: p.z, ry: p.ry, width: p.width,
          depth: rng.range(12, 19), y: p.yLow, floors,
          rng, name: rng.pick(FASCIA),
          seed: (911 * (i + 1) + (south ? 5 : 91)) >>> 0,
        });
        out.blocks++;
        ctx.stats.buildings++;
      }
    });
  }

  /* 一力亭 -- the SE corner of 四条通 x 花見小路, and the anchor of the whole
   * district.  紅殻 bengara walls, black timber, fine vertical 格子, plain
   * white-charactered lanterns, a two-storey wing facing Shijo rebuilt in Meiji
   * after the 1864 fire.  It is one of the few buildings on the route whose
   * frontage is genuinely documented (STREET.md 1.8, [V]).
   *
   * The corner itself belongs to Hanamikoji's own frontage, so the Shijo wing
   * starts where that district's depth ends. */
  {
    const t = tAtX(-356);
    const p = atStreet('shijo', t, { side: 1, offset: 13.4 });
    if (p) {
      const built = makeMachiya(ctx, {
        x: p.x, z: p.z, ry: p.across, width: 6 * KEN, depth: 15,
        style: 'ochaya', floors: 2, y: ctx.groundAt(p.x, p.z), baker: B,
        seed: 18881, timberTone: PAL.bengara, plasterTone: PAL.plasterOchre,
        latticeKind: 'fine', komayose: true, inuyarai: false,
        roofMaterial: 'tile', lanterns: 2,
        signboard: { text: '一力亭', board: 0x2a231c, brush: true, vertical: true },
      });
      out.buildings.push(built);
      ctx.stats.landmarks++;
      out.ichiriki = built;
    }
  }

  /* ================================================================== *
   * 3.  Street furniture.
   * ================================================================== */
  /* Poles.  Shijo is outside every one of `props.js`'s undergrounded
   * rectangles, and correctly so: the burial programme covered 花見小路 and the
   * 産寧坂 district, not the arterial. */
  for (const side of [-1, 1]) {
    for (const p of alongStreet({
      street: 'shijo', side, from: 0.05, to: T_EAST - 0.02,
      spacing: 32, jitter: 4, seed: 200 + side, offset: FOOT_OUT - 0.7,
    })) {
      ctx.prop({ kind: 'utilityPole', x: p.x, z: p.z, rot: p.ry });
    }
  }

  for (const side of [-1, 1]) {
    for (const p of alongStreet({
      street: 'shijo', side, from: 0.04, to: T_EAST - 0.01,
      spacing: 8.5, jitter: 3.5, seed: 300 + side, offset: FOOT_OUT - 1.5,
    })) {
      const r = rng.next();
      if (r < 0.10) ctx.prop({ kind: 'vendingMachine', x: p.x, z: p.z, rot: p.ry });
      else if (r < 0.22) ctx.prop({ kind: 'bicycle', x: p.x, z: p.z, rot: p.ry + Math.PI / 2, seed: rng.int(0, 9999) });
      else if (r < 0.30) ctx.prop({ kind: 'planterPot', x: p.x, z: p.z, rot: p.ry, seed: rng.int(0, 9999) });
      else if (r < 0.36) ctx.prop({ kind: 'aBoard', x: p.x, z: p.z, rot: p.ry, seed: rng.int(0, 9999) });
      else if (r < 0.41) ctx.prop({ kind: 'bollard', x: p.x, z: p.z, rot: p.ry });
      else if (r < 0.45) ctx.prop({ kind: 'postBox', x: p.x, z: p.z, rot: p.ry });
      else if (r < 0.49) ctx.prop({ kind: 'bicycleRack', x: p.x, z: p.z, rot: p.ry });
      else if (r < 0.53) ctx.prop({ kind: 'extinguisherBox', x: p.x, z: p.z, rot: p.ry });
    }
  }
  // drains in the gutter, both sides
  for (const side of [-1, 1]) {
    for (const p of alongStreet({
      street: 'shijo', side, from: 0.04, to: 0.97, spacing: 26, jitter: 6,
      seed: 400 + side, offset: FOOT_IN - 0.45,
    })) {
      ctx.prop({ kind: rng.chance(0.6) ? 'grating' : 'manhole', x: p.x, z: p.z, rot: rng.range(0, TAU) });
    }
  }

  /* 通り名 -- Kyoto's paired street-name plates, at the one crossing where two
   * named streets meet.  0.6 x 0.12 m, white on dark green, kanji over romaji;
   * the paired form naming both streets is the city's own convention
   * (STREET.md 2.4b). */
  {
    const p = atStreet('shijo', crossT - 0.004, { side: 1, offset: FOOT_OUT - 0.8 });
    if (p) {
      const y = ctx.groundAt(p.x, p.z);
      b.add(box, trs(p.x, y + 1.35, p.z, 0, p.across, 0)
        .scale(new THREE.Vector3(0.07, 2.7, 0.07)), PAL.metalWarm, { bands: 3, tint: TINT.cool });
      const names = ['四条通　Shijo dori', '花見小路通　Hanamikoji dori'];
      names.forEach((txt, k) => {
        const tex = cached('gion:plate:' + txt, () => bannerTex(txt, {
          cloth: 0x1f4034, textColor: PAL.white, w: 512, h: 96,
        }));
        const g = new THREE.PlaneGeometry(0.62, 0.13);
        g.rotateY(Math.PI);
        g.translate(0, 2.42 - k * 0.19, -0.05);
        g.applyMatrix4(trs(p.x, y, p.z, 0, p.across + k * Math.PI / 2, 0));
        plate('nameplate:' + txt, tex, g, { bands: 'soft3', tint: TINT.cool, side: THREE.DoubleSide });
      });
      ctx.collide(p.x - 0.14, p.z - 0.14, p.x + 0.14, p.z + 0.14);
    }
  }

  /* The 祇園 bus stop, north side, near the arterial junction -- the only bus
   * stop on this walk and the thing that puts a queue of people on a corner
   * that would otherwise be a stage set. */
  {
    const p = atStreet('shijo', tAtX(-232), { side: -1, offset: FOOT_OUT - 1.6 });
    if (p) busStop(ctx, b, box, plate, p);
  }

  /* Vehicles.  Traces, not traffic: a taxi at the kerb, a van unloading, a
   * second taxi at the west end. */
  for (const [t, side, kind, seed, lane] of [
    [tAtX(-560), -1, 'taxi', 3, 1.7], [tAtX(-500), -1, 'van', 4, 1.7],
    [tAtX(-470), 1, 'taxi', 5, 1.7], [tAtX(-436), -1, 'taxi', 6, 5.0],
    [tAtX(-408), 1, 'van', 7, 1.7], [tAtX(-352), 1, 'taxi', 8, 5.0],
    [tAtX(-318), -1, 'taxi', 9, 1.7], [tAtX(-268), 1, 'taxi', 10, 1.7],
    [tAtX(-232), -1, 'van', 11, 1.7],
  ]) {
    /* The kerbside lane and the inside lane.  A four-lane street with one
     * vehicle on it reads as a set; a scatter across both directions reads as
     * a street between light phases, which is what Shijo is. */
    const p = atStreet('shijo', t, { side, offset: FOOT_IN - lane });
    if (p) ctx.prop({ kind, x: p.x, z: p.z, rot: p.along + (side > 0 ? Math.PI : 0), seed });
  }

  /* ================================================================== *
   * 4.  Behind the frontage.
   *
   * The back of Hanamikoji.  A rear wall along each side of the block, and
   * behind it the plant: condensers, meters, gas bottles, bins, a car park.
   * ================================================================== */
  backOfHouse(ctx, b, box, rng, plate);

  /* ================================================================== *
   * 5.  The private alleys.
   * ================================================================== */
  const notice = cached('gion:shido', () => noticeBoard(
    ['ここは私道です', '通り抜けできません', '私道での撮影禁止', 'PRIVATE ROAD'],
    { board: 0x3a3028, textColor: PAL.paper, accent: PAL.gold, w: 256, h: 340 }
  ));
  const noticeMat = celTex(notice, { bands: 3, tint: TINT.cool });
  const alleys = [
    /* Length is capped at 12 m: the block's rear wall stands 17.5 m back from
     * the frontage line, and an alley that ran into it would be a corridor
     * with a wall across it rather than the dead end the notice describes. */
    { street: 'hanamikoji', t: 0.350, side: -1, len: 12 },
    { street: 'hanamikoji', t: 0.537, side: 1, len: 11 },
    { street: 'hanamikoji', t: 0.717, side: -1, len: 12.5 },
    { street: 'shijo', t: tAtX(-467), side: -1, len: 13 },
    { street: 'shijo', t: tAtX(-315), side: -1, len: 11 },
  ];
  let first = true;
  for (const a of alleys) {
    const m = atStreet(a.street, a.t, { side: a.side, offset: a.street === 'shijo' ? FOOT_OUT : 4.2 });
    if (!m) continue;
    alley(ctx, b, box, m, a.len, rng);
    // 高札-style board at the mouth, one per alley
    const n = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.48), noticeMat);
    const px = m.x - m.nx * 0.4 + m.tx * 1.5, pz = m.z - m.nz * 0.4 + m.tz * 1.5;
    const gy = ctx.groundAt(px, pz);
    n.position.set(px, gy + 1.55, pz);
    n.rotation.y = m.across;
    n.userData.noOutline = true;
    ctx.add(n);
    if (first) {
      interactAt(ctx, px, gy + 1.55, pz, 1.2, 'read the notice',
        (au) => au?.knock?.(220, 0.09, 0.10));
      first = false;
    }
  }

  /* ================================================================== *
   * 6.  Things you can touch.
   * ================================================================== */
  {
    const p = atStreet('shijo', tAtX(-410), { side: -1, offset: FOOT_OUT - 1.5 });
    if (p) {
      ctx.prop({ kind: 'vendingMachine', x: p.x, z: p.z, rot: p.across });
      interactAt(ctx, p.x, p.y + 1.2, p.z, 1.2, 'buy a hot can',
        (a) => { a?.knock?.(160, 0.28, 0.22); a?.chime?.(); });
    }
    const q = atStreet('hanamikoji', 0.46, { side: 1, offset: 18.5 });
    if (q) {
      ctx.prop({ kind: 'bicycle', x: q.x, z: q.z, rot: q.across, seed: 771 });
      interactAt(ctx, q.x, q.y + 0.95, q.z, 1.1, 'ring the bell', (a) => a?.chime?.());
    }
    const r = atStreet('hanamikoji', 0.62, { side: -1, offset: 19.5 });
    if (r) {
      interactAt(ctx, r.x, r.y + 1.3, r.z, 1.3, 'roll the shutter down',
        (a) => a?.slide?.(0.9, 320, 0.26));
    }
  }

  /* --------------------------- flush the plates -------------------------- */
  for (const g of plates.values()) {
    const merged = bake(g.parts);
    g.parts.forEach((p) => p.geometry.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, celTex(g.tex, g.opts));
    m.castShadow = false;
    m.receiveShadow = true;
    m.userData.noOutline = true;
    ctx.add(m);
  }

  return out;
}

/* ================================================================== *
 * The modern block.
 *
 * Not a machiya, and it must not pretend to be one.  What it *is*, and what
 * every one of these on Shijo actually is:
 *
 *   - a plinth and a **recessed** ground floor: the mass stops 1.1 m short of
 *     the frontage line and piers, a header and a glazed screen fill the gap,
 *     because you cannot carve a recess into a box (KIT.md 10)
 *   - a fascia band over it, which is where the one permitted sign goes
 *   - two or three upper storeys of plaster or tile with recessed window
 *     bands, the windows a horizontal ribbon rather than punched holes -- that
 *     is what dates them to the 1960s and 70s
 *   - a flat roof behind a parapet, with the air-conditioning plant on it
 *
 * Kyoto's 新景観政策 does the art direction: muted, low-chroma, no rooftop
 * signage, and nothing above 15 m.  Nothing here is white.
 * ================================================================== */
function cityBlock(ctx, b, box, plate, {
  x, z, ry, width, depth, y, floors, rng, name, seed,
}) {
  const R = rngKit(seed || 1);
  const GF = 3.75;                       // ground-floor height
  const UF = 3.15;                       // upper-storey height
  const H = GF + UF * (floors - 1);
  const PARAPET = 0.72;
  const REC = 1.10;                      // how far the mass is held back

  const cos = Math.cos(ry), sin = Math.sin(ry);
  const L = (lx, ly, lz, w, h, d, color, opts) => {
    b.add(box, trs(x + lx * cos + lz * sin, y + ly, z - lx * sin + lz * cos, 0, ry, 0)
      .scale(new THREE.Vector3(w, h, d)), color, opts);
  };
  const PL = { bands: 'soft3', tint: TINT.cool };
  const TL = { bands: 3, tint: TINT.cool };

  const wallTone = R.pick([PAL.plasterGrey, PAL.plasterWarm, PAL.concrete,
    PAL.plasterDark, PAL.tileWarm]);
  const trimTone = R.chance(0.5) ? PAL.stoneDark : PAL.timberDark;

  /* --------------------------- the mass ------------------------------ */
  L(0, -0.4 + (H + 0.4) / 2, REC + (depth - REC) / 2, width, H + 0.4, depth - REC, wallTone, PL);
  // the parapet, standing proud of the wall on all four sides
  L(0, H + PARAPET / 2, (depth) / 2 - 0.1, width + 0.16, PARAPET, depth - 0.2, wallTone, PL);
  L(0, H + PARAPET - 0.05, depth / 2 - 0.1, width + 0.24, 0.10, depth, trimTone, TL);
  // and the coping band over the shopfront -- the 1F/2F break every one of
  // these buildings has
  L(0, GF + 0.30, 0.10, width, 0.16, 0.34, trimTone, TL);

  /* ------------------------- the ground floor ------------------------- */
  // piers at the ends, and one in the middle if the frontage is wide
  const piers = [-width / 2 + 0.30, width / 2 - 0.30];
  if (width > 9) piers.splice(1, 0, 0);
  for (const px of piers) {
    L(px, GF / 2, REC / 2, 0.58, GF + 0.2, REC, wallTone, PL);
  }
  // the header over the opening
  L(0, GF - 0.22, REC / 2, width, 0.62, REC, wallTone, PL);
  // the threshold: one granite step
  L(0, 0.06, -0.14, width, 0.14, 0.42, PAL.stone, TL);
  L(0, -0.22, depth / 2, width + 0.10, 0.5, depth, PAL.stoneDark, TL);

  /* The glazed screen, set back at the face of the cut-back mass.  One
   * interior texture shared by every block on the street. */
  const bays = [];
  for (let i = 0; i < piers.length - 1; i++) bays.push([piers[i] + 0.30, piers[i + 1] - 0.30]);
  const shopTex = cached('gion:interior', () => interiorTex('shop'));
  for (const [a, c] of bays) {
    if (c - a < 0.7) continue;
    const w = c - a, cx = (a + c) / 2;
    const g = new THREE.PlaneGeometry(w, GF - 0.95);
    g.rotateY(Math.PI);
    g.translate(cx, 0.30 + (GF - 0.95) / 2, REC - 0.02);
    g.applyMatrix4(trs(x, y, z, 0, ry, 0));
    plate('interior', shopTex, g, { bands: 'deep', tint: TINT.warm });
    // the shopfront frame: two mullions and a transom
    L(cx, 0.22, REC - 0.06, w, 0.30, 0.14, trimTone, TL);
    L(cx, GF - 0.60, REC - 0.06, w, 0.14, 0.14, trimTone, TL);
    for (let k = 1; k < Math.max(2, Math.round(w / 2.1)); k++) {
      L(a + (w * k) / Math.max(2, Math.round(w / 2.1)), (GF - 0.3) / 2, REC - 0.06,
        0.09, GF - 0.9, 0.12, trimTone, TL);
    }
  }
  // 庇 -- the awning over the pavement, which every one of these has
  if (R.chance(0.75)) {
    const proj = 1.05;
    L(0, GF - 0.42, -proj / 2, width - 0.2, 0.11, proj,
      R.pick([PAL.norenNavy, PAL.norenBrown, PAL.stoneDark, PAL.norenGreen]), TL);
    for (const px of [-width / 2 + 0.5, width / 2 - 0.5]) {
      L(px, GF - 0.62, -0.2, 0.06, 0.42, 0.06, PAL.metalDark, TL);
    }
  }

  /* --------------------------- the fascia ---------------------------- */
  {
    const fh = 0.62;
    L(0, GF + 0.70, 0.05, width - 0.35, fh + 0.10, 0.14, trimTone, TL);
    const tex = cached('gion:fascia:' + name, () => woodenSign(name, {
      board: 0x2f2a26, textColor: PAL.paperWarm, brush: true, w: 512, h: 128,
    }));
    const g = new THREE.PlaneGeometry(width - 0.55, fh);
    g.rotateY(Math.PI);
    g.translate(0, GF + 0.70, -0.03);
    g.applyMatrix4(trs(x, y, z, 0, ry, 0));
    plate('fascia:' + name, tex, g, { bands: 3, tint: TINT.warm });
  }
  /* 袖看板 -- the projecting sign.  The ordinance caps it at 1.0 m of
   * projection and 2.5 m of clearance, so it hangs at the fascia and no
   * lower. */
  if (R.chance(0.45)) {
    const sx = (R.chance(0.5) ? -1 : 1) * (width / 2 - 0.45);
    const tex = cached('gion:sode:' + name, () => verticalSign(name, {
      board: 0x33302c, textColor: PAL.paperWarm, brush: true,
    }));
    const g = new THREE.PlaneGeometry(0.42, 1.55);
    g.translate(sx, GF + 0.6, -0.62);
    g.rotateY(0);
    g.applyMatrix4(trs(x, y, z, 0, ry, 0));
    plate('sode:' + name, tex, g, { bands: 3, tint: TINT.warm, side: THREE.DoubleSide });
    L(sx, GF + 1.42, -0.35, 0.07, 0.07, 0.72, PAL.metalDark, TL);
  }

  /* -------------------------- the upper storeys ----------------------- */
  for (let f = 1; f < floors; f++) {
    const y0 = GF + UF * (f - 1) + 0.55;
    const wh = UF - 1.20;
    const n = Math.max(2, Math.round(width / 2.3));
    // one recessed reveal per storey, and the windows sitting inside it
    L(0, y0 + wh / 2, 0.11, width - 0.55, wh + 0.14, 0.24, trimTone, TL);
    for (let k = 0; k < n; k++) {
      const cx = -width / 2 + (width / n) * (k + 0.5);
      L(cx, y0 + wh / 2, 0.20, width / n - 0.30, wh, 0.12, PAL.glassDark,
        { bands: 'deep', tint: TINT.cool });
    }
    // the spandrel band between storeys
    L(0, y0 + wh + 0.32, 0.03, width, 0.13, 0.10, trimTone, TL);
  }

  /* ------------------------------ the roof ---------------------------- */
  /* 屋上 -- the plant.  Kyoto forbids rooftop *signage*, not rooftop
   * machinery, and a flat roof with nothing on it is the one thing you never
   * see from a fourth-floor window in this city. */
  for (let k = 0; k < 2 + (R.chance(0.5) ? 1 : 0); k++) {
    const lx = R.range(-width / 2 + 0.9, width / 2 - 0.9);
    const lz = R.range(1.8, Math.max(2.2, depth - 1.6));
    L(lx, H + 0.42, lz, 0.9, 0.62, 0.66, PAL.acUnit, TL);
    L(lx, H + 0.06, lz, 1.0, 0.12, 0.76, PAL.concreteDark, TL);
  }
  if (R.chance(0.5)) {
    L(width * 0.22, H + 1.0, depth * 0.5, 2.2, 2.0, 2.2, wallTone, PL);   // stair head
  }

  /* ----------------------------- collision ---------------------------- */
  const cx = x + Math.sin(ry) * (depth / 2), cz = z + Math.cos(ry) * (depth / 2);
  ctx.collideRot(cx, cz, width, depth, ry, y + H + PARAPET);
  // the piers stand in front of the mass: collide the frontage strip too
  ctx.collideRot(x + Math.sin(ry) * (REC / 2), z + Math.cos(ry) * (REC / 2),
    width, REC, ry, y + GF);
}

/* ------------------------------------------------------------------ *
 * 信号機 -- the traffic signal.
 *
 * A Japanese vehicle head is a wide dark box with three lenses in a row, on a
 * long cantilever arm out over the carriageway, with the pedestrian head
 * mounted low on the same pole.  The cantilever is the silhouette: a signal on
 * a short bracket reads as European.
 * ------------------------------------------------------------------ */
function trafficSignal(ctx, b, box, p, side) {
  const y = ctx.groundAt(p.x, p.z);
  const ry = p.across;
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const L = (lx, ly, lz, w, h, d, color, opts) => {
    b.add(box, trs(p.x + lx * cos + lz * sin, y + ly, p.z - lx * sin + lz * cos, 0, ry, 0)
      .scale(new THREE.Vector3(w, h, d)), color, opts);
  };
  const M = { bands: 3, tint: TINT.cool };
  const POLE = 5.4, ARM = 5.2;
  L(0, POLE / 2, 0, 0.16, POLE, 0.16, PAL.metalWarm, M);
  L(0, 0.14, 0, 0.34, 0.28, 0.34, PAL.concreteDark, M);
  // the arm, out over the carriageway, with a raking stay under it
  L(0, POLE - 0.18, -ARM / 2, 0.12, 0.12, ARM, PAL.metalWarm, M);
  {
    // the raking stay under the cantilever, built between two world points
    const ax = p.x, az = p.z, ay = y + POLE - 2.3;
    const bx = p.x + sin * -(ARM * 0.55), bz = p.z + cos * -(ARM * 0.55), by2 = y + POLE - 0.26;
    const g = beam(ax, ay, az, bx, by2, bz, 0.07, 0.07);
    b.add(g, null, PAL.metalWarm, M);
    g.dispose();
  }
  // the vehicle head: three lenses, and a long hood over them
  L(0, POLE - 0.62, -ARM + 0.5, 1.28, 0.42, 0.22, PAL.metalDark, M);
  L(0, POLE - 0.42, -ARM + 0.42, 1.34, 0.10, 0.40, PAL.metalDark, M);
  for (let k = 0; k < 3; k++) {
    L(-0.40 + k * 0.40, POLE - 0.62, -ARM + 0.38, 0.28, 0.28, 0.06,
      [0x2e2f34, 0x2e2f34, 0x3f7a52][k], { bands: 'deep', tint: TINT.cool });
  }
  // the pedestrian head and its button box
  L(0, 3.05, -0.22, 0.34, 0.68, 0.20, PAL.metalDark, M);
  L(0, 3.05, -0.33, 0.28, 0.58, 0.04, 0x2e2f34, { bands: 'deep', tint: TINT.cool });
  L(0.16, 1.10, -0.16, 0.16, 0.24, 0.10, PAL.metalWarm, M);
  void side;
  ctx.collide(p.x - 0.30, p.z - 0.30, p.x + 0.30, p.z + 0.30);
}

/* ------------------------------------------------------------------ *
 * The bus stop.   京都市バス: a round flag on a pole, a timetable case, a
 * shelter with a bench.  Buses do not run on any other street on this walk.
 * ------------------------------------------------------------------ */
function busStop(ctx, b, box, plate, p) {
  const y = ctx.groundAt(p.x, p.z);
  const ry = p.across;
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const L = (lx, ly, lz, w, h, d, color, opts) => {
    b.add(box, trs(p.x + lx * cos + lz * sin, y + ly, p.z - lx * sin + lz * cos, 0, ry, 0)
      .scale(new THREE.Vector3(w, h, d)), color, opts);
  };
  const M = { bands: 3, tint: TINT.cool };
  // the shelter
  L(-2.4, 1.35, 0.10, 0.10, 2.7, 1.5, PAL.metalDark, M);
  L(2.4, 1.35, 0.10, 0.10, 2.7, 1.5, PAL.metalDark, M);
  L(0, 2.72, 0.05, 5.1, 0.14, 1.9, PAL.metalDark, M);
  L(0, 1.55, 0.78, 5.0, 2.1, 0.08, PAL.glass, { bands: 'soft3', tint: TINT.cool });
  L(0, 0.46, 0.52, 4.2, 0.09, 0.42, PAL.timberMid, { bands: 3, tint: TINT.warm });
  for (const bx of [-1.8, 0, 1.8]) L(bx, 0.22, 0.52, 0.08, 0.42, 0.38, PAL.metalDark, M);
  // the flag: a pole with a round plate, the classic 停留所 silhouette
  L(3.6, 1.55, -0.35, 0.09, 3.1, 0.09, PAL.metalWarm, M);
  const tex = cached('gion:busstop', () => bannerTex('祇園', {
    cloth: PAL.white, textColor: PAL.indigoDeep, w: 256, h: 256,
  }));
  const g = new THREE.CircleGeometry(0.34, 16);
  g.translate(0, 2.75, -0.44);
  g.applyMatrix4(trs(p.x + 3.6 * cos, y, p.z - 3.6 * sin, 0, ry, 0));
  plate('busstop', tex, g, { bands: 'soft3', tint: TINT.cool, side: THREE.DoubleSide });
  L(3.6, 1.65, -0.30, 0.42, 0.62, 0.06, PAL.metalDark, M);
  ctx.collide(p.x - 2.8, p.z - 1.1, p.x + 2.8, p.z + 1.1, y + 0.5);
}

/* ------------------------------------------------------------------ *
 * Behind Hanamikoji.
 *
 * The rear wall of the block, and the plant behind it.  Everything here is
 * seen down an alley or over a wall and never approached, so it is built for
 * silhouette: a long wall with a changing top line, condensers, a stack of
 * meters, and one car park with its own lighting column.
 * ------------------------------------------------------------------ */
function backOfHouse(ctx, b, box, rng, plate) {
  void plate;
  const M = { bands: 3, tint: TINT.cool };
  const W = { bands: 3, tint: TINT.warm };

  for (const side of [-1, 1]) {
    const pts = alongStreet({
      street: 'hanamikoji', side, from: 0.16, to: 0.95,
      spacing: 3.0, jitter: 0, seed: 700 + side, offset: 17.5,
    });
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      const y = Math.min(p.y, q.y);
      const len = Math.hypot(q.x - p.x, q.z - p.z) + 0.04;
      const ry = Math.atan2(p.tx, p.tz);
      const cx = (p.x + q.x) / 2, cz = (p.z + q.z) / 2;
      const kind = (i * 7 + (side > 0 ? 3 : 0)) % 11;

      if (kind < 5) {
        /* 黒塀 -- stained board fence with a tile cap.  The Gion default. */
        const h = 1.9;
        b.add(box, trs(cx, y + h / 2, cz, 0, ry, 0).scale(new THREE.Vector3(0.10, h, len)),
          PAL.timberDark, W);
        b.add(box, trs(cx, y + h + 0.06, cz, 0, ry, 0).scale(new THREE.Vector3(0.30, 0.10, len)),
          PAL.tileRidge, M);
      } else if (kind < 8) {
        /* Concrete block wall.  Ugly, ubiquitous, and the reason the back of a
         * Kyoto block does not look like the front of one. */
        const h = 2.1;
        b.add(box, trs(cx, y + h / 2, cz, 0, ry, 0).scale(new THREE.Vector3(0.18, h, len)),
          i % 3 === 0 ? PAL.concreteDark : PAL.concrete, M);
        b.add(box, trs(cx, y + h + 0.05, cz, 0, ry, 0).scale(new THREE.Vector3(0.24, 0.09, len)),
          PAL.concreteDark, M);
      } else if (kind < 10) {
        /* A rear outbuilding: mortar walls, a corrugated shed roof, and the
         * condenser and the meters on the face of it. */
        const h = 2.6 + (i % 3) * 0.5;
        b.add(box, trs(cx, y + h / 2, cz, 0, ry, 0).scale(new THREE.Vector3(2.6, h, len)),
          PAL.plasterDark, { bands: 'soft3', tint: TINT.cool });
        b.add(box, trs(cx - Math.sin(ry) * 0.2, y + h + 0.10, cz - Math.cos(ry) * 0.2, 0.09, ry, 0)
          .scale(new THREE.Vector3(3.0, 0.09, len + 0.4)), PAL.metalDark, M);
        ctx.prop({ kind: 'acUnit', x: cx - p.nx * 1.35, z: cz - p.nz * 1.35, rot: ry + Math.PI, variant: 0 });
      }
      // the plant: condensers and meters bolted to whatever is there
      if (i % 4 === 1) {
        ctx.prop({ kind: 'acUnit', x: cx - p.nx * 0.14, z: cz - p.nz * 0.14, rot: ry + Math.PI, variant: rng.chance(0.4) ? 1 : 0 });
      }
      if (i % 7 === 2) {
        ctx.prop({ kind: 'meterBox', x: cx - p.nx * 0.12, z: cz - p.nz * 0.12, rot: ry + Math.PI, variant: rng.chance(0.5) ? 1 : 0 });
      }
      if (i % 9 === 4) {
        ctx.prop({ kind: rng.pick(['crate', 'boxStack', 'bucket', 'roadCone', 'parcelTrolley']),
          x: cx - p.nx * 1.0, z: cz - p.nz * 1.0, rot: ry + rng.range(-0.5, 0.5), seed: rng.int(0, 9999) });
      }
      ctx.collideRot(cx, cz, kind < 10 && kind >= 8 ? 2.8 : 0.4, len, ry);
    }
  }

  /* 月極駐車場 -- the monthly car park.  Every Kyoto block has one and it is
   * always exactly this: gravel, painted bays, a chain across the entrance and
   * one very tall lighting column. */
  {
    const p = atStreet('hanamikoji', 0.40, { side: 1, offset: 24 });
    if (!p) return;
    const y = ctx.groundAt(p.x, p.z);
    const ry = p.across;
    const cos = Math.cos(ry), sin = Math.sin(ry);
    const L = (lx, ly, lz, w, h, d, color, opts) => {
      b.add(box, trs(p.x + lx * cos + lz * sin, y + ly, p.z - lx * sin + lz * cos, 0, ry, 0)
        .scale(new THREE.Vector3(w, h, d)), color, opts);
    };
    ctx.platform({ x0: p.x - 9, z0: p.z - 9, x1: p.x + 9, z1: p.z + 9, top: y + 0.06 });
    L(0, 0.03, 0, 15.5, 0.08, 11.0, PAL.gravelDark, { bands: 3, tint: TINT.cool });
    for (let k = -3; k <= 3; k++) {
      L(k * 2.4, 0.09, 0, 0.10, 0.03, 4.8, PAL.plasterGrey, { bands: 'soft3', tint: TINT.cool });
    }
    L(0, 0.09, -2.5, 15.0, 0.03, 0.10, PAL.plasterGrey, { bands: 'soft3', tint: TINT.cool });
    L(-7.4, 3.1, 4.6, 0.13, 6.2, 0.13, PAL.metalWarm, M);
    L(-7.4, 6.25, 4.2, 0.34, 0.20, 0.62, PAL.metalDark, M);
    ctx.light({ x: p.x - 7.4 * cos, y: y + 6.2, z: p.z + 7.4 * sin, color: PAL.lanternLit, intensity: 0.4, distance: 16 });
    for (const [dx, kind, seed] of [[-4.6, 'van', 21], [1.2, 'taxi', 22], [3.7, 'van', 23]]) {
      ctx.prop({ kind, x: p.x + dx * cos, z: p.z - dx * sin, rot: ry, seed });
    }
    ctx.collide(p.x - 8, p.z - 6, p.x + 8, p.z - 5.4, y + 0.4);
  }
}

/* ------------------------------------------------------------------ *
 * A private alley.
 *
 * 2.7 m between the walls, which after the walker's 0.34 m radius leaves
 * 2.02 m of usable width -- so nothing may stand against these walls.
 * ------------------------------------------------------------------ */
function alley(ctx, b, box, m, len, rng) {
  const HALF = 1.35;
  const step = 2.5;
  const n = Math.max(2, Math.round(len / step));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const cx = m.x + m.nx * (u * len), cz = m.z + m.nz * (u * len);
    const y = ctx.groundAt(cx, cz);
    const ry = m.across;
    for (const s of [-1, 1]) {
      const wx = cx + m.tx * s * (HALF + 0.11), wz = cz + m.tz * s * (HALF + 0.11);
      const h = 2.2 + ((i + (s > 0 ? 1 : 0)) % 3) * 0.35;
      b.add(box, trs(wx, y + h / 2, wz, 0, ry, 0)
        .scale(new THREE.Vector3(0.22, h, len / n + 0.05)),
      (i + (s > 0 ? 2 : 0)) % 3 === 0 ? PAL.timberDark : PAL.plasterDark,
      (i + (s > 0 ? 2 : 0)) % 3 === 0 ? { bands: 3, tint: TINT.warm } : { bands: 'soft3', tint: TINT.cool });
      b.add(box, trs(wx, y + h + 0.06, wz, 0, ry, 0)
        .scale(new THREE.Vector3(0.34, 0.10, len / n + 0.05)), PAL.tileRidge,
      { bands: 3, tint: TINT.cool });
      ctx.collideRot(wx, wz, 0.30, len / n + 0.05, ry);
    }
    // the paving: 御影石 slabs down the middle
    b.add(box, trs(cx, y + 0.02, cz, 0, ry, 0)
      .scale(new THREE.Vector3(HALF * 2, 0.05, len / n + 0.02)),
    i % 2 ? PAL.paving : PAL.pavingDark, { bands: 3, tint: TINT.cool });
  }
  // a closed end, and a light over it
  {
    const cx = m.x + m.nx * (len + 0.4), cz = m.z + m.nz * (len + 0.4);
    const y = ctx.groundAt(cx, cz);
    b.add(box, trs(cx, y + 1.35, cz, 0, m.across, 0)
      .scale(new THREE.Vector3(HALF * 2 + 0.6, 2.7, 0.3)), PAL.plasterDark,
    { bands: 'soft3', tint: TINT.cool });
    ctx.collideRot(cx, cz, HALF * 2 + 0.6, 0.4, m.across);
    ctx.light({ x: cx, y: y + 2.3, z: cz, color: PAL.lanternLit, intensity: 0.35, distance: 8 });
  }
  // a couple of pots and a bicycle, half way down
  const h = m.nx * (len * 0.55), k = m.nz * (len * 0.55);
  ctx.tree({ kind: 'potted', x: m.x + h + m.tx * 0.9, z: m.z + k + m.tz * 0.9,
    y: ctx.groundAt(m.x + h, m.z + k), scale: 0.85, seed: rng.int(0, 9999) });
}

/** An invisible hitbox plus its prompt. */
function interactAt(ctx, x, y, z, r, label, action) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(r, r, r));
  m.position.set(x, y, z);
  m.visible = false;
  ctx.add(m);
  ctx.interact({ hitbox: m, label, action });
  return m;
}
