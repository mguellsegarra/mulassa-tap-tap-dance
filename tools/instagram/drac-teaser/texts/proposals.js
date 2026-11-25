import { createTeaserStage } from '../stage.js';
const source = document.querySelector('#source');
const stage = createTeaserStage(source); stage.setPreset('half');
const cream = '#fff3e1', gold = '#f5c518';
// Explicit line breaks keep the owner's wording intact and avoid widows in the exported story.
const proposals = [
 {name:'A1 · Dos moments', blocks:[
  [540,210,66,'center',cream,['Encara amb ressaca','de Santa Úrsula… 🥺']],
  [540,425,54,'center',cream,['Però atents… perquè em sembla','que la Mulassa ha convidat']],
  [540,570,68,'center',gold,['algú per la Castanyada… 🔥']]]},
 {name:'A2 · La sorpresa a baix', blocks:[
  [540,270,72,'center',cream,['Encara amb ressaca','de Santa Úrsula… 🥺']],
  [540,465,68,'center',gold,['Però atents…']],
  [540,1410,56,'center',cream,['perquè em sembla que la Mulassa','ha convidat algú per la']],
  [540,1560,80,'center',gold,['Castanyada… 🔥']]]},
 {name:'A3 · Com una confidència', blocks:[
  [100,200,62,'left',cream,['Encara amb ressaca','de Santa Úrsula… 🥺']],
  [100,400,78,'left',gold,['Però atents…']],
  [100,510,53,'left',cream,['perquè em sembla que la Mulassa','ha convidat algú per la','Castanyada… 🔥']]]},
 {name:'A4 · Algú…', blocks:[
  [540,195,55,'center',cream,['Encara amb ressaca de','Santa Úrsula… 🥺']],
  [540,365,49,'center',cream,['Però atents… perquè em sembla','que la Mulassa ha convidat']],
  [540,515,120,'center',gold,['algú']],
  [540,1630,66,'center',cream,['per la Castanyada… 🔥']]]},
 {name:'A5 · Tot a dalt', blocks:[
  [540,190,49,'center',cream,['Encara amb ressaca de Santa Úrsula… 🥺']],
  [540,300,88,'center',gold,['Però atents…']],
  [540,425,52,'center',cream,['perquè em sembla que la Mulassa','ha convidat algú per la']],
  [540,570,84,'center',gold,['Castanyada… 🔥']]]},
];
const cards = proposals.map((p,i)=>{
 const article=document.createElement('article');
 article.innerHTML=`<h2>${p.name}</h2><canvas width="1080" height="1920" aria-label="${p.name}"></canvas><textarea aria-label="Comentari A${i+1}" placeholder="Què hi canviaries?"></textarea>`;
 document.querySelector('.grid').append(article);return article.querySelector('canvas');
});
await document.fonts.load('800 64px Baloo'); await document.fonts.ready;
function draw(t){stage.render(t);cards.forEach((canvas,i)=>{const c=canvas.getContext('2d');if(i===1){
 // Keep the feet above the caption and reserve the outer story bands for Instagram UI.
 c.fillStyle='#101010';c.fillRect(0,0,1080,1920);
 c.drawImage(source,81,-40,918,1632);
 for(const [a,b] of [[81,200],[999,880]]){
  const edge=c.createLinearGradient(a,0,b,0);edge.addColorStop(0,'#101010');edge.addColorStop(1,'#10101000');
  c.fillStyle=edge;c.fillRect(Math.min(a,b),0,Math.abs(b-a),1920);
 }

 const veil=c.createLinearGradient(0,480,0,760);
 veil.addColorStop(0,'#101010');veil.addColorStop(1,'#10101000');
 c.fillStyle='#101010';c.fillRect(0,0,1080,480);
 c.fillStyle=veil;c.fillRect(0,480,1080,280);
 }else c.drawImage(source,0,0);if(i===1||i===3){const g=c.createLinearGradient(0,i===1?1350:1420,0,i===1?1580:1840);g.addColorStop(0,'#10101000');g.addColorStop(.35,'#101010e6');g.addColorStop(1,'#101010');c.fillStyle=g;c.fillRect(0,i===1?1350:1420,1080,570);}for(const [x,y,size,align,color,lines] of proposals[i].blocks){c.font=`800 ${size}px Baloo`;c.textAlign=align;c.textBaseline='top';c.fillStyle=color;lines.forEach((line,j)=>c.fillText(line,x,y+j*size*1.16));}
 // Fade the complete composition, including lettering, and hold black at the end.
 const endFade=Math.min(1,Math.max(0,(t-11)/.85));
 c.save();c.globalAlpha=endFade;c.fillStyle='#000';c.fillRect(0,0,1080,1920);c.restore();
 })}
let playing=true, elapsed=3, previous=performance.now();
document.querySelector('#play').onclick=e=>{playing=!playing;e.target.textContent=playing?'Pausa':'Reprodueix';};
window.renderProposals=t=>{playing=false;elapsed=t;draw(t);};
function tick(now){if(playing){elapsed=(elapsed+Math.min(.1,(now-previous)/1000))%12;draw(elapsed);}previous=now;requestAnimationFrame(tick)}
draw(3);window.proposalsReady=true;requestAnimationFrame(tick);
window.addEventListener('pagehide',()=>stage.dispose(),{once:true});
