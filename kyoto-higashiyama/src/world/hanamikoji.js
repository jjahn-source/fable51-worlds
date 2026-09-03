import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { TINT, celTex } from '../core/toon.js';
import { rngKit } from '../core/util.js';
import { lanternTex, woodenSign, noticeBoard } from '../core/textures.js';
import { makeMachiya, KEN } from '../kit/machiya.js';
import { layoutPlots, alongStreet, atStreet } from './plots.js';

/* ------------------------------------------------------------------ *
 * 花見小路通 -- Hanamikoji.
 *
 * The reference district.  Every other street in the world is built the same
 * way, and if you are writing one, read this file first.
 *
 * ------------------------------------------------------------ THE STREET
 *
 * 267 m from Shijo south to Kennin-ji, bearing 188.5 deg, and **dead flat** --
 * 39.0 m at both ends, which is unusual enough in Higashiyama to be worth
 * saying: this is the one hero street on the route with no climb in it at all.
 * The whole of the rest of the walk goes uphill, so Hanamikoji has to earn its
 * place on frontage alone.
 *
 * 8.4 m face to face (ARCH.md 3.4; the 11 m in Kyoto City's road table is a
 * 1947 planning line never executed on this stretch), granite sett, and the
 * wires were put underground in 2001 -- so **no poles here**, which is exactly
 * what makes it photograph the way it does.
 *
 * ---------------------------------------------------------- THE FRONTAGE
 *
 * The buildings are 本2階建町家茶屋様式 -- the ochaya form:
 *
 *   - 弁柄 bengara red-ochre timber.  NOT vermilion; it is about half the
 *     chroma, and confusing the two is the likeliest colour error in the
 *     project.  A whole street of it, and it still reads as brown until the
 *     sun catches it.
 *   - a cantilevered second storey, 0.45 m out over the pavement
 *   - 簾 sudare blinds behind fine lattice on the upper floor
 *   - 駒寄せ komayose -- the low timber fence claiming the eave strip.  This,
 *     not the inuyarai, is the Gion default.
 *   - **almost no signage.**  An ochaya does not advertise.  What it has is a
 *     small wooden nameplate by the door and a red lantern, and that is the
 *     whole of it.  The single fastest way to make this street look wrong is
 *     to hang shop signs on it.
 *
 * ------------------------------------------------------------- THE RHYTHM
 *
 * Plots come off `layoutPlots` snapped to the ken, so the posts line up across
 * the gaps and a run of six houses reads as one wall with a beat rather than
 * as six objects.  The mix is weighted so a wide frontage is followed by
 * narrow ones -- phrases, not noise.
 * ------------------------------------------------------------------ */

export const id = 'hanamikoji';

