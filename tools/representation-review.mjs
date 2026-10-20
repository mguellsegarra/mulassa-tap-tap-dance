// Bounded visual-regression capture, always against an existing local server. No server/process/service management.
// PLAYWRIGHT_MODULE and BROWSER_BIN may point at an existing installation; output belongs outside the checkout.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
const output = resolve(process.argv.find(s => s.startsWith('--output='))?.slice(9) ?? `${tmpdir()}/mulassa-representation-review`);
const origin = process.env.REVIEW_ORIGIN ?? 'http://localhost:5179';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)) throw Error('Review only supports a local server');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');
await mkdir(output, {recursive:true});
const baseline = process.argv.includes('--baseline') ? await readFile(`${output}/before/src__dev__representation-preview.js`, 'utf8') : null;
const launch = () => chromium.launch({ headless:true, ...(process.env.BROWSER_BIN ? {executablePath:process.env.BROWSER_BIN}:{}), args:['--use-angle=metal'] });
let browser;
const cases = process.argv.includes('--quick') ? [['splash',2,2,1280,800,7]] :
 [['splash',2,2,1280,800,9],['selector',2,2,1280,800,6],['drive',2,2,1280,800,9],['play',2,2,1280,800,5],['finale',2,2,1280,800,5],
  ['selector',1,2,1280,800,4],['selector',3,2,1280,800,4],['quality',2,2,1280,800,6],['selector',3,0,375,667,5]];
