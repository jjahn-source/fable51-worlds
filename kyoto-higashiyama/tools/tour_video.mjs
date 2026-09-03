#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * The tour film.
 *
 * Walks the route the world is built around -- Hanamikoji, the Shirakawa,
 * Yasaka Shrine, Nene-no-michi, the pagoda reveal on Yasaka-dori, Ninenzaka,
 * Sannenzaka, Kiyomizu-zaka, and Kiyomizu-dera -- as one continuous piece,
 * cutting only where a walker would have to have walked a long way.
 *
 * Recorded deterministically: the app's own animation loop is parked
 * (`window.__paused`) and this drives the camera, the world clock and the
 * render on a fixed dt, so a frame that takes 200 ms to screenshot still
 * advances the world by exactly 1/fps.  Without that, petals and noren move at
 * wall-clock rate and the film runs at about three times speed.
 *
 *   node tools/tour_video.mjs                 # frames at 1920x1080, 30 fps
 *   node tools/tour_video.mjs --w=1280 --h=720 --fps=24
 *   node tools/tour_video.mjs --from=30 --to=40   # re-shoot one stretch
 *
 * Then `node tools/tour_encode.mjs` for the mp4 and the preview gif.
 * ------------------------------------------------------------------ */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const a = args.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const FPS = Number(opt('fps', 30));
const W = Number(opt('w', 1920));
const H = Number(opt('h', 1080));
const OUT = opt('out', 'media/frames');
const PORT = Number(opt('port', 5180));

/* ------------------------------------------------------------------ *
 * The shot list.
 *
 * **Composed shots, held -- not a dolly through everything.**
 *
 * The first cut walked the camera slowly through each location for seven or
 * eight seconds.  The result was that almost every frame was a transition: the
 * shot began on a mediocre framing, passed through the good one somewhere in
 * the middle, and ended on another mediocre one.  Nothing was ever held.
 *
 * So the film is now built out of the world's own **authored viewpoints** --
 * the 52 in `src/systems/cameras.js`, each of which was framed against a
 * reference and checked by `capture.mjs` for clearance and for standing
 * somewhere a walker could stand.  Each beat takes one of them, holds its exact
 * yaw and pitch, and pushes forward a metre or so over three seconds.  The
 * composition never leaves the frame it was chosen for.
 *
 *   id    a hero view id from HERO_VIEWS
 *   dur   seconds on screen
 *   push  metres travelled along the view direction over the whole shot
 *   rise  metres the eye lifts over the shot (a slow crane, used sparingly)
 *   time  optional time-of-day override for this beat
 *   cap   'Japanese|romaji', or '' for no caption
 * ------------------------------------------------------------------ */

/** The opening: a low drift over the Ninenzaka roofs toward the pagoda. */
/* Camera moves.
 *
 * Each beat names ONE move.  A shot that pushes and trucks and cranes at once
 * reads as drift rather than as a decision, and the whole point of cutting the
 * film down to seven scenes is that each gets a move chosen for its subject:
 * you cannot show the height of a pagoda with the same gesture that shows the
 * length of a canal.
 *
 * Values are the TOTAL displacement across the shot, eased in and out:
 *
 *   push   metres along the view axis   (+ toward the subject, - away)
 *   truck  metres across it             (+ right)
 *   rise   metres vertically            (a crane)
 *   tilt   radians added to pitch       (+ up)
 *   pan    radians added to yaw         (+ left)
 *   orbit  radians swung around a pivot `pivot` metres ahead, which the
 *          camera keeps centred throughout
 */

const AIR = {
  dur: 5.6, from: [212, 134, 152], to: [116, 98, 60], look: [34, 62, 4],
  cap: '東山|Higashiyama, Kyoto',
};

