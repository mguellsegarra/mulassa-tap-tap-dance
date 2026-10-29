// Photo mode (walking, driving, jumps, the crowd making way) and the showreel: contracts on the shared running game
// (game-context.mjs; render-quality.mjs runs the files in order).
import assert from 'node:assert/strict';
import { verifyJumpImpact } from './jump-impact.mjs';
import { verifyManualSway } from './manual-sway.mjs';
import { THREE, models, framing, dance, nodes, keyHandlers, windowHandlers, document, context, run } from './game-context.mjs';
// Manual photo walking owns neither the selected song nor the selector's stored difficulty.
{
  const photoKeyDown = (code, more = {}) => {
    let prevented = false;
    for (const h of keyHandlers) h({ code, target: { tagName: 'BODY' }, preventDefault() { prevented = true; }, ...more });
    return prevented;
  };
  run(`if (chip) chip.wake = () => {}; setFigureSong(MULASSA); G.state = 'select'; sheets.select.figure = selectedFigure; sheets.select.pending = false; animStage(1/60, 0); M.pos.set(-3,0); M.pivot.set(-3, PIVOT); PAIR.w.x=3; PAIR.w.z=0; PAIR.x=3; PAIR.z=0; camera.position.set(0,6,10); camFocus.set(0,0,0); var photoCrowd=activeCrowd; activeCrowd=[]; setView(true); takeFigure(selectedFigure.id); animStage(1/60, 0);
    var photoSong = song, photoDiff = G.diff, photoStart = M.pos.clone();`);
  assert(run('PHOTO.on && mula.root.visible && !drac.root.visible'));
  photoKeyDown('KeyW');
  run(`for (let i=0;i<120;i++) { clock+=1/60; animStage(1/60, clock/BEAT); animCrowd(1/60, clock/BEAT, 0, 1); }`);
  assert(run('M.pos.distanceTo(photoStart) > 0.1'), 'W moves the Mulassa in free space');
  assert(photoKeyDown('Tab'), 'photo Tab consumed');
  assert(run("PHOTO.id === 'drac-valls' && PHOTO.keys.size === 0"));
  run('animStage(1/60, clock/BEAT); var photoDracStart = {x: M.pos.x, z: M.pos.y};');
  assert(run('drac.root.visible && !mula.root.visible'), 'Tab hands the plaça to the Drac alone');
  photoKeyDown('KeyD');
  run(`for (let i=0;i<120;i++) { clock+=1/60; animStage(1/60, clock/BEAT); animCrowd(1/60, clock/BEAT, 0, 1); }`);
  assert(run('Math.hypot(M.pos.x-photoDracStart.x, M.pos.y-photoDracStart.z)>0.1'), 'Tab controls the visible Drac');
  run("activeCrowd=photoCrowd;");
  windowHandlers.blur.forEach(h => h());
  assert(run('PHOTO.keys.size === 0 && PHOTO.drac.vx === 0'), 'blur releases locomotion');
  photoKeyDown('Escape'); run('animStage(1/60, clock/BEAT);');
  assert(run('!PHOTO.on && !PHOTO.ready && song === photoSong && G.diff === photoDiff'));
  assert(!photoKeyDown('Tab'), 'normal Tab untouched');
  run(`G.state='select'; setView(true); takeFigure(selectedFigure.id); animStage(1/60, clock/BEAT);`);
  photoKeyDown('Tab'); run('animStage(1/60, clock/BEAT);');
  assert(run("drac.root.visible && !mula.root.visible && selectedFigure.id === 'mulassa-valls'"), 'the driven Drac alone, without changing selection');
  photoKeyDown('KeyA', { target: { tagName: 'TEXTAREA' } });
  assert(run('PHOTO.keys.size === 0'), 'text fields never steer');
  photoKeyDown('Escape'); run('animStage(1/60, clock/BEAT);');
  assert(run('mula.root.visible && !drac.root.visible && song === photoSong && G.diff === photoDiff'), 'exit restores original selector figure and song');
  run(`setView(true); takeFigure(selectedFigure.id); animStage(1/60, clock/BEAT); G.state='play'; updateControls(); animStage(1/60, clock/BEAT);`);
  assert(run('!PHOTO.on && PHOTO.keys.size === 0'), 'game transition clears manual mode');
  run("G.state='select'; setView(false);");
  console.log('photo walking splash/selector, visible switching, blur and play isolation ok');
}

// Shift is owned by free control, and every transition that suspends input releases both sides.
{
  run('var shiftAudioContext = chip.ctx; chip.ctx = { suspend() {} }; chip.suspend ??= () => {};'); // focusin suspends the menu context
  const key = (code, more = {}) => { let prevented = false; for (const h of keyHandlers) h({ code, target: { tagName: 'BODY' }, preventDefault() { prevented = true; }, ...more }); return prevented; };
  for (const [name, reset] of [
    ['blur', () => windowHandlers.blur.forEach(h => h())],
    ['visibility loss', () => document.listeners.visibilitychange()],
    ['pagehide', () => windowHandlers.pagehide.forEach(h => h())],
    ['focus control', () => windowHandlers.focusin.forEach(h => h({ target: { tagName: 'BUTTON' } }))],
    ['Escape', () => key('Escape')], ['Tab figure', () => key('Tab')],
    ['leave mode', () => run('setView(false);')],
    ['modal', () => run('settingsMenu.open=true; updateControls(); settingsMenu.open=false;')],
    ['game', () => run("G.state='play'; updateControls(); animStage(1/60,0);")],
  ]) {
    run("setView(false); G.state='select'; setFigureSong(MULASSA); setView(true); takeFigure('mulassa-valls');");
    assert(key('ShiftLeft') && key('ShiftRight') && key('KeyW'), `${name}: both modifiers accepted in the world`);
    reset();
    assert(run('!PHOTO.keys.size && PHOTO.mula.sprint===0 && PHOTO.drac.sprint===0'), `${name}: clears both Shift keys and sprint`);
    assert(!key('ShiftLeft', { repeat: true }) || run('!PHOTO.keys.has("ShiftLeft")'), 'a repeat cannot restore a released modifier');
  }
  run("G.state='select'; setView(true); takeFigure('drac-valls');");
  key('ShiftLeft'); key('ShiftRight'); key('KeyW');
  windowHandlers.keyup.forEach(h => h({ code: 'ShiftLeft' }));
  assert(run('!PHOTO.keys.has("ShiftLeft") && PHOTO.keys.has("ShiftRight") && PHOTO.keys.has("KeyW")'), 'keyup only releases its own Shift');
  windowHandlers.keyup.forEach(h => h({ code: 'ShiftRight' }));
  assert(run('!PHOTO.keys.has("ShiftRight") && PHOTO.keys.has("KeyW")'), 'releasing the last Shift keeps movement held');
  key('ShiftLeft'); const actor = run('PHOTO.id');
  assert(!key('Tab', { shiftKey: true }) && run('PHOTO.id') === actor && run('!PHOTO.keys.size'), 'ShiftTab navigates backwards without switching actor');
  run("setView(false); G.state='play';");
  assert(!key('ShiftLeft') && run('!PHOTO.keys.size'), 'game Shift is never a free control');
  run("G.state='select'; setFigureSong(MULASSA);");
  run('chip.ctx = shiftAudioContext;');
  console.log('free Shift reset on blur/visibility/focus/modal/Escape/figure/exit/play ok');
}