const onlyCase = process.argv.find(s => s.startsWith('--case='))?.slice(7);
const manifestFile = resolve(output,baseline?'before-manifest.json':'after-manifest.json');
const manifest=onlyCase ? JSON.parse(await readFile(manifestFile,'utf8').catch(e=>{if(e.code==='ENOENT')return '[]';throw e;})) : [];
const finaleTime=JSON.parse(await readFile(new URL('../src/song.json',import.meta.url),'utf8')).finale;
const reviewFailed = x => x.errors.length || !x.rasterStable || x.totals.mobilityFallFrames || x.totals.maxHandVelocity>9 || x.totals.maxRootVelocity>10 || x.totals.maxScaleStep>.15 || x.totals.shirtIntersections;
async function reviewIndex() {
 const rows=manifest.map(x=>`<tr><td><a href="${x.name}/recording.webm">${x.name}</a></td><td>${(x.totals.maxHandStep*100).toFixed(1)} cm</td><td>${x.totals.maxRootVelocity.toFixed(2)} m/s</td><td>${reviewFailed(x)?'REVISAR':'Passa les mesures'}</td><td><a href="${x.name}/start.png">Inici</a> · <a href="${x.name}/end.png">Final</a></td></tr>`).join('');
 await writeFile(resolve(output,baseline?'before-index.html':'index.html'),`<!doctype html><html lang="ca"><meta charset="utf-8"><title>Revisió del públic</title><style>body{font:16px system-ui;max-width:1100px;margin:24px auto;padding:0 16px}table{border-collapse:collapse;width:100%}td,th{padding:10px;text-align:left;border-bottom:1px solid #aaa}a{color:#1758a1}</style><h1>Revisió del públic</h1><p>Mesures acotades. Cal mirar els vídeos: passar aquests límits no certifica absència de tots els defectes visuals.</p><table><tr><th>Escena i vídeo</th><th>Pas màxim de mà</th><th>Velocitat màxima de l'arrel</th><th>Resultat</th><th>Captures</th></tr>${rows}</table></html>`);
}
try {
 for (const [mode,seed,quality,width,height,seconds] of cases) {
  if (onlyCase && !(onlyCase==='mobile' ? width<500 : mode===onlyCase)) continue;
  const name=`${baseline?'before':'after'}-${mode}-s${seed}-q${quality}-${width}`,dir=resolve(output,name);await mkdir(dir,{recursive:true});
  browser=await launch();
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});let page;
  try {
   await context.addInitScript(()=>{let s=424242;Math.random=()=>{s=(s+0x6d2b79f5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};});
   page=await context.newPage();const errors=[];page.on('pageerror',e=>{const message=e.stack??e.message;if(!errors.includes(message))errors.push(message);});
   const playParams=mode==='finale'?`&autoplay&from=${finaleTime}`:mode==='play'?'&autoplay':'';
   await page.goto(`${origin}/?mute&representation=${baseline?'off':'on'}&representationSeed=${seed}${playParams}`,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>window.__mulassaBooted===true);await page.locator('#loader').waitFor({state:'hidden',timeout:30000});
   if(baseline){
    const rewritten=baseline.replace(/from '(\.\.?\/[^']+)'/g,(_,path)=>`from '${new URL(path,origin+'/src/dev/representation-preview.js').href}'`).replace("from 'three'",`from '${origin}/node_modules/three/build/three.module.js'`);
    await page.evaluate(async url=>{const m=await import(url);m.setupRepresentationPreview();},'data:text/javascript;base64,'+Buffer.from(rewritten).toString('base64'));
   }
   await page.waitForFunction(()=>!!window.__representation);await page.evaluate(q=>__representation.quality(q),quality);
   if(mode!=='splash'){await page.keyboard.press('Enter');await page.waitForFunction(()=>__dbg.G.state==='select');}
   if(mode==='play'||mode==='finale'){await page.evaluate(()=>__dbg.choose(1));await page.waitForFunction(()=>__dbg.G.state==='play');}
   if(mode==='drive'){
    await page.keyboard.press('h');await page.locator('#photo-figs [data-id="mulassa-valls"]').click();
    await page.locator('#hud').click({position:{x:width/2,y:height/2}}); // release button focus before sending the actual driving keys
   }
   await page.screenshot({path:resolve(dir,'start.png')});
   const metadata=await page.evaluate(async()=>{
    const s=await import('/src/scene/stage.js'),state=await import('/src/game/state.js'),{PHOTO}=await import('/src/game/photo-control.js');
    const {OBB}=await import('/node_modules/three/examples/jsm/math/OBB.js');
    const {ARM}=await import('/src/scene/models/colla.js');
    const V=s.camera.position.constructor,entries=__representation.entries;
    if(new Set(entries.map(e=>`${e.role}:${e.id}`)).size!==entries.length)throw Error('Probe needs unique identifiers within each role');
    for(const e of entries)for(let i=0;i<e.p.arms.length;i++){
     const bone=e.role==='acompanyant'?e.p.arms[i].el:e.p.forearms?.[i]??e.p.arms[i];
     if(!bone?.isObject3D)throw Error(`Unsupported hand rig: ${e.role}:${e.id}`);
    }
    const previous=new Map(),begin=performance.now(),frames=[],suspects=[],old=s.scene.onBeforeRender;let frameCount=0;
    const totals={handSteps:0,maxHandVelocity:0,maxHandStep:0,maxRootVelocity:0,visibilityFlips:0,maxScaleStep:0,shirtIntersections:0,mobilityFallFrames:0,culadaFrames:0,fallFrames:0};
    window.__visualReview={frames,suspects,totals,stop(){s.scene.onBeforeRender=old;}};
    s.scene.onBeforeRender=function(...args){old.apply(this,args);const now=performance.now(),t=(now-begin)/1000;if(t>15)return;
     const f={t,people:[],shirtPairs:[],photo:PHOTO.on},boxes=[];
     if(PHOTO.culada)totals.culadaFrames++;
     for(let i=0;i<entries.length;i++){
      const e=entries[i],p=e.p,source=e.source,root=p.g.getWorldPosition(new V());
      const helper=e.role==='acompanyant';
      const hands=p.arms.map((a,j)=>new V(0,helper?-ARM.fore:p.forearms?-.21:-.49,0).applyMatrix4((helper?a.el:p.forearms?.[j]??a).matrixWorld).sub(root));
      const key=`${e.role}:${e.id}`;
      const point=new V(0,1,0).applyMatrix4(p.g.matrixWorld).project(s.camera),prev=previous.get(key),scale=p.g.scale.x;
      if(prev){const dt=state.clock-prev.clock;if(dt>=1/240&&dt<.08&&scale>.1&&prev.scale>.1){
       const jump=Math.max(...hands.map((h,j)=>h.distanceTo(prev.hands[j]))),v=jump/dt;
       totals.handSteps++;totals.maxHandVelocity=Math.max(totals.maxHandVelocity,v);totals.maxHandStep=Math.max(totals.maxHandStep,jump);
       const rootSpeed=root.distanceTo(prev.root)/dt;totals.maxRootVelocity=Math.max(totals.maxRootVelocity,rootSpeed);
       if(rootSpeed>10&&suspects.length<60)suspects.push({t,id:e.id,kind:'root',speed:rootSpeed,dt,screen:[point.x,point.y]});
       if(v>9&&suspects.length<60)suspects.push({t,id:e.id,kind:'hand',jump,dt,fall:source.fall||0,screen:[point.x,point.y]});
      }
      if((scale>.1)!==(prev.scale>.1))totals.visibilityFlips++;totals.maxScaleStep=Math.max(totals.maxScaleStep,Math.abs(scale-prev.scale));}
      if(source.avoidKnock&&(source.fall||source.downT||source.knockT))totals.mobilityFallFrames++;
      if(!source.avoidKnock&&source.fall>.1)totals.fallFrames++;
      previous.set(key,{now,clock:state.clock,hands,scale,root});
      const box=new OBB(new V(0,helper?1.05:.3,0),new V(helper ? .23 : .22*(p.spec?.bw??1),helper ? .33 : .3,(p.spec?.torsoD??.28)/2));box.applyMatrix4((helper?p.body:p.torso).matrixWorld);boxes.push(box);
      f.people.push({id:e.id,role:e.role,root:root.toArray(),scale,fall:source.fall||0,wheel:p.wheels?.[0]?.rotation.x??null,screen:[point.x,point.y],speed:source.spd});
     }
     if(frameCount++%3===0){for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)if((entries[i].role==='public'||entries[j].role==='public')&&f.people[i].scale>.1&&f.people[j].scale>.1&&boxes[i].intersectsOBB(boxes[j],1e-6)){totals.shirtIntersections++;f.shirtPairs.push([i,j]);}frames.push(f);}
    };
    const stream=document.querySelector('#gl').captureStream(30),chunks=[],rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:4000000});rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.start(500);
    window.__reviewVideo={stream,chunks,rec};
    return {url:location.href,gpu:s.GPU,software:s.softwareGl,quality:s.renderProfile.name,people:entries.length,roles:Object.fromEntries(['public','music','acompanyant'].map(role=>[role,entries.filter(e=>e.role===role).length])),viewport:[innerWidth,innerHeight]};
   });
   console.log('START',name,JSON.stringify(metadata));
   if(mode==='drive'){
    await page.waitForTimeout(1000);await page.keyboard.down('w');await page.waitForTimeout(1300);await page.keyboard.up('w');
    await page.keyboard.press('r');await page.waitForTimeout(900);await page.keyboard.down('s');await page.waitForTimeout(1300);await page.keyboard.up('s');
    await page.keyboard.down('d');await page.waitForTimeout(1300);await page.keyboard.up('d');await page.waitForTimeout(3200);
   }else if(mode==='quality'){
    await page.waitForTimeout(1800);await page.evaluate(()=>__representation.quality(0,true));await page.waitForTimeout(1800);await page.evaluate(()=>__representation.quality(2,true));await page.waitForTimeout(2400);
   }else await page.waitForTimeout(seconds*1000);
   const video=await page.evaluate(async()=>{__visualReview.stop();const a=__reviewVideo;await new Promise(r=>{a.rec.onstop=r;a.rec.stop()});a.stream.getTracks().forEach(t=>t.stop());const bytes=new Uint8Array(await new Blob(a.chunks).arrayBuffer());let b='';for(let i=0;i<bytes.length;i+=32768)b+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(b);});
   await writeFile(resolve(dir,'recording.webm'),Buffer.from(video,'base64'));
   const data=await page.evaluate(()=>({frames:__visualReview.frames,suspects:__visualReview.suspects,totals:__visualReview.totals}));
   if(!data.frames.length)throw Error('Probe did not complete a rendered sample');
   if(mode==='drive'&&!data.totals.culadaFrames)throw Error('The driving input did not trigger a culada');
   const rasterStable=await page.evaluate(async()=>{const s=await import('/src/scene/stage.js');s.renderer.render(s.scene,s.camera);const a=s.renderer.domElement.toDataURL();s.renderer.render(s.scene,s.camera);return a===s.renderer.domElement.toDataURL();});
   await writeFile(resolve(dir,'motion.json'),JSON.stringify({metadata,errors,...data}));await page.screenshot({path:resolve(dir,'end.png')});
   const result={name,metadata,errors,rasterStable,totals:data.totals,suspects:data.suspects},previousResult=manifest.findIndex(x=>x.name===name);
   if(previousResult<0)manifest.push(result);else manifest[previousResult]=result;
   await writeFile(resolve(dir,'result.json'),JSON.stringify(result,null,2));
   await writeFile(manifestFile,JSON.stringify(manifest,null,2));
   await reviewIndex();
   console.log('DONE',name,JSON.stringify(data.totals));
  }catch(error){
   if(page&&!page.isClosed()){
    await page.screenshot({path:resolve(dir,'failure.png')});
    const diagnostic=await page.evaluate(()=>({bootPhase:window.__mulassaBootPhase,bootFailure:String(window.__mulassaBootFailure??''),loader:document.querySelector('#loader')?.textContent.slice(0,300)}));
    await writeFile(resolve(dir,'failure.json'),JSON.stringify({message:error.message,...diagnostic},null,2));
   }
   throw error;
  }finally{await context.close();await browser.close();browser=null;}
 }
}finally{await browser?.close();}
if(manifest.some(reviewFailed))process.exitCode=1;
