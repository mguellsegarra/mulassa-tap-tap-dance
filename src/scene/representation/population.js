import { HAIR } from './kit.js';

// The owner\'s approved artistic weights for the LOCAL public trial. No ethnicity/origin fields or inferred identities.
export const PUBLIC_GENDER_WEIGHTS = Object.freeze({ dona: 0.5, home: 0.45, 'no binaria': 0.025, 'no declarat': 0.025 });
export const PUBLIC_AGE_WEIGHTS = Object.freeze({ '0-14': 0.13, '15-64': 0.67, '65+': 0.2 });
// Within the approved 15-64 band, retain Idescat's relative 15-24 share (11.6 of 67.2, 2026 provisional).
// Youth includes adults aged 18-24; it is an age band, not a claim about legal adulthood.
export const MIDDLE_YOUTH_SHARE = 11.6 / 67.2;
const ROBES = ['#33456e', '#2a2a2a', '#5b3b2a', '#6b2f4a', '#2f5a4a', '#8a7d6b', '#a0522d', '#4a4a5c', '#7a6a9a', '#b8a58a'];
const CLOTHES = [...ROBES, '#2f62d6', '#d93a3a', '#3a9d4b', '#f2c230', '#f07a1a', '#ff8fb1', '#29b6c6', '#8e44ad', '#eeeeee', '#c8b28a'];
const LEGS = ['#2a2a2a', '#5b4a42', '#33456e', '#4a4a5c', '#6b2f4a', '#8a7d6b']; // tights under a skirt
const BEARD_STYLES = ['curt', 'rapat', 'calb', 'monyo']; // a beard under long hair or braids read odd
const darker = c => '#' + c.slice(1).match(/../g).map(h => Math.round(parseInt(h, 16) * 0.75).toString(16).padStart(2, '0')).join('');
const CHILD_HAIR = HAIR.filter(c => c !== '#8c8c8c' && c !== '#d9d6cf'); // no grey or white on a child
export const REVIEW_LOOKS =['p04', 'p05', 'p08', 'p02', 'p09', 'p12', 'p06', 'p10'];
export function populationRandom(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle(a, random) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// Random-offset cumulative rounding: totals sum to n, each count differs from its ideal by less than one,
// and expected counts over a uniform offset are exactly n*weight. Rare groups remain reachable in small crowds.
// Independent shuffles prevent a label being tied to a particular slot or to another attribute.
export function allocatePopulation(n, weights, seed) {
  if (!Number.isInteger(n) || n < 0 || n > 512) throw new RangeError('Public trial supports 0..512 people');
  const random = populationRandom(seed), offset = random(), labels = [];
  let mass = 0, assigned = 0;
  for (const [key, weight] of Object.entries(weights)) {
    mass += weight;
    const end = Math.min(n, Math.floor(n * mass + offset + 1e-12));
    for (; assigned < end; assigned++) labels.push(key);
  }
  return shuffle(labels, random);
}
// Where the eight review looks stand: the most central sources first (the caller sorts them), but each at least
// REVIEW_GAP m from the others, so the wheelchairs and canes are spread through the crowd instead of side by side.
// The wheelchairs (always in the middle of every figure's shot) stand off to the sides and a row
// back (CHAIR_FAR: row, rad off the play shot's centre, the far side: crowd-build's camera looks in from 2.62 rad), for
// every figure; a crowd of one row (low quality) still sends them to the sides; anywhere only if neither exists.
const REVIEW_GAP = 3;
export const CHAIR_FAR = Object.freeze({ row: 1, off: 0.7, centre: 2.62 - Math.PI }); // (the crowd's sides are by the play lens: 1-1.4 put a chair in the shot's near corner)
const offShot = ang => Math.abs(Math.atan2(Math.sin(ang - CHAIR_FAR.centre), Math.cos(ang - CHAIR_FAR.centre)));
export const sideways = (s, row = CHAIR_FAR.row) => (s.row ?? 0) >= row && s.ang != null && offShot(s.ang) >= CHAIR_FAR.off;
function reviewSlots(sources, chairs) {
  const slots = new Map(), row = sources.some(s => sideways(s)) ? CHAIR_FAR.row : 0, anyFar = sources.some(s => sideways(s, row));
  const order = sources.map((_, i) => i), nearShot = order.slice().sort((a, b) => offShot(sources[a].ang ?? 0) - offShot(sources[b].ang ?? 0));
  for (const id of REVIEW_LOOKS) { // a small crowd relaxes the gap rather than losing an example
    const chair = chairs.has(id) && anyFar, fits = i => !chair || sideways(sources[i], row);
    // a chair takes the first place just off the shot's centre (back in the shot), not the one by the lens
    pick: for (const gap of [REVIEW_GAP, REVIEW_GAP / 2, 0]) for (const i of chair ? nearShot : order) {
      const a = sources[i].pos;
      if (slots.has(i) || !fits(i) || [...slots.keys()].some(k => a && a.distanceTo(sources[k].pos) < gap)) continue;
      slots.set(i, id); break pick;
    }
  }
  return slots;
}
export function buildPublicSpecs(sources, catalogue, seed = 20261020) {
  const n = sources.length, gender = allocatePopulation(n, PUBLIC_GENDER_WEIGHTS, seed ^ 0x53a9);
  const ages = allocatePopulation(n, PUBLIC_AGE_WEIGHTS, seed ^ 0x712a);
  const middle = ages.filter(x => x === '15-64').length;
  const stages = allocatePopulation(middle, { jove: MIDDLE_YOUTH_SHARE, adult: 1 - MIDDLE_YOUTH_SHARE }, seed ^ 0x1635);
  const random = populationRandom(seed ^ 0x42da), ordinary = catalogue.filter(s => !s.mobility), pick = a => a[Math.floor(random() * a.length)];
  const styles = [...new Set(catalogue.map(s => s.hair.style))], childStyles = styles.filter(s => s !== 'calb');
  const review = reviewSlots(sources, new Set(catalogue.filter(s => s.mobility === 'cadira').map(s => s.id)));
  let j = 0;
  return sources.map((source, i) => {
    // Preserve the existing eight appearance examples for review. Additional figures inherit their source skin;
    // these four fixed mobility examples are coverage fixtures, not approved disability prevalence weights.
    let look = review.has(i) ? catalogue.find(s => s.id === review.get(i)) : ordinary[Math.floor(random() * ordinary.length)];
    const age = ages[i] === '0-14' ? 'infant' : ages[i] === '65+' ? 'gran' : stages[j++];
    const ageBand = age === 'jove' ? '15-24' : age === 'adult' ? '25-64' : ages[i];
    // The long tunic + headscarf look read too often and always navy: half as frequent, its own colours each time,
    // and never on a child (they dress like the other children: another look, so the age/gender counts stay as allocated).
    if (look.cover === 'mocador' && !review.has(i) && (age === 'infant' || random() < 0.5)) look = ordinary.filter(s => s.cover !== 'mocador')[Math.floor(random() * (ordinary.length - 1))];
    // A few looks for hundreds of people: everyone outside the review examples redraws their hair and their clothes'
    // colours, so skirts are not all one colour and a child is not an adult's look without the beard.
    if (!review.has(i)) {
      const robe = look.cover === 'mocador', top = pick(robe ? ROBES : CLOTHES), whole = robe || look.top.kind === 'vestit';
      const style = pick(age === 'infant' ? childStyles : look.beard ? BEARD_STYLES : styles);
      look = { ...look, hair: { style, colour: pick(age === 'infant' ? CHILD_HAIR : HAIR) },
        top: { ...look.top, colour: top, ...(look.top.trim ? { trim: darker(top) } : {}) },
        bottom: { ...look.bottom, colour: whole ? top : pick(CLOTHES), ...(look.bottom.legs ? { legs: pick(LEGS) } : {}) },
        ...(look.cover ? { coverColour: pick(robe ? ROBES : CLOTHES) } : {}) };
    }
    // The look and the age are drawn apart: a child never keeps the look's beard.
    return { ...look, id: `public-${seed >>> 0}-${source.row}-${source.slot}`, age, height: 1, beard: !!look.beard && age !== 'infant',
      skin: review.has(i) ? look.skin : source.appearance.skin,
      meta: { gender: gender[i], age, ageBand, populationBand: ages[i], mobility: look.mobility ?? null,
        ...(look.mobility === 'basto' ? { vision: look.meta.vision } : {}) } };
  });
}
