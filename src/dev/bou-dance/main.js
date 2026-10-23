import { createBouStage } from './stage.js';
import { BOU_PHASES, BOU_TIMING, bouPose } from '../../game/bou-dance.js';
import playback from '../../../music/bou-tradicional/playback.json' with { type:'json' };
import { Q } from '../../core/flags.js';
const audio=document.querySelector('#audio'),phase=document.querySelector('#phase');
audio.muted=audio.defaultMuted=Q.has('mute');
if(Q.has('mute'))document.querySelector('header a').href='/?mute';
audio.src='/music/bou-tradicional/'+playback.audio+'?v='+playback.audioSha256.slice(0,12);
const fragment=document.querySelector('#fragment');
BOU_PHASES.forEach(([time,name])=>{const o=document.createElement('option');o.value=time;o.textContent=name;fragment.append(o);});
let stage,raf;
try {
  stage=createBouStage(document.querySelector('#stage'));
  fragment.addEventListener('change',()=>{audio.currentTime=Number(fragment.value);stage.render(audio.currentTime);});
  document.querySelector('#view').addEventListener('change',e=>stage.setView(e.target.value));
  document.querySelector('#speed').addEventListener('change',e=>{audio.playbackRate=Number(e.target.value);});
  audio.addEventListener('seeked',()=>stage.render(audio.currentTime));
  function frame(){const t=audio.currentTime;stage.render(t);phase.textContent=BOU_PHASES.findLast(p=>p[0]<=t+.001)?.[1]??BOU_PHASES[0][1];raf=requestAnimationFrame(frame);}
  frame();
  window.__bou={audio,rig:stage.rig,timing:BOU_TIMING,pose:bouPose,seek(t){audio.currentTime=t;stage.render(t);}};
} catch(error) {const el=document.querySelector('#error');el.hidden=false;el.textContent="No s'ha pogut preparar el ball: "+error.message;console.error(error);}
audio.addEventListener('error',()=>{const el=document.querySelector('#error');el.hidden=false;el.textContent="No s'ha pogut carregar la música aprovada.";});
window.addEventListener('pagehide',()=>{audio.pause();cancelAnimationFrame(raf);stage?.dispose();},{once:true});
