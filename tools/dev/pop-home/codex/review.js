const concepts = {
 A:['La família Mulassa','Targeta emmarcada, rècord compacte i botons apilats: reprèn la jerarquia del selector i dels fulls del joc principal, amb el rosa propi de Pop. Les regles completes passen a un full.'],
 B:['Tria amb la mirada','Les tres figures expliquen la decisió abans de llegir. La Mulassa bona ocupa el centre, amb un cercle rosa; el botó queda en una columna curta sense targeta exterior.'],
 C:['Aprèn i juga','Tres regles sempre visibles, amb retrats reals i una frase per acció. Els extres s’obren a part. És la proposta més guiada per a la primera partida.'],
 D:['Supera el teu rècord','Un marcador gran converteix el màxim local en el motiu per tornar-hi. La figura fa de segell estàtic i el bloc d’accions queda separat. Sense classificació fictícia.']
};
const tabs=document.querySelector('#tabs'), note=document.querySelector('#note');
let current='A', notes=JSON.parse(localStorage.getItem('pop-home-codex-notes')||'{}');
for(const [id,[title]] of Object.entries(concepts)){const b=document.createElement('button');b.textContent=id+' · '+title;b.onclick=()=>select(id);b.dataset.id=id;tabs.append(b)}
function select(id){current=id;tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.id===id));document.querySelector('#title').textContent=id+' · '+concepts[id][0];document.querySelector('#why').textContent=concepts[id][1];for(const f of ['phone','desktop'])document.getElementById(f).src='./home.html?v='+id+'&mute';document.querySelector('#full').href='./home.html?v='+id+'&mute';note.value=notes[id]||''}
note.oninput=()=>{notes[current]=note.value;localStorage.setItem('pop-home-codex-notes',JSON.stringify(notes))};
document.querySelector('#copy').onclick=async()=>{const text=Object.keys(concepts).map(k=>k+' · '+concepts[k][0]+'\n'+(notes[k]||'(Sense notes)')).join('\n\n');const out=document.querySelector('#export');try{await navigator.clipboard.writeText(text);document.querySelector('#status').textContent='Notes copiades.'}catch{out.hidden=false;out.value=text;out.select();document.querySelector('#status').textContent='Selecciona i copia aquest text.'}};
new ResizeObserver(()=>{const frame=document.querySelector('.desktop iframe');frame.style.transform='scale('+document.querySelector('.desktop').clientWidth/1280+')'}).observe(document.querySelector('.desktop'));
select('A');
