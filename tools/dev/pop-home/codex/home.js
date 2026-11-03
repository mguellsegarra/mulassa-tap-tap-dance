import { createBoard } from '/src/jocs/games/pop/board.js';
import { logo } from './logo.js';
const variant = new URLSearchParams(location.search).get('v') || 'A';
document.body.className = variant;
const portrait = (kind, cls='') => `<img class="figure ${cls}" data-kind="${kind}" alt="">`;
const record = '<div class="record"><span>El teu rècord <small>En aquest dispositiu</small></span><strong>57<span> punts</span></strong></div>';
const actions = '<div class="actions"><a class="primary" href="/pop/">Juga</a><button class="help">Com es juga</button></div>';
const footer = '<a class="back" href="/#jocs">Torna al joc principal</a>';
const music = '<button class="music" aria-pressed="false" aria-label="Activa la música">♪</button>';
const target = '<div class="target">'+portrait('mula')+'<span>Toca la Mulassa vermella</span></div>';
const scenes = {
 A: `<header>${logo}</header><div class="layout"><section class="showcase"><div class="eyebrow">UN JOC DE VISTA I REFLEXOS</div>${portrait('mula','hero')}<h1>La bona, abans que peti.</h1><p>Troba la Mulassa. Esquiva els enganys.</p></section><section class="panel">${record}<div class="mini-rule">${portrait('mula')}<p>Toca la vermella.<br>Només tens una vida.</p></div>${actions}</section></div>${footer}${music}`,
 B: `<header>${logo}</header><div class="duel"><div class="orb">${portrait('drac')}<span>No el toquis</span></div><div class="orb chosen">${portrait('mula')}<span>Aquesta sí!</span></div><div class="orb">${portrait('mulaFalsa')}<span>És un engany</span></div></div><section class="launch"><h1>Ull viu. Dit ràpid.</h1><p>Una Mulassa bona. Una sola vida.</p>${record}${actions}</section>${footer}${music}`,
 C: `<header>${logo}</header><section class="manual"><div class="intro"><h1>Abans de començar</h1><p>Una sola vida. Queda't amb això:</p></div><div class="lesson"><div>${portrait('mula')}<b>Toca la vermella</b><span>Abans que acabi la metxa.</span></div><div>${portrait('drac')}<b>Esquiva els enganys</b><span>Cap Drac ni Mulassa verda.</span></div><div>${portrait('petard')}<b>Apaga el petard</b><span>Toca'l abans que exploti.</span></div></div><button class="help extras">I els extres? Descobreix-los →</button><div class="bottom">${record}${actions}</div></section>${footer}${music}`,
 D: `<header>${logo}</header><section class="challenge"><div class="ticket"><span class="eyebrow">EL TEU MILLOR MOMENT</span><strong class="big-score">57</strong><span>PUNTS · EN AQUEST DISPOSITIU</span><div class="stamp">${portrait('mula')}</div></div><div class="challenge-copy"><h1>Fins on arribaràs avui?</h1><p>Troba la vermella abans que peti.<br>Un error i s'acaba.</p>${actions}</div></section>${footer}${music}`
};
document.querySelector('#home').innerHTML = scenes[variant];
const rules = [
 ['mula','Toca la Mulassa vermella','Abans que acabi la metxa.'],
 ['drac','No toquis cap Drac','Ni el verd ni el vermell.'],
 ['mulaFalsa','No toquis la Mulassa verda','És un engany.'],
 ['petard','Apaga el petard','Toca’l abans que exploti.']
];
const goodies = [['calcot','Calçot','Suma 5 punts.'],['campanar','Campanar','Alenteix el temps durant 5 segons.'],['carretilla','Carretilla','Els Dracs cremen totes les Mulasses.']];
for(const [id, rows] of [['rules',rules],['goodies',goodies]]) document.getElementById(id).innerHTML = rows.map(([k,t,s])=>`<div class="help-row">${portrait(k)}<p><b>${t}</b><span>${s}</span></p></div>`).join('');
const dialog = document.querySelector('dialog');
if (variant === 'C') document.querySelector('.actions .help').remove();
document.querySelectorAll('.help').forEach(b=>b.onclick=()=>dialog.showModal());
document.querySelector('#close').onclick=()=>dialog.close();
document.querySelector('.music').onclick=e=>{
 const b=e.currentTarget, on=b.getAttribute('aria-pressed')!=='true';
 b.setAttribute('aria-pressed',on); b.textContent=on?'♪':'♫'; b.setAttribute('aria-label',on?'Desactiva la música':'Activa la música');
};
const board = createBoard(document.createElement('canvas'));
const pics = await board.portraits(['mula','drac','dracFals','mulaFalsa','petard','calcot','campanar','carretilla'],320);
document.querySelectorAll('[data-kind]').forEach(img=>img.src=pics[img.dataset.kind]);
await document.fonts.ready;
document.body.dataset.ready='true';
