#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * Headless screenshot capture.
 *
 * This is not a convenience -- it is how the project is graded.  Nothing here
 * is judged by reading its source: it is judged by rendering the hero views at
 * 1600x900 and looking at them beside photographs of the real street.
 *
 *   node tools/capture.mjs                       # every hero view
 *   node tools/capture.mjs --only=pagoda         # matching ids only
 *   node tools/capture.mjs --out=qa/shots/r2     # somewhere else
 *   node tools/capture.mjs --time=sunset         # override the time of day
 *   node tools/capture.mjs --free=x,z,yaw,pitch  # one arbitrary camera
 *
 * The page is driven through `window.__shot`, which moves the *player* and not
 * the camera -- so a captured frame is one a walker could actually stand in,
 * feet on the ground.  A view that cannot be reached on foot is a view that is
 * lying about the world.
 * ------------------------------------------------------------------ */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const OUT = path.resolve(args.out || 'qa/shots/latest');
const PORT = Number(args.port || 5180);
const W = Number(args.w || 1600);
const H = Number(args.h || 900);

function waitPort(port, timeout = 45000) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const s = net.connect(port, '127.0.0.1');
      s.on('connect', () => { s.end(); resolve(); });
      s.on('error', () => {
        s.destroy();
        if (Date.now() - t0 > timeout) reject(new Error('dev server did not start'));
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}

/**
 * Run a page evaluation, surviving a hot reload.
 *
 * With several builders editing source concurrently, the dev server pushes an
 * HMR update -- often a full reload -- at unpredictable moments, and any
 * `page.evaluate` in flight dies with "Execution context was destroyed".  That
 * is not a bug in the world and not worth failing a QA run over, so the call is
 * retried after waiting for the rebuilt page to expose `__shot` again.
 */
async function resilient(page, fn, { tries = 4, port } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      const msg = String(e && e.message);
      if (!/Execution context was destroyed|Target closed|navigation/i.test(msg) || i === tries - 1) throw e;
      console.log('  · page reloaded mid-run (a builder saved a file); retrying');
      await page.waitForFunction(() => typeof window.__shot === 'function', { timeout: 180000 });
      await page.waitForTimeout(2500);
    }
  }
}

let server = null;
async function ensureServer() {
  try {
    await waitPort(PORT, 1200);
    console.log(`· using the dev server already on :${PORT}`);
    return false;
  } catch { /* not running, start one */ }
  console.log(`· starting vite on :${PORT}`);
  server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stderr.on('data', (d) => {
    const s = String(d);
    if (/error/i.test(s)) process.stderr.write('  vite: ' + s);
  });
  await waitPort(PORT);
  return true;
}

