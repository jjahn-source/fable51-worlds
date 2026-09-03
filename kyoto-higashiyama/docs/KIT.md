# The builder contract

Read this before writing a single line in `src/kit/` or `src/world/`. Every
module in the project is built against it, and a module that ignores it will
work in isolation and be wrong in the world.

---

## 1. Coordinates

`+X` east · `+Z` **south** · `+Y` up, metres, y is metres above sea level.
**North is −Z.** Origin is the Yasaka Pagoda at 61.3 m ASL.

Yaw convention (three.js): `yaw = atan2(-(tx-x), -(tz-z))` looks from `(x,z)`
toward `(tx,tz)`. `yaw = 0` faces north (−Z).

All coordinates and elevations come from `src/data/route.js`, which is derived
from an OSM + GSI LiDAR survey (`docs/recon/GEO.md`). **Do not invent a
coordinate for anything that has one there.** If you need a position that is
not in the table, derive it from ones that are and say so in a comment.

---

## 2. The height field is the only ground

```js
ctx.groundAt(x, z)     // the ground here — platforms and cuts applied
ctx.heightAt(x, z, fromY)  // the same, but a platform is only offered to
                           // somebody already within a step of it
ctx.normalAt(x, z)     // surface normal, for things that lie flat
ctx.slopeAt(x, z)      // degrees, for deciding whether something can stand
ctx.surfaceAt(x, z)    // { id, surface, dist, half, s } or null off-street
```

**Never** hard-code a y. Never model a slope and then let collision stay flat.
Seat every post, wall, prop and building on `ctx.groundAt`. A building on a
slope is seated on the *lowest* of its corners and its plinth makes up the
difference — that is what a real machiya does too.

If your district needs ground that the street corridors do not describe — a
temple terrace, a courtyard, the deck under a stage — register it:

```js
ctx.platform({ x0, z0, x1, z1, top })   // raises the ground
ctx.cut({ x0, z0, x1, z1, top })        // lowers it (a canal bed)
ctx.corridor('myPath', { points:[{x,z,y}...], half, frontage, surface })
```

Platforms and cuts must be registered **before** anything is seated on them.

---

## 3. Geometry goes into a baker, not into meshes

```js
const b = ctx.baker('ninenzaka');
b.add(geometry, matrix, color, { bands, tint, transparent, side, flat });
```

The baker merges everything with the same *shading* signature into one mesh
with one material and colour in a vertex attribute. A machiya facade is ~250
elements; as separate meshes that is 250 draw calls, and Ninenzaka alone would
be fifteen thousand. Through the baker the whole street is about six.

**Rules**

- One baker per district. Never share a baker across the world — a merged mesh
  is one frustum-cull unit and one shadow caster.
- `color` is an sRGB hex from `PAL`. Do not pass a `THREE.Color`.
- Geometry handed to the baker **must not be textured** — uv is stripped.
  Anything with a map (signs, noren, lattice sheets) is its own mesh; make it
  share a material via `celTex(tex, opts)` so forty shopfronts are one program.
- `bands`: `2 | 3 | 4 | 5 | 'soft' | 'soft3' | 'soft4' | 'deep'`.
  Use `'soft3'` for anything pale that must stay pale in shade — plaster,
  paper, blossom, gravel. Use `'deep'` for shop interiors.
- `tint`: `TINT.cool` (default; plaster, stone, tile), `TINT.warm` (timber),
  `TINT.warmDeep` (bengara, vermilion), `TINT.green` (foliage).
  A warm-red facade with a violet shadow goes purple. Do not do that.

---

## 4. Collision

```js
ctx.collide(x0, z0, x1, z1, top, bottom)
ctx.collideRot(cx, cz, w, d, ry, top, bottom)
```

**The walker's radius, 0.34 m, is added to every side of every collider.**
This is the single most consequential number in the project:

| you want | you need |
|---|---|
| a walkable gap between two colliders | > 0.68 m, and 1.2 m to feel passable |
| a doorway or gate you can walk through | ≥ 1.8 m clear |
| a 2.8 m alley (Ishibe-koji) | 2.12 m of usable width — place nothing against the walls |
| a kerb or step you walk *over* | pass `top`; anything ≤ feet + 0.42 m is stepped onto |
| an eave or a bridge you walk *under* | pass `bottom` |

Do not over-model. A shopfront is one box, not thirty. Collide the *volume*,
not the detail: nobody walks into a lattice batten.

---

## 5. Interactables

```js
ctx.interact({ hitbox, label, action })
```

`hitbox` is a small invisible `THREE.Mesh` you add to the scene yourself
(`visible = false` still raycasts). `label` is the prompt text, short and
lower-case, no "Press E". `action()` runs on E. Keep them simple: a sound, a
motion, a small state change. Prompts only appear within about 3.4 m.

---

## 6. Vegetation and props go to the central batchers

