import { BASE, RECIPES } from './recipes.js';

const file = id => (id === 'gegants' ? 'gegant' : id); // the figure art is named in the singular

export const iconHtml = id => `<img src="/jocs/alquimia/cards/${file(id)}.png" alt="" draggable="false" decoding="sync">`;

// Fetched up front, so art first shown after losing the network still appears.
export const preloaded = [...BASE, ...RECIPES.map(r => r[2])].map(id => Object.assign(new Image(), { src: `/jocs/alquimia/cards/${file(id)}.png` }));

// the cauldron the player mixes in
export const CAULDRON = `<svg viewBox="0 0 120 92" aria-hidden="true">
  <defs>
    <linearGradient id="alq-iron" x1="0" x2="1"><stop offset="0" stop-color="#17131a"/><stop offset=".35" stop-color="#4a4152"/><stop offset="1" stop-color="#17131a"/></linearGradient>
    <radialGradient id="alq-brew"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".6" stop-color="#ff9d3c"/><stop offset="1" stop-color="#b8451c"/></radialGradient>
  </defs>
  <path d="M6 22q-6 10 6 16M114 22q6 10-6 16" fill="none" stroke="#2b2530" stroke-width="5"/>
  <path d="M10 24h100c2 34-14 58-50 58S8 58 10 24z" fill="url(#alq-iron)"/>
  <ellipse cx="60" cy="24" rx="52" ry="12" fill="#2b2530"/>
  <ellipse cx="60" cy="25" rx="44" ry="8.5" fill="url(#alq-brew)"/>
  <circle class="bub b1" cx="42" cy="25" r="3" fill="#fff2d5"/><circle class="bub b2" cx="62" cy="26" r="2.5" fill="#fff2d5"/><circle class="bub b3" cx="80" cy="24" r="3" fill="#fff2d5"/>
  <path d="M6 24a54 13 0 0 0 108 0" fill="none" stroke="#e3bf62" stroke-width="3"/>
  <path d="M34 80l-6 10M86 80l6 10" stroke="#17131a" stroke-width="7" stroke-linecap="round"/>
</svg>`;
