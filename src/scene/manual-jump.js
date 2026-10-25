// Manual jumps in free play (Space): exact ballistic flight, its landing's «BUUUM» and camera impact, and the camera
// shake (trauma) the dance's landings add to.
import { PHOTO } from '../game/photo-control.js';
import { CALM } from '../core/env.js';
import { G, clock, chip } from '../game/state.js';
import { FIGURE_WEIGHT } from '../game/figures.js';

export let trauma = 0; // camera shake
export const setTrauma = v => (trauma = v);
// Manual flight uses exact ballistic integration: the same contact time/speed at 30, 60 and 120 Hz.
// Return an impact only on the crossing, never on subsequent grounded frames or a paused frame.
export function stepManualJump(body, dt) {
  if (!(dt > 0) || !(body.air > 0 || body.airV > 0)) return 0;
  const y = body.air, v = body.airV;
  body.air = Math.max(0, y + v * dt - 7 * dt * dt);
  body.airV = v - 14 * dt;
  if (body.air > 0) return 0;
  body.airV = 0;
  return Math.sqrt(v * v + 28 * y);
}
// A manual landing owns its actor and the exact input session that launched it.
// Separate from gameplay trauma: companions and demo accents cannot reach this channel.
let manualFlight = null, manualLanding = null;
const manualContext = token => token?.origin === 'manual-jump' && PHOTO.on && !G.paused && !CALM.matches
  && ['splash', 'select'].includes(G.state) && token.actor === PHOTO.id
  && token.epoch === PHOTO.epoch && token.inputEpoch === PHOTO.inputEpoch;
export function beginManualFlight(actor) {
  manualFlight = { origin: 'manual-jump', actor, epoch: PHOTO.epoch, inputEpoch: PHOTO.inputEpoch };
}
export function manualContact(actor, speed) {
  if (manualFlight?.actor === actor) {
    if (manualContext(manualFlight)) {
      manualLanding = { ...manualFlight, time: clock, startedAt: performance.now() };
      chip?.sfx('thud', speed, true, FIGURE_WEIGHT[actor]); // the «BUUUM» on the ground, once per flight; an explicit action, so it sounds with the menu music off too
    }
    manualFlight = null;
  }
}
export function manualLandingStrength() {
  if (!manualContext(manualLanding)) { manualLanding = null; return 0; }
  const age = Math.max(clock - manualLanding.time, (performance.now() - manualLanding.startedAt) / 1000);
  const initial = manualLanding.actor === 'mulassa-valls' ? 0.98 : 0.9;
  const strength = Math.max(0, initial - age * 1.6);
  if (age < 0 || strength === 0) { manualLanding = null; return 0; }
  return strength;
}
export function landingImpact(strength) {
  if (!CALM.matches) trauma = Math.max(trauma, strength); // replace, never stack repeated landings
}
export function clearManualImpact() { trauma = 0; manualFlight = manualLanding = null; }
export function expireManual() { // a flight or landing whose input session ended (paused, another state or figure) is dropped
  if (!manualContext(manualFlight)) manualFlight = null;
  if (!manualContext(manualLanding)) manualLanding = null;
}
