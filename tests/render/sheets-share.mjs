// Classificacions, Comparteix, the share photo and its capture, restores and the ànim: contracts on the shared running
// game (game-context.mjs; render-quality.mjs runs the files in order).
import assert from 'node:assert/strict';
import { profileAt } from '../../src/platform/render-quality.js';
import { THREE, stars, practice, energy, dance, shareLogic, errors, nodes, keyHandlers, drawnText, document, context, run } from './game-context.mjs';
const settingsSheet = nodes.get('settings-menu');
// Classificacions: Configuració → the sheet (closing it goes back); an open board sheet swallows the title and results
// keys (typing an alias never plays or leaves); its results row appears with TOCA PER TORNAR and the card makes room.
const boardSheet = context.boardSheet;
run(`G.state = 'select'; G.sel = 2;`);
nodes.get('settings').listeners.click();
settingsSheet.close();
// the menu music's speaker (#music): title only; a click switches the loop, remembers it and says what the next click does
{
  const stored = [], btn = nodes.get('music');
  context.localStorage.setItem = (k, v) => stored.push([k, v]);
  run(`G.state = 'select'; updateControls();`);
  assert.equal(btn.hidden, false, 'the speaker shows on the title');
  assert.equal(btn.dataset.state, 'on');
  context.navigator.connection = { effectiveType: '3g', saveData: true };
  run(`updateControls();`);
  assert.equal(btn.hidden, false, 'a slow or Save-Data connection keeps the speaker on the title');
  delete context.navigator.connection;
  btn.listeners.click();
  assert.equal(btn.dataset.state, 'off'); assert.equal(btn.title, 'Activa el so del menú');
  assert.deepEqual(stored.at(-1), ['menu-music', 'off'], 'remembered on this device');
  assert(run('menuMusic === false'));
  if (run('engine != null')) assert.deepEqual(context.menuMusicCalls.at(-1), false, 'the engine fades the loop out');
  btn.listeners.click();
  assert.equal(btn.dataset.state, 'on'); assert.deepEqual(stored.at(-1), ['menu-music', 'on']);
  context.localStorage.setItem = () => {};
  run(`G.state = 'results'; updateControls();`);
  assert.equal(btn.hidden, true, 'title only');
}
// Bústia remains available from Configuració; typing never starts a run.
{
  const fb = context.feedbackSheet;
  run(`G.state = 'select'; updateControls();`);
  assert.equal(fb.opts.captcha, boardSheet.captcha, 'one shared Turnstile');
  nodes.get('settings').listeners.click();
  nodes.get('settings-feedback').listeners.click();
  assert.equal(fb.shown, 1);
  for (const code of ['Space', 'Enter', 'ArrowRight', 'KeyD']) keyHandlers.forEach(h => h({ code, target: { tagName: 'TEXTAREA' }, preventDefault() { throw new Error('typing stays in the form'); } }));
  assert(run("G.state === 'select' && G.sel === 2"));
  fb.open = false; fb.back?.(); settingsSheet.close();
}
run(`G.state = 'select'; updateControls();`);
boardSheet.open = true;
for (const code of ['Space', 'Enter', 'ArrowRight', 'KeyD', 'BracketLeft']) keyHandlers.forEach(h => h({ code, target: { tagName: 'DIALOG' }, preventDefault() {} }));
assert(run("G.state === 'select' && G.sel === 2 && offsetMs === -20"), 'selector keys do nothing behind Classificacions');
run(`G.state = 'results'; G.resT = clock - 5;`);
keyHandlers.forEach(h => h({ code: 'Space', target: { tagName: 'DIALOG' }, preventDefault() {} }));
assert.equal(run('G.state'), 'results', 'Space on the publish sheet does not leave the results');
boardSheet.open = false;
boardSheet.shown.length = 0;
run('G.resT = clock - 0.5; updateControls(); G.resT = clock - 1.5; updateControls(); G.state = "select"; updateControls();');
assert.deepEqual(boardSheet.shown, [false, true, false], 'the results row waits for TOCA PER TORNAR and goes with the results');
drawnText.length = 0;
run(`G.state = 'results'; G.reason = 'clear'; G.resT = clock - 2; G.counts = { perfect: 100, good: 0, miss: 0 }; drawHud(0); G.state = 'select';`);
assert(drawnText.includes('ESPAI PER TORNAR'), 'the results still offer to go back');
// the publish prompt opens by itself only over a bare, visible, upright results screen (board-ui.js asks canPrompt)
run(`G.state = 'results';`);
assert(boardSheet.opts.canPrompt(), 'results, nothing else up: the prompt may open');
boardSheet.open = true; assert(!boardSheet.opts.canPrompt(), 'not over another sheet'); boardSheet.open = false;
nodes.get('share-menu').open = true; assert(!boardSheet.opts.canPrompt(), 'not over Comparteix'); nodes.get('share-menu').open = false;
document.hidden = true; assert(!boardSheet.opts.canPrompt(), 'not on a hidden page'); document.hidden = false;
run(`G.state = 'select';`);
assert(!boardSheet.opts.canPrompt(), 'only on the results');
// Turnstile (src/services/captcha.js via board-ui.js): never started ahead (only Publica / Bústia ask for a token); its tick box never mid-song
boardSheet.verifyStarts = 0;
run(`var savedChip = chip, savedState = G.state; drawn = false; G.state = 'splash'; frame(clock * 1000 + 16); frame(clock * 1000 + 32); G.state = 'select'; frame(clock * 1000 + 48);`);
run(`chip = { resume() {}, stop() {}, menu() {}, sfx() {}, ctx: { resume() {} } }; G.state = 'select'; toTitle();`);
run(`G.state = 'play'; G.counts = { perfect: 10, good: 0, miss: 0 }; finish('end');`);
assert.equal(run('G.state'), 'results');
run(`G.state = 'play'; G.diff = 2; G.counts = { perfect: 200, good: 40, miss: 0 };
  G.previous = { quality: quality({ perfect: 265, good: 53, miss: 0 }), score: 182972 };
  G.score = 139572; finish('end');`);
