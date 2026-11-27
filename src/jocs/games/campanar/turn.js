// The end's free look: a drag turns the camera round the finished campanar, never up or down; let go, it coasts to a
// stop. scene.js places its camera through it every frame; with nothing dragged it is the plain end camera.
const TURN = { yaw: 0.006, coast: 3, back: 0.55, ease: 3 }; // rad per px, inertia's decay /s; the way back's top speed (rad/s: the camera skill's orbit return) and ease /s

// bearing: the camera's own bearing round the tower (rad)
export function createTowerTurn(bearing) {
  let spin = 0, spinV = 0, held = false, home = false; // bearing added, its coasting speed, a finger down, going back to the front
  return {
    get spin() { return spin; }, // the turn so far (rad): the sky's round pans by it (sky.js skyPan)
    reset() { spin = spinV = 0; held = false; home = false; },
    // back round to the front (the camera's wall, arches.js CAM, where the special pieces are), the shorter way
    front() { home = true; spinV = 0; },
    drag(dx, dy, dt) {
      held = true;
      home = false;
      spin -= dx * TURN.yaw;
      if (dt > 0) spinV = spinV * 0.5 + 0.5 * (-dx * TURN.yaw / dt); // the finger's speed, a little smoothed
    },
    letGo(coast) { held = false; if (!coast) spinV = 0; },
    // the camera at r across and h up from (0, y, 0), turned by spin (no allocation)
    place(camera, r, h, y, dt) {
      if (home) {
        const d = Math.round(spin / (2 * Math.PI)) * 2 * Math.PI - spin;
        spin += Math.sign(d) * Math.min(Math.abs(d), TURN.back * dt, Math.abs(d) * TURN.ease * dt + 1e-4);
        home = Math.abs(d) > 1e-3;
      }
      if (!held && spinV) { spin += spinV * dt; spinV *= Math.exp(-TURN.coast * dt); if (Math.abs(spinV) < 0.01) spinV = 0; }
      camera.position.set(Math.sin(bearing + spin) * r, y + h, Math.cos(bearing + spin) * r);
    },
  };
}
