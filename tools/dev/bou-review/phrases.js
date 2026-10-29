import song from '../../../src/song-bou.json' with { type:'json' };
import reference from '../../../research/bestiari/bou-tradicional/review-map.json' with { type:'json' };
import { bouPose } from '../../../src/figures/bou/bou-dance.js';
export const duration = song.duration;
export const source = reference.source;
export const storageKey = 'bou-review-phrases-v1-' + song.duration;
export const stamp = t => `${Math.floor(t/60)}:${(t%60).toFixed(1).padStart(4,'0')}`;
const heading = yaw => ['W','S','E','N'][((Math.round(yaw/(Math.PI/2))%4)+4)%4];
export function describe(start,end) {
  const samples=Array.from({length:65},(_,i)=>bouPose(start+(end-start-.01)*i/64));
  const a=samples[0],b=samples.at(-1),dx=b.x-a.x,dz=b.z-a.z;
  const moves=samples.some(p=>Math.hypot(p.x-a.x,p.z-a.z)>.12);
  let travel='Es queda al mateix lloc';
  if(moves)travel=Math.hypot(dx,dz)<.12 ? "S'allunya i torna prop del punt de partida" : `Es desplaça cap al ${Math.abs(dx)>Math.abs(dz)?(dx>0?'S':'N'):(dz>0?'W':'E')}`;
  let angle=0;
  for(let i=1;i<samples.length;i++)angle+=Math.abs(samples[i].yaw-samples[i-1].yaw);
  const turns=angle/(Math.PI*2),net=b.yaw-a.yaw;
  let turning='Manté gairebé la mateixa cara';
  if(turns>.12)turning=turns<.3 ? 'Fa un petit gir' : `Gira aproximadament ${Math.round(turns*2)/2} ${Math.round(turns*2)/2===1?'volta':'voltes'}`;
  if(turns>.12)turning+=angle-Math.abs(net)>.3?' i canvia de sentit':net>0?' en sentit antihorari':' en sentit horari';
  const sways=samples.some(p=>Math.abs(p.roll)>.002||Math.abs(p.pitch)>.002);
  return `${travel}. ${turning}. Acaba mirant cap al ${heading(b.yaw)}. ${sways?'Fa balanceig suau.':'Sense balanceig.'}`;
}
export function makePhrases() {
  return reference.phrases.map(p=>({...p,model:describe(p.start,p.end),wanted:p.proposal,draftRevision:2}));
}
function mappingInterval(phrase,t) {
  const points=phrase.anchors;
  const index=Math.max(0,Math.min(points.length-2,points.findLastIndex(a=>a[0]<=t)));
  return [points[index],points[index+1]];
}
export function sourceTime(phrase,t) {
  const [a,b]=mappingInterval(phrase,t);
  const fraction=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));
  const original=a[1]+fraction*(b[1]-a[1]);
  const points=phrase.anchors,first=points[0][1],last=points.at(-1)[1];
  return phrase.sourceStart+(original-first)/(last-first)*(phrase.sourceEnd-phrase.sourceStart);
}
export function sourceRate(phrase,t) {
  const [a,b]=mappingInterval(phrase,t),points=phrase.anchors;
  return (b[1]-a[1])/(b[0]-a[0])*(phrase.sourceEnd-phrase.sourceStart)/(points.at(-1)[1]-points[0][1]);
}
export function validBounds(start,end) {return Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>start&&end<=source.previewDuration;}
export function scriptText(phrases,audio) {
  return [`BALL DEL BOU · música ${audio}`,`Vídeo: ${source.url}`,'N/E/S/W: convenció del mapa; W = cap inicial. Correspondència automàtica pendent de revisar. Els textos no modifiquen el ball.',...phrases.map((p,i)=>`\n${i+1}. ${p.title} | cançó ${stamp(p.start)}–${stamp(p.end)} | vídeo ${p.sourceStart.toFixed(2)}–${p.sourceEnd.toFixed(2)} s\nPARTITURA: ${p.scoreBars?.join(', ')||'entrada afegida'}\nENCAIX: ${p.alignmentNote}\nVÍDEO: ${p.observed}\nMODEL ACTUAL: ${p.model}\nPROPOSTA: ${p.wanted||'[pendent d’escriure]'}`)].join('\n');
}