assert.equal(run('G.newRecord'), false, 'equal quality with fewer points cannot announce a record');
run(`G.state = 'play'; G.score = 183000; finish('end');`);
assert.equal(run('G.newRecord'), true, 'equal quality with more points earns a record');
run(`G.state = 'play'; G.counts = { perfect: 240, good: 0, miss: 0 }; G.score = 139572; finish('end');`);
assert.equal(run('G.newRecord'), false, 'a higher % with fewer points is no record');
run(`G.state = 'play'; G.counts = { perfect: 150, good: 50, miss: 40 }; G.score = 190000; finish('end');`);
assert.equal(run('G.newRecord'), true, 'more points with a lower % is a record (as on the board)');
run(`G.state = 'play'; toTitle();`);
assert.equal(boardSheet.verifyStarts, 0, 'a finished or left run asks Cloudflare nothing');
run('chip = savedChip; G.state = savedState;');
run(`G.state = 'play';`); assert(!boardSheet.opts.canVerify(), 'no tick box during a song or the practice');
run(`G.state = 'results';`); assert(boardSheet.opts.canVerify(), 'on the results it may show');
run(`G.state = 'select';`); assert(boardSheet.opts.canVerify(), 'on the title too');
// after a publication Comparteix comes next (board-ui.js afterPublish → share-ui.js openAfterPublish)
assert.equal(typeof boardSheet.opts.afterPublish, 'function', 'publishing hands over to Comparteix');
// ⚙ Configuració: its «Sobrenom» row is refreshed on every opening
const refreshed = boardSheet.settingsRefreshed;
nodes.get('settings').listeners.click();
assert.equal(boardSheet.settingsRefreshed, refreshed + 1, 'opening Configuració refreshes the nickname row');
settingsSheet.close();
console.log('classificacions integration contracts ok');

