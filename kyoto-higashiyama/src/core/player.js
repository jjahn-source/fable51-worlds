import * as THREE from 'three';
import { clamp } from './util.js';

/* ------------------------------------------------------------------ *
 * First-person walker.
 *
 * Pointer-lock look, accelerated WASD, axis-separated AABB collision against
 * the world's colliders, and a terrain height query every frame so the walker
 * follows the slope, steps up onto a kerb and climbs Sannenzaka's stone flights
 * without any of them being modelled as anything but ground.
 *
 * No jump, no crouch, no third person, no physics engine.
 *
 * ------------------------------------------------------------- COLLISION
 *
 * `RADIUS` is added to **every side of every collider** before the overlap
 * test.  That single fact drives most of the world's dimensions: two facing
 * colliders need more than 2 x RADIUS of clear ground between them or the gap
 * is impassable, a gateway wants at least 1.8 m clear, and a 0.1 m post on a
 * 1.2 m footway leaves 0.26 m to squeeze past, which reads as a wall.
 *
 * Ishibe-koji is 3.0 m wide building-face to building-face.  With walls on both
 * sides that is 3.0 - 0.68 = 2.32 m of usable width, which is fine -- but it is
 * why nothing may be placed against those walls without checking.
 *
 * Movement is sub-stepped at 0.18 m so a sprint down Kiyomizu-zaka cannot
 * tunnel through a shopfront.
 * ------------------------------------------------------------------ */

const EYE = 1.62;
export const RADIUS = 0.34;
const STEP = 0.42;      // how high a kerb or tread the walker will step up

export class Player {
  constructor(camera, domElement, world, opts = {}) {
    this.camera = camera;
    this.dom = domElement;
    this.world = world;

    this.spawn = {
      pos: new THREE.Vector3(opts.x ?? -487, 0, opts.z ?? -560),
      yaw: opts.yaw ?? Math.PI,
      pitch: opts.pitch ?? -0.02,
    };
    this.pos = this.spawn.pos.clone();
    this.pos.y = world.heightAt(this.pos.x, this.pos.z);
    this.yaw = this.spawn.yaw;
    this.pitch = this.spawn.pitch;
    this.vel = new THREE.Vector3();
    this.bob = 0;
    this.locked = false;
    this.keys = new Set();
    this.walkSpeed = 2.4;
    this.runSpeed = 4.8;
    this.sensitivity = 0.0022;
    this.frozen = false;

    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._wish = new THREE.Vector3();
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 3.4;
    this.hovered = null;
    this.onInteract = null;
    this.onLockChange = null;
    this.onKey = null;

    this._bind();
    this.applyCamera(0);
  }

