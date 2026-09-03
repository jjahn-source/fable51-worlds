import * as THREE from 'three';
import { PAL } from '../core/palette.js';

/* ------------------------------------------------------------------ *
 * Time of day.
 *
 * Four states, not a continuous cycle.  A slider would be a worse product:
 * each of these is a *composition* -- a chosen sun angle, a chosen shadow
 * length, a chosen grade -- and the in-between angles are the ones where the
 * street looks like nothing in particular.
 *
 *   morning   the sun still low in the east, so it comes UP the hill and down
 *             every east-west street.  Long shadows the length of Yasaka-dori.
 *   day       the default.  Sun high and to the south-west, which is what puts
 *             light on the pagoda's west face -- the classic postcard.
 *   sunset    the payoff.  Sun low in the west, so the whole route is lit from
 *             behind the player as they climb, and Kiyomizu's overlook faces
 *             straight into it.
 *   dusk      after the sun.  Almost no key at all, a strong cool ambient, and
 *             the lanterns become the only warm thing in the frame.
 *
 * The sun *direction* is what moves; its distance from the player is fixed, so
 * the shadow camera keeps its budget.
 * ------------------------------------------------------------------ */

const STATES = {
  morning: {
    name: 'morning · 朝',
    grade: 'morning',
    /** azimuth in degrees from north, elevation in degrees */
    az: 104, el: 21,
    sun: PAL.sun, sunI: 2.05,
    fillDir: [0.6, 0.42, -0.68], fill: PAL.fill, fillI: 1.16,
    bounceI: 0.30,
    hemiI: 1.16, hemiSky: PAL.hemiSky, hemiGround: PAL.hemiGround,
    fog: [PAL.fogWarm, 60, 300],
    skyTop: 0x9cc0e8, skyMid: 0xdae8f6, skyHaze: 0xfceee0,
    glow: 0.10,
  },
  day: {
    name: 'afternoon · 昼',
    grade: 'day',
    az: 232, el: 48,
    sun: PAL.sun, sunI: 2.30,
    fillDir: [-0.55, 0.34, 0.72], fill: PAL.fill, fillI: 1.05,
    bounceI: 0.32,
    hemiI: 1.10, hemiSky: PAL.hemiSky, hemiGround: PAL.hemiGround,
    fog: [PAL.fog, 70, 340],
    skyTop: PAL.skyTop, skyMid: PAL.skyMid, skyHaze: PAL.skyHaze,
    glow: 0.04,
  },
  sunset: {
    name: 'sunset · 夕',
    grade: 'sunset',
    az: 274, el: 9,
    sun: PAL.sunLow, sunI: 2.35,
    fillDir: [0.42, 0.5, -0.75], fill: 0x8ea0e0, fillI: 1.02,
    bounceI: 0.40,
    hemiI: 0.96, hemiSky: 0xe8d4e0, hemiGround: 0x9c86ac,
    fog: [0xf0dcd0, 55, 300],
    skyTop: 0x7d9ed4, skyMid: 0xe0cfd8, skyHaze: 0xffcfa8,
    glow: 0.52,
  },
  dusk: {
    name: 'dusk · 暮',
    grade: 'dusk',
    az: 290, el: -4,
    sun: 0xd8b8c0, sunI: 0.62,
    fillDir: [0.3, 0.62, -0.72], fill: 0x7c8ccc, fillI: 0.92,
    bounceI: 0.34,
    hemiI: 0.86, hemiSky: 0xb4bcdc, hemiGround: 0x6e6288,
    fog: [0xc8c0d8, 44, 250],
    skyTop: 0x4e5e94, skyMid: 0x9c9ccc, skyHaze: 0xd8a8a4,
    glow: 0.30,
  },
};

const ORDER = ['day', 'morning', 'sunset', 'dusk'];

export function createTimeOfDay({ scene, sun, fill, bounce, hemi, sky }) {
  let index = 0;
  const dir = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const DIST = 90;

  function apply(key) {
    const s = STATES[key];
    const az = (s.az * Math.PI) / 180;
    const el = (s.el * Math.PI) / 180;
    // bearing 0 = north = -Z
    dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();

    sun.color.set(s.sun);
    sun.intensity = s.sunI;
    fill.color.set(s.fill);
    fill.intensity = s.fillI;
    fill.position.set(...s.fillDir).multiplyScalar(60);
    fill.target.position.set(0, 0, 0);
    bounce.intensity = s.bounceI;
    bounce.position.set(8, -30, 44);
    bounce.target.position.set(0, 0, 0);
    hemi.intensity = s.hemiI;
    hemi.color.set(s.hemiSky);
    hemi.groundColor.set(s.hemiGround);

    scene.fog.color.set(s.fog[0]);
    scene.fog.near = s.fog[1];
    scene.fog.far = s.fog[2];

    const u = sky.uniforms;
    u.uTop.value.set(s.skyTop);
    u.uMid.value.set(s.skyMid);
    u.uHaze.value.set(s.skyHaze);
    u.uSunDir.value.copy(dir);
    u.uGlowAmount.value = s.glow;

    api.name = s.name;
    api.grade = s.grade;
    api.key = key;
    api.dir = dir;
  }

  const api = {
    name: STATES.day.name,
    grade: 'day',
    key: 'day',
    dir,
    /** Point the key light at a focus, keeping its direction. */
    aim(target) {
      focus.copy(target);
      sun.target.position.copy(focus);
      sun.position.copy(focus).addScaledVector(dir, DIST);
      fill.target.position.copy(focus);
      fill.position.copy(focus).add(new THREE.Vector3(...STATES[api.key].fillDir).multiplyScalar(60));
      bounce.target.position.copy(focus);
      bounce.position.copy(focus).add(new THREE.Vector3(8, -30, 44));
    },
    set(key) { if (STATES[key]) { index = ORDER.indexOf(key); apply(key); } return api.name; },
    cycle() {
      index = (index + 1) % ORDER.length;
      apply(ORDER[index]);
      return api.name;
    },
    update() {},
    states: STATES,
  };

  apply('day');
  return api;
}
