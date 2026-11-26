// The end's free look: a drag turns the camera round the finished campanar, never up or down; let go, it coasts to a
// stop. scene.js places its camera through it every frame; with nothing dragged it is the plain end camera.
const TURN = { yaw: 0.006, coast: 3 }; // rad per px, inertia's decay /s

// bearing: the camera's own bearing round the tower (rad)
export function createTowerTurn(bearing) {
  let spin = 0, spinV = 0, held = false; // bearing added, its coasting speed, a finger down
  return {
    get spin() { return spin; }, // the turn so far (rad): the sky's round pans by it (sky.js skyPan)
    reset() { spin = spinV = 0; held = false; },
    drag(dx, dy, dt) {
      held = true;
      spin -= dx * TURN.yaw;
      if (dt > 0) spinV = spinV * 0.5 + 0.5 * (-dx * TURN.yaw / dt); // the finger's speed, a little smoothed
    },
    letGo(coast) { held = false; if (!coast) spinV = 0; },
    // the camera at r across and h up from (0, y, 0), turned by spin (no allocation)
    place(camera, r, h, y, dt) {
      if (!held && spinV) { spin += spinV * dt; spinV *= Math.exp(-TURN.coast * dt); if (Math.abs(spinV) < 0.01) spinV = 0; }
      camera.position.set(Math.sin(bearing + spin) * r, y + h, Math.cos(bearing + spin) * r);
    },
  };
}