const BEATS = [
  /* Water, willow and blossom, and machiya standing straight out of the canal.
   * PAN: the walkway has the canal on one side and a wall on the other, so
   * there is no room to truck.  The camera holds its footing and reads along
   * the water instead, which is the same gesture without the collision. */
  { id: 'gion-shirakawa', dur: 7.2, dip: 0.5,
    move: { pan: 0.19, push: 1.8 },
    cap: '祇園白川|Gion Shirakawa' },

  /* Vermilion, gravel and 240 hanging lanterns.
   * ORBIT: the Maiden is a free-standing object, and the only move that says so
   * is the one that walks around it. */
  { id: 'yasaka-maiden', dur: 7.2,
    move: { orbit: -0.20, pivot: 42 },
    cap: '八坂神社|Yasaka Shrine' },

  /* CRANE: the tree is 12 m of hanging blossom.  Rising through it while
   * tilting down keeps the canopy filling the frame as the ground drops away. */
  { id: 'maruyama-cherry', dur: 6.6,
    move: { rise: 4.2, tilt: -0.15 },
    cap: '祇園枝垂桜|the weeping cherry' },

  /* The most photographed frame in Kyoto.
   * PUSH + TILT UP: the classic reveal -- approach down the slope and let the
   * five storeys climb out of the roofline. */
  { id: 'pagoda-classic', dur: 8.0,
    move: { push: 6.2, tilt: 0.16 },
    cap: '八坂の塔|the Yasaka Pagoda' },

  /* CLIMBING DOLLY: no rise term -- the camera sits 1.62 m over the height
   * field, so pushing up Sannenzaka climbs its 46 steps on its own. */
  { id: 'sannenzaka-mid', dur: 7.0,
    move: { push: 6.4 },
    cap: '産寧坂|Sannenzaka' },

  /* The destination, and the only jump in time.
   * PULL-BACK: open out from the gate until the Saimon, its stone platform and
   * the three-storey pagoda behind it are all in frame together. */
  { id: 'kiyomizu-saimon', dur: 8.2, dip: 0.6, time: 'sunset',
    move: { push: -5.2, tilt: -0.10 },
    cap: '清水寺|Kiyomizu-dera' },
];

const TAIL = 0.6;

/* Lay the beats out on a timeline. */
const SHOTS = [];
{
  let t = AIR.dur;
  SHOTS.push({ air: true, t0: 0, t1: AIR.dur, ...AIR });
  for (const b of BEATS) {
    const dip = b.dip || 0;
    t += dip;
    SHOTS.push({ ...b, dip, t0: t, t1: t + b.dur });
    t += b.dur;
  }
}
const DURATION = SHOTS[SHOTS.length - 1].t1 + 3.0;
const TITLE_AT = DURATION - 2.6;

const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/** The shot on screen at `t`, and how far through it we are. */
function sample(t) {
  for (const s of SHOTS) {
    if (t >= s.t0 && t < s.t1) return { s, k: (t - s.t0) / (s.t1 - s.t0) };
  }
  /* Inside a dip, hold the shot being LEFT.  Falling through to the last shot
   * in the list -- as this did -- put the closing sunset street on screen at
   * every gap, and `shot.time` then flipped the whole world to sunset light and
   * back again on each one. */
  let held = SHOTS[0];
  for (const s of SHOTS) if (s.t1 <= t) held = s;
  return { s: held, k: 1 };
}

/** Fade to black through a beat's `dip`, and out of the last shot into the title. */
function fadeAt(t) {
  /* The dip STRADDLES the cut: down to black over the gap that precedes t0,
   * back up over the first `dip` seconds of the new shot.  Bottoming out
   * exactly at t0 is what lets `shot.time` swap the whole world from day to
   * sunset without the change ever being on screen. */
  for (const s of SHOTS) {
    if (!s.dip) continue;
    if (t >= s.t0 - s.dip && t < s.t0) return (t - (s.t0 - s.dip)) / s.dip;
    if (t >= s.t0 && t < s.t0 + s.dip) return 1 - (t - s.t0) / s.dip;
  }
  const end = SHOTS[SHOTS.length - 1].t1;
  if (t > end) return Math.min(1, (t - end) / TAIL);
  return 0;
}

/* ------------------------------------------------------------------ */

