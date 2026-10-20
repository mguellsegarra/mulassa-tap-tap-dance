// Executed by render-quality's real motion/camera VM, also callable in a short isolated harness.
export function verifyJumpImpact(run, assert) {
  const results = [];
  for (const fps of [30, 60, 120]) for (const id of ['mulassa-valls', 'drac-valls']) {
    run(`G.state='select'; G.paused=false; G.collapseT=0; CALM.matches=false; setFigureSong(MULASSA);
      setView(false); setView(true); setPhotoControl(true,${JSON.stringify(id)},false);
      animMula(1/${fps},0); resetMotionImpact(); PHOTO.action=true;
      var impactRows=[], impactPulses=0, impactPrevious=0;
      for(let i=1;i<=${fps}*1.5;i++) {
        clock+=1/${fps}; animMula(1/${fps},clock/BEAT);
        const air=PHOTO.id==='mulassa-valls'?M.air:drac.root.parent.position.y;
        if(trauma>impactPrevious+1e-9)impactPulses++;
        impactRows.push({t:i/${fps},air,trauma}); impactPrevious=trauma;
        setTrauma(Math.max(0,trauma-1.6/${fps}));
        if(i<${fps}*.5) PHOTO.action=true; // repeated input in flight cannot stack or restart it
      }`);
    const rows = run('impactRows'), contact = rows.find(r => r.trauma > 0);
    assert.equal(run('impactPulses'), 1, `${id}, ${fps} Hz: one landing impulse`);
    assert(contact && contact.air === 0, 'impact belongs to ground contact');
    assert(contact.t >= 4.8 / 7 && contact.t <= 4.8 / 7 + 1 / fps + 1e-9, 'physical flight time within one frame');
    assert(rows.filter(r => r.air > 0).every(r => r.trauma === 0), 'no shake at takeoff or in flight');
    const peak = Math.max(...rows.map(r => r.trauma));
    assert(Math.abs(peak - (id === 'mulassa-valls' ? .98 : .9)) < 1e-9, `${id}: bounded intended strength`);
    assert.equal(rows.at(-1).trauma, 0, 'fully settled; no accumulation');
    assert(rows.filter(r => r.t > contact.t + .62).every(r => r.trauma === 0), 'decay ends within 620 ms');
    results.push({ id, fps, contact: contact.t, peak });
  }
  run(`// Switching, leaving control, changing mode and backgrounding abandon an unfinished jump silently.
    var impactCancel=[];
    for(const id of ['mulassa-valls','drac-valls']) for(const kind of ['tab','view','mode','background']) {
      G.state='select'; setPhotoControl(true,id,false); animMula(1/60,0); PHOTO.action=true;
      for(let i=0;i<10;i++){clock+=1/60;animMula(1/60,0);}
      if(kind==='tab')photoKey({code:'Tab',preventDefault(){}},true);
      if(kind==='view')setPhotoControl(false);
      if(kind==='mode')G.state='results';
      if(kind==='background')resetFrameTime();
      var cancelledPeak=0;
      for(let i=0;i<60;i++){clock+=1/60;animMula(1/60,0);cancelledPeak=Math.max(cancelledPeak,trauma);}
      impactCancel.push(cancelledPeak);
    }`);
  assert(run('impactCancel.every(v=>v===0)'), 'no stale landing on Tab, exit, mode change or background');
  run(`setPhotoControl(false); G.state='play'; animMula(1/60,0);
    M.air=.18; M.airV=-3; G.state='results'; var resultImpact=0;
    for(let i=0;i<60;i++){clock+=1/60;animMula(1/60,0);resultImpact=Math.max(resultImpact,trauma);}`);
  assert(run('resultImpact===0 && M.air===0'), 'a game accent cannot land later on the results screen');
  run(`G.state='select'; CALM.matches=true; setPhotoControl(true,'mulassa-valls',false); animMula(1/60,0);
    PHOTO.action=true; var calmImpact=0;
    for(let i=0;i<90;i++){clock+=1/60;animMula(1/60,0);calmImpact=Math.max(calmImpact,trauma);}
    var savedCamera=camera.position.clone(); applyCameraImpact(1); var calmCamera=camera.position.distanceTo(savedCamera);
    clearCameraImpact(); CALM.matches=false; setPhotoControl(true,'drac-valls',false); animMula(1/60,0);
    PHOTO.action=true; animMula(1/60,0); var pausedAir=DRAC_JUMP.air; G.paused=true;
    for(let i=0;i<30;i++)animMula(0,0);`);
  assert(run('calmImpact===0 && calmCamera===0'), 'reduced motion suppresses all camera shake');
  assert(run('DRAC_JUMP.air===pausedAir && trauma===0'), 'paused flight neither advances nor lands');
  run(`G.paused=false; resetMotionImpact(); clearCameraImpact(); CALM.matches=false;
    var cameraBase=camera.position.clone(), impactMaxOffset=0;
    for(let i=0;i<180;i++){
      clock+=1/60; clearCameraImpact(); applyCameraImpact(Math.max(0,.98-i/60*1.6));
      impactMaxOffset=Math.max(impactMaxOffset,camera.position.distanceTo(cameraBase));
    }
    clearCameraImpact();`);
  assert(run('impactMaxOffset<=Math.hypot(.25,.2)*.98**2+1e-9'), 'camera translation bounded independently of frame count');
  assert(run('camera.position.distanceTo(cameraBase)<1e-9'), 'zero residual offset feeds the camera rig');
  run(`G.paused=true; applyCameraImpact(1); var pausedOffset=camera.position.distanceTo(cameraBase);
    clearCameraImpact(); G.paused=false; setPhotoControl(false); G.state='select'; animMula(1/60,0);`);
  assert(run('pausedOffset<1e-9'), 'no camera shake while paused');
  console.log('jump impact: contact, single pulse, bounds, 30/60/120 Hz, cancellation, reduced motion and camera isolation ok', JSON.stringify(results));
  return results;
}
