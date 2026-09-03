/* ------------------------------------------------------------------ *
 * The HUD.
 *
 * There is deliberately almost nothing here.  No minimap, no quest markers, no
 * floating icons over interactables, no compass.  The world is supposed to be
 * read by looking at it: the pagoda tells you where you are, the slope tells
 * you which way is up, and the shopfronts tell you which street you are on.
 *
 * What is left: an interaction prompt that only appears within reach, a place
 * name that fades in once when you enter a district and then goes away, and a
 * debug panel behind F1 that is not part of the experience at all.
 * ------------------------------------------------------------------ */

export function createHud() {
  const start = document.getElementById('start');
  const prompt = document.getElementById('prompt');
  const dot = document.getElementById('dot');
  const place = document.getElementById('place');
  const placeJp = place.querySelector('.jp');
  const placeEn = place.querySelector('.en');
  const flash = document.getElementById('flash');
  const debug = document.getElementById('debug');

  let flashTimer = 0;
  let placeTimer = 0;
  let lastDistrict = null;
  let debugOn = false;

  const hud = {
    onStart: null,

    setLocked(locked) {
      dot.classList.toggle('on', locked);
      if (locked) start.classList.add('gone');
    },

    setPrompt(text) {
      if (text) {
        prompt.textContent = text;
        prompt.classList.add('on');
      } else {
        prompt.classList.remove('on');
      }
    },

    /** Announce a district once, on entry.  Repeats are ignored. */
    setPlace(d) {
      if (!d || d.id === lastDistrict) return;
      lastDistrict = d.id;
      placeJp.textContent = d.name;
      placeEn.textContent = d.label;
      place.classList.add('on');
      placeTimer = 4.2;
    },

    flash(text) {
      flash.textContent = text;
      flash.classList.add('on');
      flashTimer = 1.8;
    },

    toggleDebug() {
      debugOn = !debugOn;
      debug.classList.toggle('on', debugOn);
      return debugOn;
    },

    get debugOn() { return debugOn; },

    setDebug(text) {
      if (debugOn) debug.textContent = text;
    },

    update(dt) {
      if (flashTimer > 0) {
        flashTimer -= dt;
        if (flashTimer <= 0) flash.classList.remove('on');
      }
      if (placeTimer > 0) {
        placeTimer -= dt;
        if (placeTimer <= 0) place.classList.remove('on');
      }
    },
  };

  start.addEventListener('click', () => hud.onStart?.());
  return hud;
}
