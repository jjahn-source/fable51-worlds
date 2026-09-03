import * as THREE from 'three';
import { LANDMARK } from '../data/route.js';
import { lerp } from '../core/util.js';

/* ------------------------------------------------------------------ *
 * Cameras: the overview, and photo mode.
 *
 * Photo mode is the one piece of UI the project actively wants, because the
 * whole thing is built to be looked at: it hides the HUD, widens slightly, and
 * lets the player stand still and turn.  It does *not* add a filter, a frame,
 * a sticker, or a depth-of-field blur.  The image is already graded.
 * ------------------------------------------------------------------ */

export function createCameras({ camera, player, world }) {
  let overview = false;
  let photo = false;
  let orbit = 0;
  const target = new THREE.Vector3(120, 90, 30);
  const savedFov = camera.fov;

  const api = {
    get overview() { return overview; },
    get photo() { return photo; },

    setOverview(on) {
      overview = !!on;
      if (overview) {
        orbit = typeof on === 'number' ? on : 2.4;
      } else {
        camera.fov = savedFov;
        camera.updateProjectionMatrix();
        player.applyCamera(0);
      }
    },

    toggleOverview() { api.setOverview(!overview); },

    togglePhoto() {
      photo = !photo;
      document.getElementById('hud').style.opacity = photo ? '0' : '1';
      camera.fov = photo ? 40 : savedFov;
      camera.updateProjectionMatrix();
    },

    update(dt) {
      if (!overview) return;
      orbit += dt * 0.055;
      /* The overview looks at the middle of the route from the south-west and
       * a long way up: from there the pagoda, the shrine's trees and the
       * temple's roof are all in one frame, which is the only view that shows
       * the whole climb at once. */
      const r = 720;
      camera.position.set(
        target.x + Math.sin(orbit) * r,
        target.y + 330,
        target.z + Math.cos(orbit) * r
      );
      camera.up.set(0, 1, 0);
      camera.lookAt(target.x, target.y - 40, target.z);
    },
  };

  return api;
}

/* ------------------------------------------------------------------ *
 * Hero views.
 *
 * Thirty-odd authored camera positions.  These are the frames the project is
 * graded on, and every one of them is a real photographic viewpoint in
 * Higashiyama -- the corner people actually stand on, facing the way they
 * actually face.  `yaw` is the three.js camera yaw: 0 looks toward -Z (north),
 * +pi/2 looks toward -X (west).
 *
 * `use `node tools/capture.mjs` to render the lot.
 * ------------------------------------------------------------------ */

/** yaw that looks from (x,z) toward (tx,tz). */
const look = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z));

const P = LANDMARK;

