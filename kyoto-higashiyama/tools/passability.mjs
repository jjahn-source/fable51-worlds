#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * Street passability.
 *
 * The walkthrough tells you the player got stuck; this tells you which street
 * is closed and where.  For every corridor in the world it steps along the
 * centreline and, at each station, sweeps the full paved width looking for a
 * lane the walker's 0.34 m disc could pass through.  A station with no clear
 * lane is a wall across the street.
 *
 * This is the check that scales: a world with twelve thousand colliders and
 * twenty-odd streets cannot be audited by walking it, but it can be audited by
 * asking every metre of every street whether it is open.
 *
 *   node tools/passability.mjs
 *   node tools/passability.mjs --street=yasakadori
 * ------------------------------------------------------------------ */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';

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
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__shot === 'function', { timeout: 180000 });
  await page.waitForTimeout(2500);

  const report = await page.evaluate(async ([only]) => {
    const w = window.__scene.world;
    const R = 0.34, STEP_UP = 0.42;
    const out = [];

    for (const c of w.corridors) {
      if (only && c.id !== only) continue;
      const blocked = [];
      const half = c.half;
      for (let s = 0; s <= c.length; s += 1.5) {
        const p = c.pointAt(s);
        const nx = -p.tz, nz = p.tx;
        const feet = w.heightAt(p.x, p.z);
        let clear = false;
        // sweep the paved width; a lane is clear if a 0.34 m disc fits
        for (let o = -half + R; o <= half - R + 1e-6; o += 0.25) {
          const x = p.x + nx * o, z = p.z + nz * o;
          const y = w.heightAt(x, z);
          const hit = w.colliders.some((k) =>
            (k.top === undefined || k.top > y + STEP_UP) &&
            (k.bottom === undefined || k.bottom < y + 1.95) &&
            x > k.x0 - R && x < k.x1 + R && z > k.z0 - R && z < k.z1 + R);
          if (!hit) { clear = true; break; }
        }
        if (!clear) blocked.push(+s.toFixed(1));
      }
      // collapse consecutive stations into runs
      const runs = [];
      for (const s of blocked) {
        const last = runs[runs.length - 1];
        if (last && s - last.to <= 1.6) last.to = s;
        else runs.push({ from: s, to: s });
      }
      if (runs.length) {
        out.push({
          id: c.id, name: c.spec.name, length: +c.length.toFixed(0), half,
          runs: runs.map((r) => {
            const p = c.pointAt((r.from + r.to) / 2);
            return { from: r.from, to: r.to, len: +(r.to - r.from + 1.5).toFixed(1),
                     x: +p.x.toFixed(1), z: +p.z.toFixed(1) };
          }),
        });
      }
    }
    return out;
  }, [args.street || null]);

  if (!report.length) {
    console.log('· every street is passable end to end');
  } else {
    for (const r of report) {
      const total = r.runs.reduce((n, x) => n + x.len, 0);
      console.log(`\n✘ ${r.id} (${r.name})  ${r.length} m long, ${total.toFixed(0)} m blocked`);
      for (const run of r.runs.slice(0, 8)) {
        console.log(`    ${run.len.toFixed(1).padStart(6)} m at s=${run.from}  (${run.x}, ${run.z})`);
      }
      if (r.runs.length > 8) console.log(`    ... and ${r.runs.length - 8} more runs`);
    }
  }
  fs.mkdirSync('qa', { recursive: true });
  fs.writeFileSync('qa/passability.json', JSON.stringify(report, null, 2));

  await browser.close();
  if (server) server.kill();
  process.exit(report.length ? 1 : 0);
};

main().catch((e) => { console.error(e); if (server) server.kill(); process.exit(1); });
