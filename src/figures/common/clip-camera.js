// A figure's music video on the plaça: «Mira el ball» (and the idle selector) filmed by the figure's own cameras, free of
// the showreel's (each figure's filmShot, scene/figure-scenes.js). Made for the Bou (figures/bou/bou-clip.js, its rounds with
// the owner in the comments below), then the Drac (figures/drac/drac-clip.js). A shot: az (rad; `rel`: round the heading it
// had when the shot began, else from the film's `side`), el (rad above the floor), size (m of world across the frame's
// narrow side), y (m looked at), fov, each [from, to] over the shot.
// The lens aims at where the figure is on average over CLIP_LAG s, at a fixed height: it follows its path, never its bounce,
// waddle or see-saw (a lens that bobbed with it on every beat was unwatchable). Hard cuts on a bar's downbeat where a move
// starts or ends, never into a shot that looks like the last one (far, middle and close take turns).
// `fixed`: the camera stays where its cut put it and pans (it grows as it charges); `still`: it looks at the plaça's middle
// and does not move at all (the laps cross the frame); `ahead`: m in front of its middle (its head); `portrait`: what changes
// on a frame taller than wide; `lag`: s either side its middle is averaged over (default CLIP_LAG); `tallY`: m higher it looks
// on a phone taller than 9:16 (all of it from 9:20), which sets the figure lower in the frame, over less bare floor.
const clipLerp = (v, u) => v[0] + (v[1] - v[0]) * u, clipEase = u => u * u * (3 - 2 * u);
// s either side its middle is averaged over: a camera that kept up with its rushes slid the plaça across a phone at half a
// screen a second (dizzying). At CLIP_LAG a rush out and back hardly moves the lens: it runs inside the frame. A close-up
// (`lag` .6) keeps to it, and is only cut where it stands
const CLIP_LAG = 2;
// a still shot creeps in by this share of its distance over its length: on a phone its lens stands at the ring's limit at
// its widest (75°) whatever its size, so the opening's 'vast' did not move at all and read as a hang (the owner). The
// film's first shot also starts that much further out and comes in over CLIP_PRE s of the clock: the song's beat stays at
// 0 until its music is heard (main.js), ~3 s on a phone, and the picture stood still meanwhile
const CLIP_PUSH = .12, CLIP_PRE = 5;
// the shots that go with it are tighter on a portrait frame (CLIP_TALL_SIZE of their size): sized for a wide frame they
// asked a phone's lens to stand further back than the plaça lets it, so it opened instead and the bottom third of the
// picture was the backs of the crowd it stood behind
const CLIP_TALL_SIZE = .78;
// The idle selector's film (behind the faded menu): only the open, slow shots, each held CLIP_IDLE_MIN beats at least, and on
// a phone a lens no wider than CLIP_IDLE_FOV. The film's own cut every 8 beats, from its face to the whole plaça and a 75°
// lens that bent the façades, read there as jolts (the owner, an iPhone 18 Pro)
const CLIP_CALM = ['vast', 'wide', 'crane', 'orbit', 'balcony'];
const CLIP_IDLE_MIN = 16, CLIP_IDLE_FOV = 55;
// a lens's widest (vertical, degrees) as it opens on a 9:16 phone, kept as wide across on a taller one (393×852, 430×932):
// held at the same vertical there, the laps ran out of the narrower frame
const clipCap = (deg, aspect) => (aspect < 9 / 16 ? 2 * Math.atan(Math.tan(deg * Math.PI / 360) * 9 / 16 / aspect) * 180 / Math.PI : deg);

