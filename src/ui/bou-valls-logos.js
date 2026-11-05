// The Bou de Valls's two entities, as the card's credit line shows them (chosen from tools/dev/bou-turba-propostes.html).
// La Turba: its logo's orange ring and star, without the red ground or the crowd (unreadable at 14 px); a local
// simplification, not an official asset. El Calçot-AAEET published no logo: a calçot in a green ring, drawn for the game.
const TURBA_STAR = 'M40 17L45.6 33.3H62.8L48.9 43.4L54.2 59.7L40 49.6L25.8 59.7L31.1 43.4L17.2 33.3H34.4Z';
export const TURBA_MARK = `<svg class="round-mark" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" fill="none" stroke="#f6a623" stroke-width="8"/><path fill="#f6a623" d="${TURBA_STAR}"/></svg>`;
export const CALCOT_MARK = '<svg class="round-mark" viewBox="-20 -25 40 40" aria-hidden="true"><circle cx="0" cy="-5" r="19" fill="#3f9b3a"/>'
  + '<path fill="#f3ead2" d="M-1.9 -19Q-3.7 -6.7 -1.9 2H1.9Q3.7 -6.7 1.9 -19Q.6 -12.9 0 -20.3Q-.6 -12.9 -1.9 -19ZM-2.5 2H2.5Q3.1 8.2 0 10.7Q-3.1 8.2 -2.5 2Z"/></svg>';
