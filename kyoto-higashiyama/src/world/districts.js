/* ------------------------------------------------------------------ *
 * The district registry, and the systems that run after it.
 *
 * Order is the build order and it matters: a module that lays a surface or
 * registers a platform must run before anything that seats props on it.  See
 * the note at the top of `world/index.js`.
 *
 * Every district on the route is registered here from the start, as a stub if
 * its builder has not been written yet.  That is deliberate: it means a builder
 * only ever edits its own file, the world always assembles, and a district that
 * is not finished shows up as a hole in a render rather than as a broken build.
 *
 * `SYSTEMS` run once, after every district.  They are the central batchers --
 * vegetation, petals, props.  A district never builds a tree or a repeated prop
 * itself; it calls `ctx.tree(...)` / `ctx.prop(...)` and these collect the lot
 * into a handful of instanced draws.
 * ------------------------------------------------------------------ */

import * as base from './base.js';
import { SYSTEM_MODULES } from './systems.js';

// --- Gion ---
import * as shirakawa from './shirakawa.js';
import * as gion from './gion.js';
import * as hanamikoji from './hanamikoji.js';

// --- the shrine ---
import * as yasaka from './yasaka.js';
import * as maruyama from './maruyama.js';

// --- the quiet transition ---
import * as shimogawara from './shimogawara.js';
import * as nene from './nene.js';

// --- the pagoda ---
import * as pagodadistrict from './pagodadistrict.js';

// --- the climb ---
import * as ninenzaka from './ninenzaka.js';
import * as sannenzaka from './sannenzaka.js';
import * as kiyomizuzaka from './kiyomizuzaka.js';

// --- the payoff ---
import * as kiyomizu from './kiyomizu.js';

// --- the connective tissue ---
import * as higashioji from './higashioji.js';
import * as hillside from './hillside.js';

export const DISTRICT_MODULES = [
  base,
  shirakawa, gion, hanamikoji,
  yasaka, maruyama,
  shimogawara, nene,
  pagodadistrict,
  ninenzaka, sannenzaka, kiyomizuzaka,
  kiyomizu,
  higashioji, hillside,
];

export const SYSTEMS = SYSTEM_MODULES;
