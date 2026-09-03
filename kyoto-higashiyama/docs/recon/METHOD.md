# METHOD — reverse-engineered engineering + art-direction handbook

Source: `sakura-crossing` (three.js 0.180 + Vite 6, ~61 k lines, 26 districts,
zero binary assets except one music track). This document extracts the
*methodology* so the same machine can be rebuilt for another city.

Deliberately **not** covered here (assumed known): `core/toon.js` (cel ramp +
shadow-tint BRDF patch), `core/post.js` (grade / split-tone), `core/outline.js`
(second-difference depth ink + inverted-hull), `core/palette.js`.

Everything below is either quoted from the repo or measured in it.

---

## 0. The shape of the project

```
index.html            one <canvas id="view">, one <script type="module" src="./src/main.js">, ~450 lines of CSS
vite.config.js        dev server on 5178, preview on 5179, base './', + the __shot middleware
src/main.js           renderer, lights, fog, camera, HUD, music, pipeline, rAF loop, window.__shot
src/core/             util, toon, post, outline, palette, textures, player, sky, hud, audio
src/world/            planet, street, landform, ground, plots, props, streetprops, shops, buildings,
                      housing, blocks, vehicles, trees, petals, + one module per district
CLAUDE.md             184 KB engineering handbook: run, verify, conventions, traps, state
NEXT.md               157 KB handover log, newest-round-first
README.md             56 KB player/reader-facing
```

`package.json` scripts are the whole build surface:

```json
"dev":     "vite",                                     // port 5178, HMR, __shot mounted
"build":   "vite build",
"preview": "vite preview",
"play":    "vite build && vite preview --port 5179 --open"
```

Dependencies: `three ^0.180.0` and `vite ^6` and nothing else. No loaders, no
GLTF, no texture files. That is a hard art-direction constraint, not an
accident — see §6.

---

## 1. The screenshot / QA harness — `__shot`

This is the single highest-leverage piece of infrastructure in the repo. Rebuild
it first, before any world content.

### 1.1 Why it exists

CLAUDE.md, verbatim:

> **`computer{action:"screenshot"}` does not work here.** The Browser pane does
> not composite, so screenshots time out and `requestAnimationFrame` never
> fires. Do not waste turns on it.

And the reason it is worth the trouble at all:

> **This project's bugs are visual, not exceptions.** Every significant bug found
> so far threw nothing and logged nothing — terrain sampled at the wrong z
> covering the road, window frames winning the depth test over the glass behind
> them, vending machine stock buried inside an opaque body, rails the same tonal
> value as the concrete they cross, a planet shadowing its own surface. A clean
> console means nothing. Render a frame and look at it.

### 1.2 Server half — a Vite dev-only middleware

`vite.config.js`, complete:

```js
function frameGrabber(outDir) {
  return {
    name: 'frame-grabber',
    apply: 'serve',                                   // dev only; absent in a build
    configureServer(server) {
      fs.mkdirSync(outDir, { recursive: true });
      server.middlewares.use('/__shot', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('POST only'); }
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            const name = (body.name || 'shot').replace(/[^\w.-]/g, '_');
            const data = String(body.data || '').replace(/^data:image\/\w+;base64,/, '');
            const file = path.join(outDir, name.endsWith('.jpg') ? name : name + '.jpg');
            fs.writeFileSync(file, Buffer.from(data, 'base64'));
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: true, file, bytes: data.length }));
          } catch (e) { res.statusCode = 500; res.end(String(e)); }
        });
      });
    },
  };
}
const SHOT_DIR = path.resolve(process.cwd(), '.shots');
export default defineConfig({ base: './', plugins: [frameGrabber(SHOT_DIR)], ... });
```

`.shots/` is gitignored. `base: './'` so a build runs from any subdirectory
(filesystem, GitHub Pages project path).

### 1.3 Client half — `window.__shot`

Gated behind `import.meta.env?.DEV`, at the bottom of `main.js`. Its absence is
therefore *the* reliable signal that you are on a production build.

Signature: `__shot(name, W = 1600, H = 900, opts = {})`, returns the server JSON.

What it does, in order:

1. **Move the player, not the camera.** `opts.pos` sets `player.pos.x/z` only;
   `pos[1]` is ignored. `opts.yaw` / `opts.pitch` set the look.
2. **Re-derive the feet**: `player.pos.y = world.heightAt(player.pos.x, player.pos.z)`
   — note: *no* `fromY`, so it is the max over every platform. Then
   `player.bob = 0; player.applyCamera(0)`.
   > "always resync the camera: the rAF loop is throttled when the page is not
   > compositing, so the camera cannot be assumed to match the player"
3. **Orbit mode** if `opts.orbit !== undefined`: switches to planet view, sets
   `orbitDir = normalize(sin(orbit)·tilt, 1, cos(orbit)·tilt)`, camera at
   `CENTER + orbitDir · R · dist`, `camera.lookAt(CENTER)`, fixed external sun.
4. **Pass toggles**: `opts.ink`, `opts.grade` write `pipeline.enabled.*`;
   `pipeline.forceScale = opts.scale || 1`.
5. **Resize**: `camera.aspect = W/H`, `pipeline.setSize(W,H)`,
   `setOutlineResolution(pipeline.size.x, pipeline.size.y)`.
6. **Re-seat the lights** into the player's local surface frame (see §8.4) —
   skipped in orbit mode.
7. **Trail the sky**: dome and clouds copy `camera.position` on the ground, and
   sit at the origin in orbit so the gradient reads as a real sky.
8. `pipeline.render()`, then draw the WebGL canvas into an offscreen 2D canvas
   at `opts.outW || W`, `toDataURL('image/jpeg', opts.quality || 0.86)`, POST to
   `/__shot`.

Call sites (from the browser JS eval tool):

```js
await __shot('name', 1600, 900, { pos: [1.85, 0, 13.6], yaw: 0.2, pitch: -0.01 })
await __shot('planet', 1300, 1300, { orbit: 0.6, dist: 3.4, tilt: 0.85 })   // orbit view
await __shot('raw', 1600, 900, { ink: false })                              // pass toggles
```

Then `Read` the file at `.shots/name.jpg`.

### 1.4 The verification loop

The loop the repo actually runs, in order of cost:

1. **Build headless, before any screenshot.** A throw inside `buildWorld` leaves
   `window.__scene` **undefined and the console empty** — the error is swallowed
   and every later `__shot` fails with a message that says nothing.

   ```js
   try {
     const w = await import('/src/world/index.js?t=' + Date.now());
     w.buildWorld({ add() {}, children: [], traverse() {} });
     'built OK';
   } catch (e) { 'THROW: ' + e.stack; }
   ```

   `buildWorld` only ever calls `scene.add`, so a three-method stub is enough.
   This is "the first thing to run after any edit".

2. **Step the world by hand.** Nothing animates because rAF never fires:

   ```js
   const w = window.__scene.world;
   for (let i = 0; i < 60 * 120; i++) w.update(1 / 60);   // 120 simulated seconds
   ```

   An `E` interaction is fire → step → shoot:

   ```js
   const s = window.__scene;
   s.world.interactables.find((i) => i.label.includes('自動販売機')).action();
   for (let i = 0; i < 24; i++) s.world.update(1 / 60);
   await __shot('vend', 1300, 780, { pos: [14, 0, 7.6], yaw: -1.5708, pitch: -0.30 })
   ```

3. **Ridable things need their own pose first.** `__shot` moves the player and
   re-derives `pos.y`, but only `ebike.update()` moves the machine onto it — so
   set the pose, step, then shoot with an **empty** options object:

   ```js
   const s = window.__scene, p = s.player;
   p.pos.set(1.6, 0, 30); p.pos.y = s.world.heightAt(1.6, 30); p.yaw = 0; p.pitch = -0.02;
   s.ebike.summon(); s.ebike.mount(); s.ebike.update();
   await __shot('ride', 1200, 700, {})          // <- no `pos`, no `yaw`
   ```

   A ride is simulated by `player.locked = true`, adding to `player.keys`, and
   stepping `player.update(1/60)` and `ebike.update()` together.

4. **"Can this be seen?" is a raycast, not a screenshot** — and it needs no
   browser: import a builder in Node with `document` stubbed by a proxy that
   no-ops every Canvas2D call (no geometry depends on canvas content), step the
   animation, fire a ray from a plausible eye stopping just short of the target.
   What comes back is *which mesh* is in the way and for how many frames.

5. **Raycast to identify a mystery shape in a frame.** `Raycaster.setFromCamera`
   reads `camera.matrixWorld`, which `__shot` does **not** flush. Render the
   frame first, then `camera.updateMatrixWorld(true)`, or the ray fires from
   wherever the camera was two shots ago.

   > "**A pale surface filling half a frame is worth one raycast, not three
   > guesses.** … Guessing from the shape of it was wrong three times out of
   > three."

   To turn a hit back into flat coordinates, minimise
   `positionAt(x, 0, z).distanceTo(hit)` over a coarse-to-fine sweep — four
   passes at 4 / 1 / 0.25 / 0.05 m converge in milliseconds.

6. **Flood-fill for reachability.** See §10.4 — the only tool that finds
   blockages, and none of them show in a render.

### 1.5 Camera bookkeeping — the rules that cost turns

- **`yaw = atan2(-dx, -dz)`.** 0 looks along −z, +π/2 along −x, π along +z.
  Paste a helper in and *derive* it, never write the number:

  ```js
  window.look = (from, to) => Math.atan2(-(to[0] - from[0]), -(to[1] - from[1]));
  await __shot('x', 1400, 790, { pos: [13.4, 0, 44.4], yaw: look([13.4, 44.4], [15.8, 51.5]), pitch: 0.1 })
  ```

  Three camera lines in the repo were written with `atan2(+dx, +dz)` — the same
  number reflected through the origin — and each returned "a perfectly composed
  frame of something else". **If a frame does not contain the thing its comment
  names, suspect the sign before suspecting the world.**

- **Check a new camera position against `world.colliders` first**, or expect to
  throw the first three away. `__shot` does not care whether the spot is inside
  a shop, a vending machine or a parked van, and "the frame that comes back is a
  wall with a ceiling on it and no clue why".

- **On hills, also check the sight line**, not just the colliders:

  ```js
  const sees = (x, z, tx, tz, ty) => {                 // eye 1.7 over the platform
    const y0 = hillAt(x, z) + 0.22 + 1.7;
    for (let t = 0.05; t < 1; t += 0.03) {
      const px = x + (tx - x) * t, pz = z + (tz - z) * t;
      if (hillAt(px, pz) > y0 + (ty - y0) * t - 0.4) return false;
    }
    return true;
  };
  ```

  Run it over the whole ridge and take the highest point that passes. 75 points
  passed on one ridge; the best was found this way and "no amount of looking at
  renders would have said so".

- **Water**: `__shot` seats the feet from `heightAt`, which inside a lake is the
  **bed**, so a spot 2 m off the shore puts the camera 0.5–2.6 m *under* the
  surface — and single-sided water is invisible from below. The frame is a huge
  flat pale area with the scene floating above it. Check `heightAt(x,z)` against
  the water level before using a shoreline camera.

- **Multi-level districts**: `__shot` calls `heightAt` with **no `fromY`**, i.e.
  the max over every platform. Anywhere inside a building with a roof deck it
  seats the camera on the deck, metres above where you asked. Measured: 5.75 m
  on the supermarket.

- **Aiming an orbit camera** is done with the planet's own mapping:

  ```js
  const P = await import('/src/world/planet.js');
  const v = new THREE.Vector3(); P.positionAt(123, 0, 0, v);
  const d = v.clone().sub(P.CENTER).normalize();
  // orbit = atan2(d.x, d.z);  tilt = hypot(d.x, d.z) / d.y
  ```

  Guessed values put the camera over the wrong hemisphere both times it was tried.

### 1.6 The shot table is a committed artefact

CLAUDE.md carries ~120 named establishing shots, one or more per district, each
with a one-line comment saying what it frames:

```js
await __shot('open',    1400, 790, {})                                              // the opening frame
await __shot('gate',    1400, 790, { pos: [12.6, 0, -49.5], yaw: -1.42, pitch: 0.1 })  // the 昇降口
await __shot('lkPier',  1400, 790, { pos: [166.0, 0, -80.0], yaw: look([166,-80],[200,-98]), pitch: -0.05 })
```

The rule: **use them before and after any change that could touch them.** Later
entries are written with `look()` inline rather than a literal yaw, precisely
because three literal ones were 180° out.

### 1.7 In-game coordinate readout

`C` toggles a bottom-right readout (`hud.js`). It reports the **flat authoring**
position — "the only coordinate system any builder, collider or camera call
uses" — plus a compass direction and a ready-made line:

```
{ pos: [13.4, 0, 44.4], yaw: 0.10, pitch: 0.06 }
```

`Shift+C`, or clicking the readout, copies that to the clipboard (two routes:
`navigator.clipboard` then a `<textarea>` + `execCommand` fallback, because a
pointer-locked canvas swallows the click and the clipboard API needs a gesture).
That is the fastest way to be told exactly where something is wrong.

The compass has one subtlety worth copying:

```js
// forward = (-sin yaw, 0, -cos yaw), so yaw 0 faces -z and yaw grows *clockwise*
// through -x: the index has to count DOWN the table, not up.
const DIRS = ['north +z', 'north-west', 'west -x', 'south-west',
              'south -z', 'south-east', 'east +x', 'north-east'];
const compass = DIRS[(((4 - Math.round((y / (Math.PI * 2)) * 8)) % 8) + 8) % 8];
```

Also: `O` toggles the ink pass, `G` the grade pass, `P` orbit view, `H` the hint
line — quiet toggles that exist so you can see what each pass contributes.

### 1.8 What to measure, and what not to

> **Wall-clock frame time on this machine drifts 33–42 ms run to run** with
> nothing changed, so it cannot resolve anything smaller than about 8 ms.
> Compare **draw calls** when judging a change, and only trust a timing
> difference you can reproduce across several alternating A/B runs in one page
> session.

Draw calls are accumulated by summing `renderer.info.render.calls` across every
pass of one `__shot`.

---

## 2. World assembly — `buildWorld(scene)` and the `ctx` contract

`src/world/index.js` is the registry. It is ~800 lines and its whole job is:
create the root group, create `ctx`, run base layers, run an ordered `districts`
array, gather planting, bake to the planet, return the `world` API.

### 2.1 The context object

```js
const colliders = [];        // { x0, z0, x1, z1, top, bottom? }
const interactables = [];    // { hitbox: Mesh, label: string, action: () => void }
const updaters = [];         // (dt) => void
const platforms = [];        // { x0, x1, z0, z1, top }   — raise the ground
const cuts = [];             // { x0, x1, z0, z1, top }   — lower the ground

const ctx = {
  scene, root, colliders, interactables,
  add: (obj) => { root.add(obj); return obj; },
  collide: (x0, z0, x1, z1, top, bottom) => colliders.push({
    x0: Math.min(x0,x1), x1: Math.max(x0,x1),
    z0: Math.min(z0,z1), z1: Math.max(z0,z1), top, bottom }),
  platform: (p) => platforms.push(p),
  cut: (c) => cuts.push(c),
  groundAt: (x, z) => { ... },      // see below
  interact: (i) => interactables.push(i),
  update: (fn) => updaters.push(fn),
};
```

That is the entire surface a district module is given. Note what is *not* there:
no material registry, no scene graph queries, no asset loader.

