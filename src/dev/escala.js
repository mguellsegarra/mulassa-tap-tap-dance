// ?escala=0.85: forces the selector's zoom (and the corner row's, which keeps its top with it) to try a scale on a real screen.
export function setupEscala(value) {
  const z = +value;
  if (!(z >= 0.5 && z <= 2)) return;
  document.head.appendChild(document.createElement('style')).textContent =
    `#select { zoom: ${z} !important; } body:has(#select:not([hidden])) :is(#free, #music, #settings) { zoom: ${z} !important; }`;
}
