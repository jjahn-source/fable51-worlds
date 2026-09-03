#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * Performance probe.
 *
 * Reports **draw calls and triangles first, milliseconds second**, and that
 * ordering is deliberate.  Wall-clock in a headless browser on a shared
 * machine drifts by 20-30 % run to run, so a frame time that moved is almost
 * never evidence of anything.  Draw calls are exact, reproducible, and are what
 * actually goes wrong in a world assembled out of thousands of small parts.
 *
 *   node tools/perf.mjs                # every hero view
 *   node tools/perf.mjs --headed=1     # on the real GPU, for the fps numbers
 * ------------------------------------------------------------------ */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const PORT = Number(args.port || 5180);

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
  try { await waitPort(PORT, 1200); }
  catch {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'],
      { stdio: ['ignore', 'pipe', 'pipe'] });
    await waitPort(PORT);
  }

  const browser = await chromium.launch({
    headless: !args.headed,
    args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist',
           '--enable-gpu-rasterization'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__shot === 'function', { timeout: 120000 });
  await page.waitForTimeout(2500);

  const views = await page.evaluate(async () => {
    const m = await import('/src/systems/cameras.js');
    return m.HERO_VIEWS;
  });

  const rows = [];
  for (const v of views) {
    // put the camera there, then measure a run of frames from that viewpoint
    const r = await page.evaluate(async ([vv]) => {
      const s = window.__scene;
      s.player.teleport(vv.x, vv.z, vv.yaw, vv.pitch ?? 0);
      if (vv.time) { s.time.set(vv.time); s.pipeline.setGrade(s.time.grade); }
      // warm up
      for (let i = 0; i < 8; i++) s.pipeline.render();
      const times = [];
      for (let i = 0; i < 40; i++) {
        const t0 = performance.now();
        s.pipeline.render();
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      const info = s.pipeline.sceneInfo;
      return {
        calls: info.calls, triangles: info.triangles,
        median: times[20], p99: times[39],
        programs: s.renderer.info.programs?.length ?? 0,
        geometries: s.renderer.info.memory.geometries,
        textures: s.renderer.info.memory.textures,
      };
    }, [v]);
    rows.push({ id: v.id, ...r });
    console.log(
      `${v.id.padEnd(30)} ${String(r.calls).padStart(5)} calls  ` +
      `${String(Math.round(r.triangles / 1000)).padStart(5)}k tris  ` +
      `${r.median.toFixed(1).padStart(6)} ms  (p99 ${r.p99.toFixed(1)})`
    );
  }

  const worst = rows.slice().sort((a, b) => b.calls - a.calls)[0];
  const heaviest = rows.slice().sort((a, b) => b.triangles - a.triangles)[0];
  const stats = await page.evaluate(() => window.__stats());

  console.log('\n--- summary ---');
  console.log('world      :', JSON.stringify(stats));
  console.log('max calls  :', worst.id, worst.calls);
  console.log('max tris   :', heaviest.id, Math.round(heaviest.triangles / 1000) + 'k');
  console.log('programs   :', rows[0].programs);
  console.log('geometries :', rows[0].geometries, ' textures:', rows[0].textures);
  const med = rows.map((r) => r.median).sort((a, b) => a - b);
  console.log('median ms  :', med[Math.floor(med.length / 2)].toFixed(1),
              ' worst:', med[med.length - 1].toFixed(1));

  fs.mkdirSync('qa', { recursive: true });
  fs.writeFileSync('qa/perf.json', JSON.stringify({ stats, rows }, null, 2));

  await browser.close();
  if (server) server.kill();
  process.exit(0);
};

main().catch((e) => { console.error(e); if (server) server.kill(); process.exit(1); });