// film: { shots, cuts ([beat, kind, fit?]; fit: { tall, wide } times the shot's size, and its widest lens, on a portrait /
// landscape frame), end (beat), tallKinds (shots tighter on a portrait frame), secAt(beat) (song s), root(t, out) (fills
// out.x, z: its middle in the dance frame, m from the plaça's middle before the frame's turn; lift: m its carriers lift it,
// bounce left out; yaw: its heading in the frame, rad), side (rad from the frame's heading to the play camera's side),
// clear (m from the plaça's middle a low lens stays inside), reach (m: inside the façades) }
export function createClip(film) {
  const { shots, cuts, end, secAt, root, side, clear, reach } = film;
  const tall = Object.fromEntries(Object.entries(shots).map(([k, d]) => [k, { ...d, ...(film.tallKinds?.includes(k) && { size: d.size.map(v => v * CLIP_TALL_SIZE) }), ...d.portrait }]));
  const idleCuts = cuts.filter(c => CLIP_CALM.includes(c[1]))
    .reduce((out, c) => (out.length && (c[0] - out.at(-1)[0] < CLIP_IDLE_MIN || c[1] === out.at(-1)[1]) ? out : [...out, c]), []);
  const pose = { x: 0, z: 0, lift: 0, yaw: 0 }, aim = { x: 0, z: 0, lift: 0 }, nowAt = { x: 0, z: 0, lift: 0 }, fromAt = { x: 0, z: 0, lift: 0 }, MIDDLE = Object.freeze({ x: 0, z: 0, lift: 0 });
  // its middle on average over `lag` s either side song second t, in its dance frame
  function path(t, lag) {
    aim.x = aim.z = aim.lift = 0;
    for (let k = -4; k <= 4; k++) { root(Math.max(0, t + k * lag / 4), pose); aim.x += pose.x / 9; aim.z += pose.z / 9; aim.lift += pose.lift / 9; }
    return aim;
  }
  function world(time, o, c, s, hx, hz, lag) { const p = path(time, lag); o.x = p.x * c + p.z * s + hx; o.z = -p.x * s + p.z * c + hz; o.lift = p.lift; return o; }
  // Places `camera` (the game's own) for song beat `beat`. frameYaw: the dance frame's turn on the plaça; filmed: s since
  // the film began (Infinity: no opening creep, the idle selector); idle: the idle selector's calm cut. Returns the cut's index.
  function place(camera, beat, frameYaw, filmed = Infinity, idle = false) {
    const list = idle ? idleCuts : cuts, i = Math.max(0, list.findLastIndex(c => c[0] <= beat)), [b0, kind] = list[i], b1 = list[i + 1]?.[0] ?? end, d = (camera.aspect < 1 ? tall : shots)[kind];
    const u = clipEase(Math.min(1, Math.max(0, (beat - b0) / (b1 - b0)))), t = secAt(beat), t0 = secAt(b0);
    // a shot of its head takes the heading it has half way through: cut in while it was still turning, the heading at the
    // cut aimed a metre beside its face
    const heading = d.rel ? root(d.ahead ? secAt((b0 + b1) / 2) : t0, pose).yaw + frameYaw : frameYaw + side;
    // its averaged middle on the plaça (the dance frame turned, `ahead` m in front of it), into `o`: no garbage per frame
    const c = Math.cos(frameYaw), s = Math.sin(frameYaw), hx = (d.ahead ?? 0) * Math.sin(heading), hz = (d.ahead ?? 0) * Math.cos(heading);
    const fit = list[i][2]?.[camera.aspect < 1 ? 'tall' : 'wide'] ?? 1, el = clipLerp(d.el, u), size = clipLerp(d.size, u) * fit, az = heading + clipLerp(d.az, d.fixed ? 0 : u);
    const now = d.still ? MIDDLE : world(t, nowAt, c, s, hx, hz, d.lag ?? CLIP_LAG), from = d.fixed ? world(t0, fromAt, c, s, hx, hz, d.lag ?? CLIP_LAG) : now;
    const aspect = camera.aspect, vfov = d.fov * Math.PI / 180, narrow = aspect < 1 ? 2 * Math.atan(Math.tan(vfov / 2) * aspect) : vfov;
    let dist = size / 2 / Math.tan(narrow / 2), fov = d.fov;
    // a low lens stays inside the crowd's ring (the public is the background, never a blur across the frame), a high one
    // inside the façades; where that stops it short, the lens opens instead
    const ux = Math.sin(az), uz = Math.cos(az), pb = from.x * ux + from.z * uz, r2 = from.x * from.x + from.z * from.z;
    const inRing = r2 > clear * clear ? reach : Math.max(3.5, -pb + Math.sqrt(pb * pb - (r2 - clear * clear))), high = clipEase(Math.min(1, Math.max(0, (el - .25) / .12))); // (from ~0.37 rad the lens looks over the heads: it may stand behind them)
    const far = (inRing + (reach - inRing) * high) / Math.max(.2, Math.cos(el));
    if (dist > far) { dist = far; const n = 2 * Math.atan(size / 2 / dist); fov = Math.min(idle && aspect < 1 ? CLIP_IDLE_FOV : clipCap(d.still && aspect < 1 ? 75 : Math.min(75, (d.fov + 10) * fit), aspect), (aspect < 1 ? 2 * Math.atan(Math.tan(n / 2) / aspect) : n) * 180 / Math.PI); } // (never a wide lens: rather a tighter frame; but a still shot on a phone opens as far as the laps ask, or they ran out of its narrow frame)
    if (d.still) dist *= 1 - CLIP_PUSH * u;
    if (!i) dist *= 1 + CLIP_PUSH * (1 - clipEase(Math.min(1, filmed / CLIP_PRE)));
    const base = d.y + (d.tallY ?? 0) * Math.min(1, Math.max(0, (9 / 16 - aspect) / (9 / 16 - .45))), y = base + now.lift; // (tallY: eased in from 9:16 to 9:20, no step between two phones)
    camera.clearViewOffset(); camera.fov = fov;
    camera.position.set(from.x + ux * Math.cos(el) * dist, Math.max(.25, base + Math.sin(el) * dist), from.z + uz * Math.cos(el) * dist);
    camera.up.set(0, 1, 0); camera.lookAt(now.x, y, now.z); camera.updateProjectionMatrix();
    return i;
  }
  return { idleCuts, place, cutAt: b => cuts.findLastIndex(c => c[0] <= b) };
}
