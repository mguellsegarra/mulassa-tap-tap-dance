import {createBouStage} from '../bou-dance/stage.js';
import {makePhrases,sourceTime,sourceRate,source,stamp,duration} from './phrases.js';
import {createEditor} from './editor.js';
import {createMap} from './map.js';
import song from '../../song-bou.json' with {type:'json'};
import playback from '../../../music/bou-tradicional/playback.json' with {type:'json'};
const el=id=>document.getElementById(id),audio=el('audio'),video=el('reference'),phrases=makePhrases();
const muted=new URLSearchParams(location.search).has('mute');
audio.muted=audio.defaultMuted=muted;video.muted=video.defaultMuted=true;
if(muted)document.querySelector('header a').href+='?mute';
audio.src='/'+song.audio; // Exactly the asset used by the game's selected figure.
video.src='/_bestiari/media/'+source.previewMedia;
let index=0,raf,stage,lastUpdate=0,videoStarting=false,playRequest=0;
const fail=message=>{audio.pause();video.pause();el('error').hidden=false;el('error').textContent=message;};
const editor=createEditor(phrases,playback.audio,()=>sync(true));
const drawMap=createMap(el('map'),phrases);
phrases.forEach((p,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${i+1}. ${stamp(p.start)}–${stamp(p.end)} · ${p.title}`;el('fragment').append(option);});
function select(i,seek=true){
  playRequest++;
  index=Math.max(0,Math.min(phrases.length-1,i));el('fragment').value=index;editor.select(index);
  el('previous').disabled=index===0;el('next').disabled=index===phrases.length-1;
  if(seek)audio.currentTime=phrases[index].start;
  sync(true);
}
function sync(force=false){
  const p=phrases[index],target=sourceTime(p,audio.currentTime);
  const rate=sourceRate(p,audio.currentTime)*audio.playbackRate;
  el('video-rate').textContent=`Vídeo ${stamp(p.sourceStart)}–${stamp(p.sourceEnd)} · velocitat adaptada ×${rate.toFixed(2)}. So: la nostra cançó.`;
  if(video.readyState<1)return;
  if(rate<.0625||rate>16){fail('Aquest interval requereix una velocitat de vídeo massa extrema. Ajusta’n els segons.');return;}
  const drift=target-video.currentTime;
  // Do not seek repeatedly through a long-GOP source while playing: catch small drift through rate.
  video.playbackRate=Math.max(.0625,Math.min(16,rate+Math.max(-rate*.25,Math.min(rate*.25,drift*2))));
  if(!video.seeking&&(((force||audio.paused)&&Math.abs(drift)>.02)||Math.abs(drift)>1))video.currentTime=target;
  if(audio.paused){video.pause();return;}
  if(video.paused&&!videoStarting){videoStarting=true;video.play().catch(e=>{if(e.name!=='AbortError')fail('No es pot reproduir el vídeo. Torna a prémer Reprodueix.');}).finally(()=>{videoStarting=false;});}
}
async function restart(){
  const request=++playRequest;
  audio.pause();audio.currentTime=phrases[index].start;sync(true);
  try{
    if(video.seeking)await new Promise((resolve,reject)=>{
      const cleanup=()=>{clearTimeout(timer);video.removeEventListener('seeked',ready);video.removeEventListener('error',failed);};
      const ready=()=>{cleanup();resolve();},failed=()=>{cleanup();reject(new Error('video'));};
      const timer=setTimeout(failed,15000);
      video.addEventListener('seeked',ready,{once:true});video.addEventListener('error',failed,{once:true});
    });
    if(request===playRequest)await Promise.all([video.play(),audio.play()]);
  }catch{if(request===playRequest)fail('No es pot reproduir el tram. Torna-ho a provar amb el control de so.');}
}
el('fragment').addEventListener('change',()=>select(Number(el('fragment').value)));
el('previous').addEventListener('click',()=>select(index-1));el('next').addEventListener('click',()=>select(index+1));el('restart').addEventListener('click',restart);
el('view').addEventListener('change',()=>stage?.setView(el('view').value));
el('speed').addEventListener('change',()=>{audio.playbackRate=Number(el('speed').value);sync(true);});
audio.addEventListener('play',()=>sync(true));audio.addEventListener('pause',()=>video.pause());
audio.addEventListener('seeking',()=>{const i=phrases.findLastIndex(p=>p.start<=audio.currentTime+.001);if(i!==index)select(Math.max(0,i),false);sync(true);});
audio.addEventListener('seeked',()=>sync(true));video.addEventListener('loadedmetadata',()=>sync(true));
audio.addEventListener('error',()=>fail('No es pot carregar la música del joc.'));video.addEventListener('error',()=>fail('No es pot carregar el vídeo original. Comprova el recurs local del bestiari.'));
audio.addEventListener('ended',()=>{if(el('loop').checked)restart();});
try{
  stage=createBouStage(el('stage'));select(0);
  function frame(now){
    let t=audio.currentTime;const p=phrases[index];
    if(!audio.paused&&t>=p.end-.025){
      if(el('loop').checked){audio.currentTime=p.start;t=p.start;sync(true);}
      else if(index<phrases.length-1)select(index+1,false);
    }
    sync();stage.render(t);drawMap(index,t);
    if(now-lastUpdate>100){el('clock').textContent=`Cançó ${stamp(t)} / ${stamp(duration)} · tram ${index+1}/${phrases.length}`;el('video-clock').textContent=`Vídeo ${stamp(video.currentTime)}`;lastUpdate=now;}
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
}catch(error){fail('No es pot preparar el model 3D: '+error.message);}
window.addEventListener('pagehide',()=>{playRequest++;audio.pause();video.pause();cancelAnimationFrame(raf);stage?.dispose();},{once:true});
