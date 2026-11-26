// The end's free look: a drag turns the camera round the finished campanar and up or down; let go, it coasts to a
// stop. scene.js places its camera through it every frame; with nothing dragged it is the plain end camera.
const TURN = { yaw: 0.006, pitch: 0.004, coast: 3, low: -0.15, high: 1.25 }; // rad per px, inertia's decay /s, elevation bounds (rad)

// bearing: the camera's own bearing round the tower (rad)
export function createTowerTurn(bearing) {
  let spin = 0, spinV = 0, rise = 0, held = false; // bearing added, its coasting speed, elevation added, a finger down
  return {
    reset() { spin = spinV = rise = 0; held = false; },
    drag(dx, dy, dt) {
      held = true;
      spin -= dx * TURN.yaw;
      rise += dy * TURN.pitch;
      if (dt > 0) spinV = spinV * 0.5 + 0.5 * (-dx * TURN.yaw / dt); // the finger's speed, a little smoothed
    },
    letGo(coast) { held = false; if (!coast) spinV = 0; },
    // the camera at r across and h up from (0, y, 0), turned by spin and raised or lowered by rise (no allocation)
    place(camera, r, h, y, dt) {
      if (!held && spinV) { spin += spinV * dt; spinV *= Math.exp(-TURN.coast * dt); if (Math.abs(spinV) < 0.01) spinV = 0; }
      const d = Math.hypot(r, h), base = Math.atan2(h, r);
      const el = Math.min(TURN.high, Math.max(TURN.low, base + rise));
      rise = el - base; // bounded where it stopped, so turning back acts at once
      camera.position.set(Math.sin(bearing + spin) * Math.cos(el) * d, y + Math.sin(el) * d, Math.cos(bearing + spin) * Math.cos(el) * d);
    },
  };
}
