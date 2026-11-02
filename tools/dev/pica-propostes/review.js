const $ = id => document.getElementById(id);
const concepts = {
 A:['A · A casa','La família de mulassa.cat: marró #2a1a10, crema #fff3d6, or #f5c518, Baloo 2 i Jersey 10. Botons d’or, selecció crema i targetes del selector. Un tauler gris pissarra delimitat, sense terra infinit.'],
 B:['B · Plaça de pedra','Una plaça de dia: pedra grisa, juntes discretes i marc de granit. Menús clars com un plafó de la plaça; puntuació en una columna pròpia a les pantalles amples. La membrana beix queda separada del gris fred.'],
 C:['C · Nit de festa','Un petit escenari blau de mitjanit, amb laterals de cortina i llum de festa. Tauler de rajoles violetes i vora lluminosa; marcador central i menús com el cartell d’una funció. Les ales destaquen sobre el blau.'],
 D:['D · Joc de taula','Una capsa de joc il·lustrada: paper, tinta blava i una base de rajoles blaves amb juntes amples. Titulars grans, línies rectes i etiquetes numerades. Composició plana, sense perspectiva cònica ni terra que competeixi amb les peces.']
};
const screens = {menu:'Menú principal',help:'Com es juga',play:'En joc',pause:'Pausa',end:'Final i rècord',rank:'Rècords i classificació'};
let concept = new URLSearchParams(location.search).get('concept') || 'A';
if (!concepts[concept]) concept='A';
let notes={};try{notes=JSON.parse(localStorage.getItem('pica-propostes-notes-v1')||'{}')}catch{}
$('concepts').innerHTML=Object.entries(concepts).map(([key,[name]])=>`<button data-concept="${key}">${name}</button>`).join('');
$('screen').innerHTML=Object.entries(screens).map(([key,name])=>`<option value="${key}">${name}</option>`).join('');
const key=()=>`${concept}/${$('screen').value}`;
function save(){try{localStorage.setItem('pica-propostes-notes-v1',JSON.stringify(notes))}catch{$('status').textContent='No puc desar en aquest navegador. Copia les notes abans de tancar.'}}
function feedback(){const n=notes[key()]||{};$('note').value=n.note||'';$('note-title').textContent=`${concept} · ${screens[$('screen').value]} · Notes`;document.querySelectorAll('[data-mark]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mark===(n.mark||'')))}
function fit(){let w,h;if($('device').value==='auto'){w=Math.min(innerWidth,1280);h=innerWidth<600?innerHeight:800}else [w,h]=$('device').value.split('x').map(Number);const scale=Math.min(1,$('viewport').clientWidth/w);Object.assign($('frame').style,{width:`${w}px`,height:`${h}px`,transform:`translateX(${-w*scale/2}px) scale(${scale})`});$('viewport').style.height=`${h*scale}px`}
function show(){const url=`/tools/dev/pica-propostes/scene.html?simple&mute&concept=${concept}&screen=${$('screen').value}`;$('frame').src=url;$('full').href=url;$('name').textContent=concepts[concept][0];$('description').textContent=concepts[concept][1];document.querySelectorAll('[data-concept]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.concept===concept));feedback();fit()}
$('concepts').onclick=e=>{if(e.target.dataset.concept){concept=e.target.dataset.concept;show()}};$('screen').onchange=show;$('device').onchange=fit;window.addEventListener('resize',fit);
$('note').oninput=()=>{notes[key()]={...notes[key()],note:$('note').value};save()};$('marks').onclick=e=>{if(e.target.dataset.mark!==undefined){notes[key()]={...notes[key()],mark:e.target.dataset.mark};save();feedback()}};
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===$('frame').contentWindow&&screens[e.data?.screen]){$('screen').value=e.data.screen;$('full').href=`/tools/dev/pica-propostes/scene.html?simple&mute&concept=${concept}&screen=${e.data.screen}`;feedback()}});
$('copy').onclick=async()=>{const text=['Pica la Mulassa · Revisió',...Object.entries(concepts).flatMap(([c,[name]])=>[name,...Object.entries(screens).map(([s,label])=>{const n=notes[`${c}/${s}`]||{};return `  ${label} [${n.mark||'pendent'}] ${n.note||'—'}`})])].join('\n');$('out').hidden=false;$('out').value=text;$('out').focus();$('out').select();try{await navigator.clipboard.writeText(text);$('status').textContent='Notes copiades.'}catch{const ok=document.execCommand('copy');$('status').textContent=ok?'Notes copiades.':'Selecciona el text i copia’l manualment.'}};
show();