const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const started = await ensureServer();

  const browser = await chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=metal',
      '--enable-unsafe-webgpu',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error') errors.push(t);
    if (args.verbose) console.log('  page:', t);
    else if (/\[world\]|failed|Error/.test(t)) console.log('  page:', t);
  });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });

  // wait for the world to finish building and the shot harness to exist
  await page.waitForFunction(() => typeof window.__shot === 'function', { timeout: 120000 });
  // let a few frames run so materials compile and the first shadow map is drawn
  await page.waitForTimeout(1800);

  const stats = await resilient(page, () => page.evaluate(() => window.__stats()));
  console.log('· world:', JSON.stringify(stats));

  let views = await resilient(page, () => page.evaluate(async () => {
    const m = await import('/src/systems/cameras.js');
    return m.HERO_VIEWS;
  }));

  if (args.free) {
    const [x, z, yaw, pitch, eye] = String(args.free).split(',').map(Number);
    views = [{ id: args.name || 'free', name: 'free camera', x, z, yaw,
               pitch: pitch || 0, eye: Number.isFinite(eye) ? eye : undefined }];
  }
  if (args.only) {
    const pat = String(args.only);
    views = views.filter((v) => v.id.includes(pat));
  }
  if (!views.length) {
    console.error('no views matched');
  }

  /* ------------------------------------------------------------------ *
   * Before rendering anything, check that each hero camera is somewhere a
   * walker could actually stand and see from.
   *
   * Two ways a view goes wrong that are invisible in the file and obvious in
   * the JPEG: the camera is inside a collider (so the frame is the inside of a
   * wall), or every direction it can look is within arm's reach (so it is in a
   * gap between two buildings).  Both happened.  Both are one raycast away from
   * being caught automatically.
   * ------------------------------------------------------------------ */
  const sanity = await resilient(page, () => page.evaluate(async ([vs]) => {
    const THREE = window.__scene.THREE;
    const s = window.__scene;
    const w = s.world;
    const R = 0.34;
    const ray = new THREE.Raycaster();
    ray.far = 12;
    const out = [];
    for (const v of vs) {
      const y = w.heightAt(v.x, v.z);
      const inside = w.colliders.some((c) =>
        (c.top === undefined || c.top > y + 0.42) &&
        (c.bottom === undefined || c.bottom < y + 1.95) &&
        v.x > c.x0 - R && v.x < c.x1 + R && v.z > c.z0 - R && v.z < c.z1 + R);
      // how far can it see, looking where it is pointed?
      const o = new THREE.Vector3(v.x, y + 1.62, v.z);
      const dir = new THREE.Vector3(-Math.sin(v.yaw), 0, -Math.cos(v.yaw));
      ray.set(o, dir);
      const hits = ray.intersectObject(w.root, true);
      const ahead = hits.length ? hits[0].distance : Infinity;
      // 3.2 m: below that there is nothing in the frame but the wall opposite
      if (!inside && ahead >= 3.2) continue;
      /* Suggest somewhere clear.  A flagged camera is nearly always a metre or
       * two from a good one -- a railing went in, a wall moved -- and searching
       * a small spiral is far more reliable than guessing coordinates by hand
       * from a district file you did not write. */
      /* The replacement must stand at about the same LEVEL, not merely be
       * clear.  Around Kiyomizu-dera a point two metres from the stage rail is
       * clear of every collider and fourteen metres lower, in the ravine -- so
       * a suggester that only tests colliders happily moves a hero camera off a
       * deck and reports success. */
      let fix = null;
      for (let r2 = 1.0; r2 <= 7 && !fix; r2 += 0.8) {
        for (let a = 0; a < 16; a++) {
          const th = (a / 16) * Math.PI * 2;
          const cx = v.x + Math.cos(th) * r2, cz = v.z + Math.sin(th) * r2;
          const cy = w.heightAt(cx, cz);
          if (Math.abs(cy - y) > 1.5) continue;
          const bad = w.colliders.some((c) =>
            (c.top === undefined || c.top > cy + 0.42) &&
            (c.bottom === undefined || c.bottom < cy + 1.95) &&
            cx > c.x0 - R && cx < c.x1 + R && cz > c.z0 - R && cz < c.z1 + R);
          if (bad) continue;
          ray.set(new THREE.Vector3(cx, cy + 1.62, cz), dir);
          const h2 = ray.intersectObject(w.root, true);
          const d2 = h2.length ? h2[0].distance : Infinity;
          if (d2 >= 4.0) { fix = { x: +cx.toFixed(1), z: +cz.toFixed(1), ahead: +d2.toFixed(1) }; break; }
        }
      }
      out.push({ id: v.id, inside, ahead: +ahead.toFixed(2), fix });
    }
    return out;
  }, [views]));
  if (sanity.length) {
    console.log('! camera sanity:');
    for (const s2 of sanity) {
      console.log(`   ${s2.id.padEnd(28)} ${s2.inside ? 'INSIDE' : '      '} ahead ${String(s2.ahead).padStart(6)} m` +
        (s2.fix ? `   -> try x: ${s2.fix.x}, z: ${s2.fix.z} (${s2.fix.ahead} m clear)` : '   -> no clear spot within 7 m'));
    }
    console.log('');
  }

  const report = [];
  for (const v of views) {
    const opts = {
      pos: [v.x, v.z], yaw: v.yaw, pitch: v.pitch ?? 0, eye: v.eye,
      time: args.time || v.time || 'day',
      dir: path.basename(OUT),
      scale: Number(args.scale || 1.5),
    };
    const r = await resilient(page, () => page.evaluate(
      ([name, w, h, o]) => window.__shot(name, w, h, o),
      [v.id, W, H, opts]
    ));
    const s = await resilient(page, () => page.evaluate(() => window.__stats()));
    report.push({ id: v.id, name: v.name, calls: s.calls, triangles: s.triangles, file: r.file });
    console.log(`  ${v.id.padEnd(30)} ${String(s.calls).padStart(5)} calls  ${String(Math.round(s.triangles / 1000)).padStart(5)}k tris`);
  }

  fs.writeFileSync(path.join(OUT, '_report.json'), JSON.stringify({ stats, views: report }, null, 2));

  if (errors.length) {
    console.log('\n! page errors:');
    for (const e of [...new Set(errors)].slice(0, 20)) console.log('   ', e.slice(0, 300));
  }

  await browser.close();
  if (started && server) server.kill();
  console.log(`\n· ${report.length} shots -> ${OUT}`);
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  if (server) server.kill();
  process.exit(1);
});