// Comparteix: the results row shows (even offline) with TOCA PER TORNAR; the nudge only for something to show off;
// the sheet opens from its button, swallows the game keys while open and closes; the card makes room for the row.
{
  const row = nodes.get('results-actions'), menu = nodes.get('share-menu');
  run(`G.state = 'results'; G.resT = clock - 0.5; G.reason = 'clear'; G.stars = 3; G.newRecord = true; G.challenge = null;
    G.shareRun = { pct: 96, score: 190000, diff: 2, reason: 'clear', stars: 3, newRecord: true, maxCombo: 80, t: G.resT, practice: false }; updateControls();`);
  assert(row.hidden !== false, 'no row during the first second (TOCA PER TORNAR waits too)');
  run('G.resT = clock - 2; G.shareRun.t = G.resT; updateControls();');
  assert(row.hidden === false && nodes.get('results-share-tag').hidden === false, 'the row with Comparteix, and «Presumeix-ne!» for a record / S');
  nodes.get('results-share').listeners.click();
  assert(menu.open && context.shareSheet.open && nodes.get('results-share-tag').hidden, 'Comparteix opens the sheet; the nudge has done its job');
  for (const code of ['Space', 'Enter', 'ArrowLeft', 'BracketRight']) keyHandlers.forEach(h => h({ code, target: { tagName: 'DIALOG' }, preventDefault() {} }));
  assert(run("G.state === 'results' && offsetMs === -20"), 'game keys do nothing behind Comparteix');
  nodes.get('share-close').listeners.click();
  assert(!menu.open, 'Tanca closes it');
  // after a publication (board-ui.js afterPublish) Comparteix opens by itself for that run: «Publicat!», then the place
  boardSheet.opts.afterPublish({ place: Promise.resolve('Ets el número 7 · top 40%!') });
  assert(menu.open && nodes.get('share-note').hidden === false && nodes.get('share-note').textContent === 'Publicat! Ja surts a la classificació.', 'published: Comparteix opens by itself');
  await Promise.resolve(); await Promise.resolve();
  assert.equal(nodes.get('share-note').textContent, 'Ets el número 7 · top 40%!', '…its header then says where they stand');
  nodes.get('share-close').listeners.click(); menu.listeners.close(); // (the mock's close() fires no event)
  assert(!menu.open && nodes.get('share-note').hidden, 'Tanca closes it as usual; the line goes with it');
  context.shareSheet.openAfterPublish({});
  assert(menu.open && nodes.get('share-note').textContent === 'Publicat! Ja surts a la classificació.', 'without a place: just «Publicat!»');
  nodes.get('share-close').listeners.click();
  keyHandlers.forEach(h => h({ code: 'Space', target: { tagName: 'BODY' }, preventDefault() {} }));
  assert.equal(run('G.state'), 'select', 'closed: Space leaves the results again');
  run('updateControls();');
  assert(row.hidden === true, 'the row goes with the results');
  run(`G.state = 'results'; G.resT = clock - 2; G.stars = 1; G.newRecord = false;
    G.shareRun = { score: 100000, pct: 55, diff: 1, reason: 'fail', stars: 1, newRecord: false, maxCombo: 9, t: G.resT, practice: false }; updateControls();`);
  assert(row.hidden === false && nodes.get('results-share-tag').hidden === true, 'no nudge for an ordinary run');
  drawnText.length = 0;
  run(`G.challenge = challengeResult({ pct: 50, diff: 1 }, G.shareRun); G.counts = { perfect: 40, good: 20, miss: 30 }; drawHud(0);`);
  assert(drawnText.includes('REPTE SUPERAT!') && drawnText.includes(shareLogic.SITE_LABEL), 'the card says the challenge is beaten and where to play');
  drawnText.length = 0;
  run(`G.challenge = challengeResult({ pct: 58, diff: 1 }, G.shareRun); drawHud(0);`);
  assert(drawnText.includes('Gairebé! Et falta un 4%'), 'or how close it was');
  assert.equal(run('resultsReserve()'), 48, 'one row of buttons: 48 px');
  // the row sits right under the card (drawResults writes its top), not pinned to the bottom edge
  const rowTop = parseFloat(row.style.top);
  assert(row.style.bottom === 'auto' && rowTop > 0 && rowTop + 48 < run('HH * K') - 60, `the row under the card, with the tip and the return button below it (top ${rowTop})`);
  // a collapse: nothing to share; «Torna-ho a provar» (the same level) and Classificacions stay
  run(`G.reason = 'collapse'; G.stars = 0; G.diff = 2; G.resT = clock - 2;
    G.shareRun = { score: 100000, pct: 20, diff: 2, reason: 'collapse', stars: 0, newRecord: false, maxCombo: 3, t: G.resT, practice: false }; updateControls();`);
  assert(row.hidden === false && nodes.get('results-share').hidden === true && nodes.get('results-retry').hidden === false, 'collapse: no Comparteix, Torna-ho a provar instead');
  context.shareSheet.openAfterPublish({});
  assert(!menu.open, 'collapse: the share sheet never opens');
  nodes.get('results-retry').listeners.click();
  assert(run("G.state === 'play' && G.diff === 2 && !G.practice"), 'Torna-ho a provar: the same level again');
  run(`G.state = 'results'; G.reason = 'clear'; G.resT = clock - 2;
    G.shareRun = { score: 100000, pct: 90, diff: 2, reason: 'clear', stars: 3, newRecord: false, maxCombo: 50, t: G.resT, practice: false }; updateControls();`);
  assert(nodes.get('results-share').hidden === false && nodes.get('results-retry').hidden === false, 'a finished dance offers both Comparteix and another run');
  for (const figure of ['mulassa-valls', 'drac-valls']) for (const reason of ['clear', 'fail', 'collapse']) for (const diff of [0, 1, 2]) {
    run(`G.state = 'results'; setSelectedFigure('${figure}'); G.reason = '${reason}'; G.diff = ${diff}; G.resT = clock - 0.5; updateControls();`);
    assert(nodes.get('results-retry').hidden, 'the last notes cannot accidentally restart the run');
    nodes.get('results-retry').listeners.click();
    assert.equal(run('G.state'), 'results', 'retry ignores a click before results settle');
    run('G.resT = clock - 2; updateControls();');
    assert(!nodes.get('results-retry').hidden, `${figure}/${reason}/${diff}: retry is visible`);
    nodes.get('results-retry').listeners.click();
    assert(run(`G.state === 'play' && G.figureId === '${figure}' && G.diff === ${diff} && !G.practice && G.score === 0 && G.energy === 1`), `${figure}/${reason}/${diff}: restart the same figure and level with a fresh run`);
  }
  run(`G.challenge = null; G.state = 'select'; setSelectedFigure('mulassa-valls'); updateControls();`);
}
// Comparteix asks for the place on the board of the figure that was played (sheets-setup.js composes share and board), and a
// publication refreshes the cached name (the check) before the card is drawn again
{
  const menu = nodes.get('share-menu'), kept = context.localStorage, mem = new Map();
  context.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  run(`store.set(ALIAS_KEY, 'Prova'); G.state = 'results'; setSelectedFigure('drac-valls'); G.reason = 'clear'; G.resT = clock - 2; G.stars = 1;
    G.shareRun = { figureId: 'drac-valls', score: 100000, pct: 90, diff: 1, reason: 'clear', stars: 1, newRecord: false, maxCombo: 50, t: G.resT, practice: false }; updateControls();`);
  boardSheet.standings.length = 0;
  nodes.get('results-share').listeners.click(); await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(boardSheet.standings, ['drac-valls'], 'the Drac\'s share image asks for the Drac\'s board, not the Mulassa\'s');
  const asked = (context.identityAsked || []).length;
  boardSheet.opts.afterPublish({}); await Promise.resolve();
  assert.equal(context.identityAsked.length, asked + 1, 'a publication re-reads the profile for the card');
  nodes.get('share-close').listeners.click(); menu.listeners.close();
  context.localStorage = kept;
  run(`G.state = 'select'; setSelectedFigure('mulassa-valls'); updateControls();`);
}
console.log('comparteix integration contracts ok');

