// The real Pop home (copied from /pop/ at load), with only the row of cards rebuilt as proposal ?p=A..D.
import { createBoard } from '/src/jocs/games/pop/board.js';
import { newGame } from '/src/jocs/games/pop/rules.js';
import { applyWords } from '/src/jocs/games/pop/i18n.js';

const q = new URLSearchParams(location.search);
const P = /^[ABCD]$/.test(q.get('p')) ? q.get('p') : 'A';
document.documentElement.dataset.p = P;

const src = new DOMParser().parseFromString(await (await fetch('/pop/')).text(), 'text/html');
const menu = src.getElementById('menu');
document.body.append(document.adoptNode(menu));

// the tone's mark: a tap, a no, a star
const ICON = {
  yes: '<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10l4.3.9a2 2 0 0 1 1.6 2.2l-.6 4.6A3 3 0 0 1 14.3 20h-3.6a3 3 0 0 1-2.4-1.2L5.6 15a1.5 1.5 0 0 1 2.2-2L9 14.2z"/>',
  no: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 3a6 6 0 0 1 4.9 9.5L8.5 7.1A6 6 0 0 1 12 6zm-4.9 2.5 8.4 8.4A6 6 0 0 1 7.1 8.5z"/>',
  extra: '<path d="M12 2.5l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3 1.2-6.4-4.7-4.4 6.4-.8z"/>',
};
const row = menu.querySelector('.c-row');
const kinds = [];
row.innerHTML = [...row.children].map(c => {
  const { kind, tone } = c.dataset;
  kinds.push(kind);
  return `<div class="k" data-tone="${tone}" data-kind="${kind}" role="listitem"><div class="k-por"><img alt=""></div>`
    + `<i class="k-tag" aria-hidden="true"><svg viewBox="0 0 24 24">${ICON[tone]}</svg></i>`
    + `<div class="k-nb"><b data-t="fig.${kind}"></b><span class="long" data-t="do.${kind}"></span><span class="tiny" data-t="tiny.${kind}"></span></div></div>`;
}).join('');
applyWords();
for (const el of menu.querySelectorAll('#menu-best, .c-best')) el.classList.add('empty');

// the live board behind, in its menu state, as /pop/ shows it
const board = createBoard(document.getElementById('game'));
const layout = () => (innerWidth > innerHeight ? { cols: 6, rows: 4 } : { cols: 4, rows: 6 });
let game;
const reset = () => { game = newGame(layout()); game.state = 'menu'; board.setGame(game); };
reset();
addEventListener('resize', () => (layout().cols !== game.cols ? reset() : board.fit()));
let last = performance.now();
requestAnimationFrame(function frame(now) { board.frame(Math.max(0, Math.min(.05, (now - last) / 1000))); last = now; requestAnimationFrame(frame); });

// the portraits leave a wide empty margin round each figure (a bounding sphere): crop each to its own pixels
const crop = url => new Promise(done => {
  const im = new Image();
  im.onload = () => {
    const s = im.width, c = Object.assign(document.createElement('canvas'), { width: s, height: s }), x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    const a = x.getImageData(0, 0, s, s).data;
    let l = s, r = 0, t = s, b = 0;
    for (let y = 0; y < s; y++) for (let i = 0; i < s; i++) if (a[(y * s + i) * 4 + 3] > 8) { l = Math.min(l, i); r = Math.max(r, i); t = Math.min(t, y); b = Math.max(b, y); }
    const w = r - l + 1, h = b - t + 1, o = Object.assign(document.createElement('canvas'), { width: w, height: h });
    o.getContext('2d').drawImage(c, l, t, w, h, 0, 0, w, h);
    done(o.toDataURL());
  };
  im.src = url;
});
await board.warm();
const pics = await board.portraits(kinds, 320);
for (const k of row.querySelectorAll('.k')) k.querySelector('img').src = await crop(pics[k.dataset.kind]);
menu.querySelector('#menu-mula').src = (await board.portraits(['mula'], 512)).mula;
await document.fonts.ready;
document.documentElement.classList.add('ready'); // the captures wait for this
