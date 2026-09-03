/**
 * usgs-epqs — bare-earth ground elevation for US worlds, from the USGS 3DEP DEM
 * via the Elevation Point Query Service.
 *
 * union-square-sf already ships an elevation.json built this way; what it does not
 * ship is the script that made it. This adapter is that script. It samples a regular
 * grid over the world bbox plus any explicitly requested points (viewpoint camera
 * positions, building origins), so a re-run reproduces the file exactly.
 *
 * EPQS returns NAVD88 metres when `units=Meters`. Where 1 m lidar coverage exists
 * (all of downtown San Francisco) that is what you get; elsewhere it interpolates
 * the 1/3 arc-second seamless DEM, which is why each sample records its own
 * resolution rather than assuming one.
 */
import { fetchJson } from '../http.mjs';

const ENDPOINT = 'https://epqs.nationalmap.gov/v1/json';

export default {
  id: 'usgs-epqs',
  title: 'USGS 3DEP bare-earth elevation (Elevation Point Query Service)',
  license: 'US-PD',
  attribution: 'U.S. Geological Survey, 3D Elevation Program',
  homepage: 'https://apps.nationalmap.gov/epqs/',
  requires: [],
  provides: ['elevation'],
  /** Only meaningful inside the United States and its territories. */
  appliesTo: (world) => world.region === 'us',

  async fetch(ctx) {
    const points = samplePoints(ctx.world, ctx.options ?? {});
    const samples = [];
    const failures = [];
    for (const p of points) {
      const url = `${ENDPOINT}?x=${p.lon.toFixed(7)}&y=${p.lat.toFixed(7)}&units=Meters&wkid=4326&includeDate=true`;
      try {
        const { json } = await fetchJson(url, {
          cacheDir: ctx.cacheDir,
          maxAgeMs: ctx.maxAgeMs,
          refresh: ctx.refresh,
          timeoutMs: 30_000,
        });
        const v = Number(json.value);
        // EPQS signals "no data here" with a large negative sentinel, not an error.
        if (!Number.isFinite(v) || v < -1000) {
          failures.push({ ...p, reason: `no-data (value=${json.value})` });
          continue;
        }
        samples.push({
          lat: p.lat, lon: p.lon, label: p.label,
          elevationM: Number(v.toFixed(2)),
          // Field is `resolution` (metres), verified against the live v1/json response:
          // {"value":"23.940353394","rasterId":71423,"resolution":1,
          //  "attributes":{"AcquisitionDate":"3/4/2023"}}
          resolutionM: json.resolution ?? null,
          acquiredOn: json.attributes?.AcquisitionDate ?? null,
          datum: 'NAVD88',
        });
      } catch (err) {
        failures.push({ ...p, reason: err.message });
      }
      ctx.progress?.(samples.length + failures.length, points.length);
    }
    if (!samples.length) throw new Error(`usgs-epqs returned no usable samples (${failures.length} failures)`);
    return { raw: { samples, failures }, provenance: { url: ENDPOINT, count: samples.length } };
  },

  normalize(raw, ctx) {
    const { frame } = ctx;
    return {
      elevations: raw.samples.map((s) => {
        const l = frame.geoToLocal(s.lat, s.lon, s.elevationM);
        return { ...s, local: [Number(l.x.toFixed(2)), Number(l.y.toFixed(2)), Number(l.z.toFixed(2))] };
      }),
      elevationFailures: raw.failures,
    };
  },
};

/**
 * A regular lat/lon grid over the bbox, plus any manifest-declared points of
 * interest. `stepM` defaults to 25 m, which is ~1,000 samples over an 800x720 m
 * bbox — enough to resolve San Francisco's block-scale grade changes without
 * hammering EPQS.
 */
export function samplePoints(world, { stepM = 25, extraPoints = [] } = {}) {
  const { bbox } = world;
  const midLat = (bbox.north + bbox.south) / 2;
  const mLat = 111_132.954 - 559.822 * Math.cos(2 * midLat * Math.PI / 180);
  const mLon = 111_412.84 * Math.cos(midLat * Math.PI / 180);
  const dLat = stepM / mLat;
  const dLon = stepM / mLon;
  const out = [];
  for (let lat = bbox.south; lat <= bbox.north + 1e-9; lat += dLat) {
    for (let lon = bbox.west; lon <= bbox.east + 1e-9; lon += dLon) {
      out.push({ lat, lon, label: 'grid' });
    }
  }
  for (const p of extraPoints) out.push({ lat: p.lat, lon: p.lon, label: p.label ?? 'poi' });
  return out;
}