// The share photo (renderHero): at every quality tier it renders at the card's size, with her standing in view and the
// crowd around her, never a silent null (a ReferenceError inside it once gave every card an empty sky and ground).
{
  const { PHOTO } = await import('../../src/hud/share-card.js');
  const made = document.createElement;
  document.createElement = tag => tag === 'canvas' ? { getContext: () => ({ putImageData() {} }) } : made(tag);
  context.ImageData = class { constructor(d, w, h) { Object.assign(this, { d, w, h }); } };
  run(`var heroShots = [], heroFlat = 0; Object.assign(renderer, { extensions: { has: () => true }, target: null,
    getRenderTarget() { return this.target; }, setRenderTarget(t) { this.target = t; },
    readRenderTargetPixels(t, x, y, w, h, px) { for (let i = 0; i < px.length; i++) px[i] = heroFlat ? 90 : (i * 37) & 255; heroFlat && heroFlat--; },
    render(sc, cam) {
      if (cam !== heroCam) return;
      sc.updateMatrixWorld(true); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
      let shown = true; for (let o = mula.root; o; o = o.parent) shown &&= o.visible;
      const box = new THREE.Box3().setFromObject(mula.root), size = box.getSize(new THREE.Vector3());
      const a = box.min.clone().project(cam), b = box.max.clone().project(cam), c = box.getCenter(new THREE.Vector3()).project(cam);
      const people = crowd.filter(p => p.g.scale.x > 0 && frustum.containsPoint(p.g.getWorldPosition(new THREE.Vector3()))).length;
      heroShots.push({ w: this.target?.width, h: this.target?.height, shown, legs: mulaCarriers.group.visible, tall: size.y,
        inView: frustum.containsPoint(box.getCenter(new THREE.Vector3())) && Math.abs(c.x) < 0.6 && Math.abs(c.y) < 0.6,
        height: Math.abs(a.y - b.y) / 2, people });
    } });`);
  for (const level of [-1, 0, 1, 2]) for (const format of ['story', 'feed', 'og']) {
    const [w, h] = PHOTO[format];
    run(`qualityLevel = ${level}; applyRenderQuality(); G.state = 'results'; G.reason = 'clear'; heroShots.length = 0;`);
    const before = run('mula.root.position.toArray().join() + mula.root.quaternion.toArray().join()');
    const img = run(`renderHero(${w}, ${h})`), [s] = run('heroShots');
    const at = `${format} at ${profileAt(level).name}`;
    assert(img && img.width === w && img.height === h, `${at}: a photo comes back at the card's size`);
    assert(s && s.w === w && s.h === h && w * h >= 400 * 300, `${at}: drawn into a ${w}×${h} target (got ${s?.w}×${s?.h})`);
    assert(s.shown && s.legs && s.tall > 1.5, `${at}: the mulassa is visible, standing, full size`);
    assert(s.inView && s.height > 0.3, `${at}: she is in the middle of the photo and big (${s.height.toFixed(2)} of its height)`);
    assert(s.people >= (format === 'og' ? 4 : 3), `${at}: the crowd stands around her (${s.people} in view)`);
    assert.equal(run('mula.root.position.toArray().join() + mula.root.quaternion.toArray().join()'), before, `${at}: her pose is put back`);
  }
  // A capture immediately after switching figures must not inherit a hidden
  // material or wandering parent. Every state change is restored afterward.
  run(`var oldHeroRender = renderer.render, dracHeroSeen = false;
    drac.root.parent.position.set(12, 0, -12); drac.root.parent.rotation.y = 1.7;
    dracMat.opacity = 0; drac.root.visible = false; confetti.visible = true; fireworks.visible = true;
    var photoState = () => JSON.stringify([drac.root.parent.position.toArray(), drac.root.parent.quaternion.toArray(),
      drac.root.parent.scale.toArray(), dracMat.opacity, drac.root.visible, confetti.visible, fireworks.visible]);
    renderer.render = (sc, cam) => { if (cam === heroCam) {
      dracHeroSeen = drac.root.visible && !mula.root.visible && dracMat.opacity === 1
        && drac.root.parent.position.distanceTo(placeDance(new THREE.Object3D(), DRAC_YAW).position) < 1e-9 && !confetti.visible && !fireworks.visible; // back in its dance frame (drac-layout.js), where it settled
    } };`);
  const dracBefore = run('photoState()');
  assert(run("renderHero(1104, 988, 'drac-valls')") && run('dracHeroSeen'), 'Drac capture sets a visible pose and excludes effects');
  assert.equal(run('photoState()'), dracBefore, 'capture restores parent transform, opacity, figure and effects');
  run('renderer.render = oldHeroRender; dracMat.opacity = 1;');
  run('heroFlat = 1; heroShots.length = 0;'); // the float target drew nothing: the same photo again in 8 bits
  assert(run('renderHero(960, 620)') && run('heroShots.length') === 2, 'a flat float render is retried in 8 bits');
  const warn = console.warn; console.warn = () => {};
  const seen = { reports: [], crumbs: [] };
  const originalReport = errors.report, originalBreadcrumb = errors.breadcrumb;
  try {
    errors.report = (k, d) => seen.reports.push([k, d]); errors.breadcrumb = (k, d) => seen.crumbs.push([k, d]);
    const pose = () => run('mula.root.position.toArray().join() + mula.root.quaternion.toArray().join() + plaza.props.map(p => p.mesh.visible)');
    const before = pose();
    run('heroFlat = 2;');
    assert.equal(run('renderHero(960, 620)'), null, 'nothing drawn at all: no photo (the card draws its stand-in)');
    assert.deepEqual(JSON.parse(JSON.stringify(seen.reports)), [['share-hero-failed', { phase: 'flat', target: 'byte', name: 'Error' }]], 'a genuine flat render stays a warning, bounded tags');
    assert.equal(seen.crumbs.length, 0);
    seen.reports.length = 0;
    run(`var readOld = renderer.readRenderTargetPixels; renderer.readRenderTargetPixels = () => { throw Object.assign(new Error('secret detail'), { name: 'WeirdError' }); };`);
    assert.equal(run('renderHero(960, 620)'), null);
    assert.deepEqual(JSON.parse(JSON.stringify(seen.reports)), [['share-hero-failed', { phase: 'read', target: 'float', name: 'Other' }]], 'read failure: phase, target, allowlisted name only');
    assert.equal(pose(), before, 'pose and props restored after a failure');
    seen.reports.length = 0;
    run(`var rtOld = renderer.setRenderTarget; renderer.setRenderTarget = () => { throw new Error('cleanup'); };
      var disposed = 0, disposeOld = THREE.WebGLRenderTarget.prototype.dispose; THREE.WebGLRenderTarget.prototype.dispose = function () { disposed++; return disposeOld.call(this); };`);
    assert.equal(run('renderHero(960, 620)'), null, 'setRenderTarget throws inside the capture: still null');
    assert.equal(run('disposed'), 2, 'both temporary targets are disposed although setRenderTarget threw');
    run('THREE.WebGLRenderTarget.prototype.dispose = disposeOld;');
    assert.equal(pose(), before, 'pose and props restored although the GPU cleanup threw');
    assert(seen.reports.some(r => r[1].phase === 'cleanup'), 'cleanup failure is reported');
    run('renderer.setRenderTarget = rtOld; renderer.readRenderTargetPixels = readOld;'); seen.reports.length = 0;
    run('renderer.lost = true; heroShots.length = 0; var heroDrawn = 0; var renderOld = renderer.render; renderer.render = () => heroDrawn++;');
    assert.equal(run('renderHero(960, 620)'), null);
    assert(run('heroDrawn') === 0 && !seen.reports.length, 'lost before: no render, no warning');
    assert.deepEqual(JSON.parse(JSON.stringify(seen.crumbs)), [['share-hero-context-lost', { phase: 'context', target: 'none' }]]);
    seen.crumbs.length = 0;
    run('renderer.lost = false; renderer.render = renderOld; heroFlat = 2; var readFlat = renderer.readRenderTargetPixels; renderer.readRenderTargetPixels = function (...a) { this.lost = true; return readFlat.apply(this, a); };');
    assert.equal(run('renderHero(960, 620)'), null);
    assert(!seen.reports.length && seen.crumbs.length === 1 && seen.crumbs[0][1].phase === 'flat', 'lost during the render: breadcrumb, no warning');
    assert.equal(pose(), before, 'pose restored after a mid-capture loss');
    run('renderer.readRenderTargetPixels = readFlat; renderer.lost = false; heroFlat = 0;');
    seen.crumbs.length = 0;
    assert(run('renderHero(960, 620)'), 'healthy again after a loss: a photo');
    assert(!seen.reports.length && !seen.crumbs.length, 'a healthy capture reports nothing');
    // a context lost right after the photo (an Adreno 618, every results screen): that GPU never renders it again
    const savedStorage = context.localStorage, kept = {};
    context.localStorage = { getItem: k => kept[k] ?? null, setItem: (k, v) => { kept[k] = String(v); } };
    const lose = () => nodes.get('gl').listeners.webglcontextlost();
    run('heroAt = performance.now() - 10000;'); lose();
    assert(run('renderHero(960, 620)'), 'a loss long after the last photo leaves the photo on');
    lose(); seen.crumbs.length = 0;
    run('heroShots.length = 0;');
    assert.equal(run('renderHero(960, 620)'), null, 'a loss just after the photo turns it off');
    assert.equal(run('heroShots.length'), 0, 'off: nothing is rendered at all');
    assert.equal(kept['share-hero-off'], run('heroGpu()'), 'remembered for this GPU');
    kept['share-hero-off'] = 'Another GPU';
    assert(run('renderHero(960, 620)'), 'another GPU string tries again');
    context.localStorage = savedStorage;
  } finally {
    errors.report = originalReport; errors.breadcrumb = originalBreadcrumb;
    console.warn = warn;
  }
  document.createElement = made; delete context.ImageData;
  run('qualityLevel = 2; applyRenderQuality(); G.state = "select";');
}
console.log('share photo renders her with the crowd at every quality ok');