// One beast on show at a time on playable/pending selectors; photo controls never change the game's identity.
{
  const shown = { 'mulassa-valls': 'mula.root.visible && !drac.root.visible && !bou.frame.visible', 'drac-valls': 'drac.root.visible && !mula.root.visible && !bou.frame.visible', 'bou-tradicional-valls': 'bou.frame.visible && !mula.root.visible && !drac.root.visible' };
  for (const figure of ['MULASSA', 'DRAC']) for (const pending of [false, true]) {
    run(`setView(false); G.state='select'; setFigureSong(${figure}); selectScreen.figure=${figure}; selectScreen.pending=${pending};
      G.sel=2; G.diff=1; var pairSong=song, pairFigure=selectedFigure, pairCrowd=activeCrowd; activeCrowd=[];
      animStage(1/60,clock/BEAT); setView(true); animStage(1/60,clock/BEAT);`);
    assert(run(`PHOTO.on && PAIR.k === 0 && ${shown[figure === 'DRAC' ? 'drac-valls' : 'mulassa-valls']}`), `${figure}, pending=${pending}: free play shows only the driven beast`);
    for (const id of ['drac-valls', 'bou-tradicional-valls', 'mulassa-valls', 'drac-valls']) {
      run(`takeFigure('${id}'); animStage(1/60,clock/BEAT); PHOTO.keys.add('KeyW');
        for(let i=0;i<12;i++){ clock+=1/60; animStage(1/60,clock/BEAT); }
        clearPhotoKeys();`);
      assert(run(shown[id]), `${id}: only the driven beast is visible`);
      assert(run('song===pairSong && selectedFigure===pairFigure && G.sel===2 && G.diff===1'), 'control never changes selection, song or difficulty');
    }
    run('setView(false); frame(clock*1000+17); activeCrowd=pairCrowd;');
    assert(run('!PHOTO.on && !PHOTO.ready && PAIR.k===0 && song===pairSong && selectedFigure===pairFigure && G.sel===2 && G.diff===1'), 'HUD return restores menu identity and releases control');
    assert(run(pending ? '!mula.root.visible && !drac.root.visible' : figure === 'DRAC' ? 'drac.root.visible && !mula.root.visible' : 'mula.root.visible && !drac.root.visible'), 'HUD return restores selected or pending visibility');
    run('selectScreen.pending=false;');
  }
  run('setFigureSong(MULASSA);');
  console.log('selector pair: both playable figures, pending, repeated controls/free view and intact HUD return ok');
}

// Mouse look while driving (src/ui/mouse-look.js): held RMB locks the pointer, the look reads movementX past any
// edge, and every way out (letting go, the browser's Escape, blur, Tab, a sheet, leaving) unlocks with no stray look.
// A mock lock: this proves the state machine, not a real hidden cursor (that is the browser QA).
{
  const hud = nodes.get('hud'), calls = { lock: 0, exit: 0, capture: [] };
  let answer = () => Promise.resolve();
  const change = () => document.listeners.pointerlockchange();
  hud.requestPointerLock = () => { calls.lock++; return answer(); };
  hud.setPointerCapture = id => calls.capture.push(id);
  document.exitPointerLock = () => { calls.exit++; if (document.pointerLockElement) { document.pointerLockElement = null; change(); } };
  const grant = () => { document.pointerLockElement = hud; change(); };
  const ev = (more = {}) => ({ pointerId: 7, pointerType: 'mouse', button: 2, buttons: 2, clientX: 5, clientY: 5, movementX: 0, movementY: 0, preventDefault() {}, ...more });
  const up = (more = {}) => (windowHandlers.mouseup || []).forEach(h => h(ev({ buttons: 0, ...more })));
  const key = code => { let prevented = false; for (const h of keyHandlers) h({ code, target: { tagName: 'BODY' }, preventDefault() { prevented = true; } }); return prevented; };
  run(`G.state = 'select'; setFigureSong(MULASSA); setView(false); setView(true); takeFigure('mulassa-valls'); PHOTO.cameraYaw = 0;`);
  hud.listeners.pointerdown(ev()); hud.listeners.mousedown(ev());
  assert(calls.lock === 1 && calls.capture.length === 0 && run('PHOTO.mouse === 2'), 'a right press asks for the lock, no capture');
  grant();
  hud.listeners.pointermove(ev({ buttons: 0, movementX: 190 })); // the lock's first move can jump (Firefox's own also says buttons 0): dropped
  run('updateControls();');
  assert(document.pointerLockElement === hud && run('PHOTO.mouse === 2 && PHOTO.cameraYaw === 0'), 'the lock survives its own first move');
  hud.listeners.pointermove(ev({ buttons: 3 })); assert(run('PHOTO.mouse === 3'), 'both buttons held while locked = run');
  hud.listeners.pointermove(ev({ buttons: 2 }));
  for (let i = 0; i < 40; i++) hud.listeners.pointermove(ev({ movementX: 150 })); // clientX stays put while locked
  assert(run('Math.abs(PHOTO.cameraYaw + 40 * 150 * 0.003) < 1e-9'), 'the look keeps turning on movementX, past where any cursor would stop');
  up();
  assert(!document.pointerLockElement && run('PHOTO.mouse === 0 && PHOTO.on'), 'letting go unlocks and ends the look');
  hud.listeners.pointerdown(ev()); hud.listeners.mousedown(ev()); grant(); hud.listeners.pointermove(ev()); // (the lock's first move)
  hud.listeners.pointermove(ev({ buttons: 0, movementX: 0 })); // Firefox's own still move while locked: no button, no motion
  assert(document.pointerLockElement === hud && run('PHOTO.mouse === 2'), 'a still no-button move keeps the lock');
  hud.listeners.pointermove(ev({ buttons: 0, movementX: 6 })); run('updateControls();'); // its pointerup went missing
  assert(!document.pointerLockElement && run('PHOTO.mouse === 0'), 'a move with no button down ends a lock whose pointerup was lost');
  hud.listeners.pointerdown(ev()); hud.listeners.mousedown(ev()); grant(); key('ShiftLeft'); key('KeyW'); key('KeyE');
  document.pointerLockElement = null; change(); // the browser's Escape
  assert(run('PHOTO.mouse === 0 && !PHOTO.keys.size && PHOTO.mula.sprint === 0'), 'browser Escape without keydown releases the drag, Shift and actions');
  assert(key('Escape') && run('PHOTO.on'), 'the Escape that freed the cursor does not also drop the figure');
  const yaw = run('PHOTO.cameraYaw');
  hud.listeners.pointermove(ev({ movementX: 80 })); up();
  assert.equal(run('PHOTO.cameraYaw'), yaw, 'no stray look after a browser unlock, button still down');
  run('performance.now = () => 1000');
  hud.listeners.pointerdown(ev()); hud.listeners.mousedown(ev()); up(); grant(); // let go before the lock came
  assert(!document.pointerLockElement, 'a late lock is handed straight back');
  answer = () => Promise.reject(new Error('refused')); calls.capture.length = 0;
  hud.listeners.pointerdown(ev()); hud.listeners.mousedown(ev()); await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(calls.capture, [7], 'refused: the old pointer capture while the button is held'); up();
  answer = () => undefined; calls.capture.length = 0; // Firefox: no promise, an event
  hud.listeners.pointerdown(ev()); hud.listeners.mousedown(ev()); document.listeners.pointerlockerror();
  assert.deepEqual(calls.capture, [7]); up();
  answer = () => Promise.resolve();
  for (const [what, leave] of [['blur', () => windowHandlers.blur.forEach(h => h())], ['Tab', () => key('Tab')],
    ['a sheet', () => run('settingsMenu.open = true; updateControls(); settingsMenu.open = false;')], ['leaving free play', () => run('setView(false);')]]) {
    if (!run('viewMode')) run('setView(true);');
    if (!run('PHOTO.on')) run("takeFigure('mulassa-valls');");
    hud.listeners.pointerdown(ev()); hud.listeners.mousedown(ev()); grant();
    leave();
    run('updateControls();');
    assert(!document.pointerLockElement && run('PHOTO.mouse === 0'), `${what} unlocks`);
  }
  calls.lock = 0; run(`if (!viewMode) setView(true); takeFigure('mulassa-valls');`);
  hud.listeners.pointerdown(ev({ pointerType: 'touch', button: 0, buttons: 1 })); (windowHandlers.pointerup || []).forEach(h => h(ev({ pointerType: 'touch', buttons: 0 })));
  assert.equal(calls.lock, 0, 'touch never asks for the lock');
  run('setView(false); performance.now = () => 0;');
  delete hud.requestPointerLock; delete hud.setPointerCapture; delete document.exitPointerLock; document.pointerLockElement = null;
  console.log('photo mouse look: pointer lock while held, every exit unlocks ok');
}

