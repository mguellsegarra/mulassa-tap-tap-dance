// The review page: one proposal at a time in a phone and a big-screen frame, with notes per proposal kept in localStorage.
const P = {
  A: { name: 'A · El full del joc principal', desc: 'La mateixa fitxa rosa d’ara, buidada: el rècord gran, «Juga», «Com es juga» i la tornada. Les regles passen a un full propi amb el × de mulassa.cat, agrupades en Toca / No toquis / Extres. La música, botó rodó a la cantonada com al HUD.', change: 'Canvia el mínim: la fitxa d’ara sense les regles a dins, que ocupaven tot l’espai i treien protagonisme a «Juga».' },
  B: { name: 'B · Les figures a la vista', desc: 'Les regles es llegeixen amb la mirada: cada figura en una fitxa amb una marca (✓ toca, ✕ no toquis, + extra) i una o dues paraules. Tocant-ne una, la línia de sota explica què fa. Rècord i «Juga» baix de tot, a l’abast del polze.', change: 'Menys text, més figures; hi surt el Drac vermell, que ara no s’explica. Les fletxes de tornada i música, a dalt com al HUD de la partida.' },
  C: { name: 'C · Portada de Mulassa Games', desc: 'Fa servir el llenguatge de la pantalla de jocs: la Mulassa vermella gran com a protagonista, una frase, el «Juga» crema amb el saltet i el rècord al costat. A baix, una fila de cartes (com les de Mulassa Games) amb cada figura i el que cal fer.', change: 'La portada ven el joc; les regles es passen amb el dit sense obrir res. A l’ordinador hi caben les vuit cartes.' },
  D: { name: 'D · Marcador', desc: 'Un marcador amb dues pestanyes al mòbil (Rècords · Com es juga) i les dues columnes juntes a la pantalla gran. Deixa lloc per a una classificació en línia, marcada com a idea: <b>avui no existeix</b>; els noms són inventats.', change: 'Posa el rècord al centre i prepara el lloc d’una classificació, si algun dia es fa.' },
};
const KEY = 'pop-home-opus-notes';
const notes = JSON.parse(localStorage.getItem(KEY) || '{}');
const $ = s => document.querySelector(s);
let cur = new URLSearchParams(location.search).get('p') || 'A';

$('#tabs').innerHTML = Object.keys(P).map(k => `<button data-p="${k}">${k}</button>`).join('');
for (const b of document.querySelectorAll('#tabs button')) b.onclick = () => { cur = b.dataset.p; show(); };

function load(fig, size) {
  const [w, h] = size.split('x').map(Number), url = `./home.html?p=${cur}&best=${$('#best').value}`;
  const f = fig.querySelector('iframe'), sc = fig.querySelector('.scaler');
  if (f.dataset.src !== url + size) { f.dataset.src = url + size; f.src = url; }
  Object.assign(f.style, { width: `${w}px`, height: `${h}px` });
  fig.dataset.w = w; fig.dataset.h = h;
  fig.querySelector('figcaption span').textContent = `${w} × ${h}`;
  fig.querySelector('a').href = url;
  sc.style.setProperty('--w', w); sc.style.setProperty('--h', h);
}
function fitFrames() {
  for (const fig of document.querySelectorAll('#frames figure')) {
    const avail = fig.clientWidth, maxH = fig.classList.contains('phone') ? Math.min(innerHeight * .8, 760) : innerHeight * .8;
    const s = Math.min(1, avail / fig.dataset.w, maxH / fig.dataset.h);
    const sc = fig.querySelector('.scaler');
    sc.style.width = `${fig.dataset.w * s}px`; sc.style.height = `${fig.dataset.h * s}px`;
    fig.querySelector('iframe').style.transform = `scale(${s})`;
  }
}
function show() {
  for (const b of document.querySelectorAll('#tabs button')) b.setAttribute('aria-pressed', b.dataset.p === cur);
  $('#name').textContent = P[cur].name; $('#desc').innerHTML = P[cur].desc; $('#change').textContent = P[cur].change;
  load($('.phone'), $('#phone').value); load($('.big'), $('#big').value);
  fitFrames();
  $('#note-p').textContent = cur;
  const n = notes[cur] || {};
  $('#note').value = n.note || '';
  for (const b of document.querySelectorAll('#marks button')) b.setAttribute('aria-pressed', (n.mark || '') === b.dataset.mark);
  history.replaceState(null, '', `?p=${cur}`);
}
const save = () => localStorage.setItem(KEY, JSON.stringify(notes));
$('#note').oninput = e => { notes[cur] = { ...notes[cur], note: e.target.value }; save(); };
for (const b of document.querySelectorAll('#marks button')) b.onclick = () => { notes[cur] = { ...notes[cur], mark: b.dataset.mark }; save(); show(); };
$('#copy').onclick = async () => {
  const text = Object.keys(P).map(k => `${k}${notes[k]?.mark ? ` [${notes[k].mark}]` : ''}: ${notes[k]?.note || '—'}`).join('\n');
  try { await navigator.clipboard.writeText(text); $('#status').textContent = 'Copiat.'; } catch { $('#out').hidden = false; $('#out').value = text; $('#out').select(); $('#status').textContent = 'Copia-ho del quadre.'; }
};
for (const id of ['#phone', '#big', '#best']) $(id).onchange = show;
addEventListener('resize', fitFrames);
show();
