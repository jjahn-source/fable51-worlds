#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * Assemble the tour film from the recorded frames.
 *
 * Emits three things:
 *
 *   media/kyoto-higashiyama-walkthrough.mp4   the film, H.264, yuv420p
 *   media/preview.gif                         a short loop for the README
 *   media/NN-*.jpg                            stills pulled from named beats
 *
 * `yuv420p` and the even-dimension filter are not optional: an odd width or
 * a 4:4:4 pixel format produces an MP4 that plays in ffplay and in a browser
 * and shows nothing at all in QuickTime and in GitHub's own player.
 *
 *   node tools/tour_encode.mjs
 * ------------------------------------------------------------------ */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const FPS = 30;
const IN = 'media/frames';
const MP4 = 'media/kyoto-higashiyama-walkthrough.mp4';
const GIF = 'media/preview.gif';

if (!fs.existsSync(IN) || !fs.readdirSync(IN).length) {
  console.error(`No frames in ${IN} — run tools/tour_video.mjs first.`);
  process.exit(1);
}
const n = fs.readdirSync(IN).filter((f) => f.endsWith('.png')).length;
console.log(`${n} frames`);

const run = (args, label) => {
  process.stdout.write(`· ${label} … `);
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (r.status !== 0) {
    console.log('FAILED');
    console.error((r.stderr || '').split('\n').slice(-14).join('\n'));
    process.exit(1);
  }
  console.log('ok');
};

/* ---------------------------------- mp4 --------------------------------- */
run([
  '-y', '-loglevel', 'error',
  '-framerate', String(FPS),
  '-i', `${IN}/%05d.png`,
  '-c:v', 'libx264',
  '-preset', 'slow',
  /* CRF 23, not 19.
   *
   * GitHub refuses any file over 100 MB and warns over 50, and 54 seconds of
   * 1080p cel-shaded animation at CRF 19 comes out at 105 MB.  Flat colour and
   * hard edges are exactly what H.264 compresses well, so the visible cost of
   * 23 here is close to nothing while the file roughly halves. */
  '-crf', '23',
  '-pix_fmt', 'yuv420p',
  // browsers stream a file whose index is at the front
  '-movflags', '+faststart',
  '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
  MP4,
], `encoding ${MP4}`);

/* ---------------------------------- gif --------------------------------- */
/* The preview loops the pagoda reveal -- the beat the whole world is composed
 * around -- rather than the opening, because a README thumbnail gets about two
 * seconds of attention and an establishing shot spends them on context. */
const GIF_FROM = 30.4, GIF_LEN = 4.0;
const palette = 'media/_palette.png';
run([
  '-y', '-loglevel', 'error',
  '-framerate', String(FPS), '-start_number', String(Math.round(GIF_FROM * FPS)),
  '-i', `${IN}/%05d.png`, '-frames:v', String(Math.round(GIF_LEN * FPS)),
  '-vf', 'fps=12,scale=760:-1:flags=lanczos,palettegen=max_colors=128:stats_mode=diff',
  palette,
], 'gif palette');
/* `-frames:v` is an OUTPUT option, so with two inputs it has to come after
 * both of them or ffmpeg reads it as an input option on the palette. */
run([
  '-y', '-loglevel', 'error',
  '-framerate', String(FPS), '-start_number', String(Math.round(GIF_FROM * FPS)),
  '-i', `${IN}/%05d.png`,
  '-i', palette,
  '-lavfi', 'fps=12,scale=760:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4',
  '-frames:v', String(Math.round(GIF_LEN * 12)),
  '-loop', '0',
  GIF,
], `encoding ${GIF}`);
fs.rmSync(palette, { force: true });

/* --------------------------------- stills -------------------------------- *
 * Beat MIDPOINTS from tools/tour_video.mjs, where the push has settled and no
 * cross-fade is in flight.  They move whenever a beat duration changes, so
 * recompute them from BEATS (t starts at AIR.dur; each beat advances t by its
 * own dip + dur) rather than nudging them by eye.  One per scene, late in the
 * shot, where the move has arrived. */
const STILLS = [
  [5.00,  '01-over-the-roofs'],
  [11.60, '02-gion-shirakawa'],
  [17.60, '03-yasaka-shrine'],
  [24.60, '04-maruyama-weeping-cherry'],
  [34.10, '05-yasaka-pagoda'],
  [40.20, '06-sannenzaka'],
  [49.40, '07-kiyomizu-dera'],
];
for (const [t, name] of STILLS) {
  const f = path.join(IN, String(Math.round(t * FPS)).padStart(5, '0') + '.png');
  if (!fs.existsSync(f)) { console.log(`· still ${name} — frame missing, skipped`); continue; }
  run(['-y', '-loglevel', 'error', '-i', f, '-q:v', '3', `media/${name}.jpg`], `still ${name}`);
}

const mb = (f) => (fs.statSync(f).size / 1048576).toFixed(1);
console.log(`\n${MP4}  ${mb(MP4)} MB`);
console.log(`${GIF}  ${mb(GIF)} MB`);
console.log(`stills: ${fs.readdirSync('media').filter((f) => f.endsWith('.jpg')).length}`);