// Entry follows a playable selector figure; reentry never remembers a different photo actor.
{
  const savedEntryFigure = context.selectScreen.figure;
  for (const figure of ['MULASSA', 'DRAC', 'BOU'].filter(f => run(`playable(${f})`))) {
    run(`setView(false); G.state='select'; setFigureSong(${figure}); selectScreen.figure=${figure}; selectScreen.pending=false; setView(true);`);
    assert(run(`PHOTO.on && PHOTO.id === ${figure}.id`), 'playable entry controls the selector figure, alone');
    run(`takeFigure('${figure === 'MULASSA' ? 'drac-valls' : 'mulassa-valls'}'); setView(false); setView(true);`);
    assert(run(`PHOTO.id === ${figure}.id && PHOTO.on`), 'reentry derives the actor from selection');
    run(`setView(false); selectScreen.pending=true; setView(true);`);
    assert(run(`PHOTO.on && PHOTO.id === ${figure}.id`), 'pending entry drives the last playable figure');
  }
  run('setView(false); selectScreen.pending=false; G.state="splash"; setView(true);');
  assert(run('!viewMode && !PHOTO.on'), 'the splash never enters photo mode');
  run('setView(false); setFigureSong(MULASSA);');
  context.selectScreen.figure = savedEntryFigure;
}

// Free play drives from the start (no «Mira la plaça»); desktop frames hand a figure to WASD; Tab goes round the three.
{
  const savedHelpStorage = context.localStorage, helpStorage = {};
  context.localStorage = { getItem: k => helpStorage[k] ?? null, setItem: (k, v) => { helpStorage[k] = String(v); } };
  const keyDown = (code, more = {}) => {
    let prevented = false;
    for (const h of keyHandlers) h({ code, target: { tagName: 'BODY' }, preventDefault() { prevented = true; }, ...more });
    return prevented;
  };
  // Timers belong to the current notice: switching/exit cancels them, replay replaces them.
  const savedPhotoTimers = [context.setTimeout, context.clearTimeout], photoTimers = new Map();
  let photoTimerId = 0;
  context.setTimeout = (fn, ms) => { photoTimers.set(++photoTimerId, { fn, ms }); return photoTimerId; };
  context.clearTimeout = id => photoTimers.delete(id);
  run(`pfAutoShown.clear(); G.state='select'; selectScreen.figure = selectedFigure; selectScreen.pending = true; setFigureSong(MULASSA); setView(false); setView(true); animStage(1/60, clock/BEAT);`);
  assert(run("viewMode && PHOTO.on && PHOTO.id === 'mulassa-valls' && !avatarsEl.hidden"), 'free play drives at once (a pending selection: the Mulassa), with the bar shown');
  assert(run('!avatarsEl.innerHTML.includes("pf-free") && avatarsEl.innerHTML.split(\'class="pf"\').length === PLAYABLE_IDS.length + 1'), 'the bar has every playable figure and no Mira la plaça');
  assert(run('!pfTip.hidden && pfTip.dataset.visible === "true" && pfTip.innerHTML.includes("guitza")'), 'Mulassa help describes her real actions');
  assert([...photoTimers.values()].some(t => t.ms === 6000), 'initial controls stay for at most six seconds');
  assert.equal(helpStorage['photo-help-seen-figure'], '1', 'first figure help is remembered in browser storage');
  const firstNoticeTimer = run('pfTipT');
  photoTimers.get(firstNoticeTimer).fn(); // the first figure's help has already disappeared
  assert(keyDown('Tab') && run("PHOTO.id === 'drac-valls'"), 'Tab hands the plaça to the next beast');
  assert(!photoTimers.has(firstNoticeTimer), 'switching cancels the previous notice timer');
  assert(run('pfTip.dataset.kind === "notice" && !pfTip.innerHTML.includes("pf-help-grid")'), 'Tab changes actor with compact feedback even on its first visit');
  assert.equal(photoTimers.get(run('pfTipT')).ms, 1800, 'actor feedback is brief');
  keyDown('KeyW', { target: nodes.get('hud') });
  assert(run('pfTip.dataset.visible === "true"') && photoTimers.get(run('pfTipT')).ms === 1800, 'movement preserves brief actor feedback');
  assert(run('pfHelp.textContent.includes("rugeix") && !pfHelp.textContent.includes("guitza")'), 'accessible controls follow the current actor');
  photoTimers.get(run('pfTipT')).fn();
  assert(run('pfTip.dataset.visible === "false" && pfHelp.textContent.includes("rugeix")'), 'after fade the accessible help remains');
  if (run("PLAYABLE_IDS.includes('bou-tradicional-valls')")) {
    keyDown('Tab');
    assert(run('pfTip.innerHTML.includes("Ara mous el Bou") && pfHelp.textContent.includes("envesteix") && pfHelp.textContent.includes("Tab")'), 'the Bou comes next, and Tab goes on from it');
  }
  keyDown('Tab');
  assert(run('pfTip.innerHTML.includes("Ara mous la Mulassa")'), 'each switch identifies the actual actor');
  keyDown('Slash', { key: '?' });
  assert(run('pfTip.dataset.visible === "true"'), 'question mark replays help without leaving control');
  keyDown('Tab');
  assert(run('!pfTip.innerHTML.includes("pf-help-grid")'), 'switching replaces full help with compact feedback');
  keyDown('Tab'); keyDown('Slash', { key: '?' });
  assert(run('pfTipManual'), 'manual help stays available for deliberate reading');
  const manualNoticeTimer = run('pfTipT');
  keyDown('KeyW', { target: nodes.get('hud') });
  assert(!photoTimers.has(manualNoticeTimer) && run('pfTip.dataset.visible === "true"'), 'movement does not time out manual help');
  keyDown('Slash', { key: '?' });
  assert(run('pfTip.dataset.visible === "false"'), 'the same shortcut closes manual help');
  run("setView(false); pfAutoShown.clear(); setView(true); takeFigure('mulassa-valls');");
  assert(run('pfTip.dataset.kind === "notice"'), 'remembered controls never reopen automatically after session state resets');
  run("takeFigure('drac-valls');");
  assert(run('pfTip.dataset.kind === "notice"'), 'one remembered introduction covers both figures');
  keyDown('Slash', { key: '?' });
  assert(run('pfTipManual && pfTip.innerHTML.includes("rugeix")'), 'remembered help stays recoverable with question mark');
  keyDown('Slash', { key: '?' });
  run("takeFigure('mulassa-valls');");
  run('showPhotoHelp(false);');
  keyDown('KeyX');
  keyDown('KeyW', { target: { tagName: 'BUTTON' } });
  assert(run('!pfTip.hidden'), 'unrelated keys and focused buttons do not dismiss movement instructions');
  keyDown('KeyW', { target: nodes.get('hud') });
  const usedNoticeTimer = run('pfTipT');
  assert(run('pfTip.hidden && pfTip.dataset.visible === "false"'), 'movement clears initial help immediately');
  assert(!photoTimers.has(usedNoticeTimer), 'movement cancels the initial help timer');
  keyDown('KeyA'); keyDown('KeyW', { repeat: true });
  assert(!photoTimers.has(usedNoticeTimer) && run('pfTip.hidden'), 'further movement never queues another dismissal');
  for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'Space', 'ShiftLeft', 'ShiftRight']) {
    run('showPhotoHelp(false);');
    keyDown(code, { target: nodes.get('hud'), repeat: true });
    assert(run('pfTip.hidden'), `${code} also clears discovery help when already held`);
    assert(!photoTimers.has(run('pfTipT')), 'held input leaves no obsolete notice timer');
  }
  assert(run('pfTip.innerHTML.includes("Mulassa de Valls")'), 'popup uses the catalog full name');

  run("takeFigure('mulassa-valls');");
  assert(run('PHOTO.on && viewMode'), 'choosing the active figure is idempotent');
  run("takeFigure('drac-valls'); updateControls();");
  photoTimers.get(run('pfTipT')).fn(); run('updateControls();');
  assert(run('!howtoEl.hidden && !howtoEl.inert'), 'after feedback fades the existing help button returns');
  run('showPhotoHelp();');
  assert(run('pfTip.dataset.visible === "true" && pfTip.innerHTML.includes("rugeix")'), 'help button reopens the active figure instructions');
  assert(run('photoHelpAvailable()'), 'the help control stays available to close manual help');
  windowHandlers.blur.forEach(h => h());
  assert(run('pfTip.hidden && pfTip.dataset.visible === "false" && !pfTipManual'), 'backgrounding clears manual help instead of resuming a stale overlay');
  assert(!photoTimers.has(run('pfTipT')), 'backgrounding cancels the owned notice timer');
  run('showPhotoHelp();');
  assert(run('pfTip.dataset.visible === "true"'), 'help can be requested again after backgrounding');
  run("takeFigure('mulassa-valls');"); keyDown('KeyW');
  keyDown('Escape');
  assert(run('!viewMode && !PHOTO.on && PHOTO.keys.size === 0 && avatarsEl.hidden'), 'Escape leaves free play (keys cleared)');
  run("setView(true); takeFigure('mulassa-valls');"); keyDown('KeyH');
  assert(run('viewMode && PHOTO.on'), 'H does not leave free play'); run('setView(false)');
  run("COARSE.matches = true; setView(true);");
  assert(run("viewMode && avatarsEl.hidden && PHOTO.on && PHOTO.id === 'mulassa-valls' && !touchEl.hidden"), 'touch: no bar, the stick drives her');
  run("setView(false);");
  assert(run('touchEl.hidden && !PHOTO.on'), 'touch: leaving photo mode hides the stick');
  run("COARSE.matches = false; G.state = 'play';");
  assert(!keyDown('Tab') && !keyDown('KeyA'), 'during a song WASD/Tab are not photo keys');
  run("G.state = 'select';");
  assert(run('pfTip.hidden && pfTip.dataset.visible === "false"'), 'touch and exit clear the notice');
  [context.setTimeout, context.clearTimeout] = savedPhotoTimers;
  context.localStorage = savedHelpStorage;
  console.log('photo drives at once, three beasts round Tab, desktop frames, Escape leaves, touch drives with the stick ok');
  // Pending selection keeps its identity; photo mode shows the driven playable figure alone.
    let ft = 90000; const pendFrame = () => run(`frame(${ft += 1000 / 60})`);
  run(`var realSel = sheets.select, pendCrowd = activeCrowd; activeCrowd = []; sheets.select = { pending: true, figure: { id: 'aliga-valls', status: 'aviat' }, visible() {}, sheetOpen: false };
    G.state = 'select'; setView(false); setFigureSong(MULASSA); var pendingSounds = [], pendingChip = chip; chip = { sfx: k => pendingSounds.push(k) };`);
  pendFrame();
  assert(run('!mula.root.visible && !drac.root.visible'), 'pending selector: no model');
  run('setView(true);'); pendFrame();
  assert(run('mula.root.visible && !drac.root.visible && !avatarsEl.hidden'), 'pending photo mode: the Mulassa alone and the control bar show');
  run("takeFigure('drac-valls');"); pendFrame();
  assert(run("drac.root.visible && !mula.root.visible && selectedFigure.id === 'mulassa-valls'"), 'driving the Drac never changes the selection');
  run("PHOTO.sparks = true;"); pendFrame(); pendFrame();
  run('setView(false);'); pendFrame();
  assert(run("!mula.root.visible && !drac.root.visible && dracFx.idle && sheets.select.figure.id === 'aliga-valls' && selectedFigure.id === 'mulassa-valls'"), 'leaving: bare again, Drac fx cleared, pending selection kept');
  run('setFigureSong(DRAC); setView(true);'); pendFrame();
  assert(run('drac.root.visible && !mula.root.visible'), 'the last playable Drac shows alone');
  run('setView(false); setFigureSong(MULASSA);'); pendFrame(); // (a frame closes the photo walk, as the game does)
  assert.equal(run('pendingSounds.length'), 0, 'pending photo controls and figure switches never request SFX');
  run('chip = pendingChip;');
  const sizeWas = [context.innerWidth, context.innerHeight];
  // Leaving photo mode: the selector comes back at once, so the camera hands back quickly: her feet are back
  // above the dock within ~1.5 s, not the calm ~4 s that left her behind the cards.
  const feet = () => run(`camera.updateMatrixWorld(); { let hi = -Infinity; const v = new THREE.Vector3(), ppm = HH * K / (2 * Math.tan(camera.fov * Math.PI / 360));
    mula.root.traverseVisible(o => { const p = o.isMesh && o.geometry.attributes.position; if (p) for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse); const y = -v.y / -v.z * ppm; if (Number.isFinite(y)) hi = Math.max(hi, y); } });
    hi + camShift + HH * K / 2; }`);
  context.innerWidth = 1280; context.innerHeight = 800; // a desktop: the band right of the info panel, the dock from 476 down
  run(`resize(); sheets.select = { pending: false, figure: { id: 'mulassa-valls', status: 'joc' }, visible() {}, sheetOpen: false, band: { top: 66, bottom: 476, hardTop: 66, left: 548, right: 1280 } };`);
  run('setView(false);'); for (let i = 0; i < 360; i++) pendFrame();
  const settled = Math.max(...Array.from({ length: 30 }, () => (pendFrame(), feet())));
  run('setView(true);'); for (let i = 0; i < 240; i++) pendFrame();
  run('setView(false);');
  let clear = null; for (let i = 0; i < 300 && clear === null; i++) { pendFrame(); if (feet() <= Math.max(476, settled) + 10) clear = i / 60; }
  assert(clear !== null && clear < 1.5, `leaving photo mode: her feet are back over the dock in ${clear?.toFixed(2)} s (settled ${settled.toFixed(0)} css px, dock at 476)`);
  [context.innerWidth, context.innerHeight] = sizeWas; run('setView(false); resize();'); pendFrame();
  run('sheets.select = realSel; activeCrowd = pendCrowd;'); // (no crowd: the frames must not move the people later tests place)
  console.log('pending selection: photo mode shows the driven figure and preserves the pending identity ok');
}

