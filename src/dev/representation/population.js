// Marc's approved artistic weights for the LOCAL public trial. No ethnicity/origin fields or inferred identities.
export const PUBLIC_GENDER_WEIGHTS = Object.freeze({ dona: 0.5, home: 0.45, 'no binaria': 0.025, 'no declarat': 0.025 });
export const PUBLIC_AGE_WEIGHTS = Object.freeze({ '0-14': 0.13, '15-64': 0.67, '65+': 0.2 });
// Within the approved 15-64 band, retain Idescat's relative 15-24 share (11.6 of 67.2, 2026 provisional).
// Youth includes adults aged 18-24; it is an age band, not a claim about legal adulthood.
export const MIDDLE_YOUTH_SHARE = 11.6 / 67.2;
export const REVIEW_LOOKS = ['p04', 'p05', 'p08', 'p02', 'p09', 'p12', 'p06', 'p10'];
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
export function buildPublicSpecs(sources, catalogue, seed = 20261020) {
  const n = sources.length, gender = allocatePopulation(n, PUBLIC_GENDER_WEIGHTS, seed ^ 0x53a9);
  const ages = allocatePopulation(n, PUBLIC_AGE_WEIGHTS, seed ^ 0x712a);
  const middle = ages.filter(x => x === '15-64').length;
  const stages = allocatePopulation(middle, { jove: MIDDLE_YOUTH_SHARE, adult: 1 - MIDDLE_YOUTH_SHARE }, seed ^ 0x1635);
  const random = populationRandom(seed ^ 0x42da), ordinary = catalogue.filter(s => !s.mobility);
  let j = 0;
  return sources.map((source, i) => {
    // Preserve the existing eight appearance examples for review. Additional figures inherit their source skin;
    // these four fixed mobility examples are coverage fixtures, not approved disability prevalence weights.
    const look = i < REVIEW_LOOKS.length ? catalogue.find(s => s.id === REVIEW_LOOKS[i]) : ordinary[Math.floor(random() * ordinary.length)];
    const age = ages[i] === '0-14' ? 'infant' : ages[i] === '65+' ? 'gran' : stages[j++];
    const ageBand = age === 'jove' ? '15-24' : age === 'adult' ? '25-64' : ages[i];
    // Local wardrobe decision: keep this headscarf variant off the explicit child age band.
    // Remove the accessory after allocation, preserving approved age/gender counts and every random draw.
    const cover = age === 'infant' && look.cover === 'mocador' ? null : look.cover;
    return { ...look, cover, id: `public-${seed >>> 0}-${source.row}-${source.slot}`, age, height: 1,
      skin: i < REVIEW_LOOKS.length ? look.skin : source.appearance.skin,
      meta: { gender: gender[i], age, ageBand, populationBand: ages[i], mobility: look.mobility ?? null,
        ...(look.mobility === 'basto' ? { vision: look.meta.vision } : {}) } };
  });
}
