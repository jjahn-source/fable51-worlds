import * as THREE from 'three';
import { PAL } from './palette.js';

/* ------------------------------------------------------------------ *
 * Cel shading.
 *
 * Everything in the world uses MeshToonMaterial with a hand-authored gradient
 * ramp, so direct sun is quantised into 2-4 flat bands instead of a smooth
 * falloff.  On top of that the toon BRDF is patched so the darker bands are
 * *tinted* toward a cool violet rather than merely being a darker version of
 * the base colour.  That hue shift in shadow is most of what separates "anime
 * cel" from "low-poly 3D with a posterise filter".
 *
 * Three things here are specific to Higashiyama:
 *
 *   1. `bands: 'soft'` and `'soft3'` are high-key ramps whose *darkest* stop is
 *      still bright.  Blossom, paper, plaster and the shrine's white gravel use
 *      them.  A cherry tree on a 3-band ramp loses its shadow side into the
 *      timber's value range and the tree stops reading as a light mass, which
 *      is the failure this project cannot afford.
 *
 *   2. `tint` defaults to a violet but timber and vermilion pass a *warmer*
 *      one.  A red-ochre ochaya facade with a violet shadow goes purple, which
 *      is a thing that does not happen to lacquer in life.
 *
 *   3. `celTex` exists because roughly a third of the world is textured (every
 *      sign, every tiled roof, every lattice) and those materials cannot be
 *      cached by colour alone.
 * ------------------------------------------------------------------ */

const RAMPS = {
  2: [96, 255],
  3: [92, 178, 255],
  4: [80, 142, 202, 255],
  5: [74, 124, 172, 214, 255],
  // high-key: for blossom, paper, plaster and gravel, which must stay light
  // even on the shadow side
  soft: [184, 255],
  soft3: [176, 216, 255],
  soft4: [172, 206, 234, 255],
  // low-key: for the inside of a shop recess, a tunnel of eaves, deep foliage
  deep: [56, 132, 255],
};

const rampCache = new Map();