// Capture targets: no depth on the encoding target, no depth resolve on the scene target, same samples/types/sizes as before.
{
  const made = document.createElement;
  document.createElement = tag => tag === 'canvas' ? { getContext: () => ({ putImageData() {} }) } : made(tag);
  context.ImageData = class { constructor(d, w, h) { Object.assign(this, { d, w, h }); } };
  run(`var tOpts = [], tOld = THREE.WebGLRenderTarget; heroFlat = 0; renderer.extensions = { has: () => true };
    THREE.WebGLRenderTarget = class extends tOld { constructor(w, h, o) { super(w, h, o); tOpts.push(this); } };`);
  const opts = () => JSON.parse(run(`JSON.stringify(tOpts.map(t => [t.width, t.height, t.depthBuffer, t.resolveDepthBuffer, t.samples, t.texture.type]))`));
  assert(run('renderHero(960, 620)'));
  const half = 1016; // THREE.HalfFloatType
  assert.deepEqual(opts(), [[960, 620, false, true, 0, 1009], [960, 620, true, false, 4, half]], 'out: no depth; scene: depth kept, no resolve, 4 samples, half float');
  run('tOpts.length = 0; renderer.extensions = { has: () => false };');
  assert(run('renderHero(960, 620)'));
  assert.deepEqual(opts(), [[960, 620, false, true, 0, 1009], [960, 620, true, false, 4, 1009]], 'no float extension: straight to bytes, one attempt');
  run('tOpts.length = 0; renderer.extensions = { has: () => true }; heroFlat = 1;');
  assert(run('renderHero(960, 620)'));
  assert.deepEqual(opts().map(o => [o[2], o[3], o[4], o[5]]), [[false, true, 0, 1009], [true, false, 4, half], [true, false, 4, 1009]], 'flat float: one byte retry, same options');
  run('THREE.WebGLRenderTarget = tOld;');
  document.createElement = made; delete context.ImageData;
}
console.log('share capture targets ok');