Do not build trees or repeated props yourself.

```js
ctx.tree({ kind, x, z, y, scale, rot, seed })
// kind: 'sakura' | 'shidare' | 'maple' | 'pine' | 'bamboo' | 'cedar'
//     | 'shrub' | 'camellia' | 'potted'
ctx.prop({ kind, x, z, y, rot, scale, variant })
```

Both are collected and instanced once, centrally. A district that news up its
own tree hierarchy costs forty draw calls and will be rejected.

---

## 7. Update loops

```js
ctx.update((dt, t) => { ... })
```

Keep them cheap and keep them few. Motion in this world is **restrained**:
noren lift, lantern sway, branches move, water flows, petals fall. Nothing
bounces, nothing spins, nothing pulses. If an animation would read as "a video
game thing is happening", it is wrong.

---

## 8. The roof kit

`src/kit/roof.js` returns baker-ready `parts` arrays — `{ geometry, color, opts }`.

```js
gableRoof({ w, d, pitch, eave, material, mukuri, sori, cornerLift, y, ry })
hipRoof({ ... })
irimoyaRoof({ ... })     // hip-and-gable — temples, shrines, gates
shedRoof({ ... })
hisashi({ w, depth, y, ... })   // the pent roof over a shopfront
karahafu({ w, h, depth, y })    // the ogee gable over an important entrance
rafters({ w, depth, y, ... })   // exposed rafters under an eave
brackets({ steps, ... })        // 斗栱, the bracket complex
gyo(), chigi()                  // gable pendant; shrine ridge finials
```

Curvature is not optional:

- **machiya, shops, houses** → `mukuri: 0.025–0.04`, `sori: 0`, `pitch ≈ 0.45`
- **temples, shrines, gates, pagodas** → `sori: 0.08–0.14`,
  `cornerLift: 0.4–0.9`, `pitch ≈ 0.5`
- `material`: `'tile'` (silver-grey いぶし瓦, the default),
  `'hiwada'` (cypress bark — Kiyomizu's Hondo and the shrine roofs),
  `'kaya'`, `'copper'`, `'board'`.

Eave overhang is deep: **0.9 m on a townhouse, 1.4–2.4 m on a temple.**
A Japanese roof that does not overhang looks European.

---

## 9. Textures

`src/core/textures.js`. Everything is Canvas2D at start-up; there are no binary
assets and there will not be any.

```js
verticalSign(text, opts)   norenTex(text, opts)     lanternTex(text, opts)
woodenSign(text, opts)     templePlaque(text, opts) menuBoard(title, items)
noticeBoard(lines, opts)   priceStrip(entries)      bannerTex(text, opts)
tileTex() hiwadaTex() latticeTex(kind) plasterTex() settTex() slabTex()
gravelTex() sudareTex() emaTex() omikujiTex() interiorTex(kind)
```

Type is **mincho, not gothic** — gothic reads as a convenience store, and
Kyoto's signage ordinance is the reason the real street does not look like one.
Cache anything reused: `cached(key, () => make(...))`.

Japanese strings must be real and correct. The catalogue is in
`docs/recon/STREET.md`.

---

## 10. Depth is built outward

You cannot carve a recess into a `BoxGeometry`. A shopfront with a real
entrance is built as: the building volume **stops short** of the facade line,
and piers, a header, the threshold and the interior backdrop fill the last
0.6–1.2 m. Same for a window reveal, a gate opening, a niche, an alcove.

This is the most-repeated bug in this kind of project. If something should have
depth and does not, check whether you built a box and expected it to be hollow.

---

## 11. Scale check

| thing | metres |
|---|---|
| person (eye height) | 1.62 |
| door head | 1.8–1.95 |
| machiya ground floor, floor to eave | 2.4–2.7 |
| machiya total (tsushi-nikai, half upper storey) | 5.4–6.4 |
| machiya total (full two storeys) | 6.8–7.6 |
| noren | 1.1–1.5 tall, hung with its hem at 1.5–1.7 |
| shop step / threshold | 0.15–0.25 |
| stone step (Kyoto slope-stair) | rise 0.13–0.15, tread 0.70–0.94 |
| stone lantern (春日型) | 1.6–2.4 |
| torii clear height | 3.5–5.0 |
| bicycle | 1.75 long |
| the ken module (京間) | 1.97 |

Bay spacing, post spacing and frontage should be multiples of the ken.
Full dimension tables: `docs/recon/ARCH.md`.

---

## 12. Verify by looking

```bash
node tools/capture.mjs --only=<id>          # render hero views to qa/shots/
node tools/capture.mjs --free=x,z,yaw,pitch # one arbitrary camera
```

Nothing here is judged by reading its source. Render it, open the jpg, and
compare it to a photograph of the real street. Every significant bug in a
project like this throws nothing and logs nothing.