  _bind() {
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = clamp(this.pitch, -1.2, 1.1);
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      if (!this.locked) this.keys.clear();
      this.onLockChange?.(this.locked);
    });

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const c = e.code;
      this.keys.add(c);
      if (c === 'KeyE' && this.locked) this.onInteract?.(this.hovered);
      if (c === 'KeyR' && this.locked) this.reset();
      this.onKey?.(c, e);
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(c) && this.locked) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  /**
   * Take the pointer, if the page is allowed to.
   *
   * In a sandboxed frame -- which is where a published build runs -- the
   * request is refused and, in current browsers, refused with a *rejected
   * promise*: unhandled, it surfaces as "The root document of this element is
   * not valid for pointer lock" in the console on every click.  The refusal is
   * expected and harmless (the viewer supplies drag-to-look instead), so it is
   * caught rather than left to spill.
   */
  lock() {
    try {
      const r = this.dom.requestPointerLock?.();
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch { /* pointer lock unavailable; the caller has a fallback */ }
  }

  reset() {
    this.pos.copy(this.spawn.pos);
    this.pos.y = this.world.heightAt(this.pos.x, this.pos.z);
    this.yaw = this.spawn.yaw;
    this.pitch = this.spawn.pitch;
    this.vel.set(0, 0, 0);
    this.bob = 0;
  }

  /** Put the walker somewhere, feet on the ground.  Used by the shot harness. */
  teleport(x, z, yaw, pitch) {
    this.pos.x = x;
    this.pos.z = z;
    this.pos.y = this.world.heightAt(x, z);
    if (yaw !== undefined) this.yaw = yaw;
    if (pitch !== undefined) this.pitch = pitch;
    this.vel.set(0, 0, 0);
    this.bob = 0;
    this.applyCamera(0);
  }

  /** Push the player out of any collider it overlaps, smallest push-out wins. */
  _resolve(colliders, feetY) {
    const p = this.pos;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      // a collider whose top is within a step is walked over, not into
      if (c.top !== undefined && c.top <= feetY + STEP) continue;
      // a collider well above head height is walked under
      if (c.bottom !== undefined && c.bottom > feetY + 1.95) continue;
      const x0 = c.x0 - RADIUS, x1 = c.x1 + RADIUS;
      const z0 = c.z0 - RADIUS, z1 = c.z1 + RADIUS;
      if (p.x <= x0 || p.x >= x1 || p.z <= z0 || p.z >= z1) continue;
      const dxL = p.x - x0, dxR = x1 - p.x;
      const dzL = p.z - z0, dzR = z1 - p.z;
      const m = Math.min(dxL, dxR, dzL, dzR);
      if (m === dxL) p.x = x0;
      else if (m === dxR) p.x = x1;
      else if (m === dzL) p.z = z0;
      else p.z = z1;
    }
  }

  update(dt) {
    if (this.frozen) { this.applyCamera(0); return; }
    const k = this.keys;
    const sprint = k.has('ShiftLeft') || k.has('ShiftRight');
    const speed = sprint ? this.runSpeed : this.walkSpeed;

    let fwd = 0, side = 0;
    if (this.locked) {
      if (k.has('KeyW') || k.has('ArrowUp')) fwd += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) fwd -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) side += 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) side -= 1;
    }

    this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this._wish
      .copy(this._forward).multiplyScalar(fwd)
      .addScaledVector(this._right, side);
    if (this._wish.lengthSq() > 1e-6) this._wish.normalize().multiplyScalar(speed);

    const accel = this._wish.lengthSq() > 1e-6 ? 13 : 16;
    const a = 1 - Math.exp(-accel * dt);
    this.vel.x += (this._wish.x - this.vel.x) * a;
    this.vel.z += (this._wish.z - this.vel.z) * a;

    const feetY = this.pos.y;
    const colliders = this.world.colliders;

    const stepX = this.vel.x * dt;
    const stepZ = this.vel.z * dt;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(stepX), Math.abs(stepZ)) / 0.18));
    for (let i = 0; i < n; i++) {
      this.pos.x += stepX / n;
      this._resolve(colliders, feetY);
      this.pos.z += stepZ / n;
      this._resolve(colliders, feetY);
    }

    const b = this.world.bounds;
    this.pos.x = clamp(this.pos.x, b.x0, b.x1);
    this.pos.z = clamp(this.pos.z, b.z0, b.z1);

    /* Passing the current feet height is what lets an elevated deck be walked
     * under as well as on: `heightAt` only offers a platform to somebody
     * already within a step of it. */
    const targetY = this.world.heightAt(this.pos.x, this.pos.z, this.pos.y);
    /* The approach rate is deliberately high.  Stone steps are a 0.15 m jump in
     * the height field every 0.35 m of travel, and a soft follow turns a flight
     * of steps into a ramp with a wobble. */
    this.pos.y += (targetY - this.pos.y) * (1 - Math.exp(-22 * dt));

    const moving = Math.hypot(this.vel.x, this.vel.z);
    this.bob += dt * moving * (sprint ? 8.0 : 6.2);
    this.applyCamera(moving);
  }

  applyCamera(moving) {
    const amp = Math.min(moving / this.walkSpeed, 1) * 0.013;
    const eye = this.pos.y + EYE + Math.sin(this.bob) * amp;
    this.camera.position.set(this.pos.x, eye, this.pos.z);
    this._euler.set(this.pitch, this.yaw, Math.sin(this.bob * 0.5) * amp * 0.35);
    this.camera.quaternion.setFromEuler(this._euler);
  }

  /** Ray-test the interactable list; returns the closest one in range. */
  pick(interactables) {
    if (!interactables.length) { this.hovered = null; return null; }
    // cheap distance reject first -- there are a few hundred of these
    const near = [];
    const px = this.pos.x, pz = this.pos.z;
    for (let i = 0; i < interactables.length; i++) {
      const it = interactables[i];
      const dx = it.hitbox.position.x - px, dz = it.hitbox.position.z - pz;
      if (dx * dx + dz * dz < 30) near.push(it);
    }
    if (!near.length) { this.hovered = null; return null; }
    this.raycaster.set(
      this.camera.position,
      new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)
    );
    const meshes = near.map((i) => i.hitbox);
    const hits = this.raycaster.intersectObjects(meshes, false);
    this.hovered = hits.length ? near[meshes.indexOf(hits[0].object)] : null;
    return this.hovered;
  }
}
