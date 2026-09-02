# QA-E Interaction report — 2026-09-02 (orchestrator-run after the reviewer agent stalled twice on rate limits)

## Score: 7/10 (interaction quality)

Method: `node tools/qa/walkthrough.mjs` (18 scripted checks) + a scripted `window.__twin` session (collision, stairs, signals, store entry, interactables, 40-move failure hunt). Life was frozen (`freeze=1`) during the API session, so signal cycling was verified separately by the traffic build (3 rounds, 0 red-light runners) and by the pedestrian/traffic-light clock sync fix.

| Check | Result | Evidence |
|---|---|---|
| Scripted walkthrough (approach, crossing, plaza, monument, registry, Nintendo enter + interactables, exit, east side, Apple enter + interior, exit, life, aerial, orbit) | PASS 18/18 | qa/walkthrough/final/results.json |
| Building collision (walk into Westin from plaza / into Macy's from Geary) | PASS | player stopped at x −77.3 / z 52.2 (walls at −83.5 / 62.5) |
| Store entry: Nintendo | PASS | pos (−92.5, 34.5) inside footprint; doors, kiosk, plush bin activate without error |
| Store entry: Apple | PASS | pos (48.1, −78.7) inside pavilion; iPhone/MacBook/iPad inspect activate |
| Interactables registered | PASS | 23 (17 Nintendo, 6 Apple) |
| Failure hunt: 10 sidewalk points × 4 directions | PASS | 0 sunk / floating positions |
| Plaza stairs (scripted straight-line probes) | INCONCLUSIVE | probe positions hit planter walls; the walkthrough's Geary-corner ascent passes |
| Traffic signals cycle / pedestrians obey | PASS (traffic build, 3 rounds) | pedestrians now read `TrafficLights.state()` (NavGraph.lights) |
| Modes: orbit, tour, day/sunset/night, reference overlay | PASS | qa/shots/tour, qa/shots/refmode, qa/shots/night |

## Bugs / gaps (ranked)
1. [medium] Pedestrians never enter stores or queue at Nintendo; buses do not dwell at shelters.
2. [medium] Store "E · info" prompt shows for storefronts only within 32 m and ±30°; a minimap-free wayfinding cue (street-name signs) is small.
3. [low] Player can stand on the monument plinth steps but not on planters; no jump.
4. [low] Tour restarts if the page hot-reloads mid-tour (dev only).

## Keep
Door animations on approach, HUD storefront identification with real names/status, interactable ring highlight, basement occlusion in Nintendo's lower level.
