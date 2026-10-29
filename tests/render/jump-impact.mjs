// Real motion/camera VM: manual ownership is independent of the selector/demo state.
export function verifyJumpImpact(run, assert) {
  const results = [];
  for (const fps of [30, 60, 120]) for (const id of ['mulassa-valls', 'drac-valls']) {
    run(`G.state='select'; G.paused=false; G.collapseT=0; CALM.matches=false; setFigureSong(MULASSA);
      setView(false); setView(true); setPhotoControl(true,${JSON.stringify(id)});
      animStage(1/${fps},0); resetMotionImpact(); PHOTO.action=true;
      var impactRows=[], impactPulses=0, impactPrevious=-1;
      for(let i=1;i<=${fps}*1.5;i++) {
        clock+=1/${fps}; animStage(1/${fps},clock/BEAT);
        const air=PHOTO.id==='mulassa-valls'?M.air:DRAC_JUMP.air;
        if(manualLanding && manualLanding.time!==impactPrevious){impactPulses++;impactPrevious=manualLanding.time;}
        impactRows.push({t:i/${fps},air,pulse:manualLandingStrength(),trauma,contact:manualLanding?.time===clock});
        if(i<${fps}*.5) PHOTO.action=true; // repeated input in flight cannot restart it
      }`);
    const rows = run('impactRows'), contact = rows.find(r => r.contact);
    assert.equal(run('impactPulses'), 1, `${id}, ${fps} Hz: exactly one landing`);
    assert(contact && contact.air === 0, 'impact starts at ground contact');
    assert(contact.t >= 4.8 / 7 && contact.t <= 4.8 / 7 + 1 / fps + 1e-9, 'unchanged physical flight time');
    assert(rows.filter(r => r.air > 0).every(r => r.pulse === 0), 'no takeoff or airborne shake');
    assert(rows.every(r => r.trauma === 0), 'manual jumps and autonomous companion never feed gameplay trauma');
    const peak = Math.max(...rows.map(r => Math.abs(r.pulse)));
    assert.equal(peak, id === 'mulassa-valls' ? .98 : .9, 'original per-figure manual landing strength');
    assert(rows.filter(r => r.t >= contact.t + peak / 1.6).every(r => r.pulse === 0), 'original decay settles within initial strength / 1.6 seconds');
    assert.equal(rows.at(-1).pulse, 0, 'fully settled');
    results.push({id,fps,contact:contact.t,peak});
  }
  for (const id of ['mulassa-valls','drac-valls']) {
    run(`G.state='select';setPhotoControl(true,${JSON.stringify(id)});animStage(1/60,0);resetMotionImpact();
      PHOTO.keys.add('KeyW');PHOTO.keys.add('ShiftLeft');var repeatedCount=0,repeatedStamp=-1,repeatedPeak=0;
      for(let i=0;i<270;i++){
        if(i%90===0)PHOTO.action=true;clock+=1/60;animStage(1/60,clock/BEAT);
        if(manualLanding && manualLanding.time!==repeatedStamp){repeatedCount++;repeatedStamp=manualLanding.time;}
        repeatedPeak=Math.max(repeatedPeak,Math.abs(manualLandingStrength()));
      }`);
    assert(run(`repeatedCount===3 && repeatedPeak===${id === 'mulassa-valls' ? .98 : .9} && manualLandingStrength()===0 && trauma===0`), `${id}: repeated jumps while sprinting settle separately without accumulating`);
  }
  run(`var impactCancel=[];
    for(const id of ['mulassa-valls','drac-valls']) for(const phase of ['flight','landed'])
    for(const kind of ['tab','view','mode','background','pause','keys']) {
      G.state='select'; G.paused=false; setPhotoControl(true,id); animStage(1/60,0); PHOTO.action=true;
      for(let i=0;i<(phase==='flight'?10:43);i++){clock+=1/60;animStage(1/60,0);}
      if(kind==='tab')photoKey({code:'Tab',preventDefault(){}},true);
      if(kind==='view')setPhotoControl(false);
      if(kind==='mode')G.state='results';
      if(kind==='background')resetFrameTime();
      if(kind==='pause')G.paused=true;
      if(kind==='keys')clearPhotoKeys();
      var cancelledPeak=Math.abs(manualLandingStrength());
      animStage(0,0); G.paused=false;
      for(let i=0;i<60;i++){clock+=1/60;animStage(1/60,0);cancelledPeak=Math.max(cancelledPeak,Math.abs(manualLandingStrength()));}
      impactCancel.push(cancelledPeak);
    }`);
  assert(run('impactCancel.every(v=>v===0)'), 'no residual or stale landing after control, focus or pause changes');
  run(`G.state='select';CALM.matches=true;setPhotoControl(true,'mulassa-valls');animStage(1/60,0);PHOTO.action=true;var calmImpact=0;
    for(let i=0;i<90;i++){clock+=1/60;animStage(1/60,0);calmImpact=Math.max(calmImpact,Math.abs(manualLandingStrength()));}
    clearCameraImpact();camera.position.set(0,5,10);camFocus.set(0,3,0);var cameraBase=camera.position.clone();applyCameraImpact(1);var calmOffset=camera.position.distanceTo(cameraBase);
    clearCameraImpact();CALM.matches=false;`);
  assert(run('calmImpact===0 && calmOffset===0'), 'reduced motion has no camera shake');
  run(`var cameraBound=0,focusBase=camFocus.clone(),springBase=JSON.stringify(titleS);
    for(let i=0;i<180;i++){
      clock+=1/120;manualLanding={origin:'manual-jump',startedAt:performance.now(),actor:PHOTO.id,epoch:PHOTO.epoch,inputEpoch:PHOTO.inputEpoch,time:clock-i/120};
      clearCameraImpact();applyCameraImpact(0);cameraBound=Math.max(cameraBound,camera.position.distanceTo(cameraBase));
    }
    clearCameraImpact();`);
  assert(run('cameraBound>.02 && cameraBound<=Math.hypot(.25,.2)*.98**2+1e-9'), 'camera translation hard bounded without accumulation');
  assert(run('camera.position.distanceTo(cameraBase)<1e-9 && camFocus.distanceTo(focusBase)===0 && JSON.stringify(titleS)===springBase'), 'zero residual; no framing target or spring mutation');
  for (const id of ['mulassa-valls','drac-valls']) assert.equal(new Set(results.filter(r=>r.id===id).map(r=>r.peak)).size, 1, 'identical initial strength at 30/60/120 Hz');
  run(`var savedImpactNow=performance.now;
    manualLanding={origin:'manual-jump',actor:PHOTO.id,epoch:PHOTO.epoch,inputEpoch:PHOTO.inputEpoch,time:clock,startedAt:0};
    performance.now=()=>620;var wallExpired=manualLandingStrength();performance.now=savedImpactNow;
    manualLanding={origin:'demo',actor:PHOTO.id,epoch:PHOTO.epoch,inputEpoch:PHOTO.inputEpoch,time:clock-.05,startedAt:performance.now()};
    var wrongOrigin=manualLandingStrength();
    manualLanding={origin:'manual-jump',actor:PHOTO.id==='drac-valls'?'mulassa-valls':'drac-valls',epoch:PHOTO.epoch,inputEpoch:PHOTO.inputEpoch,time:clock-.05,startedAt:performance.now()};
    var wrongActor=manualLandingStrength();
    manualLanding={origin:'manual-jump',actor:PHOTO.id,epoch:PHOTO.epoch,inputEpoch:PHOTO.inputEpoch,time:clock-.05,startedAt:performance.now()};
    camera.position.set(0,3,6);camFocus.set(0,3,0);var farBase=camera.position.clone();applyCameraImpact(0);var farPulse=camera.position.distanceTo(farBase);clearCameraImpact();
    camera.position.set(0,3,.6);var nearBase=camera.position.clone();applyCameraImpact(0);var nearPulse=camera.position.distanceTo(nearBase);clearCameraImpact();
    camera.position.copy(cameraBase);camFocus.copy(focusBase);`);
  assert(run('wallExpired===0 && wrongOrigin===0 && wrongActor===0'), 'real-time deadline and explicit manual actor/origin gating');
  assert(run('farPulse>.02 && nearPulse>0 && nearPulse<=farPulse*.101'), 'close camera attenuates the pulse instead of magnifying it');
  for (const id of ['mulassa-valls','drac-valls']) {
    run(`setPhotoControl(true,${JSON.stringify(id)});clock=1;camera.position.copy(cameraBase);camFocus.copy(focusBase);
      manualLanding={origin:'manual-jump',actor:PHOTO.id,epoch:PHOTO.epoch,inputEpoch:PHOTO.inputEpoch,time:clock,startedAt:performance.now()};
      applyCameraImpact(0);var originalX=camera.position.x-cameraBase.x,originalY=camera.position.y-cameraBase.y;clearCameraImpact();`);
    const strength = id === 'mulassa-valls' ? .98 : .9;
    assert(Math.abs(run('originalX') - Math.sin(47)*.25*strength**2)<1e-9 && Math.abs(run('originalY') - Math.sin(61)*.2*strength**2)<1e-9, `${id}: original camera waveform and amplitude`);
  }
  run(`G.paused=true;applyCameraImpact(1);var pausedOffset=camera.position.distanceTo(cameraBase);clearCameraImpact();G.paused=false;
    setPhotoControl(false);G.state='play';setTrauma(.5);applyCameraImpact(trauma);var gameOffset=camera.position.distanceTo(cameraBase);
    clearCameraImpact();resetMotionImpact();G.state='select';animStage(1/60,0);`);
  assert(run('pausedOffset<1e-9 && gameOffset>0'), 'pause clears shake; intentional gameplay trauma retained');
  // The landing's «BUUUM»: one sfx per landing at ground contact (never takeoff or flight), carrying the figure's weight
  // and the contact speed, an explicit free-mode action like the Drac's fire; nothing after a pause or in reduced motion.
  run(`var savedChip=chip,thuds=[];chip={sfx:(k,i,manual,w)=>thuds.push({k,i,manual,w,air:PHOTO.id==='mulassa-valls'?M.air:DRAC_JUMP.air})};`);
  const weights = {};
  for (const id of ['mulassa-valls', 'drac-valls']) {
    run(`thuds.length=0;G.state='select';G.paused=false;CALM.matches=false;setPhotoControl(true,${JSON.stringify(id)});animStage(1/60,0);resetMotionImpact();PHOTO.action=true;
      for(let i=1;i<=120;i++){clock+=1/60;animStage(1/60,clock/BEAT);if(i<30)PHOTO.action=true;}`);
    const thuds = run('thuds');
    assert.equal(thuds.length, 1, `${id}: one landing sound, repeated Space in flight adds none`);
    assert(thuds[0].k === 'thud' && thuds[0].manual === true && !thuds[0].air, `${id}: a thud at ground contact, an explicit action that sounds with the menu music off`);
    assert(thuds[0].i > 4.5 && thuds[0].i < 5.1, `${id}: carries the real contact speed`);
    weights[id] = thuds[0].w;
    // the touch jump button's pointerdown (ui/photo-stick.js) is photoPress('Space'): the same path as the key, so its landing sounds too
    run(`thuds.length=0;setPhotoControl(true,${JSON.stringify(id)});animStage(1/60,0);resetMotionImpact();photoPress('Space');
      for(let i=1;i<=120;i++){clock+=1/60;animStage(1/60,clock/BEAT);}`);
    assert.equal(run('thuds.length'), 1, `${id}: the touch jump button's landing sounds like the key's`);
    run(`thuds.length=0;setPhotoControl(true,${JSON.stringify(id)});animStage(1/60,0);PHOTO.action=true;
      for(let i=0;i<10;i++){clock+=1/60;animStage(1/60,0);}G.paused=true;animStage(0,0);G.paused=false;
      for(let i=0;i<60;i++){clock+=1/60;animStage(1/60,0);}`);
    assert.equal(run('thuds.length'), 0, `${id}: a jump cut short by a pause never lands audibly`);
    run(`CALM.matches=true;setPhotoControl(true,${JSON.stringify(id)});animStage(1/60,0);PHOTO.action=true;
      for(let i=0;i<60;i++){clock+=1/60;animStage(1/60,0);}CALM.matches=false;`);
    assert.equal(run('thuds.length'), 0, `${id}: reduced motion's small hop makes no impact sound`);
  }
  assert(weights['drac-valls'] > weights['mulassa-valls'] && weights['mulassa-valls'] > 0, 'the Drac lands heavier than the Mulassa, both from the figure data');
  run('chip=savedChip;resetMotionImpact();G.state=\'select\';animStage(1/60,0);');
  console.log('manual landing original strength: ownership, single contact, bounds, cleanup, reduced motion, camera isolation and 30/60/120 Hz ok', JSON.stringify(results));
  return results;
}