// The first screen render after a restore: renderScreen() leaves one breadcrumb once draw calls reached a live context.
{
  const crumbs = [], ob = errors.breadcrumb, or = errors.report;
  errors.breadcrumb = k => crumbs.push(k); errors.report = () => {};
  const gl = nodes.get('gl').listeners, N = 'webgl-screen-submitted-after-restore';
  run(`var scCalls = 3, scThrow = false, scOld = renderer.render, scInfoOld = renderer.info;
    renderer.info = { render: { calls: 0 } }; renderer.target = null; renderer.lost = false;
    renderer.render = function () { if (scThrow) throw new Error('boom'); this.info.render.calls = scCalls; };`);
  const frame = () => run('renderScreen()');
  const names = () => crumbs.filter(k => k === N).length;
  try {
    frame(); frame(); assert.equal(names(), 0, 'idle (no restore): no breadcrumb');
    gl.webglcontextlost(); gl.webglcontextrestored(); crumbs.length = 0;
    run('scCalls = 0;'); frame(); assert.equal(names(), 0, 'zero draw calls: still pending');
    run('scCalls = 3; renderer.target = {};'); frame(); assert.equal(names(), 0, 'a non-null target is not the screen');
    run('renderer.target = null; renderer.lost = true;'); frame(); assert.equal(names(), 0, 'context lost: still pending');
    run('renderer.lost = false; scThrow = true;');
    assert.throws(() => frame(), /boom/, 'a render error propagates'); assert.equal(names(), 0, 'and keeps it pending');
    run('scThrow = false;'); frame(); frame(); frame();
    assert.equal(names(), 1, 'valid frames: exactly one breadcrumb');
    gl.webglcontextlost(); frame(); assert.equal(names(), 1, 'a loss clears a pending restore');
    gl.webglcontextrestored(); frame(); frame(); assert.equal(names(), 2, 'the next restore re-arms it once');
    gl.webglcontextrestored(); gl.webglcontextlost(); frame(); assert.equal(names(), 2, 'loss after restore, before a frame: nothing pending');
  } finally {
    run('renderer.render = scOld; renderer.info = scInfoOld; renderer.lost = false;');
    errors.breadcrumb = ob; errors.report = or;
  }
}
console.log('screen render after a restore ok');


