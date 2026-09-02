# QA agent brief (shared by all independent reviewers)

Project root: /Users/christinehu/Downloads/fable51-bench/3d. Dev server at http://localhost:5173 (do NOT start another; if down: `npx vite --port 5173 --strictPort &`). You are an INDEPENDENT reviewer: do not modify scene code. Produce a written report only (path given in your task). Be specific and severity-ranked; every finding must include the viewpoint id or camera (x,y,z,heading,pitch), what is wrong, what the reference shows, and a concrete fix suggestion.

## Tools
- Screenshots of the 34 reference viewpoints: `node tools/qa/capture.mjs --out=qa/shots/<you> [ids...]` (default all; `--time=night|sunset`), then `node tools/qa/compare.mjs --shots=qa/shots/<you> --out=qa/compare/<you> [ids...]` produces side-by-side + 50 % overlay sheets against the real photos (view the PNGs with the Read tool). Viewpoint definitions: src/data/recon/viewpoints.json (notes list what must be visible).
- Arbitrary cameras: `node tools/qa/capture.mjs --out=qa/shots/<you> "--cam=name:x,y,z,headingDeg,pitchDeg,fov"` (y = eye height in local metres; ground ≈ terrain: `node tools/qa/eval.mjs "window.__twin.world.terrain.heightAt(x,z)"`; compass heading: 351 = north along Powell, 81 = east along Geary/Post, 171 = south, 261 = west).
- In-app queries: `node tools/qa/eval.mjs "<js>"` — e.g. `window.__twin.storefronts()` (registry with names/addresses/status/confidence), `window.__twin.lifeStats()`, `window.__twin.stats()` (fps/draw calls/triangles), `window.__twin.buildingAt(x,z)`, `[...window.__twin.world.buildings.infos.values()].map(i=>[i.name,i.address,i.height])`.
- Walkthrough automation: `node tools/qa/walkthrough.mjs --out=qa/walkthrough/<you>` (18 scripted checks + screenshots); `node tools/qa/perf.mjs --headed=0`.
- Ground truth: src/data/recon/*.json + docs/recon/*.md (research with sources & confidence), refs/*/ (free-licensed photos), src/data/facades/*.json (what was authored).
- Local frame: x east (Stockton side), z south (Geary side); plaza centre (0,0); Powell x≈-73, Stockton x≈73.5, Post z≈-52, Geary z≈52.

## Report format
```
# <Reviewer> report — <date>
## Score: <n>/10 (category: ...)
## Blocking issues (must fix)
1. [severity: high] <viewpoint/camera> — <what is wrong> — <evidence/reference> — <fix>
## Major
...
## Minor / polish
...
## What is right (keep)
```
Budget: ~120k tokens. Do not fix anything yourself.
