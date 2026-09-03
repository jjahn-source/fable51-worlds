#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * Build the standalone viewer.
 *
 * Concatenates the chrome around the production bundle to make ONE HTML file
 * with no external dependency except the Google Fonts stylesheet -- which is
 * optional, since every family declares a real local fallback.
 *
 * Two outputs from one set of sources, so they cannot drift:
 *
 *   viewer/higashiyama.html         a complete document; open it from disk
 *   viewer/higashiyama-viewer.html  a body fragment, for a host that supplies
 *                                   its own <!doctype>/<head>/<body> skeleton
 *
 * The bundle is inlined rather than linked because a `<script src>` next to a
 * `file://` page is fine but a `type="module"` one is not: module fetches are
 * CORS-checked even for local files, so a linked module fails to load off the
 * filesystem with a bare console error. An INLINE module has nothing to fetch
 * and runs anywhere.
 *
 *   node viewer/build.mjs
 * ------------------------------------------------------------------ */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const V = (f) => path.join(root, 'viewer', f);

const assets = path.join(root, 'dist', 'assets');
if (!fs.existsSync(assets)) {
  console.error('No dist/ — run `npx vite build` first.');
  process.exit(1);
}
const bundleFile = fs.readdirSync(assets).filter((f) => f.endsWith('.js')).sort().pop();
const bundle = fs.readFileSync(path.join(assets, bundleFile), 'utf8');

/* An inline <script> is terminated by the first `</script` in its text, so a
 * bundle containing one would truncate the page. three.js and this world do
 * not, but the check costs nothing and the failure would be baffling. */
if (/<\/script/i.test(bundle)) {
  console.error('Bundle contains a literal "</script" — cannot inline safely.');
  process.exit(1);
}

const meta = fs.readFileSync(V('_meta.html'), 'utf8');
const body = fs.readFileSync(V('_body.html'), 'utf8');
const tail = fs.readFileSync(V('_tail.html'), 'utf8');

const fragment = `${meta}\n${body}\n<script type="module">\n${bundle}\n${tail}`;

const document_ = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
${meta.trim()}
</head>
<body>
${body}
<script type="module">
${bundle}
${tail}
</body>
</html>
`;

fs.writeFileSync(V('higashiyama.html'), document_);
fs.writeFileSync(V('higashiyama-viewer.html'), fragment);

const mb = (s) => (Buffer.byteLength(s) / 1048576).toFixed(2);
console.log(`bundle       ${bundleFile}  ${mb(bundle)} MB`);
console.log(`standalone   viewer/higashiyama.html         ${mb(document_)} MB`);
console.log(`fragment     viewer/higashiyama-viewer.html  ${mb(fragment)} MB`);