export function build(ctx) {
  const rng = rngKit(20240);
  const bakerName = 'hanamikoji';
  const out = { buildings: [], plots: [] };

  /* ------------------------------ the frontage ----------------------------- */
  for (const side of [-1, 1]) {
    const plots = layoutPlots({
      street: 'hanamikoji',
      side,
      from: 0.03, to: 0.97,
      mix: 'ochaya',
      gap: 0.03,               // party walls: the row is continuous
      seed: 501 + side,
      /* Two gaps per side for the private alleys that run off Hanamikoji --
       * the ones with the "this is a private road" notices on them.  They are
       * a real feature of the street and they let light into the row. */
      skip: side < 0 ? [[0.33, 0.37], [0.70, 0.735]] : [[0.52, 0.555]],
    });
    out.plots.push(...plots);

    let prevStyle = null;
    plots.forEach((p, i) => {
      /* Mostly ochaya, with the occasional ordinary residence and, near the
       * Shijo end where the street is more commercial, a shop.  Never two of
       * the same unusual style in a row. */
      const northEnd = p.t < 0.18;
      let style = 'ochaya';
      if (northEnd && rng.chance(0.45)) style = 'shop';
      else if (rng.chance(0.16)) style = 'residence';
      if (style === prevStyle && style !== 'ochaya') style = 'ochaya';
      prevStyle = style;

      const b = makeMachiya(ctx, {
        x: p.x, z: p.z, ry: p.ry,
        width: p.width,
        depth: rng.range(9, 15),
        style,
        /* Seated on the LOW corner: the street is flat, so this is a no-op
         * here, but every other district needs it and copying this file is
         * how they will get it. */
        y: p.yLow,
        seed: (7919 * (i + 1) + (side > 0 ? 101 : 7)) >>> 0,
        baker: bakerName,
        /* A little tonal variety inside one language: some houses are darker
         * bengara, a couple are the plain sumi timber of an older frontage. */
        timberTone: style === 'ochaya'
          ? (rng.chance(0.22) ? PAL.bengaraDeep : PAL.bengara)
          : PAL.timber,
        plasterTone: rng.chance(0.35) ? PAL.plasterOchre : PAL.plasterWarm,
        roofMaterial: rng.chance(0.2) ? 'tileOld' : 'tile',
      });
      out.buildings.push(b);
      ctx.stats.buildings++;
      if (style === 'shop') ctx.stats.shopfronts++;
    });
  }

  /* ------------------------------- lanterns ------------------------------- */
  /* 提灯 on wall brackets.  The one saturated thing on the street, spaced
   * irregularly because they belong to individual houses rather than to the
   * street -- an evenly spaced run reads as municipal lighting.
   *
   * They are also the reason to walk this street at dusk, so they get a real
   * emissive and are registered as lights. */
  const lanternTexShared = lanternTex('', {
    paper: PAL.lanternRed, textColor: PAL.paper, ribs: 9, band: PAL.lanternFrame,
  });
  const lanternMat = celTex(lanternTexShared, {
    bands: 'soft', tint: TINT.warm, color: 0xffffff,
  });
  const lanternGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.34, 10, 1, true);

  for (const side of [-1, 1]) {
    const pts = alongStreet({
      street: 'hanamikoji', side, from: 0.05, to: 0.95,
      spacing: 9.5, jitter: 3.4, seed: 88 + side, offset: 4.0,
    });
    for (const pt of pts) {
      if (!rng.chance(0.62)) continue;
      const y = pt.y + 2.72;
      const m = new THREE.Mesh(lanternGeo, lanternMat);
      m.position.set(pt.x, y, pt.z);
      m.rotation.y = pt.ry;
      m.userData.noOutline = true;
      ctx.add(m);
      // the bracket that carries it
      ctx.baker(bakerName).add(
        new THREE.BoxGeometry(0.055, 0.055, 0.42),
        new THREE.Matrix4().compose(
          new THREE.Vector3(pt.x + pt.nx * 0.2, y + 0.20, pt.z + pt.nz * 0.2),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pt.ry, 0)),
          new THREE.Vector3(1, 1, 1)
        ),
        PAL.timberDark, { bands: 3, tint: TINT.warm }
      );
      ctx.light({ x: pt.x, y, z: pt.z, color: PAL.lanternLit, intensity: 0.5, distance: 7 });
    }
  }

  /* --------------------------- the private alleys -------------------------- */
  /* 「ここは私道です。通り抜けできません」 -- the notices that went up on the
   * alleys off Hanamikoji in 2019 and again in 2024.  They are small, they are
   * real, and they are one of the few pieces of text on the whole street. */
  const noticeTex = noticeBoard(
    ['ここは私道です', '通り抜けできません', 'PRIVATE ROAD', 'NO THOROUGHFARE'],
    { board: 0x3a3028, textColor: PAL.paper, accent: PAL.gold, w: 256, h: 320 }
  );
  const noticeMat = celTex(noticeTex, { bands: 3, tint: TINT.cool });
  for (const t of [0.35, 0.72, 0.54]) {
    const a = atStreet('hanamikoji', t, { side: t === 0.54 ? 1 : -1, offset: 4.3 });
    if (!a) continue;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), noticeMat);
    m.position.set(a.x, a.y + 1.52, a.z);
    m.rotation.y = a.across;
    m.userData.noOutline = true;
    ctx.add(m);
  }

  /* ------------------------------ the surface ------------------------------ */
  /* Potted plants against the komayose, a bicycle or two, and nothing else.
   * Gion is deliberately the emptiest street in the world: the clutter starts
   * at Ninenzaka, and the contrast is the point. */
  for (const side of [-1, 1]) {
    for (const pt of alongStreet({
      street: 'hanamikoji', side, from: 0.06, to: 0.94,
      spacing: 7.0, jitter: 3.0, seed: 300 + side, offset: 4.05,
    })) {
      if (rng.chance(0.34)) {
        ctx.prop({ kind: 'planter', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry, seed: rng.int(0, 9999) });
      } else if (rng.chance(0.10)) {
        ctx.prop({ kind: 'bicycle', x: pt.x, z: pt.z, y: pt.y, rot: pt.ry + Math.PI / 2, seed: rng.int(0, 9999) });
      }
    }
  }

  /* A taxi waiting at the Shijo end, and a delivery van deep in the street.
   * Both are traces of people rather than people -- the world's whole policy. */
  {
    const a = atStreet('hanamikoji', 0.06, { side: 1, offset: 2.0 });
    if (a) ctx.prop({ kind: 'taxi', x: a.x, z: a.z, y: a.y, rot: a.along, seed: 11 });
    const b = atStreet('hanamikoji', 0.62, { side: -1, offset: 1.9 });
    if (b) ctx.prop({ kind: 'van', x: b.x, z: b.z, y: b.y, rot: b.along + Math.PI, seed: 12 });
  }

  /* ------------------------------- vegetation ------------------------------ */
  /* Restrained, urban, and mostly in pots.  There is no street planting on
   * Hanamikoji; what green there is belongs to the houses.  Two willows at the
   * Shijo end where the street meets the Shirakawa's catchment. */
  for (const side of [-1, 1]) {
    for (const pt of alongStreet({
      street: 'hanamikoji', side, from: 0.10, to: 0.92,
      spacing: 16, jitter: 5, seed: 400 + side, offset: 4.6,
    })) {
      if (rng.chance(0.30)) {
        ctx.tree({
          kind: 'potted', x: pt.x, z: pt.z, y: pt.y,
          scale: rng.range(0.8, 1.15), rot: rng.range(0, 6.28), seed: rng.int(0, 9999),
        });
      }
    }
  }

  return out;
}
