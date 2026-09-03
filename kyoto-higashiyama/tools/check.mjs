#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * Syntax check every source file.
 *
 * Vite's failure mode for a file that does not parse is a 500 on the module
 * request, which reaches the page as a WebSocket connection error and reaches
 * the QA tools as "ERR_CONNECTION_REFUSED" -- i.e. as something that looks like
 * a dead dev server rather than like a syntax error in one file.  This says
 * which file, and where.
 *
 *   node tools/check.mjs
 * ------------------------------------------------------------------ */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const roots = ['src', 'tools'];
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) files.push(p);
  }
};
for (const r of roots) if (fs.existsSync(r)) walk(r);

let bad = 0;
for (const f of files) {
  try {
    await build({
      entryPoints: [f],
      bundle: false,
      write: false,
      format: 'esm',
      logLevel: 'silent',
    });
  } catch (e) {
    bad++;
    const errs = (e.errors || []).slice(0, 2);
    console.log(`✘ ${f}`);
    for (const er of errs) {
      const loc = er.location;
      console.log(`    ${er.text}${loc ? `  (line ${loc.line})` : ''}`);
      if (loc && loc.lineText) console.log(`    | ${loc.lineText.trim().slice(0, 100)}`);
    }
  }
}

console.log(`\n${files.length} files checked, ${bad} with syntax errors`);
process.exit(bad ? 1 : 0);
