#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * The final walkthrough.
 *
 * Drives the *player* -- not the camera -- along the whole route from Gion to
 * the Kiyomizu-dera overlook, using the same movement code and the same
 * collision the keyboard uses, and captures a frame every few metres.
 *
 * This is the test that catches what screenshots cannot:
 *
 *   - a stretch you cannot actually walk (a collider closing a street, a step
 *     the walker will not climb, a gap narrower than 0.68 m)
 *   - a district that reads as a separate level rather than the next part of
 *     the same place
 *   - a long visually empty section
 *   - the player falling through, or floating over, the ground
 *
 * It reports the height under the player at every sample, so a discontinuity
 * in the terrain shows up as a number rather than as a feeling.
 *
 *   node tools/walkthrough.mjs
 *   node tools/walkthrough.mjs --shots=1     # also write the frames
 * ------------------------------------------------------------------ */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const PORT = Number(args.port || 5180);
const OUT = path.resolve(args.out || 'qa/walk');

/**
 * The route, as an ordered list of street legs.
 *
 * **Derived from the street centrelines, not typed by hand.**  The walker
 * steers naively -- point the yaw at the next waypoint and hold W -- so any
 * hand-written waypoint list eventually asks it to cut a corner through a
 * building and then reports the building as a bug.  That happened twice.
 *
 * Sampling the corridors instead means the test route is the same data the
 * world is built from: it cannot drift out of step with the streets, it follows
 * every curve and every flight of steps, and adding a street to `route.js`
 * adds it here for free.
 *
 * `from`/`to` are fractions of arc length, so a leg can run a street backwards
 * (`from: 1, to: 0`) or cover only part of it.
 */
const LEGS = [
  { street: 'hanamikoji',        from: 0.02, to: 0.98, name: 'Hanamikoji, south' },
  { street: 'hanamikoji',        from: 0.98, to: 0.03, name: 'Hanamikoji, back north' },
  /* From the Hanamikoji junction, not from further west.  Shijo's polyline
   * starts 260 m west of Hanamikoji, so a leg beginning at t = 0.38 sends the
   * walker back down the street and into the frontage before it ever turns
   * east -- which reported as a wall on Shijo that is not there. */
  { street: 'shijo',             from: 0.55, to: 0.97, name: 'Shijo-dori, east to the shrine' },
  { street: 'yasakaWestApproach',from: 0.05, to: 1.00, name: 'in through the West Romon' },
  { street: 'yasakaAxis',        from: 1.00, to: 0.00, name: 'south down the ceremonial axis' },
  { street: 'shimogawara',       from: 0.02, to: 0.98, name: 'Shimogawara-dori' },
  { street: 'yasakadori',        from: 0.78, to: 1.00, name: 'up Yasaka-dori to the pagoda' },
  { street: 'pagodaLink',        from: 0.02, to: 0.60, name: 'east toward Ninenzaka' },
  { street: 'ninenzaka',         from: 1.00, to: 0.02, name: 'north up Ninenzaka' },
  { street: 'nene',              from: 1.00, to: 0.02, name: 'Nene-no-michi, north' },
  { street: 'nene',              from: 0.02, to: 0.98, name: 'Nene-no-michi, back south' },
  { street: 'ninenzaka',         from: 0.02, to: 1.00, name: 'Ninenzaka, south to the junction' },
  { street: 'sannenzaka',        from: 0.02, to: 0.99, name: 'Sannenzaka, and the 46 steps' },
  { street: 'kiyomizuzaka',      from: 0.02, to: 0.99, name: 'Kiyomizu-zaka, up to the gate' },
  { street: 'kiyomizuPrecinct',  from: 0.02, to: 0.99, name: 'the precinct, to the stage' },
  { street: 'okunoinPath',       from: 0.02, to: 0.55, name: 'out to Okunoin' },
];

/** Spacing between steer targets, metres.  Short enough to follow a curve. */
const WAYPOINT_SPACING = 22;

