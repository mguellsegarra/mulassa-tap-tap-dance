// Runs in the game's page (dev server), from film.mjs: the teaser's clock, cameras and overlay. Nothing here ships.
async (cfg) => {
  const stage = await import('/src/scene/stage.js');
  const { bou } = await import('/src/figures/bou/bou-objects.js');
  const { createClip } = await import('/src/figures/common/clip-camera.js');
  const { BOU_CLIP_SHOTS } = await import('/src/figures/bou/bou-clip.js');
  const { bouPose, newBouPose, BOU_TIMING } = await import('/src/figures/bou/bou-dance.js');
  const { BOU_FX } = await import('/src/figures/bou/bou-correfoc.js');
  const { BOU_HELPERS, BOU_CAPATAS, bouToWorld } = await import('/src/figures/bou/bou-colla.js');
  const { BOU_COLLA_YAW, bouColla } = await import('/src/figures/bou/bou-objects.js');
  // the whole film is the first techno's night (dark plaça, the follow spot, a flash a beat; no carretilles there)
  // cfg.look 'rave': its final's instead (the Mulassa clip's look: LED floor, lasers, haze, the Bou lit as by a spot)
  if (cfg.look === 'rave') { BOU_FX.technoStart = 1e9; BOU_FX.technoEnd = 1e9; BOU_FX.finalStart = -99; BOU_FX.finalEnd = 1e9; if (cfg.co2 != null) BOU_FX.co2 = cfg.co2; }
  else { BOU_FX.technoStart = -99; BOU_FX.technoEnd = 1e9; }
  const STROBE = BOU_FX.strobe.gain; const FLASH = BOU_FX.strobe.on;
  // a shot of one of its colla (`who`: W N S E or C, the capatàs): from the plaça's middle side, az rad round them
  const SPOTS = Object.fromEntries([...BOU_HELPERS, BOU_CAPATAS].map(h => [h.id, bouToWorld(h.x, h.z, BOU_COLLA_YAW)]));
  const placeWho = (cam, s) => { const p = SPOTS[s.who], a = Math.atan2(-p.x, -p.z) + (s.az ?? 0), el = s.el ?? .12, fov = s.fov ?? 28;
    const narrow = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * cam.aspect), d = (s.size ?? 2.2) / 2 / Math.tan(narrow / 2), y = s.y ?? 1.1;
    cam.clearViewOffset(); cam.fov = fov; cam.position.set(p.x + Math.sin(a) * Math.cos(el) * d, y + Math.sin(el) * d, p.z + Math.cos(a) * Math.cos(el) * d); cam.up.set(0, 1, 0); cam.lookAt(p.x, y, p.z); cam.updateProjectionMatrix(); };
  const beats = BOU_TIMING.beats;
  const secAt = b => { const i = Math.min(beats.length - 2, Math.max(0, Math.floor(b))); return beats[i] + (beats[i + 1] - beats[i]) * (b - i); };
  const beatAt = s => { let i = beats.findLastIndex(t => t <= s); i = Math.max(0, Math.min(beats.length - 2, i)); return i + (s - beats[i]) / (beats[i + 1] - beats[i]); };
  const pose = newBouPose();
  const root = (t, out) => { bouPose(t, pose); out.x = pose.x; out.z = pose.z; out.lift = Math.max(0, pose.lift - .25); out.yaw = pose.yaw; return out; };
  // one film per segment: the approved «Mira el ball» shots (bou-clip.js), eased over the segment
  const segs = cfg.segs.map(s => ({ ...s, place: s.who || s.eyes ? null : createClip({ shots: { ...BOU_CLIP_SHOTS, ...cfg.shots }, cuts: [[beatAt(s.song), s.kind, s.fit]], end: beatAt(s.song) + (s.ease ?? s.t1 - s.t0) / cfg.beat, tallKinds: ['wide', 'crane', 'orbit', 'front'], secAt, root, side: Math.PI / 4, clear: 4.8, reach: 12 }).place }));
  const film = window.film = { time: 0, segs };
  const segAt = t => segs.find(s => t < s.t1) ?? segs.at(-1);
  // beat-locked: a film beat is a song beat, whatever the song's tempo there (the strobe and the steps land on the kick)
  film.songTime = () => { const s = segAt(film.time), d = Math.max(0, film.time - s.t0); return s.free ? s.song + d : secAt(beatAt(s.song) + d / cfg.beat); }; // free: the song's own time (off the kick)
  __dbg.chip.now = () => film.songTime(); __dbg.G.watch = true;
  // a shot of its eyes that rides with its head (`eyes`: m across the frame): from further off its nods took an eye out of the frame
  const V3 = stage.camera.position.constructor, eyeAt = new V3(), eyeFrom = new V3();
  const placeEyes = (cam, s) => { const fov = 24, narrow = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * cam.aspect), d = s.eyes / 2 / Math.tan(narrow / 2), h = bou.head;
    h.updateWorldMatrix(true, false); eyeAt.set(0, s.ey ?? .12, .3).applyMatrix4(h.matrixWorld); eyeFrom.set(s.ex ?? .2, (s.ey ?? .12) + .12, .3 + d).applyMatrix4(h.matrixWorld);
    cam.clearViewOffset(); cam.fov = fov; cam.position.copy(eyeFrom); cam.up.set(0, 1, 0); cam.lookAt(eyeAt); cam.updateProjectionMatrix(); };
  const c = stage.camera, old = stage.renderer.render.bind(stage.renderer);
  stage.renderer.render = (scene, cam) => {
    // noColla: its attendants hidden (one of them stood in the corner of the last shot)
    // lit: the flash held, at that gain (its colla stands outside the spot: in the dark but for the flash)
    if (cam === c) { const s = segAt(film.time); bouColla.helpers.visible = !s.noColla; BOU_FX.strobe.gain = s.noStrobe ? 0 : s.lit || STROBE; BOU_FX.strobe.on = s.lit ? 9 : FLASH; if (s.who) placeWho(c, s); else if (s.eyes) placeEyes(c, s); else s.place(c, beatAt(film.songTime()), bou.frame.rotation.y, Infinity); }
    return old(scene, cam);
  };
  // only the canvas and the overlay are seen
  const keep = new Set(); for (let e = stage.renderer.domElement; e; e = e.parentElement) keep.add(e);
  const st = document.createElement('style');
  st.textContent = `.film-hide{visibility:hidden!important}
  #film{position:fixed;inset:0;z-index:2147483647;pointer-events:none;container-type:size}
  #film>*{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0}
  #film .card>div{opacity:0}
  #film .black{background:#05040a;opacity:1}
  #film .bloom{backdrop-filter:blur(22px) brightness(1.35) saturate(1.5);mix-blend-mode:screen}
  #film .warm{background:radial-gradient(ellipse at 50% 45%,rgba(255,170,80,.30),rgba(255,120,40,.12) 70%);mix-blend-mode:soft-light}
  #film .vig{background:radial-gradient(ellipse at 50% 46%,transparent 45%,rgba(5,4,10,.55) 100%),linear-gradient(180deg,rgba(5,4,10,.35),transparent 22%,transparent 72%,rgba(5,4,10,.6))}
  #film .iris{background:radial-gradient(ellipse 75% 30% at 50% 43%,transparent 45%,rgba(5,4,10,.95) 100%)}
  #film .card img{display:block;height:auto} #film .card .el{width:18cqw} #film .card .bou{width:50cqw} #film .card .trad{width:88cqw} #film .card .de{width:15cqw;margin-top:3cqw;filter:invert(1)} #film .card .city{width:80cqw;margin-top:1cqw}
  #film .card>div{display:flex;flex-direction:column;align-items:center}
  @font-face{font-family:Film;src:url(/fonts/baloo-2-latin.woff2) format("woff2");font-weight:400 800}
  #film .card .now{font:800 9cqw Film;color:#ffd23f;margin-top:8cqw;letter-spacing:.01em}`;
  document.head.append(st);
  for (const e of document.querySelectorAll('body *')) if (!keep.has(e) && !e.contains(stage.renderer.domElement)) e.classList.add('film-hide');
  const L = '/tools/social/instagram/campaigns/bou-teaser/assets/';
  // cfg.grade (the owner: the light read dull and cold): the picture warmer and crisper, its lights blooming
  const G = { 1: { glow: 1.5, spot: '#ffb866', canvas: 'contrast(1.1) saturate(1.25)', warm: .5, bloom: .3 }, 1.5: { glow: 1.7, spot: '#ffaf58', canvas: 'contrast(1.13) saturate(1.32)', warm: .65, bloom: .4 }, 2: { glow: 1.9, spot: '#ffa64a', canvas: 'contrast(1.16) saturate(1.4)', warm: .8, bloom: .5 } }[cfg.grade]; // (the owner chose 1.5)
  if (G) { BOU_FX.strobe.glow = G.glow; BOU_FX.strobe.spot = G.spot; stage.renderer.domElement.style.filter = G.canvas; }
  const el = document.createElement('div'); el.id = 'film';
  el.innerHTML = `<div class="bloom"></div><div class="warm"></div><div class="vig"></div><div class="iris"></div><div class="black"></div>
  <div class="card"><div><img class="el" src="${L}el.svg"><img class="bou" src="${L}bou.svg"></div><div><img class="trad" src="${L}tradicional.svg"></div>
  <div><img class="de" src="${L}de.svg"><img class="city" src="${L}valls.svg"></div><div class="now">Ja disponible</div></div>`;
  document.body.append(el); await Promise.all([...el.querySelectorAll('img')].map(i => i.decode())); await document.fonts.load('800 40px Film');
  const [bloom, warm, vig, iris, black, card] = el.children; bloom.style.opacity = G?.bloom ?? 0; warm.style.opacity = G?.warm ?? 0;
  const sm = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
  const win = (t, a, b, i, o) => sm((t - a) / i) * sm((b - t) / o); // up over i s from a, down over o s to b
  // a shot's light: `pulse` s of glimpses first, one on each beat (the muffled kick), then held (the kick in the open)
  const light = (s, t) => {
    if (t < s.t0 || t >= s.t1) return 0;
    const p = s.pulse ?? 0, ph = (t - s.t0) % cfg.beat;
    return t < s.t0 + p ? Math.min(1, ph / .03) * Math.exp(-ph / .17) : win(t, s.t0 + p, s.t1, s.in ?? .4, s.out ?? .5);
  };
  film.paint = () => {
    const t = film.time; let show = 0;
    for (const s of segs) show = Math.max(show, light(s, t));
    // (a seg's `iris`: all dark but its eyes, opening as its BRAMA comes)
    { const s = segAt(t); iris.style.opacity = cfg.raw || !s.iris || t < s.t0 ? 0 : 1 - .75 * sm((t - s.brama) / .3); }
    black.style.opacity = cfg.raw ? 0 : 1 - show; vig.style.opacity = cfg.raw ? 0 : 1;
    card.style.opacity = t < cfg.card.t0 ? 0 : sm((cfg.card.t1 - t) / .6);
    // each line lands on its own kick: in at once, a little large, settling
    [...card.children].forEach((e, i) => { const u = t - cfg.card.t0 - i * cfg.beat; e.style.opacity = u < 0 ? 0 : Math.min(1, u / .04); e.style.transform = `scale(${1 + .14 * Math.exp(-Math.max(0, u) / .09)})`; });
  };
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const { bouBrama } = await import('/src/figures/bou/bou-stage.js');
  // (the game playing by itself brays on its chart's own both-hands notes: only the film's own BRAMA is wanted)
  (await import('/src/figures/bou/bou-scene.js')).BOU_SCENE.onBoth = () => {};
  // (a seg's `brama`: the film second its BRAMA starts, the mouth wide and the whole tongue out)
  film.set = t => { for (const s of segs) if (s.brama != null && film.time < s.brama && t >= s.brama) bouBrama(); film.time = t; film.paint(); };
  return { ok: true, px: [stage.renderer.domElement.width, stage.renderer.domElement.height], figure: __dbg.G.figureId };
}
