import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL } from './palette.js';

/* ------------------------------------------------------------------ *
 * Inverted-hull outlines for hero structures.
 *
 * The screen-space ink pass draws every line in the scene.  A handful of
 * objects want a heavier, deliberately drawn contour on top of that: the Yasaka
 * Pagoda, the shrine's west gate, Kiyomizu-dera's Niomon and stage, the stone
 * lanterns that punctuate a dark street.  Those get a back-faced shell pushed
 * outward along smoothed normals and offset in *clip* space, so the line keeps
 * a constant pixel width however far away it is -- which matters more here than
 * in a flat town, because the pagoda is seen from four hundred metres and from
 * four.
 *
 * Use it sparingly.  Outlining everything is the single most reliable way to
 * make a cel-shaded scene look like a cheap filter: the whole point of the two
 * systems is that the ink pass is *observed* line work and the hull is *drawn*
 * line work, and if everything is drawn there is no hierarchy left.
 * ------------------------------------------------------------------ */

const hullVert = /* glsl */ `
  uniform float uThickness;
  uniform vec2 uResolution;
  void main() {
    vec4 mv = modelViewMatrix * vec4( position, 1.0 );
    #ifdef USE_INSTANCING
      mv = modelViewMatrix * instanceMatrix * vec4( position, 1.0 );
    #endif
    vec3 n = normalize( normalMatrix * normal );
    #ifdef USE_INSTANCING
      n = normalize( normalMatrix * mat3( instanceMatrix ) * normal );
    #endif
    vec4 clip = projectionMatrix * mv;
    vec3 clipN = normalize( ( projectionMatrix * vec4( n, 0.0 ) ).xyz );
    vec2 aspect = vec2( uResolution.y / uResolution.x, 1.0 );
    clip.xy += clipN.xy * aspect * uThickness * clip.w * 0.5;
    gl_Position = clip;
  }
`;

const hullFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() { gl_FragColor = vec4( uColor, uOpacity ); }
`;

const _resolution = new THREE.Vector2(1920, 1080);
const _materials = new Set();

export function setOutlineResolution(w, h) {
  _resolution.set(w, h);
  _materials.forEach((m) => m.uniforms.uResolution.value.set(w, h));
}

const smoothCache = new WeakMap();

function smoothedGeometry(geo) {
  if (smoothCache.has(geo)) return smoothCache.get(geo);
  let g;
  try {
    g = mergeVertices(geo.clone(), 1e-4);
    g.computeVertexNormals();
  } catch {
    g = geo.clone();
  }
  // outlines only need positions and normals
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  }
  smoothCache.set(geo, g);
  return g;
}

/**
 * Attach an ink shell to `mesh`.  Thickness is in normalised device units --
 * ~0.0038 reads as a 2 px line at 1080p.
 */
export function hullOutline(mesh, { thickness = 0.0034, color = PAL.ink, opacity = 1 } = {}) {
  if (!mesh || !mesh.geometry) return null;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uThickness: { value: thickness },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uResolution: { value: _resolution.clone() },
    },
    vertexShader: hullVert,
    fragmentShader: hullFrag,
    side: THREE.BackSide,
    transparent: opacity < 1,
    depthWrite: true,
    fog: false,
  });
  _materials.add(mat);

  const geo = smoothedGeometry(mesh.geometry);
  let shell;
  if (mesh.isInstancedMesh) {
    shell = new THREE.InstancedMesh(geo, mat, mesh.count);
    shell.instanceMatrix = mesh.instanceMatrix;
    shell.count = mesh.count;
  } else {
    shell = new THREE.Mesh(geo, mat);
  }
  shell.castShadow = false;
  shell.receiveShadow = false;
  shell.renderOrder = (mesh.renderOrder || 0) - 1;
  shell.frustumCulled = mesh.frustumCulled;
  shell.userData.isOutline = true;
  mesh.add(shell);
  return shell;
}

/**
 * Outline every mesh in a subtree.  Meshes marked `userData.noOutline` are
 * skipped -- glass, cloth, foliage cards and anything transparent, which a hull
 * turns into a black rectangle.
 */
export function hullOutlineTree(root, opts = {}) {
  const targets = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.noOutline || o.userData.isOutline) return;
    const m = o.material;
    if (m && !Array.isArray(m) && m.transparent) return;
    targets.push(o);
  });
  for (const m of targets) hullOutline(m, opts);
  return root;
}