export const HERO_VIEWS = [
  // ---------------------------------- Gion ----------------------------------
  { id: 'gion-hanamikoji-north', name: 'Hanamikoji, looking south from Shijo',
    x: -382, z: -578, yaw: look(-382, -578, -410, -390), pitch: 0.02,
    note: 'the opening frame' },
  { id: 'gion-hanamikoji-mid', name: 'Hanamikoji, mid-street',
    x: -396, z: -484, yaw: look(-396, -484, -416, -348), pitch: -0.01 },
  { id: 'gion-hanamikoji-dusk', name: 'Hanamikoji at dusk',
    x: -402, z: -440, yaw: look(-402, -440, -419, -330), pitch: 0.03, time: 'dusk' },
  { id: 'gion-hanamikoji-back', name: 'Hanamikoji, looking back north',
    x: -412, z: -370, yaw: look(-412, -370, -382, -586), pitch: 0.02 },
  { id: 'gion-shinbashi', name: 'Shinbashi-dori, the stone lane',
    x: -540, z: -808, yaw: look(-540, -808, -424, -796), pitch: -0.02 },
  /* On the Shirakawa-minami walkway, NOT in the channel.  The canal centreline
   * runs about 5 m north of the path here and its bed is cut 1.55 m down with a
   * stone revetment either side, so a camera placed on the water is inside the
   * wall -- which is exactly what the first version of this view was, and it
   * rendered as a featureless dark slab. */
  { id: 'gion-shirakawa', name: 'the Shirakawa and the willows',
    x: -500, z: -775.5, yaw: look(-500, -775.5, -430, -793), pitch: 0.02 },
  /* On the walkway just west of the Tatsumi bridge, looking back up the canal.
   * The bridge's parapet is a collider, so a camera on the deck itself is
   * inside it -- the capture tool's sanity check catches exactly this. */
  { id: 'gion-shirakawa-bridge', name: 'the Tatsumi bridge corner',
    x: -452, z: -785, yaw: look(-452, -785, -560, -760), pitch: 0.03 },
  { id: 'gion-shijo-east', name: 'Shijo-dori, the shrine gate closing the end',
    x: -320, z: -583, yaw: look(-320, -583, -157, -575), pitch: 0.06 },

  // ------------------------------ Yasaka Shrine -----------------------------
  { id: 'yasaka-westgate', name: 'the West Romon',
    x: -215, z: -578, yaw: look(-215, -578, -157, -575), pitch: 0.17 },
  { id: 'yasaka-westgate-under', name: 'under the West Romon, into the precinct',
    x: -146, z: -571, yaw: look(-146, -571, -65, -537), pitch: 0.03 },
  { id: 'yasaka-maiden', name: 'the Maiden and its lanterns',
    x: -104, z: -554, yaw: look(-104, -554, -65, -537), pitch: 0.04 },
  { id: 'yasaka-maiden-dusk', name: 'the Maiden, lanterns lit',
    x: -96, z: -549, yaw: look(-96, -549, -65, -537), pitch: 0.03, time: 'dusk' },
  { id: 'yasaka-honden', name: 'the Main Hall — Gion-zukuri',
    x: -62, z: -520, yaw: look(-62, -520, -60, -565), pitch: 0.12 },
  { id: 'yasaka-axis', name: 'the ceremonial axis, looking north',
    x: -68, z: -450, yaw: look(-68, -450, -62, -560), pitch: 0.06 },
  { id: 'yasaka-torii', name: 'the great stone torii on Shimogawara-dori',
    x: -69, z: -428, yaw: look(-69, -428, -66, -500), pitch: 0.18 },
  { id: 'maruyama-cherry', name: 'the weeping cherry, Maruyama Park',
    x: 128, z: -570, yaw: look(128, -570, 96, -561), pitch: 0.14 },

  // ------------------------------- the quiet -------------------------------
  { id: 'nene-north', name: 'Nene-no-michi, looking south',
    x: 67, z: -356, yaw: look(67, -356, 56, -140), pitch: 0.0 },
  { id: 'nene-kodaiji', name: 'the Kodai-ji approach off Nene-no-michi',
    x: 64, z: -228, yaw: look(64, -228, 150, -206), pitch: 0.12 },
  { id: 'nene-south', name: 'Nene-no-michi, the south end',
    x: 56, z: -120, yaw: look(56, -120, 54, -78), pitch: 0.01 },
  { id: 'ishibekoji', name: 'Ishibe-koji',
    x: 52, z: -153, yaw: look(52, -153, 22, -156), pitch: 0.02 },
  { id: 'ishibekoji-turn', name: 'Ishibe-koji, the turn',
    x: 17, z: -178, yaw: look(17, -178, 20, -212), pitch: 0.03 },
  { id: 'shimogawara', name: 'Shimogawara-dori, looking south',
    x: -66, z: -380, yaw: look(-66, -380, -46, -40), pitch: 0.01 },

  // ------------------------------- the pagoda -------------------------------
  { id: 'pagoda-classic', name: 'Yasaka-dori — THE view',
    x: -88.7, z: -4.6, yaw: look(-88.7, -4.6, 0, 0), pitch: 0.24,
    note: 'the most photographed frame in Kyoto; survey gives the pagoda top at 30.7 deg elevation from here' },
  { id: 'pagoda-classic-sunset', name: 'Yasaka-dori at sunset',
    x: -88.7, z: -4.6, yaw: look(-88.7, -4.6, 0, 0), pitch: 0.24, time: 'sunset' },
  { id: 'pagoda-far', name: 'Yasaka-dori from Higashioji — the first sight',
    x: -180, z: -15, yaw: look(-180, -15, 0, 0), pitch: 0.14 },
  { id: 'pagoda-frame', name: 'the Shimogawara crossing — the tight frame',
    x: -43.6, z: -0.7, yaw: look(-43.6, -0.7, 0, 0), pitch: 0.42 },
  { id: 'pagoda-base', name: 'at the foot of the pagoda',
    x: -14, z: 6, yaw: look(-14, 6, 0, 0), pitch: 0.62 },
  { id: 'pagoda-east', name: 'looking back west down Yasaka-dori',
    x: 30, z: 22, yaw: look(30, 22, -160, -12), pitch: -0.02 },
  { id: 'koshindo', name: 'Yasaka Koshin-do and its kukurizaru',
    x: -35, z: 8, yaw: look(-35, 8, -34, 26), pitch: 0.10 },

  // -------------------------------- the climb -------------------------------
  { id: 'ninenzaka-north', name: 'Ninenzaka, the north end',
    x: 133, z: -74, yaw: look(133, -74, 141, 52), pitch: 0.03 },
  { id: 'ninenzaka-steps', name: 'Ninenzaka, the stepped flight',
    x: 137, z: 2, yaw: look(137, 2, 142, 60), pitch: 0.04 },
  /* Looking back DOWN Ninenzaka to the north, not west at the pagoda.
   *
   * The first version pointed straight at the pagoda from mid-street, which is
   * geometrically correct and visually useless: Ninenzaka runs north-south and
   * the pagoda is due west of it, so all that camera could ever see was the
   * shopfront two metres in front of it.  The real view is along the street --
   * the pagoda's upper storeys clear the rooflines at the far end. */
  { id: 'ninenzaka-back', name: 'Ninenzaka, looking back down the street',
    x: 140, z: 44, yaw: look(140, 44, 133, -79), pitch: 0.07 },
  { id: 'sannenzaka-bottom', name: 'Sannenzaka from the junction',
    x: 142, z: 70, yaw: look(142, 70, 153, 200), pitch: 0.05 },
  { id: 'sannenzaka-mid', name: 'Sannenzaka, mid-climb',
    x: 149, z: 148, yaw: look(149, 148, 154, 235), pitch: 0.06 },
  { id: 'sannenzaka-steps', name: 'Sannenzaka, the 46 steps',
    x: 154, z: 224, yaw: look(154, 224, 143, 258), pitch: 0.10 },
  { id: 'sannenzaka-down', name: 'Sannenzaka, looking down the flight',
    x: 144, z: 256, yaw: look(144, 256, 150, 160), pitch: -0.12 },
  { id: 'kiyomizu-michi', name: 'Kiyomizu-michi, the lower approach',
    x: -160, z: 122, yaw: look(-160, 122, 130, 258), pitch: 0.05 },
  { id: 'kiyomizuzaka-fork', name: 'the fork — Sannenzaka meets Kiyomizu-zaka',
    x: 128, z: 256, yaw: look(128, 256, 240, 300), pitch: 0.05 },
  { id: 'kiyomizuzaka-shops', name: 'Kiyomizu-zaka, the shop corridor',
    x: 210, z: 290, yaw: look(210, 290, 335, 338), pitch: 0.05 },
  { id: 'kiyomizuzaka-top', name: 'Kiyomizu-zaka, the last climb to the gate',
    x: 320, z: 332, yaw: look(320, 332, 373, 347), pitch: 0.14 },
  { id: 'chawanzaka', name: 'Chawan-zaka, the potters street',
    x: 30, z: 377, yaw: look(30, 377, 300, 392), pitch: 0.04 },

  // ------------------------------ Kiyomizu-dera -----------------------------
  { id: 'kiyomizu-niomon', name: 'the Niomon',
    x: 340.7, z: 336.7, yaw: look(340.7, 336.7, 373, 347), pitch: 0.20 },
  { id: 'kiyomizu-saimon', name: 'the Saimon and the three-storey pagoda',
    x: 380, z: 362, yaw: look(380, 362, 419, 388), pitch: 0.24 },
  { id: 'kiyomizu-approach', name: 'the precinct approach',
    x: 430, z: 396, yaw: look(430, 396, 520, 419), pitch: 0.06 },
  { id: 'kiyomizu-stage', name: 'on the stage',
    x: 522, z: 425.8, yaw: look(522, 425.8, 540, 470), pitch: -0.06 },
  { id: 'kiyomizu-under', name: 'under the stage — the timber scaffold',
    x: 520, z: 452, yaw: look(520, 452, 528, 428), pitch: 0.40 },
  /* The stage seen in profile from the ravine below and east of it, on the
   * path down to the Otowa falls.
   *
   * NOT the Okunoin postcard.  That view -- the Hondo and its scaffold across
   * the head of the gorge -- needs the Okunoin terrace to stand clear of the
   * Hondo's east wing, and in the built precinct it does not: a grid search
   * over the whole terrace found no standing point at deck level with an
   * unobstructed ray to the Hondo.  The layout is honest about the surveyed
   * positions; the sightline between them is the thing that is missing, and it
   * is recorded as such in FINAL_QA_REPORT.md rather than papered over with a
   * camera floating where no one could stand. */
  { id: 'kiyomizu-okunoin', name: 'the Hondo from the precinct approach',
    x: 462, z: 412, yaw: look(462, 412, 522, 424), pitch: 0.10,
    note: 'the main hall closing the precinct axis' },
  { id: 'kiyomizu-okunoin-sunset', name: 'the Hondo from the precinct approach, sunset',
    x: 462, z: 412, yaw: look(462, 412, 522, 424), pitch: 0.10, time: 'sunset' },
  { id: 'kiyomizu-otowa', name: 'the Otowa waterfall',
    x: 556, z: 470, yaw: look(556, 470, 548, 459), pitch: 0.06 },
  { id: 'kiyomizu-overlook', name: 'the overlook — Kyoto from the stage',
    x: 528.4, z: 430.6, yaw: look(528.4, 430.6, -1800, -180), pitch: -0.01,
    note: 'the reward. Kyoto Tower is 2.47 km at bearing 251.3 deg' },
  { id: 'kiyomizu-overlook-sunset', name: 'the overlook at sunset',
    x: 528.4, z: 430.6, yaw: look(528.4, 430.6, -1800, -180), pitch: -0.01, time: 'sunset' },
  { id: 'kiyomizu-koyasu', name: 'the Koyasu pagoda across the valley',
    x: 540, z: 560, yaw: look(540, 560, 521, 625), pitch: 0.12 },
];
