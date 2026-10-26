// Runs against the real motion and rig in render-quality's VM, including input, Shift, supports and camera.
export function verifyManualSway(run, assert) {
  const measured = [];
  for (const fps of [30, 60, 120]) for (const id of ['drac-valls', 'mulassa-valls']) {
    run(`G.state='select'; G.paused=false; G.collapseT=0; CALM.matches=false; setFigureSong(MULASSA);
      setView(false); setView(true); setPhotoControl(true,${JSON.stringify(id)},false);
      var swayCrowd=activeCrowd; activeCrowd=[];
      animStage(1/${fps},0); clearPhotoKeys(); resetMotionImpact();
      Object.assign(photoBody(),{x:0,z:-4,yaw:0,vx:0,vz:0}); PHOTO.ready=true; PHOTO.cameraYaw=Math.PI;
      M.pos.set(0,-4); M.yaw=0; for(const s of Object.values(S))s.x=s.v=s.t=0;
      var swayRows=[], swayMatrix=new THREE.Matrix4(), swayFoot=new THREE.Vector3();
      for(let i=0;i<${fps}*6;i++) {
        const t=i/${fps}; PHOTO.keys.clear();
        if(t>=1&&t<3)PHOTO.keys.add('KeyW');
        if(t>=2&&t<3)PHOTO.keys.add('ShiftLeft');
        clock+=1/${fps};animStage(1/${fps},t*2);framePhotoCamera(1/${fps});
        const r=PHOTO.id==='drac-valls'?drac:mula; camera.updateMatrixWorld();r.root.updateMatrixWorld(true);
        let sole=Infinity;
        if(PHOTO.id==='drac-valls')for(const leg of drac.legs)sole=Math.min(sole,swayFoot.set(0,0,0).applyMatrix4(leg.shoe.matrixWorld).y);
        else for(let j=0;j<8;j++){
          mulaCarriers.shoes.getMatrixAt(j,swayMatrix);swayMatrix.premultiply(mula.root.matrixWorld);
          sole=Math.min(sole,swayFoot.set(0,-0.075/2,0).applyMatrix4(swayMatrix).y);
        }
        swayRows.push({t,roll:r.body.rotation.z,x:photoBody().x,z:photoBody().z,yaw:photoBody().yaw,
          height:PHOTO.id==='drac-valls'?drac.body.position.y*DRAC_SCALE:mula.root.position.y,sole,
          horizon:camera.matrixWorld.elements[1],camY:camFocus.y, speed:PHOTO.speed});
      }
      activeCrowd=swayCrowd;clearPhotoKeys();setView(false);`);
    const rows = run('swayRows'), amplitude = (a,b) => Math.max(...rows.filter(r=>r.t>=a&&r.t<b).map(r=>Math.abs(r.roll)));
    const walk = amplitude(1.5,2), gallop = amplitude(2.6,3), rest = amplitude(5,6);
    assert(walk > (id==='drac-valls' ? .045 : .017), `${id}/${fps}: visible walking weight transfer (${walk})`);
    assert(walk < (id==='drac-valls' ? .09 : .04) && gallop < .09, 'restrained lean, without stacked oscillations');
    assert(gallop > .018, 'Shift keeps a visible body rhythm');
    // the Mulassa standing does the song's comic layer (mula-dance.js MULA_COMIC: a 3 deg waddle)
    assert(rest > (id==='drac-valls' ? .06 : .045) && rest < (id==='drac-valls' ? .085 : .06), `${id}/${fps}: stopping returns to the menu sway (${rest})`);
    assert(rows.filter(r=>r.t>5).every(r=>r.speed<.001), 'idle dancing never moves the controlled figure');
    const idle=rows.filter(r=>r.t>5), dip=Math.max(...idle.map(r=>r.height))-Math.min(...idle.map(r=>r.height));
    assert(id==='drac-valls' ? dip>.02 && dip<.031 : dip>.04 && dip<.065, `${id}/${fps}: visible knee flex (${dip} m)`);
    assert(idle.every(r=>Math.abs(r.sole)<1e-6), 'idle knee flex preserves actual ground support');
    assert(rows.every(r=>Math.abs(r.x)<1e-8 && r.yaw===0), 'body sway cannot steer the input trajectory');
    assert(rows.filter(r=>r.t>2).every(r=>Math.abs(r.horizon)<1e-8 && Math.abs(r.camY-(id==='drac-valls'?3.2:3.3))<.002), 'camera aim and horizon ignore the body lean');
    assert(rows.slice(1).filter(r=>r.t>1).every((r)=>Math.abs(r.roll-rows[Math.round(r.t*fps)-1].roll)<.065), 'no one-frame body pop');
    measured.push({id,fps,walk,gallop,rest,dip});
  }
  for (const id of ['drac-valls','mulassa-valls']) {
    const p=measured.filter(r=>r.id===id);
    assert(Math.max(...p.map(r=>r.walk))/Math.min(...p.map(r=>r.walk))<1.2, `${id}: comparable lean at 30/60/120 Hz`);
  }
  console.log('manual body sway: walk/Shift/stop, unchanged heading/trajectory and level camera at 30/60/120 Hz', measured);
}