function waitPort(port, timeout = 45000) {
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
const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  try { await waitPort(PORT, 1200); }
  catch {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'],
      { stdio: ['ignore', 'pipe', 'pipe'] });
    await waitPort(PORT);
  }

  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__shot === 'function', { timeout: 120000 });
  await page.waitForTimeout(1800);

  /* Walk it.  The player is stepped with the real `update()` at a fixed dt and
   * steered toward each waypoint in turn -- so every collider, every step and
   * every height query on the route is exercised exactly as it would be by
   * somebody holding W. */
  /* Turn the legs into waypoints by sampling the real corridors in the page,
   * so the test walks the streets the world actually has. */
  const ROUTE = await resilient(page, () => page.evaluate(async ([legs, spacing]) => {
    const corridors = window.__scene.world.corridors;
    const out = [];
    for (const leg of legs) {
      const c = corridors.find((k) => k.id === leg.street);
      if (!c) { console.warn('[walk] no corridor', leg.street); continue; }
      const s0 = leg.from * c.length, s1 = leg.to * c.length;
      const dir = s1 >= s0 ? 1 : -1;
      const n = Math.max(1, Math.round(Math.abs(s1 - s0) / spacing));
      for (let i = 1; i <= n; i++) {
        const p = c.pointAt(s0 + dir * (Math.abs(s1 - s0) * i) / n);
        out.push({ name: leg.name, x: +p.x.toFixed(2), z: +p.z.toFixed(2), street: leg.street });
      }
    }
    return out;
  }, [LEGS, WAYPOINT_SPACING]));
  console.log(`· route: ${ROUTE.length} waypoints over ${LEGS.length} legs`);

  const log = await resilient(page, () => page.evaluate(async ([route, wantShots]) => {
    const s = window.__scene;
    const p = s.player;
    const out = [];
    p.teleport(route[0].x, route[0].z);
    p.locked = true;
    let lastY = p.pos.y;
    let stuckAt = null;

    for (let i = 1; i < route.length; i++) {
      const wp = route[i];
      let steps = 0;
      let lastDist = Infinity;
      let noProgress = 0;
      while (steps++ < 9000) {
        const dx = wp.x - p.pos.x, dz = wp.z - p.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 2.2) break;
        // steer: set yaw at the waypoint and press W
        p.yaw = Math.atan2(-dx, -dz);
        p.keys.clear();
        p.keys.add('KeyW');
        p.update(1 / 60);

        const dy = p.pos.y - lastY;
        if (Math.abs(dy) > 0.9) {
          out.push({ kind: 'JUMP', seg: wp.name, x: +p.pos.x.toFixed(1),
                     z: +p.pos.z.toFixed(1), dy: +dy.toFixed(2) });
        }
        lastY = p.pos.y;

        if (dist > lastDist - 0.002) noProgress++; else noProgress = 0;
        lastDist = dist;
        if (noProgress > 150) {
          /* Say WHAT is blocking, not just that something is.  A walkthrough
           * that reports "stuck at (x, z)" in a world with eight thousand
           * colliders tells you almost nothing; the box that is actually in the
           * way, and which of its faces the walker is pinned against, tells you
           * everything. */
          const R = 0.34, S = 0.42;
          const feet = p.pos.y;
          const near = window.__scene.world.colliders
            .map((c) => {
              if (c.top !== undefined && c.top <= feet + S) return null;
              if (c.bottom !== undefined && c.bottom > feet + 1.95) return null;
              const dx = Math.max(c.x0 - R - p.pos.x, 0, p.pos.x - (c.x1 + R));
              const dz = Math.max(c.z0 - R - p.pos.z, 0, p.pos.z - (c.z1 + R));
              return { d: Math.hypot(dx, dz), c };
            })
            .filter(Boolean)
            .sort((a, b) => a.d - b.d)
            .slice(0, 3)
            .map(({ d, c }) => ({
              gap: +d.toFixed(2),
              box: [+c.x0.toFixed(1), +c.z0.toFixed(1), +c.x1.toFixed(1), +c.z1.toFixed(1)],
              size: [+(c.x1 - c.x0).toFixed(1), +(c.z1 - c.z0).toFixed(1)],
              top: c.top === undefined ? null : +c.top.toFixed(2),
              overFeet: c.top === undefined ? null : +(c.top - feet).toFixed(2),
            }));
          out.push({ kind: 'STUCK', seg: wp.name, x: +p.pos.x.toFixed(1),
                     z: +p.pos.z.toFixed(1), y: +p.pos.y.toFixed(2),
                     remaining: +dist.toFixed(1), blockers: near });
          /* Recover and carry on.
           *
           * Without this, one bad spot 300 m into a 2.3 km route reports as
           * every remaining waypoint being blocked -- 81 failures for one
           * wall -- and the report becomes unreadable exactly when it matters.
           * The walker is lifted to the next waypoint, the failure is recorded
           * once, and the rest of the route still gets tested. */
          p.teleport(wp.x, wp.z);
          break;
        }
      }
      out.push({ kind: 'ARRIVE', seg: wp.name, steps, street: wp.street,
                 x: +p.pos.x.toFixed(1), z: +p.pos.z.toFixed(1),
                 y: +p.pos.y.toFixed(2) });
      if (wantShots) {
        p.applyCamera(0);
        await window.__shot('walk-' + String(i).padStart(2, '0'), 1280, 720,
          { yaw: p.yaw, pitch: 0.02, dir: 'walk' });
      }
    }
    p.locked = false;
    return out;
  }, [ROUTE, !!args.shots]));

  let stuck = 0, jumps = 0;
  let lastLeg = null, legStart = null, legEnd = null;
  const legDone = () => {
    if (legEnd) console.log(`  ok  ${legEnd.seg.padEnd(38)} -> (${legEnd.x}, ${legEnd.z})  y ${legEnd.y}`);
  };
  let seenLeg = null;
  for (const e of log) {
    if (e.kind === 'ARRIVE' && e.seg !== seenLeg) {
      if (seenLeg !== null) legDone();
      seenLeg = e.seg;
    }
    if (e.kind === 'STUCK') {
      stuck++;
      console.log(`  ! STUCK  ${e.seg}  at (${e.x}, ${e.z}) y ${e.y}  ${e.remaining} m short`);
      for (const b of e.blockers || []) {
        console.log(`      gap ${b.gap}m  box ${JSON.stringify(b.box)}  size ${b.size[0]}x${b.size[1]}  top ${b.top} (+${b.overFeet} over feet)`);
      }
    }
    else if (e.kind === 'JUMP') { jumps++; if (jumps < 25) console.log(`  ! JUMP   ${e.seg}  at (${e.x}, ${e.z})  dy ${e.dy}`); }
    else {
      // one line per leg, not per waypoint
      if (e.seg !== lastLeg) { lastLeg = e.seg; legStart = e; }
      legEnd = e;
    }
  }

  legDone();
  console.log('\n--- walkthrough ---');
  console.log(`waypoints: ${ROUTE.length}`);
  console.log(`blocked  : ${stuck}`);
  console.log(`height discontinuities > 0.9 m : ${jumps}`);
  if (errors.length) console.log('page errors:', [...new Set(errors)].slice(0, 8));

  fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(log, null, 2));
  await browser.close();
  if (server) server.kill();
  process.exit(stuck > 0 ? 1 : 0);
};

main().catch((e) => { console.error(e); if (server) server.kill(); process.exit(1); });