**`ctx.collide` argument order is `(x0, z0, x1, z1, top, bottom)`** — x-pair then
z-pair, not two points. Min/max are applied for you.

**`bottom` is optional** and makes a collider start at a height: anything whose
feet are more than 1.9 m below it walks straight through. It exists for barriers
whose job is only up in the air (a roof parapet that must stop a walker on the
deck and must not be a wall across the shop doorway five metres below).
Everything else leaves it undefined.

**`ctx.groundAt(x, z)`** is the height a prop actually stands on:

```js
groundAt: (x, z) => {
  let h = streetHeight(x, z) + reliefAt(x, z) + hillAt(x, z);
  for (const c of cuts)     if (inside) h = Math.min(h, c.top);
  for (const p of platforms) if (inside) h = Math.max(h, p.top);
  return h;
}
```

Cuts first, then platforms: an excavated bank is lowered to the made level and
the 60 mm path slab laid on it raises it back. It gives the same answer
`world.heightAt` does with no `fromY`, and it is **only meaningful once whatever
laid that surface has run** — which is why the housing sweep is last but one.

### 2.2 Assembly order

```js
const planet   = buildPlanet(scene);   // the sphere itself
buildStreet(ctx);                      // centreline, terrain grid, carriageway, footways
const crossing = buildRailway(ctx);
const train    = buildTrain(ctx);
const shop     = buildShop(ctx);
// ... a data-driven pass of houses, garden walls, retaining walls, poles, wires
const districts = [ buildHills(ctx), buildTunnel(ctx), buildSchool(ctx), ... ];
```

Order in the `districts` array **is** `ctx.groundAt` order:

> A block that sits against another district's surfaces has to run after them
> (一丁目 needs the canal's verge pad to derive its step rises, 四丁目 arrives off
> the library's corner pad, 公園前 measures itself off the overbridge) and all of
> them run before `buildDistrict`, so the housing sweep seats its clutter on the
> lanes they lay rather than on the bare grade.

Ground-producing modules go first (the hills are "the only module other than
`street.js` that produces a walkable surface rather than things standing on
one"). Anything that reads a *measured* surface goes after the module that laid
it. Vehicles run **last but one** because a car is seated with `ctx.groundAt`
and half of them stand on a district-laid apron; `buildDetails` is last.

### 2.3 Planting is gathered, not planted

```js
for (const d of districts) if (d.update) ctx.update(d.update);
const extraSakura = districts.flatMap((d) => d.sakura ?? []);
const extraShrubs = districts.flatMap((d) => d.shrubs ?? []);
buildGrove (ctx, districts.flatMap((d) => d.grove  ?? []));
buildCedar (ctx, districts.flatMap((d) => d.cedar  ?? []));
buildBamboo(ctx, districts.flatMap((d) => d.bamboo ?? []));
buildFallenPatches(ctx, districts.flatMap((d) => d.petals ?? []));
// ... then the street's own sakura list .concat(extraSakura) -> buildSakura(ctx, spots)
```

> The tree and petal builders merge the whole world into a handful of instanced
> meshes, so they must run once, at the end — planting inside a district
> multiplies the draw calls by the number of districts.

### 2.4 The bake, and the returned API

```js
const bakeStats = bakeToPlanet(root, { maxEdge: 4.0 });
train.planetize();
```

> Runs last, once every builder has finished. Everything above this line is
> still authored on a flat plane and has no idea the planet exists.

```js
const world = {
  root, colliders, platforms, cuts, interactables,
  train, crossing, shop, petals, planet, bakeStats,
  bounds: { z0: -CIRCUMFERENCE * 0.24, z1: CIRCUMFERENCE * 0.24 },   // x wraps; only z is bounded
  heightAt(x, z, fromY) { ... },
  update(dt) { updateSequence(dt); train.update(dt); for (const fn of updaters) fn(dt); petals.update(...); },
};
```

`heightAt` is the one function the whole simulation rests on:

```js
heightAt(x, z, fromY) {
  let h = streetHeight(x, z) + reliefAt(x, z) + hillAt(x, z);
  for (const c of cuts)
    if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) h = Math.min(h, c.top);
  const reach = fromY === undefined ? Infinity : fromY + 0.55;
  for (const p of platforms) {
    if (p.top > reach) continue;
    if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1) h = Math.max(h, p.top);
  }
  return h;
}
```

- **Pass `fromY` for anything that walks.** With it, a platform is only eligible
  if it is within **0.55 m** of where you already are — which is what lets an
  elevated deck be walked *under* as well as on. Omit it and a 7 m overbridge
  teleports anybody who steps beneath it onto the deck.
- **Builders seating props should keep omitting it.**
- Two walkable levels still cannot share a footprint *at the same height*, so a
  switchback whose flights stack in plan is out; both bridge towers are quarter
  turns.
- The platform test is **strictly exclusive on all four sides** — see the
  overlapping-treads trap in §9.

---

## 3. District module conventions

### 3.1 Signature

```js
// src/world/<name>.js
export function build<Name>(ctx) {
  const m = mats();            // module-local lazily-built material cache
  const gm = groundMats();     // shared civil-works materials
  const rng = rngKit(9300);    // one seed per module
  const sakura = [], shrubs = [], grove = [], petals = [];

  buildLane(ctx, m, gm);
  buildRow(ctx, m, gm, rng, shrubs, petals);
  // ...

  return { sakura, shrubs, grove, petals };            // + optional bamboo, cedar, rocks, tufts, moss
}
```

Then add it to the `districts` array in `index.js`, in the right position.

> **A module nobody imports builds nothing**, silently: three finished blocks sat
> complete and unreferenced in `src/world/` for a whole round because the
> `districts` array was never touched.

Optional extra keys in the return value:

- `update(dt)` — registered automatically by `index.js` for anything animated.
- Measured constants other districts need: `shrine.js` returns nothing extra,
  but `overbridge.js` returns `{ deckY, x }`, `school.js` returns
  `{ gateZ, xWest, y }`, `shotengai.js` returns `{ corridor: {x0,x1,z0,z1}, northZ }`.
  **A downstream district reads those rather than re-deriving them.**

### 3.2 The module header is a survey, and it is load-bearing

Every district file opens with a comment block in this shape (from `kawabata.js`):

```
 * ------------------------------------------------------------------ *
 * THE LAND, measured.  Envelope x 19.4..56.0, z -30.2..-40.8:
 *
 *   north   the canal's retaining kerb, z -30.20..-29.84, top 1.27, running
 *           x 10.45..44.00 -- **and stopping there.**  ...
 *   south   the school's north wall, x 10.60..56.00 at z -41.00, 2.35 m of
 *           block with mesh to 3.45 (`school.js`, `Z_S`/`X_W`/`X_E`)
 *   east    the school's east wall turns north at x 55.9 and runs to z -74
 *   west    the house at (14.4,-35.5), x 10.80..18.00, z -39.30..-31.70, with
 *           a 1.5 m slot north of it and a 1.62 m slot south
 *   in it   one grove tree, `canal.js`'s at (28.6, -34.2) at scale 1.8, whose
 *           collider is x 27.87..29.33, z -34.93..-33.47
 *
 * ------------------------------------------------------------------ *
 * WHAT THE ARITHMETIC DECIDED
 *
 * **The lane is at z = -32.2 because of that one tree.**  At -32.6 ... the
 * tree's collider comes 0.53 m into the south verge.  -32.2 clears it by 0.13 m
 * and still leaves 7.2 m of plot depth ...
 *
 * FLOODFILL -- every one of these must be reachable on foot from the spawn:
 *   slotNorth  [14.6, -30.9]  the 1.5 m slot north of the house, the way in
 *   laneWest   [21.0, -32.2]  the mouth, at the name plate
 *   rampFoot   [50.8, -29.2]  its foot, on the towpath
 * ------------------------------------------------------------------ */
```

Three rules come out of this:

1. **Start a new block by measuring the land, not by remembering it.** Query
   `world.colliders` over the envelope and the ground height on a grid *before*
   choosing a single coordinate. "The one time it was written from memory it left
   out a building and the lane went through it" — the shop at x 1.95..7.05,
   z 49.15..54.65 that a lane was then laid through for six metres.
2. **Write down the arithmetic that decided each number**, not the number.
3. **Every module carries a `FLOODFILL` waypoint list.** Twelve modules do. They
   are run *all together* after any change that adds furniture, because a 0.4 m
   pole on one street can seal a 1.4 m squeeze on another street in a different
   module.

### 3.3 Body conventions

- **Constants at module scope, with their derived extents in a trailing comment:**

  ```js
  const Y      = 1.05;     // flat over the whole parcel
  const LN_Z   = -32.2;    // the lane's centreline
  const LN_W   = 2.8;      // z -30.80 .. -33.60
  const NAGA = { x: 23.5, z: -37.9, units: 3, unitW: 2.5, d: 4.6, face: 'z+' }; // x 19.75..27.25, z -40.20..-35.60
  ```

- **Module-local material cache**, always the same idiom:

  ```js
  const M = {};
  function mats() {
    if (M.concrete) return M;
    M.concrete = cel({ color: PAL.concrete, bands: 3, tint: 0x6f6790 });
    ...
    return M;
  }
  ```

  `cel()` itself caches by parameter signature (see §3.5), so this is about
  keeping the call sites short, not about sharing.

- **The district body is a sequence of small `buildX(ctx, ...)` helpers**, each
  pushing planting into the arrays passed to it.

- **Seat everything with `ctx.groundAt(x, z)`**, never with the street profile:

  ```js
  const gA = (x, z) => ctx.groundAt(x, z);
  ctx.add(makeBench({ x: 56.3, z: -32.4, y: gA(56.3, -32.4), ry: -Math.PI / 2, len: 1.7 }));
  ```

### 3.4 Authoring frame — the single most important convention

**Everything is authored on the flat XZ plane.** `planet.js` projects the
finished world onto a sphere in one `bakeToPlanet()` pass at the end of
`buildWorld()`. Add content the flat way and the bake handles it — never write
spherical placement by hand.

**Every generator authors facing +Z and is rotated by `face`:**

```js
const FACE_RY = { 'z+': 0, 'z-': Math.PI, 'x+': Math.PI / 2, 'x-': -Math.PI / 2 };
```

> much less error-prone than branching on an axis inside every measurement

`makeShop`, `makeHouse`, `makeAtticHouse`, `makeWalkup`, `makeTerrace`,
`makeNagaya`, `makeOnsenUnit` all take `face`. Vehicles/bicycles/scooters use the
other convention — **authored along +x with the nose at +x** — so their `ry` is
the direction the nose faces (`0` = +x, `π/2` = −z, `π` = −x, `-π/2` = +z).

`plots.js` exists to stop callers doing this arithmetic:

```js
export function plotBox(o)                 // -> { ry, w, d, halfW, halfD, x0,x1,z0,z1, at(u,v), outRy, flankRy(side) }
export function plotCollide(ctx, p, top, pad = 0.1)
```

`plotBox.at(u, v)`: `u` runs along the frontage (local +X), `v` out of it
(local +Z, so `v > d/2` is in front of the building), both in the unit's frame,
converted to world once. `plotCollide` is "one function so no block writes
`x - w/2` for a unit whose width runs along z".

### 3.5 Materials

> **All materials go through `cel()` or `flat()`** from `src/core/toon.js`. Never
> construct a `MeshStandardMaterial` / `MeshToonMaterial` directly.

```js
cel({ color, bands = 3, tint = 0x6c5f8c, flat = true, map, emissive, emissiveIntensity,
      transparent, opacity, side, alphaTest, depthWrite, fog, alphaMap, vertexColors, cache = true })
flat({ color, map, transparent, opacity, depthWrite, side, alphaTest, fog, cache = true })
```

Both are **cached by parameter signature** so the whole street shares a few dozen
shader programs. The cache key is only computed when `!map && !alphaMap`; a
mapped material must pass `cache: false` explicitly at every call site in the
repo (the convention is universal — every mapped `cel`/`flat` call in the world
carries `cache: false`).

`bands` is `2`, `3` or the string `'soft'`. `tint` is the shadow tint fed to the
patched BRDF. Colours come from `PAL`.

### 3.6 Randomness

> **Use the seeded RNG** (`rngKit` in `src/core/util.js`) for anything random, so
> the street is identical on every load.

```js
export function mulberry32(seed) { ... }              // deterministic PRNG
export function rngKit(seed) {
  const r = mulberry32(seed);
  return { next: r,
           range: (a, b) => a + (b - a) * r(),
           int: (a, b) => Math.floor(a + (b - a + 1) * r()),
           pick: (arr) => arr[Math.floor(r() * arr.length) % arr.length],
           chance: (p) => r() < p,
           sign: () => (r() < 0.5 ? -1 : 1) };
}
```

Every generator takes a `seed` in its options and every call site passes a
distinct literal (`seed: 9381`, `seed: 9382`, …). Seeds are effectively part of
the art direction: changing one re-rolls a specific prop's variety and nothing
else.

### 3.7 Interactables

```js
const hit = box(0.8, 0.9, 0.9, flat({ color: 0xff0000, cache: false }), x, y, z);
hit.visible = false;                 // an invisible hitbox mesh, not a collider
ctx.add(hit);
ctx.interact({ hitbox: hit, label: 'ねこ  ·  say hello', action: () => { target = 1; } });
```

`player.pick()` raycasts against `interactables.map(i => i.hitbox)` with
`raycaster.far = 3.0`. The HUD prompt strips everything before `·`:
`hovered.label.replace(/^.*?·\s*/, '')`. The label's left half is the in-world
name (used by test code to find a machine by `label.includes('自動販売機')`), the
right half is the English verb shown to the player.

Animated interactables register a closure through `ctx.update(dt => …)` and keep
their state in the enclosing scope.

---

## 4. The batching architecture

**The scene is draw-call bound**, measured. Every structural decision below
follows from that one fact.

### 4.1 The decision rule

| situation | technique |
|---|---|
| Many parts, one material, **one placement** (a building, a flight of steps, a wall run, a pole) | `bake()` them into one geometry, one `Mesh` per material |
| **One** part shape, **many placements** (a blossom blob, a bamboo culm, a shrub, a petal, a bicycle in a rack) | `InstancedMesh`, one per material/tone |
| A multi-mesh prop group placed **dozens of times** (a planter, a loose bicycle) | bake the item into N geometries *by material*, then instance the N — `makeBikeRack` is the worked example |
| Anything scattered across the whole world (trees, petals) | collect spots from every district, build **once at the end** |

### 4.2 `bake()` — merged static geometry

`src/core/util.js`:

```js
export function bake(parts) {          // parts: [{ geometry, matrix }]
  let geos = parts.map(({ geometry, matrix }) => {
    const g = geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    return g;
  });
  // ExtrudeGeometry is non-indexed while the primitives are indexed, so a
  // mixed batch gets flattened to non-indexed before merging.
  const indexed = geos.filter((g) => g.index).length;
  if (indexed > 0 && indexed < geos.length) {
    geos = geos.map((g) => { if (!g.index) return g; const flat = g.toNonIndexed(); g.dispose(); return flat; });
  }
  // keep only the attributes every geometry shares, or the merge rejects them
  const common = geos.reduce((acc, g) => acc.filter((n) => g.attributes[n] !== undefined),
                             Object.keys(geos[0].attributes));
  for (const g of geos) for (const n of Object.keys(g.attributes)) if (!common.includes(n)) g.deleteAttribute(n);
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return merged;
}
```

Two non-obvious guards there — mixed indexed/non-indexed, and mismatched
attribute sets — both of which silently fail otherwise.

The idiom at every call site is a **bucket-by-material dictionary**:

```js
const parts = { wall: [], trim: [], roof: [], metal: [], metalDark: [], tile: [] };
const push  = (k, geo, mx) => parts[k].push({ geometry: geo, matrix: mx });

push('wall', new THREE.BoxGeometry(w, H1, d - REC), trs(0, H1 / 2, -REC / 2));
push('trim', new THREE.BoxGeometry(w + 0.16, 0.4, d + 0.16), trs(0, 0.2, 0));
// ... 60 more pushes ...

const matFor = { wall: wallMat, trim: m.trim, roof: roofMat, metal: m.metal, metalDark: m.metalDark, tile: m.tile };
for (const key of Object.keys(parts)) {
  if (!parts[key].length) continue;
  const mesh = new THREE.Mesh(bake(parts[key]), matFor[key]);
  mesh.castShadow = mesh.receiveShadow = true;
  g.add(mesh);
  if (key === 'wall' || key === 'roof') hullOutline(mesh, { thickness: 0.0032 });
}
```

**A whole shop is six draw calls (plus a few loose transparent meshes).** That
is the target for every building-scale generator.

`trs(px,py,pz, rx,ry,rz, sx,sy,sz)` composes the matrix from loose args and is
the only way matrices are written in this codebase.

### 4.3 Instancing — the trees

`buildSakura(ctx, spots)`, `buildGrove`, `buildCedar`, `buildBamboo`,
`buildShrubs` all follow one shape:

```js
const woodParts = [];             // merged
const blobs = [[], [], []];       // one matrix list per tone -> one InstancedMesh each
const trunkGeo  = new THREE.CylinderGeometry(0.7, 1.0, 1, 7, 1);   // unit height, scaled per instance
const branchGeo = new THREE.CylinderGeometry(0.25, 0.55, 1, 5, 1);
const twigGeo   = new THREE.CylinderGeometry(0.12, 0.3, 1, 4, 1);

for (const spot of spots) { /* per-tree: push wood parts, push blob matrices, ctx.collide */ }

const wood = new THREE.Mesh(bake(woodParts), cel({ color: PAL.trunk, bands: 3, tint: 0x8a7290 }));
wood.castShadow = wood.receiveShadow = true;
wood.name = 'sakuraWood';
ctx.add(wood);

const blobGeo = new THREE.IcosahedronGeometry(1, 1);
const BLOB_TINT = [0xe2c3d2, 0xd8b2c6, 0xc99cba];
blobs.forEach((list, i) => {
  if (!list.length) return;
  const inst = new THREE.InstancedMesh(blobGeo, cel({ color: BLOB_TONES[i], bands: 'soft', tint: BLOB_TINT[i] }), list.length);
  list.forEach((m, k) => inst.setMatrixAt(k, m));
  inst.castShadow = true;
  inst.receiveShadow = false;          // <- see §9, this is a hard rule
  inst.name = 'sakuraCanopy' + i;
  ctx.add(inst);
});
[trunkGeo, branchGeo, twigGeo].forEach((g) => g.dispose());   // merged copies; the originals go
```

**Every tree in the world = 1 merged wood mesh + 3 instanced canopies.** Green
canopies: another wood mesh + 4 tones (the fourth is the willow). Cedars: 1 + 3.
Bamboo: 2 culm tones + 1 node mesh + 2 leaf tones.

Geometry ownership: the merged source geometries are `dispose()`d; the instanced
ones are **not** ("culmGeo / nodeGeo / leafGeo belong to the instanced meshes;
not disposable").

Canopy construction, for the art direction: **many small blobs, never a few big
ones.** "Large spheres read as boulders; a dense cluster of small faceted lumps
reads as painted blossom." 26–36 blobs per cherry at `0.56·S`, tone biased by
height so the crown catches the light; a 4-blob cluster on top to crown the
silhouette. A willow is *the same generator* with three numbers changed: taller
thinner stem, limbs near horizontal (`tilt` 1.02–1.42 instead of 0.35–0.7),
canopy bias inverted, and **120 blobs at ~0.3 m instead of 40 at 0.9 m** — at
0.9 m "a blob *is* a canopy, so a curtain of them is a cloud".

### 4.4 Instancing — the petals

`petals.js` runs 980 falling petals as **3 InstancedMeshes** (one per tone) with
a plain JS particle array driving them:

```js
const inst = new THREE.InstancedMesh(geo, mat, grp.n);
inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
inst.frustumCulled = false;                 // they are everywhere; the test is useless
inst.renderOrder = 4;
inst.userData.noOutline = true;             // the ink pass would speckle them
```

Material: `flat({ color, map: petalTex(), transparent: true, opacity: 0.95,
depthWrite: false, side: THREE.DoubleSide, alphaTest: 0.32, cache: false })`.

The update loop writes `dummy.matrix` per particle and sets
`m.instanceMatrix.needsUpdate = true` once per mesh per frame. Motion is
"a large slow wave + a small fast flutter: reads as air, not noise" —
`sin(t·f + φ)` for x and `sin(t·f·2.7 + φ·1.7)` for z. The field is settled
before the first frame with 40 iterations of `update(0.1, 0, 1)` so the opening
frame already has petals mid-air. The train's passage feeds a `gust` in.

Fallen petals are separate, static, and gathered world-wide the same way as
trees: `buildFallenPatches(ctx, patches)` — "each tone is one instanced mesh, so
a dozen scattered drifts still cost three draw calls". Geometry is a
`PlaneGeometry` with `geo.rotateX(-Math.PI / 2)` baked in.

### 4.5 The remaining known cost

> The known remaining cost is prop groups that are a dozen separate meshes and
> get placed dozens of times — `makePlanter` is eleven meshes, `makeBicycle`
> fourteen. `makeBikeRack` shows the fix: bake one item into three geometries by
> material, then instance the three. Applying that to the planters and loose
> bicycles is the obvious next win, worth roughly a thousand calls.

`makeBikeRack`'s implementation is the pattern to copy:

```js
const shared = bicycleGeometry();          // { dark, frame, brite, mesh } — four baked geometries
const instDark  = new THREE.InstancedMesh(shared.dark,  m.dark, n);
const instFrame = new THREE.InstancedMesh(shared.frame, cel({ color: 0xffffff, bands: 3, tint: 0x4a4a92, cache: false }), n);
const instBrite = new THREE.InstancedMesh(shared.brite, m.metal, n);
const instMesh  = new THREE.InstancedMesh(shared.mesh,  cel({ color: PAL.metal, bands: 3, side: THREE.DoubleSide, tint: 0x666090 }), n);
// per-bike colour without a per-bike material:
col.set(FRAMES[(i * 3 + (o.seed ?? 0)) % FRAMES.length]);
instFrame.setColorAt(i, col);
...
instFrame.instanceColor.needsUpdate = true;
```

Note `d.rotation.set(rx, ry, 0, 'YXZ')` — "so the roll happens in the bicycle's
own frame and the yaw turns the already-rolled bike. In the default XYZ order the
roll is about the world X axis, which pitches rather than leans any rack not
aligned to X."

`bicycleGeometry()` is exported separately from `makeBicycle()` precisely so the
rack and the loose bike cannot drift apart — "this function used to carry its own
copy of the frame — with the same disconnected members — which is exactly how
both ended up wrong."

### 4.6 Culling

- **Baked meshes are frustum culled and the test is exact**: the bake leaves an
  identity transform and root-space geometry, so the geometry bounding sphere is
  already a world bound. Turning culling off costs ~8 ms at 5000 meshes.
- **Instanced meshes stay unculled on purpose.**
- **Anything planet-scale is never culled**, because after the bake its bounding
  sphere is the whole planet. This is the floor of the frame cost — see §10.

---

## 5. Geometry idioms

### 5.1 The `util.js` vocabulary

That is the whole of it — 144 lines. Nothing else exists.

```js
clamp(v,a,b)  lerp(a,b,t)  invLerp(a,b,v)  TAU  DEG
sstep(a, b, v)                     // Hermite smoothstep that tolerates a > b (descending ranges)
mulberry32(seed)  rngKit(seed)
bake(parts)                        // [{geometry, matrix}] -> one BufferGeometry
trs(px,py,pz, rx,ry,rz, sx,sy,sz)  // compose a Matrix4 from loose args
boxOnGround(w,h,d, mat)            // origin at the centre of the base
box(w,h,d, mat, x,y,z)
cyl(rt,rb,h,seg, mat, x,y,z)
plane(w,h, mat, x,y,z)
shadowify(obj, cast = true, receive = true)
sagCurve(a, b, sag, segments = 14) // catenary-ish, returns a CatmullRomCurve3
```

`sstep` with a descending range is how the street's drift and climb are written:

```js
export function centerX(z) { return 3.0 * sstep(-11, -36, z) - 3.4 * sstep(16, 44, z); }
export function groundY(z) { return 1.05 * sstep(-13, -32, z) + 0.45 * sstep(28, 48, z); }
```

`shadowify` skips transparent meshes:

```js
const seeThrough = o.userData.noShadow ||
  (o.material && !Array.isArray(o.material) && o.material.transparent);
o.castShadow = cast && !seeThrough;
o.receiveShadow = receive;
```

> glass, highlight quads and netting are there to be seen through, and letting
> them cast would drop a hard shadow over whatever they are covering (a glazed
> vending machine display goes muddy)

### 5.2 The `ground.js` civil-works vocabulary

Reuse these for anything that is *ground*:

```js
groundMats()                      // shared cel materials: concrete/concreteMid/concreteDark, asphalt,
                                  // asphaltWorn, curb, sidewalk, sidewalkAlt, metal, metalDark, white,
                                  // dirt, clay, stone, stoneDark, stoneWarm, grass, gravel
pad(ctx, {x,z,w,d,y,h=0.07,mat,ry,name,platform})     // slab + platform
lane(ctx, {axis,at,from,to,w=3.6,rise=0.05,y,mat,kerb,platform,name})
laneLine(ctx, o)                  // dashed or solid paint
steps(ctx, {x,z,n=8,rise=0.19,run=0.42,w=2.6,y,dir=-1,axis='z',mat,lipMat})
                                  // -> { group, top, end }
wallRun(ctx, {axis,at,from,to,h=2.1,t=0.28,panel=4.0,y,mat,capMat,collide,name})
meshFence(ctx, o)                 // posts + rails + a real chain-link lattice
railing(ctx, o)                   // painted steel pipe
dapple(ctx, o)                    // ground tone variation
```

**`pad` is a slab, not a plane** — "built as a shallow slab rather than a plane so
its edge catches the ink pass; that thin line round a forecourt is most of what
makes paving read as paving."

**`steps` is the one to know.** It emits tread geometry **and one
`ctx.platform` per tread**, which is what walks the player up. A collider would
just be a wall, because its top always sits above the feet. It also bakes the
treads into one mesh and the nosings into a second (`lip.userData.noOutline = true`),
and **the treads overlap by 40 mm** (`PAD = 0.02` carried onto both ends):

```js
const PAD = 0.02;
const t0 = run * i * dir - PAD * dir;
const t1 = run * (i + 1) * dir + PAD * dir;
ctx.platform({ x0, x1, z0: min(z+t0, z+t1), z1: max(z+t0, z+t1), top: y + h });
```

**`wallRun` is a run of short panels**, each seated at its own local ground
height — "that is how a Japanese block wall actually copes with a slope, and it
saves sweeping the geometry". Its coping is `castShadow = false` deliberately
(see §9).

### 5.3 Swept solids — `makeStrip`

For anything that follows the road, a run of boxes is wrong:

> The road drifts in `x` and falls in `y` at the same time, so a run of short
> boxes steps both ways and reads as a pile of separate slabs with the ink pass
> outlining every one.

```js
export function makeStrip({ z0, z1, step = 1.2, a, b, uv = [1, 1], flip = false })
// a(z) and b(z) return the two edge points; for horizontal surfaces a is the
// -X edge, for vertical faces a is the bottom edge.
```

`canal.js`'s `sweptSolid` builds a continuous casting out of `makeStrip` quad
strips — used for the bridge's fill, deck, parapets and edge upstands.
`ground.js`'s `lane` with `axis: 'z'` uses it too, with a kerb strip on each side.

**`makeStrip` assumes ascending z.** Sweeping `z0 > z1` reverses the winding and
the strip faces into the ground — invisible, no error. `lane()` guards it:
`const z0 = Math.min(o.from, o.to); const z1 = Math.max(o.from, o.to);`

### 5.4 Ramps — a staircase to the walker, a solid to the eye

> `heightAt` is a max over axis-aligned boxes and cannot express a slope, so the
> feet need a run of stepped `ctx.platform` calls; but the ink pass fires on
> every box's silhouette, so *drawing* that run is eight pale slabs with a black
> line between each. 川端の道's towpath ramp registers **eight platforms** and
> draws **one** box raked by `atan2(rise, run)`.

Sign derivation, which was got wrong in both directions once:

- a box along **Z** rotated by `t` about **X** sends its `+z` end **down**
- a box along **X** rotated by `t` about **Z** sends its `+x` end **up**

So a ramp along X falling east takes a **negative** `rz`. Derive one `rake`
constant and use it for the stringers, the soffit and the channel together.

### 5.5 The "real recess" storefront — `makeShop`

`shops.js`, one generator, nine tenants:

> a shopping street reads as a street because its units share a construction and
> differ only in colour, signage and clutter

> **The shopfront is a real recess:** the solid volume stops 0.9 m short of the
> frontage line and piers plus a header frame the hole. A recess is what gives
> the glass something to be in front of — a glazed decal on a solid box reads as
> a sticker, every time.

The construction, in order (`REC = o.recess ?? 0.9`, `front = d / 2`):

```js
// 1. the main volume, SHORT of the frontage by REC
push('wall', new THREE.BoxGeometry(w, H1, d - REC), trs(0, H1 / 2, -REC / 2));
push('trim', new THREE.BoxGeometry(w + 0.16, 0.4, d + 0.16), trs(0, 0.2, 0));       // plinth
if (floors === 2) {
  push('wall', new THREE.BoxGeometry(w, H2, d - 0.4), trs(0, H1 + H2 / 2, -0.2));   // upper storey set back
  push('trim', new THREE.BoxGeometry(w + 0.12, 0.16, d - 0.3), trs(0, H1, -0.2));   // string course
}
// 2. piers either side of the opening, filling the recess depth
const pierW = (w - openW) / 2;
for (const s of [-1, 1]) {
  push('wall', new THREE.BoxGeometry(pierW, H1, REC), trs(s * (w - pierW) / 2, H1 / 2, front - REC / 2));
  push('tile', new THREE.BoxGeometry(pierW + 0.04, 0.62, 0.06), trs(s * (w - pierW) / 2, 0.31, front + 0.02));
}
// 3. header over the opening
push('wall', new THREE.BoxGeometry(openW, H1 - 2.55, REC), trs(0, H1 - (H1 - 2.55) / 2, front - REC / 2));
// 4. soffit and tiled floor of the recess
push('trim', new THREE.BoxGeometry(openW, 0.1, REC), trs(0, 2.5, front - REC / 2));
push('tile', new THREE.BoxGeometry(openW, 0.1, REC + 0.1), trs(0, 0.05, front - REC / 2 + 0.05));
// 5. the painted interior, ON THE FACE of the solid volume
const inner = new THREE.Mesh(new THREE.PlaneGeometry(openW - 0.1, 2.2),
  flat({ color: 0x8b8598, map: o.interiorMap ?? shopInterior(o.interior ?? 0), cache: false }));
inner.position.set(0, 1.35, front - REC + 0.03);
inner.userData.noOutline = true;
// 6. glass ACROSS THE FRONT of the recess
const pane = box(openW, 2.3, 0.04,
  flat({ color: PAL.glass, transparent: true, opacity: 0.22, depthWrite: false, cache: false }),
  0, 1.35, front - 0.07);
pane.userData.noOutline = true; pane.userData.noShadow = true;
// 7. mullions IN FRONT of the glass
const nm = Math.max(2, Math.round(openW / 1.3));
for (let i = 0; i <= nm; i++) push('metal', new THREE.BoxGeometry(0.08, 2.35, 0.1), trs(-openW/2 + (openW/nm)*i, 1.35, front - 0.07));
push('metal', new THREE.BoxGeometry(openW + 0.1, 0.1, 0.14), trs(0, 2.5,  front - 0.07));
push('metal', new THREE.BoxGeometry(openW + 0.1, 0.14, 0.16), trs(0, 0.2, front - 0.07));
// 8. one angled highlight, the way glass is painted
const hi = new THREE.Mesh(new THREE.PlaneGeometry(openW * 0.24, 2.5),
  flat({ color: 0xf2f8ff, transparent: true, opacity: 0.18, depthWrite: false, cache: false }));
hi.position.set(-openW * 0.22, 1.4, front - 0.04); hi.rotation.z = 0.3;
hi.userData.noOutline = true;
```

**The ordering is the rule and it generalises**: *reveal set into the wall,
interior on the face of it, glass in front of that, mullions in front of that.*
The library got this backwards once and every window on the building came out as
a flat grey panel.

The interior "has to be *darker* than the sunlit frontage or the glass stops
reading as glass" — the map is drawn dark and the material colour is `0x8b8598`.

Half-down shutter is the useful state: `SH = 2.55 * o.shutter`, and
`o.shutter ≈ 0.35` "says the shop exists and is between shifts, without needing
anybody to be standing in the doorway" (the world has a hard no-people rule).

Final steps of `makeShop`: bake by material bucket, `hullOutline` the wall and
roof meshes, then

```js
g.position.set(o.x, o.y ?? 0, o.z);
g.rotation.y = FACE_RY[o.face ?? 'z+'];
ctx.add(g);
// Collider in world axes: the unit was authored facing +Z, so a quarter turn swaps w and d.
const swap = o.face === 'x+' || o.face === 'x-';
const hw = (swap ? d : w) / 2, hd = (swap ? w : d) / 2;
ctx.collide(o.x - hw - 0.05, o.z - hd - 0.05, o.x + hw + 0.05, o.z + hd + 0.05, (o.y ?? 0) + H);
g.userData.front = front;                 // so callers can dress the pavement
```

**When a caller genuinely needs a room behind the opening**, the volume itself
has to be cut back (`makeOnsenUnit`'s `hollow`) with returns either side and a
header over it. **You cannot carve a recess into a box** — see §9.

### 5.6 Roofs, cheaply

`makeShop`'s gable, which is the pattern for every pitched roof in the world:

```js
const eave = 0.42;
const rw = w + eave * 2, rd = d + eave * 2;
const rh = o.roofH ?? 1.25;
const slope = Math.atan2(rh, rw / 2);
const slab  = Math.hypot(rw / 2, rh) + 0.08;        // the true slope length, not the plan width
for (const s of [-1, 1]) {
  push('roof', new THREE.BoxGeometry(slab, 0.15, rd), trs(s * (rw / 4), H + rh / 2, -0.2, 0, 0, -s * slope));
}
push('roof', new THREE.BoxGeometry(0.24, 0.18, rd), trs(0, H + rh + 0.04, -0.2));       // ridge
// gable end triangles, as an extrusion
const tri = new THREE.Shape();
tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, rh * (1 - (eave * 2) / rw)); tri.closePath();
const triGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.16, bevelEnabled: false });
triGeo.translate(0, 0, -0.08);
for (const s of [-1, 1]) push('wall', triGeo, trs(0, H, -0.2 + s * ((d - 0.4) / 2 - 0.08)));
triGeo.dispose();
```

Two rotated boxes and a ridge bar. No tile geometry anywhere — tiling, where it
appears at all, is tone and a ridge line. A flat roof gets a slab plus a
**parapet** on all four sides, "so a flat roof still has an edge to ink".

### 5.7 Assemblies — build from joints, never from part positions

> Both copies of `makeBicycle` placed five cylinders by eye: the fork stopped
> 0.3 m short of the front hub and behind it, the seat stay was centred on the
> rear hub so it ran out through the far side of the wheel, and there were no
> chain stays. Rebuilt as named joints (`BB`, `SC`, `HB`, `HT`, hubs) with every
> member drawn *between two points*, so a shared end is shared by construction.

The helper form is `strut(g, mat, x, a, b)` — takes the two joints, derives the
length and the rake. **Same rule for anything with more than three connected
members — and for anything with two.**

`sagCurve(a, b, sag)` is the same instinct for cabling: two endpoints, a sag,
and the curve derived.

### 5.8 Outlines

```js
hullOutline(mesh, { thickness = 0.0038, color = PAL.ink, opacity = 1 })
hullOutlineTree(root, opts)        // every mesh in a subtree not marked noOutline
```

Buildings get `thickness: 0.0032`, props `0.003`–`0.0034`. Anything that must
not be inked sets `mesh.userData.noOutline = true` — glass panes, highlight
quads, painted interiors, stair nosings, petals.

`hullOutline` draws a contour **per mesh**, so five separate boxes are five
outlines. That is why the vending machine body was rebuilt as "five boxes with a
notch out of the front, merged into one mesh — because `hullOutline` draws a
contour per mesh and five of them would ink every seam."

---

## 6. Texture system — `src/core/textures.js`

4 397 lines, ~120 exported generators, **zero binary image assets**.

> The scene ships with zero binary assets: every sign, poster, price strip and
> petal mask is drawn with Canvas2D at start-up. Everything is kept flat and
> low-frequency on purpose — crisp shapes and type, never photographic noise.

### 6.1 The core

```js
const JP_FONT = `'Yu Gothic', 'Yu Gothic UI', 'Meiryo', 'MS Gothic', 'Hiragino Kaku Gothic ProN', sans-serif`;
const cache = new Map();

function make(w, h, draw, { srgb = true, repeat = null, aniso = 4 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = true;
  draw(c, w, h);
  const tex = new THREE.CanvasTexture(cv);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repeat[0], repeat[1]); }
  tex.needsUpdate = true;
  return tex;
}

function cached(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
```

Every export is `export const name = (variant = 0) => cached('name' + variant, () => make(W, H, (c, w, h) => { ... }))`.

Mips are three.js defaults (`generateMipmaps: true`, `LinearMipmapLinearFilter`)
— deliberately relied on: the chain-link lattice "mipmapping softens it to a
pale wash at distance instead of aliasing into moire".

### 6.2 Conventions

- **`colorSpace = SRGBColorSpace` on everything that is colour.** The three
  exceptions all pass `{ srgb: false }` because they are *masks*: `petalTex`,
  `cloudTex`, `chainLinkTex`.
- **`anisotropy: 4`** everywhere. One texture overrides `repeat` (`roadPaint`).
- **Sizes are powers-of-two-ish and small.** The full histogram, most common
  first: `512×256` (13), `384×512` (10), `512×384` (9), `512×128` (9),
  `384×288` (9), `256×256` (8), `128×128` (6), `512×320` (4), `768×192`,
  `512×160`, `384×192`, `256×352`, `192×768` (3 each), then a long tail. Only
  four textures reach 1024 in a dimension (`shopSign`, `superFascia`-class
  fascias). **`chainLinkTex` is 128×128.** Total in the finished world: **205
  textures.**
- **Portrait sizes for vertical Japanese lettering** (`320×1024`, `192×768`,
  `96×512`, `64×512`) — a `vertical()` helper draws one glyph per row.

### 6.3 Text helpers

```js
fitText(c, text, maxW, size, font = JP_FONT, weight = 'bold')     // shrinks by 2px until it fits, floor 6
centered(c, text, x, y, maxW, size, color, weight = 'bold', spacing = 0)   // spacing = per-char tracking
vertical(c, text, x, y0, step, size, color)                        // one glyph per row
rule(c, x, y, w, h, color)                                         // "a thin rule, the workhorse of Japanese signage layout"
```

`centered` with `spacing` measures the total tracked width and lays the glyphs
out by hand, because Canvas2D has no letter-spacing.

### 6.4 The named-texture catalogue

The exported names, grouped — this is the *vocabulary of a Japanese suburb*, and
the equivalent list for another city is the art-direction brief:

- **Shop**: `shopSign shopBanner poster shutterTex shopFascia shopBlade norenTex menuBoard lanternTex flagTex gachaTex shopInterior showaInterior curtainTex litWindowTex`
- **Vending**: `vendHeader vendPrice vendCold vendSlot`
- **Rail**: `crossingSign stationSign warningPlate trainDest trainNumber tactileTex`
- **Road**: `roadPaint drainTex platePlate noParking roadSignTex laneNamePlate bayNumber deckBay coinParkPlate parkingSign noParking`
- **Nature/mask**: `petalTex cloudTex chainLinkTex`
- **School**: `schoolPlate schoolEntrance clubPoster corkBoard blackboardTex gateNotice classroomTex gymInterior chalkNotice`
- **Shrine/festival**: `shrinePlate shrineName emaTex omikujiTex sanpaiNotice matsuriBanner matsuriBoard matsuriFlag stallSign setupPlate`
- **Water**: `canalPlate ankyoPlate gaugeBoard bridgePlate bridgeSign bridgeAd sluicePlate`
- **Civic**: `libraryName libraryHours returnPlate libraryInterior phoneBoxSign phoneNotice guideBoard parkSign parkPlate parkGuide hallPlate hallNotice busStopPlate busRouteBoard busTimetable`
- **Onsen**: `onsenFascia onsenBlade onsenNoren houraiFuji ashiyuPlate tatamiRoom onsenLanternTex yunosakaBoard sentoFuji`
- **Domestic**: `namePlate apartmentPlate gomiPlate meterBox blockPlate paperSheet sleeveTex lockerPlate`
- **Retail interiors**: `clinicInterior yakkyokuInterior laundryInterior fudosanInterior superInterior`
- **Supermarket**: `superFascia superBoxSign superHours superBanner superPoster superDeal deliveryPlate`
- **Tunnel**: `tunnelPlate tunnelInfo`
- **Utility**: `mirrored(tex)` — clones with `repeat.x = -1, offset.x = 1`. **Nothing should need it** (see §9).

### 6.5 A worked mask

```js
export const chainLinkTex = () => cached('chainLink', () =>
  make(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.92)';
    c.lineWidth = 7; c.lineCap = 'square';
    for (let i = -1; i <= 2; i++) {
      c.beginPath(); c.moveTo(i * w, 0);  c.lineTo(i * w + w, h); c.stroke();
      c.beginPath(); c.moveTo(i * w, h);  c.lineTo(i * w + w, 0); c.stroke();
    }
  }, { srgb: false }));
```

> A flat translucent panel reads as tinted glass, which is exactly wrong for a
> school fence. Drawing the lattice and letting the gaps be empty is what makes
> it read as mesh.

Same texture is reused for a crow net over the refuse bins — "it is a shallow
open box over the three lids now, mapped with `chainLinkTex` so the gaps are
genuinely holes."

### 6.6 Mapping rules

- **Check a texture's aspect against the face it lands on.** `alleyPlate` is
  512×128 mapped onto a 0.24×1.5 m post face — a 25-fold horizontal crush that
  renders as an unreadable vertical smear and not as an error.
- **Signs are boxes with one mapped face** — a material *array* with
  `geometry.groups`. This is why the bake has to carry groups across (§9).
- **Two-sided signs must NOT use `mirrored()`.** `BoxGeometry` builds each face
  with its own `udir` and already reverses it on the negative face of every axis.

---

## 7. Player controller — `src/core/player.js`

344 lines. First-person walker with pointer-lock look, accelerated WASD,
axis-separated AABB collision, and a terrain height query. **No jump, no crouch,
no third person, no slope limit.**

### 7.1 Constants

```js
const EYE    = 1.62;    // eye above the feet, standing
const RADIUS = 0.34;    // collision disc
const STEP   = 0.38;    // step-up height

this.walkSpeed   = 2.55;         // m/s
this.runSpeed    = 5.1;          // Shift
this.rideSpeed   = this.runSpeed * 1.5;   // 7.65 m/s ≈ 27 km/h
this.sensitivity = 0.0022;       // rad per px of movementX
pitch clamp: [-1.15, 1.05]
raycaster.far = 3.0;             // interaction reach

// riding a machine — deliberately only four things change
export const RIDE = {
  eye: 1.40,        // eye above the ground, seated: 0.62 m seat plus a torso
  seatFwd: 0.46,    // machine origin ahead of the rider (makeScooter authors its seat at local x = -0.46)
  nose: 0.92,       // second collision probe, ahead of the rider
  noseR: 0.30,
  reverse: 1.7,     // walking pace, backwards
  steer: 1.75,      // rad/s on A / D
};
```

Spawn: `pos (1.85, 0, 13.6)`, `yaw 0.20`, `pitch -0.008`. `R` resets to it.

### 7.2 Movement integration

```js
this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
this._right  .set( Math.cos(this.yaw), 0, -Math.sin(this.yaw));
this._wish.copy(this._forward).multiplyScalar(fwd).addScaledVector(this._right, side);
if (this._wish.lengthSq() > 1e-6) this._wish.normalize().multiplyScalar(speed);

// critically-damped approach to the wish velocity: responsive but never twitchy
const accel = riding ? (fwd > 0 ? 5.0 : fwd < 0 ? 9.0 : 3.6)
                     : (this._wish.lengthSq() > 1e-6 ? 13 : 16);   // 16 = decel > 13 = accel
const a = 1 - Math.exp(-accel * dt);
this.vel.x += (this._wish.x - this.vel.x) * a;
this.vel.z += (this._wish.z - this.vel.z) * a;
```

Vertical follow is a separate exponential, so kerbs are smoothed rather than
snapped:

```js
const targetY = this.world.heightAt(this.pos.x, this.pos.z, this.pos.y);   // NOTE the fromY
this.pos.y += (targetY - this.pos.y) * (1 - Math.exp(-18 * dt));
```

Head bob: `this.bob += dt * moving * (sprint ? 8.2 : 6.4)`, amplitude
`min(moving / walkSpeed, 1) * 0.014`. **Zero while riding** — "at three times
walking pace it reads as a lurch rather than as footsteps."

### 7.3 Collision

```js
_resolveAt(p, colliders, feetY, r) {
  for (const c of colliders) {
    if (c.top    !== undefined && c.top <= feetY + STEP) continue;   // low enough to step onto
    if (c.bottom !== undefined && c.bottom > feetY + 1.9) continue;  // high enough to walk under
    const x0 = c.x0 - r, x1 = c.x1 + r, z0 = c.z0 - r, z1 = c.z1 + r;
    if (p.x <= x0 || p.x >= x1 || p.z <= z0 || p.z >= z1) continue;
    const dxL = p.x - x0, dxR = x1 - p.x, dzL = p.z - z0, dzR = z1 - p.z;
    const m = Math.min(dxL, dxR, dzL, dzR);                          // smallest push-out wins
    if      (m === dxL) p.x = x0;
    else if (m === dxR) p.x = x1;
    else if (m === dzL) p.z = z0;
    else                p.z = z1;
  }
}
```

Applied one axis at a time, sub-stepped so a sprint cannot tunnel:

```js
const lonScale = 1 / Math.max(0.25, Math.cos(this.pos.z / R));   // longitudes converge toward the poles
const stepX = this.vel.x * dt * lonScale, stepZ = this.vel.z * dt;
const n = Math.max(1, Math.ceil(Math.max(Math.abs(stepX), Math.abs(stepZ)) / 0.18));
for (let i = 0; i < n; i++) {
  this.pos.x += stepX / n; this._resolve(colliders, feetY);
  this.pos.z += stepZ / n; this._resolve(colliders, feetY);
}
this.pos.x = wrapX(this.pos.x);                       // x wraps forever
this.pos.z = clamp(this.pos.z, bounds.z0, bounds.z1); // only latitude is bounded
```

**The two consequences that drive every placement rule in §9:**

1. `RADIUS = 0.34` is added to **every side** of **every** collider, so an
   object occupies **0.68 m more than its footprint in each axis**. A 1.4 m
   notice board fills 2.08 m of a 2.1 m alley. A parked car is 5.1 × 2.4 m, not
   4.4 × 1.7. A 0.4 m pole costs 1.08 m of clear ground. A 0.11 m post is a wall
   on a 1.55 m footway.
2. A collider whose `top` is within `STEP = 0.38` of the feet **does nothing** —
   by design, so stairs work. **A barrier must clear the feet by more than
   `STEP`; 0.95 m is the number the repo settled on.**

Riding adds a second probe, resolved with its own radius and the push translated
back into the body:

```js
if (riding) {
  const p = this._probe.copy(this.pos).addScaledVector(this._forward, RIDE.nose);
  const px = p.x, pz = p.z;
  this._resolveAt(p, colliders, feetY, RIDE.noseR);
  this.pos.x += p.x - px; this.pos.z += p.z - pz;    // a slide, not a pivot: stable in a corner
  this._resolve(colliders, feetY);                   // the seat may now be inside something
}
```

### 7.4 Camera on a sphere

```js
applyCamera(moving) {
  const riding = this.ride !== null;
  const amp = riding ? 0 : Math.min(moving / this.walkSpeed, 1) * 0.014;
  const eye = this.pos.y + (riding ? RIDE.eye : EYE) + Math.sin(this.bob) * amp;

  const b = basisAt(this.pos.x, this.pos.z, this._up, this._east, this._north);
  this._basis.makeBasis(this._east, this._up, this._north);
  this._surfaceQ.setFromRotationMatrix(this._basis);

  this._localE.set(this.pitch, this.yaw, this.roll + Math.sin(this.bob * 0.5) * amp * 0.35, 'YXZ');
  this._localQ.setFromEuler(this._localE);

  positionAt(this.pos.x, eye, this.pos.z, this.camera.position);
  this.camera.quaternion.copy(this._surfaceQ).multiply(this._localQ);
  this.camera.up.copy(b.up);       // the whole frame rolls as you walk round
}
```

> The simulation stays in flat (x, z) authoring space — collision, height queries
> and the street centreline all work unchanged. Only the presentation is
> spherical.

Camera roll while riding is worth quoting because the sign was derived, not
guessed:

> `rotation.z` on the camera is a rotation about its own **backward** axis, so a
> positive one tilts the head *left* — and yaw grows to the left too, which is
> why the sign here is not inverted. … Both signs were checked by steering left
> and right and reading the numbers back, not by looking at a render — a banked
> frame looks plausible either way round.

### 7.5 Interaction

```js
pick(interactables) {
  this.raycaster.set(this.camera.position,
    this._forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion));
  const meshes = interactables.map((i) => i.hitbox);
  const hits = this.raycaster.intersectObjects(meshes, false);
  this.hovered = hits.length ? interactables[meshes.indexOf(hits[0].object)] : null;
  return this.hovered;
}
```

Input binding lives entirely in `_bind()`: `mousemove` while locked, a
`pointerlockchange` listener that clears keys, a `keydown` that adds to
`this.keys` and fires `onInteract`/`reset`, `keyup`, and a `window blur` that
clears the key set (otherwise a lost focus leaves you walking forever).

---

## 8. Sky and lighting rig

### 8.1 Renderer

```js
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false,
  powerPreference: 'high-performance', stencil: false });
renderer.setPixelRatio(1);                          // fixed; the pipeline owns internal scale
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;         // a cel look must not be tone-mapped
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;       // not PCFSoft: harder edges read as painted shadow
renderer.setClearColor(new THREE.Color(PAL.fog), 1);
```

### 8.2 Camera and fog

```js
const camera = new THREE.PerspectiveCamera(46, 1, 0.25, 600);
camera.rotation.order = 'YXZ';
scene.fog = new THREE.Fog(PAL.fog, 44, 205);        // linear, matched to the clear colour
```

In orbit view: `scene.fog = null`, `camera.far = 1600`.

### 8.3 The lights — "the classic two-light anime setup"

```js
// KEY — warm quantised sun
const sun = new THREE.DirectionalLight(PAL.sun, 2.25);
sun.position.set(-52, 62, 56);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -34;  sun.shadow.camera.right  = 34;
sun.shadow.camera.top  =  34;  sun.shadow.camera.bottom = -34;
sun.shadow.camera.near = 1;    sun.shadow.camera.far    = 200;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.035;
scene.add(sun); scene.add(sun.target);

// FILL — cool bounce from the opposite quarter.  Carries most of the shadow
// side of every surface, so it is deliberately strong: an anime background has
// *coloured* shadows, not dark ones.
const fill = new THREE.DirectionalLight(PAL.fill, 1.08);
fill.position.set(48, 26, -44);
scene.add(fill); scene.add(fill.target);

// BOUNCE — a second, weaker bounce from below-front, so undersides are not flat black
const bounce = new THREE.DirectionalLight(0xd8cbe8, 0.34);
bounce.position.set(10, -18, 40);
scene.add(bounce); scene.add(bounce.target);

// AMBIENT — a violet ground colour so nothing in shadow ever goes black
const hemi = new THREE.HemisphereLight(PAL.hemiSky, PAL.hemiGround, 1.12);
scene.add(hemi);
```

Four lights total. **The sun direction `(-52, 62, 56)` is a published constant**
that district modules reason about: "the sun is at (-52, 62, 56), so a +z
elevation is the warm one" — which is why one street's whole reason to exist is
that its frontages face +z.

### 8.4 Lights follow the local surface frame

Because the world is a sphere, world-space lights would rotate relative to the
district as you walk. Instead the light *directions* are expressed in the
player's tangent frame and re-seated every frame:

```js
const SUN_LOCAL    = new THREE.Vector3(-52, 62, 56);
const FILL_LOCAL   = new THREE.Vector3(48, 26, -44);
const BOUNCE_LOCAL = new THREE.Vector3(10, -18, 40);

function seatLight(light, local, basis, origin) {
  sunOffset.set(0, 0, 0)
    .addScaledVector(basis.east,  local.x)
    .addScaledVector(basis.up,    local.y)
    .addScaledVector(basis.north, local.z);
  light.target.position.copy(origin);
  light.position.copy(origin).add(sunOffset);
}

// per frame, on the ground:
const b = basisAt(player.pos.x, player.pos.z);
positionAt(player.pos.x, 0, player.pos.z, shadowTarget);
seatLight(sun, SUN_LOCAL, b, shadowTarget);
seatLight(fill, FILL_LOCAL, b, shadowTarget);
seatLight(bounce, BOUNCE_LOCAL, b, shadowTarget);
hemi.position.copy(b.up);
```

> Lighting is pinned to the local surface frame rather than to world space:
> physically a cheat, but it keeps the district lit the same way no matter how
> far round the planet you have walked.

The shadow camera therefore follows the player automatically (its target is the
player's ground point) with a ±34 m half-extent. In orbit view the half-extent
becomes `R * 1.15` and `far` becomes `R * 6`, and the sun is pinned externally
at `CENTER + (-1.05, 0.95, 0.75)·R·2.2` so the whole globe is lit coherently.

Measured: shrinking the shadow cascade from ±34 m to ±22 m barely helps
(19.7 → 18.4 ms). **Do not tune the shadow cascade for performance.**

### 8.5 Sky — `src/core/sky.js`

`buildSky(scene, radius = 500)` returns `{ dome, clouds }`.

**Dome**: a `SphereGeometry(500, 32, 20)` with `side: BackSide`,
`depthWrite: true`, `fog: false`, `frustumCulled = false`,
`renderOrder = -10`, and a three-stop `ShaderMaterial`:

```glsl
float h = normalize(vWorld).y;
float t = clamp(h * 1.15 + 0.02, 0.0, 1.0);
float q = floor(t * uBands) / uBands;     // uBands = 26.0
t = mix(t, q, 0.35);                       // soft quantisation: mostly smooth, a faint painted step
vec3 col = mix(uHaze, uMid, smoothstep(0.0, 0.30, t));
col = mix(col, uTop, smoothstep(0.26, 0.92, t));
col = mix(col, uHaze, smoothstep(0.12, -0.05, h) * 0.6);   // warmth low in the sky
```

> Slight banding is intentional — it reads as airbrushed background art rather
> than a physical sky.

**Clouds**: 22 billboarded groups, each a front quad in `PAL.cloud` at
`opacity 0.62` and a shade quad in `PAL.cloudShade` at `opacity 0.34` offset
`(2, -h*0.1, -1.5)` behind it. `depthWrite: false`, `fog: false`,
`map.wrapS = wrapT = ClampToEdgeWrapping`, `renderOrder = -9`,
`clouds.frustumCulled = false`. Placement is seeded (`rngKit(7781)`):
radius 220–350, width 90–210, height `w × 0.24–0.34`, y 46–140, each
`g.lookAt(0, y * 0.55, 0)`.

Both dome and clouds **trail the camera** each frame
(`sky.dome.position.copy(camera.position)`) because they are centred on the flat
origin; in orbit view they are pinned to the origin instead.

`buildDistantHills(scene)` draws two `ShapeGeometry` ridge silhouettes at
z −330 / −250 in `PAL.hillFar` / `PAL.hill`, unlit `flat({ fog: false })`,
`renderOrder = -8`, each mirrored behind the camera. On a 160 m planet these are
largely superseded — "the curvature does that job instead" — but the technique
(pure silhouette, unlit, painted flats) is the one to keep.

### 8.6 Audio, briefly — because of one rule

`src/core/audio.js` streams one track at a time (never `AudioBuffer`: "the full
playlist is large, and holding it as PCM would waste hundreds of megabytes"),
starts only from a real user gesture, and tolerates an **empty** playlist as a
supported state.

The rule worth carrying over:

> **Don't drive audio/UI envelopes from `requestAnimationFrame`.** rAF can be
> suspended entirely; a stalled fade leaves music playing at volume 0 with
> `paused === false`.

`rampTo(to, seconds)` uses `setInterval` at `STEP_MS = 33` with the rate scaled
by the distance actually being covered, **plus a trailing
`setTimeout(settle, seconds * 1000 + 600)`** that guarantees the end state
however badly the interval is throttled.

---

## 9. Traps — every one restated as "do X, never Y"

These are the repo's "Traps that have already bitten" table, ~100 entries, each
one a bug that shipped. **None of them threw and none of them logged.** They are
grouped here; the order inside each group is the table's.

### 9.1 The planet bake

- **Do** set `castShadow = false` on the planet sphere. **Never** let a closed
  surface cast: its far hemisphere renders into the shadow map and drops the
  *entire world* into its own shadow. Symptom: everything uniformly dark for no
  visible reason.
- **Do** mark every animated group `userData.planetRigid = true`. **Never** let
  the bake fold a rig — it bends geometry into world space and clears container
  transforms, destroying pivots. Audit by the *count* in `bakeStats.rigid`: if
  something you added that moves is not in it, it will fly.
- **Do** carry `geometry.groups` across the bake explicitly. **Never** assume
  they survive `subdivideLongEdges` or `toNonIndexed()`. A mesh with a material
  *array* and no groups **is not drawn at all** — it does not fall back to
  `material[0]`. Every sign in this world is a box with one mapped face, so it
  took out all fifty-four at once. Symptom: a district where nobody has put
  their sign up.
- **Do** give anything that moves a `planetRigid` hub with an **inner group** for
  the animation — hub, axle, mesh. **Never** animate a transform on a mesh the
  bake has folded: the bake puts geometry into root space and resets
  `position`/`quaternion` to identity, so a later `rotation.*` swings root-space
  geometry about the **world origin**. Symptom: discs or panels flying in the
  sky, keeping pace with whatever they belong to.
- **Do** put an inner pivot group under a rigid group and animate *that*.
  **Never** drive `rotation.x/y/z` on a group the bake has re-seated: it carries
  its placement as a *quaternion* with Euler kept in sync, so for anything
  turned a quarter turn Euler X is ±90° and writing `rotation.x` rolls the
  object about its own normal. Symptom: a horizontal noren hanging as a vertical
  banner with its lettering on its side, and only for the units rotated to face
  across the street.
- **Do** make sure anything planet-scale survives `subdivideLongEdges`. A 1005 m
  rail authored as a 2-vertex box chords straight through the planet without it.
- **Do** keep `X_MIN/X_MAX = ±CIRCUMFERENCE/2` for anything that circles.
  Change it and the loop no longer meets itself.
- **Do** use `IcosahedronGeometry` detail **30**, not 6, at `R = 160`. Detail is
  `d + 1` subdivisions, **not `2^d`** — detail 6 is a 24 m facet whose centre
  sags `e²/(6R)` = 0.60 m below the true sphere. Detail 30 is a 5.4 m facet
  sagging 30 mm and costs 18 k triangles in one never-culled call.
- **Do** take the sphere's normals **radially**. **Never** rely on
  `computeVertexNormals()` for smooth shading on a non-indexed geometry — it *is*
  flat shading, and `flat: false` on the material changes nothing. And **re-read
  `geometry.attributes.position` after any pass that replaces it**: writing the
  normal buffer from the pre-cut attribute gives a shorter array, which three.js
  does not complain about — it shades the tail of the mesh with whatever is in
  memory.
- **Do** displace **both** ground surfaces by the same amount, always. The
  sphere and the terrain grid sit 65 mm apart over the same ground; relief was
  applied to one and not the other and the sphere came up **through** the grid,
  the road, the kerbs and the tyres of parked cars — 7 346 m² of it, 21 colliders
  standing on it, worst 1.68 m, unnoticed for months.

### 9.2 Ground, height and collision

- **Do** use `ctx.groundAt(x, z)`. **Never** seat a prop from the street profile
  `groundY(z)` — by the time a district runs there is a 0.135 m footway, a
  0.09 m lane, a forecourt slab or a 0.34 m cut on top of it. Symptom: a bicycle
  sunk to its axles, another a third of a metre in the air, a whole forecourt
  0.24 m under its own lane.
- **Do** check the rendered mesh with a ray, not the query against itself. The
  terrain mesh was drawn 75 mm below the plane `groundAt` answers with, so
  **everything on bare ground floated 78 mm**. `TERRAIN_DROP` is **15 mm** now
  and two other modules derive from it. Measured after: mean 19.3 mm, worst
  25.0 mm over 2409 samples.
- **Do** drop each terrain row by its own chord excess. A grid that chords a
  convex curve bulges `f''h²/8` **above** it — 9 mm at 2 m rows. And use 2.0 m
  rows, not 2.5: the 2.5 m cell diagonal is 3.54 m, over the bake's 3.0 m limit,
  so every triangle got bisected and 32 k arrived as 65 k.
- **Do** bound every lateral test in **both** axes. `isSidewalk` was lateral
  only, so `streetHeight` answered `groundY + 0.135` for two 1.55 m bands at
  *every* z in the world — two invisible kerb-height ledges running to the
  horizon. Measured at (−7.4, 75): 0.585 against a ground of 0.450.
- **Do** use `ctx.cut({x0,x1,z0,z1,top})` for an excavation. **Never** expect
  `heightAt` to express one — platforms only ever *raise*. Cut the pocket first,
  then let treads/slabs raise it back. Gap the cut wherever a road crosses or
  the bridge deck gets cut too.
- **Do** make platform boxes **overlap**. **Never** let them merely meet:
  `heightAt`'s platform test is exclusive on all four sides, so a query landing
  exactly on a joint matches **neither** and returns the grade. In play a float
  never lands there; a flood fill on a 0.35 m grid lands there every time, so
  the tool that finds holes manufactures them. `steps()` overlaps treads by
  40 mm.
- **Do** register a `ctx.platform` per tread for anything walkable. **Never**
  hand-roll treads as pure geometry — the station's six concrete steps were
  scenery for the whole life of the station and the deck could not be walked
  onto from any side.
- **Do** give a barrier more than `STEP = 0.38` of clearance over the feet;
  **0.95 m is the working number**. A collider whose top is within a step is
  skipped by `_resolve` **by design**. The canal's channel-edge barrier stood
  0.24 m over its path and had never stopped anybody; what was keeping people
  out of the water was the railing.
- **Do** stand a terrace parapet proud (the shrine's is 0.5 m). **Never** use a
  retaining wall flush with the terrace as a barrier.
- **Do** pass `bottom` for anything whose job is only at height. A roof parapet
  without it is a 21.6 m wall standing 0.34 m in front of the shop doors five
  metres below, sealing the entrance recess, its tiled floor, its platform, its
  mat and its doorway.
- **Do** give an entrance recess **its own colliders** — three boxes (rear, west
  block, east block) leave it open. **Never** wrap one box round the whole
  footprint. Symptom: a builder registers a platform nobody can stand on.
- **Do** put one collider per section on a curve, each the AABB of its own
  rotated box. A five-section arc guardrail collided as one AABB along the chord
  fenced the terrace off *visually* while the fill walked straight through it —
  wrong to both tools at once.
- **Do** give a swept barrier a swept collider, one per segment, each taking the
  profile at its own **low** end. One flat box topped at the mid-span height put
  0.276 m over the footway at the south end — inside the step, so skipped.
- **Do** split a kerb wherever something drives over it, and drop it to 40 mm
  there (from 105). **A kerb is invisible to every check this project has** — no
  collider, and a frame from the road does not show it edge-on. One ran straight
  across the entrance of a car park with two cars in it.
- **Do** leave slim frangible street furniture (delineator wands, stop poles,
  bus-stop poles) **without** a collider. A box round a 0.11 m pole leaves
  0.44 m of a 1.55 m footway — a wall.
- **Do** collide only the **back panel** of an open-fronted structure. A box
  round a bus shelter is a bus shelter you cannot stand in; the cheeks and posts
  go without.
- **Do** route paths *past* a railed platform, never under one. `bottom` only
  skips somebody more than 1.9 m below, and a rail's own base is the deck, so
  there is no `bottom` value that works.
- **Do** end every district's platform where the next one's begins. A 0.6 m
  gap between two precincts fell through to the natural grade **1.79 m below**,
  and once down there the slab was outside the 0.55 m `fromY` reach. Two modules
  each ended their own work correctly and nobody owned the joint. Only a linear
  trace carrying the feet height forward finds it.

### 9.3 Clearance arithmetic — the `RADIUS = 0.34` tax

- **Do** budget **0.68 m** of clear ground between any two facing colliders.
  こばと橋's parapet ended at z = −20.6 and the house began at −19.9: 0.08 m of
  clear ground, and both flights of steps off the bridge had been sealed since
  the day they went in, on both sides. The steps render perfectly.
- **Do** bolt boards flat to a wall and keep buildings 1.5 m back from a narrow
  lane. A 1.4 m notice board occupies 2.08 m of a 2.1 m alley.
- **Do** make a gate opening **1.8 m minimum**. `plotWall`'s gate posts carry no
  collider, so the usable opening is `w − 0.68`: at the 1.1–1.2 m that reads well
  on the page that is 0.42–0.52 m — a gate you can see through and not walk
  through. Three went in that way in one round.
- **Do** treat a pole as a 0.4 m box costing 1.08 m of ground. One on a verge
  sealed a 1.4 m squeeze **in a different district built by a different module**
  that had been fine for two rounds.
- **Do** keep vehicles hard against one edge. A parked car takes **5.1 × 2.4 m**,
  not 4.4 × 1.7: a 3.4 m lane with one in the middle leaves 0.28 m and is a
  wall; the same car against a kerb leaves 1.08 m and is fine. Both look
  identical in a frame. Nothing parks on a lane under 3.6 m.
- **Do** park to the **outside** of adjacent bay lines. Two 1.475 m keis centred
  in bays at 2.1 m centres are 0.62 m apart — zero after two radii. Parked at
  18.85 and 21.55 instead, the walk-through is 1.22 m and both are still inside
  their markings.
- **Do** close a wall run properly or leave a **real** gap, and end each run in a
  pier. Three 3.2 m panels with 0.2 m joints put a "way through" in the middle of
  the only route from the back land onto the street — a fifth of what a body
  needs.
- **Do** end a long wall in a pier. 2.2 m of concrete terminating in nothing
  reads as a grey card standing on the paving at this tonal range.
- **Do** run a pairwise check over a placement pass's **own** list. Probing new
  props against `world.colliders` does not see the other new props: two
  hatchbacks 1.6 m apart with 4.05 m of body each were driven through one another
  for a whole round, and from every angle one hides the join. `buildTraffic`
  runs one in dev on every load.
- **Do** move a `FLOODFILL` probe to ground you can actually stand on when a
  vehicle parks in a bay. A waypoint inside a bay going unreachable is *correct
  behaviour*. Tell the two apart by re-running the fill with the new colliders
  spliced out.

### 9.4 Depth is built outward

The single most repeated class of bug in the repo — it appears **six** times.

- **Do** build depth **outward**: backing board at +0.04, battens at +0.12, sill
  and posts at +0.08. **Never** write a panel *behind* a wall face to look
  recessed — every building volume is a solid `BoxGeometry` and it is simply
  inside the render. Five onsen frontages of blank plaster, no throw.
- **Do** cut the volume back (with returns either side and a header over) when a
  caller genuinely needs a room behind the opening.
- **Do** order a window: **reveal set into the wall, interior on the face of it,
  glass in front of that, mullions in front of that.** A 0.14 m reveal centred on
  the wall face with the painted interior 5 mm behind it puts the plate *inside*
  the reveal — every window on the library was a flat grey panel.
- **Do** offset a windscreen along the wedge's **outward normal**, and **derive**
  which of the two normals is outward (take the one pointing away from the cabin
  centre). A pane laid on a raked panel's centreline is entirely inside it —
  every car in the world had a body-coloured windscreen, and the only tell is
  that the screen is the same value as the bonnet.
- **Do** hang a lantern/brake lever/anything clear of the cowl it sits behind.
  Levers written from the bar at `|z| = 0.15` were inside a 0.30 m bar cowl: the
  machine had no brakes from the only seat that can see them.
- **Do** tilt only a hood, which overhangs nothing. **Never** tilt a panel about
  its own centre "for depth": 0.12 rad on a 1.05 m board swings the bottom edge
  63 mm back, *inside* the 0.09 m posts it is bolted to. Every guide board in
  the world had its frame growing through its map.
- **Do** give anything hung over a doorway a clear **0.1 m**. Two coplanar sheets
  are a coin toss: a noren at +0.06 against a doorway board's face at exactly
  +0.06 rendered as a flat black rectangle — and it *had* rendered correctly from
  a slightly different camera an hour earlier, which is the tell. Find it by
  firing a ray at the wall and reading the hit list: coincident faces show as two
  hits at the same z.
- **Do** treat a **material edit with no visual effect** as proof the mesh is not
  being drawn. A deck slab went `concrete` → `concreteMid` → `asphaltWorn`, a
  fifth and then a third darker, and the frame was *pixel-identical* every time —
  because the building's mass top and the slab were coplanar. It is never a
  subtle material problem.
- **Do** butt a minor arm against a major road's kerb line. A T junction paved to
  the two centre lines leaves a quadrant unpaved: 2.5 × 1.8 m of bare grass
  0.11 m below two roads. A junction takes **three** numbers — carriageway to the
  far kerb line, footways to the near one, minor arm butting the major's kerb.
- **Do** stop a building mass 0.10 m short and let the deck slab close the top.

### 9.5 Orientation and rotation

- **Do** apply a rotation to an offset with `applyEuler`. **Never** hand-derive
  the endpoint of a part rotated about its own centre: the trunk tip is
  `centre + R·(0, trunkH/2, 0)`, not `x + sin(leanDir)·lean·trunkH·0.9`. Sin and
  cos swapped and 0.9·h where the half-height belongs planted **every limb and
  every blossom blob in the world** ~0.4 m from a trunk top 0.17 m across, at
  ninety degrees to the lean, in a different direction per tree.
- **Do** derive a raked assembly's tilt. A box along **Z** rotated about **X**
  sends its `+z` end **down**; a box along **X** rotated about **Z** sends its
  `+x` end **up**. Both were inverted on the overbridge, so the stair's underside
  climbed away from the treads it was carrying.
- **Do** rotate a cylinder that lies along the ground: a rail along z needs
  `rx = PI/2`. Two guide rails written `trs(x, 0.92, z, 0, 0, 0)` became 4.4 m
  columns, 0.74 m into the ground and 1.36 m out through a canopy roof.
- **Do** set `ry = atan2(nx, nz)` — the wall's outward normal — for a wall-mounted
  aircon, and put the origin at `wall ± (d/2 + standoff)` so the **back face
  touches the wall** (`standoff` default 90 mm, bracket arms span it). Half the
  outdoor units in the world faced into the wall they were bolted to, and some
  hung 0.2–1.3 m off it with their own shadow on the wall. Verify by firing a ray
  out of the **back** of every unit — never forward from behind the wall, which
  hits an interior face and reports clearance that is not there.
- **Do** rotate a prop's stand-off **with** the prop. `laneSign` offset its plate
  `+0.03` in world z and then rotated the plate about its own centre, so it only
  cleared the post at `ry ≈ 0`.
- **Do** turn a `PlaneGeometry` to face out: `rotation.y = atan2(nx, nz)`.
  `PlaneGeometry` faces +z and `flat()` is single-sided, so every painted
  interior, curtain, notice and poster on a frontage looking −z is back-face
  culled and simply absent. `shops.js` gets away without it only because every
  shop is authored facing +z.
- **Do** derive a quad's winding from a cross product against a reference point
  (`quadTo(…, refX, refY, refZ)`). **Never** write the winding down once for a
  surface that has four orientations: every crib cell in the world faced *into*
  the hillside, and what showed between the beams was the bare earth the cells
  existed to cover.
- **Do** say which side of the centre a bench is on, then derive its `ry`.
  `makeBench` puts its back at local −z, so `ry: 0` faces +z. Written as one
  constant for a pair it is guaranteed wrong for one of them: two benches sat you
  a metre from a wall looking at it, and two more faced away from the view the
  deck exists for, under a comment saying "facing the view".
- **Do** turn pavement clutter to face the street: a unit whose frontage looks
  −x needs `ry = -π/2` on everything stood outside it; a forecourt approached
  from −z needs `ry ≈ π`. Getting it backwards leaves the gachapon showing the
  street three blank coloured panels.
- **Do** pass `ry: PI` to **both** `bayPaint` and `makeWheelStops` for a bay
  entered from the low-z end — they both nose in from local +z. Otherwise the
  head line lands across the mouth of the bay and the numbered stake faces the
  wall. Neither shows in a frame from the road.
- **Do** remember `doorAt` and every in-unit offset is in the **unit's** frame.
  On a `z-` frontage a positive offset moves *west* on the street: a door
  specified 1.4 m east of centre got a porch built 1.4 m east in **world** space,
  putting the canopy, steps, mat, geta rack and both lamps beside the doorway
  with one lamp hanging in it.
- **Do** work out which side the street is on before placing the first prop on a
  blank flank, and check the last one against the same number. Ivy went in at
  x = −1.34 (correct); the pot shelf, water meter, notice board and cat box went
  in at −1.44, −1.50, −1.55 and −1.60 — all inside the render. The tell from the
  street is three terracotta pots with no backs.
- **Do** carry the slot, the plate, the keypad and the handle on **whatever face
  the prop is used from**. A posting slot on −z with the name plate on +z is a
  prop you cannot tell the front of.
- **Do NOT** use `mirrored()` on a two-sided sign. `BoxGeometry` already reverses
  `udir` on the negative face of every axis, so one map reads correctly from both
  sides. Adding `mirrored()` is what *produces* the mirror writing — it was on
  every blade sign, every arch, every `makeSignPost({ double: true })`, i.e. the
  reverse of every two-sided sign in the world. Verified by rendering the same
  plate from both sides.

### 9.6 Materials, shadow and tone

- **Do** set `castShadow = false` on a thin overhanging coping. A 60 mm overhang
  is about two shadow-map texels at ±34 m, so its shadow lands as a row of
  sawtooth triangles along the wall face rather than as a line.
- **Do NOT** let a tree canopy `receiveShadow` — blossom **or** green. A ramp
  only shapes *direct* light, so once the shadow map zeroes the sun a blob falls
  back to ambient; a big tree self-shadows heavily, so you get **isolated dark
  circles hanging in the sky** next to a tree that is fine. Worse on green: the
  deepest grove tone starts at `#3f6b52` and ambient on that under a violet tint
  is very nearly black. Shrubs keep it **on** deliberately, because they sit on
  the ground where being in a building's shade reads correctly.
- **Do** set `depthWrite: false` on thin/transparent meshes. The ink pass reads
  the depth buffer, so petals and wires would otherwise be outlined into speckle.
- **Do** skip shadow casting on transparent materials (`shadowify` does).
  A glazed vending display casting a hard shadow onto its own stock is what made
  the bottles look muddy.
- **Do** set `flat: false` on cel materials on very thin geometry. At reed
  thickness you only ever see one facet, and a flat-shaded facet turned away from
  the sun is nearly black.
- **Do** draw a lattice with genuinely transparent gaps for anything mesh-like.
  A flat panel at low opacity reads as **tinted glass**. Same trap bit the crow
  net over the bins — a 1.6 × 0.7 plane at 0.3 opacity standing *in front of* the
  bins read as "an unidentified green rectangle beside them". It is a shallow
  open box over the lids now, mapped with `chainLinkTex`.
- **Do** tint glazing cool and push opacity past **~0.55**. A pale translucent
  sheet against a pale sky is invisible — the overbridge canopy started at
  `0xdfeaf2` / 0.42 and simply was not there in any frame, because every view of
  it is from below against the brightest part of the picture.
- **Do** use `emissive` (≈0.42) to lift something inside an unlit recess.
  **Never** just pick a lighter colour: the cel ramp's floor is the ramp's floor,
  so a light drink colour bought nothing against a dark liner. Same family as the
  grove canopies at `#3f6b52` and the parked cars' bottle green.
- **Do** lift a dark body colour. The sun is at `(-52, 62, 56)`, so a parked
  car's tail is always the face turned from it, and the ramp's bottom band on a
  true bottle green lands within a few per cent of the ink colour — glazing,
  seams and shut lines all stop existing. The one car in *permanent* shade (under
  the overbridge) is white.
- **Do** keep saturated lamps small. The first tail lamps at 0.26 × 0.20 in flat
  red were the loudest thing in any frame with a car park in it; 0.21 × 0.155,
  deeper, split by the housing bar every real cluster has.

### 9.7 Composition and readability

- **Do** give a small dark prop the one or two features that carry its
  silhouette at distance, or leave it out. **A prop under 0.3 m reads as a dot.**
  The crows were a 0.15 m sphere with a 0.045 m head seen from 8–20 m: three
  black circles hanging over the train, and the first thing anybody asked about.
  A perched crow needs the wedge tail held up off the wire and the beak clear of
  a flat head.
- **Do** size a cone-shaped blade at **0.038 m with five facets**. Under 0.04 it
  is one facet wide (edge-on or nearly black); over 0.05 it is 11 cm at the base
  and reads as a tent peg. Third time this bit: channel reeds, crows, lake reeds.
- **Do** match unit size to reading distance. A blob canopy at one size cannot be
  two species: a willow written as 40 blobs at `0.5·S` came out as six pale
  lozenges a metre across — at that size a blob *is* a canopy, so a curtain of
  them is a cloud. 120 units at 0.3 m, and the limbs cut from 2.1·S to 1.35·S so
  the fronds do not hang *inside* them.
- **Do** vary a whorl per tier. A conifer whorl as one seven-sided cone square to
  the axis is a lampshade — a per-tier ellipse (0.84–1.18) and two or three
  degrees of tilt costs nothing in the instance matrix.
- **Do** keep the props on the **verge**. Something standing *on* a 2 m path is a
  hole in the picture: a warning plate a quarter of a metre inside a link meant
  the whole view through the gap was the blank back of a sign at eye height.
  Anything at eye height in a narrow passage must be checked from **both**
  directions.
- **Do** skip the axis you want to see along. A row of blossom closes a view: one
  cherry five metres off the overbridge deck end closed the whole view west — at
  7 m up you are *inside* the canopy layer. Same rule as the school gate axis.
- **Do** keep a metre clear of the centre line of a deliberate opening, for the
  first ten metres. A utility pole 0.2 m off a 1.8 m hedge gap's axis, then a
  grove tree 0.4 m off it, each filled the whole opening the gap existed to make.
- **Do** keep a **corridor** clear for a viewpoint, not a cone. A 32° fan from a
  point is arbitrarily narrow at its apex — it left a 4 m gap five metres in
  front of a viewing deck, which is where a cedar went. The keep-out is a
  half-width that starts at 9 m and opens with distance.
- **Do** remember `+z` is the direction a deck **looks**, so anything at `+dz` is
  in the picture. A viewpoint's stair, rail gap, information panel and four of
  its five trees all went in across its own view.
- **Do** put a viewpoint's rail on the side it **looks at**, and leave open the
  side the ground actually lets you walk up (the back for a bank, along the crest
  for a ridge). It renders identically either way: a railed platform with a rail
  on it. A 0.09 m railing takes 0.86 m of ground once the radius is on both
  sides — the entire width of a ridge top.
- **Do** check what already exists at a longitude before putting a viewpoint
  there. A masking wall 1.6 m behind a new spot **is** the viewpoint: it filled
  the frame and read as a blank tan hillside, mis-diagnosed three times before a
  ray returned `parent: 'railway'` at 1.96 m.
- **Do** bracket lanterns off the eaves on a narrow street. A wire run of
  lanterns across a 4.8 m stone street closes the sky; over a 6 m shopping street
  it is right. Not a bug — a difference.
- **Do** keep two kerbside vehicles from facing each other across one street. A
  6.3 m carriageway with a 1.7 m car at each kerb is 2.9 m between them and the
  eye reads it as a slot. **Kerbside vehicles are the expensive ones visually:
  one in a frame is life, two is congestion.** Only 8 of 18 are on a carriageway.
- **Do** make a car keep clear of a narrow shop frontage. A doorstep strip of
  0.74 m with a van opposite left 0.44 m — open, but the whole frontage was
  behind a van. A **scan line across the frontage** shows it; a waypoint reads
  "reached" either way.
- **Do** use the interior (rail, seat backs, ceiling strip) for life and scale.
  **Never** put a figure anywhere. The no-people rule was broken exactly once,
  by painted passenger silhouettes in the train's glass, and it survived because
  it was small and distant. What gave it away was a head z-fighting the glass at
  6 mm.
- **Do** render a prop from a new viewpoint **before** making it enterable or
  ridable. A prop authored to be read from outside has no inside: sit on a
  scooter and you are 0.8 m behind it looking at three blank faces. The fault
  will not be a bug, it will be an **absence**.
- **Do** make a pocket visible from where the player will stand. A recess is only
  visible along a sight line shallower than `atan(height / depth)`: the first
  vending port was 0.135 over 0.17 = 38°, and the collider stops the player
  0.54 m from the face where the eye looks down at **70°**. 0.165 over 0.11 is
  56.3°, open to a standing eye from about a metre out.
- **Do** fix a flap rather than hinge it when two constraints on a moving part
  cross. 0.11 m of pocket against a 0.066 m can leaves a top-hinged flap nowhere
  to go, and deepening the pocket breaks the sight-line rule above. Translucent
  and fixed — **when two constraints on a moving part cross, the part probably
  should not move.**
- **Do** check where an interaction's moving thing actually *is* when the
  interaction appears to do nothing. The 取出口 was a texture on a solid box and
  `dispense()` released the can 0.14 m **inside** it: the most-used interaction in
  the world (19 machines) played a perfectly correct animation entirely within
  opaque geometry.
- **Do** check for coplanar overlap between two panels on the same face. The
  vending selection buttons (y 0.16–0.35, x −0.45…0.59) and the port panel
  (y 0.10–0.34, x −0.51…0.11) were the same plane: three of five buttons in each
  row had been behind it since the machine was built. Nobody notices a missing
  button on a machine with ten.
- **Do** make a sign plate thicker than the post it is bolted to. A 0.04 plate
  0.03 forward of a 0.09 post lets the post through the printed face. Two-sided
  plates are 0.12 and centred on the post; single-sided ones sit in front.

### 9.8 Height fields and terrain (only if the city has relief)

- **Do** author a mountain a bore passes through, do not carve it. **A height
  field cannot have a hole in it** — take faces out and you get a canyon open to
  the sky, and you cannot make one vertical either. Cut a rectangle out of the
  lattice (every edge **on a lattice line**) and fill it with a swept cap.
- **Do** interpolate a cap with a bilinear **Coons patch** from its four boundary
  curves, so along both portal planes the cap *is* the hillside's own edge. A cap
  that blends from a crest line out to the terrain only at two edges leaves a
  lens 39 m wide and 11 m tall to close — "39 m of concrete 11 m tall is not a
  portal, it is a dam."
- **Do** put a cap's sampling stations **on lattice nodes** — derive the count
  from `CELL`. 1.95 m stations against a 3 m lattice never land on a node, and
  measured **1.69 m of gap** open to the sky for thirty metres. This is why a
  lattice may only ever be **halved**.
- **Do** split a portal into concrete below the coping line and hillside green
  above, and size the coping to where the wall actually reaches that line,
  sampled at 0.4 m. Running the concrete to the cap's bell gives a 13 m grey
  tent; coping quantised to the face's own 2 m spacing overhangs by up to two
  metres and reads as a diving board.
- **Do** hold a shape's contour **0.45 m clear** of every hole.
  `ShapeUtils.triangulateShape` cannot separate a hole coincident with the outer
  contour and emits enormous triangles spanning the opening. All four tunnel
  portals had a wedge of concrete across the mouth.
- **Do** run the slope limiter **before** the roughness, and only ever *lower*
  nodes. 0.52 for a wooded hillside, 1.9 inside engineered corridors. A limiter
  pinned along a *straight* line produces a perfectly uniform ramp with no
  oblique route up it.
- **Do** give an analytic surface actual geometry, not tone. A sum of wide
  ellipses under a slope limiter is nearly coplanar over tens of metres and a cel
  ramp quantises per facet, so the first massif was one flat area of green with a
  hard straight edge. **And it cannot be a sine**: two octaves of
  `sin(ax+bz)·cos(cz−dx)` give every ridge the same bearing and the ink pass draws
  three perfectly straight lines down the hillside. 170 scattered small bumps, a
  third of them hollows, applied **after** the limiter.
- **Do** key a facet's tone off `hypot(dh/dx, dh/dz)` from the triangle's own
  plane. **Never** off the biggest drop across its three edges: on a uniform ramp
  the diagonal edge falls twice as far, so the test reported 1.04 for a 0.52
  slope and painted a hundred square metres of tan on a green hillside.
- **Do** split a heightfield's cells on **alternating** diagonals — and make the
  query use the same rule as the mesh, or they stop being the same surface. All
  one way gives the hillside a diagonal grain the ink pass draws as straight
  lines: "the most artificial thing a heightfield can do, and it costs one bit".
- **Do** add a cover field that is **not derived from the terrain**. On a belt
  with one aspect, an aspect term is a constant: slope, height and aspect were
  all constant over 28 m and **88 % came out in one tone with 0 % in the deep
  one**. Roughness does not fix it — the normal turns 7.0° per facet pair and a
  three-band ramp needs about 35.
- **Do** divide a scattered-blob field by the accumulated weight. **Never**
  sum-and-clamp a *cover* field (that is right for *displacements*, which add):
  460 blobs covering the window twice over pass ±1 nearly everywhere and the
  clamp flattens it — measured p75 and p95 both exactly **1.00**.
- **Do** halve a `CELL` only together with a roughness octave at the new size,
  and **halve any node jitter with it** — a jitter has no length scale of its own
  and turns into per-node fizz.
- **Do** scatter scrub, boulders and tussocks over engineered faces yourself.
  `plantRange` refuses anything steeper than 0.9 and every cut bank, cap flank
  and col ridge is 1.3–1.9 *by construction*, so they render as large unbroken
  areas of bare-earth tone — measured 45 %, 60 % and a third of three frames.
  It is not a tone problem, it is a *nothing on it* problem.
- **Do** make a face treatment **seek forward** (up to 6 m) for ground that is
  actually steep before it lays anything, and treat a column that never finds any
  as not a face. Starting at a nominal toe produced **twenty-six triangles** of
  crib across two flanks, indistinguishable from the feature not existing.
- **Do** hand a viewpoint's own footprint to whatever covers a measured area
  afterwards. "Anything that covers a measured area rather than a written
  rectangle has to be told what is already standing in it, and the module that
  put it there is the only thing that knows."
- **Do** bench a hill path to its own longitudinal profile, cut **and** fill. A
  path laid on a slope inherits the cross-fall: on a 1.9 bank every 0.35 m axial
  step is a rise of 0.63–0.78, which the flood fill can never climb in any
  direction. Benching took the worst axial rise from 0.742 to **0.375**. Cut
  alone leaves every hollow, and what stops a fill is climbing *out* of one.
- **Do** run a steep flight along an axis, or grade the ground under it. **An
  axis-aligned platform cannot express a diagonal tread**: a 0.2 m tread's AABB
  is a metre deep, five overlap any point, `heightAt` takes the max, and the
  "staircase" is the same ramp shifted half a metre up-slope.
- **Do** keep a **corridor** in the view list for a plantation, not a bigger
  keep-out disc. `SITES` radii sized for a scatter let an 11 m conifer block reach
  within 1.5 m of a ridge walk — the deck's establishing shot came back as a wall
  of cedar.
- **Do** replace `TUNNEL`-shaped singletons with an **array** and make every
  consumer take the union. One object read in four scattered longitude tests
  means finding all four by hand for a second bore, and **the catenary-mast one
  is silent** — a 6.6 m mast inside a lining cannot be seen from anywhere.
- **Do** check a cross-section **numerically against the thing that has to fit
  through it**. A bore profile written from the arch's *radius* instead of its
  springing put the crown at 3.20 m, the side walls at minus ten centimetres, and
  the train's roof, pantograph and both catenary wires through solid rock (the
  messenger wire by 2.78 m). It survived the entire life of the first bore
  because a tunnel with a train in it is a dark hole with a dark shape moving in
  it.
- **Do** give a hill-surface builder an optional `yAt`. `hillMeshY` answers with
  the flat grade inside a notch — correct, and it seats anything meant for a
  cap's surface fifteen metres *under* it, invisible.
- **Do** verify `hillAt == 0.00` over every collider and platform in built
  ground, every time. Measured: **0.00 over all 1 435** of them, sampled at
  13 263 points.

### 9.9 Water

- **Do** derive a lake's rim from the shoreline (`rimAt`), so no-spill is
  **structural**: within `crest/bank` of the water the ground is exactly
  `LEVEL + bank·s`. **A body of water fails *globally* and nothing renders the
  failure** — every other bug in the table is local. The first rim was seven
  elliptical summits and **twenty of thirty-two shoreline stretches had ground
  below the water level within two metres of the shore**, worst 4.7 m. Not a
  leak; no lake at all. A quartic bump is at 56 % of its height half a radius out.
- **Do** run a flood fill on `field < LEVEL` from a seed in the basin
  (`lakeLeakCheck`). Per-point freeboard passes while a gully twenty metres out
  drains the lot.
- **Do** fade a fill term toward its own floor, not toward zero:
  `FLOOR + (v − FLOOR) · keep`. A term whose baseline is not zero cannot be
  multiplied by a keep-out mask — the lake's rim is a height *above `LEVEL`* and
  `LEVEL` is 3.4, so masking it faded the rim to **3.4 m under the water** at the
  one longitude the range crosses the railway.
- **Do** decide up front: water **above** the datum is a contour, water **below**
  it is a hole. A hole means faces removed from *both* ground surfaces, sealed by
  its own concrete, plus a `ctx.cut` — three cooperating layers and a cut edge all
  the way round, which is fine for a 5 m channel and absurd for a 110 m lake. A
  contour is a flat mesh hidden wherever the ground is higher, the same trick the
  hill mesh already uses; the shoreline is then irregular for free, depth is
  `LEVEL − field`, and nothing downstream changes. The price is that the lake is
  perched.
- **Do** keep 20 m for three parallel linear features and a building. A
  shoreline, a promenade, a road and a cafe only work in one order going inland —
  water, walk, terrace, building, car park, road. At the first placement the road
  ran 2–3 m *lakeward of the footpath* and the cafe's collider sat on top of both.
  "The walk did not stop at a wall in any frame; it just went into the building."
- **Do** make a sky reflection on water a **broad soft area**, 96 panels at
  0.5–1.5 m. 150 panels of 2.2–7.0 × 0.22–0.6 m read from twenty metres as a
  hundred short pale ticks in rows — indistinguishable from lane markings.
- **Do** overlap kerb units and put them at the **edge of the metalling**. 1.2 m
  units at 1.12 m centres, a metre outside a 4.0 m carriageway, are two rows of
  separate concrete blocks sitting on the grass. 2.15 m and 1.35 m units at
  1.04 m centres.

### 9.10 Slot allocation and placement passes

- **Do** route every prop a plot places through the slot allocator (`take()`),
  including the aircon — it walks outward from a preferred offset in 0.3 m steps
  and never reuses a slot. `dressPlot`'s outdoor unit went at
  `±(halfW − 0.75)` and only *then* pushed its slot into `used`, so it could land
  on the door, in the gate opening, or buried to its middle in the front step.
  Reserve the gate first: `used.push([gateAt - 0.75, gateAt + 0.75])`.
- **Do** check whether a constraint is a function of the **other** axis before
  concluding a prop cannot be placed. Two planters had to be east of a retaining
  wall (x > −4.11) and west of a carriageway cull (x < −4.23): nothing satisfies
  both, and nudging either way buried or deleted them. The band **opens further
  along the frontage** because the road drifts — the answer was `planterAlong`,
  not a bigger `planterOut`.
- **Do** read the generator for anything that sticks out of its own footprint,
  and write the derived extent in the comment. `makeWalkup` builds its open stair
  at local `x -w/2-1.6 .. -w/2`, `z d/2-1.55 .. d/2+0.3` — outside the mass, so
  outside `plotCollide`'s box, and on a `face: 'x-'` block that is 1.8 m off the
  **south** end where nobody expects it. Guessed at, it put a 5 m collider across
  one forecourt and dropped a real staircase into another block's private road.
  Same for `makeNagaya`'s 0.92 m eave and `makeWalkup`'s balconies.
- **Do** build the module against a stub `ctx` and test every added group's
  origin against the AABBs of the district's own solid masses. Three props in one
  district were written relative to a face nobody had measured: two roof
  condensers (one 1.11 m out in the aisle, one entirely inside a plant hut),
  basket stacks 0.9 m *east* of a recess which is the middle of a solid block, and
  a 1.1 × 3.6 m flower bed inside the building. None threw, none showed.
- **Do** park a bike *along* a wall. **A bicycle is 1.73 m long and 0.55 m wide**:
  a bike **propped** against a wall is parallel to it and stands off by half a
  handlebar (~0.35 m); a bike in a **rack** is nose-in, so what has to clear the
  render is half a wheelbase (~0.95 m). Thirty-seven of eighty-seven were placed
  by their clearance to the wall — burying 0.86 m of the bike behind the wall it
  was buried in, invisible from every angle. Check bike-against-bike too: two
  under one shelter at `ry ≈ 0` were 0.8 m apart down their own length.
- **Do** enumerate what land is spoken for **by querying `world.colliders` over
  the envelope**. One header left out a shop (x 1.95..7.05, z 49.15..54.65): its
  lane was laid through the shop for six metres, its lamp pole stood in the shop
  floor, its hedge went in the 0.65 m slot between shop and road, and the block's
  only connection to the world was a 0.49 m pinch. **Every frame of it looked
  right.**

### 9.11 Tooling and process

- **Do** flood-fill the walkable area. **Never** hand-pick waypoints: they "test
  what you already believe". Four of six districts were unreachable on the first
  pass — a closed gate, a shed on the footpath, a retaining wall across a link,
  two vending machines across a lane, bridge railings across both banks, a row of
  tree trunks down the middle of a 3.4 m path. None of it throws and none of it
  shows in a screenshot.
- **Do** key the fill's visited set on **(cell, height bucket)**:
  `seen.add(cell * 64 + Math.round(y / 0.3))`. A one-bit-per-cell fill claims the
  step cells at ground height from the side before the climb reaches them and
  then refuses to revisit, so **the top of any flight reports unreachable**. And a
  *tolerance* is not a bucket — it ping-pongs forever on a slope: measured
  **53.6 million visits for 770 k cells** and it never finished; the bucket
  converges in 12 M.
- **Do** run the fill in `setTimeout` chunks of ~200 k visits with state on
  `window.__fill`, and poll it. 900 k cells is ~40 s of JavaScript, past every
  timeout in the toolchain — and a synchronous overrun leaves the page wedged so
  hard that `location.reload()` also times out and the dev server has to be
  restarted.
- **Do** print the fill's bounds with its number and check them against the new
  district's envelope. A window of x −95…85, z −85…95 against a district reaching
  z ≈ 105 reported a car park, two houses and every tree behind them unreachable —
  "a clean, confident, entirely false result".
- **Do** report **distance to the nearest reached cell**, not a boolean. A
  boolean says "unreachable" for anything one grid step off, and half of one
  round's first run was that rather than a real blockage. A reading of 0.35–0.70
  is usually a bad probe point — confirm with a **scan line** across the gap.
- **Do** re-run the fill with **every** block's waypoints after adding furniture,
  not just the block you are working on.
- **Do** bucket colliders and platforms on a 6–8 m grid before a fill.
  `world.heightAt` walks the whole platform list per call and there are ~480.
- **Do** write any `.bat` with CRLF (`.gitattributes` enforces it). cmd.exe
  silently aborts an LF-only batch at the first multi-line `if ( … )` block, and
  the symptom is a double-click that appears to do nothing at all. Write the
  tests as single-line `if … goto`.

---

## 10. Performance — measured numbers and the rules from them

### 10.1 The headline

> **The scene is draw-call bound**, measured: ~20 ms at the crossing (the
> heaviest view, ~3050 calls in the colour pass), ~11 ms in the shopping street
> (~1400 calls), 585k triangles, ~5000 meshes. **Halving the internal resolution
> changes nothing (19.3 → 19.1 ms)** and shrinking the shadow cascade from ±34 m
> to ±22 m barely helps (19.7 → 18.4 ms) — so if a frame time regresses, do not
> go looking at fill rate or shadows. **Count draw calls.**

### 10.2 Measured tables

Colour pass only, warm page:

| view | draw calls | triangles submitted |
|---|---|---|
| the crossing | 2 506 | 1 207 k |
| the bridge deck | 4 361 | 1 272 k |
| a residential lane | 345 | 932 k |
| the library forecourt | 307 | 926 k |
| the festival ground | 341 | 1 071 k |

All passes, 1000 × 560, a later round (numbers are higher because they sum every
pass of one `__shot`):

| view | draw calls |
|---|---|
| the school road, north from z −58 | 10 722 |
| こばと橋南詰, north | 9 583 |
| 五丁目's lane, north | 7 789 |
| the bridge deck | 6 648 |
| the crossing | 4 766 |
| 二丁目's spine, north | 4 228 |
| the opening composition | 2 142 |
| the library forecourt | 1 612 |
| a new district's own establishing shot | 582 – 905 |
| **the hill viewing platform** | **~13 600** |

Scene totals at three points in the project's life:

| | early | mid | late |
|---|---|---|---|
| triangles | 585 k | 859 k | ~900 k floor |
| baked meshes | ~5 000 | 6 664 | — |
| instances | — | 13 362 | — |
| colliders | — | 453 | **829** |
| interactables | — | 11 | 20 |
| rigid rigs | — | 50 | 70 |
| geometries / textures | — | — | 12 323 / **205** |
| modules in a clean production build | — | 57 | **62** |

### 10.3 The rules

1. **Judge a change by draw calls.** Wall-clock frame time drifts **33–42 ms**
   run to run with nothing changed, so it cannot resolve anything under ~8 ms.
   Only believe a timing delta reproduced across alternating A/B runs inside one
   page session. Measure by accumulating `renderer.info.render.calls` across
   every pass of one `__shot`.
2. **New districts are almost free in old views.** They are ordinary baked meshes
   and the frustum test on them is exact, so standing at the crossing you pay
   nothing for a district you cannot see. Measured: adding a whole district cost
   **0** calls at the crossing, the bridge deck and the library forecourt, and
   **+1 291** on the one 38 m kerbed corridor pointing straight at it.
3. **The floor is the planet-scale rings, and it is ~900 k triangles.** Anything
   that goes all the way round is never frustum-culled (after the bake its
   bounding sphere is the whole planet) and is submitted on **every** frame from
   everywhere — measured **926 k standing in the library forecourt with almost
   nothing in view**. Therefore: **the structure runs the whole way round and the
   dressing does not.** Moving the canal's coping, service paths and retaining
   kerb off the remote ring saved **134 k triangles, a fifth of the whole scene,
   and nobody can see the difference.** Bounding the canal to a 204 m reach made
   its whole structure ordinary district-scale geometry that culls normally.
4. **Do not coarsen the bake to save triangles.** A per-mesh `maxEdge` override
   was tried and rejected: at `maxEdge = 9` a chord sags 63 mm, which opens a
   visible slot wherever a fine-tessellated layer sits on a coarse one (coping on
   wall, path slab on bank). Every layer would have to go coarse together, and
   then the bridges — which must stay fine — mismatch at their seams. Not worth
   130 k triangles of vertex work.
5. **The remaining easy win is multi-mesh props placed dozens of times.**
   `makePlanter` is eleven meshes and is placed ~40 times; `makeBicycle` is
   fourteen. `makeBikeRack`'s treatment (bake by material → instance the N) is
   worth roughly **a thousand calls**.
6. **Keep frustum culling on.** Turning it off costs ~8 ms at 5 000 meshes.
   Instanced meshes are excluded on purpose.
7. **The expensive views are the ones that look down a long open corridor.**
   The heaviest view in the world is looking north up the school road (a valley),
   and a hill viewing platform 18.3 m up with a 76 m ground horizon is 13 600
   calls "because the school, the ground, the gym, the hill-foot road, most of
   the massif's planting and a good deal of the town are all in frame and almost
   nothing is culled". Worth knowing before blaming a change for a regression
   measured up there.
8. **Vehicles are cheap.** Thirty-six vehicles cost +100 to +184 calls in the
   five heaviest views. They were cut to eighteen for *composition* reasons, not
   cost.
9. **Sixty-two ES modules, one three.js chunk.** `chunkSizeWarningLimit: 1200`
   because "three.js is one big chunk on purpose, so the size warning is just
   noise". `assetsInlineLimit: 0`, `target: 'es2020'`.

### 10.4 The flood-fill tool (the other measurement that matters)

```js
const w = window.__scene.world, R = 0.34, STEP = 0.38, G = 0.35;
const blocked = (x, z, y) => w.colliders.some((c) =>
  !(c.top !== undefined && c.top <= y + STEP) &&
  x > c.x0 - R && x < c.x1 + R && z > c.z0 - R && z < c.z1 + R);
const seen = new Set();                     // seen.add(cell * 64 + Math.round(y / 0.3))
window.__fill = { reached, done: false, visits: 0 };
const step = () => {
  let budget = 200000;
  while (stack.length && budget-- > 0) { /* ... */ }
  if (stack.length) setTimeout(step, 0); else window.__fill.done = true;
};
setTimeout(step, 0);
// poll: JSON.stringify({ done: __fill.done, reached: __fill.reached.size })
```

Scan-line probe for a suspect gap:

```js
const { reached, X0, Z0, G } = window.__fill;
const has = (x, z) => reached.has(Math.round((x - X0)/G - 0.5) * 100000 + Math.round((z - Z0)/G - 0.5));
let s = ''; for (let i = 0; i <= 20; i++) s += has(44.2 + 3.0 * i / 20, 31.7) ? '.' : '#';
```

Reference numbers: **796 858 cells** reachable from the spawn over
x −170…170, z −200…130 (town + hills); a separate 261 870-cell window for the
lake district; ~9 s with the colliders bucketed. Adding a district of ~61
colliders *reduces* the count by a few thousand, which is the right direction.
The number that means something is **the waypoint list**, not the total.

---

## 11. Rebuilding this for another city — build order

1. **Vite + three.js + the `__shot` middleware.** Nothing else. Get
   `window.__shot` and the headless `buildWorld(stub)` check working before any
   content exists.
2. **`palette.js`, `toon.js` (`cel`/`flat` + the shadow tint), `post.js`,
   `outline.js`.** The look is decided here and everything downstream depends on
   `cel()` existing.
3. **`util.js`** — the ten-function vocabulary in §5.1. Resist adding to it.
4. **The lighting rig and sky** (§8). Four lights, one fog, a fixed sun vector.
   Publish the sun vector as a constant districts can reason about.
5. **`street.js` or its equivalent**: one centreline, `centerX(z)`, `groundY(z)`,
   `streetHeight(x,z)`, `makeStrip`, `TERRAIN_DROP`. The terrain grid comes from
   this. Bound every lateral test in both axes.
6. **`planet.js`** if the world wraps — or skip it entirely; nothing above knows
   it exists. If you keep it: `R`, `CIRCUMFERENCE`, `positionAt`, `basisAt`,
   `wrapX`, `bakeToPlanet({ maxEdge })`, `planetRigid`, `planetSpin`.
7. **`player.js`** with the constants in §7.1. Everything about spacing in the
   world is a consequence of `RADIUS`, `STEP` and `heightAt`'s `fromY` reach.
8. **`textures.js` core** (`make`, `cached`, `fitText`, `centered`, `vertical`,
   `rule`) and about a dozen textures. Grow it per district thereafter.
9. **`ground.js`** (pad, lane, laneLine, steps, wallRun, meshFence, railing) and
   **`plots.js`** (plotBox, plotCollide, plotWall, hedgeRun, dressPlot with a
   real slot allocator). These two files are what make many districts read as one
   town.
10. **One generator per building type**, all authored facing +Z, all baked by
    material bucket, all registering their own collider from `plotBox`. Aim for
    ≤ 8 draw calls per building.
11. **`props.js`** — 50-odd `makeX(o)` functions, each returning a `Group`
    positioned at `(o.x, o.y ?? 0, o.z)` and rotated by `o.ry ?? 0`. Any prop
    placed more than ~20 times gets the `makeBikeRack` treatment.
12. **`trees.js` / `petals.js`** — world-wide gatherers, run once at the end.
13. **Districts**, one module each, `build<Name>(ctx)` → `{ …planting, update? }`,
    added to the ordered `districts` array, each with a measured header and a
    `FLOODFILL` list.
14. **The flood fill and the shot table**, from the first district onward. They
    are the only two tools that find anything.

### 11.1 Invariants worth stating up front for the new city

- Author flat; project once, at the end; never place spherically by hand.
- Every material through `cel()`/`flat()`; every colour from `PAL`; every random
  from `rngKit(seed)`; every matrix from `trs()`.
- Every generator faces +Z and is turned by `face`; every vehicle noses +X and is
  turned by `ry`.
- Seat everything with `ctx.groundAt`; walk with `heightAt(x, z, fromY)`.
- Depth is built **outward**.
- The player is a 0.34 m disc that adds 0.68 m to every collider in both axes.
- A barrier clears the feet by 0.95 m; a step is 0.38 m; platforms overlap.
- Textures are drawn, not loaded. Signage, paint and masks are all generated, and
  the art direction explicitly rules out high-frequency texture detail.
- **No people anywhere** — not as geometry, not as silhouettes, not on posters or
  signage. The environment carries all the narrative.
- Count draw calls. Look at renders. Flood-fill the routes.