// A nearby spectator makes way through the regular RING steering; the walker never tunnels through them.
{
  run(`G.state='select'; setFigureSong(MULASSA); M.pos.set(0,0); M.yaw=Math.PI; M.pivot.set(0,-PIVOT);
    S.yaw.x=S.yaw.t=Math.PI; S.yaw.v=0; camera.position.set(0,6,10); camFocus.set(0,0,0);
    var savedPhotoCrowd=activeCrowd, photoPerson=activeCrowd[0]; activeCrowd=[photoPerson];
    photoPerson.pos.set(0,-4.3); photoPerson.gx=0; photoPerson.gz=-4.3; photoPerson.vel.set(0,0);
    setView(true); takeFigure(selectedFigure.id); animStage(1/60,0); PHOTO.keys.add('KeyW'); PHOTO.keys.add('ShiftLeft');
    var manualMin=99, manualStep=0, personStart=photoPerson.pos.clone();
    for(let i=0;i<360;i++){
      var px=M.pos.x,pz=M.pos.y; clock+=1/60; animStage(1/60,clock/BEAT); animCrowd(1/60,clock/BEAT,0,1);
      manualStep=Math.max(manualStep,Math.hypot(M.pos.x-px,M.pos.y-pz));
      manualMin=Math.min(manualMin,photoClearance(M.pos.x,M.pos.y,M.yaw,photoPerson.gx,photoPerson.gz,photoPerson.rad));
    }`);
  assert(run('photoPerson.pos.distanceTo(personStart)>1'), 'spectator steps away from the moving figure');
  assert(run('manualStep<=PHOTO_RUN.run/60+1e-6'), 'manual motion never jumps through the audience');
  assert(run('manualMin >= -0.03'), `no overlap with the visible spectator: ${run('manualMin')}`);
  assert(run('photoFixedClearance(M.pos.x,M.pos.y,M.yaw,false)>=-1e-6'), 'figure stays inside the real plaza and clear of props');
  assert(run('M.pos.length()>MID.edge-2.65'), 'open floor beyond the old artificial circle is reachable');
  run('setView(false); animStage(1/60,clock/BEAT); activeCrowd=savedPhotoCrowd;');
  console.log('photo walking reuses crowd making-way without overlaps or jumps');
}

