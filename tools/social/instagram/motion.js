(async()=>{
const DURATION=15,query=new URLSearchParams(location.search),slide=Number(query.get('slide'));
if(slide>=1&&slide<=3){document.body.classList.add('export');document.querySelectorAll('figure')[slide-1].classList.add('selected')}
if(query.has('guides'))document.body.classList.add('show-guides');
await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await new Promise(requestAnimationFrame);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let seed=327,random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
const HEART_PATH='M12 20.5 4.2 12.9a4.8 4.8 0 0 1 6.8-6.8l1 1 1-1a4.8 4.8 0 0 1 6.8 6.8z';
// Keep the button burst local; the intro hearts travel across the whole story.
for(const fx of document.querySelectorAll('.fx')){
 const story=fx.closest('.story'),sr=story.getBoundingClientRect();if(!sr.width||reduced)continue;
 const large=fx.dataset.kind==='large',target=large?fx.parentElement.querySelector('.heart-action'):story.querySelector('.heart-core'),tr=target.getBoundingClientRect(),fr=fx.getBoundingClientRect();
 for(const time of fx.dataset.bursts.split(',').map(Number))for(let n=0;n<24;n++){
  const bit=document.createElementNS('http://www.w3.org/2000/svg','svg');bit.setAttribute('viewBox','0 0 24 24');bit.setAttribute('aria-hidden','true');bit.classList.add('heart-bit');
  bit.innerHTML=`<path fill="${['#c0283c','#e0364c','#f5c518','#c0283c'][n%4]}" d="${HEART_PATH}"/>`;
  const a=-Math.PI*(-.15+1.3*random()),distance=(110+170*random())*(large?.8:.5),big=n%5===0,size=(big?36+18*random():16+16*random())*(large?1.3:1.1);
  const x=large?tr.left+tr.width*(.2+.6*random()):tr.left+tr.width*(.35+.3*random()),y=tr.top+tr.height/2;
  const dx=large?Math.cos(a)*distance:(70+((n%6)+random())/6*940)-(x-sr.left)*1080/sr.width;
  const dy=large?Math.sin(a)*distance:(70+(Math.floor(n/6)+random())/4*1780)-(y-sr.top)*1080/sr.width;
  bit.style.cssText=`left:${(x-fr.left)/fr.width*100}%;top:${(y-fr.top)/fr.height*100}%;--s:${size/10.8}cqw;--dx:${dx/10.8}cqw;--dy:${dy/10.8}cqw;--r:${(random()-.5)*100}deg;--delay:${time+random()*.12}s`;
  fx.append(bit);
 }
}
const track=document.querySelector('.selector-track'),windowEl=document.querySelector('.selector-window');
function setTravel(){const width=windowEl.getBoundingClientRect().width;if(width)track.style.setProperty('--travel',`${Math.min(Math.max(0,track.scrollWidth-width),2*(track.firstElementChild.getBoundingClientRect().width+parseFloat(getComputedStyle(track).gap)))}px`)}setTravel();new ResizeObserver(setTravel).observe(windowEl);
await new Promise(requestAnimationFrame);
const animations=document.getAnimations();animations.forEach(a=>a.pause());
const wear=[...document.querySelectorAll('.wear-badge')],action=document.querySelector('.heart-action'),actionText=action.querySelector('span'),range=document.querySelector('#timeline'),clock=document.querySelector('#clock');
let current=0,playing=false,start=0,raf=0;
function paint(t){
 const segment=DURATION/wear.length,index=Math.min(wear.length-1,Math.floor(t/segment)),local=t-index*segment,fade=reduced||index===0?1:Math.min(1,local/.45);
 wear.forEach((b,i)=>b.style.opacity=String(i===index?fade:i===index-1?1-fade:0));
 action.classList.toggle('on',t>=2);actionText.textContent=t>=2?'El meu cor és teu!':'Tens el meu cor!';
 range.value=String(t);clock.value=t.toFixed(1).replace('.',',')+' / 15 s';
}
function pause(){playing=false;cancelAnimationFrame(raf);animations.forEach(a=>a.pause())}
function seek(t){current=Math.max(0,Math.min(DURATION,Number(t)||0));animations.forEach(a=>{a.pause();a.currentTime=current*1000});paint(current)}
function frame(now){if(!playing)return;current=Math.min(DURATION,(now-start)/1000);paint(current);if(current>=DURATION){pause();seek(DURATION)}else raf=requestAnimationFrame(frame)}
function play(){pause();if(current>=DURATION)seek(0);start=performance.now()-current*1000;playing=true;animations.forEach(a=>{a.currentTime=current*1000;a.play()});raf=requestAnimationFrame(frame)}
document.querySelector('#play').onclick=play;document.querySelector('#pause').onclick=pause;range.oninput=()=>{pause();seek(range.value)};document.querySelector('#guides').onclick=()=>document.body.classList.toggle('show-guides');
window.storyTimeline={ready:true,duration:DURATION,seek,pause,play,get time(){return current},get playing(){return playing}};
seek(query.get('t')||0);if(!query.has('still'))play();
})().catch(error=>{console.error(error);document.body.dataset.motionError=error.message});
