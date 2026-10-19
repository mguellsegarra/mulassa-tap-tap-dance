// The fold's own card: what anyone can send, each drawn in its own gradient.
// userSpaceOnUse: a straight staff line has a flat bounding box, which would leave it without a gradient
const gift = (id, label, from, to, body) => `<li><svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="gift-${id}" gradientUnits="userSpaceOnUse" x1="3" y1="3" x2="21" y2="21"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><g fill="none" stroke="url(#gift-${id})">${body}</g></svg>${label}</li>`;
export const GIFTS = `<ul class="sel-gifts" aria-label="Què ens pots enviar">${[
  gift('foto', 'Fotos', '#ff6f9f', '#ffd38a', '<path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>'),
  gift('video', 'Vídeos', '#4fc3ff', '#b49aff', '<rect x="3" y="6.5" width="13" height="11" rx="2"/><path d="m16 10.5 5-3v9l-5-3z"/>'),
  gift('partitura', 'Partitures', '#a98bff', '#ff94d6', '<path d="M3 8h18M3 12h18M3 16h18" stroke-width="1.1" stroke-opacity=".7"/><path d="M10.4 16.2V6.2l8-1.6v10" stroke-width="2"/><g fill="url(#gift-partitura)" stroke="none"><ellipse cx="8.3" cy="16.4" rx="2.4" ry="1.8"/><ellipse cx="16.3" cy="14.8" rx="2.4" ry="1.8"/></g>'),
  gift('ball', 'El ball', '#6fdc9a', '#f2e57a', '<path d="M7 3.5c2 0 3 1.8 3 4.2s-.8 4-2.6 4S5 10 5 7.7 5.4 3.5 7 3.5zM5.6 14.2h3.6v1.6a1.8 1.8 0 0 1-3.6 0zM17 8.5c-1.6 0-2.4 1.8-2.4 4.2s.8 4 2.6 4 2.4-1.7 2.4-4-.4-4.2-2.6-4.2zM15.2 18.8h3.6v1.4a1.8 1.8 0 0 1-3.6 0z"/>'),
].join('')}</ul>`;