// R in photo mode: the Mulassa's culada flings the people round her out (fast, then they slide to a stop); the Drac's E sparks.
{
  run(`G.state='select'; setFigureSong(MULASSA); M.pos.set(0,0); M.yaw=0; M.pivot.set(0,PIVOT); S.yaw.x=S.yaw.t=0; S.yaw.v=0;
    camera.position.set(0,6,10); camFocus.set(0,0,0); setView(false);
    var savedCuladaCrowd=activeCrowd, hit=activeCrowd[0], far=activeCrowd[1]; activeCrowd=[hit,far];
    hit.pos.set(1.6,-1.2); hit.gx=1.6; hit.gz=-1.2; hit.vel.set(0,0); hit.knockT=0; far.pos.set(0,9); far.gx=0; far.gz=9; far.vel.set(0,0); far.knockT=0;
    setView(true); takeFigure('mulassa-valls'); animStage(1/60,clock/BEAT);
    var hitStart=hit.pos.clone(), farStart=far.pos.clone(), hitTop=0;
    photoKey({code:'KeyR',preventDefault(){}},true);
    for(let i=0;i<90;i++){clock+=1/60;animStage(1/60,clock/BEAT);animCrowd(1/60,clock/BEAT,0,1);hitTop=Math.max(hitTop,hit.vel.length());}`);
  assert(run('hit.pos.distanceTo(hitStart)>1.5 && hitTop>4'), `the culada flings the near one out: ${run('hit.pos.distanceTo(hitStart)')} m, ${run('hitTop')} m/s`);
  assert(run('far.pos.distanceTo(farStart)<0.5'), 'people out of her reach are untouched');
  assert(run('hit.fall > 0.9 && !far.fall && Math.abs(hit.g.rotation.x) > 1.3'), 'the one she hit lies flat on the floor (photo mode only)');
  run(`for(let i=0;i<220;i++){clock+=1/60;animStage(1/60,clock/BEAT);animCrowd(1/60,clock/BEAT,0,1);}`);
  assert(run('!hit.fall && hit.g.rotation.x === 0 && !(hit.downT > 0)'), 'and gets back up');
  assert(run('Math.abs(Math.abs(Math.atan2(Math.sin(M.yaw),Math.cos(M.yaw)))-Math.PI)<0.05'), 'she ends half round');
  assert(run('hit.knockT<=0 && hit.vel.length()<3.5'), `the flung one slides to a stop, back to their own pace (at most the 3.4 m/s flee): ${run('[hit.knockT, hit.vel.length(), hit.pos.x, hit.pos.y].map(v=>v.toFixed(2))')}`);
  run(`var previousAvoidKnock=hit.avoidKnock; hit.avoidKnock=true; hit.knockT=0; hit.downT=0; hit.fall=0;
    hit.vel.set(0.1,0); PHOTO.culada=1; MULA_CROWD.knock(hit,1/60,1,1);`);
  assert(run('hit.knockT===0 && hit.downT===0 && hit.fall===0 && hit.vel.x===0.1'), 'an evading mobility variant never receives a throw or a fall, even inside the impact radius');
  run('hit.avoidKnock=previousAvoidKnock; PHOTO.culada=0;');
  run(`activeCrowd=savedCuladaCrowd; setView(false); animStage(1/60,clock/BEAT);
    setFigureSong(MULASSA); G.state='select'; setView(true); takeFigure('drac-valls'); animStage(1/60,clock/BEAT);
    var manualFireRequests = [], fireSfxWas = chip.sfx; chip.sfx = (...args) => manualFireRequests.push(args);
    photoKey({code:'KeyE',preventDefault(){}},true);
    for(let i=0;i<30;i++){clock+=1/60;animStage(1/60,clock/BEAT);dracFrame(1/60,0);}`);
  assert(run('drac.root.visible && !PHOTO.sparks && !dracFx.idle'), 'Drac E sets its sparks going');
  run(`var fireGaps = 0;
    for(let i=0;i<360;i++){clock+=1/60;animStage(1/60,clock/BEAT);dracFrame(1/60,0);if(!dracFx.objects.blast.visible)fireGaps++;}`);
  assert.equal(run('fireGaps'), 0, 'one E keydown sustains the flame every frame beyond the old 1.1 s expiry');
  assert.deepEqual(JSON.parse(run('JSON.stringify(manualFireRequests)')), [['flama', 0, true]], 'held manual fire requests its sound once without demo effects or per-frame repeats');
  run('chip.sfx = fireSfxWas;');
  run("PHOTO.keys.delete('KeyE'); dracFrame(1/60,0);");
  assert(run('dracFx.objects.blast.visible && dracFx.state().wheels === 0'), 'keyup stops emission and lets the existing flame fade naturally');
  run('for(let i=0;i<90;i++)dracFrame(1/60,0);');
  assert(run('!dracFx.objects.blast.visible'), 'released flame finishes its natural lifetime without restarting');

  run("setView(false); animStage(1/60,clock/BEAT); dracFrame(1/60,0);");
  console.log('photo culada flings the crowd; Drac E sparks ok');
}

// A running jump follows its flight arc: no music bounce or walking feet after the takeoff blend.
{
  for (const fps of [30, 60, 120]) {
    run(`G.state='select'; setFigureSong(MULASSA); setView(false); setView(true); takeFigure('mulassa-valls');
      animStage(1/60,0,1); clearPhotoKeys();
      var jumpCrowd=activeCrowd; activeCrowd=[];
      M.air=0; M.airV=0; M.missT=-9; G.collapseT=0;
      for(const s of Object.values(S)){s.x=s.v=s.t=0;}
      Object.assign(PHOTO.mula,{x:0,z:0,yaw:0,vx:0,vz:9,sprint:1});
      PHOTO.cameraYaw=Math.PI; PHOTO.keys.add('KeyW'); PHOTO.keys.add('ShiftLeft');
      for(let i=0;i<12;i++){clock+=1/${fps};animStage(1/${fps},clock/BEAT,1);}
      PHOTO.action=true;
      var airBounce=0, airStep=0, airSamples=0;
      for(let i=0;i<${fps}*0.6;i++){
        clock+=1/${fps};animStage(1/${fps},clock/BEAT,1);
        if(i/${fps}>0.2 && M.air>0.1){
          airSamples++;
          airBounce=Math.max(airBounce,Math.abs(mula.root.position.y-M.air));
          airStep=Math.max(airStep,...MULA_FEET.map(f=>Math.abs(f.y-M.air))); // the carriers' shoes fly with her, no step in the air
        }
      }
      activeCrowd=jumpCrowd; clearPhotoKeys(); setView(false);`);
    assert(run('airSamples > 4'), `sample the flight at ${fps} fps`);
    assert(run('airBounce < 0.02 && airStep < 0.02'),
      `no gait superimposed on the jump at ${fps} fps: ${run('JSON.stringify({airBounce,airStep})')}`);
  }
}

// Q held: the Mulassa rears up on her rear legs; E held: she kicks her rear up on her front legs. The Drac's Q is a roar.
{
  const legY = (front) => run(`MULA_FEET.filter((f,i)=>(i<4)===${front}).reduce((m,f)=>Math.max(m,f.y),0)`); // the carriers' shoes: 0-3 the front pair's, 4-7 the rear's
  run(`G.state='select'; setFigureSong(MULASSA); M.air=0; M.airV=0; setView(false); setView(true); takeFigure('mulassa-valls'); clearPhotoKeys(); PHOTO.keys.add('KeyQ');
    for(let i=0;i<60;i++){clock+=1/60;animStage(1/60,clock/BEAT,1);}`);
  assert(run('mula.body.rotation.x < -0.35'), 'Q: her front up');
  assert(legY(false) < 0.12 && run('MULA_FEET.slice(0,4).every(f=>f.y>0.3)'), `on her rear legs, the front ones off the floor (rear ${legY(false).toFixed(2)})`);
  run(`PHOTO.keys.delete('KeyQ'); PHOTO.keys.add('KeyE'); for(let i=0;i<60;i++){clock+=1/60;animStage(1/60,clock/BEAT,1);}`);
  assert(run('mula.body.rotation.x > 0.3 && MULA_FEET.slice(4).every(f=>f.y>0.3)'), 'E: her rear up, its legs off the floor');
  assert(legY(true) < 0.12, `on her front legs (${legY(true).toFixed(2)})`);
  run(`clearPhotoKeys(); for(let i=0;i<90;i++){clock+=1/60;animStage(1/60,clock/BEAT,1);}`);
  assert(run('Math.abs(mula.body.rotation.x) < 0.1'), 'let go: back on all fours (alone she keeps her idle sway, < 0.08)');
  run(`takeFigure('drac-valls'); PHOTO.keys.add('KeyQ'); for(let i=0;i<60;i++){clock+=1/60;animStage(1/60,clock/BEAT,1);}`);
  assert(run('DRAC_POSE.rear > 0.8 && DRAC_POSE.jaw > 0.8'), 'Drac Q: heads up, jaws open');
  run(`clearPhotoKeys(); setView(false); animStage(1/60,clock/BEAT,1);`);
  console.log('photo Q rears up, E kicks, Drac Q roars ok');
}

