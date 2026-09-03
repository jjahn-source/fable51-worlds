import * as THREE from 'three';
import { PAL } from './palette.js';
import { flat } from './toon.js';
import { cloudTex } from './textures.js';
import { rngKit, noShadow } from './util.js';

/* ------------------------------------------------------------------ *
 * Sky, clouds, and the ring of hills.
 *
 * Kyoto sits in a basin closed on three sides, and that is not a piece of
 * trivia -- it is the composition of every wide shot in the project.  From the
 * Kiyomizu overlook you are looking west across the city at the Nishiyama
 * range; from anywhere in Gion you are looking east at the wall of Higashiyama
 * that the whole route climbs.  So the horizon is never empty and never a
 * straight line, and the hills are built as four layers separated by value so
 * the distance reads.
 *
 * All of it is unlit `MeshBasicMaterial`: painted background flats, not
 * geometry that happens to be far away.  Anything here that took a light would
 * start to disagree with the sky behind it as the sun moved.
 * ------------------------------------------------------------------ */

export function buildSky(scene, radius = 900) {
  const geo = new THREE.SphereGeometry(radius, 32, 20);
  const uniforms = {
    uTop: { value: new THREE.Color(PAL.skyTop) },
    uMid: { value: new THREE.Color(PAL.skyMid) },
    uHaze: { value: new THREE.Color(PAL.skyHaze) },
    uBands: { value: 26.0 },
    uSunDir: { value: new THREE.Vector3(-0.5, 0.5, 0.7).normalize() },
    uSunGlow: { value: new THREE.Color(0xffe0b4) },
    uGlowAmount: { value: 0.0 },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: true,
    fog: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4( position, 1.0 );
        vWorld = wp.xyz - cameraPosition;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uMid, uHaze, uSunGlow;
      uniform float uBands, uGlowAmount;
      uniform vec3 uSunDir;
      varying vec3 vWorld;

      void main() {
        vec3 d = normalize( vWorld );
        float h = d.y;
        // soft quantisation: mostly smooth, with a faint painted step
        float t = clamp( h * 1.15 + 0.02, 0.0, 1.0 );
        float q = floor( t * uBands ) / uBands;
        t = mix( t, q, 0.35 );

        vec3 col = mix( uHaze, uMid, smoothstep( 0.0, 0.30, t ) );
        col = mix( col, uTop, smoothstep( 0.26, 0.92, t ) );
        // warmth low in the sky
        col = mix( col, uHaze, smoothstep( 0.12, -0.05, h ) * 0.6 );

        // a broad warm lift around the sun -- only turned up at sunset
        float sd = max( 0.0, dot( d, normalize( uSunDir ) ) );
        col = mix( col, uSunGlow, pow( sd, 3.0 ) * uGlowAmount );

        gl_FragColor = vec4( col, 1.0 );
      }
    `,
  });
  const dome = new THREE.Mesh(geo, mat);
  dome.frustumCulled = false;
  dome.renderOrder = -10;
  scene.add(dome);

  /* Clouds: two-plane billboards, no depth writes, a lighter and a darker
   * copy so each puff has a shaded underside. */
  const tex = cloudTex();
  const rng = rngKit(3311);
  const clouds = new THREE.Group();
  const matA = flat({ color: PAL.cloud, map: tex, transparent: true, opacity: 0.60, depthWrite: false, fog: false, cache: false });
  const matB = flat({ color: PAL.cloudShade, map: tex, transparent: true, opacity: 0.32, depthWrite: false, fog: false, cache: false });
  matA.map.wrapS = matA.map.wrapT = THREE.ClampToEdgeWrapping;

  for (let i = 0; i < 26; i++) {
    const r = rng.range(430, 720);
    const a = rng.range(0, Math.PI * 2);
    const w = rng.range(140, 320);
    const h = w * rng.range(0.22, 0.32);
    const y = rng.range(110, 280);
    const g = new THREE.Group();
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matB);
    back.position.set(3, -h * 0.11, -2.5);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matA);
    g.add(back, front);
    g.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    g.lookAt(0, y * 0.55, 0);
    g.renderOrder = -9;
    clouds.add(g);
  }
  clouds.frustumCulled = false;
  noShadow(clouds);
  scene.add(clouds);

  return { dome, clouds, uniforms };
}

/* ------------------------------------------------------------------ *
 * The basin.
 *
 * Four layers of ridge line, and one flat plate of city.
 *
 * The city plate is the part that has to be got right and is easy to get
 * wrong.  From the Kiyomizu stage you are 90 m above a basin floor that runs
 * 4 km west before the far hills, and the whole of it is *low* -- Kyoto has a
 * height limit and no towers, so from above it reads as a single grey-lilac
 * field with a texture of roofs, not as a skyline.  Modelling individual
 * distant buildings makes it look like a game level; a flat field with a few
 * value steps and one vertical accent (Kyoto Tower, 3.4 km WSW) makes it look
 * like the view.
 * ------------------------------------------------------------------ */

export function buildBasin(scene) {
  const group = new THREE.Group();
  group.name = 'basin';
  const rng = rngKit(9091);

  /* The ridges.  Placed by real bearing from the origin: Higashiyama is the
   * near wall to the east (which the world itself is built on, so its far
   * layers sit beyond the playable ground), Kitayama closes the north,
   * Nishiyama the west across the basin, and Daimonji stands out to the
   * north-east. */
  const layers = [
    { dir: 270, dist: 3400, h: 210, color: PAL.hillFar, width: 5200, bumps: 8, y: -40 },   // Nishiyama
    { dir: 300, dist: 4200, h: 250, color: PAL.hillFarthest, width: 6000, bumps: 6, y: -60 },
    { dir: 340, dist: 2600, h: 240, color: PAL.hillMid, width: 4200, bumps: 7, y: -30 },   // Kitayama
    { dir: 200, dist: 2800, h: 200, color: PAL.hillFar, width: 4000, bumps: 6, y: -30 },   // south-west
  ];

  for (const L of layers) {
    const pts = [];
    const n = 96;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = (t - 0.5) * L.width;
      let y = 0;
      for (let b = 1; b <= L.bumps; b++) {
        y += Math.sin(t * Math.PI * b * 1.7 + b * 2.1 + L.dir) * (L.h / (b * 1.25));
      }
      pts.push(new THREE.Vector2(x, Math.max(4, y * 0.55 + L.h * 0.55)));
    }
    const shape = new THREE.Shape();
    shape.moveTo(pts[0].x, -400);
    pts.forEach((p) => shape.lineTo(p.x, p.y));
    shape.lineTo(pts[pts.length - 1].x, -400);
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), flat({ color: L.color, fog: false }));
    const a = (L.dir * Math.PI) / 180;
    // bearing: 0 = north = -Z
    mesh.position.set(Math.sin(a) * L.dist, L.y, -Math.cos(a) * L.dist);
    mesh.lookAt(0, L.y + 40, 0);
    mesh.renderOrder = -8;
    group.add(mesh);
  }

  /* The city floor: a large plate at the basin's elevation, in three value
   * steps so the distance reads, with a scatter of slightly darker blocks that
   * suggest roof texture without ever becoming buildings. */
  /* The plate starts 900 m west of the origin and runs out to the far hills.
   * It must **not** reach back under the playable ground: at 38 m ASL it is
   * below every street in the world, so an over-large plate does not merely
   * z-fight -- it renders as a pale wall across the middle distance of every
   * westward view, which is what the first render of this did. */
  const CITY_X = -2600, CITY_Z = -240;
  const cityMat = flat({ color: 0xc6c8d8, fog: false });
  const city = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3600), cityMat);
  city.rotation.x = -Math.PI / 2;
  city.position.set(CITY_X, 38, CITY_Z);
  city.renderOrder = -7;
  group.add(city);

  const blockGeos = [];
  for (let i = 0; i < 460; i++) {
    const x = CITY_X + rng.range(-1500, 1500);
    const z = CITY_Z + rng.range(-1700, 1700);
    const w = rng.range(26, 90);
    const dep = rng.range(26, 90);
    const hh = rng.range(6, 17);
    const g = new THREE.BoxGeometry(w, hh, dep);
    g.translate(x, 38 + hh / 2, z);
    blockGeos.push(g);
  }
  const merged = mergeAll(blockGeos);
  if (merged) {
    const blocks = new THREE.Mesh(merged, flat({ color: 0xb9bccf, fog: false }));
    blocks.renderOrder = -7;
    group.add(blocks);
  }

  /* Kyoto Tower: 131 m, about 3.4 km west-south-west of the pagoda, and the
   * only vertical in the basin.  It is what tells you which way you are
   * looking from the overlook. */
  const towerMat = flat({ color: 0xd8d2d6, fog: false });
  const tower = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 9.0, 78, 8), towerMat);
  shaft.position.y = 39;
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 12.5, 16, 10), towerMat);
  pod.position.y = 84;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 2.2, 34, 6), towerMat);
  mast.position.y = 108;
  const base = new THREE.Mesh(new THREE.BoxGeometry(46, 30, 40), flat({ color: 0xc2c0cc, fog: false }));
  base.position.y = 15;
  tower.add(shaft, pod, mast, base);
  {
    const a = (252 * Math.PI) / 180;   // WSW
    tower.position.set(Math.sin(a) * 3400, 38, -Math.cos(a) * 3400);
  }
  tower.renderOrder = -7;
  group.add(tower);

  noShadow(group);
  group.traverse((o) => { o.frustumCulled = false; });
  scene.add(group);
  return group;
}

function mergeAll(geos) {
  if (!geos.length) return null;
  const pos = [];
  const idxs = [];
  let offset = 0;
  for (const g of geos) {
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i++) pos.push(p[i]);
    const idx = g.index ? g.index.array : null;
    if (idx) for (let i = 0; i < idx.length; i++) idxs.push(idx[i] + offset);
    offset += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (idxs.length) out.setIndex(idxs);
  out.computeVertexNormals();
  return out;
}