export function gradientMap(bands = 3) {
  if (rampCache.has(bands)) return rampCache.get(bands);
  const stops = RAMPS[bands] || RAMPS[3];
  const data = new Uint8Array(stops.length * 4);
  for (let i = 0; i < stops.length; i++) {
    data[i * 4 + 0] = stops[i];
    data[i * 4 + 1] = stops[i];
    data[i * 4 + 2] = stops[i];
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  rampCache.set(bands, tex);
  return tex;
}

/** Shadow tints.  Violet by default; the warm ones are for timber and lacquer. */
export const TINT = {
  cool: 0x6a5f8c,       // the default -- violet, for plaster, stone, paving
  coolDeep: 0x584d7c,   // stronger, for large pale masses that need to sit down
  warm: 0x7c5f6e,       // timber: the shadow leans red-brown, not purple
  warmDeep: 0x6a4a52,   // bengara, vermilion
  green: 0x5c6e7a,      // foliage: a blue-green shadow, never violet
  neutral: 0x7a7484,
};

const TOON_CHUNK = 'lights_toon_pars_fragment';
const TOON_LINE =
  'vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;';
const TOON_PATCH = `
	vec3 celBand = getGradientIrradiance( geometryNormal, directLight.direction );
	vec3 irradiance = celBand * mix( uShadowTint, vec3( 1.0 ), celBand ) * directLight.color;`;

let patchAvailable = false;
let patchedChunk = '';
{
  const src = THREE.ShaderChunk[TOON_CHUNK];
  if (src && src.includes(TOON_LINE)) {
    patchedChunk = 'uniform vec3 uShadowTint;\n' + src.replace(TOON_LINE, TOON_PATCH);
    patchAvailable = true;
  } else if (typeof console !== 'undefined') {
    console.warn('[toon] shadow-tint patch did not apply — three.js toon chunk changed shape');
  }
}

function applyShadowTint(mat, tint) {
  if (!patchAvailable) return mat;
  const uni = { value: new THREE.Color(tint) };
  mat.userData.shadowTint = uni;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uShadowTint = uni;
    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <${TOON_CHUNK}>`,
      patchedChunk
    );
  };
  const hex = new THREE.Color(tint).getHexString();
  mat.customProgramCacheKey = () => 'celTint_' + hex;
  return mat;
}

const matCache = new Map();

/**
 * Cel-shaded material factory.  Untextured results are cached by parameter
 * signature so the whole district ends up sharing a few dozen shader programs.
 */
export function cel(opts = {}) {
  const {
    color = 0xffffff,
    bands = 3,
    tint = TINT.cool,
    flat: flatShading = true,
    map = null,
    emissive = null,
    emissiveIntensity = 1,
    transparent = false,
    opacity = 1,
    side = THREE.FrontSide,
    alphaTest = 0,
    depthWrite = null,
    fog = true,
    alphaMap = null,
    vertexColors = false,
    cache = true,
  } = opts;

  const key = cache && !map && !alphaMap
    ? [color, bands, tint, flatShading, emissive, emissiveIntensity, transparent,
       opacity, side, alphaTest, depthWrite, fog, vertexColors].join('|')
    : null;
  if (key && matCache.has(key)) return matCache.get(key);

  /* NOTE: `flatShading` is deliberately not passed.
   *
   * `THREE.MeshToonMaterial` does not declare it -- three warns
   * "'flatShading' is not a property of THREE.MeshToonMaterial" and drops it --
   * so setting it was a no-op that produced a console warning on every material
   * in the world.  It does not matter here: faceting comes from the geometry.
   * `BoxGeometry` and friends already carry per-face normals through
   * `mergeGeometries`, so baked masses stay crisply faceted, and the places that
   * want a smooth surface (a curved roof plane, the ground grid, a lathe) call
   * `computeVertexNormals` on indexed geometry and get one.
   *
   * `flat` is still part of the cache key, so callers that pass it keep their
   * own material bucket and nothing downstream changes. */
  const mat = new THREE.MeshToonMaterial({
    color,
    gradientMap: gradientMap(bands),
    map,
    alphaMap,
    transparent,
    opacity,
    side,
    alphaTest,
    fog,
    vertexColors,
    emissive: emissive === null ? 0x000000 : emissive,
    emissiveIntensity,
  });
  if (depthWrite !== null) mat.depthWrite = depthWrite;
  applyShadowTint(mat, tint);
  if (key) matCache.set(key, mat);
  return mat;
}

/**
 * A textured cel material, cached on the texture's uuid so the same sign atlas
 * reused across forty shopfronts is one program and one material.
 */
const texMatCache = new Map();
export function celTex(map, opts = {}) {
  const key = [map.uuid, opts.color ?? 0xffffff, opts.bands ?? 3, opts.tint ?? TINT.cool,
               opts.side ?? THREE.FrontSide, opts.transparent ?? false,
               opts.alphaTest ?? 0, opts.flat ?? true].join('|');
  if (texMatCache.has(key)) return texMatCache.get(key);
  const m = cel({ ...opts, map, cache: false });
  texMatCache.set(key, m);
  return m;
}

const flatCache = new Map();

/** Unlit flat colour -- sky, distant silhouettes, glowing paper, water sky. */
export function flat(opts = {}) {
  const {
    color = 0xffffff,
    map = null,
    transparent = false,
    opacity = 1,
    side = THREE.FrontSide,
    alphaTest = 0,
    depthWrite = null,
    fog = true,
    cache = true,
    toneMapped = true,
    vertexColors = false,
  } = opts;
  const key = cache && !map
    ? [color, transparent, opacity, side, alphaTest, depthWrite, fog, toneMapped, vertexColors].join('|')
    : null;
  if (key && flatCache.has(key)) return flatCache.get(key);
  const mat = new THREE.MeshBasicMaterial({
    color, map, transparent, opacity, side, alphaTest, fog, toneMapped, vertexColors,
  });
  if (depthWrite !== null) mat.depthWrite = depthWrite;
  if (key) flatCache.set(key, mat);
  return mat;
}

/* ------------------------------------------------------------------ *
 * Named materials.
 *
 * Anything used in more than one district lives here, so a change to what
 * "roof tile" means is one edit rather than forty.  These are getters because
 * `cel` caches: calling one twice returns the identical material instance, and
 * that is the whole point -- one draw call per material, not per caller.
 * ------------------------------------------------------------------ */
export const MAT = {
  get ink() { return flat({ color: PAL.ink, fog: false }); },

  // timber
  get timber() { return cel({ color: PAL.timber, bands: 3, tint: TINT.warm }); },
  get timberDark() { return cel({ color: PAL.timberDark, bands: 2, tint: TINT.warm }); },
  get timberMid() { return cel({ color: PAL.timberMid, bands: 3, tint: TINT.warm }); },
  get timberWarm() { return cel({ color: PAL.timberWarm, bands: 3, tint: TINT.warm }); },
  get timberPale() { return cel({ color: PAL.timberPale, bands: 3, tint: TINT.warm }); },
  get timberGrey() { return cel({ color: PAL.timberGrey, bands: 3, tint: TINT.cool }); },
  get bengara() { return cel({ color: PAL.bengara, bands: 3, tint: TINT.warmDeep }); },

  // plaster
  get plaster() { return cel({ color: PAL.plaster, bands: 'soft3', tint: TINT.cool }); },
  get plasterWarm() { return cel({ color: PAL.plasterWarm, bands: 'soft3', tint: TINT.cool }); },
  get plasterOchre() { return cel({ color: PAL.plasterOchre, bands: 3, tint: TINT.cool }); },

  // roof
  get tile() { return cel({ color: PAL.tileRoof, bands: 3, tint: TINT.cool }); },
  get tileEdge() { return cel({ color: PAL.tileEdge, bands: 3, tint: TINT.cool }); },
  get tileRidge() { return cel({ color: PAL.tileRidge, bands: 3, tint: TINT.cool }); },
  get hiwada() { return cel({ color: PAL.hiwada, bands: 3, tint: TINT.warm }); },
  get hiwadaEdge() { return cel({ color: PAL.hiwadaEdge, bands: 3, tint: TINT.warm }); },

  // vermilion
  get vermilion() { return cel({ color: PAL.vermilion, bands: 3, tint: TINT.warmDeep }); },
  get vermilionDeep() { return cel({ color: PAL.vermilionDeep, bands: 3, tint: TINT.warmDeep }); },
  get gatePanel() { return cel({ color: PAL.gatePanel, bands: 'soft3', tint: TINT.cool }); },

  // stone & ground
  get paving() { return cel({ color: PAL.paving, bands: 3, tint: TINT.cool }); },
  get stone() { return cel({ color: PAL.stone, bands: 3, tint: TINT.cool }); },
  get stoneDark() { return cel({ color: PAL.stoneDark, bands: 3, tint: TINT.cool }); },
  get stoneWall() { return cel({ color: PAL.stoneWall, bands: 3, tint: TINT.cool }); },
  get gravel() { return cel({ color: PAL.gravel, bands: 'soft3', tint: TINT.cool }); },
  get concrete() { return cel({ color: PAL.concrete, bands: 3, tint: TINT.cool }); },
  get asphalt() { return cel({ color: PAL.asphalt, bands: 3, tint: TINT.cool }); },

  // paper & cloth
  get paper() { return cel({ color: PAL.paper, bands: 'soft', tint: TINT.cool }); },
  get paperLit() { return cel({ color: PAL.paper, bands: 'soft', emissive: PAL.paperLit, emissiveIntensity: 0.55 }); },

  // foliage
  get moss() { return cel({ color: PAL.moss, bands: 3, tint: TINT.green }); },
  get bamboo() { return cel({ color: PAL.bamboo, bands: 3, tint: TINT.green }); },
  get trunk() { return cel({ color: PAL.trunk, bands: 3, tint: TINT.warm }); },

  // blossom -- always high-key
  get blossom() { return cel({ color: PAL.blossom, bands: 'soft3', tint: 0xc8a8c0 }); },
  get blossomLight() { return cel({ color: PAL.blossomLight, bands: 'soft', tint: 0xd0b4c8 }); },

  // misc
  get glass() { return flat({ color: PAL.glassDark }); },
  get metal() { return cel({ color: PAL.metal, bands: 4, tint: TINT.cool, flat: false }); },
  get iron() { return cel({ color: PAL.iron, bands: 3, tint: TINT.cool }); },
  get interior() { return cel({ color: PAL.shopInterior, bands: 'deep', tint: TINT.warm }); },
};
