/* ------------------------------------------------------------------ *
 * Sound.
 *
 * Synthesised, like everything else here -- there are no audio files in this
 * project any more than there are texture files.  Everything below is built
 * from oscillators, filtered noise and envelopes at run-time.
 *
 * The brief for the world is "Quiet Kyoto": no visible people, and the place
 * told through their traces.  The sound follows that exactly.  What you hear
 * is the *building* and the *weather* -- water in a channel, wind through
 * bamboo, a temple bell a long way off, a wind chime under an eave, your own
 * footsteps changing as the surface under them changes from asphalt to granite
 * sett to stone slab to shrine gravel.  Voices are distant and never resolve
 * into words.
 *
 * Everything is behind a user gesture, because browsers require it, and behind
 * a mute, because some people would rather not.
 * ------------------------------------------------------------------ */

const clampV = (v) => Math.max(0, Math.min(1, v));

export function createAudio({ volume = 0.5 } = {}) {
  let ctx = null;
  let master = null;
  let started = false;
  let muted = false;
  let vol = clampV(volume);
  const beds = {};

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : vol;
    master.connect(ctx.destination);
    return ctx;
  }

  /* ---------------------------- noise sources ---------------------------- */

  let noiseBuf = null;
  function noise() {
    if (!noiseBuf) {
      const n = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < n; i++) {
        // brown-ish noise: much less harsh than white, and it is what moving
        // water and wind actually sound like
        last = (last + (Math.random() * 2 - 1) * 0.06) * 0.985;
        d[i] = last * 3.2;
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    return src;
  }

  /* ------------------------------- the beds ------------------------------ */

  /**
   * A continuous bed whose gain the world drives.  Four of them:
   *
   *   air     a very quiet wide-band wash, always on -- rooms and streets are
   *           never actually silent, and a truly silent scene reads as broken
   *   water   the Shirakawa, the temizuya, the Otowa falls
   *   leaves  wind in bamboo and in the hillside cedar
   *   town    the distant murmur of a city in a basin: traffic on Higashioji,
   *           voices that never resolve
   */
  function makeBed(kind) {
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(master);
    const src = noise();
    const f = ctx.createBiquadFilter();
    switch (kind) {
      case 'water':
        f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.5;
        break;
      case 'leaves':
        f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.8;
        break;
      case 'town':
        f.type = 'lowpass'; f.frequency.value = 320; f.Q.value = 0.4;
        break;
      default:
        f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 0.2;
    }
    src.connect(f);
    f.connect(g);
    src.start();
    /* Wind and water both *breathe*.  A constant-gain noise bed is instantly
     * recognisable as a loop; a slow random walk on the gain is not. */
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = kind === 'leaves' ? 0.09 : 0.05;
    lfoGain.gain.value = kind === 'leaves' ? 0.45 : 0.22;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    lfo.start();
    return { gain: g, filter: f, target: 0 };
  }

  /* ------------------------------- one-shots ----------------------------- */

  /**
   * 梵鐘 -- the temple bell.
   *
   * A struck bronze bell is not a sine wave with a decay; it is a small set of
   * strongly *inharmonic* partials over a very long decay, with an audible beat
   * where two nearly-equal partials interfere.  That beat is the whole
   * character of the sound, so the partial ratios below are deliberately not
   * integers and two of them are a couple of hertz apart.
   */
  function bell(freq = 62, gain = 0.9, dur = 11) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = gain;
    out.connect(master);
    const partials = [
      [1.00, 1.00, dur], [2.00, 0.42, dur * 0.7], [2.02, 0.36, dur * 0.72],
      [3.01, 0.20, dur * 0.45], [4.17, 0.14, dur * 0.3],
      [5.43, 0.09, dur * 0.2], [6.79, 0.06, dur * 0.13],
    ];
    for (const [r, a, d] of partials) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * r;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + d + 0.1);
    }
    // the strike: a short filtered noise burst, which is the wooden beam
    const nz = noise();
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 1.2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    nz.connect(nf); nf.connect(ng); ng.connect(out);
    nz.start(t); nz.stop(t + 0.4);
  }

  /** 鈴 -- the shrine bell you shake on its rope.  Bright, rattly, short. */
  function suzu() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 7; i++) {
      const at = t + i * 0.045 + Math.random() * 0.02;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = 1500 + Math.random() * 900;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.10, at + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.30);
      o.connect(g); g.connect(master);
      o.start(at); o.stop(at + 0.35);
    }
  }

  /** 風鈴 -- the glass wind chime.  Two or three clear notes, decaying. */
  function chime() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const base = 1750 + Math.random() * 500;
    for (const [r, d] of [[1, 1.9], [2.76, 1.1], [5.4, 0.5]]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = base * r;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.055 / r, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + d + 0.05);
    }
  }

  /** 拍子木 / a wooden clack -- a bicycle bell, a shutter, a door. */
  function knock(freq = 420, gain = 0.3, dur = 0.16) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  /** A sliding door, a shutter, cloth: filtered noise with a slow envelope. */
  function slide(dur = 0.6, freq = 1100, gain = 0.20) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const nz = noise();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.25);
    g.gain.linearRampToValueAtTime(0, t + dur);
    nz.connect(f); f.connect(g); g.connect(master);
    nz.start(t); nz.stop(t + dur + 0.05);
  }

  /** A ladle of water, a splash. */
  function splash(gain = 0.22) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const nz = noise();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(700, t + 0.5);
    f.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    nz.connect(f); f.connect(g); g.connect(master);
    nz.start(t); nz.stop(t + 0.6);
  }

  /* ------------------------------- footsteps ----------------------------- */

  /**
   * A footstep, coloured by what is underfoot.
   *
   * This is the highest-value sound in the whole system and it costs almost
   * nothing: the route runs asphalt -> granite sett -> stone slab -> shrine
   * gravel -> temple boards, and hearing that change under you is most of what
   * makes the world feel continuous rather than assembled.
   */
  const SURFACE = {
    sett:    { f: 900,  q: 1.1, d: 0.075, g: 0.055 },
    slab:    { f: 760,  q: 1.4, d: 0.085, g: 0.062 },
    asphalt: { f: 420,  q: 0.7, d: 0.10,  g: 0.038 },
    gravel:  { f: 2600, q: 0.5, d: 0.15,  g: 0.070 },
    board:   { f: 300,  q: 2.4, d: 0.14,  g: 0.070 },
    earth:   { f: 500,  q: 0.6, d: 0.12,  g: 0.034 },
  };

  function step(surface = 'sett') {
    if (!ctx || muted) return;
    const s = SURFACE[surface] || SURFACE.sett;
    const t = ctx.currentTime;
    const nz = noise();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = s.f * (0.86 + Math.random() * 0.28);
    f.Q.value = s.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(s.g * (0.8 + Math.random() * 0.4), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + s.d);
    nz.connect(f); f.connect(g); g.connect(master);
    nz.start(t); nz.stop(t + s.d + 0.02);
  }

  /* -------------------------------- the API ------------------------------ */

  let stepPhase = 0;
  let bellTimer = 40 + Math.random() * 90;

  const api = {
    get muted() { return muted; },
    get volume() { return vol; },
    get available() { return !!(window.AudioContext || window.webkitAudioContext); },

    start() {
      if (started) return;
      if (!ensure()) return;
      started = true;
      ctx.resume?.();
      for (const k of ['air', 'water', 'leaves', 'town']) beds[k] = makeBed(k);
      beds.air.target = 0.05;
      beds.town.target = 0.03;
    },

    setVolume(v) {
      vol = clampV(v);
      muted = vol <= 0.001;
      if (master) master.gain.value = muted ? 0 : vol;
      return muted;
    },

    toggle() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : vol;
      return muted;
    },

    bell, suzu, chime, knock, slide, splash, step,

    /**
     * Called each frame with where the player is and what they are doing.
     * The beds are driven by proximity to the things that make them.
     */
    update(dt, { x, z, surface, moving, running, near = {} }) {
      if (!started || muted) return;
      const t = ctx.currentTime;

      // footsteps, from the actual walking cadence
      if (moving > 0.4) {
        stepPhase += dt * (running ? 2.55 : 1.85);
        if (stepPhase >= 1) { stepPhase -= 1; step(surface); }
      } else {
        stepPhase = 0.55;
      }

      // beds
      beds.water.target = near.water ?? 0;
      beds.leaves.target = near.leaves ?? 0.02;
      beds.town.target = near.town ?? 0.03;
      for (const k of Object.keys(beds)) {
        const b = beds[k];
        const cur = b.gain.gain.value;
        b.gain.gain.setTargetAtTime(b.target, t, 0.6);
      }

      /* A temple bell, rarely.  Rarely is the point: a bell every thirty
       * seconds is a theme park, a bell twice in a twenty-minute walk is
       * Kyoto. */
      bellTimer -= dt;
      if (bellTimer <= 0) {
        bellTimer = 150 + Math.random() * 260;
        bell(58 + Math.random() * 8, 0.30 + Math.random() * 0.16, 12);
      }
    },
  };

  return api;
}
