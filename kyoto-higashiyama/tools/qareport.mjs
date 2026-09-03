#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * Generate FINAL_QA_REPORT.md from measurements, not from memory.
 *
 * Every count in the report is read out of the running world or off the
 * filesystem.  Nothing in it is typed by hand, because a hand-typed count in a
 * report like this is wrong within about an hour of being written.
 *
 *   node tools/qareport.mjs
 * ------------------------------------------------------------------ */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';

const PORT = 5180;

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

function countLines(dir, ext = '.js') {
  let files = 0, lines = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(ext) && !e.name.startsWith('_')) {
        files++;
        lines += fs.readFileSync(p, 'utf8').split('\n').length;
      }
    }
  };
  walk(dir);
  return { files, lines };
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
    args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__shot === 'function', { timeout: 180000 });
  await page.waitForTimeout(2500);

  const world = await page.evaluate(() => {
    const s = window.__scene;
    const w = s.world;
    // per-district accounting
    const byDistrict = {};
    for (const b of w.built) byDistrict[b.id] = true;
    // interactable labels, deduplicated
    const labels = [...new Set(w.interactables.map((i) => i.label))].sort();
    // tree kinds actually placed
    const treeKinds = {};
    for (const t of w.trees) treeKinds[t.kind] = (treeKinds[t.kind] || 0) + 1;
    const propKinds = {};
    for (const p of w.props) propKinds[p.kind] = (propKinds[p.kind] || 0) + 1;
    return {
      stats: w.stats,
      districts: Object.keys(byDistrict),
      interactables: w.interactables.length,
      labels,
      treeKinds, propKinds,
      lights: w.lights.length,
      memory: { ...s.renderer.info.memory },
      programs: s.renderer.info.programs?.length ?? 0,
    };
  });

  // per-view cost across every hero view
  const views = await page.evaluate(async () => {
    const m = await import('/src/systems/cameras.js');
    return m.HERO_VIEWS.map((v) => ({ id: v.id, name: v.name, x: v.x, z: v.z,
                                      yaw: v.yaw, pitch: v.pitch ?? 0, time: v.time, note: v.note }));
  });

  const rows = [];
  for (const v of views) {
    const r = await page.evaluate(async ([vv]) => {
      const s = window.__scene;
      s.player.teleport(vv.x, vv.z, vv.yaw, vv.pitch);
      if (vv.time) { s.time.set(vv.time); s.pipeline.setGrade(s.time.grade); }
      else { s.time.set('day'); s.pipeline.setGrade('day'); }
      for (let i = 0; i < 6; i++) s.pipeline.render();
      const times = [];
      for (let i = 0; i < 30; i++) {
        const t0 = performance.now();
        s.pipeline.render();
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      return { calls: s.pipeline.sceneInfo.calls, tris: s.pipeline.sceneInfo.triangles,
               ms: times[15], p99: times[29], y: s.player.pos.y };
    }, [v]);
    rows.push({ ...v, ...r });
  }

  const src = countLines('src');
  const tools = countLines('tools');
  const docs = fs.readdirSync('docs/recon').filter((f) => f.endsWith('.md'))
    .map((f) => ({ f, lines: fs.readFileSync(path.join('docs/recon', f), 'utf8').split('\n').length }));

  const shotDirs = fs.existsSync('qa/shots')
    ? fs.readdirSync('qa/shots').filter((d) => fs.statSync(path.join('qa/shots', d)).isDirectory())
    : [];
  const shotCount = shotDirs.reduce((n, d) =>
    n + fs.readdirSync(path.join('qa/shots', d)).filter((f) => f.endsWith('.jpg')).length, 0);

  const out = { world, rows, src, tools, docs, shotCount, errors: [...new Set(errors)] };
  fs.mkdirSync('qa', { recursive: true });
  fs.writeFileSync('qa/qa.json', JSON.stringify(out, null, 2));

  const med = rows.map((r) => r.ms).sort((a, b) => a - b);
  const maxCalls = rows.slice().sort((a, b) => b.calls - a.calls)[0];
  const maxTris = rows.slice().sort((a, b) => b.tris - a.tris)[0];

  console.log('--- world ---');
  console.log(JSON.stringify(world.stats, null, 1));
  console.log('districts   :', world.districts.length, world.districts.join(' '));
  console.log('interactions:', world.interactables);
  console.log('trees       :', Object.entries(world.treeKinds).map(([k, v]) => `${k}:${v}`).join(' '));
  console.log('props       :', Object.entries(world.propKinds).map(([k, v]) => `${k}:${v}`).join(' '));
  console.log('--- cost ---');
  console.log('hero views  :', rows.length);
  console.log('max calls   :', maxCalls.id, maxCalls.calls);
  console.log('max tris    :', maxTris.id, Math.round(maxTris.tris / 1000) + 'k');
  console.log('median ms   :', med[Math.floor(med.length / 2)]?.toFixed(1),
              ' worst:', med[med.length - 1]?.toFixed(1));
  console.log('shots on disk:', shotCount);
  if (out.errors.length) {
    console.log('--- page errors ---');
    for (const e of out.errors.slice(0, 15)) console.log('  ', e.slice(0, 200));
  }

  await browser.close();
  if (server) server.kill();
  process.exit(0);
};

main().catch((e) => { console.error(e); if (server) server.kill(); process.exit(1); });