{
  run(`var switchedWalker=newWalker(0,0,0), switchedPose=newDracPose();
    manualDracStep(switchedWalker,switchedPose,1/60,0,{x:0,z:0,yaw:0,vx:0,vz:0},DRAC_SCALE,false);
    manualDracStep(switchedWalker,switchedPose,1/60,0,{x:4,z:0,yaw:0,vx:0,vz:0},DRAC_SCALE,true);`);
  assert(run('switchedWalker.feet.every(f=>Math.abs(f.x-4)<0.01) && switchedWalker.local.every(f=>f.lift===0)'), 'swapping back plants shoes at the new spot; reduced motion has no idle stepping');
  console.log('returning Drac feet ok');
}

// The driven figure is alone on the plaça and stays put without keys, before and after Tab.
{
  run(`G.state='select'; selectScreen.figure = selectedFigure; selectScreen.pending = false; setFigureSong(MULASSA); animStage(1/60,0); setView(true); takeFigure(selectedFigure.id); animStage(1/60,0);
    clearPhotoKeys(); var idleM=M.pos.clone();
    for(let i=0;i<180;i++){clock+=1/60;animStage(1/60,clock/BEAT);}`);
  assert(run('M.pos.distanceTo(idleM)<1e-6 && !drac.root.visible'), 'controlled Mulassa stays put without keys, no Drac beside her');
  run(`photoKey({code:'Tab',preventDefault(){}},true); animStage(1/60,clock/BEAT);
    idleM=M.pos.clone();
    for(let i=0;i<180;i++){clock+=1/60;animStage(1/60,clock/BEAT);}`);
  assert(run('M.pos.distanceTo(idleM)<1e-6 && drac.root.visible && !mula.root.visible'), 'controlled Drac stays put without keys, alone');
  run('setView(false); animStage(1/60,clock/BEAT);');
  console.log('one driven figure at a time ok');
}

{
  run(`G.state='select'; setFigureSong(MULASSA); M.air=0; M.airV=0; setView(true); takeFigure(selectedFigure.id); animStage(1/60,clock/BEAT);
    photoKey({code:'Space',preventDefault(){}},true); var photoJump=0;
    for(let i=0;i<90;i++){clock+=1/60;animStage(1/60,clock/BEAT);photoJump=Math.max(photoJump,M.air);}`);
  assert(run('photoJump>.5 && M.air===0'), 'Space jumps and lands without accumulating lift');
  run(`photoKey({code:'Tab',preventDefault(){}},true); setTrauma(0); var dracUp=0, dracShake=0, booms=0, dracFire=0; chip={menu(){},sfx(k){if(k==='gran')booms++;}};
    photoKey({code:'Space',preventDefault(){}},true);
    for(let i=0;i<90;i++){clock+=1/60;animStage(1/60,clock/BEAT);dracUp=Math.max(dracUp,drac.root.parent.position.y);dracShake=Math.max(dracShake,Math.abs(manualLandingStrength()));dracFire=Math.max(dracFire,DRAC_POSE.fire);}`);
  assert(run('dracUp>.5 && drac.root.parent.position.y===0 && M.air===0'), 'Space jumps the whole Drac (not her) and lands it');
  assert(run('dracShake===.9 && booms===0'), 'its manual landing stays silent with the original Drac strength');
  assert(run('dracFire>2 && PHOTO.drac.fire===0'), 'it breathes fire as it takes off, and the flame dies away');
  run(`setView(false); animStage(1/60,clock/BEAT); chip=null; setTrauma(0);`);
  console.log('photo Space jumps for both figures; silent Drac landing preserves the shake ok');
}

{
  assert(run('photoFixedClearance(10,0,0,false)>0 && photoFixedClearance(plaza.inner,0,0,false)<0'), 'actual plaza bounds replace the circular fence');
  console.log('open plaza bounds are reachable');
}

{
  run(`G.state='select';setFigureSong(MULASSA);M.pos.set(0,0);M.yaw=Math.atan2(MID.fx,MID.fz);M.pivot.set(Math.sin(M.yaw)*PIVOT,Math.cos(M.yaw)*PIVOT);S.yaw.x=S.yaw.t=M.yaw;S.yaw.v=0;
    setView(true); takeFigure(selectedFigure.id);animStage(1/60,clock/BEAT);PHOTO.keys.add('KeyW');PHOTO.keys.add('ShiftLeft');var extrasMoved=0,extraMaxStep=0,travelClear=99;
    for(let i=0;i<480;i++){clock+=1/60;animStage(1/60,clock/BEAT);animCrowd(1/60,clock/BEAT,0,1);
      travelClear=Math.min(travelClear,photoSafe(M.pos.x,M.pos.y,M.yaw));
      for(const p of photoExtras)extrasMoved=Math.max(extrasMoved,Math.hypot(p.pos.x-p.homeX,p.pos.y-p.homeZ));}
  `);
  assert(run('extrasMoved>.1'), 'the instanced spectators also yield');
  assert(run('M.pos.length()>7'), `walk through the old fence towards the dense audience: ${run('M.pos.length()')}`);
  assert(run('travelClear>-.08'), `passage keeps visible collision clearance: ${run('travelClear')}`);
  // 15 s: since the trees block only by their trunk her path into the crowd differs, and the last ones need ~10-15 s home
  run(`setView(false);animStage(1/60,clock/BEAT);
    for(let i=0;i<900;i++){clock+=1/60;animStage(1/60,clock/BEAT);animCrowd(1/60,clock/BEAT,0,1);}
    var extrasAway=photoExtras.filter(p=>Math.hypot(p.pos.x-p.homeX,p.pos.y-p.homeZ)>.01||Math.abs(p.vx)+Math.abs(p.vz)>=.001).length;`);
  assert.equal(run('extrasAway'), 0, 'after free play every instanced spectator is home and still (no per-frame collision search left running)');
  console.log('dense crowd passage and yielding floor spectators ok');
}