function waitPort(port, timeout = 60000) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const s = net.connect(port, '127.0.0.1');
      s.on('connect', () => { s.end(); resolve(); });
      s.on('error', () => {
        s.destroy();
        if (Date.now() - t0 > timeout) reject(new Error('no dev server'));
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}

let server = null;
try { await waitPort(PORT, 1200); }
catch {
  server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  await waitPort(PORT);
}

if (!args.some((a) => a.startsWith('--from='))) fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=metal', '--enable-gpu',
         '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__scene && window.__scene.world, { timeout: 240000 });
await page.waitForTimeout(2500);

await page.evaluate(() => {
  /* Park the app's loop and take over.  See the note at the top of main.js. */
  window.__paused = true;

  document.getElementById('start')?.remove();
  document.getElementById('hud')?.style.setProperty('display', 'none');

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600&family=Zen+Kaku+Gothic+New:wght@400&display=swap';
  document.head.appendChild(link);

  const mk = (id, css) => {
    const el = document.createElement('div');
    el.id = id; el.style.cssText = css;
    document.body.appendChild(el);
    return el;
  };
  const MIN = "'Shippori Mincho','Hiragino Mincho ProN','Yu Mincho',serif";
  const UI = "'Zen Kaku Gothic New','Hiragino Kaku Gothic ProN',system-ui,sans-serif";

  mk('t-cap', `position:fixed;left:5.2%;bottom:7.4%;z-index:99;pointer-events:none;opacity:0;
    text-shadow:0 2px 18px rgba(20,16,30,.85)`).innerHTML =
    `<div id="t-cap-jp" style="font:600 40px/1.1 ${MIN};color:#f2ece0;letter-spacing:.16em"></div>
     <div id="t-cap-en" style="margin-top:6px;font:400 14px/1.2 ${UI};color:#cbbfae;
       letter-spacing:.34em;text-transform:uppercase"></div>`;

  mk('t-fade', 'position:fixed;inset:0;background:#17141f;z-index:100;pointer-events:none;opacity:0');

  mk('t-title', `position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
    flex-direction:column;gap:14px;z-index:101;pointer-events:none;opacity:0;
    background:rgba(23,20,31,.42)`).innerHTML =
    `<div style="font:600 78px/1 ${MIN};color:#f2ece0;letter-spacing:.34em;text-indent:.34em;
       text-shadow:0 3px 26px rgba(20,16,30,.9)">東山</div>
     <div style="font:400 17px/1.2 ${UI};color:#cbbfae;letter-spacing:.42em;text-transform:uppercase">
       Higashiyama, Kyoto</div>
     <div style="margin-top:10px;font:400 12.5px/1.2 ${UI};color:#8b95a0;letter-spacing:.2em">
       Gion → Kiyomizu-dera · 2.3 km · built in Three.js</div>`;

  const S = window.__scene;
  const FOG0 = { near: S.scene.fog.near, far: S.scene.fog.far, camFar: S.camera.far };
  const VIEWS = Object.fromEntries(S.HERO_VIEWS.map((v) => [v.id, v]));

  window.__tour = {
    elapsed: 0,
    /**
     * Reproduce a hero view exactly.
     *
     * `capture.mjs` renders these by teleporting the PLAYER and letting
     * `applyCamera` build the matrix from yaw and pitch, so that is what has to
     * happen here too -- a `lookAt` at a nearby target is not the same framing
     * and the shot stops being the one that was composed and checked.
     */
    frame(shot, k, fade, capOp, titleOp, dt) {
      const { camera, world, pipeline, time, sky, scene } = S;
      this.elapsed += dt;
      const t = this.elapsed;
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

      if (shot.air) {
        scene.fog.near = 900; scene.fog.far = 4200;
        camera.far = 6000;
        camera.fov = 52;
        camera.position.set(
          shot.from[0] + (shot.to[0] - shot.from[0]) * e,
          shot.from[1] + (shot.to[1] - shot.from[1]) * e,
          shot.from[2] + (shot.to[2] - shot.from[2]) * e
        );
        camera.up.set(0, 1, 0);
        camera.lookAt(shot.look[0], shot.look[1], shot.look[2]);
      } else {
        scene.fog.near = FOG0.near; scene.fog.far = FOG0.far;
        camera.far = FOG0.camFar;
        camera.fov = 48;                       // the hero views' own fov

        const v = VIEWS[shot.id];
        const m = shot.move || {};
        const yaw0 = v.yaw, pitch0 = v.pitch ?? 0;

        let x, z, yaw;
        if (m.orbit) {
          /* Swing around a pivot on the view axis, keeping it centred.  The
           * position rotates by `a` in three.js's own sense about +Y, and the
           * yaw that still points at the pivot is then simply yaw0 + a. */
          const a = m.orbit * e;
          const px = v.x - Math.sin(yaw0) * m.pivot;
          const pz = v.z - Math.cos(yaw0) * m.pivot;
          const dx = v.x - px, dz = v.z - pz;
          const ca = Math.cos(a), sa = Math.sin(a);
          x = px + dx * ca + dz * sa;
          z = pz - dx * sa + dz * ca;
          yaw = yaw0 + a;
        } else {
          const fx = -Math.sin(yaw0), fz = -Math.cos(yaw0);   // forward
          const rx = Math.cos(yaw0),  rz = -Math.sin(yaw0);   // right
          const d = (m.push || 0) * e, s2 = (m.truck || 0) * e;
          x = v.x + fx * d + rx * s2;
          z = v.z + fz * d + rz * s2;
          yaw = yaw0 + (m.pan || 0) * e;
        }
        const pitch = pitch0 + (m.tilt || 0) * e;
        const rise = (m.rise || 0) * e;
        /* A whisper of breathing on a held frame.  Any more and it reads as a
         * handheld camera, which is not what a painted background does. */
        const breathe = Math.sin(t * 0.9) * 0.008;
        camera.position.set(x, world.heightAt(x, z) + 1.62 + rise + breathe, z);
        camera.rotation.order = 'YXZ';
        camera.rotation.set(pitch, yaw, 0);
      }
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);

      world.update(dt, t);
      time.aim({
        x: Math.round(camera.position.x / 2) * 2,
        y: Math.round(camera.position.y / 2) * 2,
        z: Math.round(camera.position.z / 2) * 2,
      });
      sky.dome.position.copy(camera.position);
      sky.clouds.position.set(camera.position.x, 0, camera.position.z);

      const [jp, en] = (shot.cap || '|').split('|');
      document.getElementById('t-cap-jp').textContent = jp || '';
      document.getElementById('t-cap-en').textContent = en || '';
      document.getElementById('t-cap').style.opacity = String(capOp);
      document.getElementById('t-fade').style.opacity = String(fade);
      document.getElementById('t-title').style.opacity = String(titleOp);

      pipeline.render();
    },
    setTime(key) { S.time.set(key); S.pipeline.setGrade(S.time.grade); },
  };
});