// L'ÀNIM DE LA PLAÇA: standing idle drains it note by note until the mulassa falls apart, on every difficulty;
// the count-in and the intro before the first note never drain; each warning threshold pulses once on the way down.
for (const diff of [0, 1, 2]) {
  run(`songNow = 0; chip = { suspend() { this.ctx.suspend(); }, resume() {}, t0: 0, ctx: { currentTime: 0, suspend() {}, resume() {} }, stop() {}, menu() {}, sfx() {}, noiseHit() {}, blip() {},
      now: () => songNow, start: () => Promise.resolve(false) };
    offsetMs = 0; startGame(${diff}); bubbles.length = 0; var diedAt = null, introE = 1;
    for (songNow = -LEAD; songNow < G.chart[0].t; songNow += 1 / 30) { advance(songNow); introE = Math.min(introE, G.energy); }
    var warningTimes = [], lastWarning = G.energyWarnT;
    for (; songNow < 60 && !G.collapseT; songNow += 1 / 30) { clock += 1 / 30; advance(songNow); if (G.energyWarnT !== lastWarning) { warningTimes.push(G.energyWarnT); lastWarning = G.energyWarnT; } }
    diedAt = G.collapseT ? songNow - G.chart[0].t : null;
    var lastWord = bubbles.map(b => b.txt).join();`);
  assert.equal(run('introE'), 1, 'no drain during the count-in and the intro');
  const died = run('diedAt'), misses = run('G.counts.miss');
  assert(died != null && run('G.energy === 0'), `idle on ${diff}: the mulassa collapses`);
  assert.equal(misses, [13, 10, 8][diff], `idle on ${diff}: misses from full to empty`);
  if (diff === 0) assert(died + run('LEAD + G.chart[0].t') < 30, `idle on FÀCIL loses within ~30 s (${died.toFixed(1)} s after the first note)`);
  assert.equal(run('warningTimes.length'), 2, 'each threshold pulses once');
  assert.equal(run('lastWord'), '', 'collapse clears every bubble for its fixed caption');
}
run(`startGame(2); var hitN = G.chart.find(n => !n.big && !n.balloon && !n.end); G.energy = 0.5; judge(hitN, 'perfect'); var afterHit = G.energy;
  var bigN = G.chart.find(n => n.big); G.energy = 0.5; judge(bigN, 'perfect'); var afterBig = G.energy, bigFlash = G.energyT === clock;`);
assert(run('afterHit > 0.5 && afterBig > afterHit && bigFlash'), 'hits refill the ànim, a GUAPA more (with a flash)');
drawnText.length = 0;
run(`G.state = 'results'; G.reason = 'collapse'; G.errors = { early: 0, late: 0, move: 0, silent: 9, both: 0, hold: 0 }; drawHud(0);`);
assert(drawnText.some(s => /esgotat l’ànim/.test(s)), 'a collapse explains the ànim in the tip');
console.log('ànim (energy) contracts ok');