// A spectator pressed against a tree must slide away while either figure keeps asking to walk.
{
  run(`var passageSavedCrowd=activeCrowd, passageSavedProps=plaza.props, passageSavedBand=bandSpots,
    passageSavedExtras=photoExtras.slice(), passageSavedSource=photoBandSource,
    passageBackdropCount=plaza.backdrop.mesh.count, passageMidCount=midCrowd.mesh.count;
    var trappedPerson=activeCrowd[0], trappedRadius=trappedPerson.rad, trappedSootT=trappedPerson.sootT, trappedSootW=trappedPerson.sootW;
    activeCrowd=[trappedPerson];bandSpots=[];photoBandSource=bandSpots;photoExtras.length=0;
    plaza.backdrop.mesh.count=midCrowd.mesh.count=0;plaza.props=[{x:15.2,z:-3,r:2.2,h:4,hit:2.2}];trappedPerson.rad=.52;`);
  for (const id of ['mulassa-valls', 'drac-valls']) for (const floor of [false, true]) for (const charred of [false, true]) {
    const scenario = `${id}, ${floor ? 'floor' : 'live'}, ${charred ? 'charred' : 'normal'}`;
    run(`G.state='select';setView(false);setFigureSong(MULASSA);setView(true);takeFigure('${id}');setPhotoControl(true, '${id}');
      activeCrowd=${floor ? '[]' : '[trappedPerson]'};photoExtras.length=0;
      if(${floor})photoExtras.push({pos:trappedPerson.pos,rad:trappedPerson.rad,vx:0,vz:0,band:trappedPerson,offsetX:0,offsetZ:0});
      PHOTO.ready=true;PHOTO.cameraYaw=Math.atan2(MID.fx,MID.fz)+Math.PI;
      Object.assign(photoBody(),{x:9.4,z:-1.52,yaw:Math.atan2(MID.fx,MID.fz),vx:0,vz:0});
      trappedPerson.pos.set(12.5273,-2.4943);trappedPerson.gx=12.5273;trappedPerson.gz=-2.4943;trappedPerson.vel.set(0,0);trappedPerson.g.position.set(12.5273,0,-2.4943);trappedPerson.sootT=${charred ? 4 : 0};trappedPerson.sootW=${charred ? 1 : 0};
      if(${charred})sootTake(trappedPerson);
      PHOTO.keys.add('KeyW');var trappedStart=photoBody().x,trappedMoved=0,trappedMin=99,trappedTreeMin=99,trappedMaxStep=0;
      for(let i=0;i<180;i++){var oldX=photoBody().x,oldZ=photoBody().z;clock+=1/60;
        animStage(1/60,clock/BEAT);animCrowd(1/60,clock/BEAT,0,1);
        trappedMoved=Math.max(trappedMoved,Math.hypot(trappedPerson.pos.x-12.5273,trappedPerson.pos.y+2.4943));
        trappedMin=Math.min(trappedMin,photoClearance(photoBody().x,photoBody().z,photoBody().yaw,${floor ? 'trappedPerson.g.position.x' : 'trappedPerson.gx'},${floor ? 'trappedPerson.g.position.z' : 'trappedPerson.gz'},trappedPerson.rad,PHOTO.id==='drac-valls'));
        trappedTreeMin=Math.min(trappedTreeMin,Math.hypot(trappedPerson.pos.x-15.2,trappedPerson.pos.y+3)-2.72);
        trappedMaxStep=Math.max(trappedMaxStep,Math.hypot(photoBody().x-oldX,photoBody().z-oldZ));}`);
    assert(run('photoBody().x-trappedStart>.4'), `${scenario}: held W advances after the spectator clears the tree (${run('photoBody().x-trappedStart')})`);
    assert(run('trappedMoved>.6'), `${scenario}: the trapped spectator finds room beside the tree`);
    assert(run('trappedTreeMin>=-1e-5 && trappedMin>=-.03'), `${scenario}: neither the tree nor the visible spectator is crossed ${run('JSON.stringify([trappedTreeMin,trappedMin])')}`);
    assert(run('trappedMaxStep<=PHOTO_RUN.trot/60+1e-6'), `${scenario}: opening the path never teleports the figure`);
    run('var earlyYield=new THREE.Vector2();photoEscape(photoBody().x+Math.sin(photoBody().yaw)*7.5,photoBody().z+Math.cos(photoBody().yaw)*7.5,earlyYield);');
    assert(run('earlyYield.fear>0'), `${scenario}: the corridor opens ahead of the walking figure`);
    if (charred) assert(run('trappedPerson.sootW===1 && trappedPerson.sootT===4'), `${scenario}: stepping aside preserves the soot effect`);
    run('setView(false);animStage(1/60,clock/BEAT);');
  }
  // Resolving a crowded pair may move the outer person; it must not push the inner one into the figure.
  run(`var crowdNeighbour=passageSavedCrowd[1], neighbourRadius=crowdNeighbour.rad;
    setPhotoControl(true, 'drac-valls');Object.assign(photoBody(),{x:0,z:0,yaw:0});
    activeCrowd=[trappedPerson,crowdNeighbour];photoExtras.length=0;plaza.props=[];
    trappedPerson.rad=crowdNeighbour.rad=.52;trappedPerson.sootT=trappedPerson.sootW=crowdNeighbour.sootT=0;
    trappedPerson.pos.set(1.95,0);crowdNeighbour.pos.set(2.9,0);trappedPerson.vel.set(0,0);crowdNeighbour.vel.set(0,0);
    animCrowd(0,0,0,1);`);
  assert(run('photoClearance(0,0,0,trappedPerson.pos.x,trappedPerson.pos.y,.52,true)>=-1e-6'), 'neighbour separation preserves clearance to the figure');
  assert(run('trappedPerson.pos.distanceTo(crowdNeighbour.pos)>=1.08-1e-6'), 'the outside spectator makes the remaining room');
  run(`setPhotoControl(false);crowdNeighbour.rad=neighbourRadius;
    trappedPerson.rad=trappedRadius;trappedPerson.sootT=trappedSootT;trappedPerson.sootW=trappedSootW;activeCrowd=passageSavedCrowd;plaza.props=passageSavedProps;bandSpots=passageSavedBand;
    photoBandSource=passageSavedSource;photoExtras.length=0;photoExtras.push(...passageSavedExtras);
    plaza.backdrop.mesh.count=passageBackdropCount;midCrowd.mesh.count=passageMidCount;`);
  console.log('held WASD clears a spectator trapped against scenery for both figures');
}

// Manual camera: one centre, independent of the selector dock, throughout locomotion and at the plaza edge.
{
  run(`G.state='select';setView(true); takeFigure(selectedFigure.id);animStage(1/60,0);camera.setViewOffset(1280,800,0,160,1280,800);
    for(let i=0;i<180;i++)framePhotoCamera(1/60);
    var cameraError=0,cameraStep=0,photoCameraPrevious=camera.position.clone();
    for(let i=0;i<180;i++){
      PHOTO.mula.x+=.02;PHOTO.mula.z+=.01;framePhotoCamera(1/60);camera.updateMatrixWorld(true);
      var projectedPhoto=new THREE.Vector3(PHOTO.mula.x,PHOTO_CAM.aimY[PHOTO.id],PHOTO.mula.z).project(camera);
      cameraError=Math.max(cameraError,Math.hypot(projectedPhoto.x,projectedPhoto.y));
      cameraStep=Math.max(cameraStep,camera.position.distanceTo(photoCameraPrevious));photoCameraPrevious.copy(camera.position);
    }`);
  assert(run('cameraError<.002 && cameraStep<.05 && !camera.view.enabled'), `centred camera while walking: ${run('JSON.stringify([cameraError,cameraStep])')}`);
  run(`PHOTO.mula.x=plaza.inner-2;PHOTO.mula.z=0;PHOTO.cameraYaw=Math.PI/2;PHOTO.zoom=20;
    for(let i=0;i<180;i++)framePhotoCamera(1/60);camera.updateMatrixWorld(true);
    var edgeProjection=new THREE.Vector3(PHOTO.mula.x,PHOTO_CAM.aimY[PHOTO.id],0).project(camera);`);
  assert(run('camera.position.x<=plaza.inner-.54 && Math.hypot(edgeProjection.x,edgeProjection.y)<.002'), 'wall compresses camera boom without moving the centre');
  run(`setView(false);releasePhotoCamera();PHOTO.mula.x=0;PHOTO.mula.z=0;camera.position.set(0,14,6);camFocus.set(0,1.2,0);
    var wowStart=camera.position.clone();setView(true); takeFigure(selectedFigure.id);framePhotoCamera(1/60);
    var wowStep=camera.position.distanceTo(wowStart);for(let i=0;i<180;i++)framePhotoCamera(1/60);camera.updateMatrixWorld(true);
    var wowPitch=Math.asin((camera.position.y-camFocus.y)/camera.position.distanceTo(camFocus)),wowBody=new THREE.Vector3(0,1.4,0).project(camera).y;`);
  assert(run('wowStep<.5 && Math.abs(wowPitch-PHOTO_CAM.pitch)<.01 && Math.abs(camera.position.distanceTo(camFocus)-PHOTO_CAM.zoom)<.05 && wowBody<-.1'), `WoW framing eases in, body below the centre: ${run('JSON.stringify([wowStep,wowPitch,wowBody])')}`);
  run(`setView(false);releasePhotoCamera();`);
  assert(run('Number.isFinite(orbit.yaw) && !photoRig.on'), 'exit hands a valid camera back to the menu');
  console.log('manual camera stays centred in motion, ignores menu offset and compresses at walls');
}

// Visible-but-blurred menus used to advance the demo against a suspended audio clock.
{
  run("G.state = 'select'; G.paused = false; G.resuming = null; setView(false); setFigureSong(DRAC); var returningSounds = []; chip = { suspend() { this.ctx.suspend(); }, sfx: k => returningSounds.push(k), wake() {}, ctx: { state: 'suspended', suspend() {} } }; last = 1000;");
  const before = run('clock');
  document.focused = false;
  run('frame(2000); frame(122000);');
  assert.equal(run('clock'), before, 'short and long unfocused frames cannot advance the demo');
  document.focused = true;
  run('frame(122016);');
  assert.equal(run('clock'), before, 'the returning frame consumes no background delta');
  run('frame(122032);');
  assert(run('clock > ' + before), 'the next active frame advances normally');
  run("sheets.select.pending = true; SHOWCASE.crema = true; frame(122048);");
  assert(run('!mula.root.visible && !drac.root.visible && dracFx.idle && !SHOWCASE.crema'), 'pending hides both models and clears a queued showcase and all effects');
  run('sheets.select.pending = false; frame(122064);');
  assert(run('drac.root.visible'), 'returning to a playable Drac restores the model');
  run('SHOWCASE.crema = true; dracFrame(1/60, 0);');
  assert.equal(run('returningSounds.length'), 0, 'even a pending demo burst consumed after focus returns cannot request sound');
  console.log('background demo time and pending effect lifecycle ok');
}

verifyJumpImpact(run, assert);
verifyManualSway(run, assert);