const FROM = Number(opt('from', 0));
const TO = Number(opt('to', DURATION));
const total = Math.round(DURATION * FPS);
console.log(`recording ${DURATION.toFixed(1)}s @ ${FPS}fps = ${total} frames at ${W}x${H}`);
console.log(`${BEATS.length} shots, ${(BEATS.reduce((n, b) => n + b.dur, 0) / BEATS.length).toFixed(1)}s average`);
const t0 = Date.now();

let lastTime = null;
for (let f = Math.round(FROM * FPS); f < Math.min(total, Math.round(TO * FPS)); f++) {
  const t = f / FPS;
  const { s: shot, k } = sample(t);
  const fade = fadeAt(t);
  const capOp = shot.cap ? Math.max(0, 1 - fade * 2) * 0.96 : 0;
  const titleOp = t < TITLE_AT ? 0 : Math.min(1, (t - TITLE_AT) / 0.9);

  // switch the light only on a cut, never mid-shot
  const want = shot.time || 'day';
  if (want !== lastTime) {
    await page.evaluate((w) => window.__tour.setTime(w), want);
    lastTime = want;
  }

  await page.evaluate(
    ([sh, kk, fd, co, to2, dt]) => window.__tour.frame(sh, kk, fd, co, to2, dt),
    [shot, k, fade, capOp, titleOp, 1 / FPS]
  );
  await page.screenshot({ path: `${OUT}/${String(f).padStart(5, '0')}.png` });
  if (f % 150 === 0) {
    const done = f - Math.round(FROM * FPS) + 1;
    const rate = done / ((Date.now() - t0) / 1000);
    console.log(` frame ${f}/${total}  ${shot.id || 'air'}  ${rate.toFixed(1)} fps`);
  }
}

await browser.close();
if (server) server.kill();
console.log(`frames -> ${OUT}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
