import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Dev-only frame grabber.  The page POSTs a rendered frame to disk so framing,
 * value and colour can be reviewed outside the browser -- which is the only way
 * any of this gets judged.  Not part of the build.
 */
function frameGrabber(outDir) {
  return {
    name: 'frame-grabber',
    apply: 'serve',
    configureServer(server) {
      fs.mkdirSync(outDir, { recursive: true });
      server.middlewares.use('/__shot', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('POST only');
        }
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            const name = (body.name || 'shot').replace(/[^\w.-]/g, '_');
            const dir = body.dir ? path.join(outDir, String(body.dir).replace(/[^\w.-]/g, '_')) : outDir;
            fs.mkdirSync(dir, { recursive: true });
            const data = String(body.data || '').replace(/^data:image\/\w+;base64,/, '');
            const ext = body.png ? '.png' : '.jpg';
            const file = path.join(dir, name.endsWith(ext) ? name : name + ext);
            fs.writeFileSync(file, Buffer.from(data, 'base64'));
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: true, file, bytes: data.length }));
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e));
          }
        });
      });
    },
  };
}

const SHOT_DIR = path.resolve(process.cwd(), 'qa/shots');

export default defineConfig({
  base: './',
  plugins: [frameGrabber(SHOT_DIR)],
  server: {
    port: 5180, host: '127.0.0.1', open: false,
    /* The frame grabber writes JPEGs into `qa/shots/`, which is inside the
     * project -- so without this, every captured frame trips the dev server's
     * file watcher and **full-reloads the page in the middle of the capture
     * run**.  The symptom is not an error: it is a batch of shots where some
     * frames are of a half-built world, or where the camera is back at spawn,
     * and nothing anywhere says why.  Reported by an agent whose renders kept
     * coming back inexplicably wrong. */
    watch: { ignored: ['**/qa/**', '**/dist/**', '**/docs/**'] },
  },
  preview: { port: 5181, host: '127.0.0.1' },
  build: {
    outDir: 'dist',
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2400,
  },
});