{
  const savedTimer = context.setTimeout, timers = [];
  context.setTimeout = fn => timers.push(fn);
  run('G.paused = false; var delayedEffects = 0; afterActive(700, () => delayedEffects++);');
  document.focused = false; windowHandlers.blur.forEach(fn => fn());
  document.focused = true; windowHandlers.focus.forEach(fn => fn());
  timers.splice(0).forEach(fn => fn());
  assert.equal(run('delayedEffects'), 0, 'an overdue callback cannot fire after returning to foreground');
  run('afterActive(700, () => delayedEffects++);'); timers.splice(0).forEach(fn => fn());
  assert.equal(run('delayedEffects'), 1, 'uninterrupted delayed effects still fire');
  context.setTimeout = savedTimer;
}

// The showreel's idle screen (ui/reel-idle.js): untouched on the selector, its UI fades (she keeps her framing);
// any move brings it back; never in photo mode.
{ let it = 300000; const idleFrames = n => { for (let i = 0; i < n; i++) run(`frame(${it += 1000 / 60})`); };
  run("var idleSel = sheets.select; sheets.select = { pending: false, figure: MULASSA, visible() {}, sheetOpen: false, band: { top: 300, bottom: 600 } }; setView(false); G.state = 'select'; setFigureSong(MULASSA);"); windowHandlers.pointermove.forEach(h => h({})); idleFrames(30);
  assert(run('REEL.on && !reelIdleOn'), 'showreel: the selector stays while it was just touched');
  idleFrames(Math.ceil(run('REEL_IDLE.after') * 60) + 30);
  assert(run('reelIdleOn'), 'showreel idle: untouched, the UI fades and the dance has the screen');
  windowHandlers.pointermove.forEach(h => h({})); idleFrames(1);
  assert(run('!reelIdleOn'), 'showreel idle: a move brings the selector back at once');
  idleFrames(Math.ceil(run('REEL_IDLE.after') * 60) + 30); // the press that wakes it only wakes it: it, its up and its click never reach the game
  const ptr = type => { const e = { type, pointerId: 7, cancelable: true, stopped: false, stopImmediatePropagation() { this.stopped = true; }, preventDefault() {} }; windowHandlers[type].forEach(h => h(e)); return e.stopped; };
  assert(ptr('pointerdown') && run('!reelIdleOn') && ptr('pointerup') && ptr('click'), 'showreel idle: the waking tap is swallowed whole');
  assert(!ptr('pointerdown') && !ptr('pointerup') && !ptr('click'), 'showreel idle: the next tap is a real one');
  idleFrames(1); assert(run('!reelIdleOn'), 'awake after that tap');
  // leaving the page puts the selector back (everything pauses), and coming back the time away never counts
  idleFrames(Math.ceil(run('REEL_IDLE.after') * 60) + 30); assert(run('reelIdleOn'));
  document.focused = false; (windowHandlers.blur || []).forEach(h => h());
  assert(run('!reelIdleOn'), 'showreel idle: leaving the page brings the selector back');
  it += 60000; document.focused = true; (windowHandlers.focus || []).forEach(h => h()); idleFrames(2);
  assert(run('!reelIdleOn'), 'showreel idle: a minute away is not idleness');
  run('setView(true);'); idleFrames(Math.ceil(run('REEL_IDLE.after') * 60) + 30);
  assert(run('!reelIdleOn'), 'showreel idle: never in photo mode');
  run('setView(false);'); console.log('showreel idle screen ok');
// The showreel never shoots over an attendant's shoulder: over a stretch of her dance (runs to the attendants' marks
// included), no colla helper between the lens and her stands near the line of sight.
run(`frame(${it += 1000 / 60})`); // (leaving photo mode hands its camera over: the player's angle, held for a while)
run('var shoulder = { worst: 9, seen: 0 }; orbit.ptrs.clear(); orbit.last = -Infinity;'); // (and the mock clock never moves past it)
const shoulderCheck = `{ const v = new THREE.Vector3(), cx = camFocus.x, cz = camFocus.z, yaw = Math.atan2(camera.position.x - cx, camera.position.z - cz), hd = Math.hypot(camera.position.x - cx, camera.position.z - cz);
  for (const p of mulaColla.crew) { p.g.getWorldPosition(v); const dx = v.x - cx, dz = v.z - cz; if (dx * dx + dz * dz > hd * hd) continue; shoulder.seen++;
    shoulder.worst = Math.min(shoulder.worst, Math.abs(Math.atan2(Math.sin(yaw - Math.atan2(dx, dz)), Math.cos(yaw - Math.atan2(dx, dz))))); } }`;
// (and its cuts dissolve: the copy that fades out is taken in the outgoing shot's camera, before the cut moves it)
run("var fades = [], cutSettle = [], seenFades = 0, cutLast = false, lastCam = camera.position.clone(); document.getElementById('reel-fade').animate = () => (fades.push(camera.position.distanceTo(lastCam)), { cancel() {} });");
// (and the frame after a cut holds the new shot: no second step: the cut was aimed at the old shot's distance)
for (let i = 0; i < 60 * 40; i++) { run(`frame(${it += 1000 / 60}); if (cutLast) cutSettle.push(camera.position.distanceTo(lastCam)); cutLast = fades.length > seenFades; seenFades = fades.length; lastCam.copy(camera.position);`); if (i % 4 === 0 && !run('orbit.ptrs.size')) run(shoulderCheck); }
const fades = JSON.parse(run('JSON.stringify(fades)'));
const cutSettle = JSON.parse(run('JSON.stringify(cutSettle)'));
assert(cutSettle.length > 0 && cutSettle.every(d => d < 0.1), `showreel: one step per cut, the next frame holds it (${JSON.stringify(cutSettle.map(d => +d.toFixed(3)))})`);
assert(fades.length > 0 && fades.every(d => d < 1e-6), `showreel: every cut dissolves from the outgoing shot (${fades.length} cuts, ${JSON.stringify(fades)})`);
// a figure change is one plain cut: its "outgoing shot" would already show the new figure (the owner saw two shot changes)
run("fades.length = 0; setSelectedFigure('drac-valls');"); windowHandlers.pointermove.forEach(h => h({}));
const swapMoves = []; for (let i = 0; i < 4; i++) { run(`lastCam.copy(camera.position); frame(${it += 1000 / 60});`); swapMoves.push(run('camera.position.distanceTo(lastCam)')); }
assert(run('REEL.id') === 'drac-valls' && run('fades.length') === 0, 'showreel: a figure change cuts without a dissolve');
// and that cut is final in its own frame: the new figure measured where it stands now (a provisional frame, then a snap)
assert(swapMoves[0] > 0.3 && swapMoves.slice(1).every(d => d < 0.1), `showreel: a figure change is one step (${JSON.stringify(swapMoves.map(d => +d.toFixed(3)))})`);
// the Drac's close-up (beats 96-104: in on a long lens at the orbit's nearest, out to a wide shot) is one step each way too
run('sheets.select.band = { top: 430, bottom: 600, hardTop: 60, left: 0, right: 1280 }; REEL.anchor = REEL.acc + SHOWREELS[DRAC.id].start - 93; cutSettle.length = 0; seenFades = fades.length; cutLast = false;');
windowHandlers.pointermove.forEach(h => h({})); // (awake: the selector's band, not the idle screen's)
for (let i = 0; i < 60 * 6; i++) run(`frame(${it += 1000 / 60}); if (cutLast) cutSettle.push(camera.position.distanceTo(lastCam)); cutLast = fades.length > seenFades; seenFades = fades.length; lastCam.copy(camera.position);`);
const dracSettle = JSON.parse(run('JSON.stringify(cutSettle)'));
assert(dracSettle.length >= 2 && dracSettle.every(d => d < 0.1), `showreel: the Drac's close-up cuts in and out in one step (${JSON.stringify(dracSettle.map(d => +d.toFixed(3)))})`);
run("setSelectedFigure('mulassa-valls');"); for (let i = 0; i < 3; i++) run(`frame(${it += 1000 / 60});`);
const sh = JSON.parse(run('JSON.stringify(shoulder)'));
assert(sh.seen > 0 && sh.worst > 0.3, `showreel: no attendant over the lens's shoulder (closest ${sh.worst.toFixed(2)} rad off the line of sight)`);
run('sheets.select = idleSel;'); console.log('showreel clear of the attendants ok'); }
